#!/usr/bin/env python3
"""VMN dataset build pipeline.

Compiles the Venetian Maritime Network authority-table CSVs into the
cloud-native FlatGeobuf assets the atlas renders (spec §6 / data-dictionary §5).

Implemented:
  * ports  (VMN-9)  - data/vmn/ports.csv -> public/geo/venetian-ports.fgb (Point)
  * routes       (VMN-13) - venetian-routes.fgb (LineString)
  * possessions  (VMN-19) - venetian-possessions.fgb (MultiPolygon)

The writer is GDAL's FlatGeobuf driver via ``pyogrio``; Shapely clips generalized
possession traces to Natural Earth land. GDAL emits the packed-Hilbert spatial
index automatically. Run inside the project venv:
``.venv/bin/python scripts/vmn/build.py``.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "data" / "vmn"
GEO_OUT = REPO / "public" / "geo"

PORTS_CSV = DATA_DIR / "ports.csv"
PORT_CONTRACT = DATA_DIR / "port-contract.json"
WAYPOINTS_CSV = DATA_DIR / "waypoints.csv"
ROUTES_CSV = DATA_DIR / "routes.csv"
ROUTE_PATHS_GEOJSON = DATA_DIR / "routes-paths.geojson"
EVENTS_CSV = DATA_DIR / "events.csv"
POSSESSIONS_GEOJSON = DATA_DIR / "possessions-extents.geojson"
SOURCES_CSV = DATA_DIR / "sources.csv"
BASE_DATA_DIR = DATA_DIR / "base"
BASE_DATA_MANIFEST = BASE_DATA_DIR / "manifest.json"
LAND_GEOJSON = BASE_DATA_DIR / "ne_10m_land.geojson"
COASTLINE_GEOJSON = BASE_DATA_DIR / "ne_10m_coastline.geojson"
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


def verify_base_data() -> list[str]:
    """Lock the clipping base to the versioned Natural Earth manifest (VMN-4)."""
    if not BASE_DATA_MANIFEST.exists():
        return [f"missing base-data manifest: {BASE_DATA_MANIFEST.relative_to(REPO)}"]
    with BASE_DATA_MANIFEST.open(encoding="utf-8") as f:
        manifest = json.load(f)

    errors: list[str] = []
    files = manifest.get("files", {})
    for path in (LAND_GEOJSON, COASTLINE_GEOJSON):
        entry = files.get(path.name)
        if not path.exists():
            errors.append(f"missing pinned base data: {path.relative_to(REPO)}")
            continue
        if not entry or not entry.get("sha256"):
            errors.append(f"missing checksum in base-data manifest: {path.name}")
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            errors.append(
                f"checksum mismatch for {path.name}: expected {entry['sha256']}, got {actual}"
            )
    return errors


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


# A locator is a printed page (`p436`, `p162-164`, roman `pxvi`) or a named
# division for front matter that carries no printed folio - Lane's Chronology is
# the only such case in the anchor editions, so naming it beats inventing a page.
NAMED_LOCATORS = frozenset({"chronology", "appendix-a"})
PAGE_REF_RE = re.compile(r"p(?:[0-9]+(?:-[0-9]+)?|[ivxlc]+(?:-[ivxlc]+)?)")


def valid_locator(locator: str) -> bool:
    return locator in NAMED_LOCATORS or bool(PAGE_REF_RE.fullmatch(locator))


def validate_source_keys(
    raw: str, *, row: int, source_keys: set[str], errors: list[str]
) -> None:
    """A key is `KEY` or `KEY:<locator>` (KAN-154 page-level citation)."""
    keys = [k for k in raw.strip().split(";") if k]
    if not keys:
        errors.append(f"row {row}: unsourced phase (empty source_keys)")
    for key in keys:
        base, _, locator = key.partition(":")
        if base not in source_keys:
            errors.append(f"row {row}: source key '{base}' not in sources.csv")
        if locator and not valid_locator(locator):
            errors.append(f"row {row}: malformed source locator '{key}'")


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

    errors.extend(validate_port_contract(rows))
    return errors


def validate_port_contract(rows: list[dict[str, str]]) -> list[str]:
    """Validate ticket-level gazetteer expectations against the authority table.

    The contract makes region/status/polity/phasing acceptance criteria executable
    without teaching the compiler historical exceptions.
    """
    with PORT_CONTRACT.open(encoding="utf-8") as f:
        contract = json.load(f)
    if contract.get("schemaVersion") != 1:
        return ["port-contract.json: unsupported schemaVersion"]

    errors: list[str] = []
    by_id: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        by_id.setdefault(row["port_id"].strip(), []).append(row)

    global_contract = contract.get("global", {})
    unique_ports = len(by_id)
    statuses = {row["status"].strip() for row in rows}
    for field, actual in (
        ("minPhaseRows", len(rows)),
        ("minUniquePorts", unique_ports),
        # Every stable port_id is a maritime node in this gazetteer; the separate
        # waypoint table holds capes/offshore navigation anchors.
        ("minMaritimeNodes", unique_ports),
    ):
        minimum = int(global_contract.get(field, 0))
        if actual < minimum:
            errors.append(f"port contract: {field} expected >= {minimum}, found {actual}")
    missing_statuses = sorted(
        set(global_contract.get("requiredStatuses", [])) - statuses
    )
    if missing_statuses:
        errors.append(
            "port contract: missing required status coverage "
            + ", ".join(missing_statuses)
        )

    for group in contract.get("groups", []):
        label = f"{group.get('ticket', 'contract')} {group.get('name', '')}".strip()
        required_ids = group.get("requiredIds", [])
        constraints = group.get("constraints", {})
        for port_id in required_ids:
            if port_id not in by_id:
                errors.append(f"{label}: required port_id '{port_id}' missing")
        actual_group_ids = {port_id for port_id in required_ids if port_id in by_id}
        minimum_group_ports = int(group.get("minimumUniquePorts", 0))
        if len(actual_group_ids) < minimum_group_ports:
            errors.append(
                f"{label}: expected >= {minimum_group_ports} unique ports, "
                f"found {len(actual_group_ids)}"
            )
        group_statuses = {
            row["status"].strip()
            for port_id in actual_group_ids
            for row in by_id[port_id]
        }
        missing_group_statuses = sorted(
            set(group.get("requiredStatuses", [])) - group_statuses
        )
        if missing_group_statuses:
            errors.append(
                f"{label}: missing status coverage " + ", ".join(missing_group_statuses)
            )
        for port_id, count in group.get("exactPhaseCounts", {}).items():
            actual_count = len(by_id.get(port_id, []))
            if actual_count != int(count):
                errors.append(
                    f"{label}: '{port_id}' has {actual_count} phases, expected {count}"
                )
        for port_id in group.get("disjointIds", []):
            phases = sorted(
                by_id.get(port_id, []), key=lambda row: row["start_date"]
            )
            for earlier, later in zip(phases, phases[1:]):
                earlier_end = earlier["end_date"].strip()
                if earlier_end and later["start_date"].strip() < earlier_end:
                    errors.append(
                        f"{label}: '{port_id}' phases overlap at "
                        f"{later['start_date']} < {earlier_end}"
                    )
        for port_id, expected_phases in constraints.items():
            actual_phases = by_id.get(port_id, [])
            if group.get("exactPhaseCount") and len(actual_phases) != len(expected_phases):
                errors.append(
                    f"{label}: '{port_id}' has {len(actual_phases)} phases, "
                    f"expected {len(expected_phases)}"
                )
            for expected in expected_phases:
                notes_contains = str(expected.get("notes_contains", "")).lower()
                fields = {
                    key: str(value)
                    for key, value in expected.items()
                    if key != "notes_contains"
                }
                matches = [
                    row
                    for row in actual_phases
                    if all(row.get(key, "").strip() == value for key, value in fields.items())
                    and (
                        not notes_contains
                        or notes_contains in row.get("notes", "").lower()
                    )
                ]
                if not matches:
                    description = ", ".join(f"{key}={value}" for key, value in fields.items())
                    if notes_contains:
                        description += f", notes~={notes_contains}"
                    errors.append(f"{label}: '{port_id}' missing phase ({description})")
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
    from shapely.geometry import shape

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

    with ROUTE_PATHS_GEOJSON.open(encoding="utf-8") as f:
        path_data = json.load(f)
    paths = {}
    route_rows = {row["route_id"].strip(): row for row in rows}
    for index, feature in enumerate(path_data.get("features", []), start=1):
        properties = feature.get("properties") or {}
        route_id_value = str(properties.get("route_id") or "").strip()
        if not route_id_value:
            errors.append(f"route path feature {index}: missing route_id")
            continue
        if route_id_value in paths:
            errors.append(f"route path feature {index}: duplicate route_id '{route_id_value}'")
            continue
        if route_id_value not in route_rows:
            errors.append(f"route path feature {index}: unknown route_id '{route_id_value}'")
            continue
        path_geometry = shape(feature.get("geometry"))
        if path_geometry.geom_type != "LineString" or not path_geometry.is_valid:
            errors.append(
                f"route path feature {index}: '{route_id_value}' must be a valid LineString"
            )
            continue
        expected_refs = route_rows[route_id_value]["waypoints"].strip()
        if properties.get("waypoints") != expected_refs:
            errors.append(
                f"route path feature {index}: '{route_id_value}' waypoints do not match routes.csv"
            )
        paths[route_id_value] = path_geometry

    missing_paths = sorted(set(route_rows) - set(paths))
    if missing_paths:
        errors.append(f"route paths missing route_id(s): {', '.join(missing_paths)}")
    if errors:
        print(f"VMN routes: {len(errors)} validation error(s):", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    geometry = np.empty(len(rows), dtype=object)
    route_id, name, route_type, waypoints, commodities = [], [], [], [], []
    valid_from, valid_to, provenance, notes = [], [], [], []
    for idx, r in enumerate(rows):
        geometry[idx] = paths[r["route_id"].strip()].wkb
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

    traced = {}
    trace_errors = []
    for feature in traced_data["features"]:
        properties = feature.get("properties", {})
        key = (
            str(properties.get("territory", "")).strip(),
            str(properties.get("start_date", "")).strip(),
        )
        if not all(key):
            trace_errors.append(f"extent feature must carry territory and start_date: {key}")
            continue
        if key in traced:
            trace_errors.append(f"duplicate possession extent for {key}")
        traced[key] = shape(feature["geometry"])
    land = unary_union([shape(feature["geometry"]) for feature in land_data["features"]])
    header, rows = read_csv(EVENTS_CSV)
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}
    errors = trace_errors + validate_events(
        header,
        rows,
        {territory for territory, _ in traced},
        source_keys,
    )
    event_keys = {
        (row["territory"].strip(), row["start_date"].strip()) for row in rows
    }
    if set(traced) != event_keys:
        missing = sorted(event_keys - set(traced))
        extra = sorted(set(traced) - event_keys)
        if missing:
            errors.append(f"possession extents missing event phases: {missing}")
        if extra:
            errors.append(f"possession extents have unknown phases: {extra}")

    clipped = []
    for i, r in enumerate(rows, start=2):
        key = (r["territory"].strip(), r["start_date"].strip())
        if key not in traced:
            clipped.append(None)
            continue
        geometry = as_multipolygon(traced[key].intersection(land))
        clipped.append(geometry)
        if geometry is None:
            errors.append(f"row {i}: territory phase {key} is empty after coastline clip")

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
        PORTS_CSV, PORT_CONTRACT, WAYPOINTS_CSV, ROUTES_CSV, ROUTE_PATHS_GEOJSON, EVENTS_CSV,
        POSSESSIONS_GEOJSON, SOURCES_CSV, BASE_DATA_MANIFEST, LAND_GEOJSON,
        COASTLINE_GEOJSON,
    ]
    missing = [path for path in required if not path.exists()]
    if missing:
        for path in missing:
            print(f"  missing  : {path}", file=sys.stderr)
        return 1
    base_errors = verify_base_data()
    if base_errors:
        for error in base_errors:
            print(f"  base data: {error}", file=sys.stderr)
        return 1
    for builder in (build_ports, build_routes, build_possessions):
        if builder() != 0:
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
