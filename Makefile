# Terra Chartarum - auxiliary build targets.
#
# The site itself is built with npm (see package.json). This Makefile hosts the
# out-of-band data pipelines that are not part of the Astro build - currently the
# Venetian Maritime Network (VMN) GIS dataset compilation (KAN-145).

.PHONY: vmn vmn-venv vmn-validate

VMN_VENV := .venv
VMN_PY := $(VMN_VENV)/bin/python

# One-time toolchain bootstrap. pyogrio ships a manylinux/macos wheel that
# bundles GDAL, so the FlatGeobuf writer needs no system GDAL/PROJ install
# (geopandas/pyproj are intentionally *not* required - they fail to build on
# Python 3.14). Re-run only when the venv is missing.
vmn-venv:
	python3 -m venv $(VMN_VENV)
	$(VMN_PY) -m pip install --quiet --upgrade pip
	$(VMN_PY) -m pip install --quiet pyogrio numpy shapely

# VMN dataset build. Verifies the pinned Natural Earth 1:10m land/coastline
# checksums, then compiles data/vmn sources -> public/geo/venetian-*.fgb
# (ports live, VMN-9; routes/possessions land with VMN-13 / VMN-19). Requires
# the venv from `make vmn-venv`.
vmn:
	$(VMN_PY) scripts/vmn/build.py

# VMN QA gate (VMN-21). Validates the compiled public/geo/venetian-*.fgb
# artifacts against the dataset spec §8 (schema/geometry/time/provenance; the
# referential & coastline families activate as routes/possessions land). Run
# after `make vmn`; also runs in CI. Requires the venv from `make vmn-venv`.
vmn-validate:
	$(VMN_PY) scripts/vmn/validate.py
