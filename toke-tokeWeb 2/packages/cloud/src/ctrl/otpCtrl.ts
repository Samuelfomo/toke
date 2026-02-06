import AuthService from '../service/AuthService';

import { useUserStore } from '@/stores/userStore';

// Typage pour le résultat de la validation de l'OTP
export interface OtpValidationResult {
  isValid: boolean;
  errors: string[];
}

// Typage pour le résultat de la vérification de l'OTP par l'API
export interface OtpVerificationResponse {
  success: boolean;
  message?: string;
  user?: any;
  errors?: string[];
  attemptsRemaining?: number; // Nombre de tentatives restantes
}

// Configuration de l'OTP
interface OtpConfig {
  minLength: number;
  maxLength: number;
  maxAttempts: number;
  blockDuration: number; // en minutes
}

export default class AuthCtrl {

  // Configuration par défaut
  private static config: OtpConfig = {
    minLength: 4,
    maxLength: 8,
    maxAttempts: 5,
    blockDuration: 15
  };

  // Cache pour les tentatives échouées (en production, utilisez Redis ou une DB)
  private static failedAttempts = new Map<string, { count: number; blockedUntil?: Date }>();

  // --- Logique de validation et de nettoyage ---

  /**
   * Valide le code OTP saisi par l'utilisateur
   */
  private static validateOtp(otp: string): OtpValidationResult {
    const errors: string[] = [];

    // Vérifier si l'OTP est fourni
    if (!otp || otp.trim() === '') {
      errors.push('Le code OTP est requis');
      return { isValid: false, errors };
    }

    const trimmedOtp = otp.trim();

    // Vérifier si l'OTP contient uniquement des chiffres
    if (!/^\d+$/.test(trimmedOtp)) {
      errors.push('Le code OTP doit contenir uniquement des chiffres');
    }

    // Vérifier la longueur de l'OTP
    if (trimmedOtp.length < this.config.minLength) {
      errors.push(`Le code OTP doit contenir au moins ${this.config.minLength} chiffres`);
    }

    if (trimmedOtp.length > this.config.maxLength) {
      errors.push(`Le code OTP ne peut pas dépasser ${this.config.maxLength} chiffres`);
    }

    // Vérifier que l'OTP n'est pas une séquence évidente
    if (trimmedOtp.length >= 4 && this.isSequentialOrRepeated(trimmedOtp)) {
      errors.push('Le code OTP semble invalide (séquence non autorisée)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie si l'OTP est une séquence ou répétition évidente
   */
  private static isSequentialOrRepeated(otp: string): boolean {
    // Vérifier les répétitions (0000, 1111, etc.)
    if (new Set(otp).size === 1) {
      return true;
    }

    // Vérifier les séquences simples (1234, 4321, etc.)
    let isAscending = true;
    let isDescending = true;

    for (let i = 1; i < otp.length; i++) {
      const current = parseInt(otp[i]);
      const previous = parseInt(otp[i - 1]);

      if (current !== previous + 1) {
        isAscending = false;
      }
      if (current !== previous - 1) {
        isDescending = false;
      }
    }

    return isAscending || isDescending;
  }

  /**
   * Nettoie et formate l'OTP
   */
  private static sanitizeOtp(otp: string): string {
    if (!otp) return '';
    // Supprimer tous les caractères non numériques et les espaces
    return otp.replace(/\D/g, '');
  }

  /**
   * Valide l'identifiant (email ou téléphone)
   */
  private static validateIdentifier(identifier: string): { isValid: boolean; error?: string } {
    if (!identifier || identifier.trim() === '') {
      return { isValid: false, error: 'L\'identifiant est requis' };
    }

    const trimmed = identifier.trim();

    // Vérifier si c'est un email valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Vérifier si c'est un numéro de téléphone valide (format international)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!emailRegex.test(trimmed) && !phoneRegex.test(trimmed)) {
      return { isValid: false, error: 'Format d\'identifiant invalide (email ou téléphone requis)' };
    }

    return { isValid: true };
  }

  /**
   * Vérifie si l'utilisateur est bloqué suite à trop de tentatives
   */
  private static isUserBlocked(identifier: string): { blocked: boolean; remainingTime?: number } {
    const attempts = this.failedAttempts.get(identifier);

    if (!attempts || !attempts.blockedUntil) {
      return { blocked: false };
    }

    const now = new Date();
    if (now < attempts.blockedUntil) {
      const remainingMs = attempts.blockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { blocked: true, remainingTime: remainingMinutes };
    }

    // Le blocage est expiré, réinitialiser
    this.failedAttempts.delete(identifier);
    return { blocked: false };
  }

  /**
   * Enregistre une tentative échouée
   */
  private static recordFailedAttempt(identifier: string): void {
    const attempts = this.failedAttempts.get(identifier) || { count: 0 };
    attempts.count++;

    if (attempts.count >= this.config.maxAttempts) {
      // Bloquer l'utilisateur
      const blockedUntil = new Date();
      blockedUntil.setMinutes(blockedUntil.getMinutes() + this.config.blockDuration);
      attempts.blockedUntil = blockedUntil;

      console.warn(`🚫 Utilisateur ${identifier} bloqué jusqu'à ${blockedUntil.toISOString()}`);
    }

    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * Réinitialise les tentatives échouées (après succès)
   */
  private static resetFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Calcule le nombre de tentatives restantes
   */
  private static getRemainingAttempts(identifier: string): number {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts) return this.config.maxAttempts;
    return Math.max(0, this.config.maxAttempts - attempts.count);
  }

  // --- Fonctions de gestion des logs ---

  private static handleSuccessfulOtpVerification(user: any, identifier: string): void {
    console.log('✅ Vérification OTP réussie:', {
      identifier,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
    // Exemple: Analytics, métriques, etc.
  }

  private static handleOtpVerificationError(error: string, identifier: string): void {
    console.error('❌ Échec de la vérification OTP:', {
      identifier,
      error,
      timestamp: new Date().toISOString()
    });
    // Exemple: Log des erreurs, alertes de sécurité
  }

  // --- Méthodes Publiques du Contrôleur ---

  /**
   * Méthode principale pour vérifier l'OTP
   * @param otp Le code OTP saisi par l'utilisateur
   */
  public static async verifyOtp(otp: string): Promise<OtpVerificationResponse> {
    // 3. Nettoyer et valider l'OTP.
    // const cleanOtp = this.sanitizeOtp(otp);
    const validation = this.validateOtp(otp);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        message: 'OTP invalide',
      };
    }

    let result: OtpVerificationResponse;

    try {
      // 4. Appel du Service d'Authentification
      const serviceResponse = await AuthService.verifyOtp(otp);

      if (serviceResponse.success) {

        // Extraire les données utilisateur depuis data
        const userData = (serviceResponse as any).data || (serviceResponse as any).user;
        result = {
          success: serviceResponse.success,
          user: serviceResponse.data,
          message: serviceResponse.message || 'Vérification OTP réussie'
        };
        const dataStore = {
          success: serviceResponse.success,
          data: serviceResponse.data,
        }
        useUserStore().setAuthData(dataStore);
      } else {

        // Extraire le message d'erreur
        const errorMsg = (serviceResponse as any).message || (serviceResponse as any).error || 'Code OTP incorrect';
        result = {
          success: false,
          message: errorMsg,
        };
      }
    } catch (error) {
      // Gestion des erreurs réseau ou du service
      const errorMessage = (error as Error).message || 'Erreur inattendue lors de la vérification OTP.';
      result = {
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer.',
        errors: [errorMessage],
      };
    }

    return result;
  }

  /**
   * Obtenir le nombre de tentatives restantes pour un utilisateur
   * (Méthode utilitaire publique si nécessaire)
   */
  public static getAttemptsInfo(identifier: string): {
    remaining: number;
    maxAttempts: number;
    isBlocked: boolean;
    blockedUntil?: Date;
  } {
    const blockStatus = this.isUserBlocked(identifier);
    const attempts = this.failedAttempts.get(identifier);

    return {
      remaining: this.getRemainingAttempts(identifier),
      maxAttempts: this.config.maxAttempts,
      isBlocked: blockStatus.blocked,
      blockedUntil: attempts?.blockedUntil
    };
  }

  /**
   * Réinitialiser manuellement les tentatives (pour les admins)
   */
  public static resetUserAttempts(identifier: string): void {
    this.resetFailedAttempts(identifier);
    console.log(`🔄 Tentatives réinitialisées pour ${identifier}`);
  }

  /**
   * Mettre à jour la configuration de l'OTP
   */
  public static updateConfig(newConfig: Partial<OtpConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration OTP mise à jour:', this.config);
  }
}