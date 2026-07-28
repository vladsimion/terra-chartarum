#!/usr/bin/env python3
"""VMN dataset build pipeline.

Compiles the Venetian Maritime Network authority-table CSVs into the
cloud-native FlatGeobuf assets the atlas renders (spec §6 / data-dictionary §5).

Implemented:
  * ports  (VMN-9)  — data/vmn/ports.csv -> public/geo/venetian-ports.fgb (Point)
  * routes       (VMN-13) — venetian-routes.fgb (LineString)
  * possessions  (VMN-19) — venetian-possessions.fgb (MultiPolygon)

The writer is GDAL's FlatGeobuf driver via ``pyogrio``; Shapely clips generalized
possession traces to Natural Earth land. GDAL emits the packed-Hilbert spatial
index automatically. Run inside the project venv:
``.venv/bin/python scripts/vmn/build.py``.
"""

from __future__ import annotations

import csv
import json
import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "data" / "vmn"
GEO_OUT = REPO / "public" / "geo"

PORTS_CSV = DATA_DIR / "ports.csv"
WAYPOINTS_CSV = DATA_DIR / "waypoints.csv"
ROUTES_CSV = DATA_DIR / "routes.csv"
EVENTS_CSV = DATA_DIR / "events.csv"
POSSESSIONS_GEOJSON = DATA_DIR / "possessions.geojson"
SOURCES_CSV = DATA_DIR / "sources.csv"
LAND_GEOJSON = REPO / "public" / "geo" / "ne_110m_land.geojson"
PORTS_FGB = GEO_OUT / "venetian-ports.fgb"
ROUTES_FGB = GEO_OUT / "venetian-routes.fgb"
POSSESSIONS_FGB = GEO_OUT / "venetian-possessions.fgb"

# Open-ended lifespan sentinel in the derived FGB (data-dictionary D4/D6). ISO
# empty `end_date` in the authority table projects to this integer here.
OPEN_ENDED = 9999

# Controlled `status` vocabulary, data-dictionary §5.2. Kept in lockstep with the
# renderer graduation ramp in src/lib/geo.ts.
STATUS_VOCAB = frozenset(
    {
        # sovereignty
        "metropole", "capital", "subject", "colony", "protectorate", "feudatory",
        "independent",
        # tenure / quarter
        "commercial_quarter", "metropolitan_quarter", "rival_genoese",
        "foreign_port", "trading_post", "crusader_port", "leased",
        # navigational / other
        "staging", "contested", "lost",
    }
)
ROUTE_TYPE_VOCAB = frozenset({"muda", "private"})
POSSESSION_STATUS_VOCAB = frozenset(
    {"direct_rule", "protectorate", "condominium", "contested"}
)

PORTS_HEADER = [
    "port_id", "name_historic", "name_modern", "name_local", "region", "lat", "lon",
    "status", "start_date", "end_date", "polity_id", "source_keys", "pleiades_id",
    "notes",
]
ROUTES_HEADER = [
    "route_id", "name", "route_type", "waypoints", "commodities", "start_date",
    "end_date", "source_keys", "notes",
]
EVENTS_HEADER = [
    "territory", "name", "status", "start_date", "end_date", "source_keys", "notes",
]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


def iso_year(value: str, *, field: str, row: int, errors: list[str]) -> int | None:
    """Project an ISO ``YYYY-MM-DD`` date to its integer year. Empty is allowed
    only for ``end_date`` (handled by the caller); a malformed value is an error."""
    value = value.strip()
    if not value:
        return None
    parts = value.split("-")
    if len(parts) != 3 or not parts[0].isdigit() or len(parts[0]) != 4:
        errors.append(f"row {row}: {field} '{value}' is not ISO YYYY-MM-DD")
        return None
    return int(parts[0])


def validate_source_keys(
    raw: str, *, row: int, source_keys: set[str], errors: list[str]
) -> None:
    keys = [k for k in raw.strip().split(";") if k]
    if not keys:
        errors.append(f"row {row}: unsourced phase (empty source_keys)")
    for key in keys:
        if key not in source_keys:
            errors.append(f"row {row}: source key '{key}' not in sources.csv")


def validate_ports(
    header: list[str], rows: list[dict[str, str]], source_keys: set[str]
) -> list[str]:
    errors: list[str] = []
    if header != PORTS_HEADER:
        errors.append(f"header mismatch: {header} != {PORTS_HEADER}")
        return errors  # field-level checks are meaningless if the shape is wrong

    seen: set[tuple[str, str]] = set()
    for i, r in enumerate(rows, start=2):  # +2: 1-based, past the header line
        pid = r["port_id"].strip()
        for req in (
            "port_id", "name_historic", "name_local", "region", "lat", "lon",
            "status", "start_date",
        ):
            if not r[req].strip():
                errors.append(f"row {i}: required field '{req}' is empty")

        if r["status"].strip() and r["status"].strip() not in STATUS_VOCAB:
            errors.append(f"row {i}: status '{r['status']}' not in controlled vocab")

        for coord, lo, hi in (("lat", -90.0, 90.0), ("lon", -180.0, 180.0)):
            raw = r[coord].strip()
            if raw:
                try:
                    v = float(raw)
                    if not (lo <= v <= hi):
                        errors.append(f"row {i}: {coord} {v} out of range [{lo}, {hi}]")
                except ValueError:
                    errors.append(f"row {i}: {coord} '{raw}' is not a number")

        vf = iso_year(r["start_date"], field="start_date", row=i, errors=errors)
        if r["end_date"].strip():
            vt = iso_year(r["end_date"], field="end_date", row=i, errors=errors)
            if vf is not None and vt is not None and vt < vf:
                errors.append(f"row {i}: end_date year {vt} precedes start_date year {vf}")

        validate_source_keys(r["source_keys"], row=i, source_keys=source_keys, errors=errors)

        dkey = (pid, r["start_date"].strip())
        if dkey in seen:
            errors.append(f"row {i}: duplicate (port_id, start_date) {dkey}")
        seen.add(dkey)

    return errors


def validate_routes(
    header: list[str],
    rows: list[dict[str, str]],
    known_places: set[str],
    source_keys: set[str],
) -> list[str]:
    errors: list[str] = []
    if header != ROUTES_HEADER:
        return [f"header mismatch: {header} != {ROUTES_HEADER}"]

    seen: set[str] = set()
    for i, r in enumerate(rows, start=2):
        for req in (
            "route_id", "name", "route_type", "waypoints", "start_date", "end_date",
        ):
            if not r[req].strip():
                errors.append(f"row {i}: required field '{req}' is empty")
        route_id = r["route_id"].strip()
        if route_id in seen:
            errors.append(f"row {i}: duplicate route_id '{route_id}'")
        seen.add(route_id)
        if r["route_type"].strip() not in ROUTE_TYPE_VOCAB:
            errors.append(f"row {i}: route_type '{r['route_type']}' not in controlled vocab")

        start = iso_year(r["start_date"], field="start_date", row=i, errors=errors)
        end = iso_year(r["end_date"], field="end_date", row=i, errors=errors)
        if start is not None and end is not None and end < start:
            errors.append(f"row {i}: end_date year {end} precedes start_date year {start}")

        refs = [ref for ref in r["waypoints"].split("|") if ref]
        if len(refs) < 2:
            errors.append(f"row {i}: route needs at least two waypoints")
        for ref in refs:
            if ref not in known_places:
                errors.append(f"row {i}: waypoint '{ref}' does not resolve")
        validate_source_keys(r["source_keys"], row=i, source_keys=source_keys, errors=errors)
    return errors


def validate_events(
    header: list[str],
    rows: list[dict[str, str]],
    traced_territories: set[str],
    source_keys: set[str],
) -> list[str]:
    errors: list[str] = []
    if header != EVENTS_HEADER:
        return [f"header mismatch: {header} != {EVENTS_HEADER}"]

    seen: set[tuple[str, str]] = set()
    for i, r in enumerate(rows, start=2):
        for req in ("territory", "name", "status", "start_date", "end_date"):
            if not r[req].strip():
                errors.append(f"row {i}: required field '{req}' is empty")
        territory = r["territory"].strip()
        if territory not in traced_territories:
            errors.append(f"row {i}: territory '{territory}' has no traced geometry")
        if r["status"].strip() not in POSSESSION_STATUS_VOCAB:
            errors.append(f"row {i}: status '{r['status']}' not in controlled vocab")

        start = iso_year(r["start_date"], field="start_date", row=i, errors=errors)
        end = iso_year(r["end_date"], field="end_date", row=i, errors=errors)
        if start is not None and end is not None and end < start:
            errors.append(f"row {i}: end_date year {end} precedes start_date year {start}")

        key = (territory, r["start_date"].strip())
        if key in seen:
            errors.append(f"row {i}: duplicate (territory, start_date) {key}")
        seen.add(key)
        validate_source_keys(r["source_keys"], row=i, source_keys=source_keys, errors=errors)
    return errors


def wkb_point(lon: float, lat: float) -> bytes:
    """Little-endian WKB Point (byte order 1, geom type 1, x=lon, y=lat)."""
    return struct.pack("<BIdd", 1, 1, lon, lat)


def build_ports() -> int:
    import numpy as np
    from pyogrio.raw import write

    header, rows = read_csv(PORTS_CSV)
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}

    errors = validate_ports(header, rows, source_keys)
    if errors:
        print(f"VMN ports: {len(errors)} validation error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    geometry = np.empty(len(rows), dtype=object)
    port_id, name, name_modern, name_local, region, status, polity_id = (
        [], [], [], [], [], [], [],
    )
    valid_from, valid_to, provenance, pleiades, notes = [], [], [], [], []

    for idx, r in enumerate(rows):
        geometry[idx] = wkb_point(float(r["lon"]), float(r["lat"]))
        port_id.append(r["port_id"].strip())
        name.append(r["name_historic"].strip())
        name_modern.append(r["name_modern"].strip())
        name_local.append(r["name_local"].strip())
        region.append(r["region"].strip())
        status.append(r["status"].strip())
        polity_id.append(r["polity_id"].strip())
        valid_from.append(int(r["start_date"][:4]))
        valid_to.append(int(r["end_date"][:4]) if r["end_date"].strip() else OPEN_ENDED)
        provenance.append(r["source_keys"].strip())
        pleiades.append(r["pleiades_id"].strip())
        notes.append(r["notes"].strip())

    fields = [
        "port_id", "name", "name_modern", "name_local", "region", "status", "polity_id",
        "valid_from", "valid_to", "source_keys", "pleiades_id", "notes",
    ]
    field_data = [
        np.array(port_id, dtype=object),
        np.array(name, dtype=object),
        np.array(name_modern, dtype=object),
        np.array(name_local, dtype=object),
        np.array(region, dtype=object),
        np.array(status, dtype=object),
        np.array(polity_id, dtype=object),
        np.array(valid_from, dtype="int32"),
        np.array(valid_to, dtype="int32"),
        np.array(provenance, dtype=object),
        np.array(pleiades, dtype=object),
        np.array(notes, dtype=object),
    ]

    GEO_OUT.mkdir(parents=True, exist_ok=True)
    PORTS_FGB.unlink(missing_ok=True)
    write(
        str(PORTS_FGB),
        geometry=geometry,
        field_data=field_data,
        fields=fields,
        driver="FlatGeobuf",
        geometry_type="Point",
        crs="EPSG:4326",
        layer="venetian-ports",
    )
    print(f"VMN ports: wrote {len(rows)} Point features -> {PORTS_FGB.relative_to(REPO)}")
    return 0


def build_routes() -> int:
    import numpy as np
    from pyogrio.raw import write
    from shapely.geometry import LineString

    _, port_rows = read_csv(PORTS_CSV)
    _, waypoint_rows = read_csv(WAYPOINTS_CSV)
    header, rows = read_csv(ROUTES_CSV)
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}

    coords: dict[str, tuple[float, float]] = {}
    for r in port_rows:
        coords[r["port_id"].strip()] = (float(r["lon"]), float(r["lat"]))
    for r in waypoint_rows:
        coords.setdefault(
            r["waypoint_id"].strip(), (float(r["lon"]), float(r["lat"]))
        )

    errors = validate_routes(header, rows, set(coords), source_keys)
    if errors:
        print(f"VMN routes: {len(errors)} validation error(s):", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    geometry = np.empty(len(rows), dtype=object)
    route_id, name, route_type, waypoints, commodities = [], [], [], [], []
    valid_from, valid_to, provenance, notes = [], [], [], []
    for idx, r in enumerate(rows):
        refs = r["waypoints"].strip().split("|")
        geometry[idx] = LineString([coords[ref] for ref in refs]).wkb
        route_id.append(r["route_id"].strip())
        name.append(r["name"].strip())
        route_type.append(r["route_type"].strip())
        waypoints.append(r["waypoints"].strip())
        commodities.append(r["commodities"].strip())
        valid_from.append(int(r["start_date"][:4]))
        valid_to.append(int(r["end_date"][:4]))
        provenance.append(r["source_keys"].strip())
        notes.append(r["notes"].strip())

    fields = [
        "route_id", "name", "route_type", "waypoints", "commodities", "valid_from",
        "valid_to", "source_keys", "notes",
    ]
    field_data = [
        np.array(route_id, dtype=object),
        np.array(name, dtype=object),
        np.array(route_type, dtype=object),
        np.array(waypoints, dtype=object),
        np.array(commodities, dtype=object),
        np.array(valid_from, dtype="int32"),
        np.array(valid_to, dtype="int32"),
        np.array(provenance, dtype=object),
        np.array(notes, dtype=object),
    ]

    ROUTES_FGB.unlink(missing_ok=True)
    write(
        str(ROUTES_FGB),
        geometry=geometry,
        field_data=field_data,
        fields=fields,
        driver="FlatGeobuf",
        geometry_type="LineString",
        crs="EPSG:4326",
        layer="venetian-routes",
    )
    print(f"VMN routes: wrote {len(rows)} LineString features -> {ROUTES_FGB.relative_to(REPO)}")
    return 0


def as_multipolygon(geometry):
    from shapely.geometry import MultiPolygon
    from shapely.ops import unary_union

    if geometry.is_empty:
        return None
    if geometry.geom_type == "Polygon":
        return MultiPolygon([geometry])
    if geometry.geom_type == "MultiPolygon":
        return geometry
    polygons = []
    for part in getattr(geometry, "geoms", []):
        if part.geom_type == "Polygon":
            polygons.append(part)
        elif part.geom_type == "MultiPolygon":
            polygons.extend(part.geoms)
    if not polygons:
        return None
    merged = unary_union(polygons)
    return MultiPolygon([merged]) if merged.geom_type == "Polygon" else merged


def build_possessions() -> int:
    import numpy as np
    from pyogrio.raw import write
    from shapely.geometry import shape
    from shapely.ops import unary_union

    with POSSESSIONS_GEOJSON.open(encoding="utf-8") as f:
        traced_data = json.load(f)
    with LAND_GEOJSON.open(encoding="utf-8") as f:
        land_data = json.load(f)

    traced = {
        feature["properties"]["territory"]: shape(feature["geometry"])
        for feature in traced_data["features"]
    }
    land = unary_union([shape(feature["geometry"]) for feature in land_data["features"]])
    header, rows = read_csv(EVENTS_CSV)
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}
    errors = validate_events(header, rows, set(traced), source_keys)

    clipped = []
    for i, r in enumerate(rows, start=2):
        territory = r["territory"].strip()
        if territory not in traced:
            clipped.append(None)
            continue
        geometry = as_multipolygon(traced[territory].intersection(land))
        clipped.append(geometry)
        if geometry is None:
            errors.append(f"row {i}: territory '{territory}' is empty after coastline clip")

    if errors:
        print(f"VMN possessions: {len(errors)} validation error(s):", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    geometry = np.empty(len(rows), dtype=object)
    possession_id, territory, name, status = [], [], [], []
    valid_from, valid_to, provenance, notes = [], [], [], []
    for idx, (r, clipped_geometry) in enumerate(zip(rows, clipped)):
        start_year = int(r["start_date"][:4])
        geometry[idx] = clipped_geometry.wkb
        possession_id.append(f"{r['territory'].strip()}_{start_year}")
        territory.append(r["territory"].strip())
        name.append(r["name"].strip())
        status.append(r["status"].strip())
        valid_from.append(start_year)
        valid_to.append(int(r["end_date"][:4]))
        provenance.append(r["source_keys"].strip())
        notes.append(r["notes"].strip())

    fields = [
        "possession_id", "territory", "name", "status", "valid_from", "valid_to",
        "source_keys", "notes",
    ]
    field_data = [
        np.array(possession_id, dtype=object),
        np.array(territory, dtype=object),
        np.array(name, dtype=object),
        np.array(status, dtype=object),
        np.array(valid_from, dtype="int32"),
        np.array(valid_to, dtype="int32"),
        np.array(provenance, dtype=object),
        np.array(notes, dtype=object),
    ]

    POSSESSIONS_FGB.unlink(missing_ok=True)
    write(
        str(POSSESSIONS_FGB),
        geometry=geometry,
        field_data=field_data,
        fields=fields,
        driver="FlatGeobuf",
        geometry_type="MultiPolygon",
        crs="EPSG:4326",
        layer="venetian-possessions",
    )
    print(
        f"VMN possessions: wrote {len(rows)} MultiPolygon features -> "
        f"{POSSESSIONS_FGB.relative_to(REPO)}"
    )
    return 0


def main() -> int:
    print("VMN pipeline")
    print(f"  data dir : {DATA_DIR}")
    required = [
        PORTS_CSV, WAYPOINTS_CSV, ROUTES_CSV, EVENTS_CSV, POSSESSIONS_GEOJSON,
        SOURCES_CSV, LAND_GEOJSON,
    ]
    missing = [path for path in required if not path.exists()]
    if missing:
        for path in missing:
            print(f"  missing  : {path}", file=sys.stderr)
        return 1
    for builder in (build_ports, build_routes, build_possessions):
        if builder() != 0:
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
