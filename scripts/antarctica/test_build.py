#!/usr/bin/env python3
"""Build rules for the Antarctic pilot slice (KAN-423).

Two properties are worth a test. The build must be deterministic, because the
release manifest hashes its own outputs and a moving byte would make that
manifest describe nothing. And the Atlas asset and the essay asset must come
from one projection, because the moment they are compiled separately one of them
starts authoring facts.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


def atlas_features(outputs) -> list[dict]:
    """Both Atlas assets, read back as one list. The split is a rendering
    constraint, so no test should have to care which half a record landed in."""
    features: list[dict] = []
    for layer in build.ATLAS_LAYERS:
        payload = json.loads(outputs[build.GEO_DIR / f"{layer}.geojson"])
        features.extend(payload["features"])
    return features


def test_the_family_partitions_the_mappable_records():
    """Four layers, and every mappable record in exactly one of them."""
    outputs = build.build_outputs()
    seen: dict[str, int] = {}
    for layer in build.ATLAS_LAYERS:
        payload = json.loads(outputs[build.GEO_DIR / f"{layer}.geojson"])
        for feature in payload["features"]:
            key = feature["properties"]["id"]
            seen[key] = seen.get(key, 0) + 1
    assert seen, "no record reached any layer"
    assert all(count == 1 for count in seen.values())
    mappable = {r["id"] for r in build.project() if r["geometry"] is not None}
    assert set(seen) == mappable


def test_the_ghost_layer_is_empty_on_purpose():
    outputs = build.build_outputs()
    ghosts = json.loads(outputs[build.GEO_DIR / f"{build.LAYER_GHOSTS}.geojson"])
    assert ghosts["features"] == []
    # There are ghost records; none of them has a located position.
    assert any(r["kind"] == "ghost" for r in build.project())


def test_build_is_deterministic():
    first = build.build_outputs()
    second = build.build_outputs()
    assert list(first) == list(second)
    for path in first:
        assert first[path] == second[path], f"{path} is not byte-stable"


def test_manifest_hashes_its_own_outputs():
    outputs = build.build_outputs()
    manifest = json.loads(build.build_manifest(outputs, build.project()))
    for path, payload in outputs.items():
        key = str(path.relative_to(build.REPO))
        assert manifest["outputs"][key]["bytes"] == len(payload)
        assert manifest["outputs"][key]["sha256"] == build.sha256_bytes(payload)


def test_atlas_and_essay_read_the_same_records():
    """The proof the ticket asks for, asserted rather than described."""
    records = build.project()
    outputs = build.build_outputs()
    geojson = atlas_features(outputs)
    pilot = json.loads(outputs[build.GENERATED_DIR / "pilot.json"])

    essay_ids = {record["id"] for record in pilot["records"]}
    atlas_ids = {feature["properties"]["id"] for feature in geojson}
    assert essay_ids == {record["id"] for record in records}
    # The Atlas holds the mappable subset, never a record the essay does not have.
    assert atlas_ids <= essay_ids
    assert atlas_ids == {record["id"] for record in records if record["geometry"] is not None}

    # And where both hold a record, they hold the same evidence claim about it.
    by_id = {record["id"]: record for record in pilot["records"]}
    for feature in geojson:
        properties = feature["properties"]
        mirror = by_id[properties["id"]]
        for field in ("evidenceClass", "geometryProvenance", "confidence", "reviewState", "act"):
            assert properties[field] == mirror[field]


def test_a_record_without_geometry_is_absent_rather_than_placed():
    """The southern region Coronelli does not depict must not acquire a point."""
    features = atlas_features(build.build_outputs())
    ids = {feature["properties"]["id"] for feature in features}
    assert "ant-ftr-coronelli-southern-region" not in ids
    for feature in features:
        assert feature["geometry"] is not None


def test_the_public_tier_is_empty():
    manifest = json.loads(build.build_manifest(build.build_outputs(), build.project()))
    assert manifest["publicRecords"] == 0
    assert manifest["objectsClearedForReproduction"] == 0
