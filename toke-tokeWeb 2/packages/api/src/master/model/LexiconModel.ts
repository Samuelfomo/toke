import { LEXICON_ERRORS, LexiconValidationUtils } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class LexiconModel extends BaseModel {
  public readonly db = {
    tableName: tableName.LEXICON,
    id: 'id',
    guid: 'guid',
    portable: 'portable',
    reference: 'reference',
    translation: 'translation',
    updated_at: 'updatedAt',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected portable?: boolean;
  protected reference?: string;
  protected translation?: Record<string, string>;
  protected updatedAt?: Date;
  protected createdAt?: Date;

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
   * Trouve un enregistrement par sa référence
   */
  protected async findByReference(reference: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.reference]: reference });
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
  protected async listAll(conditions: Record<string, any> = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions);
  }

  /**
   * Récupère toutes les entrées portables (exportables pour mobile)
   */
  protected async listPortable(): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.portable]: true });
  }

  /**
   * Crée une nouvelle entrée lexique
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for lexicon entry');
    }

    // Vérifier l'unicité de la référence
    const existingReference = await this.findByReference(this.reference!);
    if (existingReference) {
      throw new Error(`Reference '${this.reference}' already exists`);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.portable]: this.portable,
      [this.db.reference]: this.reference,
      [this.db.translation]: this.translation,
    });

    console.log(`🌍 Lexique créé - Reference: ${this.reference} | GUID: ${guid}`);

    if (!lastID) {
      throw new Error('Failed to create lexicon entry');
    }

    this.id = lastID;
    this.guid = guid;

    console.log('✅ Lexique créé avec ID:', this.id);
  }

  /**
   * Met à jour une entrée lexique existante
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Lexicon ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.portable !== undefined) updateData[this.db.portable] = this.portable;
    if (this.reference !== undefined) updateData[this.db.reference] = this.reference;
    if (this.translation !== undefined) updateData[this.db.translation] = this.translation;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update lexicon entry');
    }
  }

  /**
   * Supprime une entrée lexique
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Met à jour partiellement les traductions (ajouter/supprimer une langue)
   */
  protected async updateTranslation(newTranslations: Record<string, string>): Promise<void> {
    if (!this.id) {
      throw new Error('Lexicon ID is required for translation update');
    }

    // Récupérer les traductions actuelles
    const current = await this.find(this.id);
    if (!current) {
      throw new Error('Lexicon entry not found');
    }

    // Fusionner avec les nouvelles traductions
    const mergedTranslations = { ...current.translation, ...newTranslations };

    // Nettoyer les traductions vides (pour supprimer une langue, passer une chaîne vide)
    for (const [lang, text] of Object.entries(mergedTranslations)) {
      if (!text || text.toString().trim().length === 0) {
        delete mergedTranslations[lang];
      }
    }

    // Valider que le français est toujours présent
    if (!mergedTranslations.fr) {
      throw new Error('French translation (fr) is required and cannot be removed');
    }

    this.translation = mergedTranslations;
    await this.validate();

    const affected = await this.updateOne(
      this.db.tableName,
      { [this.db.translation]: mergedTranslations },
      { [this.db.id]: this.id },
    );

    if (!affected) {
      throw new Error('Failed to update translations');
    }
  }

  // /**
  //  * Retrieves the last modification time from the database.
  //  *
  //  * Executes a query to fetch the most recent update timestamp
  //  * from the specified database table.
  //  *
  //  * @return {Promise<Date | null>} A promise that resolves to the last modification date
  //  * or null if no date is available or if an error occurs.
  //  */
  // protected async getLastModification(): Promise<Date | null> {
  //   try {
  //     return await this.findLastModification(this.db.tableName);
  //   } catch (error: any) {
  //     console.log(`Failed to get last modification time: ${error.message}`);
  //     return null;
  //   }
  // }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Valider la référence
    if (!this.reference) {
      throw new Error(LEXICON_ERRORS.REFERENCE_REQUIRED);
    }
    if (!LexiconValidationUtils.validateReference(this.reference)) {
      throw new Error(LEXICON_ERRORS.REFERENCE_INVALID);
    }

    // Valider les traductions
    if (!this.translation) {
      throw new Error(LEXICON_ERRORS.TRANSLATION_REQUIRED);
    }
    if (!LexiconValidationUtils.validateTranslation(this.translation)) {
      throw new Error(LEXICON_ERRORS.TRANSLATION_INVALID);
    }

    // Nettoyer les données
    const cleaned = LexiconValidationUtils.cleanLexiconData(this);
    Object.assign(this, cleaned);
  }
}
