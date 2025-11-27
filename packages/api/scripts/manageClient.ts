import * as readline from 'readline';

import Client from '../src/master/class/Client.js';
import Db from '../src/master/database/db.config.js';
import { TableInitializer } from '../src/master/database/db.initializer.js';
import ClientProfile from '../src/master/class/ClientProfile.js';

export class ClientManager {
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
   * Créer un nouveau client
   */
  async createClient(): Promise<void> {
    console.log("📱 === Création d'un nouveau client ===\n");

    const profiles = await ClientProfile._list();
    if (!profiles || profiles.length === 0) {
      console.log(`📝 Aucun profil n'a ete trouvé`);
      return;
    }
    // Afficher la liste
    console.log(`Profils disponibles:`);
    profiles.forEach((profil, index) => {
      console.log(`${index + 1}. ${profil.getName()} (ID: ${profil.getId()})`);
    });
    const choice = await this.question('\nNuméro du profil du client à ajouter: ');
    const index = parseInt(choice) - 1;
    if (index < 0 || index >= profiles.length) {
      console.log('❌ Choix invalide');
      return;
    }
    const profil = profiles[index];

    try {
      const name = await this.question("📝 Nom de l'application: ");
      const secret = await this.question('🔐 Secret (min 8 caractères): ');

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
      const client = new Client().setName(name).setSecret(secret).setProfil(profil.getId()!);
      await client.save();
      const profilData = (await client.getProfil())?.getName();
      console.log('\n✅ Client créé avec succès!');
      console.log(`   - ID: ${client.getId()}`);
      console.log(`   - Nom: ${client.getName()}`);
      console.log(`   - Token: ${client.getToken()}`);
      console.log(`   - Profil: ${profilData}`);
      console.log(`   - Actif: ${client.isActive()}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('unique') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log("   - Choisir un autre nom d'application");
        console.log('   - Vérifier les clients existants (option 2)');
      }
    }
  }

  /**
   * Lister tous les clients
   */
  async listClients(): Promise<void> {
    console.log('\n📋 === Liste des clients ===\n');

    try {
      const clients = await Client._list();

      if (!clients || clients.length === 0) {
        console.log('📝 Aucun client trouvé');
        return;
      }

      console.log(`📊 ${clients.length} client(s) trouvé(s):\n`);

      const clientsWithProfiles = await Promise.all(
        clients.map(async (client) => {
          const profil = await client.getProfil();
          return {
            client,
            profilName: profil?.getName() || 'Aucun profil',
          };
        }),
      );

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
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier un client
   */
  async updateClient(): Promise<void> {
    console.log("\n✏️ === Modification d'un client ===\n");

    try {
      // Lister les clients d'abord
      const clients = await Client._list();
      if (!clients || clients.length === 0) {
        console.log('📝 Aucun client à modifier');
        return;
      }

      // Afficher la liste
      console.log('Clients disponibles:');
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.getName()} (ID: ${client.getId()})`);
      });

      const choice = await this.question('\nNuméro du client à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= clients.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const client = clients[index];

      // Nouveaux nom
      const newName = await this.question(`📝 Nouveau nom (actuel: ${client.getName()}): `);

      if (newName.trim()) {
        client.setName(newName);
        await client.save();
        console.log('\n✅ Client modifié avec succès!');
      } else {
        console.log('\n⚠️ Aucune modification effectuée');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Changer le statut d'un client
   */
  async toggleClientStatus(): Promise<void> {
    console.log('\n🔄 === Changement de statut ===\n');

    try {
      const clients = await Client._list();
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

      const choice = await this.question('\nNuméro du client: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= clients.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const client = clients[index];
      const oldStatus = client.isActive() ? 'actif' : 'inactif';

      await client.patchStatus();

      const newStatus = client.isActive() ? 'actif' : 'inactif';
      console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer un client
   */
  async deleteClient(): Promise<void> {
    console.log("\n🗑️ === Suppression d'un client ===\n");

    try {
      const clients = await Client._list();
      if (!clients || clients.length === 0) {
        console.log('📝 Aucun client à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Clients disponibles:');
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.getName()} (ID: ${client.getId()})`);
      });

      const choice = await this.question('\nNuméro du client à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= clients.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const client = clients[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${client.getName()}" ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await client.delete();

        if (success) {
          console.log('\n✅ Client supprimé avec succès');
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
    console.log('\n🛠️ === Gestionnaire de clients ===');
    console.log('1. Créer un nouveau client');
    console.log('2. Lister tous les clients');
    console.log('3. Modifier un client');
    console.log("4. Changer le statut d'un client");
    console.log('5. Supprimer un client');
    console.log('6. Tester la connexion DB');
    console.log('0. Retour au menu principal');

    const choice = await this.question('\nVotre choix (1-7): ');

    switch (choice) {
      case '1':
        await this.createClient();
        break;
      case '2':
        await this.listClients();
        break;
      case '3':
        await this.updateClient();
        break;
      case '4':
        await this.toggleClientStatus();
        break;
      case '5':
        await this.deleteClient();
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
const manager = new ClientManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
// }
