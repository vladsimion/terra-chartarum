#!/usr/bin/env python3
"""Regression tests for the Hanseatic promotion rules (KAN-303 / 304 / 305).

The promotion rules in build.py exist to stop research-in-progress being
published as settled fact: a row may sit unfinished for as long as it likes,
but the moment it claims to be verified, reviewed or approved, every field the
claim rests on has to be real. Those rules are the kind that only ever fire on
data nobody has written yet, so they are exactly the kind that rot silently.
Each test here takes the committed sources, breaks one rule, and asserts that
`validate_inputs()` refuses the result.

`validate_inputs()` reads module-level path constants, so every test works on a
private copy of data/hanseatic/sources with those constants repointed at it.
Only the CSVs are redirected; ROUTE_PATHS still reads the committed trace,
which no test needs to touch.

Run with `make hanseatic-test` (or `python3 -m pytest scripts/hanseatic`).
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import (  # noqa: E402
    PENDING,
    SOURCE_DIR,
    validate_inputs,
)
import build  # noqa: E402

# Filename -> the build.py constant that points at it.
CSV_CONSTANTS = {
    "places.csv": "PLACES_CSV",
    "routes.csv": "ROUTES_CSV",
    "sources.csv": "SOURCES_CSV",
    "evidence.csv": "EVIDENCE_CSV",
    "terminology.csv": "TERMINOLOGY_CSV",
    "corpus.csv": "CORPUS_CSV",
    "chronology.csv": "CHRONOLOGY_CSV",
    "kontore.csv": "KONTORE_CSV",
    "temporal-exceptions.csv": "TEMPORAL_EXCEPTIONS_CSV",
}

# A witness whose provenance has been fully established, used to isolate one
# promotion rule at a time from the "still pending" complaints.
RESOLVED_PROVENANCE = {
    "date_made": "1475",
    "repository": "Test Repository",
    "repository_id": "TEST-1",
    "stable_url": "https://example.invalid/object/1",
    "iiif_manifest": "https://example.invalid/object/1/manifest.json",
    "resolution": "4000x3000",
    "attribution": "Test Repository, public domain",
    "provenance_class": "repository",
    "verified_on": "2026-08-06",
}


@pytest.fixture
def sources(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Copy the committed sources somewhere writable and repoint build.py at it."""
    workdir = tmp_path / "sources"
    shutil.copytree(SOURCE_DIR, workdir)
    for filename, constant in CSV_CONSTANTS.items():
        monkeypatch.setattr(build, constant, workdir / filename)
    return workdir


def edit_row(path: Path, key_value: str, changes: dict[str, str]) -> None:
    """Apply `changes` to the one row whose first column equals `key_value`."""
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)
    key_field = fieldnames[0]
    matches = [row for row in rows if row[key_field] == key_value]
    assert len(matches) == 1, f"{path.name}: '{key_value}' matched {len(matches)} rows"
    unknown = set(changes) - set(fieldnames)
    assert not unknown, f"{path.name}: no such column(s) {sorted(unknown)}"
    matches[0].update(changes)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def add_source(path: Path, key: str, source_type: str) -> None:
    """Append a source row, so evidence tests can cite something that is not the spec."""
    with path.open(newline="", encoding="utf-8") as handle:
        fieldnames = list(csv.DictReader(handle).fieldnames or [])
    with path.open("a", newline="", encoding="utf-8") as handle:
        csv.DictWriter(handle, fieldnames=fieldnames).writerow(
            {
                "key": key,
                "short_citation": "Test scholarly witness",
                "full_citation": "A Test Author, A Test Monograph (Test City, 1900)",
                "url": "https://example.invalid/monograph",
                "license": "in copyright",
                "accessed": "2026-08-06",
                "source_type": source_type,
            }
        )


def matching(errors: list[str], fragment: str) -> list[str]:
    return [error for error in errors if fragment in error]


def test_committed_sources_validate() -> None:
    """The baseline every other test depends on: unmutated sources are clean."""
    assert validate_inputs() == []


def test_copied_sources_validate(sources: Path) -> None:
    """And the tmp-dir copy behaves identically, so failures below are the mutation."""
    assert sources.joinpath("corpus.csv").exists()
    assert validate_inputs() == []


# --- corpus: verification is a claim about provenance (KAN-303) ----------------


def test_verified_witness_may_not_leave_provenance_pending(sources: Path) -> None:
    """A row cannot be called verified while the fields verification means are pending."""
    pending_fields = {
        "repository",
        "repository_id",
        "stable_url",
        "resolution",
        "attribution",
        "verified_on",
        "date_made",
    }
    edit_row(
        sources / "corpus.csv",
        "hse-obj-lubeck-view",
        {
            # Blank the provenance explicitly rather than relying on this row
            # still being unresearched. Verification fills rows in as it goes,
            # so a test that assumes a particular row is empty stops testing
            # anything the moment that row is done.
            **{field: PENDING for field in pending_fields},
            # Rights and provenance_class are cleared so that only the
            # pending-field rule can fire.
            "verification_status": "verified",
            "rights_statement": "public_domain",
            "provenance_class": "repository",
        },
    )
    errors = validate_inputs()

    reported = matching(errors, "verified witness still has")
    assert len(reported) == len(pending_fields), errors
    for field in pending_fields:
        assert matching(errors, f"'{field}' pending"), f"{field} not reported: {errors}"


def test_verified_witness_may_not_leave_provenance_class_pending(sources: Path) -> None:
    edit_row(
        sources / "corpus.csv",
        "hse-obj-lubeck-view",
        {
            **RESOLVED_PROVENANCE,
            "provenance_class": PENDING,
            "rights_statement": "public_domain",
            "verification_status": "verified",
        },
    )
    assert matching(validate_inputs(), "verified witness has no provenance_class")


@pytest.mark.parametrize("rights", ["in_copyright", "rights_unknown", PENDING])
def test_verified_witness_needs_open_rights(sources: Path, rights: str) -> None:
    """Verification without a cleared licence is not publishable (OPEN_RIGHTS)."""
    edit_row(
        sources / "corpus.csv",
        "hse-obj-lubeck-view",
        {
            **RESOLVED_PROVENANCE,
            "rights_statement": rights,
            "verification_status": "verified",
        },
    )
    errors = validate_inputs()
    assert matching(errors, "needs a cleared rights statement"), errors
    assert matching(errors, f"found '{rights}'"), errors


@pytest.mark.parametrize("rights", sorted(build.OPEN_RIGHTS))
def test_fully_resolved_open_rights_witness_is_accepted(sources: Path, rights: str) -> None:
    """The mirror image: a genuinely finished row promotes without complaint."""
    edit_row(
        sources / "corpus.csv",
        "hse-obj-lubeck-view",
        {
            **RESOLVED_PROVENANCE,
            "rights_statement": rights,
            "verification_status": "verified",
        },
    )
    assert validate_inputs() == []


def test_dealer_provenance_may_not_be_a_published_witness(sources: Path) -> None:
    """A dealer listing may be consulted but never cited as the witness."""
    edit_row(
        sources / "corpus.csv",
        "hse-obj-rudimentum-mappa",  # corpus_role 'hero'
        {"provenance_class": "dealer"},
    )
    errors = validate_inputs()
    assert matching(errors, "dealer provenance may only be corpus_role"), errors


def test_dealer_provenance_is_allowed_as_reference_only(sources: Path) -> None:
    edit_row(
        sources / "corpus.csv",
        "hse-obj-rudimentum-mappa",
        {"provenance_class": "dealer", "corpus_role": "reference_only"},
    )
    assert validate_inputs() == []


# --- kontore: deprecated vocabulary and promotion (KAN-305) --------------------


@pytest.mark.parametrize(
    ("deprecated", "replacement"),
    [("colony", "merchant_compound"), ("factory", "merchant_compound")],
)
def test_deprecated_legal_status_is_rejected_by_name(
    sources: Path, deprecated: str, replacement: str
) -> None:
    """'colony' imports a sovereignty the Kontore never held; the error must say so."""
    edit_row(sources / "kontore.csv", "hse-kontor-london", {"legal_status": deprecated})
    errors = validate_inputs()
    assert matching(errors, f"'{deprecated}' is deprecated vocabulary"), errors
    assert matching(errors, f"use '{replacement}'"), errors


@pytest.mark.parametrize("review_status", ["reviewed", "approved"])
def test_kontor_may_not_be_promoted_while_its_profile_is_pending(
    sources: Path, review_status: str
) -> None:
    """Everything KontorProfile renders has to be real before the row leaves provisional."""
    pending_fields = {
        "place_id",
        "valid_from",
        "valid_to",
        "status_phase",
        "spatial_setting",
        "regulations",
        "commodities",
        "profile_summary",
    }
    edit_row(
        sources / "kontore.csv",
        "hse-kontor-novgorod",
        {
            # Blanked explicitly, for the same reason as the corpus test: KAN-305
            # will fill these rows in, and a test that assumes they are empty
            # would quietly stop testing the rule at exactly that point.
            # primary_witness is left alone; it is already filled on this row.
            **{field: PENDING for field in pending_fields},
            "review_status": review_status,
        },
    )
    errors = validate_inputs()

    reported = matching(errors, "reviewed Kontor still has")
    assert len(reported) == len(pending_fields), errors
    for field in pending_fields:
        assert matching(errors, f"'{field}' pending"), f"{field} not reported: {errors}"


# --- chronology: open dates and disputed dates (KAN-304) ----------------------


@pytest.mark.parametrize("review_status", ["reviewed", "approved"])
def test_chronology_may_not_be_promoted_with_pending_years(
    sources: Path, review_status: str
) -> None:
    """An undated event is only honest while it is still provisional."""
    edit_row(
        sources / "chronology.csv",
        "hse-event-hanse-term-shift",
        # A real claim_id keeps the parallel 'reviewed event must cite a claim_id'
        # rule quiet, so only the pending-years rule can fire.
        {"review_status": review_status, "claim_id": "hse-claim-lubeck-leading"},
    )
    errors = validate_inputs()
    assert matching(errors, "cannot leave years pending once reviewed"), errors


def test_chronology_years_must_be_set_or_pending_together(sources: Path) -> None:
    edit_row(sources / "chronology.csv", "hse-event-hanse-term-shift", {"year_from": "1356"})
    errors = validate_inputs()
    assert matching(errors, "must both be set or both pending"), errors


@pytest.mark.parametrize("decision", [PENDING, ""])
def test_disputed_date_needs_a_logged_editorial_decision(sources: Path, decision: str) -> None:
    """A dispute is only 'logged' if the disagreement is actually written down."""
    edit_row(
        sources / "chronology.csv",
        "hse-event-first-hansetag",  # date_type 'disputed'
        {"editorial_decision": decision},
    )
    errors = validate_inputs()
    assert matching(errors, "disputed date needs an editorial_decision"), errors


# --- evidence: what may support an approved claim (KAN-304) -------------------


@pytest.mark.parametrize("locator_type", ["section", "none"])
def test_high_importance_claim_needs_a_page_or_folio(sources: Path, locator_type: str) -> None:
    """A load-bearing claim is only approvable on a page- or folio-level locator."""
    add_source(sources / "sources.csv", "hse-src-test-monograph", "monograph")
    edit_row(
        sources / "evidence.csv",
        "hse-claim-lubeck-leading",
        {
            "source_key": "hse-src-test-monograph",
            "importance": "high",
            "locator_type": locator_type,
            "review_status": "approved",
        },
    )
    errors = validate_inputs()
    assert matching(errors, "a page or folio is required"), errors


@pytest.mark.parametrize("locator_type", ["page", "folio"])
def test_high_importance_claim_on_a_page_locator_is_accepted(
    sources: Path, locator_type: str
) -> None:
    add_source(sources / "sources.csv", "hse-src-test-monograph", "monograph")
    edit_row(
        sources / "evidence.csv",
        "hse-claim-lubeck-leading",
        {
            "source_key": "hse-src-test-monograph",
            "importance": "high",
            "locator_type": locator_type,
            "review_status": "approved",
        },
    )
    assert validate_inputs() == []


def test_project_specification_cannot_support_an_approved_claim(sources: Path) -> None:
    """Our own planning document is not historical evidence for anything."""
    edit_row(
        sources / "evidence.csv",
        "hse-claim-lubeck-leading",  # cites hse-src-spec, a project_specification
        {"review_status": "approved"},
    )
    errors = validate_inputs()
    assert matching(errors, "is a project document"), errors
    assert matching(errors, "cannot be the evidence for an approved claim"), errors


def test_project_specification_may_still_support_a_provisional_claim(sources: Path) -> None:
    """The rule gates approval, not the fixture data the slice currently ships."""
    assert validate_inputs() == []


# --- places: deprecated participation vocabulary (KAN-304) --------------------


def test_deprecated_participation_class_is_rejected_by_name(sources: Path) -> None:
    """'member_city' implies a membership roll the League never maintained."""
    edit_row(
        sources / "places.csv",
        "hse-place-lubeck-leading-1358",
        {"participation_class": "member_city"},
    )
    errors = validate_inputs()
    assert matching(errors, "'member_city' is deprecated vocabulary"), errors
    assert matching(errors, "use 'documented_collective_participation'"), errors


def test_unknown_participation_class_is_rejected(sources: Path) -> None:
    edit_row(
        sources / "places.csv",
        "hse-place-lubeck-leading-1358",
        {"participation_class": "hanseatic_member"},
    )
    errors = validate_inputs()
    assert matching(errors, "is not an approved participation term"), errors


# --- geometry: EPSG:4326 degrees inside the HSE envelope (KAN-307) -------------


def test_transposed_coordinates_are_rejected_by_the_bbox(sources: Path) -> None:
    """A swapped lat/lon stays inside the global range, so only the bbox catches it."""
    edit_row(
        sources / "places.csv",
        "hse-place-lubeck-leading-1358",
        {"latitude": "10.6866", "longitude": "53.8655"},
    )
    errors = validate_inputs()
    assert matching(errors, "outside the HSE bbox"), errors
    assert matching(errors, "transposed longitude/latitude"), errors


def test_coordinates_outside_the_hanseatic_world_are_rejected(sources: Path) -> None:
    edit_row(
        sources / "places.csv",
        "hse-place-lubeck-leading-1358",
        {"latitude": "-33.9", "longitude": "18.4"},  # Cape Town
    )
    assert matching(validate_inputs(), "outside the HSE bbox"), validate_inputs()


# --- phases: one place holds one role at a time (KAN-307) ----------------------


def test_overlapping_phases_for_one_place_are_rejected(sources: Path) -> None:
    """Visby's phase is widened until it overlaps nothing else; Lübeck's is not.

    Lübeck runs 1358-1669, so pulling Visby's phase over that window while
    repointing it at Lübeck produces a genuine overlap on one place_id.
    """
    edit_row(
        sources / "places.csv",
        "hse-place-visby-market-1161",
        {"place_id": "lubeck", "valid_from": "1400", "valid_to": "1500"},
    )
    errors = validate_inputs()
    assert matching(errors, "overlaps"), errors
    assert matching(errors, "for place 'lubeck'"), errors


# --- temporal exceptions must be logged decisions (KAN-309) -------------------


def test_route_outside_its_endpoints_needs_a_logged_exception(sources: Path) -> None:
    """Removing the logged exception makes the existing mismatch fail the build."""
    path = sources / "temporal-exceptions.csv"
    header = path.read_text(encoding="utf-8").splitlines()[0]
    path.write_text(header + "\n", encoding="utf-8")
    errors = validate_inputs()
    assert matching(errors, "outside its endpoints"), errors
    assert matching(errors, "log the exception in temporal-exceptions.csv"), errors


def test_stale_temporal_exception_is_rejected(sources: Path) -> None:
    """An exception for a mismatch that no longer exists is stale bookkeeping."""
    edit_row(
        sources / "routes.csv",
        "hse-route-lubeck-visby",
        {"valid_from": "1358", "valid_to": "1400"},
    )
    errors = validate_inputs()
    assert matching(errors, "no longer has a temporal mismatch"), errors


def test_exception_without_a_real_reason_is_rejected(sources: Path) -> None:
    edit_row(
        sources / "temporal-exceptions.csv",
        "hse-route-lubeck-visby",
        {"decision": "fixture"},
    )
    errors = validate_inputs()
    assert matching(errors, "too short to be a logged reason"), errors


def test_exception_must_name_a_decisions_document(sources: Path) -> None:
    edit_row(
        sources / "temporal-exceptions.csv",
        "hse-route-lubeck-visby",
        {"logged_in": "somewhere else"},
    )
    errors = validate_inputs()
    assert matching(errors, "must point at a decisions document"), errors
