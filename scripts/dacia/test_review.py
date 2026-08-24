#!/usr/bin/env python3
"""Tests for the CND adjudication workflow (KAN-335).

The workflow's one important property is that it cannot be used to fake a
promotion: a promotion is written to a scratch copy, validated with the ordinary
gate, and kept only if the gate passes. These tests hold both halves of that -
an unearned promotion changes nothing on disk, and an earned one goes through.

Run with `make dacia-test` (or `.venv/bin/python -m pytest scripts/dacia`).
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
from validate import TABLES  # noqa: E402


@pytest.fixture()
def dataset(tmp_path, monkeypatch):
    root = tmp_path / "dacia"
    shutil.copytree(validate.REPO / "data" / "dacia", root)
    monkeypatch.setattr(validate, "DATA", root)
    return root


def rows(dataset: Path, key: str) -> list[dict[str, str]]:
    with (dataset / TABLES[key]).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def record(dataset: Path, key: str, id_column: str, value: str) -> dict[str, str]:
    return next(r for r in rows(dataset, key) if r[id_column] == value)


def make_promotable(dataset: Path, attestation_id: str) -> None:
    """Give one attestation everything a reviewer would have established."""
    fieldnames, att = review._load(dataset, "attestations")
    for row in att:
        if row["attestation_id"] == attestation_id:
            row["locator_type"] = "sheet"
            row["locator"] = "segm. VIII"
            row["normalization_method"] = "manual"
    review._store(dataset, "attestations", fieldnames, att)

    fieldnames, transcriptions = review._load(dataset, "transcriptions")
    for row in transcriptions:
        if row["attestation_id"] == attestation_id:
            row["capture_method"] = "from_witness"
            row["capture_source"] = "OeNB Cod. 324, segm. VIII"
    review._store(dataset, "transcriptions", fieldnames, transcriptions)


def test_queue_runs_on_the_committed_tables(dataset, capsys):
    assert review.main(["queue"]) == 0
    out = capsys.readouterr().out
    assert "places" in out and "attestations" in out


def test_unearned_promotion_writes_nothing(dataset, capsys):
    before = (dataset / TABLES["attestations"]).read_text(encoding="utf-8")
    code = review.main(["promote", "att-0002", "--reviewer", "A Reviewer", "--to", "reviewed"])
    assert code == 1
    assert "Refused" in capsys.readouterr().out
    assert (dataset / TABLES["attestations"]).read_text(encoding="utf-8") == before


def test_promotion_refusal_names_the_missing_locator(dataset, capsys):
    review.main(["promote", "att-0002", "--reviewer", "A Reviewer", "--to", "reviewed"])
    assert "requires a real locator" in capsys.readouterr().out


def test_reading_captured_from_our_own_display_cannot_be_reviewed(dataset, capsys):
    """Trench A's cells are not a witness, and reviewing against them is not review."""
    fieldnames, att = review._load(dataset, "attestations")
    for row in att:
        if row["attestation_id"] == "att-0002":
            row["locator_type"] = "sheet"
            row["locator"] = "segm. VIII"
            row["normalization_method"] = "manual"
    review._store(dataset, "attestations", fieldnames, att)

    review.main(["promote", "att-0002", "--reviewer", "A Reviewer", "--to", "reviewed"])
    assert "captured from the witness or an edition" in capsys.readouterr().out


def test_earned_promotion_is_written(dataset, capsys):
    make_promotable(dataset, "att-0002")
    code = review.main(
        ["promote", "att-0002", "--reviewer", "V. Simion", "--date", "2026-08-09", "--to", "reviewed"]
    )
    assert code == 0, capsys.readouterr().out
    promoted = record(dataset, "attestations", "attestation_id", "att-0002")
    assert promoted["review_state"] == "reviewed"
    assert promoted["reviewer"] == "V. Simion"
    assert promoted["review_date"] == "2026-08-09"
    assert validate.validate_inputs() == []


def test_promotion_defaults_to_the_next_rung(dataset):
    make_promotable(dataset, "att-0002")
    review.main(["promote", "att-0002", "--reviewer", "V. Simion", "--date", "2026-08-09"])
    # raw -> normalized, not straight to reviewed
    assert record(dataset, "attestations", "attestation_id", "att-0002")["review_state"] == "normalized"


def test_promote_can_set_columns_in_the_same_move(dataset, capsys):
    fieldnames, transcriptions = review._load(dataset, "transcriptions")
    for row in transcriptions:
        if row["attestation_id"] == "att-0002":
            row["capture_method"] = "from_edition"
    review._store(dataset, "transcriptions", fieldnames, transcriptions)

    code = review.main([
        "promote", "att-0002", "--reviewer", "V. Simion", "--date", "2026-08-09", "--to", "reviewed",
        "--set", "locator_type=sheet", "--set", "locator=segm. VIII",
        "--set", "normalization_method=manual",
    ])
    assert code == 0, capsys.readouterr().out
    promoted = record(dataset, "attestations", "attestation_id", "att-0002")
    assert promoted["locator"] == "segm. VIII"


def test_unknown_column_is_rejected(dataset):
    with pytest.raises(SystemExit):
        review.main([
            "promote", "att-0002", "--reviewer", "V. Simion", "--set", "nonexistent=1",
        ])


def test_unknown_identifier_is_rejected(dataset):
    with pytest.raises(SystemExit):
        review.main(["show", "zzz-0001"])


def test_show_reports_blockers(dataset, capsys):
    assert review.main(["show", "att-0002"]) == 0
    assert "blocking promotion from raw" in capsys.readouterr().out


def test_coverage_separates_a_missing_name_from_a_missing_source(dataset, capsys):
    """CCD-C1's criterion, reported at the cost of closing it (KAN-344).

    A class whose best row is ready to promote needs somebody to put their name
    to it. A class whose every row still has a pending locator needs somebody to
    find a citation first. Collapsing those into one "not reviewed" number is
    what makes the ticket look like a single unit of work when it is two.
    """
    assert review.main(["coverage"]) == 0
    out = capsys.readouterr().out

    assert "fate-class coverage" in out
    # Both outcomes must be reachable in the committed corpus, or the report is
    # only ever telling half the story.
    assert "needs a name:" in out
    assert "needs a source:" in out
    assert "ready to promote" in out
    assert "still needs a locator" in out


def test_coverage_reports_every_fate_class_in_the_corpus(dataset, capsys):
    with (validate.DATA / TABLES["name_uses"]).open(encoding="utf-8", newline="") as handle:
        classes = {row["fate_class"] for row in csv.DictReader(handle)}

    review.main(["coverage"])
    out = capsys.readouterr().out
    for fate_class in classes:
        assert fate_class in out, fate_class


def test_coverage_does_not_fail_the_build_on_outstanding_work(dataset, capsys):
    # It is a report about work still to do. A non-zero exit would make a corpus
    # nobody has reviewed yet impossible to commit, which is every corpus at the
    # point this tool is most useful.
    assert review.main(["coverage", "--verbose"]) == 0
    assert "ready" in capsys.readouterr().out
