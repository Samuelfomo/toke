import { BillingCycle, LicenseStatus, Type } from '@toke/shared';
import { QueryTypes } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class GlobalLicenseModel extends BaseModel {
  public readonly db = {
    tableName: tableName.GLOBAL_LICENSE,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    license_type: 'license_type',
    billing_cycle_months: 'billing_cycle_months',
    base_price_usd: 'base_price_usd',
    minimum_seats: 'minimum_seats',
    current_period_start: 'current_period_start',
    current_period_end: 'current_period_end',
    next_renewal_date: 'next_renewal_date',
    license_status: 'license_status',
    // ❌ SUPPRIMÉ: total_seats_purchased - c'est une colonne générée
  } as const;

  // Colonnes stockées physiquement dans la base
  protected id?: number;
  protected guid?: number;
  protected tenant?: number;
  protected license_type?: Type;
  protected billing_cycle_months?: BillingCycle;
  protected base_price_usd?: number;
  protected minimum_seats?: number;
  protected current_period_start?: Date;
  protected current_period_end?: Date;
  protected next_renewal_date?: Date;
  protected license_status?: LicenseStatus;

  // Colonnes calculées (lecture seule, chargées via raw queries)
  private _total_seats_purchased?: number;
  private _billing_status?: string;

  protected constructor() {
    super();
  }

  /**
   * Charge les colonnes calculées pour cette licence
   * Doit être appelé après chaque load/create/update
   */
  protected async loadComputedColumns(): Promise<void> {
    if (!this.guid) return;

    try {
      const result = await this.raw(
        `
        SELECT 
          total_seats_purchased,
          billing_status
        FROM xa_global_license
        WHERE guid = $1
        LIMIT 1
      `,
        [this.guid],
      );

      if (result && result.length > 0) {
        this._total_seats_purchased = result[0].total_seats_purchased;
        this._billing_status = result[0].billing_status;
      }
    } catch (error) {
      console.error('⚠️ Erreur chargement colonnes calculées:', error);
      // Ne pas throw pour ne pas bloquer le reste
    }
  }

  /**
   * Exécute une requête SQL brute
   */
  protected async raw(query: string, params: any[] = []): Promise<any[]> {
    try {
      const [results] = await this.sequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT,
      });
      return results as any[];
    } catch (error) {
      console.error('❌ Erreur raw query:', error);
      throw error;
    }
  }

  /**
   * Trouve un enregistrement par son ID
   * Utilise raw query pour inclure les colonnes générées
   */
  protected async find(id: number): Promise<any> {
    const result = await this.raw(
      `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      WHERE gl.id = $1
      LIMIT 1
    `,
      [id],
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Trouve un enregistrement par son GUID
   * Utilise raw query pour inclure les colonnes générées
   */
  protected async findByGuid(guid: number): Promise<any> {
    const result = await this.raw(
      `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      WHERE gl.guid = $1
      LIMIT 1
    `,
      [guid],
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Trouve un enregistrement par son tenant
   * Utilise raw query pour inclure les colonnes générées
   */
  protected async findByTenant(tenant: number): Promise<any> {
    const result = await this.raw(
      `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      WHERE gl.tenant = $1
      LIMIT 1
    `,
      [tenant],
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Liste tous les enregistrements selon les conditions
   * Utilise raw query pour inclure les colonnes générées
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    // Construction de la clause WHERE
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(conditions).forEach(([key, value]) => {
      whereClauses.push(`gl.${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    });

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limitClause = paginationOptions.limit ? `LIMIT $${paramIndex}` : '';
    const offsetClause = paginationOptions.offset
      ? `OFFSET $${paramIndex + (paginationOptions.limit ? 1 : 0)}`
      : '';

    if (paginationOptions.limit) params.push(paginationOptions.limit);
    if (paginationOptions.offset) params.push(paginationOptions.offset);

    const query = `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      ${whereClause}
      ORDER BY gl.id DESC
      ${limitClause}
      ${offsetClause}
    `;

    return await this.raw(query, params);
  }

  /**
   * Récupère toutes les licences globales par tenant
   */
  protected async listAllByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.tenant]: tenant }, paginationOptions);
  }

  /**
   * Récupère toutes les licences globales par type de licence
   */
  protected async listAllByLicenseType(
    license_type: Type,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.license_type]: license_type }, paginationOptions);
  }

  /**
   * Récupère toutes les licences globales par cycle de facturation
   */
  protected async listAllByBillingCycle(
    billing_cycle_months: BillingCycle,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.billing_cycle_months]: billing_cycle_months },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les licences globales par statut
   */
  protected async listAllByStatus(
    license_status: LicenseStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.license_status]: license_status }, paginationOptions);
  }

  /**
   * Récupère toutes les licences globales expirant bientôt
   */
  protected async listAllExpiringSoon(
    days: number = 30,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const futureDate = TimezoneConfigUtils.getCurrentTime();
    futureDate.setDate(futureDate.getDate() + days);
    const now = TimezoneConfigUtils.getCurrentTime();

    const params: any[] = [futureDate, now];
    let paramIndex = 3;

    const limitClause = paginationOptions.limit ? `LIMIT $${paramIndex}` : '';
    const offsetClause = paginationOptions.offset
      ? `OFFSET $${paramIndex + (paginationOptions.limit ? 1 : 0)}`
      : '';

    if (paginationOptions.limit) params.push(paginationOptions.limit);
    if (paginationOptions.offset) params.push(paginationOptions.offset);

    const query = `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      WHERE gl.current_period_end <= $1
        AND gl.current_period_end >= $2
        AND gl.license_status = '${LicenseStatus.ACTIVE}'
      ORDER BY gl.current_period_end ASC
      ${limitClause}
      ${offsetClause}
    `;

    return await this.raw(query, params);
  }

  /**
   * Récupère toutes les licences globales expirées
   */
  protected async listAllExpired(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = TimezoneConfigUtils.getCurrentTime();
    const params: any[] = [now];
    let paramIndex = 2;

    const limitClause = paginationOptions.limit ? `LIMIT $${paramIndex}` : '';
    const offsetClause = paginationOptions.offset
      ? `OFFSET $${paramIndex + (paginationOptions.limit ? 1 : 0)}`
      : '';

    if (paginationOptions.limit) params.push(paginationOptions.limit);
    if (paginationOptions.offset) params.push(paginationOptions.offset);

    const query = `
      SELECT 
        gl.*,
        gl.total_seats_purchased,
        gl.billing_status
      FROM xa_global_license gl
      WHERE gl.current_period_end < $1
      ORDER BY gl.current_period_end DESC
      ${limitClause}
      ${offsetClause}
    `;

    return await this.raw(query, params);
  }

  /**
   * Crée une nouvelle licence globale
   * Les colonnes générées sont calculées automatiquement par PostgreSQL
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for global master entry');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.license_type]: this.license_type,
      [this.db.billing_cycle_months]: this.billing_cycle_months,
      [this.db.base_price_usd]: this.base_price_usd || 3.0,
      [this.db.minimum_seats]: this.minimum_seats || 5,
      [this.db.current_period_start]: this.current_period_start,
      [this.db.current_period_end]: this.current_period_end,
      [this.db.next_renewal_date]: this.next_renewal_date,
      // ❌ NE PAS inclure total_seats_purchased - c'est une colonne générée
      [this.db.license_status]: this.license_status || LicenseStatus.ACTIVE,
    });

    console.log(
      `🟢 Licence globale créée - Tenant: ${this.tenant} | Type: ${this.license_type} | GUID: ${guid}`,
    );

    if (!lastID) {
      throw new Error('Failed to create global master entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    // ✅ Charger les colonnes calculées après création
    await this.loadComputedColumns();

    console.log('✅ Licence globale créée avec ID:', this.id);
  }

  /**
   * Met à jour une licence globale existante
   * Les colonnes générées sont recalculées automatiquement par PostgreSQL
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Global License ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.tenant !== undefined) updateData[this.db.tenant] = this.tenant;
    if (this.license_type !== undefined) updateData[this.db.license_type] = this.license_type;
    if (this.billing_cycle_months !== undefined)
      updateData[this.db.billing_cycle_months] = this.billing_cycle_months;
    if (this.base_price_usd !== undefined) updateData[this.db.base_price_usd] = this.base_price_usd;
    if (this.minimum_seats !== undefined) updateData[this.db.minimum_seats] = this.minimum_seats;
    if (this.current_period_start !== undefined)
      updateData[this.db.current_period_start] = this.current_period_start;
    if (this.current_period_end !== undefined)
      updateData[this.db.current_period_end] = this.current_period_end;
    if (this.next_renewal_date !== undefined)
      updateData[this.db.next_renewal_date] = this.next_renewal_date;
    // ❌ NE PAS inclure total_seats_purchased - c'est une colonne générée
    if (this.license_status !== undefined) updateData[this.db.license_status] = this.license_status;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update global master entry');
    }

    // ✅ Recharger les colonnes calculées après mise à jour
    await this.loadComputedColumns();
  }

  /**
   * Supprime une licence globale
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Getter pour total_seats_purchased (colonne calculée)
   */
  protected getTotalSeatsPurchasedValue(): number {
    return this._total_seats_purchased || 0;
  }

  /**
   * Getter pour billing_status (colonne calculée)
   */
  protected getBillingStatusValue(): string | undefined {
    return this._billing_status;
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    if (!this.tenant) {
      throw new Error('Tenant is required');
    }

    if (!this.license_type) {
      throw new Error('License type is required');
    }

    if (!this.billing_cycle_months) {
      throw new Error('Billing cycle months is required');
    }

    if (!this.current_period_start) {
      throw new Error('Current period start is required');
    }

    if (!this.current_period_end) {
      throw new Error('Current period end is required');
    }

    if (!this.next_renewal_date) {
      throw new Error('Next renewal date is required');
    }

    // Validation des dates
    const startDate = new Date(this.current_period_start);
    const endDate = new Date(this.current_period_end);
    const renewalDate = new Date(this.next_renewal_date);

    if (endDate <= startDate) {
      throw new Error('Current period end must be after start date');
    }

    if (renewalDate < endDate) {
      throw new Error('Next renewal date must be on or after current period end');
    }

    // ❌ Ne plus valider total_seats_purchased car c'est une colonne générée
  }
}
