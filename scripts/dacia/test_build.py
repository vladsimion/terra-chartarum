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


def test_v1_candidate_is_complete_but_fail_closed():
    outputs = build.build_v1_outputs()
    qa = json.loads(outputs[build.V1_RELEASE_DIR / "qa.json"])
    assert qa["releaseStatus"] == "blocked"
    assert "coverage_target_not_reached" not in qa["blockers"]
    assert "required_evidence_regime_missing" not in qa["blockers"]
    assert "hiatus_authority_reconciliation_pending" not in qa["blockers"]
    assert "scholarly_spot_check_not_recorded" not in qa["blockers"]
    assert "human_scholarly_review_not_recorded" in qa["blockers"]
    assert "no_publishable_attestations" in qa["blockers"]
    assert qa["coverage"]["places"]["current"] >= 120
    assert qa["coverage"]["sources"]["current"] >= 25
    assert qa["doi"]["status"] == "deferred"
    for name in build.TABLES:
        assert build.V1_RELEASE_DIR / f"{name}.csv" in outputs
        assert build.V1_RELEASE_DIR / f"{name}.parquet" in outputs
    for name in (
        "cnd.jsonld",
        "atlas-publishable.geojson",
        "atlas-research.geojson",
        "qa.json",
        "CITATION.cff",
        "LICENSE.md",
        "METHODOLOGY.md",
        "SCHEMA.md",
    ):
        assert build.V1_RELEASE_DIR / name in outputs
    spatial = json.loads(outputs[build.V1_RELEASE_DIR / "atlas-research.geojson"])
    assert spatial["_cnd"]["release"] == "cnd-1.0-rc1"
    assert spatial["_cnd"]["kind"] == "release_candidate"


def test_v1_manifest_hashes_candidate_outputs_and_inputs():
    outputs = build.build_v1_outputs()
    manifest = json.loads(build.build_v1_manifest(outputs))
    assert manifest["release"] == "cnd-1.0-rc1"
    assert manifest["releaseStatus"] == "blocked"
    assert "data/dacia/reference/cnd-v1-release.json" in manifest["inputs"]
    assert "data/dacia/reference/cnd-v1-qa.json" in manifest["inputs"]
    assert "data/dacia/reference/cnd-id-migrations.csv" in manifest["inputs"]
    for name, entry in manifest["outputs"].items():
        payload = outputs[build.REPO / name]
        assert entry["sha256"] == build.sha256_bytes(payload)
        assert entry["bytes"] == len(payload)


def test_v1_preserves_every_pilot_place_and_source_id():
    qa = build.v1_qa({name: build.read_table(name) for name in build.TABLES})
    assert qa["stableIdAudit"]["missingPublishedIds"] == {}
    assert qa["authorityConsumers"]["nomenErrans"] == "resolves"
    assert qa["authorityConsumers"]["hiatus"] == "resolves"


def test_v1_qa_records_the_authority_sample_without_promoting_it():
    qa = build.v1_qa({name: build.read_table(name) for name in build.TABLES})
    run = qa["qaRun"]
    assert run["performedBy"]["kind"] == "machine_assisted"
    assert run["promotesReviewState"] is False
    assert run["authoritySpotChecks"]["recorded"] == 8
    assert run["authoritySpotChecks"]["matched"] == 8
    assert len(run["authoritySpotChecks"]["regions"]) == 8
    assert run["authoritySpotChecks"]["missingPublicSourceIds"] == []


def test_v1_qa_enumerates_fail_closed_editorial_work():
    qa = build.v1_qa({name: build.read_table(name) for name in build.TABLES})
    assert len(qa["editorialReview"]["sourceSilent"]["excludedIds"]) == 5
    assert len(qa["editorialReview"]["lowConfidence"]["excludedIds"]) == 3
    assert len(qa["editorialReview"]["editorialReconstruction"]["excludedIds"]) == 10
    assert qa["rights"]["researchOnlyRightsUnknownSourceIds"] == [
        "src-secret-century",
        "src-teleki-ethnographic-map-1920",
    ]
    assert qa["verificationDebt"]["publishableAttestations"] == {}


def test_v1_reconstructed_geometry_needs_place_review_before_publication():
    tables = {name: build.read_table(name) for name in build.TABLES}
    attestation = next(
        row for row in tables["attestations"]
        if row["place_id"] == "plc-sarmizegetusa-regia"
    )
    attestation["review_state"] = "approved"
    qa = build.v1_qa(tables)
    assert "public_reconstructed_geometry_unreviewed" in qa["blockers"]
    assert qa["editorialReview"]["editorialReconstruction"]["publicUnreviewedIds"] == [
        "plc-sarmizegetusa-regia"
    ]


def test_v1_stable_id_audit_uses_the_frozen_contract():
    tables = {name: build.read_table(name) for name in build.TABLES}
    tables["places"] = [row for row in tables["places"] if row["place_id"] != "plc-apulum"]
    qa = build.v1_qa(tables)
    assert qa["stableIdAudit"]["missingPublishedIds"] == {"places": ["plc-apulum"]}
    assert "published_identifier_missing" in qa["blockers"]


def test_pleiades_import_is_source_located_and_stays_unreviewed():
    attestations = [
        row for row in build.read_table("attestations")
        if row["source_id"] == "src-pleiades-gazetteer"
    ]
    attestation_ids = {row["attestation_id"] for row in attestations}
    captures = {
        row["attestation_id"]: row for row in build.read_table("transcriptions")
        if row["attestation_id"] in attestation_ids
    }
    assert len(attestations) == 80
    assert len(captures) == 80
    assert sorted(attestation_ids) == [f"att-{number:04d}" for number in range(50, 130)]
    for row in attestations:
        assert row["review_state"] == "normalized"
        assert row["normalization_method"] == "imported"
        assert row["locator_type"] == "section"
        assert row["locator"].startswith("https://pleiades.stoa.org/places/")
        assert captures[row["attestation_id"]]["capture_method"] == "from_edition"


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


def _slice():
    tables = {name: build.read_table(name) for name in build.TABLES}
    return build.nomen_errans_slice(tables)


def test_the_slice_follows_one_word_only():
    """KAN-345 is a single-name vertical slice: Napoca is a different word."""
    careers = _slice()["careers"]
    assert careers
    assert {career["lexicalForm"] for career in careers} == {build.NOMEN_ERRANS_FORM}


def test_only_a_cleared_career_reaches_the_essay():
    slice_ = _slice()
    for career in slice_["careers"]:
        assert career["reviewState"] in build.NOMEN_ERRANS_PUBLIC_STATES
        assert career["reviewer"], career["id"]
    # Withheld, not dropped: the essay says how much of the word it is holding.
    for held in slice_["withheld"]:
        assert held["reviewState"] not in build.NOMEN_ERRANS_PUBLIC_STATES


def test_every_career_carries_what_a_reader_needs_to_check_it():
    for career in _slice()["careers"]:
        assert career["referentLabel"], career["id"]
        assert career["periodLabel"] != "undated", career["id"]
        assert career["confidenceLabel"], career["id"]
        assert career["source"] and career["source"]["citation"], career["id"]
        # `locator_type: none` is an honest answer, so what is required is the
        # locator field saying something, not that a folio exists.
        assert career["locatorTypeLabel"], career["id"]


def test_a_career_with_no_honest_layer_gets_no_link():
    routes = {career["id"]: career["atlas"] for career in _slice()["careers"]}
    assert routes, "the slice compiled no careers at all"
    for use_id, atlas in routes.items():
        assert atlas, f"{use_id} has no recorded Atlas routing"
        assert atlas["note"], use_id
        if atlas["coverage"] == "in_coverage":
            assert atlas["layers"], use_id
            assert atlas["year"] is not None, use_id
        else:
            assert atlas["layers"] == [], use_id
    # The argument only closes if both outcomes are actually present.
    coverages = {atlas["coverage"] for atlas in routes.values()}
    assert "in_coverage" in coverages
    assert coverages - {"in_coverage"}


def test_careers_are_ordered_by_when_the_word_was_used():
    starts = [career["periodFrom"] for career in _slice()["careers"]]
    assert starts == sorted(starts)


def test_the_flow_never_draws_an_unreviewed_relationship():
    slice_ = _slice()
    public = {career["id"] for career in slice_["careers"]}
    for relation in slice_["relations"]:
        assert relation["reviewState"] in build.NOMEN_ERRANS_PUBLIC_STATES
        assert relation["reviewer"], relation["id"]
        assert {relation["from"], relation["to"]} <= public
        if relation["kind"] == "continuity":
            assert relation["evidenceAttestationId"], relation["id"]

    # Both outcomes have to be present or the gate is not actually being tested.
    # Eight edges join two visible nodes and are drawn; two are reviewed rows
    # that land on a use still below review, and the endpoint rule withholds
    # them. A reviewed edge is not by itself permission to draw a line.
    assert len(slice_["relations"]) == 8
    assert {relation["id"] for relation in slice_["withheldRelations"]} == {
        "nue-dacia-antiquarian-reception",
        "nue-dacia-scandinavia-church",
    }
    for relation in slice_["withheldRelations"]:
        assert not {relation["from"], relation["to"]} <= public, relation["id"]


def test_a_reviewed_relationship_reaches_the_flow_from_the_ledger():
    tables = {name: build.read_table(name) for name in build.TABLES}
    relation = next(
        row
        for row in tables["name-use-edges"]
        if row["edge_id"] == "nue-dacia-province-antiquarian"
    )
    relation.update({
        "review_state": "reviewed",
        "reviewer": "A Human Reviewer",
        "review_date": "2026-08-26",
    })

    slice_ = build.nomen_errans_slice(tables)
    emitted = next(row for row in slice_["relations"] if row["id"] == relation["edge_id"])
    assert emitted["from"] == relation["from_name_use"]
    assert emitted["to"] == relation["to_name_use"]
    assert emitted["kindLabel"] == "Revival"
    assert emitted["confidenceLabel"] == "Medium"
