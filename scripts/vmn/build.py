#!/usr/bin/env python3
"""VMN dataset build pipeline.

Compiles the Venetian Maritime Network authority-table CSVs into the
cloud-native FlatGeobuf assets the atlas renders (spec §6 / data-dictionary §5).

Implemented so far:
  * ports  (VMN-9)  — data/vmn/ports.csv -> public/geo/venetian-ports.fgb (Point)

Still stubbed (land with their own tickets):
  * routes       (VMN-13) — venetian-routes.fgb (LineString)
  * possessions  (VMN-19) — venetian-possessions.fgb (MultiPolygon)

The writer is GDAL's FlatGeobuf driver via ``pyogrio`` (no GeoPandas/PROJ needed);
GDAL emits the packed-Hilbert spatial index automatically. Run inside the project
venv, which carries pyogrio:  ``.venv/bin/python scripts/vmn/build.py``.
"""

from __future__ import annotations

import csv
import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "data" / "vmn"
GEO_OUT = REPO / "public" / "geo"

PORTS_CSV = DATA_DIR / "ports.csv"
SOURCES_CSV = DATA_DIR / "sources.csv"
PORTS_FGB = GEO_OUT / "venetian-ports.fgb"

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

EXPECTED_HEADER = [
    "port_id", "name_historic", "name_modern", "lat", "lon", "status",
    "start_date", "end_date", "polity_id", "source_keys", "pleiades_id", "notes",
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


def validate(header: list[str], rows: list[dict[str, str]], source_keys: set[str]) -> list[str]:
    errors: list[str] = []
    if header != EXPECTED_HEADER:
        errors.append(f"header mismatch: {header} != {EXPECTED_HEADER}")
        return errors  # field-level checks are meaningless if the shape is wrong

    seen: set[tuple[str, str]] = set()
    for i, r in enumerate(rows, start=2):  # +2: 1-based, past the header line
        pid = r["port_id"].strip()
        for req in ("port_id", "name_historic", "lat", "lon", "status", "start_date"):
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

        keys = [k for k in r["source_keys"].strip().split(";") if k]
        if not keys:
            errors.append(f"row {i}: unsourced phase (empty source_keys)")
        for k in keys:
            if k not in source_keys:
                errors.append(f"row {i}: source key '{k}' not in sources.csv")

        dkey = (pid, r["start_date"].strip())
        if dkey in seen:
            errors.append(f"row {i}: duplicate (port_id, start_date) {dkey}")
        seen.add(dkey)

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

    errors = validate(header, rows, source_keys)
    if errors:
        print(f"VMN ports: {len(errors)} validation error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    geometry = np.empty(len(rows), dtype=object)
    port_id, name, name_modern, status, polity_id = [], [], [], [], []
    valid_from, valid_to, provenance, pleiades, notes = [], [], [], [], []

    for idx, r in enumerate(rows):
        geometry[idx] = wkb_point(float(r["lon"]), float(r["lat"]))
        port_id.append(r["port_id"].strip())
        name.append(r["name_historic"].strip())
        name_modern.append(r["name_modern"].strip())
        status.append(r["status"].strip())
        polity_id.append(r["polity_id"].strip())
        valid_from.append(int(r["start_date"][:4]))
        valid_to.append(int(r["end_date"][:4]) if r["end_date"].strip() else OPEN_ENDED)
        provenance.append(r["source_keys"].strip())
        pleiades.append(r["pleiades_id"].strip())
        notes.append(r["notes"].strip())

    fields = [
        "port_id", "name", "name_modern", "status", "polity_id",
        "valid_from", "valid_to", "source_keys", "pleiades_id", "notes",
    ]
    field_data = [
        np.array(port_id, dtype=object),
        np.array(name, dtype=object),
        np.array(name_modern, dtype=object),
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


def main() -> int:
    print("VMN pipeline")
    print(f"  data dir : {DATA_DIR}")
    if not PORTS_CSV.exists():
        print(f"  ports    : MISSING ({PORTS_CSV})", file=sys.stderr)
        return 1
    rc = build_ports()
    print("  routes / possessions : deferred to VMN-13 / VMN-19.")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
