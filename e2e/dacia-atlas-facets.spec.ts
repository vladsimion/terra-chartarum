import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Corpus facet panel (KAN-340). The filter itself is unit-tested in
// src/lib/geo-style.test.ts; what needs a browser is the contract around it -
// that the panel follows its layer, that a selection is announced and shareable,
// and that a shared link restores exactly what it encoded. MapLibre throws on a
// malformed filter expression, so a clean run is also evidence that the
// composed filter reached the map intact.
// The atlas disables its layer toggles where WebGL is missing, and headless
// chromium has none by default, so this spec asks for a software GL stack.
// Scoped to this file rather than the shared config: the other suites depend on
// the environment they already run in, including the no-WebGL fallback path.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

// Every map here runs on software GL, and the suite is fullyParallel: run this
// file's tests in one worker so it never holds several MapLibre instances at
// once. Ordered rather than serial, so a failure reports the rest instead of
// skipping them.
test.describe.configure({ mode: 'default' });

const RESEARCH_LAYER = 'dacia-attestations-research';
const panel = `[data-facets-for="${RESEARCH_LAYER}"]`;
const status = `[data-facets-status="${RESEARCH_LAYER}"]`;
const facetBox = (field: string, value: string) =>
  `input[data-facet-layer="${RESEARCH_LAYER}"][data-facet-field="${field}"][value="${value}"]`;

// The facet panel appears once the layer is on the map, so this wait is really a
// wait for MapLibre's load hook and the external base style behind it. Under a
// fully parallel suite - several software-GL maps at once - that is slower than
// the default expect timeout, which is the same allowance e2e/vmn-visual.spec.ts
// makes for the same reason.
const MAP_READY = 20_000;

const enableLayer = async (page: import('@playwright/test').Page) => {
  await page.locator(`input[data-layer="${RESEARCH_LAYER}"]`).check();
  await expect(page.locator(panel)).toBeVisible({ timeout: MAP_READY });
};

test.describe('atlas: corpus attestation facets', () => {
  test('the panel appears only while its layer is drawn', async ({ page }) => {
    await page.goto('/atlas');

    // Hidden while the layer is off: a filter for something you cannot see is
    // only clutter.
    await expect(page.locator(panel)).toBeHidden();
    await enableLayer(page);
    await page.locator(`input[data-layer="${RESEARCH_LAYER}"]`).uncheck();
    await expect(page.locator(panel)).toBeHidden();
  });

  test('facets are derived from the data, with vocabulary labels', async ({ page }) => {
    await page.goto('/atlas');
    await enableLayer(page);

    // Labels come from vocabularies.csv, so the panel reads "Ancient Greek"
    // rather than the `grc` that is stored.
    await expect(page.locator(`${panel} >> text=Ancient Greek`)).toBeVisible();
    await expect(page.locator(`${panel} >> text=Extra muros`)).toBeVisible();
    await expect(page.locator(`${panel} legend`, { hasText: 'Kind of source' })).toBeVisible();
  });

  test('selecting widens within a field and is announced', async ({ page }) => {
    await page.goto('/atlas');
    await enableLayer(page);

    await expect(page.locator(status)).toHaveText(/No filters/);
    await page.locator(facetBox('attestation_class', 'variant')).check();
    await page.locator(facetBox('attestation_class', 'extra_muros')).check();

    await expect(page.locator(status)).toHaveText(/Extra muros, Variant/);
    await expect(page).toHaveURL(/facets=/);
  });

  test('clearing restores the unfiltered layer and drops the parameter', async ({ page }) => {
    await page.goto('/atlas');
    await enableLayer(page);

    await page.locator(facetBox('language', 'grc')).check();
    await expect(page).toHaveURL(/facets=/);

    await page.locator(`[data-facets-clear="${RESEARCH_LAYER}"]`).click();
    await expect(page.locator(status)).toHaveText(/No filters/);
    await expect(page).not.toHaveURL(/facets=/);
    await expect(page.locator(facetBox('language', 'grc'))).not.toBeChecked();
  });

  test('a shared link restores the selection it encoded', async ({ page }) => {
    await page.goto(`/atlas?facets=${RESEARCH_LAYER}%3Alanguage%3Dgrc%3Bconfidence%3Dmedium`);

    await expect(page.locator(facetBox('language', 'grc'))).toBeChecked();
    await expect(page.locator(facetBox('confidence', 'medium'))).toBeChecked();

    // Turning the layer on shows the restored selection already in force.
    await enableLayer(page);
    await expect(page.locator(status)).toHaveText(/Ancient Greek.*Medium/);
  });

  test('a hand-edited link cannot filter on a field the layer does not declare', async ({
    page,
  }) => {
    await page.goto(
      `/atlas?facets=${RESEARCH_LAYER}%3Alanguage%3Dnot_a_language%3Bnot_a_field%3Dx`,
    );
    await enableLayer(page);

    // Unknown field and unknown value are both dropped, so the layer is unfiltered.
    await expect(page.locator(status)).toHaveText(/No filters/);
  });

  test('the panel has no accessibility violations', async ({ page }) => {
    await page.goto('/atlas');
    await enableLayer(page);

    const results = await new AxeBuilder({ page })
      .include('.am-layers')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

// Trench A -> corpus links (KAN-339). Terra Sigillata's stones and test pits
// became CND records; what needs a browser is that the essay's references to
// them are live links into the Atlas rather than decoration, and that following
// one arrives with the corpus layer already on.
test.describe('Terra Sigillata corpus references', () => {
  test('every migrated stone and pit carries a corpus reference', async ({ page }) => {
    await page.goto('/essays/dacia/');

    // Twelve stelae migrated; the thirteenth is rhetorical and stays local.
    // Four test pits. A count that drifts means the bridge and the essay have
    // stopped agreeing about what migrated.
    await expect(page.locator('.corpus-ref')).toHaveCount(16);
    await expect(page.locator('.corpus-ref', { hasText: 'src-secret-century' })).toHaveCount(1);
    await expect(page.locator('.corpus-ref', { hasText: 'plc-napoca' })).toHaveCount(1);

    // The pit that conflated two places names both of them.
    const split = page.locator('.corpus-ref', { hasText: 'plc-sarmizegetusa-regia' });
    await expect(split).toContainText('plc-ulpia-traiana-sarmizegetusa');
  });

  test('a pit reference opens the Atlas with the corpus layer already on', async ({ page }) => {
    await page.goto('/essays/dacia/');

    const link = page
      .locator('.corpus-ref', { hasText: 'plc-napoca' })
      .getByRole('link', { name: /Atlas/ });
    await expect(link).toHaveAttribute('href', new RegExp(`layers=${RESEARCH_LAYER}`));
    await expect(link).toHaveAttribute('href', /feature=att-/);

    // The research tier, not the public one: CND 0.1 is a pilot and the public
    // layer is empty by design, so linking there would open an empty map.
    await expect(link).not.toHaveAttribute('href', /layers=dacia-attestations(&|$)/);
  });
});

// The shared GIS family (KAN-341, KAN-342, KAN-343). The tables and their rules
// are gated in scripts/dacia; what needs a browser is that each layer reaches
// the map, that its provenance and source metadata arrive with it, and that the
// principality phases appear and disappear with the slider rather than sitting
// on the map as one timeless outline.
test.describe('shared Dacia GIS layers', () => {
  const GIS_LAYERS = [
    'dacia-roman-sites',
    'dacia-roman-network',
    'dacia-principalities',
    'dacia-josephinian-sheets',
  ];

  test('every layer registers, toggles and declares its provenance facet', async ({ page }) => {
    await page.goto('/atlas');

    for (const layer of GIS_LAYERS) {
      const toggle = page.locator(`input[data-layer="${layer}"]`);
      await expect(toggle).toHaveCount(1);
      await toggle.check({ timeout: MAP_READY });
      await expect(toggle).toBeChecked({ timeout: MAP_READY });
    }

    // Provenance is a declared facet on both layers that carry drawn geometry,
    // so a reader can filter the editorial lines out of what they are looking at.
    await expect(
      page.locator(
        'input[data-facet-layer="dacia-roman-network"][data-facet-field="feature_type"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      page.locator(
        'input[data-facet-layer="dacia-principalities"][data-facet-field="sovereignty"]',
      ),
    ).not.toHaveCount(0);
  });

  test('a Josephinian footprint carries its repository and redistributes no scan', async ({
    page,
  }) => {
    await page.goto('/atlas');
    const sheet = await page.evaluate(async () => {
      const response = await fetch('/geo/dacia-josephinian-sheets.geojson');
      const data = await response.json();
      return data.features[0].properties;
    });

    expect(sheet.repository).toContain('Kriegsarchiv');
    expect(sheet.source_url).toMatch(/^https:/);
    expect(sheet.scan_redistributed).toBe('no');
    expect(sheet.footprint_provenance).toBe('editorial_reconstruction');
  });
});
