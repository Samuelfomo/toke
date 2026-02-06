import * as readline from 'readline';

import AppConfig from '../src/master/class/AppConfig';
import Db from '../src/master/database/db.config';
import { TableInitializer } from '../src/master/database/db.initializer';

export class AppConfigManager {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Initialisation de la base de données
   */
  async init(): Promise<void> {
    try {
      console.log("⏳ Initialisation de l'application...");

      // 1. Connexion à la base de données
      const sequelize = await Db.getInstance();

      // 2. Initialiser les tables
      await TableInitializer.initialize(sequelize);

      console.log('✅ Application initialisée');
    } catch (error: any) {
      console.error('❌ Erreur initialisation:', error.message);
      throw error;
    }
  }

  /**
   * Créer une nouvelle configuration
   */
  async createAppConfig(): Promise<void> {
    console.log("⚙️ === Création d'une nouvelle configuration ===\n");

    try {
      const key = await this.question('📝 Clé de configuration (ex: API_URL): ');

      // Validation
      if (typeof key !== 'string' || !key.trim()) {
        console.log(`❌ Clé de configuration requise`);
        return;
      }

      const link = await this.question('🔗 Lien/Valeur de configuration: ');
      if (!link.trim()) {
        console.log(`❌ Lien/Valeur requis`);
        return;
      }

      const activeInput = await this.question('✅ Actif ? (o/n) [o]: ');
      const active = activeInput.toLowerCase() !== 'n';

      console.log('\n⏳ Création de la configuration...');

      // Créer la configuration
      const config = new AppConfig().setKey(key).setLink(link).setActive(active);

      await config.save();

      console.log('\n✅ Configuration créée avec succès!');
      console.log(`   - ID: ${config.getId()}`);
      console.log(`   - Clé: ${config.getKey()}`);
      console.log(`   - Lien: ${config.getLink()}`);
      console.log(`   - Actif: ${config.isActive() ? 'Oui' : 'Non'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log('   - Choisir une autre clé');
        console.log('   - Vérifier les configurations existantes (option 2)');
      }
    }
  }

  /**
   * Lister toutes les configurations
   */
  async listAppConfigs(): Promise<void> {
    console.log('\n📋 === Liste des configurations ===\n');

    try {
      const configs = await AppConfig._list();

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
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Lister les configurations par statut
   */
  async listAppConfigsByStatus(): Promise<void> {
    console.log('\n📋 === Liste des configurations par statut ===\n');

    try {
      const statusInput = await this.question('Statut (actif/inactif) [actif]: ');
      const status = statusInput.toLowerCase() !== 'inactif';

      const configs = await AppConfig._listByStatus(status);

      if (!configs || configs.length === 0) {
        console.log(`📝 Aucune configuration ${status ? 'active' : 'inactive'} trouvée`);
        return;
      }

      console.log(
        `📊 ${configs.length} configuration(s) ${status ? 'active(s)' : 'inactive(s)'} trouvée(s):\n`,
      );

      configs.forEach((config, index) => {
        const statusIcon = config.isActive() ? '🟢' : '🔴';
        console.log(`${index + 1}. ${statusIcon} ${config.getKey()}`);
        console.log(`   ID: ${config.getId()}`);
        console.log(`   Lien: ${config.getLink()}`);
        console.log('');
      });
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Charger une configuration par clé
   */
  async loadAppConfigByKey(): Promise<void> {
    console.log('\n🔍 === Charger une configuration par clé ===\n');

    try {
      const key = await this.question('📝 Clé de configuration: ');

      if (!key.trim()) {
        console.log('❌ Clé requise');
        return;
      }

      console.log('\n⏳ Chargement...');

      const config = await AppConfig._load(key, true);

      if (!config) {
        console.log(`\n❌ Configuration "${key}" non trouvée`);
        return;
      }

      console.log('\n✅ Configuration trouvée:');
      console.log(`   - ID: ${config.getId()}`);
      console.log(`   - Clé: ${config.getKey()}`);
      console.log(`   - Lien: ${config.getLink()}`);
      console.log(`   - Actif: ${config.isActive() ? 'Oui' : 'Non'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier une configuration
   */
  async updateAppConfig(): Promise<void> {
    console.log("\n✏️ === Modification d'une configuration ===\n");

    try {
      const configs = await AppConfig._list();
      if (!configs || configs.length === 0) {
        console.log('📝 Aucune configuration à modifier');
        return;
      }

      // Afficher la liste
      console.log('Configurations disponibles:');
      configs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.getKey()}`);
      });

      const choice = await this.question('\nNuméro de la configuration à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= configs.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const config = configs[index];

      // Modifications possibles
      const newKey = await this.question(`📝 Nouvelle clé (actuelle: ${config.getKey()}): `);
      const newLink = await this.question(`🔗 Nouveau lien (actuel: ${config.getLink()}): `);

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
        await config.save();
        console.log('\n✅ Configuration modifiée avec succès!');
      } else {
        console.log('\n⚠️ Aucune modification effectuée');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Changer le statut d'une configuration
   */
  async toggleAppConfigStatus(): Promise<void> {
    console.log('\n🔄 === Changement de statut ===\n');

    try {
      const configs = await AppConfig._list();
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

      const choice = await this.question('\nNuméro de la configuration: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= configs.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const config = configs[index];

      await config.patchStatus();

      const newStatus = config.isActive() ? 'actif' : 'inactif';
      console.log(`\n✅ Statut changé: configuration maintenant ${newStatus}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer une configuration
   */
  async deleteAppConfig(): Promise<void> {
    console.log("\n🗑️ === Suppression d'une configuration ===\n");

    try {
      const configs = await AppConfig._list();
      if (!configs || configs.length === 0) {
        console.log('📝 Aucune configuration à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Configurations disponibles:');
      configs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.getKey()}`);
      });

      const choice = await this.question('\nNuméro de la configuration à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= configs.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const config = configs[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${config.getKey()}" ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await config.delete();

        if (success) {
          console.log('\n✅ Configuration supprimée avec succès');
        } else {
          console.log('\n❌ Erreur lors de la suppression');
        }
      } else {
        console.log('\n⚠️ Suppression annulée');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Tester la connexion à la base de données
   */
  async testConnection(): Promise<void> {
    console.log('\n🔍 === Test de connexion ===\n');

    try {
      const sequelize = await Db.getInstance();
      await sequelize.authenticate();

      const stats = TableInitializer.getStats();

      console.log('✅ Connexion DB: OK');
      console.log(`📊 Tables initialisées: ${stats.initialized ? 'Oui' : 'Non'}`);
      console.log(`📋 Nombre de tables: ${stats.tableCount}`);
      console.log(`🏷️ Tables: ${stats.tableNames.join(', ')}`);
    } catch (error: any) {
      console.log(`❌ Erreur connexion: ${error.message}`);
    }
  }

  /**
   * Tester le JSON output
   */
  async testJSONOutput(): Promise<void> {
    console.log('\n📄 === Test sortie JSON ===\n');

    try {
      const configs = await AppConfig._list();

      if (!configs || configs.length === 0) {
        console.log('📝 Aucune configuration pour le test JSON');
        return;
      }

      console.log('Configurations disponibles:');
      configs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.getKey()}`);
      });

      const choice = await this.question('\nNuméro de la configuration: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= configs.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const config = configs[index];
      const json = config.toJSON();

      console.log('\n✅ Sortie JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Menu principal
   */
  async showMenu(): Promise<void> {
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

    const choice = await this.question('\nVotre choix (1-10): ');

    switch (choice) {
      case '1':
        await this.createAppConfig();
        break;
      case '2':
        await this.listAppConfigs();
        break;
      case '3':
        await this.listAppConfigsByStatus();
        break;
      case '4':
        await this.loadAppConfigByKey();
        break;
      case '5':
        await this.updateAppConfig();
        break;
      case '6':
        await this.toggleAppConfigStatus();
        break;
      case '7':
        await this.deleteAppConfig();
        break;
      case '8':
        await this.testConnection();
        break;
      case '9':
        await this.testJSONOutput();
        break;
      case '10':
        console.log('\n👋 Au revoir!');
        return;
      default:
        console.log('\n❌ Choix invalide');
    }

    await this.showMenu(); // Reboucle
  }

  /**
   * Démarrage du gestionnaire
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 === Gestionnaire de configurations applicatives ===\n');
      await this.init();
      await this.showMenu();
    } catch (error: any) {
      console.error('❌ Erreur fatale:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => resolve(answer.trim()));
    });
  }

  /**
   * Nettoyage des ressources
   */
  private async cleanup(): Promise<void> {
    try {
      this.rl.close();
      TableInitializer.cleanup();
      await Db.close();
      console.log('🧹 Ressources nettoyées');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt en cours...');
  process.exit(0);
});

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
