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
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "dacia"
RELEASE_DIR = DATA / "release" / "cnd-0.1"
V1_CONTRACT = DATA / "reference" / "cnd-v1-release.json"
V1_QA_AUDIT = DATA / "reference" / "cnd-v1-qa.json"
V1_MIGRATIONS = DATA / "reference" / "cnd-id-migrations.csv"
V1_RELEASE_DIR = DATA / "release" / "cnd-1.0-rc1"
GEO_DIR = REPO / "public" / "geo"
GENERATED_DIR = REPO / "src" / "data" / "dacia" / "generated"

SCHEMA_VERSION = 1
RELEASE_VERSION = "cnd-0.1"
RELEASE_KIND = "pilot_research_release"
LICENCE = "CC BY 4.0 for the compiled records; each source carries its own rights_statement."

# A row reaches the public tier only once a person has cleared it.
PUBLIC_STATES = {"approved", "published"}

# The Atlas time model's open-ended sentinel (VMN-2 decision D2).
OPEN_ENDED = 9999

TABLES = ["places", "sources", "attestations", "transcriptions", "name-uses", "name-use-edges"]
INVENTORY = DATA / "pilot" / "trench-a-inventory.csv"
# Trench C is a single-name slice: one lexical form, followed through every
# referent it was made to carry (KAN-345).
NOMEN_ERRANS_FORM = "Dacia"
NOMEN_ERRANS_ESSAY = "nomen-errans"
# A career is put in front of a reader only once a person has cleared it. The
# rest are named as withheld, with their state, rather than dropped - a corpus
# that hides its unreviewed rows looks finished when it is not.
NOMEN_ERRANS_PUBLIC_STATES = {"reviewed", "approved", "published"}
GIS = DATA / "gis"
REFERENCE = DATA / "reference"

# The Atlas takes one render hint per layer, so the Roman baseline ships as
# two assets - points and lines - compiled from one table (KAN-341).
ROMAN_SITES = "dacia-roman-sites"
ROMAN_NETWORK = "dacia-roman-network"
PRINCIPALITIES = "dacia-principalities"
JOSEPHINIAN = "dacia-josephinian-sheets"
TREATY_FRONTIERS = "dacia-treaty-frontiers"

# Silences keep their point on the map, so the essay counts them separately
# from readings rather than reporting one undifferentiated total.
SILENT_CLASSES = {
    "extra_muros",
    "source_silent",
    "not_applicable",
    "survival_unknown",
    "mapped_unlabelled",
}
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


def feature_collection(
    features: list[dict],
    tier: str,
    release: str = RELEASE_VERSION,
    kind: str = RELEASE_KIND,
) -> dict:
    return {
        "type": "FeatureCollection",
        "features": features,
        "_cnd": {
            "release": release,
            "kind": kind,
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


def read_inventory() -> list[dict[str, str]]:
    with INVENTORY.open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def trench_a_bridge(tables: dict[str, list[dict[str, str]]]) -> dict:
    """The Trench A exhibition's own index into the corpus it migrated to (KAN-339).

    Terra Sigillata is a native essay whose stelae and test pits were the corpus
    before there was one. Rather than let the essay hard-code CND identifiers -
    which would be a second copy of the migration, drifting from the first - the
    bridge is compiled here from the inventory that recorded the migration, and
    the essay reads only this file.

    Rhetorical strata are carried too. A reader looking for the thirteenth stela
    should find it named as local and non-canonical, not silently missing.
    """
    by_source = {row["source_id"]: row for row in tables["sources"]}
    by_place = {row["place_id"]: row for row in tables["places"]}
    attestations = tables["attestations"]

    stelae, pits, local = [], [], []
    for row in read_inventory():
        ref = row["trench_a_ref"]
        if row["disposition"] == "preserve_local":
            local.append({
                "ref": ref,
                "label": row["label"],
                "reason": row["note"],
            })
            continue
        if row["datum_kind"] == "source" and ref.startswith("STONES[") and row["target_id"]:
            source = by_source.get(row["target_id"])
            if source is None:
                continue
            rows = [a for a in attestations if a["source_id"] == source["source_id"]]
            # One representative reading lets the programme index expose a
            # real source -> attestation -> place path. Prefer a reading over a
            # typed silence, then keep the stable attestation-id order. This is
            # navigation into the research tier, not a claim that the row has
            # passed human review.
            sample = next(
                (a for a in rows if a["attestation_class"] not in SILENT_CLASSES),
                rows[0] if rows else None,
            )
            sample_place = by_place.get(sample["place_id"]) if sample else None
            stelae.append({
                "stela": ref[len("STONES["):-1],
                "sourceId": source["source_id"],
                "shortTitle": source["short_title"],
                "title": source["title"],
                "sourceFamily": source["source_family"],
                "dateLabel": source["date_label"],
                "yearFrom": int(source["year_from"]) if source["year_from"] else None,
                "yearTo": int(source["year_to"]) if source["year_to"] else None,
                "repository": source["repository"],
                "reviewState": source["review_state"],
                "attestations": len(rows),
                "silences": sum(1 for a in rows if a["attestation_class"] in SILENT_CLASSES),
                "sampleAttestation": {
                    "attestationId": sample["attestation_id"],
                    "attestationClass": sample["attestation_class"],
                    "name": sample["name_original"] or sample["name_normalized"] or "Typed silence",
                    "reviewState": sample["review_state"],
                    "placeId": sample["place_id"],
                    "placeName": sample_place["reference_name"] if sample_place else sample["place_id"],
                } if sample else None,
            })
        elif row["datum_kind"] == "attestation_set" and ref.startswith("PITS["):
            place_ids = [p for p in row["target_id"].split("|") if p]
            rows = [a for a in attestations if a["place_id"] in place_ids]
            pits.append({
                "pit": ref[len("PITS["):ref.index("]")],
                "places": [
                    {
                        "placeId": place_id,
                        "referenceName": by_place[place_id]["reference_name"],
                        "placeType": by_place[place_id]["place_type"],
                        "region": by_place[place_id]["region"],
                        "locationStatus": by_place[place_id]["location_status"],
                        # Carried so the site's own toponym concordance can be
                        # checked against the corpus rather than trusted: the
                        # conflation KAN-339 retired was two referents sharing
                        # one pin, and only a coordinate comparison catches that.
                        "lon": coordinate(by_place[place_id]["ref_lon"])
                        if by_place[place_id]["ref_lon"]
                        else None,
                        "lat": coordinate(by_place[place_id]["ref_lat"])
                        if by_place[place_id]["ref_lat"]
                        else None,
                    }
                    for place_id in place_ids
                    if place_id in by_place
                ],
                "attestations": len(rows),
                "silences": sum(1 for a in rows if a["attestation_class"] in SILENT_CLASSES),
                "cells": int(row["cell_count"]) if row["cell_count"].isdigit() else 0,
                "localCells": int(row["local_cells"]) if row["local_cells"].isdigit() else 0,
                # The feature the Atlas opens on: the pit's earliest record, which
                # is stable because attestation ids are assigned in one order.
                "feature": min((a["attestation_id"] for a in rows), default=""),
            })

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "publicLayer": "dacia-attestations",
        "researchLayer": "dacia-attestations-research",
        "stelae": sorted(stelae, key=lambda s: s["stela"]),
        "pits": sorted(pits, key=lambda p: p["pit"]),
        "local": sorted(local, key=lambda l: l["ref"]),
    }


def vocabulary_definitions() -> dict[tuple[str, str], str]:
    """The definition behind a controlled term, for the same reason as its label."""
    path = DATA / "reference" / "vocabularies.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        return {
            (row["vocabulary"], row["term"]): row["definition"]
            for row in csv.DictReader(handle)
            if row.get("status") == "approved"
        }


def _period_label(row: dict[str, str]) -> str:
    """One readable line for a period, decided by the row's own date_precision.

    Written here rather than in the component because the same period has to
    read the same way in the essay, in a citation and in a panel, and three
    formatters would eventually disagree about what `terminus_post_quem` means.
    """
    start, end, precision = row["period_from"], row["period_to"], row["date_precision"]
    if precision == "circa":
        return f"c. {start}" if start else "undated"
    if precision == "terminus_post_quem":
        return f"from {start}" if start else "undated"
    if precision == "terminus_ante_quem":
        return f"before {end or start}"
    if precision == "exact_year":
        return start or "undated"
    if start and end and start != end:
        return f"{start}\u2013{end}"
    return start or end or "undated"


def _year(value: str) -> int | None:
    return int(value) if value.lstrip("-").isdigit() else None


def nomen_errans_slice(tables: dict[str, list[dict[str, str]]]) -> dict:
    """Trench C's vertical slice: one word, its careers, and where each one lands (KAN-345).

    The essay reads only this file. Nothing in it is authored twice - the
    chronology is the `name_uses` ledger, the citation is the `sources` row, and
    the Atlas composition is the reviewed routing table - so a period corrected
    in the corpus corrects the essay on the next `make dacia`, and a career
    whose route is withdrawn loses its link rather than keeping a stale one.

    Two thresholds are applied here, not in the component. Only a career at or
    above `reviewed` is presented; the rest are listed as withheld with their
    state. And a career is only linked to the Atlas where the routing table says
    a layer honestly covers its referent, because a link that opens an empty map
    reads to a reader exactly like a link that works.
    """
    labels = vocabulary_labels()
    definitions = vocabulary_definitions()
    sources = {row["source_id"]: row for row in tables["sources"]}
    routes = {row["name_use_id"]: row for row in _read_reference("nomen-errans-atlas-states")}

    careers, withheld = [], []
    for row in tables["name-uses"]:
        if row["lexical_form"] != NOMEN_ERRANS_FORM:
            continue
        if row["review_state"] not in NOMEN_ERRANS_PUBLIC_STATES:
            withheld.append({
                "id": row["name_use_id"],
                "referentLabel": row["referent_label"],
                "fateClass": row["fate_class"],
                "fateClassLabel": labels.get(("fate_class", row["fate_class"]), row["fate_class"]),
                "reviewState": row["review_state"],
            })
            continue

        source = sources.get(row["source_id"])
        route = routes.get(row["name_use_id"])
        careers.append({
            "id": row["name_use_id"],
            "lexicalForm": row["lexical_form"],
            "institution": row["institution"],
            "referentKind": row["referent_kind"],
            "referentKindLabel": labels.get(
                ("referent_kind", row["referent_kind"]), row["referent_kind"]
            ),
            "referentLabel": row["referent_label"],
            "referentPlaceId": row["referent_place_id"] or None,
            "periodFrom": _year(row["period_from"]),
            "periodTo": _year(row["period_to"]),
            "periodLabel": _period_label(row),
            "datePrecision": row["date_precision"],
            "datePrecisionLabel": labels.get(
                ("date_precision", row["date_precision"]), row["date_precision"]
            ),
            "fateClass": row["fate_class"],
            "fateClassLabel": labels.get(("fate_class", row["fate_class"]), row["fate_class"]),
            "fateClassDefinition": definitions.get(("fate_class", row["fate_class"]), ""),
            "locatorType": row["locator_type"],
            "locatorTypeLabel": labels.get(
                ("locator_type", row["locator_type"]), row["locator_type"]
            ),
            "locator": row["locator"],
            "confidence": row["confidence"],
            "confidenceLabel": labels.get(("confidence", row["confidence"]), row["confidence"]),
            "confidenceDefinition": definitions.get(("confidence", row["confidence"]), ""),
            "reviewState": row["review_state"],
            "reviewer": row["reviewer"],
            "reviewDate": row["review_date"],
            "note": row["note"],
            # The witness, carried whole: a career the reader cannot cite is a
            # claim, and this slice exists to prove the citation path closes.
            "source": {
                "id": source["source_id"],
                "shortTitle": source["short_title"],
                "title": source["title"],
                "creator": source["creator"],
                "family": source["source_family"],
                "dateLabel": source["date_label"],
                "repository": source["repository"],
                "citation": source["citation"],
                "rightsStatement": source["rights_statement"],
                "reviewState": source["review_state"],
            } if source else None,
            "atlas": {
                "coverage": route["coverage"],
                "layers": [part for part in route["layers"].split("|") if part],
                "year": _year(route["year"]),
                "feature": route["feature"] or None,
                "note": route["note"],
                "reviewState": route["review_state"],
            } if route else None,
        })

    # Chronological, then by id: two careers can start in the same year, and the
    # order a reader steps through has to be the same on every build.
    careers.sort(key=lambda c: (c["periodFrom"] if c["periodFrom"] is not None else 9999, c["id"]))
    withheld.sort(key=lambda c: c["id"])

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "lexicalForm": NOMEN_ERRANS_FORM,
        "essaySlug": NOMEN_ERRANS_ESSAY,
        "careers": careers,
        "withheld": withheld,
    }


def programme_graph(tables: dict[str, list[dict[str, str]]]) -> dict:
    """The programme's own index of itself (KAN-370).

    Seven trenches, four workstreams and the shared datasets they all read.
    Compiled from the governance tables rather than written into a page,
    because a hand-maintained index is a second copy of the programme's state
    and the copy is the one that goes stale.

    Cross-trench links are counted from the data that actually holds them - the
    corpus, the migration inventory, the GIS packages - so a trench cannot be
    listed as consuming shared evidence unless it does.
    """
    programme = _read_reference("programme-ids")
    gates = _read_reference("trench-gates")
    debts = _read_reference("verification-debt")
    inventory = read_inventory()

    gates_by_trench: dict[str, list[dict]] = {}
    for row in gates:
        gates_by_trench.setdefault(row["trench_id"], []).append(
            {"gate": row["gate_id"], "status": row["status"], "note": row["note"]}
        )
    debts_by_subject: dict[str, int] = {}
    for row in debts:
        if row["status"] == "open":
            debts_by_subject[row["subject_id"]] = debts_by_subject.get(row["subject_id"], 0) + 1

    # What each trench actually consumes from the shared authorities. Trench A
    # is the only one with corpus records today, and saying so is the point:
    # the index reports consumption, it does not assert it.
    corpus_by_trench = {"ccd-a": len([r for r in inventory if r["migration_state"] == "done"])}

    entries = []
    for row in sorted(programme, key=lambda r: (r["kind"] != "trench", r["id"])):
        trench_gates = gates_by_trench.get(row["id"], [])
        entries.append({
            "id": row["id"],
            "kind": row["kind"],
            "label": row["label"],
            "epicKey": row["epic_key"],
            "campaign": row["campaign"],
            "room": row["room"],
            "essaySlug": row["essay_slug"],
            "state": row["state"],
            "note": row["note"],
            "gates": trench_gates,
            "gatesPassed": sum(1 for gate in trench_gates if gate["status"] == "passed"),
            "openDebts": debts_by_subject.get(row["id"], 0),
            "corpusRecords": corpus_by_trench.get(row["id"], 0),
        })

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "programmeId": "ccd",
        "release": RELEASE_VERSION,
        "entries": entries,
        # Shared infrastructure, listed once. These belong to the programme and
        # not to whichever essay happens to show them first.
        "sharedDatasets": [
            {
                "id": "cnd",
                "label": "Corpus Nominum Daciae",
                "kind": "corpus",
                "detail": f"{len(tables['places'])} places, {len(tables['sources'])} sources, "
                          f"{len(tables['attestations'])} attestations",
                # The release lives in the repository, not behind a site route:
                # linking at a path the site does not serve would be a broken
                # link dressed as a dataset.
                "href": "https://github.com/vladsimion/terra-chartarum/tree/main/data/dacia/release/"
                        + RELEASE_VERSION,
            },
            {
                "id": "dacia-attestations-research",
                "label": "Attestation projection",
                "kind": "atlas_layer",
                "detail": "Every compiled attestation, silences included, at its place's reference point",
                "href": "/atlas?layers=dacia-attestations-research",
            },
            {
                "id": "dacia-roman-sites",
                "label": "Roman Dacia baseline",
                "kind": "atlas_layer",
                "detail": "Sites joined to corpus places; roads and frontier corridors beside them",
                "href": "/atlas?layers=dacia-roman-sites",
            },
            {
                "id": "dacia-principalities",
                "label": "Principality phases, 1526-1859",
                "kind": "atlas_layer",
                "detail": "Dated phases rather than one timeless outline",
                "href": "/atlas?layers=dacia-principalities",
            },
            {
                "id": "dacia-treaty-frontiers",
                "label": "Treaty frontiers, 1829-1947",
                "kind": "atlas_layer",
                "detail": "Phases attributed to their instruments, competing lines kept apart",
                "href": "/atlas?layers=dacia-treaty-frontiers",
            },
            {
                "id": "dacia-josephinian-sheets",
                "label": "Josephinian sheet index",
                "kind": "atlas_layer",
                "detail": "Survey footprints over the corpus, linking to the repository",
                "href": "/atlas?layers=dacia-josephinian-sheets",
            },
        ],
        "openDebts": sum(1 for row in debts if row["status"] == "open"),
    }


def read_gis(name: str) -> list[dict[str, str]]:
    with (GIS / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def read_gis_geometry(name: str) -> dict[str, dict]:
    payload = json.loads((GIS / f"{name}.geojson").read_text(encoding="utf-8"))
    return {feature["id"]: feature["geometry"] for feature in payload["features"]}


def roman_dacia_features(places: list[dict[str, str]]) -> tuple[list[dict], list[dict]]:
    """The Roman baseline: sites from the corpus, roads joining them, limes drawn.

    Site geometry is never authored here. A site is a CND place, so the layer
    reads that place's reference location and carries its provenance forward -
    which is what stops the baseline becoming a second, drifting copy of
    coordinates the corpus already holds. A road is likewise not authored: it is
    an ordered list of those same places, and the line is what you get by joining
    them. Only the limes corridors have geometry of their own, because a frontier
    system is not a sequence of attested towns.
    """
    by_place = {row["place_id"]: row for row in places}
    drawn = read_gis_geometry("roman-dacia-lines")
    sites, network = [], []

    for row in read_gis("roman-dacia"):
        shared = {
            "id": row["feature_id"],
            "name": row["name"],
            "latin_name": row["latin_name"],
            "feature_type": row["feature_type"],
            "geometry_provenance": row["geometry_provenance"],
            "confidence": row["confidence"],
            "citation": row["citation"],
            "repository": row["repository"],
            "source_url": row["source_url"],
            "rights_status": row["rights_status"],
            "review_status": row["review_status"],
            "note": row["notes"],
            "valid_from": int(row["valid_from"]),
            "valid_to": int(row["valid_to"]),
        }

        if row["feature_type"] == "site":
            place = by_place.get(row["place_id"])
            if place is None or place["location_status"] != "located":
                continue
            sites.append({
                "type": "Feature",
                "id": row["feature_id"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [coordinate(place["ref_lon"]), coordinate(place["ref_lat"])],
                },
                "properties": {
                    **shared,
                    "place_id": place["place_id"],
                    "place_name": place["reference_name"],
                    "region": place["region"],
                    # The corpus's own account of where this point came from wins
                    # over anything the baseline table says about it.
                    "geometry_provenance": place["ref_geometry_provenance"],
                },
            })
            continue

        if row["feature_type"] == "road":
            stations = [p for p in row["via_place_ids"].split("|") if p]
            coords = [
                [coordinate(by_place[p]["ref_lon"]), coordinate(by_place[p]["ref_lat"])]
                for p in stations
                if p in by_place and by_place[p]["location_status"] == "located"
            ]
            if len(coords) < 2:
                continue
            geometry = {"type": "LineString", "coordinates": coords}
            extra = {"via_place_ids": "|".join(stations), "stations": len(coords)}
        else:
            geometry = drawn.get(row["feature_id"])
            if geometry is None:
                continue
            extra = {"via_place_ids": "", "stations": 0}

        network.append({
            "type": "Feature",
            "id": row["feature_id"],
            "geometry": geometry,
            "properties": {**shared, **extra},
        })

    return (
        sorted(sites, key=lambda f: f["id"]),
        sorted(network, key=lambda f: f["id"]),
    )


def principality_features() -> list[dict]:
    """One feature per phase, never one timeless polygon (KAN-342)."""
    geometry = read_gis_geometry("principalities")
    features = []
    for row in read_gis("principalities"):
        shape = geometry.get(row["phase_id"])
        if shape is None:
            continue
        features.append({
            "type": "Feature",
            "id": row["phase_id"],
            "geometry": shape,
            "properties": {
                "id": row["phase_id"],
                "polity_id": row["polity_id"],
                "name": row["polity_name"],
                "phase_label": row["phase_label"],
                "sovereignty": row["sovereignty"],
                "suzerain": row["suzerain"],
                "instrument": row["instrument"],
                "instrument_year": int(row["instrument_year"]),
                "geometry_provenance": row["geometry_provenance"],
                "confidence": row["confidence"],
                "citation": row["citation"],
                "source_url": row["source_url"],
                "rights_status": row["rights_status"],
                "review_status": row["review_status"],
                "note": row["notes"],
                "valid_from": int(row["valid_from"]),
                "valid_to": int(row["valid_to"]),
            },
        })
    return sorted(features, key=lambda f: f["id"])


def josephinian_features(places: list[dict[str, str]]) -> list[dict]:
    """Sheet footprints as rectangles, with the corpus places each one covers.

    The coverage link is recomputed from the footprint rather than trusted from
    the table: a sheet that claims a place outside its own bounds is a mistake
    the build should catch, not carry.
    """
    located = [
        row for row in places
        if row["location_status"] == "located" and row["ref_lon"] and row["ref_lat"]
    ]
    features = []
    for row in read_gis("josephinian-sheets"):
        west, south = float(row["west"]), float(row["south"])
        east, north = float(row["east"]), float(row["north"])
        covered = sorted(
            place["place_id"]
            for place in located
            if west <= float(place["ref_lon"]) < east and south <= float(place["ref_lat"]) < north
        )
        features.append({
            "type": "Feature",
            "id": row["sheet_id"],
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [west, south], [east, south], [east, north], [west, north], [west, south],
                ]],
            },
            "properties": {
                "id": row["sheet_id"],
                "name": row["sheet_label"],
                "archive_sheet_id": row["archive_sheet_id"],
                "survey": row["survey"],
                "scale": row["scale"],
                "footprint_provenance": row["footprint_provenance"],
                "geometry_provenance": row["footprint_provenance"],
                "confidence": row["confidence"],
                "covers_place_ids": "|".join(covered),
                "covers": len(covered),
                "citation": row["citation"],
                "repository": row["repository"],
                "source_url": row["source_url"],
                "rights_status": row["rights_status"],
                # No scan is served from this project; the layer carries a link
                # to the repository that may show one, and nothing else.
                "scan_redistributed": row["scan_redistributed"],
                "review_status": row["review_status"],
                "note": row["notes"],
                "valid_from": int(row["survey_from"]),
                "valid_to": OPEN_ENDED,
            },
        })
    return sorted(features, key=lambda f: f["id"])


def treaty_frontier_features() -> list[dict]:
    """Frontier phases, each attributed to the instrument that made it (KAN-352).

    A competing line for the same moment is its own feature carrying
    `alternative_of`, never a compromise between two lines. Averaging them would
    produce a frontier nobody proposed and erase the disagreement, which is the
    thing this layer exists to show.
    """
    geometry = read_gis_geometry("treaty-frontier")
    ledgers = {
        "treaty_frontier_sources": {
            row["source_id"]: row
            for row in _read_reference("treaty-frontier-sources")
        },
        "carta_rubra_sources": {
            row["source_id"]: row for row in _read_reference("carta-rubra-sources")
        },
    }

    features = []
    for row in read_gis("treaty-frontier"):
        shape = geometry.get(row["segment_id"])
        if shape is None:
            continue
        source = ledgers.get(row["source_ledger"], {}).get(row["source_id"], {})
        features.append({
            "type": "Feature",
            "id": row["segment_id"],
            "geometry": shape,
            "properties": {
                "id": row["segment_id"],
                "phase_id": row["phase_id"],
                "name": row["name"],
                "line_type": row["line_type"],
                "source_id": row["source_id"],
                "source_ledger": row["source_ledger"],
                "source_title": source.get("title", ""),
                "signed_on": source.get("signed_on", source.get("issued_year", "")),
                "legal_context": row["legal_context"],
                "territorial_scope": row["territorial_scope"],
                "geometry_provenance": row["geometry_provenance"],
                "confidence": row["confidence"],
                # A retained competitor names what it competes with, so a reader
                # meeting two lines in one year is told they are two claims.
                "alternative_of": row["alternative_of"],
                "has_alternative": bool(row["alternative_of"]),
                "interpretation_status": row["interpretation_status"],
                "review_status": row["review_status"],
                "note": row["notes"],
                "valid_from": int(row["valid_from"]),
                "valid_to": int(row["valid_to"]) if row["valid_to"] else OPEN_ENDED,
            },
        })
    return sorted(features, key=lambda f: f["id"])


def _read_reference(name: str) -> list[dict[str, str]]:
    with (REFERENCE / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def gis_collection(features: list[dict], layer: str, ticket: str, note: str) -> dict:
    return {
        "type": "FeatureCollection",
        "features": features,
        "_ccd": {
            "layer": layer,
            "ticket": ticket,
            "licence": LICENCE,
            "note": note,
        },
    }


def hiatus_timeline() -> dict:
    """Compile the Hiatus timeline into something an essay can filter (KAN-349).

    The states and the absence taxonomy are already gated in the reference
    tables; what was missing is a form a timeline can query. Emitting the
    taxonomy alongside the states matters as much as the states do: a reader
    filtering by absence class needs all six classes present, including the ones
    no state has earned yet, or the interface silently redefines the taxonomy as
    whatever the data happens to contain.
    """
    def read(name: str) -> list[dict[str, str]]:
        with (REFERENCE / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
            return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]

    witnesses = {row["witness_id"]: row for row in read("hiatus-witness-families")}
    classes = [
        {
            "absenceClass": row["absence_class"],
            "definition": row["definition"],
            "evidentialWeight": row["evidential_weight"],
            "requiresScopeReview": row["requires_scope_review"] == "yes",
            "allowedBeforeReview": row["allowed_before_review"] == "yes",
        }
        for row in sorted(read("hiatus-absence-classes"), key=lambda r: r["absence_class"])
    ]

    states = []
    for row in sorted(read("hiatus-timeline"), key=lambda r: r["state_id"]):
        witness = witnesses.get(row["witness_id"], {})
        states.append({
            "stateId": row["state_id"],
            "witnessId": row["witness_id"],
            "witnessTitle": witness.get("candidate_title", ""),
            "witnessQuestion": witness.get("historical_question", ""),
            "sourceFamily": row["source_family"],
            "periodFrom": int(row["period_from"]),
            "periodTo": int(row["period_to"]),
            "datePrecision": row["date_precision"],
            "locator": row["locator"],
            "absenceClass": row["absence_class"],
            "scopeReviewed": row["scope_reviewed"] == "yes",
            "reviewStatus": row["review_status"],
            "confidence": row["confidence"],
            "note": row["notes"],
        })

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "trench": "ccd-b",
        "absenceClasses": classes,
        "states": states,
        "sourceFamilies": sorted({state["sourceFamily"] for state in states}),
        "span": {
            "from": min((state["periodFrom"] for state in states), default=0),
            "to": max((state["periodTo"] for state in states), default=0),
        },
    }


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def borroczyn_package() -> dict:
    """Compile the KAN-357/358/359 seam without weakening its release hold."""
    georeferencing = json.loads(
        (REFERENCE / "borroczyn-georeferencing.json").read_text(encoding="utf-8")
    )
    seam = json.loads((REFERENCE / "borroczyn-seam.geojson").read_text(encoding="utf-8"))
    sources = _read_csv(REFERENCE / "borroczyn-seam-sources.csv")
    urban = _read_csv(DATA / "urban-features.csv")
    source_by_id = {row["source_id"]: row for row in sources}
    layers = [
        {
            **layer,
            "title": source_by_id.get(layer["sourceId"], {}).get("title", ""),
            "rightsStatus": source_by_id.get(layer["sourceId"], {}).get("rights_status", ""),
            "productionRole": source_by_id.get(layer["sourceId"], {}).get("production_role", ""),
        }
        for layer in georeferencing["evidenceLayers"]
    ]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "tickets": ["KAN-357", "KAN-358", "KAN-359"],
        "studyArea": {
            "id": seam["metadata"]["studyAreaId"],
            "version": seam["metadata"]["version"],
            "completeCityCoverage": seam["metadata"]["completeCityCoverage"],
            "justification": seam["metadata"]["justification"],
            "geometry": seam["features"][0]["geometry"],
        },
        "status": georeferencing["status"],
        "publicReady": georeferencing["status"] == "released" and bool(urban),
        "targetCrs": georeferencing["targetCrs"],
        "webCrs": georeferencing["webCrs"],
        "transformationMethod": georeferencing["transformationMethod"],
        "controlPoints": georeferencing["controlPoints"],
        "residualMetrics": georeferencing["residualMetrics"],
        "layers": layers,
        "urbanAuthority": {
            "recordCount": len(urban),
            "featureTypes": sorted({row["feature_type"] for row in urban}),
            "schemaDecision": georeferencing["schemaDecision"],
            "geometryPolicy": georeferencing["geometryPolicy"],
        },
        "blockers": georeferencing["blockers"],
    }


def in_manibus_package() -> dict:
    """Compile only records that have crossed the physical-inspection gate."""
    inspections = _read_csv(REFERENCE / "in-manibus-inspections.csv")
    objects = _read_csv(DATA / "objects.csv")
    evidence = _read_csv(DATA / "object-evidence.csv")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedBy": "scripts/dacia/build.py",
        "tickets": ["KAN-360", "KAN-361"],
        "status": "reviewed" if objects else "pending_physical_inspection",
        "publicReady": bool(objects) and all(row["review_state"] in {"approved", "published"} for row in objects),
        "counts": {
            "inspections": len(inspections),
            "reviewedInspections": sum(1 for row in inspections if row["inspection_status"] == "reviewed"),
            "objects": len(objects),
            "evidence": len(evidence),
        },
        "inspections": sorted(inspections, key=lambda row: row["inspection_id"]),
        "objects": sorted(objects, key=lambda row: row["object_id"]),
        "evidence": sorted(evidence, key=lambda row: row["evidence_id"]),
        "holdReason": (
            "No sheet enters the corpus until its direct physical inspection has been recorded and reviewed."
            if not objects
            else ""
        ),
    }


def v1_qa(tables: dict[str, list[dict[str, str]]]) -> dict:
    """Separate a reproducible candidate from the human claim that it is citable."""
    contract = json.loads(V1_CONTRACT.read_text(encoding="utf-8"))
    audit = json.loads(V1_QA_AUDIT.read_text(encoding="utf-8"))
    ids = {
        "places": {row["place_id"] for row in tables["places"]},
        "sources": {row["source_id"] for row in tables["sources"]},
    }
    stable_missing: dict[str, list[str]] = {}
    for table, key in (("places", "place_id"), ("sources", "source_id")):
        # The baseline belongs to the release contract, not to a generated
        # directory that this same build rewrites. Otherwise deleting a 0.1 ID
        # from the canonical table would delete it from both sides of the audit
        # and make the check pass precisely when it should fail.
        pilot_ids = set(contract["stableIdBaseline"][table])
        missing = sorted(pilot_ids - ids[table])
        if missing:
            stable_missing[table] = missing

    attestations = tables["attestations"]
    transcriptions = tables["transcriptions"]
    publishable = [row for row in attestations if row["review_state"] in PUBLIC_STATES]
    reviewed = [
        row for row in attestations
        if row["review_state"] in {"reviewed", "approved", "published"}
    ]
    checked_captures = [
        row for row in transcriptions
        if row["capture_method"] in {"from_witness", "from_edition"}
    ]
    places_by_id = {row["place_id"]: row for row in tables["places"]}
    attestations_by_id = {row["attestation_id"]: row for row in attestations}
    spot_checks = audit["spotChecks"]
    matched_spot_checks = [check for check in spot_checks if check["result"] == "matched"]
    spot_checked_attestations = [
        attestations_by_id[check["attestationId"]]
        for check in matched_spot_checks
        if check["attestationId"] in attestations_by_id
    ]
    spot_checked_regions = sorted({
        places_by_id[row["place_id"]]["region"]
        for row in spot_checked_attestations
        if row["place_id"] in places_by_id
    })
    missing_regimes = {
        regime: sorted(set(source_ids) - ids["sources"])
        for regime, source_ids in contract["requiredRegimes"].items()
        if set(source_ids) - ids["sources"]
    }
    targets = contract["targetCoverage"]
    coverage = {
        name: {
            "current": len(tables[name]),
            "target": target,
            "shortfall": max(0, target - len(tables[name])),
        }
        for name, target in targets.items()
    }
    coverage_ready = all(row["current"] >= row["target"] * 0.9 for row in coverage.values())

    uses = tables["name-uses"]
    unresolved_nomen = sorted({
        row["source_id"] for row in uses if row["source_id"] and row["source_id"] not in ids["sources"]
    } | {
        row["referent_place_id"] for row in uses
        if row["referent_place_id"] and row["referent_place_id"] not in ids["places"]
    })
    public_source_ids = {row["source_id"] for row in publishable}
    sources_by_id = {row["source_id"]: row for row in tables["sources"]}
    public_rights_incomplete = sorted(
        source_id for source_id in public_source_ids
        if sources_by_id[source_id]["rights_statement"] in {"", "rights_unknown"}
    )
    public_source_spot_checks_missing = sorted(
        public_source_ids - {row["source_id"] for row in spot_checked_attestations}
    )
    reviewed_states = {"reviewed", "approved", "published"}
    source_silent = [
        row for row in attestations if row["attestation_class"] == "source_silent"
    ]
    low_confidence = [row for row in attestations if row["confidence"] == "low"]
    editorial_reconstruction = [
        row for row in tables["places"]
        if row["ref_geometry_provenance"] == "editorial_reconstruction"
    ]
    public_reconstructed_unreviewed = sorted({
        row["place_id"]
        for row in publishable
        if row["place_id"] in places_by_id
        and places_by_id[row["place_id"]]["ref_geometry_provenance"]
        == "editorial_reconstruction"
        and places_by_id[row["place_id"]]["review_state"] not in reviewed_states
    })

    debt_rows = _read_reference("verification-debt")
    open_debt_ids = {
        row["debt_id"] for row in debt_rows if row["status"] == "open"
    }
    debt_pattern = re.compile(r"\bvd-[a-z0-9-]+\b")
    public_open_debt = {}
    for row in publishable:
        related = (
            row,
            places_by_id.get(row["place_id"], {}),
            sources_by_id.get(row["source_id"], {}),
        )
        refs = sorted({
            debt_id
            for record in related
            for debt_id in debt_pattern.findall(record.get("note", ""))
            if debt_id in open_debt_ids
        })
        if refs:
            public_open_debt[row["attestation_id"]] = refs
    hiatus_source_ids = {
        row.get("corpus_source_id", "")
        for row in _read_reference("hiatus-witness-families")
    }
    unresolved_hiatus = sorted(
        source_id for source_id in hiatus_source_ids
        if not source_id or source_id not in ids["sources"]
    )

    blockers = []
    if not coverage_ready:
        blockers.append("coverage_target_not_reached")
    if missing_regimes:
        blockers.append("required_evidence_regime_missing")
    if stable_missing:
        blockers.append("published_identifier_missing")
    if not matched_spot_checks:
        blockers.append("scholarly_spot_check_not_recorded")
    if not reviewed:
        blockers.append("human_scholarly_review_not_recorded")
    if len(publishable) < contract["minimumPublishableAttestations"]:
        blockers.append("no_publishable_attestations")
    if public_source_spot_checks_missing:
        blockers.append("public_source_spot_check_missing")
    if public_rights_incomplete:
        blockers.append("public_source_rights_incomplete")
    if public_reconstructed_unreviewed:
        blockers.append("public_reconstructed_geometry_unreviewed")
    if public_open_debt:
        blockers.append("publishable_verification_debt")
    if unresolved_hiatus:
        blockers.append("hiatus_authority_reconciliation_pending")

    return {
        "schemaVersion": contract["schemaVersion"],
        "candidate": contract["candidate"],
        "releaseStatus": "ready" if not blockers else "blocked",
        "blockers": blockers,
        "qaRun": {
            "audit": str(V1_QA_AUDIT.relative_to(REPO)),
            "checkedOn": audit["checkedOn"],
            "performedBy": audit["performedBy"],
            "policy": audit["policy"],
            "promotesReviewState": False,
            "authoritySpotChecks": {
                "recorded": len(spot_checks),
                "matched": len(matched_spot_checks),
                "attestationIds": sorted(
                    check["attestationId"] for check in matched_spot_checks
                ),
                "missingPublicSourceIds": public_source_spot_checks_missing,
                "regions": spot_checked_regions,
            },
        },
        "coverage": coverage,
        "evidenceRegimes": {
            "required": sorted(contract["requiredRegimes"]),
            "missingSourceIds": missing_regimes,
        },
        "stableIdAudit": {
            "pilot": "cnd-0.1",
            "missingPublishedIds": stable_missing,
            "migrationRegister": str(V1_MIGRATIONS.relative_to(REPO)),
        },
        "scholarlyReview": {
            "attestationsReviewedOrAbove": len(reviewed),
            "publishableAttestations": len(publishable),
            "capturesFromWitnessOrEdition": len(checked_captures),
            "sourceSilentPendingReview": sum(
                1 for row in attestations
                if row["attestation_class"] == "source_silent"
                and row["review_state"] not in {"reviewed", "approved", "published"}
            ),
            "lowConfidencePendingReview": sum(
                1 for row in attestations
                if row["confidence"] == "low"
                and row["review_state"] not in {"reviewed", "approved", "published"}
            ),
            "reconstructedPlaceGeometry": sum(
                1 for row in tables["places"]
                if row["ref_geometry_provenance"] == "editorial_reconstruction"
            ),
        },
        "editorialReview": {
            "sourceSilent": {
                "recordIds": sorted(row["attestation_id"] for row in source_silent),
                "reviewedIds": sorted(
                    row["attestation_id"]
                    for row in source_silent
                    if row["review_state"] in reviewed_states
                ),
                "excludedIds": sorted(
                    row["attestation_id"]
                    for row in source_silent
                    if row["review_state"] not in reviewed_states
                ),
            },
            "lowConfidence": {
                "recordIds": sorted(row["attestation_id"] for row in low_confidence),
                "reviewedIds": sorted(
                    row["attestation_id"]
                    for row in low_confidence
                    if row["review_state"] in reviewed_states
                ),
                "excludedIds": sorted(
                    row["attestation_id"]
                    for row in low_confidence
                    if row["review_state"] not in reviewed_states
                ),
            },
            "editorialReconstruction": {
                "recordIds": sorted(row["place_id"] for row in editorial_reconstruction),
                "reviewedIds": sorted(
                    row["place_id"]
                    for row in editorial_reconstruction
                    if row["review_state"] in reviewed_states
                ),
                "excludedIds": sorted(
                    row["place_id"]
                    for row in editorial_reconstruction
                    if row["review_state"] not in reviewed_states
                ),
                "publicUnreviewedIds": public_reconstructed_unreviewed,
            },
        },
        "rights": {
            "publicSourceIds": sorted(public_source_ids),
            "incompletePublicSourceIds": public_rights_incomplete,
            "researchOnlyRightsUnknownSourceIds": sorted(
                row["source_id"]
                for row in tables["sources"]
                if row["rights_statement"] in {"", "rights_unknown"}
            ),
            "sourceImageryRedistributed": False,
            "metadataLicence": "CC BY 4.0",
        },
        "verificationDebt": {
            "openIds": sorted(open_debt_ids),
            "publishableAttestations": public_open_debt,
        },
        "authorityConsumers": {
            "nomenErrans": "resolves" if not unresolved_nomen else "blocked",
            "nomenErransUnresolvedIds": unresolved_nomen,
            "hiatus": "resolves" if not unresolved_hiatus else "blocked",
            "hiatusUnresolvedSourceIds": unresolved_hiatus,
        },
        "automatedValidation": {
            "command": "npm run dacia:validate",
            "enforces": [
                "identifiers",
                "foreign_keys",
                "controlled_vocabularies",
                "date_precision",
                "geometry_provenance",
                "release_hashes",
            ],
        },
        "doi": contract["doi"],
    }


def v1_schema_markdown(fieldnames: dict[str, list[str]]) -> bytes:
    lines = [
        "# Corpus Nominum Daciae v1.0 schema",
        "",
        "The canonical field order for every release-candidate table follows.",
        "Controlled values and cross-field rules are defined in `docs/dacia/data-dictionary.md`",
        "and enforced by `scripts/dacia/validate.py`.",
        "",
    ]
    for name in TABLES:
        lines.extend([f"## `{name}.csv`", "", ", ".join(f"`{field}`" for field in fieldnames[name]), ""])
    return ("\n".join(lines).rstrip() + "\n").encode("utf-8")


def build_v1_outputs() -> dict[Path, bytes]:
    """Build the complete local v1 candidate without bypassing its scholarly gate."""
    tables = {name: read_table(name) for name in TABLES}
    fieldnames = {
        name: list(csv.DictReader((DATA / f"{name}.csv").open(encoding="utf-8")).fieldnames or [])
        for name in TABLES
    }
    qa = v1_qa(tables)
    outputs: dict[Path, bytes] = {}
    for name, rows in tables.items():
        outputs[V1_RELEASE_DIR / f"{name}.csv"] = csv_bytes(rows, fieldnames[name])
        outputs[V1_RELEASE_DIR / f"{name}.parquet"] = parquet_bytes(rows, fieldnames[name])

    outputs[V1_RELEASE_DIR / "cnd.jsonld"] = canonical_json({
        "@context": CONTEXT,
        "@id": "https://terra-chartarum.pages.dev/data/cnd-1.0-rc1",
        "@type": "Dataset",
        "dcterms:title": "Corpus Nominum Daciae 1.0 release candidate",
        "dcterms:license": "CC BY 4.0 for Terra Chartarum metadata and annotations",
        "release": qa["candidate"],
        "releaseStatus": qa["releaseStatus"],
        "records": {name: [dict(sorted(row.items())) for row in rows] for name, rows in tables.items()},
    })
    outputs[V1_RELEASE_DIR / "atlas-publishable.geojson"] = canonical_json(
        feature_collection(
            build_features(tables["places"], tables["sources"], tables["attestations"], True),
            "public",
            qa["candidate"],
            "release_candidate",
        )
    )
    outputs[V1_RELEASE_DIR / "atlas-research.geojson"] = canonical_json(
        feature_collection(
            build_features(tables["places"], tables["sources"], tables["attestations"], False),
            "research",
            qa["candidate"],
            "release_candidate",
        )
    )
    outputs[V1_RELEASE_DIR / "qa.json"] = canonical_json(qa)
    outputs[V1_RELEASE_DIR / "SCHEMA.md"] = v1_schema_markdown(fieldnames)
    outputs[V1_RELEASE_DIR / "METHODOLOGY.md"] = (
        "# Methodology\n\n"
        "CND models places as referents, sources as bounded witnesses or series, and attestations "
        "as source-located claims. Names are never join keys. Silences remain typed claims and "
        "cannot carry readings. Machine normalization may reach `normalized`; only a named human "
        "reviewer checking a witness or edition may promote a record further. The public spatial "
        "output contains only approved or published attestations. The KAN-365 machine-assisted "
        "authority sample is recorded separately and promotes no review state. See `qa.json` "
        "before citation.\n"
    ).encode("utf-8")
    outputs[V1_RELEASE_DIR / "LICENSE.md"] = (
        "# Licence\n\nTerra Chartarum metadata and original annotations in this candidate are "
        "licensed CC BY 4.0. Upstream works and repository images retain the rights stated on "
        "their source rows. No source imagery is redistributed in this package.\n"
    ).encode("utf-8")
    outputs[V1_RELEASE_DIR / "CITATION.cff"] = (
        "cff-version: 1.2.0\nmessage: >-\n  This is a blocked release candidate; consult qa.json before citation.\n"
        "title: Corpus Nominum Daciae\ntype: dataset\nversion: cnd-1.0-rc1\n"
        "authors:\n  - family-names: Simion\n    given-names: Vlad\n"
        "license: CC-BY-4.0\n"
    ).encode("utf-8")
    return outputs


def build_v1_manifest(outputs: dict[Path, bytes]) -> bytes:
    qa = json.loads(outputs[V1_RELEASE_DIR / "qa.json"])
    inputs = [
        *(DATA / f"{name}.csv" for name in TABLES),
        V1_CONTRACT,
        V1_QA_AUDIT,
        V1_MIGRATIONS,
    ]
    return canonical_json({
        "schemaVersion": 1,
        "release": qa["candidate"],
        "releaseStatus": qa["releaseStatus"],
        "counts": {name: len(read_table(name)) for name in TABLES},
        "coverage": qa["coverage"],
        "blockers": qa["blockers"],
        "licenceSummary": {
            "metadata": "CC BY 4.0",
            "upstream": "Per-source rights_statement; source imagery is not redistributed",
        },
        "doi": qa["doi"],
        "reproducibleBuild": {
            "command": "make dacia",
            "generator": "scripts/dacia/build.py",
            "timestamped": False,
        },
        "inputs": {
            str(path.relative_to(REPO)): sha256_bytes(path.read_bytes()) for path in inputs
        },
        "outputs": {
            str(path.relative_to(REPO)): {"sha256": sha256_bytes(payload), "bytes": len(payload)}
            for path, payload in sorted(outputs.items())
        },
    })


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
    outputs[GENERATED_DIR / "trench-a.json"] = canonical_json(trench_a_bridge(tables))
    outputs[GENERATED_DIR / "hiatus-timeline.json"] = canonical_json(hiatus_timeline())
    outputs[GENERATED_DIR / "programme.json"] = canonical_json(programme_graph(tables))
    outputs[GENERATED_DIR / "nomen-errans.json"] = canonical_json(nomen_errans_slice(tables))
    outputs[GENERATED_DIR / "borroczyn.json"] = canonical_json(borroczyn_package())
    outputs[GENERATED_DIR / "in-manibus.json"] = canonical_json(in_manibus_package())

    sites, network = roman_dacia_features(tables["places"])
    outputs[GEO_DIR / f"{ROMAN_SITES}.geojson"] = canonical_json(gis_collection(
        sites, ROMAN_SITES, "KAN-341",
        "Site positions are the corpus's own reference locations, carrying the corpus's "
        "provenance; none is an excavated centroid.",
    ))
    outputs[GEO_DIR / f"{ROMAN_NETWORK}.geojson"] = canonical_json(gis_collection(
        network, ROMAN_NETWORK, "KAN-341",
        "Roads are lines through attested stations and the limes are editorial corridors. "
        "No segment here is digitised from a survey.",
    ))
    outputs[GEO_DIR / f"{PRINCIPALITIES}.geojson"] = canonical_json(gis_collection(
        principality_features(), PRINCIPALITIES, "KAN-342",
        "Phases, not one timeless polygon. Every ring is an editorial envelope for temporal "
        "filtering and none is traced from a modern national boundary.",
    ))
    outputs[GEO_DIR / f"{TREATY_FRONTIERS}.geojson"] = canonical_json(gis_collection(
        treaty_frontier_features(), TREATY_FRONTIERS, "KAN-352",
        "Frontier phases attributed to the instruments that made them. No instrument in the "
        "ledger has usable delimitation geometry, so every line is declared editorial; "
        "competing lines for one moment are retained side by side and never averaged.",
    ))
    outputs[GEO_DIR / f"{JOSEPHINIAN}.geojson"] = canonical_json(gis_collection(
        josephinian_features(tables["places"]), JOSEPHINIAN, "KAN-343",
        "Reconstructed sheet footprints over the corpus, linking to the repository. "
        "No scan is redistributed.",
    ))
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
    v1_outputs = build_v1_outputs()
    v1_outputs[V1_RELEASE_DIR / "manifest.json"] = build_v1_manifest(v1_outputs)
    outputs.update(v1_outputs)

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
