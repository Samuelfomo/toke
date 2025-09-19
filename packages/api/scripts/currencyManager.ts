import * as readline from 'readline';

import Currency from '../src/master/class/Currency';
import Db from '../src/master/database/db.config';
import { TableInitializer } from '../src/master/database/db.initializer';

export class CurrencyManager {
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
   * Créer une nouvelle devise
   */
  async createCurrency(): Promise<void> {
    console.log("💰 === Création d'une nouvelle devise ===\n");

    try {
      const code = await this.question('📝 Code devise (3 lettres, ex: USD): ');

      // Validation
      if (typeof code !== 'string' || !code.trim() || code.length !== 3) {
        console.log(`❌ Code devise valide requis (3 lettres)`);
        return;
      }

      const name = await this.question('📝 Nom de la devise (ex: US Dollar): ');
      if (!name.trim()) {
        console.log(`❌ Nom de la devise requis`);
        return;
      }

      const symbol = await this.question('💱 Symbole de la devise (ex: $): ');
      if (!symbol.trim()) {
        console.log(`❌ Symbole de la devise requis`);
        return;
      }

      const decimalInput = await this.question('🔢 Nombre de décimales (ex: 2): ');
      const decimalPlaces = parseInt(decimalInput);
      if (isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 8) {
        console.log(`❌ Nombre de décimales valide requis (0-8)`);
        return;
      }

      const activeInput = await this.question('✅ Active ? (o/n) [o]: ');
      const active = activeInput.toLowerCase() !== 'n';

      console.log('\n⏳ Création de la devise...');

      // Créer la devise
      const currency = new Currency()
        .setCode(code)
        .setName(name)
        .setSymbol(symbol)
        .setDecimalPlaces(decimalPlaces)
        .setActive(active);

      await currency.save();

      console.log('\n✅ Devise créée avec succès!');
      console.log(`   - ID: ${currency.getId()}`);
      console.log(`   - GUID: ${currency.getGuid()}`);
      console.log(`   - Code: ${currency.getCode()}`);
      console.log(`   - Nom: ${currency.getName()}`);
      console.log(`   - Symbole: ${currency.getSymbol()}`);
      console.log(`   - Décimales: ${currency.getDecimalPlaces()}`);
      console.log(`   - Active: ${currency.isActive() ? 'Oui' : 'Non'}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);

      if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
        console.log('\n💡 Solutions possibles:');
        console.log('   - Choisir un autre code devise');
        console.log('   - Vérifier les devises existantes (option 2)');
      }
    }
  }

  /**
   * Lister toutes les devises
   */
  async listCurrencies(): Promise<void> {
    console.log('\n📋 === Liste des devises ===\n');

    try {
      const currencies = await Currency._list();

      if (!currencies || currencies.length === 0) {
        console.log('📝 Aucune devise trouvée');
        return;
      }

      console.log(`📊 ${currencies.length} devise(s) trouvée(s):\n`);

      currencies.forEach((currency, index) => {
        const status = currency.isActive() ? '🟢 Active' : '🔴 Inactive';
        console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
        console.log(`   ID: ${currency.getId()}`);
        console.log(`   GUID: ${currency.getGuid()}`);
        console.log(`   Symbole: ${currency.getSymbol()}`);
        console.log(`   Décimales: ${currency.getDecimalPlaces()}`);
        console.log(`   Statut: ${status}`);
        console.log('');
      });
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Modifier une devise
   */
  async updateCurrency(): Promise<void> {
    console.log("\n✏️ === Modification d'une devise ===\n");

    try {
      const currencies = await Currency._list();
      if (!currencies || currencies.length === 0) {
        console.log('📝 Aucune devise à modifier');
        return;
      }

      // Afficher la liste
      console.log('Devises disponibles:');
      currencies.forEach((currency, index) => {
        console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
      });

      const choice = await this.question('\nNuméro de la devise à modifier: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= currencies.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const currency = currencies[index];

      // Modifications possibles
      const newName = await this.question(`📝 Nouveau nom (actuel: ${currency.getName()}): `);
      const newSymbol = await this.question(
        `💱 Nouveau symbole (actuel: ${currency.getSymbol()}): `,
      );
      const newDecimalInput = await this.question(
        `🔢 Nouvelles décimales (actuel: ${currency.getDecimalPlaces()}): `,
      );

      let modified = false;

      if (newName.trim()) {
        currency.setName(newName);
        modified = true;
      }
      if (newSymbol.trim()) {
        currency.setSymbol(newSymbol);
        modified = true;
      }
      if (newDecimalInput.trim()) {
        const newDecimal = parseInt(newDecimalInput);
        if (!isNaN(newDecimal) && newDecimal >= 0 && newDecimal <= 8) {
          currency.setDecimalPlaces(newDecimal);
          modified = true;
        } else {
          console.log('⚠️ Nombre de décimales invalide (0-8), ignoré');
        }
      }

      if (modified) {
        await currency.save();
        console.log('\n✅ Devise modifiée avec succès!');
      } else {
        console.log('\n⚠️ Aucune modification effectuée');
      }
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Changer le statut d'une devise
   */
  async toggleCurrencyStatus(): Promise<void> {
    console.log('\n🔄 === Changement de statut ===\n');

    try {
      const currencies = await Currency._list();
      if (!currencies || currencies.length === 0) {
        console.log('📝 Aucune devise trouvée');
        return;
      }

      // Afficher la liste avec statuts
      console.log('Devises disponibles:');
      currencies.forEach((currency, index) => {
        const status = currency.isActive() ? '🟢 Active' : '🔴 Inactive';
        console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()}) - ${status}`);
      });

      const choice = await this.question('\nNuméro de la devise: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= currencies.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const currency = currencies[index];
      const oldStatus = currency.isActive() ? 'active' : 'inactive';

      currency.setActive(!currency.isActive());
      await currency.save();

      const newStatus = currency.isActive() ? 'active' : 'inactive';
      console.log(`\n✅ Statut changé: ${oldStatus} → ${newStatus}`);
    } catch (error: any) {
      console.log(`\n❌ Erreur: ${error.message}`);
    }
  }

  /**
   * Supprimer une devise
   */
  async deleteCurrency(): Promise<void> {
    console.log("\n🗑️ === Suppression d'une devise ===\n");

    try {
      const currencies = await Currency._list();
      if (!currencies || currencies.length === 0) {
        console.log('📝 Aucune devise à supprimer');
        return;
      }

      // Afficher la liste
      console.log('Devises disponibles:');
      currencies.forEach((currency, index) => {
        console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
      });

      const choice = await this.question('\nNuméro de la devise à supprimer: ');
      const index = parseInt(choice) - 1;

      if (index < 0 || index >= currencies.length) {
        console.log('❌ Choix invalide');
        return;
      }

      const currency = currencies[index];

      // Confirmation
      const confirm = await this.question(
        `⚠️ Confirmer la suppression de "${currency.getName()}" (${currency.getCode()}) ? (oui/non): `,
      );

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'o') {
        const success = await currency.delete();

        if (success) {
          console.log('\n✅ Devise supprimée avec succès');
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
   * Lister les devises actives seulement
   */
  async listActiveCurrencies(): Promise<void> {
    console.log('\n📋 === Liste des devises actives ===\n');

    try {
      const currencies = await Currency._listByActiveStatus(true);

      if (!currencies || currencies.length === 0) {
        console.log('📝 Aucune devise active trouvée');
        return;
      }

      console.log(`📊 ${currencies.length} devise(s) active(s):\n`);

      currencies.forEach((currency, index) => {
        console.log(`${index + 1}. ${currency.getName()} (${currency.getCode()})`);
        console.log(`   Symbole: ${currency.getSymbol()}`);
        console.log(`   Décimales: ${currency.getDecimalPlaces()}`);
        console.log('');
      });
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
    console.log('\n🛠️ === Gestionnaire des devises ===');
    console.log('1. Créer une nouvelle devise');
    console.log('2. Lister toutes les devises');
    console.log('3. Lister les devises actives');
    console.log('4. Modifier une devise');
    console.log("5. Changer le statut d'une devise");
    console.log('6. Supprimer une devise');
    console.log('7. Tester la connexion DB');
    console.log('8. Quitter la gestion');

    const choice = await this.question('\nVotre choix (1-8): ');

    switch (choice) {
      case '1':
        await this.createCurrency();
        break;
      case '2':
        await this.listCurrencies();
        break;
      case '3':
        await this.listActiveCurrencies();
        break;
      case '4':
        await this.updateCurrency();
        break;
      case '5':
        await this.toggleCurrencyStatus();
        break;
      case '6':
        await this.deleteCurrency();
        break;
      case '7':
        await this.testConnection();
        break;
      case '8':
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
      console.log('🚀 === Gestionnaire de devises ===\n');
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
const manager = new CurrencyManager();
manager.start().catch((error) => {
  console.error('❌ Erreur de démarrage:', error);
  process.exit(1);
});
