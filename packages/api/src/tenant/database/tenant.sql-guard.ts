import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
import pg from 'pg';
import { Sequelize, Transaction } from 'sequelize';
import { currentScope, TenantContextError } from './tenant.context.js';
import {
  assertConnection,
  assertModelAvailable,
  assertTransaction as assertTransactionOwner,
  connectionOwner,
  ownsTransaction,
  registerTransaction,
  transactionOperation,
} from './tenant.ownership.js';

const acquiring = new AsyncLocalStorage<Sequelize>();
const connecting = new AsyncLocalStorage<Sequelize>();
const starting = new AsyncLocalStorage<Sequelize>();
const cleanup = new AsyncLocalStorage<object>();
const finishing = new AsyncLocalStorage<object>();
const nativeConnections = new WeakMap<object, Sequelize>();
const nativeTransactions = new WeakMap<object, any>();
const transactionConnections = new WeakMap<object, object>();
const rollbackFlights = new WeakMap<object, Promise<unknown>>();
const connectAttempt = new AsyncLocalStorage<{ db: Sequelize; clients: Set<any> }>();

function assertTransaction(transaction: any, db: Sequelize): void {
  assertTransactionOwner(transaction, db);
  if (transaction.parent) assertTransaction(transaction.parent, db);
  if (
    transactionConnections.get(transaction) !== transaction.connection ||
    nativeConnections.get(transaction.connection) !== db ||
    (transaction.parent && transaction.parent.connection !== transaction.connection)
  ) {
    throw new TenantContextError('TENANT_TRANSACTION_CONNECTION_MISMATCH');
  }
}

function text(sql: any): string {
  return typeof sql === 'string' ? sql : (sql?.query ?? sql?.text ?? '');
}
const rollbackSQL = /^ROLLBACK(?:\s+TO\s+SAVEPOINT\s+"[\w-]+")?;?$/i;
function canRollback(transaction: any, db: Sequelize, sql: any): boolean {
  return (
    ownsTransaction(transaction, db) &&
    transactionConnections.get(transaction) === transaction.connection &&
    nativeConnections.get(transaction.connection) === db &&
    rollbackSQL.test(text(sql))
  );
}

function checkNative(db: Sequelize, connection: object, sql: any): void {
  const tx = cleanup.getStore();
  if (tx && (tx as any).connection === connection && canRollback(tx, db, sql)) return;
  assertConnection(db);
  if (connecting.getStore() === db) {
    // Only the session setup and OID query emitted by the reviewed PG dialect.
    const statement = text(sql);
    const session =
      /^(?:SET standard_conforming_strings=on;|SET client_min_messages TO warning;|SET TIME ZONE 'Africa\/Douala';)+$/;
    const metadata =
      statement.startsWith('WITH ranges AS (  SELECT pg_range.rngtypid,') &&
      statement.endsWith("WHERE (pg_type.typtype IN('b', 'e'));");
    if (!session.test(statement) && !metadata)
      throw new TenantContextError('TENANT_TECHNICAL_SQL_DENIED');
  }
  const transaction = nativeTransactions.get(connection);
  // finished can be set before COMMIT reaches the wire. The physical UUID is
  // cleared by Sequelize only on release; until then keep operation ownership.
  if (transaction && (connection as any).uuid !== undefined) {
    assertTransaction(transaction, db);
    if (
      transaction.finished &&
      !(finishing.getStore() === transaction && /^COMMIT;?$/i.test(text(sql)))
    ) {
      throw new TenantContextError('TENANT_TRANSACTION_FINISHED');
    }
  }
}

export function tenantDriver(getConnection: () => Sequelize): typeof pg {
  if (process.env.NODE_PG_FORCE_NATIVE)
    throw new TenantContextError('TENANT_ORM_CONFIGURATION_UNSUPPORTED');
  class TenantClient extends pg.Client {
    constructor(...args: any[]) {
      super(...args);
      nativeConnections.set(this, getConnection());
      const attempt = connectAttempt.getStore();
      if (attempt?.db === getConnection()) attempt.clients.add(this);
    }
    query(...args: any[]): any {
      checkNative(getConnection(), this, args[0]);
      return super.query(...args);
    }
  }
  return { ...pg, Client: TenantClient };
}

function attachTransaction(db: Sequelize, transaction: any): void {
  if (ownsTransaction(transaction, db)) return;
  if (nativeConnections.get(transaction.connection) !== db)
    throw new TenantContextError('TENANT_TRANSACTION_CONNECTION_MISMATCH');
  registerTransaction(transaction, db);
  transactionConnections.set(transaction, transaction.connection);
  if (transaction.connection) nativeTransactions.set(transaction.connection, transaction);
  const restoreParent = () => {
    if (transaction.parent && nativeTransactions.get(transaction.connection) === transaction)
      nativeTransactions.set(transaction.connection, transaction.parent);
  };
  const commit = transaction.commit?.bind(transaction);
  if (commit)
    transaction.commit = (...args: any[]) => {
      assertTransaction(transaction, db);
      if (transaction.finished) throw new TenantContextError('TENANT_TRANSACTION_FINISHED');
      return finishing.run(transaction, () =>
        Promise.resolve(commit(...args)).finally(restoreParent),
      );
    };
  const rollback = transaction.rollback?.bind(transaction);
  if (rollback)
    transaction.rollback = (...args: any[]) => {
      const scope = currentScope();
      if (
        !scope ||
        scope.operationId !== transactionOperation(transaction) ||
        scope.tenant !== connectionOwner(db).tenant
      ) {
        throw new TenantContextError('TENANT_TRANSACTION_MISMATCH');
      }
      const flight = rollbackFlights.get(transaction);
      if (flight) return flight;
      // A root rollback already cancels every savepoint on its connection.
      // Do not enqueue ROLLBACK TO on a connection the root is releasing.
      for (let parent = transaction.parent; parent; parent = parent.parent) {
        const parentFlight = rollbackFlights.get(parent);
        if (parentFlight) {
          transaction.finished = 'rollback';
          return parentFlight;
        }
      }
      const pending = cleanup.run(transaction, () =>
        Promise.resolve()
          .then(() => rollback(...args))
          .finally(restoreParent),
      );
      rollbackFlights.set(transaction, pending);
      return pending;
    };
  if (!transaction.parent && rollback) {
    // Bind only this cleanup callback to the original operation. An expired
    // token still cannot perform business SQL; cleanup permits owned ROLLBACK.
    currentScope()!.lifetime.onClose(
      AsyncResource.bind(() => {
        if (!transaction.finished) {
          void transaction.rollback().catch(() => {
            console.error('TENANT_ROLLBACK_CLEANUP_FAILED', { tenant: connectionOwner(db).tenant });
          });
        }
      }),
    );
  }
}

/** Guard only this tenant instance. APIs below are verified against 6.37.8. */
export function installTenantSQLGuard(db: Sequelize): void {
  if (
    (Sequelize as any).version !== '6.37.8' ||
    (Sequelize as any)._cls ||
    (db as any).options.replication ||
    db.config.native
  ) {
    throw new TenantContextError('TENANT_ORM_CONFIGURATION_UNSUPPORTED');
  }
  const instance = db as any;
  const targetFields = ['host', 'port', 'database', 'username', 'password'];
  const target = targetFields.map((field) => instance.config[field]);
  const assertTarget = (config: any) => {
    if (targetFields.some((field, index) => config[field] !== target[index]))
      throw new TenantContextError('TENANT_CONFIG_CHANGED');
  };
  const query = instance.query.bind(db);
  instance.query = async (sql: any, supplied: any = {}) => {
    const clean = cleanup.getStore();
    if (
      clean &&
      (supplied.transaction === clean || supplied.transaction === (clean as any).parent) &&
      canRollback(clean, db, sql)
    )
      return query(sql, supplied);
    assertConnection(db);
    assertTarget(instance.config);
    if (instance.options.query?.transaction)
      throw new TenantContextError('TENANT_IMPLICIT_TRANSACTION_DENIED');
    const options = { ...supplied };
    if (options.model) assertModelAvailable(options.model);
    if (options.instance) assertModelAvailable(options.instance.constructor);
    if (
      (options.model && options.model.sequelize !== db) ||
      (options.instance && options.instance.sequelize !== db)
    ) {
      throw new TenantContextError('TENANT_MODEL_MISMATCH');
    }
    const transaction = options.transaction;
    if (transaction) {
      const versionProbe =
        acquiring.getStore() === db &&
        nativeConnections.get(transaction.connection) === db &&
        text(sql) === 'SHOW SERVER_VERSION';
      if (!versionProbe) {
        if (
          !ownsTransaction(transaction, db) &&
          starting.getStore() === db &&
          transaction instanceof Transaction
        )
          attachTransaction(db, transaction);
        assertTransaction(transaction, db);
        if (
          transaction.finished &&
          !(finishing.getStore() === transaction && /^COMMIT;?$/i.test(text(sql)))
        ) {
          throw new TenantContextError('TENANT_TRANSACTION_FINISHED');
        }
      }
    }
    return query(sql, options);
  };
  const transact = instance.transaction.bind(db);
  instance.transaction = (...args: any[]) => {
    assertConnection(db);
    const callbackIndex = typeof args[0] === 'function' ? 0 : 1;
    const callback = args[callbackIndex];
    if (args[0]?.transaction) assertTransaction(args[0].transaction, db);
    if (callback)
      args[callbackIndex] = (transaction: any) => {
        attachTransaction(db, transaction);
        return callback(transaction);
      };
    const result = starting.run(db, () => transact(...args));
    return Promise.resolve(result).then((transaction: any) => {
      if (!callback) attachTransaction(db, transaction);
      return transaction;
    });
  };
  const cm = instance.connectionManager;
  const get = cm.getConnection.bind(cm);
  cm.getConnection = (...args: any[]) => {
    assertConnection(db);
    return acquiring.run(db, () => get(...args));
  };
  const connect = cm._connect.bind(cm);
  cm._connect = async (...args: any[]) => {
    assertConnection(db);
    const attempt = { db, clients: new Set<any>() };
    return connectAttempt.run(attempt, () =>
      connecting.run(db, async () => {
        try {
          return await connect(...args);
        } catch (error) {
          // The PG dialect can fail after opening its client but before returning
          // it to Sequelize's pool (e.g. denied session SQL or OID setup failure).
          await Promise.all(
            [...attempt.clients].map(async (client) => {
              if (!client._ending)
                await new Promise<void>((resolve, reject) => {
                  client.end((endError: unknown) => (endError ? reject(endError) : resolve()));
                });
            }),
          );
          throw error;
        }
      }),
    );
  };
  db.addHook('beforeQuery', (options: any) => {
    if (!cleanup.getStore()) {
      assertConnection(db);
      if (options.transaction && options.transaction instanceof Transaction) {
        assertTransaction(options.transaction, db);
        if (options.transaction.finished && finishing.getStore() !== options.transaction)
          throw new TenantContextError('TENANT_TRANSACTION_FINISHED');
      }
    }
  });
  db.addHook('beforeConnect', (config: any) => {
    assertConnection(db);
    assertTarget(config);
  });
}
