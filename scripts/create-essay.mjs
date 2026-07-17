#!/usr/bin/env node
/**
 * create-essay (ATLAS-406)
 *
 * Scaffolds a new native MDX essay from starter/essay.mdx.template plus a
 * placeholder cover. Usage:
 *   npm run create-essay -- --slug my-essay --title "My Essay Title"
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const slug = arg('slug');
const title = arg('title');

if (!slug || !title) {
  console.error('Usage: npm run create-essay -- --slug my-essay --title "My Essay Title"');
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`Invalid slug "${slug}". Use lowercase letters, numbers, and hyphens.`);
  process.exit(1);
}

const essayPath = join(root, 'src/content/essays', `${slug}.mdx`);
const coverPath = join(root, 'public/covers', `${slug}.svg`);

const exists = async (p) =>
  access(p, constants.F_OK)
    .then(() => true)
    .catch(() => false);

if (await exists(essayPath)) {
  console.error(`Refusing to overwrite existing essay: ${essayPath}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const template = await readFile(join(root, 'starter/essay.mdx.template'), 'utf8');

const filled = template
  .replaceAll('__SLUG__', slug)
  .replaceAll('__TITLE__', title)
  .replaceAll('__SUBTITLE__', 'A working subtitle')
  .replaceAll('__SUMMARY__', `${title} —`)
  .replaceAll('__ERAS__', 'Modern')
  .replaceAll('__REGIONS__', 'Global')
  .replaceAll('__LENSES__', 'Measure, Witness, Use, Cosmos, Power, Silence')
  .replaceAll('__YEAR_FROM__', '1500')
  .replaceAll('__YEAR_TO__', '2024')
  .replaceAll('__DATE__', today);

const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${title}">
  <rect width="800" height="500" fill="#0a0806"/>
  <g stroke="#d4b87a" stroke-width="1" fill="none" opacity="0.2">
    <polygon points="400,90 620,250 400,410 180,250"/>
  </g>
  <text x="58" y="80" fill="#c0ad88" font-family="monospace" font-size="16" letter-spacing="6">NATIVE ESSAY</text>
  <text x="56" y="300" fill="#e8dec5" font-family="Georgia, serif" font-size="46" font-weight="600">${title}</text>
</svg>
`;

await writeFile(essayPath, filled, 'utf8');
if (!(await exists(coverPath))) await writeFile(coverPath, cover, 'utf8');

console.log(`Created:
  ${essayPath}
  ${coverPath}

Next: edit the frontmatter + body, replace the placeholder cover, then
  npm run dev   ->  http://localhost:4321/essays/${slug}/`);
