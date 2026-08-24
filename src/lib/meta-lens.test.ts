import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { CANONICAL_DIMENSIONS } from '../content/config';
import {
  assertEssayLensCoverage,
  auditLensCoverage,
  mappedNativeAxes,
  type LensAuditEssay,
} from './registry';

const scores = Object.fromEntries(CANONICAL_DIMENSIONS.map((dimension) => [dimension, 0.5]));

/**
 * The inventory is read off disk rather than transcribed here (ANT-13 /
 * KAN-432).
 *
 * It used to be a hand-maintained list, and a hand-maintained list only covers
 * the essays somebody remembered to add. Two held essays - `terra-incognita`
 * and `maps-for-a-crusade` - were never added, so four unmapped axes each sat
 * in the corpus without failing anything. They would not have failed anything
 * until release day, when `MetaLens` asserts coverage and `astro build` throws.
 *
 * Reading the directory means a new essay is audited the moment it exists, and
 * being held is no longer a way to postpone the check.
 */
const ESSAY_DIR = join(process.cwd(), 'src', 'content', 'essays');

function essayInventory(): LensAuditEssay[] {
  return readdirSync(ESSAY_DIR)
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const raw = readFileSync(join(ESSAY_DIR, file), 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) throw new Error(`${file} has no frontmatter`);
      const frontmatter = parseYaml(match[1]) as {
        lenses?: string[];
        metaScores?: LensAuditEssay['metaScores'];
      };
      return {
        slug: file.replace(/\.mdx?$/, ''),
        lenses: frontmatter.lenses ?? [],
        metaScores: frontmatter.metaScores,
      };
    });
}

const inventory = essayInventory();

describe('meta-lens coverage', () => {
  it('covers every declared native axis in the complete essay inventory', () => {
    // Held essays included: an unmapped axis must fail here, not on release day.
    expect(inventory.length).toBeGreaterThan(15);
    const audit = auditLensCoverage(inventory);
    expect(audit.missingMappings).toEqual([]);
    expect(audit.duplicateLabels).toEqual([]);
    expect(audit.invalidMappings).toEqual([]);
    expect(audit.invalidNormalization).toEqual([]);
  });

  it('audits the held essays too', () => {
    for (const slug of ['terra-incognita', 'maps-for-a-crusade']) {
      const essay = inventory.find((entry) => entry.slug === slug);
      expect(essay, slug).toBeDefined();
      expect(essay!.lenses.length, slug).toBeGreaterThan(0);
    }
  });

  it('reports missing mappings, duplicate labels, and invalid normalization', () => {
    const audit = auditLensCoverage([
      {
        slug: 'broken',
        lenses: ['Accuracy', 'Accuracy', 'Unknown axis'],
        metaScores: { ...scores, measure: 2 },
      },
    ]);

    expect(audit.missingMappings).toEqual([{ slug: 'broken', axis: 'Unknown axis' }]);
    expect(audit.duplicateLabels).toEqual([{ slug: 'broken', axis: 'Accuracy' }]);
    expect(audit.invalidNormalization).toContainEqual({
      slug: 'broken',
      dimension: 'measure',
      value: 2,
    });
  });

  it('preserves native labels while exposing weighted canonical targets', () => {
    expect(mappedNativeAxes(['Completeness'])).toEqual([
      {
        axis: 'Completeness',
        mappings: [
          { dimension: 'witness', label: 'Witness', weight: 0.5 },
          { dimension: 'silence', label: 'Silence', weight: -0.5 },
        ],
      },
    ]);
  });

  it('fails the rendering gate when an essay is not completely mapped', () => {
    expect(() =>
      assertEssayLensCoverage({
        slug: 'unmapped',
        lenses: ['No such lens'],
        metaScores: scores,
      }),
    ).toThrow("unmapped axis 'No such lens'");
  });
});
