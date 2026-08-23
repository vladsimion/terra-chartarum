import { expect, test } from '@playwright/test';

const YEARS = [1204, 1261, 1409, 1453, 1500, 1797];
const ZOOMS = [2, 4, 6];
const VMN_LAYERS = ['venetian-ports', 'venetian-routes', 'venetian-possessions'];

test('ID-only deep links infer the target layer and apply the requested year', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const cases = [
    {
      query: 'year=1450&route=muda_romania',
      target: 'route:muda_romania',
      layer: 'venetian-routes',
      year: 1450,
      passage: '#rotta',
    },
    {
      query: 'year=1500&territory=morea',
      target: 'territory:morea',
      layer: 'venetian-possessions',
      year: 1500,
      passage: '#contrazione',
    },
    {
      query: 'beat=port_modon',
      target: 'port:modon',
      layer: 'venetian-ports',
      year: 1450,
      passage: '#rotta',
    },
  ];

  for (const entry of cases) {
    await page.goto(`/atlas/?${entry.query}`);
    await expect(page.locator('.atlasmap')).toHaveAttribute('data-atlas-target', entry.target, {
      timeout: 20_000,
    });
    await expect(page.locator('.am-year-out')).toHaveText(`AD ${entry.year}`);
    // One row per lens (KAN-400); every instance agrees, so the first will do.
    await expect(page.locator(`input[data-layer="${entry.layer}"]`).first()).toBeChecked();
    await expect(
      page.locator(`.maplibregl-popup a[href="/essays/venice-sicily/${entry.passage}"]`),
    ).toBeVisible();
    await page.waitForTimeout(250);
    await testInfo.attach(entry.target.replace(':', '-'), {
      body: await page.locator('.am-map').screenshot(),
      contentType: 'image/png',
    });
  }
});

test('reverse passage links are stable and invalid targets fail safely', async ({ page }) => {
  await page.goto('/atlas/');
  await expect(page.locator('a[href="/essays/venice-sicily/#rotta"]')).toHaveCount(2);
  await expect(page.locator('a[href="/essays/venice-sicily/#contrazione"]')).toHaveCount(1);

  for (const query of [
    'beat=unknown&route=atlantis&year=1450',
    'date=not-a-year&layers=unknown&port=atlantis',
  ]) {
    await page.goto(`/atlas/?${query}`);
    await expect(page.locator('.am-map .maplibregl-canvas')).toBeVisible();
    await expect(page.locator('.atlasmap')).not.toHaveAttribute('data-atlas-target');
    await expect(page.locator('.am-target-pop')).toHaveCount(0);
  }
});

test('VMN release screenshot scrub: 3 zooms × 6 slider years', async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  for (const year of YEARS) {
    for (const zoom of ZOOMS) {
      await page.goto(`/atlas/?year=${year}&zoom=${zoom}&layers=${VMN_LAYERS.join(',')}`, {
        waitUntil: 'networkidle',
      });

      const map = page.locator('.am-map');
      await expect(map.locator('.maplibregl-canvas')).toBeVisible();
      // Wait on the island's own readiness signal (KAN-400) rather than on a
      // hand-tuned allowance for a slow base style. `data-map-ready` is set in
      // MapLibre's load hook, after the requested URL state has been applied and
      // the overlays attached - which is exactly the condition the next
      // assertions depend on. The Build Log carried adopting it here as open
      // debt from the batch-2 work.
      await expect(page.locator('[data-atlasmap][data-map-ready="true"]')).toBeAttached({
        timeout: 30_000,
      });
      await expect(page.locator('.am-year-out')).toHaveText(`AD ${year}`, {
        timeout: 20_000,
      });
      for (const layer of VMN_LAYERS) {
        await expect(page.locator(`input[data-layer="${layer}"]`).first()).toBeChecked();
      }

      await page.waitForTimeout(250);
      await testInfo.attach(`vmn-${year}-z${zoom}`, {
        body: await map.screenshot(),
        contentType: 'image/png',
      });
    }
  }
});
