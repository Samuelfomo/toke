import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class AppConfigModel extends BaseModel {
  public readonly db = {
    tableName: tableName.APP_CONFIG,
    id: 'id',
    key: 'key',
    link: 'link',
    active: 'active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected key?: string;
  protected link?: string;
  protected active?: boolean;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByKey(key: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.key]: key });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: active }, paginationOptions);
  }

  protected async create(): Promise<void> {
    await this.validate();

    const existKey = await this.findByKey(this.key!);
    if (existKey) {
      throw new Error('');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.key]: this.key,
      [this.db.link]: this.link,
      [this.db.active]: this.active || true,
    });
    if (!lastID) {
      throw new Error('');
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error('');
    }
    const updateData: Record<string, any> = {};
    if (this.key !== undefined) {
      const existKey = await this.findByKey(this.key!);
      if (existKey && existKey.id !== this.id) {
        throw new Error('');
      }
      updateData[this.db.key] = this.key;
    }
    if (this.link !== undefined) updateData[this.db.link] = this.link;
    if (this.active !== undefined) updateData[this.db.active] = this.active;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {}
}
