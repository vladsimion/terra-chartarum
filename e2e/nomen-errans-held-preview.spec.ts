import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The Nomen Errans slice, checked on the page it will actually ship on
 * (CCD-C2/C3 / KAN-345/KAN-346).
 *
 * Runs only under `playwright.held.config.ts`, against a build made with
 * SHOW_UNRELEASED=1. The ordinary suite proves the essay is not served; this
 * one proves the whole path closes when it is - a career selected, its evidence
 * shown, the Atlas opened on the referent, and the way back to the passage the
 * reader left.
 *
 * Everything here is verifiable without a reviewer: markup, keyboard, layout,
 * link targets. Nothing here asserts the trench is ready to publish.
 */
const ESSAY = '/essays/nomen-errans/';
const FIGURE = '[data-name-careers]';
const BUTTONS = `${FIGURE} .nc-button`;
const PANELS = `${FIGURE} .nc-panel`;
const MIGRATION = '[data-name-migration]';
const MIGRATION_STEPS = `${MIGRATION} [data-migration-step]`;
const MIGRATION_READOUTS = `${MIGRATION} [data-migration-readout]`;

test.describe('the held slice renders', () => {
  test('the route is served when the hold is lifted', async ({ page }) => {
    const response = await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('the three beats are present and in order', async ({ page }) => {
    await page.goto(ESSAY);
    const beats = ['slice', 'careers', 'path'];
    const ids = await page.locator('section[id]').evaluateAll((nodes) => nodes.map((n) => n.id));
    expect(ids.filter((id) => beats.includes(id))).toEqual(beats);
  });

  test('at least three distinct careers of the name are selectable', async ({ page }) => {
    await page.goto(ESSAY);
    // The ticket's floor. Fewer than three is a component demonstration, not a
    // migration anybody could follow.
    expect(await page.locator(BUTTONS).count()).toBeGreaterThanOrEqual(3);
    expect(await page.locator(PANELS).count()).toBe(await page.locator(BUTTONS).count());
  });

  test('the selected career shows referent, period, source, locator and confidence', async ({
    page,
  }) => {
    await page.goto(ESSAY);
    const panel = page.locator(`${PANELS}:not([hidden])`);
    await expect(panel).toHaveCount(1);
    for (const term of ['Period', 'Source', 'Locator', 'Confidence']) {
      await expect(panel.locator('dt', { hasText: term })).toHaveCount(1);
    }
    // The referent is the panel's own heading, and it is never a placeholder.
    await expect(panel.locator('h3')).not.toBeEmpty();
    for (const value of await panel.locator('dd').allInnerTexts()) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  test('each career is labelled with the period the corpus gives it', async ({ page }) => {
    await page.goto(ESSAY);
    const periods = await page.locator(`${BUTTONS} .nc-period`).allInnerTexts();
    expect(periods.length).toBeGreaterThanOrEqual(3);
    for (const period of periods) expect(period.trim()).toMatch(/\d{3,4}/);
    // Distinct periods are the point: this is a word moving through time.
    expect(new Set(periods.map((period) => period.trim())).size).toBeGreaterThan(1);
  });
});

test.describe('accessibility', () => {
  test('the essay has no WCAG A/AA violations', async ({ page }) => {
    await page.goto(ESSAY);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('the figure steps with the keyboard and reports its state', async ({ page }) => {
    await page.goto(ESSAY);
    const buttons = page.locator(BUTTONS);
    const count = await buttons.count();

    await buttons.first().focus();
    await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(buttons.first()).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('End');
    await expect(buttons.nth(count - 1)).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Home');
    await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('stepping the keyboard changes which career is shown', async ({ page }) => {
    await page.goto(ESSAY);
    await page.locator(BUTTONS).first().focus();
    const first = await page.locator(`${PANELS}:not([hidden]) h3`).innerText();
    await page.keyboard.press('ArrowRight');
    const second = await page.locator(`${PANELS}:not([hidden]) h3`).innerText();
    expect(second).not.toBe(first);
  });

  test('every step control clears the 44px touch target', async ({ page }) => {
    await page.goto(ESSAY);
    const buttons = page.locator(BUTTONS);
    for (let i = 0; i < (await buttons.count()); i += 1) {
      const box = await buttons.nth(i).boundingBox();
      expect(box, `career ${i}`).not.toBeNull();
      expect(box!.height, `career ${i} height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `career ${i} width`).toBeGreaterThanOrEqual(44);
    }
  });

  test('the whole ledger is reachable without operating the stepper', async ({ page }) => {
    await page.goto(ESSAY);
    const details = page.locator(`${FIGURE} details`);
    await expect(details).toHaveCount(1);
    await details.locator('summary').click();
    const rows = details.locator('tbody tr');
    expect(await rows.count()).toBe(await page.locator(BUTTONS).count());
    await expect(rows.first()).toBeVisible();
  });

  test('confidence is not carried by colour alone', async ({ page }) => {
    await page.goto(ESSAY);
    // Every confidence is spelled out as a word; the border style repeats it.
    const label = page.locator(`${PANELS}:not([hidden]) .nc-confidence`);
    await expect(label).toHaveCount(1);
    expect((await label.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('reduced motion changes nothing about what can be read', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ESSAY);
    await expect(page.locator(`${PANELS}:not([hidden])`)).toHaveCount(1);
    await page.locator(BUTTONS).nth(1).click();
    await expect(page.locator(`${PANELS}:not([hidden])`)).toHaveCount(1);
    await expect(page.locator(BUTTONS).nth(1)).toHaveAttribute('aria-pressed', 'true');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('the migration map and relationship gate', () => {
  test('every reviewed career is a map state with inspectable evidence', async ({ page }) => {
    await page.goto(ESSAY);
    const steps = page.locator(MIGRATION_STEPS);
    const readouts = page.locator(MIGRATION_READOUTS);

    expect(await steps.count()).toBe(await page.locator(BUTTONS).count());
    expect(await readouts.count()).toBe(await steps.count());
    await expect(page.locator(`${MIGRATION_READOUTS}:not([hidden])`)).toHaveCount(1);

    const selected = page.locator(`${MIGRATION_READOUTS}:not([hidden])`);
    for (const term of ['Period', 'Fate', 'Source', 'Locator', 'Confidence', 'Relationship']) {
      await expect(selected.locator('dt', { hasText: term })).toHaveCount(1);
    }
    for (const value of await selected.locator('dd').allInnerTexts()) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  test('keyboard stepping keeps the timeline, map, readout and flow node together', async ({
    page,
  }) => {
    await page.goto(ESSAY);
    const steps = page.locator(MIGRATION_STEPS);

    await steps.first().focus();
    await page.keyboard.press('ArrowRight');
    const selectedId = await steps.nth(1).getAttribute('data-migration-step');

    await expect(steps.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`${MIGRATION} [data-migration-map="${selectedId}"]`)).toHaveClass(
      /is-selected/,
    );
    await expect(
      page.locator(`${MIGRATION} [data-migration-readout="${selectedId}"]`),
    ).toBeVisible();
    await expect(page.locator(`${MIGRATION} [data-flow-node="${selectedId}"]`)).toHaveClass(
      /is-selected/,
    );
  });

  test('unreviewed relationships are counted but never drawn', async ({ page }) => {
    await page.goto(ESSAY);

    await expect(page.locator(`${MIGRATION} [data-flow-node]`)).toHaveCount(6);
    await expect(page.locator(`${MIGRATION} .nm-flow-edge`)).toHaveCount(0);
    await expect(page.locator(`${MIGRATION} .nm-flow-gate`)).toContainText('No line is drawn.');
    await expect(page.locator(`${MIGRATION} .nm-flow-gate`)).toContainText(
      '10 relationship records',
    );
  });

  test('fate and confidence remain explicit without colour', async ({ page }) => {
    await page.goto(ESSAY);
    const steps = page.locator(MIGRATION_STEPS);

    for (let i = 0; i < (await steps.count()); i += 1) {
      await expect(steps.nth(i).locator('.nm-step-meta')).not.toBeEmpty();
      expect(await steps.nth(i).getAttribute('data-fate')).toMatch(/\w+/);
    }
  });
});

test.describe('the page works on a phone', () => {
  test('nothing overflows the viewport horizontally', async ({ page }) => {
    await page.goto(ESSAY);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the figure fits its column', async ({ page }) => {
    await page.goto(ESSAY);
    const viewport = page.viewportSize()!.width;
    const box = await page.locator(FIGURE).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewport);
  });

  test('the migration figure fits while its flow diagram scrolls internally', async ({ page }) => {
    await page.goto(ESSAY);
    const viewport = page.viewportSize()!.width;
    const box = await page.locator(MIGRATION).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewport);

    const scroller = page.locator(`${MIGRATION} .nm-flow-scroll`);
    await expect(scroller).toHaveCount(1);
    expect(await scroller.evaluate((node) => node.scrollWidth)).toBeGreaterThan(
      await scroller.evaluate((node) => node.clientWidth),
    );
  });

  test('the ledger table scrolls inside the figure, not the page', async ({ page }) => {
    await page.goto(ESSAY);
    await page.locator(`${FIGURE} details summary`).click();
    const scroller = page.locator(`${FIGURE} .nc-scroll`);
    await expect(scroller).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('the Atlas leg, out and back', () => {
  test('a career with no honest layer offers no link', async ({ page }) => {
    await page.goto(ESSAY);
    // Both outcomes have to be on the page, or the rule that produces them is
    // never exercised by anything a reader can see.
    expect(await page.locator(`${PANELS} [data-atlas-deep-link]`).count()).toBeGreaterThan(0);
    expect(await page.locator(`${PANELS} .nc-no-atlas`).count()).toBeGreaterThan(0);
    for (const text of await page.locator(`${PANELS} .nc-no-atlas`).allInnerTexts()) {
      expect(text.trim().length).toBeGreaterThan(20);
    }
  });

  test('every link names real layers and says which essay it came from', async ({ page }) => {
    await page.goto(ESSAY);
    const hrefs = await page
      .locator(`${PANELS} [data-atlas-deep-link]`)
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') ?? ''),
      );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toContain('/atlas/');
      expect(href).toContain('layers=');
      expect(href).toContain('essay=nomen-errans');
    }
  });

  test('following one restores that composition in the Atlas', async ({ page }) => {
    await page.goto(ESSAY);
    const href = await page
      .locator(`${PANELS} [data-atlas-deep-link]`)
      .first()
      .getAttribute('href');
    expect(href).toContain('dacia-roman');

    await page.goto(href!);
    await expect(page).toHaveURL(/\/atlas\/\?/);
    // Software GL is slow and the layer restore runs in the map's load hook, so
    // the composition does not exist until the map has finished loading.
    await expect(page.locator('[data-active-layer="dacia-roman-sites"]')).toHaveCount(1, {
      timeout: 20_000,
    });
  });

  test('the Atlas offers the way back to the beat the reader left', async ({ page }) => {
    await page.goto(ESSAY);
    const href = await page
      .locator(`${PANELS} [data-atlas-deep-link]`)
      .first()
      .getAttribute('href');
    await page.goto(href!);
    await expect(page.locator('[data-active-layer="dacia-roman-sites"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    // The context panel, not the layer catalogue: the reader arrived from a
    // passage, so the way back is offered where they are looking.
    const back = page.locator('.am-context-link');
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute('href', `${ESSAY}#careers`);
    await back.click();
    await expect(page).toHaveURL(new RegExp(`${ESSAY}#careers$`));
    await expect(page.locator('#careers')).toBeVisible();
  });
});
