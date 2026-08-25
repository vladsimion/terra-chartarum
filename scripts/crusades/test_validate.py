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
from validate import ROLES, STAGES, STATES, TABLE, validate_inputs  # noqa: E402


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


GATES = "reference/gates.csv"
DEBTS = "reference/verification-debt.csv"


def test_a_gate_must_name_the_ticket_that_owns_it(dataset):
    edit(dataset, lambda rows: [{**r, "jira_key": ""} if r["gate_id"] == "data" else r
                                for r in rows], table=GATES)
    refuses("jira_key must name the ticket")


def test_a_gate_above_pending_must_point_at_evidence(dataset):
    """`partial` is a claim that some of the work exists and can be looked at."""
    edit(dataset, lambda rows: [{**r, "evidence": ""} if r["status"] == "partial" else r
                                for r in rows], table=GATES)
    refuses("needs evidence")


def test_a_gate_cannot_cite_evidence_that_does_not_exist(dataset):
    edit(dataset, lambda rows: [{**r, "evidence": "src/components/islands/Nope.astro"}
                                if r["status"] == "partial" else r for r in rows], table=GATES)
    refuses("does not exist")


def test_release_cannot_pass_while_the_other_gates_are_open(dataset):
    """The essay is held. A passed release gate here would contradict the hold."""
    edit(dataset, lambda rows: [{**r, "status": "passed"} if r["gate_id"] == "release" else r
                                for r in rows], table=GATES)
    refuses("claims release while")


def test_a_proof_cannot_lose_a_gate(dataset):
    edit(dataset, lambda rows: [r for r in rows if r["gate_id"] != "rights"], table=GATES)
    refuses("has no rights gate")


def test_an_open_item_must_name_the_gate_it_blocks(dataset):
    """Open debt that reaches no gate reaches no ticket, and is how an
    outstanding item is lost while still sitting in the register marked open."""
    edit(dataset, lambda rows: [{**r, "blocks": ""} if r["debt_id"].startswith("vd-cru-") else r
                                for r in rows], table=DEBTS)
    refuses("an open item must name the gate it blocks")


def test_debt_cannot_block_a_gate_that_does_not_exist(dataset):
    edit(dataset, lambda rows: [{**r, "blocks": "matthew_paris:provenance"}
                                for r in rows], table=DEBTS)
    refuses("is not a proof:gate pair")


def test_an_open_gate_must_have_something_naming_it(dataset):
    """The other direction, and the one that found a real gap when it was added.

    A gate below `passed` with no open debt pointing at it is a gate nobody can
    act on: the register says work remains and names none of it.
    """
    edit(dataset, lambda rows: [r for r in rows if r["debt_id"] != "vd-cru-jerusalem-rights"],
         table=DEBTS)
    refuses("with no open debt naming it")


def test_a_blocker_must_carry_a_way_out(dataset):
    edit(dataset, lambda rows: [{**r, "resolution_path": ""} for r in rows], table=DEBTS)
    refuses("resolution_path is required")


def edit_role(dataset, role_id, changes):
    def mutate(rows):
        for row in rows:
            if row["role_id"] == role_id:
                row.update(changes)
    edit(dataset, mutate, ROLES)


# --- The Holy Land register (CRU-7 / KAN-438) -------------------------------
#
# Five of these six rules exist to stop one substitution: a claim about what a
# city meant becoming a claim about where it was.


def test_a_sacred_centre_may_not_carry_a_position(dataset):
    """The middle of a mappa mundi is not at 31.78N. It is in the middle."""
    edit_role(dataset, "cru-jer-psalter-centre", {"geometry_provenance": "modern_reference"})
    refuses("a claim about what the city means")


def test_a_described_land_may_not_carry_a_position_either(dataset):
    edit_role(dataset, "cru-jer-burchard-divisions", {"geometry_provenance": "modern_reference"})
    refuses("a claim about what the city means")


def test_later_cartographic_memory_may_not_cite_a_source(dataset):
    """The rule that keeps a 1581 woodcut from becoming medieval evidence."""
    edit_role(dataset, "cru-jer-bunting-emblem", {"source_id": "cru-jer-burchard"})
    refuses("would make a later map evidence for an earlier geography")


def test_later_cartographic_memory_must_name_its_catalogue_object(dataset):
    edit_role(dataset, "cru-jer-bunting-emblem", {"catalogue_object_id": ""})
    refuses("must name its catalogue object")


def test_memory_cannot_predate_the_thing_it_remembers(dataset):
    edit_role(dataset, "cru-jer-bunting-emblem", {"date_from": "1200", "date_to": "1200"})
    refuses("cannot predate 1291")


def test_a_node_in_the_network_is_one_place(dataset):
    edit_role(dataset, "cru-jer-acre-capital",
              {"place_ids": "cru-plc-acre|cru-plc-jaffa"})
    refuses("a node is one place")


def test_a_node_in_the_network_is_drawn_where_it_is(dataset):
    edit_role(dataset, "cru-jer-jaffa-landfall", {"geometry_provenance": "not_spatial"})
    refuses("a port and is drawn at one")


def test_a_register_record_must_name_a_real_source(dataset):
    edit_role(dataset, "cru-jer-vesconte-grid", {"source_id": "cru-jer-invented"})
    refuses("does not resolve")


def test_a_record_above_raw_needs_the_page_it_was_read_from(dataset):
    edit_role(dataset, "cru-jer-burchard-divisions", {"review_state": "reviewed"})
    refuses("needs the page it was read from")


def test_every_register_is_present(dataset):
    """An act missing a register is an act making a different argument."""
    edit(dataset, lambda rows: [r for r in rows if r["role_kind"] != "cartographic_construct"],
         ROLES)
    refuses("no record in the 'cartographic_construct' register")


def test_a_holy_land_source_may_not_cover_the_memory_register(dataset):
    edit(dataset, lambda rows: find(rows, "cru-jer-burchard").update(
        {"covers": "cartographic_memory"}))
    refuses("carried by a catalogue record, not by a source in this audit")


def test_a_holy_land_place_needs_an_arabic_form_or_a_reason(dataset):
    """A Levant place carrying only its conquerors' names, with nothing saying
    why, publishes the crusaders' map of the place as the place."""
    def mutate(rows):
        for row in rows:
            if row["place_id"] == "cru-plc-acre":
                row.update({"name_arabic": "", "script_note": "Latin and Greek forms"})
    edit_places(dataset, mutate)
    refuses("needs an Arabic form, or a script_note saying why")


def test_an_arabic_form_must_say_what_it_is(dataset):
    def mutate(rows):
        for row in rows:
            if row["place_id"] == "cru-plc-jerusalem":
                row.update({"script_note": "Latin and Greek forms both current"})
    edit_places(dataset, mutate)
    refuses("an Arabic form must say in script_note")


def test_the_holy_land_register_has_its_own_bound(dataset):
    """Widening the pilot's 15-25 to make room would have made the bound
    meaningless; the third register counts separately."""
    def mutate(rows):
        return [r for r in rows if r["proof"] != "jerusalem"]
    edit_places(dataset, mutate)
    refuses("the jerusalem register holds 4-10 core places")
