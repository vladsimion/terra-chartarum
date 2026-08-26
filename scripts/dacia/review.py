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
import json
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
    # KAN-344: Trench C is reviewed through this tool like everything else. The
    # ledger would otherwise be a table nobody could promote, which is the one
    # way a review workflow can fail without anybody noticing.
    "nmu-": ("name_uses", "name_use_id"),
    "nue-": ("name_use_edges", "edge_id"),
    # KAN-345: the Atlas routing is promoted here too. It is an editorial
    # decision about what a reader is shown, and a decision nobody can promote
    # is a decision nobody ever revisits.
    "nes-": ("nomen_errans_atlas_states", "state_id"),
}
LADDER = ["raw", "normalized", "reviewed", "approved", "published"]


def _table_for(record_id: str) -> tuple[str, str]:
    for prefix, owner in OWNERS.items():
        if record_id.startswith(prefix):
            return owner
    prefixes = ", ".join(sorted(OWNERS))
    raise SystemExit(f"unrecognised identifier: {record_id!r} (expected one of {prefixes})")


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
    # Not every promotable table carries every review column - a name use has no
    # last_verified - and a trial that sets a column the table lacks reports the
    # tool's own mistake as though it were the record's blocker.
    key, _ = _table_for(record_id)
    fieldnames, _rows = _load(validate.DATA, key)
    trial = {column: value for column, value in trial.items() if column in fieldnames}
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


def command_blocked(args) -> int:
    """Which Jira tickets are waiting on which piece of verification debt.

    The three registries needed to answer this already exist and have never
    been joined. `verification-debt.csv` records what is outstanding and names
    the gate it blocks, as `<trench>:<gate>`. `trench-gates.csv` maps a trench
    and a gate to the Jira key that owns it. So the chain from "a repository
    has not been confirmed" to "KAN-349 cannot close" is fully determined by
    committed data - and reading it required opening three CSVs and doing the
    join by eye, which nobody does, so the tickets look blocked for no stated
    reason.

    Grouping by ticket rather than by debt is the point. A debt item blocking
    four tickets and four items blocking one ticket are different situations,
    and only the ticket-shaped view tells you which you have.
    """
    baseline = validate.validate_inputs()
    if baseline:
        print(f"The tables do not currently validate ({len(baseline)} errors); fix those first.")
        return 1

    reference = validate.DATA / "reference"
    with (reference / "verification-debt.csv").open(encoding="utf-8", newline="") as handle:
        debts = list(csv.DictReader(handle))
    with (reference / "trench-gates.csv").open(encoding="utf-8", newline="") as handle:
        gates = list(csv.DictReader(handle))

    # (trench, gate) -> the ticket that owns that gate.
    owner = {(row["trench_id"], row["gate_id"]): row for row in gates}

    by_ticket: dict[str, list[tuple[dict[str, str], str]]] = {}
    unmapped: list[str] = []
    ungated: list[dict[str, str]] = []
    for debt in debts:
        if debt["status"] != "open":
            continue
        targets = [t.strip() for t in debt["blocks"].split("|") if t.strip()]
        if not targets:
            # Open debt that blocks nothing recorded. It would vanish from any
            # gate-driven view of the programme, which is the one way an
            # outstanding item can be forgotten while still sitting in the
            # register marked open.
            ungated.append(debt)
            continue
        for target in targets:
            trench, _, gate = target.partition(":")
            row = owner.get((trench, gate))
            if row is None or not row.get("jira_key"):
                unmapped.append(f"{debt['debt_id']} -> {target}")
                continue
            by_ticket.setdefault(row["jira_key"], []).append((debt, target))

    open_count = sum(1 for d in debts if d["status"] == "open")
    print(f"\n{open_count} open debt item(s) across {len(by_ticket)} ticket(s)\n")

    for ticket in sorted(by_ticket):
        items = by_ticket[ticket]
        print(f"  {ticket}  ({len(items)} blocking)")
        for debt, target in items:
            print(f"    {debt['debt_id']}  [{target}]")
            print(f"      {debt['statement']}")
            print(f"      -> {debt['resolution_path']}")
        print()

    if ungated:
        print(f"  {len(ungated)} open item(s) block no recorded gate:")
        for debt in ungated:
            print(f"    {debt['debt_id']}")
            print(f"      {debt['statement']}")
            print(f"      -> {debt['resolution_path']}")
        print(
            "    These reach no ticket. Either name the gate they block, or\n"
            "    close them - open debt nothing points at is how an item is lost."
        )
        print()

    if unmapped:
        # Not an error: a debt may name a gate before the trench row exists.
        # Saying so is better than dropping it from the report in silence.
        print(f"  {len(unmapped)} debt target(s) name no ticket yet:")
        for entry in unmapped:
            print(f"    {entry}")

    return 0


def command_coverage(args) -> int:
    """Fate-class coverage against the CCD-C1 acceptance criterion (KAN-344).

    The criterion is "at least one reviewed example exists for each fate class
    used in the essay". The useful question is not only whether a class passes,
    but *what stands between here and there* for any class still withheld.

    Two answers are very different in cost. A class whose best row is already
    ready to promote needs a person to run one command and put their name to
    it. A class whose every row still has a pending locator needs somebody to
    find a citation first, which is an afternoon in a library rather than a
    keystroke. Reporting them as one number hides the only distinction that
    would let anyone plan the work.
    """
    baseline = validate.validate_inputs()
    if baseline:
        print(f"The tables do not currently validate ({len(baseline)} errors); fix those first.")
        return 1

    _, rows = _load(validate.DATA, "name_uses")
    by_class: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        by_class.setdefault(row["fate_class"], []).append(row)

    reviewed_index = LADDER.index("reviewed")
    needs_locator: list[str] = []
    needs_reviewer: list[str] = []
    satisfied: list[str] = []

    print("\nfate-class coverage for the reviewed-example criterion (KAN-344)")
    print(f"  {len(by_class)} classes across {len(rows)} name uses\n")

    for fate_class, group in sorted(by_class.items()):
        already = [r for r in group if LADDER.index(r["review_state"]) >= reviewed_index]
        ready = [r for r in group if not _blockers(r["name_use_id"], r["review_state"])]
        if already:
            satisfied.append(fate_class)
            state = f"satisfied by {already[0]['name_use_id']}"
        elif ready:
            needs_reviewer.append(fate_class)
            state = f"one command away - {ready[0]['name_use_id']} is ready to promote"
        else:
            needs_locator.append(fate_class)
            state = "no promotable row: every candidate still needs a locator"
        print(f"  {fate_class:<14} {len(group):>2} row(s)  {state}")
        if args.verbose:
            for row in group:
                blockers = _blockers(row["name_use_id"], row["review_state"])
                mark = "ready" if not blockers else "; ".join(
                    b.split(": ", 1)[-1] for b in blockers
                )
                print(f"       {row['name_use_id']:<26} {row['review_state']:<11} {mark}")

    print()
    if satisfied:
        print(f"  satisfied:      {len(satisfied)} ({', '.join(satisfied)})")
    if needs_reviewer:
        print(f"  needs a name:   {len(needs_reviewer)} ({', '.join(needs_reviewer)})")
        print("                  -> review.py promote <id> --reviewer \"Name\"")
    if needs_locator:
        print(f"  needs a source: {len(needs_locator)} ({', '.join(needs_locator)})")
        print("                  -> find a citation, then --set locator=... and promote")

    # Not an error exit. This is a report about work outstanding, and a build
    # that failed on it would make the corpus impossible to commit to.
    return 0


def command_reconcile(args) -> int:
    """The cycle-level reconciliation KAN-371 asks for.

    `blocked` answers "why can this ticket not close". This answers the
    question one level up: is the programme, taken as a whole, in the state its
    own closing ticket describes. The five acceptance criteria are checked
    against committed data and each one prints its verdict and the evidence
    behind it, because a reconciliation that says "pass" without showing its
    working is the thing it exists to replace.

    It is expected to fail today, and failing usefully is the deliverable. Most
    of the cycle is blocked on human review, so a reconciliation that could only
    print "not yet" would tell nobody which part is not yet, or how far off it
    is. Every criterion reports a count against its target.
    """
    baseline = validate.validate_inputs()
    if baseline:
        print(f"The tables do not currently validate ({len(baseline)} errors); fix those first.")
        return 1

    reference = validate.DATA / "reference"

    def _read(name: str) -> list[dict[str, str]]:
        with (reference / f"{name}.csv").open(encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))

    programme = _read("programme-ids")
    gate_rows = _read("trench-gates")
    gate_vocab = _read("gates")
    debts = _read("verification-debt")

    trenches = [row for row in programme if row["kind"] == "trench"]
    workstreams = [row for row in programme if row["kind"] == "workstream"]
    all_gates = [row["gate_id"] for row in gate_vocab]
    gates_by_trench: dict[str, dict[str, dict[str, str]]] = {}
    for row in gate_rows:
        gates_by_trench.setdefault(row["trench_id"], {})[row["gate_id"]] = row
    open_debt_by_subject: dict[str, int] = {}
    for row in debts:
        if row["status"] == "open":
            open_debt_by_subject[row["subject_id"]] = (
                open_debt_by_subject.get(row["subject_id"], 0) + 1
            )

    verdicts: list[tuple[bool, str]] = []

    def record(ok: bool, criterion: str) -> None:
        verdicts.append((ok, criterion))
        print(f"  [{'PASS' if ok else 'OPEN'}] {criterion}")

    print("\nCorpus Chartarum Daciae - cycle reconciliation (KAN-371)")
    print(f"{len(trenches)} trenches, {len(workstreams)} workstreams, {len(all_gates)} gates\n")

    # Criteria 1 and 3 - every index reference resolving, and every trench
    # carrying a row for all six gates - are already refusals in
    # `validate.py` (essay_slug must name an essay that exists, trench_id must
    # be a registered trench, a trench missing a gate row is an error). This
    # command runs that validator before anything else and stops on failure, so
    # reaching this line *is* the check. Re-implementing them here would put a
    # second copy of both rules in the tool that audits them, which is the drift
    # the whole registry design exists to prevent. They are listed so the report
    # covers all five criteria, and attributed so nobody adds the duplicate.
    record(True, f"index resolves and all {len(all_gates)} gates are recorded per trench")
    print("         (enforced by scripts/dacia/validate.py; this report refuses to run without it)")

    # 2. At least three trenches consuming shared evidence rather than private
    #    authorities. Read from the generated index rather than recomputed here:
    #    `programme_graph` already decides what consumption means, and a second
    #    implementation of that rule in the tool that audits it is how the two
    #    drift into disagreeing about the thing they both report.
    index_path = validate.REPO / "src" / "data" / "dacia" / "generated" / "programme.json"
    consuming: list[str] = []
    if index_path.is_file():
        index = json.loads(index_path.read_text(encoding="utf-8"))
        consuming = [
            entry["id"]
            for entry in index["entries"]
            if entry["kind"] == "trench" and entry["corpusRecords"] > 0
        ]
    record(
        len(consuming) >= 3,
        f"{len(consuming)}/3 trenches consume shared corpus evidence "
        f"({', '.join(consuming) or 'none'})",
    )

    # 4. Whether the cycle is actually closeable: every trench released.
    released = [
        row["id"]
        for row in trenches
        if gates_by_trench.get(row["id"], {}).get("release", {}).get("status") == "passed"
    ]
    record(
        len(released) == len(trenches),
        f"{len(released)}/{len(trenches)} trenches have passed their release gate",
    )

    # 5. Outstanding debt is recorded against something, not hidden. The orphan
    #    case is the one that matters: an open item blocking no gate reaches no
    #    ticket and no gate-driven view of the programme would ever show it.
    orphan = [row["debt_id"] for row in debts if row["status"] == "open" and not row["blocks"]]
    total_open = sum(1 for row in debts if row["status"] == "open")
    record(
        not orphan,
        f"{total_open} open debt item(s), {len(orphan)} reaching no gate",
    )
    for item in orphan:
        print(f"         {item} blocks nothing recorded")

    print("\n  Per-trench state\n")
    header = f"    {'trench':8} {'state':8} {'essay':10} {'gates passed':>12}  {'open debt':>9}"
    print(header)
    print(f"    {'-' * (len(header) - 4)}")
    for row in trenches:
        have = gates_by_trench.get(row["id"], {})
        passed = sum(1 for gate in have.values() if gate["status"] == "passed")
        print(
            f"    {row['id']:8} {row['state']:8} {(row['essay_slug'] or '-'):10} "
            f"{f'{passed}/{len(all_gates)}':>12}  {open_debt_by_subject.get(row['id'], 0):>9}"
        )

    failed = [criterion for ok, criterion in verdicts if not ok]
    print(f"\n  {len(verdicts) - len(failed)}/{len(verdicts)} criteria met.")
    if failed:
        print("  The cycle does not close yet. Outstanding:")
        for criterion in failed:
            print(f"    - {criterion}")
        print(
            "\n  This is a report, not a gate: KAN-371 closes when the cycle does,\n"
            "  and `review.py blocked` names who is waiting on what in the meantime."
        )
    # Deliberately 0 either way. An unfinished cycle is the expected state for
    # most of this programme's life, and a command that fails CI for being
    # honest about that would be removed from CI within a week.
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

    coverage = sub.add_parser(
        "coverage", help="fate-class coverage against the reviewed-example criterion"
    )
    coverage.add_argument("--verbose", "-v", action="store_true", help="list every row")
    coverage.set_defaults(func=command_coverage)

    blocked = sub.add_parser(
        "blocked", help="which Jira tickets are waiting on which verification debt"
    )
    blocked.set_defaults(func=command_blocked)

    reconcile = sub.add_parser(
        "reconcile", help="cycle-level cross-link, release and maintenance state (KAN-371)"
    )
    reconcile.set_defaults(func=command_reconcile)

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
