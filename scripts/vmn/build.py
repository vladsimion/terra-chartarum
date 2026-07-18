#!/usr/bin/env python3
"""VMN dataset build pipeline (KAN-145 scaffolding stub).

Per the "Venetian Maritime Network, c.1400" spec (§6), the real pipeline will:
load the CSVs -> geocode / join geometry -> expand phased events -> clip
possessions to Natural Earth land -> validate (§8) -> write FlatGeobuf via
pyogrio, with deterministic (byte-identical) output for identical inputs.

This is the scaffolding stub only. The compile path (CSV -> FGB) lands with the
D4 pipeline tickets (VMN-9 ports, VMN-13 routes, VMN-19 possessions), and the
QA gate with VMN-21. It intentionally uses the standard library alone so
`make vmn` runs green before the GeoPandas/Shapely/pyogrio toolchain is added.
"""

from __future__ import annotations

from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "vmn"


def main() -> int:
    sources = DATA_DIR / "sources.csv"
    print("VMN pipeline (scaffolding stub) — nothing to build yet.")
    print(f"  data dir : {DATA_DIR}")
    print(f"  sources  : {'present' if sources.exists() else 'MISSING'}")
    print("  pipeline : deferred to the D4 build tickets (VMN-9 / VMN-13 / VMN-19).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
