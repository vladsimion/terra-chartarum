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
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "crusades"
RELEASE = DATA / "release" / "cru-pilot-0.1"

PENDING = "pending"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Three registers, not three subjects. The two prototypes argue a road and a
# campaign; the third argues the place both of them are pointed at, and it is a
# separate proof because its evidence behaves differently - a world image is not
# a witness to where anything was (KAN-438).
PROOFS = {"matthew_paris", "fourth_crusade", "jerusalem"}
PILOT_PROOFS = {"matthew_paris", "fourth_crusade"}
SOURCE_KINDS = {
    "manuscript_witness",
    "critical_edition",
    "primary_narrative",
    "instrument",
    # A single object with a holder and a name and no shelfmark in the ordinary
    # sense: a cathedral's map, a church floor, a loose printed sheet.
    "map_object",
}
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
STAGES = "itinerary-stages.csv"
STATES = "fourth-crusade-states.csv"
ROLES = "jerusalem-roles.csv"

# CRU-3. A stage of the itinerary is a cell in a strip diagram, not a point on a
# map, and `manuscript_depiction` is the only class it can have. The distinction
# is the prototype's whole subject.
STAGE_MODES = {"road", "sea", "pass"}
STAGE_EVIDENCE = {"manuscript_depiction"}

# CRU-4. Six states a single route line would destroy.
STATE_KINDS = {
    "intended_destination",
    "negotiated_diversion",
    "travelled_route",
    "attack",
    "partition_claim",
    "durable_control",
}
STATE_EVIDENCE = {
    "documented_intent",
    "documented_claim",
    "primary_narrative",
    "scholarly_reconstruction",
}
GEOMETRY_PROVENANCE = {"editorial_generalisation", "modern_reference", "not_spatial"}
HELD = {"held", "claimed_not_held", "not_applicable"}
CONFIDENCE = {"high", "medium", "low", "contested", "unresolved"}
# Layers the VMN programme already publishes. A Crusades row may point at one;
# it may not re-author what is behind it.
VMN_LAYERS = {"venetian-ports", "venetian-routes", "venetian-possessions"}

# 15-25 core places was the pilot's own bound (KAN-385): enough to carry both
# proofs, few enough that every one can be argued for. The Holy Land register
# gets its own bound rather than widening that one, because a flagship that
# quietly relaxes a limit it set for itself has stopped having a limit.
PLACE_RANGES = {"pilot": (15, 25), "jerusalem": (4, 10)}
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
    # The Holy Land register (KAN-438). A sacred centre is a role a place holds
    # in an argument, and it is the one role here that is never drawn.
    "sacred_centre",
    "levant_port",
    "pilgrim_landfall",
    "egyptian_port",
    "successor_port",
}

# CRU-7. The registers the Holy Land act argues in. Each one is a different kind
# of claim about the same city, and the difference is the act's subject: a world
# image putting Jerusalem in the middle, a text ordering the land from Acre and a
# port with a quay are not three versions of one statement.
ROLE_KINDS = {
    "sacred_centre",
    "pilgrimage_destination",
    "textual_construct",
    "cartographic_construct",
    "network_node",
    "cartographic_memory",
}
ROLE_EVIDENCE = {
    "world_image",
    "manuscript_depiction",
    "described_geography",
    "cartographic_construction",
    "network_inference",
    "later_impression",
}
# Registers that are claims about meaning rather than about position. Giving one
# of these a coordinate answers the question the act asks.
UNPLACEABLE_ROLES = {
    "sacred_centre",
    "pilgrimage_destination",
    "textual_construct",
    "cartographic_construct",
    "cartographic_memory",
}
# The year the last mainland crusader port fell. A record of later cartographic
# memory has to be later than the thing it remembers.
MEMORY_AFTER = 1291
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


def validate_inputs(*, include_release: bool = True) -> list[str]:
    errors: list[str] = []
    validate_debts(errors, validate_gates(errors))
    place_ids = validate_places(errors)
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
        # The Holy Land sources say which register they can speak in, so a text
        # cannot be silently recruited as evidence for a picture.
        if proof == "jerusalem":
            for register in pipe(row["covers"]):
                if register not in ROLE_KINDS:
                    errors.append(f"{label}: '{register}' is not a Holy Land register")
                if register == "cartographic_memory":
                    errors.append(
                        f"{label}: later cartographic memory is carried by a catalogue record, "
                        "not by a source in this audit"
                    )

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

    validate_stages(errors, place_ids)
    validate_states(errors, place_ids, seen)
    validate_roles(errors, place_ids, seen)
    if include_release:
        validate_release(errors)
    return errors


def validate_places(errors: list[str]) -> set[str]:
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

    counts = {"pilot": 0, "jerusalem": 0}
    for row in rows:
        counts["jerusalem" if row["proof"] == "jerusalem" else "pilot"] += 1
    for group, (low, high) in sorted(PLACE_RANGES.items()):
        if not low <= counts[group] <= high:
            errors.append(
                f"places: the {group} register holds {low}-{high} core places, "
                f"found {counts[group]}"
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
        if row["name_arabic"] and "Arabic" not in row["script_note"]:
            errors.append(
                f"{label}: an Arabic form must say in script_note how it relates to the others"
            )
        # The Holy Land rule (KAN-438). A place in the Levant register that
        # carries only the names its conquerors used, with nothing saying why,
        # publishes the crusaders' map of the place as the place.
        if row["proof"] == "jerusalem" and not row["name_arabic"]:
            if "Arabic" not in row["script_note"]:
                errors.append(
                    f"{label}: a Holy Land place needs an Arabic form, or a script_note saying "
                    "why it has none"
                )

        try:
            lon, lat = float(row["lon"]), float(row["lat"])
        except ValueError:
            errors.append(f"{label}: coordinates are not numbers")
        else:
            if not (-25.0 <= lon <= 45.0 and 29.0 <= lat <= 60.0):
                errors.append(f"{label}: {lon},{lat} is outside the London-to-Jerusalem window")
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
    return seen


def validate_stages(errors: list[str], places: set[str]) -> None:
    """The Road proof (KAN-386).

    One rule carries the prototype. Matthew Paris's itinerary is a strip diagram:
    a vertical sequence of stages with day-marks between them, and no projection
    of any kind. A stage therefore has no coordinates, and the schema gives it
    nowhere to put one. The modern reference position lives on the place record,
    where it is already declared `modern_reference`.

    Comparing the two is the point of the interaction. Merging them would answer
    the question the prototype exists to ask.
    """
    rows = read(STAGES)
    seen: set[str] = set()
    sequences: set[int] = set()

    for row in rows:
        stage_id = row["stage_id"]
        label = f"itinerary-stages[{stage_id}]"
        if not stage_id.startswith("cru-itn-") or not SLUG.match(stage_id):
            errors.append(f"{label}: stage_id must be a cru-itn- slug")
        if stage_id in seen:
            errors.append(f"{label}: duplicate stage_id")
        seen.add(stage_id)

        if row["place_id"] not in places:
            errors.append(f"{label}: place_id '{row['place_id']}' does not resolve")
        if row["mode"] not in STAGE_MODES:
            errors.append(f"{label}: mode '{row['mode']}' is not recognised")
        if row["evidence_class"] not in STAGE_EVIDENCE:
            errors.append(f"{label}: a stage is a manuscript depiction and nothing else")
        if row["confidence"] not in CONFIDENCE:
            errors.append(f"{label}: confidence '{row['confidence']}' is not recognised")
        if row["review_state"] not in REVIEW_STATES:
            errors.append(f"{label}: review_state '{row['review_state']}' is not recognised")
        for field in ("manuscript_label", "notes", "folio", "source_locator"):
            if not row[field]:
                errors.append(f"{label}: {field} is required, pending if untranscribed")
        if not row["sequence"].isdigit():
            errors.append(f"{label}: sequence must be a number")
        else:
            value = int(row["sequence"])
            if value in sequences:
                errors.append(f"{label}: duplicate sequence {value}")
            sequences.add(value)
        # A day-mark is what the diagram draws between stages. It is the
        # manuscript's own claim about the journey, not a measurement, and it is
        # recorded as depicted rather than converted into anything.
        if row["depicted_days"] and not row["depicted_days"].isdigit():
            errors.append(f"{label}: depicted_days must be a whole number of day-marks")
        # The rule the whole proof rests on.
        if any(key in row for key in ("lon", "lat", "geometry")):
            errors.append(f"{label}: an itinerary stage may not carry a position")
        if row["review_state"] != "raw" and row["source_locator"] == PENDING:
            errors.append(f"{label}: a stage above raw needs the folio it was read from")

    if sequences and sequences != set(range(1, len(rows) + 1)):
        errors.append("itinerary-stages: the sequence must run 1..n with no gaps")


def validate_states(errors: list[str], places: set[str], sources: set[str]) -> None:
    """The Sea proof (KAN-387).

    Six states, and the rule that keeps them apart: a claim is not a possession.
    The Partitio Romaniae assigned an empire among people who held very little of
    it, and a map that draws the assignment and the occupation the same way is
    republishing the document's wishful thinking as geography.
    """
    rows = read(STATES)
    seen: set[str] = set()
    kinds: set[str] = set()

    for row in rows:
        state_id = row["state_id"]
        label = f"fourth-crusade-states[{state_id}]"
        if not state_id.startswith("cru-fcs-") or not SLUG.match(state_id):
            errors.append(f"{label}: state_id must be a cru-fcs- slug")
        if state_id in seen:
            errors.append(f"{label}: duplicate state_id")
        seen.add(state_id)

        kind = row["state_kind"]
        if kind not in STATE_KINDS:
            errors.append(f"{label}: state_kind '{kind}' is not recognised")
        kinds.add(kind)
        if row["evidence_class"] not in STATE_EVIDENCE:
            errors.append(f"{label}: evidence_class '{row['evidence_class']}' is not recognised")
        if row["geometry_provenance"] not in GEOMETRY_PROVENANCE:
            errors.append(f"{label}: geometry_provenance is not recognised")
        if row["held"] not in HELD:
            errors.append(f"{label}: held '{row['held']}' is not recognised")
        if row["confidence"] not in CONFIDENCE:
            errors.append(f"{label}: confidence '{row['confidence']}' is not recognised")
        if row["review_state"] not in REVIEW_STATES:
            errors.append(f"{label}: review_state '{row['review_state']}' is not recognised")
        if row["source_id"] not in sources:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        for place_id in pipe(row["place_ids"]):
            if place_id not in places:
                errors.append(f"{label}: place '{place_id}' does not resolve")
        if not row["notes"]:
            errors.append(f"{label}: notes is required")

        if row["geometry_provenance"] == "not_spatial":
            if row["geometry"]:
                errors.append(f"{label}: a not_spatial state must not carry geometry")
        elif not row["geometry"].startswith("LINESTRING ("):
            errors.append(f"{label}: a spatial state needs LINESTRING geometry")

        # The two rules that stop the Sea proof lying.
        if kind == "partition_claim" and row["held"] != "claimed_not_held":
            errors.append(f"{label}: a partition claim must be recorded as claimed and not held")
        if kind == "partition_claim" and row["geometry"]:
            errors.append(
                f"{label}: the partition's boundaries are disputed; drawing them publishes a "
                "claim as a map"
            )
        if kind == "durable_control" and row["held"] != "held":
            errors.append(f"{label}: durable control means it was held")
        # No route in this corpus survives as a track, so none may be drawn as one.
        if row["geometry"] and row["geometry_provenance"] != "editorial_generalisation":
            errors.append(f"{label}: no source gives a track, so any line here is a generalisation")
        if row["vmn_reference"] and row["vmn_reference"] not in VMN_LAYERS:
            errors.append(f"{label}: vmn_reference '{row['vmn_reference']}' is not a VMN layer")

    # A Sea proof missing any of these is not the argument the ticket asks for.
    for missing in sorted(STATE_KINDS - kinds):
        errors.append(f"fourth-crusade-states: no record for the '{missing}' state")


def validate_roles(errors: list[str], places: set[str], sources: set[str]) -> None:
    """The Holy Land register (KAN-438).

    The act this table carries is that Jerusalem is not one kind of thing. It is
    the middle of a world image, the end of a road that stops at Otranto, a land
    described in divisions taken from a port, a grid drawn for an expedition
    nobody mounted, a set of quays with cargo on them, and - centuries later - an
    emblem. Six registers, and the rules below exist to stop them collapsing
    into a list of places with dates.

    Two of the rules do most of the work. A register that is a claim about
    meaning may not carry a position, because giving the sacred centre a
    coordinate answers the question the act asks: the centre of a mappa mundi is
    not at 31.78N, it is in the middle. And later cartographic memory may not
    cite a source in the audit at all - an early-modern woodcut that centres
    Jerusalem is evidence about the sixteenth century, and the only way to keep
    it from becoming evidence about the twelfth is to give it nowhere in the
    corpus to stand.
    """
    rows = read(ROLES)
    seen: set[str] = set()
    sequences: set[int] = set()
    kinds: set[str] = set()

    for row in rows:
        role_id = row["role_id"]
        label = f"jerusalem-roles[{role_id}]"
        if not role_id.startswith("cru-jer-") or not SLUG.match(role_id):
            errors.append(f"{label}: role_id must be a cru-jer- slug")
        if role_id in seen:
            errors.append(f"{label}: duplicate role_id")
        seen.add(role_id)

        kind = row["role_kind"]
        if kind not in ROLE_KINDS:
            errors.append(f"{label}: role_kind '{kind}' is not a Holy Land register")
        kinds.add(kind)
        if row["evidence_class"] not in ROLE_EVIDENCE:
            errors.append(f"{label}: evidence_class '{row['evidence_class']}' is not recognised")
        if row["geometry_provenance"] not in {"modern_reference", "not_spatial"}:
            errors.append(f"{label}: geometry_provenance is not recognised")
        if row["confidence"] not in CONFIDENCE:
            errors.append(f"{label}: confidence '{row['confidence']}' is not recognised")
        if row["review_state"] not in REVIEW_STATES:
            errors.append(f"{label}: review_state '{row['review_state']}' is not recognised")
        for field in ("display_name", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")

        if not row["sequence"].isdigit():
            errors.append(f"{label}: sequence must be a number")
        else:
            value = int(row["sequence"])
            if value in sequences:
                errors.append(f"{label}: duplicate sequence {value}")
            sequences.add(value)

        named = pipe(row["place_ids"])
        if not named:
            errors.append(f"{label}: a register record must name the place it is about")
        for place_id in named:
            if place_id not in places:
                errors.append(f"{label}: place '{place_id}' does not resolve")

        for field in ("date_from", "date_to"):
            if not row[field].lstrip("-").isdigit():
                errors.append(f"{label}: {field} must be a year")
        if row["date_from"].isdigit() and row["date_to"].isdigit():
            if int(row["date_from"]) > int(row["date_to"]):
                errors.append(f"{label}: the record ends before it starts")

        # The rule the act rests on.
        if kind in UNPLACEABLE_ROLES and row["geometry_provenance"] != "not_spatial":
            errors.append(
                f"{label}: '{kind}' is a claim about what the city means, not about where it is; "
                "a position here answers the question the register asks"
            )
        if kind == "network_node":
            if row["geometry_provenance"] != "modern_reference":
                errors.append(f"{label}: a node in the network is a port and is drawn at one")
            if len(named) != 1:
                errors.append(f"{label}: a node is one place, not {len(named)}")

        if kind == "cartographic_memory":
            # An early-modern map of the Holy Land is not a witness to medieval
            # geography, and the surest way to keep it from becoming one is to
            # refuse it a row in the source corpus.
            if row["source_id"]:
                errors.append(
                    f"{label}: later cartographic memory rests on its catalogue record, not on a "
                    "source in the audit; citing one would make a later map evidence for an "
                    "earlier geography"
                )
            if not row["catalogue_object_id"]:
                errors.append(f"{label}: later cartographic memory must name its catalogue object")
            if row["date_from"].isdigit() and int(row["date_from"]) < MEMORY_AFTER:
                errors.append(
                    f"{label}: memory of the crusader Holy Land cannot predate {MEMORY_AFTER}"
                )
        else:
            if row["source_id"] not in sources:
                errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
            if not row["source_locator"]:
                errors.append(f"{label}: source_locator is required, pending if unread")
            if row["review_state"] != "raw" and row["source_locator"] == PENDING:
                errors.append(f"{label}: a record above raw needs the page it was read from")

        if row["catalogue_object_id"] and not SLUG.match(row["catalogue_object_id"]):
            errors.append(f"{label}: catalogue_object_id must be a catalogue slug")
        if row["vmn_reference"] and row["vmn_reference"] not in VMN_LAYERS:
            errors.append(f"{label}: vmn_reference '{row['vmn_reference']}' is not a VMN layer")

    if sequences and sequences != set(range(1, len(rows) + 1)):
        errors.append("jerusalem-roles: the sequence must run 1..n with no gaps")
    # An act missing a register is an act making a different argument.
    for missing in sorted(ROLE_KINDS - kinds):
        errors.append(f"jerusalem-roles: no record in the '{missing}' register")


def validate_release(errors: list[str]) -> None:
    """Check the compiled pilot against the hashes it recorded (KAN-388).

    The rule that catches a table edited but never rebuilt. Without it every
    other check here would pass against inputs the published assets no longer
    describe.
    """
    manifest_path = RELEASE / "manifest.json"
    if not manifest_path.exists():
        errors.append("release: manifest.json is missing; run `make crusades`")
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    for relative, recorded in sorted(manifest.get("inputs", {}).items()):
        path = REPO / relative
        if not path.exists():
            errors.append(f"release: input {relative} is in the manifest but not on disk")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != recorded:
            errors.append(f"release: {relative} has changed since the last build")

    for relative, recorded in sorted(manifest.get("outputs", {}).items()):
        path = REPO / relative
        if not path.exists():
            errors.append(f"release: output {relative} is missing; run `make crusades`")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != recorded["sha256"]:
            errors.append(f"release: {relative} does not match its recorded hash")

    if manifest.get("clearedWitnesses", 0) != 0:
        errors.append(
            "release: a witness is marked cleared for publication, but no folio in this corpus "
            "has been transcribed"
        )


GATES = "reference/gates.csv"
DEBTS = "reference/verification-debt.csv"
GATE_IDS = ("research", "rights", "data", "interaction", "editorial", "release")
GATE_STATUSES = {"pending", "partial", "passed", "waived"}
DEBT_KINDS = {"verification", "rights"}


def validate_gates(errors: list[str]) -> set[tuple[str, str]]:
    """The flagship's own gates, per proof (KAN-384/KAN-385).

    The Dacia programme records why a trench is stopped and which ticket owns
    each gate; this pilot recorded neither, so its five open tickets read as
    blocked for no stated reason. The shape is deliberately the same as
    `trench-gates.csv` so the two registers can be read the same way, with
    `proof` where Dacia has `trench`.
    """
    rows = read(GATES)
    pairs: set[tuple[str, str]] = set()
    proofs = {row["proof"] for row in read(TABLE)}

    for row in rows:
        proof, gate = row["proof_id"], row["gate_id"]
        label = f"gates[{proof}/{gate}]"
        if proof not in proofs:
            errors.append(f"{label}: proof_id is not a proof the source audit knows")
        if gate not in GATE_IDS:
            errors.append(f"{label}: gate_id '{gate}' is not a recognised gate")
        if (proof, gate) in pairs:
            errors.append(f"{label}: duplicate gate row")
        pairs.add((proof, gate))
        if row["status"] not in GATE_STATUSES:
            errors.append(f"{label}: status '{row['status']}' is not recognised")
        if not row["jira_key"].startswith("KAN-"):
            errors.append(f"{label}: jira_key must name the ticket that owns the gate")
        if not row["note"]:
            errors.append(f"{label}: a gate with no note explains nothing")
        # A gate above pending has to point at something a reader can open.
        if row["status"] in {"partial", "passed"} and not row["evidence"]:
            errors.append(f"{label}: status '{row['status']}' needs evidence")
        if row["evidence"] and not (REPO / row["evidence"]).exists():
            errors.append(f"{label}: evidence '{row['evidence']}' does not exist")

    for proof in sorted(proofs):
        for gate in GATE_IDS:
            if (proof, gate) not in pairs:
                errors.append(f"gates: {proof} has no {gate} gate")

    # Nothing may claim release while a release-blocking gate is open. The
    # essay is held; a passed release gate here would contradict the hold.
    by_pair = {(r["proof_id"], r["gate_id"]): r for r in rows}
    for proof in sorted(proofs):
        release = by_pair.get((proof, "release"))
        if release and release["status"] == "passed":
            unmet = [
                gate
                for gate in GATE_IDS[:-1]
                if by_pair.get((proof, gate), {}).get("status") not in {"passed", "waived"}
            ]
            if unmet:
                errors.append(
                    f"gates: {proof} claims release while {', '.join(unmet)} have not passed"
                )
    return pairs


def validate_debts(errors: list[str], pairs: set[tuple[str, str]]) -> None:
    """Why each gate is stopped, joined to the gate it stops (KAN-384/KAN-385)."""
    rows = read(DEBTS)
    seen: set[str] = set()
    for row in rows:
        debt_id = row["debt_id"]
        label = f"verification-debt[{debt_id}]"
        if not debt_id.startswith("vd-cru-") or not SLUG.match(debt_id):
            errors.append(f"{label}: debt_id must be a vd-cru- slug")
        if debt_id in seen:
            errors.append(f"{label}: duplicate debt_id")
        seen.add(debt_id)
        if row["kind"] not in DEBT_KINDS:
            errors.append(f"{label}: kind '{row['kind']}' must be verification or rights")
        for field in ("statement", "resolution_path"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["status"] not in {"open", "resolved"}:
            errors.append(f"{label}: status '{row['status']}' must be open or resolved")
        if row["raised_in"] and not (REPO / row["raised_in"]).exists():
            errors.append(f"{label}: raised_in '{row['raised_in']}' does not exist")
        # An open item that reaches no gate reaches no ticket either, and is the
        # one way an outstanding item is lost while still marked open.
        targets = pipe(row["blocks"])
        if row["status"] == "open" and not targets:
            errors.append(f"{label}: an open item must name the gate it blocks")
        for target in targets:
            proof, _, gate = target.partition(":")
            if (proof, gate) not in pairs:
                errors.append(f"{label}: blocks '{target}' is not a proof:gate pair")

    # And the other direction: a gate below passed with nothing blocking it is
    # a gate nobody can act on, which is what this register exists to prevent.
    blocked = {t for row in rows if row["status"] == "open" for t in pipe(row["blocks"])}
    by_pair = {(r["proof_id"], r["gate_id"]): r for r in read(GATES)}
    for (proof, gate), row in sorted(by_pair.items()):
        if row["status"] in {"pending", "partial"} and f"{proof}:{gate}" not in blocked:
            errors.append(
                f"gates[{proof}/{gate}]: status '{row['status']}' with no open debt naming it; "
                "either record what is missing or move the gate"
            )


def readiness(rows: list[dict[str, str]], places: list[dict[str, str]]) -> list[str]:
    cleared = [row for row in rows if row["production_role"] != "research_only"]
    by_proof = {proof: sum(1 for row in rows if row["proof"] == proof) for proof in sorted(PROOFS)}
    roles = read(ROLES)
    return [
        f"  sources: {len(rows)} audited across three registers "
        f"({by_proof['matthew_paris']} Matthew Paris, "
        f"{by_proof['fourth_crusade']} Fourth Crusade, {by_proof['jerusalem']} Holy Land)",
        f"  verification: {sum(1 for r in rows if r['verification_state'] == 'verified')} verified, "
        f"{sum(1 for r in rows if r['locator'] == PENDING)} with untranscribed folios",
        f"  rights: {len(cleared)} cleared for publication; "
        f"{sum(1 for r in rows if r['rights_status'] in OPEN_PRODUCTION_RIGHTS)} open as texts",
        f"  places: {len(places)} core places, "
        f"{sum(1 for r in places if r['name_greek'])} carrying a Greek form; "
        f"all coordinates modern reference context",
        f"  Road proof: {len(read(STAGES))} itinerary stages, none with a position of its own; "
        f"{sum(1 for r in read(STAGES) if r['folio'] == PENDING)} folios untranscribed",
        f"  Sea proof: {len(read(STATES))} states across "
        f"{len({r['state_kind'] for r in read(STATES)})} kinds; "
        f"{sum(1 for r in read(STATES) if r['held'] == 'claimed_not_held')} claimed but not held",
        f"  Holy Land register: {len(roles)} records across "
        f"{len({r['role_kind'] for r in roles})} registers; "
        f"{sum(1 for r in roles if r['geometry_provenance'] == 'not_spatial')} of them carry no "
        f"position, because what they record is not a position",
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
