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
# The states that mean a person has cleared the row, for reporting.
REVIEWED_OR_ABOVE = {"reviewed", "approved", "published"}
TABLE_STATES = {"live", "planned", "reserved"}
# The seven rooms of the cosmography, mirrored from src/data/rooms.ts.
PROGRAMME_ROOMS = {"earth", "map", "city", "border", "road", "archive", "theatre"}
SOURCE_LEDGER_REVIEW_STATES = {"candidate", "source_checked", "reviewed"}
HIATUS_ABSENCE_CLASSES = {
    "not_surveyed",
    "not_asked",
    "not_named",
    "named_elsewhere",
    "extra_muros",
    "survival_unknown",
}
RESEARCH_SOURCE_TYPES = {"map_witness", "statistical_table", "diplomatic_context"}
RESEARCH_RESOLUTION_STATES = {"sufficient", "catalogue_preview_only", "unverified"}
RESEARCH_PRODUCTION_ROLES = {
    "production_primary",
    "production_fallback",
    "research_only",
}
OPEN_PRODUCTION_RIGHTS = {"no_known_restrictions", "cc_by_sa_4_0", "odbl_1_0"}
BORROCZYN_SOURCE_TYPES = {
    "borroczyn_witness",
    "later_reference",
    "modern_reference",
    "context",
}
BORROCZYN_LAYER_ROLES = {
    "historical_source",
    "georeferenced_derived",
    "modern_reference",
}
BORROCZYN_RELEASE_STATES = {
    "blocked_pending_witness",
    "research",
    "reviewed",
    "released",
}
URBAN_FEATURE_TYPES = {"parcel", "street", "building"}
IN_MANIBUS_INSPECTION_STATES = {"not_inspected", "physically_inspected", "reviewed"}
OBJECT_EVIDENCE_KINDS = {
    "physical_observation",
    "bibliographic_identification",
    "inference",
    "cnd_attestation",
}
OBJECT_EVIDENCE_BASES = {"direct_physical", "object_record", "external_reference"}
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
RESEARCH_RIGHTS = SOURCE_LEDGER_RIGHTS | {
    "cc_by_sa_4_0",
    "no_copyright_us",
    "odbl_1_0",
    "teaching_use_only",
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
# KAN-352: a proposal, the line an instrument actually fixed, and a later
# reconstruction are three different kinds of claim and are never one column.
# KAN-363: acquisition is a separate axis from scholarly validity and from
# rights. A map does not become better evidence because it was bought, or worse
# because it was declined, so the three never collapse into one column.
# KAN-367. The classes are the argument: what a map is evidence *of* depends on
# which of these it belongs to, and reception is never evidence about antiquity.
RECEPTION_CLASSES = {
    "ancient_evidence",
    "scholarly_reconstruction",
    "historical_reception",
    "contemporary_derivative",
}
RECEPTION_ROLES = {"authoritative_evidence", "contextual_evidence", "reference_artefact"}
# Reception and derivative material documents its own moment. It may be shown,
# discussed and taken seriously - and it may never be cited as testimony about
# the antiquity it depicts.
RECEPTION_NEVER_AUTHORITATIVE = {"historical_reception", "contemporary_derivative"}
RECEPTION_SELECTION = {"selected", "class_only", "rejected"}
# KAN-368. `resembles` is the visual counterpart of Nomen Errans' homonym_only:
# it asserts that two things look alike and that nothing follows from it.
RECEPTION_RELATIONSHIPS = {"derives_from", "resembles", "responds_to", "no_relationship"}
RECEPTION_CLAIM_KINDS = {"continuity", "origin", "extent", "descent"}
REQUIRED_RUBRIC_RULES = {"rr-1", "rr-2", "rr-3", "rr-4", "rr-5"}
ACQUISITION_STATES = {"not_sought", "watching", "recommended", "acquired", "declined"}
VERIFICATION_STATES = {"unverified", "partially_verified", "verified"}
SCHOLARLY_VALIDITY = {"established", "contested", "unassessed"}
REQUIRED_ACQUISITION_FAMILIES = {
    "ptolemaic",
    "mercator_hondius",
    "sanson",
    "zatta",
    "homann",
    "schwantz_oltenia",
}
# The identifying fields a recommendation rests on. A dossier that still says
# `pending` in any of them has not identified the thing it recommends buying.
ACQUISITION_IDENTITY = ("plate_number", "edition_state", "publisher", "comparable_records")
FRONTIER_LINE_TYPES = {"proposal", "treaty_line", "reconstruction"}
FRONTIER_LEDGERS = {"treaty_frontier_sources", "carta_rubra_sources"}
FRONTIER_FROM = 1829
NOMEN_ERRANS_WITNESS_TYPES = {"map_witness", "object_witness", "text_witness"}
ROMAN_FEATURE_TYPES = {"site", "road", "limes"}
PRINCIPALITY_SOVEREIGNTY = {
    "autonomous_tributary",
    "habsburg_administration",
    "habsburg_province",
    "russian_province",
    "contested",
}
# Nothing in the shared GIS family is digitised from a source sheet yet. Saying
# so as a rule rather than a note means the first layer that *is* digitised has
# to come with the change that permits it (KAN-341/342/343).
GIS_UNAVAILABLE_PROVENANCE = {"source_geometry", "georeferenced_source"}
PRINCIPALITY_FROM = 1526
PRINCIPALITY_TO = 1859
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
GIS = "gis"

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
    "hiatus_absence_classes": f"{REFERENCE}/hiatus-absence-classes.csv",
    "hiatus_timeline": f"{REFERENCE}/hiatus-timeline.csv",
    "treaty_frontier_sources": f"{REFERENCE}/treaty-frontier-sources.csv",
    "carta_rubra_sources": f"{REFERENCE}/carta-rubra-sources.csv",
    "carta_rubra_claims": f"{REFERENCE}/carta-rubra-claims.csv",
    "nomen_errans_witnesses": f"{REFERENCE}/nomen-errans-witnesses.csv",
    "acquisition_dossiers": f"{REFERENCE}/acquisition-dossiers.csv",
    "reception_corpus": f"{REFERENCE}/reception-corpus.csv",
    "reception_rubric": f"{REFERENCE}/reception-review-rubric.csv",
    "reception_claims": f"{REFERENCE}/reception-claims.csv",
    "borroczyn_seam_sources": f"{REFERENCE}/borroczyn-seam-sources.csv",
    "in_manibus_inspections": f"{REFERENCE}/in-manibus-inspections.csv",
    "urban_features": "urban-features.csv",
    "objects": "objects.csv",
    "object_evidence": "object-evidence.csv",
    "places": "places.csv",
    "sources": "sources.csv",
    "attestations": "attestations.csv",
    "transcriptions": "transcriptions.csv",
    "name_uses": "name-uses.csv",
    "name_use_edges": "name-use-edges.csv",
    "inventory": f"{PILOT}/trench-a-inventory.csv",
    "pilot_places": f"{PILOT}/pilot-places.csv",
    "roman_dacia": f"{GIS}/roman-dacia.csv",
    "principalities": f"{GIS}/principalities.csv",
    "josephinian_sheets": f"{GIS}/josephinian-sheets.csv",
    "treaty_frontier": f"{GIS}/treaty-frontier.csv",
}
PILOT_MANIFEST = f"{PILOT}/pilot-manifest.json"
SOURCE_LEDGER_MANIFEST = f"{REFERENCE}/source-ledger-manifest.json"
RESEARCH_PACKAGE_MANIFEST = f"{REFERENCE}/research-package-manifest.json"
BORROCZYN_GEOREFERENCING = f"{REFERENCE}/borroczyn-georeferencing.json"


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
        # KAN-370: the programme index shows each entry's primary room, so every
        # entry has to have one. An essay slug is optional - most trenches have
        # not been written yet - but a live trench that claims one must resolve.
        if row["room"] not in PROGRAMME_ROOMS:
            errors.append(f"{label}: room '{row['room']}' is not one of the seven")
        if row["essay_slug"] and not SLUG.match(row["essay_slug"]):
            errors.append(f"{label}: essay_slug '{row['essay_slug']}' is not a slug")
        if row["essay_slug"] and not (REPO / "src" / "content" / "essays" /
                                      f"{row['essay_slug']}.mdx").exists():
            errors.append(f"{label}: essay_slug '{row['essay_slug']}' has no essay")
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
                # KAN-338: a cell that is rhetorical rather than evidential never
                # migrates, and a set is finished once every cell is either across
                # or declared local. Counting those cells as outstanding would
                # leave the set permanently partial and hide the real remainder.
                local = int(row["local_cells"]) if row["local_cells"].isdigit() else 0
                if row["local_cells"] and not row["local_cells"].isdigit():
                    errors.append(f"{label}: local_cells '{row['local_cells']}' is not a number")
                if local and not row["note"]:
                    errors.append(f"{label}: cells kept local require a recorded reason")
                if done + local > total:
                    errors.append(
                        f"{label}: {done} migrated and {local} local exceed cell_count {total}"
                    )
                expected = "done" if done + local == total else "partial" if done else "planned"
                if row["migration_state"] != expected:
                    errors.append(
                        f"{label}: {done} of {total} cells migrated ({local} local) is "
                        f"'{expected}', not '{row['migration_state']}'"
                    )
        elif row["migrated_cells"] or row["local_cells"]:
            errors.append(f"{label}: only an attestation set counts cells")

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
            # An attestation set migrates as counted rows in a named table rather
            # than as one record, so its completion is the cell count above and
            # the table it landed in; demanding a single target_id would mean
            # picking one of its places arbitrarily (KAN-338).
            if row["datum_kind"] == "attestation_set":
                if not table:
                    errors.append(f"{label}: a completed migration must name its target table")
                # The set's target is the places its cells attest, named as a
                # pipe list so the Trench A -> CND bridge is a row rather than
                # something a consumer infers from capture strings (KAN-339).
                if not target:
                    errors.append(f"{label}: a completed set must name the places it attests")
                for place_id in _pipe_set(target):
                    if place_id not in places:
                        errors.append(f"{label}: place '{place_id}' does not resolve")
                    elif place_id not in pilot_ids:
                        errors.append(f"{label}: place '{place_id}' is absent from the frozen pilot")
            elif not target:
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


RELEASE_MANIFEST = DATA_RELATIVE_MANIFEST = "release/cnd-0.1/manifest.json"
PUBLIC_STATES = {"approved", "published"}


def validate_release(ranks, errors: list[str]) -> None:
    """KAN-337: the compiled release must match the tables it claims to compile.

    Recording the hash of every input is what lets a bare python3 detect a table
    edit that was never rebuilt, without re-reading the Parquet or the GeoJSON.
    """
    path = DATA / RELEASE_MANIFEST
    if not path.exists():
        errors.append(f"missing release manifest: {path.relative_to(REPO)}; run make dacia")
        return
    manifest = json.loads(path.read_text(encoding="utf-8"))

    if manifest.get("schemaVersion") != 1:
        errors.append("release: unsupported schemaVersion")
    if manifest.get("kind") != "pilot_research_release":
        errors.append("release: CND 0.1 must be versioned as a pilot/research release")
    if not manifest.get("licence"):
        errors.append("release: the manifest must summarise the licence")

    for name, recorded in sorted(manifest.get("inputs", {}).items()):
        source = REPO / name
        if not source.exists():
            errors.append(f"release: manifest records a missing input {name}")
        elif hashlib.sha256(source.read_bytes()).hexdigest() != recorded:
            errors.append(f"release: {name} changed since the last build; run make dacia")

    for name, entry in sorted(manifest.get("outputs", {}).items()):
        output = REPO / name
        if not output.exists():
            errors.append(f"release: manifest records a missing output {name}")
            continue
        payload = output.read_bytes()
        if hashlib.sha256(payload).hexdigest() != entry.get("sha256"):
            errors.append(f"release: {name} does not match its manifest hash; run make dacia")
        if len(payload) != entry.get("bytes"):
            errors.append(f"release: {name} does not match its manifest byte length")

    # The public tier is a claim about review, so it is checked against the
    # tables rather than trusted from the manifest.
    attestations = _read("attestations", errors)
    public = sum(1 for row in attestations if row["review_state"] in PUBLIC_STATES)
    if manifest.get("publicRecords") != public:
        errors.append(
            f"release: manifest claims {manifest.get('publicRecords')} public records, "
            f"the tables hold {public}"
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


def validate_reception_claims(terms, errors: list[str]) -> None:
    """KAN-368: how a claim is made, and what it may not inherit by looking alike.

    The corpus classifies items; this records what each one asserts and how it
    stands to the material it invokes. The rule the table exists for is that a
    contemporary derivative cannot acquire authority from resembling a scholarly
    map - the visual counterpart of the homonym_only edge in Nomen Errans.
    """
    items = {row["item_id"]: row for row in _read("reception_corpus", errors)}
    rows = _read("reception_claims", errors)
    _check_unique(rows, "claim_id", "reception-claims", errors)
    claimed: set[str] = set()

    for row in rows:
        claim_id = row["claim_id"]
        label = f"reception-claims[{claim_id}]"
        if not claim_id.startswith("rcl-") or not SLUG.match(claim_id):
            errors.append(f"{label}: claim_id must be an rcl- slug")
        item = items.get(row["item_id"])
        if item is None:
            errors.append(f"{label}: item_id '{row['item_id']}' does not resolve")
        else:
            claimed.add(row["item_id"])
        target = items.get(row["relates_to"])
        if row["relates_to"] and target is None:
            errors.append(f"{label}: relates_to '{row['relates_to']}' does not resolve")
        if row["relates_to"] == row["item_id"]:
            errors.append(f"{label}: a claim cannot relate an item to itself")

        for field in ("claim", "asserted_about", "evidence_note", "uncertainty", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["claim_kind"] not in RECEPTION_CLAIM_KINDS:
            errors.append(f"{label}: claim_kind '{row['claim_kind']}' is not recognised")
        kind = row["relationship_kind"]
        if kind not in RECEPTION_RELATIONSHIPS:
            errors.append(f"{label}: relationship_kind '{kind}' is not recognised")
        if row["interpretation_status"] not in TREATY_INTERPRETATION_STATES:
            errors.append(f"{label}: interpretation_status is not recognised")
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

        if item is None:
            continue

        # The rule this table is for. A derivative may look exactly like a
        # scholarly map and inherit nothing from it, so the only relationships
        # it may assert are ones that claim no descent.
        if item["source_class"] == "contemporary_derivative" and kind == "derives_from":
            errors.append(
                f"{label}: a contemporary derivative cannot claim descent from a historical "
                "source on the strength of resembling one; use resembles or responds_to"
            )
        # A derivation is a claim about transmission and needs its evidence, in
        # the same way a continuity edge in Nomen Errans does.
        if kind == "derives_from":
            if target is not None and target["selection_state"] == "class_only":
                errors.append(
                    f"{label}: nothing has been selected from '{row['relates_to']}', so no "
                    "derivation from it can be evidenced"
                )
            if item["selection_state"] == "class_only":
                errors.append(
                    f"{label}: a class from which nothing is selected cannot be said to derive "
                    "from anything in particular"
                )
        # Uncertainty travels as text, so a reader who cannot use colour still
        # gets the contested reading rather than a hue.
        if row["interpretation_status"] == "disputed" and len(row["uncertainty"]) < 40:
            errors.append(
                f"{label}: a disputed claim must state its uncertainty in words, not leave it "
                "to a colour"
            )

    for item_id, item in sorted(items.items()):
        # An item with no claim recorded is decoration: the essay would show it
        # without being able to say what it asserts.
        if item_id not in claimed:
            errors.append(f"reception-claims: '{item_id}' is in the corpus with no claim recorded")


def validate_reception_corpus(terms, sources, errors: list[str]) -> None:
    """KAN-367: the reception corpus, and the rubric that keeps it from arguing.

    Dacia Rediviva is about how antiquity has been used, which means its corpus
    is full of material that is compelling and is not evidence. The rules that
    keep those apart are data here rather than editorial intention, so they
    cannot be forgotten in a later interaction.
    """
    rubric = _read("reception_rubric", errors)
    _check_unique(rubric, "rule_id", "reception-review-rubric", errors)
    for row in rubric:
        label = f"reception-review-rubric[{row['rule_id']}]"
        for field in ("rule", "rationale"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["enforced_by"] not in {"validator", "editorial"}:
            errors.append(f"{label}: enforced_by must be validator or editorial")
        if row["binding"] != "yes":
            errors.append(f"{label}: a rubric rule that does not bind is not a rule")
    if missing := REQUIRED_RUBRIC_RULES - {row["rule_id"] for row in rubric}:
        errors.append(f"reception-review-rubric: missing required rules {sorted(missing)}")

    rows = _read("reception_corpus", errors)
    _check_unique(rows, "item_id", "reception-corpus", errors)
    classes: set[str] = set()

    for row in rows:
        item_id = row["item_id"]
        label = f"reception-corpus[{item_id}]"
        if not item_id.startswith("rec-") or not SLUG.match(item_id):
            errors.append(f"{label}: item_id must be a rec- slug")
        source_class = row["source_class"]
        classes.add(source_class)
        if source_class not in RECEPTION_CLASSES:
            errors.append(f"{label}: source_class '{source_class}' is not recognised")
        role = row["evidence_role"]
        if role not in RECEPTION_ROLES:
            errors.append(f"{label}: evidence_role '{role}' is not recognised")
        for field in ("title", "historical_context", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_vocab(
            row["date_precision"], "date_precision", terms, label, "date_precision", errors
        )
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        _check_https(row["source_url"], label, "source_url", errors)
        _check_https(row["rights_basis_url"], label, "rights_basis_url", errors)
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["selection_state"] not in RECEPTION_SELECTION:
            errors.append(f"{label}: selection_state is not recognised")
        if not row["issued_year"].lstrip("-").isdigit():
            errors.append(f"{label}: issued_year must be a year")
        if row["corpus_source_id"] and row["corpus_source_id"] not in sources:
            errors.append(f"{label}: corpus_source_id does not resolve in sources.csv")

        # rr-2: reception documents its own moment, and never antiquity.
        if source_class in RECEPTION_NEVER_AUTHORITATIVE and role == "authoritative_evidence":
            errors.append(
                f"{label}: {source_class} is evidence about its own moment, not about the "
                "antiquity it depicts, so it cannot be authoritative_evidence (rubric rr-2)"
            )
        # rr-3: apparent detail is not provenance.
        unidentified = row["creator"] in {"", PENDING} or row["provenance"] in {"", PENDING}
        if unidentified and role != "reference_artefact":
            errors.append(
                f"{label}: an item with no identified creator or provenance may only be a "
                "reference_artefact (rubric rr-3)"
            )
        # rr-5: a class is a finding; an unselected item is not a source.
        if row["selection_state"] == "class_only" and role != "reference_artefact":
            errors.append(
                f"{label}: nothing has been selected from this class, so it cannot carry "
                f"the role '{role}' (rubric rr-5)"
            )
        if row["selection_state"] == "selected" and row["citation"] in {"", PENDING}:
            errors.append(f"{label}: a selected item must carry its citation")

    # The essay argues across all four registers; dropping one would turn the
    # comparison into a claim about whichever remained.
    for missing in sorted(RECEPTION_CLASSES - classes):
        errors.append(f"reception-corpus: no item represents the '{missing}' class")


def validate_acquisition_dossiers(terms, errors: list[str]) -> None:
    """KAN-363: research dossiers that cannot recommend what they have not identified."""
    rows = _read("acquisition_dossiers", errors)
    _check_unique(rows, "dossier_id", "acquisition-dossiers", errors)
    families: set[str] = set()

    for row in rows:
        dossier_id = row["dossier_id"]
        label = f"acquisition-dossiers[{dossier_id}]"
        if not dossier_id.startswith("acq-") or not SLUG.match(dossier_id):
            errors.append(f"{label}: dossier_id must be an acq- slug")
        families.add(row["family"])
        for field in ("family", "title", "creator", "atlas_context", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_vocab(
            row["date_precision"], "date_precision", terms, label, "date_precision", errors
        )
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["verification_state"] not in VERIFICATION_STATES:
            errors.append(f"{label}: verification_state is not recognised")
        if row["acquisition_status"] not in ACQUISITION_STATES:
            errors.append(f"{label}: acquisition_status is not recognised")
        # Validity is assessed on the map, never inferred from whether it was
        # bought: it is required on every row whatever the acquisition state.
        if row["scholarly_validity"] not in SCHOLARLY_VALIDITY:
            errors.append(f"{label}: scholarly_validity is not recognised")
        if not row["issued_year"].lstrip("-").isdigit():
            errors.append(f"{label}: issued_year must be a year")

        unidentified = [f for f in ACQUISITION_IDENTITY if row[f] in {"", PENDING}]
        if row["acquisition_status"] == "recommended":
            if unidentified:
                errors.append(
                    f"{label}: a recommendation must identify what it recommends; "
                    f"still pending: {', '.join(unidentified)}"
                )
            if row["verification_state"] != "verified":
                errors.append(f"{label}: a recommendation requires a verified dossier")
        # An unverified dossier that has nonetheless filled everything in is the
        # dangerous case: it looks identified and nobody has checked it.
        if row["verification_state"] == "verified" and unidentified:
            errors.append(
                f"{label}: a verified dossier cannot leave {', '.join(unidentified)} pending"
            )

        # The Ptolemaic rule, which is the reason this table has a family column:
        # Tabula Europae numbering is not stable across editions, so a plate
        # number without the edition it belongs to is not a citation.
        if row["family"] == "ptolemaic" and row["plate_number"] not in {"", PENDING}:
            if row["edition_state"] in {"", PENDING}:
                errors.append(
                    f"{label}: a Tabula Europae number means nothing without the edition it "
                    "is numbered in; name the edition or leave the plate pending"
                )

    for missing in sorted(REQUIRED_ACQUISITION_FAMILIES - families):
        errors.append(
            f"acquisition-dossiers: the programme's priority families require a "
            f"'{missing}' dossier, purchasable or not"
        )


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


def validate_hiatus_timeline(errors: list[str]) -> None:
    """KAN-349: machine-readable absence states stay below unearned review."""
    classes = _read("hiatus_absence_classes", errors)
    _check_unique(classes, "absence_class", "hiatus-absence-classes", errors)
    class_names = {row["absence_class"] for row in classes}
    if missing := HIATUS_ABSENCE_CLASSES - class_names:
        errors.append(f"hiatus-absence-classes: missing required classes {sorted(missing)}")

    for row in classes:
        label = f"hiatus-absence-classes[{row['absence_class']}]"
        if row["absence_class"] not in HIATUS_ABSENCE_CLASSES:
            errors.append(f"{label}: absence_class is not recognised")
        if row["evidential_weight"] not in {"none", "conditional", "contextual"}:
            errors.append(f"{label}: evidential_weight is not recognised")
        for field in ("requires_scope_review", "allowed_before_review"):
            if row[field] not in {"yes", "no"}:
                errors.append(f"{label}: {field} must be yes or no")
        for field in ("definition", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")

    witnesses = {
        row["witness_id"]: row for row in _read("hiatus_witness_families", errors)
    }
    rows = _read("hiatus_timeline", errors)
    _check_unique(rows, "state_id", "hiatus-timeline", errors)
    for row in rows:
        state_id = row["state_id"]
        label = f"hiatus-timeline[{state_id}]"
        if not state_id.startswith("hs-") or not SLUG.match(state_id):
            errors.append(f"{label}: state_id must be an hs- slug")
        witness = witnesses.get(row["witness_id"])
        if witness is None:
            errors.append(f"{label}: witness_id '{row['witness_id']}' does not resolve")
        elif row["source_family"] != witness["witness_family"]:
            errors.append(f"{label}: source_family does not match the witness ledger")
        if row["date_precision"] not in {"exact_year", "year_range"}:
            errors.append(f"{label}: date_precision must be exact_year or year_range")
        else:
            _check_period(row, label, row["date_precision"], errors)
        if not row["locator"]:
            errors.append(f"{label}: locator is required")
        absence_class = row["absence_class"]
        if absence_class == "source_silent":
            errors.append(f"{label}: source_silent is not a Hiatus timeline class")
        elif absence_class not in class_names:
            errors.append(f"{label}: absence_class '{absence_class}' is not recognised")
        if row["scope_reviewed"] not in {"yes", "no"}:
            errors.append(f"{label}: scope_reviewed must be yes or no")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["confidence"] not in {"low", "medium", "high"}:
            errors.append(f"{label}: confidence '{row['confidence']}' is not recognised")
        if not row["notes"]:
            errors.append(f"{label}: notes are required")

        # A textual omission only becomes evidence after both scope and state
        # have been reviewed. Other classes may record workflow blockers.
        if absence_class in {"not_named", "named_elsewhere", "extra_muros"} and (
            row["scope_reviewed"] != "yes" or row["review_status"] != "reviewed"
        ):
            errors.append(f"{label}: {absence_class} requires reviewed source scope")


def validate_carta_rubra_package(errors: list[str]) -> None:
    """KAN-354: separate witnesses, statistics, legal context, and claims."""
    rows = _read("carta_rubra_sources", errors)
    _check_unique(rows, "source_id", "carta-rubra-sources", errors)
    by_id = {row["source_id"]: row for row in rows}
    types: set[str] = set()
    production_map_roles: set[str] = set()

    for row in rows:
        source_id = row["source_id"]
        label = f"carta-rubra-sources[{source_id}]"
        if not source_id.startswith("cr-") or not SLUG.match(source_id):
            errors.append(f"{label}: source_id must be a cr- slug")
        source_type = row["source_type"]
        types.add(source_type)
        if source_type not in RESEARCH_SOURCE_TYPES:
            errors.append(f"{label}: source_type '{source_type}' is not recognised")
        for field in (
            "title",
            "edition_state",
            "creator",
            "scale",
            "repository",
            "repository_object_id",
            "citation",
            "locator",
            "rights_basis_url",
            "notes",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if not row["issued_year"].isdigit() or not 1900 <= int(row["issued_year"] or 0) <= 1920:
            errors.append(f"{label}: issued_year must be between 1900 and 1920")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_https(row["rights_basis_url"], label, "rights_basis_url", errors)
        if row["rights_status"] not in RESEARCH_RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        if row["resolution_status"] not in RESEARCH_RESOLUTION_STATES:
            errors.append(f"{label}: resolution_status is not recognised")
        role = row["production_role"]
        if role not in RESEARCH_PRODUCTION_ROLES:
            errors.append(f"{label}: production_role '{role}' is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if role in {"production_primary", "production_fallback"}:
            if source_type != "map_witness":
                errors.append(f"{label}: a production map role requires source_type map_witness")
            if row["rights_status"] not in OPEN_PRODUCTION_RIGHTS:
                errors.append(f"{label}: production role requires production-wide reuse rights")
            if row["resolution_status"] != "sufficient":
                errors.append(f"{label}: production role requires sufficient resolution")
            production_map_roles.add(role)

    for row in rows:
        if not row["derived_from"]:
            continue
        label = f"carta-rubra-sources[{row['source_id']}]"
        parent = by_id.get(row["derived_from"])
        if parent is None:
            errors.append(f"{label}: derived_from '{row['derived_from']}' does not resolve")
        elif parent["source_type"] != "statistical_table":
            errors.append(f"{label}: derived_from must resolve to a statistical_table")

    if missing := RESEARCH_SOURCE_TYPES - types:
        errors.append(f"carta-rubra-sources: package is missing source types {sorted(missing)}")
    required_roles = {"production_primary", "production_fallback"}
    if missing := required_roles - production_map_roles:
        errors.append(f"carta-rubra-sources: production map set is missing roles {sorted(missing)}")

    claims = _read("carta_rubra_claims", errors)
    _check_unique(claims, "claim_id", "carta-rubra-claims", errors)
    for row in claims:
        claim_id = row["claim_id"]
        label = f"carta-rubra-claims[{claim_id}]"
        if not claim_id.startswith("cc-") or not SLUG.match(claim_id):
            errors.append(f"{label}: claim_id must be a cc- slug")
        if row["source_id"] not in by_id:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        for field in (
            "actor",
            "institution",
            "claim",
            "intended_territorial_argument",
            "locator",
            "notes",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["importance"] not in {"high", "medium", "low"}:
            errors.append(f"{label}: importance is not recognised")
        if row["argument_support"] not in {"supported", "not_established", "not_applicable"}:
            errors.append(f"{label}: argument_support is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["importance"] == "high" and (
            not row["locator"] or not row["review_status"]
        ):
            errors.append(f"{label}: high-importance claims require a locator and review status")


def validate_borroczyn_package(errors: list[str]) -> None:
    """KAN-357: a bounded seam and typed sources, without city-wide claims."""
    rows = _read("borroczyn_seam_sources", errors)
    _check_unique(rows, "source_id", "borroczyn-seam-sources", errors)
    by_id = {row["source_id"]: row for row in rows}
    types: set[str] = set()
    for row in rows:
        source_id = row["source_id"]
        label = f"borroczyn-seam-sources[{source_id}]"
        if not source_id.startswith("br-") or not SLUG.match(source_id):
            errors.append(f"{label}: source_id must be a br- slug")
        source_type = row["source_type"]
        types.add(source_type)
        if source_type not in BORROCZYN_SOURCE_TYPES:
            errors.append(f"{label}: source_type '{source_type}' is not recognised")
        for field in (
            "title",
            "edition_state",
            "creator",
            "scale",
            "repository",
            "repository_object_id",
            "rights_basis_url",
            "notes",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if not row["issued_year"].isdigit():
            errors.append(f"{label}: issued_year must be a year")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_https(row["rights_basis_url"], label, "rights_basis_url", errors)
        if row["rights_status"] not in RESEARCH_RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        if row["resolution_status"] not in RESEARCH_RESOLUTION_STATES:
            errors.append(f"{label}: resolution_status is not recognised")
        role = row["production_role"]
        if role not in RESEARCH_PRODUCTION_ROLES:
            errors.append(f"{label}: production_role '{role}' is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if role in {"production_primary", "production_fallback"}:
            if row["rights_status"] not in OPEN_PRODUCTION_RIGHTS:
                errors.append(f"{label}: production role requires production-wide reuse rights")
            if row["resolution_status"] != "sufficient":
                errors.append(f"{label}: production role requires sufficient resolution")

    required_types = {"borroczyn_witness", "later_reference", "modern_reference"}
    if missing := required_types - types:
        errors.append(f"borroczyn-seam-sources: package is missing source types {sorted(missing)}")
    if not any(
        row["source_type"] == "borroczyn_witness" and row["resolution_status"] == "sufficient"
        for row in rows
    ):
        errors.append("borroczyn-seam-sources: no Borroczyn witness has sufficient research resolution")

    path = DATA / REFERENCE / "borroczyn-seam.geojson"
    if not path.exists():
        errors.append("missing Borroczyn seam GeoJSON")
        return
    try:
        geojson = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"borroczyn-seam: invalid GeoJSON: {exc}")
        return
    metadata = geojson.get("metadata", {})
    if metadata.get("schemaVersion") != 1:
        errors.append("borroczyn-seam: unsupported schemaVersion")
    if not str(metadata.get("version", "")).startswith("borroczyn-seam-"):
        errors.append("borroczyn-seam: version must start with borroczyn-seam-")
    if metadata.get("completeCityCoverage") is not False:
        errors.append("borroczyn-seam: complete-city coverage must remain explicitly false")
    if metadata.get("crs") != "EPSG:4326":
        errors.append("borroczyn-seam: CRS must be EPSG:4326")
    if not ISO_DATE.match(str(metadata.get("selectedOn", ""))):
        errors.append("borroczyn-seam: selectedOn must be an ISO date")
    if not metadata.get("justification"):
        errors.append("borroczyn-seam: justification is required")
    for source_id in metadata.get("basisSourceIds", []):
        if source_id not in by_id:
            errors.append(f"borroczyn-seam: basis source '{source_id}' does not resolve")

    features = geojson.get("features", [])
    if geojson.get("type") != "FeatureCollection" or len(features) != 1:
        errors.append("borroczyn-seam: expected one-feature FeatureCollection")
        return
    feature = features[0]
    geometry = feature.get("geometry", {})
    if geometry.get("type") != "Polygon":
        errors.append("borroczyn-seam: geometry must be a Polygon")
        return
    rings = geometry.get("coordinates", [])
    if len(rings) != 1 or len(rings[0]) < 4 or rings[0][0] != rings[0][-1]:
        errors.append("borroczyn-seam: polygon must have one closed exterior ring")
        return
    lons = [point[0] for point in rings[0]]
    lats = [point[1] for point in rings[0]]
    if not all(25.9 <= lon <= 26.3 for lon in lons) or not all(44.3 <= lat <= 44.6 for lat in lats):
        errors.append("borroczyn-seam: polygon falls outside the Bucharest review bounds")
    if max(lons) - min(lons) > 0.1 or max(lats) - min(lats) > 0.1:
        errors.append("borroczyn-seam: study area is not bounded tightly enough")


def validate_borroczyn_georeferencing(errors: list[str]) -> None:
    """KAN-358: keep the source, transform and modern reference distinct.

    An explicitly blocked package is valid. A released package is held to the
    stronger rules below, so adding a filename or changing a status cannot make
    an unmeasured transform look complete.
    """
    path = DATA / BORROCZYN_GEOREFERENCING
    if not path.exists():
        errors.append(f"missing Borroczyn georeferencing package: {BORROCZYN_GEOREFERENCING}")
        return
    try:
        package = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"borroczyn-georeferencing: invalid JSON: {exc}")
        return

    label = "borroczyn-georeferencing"
    if package.get("schemaVersion") != 1:
        errors.append(f"{label}: unsupported schemaVersion")
    if package.get("ticket") != "KAN-358":
        errors.append(f"{label}: ticket must be KAN-358")
    if package.get("studyAreaId") != "br-seam-uranus-antim":
        errors.append(f"{label}: studyAreaId must resolve to the selected seam")
    status = package.get("status")
    if status not in BORROCZYN_RELEASE_STATES:
        errors.append(f"{label}: status '{status}' is not recognised")
    if package.get("targetCrs") != "EPSG:3844":
        errors.append(f"{label}: targetCrs must be Romanian Stereo 70 (EPSG:3844)")
    if package.get("webCrs") != "EPSG:3857":
        errors.append(f"{label}: webCrs must be EPSG:3857")
    if not package.get("transformationMethod"):
        errors.append(f"{label}: transformationMethod is required")
    pipeline = package.get("pipeline", [])
    if not isinstance(pipeline, list) or not pipeline or not all(isinstance(step, str) for step in pipeline):
        errors.append(f"{label}: a reproducible command pipeline is required")

    sources = {row["source_id"]: row for row in _read("borroczyn_seam_sources", errors)}
    layers = package.get("evidenceLayers", [])
    roles = [layer.get("role") for layer in layers if isinstance(layer, dict)]
    if set(roles) != BORROCZYN_LAYER_ROLES or len(roles) != len(BORROCZYN_LAYER_ROLES):
        errors.append(f"{label}: historical, derived and modern evidence layers must be distinct")
    for layer in layers:
        if not isinstance(layer, dict):
            errors.append(f"{label}: every evidence layer must be an object")
            continue
        source_id = layer.get("sourceId")
        if source_id not in sources:
            errors.append(f"{label}: layer source '{source_id}' does not resolve")
        if not layer.get("id") or not layer.get("status"):
            errors.append(f"{label}: every evidence layer needs an id and status")

    controls = package.get("controlPoints", [])
    if not isinstance(controls, list):
        errors.append(f"{label}: controlPoints must be a list")
        controls = []
    seen = set()
    for point in controls:
        if not isinstance(point, dict):
            errors.append(f"{label}: every control point must be an object")
            continue
        point_id = point.get("id", "")
        point_label = f"{label}[{point_id or 'unnamed-control'}]"
        if not point_id or point_id in seen:
            errors.append(f"{point_label}: control point id must be unique")
        seen.add(point_id)
        for field in ("pixelX", "pixelY", "stereo70X", "stereo70Y", "residualM"):
            if not isinstance(point.get(field), (int, float)):
                errors.append(f"{point_label}: {field} must be numeric")
        if point.get("use") not in {"fit", "independent_check"}:
            errors.append(f"{point_label}: use must be fit or independent_check")
        if not point.get("sourceFeature"):
            errors.append(f"{point_label}: sourceFeature is required")

    metrics = package.get("residualMetrics", {})
    if metrics.get("unit") != "metres":
        errors.append(f"{label}: residual metrics must be recorded in metres")
    if status == "blocked_pending_witness" and not package.get("blockers"):
        errors.append(f"{label}: a blocked package must name its blockers")
    if status == "released":
        fit = [point for point in controls if point.get("use") == "fit"]
        checks = [point for point in controls if point.get("use") == "independent_check"]
        if len(fit) < 6 or len(checks) < 2:
            errors.append(f"{label}: release requires six fit points and two independent checks")
        if not isinstance(metrics.get("rmse"), (int, float)) or not isinstance(
            metrics.get("maximum"), (int, float)
        ):
            errors.append(f"{label}: release requires measured RMSE and maximum residuals")
        historical = next(
            (layer for layer in layers if layer.get("role") == "historical_source"), None
        )
        source = sources.get(historical.get("sourceId")) if historical else None
        if source is None or source.get("production_role") not in {
            "production_primary", "production_fallback"
        }:
            errors.append(f"{label}: release requires a rights-cleared historical production source")

    rows = _read("urban_features", errors)
    _check_unique(rows, "urban_feature_id", "urban-features", errors)
    for row in rows:
        feature_id = row["urban_feature_id"]
        row_label = f"urban-features[{feature_id}]"
        if not feature_id.startswith("urb-") or not SLUG.match(feature_id):
            errors.append(f"{row_label}: urban_feature_id must be an urb- slug")
        if row["feature_type"] not in URBAN_FEATURE_TYPES:
            errors.append(f"{row_label}: feature_type is not recognised")
        if row["study_area_id"] != package.get("studyAreaId"):
            errors.append(f"{row_label}: study_area_id does not resolve to the selected seam")
        if row["evidence_layer"] not in BORROCZYN_LAYER_ROLES:
            errors.append(f"{row_label}: evidence_layer is not recognised")
        source = sources.get(row["source_id"])
        if source is None:
            errors.append(f"{row_label}: source_id '{row['source_id']}' does not resolve")
        for field in ("geometry_provenance", "source_feature_ref", "geometry_wkt", "notes"):
            if not row[field]:
                errors.append(f"{row_label}: {field} is required")
        if row["geometry_provenance"] not in REQUIRED_TERMS["geometry_provenance"]:
            errors.append(f"{row_label}: geometry_provenance is not recognised")
        if row["review_state"] not in REQUIRED_TERMS["review_state"]:
            errors.append(f"{row_label}: review_state is not recognised")
        if not row["valid_from"].lstrip("-").isdigit() or not row["valid_to"].lstrip("-").isdigit():
            errors.append(f"{row_label}: validity bounds must be years")
        if row["review_state"] == "published" and (
            source is None or source.get("production_role") == "research_only"
        ):
            errors.append(f"{row_label}: published geometry requires a production-cleared source")


def validate_in_manibus(errors: list[str], sources: set[str], attestations: set[str]) -> None:
    """KAN-360/361: physical observation is a gate, not a prose assertion."""
    inspections = _read("in_manibus_inspections", errors)
    _check_unique(inspections, "inspection_id", "in-manibus-inspections", errors)
    inspections_by_id = {row["inspection_id"]: row for row in inspections}
    observed_fields = (
        "inspection_date", "inspector", "creator", "title", "date_label",
        "edition_state", "dimensions_cm", "recto_observations", "verso_observations",
        "fold_binding_traces", "colour_state", "repairs_marks", "provenance_clues",
        "state_confidence",
    )
    for row in inspections:
        inspection_id = row["inspection_id"]
        label = f"in-manibus-inspections[{inspection_id}]"
        if not inspection_id.startswith("ins-") or not SLUG.match(inspection_id):
            errors.append(f"{label}: inspection_id must be an ins- slug")
        if not row["candidate_map_id"]:
            errors.append(f"{label}: candidate_map_id is required")
        status = row["inspection_status"]
        if status not in IN_MANIBUS_INSPECTION_STATES:
            errors.append(f"{label}: inspection_status '{status}' is not recognised")
        if status in {"physically_inspected", "reviewed"}:
            for field in observed_fields:
                if not row[field]:
                    errors.append(f"{label}: {field} is required after physical inspection")
            if row["inspection_date"] and not ISO_DATE.match(row["inspection_date"]):
                errors.append(f"{label}: inspection_date must be an ISO date")

    objects = _read("objects", errors)
    _check_unique(objects, "object_id", "objects", errors)
    objects_by_id = {row["object_id"]: row for row in objects}
    for row in objects:
        object_id = row["object_id"]
        label = f"objects[{object_id}]"
        if not object_id.startswith("obj-") or not SLUG.match(object_id):
            errors.append(f"{label}: object_id must be an obj- slug")
        inspection = inspections_by_id.get(row["inspection_id"])
        if inspection is None:
            errors.append(f"{label}: inspection_id '{row['inspection_id']}' does not resolve")
        elif inspection["inspection_status"] != "reviewed":
            errors.append(f"{label}: only a reviewed physical inspection may create an object")
        for field in (
            "collection_map_id", "title", "creator", "date_label", "edition_state",
            "dimensions_cm", "provenance", "condition", "colour_state", "binding_state",
        ):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["source_id"] and row["source_id"] not in sources:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        if row["review_state"] not in REVIEWED_OR_ABOVE:
            errors.append(f"{label}: a production object must be reviewed or above")

    evidence = _read("object_evidence", errors)
    _check_unique(evidence, "evidence_id", "object-evidence", errors)
    for row in evidence:
        evidence_id = row["evidence_id"]
        label = f"object-evidence[{evidence_id}]"
        if not evidence_id.startswith("obe-") or not SLUG.match(evidence_id):
            errors.append(f"{label}: evidence_id must be an obe- slug")
        if row["object_id"] not in objects_by_id:
            errors.append(f"{label}: object_id '{row['object_id']}' does not resolve")
        if row["evidence_kind"] not in OBJECT_EVIDENCE_KINDS:
            errors.append(f"{label}: evidence_kind is not recognised")
        if row["observation_basis"] not in OBJECT_EVIDENCE_BASES:
            errors.append(f"{label}: observation_basis is not recognised")
        if row["evidence_kind"] == "physical_observation" and row["observation_basis"] != "direct_physical":
            errors.append(f"{label}: physical observations require direct_physical basis")
        if not row["evidence_note"]:
            errors.append(f"{label}: evidence_note is required")
        if row["source_id"] and row["source_id"] not in sources:
            errors.append(f"{label}: source_id '{row['source_id']}' does not resolve")
        for attestation_id in _pipe_set(row["attestation_ids"]):
            if attestation_id not in attestations:
                errors.append(f"{label}: attestation_id '{attestation_id}' does not resolve")
        for slug in _pipe_set(row["related_essay_slugs"]):
            if not (REPO / "src" / "content" / "essays" / f"{slug}.mdx").exists():
                errors.append(f"{label}: related essay '{slug}' does not resolve")
        if row["review_state"] not in REQUIRED_TERMS["review_state"]:
            errors.append(f"{label}: review_state is not recognised")


def _check_gis_ring(ring, label: str, errors: list[str]) -> None:
    """A closed ring inside the Dacia window, with enough vertices to be a shape."""
    if len(ring) < 4:
        errors.append(f"{label}: a ring needs at least four positions")
        return
    if ring[0] != ring[-1]:
        errors.append(f"{label}: ring is not closed")
    for lon, lat in ring:
        if not (LON_RANGE[0] <= lon <= LON_RANGE[1] and LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
            errors.append(f"{label}: position {lon},{lat} is outside the Dacia window")
            return


def _load_gis_geojson(name: str, version_prefix: str, errors: list[str]) -> dict:
    path = DATA / GIS / f"{name}.geojson"
    if not path.exists():
        errors.append(f"missing GIS geometry: {path.relative_to(REPO)}")
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{name}: invalid GeoJSON: {exc}")
        return {}
    metadata = payload.get("metadata", {})
    if metadata.get("schemaVersion") != 1:
        errors.append(f"{name}: unsupported schemaVersion")
    if not str(metadata.get("version", "")).startswith(version_prefix):
        errors.append(f"{name}: version must start with {version_prefix}")
    if metadata.get("crs") != "EPSG:4326":
        errors.append(f"{name}: CRS must be EPSG:4326")
    if not ISO_DATE.match(str(metadata.get("compiledOn", ""))):
        errors.append(f"{name}: compiledOn must be an ISO date")
    # The claim that nothing here is surveyed is the layer's whole epistemic
    # position, so it is a field that must be present and false, not prose.
    if metadata.get("surveyedGeometry") is not False:
        errors.append(f"{name}: surveyedGeometry must be explicitly false")
    if not metadata.get("justification"):
        errors.append(f"{name}: drawn geometry requires a recorded justification")
    return payload


def validate_reception_claims(terms, errors: list[str]) -> None:
    """KAN-368: how a claim is made, and what it may not inherit by looking alike.

    The corpus classifies items; this records what each one asserts and how it
    stands to the material it invokes. The rule the table exists for is that a
    contemporary derivative cannot acquire authority from resembling a scholarly
    map - the visual counterpart of the homonym_only edge in Nomen Errans.
    """
    items = {row["item_id"]: row for row in _read("reception_corpus", errors)}
    rows = _read("reception_claims", errors)
    _check_unique(rows, "claim_id", "reception-claims", errors)
    claimed: set[str] = set()

    for row in rows:
        claim_id = row["claim_id"]
        label = f"reception-claims[{claim_id}]"
        if not claim_id.startswith("rcl-") or not SLUG.match(claim_id):
            errors.append(f"{label}: claim_id must be an rcl- slug")
        item = items.get(row["item_id"])
        if item is None:
            errors.append(f"{label}: item_id '{row['item_id']}' does not resolve")
        else:
            claimed.add(row["item_id"])
        target = items.get(row["relates_to"])
        if row["relates_to"] and target is None:
            errors.append(f"{label}: relates_to '{row['relates_to']}' does not resolve")
        if row["relates_to"] == row["item_id"]:
            errors.append(f"{label}: a claim cannot relate an item to itself")

        for field in ("claim", "asserted_about", "evidence_note", "uncertainty", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["claim_kind"] not in RECEPTION_CLAIM_KINDS:
            errors.append(f"{label}: claim_kind '{row['claim_kind']}' is not recognised")
        kind = row["relationship_kind"]
        if kind not in RECEPTION_RELATIONSHIPS:
            errors.append(f"{label}: relationship_kind '{kind}' is not recognised")
        if row["interpretation_status"] not in TREATY_INTERPRETATION_STATES:
            errors.append(f"{label}: interpretation_status is not recognised")
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

        if item is None:
            continue

        # The rule this table is for. A derivative may look exactly like a
        # scholarly map and inherit nothing from it, so the only relationships
        # it may assert are ones that claim no descent.
        if item["source_class"] == "contemporary_derivative" and kind == "derives_from":
            errors.append(
                f"{label}: a contemporary derivative cannot claim descent from a historical "
                "source on the strength of resembling one; use resembles or responds_to"
            )
        # A derivation is a claim about transmission and needs its evidence, in
        # the same way a continuity edge in Nomen Errans does.
        if kind == "derives_from":
            if target is not None and target["selection_state"] == "class_only":
                errors.append(
                    f"{label}: nothing has been selected from '{row['relates_to']}', so no "
                    "derivation from it can be evidenced"
                )
            if item["selection_state"] == "class_only":
                errors.append(
                    f"{label}: a class from which nothing is selected cannot be said to derive "
                    "from anything in particular"
                )
        # Uncertainty travels as text, so a reader who cannot use colour still
        # gets the contested reading rather than a hue.
        if row["interpretation_status"] == "disputed" and len(row["uncertainty"]) < 40:
            errors.append(
                f"{label}: a disputed claim must state its uncertainty in words, not leave it "
                "to a colour"
            )

    for item_id, item in sorted(items.items()):
        # An item with no claim recorded is decoration: the essay would show it
        # without being able to say what it asserts.
        if item_id not in claimed:
            errors.append(f"reception-claims: '{item_id}' is in the corpus with no claim recorded")


def validate_reception_corpus(terms, sources, errors: list[str]) -> None:
    """KAN-367: the reception corpus, and the rubric that keeps it from arguing.

    Dacia Rediviva is about how antiquity has been used, which means its corpus
    is full of material that is compelling and is not evidence. The rules that
    keep those apart are data here rather than editorial intention, so they
    cannot be forgotten in a later interaction.
    """
    rubric = _read("reception_rubric", errors)
    _check_unique(rubric, "rule_id", "reception-review-rubric", errors)
    for row in rubric:
        label = f"reception-review-rubric[{row['rule_id']}]"
        for field in ("rule", "rationale"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["enforced_by"] not in {"validator", "editorial"}:
            errors.append(f"{label}: enforced_by must be validator or editorial")
        if row["binding"] != "yes":
            errors.append(f"{label}: a rubric rule that does not bind is not a rule")
    if missing := REQUIRED_RUBRIC_RULES - {row["rule_id"] for row in rubric}:
        errors.append(f"reception-review-rubric: missing required rules {sorted(missing)}")

    rows = _read("reception_corpus", errors)
    _check_unique(rows, "item_id", "reception-corpus", errors)
    classes: set[str] = set()

    for row in rows:
        item_id = row["item_id"]
        label = f"reception-corpus[{item_id}]"
        if not item_id.startswith("rec-") or not SLUG.match(item_id):
            errors.append(f"{label}: item_id must be a rec- slug")
        source_class = row["source_class"]
        classes.add(source_class)
        if source_class not in RECEPTION_CLASSES:
            errors.append(f"{label}: source_class '{source_class}' is not recognised")
        role = row["evidence_role"]
        if role not in RECEPTION_ROLES:
            errors.append(f"{label}: evidence_role '{role}' is not recognised")
        for field in ("title", "historical_context", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_vocab(
            row["date_precision"], "date_precision", terms, label, "date_precision", errors
        )
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        _check_https(row["source_url"], label, "source_url", errors)
        _check_https(row["rights_basis_url"], label, "rights_basis_url", errors)
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["selection_state"] not in RECEPTION_SELECTION:
            errors.append(f"{label}: selection_state is not recognised")
        if not row["issued_year"].lstrip("-").isdigit():
            errors.append(f"{label}: issued_year must be a year")
        if row["corpus_source_id"] and row["corpus_source_id"] not in sources:
            errors.append(f"{label}: corpus_source_id does not resolve in sources.csv")

        # rr-2: reception documents its own moment, and never antiquity.
        if source_class in RECEPTION_NEVER_AUTHORITATIVE and role == "authoritative_evidence":
            errors.append(
                f"{label}: {source_class} is evidence about its own moment, not about the "
                "antiquity it depicts, so it cannot be authoritative_evidence (rubric rr-2)"
            )
        # rr-3: apparent detail is not provenance.
        unidentified = row["creator"] in {"", PENDING} or row["provenance"] in {"", PENDING}
        if unidentified and role != "reference_artefact":
            errors.append(
                f"{label}: an item with no identified creator or provenance may only be a "
                "reference_artefact (rubric rr-3)"
            )
        # rr-5: a class is a finding; an unselected item is not a source.
        if row["selection_state"] == "class_only" and role != "reference_artefact":
            errors.append(
                f"{label}: nothing has been selected from this class, so it cannot carry "
                f"the role '{role}' (rubric rr-5)"
            )
        if row["selection_state"] == "selected" and row["citation"] in {"", PENDING}:
            errors.append(f"{label}: a selected item must carry its citation")

    # The essay argues across all four registers; dropping one would turn the
    # comparison into a claim about whichever remained.
    for missing in sorted(RECEPTION_CLASSES - classes):
        errors.append(f"reception-corpus: no item represents the '{missing}' class")


def validate_acquisition_dossiers(terms, errors: list[str]) -> None:
    """KAN-363: research dossiers that cannot recommend what they have not identified."""
    rows = _read("acquisition_dossiers", errors)
    _check_unique(rows, "dossier_id", "acquisition-dossiers", errors)
    families: set[str] = set()

    for row in rows:
        dossier_id = row["dossier_id"]
        label = f"acquisition-dossiers[{dossier_id}]"
        if not dossier_id.startswith("acq-") or not SLUG.match(dossier_id):
            errors.append(f"{label}: dossier_id must be an acq- slug")
        families.add(row["family"])
        for field in ("family", "title", "creator", "atlas_context", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_vocab(
            row["date_precision"], "date_precision", terms, label, "date_precision", errors
        )
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if row["verification_state"] not in VERIFICATION_STATES:
            errors.append(f"{label}: verification_state is not recognised")
        if row["acquisition_status"] not in ACQUISITION_STATES:
            errors.append(f"{label}: acquisition_status is not recognised")
        # Validity is assessed on the map, never inferred from whether it was
        # bought: it is required on every row whatever the acquisition state.
        if row["scholarly_validity"] not in SCHOLARLY_VALIDITY:
            errors.append(f"{label}: scholarly_validity is not recognised")
        if not row["issued_year"].lstrip("-").isdigit():
            errors.append(f"{label}: issued_year must be a year")

        unidentified = [f for f in ACQUISITION_IDENTITY if row[f] in {"", PENDING}]
        if row["acquisition_status"] == "recommended":
            if unidentified:
                errors.append(
                    f"{label}: a recommendation must identify what it recommends; "
                    f"still pending: {', '.join(unidentified)}"
                )
            if row["verification_state"] != "verified":
                errors.append(f"{label}: a recommendation requires a verified dossier")
        # An unverified dossier that has nonetheless filled everything in is the
        # dangerous case: it looks identified and nobody has checked it.
        if row["verification_state"] == "verified" and unidentified:
            errors.append(
                f"{label}: a verified dossier cannot leave {', '.join(unidentified)} pending"
            )

        # The Ptolemaic rule, which is the reason this table has a family column:
        # Tabula Europae numbering is not stable across editions, so a plate
        # number without the edition it belongs to is not a citation.
        if row["family"] == "ptolemaic" and row["plate_number"] not in {"", PENDING}:
            if row["edition_state"] in {"", PENDING}:
                errors.append(
                    f"{label}: a Tabula Europae number means nothing without the edition it "
                    "is numbered in; name the edition or leave the plate pending"
                )

    for missing in sorted(REQUIRED_ACQUISITION_FAMILIES - families):
        errors.append(
            f"acquisition-dossiers: the programme's priority families require a "
            f"'{missing}' dossier, purchasable or not"
        )


def validate_treaty_frontier(terms, errors: list[str]) -> None:
    """KAN-352: no timeless line, and no averaged one.

    Every segment is attributed to the instrument that made it and to the years
    it held. Where two sources give different lines for the same moment both are
    kept, each naming the other, because a frontier averaged from two claims is
    one nobody made.
    """
    rows = _read("treaty_frontier", errors)
    _check_unique(rows, "segment_id", "treaty-frontier", errors)
    payload = _load_gis_geojson("treaty-frontier", "treaty-frontier-", errors)
    metadata = payload.get("metadata", {})
    if metadata.get("derivedFromModernBorders") is not False:
        errors.append("treaty-frontier: derivedFromModernBorders must be explicitly false")
    shapes = {feature.get("id"): feature for feature in payload.get("features", [])}

    ledgers = {
        "treaty_frontier_sources": {
            row["source_id"] for row in _read("treaty_frontier_sources", errors)
        },
        "carta_rubra_sources": {row["source_id"] for row in _read("carta_rubra_sources", errors)},
    }
    by_id = {row["segment_id"]: row for row in rows}
    by_phase: dict[str, list[str]] = {}

    for row in rows:
        segment_id = row["segment_id"]
        label = f"treaty-frontier[{segment_id}]"
        if not segment_id.startswith("tf-seg-") or not SLUG.match(segment_id):
            errors.append(f"{label}: segment_id must be a tf-seg- slug")
        if not row["phase_id"].startswith("tfp-") or not SLUG.match(row["phase_id"]):
            errors.append(f"{label}: phase_id must be a tfp- slug")
        by_phase.setdefault(row["phase_id"], []).append(segment_id)

        for field in ("name", "legal_context", "territorial_scope", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["line_type"] not in FRONTIER_LINE_TYPES:
            errors.append(f"{label}: line_type '{row['line_type']}' is not recognised")
        if row["source_ledger"] not in FRONTIER_LEDGERS:
            errors.append(f"{label}: source_ledger '{row['source_ledger']}' is not recognised")
        elif row["source_id"] not in ledgers[row["source_ledger"]]:
            errors.append(
                f"{label}: source_id '{row['source_id']}' does not resolve in "
                f"{row['source_ledger']}"
            )
        if row["interpretation_status"] not in TREATY_INTERPRETATION_STATES:
            errors.append(f"{label}: interpretation_status is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        _check_vocab(
            row["geometry_provenance"], "geometry_provenance", terms,
            label, "geometry_provenance", errors,
        )
        if row["geometry_provenance"] in GIS_UNAVAILABLE_PROVENANCE:
            errors.append(
                f"{label}: the ledger records that no instrument here has usable delimitation "
                f"geometry, so '{row['geometry_provenance']}' would overstate this line"
            )
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)

        # No timeless line: a frontier without a start year is not a phase, and
        # an end year that precedes its start is not a period.
        if not row["valid_from"].isdigit():
            errors.append(f"{label}: a frontier line must say when it began")
        elif int(row["valid_from"]) < FRONTIER_FROM:
            errors.append(f"{label}: {row['valid_from']} precedes the ledger's {FRONTIER_FROM}")
        if row["valid_to"]:
            if not row["valid_to"].isdigit():
                errors.append(f"{label}: valid_to must be a year or empty for open-ended")
            elif row["valid_from"].isdigit() and int(row["valid_to"]) < int(row["valid_from"]):
                errors.append(f"{label}: the phase ends before it starts")

        alternative = row["alternative_of"]
        if alternative:
            other = by_id.get(alternative)
            if other is None:
                errors.append(f"{label}: alternative_of '{alternative}' does not resolve")
            elif other["phase_id"] != row["phase_id"]:
                errors.append(
                    f"{label}: an alternative must contest the same phase, not "
                    f"'{other['phase_id']}'"
                )

        shape = shapes.get(segment_id)
        if shape is None:
            errors.append(f"{label}: no geometry for this segment")
        elif shape.get("geometry", {}).get("type") != "LineString":
            errors.append(f"{label}: expected a LineString")
        else:
            positions = shape["geometry"].get("coordinates", [])
            if len(positions) < 2:
                errors.append(f"{label}: a frontier needs at least two positions")
            for lon, lat in positions:
                if not (
                    LON_RANGE[0] <= lon <= LON_RANGE[1] and LAT_RANGE[0] <= lat <= LAT_RANGE[1]
                ):
                    errors.append(f"{label}: position {lon},{lat} is outside the Dacia window")
                    break

    # Two lines for one phase are a disagreement, and the table has to say so on
    # both sides rather than leaving a reader to notice the overlap.
    for phase_id, segments in sorted(by_phase.items()):
        if len(segments) < 2:
            continue
        for segment_id in sorted(segments):
            row = by_id[segment_id]
            others = [s for s in segments if s != segment_id]
            if not row["alternative_of"]:
                errors.append(
                    f"treaty-frontier[{segment_id}]: phase '{phase_id}' carries "
                    f"{len(segments)} lines, so this one must name what it competes with "
                    f"({', '.join(sorted(others))})"
                )
        # At least one of them has to be something other than a treaty line, or
        # the phase is claiming an instrument contradicted itself.
        kinds = {by_id[s]["line_type"] for s in segments}
        if kinds == {"treaty_line"}:
            errors.append(
                f"treaty-frontier: phase '{phase_id}' holds only treaty lines; a competing "
                "line is a proposal or a reconstruction, not a second instrument"
            )

    for orphan in sorted(set(shapes) - set(by_id)):
        errors.append(f"treaty-frontier: geometry '{orphan}' has no row in treaty-frontier.csv")


def validate_nomen_errans_witnesses(terms, ranks, name_uses, errors: list[str]) -> None:
    """KAN-344: what the essay might show, and whether it may (rights, not readings).

    The ledger records what a name meant; this records what could be put on the
    page beside it. They are separate questions and separate tables, because a
    use can be perfectly well evidenced and still have no image anyone may
    publish - which is the situation the trench is actually in.
    """
    rows = _read("nomen_errans_witnesses", errors)
    _check_unique(rows, "witness_id", "nomen-errans-witnesses", errors)
    publishable = 0

    for row in rows:
        witness_id = row["witness_id"]
        label = f"nomen-errans-witnesses[{witness_id}]"
        if not witness_id.startswith("ne-") or not SLUG.match(witness_id):
            errors.append(f"{label}: witness_id must be an ne- slug")
        if row["witness_type"] not in NOMEN_ERRANS_WITNESS_TYPES:
            errors.append(f"{label}: witness_type '{row['witness_type']}' is not recognised")
        # Every candidate witness is a candidate *for* something: the use it
        # would illustrate. A picture with no argument behind it is decoration.
        if row["name_use_id"] not in name_uses:
            errors.append(f"{label}: name_use_id '{row['name_use_id']}' does not resolve")
        for field in ("title", "creator", "repository", "citation", "locator", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if not row["issued_year"].lstrip("-").isdigit():
            errors.append(f"{label}: issued_year must be a year")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_https(row["rights_basis_url"], label, "rights_basis_url", errors)
        if row["rights_status"] not in RESEARCH_RIGHTS:
            errors.append(f"{label}: rights_status '{row['rights_status']}' is not recognised")
        if row["resolution_status"] not in RESEARCH_RESOLUTION_STATES:
            errors.append(f"{label}: resolution_status is not recognised")
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if not row["repository_object_id"]:
            errors.append(f"{label}: repository_object_id is required, pending if unknown")

        role = row["production_role"]
        if role not in RESEARCH_PRODUCTION_ROLES:
            errors.append(f"{label}: production_role '{role}' is not recognised")
        elif role in {"production_primary", "production_fallback"}:
            publishable += 1
            # The same bar the other packages hold: a witness may only be planned
            # into the page once its rights permit production-wide reuse and
            # somebody has confirmed there is a usable reproduction to reuse.
            if row["rights_status"] not in OPEN_PRODUCTION_RIGHTS:
                errors.append(f"{label}: production role requires production-wide reuse rights")
            if row["resolution_status"] != "sufficient":
                errors.append(f"{label}: production role requires sufficient resolution")
            if row["repository_object_id"] == PENDING:
                errors.append(f"{label}: production role requires a repository object identifier")

    # Whether any witness is publishable is not an error either way - an essay
    # may be written from description alone - so it is reported in the readiness
    # lines rather than raised here.
    del publishable


def validate_roman_dacia(terms, places, errors: list[str]) -> None:
    """KAN-341: a baseline that never authors a coordinate the corpus already holds."""
    rows = _read("roman_dacia", errors)
    _check_unique(rows, "feature_id", "roman-dacia", errors)
    payload = _load_gis_geojson("roman-dacia-lines", "roman-dacia-lines-", errors)
    drawn = {feature.get("id") for feature in payload.get("features", [])}
    drawn_used: set[str] = set()
    types: set[str] = set()

    for row in rows:
        feature_id = row["feature_id"]
        label = f"roman-dacia[{feature_id}]"
        if not feature_id.startswith("rd-") or not SLUG.match(feature_id):
            errors.append(f"{label}: feature_id must be an rd- slug")
        feature_type = row["feature_type"]
        types.add(feature_type)
        if feature_type not in ROMAN_FEATURE_TYPES:
            errors.append(f"{label}: feature_type '{feature_type}' is not recognised")
        for field in ("name", "citation", "repository", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_vocab(
            row["geometry_provenance"], "geometry_provenance", terms,
            label, "geometry_provenance", errors,
        )
        if row["geometry_provenance"] in GIS_UNAVAILABLE_PROVENANCE:
            errors.append(
                f"{label}: no feature here is digitised from a source; "
                f"'{row['geometry_provenance']}' would claim it is"
            )
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        if not row["valid_from"].isdigit() or not row["valid_to"].isdigit():
            errors.append(f"{label}: valid_from and valid_to must be years")
        elif int(row["valid_from"]) > int(row["valid_to"]):
            errors.append(f"{label}: valid_from is later than valid_to")

        if feature_type == "site":
            if row["place_id"] not in places:
                errors.append(f"{label}: a site must resolve to a CND place")
            if row["via_place_ids"]:
                errors.append(f"{label}: a site does not run through stations")
        elif feature_type == "road":
            stations = _pipe_set(row["via_place_ids"])
            if len(stations) < 2:
                errors.append(f"{label}: a road needs at least two stations")
            for station in stations:
                if station not in places:
                    errors.append(f"{label}: station '{station}' does not resolve")
            if row["place_id"]:
                errors.append(f"{label}: a road is a sequence of places, not one place")
        elif feature_type == "limes":
            if row["place_id"] or row["via_place_ids"]:
                errors.append(f"{label}: a frontier corridor is drawn, not joined from places")
            if feature_id not in drawn:
                errors.append(f"{label}: no drawn geometry for this corridor")
            drawn_used.add(feature_id)

    for orphan in sorted(drawn - drawn_used):
        errors.append(f"roman-dacia-lines: geometry '{orphan}' has no row in roman-dacia.csv")
    for feature in payload.get("features", []):
        geometry = feature.get("geometry", {})
        if geometry.get("type") != "LineString":
            errors.append(f"roman-dacia-lines[{feature.get('id')}]: expected a LineString")
            continue
        positions = geometry.get("coordinates", [])
        if len(positions) < 2:
            errors.append(f"roman-dacia-lines[{feature.get('id')}]: a corridor needs two positions")
        for lon, lat in positions:
            if not (LON_RANGE[0] <= lon <= LON_RANGE[1] and LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
                errors.append(
                    f"roman-dacia-lines[{feature.get('id')}]: position outside the Dacia window"
                )
                break

    if missing := ROMAN_FEATURE_TYPES - types:
        errors.append(f"roman-dacia: baseline is missing feature types {sorted(missing)}")


def validate_principalities(terms, errors: list[str]) -> None:
    """KAN-342: phases, and no modern border standing in for a historical one."""
    rows = _read("principalities", errors)
    _check_unique(rows, "phase_id", "principalities", errors)
    payload = _load_gis_geojson("principalities", "principalities-", errors)
    metadata = payload.get("metadata", {})
    if metadata.get("derivedFromModernBorders") is not False:
        errors.append("principalities: derivedFromModernBorders must be explicitly false")
    shapes = {feature.get("id"): feature for feature in payload.get("features", [])}
    spans: dict[str, list[tuple[int, int, str]]] = {}

    for row in rows:
        phase_id = row["phase_id"]
        label = f"principalities[{phase_id}]"
        if not phase_id.startswith("pp-") or not SLUG.match(phase_id):
            errors.append(f"{label}: phase_id must be a pp- slug")
        if not row["polity_id"].startswith("pol-") or not SLUG.match(row["polity_id"]):
            errors.append(f"{label}: polity_id must be a pol- slug")
        for field in ("polity_name", "phase_label", "instrument", "citation", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        if row["sovereignty"] not in PRINCIPALITY_SOVEREIGNTY:
            errors.append(f"{label}: sovereignty '{row['sovereignty']}' is not recognised")
        # A tributary or a province has an overlord; contested territory is
        # precisely the case where naming one would be the error.
        if row["sovereignty"] == "contested":
            if row["suzerain"]:
                errors.append(f"{label}: contested territory cannot name a single suzerain")
        elif not row["suzerain"]:
            errors.append(f"{label}: {row['sovereignty']} requires a suzerain")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_vocab(
            row["geometry_provenance"], "geometry_provenance", terms,
            label, "geometry_provenance", errors,
        )
        if row["geometry_provenance"] != "editorial_reconstruction":
            errors.append(
                f"{label}: these envelopes are drawn by this project and must say so"
            )
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")

        bounds = []
        for field in ("valid_from", "valid_to", "instrument_year"):
            if not row[field].isdigit():
                errors.append(f"{label}: {field} must be a year")
            else:
                bounds.append(int(row[field]))
        if len(bounds) == 3:
            start, end, instrument = bounds
            if start >= end:
                errors.append(f"{label}: a phase must end after it starts")
            if start < PRINCIPALITY_FROM or end > PRINCIPALITY_TO:
                errors.append(
                    f"{label}: {start}-{end} falls outside "
                    f"{PRINCIPALITY_FROM}-{PRINCIPALITY_TO}"
                )
            if instrument != start:
                errors.append(f"{label}: the phase must begin at the instrument that opened it")
            spans.setdefault(row["polity_id"], []).append((start, end, phase_id))

        shape = shapes.get(phase_id)
        if shape is None:
            errors.append(f"{label}: no polygon for this phase")
        elif shape.get("geometry", {}).get("type") != "Polygon":
            errors.append(f"{label}: expected a Polygon")
        else:
            for ring in shape["geometry"]["coordinates"]:
                _check_gis_ring(ring, label, errors)

    # One polity cannot hold two different extents at the same moment. Bounds are
    # inclusive on both ends - the Atlas filter is valid_from <= year <= valid_to -
    # so a phase must end the year *before* the instrument that replaced it, or
    # both render on the changeover year.
    for polity_id, entries in spans.items():
        ordered = sorted(entries)
        for (start, end, phase_id), (next_start, _, next_id) in zip(ordered, ordered[1:]):
            if next_start <= end:
                errors.append(
                    f"principalities[{polity_id}]: phases {phase_id} and {next_id} overlap "
                    f"in {next_start}; a phase ends the year before its successor begins"
                )

    for orphan in sorted(set(shapes) - {row["phase_id"] for row in rows}):
        errors.append(f"principalities: polygon '{orphan}' has no phase row")


def validate_josephinian_sheets(terms, places, place_points, errors: list[str]) -> None:
    """KAN-343: footprints and links, and never a scan this project may not serve."""
    rows = _read("josephinian_sheets", errors)
    _check_unique(rows, "sheet_id", "josephinian-sheets", errors)
    _check_unique(rows, "sheet_label", "josephinian-sheets", errors)

    for row in rows:
        sheet_id = row["sheet_id"]
        label = f"josephinian-sheets[{sheet_id}]"
        if not sheet_id.startswith("js-") or not SLUG.match(sheet_id):
            errors.append(f"{label}: sheet_id must be a js- slug")
        for field in ("sheet_label", "survey", "scale", "citation", "repository", "notes"):
            if not row[field]:
                errors.append(f"{label}: {field} is required")
        _check_https(row["source_url"], label, "source_url", errors)
        _check_vocab(
            row["footprint_provenance"], "geometry_provenance", terms,
            label, "footprint_provenance", errors,
        )
        if row["footprint_provenance"] in GIS_UNAVAILABLE_PROVENANCE:
            errors.append(
                f"{label}: the archive's own index geometry has not been obtained, so "
                f"'{row['footprint_provenance']}' would overstate the footprint"
            )
        _check_vocab(row["confidence"], "confidence", terms, label, "confidence", errors)
        _check_vocab(
            row["rights_status"], "rights_statement", terms, label, "rights_status", errors
        )
        if row["review_status"] not in SOURCE_LEDGER_REVIEW_STATES:
            errors.append(f"{label}: review_status '{row['review_status']}' is not recognised")
        # The index exists to point at scans, not to hold them.
        if row["scan_redistributed"] != "no":
            errors.append(f"{label}: this index redistributes no scan")
        # An archive identifier nobody has transcribed may stay pending, but only
        # while the row still says it has not been checked.
        if row["archive_sheet_id"] == PENDING and row["review_status"] == "reviewed":
            errors.append(f"{label}: a reviewed sheet must carry its archive identifier")
        if not row["archive_sheet_id"]:
            errors.append(f"{label}: archive_sheet_id is required, pending if unknown")

        for field in ("survey_from", "survey_to"):
            if not row[field].isdigit():
                errors.append(f"{label}: {field} must be a year")
        if row["survey_from"].isdigit() and row["survey_to"].isdigit():
            if int(row["survey_from"]) > int(row["survey_to"]):
                errors.append(f"{label}: the survey cannot end before it starts")

        try:
            west, south = float(row["west"]), float(row["south"])
            east, north = float(row["east"]), float(row["north"])
        except ValueError:
            errors.append(f"{label}: the footprint bounds are not numbers")
            continue
        if west >= east or south >= north:
            errors.append(f"{label}: the footprint has no extent")
        _check_gis_ring(
            [[west, south], [east, south], [east, north], [west, north], [west, south]],
            label, errors,
        )
        # A coverage link that does not fall inside the footprint is a claim the
        # sheet cannot support, whichever of the two is wrong.
        for place_id in _pipe_set(row["covers_place_ids"]):
            if place_id not in places:
                errors.append(f"{label}: covered place '{place_id}' does not resolve")
                continue
            point = place_points.get(place_id)
            if point is None:
                errors.append(f"{label}: covered place '{place_id}' has no location")
            elif not (west <= point[0] < east and south <= point[1] < north):
                errors.append(f"{label}: covered place '{place_id}' lies outside the footprint")


def validate_research_package_manifest(errors: list[str]) -> None:
    """Hash-freeze the KAN-349/354/357 research packages and boundary."""
    path = DATA / RESEARCH_PACKAGE_MANIFEST
    if not path.exists():
        errors.append(f"missing research package manifest: {path.relative_to(DATA)}")
        return
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        errors.append("research-package-manifest: unsupported schemaVersion")
    if not ISO_DATE.match(str(manifest.get("frozenOn", ""))):
        errors.append("research-package-manifest: frozenOn must be an ISO date")

    expected = {
        "hiatus_absence_classes": ("KAN-349", "hiatus_absence_classes", "absence_class"),
        "hiatus_timeline": ("KAN-349", "hiatus_timeline", "state_id"),
        "carta_rubra_sources": ("KAN-354", "carta_rubra_sources", "source_id"),
        "carta_rubra_claims": ("KAN-354", "carta_rubra_claims", "claim_id"),
        "borroczyn_seam_sources": ("KAN-357", "borroczyn_seam_sources", "source_id"),
    }
    packages = manifest.get("packages", {})
    for name, (ticket, table, id_field) in expected.items():
        config = packages.get(name)
        label = f"research-package-manifest[{name}]"
        if not isinstance(config, dict):
            errors.append(f"{label}: package entry is required")
            continue
        if config.get("ticket") != ticket:
            errors.append(f"{label}: ticket must be {ticket}")
        expected_path = TABLES[table]
        if config.get("path") != expected_path:
            errors.append(f"{label}: path must be {expected_path}")
        rows = _read(table, errors)
        if config.get("recordCount") != len(rows):
            errors.append(f"{label}: recordCount does not match the table")
        if sorted(config.get("recordIds", [])) != sorted(row[id_field] for row in rows):
            errors.append(f"{label}: recordIds do not match the table")
        source = DATA / expected_path
        if source.exists() and config.get("sha256") != hashlib.sha256(source.read_bytes()).hexdigest():
            errors.append(f"{label}: package changed since it was frozen")

    geo_name = "borroczyn_seam"
    config = packages.get(geo_name)
    label = f"research-package-manifest[{geo_name}]"
    expected_path = f"{REFERENCE}/borroczyn-seam.geojson"
    if not isinstance(config, dict):
        errors.append(f"{label}: package entry is required")
    else:
        if config.get("ticket") != "KAN-357":
            errors.append(f"{label}: ticket must be KAN-357")
        if config.get("path") != expected_path:
            errors.append(f"{label}: path must be {expected_path}")
        source = DATA / expected_path
        if source.exists() and config.get("sha256") != hashlib.sha256(source.read_bytes()).hexdigest():
            errors.append(f"{label}: package changed since it was frozen")


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
    validate_release(ranks, errors)
    validate_hiatus_witness_families(errors)
    validate_hiatus_timeline(errors)
    validate_treaty_frontier_sources(errors)
    validate_carta_rubra_package(errors)
    validate_borroczyn_package(errors)
    validate_borroczyn_georeferencing(errors)
    name_uses = {row["name_use_id"] for row in _read("name_uses", errors)}
    validate_nomen_errans_witnesses(terms, ranks, name_uses, errors)
    place_points = {
        row["place_id"]: (float(row["ref_lon"]), float(row["ref_lat"]))
        for row in _read("places", errors)
        if row["location_status"] == "located" and row["ref_lon"] and row["ref_lat"]
    }
    validate_reception_corpus(terms, sources, errors)
    validate_reception_claims(terms, errors)
    validate_acquisition_dossiers(terms, errors)
    validate_treaty_frontier(terms, errors)
    validate_roman_dacia(terms, places, errors)
    validate_principalities(terms, errors)
    validate_josephinian_sheets(terms, places, place_points, errors)
    validate_in_manibus(errors, sources, attestation_ids)
    validate_source_ledger_manifest(errors)
    validate_research_package_manifest(errors)
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
    hiatus_states = _read("hiatus_timeline", errors)
    treaty_sources = _read("treaty_frontier_sources", errors)
    carta_sources = _read("carta_rubra_sources", errors)
    carta_claims = _read("carta_rubra_claims", errors)
    borroczyn_sources = _read("borroczyn_seam_sources", errors)
    urban_features = _read("urban_features", errors)
    inspections = _read("in_manibus_inspections", errors)
    objects = _read("objects", errors)
    object_evidence = _read("object_evidence", errors)
    witnesses = _read("nomen_errans_witnesses", errors)
    reception = _read("reception_corpus", errors)
    reception_claims = _read("reception_claims", errors)
    dossiers = _read("acquisition_dossiers", errors)
    frontiers = _read("treaty_frontier", errors)
    roman = _read("roman_dacia", errors)
    phases = _read("principalities", errors)
    sheets = _read("josephinian_sheets", errors)

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
        f"  research packages: {len(hiatus_states)} Hiatus states, "
        f"{len(carta_sources)} Carta Rubra sources/{len(carta_claims)} claims, and "
        f"{len(borroczyn_sources)} Borroczyn seam sources",
        f"  Campaign III: {len(urban_features)} Borroczyn urban features; "
        f"{len(inspections)} In Manibus inspections, {len(objects)} held objects and "
        f"{len(object_evidence)} object-evidence links",
        f"  Nomen Errans: {len(uses)} name uses, "
        f"{sum(1 for row in uses if row['review_state'] == 'normalized')} normalized and "
        f"{sum(1 for row in uses if row['review_state'] in REVIEWED_OR_ABOVE)} reviewed; "
        f"{len(witnesses)} candidate witnesses, "
        f"{sum(1 for row in witnesses if row['production_role'] != 'research_only')} cleared "
        f"for publication",
        f"  shared GIS: {len(roman)} Roman baseline features "
        f"({sum(1 for row in roman if row['feature_type'] == 'site')} joined to CND places), "
        f"{len(phases)} principality phases across "
        f"{len({row['polity_id'] for row in phases})} polities, "
        f"{len(sheets)} Josephinian sheets, "
        f"{len(frontiers)} treaty frontier lines across "
        f"{len({row['phase_id'] for row in frontiers})} phases "
        f"({sum(1 for row in frontiers if row['alternative_of'])} contested); "
        f"0 digitised from a source",
        f"  reception: {len(reception)} items across "
        f"{len({row['source_class'] for row in reception})} classes; "
        f"{sum(1 for row in reception if row['selection_state'] == 'selected')} selected, "
        f"{sum(1 for row in reception if row['evidence_role'] == 'reference_artefact')} "
        f"held as reference artefacts; {len(reception_claims)} claims, "
        f"{sum(1 for row in reception_claims if row['relationship_kind'] == 'derives_from')} "
        f"evidenced derivations and "
        f"{sum(1 for row in reception_claims if row['relationship_kind'] == 'resembles')} "
        f"resemblances that inherit nothing",
        f"  acquisition: {len(dossiers)} dossiers across "
        f"{len({row['family'] for row in dossiers})} priority families; "
        f"{sum(1 for row in dossiers if row['verification_state'] == 'verified')} verified, "
        f"{sum(1 for row in dossiers if row['acquisition_status'] == 'recommended')} recommended",
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
