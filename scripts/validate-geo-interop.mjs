import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

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
// A georeference is only meaningful in the pixel space of the file it targets,
// and this annotation restates that file's size in three places: target.source,
// the SvgSelector, and the control points themselves. Nothing tied any of them
// to the image on disk, so rescaling or cropping nolli-sheet-01.jpg - which is
// also consumed by CityMemoryOverlay - would have silently desynced the
// georeference. These checks make that a build failure instead.
const NOLLI_IMAGE = 'public/images/cities-remember/nolli-sheet-01.jpg';
const nolli = await sharp(resolve(ROOT, NOLLI_IMAGE)).metadata();
const declaredSource = annotationItem?.target?.source ?? {};
requireValue(
  declaredSource.width === nolli.width && declaredSource.height === nolli.height,
  `Nolli georeference declares ${declaredSource.width}x${declaredSource.height} but ${NOLLI_IMAGE} is ${nolli.width}x${nolli.height}`,
);
const selector = annotationItem?.target?.selector?.value ?? '';
requireValue(
  selector.includes(`width="${nolli.width}"`) && selector.includes(`height="${nolli.height}"`),
  `Nolli SvgSelector must be stated in the image pixel space (${nolli.width}x${nolli.height})`,
);
// The selector polygon traces the annotated region; a crop that updated the
// width/height attributes but not the polygon would still be wrong.
const polygonPoints = [...selector.matchAll(/(\d+),(\d+)/g)].map(([, x, y]) => [
  Number(x),
  Number(y),
]);
requireValue(
  polygonPoints.length > 0 &&
    Math.max(...polygonPoints.map(([x]) => x)) === nolli.width &&
    Math.max(...polygonPoints.map(([, y]) => y)) === nolli.height,
  'Nolli SvgSelector polygon must span the full image extent',
);
requireValue(
  controlPoints.every((feature) => {
    const [x, y] = feature?.properties?.pixel ?? [];
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      x <= nolli.width &&
      y >= 0 &&
      y <= nolli.height
    );
  }),
  `Every Nolli control point must fall inside the ${nolli.width}x${nolli.height} image bounds`,
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
  `Geo interoperability QA passed: ${linkedPlaces.features.length} LPF places, ${controlPoints.length} overlay control points against a ${nolli.width}x${nolli.height} sheet.`,
);
