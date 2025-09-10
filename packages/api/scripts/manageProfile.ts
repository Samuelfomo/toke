import * as readline from 'readline';

import Db from '../src/license/database/db.config.js';
import { TableInitializer } from '../src/license/database/db.initializer.js';
import ClientProfil from '../src/license/class/ClientProfil.js';

class ProfilManager {
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
   * Créer un nouveau profil
   */
  async createProfil(): Promise<void> {
    console.log("📱 === Création d'un nouveau profil ===\n");

    try {
      // Vérifier s'il y a déjà un profil admin
      const existingAdmin = await new ClientProfil().getExitAdmin();

      const name = await this.question('📝 Nom du profil: ');
      const description = await this.question('⿳Avez-vous une description? (min 10 caractères): ');

      // Demander le type de profil seulement si pas d'admin existant
      let isRoot = false;
      if (!existingAdmin) {
        const makeAdmin = await this.question('👑 Faire de ce profil un admin système? (y/N): ');
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
      const profil = new ClientProfil().setName(name).setDescription(description).setRoot(isRoot);
      await profil.save();

      console.log('\n✅ ClientProfil créé avec succès!');
      console.log(`   - ID: ${profil.getId()}`);
      console.log(`   - Nom: ${profil.getName()}`);
      console.log(`   - Description: ${profil.getDescription()}`);
      console.log(`   - Admin: ${profil.isRoot()}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('unique') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log('   - Choisir un autre nom de profil');
        console.log('   - Vérifier les profils existants (option 2)');
      }
    }
  }

  /**
   * Lister tous les profils
   */
  async listProfiles(): Promise<void> {
    console.log('\n📋 === Liste des profils ===\n');

    try {
      const profiles = await ClientProfil._list();

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
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier un profil
   */
  async updateProfil(): Promise<void> {
    console.log("\n✏️ === Modification d'un profil ===\n");

    try {
      // Lister les clients d'abord
      const profiles = await ClientProfil._list();
      if (!profiles || profiles.length === 0) {
        console.log('📝 Aucun profil à modifier');
        return;
      }

      // Afficher la liste
      console.log('profils disponibles:');
      profiles.forEach((profil, index) => {
        console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
      });

      const choice = await this.question('\nNuméro du profil à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= profiles.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const profil = profiles[index];

      // Nouveau nom
      const newName = await this.question(`📝 Nouveau nom (actuel: ${profil.getName()}): `);
      // Nouvelle description
      const newDescription = await this.question(
        `📝 Nouvelle description : Facultatif (actuel: ${profil.getDescription()}): `,
      );

      // Gestion du statut admin
      if (!profil.isRoot()) {
        // Si le profil n'est pas admin, on peut proposer de le rendre admin
        const hasAdmin = await new ClientProfil().getExitAdmin();
        if (!hasAdmin) {
          const makeAdmin = await this.question('👑 Faire de ce profil un admin système? (y/N): ');
          if (makeAdmin.toLowerCase() === 'y') {
            profil.setRoot(true);
          }
        }
      } else {
        // Si le profil est admin, on peut proposer de retirer le statut admin
        const removeAdmin = await this.question('⚠️ Retirer le statut admin de ce profil? (y/N): ');
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
      await profil.save();
      console.log('\n✅ ClientProfil modifié avec succès!');
      console.log(`   - Nom: ${profil.getName()}`);
      console.log(`   - Description: ${profil.getDescription()}`);
      console.log(`   - Admin: ${profil.isRoot() ? '👑 Oui' : '👤 Non'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer un profil
   */
  async deleteProfil(): Promise<void> {
    console.log("\n🗑️ === Suppression d'un profil ===\n");

    try {
      const profiles = await ClientProfil._list();
      if (!profiles || profiles.length === 0) {
        console.log('📝 Aucun profil à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Profils disponibles:');
      profiles.forEach((profil, index) => {
        console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
      });

      const choice = await this.question('\nNuméro du profil à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= profiles.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const profil = profiles[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${profil.getName()}" ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await profil.delete();

        if (success) {
          console.log('\n✅ ClientProfil supprimé avec succès');
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
    console.log('\n🛠️ === Gestionnaire de Profils ===');
    console.log('1. Créer un nouveau profil');
    console.log('2. Lister tous les profils');
    console.log('3. Modifier un profil');
    console.log('4. Supprimer un profil');
    console.log('5. Tester la connexion DB');
    console.log('6. Quitter');

    const choice = await this.question('\nVotre choix (1-6): ');

    switch (choice) {
      case '1':
        await this.createProfil();
        break;
      case '2':
        await this.listProfiles();
        break;
      case '3':
        await this.updateProfil();
        break;
      case '4':
        await this.deleteProfil();
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
      console.log('🚀 === Gestionnaire de profils API ===\n');
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
const manager = new ProfilManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
// }
