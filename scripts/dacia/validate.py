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
    "places": "places.csv",
    "sources": "sources.csv",
    "attestations": "attestations.csv",
    "inventory": f"{PILOT}/trench-a-inventory.csv",
    "pilot_places": f"{PILOT}/pilot-places.csv",
}
PILOT_MANIFEST = f"{PILOT}/pilot-manifest.json"


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
            row["ref_geometry_provenance"],
            "geometry_provenance",
            terms,
            label,
            "ref_geometry_provenance",
            errors,
        )
        _validate_review(row, label, terms, ranks, errors)

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


def validate_sources(terms, ranks, errors: list[str]) -> set[str]:
    """KAN-332: source authority, including the scope that makes silence readable."""
    rows = _read("sources", errors)
    _check_unique(rows, "source_id", "sources", errors)
    ids: set[str] = set()

    for row in rows:
        source_id = row["source_id"]
        label = f"sources[{source_id}]"
        ids.add(source_id)
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
        _validate_review(row, label, terms, ranks, errors)

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


def validate_attestations(terms, ranks, places, sources, errors: list[str]) -> None:
    """KAN-332: claims resolve to authorities, and silences stay silent."""
    rows = _read("attestations", errors)
    _check_unique(rows, "attestation_id", "attestations", errors)
    seen_claims: set[tuple[str, str, str]] = set()

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

        if state_rank >= ranks.get("reviewed", 2):
            if row["locator_type"] == "none" or row["locator"] in {"", PENDING}:
                errors.append(f"{label}: a reviewed attestation requires a real locator")

        claim = (row["place_id"], row["source_id"], row["name_normalized"])
        if claim in seen_claims:
            errors.append(f"{label}: duplicate claim for {claim[0]} in {claim[1]}")
        seen_claims.add(claim)


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

    for row in rows:
        label = f"pilot-places[{row['place_id']}]"
        pilot_ids.add(row["place_id"])
        if not row["place_id"].startswith("plc-") or not SLUG.match(row["place_id"]):
            errors.append(f"{label}: place_id must be a plc- slug")
        if not row["rationale"]:
            errors.append(f"{label}: rationale is required")
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


def validate_inputs() -> list[str]:
    """Run every check and return the accumulated errors."""
    errors: list[str] = []
    terms, ranks = validate_vocabularies(errors)
    trenches, campaigns_used = validate_programme(terms, errors)
    places = validate_places(terms, ranks, errors)
    sources = validate_sources(terms, ranks, errors)
    validate_attestations(terms, ranks, places, sources, errors)
    validate_examples(terms, errors, places, sources)
    validate_gates(trenches, campaigns_used, errors)
    validate_pilot(terms, places, sources, errors)
    validate_debt(trenches, errors)
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

    silences = sum(1 for row in attestations if row["attestation_class"] in SILENT_CLASSES)
    migrated = sum(1 for row in inventory if row["migration_state"] == "done")
    outstanding = sum(1 for row in inventory if row["migration_state"] in {"planned", "partial"})
    open_debt = sum(1 for row in debt if row["status"] == "open")
    passed = sum(1 for row in gates if row["status"] == "passed")

    return [
        f"  corpus: {len(places)} places, {len(sources)} sources, "
        f"{len(attestations)} attestations ({silences} recorded silences)",
        f"  pilot: {len(pilot)} places frozen; {migrated} Trench A data migrated, "
        f"{outstanding} outstanding",
        f"  gates: {passed} of {len(gates)} passed; {open_debt} open verification debts",
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
