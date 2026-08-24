#!/usr/bin/env python3
"""Regression tests for the Crusades Phase 0 audit rules (KAN-384).

Each test takes the committed audit, breaks one rule, and asserts that
`validate_inputs()` refuses the result. The rules only fire on rows nobody has
written yet, which is exactly the kind that rot unnoticed.
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate  # noqa: E402
from validate import STAGES, STATES, TABLE, validate_inputs  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    root = tmp_path / "crusades"
    shutil.copytree(validate.REPO / "data" / "crusades", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def edit(dataset: Path, mutate, table: str = TABLE) -> None:
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


def find(rows, source_id):
    for row in rows:
        if row["source_id"] == source_id:
            return row
    raise AssertionError(f"no row {source_id}")


def refuses(fragment: str) -> None:
    errors = validate_inputs(include_release=False)
    assert any(fragment in error for error in errors), (
        f"expected an error containing {fragment!r}, got: {errors}"
    )


def test_committed_audit_is_valid(dataset):
    assert validate_inputs(include_release=False) == []


def test_a_manuscript_must_carry_its_shelfmark(dataset):
    edit(dataset, lambda rows: find(rows, "cru-mp-royal-14-c-vii").update({"shelfmark": "n/a"}))
    refuses("must carry its shelfmark")


def test_a_verified_source_cannot_leave_its_locator_pending(dataset):
    """Knowing the manuscript exists is not having read the folio."""
    edit(dataset, lambda rows: find(rows, "cru-mp-cccc-26").update(
        {"verification_state": "verified"}))
    refuses("cannot leave its locator pending")


def test_a_production_role_needs_rights_that_permit_reuse(dataset):
    edit(dataset, lambda rows: find(rows, "cru-fc-choniates").update(
        {"production_role": "production_primary"}))
    refuses("requires rights that permit reuse")


def test_a_production_role_needs_a_real_locator(dataset):
    edit(dataset, lambda rows: find(rows, "cru-fc-partitio").update(
        {"production_role": "production_fallback", "resolution_status": "sufficient"}))
    refuses("requires a real locator")


def test_the_sequence_cannot_lose_a_stage(dataset):
    """A set that cannot reach the partition cannot say what was claimed after 1204."""
    # Two sources reach past 1204: the partition instrument and Choniates. Both
    # have to go for the stage to be unreachable, which is the point of asking
    # for coverage rather than for a source count.
    edit(dataset, lambda rows: [
        r for r in rows if r["source_id"] not in {"cru-fc-partitio", "cru-fc-choniates"}
    ])
    refuses("no Fourth Crusade source covers 'post_1204_claims'")


def test_both_proofs_need_witnesses(dataset):
    edit(dataset, lambda rows: [r for r in rows if r["proof"] != "matthew_paris"])
    refuses("no witness is recorded for the 'matthew_paris' proof")


def test_an_unknown_stage_is_rejected(dataset):
    edit(dataset, lambda rows: find(rows, "cru-fc-clari").update({"covers": "zara|siege_of_acre"}))
    refuses("is not a stage of the sequence")


def test_dealer_imagery_cannot_be_a_publication_source(dataset):
    edit(dataset, lambda rows: find(rows, "cru-mp-luard-edition").update(
        {"repository_url": "https://www.abebooks.co.uk/"}))
    refuses("may not be a publication source")


# --- pilot place authority (KAN-385) -----------------------------------------


def edit_places(dataset: Path, mutate) -> None:
    path = dataset / "places.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames, rows = list(reader.fieldnames or []), list(reader)
    result = mutate(rows)
    rows = rows if result is None else result
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def find_place(rows, place_id):
    for row in rows:
        if row["place_id"] == place_id:
            return row
    raise AssertionError(f"no place {place_id}")


def test_a_modern_coordinate_cannot_claim_a_medieval_basis(dataset):
    """No source in the corpus gives a position, so none may be implied."""
    edit_places(dataset, lambda rows: find_place(rows, "cru-plc-venice").update(
        {"coordinate_basis": "source_given"}))
    refuses("no source in the corpus gives a medieval position")


def test_a_core_place_needs_a_historical_form(dataset):
    """Otherwise it is a modern town with a crusade attached to it."""
    edit_places(dataset, lambda rows: find_place(rows, "cru-plc-zara").update(
        {"name_latin": "", "name_greek": ""}))
    refuses("needs a Latin or Greek form")


def test_a_greek_form_must_explain_its_relation_to_the_latin(dataset):
    edit_places(dataset, lambda rows: find_place(rows, "cru-plc-constantinople").update(
        {"script_note": "Two names"}))
    refuses("must say in script_note how it relates to the Latin one")


def test_the_pilot_stays_within_its_bound(dataset):
    edit_places(dataset, lambda rows: rows[:8])
    refuses("core places, found 8")


def test_a_place_window_cannot_end_before_it_starts(dataset):
    edit_places(dataset, lambda rows: find_place(rows, "cru-plc-corfu").update(
        {"valid_to": "1150"}))
    refuses("window ends before it starts")


def test_both_proofs_need_places(dataset):
    edit_places(dataset, lambda rows: [r for r in rows if r["proof"] != "fourth_crusade"])
    refuses("the 'fourth_crusade' proof has no places")


# --- The Road proof: a diagram is not a map (KAN-386) --------------------------

def row_at(dataset, table, key, value):
    with (dataset / table).open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row[key] == value:
                return row
    raise AssertionError(f"no {key}={value}")


def edit_stage(dataset, stage_id, changes):
    def mutate(rows):
        for row in rows:
            if row["stage_id"] == stage_id:
                row.update(changes)
    edit(dataset, mutate, STAGES)


def edit_state(dataset, state_id, changes):
    def mutate(rows):
        for row in rows:
            if row["state_id"] == state_id:
                row.update(changes)
    edit(dataset, mutate, STATES)


def test_an_itinerary_stage_carries_no_position_of_its_own(dataset):
    """The whole Road proof. Matthew Paris's itinerary is a strip diagram with no
    projection; a stage with a longitude would invent the thing the manuscript
    most conspicuously lacks."""
    stage = row_at(dataset, STAGES, "stage_id", "cru-itn-01")
    assert "lon" not in stage and "lat" not in stage and "geometry" not in stage


def test_a_stage_must_resolve_to_a_place(dataset):
    edit_stage(dataset, "cru-itn-05", {"place_id": "cru-plc-atlantis"})
    refuses("does not resolve")


def test_a_stage_is_a_manuscript_depiction_and_nothing_else(dataset):
    edit_stage(dataset, "cru-itn-05", {"evidence_class": "direct_observation"})
    refuses("manuscript depiction and nothing else")


def test_the_stage_sequence_has_no_gaps(dataset):
    edit_stage(dataset, "cru-itn-07", {"sequence": "99"})
    refuses("must run 1..n with no gaps")


def test_a_day_mark_is_a_whole_number(dataset):
    edit_stage(dataset, "cru-itn-06", {"depicted_days": "about four"})
    refuses("whole number of day-marks")


def test_a_stage_above_raw_needs_its_folio(dataset):
    edit_stage(dataset, "cru-itn-01", {"review_state": "normalized"})
    refuses("needs the folio it was read from")


# --- The Sea proof: a claim is not a possession (KAN-387) ---------------------

def test_a_partition_claim_may_not_be_recorded_as_held(dataset):
    edit_state(dataset, "cru-fcs-partitio", {"held": "held"})
    refuses("must be recorded as claimed and not held")


def test_a_partition_claim_may_not_be_drawn(dataset):
    """The Partitio's boundaries are disputed. Drawing them would publish a claim
    as a map, which is the error the Sea proof exists to avoid."""
    edit_state(dataset, "cru-fcs-partitio",
               {"geometry": "LINESTRING (28.9 41.0, 26.5 41.6)",
                "geometry_provenance": "editorial_generalisation"})
    refuses("publishes a claim as a map")


def test_durable_control_means_it_was_held(dataset):
    edit_state(dataset, "cru-fcs-durable", {"held": "claimed_not_held"})
    refuses("durable control means it was held")


def test_no_route_may_claim_a_documented_track(dataset):
    edit_state(dataset, "cru-fcs-corfu", {"geometry_provenance": "modern_reference"})
    refuses("any line here is a generalisation")


def test_every_state_kind_is_present(dataset):
    edit(dataset, lambda rows: [r for r in rows if r["state_kind"] != "negotiated_diversion"],
         STATES)
    refuses("no record for the 'negotiated_diversion' state")


def test_a_state_must_name_a_real_source(dataset):
    edit_state(dataset, "cru-fcs-zara", {"source_id": "cru-fc-invented"})
    refuses("does not resolve")


def test_a_vmn_reference_must_be_a_real_vmn_layer(dataset):
    edit_state(dataset, "cru-fcs-durable", {"vmn_reference": "venetian-empire"})
    refuses("is not a VMN layer")


def test_a_not_spatial_state_may_not_carry_geometry(dataset):
    edit_state(dataset, "cru-fcs-intent",
               {"geometry": "LINESTRING (12.3 45.4, 31.2 30.0)"})
    refuses("must not carry geometry")
