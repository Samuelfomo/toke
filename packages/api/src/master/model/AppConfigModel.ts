import { APP_CONFIG_CODES, APP_CONFIG_DEFAULTS, APP_CONFIG_ERRORS } from '@toke/shared';
import {
  validateAppConfigCreation,
  validateAppConfigUpdate,
} from '@toke/shared/dist/schemas/app.config';

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
    return await this.findOne(this.db.tableName, { [this.db.key]: key.toUpperCase() });
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
    await this.validate(true);

    const existKey = await this.findByKey(this.key!.toUpperCase());
    if (existKey) {
      throw new Error(
        `${APP_CONFIG_CODES.KEY_ALREADY_EXISTS}: ${APP_CONFIG_ERRORS.KEY_ALREADY_EXISTS}`,
      );
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.key]: this.key,
      [this.db.link]: this.link?.toUpperCase(),
      [this.db.active]: this.active ?? APP_CONFIG_DEFAULTS.ACTIVE,
    });
    if (!lastID) {
      throw new Error(`${APP_CONFIG_CODES.CREATION_FAILED}: ${APP_CONFIG_ERRORS.CREATION_FAILED}`);
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
  }

  protected async update(): Promise<void> {
    await this.validate(false);
    if (!this.id) {
      throw new Error(`${APP_CONFIG_CODES.INVALID_ID}: ${APP_CONFIG_ERRORS.ID_REQUIRED}`);
    }
    const updateData: Record<string, any> = {};
    if (this.key !== undefined) {
      const existKey = await this.findByKey(this.key!);
      if (existKey && existKey.id !== this.id) {
        throw new Error(
          `${APP_CONFIG_CODES.KEY_ALREADY_EXISTS}: ${APP_CONFIG_ERRORS.KEY_ALREADY_EXISTS}`,
        );
      }
      updateData[this.db.key] = this.key.toUpperCase();
    }
    if (this.link !== undefined) updateData[this.db.link] = this.link;
    if (this.active !== undefined) updateData[this.db.active] = this.active;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error(`${APP_CONFIG_CODES.UPDATE_FAILED}: ${APP_CONFIG_ERRORS.UPDATE_FAILED}`);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Valide les données avec Zod
   */
  private async validate(isCreation: boolean = true): Promise<void> {
    const data = {
      key: this.key,
      link: this.link,
      active: this.active,
    };

    try {
      if (isCreation) {
        validateAppConfigCreation(data);
      } else {
        // Pour la mise à jour, on valide seulement les champs présents
        const updateData: Record<string, any> = {};
        if (this.key !== undefined) updateData.key = this.key;
        if (this.link !== undefined) updateData.link = this.link;
        if (this.active !== undefined) updateData.active = this.active;

        if (Object.keys(updateData).length > 0) {
          validateAppConfigUpdate(updateData);
        }
      }
    } catch (error: any) {
      throw new Error(`${APP_CONFIG_CODES.VALIDATION_FAILED}: ${error.message}`);
    }
  }
}
