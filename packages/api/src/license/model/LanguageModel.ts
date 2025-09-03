import { LANGUAGE_ERRORS, LanguageValidationUtils } from '@toke/shared';

import { tableName } from '../../utils/response.model.js';
import BaseModel from '../database/db.base.js';

export default class LanguageModel extends BaseModel {
  public readonly db = {
    tableName: tableName.LANGUAGE,
    id: 'id',
    guid: 'guid',
    code: 'code',
    name_en: 'name_en',
    name_local: 'name_local',
    active: 'active',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected code?: string;
  protected name_en?: string;
  protected name_local?: string;
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
   * Trouve un enregistrement par son code ISO 639-1
   */
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code.toLowerCase() });
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
   * Récupère toutes les langues actives/inactives
   */
  protected async listAllByActiveStatus(
    active: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.active]: active }, paginationOptions);
  }

  /**
   * Crée une nouvelle langue
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for language entry');
    }

    // Vérifier l'unicité du code ISO
    const existingCode = await this.findByCode(this.code!);
    if (existingCode) {
      throw new Error(`Language code '${this.code}' already exists`);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.code]: this.code,
      [this.db.name_en]: this.name_en,
      [this.db.name_local]: this.name_local,
      [this.db.active]: this.active !== undefined ? this.active : true,
    });

    console.log(`🌍 Langue créée - Code: ${this.code} | Nom: ${this.name_en} | GUID: ${guid}`);

    if (!lastID) {
      throw new Error('Failed to create language entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Langue créée avec ID:', this.id);
  }

  /**
   * Met à jour une langue existante
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Language ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.code !== undefined) updateData[this.db.code] = this.code;
    if (this.name_en !== undefined) updateData[this.db.name_en] = this.name_en;
    if (this.name_local !== undefined) updateData[this.db.name_local] = this.name_local;
    if (this.active !== undefined) updateData[this.db.active] = this.active;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update language entry');
    }
  }

  /**
   * Supprime une langue
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Valider le code ISO 639-1
    if (!this.code) throw new Error(LANGUAGE_ERRORS.CODE_REQUIRED);

    if (!LanguageValidationUtils.validateCode(this.code)) throw new Error(LANGUAGE_ERRORS.CODE_INVALID);

    // Valider le nom anglais (obligatoire)
    if (!this.name_en) throw new Error(LANGUAGE_ERRORS.NAME_EN_REQUIRED);
    if (!LanguageValidationUtils.validateNameEn(this.name_en)) throw new Error(LANGUAGE_ERRORS.NAME_EN_INVALID);

    if (!this.name_local) throw new Error(LANGUAGE_ERRORS.NAME_LOCAL_REQUIRED);
    if (!LanguageValidationUtils.validateNameLocal(this.name_local)) throw new Error(LANGUAGE_ERRORS.NAME_LOCAL_INVALID);

    if (this.active !== undefined && !LanguageValidationUtils.validateActive(this.active)) throw new Error(LANGUAGE_ERRORS.INVALID_BOOLEAN);

   const cleaned = LanguageValidationUtils.cleanLanguageData(this);
    Object.assign(this, cleaned);
  }
}
