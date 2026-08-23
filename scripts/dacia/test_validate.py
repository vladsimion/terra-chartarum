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
        find(rows, "prefix", "obj")["authority_table"] = "data/dacia/places.csv"

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
        row = find(rows, "datum_id", "inv-src-secret")
        row["migration_state"] = "planned"
        row["target_id"] = "src-ptolemy-geographia"

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


# --- name uses and referent migration (KAN-336) ------------------------------


def test_every_fate_class_has_a_worked_example(dataset):
    """The fixtures the ticket asks for are the committed rows themselves."""
    _, uses = read(dataset, "name_uses")
    covered = {row["fate_class"] for row in uses}
    assert {"translatio", "restitutio", "inventio", "applicatio", "commercium"} <= covered


def test_continuity_edge_must_cite_evidence(dataset):
    def mutate(rows):
        find(rows, "edge_id", "nue-dacia-danube-north-south")["edge_kind"] = "continuity"

    edit(dataset, "name_use_edges", mutate)
    refuses("a continuity edge must cite an attestation")


def test_a_shared_string_cannot_become_continuity(dataset):
    """Roman Dacia and Scandinavian Dacia share a word and nothing else."""

    def mutate(rows):
        find(rows, "edge_id", "nue-dacia-province-scandinavia")["edge_kind"] = "continuity"

    edit(dataset, "name_use_edges", mutate)
    refuses("a lexical match alone cannot create one")


def test_revival_must_name_its_instrument(dataset):
    def mutate(rows):
        find(rows, "edge_id", "nue-napoca-roman-restored")["evidence_note"] = ""

    edit(dataset, "name_use_edges", mutate)
    refuses("must name the instrument that reinstated the name")


def test_edge_must_resolve_to_a_use(dataset):
    def mutate(rows):
        rows[0]["to_name_use"] = "nmu-does-not-exist"

    edit(dataset, "name_use_edges", mutate)
    refuses("does not resolve")


def test_edge_cannot_join_a_use_to_itself(dataset):
    def mutate(rows):
        rows[0]["to_name_use"] = rows[0]["from_name_use"]

    edit(dataset, "name_use_edges", mutate)
    refuses("cannot join a use to itself")


def test_shared_lexical_form_must_be_adjudicated(dataset):
    """A use that shares a string with another may not float unlinked."""
    edit(
        dataset,
        "name_use_edges",
        lambda rows: [
            r
            for r in rows
            if "nmu-dacia-marque" not in (r["from_name_use"], r["to_name_use"])
        ],
    )
    refuses("is joined to none of them")


def test_settlement_referent_must_resolve_to_a_place(dataset):
    def mutate(rows):
        find(rows, "name_use_id", "nmu-napoca-roman")["referent_place_id"] = ""

    edit(dataset, "name_uses", mutate)
    refuses("a settlement referent must resolve to a place")


def test_use_needs_a_source_or_an_institution(dataset):
    def mutate(rows):
        row = find(rows, "name_use_id", "nmu-dacia-aureliana")
        row["institution"] = ""
        row["source_id"] = ""

    edit(dataset, "name_uses", mutate)
    refuses("needs either a source or an institution")


def test_undated_use_cannot_carry_a_period(dataset):
    def mutate(rows):
        row = find(rows, "name_use_id", "nmu-dacia-reception")
        row["date_precision"] = "undated"

    edit(dataset, "name_uses", mutate)
    refuses("an undated use cannot carry a period")


def test_terminus_post_quem_keeps_its_upper_bound_open(dataset):
    def mutate(rows):
        find(rows, "name_use_id", "nmu-napoca-restored")["period_to"] = "2026"

    edit(dataset, "name_uses", mutate)
    refuses("terminus_post_quem needs an open upper bound")


# --- compiled authorities and raw capture (KAN-334, KAN-335) -----------------


def test_unlocated_place_cannot_carry_coordinates(dataset):
    """Publishing one candidate site would turn an open question into a point."""

    def mutate(rows):
        row = find(rows, "place_id", "plc-vicina")
        row["ref_lon"] = "28.5"
        row["ref_lat"] = "45.0"

    edit(dataset, "places", mutate)
    refuses("an unlocated place cannot carry ref_lon")


def test_located_place_must_carry_coordinates(dataset):
    def mutate(rows):
        find(rows, "place_id", "plc-apulum")["ref_lon"] = ""

    edit(dataset, "places", mutate)
    refuses("ref_lon is required")


def test_unlocated_place_must_record_why(dataset):
    def mutate(rows):
        find(rows, "place_id", "plc-vicina")["note"] = ""

    edit(dataset, "places", mutate)
    refuses("an unlocated place must record why")


def test_pilot_and_authority_must_not_drift(dataset):
    def mutate(rows):
        find(rows, "place_id", "plc-apulum")["region"] = "banat"

    edit(dataset, "pilot_places", mutate)
    refuses("disagrees with places.csv")


def test_source_families_must_be_varied(dataset):
    def mutate(rows):
        for row in rows:
            row["source_family"] = "itinerary"

    edit(dataset, "sources", mutate)
    refuses("at least 4 source families")


def test_reviewed_source_requires_an_object_identifier(dataset):
    def mutate(rows):
        row = find(rows, "source_id", "src-hereford-mappa")
        row["review_state"] = "reviewed"
        row["normalization_method"] = "manual"
        row["reviewer"] = "V. Simion"
        row["review_date"] = "2026-08-09"

    edit(dataset, "sources", mutate)
    refuses("a reviewed source requires repository_object_id")


def test_reading_requires_a_transcription(dataset):
    edit(dataset, "transcriptions", lambda rows: [r for r in rows if r["attestation_id"] != "att-0002"])
    refuses("requires a transcription recording how it was captured")


def test_transcription_must_resolve_to_an_attestation(dataset):
    def mutate(rows):
        rows[0]["attestation_id"] = "att-9999"

    edit(dataset, "transcriptions", mutate)
    refuses("does not resolve to an attestation")


def test_migrated_cell_count_must_match_its_state(dataset):
    """A set with cells neither migrated nor declared local is not finished."""

    def mutate(rows):
        find(rows, "datum_id", "inv-att-apulum")["migrated_cells"] = "11"

    edit(dataset, "inventory", mutate)
    refuses("cells migrated (1 local) is 'partial'")


def test_cells_kept_local_complete_a_migration(dataset):
    """KAN-338: the Present Survey stratum is rhetorical and never migrates, so a
    set is finished once every cell is either across or declared local."""
    assert validate_inputs() == []

    def mutate(rows):
        find(rows, "datum_id", "inv-att-apulum")["local_cells"] = ""

    edit(dataset, "inventory", mutate)
    refuses("cells migrated (0 local) is 'partial'")


def test_local_cells_require_a_recorded_reason(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-att-drobeta")["note"] = ""

    edit(dataset, "inventory", mutate)
    refuses("cells kept local require a recorded reason")


def test_cells_cannot_be_counted_twice(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-att-napoca")["local_cells"] = "2"

    edit(dataset, "inventory", mutate)
    refuses("12 migrated and 2 local exceed cell_count 13")


def test_only_an_attestation_set_counts_cells(dataset):
    def mutate(rows):
        find(rows, "datum_id", "inv-src-ptolemy")["local_cells"] = "1"

    edit(dataset, "inventory", mutate)
    refuses("only an attestation set counts cells")


def test_manifest_place_count_must_match(dataset):
    path = dataset / "pilot" / "pilot-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["placeCount"] = 39
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    refuses("placeCount 39 != 40 pilot rows")


# --- research source ledgers (KAN-348, KAN-351) -----------------------------


def test_hiatus_candidate_cannot_claim_meaningful_silence(dataset):
    def mutate(rows):
        find(rows, "witness_id", "hw-charters")["silence_assessment"] = "meaningful_silence"

    edit(dataset, "hiatus_witness_families", mutate)
    refuses("meaningful_silence requires a reviewed witness")


def test_hiatus_not_applicable_is_not_general_evidence(dataset):
    def mutate(rows):
        find(rows, "witness_id", "hw-fiscal")["applicability"] = "applicable"

    edit(dataset, "hiatus_witness_families", mutate)
    refuses("not_applicable silence cannot claim general applicability")


def test_hiatus_family_needs_a_survival_limit(dataset):
    def mutate(rows):
        find(rows, "witness_id", "hw-chronicles")["survival_limitations"] = ""

    edit(dataset, "hiatus_witness_families", mutate)
    refuses("survival_limitations is required")


def test_treaty_ambiguity_must_record_alternatives(dataset):
    def mutate(rows):
        find(rows, "source_id", "tf-paris-1856")["alternatives"] = ""

    edit(dataset, "treaty_frontier_sources", mutate)
    refuses("ambiguous interpretation requires alternatives")


def test_treaty_source_cannot_claim_unreviewed_authoritative_geometry(dataset):
    def mutate(rows):
        find(rows, "source_id", "tf-trianon-1920")[
            "geometry_status"
        ] = "authoritative_modern_gis"

    edit(dataset, "treaty_frontier_sources", mutate)
    refuses("is not an approved pre-digitisation state")


def test_treaty_source_types_cannot_be_conflated(dataset):
    def mutate(rows):
        find(rows, "source_id", "tf-armistice-1944")[
            "record_type"
        ] = "final_treaty_or_armistice"

    edit(dataset, "treaty_frontier_sources", mutate)
    refuses("record_type 'final_treaty_or_armistice' is not recognised")


def test_hiatus_minimum_set_is_hash_frozen(dataset):
    def mutate(rows):
        find(rows, "witness_id", "hw-charters")["historical_question"] = "silently changed"

    edit(dataset, "hiatus_witness_families", mutate)
    refuses("ledger changed since the minimum set was frozen")


def test_treaty_minimum_ids_match_marked_rows(dataset):
    def mutate(rows):
        find(rows, "source_id", "tf-bucharest-1913")["minimum_set"] = "no"

    edit(dataset, "treaty_frontier_sources", mutate)
    refuses("minimumIds do not match rows marked minimum_set=yes")


# --- research packages (KAN-349, KAN-354, KAN-357) -------------------------


def test_hiatus_taxonomy_requires_every_absence_class(dataset):
    edit(
        dataset,
        "hiatus_absence_classes",
        lambda rows: [row for row in rows if row["absence_class"] != "not_named"],
    )
    refuses("missing required classes")


def test_hiatus_timeline_cannot_assign_source_silent(dataset):
    def mutate(rows):
        find(rows, "state_id", "hs-charters")["absence_class"] = "source_silent"

    edit(dataset, "hiatus_timeline", mutate)
    refuses("source_silent is not a Hiatus timeline class")


def test_hiatus_not_named_requires_reviewed_scope(dataset):
    def mutate(rows):
        find(rows, "state_id", "hs-charters")["absence_class"] = "not_named"

    edit(dataset, "hiatus_timeline", mutate)
    refuses("not_named requires reviewed source scope")


def test_hiatus_state_must_resolve_to_witness(dataset):
    def mutate(rows):
        find(rows, "state_id", "hs-charters")["witness_id"] = "hw-missing"

    edit(dataset, "hiatus_timeline", mutate)
    refuses("witness_id 'hw-missing' does not resolve")


def test_carta_map_derivation_must_resolve_to_statistics(dataset):
    def mutate(rows):
        find(rows, "source_id", "cr-map-kaba-1919")["derived_from"] = "cr-map-teleki-1920"

    edit(dataset, "carta_rubra_sources", mutate)
    refuses("derived_from must resolve to a statistical_table")


def test_carta_production_map_requires_global_reuse_rights(dataset):
    def mutate(rows):
        find(rows, "source_id", "cr-map-teleki-1920")["production_role"] = "production_primary"

    edit(dataset, "carta_rubra_sources", mutate)
    refuses("production role requires production-wide reuse rights")


def test_carta_claim_requires_an_actor(dataset):
    def mutate(rows):
        find(rows, "claim_id", "cc-teleki-density")["actor"] = ""

    edit(dataset, "carta_rubra_claims", mutate)
    refuses("actor is required")


def test_teaching_copy_cannot_become_a_borroczyn_production_source(dataset):
    def mutate(rows):
        find(rows, "source_id", "br-borroczyn-1852-uauim")[
            "production_role"
        ] = "production_fallback"

    edit(dataset, "borroczyn_seam_sources", mutate)
    refuses("production role requires production-wide reuse rights")


def test_borroczyn_seam_cannot_claim_complete_city_coverage(dataset):
    path = dataset / "reference" / "borroczyn-seam.geojson"
    geojson = json.loads(path.read_text(encoding="utf-8"))
    geojson["metadata"]["completeCityCoverage"] = True
    path.write_text(json.dumps(geojson, indent=2) + "\n", encoding="utf-8")
    refuses("complete-city coverage must remain explicitly false")


def test_research_package_is_hash_frozen(dataset):
    def mutate(rows):
        find(rows, "state_id", "hs-charters")["notes"] = "silently changed"

    edit(dataset, "hiatus_timeline", mutate)
    refuses("package changed since it was frozen")


# --- shared GIS layers (KAN-341, KAN-342, KAN-343) ---------------------------


def edit_geojson(dataset: Path, name: str, mutate) -> None:
    path = dataset / "gis" / f"{name}.geojson"
    payload = json.loads(path.read_text(encoding="utf-8"))
    mutate(payload)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def test_roman_site_must_resolve_to_a_corpus_place(dataset):
    """The baseline never authors a position the corpus already holds."""

    def mutate(rows):
        find(rows, "feature_id", "rd-site-apulum")["place_id"] = "plc-does-not-exist"

    edit(dataset, "roman_dacia", mutate)
    refuses("a site must resolve to a CND place")


def test_roman_road_needs_two_stations(dataset):
    def mutate(rows):
        find(rows, "feature_id", "rd-road-mures")["via_place_ids"] = "plc-micia"

    edit(dataset, "roman_dacia", mutate)
    refuses("a road needs at least two stations")


def test_roman_feature_cannot_claim_it_was_digitised(dataset):
    """Nothing here is traced from a source sheet, and the rule says so."""

    def mutate(rows):
        find(rows, "feature_id", "rd-limes-alutanus")["geometry_provenance"] = "source_geometry"

    edit(dataset, "roman_dacia", mutate)
    refuses("would claim it is")


def test_limes_without_drawn_geometry_is_rejected(dataset):
    edit_geojson(
        dataset,
        "roman-dacia-lines",
        lambda payload: payload["features"].clear(),
    )
    refuses("no drawn geometry for this corridor")


def test_drawn_geometry_without_a_row_is_rejected(dataset):
    def mutate(payload):
        orphan = json.loads(json.dumps(payload["features"][0]))
        orphan["id"] = "rd-limes-invented"
        payload["features"].append(orphan)

    edit_geojson(dataset, "roman-dacia-lines", mutate)
    refuses("has no row in roman-dacia.csv")


def test_drawn_geometry_must_admit_it_is_not_surveyed(dataset):
    edit_geojson(
        dataset,
        "roman-dacia-lines",
        lambda payload: payload["metadata"].update({"surveyedGeometry": True}),
    )
    refuses("surveyedGeometry must be explicitly false")


def test_principality_phases_of_one_polity_cannot_overlap(dataset):
    """An overlap means a boundary was moved on one side of a treaty only."""

    def mutate(rows):
        find(rows, "phase_id", "pp-wallachia-1526")["valid_to"] = "1750"

    edit(dataset, "principalities", mutate)
    refuses("overlap")


def test_principality_phase_must_begin_at_its_instrument(dataset):
    def mutate(rows):
        find(rows, "phase_id", "pp-wallachia-1718")["instrument_year"] = "1700"

    edit(dataset, "principalities", mutate)
    refuses("must begin at the instrument that opened it")


def test_contested_territory_cannot_name_one_suzerain(dataset):
    def mutate(rows):
        find(rows, "phase_id", "pp-transylvania-1526")["suzerain"] = "Habsburg Monarchy"

    edit(dataset, "principalities", mutate)
    refuses("cannot name a single suzerain")


def test_principality_envelope_must_admit_it_is_editorial(dataset):
    def mutate(rows):
        find(rows, "phase_id", "pp-moldavia-1812")["geometry_provenance"] = "modern_reference"

    edit(dataset, "principalities", mutate)
    refuses("must say so")


def test_principality_geometry_cannot_come_from_modern_borders(dataset):
    edit_geojson(
        dataset,
        "principalities",
        lambda payload: payload["metadata"].update({"derivedFromModernBorders": True}),
    )
    refuses("derivedFromModernBorders must be explicitly false")


def test_principality_ring_must_be_closed(dataset):
    def mutate(payload):
        payload["features"][0]["geometry"]["coordinates"][0].pop()

    edit_geojson(dataset, "principalities", mutate)
    refuses("ring is not closed")


def test_sheet_cannot_cover_a_place_outside_its_footprint(dataset):
    """Whichever of the two is wrong, the claim is one the sheet cannot support."""

    def mutate(rows):
        find(rows, "sheet_id", "js-c05-s06")["covers_place_ids"] = "plc-drobeta"

    edit(dataset, "josephinian_sheets", mutate)
    refuses("lies outside the footprint")


def test_sheet_index_redistributes_no_scan(dataset):
    def mutate(rows):
        find(rows, "sheet_id", "js-c05-s06")["scan_redistributed"] = "yes"

    edit(dataset, "josephinian_sheets", mutate)
    refuses("redistributes no scan")


def test_reviewed_sheet_must_carry_its_archive_identifier(dataset):
    def mutate(rows):
        find(rows, "sheet_id", "js-c05-s06")["review_status"] = "reviewed"

    edit(dataset, "josephinian_sheets", mutate)
    refuses("must carry its archive identifier")


def test_sheet_footprint_needs_extent(dataset):
    def mutate(rows):
        row = find(rows, "sheet_id", "js-c05-s06")
        row["east"] = row["west"]

    edit(dataset, "josephinian_sheets", mutate)
    refuses("the footprint has no extent")


# --- Nomen Errans ledger and rights package (KAN-344) ------------------------


def test_witness_must_illustrate_a_name_use(dataset):
    """A candidate witness is a candidate *for* an argument, not decoration."""

    def mutate(rows):
        find(rows, "witness_id", "ne-ortelius-parergon")["name_use_id"] = "nmu-does-not-exist"

    edit(dataset, "nomen_errans_witnesses", mutate)
    refuses("name_use_id 'nmu-does-not-exist' does not resolve")


def test_witness_planned_into_the_page_needs_open_rights(dataset):
    def mutate(rows):
        row = find(rows, "witness_id", "ne-hereford-mappa")
        row["production_role"] = "production_primary"
        row["resolution_status"] = "sufficient"
        row["repository_object_id"] = "MS-1"

    edit(dataset, "nomen_errans_witnesses", mutate)
    refuses("production role requires production-wide reuse rights")


def test_witness_planned_into_the_page_needs_a_resolved_reproduction(dataset):
    def mutate(rows):
        row = find(rows, "witness_id", "ne-notitia-page")
        row["production_role"] = "production_fallback"
        row["rights_status"] = "no_known_restrictions"
        row["repository_object_id"] = "seeck-1876"

    edit(dataset, "nomen_errans_witnesses", mutate)
    refuses("production role requires sufficient resolution")


def test_witness_planned_into_the_page_needs_an_object_identifier(dataset):
    def mutate(rows):
        row = find(rows, "witness_id", "ne-notitia-page")
        row["production_role"] = "production_fallback"
        row["rights_status"] = "no_known_restrictions"
        row["resolution_status"] = "sufficient"

    edit(dataset, "nomen_errans_witnesses", mutate)
    refuses("production role requires a repository object identifier")


def test_witness_needs_an_object_identifier_or_pending(dataset):
    def mutate(rows):
        find(rows, "witness_id", "ne-dacia-coin")["repository_object_id"] = ""

    edit(dataset, "nomen_errans_witnesses", mutate)
    refuses("repository_object_id is required, pending if unknown")



def test_a_pending_locator_cannot_be_normalized(dataset):
    """The rule that keeps institution-only uses honest about what they lack."""

    def mutate(rows):
        find(rows, "name_use_id", "nmu-dacia-marque-renault")["review_state"] = "normalized"

    edit(dataset, "name_uses", mutate)
    refuses("locator is still pending at review_state normalized")


def test_an_obvious_line_still_cannot_be_continuity_without_evidence(dataset):
    """The marque under Renault is plainly the same marque, and that is not evidence."""

    def mutate(rows):
        find(rows, "edge_id", "nue-dacia-marque-renault")["edge_kind"] = "continuity"

    edit(dataset, "name_use_edges", mutate)
    refuses("a continuity edge must cite an attestation")


# --- treaty frontier phases (KAN-352, KAN-353) -------------------------------


def test_frontier_line_cannot_claim_it_was_digitised(dataset):
    """The ledger says no instrument here has usable delimitation geometry."""

    def mutate(rows):
        find(rows, "segment_id", "tf-seg-danube-1829")["geometry_provenance"] = "source_geometry"

    edit(dataset, "treaty_frontier", mutate)
    refuses("would overstate this line")


def test_frontier_line_must_say_when_it_began(dataset):
    def mutate(rows):
        find(rows, "segment_id", "tf-seg-danube-1829")["valid_from"] = ""

    edit(dataset, "treaty_frontier", mutate)
    refuses("must say when it began")


def test_frontier_phase_cannot_end_before_it_starts(dataset):
    def mutate(rows):
        find(rows, "segment_id", "tf-seg-dobrudja-1878")["valid_to"] = "1800"

    edit(dataset, "treaty_frontier", mutate)
    refuses("the phase ends before it starts")


def test_competing_lines_must_name_each_other(dataset):
    """Two lines for one moment are a disagreement, declared on both sides."""

    def mutate(rows):
        find(rows, "segment_id", "tf-seg-transylvania-1920")["alternative_of"] = ""

    edit(dataset, "treaty_frontier", mutate)
    refuses("must name what it competes with")


def test_a_phase_cannot_hold_two_instruments(dataset):
    """A competing line is a proposal or a reconstruction, never a second treaty."""

    def mutate(rows):
        find(rows, "segment_id", "tf-seg-transylvania-1920-demartonne")["line_type"] = "treaty_line"

    edit(dataset, "treaty_frontier", mutate)
    refuses("not a second instrument")


def test_an_alternative_must_contest_the_same_phase(dataset):
    def mutate(rows):
        row = find(rows, "segment_id", "tf-seg-transylvania-1920-demartonne")
        row["phase_id"] = "tfp-1947-paris"

    edit(dataset, "treaty_frontier", mutate)
    refuses("must contest the same phase")


def test_frontier_source_must_resolve_in_its_named_ledger(dataset):
    """The proposal is cited from the Carta Rubra ledger, not the treaty one."""

    def mutate(rows):
        row = find(rows, "segment_id", "tf-seg-transylvania-1920-demartonne")
        row["source_ledger"] = "treaty_frontier_sources"

    edit(dataset, "treaty_frontier", mutate)
    refuses("does not resolve in treaty_frontier_sources")


def test_frontier_geometry_without_a_row_is_rejected(dataset):
    def mutate(payload):
        orphan = json.loads(json.dumps(payload["features"][0]))
        orphan["id"] = "tf-seg-invented"
        payload["features"].append(orphan)

    edit_geojson(dataset, "treaty-frontier", mutate)
    refuses("has no row in treaty-frontier.csv")


# --- acquisition dossiers (KAN-363) ------------------------------------------


def test_recommendation_must_identify_what_it_recommends(dataset):
    def mutate(rows):
        find(rows, "dossier_id", "acq-zatta-transilvania")["acquisition_status"] = "recommended"

    edit(dataset, "acquisition_dossiers", mutate)
    refuses("must identify what it recommends")


def test_verified_dossier_cannot_leave_identity_pending(dataset):
    """The dangerous case: filled in enough to look checked, and unchecked."""

    def mutate(rows):
        find(rows, "dossier_id", "acq-sanson-dacia")["verification_state"] = "verified"

    edit(dataset, "acquisition_dossiers", mutate)
    refuses("cannot leave")


def test_ptolemaic_plate_number_needs_its_edition(dataset):
    """Tabula Europae numbering is not stable across editions."""

    def mutate(rows):
        find(rows, "dossier_id", "acq-ptolemaic-dacia")["plate_number"] = "Tabula Europae IX"

    edit(dataset, "acquisition_dossiers", mutate)
    refuses("without the edition it is numbered in")


def test_priority_family_dossier_cannot_be_dropped(dataset):
    """The Schwantz dossier exists whether or not a copy is ever purchasable."""
    edit(
        dataset,
        "acquisition_dossiers",
        lambda rows: [r for r in rows if r["family"] != "schwantz_oltenia"],
    )
    refuses("require a 'schwantz_oltenia' dossier")


def test_scholarly_validity_is_required_whatever_the_acquisition_state(dataset):
    """Buying a map does not make it evidence, and declining one does not unmake it."""

    def mutate(rows):
        row = find(rows, "dossier_id", "acq-schwantz-oltenia")
        row["acquisition_status"] = "declined"
        row["scholarly_validity"] = ""

    edit(dataset, "acquisition_dossiers", mutate)
    refuses("scholarly_validity is not recognised")
