import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { InvitationStatus } from '../database/data/sponsor.db.js';
import TokenManager from '../../utils/token.generator.js';

export default class SponsorModel extends BaseModel {
  public readonly db = {
    tableName: tableName.INVITATION,
    id: 'id',
    guid: 'guid',
    phone_number: 'phone_number',
    country: 'country',
    status: 'status',
    metadata: 'metadata',
    reference: 'reference',
  } as const;
  protected id?: number;
  protected guid?: string;
  protected phone_number?: string;
  protected country?: string;
  protected status?: InvitationStatus;
  protected metadata?: object;
  protected reference?: string;

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
    console.log(guid);
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  /**
   * Trouve un enregistrement par son PHONE_NUMBER
   */
  protected async findByPhoneNumberAndTenant(
    phone_number: string,
    reference: string,
  ): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.phone_number]: phone_number,
      [this.db.reference]: reference,
    });
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

  protected async listByPhoneNumber(
    phone_number: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.phone_number]: phone_number }, paginationOptions);
  }

  protected async listAllByStatus(
    status: InvitationStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.status]: status }, paginationOptions);
  }

  /**
   * ✅ NEW: Find invitation by USER in metadata
   * Prevents the same user from being invited twice
   */
  protected async findByUser(user: string | number): Promise<any> {
    // Utilise une requête SQL pour chercher dans le JSONB directement
    return await this.findOne(this.db.tableName, {
      [Op.and]: [{ metadata: { [Op.contains]: { user: String(user) } } }],
    });
  }

  /**
   * Créer une invitation
   */
  protected async create(): Promise<void> {
    // await this.validate();

    // const guid = await this.randomGuidGenerator(this.db.tableName, 6);
    let guid: string | null = null;
    const maxAttempts = 10;
    let attempt = 0;

    // 🔁 Essayer de générer un GUID unique jusqu’à 10 fois
    while (attempt < maxAttempts) {
      attempt++;
      const newGuid = await TokenManager.tokenGenerator(6);

      if (!newGuid) {
        console.warn(`⚠️ Tentative ${attempt}: échec de génération du GUID`);
        continue;
      }

      const exists = await this.findByGuid(newGuid);
      if (!exists) {
        guid = newGuid;
        break; // ✅ GUID unique trouvé
      }

      console.warn(`⚠️ Tentative ${attempt}: GUID ${newGuid} déjà existant`);
    }

    // ❌ Après 10 tentatives sans succès
    if (!guid) {
      throw new Error(`❌ Impossible de générer un GUID unique après ${maxAttempts} tentatives`);
    }

    this.reference = (this.metadata as any).tenant.reference;

    const existPhone = await this.findByPhoneNumberAndTenant(this.phone_number!, this.reference!);
    if (existPhone) {
      throw new Error(`Invitation phone number already exists for this tenant`);
    }

    // ✅ NEW: Si user est fourni, vérifier qu'il n'a pas été invité avant
    if (this.metadata && (this.metadata as any).user) {
      const existUser = await this.findByUser((this.metadata as any).user);
      if (existUser) {
        throw new Error(`User ${(this.metadata as any).user} has already been invited`);
      }
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.phone_number]: this.phone_number,
      [this.db.country]: this.country,
      [this.db.status]: InvitationStatus.PENDING,
      [this.db.metadata]: this.metadata,
      [this.db.reference]: this.reference,
    });

    if (!lastID) {
      throw new Error(`Failed to create invitation user entry`);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;

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
    if (this.country !== undefined) updateData[this.db.country] = this.country;
    if (this.status !== undefined) updateData[this.db.status] = this.status;
    if (this.metadata !== undefined) updateData[this.db.metadata] = this.metadata;
    if (this.reference !== undefined) updateData[this.db.reference] = this.reference;

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
