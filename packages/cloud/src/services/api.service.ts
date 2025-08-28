// cloud/src/services/api.service.ts
import { HTTP_STATUS, ERROR_CODES, CONTENT_TYPES } from '@toke/shared';

interface ApiResponse<T = any> {
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    success: boolean;
}

interface RequestConfig {
    headers?: Record<string, string>;
    timeout?: number;
}

export class ApiService {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;

    constructor(baseUrl: string = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': CONTENT_TYPES.JSON,
            'Accept': CONTENT_TYPES.JSON,
        };
    }

    /**
     * Configuration des headers par défaut
     */
    setDefaultHeader(key: string, value: string) {
        this.defaultHeaders[key] = value;
    }

    /**
     * Suppression d'un header par défaut
     */
    removeDefaultHeader(key: string) {
        delete this.defaultHeaders[key];
    }

    /**
     * Méthode générique pour les requêtes HTTP
     */
    private async request<T>(
        method: string,
        endpoint: string,
        data?: any,
        config: RequestConfig = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { ...this.defaultHeaders, ...config.headers };

        const fetchConfig: RequestInit = {
            method,
            headers,
            signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            fetchConfig.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, fetchConfig);
            const responseData: ApiResponse<T> = await response.json();

            // Gestion des erreurs HTTP
            if (!response.ok) {
                throw new ApiError(
                    responseData.error?.code || ERROR_CODES.INTERNAL_ERROR,
                    responseData.error?.message || 'Une erreur est survenue',
                    response.status,
                    responseData.error?.details
                );
            }

            // Vérification du format de réponse
            if (!responseData.success && responseData.error) {
                throw new ApiError(
                    responseData.error.code,
                    responseData.error.message,
                    response.status,
                    responseData.error.details
                );
            }

            return responseData.data as T;

        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Erreurs réseau ou timeout
            if (error instanceof TypeError) {
                throw new ApiError(
                    ERROR_CODES.NETWORK_ERROR,
                    'Erreur de connexion au serveur',
                    0
                );
            }

            // if (error.name === 'AbortError') {
            //     throw new ApiError(
            //         ERROR_CODES.TIMEOUT_ERROR,
            //         'Délai d\'attente dépassé',
            //         408
            //     );
            // }

            // Erreur inconnue
            throw new ApiError(
                ERROR_CODES.INTERNAL_ERROR,
                'Une erreur inattendue s\'est produite',
                500,
                error
            );
        }
    }

    /**
     * Requête GET
     */
    async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('GET', endpoint, null, config);
    }

    /**
     * Requête POST
     */
    async post<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('POST', endpoint, data, config);
    }

    /**
     * Requête PUT
     */
    async put<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PUT', endpoint, data, config);
    }

    /**
     * Requête PATCH
     */
    async patch<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PATCH', endpoint, data, config);
    }

    /**
     * Requête DELETE
     */
    async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('DELETE', endpoint, null, config);
    }
}

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
export class ApiError extends Error {
    public code: string;
    public status: number;
    public details?: any;

    constructor(code: string, message: string, status: number, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }

    /**
     * Vérifie si l'erreur est de validation
     */
    isValidationError(): boolean {
        return this.code === ERROR_CODES.VALIDATION_FAILED;
    }

    /**
     * Vérifie si l'erreur est une erreur réseau
     */
    isNetworkError(): boolean {
        return this.code === ERROR_CODES.NETWORK_ERROR || this.status === 0;
    }

    /**
     * Vérifie si l'erreur est un timeout
     */
    isTimeoutError(): boolean {
        return this.code === ERROR_CODES.TIMEOUT_ERROR;
    }

    /**
     * Vérifie si l'erreur est côté serveur (5xx)
     */
    isServerError(): boolean {
        return this.status >= 500;
    }

    /**
     * Vérifie si l'erreur est côté client (4xx)
     */
    isClientError(): boolean {
        return this.status >= 400 && this.status < 500;
    }

    /**
     * Retourne un message d'erreur utilisateur-friendly
     */
    getUserMessage(): string {
        switch (this.code) {
            case ERROR_CODES.NETWORK_ERROR:
                return 'Problème de connexion. Vérifiez votre connexion internet.';
            case ERROR_CODES.TIMEOUT_ERROR:
                return 'La requête a pris trop de temps. Veuillez réessayer.';
            case ERROR_CODES.VALIDATION_FAILED:
                return 'Données invalides. Veuillez vérifier vos informations.';
            case ERROR_CODES.COUNTRY_NOT_FOUND:
                return 'Pays non trouvé.';
            case ERROR_CODES.COUNTRY_ALREADY_EXISTS:
                return 'Ce pays existe déjà.';
            default:
                return this.message || 'Une erreur est survenue.';
        }
    }
}

// Instance par défaut
export const apiService = new ApiService(
    // import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
);