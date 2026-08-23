#!/usr/bin/env python3
"""Antarctic knowledge programme QA (KAN-420 to KAN-423).

TERRA INCOGNITA is an argument about what maps claim when the evidence is
absent, indirect or mobile. That makes the honesty of this dataset the subject
matter rather than housekeeping, so the rules below are written to keep four
gaps open rather than to let them close quietly:

* knowing an object exists is not having seen it (`verification_state`);
* being able to name a source is not having read the page (`source_locator`);
* a position recorded by a navigator is not a position we may draw
  (`geometry_provenance`);
* a feature later removed from the charts is not merely an error
  (`ghost-geographies.csv` keeps the original claim beside the disproof).

Run with `npm run antarctica:validate`; it also runs inside `npm run build`.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data" / "antarctica"
RELEASE = DATA / "release" / "ant-pilot-0.1"

PENDING = "pending"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
WKT = re.compile(r"^(POINT|LINESTRING|POLYGON) \(")

# --- Frozen vocabularies (spec sections 4.2 to 4.4) -------------------------
# These are the contract. Extending one is an editorial decision recorded in the
# data dictionary, never a per-row convenience.

ACTS = {
    "act_i", "act_ii", "act_iii", "act_iv", "act_v", "act_vi", "act_vii", "act_viii",
    "coda", "cross_cutting",
}
CLAIM_FAMILIES = {
    "terra_australis_theory", "source_inheritance", "coronelli", "cook_absence",
    "discovery_priority", "ghost_geography", "nineteenth_century_survey",
    "cumulative_synthesis", "endurance_navigation", "coordinate_uncertainty", "methodology",
}
EVIDENCE_CLASSES = {
    "conjectured",
    "inherited_cartography",
    "reported_not_observed",
    "direct_observation",
    "instrumental_fix",
    "dead_reckoning",
    "scholarly_reconstruction",
    "editorial_interpolation",
    "later_confirmation",
    "later_disproof",
}
# Where a line or polygon came from. `not_spatial` is a first-class answer: a
# record may exist without geometry, and that is better than a drawn guess.
GEOMETRY_PROVENANCE = {
    "digitised_from_map",
    "transcribed_from_coordinates",
    "derived_from_log",
    "modern_reference_dataset",
    "scholarly_reconstruction",
    "editorial_interpolation",
    "editorial_generalisation",
    "not_spatial",
}
# Provenances that are our drawing rather than a historical record. Nothing here
# may claim to be well evidenced, however plausible the line looks.
OUR_OWN_LINEWORK = {"editorial_interpolation", "editorial_generalisation"}
CONFIDENCE = {"high", "medium", "low", "contested", "unresolved"}
WEAK_CONFIDENCE = {"low", "contested", "unresolved"}
REVIEW_STATES = {"raw", "normalized", "reviewed", "approved", "published"}
# A row only reaches the public tier once a person has cleared it.
PUBLIC_STATES = {"approved", "published"}
LATER_STATUS = {"confirmed", "modified", "disproved", "unresolved", "not_applicable"}
CLAIM_TYPES = {"fact", "interpretation", "historiographical_dispute", "reconstruction"}
RIGHTS = {
    "public_domain_text",
    "public_domain_work",
    "no_known_restrictions",
    "rights_review_required",
    "permission_required",
    "in_copyright",
    "rights_unknown",
    "not_applicable",
}
OPEN_RIGHTS = {"public_domain_text", "public_domain_work", "no_known_restrictions"}
VERIFICATION = {"unverified", "partially_verified", "verified"}
AUDIT_REVIEW = {"candidate", "source_checked", "reviewed"}
REPRODUCTION_USE = {"undetermined", "research_only", "thumbnail", "full_reproduction", "deepzoom"}
PUBLISHABLE_USE = {"thumbnail", "full_reproduction", "deepzoom"}
GAP_KINDS = {
    "object_identity", "rights", "locator", "edition_state", "translation",
    "retrieval_failure", "scholarly_authority",
}

# The specification requires a dedicated source cluster for each of these.
REQUIRED_CLUSTERS = {"coronelli", "cook_absence", "discovery_priority", "cumulative_synthesis",
                     "endurance_navigation"}
# The pilot must prove the schema across the whole argument, not one corner of it.
REQUIRED_PILOT_ACTS = {"act_i", "act_iii", "act_iv", "act_v", "act_vi", "act_vii", "act_viii"}

DEALER_HOSTS = ("ebay.", "abebooks.", "invaluable.", "liveauctioneers.", "arader")


def read(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(encoding="utf-8", newline="") as handle:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(handle)]


def pipe(value: str) -> list[str]:
    return [part for part in (piece.strip() for piece in value.split("|")) if part]


def check_ids(errors: list[str], rows: list[dict[str, str]], table: str, key: str, prefix: str) -> set[str]:
    seen: set[str] = set()
    for row in rows:
        value = row[key]
        label = f"{table}[{value}]"
        if not value.startswith(prefix) or not SLUG.match(value):
            errors.append(f"{label}: {key} must be a {prefix} slug")
        if value in seen:
            errors.append(f"{label}: duplicate {key}")
        seen.add(value)
    return seen


def require(errors: list[str], row: dict[str, str], label: str, fields: tuple[str, ...]) -> None:
    for field in fields:
        if not row[field]:
            errors.append(f"{label}: {field} is required")


def in_vocab(errors: list[str], label: str, field: str, value: str, vocab: set[str]) -> None:
    if value not in vocab:
        errors.append(f"{label}: {field} '{value}' is not in the frozen vocabulary")


def check_refs(
    errors: list[str], label: str, field: str, value: str, known: set[str], *, multi: bool = False
) -> None:
    values = pipe(value) if multi else ([value] if value else [])
    for item in values:
        if item not in known:
            errors.append(f"{label}: {field} '{item}' does not resolve")


def validate_sources(errors: list[str]) -> set[str]:
    rows = read("sources.csv")
    ids = check_ids(errors, rows, "sources", "source_id", "ant-src-")
    clusters: set[str] = set()

    for row in rows:
        label = f"sources[{row['source_id']}]"
        require(errors, row, label, ("short_title", "title", "creator", "date_label",
                                     "role_in_essay", "notes", "locator"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "claim_family", row["claim_family"], CLAIM_FAMILIES)
        in_vocab(errors, label, "rights_status", row["rights_status"], RIGHTS)
        in_vocab(errors, label, "verification_state", row["verification_state"], VERIFICATION)
        in_vocab(errors, label, "review_status", row["review_status"], AUDIT_REVIEW)
        clusters.add(row["claim_family"])

        if not row["repository_url"].startswith("https://"):
            errors.append(f"{label}: repository_url must be https")
        if not row["rights_basis_url"].startswith("https://"):
            errors.append(f"{label}: rights_basis_url must be https")
        if not row["year"].lstrip("-").isdigit():
            errors.append(f"{label}: year must be a number")
        # The gap this audit exists to keep open.
        if row["verification_state"] == "verified" and row["locator"] == PENDING:
            errors.append(f"{label}: a verified source cannot leave its locator pending")
        if row["review_status"] == "reviewed" and row["verification_state"] != "verified":
            errors.append(f"{label}: a reviewed source must first be verified")
        if any(bad in row["repository_url"].lower() for bad in DEALER_HOSTS):
            errors.append(f"{label}: dealer and aggregator listings may not be a source of record")

    for cluster in sorted(REQUIRED_CLUSTERS - clusters):
        errors.append(f"sources: the specification requires a dedicated cluster for '{cluster}'")
    return ids


def validate_map_objects(errors: list[str], sources: set[str]) -> set[str]:
    rows = read("map-objects.csv")
    ids = check_ids(errors, rows, "map-objects", "map_object_id", "ant-obj-")

    for row in rows:
        label = f"map-objects[{row['map_object_id']}]"
        require(errors, row, label, ("title", "creator", "date_label", "publication_context",
                                     "edition_state", "role_in_essay", "notes"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "rights_status", row["rights_status"], RIGHTS)
        in_vocab(errors, label, "verification_state", row["verification_state"], VERIFICATION)
        in_vocab(errors, label, "review_status", row["review_status"], AUDIT_REVIEW)
        in_vocab(errors, label, "reproduction_use", row["reproduction_use"], REPRODUCTION_USE)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        if not row["repository_url"].startswith("https://"):
            errors.append(f"{label}: repository_url must be https")
        if row["persistent_id"] and not row["persistent_id"].startswith("https://"):
            errors.append(f"{label}: persistent_id must be a resolvable https identifier")
        if any(bad in row["repository_url"].lower() for bad in DEALER_HOSTS):
            errors.append(f"{label}: a dealer listing may not stand as the object's record")

        # A verified object is one whose catalogue record has been read, so it
        # owes a repository and an identifier that a reader can follow.
        if row["verification_state"] == "verified":
            require(errors, row, label, ("repository", "persistent_id", "scan_source"))

        # Rights govern reproduction, and both halves have to be true: the work
        # being old is not the scan being free.
        if row["reproduction_use"] in PUBLISHABLE_USE:
            if row["rights_status"] not in OPEN_RIGHTS:
                errors.append(f"{label}: reproduction requires rights that permit it")
            if row["verification_state"] != "verified":
                errors.append(f"{label}: an object may not be reproduced before it is verified")
            if not row["scan_source"]:
                errors.append(f"{label}: reproduction requires a named scan source")
    return ids


def validate_gaps(errors: list[str], claims: set[str]) -> int:
    rows = read("source-gaps.csv")
    check_ids(errors, rows, "source-gaps", "gap_id", "ant-gap-")
    open_gaps = 0
    for row in rows:
        label = f"source-gaps[{row['gap_id']}]"
        require(errors, row, label, ("statement", "why_it_matters", "next_action", "blocks"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "kind", row["kind"], GAP_KINDS)
        if row["status"] not in {"open", "in_progress", "closed"}:
            errors.append(f"{label}: status '{row['status']}' is not recognised")
        if row["status"] == "open":
            open_gaps += 1
        for blocked in pipe(row["blocks"]):
            if not (blocked.startswith("KAN-") or blocked in claims):
                errors.append(f"{label}: blocks '{blocked}' is neither a Jira key nor a claim")
    return open_gaps


def validate_terminology(errors: list[str], sources: set[str]) -> None:
    rows = read("terminology.csv")
    ids = check_ids(errors, rows, "terminology", "term_id", "ant-trm-")
    for row in rows:
        label = f"terminology[{row['term_id']}]"
        require(errors, row, label, ("term", "definition", "applies_to", "notes"))
        check_refs(errors, label, "source_ids", row["source_ids"], sources, multi=True)
        check_refs(errors, label, "distinguishes_from", row["distinguishes_from"], ids, multi=True)
        in_vocab(errors, label, "review_status", row["review_status"],
                 {"unreviewed", "source_checked", "reviewed"})
    # The definitional core of the priority discussion. If any of these is
    # missing, Act V has no way to say which question it is answering.
    required = {"ant-trm-first-sighting", "ant-trm-first-mainland-sighting",
                "ant-trm-ice-shelf-observation", "ant-trm-first-landing"}
    for missing in sorted(required - ids):
        errors.append(f"terminology: the discovery vocabulary is missing '{missing}'")


def validate_claims(errors: list[str], sources: set[str], objects: set[str]) -> tuple[set[str], set[str]]:
    rows = read("claims.csv")
    ids = check_ids(errors, rows, "claims", "claim_id", "ant-clm-")
    gis_refs: set[str] = set()
    for row in rows:
        label = f"claims[{row['claim_id']}]"
        require(errors, row, label, ("anchor", "proposition", "locator", "disagreement_note"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "claim_family", row["claim_family"], CLAIM_FAMILIES)
        in_vocab(errors, label, "claim_type", row["claim_type"], CLAIM_TYPES)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_status", row["review_status"],
                 {"unreviewed", "source_checked", "reviewed"})
        if row["risk"] not in {"standard", "high"}:
            errors.append(f"{label}: risk '{row['risk']}' is not recognised")
        check_refs(errors, label, "primary_source_ids", row["primary_source_ids"], sources, multi=True)
        check_refs(errors, label, "secondary_source_ids", row["secondary_source_ids"], sources, multi=True)
        check_refs(errors, label, "map_object_ids", row["map_object_ids"], objects, multi=True)
        gis_refs.update(pipe(row["gis_dependency"]))

        cited = pipe(row["primary_source_ids"]) + pipe(row["secondary_source_ids"])
        # A claim may be confident or it may be unsourced. It may not be both.
        if row["confidence"] not in WEAK_CONFIDENCE and not cited:
            errors.append(f"{label}: a claim at '{row['confidence']}' confidence must cite a source")
        # An interpretation presented as a fact is the failure mode the ledger
        # exists to catch, so the label has to be argued in the note.
        if row["claim_type"] == "fact" and row["risk"] == "high" and not cited:
            errors.append(f"{label}: a high-risk claim typed as fact must cite a source")
        if row["review_status"] == "reviewed" and row["locator"] == PENDING:
            errors.append(f"{label}: a reviewed claim cannot leave its locator pending")
    return ids, gis_refs


def validate_coronelli(errors: list[str], objects: set[str], claims: set[str]) -> None:
    lineage = read("coronelli-lineage.csv")
    check_ids(errors, lineage, "coronelli-lineage", "lineage_id", "ant-lin-")
    for row in lineage:
        label = f"coronelli-lineage[{row['lineage_id']}]"
        require(errors, row, label, ("feature", "statement", "notes"))
        check_refs(errors, label, "coronelli_object_id", row["coronelli_object_id"], objects)
        check_refs(errors, label, "compared_object_id", row["compared_object_id"], objects)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        if row["comparison_direction"] not in {"antecedent", "successor", "internal"}:
            errors.append(f"{label}: comparison_direction '{row['comparison_direction']}' is not recognised")
        if row["relationship"] not in {"unestablished", "derived_from", "independent", "superseded"}:
            errors.append(f"{label}: relationship '{row['relationship']}' is not recognised")
        if row["status"] not in {"blocked", "candidate", "established"}:
            errors.append(f"{label}: status '{row['status']}' is not recognised")
        # A lineage is a claim about copying. Asserting one from an object nobody
        # has examined is the Act II error committed in our own voice.
        if row["status"] == "established" and row["relationship"] == "unestablished":
            errors.append(f"{label}: an established lineage must say what the relationship is")

    annotations = read("coronelli-annotations.csv")
    check_ids(errors, annotations, "coronelli-annotations", "annotation_id", "ant-ann-")
    for row in annotations:
        label = f"coronelli-annotations[{row['annotation_id']}]"
        require(errors, row, label, ("region_label", "what_to_show", "caption_draft", "notes"))
        check_refs(errors, label, "map_object_id", row["map_object_id"], objects)
        check_refs(errors, label, "claim_id", row["claim_id"], claims)
        if not row["sequence"].isdigit():
            errors.append(f"{label}: sequence must be a number")
        if row["region_state"] not in {"unresolved", "specified"}:
            errors.append(f"{label}: region_state '{row['region_state']}' is not recognised")
        if row["status"] not in {"blocked", "planned", "built"}:
            errors.append(f"{label}: status '{row['status']}' is not recognised")
        # An annotation is a crop of a plate. It cannot be built while nobody
        # knows what the plate shows.
        if row["status"] == "built" and row["region_state"] != "specified":
            errors.append(f"{label}: a built annotation needs a specified region")


def check_geometry(errors: list[str], label: str, provenance: str, geometry: str,
                   geometry_type: str = "") -> None:
    in_vocab(errors, label, "geometry_provenance", provenance, GEOMETRY_PROVENANCE)
    if provenance == "not_spatial":
        if geometry:
            errors.append(f"{label}: a not_spatial record must not carry geometry")
        return
    if not geometry:
        errors.append(f"{label}: a spatial record must carry geometry")
        return
    if not WKT.match(geometry):
        errors.append(f"{label}: geometry must be WKT POINT, LINESTRING or POLYGON")
        return
    if geometry_type and not geometry.startswith(geometry_type.upper() + " ("):
        errors.append(f"{label}: geometry does not match geometry_type '{geometry_type}'")
    for lon, lat in coordinates(geometry):
        if not -180.0 <= lon <= 180.0:
            errors.append(f"{label}: longitude {lon} is out of range")
        # Everything this programme publishes is southern. A positive latitude is
        # a transposed pair, which is the commonest way a track ends up drawn in
        # the wrong hemisphere.
        if not -90.0 <= lat <= -40.0:
            errors.append(f"{label}: latitude {lat} is outside the southern window")


def coordinates(geometry: str) -> list[tuple[float, float]]:
    pairs: list[tuple[float, float]] = []
    for chunk in re.findall(r"-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?", geometry):
        lon, lat = chunk.split(" ")
        pairs.append((float(lon), float(lat)))
    return pairs


def validate_pilot(errors: list[str], sources: set[str], objects: set[str],
                   claims: set[str]) -> dict[str, object]:
    expeditions = read("expeditions.csv")
    exp_ids = check_ids(errors, expeditions, "expeditions", "expedition_id", "ant-exp-")
    for row in expeditions:
        label = f"expeditions[{row['expedition_id']}]"
        require(errors, row, label, ("display_name", "commander", "vessels", "notes"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        check_refs(errors, label, "source_ids", row["source_ids"], sources, multi=True)
        for field in ("year_from", "year_to"):
            if not row[field].isdigit():
                errors.append(f"{label}: {field} must be a year")
        if row["year_from"].isdigit() and row["year_to"].isdigit():
            if int(row["year_from"]) > int(row["year_to"]):
                errors.append(f"{label}: the expedition ends before it starts")

    features = read("features.csv")
    feature_ids = check_ids(errors, features, "features", "feature_id", "ant-ftr-")
    pilot_acts: set[str] = set()
    for row in features:
        label = f"features[{row['feature_id']}]"
        require(errors, row, label, ("display_name", "feature_type", "notes", "source_locator"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        in_vocab(errors, label, "later_status", row["later_status"], LATER_STATUS)
        in_vocab(errors, label, "rights_status", row["rights_status"], RIGHTS)
        check_refs(errors, label, "expedition_id", row["expedition_id"], exp_ids)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        check_refs(errors, label, "later_status_source_id", row["later_status_source_id"], sources)
        check_geometry(errors, label, row["geometry_provenance"], row["geometry"], row["geometry_type"])
        pilot_acts.add(row["act"])
        promotion_rules(errors, label, row)

    tracks = read("tracks.csv")
    track_ids = check_ids(errors, tracks, "tracks", "track_id", "ant-trk-")
    for row in tracks:
        label = f"tracks[{row['track_id']}]"
        require(errors, row, label, ("display_name", "vessel", "date_from", "notes"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        if row["track_kind"] not in {"voyage", "planned_route", "drift", "boat_journey", "sledge"}:
            errors.append(f"{label}: track_kind '{row['track_kind']}' is not recognised")
        check_refs(errors, label, "expedition_id", row["expedition_id"], exp_ids)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        check_geometry(errors, label, row["geometry_provenance"], row["geometry"], "LINESTRING")
        pilot_acts.add(row["act"])
        promotion_rules(errors, label, row)
        # A planned route was never sailed, so it can only ever be our drawing of
        # someone's intention. Filing it as observation would make the central
        # contrast of Act VIII a contrast between two kinds of evidence we made up.
        if row["track_kind"] == "planned_route" and row["evidence_class"] != "editorial_interpolation":
            errors.append(f"{label}: a planned route must be filed as editorial_interpolation")

    observations = read("observations.csv")
    obs_ids = check_ids(errors, observations, "observations", "observation_id", "ant-obs-")
    for row in observations:
        label = f"observations[{row['observation_id']}]"
        require(errors, row, label, ("display_name", "observed_date", "observer", "notes"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        in_vocab(errors, label, "later_status", row["later_status"], LATER_STATUS)
        in_vocab(errors, label, "geometry_provenance", row["geometry_provenance"], GEOMETRY_PROVENANCE)
        if row["date_precision"] not in {"day", "month", "year", "decade"}:
            errors.append(f"{label}: date_precision '{row['date_precision']}' is not recognised")
        if not re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", row["observed_date"]):
            errors.append(f"{label}: observed_date must be an ISO date or year")
        check_refs(errors, label, "expedition_id", row["expedition_id"], exp_ids)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        try:
            lon, lat = float(row["lon"]), float(row["lat"])
        except ValueError:
            errors.append(f"{label}: coordinates are not numbers")
        else:
            if not -180.0 <= lon <= 180.0 or not -90.0 <= lat <= -40.0:
                errors.append(f"{label}: {lon},{lat} is outside the southern window")
        pilot_acts.add(row["act"])
        promotion_rules(errors, label, row)

    ghosts = read("ghost-geographies.csv")
    ghost_ids = check_ids(errors, ghosts, "ghost-geographies", "ghost_id", "ant-ghost-")
    for row in ghosts:
        label = f"ghost-geographies[{row['ghost_id']}]"
        # The whole methodology in one rule: a ghost feature keeps its claimant,
        # what was actually reported, and why it was plausible. Without those it
        # is only a record that somebody was wrong.
        require(errors, row, label, ("display_name", "claimant", "what_was_reported",
                                     "why_plausible", "later_evidence", "notes"))
        in_vocab(errors, label, "act", row["act"], ACTS)
        in_vocab(errors, label, "original_evidence_class", row["original_evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "later_status", row["later_status"], LATER_STATUS)
        in_vocab(errors, label, "current_scholarly_status", row["current_scholarly_status"],
                 LATER_STATUS)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        check_refs(errors, label, "later_status_source_id", row["later_status_source_id"], sources)
        check_geometry(errors, label, row["geometry_provenance"], row["geometry"])
        pilot_acts.add(row["act"])
        promotion_rules(errors, label, row)
        if row["later_status"] == "disproved" and not row["later_status_source_id"]:
            errors.append(f"{label}: a disproof needs the source that disproved it")

    names = read("names.csv")
    check_ids(errors, names, "names", "name_id", "ant-nam-")
    for row in names:
        label = f"names[{row['name_id']}]"
        require(errors, row, label, ("name", "language", "notes"))
        check_refs(errors, label, "feature_id", row["feature_id"], feature_ids)
        check_refs(errors, label, "source_id", row["source_id"], sources)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        if row["name_kind"] not in {"cartographic_label", "text_heading", "modern_name", "historic_name"}:
            errors.append(f"{label}: name_kind '{row['name_kind']}' is not recognised")
        promotion_rules(errors, label, row)

    bridges = read("feature-map-objects.csv")
    check_ids(errors, bridges, "feature-map-objects", "bridge_id", "ant-bri-")
    for row in bridges:
        label = f"feature-map-objects[{row['bridge_id']}]"
        check_refs(errors, label, "feature_id", row["feature_id"], feature_ids)
        check_refs(errors, label, "map_object_id", row["map_object_id"], objects)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        if row["relationship"] not in {"depicted_on", "subject_of", "is_the_object", "absent_from"}:
            errors.append(f"{label}: relationship '{row['relationship']}' is not recognised")
        require(errors, row, label, ("notes",))

    subjects = {"feature": feature_ids, "observation": obs_ids, "ghost": ghost_ids,
                "track": track_ids}
    evidence = read("feature-evidence.csv")
    check_ids(errors, evidence, "feature-evidence", "evidence_id", "ant-evd-")
    for row in evidence:
        label = f"feature-evidence[{row['evidence_id']}]"
        require(errors, row, label, ("source_locator", "notes"))
        kind = row["subject_kind"]
        if kind not in subjects:
            errors.append(f"{label}: subject_kind '{kind}' is not recognised")
        else:
            check_refs(errors, label, "subject_id", row["subject_id"], subjects[kind])
        check_refs(errors, label, "source_id", row["source_id"], sources)
        check_refs(errors, label, "map_object_id", row["map_object_id"], objects)
        check_refs(errors, label, "supports", row["supports"], claims)
        in_vocab(errors, label, "evidence_class", row["evidence_class"], EVIDENCE_CLASSES)
        in_vocab(errors, label, "confidence", row["confidence"], CONFIDENCE)
        in_vocab(errors, label, "review_state", row["review_state"], REVIEW_STATES)
        promotion_rules(errors, label, row)
        # Evidence with neither a text nor an object behind it is an assertion.
        if not row["source_id"] and not row["map_object_id"]:
            errors.append(f"{label}: an evidence row needs a source or a map object")

    for missing in sorted(REQUIRED_PILOT_ACTS - pilot_acts):
        errors.append(f"pilot: the vertical slice has no record for '{missing}'")

    return {
        "expeditions": len(expeditions),
        "features": len(features),
        "tracks": len(tracks),
        "observations": len(observations),
        "ghosts": len(ghosts),
        "names": len(names),
        "bridges": len(bridges),
        "evidence": len(evidence),
    }


def promotion_rules(errors: list[str], label: str, row: dict[str, str]) -> None:
    """The two rules that decide whether a record may be argued from.

    Both exist because the failure they prevent is silent. A row can look
    complete, carry a source and a coordinate, and still rest on nothing that
    anyone has read.
    """
    state = row.get("review_state", "")
    if state in {"", "raw"}:
        return
    # Naming a source is not reading it. Nothing leaves `raw` on a pending locator.
    if row.get("source_locator", "") in {"", PENDING}:
        errors.append(f"{label}: a record above raw needs a real source locator")
    # Our own linework is never evidence, whatever else is true of the record.
    if row.get("geometry_provenance", "") in OUR_OWN_LINEWORK and state in PUBLIC_STATES:
        errors.append(f"{label}: editorial linework may not reach the public tier")
    if row.get("confidence", "") in WEAK_CONFIDENCE and state in PUBLIC_STATES:
        errors.append(f"{label}: a record at weak confidence may not reach the public tier")


def validate_release(errors: list[str]) -> None:
    """Check the compiled release against the hashes it recorded.

    This is the rule that catches a table edited but never rebuilt. Without it
    every other check here would pass against inputs the published assets do not
    describe, which is the quietest way for a dataset to become a lie.
    """
    manifest_path = RELEASE / "manifest.json"
    if not manifest_path.exists():
        errors.append("release: manifest.json is missing; run `make antarctica`")
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    for relative, recorded in sorted(manifest.get("inputs", {}).items()):
        path = REPO / relative
        if not path.exists():
            errors.append(f"release: input {relative} is in the manifest but not on disk")
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != recorded:
            errors.append(f"release: {relative} has changed since the last build")

    for relative, recorded in sorted(manifest.get("outputs", {}).items()):
        path = REPO / relative
        if not path.exists():
            errors.append(f"release: output {relative} is missing; run `make antarctica`")
            continue
        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != recorded["sha256"]:
            errors.append(f"release: {relative} does not match its recorded hash")

    # The pilot's own honesty condition, asserted against the compiled output
    # rather than against the tables, because the output is what ships.
    if manifest.get("publicRecords", 0) != 0:
        errors.append(
            "release: the public tier is not empty, but no record in this slice has been "
            "reviewed against a source"
        )


def readiness(counts: dict[str, object], open_gaps: int) -> list[str]:
    sources = read("sources.csv")
    objects = read("map-objects.csv")
    claims = read("claims.csv")
    verified = [o for o in objects if o["verification_state"] == "verified"]
    publishable = [o for o in objects if o["reproduction_use"] in PUBLISHABLE_USE]
    high_risk = [c for c in claims if c["risk"] == "high"]
    reviewed = [c for c in claims if c["review_status"] == "reviewed"]
    tables = read("features.csv") + read("tracks.csv") + read("observations.csv") + \
        read("ghost-geographies.csv")
    public = [r for r in tables if r["review_state"] in PUBLIC_STATES]
    return [
        f"  bibliography: {len(sources)} sources across "
        f"{len({s['claim_family'] for s in sources})} claim families",
        f"  objects: {len(objects)} registered, {len(verified)} verified from a catalogue record, "
        f"{len(publishable)} cleared for reproduction",
        f"  claims: {len(claims)} in the ledger, {len(high_risk)} high risk, {len(reviewed)} reviewed",
        f"  pilot: {counts['features']} features, {counts['tracks']} tracks, "
        f"{counts['observations']} observations, {counts['ghosts']} ghost features, "
        f"{counts['evidence']} evidence links",
        f"  public tier: {len(public)} of {len(tables)} spatial records; "
        f"{open_gaps} source gaps open",
    ]


def validate_inputs(*, include_release: bool = True) -> tuple[list[str], dict[str, object], int]:
    """Run every rule and return the errors, the pilot counts and the open-gap tally.

    `include_release` is off in the unit tests, which work on a copied tree whose
    manifest describes the committed files rather than the mutated ones.
    """
    errors: list[str] = []
    sources = validate_sources(errors)
    objects = validate_map_objects(errors, sources)
    claims, gis_refs = validate_claims(errors, sources, objects)
    validate_terminology(errors, sources)
    validate_coronelli(errors, objects, claims)
    open_gaps = validate_gaps(errors, claims)
    counts = validate_pilot(errors, sources, objects, claims)
    if include_release:
        validate_release(errors)

    # A claim may depend on a GIS record, and that record has to exist. This is
    # what stops the essay from promising an interaction the data cannot support.
    spatial_ids = (
        {r["feature_id"] for r in read("features.csv")}
        | {r["track_id"] for r in read("tracks.csv")}
        | {r["observation_id"] for r in read("observations.csv")}
        | {r["ghost_id"] for r in read("ghost-geographies.csv")}
    )
    for missing in sorted(gis_refs - spatial_ids):
        errors.append(f"claims: gis_dependency '{missing}' does not resolve to a pilot record")
    return errors, counts, open_gaps


def main() -> int:
    errors, counts, open_gaps = validate_inputs()

    if errors:
        print(f"Antarctica QA failed ({len(errors)}):", file=sys.stderr)
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Antarctica QA: the source audit, claim ledger and pilot slice are valid.")
    for line in readiness(counts, open_gaps):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
