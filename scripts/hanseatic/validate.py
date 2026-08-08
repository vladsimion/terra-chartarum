#!/usr/bin/env python3
"""Validate the KAN-302 Hanseatic sources and committed generated assets."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import (  # noqa: E402
    MANIFEST_JSON,
    PLACES_FGB,
    REPO,
    SCHEMA_VERSION,
    SOURCE_FILES,
    build_outputs,
    readiness_lines,
    sha256_bytes,
    validate_inputs,
)


def check_manifest(errors: list[str]) -> None:
    """Verify the release manifest against what is actually on disk (KAN-309).

    Stdlib only, deliberately: the manifest records the hash of every input, so
    a stale output tree is detectable without GDAL re-reading the FlatGeobuf.
    That keeps the CI gate light while still catching a source edit that was
    never compiled.
    """
    if not MANIFEST_JSON.exists():
        errors.append(
            f"missing release manifest: {MANIFEST_JSON.relative_to(REPO)}; "
            "run npm run hanseatic:build"
        )
        return
    manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))

    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(
            f"manifest schemaVersion {manifest.get('schemaVersion')} != {SCHEMA_VERSION}"
        )

    recorded_inputs = manifest.get("inputs", {})
    for path in SOURCE_FILES:
        name = str(path.relative_to(REPO))
        actual = sha256_bytes(path.read_bytes())
        if name not in recorded_inputs:
            errors.append(f"manifest does not record input {name}")
        elif recorded_inputs[name] != actual:
            errors.append(
                f"source {name} changed since the last build; run npm run hanseatic:build"
            )
    for name in recorded_inputs:
        if name not in {str(p.relative_to(REPO)) for p in SOURCE_FILES}:
            errors.append(f"manifest records an input that no longer exists: {name}")

    for name, entry in manifest.get("outputs", {}).items():
        path = REPO / name
        if not path.exists():
            errors.append(f"manifest records a missing output: {name}")
            continue
        payload = path.read_bytes()
        if sha256_bytes(payload) != entry.get("sha256"):
            errors.append(f"output {name} does not match its manifest hash")
        if len(payload) != entry.get("bytes"):
            errors.append(f"output {name} does not match its manifest byte length")

    if str(PLACES_FGB.relative_to(REPO)) not in manifest.get("outputs", {}):
        errors.append("manifest does not record the FlatGeobuf places asset")


def main() -> int:
    errors = validate_inputs()
    expected = build_outputs() if not errors else {}
    for path, content in expected.items():
        if not path.exists():
            errors.append(f"missing generated asset: {path.relative_to(REPO)}")
        elif path.read_text(encoding="utf-8") != content:
            errors.append(
                f"stale generated asset: {path.relative_to(REPO)}; run npm run hanseatic:build"
            )

    for path in expected:
        if path.suffix not in {".json", ".geojson"}:
            continue
        if not path.exists():
            continue  # already reported above; avoid turning a QA error into a traceback
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data.get("type") == "FeatureCollection":
            for feature in data["features"]:
                properties = feature.get("properties", {})
                if not properties.get("id") or not properties.get("source"):
                    errors.append(f"{path.name}: feature lacks stable id or source")
                if int(properties["valid_from"]) > int(properties["valid_to"]):
                    errors.append(f"{path.name}: feature has invalid temporal span")

    if not errors:
        check_manifest(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Hanseatic QA: sources, joins, evidence, corpus, manifest and outputs are valid.")
    for line in readiness_lines():
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
