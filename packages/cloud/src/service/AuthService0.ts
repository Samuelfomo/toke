import { apiRequest } from '@/tools/Fetch.Client';

// Interface pour les credentials de connexion
export interface LoginCredentials {
  email: string;
  customer_code: string;
  password?: string;
}

// Interface pour la réponse de l'API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
const EXPIRATION_DURATION_MS = 24 * 60 * 60 * 1000;

export default class AuthService {
  /**
   * Connexion utilisateur - Envoie l'OTP
   */
  static async login(credentials: LoginCredentials): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: '/tenant/auth',
        method: 'POST',
        data: {
          email: credentials.email,
          code: credentials.customer_code,
        },
      });

      // Transformer le message serveur en message convivial
      const userFriendlyMessage = this.formatLoginSuccessMessage(response.message);

      return {
        success: true,
        message: userFriendlyMessage,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      return this.handleError(error);
    }
  }
  static async retry(email: string): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: '/tenant/retry',
        method: 'POST',
        data: {
          email
        },
      });

      // Transformer le message serveur en message convivial
      const userFriendlyMessage = this.formatLoginSuccessMessage(response.message);

      return {
        success: true,
        message: userFriendlyMessage,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      return this.handleError(error);
    }
  }

  /**
   * Vérification de l'OTP
   */
  static async verifyOtp(otp: string): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: `/tenant/verify-otp/${otp}`,
        method: 'GET',
      });

      // Transformer le message serveur en message convivial
      const userFriendlyMessage = this.formatOtpSuccessMessage(
        response.data?.message || response.message
      );

      return {
        success: response.success,
        message: userFriendlyMessage,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Erreur lors de la vérification OTP:', error);
      return this.handleOtpError(error);
    }
  }

  /**
   * Formate les messages de succès de connexion
   */
  private static formatLoginSuccessMessage(serverMessage: string): string {
    const lower = serverMessage?.toLowerCase() || '';

    // Détecter les différents types de messages de succès
    if (lower.includes('otp') && lower.includes('envoyé')) {
      return '📧 Code de vérification envoyé ! Consultez votre boîte email.';
    }
    if (lower.includes('email') && lower.includes('envoyé')) {
      return '✅ Un email contenant votre code a été envoyé avec succès.';
    }
    if (lower.includes('success') || lower.includes('succès')) {
      return '✅ Demande envoyée avec succès ! Vérifiez votre email.';
    }

    // Message par défaut si aucun pattern ne correspond
    return '✅ Code de vérification envoyé à votre adresse email.';
  }

  /**
   * Formate les messages de succès OTP
   */
  private static formatOtpSuccessMessage(serverMessage: string): string {
    const lower = serverMessage?.toLowerCase() || '';

    if (lower.includes('vérifié') || lower.includes('verified')) {
      return '🎉 Connexion réussie ! Bienvenue.';
    }
    if (lower.includes('valid') && lower.includes('success')) {
      return '✨ Code validé avec succès ! Redirection en cours...';
    }
    if (lower.includes('authentification') && lower.includes('réussie')) {
      return '🔓 Authentification réussie ! Accès autorisé.';
    }

    return '✅ Code vérifié avec succès !';
  }

  /**
   * Extrait le message d'erreur réel de la réponse serveur
   */
  private static extractErrorMessage(error: any): string {
    // Si c'est une string JSON, essayer de la parser
    if (typeof error.message === 'string') {
      try {
        // Chercher le pattern HTTP XXX - {...}
        const jsonMatch = error.message.match(/HTTP \d+ - (.+)$/);
        if (jsonMatch) {
          const jsonPart = jsonMatch[1];
          const parsed = JSON.parse(jsonPart);

          // Extraire le message le plus pertinent
          return parsed.error?.message ||
            parsed.message ||
            parsed.error?.code ||
            error.message;
        }
      } catch (e) {
        // Si le parsing échoue, continuer avec le message original
      }
    }

    return error.message || 'UNKNOWN_ERROR';
  }

  /**
   * Gère les erreurs de manière centralisée avec messages conviviaux
   */
  public static handleError(error: any): ApiResponse {
    // Extraire le vrai message d'erreur
    const technicalError = this.extractErrorMessage(error);
    const lowerError = technicalError.toLowerCase();

    let userMessage = '';

    // 🔒 ERREURS D'AUTHENTIFICATION (401)
    if (error.status === 401 || lowerError.includes('401') ||
      lowerError.includes('authentication_failed') ||
      lowerError.includes('unauthorized')) {
      userMessage = '🔒 Email ou code client incorrect. Veuillez vérifier vos informations.';
    }
    // 🔍 ERREURS 404 - Non trouvé
    else if (error.status === 404 || lowerError.includes('404') ||
      lowerError.includes('not found') || lowerError.includes('introuvable')) {
      userMessage = '🔍 Aucun compte trouvé avec ces informations.';
    }
    // ❌ ERREURS 400 - Données invalides
    else if (error.status === 400 || lowerError.includes('400') ||
      lowerError.includes('bad request') || lowerError.includes('invalid')) {
      userMessage = '⚠️ Les informations saisies sont incorrectes. Veuillez vérifier.';
    }
    // 🚨 ERREURS 403 - Accès refusé
    else if (error.status === 403 || lowerError.includes('403') ||
      lowerError.includes('forbidden')) {
      userMessage = '🚨 Accès refusé. Votre compte peut être désactivé.';
    }
    // 🚦 ERREURS 429 - Trop de requêtes
    else if (error.status === 429 || lowerError.includes('429') ||
      lowerError.includes('too many')) {
      userMessage = '🚦 Trop de tentatives. Attendez quelques minutes avant de réessayer.';
    }
    // 🔧 ERREURS 500 - Serveur
    else if (error.status === 500 || lowerError.includes('500') ||
      lowerError.includes('internal server')) {
      userMessage = '🔧 Problème technique temporaire. Réessayez dans quelques instants.';
    }
    // ⚙️ ERREURS 503 - Service indisponible
    else if (error.status === 503 || lowerError.includes('503') ||
      lowerError.includes('service unavailable')) {
      userMessage = '⚙️ Service temporairement indisponible. Veuillez patienter.';
    }
    // 📡 ERREURS RÉSEAU
    else if (lowerError.includes('failed to fetch') ||
      lowerError.includes('networkerror') ||
      lowerError.includes('err_network')) {
      userMessage = '📡 Problème de connexion internet. Vérifiez votre réseau et réessayez.';
    }
    // ⏱️ ERREURS TIMEOUT
    else if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
      userMessage = '⏱️ La connexion prend trop de temps. Veuillez réessayer.';
    }
    // 📧 ERREURS SPÉCIFIQUES EMAIL
    else if (lowerError.includes('email')) {
      if (lowerError.includes('invalid') || lowerError.includes('invalide')) {
        userMessage = '📧 Format d\'email invalide. Exemple: nom@entreprise.com';
      } else if (lowerError.includes('not found') || lowerError.includes('introuvable')) {
        userMessage = '🔍 Aucun compte associé à cette adresse email.';
      } else {
        userMessage = '📧 Problème avec l\'adresse email fournie.';
      }
    }
    // 🏷️ ERREURS SPÉCIFIQUES CODE CLIENT
    else if (lowerError.includes('code') || lowerError.includes('customer')) {
      userMessage = '🏷️ Code client invalide ou introuvable.';
    }
    // ⚠️ MESSAGE GÉNÉRIQUE
    else {
      userMessage = '⚠️ Une erreur est survenue. Veuillez réessayer ou contacter le support.';
    }

    // Log l'erreur technique pour le débogage (ne pas l'afficher à l'utilisateur)
    console.error('Erreur technique:', technicalError);

    return {
      success: false,
      message: userMessage, // SEULEMENT le message convivial
      error: technicalError, // Erreur technique pour les logs
    };
  }

  /**
   * Gère spécifiquement les erreurs OTP
   */
  private static handleOtpError(error: any): ApiResponse {
    const technicalError = this.extractErrorMessage(error);
    const lowerError = technicalError.toLowerCase();

    let userMessage = '';

    // 🔢 ERREURS SPÉCIFIQUES OTP
    if (lowerError.includes('invalid otp') || lowerError.includes('otp invalide') ||
      lowerError.includes('incorrect') || lowerError.includes('wrong')) {
      userMessage = '❌ Code incorrect. Vérifiez le code reçu par email.';
    }
    else if (lowerError.includes('expired') || lowerError.includes('expiré')) {
      userMessage = '⏰ Code expiré. Demandez un nouveau code.';
    }
    else if (lowerError.includes('utilisé') || lowerError.includes('used') ||
      lowerError.includes('already')) {
      userMessage = '🔄 Code déjà utilisé. Demandez un nouveau code.';
    }
    else if (lowerError.includes('too many attempts') ||
      lowerError.includes('trop de tentatives')) {
      userMessage = '🚫 Trop de tentatives. Attendez 15 minutes avant de réessayer.';
    }
    // Utiliser la gestion d'erreur générique si pas d'erreur OTP spécifique
    else {
      return this.handleError(error);
    }

    // Log l'erreur technique pour le débogage
    console.error('Erreur technique OTP:', technicalError);

    return {
      success: false,
      message: userMessage, // SEULEMENT le message convivial
      error: technicalError, // Erreur technique pour les logs
    };
  }

  // /**
  //  * Nettoie les données d'authentification
  //  */
  // static clearAuthData(): void {
  //   sessionStorage.removeItem('auth_token');
  //   sessionStorage.removeItem('user_data');
  //   sessionStorage.removeItem('login_email');
  //   sessionStorage.removeItem('customer_code');
  // }
  //
  // /**
  //  * Vérifie si l'utilisateur est authentifié
  //  */
  // static isAuthenticated(): boolean {
  //   return !!sessionStorage.getItem('auth_token');
  // }
  //
  // /**
  //  * Récupère le token d'authentification
  //  */
  // static getAuthToken(): string | null {
  //   return sessionStorage.getItem('auth_token');
  // }
  //
  // /**
  //  * Récupère les données utilisateur stockées
  //  */
  // static getUserData(): any | null {
  //   const userData = sessionStorage.getItem('user_data');
  //   return userData ? JSON.parse(userData) : null;
  // }

  /**
   * 🆕 Stocke le token et les données utilisateur AVEC l'horodatage d'expiration de 24h.
   * Utilise localStorage pour la persistance au-delà de la session.
   */
  static setAuthData(token: string, userData: any): void {
    const now = Date.now();
    const expirationTime = now + EXPIRATION_DURATION_MS;

    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('token_expiration', expirationTime.toString());

    // Conserver les données de login pour l'OTP
    // sessionStorage.setItem('login_email', '...');
    // sessionStorage.setItem('customer_code', '...');
  }

  /**
   * 🧹 Nettoie toutes les données d'authentification et d'expiration du localStorage.
   * Modifié pour utiliser localStorage.
   */
  static clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expiration');

    // Garder le nettoyage du sessionStorage pour la compatibilité
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    sessionStorage.removeItem('login_email');
    sessionStorage.removeItem('customer_code');
  }

  /**
   * ⏱️ Vérifie si le token d'authentification a expiré.
   * Si expiré, nettoie les données.
   */
  static isTokenExpired(): boolean {
    const expirationTimeStr = localStorage.getItem('token_expiration');

    if (!expirationTimeStr) {
      return true; // Pas d'expiration = non connecté
    }

    const expirationTime = parseInt(expirationTimeStr, 10);
    const now = Date.now();

    if (now >= expirationTime) {
      this.clearAuthData(); // Nettoie le cache si le temps est écoulé
      return true;
    }

    return false;
  }

  /**
   * 🔒 Vérifie si l'utilisateur est authentifié ET si le token n'a pas expiré (la logique de 24h).
   */
  static isAuthenticated(): boolean {
    const tokenExists = !!localStorage.getItem('authData');

    if (!tokenExists) {
      return false;
    }

    // Vérifie l'expiration et nettoie si nécessaire
    return !this.isTokenExpired();
  }

  /**
   * Récupère le token d'authentification (Modifié pour utiliser localStorage).
   */
  static getAuthToken(): string | null {
    return localStorage.getItem('authData');
  }

  /**
   * Récupère les données utilisateur stockées (Modifié pour utiliser localStorage).
   */
  static getUserData(): any | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

}