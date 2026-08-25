import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

function issue(kind, message) {
  return { kind, message };
}

function sourceLabel(row, fallback) {
  const source = row.__source ?? fallback;
  return row.__line ? `${source}:${row.__line}` : source;
}

/** Parse RFC 4180-style CSV, including escaped quotes and multiline fields. */
export function parseCsv(text, source = '<csv>') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const finishField = () => {
    row.push(field);
    field = '';
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value !== '')) rows.push({ values: row, line: rowLine });
    row = [];
    rowLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
        if (character === '\n') line += 1;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ',') finishField();
    else if (character === '\n') {
      finishRow();
      line += 1;
    } else if (character !== '\r') field += character;
  }

  if (quoted) throw new Error(`${source}: unterminated quoted CSV field`);
  if (field !== '' || row.length > 0) finishRow();
  if (rows.length === 0) return [];

  const headers = rows[0].values.map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, '') : value,
  );
  return rows.slice(1).map(({ values, line: recordLine }) => {
    const record = { __source: source, __line: recordLine };
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return undefined;
}

function literalValue(node, sourceFile, sourcePath) {
  const value = unwrapExpression(node);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (value.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand)) {
    const number = Number(value.operand.text);
    return value.operator === ts.SyntaxKind.MinusToken ? -number : number;
  }
  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.map((element) => literalValue(element, sourceFile, sourcePath));
  }
  if (ts.isObjectLiteralExpression(value)) {
    const record = {
      __source: sourcePath,
      __line: sourceFile.getLineAndCharacterOfPosition(value.getStart()).line + 1,
    };
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(property.name);
      if (!name) continue;
      record[name] = literalValue(property.initializer, sourceFile, sourcePath);
    }
    return record;
  }
  return undefined;
}

export function parseTypescriptArray(text, variable, sourcePath = '<typescript>') {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let initializer;

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variable
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!initializer) throw new Error(`${sourcePath}: variable '${variable}' was not found`);
  const array = unwrapExpression(initializer);
  if (!ts.isArrayLiteralExpression(array)) {
    throw new Error(`${sourcePath}: variable '${variable}' is not an array literal`);
  }
  return array.elements.map((element) => literalValue(element, sourceFile, sourcePath));
}

function filesUnder(directory, extensions, root) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(path, extensions, root));
    else if (extensions.includes(extname(entry.name))) files.push(relative(root, path));
  }
  return files.sort();
}

function propertyAt(value, path) {
  if (!path) return value;
  return path.split('.').reduce((current, part) => current?.[part], value);
}

export function loadRegistry(definition, root) {
  const source = definition.source;
  const absolutePath = resolve(root, source.path);
  if (!existsSync(absolutePath)) {
    if (source.optional) return [];
    throw new Error(`${source.path}: registry source does not exist`);
  }

  if (source.format === 'csv') {
    return parseCsv(readFileSync(absolutePath, 'utf8'), source.path);
  }
  if (source.format === 'typescript-array') {
    return parseTypescriptArray(readFileSync(absolutePath, 'utf8'), source.variable, source.path);
  }
  if (source.format === 'json-array') {
    const document = JSON.parse(readFileSync(absolutePath, 'utf8'));
    const records = propertyAt(document, source.property);
    if (!Array.isArray(records)) {
      throw new Error(`${source.path}: '${source.property}' is not an array`);
    }
    return records.map((record) => ({ ...record, __source: source.path }));
  }
  if (source.format === 'content-files') {
    return filesUnder(absolutePath, source.extensions, root).map((path) => ({
      slug: path.slice(path.lastIndexOf('/') + 1, -extname(path).length),
      __source: path,
    }));
  }
  throw new Error(`${source.path}: unsupported registry format '${source.format}'`);
}

function valuesAtPath(record, path) {
  let values = [record];
  for (const rawPart of path.split('.')) {
    const expandArray = rawPart.endsWith('[]');
    const part = expandArray ? rawPart.slice(0, -2) : rawPart;
    values = values.flatMap((value) => {
      const next = value?.[part];
      if (expandArray) return Array.isArray(next) ? next : [];
      return [next];
    });
  }
  return values.flatMap((value) => (Array.isArray(value) ? value : [value]));
}

function relationValues(record, relation) {
  const scalarValues = valuesAtPath(record, relation.field).filter(
    (value) => typeof value === 'string' || typeof value === 'number',
  );
  const split = relation.split ? new RegExp(relation.split) : null;
  return scalarValues
    .flatMap((value) => (split ? String(value).split(split) : [String(value)]))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (relation.transform === 'before-colon' ? value.split(':', 1)[0] : value));
}

function relationApplies(record, relation) {
  if (!relation.when) return true;
  return valuesAtPath(record, relation.when.field).some(
    (value) => String(value) === relation.when.equals,
  );
}

export function auditRegistryGraph(manifest, recordsByRegistry) {
  const errors = [];
  const warnings = [];
  const indexes = new Map();
  const incoming = new Map();
  const qualified = new Map();
  const definitions = new Map(manifest.registries.map((registry) => [registry.name, registry]));
  const canonicalPattern = manifest.canonicalReferencePattern
    ? new RegExp(manifest.canonicalReferencePattern)
    : null;

  for (const registry of manifest.registries) {
    const records = recordsByRegistry.get(registry.name) ?? [];
    const ids = new Map();
    const pattern = registry.idPattern ? new RegExp(registry.idPattern) : null;
    incoming.set(registry.name, new Map());

    for (const record of records) {
      const rawId = record[registry.idField];
      const id = rawId === undefined || rawId === null ? '' : String(rawId).trim();
      const location = sourceLabel(record, registry.source.path);
      if (!id) {
        errors.push(
          issue('missing-id', `${registry.name} ${location}: missing '${registry.idField}'`),
        );
        continue;
      }
      if (pattern && !pattern.test(id)) {
        errors.push(
          issue(
            'invalid-id',
            `${registry.name} ${location}: '${id}' does not match ${registry.idPattern}`,
          ),
        );
      }
      const firstInRegistry = !ids.has(id);
      if (!firstInRegistry && !registry.coalesceIds) {
        errors.push(
          issue(
            'duplicate-id',
            `${registry.name} ${location}: duplicate '${id}' (first at ${sourceLabel(ids.get(id), registry.source.path)})`,
          ),
        );
      } else if (firstInRegistry) ids.set(id, record);

      const canonical = `tc:${registry.authority}:${registry.family}:${id}`;
      if (!firstInRegistry) continue;
      if (canonicalPattern && !canonicalPattern.test(canonical)) {
        errors.push(
          issue(
            'invalid-canonical-reference',
            `${registry.name} ${location}: '${canonical}' does not match the shared canonical-reference pattern`,
          ),
        );
      }
      if (qualified.has(canonical)) {
        const prior = qualified.get(canonical);
        errors.push(
          issue(
            'qualified-collision',
            `${registry.name} ${location}: canonical reference '${canonical}' collides with ${prior.registry} ${prior.location}`,
          ),
        );
      } else qualified.set(canonical, { registry: registry.name, location });
    }
    indexes.set(registry.name, ids);
  }

  for (const reserved of manifest.reservedCanonicalReferences ?? []) {
    if (qualified.has(reserved)) {
      const record = qualified.get(reserved);
      errors.push(
        issue(
          'reserved-id',
          `${record.registry} ${record.location}: canonical reference '${reserved}' is reserved and cannot be assigned`,
        ),
      );
    }
  }

  for (const relation of manifest.relations) {
    const from = definitions.get(relation.from);
    if (!from) {
      errors.push(
        issue('manifest', `relation references unknown source registry '${relation.from}'`),
      );
      continue;
    }
    const unknownTargets = relation.to.filter((target) => !definitions.has(target));
    if (unknownTargets.length > 0) {
      errors.push(
        issue(
          'manifest',
          `relation ${relation.from}.${relation.field} has unknown target(s): ${unknownTargets.join(', ')}`,
        ),
      );
      continue;
    }

    for (const record of recordsByRegistry.get(relation.from) ?? []) {
      if (!relationApplies(record, relation)) continue;
      const values = relationValues(record, relation);
      const location = sourceLabel(record, from.source.path);
      if (relation.required && values.length === 0) {
        errors.push(
          issue(
            'missing-required-reference',
            `${relation.from} ${location}: required field '${relation.field}' is empty; expected ${relation.to.join(' or ')}`,
          ),
        );
      }

      for (const value of values) {
        const matchedTarget = relation.to.find((target) => indexes.get(target)?.has(value));
        if (!matchedTarget) {
          errors.push(
            issue(
              'unresolved-reference',
              `${relation.from} ${location}: '${relation.field}' value '${value}' does not resolve in ${relation.to.join(' or ')}`,
            ),
          );
          continue;
        }
        const count = incoming.get(matchedTarget);
        count.set(value, (count.get(value) ?? 0) + 1);
      }
    }
  }

  for (const registry of manifest.registries.filter((entry) => entry.reportOrphans)) {
    for (const [id, record] of indexes.get(registry.name) ?? []) {
      if ((incoming.get(registry.name)?.get(id) ?? 0) === 0) {
        warnings.push(
          issue(
            'orphan',
            `${registry.name} ${sourceLabel(record, registry.source.path)}: '${id}' has no declared incoming reference`,
          ),
        );
      }
    }
  }

  return {
    errors,
    warnings,
    stats: {
      registryCount: manifest.registries.length,
      recordCount: [...recordsByRegistry.values()].reduce(
        (total, records) => total + records.length,
        0,
      ),
      relationCount: manifest.relations.length,
    },
  };
}

function uniqueValues(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(issue('contract', `duplicate ${label} '${value}'`));
    seen.add(value);
  }
  return seen;
}

export function validateSharedContract(contract) {
  const errors = [];
  if (contract.schemaVersion !== 1) errors.push(issue('contract', 'schemaVersion must be 1'));

  const requiredFamilies = [
    'essay',
    'map',
    'cartographer',
    'dataset',
    'place',
    'port',
    'route',
    'event',
    'layer',
    'source',
    'period',
    'project',
  ];
  const families = uniqueValues(
    contract.identifiers?.families?.map((entry) => entry.family) ?? [],
    'identifier family',
    errors,
  );
  for (const family of requiredFamilies) {
    if (!families.has(family))
      errors.push(issue('contract', `missing identifier family '${family}'`));
  }
  const canonicalPattern = new RegExp(contract.identifiers?.canonicalReferencePattern ?? '$a');
  const reserved = uniqueValues(
    contract.identifiers?.reserved?.map((entry) => entry.reference) ?? [],
    'reserved canonical reference',
    errors,
  );
  for (const reference of reserved) {
    if (!canonicalPattern.test(reference)) {
      errors.push(issue('contract', `reserved reference '${reference}' is not canonical`));
    }
  }
  const deprecated = uniqueValues(
    contract.identifiers?.deprecated?.map((entry) => entry.reference) ?? [],
    'deprecated canonical reference',
    errors,
  );
  for (const reference of deprecated) {
    if (!canonicalPattern.test(reference)) {
      errors.push(issue('contract', `deprecated reference '${reference}' is not canonical`));
    }
  }

  const tiers = contract.evidence?.tiers ?? [];
  const tierIds = uniqueValues(
    tiers.map((tier) => tier.id),
    'evidence tier',
    errors,
  );
  tiers.forEach((tier, index) => {
    if (tier.rank !== index)
      errors.push(issue('contract', `evidence tier '${tier.id}' must have rank ${index}`));
  });
  for (const [subject, tier] of Object.entries(contract.evidence?.minimums ?? {})) {
    if (!tierIds.has(tier))
      errors.push(issue('contract', `${subject} references unknown evidence tier '${tier}'`));
  }
  uniqueValues(contract.evidence?.confidence ?? [], 'confidence value', errors);
  uniqueValues(contract.evidence?.datePrecision ?? [], 'date precision', errors);
  uniqueValues(contract.evidence?.geometryProvenance ?? [], 'geometry provenance', errors);

  const states = uniqueValues(contract.publication?.states ?? [], 'lifecycle state', errors);
  for (const [from, targets] of Object.entries(contract.publication?.transitions ?? {})) {
    if (!states.has(from))
      errors.push(issue('contract', `transition source '${from}' is not a lifecycle state`));
    for (const target of targets) {
      if (!states.has(target))
        errors.push(issue('contract', `transition '${from}' points to unknown state '${target}'`));
    }
  }
  uniqueValues(contract.publication?.rightsStates ?? [], 'rights state', errors);
  if (!contract.publication?.requirements?.humanReviewBeforePublishable) {
    errors.push(issue('contract', 'human review before publishable must remain mandatory'));
  }

  const projects = uniqueValues(
    contract.support?.browserMatrix?.map((entry) => entry.project) ?? [],
    'browser project',
    errors,
  );
  for (const project of ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari']) {
    if (!projects.has(project))
      errors.push(issue('contract', `missing browser project '${project}'`));
  }
  const budgets = contract.support?.budgets;
  if (!budgets?.shared || !budgets?.content || !budgets?.atlas) {
    errors.push(issue('contract', 'shared, content and atlas budgets are required'));
  }
  if (!budgets?.atlas?.exception)
    errors.push(issue('contract', 'Atlas performance exception must be explicit'));
  // A route that sits outside its profile's ceiling has to say why in the
  // contract, not only in lighthouserc.json - otherwise the written budget and
  // the executable one drift apart, which is what this file exists to prevent.
  if (budgets?.citiesRemember && !budgets.citiesRemember.exception)
    errors.push(issue('contract', 'Cities Remember transfer exception must be explicit'));

  return errors;
}

function assertion(matrix, pattern) {
  return matrix.find((entry) => entry.matchingUrlPattern === pattern)?.assertions ?? {};
}

function expectAssertion(errors, assertions, key, level, option, expected, label) {
  const value = assertions[key];
  if (!Array.isArray(value) || value[0] !== level || value[1]?.[option] !== expected) {
    errors.push(issue('tooling', `${label}: expected ${key} ${level} ${option}=${expected}`));
  }
}

export function validateExecutableAlignment(contract, lighthouse, playwrightSource) {
  const errors = [];
  const matrix = lighthouse.ci?.assert?.assertMatrix ?? [];
  const shared = assertion(matrix, '.*');
  const content = assertion(
    matrix,
    '(localhost/index|essays/(index|the-league-that-left-no-map)/index)\\.html$',
  );
  const citiesRemember = assertion(matrix, 'essays/cities-remember/index\\.html$');
  const atlas = assertion(matrix, 'atlas/index\\.html$');
  const budgets = contract.support.budgets;

  expectAssertion(
    errors,
    shared,
    'categories:accessibility',
    'error',
    'minScore',
    budgets.shared.accessibilityScore,
    'shared budget',
  );
  expectAssertion(
    errors,
    shared,
    'categories:best-practices',
    'error',
    'minScore',
    budgets.shared.bestPracticesScore,
    'shared budget',
  );
  expectAssertion(
    errors,
    shared,
    'categories:seo',
    'error',
    'minScore',
    budgets.shared.seoScore,
    'shared budget',
  );
  expectAssertion(
    errors,
    shared,
    'largest-contentful-paint',
    'error',
    'maxNumericValue',
    budgets.shared.largestContentfulPaintMs,
    'shared budget',
  );
  expectAssertion(
    errors,
    shared,
    'cumulative-layout-shift',
    'error',
    'maxNumericValue',
    budgets.shared.cumulativeLayoutShift,
    'shared budget',
  );

  expectAssertion(
    errors,
    content,
    'categories:performance',
    'error',
    'minScore',
    budgets.content.performanceScore,
    'content budget',
  );
  expectAssertion(
    errors,
    content,
    'total-blocking-time',
    'error',
    'maxNumericValue',
    budgets.content.totalBlockingTimeMs,
    'content budget',
  );
  expectAssertion(
    errors,
    content,
    'total-byte-weight',
    'error',
    'maxNumericValue',
    budgets.content.totalTransferBytes,
    'content budget',
  );
  expectAssertion(
    errors,
    content,
    'resource-summary:script:size',
    'error',
    'maxNumericValue',
    budgets.content.scriptTransferBytes,
    'content budget',
  );

  // Cities Remember holds the content profile on every metric except transfer
  // weight, where the essay's two scholarly plates put it above the ceiling.
  // The reason is recorded on the budget itself.
  expectAssertion(
    errors,
    citiesRemember,
    'categories:performance',
    'error',
    'minScore',
    budgets.citiesRemember.performanceScore,
    'Cities Remember budget',
  );
  expectAssertion(
    errors,
    citiesRemember,
    'total-blocking-time',
    'error',
    'maxNumericValue',
    budgets.citiesRemember.totalBlockingTimeMs,
    'Cities Remember budget',
  );
  expectAssertion(
    errors,
    citiesRemember,
    'total-byte-weight',
    'error',
    'maxNumericValue',
    budgets.citiesRemember.totalTransferBytes,
    'Cities Remember budget',
  );
  expectAssertion(
    errors,
    citiesRemember,
    'resource-summary:script:size',
    'error',
    'maxNumericValue',
    budgets.citiesRemember.scriptTransferBytes,
    'Cities Remember budget',
  );

  expectAssertion(
    errors,
    atlas,
    'categories:performance',
    'warn',
    'minScore',
    budgets.atlas.performanceScoreWarning,
    'Atlas budget',
  );
  // Monitored rather than gating: see the exception recorded on the atlas budget.
  expectAssertion(
    errors,
    atlas,
    'total-blocking-time',
    'warn',
    'maxNumericValue',
    budgets.atlas.totalBlockingTimeWarning,
    'Atlas budget',
  );
  expectAssertion(
    errors,
    atlas,
    'total-byte-weight',
    'error',
    'maxNumericValue',
    budgets.atlas.totalTransferBytes,
    'Atlas budget',
  );
  expectAssertion(
    errors,
    atlas,
    'resource-summary:script:size',
    'error',
    'maxNumericValue',
    budgets.atlas.scriptTransferBytes,
    'Atlas budget',
  );

  for (const browser of contract.support.browserMatrix) {
    if (!playwrightSource.includes(`name: '${browser.project}'`)) {
      errors.push(issue('tooling', `playwright.config.ts is missing project '${browser.project}'`));
    }
  }
  return errors;
}
