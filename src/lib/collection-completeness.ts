import type { HistoricalMap } from './corpus';

export const COMPLETENESS_CRITERIA = [
  'maker',
  'physicalDescription',
  'provenance',
  'bibliography',
  'imagery',
  'imageRights',
  'room',
  'coverage',
] as const;

export type CompletenessCriterion = (typeof COMPLETENESS_CRITERIA)[number];

export const OBJECT_AUDIT_CRITERIA = [
  'editionState',
  'atlasContext',
  'dimensions',
  'verso',
  'colour',
  'conditionProvenance',
  'imageSource',
  'rights',
  'bibliography',
  'crossLinks',
] as const;

export type ObjectAuditCriterion = (typeof OBJECT_AUDIT_CRITERIA)[number];
export type ObjectAuditStatus = 'recorded' | 'not_applicable' | 'not_yet_verified' | 'unknown';
export type EnrichmentTrack =
  'dacia_in_manibus' | 'crusades_holy_land' | 'published_essay' | 'deferred';

export const COMPLETENESS_LABELS: Record<CompletenessCriterion, string> = {
  maker: 'Maker',
  physicalDescription: 'Physical description',
  provenance: 'Provenance',
  bibliography: 'Bibliography',
  imagery: 'Imagery',
  imageRights: 'Image credit and licence',
  room: 'Room assignment',
  coverage: 'Depicted coverage',
};

export const OBJECT_AUDIT_LABELS: Record<ObjectAuditCriterion, string> = {
  editionState: 'Exact edition / state',
  atlasContext: 'Atlas / publication context',
  dimensions: 'Dimensions / format',
  verso: 'Verso evidence',
  colour: 'Colour evidence',
  conditionProvenance: 'Condition / provenance evidence',
  imageSource: 'Image / scan source',
  rights: 'Rights / attribution',
  bibliography: 'Bibliography',
  crossLinks: 'Essay / object cross-links',
};

export const ENRICHMENT_TRACK_LABELS: Record<EnrichmentTrack, string> = {
  dacia_in_manibus: 'Dacia / In Manibus',
  crusades_holy_land: 'Crusades / Holy Land',
  published_essay: 'Other published essays',
  deferred: 'Deferred / no live consumer',
};

export const ENRICHMENT_TRACK_OWNERS: Record<EnrichmentTrack, string> = {
  dacia_in_manibus: 'KAN-360 / KAN-361',
  crusades_holy_land: 'KAN-391',
  published_essay: 'KAN-392',
  deferred: 'Re-rank when a live programme consumes the record',
};

export interface CollectionCompletenessRecord {
  id: string;
  canonicalId: string;
  title: string;
  essaySlug: string;
  sourceEssayLive: boolean;
  present: number;
  total: number;
  percent: number;
  missing: CompletenessCriterion[];
  enrichmentTrack: EnrichmentTrack;
  audit: Record<ObjectAuditCriterion, ObjectAuditStatus>;
  auditRecorded: number;
  auditApplicable: number;
  auditPercent: number;
  discoveryEvidenceOnly: boolean;
}

export interface CollectionCompletenessReport {
  schemaVersion: 2;
  mapCount: number;
  criterionCount: number;
  present: number;
  possible: number;
  percent: number;
  fields: Array<{
    id: CompletenessCriterion;
    label: string;
    complete: number;
    total: number;
    percent: number;
  }>;
  objectAudit: {
    criterionCount: number;
    fields: Array<{
      id: ObjectAuditCriterion;
      label: string;
      recorded: number;
      notApplicable: number;
      notYetVerified: number;
      unknown: number;
    }>;
    discoveryEvidenceOnly: string[];
  };
  enrichmentQueue: Array<{
    track: Exclude<EnrichmentTrack, 'deferred'>;
    label: string;
    owner: string;
    limit: number;
    records: Array<{
      id: string;
      canonicalId: string;
      title: string;
      auditPercent: number;
      gaps: ObjectAuditCriterion[];
    }>;
  }>;
  records: CollectionCompletenessRecord[];
}

function valuesFor(map: HistoricalMap): Record<CompletenessCriterion, boolean> {
  const hasImagery = map.images.length > 0;
  return {
    maker: Boolean(map.cartographerId || map.cartographer),
    physicalDescription: Boolean(map.dimensions || map.scale || map.medium),
    provenance: Boolean(map.provenance || map.acquisition),
    bibliography: map.bibliography.length > 0,
    imagery: hasImagery,
    imageRights: hasImagery && map.images.every((image) => Boolean(image.credit && image.license)),
    room: Boolean(map.room),
    coverage: Boolean(map.coveragePath),
  };
}

function auditStatus(recorded: boolean, notApplicable = false): ObjectAuditStatus {
  if (notApplicable) return 'not_applicable';
  return recorded ? 'recorded' : 'not_yet_verified';
}

function objectAuditFor(map: HistoricalMap): Record<ObjectAuditCriterion, ObjectAuditStatus> {
  const referenceOnlyWithoutImage =
    map.publicationStatus === 'reference_only' && !map.images.length;
  const medium = map.medium?.toLowerCase() ?? '';
  const observed = map.physicalObservation;
  return {
    editionState: auditStatus(Boolean(map.edition || map.state)),
    atlasContext: auditStatus(Boolean(map.edition || map.publisher)),
    dimensions: auditStatus(Boolean(map.dimensions || map.scale)),
    // Verso is recorded only from an actual examination (KAN-391). It used to be
    // hardcoded `not_yet_verified` because the schema had nowhere to put the
    // observation, which meant the criterion could never be satisfied by any
    // amount of work - a gap the report could not tell apart from neglect.
    verso: auditStatus(Boolean(observed?.verso)),
    // Colour, likewise. Reading it off `medium` inferred a physical fact from a
    // catalogue phrase: "hand-coloured" in a dealer description is a claim about
    // the object, not a look at it. That inference is kept as a fallback only
    // where nobody has examined the sheet, and an examination always wins.
    colour: auditStatus(
      Boolean(observed?.colour) || /colour|color|pigment|mosaic|photograph/.test(medium),
    ),
    conditionProvenance: auditStatus(
      Boolean(observed?.conditionNotes || map.condition || map.provenance || map.acquisition),
    ),
    imageSource: auditStatus(
      map.images.some((image) => Boolean(image.src && image.credit)),
      referenceOnlyWithoutImage,
    ),
    rights: auditStatus(
      Boolean(map.rightsStatement) ||
        (map.images.length > 0 &&
          map.images.every((image) => Boolean(image.credit && image.license))),
      referenceOnlyWithoutImage,
    ),
    bibliography: auditStatus(map.bibliography.length > 0),
    crossLinks: auditStatus(
      Boolean(map.essaySlug || map.relatedEssaySlugs.length || map.relatedMapIds.length),
    ),
  };
}

function enrichmentTrackFor(map: HistoricalMap, sourceEssayLive: boolean): EnrichmentTrack {
  const search = [map.id, map.title, map.region, map.essaySlug, ...map.tags]
    .join(' ')
    .toLowerCase();
  if (/\bdacia\b|transylvan/.test(search)) return 'dacia_in_manibus';
  if (/jerusalem|holy land|pilgrim|matthew paris|madaba|crusad/.test(search)) {
    return 'crusades_holy_land';
  }
  return sourceEssayLive ? 'published_essay' : 'deferred';
}

function isDiscoveryEvidenceOnly(map: HistoricalMap): boolean {
  return /dealer|auction/.test(
    [map.provenance, map.acquisition].filter(Boolean).join(' ').toLowerCase(),
  );
}

export function analyseCollectionCompleteness(
  maps: HistoricalMap[],
  liveEssaySlugs: ReadonlySet<string>,
): CollectionCompletenessReport {
  const records = maps.map((map) => {
    const values = valuesFor(map);
    const missing = COMPLETENESS_CRITERIA.filter((criterion) => !values[criterion]);
    const present = COMPLETENESS_CRITERIA.length - missing.length;
    const sourceEssayLive = liveEssaySlugs.has(map.essaySlug);
    const audit = objectAuditFor(map);
    const auditApplicable = OBJECT_AUDIT_CRITERIA.filter(
      (criterion) => audit[criterion] !== 'not_applicable',
    ).length;
    const auditRecorded = OBJECT_AUDIT_CRITERIA.filter(
      (criterion) => audit[criterion] === 'recorded',
    ).length;
    return {
      id: map.id,
      canonicalId: `tc:atlas:map:${map.id}`,
      title: map.title,
      essaySlug: map.essaySlug,
      sourceEssayLive,
      present,
      total: COMPLETENESS_CRITERIA.length,
      percent: Math.round((present / COMPLETENESS_CRITERIA.length) * 100),
      missing,
      enrichmentTrack: enrichmentTrackFor(map, sourceEssayLive),
      audit,
      auditRecorded,
      auditApplicable,
      auditPercent: auditApplicable ? Math.round((auditRecorded / auditApplicable) * 100) : 100,
      discoveryEvidenceOnly: isDiscoveryEvidenceOnly(map),
    };
  });

  records.sort(
    (a, b) =>
      Number(b.sourceEssayLive) - Number(a.sourceEssayLive) ||
      a.percent - b.percent ||
      a.title.localeCompare(b.title),
  );

  const possible = records.length * COMPLETENESS_CRITERIA.length;
  const present = records.reduce((sum, record) => sum + record.present, 0);

  const queueLimits = {
    dacia_in_manibus: 5,
    crusades_holy_land: 8,
    published_essay: 12,
  } as const;
  const queueTracks = Object.keys(queueLimits) as Array<keyof typeof queueLimits>;

  return {
    schemaVersion: 2,
    mapCount: records.length,
    criterionCount: COMPLETENESS_CRITERIA.length,
    present,
    possible,
    percent: possible ? Math.round((present / possible) * 100) : 100,
    fields: COMPLETENESS_CRITERIA.map((criterion) => {
      const complete = records.filter((record) => !record.missing.includes(criterion)).length;
      return {
        id: criterion,
        label: COMPLETENESS_LABELS[criterion],
        complete,
        total: records.length,
        percent: records.length ? Math.round((complete / records.length) * 100) : 100,
      };
    }),
    objectAudit: {
      criterionCount: OBJECT_AUDIT_CRITERIA.length,
      fields: OBJECT_AUDIT_CRITERIA.map((criterion) => ({
        id: criterion,
        label: OBJECT_AUDIT_LABELS[criterion],
        recorded: records.filter((record) => record.audit[criterion] === 'recorded').length,
        notApplicable: records.filter((record) => record.audit[criterion] === 'not_applicable')
          .length,
        notYetVerified: records.filter((record) => record.audit[criterion] === 'not_yet_verified')
          .length,
        unknown: records.filter((record) => record.audit[criterion] === 'unknown').length,
      })),
      discoveryEvidenceOnly: records
        .filter((record) => record.discoveryEvidenceOnly)
        .map((record) => record.canonicalId),
    },
    enrichmentQueue: queueTracks.map((track) => ({
      track,
      label: ENRICHMENT_TRACK_LABELS[track],
      owner: ENRICHMENT_TRACK_OWNERS[track],
      limit: queueLimits[track],
      records: records
        .filter((record) => record.enrichmentTrack === track)
        .sort(
          (a, b) =>
            a.auditPercent - b.auditPercent ||
            a.percent - b.percent ||
            a.title.localeCompare(b.title),
        )
        .slice(0, queueLimits[track])
        .map((record) => ({
          id: record.id,
          canonicalId: record.canonicalId,
          title: record.title,
          auditPercent: record.auditPercent,
          gaps: OBJECT_AUDIT_CRITERIA.filter(
            (criterion) => !['recorded', 'not_applicable'].includes(record.audit[criterion]),
          ),
        })),
    })),
    records,
  };
}
