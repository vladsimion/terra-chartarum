import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The Crusades flagship, checked on the page it will actually ship on
 * (CRU-3 / CRU-4 / CRU-6 / CRU-7, KAN-386 / KAN-387 / KAN-389 / KAN-438).
 *
 * Runs only under `playwright.held.config.ts`, against a build made with
 * SHOW_UNRELEASED=1. `crusades-prototype.spec.ts` proves the essay is not
 * served; this one proves that what is being withheld works, so release day is
 * a decision about evidence rather than a scramble to fix a page nobody could
 * load. The three registers' interaction gates are recorded against these
 * checks: the Sea proof's has passed on the strength of them, and the other
 * two stay `partial` for reasons no browser can settle.
 *
 * Nothing here asserts the essay is ready to publish. That is the research and
 * rights question, and no browser can answer it.
 */
const ESSAY = '/essays/maps-for-a-crusade/';

test.describe('the Road proof compares without merging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
  });

  test('the itinerary renders every stage on both sides', async ({ page }) => {
    const island = page.locator('[data-itinerary]');
    await expect(island).toBeVisible();
    // Fourteen stages, and fourteen reference points. If these ever disagree,
    // one half of the comparison has silently lost a place.
    await expect(island.locator('[data-stage]')).toHaveCount(14);
    await expect(island.locator('[data-point]')).toHaveCount(14);
  });

  test('selecting a stage highlights it on the ground too', async ({ page }) => {
    // The acceptance criterion for KAN-386, stated as the user experiences it.
    const island = page.locator('[data-itinerary]');
    const rome = island.locator('[data-stage="cru-itn-13"]');
    await rome.click();
    await expect(rome).toHaveAttribute('aria-pressed', 'true');
    await expect(island.locator('[data-point="cru-itn-13"]')).toHaveClass(/is-selected/);
    await expect(island.locator('[data-readout="cru-itn-13"]')).toBeVisible();
    // Exactly one readout at a time, or the panel is describing two places.
    await expect(island.locator('[data-readout]:visible')).toHaveCount(1);
  });

  test('the stage list is reachable and navigable by keyboard', async ({ page }) => {
    const island = page.locator('[data-itinerary]');
    await island.locator('[data-stage="cru-itn-01"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(island.locator('[data-stage="cru-itn-02"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(island.locator('[data-stage="cru-itn-14"]')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(island.locator('[data-stage="cru-itn-01"]')).toBeFocused();
  });

  test('the roving tabindex keeps the list to one tab stop', async ({ page }) => {
    // Fourteen separate tab stops would make the rest of the essay unreachable
    // for a keyboard reader without fourteen presses.
    const focusable = page.locator('[data-itinerary] [data-stage][tabindex="0"]');
    await expect(focusable).toHaveCount(1);
  });

  test('it shows no manuscript, and says why', async ({ page }) => {
    // The proof is about a manuscript it may not reproduce. It must not imply
    // otherwise, and the absence has to read as a decision.
    const island = page.locator('[data-itinerary]');
    await expect(island.locator('img')).toHaveCount(0);
    await expect(island.locator('figcaption')).toContainText('no manuscript image is shown');
    await expect(island.locator('[data-readout="cru-itn-01"]')).toContainText('not transcribed');
  });
});

test.describe('the Sea proof keeps six claims apart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
  });

  test('renders every state record', async ({ page }) => {
    await expect(page.locator('[data-fourth-crusade] [data-state]')).toHaveCount(8);
  });

  test('a claim and a possession never look the same', async ({ page }) => {
    // The distinction the whole proof exists for. A dashed rule against a solid
    // one is the visible form of "assigned" against "occupied".
    const island = page.locator('[data-fourth-crusade]');
    const claim = island.locator('.is-partition_claim').first();
    const control = island.locator('.is-durable_control').first();
    await expect(claim).toHaveCSS('border-left-style', 'dashed');
    await expect(control).toHaveCSS('border-left-style', 'solid');
    await expect(claim.locator('[data-held="claimed_not_held"]')).toContainText(
      'claimed, not held',
    );
  });

  test('says which states are deliberately unmapped', async ({ page }) => {
    const island = page.locator('[data-fourth-crusade]');
    await expect(island.getByText('deliberately unmapped')).toHaveCount(6);
  });
});

test.describe('the Holy Land register keeps six kinds of claim apart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
  });

  test('offers every register and one panel at a time', async ({ page }) => {
    const island = page.locator('[data-registers]');
    await expect(island).toBeVisible();
    await expect(island.locator('[data-register]')).toHaveCount(6);
    await expect(island.locator('[data-panel]:visible')).toHaveCount(1);
  });

  test('selecting a register shows what it cannot assert', async ({ page }) => {
    // The acceptance criterion for the act, stated as a reader meets it: the
    // second half of every register is the half that stops a borrowed claim.
    const island = page.locator('[data-registers]');
    const memory = island.locator('[data-register="cartographic_memory"]');
    await memory.click();
    await expect(memory).toHaveAttribute('aria-pressed', 'true');
    const panel = island.locator('[data-panel="cartographic_memory"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Anything whatever about the twelfth century');
    await expect(island.locator('[data-panel]:visible')).toHaveCount(1);
  });

  test('says of five registers that they have no position', async ({ page }) => {
    const island = page.locator('[data-registers]');
    await expect(island.locator('[data-placed="no"]')).toHaveCount(5);
    await expect(island.locator('[data-placed="yes"]')).toHaveCount(1);
  });

  test('the register list is one tab stop and moves by arrow', async ({ page }) => {
    const island = page.locator('[data-registers]');
    await expect(island.locator('[data-register][tabindex="0"]')).toHaveCount(1);
    await island.locator('[data-register="sacred_centre"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(island.locator('[data-register="pilgrimage_destination"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(island.locator('[data-register="cartographic_memory"]')).toBeFocused();
  });

  test('shows no picture of Jerusalem, and says why', async ({ page }) => {
    const island = page.locator('[data-registers]');
    await expect(island.locator('img')).toHaveCount(0);
    await expect(island.locator('figcaption')).toContainText('shows no picture of Jerusalem');
  });

  test('links the later emblem to the catalogue and not to a source', async ({ page }) => {
    const island = page.locator('[data-registers]');
    await island.locator('[data-register="cartographic_memory"]').click();
    const panel = island.locator('[data-panel="cartographic_memory"]');
    await expect(panel.locator('a[href="/collection/religion-bunting/"]')).toBeVisible();
    await expect(panel).toContainText('no source record');
  });
});

test.describe('the essay states its own limits from data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
  });

  test('shows all three registers across all six gates', async ({ page }) => {
    await expect(page.locator('.gate-state [class*="gate-"][class*="gate"]').first()).toBeVisible();
    await expect(page.locator('.gate-state .gate')).toHaveCount(18);
  });

  test('claims no evidence gate has passed while the corpus is untranscribed', async ({ page }) => {
    // The one result that must never be wrong on this page. The single gate
    // that has passed is the Sea proof's interaction, which asks whether the
    // thing is built rather than whether anything has been read.
    await expect(page.locator('.gate-state .gate-passed')).toHaveCount(1);
    await expect(page.locator('.gate-state')).toContainText('1 of 18');
  });

  test('names the ticket blocked by each open item', async ({ page }) => {
    const tickets = page.locator('.gate-state .blocked-ticket dt code');
    await expect(tickets).toHaveCount(5);
    for (const key of ['KAN-384', 'KAN-385', 'KAN-386', 'KAN-389', 'KAN-438']) {
      await expect(page.locator('.gate-state').getByText(key, { exact: true })).toBeVisible();
    }
    // KAN-387 finished. A blocked-ticket list that keeps a ticket after its
    // work lands cannot tell finished from stuck.
    await expect(page.locator('.gate-state').getByText('KAN-387', { exact: true })).toHaveCount(0);
  });
});

test.describe('the essay reaches the Atlas', () => {
  test('links the Road, the Sea, what was held and the Holy Land', async ({ page }) => {
    // AtlasDeepLink throws at build time on an unknown layer, so reaching this
    // assertion at all is half the check; the other half is that a link exists
    // for each of the four things the essay asks a reader to go and look at.
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    const hrefs = await page
      .locator('#main-content a[data-atlas-deep-link]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLAnchorElement).getAttribute('href') ?? ''),
      );
    for (const layer of [
      'crusades-itinerary',
      'crusades-fourth-crusade-routes',
      'crusades-jerusalem-network',
      // What was durably held is the one territorial claim this dataset
      // declines to draw, so the link goes to the layer that models it.
      'venetian-possessions',
    ]) {
      expect(
        hrefs.some((href) => decodeURIComponent(href).includes(layer)),
        layer,
      ).toBe(true);
    }
  });

  test('a deep link carries its text into the accessible name', async ({ page }) => {
    // It did not, and nothing caught it until axe ran on the held build: MDX
    // wraps slot content in a paragraph, and <p><a><p> parses into an empty
    // anchor. A link whose name is the empty string is a link a screen reader
    // cannot announce.
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    const first = page.locator('#main-content a[data-atlas-deep-link]').first();
    await expect(first).toContainText('Open the fourteen stages in the Atlas');
  });
});

test.describe('the page is usable', () => {
  test('has no detectable accessibility violations', async ({ page }) => {
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  test('both proofs still work with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    const island = page.locator('[data-itinerary]');
    await island.locator('[data-stage="cru-itn-05"]').click();
    await expect(island.locator('[data-point="cru-itn-05"]')).toHaveClass(/is-selected/);
    await expect(island.locator('[data-readout="cru-itn-05"]')).toBeVisible();
  });
});
