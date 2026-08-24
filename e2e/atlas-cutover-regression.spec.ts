import { test, expect, type Page } from '@playwright/test';

// The cutover regression matrix (ATLAS-1222 / KAN-418, ATLAS-1212 / KAN-408).
//
// Scoped to the matrix items not already covered elsewhere: the VMN visual
// scrub, the CND facets, the Hanseatic gazetteer, the browser interactions and
// the Handbook round trips each have their own spec, and duplicating them here
// would mean two places to update when a contract changes.

test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});
test.describe.configure({ mode: 'default' });

const MAP_READY = 20_000;

const openAtlas = async (page: Page) => {
  await page.goto('/atlas/');
  await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
    timeout: MAP_READY,
  });
};

test.describe('context and reference layers', () => {
  test('the coastline is the default base and stays outside the historical taxonomy', async ({
    page,
  }) => {
    await openAtlas(page);
    const coastline = page.locator('.alb-context input[data-layer="ne-coastline"]');
    await expect(coastline).toBeChecked();
    // Context lives in its own fieldset, never among the themes.
    await expect(page.locator('[data-lens-panel="themes"] [data-row="ne-coastline"]')).toHaveCount(
      0,
    );
  });

  test('modern boundaries are labelled anachronistic wherever they appear', async ({ page }) => {
    await openAtlas(page);
    await expect(page.locator('.alb-anachronism')).toContainText(/anachronism/i);

    await page.goto('/atlas/layers/ne-boundaries/');
    await expect(page.locator('.anachronism')).toContainText(/anachronism/i);
  });

  test('Roman Empire AD 117 documents its extent as a reconstruction', async ({ page }) => {
    await page.goto('/atlas/layers/roman-empire-117/');
    await expect(page.locator('.prose')).toContainText(/reach/i);
    await expect(page.locator('.prose')).toContainText(/not about a border/i);
    await expect(page.locator('.facts')).toContainText('roman-empire-117');
  });

  test('depicted extents are documented as evidence about maps', async ({ page }) => {
    await page.goto('/atlas/layers/map-coverage/');
    await expect(page.locator('.facts')).toContainText(/evidence/);
    await expect(page.locator('.prose')).toContainText(
      /statement about a \*\*document\*\*|document/i,
    );
  });
});

test.describe('state and sharing survive the cutover', () => {
  test('Copy this view produces a restorable link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openAtlas(page);

    await page.locator('[data-lens="collections"]').click();
    await page
      .locator('[data-activate-collection="corpus-chartarum-daciae"]')
      .click({ timeout: MAP_READY });
    await page.locator('input[type="range"]').fill('1850');
    await page.locator('.am-share-button').click();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('year=1850');
    expect(copied).toContain('layers=');

    // The link restores in a fresh page.
    await page.goto(copied);
    await expect(page.locator('input[type="range"]')).toHaveValue('1850');
  });

  test('an essay deep link still restores its layer and year', async ({ page }) => {
    // The pre-existing contract (KAN-172/189-192), unchanged by the new browser.
    await page.goto('/atlas?year=1400&layers=venetian-routes');
    await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
      timeout: MAP_READY,
    });
    await expect(page.locator('input[type="range"]')).toHaveValue('1400');
    await expect(page.locator('input[data-layer="venetian-routes"]').first()).toBeChecked({
      timeout: MAP_READY,
    });
  });
});

test.describe('release filtering and leakage', () => {
  test('no public Atlas or Handbook page exposes a governance surface', async ({ page }) => {
    for (const route of [
      '/atlas/',
      '/atlas/handbook/',
      '/atlas/layers/dacia-treaty-frontiers/',
      '/atlas/handbook/evidence/vmn-sources/',
      '/bibliography/',
    ]) {
      await page.goto(route);
      expect(await page.locator('a[href*="atlassian.net"]').count(), route).toBe(0);
    }
  });

  test('the bibliography resolves citations inside Terra Chartarum', async ({ page }) => {
    await page.goto('/bibliography/');
    const docs = page.locator('.dataset-docs');
    await expect(docs.locator('a[href="/atlas/handbook/evidence/vmn-sources/"]')).toBeVisible();
    expect(await docs.locator('a[href*="github.com"]').count()).toBe(0);
  });

  test('only released essays are reachable from a layer record', async ({ page }) => {
    await page.goto('/atlas/layers/dacia-treaty-frontiers/');
    const links = page.locator('.related a[href^="/essays/"]');
    for (let index = 0; index < (await links.count()); index += 1) {
      const href = await links.nth(index).getAttribute('href');
      const response = await page.request.get(href!);
      // A held essay has no page; a link to one would be a leak.
      expect(response.status(), href!).toBe(200);
    }
  });
});

test.describe('the legacy presentation is gone', () => {
  test('no flat unbounded layer fieldset remains', async ({ page }) => {
    await openAtlas(page);
    await expect(page.locator('.am-layers')).toHaveCount(0);
    await expect(page.locator('.am-layer-docs')).toHaveCount(0);
    await expect(page.locator('.is-pending')).toHaveCount(0);
    await expect(page.locator('[data-layer-browser]')).toBeVisible();
  });

  test('the Atlas introduction speaks about history, not deployment', async ({ page }) => {
    await page.goto('/atlas/');
    const lede = page.locator('.atlas-head');
    await expect(lede).toContainText(/reconstructed territories, routes, frontiers/i);
    await expect(lede).not.toContainText(/Regime A|serverless/i);
    // Scoped to the prose, not the whole header: the handbook callout added
    // alongside it (atlas.astro) puts a second link to the same href inside
    // .atlas-head, and an unscoped locator matches both. What this case pins is
    // that the introduction itself hands the reader on to the Handbook.
    await expect(lede.locator('.lede a[href="/atlas/handbook/"]')).toBeVisible();
  });

  test('the migration report covers every registered layer', async ({ request }) => {
    const report = await (await request.get('/data/atlas-catalogue.json')).json();
    expect(report.layers).toHaveLength(report.layerCount);
    for (const layer of report.layers) {
      expect(layer.role, layer.id).toBeTruthy();
      expect(layer.lifecycle, layer.id).toBeTruthy();
      expect(layer.documentationRoute, layer.id).toBeTruthy();
    }
  });
});
