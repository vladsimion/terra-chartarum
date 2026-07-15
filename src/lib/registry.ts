import { getCollection, type CollectionEntry } from 'astro:content';
import { CANONICAL_DIMENSIONS } from '../content/config';

export type Essay = CollectionEntry<'essays'>;
export type CanonicalDimension = (typeof CANONICAL_DIMENSIONS)[number];

/**
 * The harmonized meta-lens (ATLAS-EL1).
 * Additive layer only — each essay keeps its native lens; this maps native axes
 * onto six canonical dimensions derived from the essays' shared Harley spine.
 */
export const DIMENSION_META: Record<
  CanonicalDimension,
  { label: string; blurb: string }
> = {
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
 * Note: Dacia's "Sex Lectiones" is a reading METHOD, not a scoring set — only
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
};

/** All essays, sorted by their explicit `order` then title. */
export async function getEssays(): Promise<Essay[]> {
  const essays = await getCollection('essays');
  return essays.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
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
