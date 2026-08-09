const origin = (process.env.PRODUCTION_ORIGIN ?? 'https://terra-chartarum.pages.dev').replace(
  /\/$/,
  '',
);
const expectedSha = process.env.EXPECTED_GIT_SHA ?? process.argv[2];
const retries = Number(process.env.PRODUCTION_VERIFY_RETRIES ?? 12);
const delayMs = Number(process.env.PRODUCTION_VERIFY_DELAY_MS ?? 15000);

if (!expectedSha) {
  console.error('EXPECTED_GIT_SHA (or argv[2]) is required.');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(path, { json = false } = {}) {
  const response = await fetch(`${origin}${path}`, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return json ? response.json() : response.text();
}

async function verify() {
  const info = await get(`/build-info.json?verify=${Date.now()}`, {
    json: true,
  });
  if (info.gitSha !== expectedSha) {
    throw new Error(`deployed SHA ${info.gitSha} does not match expected ${expectedSha}`);
  }

  const essay = await get('/essays/the-league-that-left-no-map/');
  if (!essay.includes('The League That Left No Map')) {
    throw new Error('Hanseatic essay assertion failed');
  }
  if (/Phase 0 fixture/i.test(essay)) {
    throw new Error('stale Phase 0 fixture label survives in Hanseatic essay');
  }

  const requiredAssets = [
    '/geo/hanseatic-places.geojson',
    '/geo/hanseatic-routes.geojson',
    '/geo/hanseatic-events.geojson',
  ];
  for (const asset of requiredAssets) await get(asset);

  return info;
}

let lastError;
for (let attempt = 1; attempt <= retries; attempt += 1) {
  try {
    const info = await verify();
    console.log(`Production verified: ${origin} serves ${info.gitSha} (built ${info.builtAt}).`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`Production verification attempt ${attempt}/${retries} failed: ${error.message}`);
    if (attempt < retries) await sleep(delayMs);
  }
}

console.error(`Production verification failed: ${lastError?.message ?? 'unknown error'}`);
process.exit(1);
