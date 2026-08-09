#!/usr/bin/env python3
"""Compile the canonical CND tables into the CND 0.1 research release (KAN-337).

CND 0.1 is a pilot release: the tables are compiled and citable, and none of
their rows has passed human review yet. That distinction is carried in the
outputs rather than in a caveat, through two tiers:

* the **public** tier holds only rows at or above the publication threshold and
  is what the Atlas shows by default. It is currently empty, and it should be:
  nothing has been reviewed against a witness.
* the **research** tier holds everything, with `review_state` on every record,
  and is what the pilot is for.

The build is deterministic. There are no timestamps in any output, keys are
sorted, floats are formatted to a fixed precision, and rows are emitted in a
stable order, so identical inputs produce identical bytes and the only thing
that can move a hash is the data.

Run with `make dacia` (needs the venv from `make vmn-venv`), then
`npm run dacia:validate`.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "dacia"
RELEASE_DIR = DATA / "release" / "cnd-0.1"
GEO_DIR = REPO / "public" / "geo"

SCHEMA_VERSION = 1
RELEASE_VERSION = "cnd-0.1"
RELEASE_KIND = "pilot_research_release"
LICENCE = "CC BY 4.0 for the compiled records; each source carries its own rights_statement."

# A row reaches the public tier only once a person has cleared it.
PUBLIC_STATES = {"approved", "published"}

# The Atlas time model's open-ended sentinel (VMN-2 decision D2).
OPEN_ENDED = 9999

TABLES = ["places", "sources", "attestations", "transcriptions", "name-uses", "name-use-edges"]
KEY_COLUMN = {
    "places": "place_id",
    "sources": "source_id",
    "attestations": "attestation_id",
    "transcriptions": "transcription_id",
    "name-uses": "name_use_id",
    "name-use-edges": "edge_id",
}

CONTEXT = {
    "@vocab": "https://terra-chartarum.pages.dev/ns/cnd#",
    "dcterms": "http://purl.org/dc/terms/",
    "geojson": "https://purl.org/geojson/vocab#",
    "label": "http://www.w3.org/2000/01/rdf-schema#label",
}


def read_table(name: str) -> list[dict[str, str]]:
    with (DATA / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        rows = [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]
    return sorted(rows, key=lambda r: r[KEY_COLUMN[name]])


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def canonical_json(payload) -> bytes:
    """Sorted keys, no stray whitespace, trailing newline. Byte-stable."""
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def csv_bytes(rows: list[dict[str, str]], fieldnames: list[str]) -> bytes:
    import io

    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def parquet_bytes(rows: list[dict[str, str]], fieldnames: list[str]) -> bytes:
    """Every column is a string: the CSV is canonical and Parquet is a mirror of it.

    Typing the columns here would mean the two formats could disagree about what
    an empty cell means, which is exactly the drift the release is meant to make
    impossible.
    """
    import io

    import pyarrow
    import pyarrow.parquet

    table = pyarrow.table(
        {name: pyarrow.array([row[name] for row in rows], type=pyarrow.string())
         for name in fieldnames}
    )
    sink = io.BytesIO()
    # store_schema=False keeps the pandas metadata blob (and its library
    # versions) out of the file, which is what makes the bytes reproducible.
    pyarrow.parquet.write_table(
        table, sink, compression="zstd", store_schema=False, write_statistics=False
    )
    return sink.getvalue()


def coordinate(value: str) -> float:
    return round(float(value), 6)


def vocabulary_labels() -> dict[tuple[str, str], str]:
    """Human labels for controlled terms, owned by the vocabulary rather than the UI.

    Codes like `grc` and `latn` are unreadable in a filter panel, and the place
    that already knows what they mean is `vocabularies.csv`. Emitting the label
    beside the code keeps one answer to "what is this term called".
    """
    path = DATA / "reference" / "vocabularies.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        return {
            (row["vocabulary"], row["term"]): row["label"]
            for row in csv.DictReader(handle)
            if row.get("status") == "approved"
        }


def build_features(places, sources, attestations, public_only: bool) -> list[dict]:
    """Project attestations onto their place's reference location.

    A silence is a claim about a place and keeps its point, so the absence
    taxonomy can be styled and filtered rather than being invisible. An
    attestation on an unlocated place has nowhere to go and is reported in the
    manifest instead of being given a guessed position.
    """
    by_place = {row["place_id"]: row for row in places}
    by_source = {row["source_id"]: row for row in sources}
    labels = vocabulary_labels()
    features = []

    for row in attestations:
        if public_only and row["review_state"] not in PUBLIC_STATES:
            continue
        place = by_place.get(row["place_id"])
        source = by_source.get(row["source_id"])
        if place is None or source is None or place["location_status"] != "located":
            continue
        features.append({
            "type": "Feature",
            "id": row["attestation_id"],
            "geometry": {
                "type": "Point",
                "coordinates": [coordinate(place["ref_lon"]), coordinate(place["ref_lat"])],
            },
            "properties": {
                "id": row["attestation_id"],
                "place_id": place["place_id"],
                "place_name": place["reference_name"],
                "place_type": place["place_type"],
                "region": place["region"],
                "geometry_provenance": place["ref_geometry_provenance"],
                "source_id": source["source_id"],
                "source_title": source["short_title"],
                "source_family": source["source_family"],
                "source_date": source["date_label"],
                "attestation_class": row["attestation_class"],
                "is_silence": row["attestation_class"] in {
                    "extra_muros", "source_silent", "not_applicable",
                    "survival_unknown", "mapped_unlabelled",
                },
                "name_original": row["name_original"],
                "name_normalized": row["name_normalized"],
                "script": row["script"],
                "script_label": labels.get(("script", row["script"]), row["script"]),
                "language": row["language"],
                "language_label": labels.get(("language", row["language"]), row["language"]),
                "attestation_class_label": labels.get(
                    ("attestation_class", row["attestation_class"]), row["attestation_class"]
                ),
                "confidence_label": labels.get(
                    ("confidence", row["confidence"]), row["confidence"]
                ),
                "confidence": row["confidence"],
                "review_state": row["review_state"],
                "locator_type": row["locator_type"],
                "locator": row["locator"],
                "trench": "ccd-a",
                "source_year_from": int(source["year_from"]) if source["year_from"] else None,
                "source_year_to": int(source["year_to"]) if source["year_to"] else None,
                # The Atlas slider reveals *through* a year, and an attestation
                # does not stop being evidence once its source is finished being
                # made. It appears at the source's date and stays, so `valid_to`
                # takes the open-ended sentinel rather than the source's end
                # year - which would otherwise hide every record at any cutoff
                # past 1864.
                "valid_from": int(source["year_from"]) if source["year_from"] else 0,
                "valid_to": OPEN_ENDED,
            },
        })
    return sorted(features, key=lambda f: f["id"])


def feature_collection(features: list[dict], tier: str) -> dict:
    return {
        "type": "FeatureCollection",
        "features": features,
        "_cnd": {
            "release": RELEASE_VERSION,
            "kind": RELEASE_KIND,
            "tier": tier,
            "licence": LICENCE,
            "note": (
                "Reviewed records only."
                if tier == "public"
                else "Research tier: rows have not passed human review. Every feature carries "
                "its review_state, and no row here may be cited as established evidence."
            ),
        },
    }


def build_outputs() -> dict[Path, bytes]:
    tables = {name: read_table(name) for name in TABLES}
    fieldnames = {
        name: list(csv.DictReader((DATA / f"{name}.csv").open(encoding="utf-8")).fieldnames or [])
        for name in TABLES
    }
    outputs: dict[Path, bytes] = {}

    for name, rows in tables.items():
        outputs[RELEASE_DIR / f"{name}.csv"] = csv_bytes(rows, fieldnames[name])
        outputs[RELEASE_DIR / f"{name}.parquet"] = parquet_bytes(rows, fieldnames[name])

    outputs[RELEASE_DIR / "cnd.jsonld"] = canonical_json({
        "@context": CONTEXT,
        "@id": f"https://terra-chartarum.pages.dev/data/{RELEASE_VERSION}",
        "@type": "Dataset",
        "dcterms:title": "Corpus Nominum Daciae 0.1",
        "dcterms:license": LICENCE,
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "records": {name: [dict(sorted(row.items())) for row in rows] for name, rows in tables.items()},
    })

    public = build_features(tables["places"], tables["sources"], tables["attestations"], True)
    research = build_features(tables["places"], tables["sources"], tables["attestations"], False)
    outputs[GEO_DIR / "dacia-attestations.geojson"] = canonical_json(
        feature_collection(public, "public")
    )
    outputs[GEO_DIR / "dacia-attestations-research.geojson"] = canonical_json(
        feature_collection(research, "research")
    )
    return outputs


def build_manifest(outputs: dict[Path, bytes]) -> bytes:
    tables = {name: read_table(name) for name in TABLES}
    attestations = tables["attestations"]
    unlocated = {r["place_id"] for r in tables["places"] if r["location_status"] == "unlocated"}

    counts = {name: len(rows) for name, rows in tables.items()}
    by_state: dict[str, int] = {}
    for row in attestations:
        by_state[row["review_state"]] = by_state.get(row["review_state"], 0) + 1

    return canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "licence": LICENCE,
        "counts": counts,
        "attestationsByReviewState": dict(sorted(by_state.items())),
        "publicRecords": sum(
            1 for r in attestations if r["review_state"] in PUBLIC_STATES
        ),
        "sourceFamilies": sorted({r["source_family"] for r in tables["sources"]}),
        "unlocatedPlaces": sorted(unlocated),
        "inputs": {
            str((DATA / f"{name}.csv").relative_to(REPO)): sha256_bytes(
                (DATA / f"{name}.csv").read_bytes()
            )
            for name in TABLES
        },
        "outputs": {
            str(path.relative_to(REPO)): {"sha256": sha256_bytes(payload), "bytes": len(payload)}
            for path, payload in sorted(outputs.items())
        },
    })


def main() -> int:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    outputs = build_outputs()
    outputs[RELEASE_DIR / "manifest.json"] = build_manifest(outputs)

    for path, payload in sorted(outputs.items()):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        print(f"  wrote {path.relative_to(REPO)} ({len(payload):,} bytes)")

    manifest = json.loads(outputs[RELEASE_DIR / "manifest.json"])
    print(f"\nCND {RELEASE_VERSION} ({RELEASE_KIND})")
    print(f"  records: {manifest['counts']}")
    print(f"  public tier: {manifest['publicRecords']} of {manifest['counts']['attestations']} attestations")
    return 0


if __name__ == "__main__":
    sys.exit(main())
