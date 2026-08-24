/**
 * TERRA INCOGNITA release readiness (ANT-13 / KAN-432)
 *
 * The final publication gate, computed from the corpus rather than asserted in
 * a document. A release-readiness report that a person writes is a report about
 * the day it was written; this one is wrong the moment the data stops agreeing
 * with it, and the test suite says so.
 *
 * The programme is currently NOT release-ready, and the reasons are structural
 * rather than incidental: nothing has been read against a source, and no image
 * may be reproduced. Those are the two gates a machine cannot close on its own.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  getAntarcticRecords,
  getGhostRecords,
  getPublicRecords,
  type AntarcticRecord,
} from './antarctica';
import { GEO_LAYERS } from './geo';
import { assessPresentability, type DisputedRecord } from './uncertainty';

export const ESSAY_SLUG = 'terra-incognita';
/** The sentinel this project uses for an essay with no release date. */
export const UNSCHEDULED = '2099-01-01';

export interface Gate {
  id: string;
  /** What the gate checks, in a sentence a reader could act on. */
  question: string;
  passed: boolean;
  /** The measured state, whichever way the gate went. */
  finding: string;
  /** Who can close it: a machine, or a person doing scholarly work. */
  closedBy: 'machine' | 'review' | 'rights';
}

export interface ReleaseReadiness {
  gates: Gate[];
  passed: Gate[];
  blocked: Gate[];
  releasable: boolean;
}

/** Layers belonging to the Antarctic family, by prefix rather than by a list. */
export function antarcticLayers() {
  return GEO_LAYERS.filter((layer) => layer.id.startsWith('antarctica-'));
}

/**
 * The gates, evaluated against the current corpus.
 *
 * Deliberately mixed: the machine gates should pass, and their passing is
 * meaningful precisely because the review gates do not. A report where
 * everything failed would say nothing about the engineering, and one where
 * everything passed would be lying about the scholarship.
 */
export function assessRelease(
  records: AntarcticRecord[] = getAntarcticRecords(),
): ReleaseReadiness {
  const layers = antarcticLayers();
  const mappable = records.filter((record) => record.geometry !== null);
  const unread = records.filter(
    (record) => !record.sourceLocator || record.sourceLocator === 'pending',
  );
  const missingProvenance = mappable.filter(
    (record) => !record.geometryProvenance || record.geometryProvenance === 'not_spatial',
  );
  const unpresentableGhosts = getGhostRecords().filter(
    (ghost) => !assessPresentability(ghost as unknown as DisputedRecord).presentable,
  );
  const inReview = layers.filter((layer) => layer.lifecycle !== 'published');
  const defaultOn = layers.filter((layer) => layer.defaultOn);

  const gates: Gate[] = [
    {
      id: 'geometry-provenance',
      question: 'Does every published geometry declare where it came from?',
      passed: missingProvenance.length === 0,
      finding: `${mappable.length} mappable records, ${missingProvenance.length} without provenance`,
      closedBy: 'machine',
    },
    {
      id: 'ghost-context',
      question: 'Can every disproved feature answer who claimed it and why that was plausible?',
      passed: unpresentableGhosts.length === 0,
      finding: `${getGhostRecords().length} ghost records, ${unpresentableGhosts.length} without full context`,
      closedBy: 'machine',
    },
    {
      id: 'nothing-default-on',
      question: 'Is any unreviewed layer shown to a reader who asked for nothing?',
      passed: defaultOn.length === 0,
      finding: `${defaultOn.length} of ${layers.length} Antarctic layers are on by default`,
      closedBy: 'machine',
    },
    {
      id: 'sources-read',
      question: 'Has every record been read against the source it names?',
      passed: unread.length === 0,
      finding: `${unread.length} of ${records.length} records still carry a pending locator`,
      closedBy: 'review',
    },
    {
      id: 'public-tier',
      question: 'Is anything cleared for citation as established evidence?',
      passed: getPublicRecords().length > 0,
      finding: `${getPublicRecords().length} records have passed human review`,
      closedBy: 'review',
    },
    {
      id: 'layers-published',
      question: 'Has any Antarctic layer left the in-review lifecycle?',
      passed: inReview.length === 0,
      finding: `${inReview.length} of ${layers.length} layers are still in review`,
      closedBy: 'review',
    },
    {
      id: 'image-rights',
      question: 'Is any historical map cleared for reproduction?',
      passed: false,
      finding:
        'No object in the register is cleared. Both verified Greenwich records state no reuse licence and one carries a Crown copyright credit line.',
      closedBy: 'rights',
    },
  ];

  const passed = gates.filter((gate) => gate.passed);
  return {
    gates,
    passed,
    blocked: gates.filter((g) => !g.passed),
    releasable: passed.length === gates.length,
  };
}

/**
 * Whether the essay's release date agrees with the corpus.
 *
 * This is the check that makes the report binding. An essay whose evidence has
 * not been read may not carry a release date in the past, and the build would
 * otherwise happily publish it the moment somebody edited one line of
 * frontmatter.
 *
 * The frontmatter is read off disk with the same YAML parser Astro uses, as the
 * handbook and essay tests do: there is no content layer outside the Astro
 * runtime, and this check has to be runnable from a unit test.
 */
export async function essayReleaseAgreesWithCorpus(): Promise<{
  releaseAt: string;
  held: boolean;
  shouldBeHeld: boolean;
  agrees: boolean;
}> {
  const path = join(process.cwd(), 'src', 'content', 'essays', `${ESSAY_SLUG}.mdx`);
  const raw = await readFile(path, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`Essay "${ESSAY_SLUG}" has no frontmatter`);
  const frontmatter = parseYaml(match[1]) as { releaseAt?: string };
  const releaseAt = frontmatter.releaseAt;
  if (!releaseAt) throw new Error(`Essay "${ESSAY_SLUG}" declares no releaseAt`);
  const held = releaseAt === UNSCHEDULED;
  const shouldBeHeld = !assessRelease().releasable;
  return { releaseAt, held, shouldBeHeld, agrees: held === shouldBeHeld };
}
