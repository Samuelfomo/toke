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

    // Vérifier si l'email est fourni
    if (!email || email.trim() === '') {
      errors.push('L\'adresse email est requise');
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim();

    // Vérifier le format de l'email avec une regex plus stricte
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push('Format d\'email invalide');
    }

    // Vérifier la longueur de l'email
    if (trimmedEmail.length > 254) {
      errors.push('L\'adresse email est trop longue (maximum 254 caractères)');
    }

    // Vérifier la longueur minimale
    if (trimmedEmail.length < 5) {
      errors.push('L\'adresse email est trop courte (minimum 5 caractères)');
    }

    // Vérifier le domaine plus précisément
    const parts = trimmedEmail.split('@');
    if (parts.length === 2) {
      const [localPart, domain] = parts;

      // Vérifier la partie locale
      if (localPart.length === 0 || localPart.length > 64) {
        errors.push('La partie locale de l\'email est invalide');
      }

      // Vérifier le domaine
      if (domain.length < 3 || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
        errors.push('Domaine email invalide');
      }

      // Vérifier l'extension du domaine
      const domainParts = domain.split('.');
      const extension = domainParts[domainParts.length - 1];
      if (extension.length < 2) {
        errors.push('Extension de domaine invalide');
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
      errors.push('Le code client est requis');
      return { isValid: false, errors };
    }

    const trimmedCode = customerCode.trim();

    if (trimmedCode.length < 3) {
      errors.push('Le code client doit contenir au moins 3 caractères');
    }

    if (trimmedCode.length > 50) {
      errors.push('Le code client est trop long (maximum 50 caractères)');
    }

    // Optionnel : validation du format si vous avez un pattern spécifique
    // const codePattern = /^CLT-\d+$/;
    // if (!codePattern.test(trimmedCode)) {
    //   errors.push('Format du code client invalide (ex: CLT-20455)');
    // }

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

    // Validation de l'email
    const emailValidation = this.validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    // Validation du code client
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
      // console.log('🔐 authCtrl.requestLogin - Début de la requête');

      // Étape 1: Validation complète des credentials
      const validation = this.validateLoginCredentials(credentials);

      if (!validation.isValid) {
        // console.warn('⚠️ Validation échouée:', validation.errors);
        return {
          success: false,
          message: 'Informations de connexion invalides',
          error: this.getUserFriendlyErrorMessage(validation.errors)
        };
      }

      // Étape 2: Nettoyer les données
      const cleanCredentials: LoginCredentials = {
        email: this.sanitizeEmail(credentials.email),
        customer_code: this.sanitizeCustomerCode(credentials.customer_code),
      };

      // console.log('🧹 Credentials nettoyées:', {
      //   email: cleanCredentials.email,
      //   customer_code: cleanCredentials.customer_code
      // });

      // Étape 3: Appeler le service pour envoyer la demande de connexion
      // console.log('📡 Appel à AuthService.login...');
      const response = await AuthService.login(cleanCredentials);

      if (response && response.success) {
        // Gérer le succès
        this.handleSuccessfulLogin(response);

        return {
          success: true,
          message: response.message || 'Un email contenant un code OTP vous a été envoyé. Vérifiez votre boîte de réception.',
          data: response.data
        };
      } else {
        // Gérer l'échec
        // console.error('❌ Échec de la connexion:', response.error);
        this.handleLoginError(response.error || 'Échec de la connexion');

        return {
          success: false,
          message: response.message || 'Erreur lors de l\'envoi du code OTP',
          error: response.error || 'Utilisateur non trouvé'
        };
      }
    } catch (error: any) {
      // console.error('💥 Erreur lors de la demande de connexion:', error);

      // Gérer l'erreur
      this.handleLoginError(error.message || 'Erreur réseau');

      // Analyser le type d'erreur pour fournir un message approprié
      const errorMessage = this.parseErrorMessage(error);

      return {
        success: false,
        message: errorMessage,
        error: error.message || 'Erreur réseau'
      };
    }
  }

  /**
   * Parse les messages d'erreur pour fournir des messages conviviaux
   */
  static parseErrorMessage(error: any): string {
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';

    if (!error.message) return errorMessage;

    if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
      errorMessage = 'Problème de connexion réseau. Vérifiez votre connexion internet.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
    } else if (error.message.includes('404')) {
      errorMessage = 'Service non disponible. Contactez le support technique.';
    } else if (error.message.includes('500')) {
      errorMessage = 'Erreur du serveur. Veuillez réessayer dans quelques minutes.';
    } else if (error.message.includes('400')) {
      errorMessage = 'Données invalides. Vérifiez les informations saisies.';
    } else if (error.message.includes('401')) {
      errorMessage = 'Email ou code client incorrect.';
    } else if (error.message.includes('429')) {
      errorMessage = 'Trop de tentatives. Veuillez attendre avant de réessayer.';
    } else {
      errorMessage = error.message;
    }

    return errorMessage;
  }

  /**
   * Formate le message de réponse pour l'affichage
   */
  static formatResponseMessage(response: LoginResponse): string {
    if (response.success) {
      return response.message;
    } else {
      return response.error ? `${response.message}: ${response.error}` : response.message;
    }
  }

  /**
   * Gère la redirection après connexion réussie
   */
  static handleSuccessfulLogin(response: any): void {
    console.log('✨ Code OTP envoyé avec succès:', response);

    // Vous pouvez ajouter ici :
    // 1. Stockage de données temporaires
    // 2. Analytics/tracking
    // 3. Notifications système
  }

  /**
   * Gère les erreurs de connexion
   */
  static handleLoginError(error: string): void {
    console.error('🔴 Erreur de connexion:', error);

    // Vous pouvez ajouter ici :
    // 1. Logging des erreurs pour le monitoring
    // 2. Analytics des erreurs
    // 3. Notification au service de support
  }

  /**
   * Génère un message d'erreur convivial basé sur le type d'erreur
   */
  static getUserFriendlyErrorMessage(errors: string[]): string {
    if (errors.length === 0) return '';

    // Prioriser les messages d'erreur les plus importants
    if (errors.some(e => e.includes('requis'))) {
      const field = errors.find(e => e.includes('email')) ? 'email' : 'code client';
      return `Veuillez saisir votre ${field}`;
    }

    if (errors.some(e => e.includes('Format') || e.includes('invalide'))) {
      return 'Veuillez saisir une adresse email valide (ex: nom@exemple.com)';
    }

    if (errors.some(e => e.includes('trop long'))) {
      return 'Les informations saisies sont trop longues';
    }

    if (errors.some(e => e.includes('trop court'))) {
      return 'Les informations saisies sont trop courtes';
    }

    // Retourner la première erreur par défaut
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