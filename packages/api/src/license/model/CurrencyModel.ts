import { CURRENCY_ERRORS, CurrencyValidationUtils, ERROR_MESSAGES } from '@toke/shared';

import BaseModel from '../database/db.base';
import G from '../../tools/glossary';

export default class CurrencyModel extends BaseModel {
  public readonly db = {
    tableName: `${G.tableConf}_currency`,
    id: 'id',
    guid: 'guid',
    code: 'code',
    name: 'name',
    symbol: 'symbol',
    decimal_places: 'decimal_places',
    active: 'active',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected code?: string;
  protected name?: string;
  protected symbol?: string;
  protected decimal_places?: number;
  protected active?: boolean;

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
   * Trouve un enregistrement par son code ISO (maintenant dans le champ 'code')
   */
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code.toUpperCase() });
  }

  /**
   * Trouve un enregistrement par son GUID
   */
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
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

  /**
   * Récupère tous les currency actifs/inactifs
   */
  protected async listAllByActiveStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: active }, paginationOptions);
  }

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error(`${ERROR_MESSAGES.GUID_GENERATOR_FAILED} ``${CURRENCY_ERRORS.CURRENCY}`);
    }

    const existingCode = await this.findByCode(this.code!);
    if (existingCode) {
      throw new Error(`Currency code '${this.code}' already exists`);
    }
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.code]: this.code,
      [this.db.name]: this.name,
      [this.db.symbol]: this.symbol,
      [this.db.decimal_places]: this.decimal_places,
    });
    if (!lastID) {
      throw new Error('Failed to create currency entry');
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Currency créé avec ID:', this.id);
  }
  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(`${CURRENCY_ERRORS.CURRENCY} ``${ERROR_MESSAGES.ID_REQUIRED}`);
    }
    const updateData: Record<string, any> = {};
    if (this.code !== undefined) updateData[this.db.code] = this.code;
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.symbol !== undefined) updateData[this.db.symbol] = this.symbol;
    if (this.decimal_places !== undefined) updateData[this.db.decimal_places] = this.decimal_places;
    if (this.active !== undefined) updateData[this.db.active] = this.active;
    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error(CURRENCY_ERRORS.UPDATE_FAILED);
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }
  private async validate(): Promise<void> {
    // ✅ Utilisation des utilitaires shared au lieu de validation locale
    if (!this.code) {
      throw new Error(CURRENCY_ERRORS.CODE_REQUIRED);
    }
    if (!CurrencyValidationUtils.validateCurrencyCode(this.code)) {
      throw new Error(CURRENCY_ERRORS.CODE_INVALID);
    }
    if (!this.name || !this.name.trim()) {
      throw new Error(CURRENCY_ERRORS.NAME_REQUIRED);
    }
    if (!CurrencyValidationUtils.validateCurrencyName(this.name)) {
      throw new Error(CURRENCY_ERRORS.NAME_INVALID);
    }

    if (!this.symbol || !this.symbol.trim()) {
      throw new Error(CURRENCY_ERRORS.SYMBOL_REQUIRED);
    }

    if (!CurrencyValidationUtils.validateCurrencySymbol(this.symbol)) {
      throw new Error(CURRENCY_ERRORS.SYMBOL_INVALID);
    }

    if (!this.decimal_places){
      throw new Error(CURRENCY_ERRORS.DECIMAL_PLACES_REQUIRED);
    }
    if (!CurrencyValidationUtils.validateDecimalPlaces(this.decimal_places)) {
      throw new Error(CURRENCY_ERRORS.DECIMAL_PLACES_INVALID);
    }

    if (this.active !== undefined && !CurrencyValidationUtils.isBoolean(this.active)) {
      throw new Error(CURRENCY_ERRORS.INVALID_BOOLEAN);
    }

  const cleaned = CurrencyValidationUtils.cleanCurrencyData(this);
    Object.assign(this, cleaned);
  }
}
