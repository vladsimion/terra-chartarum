#!/usr/bin/env python3
"""Tests for the CND 0.1 compile (KAN-337).

Two properties matter. The build is deterministic, so the only thing that can
move a content hash is the data. And the public tier holds only what a person
has cleared, so an unreviewed row cannot reach a normal public asset by being
compiled.

Needs pyarrow for the Parquet twins; run with `make dacia-test` after
`make vmn-venv`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

pytest.importorskip("pyarrow", reason="Parquet output needs pyarrow from the venv")

import build  # noqa: E402


def test_rebuild_is_byte_identical():
    """Identical inputs, identical bytes - no timestamps, no set ordering."""
    first = build.build_outputs()
    second = build.build_outputs()
    assert first.keys() == second.keys()
    for path in first:
        assert first[path] == second[path], f"{path.name} is not reproducible"


def test_manifest_hashes_match_the_outputs():
    outputs = build.build_outputs()
    manifest = json.loads(build.build_manifest(outputs))
    for name, entry in manifest["outputs"].items():
        payload = outputs[build.REPO / name]
        assert entry["sha256"] == build.sha256_bytes(payload)
        assert entry["bytes"] == len(payload)


def test_manifest_records_every_input():
    manifest = json.loads(build.build_manifest(build.build_outputs()))
    for table in build.TABLES:
        assert f"data/dacia/{table}.csv" in manifest["inputs"]


def test_public_tier_carries_only_reviewed_records():
    outputs = build.build_outputs()
    public = json.loads(outputs[build.GEO_DIR / "dacia-attestations.geojson"])
    for feature in public["features"]:
        assert feature["properties"]["review_state"] in build.PUBLIC_STATES


def test_research_tier_declares_that_it_is_unreviewed():
    outputs = build.build_outputs()
    research = json.loads(outputs[build.GEO_DIR / "dacia-attestations-research.geojson"])
    assert research["_cnd"]["tier"] == "research"
    assert "not passed human review" in research["_cnd"]["note"]


def test_research_tier_holds_more_than_the_public_one():
    """Until review happens this is the whole point: the corpus exists, uncleared."""
    outputs = build.build_outputs()
    public = json.loads(outputs[build.GEO_DIR / "dacia-attestations.geojson"])
    research = json.loads(outputs[build.GEO_DIR / "dacia-attestations-research.geojson"])
    assert len(research["features"]) > len(public["features"])


def test_release_is_versioned_as_a_pilot():
    manifest = json.loads(build.build_manifest(build.build_outputs()))
    assert manifest["release"] == "cnd-0.1"
    assert manifest["kind"] == "pilot_research_release"
    assert manifest["licence"]


def test_unlocated_places_are_reported_not_positioned():
    """Vicina has no coordinates, so it contributes no feature and is named instead."""
    outputs = build.build_outputs()
    manifest = json.loads(build.build_manifest(outputs))
    assert "plc-vicina" in manifest["unlocatedPlaces"]
    research = json.loads(outputs[build.GEO_DIR / "dacia-attestations-research.geojson"])
    assert all(f["properties"]["place_id"] != "plc-vicina" for f in research["features"])


def test_attestations_stay_visible_once_their_source_has_spoken():
    """The slider reveals *through* a year; an attestation does not expire."""
    outputs = build.build_outputs()
    research = json.loads(outputs[build.GEO_DIR / "dacia-attestations-research.geojson"])
    assert research["features"], "expected the research tier to hold features"
    for feature in research["features"]:
        properties = feature["properties"]
        assert properties["valid_to"] == build.OPEN_ENDED
        assert properties["valid_from"] <= properties["source_year_from"]


def test_every_feature_carries_its_review_state_and_provenance():
    outputs = build.build_outputs()
    research = json.loads(outputs[build.GEO_DIR / "dacia-attestations-research.geojson"])
    for feature in research["features"]:
        properties = feature["properties"]
        for field in ("review_state", "confidence", "attestation_class", "geometry_provenance"):
            assert properties[field], f"{feature['id']} is missing {field}"


def test_parquet_mirrors_the_csv_row_count():
    import io

    import pyarrow.parquet

    outputs = build.build_outputs()
    for table in build.TABLES:
        csv_rows = len(
            outputs[build.RELEASE_DIR / f"{table}.csv"].decode("utf-8").strip().splitlines()
        ) - 1
        parquet = pyarrow.parquet.read_table(
            io.BytesIO(outputs[build.RELEASE_DIR / f"{table}.parquet"])
        )
        assert parquet.num_rows == csv_rows, f"{table}: parquet and csv disagree"


def test_borroczyn_package_reports_the_rights_hold():
    package = build.borroczyn_package()
    assert package["status"] == "blocked_pending_witness"
    assert package["publicReady"] is False
    assert {layer["role"] for layer in package["layers"]} == {
        "historical_source", "georeferenced_derived", "modern_reference"
    }
    assert package["urbanAuthority"]["recordCount"] == 0


def test_in_manibus_emits_no_object_without_inspection():
    package = build.in_manibus_package()
    assert package["status"] == "pending_physical_inspection"
    assert package["publicReady"] is False
    assert package["counts"] == {
        "inspections": 0,
        "reviewedInspections": 0,
        "objects": 0,
        "evidence": 0,
    }
