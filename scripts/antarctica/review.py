#!/usr/bin/env python3
"""The TERRA INCOGNITA human adjudication workflow (KAN-432).

The essay is held, and its own frontmatter says why: no claim has completed
scholarly review, so publishing it "would make exactly the move the essay is
about, which is presenting an inherited account as an observed one". That gate
is real, but until now there was nothing to run against it - the five reviewable
tables could only be promoted by hand-editing a CSV, which is the one form of
review that cannot be checked afterwards.

This is the same tool `scripts/dacia/review.py` is, pointed at this programme,
and it keeps the property that matters: every promotion is written to a scratch
copy of data/antarctica, validated with the ordinary gate, and only kept if the
gate passes. A reviewer who has not supplied a locator, or who tries to call a
source reviewed before it has been verified, gets the refusal and no file
changes.

    review.py queue                     what is waiting, and what blocks it
    review.py queue -v --table claims   the records, each with its blockers
    review.py show   ant-clm-cooks-blank
    review.py promote ant-clm-cooks-blank --reviewer "V. Simion" \\
        --set locator="Cook 1777, II. 231" --set confidence=high
    review.py gaps                      open source gaps, by the claim they block

`queue` computes its blockers by trial-promoting each record against the real
validator, so this tool never carries a second copy of the rules that could
drift from the first.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate  # noqa: E402

# The five-rung ladder Dacia uses does not apply here. These tables were built
# with a source-audit vocabulary, and inventing extra rungs to match the other
# programme would make every existing row's state a lie.
AUDIT = ["candidate", "source_checked", "reviewed"]
LEDGER = ["unreviewed", "source_checked", "reviewed"]

# Which table owns each identifier prefix: the file, the column holding its id,
# the column carrying its review status, and the ladder that column climbs.
OWNERS = {
    "ant-src-": ("sources.csv", "source_id", "review_status", AUDIT),
    "ant-obj-": ("map-objects.csv", "map_object_id", "review_status", AUDIT),
    "ant-clm-": ("claims.csv", "claim_id", "review_status", LEDGER),
    "ant-trm-": ("terminology.csv", "term_id", "review_status", LEDGER),
    "ant-pri-": ("priority-claims.csv", "priority_id", "review_status", LEDGER),
}


def _table_for(record_id: str) -> tuple[str, str, str, list[str]]:
    for prefix, owner in OWNERS.items():
        if record_id.startswith(prefix):
            return owner
    prefixes = ", ".join(sorted(OWNERS))
    raise SystemExit(f"unrecognised identifier: {record_id!r} (expected one of {prefixes})")


def _load(root: Path, filename: str) -> tuple[list[str], list[dict[str, str]]]:
    with (root / filename).open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def _store(root: Path, filename: str, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with (root / filename).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _apply(root: Path, filename: str, id_column: str, record_id: str, changes) -> None:
    fieldnames, rows = _load(root, filename)
    for row in rows:
        if row[id_column] == record_id:
            unknown = set(changes) - set(fieldnames)
            if unknown:
                raise SystemExit(f"{filename} has no column(s): {', '.join(sorted(unknown))}")
            row.update(changes)
            _store(root, filename, fieldnames, rows)
            return
    raise SystemExit(f"no record {record_id!r} in {filename}")


def _errors(*, include_release: bool = True) -> list[str]:
    """validate_inputs returns (errors, counts, open_gaps); only the first matters here."""
    errors, _counts, _gaps = validate.validate_inputs(include_release=include_release)
    return errors


def _validate_in_scratch(changes_by_record) -> list[str]:
    """Apply changes to a throwaway copy of data/antarctica and run the ordinary gate."""
    original = validate.DATA
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "antarctica"
        shutil.copytree(original, root)
        try:
            for record_id, changes in changes_by_record.items():
                filename, id_column, _review, _ladder = _table_for(record_id)
                _apply(root, filename, id_column, record_id, changes)
            validate.DATA = root
            # The release manifest describes the committed files, not the copies
            # under this temporary root, so checking it here would report the
            # copy as corrupt and mask the record's real blockers.
            return _errors(include_release=False)
        finally:
            validate.DATA = original


def _next_state(current: str, target: str | None, ladder: list[str]) -> str:
    if target:
        if target not in ladder:
            raise SystemExit(f"unknown review state {target!r}")
        return target
    if current not in ladder:
        raise SystemExit(f"record carries an unknown review state {current!r}")
    if current == ladder[-1]:
        raise SystemExit(f"record is already at {ladder[-1]!r}")
    return ladder[ladder.index(current) + 1]


def _blockers(record_id: str, current: str) -> list[str]:
    """What stands between this record and the next rung, per the real validator."""
    filename, _id_column, review_column, ladder = _table_for(record_id)
    if current == ladder[-1]:
        return []
    target = ladder[ladder.index(current) + 1]
    trial = {review_column: target}
    # Only write columns the table actually has. A trial that sets a missing
    # column reports the tool's own mistake as though it were the record's
    # blocker, which is worse than no report at all.
    fieldnames, _rows = _load(validate.DATA, filename)
    for column, value in (("reviewer", "trial reviewer"), ("review_date", "2000-01-01")):
        if column in fieldnames:
            trial[column] = value
    # Diff against a clean baseline rather than filtering on "does this error
    # mention the id": a cross-table or package-level rule never names the
    # record in its own text, and filtering by name would drop a real blocker
    # silently, reporting a promotion as ready that `promote` would refuse.
    baseline = set(_errors(include_release=False))
    return [e for e in _validate_in_scratch({record_id: trial}) if e not in baseline]


def _guard_baseline() -> int | None:
    baseline = _errors()
    if baseline:
        print(f"The tables do not currently validate ({len(baseline)} errors); fix those first.")
        for error in baseline[:10]:
            print(f"  ERROR: {error}")
        return 1
    return None


def command_queue(args) -> int:
    if (bad := _guard_baseline()) is not None:
        return bad

    total_waiting = 0
    for filename, id_column, review_column, ladder in OWNERS.values():
        table = filename.removesuffix(".csv")
        if args.table and args.table != table:
            continue
        _, rows = _load(validate.DATA, filename)
        waiting = [r for r in rows if r[review_column] != ladder[-1]]
        total_waiting += len(waiting)
        print(f"\n{table}: {len(waiting)} of {len(rows)} awaiting promotion")
        by_state: dict[str, int] = {}
        for row in rows:
            by_state[row[review_column]] = by_state.get(row[review_column], 0) + 1
        print("  " + ", ".join(f"{s}: {n}" for s, n in sorted(by_state.items())))
        if not args.verbose:
            continue
        for row in waiting[: args.limit]:
            blockers = _blockers(row[id_column], row[review_column])
            print(f"  {row[id_column]} ({row[review_column]})")
            for blocker in blockers:
                print(f"      - {blocker.split(': ', 1)[-1]}")
            if not blockers:
                print("      ready to promote")

    if not args.table:
        print(f"\n{total_waiting} record(s) awaiting promotion in total.")
        print("The held essay's gate is the claims table; the rest support it.")
    return 0


def command_gaps(args) -> int:
    """Open source gaps, grouped by the claim or ticket each one blocks.

    `queue` answers "what can I promote now". This answers the question behind
    it: for a record that is *not* promotable, what would have to be found, and
    is that a keystroke, an email or an afternoon in a library. Those are the
    three costs, and a register that reports them as one number cannot be
    planned against.
    """
    if (bad := _guard_baseline()) is not None:
        return bad

    _, gaps = _load(validate.DATA, "source-gaps.csv")
    live = [g for g in gaps if g["status"] != "closed"]
    print(f"\n{len(live)} open gap(s) of {len(gaps)} recorded\n")

    by_target: dict[str, list[dict[str, str]]] = {}
    unattached: list[dict[str, str]] = []
    for gap in live:
        targets = [t.strip() for t in gap["blocks"].split("|") if t.strip()]
        if not targets:
            unattached.append(gap)
            continue
        for target in targets:
            by_target.setdefault(target, []).append(gap)

    for target in sorted(by_target):
        items = by_target[target]
        print(f"  {target}  ({len(items)} blocking)")
        for gap in items:
            print(f"    {gap['gap_id']}  [{gap['kind']}, {gap['status']}]")
            print(f"      {gap['statement'][:160]}")
            print(f"      -> {gap['next_action'][:160]}")
        print()

    if unattached:
        print(f"  {len(unattached)} open gap(s) block nothing recorded:")
        for gap in unattached:
            print(f"    {gap['gap_id']}")
        print(
            "    These reach no claim or ticket. Either name what they block,\n"
            "    or close them - an open gap nothing points at is how one is lost."
        )
    return 0


def command_show(args) -> int:
    filename, id_column, review_column, _ladder = _table_for(args.record_id)
    _, rows = _load(validate.DATA, filename)
    for row in rows:
        if row[id_column] == args.record_id:
            width = max(len(k) for k in row)
            for column, value in row.items():
                print(f"  {column.ljust(width)}  {value or '-'}")
            blockers = _blockers(args.record_id, row[review_column])
            print(f"\n  blocking promotion from {row[review_column]}:")
            if blockers:
                for blocker in blockers:
                    print(f"    - {blocker.split(': ', 1)[-1]}")
            else:
                print("    (nothing - ready to promote)")
            return 0
    print(f"no record {args.record_id!r} in {filename}", file=sys.stderr)
    return 1


def command_promote(args) -> int:
    filename, id_column, review_column, ladder = _table_for(args.record_id)
    _, rows = _load(validate.DATA, filename)
    row = next((r for r in rows if r[id_column] == args.record_id), None)
    if row is None:
        print(f"no record {args.record_id!r} in {filename}", file=sys.stderr)
        return 1

    target = _next_state(row[review_column], args.to, ladder)
    changes = dict(pair.split("=", 1) for pair in args.set or [])
    changes[review_column] = target
    # None of these tables carries a reviewer or review_date column today, so
    # --reviewer is recorded in the commit message and the shell history rather
    # than the row. It stays required: a promotion nobody has put their name to
    # is the thing this workflow exists to prevent, and the requirement is what
    # makes the omission visible when those columns are added.
    for column, value in (("reviewer", args.reviewer), ("review_date", args.date)):
        if column in row:
            changes[column] = value

    errors = _validate_in_scratch({args.record_id: changes})
    if errors:
        print(f"Refused: {args.record_id} cannot go to '{target}' yet.\n")
        for error in errors:
            print(f"  ERROR: {error}")
        print("\nNothing was written.")
        return 1

    _apply(validate.DATA, filename, id_column, args.record_id, changes)
    print(f"{args.record_id}: {row[review_column]} -> {target}, reviewed by {args.reviewer}")
    for column, value in sorted(changes.items()):
        print(f"  {column} = {value}")
    if "reviewer" not in row:
        print(
            f"\n  Note: {filename} has no reviewer/review_date column, so"
            f" '{args.reviewer}' is not recorded in the row."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    tables = sorted(owner[0].removesuffix(".csv") for owner in OWNERS.values())

    queue = sub.add_parser("queue", help="what is waiting for a reviewer")
    queue.add_argument("--table", choices=tables)
    queue.add_argument("--verbose", "-v", action="store_true", help="list records and blockers")
    queue.add_argument("--limit", type=int, default=20)
    queue.set_defaults(func=command_queue)

    gaps = sub.add_parser("gaps", help="open source gaps, by what each one blocks")
    gaps.set_defaults(func=command_gaps)

    show = sub.add_parser("show", help="one record and what blocks its promotion")
    show.add_argument("record_id")
    show.set_defaults(func=command_show)

    promote = sub.add_parser("promote", help="move a record up the ladder")
    promote.add_argument("record_id")
    promote.add_argument("--reviewer", required=True, help="the person accountable for the check")
    promote.add_argument("--date", default=dt.date.today().isoformat())
    promote.add_argument("--to", help="target review state (default: the next rung)")
    promote.add_argument("--set", action="append", metavar="COLUMN=VALUE")
    promote.set_defaults(func=command_promote)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
