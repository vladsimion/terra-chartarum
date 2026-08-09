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

const RESEARCH_LAYER = 'dacia-attestations-research';
const panel = `[data-facets-for="${RESEARCH_LAYER}"]`;
const status = `[data-facets-status="${RESEARCH_LAYER}"]`;
const facetBox = (field: string, value: string) =>
  `input[data-facet-layer="${RESEARCH_LAYER}"][data-facet-field="${field}"][value="${value}"]`;

const enableLayer = async (page: import('@playwright/test').Page) => {
  await page.locator(`input[data-layer="${RESEARCH_LAYER}"]`).check();
  await expect(page.locator(panel)).toBeVisible();
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
