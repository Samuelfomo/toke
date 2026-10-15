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
const dotenv_1 = require("dotenv");
const db_config_1 = __importDefault(require("../src/master/database/db.config"));
const db_initializer_1 = require("../src/master/database/db.initializer");
const db_base_1 = __importDefault(require("../src/master/database/db.base"));
(0, dotenv_1.config)();
/**
 * Classe de test pour tester la génération de tokens
 */
class TokenTester extends db_base_1.default {
    constructor() {
        super();
    }
    /**
     * Test public des méthodes de génération
     */
    testAllGenerators() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🧪 === TEST DES GÉNÉRATEURS DE TOKENS ===\n');
            const tableName = 'xf_client'; // Table existante
            try {
                // Test 1: GUID Generator
                console.log('1️⃣ Test GUID Generator...');
                const guid = yield this.guidGenerator(tableName, 6);
                console.log(`Résultat GUID: ${guid}\n`);
                // Test 2: Time-based Token Generator
                console.log('2️⃣ Test Time-based Token Generator...');
                const timeToken = yield this.timeBasedTokenGenerator(tableName, 3, '-', 'TEST');
                console.log(`Résultat Time Token: ${timeToken}\n`);
                // Test 3: UUID Token Generator
                console.log('3️⃣ Test UUID Token Generator...');
                const uuidToken = yield this.uuidTokenGenerator(tableName);
                console.log(`Résultat UUID Token: ${uuidToken}\n`);
            }
            catch (error) {
                console.error('❌ Erreur pendant les tests:', error.message);
                console.error('Stack:', error.stack);
            }
        });
    }
    /**
     * Test de TableInitializer
     */
    testTableInitializer() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🏗️ === DIAGNOSTIC TABLE INITIALIZER ===\n');
            console.log('TableInitializer.isInitialized():', db_initializer_1.TableInitializer.isInitialized());
            if (db_initializer_1.TableInitializer.isInitialized()) {
                console.log('Stats:', db_initializer_1.TableInitializer.getStats());
                try {
                    const model = db_initializer_1.TableInitializer.getModel('xf_client');
                    console.log('Modèle xf_client trouvé:', !!model);
                    if (model) {
                        console.log('Nom du modèle:', model.name);
                        console.log('Table:', model.tableName);
                    }
                }
                catch (error) {
                    console.error('❌ Erreur accès modèle:', error.message);
                }
            }
            console.log('');
        });
    }
}
/**
 * Fonction principale de test
 */
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Démarrage des tests de génération de tokens...\n');
        try {
            // 1. Initialiser la DB
            console.log('📦 Initialisation base de données...');
            const sequelize = yield db_config_1.default.getInstance();
            console.log('✅ DB connectée\n');
            // 2. Initialiser les tables
            console.log('🗄️ Initialisation des tables...');
            yield db_initializer_1.TableInitializer.initialize(sequelize);
            console.log('✅ Tables initialisées\n');
            // 3. Créer le testeur
            const tester = new TokenTester();
            // 4. Diagnostics (plus besoin d'init car on utilise Db.getInstance() directement)
            yield tester.testTableInitializer();
            // 5. Tests des générateurs
            yield tester.testAllGenerators();
            console.log('🎉 Tests terminés avec succès !');
        }
        catch (error) {
            console.error('💥 Erreur fatale dans les tests:', error.message);
            console.error('Stack complète:', error.stack);
        }
        finally {
            // Nettoyage
            yield db_config_1.default.close();
            console.log('🔌 Connexion fermée');
        }
    });
}
// Lancer les tests si ce fichier est exécuté directement
// if (require.main === module) {
runTests()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error('💀 Tests échoués:', error);
    process.exit(1);
});
// }
exports.default = TokenTester;
