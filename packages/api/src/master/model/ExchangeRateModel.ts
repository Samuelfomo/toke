import { EXCHANGE_RATE_ERRORS, ExchangeRateValidationUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class ExchangeRateModel extends BaseModel {
  public readonly db = {
    tableName: tableName.EXCHANGE_RATE,
    id: 'id',
    guid: 'guid',
    from_currency_code: 'from_currency_code',
    to_currency_code: 'to_currency_code',
    exchange_rate: 'exchange_rate',
    current: 'current',
    created_by: 'created_by',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected from_currency_code?: string;
  protected to_currency_code?: string;
  protected exchange_rate?: number;
  protected current?: boolean;
  protected created_by?: number;

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

  protected async listAllByCurrentStatus(
    current: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.current]: current }, paginationOptions);
  }

  protected async getCurrentExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // Si même devise, retourner 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const result = await this.findOne(this.db.tableName, {
      [this.db.from_currency_code]: fromCurrency,
      [this.db.to_currency_code]: toCurrency,
      [this.db.current]: true
    });

    if (!result) {
      throw new Error(`No current exchange rate found for ${fromCurrency} to ${toCurrency}`);
    }

    return result[this.db.exchange_rate];
  }

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for exchange rate entry');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.from_currency_code]: this.from_currency_code,
      [this.db.to_currency_code]: this.to_currency_code,
      [this.db.exchange_rate]: this.exchange_rate,
      [this.db.current]: this.current,
      [this.db.created_by]: this.created_by,
    });
    if (!lastID) {
      throw new Error('Failed to create exchange rate entry');
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Exchange rate créé avec ID:', this.id);
  }
  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error('Exchange rate ID is required for update');
    }
    const updateData: Record<string, any> = {};
    if (this.from_currency_code !== undefined)
      updateData[this.db.from_currency_code] = this.from_currency_code;
    if (this.to_currency_code !== undefined)
      updateData[this.db.to_currency_code] = this.to_currency_code;
    if (this.exchange_rate !== undefined) updateData[this.db.exchange_rate] = this.exchange_rate;
    if (this.current !== undefined) updateData[this.db.current] = this.current;
    if (this.created_by !== undefined) updateData[this.db.created_by] = this.created_by;
    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update exchange rate entry');
    }
  }
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }
  private async validate(): Promise<void> {
    if(!this.from_currency_code){
      throw new Error(EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_REQUIRED);
    }
    if (!ExchangeRateValidationUtils.validateFromCurrencyCode(this.from_currency_code)) {
      throw new Error(EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID);
    }
    if(!this.to_currency_code){
      throw new Error(EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_REQUIRED);
    }
    if (!ExchangeRateValidationUtils.validateToCurrencyCode(this.to_currency_code)) {
      throw new Error(EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID);
    }
    if(!this.exchange_rate){
      throw new Error(EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_REQUIRED);
    }
    if (!ExchangeRateValidationUtils.validateExchangeRate(this.exchange_rate)) {
      throw new Error(EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_INVALID);
    }
    if (this.current !== undefined && !ExchangeRateValidationUtils.validateCurrent(this.current)){
      throw new Error(EXCHANGE_RATE_ERRORS.INVALID_BOOLEAN);
    }
    if(!this.created_by){
      throw new Error(EXCHANGE_RATE_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!ExchangeRateValidationUtils.validateCreatedBy(this.created_by)) {
      throw new Error(EXCHANGE_RATE_ERRORS.CREATED_BY_INVALID);
    }
    const cleaned = ExchangeRateValidationUtils.cleanExchangeRateData(this);
    Object.assign(this, cleaned);
  }
}
