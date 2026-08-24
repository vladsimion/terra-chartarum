import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * TERRA INCOGNITA, checked on the page it will actually ship on
 * (ANT-5 / ANT-10 / ANT-13, KAN-424 / KAN-429 / KAN-432).
 *
 * Runs only under `playwright.held.config.ts`, against a build made with
 * SHOW_UNRELEASED=1. The ordinary suite proves the essay is not served; this
 * one proves that what is being withheld is finished, so that release day is a
 * decision about evidence and not a scramble to fix a page nobody could load.
 *
 * Everything here is verifiable without a reviewer: markup, keyboard, layout,
 * link targets. Nothing here asserts the essay is ready to publish.
 */
const ESSAY = '/essays/terra-incognita/';
const FIGURES = [
  { name: "Cook's Blank", root: '[data-cooks-blank]', buttons: '.cb-button' },
  { name: 'Endurance drift', root: '[data-endurance]', buttons: '.ed-button' },
];

test.describe('the held essay renders', () => {
  test('the route is served when the hold is lifted', async ({ page }) => {
    const response = await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    // Exactly one level-one heading. The page had none until this spec looked:
    // the layout renders no title of its own, so the h1 has to come from the
    // essay body, and every heading on the page was an h2.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Terra Incognita');
  });

  test('all nine acts are present and in order', async ({ page }) => {
    await page.goto(ESSAY);
    const acts = [
      'necessitas',
      'auctoritas',
      'orbis',
      'vacuum',
      'limen',
      'error',
      'forma',
      'deriva',
      'coordinata',
    ];
    const ids = await page.locator('section[id]').evaluateAll((nodes) => nodes.map((n) => n.id));
    expect(ids.filter((id) => acts.includes(id))).toEqual(acts);
  });

  test('both interactives are on the page', async ({ page }) => {
    await page.goto(ESSAY);
    for (const figure of FIGURES) {
      await expect(page.locator(figure.root), figure.name).toHaveCount(1);
    }
  });
});

test.describe('accessibility', () => {
  // Recorded as unverified by KAN-432 because there was no page to load. There
  // is one now.
  test('the essay has no WCAG A/AA violations', async ({ page }) => {
    await page.goto(ESSAY);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('each figure steps with the keyboard and reports its state', async ({ page }) => {
    await page.goto(ESSAY);
    for (const figure of FIGURES) {
      const buttons = page.locator(`${figure.root} ${figure.buttons}`);
      const count = await buttons.count();
      expect(count, figure.name).toBeGreaterThan(1);

      await buttons.first().focus();
      await expect(buttons.first(), figure.name).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('ArrowRight');
      await expect(buttons.nth(1), figure.name).toHaveAttribute('aria-pressed', 'true');
      await expect(buttons.first(), figure.name).toHaveAttribute('aria-pressed', 'false');

      await page.keyboard.press('End');
      await expect(buttons.nth(count - 1), figure.name).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('Home');
      await expect(buttons.first(), figure.name).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('every step control clears the 44px touch target', async ({ page }) => {
    await page.goto(ESSAY);
    for (const figure of FIGURES) {
      const buttons = page.locator(`${figure.root} ${figure.buttons}`);
      for (let i = 0; i < (await buttons.count()); i += 1) {
        const box = await buttons.nth(i).boundingBox();
        expect(box, `${figure.name} ${i}`).not.toBeNull();
        expect(box!.height, `${figure.name} ${i} height`).toBeGreaterThanOrEqual(44);
        expect(box!.width, `${figure.name} ${i} width`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('the transcript is reachable without operating the stepper', async ({ page }) => {
    await page.goto(ESSAY);
    // The argument has to survive a reader who would rather read than click.
    // The two figures transcribe differently on purpose - Cook's four steps are
    // a list, the Endurance record is two captioned tables - so this asserts
    // that something readable opens, not that both chose the same element.
    for (const figure of FIGURES) {
      const details = page.locator(`${figure.root} details`);
      await expect(details, figure.name).not.toHaveCount(0);
      await details.first().locator('summary').click();
      const rows = details.first().locator('li, tbody tr');
      expect(await rows.count(), figure.name).toBeGreaterThan(0);
      await expect(rows.first(), figure.name).toBeVisible();
    }
  });
});

test.describe('the page works on a phone', () => {
  test('nothing overflows the viewport horizontally', async ({ page }) => {
    await page.goto(ESSAY);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // One pixel of rounding is not a layout bug; a scrollable page is.
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('each figure fits its column', async ({ page }) => {
    await page.goto(ESSAY);
    const viewport = page.viewportSize()!.width;
    for (const figure of FIGURES) {
      const box = await page.locator(figure.root).boundingBox();
      expect(box, figure.name).not.toBeNull();
      expect(box!.width, figure.name).toBeLessThanOrEqual(viewport);
    }
  });
});

test.describe('deep links open the Atlas on the right composition', () => {
  test('every figure step offers a link, and each names real layers', async ({ page }) => {
    await page.goto(ESSAY);
    const links = page.locator(`${FIGURES[0].root} [data-atlas-deep-link]`);
    expect(await links.count()).toBeGreaterThan(0);

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
    for (const href of hrefs) {
      expect(href).toContain('/atlas/');
      expect(href).toContain('layers=');
      expect(href).toContain('collection=terra-incognita');
    }
  });

  test('following one restores that composition in the Atlas', async ({ page }) => {
    await page.goto(ESSAY);
    // Step two shows the inherited continent and Cook's track together, which
    // is the comparison the act is built on.
    const link = page.locator(`${FIGURES[0].root} .cb-caption`).nth(1).locator('a');
    const href = await link.getAttribute('href');
    expect(href).toContain('antarctica-conjectured-south');
    expect(href).toContain('antarctica-expedition-tracks');

    await page.goto(href!);
    await expect(page).toHaveURL(/\/atlas\/\?/);
    // The map needs longer than the default here: software GL is slow, and the
    // layer restore runs in the map's load hook, so the composition does not
    // exist until the map finishes loading.
    await expect(page.locator('[data-active-layer="antarctica-conjectured-south"]')).toHaveCount(
      1,
      { timeout: 20_000 },
    );
    await expect(page.locator('[data-active-layer="antarctica-expedition-tracks"]')).toHaveCount(1);
  });

  test('the Endurance steps link to the drift, not to the plan alone', async ({ page }) => {
    await page.goto(ESSAY);
    const captions = page.locator(`${FIGURES[1].root} .ed-caption`);
    const drift = captions.nth(3).locator('a');
    const href = await drift.getAttribute('href');
    // The plan stays in the composition after the ice takes over: the argument
    // is the distance between the two, and one line cannot show it.
    expect(href).toContain('antarctica-expedition-tracks');
    expect(href).toContain('antarctica-observations');
  });
});
