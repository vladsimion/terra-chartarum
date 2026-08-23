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
from validate import TABLE, validate_inputs  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    root = tmp_path / "crusades"
    shutil.copytree(validate.REPO / "data" / "crusades", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def edit(dataset: Path, mutate) -> None:
    path = dataset / TABLE
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
    errors = validate_inputs()
    assert any(fragment in error for error in errors), (
        f"expected an error containing {fragment!r}, got: {errors}"
    )


def test_committed_audit_is_valid(dataset):
    assert validate_inputs() == []


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
