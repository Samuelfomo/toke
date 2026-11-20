import { createHash } from 'node:crypto';
import { Sequelize } from 'sequelize';
import { TimezoneConfigUtils } from '@toke/shared';
import {
  currentScope,
  outsideTenantScope,
  isPinned,
  runWithTenant,
  runTenantInitialization,
  tenantScope,
  TenantContextError,
  type TenantScope,
} from './tenant.context.js';
import {
  assertConnection,
  connectionOwner,
  registerConnection,
  type ConnectionOwner,
} from './tenant.ownership.js';
import { installTenantSQLGuard, tenantDriver } from './tenant.sql-guard.js';

interface TenantConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}
interface Entry {
  owner: ConnectionOwner;
  state: 'connecting' | 'ready' | 'draining' | 'closed';
  fingerprint: string;
  connection?: Sequelize;
  pending: Promise<Sequelize>;
  scopes: Set<TenantScope>;
  drained?: () => void;
  closing?: Promise<void>;
  invalid?: boolean;
}

export default class TenantManager {
  private static entries = new Map<string, Entry>();
  private static sequence = 0;
  private static closing: Promise<void> | undefined;
  private static readonly TIMEZONE = 'Africa/Douala';
  static runWithTenant = runWithTenant;
  static runTenantOperation<T>(tenant: string, work: () => T): T {
    return runWithTenant(tenant, work, { switchTenant: true, newOperation: true });
  }
  /** Compatibility symbol only: cannot create or mutate a scope. */
  static setCurrentTenant(tenant: string): void {
    if (tenantScope().tenant !== tenant) throw new TenantContextError('TENANT_CONTEXT_MISMATCH');
  }
  static getCurrentTenant(): string {
    return tenantScope().tenant;
  }

  static async getConnectionForTenant(
    tenant: string,
    config: TenantConnectionConfig,
  ): Promise<Sequelize> {
    if (tenantScope().tenant !== tenant) throw new TenantContextError('TENANT_CONTEXT_MISMATCH');
    if (this.closing && !isPinned(this.entries.get(tenant)?.owner ?? {}))
      throw new TenantContextError('TENANT_DRAINING');
    if (
      !config ||
      [config.database, config.username, config.host].some(
        (value) => typeof value !== 'string' || !value.trim() || value.includes('\0'),
      ) ||
      !Number.isInteger(config.port) ||
      config.port < 1 ||
      config.port > 65535 ||
      typeof config.password !== 'string'
    ) {
      throw new TenantContextError('TENANT_CONFIG_INVALID');
    }
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          config.host,
          config.port,
          config.database,
          config.username,
          config.password,
        ]),
      )
      .digest('hex');
    let entry = this.entries.get(tenant);
    if (entry && entry.fingerprint !== fingerprint)
      throw new TenantContextError('TENANT_CONFIG_CHANGED');
    if (entry?.invalid) throw new TenantContextError('TENANT_MODEL_INITIALIZATION_FAILED');
    if (entry?.state === 'closed' || (entry?.state === 'draining' && !isPinned(entry.owner)))
      throw new TenantContextError('TENANT_DRAINING');
    if (!entry) {
      const scopes = new Set<TenantScope>();
      const value: Entry = {
        state: 'connecting',
        fingerprint,
        scopes,
        pending: undefined as any,
        owner: undefined as any,
      };
      const owner: ConnectionOwner = Object.freeze({
        tenant,
        generation: ++this.sequence,
        usable: () =>
          !value.invalid &&
          value.state !== 'closed' &&
          (value.state !== 'draining' || isPinned(owner)),
        retain: (scope: TenantScope) => {
          scopes.add(scope);
          scope.lifetime.onClose(() => {
            scopes.delete(scope);
            if (!scopes.size) value.drained?.();
          });
        },
      });
      value.owner = owner;
      this.entries.set(tenant, value);
      value.pending = Promise.resolve().then(() => {
        return runTenantInitialization(tenant, async () => {
          let db: Sequelize | undefined;
          try {
            db = new Sequelize(config.database, config.username, config.password, {
              host: config.host,
              port: config.port,
              dialect: 'postgres',
              logging: false,
              timezone: this.TIMEZONE,
              dialectOptions: { timezone: this.TIMEZONE },
              pool: { max: 3, min: 0, acquire: 30000, idle: 10000 },
              define: { timestamps: true, underscored: true },
              dialectModule: tenantDriver(() => db!),
            });
            value.connection = db;
            registerConnection(db, owner);
            installTenantSQLGuard(db);
            await db.authenticate();
            if (value.state !== 'connecting' || this.entries.get(tenant) !== value)
              throw new TenantContextError('TENANT_GENERATION_STALE');
            value.state = 'ready';
            return db;
          } catch (error) {
            if (db) {
              try {
                await db.close();
              } catch {
                value.state = 'draining';
                throw new TenantContextError('TENANT_CLOSE_FAILED');
              }
            }
            value.state = 'closed';
            if (!value.closing && this.entries.get(tenant) === value) this.entries.delete(tenant);
            throw error;
          }
        });
      });
      entry = value;
    }
    const connection = await entry.pending;
    assertConnection(connection);
    return connection;
  }

  static async getConnection(): Promise<Sequelize> {
    return this.getConnectionSync();
  }
  static getConnectionSync(): Sequelize {
    const entry = this.entries.get(tenantScope().tenant);
    if (
      !entry ||
      (entry.state !== 'ready' && !(entry.state === 'draining' && isPinned(entry.owner))) ||
      !entry.connection
    )
      throw new TenantContextError('TENANT_CONNECTION_NOT_READY');
    assertConnection(entry.connection);
    return entry.connection;
  }
  static assertConnection = assertConnection;
  static connectionOwner = connectionOwner;
  static hasLiveConnections(tenant?: string): boolean {
    return tenant ? this.entries.has(tenant) : this.entries.size > 0;
  }
  static assertReadyForModels(connection: Sequelize): void {
    assertConnection(connection);
    const owner = connectionOwner(connection);
    if (this.entries.get(owner.tenant)?.state !== 'ready')
      throw new TenantContextError('TENANT_GENERATION_STALE');
  }
  static invalidateModels(connection: Sequelize): void {
    const owner = connectionOwner(connection);
    const entry = this.entries.get(owner.tenant);
    if (entry?.connection === connection) {
      entry.invalid = true;
      // Retire only this failed generation after its admitted scopes drain.
      // No automatic SQL retry: a subsequent caller starts a fresh generation.
      outsideTenantScope(() => {
        void this.closeTenant(owner.tenant).catch(() =>
          console.error('TENANT_CLOSE_FAILED', {
            tenant: owner.tenant,
            generation: owner.generation,
          }),
        );
      });
    }
  }
  static getTimezone(): string {
    return this.TIMEZONE;
  }
  static getCurrentTime(): Date {
    return TimezoneConfigUtils.getCurrentTime();
  }

  /** Administrative invalidation outside an operation; no silent hot swap. */
  static async closeTenant(tenant: string): Promise<void> {
    if (currentScope()) throw new TenantContextError('TENANT_CLOSE_INSIDE_OPERATION');
    const entry = this.entries.get(tenant);
    if (!entry || entry.state === 'closed') return;
    if (entry.closing) return entry.closing;
    entry.state = 'draining';
    entry.closing = Promise.resolve().then(async () => {
      try {
        await entry.pending;
      } catch {
        /* Never publish a late initialization. */
      }
      if (entry.scopes.size)
        await new Promise<void>((resolve) => {
          entry.drained = resolve;
          if (!entry.scopes.size) resolve();
        });
      if (entry.connection && (entry as Entry).state !== 'closed') await entry.connection.close();
      entry.state = 'closed';
      if (this.entries.get(tenant) === entry) this.entries.delete(tenant);
    });
    return entry.closing;
  }
  static async closeAllConnections(): Promise<void> {
    if (currentScope()) throw new TenantContextError('TENANT_CLOSE_INSIDE_OPERATION');
    if (this.closing) return this.closing;
    this.closing = Promise.resolve().then(async () => {
      await Promise.all([...this.entries.keys()].map((tenant) => this.closeTenant(tenant)));
    });
    try {
      await this.closing;
    } finally {
      this.closing = undefined;
    }
  }
}
