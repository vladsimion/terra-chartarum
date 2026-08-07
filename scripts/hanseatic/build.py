#!/usr/bin/env python3
"""Compile the KAN-302 Hanseatic vertical slice into Atlas and MDX assets."""

from __future__ import annotations

import csv
import json
import re
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

PLACES_GEOJSON = GEO_DIR / "hanseatic-places.geojson"
ROUTES_GEOJSON = GEO_DIR / "hanseatic-routes.geojson"
PLACES_JSON = GENERATED_DIR / "places.json"
KONTORE_JSON = GENERATED_DIR / "kontore.json"

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
OBJECT_TYPES = {
    "printed_map", "manuscript_map", "city_view", "charter", "documentary",
    "printed_book",
}
PROVENANCE_CLASSES = {"repository", "aggregator", "dealer", PENDING}
CORPUS_ROLES = {"hero", "fallback", "section_witness", "reference_only"}
OPEN_RIGHTS = {"public_domain", "cc0", "cc_by", "cc_by_sa"}
RIGHTS_STATEMENTS = OPEN_RIGHTS | {"in_copyright", "rights_unknown", PENDING}
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
            for field in (
                "repository", "repository_id", "stable_url", "resolution",
                "attribution", "verified_on", "date_made",
            ):
                if row[field].strip() == PENDING:
                    errors.append(
                        f"corpus row {row_number}: verified witness still has "
                        f"'{field}' pending"
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
        coordinate(row["latitude"], "latitude", row_number, -90, 90, errors)
        coordinate(row["longitude"], "longitude", row_number, -180, 180, errors)
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
    for path, content in build_outputs().items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path.relative_to(REPO)}")
    for line in readiness_lines():
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
