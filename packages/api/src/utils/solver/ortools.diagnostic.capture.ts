import { lstat, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { currentScope } from '../../tenant/database/tenant.context.js';
import type { planningSolverPayload } from './planning.solver.js';

type WirePayload = ReturnType<typeof planningSolverPayload>;

const identifier = /^(guid|(?:employee|user|template|requirement)Guid|(?:employee|user|template|requirement)Guids|(?:employee|template)_guids|limited_service_template_guid)$/;

export function pseudonymizePlanningPayload(payload: WirePayload): unknown {
  const ids = new Set<string>();
  function visit(value: unknown, transform: (id: string) => string, key = ''): unknown {
    if (value === null || value === undefined) return value;
    if (key === 'name' || key === 'templateName') return 'Masqué';
    if (key === 'code') return '';
    if (Array.isArray(value)) return value.map(entry => visit(entry, transform, key));
    if (typeof value === 'string' && identifier.test(key)) return transform(value);
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([field, entry]) => [
        key === 'templateCounts' ? transform(field) : field,
        visit(entry, transform, field),
      ]));
    }
    return value;
  }

  visit(payload, id => { ids.add(id); return id; });
  // Keep the original ordering of identifiers used to break ties in the model.
  const aliases = new Map([...ids].sort().map((id, index) => [id, 'anon-' + String(index + 1).padStart(6, '0')]));
  return visit(payload, id => aliases.get(id)!);
}

export async function captureUnknownPlanningWindow(payload: WirePayload, metadata: {
  searchSeconds: number;
  workerStatus: string;
  workerWallSeconds: number;
  workerVersion?: string;
}): Promise<void> {
  const setting = process.env.PLANNING_ORTOOLS_DIAGNOSTIC_CAPTURE;
  if (!setting || !currentScope()) return;

  try {
    const selection = JSON.parse(setting);
    if (!selection || selection.tenant !== currentScope()?.tenant ||
        selection.periodFrom !== payload.periodFrom || selection.periodTo !== payload.periodTo ||
        typeof selection.directory !== 'string' || !isAbsolute(selection.directory) ||
        typeof selection.expiresAt !== 'string') return;

    const remaining = Date.parse(selection.expiresAt) - Date.now();
    if (!(remaining > 0 && remaining <= 60 * 60_000)) return;
    const directory = resolve(selection.directory);
    const stat = await lstat(directory);
    if (!stat.isDirectory() || (stat.mode & 0o077) || stat.uid !== process.getuid?.() ||
        await realpath(directory) !== directory) return;

    const capture = JSON.stringify({
      capturedAt: new Date().toISOString(),
      ...metadata,
      payload: pseudonymizePlanningPayload(payload),
    });
    await writeFile(join(directory, 'ortools-window.json'), capture, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      // The diagnostic must never alter the outcome or log the payload.
      console.warn('[planning] Impossible d’enregistrer la capture de diagnostic.');
    }
  }
}
