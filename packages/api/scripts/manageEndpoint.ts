import * as readline from 'readline';

import Db from '../src/master/database/db.config.js';
import { TableInitializer } from '../src/master/database/db.initializer.js';
import Endpoint from '../src/master/class/Endpoint.js';
import { HttpMethod } from '../src/master/database/data/endpoint.db.js';

class EndpointManager {
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
   * Créer un nouveau endpoint
   */
  async createEndpoint(): Promise<void> {
    console.log("📱 === Création d'un nouveau endpoint ===\n");

    try {
      // Afficher les méthodes HTTP disponibles
      const availableMethods = Object.values(HttpMethod);
      console.log('Méthodes HTTP disponibles:');
      availableMethods.forEach((method, index) => {
        console.log(`${index + 1}. ${method}`);
      });

      const methodChoice = await this.question(
        `\nChoisissez une méthode (1-${availableMethods.length}): `,
      );
      const methodIndex = parseInt(methodChoice) - 1;

      if (methodIndex < 0 || methodIndex >= availableMethods.length) {
        console.log('❌ Choix de méthode invalide');
        return;
      }

      const method = availableMethods[methodIndex];
      const code = await this.question("📝 Code de l'endpoint (ex: /api/users): ");
      const description = await this.question('📝 Description (optionnel): ');

      // Validation
      if (!code.trim()) {
        console.log("❌ Le code de l'endpoint est requis");
        return;
      }

      console.log("\n⏳ Création de l'endpoint...");

      // Créer l'endpoint
      const endpoint = new Endpoint()
        .setMethod(method)
        .setCode(code.trim().toUpperCase())
        .setDescription(description.trim() || undefined);

      await endpoint.save();

      console.log('\n✅ Endpoint créé avec succès!');
      console.log(`   - ID: ${endpoint.getId()}`);
      console.log(`   - Méthode: ${endpoint.getMethod()}`);
      console.log(`   - Code: ${endpoint.getCode()}`);
      console.log(`   - Description: ${endpoint.getDescription() || 'Aucune'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('unique') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log("   - Choisir un autre code d'endpoint");
        console.log('   - Vérifier les endpoints existants (option 2)');
      }
    }
  }

  /**
   * Lister tous les endpoints
   */
  async listEndpoints(): Promise<void> {
    console.log('\n📋 === Liste des endpoints ===\n');

    try {
      const endpoints = await Endpoint._list();

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
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier un endpoint
   */
  async updateEndpoint(): Promise<void> {
    console.log("\n✏️ === Modification d'un endpoint ===\n");

    try {
      // Lister les endpoints d'abord
      const endpoints = await Endpoint._list();
      if (!endpoints || endpoints.length === 0) {
        console.log('📝 Aucun endpoint à modifier');
        return;
      }

      // Afficher la liste
      console.log('Endpoints disponibles:');
      endpoints.forEach((endpoint, index) => {
        console.log(
          `${index + 1}. ${endpoint.getMethod()} ${endpoint.getCode()} (ID: ${endpoint.getId()})`,
        );
      });

      const choice = await this.question("\nNuméro de l'endpoint à modifier: ");
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= endpoints.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const endpoint = endpoints[index];

      // Nouvelle méthode HTTP
      const availableMethods = Object.values(HttpMethod);
      console.log('\nMéthodes HTTP disponibles:');
      availableMethods.forEach((method, index) => {
        console.log(`${index + 1}. ${method}`);
      });

      const methodChoice = await this.question(
        `Nouvelle méthode (actuelle: ${endpoint.getMethod()}, appuyez sur Entrée pour garder): `,
      );

      if (methodChoice.trim()) {
        const methodIndex = parseInt(methodChoice) - 1;
        if (methodIndex >= 0 && methodIndex < availableMethods.length) {
          endpoint.setMethod(availableMethods[methodIndex]);
        }
      }

      // Nouveau code
      const newCode = await this.question(
        `📝 Nouveau code (actuel: ${endpoint.getCode()}, appuyez sur Entrée pour garder): `,
      );

      if (newCode.trim()) {
        endpoint.setCode(newCode.trim().toUpperCase());
      }

      // Nouvelle description
      const newDescription = await this.question(
        `📝 Nouvelle description (actuelle: ${endpoint.getDescription() || 'Aucune'}, appuyez sur Entrée pour garder): `,
      );

      if (newDescription.trim()) {
        endpoint.setDescription(newDescription.trim());
      }

      await endpoint.save();
      console.log('\n✅ Endpoint modifié avec succès!');
      console.log(`   - Méthode: ${endpoint.getMethod()}`);
      console.log(`   - Code: ${endpoint.getCode()}`);
      console.log(`   - Description: ${endpoint.getDescription() || 'Aucune'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer un endpoint
   */
  async deleteEndpoint(): Promise<void> {
    console.log("\n🗑️ === Suppression d'un endpoint ===\n");

    try {
      const endpoints = await Endpoint._list();
      if (!endpoints || endpoints.length === 0) {
        console.log('📝 Aucun endpoint à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Endpoints disponibles:');
      endpoints.forEach((endpoint, index) => {
        console.log(
          `${index + 1}. ${endpoint.getMethod()} ${endpoint.getCode()} (ID: ${endpoint.getId()})`,
        );
      });

      const choice = await this.question("\nNuméro de l'endpoint à supprimer: ");
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= endpoints.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const endpoint = endpoints[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${endpoint.getMethod()} ${endpoint.getCode()}" ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await endpoint.delete();

        if (success) {
          console.log('\n✅ Endpoint supprimé avec succès');
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
   * Menu principal
   */
  async showMenu(): Promise<void> {
    console.log('\n🛠️ === Gestionnaire des endpoints ===');
    console.log('1. Créer un nouveau endpoint');
    console.log('2. Lister tous les endpoints');
    console.log('3. Modifier un endpoint');
    console.log('4. Supprimer un endpoint');
    console.log('5. Tester la connexion DB');
    console.log('6. Quitter');

    const choice = await this.question('\nVotre choix (1-6): ');

    switch (choice) {
      case '1':
        await this.createEndpoint();
        break;
      case '2':
        await this.listEndpoints();
        break;
      case '3':
        await this.updateEndpoint();
        break;
      case '4':
        await this.deleteEndpoint();
        break;
      case '5':
        await this.testConnection();
        break;
      case '6':
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
      console.log('🚀 === Gestionnaire de endpoints API ===\n');
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
   * Retourne une couleur pour la méthode HTTP
   */
  private getMethodColor(method: HttpMethod | undefined): string {
    switch (method) {
      case HttpMethod.GET:
        return '🟢';
      case HttpMethod.POST:
        return '🔵';
      case HttpMethod.PUT:
        return '🟡';
      case HttpMethod.DELETE:
        return '🔴';
      case HttpMethod.PATCH:
        return '🟠';
      case HttpMethod.OPTIONS:
        return '🟣';
      case HttpMethod.HEAD:
        return '🟤';
      default:
        return '⚪';
    }
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
// if (require.main === module) {
const manager = new EndpointManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
// }
