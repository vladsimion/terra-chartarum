#!/usr/bin/env python3
"""Compile the KAN-302 Hanseatic vertical slice into Atlas and MDX assets."""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO / "data" / "hanseatic" / "sources"
TRACED_DIR = REPO / "data" / "hanseatic" / "traced"
GEO_DIR = REPO / "public" / "geo"
GENERATED_DIR = REPO / "src" / "data" / "hanseatic" / "generated"

PLACES_CSV = SOURCE_DIR / "places.csv"
ROUTES_CSV = SOURCE_DIR / "routes.csv"
SOURCES_CSV = SOURCE_DIR / "sources.csv"
EVIDENCE_CSV = SOURCE_DIR / "evidence.csv"
ROUTE_PATHS = TRACED_DIR / "routes-paths.geojson"

PLACES_GEOJSON = GEO_DIR / "hanseatic-places.geojson"
ROUTES_GEOJSON = GEO_DIR / "hanseatic-routes.geojson"
PLACES_JSON = GENERATED_DIR / "places.json"

PLACE_HEADER = [
    "id", "place_id", "name", "name_historic", "name_modern", "role",
    "participation_class", "valid_from", "valid_to", "region", "parent_polity",
    "certainty", "latitude", "longitude", "essay_anchor", "source", "notes",
]
ROUTE_HEADER = [
    "id", "name", "corridor_type", "from_place_id", "to_place_id", "waypoints",
    "valid_from", "valid_to", "directionality", "seasonality", "evidence_type",
    "certainty", "commodities", "source", "notes",
]
SOURCE_HEADER = [
    "key", "short_citation", "full_citation", "url", "license", "accessed", "source_type",
]
EVIDENCE_HEADER = [
    "claim_id", "feature_id", "source_key", "page_or_folio", "quote_or_note",
    "confidence", "review_status",
]

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ROLES = {"leading_city", "market"}
PARTICIPATION = {
    "documented_collective_participation",
    "commercial_association_only",
}
CORRIDOR_TYPES = {"maritime", "riverine", "overland", "mixed"}
CERTAINTIES = {"high", "medium", "low"}
REVIEW_STATUSES = {"provisional", "reviewed", "approved"}


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def year(value: str, label: str, row: int, errors: list[str]) -> int | None:
    try:
        parsed = int(value)
    except ValueError:
        errors.append(f"{label} row {row}: '{value}' is not an integer year")
        return None
    if not 1 <= parsed <= 9999:
        errors.append(f"{label} row {row}: year {parsed} is outside 1..9999")
    return parsed


def coordinate(
    value: str, label: str, row: int, minimum: float, maximum: float, errors: list[str]
) -> float | None:
    try:
        parsed = float(value)
    except ValueError:
        errors.append(f"places row {row}: {label} '{value}' is not numeric")
        return None
    if not minimum <= parsed <= maximum:
        errors.append(f"places row {row}: {label} {parsed} outside [{minimum}, {maximum}]")
    return parsed


def validate_inputs() -> list[str]:
    place_header, places = read_csv(PLACES_CSV)
    route_header, routes = read_csv(ROUTES_CSV)
    source_header, sources = read_csv(SOURCES_CSV)
    evidence_header, evidence = read_csv(EVIDENCE_CSV)
    errors: list[str] = []

    for label, actual, expected in (
        ("places", place_header, PLACE_HEADER),
        ("routes", route_header, ROUTE_HEADER),
        ("sources", source_header, SOURCE_HEADER),
        ("evidence", evidence_header, EVIDENCE_HEADER),
    ):
        if actual != expected:
            errors.append(f"{label}.csv header {actual} != {expected}")

    source_keys = {row["key"].strip() for row in sources}
    feature_ids: set[str] = set()
    place_ids: set[str] = set()
    phase_keys: set[tuple[str, int]] = set()

    for row_number, row in enumerate(places, start=2):
        for field in PLACE_HEADER:
            if not row[field].strip():
                errors.append(f"places row {row_number}: required field '{field}' is empty")
        feature_id = row["id"].strip()
        place_id = row["place_id"].strip()
        if not SLUG.fullmatch(feature_id):
            errors.append(f"places row {row_number}: id '{feature_id}' is not stable-id shaped")
        if not SLUG.fullmatch(place_id):
            errors.append(f"places row {row_number}: place_id '{place_id}' is not slug-shaped")
        if feature_id in feature_ids:
            errors.append(f"places row {row_number}: duplicate feature id '{feature_id}'")
        feature_ids.add(feature_id)
        place_ids.add(place_id)
        valid_from = year(row["valid_from"], "places", row_number, errors)
        valid_to = year(row["valid_to"], "places", row_number, errors)
        if valid_from is not None and valid_to is not None:
            if valid_from > valid_to:
                errors.append(f"places row {row_number}: valid_from exceeds valid_to")
            phase_key = (place_id, valid_from)
            if phase_key in phase_keys:
                errors.append(f"places row {row_number}: duplicate phase {phase_key}")
            phase_keys.add(phase_key)
        coordinate(row["latitude"], "latitude", row_number, -90, 90, errors)
        coordinate(row["longitude"], "longitude", row_number, -180, 180, errors)
        if row["role"] not in ROLES:
            errors.append(f"places row {row_number}: unknown role '{row['role']}'")
        if row["participation_class"] not in PARTICIPATION:
            errors.append(
                f"places row {row_number}: unknown participation_class "
                f"'{row['participation_class']}'"
            )
        if row["certainty"] not in CERTAINTIES:
            errors.append(f"places row {row_number}: unknown certainty '{row['certainty']}'")
        if row["source"] not in source_keys:
            errors.append(f"places row {row_number}: unresolved source '{row['source']}'")

    with ROUTE_PATHS.open(encoding="utf-8") as handle:
        traced = json.load(handle)
    traced_features = traced.get("features", []) if traced.get("type") == "FeatureCollection" else []
    traced_by_id = {
        str(feature.get("properties", {}).get("id", "")): feature for feature in traced_features
    }

    route_ids: set[str] = set()
    for row_number, row in enumerate(routes, start=2):
        for field in ROUTE_HEADER:
            if not row[field].strip():
                errors.append(f"routes row {row_number}: required field '{field}' is empty")
        route_id = row["id"].strip()
        if not SLUG.fullmatch(route_id):
            errors.append(f"routes row {row_number}: id '{route_id}' is not stable-id shaped")
        if route_id in route_ids:
            errors.append(f"routes row {row_number}: duplicate id '{route_id}'")
        route_ids.add(route_id)
        if row["from_place_id"] not in place_ids or row["to_place_id"] not in place_ids:
            errors.append(f"routes row {row_number}: endpoint does not resolve to places.csv")
        waypoints = row["waypoints"].split("|")
        if waypoints != [row["from_place_id"], row["to_place_id"]]:
            errors.append(f"routes row {row_number}: vertical-slice waypoints must match endpoints")
        valid_from = year(row["valid_from"], "routes", row_number, errors)
        valid_to = year(row["valid_to"], "routes", row_number, errors)
        if valid_from is not None and valid_to is not None and valid_from > valid_to:
            errors.append(f"routes row {row_number}: valid_from exceeds valid_to")
        if row["corridor_type"] not in CORRIDOR_TYPES:
            errors.append(f"routes row {row_number}: unknown corridor_type '{row['corridor_type']}'")
        if row["certainty"] not in CERTAINTIES:
            errors.append(f"routes row {row_number}: unknown certainty '{row['certainty']}'")
        if row["source"] not in source_keys:
            errors.append(f"routes row {row_number}: unresolved source '{row['source']}'")
        feature = traced_by_id.get(route_id)
        if not feature or feature.get("geometry", {}).get("type") != "LineString":
            errors.append(f"routes row {row_number}: missing LineString trace for '{route_id}'")
        feature_ids.add(route_id)

    if set(traced_by_id) != route_ids:
        errors.append("routes-paths.geojson ids do not exactly match routes.csv")

    claim_ids: set[str] = set()
    for row_number, row in enumerate(evidence, start=2):
        for field in EVIDENCE_HEADER:
            if not row[field].strip():
                errors.append(f"evidence row {row_number}: required field '{field}' is empty")
        if row["claim_id"] in claim_ids:
            errors.append(f"evidence row {row_number}: duplicate claim_id '{row['claim_id']}'")
        claim_ids.add(row["claim_id"])
        if row["feature_id"] not in feature_ids:
            errors.append(f"evidence row {row_number}: unresolved feature '{row['feature_id']}'")
        if row["source_key"] not in source_keys:
            errors.append(f"evidence row {row_number}: unresolved source '{row['source_key']}'")
        if row["confidence"] not in CERTAINTIES:
            errors.append(f"evidence row {row_number}: unknown confidence '{row['confidence']}'")
        if row["review_status"] not in REVIEW_STATUSES:
            errors.append(f"evidence row {row_number}: unknown review_status '{row['review_status']}'")

    if len(places) != 2 or len(routes) != 1 or len(evidence) != 1:
        errors.append("KAN-302 contract expects exactly 2 place phases, 1 corridor and 1 evidence row")
    return errors


def place_properties(row: dict[str, str]) -> dict[str, object]:
    return {
        **{key: row[key] for key in PLACE_HEADER if key not in {"latitude", "longitude"}},
        "valid_from": int(row["valid_from"]),
        "valid_to": int(row["valid_to"]),
        "coordinates": [float(row["longitude"]), float(row["latitude"])],
    }


def route_properties(row: dict[str, str]) -> dict[str, object]:
    return {
        **{key: row[key] for key in ROUTE_HEADER},
        "route_id": row["id"],
        "valid_from": int(row["valid_from"]),
        "valid_to": int(row["valid_to"]),
    }


def build_outputs() -> dict[Path, str]:
    _, places = read_csv(PLACES_CSV)
    _, routes = read_csv(ROUTES_CSV)
    with ROUTE_PATHS.open(encoding="utf-8") as handle:
        traced = json.load(handle)
    traced_by_id = {
        feature["properties"]["id"]: feature for feature in traced["features"]
    }

    compiled_places = [place_properties(row) for row in places]
    place_features = [
        {
            "type": "Feature",
            "properties": properties,
            "geometry": {"type": "Point", "coordinates": properties["coordinates"]},
        }
        for properties in compiled_places
    ]
    route_features = []
    for row in routes:
        trace = traced_by_id[row["id"]]
        route_features.append(
            {
                "type": "Feature",
                "properties": route_properties(row),
                "geometry": trace["geometry"],
            }
        )

    return {
        PLACES_GEOJSON: json_text({"type": "FeatureCollection", "features": place_features}),
        ROUTES_GEOJSON: json_text({"type": "FeatureCollection", "features": route_features}),
        PLACES_JSON: json_text(compiled_places),
    }


def main() -> int:
    errors = validate_inputs()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    for path, content in build_outputs().items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
