#!/usr/bin/env python3
"""Phase 0 source and rights audit for the Crusades flagship (KAN-384).

Two bounded proofs share one audit: Matthew Paris's itinerary, and the Fourth
Crusade's Venice-Zara-Constantinople sequence. The rules here exist so that the
prototypes cannot be built on a witness nobody has identified or an image nobody
may publish, and so that the gap between "we know this manuscript exists" and
"we have read this folio" stays visible instead of closing quietly.

Run with `npm run crusades:validate`; it also runs inside `npm run build`.
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "crusades"

PENDING = "pending"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

PROOFS = {"matthew_paris", "fourth_crusade"}
SOURCE_KINDS = {"manuscript_witness", "critical_edition", "primary_narrative", "instrument"}
RIGHTS = {
    "public_domain_text",
    "no_known_restrictions",
    "rights_review_required",
    "permission_required",
    "in_copyright",
    "rights_unknown",
}
RESOLUTION = {"sufficient", "catalogue_preview_only", "unverified"}
PRODUCTION_ROLES = {"production_primary", "production_fallback", "research_only"}
OPEN_PRODUCTION_RIGHTS = {"public_domain_text", "no_known_restrictions"}
VERIFICATION = {"unverified", "partially_verified", "verified"}
REVIEW = {"candidate", "source_checked", "reviewed"}

# The sequence the Sea proof has to be able to tell. A source set that cannot
# reach one of these stages cannot support the argument, however good it is.
REQUIRED_STAGES = {
    "intended_destination",
    "fleet_contract",
    "debt",
    "zara",
    "constantinople_1203",
    "constantinople_1204",
    "post_1204_claims",
}

TABLE = "source-audit.csv"
PLACES = "places.csv"

# 15-25 core places is the pilot's own bound (KAN-385): enough to carry both
# proofs, few enough that every one can be argued for.
PLACE_RANGE = (15, 25)
PLACE_ROLES = {
    "itinerary_stage",
    "itinerary_pass",
    "itinerary_terminus",
    "fleet_contract",
    "diversion",
    "assembly",
    "landfall",
    "objective",
    "post_1204_control",
}
# The one basis a modern coordinate may have here. A medieval source gives
# no coordinates, so a row claiming one would be inventing a precision the
# record does not have.
COORDINATE_BASES = {"modern_reference"}
REVIEW_STATES = {"raw", "normalized", "reviewed", "approved", "published"}


def read(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def pipe(value: str) -> list[str]:
    return [part for part in (piece.strip() for piece in value.split("|")) if part]


def validate_inputs() -> list[str]:
    errors: list[str] = []
    validate_places(errors)
    rows = read(TABLE)
    seen: set[str] = set()
    stages: set[str] = set()
    by_proof: dict[str, int] = {}

    for row in rows:
        source_id = row["source_id"]
        label = f"source-audit[{source_id}]"
        if not source_id.startswith("cru-") or not SLUG.match(source_id):
            errors.append(f"{label}: source_id must be a cru- slug")
        if source_id in seen:
            errors.append(f"{label}: duplicate source_id")
        seen.add(source_id)

        proof = row["proof"]
        if proof not in PROOFS:
            errors.append(f"{label}: proof '{proof}' is not recognised")
        else:
            by_proof[proof] = by_proof.get(proof, 0) + 1
        if row["source_kind"] not in SOURCE_KINDS:
            errors.append(f"{label}: source_kind '{row['source_kind']}' is not recognised")
        for field in ("title", "creator", "repository", "edition", "covers", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if not row["repository_url"].startswith("https://"):
            errors.append(f"{label}: repository_url must be https")
        if not row["rights_basis_url"].startswith("https://"):
            errors.append(f"{label}: rights_basis_url must be https")
        if row["rights_status"] not in RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        if row["resolution_status"] not in RESOLUTION:
            errors.append(f"{label}: resolution_status is not recognised")
        if row["verification_state"] not in VERIFICATION:
            errors.append(f"{label}: verification_state is not recognised")
        if row["review_status"] not in REVIEW:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

        # A manuscript is identified by its shelfmark or it is not identified.
        if row["source_kind"] == "manuscript_witness" and row["shelfmark"] in {"", "n/a", PENDING}:
            errors.append(f"{label}: a manuscript witness must carry its shelfmark")
        if not row["locator"]:
            errors.append(f"{label}: locator is required, pending if the folios are untranscribed")
        # The gap this audit exists to keep open: knowing a manuscript exists is
        # not having read the folio the prototype means to use.
        if row["verification_state"] == "verified" and row["locator"] == PENDING:
            errors.append(f"{label}: a verified source cannot leave its locator pending")

        role = row["production_role"]
        if role not in PRODUCTION_ROLES:
            errors.append(f"{label}: production_role '{role}' is not recognised")
        elif role != "research_only":
            if row["rights_status"] not in OPEN_PRODUCTION_RIGHTS:
                errors.append(f"{label}: a production role requires rights that permit reuse")
            if row["resolution_status"] != "sufficient":
                errors.append(f"{label}: a production role requires a resolved reproduction")
            if row["locator"] == PENDING:
                errors.append(f"{label}: a production role requires a real locator")

        if proof == "fourth_crusade":
            for stage in pipe(row["covers"]):
                if stage not in REQUIRED_STAGES:
                    errors.append(f"{label}: '{stage}' is not a stage of the sequence")
                stages.add(stage)

    # Both proofs need witnesses, and the Sea proof needs its whole sequence:
    # a set that cannot reach the partition cannot say what was claimed after
    # 1204 as against what was held.
    for proof in sorted(PROOFS):
        if not by_proof.get(proof):
            errors.append(f"source-audit: no witness is recorded for the '{proof}' proof")
    for missing in sorted(REQUIRED_STAGES - stages):
        errors.append(f"source-audit: no Fourth Crusade source covers '{missing}'")

    # Dealer and aggregator imagery is not a publication source. Recorded as a
    # rule rather than an instruction so a later addition cannot forget it.
    for row in rows:
        host = row["repository_url"].lower()
        if any(bad in host for bad in ("ebay.", "abebooks.", "invaluable.", "liveauctioneers.")):
            errors.append(
                f"source-audit[{row['source_id']}]: dealer and aggregator imagery may not be a "
                "publication source"
            )

    return errors


def validate_places(errors: list[str]) -> None:
    """KAN-385: the shared authority both prototypes read, and its limits.

    Two rules carry the weight. A modern coordinate is reference context and is
    never presented as a source-given medieval position, because no source here
    gives one. And a transliteration is a reading aid that may not stand in for
    the form a place actually carried - the Greek of Constantinople is the
    city's own name and the Latin is the crusaders', and flattening either into
    a romanisation loses the distinction the proof is about.
    """
    rows = read(PLACES)
    seen: set[str] = set()
    proofs: dict[str, int] = {}

    if not PLACE_RANGE[0] <= len(rows) <= PLACE_RANGE[1]:
        errors.append(
            f"places: the pilot holds {PLACE_RANGE[0]}-{PLACE_RANGE[1]} core places, "
            f"found {len(rows)}"
        )

    for row in rows:
        place_id = row["place_id"]
        label = f"places[{place_id}]"
        if not place_id.startswith("cru-plc-") or not SLUG.match(place_id):
            errors.append(f"{label}: place_id must be a cru-plc- slug")
        if place_id in seen:
            errors.append(f"{label}: duplicate place_id")
        seen.add(place_id)

        if row["proof"] not in PROOFS:
            errors.append(f"{label}: proof '{row['proof']}' is not recognised")
        else:
            proofs[row["proof"]] = proofs.get(row["proof"], 0) + 1
        if row["role"] not in PLACE_ROLES:
            errors.append(f"{label}: role '{row['role']}' is not recognised")
        for field in ("preferred_name", "name_modern", "script_note", "modern_country", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["review_state"] not in REVIEW_STATES:
            errors.append(f"{label}: review_state '{row['review_state']}' is not recognised")
        if row["review_status"] not in REVIEW:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

        # A place needs at least one historical form, or it is a modern town
        # with a crusade attached to it.
        if not row["name_latin"] and not row["name_greek"]:
            errors.append(f"{label}: a core place needs a Latin or Greek form")
        # The transliteration rule: a Greek form written in Latin letters is a
        # reading aid, and the row has to say which script it is talking about.
        if row["name_greek"] and "Greek" not in row["script_note"]:
            errors.append(
                f"{label}: a Greek form must say in script_note how it relates to the Latin one"
            )

        try:
            lon, lat = float(row["lon"]), float(row["lat"])
        except ValueError:
            errors.append(f"{label}: coordinates are not numbers")
        else:
            if not (-25.0 <= lon <= 45.0 and 30.0 <= lat <= 60.0):
                errors.append(f"{label}: {lon},{lat} is outside the Road-to-Sea window")
        if row["coordinate_basis"] not in COORDINATE_BASES:
            errors.append(
                f"{label}: '{row['coordinate_basis']}' is not a basis these coordinates can have; "
                "no source in the corpus gives a medieval position"
            )

        for field in ("valid_from", "valid_to"):
            if not row[field].lstrip("-").isdigit():
                errors.append(f"{label}: {field} must be a year")
        if row["valid_from"].isdigit() and row["valid_to"].isdigit():
            if int(row["valid_from"]) > int(row["valid_to"]):
                errors.append(f"{label}: the place's window ends before it starts")

    for proof in sorted(PROOFS):
        if not proofs.get(proof):
            errors.append(f"places: the '{proof}' proof has no places")


def readiness(rows: list[dict[str, str]], places: list[dict[str, str]]) -> list[str]:
    cleared = [row for row in rows if row["production_role"] != "research_only"]
    itinerary = [row for row in rows if row["proof"] == "matthew_paris"]
    return [
        f"  sources: {len(rows)} audited across two proofs "
        f"({len(itinerary)} Matthew Paris, {len(rows) - len(itinerary)} Fourth Crusade)",
        f"  verification: {sum(1 for r in rows if r['verification_state'] == 'verified')} verified, "
        f"{sum(1 for r in rows if r['locator'] == PENDING)} with untranscribed folios",
        f"  rights: {len(cleared)} cleared for publication; "
        f"{sum(1 for r in rows if r['rights_status'] in OPEN_PRODUCTION_RIGHTS)} open as texts",
        f"  places: {len(places)} core places, "
        f"{sum(1 for r in places if r['name_greek'])} carrying a Greek form; "
        f"all coordinates modern reference context",
    ]


def main() -> int:
    errors = validate_inputs()
    if errors:
        print(f"Crusades QA failed ({len(errors)}):", file=sys.stderr)
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Crusades QA: the flagship source and rights audit is valid.")
    for line in readiness(read(TABLE), read(PLACES)):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
