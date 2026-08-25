import { test, expect, type Page } from '@playwright/test';

// Content measures across the editorial surfaces (#127, #128).
//
// The two issues asked for the same thing in different words: text that had been
// pinned to a column narrower than the page around it should use the page. The
// fix is one shared token, --content-max, applied to the surfaces they name -
// see the comment beside it in tokens.css.
//
// What needs a browser here is that the token lands where it was meant to.
// Whether a page aligns with the grid beside it depends on the shell, the
// gutters and which element happens to carry the rule, none of which can be read
// off the CSS. The assertions are relational rather than numeric - "this edge is
// the header's edge", "this block is as wide as its container" - so retuning the
// token does not require retuning the spec.

const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];

/** Containers that *are* the .shell: they must sit on the site grid exactly. */
const SHELL_SURFACES = [
  { path: '/', selector: '.hero-inner' },
  { path: '/bibliography/', selector: '.biblio' },
  { path: '/about/', selector: '.prose' },
  { path: '/rooms/road/', selector: '.room' },
  { path: '/cartographers/battista-agnese/', selector: '.person' },
  { path: '/essays/dacia/', selector: '.native-essay' },
];

/** Blocks inside a shell that used to be narrower than the content beside them. */
const FLUSH_BLOCKS = [
  { path: '/essays/', selector: '.gallery-head' },
  { path: '/rooms/', selector: '.rooms-head' },
  { path: '/rooms/road/', selector: '.room-lede' },
  { path: '/cartographers/', selector: '.people-head' },
  { path: '/cartographers/battista-agnese/', selector: '.bio' },
  { path: '/', selector: '.start-head' },
  { path: '/atlas/handbook/', selector: '.handbook-home .lede' },
  { path: '/atlas/handbook/methods/dacia-shared-gis/', selector: '.hb-main p' },
];

const ALL_PATHS = [
  ...new Set([
    ...SHELL_SURFACES.map((s) => s.path),
    ...FLUSH_BLOCKS.map((s) => s.path),
    '/atlas/handbook/data-fields/crusades/',
  ]),
];

const boxOf = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error(`no element matched ${sel}`);
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      contentWidth: rect.width - pad,
      maxWidth: styles.maxWidth,
    };
  }, selector);

/** Width of a selector's parent, inside whatever padding the parent carries. */
const parentContentWidth = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error(`no element matched ${sel}`);
    const parent = element.parentElement!;
    const rect = parent.getBoundingClientRect();
    const styles = getComputedStyle(parent);
    return rect.width - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  }, selector);

test.describe('editorial content width', () => {
  test('editorial containers sit on the same grid as the site header', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    for (const { path, selector } of SHELL_SURFACES) {
      await page.goto(path);
      const header = await boxOf(page, '.site-header .shell');
      const container = await boxOf(page, selector);
      expect(container.left, `${path} ${selector} left edge`).toBeCloseTo(header.left, 0);
      expect(container.right, `${path} ${selector} right edge`).toBeCloseTo(header.right, 0);
    }
  });

  test('text blocks fill the container they sit in', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    for (const { path, selector } of FLUSH_BLOCKS) {
      await page.goto(path);
      const block = await boxOf(page, selector);
      const parent = await parentContentWidth(page, selector);
      expect(block.width, `${path} ${selector} fills its container`).toBeCloseTo(parent, 0);
    }
  });

  test('the essay body is wider than the measure it used to keep', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    await page.goto('/essays/dacia/');
    const essay = await boxOf(page, '.native-essay');
    // The old cap was 44rem, and this root's rem tracks --step-0 rather than
    // 16px, so it landed around 810px at the top of the type ramp. Anything at
    // or under that means the token did not reach the essay body.
    expect(essay.contentWidth).toBeGreaterThan(900);
  });

  test('deliberate narrow blocks keep their own measure', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);

    // Footer copy is supporting text beside the page rather than the page, and
    // neither issue put it in scope: it keeps --prose-max.
    await page.goto('/about/');
    const footer = await boxOf(page, '.site-footer .footer-lede');
    const prose = await boxOf(page, '.prose');
    expect(footer.width).toBeLessThan(prose.width);

    // A handbook review note is a rule-marked annotation on the document, not
    // part of its text, so it stays narrower than the column it sits in.
    await page.goto('/atlas/handbook/data-fields/crusades/');
    const note = await boxOf(page, '.review-note');
    const column = await boxOf(page, '.hb-main');
    expect(note.width).toBeLessThan(column.width);
  });

  test('no surface overflows sideways at any common breakpoint', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const path of ALL_PATHS) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} at ${viewport.width}px`).toBe(0);
      }
    }
  });
});
