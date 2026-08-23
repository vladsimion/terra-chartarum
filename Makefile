# Terra Chartarum - auxiliary build targets.
#
# The site itself is built with npm (see package.json). This Makefile hosts the
# out-of-band data pipelines that are not part of the Astro build - currently the
# Venetian Maritime Network (VMN) GIS dataset compilation (KAN-145).

.PHONY: vmn vmn-venv vmn-validate hanseatic hanseatic-validate hanseatic-test crusades-validate crusades-test dacia dacia-validate dacia-test antarctica antarctica-validate antarctica-test

VMN_VENV := .venv
VMN_PY := $(VMN_VENV)/bin/python

# One-time toolchain bootstrap. pyogrio ships a manylinux/macos wheel that
# bundles GDAL, so the FlatGeobuf writer needs no system GDAL/PROJ install
# (geopandas/pyproj are intentionally *not* required - they fail to build on
# Python 3.14). Re-run only when the venv is missing.
vmn-venv:
	python3 -m venv $(VMN_VENV)
	$(VMN_PY) -m pip install --quiet --upgrade pip
	$(VMN_PY) -m pip install --quiet pyogrio numpy shapely pyarrow

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

# CND 0.1 compile (KAN-337). Writes the research release under
# data/dacia/release/cnd-0.1 and the two Atlas tiers into public/geo. Needs
# pyarrow from the venv for the Parquet twins; everything else in scripts/dacia
# stays standard-library only, so validate and test still run on a bare python3.
# Deliberately timestamp-free: identical inputs must produce identical bytes.
dacia:
	$(VMN_PY) scripts/dacia/build.py

# Dacia programme QA (KAN-329..337). Validates the reference tables, the CND
# corpus, the frozen Trench A pilot and the compiled release against the hashes
# the manifest recorded, which is what catches a table edited but never rebuilt.
dacia-validate:
	python3 scripts/dacia/validate.py

# KAN-332 schema-rule tests. pytest is the only test-time dependency and is not
# vendored; use the venv from `make vmn-venv` or install it yourself.
dacia-test:
	python3 -m pytest scripts/dacia -q

# KAN-384 Crusades flagship source and rights audit. Standard-library only, like
# the other audits; pytest is the single test-time dependency.
crusades-validate:
	python3 scripts/crusades/validate.py

crusades-test:
	python3 -m pytest scripts/crusades -q

# KAN-423 Antarctic pilot compile. Standard-library only - the pilot emits
# GeoJSON rather than FlatGeobuf, so it needs no venv and no GDAL. Deliberately
# timestamp-free: identical inputs must produce identical bytes, because the
# release manifest hashes its own outputs and the validator checks them back.
antarctica:
	python3 scripts/antarctica/build.py

# KAN-420..423 Antarctic QA: the source and rights audit, the claim ledger, the
# Coronelli package, the pilot tables and the compiled release against the
# hashes the manifest recorded.
antarctica-validate:
	python3 scripts/antarctica/validate.py

antarctica-test:
	python3 -m pytest scripts/antarctica -q
