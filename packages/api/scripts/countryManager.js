"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.CountryManager = void 0;
const readline = __importStar(require("readline"));
const Country_1 = __importDefault(require("../src/master/class/Country"));
const db_config_1 = __importDefault(require("../src/master/database/db.config"));
const db_initializer_1 = require("../src/master/database/db.initializer");
class CountryManager {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }
    /**
     * Initialisation de la base de données
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("⏳ Initialisation de l'application...");
                // 1. Connexion à la base de données
                const sequelize = yield db_config_1.default.getInstance();
                // 2. Initialiser les tables
                yield db_initializer_1.TableInitializer.initialize(sequelize);
                console.log('✅ Application initialisée');
            }
            catch (error) {
                console.error('❌ Erreur initialisation:', error.message);
                throw error;
            }
        });
    }
    /**
     * Créer un nouveau pays
     */
    createCountry() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🌍 === Création d'un nouveau pays ===\n");
            try {
                const code = yield this.question('📝 Code ISO du pays (2 lettres): ');
                // Validation
                if (typeof code !== 'string' || !code.trim() || code.length !== 2) {
                    console.log(`❌ Code ISO valide requis (2 lettres)`);
                    return;
                }
                const nameEn = yield this.question('📝 Nom en anglais: ');
                if (!nameEn.trim()) {
                    console.log(`❌ Nom anglais requis`);
                    return;
                }
                const nameLocal = yield this.question('📝 Nom local (optionnel): ');
                const currencyCode = yield this.question('💰 Code devise (3 lettres, ex: USD): ');
                if (!currencyCode.trim() || currencyCode.length !== 3) {
                    console.log(`❌ Code devise valide requis (3 lettres)`);
                    return;
                }
                const languageCode = yield this.question('🗣️ Code langue (2 lettres, ex: en): ');
                if (!languageCode.trim() || languageCode.length !== 2) {
                    console.log(`❌ Code langue valide requis (2 lettres)`);
                    return;
                }
                const timezone = yield this.question('🕐 Fuseau horaire (ex: Europe/Paris) [UTC]: ');
                const phonePrefix = yield this.question('📞 Préfixe téléphonique (ex: +33): ');
                if (!phonePrefix.trim() || !phonePrefix.startsWith('+')) {
                    console.log(`❌ Préfixe téléphonique requis (format: +XXX)`);
                    return;
                }
                const activeInput = yield this.question('✅ Actif ? (o/n) [o]: ');
                const active = activeInput.toLowerCase() !== 'n';
                console.log('\n⏳ Création du pays...');
                // Créer le pays
                const country = new Country_1.default()
                    .setCode(code)
                    .setNameEn(nameEn)
                    .setNameLocal(nameLocal || nameEn)
                    .setDefaultCurrencyCode(currencyCode)
                    .setDefaultLanguageCode(languageCode)
                    .setTimezoneDefault(timezone || 'UTC')
                    .setPhonePrefix(phonePrefix)
                    .setActive(active);
                yield country.save();
                console.log('\n✅ Pays créé avec succès!');
                console.log(`   - ID: ${country.getId()}`);
                console.log(`   - GUID: ${country.getGuid()}`);
                console.log(`   - Code: ${country.getCode()}`);
                console.log(`   - Nom: ${country.getNameEn()}`);
                console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
                console.log(`   - Langue: ${country.getDefaultLanguageCode()}`);
                console.log(`   - Actif: ${country.isActive() ? 'Oui' : 'Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log('   - Choisir un autre code ISO');
                    console.log('   - Vérifier les pays existants (option 2)');
                }
            }
        });
    }
    /**
     * Lister tous les pays
     */
    listCountries() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des pays ===\n');
            try {
                const countries = yield Country_1.default._list();
                if (!countries || countries.length === 0) {
                    console.log('📝 Aucun pays trouvé');
                    return;
                }
                console.log(`📊 ${countries.length} pays trouvé(s):\n`);
                countries.forEach((country, index) => {
                    const status = country.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
                    console.log(`   ID: ${country.getId()}`);
                    console.log(`   GUID: ${country.getGuid()}`);
                    console.log(`   Nom local: ${country.getNameLocal()}`);
                    console.log(`   Devise: ${country.getDefaultCurrencyCode()}`);
                    console.log(`   Langue: ${country.getDefaultLanguageCode()}`);
                    console.log(`   Fuseau: ${country.getTimezoneDefault()}`);
                    console.log(`   Téléphone: ${country.getPhonePrefix()}`);
                    console.log(`   Statut: ${status}`);
                    console.log('');
                });
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Modifier un pays
     */
    updateCountry() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'un pays ===\n");
            try {
                const countries = yield Country_1.default._list();
                if (!countries || countries.length === 0) {
                    console.log('📝 Aucun pays à modifier');
                    return;
                }
                // Afficher la liste
                console.log('Pays disponibles:');
                countries.forEach((country, index) => {
                    console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
                });
                const choice = yield this.question('\nNuméro du pays à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= countries.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const country = countries[index];
                // Modifications possibles
                const newNameEn = yield this.question(`📝 Nouveau nom anglais (actuel: ${country.getNameEn()}): `);
                const newNameLocal = yield this.question(`📝 Nouveau nom local (actuel: ${country.getNameLocal()}): `);
                const newCurrency = yield this.question(`💰 Nouveau code devise (actuel: ${country.getDefaultCurrencyCode()}): `);
                const newLanguage = yield this.question(`🗣️ Nouveau code langue (actuel: ${country.getDefaultLanguageCode()}): `);
                const newTimezone = yield this.question(`🕐 Nouveau fuseau (actuel: ${country.getTimezoneDefault()}): `);
                const newPhone = yield this.question(`📞 Nouveau préfixe (actuel: ${country.getPhonePrefix()}): `);
                let modified = false;
                if (newNameEn.trim()) {
                    country.setNameEn(newNameEn);
                    modified = true;
                }
                if (newNameLocal.trim()) {
                    country.setNameLocal(newNameLocal);
                    modified = true;
                }
                if (newCurrency.trim() && newCurrency.length === 3) {
                    country.setDefaultCurrencyCode(newCurrency);
                    modified = true;
                }
                if (newLanguage.trim() && newLanguage.length === 2) {
                    country.setDefaultLanguageCode(newLanguage);
                    modified = true;
                }
                if (newTimezone.trim()) {
                    country.setTimezoneDefault(newTimezone);
                    modified = true;
                }
                if (newPhone.trim() && newPhone.startsWith('+')) {
                    country.setPhonePrefix(newPhone);
                    modified = true;
                }
                if (modified) {
                    yield country.save();
                    console.log('\n✅ Pays modifié avec succès!');
                }
                else {
                    console.log('\n⚠️ Aucune modification effectuée');
                }
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Changer le statut d'un pays
     */
    toggleCountryStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔄 === Changement de statut ===\n');
            try {
                const countries = yield Country_1.default._list();
                if (!countries || countries.length === 0) {
                    console.log('📝 Aucun pays trouvé');
                    return;
                }
                // Afficher la liste avec statuts
                console.log('Pays disponibles:');
                countries.forEach((country, index) => {
                    const status = country.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()}) - ${status}`);
                });
                const choice = yield this.question('\nNuméro du pays: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= countries.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const country = countries[index];
                const oldStatus = country.isActive() ? 'actif' : 'inactif';
                country.setActive(!country.isActive());
                yield country.save();
                const newStatus = country.isActive() ? 'actif' : 'inactif';
                console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer un pays
     */
    deleteCountry() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'un pays ===\n");
            try {
                const countries = yield Country_1.default._list();
                if (!countries || countries.length === 0) {
                    console.log('📝 Aucun pays à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Pays disponibles:');
                countries.forEach((country, index) => {
                    console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
                });
                const choice = yield this.question('\nNuméro du pays à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= countries.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const country = countries[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${country.getNameEn()}" (${country.getCode()}) ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield country.delete();
                    if (success) {
                        console.log('\n✅ Pays supprimé avec succès');
                    }
                    else {
                        console.log('\n❌ Erreur lors de la suppression');
                    }
                }
                else {
                    console.log('\n⚠️ Suppression annulée');
                }
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Tester la connexion à la base de données
     */
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔍 === Test de connexion ===\n');
            try {
                const sequelize = yield db_config_1.default.getInstance();
                yield sequelize.authenticate();
                const stats = db_initializer_1.TableInitializer.getStats();
                console.log('✅ Connexion DB: OK');
                console.log(`📊 Tables initialisées: ${stats.initialized ? 'Oui' : 'Non'}`);
                console.log(`📋 Nombre de tables: ${stats.tableCount}`);
                console.log(`🏷️ Tables: ${stats.tableNames.join(', ')}`);
            }
            catch (error) {
                console.log(`❌ Erreur connexion: ${error.message}`);
            }
        });
    }
    /**
     * Menu principal
     */
    showMenu() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🛠️ === Gestionnaire des pays ===');
            console.log('1. Créer un nouveau pays');
            console.log('2. Lister tous les pays');
            console.log('3. Modifier un pays');
            console.log("4. Changer le statut d'un pays");
            console.log('5. Supprimer un pays');
            console.log('6. Tester la connexion DB');
            console.log('7. Quitter la gestion');
            const choice = yield this.question('\nVotre choix (1-7): ');
            switch (choice) {
                case '1':
                    yield this.createCountry();
                    break;
                case '2':
                    yield this.listCountries();
                    break;
                case '3':
                    yield this.updateCountry();
                    break;
                case '4':
                    yield this.toggleCountryStatus();
                    break;
                case '5':
                    yield this.deleteCountry();
                    break;
                case '6':
                    yield this.testConnection();
                    break;
                case '7':
                    console.log('\n👋 Au revoir!');
                    return;
                default:
                    console.log('\n❌ Choix invalide');
            }
            yield this.showMenu(); // Reboucle
        });
    }
    /**
     * Démarrage du gestionnaire
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🚀 === Gestionnaire de pays ===\n');
                yield this.init();
                yield this.showMenu();
            }
            catch (error) {
                console.error('❌ Erreur fatale:', error.message);
            }
            finally {
                yield this.cleanup();
            }
        });
    }
    question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => resolve(answer.trim()));
        });
    }
    /**
     * Nettoyage des ressources
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.rl.close();
                db_initializer_1.TableInitializer.cleanup();
                yield db_config_1.default.close();
                console.log('🧹 Ressources nettoyées');
            }
            catch (error) {
                console.error('❌ Erreur lors du nettoyage:', error);
            }
        });
    }
}
exports.CountryManager = CountryManager;
// Gestion propre de l'arrêt
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Arrêt en cours...');
    process.exit(0);
}));
process.on('uncaughtException', (error) => {
    console.error('❌ Exception non gérée:', error);
    process.exit(1);
});
// Démarrage
const manager = new CountryManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
