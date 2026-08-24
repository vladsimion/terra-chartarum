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
  test('the Atlas introduction uses the same page width as the map below it', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 860 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await openAtlas(page);
      const widths = await page.evaluate(() => ({
        introduction: document.querySelector('.atlas-head')!.getBoundingClientRect().width,
        atlas: document.querySelector('[data-atlasmap]')!.getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(
        Math.abs(widths.introduction - widths.atlas),
        `${viewport.width}px viewport`,
      ).toBeLessThan(1);
      expect(widths.overflow, `${viewport.width}px viewport`).toBe(0);
    }
  });

  test('activating a layer fits its bounds and selects its canonical reveal year', async ({
    page,
  }) => {
    await openAtlas(page);
    const atlas = page.locator('[data-atlasmap]');
    await expect(atlas).toHaveAttribute('data-map-ready', 'true', { timeout: MAP_READY });

    // The default base layer goes through the same activation path. Its authored
    // date is newer than the corpus slider, so the UI clamps it to the slider max.
    await expect(atlas).toHaveAttribute('data-atlas-fitted-layer', 'ne-coastline');
    const year = page.getByRole('slider', { name: 'Reveal through' });
    await expect(year).toHaveValue((await year.getAttribute('max'))!);

    await page.locator('[data-layer-search]').fill('galley routes');
    const venetian = page.locator(
      '[data-lens-panel="themes"] [data-row-wrap="venetian-routes"] input[data-layer]',
    );
    await venetian.check();
    await expect(atlas).toHaveAttribute('data-atlas-fitted-layer', 'venetian-routes');
    await expect(atlas).toHaveAttribute('data-atlas-reveal-year', '1400');
    await expect(year).toHaveValue('1400');
    expect(JSON.parse((await atlas.getAttribute('data-atlas-fitted-bounds'))!)).toEqual([
      [12.335, 31.2],
      [39.723, 47.1133],
    ]);

    // A second activation replaces both where and when, rather than retaining
    // the Venetian camera/date.
    await page.locator('[data-layer-search]').fill('roman empire');
    await page
      .locator('[data-lens-panel="themes"] [data-row-wrap="roman-empire-117"] input[data-layer]')
      .check();
    await expect(atlas).toHaveAttribute('data-atlas-fitted-layer', 'roman-empire-117');
    await expect(atlas).toHaveAttribute('data-atlas-reveal-year', '117');
    await expect(year).toHaveValue('117');
  });

  test('an info button scrolls and moves focus to the visible context panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await openAtlas(page);
    await page.locator('[data-layer-search]').fill('treaty frontiers');
    const row = page.locator('[data-lens-panel="themes"] [data-row-wrap="dacia-treaty-frontiers"]');
    await row.locator('[data-inspect]').click();

    const context = page.locator('[data-atlas-context-region]');
    await expect(page.locator('[data-dossier-for="dacia-treaty-frontiers"]')).toBeVisible();
    await expect(context).toBeFocused();
    await expect
      .poll(async () =>
        context.evaluate((element) => {
          const header = document.querySelector<HTMLElement>('.site-header');
          return Math.round(element.getBoundingClientRect().top - (header?.offsetHeight ?? 0));
        }),
      )
      .toBeGreaterThanOrEqual(0);
    expect(
      await context.evaluate((element) => {
        const header = document.querySelector<HTMLElement>('.site-header');
        return element.getBoundingClientRect().top - (header?.offsetHeight ?? 0);
      }),
    ).toBeLessThan(40);
  });

  test('info navigation closes the mobile sheet and respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await openAtlas(page);

    const context = page.locator('[data-atlas-context-region]');
    await context.evaluate((element) => {
      const original = element.scrollIntoView.bind(element);
      element.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
        if (typeof options === 'object') element.dataset.scrollBehavior = options.behavior ?? '';
        original(options);
      };
    });

    await page.locator('[data-browser-drawer]').click();
    await page.locator('[data-layer-search]').fill('treaty frontiers');
    await page
      .locator('[data-lens-panel="themes"] [data-row-wrap="dacia-treaty-frontiers"] [data-inspect]')
      .click();

    await expect(page.locator('[data-browser-sheet]')).toBeHidden();
    await expect(context).toBeFocused();
    await expect(context).toHaveAttribute('data-scroll-behavior', 'auto');
    await expect(context).toBeInViewport();
  });

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

  // --- Share and deep-link state (ATLAS-1209 / KAN-405) ---

  test('a shared link restores the view it was seen through', async ({ page }) => {
    await page.goto(
      '/atlas/?lens=rooms&collection=hanseatic-world&layer=hanseatic-routes&relevant=1&year=1400',
    );
    await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
      timeout: MAP_READY,
    });

    await expect(page.locator('[data-lens="rooms"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-year-relevance]')).toBeChecked();
    await expect(page.locator('[data-dossier-for="hanseatic-routes"]')).toBeVisible();
    await expect(page.locator('input[type="range"]')).toHaveValue('1400');
  });

  test('collection context restores without drawing the collection', async ({ page }) => {
    await page.goto('/atlas/?lens=collections&collection=venetian-maritime-network');
    await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
      timeout: MAP_READY,
    });

    // The argument is open...
    await expect(page.locator('[data-group-toggle="venetian-maritime-network"]')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // ...and nothing was drawn on the reader's behalf.
    await expect(inComposition(page, /ports/i)).toHaveCount(0);
    await expect(inComposition(page, /galley routes/i)).toHaveCount(0);
  });

  test('an unknown lens, collection or layer still opens a working Atlas', async ({ page }) => {
    await page.goto('/atlas/?lens=galaxies&collection=no-such-collection&layer=retired-layer');
    await expect(page.locator('[data-atlasmap][data-layer-browser-ready="true"]')).toBeAttached({
      timeout: MAP_READY,
    });

    // Falls back to the default lens rather than failing to render.
    await expect(page.locator('[data-lens="themes"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-dossier-for]:not([hidden])')).toHaveCount(0);
    await expect(page.locator('[data-layer-browser]')).toBeVisible();
  });

  test('catalogue state is recorded in the URL as the reader moves', async ({ page }) => {
    await openAtlas(page);

    await page.locator('[data-lens="rooms"]').click();
    await expect(page).toHaveURL(/lens=rooms/);

    // The default lens is the absence of the parameter, not `lens=themes`:
    // an unshared default should not clutter a scholarly link.
    await page.locator('[data-lens="themes"]').click();
    await expect(page).not.toHaveURL(/lens=/);
  });

  // --- Responsive shell and keyboard operation (ATLAS-1210 / KAN-406) ---

  test('the catalogue becomes a dismissible sheet on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openAtlas(page);

    const trigger = page.locator('[data-browser-drawer]');
    const sheet = page.locator('[data-browser-sheet]');
    await expect(trigger).toBeVisible();
    await expect(sheet).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(sheet).toBeVisible();

    // Escape closes it and hands focus back to the control that opened it, so a
    // keyboard user is never left inside a hidden panel.
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('closing the sheet preserves search, year and composition', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openAtlas(page);

    await page.locator('[data-browser-drawer]').click();
    await page.locator('[data-layer-search]').fill('treaty frontiers');
    await page.locator('input[type="range"]').fill('1850');
    await page.locator('[data-browser-close]').click();
    await expect(page.locator('[data-browser-sheet]')).toBeHidden();

    await page.locator('[data-browser-drawer]').click();
    await expect(page.locator('[data-layer-search]')).toHaveValue('treaty frontiers');
    await expect(page.locator('input[type="range"]')).toHaveValue('1850');
  });

  test('the catalogue is inline on a desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await openAtlas(page);
    await expect(page.locator('[data-browser-drawer]')).toBeHidden();
    await expect(page.locator('[data-browser-sheet]')).toBeVisible();
  });

  test('the whole layer-management path works without a pointer', async ({ page }) => {
    await openAtlas(page);

    // Switch lens.
    await page.locator('[data-lens="collections"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-lens="collections"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Expand a collection.
    const toggle = page.locator('[data-group-toggle="venetian-maritime-network"]');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Activate its defaults.
    await page.locator('[data-activate-collection="venetian-maritime-network"]').focus();
    await page.keyboard.press('Enter');
    await expect(inComposition(page, /ports/i)).toHaveCount(1, { timeout: MAP_READY });

    // Inspect from the Active Layers panel.
    await page.locator('.aal-inspect').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-dossier-for]:not([hidden])')).toHaveCount(1);

    // Dismiss the inspector.
    await page.locator('[data-inspector-close]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-dossier-for]:not([hidden])')).toHaveCount(0);

    // Remove a layer, and land on something focusable.
    await page.locator('.aal-remove').first().focus();
    await page.keyboard.press('Enter');
    await expect(inComposition(page, /ports/i)).toHaveCount(0);
    await expect(page.locator(':focus')).toHaveCount(1);
  });

  test('meaning does not depend on colour alone', async ({ page }) => {
    await openAtlas(page);

    // The selected lens carries weight and an inset rule, not just a hue.
    await page.locator('[data-lens="rooms"]').click();
    const weight = await page
      .locator('[data-lens="rooms"]')
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(Number(weight)).toBeGreaterThanOrEqual(600);

    // Out-of-year state is words, not a colour swatch.
    await page.locator('[data-lens="collections"]').click();
    await page
      .locator('[data-activate-collection="venetian-maritime-network"]')
      .click({ timeout: MAP_READY });
    await expect(inComposition(page, /ports/i)).toHaveCount(1, { timeout: MAP_READY });
    await page.locator('input[type="range"]').fill('200');
    await expect(page.locator('.aal-outside').first()).toHaveText(/outside selected year/i);
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
