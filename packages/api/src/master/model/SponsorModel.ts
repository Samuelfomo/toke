import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { InvitationStatus } from '../database/data/sponsor.db.js';

export default class SponsorModel extends BaseModel {
  public readonly db = {
    tableName: tableName.INVITATION,
    id: 'id',
    guid: 'guid',
    phone_number: 'phone_number',
    status: 'status',
    metadata: 'metadata',
  } as const;
  protected id?: number;
  protected guid?: string;
  protected phone_number?: string;
  protected status?: InvitationStatus;
  protected metadata?: object;

  protected constructor() {
    super();
  }

  /**
   * Trouve un enregistrement par son ID
   */
  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Trouve un enregistrement par son GUID
   */
  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  /**
   * Trouve un enregistrement par son PHONE_NUMBER
   */
  protected async findByPhoneNumber(phone_number: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.phone_number]: phone_number });
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByStatus(
    status: InvitationStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.status]: status }, paginationOptions);
  }

  /**
   * Créer une invitation
   */
  protected async create(): Promise<void> {
    // await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error(`Failed to generate GUID token for inviation master entry`);
    }

    const existPhone = await this.findByPhoneNumber(this.phone_number!);
    if (existPhone) {
      throw new Error(`Invitation phone number already exists`);
    }
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.phone_number]: this.phone_number,
      [this.db.status]: InvitationStatus.PENDING,
      [this.db.metadata]: this.metadata,
    });

    if (!lastID) {
      throw new Error(`Failed to create invitation user entry`);
    }

    this.id = lastID.id;
    this.guid = guid;
    this.status = InvitationStatus.PENDING;
  }

  /**
   * Mettre à jour une invitation
   */
  protected async update(): Promise<void> {
    // await this.validate();

    if (!this.id) {
      throw new Error('Invitation ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.phone_number !== undefined) updateData[this.db.phone_number] = this.phone_number;
    if (this.status !== undefined) updateData[this.db.status] = this.status;
    if (this.metadata !== undefined) updateData[this.db.metadata] = this.metadata;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update invitation entry');
    }
  }

  /**
   * Supprime une invitation
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  // private async validate(): Promise<void> {}
}
