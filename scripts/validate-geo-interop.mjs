import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');
const failures = [];
const requireValue = (condition, message) => {
  if (!condition) failures.push(message);
};

const annotation = JSON.parse(read('public/annotations/cities-remember-nolli.json'));
const annotationItem = annotation.items?.[0];
const controlPoints = annotationItem?.body?.features ?? [];
requireValue(annotation.type === 'AnnotationPage', 'Nolli georeference must be an AnnotationPage');
requireValue(
  annotationItem?.motivation === 'georeferencing',
  'Nolli annotation motivation must be georeferencing',
);
requireValue(
  controlPoints.length >= 4,
  'Nolli annotation must publish at least four control points',
);
requireValue(
  controlPoints.every(
    (feature) =>
      Array.isArray(feature?.properties?.pixel) &&
      feature.properties.pixel.length === 2 &&
      feature?.geometry?.type === 'Point' &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length === 2,
  ),
  'Every Nolli control point must pair pixel and geographic coordinates',
);
requireValue(
  annotationItem?._terraChartarum?.status === 'exploratory' &&
    Boolean(annotationItem?._terraChartarum?.residualDisclosure) &&
    Boolean(annotationItem?._terraChartarum?.prohibitedInference),
  'Exploratory status, residual limits, and prohibited inference must stay visible',
);

const overlaySource = read('src/components/islands/CityMemoryOverlay.astro');
requireValue(
  overlaySource.includes('data-overlay-mode="blend"') &&
    overlaySource.includes('data-overlay-mode="swipe"') &&
    overlaySource.includes('city-memory-opacity'),
  'City overlay must expose blend, swipe, and range controls',
);
requireValue(
  overlaySource.includes('/annotations/cities-remember-nolli.json'),
  'City overlay must link to its inspectable georeference annotation',
);

const linkedPlaces = JSON.parse(read('dist/geo/toponyms.lpf.json'));
requireValue(
  linkedPlaces.type === 'FeatureCollection' &&
    linkedPlaces['@context']?.includes('linkedplaces-context-v1.1'),
  'Gazetteer export must be an LPF 1.1 FeatureCollection',
);
requireValue(linkedPlaces.features?.length >= 10, 'LPF export must contain the authored gazetteer');
requireValue(
  linkedPlaces.features?.every(
    (feature) =>
      feature.type === 'Feature' &&
      feature['@id'] &&
      feature.properties?.title &&
      feature.geometry?.type === 'Point' &&
      feature.names?.length > 0 &&
      Array.isArray(feature.links),
  ),
  'Every LPF place must include identity, title, point, names, and links',
);
const authorityLinks = linkedPlaces.features?.flatMap((feature) => feature.links) ?? [];
requireValue(
  authorityLinks.some(({ identifier }) => identifier?.includes('pleiades.stoa.org')) &&
    authorityLinks.some(({ identifier }) => identifier?.includes('w3id.org/whg')),
  'LPF export must contain verified Pleiades and WHG matches',
);
requireValue(
  authorityLinks.every(
    ({ type, identifier }) => type === 'closeMatch' && identifier?.startsWith('https://'),
  ),
  'LPF authority links must be HTTPS exact matches',
);

const atlasHtml = read('dist/atlas/index.html');
requireValue(
  atlasHtml.includes('data-meta-lens-explorer') &&
    atlasHtml.includes('data-lens-mode="meta"') &&
    atlasHtml.includes('data-lens-mode="native"'),
  'Atlas must render the meta/native cross-essay lens toggle',
);
requireValue(
  atlasHtml.includes('do not make different essays') &&
    atlasHtml.includes('naturally') &&
    atlasHtml.includes('commensurable'),
  'Cross-essay radar must keep its commensurability caveat visible',
);

if (failures.length > 0) {
  console.error(`Geo interoperability QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Geo interoperability QA passed: ${linkedPlaces.features.length} LPF places, ${controlPoints.length} overlay control points.`,
);
