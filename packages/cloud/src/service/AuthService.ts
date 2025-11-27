import { apiRequest } from '@/utils/Fetch.Client';

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
      console.log('response obtenue', response);

      // Ici response est déjà ton JSON typé
      return {
        success: true,
        message: response.message || 'Code OTP envoyé avec succès',
        data: response.data,
      };
    } catch (error: any) {
      console.error('response error', error);

      return this.handleError(error);
    }
  }


  // /**
  //  * Vérification du code OTP
  //  */
  // static async verifyOTP(email: string, customerCode: string, otp: string): Promise<ApiResponse> {
  //   try {
  //     const response = await apiRequest({
  //       path: '/tenant/verify-otp',
  //       method: 'POST',
  //       body: JSON.stringify({
  //         email,
  //         customer_code: customerCode,
  //         otp,
  //       }),
  //     });
  //
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Code OTP invalide',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     // Si succès, stocker le token
  //     if (data.success && data.data?.token) {
  //       sessionStorage.setItem('auth_token', data.data.token);
  //       sessionStorage.setItem('user_data', JSON.stringify(data.data.user));
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Authentification réussie',
  //       data: data.data,
  //     };
  //   } catch (error: any) {
  //     return this.handleError(error);
  //   }
  // }
  //
  // /**
  //  * Renvoie un nouveau code OTP
  //  */
  // static async resendOTP(email: string, customerCode: string): Promise<ApiResponse> {
  //   try {
  //     const response = await apiFetch({
  //       path: '/tenant/resend-otp',
  //       method: 'POST',
  //       body: JSON.stringify({
  //         email,
  //         customer_code: customerCode,
  //       }),
  //     });
  //
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Erreur lors du renvoi du code',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Code OTP renvoyé avec succès',
  //       data: data.data,
  //     };
  //   } catch (error: any) {
  //     return this.handleError(error);
  //   }
  // }
  //
  // /**
  //  * Vérifie si un email existe dans le système
  //  */
  // static async checkEmailExists(email: string): Promise<ApiResponse<{ exists: boolean }>> {
  //   try {
  //     const response = await apiFetch({
  //       path: '/tenant/check-email',
  //       method: 'POST',
  //       body: JSON.stringify({ email }),
  //     });
  //
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Erreur lors de la vérification',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Vérification réussie',
  //       data: data.data,
  //     };
  //   } catch (error: any) {
  //     return this.handleError(error);
  //   }
  // }
  //
  // /**
  //  * Déconnexion utilisateur
  //  */
  // static async logout(): Promise<ApiResponse> {
  //   try {
  //     const response = await apiFetch({
  //       path: '/tenant/logout',
  //       method: 'POST',
  //     });
  //
  //     const data = await response.json();
  //
  //     // Nettoyer le stockage local dans tous les cas
  //     this.clearAuthData();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Erreur lors de la déconnexion',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Déconnexion réussie',
  //     };
  //   } catch (error: any) {
  //     // Nettoyer même en cas d'erreur
  //     this.clearAuthData();
  //     return this.handleError(error);
  //   }
  // }
  //
  // /**
  //  * Récupère les informations de l'utilisateur connecté
  //  */
  // static async getCurrentUser(): Promise<ApiResponse> {
  //   try {
  //     const response = await apiFetch({
  //       path: '/tenant/me',
  //       method: 'GET',
  //     });
  //
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Erreur lors de la récupération du profil',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Profil récupéré',
  //       data: data.data,
  //     };
  //   } catch (error: any) {
  //     return this.handleError(error);
  //   }
  // }
  //
  // /**
  //  * Rafraîchit le token d'authentification
  //  */
  // static async refreshToken(): Promise<ApiResponse> {
  //   try {
  //     const response = await apiFetch({
  //       path: '/tenant/refresh-token',
  //       method: 'POST',
  //     });
  //
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         message: data.message || 'Erreur lors du rafraîchissement du token',
  //         error: data.error || `HTTP ${response.status}`,
  //       };
  //     }
  //
  //     if (data.success && data.data?.token) {
  //       sessionStorage.setItem('auth_token', data.data.token);
  //     }
  //
  //     return {
  //       success: true,
  //       message: data.message || 'Token rafraîchi',
  //       data: data.data,
  //     };
  //   } catch (error: any) {
  //     return this.handleError(error);
  //   }
  // }

  /**
   * Nettoie les données d'authentification
   */
  static clearAuthData(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    sessionStorage.removeItem('login_email');
    sessionStorage.removeItem('customer_code');
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  static isAuthenticated(): boolean {
    return !!sessionStorage.getItem('auth_token');
  }

  /**
   * Récupère le token d'authentification
   */
  static getAuthToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  /**
   * Récupère les données utilisateur stockées
   */
  static getUserData(): any | null {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Gère les erreurs de manière centralisée
   */
  private static handleError(error: any): ApiResponse {
    console.error('Service Error:', error);

    // Messages d'erreur conviviaux
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';

    if (error.message) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Impossible de joindre')) {
        errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'La requête a expiré. Veuillez réessayer.';
      } else if (error.message.includes('Réponse invalide')) {
        errorMessage = 'Réponse invalide du serveur. Contactez le support.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: errorMessage,
      error: error.message || 'UNKNOWN_ERROR',
    };
  }
}