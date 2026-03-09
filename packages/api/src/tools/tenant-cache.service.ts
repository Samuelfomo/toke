// services/tenant-cache.service.ts
import fs from 'fs/promises';
import path from 'path';

import { TimezoneConfigUtils } from '@toke/shared';

interface TenantConfig {
  subdomain: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  active: boolean;
  last_updated: string;
  reference: string;
  name: string;
  address: object;
  country: string;
  email: string;
  phone: string;
  global_license: string;
}

interface TenantCache {
  [subdomain: string]: TenantConfig;
}

export default class TenantCacheService {
  private static cache: TenantCache = {};
  // private static cacheFile = path.join(process.cwd(), 'cache', 'tenants.json');
  // Chemin absolu fixe car projet monorepos
  private static cacheFile = '/opt/toke/packages/api/cache/tenants.json';
  private static lastLoadTime = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupère la configuration d'un tenant depuis le cache
   */
  public static async getTenantConfig(subdomain: string): Promise<TenantConfig | null> {
    // Charger le cache si nécessaire
    if (Object.keys(this.cache).length === 0 || this.shouldReloadCache()) {
      await this.loadCacheFromFile();
    }

    const config = this.cache[subdomain];
    if (!config) {
      console.log(`⚠️ Tenant '${subdomain}' non trouvé dans le cache`);
      return null;
    }

    if (!config.active) {
      console.log(`⚠️ Tenant '${subdomain}' est inactif`);
      return null;
    }

    return config;
  }

  /**
   * Ajoute ou met à jour un tenant dans le cache
   */
  public static async setTenantConfig(
    subdomain: string,
    config: Omit<TenantConfig, 'subdomain' | 'last_updated'>,
  ): Promise<void> {
    // Toujours charger avant modification pour éviter l'écrasement
    await this.loadCacheFromFile();

    this.cache[subdomain] = {
      ...config,
      subdomain,
      last_updated: TimezoneConfigUtils.getCurrentTime().toISOString(),
    };

    await this.saveCacheToFile();
    console.log(`✅ Configuration tenant '${subdomain}' mise à jour dans le cache`);
  }

  /**
   * Supprime un tenant du cache
   */
  public static async removeTenantConfig(subdomain: string): Promise<void> {
    await this.loadCacheFromFile();

    delete this.cache[subdomain];
    await this.saveCacheToFile();
    console.log(`🗑️ Tenant '${subdomain}' supprimé du cache`);
  }

  /**
   * Recharge le cache depuis la base master (placeholder)
   */
  public static async refreshCacheFromMaster(): Promise<void> {
    try {
      console.log('🔄 Rechargement du cache depuis la base master...');
      // TODO: Implémenter votre logique de récupération depuis la base master
      console.log('✅ Cache rechargé depuis la base master');
    } catch (error) {
      console.error('❌ Erreur rechargement cache:', error);
    }
  }

  /**
   * Liste tous les tenants en cache
   */
  public static async listTenants(): Promise<string[]> {
    await this.loadCacheFromFile();
    return Object.keys(this.cache);
  }

  /**
   * Recherche une entrée dans le cache par une propriété spécifique des données
   * @param searchFn - Fonction de recherche qui retourne true si l'entrée correspond
   * @returns string | null - Le subdomain trouvé ou null
   */
  public static async findByData(searchFn: (data: TenantConfig) => boolean): Promise<string | null> {
    // Charger le cache si nécessaire
    if (Object.keys(this.cache).length === 0 || this.shouldReloadCache()) {
      await this.loadCacheFromFile();
    }

    for (const [subdomain, cacheData] of Object.entries(this.cache)) {
      // Appliquer la fonction de recherche sur l'objet complet
      if (searchFn(cacheData)) {
        return subdomain;
      }
    }

    return null;
  }

  /**
   * Charge le cache depuis le fichier JSON
   */
  private static async loadCacheFromFile(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      try {
        const data = await fs.readFile(this.cacheFile, 'utf8');
        this.cache = JSON.parse(data);
        this.lastLoadTime = Date.now();
        console.log(`📦 Cache tenants chargé: ${Object.keys(this.cache).length} tenant(s)`);
      } catch {
        this.cache = {};
        await this.saveCacheToFile();
        console.log('📦 Cache tenants initialisé (vide)');
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement cache tenants:', error);
      this.cache = {};
    }
  }

  /**
   * Sauvegarde le cache dans le fichier JSON (fusionne avec contenu existant)
   */
  private static async saveCacheToFile(): Promise<void> {
    try {
      let existing: TenantCache = {};
      try {
        const data = await fs.readFile(this.cacheFile, 'utf8');
        existing = JSON.parse(data);
      } catch {
        existing = {};
      }

      // Fusionner le cache existant et le cache actuel
      const merged = { ...existing, ...this.cache };

      await fs.writeFile(this.cacheFile, JSON.stringify(merged, null, 2));
      this.cache = merged;

      console.log('💾 Cache tenants sauvegardé');
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache tenants:', error);
    }
  }

  /**
   * Vérifie si le cache doit être rechargé
   */
  private static shouldReloadCache(): boolean {
    return Date.now() - this.lastLoadTime > this.CACHE_DURATION;
  }

}


// // ========================================
// // 1. GESTIONNAIRE DE CACHE TENANT (JSON/Redis)
// // ========================================
//
// // services/tenant-cache.service.ts
// import fs from 'fs/promises';
// import path from 'path';
//
// interface TenantConfig {
//   subdomain: string;
//   host: string;
//   port: number;
//   username: string;
//   password: string;
//   database: string;
//   active: boolean;
//   last_updated: string;
// }
//
// interface TenantCache {
//   [subdomain: string]: TenantConfig;
// }
//
// export default class TenantCacheService {
//   private static cache: TenantCache = {};
//   private static cacheFile = path.join(process.cwd(), 'cache', 'tenants.json');
//   private static lastLoadTime = 0;
//   private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
//
//   /**
//    * Récupère la configuration d'un tenant depuis le cache
//    */
//   public static async getTenantConfig(subdomain: string): Promise<TenantConfig | null> {
//     // Charger le cache si nécessaire
//     if (Object.keys(this.cache).length === 0 || this.shouldReloadCache()) {
//       await this.loadCacheFromFile();
//     }
//
//     const config = this.cache[subdomain];
//     if (!config) {
//       console.log(`⚠️ Tenant '${subdomain}' non trouvé dans le cache`);
//       return null;
//     }
//
//     if (!config.active) {
//       console.log(`⚠️ Tenant '${subdomain}' est inactif`);
//       return null;
//     }
//
//     return config;
//   }
//
//   /**
//    * Ajoute ou met à jour un tenant dans le cache
//    */
//   public static async setTenantConfig(
//     subdomain: string,
//     config: Omit<TenantConfig, 'subdomain' | 'last_updated'>,
//   ): Promise<void> {
//     this.cache[subdomain] = {
//       ...config,
//       subdomain,
//       last_updated: TimezoneConfigUtils.getCurrentTime().toISOString(),
//     };
//
//     await this.saveCacheToFile();
//     console.log(`✅ Configuration tenant '${subdomain}' mise à jour dans le cache`);
//   }
//
//   /**
//    * Supprime un tenant du cache
//    */
//   public static async removeTenantConfig(subdomain: string): Promise<void> {
//     delete this.cache[subdomain];
//     await this.saveCacheToFile();
//     console.log(`🗑️ Tenant '${subdomain}' supprimé du cache`);
//   }
//
//   /**
//    * Recharge le cache depuis la base master (à appeler périodiquement)
//    */
//   public static async refreshCacheFromMaster(): Promise<void> {
//     try {
//       console.log('🔄 Rechargement du cache depuis la base master...');
//       // TODO: Implémenter votre logique de récupération depuis la base master
//       // const tenants = await this.fetchTenantsFromMasterDB();
//       // for (const tenant of tenants) {
//       //   await this.setTenantConfig(tenant.subdomain, tenant);
//       // }
//       console.log('✅ Cache rechargé depuis la base master');
//     } catch (error) {
//       console.error('❌ Erreur rechargement cache:', error);
//     }
//   }
//
//   /**
//    * Liste tous les tenants en cache
//    */
//   public static async listTenants(): Promise<string[]> {
//     if (Object.keys(this.cache).length === 0) {
//       await this.loadCacheFromFile();
//     }
//     return Object.keys(this.cache);
//   }
//
//   /**
//    * Charge le cache depuis le fichier JSON
//    */
//   private static async loadCacheFromFile(): Promise<void> {
//     try {
//       // Créer le dossier cache s'il n'existe pas
//       const cacheDir = path.dirname(this.cacheFile);
//       await fs.mkdir(cacheDir, { recursive: true });
//
//       // Vérifier si le fichier existe
//       try {
//         await fs.access(this.cacheFile);
//         const data = await fs.readFile(this.cacheFile, 'utf8');
//         this.cache = JSON.parse(data);
//         this.lastLoadTime = Date.now();
//         console.log(`📦 Cache tenants chargé: ${Object.keys(this.cache).length} tenant(s)`);
//       } catch (error: any) {
//         // Fichier n'existe pas, créer un cache vide
//         this.cache = {};
//         await this.saveCacheToFile();
//         console.log('📦 Cache tenants initialisé (vide)');
//       }
//     } catch (error: any) {
//       console.error('❌ Erreur chargement cache tenants:', error);
//       this.cache = {};
//     }
//   }
//
//   /**
//    * Sauvegarde le cache dans le fichier JSON
//    */
//   private static async saveCacheToFile(): Promise<void> {
//     try {
//       await fs.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2));
//       console.log('💾 Cache tenants sauvegardé');
//     } catch (error) {
//       console.error('❌ Erreur sauvegarde cache tenants:', error);
//     }
//   }
//
//   /**
//    * Vérifie si le cache doit être rechargé
//    */
//   private static shouldReloadCache(): boolean {
//     return Date.now() - this.lastLoadTime > this.CACHE_DURATION;
//   }
// }
