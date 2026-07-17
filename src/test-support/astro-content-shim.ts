// Vitest shim for the `astro:content` virtual module. The corpus / geo /
// cartographer registries import only `z` from it (a re-export of zod) for
// their load-time schema validation; under vitest there is no Astro runtime, so
// we alias `astro:content` to this file (see vitest.config.ts) to expose `z`.
export { z } from 'zod';
