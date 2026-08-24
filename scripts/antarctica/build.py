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
# The Atlas family (ANT-11 / KAN-430). Four layers, split by the argument each
# one carries rather than by convenience, and all four compiled from the single
# projection below. The line/point division inside that split is a MapLibre
# constraint - one render hint per layer - not a second dataset.
#
# `antarctica-pilot-tracks` and `antarctica-pilot-observations` were the two
# pilot IDs registered at KAN-423. They are retired here rather than kept: they
# were `in-review`, never public, and one day old, and ANT-11 is the ticket whose
# job is to register the real family. The decision is recorded in
# docs/antarctica/atlas-family.md so the rename is a migration and not a quiet
# renumbering of a stable scholarly identifier.
LAYER_CONJECTURED = "antarctica-conjectured-south"
LAYER_TRACKS = "antarctica-expedition-tracks"
LAYER_OBSERVATIONS = "antarctica-observations"
LAYER_GHOSTS = "antarctica-ghost-geographies"
ATLAS_LAYERS = [LAYER_CONJECTURED, LAYER_TRACKS, LAYER_OBSERVATIONS, LAYER_GHOSTS]

PUBLIC_STATES = {"approved", "published"}

TABLES = [
    "sources", "map-objects", "source-gaps", "claims", "terminology",
    "coronelli-lineage", "coronelli-annotations", "expeditions", "features", "tracks",
    "observations", "ghost-geographies", "names", "feature-map-objects", "feature-evidence",
    "priority-claims", "coastline-chronology", "expedition-phases", "chart-contributions",
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


def to_geojson(records: list[dict[str, object]], keep) -> dict[str, object]:
    features = []
    for record in records:
        if record["geometry"] is None or not keep(record):
            continue
        properties = {k: v for k, v in record.items() if k != "geometry"}
        features.append(
            {"type": "Feature", "properties": properties, "geometry": record["geometry"]}
        )
    return {"type": "FeatureCollection", "features": features}


def layer_members(records: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    """Assign every mappable record to exactly one layer.

    The ghost layer is expected to come out empty, and that is the point: the
    contract ships ahead of the positions, exactly as `dacia-attestations` ships
    ahead of its review. A reader can find the layer, read what it will hold and
    read why it holds nothing, which is better than the layer appearing on the
    day the first disputed position is finally located.
    """
    return {
        LAYER_CONJECTURED: to_geojson(
            records, lambda r: r["kind"] == "feature" and r["evidenceClass"] == "conjectured"
        ),
        LAYER_TRACKS: to_geojson(records, lambda r: r["kind"] == "track"),
        LAYER_OBSERVATIONS: to_geojson(
            records,
            lambda r: r["kind"] == "observation"
            or (r["kind"] == "feature" and r["evidenceClass"] != "conjectured"),
        ),
        LAYER_GHOSTS: to_geojson(records, lambda r: r["kind"] == "ghost"),
    }


def build_outputs() -> dict[Path, bytes]:
    records = project()
    outputs: dict[Path, bytes] = {}

    # The Atlas reads the spatial subset; records without geometry are not
    # mappable and are deliberately absent rather than given a placeholder point.
    # The conjectured envelope rides in a line layer because it is honest as an
    # outline and dishonest as a filled territory: filling it would draw a
    # continent where the whole argument is that nobody had seen one.
    for layer, collection in layer_members(records).items():
        outputs[GEO_DIR / f"{layer}.geojson"] = canonical_json(collection)

    # The essay reads everything, including the records that have no geometry,
    # because a claim about Coronelli's plate is still part of the argument.
    outputs[GENERATED_DIR / "pilot.json"] = canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "layerIds": ATLAS_LAYERS,
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
        # Act VIII reads phases rather than a single route, because the whole
        # point is that the expedition changed what kind of thing it was.
        "phases": [
            {
                "id": row["phase_id"],
                "expeditionId": row["expedition_id"],
                "sequence": int(row["sequence"]),
                "phaseKind": row["phase_kind"],
                "displayName": row["display_name"],
                "dateFrom": row["date_from"],
                "dateTo": row["date_to"],
                "datePrecision": row["date_precision"],
                "underOwnPower": row["under_own_power"],
                "evidenceClass": row["evidence_class"],
                "confidence": row["confidence"],
                "reviewState": row["review_state"],
                "notes": row["notes"],
            }
            for row in sorted(read("expedition-phases"), key=lambda r: (r["expedition_id"], int(r["sequence"])))
        ],
        # Act V reads competing claims. There is no winner field and there will
        # not be one; the reader is given the definitions and the claims.
        "priorityClaims": [
            {
                "id": row["priority_id"],
                "contest": row["contest"],
                "claimant": row["claimant"],
                "expeditionId": row["expedition_id"] or None,
                "observationId": row["observation_id"] or None,
                "claimDate": row["claim_date"],
                "definitionSatisfied": row["definition_satisfied"],
                "assertedBy": row["asserted_by"],
                "contestedBy": row["contested_by"],
                "evidenceStrength": row["evidence_strength"],
                "reviewStatus": row["review_status"],
                "notes": row["notes"],
            }
            for row in sorted(read("priority-claims"), key=lambda r: r["priority_id"])
        ],
        "coastline": [
            {
                "id": row["segment_id"],
                "displayName": row["display_name"],
                "region": row["region"],
                "firstClaimedDate": row["first_claimed_date"] or None,
                "firstObservedDate": row["first_observed_date"] or None,
                "firstChartedDate": row["first_charted_date"] or None,
                "firstConfirmedDate": row["first_confirmed_date"] or None,
                "claimedByExpeditionId": row["claimed_by_expedition_id"] or None,
                "confirmedByExpeditionId": row["confirmed_by_expedition_id"] or None,
                "laterStatus": row["later_status"],
                "evidenceClass": row["evidence_class"],
                "confidence": row["confidence"],
                "reviewState": row["review_state"],
                "notes": row["notes"],
            }
            for row in sorted(read("coastline-chronology"), key=lambda r: r["segment_id"])
        ],
        # Act VII reads one chart against its own predecessor.
        "chartContributions": [
            {
                "id": row["contribution_id"],
                "mapObjectId": row["map_object_id"],
                "expeditionId": row["expedition_id"] or None,
                "voyageLabel": row["voyage_label"],
                "chartDates": row["chart_dates"],
                "contributionKind": row["contribution_kind"],
                "presentOn1874": row["present_on_1874"] == "yes",
                "presentOn1910": row["present_on_1910"] == "yes",
                "reviewState": row["review_state"],
                "notes": row["notes"],
            }
            for row in sorted(read("chart-contributions"), key=lambda r: r["contribution_id"])
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
        "layerCounts": {
            layer: len(collection["features"])
            for layer, collection in sorted(layer_members(records).items())
        },
        "verifiedObjects": sum(1 for r in objects if r["verification_state"] == "verified"),
        "objectsClearedForReproduction": sum(
            1 for r in objects if r["reproduction_use"] in {"thumbnail", "full_reproduction", "deepzoom"}
        ),
        "openSourceGaps": sum(1 for r in tables["source-gaps"] if r["status"] == "open"),
        "highRiskClaims": sum(1 for r in tables["claims"] if r["risk"] == "high"),
        "priorityContests": sorted({r["contest"] for r in tables["priority-claims"]}),
        "chartRevision": {
            "on1874": sum(1 for r in tables["chart-contributions"] if r["present_on_1874"] == "yes"),
            "on1910": sum(1 for r in tables["chart-contributions"] if r["present_on_1910"] == "yes"),
        },
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
