#!/usr/bin/env python3
"""Compile the Antarctic pilot slice into the assets the Atlas and the essay read (KAN-423).

There is one projection. The Atlas GeoJSON and the essay's generated JSON are
both derived from `project()` below, so the two surfaces cannot drift into
disagreeing about a date, a provenance or a confidence: if they did, one of them
would have had to author the fact itself, which is the thing this build exists
to prevent.

Two tiers, as in the CND pilot:

* the **public** tier holds only records a person has cleared. It is empty, and
  it should be: nothing in this slice has been read against a source.
* the **research** tier holds everything, with `review_state` on every record.

The build is deterministic. No timestamps, sorted keys, fixed float precision
and a stable row order, so identical inputs produce identical bytes and only the
data can move a hash.

Run with `make antarctica`, then `npm run antarctica:validate`.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "antarctica"
RELEASE_DIR = DATA / "release" / "ant-pilot-0.1"
GEO_DIR = REPO / "public" / "geo"
GENERATED_DIR = REPO / "src" / "data" / "antarctica" / "generated"

SCHEMA_VERSION = 1
RELEASE_VERSION = "ant-pilot-0.1"
RELEASE_KIND = "pilot_research_release"
LICENCE = (
    "CC BY 4.0 for the compiled records; every source and map object carries its own "
    "rights status, and no object in this release is cleared for reproduction."
)
# The Atlas takes one render hint per layer, so the pilot ships as two assets
# compiled from one projection - lines and outlines in one, dated positions in
# the other. This is the same split the Dacia Roman baseline makes, and for the
# same reason: it is a rendering constraint, not two datasets.
LAYER_LINES = "antarctica-pilot-tracks"
LAYER_POINTS = "antarctica-pilot-observations"

PUBLIC_STATES = {"approved", "published"}

TABLES = [
    "sources", "map-objects", "source-gaps", "claims", "terminology",
    "coronelli-lineage", "coronelli-annotations", "expeditions", "features", "tracks",
    "observations", "ghost-geographies", "names", "feature-map-objects", "feature-evidence",
]


def read(name: str) -> list[dict[str, str]]:
    with (DATA / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def canonical_json(payload: object) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def round6(value: float) -> float:
    """Six decimals is about a tenth of a metre, which is far beyond anything
    this dataset knows. It exists to make the bytes stable, not to imply precision."""
    return float(f"{value:.6f}")


def wkt_to_geometry(wkt: str) -> dict[str, object] | None:
    """Parse the small WKT subset the tables use. No dependency, no GDAL."""
    if not wkt:
        return None
    match = re.match(r"^(POINT|LINESTRING|POLYGON) \((.*)\)$", wkt)
    if not match:
        raise ValueError(f"unsupported geometry: {wkt}")
    kind, body = match.group(1), match.group(2)
    if kind == "POINT":
        lon, lat = body.split(" ")
        return {"type": "Point", "coordinates": [round6(float(lon)), round6(float(lat))]}
    if kind == "LINESTRING":
        return {"type": "LineString", "coordinates": [pair(p) for p in body.split(", ")]}
    ring = body.strip("()")
    return {"type": "Polygon", "coordinates": [[pair(p) for p in ring.split(", ")]]}


def pair(text: str) -> list[float]:
    lon, lat = text.strip().split(" ")
    return [round6(float(lon)), round6(float(lat))]


def project() -> list[dict[str, object]]:
    """The single projection both surfaces read.

    Four tables become one list of records with a common shape. The shape is
    deliberately flat and evidence-first: whatever a record is, a reader can ask
    it the same four questions - what kind of evidence, drawn from where, how
    confident, and what happened to it later.
    """
    records: list[dict[str, object]] = []

    for row in read("features"):
        records.append(base(row, row["feature_id"], "feature", row["display_name"], row["act"], {
            "featureType": row["feature_type"],
            "historicName": row["historic_name"],
            "validFrom": as_year(row["valid_from"]),
            "validTo": as_year(row["valid_to"]),
            "expeditionId": row["expedition_id"] or None,
            "laterStatus": row["later_status"],
        }, row["geometry"]))

    for row in read("tracks"):
        records.append(base(row, row["track_id"], "track", row["display_name"], row["act"], {
            "trackKind": row["track_kind"],
            "vessel": row["vessel"],
            "dateFrom": row["date_from"],
            "dateTo": row["date_to"],
            "expeditionId": row["expedition_id"] or None,
            "validFrom": as_year(row["date_from"][:4]),
            "validTo": as_year(row["date_to"][:4]) if row["date_to"] else as_year(row["date_from"][:4]),
        }, row["geometry"]))

    for row in read("observations"):
        year = row["observed_date"][:4]
        records.append(base(row, row["observation_id"], "observation", row["display_name"], row["act"], {
            "observationKind": row["observation_kind"],
            "observedDate": row["observed_date"],
            "datePrecision": row["date_precision"],
            "observer": row["observer"],
            "expeditionId": row["expedition_id"] or None,
            "laterStatus": row["later_status"],
            "validFrom": as_year(year),
            "validTo": as_year(year),
        }, f"POINT ({row['lon']} {row['lat']})"))

    for row in read("ghost-geographies"):
        records.append(base(row, row["ghost_id"], "ghost", row["display_name"], row["act"], {
            "historicName": row["historic_name"],
            "claimant": row["claimant"],
            "claimDate": row["claim_date"],
            "whatWasReported": row["what_was_reported"],
            "whyPlausible": row["why_plausible"],
            "laterStatus": row["later_status"],
            "laterEvidence": row["later_evidence"],
            "currentScholarlyStatus": row["current_scholarly_status"],
            "validFrom": as_year(row["claim_date"]),
            "validTo": 9999,
        }, row["geometry"], evidence_class=row["original_evidence_class"]))

    records.sort(key=lambda record: str(record["id"]))
    return records


def as_year(value: str) -> int | None:
    return int(value) if value.lstrip("-").isdigit() else None


def base(row: dict[str, str], record_id: str, kind: str, title: str, act: str,
         extra: dict[str, object], wkt: str, *, evidence_class: str = "") -> dict[str, object]:
    record: dict[str, object] = {
        "id": record_id,
        "kind": kind,
        "act": act,
        "title": title,
        "evidenceClass": evidence_class or row["evidence_class"],
        "geometryProvenance": row["geometry_provenance"],
        "confidence": row["confidence"],
        "reviewState": row["review_state"],
        "sourceId": row["source_id"] or None,
        "sourceLocator": row["source_locator"],
        "notes": row["notes"],
        "geometry": wkt_to_geometry(wkt) if row["geometry_provenance"] != "not_spatial" else None,
    }
    record.update({k: v for k, v in extra.items() if v not in ("", None) or k.endswith("Id")})
    return record


def to_geojson(records: list[dict[str, object]], geometry_types: set[str]) -> dict[str, object]:
    features = []
    for record in records:
        geometry = record["geometry"]
        if geometry is None or geometry["type"] not in geometry_types:  # type: ignore[index]
            continue
        properties = {k: v for k, v in record.items() if k != "geometry"}
        features.append({"type": "Feature", "properties": properties, "geometry": geometry})
    return {"type": "FeatureCollection", "features": features}


def build_outputs() -> dict[Path, bytes]:
    records = project()
    outputs: dict[Path, bytes] = {}

    # The Atlas reads the spatial subset; records without geometry are not
    # mappable and are deliberately absent rather than given a placeholder point.
    # A polygon rides in the line asset because the schematic envelope is honest
    # as an outline and dishonest as a filled territory.
    outputs[GEO_DIR / f"{LAYER_LINES}.geojson"] = canonical_json(
        to_geojson(records, {"LineString", "Polygon"})
    )
    outputs[GEO_DIR / f"{LAYER_POINTS}.geojson"] = canonical_json(to_geojson(records, {"Point"}))

    # The essay reads everything, including the records that have no geometry,
    # because a claim about Coronelli's plate is still part of the argument.
    outputs[GENERATED_DIR / "pilot.json"] = canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "layerIds": [LAYER_LINES, LAYER_POINTS],
        "records": records,
        "expeditions": [
            {
                "id": row["expedition_id"],
                "act": row["act"],
                "displayName": row["display_name"],
                "commander": row["commander"],
                "vessels": [v for v in row["vessels"].split("|") if v],
                "yearFrom": int(row["year_from"]),
                "yearTo": int(row["year_to"]),
                "reviewState": row["review_state"],
            }
            for row in sorted(read("expeditions"), key=lambda r: r["expedition_id"])
        ],
    })

    for name in TABLES:
        outputs[RELEASE_DIR / f"{name}.csv"] = (DATA / f"{name}.csv").read_bytes()
    return outputs


def build_manifest(outputs: dict[Path, bytes], records: list[dict[str, object]]) -> bytes:
    tables = {name: read(name) for name in TABLES}
    objects = tables["map-objects"]
    by_state: dict[str, int] = {}
    for record in records:
        state = str(record["reviewState"])
        by_state[state] = by_state.get(state, 0) + 1

    return canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "licence": LICENCE,
        "counts": {name: len(rows) for name, rows in tables.items()},
        "pilotRecords": len(records),
        "pilotByReviewState": dict(sorted(by_state.items())),
        "publicRecords": sum(1 for r in records if r["reviewState"] in PUBLIC_STATES),
        "mappableRecords": sum(1 for r in records if r["geometry"] is not None),
        "verifiedObjects": sum(1 for r in objects if r["verification_state"] == "verified"),
        "objectsClearedForReproduction": sum(
            1 for r in objects if r["reproduction_use"] in {"thumbnail", "full_reproduction", "deepzoom"}
        ),
        "openSourceGaps": sum(1 for r in tables["source-gaps"] if r["status"] == "open"),
        "highRiskClaims": sum(1 for r in tables["claims"] if r["risk"] == "high"),
        "reviewedClaims": sum(1 for r in tables["claims"] if r["review_status"] == "reviewed"),
        "evidenceClasses": sorted({str(r["evidenceClass"]) for r in records}),
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
    outputs = build_outputs()
    outputs[RELEASE_DIR / "manifest.json"] = build_manifest(outputs, project())

    for path, payload in sorted(outputs.items()):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        print(f"  wrote {path.relative_to(REPO)} ({len(payload):,} bytes)")

    manifest = json.loads(outputs[RELEASE_DIR / "manifest.json"])
    print(f"\nAntarctica {RELEASE_VERSION} ({RELEASE_KIND})")
    print(f"  pilot records: {manifest['pilotRecords']} "
          f"({manifest['mappableRecords']} mappable, {manifest['publicRecords']} public)")
    print(f"  objects: {manifest['verifiedObjects']} verified, "
          f"{manifest['objectsClearedForReproduction']} cleared for reproduction")
    print(f"  open source gaps: {manifest['openSourceGaps']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
