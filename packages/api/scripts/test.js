"use strict";
// import Country from '../src/master/class/Country';
// import Db from '../src/master/database/db.config';
// import { TableInitializer } from '../src/master/database/db.initializer';
//
// export class CountryAutoTest {
//   /**
//    * Initialisation de la base de données
//    */
//   async init(): Promise<void> {
//     try {
//       console.log("⏳ Initialisation de l'application...");
//
//       // 1. Connexion à la base de données
//       const sequelize = await Db.getInstance();
//
//       // 2. Initialiser les tables
//       await TableInitializer.initialize(sequelize);
//
//       console.log('✅ Application initialisée');
//     } catch (error: any) {
//       console.error('❌ Erreur initialisation:', error.message);
//       throw error;
//     }
//   }
//
//   /**
//    * Créer des pays avec données brutes
//    */
//   async createCountriesAuto(): Promise<void> {
//     console.log('🌍 === Création automatique de pays ===\n');
//
//     // Données brutes des pays
//     const countriesData = [
//       {
//         code: 'US',
//         nameEn: 'United States',
//         nameLocal: 'United States',
//         currencyCode: 'USD',
//         languageCode: 'en',
//         timezone: 'America/New_York',
//         phonePrefix: '+1',
//         active: true,
//       },
//       {
//         code: 'FR',
//         nameEn: 'France',
//         nameLocal: 'France',
//         currencyCode: 'EUR',
//         languageCode: 'fr',
//         timezone: 'Europe/Paris',
//         phonePrefix: '+33',
//         active: true,
//       },
//       {
//         code: 'CM',
//         nameEn: 'Cameroon',
//         nameLocal: 'Cameroun',
//         currencyCode: 'XAF',
//         languageCode: 'fr',
//         timezone: 'Africa/Douala',
//         phonePrefix: '+237',
//         active: true,
//       },
//       {
//         code: 'GB',
//         nameEn: 'United Kingdom',
//         nameLocal: 'United Kingdom',
//         currencyCode: 'GBP',
//         languageCode: 'en',
//         timezone: 'Europe/London',
//         phonePrefix: '+44',
//         active: true,
//       },
//       {
//         code: 'DE',
//         nameEn: 'Germany',
//         nameLocal: 'Deutschland',
//         currencyCode: 'EUR',
//         languageCode: 'de',
//         timezone: 'Europe/Berlin',
//         phonePrefix: '+49',
//         active: true,
//       },
//       {
//         code: 'CA',
//         nameEn: 'Canada',
//         nameLocal: 'Canada',
//         currencyCode: 'CAD',
//         languageCode: 'en',
//         timezone: 'America/Toronto',
//         phonePrefix: '+1',
//         active: true,
//       },
//       {
//         code: 'JP',
//         nameEn: 'Japan',
//         nameLocal: '日本',
//         currencyCode: 'JPY',
//         languageCode: 'ja',
//         timezone: 'Asia/Tokyo',
//         phonePrefix: '+81',
//         active: true,
//       },
//       {
//         code: 'AU',
//         nameEn: 'Australia',
//         nameLocal: 'Australia',
//         currencyCode: 'AUD',
//         languageCode: 'en',
//         timezone: 'Australia/Sydney',
//         phonePrefix: '+61',
//         active: true,
//       },
//       {
//         code: 'BR',
//         nameEn: 'Brazil',
//         nameLocal: 'Brasil',
//         currencyCode: 'BRL',
//         languageCode: 'pt',
//         timezone: 'America/Sao_Paulo',
//         phonePrefix: '+55',
//         active: true,
//       },
//       {
//         code: 'IN',
//         nameEn: 'India',
//         nameLocal: 'भारत',
//         currencyCode: 'INR',
//         languageCode: 'hi',
//         timezone: 'Asia/Kolkata',
//         phonePrefix: '+91',
//         active: true,
//       },
//     ];
//
//     let successCount = 0;
//     let errorCount = 0;
//
//     for (const countryData of countriesData) {
//       try {
//         console.log(`⏳ Création du pays: ${countryData.nameEn} (${countryData.code})`);
//
//         // Créer le pays
//         const country = new Country()
//           .setCode(countryData.code)
//           .setNameEn(countryData.nameEn)
//           .setNameLocal(countryData.nameLocal)
//           .setDefaultCurrencyCode(countryData.currencyCode)
//           .setDefaultLanguageCode(countryData.languageCode)
//           .setTimezoneDefault(countryData.timezone)
//           .setPhonePrefix(countryData.phonePrefix)
//           .setActive(countryData.active);
//
//         await country.save();
//
//         console.log(`✅ ${countryData.nameEn} créé avec succès!`);
//         console.log(`   - ID: ${country.getId()}`);
//         console.log(`   - GUID: ${country.getGuid()}`);
//         console.log(`   - Code: ${country.getCode()}`);
//         console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
//         console.log(`   - Langue: ${country.getDefaultLanguageCode()}\n`);
//
//         successCount++;
//       } catch (error: any) {
//         console.log(`❌ Erreur pour ${countryData.nameEn}: ${error.message}`);
//         errorCount++;
//
//         if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
//           console.log(`💡 Le pays ${countryData.nameEn} existe déjà\n`);
//         }
//       }
//     }
//
//     console.log(`\n📊 === Résumé de création ===`);
//     console.log(`✅ Pays créés avec succès: ${successCount}`);
//     console.log(`❌ Erreurs rencontrées: ${errorCount}`);
//     console.log(`📋 Total traité: ${countriesData.length}`);
//   }
//
//   /**
//    * Lister tous les pays
//    */
//   async listCountries(): Promise<void> {
//     console.log('\n📋 === Liste des pays ===\n');
//
//     try {
//       const countries = await Country._list();
//
//       if (!countries || countries.length === 0) {
//         console.log('🔍 Aucun pays trouvé');
//         return;
//       }
//
//       console.log(`📊 ${countries.length} pays trouvé(s):\n`);
//
//       countries.forEach((country, index) => {
//         const status = country.isActive() ? '🟢 Actif' : '🔴 Inactif';
//         console.log(`${index + 1}. ${country.getNameEn()} (${country.getCode()})`);
//         console.log(`   ID: ${country.getId()}`);
//         console.log(`   GUID: ${country.getGuid()}`);
//         console.log(`   Nom local: ${country.getNameLocal()}`);
//         console.log(`   Devise: ${country.getDefaultCurrencyCode()}`);
//         console.log(`   Langue: ${country.getDefaultLanguageCode()}`);
//         console.log(`   Fuseau: ${country.getTimezoneDefault()}`);
//         console.log(`   Téléphone: ${country.getPhonePrefix()}`);
//         console.log(`   Statut: ${status}`);
//         console.log('');
//       });
//     } catch (error: any) {
//       console.log(`\nâŒ Erreur: ${error.message}`);
//     }
//   }
//
//   /**
//    * Tester la connexion à la base de données
//    */
//   async testConnection(): Promise<void> {
//     console.log('\n🔍 === Test de connexion ===\n');
//
//     try {
//       const sequelize = await Db.getInstance();
//       await sequelize.authenticate();
//
//       const stats = TableInitializer.getStats();
//
//       console.log('✅ Connexion DB: OK');
//       console.log(`📊 Tables initialisées: ${stats.initialized ? 'Oui' : 'Non'}`);
//       console.log(`📋 Nombre de tables: ${stats.tableCount}`);
//       console.log(`🏷️ Tables: ${stats.tableNames.join(', ')}`);
//     } catch (error: any) {
//       console.log(`❌ Erreur connexion: ${error.message}`);
//     }
//   }
//
//   /**
//    * Créer un pays unique avec données spécifiques
//    */
//   async createSingleCountry(countryData: {
//     code: string;
//     nameEn: string;
//     nameLocal: string;
//     currencyCode: string;
//     languageCode: string;
//     timezone: string;
//     phonePrefix: string;
//     active: boolean;
//   }): Promise<void> {
//     try {
//       console.log(`⏳ Création du pays: ${countryData.nameEn} (${countryData.code})`);
//
//       const country = new Country()
//         .setCode(countryData.code)
//         .setNameEn(countryData.nameEn)
//         .setNameLocal(countryData.nameLocal)
//         .setDefaultCurrencyCode(countryData.currencyCode)
//         .setDefaultLanguageCode(countryData.languageCode)
//         .setTimezoneDefault(countryData.timezone)
//         .setPhonePrefix(countryData.phonePrefix)
//         .setActive(countryData.active);
//
//       await country.save();
//
//       console.log('\n✅ Pays créé avec succès!');
//       console.log(`   - ID: ${country.getId()}`);
//       console.log(`   - GUID: ${country.getGuid()}`);
//       console.log(`   - Code: ${country.getCode()}`);
//       console.log(`   - Nom: ${country.getNameEn()}`);
//       console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
//       console.log(`   - Langue: ${country.getDefaultLanguageCode()}`);
//       console.log(`   - Actif: ${country.isActive() ? 'Oui' : 'Non'}`);
//     } catch (error: any) {
//       console.log(`\n❌ Erreur: ${error.message}`);
//     }
//   }
//
//   /**
//    * Supprimer tous les pays
//    */
//   async deleteAllCountries(): Promise<void> {
//     console.log('\n🗑️ === Suppression de tous les pays ===\n');
//
//     try {
//       const countries = await Country._list();
//
//       if (!countries || countries.length === 0) {
//         console.log('🔍 Aucun pays à supprimer');
//         return;
//       }
//
//       console.log(`📊 ${countries.length} pays trouvé(s) à supprimer:\n`);
//
//       let successCount = 0;
//       let errorCount = 0;
//
//       for (const country of countries) {
//         try {
//           console.log(`⏳ Suppression: ${country.getNameEn()} (${country.getCode()})`);
//
//           const success = await country.delete();
//
//           if (success) {
//             console.log(`✅ ${country.getNameEn()} supprimé avec succès`);
//             successCount++;
//           } else {
//             console.log(`❌ Échec suppression: ${country.getNameEn()}`);
//             errorCount++;
//           }
//         } catch (error: any) {
//           console.log(`❌ Erreur suppression ${country.getNameEn()}: ${error.message}`);
//           errorCount++;
//         }
//       }
//
//       console.log(`\n📊 === Résumé de suppression ===`);
//       console.log(`✅ Pays supprimés avec succès: ${successCount}`);
//       console.log(`❌ Erreurs rencontrées: ${errorCount}`);
//       console.log(`📋 Total traité: ${countries.length}`);
//     } catch (error: any) {
//       console.log(`\n❌ Erreur: ${error.message}`);
//     }
//   }
//
//   /**
//    * Supprimer des pays par codes spécifiques
//    */
//   async deleteCountriesByCodes(codes: string[]): Promise<void> {
//     console.log('\n🗑️ === Suppression de pays spécifiques ===\n');
//
//     try {
//       const countries = await Country._list();
//
//       if (!countries || countries.length === 0) {
//         console.log('🔍 Aucun pays trouvé');
//         return;
//       }
//
//       const countriesToDelete = countries.filter((country) => codes.includes(country.getCode()));
//
//       if (countriesToDelete.length === 0) {
//         console.log(`🔍 Aucun pays trouvé avec les codes: ${codes.join(', ')}`);
//         return;
//       }
//
//       console.log(`📊 ${countriesToDelete.length} pays trouvé(s) à supprimer:\n`);
//
//       let successCount = 0;
//       let errorCount = 0;
//
//       for (const country of countriesToDelete) {
//         try {
//           console.log(`⏳ Suppression: ${country.getNameEn()} (${country.getCode()})`);
//
//           const success = await country.delete();
//
//           if (success) {
//             console.log(`✅ ${country.getNameEn()} supprimé avec succès`);
//             successCount++;
//           } else {
//             console.log(`❌ Échec suppression: ${country.getNameEn()}`);
//             errorCount++;
//           }
//         } catch (error: any) {
//           console.log(`❌ Erreur suppression ${country.getNameEn()}: ${error.message}`);
//           errorCount++;
//         }
//       }
//
//       console.log(`\n📊 === Résumé de suppression ===`);
//       console.log(`✅ Pays supprimés avec succès: ${successCount}`);
//       console.log(`❌ Erreurs rencontrées: ${errorCount}`);
//       console.log(`📋 Total traité: ${countriesToDelete.length}`);
//     } catch (error: any) {
//       console.log(`\n❌ Erreur: ${error.message}`);
//     }
//   }
//
//   /**
//    * Test complet automatisé
//    */
//   async runFullTest(): Promise<void> {
//     try {
//       console.log('🚀 === Test automatisé complet des pays ===\n');
//
//       await this.init();
//
//       // 1. Test connexion
//       await this.testConnection();
//
//       // 2. Créer les pays
//       await this.createCountriesAuto();
//
//       // 3. Lister tous les pays
//       await this.listCountries();
//
//       // 4. Créer un pays spécifique (exemple)
//       console.log("\n=== Création d'un pays spécifique ===");
//       await this.createSingleCountry({
//         code: 'CH',
//         nameEn: 'Switzerland',
//         nameLocal: 'Schweiz',
//         currencyCode: 'CHF',
//         languageCode: 'de',
//         timezone: 'Europe/Zurich',
//         phonePrefix: '+41',
//         active: true,
//       });
//     } catch (error: any) {
//       console.error('❌ Erreur fatale:', error.message);
//     } finally {
//       await this.cleanup();
//     }
//   }
//
//   /**
//    * Test de suppression
//    */
//   async runDeleteTest(): Promise<void> {
//     try {
//       console.log('🗑️ === Test de suppression des pays ===\n');
//
//       await this.init();
//
//       // 1. Lister avant suppression
//       console.log('=== AVANT SUPPRESSION ===');
//       await this.listCountries();
//
//       // 2. Supprimer tous les pays
//       await this.deleteAllCountries();
//
//       // 3. Lister après suppression
//       console.log('\n=== APRÈS SUPPRESSION ===');
//       await this.listCountries();
//     } catch (error: any) {
//       console.error('❌ Erreur fatale:', error.message);
//     } finally {
//       await this.cleanup();
//     }
//   }
//
//   /**
//    * Test de suppression spécifique
//    */
//   async runDeleteSpecificTest(codes: string[]): Promise<void> {
//     try {
//       console.log('🗑️ === Test de suppression spécifique des pays ===\n');
//
//       await this.init();
//
//       // 1. Lister avant suppression
//       console.log('=== AVANT SUPPRESSION ===');
//       await this.listCountries();
//
//       // 2. Supprimer pays spécifiques
//       await this.deleteCountriesByCodes(codes);
//
//       // 3. Lister après suppression
//       console.log('\n=== APRÈS SUPPRESSION ===');
//       await this.listCountries();
//     } catch (error: any) {
//       console.error('❌ Erreur fatale:', error.message);
//     } finally {
//       await this.cleanup();
//     }
//   }
//
//   /**
//    * Nettoyage des ressources
//    */
//   async cleanup(): Promise<void> {
//     try {
//       TableInitializer.cleanup();
//       await Db.close();
//       console.log('\n🧹 Ressources nettoyées');
//     } catch (error) {
//       console.error('❌ Erreur lors du nettoyage:', error);
//     }
//   }
// }
//
// // Gestion propre de l'arrêt
// process.on('SIGINT', async () => {
//   console.log('\n🛑 Arrêt en cours...');
//   process.exit(0);
// });
//
// process.on('uncaughtException', (error) => {
//   console.error('❌ Exception non gérée:', error);
//   process.exit(1);
// });
//
// // Démarrage automatique - choisir l'action à effectuer
// const autoTest = new CountryAutoTest();
//
// // Récupérer l'argument de la ligne de commande
// const action = process.argv[2];
//
// switch (action) {
//   case 'create':
//     autoTest.runFullTest().catch((error) => {
//       console.error('❌ Erreur de création:', error);
//       process.exit(1);
//     });
//     break;
//
//   case 'delete':
//     autoTest.runDeleteTest().catch((error) => {
//       console.error('❌ Erreur de suppression:', error);
//       process.exit(1);
//     });
//     break;
//
//   case 'delete-specific':
//     // Récupérer les codes pays à supprimer
//     const codes = process.argv.slice(3);
//     if (codes.length === 0) {
//       console.log('❌ Usage: tsx scripts/testCountryAuto.ts delete-specific US FR GB');
//       process.exit(1);
//     }
//     autoTest.runDeleteSpecificTest(codes).catch((error) => {
//       console.error('❌ Erreur de suppression spécifique:', error);
//       process.exit(1);
//     });
//     break;
//
//   case 'list':
//     (async () => {
//       await autoTest.init();
//       await autoTest.listCountries();
//       await autoTest.cleanup();
//     })().catch((error) => {
//       console.error('❌ Erreur de listage:', error);
//       process.exit(1);
//     });
//     break;
//
//   default:
//     console.log('🚀 === Gestionnaire automatique des pays ===\n');
//     console.log('Usage:');
//     console.log('  tsx scripts/testCountryAuto.ts create           # Créer les pays');
//     console.log('  tsx scripts/testCountryAuto.ts delete           # Supprimer tous les pays');
//     console.log(
//       '  tsx scripts/testCountryAuto.ts delete-specific US FR GB  # Supprimer pays spécifiques',
//     );
//     console.log('  tsx scripts/testCountryAuto.ts list             # Lister les pays');
//     console.log('\nExemples:');
//     console.log('  npm run testCountryAuto create');
//     console.log('  npm run testCountryAuto delete');
//     console.log('  npm run testCountryAuto delete-specific US FR');
//     console.log('  npm run testCountryAuto list');
//     process.exit(0);
// }
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
exports.CountryAutoTest = void 0;
const Country_1 = __importDefault(require("../src/master/class/Country"));
const db_config_1 = __importDefault(require("../src/master/database/db.config"));
const db_initializer_1 = require("../src/master/database/db.initializer");
class CountryAutoTest {
    /**
     * Initialisation de la base de données
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("⏳ Initialisation de l'application...");
                // 1. Connexion à la base de données
                const sequelize = yield db_config_1.default.getInstance();
                // 2. Initialiser les tables
                yield db_initializer_1.TableInitializer.initialize(sequelize);
                console.log('✅ Application initialisée');
            }
            catch (error) {
                console.error('❌ Erreur initialisation:', error.message);
                throw error;
            }
        });
    }
    /**
     * Créer des pays avec données brutes
     */
    createCountriesAuto() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🌍 === Création automatique de pays ===\n');
            // Données brutes des pays
            const countriesData = [
                {
                    code: 'US',
                    nameEn: 'United States',
                    nameLocal: 'United States',
                    currencyCode: 'USD',
                    languageCode: 'en',
                    timezone: 'America/New_York',
                    phonePrefix: '+1',
                    active: true,
                },
                {
                    code: 'FR',
                    nameEn: 'France',
                    nameLocal: 'France',
                    currencyCode: 'EUR',
                    languageCode: 'fr',
                    timezone: 'Europe/Paris',
                    phonePrefix: '+33',
                    active: true,
                },
                {
                    code: 'CM',
                    nameEn: 'Cameroon',
                    nameLocal: 'Cameroun',
                    currencyCode: 'XAF',
                    languageCode: 'fr',
                    timezone: 'Africa/Douala',
                    phonePrefix: '+237',
                    active: true,
                },
                {
                    code: 'GB',
                    nameEn: 'United Kingdom',
                    nameLocal: 'United Kingdom',
                    currencyCode: 'GBP',
                    languageCode: 'en',
                    timezone: 'Europe/London',
                    phonePrefix: '+44',
                    active: true,
                },
                {
                    code: 'DE',
                    nameEn: 'Germany',
                    nameLocal: 'Deutschland',
                    currencyCode: 'EUR',
                    languageCode: 'de',
                    timezone: 'Europe/Berlin',
                    phonePrefix: '+49',
                    active: true,
                },
                {
                    code: 'CA',
                    nameEn: 'Canada',
                    nameLocal: 'Canada',
                    currencyCode: 'CAD',
                    languageCode: 'en',
                    timezone: 'America/Toronto',
                    phonePrefix: '+1',
                    active: true,
                },
                {
                    code: 'JP',
                    nameEn: 'Japan',
                    nameLocal: '日本',
                    currencyCode: 'JPY',
                    languageCode: 'ja',
                    timezone: 'Asia/Tokyo',
                    phonePrefix: '+81',
                    active: true,
                },
                {
                    code: 'AU',
                    nameEn: 'Australia',
                    nameLocal: 'Australia',
                    currencyCode: 'AUD',
                    languageCode: 'en',
                    timezone: 'Australia/Sydney',
                    phonePrefix: '+61',
                    active: true,
                },
                {
                    code: 'BR',
                    nameEn: 'Brazil',
                    nameLocal: 'Brasil',
                    currencyCode: 'BRL',
                    languageCode: 'pt',
                    timezone: 'America/Sao_Paulo',
                    phonePrefix: '+55',
                    active: true,
                },
                {
                    code: 'IN',
                    nameEn: 'India',
                    nameLocal: 'भारत',
                    currencyCode: 'INR',
                    languageCode: 'hi',
                    timezone: 'Asia/Kolkata',
                    phonePrefix: '+91',
                    active: true,
                },
            ];
            let successCount = 0;
            let errorCount = 0;
            for (const countryData of countriesData) {
                try {
                    console.log(`⏳ Création du pays: ${countryData.nameEn} (${countryData.code})`);
                    // Créer le pays
                    const country = new Country_1.default()
                        .setCode(countryData.code)
                        .setNameEn(countryData.nameEn)
                        .setNameLocal(countryData.nameLocal)
                        .setDefaultCurrencyCode(countryData.currencyCode)
                        .setDefaultLanguageCode(countryData.languageCode)
                        .setTimezoneDefault(countryData.timezone)
                        .setPhonePrefix(countryData.phonePrefix)
                        .setActive(countryData.active);
                    yield country.save();
                    console.log(`✅ ${countryData.nameEn} créé avec succès!`);
                    console.log(`   - ID: ${country.getId()}`);
                    console.log(`   - GUID: ${country.getGuid()}`);
                    console.log(`   - Code: ${country.getCode()}`);
                    console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
                    console.log(`   - Langue: ${country.getDefaultLanguageCode()}\n`);
                    successCount++;
                }
                catch (error) {
                    console.log(`❌ Erreur pour ${countryData.nameEn}: ${error.message}`);
                    errorCount++;
                    if (error.message.includes('already exists') || error.message.includes('existe déjà')) {
                        console.log(`💡 Le pays ${countryData.nameEn} existe déjà\n`);
                    }
                }
            }
            console.log(`\n📊 === Résumé de création ===`);
            console.log(`✅ Pays créés avec succès: ${successCount}`);
            console.log(`❌ Erreurs rencontrées: ${errorCount}`);
            console.log(`📋 Total traité: ${countriesData.length}`);
        });
    }
    /**
     * Lister tous les pays
     */
    listCountries() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n📋 === Liste des pays ===\n');
            try {
                const countries = yield Country_1.default._list();
                if (!countries || countries.length === 0) {
                    console.log('🔍 Aucun pays trouvé');
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
            }
            catch (error) {
                console.log(`\nâŒ Erreur: ${error.message}`);
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
                const sequelize = yield db_config_1.default.getInstance();
                yield sequelize.authenticate();
                const stats = db_initializer_1.TableInitializer.getStats();
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
     * Créer un pays unique avec données spécifiques
     */
    createSingleCountry(countryData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`⏳ Création du pays: ${countryData.nameEn} (${countryData.code})`);
                const country = new Country_1.default()
                    .setCode(countryData.code)
                    .setNameEn(countryData.nameEn)
                    .setNameLocal(countryData.nameLocal)
                    .setDefaultCurrencyCode(countryData.currencyCode)
                    .setDefaultLanguageCode(countryData.languageCode)
                    .setTimezoneDefault(countryData.timezone)
                    .setPhonePrefix(countryData.phonePrefix)
                    .setActive(countryData.active);
                yield country.save();
                console.log('\n✅ Pays créé avec succès!');
                console.log(`   - ID: ${country.getId()}`);
                console.log(`   - GUID: ${country.getGuid()}`);
                console.log(`   - Code: ${country.getCode()}`);
                console.log(`   - Nom: ${country.getNameEn()}`);
                console.log(`   - Devise: ${country.getDefaultCurrencyCode()}`);
                console.log(`   - Langue: ${country.getDefaultLanguageCode()}`);
                console.log(`   - Actif: ${country.isActive() ? 'Oui' : 'Non'}`);
            }
            catch (error) {
                console.log(`\n❌ Erreur: ${error.message}`);
            }
        });
    }
    /**
     * Test complet automatisé
     */
    runFullTest() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🚀 === Test automatisé complet des pays ===\n');
                yield this.init();
                // 1. Test connexion
                yield this.testConnection();
                // 2. Créer les pays
                yield this.createCountriesAuto();
                // 3. Lister tous les pays
                yield this.listCountries();
                // 4. Créer un pays spécifique (exemple)
                console.log("\n=== Création d'un pays spécifique ===");
                yield this.createSingleCountry({
                    code: 'CH',
                    nameEn: 'Switzerland',
                    nameLocal: 'Schweiz',
                    currencyCode: 'CHF',
                    languageCode: 'de',
                    timezone: 'Europe/Zurich',
                    phonePrefix: '+41',
                    active: true,
                });
            }
            catch (error) {
                console.error('❌ Erreur fatale:', error.message);
            }
            finally {
                yield this.cleanup();
            }
        });
    }
    /**
     * Nettoyage des ressources
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                db_initializer_1.TableInitializer.cleanup();
                yield db_config_1.default.close();
                console.log('\n🧹 Ressources nettoyées');
            }
            catch (error) {
                console.error('❌ Erreur lors du nettoyage:', error);
            }
        });
    }
}
exports.CountryAutoTest = CountryAutoTest;
// Gestion propre de l'arrêt
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Arrêt en cours...');
    process.exit(0);
}));
process.on('uncaughtException', (error) => {
    console.error('❌ Exception non gérée:', error);
    process.exit(1);
});
// Démarrage automatique
const autoTest = new CountryAutoTest();
autoTest.runFullTest().catch((error) => {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
});
