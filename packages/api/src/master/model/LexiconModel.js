"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@toke/shared");
const db_base_js_1 = __importDefault(require("../database/db.base.js"));
const response_model_js_1 = require("../../utils/response.model.js");
class LexiconModel extends db_base_js_1.default {
    constructor() {
        super();
        this.db = {
            tableName: response_model_js_1.tableName.LEXICON,
            id: 'id',
            guid: 'guid',
            portable: 'portable',
            reference: 'reference',
            translation: 'translation',
            updated_at: 'updatedAt',
        };
    }
    /**
     * Trouve un enregistrement par son ID
     */
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.id]: id });
        });
    }
    /**
     * Trouve un enregistrement par sa référence
     */
    findByReference(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.reference]: reference });
        });
    }
    /**
     * Trouve un enregistrement par son GUID
     */
    findByGuid(guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.guid]: guid });
        });
    }
    /**
     * Liste tous les enregistrements selon les conditions
     */
    listAll() {
        return __awaiter(this, arguments, void 0, function* (conditions = {}) {
            return yield this.findAll(this.db.tableName, conditions);
        });
    }
    /**
     * Récupère toutes les entrées portables (exportables pour mobile)
     */
    listPortable() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findAll(this.db.tableName, { [this.db.portable]: true });
        });
    }
    /**
     * Crée une nouvelle entrée lexique
     */
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate();
            // Générer le GUID automatiquement
            const guid = yield this.guidGenerator(this.db.tableName, 6);
            if (!guid) {
                throw new Error('Failed to generate GUID for lexicon entry');
            }
            // Vérifier l'unicité de la référence
            const existingReference = yield this.findByReference(this.reference);
            if (existingReference) {
                throw new Error(`Reference '${this.reference}' already exists`);
            }
            const lastID = yield this.insertOne(this.db.tableName, {
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
        });
    }
    /**
     * Met à jour une entrée lexique existante
     */
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate();
            if (!this.id) {
                throw new Error('Lexicon ID is required for update');
            }
            const updateData = {};
            if (this.portable !== undefined)
                updateData[this.db.portable] = this.portable;
            if (this.reference !== undefined)
                updateData[this.db.reference] = this.reference;
            if (this.translation !== undefined)
                updateData[this.db.translation] = this.translation;
            const affected = yield this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
            if (!affected) {
                throw new Error('Failed to update lexicon entry');
            }
        });
    }
    /**
     * Supprime une entrée lexique
     */
    trash(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.deleteOne(this.db.tableName, { [this.db.id]: id });
        });
    }
    /**
     * Met à jour partiellement les traductions (ajouter/supprimer une langue)
     */
    updateTranslation(newTranslations) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.id) {
                throw new Error('Lexicon ID is required for translation update');
            }
            // Récupérer les traductions actuelles
            const current = yield this.find(this.id);
            if (!current) {
                throw new Error('Lexicon entry not found');
            }
            // Fusionner avec les nouvelles traductions
            const mergedTranslations = Object.assign(Object.assign({}, current.translation), newTranslations);
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
            yield this.validate();
            const affected = yield this.updateOne(this.db.tableName, { [this.db.translation]: mergedTranslations }, { [this.db.id]: this.id });
            if (!affected) {
                throw new Error('Failed to update translations');
            }
        });
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
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            // Valider la référence
            if (!this.reference) {
                throw new Error(shared_1.LEXICON_ERRORS.REFERENCE_REQUIRED);
            }
            if (!shared_1.LexiconValidationUtils.validateReference(this.reference)) {
                throw new Error(shared_1.LEXICON_ERRORS.REFERENCE_INVALID);
            }
            // Valider les traductions
            if (!this.translation) {
                throw new Error(shared_1.LEXICON_ERRORS.TRANSLATION_REQUIRED);
            }
            if (!shared_1.LexiconValidationUtils.validateTranslation(this.translation)) {
                throw new Error(shared_1.LEXICON_ERRORS.TRANSLATION_INVALID);
            }
            // Nettoyer les données
            const cleaned = shared_1.LexiconValidationUtils.cleanLexiconData(this);
            Object.assign(this, cleaned);
        });
    }
}
exports.default = LexiconModel;
