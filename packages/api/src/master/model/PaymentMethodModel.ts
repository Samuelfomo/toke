import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { PaymentMethodDbStructure } from '../database/data/payment.method.db.js';

export default class PaymentMethodModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PAYMENT_METHOD,
    id: 'id',
    guid: 'guid',
    code: 'code',
    name: 'name',
    method_type: 'method_type',
    supported_currencies: 'supported_currencies',
    active: 'active',
    processing_fee_rate: 'processing_fee_rate',
    min_amount_usd: 'min_amount_usd',
    max_amount_usd: 'max_amount_usd',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected code?: string;
  protected name?: string;
  protected method_type?: string;
  protected supported_currencies?: Array<string> | string;
  protected active?: boolean;
  protected processing_fee_rate?: number;
  protected min_amount_usd?: number;
  protected max_amount_usd?: number;

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
   * Trouve un enregistrement par son code
   */
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code });
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
   * Liste tous les moyens de paiement par statut actif
   */
  protected async listAllByActiveStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: active }, paginationOptions);
  }

  /**
   * Liste tous les moyens de paiement par type
   */
  protected async listAllByMethodType(
    methodType: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.method_type]: methodType }, paginationOptions);
  }

  /**
   * Liste tous les moyens de paiement dans une plage de montants
   */
  protected async listAllInAmountRange(
    minAmount?: number,
    maxAmount?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions: Record<string, any> = {};

    if (minAmount !== undefined) {
      conditions[this.db.max_amount_usd] = { [Op.gte]: minAmount };
    }

    if (maxAmount !== undefined) {
      conditions[this.db.min_amount_usd] = { [Op.lte]: maxAmount };
    }

    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  /**
   * Crée un nouveau moyen de paiement
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for payment method entry');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.code]: this.code,
      [this.db.name]: this.name,
      [this.db.method_type]: this.method_type,
      [this.db.supported_currencies]: this.supported_currencies,
      [this.db.active]: this.active !== undefined ? this.active : true,
      [this.db.processing_fee_rate]: this.processing_fee_rate || 0,
      [this.db.min_amount_usd]: this.min_amount_usd || 1.0,
      [this.db.max_amount_usd]: this.max_amount_usd,
    });

    console.log(
      `🟢 Moyen de paiement créé - Code: ${this.code} | Nom: ${this.name} | GUID: ${guid}`,
    );

    if (!lastID) {
      throw new Error('Failed to create payment method entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Moyen de paiement créé avec ID:', this.id);
  }

  /**
   * Met à jour un moyen de paiement existant
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Payment Method ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.code !== undefined) updateData[this.db.code] = this.code;
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.method_type !== undefined) updateData[this.db.method_type] = this.method_type;
    if (this.supported_currencies !== undefined)
      updateData[this.db.supported_currencies] = this.supported_currencies;
    if (this.active !== undefined) updateData[this.db.active] = this.active;
    if (this.processing_fee_rate !== undefined)
      updateData[this.db.processing_fee_rate] = this.processing_fee_rate;
    if (this.min_amount_usd !== undefined) updateData[this.db.min_amount_usd] = this.min_amount_usd;
    if (this.max_amount_usd !== undefined) updateData[this.db.max_amount_usd] = this.max_amount_usd;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update payment method entry');
    }
  }

  /**
   * Supprime un moyen de paiement
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Active un moyen de paiement
   */
  protected async activate(): Promise<void> {
    if (!this.id) {
      throw new Error('Payment Method ID is required');
    }

    this.active = true;
    await this.update();
  }

  /**
   * Désactive un moyen de paiement
   */
  protected async deactivate(): Promise<void> {
    if (!this.id) {
      throw new Error('Payment Method ID is required');
    }

    this.active = false;
    await this.update();
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Nettoyer les données en utilisant la structure de validation
    PaymentMethodDbStructure.validation.cleanData(this);

    // Validations personnalisées supplémentaires
    if (!this.code) {
      throw new Error('Payment method code is required');
    }

    if (!this.name) {
      throw new Error('Payment method name is required');
    }

    if (!this.method_type) {
      throw new Error('Payment method type is required');
    }

    // Validation des montants
    if (this.min_amount_usd !== undefined && this.min_amount_usd < 0) {
      throw new Error('Minimum amount USD must be positive');
    }

    if (this.max_amount_usd !== undefined && this.max_amount_usd < 0) {
      throw new Error('Maximum amount USD must be positive');
    }

    if (
      this.min_amount_usd !== undefined &&
      this.max_amount_usd !== undefined &&
      this.min_amount_usd > this.max_amount_usd
    ) {
      throw new Error('Minimum amount USD cannot be greater than maximum amount USD');
    }

    // Validation du taux de frais
    if (
      this.processing_fee_rate !== undefined &&
      (this.processing_fee_rate < 0 || this.processing_fee_rate > 99.9999)
    ) {
      throw new Error('Processing fee rate must be between 0 and 99.9999');
    }

    // Validation des devises supportées
    if (this.supported_currencies && Array.isArray(this.supported_currencies)) {
      for (const currency of this.supported_currencies) {
        if (!/^[A-Z]{3}$/.test(currency)) {
          throw new Error(`Invalid currency code: ${currency}. Must be 3 uppercase letters.`);
        }
      }
    }

    // Validation avec les règles de la structure DB
    if (!PaymentMethodDbStructure.validation.validateCode(this.code!)) {
      throw new Error('Invalid payment method code format');
    }

    if (!PaymentMethodDbStructure.validation.validateName(this.name!)) {
      throw new Error('Invalid payment method name format');
    }

    if (!PaymentMethodDbStructure.validation.validateMethodType(this.method_type!)) {
      throw new Error('Invalid payment method type format');
    }

    if (
      !PaymentMethodDbStructure.validation.validateSupportedCurrencies(
        Array.isArray(this.supported_currencies) ? this.supported_currencies : null,
      )
    ) {
      throw new Error('Invalid supported currencies format');
    }

    if (
      this.processing_fee_rate !== undefined &&
      !PaymentMethodDbStructure.validation.validateProcessingFeeRate(this.processing_fee_rate)
    ) {
      throw new Error('Invalid processing fee rate');
    }

    if (
      this.min_amount_usd !== undefined &&
      !PaymentMethodDbStructure.validation.validateMinAmountUsd(this.min_amount_usd)
    ) {
      throw new Error('Invalid minimum amount USD');
    }

    if (
      this.max_amount_usd !== undefined &&
      !PaymentMethodDbStructure.validation.validateMaxAmountUsd(this.max_amount_usd)
    ) {
      throw new Error('Invalid maximum amount USD');
    }
  }
}
