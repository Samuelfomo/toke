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
exports.CurrencyManager = void 0;
const readline = __importStar(require("readline"));
const Currency_1 = __importDefault(require("../src/license/class/Currency"));
const db_config_1 = __importDefault(require("../src/license/database/db.config"));
const db_initializer_1 = require("../src/license/database/db.initializer");
class CurrencyManager {
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
     * Créer une nouvelle devise
     */
    createCurrency() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("💰 === Création d'une nouvelle devise ===\n");
            try {
                const code = yield this.question('📝 Code devise (3 lettres, ex: USD): ');
                // Validation
                if (typeof code !== 'string' || !code.trim() || code.length !== 3) {
                    console.log(`❌ Code devise valide requis (3 lettres)`);
                    return;
                }
                const name = yield this.question('📝 Nom de la devise (ex: US Dollar): ');
                if (!name.trim()) {
                    console.log(`❌ Nom de la devise requis`);
                    return;
                }
                const symbol = yield this.question('💱 Symbole de la devise (ex: $): ');
                if (!symbol.trim()) {
                    console.log(`❌ Symbole de la devise requis`);
                    return;
                }
                const decimalInput = yield this.question('🔢 Nombre de décimales (ex: 2): ');
                const decimalPlaces = parseInt(decimalInput);
                if (isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 8) {
                    console.log(`❌ Nombre de décimales valide requis (0-8)`);
                    return;
                }
                const activeInput = yield this.question('✅ Active ? (o/n) [o]: ');
                const active = activeInput.toLowerCase() !== 'n';
                console.log('\n⏳ Création de la devise...');
                // Créer la devise
                const currency = new Currency_1.default()
                    .setCode(code)
                    .setName(name)
                    .setSymbol(symbol)
                    .setDecimalPlaces(decimalPlaces)
                    .setActive(active);
                yield currency.save();
                console.log('\n✅ Devise créée avec succès!');
                console.log(`   - ID: ${currency.getId()}`);
                console.log(`   - GUID: ${currency.getGuid()}`);
                console.log(`   - Code: ${currency.getCode()}`);
                console.log(`   - Nom: ${currency.getName()}`);
                console.log(`   - Symbole: ${currency.getSymbol()}`);
                console.log(`   - Décimales: ${currency.getDecimalPlaces()}`);
                console.log(`   - Active: ${currency.isActive() ? 'Oui' : 'Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log('   - Choisir un autre code devise');
                    console.log('   - Vérifier les devises existantes (option 2)');
                }
            }
        });
    }
    /**
     * Lister toutes les devises
     */
    listCurrencies() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des devises ===\n');
            try {
                const currencies = yield Currency_1.default._list();
                if (!currencies || currencies.length === 0) {
                    console.log('📝 Aucune devise trouvée');
                    return;
                }
                console.log(`📊 ${currencies.length} devise(s) trouvée(s):\n`);
                currencies.forEach((currency, index) => {
                    const status = currency.isActive() ? '🟢 Active' : '🔴 Inactive';
                    console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
                    console.log(`   ID: ${currency.getId()}`);
                    console.log(`   GUID: ${currency.getGuid()}`);
                    console.log(`   Symbole: ${currency.getSymbol()}`);
                    console.log(`   Décimales: ${currency.getDecimalPlaces()}`);
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
     * Modifier une devise
     */
    updateCurrency() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'une devise ===\n");
            try {
                const currencies = yield Currency_1.default._list();
                if (!currencies || currencies.length === 0) {
                    console.log('📝 Aucune devise à modifier');
                    return;
                }
                // Afficher la liste
                console.log('Devises disponibles:');
                currencies.forEach((currency, index) => {
                    console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
                });
                const choice = yield this.question('\nNuméro de la devise à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= currencies.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const currency = currencies[index];
                // Modifications possibles
                const newName = yield this.question(`📝 Nouveau nom (actuel: ${currency.getName()}): `);
                const newSymbol = yield this.question(`💱 Nouveau symbole (actuel: ${currency.getSymbol()}): `);
                const newDecimalInput = yield this.question(`🔢 Nouvelles décimales (actuel: ${currency.getDecimalPlaces()}): `);
                let modified = false;
                if (newName.trim()) {
                    currency.setName(newName);
                    modified = true;
                }
                if (newSymbol.trim()) {
                    currency.setSymbol(newSymbol);
                    modified = true;
                }
                if (newDecimalInput.trim()) {
                    const newDecimal = parseInt(newDecimalInput);
                    if (!isNaN(newDecimal) && newDecimal >= 0 && newDecimal <= 8) {
                        currency.setDecimalPlaces(newDecimal);
                        modified = true;
                    }
                    else {
                        console.log('⚠️ Nombre de décimales invalide (0-8), ignoré');
                    }
                }
                if (modified) {
                    yield currency.save();
                    console.log('\n✅ Devise modifiée avec succès!');
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
     * Changer le statut d'une devise
     */
    toggleCurrencyStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔄 === Changement de statut ===\n');
            try {
                const currencies = yield Currency_1.default._list();
                if (!currencies || currencies.length === 0) {
                    console.log('📝 Aucune devise trouvée');
                    return;
                }
                // Afficher la liste avec statuts
                console.log('Devises disponibles:');
                currencies.forEach((currency, index) => {
                    const status = currency.isActive() ? '🟢 Active' : '🔴 Inactive';
                    console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()}) - ${status}`);
                });
                const choice = yield this.question('\nNuméro de la devise: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= currencies.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const currency = currencies[index];
                const oldStatus = currency.isActive() ? 'active' : 'inactive';
                currency.setActive(!currency.isActive());
                yield currency.save();
                const newStatus = currency.isActive() ? 'active' : 'inactive';
                console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer une devise
     */
    deleteCurrency() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'une devise ===\n");
            try {
                const currencies = yield Currency_1.default._list();
                if (!currencies || currencies.length === 0) {
                    console.log('📝 Aucune devise à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Devises disponibles:');
                currencies.forEach((currency, index) => {
                    console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
                });
                const choice = yield this.question('\nNuméro de la devise à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= currencies.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const currency = currencies[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${currency.getName()}" (${currency.getCode()}) ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield currency.delete();
                    if (success) {
                        console.log('\n✅ Devise supprimée avec succès');
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
     * Lister les devises actives seulement
     */
    listActiveCurrencies() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des devises actives ===\n');
            try {
                const currencies = yield Currency_1.default._listByActiveStatus(true);
                if (!currencies || currencies.length === 0) {
                    console.log('📝 Aucune devise active trouvée');
                    return;
                }
                console.log(`📊 ${currencies.length} devise(s) active(s):\n`);
                currencies.forEach((currency, index) => {
                    console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
                    console.log(`   Symbole: ${currency.getSymbol()}`);
                    console.log(`   Décimales: ${currency.getDecimalPlaces()}`);
                    console.log('');
                });
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
            console.log('\n🛠️ === Gestionnaire des devises ===');
            console.log('1. Créer une nouvelle devise');
            console.log('2. Lister toutes les devises');
            console.log('3. Lister les devises actives');
            console.log('4. Modifier une devise');
            console.log("5. Changer le statut d'une devise");
            console.log('6. Supprimer une devise');
            console.log('7. Tester la connexion DB');
            console.log('8. Quitter la gestion');
            const choice = yield this.question('\nVotre choix (1-8): ');
            switch (choice) {
                case '1':
                    yield this.createCurrency();
                    break;
                case '2':
                    yield this.listCurrencies();
                    break;
                case '3':
                    yield this.listActiveCurrencies();
                    break;
                case '4':
                    yield this.updateCurrency();
                    break;
                case '5':
                    yield this.toggleCurrencyStatus();
                    break;
                case '6':
                    yield this.deleteCurrency();
                    break;
                case '7':
                    yield this.testConnection();
                    break;
                case '8':
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
                console.log('🚀 === Gestionnaire de devises ===\n');
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
exports.CurrencyManager = CurrencyManager;
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
const manager = new CurrencyManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
