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
   * Nettoie et formate l'email
   */
  static sanitizeEmail(email: string | null): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  /**
   * Gère la demande de connexion avec validation stricte
   */
  static async requestLogin(email: string | null): Promise<LoginResponse> {
    try {
      // Étape 1: Validation de l'email
      const validation = this.validateEmail(email);


      if (!validation.isValid) {
        return {
          success: false,
          message: 'Adresse email invalide',
          error: validation.errors.join(', ')
        };
      }

      // Étape 2: Nettoyer l'email
      const cleanEmail = this.sanitizeEmail(email);

      // // Étape 3: Vérifier si l'email existe (optionnel mais recommandé)
      const emailExists = await this.checkEmailExists(cleanEmail);
      if (!emailExists) {
        // Selon votre logique métier, vous pouvez soit :
        // 1. Créer automatiquement l'utilisateur
        // 2. Retourner une erreur
        // 3. Rediriger vers l'inscription

        // Pour cet exemple, on continue avec la création
        console.log('Email non trouvé, création d\'un nouveau compte...');
      }

      // Étape 4: Appeler le service pour envoyer la demande de connexion
      // const response = await UserService.login(cleanEmail);
      const response = { success: true };
      console.log('response process', response);

      if (response && response.success) {
        return {
          success: true,
          message: 'Un email contenant un code OTP vous a été envoyé. Vérifiez votre boîte de réception.',
        };

      } else {
        return {
          success: false,
          message: 'Erreur lors de l\'envoi du code OTP',
          error: 'User not found.'
        };
      }
    } catch (error: any) {
      console.error('Erreur lors de la demande de connexion:', error);

      // Analyser le type d'erreur pour fournir un message approprié
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';

      if (error.message) {
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
        } else if (error.message.includes('429')) {
          errorMessage = 'Trop de tentatives. Veuillez attendre avant de réessayer.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message || 'Erreur réseau'
      };
    }
  }

  /**
   * Vérifie si l'email existe dans le système
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      // TODO: Implémentez cette méthode selon votre API
      // const response = await UserService.checkEmailExists(email);
      // return response.exists;

      // Pour l'instant, on retourne toujours true
      // Vous devrez adapter cette méthode selon votre backend
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      // En cas d'erreur, on assume que l'email n'existe pas
      return false;
    }
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
   * Valide la force du mot de passe (pour usage futur)
   */
  static validatePasswordStrength(password: string): LoginValidationResult {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    if (!/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gère la redirection après connexion réussie
   */
  static handleSuccessfulLogin(response: any): void {
    console.log('Code OTP envoyé avec succès:', response);

    // Exemple d'actions à effectuer après succès :
    // 1. Redirection vers la page de vérification OTP
    // 2. Stockage temporaire de l'email pour la vérification
    // 3. Analytics/tracking

    // Exemple de redirection (à adapter selon votre router)
    // window.location.href = '/verify-otp';
    // ou avec React Router:
    // navigate('/verify-otp', { state: { email: response.email } });
  }

  /**
   * Gère les erreurs de connexion
   */
  static handleLoginError(error: string): void {
    console.error('Erreur de connexion:', error);

    // Actions possibles :
    // 1. Logging des erreurs pour le monitoring
    // 2. Analytics des erreurs
    // 3. Notification au service de support si erreur critique

    // Exemple de tracking d'erreur
    // Analytics.track('login_error', { error_message: error });
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

  /**
   * Génère un message d'erreur convivial basé sur le type d'erreur
   */
  static getUserFriendlyErrorMessage(errors: string[]): string {
    if (errors.length === 0) return '';

    // Prioriser les messages d'erreur les plus importants
    if (errors.some(e => e.includes('requis'))) {
      return 'Veuillez saisir votre adresse email';
    }

    if (errors.some(e => e.includes('Format'))) {
      return 'Veuillez saisir une adresse email valide (ex: nom@exemple.com)';
    }

    if (errors.some(e => e.includes('trop longue'))) {
      return 'Cette adresse email est trop longue';
    }

    if (errors.some(e => e.includes('trop courte'))) {
      return 'Cette adresse email est trop courte';
    }

    // Retourner la première erreur par défaut
    return errors[0];
  }
}