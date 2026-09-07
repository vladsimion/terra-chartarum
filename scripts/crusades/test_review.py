#!/usr/bin/env python3
"""Tests for the Crusades flagship source-audit adjudication workflow (KAN-384).

The one property this tool has to keep is that a promotion cannot be faked: it
is written to a scratch copy, validated with the ordinary gate, and only kept
if the gate passes. So the tests that matter are the refusals - a review tool
that accepts everything is worse than no tool, because it produces rows that
look adjudicated.

Two of these tests exist because scripts/antarctica/review.py, the tool this
one is ported from, actually had the bug they guard against: an intermediate
promotion (candidate to source_checked) stamped a reviewer unconditionally,
which validate.py's converse attribution rule then refused - reporting the
tool's own mistake as though every candidate source were permanently blocked.
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import review  # noqa: E402
import validate  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    root = tmp_path / "crusades"
    shutil.copytree(validate.REPO / "data" / "crusades", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def rows_of(dataset: Path, table: str) -> list[dict[str, str]]:
    with (dataset / table).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_rows(dataset: Path, table: str, rows: list[dict[str, str]]) -> None:
    path = dataset / table
    with path.open(encoding="utf-8", newline="") as handle:
        fieldnames = list(csv.DictReader(handle).fieldnames or [])
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def promote(*args: str) -> int:
    return review.main(["promote", *args])


def test_unknown_identifier_is_refused():
    with pytest.raises(SystemExit):
        review._table_for("hsr-nope-something")


def test_ladder_matches_the_validator_vocabulary():
    """The rungs are validate.py's to define; this tool only walks them."""
    assert set(review.LADDER) == validate.REVIEW


def test_candidate_can_be_promoted_to_source_checked(dataset):
    """The intermediate rung: no locator or rights bar is met yet, only a
    person having looked at the record, and it must not require a reviewer -
    that attribution is reserved for the top rung."""
    source = next(r for r in rows_of(dataset, validate.TABLE) if r["review_status"] == "candidate")

    assert promote(source["source_id"], "--reviewer", "T") == 0

    after = next(r for r in rows_of(dataset, validate.TABLE) if r["source_id"] == source["source_id"])
    assert after["review_status"] == "source_checked"
    assert after["reviewer"] == ""
    assert after["review_date"] == ""


def test_blockers_for_an_intermediate_rung_are_not_the_trial_stamping_itself(dataset):
    source = next(r for r in rows_of(dataset, validate.TABLE) if r["review_status"] == "candidate")
    blockers = review._blockers(source["source_id"], source["review_status"])
    assert not any("only a reviewed row may carry a reviewer" in b for b in blockers)


def test_reviewed_source_cannot_leave_its_locator_pending(dataset, capsys):
    """The gap this audit exists to keep open: knowing a manuscript exists is
    not having read the folio, so a source cannot be reviewed while its
    locator is still `pending`, however source-checked it otherwise is."""
    rows = rows_of(dataset, validate.TABLE)
    source = rows[0]
    assert source["locator"] == validate.PENDING
    source["review_status"] = "source_checked"
    source["verification_state"] = "verified"
    write_rows(dataset, validate.TABLE, rows)
    before = rows_of(dataset, validate.TABLE)

    assert promote(source["source_id"], "--to", "reviewed", "--reviewer", "T") == 1
    assert "cannot leave its locator pending" in capsys.readouterr().out
    assert rows_of(dataset, validate.TABLE) == before, "a refused promotion wrote to the table"


def test_a_located_source_can_be_reviewed(dataset):
    """The positive path, so the refusal above is not passing vacuously."""
    rows = rows_of(dataset, validate.TABLE)
    source = rows[0]
    source["review_status"] = "source_checked"
    source["locator"] = "fol. 2r"
    source["verification_state"] = "verified"
    write_rows(dataset, validate.TABLE, rows)

    assert promote(source["source_id"], "--to", "reviewed", "--reviewer", "V. Simion",
                    "--date", "2026-09-07") == 0

    after = next(r for r in rows_of(dataset, validate.TABLE) if r["source_id"] == source["source_id"])
    assert after["review_status"] == "reviewed"
    assert after["reviewer"] == "V. Simion"
    assert after["review_date"] == "2026-09-07"


def test_promote_refuses_a_column_the_table_does_not_have(dataset):
    source = rows_of(dataset, validate.TABLE)[0]
    with pytest.raises(SystemExit):
        promote(source["source_id"], "--reviewer", "T", "--set", "no_such_column=x")


def test_cannot_promote_past_the_top_rung(dataset):
    rows = rows_of(dataset, validate.TABLE)
    source = rows[0]
    source["review_status"] = "source_checked"
    source["locator"] = "fol. 2r"
    source["verification_state"] = "verified"
    write_rows(dataset, validate.TABLE, rows)

    assert promote(source["source_id"], "--to", "reviewed", "--reviewer", "T") == 0
    with pytest.raises(SystemExit):
        promote(source["source_id"], "--reviewer", "T")


def test_every_source_carries_the_attribution_columns(dataset):
    for row in rows_of(dataset, validate.TABLE):
        assert "reviewer" in row
        assert "review_date" in row


def test_no_committed_source_was_backfilled_with_a_reviewer(dataset):
    for row in rows_of(dataset, validate.TABLE):
        assert row["review_status"] != "reviewed", f"{row['source_id']} was reviewed unattended"
        assert not row["reviewer"], f"{row['source_id']} carries an unearned reviewer"
        assert not row["review_date"]
