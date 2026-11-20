import AuthService from '../service/AuthService';

export interface LoginValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  customer_code: string;
  password?: string;
}

export default class authCtrl {
  /**
   * Valide l'email pour la connexion
   */
  static validateEmail(email: string | null): LoginValidationResult {
    const errors: string[] = [];

    if (!email || email.trim() === '') {
      errors.push('📧 Veuillez saisir votre adresse email');
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmedEmail)) {
      errors.push('📧 Format d\'email invalide (ex: nom@entreprise.com)');
    }

    if (trimmedEmail.length > 254) {
      errors.push('📧 L\'email est trop long (maximum 254 caractères)');
    }

    if (trimmedEmail.length < 5) {
      errors.push('📧 L\'email est trop court (minimum 5 caractères)');
    }

    const parts = trimmedEmail.split('@');
    if (parts.length === 2) {
      const [localPart, domain] = parts;

      if (localPart.length === 0 || localPart.length > 64) {
        errors.push('⚠️ La partie avant @ de l\'email est invalide');
      }

      if (domain.length < 3 || !domain.includes('.') ||
        domain.startsWith('.') || domain.endsWith('.')) {
        errors.push('⚠️ Le nom de domaine de l\'email est invalide');
      }

      const domainParts = domain.split('.');
      const extension = domainParts[domainParts.length - 1];
      if (extension.length < 2) {
        errors.push('⚠️ L\'extension du domaine est invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide le code client
   */
  static validateCustomerCode(customerCode: string | null): LoginValidationResult {
    const errors: string[] = [];

    if (!customerCode || customerCode.trim() === '') {
      errors.push('🏷️ Veuillez saisir votre code client');
      return { isValid: false, errors };
    }

    const trimmedCode = customerCode.trim();

    if (trimmedCode.length < 3) {
      errors.push('🏷️ Le code client doit contenir au moins 3 caractères');
    }

    if (trimmedCode.length > 50) {
      errors.push('🏷️ Le code client est trop long (maximum 50 caractères)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide toutes les credentials de connexion
   */
  static validateLoginCredentials(credentials: LoginCredentials): LoginValidationResult {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    const customerCodeValidation = this.validateCustomerCode(credentials.customer_code);
    if (!customerCodeValidation.isValid) {
      errors.push(...customerCodeValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Nettoie et formate l'email
   */
  static sanitizeEmail(email: string | null): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  /**
   * Nettoie le code client
   */
  static sanitizeCustomerCode(customerCode: string | null): string {
    if (!customerCode) return '';
    return customerCode.trim().toUpperCase();
  }

  /**
   * Gère la demande de connexion avec validation stricte
   */
  static async requestLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Validation complète des credentials
      const validation = this.validateLoginCredentials(credentials);

      if (!validation.isValid) {
        return {
          success: false,
          message: this.getUserFriendlyErrorMessage(validation.errors),
          error: validation.errors.join(', ')
        };
      }

      // Nettoyer les données
      const cleanCredentials: LoginCredentials = {
        email: this.sanitizeEmail(credentials.email),
        customer_code: this.sanitizeCustomerCode(credentials.customer_code),
      };

      // Appeler le service pour envoyer la demande de connexion
      const response = await AuthService.login(cleanCredentials);

      if (response && response.success) {
        this.handleSuccessfulLogin(response);
        return {
          success: true,
          message: response.message,
          data: response.data
        };
      } else {
        this.handleLoginError(response.error || 'Échec de la connexion');

        // Retourner SEULEMENT le message convivial
        return {
          success: false,
          message: response.message, // Déjà formaté par AuthService
          error: response.error // On garde l'erreur technique mais on ne l'affiche pas
        };
      }
    } catch (error: any) {
      this.handleLoginError(error.message || 'Erreur réseau');
      const errorMessage = this.parseErrorMessage(error);

      return {
        success: false,
        message: errorMessage, // Message convivial seulement
        error: error.message || 'Erreur réseau'
      };
    }
  }

  /**
   * Parse les messages d'erreur pour fournir des messages conviviaux
   */
  static parseErrorMessage(error: any): string {
    if (!error.message) {
      return '⚠️ Une erreur est survenue. Veuillez réessayer.';
    }

    const msg = error.message.toLowerCase();

    // Erreurs réseau
    if (msg.includes('network') || msg.includes('err_network')) {
      return '📡 Problème de connexion. Vérifiez votre connexion internet.';
    }
    if (msg.includes('timeout')) {
      return '⏱️ La connexion a pris trop de temps. Veuillez réessayer.';
    }

    // Erreurs HTTP
    if (msg.includes('404')) {
      return '🔍 Service non disponible. Contactez le support technique.';
    }
    if (msg.includes('500')) {
      return '🔧 Erreur serveur temporaire. Réessayez dans quelques minutes.';
    }
    if (msg.includes('400')) {
      return '⚠️ Données invalides. Vérifiez les informations saisies.';
    }
    if (msg.includes('401')) {
      return '🔒 Email ou code client incorrect.';
    }
    if (msg.includes('429')) {
      return '🚦 Trop de tentatives. Attendez quelques minutes avant de réessayer.';
    }

    return error.message;
  }

  /**
   * Formate le message de réponse pour l'affichage
   * IMPORTANT: Retourne SEULEMENT le message convivial, sans l'erreur technique
   */
  static formatResponseMessage(response: LoginResponse): string {
    // Retourner SEULEMENT le message, jamais l'erreur technique
    return response.message;
  }

  /**
   * Gère la redirection après connexion réussie
   */
  static handleSuccessfulLogin(response: any): void {
    console.log('✅ Connexion initiée avec succès');
  }

  /**
   * Gère les erreurs de connexion (log uniquement)
   */
  static handleLoginError(error: string): void {
    console.error('❌ Erreur de connexion:', error);
  }

  /**
   * Génère un message d'erreur convivial basé sur le type d'erreur
   */
  static getUserFriendlyErrorMessage(errors: string[]): string {
    if (errors.length === 0) return '';

    // Retourner seulement le premier message d'erreur le plus pertinent
    if (errors.some(e => e.includes('requis') || e.includes('Veuillez saisir'))) {
      return errors.find(e => e.includes('requis') || e.includes('Veuillez saisir')) || errors[0];
    }

    if (errors.some(e => e.includes('Format') || e.includes('invalide'))) {
      return errors.find(e => e.includes('Format') || e.includes('invalide')) || errors[0];
    }

    if (errors.some(e => e.includes('trop long'))) {
      return errors.find(e => e.includes('trop long')) || errors[0];
    }

    if (errors.some(e => e.includes('trop court'))) {
      return errors.find(e => e.includes('trop court')) || errors[0];
    }

    return errors[0];
  }

  /**
   * Utilitaire pour valider plusieurs emails à la fois
   */
  static validateMultipleEmails(emails: string[]): { [key: string]: LoginValidationResult } {
    const results: { [key: string]: LoginValidationResult } = {};

    emails.forEach(email => {
      results[email] = this.validateEmail(email);
    });

    return results;
  }
}