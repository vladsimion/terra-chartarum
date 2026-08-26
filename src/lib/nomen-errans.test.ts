import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEO_LAYERS } from './geo';
import {
  atlasStateFor,
  atlasUrlFor,
  getNameCareer,
  getNameCareers,
  getNameRelations,
  getWithheldCareers,
  getWithheldRelations,
  nameCareerLayers,
  NOMEN_ERRANS_BEAT,
  NOMEN_ERRANS_ESSAY,
  NOMEN_ERRANS_FORM,
} from './nomen-errans';
import { parseAtlasShareState } from './atlas-share';

const careers = getNameCareers();

describe('the Nomen Errans vertical slice', () => {
  it('follows one word, and enough of its careers to be an argument', () => {
    // KAN-345 asks for at least three historically distinct uses. Fewer than
    // three is a demonstration of a component, not of a migration.
    expect(careers.length).toBeGreaterThanOrEqual(3);
    expect(new Set(careers.map((career) => career.lexicalForm))).toEqual(
      new Set([NOMEN_ERRANS_FORM]),
    );
    expect(new Set(careers.map((career) => career.referentLabel)).size).toBe(careers.length);
  });

  it('shows a reader referent, period, source, locator and confidence for each', () => {
    for (const career of careers) {
      expect(career.referentLabel, career.id).toBeTruthy();
      expect(career.periodLabel, career.id).toBeTruthy();
      expect(career.confidenceLabel, career.id).toBeTruthy();
      // `locator_type: none` is an honest answer and must still be labelled,
      // so what is required is that the field says something either way.
      expect(career.locatorTypeLabel, career.id).toBeTruthy();
      expect(career.source?.citation, career.id).toBeTruthy();
    }
  });

  it('presents only careers a person has cleared, and counts the rest', () => {
    for (const career of careers) {
      expect(['reviewed', 'approved', 'published'], career.id).toContain(career.reviewState);
      expect(career.reviewer, career.id).toBeTruthy();
    }
    for (const held of getWithheldCareers()) {
      expect(['reviewed', 'approved', 'published'], held.id).not.toContain(held.reviewState);
      expect(held.referentLabel, held.id).toBeTruthy();
    }
  });

  it('publishes only fate classes with a reviewed example', () => {
    const publicFates = new Set(careers.map((career) => career.fateClass));
    const withheld = getWithheldCareers();

    expect(publicFates).toEqual(new Set(['applicatio', 'restitutio', 'translatio']));
    expect(publicFates).not.toContain('inventio');
    expect(withheld.some((career) => career.fateClass === 'inventio')).toBe(true);
    expect(withheld.every((career) => career.reviewState === 'normalized')).toBe(true);
  });

  it('reads the chronology from the corpus rather than repeating it', async () => {
    // The guard against the failure this ticket exists to avoid: a second copy
    // of the dates, in the essay, drifting from the ledger that owns them.
    const ledger = await readFile(join(process.cwd(), 'data', 'dacia', 'name-uses.csv'), 'utf8');
    for (const career of careers) {
      expect(ledger, career.id).toContain(career.id);
      if (career.periodFrom !== null) expect(ledger).toContain(String(career.periodFrom));
    }
    const essay = await readFile(
      join(process.cwd(), 'src', 'content', 'essays', `${NOMEN_ERRANS_ESSAY}.mdx`),
      'utf8',
    );
    for (const career of careers) {
      expect(essay, `${career.id} must not be spelled out in the prose`).not.toContain(career.id);
    }
  });
});

describe('the Atlas leg', () => {
  it('links a career only where a layer honestly covers its referent', () => {
    for (const career of careers) {
      const state = atlasStateFor(career);
      expect(career.atlas, career.id).not.toBeNull();
      expect(career.atlas!.note, career.id).toBeTruthy();
      if (career.atlas!.coverage === 'in_coverage') {
        expect(state, career.id).not.toBeNull();
        expect(state!.layers!.length, career.id).toBeGreaterThan(0);
      } else {
        // No layer covers it, so there is no link to open an empty map with.
        expect(state, career.id).toBeNull();
        expect(atlasUrlFor(career), career.id).toBeNull();
      }
    }
    const covered = careers.filter((career) => atlasStateFor(career) !== null);
    expect(covered.length).toBeGreaterThan(0);
    expect(covered.length, 'both outcomes must be present or the rule is untested').toBeLessThan(
      careers.length,
    );
  });

  it('names only layers the registry defines', () => {
    const known = new Set(GEO_LAYERS.map((layer) => layer.id));
    for (const id of nameCareerLayers()) expect(known, id).toContain(id);
  });

  it('restores the layer, the year and the feature it recorded', () => {
    for (const career of careers) {
      const href = atlasUrlFor(career);
      if (!href) continue;
      const state = parseAtlasShareState(href.slice(href.indexOf('?')));
      expect(href.startsWith('/atlas/'), career.id).toBe(true);
      expect(state.layers, career.id).toEqual([...career.atlas!.layers].sort());
      expect(state.year, career.id).toBe(career.atlas!.year ?? undefined);
      expect(state.feature, career.id).toBe(career.atlas!.feature ?? undefined);
      // The reverse leg: the Atlas is told which essay sent the reader.
      expect(state.essay, career.id).toBe(NOMEN_ERRANS_ESSAY);
    }
  });

  it('gives every layer it opens a way back to the essay beat', async () => {
    const byId = new Map(GEO_LAYERS.map((layer) => [layer.id, layer]));
    const essay = await readFile(
      join(process.cwd(), 'src', 'content', 'essays', `${NOMEN_ERRANS_ESSAY}.mdx`),
      'utf8',
    );
    for (const id of nameCareerLayers()) {
      const link = byId.get(id)?.essayLinks.find((entry) => entry.slug === NOMEN_ERRANS_ESSAY);
      expect(link, `${id} offers no way back to the essay`).toBeDefined();
      expect(link!.sectionId, id).toBe(NOMEN_ERRANS_BEAT);
      expect(link!.label, id).toBeTruthy();
      // The beat has to exist in both the frontmatter and the rendered body, or
      // the return link lands on the essay with no anchor to scroll to.
      expect(essay, 'frontmatter anchor').toContain(`- id: ${NOMEN_ERRANS_BEAT}`);
      expect(essay, 'rendered anchor').toContain(`<Section id="${NOMEN_ERRANS_BEAT}"`);
    }
  });
});

describe('lookup', () => {
  it('finds a career by its corpus id and refuses one it does not hold', () => {
    expect(getNameCareer(careers[0].id)?.referentLabel).toBe(careers[0].referentLabel);
    expect(getNameCareer('nmu-not-a-use')).toBeUndefined();
  });
});

describe('the referent-migration map and flow gate', () => {
  it('builds every map state from a reviewed career and its recorded route', () => {
    for (const career of careers) {
      expect(['reviewed', 'approved', 'published'], career.id).toContain(career.reviewState);
      expect(career.atlas, career.id).not.toBeNull();
      expect(career.source?.citation, career.id).toBeTruthy();
      expect(career.locatorTypeLabel, career.id).toBeTruthy();
      expect(career.confidenceLabel, career.id).toBeTruthy();
    }
  });

  it('never exposes a relationship line below human review', () => {
    const publicIds = new Set(careers.map((career) => career.id));
    for (const relation of getNameRelations()) {
      expect(['reviewed', 'approved', 'published'], relation.id).toContain(relation.reviewState);
      expect(relation.reviewer, relation.id).toBeTruthy();
      expect(publicIds, relation.from).toContain(relation.from);
      expect(publicIds, relation.to).toContain(relation.to);
      if (relation.kind === 'continuity') {
        expect(relation.evidenceAttestationId, relation.id).toBeTruthy();
      }
    }

    expect(getNameRelations()).toHaveLength(0);
    expect(getWithheldRelations()).toHaveLength(10);
  });

  it('does not hardcode a second copy of the chronology into the component', async () => {
    const component = await readFile(
      join(process.cwd(), 'src', 'components', 'islands', 'NameMigration.astro'),
      'utf8',
    );
    for (const career of careers) {
      expect(component, career.id).not.toContain(career.id);
      expect(component, career.periodLabel).not.toContain(career.periodLabel);
    }
    expect(component).toContain('getNameCareers()');
    expect(component).toContain('getNameRelations()');
    expect(component).toContain('prefers-reduced-motion: reduce');
  });
});
