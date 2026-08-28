#!/usr/bin/env python3
"""Tests for the TERRA INCOGNITA adjudication workflow (KAN-432).

The one property this tool has to keep is that a promotion cannot be faked: it
is written to a scratch copy, validated with the ordinary gate, and only kept if
the gate passes. So the tests that matter are the refusals - a review tool that
accepts everything is worse than no tool, because it produces rows that look
adjudicated.

The prefix and ladder tests exist for a duller reason. Both are duplicated
knowledge: the ladders restate vocabularies owned by validate.py, and the
prefixes restate the shape of ids owned by the data. Either can drift silently
and the failure mode is a record the queue never shows, which nobody notices
because a shorter queue looks like progress.
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
    root = tmp_path / "antarctica"
    shutil.copytree(validate.REPO / "data" / "antarctica", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def rows_of(dataset: Path, table: str) -> list[dict[str, str]]:
    with (dataset / table).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def promote(*args: str) -> int:
    return review.main(["promote", *args])


def test_every_prefix_owns_a_real_table_and_columns(dataset):
    """A prefix pointing at a column that does not exist hides its whole table."""
    for prefix, (filename, id_column, review_column, ladder) in review.OWNERS.items():
        rows = rows_of(dataset, filename)
        assert rows, f"{filename} is empty"
        assert id_column in rows[0], f"{filename} has no {id_column}"
        assert review_column in rows[0], f"{filename} has no {review_column}"
        assert all(r[id_column].startswith(prefix) for r in rows), (
            f"not every id in {filename} starts with {prefix!r}"
        )
        assert all(r[review_column] in ladder for r in rows), (
            f"{filename} carries a review state outside {ladder}"
        )


def test_ladders_match_the_validator_vocabularies():
    """The rungs are validate.py's to define; this tool only walks them."""
    assert set(review.AUDIT) == validate.AUDIT_REVIEW
    assert set(review.LEDGER) == {"unreviewed", "source_checked", "reviewed"}


def test_unknown_identifier_is_refused():
    with pytest.raises(SystemExit):
        review._table_for("ant-nope-something")


def test_reviewed_claim_cannot_keep_a_pending_locator(dataset, capsys):
    """The rule the essay's hold note rests on: a review needs a citation."""
    claim = next(
        r for r in rows_of(dataset, "claims.csv")
        if r["review_status"] == "source_checked" and r["locator"] == validate.PENDING
    )
    before = rows_of(dataset, "claims.csv")

    assert promote(claim["claim_id"], "--to", "reviewed", "--reviewer", "T") == 1
    assert "cannot leave its locator pending" in capsys.readouterr().out
    assert rows_of(dataset, "claims.csv") == before, "a refused promotion wrote to the table"


def test_a_sourced_claim_can_be_reviewed(dataset):
    """The positive path, so the refusals above are not passing vacuously."""
    claim = next(
        r for r in rows_of(dataset, "claims.csv")
        if r["review_status"] == "source_checked" and r["locator"] != validate.PENDING
    )

    assert promote(claim["claim_id"], "--to", "reviewed", "--reviewer", "T") == 0

    after = next(r for r in rows_of(dataset, "claims.csv") if r["claim_id"] == claim["claim_id"])
    assert after["review_status"] == "reviewed"


def write_rows(dataset: Path, table: str, rows: list[dict[str, str]]) -> None:
    path = dataset / table
    with path.open(encoding="utf-8", newline="") as handle:
        fieldnames = list(csv.DictReader(handle).fieldnames or [])
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_unverified_source_cannot_be_reviewed(dataset, capsys):
    """`a reviewed source must first be verified` - the audit ladder's own rule.

    Every source_checked source in the committed tables is already verified, so
    the condition is constructed rather than found. Hunting for it would make
    this test silently vanish the day the data stops happening to contain one,
    which is the rot the suite exists to prevent.
    """
    rows = rows_of(dataset, "sources.csv")
    source = next(r for r in rows if r["review_status"] == "source_checked")
    source["verification_state"] = "unverified"
    write_rows(dataset, "sources.csv", rows)
    before = rows_of(dataset, "sources.csv")

    assert promote(source["source_id"], "--to", "reviewed", "--reviewer", "T") == 1
    assert "verified" in capsys.readouterr().out
    assert rows_of(dataset, "sources.csv") == before


def test_promote_refuses_a_column_the_table_does_not_have(dataset):
    claim = rows_of(dataset, "claims.csv")[0]
    with pytest.raises(SystemExit):
        promote(claim["claim_id"], "--reviewer", "T", "--set", "no_such_column=x")


def test_cannot_promote_past_the_top_rung(dataset):
    claim = next(r for r in rows_of(dataset, "claims.csv") if r["locator"] != validate.PENDING)
    assert promote(claim["claim_id"], "--to", "reviewed", "--reviewer", "T") == 0
    with pytest.raises(SystemExit):
        promote(claim["claim_id"], "--reviewer", "T")


def test_blockers_are_empty_when_a_record_is_ready(dataset):
    claim = next(
        r for r in rows_of(dataset, "claims.csv")
        if r["review_status"] == "source_checked" and r["locator"] != validate.PENDING
    )
    assert review._blockers(claim["claim_id"], claim["review_status"]) == []
