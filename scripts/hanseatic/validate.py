#!/usr/bin/env python3
"""Validate the KAN-302 Hanseatic sources and committed generated assets."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import REPO, build_outputs, validate_inputs  # noqa: E402


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
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data.get("type") == "FeatureCollection":
            for feature in data["features"]:
                properties = feature.get("properties", {})
                if not properties.get("id") or not properties.get("source"):
                    errors.append(f"{path.name}: feature lacks stable id or source")
                if int(properties["valid_from"]) > int(properties["valid_to"]):
                    errors.append(f"{path.name}: feature has invalid temporal span")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Hanseatic vertical-slice QA: sources, joins, evidence and outputs are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
