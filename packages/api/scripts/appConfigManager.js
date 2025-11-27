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
exports.AppConfigManager = void 0;
const readline = __importStar(require("readline"));
const AppConfig_1 = __importDefault(require("../src/master/class/AppConfig"));
const db_config_1 = __importDefault(require("../src/master/database/db.config"));
const db_initializer_1 = require("../src/master/database/db.initializer");
class AppConfigManager {
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
     * Créer une nouvelle configuration
     */
    createAppConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("⚙️ === Création d'une nouvelle configuration ===\n");
            try {
                const key = yield this.question('📝 Clé de configuration (ex: API_URL): ');
                // Validation
                if (typeof key !== 'string' || !key.trim()) {
                    console.log(`❌ Clé de configuration requise`);
                    return;
                }
                const link = yield this.question('🔗 Lien/Valeur de configuration: ');
                if (!link.trim()) {
                    console.log(`❌ Lien/Valeur requis`);
                    return;
                }
                const activeInput = yield this.question('✅ Actif ? (o/n) [o]: ');
                const active = activeInput.toLowerCase() !== 'n';
                console.log('\n⏳ Création de la configuration...');
                // Créer la configuration
                const config = new AppConfig_1.default().setKey(key).setLink(link).setActive(active);
                yield config.save();
                console.log('\n✅ Configuration créée avec succès!');
                console.log(`   - ID: ${config.getId()}`);
                console.log(`   - Clé: ${config.getKey()}`);
                console.log(`   - Lien: ${config.getLink()}`);
                console.log(`   - Actif: ${config.isActive() ? 'Oui' : 'Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log('   - Choisir une autre clé');
                    console.log('   - Vérifier les configurations existantes (option 2)');
                }
            }
        });
    }
    /**
     * Lister toutes les configurations
     */
    listAppConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des configurations ===\n');
            try {
                const configs = yield AppConfig_1.default._list();
                if (!configs || configs.length === 0) {
                    console.log('📝 Aucune configuration trouvée');
                    return;
                }
                console.log(`📊 ${configs.length} configuration(s) trouvée(s):\n`);
                configs.forEach((config, index) => {
                    const status = config.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${config.getKey()}`);
                    console.log(`   ID: ${config.getId()}`);
                    console.log(`   Lien: ${config.getLink()}`);
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
     * Lister les configurations par statut
     */
    listAppConfigsByStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des configurations par statut ===\n');
            try {
                const statusInput = yield this.question('Statut (actif/inactif) [actif]: ');
                const status = statusInput.toLowerCase() !== 'inactif';
                const configs = yield AppConfig_1.default._listByStatus(status);
                if (!configs || configs.length === 0) {
                    console.log(`📝 Aucune configuration ${status ? 'active' : 'inactive'} trouvée`);
                    return;
                }
                console.log(`📊 ${configs.length} configuration(s) ${status ? 'active(s)' : 'inactive(s)'} trouvée(s):\n`);
                configs.forEach((config, index) => {
                    const statusIcon = config.isActive() ? '🟢' : '🔴';
                    console.log(`${index + 1}. ${statusIcon} ${config.getKey()}`);
                    console.log(`   ID: ${config.getId()}`);
                    console.log(`   Lien: ${config.getLink()}`);
                    console.log('');
                });
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Charger une configuration par clé
     */
    loadAppConfigByKey() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔍 === Charger une configuration par clé ===\n');
            try {
                const key = yield this.question('📝 Clé de configuration: ');
                if (!key.trim()) {
                    console.log('❌ Clé requise');
                    return;
                }
                console.log('\n⏳ Chargement...');
                const config = yield AppConfig_1.default._load(key, true);
                if (!config) {
                    console.log(`\n❌ Configuration "${key}" non trouvée`);
                    return;
                }
                console.log('\n✅ Configuration trouvée:');
                console.log(`   - ID: ${config.getId()}`);
                console.log(`   - Clé: ${config.getKey()}`);
                console.log(`   - Lien: ${config.getLink()}`);
                console.log(`   - Actif: ${config.isActive() ? 'Oui' : 'Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Modifier une configuration
     */
    updateAppConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'une configuration ===\n");
            try {
                const configs = yield AppConfig_1.default._list();
                if (!configs || configs.length === 0) {
                    console.log('📝 Aucune configuration à modifier');
                    return;
                }
                // Afficher la liste
                console.log('Configurations disponibles:');
                configs.forEach((config, index) => {
                    console.log(`${index + 1}. ${config.getKey()}`);
                });
                const choice = yield this.question('\nNuméro de la configuration à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= configs.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const config = configs[index];
                // Modifications possibles
                const newKey = yield this.question(`📝 Nouvelle clé (actuelle: ${config.getKey()}): `);
                const newLink = yield this.question(`🔗 Nouveau lien (actuel: ${config.getLink()}): `);
                let modified = false;
                if (newKey.trim()) {
                    config.setKey(newKey);
                    modified = true;
                }
                if (newLink.trim()) {
                    config.setLink(newLink);
                    modified = true;
                }
                if (modified) {
                    yield config.save();
                    console.log('\n✅ Configuration modifiée avec succès!');
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
     * Changer le statut d'une configuration
     */
    toggleAppConfigStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔄 === Changement de statut ===\n');
            try {
                const configs = yield AppConfig_1.default._list();
                if (!configs || configs.length === 0) {
                    console.log('📝 Aucune configuration trouvée');
                    return;
                }
                // Afficher la liste avec statuts
                console.log('Configurations disponibles:');
                configs.forEach((config, index) => {
                    const status = config.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${config.getKey()} - ${status}`);
                });
                const choice = yield this.question('\nNuméro de la configuration: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= configs.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const config = configs[index];
                yield config.patchStatus();
                const newStatus = config.isActive() ? 'actif' : 'inactif';
                console.log(`\n✅ Statut changé: configuration maintenant ${newStatus}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer une configuration
     */
    deleteAppConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'une configuration ===\n");
            try {
                const configs = yield AppConfig_1.default._list();
                if (!configs || configs.length === 0) {
                    console.log('📝 Aucune configuration à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Configurations disponibles:');
                configs.forEach((config, index) => {
                    console.log(`${index + 1}. ${config.getKey()}`);
                });
                const choice = yield this.question('\nNuméro de la configuration à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= configs.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const config = configs[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${config.getKey()}" ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield config.delete();
                    if (success) {
                        console.log('\n✅ Configuration supprimée avec succès');
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
     * Tester le JSON output
     */
    testJSONOutput() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📄 === Test sortie JSON ===\n');
            try {
                const configs = yield AppConfig_1.default._list();
                if (!configs || configs.length === 0) {
                    console.log('📝 Aucune configuration pour le test JSON');
                    return;
                }
                console.log('Configurations disponibles:');
                configs.forEach((config, index) => {
                    console.log(`${index + 1}. ${config.getKey()}`);
                });
                const choice = yield this.question('\nNuméro de la configuration: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= configs.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const config = configs[index];
                const json = config.toJSON();
                console.log('\n✅ Sortie JSON:');
                console.log(JSON.stringify(json, null, 2));
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Menu principal
     */
    showMenu() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🛠️ === Gestionnaire des configurations applicatives ===');
            console.log('1. Créer une nouvelle configuration');
            console.log('2. Lister toutes les configurations');
            console.log('3. Lister les configurations par statut');
            console.log('4. Charger une configuration par clé');
            console.log('5. Modifier une configuration');
            console.log("6. Changer le statut d'une configuration");
            console.log('7. Supprimer une configuration');
            console.log('8. Tester la connexion DB');
            console.log('9. Tester la sortie JSON');
            console.log('10. Quitter la gestion');
            const choice = yield this.question('\nVotre choix (1-10): ');
            switch (choice) {
                case '1':
                    yield this.createAppConfig();
                    break;
                case '2':
                    yield this.listAppConfigs();
                    break;
                case '3':
                    yield this.listAppConfigsByStatus();
                    break;
                case '4':
                    yield this.loadAppConfigByKey();
                    break;
                case '5':
                    yield this.updateAppConfig();
                    break;
                case '6':
                    yield this.toggleAppConfigStatus();
                    break;
                case '7':
                    yield this.deleteAppConfig();
                    break;
                case '8':
                    yield this.testConnection();
                    break;
                case '9':
                    yield this.testJSONOutput();
                    break;
                case '10':
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
                console.log('🚀 === Gestionnaire de configurations applicatives ===\n');
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
exports.AppConfigManager = AppConfigManager;
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
const manager = new AppConfigManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
