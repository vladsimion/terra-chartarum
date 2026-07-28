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
    },
    {
      query: 'year=1500&territory=morea',
      target: 'territory:morea',
      layer: 'venetian-possessions',
      year: 1500,
    },
    {
      query: 'year=1450&port=modon',
      target: 'port:modon',
      layer: 'venetian-ports',
      year: 1450,
    },
  ];

  for (const entry of cases) {
    await page.goto(`/atlas/?${entry.query}`);
    await expect(page.locator('.atlasmap')).toHaveAttribute('data-atlas-target', entry.target, {
      timeout: 20_000,
    });
    await expect(page.locator('.am-year-out')).toHaveText(`AD ${entry.year}`);
    await expect(page.locator(`input[data-layer="${entry.layer}"]`)).toBeChecked();
    await page.waitForTimeout(250);
    await testInfo.attach(entry.target.replace(':', '-'), {
      body: await page.locator('.am-map').screenshot(),
      contentType: 'image/png',
    });
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
      // The external base style can initialize more slowly under a fully
      // parallel suite; this changes only after the Atlas load hook applies the
      // requested URL state and attaches all three overlays.
      await expect(page.locator('.am-year-out')).toHaveText(`AD ${year}`, {
        timeout: 20_000,
      });
      for (const layer of VMN_LAYERS) {
        await expect(page.locator(`input[data-layer="${layer}"]`)).toBeChecked();
      }

      await page.waitForTimeout(250);
      await testInfo.attach(`vmn-${year}-z${zoom}`, {
        body: await map.screenshot(),
        contentType: 'image/png',
      });
    }
  }
});
