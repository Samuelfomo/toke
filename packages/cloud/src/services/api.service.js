"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiService = exports.ApiError = exports.ApiService = void 0;
// cloud/src/services/api.service.ts
const shared_1 = require("@toke/shared");
class ApiService {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': shared_1.CONTENT_TYPES.JSON,
            'Accept': shared_1.CONTENT_TYPES.JSON,
        };
    }
    /**
     * Configuration des headers par défaut
     */
    setDefaultHeader(key, value) {
        this.defaultHeaders[key] = value;
    }
    /**
     * Suppression d'un header par défaut
     */
    removeDefaultHeader(key) {
        delete this.defaultHeaders[key];
    }
    /**
     * Méthode générique pour les requêtes HTTP
     */
    request(method_1, endpoint_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (method, endpoint, data, config = {}) {
            var _a, _b, _c;
            const url = `${this.baseUrl}${endpoint}`;
            const headers = Object.assign(Object.assign({}, this.defaultHeaders), config.headers);
            const fetchConfig = {
                method,
                headers,
                signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
            };
            if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
                fetchConfig.body = JSON.stringify(data);
            }
            try {
                const response = yield fetch(url, fetchConfig);
                const responseData = yield response.json();
                // Gestion des erreurs HTTP
                if (!response.ok) {
                    throw new ApiError(((_a = responseData.error) === null || _a === void 0 ? void 0 : _a.code) || shared_1.ERROR_CODES.INTERNAL_ERROR, ((_b = responseData.error) === null || _b === void 0 ? void 0 : _b.message) || 'Une erreur est survenue', response.status, (_c = responseData.error) === null || _c === void 0 ? void 0 : _c.details);
                }
                // Vérification du format de réponse
                if (!responseData.success && responseData.error) {
                    throw new ApiError(responseData.error.code, responseData.error.message, response.status, responseData.error.details);
                }
                return responseData.data;
            }
            catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
                // Erreurs réseau ou timeout
                if (error instanceof TypeError) {
                    throw new ApiError(shared_1.ERROR_CODES.NETWORK_ERROR, 'Erreur de connexion au serveur', 0);
                }
                // if (error.name === 'AbortError') {
                //     throw new ApiError(
                //         ERROR_CODES.TIMEOUT_ERROR,
                //         'Délai d\'attente dépassé',
                //         408
                //     );
                // }
                // Erreur inconnue
                throw new ApiError(shared_1.ERROR_CODES.INTERNAL_ERROR, 'Une erreur inattendue s\'est produite', 500, error);
            }
        });
    }
    /**
     * Requête GET
     */
    get(endpoint, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('GET', endpoint, null, config);
        });
    }
    /**
     * Requête POST
     */
    post(endpoint, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('POST', endpoint, data, config);
        });
    }
    /**
     * Requête PUT
     */
    put(endpoint, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('PUT', endpoint, data, config);
        });
    }
    /**
     * Requête PATCH
     */
    patch(endpoint, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('PATCH', endpoint, data, config);
        });
    }
    /**
     * Requête DELETE
     */
    delete(endpoint, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request('DELETE', endpoint, null, config);
        });
    }
}
exports.ApiService = ApiService;
/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
class ApiError extends Error {
    constructor(code, message, status, details) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
    /**
     * Vérifie si l'erreur est de validation
     */
    isValidationError() {
        return this.code === shared_1.ERROR_CODES.VALIDATION_FAILED;
    }
    /**
     * Vérifie si l'erreur est une erreur réseau
     */
    isNetworkError() {
        return this.code === shared_1.ERROR_CODES.NETWORK_ERROR || this.status === 0;
    }
    /**
     * Vérifie si l'erreur est un timeout
     */
    isTimeoutError() {
        return this.code === shared_1.ERROR_CODES.TIMEOUT_ERROR;
    }
    /**
     * Vérifie si l'erreur est côté serveur (5xx)
     */
    isServerError() {
        return this.status >= 500;
    }
    /**
     * Vérifie si l'erreur est côté client (4xx)
     */
    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    /**
     * Retourne un message d'erreur utilisateur-friendly
     */
    getUserMessage() {
        switch (this.code) {
            case shared_1.ERROR_CODES.NETWORK_ERROR:
                return 'Problème de connexion. Vérifiez votre connexion internet.';
            case shared_1.ERROR_CODES.TIMEOUT_ERROR:
                return 'La requête a pris trop de temps. Veuillez réessayer.';
            case shared_1.ERROR_CODES.VALIDATION_FAILED:
                return 'Données invalides. Veuillez vérifier vos informations.';
            case shared_1.ERROR_CODES.COUNTRY_NOT_FOUND:
                return 'Pays non trouvé.';
            case shared_1.ERROR_CODES.COUNTRY_ALREADY_EXISTS:
                return 'Ce pays existe déjà.';
            default:
                return this.message || 'Une erreur est survenue.';
        }
    }
}
exports.ApiError = ApiError;
// Instance par défaut
exports.apiService = new ApiService(
// import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
);
