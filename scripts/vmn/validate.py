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
  * Coastline     — possessions subseteq Natural Earth land (+1 km buffer)
  * Provenance    — every feature's source_keys resolve in sources.csv

This validates the *derived* artifacts, complementing the CSV-level validation in
build.py. Only layers whose ``.fgb`` is on disk are checked; routes/possessions
land with VMN-13 / VMN-19, at which point this gate covers them automatically.
The referential and coastline families need the routes/possessions data to test
against, so they are implemented alongside those tickets (flagged PENDING here).

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
from build import OPEN_ENDED, SOURCES_CSV, STATUS_VOCAB, read_csv  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
GEO_OUT = REPO / "public" / "geo"

# Sanity envelope for every VMN feature: the Mediterranean, Black Sea and the
# Atlantic approach (Aigues-Mortes, Flanders, London). A bbox outside this window
# means swapped lat/lon, a null-island 0,0, or a projection mistake.
LON_MIN, LON_MAX = -10.0, 42.0
LAT_MIN, LAT_MAX = 28.0, 54.0

SLUG = re.compile(r"^[a-z0-9_]+$")


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
        status_field: str | None = None,
        phases_disjoint: bool = False,
        coastline_clip: bool = False,
        waypoint_field: str | None = None,
    ) -> None:
        self.name = name
        self.path = GEO_OUT / fgb
        self.geometry_type = geometry_type
        self.required_fields = required_fields
        self.id_field = id_field
        self.status_field = status_field
        self.phases_disjoint = phases_disjoint
        self.coastline_clip = coastline_clip
        self.waypoint_field = waypoint_field


LAYERS = [
    Layer(
        "ports",
        "venetian-ports.fgb",
        "Point",
        ["port_id", "name", "status", "valid_from", "valid_to", "source_keys"],
        "port_id",
        status_field="status",
        # D2: a port may hold two statuses at once — phases are NOT disjoint.
    ),
    Layer(
        "routes",
        "venetian-routes.fgb",
        "LineString",
        ["route_id", "name", "route_type", "valid_from", "valid_to", "source_keys"],
        "route_id",
        waypoint_field="waypoints",  # referential check lands with VMN-13
    ),
    Layer(
        "possessions",
        "venetian-possessions.fgb",
        "MultiPolygon",
        ["possession_id", "name", "valid_from", "valid_to", "source_keys"],
        "possession_id",
        phases_disjoint=True,  # possessions can't overlap themselves in time
        coastline_clip=True,  # coastline check lands with VMN-19
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

    if layer.status_field and layer.status_field in fields:
        for i, v in enumerate(fields[layer.status_field]):
            if str(v) not in STATUS_VOCAB:
                errors.append(f"{layer.name} row {i}: status '{v}' not in controlled vocab")

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

    if layer.phases_disjoint and layer.id_field in fields:
        ids = fields[layer.id_field]
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


def validate_layer(layer: Layer, source_keys: set[str], errors: list[str]) -> str:
    if not layer.path.exists():
        return "pending (asset not built)"

    info, fields, geometry = read_fgb(layer.path)
    check_schema(layer, info, fields, errors)
    check_geometry(layer, info, geometry, errors)
    check_time(layer, fields, errors)
    check_provenance(layer, fields, source_keys, errors)

    pending = []
    if layer.waypoint_field:
        pending.append("referential (VMN-13)")
    if layer.coastline_clip:
        pending.append("coastline (VMN-19)")
    suffix = f"; deferred: {', '.join(pending)}" if pending else ""
    return f"{info['features']} features checked{suffix}"


def main() -> int:
    print("VMN QA gate (spec §8)")
    _, source_rows = read_csv(SOURCES_CSV)
    source_keys = {r["key"].strip() for r in source_rows}

    errors: list[str] = []
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
