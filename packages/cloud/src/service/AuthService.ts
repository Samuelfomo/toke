import { apiRequest } from '@/tools/Fetch.Client'

export interface LoginCredentials {
  email: string
  customer_code: string
  password?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

const EXPIRATION_DURATION_MS = 24 * 60 * 60 * 1000
const AUTH_TOKEN_KEY = 'auth_token'
const USER_DATA_KEY = 'user_data'
const TOKEN_EXPIRATION_KEY = 'token_expiration'

export default class AuthService {
  static async login(credentials: LoginCredentials): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: '/tenant/auth',
        method: 'POST',
        data: {
          email: credentials.email,
          code: credentials.customer_code,
        },
      })

      return {
        success: response.success,
        message: response.success
          ? this.formatLoginSuccessMessage(response.message)
          : response.message || 'La demande de connexion a échoué.',
        data: response.data,
      }
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error)
      return this.handleError(error)
    }
  }

  static async retry(email: string): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: '/tenant/retry',
        method: 'POST',
        data: { email },
      })

      return {
        success: response.success,
        message: response.success
          ? this.formatLoginSuccessMessage(response.message)
          : response.message || 'Le renvoi du code a échoué.',
        data: response.data,
      }
    } catch (error: any) {
      console.error('Erreur lors du renvoi OTP:', error)
      return this.handleError(error)
    }
  }

  static async verifyOtp(otp: string): Promise<ApiResponse> {
    try {
      const response = await apiRequest<ApiResponse>({
        path: `/tenant/verify-otp/${otp}`,
        method: 'GET',
      })

      return {
        success: response.success,
        message: this.formatOtpSuccessMessage(response.data?.message || response.message),
        data: response.data,
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification OTP:', error)
      return this.handleOtpError(error)
    }
  }

  private static formatLoginSuccessMessage(serverMessage: string): string {
    const lower = serverMessage?.toLowerCase() || ''

    if (lower.includes('otp') && lower.includes('envoyé')) {
      return 'Code de vérification envoyé. Consultez votre boîte email.'
    }
    if (lower.includes('email') && lower.includes('envoyé')) {
      return 'Un email contenant votre code a été envoyé avec succès.'
    }
    if (lower.includes('success') || lower.includes('succès')) {
      return 'Demande envoyée avec succès. Vérifiez votre email.'
    }

    return 'Code de vérification envoyé à votre adresse email.'
  }

  private static formatOtpSuccessMessage(serverMessage: string): string {
    const lower = serverMessage?.toLowerCase() || ''

    if (lower.includes('vérifié') || lower.includes('verified')) {
      return 'Connexion réussie.'
    }
    if (lower.includes('valid') && lower.includes('success')) {
      return 'Code validé avec succès.'
    }
    if (lower.includes('authentification') && lower.includes('réussie')) {
      return 'Authentification réussie.'
    }

    return 'Code vérifié avec succès.'
  }

  private static extractErrorMessage(error: any): string {
    if (typeof error?.message === 'string') {
      try {
        const jsonMatch = error.message.match(/HTTP \d+ - (.+)$/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1])
          return parsed.error?.message || parsed.message || parsed.error?.code || error.message
        }
      } catch {
        // Le message n'est pas un JSON sérialisé : conserver le message original.
      }
    }

    return error?.message || 'UNKNOWN_ERROR'
  }

  public static handleError(error: any): ApiResponse {
    const technicalError = this.extractErrorMessage(error)
    const lowerError = technicalError.toLowerCase()
    let userMessage = ''

    if (
      error?.status === 401 ||
      lowerError.includes('401') ||
      lowerError.includes('authentication_failed') ||
      lowerError.includes('unauthorized')
    ) {
      userMessage = 'Email ou code client incorrect. Vérifiez vos informations.'
    } else if (
      error?.status === 404 ||
      lowerError.includes('404') ||
      lowerError.includes('not found') ||
      lowerError.includes('introuvable')
    ) {
      userMessage = 'Aucun compte trouvé avec ces informations.'
    } else if (
      error?.status === 400 ||
      lowerError.includes('400') ||
      lowerError.includes('bad request') ||
      lowerError.includes('invalid')
    ) {
      userMessage = 'Les informations saisies sont incorrectes. Veuillez vérifier.'
    } else if (
      error?.status === 403 ||
      lowerError.includes('403') ||
      lowerError.includes('forbidden')
    ) {
      userMessage = 'Accès refusé. Votre compte peut être désactivé.'
    } else if (
      error?.status === 429 ||
      lowerError.includes('429') ||
      lowerError.includes('too many')
    ) {
      userMessage = 'Trop de tentatives. Attendez quelques minutes avant de réessayer.'
    } else if (
      error?.status === 500 ||
      lowerError.includes('500') ||
      lowerError.includes('internal server')
    ) {
      userMessage = 'Problème technique temporaire. Réessayez dans quelques instants.'
    } else if (
      error?.status === 503 ||
      lowerError.includes('503') ||
      lowerError.includes('service unavailable')
    ) {
      userMessage = 'Service temporairement indisponible. Veuillez patienter.'
    } else if (
      lowerError.includes('failed to fetch') ||
      lowerError.includes('networkerror') ||
      lowerError.includes('err_network')
    ) {
      userMessage = 'Problème de connexion internet. Vérifiez votre réseau et réessayez.'
    } else if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
      userMessage = 'La connexion prend trop de temps. Veuillez réessayer.'
    } else if (lowerError.includes('email')) {
      if (lowerError.includes('invalid') || lowerError.includes('invalide')) {
        userMessage = "Format d'email invalide. Exemple : nom@entreprise.com"
      } else if (lowerError.includes('not found') || lowerError.includes('introuvable')) {
        userMessage = 'Aucun compte associé à cette adresse email.'
      } else {
        userMessage = "Problème avec l'adresse email fournie."
      }
    } else if (lowerError.includes('code') || lowerError.includes('customer')) {
      userMessage = 'Code client invalide ou introuvable.'
    } else {
      userMessage = 'Une erreur est survenue. Veuillez réessayer ou contacter le support.'
    }

    console.error('Erreur technique:', technicalError)

    return {
      success: false,
      message: userMessage,
      error: technicalError,
    }
  }

  private static handleOtpError(error: any): ApiResponse {
    const technicalError = this.extractErrorMessage(error)
    const lowerError = technicalError.toLowerCase()
    let userMessage = ''

    if (
      lowerError.includes('invalid otp') ||
      lowerError.includes('otp invalide') ||
      lowerError.includes('incorrect') ||
      lowerError.includes('wrong')
    ) {
      userMessage = 'Code incorrect. Vérifiez le code reçu par email.'
    } else if (lowerError.includes('expired') || lowerError.includes('expiré')) {
      userMessage = 'Code expiré. Demandez un nouveau code.'
    } else if (
      lowerError.includes('utilisé') ||
      lowerError.includes('used') ||
      lowerError.includes('already')
    ) {
      userMessage = 'Code déjà utilisé. Demandez un nouveau code.'
    } else if (
      lowerError.includes('too many attempts') ||
      lowerError.includes('trop de tentatives')
    ) {
      userMessage = 'Trop de tentatives. Attendez avant de réessayer.'
    } else {
      return this.handleError(error)
    }

    console.error('Erreur technique OTP:', technicalError)

    return {
      success: false,
      message: userMessage,
      error: technicalError,
    }
  }

  static setAuthData(token: string, userData: any): void {
    const expirationTime = Date.now() + EXPIRATION_DURATION_MS

    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
    localStorage.setItem(TOKEN_EXPIRATION_KEY, expirationTime.toString())
  }

  static clearAuthData(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
    localStorage.removeItem(TOKEN_EXPIRATION_KEY)

    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(USER_DATA_KEY)
    sessionStorage.removeItem('login_email')
    sessionStorage.removeItem('customer_code')
  }

  static isTokenExpired(): boolean {
    const expirationTimeStr = localStorage.getItem(TOKEN_EXPIRATION_KEY)
    if (!expirationTimeStr) return true

    const expirationTime = Number.parseInt(expirationTimeStr, 10)
    if (!Number.isFinite(expirationTime) || Date.now() >= expirationTime) {
      this.clearAuthData()
      return true
    }

    return false
  }

  static isAuthenticated(): boolean {
    const tokenExists = Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
    return tokenExists && !this.isTokenExpired()
  }

  static getAuthToken(): string | null {
    if (this.isTokenExpired()) return null
    return localStorage.getItem(AUTH_TOKEN_KEY)
  }

  static getUserData(): any | null {
    const userData = localStorage.getItem(USER_DATA_KEY)
    if (!userData) return null

    try {
      return JSON.parse(userData)
    } catch {
      return null
    }
  }
}
