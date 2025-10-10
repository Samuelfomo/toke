import { isValidPhoneNumber } from 'libphonenumber-js';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class ContactModel extends BaseModel {
  public readonly db = {
    tableName: tableName.CONTACT,
    id: 'id',
    guid: 'guid',
    phone: 'phone',
    tenant: 'tenant',
  };

  protected id?: number;
  protected guid?: string;
  protected phone?: string;
  protected tenant?: string;

  protected constructor() {
    super();
  }

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }
  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }
  protected async findByPhone(phone: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.phone]: phone });
  }
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }
  protected async listAllByTenant(
    tenant: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.tenant]: tenant }, paginationOptions);
  }
  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.randomGuidGenerator(this.db.tableName, 16);
    if (!guid) {
      throw new Error('Failed to generate GUID for contact entry');
    }

    const lastId = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.phone]: this.phone,
      [this.db.tenant]: this.tenant,
    });
    if (!lastId) {
      throw new Error('Failed to create contact entry');
    }
    this.id = typeof lastId === 'object' ? lastId.id : lastId;
    this.guid = guid;
  }
  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error('Contact ID is required for update');
    }
    const updateData: Record<string, any> = {};
    if (this.phone !== undefined) updateData[this.db.phone] = this.phone;
    if (this.tenant !== undefined) updateData[this.db.tenant] = this.tenant;
    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update contact entry');
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async validate(): Promise<void> {
    if (!this.phone) {
      throw new Error('Phone number is required');
    }
    if (!isValidPhoneNumber(this.phone)) {
      throw new Error('Invalid phone number');
    }
    if (this.tenant && (this.tenant.trim().length < 1 || this.tenant.trim().length > 128)) {
      throw new Error('Tenant is invalid');
    }
  }
}
