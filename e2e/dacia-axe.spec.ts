import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Terra Sigillata migrated from a legacy iframe embed to a native MDX essay, so
// its whole body - 13 inline SVG plates, the scrollytelling core column, three
// radar charts and 30-odd tables - now lives in the portal DOM rather than
// behind the isolation boundary. smoke.spec.ts covers one representative per
// route type and its essay representative is still the legacy host, so nothing
// there exercises a native essay body. This does.
test.describe('native essay: Terra Sigillata', () => {
  test('renders inline with no iframe and every declared section anchor', async ({ page }) => {
    await page.goto('/essays/dacia/');

    await expect(page.locator('iframe.essay-frame')).toHaveCount(0);
    await expect(page.locator('article.native-essay')).toBeVisible();

    // The six chapters room pages deep-link into.
    for (const id of ['brief', 'museum', 'collatio', 'trench', 'sectio', 'sondaje']) {
      await expect(page.locator(`section.essay-section#${id}`), `#${id} anchor`).toHaveCount(1);
    }

    // Thirteen stelae, each an anchor preserved from the retired embed.
    await expect(page.locator('[id^="stela-"]')).toHaveCount(13);

    // metaScores were inert frontmatter while the essay was legacy.
    await expect(page.locator('article.native-essay >> text=Meta-lens').first()).toBeVisible();
  });

  test('SVG plates keep their labels (no <p> breakout out of foreign content)', async ({
    page,
  }) => {
    await page.goto('/essays/dacia/');

    // MDX wraps a standalone line inside <text> in a <p>, and <p> is an HTML
    // breakout tag in SVG foreign content: the browser closes the <svg> there
    // and spills the rest of the drawing into the document as HTML. Guard the
    // symptom rather than the formatting.
    const stray = await page.locator('figure > p, .scrolly-graphic > p').count();
    expect(stray, 'no SVG children leaked out of their <svg>').toBe(0);

    const core = page.locator('.scrolly-graphic svg');
    await expect(core).toHaveCount(1);
    await expect(core.locator('text', { hasText: 'PTOLEMAEVS' })).toHaveCount(1);
  });

  test('every core-column stratum links to its own passage', async ({ page }) => {
    await page.goto('/essays/dacia/');

    const links = page.locator('.scrolly-graphic svg a[href^="#stratum-"]');
    await expect(links).toHaveCount(13);

    // The ids are declared on the headings rather than generated from their text,
    // so each href has to resolve. A generated id would drift the moment a
    // heading is reworded, and would carry non-ASCII besides.
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(new Set(hrefs).size, 'no duplicate targets').toBe(13);
    for (const href of hrefs) {
      await expect(page.locator(`h4${href}`), `${href} resolves to a heading`).toHaveCount(1);
    }

    // The pinned header and essay bar sit above the content, so a jump has to be
    // offset or it parks the heading behind them.
    const target = await page.locator('h4#stratum-ptolemy').evaluate((el) => {
      el.scrollIntoView();
      const chrome = ['.site-header', '.essay-bar']
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
      return el.getBoundingClientRect().top - chrome;
    });
    expect(target, 'stratum heading lands below the sticky chrome').toBeGreaterThanOrEqual(0);
  });

  test('core-column labels are large enough to read', async ({ page }) => {
    await page.goto('/essays/dacia/');

    // The column is height-capped and width:auto, so its rendered scale follows
    // the viewport. Assert the delivered pixel size rather than the SVG units -
    // at the original 120-wide viewBox these labels came out around 7px.
    const px = await page
      .locator('.scrolly-graphic svg a[href="#stratum-ptolemy"] text')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(px).toBeGreaterThanOrEqual(12);
  });

  test('the squeeze toggle puts the plates in relief and back', async ({ page }) => {
    await page.goto('/essays/dacia/');

    const wall = page.locator('[data-squeeze-toggle]');
    const button = page.getByRole('button', { name: 'Squeeze view' });
    const plate = page.locator('.stela-plate').first();

    // Off by default: the legible reading is the one served.
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(wall).not.toHaveAttribute('data-squeeze', /.*/);
    const stone = await plate.evaluate((el) => getComputedStyle(el.querySelector('svg')!).filter);
    expect(stone).toBe('none');

    await button.click();

    // One permanent accessible name, with aria-pressed carrying the state - the
    // embed renamed the button as well and announced the opposite of the truth.
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(wall).toHaveAttribute('data-squeeze', '');
    const calc = await plate.evaluate((el) => getComputedStyle(el.querySelector('svg')!).filter);
    expect(calc, 'ink inverted and lit from a fixed angle').toContain('invert');
    expect(calc).toContain('drop-shadow');

    // The panel lifts to filter paper under the impression. Asserted through
    // toHaveCSS so it settles past the transition rather than reading a frame
    // of it.
    await expect(plate).toHaveCSS('background-color', 'rgb(246, 243, 234)');

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(wall).not.toHaveAttribute('data-squeeze', /.*/);
  });

  test('the squeeze bar stays in reach without burying the stone it jumps to', async ({ page }) => {
    await page.goto('/essays/dacia/');

    // Deep into the wall, where the bar is pinned rather than in flow. The
    // timeline node is a zero-width anchor positioned on the axis, so the click
    // target is the dot it paints.
    await page.locator('a[href="#stela-russia"] .atl-dot').click();

    // html scroll-behavior is smooth, so poll the landing rather than the frame
    // the click returned on.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const heading = document.querySelector('h4#stela-russia')!;
            const bar = document.querySelector('.lapidarium-bar')!;
            return heading.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
          }),
        { message: 'the stone lands below the bar, not behind it' },
      )
      .toBeGreaterThanOrEqual(0);

    // Still on screen at that scroll position, so the control acts where it is read.
    await expect(page.getByRole('button', { name: 'Squeeze view' })).toBeInViewport();
  });

  test('passes axe WCAG A/AA', async ({ page }) => {
    await page.goto('/essays/dacia/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('passes axe WCAG A/AA with the squeeze on', async ({ page }) => {
    await page.goto('/essays/dacia/');
    await page.getByRole('button', { name: 'Squeeze view' }).click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
