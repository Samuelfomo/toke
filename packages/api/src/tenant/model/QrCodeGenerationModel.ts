import { QR_CODE_ERRORS } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import TokenManager from '../../utils/token.generator.js';

export default class QrCodeGenerationModel extends BaseModel {
  public readonly db = {
    tableName: tableName.QR_CODE_GENERATION,
    id: 'id',
    guid: 'guid',
    site: 'site',
    manager: 'manager',
    valid_from: 'valid_from',
    valid_to: 'valid_to',
    created_at: 'created_at',
    updated_at: 'updated_at',
    shared: 'shared',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected site?: number;
  protected manager?: number;
  protected valid_from?: Date;
  protected valid_to?: Date;
  protected created_at?: Date;
  protected updated_at?: Date;
  protected shared: boolean = false;

  protected constructor() {
    super();
  }

  // ============================================================================
  // 1. RECHERCHES DE BASE
  // ============================================================================

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async listAllBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.site]: site }, paginationOptions);
  }

  protected async listAllByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.manager]: manager }, paginationOptions);
  }

  // ============================================================================
  // 2. RECHERCHES SPÉCIFIQUES
  // ============================================================================

  // QR codes actifs (dans la période de validité)
  protected async findActiveQrCodes(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();

    return await this.findAll(
      this.db.tableName,
      {
        [Op.and]: [
          // QR code dont la période de validité a commencé (ou pas encore définie)
          {
            [Op.or]: [{ [this.db.valid_from]: null }, { [this.db.valid_from]: { [Op.lte]: now } }],
          },
          // QR code dont la période de validité n'est pas expirée
          {
            [Op.or]: [{ [this.db.valid_to]: null }, { [this.db.valid_to]: { [Op.gte]: now } }],
          },
        ],
      },
      paginationOptions,
    );
  }

  // QR codes expirés
  protected async findExpiredQrCodes(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.valid_to]: {
          [Op.ne]: null,
          [Op.lte]: now,
        },
      },
      paginationOptions,
    );
  }

  // QR codes avec durée illimitée
  protected async findUnlimitedQrCodes(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.valid_to]: null }, paginationOptions);
  }

  // QR codes pour un site spécifique (actifs uniquement)
  protected async findActiveBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.site]: site,
        [Op.and]: [
          // QR code dont la validité a commencé
          {
            [Op.or]: [{ [this.db.valid_from]: null }, { [this.db.valid_from]: { [Op.lte]: now } }],
          },
          // QR code dont la validité n’est pas encore expirée
          {
            [Op.or]: [{ [this.db.valid_to]: null }, { [this.db.valid_to]: { [Op.gte]: now } }],
          },
        ],
      },
      paginationOptions,
    );
  }

  // QR codes créés par un manager (actifs uniquement)
  protected async findActiveByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.manager]: manager,
        [Op.and]: [
          {
            [Op.or]: [{ [this.db.valid_from]: null }, { [this.db.valid_from]: { [Op.lte]: now } }],
          },
          {
            [Op.or]: [{ [this.db.valid_to]: null }, { [this.db.valid_to]: { [Op.gte]: now } }],
          },
        ],
      },
      paginationOptions,
    );
  }

  // ============================================================================
  // 3. STATISTIQUES
  // ============================================================================

  protected async getQrCodeStatistics(filters: Record<string, any> = {}): Promise<any> {
    const now = new Date();

    const [totalQrCodes, activeQrCodes, expiredQrCodes, unlimitedQrCodes, qrCodesBySite] =
      await Promise.all([
        // Total de tous les QR codes
        this.count(this.db.tableName, filters),

        // QR codes actifs : valid_from <= now ET (valid_to >= now ou null)
        this.count(this.db.tableName, {
          ...filters,
          [Op.and]: [
            {
              [Op.or]: [
                { [this.db.valid_from]: null },
                { [this.db.valid_from]: { [Op.lte]: now } },
              ],
            },
            {
              [Op.or]: [{ [this.db.valid_to]: null }, { [this.db.valid_to]: { [Op.gte]: now } }],
            },
          ],
        }),

        // QR codes expirés : valid_to < now
        this.count(this.db.tableName, {
          ...filters,
          [this.db.valid_to]: {
            [Op.ne]: null,
            [Op.lt]: now,
          },
        }),

        // QR codes illimités : valid_to est null
        this.count(this.db.tableName, {
          ...filters,
          [this.db.valid_to]: null,
        }),

        // Regroupement par site
        this.countByGroup(this.db.tableName, this.db.site, filters),
      ]);

    return {
      total_qr_codes: totalQrCodes,
      active: activeQrCodes,
      expired: expiredQrCodes,
      unlimited: unlimitedQrCodes,
      by_site: qrCodesBySite,
      expiration_rate: totalQrCodes > 0 ? ((expiredQrCodes / totalQrCodes) * 100).toFixed(2) : 0,
    };
  }

  // ============================================================================
  // 4. CRUD OPERATIONS
  // ============================================================================

  protected async create(): Promise<void> {
    // const guid = await this.randomGuidGenerator(this.db.tableName, 6);
    // if (!guid) {
    //   throw new Error(QR_CODE_ERRORS.GUID_GENERATION_FAILED);
    // }
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
      throw new Error(QR_CODE_ERRORS.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.site]: this.site,
      [this.db.manager]: this.manager,
      [this.db.valid_from]: this.valid_from,
      [this.db.valid_to]: this.valid_to,
    });

    if (!lastID) {
      throw new Error(QR_CODE_ERRORS?.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    if (!this.id) {
      throw new Error(QR_CODE_ERRORS?.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.site !== undefined) updateData[this.db.site] = this.site;
    if (this.manager !== undefined) updateData[this.db.manager] = this.manager;
    if (this.valid_from !== undefined) updateData[this.db.valid_from] = this.valid_from;
    if (this.valid_to !== undefined) updateData[this.db.valid_to] = this.valid_to;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(QR_CODE_ERRORS?.UPDATE_FAILED || 'QR Code update failed');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }
}
