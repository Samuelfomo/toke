import type { Sequelize } from 'sequelize';
import { pinGeneration, tenantScope, TenantContextError } from './tenant.context.js';

export interface ConnectionOwner {
  readonly tenant: string;
  readonly generation: number;
  readonly usable: () => boolean;
  readonly retain: (scope: ReturnType<typeof tenantScope>) => void;
}
const owners = new WeakMap<object, ConnectionOwner>();
const transactionOwners = new WeakMap<object, { connection: Sequelize; operationId: string }>();
const unavailableModels = new WeakSet<object>();
export function markModelUnavailable(model: object): void {
  unavailableModels.add(model);
}
export function assertModelAvailable(model: object): void {
  if (unavailableModels.has(model)) throw new TenantContextError('TENANT_SCHEMA_NOT_READY');
}

export function registerConnection(connection: Sequelize, owner: ConnectionOwner): void {
  if (owners.has(connection)) throw new TenantContextError('TENANT_CONNECTION_ALREADY_OWNED');
  owners.set(connection, owner);
}

export function assertConnection(connection: Sequelize): ConnectionOwner {
  const scope = tenantScope();
  const owner = owners.get(connection);
  if (!owner || owner.tenant !== scope.tenant)
    throw new TenantContextError('TENANT_CONTEXT_MISMATCH');
  if (!owner.usable()) throw new TenantContextError('TENANT_GENERATION_STALE');
  if (pinGeneration(owner)) owner.retain(scope);
  return owner;
}

export function connectionOwner(connection: Sequelize): ConnectionOwner {
  const owner = owners.get(connection);
  if (!owner) throw new TenantContextError('TENANT_CONNECTION_UNOWNED');
  return owner;
}

export function registerTransaction(transaction: any, connection: Sequelize): void {
  assertConnection(connection);
  if (transaction.sequelize !== connection)
    throw new TenantContextError('TENANT_TRANSACTION_MISMATCH');
  if (transaction.parent) assertTransaction(transaction.parent, connection);
  transactionOwners.set(transaction, { connection, operationId: tenantScope().operationId });
}

export function assertTransaction(transaction: any, connection: Sequelize): void {
  assertConnection(connection);
  const owner = transactionOwners.get(transaction);
  if (
    !owner ||
    owner.connection !== connection ||
    transaction.sequelize !== connection ||
    owner.operationId !== tenantScope().operationId
  ) {
    throw new TenantContextError('TENANT_TRANSACTION_MISMATCH');
  }
}

export function ownsTransaction(transaction: object, connection: Sequelize): boolean {
  return transactionOwners.get(transaction)?.connection === connection;
}

export function transactionOperation(transaction: object): string | undefined {
  return transactionOwners.get(transaction)?.operationId;
}
