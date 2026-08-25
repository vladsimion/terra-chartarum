#!/usr/bin/env python3
"""Compile the Crusades pilot into the assets the Atlas and the essay read (KAN-388).

Two proofs, one projection. The Road proof compares a strip diagram with a set of
modern positions; the Sea proof separates six states that a single route line
would collapse. Both compile from the tables in data/crusades and neither
authors a coordinate.

Three things deliberately never reach a layer:

* an **itinerary stage** has no position of its own. The manuscript is a
  sequence, not a map. What the layer draws is the *place* a stage refers to, at
  its modern reference coordinate, carrying the stage's sequence and label - and
  the property names say `modern_reference` so the comparison stays visible;
* the **partition claim** has no geometry, because the Partitio's boundaries are
  disputed and drawing them would publish a claim as a map;
* **durable control** has no geometry either, for the same reason in reverse:
  what was actually held is contested throughout, and the VMN possessions layer
  already models Venetian holdings properly.

The build is deterministic: no timestamps, sorted keys, fixed float precision.

Run with `make crusades`, then `npm run crusades:validate`.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "crusades"
RELEASE_DIR = DATA / "release" / "cru-pilot-0.1"
GEO_DIR = REPO / "public" / "geo"
GENERATED_DIR = REPO / "src" / "data" / "crusades" / "generated"

SCHEMA_VERSION = 1
RELEASE_VERSION = "cru-pilot-0.1"
RELEASE_KIND = "pilot_research_release"
LICENCE = (
    "CC BY 4.0 for the compiled records; every witness carries its own rights status, "
    "and no witness in this release is cleared for publication."
)

LAYER_ITINERARY = "crusades-itinerary"
LAYER_ROUTES = "crusades-fourth-crusade-routes"
LAYER_EVENTS = "crusades-fourth-crusade-events"
LAYER_NETWORK = "crusades-jerusalem-network"
ATLAS_LAYERS = [LAYER_ITINERARY, LAYER_ROUTES, LAYER_EVENTS, LAYER_NETWORK]

TABLES = [
    "places",
    "source-audit",
    "itinerary-stages",
    "fourth-crusade-states",
    "jerusalem-roles",
]
PUBLIC_STATES = {"approved", "published"}

# States that resolve to a place and may be drawn there. The other three are
# absent from every layer on purpose, and the manifest records that.
DRAWABLE_STATES = {"attack", "negotiated_diversion"}

# The one Holy Land register that is about a place on the ground. The other five
# say what Jerusalem meant, and meaning has no coordinate: a sacred centre drawn
# at 31.78N is a pin where the argument was (KAN-438).
DRAWABLE_ROLES = {"network_node"}


def read(name: str) -> list[dict[str, str]]:
    with (DATA / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def canonical_json(payload: object) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def round6(value: float) -> float:
    return float(f"{value:.6f}")


def line_geometry(wkt: str) -> dict[str, object]:
    match = re.match(r"^LINESTRING \((.*)\)$", wkt)
    if not match:
        raise ValueError(f"unsupported geometry: {wkt}")
    coordinates = []
    for pair in match.group(1).split(", "):
        lon, lat = pair.strip().split(" ")
        coordinates.append([round6(float(lon)), round6(float(lat))])
    return {"type": "LineString", "coordinates": coordinates}


def places_by_id() -> dict[str, dict[str, str]]:
    return {row["place_id"]: row for row in read("places")}


def gates_and_debts() -> dict[str, list[dict[str, object]]]:
    """The flagship's gate state and what blocks each gate (KAN-384/KAN-385).

    Compiled rather than written into the essay, for the reason the Dacia
    programme index gives: a hand-maintained list of what a prototype cannot yet
    do is a second copy of the project's state, and the copy is the one that
    goes stale. The essay's closing section is the most-read statement of this
    pilot's limits, and it was prose.
    """
    gates = [
        {
            "proof": row["proof_id"],
            "gate": row["gate_id"],
            "order": int(row["order"]),
            "status": row["status"],
            "jiraKey": row["jira_key"],
            "evidence": row["evidence"] or None,
            "note": row["note"],
        }
        for row in read("reference/gates")
    ]
    gates.sort(key=lambda g: (g["proof"], g["order"]))

    debts = [
        {
            "id": row["debt_id"],
            "kind": row["kind"],
            "statement": row["statement"],
            "blocks": [t for t in (p.strip() for p in row["blocks"].split("|")) if t],
            "resolutionPath": row["resolution_path"],
            "status": row["status"],
        }
        for row in read("reference/verification-debt")
        if row["status"] == "open"
    ]
    debts.sort(key=lambda d: d["id"])
    return {"gates": gates, "debts": debts}


def project() -> dict[str, list[dict[str, object]]]:
    """One projection, read by both the Atlas assets and the essay."""
    places = places_by_id()

    itinerary: list[dict[str, object]] = []
    for row in sorted(read("itinerary-stages"), key=lambda r: int(r["sequence"])):
        place = places[row["place_id"]]
        itinerary.append({
            "id": row["stage_id"],
            "sequence": int(row["sequence"]),
            "placeId": row["place_id"],
            "manuscriptLabel": row["manuscript_label"],
            "modernName": place["name_modern"] or place["preferred_name"],
            "folio": row["folio"],
            # The manuscript's own claim about the journey, kept as drawn.
            "depictedDays": int(row["depicted_days"]) if row["depicted_days"].isdigit() else None,
            "mode": row["mode"],
            "variantNote": row["variant_note"],
            "evidenceClass": row["evidence_class"],
            "confidence": row["confidence"],
            "reviewState": row["review_state"],
            "sourceId": row["source_id"],
            "sourceLocator": row["source_locator"],
            "notes": row["notes"],
            # Named so nobody can mistake it for a position the manuscript gives.
            "modernReference": [round6(float(place["lon"])), round6(float(place["lat"]))],
            "geometryProvenance": "modern_reference",
        })

    states: list[dict[str, object]] = []
    for row in sorted(read("fourth-crusade-states"), key=lambda r: int(r["sequence"])):
        place_ids = [p for p in row["place_ids"].split("|") if p]
        states.append({
            "id": row["state_id"],
            "sequence": int(row["sequence"]),
            "stateKind": row["state_kind"],
            "title": row["display_name"],
            "dateFrom": row["date_from"],
            "dateTo": row["date_to"],
            "datePrecision": row["date_precision"],
            "placeIds": place_ids,
            "held": row["held"],
            "evidenceClass": row["evidence_class"],
            "geometryProvenance": row["geometry_provenance"],
            "confidence": row["confidence"],
            "reviewState": row["review_state"],
            "sourceId": row["source_id"],
            "sourceLocator": row["source_locator"],
            "vmnReference": row["vmn_reference"] or None,
            "notes": row["notes"],
            "geometry": line_geometry(row["geometry"]) if row["geometry"] else None,
        })

    roles: list[dict[str, object]] = []
    for row in sorted(read("jerusalem-roles"), key=lambda r: int(r["sequence"])):
        place_ids = [p for p in row["place_ids"].split("|") if p]
        roles.append({
            "id": row["role_id"],
            "sequence": int(row["sequence"]),
            "roleKind": row["role_kind"],
            "title": row["display_name"],
            "dateFrom": row["date_from"],
            "dateTo": row["date_to"],
            "datePrecision": row["date_precision"],
            "placeIds": place_ids,
            "placeNames": [places[p]["preferred_name"] for p in place_ids],
            "evidenceClass": row["evidence_class"],
            "geometryProvenance": row["geometry_provenance"],
            "confidence": row["confidence"],
            "reviewState": row["review_state"],
            # Empty for later cartographic memory, which rests on its catalogue
            # record instead: see the rule in validate_roles.
            "sourceId": row["source_id"] or None,
            "sourceLocator": row["source_locator"] or None,
            "catalogueObjectId": row["catalogue_object_id"] or None,
            "vmnReference": row["vmn_reference"] or None,
            "notes": row["notes"],
        })

    return {"itinerary": itinerary, "states": states, "roles": roles}


def build_outputs() -> dict[Path, bytes]:
    projection = project()
    places = places_by_id()
    outputs: dict[Path, bytes] = {}

    # The Road proof, drawn at modern reference positions and labelled with what
    # the diagram says. Every property name keeps the two apart.
    outputs[GEO_DIR / f"{LAYER_ITINERARY}.geojson"] = canonical_json({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {k: v for k, v in stage.items() if k != "modernReference"},
                "geometry": {"type": "Point", "coordinates": stage["modernReference"]},
            }
            for stage in projection["itinerary"]
        ],
    })

    outputs[GEO_DIR / f"{LAYER_ROUTES}.geojson"] = canonical_json({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {k: v for k, v in state.items() if k != "geometry"},
                "geometry": state["geometry"],
            }
            for state in projection["states"]
            if state["geometry"] is not None
        ],
    })

    events = []
    for state in projection["states"]:
        if state["stateKind"] not in DRAWABLE_STATES:
            continue
        for place_id in state["placeIds"]:
            place = places[place_id]
            properties = {k: v for k, v in state.items() if k != "geometry"}
            properties["placeId"] = place_id
            properties["geometryProvenance"] = "modern_reference"
            events.append({
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Point",
                    "coordinates": [round6(float(place["lon"])), round6(float(place["lat"]))],
                },
            })
    outputs[GEO_DIR / f"{LAYER_EVENTS}.geojson"] = canonical_json({
        "type": "FeatureCollection", "features": events,
    })

    # The Holy Land register, drawn only where it is about a quay. The other
    # five registers are absent from every layer, and the manifest says so.
    network = []
    for role in projection["roles"]:
        if role["roleKind"] not in DRAWABLE_ROLES:
            continue
        for place_id in role["placeIds"]:
            place = places[place_id]
            properties = {k: v for k, v in role.items()}
            properties["placeId"] = place_id
            properties["placeName"] = place["preferred_name"]
            properties["nameArabic"] = place["name_arabic"] or None
            network.append({
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Point",
                    "coordinates": [round6(float(place["lon"])), round6(float(place["lat"]))],
                },
            })
    outputs[GEO_DIR / f"{LAYER_NETWORK}.geojson"] = canonical_json({
        "type": "FeatureCollection", "features": network,
    })

    outputs[GENERATED_DIR / "pilot.json"] = canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "layerIds": ATLAS_LAYERS,
        **projection,
        **gates_and_debts(),
    })

    for name in TABLES:
        outputs[RELEASE_DIR / f"{name}.csv"] = (DATA / f"{name}.csv").read_bytes()
    return outputs


def build_manifest(outputs: dict[Path, bytes]) -> bytes:
    tables = {name: read(name) for name in TABLES}
    states = tables["fourth-crusade-states"]
    sources = tables["source-audit"]
    roles = tables["jerusalem-roles"]
    undrawn = [s["state_id"] for s in states if s["state_kind"] not in DRAWABLE_STATES
               and not s["geometry"]]
    unplaced = [r["role_id"] for r in roles if r["role_kind"] not in DRAWABLE_ROLES]

    return canonical_json({
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE_VERSION,
        "kind": RELEASE_KIND,
        "licence": LICENCE,
        "counts": {name: len(rows) for name, rows in tables.items()},
        "stateKinds": sorted({s["state_kind"] for s in states}),
        "roleKinds": sorted({r["role_kind"] for r in roles}),
        # Recorded rather than left implicit: three states are deliberately on no
        # layer, and a future reader should find that as a decision.
        "statesWithoutGeometry": sorted(undrawn),
        # The same decision one register along: five of the six Holy Land
        # registers are claims about meaning and are on no layer at all.
        "rolesWithoutGeometry": sorted(unplaced),
        "clearedWitnesses": sum(1 for s in sources if s["production_role"] != "research_only"),
        "untranscribedFolios": sum(1 for s in sources if s["locator"] == "pending"),
        "publicRecords": sum(
            1 for s in states if s["review_state"] in PUBLIC_STATES
        ),
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
    outputs[RELEASE_DIR / "manifest.json"] = build_manifest(outputs)

    for path, payload in sorted(outputs.items()):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        print(f"  wrote {path.relative_to(REPO)} ({len(payload):,} bytes)")

    manifest = json.loads(outputs[RELEASE_DIR / "manifest.json"])
    print(f"\nCrusades {RELEASE_VERSION} ({RELEASE_KIND})")
    print(f"  records: {manifest['counts']}")
    print(f"  witnesses cleared for publication: {manifest['clearedWitnesses']}")
    print(f"  states deliberately undrawn: {', '.join(manifest['statesWithoutGeometry'])}")
    print(f"  Holy Land registers deliberately unplaced: {len(manifest['rolesWithoutGeometry'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
