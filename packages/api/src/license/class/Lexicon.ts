import LexiconModel from '../model/LexiconModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import Revision from '../../tools/revision.js';
import { responseStructure as RS, tableName } from '../../utils/response.model.js';

export default class Lexicon extends LexiconModel {
  constructor() {
    super();
  }

  /**
   * Exports translation items, either for a specific language or all languages.
   *
   * @param {string} [lang] - The optional language code to filter the export for a specific language. If not provided, exports items for all languages.
   * @return {Promise<{revision: string, count: number, items: Record<string, any>}>} A promise that resolves with an object containing:
   *         - `revision`: The current revision identifier.
   *         - `count`: The number of exported items.
   *         - `items`: The exported translation items as a record of key-value mappings.
   */
  static async exportable(lang?: string): Promise<{
    revision: string;
    count: number;
    items: Record<string, any>;
  }> {
    const revision = await Revision.getRevision(tableName.LEXICON);
    let data: Record<string, any> = {};
    //let items: Map<string, any> = new Map();

    if (lang) {
      // Export pour une langue spécifique
      const translations = await this._exportByLanguage(lang);
      data = translations || {};
      return {
        revision,
        count: Object.keys(data).length,
        items: Object.entries(data).map(([key, value]) => ({
          key,
          value,
        })),
        // exported_at: new Date().toISOString(),
      };
    } else {
      // Export complet toutes langues
      const allEntries = await this._list({ portable: true });
      if (allEntries) {
        allEntries.forEach((entry) => {
          if (entry.getReference()) {
            data[entry.getReference()!] = {
              //guid: entry.getGuid()!,
              translation: entry.getTranslation()!,
            };
          }
        });
      }
      return {
        revision,
        count: Object.keys(data).length,
        items: Object.entries(data).map(([key, value]) => ({
          key,
          ...value,
        })),
        // exported_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Loads a lexicon based on the provided identifier.
   *
   * @param {any} identifier - The identifier used to load the lexicon. It can vary depending on the context.
   * @param {boolean} [byGuid=false] - Specifies whether to load the lexicon using a GUID.
   * @param {boolean} [byReference=false] - Specifies whether to load the lexicon using a reference.
   * @return {Promise<Lexicon | null>} A promise that resolves to the loaded Lexicon instance or null if the lexicon cannot be loaded.
   */
  static _load(
    identifier: any,
    byGuid: boolean = false,
    byReference: boolean = false
  ): Promise<Lexicon | null> {
    return new Lexicon().load(identifier, byGuid, byReference);
  }

  /**
   * Liste les entrées selon les conditions
   */
  static _list(conditions: Record<string, any> = {}): Promise<Lexicon[] | null> {
    return new Lexicon().list(conditions);
  }

  /**
   * Liste les entrées portables
   */
  static _listPortable(): Promise<Lexicon[] | null> {
    return new Lexicon().listPortableEntries();
  }

  /**
   * Exporte les traductions par langue
   */
  static _exportByLanguage(langCode: string): Promise<Record<string, string> | null> {
    return new Lexicon().exportByLanguage(langCode);
  }

  /**
   * Convertit des données en objet Lexicon
   */
  static _toObject(data: any): Lexicon {
    return new Lexicon().hydrate(data);
  }

  // === SETTERS FLUENT ===
  setPortable(portable: boolean): Lexicon {
    this.portable = portable;
    return this;
  }

  setReference(reference: string): Lexicon {
    this.reference = reference;
    return this;
  }

  setTranslation(translation: Record<string, string>): Lexicon {
    this.translation = translation;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getGuid(): number | undefined {
    return this.guid;
  }

  isPortable(): boolean | undefined {
    return this.portable;
  }

  // region Privates methods

  getReference(): string | undefined {
    return this.reference;
  }

  getTranslation(): Record<string, string> | undefined {
    return this.translation;
  }

  // endregion

  /**
   * Obtient la traduction pour une langue spécifique
   */
  getTranslationForLanguage(langCode: string): string | null {
    if (!this.translation) return null;
    return this.translation[langCode] || this.translation.fr || null; // Fallback vers français
  }

  /**
   * Obtient toutes les langues disponibles pour cette entrée
   */
  getAvailableLanguages(): string[] {
    return this.translation ? Object.keys(this.translation) : [];
  }

  /**
   * Ajoute ou met à jour une traduction pour une langue
   */
  addTranslation(langCode: string, text: string): Lexicon {
    if (!this.translation) {
      this.translation = {};
    }
    this.translation[langCode] = text;
    return this;
  }

  /**
   * Supprime une traduction pour une langue (sauf le français)
   */
  removeTranslation(langCode: string): Lexicon {
    if (langCode === 'fr') {
      throw new Error('Cannot remove French translation (default language)');
    }
    if (this.translation && this.translation[langCode]) {
      delete this.translation[langCode];
    }
    return this;
  }

  /**
   * Sauvegarde l'entrée (création ou mise à jour)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde lexique:', error);
      throw new Error(error);
    }
  }

  /**
   * Supprime l'entrée lexique
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Lexicon Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Bascule le statut portable
   */
  async togglePortable(): Promise<void> {
    await W.isOccur(!this.id, `${G.identifierMissing.code}: Lexicon Toggle Portable`);
    this.portable = !this.portable;
    await this.save();
  }

  /**
   * Met à jour partiellement les traductions
   */
  async updatePartialTranslations(newTranslations: Record<string, string>): Promise<void> {
    await W.isOccur(!this.id, `${G.identifierMissing.code}: Lexicon Update Translations`);
    await this.updateTranslation(newTranslations);
    // Recharger l'instance pour avoir les données à jour
    const updated = await this.load(this.id!);
    if (updated) {
      this.translation = updated.getTranslation();
    }
  }

  /**
   * Loads a Lexicon object based on the provided identifier and search method.
   *
   * @param {any} identifier - The identifier used to find the Lexicon object.
   *                           Can be a GUID, a reference, or an ID number.
   * @param {boolean} [byGuid=false] - Specifies if the lookup should be performed by GUID.
   *                                   Default is false.
   * @param {boolean} [byReference=false] - Specifies if the lookup should be performed by reference.
   *                                        Default is false.
   * @return {Promise<Lexicon | null>} A promise that resolves to the located Lexicon object, or null if not found.
   */
  async load(
    identifier: any,
    byGuid: boolean = false,
    byReference: boolean = false
  ): Promise<Lexicon | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byReference
        ? await this.findByReference(identifier)
        : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Liste les entrées lexique selon les conditions
   */
  async list(conditions: Record<string, any> = {}): Promise<Lexicon[] | null> {
    const dataset = await this.listAll(conditions);
    if (!dataset) return null;
    return dataset.map((data) => new Lexicon().hydrate(data));
  }

  /**
   * Liste uniquement les entrées portables (pour export mobile)
   */
  async listPortableEntries(): Promise<Lexicon[] | null> {
    const dataset = await this.listPortable();
    if (!dataset) return null;
    return dataset.map((data) => new Lexicon().hydrate(data));
  }

  /**
   * Exporte toutes les traductions dans une langue donnée
   */
  async exportByLanguage(langCode: string): Promise<Record<string, string> | null> {
    const entries = await this.list({ portable: true });
    if (!entries) return null;

    const result: Record<string, string> = {};
    for (const entry of entries) {
      const translation = entry.getTranslationForLanguage(langCode);
      if (translation && entry.getReference()) {
        result[entry.getReference()!] = translation;
      }
    }
    return result;
  }

  // === MÉTHODES STATIQUES ===

  /**
   * Vérifie si l'entrée est nouvelle
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Conversion JSON pour API
   */
  toJSON(): object {
    return {
      [RS.GUID]: this.guid,
      [RS.PORTABLE]: this.portable,
      [RS.REFERENCE]: this.reference,
      [RS.TRANSLATION]: this.translation,
      [RS.CREATED_AT]: this.createdAt,
      [RS.UPDATED_AT]: this.updatedAt,
    };
  }

  /**
   * Représentation string
   */
  toString(): string {
    return `Lexicon { id: ${this.id}, guid: ${this.guid}, reference: "${this.reference}", portable: ${this.portable} }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): Lexicon {
    this.id = data.id;
    this.guid = data.guid;
    this.portable = data.portable;
    this.reference = data.reference;
    this.translation = data.translation;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    return this;
  }

  // /**
  //  * Asynchronously retrieves the revision string based on the last modification time.
  //  * If the last modification time is unavailable, a default revision value of '202501010000' is returned.
  //  *
  //  * @return {Promise<string>} The revision string in the format 'YYYYMMDDHHmm'.
  //  */
  // private async getRevision(): Promise<string> {
  //   const lastModified = await this.getLastModification();
  //   if (!lastModified) return '202501010000';
  //
  //   const year = lastModified.getFullYear();
  //   const month = String(lastModified.getMonth() + 1).padStart(2, '0');
  //   const day = String(lastModified.getDate()).padStart(2, '0');
  //   const hours = String(lastModified.getHours()).padStart(2, '0');
  //   const minutes = String(lastModified.getMinutes()).padStart(2, '0');
  //
  //   return `${year}${month}${day}${hours}${minutes}`;
  // }
}
