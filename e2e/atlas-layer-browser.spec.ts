import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The scalable layer browser (KAN-400), Active Layers (KAN-401), inspector focus
// (KAN-402) and catalogue search (KAN-403). What needs a browser here is the
// contract between the surfaces: that they cannot disagree about what is drawn,
// and that neither searching nor moving the year ever changes the composition.
//
// The map itself needs software GL, for the same reason the facet spec does.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});
test.describe.configure({ mode: 'default' });

const MAP_READY = 20_000;

// The browser's markup is server-rendered and inert until the island's script
// binds to it, so every test waits for the readiness signal before clicking.
// Without this the suite races the module load and fails in a different place
// each run.
const openAtlas = async (page: Page) => {
  await page.goto('/atlas');
  await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
    timeout: MAP_READY,
  });
};

// These tests assert which layers are in the composition rather than how many.
// The default-on base geography only joins when MapLibre finishes loading, so a
// raw count is true only after that; naming the layers is both independent of
// the map and a better statement of what the panel is for.
const inComposition = (page: Page, title: string | RegExp) =>
  page.locator('.aal-item .aal-name').filter({ hasText: title });
const activeNames = (page: Page) => page.locator('.aal-item .aal-name');

const openCollections = async (page: Page) => {
  await page.locator('[data-lens="collections"]').click();
  await expect(page.locator('[data-lens-panel="collections"]')).toBeVisible();
};

test.describe('atlas layer browser', () => {
  test('the flat pending list is gone and context is separated from history', async ({ page }) => {
    await openAtlas(page);

    // KAN-404: no long tail of disabled rows standing in for unfinished work.
    await expect(page.locator('.is-pending')).toHaveCount(0);
    await expect(page.locator('.am-layers')).toHaveCount(0);

    // KAN-400: map context is its own fieldset, and says what it is.
    const context = page.locator('.alb-context');
    await expect(context).toBeVisible();
    await expect(context).toContainText('anachronism');
  });

  test('activating a collection draws its defaults and only its defaults', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);

    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });

    await expect(inComposition(page, /ports/i)).toHaveCount(1, { timeout: MAP_READY });
    await expect(inComposition(page, /galley routes/i)).toHaveCount(1);
    // possessions is a member of the collection but not one of its defaults.
    await expect(inComposition(page, /possessions/i)).toHaveCount(0);
    await expect(
      page.locator('input[data-layer="venetian-possessions"]').first(),
    ).not.toBeChecked();
  });

  test('every lens agrees about one canonical layer', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);
    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });

    const boxes = page.locator('input[data-layer="venetian-routes"]');
    const total = await boxes.count();
    expect(total).toBeGreaterThan(1); // the layer really is rendered in several lenses
    for (let index = 0; index < total; index += 1) {
      await expect(boxes.nth(index)).toBeChecked();
    }
  });

  test('switching lens changes what you look through, not what is drawn', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);
    await page
      .locator('[data-activate-collection="hanseatic-world"]')
      .click({ timeout: MAP_READY });
    await expect(inComposition(page, /Hanseatic places/i)).toHaveCount(1, { timeout: MAP_READY });

    await page.locator('[data-lens="rooms"]').click();
    await expect(inComposition(page, /Hanseatic places/i)).toHaveCount(1);
    await expect(inComposition(page, /Hanseatic trade corridors/i)).toHaveCount(1);
    await page.locator('[data-lens="themes"]').click();
    await expect(inComposition(page, /Hanseatic places/i)).toHaveCount(1);
  });

  test('moving the year marks a layer rather than removing it', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);
    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });
    await expect(inComposition(page, /ports/i)).toHaveCount(1, { timeout: MAP_READY });

    // AD 200 is far outside the Venetian envelope of 1200-1500.
    await page.locator('input[type="range"]').fill('200');
    await expect(inComposition(page, /ports/i)).toHaveCount(1);
    await expect(inComposition(page, /galley routes/i)).toHaveCount(1);
    await expect(page.locator('.aal-outside')).toHaveCount(2);
    await expect(page.locator('[data-active-note]')).toBeVisible();
  });

  test('search finds a layer by tokens and never activates one', async ({ page }) => {
    await openAtlas(page);
    const before = await activeNames(page).count();

    // Two tokens, in an order the title does not use.
    await page.locator('[data-layer-search]').fill('events hanseatic');
    await expect(page.locator('[data-layer-found]')).toHaveText('1 matching layer');
    await expect(
      page.locator('[data-lens-panel="themes"] [data-row-wrap="hanseatic-events"]'),
    ).toBeVisible();
    await expect(activeNames(page)).toHaveCount(before);

    await page.locator('[data-layer-search]').fill('zzzz-no-such-layer');
    await expect(page.locator('[data-lens-empty="themes"]')).toBeVisible();
  });

  test('inspecting a layer explains it without drawing it', async ({ page }) => {
    await openAtlas(page);
    await page.locator('[data-layer-search]').fill('treaty frontiers');
    const row = page.locator('[data-lens-panel="themes"] [data-row-wrap="dacia-treaty-frontiers"]');
    await expect(row).toBeVisible();

    await row.locator('[data-inspect]').click();
    const dossier = page.locator('[data-dossier-for="dacia-treaty-frontiers"]');
    await expect(dossier).toBeVisible();
    await expect(dossier).toContainText('Licence');
    // Focus is not activation.
    await expect(row.locator('input[data-layer]')).not.toBeChecked();
    // Exactly one dossier is ever open.
    await expect(page.locator('[data-dossier-for]:not([hidden])')).toHaveCount(1);
  });

  test('the composition can be cleared from the keyboard', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);
    await page
      .locator('[data-activate-collection="corpus-chartarum-daciae"]')
      .click({ timeout: MAP_READY });
    await expect(inComposition(page, /Treaty frontiers/i)).toHaveCount(1, { timeout: MAP_READY });

    const clear = page.locator('[data-active-clear]');
    await clear.focus();
    await page.keyboard.press('Enter');
    // Clear all removes what the reader chose. Base geography is not the
    // reader's choice, so the panel hides rather than emptying the map.
    await expect(inComposition(page, /Treaty frontiers/i)).toHaveCount(0);
    await expect(inComposition(page, /Principalities/i)).toHaveCount(0);
    await expect(page.locator('[data-active-layers]')).toBeHidden();
  });

  test('the browser has no accessibility violations', async ({ page }) => {
    await openAtlas(page);
    await openCollections(page);
    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });
    await expect(inComposition(page, /ports/i)).toHaveCount(1, { timeout: MAP_READY });

    const results = await new AxeBuilder({ page })
      .include('[data-layer-browser]')
      .include('[data-active-layers]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
