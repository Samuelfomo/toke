import * as readline from 'readline';

import Db from '../src/master/database/db.config.js';
import { TableInitializer } from '../src/master/database/db.initializer.js';
import Permission from '../src/master/class/Permission.js';
import ClientProfile from '../src/master/class/ClientProfile.js';
import Endpoint from '../src/master/class/Endpoint.js';

class PermissionManager {
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
   * Créer une nouvelle permission
   */
  async createPermission(): Promise<void> {
    console.log("📱 === Création d'une nouvelle permission ===\n");

    try {
      // 1. Récupérer la liste des profils disponibles
      const profils = await ClientProfile._list();
      if (!profils || profils.length === 0) {
        console.log("❌ Aucun profil trouvé. Créez d'abord un profil.");
        return;
      }

      // 2. Récupérer la liste des endpoints disponibles
      const endpoints = await Endpoint._list();
      if (!endpoints || endpoints.length === 0) {
        console.log("❌ Aucun endpoint trouvé. Créez d'abord un endpoint.");
        return;
      }

      // 3. Afficher les profils disponibles
      console.log('📋 Profils disponibles:');
      profils.forEach((profil, index) => {
        console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
      });

      const profilChoice = await this.question('\nNuméro du profil: ');
      const profilIndex = parseInt(profilChoice) - 1;

      if (profilIndex < 0 || profilIndex >= profils.length) {
        console.log('❌ Choix de profil invalide');
        return;
      }

      const selectedProfil = profils[profilIndex];

      // 4. Afficher les endpoints disponibles
      console.log('\n📋 Endpoints disponibles:');
      endpoints.forEach((endpoint, index) => {
        console.log(
          `${index + 1}. ${endpoint.getCode()} - ${endpoint.getMethod()} (ID: ${endpoint.getId()})`,
        );
      });

      const endpointChoice = await this.question("\nNuméro de l'endpoint: ");
      const endpointIndex = parseInt(endpointChoice) - 1;

      if (endpointIndex < 0 || endpointIndex >= endpoints.length) {
        console.log("❌ Choix d'endpoint invalide");
        return;
      }

      const selectedEndpoint = endpoints[endpointIndex];

      // 5. Demander la route
      const route = await this.question('🛣️ Route (ex: lexicon): ');

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
      const permission = new Permission()
        .setProfile(selectedProfil.getId()!)
        .setEndpoint(selectedEndpoint.getId()!)
        .setRoute(route.toUpperCase());

      await permission.save();

      console.log('\n✅ Permission créée avec succès!');
      console.log(`   - ID: ${permission.getId()}`);
      console.log(`   - Profil: ${selectedProfil.getName()}`);
      console.log(`   - Endpoint: ${selectedEndpoint.getCode()} (${selectedEndpoint.getMethod()})`);
      console.log(`   - Route: ${permission.getRoute()}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        console.log('\n💡 Solutions possibles:');
        console.log('   - Cette combinaison profil/endpoint/route existe déjà');
        console.log('   - Vérifier les permissions existantes (option 2)');
        console.log('   - Choisir une autre route pour ce profil/endpoint');
      }
    }
  }

  /**
   * Lister toutes les permissions
   */
  async listPermissions(): Promise<void> {
    console.log('\n📋 === Liste des permissions ===\n');

    try {
      const permissions = await Permission._list();

      if (!permissions || permissions.length === 0) {
        console.log('📝 Aucune permission trouvée');
        return;
      }

      console.log(`📊 ${permissions.length} permission(s) trouvée(s):\n`);

      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];
        const profil = await permission.getProfileObject();
        const endpoint = await permission.getEndpointObject();

        console.log(`${i + 1}. Permission ID: ${permission.getId()}`);
        console.log(
          `   👤 Profil: ${profil?.getName() || 'N/A'} (ID: ${profil?.getId() || 'N/A'})`,
        );
        console.log(
          `   🌐 Endpoint: ${endpoint?.getCode() || 'N/A'} - ${endpoint?.getMethod() || 'N/A'} (ID: ${endpoint?.getId() || 'N/A'})`,
        );
        console.log(`   🛣️ Route: ${permission.getRoute()}`);
        console.log('');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier une permission
   */
  async updatePermission(): Promise<void> {
    console.log("\n✏️ === Modification d'une permission ===\n");

    try {
      // 1. Lister les permissions existantes
      const permissions = await Permission._list();
      if (!permissions || permissions.length === 0) {
        console.log('📝 Aucune permission à modifier');
        return;
      }

      // 2. Afficher la liste des permissions
      console.log('Permissions disponibles:');
      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];
        const profil = await permission.getProfileObject();
        const endpoint = await permission.getEndpointObject();

        console.log(
          `${i + 1}. ${profil?.getName()} → ${endpoint?.getCode()} (${endpoint?.getMethod()}) → ${permission.getRoute()}`,
        );
      }

      const choice = await this.question('\nNuméro de la permission à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= permissions.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const permission = permissions[index];
      const currentProfil = await permission.getProfileObject();
      const currentEndpoint = await permission.getEndpointObject();

      console.log('\n=== Modification de la permission ===');
      console.log(`Profil actuel: ${currentProfil?.getName()}`);
      console.log(
        `Endpoint actuel: ${currentEndpoint?.getCode()} (${currentEndpoint?.getMethod()})`,
      );
      console.log(`Route actuelle: ${permission.getRoute()}`);

      // 3. Proposer de modifier le profil
      const changeProfile = await this.question('\n📝 Modifier le profil? (y/N): ');
      if (changeProfile.toLowerCase() === 'y') {
        const profils = await ClientProfile._list();
        if (profils && profils.length > 0) {
          console.log('\nProfils disponibles:');
          profils.forEach((profil, i) => {
            console.log(`${i + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
          });

          const profilChoice = await this.question('\nNuméro du nouveau profil: ');
          const profilIndex = parseInt(profilChoice) - 1;

          if (profilIndex >= 0 && profilIndex < profils.length) {
            permission.setProfile(profils[profilIndex].getId()!);
          } else {
            console.log("❌ Choix de profil invalide, conservation de l'ancien");
          }
        }
      }

      // 4. Proposer de modifier l'endpoint
      const changeEndpoint = await this.question("\n📝 Modifier l'endpoint? (y/N): ");
      if (changeEndpoint.toLowerCase() === 'y') {
        const endpoints = await Endpoint._list();
        if (endpoints && endpoints.length > 0) {
          console.log('\nEndpoints disponibles:');
          endpoints.forEach((endpoint, i) => {
            console.log(
              `${i + 1}. ${endpoint.getCode()} - ${endpoint.getMethod()} (ID: ${endpoint.getId()})`,
            );
          });

          const endpointChoice = await this.question('\nNuméro du nouvel endpoint: ');
          const endpointIndex = parseInt(endpointChoice) - 1;

          if (endpointIndex >= 0 && endpointIndex < endpoints.length) {
            permission.setEndpoint(endpoints[endpointIndex].getId()!);
          } else {
            console.log("❌ Choix d'endpoint invalide, conservation de l'ancien");
          }
        }
      }

      // 5. Proposer de modifier la route
      const newRoute = await this.question(
        `\n🛣️ Nouvelle route (actuelle: ${permission.getRoute()}): `,
      );
      if (newRoute.trim()) {
        if (newRoute.length < 2 || newRoute.length > 128) {
          console.log('❌ La route doit faire entre 2 et 128 caractères');
          return;
        }
        permission.setRoute(newRoute.toUpperCase());
      }

      // 6. Sauvegarder
      await permission.save();

      // 7. Afficher le résultat
      const updatedProfil = await permission.getProfileObject();
      const updatedEndpoint = await permission.getEndpointObject();

      console.log('\n✅ Permission modifiée avec succès!');
      console.log(`   - ID: ${permission.getId()}`);
      console.log(`   - Profil: ${updatedProfil?.getName()}`);
      console.log(`   - Endpoint: ${updatedEndpoint?.getCode()} (${updatedEndpoint?.getMethod()})`);
      console.log(`   - Route: ${permission.getRoute()}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer une permission
   */
  async deletePermission(): Promise<void> {
    console.log("\n🗑️ === Suppression d'une permission ===\n");

    try {
      const permissions = await Permission._list();
      if (!permissions || permissions.length === 0) {
        console.log('📝 Aucune permission à supprimer');
        return;
      }

      // Afficher la liste des permissions
      console.log('Permissions disponibles:');
      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];
        const profil = await permission.getProfileObject();
        const endpoint = await permission.getEndpointObject();

        console.log(
          `${i + 1}. ${profil?.getName()} → ${endpoint?.getCode()} (${endpoint?.getMethod()}) → ${permission.getRoute()}`,
        );
      }

      const choice = await this.question('\nNuméro de la permission à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= permissions.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const permission = permissions[index];
      const profil = await permission.getProfileObject();
      const endpoint = await permission.getEndpointObject();

      // Confirmation
      console.log(`\n⚠️ Vous allez supprimer la permission:`);
      console.log(`   - Profil: ${profil?.getName()}`);
      console.log(`   - Endpoint: ${endpoint?.getCode()} (${endpoint?.getMethod()})`);
      console.log(`   - Route: ${permission.getRoute()}`);

      const confirm = await this.question('\n⚠️ Confirmer la suppression? (oui/non): ');

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await permission.delete();

        if (success) {
          console.log('\n✅ Permission supprimée avec succès');
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
   * Lister les permissions par profil
   */
  async listPermissionsByProfil(): Promise<void> {
    console.log('\n📋 === Permissions par profil ===\n');

    try {
      const profils = await ClientProfile._list();
      if (!profils || profils.length === 0) {
        console.log('📝 Aucun profil trouvé');
        return;
      }

      // Afficher les profils disponibles
      console.log('Profils disponibles:');
      profils.forEach((profil, index) => {
        console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
      });

      const choice = await this.question('\nNuméro du profil: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= profils.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const selectedProfil = profils[index];
      const permissions = await Permission._list({ profil: selectedProfil.getId() });

      if (!permissions || permissions.length === 0) {
        console.log(`\n📝 Aucune permission trouvée pour le profil "${selectedProfil.getName()}"`);
        return;
      }

      console.log(`\n📊 ${permissions.length} permission(s) pour "${selectedProfil.getName()}":\n`);

      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];
        const endpoint = await permission.getEndpointObject();

        console.log(
          `${i + 1}. ${endpoint?.getCode()} (${endpoint?.getMethod()}) → ${permission.getRoute()}`,
        );
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
    console.log('\n🛠️ === Gestionnaire de Permissions ===');
    console.log('1. Créer une nouvelle permission');
    console.log('2. Lister toutes les permissions');
    console.log('3. Modifier une permission');
    console.log('4. Supprimer une permission');
    console.log('5. Lister les permissions par profil');
    console.log('6. Tester la connexion DB');
    console.log('7. Quitter');

    const choice = await this.question('\nVotre choix (1-7): ');

    switch (choice) {
      case '1':
        await this.createPermission();
        break;
      case '2':
        await this.listPermissions();
        break;
      case '3':
        await this.updatePermission();
        break;
      case '4':
        await this.deletePermission();
        break;
      case '5':
        await this.listPermissionsByProfil();
        break;
      case '6':
        await this.testConnection();
        break;
      case '7':
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
      console.log('🚀 === Gestionnaire de permissions API ===\n');
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
// if (require.main === module) {
const manager = new PermissionManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
// }
