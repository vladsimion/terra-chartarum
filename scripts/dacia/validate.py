#!/usr/bin/env python3
"""Validate Corpus Chartarum Daciae reference tables, the CND corpus and the pilot.

Covers KAN-329 (programme IDs and repository conventions), KAN-330 (controlled
vocabularies), KAN-331 (trench gates and campaign criteria), KAN-332 (place,
source and attestation schemas) and KAN-333 (Trench A inventory and the frozen
40-place pilot).

Standard library only, so the gate runs on a bare python3 the way the Hanseatic
validator does. Every path resolves through the module-level DATA constant,
which the tests repoint at a private copy of data/dacia.

The rules that matter here are the ones that only fire on data nobody has
written yet: a record may stay unfinished for as long as it likes, but the
moment it claims to be reviewed, every field the claim rests on has to be real.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "dacia"

# "Not yet established", as opposed to "empty". Tolerated only while a record
# is still raw; promoting a record is what forces its pending fields to be real.
PENDING = "pending"

# Identifiers are kebab-case (plc-apulum); vocabulary terms are snake_case
# (source_silent). Keeping the two shapes distinct means an ID can never be
# mistaken for a term, or a term quietly used as a join key.
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TERM = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*$")
JIRA_KEY = re.compile(r"^KAN-\d+$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

DISPOSITIONS = {"migrate", "link", "preserve_local", "retire"}
MIGRATION_STATES = {"done", "partial", "planned"}
GATE_STATUSES = {"pending", "partial", "passed", "waived"}
TABLE_STATES = {"live", "planned", "reserved"}
SOURCE_LEDGER_REVIEW_STATES = {"candidate", "source_checked", "reviewed"}
HIATUS_SILENCE_ASSESSMENTS = {"not_assessed", "not_applicable", "meaningful_silence"}
HIATUS_APPLICABILITY = {"applicable", "place_names_only", "not_applicable"}
SOURCE_LEDGER_RIGHTS = {
    "licensed_access",
    "no_known_restrictions",
    "permission_required",
    "public_domain_text",
    "rights_review_required",
    "un_reuse_review_required",
    "us_government_work",
}
TREATY_RECORD_TYPES = {
    "proposal_map",
    "negotiated_line",
    "final_instrument",
    "implementation_instrument",
    "arbitration_award",
    "armistice",
    "later_reconstruction",
}
TREATY_INTERPRETATION_STATES = {"uncontested", "ambiguous", "disputed"}
TREATY_GEOMETRY_STATES = {
    "no_geometry",
    "commission_geometry_required",
    "map_not_georeferenced",
    "annex_map_unacquired",
}

# An attestation either records a name or records a silence. The two halves of
# the taxonomy carry mutually exclusive fields, which is what stops a silence
# quietly acquiring a reading.
NAMED_CLASSES = {"exact", "variant", "alternative", "textual_only", "reconstructed"}
SILENT_CLASSES = {
    "extra_muros",
    "source_silent",
    "not_applicable",
    "survival_unknown",
    "mapped_unlabelled",
}

# KAN-330 froze these sets. Pinning them here means dropping or renaming a term
# fails the gate instead of silently changing what the corpus can say.
REQUIRED_TERMS = {
    "attestation_class": NAMED_CLASSES | SILENT_CLASSES,
    "confidence": {"direct", "high", "medium", "low", "editorial_reconstruction"},
    "geometry_provenance": {
        "source_geometry",
        "georeferenced_source",
        "scholarly_reconstruction",
        "editorial_reconstruction",
        "display_generalisation",
    },
    "date_precision": {
        "exact_year",
        "year_range",
        "circa",
        "century",
        "terminus_post_quem",
        "terminus_ante_quem",
        "disputed",
        "undated",
    },
    "review_state": {"raw", "normalized", "reviewed", "approved", "published"},
}

# KAN-333 requires the pilot to span these regimes deliberately rather than by
# accident, so the coverage claim is checked instead of asserted in prose.
REQUIRED_PILOT_AXES = {
    "roman_centre",
    "frontier_site",
    "danube_crossing",
    "transylvanian",
    "wallachian",
    "moldavian",
    "black_sea",
    "medieval_textual",
    "name_variation",
}
PILOT_SIZE = 40
MIN_SOURCE_FAMILIES = 4

# Degrees, EPSG:4326. Wide enough for the whole Dacia cycle and narrow enough
# that a transposed longitude/latitude pair falls outside it.
LON_RANGE = (20.0, 30.5)
LAT_RANGE = (43.0, 49.0)

REFERENCE = "reference"
PILOT = "pilot"

TABLES = {
    "programme_ids": f"{REFERENCE}/programme-ids.csv",
    "entity_prefixes": f"{REFERENCE}/entity-prefixes.csv",
    "vocabularies": f"{REFERENCE}/vocabularies.csv",
    "vocabulary_examples": f"{REFERENCE}/vocabulary-examples.csv",
    "gates": f"{REFERENCE}/gates.csv",
    "trench_gates": f"{REFERENCE}/trench-gates.csv",
    "campaigns": f"{REFERENCE}/campaigns.csv",
    "verification_debt": f"{REFERENCE}/verification-debt.csv",
    "hiatus_witness_families": f"{REFERENCE}/hiatus-witness-families.csv",
    "treaty_frontier_sources": f"{REFERENCE}/treaty-frontier-sources.csv",
    "places": "places.csv",
    "sources": "sources.csv",
    "attestations": "attestations.csv",
    "transcriptions": "transcriptions.csv",
    "name_uses": "name-uses.csv",
    "name_use_edges": "name-use-edges.csv",
    "inventory": f"{PILOT}/trench-a-inventory.csv",
    "pilot_places": f"{PILOT}/pilot-places.csv",
}
PILOT_MANIFEST = f"{PILOT}/pilot-manifest.json"
SOURCE_LEDGER_MANIFEST = f"{REFERENCE}/source-ledger-manifest.json"


def _read(key: str, errors: list[str]) -> list[dict[str, str]]:
    """Read one table, reporting a missing file rather than raising."""
    path = DATA / TABLES[key]
    if not path.exists():
        errors.append(f"missing table: {path.relative_to(REPO)}")
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def _pipe_set(value: str) -> list[str]:
    return [part for part in value.split("|") if part]


def _check_unique(rows, column, label, errors) -> None:
    seen = set()
    for row in rows:
        value = row.get(column, "")
        if value in seen:
            errors.append(f"{label}: duplicate {column} '{value}'")
        seen.add(value)


def _check_vocab(value, vocabulary, terms, label, field, errors, *, allow_empty=False) -> None:
    if not value:
        if not allow_empty:
            errors.append(f"{label}: {field} is required")
        return
    if value not in terms.get(vocabulary, set()):
        errors.append(f"{label}: {field} '{value}' is not an approved {vocabulary} term")


def _check_path(value, label, field, errors) -> None:
    if value and not (REPO / value).exists():
        errors.append(f"{label}: {field} points at a missing path '{value}'")


def _check_https(value, label, field, errors) -> None:
    if not value.startswith("https://"):
        errors.append(f"{label}: {field} must be an https URL")


def validate_vocabularies(errors: list[str]) -> tuple[dict[str, set[str]], dict[str, int]]:
    """Return approved terms per vocabulary and the review-state rank ladder."""
    rows = _read("vocabularies", errors)
    terms: dict[str, set[str]] = {}
    deprecated: dict[tuple[str, str], str] = {}
    ranks: dict[str, int] = {}
    seen = set()

    for row in rows:
        vocabulary, term, status = row["vocabulary"], row["term"], row["status"]
        label = f"vocabularies[{vocabulary}/{term}]"
        if (vocabulary, term) in seen:
            errors.append(f"{label}: duplicate term")
        seen.add((vocabulary, term))
        if not TERM.match(term):
            errors.append(f"{label}: term is not a lowercase snake_case term")
        if not row["definition"]:
            errors.append(f"{label}: definition is required")
        if status == "approved":
            terms.setdefault(vocabulary, set()).add(term)
        elif status == "deprecated":
            if not row["use_instead_of"]:
                errors.append(f"{label}: a deprecated term must name its replacement")
            deprecated[(vocabulary, term)] = row["use_instead_of"]
        else:
            errors.append(f"{label}: status '{status}' must be approved or deprecated")

        if vocabulary == "review_state":
            if not row["rank"].isdigit():
                errors.append(f"{label}: review_state requires an integer rank")
            else:
                ranks[term] = int(row["rank"])
        elif row["rank"]:
            errors.append(f"{label}: only review_state terms carry a rank")

    for (vocabulary, term), replacement in deprecated.items():
        if replacement not in terms.get(vocabulary, set()):
            errors.append(
                f"vocabularies[{vocabulary}/{term}]: replacement '{replacement}' is not approved"
            )

    for vocabulary, required in REQUIRED_TERMS.items():
        missing = required - terms.get(vocabulary, set())
        if missing:
            errors.append(f"vocabularies: {vocabulary} is missing {sorted(missing)}")

    if ranks and sorted(ranks.values()) != list(range(len(ranks))):
        errors.append("vocabularies: review_state ranks must be contiguous from zero")

    return terms, ranks


def validate_programme(terms, errors: list[str]) -> tuple[set[str], set[str]]:
    """KAN-329: programme identifiers, entity prefixes and their repository homes."""
    rows = _read("programme_ids", errors)
    _check_unique(rows, "id", "programme-ids", errors)
    trenches: set[str] = set()
    campaigns_used: set[str] = set()

    for row in rows:
        label = f"programme-ids[{row['id']}]"
        if not SLUG.match(row["id"]):
            errors.append(f"{label}: id is not a lowercase slug")
        if not JIRA_KEY.match(row["epic_key"]):
            errors.append(f"{label}: epic_key '{row['epic_key']}' is not a KAN key")
        if row["jira_label"] != row["id"] and row["kind"] != "programme":
            errors.append(f"{label}: jira_label must equal the repository id")
        if row["state"] not in TABLE_STATES:
            errors.append(f"{label}: state '{row['state']}' is not recognised")
        if row["kind"] == "trench":
            trenches.add(row["id"])
        campaigns_used.add(row["campaign"])

    prefixes = _read("entity_prefixes", errors)
    _check_unique(prefixes, "prefix", "entity-prefixes", errors)
    programme_ids = {row["id"] for row in rows}

    for row in prefixes:
        label = f"entity-prefixes[{row['prefix']}]"
        if not SLUG.match(row["prefix"]):
            errors.append(f"{label}: prefix is not a lowercase slug")
        if row["owner_id"] not in programme_ids:
            errors.append(f"{label}: owner_id '{row['owner_id']}' is not a programme id")
        if not row["externally_stable_from"]:
            errors.append(f"{label}: externally_stable_from is required")
        if row["state"] not in TABLE_STATES:
            errors.append(f"{label}: state '{row['state']}' is not recognised")
            continue
        exists = (REPO / row["authority_table"]).exists()
        if row["state"] == "live" and not exists:
            errors.append(f"{label}: live authority table is missing '{row['authority_table']}'")
        if row["state"] == "reserved" and exists:
            errors.append(
                f"{label}: '{row['authority_table']}' now exists; promote the prefix to live"
            )

    return trenches, campaigns_used


def validate_examples(terms, errors: list[str], places: set[str], sources: set[str]) -> None:
    """KAN-330: every ambiguous class carries a worked example and a contrast."""
    rows = _read("vocabulary_examples", errors)
    _check_unique(rows, "example_id", "vocabulary-examples", errors)
    covered: set[tuple[str, str]] = set()

    for row in rows:
        label = f"vocabulary-examples[{row['example_id']}]"
        vocabulary, term = row["vocabulary"], row["term"]
        _check_vocab(term, vocabulary, terms, label, "term", errors)
        covered.add((vocabulary, term))
        if not row["why_this_term"]:
            errors.append(f"{label}: why_this_term is required")
        contrast = row["contrast_with"]
        if contrast:
            _check_vocab(contrast, vocabulary, terms, label, "contrast_with", errors)
            if contrast == term:
                errors.append(f"{label}: contrast_with must differ from term")

        grounding = row["grounding"]
        cited = bool(row["place_id"] or row["source_id"])
        if grounding == "trench_a":
            if not cited:
                errors.append(f"{label}: a trench_a example must cite a place or a source")
            if row["place_id"] and row["place_id"] not in places:
                errors.append(f"{label}: place_id '{row['place_id']}' does not resolve")
            if row["source_id"] and row["source_id"] not in sources:
                errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        elif grounding == "illustrative":
            if cited:
                errors.append(f"{label}: an illustrative example must not cite real records")
        else:
            errors.append(f"{label}: grounding '{grounding}' must be trench_a or illustrative")

    for term in sorted(REQUIRED_TERMS["attestation_class"]):
        if ("attestation_class", term) not in covered:
            errors.append(f"vocabulary-examples: attestation_class '{term}' has no example record")


def validate_gates(trenches: set[str], campaigns_used: set[str], errors: list[str]) -> None:
    """KAN-331: the six-gate matrix, and what a passing release actually requires."""
    gates = _read("gates", errors)
    _check_unique(gates, "gate_id", "gates", errors)
    blocking = {row["gate_id"] for row in gates if row["blocks_release"] == "yes"}
    orders = sorted(int(row["order"]) for row in gates if row["order"].isdigit())
    if orders != list(range(1, len(gates) + 1)):
        errors.append("gates: order must run from one without gaps")
    for row in gates:
        label = f"gates[{row['gate_id']}]"
        if not row["question"] or not row["evidence_kind"]:
            errors.append(f"{label}: question and evidence_kind are required")
        if row["blocks_release"] not in {"yes", "no"}:
            errors.append(f"{label}: blocks_release must be yes or no")

    gate_ids = {row["gate_id"] for row in gates}
    rows = _read("trench_gates", errors)
    status_by: dict[tuple[str, str], str] = {}

    for row in rows:
        trench, gate = row["trench_id"], row["gate_id"]
        label = f"trench-gates[{trench}/{gate}]"
        if trench not in trenches:
            errors.append(f"{label}: trench_id is not a registered trench")
        if gate not in gate_ids:
            errors.append(f"{label}: gate_id is not a registered gate")
        if (trench, gate) in status_by:
            errors.append(f"{label}: duplicate row")
        status_by[(trench, gate)] = row["status"]
        if row["status"] not in GATE_STATUSES:
            errors.append(f"{label}: status '{row['status']}' is not recognised")
        if row["jira_key"] and not JIRA_KEY.match(row["jira_key"]):
            errors.append(f"{label}: jira_key '{row['jira_key']}' is not a KAN key")
        _check_path(row["evidence"], label, "evidence", errors)
        if row["status"] == "passed" and not row["evidence"]:
            errors.append(f"{label}: a passed gate must cite evidence")
        if row["status"] == "waived" and not row["note"]:
            errors.append(f"{label}: a waived gate must record why")

    for trench in sorted(trenches):
        for gate in sorted(gate_ids):
            if (trench, gate) not in status_by:
                errors.append(f"trench-gates: {trench} has no {gate} gate")
        # Prose being finished is not a release. A trench only releases once
        # every blocking gate has actually passed.
        if status_by.get((trench, "release")) == "passed":
            unmet = sorted(g for g in blocking if status_by.get((trench, g)) != "passed")
            if unmet:
                errors.append(
                    f"trench-gates: {trench} claims release while {unmet} have not passed"
                )

    campaigns = _read("campaigns", errors)
    _check_unique(campaigns, "campaign", "campaigns", errors)
    declared = {row["campaign"] for row in campaigns}
    for row in campaigns:
        label = f"campaigns[{row['campaign']}]"
        for field in ("entry_criteria", "exit_criteria"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        for field in ("entry_evidence", "exit_evidence"):
            keys = _pipe_set(row[field])
            if not keys:
                errors.append(f"{label}: {field} must cite at least one Jira key")
            for key in keys:
                if not JIRA_KEY.match(key):
                    errors.append(f"{label}: {field} '{key}' is not a KAN key")

    for campaign in sorted(campaigns_used - declared):
        errors.append(f"campaigns: programme-ids uses undeclared campaign '{campaign}'")


def validate_places(terms, ranks, errors: list[str]) -> set[str]:
    """KAN-332: place authority — one row per referent, never one per name."""
    rows = _read("places", errors)
    _check_unique(rows, "place_id", "places", errors)
    ids: set[str] = set()

    for row in rows:
        place_id = row["place_id"]
        label = f"places[{place_id}]"
        ids.add(place_id)
        if not place_id.startswith("plc-") or not SLUG.match(place_id):
            errors.append(f"{label}: place_id must be a plc- slug")
        if not row["reference_name"]:
            errors.append(f"{label}: reference_name is required")
        _check_vocab(row["place_type"], "place_type", terms, label, "place_type", errors)
        _check_vocab(row["region"], "region", terms, label, "region", errors)
        _check_vocab(
            row["location_status"], "location_status", terms, label, "location_status", errors
        )
        _validate_review(row, label, terms, ranks, errors)

        # A place whose site is unsettled in the literature carries no coordinates
        # at all. Publishing one candidate as the reference location would turn an
        # open question into a point on a map.
        if row["location_status"] == "unlocated":
            for field in ("ref_lon", "ref_lat", "ref_geometry_provenance"):
                if row[field]:
                    errors.append(f"{label}: an unlocated place cannot carry {field}")
            if not row["note"]:
                errors.append(f"{label}: an unlocated place must record why")
        else:
            _check_vocab(
                row["ref_geometry_provenance"],
                "geometry_provenance",
                terms,
                label,
                "ref_geometry_provenance",
                errors,
            )
            for field, (low, high) in (("ref_lon", LON_RANGE), ("ref_lat", LAT_RANGE)):
                raw = row[field]
                if not raw:
                    errors.append(f"{label}: {field} is required")
                    continue
                try:
                    value = float(raw)
                except ValueError:
                    errors.append(f"{label}: {field} '{raw}' is not a number")
                    continue
                if not low <= value <= high:
                    errors.append(f"{label}: {field} {value} falls outside the Dacia bounding box")

        external = [row["pleiades_id"], row["whg_id"]]
        verified = row["external_verified"]
        if verified not in {"yes", "no"}:
            errors.append(f"{label}: external_verified must be yes or no")
        elif verified == "yes" and not any(external):
            errors.append(f"{label}: external_verified is yes with no external identifier")
        elif verified == "no" and any(external):
            errors.append(f"{label}: an external identifier is recorded but not verified")

    return ids


def validate_sources(terms, ranks, errors: list[str]) -> dict[str, str]:
    """KAN-332: source authority, including the scope that makes silence readable.

    Returns each source's review state, because whether a silence may be
    published depends on whether that source's scope has been read.
    """
    rows = _read("sources", errors)
    _check_unique(rows, "source_id", "sources", errors)
    ids: dict[str, str] = {}
    families: set[str] = set()

    for row in rows:
        source_id = row["source_id"]
        label = f"sources[{source_id}]"
        ids[source_id] = row["review_state"]
        if not source_id.startswith("src-") or not SLUG.match(source_id):
            errors.append(f"{label}: source_id must be a src- slug")
        for field in ("title", "creator", "witness", "repository", "citation"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        # Scope is load-bearing: it is what separates extra_muros from
        # source_silent, so a source without one cannot support an absence.
        if not row["scope"]:
            errors.append(f"{label}: scope is required")
        _check_vocab(row["date_precision"], "date_precision", terms, label, "date_precision", errors)
        _check_vocab(
            row["rights_statement"], "rights_statement", terms, label, "rights_statement", errors
        )
        _check_vocab(row["source_family"], "source_family", terms, label, "source_family", errors)
        families.add(row["source_family"])
        _validate_review(row, label, terms, ranks, errors)

        # A repository that cannot state an object identifier has not really been
        # checked, so the bar bites at review rather than at compilation.
        if ranks.get(row["review_state"], 0) >= ranks.get("reviewed", 2):
            for field in ("edition_state", "repository_object_id"):
                if not row[field]:
                    errors.append(f"{label}: a reviewed source requires {field}")

        precision = row["date_precision"]
        bounds = []
        for field in ("year_from", "year_to"):
            raw = row[field]
            if precision == "undated":
                if raw:
                    errors.append(f"{label}: an undated source may not carry {field}")
                continue
            if not raw.lstrip("-").isdigit():
                errors.append(f"{label}: {field} '{raw}' is not a year")
                continue
            bounds.append(int(raw))
        if len(bounds) == 2:
            year_from, year_to = bounds
            if year_from > year_to:
                errors.append(f"{label}: year_from {year_from} is later than year_to {year_to}")
            if precision in {"exact_year", "circa"} and year_from != year_to:
                errors.append(f"{label}: {precision} requires a single year")
            if precision == "year_range" and year_from == year_to:
                errors.append(f"{label}: year_range requires two distinct years")
        if precision == "disputed" and not row["note"]:
            errors.append(f"{label}: a disputed date requires a recorded editorial decision")

    # KAN-334: the pilot argues across evidence regimes, so it cannot rest on one
    # kind of witness however many of them there are.
    if rows and len(families) < MIN_SOURCE_FAMILIES:
        errors.append(
            f"sources: the pilot needs at least {MIN_SOURCE_FAMILIES} source families, found {len(families)}"
        )

    return ids


def _validate_review(row, label, terms, ranks, errors) -> None:
    """The promotion ladder, shared by every corpus table."""
    state = row["review_state"]
    _check_vocab(state, "review_state", terms, label, "review_state", errors)
    method = row["normalization_method"]
    _check_vocab(method, "normalization_method", terms, label, "normalization_method", errors)
    rank = ranks.get(state)
    if rank is None:
        return

    reviewed = ranks.get("reviewed", 2)
    normalized = ranks.get("normalized", 1)
    if rank >= reviewed:
        if not row["reviewer"]:
            errors.append(f"{label}: {state} requires a named reviewer")
        if not ISO_DATE.match(row["review_date"] or ""):
            errors.append(f"{label}: {state} requires an ISO review_date")
    # Machine normalisation may reach normalized on its own and no further.
    if method == "llm_assisted" and rank > normalized and not row["reviewer"]:
        errors.append(f"{label}: llm_assisted cannot pass normalized without a named reviewer")
    if rank > ranks.get("raw", 0):
        for field, value in row.items():
            if value == PENDING:
                errors.append(f"{label}: {field} is still pending at review_state {state}")


def validate_attestations(terms, ranks, places, source_states, errors: list[str]) -> None:
    """KAN-332/335: claims resolve to authorities, and silences stay silent."""
    rows = _read("attestations", errors)
    _check_unique(rows, "attestation_id", "attestations", errors)
    seen_claims: set[tuple[str, str, str]] = set()
    sources = set(source_states)
    reviewed_rank = ranks.get("reviewed", 2)

    # Raw capture lives in its own table so normalisation can never overwrite
    # what the witness actually carried (KAN-335).
    captures: dict[str, list[dict[str, str]]] = {}
    for row in _read("transcriptions", errors):
        label = f"transcriptions[{row['transcription_id']}]"
        if not row["transcription_id"].startswith("tr-"):
            errors.append(f"{label}: transcription_id must be a tr- slug")
        if not row["verbatim"]:
            errors.append(f"{label}: verbatim is required")
        if not row["capture_source"]:
            errors.append(f"{label}: capture_source is required")
        if not ISO_DATE.match(row["captured_on"] or ""):
            errors.append(f"{label}: captured_on must be an ISO date")
        _check_vocab(row["capture_method"], "capture_method", terms, label, "capture_method", errors)
        captures.setdefault(row["attestation_id"], []).append(row)

    for attestation_id in captures:
        if attestation_id not in {r["attestation_id"] for r in rows}:
            errors.append(f"transcriptions: '{attestation_id}' does not resolve to an attestation")

    for row in rows:
        attestation_id = row["attestation_id"]
        label = f"attestations[{attestation_id}]"
        if not attestation_id.startswith("att-") or not SLUG.match(attestation_id):
            errors.append(f"{label}: attestation_id must be an att- slug")
        if row["place_id"] not in places:
            errors.append(f"{label}: place_id '{row['place_id']}' does not resolve")
        if row["source_id"] not in sources:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")

        klass = row["attestation_class"]
        _check_vocab(klass, "attestation_class", terms, label, "attestation_class", errors)
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        _check_vocab(row["locator_type"], "locator_type", terms, label, "locator_type", errors)
        _validate_review(row, label, terms, ranks, errors)

        state_rank = ranks.get(row["review_state"], 0)
        raw_rank = ranks.get("raw", 0)
        original = row["name_original"]

        if klass in NAMED_CLASSES:
            if not original:
                errors.append(f"{label}: {klass} requires name_original")
            elif original == PENDING and state_rank > raw_rank:
                errors.append(f"{label}: name_original is still pending above raw")
            _check_vocab(row["script"], "script", terms, label, "script", errors)
            _check_vocab(row["language"], "language", terms, label, "language", errors)
            # A transliteration is a reading aid, never a replacement for what
            # the witness actually carries.
            if row["name_transliterated"] and not original:
                errors.append(f"{label}: transliteration cannot stand in for name_original")
        elif klass in SILENT_CLASSES:
            for field in ("name_original", "script", "language", "name_transliterated"):
                if row[field]:
                    errors.append(f"{label}: {klass} records a silence and cannot carry {field}")

        coords = [row["source_lon"], row["source_lat"]]
        if any(coords):
            if not all(coords):
                errors.append(f"{label}: source coordinates must give both longitude and latitude")
            if klass in SILENT_CLASSES:
                errors.append(f"{label}: a silence cannot carry source coordinates")

        if row["name_original"] and not captures.get(attestation_id):
            errors.append(f"{label}: a reading requires a transcription recording how it was captured")

        if state_rank >= reviewed_rank:
            # `whole_work` is the documented maximum precision for an indivisible
            # witness, so it passes only when it says why nothing finer exists.
            if row["locator_type"] == "none" or row["locator"] in {"", PENDING}:
                errors.append(f"{label}: a reviewed attestation requires a real locator")
            elif row["locator_type"] == "whole_work" and len(row["locator"]) < 10:
                errors.append(
                    f"{label}: whole_work must record why the witness has no finer locator"
                )
            # A silence is only meaningful once somebody has read the source's
            # scope, which is what reviewing the source record means.
            if row["attestation_class"] == "source_silent":
                if ranks.get(source_states.get(row["source_id"], "raw"), 0) < reviewed_rank:
                    errors.append(
                        f"{label}: source_silent needs its source's scope reviewed first"
                    )
            if row["name_original"] and not any(
                c["capture_method"] in {"from_witness", "from_edition"}
                for c in captures.get(attestation_id, [])
            ):
                errors.append(
                    f"{label}: a reviewed reading must be captured from the witness or an edition"
                )

        if ranks.get(row["review_state"], 0) >= ranks.get("approved", 3):
            if not ISO_DATE.match(row["last_verified"] or ""):
                errors.append(f"{label}: an approved attestation requires an ISO last_verified")

        claim = (row["place_id"], row["source_id"], row["name_normalized"])
        if claim in seen_claims:
            errors.append(f"{label}: duplicate claim for {claim[0]} in {claim[1]}")
        seen_claims.add(claim)


def _check_period(row, label, precision, errors) -> None:
    """Shared bound rules for a dated span, keyed off its declared precision."""
    lower, upper = row["period_from"], row["period_to"]
    if precision == "undated":
        if lower or upper:
            errors.append(f"{label}: an undated use cannot carry a period")
        return
    if precision == "terminus_post_quem":
        if not lower or upper:
            errors.append(f"{label}: terminus_post_quem needs an open upper bound")
        return
    if precision == "terminus_ante_quem":
        if lower or not upper:
            errors.append(f"{label}: terminus_ante_quem needs an open lower bound")
        return
    if not lower.lstrip("-").isdigit() or not upper.lstrip("-").isdigit():
        errors.append(f"{label}: {precision} requires both period_from and period_to")
        return
    if int(lower) > int(upper):
        errors.append(f"{label}: period_from {lower} is later than period_to {upper}")
    if precision in {"exact_year", "circa"} and lower != upper:
        errors.append(f"{label}: {precision} requires a single year")
    if precision == "year_range" and lower == upper:
        errors.append(f"{label}: year_range requires two distinct years")


def validate_name_uses(terms, ranks, places, sources, attestations, errors: list[str]) -> None:
    """KAN-336: what a name meant, when, and what may be joined to what.

    The point of the extension is that a shared string is not a relationship.
    Referential links are rows in their own table, and the one kind that asserts
    an unbroken line has to produce evidence for it.
    """
    rows = _read("name_uses", errors)
    _check_unique(rows, "name_use_id", "name-uses", errors)
    uses: dict[str, str] = {}

    for row in rows:
        use_id = row["name_use_id"]
        label = f"name-uses[{use_id}]"
        uses[use_id] = row["lexical_form"]
        if not use_id.startswith("nmu-") or not SLUG.match(use_id):
            errors.append(f"{label}: name_use_id must be an nmu- slug")
        if not row["lexical_form"]:
            errors.append(f"{label}: lexical_form is required")
        if not row["referent_label"]:
            errors.append(f"{label}: referent_label is required")
        # A use is attested by a witness or exercised by an institution; with
        # neither, nobody actually used the name.
        if not row["source_id"] and not row["institution"]:
            errors.append(f"{label}: a use needs either a source or an institution")
        if row["source_id"] and row["source_id"] not in sources:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        _check_vocab(row["referent_kind"], "referent_kind", terms, label, "referent_kind", errors)
        _check_vocab(row["fate_class"], "fate_class", terms, label, "fate_class", errors)
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        _check_vocab(row["locator_type"], "locator_type", terms, label, "locator_type", errors)
        _check_vocab(
            row["date_precision"], "date_precision", terms, label, "date_precision", errors
        )
        _check_period(row, label, row["date_precision"], errors)
        _validate_review(row, label, terms, ranks, errors)

        if row["referent_place_id"]:
            if row["referent_place_id"] not in places:
                errors.append(f"{label}: referent_place_id does not resolve")
        elif row["referent_kind"] == "settlement":
            errors.append(f"{label}: a settlement referent must resolve to a place")

    edges = _read("name_use_edges", errors)
    _check_unique(edges, "edge_id", "name-use-edges", errors)
    seen_pairs: set[tuple[str, str]] = set()
    linked: set[str] = set()

    for row in edges:
        label = f"name-use-edges[{row['edge_id']}]"
        source_use, target_use = row["from_name_use"], row["to_name_use"]
        if not row["edge_id"].startswith("nue-") or not SLUG.match(row["edge_id"]):
            errors.append(f"{label}: edge_id must be an nue- slug")
        for field, value in (("from_name_use", source_use), ("to_name_use", target_use)):
            if value not in uses:
                errors.append(f"{label}: {field} '{value}' does not resolve")
        if source_use == target_use:
            errors.append(f"{label}: an edge cannot join a use to itself")
        pair = (source_use, target_use)
        if pair in seen_pairs or pair[::-1] in seen_pairs:
            errors.append(f"{label}: duplicate edge between {source_use} and {target_use}")
        seen_pairs.add(pair)
        linked.update(pair)

        _check_vocab(row["edge_kind"], "edge_kind", terms, label, "edge_kind", errors)
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        _validate_review(row, label, terms, ranks, errors)

        evidence = row["evidence_attestation_id"]
        if evidence and evidence not in attestations:
            errors.append(f"{label}: evidence_attestation_id '{evidence}' does not resolve")
        # The rule the whole extension exists for: an unbroken line has to be
        # evidenced, never inferred from the fact that the string matches.
        if row["edge_kind"] == "continuity" and not evidence:
            errors.append(
                f"{label}: a continuity edge must cite an attestation; "
                "a lexical match alone cannot create one"
            )
        if row["edge_kind"] == "revival" and not row["evidence_note"]:
            errors.append(f"{label}: a revival must name the instrument that reinstated the name")

    # A use that shares its string with another must be adjudicated rather than
    # left floating for a reader to join up by eye.
    by_form: dict[str, list[str]] = {}
    for use_id, form in uses.items():
        by_form.setdefault(form.casefold(), []).append(use_id)
    for form, group in sorted(by_form.items()):
        if len(group) < 2:
            continue
        for use_id in sorted(group):
            if use_id not in linked:
                errors.append(
                    f"name-use-edges: '{use_id}' shares the form '{form}' with another use "
                    "and is joined to none of them"
                )


def validate_pilot(terms, places, sources, errors: list[str]) -> None:
    """KAN-333: the Trench A inventory and the frozen pilot that follows from it."""
    rows = _read("pilot_places", errors)
    _check_unique(rows, "place_id", "pilot-places", errors)
    _check_unique(rows, "pilot_rank", "pilot-places", errors)
    pilot_ids: set[str] = set()
    axes: set[str] = set()

    if len(rows) != PILOT_SIZE:
        errors.append(f"pilot-places: the frozen pilot holds {PILOT_SIZE} places, found {len(rows)}")
    ranks_seen = sorted(int(r["pilot_rank"]) for r in rows if r["pilot_rank"].isdigit())
    if ranks_seen != list(range(1, len(rows) + 1)):
        errors.append("pilot-places: pilot_rank must run from one without gaps")

    # The pilot and the place authority describe the same referents, so they must
    # not drift apart: an edit to one that is not made in the other is a defect.
    authority = {row["place_id"]: row for row in _read("places", errors)}

    for row in rows:
        label = f"pilot-places[{row['place_id']}]"
        pilot_ids.add(row["place_id"])
        if not row["place_id"].startswith("plc-") or not SLUG.match(row["place_id"]):
            errors.append(f"{label}: place_id must be a plc- slug")
        if not row["rationale"]:
            errors.append(f"{label}: rationale is required")
        compiled = authority.get(row["place_id"])
        if compiled is not None:
            for field in ("reference_name", "place_type", "region"):
                if compiled[field] != row[field]:
                    errors.append(
                        f"{label}: {field} '{row[field]}' disagrees with places.csv "
                        f"'{compiled[field]}'"
                    )
        _check_vocab(row["region"], "region", terms, label, "region", errors)
        _check_vocab(row["place_type"], "place_type", terms, label, "place_type", errors)
        for axis in _pipe_set(row["selection_axis"]):
            _check_vocab(axis, "selection_axis", terms, label, "selection_axis", errors)
            axes.add(axis)
        regimes = _pipe_set(row["evidence_regime"])
        if not regimes:
            errors.append(f"{label}: evidence_regime is required")
        for regime in regimes:
            _check_vocab(regime, "evidence_regime", terms, label, "evidence_regime", errors)

    for axis in sorted(REQUIRED_PILOT_AXES - axes):
        errors.append(f"pilot-places: no pilot place covers the required axis '{axis}'")

    inventory = _read("inventory", errors)
    _check_unique(inventory, "datum_id", "trench-a-inventory", errors)
    resolvers = {"data/dacia/places.csv": places, "data/dacia/sources.csv": sources}

    for row in inventory:
        label = f"trench-a-inventory[{row['datum_id']}]"
        disposition = row["disposition"]
        if disposition not in DISPOSITIONS:
            errors.append(f"{label}: disposition '{disposition}' is not recognised")
            continue
        if not row["note"] and disposition in {"retire", "preserve_local"}:
            errors.append(f"{label}: {disposition} requires a recorded reason")
        if row["jira_key"] and not JIRA_KEY.match(row["jira_key"]):
            errors.append(f"{label}: jira_key '{row['jira_key']}' is not a KAN key")
        if row["cell_count"] and not row["cell_count"].isdigit():
            errors.append(f"{label}: cell_count '{row['cell_count']}' is not a number")

        # Migration progress is counted, not asserted: the state has to agree with
        # how many cells actually made it across.
        if row["datum_kind"] == "attestation_set":
            if not row["migrated_cells"].isdigit() or not row["cell_count"].isdigit():
                errors.append(f"{label}: an attestation set needs cell_count and migrated_cells")
            else:
                done, total = int(row["migrated_cells"]), int(row["cell_count"])
                if done > total:
                    errors.append(f"{label}: migrated_cells {done} exceeds cell_count {total}")
                expected = "done" if done == total else "partial" if done else "planned"
                if row["migration_state"] != expected:
                    errors.append(
                        f"{label}: {done} of {total} cells migrated is '{expected}', "
                        f"not '{row['migration_state']}'"
                    )
        elif row["migrated_cells"]:
            errors.append(f"{label}: only an attestation set counts migrated_cells")

        if disposition != "migrate":
            if row["migration_state"]:
                errors.append(f"{label}: only a migrate row carries a migration_state")
            continue

        state = row["migration_state"]
        if state not in MIGRATION_STATES:
            errors.append(f"{label}: migration_state '{state}' is not recognised")
            continue
        target, table = row["target_id"], row["target_table"]
        known = resolvers.get(table)
        if state == "done":
            if not target:
                errors.append(f"{label}: a completed migration must name its target")
            elif known is not None and target not in known:
                errors.append(f"{label}: target '{target}' does not resolve in {table}")
        elif state == "planned" and known is not None and target in known:
            errors.append(f"{label}: target '{target}' already exists; mark the migration done")

        # Every Trench A place cleared for migration has to be in the frozen
        # pilot, or the pilot is not the thing the migration will run against.
        if row["datum_kind"] == "place" and target and target not in pilot_ids:
            errors.append(f"{label}: migrating place '{target}' is absent from the frozen pilot")

    validate_pilot_manifest(rows, errors)


def validate_pilot_manifest(rows, errors: list[str]) -> None:
    """The freeze: a hash nobody can edit past without saying so."""
    path = DATA / PILOT_MANIFEST
    source = DATA / TABLES["pilot_places"]
    if not path.exists():
        errors.append(f"missing pilot manifest: {path.relative_to(REPO)}")
        return
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        errors.append("pilot-manifest: unsupported schemaVersion")
    if not str(manifest.get("pilotVersion", "")).startswith("cnd-pilot-"):
        errors.append("pilot-manifest: pilotVersion must be a cnd-pilot- version")
    if not ISO_DATE.match(str(manifest.get("frozenOn", ""))):
        errors.append("pilot-manifest: frozenOn must be an ISO date")
    if manifest.get("placeCount") != len(rows):
        errors.append(
            f"pilot-manifest: placeCount {manifest.get('placeCount')} != {len(rows)} pilot rows"
        )
    if source.exists():
        actual = hashlib.sha256(source.read_bytes()).hexdigest()
        if manifest.get("sha256") != actual:
            errors.append(
                "pilot-manifest: the pilot has changed since it was frozen; "
                "record a new pilotVersion and hash"
            )


def validate_debt(trenches, errors: list[str]) -> None:
    """KAN-331: unresolved questions live in the register, not in the prose."""
    rows = _read("verification_debt", errors)
    _check_unique(rows, "debt_id", "verification-debt", errors)
    gates = {row["gate_id"] for row in _read("gates", errors)}

    for row in rows:
        label = f"verification-debt[{row['debt_id']}]"
        if row["kind"] not in {"verification", "rights"}:
            errors.append(f"{label}: kind '{row['kind']}' must be verification or rights")
        if not row["statement"]:
            errors.append(f"{label}: statement is required")
        if row["status"] not in {"open", "resolved"}:
            errors.append(f"{label}: status '{row['status']}' must be open or resolved")
        if not row["resolution_path"]:
            errors.append(f"{label}: resolution_path is required")
        _check_path(row["raised_in"], label, "raised_in", errors)
        for blocked in _pipe_set(row["blocks"]):
            trench, _, gate = blocked.partition(":")
            if trench not in trenches or gate not in gates:
                errors.append(f"{label}: blocks '{blocked}' is not a trench:gate pair")


def validate_hiatus_witness_families(errors: list[str]) -> None:
    """KAN-348: freeze candidate families without manufacturing an absence claim."""
    rows = _read("hiatus_witness_families", errors)
    _check_unique(rows, "witness_id", "hiatus-witness-families", errors)
    families: set[str] = set()

    for row in rows:
        witness_id = row["witness_id"]
        label = f"hiatus-witness-families[{witness_id}]"
        families.add(row["witness_family"])
        if not witness_id.startswith("hw-") or not SLUG.match(witness_id):
            errors.append(f"{label}: witness_id must be an hw- slug")
        for field in (
            "witness_family",
            "historical_question",
            "coverage_scope",
            "survival_limitations",
            "candidate_title",
            "repository",
            "citation",
            "notes",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        try:
            start, end = int(row["period_from"]), int(row["period_to"])
            if start > end:
                errors.append(f"{label}: period_from {start} is later than period_to {end}")
        except ValueError:
            errors.append(f"{label}: period_from and period_to must be years")
        _check_https(row["source_url"], label, "source_url", errors)
        if row["rights_status"] not in SOURCE_LEDGER_RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        if row["silence_assessment"] not in HIATUS_SILENCE_ASSESSMENTS:
            errors.append(
                f"{label}: silence_assessment '{row['silence_assessment']}' is not recognised"
            )
        if row["applicability"] not in HIATUS_APPLICABILITY:
            errors.append(f"{label}: applicability '{row['applicability']}' is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["minimum_set"] not in {"yes", "no"}:
            errors.append(f"{label}: minimum_set must be yes or no")

        # Survival, scope, and silence are independent questions. A candidate
        # cannot become silent merely because a catalogue search found nothing.
        if (
            row["silence_assessment"] == "meaningful_silence"
            and row["review_status"] != "reviewed"
        ):
            errors.append(f"{label}: meaningful_silence requires a reviewed witness")
        if (
            row["silence_assessment"] == "not_applicable"
            and row["applicability"] == "applicable"
        ):
            errors.append(f"{label}: not_applicable silence cannot claim general applicability")

    if len(families) != len(rows):
        errors.append("hiatus-witness-families: each frozen row must represent a distinct family")
    if len(rows) < 5:
        errors.append("hiatus-witness-families: the frozen minimum needs at least five families")


def validate_treaty_frontier_sources(errors: list[str]) -> None:
    """KAN-351: legal sources are typed and frozen before geometry is drawn."""
    rows = _read("treaty_frontier_sources", errors)
    _check_unique(rows, "source_id", "treaty-frontier-sources", errors)
    years: list[int] = []
    types: set[str] = set()

    for row in rows:
        source_id = row["source_id"]
        label = f"treaty-frontier-sources[{source_id}]"
        if not source_id.startswith("tf-") or not SLUG.match(source_id):
            errors.append(f"{label}: source_id must be a tf- slug")
        if not row["event_id"].startswith("evt-") or not SLUG.match(row["event_id"]):
            errors.append(f"{label}: event_id must be an evt- slug")
        for field in (
            "title",
            "legal_context",
            "territorial_scope",
            "citation",
            "locator",
            "repository",
            "notes",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["date_precision"] != "exact_day" or not ISO_DATE.match(row["signed_on"]):
            errors.append(f"{label}: the selected instrument needs an exact ISO signed_on date")
        else:
            years.append(int(row["signed_on"][:4]))
        record_type = row["record_type"]
        types.add(record_type)
        if record_type not in TREATY_RECORD_TYPES:
            errors.append(f"{label}: record_type '{record_type}' is not recognised")
        _check_https(row["source_url"], label, "source_url", errors)
        if row["rights_status"] not in SOURCE_LEDGER_RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        interpretation = row["interpretation_status"]
        if interpretation not in TREATY_INTERPRETATION_STATES:
            errors.append(f"{label}: interpretation_status '{interpretation}' is not recognised")
        if interpretation in {"ambiguous", "disputed"} and not row["alternatives"]:
            errors.append(f"{label}: {interpretation} interpretation requires alternatives")
        if interpretation == "uncontested" and row["alternatives"]:
            errors.append(f"{label}: an uncontested interpretation cannot carry alternatives")
        if row["confidence"] not in {"low", "medium", "high"}:
            errors.append(f"{label}: confidence '{row['confidence']}' is not recognised")
        if row["geometry_status"] not in TREATY_GEOMETRY_STATES:
            errors.append(
                f"{label}: geometry_status '{row['geometry_status']}' is not an approved pre-digitisation state"
            )
        if row["minimum_set"] not in {"yes", "no"}:
            errors.append(f"{label}: minimum_set must be yes or no")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

    if years and (min(years) > 1829 or max(years) < 1947):
        errors.append("treaty-frontier-sources: the frozen set must span 1829 through 1947")
    required_types = {"final_instrument", "arbitration_award", "armistice"}
    if missing := required_types - types:
        errors.append(f"treaty-frontier-sources: frozen set is missing record types {sorted(missing)}")


def validate_source_ledger_manifest(errors: list[str]) -> None:
    """A changed minimum set requires an explicit, dated re-freeze."""
    path = DATA / SOURCE_LEDGER_MANIFEST
    if not path.exists():
        errors.append(f"missing source ledger manifest: {path.relative_to(DATA)}")
        return
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        errors.append("source-ledger-manifest: unsupported schemaVersion")
    if not ISO_DATE.match(str(manifest.get("frozenOn", ""))):
        errors.append("source-ledger-manifest: frozenOn must be an ISO date")

    expected = {
        "hiatus_witness_families": ("KAN-348", "hiatus_witness_families", "witness_id"),
        "treaty_frontier_sources": ("KAN-351", "treaty_frontier_sources", "source_id"),
    }
    ledgers = manifest.get("ledgers", {})
    for name, (ticket, table, id_field) in expected.items():
        config = ledgers.get(name)
        label = f"source-ledger-manifest[{name}]"
        if not isinstance(config, dict):
            errors.append(f"{label}: ledger entry is required")
            continue
        if config.get("ticket") != ticket:
            errors.append(f"{label}: ticket must be {ticket}")
        expected_path = TABLES[table]
        if config.get("path") != expected_path:
            errors.append(f"{label}: path must be {expected_path}")
        rows = _read(table, errors)
        if config.get("rowCount") != len(rows):
            errors.append(f"{label}: rowCount {config.get('rowCount')} != {len(rows)} rows")
        minimum = sorted(row[id_field] for row in rows if row["minimum_set"] == "yes")
        recorded = sorted(config.get("minimumIds", []))
        if minimum != recorded:
            errors.append(f"{label}: minimumIds do not match rows marked minimum_set=yes")
        source = DATA / expected_path
        if source.exists():
            actual = hashlib.sha256(source.read_bytes()).hexdigest()
            if config.get("sha256") != actual:
                errors.append(f"{label}: ledger changed since the minimum set was frozen")


def validate_inputs() -> list[str]:
    """Run every check and return the accumulated errors."""
    errors: list[str] = []
    terms, ranks = validate_vocabularies(errors)
    trenches, campaigns_used = validate_programme(terms, errors)
    places = validate_places(terms, ranks, errors)
    sources = validate_sources(terms, ranks, errors)
    validate_attestations(terms, ranks, places, sources, errors)
    attestation_ids = {row["attestation_id"] for row in _read("attestations", errors)}
    validate_name_uses(terms, ranks, places, sources, attestation_ids, errors)
    validate_examples(terms, errors, places, sources)
    validate_gates(trenches, campaigns_used, errors)
    validate_pilot(terms, places, sources, errors)
    validate_debt(trenches, errors)
    validate_hiatus_witness_families(errors)
    validate_treaty_frontier_sources(errors)
    validate_source_ledger_manifest(errors)
    return errors


def readiness_lines() -> list[str]:
    """What the corpus currently holds, so the gate reports progress not just health."""
    errors: list[str] = []
    places = _read("places", errors)
    sources = _read("sources", errors)
    attestations = _read("attestations", errors)
    pilot = _read("pilot_places", errors)
    inventory = _read("inventory", errors)
    debt = _read("verification_debt", errors)
    gates = _read("trench_gates", errors)
    witness_families = _read("hiatus_witness_families", errors)
    treaty_sources = _read("treaty_frontier_sources", errors)

    transcriptions = _read("transcriptions", errors)
    from_witness = sum(
        1 for row in transcriptions if row["capture_method"] in {"from_witness", "from_edition"}
    )
    silences = sum(1 for row in attestations if row["attestation_class"] in SILENT_CLASSES)
    migrated = sum(1 for row in inventory if row["migration_state"] == "done")
    outstanding = sum(1 for row in inventory if row["migration_state"] in {"planned", "partial"})
    open_debt = sum(1 for row in debt if row["status"] == "open")
    passed = sum(1 for row in gates if row["status"] == "passed")
    uses = _read("name_uses", errors)
    edges = _read("name_use_edges", errors)
    denied = sum(1 for row in edges if row["edge_kind"] == "homonym_only")

    return [
        f"  corpus: {len(places)} places, {len(sources)} sources, "
        f"{len(attestations)} attestations ({silences} recorded silences)",
        f"  capture: {len(transcriptions)} transcriptions, {from_witness} from a witness or edition",
        f"  names: {len(uses)} name uses across {len({r['lexical_form'] for r in uses})} forms; "
        f"{len(edges)} edges, {denied} of them explicit non-relationships",
        f"  pilot: {len(pilot)} places frozen; {migrated} Trench A data migrated, "
        f"{outstanding} outstanding",
        f"  gates: {passed} of {len(gates)} passed; {open_debt} open verification debts",
        f"  source ledgers: {len(witness_families)} hiatus witness families and "
        f"{len(treaty_sources)} treaty/frontier instruments frozen for review",
    ]


def main() -> int:
    errors = validate_inputs()
    if errors:
        print(f"Dacia QA failed ({len(errors)}):")
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Dacia QA: programme IDs, vocabularies, gates, corpus and pilot are valid.")
    for line in readiness_lines():
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
