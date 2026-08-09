import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'public', 'build-info.json');

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
  } catch {
    return null;
  }
}

function gitSha() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const hse = await readJson('src/data/hanseatic/generated/manifest.json');
const geo = await readJson('public/geo/manifest.json');

const info = {
  schemaVersion: 1,
  gitSha: gitSha(),
  builtAt: new Date().toISOString(),
  branch: process.env.CF_PAGES_BRANCH ?? process.env.GITHUB_REF_NAME ?? null,
  deployment: {
    provider: process.env.CF_PAGES
      ? 'cloudflare-pages'
      : process.env.GITHUB_ACTIONS
        ? 'github-actions'
        : 'local',
    url: process.env.CF_PAGES_URL ?? null,
  },
  releases: {
    hanseatic: hse?.release ?? null,
    hanseaticSchemaVersion: hse?.schemaVersion ?? null,
    geo: geo?.release ?? geo?.releaseId ?? geo?.version ?? null,
  },
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(root, output)} for ${info.gitSha}`);
