import * as readline from 'readline';

import Country from '../src/license/class/Country';
import Db from '../src/license/database/db.config';
import { TableInitializer } from '../src/license/database/db.initializer';

export class CountryManager {
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
   * Créer un nouveau pays
   */
  async createCountry(): Promise<void> {
    console.log("🌍 === Création d'un nouveau pays ===\n");

    try {
      const code = await this.question('📝 Code ISO du pays (2 lettres): ');

      // Validation
      if (typeof code !== 'string' || !code.trim() || code.length !== 2) {
        console.log(`❌ Code ISO valide requis (2 lettres)`);
        return;
      }

      const nameEn = await this.question('📝 Nom en anglais: ');
      if (!nameEn.trim()) {
        console.log(`❌ Nom anglais requis`);
        return;
      }

      const nameLocal = await this.question('📝 Nom local (optionnel): ');

      const currencyCode = await this.question('💰 Code devise (3 lettres, ex: USD): ');
      if (!currencyCode.trim() || currencyCode.length !== 3) {
        console.log(`❌ Code devise valide requis (3 lettres)`);
        return;
      }

      const languageCode = await this.question('🗣️ Code langue (2 lettres, ex: en): ');
      if (!languageCode.trim() || languageCode.length !== 2) {
        console.log(`❌ Code langue valide requis (2 lettres)`);
        return;
      }

      const timezone = await this.question('🕐 Fuseau horaire (ex: Europe/Paris) [UTC]: ');
      const phonePrefix = await this.question('📞 Préfixe téléphonique (ex: +33): ');

      if (!phonePrefix.trim() || !phonePrefix.startsWith('+')) {
        console.log(`❌ Préfixe téléphonique requis (format: +XXX)`);
        return;
      }

      const activeInput = await this.question('✅ Actif ? (o/n) [o]: ');
      const active = activeInput.toLowerCase() !== 'n';

      console.log('\n⏳ Création du pays...');

      // Créer le pays
      const country = new Country()
        .setCode(code)
        .setNameEn(nameEn)
        .setNameLocal(nameLocal || nameEn)
        .setDefaultCurrencyCode(currencyCode)
        .setDefaultLanguageCode(languageCode)
        .setTimezoneDefault(timezone || 'UTC')
        .setPhonePrefix(phonePrefix)
        .setActive(active);

      await country.save();

      console.log('\n✅ Pays créé avec succès!');
      console.log(`   - ID: ${country.getId()}`);
      console.log(`   - GUID: ${country.getGuid()}`);
      console.log(`   - Code: ${country.getCode()}`);
      console.log(`   - Nom: ${country.getNameEn()}`);
      console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
      console.log(`   - Langue: ${country.getDefaultLanguageCode()}`);
      console.log(`   - Actif: ${country.isActive() ? 'Oui' : 'Non'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log('   - Choisir un autre code ISO');
        console.log('   - Vérifier les pays existants (option 2)');
      }
    }
  }

  /**
   * Lister tous les pays
   */
  async listCountries(): Promise<void> {
    console.log('\n📋 === Liste des pays ===\n');

    try {
      const countries = await Country._list();

      if (!countries || countries.length === 0) {
        console.log('📝 Aucun pays trouvé');
        return;
      }

      console.log(`📊 ${countries.length} pays trouvé(s):\n`);

      countries.forEach((country, index) => {
        const status = country.isActive() ? '🟢 Actif' : '🔴 Inactif';
        console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
        console.log(`   ID: ${country.getId()}`);
        console.log(`   GUID: ${country.getGuid()}`);
        console.log(`   Nom local: ${country.getNameLocal()}`);
        console.log(`   Devise: ${country.getDefaultCurrencyCode()}`);
        console.log(`   Langue: ${country.getDefaultLanguageCode()}`);
        console.log(`   Fuseau: ${country.getTimezoneDefault()}`);
        console.log(`   Téléphone: ${country.getPhonePrefix()}`);
        console.log(`   Statut: ${status}`);
        console.log('');
      });
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier un pays
   */
  async updateCountry(): Promise<void> {
    console.log("\n✏️ === Modification d'un pays ===\n");

    try {
      const countries = await Country._list();
      if (!countries || countries.length === 0) {
        console.log('📝 Aucun pays à modifier');
        return;
      }

      // Afficher la liste
      console.log('Pays disponibles:');
      countries.forEach((country, index) => {
        console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
      });

      const choice = await this.question('\nNuméro du pays à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= countries.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const country = countries[index];

      // Modifications possibles
      const newNameEn = await this.question(
        `📝 Nouveau nom anglais (actuel: ${country.getNameEn()}): `,
      );
      const newNameLocal = await this.question(
        `📝 Nouveau nom local (actuel: ${country.getNameLocal()}): `,
      );
      const newCurrency = await this.question(
        `💰 Nouveau code devise (actuel: ${country.getDefaultCurrencyCode()}): `,
      );
      const newLanguage = await this.question(
        `🗣️ Nouveau code langue (actuel: ${country.getDefaultLanguageCode()}): `,
      );
      const newTimezone = await this.question(
        `🕐 Nouveau fuseau (actuel: ${country.getTimezoneDefault()}): `,
      );
      const newPhone = await this.question(
        `📞 Nouveau préfixe (actuel: ${country.getPhonePrefix()}): `,
      );

      let modified = false;

      if (newNameEn.trim()) {
        country.setNameEn(newNameEn);
        modified = true;
      }
      if (newNameLocal.trim()) {
        country.setNameLocal(newNameLocal);
        modified = true;
      }
      if (newCurrency.trim() && newCurrency.length === 3) {
        country.setDefaultCurrencyCode(newCurrency);
        modified = true;
      }
      if (newLanguage.trim() && newLanguage.length === 2) {
        country.setDefaultLanguageCode(newLanguage);
        modified = true;
      }
      if (newTimezone.trim()) {
        country.setTimezoneDefault(newTimezone);
        modified = true;
      }
      if (newPhone.trim() && newPhone.startsWith('+')) {
        country.setPhonePrefix(newPhone);
        modified = true;
      }

      if (modified) {
        await country.save();
        console.log('\n✅ Pays modifié avec succès!');
      } else {
        console.log('\n⚠️ Aucune modification effectuée');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Changer le statut d'un pays
   */
  async toggleCountryStatus(): Promise<void> {
    console.log('\n🔄 === Changement de statut ===\n');

    try {
      const countries = await Country._list();
      if (!countries || countries.length === 0) {
        console.log('📝 Aucun pays trouvé');
        return;
      }

      // Afficher la liste avec statuts
      console.log('Pays disponibles:');
      countries.forEach((country, index) => {
        const status = country.isActive() ? '🟢 Actif' : '🔴 Inactif';
        console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()}) - ${status}`);
      });

      const choice = await this.question('\nNuméro du pays: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= countries.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const country = countries[index];
      const oldStatus = country.isActive() ? 'actif' : 'inactif';

      country.setActive(!country.isActive());
      await country.save();

      const newStatus = country.isActive() ? 'actif' : 'inactif';
      console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer un pays
   */
  async deleteCountry(): Promise<void> {
    console.log("\n🗑️ === Suppression d'un pays ===\n");

    try {
      const countries = await Country._list();
      if (!countries || countries.length === 0) {
        console.log('📝 Aucun pays à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Pays disponibles:');
      countries.forEach((country, index) => {
        console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
      });

      const choice = await this.question('\nNuméro du pays à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= countries.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const country = countries[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${country.getNameEn()}" (${country.getCode()}) ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await country.delete();

        if (success) {
          console.log('\n✅ Pays supprimé avec succès');
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
    console.log('\n🛠️ === Gestionnaire des pays ===');
    console.log('1. Créer un nouveau pays');
    console.log('2. Lister tous les pays');
    console.log('3. Modifier un pays');
    console.log("4. Changer le statut d'un pays");
    console.log('5. Supprimer un pays');
    console.log('6. Tester la connexion DB');
    console.log('7. Quitter la gestion');

    const choice = await this.question('\nVotre choix (1-7): ');

    switch (choice) {
      case '1':
        await this.createCountry();
        break;
      case '2':
        await this.listCountries();
        break;
      case '3':
        await this.updateCountry();
        break;
      case '4':
        await this.toggleCountryStatus();
        break;
      case '5':
        await this.deleteCountry();
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
      console.log('🚀 === Gestionnaire de pays ===\n');
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
const manager = new CountryManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
