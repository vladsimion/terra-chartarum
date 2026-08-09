#!/usr/bin/env python3
"""The CND human adjudication workflow (KAN-335).

Records are compiled by machine and promoted by a person. This tool is how the
promotion happens, and its one important property is that it cannot be used to
fake one: every promotion is written to a scratch copy of the tables, validated
with the ordinary gate, and only kept if the gate passes. A reviewer who has not
supplied a locator, or whose reading was captured from this project's own
display rather than from a witness, gets the refusal and no file changes.

    review.py queue                     what is waiting, and what blocks it
    review.py show   att-0002           one record in full
    review.py promote att-0002 --reviewer "V. Simion" \\
        --set locator_type=sheet --set locator="segm. VIII" \\
        --set normalization_method=manual

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
from validate import TABLES  # noqa: E402

# Which table owns each identifier prefix, and the column holding the id.
OWNERS = {
    "plc-": ("places", "place_id"),
    "src-": ("sources", "source_id"),
    "att-": ("attestations", "attestation_id"),
}
LADDER = ["raw", "normalized", "reviewed", "approved", "published"]


def _table_for(record_id: str) -> tuple[str, str]:
    for prefix, owner in OWNERS.items():
        if record_id.startswith(prefix):
            return owner
    raise SystemExit(f"unrecognised identifier: {record_id!r} (expected plc-, src- or att-)")


def _load(root: Path, key: str) -> tuple[list[str], list[dict[str, str]]]:
    with (root / TABLES[key]).open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def _store(root: Path, key: str, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with (root / TABLES[key]).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _apply(root: Path, key: str, id_column: str, record_id: str, changes: dict[str, str]) -> None:
    fieldnames, rows = _load(root, key)
    for row in rows:
        if row[id_column] == record_id:
            unknown = set(changes) - set(fieldnames)
            if unknown:
                raise SystemExit(f"{key} has no column(s): {', '.join(sorted(unknown))}")
            row.update(changes)
            _store(root, key, fieldnames, rows)
            return
    raise SystemExit(f"no record {record_id!r} in {TABLES[key]}")


def _validate_in_scratch(changes_by_record) -> list[str]:
    """Apply changes to a throwaway copy of data/dacia and run the ordinary gate."""
    original = validate.DATA
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "dacia"
        shutil.copytree(original, root)
        try:
            for record_id, changes in changes_by_record.items():
                key, id_column = _table_for(record_id)
                _apply(root, key, id_column, record_id, changes)
            validate.DATA = root
            return validate.validate_inputs()
        finally:
            validate.DATA = original


def _next_state(current: str, target: str | None) -> str:
    if target:
        if target not in LADDER:
            raise SystemExit(f"unknown review state {target!r}")
        return target
    if current not in LADDER:
        raise SystemExit(f"record carries an unknown review state {current!r}")
    if current == LADDER[-1]:
        raise SystemExit("record is already published")
    return LADDER[LADDER.index(current) + 1]


def _blockers(record_id: str, current: str) -> list[str]:
    """What stands between this record and the next rung, per the real validator."""
    target = LADDER[LADDER.index(current) + 1] if current != LADDER[-1] else None
    if target is None:
        return []
    trial = {
        "review_state": target,
        "reviewer": "trial reviewer",
        "review_date": "2000-01-01",
        "last_verified": "2000-01-01",
    }
    errors = _validate_in_scratch({record_id: trial})
    return [e for e in errors if record_id in e]


def command_queue(args) -> int:
    baseline = validate.validate_inputs()
    if baseline:
        print(f"The tables do not currently validate ({len(baseline)} errors); fix those first.")
        for error in baseline[:10]:
            print(f"  ERROR: {error}")
        return 1

    for key, id_column in [(k, c) for k, c in OWNERS.values()]:
        if args.table and args.table != key:
            continue
        _, rows = _load(validate.DATA, key)
        waiting = [r for r in rows if r["review_state"] != LADDER[-1]]
        print(f"\n{key}: {len(waiting)} of {len(rows)} awaiting promotion")
        by_state: dict[str, int] = {}
        for row in rows:
            by_state[row["review_state"]] = by_state.get(row["review_state"], 0) + 1
        print("  " + ", ".join(f"{s}: {n}" for s, n in sorted(by_state.items())))
        if not args.verbose:
            continue
        for row in waiting[: args.limit]:
            blockers = _blockers(row[id_column], row["review_state"])
            print(f"  {row[id_column]} ({row['review_state']})")
            for blocker in blockers:
                print(f"      - {blocker.split(': ', 1)[-1]}")
            if not blockers:
                print("      ready to promote")
    return 0


def command_show(args) -> int:
    key, id_column = _table_for(args.record_id)
    _, rows = _load(validate.DATA, key)
    for row in rows:
        if row[id_column] == args.record_id:
            width = max(len(k) for k in row)
            for column, value in row.items():
                print(f"  {column.ljust(width)}  {value or '-'}")
            blockers = _blockers(args.record_id, row["review_state"])
            print(f"\n  blocking promotion from {row['review_state']}:")
            for blocker in blockers or ["    (nothing - ready to promote)"]:
                print(f"    - {blocker.split(': ', 1)[-1]}" if blockers else blocker)
            return 0
    print(f"no record {args.record_id!r} in {TABLES[key]}", file=sys.stderr)
    return 1


def command_promote(args) -> int:
    key, id_column = _table_for(args.record_id)
    _, rows = _load(validate.DATA, key)
    row = next((r for r in rows if r[id_column] == args.record_id), None)
    if row is None:
        print(f"no record {args.record_id!r} in {TABLES[key]}", file=sys.stderr)
        return 1

    target = _next_state(row["review_state"], args.to)
    changes = dict(pair.split("=", 1) for pair in args.set or [])
    changes["review_state"] = target
    changes["reviewer"] = args.reviewer
    changes["review_date"] = args.date
    if "last_verified" in row:
        changes["last_verified"] = args.date

    errors = _validate_in_scratch({args.record_id: changes})
    if errors:
        print(f"Refused: {args.record_id} cannot go to '{target}' yet.\n")
        for error in errors:
            print(f"  ERROR: {error}")
        print("\nNothing was written.")
        return 1

    _apply(validate.DATA, key, id_column, args.record_id, changes)
    print(f"{args.record_id}: {row['review_state']} -> {target}, reviewed by {args.reviewer}")
    for column, value in sorted(changes.items()):
        print(f"  {column} = {value}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    queue = sub.add_parser("queue", help="what is waiting for a reviewer")
    queue.add_argument("--table", choices=sorted({k for k, _ in OWNERS.values()}))
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
    raise SystemExit(main())
