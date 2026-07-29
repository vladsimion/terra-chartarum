#!/usr/bin/env python3
"""VMN dataset QA gate (VMN-21).

Validates the compiled FlatGeobuf artifacts against the dataset spec §8 so a
malformed layer can't merge green. Run in CI (see .github/workflows/ci.yml) and
locally via ``make vmn-validate`` (needs the pyogrio venv from ``make vmn-venv``).

Spec §8 check families:
  * Schema        — required fields present, enums valid, ids unique & slug-shaped
  * Geometry      — valid, correct type per file, EPSG:4326, bbox within window
  * Time          — valid_from <= valid_to; phases non-overlapping where required
  * Referential   — routes' waypoints resolve to a port whose lifespan overlaps
  * Coastline     — possessions stay on land; route interiors stay at sea
  * Provenance    — every feature's source_keys resolve in sources.csv

This validates the *derived* artifacts, complementing the CSV-level validation in
build.py. Route references are checked against port lifespans and time-neutral
waypoints; their ordered anchors must occur on the path and the path must not
cross 1:10m land outside short harbour-approach circles. Possessions are checked
against Natural Earth land with an approximate one-kilometre WGS84 tolerance.

Ports may carry temporally overlapping phases by design (decision D2: Venice is
`metropole` + `capital` at once), so the non-overlap rule is scoped to layers
that declare ``phases_disjoint`` (possessions), not ports.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Reuse the build pipeline's single-source-of-truth constants so the gate can
# never drift from what the compiler writes.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import (  # noqa: E402
    LAND_GEOJSON,
    OPEN_ENDED,
    PORTS_CSV,
    POSSESSION_STATUS_VOCAB,
    ROUTE_TYPE_VOCAB,
    SOURCES_CSV,
    STATUS_VOCAB,
    WAYPOINTS_CSV,
    read_csv,
    validate_port_contract,
)

REPO = Path(__file__).resolve().parents[2]
GEO_OUT = REPO / "public" / "geo"

# Sanity envelope for every VMN feature: the Mediterranean, Black Sea and the
# Atlantic approach (Aigues-Mortes, Flanders, London). A bbox outside this window
# means swapped lat/lon, a null-island 0,0, or a projection mistake.
LON_MIN, LON_MAX = -10.0, 42.0
LAT_MIN, LAT_MAX = 28.0, 54.0

SLUG = re.compile(r"^[a-z0-9_]+$")

# Natural Earth 1:10m does not resolve every lagoon mouth or narrow harbour
# channel. Exempt only the final 0.05° (roughly 4–5 km in this region) around
# declared route anchors; every other metre of each path must remain off land.
ROUTE_ANCHOR_TOLERANCE = 0.05


class Layer:
    """Per-file §8 contract. Extended for routes/possessions with VMN-13/19."""

    def __init__(
        self,
        name: str,
        fgb: str,
        geometry_type: str,
        required_fields: list[str],
        id_field: str,
        *,
        vocab_field: str | None = None,
        vocab: frozenset[str] | None = None,
        phases_disjoint_field: str | None = None,
        coastline_clip: bool = False,
        waypoint_field: str | None = None,
    ) -> None:
        self.name = name
        self.path = GEO_OUT / fgb
        self.geometry_type = geometry_type
        self.required_fields = required_fields
        self.id_field = id_field
        self.vocab_field = vocab_field
        self.vocab = vocab
        self.phases_disjoint_field = phases_disjoint_field
        self.coastline_clip = coastline_clip
        self.waypoint_field = waypoint_field


LAYERS = [
    Layer(
        "ports",
        "venetian-ports.fgb",
        "Point",
        [
            "port_id", "name", "name_local", "region", "status", "valid_from",
            "valid_to", "source_keys",
        ],
        "port_id",
        vocab_field="status",
        vocab=STATUS_VOCAB,
        # D2: a port may hold two statuses at once — phases are NOT disjoint.
    ),
    Layer(
        "routes",
        "venetian-routes.fgb",
        "LineString",
        ["route_id", "name", "route_type", "valid_from", "valid_to", "source_keys"],
        "route_id",
        vocab_field="route_type",
        vocab=ROUTE_TYPE_VOCAB,
        waypoint_field="waypoints",
    ),
    Layer(
        "possessions",
        "venetian-possessions.fgb",
        "MultiPolygon",
        [
            "possession_id", "territory", "name", "status", "valid_from", "valid_to",
            "source_keys",
        ],
        "possession_id",
        vocab_field="status",
        vocab=POSSESSION_STATUS_VOCAB,
        phases_disjoint_field="territory",
        coastline_clip=True,
    ),
]


def read_fgb(path: Path):
    """Return (info, fields_dict, geometry_array) for a FlatGeobuf file."""
    import pyogrio
    from pyogrio.raw import read

    info = pyogrio.read_info(str(path))
    result = read(str(path))
    meta, geometry, field_data = result[0], result[-2], result[-1]
    fields = {name: field_data[i] for i, name in enumerate(meta["fields"])}
    return info, fields, geometry


def check_schema(layer: Layer, info, fields, errors: list[str]) -> None:
    present = set(fields)
    for f in layer.required_fields:
        if f not in present:
            errors.append(f"{layer.name}: required field '{f}' missing from FGB")

    ids = fields.get(layer.id_field)
    if ids is not None:
        for i, v in enumerate(ids):
            s = str(v)
            if not SLUG.match(s):
                errors.append(f"{layer.name} row {i}: id '{s}' is not slug-shaped")

    if layer.vocab_field and layer.vocab and layer.vocab_field in fields:
        for i, value in enumerate(fields[layer.vocab_field]):
            if str(value) not in layer.vocab:
                errors.append(
                    f"{layer.name} row {i}: {layer.vocab_field} '{value}' "
                    "not in controlled vocab"
                )

    # Uniqueness of (id, valid_from) — the derived form of the (id, start_date) key.
    if ids is not None and "valid_from" in fields:
        seen: set[tuple[str, int]] = set()
        for i in range(len(ids)):
            key = (str(ids[i]), int(fields["valid_from"][i]))
            if key in seen:
                errors.append(f"{layer.name} row {i}: duplicate (id, valid_from) {key}")
            seen.add(key)


def check_geometry(layer: Layer, info, geometry, errors: list[str]) -> None:
    gtype = info.get("geometry_type")
    if gtype != layer.geometry_type:
        errors.append(f"{layer.name}: geometry_type {gtype!r} != {layer.geometry_type!r}")

    crs = str(info.get("crs") or "")
    if "4326" not in crs:
        errors.append(f"{layer.name}: CRS {crs!r} is not EPSG:4326")

    if info.get("features", 0) <= 0:
        errors.append(f"{layer.name}: no features")

    for i, g in enumerate(geometry):
        if g is None or len(g) == 0:
            errors.append(f"{layer.name} row {i}: null/empty geometry")

    bounds = info.get("total_bounds")
    if bounds is not None:
        minx, miny, maxx, maxy = bounds
        if not (LON_MIN <= minx and maxx <= LON_MAX and LAT_MIN <= miny and maxy <= LAT_MAX):
            errors.append(
                f"{layer.name}: bbox {tuple(round(b, 3) for b in bounds)} outside window "
                f"lon[{LON_MIN},{LON_MAX}] lat[{LAT_MIN},{LAT_MAX}]"
            )


def check_time(layer: Layer, fields, errors: list[str]) -> None:
    if "valid_from" not in fields or "valid_to" not in fields:
        return
    vf, vt = fields["valid_from"], fields["valid_to"]
    for i in range(len(vf)):
        if int(vf[i]) > int(vt[i]):
            errors.append(f"{layer.name} row {i}: valid_from {vf[i]} > valid_to {vt[i]}")

    if layer.phases_disjoint_field and layer.phases_disjoint_field in fields:
        ids = fields[layer.phases_disjoint_field]
        phases: dict[str, list[tuple[int, int]]] = {}
        for i in range(len(ids)):
            phases.setdefault(str(ids[i]), []).append((int(vf[i]), int(vt[i])))
        for pid, spans in phases.items():
            spans.sort()
            for (a_from, a_to), (b_from, b_to) in zip(spans, spans[1:]):
                if b_from < a_to:  # touching at a boundary year is allowed
                    errors.append(
                        f"{layer.name} '{pid}': overlapping phases "
                        f"[{a_from},{a_to}] and [{b_from},{b_to}]"
                    )


def check_provenance(layer: Layer, fields, source_keys: set[str], errors: list[str]) -> None:
    if "source_keys" not in fields:
        return
    for i, raw in enumerate(fields["source_keys"]):
        keys = [k for k in str(raw).strip().split(";") if k]
        if not keys:
            errors.append(f"{layer.name} row {i}: unsourced feature (empty source_keys)")
        for k in keys:
            if k not in source_keys:
                errors.append(f"{layer.name} row {i}: source key '{k}' not in sources.csv")


def check_route_references(fields, geometry, errors: list[str]) -> None:
    import json

    from shapely import from_wkb
    from shapely.geometry import Point, shape
    from shapely.ops import unary_union

    port_path = GEO_OUT / "venetian-ports.fgb"
    if not port_path.exists() or "waypoints" not in fields:
        return
    _, port_fields, _ = read_fgb(port_path)
    _, port_rows = read_csv(PORTS_CSV)
    _, waypoint_rows = read_csv(WAYPOINTS_CSV)
    waypoint_ids = {row["waypoint_id"].strip() for row in waypoint_rows}
    coordinates: dict[str, tuple[float, float]] = {}
    for row in port_rows:
        coordinates.setdefault(
            row["port_id"].strip(), (float(row["lon"]), float(row["lat"]))
        )
    for row in waypoint_rows:
        coordinates.setdefault(
            row["waypoint_id"].strip(), (float(row["lon"]), float(row["lat"]))
        )

    with LAND_GEOJSON.open(encoding="utf-8") as f:
        land_data = json.load(f)
    land = unary_union([shape(feature["geometry"]) for feature in land_data["features"]])

    port_spans: dict[str, list[tuple[int, int]]] = {}
    for i, port_id in enumerate(port_fields["port_id"]):
        port_spans.setdefault(str(port_id), []).append(
            (int(port_fields["valid_from"][i]), int(port_fields["valid_to"][i]))
        )

    for i, raw in enumerate(fields["waypoints"]):
        route_id = str(fields["route_id"][i])
        route_from = int(fields["valid_from"][i])
        route_to = int(fields["valid_to"][i])
        refs = str(raw).split("|")
        for ref in refs:
            if ref in waypoint_ids:
                continue
            spans = port_spans.get(ref)
            if not spans:
                errors.append(f"routes row {i}: waypoint '{ref}' does not resolve")
                continue
            if not any(port_from <= route_to and port_to >= route_from for port_from, port_to in spans):
                errors.append(
                    f"routes row {i}: port '{ref}' has no lifespan overlapping "
                    f"[{route_from},{route_to}]"
                )

        path = from_wkb(geometry[i])
        anchors = []
        positions = []
        for ref in refs:
            coordinate = coordinates.get(ref)
            if coordinate is None:
                continue
            anchor = Point(coordinate)
            anchors.append(anchor)
            if path.distance(anchor) > 1e-8:
                errors.append(f"route '{route_id}': path does not visit waypoint '{ref}'")
            positions.append(path.project(anchor))
        if positions != sorted(positions):
            errors.append(f"route '{route_id}': path visits waypoints out of order")

        approach_zones = unary_union(
            [anchor.buffer(ROUTE_ANCHOR_TOLERANCE) for anchor in anchors]
        )
        crossing = path.difference(approach_zones).intersection(land)
        if crossing.length > 1e-8:
            errors.append(
                f"route '{route_id}': path crosses 1:10m land outside harbour "
                f"approaches ({crossing.length:.6f}°)"
            )


def check_coastline(geometry, errors: list[str]) -> None:
    import json

    from shapely import from_wkb
    from shapely.geometry import shape
    from shapely.ops import unary_union

    with LAND_GEOJSON.open(encoding="utf-8") as f:
        land_data = json.load(f)
    land = unary_union([shape(feature["geometry"]) for feature in land_data["features"]])
    tolerance = land.buffer(0.01)  # approximately 1 km at Mediterranean latitudes
    for i, raw in enumerate(geometry):
        feature = from_wkb(raw)
        if not feature.is_valid:
            errors.append(f"possessions row {i}: invalid geometry")
        if not feature.difference(tolerance).is_empty:
            errors.append(f"possessions row {i}: geometry extends beyond coastline tolerance")


def check_port_projection(port_rows, errors: list[str]) -> None:
    """Require the published ports bundle to be an exact authority-row projection."""
    port_path = GEO_OUT / "venetian-ports.fgb"
    if not port_path.exists():
        return
    info, fields, _ = read_fgb(port_path)
    if int(info.get("features", 0)) != len(port_rows):
        errors.append(
            f"ports: FGB has {info.get('features', 0)} features for "
            f"{len(port_rows)} authority rows"
        )
    expected = {
        (row["port_id"].strip(), int(row["start_date"][:4]))
        for row in port_rows
    }
    actual = {
        (str(fields["port_id"][index]), int(fields["valid_from"][index]))
        for index in range(len(fields.get("port_id", [])))
    }
    if actual != expected:
        errors.append("ports: FGB (port_id, valid_from) keys differ from ports.csv")


def validate_layer(layer: Layer, source_keys: set[str], errors: list[str]) -> str:
    if not layer.path.exists():
        return "pending (asset not built)"

    info, fields, geometry = read_fgb(layer.path)
    check_schema(layer, info, fields, errors)
    check_geometry(layer, info, geometry, errors)
    check_time(layer, fields, errors)
    check_provenance(layer, fields, source_keys, errors)
    if layer.waypoint_field:
        check_route_references(fields, geometry, errors)
    if layer.coastline_clip:
        check_coastline(geometry, errors)
    return f"{info['features']} features checked"


def main() -> int:
    print("VMN QA gate (spec §8)")
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}
    _, port_rows = read_csv(PORTS_CSV)

    errors: list[str] = validate_port_contract(port_rows)
    check_port_projection(port_rows, errors)
    for layer in LAYERS:
        status = validate_layer(layer, source_keys, errors)
        print(f"  {layer.name:12s}: {status}")

    if errors:
        print(f"\nVMN QA gate: {len(errors)} error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print("\nVMN QA gate: all checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
