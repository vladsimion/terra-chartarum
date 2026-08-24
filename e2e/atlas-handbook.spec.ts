import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Atlas <-> Handbook integration (ATLAS-1219 / KAN-415) and the shared reader
// apparatus (ATLAS-1220 / KAN-416).
//
// The contract under test: a reader reaches a layer's scholarship through
// Terra Chartarum, never through GitHub, and can get back to the view they left.

// Deliberately NOT asking for software GL. Nothing here needs the map: the
// catalogue markup is server-rendered, the readiness signal fires from the
// island's own script, and every assertion is about navigation, prose and
// metadata. Holding a MapLibre context would only make this file compete with
// the specs that genuinely need one, which is what made it flake under the full
// parallel suite.
test.describe.configure({ mode: 'default' });

const MAP_READY = 20_000;

const openAtlas = async (page: Page) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
    timeout: MAP_READY,
  });
};

/** Reveal a layer's row in the Themes lens by opening every group. */
const revealRow = async (page: Page, layer: string) => {
  const toggles = page.locator('[data-lens-panel="themes"] [data-group-toggle]');
  for (let index = 0; index < (await toggles.count()); index += 1) {
    const toggle = toggles.nth(index);
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  const row = page.locator(`[data-lens-panel="themes"] [data-row-wrap="${layer}"]`);
  await expect(row).toBeVisible();
  return row;
};

const PROGRAMMES = [
  { layer: 'dacia-treaty-frontiers', heading: /Treaty frontiers/i },
  { layer: 'venetian-routes', heading: /galley routes/i },
  { layer: 'hanseatic-routes', heading: /trade corridors/i },
];

test.describe('Atlas to Handbook and back', () => {
  for (const programme of PROGRAMMES) {
    test(`${programme.layer} round-trips through its public record`, async ({ page }) => {
      await openAtlas(page);
      const row = await revealRow(page, programme.layer);

      // Inspecting explains without drawing.
      await row.locator('[data-inspect]').click();
      const dossier = page.locator(`[data-dossier-for="${programme.layer}"]`);
      await expect(dossier).toBeVisible();
      await expect(dossier.locator('.am-dossier-claim')).not.toBeEmpty();
      await expect(row.locator('input[data-layer]')).not.toBeChecked();

      // The contextual reading action stays on Terra Chartarum.
      const about = dossier.locator(`[data-about-sources="${programme.layer}"]`);
      await expect(about).toHaveText(/How to read this layer/i);
      await expect(about).toBeVisible();
      await about.click();

      // The site uses client-side view transitions, so the URL settles after the
      // click rather than with it. waitForURL is the honest wait here; a bare
      // toHaveURL races the transition under a loaded suite.
      await page.waitForURL(new RegExp(`/atlas/layers/${programme.layer}/`), {
        timeout: MAP_READY,
      });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(programme.heading);

      // ...and back.
      await page.locator('[data-open-atlas]').click();
      await page.waitForURL(/\/atlas\/\?/, { timeout: MAP_READY });
      await expect(page.locator('[data-layer-browser]')).toBeVisible();
    });
  }

  test('the return link hands back the year and composition the reader left', async ({ page }) => {
    await openAtlas(page);
    await page.locator('[data-lens="collections"]').click();
    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });
    await page.locator('input[type="range"]').fill('1350');
    await page.locator('.aal-inspect').first().click();

    const about = page.locator('[data-about-sources]:visible').first();
    await about.click();
    await page.waitForURL(/year=1350/, { timeout: MAP_READY });

    const back = page.locator('[data-open-atlas]');
    await expect(back).toHaveAttribute('href', /year=1350/);
    await expect(back).toHaveAttribute('href', /layers=venetian/);
  });

  test('a layer record is reachable without JavaScript', async ({ browser }) => {
    // The no-script path is also the no-WebGL path: the row's About control is a
    // real link, not an affordance the island has to wire up.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/atlas/');
    const link = page.locator('[data-row-wrap="dacia-treaty-frontiers"] .alb-row-doc').first();
    await expect(link).toHaveAttribute('href', '/atlas/layers/dacia-treaty-frontiers/');
    await context.close();
  });

  test('newcomers can reach the Handbook before manipulating the map', async ({ page }) => {
    await page.goto('/atlas/');
    await expect(page.getByRole('link', { name: 'Read the Handbook →' })).toBeVisible();
    await expect(page.locator('[data-atlasmap] .am-handbook')).toHaveAccessibleName('Handbook');

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Read the handbook' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Footer' }).getByRole('link', {
        name: 'Atlas Handbook',
      }),
    ).toBeVisible();
  });
});

test.describe('the public record needs no repository', () => {
  for (const programme of PROGRAMMES) {
    test(`${programme.layer} explains itself without a GitHub link in its prose`, async ({
      page,
    }) => {
      await page.goto(`/atlas/layers/${programme.layer}/`);

      // Every historical claim is on the page itself.
      const prose = page.locator('.prose');
      await expect(prose).toContainText(/what you are looking at/i);
      expect(await prose.locator('a[href*="github.com"]').count()).toBe(0);

      // GitHub exists, collapsed, behind a deliberate disclosure.
      const technical = page.locator('.technical');
      await expect(technical).toBeAttached();
      expect(await technical.locator('a[href*="github.com"]').count()).toBeGreaterThan(0);

      // And no public path asks for a login.
      expect(await page.locator('a[href*="atlassian.net"]').count()).toBe(0);
    });
  }
});

test.describe('citation, download and rights', () => {
  test('a full scholarly layer offers a citation in three formats', async ({ page }) => {
    await page.goto('/atlas/layers/dacia-treaty-frontiers/');
    const cite = page.locator('[data-cite]');
    await expect(cite).toBeVisible();
    for (const format of ['bibtex', 'ris', 'chicago']) {
      await expect(cite.locator(`[data-cite-fmt="${format}"]`)).toBeVisible();
    }
    // The rendered citation pins the bytes, not the day you looked.
    await expect(cite.locator('[data-cite-out]')).toContainText(/Release geo-/);
  });

  test('the download states its format, size and release', async ({ page }) => {
    await page.goto('/atlas/layers/venetian-routes/');
    const download = page.locator('[data-download]');
    await expect(download).toBeVisible();
    await expect(download).toContainText(/flatgeobuf/i);
    await expect(download).toContainText(/release geo-/);
    await expect(download.locator('a')).toHaveAttribute('href', /\/geo\/.*\?v=/);
  });

  test('a minimal context record carries its licence without scholarly apparatus', async ({
    page,
  }) => {
    await page.goto('/atlas/layers/ne-coastline/');
    await expect(page.locator('.cite-panel')).toContainText(/Public Domain/i);
    await expect(page.locator('.prose')).not.toContainText(/Reconstruction and uncertainty/i);
  });
});

test.describe('the shared reader apparatus', () => {
  test('the glossary defines the shared evidence and time concepts', async ({ page }) => {
    await page.goto('/atlas/handbook/glossary/');
    for (const term of [
      'valid_from',
      'Per-feature time',
      'Source locator',
      'Canonical ID',
      'Modern reference versus historical evidence',
    ]) {
      await expect(page.locator('.prose')).toContainText(term);
    }
  });

  test('programme vocabularies stay separate rather than flattened', async ({ page }) => {
    await page.goto('/atlas/handbook/glossary/');
    for (const route of ['/data-fields/dacia/', '/data-fields/vmn/', '/data-fields/hanseatic/']) {
      await expect(page.locator(`a[href*="${route}"]`).first()).toBeVisible();
    }
  });

  test('the technical gateway explains reproducibility in reader terms', async ({ page }) => {
    await page.goto('/atlas/handbook/technical/reproducibility/');
    await expect(page.locator('.prose')).toContainText(/SHA-256/);
    await expect(page.locator('.prose')).toContainText(/needed to read the atlas/i);
  });

  test('handbook records are indexed as reference, not as essays', async ({ request }) => {
    const index = await (await request.get('/search-index.json')).json();
    const reference = index.filter((doc: { type: string }) => doc.type === 'reference');
    expect(reference.length).toBeGreaterThan(10);
    for (const doc of reference) {
      expect(doc.url).toMatch(/^\/atlas\//);
      // Only titles and summaries are indexed; a record's body would swamp search.
      expect(doc.text).toBeUndefined();
    }
  });

  test('a layer record has no accessibility violations', async ({ page }) => {
    await page.goto('/atlas/layers/dacia-treaty-frontiers/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
