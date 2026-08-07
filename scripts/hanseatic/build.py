#!/usr/bin/env python3
"""Compile the KAN-302 Hanseatic vertical slice into Atlas and MDX assets."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO / "data" / "hanseatic" / "sources"
TRACED_DIR = REPO / "data" / "hanseatic" / "traced"
GEO_DIR = REPO / "public" / "geo"
GENERATED_DIR = REPO / "src" / "data" / "hanseatic" / "generated"

PLACES_CSV = SOURCE_DIR / "places.csv"
ROUTES_CSV = SOURCE_DIR / "routes.csv"
SOURCES_CSV = SOURCE_DIR / "sources.csv"
EVIDENCE_CSV = SOURCE_DIR / "evidence.csv"
TERMINOLOGY_CSV = SOURCE_DIR / "terminology.csv"
CORPUS_CSV = SOURCE_DIR / "corpus.csv"
CHRONOLOGY_CSV = SOURCE_DIR / "chronology.csv"
KONTORE_CSV = SOURCE_DIR / "kontore.csv"
ROUTE_PATHS = TRACED_DIR / "routes-paths.geojson"

TEMPORAL_EXCEPTIONS_CSV = SOURCE_DIR / "temporal-exceptions.csv"

PLACES_GEOJSON = GEO_DIR / "hanseatic-places.geojson"
ROUTES_GEOJSON = GEO_DIR / "hanseatic-routes.geojson"
PLACES_FGB = GEO_DIR / "hanseatic-places.fgb"
PLACES_JSON = GENERATED_DIR / "places.json"
KONTORE_JSON = GENERATED_DIR / "kontore.json"
MANIFEST_JSON = GENERATED_DIR / "manifest.json"

# Bumped when the shape of a compiled output changes in a way a consumer
# would have to care about. Recorded in the manifest so a downstream reader
# can refuse a payload it does not understand.
SCHEMA_VERSION = 1

# The HSE world, generously bounded: Atlantic approaches to Novgorod, the
# Alps to the top of the Gulf of Bothnia. A point outside this is a
# transposed or mistyped coordinate, not a Hanseatic place.
HSE_BBOX = (-12.0, 44.0, 40.0, 66.0)  # min_lon, min_lat, max_lon, max_lat

PLACE_HEADER = [
    "id", "place_id", "name", "name_historic", "name_modern", "role",
    "participation_class", "valid_from", "valid_to", "region", "parent_polity",
    "certainty", "latitude", "longitude", "essay_anchor", "source", "notes",
]
ROUTE_HEADER = [
    "id", "name", "corridor_type", "from_place_id", "to_place_id", "waypoints",
    "valid_from", "valid_to", "directionality", "seasonality", "evidence_type",
    "certainty", "commodities", "source", "notes",
]
SOURCE_HEADER = [
    "key", "short_citation", "full_citation", "url", "license", "accessed", "source_type",
]
EVIDENCE_HEADER = [
    "claim_id", "feature_id", "source_key", "page_or_folio", "locator_type",
    "importance", "quote_or_note", "confidence", "review_status",
]
TERMINOLOGY_HEADER = [
    "term", "category", "status", "definition", "use_instead_of", "notes",
]
CORPUS_HEADER = [
    "key", "title", "object_type", "date_made", "repository", "repository_id",
    "stable_url", "iiif_manifest", "resolution", "rights_statement", "attribution",
    "provenance_class", "corpus_role", "essay_section", "dependency_risk",
    "verification_status", "verified_on", "notes",
]
CHRONOLOGY_HEADER = [
    "id", "event", "category", "date_type", "year_from", "year_to",
    "certainty_term", "claim_id", "editorial_decision", "review_status", "notes",
]
TEMPORAL_EXCEPTIONS_HEADER = [
    "subject_id", "kind", "decision", "logged_in",
]
KONTORE_HEADER = [
    "id", "kontor_id", "name", "host_settlement", "place_id", "legal_status",
    "valid_from", "valid_to", "status_phase", "spatial_setting", "regulations",
    "commodities", "primary_witness", "profile_summary", "certainty_term",
    "review_status", "source", "notes",
]

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ROLES = {"leading_city", "market"}
CORRIDOR_TYPES = {"maritime", "riverine", "overland", "mixed"}
CERTAINTIES = {"high", "medium", "low"}
REVIEW_STATUSES = {"provisional", "reviewed", "approved"}

# `pending` marks a field that research has not yet established. It is only
# tolerated while the row is still provisional/unverified; the promotion rules
# below refuse to let a pending field reach a reviewed or published state.
PENDING = "pending"
# `not_published` is a finding, where `pending` is an absence of one: the
# repository was checked and states no figure. Only resolution accepts it -
# a repository that cannot tell you its own identifier or rights has not
# really been checked.
NOT_PUBLISHED = "not_published"
OBJECT_TYPES = {
    "printed_map", "manuscript_map", "city_view", "charter", "documentary",
    "printed_book",
}
PROVENANCE_CLASSES = {"repository", "aggregator", "dealer", PENDING}
CORPUS_ROLES = {"hero", "fallback", "section_witness", "reference_only"}
OPEN_RIGHTS = {"public_domain", "cc0", "cc_by", "cc_by_sa"}
# Restrictive Creative Commons terms are recorded exactly, not flattened into
# `in_copyright`: a register that cannot say *which* restriction applies cannot
# tell you what it would take to clear it. They are deliberately outside
# OPEN_RIGHTS, so a non-commercial reproduction can never become a published
# witness - which is the same line the dealer rule draws.
RESTRICTED_RIGHTS = {"cc_by_nc", "cc_by_nc_sa", "cc_by_nc_nd", "cc_by_nd"}
RIGHTS_STATEMENTS = (
    OPEN_RIGHTS | RESTRICTED_RIGHTS | {"in_copyright", "rights_unknown", PENDING}
)
DEPENDENCY_RISKS = {"p0", "p1", "p2", "none"}
VERIFICATION_STATUSES = {"unverified", "verified"}
LOCATOR_TYPES = {"page", "folio", "section", "none"}
IMPORTANCES = {"high", "medium", "low"}
DATE_TYPES = {"year", "year_range", "circa", "disputed", "open"}
CHRONOLOGY_CATEGORIES = {
    "institution", "privilege", "conflict", "decline", "terminus",
}
# A source that is the project's own planning document can never stand as
# historical evidence for an approved claim (KAN-304).
NON_EVIDENTIARY_SOURCE_TYPES = {"project_specification"}
# KAN-303: the register must reach this many verified witnesses before release.
REQUIRED_WITNESSES = 8


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def year(value: str, label: str, row: int, errors: list[str]) -> int | None:
    try:
        parsed = int(value)
    except ValueError:
        errors.append(f"{label} row {row}: '{value}' is not an integer year")
        return None
    if not 1 <= parsed <= 9999:
        errors.append(f"{label} row {row}: year {parsed} is outside 1..9999")
    return parsed


def coordinate(
    value: str, label: str, row: int, minimum: float, maximum: float, errors: list[str]
) -> float | None:
    try:
        parsed = float(value)
    except ValueError:
        errors.append(f"places row {row}: {label} '{value}' is not numeric")
        return None
    if not minimum <= parsed <= maximum:
        errors.append(f"places row {row}: {label} {parsed} outside [{minimum}, {maximum}]")
    return parsed


def load_terminology(errors: list[str]) -> tuple[dict[str, set[str]], dict[str, str]]:
    """Return approved terms per category and a deprecated -> replacement map."""
    header, rows = read_csv(TERMINOLOGY_CSV)
    if header != TERMINOLOGY_HEADER:
        errors.append(f"terminology.csv header {header} != {TERMINOLOGY_HEADER}")
        return {}, {}

    approved: dict[str, set[str]] = {}
    deprecated: dict[str, str] = {}
    seen: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        term = row["term"].strip()
        category = row["category"].strip()
        status = row["status"].strip()
        if term in seen:
            errors.append(f"terminology row {row_number}: duplicate term '{term}'")
        seen.add(term)
        if not row["definition"].strip():
            errors.append(f"terminology row {row_number}: '{term}' has no definition")
        if status == "approved":
            approved.setdefault(category, set()).add(term)
        elif status == "deprecated":
            replacement = row["use_instead_of"].strip()
            if not replacement:
                errors.append(
                    f"terminology row {row_number}: deprecated '{term}' names no replacement"
                )
            deprecated[term] = replacement
        else:
            errors.append(f"terminology row {row_number}: unknown status '{status}'")
    return approved, deprecated


def check_term(
    value: str,
    category: str,
    approved: dict[str, set[str]],
    deprecated: dict[str, str],
    label: str,
    row: int,
    errors: list[str],
) -> None:
    """Reject unknown terms, and reject deprecated ones by name."""
    if value in deprecated:
        errors.append(
            f"{label} row {row}: '{value}' is deprecated vocabulary; "
            f"use '{deprecated[value]}' (see terminology.csv)"
        )
        return
    if value not in approved.get(category, set()):
        errors.append(f"{label} row {row}: '{value}' is not an approved {category} term")


def load_temporal_exceptions(errors: list[str]) -> dict[str, dict[str, str]]:
    """Accepted route/place temporal mismatches, keyed by subject id (KAN-309)."""
    header, rows = read_csv(TEMPORAL_EXCEPTIONS_CSV)
    if header != TEMPORAL_EXCEPTIONS_HEADER:
        errors.append(
            f"temporal-exceptions.csv header {header} != {TEMPORAL_EXCEPTIONS_HEADER}"
        )
        return {}
    accepted: dict[str, dict[str, str]] = {}
    for row_number, row in enumerate(rows, start=2):
        for field in TEMPORAL_EXCEPTIONS_HEADER:
            if not row[field].strip():
                errors.append(
                    f"temporal-exceptions row {row_number}: required field '{field}' is empty"
                )
        # An exception is only a decision if it says why and where it was logged.
        if len(row["decision"].strip()) < 40:
            errors.append(
                f"temporal-exceptions row {row_number}: decision is too short to be a "
                "logged reason; state why the mismatch is accepted"
            )
        if not row["logged_in"].strip().startswith("docs/"):
            errors.append(
                f"temporal-exceptions row {row_number}: logged_in must point at a "
                "decisions document under docs/"
            )
        accepted[row["subject_id"].strip()] = row
    return accepted


def validate_route_temporality(
    routes: list[dict[str, str]],
    place_spans: dict[str, list[tuple[int, int]]],
    accepted: dict[str, dict[str, str]],
    errors: list[str],
) -> set[str]:
    """A corridor may not run outside the phases of the places it connects.

    KAN-309 allows the mismatch, but only as a recorded decision: an
    undocumented one is a data error, and a documented one that has since been
    fixed is stale bookkeeping. Both fail.
    """
    used: set[str] = set()
    for row_number, row in enumerate(routes, start=2):
        route_id = row["id"].strip()
        try:
            valid_from = int(row["valid_from"])
            valid_to = int(row["valid_to"])
        except ValueError:
            continue  # already reported by the year check
        outside: list[str] = []
        for endpoint in (row["from_place_id"].strip(), row["to_place_id"].strip()):
            spans = place_spans.get(endpoint)
            if not spans:
                continue
            covered_from = min(start for start, _ in spans)
            covered_to = max(end for _, end in spans)
            if valid_from < covered_from or valid_to > covered_to:
                outside.append(
                    f"{endpoint} is recorded {covered_from}-{covered_to}"
                )
        if outside:
            if route_id in accepted:
                used.add(route_id)
            else:
                errors.append(
                    f"routes row {row_number}: '{route_id}' runs {valid_from}-{valid_to}, "
                    f"outside its endpoints ({'; '.join(outside)}). Either correct the "
                    "dates or log the exception in temporal-exceptions.csv"
                )
    for subject_id in accepted:
        if subject_id not in used:
            errors.append(
                f"temporal-exceptions: '{subject_id}' no longer has a temporal mismatch; "
                "remove the stale exception"
            )
    return used


def validate_corpus(rows: list[dict[str, str]], errors: list[str]) -> None:
    keys: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        for field in CORPUS_HEADER:
            if not row[field].strip():
                errors.append(f"corpus row {row_number}: required field '{field}' is empty")
        key = row["key"].strip()
        if not SLUG.fullmatch(key):
            errors.append(f"corpus row {row_number}: key '{key}' is not slug-shaped")
        if key in keys:
            errors.append(f"corpus row {row_number}: duplicate key '{key}'")
        keys.add(key)

        object_type = row["object_type"].strip()
        if object_type != PENDING and object_type not in OBJECT_TYPES:
            errors.append(f"corpus row {row_number}: unknown object_type '{object_type}'")
        if row["provenance_class"] not in PROVENANCE_CLASSES:
            errors.append(
                f"corpus row {row_number}: unknown provenance_class '{row['provenance_class']}'"
            )
        if row["corpus_role"] not in CORPUS_ROLES:
            errors.append(f"corpus row {row_number}: unknown corpus_role '{row['corpus_role']}'")
        if row["rights_statement"] not in RIGHTS_STATEMENTS:
            errors.append(
                f"corpus row {row_number}: unknown rights_statement '{row['rights_statement']}'"
            )
        if row["dependency_risk"] not in DEPENDENCY_RISKS:
            errors.append(
                f"corpus row {row_number}: unknown dependency_risk '{row['dependency_risk']}'"
            )
        verification = row["verification_status"].strip()
        if verification not in VERIFICATION_STATUSES:
            errors.append(
                f"corpus row {row_number}: unknown verification_status '{verification}'"
            )

        # KAN-303: a dealer listing may be consulted but never stand as a final source.
        if row["provenance_class"] == "dealer" and row["corpus_role"] != "reference_only":
            errors.append(
                f"corpus row {row_number}: dealer provenance may only be corpus_role "
                "'reference_only', never a published witness"
            )

        # Promotion rule: 'verified' is a claim about real provenance, so every
        # field that provenance depends on must actually be filled in.
        if verification == "verified":
            # `resolution` may be `not_published`: plenty of repositories serve a
            # tiled master and state no pixel figure, and refusing those would
            # exclude real, fully provenanced witnesses over a number nobody has.
            # It may still not be `pending`, which would mean nobody looked.
            for field in (
                "repository", "repository_id", "stable_url", "resolution",
                "attribution", "verified_on", "date_made",
            ):
                value = row[field].strip()
                if field == "resolution" and value == NOT_PUBLISHED:
                    continue
                if value == PENDING:
                    errors.append(
                        f"corpus row {row_number}: verified witness still has "
                        f"'{field}' pending"
                    )
                elif value == NOT_PUBLISHED:
                    errors.append(
                        f"corpus row {row_number}: '{field}' cannot be {NOT_PUBLISHED}; "
                        "only resolution may be, since a repository that states no "
                        "identifier, URL or attribution has not really been checked"
                    )
            if row["provenance_class"] == PENDING:
                errors.append(
                    f"corpus row {row_number}: verified witness has no provenance_class"
                )
            if row["rights_statement"] not in OPEN_RIGHTS:
                errors.append(
                    f"corpus row {row_number}: verified witness needs a cleared rights "
                    f"statement, found '{row['rights_statement']}'"
                )


def validate_chronology(
    rows: list[dict[str, str]],
    claim_ids: set[str],
    approved: dict[str, set[str]],
    deprecated: dict[str, str],
    errors: list[str],
) -> None:
    ids: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        for field in CHRONOLOGY_HEADER:
            if not row[field].strip():
                errors.append(f"chronology row {row_number}: required field '{field}' is empty")
        event_id = row["id"].strip()
        if not SLUG.fullmatch(event_id):
            errors.append(f"chronology row {row_number}: id '{event_id}' is not slug-shaped")
        if event_id in ids:
            errors.append(f"chronology row {row_number}: duplicate id '{event_id}'")
        ids.add(event_id)

        if row["category"] not in CHRONOLOGY_CATEGORIES:
            errors.append(f"chronology row {row_number}: unknown category '{row['category']}'")
        date_type = row["date_type"].strip()
        if date_type not in DATE_TYPES:
            errors.append(f"chronology row {row_number}: unknown date_type '{date_type}'")
        review_status = row["review_status"].strip()
        if review_status not in REVIEW_STATUSES:
            errors.append(
                f"chronology row {row_number}: unknown review_status '{review_status}'"
            )
        check_term(
            row["certainty_term"], "uncertainty", approved, deprecated,
            "chronology", row_number, errors,
        )

        year_from = row["year_from"].strip()
        year_to = row["year_to"].strip()
        open_years = year_from == PENDING and year_to == PENDING
        if open_years:
            # An undated row is only honest while it is still open and provisional.
            if date_type not in {"open", "disputed"}:
                errors.append(
                    f"chronology row {row_number}: date_type '{date_type}' requires years"
                )
            if review_status != "provisional":
                errors.append(
                    f"chronology row {row_number}: cannot leave years pending once reviewed"
                )
        elif year_from == PENDING or year_to == PENDING:
            errors.append(
                f"chronology row {row_number}: year_from and year_to must both be set or both pending"
            )
        else:
            parsed_from = year(year_from, "chronology", row_number, errors)
            parsed_to = year(year_to, "chronology", row_number, errors)
            if parsed_from is not None and parsed_to is not None and parsed_from > parsed_to:
                errors.append(f"chronology row {row_number}: year_from exceeds year_to")

        # A disputed date is only logged if the disagreement is actually written down.
        if date_type == "disputed" and row["editorial_decision"].strip() in {"", PENDING}:
            errors.append(
                f"chronology row {row_number}: disputed date needs an editorial_decision"
            )

        claim = row["claim_id"].strip()
        if claim == PENDING:
            if review_status != "provisional":
                errors.append(
                    f"chronology row {row_number}: reviewed event must cite a claim_id"
                )
        elif claim not in claim_ids:
            errors.append(f"chronology row {row_number}: unresolved claim_id '{claim}'")


def validate_kontore(
    rows: list[dict[str, str]],
    place_ids: set[str],
    corpus_keys: set[str],
    source_keys: set[str],
    approved: dict[str, set[str]],
    deprecated: dict[str, str],
    errors: list[str],
) -> None:
    ids: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        for field in KONTORE_HEADER:
            if not row[field].strip():
                errors.append(f"kontore row {row_number}: required field '{field}' is empty")
        kontor_row_id = row["id"].strip()
        if not SLUG.fullmatch(kontor_row_id):
            errors.append(f"kontore row {row_number}: id '{kontor_row_id}' is not slug-shaped")
        if kontor_row_id in ids:
            errors.append(f"kontore row {row_number}: duplicate id '{kontor_row_id}'")
        ids.add(kontor_row_id)

        # KAN-305: 'colony' is deprecated here, so this rejects it by name.
        check_term(
            row["legal_status"], "association", approved, deprecated,
            "kontore", row_number, errors,
        )
        check_term(
            row["certainty_term"], "uncertainty", approved, deprecated,
            "kontore", row_number, errors,
        )
        review_status = row["review_status"].strip()
        if review_status not in REVIEW_STATUSES:
            errors.append(f"kontore row {row_number}: unknown review_status '{review_status}'")
        if row["source"] not in source_keys:
            errors.append(f"kontore row {row_number}: unresolved source '{row['source']}'")

        witness = row["primary_witness"].strip()
        if witness != PENDING and witness not in corpus_keys:
            errors.append(
                f"kontore row {row_number}: primary_witness '{witness}' is not in corpus.csv"
            )

        place_id = row["place_id"].strip()
        if place_id != PENDING and place_id not in place_ids:
            errors.append(
                f"kontore row {row_number}: place_id '{place_id}' is not in places.csv"
            )

        if review_status != "provisional":
            # Everything the KontorProfile renders has to be real before publication.
            for field in (
                "place_id", "valid_from", "valid_to", "status_phase", "spatial_setting",
                "regulations", "commodities", "primary_witness", "profile_summary",
            ):
                if row[field].strip() == PENDING:
                    errors.append(
                        f"kontore row {row_number}: reviewed Kontor still has "
                        f"'{field}' pending"
                    )


def readiness(
    corpus: list[dict[str, str]],
    chronology: list[dict[str, str]],
    kontore: list[dict[str, str]],
    evidence: list[dict[str, str]],
) -> list[str]:
    """Report acceptance-criteria progress for KAN-303/304/305.

    These are not build errors. The tables are expected to sit unfinished while
    research proceeds; this exists so nobody has to guess how far along it is.
    """
    lines: list[str] = []

    verified = [row for row in corpus if row["verification_status"].strip() == "verified"]
    cleared = [row for row in verified if row["rights_statement"] in OPEN_RIGHTS]
    heroes = [row for row in cleared if row["corpus_role"] == "hero"]
    fallbacks = [row for row in cleared if row["corpus_role"] == "fallback"]
    open_p0 = [
        row for row in corpus
        if row["dependency_risk"] == "p0" and row["verification_status"].strip() != "verified"
    ]
    lines.append(
        f"KAN-303 corpus: {len(cleared)}/{REQUIRED_WITNESSES} rights-cleared witnesses, "
        f"{len(heroes)} hero + {len(fallbacks)}/2 fallbacks, {len(open_p0)} unresolved P0"
    )

    sourced = [
        row for row in evidence
        if row["importance"].strip() == "high"
        and row["locator_type"].strip() in {"page", "folio"}
    ]
    high = [row for row in evidence if row["importance"].strip() == "high"]
    undated = [row for row in chronology if row["year_from"].strip() == PENDING]
    lines.append(
        f"KAN-304 chronology: {len(sourced)}/{len(high)} high-importance claims have a "
        f"page-level locator, {len(undated)}/{len(chronology)} events still open"
    )

    with_witness = [row for row in kontore if row["primary_witness"].strip() != PENDING]
    profiled = [row for row in kontore if row["profile_summary"].strip() != PENDING]
    lines.append(
        f"KAN-305 Kontore: {len(with_witness)}/{len(kontore)} have a witness identified, "
        f"{len(profiled)}/{len(kontore)} have a written profile"
    )
    return lines


def validate_inputs() -> list[str]:
    place_header, places = read_csv(PLACES_CSV)
    route_header, routes = read_csv(ROUTES_CSV)
    source_header, sources = read_csv(SOURCES_CSV)
    evidence_header, evidence = read_csv(EVIDENCE_CSV)
    corpus_header, corpus = read_csv(CORPUS_CSV)
    chronology_header, chronology = read_csv(CHRONOLOGY_CSV)
    kontore_header, kontore = read_csv(KONTORE_CSV)
    errors: list[str] = []

    for label, actual, expected in (
        ("places", place_header, PLACE_HEADER),
        ("routes", route_header, ROUTE_HEADER),
        ("sources", source_header, SOURCE_HEADER),
        ("evidence", evidence_header, EVIDENCE_HEADER),
        ("corpus", corpus_header, CORPUS_HEADER),
        ("chronology", chronology_header, CHRONOLOGY_HEADER),
        ("kontore", kontore_header, KONTORE_HEADER),
    ):
        if actual != expected:
            errors.append(f"{label}.csv header {actual} != {expected}")

    approved_terms, deprecated_terms = load_terminology(errors)
    source_keys = {row["key"].strip() for row in sources}
    source_types = {row["key"].strip(): row["source_type"].strip() for row in sources}
    feature_ids: set[str] = set()
    place_ids: set[str] = set()
    phase_keys: set[tuple[str, int]] = set()
    place_spans: dict[str, list[tuple[int, int, int]]] = {}

    for row_number, row in enumerate(places, start=2):
        for field in PLACE_HEADER:
            if not row[field].strip():
                errors.append(f"places row {row_number}: required field '{field}' is empty")
        feature_id = row["id"].strip()
        place_id = row["place_id"].strip()
        if not SLUG.fullmatch(feature_id):
            errors.append(f"places row {row_number}: id '{feature_id}' is not stable-id shaped")
        if not SLUG.fullmatch(place_id):
            errors.append(f"places row {row_number}: place_id '{place_id}' is not slug-shaped")
        if feature_id in feature_ids:
            errors.append(f"places row {row_number}: duplicate feature id '{feature_id}'")
        feature_ids.add(feature_id)
        place_ids.add(place_id)
        valid_from = year(row["valid_from"], "places", row_number, errors)
        valid_to = year(row["valid_to"], "places", row_number, errors)
        if valid_from is not None and valid_to is not None:
            if valid_from > valid_to:
                errors.append(f"places row {row_number}: valid_from exceeds valid_to")
            phase_key = (place_id, valid_from)
            if phase_key in phase_keys:
                errors.append(f"places row {row_number}: duplicate phase {phase_key}")
            phase_keys.add(phase_key)
            # Two phases of one place may abut but never overlap: a place holds
            # exactly one role at a time, so an overlap is a modelling error
            # rather than a richer record.
            for other_from, other_to, other_row in place_spans.get(place_id, []):
                if valid_from <= other_to and other_from <= valid_to:
                    errors.append(
                        f"places row {row_number}: phase {valid_from}-{valid_to} overlaps "
                        f"row {other_row} ({other_from}-{other_to}) for place '{place_id}'"
                    )
            place_spans.setdefault(place_id, []).append((valid_from, valid_to, row_number))
        latitude = coordinate(row["latitude"], "latitude", row_number, -90, 90, errors)
        longitude = coordinate(row["longitude"], "longitude", row_number, -180, 180, errors)
        # EPSG:4326 degrees, inside the HSE envelope. Catches a transposed
        # lat/lon pair, which stays inside the global range and so would
        # otherwise sail through.
        if latitude is not None and longitude is not None:
            min_lon, min_lat, max_lon, max_lat = HSE_BBOX
            if not (min_lon <= longitude <= max_lon and min_lat <= latitude <= max_lat):
                errors.append(
                    f"places row {row_number}: ({longitude}, {latitude}) is outside the HSE "
                    f"bbox {HSE_BBOX}; check for a transposed longitude/latitude"
                )
        if row["role"] not in ROLES:
            errors.append(f"places row {row_number}: unknown role '{row['role']}'")
        check_term(
            row["participation_class"], "participation", approved_terms, deprecated_terms,
            "places", row_number, errors,
        )
        if row["certainty"] not in CERTAINTIES:
            errors.append(f"places row {row_number}: unknown certainty '{row['certainty']}'")
        if row["source"] not in source_keys:
            errors.append(f"places row {row_number}: unresolved source '{row['source']}'")

    with ROUTE_PATHS.open(encoding="utf-8") as handle:
        traced = json.load(handle)
    traced_features = traced.get("features", []) if traced.get("type") == "FeatureCollection" else []
    traced_by_id = {
        str(feature.get("properties", {}).get("id", "")): feature for feature in traced_features
    }

    route_ids: set[str] = set()
    for row_number, row in enumerate(routes, start=2):
        for field in ROUTE_HEADER:
            if not row[field].strip():
                errors.append(f"routes row {row_number}: required field '{field}' is empty")
        route_id = row["id"].strip()
        if not SLUG.fullmatch(route_id):
            errors.append(f"routes row {row_number}: id '{route_id}' is not stable-id shaped")
        if route_id in route_ids:
            errors.append(f"routes row {row_number}: duplicate id '{route_id}'")
        route_ids.add(route_id)
        if row["from_place_id"] not in place_ids or row["to_place_id"] not in place_ids:
            errors.append(f"routes row {row_number}: endpoint does not resolve to places.csv")
        waypoints = row["waypoints"].split("|")
        if waypoints != [row["from_place_id"], row["to_place_id"]]:
            errors.append(f"routes row {row_number}: vertical-slice waypoints must match endpoints")
        valid_from = year(row["valid_from"], "routes", row_number, errors)
        valid_to = year(row["valid_to"], "routes", row_number, errors)
        if valid_from is not None and valid_to is not None and valid_from > valid_to:
            errors.append(f"routes row {row_number}: valid_from exceeds valid_to")
        if row["corridor_type"] not in CORRIDOR_TYPES:
            errors.append(f"routes row {row_number}: unknown corridor_type '{row['corridor_type']}'")
        if row["certainty"] not in CERTAINTIES:
            errors.append(f"routes row {row_number}: unknown certainty '{row['certainty']}'")
        if row["source"] not in source_keys:
            errors.append(f"routes row {row_number}: unresolved source '{row['source']}'")
        feature = traced_by_id.get(route_id)
        if not feature or feature.get("geometry", {}).get("type") != "LineString":
            errors.append(f"routes row {row_number}: missing LineString trace for '{route_id}'")
        feature_ids.add(route_id)

    if set(traced_by_id) != route_ids:
        errors.append("routes-paths.geojson ids do not exactly match routes.csv")

    claim_ids: set[str] = set()
    for row_number, row in enumerate(evidence, start=2):
        for field in EVIDENCE_HEADER:
            if not row[field].strip():
                errors.append(f"evidence row {row_number}: required field '{field}' is empty")
        if row["claim_id"] in claim_ids:
            errors.append(f"evidence row {row_number}: duplicate claim_id '{row['claim_id']}'")
        claim_ids.add(row["claim_id"])
        if row["feature_id"] not in feature_ids:
            errors.append(f"evidence row {row_number}: unresolved feature '{row['feature_id']}'")
        if row["source_key"] not in source_keys:
            errors.append(f"evidence row {row_number}: unresolved source '{row['source_key']}'")
        if row["confidence"] not in CERTAINTIES:
            errors.append(f"evidence row {row_number}: unknown confidence '{row['confidence']}'")
        review_status = row["review_status"].strip()
        if review_status not in REVIEW_STATUSES:
            errors.append(f"evidence row {row_number}: unknown review_status '{review_status}'")
        locator_type = row["locator_type"].strip()
        if locator_type not in LOCATOR_TYPES:
            errors.append(f"evidence row {row_number}: unknown locator_type '{locator_type}'")
        importance = row["importance"].strip()
        if importance not in IMPORTANCES:
            errors.append(f"evidence row {row_number}: unknown importance '{importance}'")

        # KAN-304: a high-importance claim is only approvable on a page or folio.
        if review_status == "approved":
            if importance == "high" and locator_type not in {"page", "folio"}:
                errors.append(
                    f"evidence row {row_number}: high-importance claim approved on "
                    f"locator_type '{locator_type}'; a page or folio is required"
                )
            if source_types.get(row["source_key"].strip()) in NON_EVIDENTIARY_SOURCE_TYPES:
                errors.append(
                    f"evidence row {row_number}: '{row['source_key']}' is a project document "
                    "and cannot be the evidence for an approved claim"
                )

    validate_route_temporality(
        routes,
        {place: [(a, b) for a, b, _ in spans] for place, spans in place_spans.items()},
        load_temporal_exceptions(errors),
        errors,
    )

    validate_corpus(corpus, errors)
    corpus_keys = {row["key"].strip() for row in corpus}
    validate_chronology(chronology, claim_ids, approved_terms, deprecated_terms, errors)
    validate_kontore(
        kontore, place_ids, corpus_keys, source_keys, approved_terms, deprecated_terms, errors,
    )

    if len(places) != 2 or len(routes) != 1:
        errors.append("KAN-302 contract expects exactly 2 place phases and 1 corridor")
    return errors


def place_properties(row: dict[str, str]) -> dict[str, object]:
    return {
        **{key: row[key] for key in PLACE_HEADER if key not in {"latitude", "longitude"}},
        "valid_from": int(row["valid_from"]),
        "valid_to": int(row["valid_to"]),
        "coordinates": [float(row["longitude"]), float(row["latitude"])],
    }


def route_properties(row: dict[str, str]) -> dict[str, object]:
    return {
        **{key: row[key] for key in ROUTE_HEADER},
        "route_id": row["id"],
        "valid_from": int(row["valid_from"]),
        "valid_to": int(row["valid_to"]),
    }


def build_outputs() -> dict[Path, str]:
    _, places = read_csv(PLACES_CSV)
    _, routes = read_csv(ROUTES_CSV)
    with ROUTE_PATHS.open(encoding="utf-8") as handle:
        traced = json.load(handle)
    traced_by_id = {
        feature["properties"]["id"]: feature for feature in traced["features"]
    }

    compiled_places = [place_properties(row) for row in places]
    place_features = [
        {
            "type": "Feature",
            "properties": properties,
            "geometry": {"type": "Point", "coordinates": properties["coordinates"]},
        }
        for properties in compiled_places
    ]
    route_features = []
    for row in routes:
        trace = traced_by_id[row["id"]]
        route_features.append(
            {
                "type": "Feature",
                "properties": route_properties(row),
                "geometry": trace["geometry"],
            }
        )

    _, kontore = read_csv(KONTORE_CSV)
    compiled_kontore = [{key: row[key] for key in KONTORE_HEADER} for row in kontore]

    return {
        PLACES_GEOJSON: json_text({"type": "FeatureCollection", "features": place_features}),
        ROUTES_GEOJSON: json_text({"type": "FeatureCollection", "features": route_features}),
        PLACES_JSON: json_text(compiled_places),
        KONTORE_JSON: json_text(compiled_kontore),
    }


SOURCE_FILES = [
    PLACES_CSV, ROUTES_CSV, SOURCES_CSV, EVIDENCE_CSV, TERMINOLOGY_CSV,
    CORPUS_CSV, CHRONOLOGY_CSV, KONTORE_CSV, TEMPORAL_EXCEPTIONS_CSV, ROUTE_PATHS,
]


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def write_places_fgb(compiled_places: list[dict[str, object]]) -> None:
    """Write the FlatGeobuf twin of the places layer (KAN-307).

    pyogrio is imported here rather than at module scope so validate.py, the
    test harness and every stdlib-only path keep working without GDAL. Only a
    build needs it.

    GDAL embeds the layer name, which it derives from the output filename, so
    the bytes are reproducible only for a fixed path - which is what we use.
    """
    try:
        import numpy as np
        from pyogrio.raw import write
    except ImportError as exc:  # pragma: no cover - environment-dependent
        raise SystemExit(
            f"FlatGeobuf output needs pyogrio and numpy ({exc}). "
            "Run `make vmn-venv` and build with the venv python."
        ) from exc

    geometry = np.empty(len(compiled_places), dtype=object)
    for index, place in enumerate(compiled_places):
        longitude, latitude = place["coordinates"]  # type: ignore[misc]
        # WKB point, little-endian, as VMN writes them: no shapely needed.
        geometry[index] = struct.pack("<BIdd", 1, 1, float(longitude), float(latitude))

    text_fields = [
        "id", "place_id", "name", "name_historic", "name_modern", "role",
        "participation_class", "region", "parent_polity", "certainty",
        "essay_anchor", "source", "notes",
    ]
    fields = [*text_fields, "valid_from", "valid_to"]
    field_data = [
        *(np.array([str(p[key]) for p in compiled_places], dtype=object) for key in text_fields),
        np.array([int(p["valid_from"]) for p in compiled_places], dtype="int64"),  # type: ignore[arg-type]
        np.array([int(p["valid_to"]) for p in compiled_places], dtype="int64"),  # type: ignore[arg-type]
    ]

    PLACES_FGB.parent.mkdir(parents=True, exist_ok=True)
    if PLACES_FGB.exists():
        PLACES_FGB.unlink()
    write(
        str(PLACES_FGB),
        geometry=geometry,
        field_data=field_data,
        fields=fields,
        field_mask=None,
        geometry_type="Point",
        crs="EPSG:4326",
        driver="FlatGeobuf",
    )


def feature_count(path: Path, payload: bytes) -> int:
    """Features in a compiled output, for the manifest."""
    if path == PLACES_FGB:
        return len(read_csv(PLACES_CSV)[1])
    data = json.loads(payload.decode("utf-8"))
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        return len(data["features"])
    return len(data)


def manifest_payload() -> dict[str, object]:
    """Content-addressed record of what this build consumed and produced.

    Deliberately timestamp-free: identical inputs must produce an identical
    manifest, so the only thing that can move a hash is the data itself.
    Input hashes are what let validate.py detect a stale output tree without
    needing GDAL to re-read the FlatGeobuf.
    """
    inputs = {
        str(path.relative_to(REPO)): sha256_bytes(path.read_bytes())
        for path in sorted(SOURCE_FILES)
    }
    outputs: dict[str, object] = {}
    for path in sorted([*build_outputs(), PLACES_FGB]):
        payload = path.read_bytes()
        digest = sha256_bytes(payload)
        outputs[str(path.relative_to(REPO))] = {
            "bytes": len(payload),
            "featureCount": feature_count(path, payload),
            "sha256": digest,
            "version": digest[:12],
        }
    release = sha256_bytes(
        "\n".join(f"{name}:{entry['sha256']}" for name, entry in outputs.items()).encode()  # type: ignore[index]
    )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "release": f"hse-{release[:16]}",
        "generatedBy": "scripts/hanseatic/build.py",
        "inputs": inputs,
        "outputs": outputs,
    }


def readiness_lines() -> list[str]:
    _, corpus = read_csv(CORPUS_CSV)
    _, chronology = read_csv(CHRONOLOGY_CSV)
    _, kontore = read_csv(KONTORE_CSV)
    _, evidence = read_csv(EVIDENCE_CSV)
    return readiness(corpus, chronology, kontore, evidence)


def main() -> int:
    errors = validate_inputs()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    outputs = build_outputs()
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path.relative_to(REPO)}")

    _, places = read_csv(PLACES_CSV)
    write_places_fgb([place_properties(row) for row in places])
    print(f"Wrote {PLACES_FGB.relative_to(REPO)}")

    # Written last: it hashes everything above, including itself's siblings.
    MANIFEST_JSON.write_text(json_text(manifest_payload()), encoding="utf-8")
    print(f"Wrote {MANIFEST_JSON.relative_to(REPO)}")

    for line in readiness_lines():
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
