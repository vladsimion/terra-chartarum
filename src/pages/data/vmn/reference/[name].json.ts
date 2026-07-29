import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';

const ROOT = resolve(process.cwd(), 'data', 'vmn', 'reference');

export const getStaticPaths = (() =>
  readdirSync(ROOT)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      params: { name: name.slice(0, -'.json'.length) },
      props: { path: resolve(ROOT, name) },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(readFileSync(props.path as string, 'utf8'), {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
