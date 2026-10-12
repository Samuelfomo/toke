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
const readline = __importStar(require("readline"));
const db_config_js_1 = __importDefault(require("../src/master/database/db.config.js"));
const db_initializer_js_1 = require("../src/master/database/db.initializer.js");
const Endpoint_js_1 = __importDefault(require("../src/master/class/Endpoint.js"));
const endpoint_db_js_1 = require("../src/master/database/data/endpoint.db.js");
class EndpointManager {
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
                const sequelize = yield db_config_js_1.default.getInstance();
                // 2. Initialiser les tables
                yield db_initializer_js_1.TableInitializer.initialize(sequelize);
                console.log('✅ Application initialisée');
            }
            catch (error) {
                console.error('❌ Erreur initialisation:', error.message);
                throw error;
            }
        });
    }
    /**
     * Créer un nouveau endpoint
     */
    createEndpoint() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📱 === Création d'un nouveau endpoint ===\n");
            try {
                // Afficher les méthodes HTTP disponibles
                const availableMethods = Object.values(endpoint_db_js_1.HttpMethod);
                console.log('Méthodes HTTP disponibles:');
                availableMethods.forEach((method, index) => {
                    console.log(`${index + 1}. ${method}`);
                });
                const methodChoice = yield this.question(`\nChoisissez une méthode (1-${availableMethods.length}): `);
                const methodIndex = parseInt(methodChoice) - 1;
                if (methodIndex < 0 || methodIndex >= availableMethods.length) {
                    console.log('❌ Choix de méthode invalide');
                    return;
                }
                const method = availableMethods[methodIndex];
                const code = yield this.question("📝 Code de l'endpoint (ex: /api/users): ");
                const description = yield this.question('📝 Description (optionnel): ');
                // Validation
                if (!code.trim()) {
                    console.log("❌ Le code de l'endpoint est requis");
                    return;
                }
                console.log("\n⏳ Création de l'endpoint...");
                // Créer l'endpoint
                const endpoint = new Endpoint_js_1.default()
                    .setMethod(method)
                    .setCode(code.trim().toUpperCase())
                    .setDescription(description.trim() || undefined);
                yield endpoint.save();
                console.log('\n✅ Endpoint créé avec succès!');
                console.log(`   - ID: ${endpoint.getId()}`);
                console.log(`   - Méthode: ${endpoint.getMethod()}`);
                console.log(`   - Code: ${endpoint.getCode()}`);
                console.log(`   - Description: ${endpoint.getDescription() || 'Aucune'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('unique') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log("   - Choisir un autre code d'endpoint");
                    console.log('   - Vérifier les endpoints existants (option 2)');
                }
            }
        });
    }
    /**
     * Lister tous les endpoints
     */
    listEndpoints() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des endpoints ===\n');
            try {
                const endpoints = yield Endpoint_js_1.default._list();
                if (!endpoints || endpoints.length === 0) {
                    console.log('📝 Aucun endpoint trouvé');
                    return;
                }
                console.log(`📊 ${endpoints.length} endpoint(s) trouvé(s):\n`);
                endpoints.forEach((endpoint, index) => {
                    const methodColor = this.getMethodColor(endpoint.getMethod());
                    console.log(`${index + 1}. ${methodColor} ${endpoint.getMethod()} ${endpoint.getCode()}`);
                    console.log(`   ID: ${endpoint.getId()}`);
                    console.log(`   Description: ${endpoint.getDescription() || 'Aucune'}`);
                    console.log('');
                });
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Modifier un endpoint
     */
    updateEndpoint() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'un endpoint ===\n");
            try {
                // Lister les endpoints d'abord
                const endpoints = yield Endpoint_js_1.default._list();
                if (!endpoints || endpoints.length === 0) {
                    console.log('📝 Aucun endpoint à modifier');
                    return;
                }
                // Afficher la liste
                console.log('Endpoints disponibles:');
                endpoints.forEach((endpoint, index) => {
                    console.log(`${index + 1}. ${endpoint.getMethod()} ${endpoint.getCode()} (ID: ${endpoint.getId()})`);
                });
                const choice = yield this.question("\nNuméro de l'endpoint à modifier: ");
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= endpoints.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const endpoint = endpoints[index];
                // Nouvelle méthode HTTP
                const availableMethods = Object.values(endpoint_db_js_1.HttpMethod);
                console.log('\nMéthodes HTTP disponibles:');
                availableMethods.forEach((method, index) => {
                    console.log(`${index + 1}. ${method}`);
                });
                const methodChoice = yield this.question(`Nouvelle méthode (actuelle: ${endpoint.getMethod()}, appuyez sur Entrée pour garder): `);
                if (methodChoice.trim()) {
                    const methodIndex = parseInt(methodChoice) - 1;
                    if (methodIndex >= 0 && methodIndex < availableMethods.length) {
                        endpoint.setMethod(availableMethods[methodIndex]);
                    }
                }
                // Nouveau code
                const newCode = yield this.question(`📝 Nouveau code (actuel: ${endpoint.getCode()}, appuyez sur Entrée pour garder): `);
                if (newCode.trim()) {
                    endpoint.setCode(newCode.trim().toUpperCase());
                }
                // Nouvelle description
                const newDescription = yield this.question(`📝 Nouvelle description (actuelle: ${endpoint.getDescription() || 'Aucune'}, appuyez sur Entrée pour garder): `);
                if (newDescription.trim()) {
                    endpoint.setDescription(newDescription.trim());
                }
                yield endpoint.save();
                console.log('\n✅ Endpoint modifié avec succès!');
                console.log(`   - Méthode: ${endpoint.getMethod()}`);
                console.log(`   - Code: ${endpoint.getCode()}`);
                console.log(`   - Description: ${endpoint.getDescription() || 'Aucune'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer un endpoint
     */
    deleteEndpoint() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'un endpoint ===\n");
            try {
                const endpoints = yield Endpoint_js_1.default._list();
                if (!endpoints || endpoints.length === 0) {
                    console.log('📝 Aucun endpoint à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Endpoints disponibles:');
                endpoints.forEach((endpoint, index) => {
                    console.log(`${index + 1}. ${endpoint.getMethod()} ${endpoint.getCode()} (ID: ${endpoint.getId()})`);
                });
                const choice = yield this.question("\nNuméro de l'endpoint à supprimer: ");
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= endpoints.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const endpoint = endpoints[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${endpoint.getMethod()} ${endpoint.getCode()}" ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield endpoint.delete();
                    if (success) {
                        console.log('\n✅ Endpoint supprimé avec succès');
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
                const sequelize = yield db_config_js_1.default.getInstance();
                yield sequelize.authenticate();
                const stats = db_initializer_js_1.TableInitializer.getStats();
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
            console.log('\n🛠️ === Gestionnaire des endpoints ===');
            console.log('1. Créer un nouveau endpoint');
            console.log('2. Lister tous les endpoints');
            console.log('3. Modifier un endpoint');
            console.log('4. Supprimer un endpoint');
            console.log('5. Tester la connexion DB');
            console.log('6. Quitter');
            const choice = yield this.question('\nVotre choix (1-6): ');
            switch (choice) {
                case '1':
                    yield this.createEndpoint();
                    break;
                case '2':
                    yield this.listEndpoints();
                    break;
                case '3':
                    yield this.updateEndpoint();
                    break;
                case '4':
                    yield this.deleteEndpoint();
                    break;
                case '5':
                    yield this.testConnection();
                    break;
                case '6':
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
                console.log('🚀 === Gestionnaire de endpoints API ===\n');
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
     * Retourne une couleur pour la méthode HTTP
     */
    getMethodColor(method) {
        switch (method) {
            case endpoint_db_js_1.HttpMethod.GET:
                return '🟢';
            case endpoint_db_js_1.HttpMethod.POST:
                return '🔵';
            case endpoint_db_js_1.HttpMethod.PUT:
                return '🟡';
            case endpoint_db_js_1.HttpMethod.DELETE:
                return '🔴';
            case endpoint_db_js_1.HttpMethod.PATCH:
                return '🟠';
            case endpoint_db_js_1.HttpMethod.OPTIONS:
                return '🟣';
            case endpoint_db_js_1.HttpMethod.HEAD:
                return '🟤';
            default:
                return '⚪';
        }
    }
    /**
     * Nettoyage des ressources
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.rl.close();
                db_initializer_js_1.TableInitializer.cleanup();
                yield db_config_js_1.default.close();
                console.log('🧹 Ressources nettoyées');
            }
            catch (error) {
                console.error('❌ Erreur lors du nettoyage:', error);
            }
        });
    }
}
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
// if (require.main === module) {
const manager = new EndpointManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
// }
