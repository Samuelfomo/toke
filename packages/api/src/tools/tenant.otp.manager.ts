import Redis from 'ioredis';

import GenerateOtp from '../utils/generate.otp.js';

export interface OTPData {
  phone: string;
  createdAt: Date;
  attempts: number;
}

export default class TenantOtpManager {
  private redis: Redis;
  private readonly OTP_EXPIRY = 300; // 5 minutes en secondes
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_PREFIX = 'otp:';
  private readonly TENANT_OTP_PREFIX = 'tenant_otp:';

  constructor(redisConfig?: any) {
    this.redis = new Redis(
      redisConfig || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
    );

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  /**
   * Génère un OTP unique et le stocke en mémoire Redis
   * @param phone - Numero de le tenant
   * @returns OTP généré ou null si erreur
   */
  async generateAndStoreOTP(phone: string): Promise<string | null> {
    try {
      // Vérifier si le tenant a déjà un OTP en cours
      const existingOTP = await this.getUserCurrentOTP(phone);
      if (existingOTP) {
        await this.deleteOTP(existingOTP);
      }

      let otp: string;
      let isUnique = false;
      let attempts = 0;
      const maxGenerationAttempts = 10;

      // Générer un OTP unique
      do {
        otp = GenerateOtp.generateOTP(6);
        const exists = await this.redis.exists(`${this.OTP_PREFIX}${otp}`);
        isUnique = !exists;
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

      const otpData: OTPData = {
        phone,
        createdAt: new Date(),
        attempts: 0,
      };

      // Transaction Redis pour garantir la cohérence
      const pipeline = this.redis.pipeline();

      // Stocker l'OTP avec les données tenant
      pipeline.setex(`${this.OTP_PREFIX}${otp}`, this.OTP_EXPIRY, JSON.stringify(otpData));

      // Créer un index inverse pour retrouver l'OTP par phone
      pipeline.setex(`${this.TENANT_OTP_PREFIX}${phone}`, this.OTP_EXPIRY, otp);

      const results = await pipeline.exec();

      // Vérifier que toutes les opérations ont réussi
      if (results?.some(([error]) => error)) {
        console.error("❌ Erreur lors du stockage de l'OTP:", results);
        return null;
      }

      console.log(
        `✅ OTP généré et stocké pour le tenant ${phone} (expire dans ${this.OTP_EXPIRY}s)`,
      );
      return otp;
    } catch (error: any) {
      console.error("❌ Erreur lors de la génération de l'OTP:", error);
      return null;
    }
  }

  /**
   * Vérifie un OTP et retourne les données tenant si valide
   * @param otp - OTP à vérifier
   * @returns Données tenant si OTP valide, null sinon
   */
  async verifyOTP(otp: string): Promise<OTPData | null> {
    try {
      const otpKey = `${this.OTP_PREFIX}${otp}`;
      const otpDataStr = await this.redis.get(otpKey);

      if (!otpDataStr) {
        console.log('❌ OTP inexistant ou expiré:', otp);
        return null;
      }

      const otpData: OTPData = JSON.parse(otpDataStr);

      // Incrémenter le nombre de tentatives
      otpData.attempts++;

      if (otpData.attempts > this.MAX_ATTEMPTS) {
        console.log("❌ Nombre maximum de tentatives dépassé pour l'OTP:", otp);
        await this.deleteOTP(otp);
        return null;
      }

      // Mettre à jour le compteur de tentatives
      await this.redis.setex(otpKey, await this.redis.ttl(otpKey), JSON.stringify(otpData));

      console.log(`✅ OTP vérifié avec succès pour le tenant ${otpData.phone}`);
      return otpData;
    } catch (error: any) {
      console.error("❌ Erreur lors de la vérification de l'OTP:", error);
      return null;
    }
  }

  /**
   * Supprime un OTP de la mémoire Redis
   * @param otp - OTP à supprimer
   * @returns true si supprimé avec succès
   */
  async deleteOTP(otp: string): Promise<boolean> {
    try {
      // Récupérer les données avant suppression pour nettoyer l'index inverse
      const otpDataStr = await this.redis.get(`${this.OTP_PREFIX}${otp}`);

      const pipeline = this.redis.pipeline();
      pipeline.del(`${this.OTP_PREFIX}${otp}`);

      if (otpDataStr) {
        const otpData: OTPData = JSON.parse(otpDataStr);
        pipeline.del(`${this.TENANT_OTP_PREFIX}${otpData.phone}`);
      }

      const results = await pipeline.exec();
      const deleted = results?.[0]?.[1] as number;

      if (deleted > 0) {
        console.log(`✅ OTP supprimé avec succès: ${otp}`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("❌ Erreur lors de la suppression de l'OTP:", error);
      return false;
    }
  }

  /**
   * Récupère l'OTP actuel d'un tenant s'il existe
   * @param phone - Number du tenant
   * @returns OTP actuel ou null
   */
  async getUserCurrentOTP(phone: string): Promise<string | null> {
    try {
      return await this.redis.get(`${this.TENANT_OTP_PREFIX}${phone}`);
    } catch (error: any) {
      console.error("❌ Erreur lors de la récupération de l'OTP du tenant:", error);
      return null;
    }
  }

  /**
   * Nettoie tous les OTP expirés (optionnel, Redis le fait automatiquement)
   */
  async cleanup(): Promise<void> {
    try {
      const otpKeys = await this.redis.keys(`${this.OTP_PREFIX}*`);
      const userOtpKeys = await this.redis.keys(`${this.TENANT_OTP_PREFIX}*`);

      const expiredKeys = [];

      for (const key of [...otpKeys, ...userOtpKeys]) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) {
          // Clé expirée
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.redis.del(...expiredKeys);
        console.log(`🧹 Nettoyage terminé: ${expiredKeys.length} clés expirées supprimées`);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
  /**
   * Ferme la connexion Redis
   */
  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }

  /**
   * Statistiques des OTP en cours
   */
  async getStats(): Promise<{ totalOTPs: number; totalUserMappings: number }> {
    try {
      const otpKeys = await this.redis.keys(`${this.OTP_PREFIX}*`);
      const userOtpKeys = await this.redis.keys(`${this.TENANT_OTP_PREFIX}*`);

      return {
        totalOTPs: otpKeys.length,
        totalUserMappings: userOtpKeys.length,
      };
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      return { totalOTPs: 0, totalUserMappings: 0 };
    }
  }
}
