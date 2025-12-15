// services/otp-cache.service.ts
import fs from 'fs/promises';
import path from 'path';

import { TimezoneConfigUtils } from '@toke/shared';

import GenerateOtp from '../utils/generate.otp.js';

export interface OTPData {
  reference: string;
  otp: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
}

interface OTPCache {
  [otp: string]: OTPData;
}

interface ReferenceOTPIndex {
  [reference: string]: string; // reference -> otp
}

export default class OTPCacheService {
  private static otpCache: OTPCache = {};
  private static referenceIndex: ReferenceOTPIndex = {};
  private static cacheFile = path.join(process.cwd(), 'cache', 'otp.json');
  private static readonly OTP_EXPIRY = 60 * 60 * 1000; // 5 minutes en millisecondes
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly CLEANUP_INTERVAL = 60 * 1000; // Nettoyer toutes les minutes
  private static readonly TIMEZONE_OFFSET = 1; // GMT+1 pour le Cameroun
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialise le service et démarre le nettoyage automatique
   */
  public static async initialize(): Promise<void> {
    await this.loadCacheFromFile();
    this.startCleanupTimer();
    console.log('✅ OTP Cache Service initialisé');
  }

  /**
   * Génère un OTP unique et le stocke dans le cache
   */
  public static async generateAndStoreOTP(reference: string): Promise<string | null> {
    try {
      // Nettoyer les OTP expirés
      await this.cleanupExpiredOTPs();

      // Vérifier si la reference a déjà un OTP en cours
      const existingOTP = this.getUserCurrentOTP(reference);
      if (existingOTP) {
        console.log(`⚠️ OTP existant trouvé pour ${reference}, suppression...`);
        await this.deleteOTP(existingOTP);
      }

      let otp: string;
      let isUnique = false;
      let attempts = 0;
      const maxGenerationAttempts = 10;

      // Générer un OTP unique
      do {
        otp = GenerateOtp.generateOTP(6);
        isUnique = !this.otpCache[otp];
        attempts++;

        if (attempts >= maxGenerationAttempts) {
          console.error(
            '❌ Impossible de générer un OTP unique après',
            maxGenerationAttempts,
            'tentatives',
          );
          return null;
        }
      } while (!isUnique);

      const now = this.getCameroonTime();
      const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY);

      // Stocker l'OTP dans le cache mémoire
      this.otpCache[otp] = {
        reference,
        otp,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
      };
      this.referenceIndex[reference] = otp;

      // Sauvegarder dans le fichier
      await this.saveCacheToFile();

      console.log(
        `✅ OTP ${otp} généré et stocké pour le tenant ${reference} (expire dans ${this.OTP_EXPIRY / 1000}s)`,
      );
      console.log(`📊 Cache actuel: ${Object.keys(this.otpCache).length} OTP(s)`);

      return otp;
    } catch (error: any) {
      console.error("❌ Erreur lors de la génération de l'OTP:", error.message);
      console.error('Stack:', error.stack);
      return null;
    }
  }

  /**
   * Vérifie un OTP et retourne les données si valide
   */
  public static async verifyOTP(otp: string): Promise<OTPData | null> {
    try {
      // Nettoyer les OTP expirés
      await this.cleanupExpiredOTPs();

      const otpData = this.otpCache[otp];

      if (!otpData) {
        console.log('❌ OTP inexistant ou expiré:', otp);
        console.log(`📊 OTPs disponibles: ${Object.keys(this.otpCache).join(', ')}`);
        return null;
      }

      // Vérifier l'expiration
      const now = this.getCameroonTime();
      const expiresAt = new Date(otpData.expiresAt);

      if (now > expiresAt) {
        console.log('❌ OTP expiré:', otp);
        await this.deleteOTP(otp);
        return null;
      }

      // Incrémenter le nombre de tentatives
      otpData.attempts++;

      if (otpData.attempts > this.MAX_ATTEMPTS) {
        console.log("❌ Nombre maximum de tentatives dépassé pour l'OTP:", otp);
        await this.deleteOTP(otp);
        return null;
      }

      // Mettre à jour le cache
      this.otpCache[otp] = otpData;
      await this.saveCacheToFile();

      console.log(
        `✅ OTP vérifié avec succès pour le tenant ${otpData.reference} (tentative ${otpData.attempts}/${this.MAX_ATTEMPTS})`,
      );
      return otpData;
    } catch (error: any) {
      console.error("❌ Erreur lors de la vérification de l'OTP:", error.message);
      return null;
    }
  }

  /**
   * Supprime un OTP du cache
   */
  public static async deleteOTP(otp: string): Promise<boolean> {
    try {
      const otpData = this.otpCache[otp];

      if (!otpData) {
        console.log(`⚠️ OTP ${otp} non trouvé dans le cache`);
        return false;
      }

      // Supprimer de l'index reference
      if (otpData.reference && this.referenceIndex[otpData.reference]) {
        delete this.referenceIndex[otpData.reference];
      }

      // Supprimer l'OTP
      delete this.otpCache[otp];

      await this.saveCacheToFile();
      console.log(`✅ OTP ${otp} supprimé avec succès`);
      console.log(`📊 OTPs restants: ${Object.keys(this.otpCache).length}`);

      return true;
    } catch (error: any) {
      console.error("❌ Erreur lors de la suppression de l'OTP:", error.message);
      return false;
    }
  }

  /**
   * Récupère l'OTP actuel d'un téléreference s'il existe
   */
  public static getUserCurrentOTP(reference: string): string | null {
    const otp = this.referenceIndex[reference];
    if (!otp) {
      return null;
    }

    // Vérifier que l'OTP existe toujours et n'est pas expiré
    const otpData = this.otpCache[otp];
    if (!otpData) {
      delete this.referenceIndex[reference];
      return null;
    }

    const now = this.getCameroonTime();
    const expiresAt = new Date(otpData.expiresAt);

    if (now > expiresAt) {
      delete this.otpCache[otp];
      delete this.referenceIndex[reference];
      return null;
    }

    return otp;
  }

  /**
   * Nettoie tous les OTP expirés
   */
  public static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const now = this.getCameroonTime();
      const expiredOTPs: string[] = [];

      for (const [otp, data] of Object.entries(this.otpCache)) {
        const expiresAt = new Date(data.expiresAt);
        if (now > expiresAt) {
          expiredOTPs.push(otp);
        }
      }

      if (expiredOTPs.length > 0) {
        for (const otp of expiredOTPs) {
          const data = this.otpCache[otp];
          delete this.otpCache[otp];
          if (data && data.reference) {
            delete this.referenceIndex[data.reference];
          }
        }

        await this.saveCacheToFile();
        console.log(`🧹 Nettoyage: ${expiredOTPs.length} OTP(s) expiré(s) supprimé(s)`);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du nettoyage:', error.message);
    }
  }

  /**
   * Statistiques des OTP en cours
   */
  public static getStats(): {
    totalOTPs: number;
    totalReferenceMappings: number;
    expiredOTPs: number;
    activeOTPs: number;
  } {
    const now = this.getCameroonTime();
    let expiredCount = 0;
    let activeCount = 0;

    for (const data of Object.values(this.otpCache)) {
      const expiresAt = new Date(data.expiresAt);
      if (now > expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      totalOTPs: Object.keys(this.otpCache).length,
      totalReferenceMappings: Object.keys(this.referenceIndex).length,
      expiredOTPs: expiredCount,
      activeOTPs: activeCount,
    };
  }

  /**
   * Liste tous les OTP actifs (pour debug)
   */
  public static listActiveOTPs(): Array<{
    otp: string;
    reference: string;
    expiresAt: string;
    attempts: number;
  }> {
    const now = this.getCameroonTime();
    const active = [];

    for (const [otp, data] of Object.entries(this.otpCache)) {
      const expiresAt = new Date(data.expiresAt);
      if (now <= expiresAt) {
        active.push({
          otp,
          reference: data.reference,
          expiresAt: data.expiresAt,
          attempts: data.attempts,
        });
      }
    }

    return active;
  }

  /**
   * Vide complètement le cache
   */
  public static async clearCache(): Promise<void> {
    this.otpCache = {};
    this.referenceIndex = {};
    await this.saveCacheToFile();
    console.log('🗑️ Cache OTP vidé complètement');
  }

  /**
   * Arrête le timer de nettoyage
   */
  public static stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('⏹️ Timer de nettoyage OTP arrêté');
    }
  }

  /**
   * Ferme proprement le service
   */
  public static async shutdown(): Promise<void> {
    this.stopCleanupTimer();
    await this.saveCacheToFile();
    console.log('👋 OTP Cache Service arrêté');
  }

  /**
   * Récupère les données depuis le cache
   * @param reference - Référence unique
   * @returns CacheData | null - Données si trouvées et valides, null sinon
   */
  public static async retrieve(reference: string): Promise<{ reference: string } | null> {
    try {
      // Nettoyer les données expirées
      await this.cleanupExpiredOTPs();

      const cacheData = this.otpCache[reference];

      if (!cacheData) {
        console.log('❌ Référence inexistante ou expirée:', reference);
        return null;
      }

      // Vérifier l'expiration
      const now = this.getCameroonTime();
      const expiresAt = new Date(cacheData.expiresAt);

      if (now > expiresAt) {
        console.log('❌ Référence expirée:', reference);
        await this.deleteOTP(reference);
        return null;
      }

      console.log(`✅ Données récupérées avec succès pour la référence ${reference}`);
      return {
        reference: cacheData.reference,
      };
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      return null;
    }
  }

  /**
   * Obtient la date/heure locale du Cameroun (GMT+1)
   */
  private static getCameroonTime(): Date {
    const now = TimezoneConfigUtils.getCurrentTime();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + this.TIMEZONE_OFFSET * 3600000);
  }

  /**
   * Formate une date au format ISO pour le Cameroun
   */
  private static toCameroonISOString(date: Date): string {
    return this.getCameroonTime().toISOString();
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
        const parsed = JSON.parse(data);

        this.otpCache = parsed.otpCache || {};
        this.referenceIndex = parsed.referenceIndex || {};

        // Nettoyer les OTP expirés au chargement
        await this.cleanupExpiredOTPs();

        console.log(`📦 Cache OTP chargé: ${Object.keys(this.otpCache).length} OTP(s)`);

        // Afficher les OTP actifs pour debug
        if (Object.keys(this.otpCache).length > 0) {
          console.log('📋 OTPs en cache:', Object.keys(this.otpCache).join(', '));
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Fichier n'existe pas, créer un cache vide
          this.otpCache = {};
          this.referenceIndex = {};
          await this.saveCacheToFile();
          console.log('📦 Cache OTP initialisé (vide)');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement cache OTP:', error.message);
      this.otpCache = {};
      this.referenceIndex = {};
    }
  }

  /**
   * Sauvegarde le cache dans le fichier JSON
   */
  private static async saveCacheToFile(): Promise<void> {
    try {
      // Créer le dossier cache s'il n'existe pas
      const cacheDir = path.dirname(this.cacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      const data = {
        otpCache: this.otpCache,
        referenceIndex: this.referenceIndex,
        lastUpdate: this.getCameroonTime().toISOString(),
        stats: {
          totalOTPs: Object.keys(this.otpCache).length,
          totalReferences: Object.keys(this.referenceIndex).length,
        },
      };

      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2), 'utf8');

      console.log(
        `💾 Cache OTP sauvegardé (${Object.keys(this.otpCache).length} OTP(s), ${Object.keys(this.referenceIndex).length} reference(s))`,
      );
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde cache OTP:', error.message);
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
      await this.cleanupExpiredOTPs();
    }, this.CLEANUP_INTERVAL);

    console.log(`⏰ Timer de nettoyage OTP démarré (toutes les ${this.CLEANUP_INTERVAL / 1000}s)`);
  }
}
