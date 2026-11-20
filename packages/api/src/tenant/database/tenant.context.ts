import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export class TenantContextError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'TenantContextError';
  }
}

export interface TenantLifetime {
  readonly active: boolean;
  onClose(callback: () => void): void;
}
export interface TenantScope {
  readonly tenant: string;
  readonly operationId: string;
  readonly lifetime: TenantLifetime;
}
const storage = new AsyncLocalStorage<TenantScope>();
const pins = new WeakMap<TenantScope, object>();

export function createTenantLifetime(): { lifetime: TenantLifetime; close: () => void } {
  let active = true;
  const callbacks = new Set<() => void>();
  return {
    lifetime: Object.freeze({
      get active() {
        return active;
      },
      onClose(callback: () => void) {
        if (active) callbacks.add(callback);
        else callback();
      },
    }),
    close: () => {
      if (!active) return;
      active = false;
      for (const callback of callbacks) callback();
      callbacks.clear();
    },
  };
}

export function currentScope(): TenantScope | undefined {
  return storage.getStore();
}
/** Maintenance only; removing a scope never grants access to tenant SQL. */
export function outsideTenantScope<T>(work: () => T): T {
  return storage.exit(work);
}
/** Only for an already-admitted, generation-owned initialization flight. */
export function runTenantInitialization<T>(tenant: string, work: () => T): T {
  return storage.exit(() => runWithTenant(tenant, work));
}
export function isPinned(generation: object): boolean {
  const scope = storage.getStore();
  return !!scope && pins.get(scope) === generation;
}

export function tenantScope(): TenantScope {
  const scope = storage.getStore();
  if (!scope) throw new TenantContextError('TENANT_CONTEXT_MISSING');
  if (!scope.lifetime.active) throw new TenantContextError('TENANT_CONTEXT_CLOSED');
  return scope;
}

export function pinGeneration(generation: object): boolean {
  const scope = tenantScope();
  const pinned = pins.get(scope);
  if (pinned && pinned !== generation) throw new TenantContextError('TENANT_GENERATION_STALE');
  pins.set(scope, generation);
  return !pinned;
}

export function runWithTenant<T>(
  tenant: string,
  work: () => T,
  options: { lifetime?: TenantLifetime; switchTenant?: boolean; newOperation?: boolean } = {},
): T {
  if (
    typeof tenant !== 'string' ||
    tenant.length > 253 ||
    !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(tenant)
  ) {
    throw new TenantContextError('TENANT_ID_INVALID');
  }
  const parent = storage.getStore();
  if (options.lifetime && !options.lifetime.active)
    throw new TenantContextError('TENANT_CONTEXT_CLOSED');
  if (parent && !parent.lifetime.active) throw new TenantContextError('TENANT_CONTEXT_CLOSED');
  if (parent?.tenant === tenant && !options.lifetime && !options.newOperation) return work();
  if (parent && parent.tenant !== tenant && !options.switchTenant)
    throw new TenantContextError('TENANT_CONTEXT_MISMATCH');
  const owned = options.lifetime ? undefined : createTenantLifetime();
  const scope = Object.freeze({
    tenant,
    operationId: randomUUID(),
    lifetime: options.lifetime ?? owned!.lifetime,
  });
  return storage.run(scope, () => {
    try {
      const result = work();
      if (result && typeof (result as any).then === 'function') {
        return Promise.resolve(result).finally(() => owned?.close()) as T;
      }
      owned?.close();
      return result;
    } catch (error) {
      owned?.close();
      throw error;
    }
  });
}

export function rethrowTenantError(error: unknown): void {
  if (error instanceof TenantContextError) throw error;
}
