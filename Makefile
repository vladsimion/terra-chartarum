# Terra Chartarum — auxiliary build targets.
#
# The site itself is built with npm (see package.json). This Makefile hosts the
# out-of-band data pipelines that are not part of the Astro build — currently the
# Venetian Maritime Network (VMN) GIS dataset compilation (KAN-145).

.PHONY: vmn

# VMN dataset build. A no-op stub today (KAN-145); the real CSV -> FlatGeobuf
# pipeline lands with the D4 build tickets.
vmn:
	python3 scripts/vmn/build.py
