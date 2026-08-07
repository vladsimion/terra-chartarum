# Terra Chartarum - auxiliary build targets.
#
# The site itself is built with npm (see package.json). This Makefile hosts the
# out-of-band data pipelines that are not part of the Astro build - currently the
# Venetian Maritime Network (VMN) GIS dataset compilation (KAN-145).

.PHONY: vmn vmn-venv vmn-validate hanseatic hanseatic-validate hanseatic-test

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

# KAN-302 HSE vertical slice. This compiler intentionally uses only the Python
# standard library; the later FGB publication ticket may adopt the VMN venv.
hanseatic:
	python3 scripts/hanseatic/build.py

hanseatic-validate:
	python3 scripts/hanseatic/validate.py

# KAN-303 promotion-rule tests. pytest is the only test-time dependency and is
# not vendored; install it once with `python3 -m pip install pytest` (or use a
# venv). Also runs in CI, which installs it itself.
hanseatic-test:
	python3 -m pytest scripts/hanseatic -q
