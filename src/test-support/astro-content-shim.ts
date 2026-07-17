// Vitest shim for the `astro:content` virtual module. The corpus / geo /
// cartographer registries import only `z` from it (a re-export of zod) for
// their load-time schema validation; under vitest there is no Astro runtime, so
// we alias `astro:content` to this file (see vitest.config.ts) to expose `z`.
export { z } from 'zod';

// `src/content/config.ts` calls defineCollection at module load and lib/registry
// calls getCollection; both are pulled in transitively when a test imports a lib
// that touches essays. Under vitest there is no content layer, so stub them:
// defineCollection is an identity pass-through, and getCollection resolves empty
// (tests that need real essay data read the frontmatter off disk instead).
export function defineCollection<T>(config: T): T {
  return config;
}

export async function getCollection(): Promise<never[]> {
  return [];
}
