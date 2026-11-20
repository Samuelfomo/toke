import {
  QueryTypes,
  type Model,
  type ModelAttributeColumnOptions,
  type ModelStatic,
  type Sequelize,
  type Transaction,
} from 'sequelize';
import TenantManager from '../../database/db.tenant-manager.js';
import { assertTransaction } from '../../database/tenant.ownership.js';
import { memoFoundationStructures } from './foundations.models.js';

export interface ObserveLegacyStateCommand {
  commandId: string;
  memoId: number;
  /** Trusted effective principal, never an HTTP body identity. No ACL is granted here. */
  actorId: number;
  delegatedActorRef?: string;
}

/** Opt-in B1 repository. Not imported by routes, workers, bootstrap or V01.
 * Call only after business authorization in a later phase. The database role
 * can observe current state, never decide, assign, transfer or correct.
 */
export class MemoFoundationsPersistence {
  private constructor(
    private readonly connection: Sequelize,
    readonly models: ReadonlyMap<string, ModelStatic<Model>>,
  ) {}

  static async loadExisting(connection: Sequelize): Promise<MemoFoundationsPersistence> {
    TenantManager.assertConnection(connection);
    const rows = await connection.query<{ version: string }>(
      'SELECT public.toke_b1_version() AS version',
      { type: QueryTypes.SELECT },
    );
    if (rows[0]?.version !== 'b1-v1') throw new Error('B1_SCHEMA_NOT_READY');
    const models = new Map<string, ModelStatic<Model>>();
    const qi = connection.getQueryInterface();
    // Validate every column before publishing any repository. No sync/DDL.
    for (const structure of memoFoundationStructures) {
      const columns = await qi.describeTable({ tableName: structure.tableName, schema: 'public' });
      for (const [name, definition] of Object.entries(structure.attributes)) {
        const attribute = definition as ModelAttributeColumnOptions;
        const column = columns[name];
        if (!column || column.allowNull !== attribute.allowNull)
          throw new Error('B1_SCHEMA_NOT_READY');
        const expected = (attribute.type as { key?: string }).key;
        const actual = column.type.toUpperCase();
        const compatible: Record<string, string[]> = {
          INTEGER: ['INTEGER'],
          SMALLINT: ['SMALLINT'],
          BIGINT: ['BIGINT'],
          TEXT: ['TEXT'],
          UUID: ['UUID'],
          JSONB: ['JSONB'],
          DATE: ['TIMESTAMP WITH TIME ZONE'],
        };
        if (!expected || !compatible[expected]?.includes(actual))
          throw new Error('B1_SCHEMA_NOT_READY');
      }
    }
    for (const structure of memoFoundationStructures) {
      const model =
        connection.models[structure.tableName] ??
        connection.define(structure.tableName, structure.attributes, {
          schema: 'public',
          tableName: structure.tableName,
          timestamps: false,
          freezeTableName: true,
        });
      models.set(structure.tableName, model);
    }
    return new MemoFoundationsPersistence(connection, models);
  }

  /** Caller owns transaction lifetime. SQL function records event/command/workflow
   * together; deferred integrity checks are enforced at commit, not just here. */
  async observeLegacyState(
    command: ObserveLegacyStateCommand,
    transaction: Transaction,
  ): Promise<unknown> {
    TenantManager.assertConnection(this.connection);
    assertTransaction(transaction, this.connection);
    const rows = await this.connection.query<{ result: unknown }>(
      'SELECT public.toke_b1_observe_legacy($command,$memo,$actor,$delegated,$payload::jsonb) AS result',
      {
        bind: {
          command: command.commandId,
          memo: command.memoId,
          actor: command.actorId,
          delegated: command.delegatedActorRef ?? null,
          payload: '{}',
        },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return rows[0].result;
  }
}
