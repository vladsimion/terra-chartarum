// House punctuation gate (KAN-66). Em dashes are hyphens everywhere on the site.
// Commit b8e50a1 converted 582 of them across first-party source but skipped
// public/embed/, which is preserved verbatim - so 300 survived in the legacy
// essays, which is exactly what issue #66 reported. Nothing enforced the rule
// afterwards: Prettier has no punctuation opinion and ESLint ignores public/.
//
// This check therefore walks the tracked text tree INCLUDING public/embed/, and
// looks for the em dash in all three forms it appears in HTML (literal, named
// entity, numeric entity). En dashes (U+2013) are correct in numeric and date
// ranges like 1150-1750 and are deliberately not flagged.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// Directories that hold no authored prose (build output, dependencies, caches).
const SKIP_DIRS = new Set([
  '.astro',
  '.git',
  '.venv',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
  // Agent worktrees (.claude/worktrees/<name>) are full checkouts of another
  // branch living inside this one. Walking them reports that branch's prose as
  // if it were ours, and CI never sees it because it checks out clean.
  'worktrees',
]);

// Text formats a reader can end up seeing, plus the config/docs around them.
const EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yml',
  '.yaml',
]);

const FORMS = ['—', '&mdash;', '&#8212;'];

// This file has to name the forms it forbids, so it exempts itself rather than
// obfuscating them past its own matcher.
const SELF = resolve(import.meta.dirname, 'validate-typography.mjs');

function textFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRS.has(entry)) return [];
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) return textFiles(path);
    return EXTENSIONS.has(entry.slice(entry.lastIndexOf('.'))) ? [path] : [];
  });
}

const offences = [];

for (const path of textFiles(ROOT)) {
  if (path === SELF) continue;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const form = FORMS.find((candidate) => line.includes(candidate));
    if (form) offences.push({ file: relative(ROOT, path), line: index + 1, form });
  });
}

if (offences.length) {
  console.error(`Typography QA failed: ${offences.length} em dash(es) found. Use a hyphen.`);
  for (const { file, line, form } of offences.slice(0, 20)) {
    console.error(`- ${file}:${line} (${form})`);
  }
  if (offences.length > 20) console.error(`- ...and ${offences.length - 20} more`);
  process.exit(1);
}

console.log('Typography QA passed: no em dashes, including the legacy embeds.');
