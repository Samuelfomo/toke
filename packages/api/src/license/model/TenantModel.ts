import { Status, TENANT_ERRORS, TenantValidationUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class TenantModel extends BaseModel {
  public readonly db = {
    tableName: tableName.TENANT,
    id: 'id',
    guid: 'guid',
    name: 'name',
    short_name: 'short_name',
    key: 'key',
    country_code: 'country_code',
    primary_currency_code: 'primary_currency_code',
    preferred_language_code: 'preferred_language_code',
    timezone: 'timezone',
    tax_number: 'tax_number',
    tax_exempt: 'tax_exempt',
    billing_email: 'billing_email',
    billing_address: 'billing_address',
    billing_phone: 'billing_phone',
    status: 'status',
    subdomain: 'subdomain',
    database_name: 'database_name',
    database_username: 'database_username',
    database_password: 'database_password',
    registration_number: 'registration_number',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected name?: string;
  protected short_name?: string;
  protected key?: string;
  protected country_code?: string;
  protected primary_currency_code?: string;
  protected preferred_language_code?: string;
  protected timezone?: string;
  protected tax_number?: string;
  protected tax_exempt?: boolean;
  protected billing_email?: string;
  protected billing_address?: object;
  protected billing_phone?: string;
  protected status?: Status;
  protected subdomain?: string;
  protected database_name?: string;
  protected database_username?: string;
  protected database_password?: string;
  protected registration_number?: string;

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
   * Trouve un enregistrement par sa clé
   */
  protected async findByKey(key: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.key]: key });
  }

  /**
   * Trouve un enregistrement par son GUID
   */
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  /**
   * Trouve un enregistrement par son sous-domaine
   */
  protected async findBySubdomain(subdomain: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.subdomain]: subdomain.toLowerCase() });
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
   * Récupère tous les tenants par code pays
   */
  protected async listAllByCountryCode(
    country_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.country_code]: country_code.toUpperCase() },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les tenants par code devise
   */
  protected async listAllByCurrencyCode(
    currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.primary_currency_code]: currency_code.toUpperCase() },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les tenants par code de langue
   */
  protected async listAllByLanguageCode(
    language_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.preferred_language_code]: language_code.toLowerCase() },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les tenants par fuseau horaire
   */
  protected async listAllByTimezone(
    timezone: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.timezone]: timezone }, paginationOptions);
  }

  /**
   * Récupère tous les tenants exemptés/non exemptés de taxe
   */
  protected async listAllByTaxExempt(
    tax_exempt: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.tax_exempt]: tax_exempt }, paginationOptions);
  }

  /**
   * Récupère tous les tenants par statut
   */
  protected async listAllByStatus(
    status: Status,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.status]: status }, paginationOptions);
  }

  /**
   * Crée un nouveau tenant
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for tenant entry 4');
    }

    // const key = await this.guidGenerator(this.db.tableName, 6);
    const key = await this.timeBasedTokenGenerator(this.db.tableName);
    if (!key){
      throw new Error('Failed to generate KEY for tenant entry');
    }
    this.key = key;

    // // Vérifier l'unicité de la clé
    // const existingKey = await this.findByKey(this.key!);
    // if (existingKey) {
    //   throw new Error(`Tenant key '${this.key}' already exists`);
    // }

    // // Vérifier l'unicité du sous-domaine
    // const existingSubdomain = await this.findBySubdomain(this.subdomain!);
    // if (existingSubdomain) {
    //   throw new Error(`Tenant subdomain '${this.subdomain}' already exists`);
    // }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.short_name]: this.short_name,
      [this.db.key]: this.key,
      [this.db.country_code]: this.country_code,
      [this.db.primary_currency_code]: this.primary_currency_code,
      [this.db.preferred_language_code]: this.preferred_language_code || 'en',
      [this.db.timezone]: this.timezone || 'UTC',
      [this.db.tax_number]: this.tax_number,
      [this.db.tax_exempt]: this.tax_exempt !== undefined ? this.tax_exempt : false,
      [this.db.billing_email]: this.billing_email,
      [this.db.billing_address]: this.billing_address,
      [this.db.billing_phone]: this.billing_phone,
      [this.db.status]: this.status || Status.ACTIVE,
      [this.db.registration_number]: this.registration_number,
    });

    console.log(`🏢 Tenant créé - Nom: ${this.name} | Clé: ${this.key} | GUID: ${guid}`);

    if (!lastID) {
      throw new Error('Failed to create tenant entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Tenant créé avec ID:', this.id);
  }

  /**
   * Met à jour un tenant existant
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Tenant ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.short_name !== undefined) updateData[this.db.short_name] = this.short_name;
    // if (this.key !== undefined) updateData[this.db.key] = this.key;
    if (this.country_code !== undefined) updateData[this.db.country_code] = this.country_code;
    if (this.primary_currency_code !== undefined)
      updateData[this.db.primary_currency_code] = this.primary_currency_code;
    if (this.preferred_language_code !== undefined)
      updateData[this.db.preferred_language_code] = this.preferred_language_code;
    if (this.timezone !== undefined) updateData[this.db.timezone] = this.timezone;
    if (this.tax_number !== undefined) updateData[this.db.tax_number] = this.tax_number;
    if (this.tax_exempt !== undefined) updateData[this.db.tax_exempt] = this.tax_exempt;
    if (this.billing_email !== undefined) updateData[this.db.billing_email] = this.billing_email;
    if (this.billing_address !== undefined)
      updateData[this.db.billing_address] = this.billing_address;
    if (this.billing_phone !== undefined) updateData[this.db.billing_phone] = this.billing_phone;
    if (this.registration_number !== undefined) updateData[this.db.registration_number] = this.registration_number;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update tenant entry');
    }
  }

  /**
   * Supprime un tenant
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Valider le nom (obligatoire)
    if (!this.name) throw new Error(TENANT_ERRORS.NAME_REQUIRED);
    if (!TenantValidationUtils.validateName(this.name)) {
      throw new Error(TENANT_ERRORS.NAME_INVALID);
    }

    if (this.short_name && !TenantValidationUtils.validateShortName(this.short_name)) {
      throw new Error(TENANT_ERRORS.SHORT_NAME_INVALID);
    }

    // Valider le code pays (obligatoire)
    if (!this.country_code){
      throw new Error(TENANT_ERRORS.COUNTRY_CODE_REQUIRED);
    }
    if (!TenantValidationUtils.validateCountryCode(this.country_code)) {
      throw new Error(TENANT_ERRORS.COUNTRY_CODE_INVALID);
    }

    // Valider le code devise primaire (obligatoire)
    if (!this.primary_currency_code) {
      throw new Error(TENANT_ERRORS.PRIMARY_CURRENCY_CODE_REQUIRED);
    }
    if (!TenantValidationUtils.validatePrimaryCurrencyCode(this.primary_currency_code)) {
      throw new Error(TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID);
    }

    // Valider le code de langue préféré (optionnel avec valeur par défaut)
    if (this.preferred_language_code && !TenantValidationUtils.validatePreferredLanguageCode(this.preferred_language_code)) {
      throw new Error(TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID);
    }

    // Valider le fuseau horaire (optionnel avec valeur par défaut)
    if (this.timezone && !TenantValidationUtils.validateTimezone(this.timezone)) {
      throw new Error(TENANT_ERRORS.TIMEZONE_INVALID);
    }

    // Valider le numéro de taxe (optionnel)
    if (this.tax_number && !TenantValidationUtils.validateTaxNumber(this.tax_number)) {
      throw new Error(TENANT_ERRORS.TAX_NUMBER_INVALID);
    }

    // Valider l'exemption de taxe (optionnel avec valeur par défaut)
    if (this.tax_exempt !== undefined && !TenantValidationUtils.validateBoolean(this.tax_exempt)) {
      throw new Error(TENANT_ERRORS.INVALID_BOOLEAN);
    }

    // Valider l'email de facturation (obligatoire)
    if (!this.billing_email){
      throw new Error(TENANT_ERRORS.BILLING_EMAIL_REQUIRED);
    }
    if (!TenantValidationUtils.validateBillingEmail(this.billing_email)) {
      throw new Error(TENANT_ERRORS.BILLING_EMAIL_INVALID);
    }

    // Valider l'adresse de facturation (optionnel)
    if (!this.billing_address){
      throw new Error(TENANT_ERRORS.BILLING_ADDRESS_REQUIRED);
    }
    if (!TenantValidationUtils.validateBillingAddress(this.billing_address)) {
      throw new Error(TENANT_ERRORS.BILLING_ADDRESS_INVALID);
    }

    // Valider le téléphone de facturation (optionnel)
    if (this.billing_phone && !TenantValidationUtils.validateBillingPhone(this.billing_phone)) {
      throw new Error(TENANT_ERRORS.BILLING_ADDRESS_INVALID);
    }

    // Valider le statut (optionnel avec valeur par défaut)
    if (this.status && !TenantValidationUtils.validateStatus(this.status)) {
      throw new Error(TENANT_ERRORS.STATUS_INVALID);
    }

    if (!this.registration_number){
      throw new Error(TENANT_ERRORS.REGISTRATION_NUMBER_REQUIRED);
    }
    if (!TenantValidationUtils.validateRegistrationNumber(this.registration_number)) {
      throw new Error(TENANT_ERRORS.REGISTRATION_NUMBER_INVALID);
    }
    // // Nettoyer les données
    const cleaned = TenantValidationUtils.cleanTenantData(this);
    Object.assign(this, cleaned);
  }
}
