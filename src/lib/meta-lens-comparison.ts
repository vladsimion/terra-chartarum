import { CANONICAL_DIMENSIONS } from '../content/config';
import {
  assertEssayLensCoverage,
  mappedNativeAxes,
  type CanonicalDimension,
  type LensAuditEssay,
} from './registry';

export interface MetaLensComparisonSource extends LensAuditEssay {
  title: string;
  color?: string;
}

export interface MetaLensComparisonEntry {
  slug: string;
  title: string;
  color: string;
  values: number[];
  nativeAxes: Array<{
    axis: string;
    mappings: string[];
  }>;
}

/**
 * Build the small, serializable contract consumed by the cross-essay explorer.
 * The same coverage assertion used by individual essay pages guards comparison:
 * no missing native mapping and no partial / non-normalized meta score can ship.
 */
export function buildMetaLensComparisonEntries(
  essays: MetaLensComparisonSource[],
): MetaLensComparisonEntry[] {
  const slugs = new Set<string>();

  return essays.map((essay) => {
    if (slugs.has(essay.slug)) {
      throw new Error(`Duplicate comparison essay slug '${essay.slug}'.`);
    }
    slugs.add(essay.slug);
    assertEssayLensCoverage(essay);

    return {
      slug: essay.slug,
      title: essay.title,
      color: essay.color ?? '#d4b87a',
      values: CANONICAL_DIMENSIONS.map(
        (dimension) => essay.metaScores?.[dimension as CanonicalDimension] ?? 0,
      ),
      nativeAxes: mappedNativeAxes(essay.lenses).map(({ axis, mappings }) => ({
        axis,
        mappings: mappings.map(
          ({ label, weight }) => `${label} ${weight < 0 ? 'inverse ' : ''}${Math.abs(weight)}`,
        ),
      })),
    };
  });
}
