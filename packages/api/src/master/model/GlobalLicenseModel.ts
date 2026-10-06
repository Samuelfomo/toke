import {
  BillingCycle,
  GLOBAL_LICENSE_DEFAULTS,
  LicenseStatus,
  TimezoneConfigUtils,
  Type,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { TableInitializer } from '../database/db.initializer.js';

export default class GlobalLicenseModel extends BaseModel {
  // ✅ Liste des colonnes générées à exclure de Sequelize
  private static readonly GENERATED_COLUMNS = ['total_seats_purchased', 'billing_status'];
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

  // Colonnes calculées (lecture seule, chargées séparément)
  private _total_seats_purchased?: number;
  private _billing_status?: string;

  protected constructor() {
    super();
  }

  /**
   * ✅ Charge les colonnes générées APRÈS le load
   * Utilise Sequelize avec attributes pour sélectionner uniquement les colonnes générées
   */
  protected async loadGeneratedColumns(): Promise<void> {
    if (!this.guid) return;

    try {
      const model = TableInitializer.getModel(this.db.tableName);

      // ✅ Utiliser Sequelize attributes pour sélectionner UNIQUEMENT les colonnes générées
      const result = await model.findOne({
        where: { [this.db.guid]: this.guid },
        attributes: ['total_seats_purchased', 'billing_status'], // Sélectionner uniquement ces colonnes
      });

      if (result) {
        const data = result.get() as any;
        this._total_seats_purchased = data.total_seats_purchased;
        this._billing_status = data.billing_status;
      }
    } catch (error) {
      console.error('⚠️ Erreur chargement colonnes générées:', error);
      // Ne pas throw pour ne pas bloquer le reste
    }
  }

  /**
   * ✅ Trouve un enregistrement par son ID (exclut colonnes générées)
   */
  protected async find(id: number): Promise<any> {
    return await this.findOne(
      this.db.tableName,
      { [this.db.id]: id },
      { exclude: GlobalLicenseModel.GENERATED_COLUMNS },
    );
  }

  /**
   * ✅ Trouve un enregistrement par son GUID (exclut colonnes générées)
   */
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(
      this.db.tableName,
      { [this.db.guid]: guid },
      { exclude: GlobalLicenseModel.GENERATED_COLUMNS },
    );
  }

  /**
   * ✅ Trouve un enregistrement par son tenant (exclut colonnes générées)
   */
  protected async findByTenant(tenant: number): Promise<any> {
    return await this.findOne(
      this.db.tableName,
      { [this.db.tenant]: tenant },
      { exclude: GlobalLicenseModel.GENERATED_COLUMNS },
    );
  }

  /**
   * ✅ Liste tous les enregistrements selon les conditions (exclut colonnes générées)
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, {
      ...paginationOptions,
      exclude: GlobalLicenseModel.GENERATED_COLUMNS,
    });
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
   * ✅ Récupère toutes les licences globales expirant bientôt (avec Op de Sequelize)
   */
  protected async listAllExpiringSoon(
    days: number = 30,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const futureDate = TimezoneConfigUtils.getCurrentTime();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.current_period_end]: {
          [Op.lte]: futureDate,
          [Op.gte]: TimezoneConfigUtils.getCurrentTime(),
        },
        [this.db.license_status]: LicenseStatus.ACTIVE,
      },
      {
        ...paginationOptions,
        exclude: GlobalLicenseModel.GENERATED_COLUMNS,
      },
    );
  }

  /**
   * ✅ Récupère toutes les licences globales expirées (avec Op de Sequelize)
   */
  protected async listAllExpired(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.current_period_end]: {
          [Op.lt]: TimezoneConfigUtils.getCurrentTime(),
        },
      },
      {
        ...paginationOptions,
        exclude: GlobalLicenseModel.GENERATED_COLUMNS,
      },
    );
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
      [this.db.license_type]: this.license_type || GLOBAL_LICENSE_DEFAULTS.LICENSE_TYPE,
      [this.db.billing_cycle_months]: this.billing_cycle_months,
      [this.db.base_price_usd]: this.base_price_usd || GLOBAL_LICENSE_DEFAULTS.BASE_PRICE_USD,
      [this.db.minimum_seats]: this.minimum_seats || GLOBAL_LICENSE_DEFAULTS.MINIMUM_SEATS,
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
    await this.loadGeneratedColumns();

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
    await this.loadGeneratedColumns();
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

// import { BillingCycle, LicenseStatus, Type } from '@toke/shared';
// import { Op } from 'sequelize';
//
// import BaseModel from '../database/db.base.js';
// import { tableName } from '../../utils/response.model.js';
//
// export default class GlobalLicenseModel extends BaseModel {
//   public readonly db = {
//     tableName: tableName.GLOBAL_LICENSE,
//     id: 'id',
//     guid: 'guid',
//     tenant: 'tenant',
//     license_type: 'license_type',
//     billing_cycle_months: 'billing_cycle_months',
//     base_price_usd: 'base_price_usd',
//     minimum_seats: 'minimum_seats',
//     current_period_start: 'current_period_start',
//     current_period_end: 'current_period_end',
//     next_renewal_date: 'next_renewal_date',
//     total_seats_purchased: 'total_seats_purchased',
//     license_status: 'license_status',
//   } as const;
//
//   protected id?: number;
//   protected guid?: number;
//   protected tenant?: number;
//   protected license_type?: Type;
//   protected billing_cycle_months?: BillingCycle;
//   protected base_price_usd?: number;
//   protected minimum_seats?: number;
//   protected current_period_start?: Date;
//   protected current_period_end?: Date;
//   protected next_renewal_date?: Date;
//   protected total_seats_purchased?: number;
//   protected license_status?: LicenseStatus;
//
//   protected constructor() {
//     super();
//   }
//
//   /**
//    * Trouve un enregistrement par son ID
//    */
//   protected async find(id: number): Promise<any> {
//     return await this.findOne(this.db.tableName, { [this.db.id]: id });
//   }
//
//   /**
//    * Trouve un enregistrement par son GUID
//    */
//   protected async findByGuid(guid: number): Promise<any> {
//     return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
//   }
//
//   protected async findByTenant(tenant: number): Promise<any> {
//     return await this.findOne(this.db.tableName, { [this.db.tenant]: tenant });
//   }
//
//   /**
//    * Liste tous les enregistrements selon les conditions
//    */
//   protected async listAll(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.findAll(this.db.tableName, conditions, paginationOptions);
//   }
//
//   /**
//    * Récupère toutes les licences globales par tenant
//    */
//   protected async listAllByTenant(
//     tenant: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.listAll({ [this.db.tenant]: tenant }, paginationOptions);
//   }
//
//   /**
//    * Récupère toutes les licences globales par type de licence
//    */
//   protected async listAllByLicenseType(
//     license_type: Type,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.listAll({ [this.db.license_type]: license_type }, paginationOptions);
//   }
//
//   /**
//    * Récupère toutes les licences globales par cycle de facturation
//    */
//   protected async listAllByBillingCycle(
//     billing_cycle_months: BillingCycle,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.listAll(
//       { [this.db.billing_cycle_months]: billing_cycle_months },
//       paginationOptions,
//     );
//   }
//
//   /**
//    * Récupère toutes les licences globales par statut
//    */
//   protected async listAllByStatus(
//     license_status: LicenseStatus,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.listAll({ [this.db.license_status]: license_status }, paginationOptions);
//   }
//
//   /**
//    * Récupère toutes les licences globales expirant bientôt
//    */
//   protected async listAllExpiringSoon(
//     days: number = 30,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     const futureDate = TimezoneConfigUtils.getCurrentTime();
//     futureDate.setDate(futureDate.getDate() + days);
//
//     return await this.findAll(
//       this.db.tableName,
//       {
//         [this.db.current_period_end]: {
//           [Op.lte]: futureDate,
//           [Op.gte]: TimezoneConfigUtils.getCurrentTime(),
//         },
//         [this.db.license_status]: LicenseStatus.ACTIVE,
//       },
//       paginationOptions,
//     );
//   }
//
//   /**
//    * Récupère toutes les licences globales expirées
//    */
//   protected async listAllExpired(
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<any[]> {
//     return await this.findAll(
//       this.db.tableName,
//       {
//         [this.db.current_period_end]: {
//           [Op.lt]: TimezoneConfigUtils.getCurrentTime(),
//         },
//       },
//       paginationOptions,
//     );
//   }
//
//   /**
//    * Crée une nouvelle licence globale
//    */
//   protected async create(): Promise<void> {
//     await this.validate();
//
//     // Générer le GUID automatiquement
//     const guid = await this.guidGenerator(this.db.tableName, 6);
//     if (!guid) {
//       throw new Error('Failed to generate GUID for global master entry');
//     }
//
//     const lastID = await this.insertOne(this.db.tableName, {
//       [this.db.guid]: guid,
//       [this.db.tenant]: this.tenant,
//       [this.db.license_type]: this.license_type,
//       [this.db.billing_cycle_months]: this.billing_cycle_months,
//       [this.db.base_price_usd]: this.base_price_usd || 3.0,
//       [this.db.minimum_seats]: this.minimum_seats || 5,
//       [this.db.current_period_start]: this.current_period_start,
//       [this.db.current_period_end]: this.current_period_end,
//       [this.db.next_renewal_date]: this.next_renewal_date,
//       // [this.db.total_seats_purchased]: this.total_seats_purchased || 0, PostgreSQL gère cette colonne
//       [this.db.license_status]: this.license_status || LicenseStatus.ACTIVE,
//     });
//
//     console.log(
//       `🟢 Licence globale créée - Tenant: ${this.tenant} | Type: ${this.license_type} | GUID: ${guid}`,
//     );
//
//     if (!lastID) {
//       throw new Error('Failed to create global master entry');
//     }
//
//     this.id = typeof lastID === 'object' ? lastID.id : lastID;
//     this.guid = guid;
//
//     console.log('✅ Licence globale créée avec ID:', this.id);
//   }
//
//   /**
//    * Met à jour une licence globale existante
//    */
//   protected async update(): Promise<void> {
//     await this.validate();
//
//     if (!this.id) {
//       throw new Error('Global License ID is required for update');
//     }
//
//     const updateData: Record<string, any> = {};
//     if (this.tenant !== undefined) updateData[this.db.tenant] = this.tenant;
//     if (this.license_type !== undefined) updateData[this.db.license_type] = this.license_type;
//     if (this.billing_cycle_months !== undefined)
//       updateData[this.db.billing_cycle_months] = this.billing_cycle_months;
//     if (this.base_price_usd !== undefined) updateData[this.db.base_price_usd] = this.base_price_usd;
//     if (this.minimum_seats !== undefined) updateData[this.db.minimum_seats] = this.minimum_seats;
//     if (this.current_period_start !== undefined)
//       updateData[this.db.current_period_start] = this.current_period_start;
//     if (this.current_period_end !== undefined)
//       updateData[this.db.current_period_end] = this.current_period_end;
//     if (this.next_renewal_date !== undefined)
//       updateData[this.db.next_renewal_date] = this.next_renewal_date;
//     if (this.total_seats_purchased !== undefined)
//       updateData[this.db.total_seats_purchased] = this.total_seats_purchased;
//     if (this.license_status !== undefined) updateData[this.db.license_status] = this.license_status;
//
//     const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
//     if (!affected) {
//       throw new Error('Failed to update global master entry');
//     }
//   }
//
//   /**
//    * Supprime une licence globale
//    */
//   protected async trash(id: number): Promise<boolean> {
//     return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
//   }
//
//   /**
//    * Valide les données avant création/mise à jour
//    */
//   private async validate(): Promise<void> {
//     // Nettoyer les données en utilisant la structure de validation
//     // GlobalLicenseDbStructure.validation.cleanData(this);
//
//     // // Vérifier si les données sont valides pour la création
//     // if (!GlobalLicenseDbStructure.validation.isValidForCreation(this)) {
//     //   const errors = GlobalLicenseDbStructure.validation.getValidationErrors(this);
//     //   throw new Error(`Validation failed: ${errors.join(', ')}`);
//     // }
//
//     // Validations personnalisées supplémentaires
//     if (!this.tenant) {
//       throw new Error('Tenant is required');
//     }
//
//     if (!this.license_type) {
//       throw new Error('License type is required');
//     }
//
//     if (!this.billing_cycle_months) {
//       throw new Error('Billing cycle months is required');
//     }
//
//     if (!this.current_period_start) {
//       throw new Error('Current period start is required');
//     }
//
//     if (!this.current_period_end) {
//       throw new Error('Current period end is required');
//     }
//
//     if (!this.next_renewal_date) {
//       throw new Error('Next renewal date is required');
//     }
//
//     // Validation des dates
//     const startDate = new Date(this.current_period_start);
//     const endDate = new Date(this.current_period_end);
//     const renewalDate = new Date(this.next_renewal_date);
//
//     if (endDate <= startDate) {
//       throw new Error('Current period end must be after start date');
//     }
//
//     if (renewalDate < endDate) {
//       throw new Error('Next renewal date must be on or after current period end');
//     }
//
//     // Validation des sièges minimums vs achetés
//     if (
//       this.total_seats_purchased &&
//       this.minimum_seats &&
//       this.total_seats_purchased > 0 &&
//       this.total_seats_purchased < this.minimum_seats
//     ) {
//       throw new Error(
//         `Total seats purchased (${this.total_seats_purchased}) must meet minimum requirement (${this.minimum_seats})`,
//       );
//     }
//   }
// }
