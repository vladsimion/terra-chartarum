import { getCollection, type CollectionEntry } from 'astro:content';
import { CANONICAL_DIMENSIONS } from '../content/config';
import { isReleased, showUnreleased } from './release';

export type Essay = CollectionEntry<'essays'>;
export type CanonicalDimension = (typeof CANONICAL_DIMENSIONS)[number];

/**
 * The harmonized meta-lens (ATLAS-EL1).
 * Additive layer only - each essay keeps its native lens; this maps native axes
 * onto six canonical dimensions derived from the essays' shared Harley spine.
 */
export const DIMENSION_META: Record<CanonicalDimension, { label: string; blurb: string }> = {
  measure: { label: 'Measure', blurb: 'Geometric & survey fidelity.' },
  witness: { label: 'Witness', blurb: 'Empirical grounding vs. inherited copy.' },
  use: { label: 'Use', blurb: 'Navigation, fitness for task, reach.' },
  cosmos: { label: 'Cosmos', blurb: 'Symbolic & meaning density, naming, craft.' },
  power: { label: 'Power', blurb: 'Politics, authority, boundaries.' },
  silence: { label: 'Silence', blurb: 'Omission, erasure, what is excluded.' },
};

/**
 * Crosswalk: native axis (per essay) -> canonical dimension.
 * Parenthetical/partial mappings from the plan are included where meaningful.
 * Note: Dacia's "Sex Lectiones" is a reading METHOD, not a scoring set - only
 * rasura/vacat feed Silence; the rest is a reading protocol, not an axis.
 */
export const CROSSWALK: Record<string, Partial<Record<CanonicalDimension, number>>> = {
  // cartography (7 axes)
  Accuracy: { measure: 1 },
  Usability: { use: 1 },
  Navigation: { use: 1 },
  Symbolism: { cosmos: 1 },
  Richness: { cosmos: 1 },
  Politics: { power: 1 },
  Completeness: { witness: 0.5, silence: -0.5 },
  // Speculum (Six Bearings)
  Geodesy: { measure: 1 },
  Witness: { witness: 1 },
  Cosmos: { cosmos: 1 },
  Fitness: { use: 1 },
  Reach: { use: 1 },
  Hand: { cosmos: 1 },
  // Dacia (Quinque Sigilla)
  mensvra: { measure: 1 },
  auctoritas: { power: 1 },
  nomina: { cosmos: 1 },
  limes: { power: 1 },
  silentium: { silence: 1 },
  // Venice vs Sicily (6 axes)
  MARE: { measure: 0.5 },
  TERRA: { measure: 0.5 },
  RETE: { use: 1 },
  CONFINE: { power: 1 },
  CIRCOLAZIONE: { power: 1 },
  IMPOSIZIONE: { power: 1 },
  // Cities Remember
  Fragment: { witness: 0.75, silence: 0.5 },
  View: { witness: 0.5, cosmos: 0.5 },
  Wall: { power: 0.75, silence: 0.25 },
  Ground: { measure: 0.5, witness: 0.5 },
  Risk: { use: 0.5, power: 0.5 },
  Registration: { measure: 0.5, witness: 0.5 },
  // Invisible Maps of Religion
  'Sacred centre': { cosmos: 1, power: 0.25 },
  Orientation: { cosmos: 0.75, use: 0.25 },
  Pilgrimage: { use: 0.75, cosmos: 0.25 },
  Memory: { witness: 0.5, cosmos: 0.5 },
  Diagram: { cosmos: 0.75, measure: 0.25 },
  Print: { witness: 0.5, use: 0.5 },
  // Invisible Maps of Trade
  Network: { use: 0.75, power: 0.25 },
  Jurisdiction: { power: 1 },
  Schedule: { use: 0.75, measure: 0.25 },
  Labour: { power: 0.75, silence: 0.25 },
  Commodity: { use: 0.5, power: 0.5 },
  Silence: { silence: 1 },
  // Maps That Age
  Plate: { witness: 0.75, measure: 0.25 },
  State: { witness: 0.75, measure: 0.25 },
  Edition: { witness: 0.75, use: 0.25 },
  Wear: { witness: 1 },
  Revision: { witness: 0.5, power: 0.5 },
  Archive: { witness: 0.75, silence: 0.25 },
  // Wave 2
  Terrain: { measure: 0.5, witness: 0.5 },
  Settlement: { witness: 0.5, power: 0.5 },
  Ecology: { witness: 0.75, silence: 0.25 },
  Territory: { power: 0.75, measure: 0.25 },
  Empire: { power: 1 },
  Administration: { power: 0.75, use: 0.25 },
  Boundary: { power: 1 },
  Atlas: { use: 0.5, cosmos: 0.5 },
  Classification: { cosmos: 0.5, power: 0.5 },
  Nation: { power: 0.75, cosmos: 0.25 },
  Survey: { measure: 0.75, power: 0.25 },
  Schooling: { cosmos: 0.5, power: 0.5 },
  Repetition: { cosmos: 0.5, power: 0.5 },
  Projection: { measure: 1 },
  Perspective: { cosmos: 0.5, measure: 0.5 },
  Distortion: { measure: 0.75, silence: 0.25 },
  Scale: { measure: 0.75, use: 0.25 },
  Viewpoint: { cosmos: 0.5, power: 0.5 },
  Infrastructure: { use: 0.5, power: 0.5 },
  Access: { use: 0.75, power: 0.25 },
  Property: { power: 1 },
  Refusal: { silence: 0.75, power: 0.25 },
  Movement: { use: 0.75, witness: 0.25 },
  Border: { power: 1 },
  Uncertainty: { witness: 1 },
  Diaspora: { witness: 0.5, cosmos: 0.25, silence: 0.25 },
  Landscape: { witness: 0.75, measure: 0.25 },
  Archaeology: { witness: 1 },
  Reconstruction: { witness: 0.75, cosmos: 0.25 },
  Catalogue: { witness: 0.5, cosmos: 0.5 },
  Taxonomy: { cosmos: 0.5, power: 0.5 },
  Search: { use: 0.75, power: 0.25 },
  // Starter example uses the canonical terms as its native demonstration lens.
  Measure: { measure: 1 },
  Use: { use: 1 },
  Power: { power: 1 },
  // Terra Incognita (ANT-12). Latin axes, as Dacia's are; `auctoritas` is
  // already mapped above and is deliberately shared with Dacia rather than
  // duplicated, because it means the same thing in both essays.
  //
  // The mappings follow the essay's own argument: a coastline deduced rather
  // than seen is a cosmographic claim standing in for an absence of evidence;
  // an observation is a witnessed position with an instrument behind it; a
  // ghost geography is a witness report that later proved empty; and a drift is
  // a position that keeps changing while nobody is navigating, which is a
  // measurement problem and a witnessing one at once.
  conjectura: { cosmos: 0.75, silence: 0.25 },
  observatio: { witness: 0.75, measure: 0.25 },
  error: { witness: 0.5, silence: 0.5 },
  deriva: { measure: 0.5, witness: 0.5 },
  // Borroczyn (CCD-BOR3). A cadastral seam through Bucharest, so the axes are
  // about what a survey records and what it cannot. A parcel is the unit a
  // cadastre measures and the unit of ownership at once; a street is the shape
  // the city is used through; demolition is the exercise of power that removes
  // both and leaves the earlier survey as the only witness; and uncertainty is
  // the seam's own subject, which is how much of a georeferenced comparison the
  // evidence actually supports.
  //
  // `uncertainty` is lower-case where the migration essay's `Uncertainty` is
  // capitalised, and the crosswalk is case-sensitive, so they are two entries.
  // Left as they are rather than normalised: the label is the essay's own, and
  // this is a mapping table, not a style guide.
  parcel: { measure: 0.5, power: 0.5 },
  street: { use: 0.75, witness: 0.25 },
  demolition: { power: 0.75, silence: 0.25 },
  uncertainty: { witness: 1 },
  // Maps for a Crusade (CRU-6). An itinerary is a journey made usable rather
  // than a space measured; a contract and a diversion are both exercises of
  // power over where a fleet goes; and dominium is the distinction the whole
  // prototype protects, between a claim and a possession.
  itinerarium: { use: 0.75, cosmos: 0.25 },
  contractus: { power: 0.5, use: 0.5 },
  deviatio: { power: 0.75, use: 0.25 },
  dominium: { power: 1 },
};

export interface LensAuditEssay {
  slug: string;
  lenses: string[];
  metaScores?: Partial<Record<CanonicalDimension, number>>;
}

export interface LensCoverageAudit {
  missingMappings: Array<{ slug: string; axis: string }>;
  duplicateLabels: Array<{ slug: string; axis: string }>;
  invalidMappings: Array<{ axis: string; dimension: string; weight: number }>;
  invalidNormalization: Array<{ slug: string; dimension: CanonicalDimension; value: unknown }>;
}

export interface MappedNativeAxis {
  axis: string;
  mappings: Array<{
    dimension: CanonicalDimension;
    label: string;
    weight: number;
  }>;
}

/**
 * Audit the additive meta-lens contract without requiring Astro's content
 * runtime. Used by unit tests and by the essay renderer before it exposes the
 * lens. Native labels stay intact; a mapping may contribute to more than one
 * canonical dimension.
 */
export function auditLensCoverage(essays: LensAuditEssay[]): LensCoverageAudit {
  const missingMappings: LensCoverageAudit['missingMappings'] = [];
  const duplicateLabels: LensCoverageAudit['duplicateLabels'] = [];
  const invalidNormalization: LensCoverageAudit['invalidNormalization'] = [];
  const seenMappings = new Set<string>();
  const invalidMappings: LensCoverageAudit['invalidMappings'] = [];

  for (const [axis, mapping] of Object.entries(CROSSWALK)) {
    for (const [dimension, weight] of Object.entries(mapping)) {
      const key = `${axis}:${dimension}`;
      if (
        seenMappings.has(key) ||
        typeof weight !== 'number' ||
        weight === 0 ||
        Math.abs(weight) > 1
      ) {
        invalidMappings.push({ axis, dimension, weight: Number(weight) });
      }
      seenMappings.add(key);
    }
  }

  for (const essay of essays) {
    const seenAxes = new Set<string>();
    for (const axis of essay.lenses) {
      if (seenAxes.has(axis)) duplicateLabels.push({ slug: essay.slug, axis });
      seenAxes.add(axis);
      if (!CROSSWALK[axis] || Object.keys(CROSSWALK[axis]).length === 0) {
        missingMappings.push({ slug: essay.slug, axis });
      }
    }

    for (const dimension of CANONICAL_DIMENSIONS) {
      const value = essay.metaScores?.[dimension];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
        invalidNormalization.push({ slug: essay.slug, dimension, value });
      }
    }
  }

  return { missingMappings, duplicateLabels, invalidMappings, invalidNormalization };
}

export function mappedNativeAxes(lenses: string[]): MappedNativeAxis[] {
  return lenses.map((axis) => {
    const mapping = CROSSWALK[axis];
    if (!mapping || Object.keys(mapping).length === 0) {
      throw new Error(`Native essay axis '${axis}' has no canonical meta-lens mapping.`);
    }
    return {
      axis,
      mappings: Object.entries(mapping).map(([dimension, weight]) => ({
        dimension: dimension as CanonicalDimension,
        label: DIMENSION_META[dimension as CanonicalDimension].label,
        weight: weight as number,
      })),
    };
  });
}

export function assertEssayLensCoverage(essay: LensAuditEssay): void {
  const audit = auditLensCoverage([essay]);
  const errors = [
    ...audit.missingMappings.map(({ axis }) => `unmapped axis '${axis}'`),
    ...audit.duplicateLabels.map(({ axis }) => `duplicate axis '${axis}'`),
    ...audit.invalidMappings.map(
      ({ axis, dimension, weight }) => `invalid ${axis} → ${dimension} weight ${weight}`,
    ),
    ...audit.invalidNormalization.map(
      ({ dimension, value }) => `invalid ${dimension} normalized score ${String(value)}`,
    ),
  ];
  if (errors.length > 0) throw new Error(`${essay.slug}: ${errors.join('; ')}`);
}

/** Sort helper shared by the released and unfiltered accessors. */
function byOrderThenTitle(a: Essay, b: Essay): number {
  return a.data.order - b.data.order || a.data.title.localeCompare(b.data.title);
}

/**
 * Every essay in the collection, released or not. Tooling only - no page may
 * use this, or embargoed work would leak into the build. See `getEssays`.
 */
export async function getAllEssays(): Promise<Essay[]> {
  return (await getCollection('essays')).sort(byOrderThenTitle);
}

/**
 * Released essays, sorted by their explicit `order` then title.
 *
 * This is the ONLY collection read the rendered site performs, so the release
 * gate applied here propagates to every consumer: routes, gallery, room pages,
 * RSS, search index, sitemap and the atlas.
 */
export async function getEssays(): Promise<Essay[]> {
  const essays = await getCollection('essays');
  const visible = showUnreleased()
    ? essays
    : essays.filter((essay) => isReleased(essay.data.releaseAt));
  return visible.sort(byOrderThenTitle);
}

export async function getFeaturedEssays(): Promise<Essay[]> {
  return (await getEssays()).filter((e) => e.data.featured);
}

/** Distinct, sorted facet values across all essays (for gallery filters). */
export async function getFacets(): Promise<{
  eras: string[];
  regions: string[];
  dimensions: CanonicalDimension[];
}> {
  const essays = await getEssays();
  const eras = new Set<string>();
  const regions = new Set<string>();
  for (const e of essays) {
    e.data.eras.forEach((x) => eras.add(x));
    e.data.regions.forEach((x) => regions.add(x));
  }
  return {
    eras: [...eras].sort(),
    regions: [...regions].sort(),
    dimensions: [...CANONICAL_DIMENSIONS],
  };
}

export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `AD ${year}`;
}

export function yearRange(from: number, to: number): string {
  return `${formatYear(from)} – ${formatYear(to)}`;
}
