#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  auditRegistryGraph,
  loadRegistry,
  validateExecutableAlignment,
  validateSharedContract,
} from './lib/registry-integrity.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const contract = readJson('data/contracts/terra-chartarum.json');
const manifest = readJson('data/contracts/registry-sources.json');
const lighthouse = readJson('lighthouserc.json');
const playwright = readFileSync(resolve(root, 'playwright.config.ts'), 'utf8');
const records = new Map();
const errors = [
  ...validateSharedContract(contract),
  ...validateExecutableAlignment(contract, lighthouse, playwright),
];

for (const registry of manifest.registries) {
  try {
    records.set(registry.name, loadRegistry(registry, root));
  } catch (error) {
    errors.push({ kind: 'load', message: `${registry.name}: ${error.message}` });
  }
}

const audit = auditRegistryGraph(
  {
    ...manifest,
    canonicalReferencePattern: contract.identifiers.canonicalReferencePattern,
    reservedCanonicalReferences: contract.identifiers.reserved.map((entry) => entry.reference),
  },
  records,
);
errors.push(...audit.errors);

for (const warning of audit.warnings) console.warn(`WARN [${warning.kind}] ${warning.message}`);
for (const error of errors) console.error(`ERROR [${error.kind}] ${error.message}`);

if (errors.length > 0) {
  console.error(
    `\nRegistry integrity failed: ${errors.length} error(s), ${audit.warnings.length} warning(s).`,
  );
  process.exit(1);
}

console.log(
  `Registry integrity passed: ${audit.stats.recordCount} records across ${audit.stats.registryCount} registries, ${audit.stats.relationCount} declared relations, ${audit.warnings.length} orphan warning(s).`,
);
