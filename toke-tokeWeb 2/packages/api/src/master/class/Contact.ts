import ContactModel from '../model/ContactModel.js';
import { responseStructure as RS } from '../../utils/response.model.js';

export class Contact extends ContactModel {
  constructor() {
    super();
  }

  // === GETTERS FLUENT ===

  static async _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ) {
    return new Contact().list(conditions, paginationOptions);
  }

  static async _load(
    identifier: any,
    byGuid: boolean = false,
    byPhone: boolean = false,
  ): Promise<Contact | null> {
    return new Contact().load(identifier, byGuid, byPhone);
  }

  static async _listByTenant(
    tenant: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Contact[] | null> {
    return new Contact().listByTenant(tenant, paginationOptions);
  }

  getId(): number | undefined {
    return this.id;
  }

  // === SETTERS ===

  getGuid(): string | undefined {
    return this.guid;
  }

  getTenant(): string | undefined {
    return this.tenant;
  }

  getPhone(): string | undefined {
    return this.phone;
  }

  setTenant(tenant: string): Contact {
    this.tenant = tenant;
    return this;
  }

  setPhone(phone: string): Contact {
    this.phone = phone;
    return this;
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byPhone: boolean = false,
  ): Promise<Contact | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byPhone
        ? await this.findByPhone(identifier)
        : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Contact[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Contact().hydrate(data));
  }

  async listByTenant(
    tenant: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Contact[] | null> {
    const dataset = await this.listAllByTenant(tenant, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Contact().hydrate(data));
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⌐ Erreur sauvegarde contact:', error.message);
      throw new Error(error);
    }
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      return await this.trash(this.id);
    }
    return false;
  }

  toJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.PHONE_NUMBER]: this.phone,
    };
  }

  private isNew(): boolean {
    return this.id === undefined;
  }

  private hydrate(data: any): Contact {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.phone = data.phone;
    return this;
  }
}
