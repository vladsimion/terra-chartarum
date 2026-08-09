# Terra Chartarum - auxiliary build targets.
#
# The site itself is built with npm (see package.json). This Makefile hosts the
# out-of-band data pipelines that are not part of the Astro build - currently the
# Venetian Maritime Network (VMN) GIS dataset compilation (KAN-145).

.PHONY: vmn vmn-venv vmn-validate hanseatic hanseatic-validate hanseatic-test dacia-validate dacia-test

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

# HSE compile (KAN-302, FGB output added by KAN-307). The build now writes
# public/geo/hanseatic-places.fgb, so it needs pyogrio/numpy from the VMN venv -
# the adoption that the KAN-302 comment here anticipated. Everything else in
# scripts/hanseatic stays standard-library only, so `hanseatic-validate` and
# `hanseatic-test` still run on a bare python3.
hanseatic:
	$(VMN_PY) scripts/hanseatic/build.py

hanseatic-validate:
	python3 scripts/hanseatic/validate.py

# KAN-303 promotion-rule tests. pytest is the only test-time dependency and is
# not vendored; install it once with `python3 -m pip install pytest` (or use a
# venv). Also runs in CI, which installs it itself.
hanseatic-test:
	python3 -m pytest scripts/hanseatic -q

# Dacia programme QA (KAN-329..333). Validates the Corpus Chartarum Daciae
# reference tables, the CND place/source/attestation corpus and the frozen
# Trench A pilot. Standard-library only, so it runs on a bare python3; there is
# no compile step yet, so there is nothing to build first.
dacia-validate:
	python3 scripts/dacia/validate.py

# KAN-332 schema-rule tests. pytest is the only test-time dependency and is not
# vendored; use the venv from `make vmn-venv` or install it yourself.
dacia-test:
	python3 -m pytest scripts/dacia -q
