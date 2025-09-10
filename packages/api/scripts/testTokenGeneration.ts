import { config } from 'dotenv';

import Db from '../src/license/database/db.config';
import { TableInitializer } from '../src/license/database/db.initializer';
import BaseModel from '../src/license/database/db.base';

config();

/**
 * Classe de test pour tester la génération de tokens
 */
class TokenTester extends BaseModel {
  constructor() {
    super();
  }

  /**
   * Test public des méthodes de génération
   */
  async testAllGenerators(): Promise<void> {
    console.log('🧪 === TEST DES GÉNÉRATEURS DE TOKENS ===\n');

    const tableName = 'xf_client'; // Table existante

    try {
      // Test 1: GUID Generator
      console.log('1️⃣ Test GUID Generator...');
      const guid = await this.guidGenerator(tableName, 6);
      console.log(`Résultat GUID: ${guid}\n`);

      // Test 2: Time-based Token Generator
      console.log('2️⃣ Test Time-based Token Generator...');
      const timeToken = await this.timeBasedTokenGenerator(tableName, 3, '-', 'TEST');
      console.log(`Résultat Time Token: ${timeToken}\n`);

      // Test 3: UUID Token Generator
      console.log('3️⃣ Test UUID Token Generator...');
      const uuidToken = await this.uuidTokenGenerator(tableName);
      console.log(`Résultat UUID Token: ${uuidToken}\n`);
    } catch (error: any) {
      console.error('❌ Erreur pendant les tests:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  /**
   * Test de TableInitializer
   */
  async testTableInitializer(): Promise<void> {
    console.log('🏗️ === DIAGNOSTIC TABLE INITIALIZER ===\n');

    console.log('TableInitializer.isInitialized():', TableInitializer.isInitialized());

    if (TableInitializer.isInitialized()) {
      console.log('Stats:', TableInitializer.getStats());

      try {
        const model = TableInitializer.getModel('xf_client');
        console.log('Modèle xf_client trouvé:', !!model);
        if (model) {
          console.log('Nom du modèle:', model.name);
          console.log('Table:', model.tableName);
        }
      } catch (error: any) {
        console.error('❌ Erreur accès modèle:', error.message);
      }
    }
    console.log('');
  }
}

/**
 * Fonction principale de test
 */
async function runTests(): Promise<void> {
  console.log('🚀 Démarrage des tests de génération de tokens...\n');

  try {
    // 1. Initialiser la DB
    console.log('📦 Initialisation base de données...');
    const sequelize = await Db.getInstance();
    console.log('✅ DB connectée\n');

    // 2. Initialiser les tables
    console.log('🗄️ Initialisation des tables...');
    await TableInitializer.initialize(sequelize);
    console.log('✅ Tables initialisées\n');

    // 3. Créer le testeur
    const tester = new TokenTester();

    // 4. Diagnostics (plus besoin d'init car on utilise Db.getInstance() directement)
    await tester.testTableInitializer();

    // 5. Tests des générateurs
    await tester.testAllGenerators();

    console.log('🎉 Tests terminés avec succès !');
  } catch (error: any) {
    console.error('💥 Erreur fatale dans les tests:', error.message);
    console.error('Stack complète:', error.stack);
  } finally {
    // Nettoyage
    await Db.close();
    console.log('🔌 Connexion fermée');
  }
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

export default TokenTester;
