#!/usr/bin/env python3
"""Regression tests for the Antarctic programme rules (KAN-420 to KAN-423).

Each test takes the committed tables, breaks one rule, and asserts the validator
refuses the result. Most of these rules fire on rows nobody has written yet -
the first reproduced plate, the first reviewed claim, the first drift track with
real positions - which is exactly the kind of rule that can rot for a year
without anyone noticing, and then wave through the thing it was written to stop.
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate  # noqa: E402
from validate import validate_inputs  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    root = tmp_path / "antarctica"
    shutil.copytree(validate.REPO / "data" / "antarctica", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def edit(dataset: Path, table: str, mutate) -> None:
    path = dataset / table
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames, rows = list(reader.fieldnames or []), list(reader)
    result = mutate(rows)
    rows = rows if result is None else result
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def find(rows, key, value):
    for row in rows:
        if row[key] == value:
            return row
    raise AssertionError(f"no row with {key}={value}")


def errors() -> list[str]:
    return validate_inputs(include_release=False)[0]


def refuses(fragment: str) -> None:
    found = errors()
    assert any(fragment in error for error in found), (
        f"expected an error containing {fragment!r}, got: {found}"
    )


def test_committed_dataset_is_valid(dataset):
    assert errors() == []


# --- The audit's own gaps ---------------------------------------------------

def test_verified_source_cannot_leave_its_locator_pending(dataset):
    edit(dataset, "sources.csv", lambda rows: find(rows, "source_id", "ant-src-cook-voyage-1777")
         .update({"verification_state": "verified"}))
    refuses("cannot leave its locator pending")


def test_reviewed_source_must_be_verified_first(dataset):
    edit(dataset, "sources.csv", lambda rows: find(rows, "source_id", "ant-src-hiatt-terra-incognita")
         .update({"review_status": "reviewed"}))
    refuses("must first be verified")


def test_dealer_listing_cannot_be_a_source_of_record(dataset):
    edit(dataset, "sources.csv", lambda rows: find(rows, "source_id", "ant-src-milanesi-coronelli")
         .update({"repository_url": "https://www.abebooks.co.uk/"}))
    refuses("dealer and aggregator listings")


def test_reproduction_requires_rights_that_permit_it(dataset):
    edit(dataset, "map-objects.csv",
         lambda rows: find(rows, "map_object_id", "ant-obj-ukho-ice-chart-1910")
         .update({"reproduction_use": "deepzoom"}))
    refuses("reproduction requires rights that permit it")


def test_unverified_object_may_not_be_reproduced(dataset):
    edit(dataset, "map-objects.csv",
         lambda rows: find(rows, "map_object_id", "ant-obj-fine-1531")
         .update({"reproduction_use": "full_reproduction", "rights_status": "public_domain_work"}))
    refuses("may not be reproduced before it is verified")


def test_verified_object_owes_a_persistent_identifier(dataset):
    edit(dataset, "map-objects.csv",
         lambda rows: find(rows, "map_object_id", "ant-obj-ukho-ice-chart-1910")
         .update({"persistent_id": ""}))
    refuses("persistent_id is required")


def test_every_required_source_cluster_is_present(dataset):
    edit(dataset, "sources.csv", lambda rows: [
        row for row in rows if row["claim_family"] != "coronelli"
    ])
    refuses("dedicated cluster for 'coronelli'")


# --- The claim ledger -------------------------------------------------------

def test_a_confident_claim_must_cite_something(dataset):
    edit(dataset, "claims.csv", lambda rows: find(rows, "claim_id", "ant-clm-cumulative-chart")
         .update({"primary_source_ids": "", "secondary_source_ids": ""}))
    refuses("must cite a source")


def test_a_high_risk_fact_must_cite_something(dataset):
    edit(dataset, "claims.csv", lambda rows: find(rows, "claim_id", "ant-clm-wilkes-coast")
         .update({"primary_source_ids": "", "secondary_source_ids": "", "confidence": "low"}))
    refuses("typed as fact must cite a source")


def test_every_claim_carries_a_disagreement_note(dataset):
    edit(dataset, "claims.csv", lambda rows: find(rows, "claim_id", "ant-clm-first-sighting")
         .update({"disagreement_note": ""}))
    refuses("disagreement_note is required")


def test_claim_sources_must_resolve(dataset):
    edit(dataset, "claims.csv", lambda rows: find(rows, "claim_id", "ant-clm-cook-blank")
         .update({"primary_source_ids": "ant-src-not-a-thing"}))
    refuses("does not resolve")


def test_gis_dependency_must_resolve_to_a_pilot_record(dataset):
    edit(dataset, "claims.csv", lambda rows: find(rows, "claim_id", "ant-clm-drift-track")
         .update({"gis_dependency": "ant-trk-invented"}))
    refuses("does not resolve to a pilot record")


def test_the_discovery_vocabulary_cannot_lose_a_definition(dataset):
    edit(dataset, "terminology.csv", lambda rows: [
        row for row in rows if row["term_id"] != "ant-trm-first-mainland-sighting"
    ])
    refuses("missing 'ant-trm-first-mainland-sighting'")


# --- Geometry and provenance ------------------------------------------------

def test_a_not_spatial_record_may_not_carry_geometry(dataset):
    edit(dataset, "features.csv",
         lambda rows: find(rows, "feature_id", "ant-ftr-coronelli-southern-region")
         .update({"geometry": "POINT (0 -70)"}))
    refuses("must not carry geometry")


def test_a_spatial_record_must_carry_geometry(dataset):
    edit(dataset, "features.csv",
         lambda rows: find(rows, "feature_id", "ant-ftr-cook-southern-limit")
         .update({"geometry": ""}))
    refuses("must carry geometry")


def test_a_northern_latitude_is_refused(dataset):
    """The commonest way a southern track ends up drawn in the wrong hemisphere."""
    edit(dataset, "features.csv",
         lambda rows: find(rows, "feature_id", "ant-ftr-cook-southern-limit")
         .update({"geometry": "POINT (-106.9 71.17)"}))
    refuses("outside the southern window")


def test_geometry_must_match_its_declared_type(dataset):
    edit(dataset, "features.csv",
         lambda rows: find(rows, "feature_id", "ant-ftr-cook-southern-limit")
         .update({"geometry_type": "Polygon"}))
    refuses("does not match geometry_type")


def test_a_planned_route_may_not_be_filed_as_observation(dataset):
    """Act VIII contrasts plan with drift. If the plan is filed as evidence the
    contrast is between two things we drew ourselves."""
    edit(dataset, "tracks.csv", lambda rows: find(rows, "track_id", "ant-trk-endurance-plan")
         .update({"evidence_class": "direct_observation"}))
    refuses("must be filed as editorial_interpolation")


def test_an_unknown_evidence_class_is_refused(dataset):
    edit(dataset, "observations.csv",
         lambda rows: find(rows, "observation_id", "ant-obs-1820-sighting")
         .update({"evidence_class": "eyewitness"}))
    refuses("not in the frozen vocabulary")


# --- Promotion --------------------------------------------------------------

def test_nothing_leaves_raw_on_a_pending_locator(dataset):
    edit(dataset, "observations.csv",
         lambda rows: find(rows, "observation_id", "ant-obs-endurance-fix")
         .update({"review_state": "normalized"}))
    refuses("needs a real source locator")


def test_editorial_linework_may_not_reach_the_public_tier(dataset):
    edit(dataset, "tracks.csv", lambda rows: find(rows, "track_id", "ant-trk-endurance-drift")
         .update({"review_state": "published", "source_locator": "South, p. 100",
                  "confidence": "high"}))
    refuses("editorial linework may not reach the public tier")


def test_weak_confidence_may_not_reach_the_public_tier(dataset):
    edit(dataset, "observations.csv",
         lambda rows: find(rows, "observation_id", "ant-obs-1820-sighting")
         .update({"review_state": "approved", "source_locator": "Debenham, vol. 1, p. 117"}))
    refuses("weak confidence may not reach the public tier")


# --- Ghost geographies ------------------------------------------------------

def test_a_ghost_feature_keeps_its_claimant_and_its_plausibility(dataset):
    edit(dataset, "ghost-geographies.csv",
         lambda rows: find(rows, "ghost_id", "ant-ghost-wilkes-segment")
         .update({"why_plausible": ""}))
    refuses("why_plausible is required")


def test_a_disproof_needs_the_source_that_disproved_it(dataset):
    edit(dataset, "ghost-geographies.csv",
         lambda rows: find(rows, "ghost_id", "ant-ghost-wilkes-segment")
         .update({"later_status_source_id": ""}))
    refuses("a disproof needs the source that disproved it")


# --- Coronelli --------------------------------------------------------------

def test_an_established_lineage_must_state_a_relationship(dataset):
    edit(dataset, "coronelli-lineage.csv",
         lambda rows: find(rows, "lineage_id", "ant-lin-southern-coast-ortelius")
         .update({"status": "established"}))
    refuses("must say what the relationship is")


def test_an_annotation_cannot_be_built_on_an_unresolved_region(dataset):
    edit(dataset, "coronelli-annotations.csv",
         lambda rows: find(rows, "annotation_id", "ant-ann-coronelli-01")
         .update({"status": "built"}))
    refuses("needs a specified region")


# --- Evidence and the pilot's coverage --------------------------------------

def test_evidence_needs_a_source_or_an_object(dataset):
    edit(dataset, "feature-evidence.csv",
         lambda rows: find(rows, "evidence_id", "ant-evd-terra-australis-hiatt")
         .update({"source_id": ""}))
    refuses("needs a source or a map object")


def test_the_pilot_must_cover_every_act_it_claims_to(dataset):
    edit(dataset, "ghost-geographies.csv", lambda rows: [])
    refuses("no record for 'act_vi'")


def test_a_gap_must_block_something_real(dataset):
    edit(dataset, "source-gaps.csv", lambda rows: find(rows, "gap_id", "ant-gap-worsley-workings")
         .update({"blocks": "ant-clm-nonexistent"}))
    refuses("is neither a Jira key nor a claim")


# --- Priority claims: a contest the schema cannot resolve (KAN-425) ----------

def test_a_priority_claim_must_answer_a_definition(dataset):
    edit(dataset, "priority-claims.csv",
         lambda rows: find(rows, "priority_id", "ant-pri-bransfield-1820")
         .update({"definition_satisfied": ""}))
    refuses("must say which definition it satisfies")


def test_a_priority_definition_must_be_a_real_term(dataset):
    edit(dataset, "priority-claims.csv",
         lambda rows: find(rows, "priority_id", "ant-pri-palmer-1820")
         .update({"definition_satisfied": "ant-trm-first-obviously"}))
    refuses("does not resolve")


def test_a_contest_needs_more_than_one_claimant(dataset):
    """A single-claimant contest is a finding dressed as an argument."""
    edit(dataset, "priority-claims.csv", lambda rows: [
        row for row in rows if row["contest"] != "continental_extent_1840"
    ] + [find(rows, "priority_id", "ant-pri-wilkes-1840")])
    refuses("has only 1 claim")


# --- Coastline chronology (KAN-425) -----------------------------------------

def test_a_segment_cannot_be_charted_before_it_was_claimed(dataset):
    edit(dataset, "coastline-chronology.csv",
         lambda rows: find(rows, "segment_id", "ant-seg-victoria-land")
         .update({"first_charted_date": "1830"}))
    refuses("first_charted_date precedes first_claimed_date")


def test_a_confirmed_segment_needs_its_confirmation_date(dataset):
    edit(dataset, "coastline-chronology.csv",
         lambda rows: find(rows, "segment_id", "ant-seg-victoria-land")
         .update({"first_confirmed_date": ""}))
    refuses("needs the date it was confirmed")


def test_a_claim_with_no_observation_is_allowed(dataset):
    """The Wilkes problem stated in data. The schema must not require the gap
    to be filled, because the gap is the finding."""
    assert errors() == []
    wilkes = None
    with (dataset / "coastline-chronology.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["segment_id"] == "ant-seg-wilkes-land":
                wilkes = row
    assert wilkes is not None
    assert wilkes["first_claimed_date"]
    assert not wilkes["first_observed_date"]


# --- Expedition phases (KAN-428) --------------------------------------------

def test_a_drift_is_not_under_the_vessels_own_power(dataset):
    edit(dataset, "expedition-phases.csv", lambda rows: find(rows, "phase_id", "ant-phs-ite-drift")
         .update({"under_own_power": "yes"}))
    refuses("a drift is not under the vessel's own power")


def test_a_planned_phase_cannot_claim_a_power_state(dataset):
    edit(dataset, "expedition-phases.csv", lambda rows: find(rows, "phase_id", "ant-phs-ite-plan")
         .update({"under_own_power": "yes"}))
    refuses("cannot claim power state")


def test_a_planned_phase_must_be_filed_as_interpolation(dataset):
    edit(dataset, "expedition-phases.csv", lambda rows: find(rows, "phase_id", "ant-phs-ite-plan")
         .update({"evidence_class": "direct_observation", "under_own_power": "planned"}))
    refuses("must be filed as editorial_interpolation")


def test_phase_sequences_do_not_collide(dataset):
    edit(dataset, "expedition-phases.csv", lambda rows: find(rows, "phase_id", "ant-phs-ite-drift")
         .update({"sequence": "2"}))
    refuses("duplicate sequence")


# --- Chart contributions (KAN-427) ------------------------------------------

def test_a_contribution_must_appear_on_at_least_one_chart(dataset):
    edit(dataset, "chart-contributions.csv",
         lambda rows: find(rows, "contribution_id", "ant-con-cook")
         .update({"present_on_1874": "no", "present_on_1910": "no"}))
    refuses("must appear on at least one chart")


def test_the_1910_sheet_must_compile_more_than_the_1874_one(dataset):
    """Act VII rests on the revision. If the two lists ever match, the act has
    nothing to show and this table is decoration."""
    edit(dataset, "chart-contributions.csv", lambda rows: [
        row | {"present_on_1874": "yes"} if row["present_on_1910"] == "yes" else row
        for row in rows
    ])
    refuses("must compile more than the 1874 one")


def test_an_unknown_contribution_kind_is_refused(dataset):
    edit(dataset, "chart-contributions.csv",
         lambda rows: find(rows, "contribution_id", "ant-con-ross")
         .update({"contribution_kind": "discovery"}))
    refuses("contribution_kind 'discovery' is not recognised")
