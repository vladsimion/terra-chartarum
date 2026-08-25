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
import re
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

    The two outcomes are constructed here rather than read off the committed
    corpus: as real review closes the name-only classes, a corpus-dependent
    assertion would stop exercising the distinction without ever failing.

    Demoting one named row is not enough to construct the first outcome, because
    a class is satisfied by any reviewed row it holds. The whole class has to go
    back, or a class that has grown a second reviewed example goes on reporting
    itself as satisfied and the assertion fails for a reason that is nothing to
    do with what it is testing.
    """
    fieldnames, uses = review._load(validate.DATA, "name_uses")
    demoted = next(row["fate_class"] for row in uses if row["review_state"] == "reviewed")
    for row in uses:
        if row["fate_class"] == demoted and row["review_state"] == "reviewed":
            row["review_state"] = "normalized"
            row["reviewer"] = ""
            row["review_date"] = ""
    review._store(validate.DATA, "name_uses", fieldnames, uses)

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


def test_blocked_joins_debt_to_the_ticket_that_owns_the_gate(dataset, capsys):
    """The join that already existed in the data and nowhere in the tooling.

    `verification-debt.csv` names the gate a debt blocks as `<trench>:<gate>`;
    `trench-gates.csv` maps that pair to a Jira key. Everything needed to say
    "KAN-349 is waiting on a named researcher" is committed, and reading it
    meant opening three files and joining by eye.
    """
    assert review.main(["blocked"]) == 0
    out = capsys.readouterr().out

    assert "open debt item(s) across" in out
    # Every reported ticket must look like a Jira key, or the join silently
    # degraded into printing trench ids again.
    tickets = re.findall(r"^  (KAN-\d+)  \(\d+ blocking\)$", out, re.MULTILINE)
    assert tickets, out
    assert tickets == sorted(tickets)

    # A resolution path is the point of the report: a blocker with no route out
    # is a complaint.
    assert "->" in out


def test_blocked_reports_every_open_debt_item(dataset, capsys):
    with (validate.DATA / "reference" / "verification-debt.csv").open(
        encoding="utf-8", newline=""
    ) as handle:
        open_debts = [row for row in csv.DictReader(handle) if row["status"] == "open"]

    review.main(["blocked"])
    out = capsys.readouterr().out
    for debt in open_debts:
        # Attributed to a ticket, listed as naming no ticket yet, or listed as
        # blocking no gate at all. Dropping one silently is the failure this
        # guards against - and it caught two: vd-roman-baseline-geometry and
        # vd-principality-envelopes are open with an empty `blocks` column, so
        # no gate-driven view of the programme would ever have shown them.
        assert debt["debt_id"] in out, debt["debt_id"]


def test_blocked_surfaces_open_debt_that_blocks_no_gate(dataset, capsys):
    review.main(["blocked"])
    out = capsys.readouterr().out
    assert "block no recorded gate" in out


def test_blocked_ignores_resolved_debt(dataset, capsys):
    path = validate.DATA / "reference" / "verification-debt.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    target = rows[0]["debt_id"]
    rows[0]["status"] = "resolved"
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    review.main(["blocked"])
    assert target not in capsys.readouterr().out


def test_reconcile_reports_the_cycle_against_its_own_criteria(dataset, capsys):
    """KAN-371 checks the programme as a whole, not one ticket at a time.

    The value is in failing usefully. Almost every trench is blocked on human
    review, so a reconciliation that could only print "not ready" would say
    nothing about which part is not ready or how far off it is. Each criterion
    reports a count against its target.
    """
    assert review.main(["reconcile"]) == 0
    out = capsys.readouterr().out

    # Every criterion prints a verdict, and both verdicts are reachable: a
    # report that could only say PASS would pass an empty programme.
    assert "[PASS]" in out
    assert "[OPEN]" in out
    assert re.search(r"\d+/\d+ criteria met\.", out), out

    # Every trench in the register appears in the per-trench table. A
    # reconciliation that quietly drops a trench is the failure it exists to
    # catch.
    with (validate.DATA / "reference" / "programme-ids.csv").open(
        encoding="utf-8", newline=""
    ) as handle:
        trenches = [row for row in csv.DictReader(handle) if row["kind"] == "trench"]
    assert trenches
    for trench in trenches:
        assert re.search(rf"^    {re.escape(trench['id'])}\s", out, re.MULTILINE), trench["id"]


def test_reconcile_does_not_call_an_unreleased_cycle_closed(dataset, capsys):
    """The one result that must never be wrong.

    Not a trench has passed its release gate, and the programme's closing
    ticket asks whether the cycle is done. A reconciliation that reported this
    programme as closed would be worse than not having one.
    """
    review.main(["reconcile"])
    out = capsys.readouterr().out
    assert "The cycle does not close yet" in out

    match = re.search(r"(\d+)/(\d+) criteria met\.", out)
    assert match, out
    met, total = int(match.group(1)), int(match.group(2))
    assert met < total


def test_reconcile_refuses_to_report_on_tables_that_do_not_validate(dataset, capsys):
    """Criteria 1 and 3 are the validator's rules, not a second copy of them.

    "Every index reference resolves" and "every trench records all six gates"
    are already refusals in validate.py. `reconcile` runs that validator first
    and stops on failure, so reaching the report is the check - and breaking one
    of those rules has to stop the report rather than be re-detected by it.
    """
    path = validate.DATA / "reference" / "programme-ids.csv"
    text = path.read_text(encoding="utf-8")
    path.write_text(text.replace(",dacia,live,", ",no-such-essay,live,"), encoding="utf-8")

    assert review.main(["reconcile"]) == 1
    out = capsys.readouterr().out
    assert "do not currently validate" in out
    # And it must not print a verdict on a programme it could not read.
    assert "criteria met" not in out
