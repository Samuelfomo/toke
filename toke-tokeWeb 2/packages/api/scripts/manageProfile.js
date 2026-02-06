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
const ClientProfile_js_1 = __importDefault(require("../src/master/class/ClientProfile.js"));
class ProfilManager {
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
     * Créer un nouveau profil
     */
    createProfil() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📱 === Création d'un nouveau profil ===\n");
            try {
                // Vérifier s'il y a déjà un profil admin
                const existingAdmin = yield new ClientProfile_js_1.default().getExitAdmin();
                const name = yield this.question('📝 Nom du profil: ');
                const description = yield this.question('⿳Avez-vous une description? (min 10 caractères): ');
                // Demander le type de profil seulement si pas d'admin existant
                let isRoot = false;
                if (!existingAdmin) {
                    const makeAdmin = yield this.question('👑 Faire de ce profil un admin système? (y/N): ');
                    isRoot = makeAdmin.toLowerCase() === 'y';
                }
                // Validation
                if (!name.trim()) {
                    console.log('❌ Le nom est requis');
                    return;
                }
                if (description && description.length < 10) {
                    console.log('❌ La description doit faire au moins 10 caractères');
                    return;
                }
                console.log('\n⏳ Création du profil...');
                // Créer le profil
                const profil = new ClientProfile_js_1.default().setName(name).setDescription(description).setRoot(isRoot);
                yield profil.save();
                console.log('\n✅ ClientProfile créé avec succès!');
                console.log(`   - ID: ${profil.getId()}`);
                console.log(`   - Nom: ${profil.getName()}`);
                console.log(`   - Description: ${profil.getDescription()}`);
                console.log(`   - Admin: ${profil.isRoot()}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
                if (error.message.includes('unique') || error.message.includes('existe déjà')) {
                    console.log('\n💡 Solutions possibles:');
                    console.log('   - Choisir un autre nom de profil');
                    console.log('   - Vérifier les profils existants (option 2)');
                }
            }
        });
    }
    /**
     * Lister tous les profils
     */
    listProfiles() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des profils ===\n');
            try {
                const profiles = yield ClientProfile_js_1.default._list();
                if (!profiles || profiles.length === 0) {
                    console.log('📝 Aucun profil trouvé');
                    return;
                }
                console.log(`📊 ${profiles.length} profil(s) trouvé(s):\n`);
                profiles.forEach((profil, index) => {
                    const status = profil.isRoot() ? '🟢 True' : '🔴 False';
                    console.log(`${index + 1}. ${profil.getName()}`);
                    console.log(`   ID: ${profil.getId()}`);
                    console.log(`   Description: ${profil.getDescription()}`);
                    console.log(`   Root: ${status}`);
                    console.log('');
                });
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Modifier un profil
     */
    updateProfil() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n✏️ === Modification d'un profil ===\n");
            try {
                // Lister les clients d'abord
                const profiles = yield ClientProfile_js_1.default._list();
                if (!profiles || profiles.length === 0) {
                    console.log('📝 Aucun profil à modifier');
                    return;
                }
                // Afficher la liste
                console.log('profils disponibles:');
                profiles.forEach((profil, index) => {
                    console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
                });
                const choice = yield this.question('\nNuméro du profil à modifier: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= profiles.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const profil = profiles[index];
                // Nouveau nom
                const newName = yield this.question(`📝 Nouveau nom (actuel: ${profil.getName()}): `);
                // Nouvelle description
                const newDescription = yield this.question(`📝 Nouvelle description : Facultatif (actuel: ${profil.getDescription()}): `);
                // Gestion du statut admin
                if (!profil.isRoot()) {
                    // Si le profil n'est pas admin, on peut proposer de le rendre admin
                    const hasAdmin = yield new ClientProfile_js_1.default().getExitAdmin();
                    if (!hasAdmin) {
                        const makeAdmin = yield this.question('👑 Faire de ce profil un admin système? (y/N): ');
                        if (makeAdmin.toLowerCase() === 'y') {
                            profil.setRoot(true);
                        }
                    }
                }
                else {
                    // Si le profil est admin, on peut proposer de retirer le statut admin
                    const removeAdmin = yield this.question('⚠️ Retirer le statut admin de ce profil? (y/N): ');
                    if (removeAdmin.toLowerCase() === 'y') {
                        profil.setRoot(false);
                    }
                }
                if (newName.trim()) {
                    profil.setName(newName.trim());
                }
                if (newDescription.trim()) {
                    if (newDescription.length < 10) {
                        console.log('❌ La description doit faire au moins 10 caractères');
                        return;
                    }
                    profil.setDescription(newDescription);
                }
                yield profil.save();
                console.log('\n✅ ClientProfile modifié avec succès!');
                console.log(`   - Nom: ${profil.getName()}`);
                console.log(`   - Description: ${profil.getDescription()}`);
                console.log(`   - Admin: ${profil.isRoot() ? '👑 Oui' : '👤 Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Supprimer un profil
     */
    deleteProfil() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("\n🗑️ === Suppression d'un profil ===\n");
            try {
                const profiles = yield ClientProfile_js_1.default._list();
                if (!profiles || profiles.length === 0) {
                    console.log('📝 Aucun profil à supprimer');
                    return;
                }
                // Afficher la liste
                console.log('Profils disponibles:');
                profiles.forEach((profil, index) => {
                    console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
                });
                const choice = yield this.question('\nNuméro du profil à supprimer: ');
                const index = parseInt(choice) - 1;
                if (index < 0 || index >= profiles.length) {
                    console.log('❌ Choix invalide');
                    return;
                }
                const profil = profiles[index];
                // Confirmation
                const confirm = yield this.question(`⚠️ Confirmer la suppression de "${profil.getName()}" ? (oui/non): `);
                if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
                    const success = yield profil.delete();
                    if (success) {
                        console.log('\n✅ ClientProfile supprimé avec succès');
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
            console.log('\n🛠️ === Gestionnaire de Profils ===');
            console.log('1. Créer un nouveau profil');
            console.log('2. Lister tous les profils');
            console.log('3. Modifier un profil');
            console.log('4. Supprimer un profil');
            console.log('5. Tester la connexion DB');
            console.log('6. Quitter');
            const choice = yield this.question('\nVotre choix (1-6): ');
            switch (choice) {
                case '1':
                    yield this.createProfil();
                    break;
                case '2':
                    yield this.listProfiles();
                    break;
                case '3':
                    yield this.updateProfil();
                    break;
                case '4':
                    yield this.deleteProfil();
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
const manager = new ProfilManager();
manager.start().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
// }
