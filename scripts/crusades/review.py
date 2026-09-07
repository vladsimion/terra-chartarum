#!/usr/bin/env python3
"""The Crusades flagship source-audit adjudication workflow (KAN-384).

CRU-1 audits the flagship's source corpus, and until now the only way to move a
source up its review ladder was to hand-edit `source-audit.csv` - the one form
of review that cannot be checked afterwards. This is the same tool
`scripts/dacia/review.py` and `scripts/antarctica/review.py` are, pointed at
this programme: every promotion is written to a scratch copy of data/crusades,
validated with the ordinary gate, and kept only if the gate passes. A reviewer
who has not supplied a locator, or who calls a source reviewed while its
locator is still `pending`, gets the refusal and no file changes.

    review.py queue                          what is waiting, and what blocks it
    review.py queue -v
    review.py show   cru-mp-luard-edition
    review.py promote cru-mp-luard-edition --reviewer "V. Simion" \\
        --set locator="Luard 1872, I. 1" --set verification_state=verified

`queue` computes its blockers by trial-promoting each record against the real
validator, so this tool never carries a second copy of the rules that could
drift from the first.

Scope: only `source-audit.csv`'s `review_status` ladder (candidate ->
source_checked -> reviewed) is covered here. `places.csv`, `itinerary-stages.csv`,
`fourth-crusade-states.csv` and `jerusalem-roles.csv` carry a separate
`review_state` ladder (raw/normalized/reviewed/approved/published, the same one
Dacia's record tables use) that this tool does not promote; it has no reviewer
or review_date column yet and is a workflow this ticket did not ask for.
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

LADDER = ["candidate", "source_checked", "reviewed"]

# Every source_id in the audit starts with "cru-" (validate.py enforces it),
# regardless of which proof it belongs to, so one owner covers the one table.
OWNERS = {
    "cru-": (validate.TABLE, "source_id", "review_status", LADDER),
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
    return validate.validate_inputs(include_release=include_release)


def _validate_in_scratch(changes_by_record) -> list[str]:
    """Apply changes to a throwaway copy of data/crusades and run the ordinary gate."""
    original = validate.DATA
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "crusades"
        shutil.copytree(original, root)
        try:
            for record_id, changes in changes_by_record.items():
                filename, id_column, _review, _ladder = _table_for(record_id)
                _apply(root, filename, id_column, record_id, changes)
            validate.DATA = root
            # The release manifest describes the committed files, not the
            # copies under this temporary root, so checking it here would
            # report the copy as corrupt and mask the record's real blockers.
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
    # Attribution is only required - and, by validate.py's converse rule, only
    # *permitted* - at the top rung. A trial promotion to an intermediate rung
    # that still stamped a reviewer would trip that converse rule and report
    # it as the record's own blocker, masking whatever actually blocks it
    # (the bug this exact construction had in scripts/antarctica/review.py).
    if target == ladder[-1]:
        trial["reviewer"] = "trial reviewer"
        trial["review_date"] = "2000-01-01"
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

    filename, id_column, review_column, ladder = OWNERS["cru-"]
    _, rows = _load(validate.DATA, filename)
    waiting = [r for r in rows if r[review_column] != ladder[-1]]
    print(f"\nsource-audit: {len(waiting)} of {len(rows)} awaiting promotion")
    by_state: dict[str, int] = {}
    for row in rows:
        by_state[row[review_column]] = by_state.get(row[review_column], 0) + 1
    print("  " + ", ".join(f"{s}: {n}" for s, n in sorted(by_state.items())))
    if args.verbose:
        for row in waiting[: args.limit]:
            blockers = _blockers(row[id_column], row[review_column])
            print(f"  {row[id_column]} ({row[review_column]})")
            for blocker in blockers:
                print(f"      - {blocker.split(': ', 1)[-1]}")
            if not blockers:
                print("      ready to promote")
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
    # validate.py's converse attribution rule permits a reviewer only on a row
    # at the top rung, so an intermediate promotion (candidate to
    # source_checked) must not write one. --reviewer stays required for every
    # promotion regardless: someone is still accountable for it, even where
    # the row has nowhere to hold their name yet.
    if target == ladder[-1]:
        changes["reviewer"] = args.reviewer
        changes["review_date"] = args.date

    errors = _validate_in_scratch({args.record_id: changes})
    if errors:
        print(f"Refused: {args.record_id} cannot go to '{target}' yet.\n")
        for error in errors:
            print(f"  ERROR: {error}")
        print("\nNothing was written.")
        return 1

    _apply(validate.DATA, filename, id_column, args.record_id, changes)
    print(f"{args.record_id}: {row[review_column]} -> {target}, promoted by {args.reviewer}")
    for column, value in sorted(changes.items()):
        print(f"  {column} = {value}")
    if "reviewer" not in changes:
        print(
            f"\n  Note: only a '{ladder[-1]}' row may carry one, so"
            f" '{args.reviewer}' is not recorded in the row."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    queue = sub.add_parser("queue", help="what is waiting for a reviewer")
    queue.add_argument("--verbose", "-v", action="store_true", help="list records and blockers")
    queue.add_argument("--limit", type=int, default=20)
    queue.set_defaults(func=command_queue)

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
