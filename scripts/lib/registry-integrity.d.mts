export interface IntegrityIssue {
  kind: string;
  message: string;
}

export function parseCsv(text: string, source?: string): Array<Record<string, unknown>>;
export function parseTypescriptArray(
  text: string,
  variable: string,
  sourcePath?: string,
): Array<Record<string, unknown>>;
export function loadRegistry(
  definition: Record<string, unknown>,
  root: string,
): Array<Record<string, unknown>>;
export function auditRegistryGraph(
  manifest: Record<string, unknown>,
  recordsByRegistry: Map<string, Array<Record<string, unknown>>>,
): {
  errors: IntegrityIssue[];
  warnings: IntegrityIssue[];
  stats: { registryCount: number; recordCount: number; relationCount: number };
};
export function validateSharedContract(contract: Record<string, unknown>): IntegrityIssue[];
export function validateExecutableAlignment(
  contract: Record<string, unknown>,
  lighthouse: Record<string, unknown>,
  playwrightSource: string,
): IntegrityIssue[];
