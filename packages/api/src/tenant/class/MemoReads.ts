import MemoReadsModel from '../model/MemoReadsModel.js';
import type { Transaction } from 'sequelize';

export default class MemoReads extends MemoReadsModel {
  constructor() {
    super();
  }

  static _getReads(memoIds: number[], userId: number): Promise<Map<number, Date>> {
    return new MemoReads().getReads(memoIds, userId);
  }

  static _markRead(memoId: number, userId: number, readAt: Date | string, transaction?: Transaction): Promise<Date> {
    return new MemoReads().saveRead(memoId, userId, readAt, transaction);
  }
}
