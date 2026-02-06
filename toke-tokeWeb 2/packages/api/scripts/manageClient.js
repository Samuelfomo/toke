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
exports.ClientManager = void 0;
const readline = __importStar(require("readline"));
const Client_js_1 = __importDefault(require("../src/master/class/Client.js"));
const db_config_js_1 = __importDefault(require("../src/master/database/db.config.js"));
const db_initializer_js_1 = require("../src/master/database/db.initializer.js");
const ClientProfile_js_1 = __importDefault(require("../src/master/class/ClientProfile.js"));
class ClientManager {
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
     * Créer un nouveau client
     */
    createClient() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log("📱 === Création d'un nouveau client ===\n");
            const profiles = yield ClientProfile_js_1.default._list();
            if (!profiles || profiles.length === 0) {
                console.log(`📝 Aucun profil n'a ete trouvé`);
                return;
            }
            // Afficher la liste
            console.log(`Profils disponibles:`);
            profiles.forEach((profil, index) => {
                console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
            });
            const choice = yield this.question('\nNuméro du profil du client à ajouter: ');
            const index = parseInt(choice) - 1;
            if (index < 0 || index >= profiles.length) {
                console.log('❌ Choix invalide');
                return;
            }
            const profil = profiles[index];
            try {
                const name = yield this.question("📝 Nom de l'application: ");
                const secret = yield this.question('🔐 Secret (min 8 caractères): ');
                // Validation
                if (!name.trim()) {
                    console.log('❌ Le nom est requis');
                    return;
                }
                if (secret.length < 8) {
                    console.log('❌ Le secret doit faire au moins 8 caractères');
                    return;
                }
                console.log('\n⏳ Création du client...', profil.getId());
                // Créer le client
                const client = new Client_js_1.default().setName(name).setSecret(secret).setProfil(profil.getId());
                yield client.save();
                const profilData = (_a = (yield client.getProfil())) === null || _a === void 0 ? void 0 : _a.getName();
                console.log('\n✅ Client créé avec succès!');
                console.log(`   - ID: ${client.getId()}`);
                console.log(`   - Nom: ${client.getName()}`);
                console.log(`   - Token: ${client.getToken()}`);
                console.log(`   - Profil: ${profilData}`);
                console.log(`   - Actif: ${client.isActive()}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('unique') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log("   - Choisir un autre nom d'application");
                    console.log('   - Vérifier les clients existants (option 2)');
                }
            }
        });
    }
    /**
     * Lister tous les clients
     */
    listClients() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des clients ===\n');
            try {
                const clients = yield Client_js_1.default._list();
                if (!clients || clients.length === 0) {
                    console.log('📝 Aucun client trouvé');
                    return;
                }
                console.log(`📊 ${clients.length} client(s) trouvé(s):\n`);
                const clientsWithProfiles = yield Promise.all(clients.map((client) => __awaiter(this, void 0, void 0, function* () {
                    const profil = yield client.getProfil();
                    return {
                        client,
                        profilName: (profil === null || profil === void 0 ? void 0 : profil.getName()) || 'Aucun profil',
                    };
                })));
                clientsWithProfiles.forEach((item, index) => {
                    const { client, profilName } = item;
                    const status = client.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${client.getName()}`);
                    console.log(`   ID: ${client.getId()}`);
                    console.log(`   Token: ${client.getToken()}`);
                    console.log(`   Profil: ${profilName}`);
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
     * Modifier un client
     */
    updateClient() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'un client ===\n");
            try {
                // Lister les clients d'abord
                const clients = yield Client_js_1.default._list();
                if (!clients || clients.length === 0) {
                    console.log('📝 Aucun client à modifier');
                    return;
                }
                // Afficher la liste
                console.log('Clients disponibles:');
                clients.forEach((client, index) => {
                    console.log(`${index + 1}. ${client.getName()} (ID: ${client.getId()})`);
                });
                const choice = yield this.question('\nNuméro du client à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= clients.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const client = clients[index];
                // Nouveaux nom
                const newName = yield this.question(`📝 Nouveau nom (actuel: ${client.getName()}): `);
                if (newName.trim()) {
                    client.setName(newName);
                    yield client.save();
                    console.log('\n✅ Client modifié avec succès!');
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
     * Changer le statut d'un client
     */
    toggleClientStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔄 === Changement de statut ===\n');
            try {
                const clients = yield Client_js_1.default._list();
                if (!clients || clients.length === 0) {
                    console.log('📝 Aucun client trouvé');
                    return;
                }
                // Afficher la liste avec statuts
                console.log('Clients disponibles:');
                clients.forEach((client, index) => {
                    const status = client.isActive() ? '🟢 Actif' : '🔴 Inactif';
                    console.log(`${index + 1}. ${client.getName()} - ${status}`);
                });
                const choice = yield this.question('\nNuméro du client: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= clients.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const client = clients[index];
                const oldStatus = client.isActive() ? 'actif' : 'inactif';
                yield client.patchStatus();
                const newStatus = client.isActive() ? 'actif' : 'inactif';
                console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer un client
     */
    deleteClient() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'un client ===\n");
            try {
                const clients = yield Client_js_1.default._list();
                if (!clients || clients.length === 0) {
                    console.log('📝 Aucun client à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Clients disponibles:');
                clients.forEach((client, index) => {
                    console.log(`${index + 1}. ${client.getName()} (ID: ${client.getId()})`);
                });
                const choice = yield this.question('\nNuméro du client à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= clients.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const client = clients[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${client.getName()}" ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield client.delete();
                    if (success) {
                        console.log('\n✅ Client supprimé avec succès');
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
            console.log('\n🛠️ === Gestionnaire de clients ===');
            console.log('1. Créer un nouveau client');
            console.log('2. Lister tous les clients');
            console.log('3. Modifier un client');
            console.log("4. Changer le statut d'un client");
            console.log('5. Supprimer un client');
            console.log('6. Tester la connexion DB');
            console.log('0. Retour au menu principal');
            const choice = yield this.question('\nVotre choix (1-7): ');
            switch (choice) {
                case '1':
                    yield this.createClient();
                    break;
                case '2':
                    yield this.listClients();
                    break;
                case '3':
                    yield this.updateClient();
                    break;
                case '4':
                    yield this.toggleClientStatus();
                    break;
                case '5':
                    yield this.deleteClient();
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
                console.log('🚀 === Gestionnaire de profils API ===\n');
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
exports.ClientManager = ClientManager;
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
const manager = new ClientManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
// }
