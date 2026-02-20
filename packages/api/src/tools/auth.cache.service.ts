import fs from 'fs/promises';
import path from 'path';

import { TimezoneConfigUtils } from '@toke/shared';

/**
 * Structure d'une session QR en cache
 */
export interface QRAuthSession {
  sessionId: string;
  nonce: string;
  status: 'pending' | 'authenticated' | 'expired' | 'rejected';
  createdAt: string;
  expiresAt: string;

  // Données utilisateur (remplies après scan mobile)
  userId?: string;
  userGuid?: string;
  email?: string;
  phone?: string;

  // JWT généré après validation
  token?: string;

  // Métadonnées
  ipAddress?: string;
  userAgent?: string;
}

interface CacheStore {
  [sessionId: string]: QRAuthSession;
}

/**
 * Service de cache dédié à l'authentification par QR code
 * - Stockage temporaire des sessions QR (2 minutes par défaut)
 * - Auto-expiration et nettoyage automatique
 * - Persistance sur fichier pour haute disponibilité
 */
export default class AuthCacheService {
  private static cache: CacheStore = {};
  private static cacheFile = path.join(process.cwd(), 'cache', 'auth-qr-cache.json');
  private static readonly QR_EXPIRY = 6 * 60 * 1000; // 6 minutes
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // Nettoyer toutes les 60s * 5
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialise le service et démarre le nettoyage automatique
   */
  public static async initialize(): Promise<void> {
    await this.loadCacheFromFile();
    this.startCleanupTimer();
    console.log('✅ Auth QR Cache Service initialisé');
  }

  /**
   * Crée une nouvelle session QR
   * @param sessionId - UUID de la session
   * @param nonce - Nonce aléatoire (256 bits)
   * @param metadata - Métadonnées optionnelles
   * @returns boolean - true si créé avec succès
   */
  public static async createSession(
    sessionId: string,
    nonce: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<boolean> {
    try {
      await this.cleanupExpired();

      if (this.cache[sessionId]) {
        console.log(`⚠️ SessionId ${sessionId} existe déjà`);
        return false;
      }

      const now = TimezoneConfigUtils.getCurrentTime();
      const expiresAt = new Date(now.getTime() + this.QR_EXPIRY);

      this.cache[sessionId] = {
        sessionId,
        nonce,
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ...metadata,
      };

      await this.saveCacheToFile();

      console.log(`✅ Session QR créée: ${sessionId} (expire dans ${this.QR_EXPIRY / 1000}s)`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur création session:', error.message);
      return false;
    }
  }

  /**
   * Récupère une session par sessionId
   * @param sessionId - UUID de la session
   * @returns QRAuthSession | null
   */
  public static async getSession(sessionId: string): Promise<QRAuthSession | null> {
    await this.cleanupExpired();

    const session = this.cache[sessionId];

    if (!session) {
      return null;
    }

    // Vérifier expiration
    const now = TimezoneConfigUtils.getCurrentTime();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Récupère le nonce d'une session (nécessaire pour vérifier la signature)
   * @param sessionId - UUID de la session
   * @returns string | null
   */
  public static async getNonce(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId);
    return session?.nonce || null;
  }

  /**
   * Met à jour une session après authentification mobile
   * @param sessionId - UUID de la session
   * @param userData - Données utilisateur
   * @returns boolean - true si mis à jour avec succès
   */
  public static async authenticateSession(
    sessionId: string,
    userData: {
      userId: string;
      userGuid: string;
      email?: string;
      phone?: string;
    },
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        console.log(`❌ Session ${sessionId} introuvable`);
        return false;
      }

      if (session.status !== 'pending') {
        console.log(`❌ Session ${sessionId} déjà traitée (status: ${session.status})`);
        return false;
      }

      // Mettre à jour le statut
      this.cache[sessionId] = {
        ...session,
        status: 'authenticated',
        userId: userData.userId,
        userGuid: userData.userGuid,
        email: userData.email,
        phone: userData.phone,
      };

      await this.saveCacheToFile();

      console.log(`✅ Session ${sessionId} authentifiée pour user ${userData.userGuid}`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur authentification session:', error.message);
      return false;
    }
  }

  /**
   * Associe un JWT à une session authentifiée
   * @param sessionId - UUID de la session
   * @param token - JWT généré
   * @returns boolean
   */
  public static async setToken(sessionId: string, token: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        console.log(`❌ Session ${sessionId} introuvable`);
        return false;
      }

      if (session.status !== 'authenticated') {
        console.log(`❌ Session ${sessionId} non authentifiée`);
        return false;
      }

      this.cache[sessionId] = {
        ...session,
        token,
      };

      await this.saveCacheToFile();

      console.log(`✅ Token JWT associé à la session ${sessionId}`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur association token:', error.message);
      return false;
    }
  }

  /**
   * Marque une session comme rejetée
   * @param sessionId - UUID de la session
   */
  public static async rejectSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        return false;
      }

      this.cache[sessionId] = {
        ...session,
        status: 'rejected',
      };

      await this.saveCacheToFile();

      console.log(`❌ Session ${sessionId} rejetée`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur rejet session:', error.message);
      return false;
    }
  }

  /**
   * Supprime une session du cache
   * @param sessionId - UUID de la session
   */
  public static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      if (!this.cache[sessionId]) {
        return false;
      }

      delete this.cache[sessionId];
      await this.saveCacheToFile();

      console.log(`🗑️ Session ${sessionId} supprimée`);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur suppression session:', error.message);
      return false;
    }
  }

  /**
   * Nettoie toutes les sessions expirées
   */
  public static async cleanupExpired(): Promise<void> {
    try {
      const now = TimezoneConfigUtils.getCurrentTime();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of Object.entries(this.cache)) {
        const expiresAt = new Date(session.expiresAt);
        if (now > expiresAt) {
          expiredSessions.push(sessionId);
        }
      }

      if (expiredSessions.length > 0) {
        for (const sessionId of expiredSessions) {
          // Marquer comme expiré avant suppression
          if (this.cache[sessionId]) {
            this.cache[sessionId].status = 'expired';
          }
          delete this.cache[sessionId];
        }

        await this.saveCacheToFile();
        console.log(`🧹 ${expiredSessions.length} session(s) QR expirée(s) supprimée(s)`);
      }
    } catch (error: any) {
      console.error('❌ Erreur nettoyage:', error.message);
    }
  }

  /**
   * Statistiques du cache
   */
  public static getStats(): {
    total: number;
    pending: number;
    authenticated: number;
    expired: number;
    rejected: number;
  } {
    const stats = {
      total: Object.keys(this.cache).length,
      pending: 0,
      authenticated: 0,
      expired: 0,
      rejected: 0,
    };

    for (const session of Object.values(this.cache)) {
      stats[session.status]++;
    }

    return stats;
  }

  /**
   * Liste toutes les sessions actives (debug)
   */
  public static listActiveSessions(): Array<{
    sessionId: string;
    status: string;
    createdAt: string;
    expiresAt: string;
  }> {
    const now = TimezoneConfigUtils.getCurrentTime();
    const active = [];

    for (const [sessionId, session] of Object.entries(this.cache)) {
      const expiresAt = new Date(session.expiresAt);
      if (now <= expiresAt) {
        active.push({
          sessionId,
          status: session.status,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
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
    console.log('🗑️ Cache auth QR vidé');
  }

  /**
   * Arrête le service proprement
   */
  public static async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    await this.saveCacheToFile();
    console.log('👋 Auth QR Cache Service arrêté');
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

        console.log(`📦 Cache auth QR chargé: ${Object.keys(this.cache).length} session(s)`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          this.cache = {};
          await this.saveCacheToFile();
          console.log('📦 Cache auth QR initialisé (vide)');
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
        lastUpdate: TimezoneConfigUtils.getCurrentTime().toISOString(),
        stats: this.getStats(),
      };

      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde cache:', error.message);
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

    console.log(`⏰ Timer de nettoyage QR démarré (toutes les ${this.CLEANUP_INTERVAL / 1000}s)`);
  }
}
