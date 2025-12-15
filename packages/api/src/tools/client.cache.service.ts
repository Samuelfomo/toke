// services/client-cache.service.ts
import fs from 'fs/promises';
import path from 'path';

import { TimezoneConfigUtils } from '@toke/shared';

import Client from '../master/class/Client.js';

// import ClientProfile from '../master/class/ClientProfile.js';

interface ClientConfig {
  id: number;
  name: string;
  token: string;
  secret: string;
  active: boolean;
  profile: {
    id: number;
    name: string;
    root: boolean;
    description?: string;
  };
  last_updated: string;
}

interface ClientCache {
  [token: string]: ClientConfig;
}

export default class ClientCacheService {
  private static cache: ClientCache = {};
  private static cacheFile = path.join(process.cwd(), 'cache', 'clients.json');
  private static lastLoadTime = 0;
  private static CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Récupère la configuration d'un client depuis le cache
   */
  public static async getClientConfig(token: string): Promise<ClientConfig | null> {
    // Charger le cache si nécessaire
    if (Object.keys(this.cache).length === 0 || this.shouldReloadCache()) {
      await this.loadCacheFromFile();
    }

    const config = this.cache[token];
    if (!config) {
      console.log(`⚠️ Client avec token '${token}' non trouvé dans le cache`);
      return null;
    }

    if (!config.active) {
      console.log(`⚠️ Client avec token '${token}' est inactif`);
      return null;
    }

    return config;
  }

  /**
   * Ajoute ou met à jour un client dans le cache
   */
  public static async setClientConfig(client: Client): Promise<void> {
    const profile = await client.getProfil();
    if (!profile) {
      throw new Error('Profile is required for caching client');
    }

    this.cache[client.getToken()!] = {
      id: client.getId()!,
      name: client.getName()!,
      token: client.getToken()!,
      secret: client.getSecret()!,
      active: client.isActive()!,
      profile: {
        id: profile.getId()!,
        name: profile.getName()!,
        root: profile.isRoot(),
        description: profile.getDescription(),
      },
      last_updated: TimezoneConfigUtils.getCurrentTime().toISOString(),
    };
    await this.saveCacheToFile();
    console.log(`✅ Configuration client '${client.getName()}' mise à jour dans le cache`);
  }

  /**
   * Supprime un client du cache
   */
  public static async removeClientConfig(token: string): Promise<void> {
    delete this.cache[token];
    await this.saveCacheToFile();
    console.log(`🗑️ Client avec token '${token}' supprimé du cache`);
  }

  /**
   * Met à jour le statut d'un client dans le cache
   */
  public static async updateClientStatus(token: string, active: boolean): Promise<void> {
    if (this.cache[token]) {
      this.cache[token].active = active;
      this.cache[token].last_updated = TimezoneConfigUtils.getCurrentTime().toISOString();
      await this.saveCacheToFile();
      console.log(`✅ Statut client '${token}' mis à jour: ${active}`);
    }
  }

  /**
   * Met à jour les informations d'un client dans le cache
   */
  public static async updateClientInfo(
    token: string,
    updates: Partial<Pick<ClientConfig, 'name' | 'profile'>>,
  ): Promise<void> {
    if (this.cache[token]) {
      if (updates.name) {
        this.cache[token].name = updates.name;
      }
      if (updates.profile) {
        this.cache[token].profile = updates.profile;
      }
      this.cache[token].last_updated = TimezoneConfigUtils.getCurrentTime().toISOString();
      await this.saveCacheToFile();
      console.log(`✅ Informations client '${token}' mises à jour dans le cache`);
    }
  }

  /**
   * Recharge le cache depuis la base de données
   */
  public static async refreshCacheFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Rechargement du cache clients depuis la base de données...');

      const clients = await Client._list({ active: true });
      if (!clients) {
        console.log('Aucun client actif trouvé');
        return;
      }

      // Vider le cache actuel
      this.cache = {};

      // Recharger avec tous les clients actifs
      for (const client of clients) {
        await this.setClientConfig(client);
      }

      console.log(`✅ Cache rechargé avec ${clients.length} client(s) actif(s)`);
    } catch (error) {
      console.error('❌ Erreur rechargement cache clients:', error);
    }
  }

  /**
   * Liste tous les tokens des clients en cache
   */
  public static async listClientTokens(): Promise<string[]> {
    if (Object.keys(this.cache).length === 0) {
      await this.loadCacheFromFile();
    }
    return Object.keys(this.cache);
  }

  /**
   * Vérifie si un client existe dans le cache
   */
  public static async clientExists(token: string): Promise<boolean> {
    if (Object.keys(this.cache).length === 0) {
      await this.loadCacheFromFile();
    }
    return this.cache[token] !== undefined;
  }

  /**
   * Obtient des statistiques sur le cache
   */
  public static getCacheStats(): {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
  } {
    const total = Object.keys(this.cache).length;
    const active = Object.values(this.cache).filter((client) => client.active).length;
    const inactive = total - active;

    return {
      totalClients: total,
      activeClients: active,
      inactiveClients: inactive,
    };
  }

  /**
   * Force le rechargement du cache au prochain accès
   */
  public static invalidateCache(): void {
    this.lastLoadTime = 0;
    console.log('🔄 Cache clients invalidé');
  }

  /**
   * Charge le cache depuis le fichier JSON
   */
  private static async loadCacheFromFile(): Promise<void> {
    try {
      // Créer le dossier cache s'il n'existe pas
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      // Vérifier si le fichier existe
      try {
        await fs.access(this.cacheFile);
        const data = await fs.readFile(this.cacheFile, 'utf8');
        this.cache = JSON.parse(data);
        this.lastLoadTime = Date.now();
        console.log(`📦 Cache clients chargé: ${Object.keys(this.cache).length} client(s)`);
      } catch (error: any) {
        // Fichier n'existe pas, créer un cache vide
        this.cache = {};
        await this.saveCacheToFile();
        console.log('📦 Cache clients initialisé (vide)');
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement cache clients:', error);
      this.cache = {};
    }
  }

  /**
   * Sauvegarde le cache dans le fichier JSON
   */
  private static async saveCacheToFile(): Promise<void> {
    try {
      await fs.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2));
      console.log('💾 Cache clients sauvegardé');
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache clients:', error);
    }
  }

  /**
   * Vérifie si le cache doit être rechargé
   */
  private static shouldReloadCache(): boolean {
    return Date.now() - this.lastLoadTime > this.CACHE_DURATION;
  }
}
