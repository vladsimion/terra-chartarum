import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const client = join(dist, 'client');
const server = join(dist, 'server');
const metadata = join(dist, '.openai');

await Promise.all([
  mkdir(client, { recursive: true }),
  mkdir(server, { recursive: true }),
  mkdir(metadata, { recursive: true }),
]);

for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (['client', 'server', '.openai'].includes(entry.name)) continue;
  await cp(join(dist, entry.name), join(client, entry.name), { recursive: true });
}

await cp(join(root, '.openai', 'hosting.json'), join(metadata, 'hosting.json'));
await writeFile(
  join(server, 'index.js'),
  `export default {
  async fetch(request, env) {
    if (!env.ASSETS?.fetch) {
      return new Response('Static asset binding unavailable.', { status: 503 });
    }
    return env.ASSETS.fetch(request);
  },
};
`,
);
