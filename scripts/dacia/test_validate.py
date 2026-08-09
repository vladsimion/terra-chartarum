#!/usr/bin/env python3
"""Regression tests for the Corpus Chartarum Daciae validation rules (KAN-329–333).

The rules here exist to stop research-in-progress being published as settled
fact, and to stop the programme's own bookkeeping drifting away from the data
it describes. Both kinds only ever fire on records nobody has written yet, so
both rot silently. Each test takes the committed tables, breaks exactly one
rule, and asserts that `validate_inputs()` refuses the result.

`validate_inputs()` resolves every path through the module-level DATA constant,
so each test works on a private copy of data/dacia with that constant repointed
at it.

Run with `make dacia-test` (or `.venv/bin/python -m pytest scripts/dacia`).
"""

from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate  # noqa: E402
from validate import TABLES, validate_inputs  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    """A private copy of data/dacia that a test may safely break."""
    root = tmp_path / "dacia"
    shutil.copytree(validate.REPO / "data" / "dacia", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def read(dataset: Path, key: str) -> tuple[list[str], list[dict[str, str]]]:
    with (dataset / TABLES[key]).open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write(dataset: Path, key: str, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with (dataset / TABLES[key]).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def edit(dataset: Path, key: str, mutate) -> None:
    """Apply `mutate` to the parsed rows and write them back."""
    fieldnames, rows = read(dataset, key)
    result = mutate(rows)
    write(dataset, key, fieldnames, rows if result is None else result)


def find(rows: list[dict[str, str]], column: str, value: str) -> dict[str, str]:
    for row in rows:
        if row[column] == value:
            return row
    raise AssertionError(f"no row with {column}={value}")


def refuses(fragment: str) -> list[str]:
    errors = validate_inputs()
    assert any(fragment in error for error in errors), (
        f"expected an error containing {fragment!r}, got: {errors}"
    )
    return errors


def test_committed_tables_are_valid(dataset):
    assert validate_inputs() == []


# --- identifiers and referential integrity (KAN-329, KAN-332) ---------------


def test_duplicate_place_id_is_rejected(dataset):
    edit(dataset, "places", lambda rows: rows + [dict(rows[0])])
    refuses("duplicate place_id")


def test_unresolved_attestation_place_is_rejected(dataset):
    def mutate(rows):
        rows[0]["place_id"] = "plc-does-not-exist"

    edit(dataset, "attestations", mutate)
    refuses("place_id 'plc-does-not-exist' does not resolve")


def test_place_name_cannot_stand_in_for_an_id(dataset):
    """No human-readable name is a join key: a name in an FK column fails."""

    def mutate(rows):
        rows[0]["source_id"] = "Ptolemy, Geographia"

    edit(dataset, "attestations", mutate)
    refuses("does not resolve")


def test_reserved_prefix_whose_table_exists_must_be_promoted(dataset):
    def mutate(rows):
        find(rows, "prefix", "nmu")["authority_table"] = "data/dacia/places.csv"

    edit(dataset, "entity_prefixes", mutate)
    refuses("promote the prefix to live")


# --- controlled vocabularies (KAN-330) --------------------------------------


def test_invalid_vocabulary_value_is_rejected(dataset):
    def mutate(rows):
        rows[0]["confidence"] = "fairly_sure"

    edit(dataset, "attestations", mutate)
    refuses("is not an approved confidence term")


def test_missing_required_term_is_rejected(dataset):
    edit(
        dataset,
        "vocabularies",
        lambda rows: [r for r in rows if not (r["vocabulary"] == "attestation_class" and r["term"] == "source_silent")],
    )
    refuses("attestation_class is missing")


def test_deprecated_term_must_name_its_replacement(dataset):
    def mutate(rows):
        row = find(rows, "term", "medium")
        row["status"] = "deprecated"
        row["use_instead_of"] = ""

    edit(dataset, "vocabularies", mutate)
    refuses("deprecated term must name its replacement")


def test_review_state_ranks_must_be_contiguous(dataset):
    def mutate(rows):
        for row in rows:
            if row["vocabulary"] == "review_state" and row["term"] == "reviewed":
                row["rank"] = "9"

    edit(dataset, "vocabularies", mutate)
    refuses("ranks must be contiguous")


def test_every_attestation_class_needs_an_example(dataset):
    edit(
        dataset,
        "vocabulary_examples",
        lambda rows: [r for r in rows if r["term"] != "mapped_unlabelled"],
    )
    refuses("attestation_class 'mapped_unlabelled' has no example record")


def test_illustrative_example_cannot_cite_a_real_record(dataset):
    def mutate(rows):
        find(rows, "example_id", "ex-att-textual-only")["place_id"] = "plc-apulum"

    edit(dataset, "vocabulary_examples", mutate)
    refuses("illustrative example must not cite real records")


# --- the promotion ladder (KAN-330, KAN-332) --------------------------------


def test_llm_assisted_cannot_pass_normalized_unreviewed(dataset):
    def mutate(rows):
        rows[0]["review_state"] = "approved"

    edit(dataset, "places", mutate)
    refuses("llm_assisted cannot pass normalized without a named reviewer")


def test_reviewed_record_requires_a_named_reviewer(dataset):
    def mutate(rows):
        row = rows[0]
        row["review_state"] = "reviewed"
        row["normalization_method"] = "manual"

    edit(dataset, "places", mutate)
    refuses("requires a named reviewer")


def test_reviewed_attestation_requires_a_real_locator(dataset):
    def mutate(rows):
        row = rows[1]
        row["review_state"] = "reviewed"
        row["normalization_method"] = "manual"
        row["reviewer"] = "V. Simion"
        row["review_date"] = "2026-08-09"

    edit(dataset, "attestations", mutate)
    refuses("requires a real locator")


def test_pending_field_cannot_survive_promotion(dataset):
    def mutate(rows):
        row = find(rows, "attestation_id", "att-0001")
        row["review_state"] = "normalized"

    edit(dataset, "attestations", mutate)
    refuses("name_original is still pending above raw")


# --- what an attestation may and may not carry (KAN-332) --------------------


def test_silence_cannot_carry_a_reading(dataset):
    def mutate(rows):
        find(rows, "attestation_id", "att-0003")["name_original"] = "Sarmizegetusa"

    edit(dataset, "attestations", mutate)
    refuses("records a silence and cannot carry name_original")


def test_silence_cannot_carry_source_coordinates(dataset):
    def mutate(rows):
        row = find(rows, "attestation_id", "att-0004")
        row["source_lon"] = "22.78"
        row["source_lat"] = "45.51"

    edit(dataset, "attestations", mutate)
    refuses("a silence cannot carry source coordinates")


def test_named_class_requires_an_original_reading(dataset):
    def mutate(rows):
        find(rows, "attestation_id", "att-0002")["name_original"] = ""

    edit(dataset, "attestations", mutate)
    refuses("requires name_original")


def test_transliteration_cannot_replace_the_original(dataset):
    def mutate(rows):
        row = find(rows, "attestation_id", "att-0002")
        row["name_original"] = ""
        row["name_transliterated"] = "Sarmategte"

    edit(dataset, "attestations", mutate)
    refuses("transliteration cannot stand in for name_original")


def test_half_a_coordinate_pair_is_rejected(dataset):
    def mutate(rows):
        find(rows, "attestation_id", "att-0002")["source_lon"] = "22.78"

    edit(dataset, "attestations", mutate)
    refuses("must give both longitude and latitude")


def test_duplicate_claim_is_rejected(dataset):
    def mutate(rows):
        twin = dict(find(rows, "attestation_id", "att-0002"))
        twin["attestation_id"] = "att-9999"
        return rows + [twin]

    edit(dataset, "attestations", mutate)
    refuses("duplicate claim")


# --- place and source authorities (KAN-332) ---------------------------------


def test_transposed_coordinates_are_rejected(dataset):
    def mutate(rows):
        row = rows[0]
        row["ref_lon"], row["ref_lat"] = row["ref_lat"], row["ref_lon"]

    edit(dataset, "places", mutate)
    refuses("falls outside the Dacia bounding box")


def test_unverified_external_identifier_is_rejected(dataset):
    def mutate(rows):
        rows[0]["pleiades_id"] = "999999"

    edit(dataset, "places", mutate)
    refuses("recorded but not verified")


def test_source_without_scope_is_rejected(dataset):
    """Scope is what separates extra_muros from source_silent."""

    def mutate(rows):
        rows[0]["scope"] = ""

    edit(dataset, "sources", mutate)
    refuses("scope is required")


def test_disputed_date_requires_a_recorded_decision(dataset):
    def mutate(rows):
        find(rows, "source_id", "src-tabula-peutingeriana")["note"] = ""

    edit(dataset, "sources", mutate)
    refuses("disputed date requires a recorded editorial decision")


def test_exact_year_cannot_span_two_years(dataset):
    def mutate(rows):
        find(rows, "source_id", "src-vesconte-portolan")["year_to"] = "1320"

    edit(dataset, "sources", mutate)
    refuses("exact_year requires a single year")


# --- gates and campaigns (KAN-331) ------------------------------------------


def test_release_cannot_pass_while_a_blocking_gate_is_open(dataset):
    """Finished prose is not a release."""

    def mutate(rows):
        for row in rows:
            if row["trench_id"] == "ccd-a" and row["gate_id"] == "release":
                row["status"] = "passed"

    edit(dataset, "trench_gates", mutate)
    refuses("claims release while")


def test_incomplete_gate_matrix_is_rejected(dataset):
    edit(
        dataset,
        "trench_gates",
        lambda rows: [r for r in rows if not (r["trench_id"] == "ccd-c" and r["gate_id"] == "rights")],
    )
    refuses("ccd-c has no rights gate")


def test_passed_gate_must_cite_evidence(dataset):
    def mutate(rows):
        for row in rows:
            if row["trench_id"] == "ccd-a" and row["gate_id"] == "rights":
                row["evidence"] = ""

    edit(dataset, "trench_gates", mutate)
    refuses("passed gate must cite evidence")


def test_gate_evidence_must_exist_on_disk(dataset):
    def mutate(rows):
        for row in rows:
            if row["trench_id"] == "ccd-a" and row["gate_id"] == "rights":
                row["evidence"] = "public/embed/dacia/nonexistent.html"

    edit(dataset, "trench_gates", mutate)
    refuses("points at a missing path")


def test_campaign_criteria_must_cite_jira_evidence(dataset):
    def mutate(rows):
        find(rows, "campaign", "ii")["exit_evidence"] = ""

    edit(dataset, "campaigns", mutate)
    refuses("must cite at least one Jira key")


def test_verification_debt_must_block_a_real_gate(dataset):
    def mutate(rows):
        rows[0]["blocks"] = "ccd-a:prose"

    edit(dataset, "verification_debt", mutate)
    refuses("is not a trench:gate pair")


# --- the pilot freeze (KAN-333) ---------------------------------------------


def test_pilot_must_hold_forty_places(dataset):
    edit(dataset, "pilot_places", lambda rows: rows[:-1])
    refuses("the frozen pilot holds 40 places, found 39")


def test_pilot_must_cover_every_required_axis(dataset):
    def mutate(rows):
        for row in rows:
            axes = [a for a in row["selection_axis"].split("|") if a != "danube_crossing"]
            row["selection_axis"] = "|".join(axes) or "transylvanian"

    edit(dataset, "pilot_places", mutate)
    refuses("no pilot place covers the required axis 'danube_crossing'")


def test_editing_the_pilot_breaks_its_freeze(dataset):
    def mutate(rows):
        rows[0]["rationale"] = "changed after the freeze"

    edit(dataset, "pilot_places", mutate)
    refuses("changed since it was frozen")


def test_migrating_place_must_be_in_the_pilot(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-plc-apulum")["target_id"] = "plc-not-in-pilot"

    edit(dataset, "inventory", mutate)
    refuses("is absent from the frozen pilot")


def test_planned_migration_whose_target_exists_is_stale(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-src-szathmari")["target_id"] = "src-ptolemy-geographia"

    edit(dataset, "inventory", mutate)
    refuses("already exists; mark the migration done")


def test_completed_migration_must_resolve(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-src-ptolemy")["target_id"] = "src-vanished"

    edit(dataset, "inventory", mutate)
    refuses("does not resolve in data/dacia/sources.csv")


def test_retired_datum_must_record_a_reason(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-toponyms-sarmizegetusa")["note"] = ""

    edit(dataset, "inventory", mutate)
    refuses("retire requires a recorded reason")


def test_manifest_place_count_must_match(dataset):
    path = dataset / "pilot" / "pilot-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["placeCount"] = 39
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    refuses("placeCount 39 != 40 pilot rows")
