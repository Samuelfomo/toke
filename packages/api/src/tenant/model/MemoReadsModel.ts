import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class MemoReadsModel extends BaseModel {
  protected constructor() {
    super();
  }

  protected async getReads(memoIds: number[], userId: number): Promise<Map<number, Date>> {
    if (memoIds.length === 0) return new Map();
    const rows = await this.findAll(tableName.MEMO_READS, {
      memo_id: { [Op.in]: memoIds },
      user_id: userId,
    });
    return new Map(rows.map((row) => [Number(row.memo_id), new Date(row.read_at)]));
  }

  // Écriture atomique, et exclusivement dans la couche Model.
  protected async saveRead(memoId: number, userId: number, readAt: Date): Promise<Date> {
    const table = tableName.MEMO_READS;
    const [rows] = await this.sequelize.query(
      `INSERT INTO "${table}" (memo_id, user_id, read_at)
       VALUES (:memoId, :userId, :readAt)
       ON CONFLICT (memo_id, user_id)
       DO UPDATE SET read_at = GREATEST("${table}".read_at, EXCLUDED.read_at)
       RETURNING read_at`,
      { replacements: { memoId, userId, readAt } },
    );
    return new Date((rows as Array<{ read_at: Date }>)[0].read_at);
  }
}
