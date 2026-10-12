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
const Permission_js_1 = __importDefault(require("../src/master/class/Permission.js"));
const ClientProfile_js_1 = __importDefault(require("../src/master/class/ClientProfile.js"));
const Endpoint_js_1 = __importDefault(require("../src/master/class/Endpoint.js"));
class PermissionManager {
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
     * Créer une nouvelle permission
     */
    createPermission() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📱 === Création d'une nouvelle permission ===\n");
            try {
                // 1. Récupérer la liste des profils disponibles
                const profils = yield ClientProfile_js_1.default._list();
                if (!profils || profils.length === 0) {
                    console.log("❌ Aucun profil trouvé. Créez d'abord un profil.");
                    return;
                }
                // 2. Récupérer la liste des endpoints disponibles
                const endpoints = yield Endpoint_js_1.default._list();
                if (!endpoints || endpoints.length === 0) {
                    console.log("❌ Aucun endpoint trouvé. Créez d'abord un endpoint.");
                    return;
                }
                // 3. Afficher les profils disponibles
                console.log('📋 Profils disponibles:');
                profils.forEach((profil, index) => {
                    console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
                });
                const profilChoice = yield this.question('\nNuméro du profil: ');
                const profilIndex = parseInt(profilChoice) - 1;
                if (profilIndex < 0 || profilIndex >= profils.length) {
                    console.log('❌ Choix de profil invalide');
                    return;
                }
                const selectedProfil = profils[profilIndex];
                // 4. Afficher les endpoints disponibles
                console.log('\n📋 Endpoints disponibles:');
                endpoints.forEach((endpoint, index) => {
                    console.log(`${index + 1}. ${endpoint.getCode()} - ${endpoint.getMethod()} (ID: ${endpoint.getId()})`);
                });
                const endpointChoice = yield this.question("\nNuméro de l'endpoint: ");
                const endpointIndex = parseInt(endpointChoice) - 1;
                if (endpointIndex < 0 || endpointIndex >= endpoints.length) {
                    console.log("❌ Choix d'endpoint invalide");
                    return;
                }
                const selectedEndpoint = endpoints[endpointIndex];
                // 5. Demander la route
                const route = yield this.question('🛣️ Route (ex: lexicon): ');
                // Validation
                if (!route.trim()) {
                    console.log('❌ La route est requise');
                    return;
                }
                if (route.length < 2 || route.length > 128) {
                    console.log('❌ La route doit faire entre 2 et 128 caractères');
                    return;
                }
                console.log('\n⏳ Création de la permission...');
                // 6. Créer la permission
                const permission = new Permission_js_1.default()
                    .setProfile(selectedProfil.getId())
                    .setEndpoint(selectedEndpoint.getId())
                    .setRoute(route.toUpperCase());
                yield permission.save();
                console.log('\n✅ Permission créée avec succès!');
                console.log(`   - ID: ${permission.getId()}`);
                console.log(`   - Profil: ${selectedProfil.getName()}`);
                console.log(`   - Endpoint: ${selectedEndpoint.getCode()} (${selectedEndpoint.getMethod()})`);
                console.log(`   - Route: ${permission.getRoute()}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('unique') || error.message.includes('duplicate')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log('   - Cette combinaison profil/endpoint/route existe déjà');
                    console.log('   - Vérifier les permissions existantes (option 2)');
                    console.log('   - Choisir une autre route pour ce profil/endpoint');
                }
            }
        });
    }
    /**
     * Lister toutes les permissions
     */
    listPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des permissions ===\n');
            try {
                const permissions = yield Permission_js_1.default._list();
                if (!permissions || permissions.length === 0) {
                    console.log('📝 Aucune permission trouvée');
                    return;
                }
                console.log(`📊 ${permissions.length} permission(s) trouvée(s):\n`);
                for (let i = 0; i < permissions.length; i++) {
                    const permission = permissions[i];
                    const profil = yield permission.getProfileObject();
                    const endpoint = yield permission.getEndpointObject();
                    console.log(`${i + 1}. Permission ID: ${permission.getId()}`);
                    console.log(`   👤 Profil: ${(profil === null || profil === void 0 ? void 0 : profil.getName()) || 'N/A'} (ID: ${(profil === null || profil === void 0 ? void 0 : profil.getId()) || 'N/A'})`);
                    console.log(`   🌐 Endpoint: ${(endpoint === null || endpoint === void 0 ? void 0 : endpoint.getCode()) || 'N/A'} - ${(endpoint === null || endpoint === void 0 ? void 0 : endpoint.getMethod()) || 'N/A'} (ID: ${(endpoint === null || endpoint === void 0 ? void 0 : endpoint.getId()) || 'N/A'})`);
                    console.log(`   🛣️ Route: ${permission.getRoute()}`);
                    console.log('');
                }
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Modifier une permission
     */
    updatePermission() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'une permission ===\n");
            try {
                // 1. Lister les permissions existantes
                const permissions = yield Permission_js_1.default._list();
                if (!permissions || permissions.length === 0) {
                    console.log('📝 Aucune permission à modifier');
                    return;
                }
                // 2. Afficher la liste des permissions
                console.log('Permissions disponibles:');
                for (let i = 0; i < permissions.length; i++) {
                    const permission = permissions[i];
                    const profil = yield permission.getProfileObject();
                    const endpoint = yield permission.getEndpointObject();
                    console.log(`${i + 1}. ${profil === null || profil === void 0 ? void 0 : profil.getName()} → ${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getCode()} (${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getMethod()}) → ${permission.getRoute()}`);
                }
                const choice = yield this.question('\nNuméro de la permission à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= permissions.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const permission = permissions[index];
                const currentProfil = yield permission.getProfileObject();
                const currentEndpoint = yield permission.getEndpointObject();
                console.log('\n=== Modification de la permission ===');
                console.log(`Profil actuel: ${currentProfil === null || currentProfil === void 0 ? void 0 : currentProfil.getName()}`);
                console.log(`Endpoint actuel: ${currentEndpoint === null || currentEndpoint === void 0 ? void 0 : currentEndpoint.getCode()} (${currentEndpoint === null || currentEndpoint === void 0 ? void 0 : currentEndpoint.getMethod()})`);
                console.log(`Route actuelle: ${permission.getRoute()}`);
                // 3. Proposer de modifier le profil
                const changeProfile = yield this.question('\n📝 Modifier le profil? (y/N): ');
                if (changeProfile.toLowerCase() === 'y') {
                    const profils = yield ClientProfile_js_1.default._list();
                    if (profils && profils.length > 0) {
                        console.log('\nProfils disponibles:');
                        profils.forEach((profil, i) => {
                            console.log(`${i + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
                        });
                        const profilChoice = yield this.question('\nNuméro du nouveau profil: ');
                        const profilIndex = parseInt(profilChoice) - 1;
                        if (profilIndex >= 0 && profilIndex < profils.length) {
                            permission.setProfile(profils[profilIndex].getId());
                        }
                        else {
                            console.log("❌ Choix de profil invalide, conservation de l'ancien");
                        }
                    }
                }
                // 4. Proposer de modifier l'endpoint
                const changeEndpoint = yield this.question("\n📝 Modifier l'endpoint? (y/N): ");
                if (changeEndpoint.toLowerCase() === 'y') {
                    const endpoints = yield Endpoint_js_1.default._list();
                    if (endpoints && endpoints.length > 0) {
                        console.log('\nEndpoints disponibles:');
                        endpoints.forEach((endpoint, i) => {
                            console.log(`${i + 1}. ${endpoint.getCode()} - ${endpoint.getMethod()} (ID: ${endpoint.getId()})`);
                        });
                        const endpointChoice = yield this.question('\nNuméro du nouvel endpoint: ');
                        const endpointIndex = parseInt(endpointChoice) - 1;
                        if (endpointIndex >= 0 && endpointIndex < endpoints.length) {
                            permission.setEndpoint(endpoints[endpointIndex].getId());
                        }
                        else {
                            console.log("❌ Choix d'endpoint invalide, conservation de l'ancien");
                        }
                    }
                }
                // 5. Proposer de modifier la route
                const newRoute = yield this.question(`\n🛣️ Nouvelle route (actuelle: ${permission.getRoute()}): `);
                if (newRoute.trim()) {
                    if (newRoute.length < 2 || newRoute.length > 128) {
                        console.log('❌ La route doit faire entre 2 et 128 caractères');
                        return;
                    }
                    permission.setRoute(newRoute.toUpperCase());
                }
                // 6. Sauvegarder
                yield permission.save();
                // 7. Afficher le résultat
                const updatedProfil = yield permission.getProfileObject();
                const updatedEndpoint = yield permission.getEndpointObject();
                console.log('\n✅ Permission modifiée avec succès!');
                console.log(`   - ID: ${permission.getId()}`);
                console.log(`   - Profil: ${updatedProfil === null || updatedProfil === void 0 ? void 0 : updatedProfil.getName()}`);
                console.log(`   - Endpoint: ${updatedEndpoint === null || updatedEndpoint === void 0 ? void 0 : updatedEndpoint.getCode()} (${updatedEndpoint === null || updatedEndpoint === void 0 ? void 0 : updatedEndpoint.getMethod()})`);
                console.log(`   - Route: ${permission.getRoute()}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer une permission
     */
    deletePermission() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'une permission ===\n");
            try {
                const permissions = yield Permission_js_1.default._list();
                if (!permissions || permissions.length === 0) {
                    console.log('📝 Aucune permission à supprimer');
                    return;
                }
                // Afficher la liste des permissions
                console.log('Permissions disponibles:');
                for (let i = 0; i < permissions.length; i++) {
                    const permission = permissions[i];
                    const profil = yield permission.getProfileObject();
                    const endpoint = yield permission.getEndpointObject();
                    console.log(`${i + 1}. ${profil === null || profil === void 0 ? void 0 : profil.getName()} → ${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getCode()} (${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getMethod()}) → ${permission.getRoute()}`);
                }
                const choice = yield this.question('\nNuméro de la permission à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= permissions.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const permission = permissions[index];
                const profil = yield permission.getProfileObject();
                const endpoint = yield permission.getEndpointObject();
                // Confirmation
                console.log(`\n⚠️ Vous allez supprimer la permission:`);
                console.log(`   - Profil: ${profil === null || profil === void 0 ? void 0 : profil.getName()}`);
                console.log(`   - Endpoint: ${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getCode()} (${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getMethod()})`);
                console.log(`   - Route: ${permission.getRoute()}`);
                const confirm = yield this.question('\n⚠️ Confirmer la suppression? (oui/non): ');
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield permission.delete();
                    if (success) {
                        console.log('\n✅ Permission supprimée avec succès');
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
     * Lister les permissions par profil
     */
    listPermissionsByProfil() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Permissions par profil ===\n');
            try {
                const profils = yield ClientProfile_js_1.default._list();
                if (!profils || profils.length === 0) {
                    console.log('📝 Aucun profil trouvé');
                    return;
                }
                // Afficher les profils disponibles
                console.log('Profils disponibles:');
                profils.forEach((profil, index) => {
                    console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
                });
                const choice = yield this.question('\nNuméro du profil: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= profils.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const selectedProfil = profils[index];
                const permissions = yield Permission_js_1.default._list({ profil: selectedProfil.getId() });
                if (!permissions || permissions.length === 0) {
                    console.log(`\n📝 Aucune permission trouvée pour le profil "${selectedProfil.getName()}"`);
                    return;
                }
                console.log(`\n📊 ${permissions.length} permission(s) pour "${selectedProfil.getName()}":\n`);
                for (let i = 0; i < permissions.length; i++) {
                    const permission = permissions[i];
                    const endpoint = yield permission.getEndpointObject();
                    console.log(`${i + 1}. ${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getCode()} (${endpoint === null || endpoint === void 0 ? void 0 : endpoint.getMethod()}) → ${permission.getRoute()}`);
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
            console.log('\n🛠️ === Gestionnaire de Permissions ===');
            console.log('1. Créer une nouvelle permission');
            console.log('2. Lister toutes les permissions');
            console.log('3. Modifier une permission');
            console.log('4. Supprimer une permission');
            console.log('5. Lister les permissions par profil');
            console.log('6. Tester la connexion DB');
            console.log('7. Quitter');
            const choice = yield this.question('\nVotre choix (1-7): ');
            switch (choice) {
                case '1':
                    yield this.createPermission();
                    break;
                case '2':
                    yield this.listPermissions();
                    break;
                case '3':
                    yield this.updatePermission();
                    break;
                case '4':
                    yield this.deletePermission();
                    break;
                case '5':
                    yield this.listPermissionsByProfil();
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
                console.log('🚀 === Gestionnaire de permissions API ===\n');
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
const manager = new PermissionManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
// }
