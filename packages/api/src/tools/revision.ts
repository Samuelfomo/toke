import { HttpStatus } from '@toke/shared';
import dotenv from 'dotenv';

import { createApiClient } from '../utils/axios.config.js';
import BaseModel from '../master/database/db.base.js';
import { EntityRoute } from '../utils/response.model.js';

dotenv.config();
export default class Revision extends BaseModel {
  static async getRevision(tableName: string): Promise<string> {
    const instance = new Revision();
    const lastModified = await instance.findLastModification(tableName);
    if (!lastModified) return '202501010000';

    const year = lastModified.getUTCFullYear();
    const month = String(lastModified.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lastModified.getUTCDate()).padStart(2, '0');
    const hours = String(lastModified.getUTCHours()).padStart(2, '0');
    const minutes = String(lastModified.getUTCMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}`;
  }
}

export class MasterRevision {
  static async getLexiconRevision(): Promise<string> {
    try {
      // client dédié avec baseURL spécifique
      const api = createApiClient(`http://${process.env.SERVER_HOST}:${process.env.MT_PORT}`);

      const revision = await api.get(`/${EntityRoute.MASTER}/lexicon/revision`);

      if (revision.status !== HttpStatus.SUCCESS) {
        return revision.data.data;
      }
      return revision.data.data.revision;
    } catch (error: any) {
      if (error.response) {
        return error.response.data.error;
      } else if (error.request) {
        return 'No response from server';
      } else {
        return 'Unexpected error';
      }
    }
  }
}
