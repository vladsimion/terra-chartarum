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

export interface CollectionCompletenessRecord {
  id: string;
  title: string;
  essaySlug: string;
  sourceEssayLive: boolean;
  present: number;
  total: number;
  percent: number;
  missing: CompletenessCriterion[];
}

export interface CollectionCompletenessReport {
  schemaVersion: 1;
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

export function analyseCollectionCompleteness(
  maps: HistoricalMap[],
  liveEssaySlugs: ReadonlySet<string>,
): CollectionCompletenessReport {
  const records = maps.map((map) => {
    const values = valuesFor(map);
    const missing = COMPLETENESS_CRITERIA.filter((criterion) => !values[criterion]);
    const present = COMPLETENESS_CRITERIA.length - missing.length;
    return {
      id: map.id,
      title: map.title,
      essaySlug: map.essaySlug,
      sourceEssayLive: liveEssaySlugs.has(map.essaySlug),
      present,
      total: COMPLETENESS_CRITERIA.length,
      percent: Math.round((present / COMPLETENESS_CRITERIA.length) * 100),
      missing,
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

  return {
    schemaVersion: 1,
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
    records,
  };
}
