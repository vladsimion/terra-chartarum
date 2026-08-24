# Corpus Nominum Daciae v1.0 schema

The canonical field order for every release-candidate table follows.
Controlled values and cross-field rules are defined in `docs/dacia/data-dictionary.md`
and enforced by `scripts/dacia/validate.py`.

## `places.csv`

`place_id`, `reference_name`, `place_type`, `region`, `location_status`, `ref_lon`, `ref_lat`, `ref_geometry_provenance`, `pleiades_id`, `whg_id`, `external_verified`, `review_state`, `normalization_method`, `reviewer`, `review_date`, `note`

## `sources.csv`

`source_id`, `short_title`, `title`, `creator`, `source_family`, `date_label`, `year_from`, `year_to`, `date_precision`, `witness`, `edition_state`, `repository`, `repository_object_id`, `rights_statement`, `citation`, `scope`, `trench_a_stela`, `review_state`, `normalization_method`, `reviewer`, `review_date`, `note`

## `attestations.csv`

`attestation_id`, `place_id`, `source_id`, `attestation_class`, `name_original`, `script`, `language`, `name_transliterated`, `name_normalized`, `locator_type`, `locator`, `source_lon`, `source_lat`, `confidence`, `review_state`, `normalization_method`, `reviewer`, `review_date`, `last_verified`, `note`

## `transcriptions.csv`

`transcription_id`, `attestation_id`, `verbatim`, `capture_method`, `capture_source`, `captured_on`, `note`

## `name-uses.csv`

`name_use_id`, `lexical_form`, `source_id`, `institution`, `referent_kind`, `referent_place_id`, `referent_label`, `period_from`, `period_to`, `date_precision`, `fate_class`, `locator_type`, `locator`, `confidence`, `review_state`, `normalization_method`, `reviewer`, `review_date`, `note`

## `name-use-edges.csv`

`edge_id`, `from_name_use`, `to_name_use`, `edge_kind`, `evidence_attestation_id`, `evidence_note`, `confidence`, `review_state`, `normalization_method`, `reviewer`, `review_date`, `note`
