// services/generic-cache.service.ts
import fs from 'fs/promises';
import path from 'path';

export interface CacheData<T = any> {
  reference: string;
  data: T;
  createdAt: string;
  expiresAt: string;
}

interface CacheStore {
  [reference: string]: CacheData;
}

export default class GenericCacheService {
  private static cache: CacheStore = {};
  private static cacheFile = path.join(process.cwd(), 'cache', 'generic-cache.json');
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes en millisecondes
  private static readonly CLEANUP_INTERVAL = 60 * 1000; // Nettoyer toutes les minutes
  private static readonly TIMEZONE_OFFSET = 1; // GMT+1 pour le Cameroun
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialise le service et démarre le nettoyage automatique
   */
  public static async initialize(): Promise<void> {
    await this.loadCacheFromFile();
    this.startCleanupTimer();
    console.log('✅ Generic Cache Service initialisé');
  }

  /**
   * Stocke des données dans le cache avec une référence unique
   * @param reference - Référence unique (ex: OTP)
   * @param data - Données à stocker (type any)
   * @returns boolean - true si stocké avec succès, false sinon
   */
  public static async store(reference: string, data: any): Promise<boolean> {
    try {
      // Nettoyer les données expirées
      await this.cleanupExpired();

      // Vérifier si la référence existe déjà
      if (this.cache[reference]) {
        console.log(`⚠️ Référence ${reference} existe déjà dans le cache`);
        return false;
      }

      const now = this.getCameroonTime();
      const expiresAt = new Date(now.getTime() + this.CACHE_EXPIRY);

      // Stocker dans le cache mémoire
      this.cache[reference] = {
        reference,
        data,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      // Sauvegarder dans le fichier
      await this.saveCacheToFile();

      console.log(
        `✅ Données stockées avec référence ${reference} (expire dans ${this.CACHE_EXPIRY / 1000}s)`,
      );
      console.log(`📊 Cache actuel: ${Object.keys(this.cache).length} entrée(s)`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors du stockage:', error.message);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  /**
   * Vérifie si une référence existe dans le cache
   * @param reference - Référence à vérifier
   * @returns boolean - true si existe et non expiré, false sinon
   */
  public static exists(reference: string): boolean {
    const cacheData = this.cache[reference];

    if (!cacheData) {
      return false;
    }

    // Vérifier l'expiration
    const now = this.getCameroonTime();
    const expiresAt = new Date(cacheData.expiresAt);

    if (now > expiresAt) {
      // Supprimer si expiré
      delete this.cache[reference];
      return false;
    }

    return true;
  }

  /**
   * Récupère les données depuis le cache
   * @param reference - Référence unique
   * @returns CacheData | null - Données si trouvées et valides, null sinon
   */
  public static async retrieve<T = any>(reference: string): Promise<T | null> {
    try {
      // Nettoyer les données expirées
      await this.cleanupExpired();

      const cacheData = this.cache[reference];

      if (!cacheData) {
        console.log('❌ Référence inexistante ou expirée:', reference);
        return null;
      }

      // Vérifier l'expiration
      const now = this.getCameroonTime();
      const expiresAt = new Date(cacheData.expiresAt);

      if (now > expiresAt) {
        console.log('❌ Référence expirée:', reference);
        await this.delete(reference);
        return null;
      }

      console.log(`✅ Données récupérées avec succès pour la référence ${reference}`);
      return cacheData.data as T;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   * @param reference - Référence à supprimer
   * @returns boolean - true si supprimé, false sinon
   */
  public static async delete(reference: string): Promise<boolean> {
    try {
      if (!this.cache[reference]) {
        console.log(`⚠️ Référence ${reference} non trouvée dans le cache`);
        return false;
      }

      delete this.cache[reference];
      await this.saveCacheToFile();

      console.log(`✅ Référence ${reference} supprimée avec succès`);
      console.log(`📊 Entrées restantes: ${Object.keys(this.cache).length}`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression:', error.message);
      return false;
    }
  }

  /**
   * Nettoie toutes les entrées expirées
   */
  public static async cleanupExpired(): Promise<void> {
    try {
      const now = this.getCameroonTime();
      const expiredRefs: string[] = [];

      for (const [ref, data] of Object.entries(this.cache)) {
        const expiresAt = new Date(data.expiresAt);
        if (now > expiresAt) {
          expiredRefs.push(ref);
        }
      }

      if (expiredRefs.length > 0) {
        for (const ref of expiredRefs) {
          delete this.cache[ref];
        }

        await this.saveCacheToFile();
        console.log(`🧹 Nettoyage: ${expiredRefs.length} entrée(s) expirée(s) supprimée(s)`);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du nettoyage:', error.message);
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  public static getStats(): {
    totalEntries: number;
    expiredEntries: number;
    activeEntries: number;
  } {
    const now = this.getCameroonTime();
    let expiredCount = 0;
    let activeCount = 0;

    for (const data of Object.values(this.cache)) {
      const expiresAt = new Date(data.expiresAt);
      if (now > expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      totalEntries: Object.keys(this.cache).length,
      expiredEntries: expiredCount,
      activeEntries: activeCount,
    };
  }

  /**
   * Liste toutes les entrées actives (pour debug)
   */
  public static listActive(): Array<{
    reference: string;
    expiresAt: string;
    createdAt: string;
  }> {
    const now = this.getCameroonTime();
    const active = [];

    for (const [ref, data] of Object.entries(this.cache)) {
      const expiresAt = new Date(data.expiresAt);
      if (now <= expiresAt) {
        active.push({
          reference: ref,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
        });
      }
    }

    return active;
  }

  /**
   * Vide complètement le cache
   */
  public static async clearCache(): Promise<void> {
    this.cache = {};
    await this.saveCacheToFile();
    console.log('🗑️ Cache vidé complètement');
  }

  /**
   * Arrête le timer de nettoyage
   */
  public static stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('⏹️ Timer de nettoyage arrêté');
    }
  }

  /**
   * Ferme proprement le service
   */
  public static async shutdown(): Promise<void> {
    this.stopCleanupTimer();
    await this.saveCacheToFile();
    console.log('👋 Generic Cache Service arrêté');
  }

  /**
   * Recherche une entrée dans le cache par une propriété spécifique des données
   * @param searchFn - Fonction de recherche qui retourne true si l'entrée correspond
   * @returns string | null - La référence trouvée ou null
   */
  public static findByData(searchFn: (data: any) => boolean): string | null {
    const now = this.getCameroonTime();

    for (const [ref, cacheData] of Object.entries(this.cache)) {
      // Vérifier si l'entrée n'est pas expirée
      const expiresAt = new Date(cacheData.expiresAt);
      if (now <= expiresAt) {
        // Appliquer la fonction de recherche
        if (searchFn(cacheData.data)) {
          return ref;
        }
      }
    }

    return null;
  }

  public static findByEmail(searchFn: (data: any) => boolean): CacheData | null {
    // const now = this.getCameroonTime();

    for (const [ref, cacheData] of Object.entries(this.cache)) {
      // Vérifier si l'entrée n'est pas expirée
      // const expiresAt = new Date(cacheData.expiresAt);
      // if (now <= expiresAt) {
      // Appliquer la fonction de recherche
      if (searchFn(cacheData.data)) {
        return cacheData;
      }
      // }
    }

    return null;
  }

  /**
   * Supprime toutes les entrées correspondant à un critère
   * @param searchFn - Fonction de recherche
   * @returns number - Nombre d'entrées supprimées
   */
  public static async deleteByData(searchFn: (data: any) => boolean): Promise<number> {
    const now = this.getCameroonTime();
    const toDelete: string[] = [];

    for (const [ref, cacheData] of Object.entries(this.cache)) {
      const expiresAt = new Date(cacheData.expiresAt);
      if (now <= expiresAt && searchFn(cacheData.data)) {
        toDelete.push(ref);
      }
    }

    for (const ref of toDelete) {
      delete this.cache[ref];
    }

    if (toDelete.length > 0) {
      await this.saveCacheToFile();
      console.log(`🗑️ ${toDelete.length} entrée(s) supprimée(s) par critère de recherche`);
    }

    return toDelete.length;
  }

  /**
   * Obtient la date/heure locale du Cameroun (GMT+1)
   */
  public static getCameroonTime(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + this.TIMEZONE_OFFSET * 3600000);
  }

  /**
   * Charge le cache depuis le fichier JSON
   */
  private static async loadCacheFromFile(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      try {
        await fs.access(this.cacheFile);
        const data = await fs.readFile(this.cacheFile, 'utf8');
        const parsed = JSON.parse(data);

        this.cache = parsed.cache || {};

        // Nettoyer les entrées expirées au chargement
        await this.cleanupExpired();

        console.log(`📦 Cache chargé: ${Object.keys(this.cache).length} entrée(s)`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          this.cache = {};
          await this.saveCacheToFile();
          console.log('📦 Cache initialisé (vide)');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement cache:', error.message);
      this.cache = {};
    }
  }

  /**
   * Sauvegarde le cache dans le fichier JSON
   */
  private static async saveCacheToFile(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      const data = {
        cache: this.cache,
        lastUpdate: this.getCameroonTime().toISOString(),
        stats: {
          totalEntries: Object.keys(this.cache).length,
        },
      };

      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2), 'utf8');

      console.log(`💾 Cache sauvegardé (${Object.keys(this.cache).length} entrée(s))`);
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde cache:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  /**
   * Démarre le timer de nettoyage automatique
   */
  private static startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpired();
    }, this.CLEANUP_INTERVAL);

    console.log(`⏰ Timer de nettoyage démarré (toutes les ${this.CLEANUP_INTERVAL / 1000}s)`);
  }
}
