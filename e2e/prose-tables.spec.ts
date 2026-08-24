import { test, expect } from '@playwright/test';

/**
 * Prose tables at the reflow reference width (KAN-437).
 *
 * WCAG 1.4.10 requires content to be readable at 320px CSS pixels without a
 * two-dimensional scroll. An authored Markdown table cannot always narrow to
 * that - its min-content width is set by its longest words, and dacia's
 * `Collatio` table wanted 324px of min-content in a prose column about 20px
 * narrower - so before the fix the surplus scrolled the *page* sideways.
 *
 * 1.4.10 exempts content needing a two-dimensional layout, so the table keeps
 * its columns and takes the scroll itself. What this spec pins is that the
 * scroll stayed inside the table: the wrapper's own box fits the viewport, and
 * it is operable from the keyboard once it scrolls (WCAG 2.1.1 / 4.1.2).
 *
 * The essay list is read from the gallery rather than hard-coded, so an essay
 * that is published later, or that grows its first table later, is covered
 * without anyone remembering to add it here.
 */

const REFLOW_WIDTH = 320;

test.describe('prose tables survive a 320px viewport', () => {
  test.use({ viewport: { width: REFLOW_WIDTH, height: 900 } });

  test('every published essay keeps its tables inside the page (KAN-437)', async ({ page }) => {
    await page.goto('/essays/');
    const paths = await page.$$eval('a[href^="/essays/"]', (links) =>
      [...new Set(links.map((a) => new URL((a as HTMLAnchorElement).href).pathname))]
        .filter((path) => path !== '/essays/')
        .sort(),
    );
    expect(paths.length).toBeGreaterThan(0);

    const withTables: string[] = [];

    for (const path of paths) {
      await page.goto(path);
      const wrappers = page.locator('.prose-table');
      const count = await wrappers.count();
      if (count === 0) continue;
      withTables.push(path);

      // No wrapper may stick out of the viewport: that is the page-level
      // sideways scroll this fix exists to remove.
      const boxes = await wrappers.evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            scrollable: node.scrollWidth > node.clientWidth,
            role: node.getAttribute('role'),
            tabindex: node.getAttribute('tabindex'),
            label: node.getAttribute('aria-label'),
            viewport: document.documentElement.clientWidth,
          };
        }),
      );

      for (const [index, box] of boxes.entries()) {
        const where = `${path} table ${index + 1}`;
        expect(box.left, `${where} starts left of the viewport`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${where} runs past the viewport`).toBeLessThanOrEqual(box.viewport + 1);

        // A scroll container has to be reachable and announceable, whether or
        // not it happens to be scrolling at this particular width.
        expect(box.tabindex, `${where} is not keyboard-reachable`).toBe('0');
        expect(box.role, `${where} has no announced role`).toBe('region');
        expect(box.label?.trim(), `${where} has no accessible name`).toBeTruthy();
      }

      // Names must be distinct, or the regions are unusable as a list.
      const labels = boxes.map((box) => box.label);
      expect(new Set(labels).size, `${path} repeats a table name`).toBe(labels.length);
    }

    // A guard on the guard: if the wrapper ever stops being emitted, the loop
    // above would pass by finding nothing to check.
    expect(withTables, 'no published essay rendered a prose table').not.toHaveLength(0);
  });

  test('a table wider than the column scrolls itself, not the page (KAN-437)', async ({ page }) => {
    await page.goto('/essays/dacia/');

    // The `Collatio` table is the reported offender - the widest thing any
    // published essay authors.
    const wrapper = page.locator('.prose-table').filter({ hasText: 'What divides them' }).first();
    await wrapper.scrollIntoViewIfNeeded();

    const before = await wrapper.evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      columns: node.querySelectorAll('thead th').length,
      rows: node.querySelectorAll('tbody tr').length,
    }));

    // Wider than its box - so it has something to scroll - and still whole.
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
    expect(before.columns).toBe(5);
    expect(before.rows).toBe(6);

    // Keyboard: focus the region and drive it with the arrow keys. Reaching
    // the far column with the keyboard alone is the whole point of the
    // tabindex - a mouse-only scroller would fail WCAG 2.1.1.
    await wrapper.focus();
    await expect(wrapper).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => wrapper.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);

    // Scrolling the table must not have moved the page.
    const pageOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollLeft;
    });
    expect(pageOverflow).toBe(0);
  });
});
