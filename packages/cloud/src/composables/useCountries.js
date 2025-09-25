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
exports.useCountries = useCountries;
// cloud/src/composables/useCountries.ts
const vue_1 = require("vue");
const shared_1 = require("@toke/shared");
const useNotifications_1 = require("./useNotifications");
const countries_service_1 = require("@/services/countries.service");
const api_service_1 = require("@/services/api.service");
function useCountries() {
    // État réactif
    const state = (0, vue_1.reactive)({
        countries: [],
        currentCountry: null,
        loading: false,
        error: null,
        pagination: {
            offset: 0,
            limit: shared_1.COUNTRY_DEFAULTS.PAGINATION.LIMIT,
            count: 0,
        },
        filters: {},
        revision: null,
    });
    const { showSuccess, showError, showWarning } = (0, useNotifications_1.useNotifications)();
    // Getters computed
    const hasCountries = (0, vue_1.computed)(() => state.countries.length > 0);
    const isLoading = (0, vue_1.computed)(() => state.loading);
    const hasError = (0, vue_1.computed)(() => !!state.error);
    const hasMorePages = (0, vue_1.computed)(() => {
        return state.pagination.total
            ? state.pagination.offset + state.pagination.limit < state.pagination.total
            : state.pagination.count >= state.pagination.limit;
    });
    const currentPage = (0, vue_1.computed)(() => Math.floor(state.pagination.offset / state.pagination.limit) + 1);
    // Actions
    const setLoading = (loading) => {
        state.loading = loading;
    };
    const setError = (error) => {
        state.error = error;
    };
    const clearError = () => {
        state.error = null;
    };
    /**
     * Charge tous les pays avec options de pagination
     */
    const fetchCountries = (...args_1) => __awaiter(this, [...args_1], void 0, function* (options = {}) {
        var _a, _b;
        setLoading(true);
        clearError();
        try {
            const paginationOptions = {
                offset: (_a = options.offset) !== null && _a !== void 0 ? _a : state.pagination.offset,
                limit: (_b = options.limit) !== null && _b !== void 0 ? _b : state.pagination.limit,
            };
            const response = yield countries_service_1.countriesService.getAll(paginationOptions);
            state.countries = response.items;
            state.pagination = response.pagination;
            state.revision = response.revision || null;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError ? error.getUserMessage() : 'Erreur lors du chargement des pays';
            setError(errorMessage);
            showError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Charge un pays par son identifiant
     */
    const fetchCountryById = (identifier) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        clearError();
        try {
            const country = yield countries_service_1.countriesService.getById(identifier);
            state.currentCountry = country;
            return country;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError ? error.getUserMessage() : 'Erreur lors du chargement du pays';
            setError(errorMessage);
            showError(errorMessage);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Crée un nouveau pays
     */
    const createCountry = (countryData) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        clearError();
        try {
            const newCountry = yield countries_service_1.countriesService.create(countryData);
            // Ajouter le nouveau pays à la liste
            state.countries.unshift(newCountry);
            state.pagination.count += 1;
            showSuccess(`Pays "${newCountry.name_en}" créé avec succès`);
            return newCountry;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError ? error.getUserMessage() : 'Erreur lors de la création du pays';
            setError(errorMessage);
            showError(errorMessage);
            return null;
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Met à jour un pays existant
     */
    const updateCountry = (guid, countryData) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        setLoading(true);
        clearError();
        try {
            const updatedCountry = yield countries_service_1.countriesService.update(guid, countryData);
            // Mettre à jour le pays dans la liste
            const index = state.countries.findIndex((c) => c.guid === guid);
            if (index !== -1) {
                state.countries[index] = updatedCountry;
            }
            // Mettre à jour le pays current si c'est le même
            if (((_a = state.currentCountry) === null || _a === void 0 ? void 0 : _a.guid) === guid) {
                state.currentCountry = updatedCountry;
            }
            showSuccess(`Pays "${updatedCountry.name_en}" mis à jour avec succès`);
            return updatedCountry;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError
                ? error.getUserMessage()
                : 'Erreur lors de la mise à jour du pays';
            setError(errorMessage);
            showError(errorMessage);
            return null;
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Supprime un pays
     */
    const deleteCountry = (guid) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        setLoading(true);
        clearError();
        try {
            yield countries_service_1.countriesService.delete(guid);
            // Retirer le pays de la liste
            const index = state.countries.findIndex((c) => c.guid === guid);
            if (index !== -1) {
                const deletedCountry = state.countries[index];
                state.countries.splice(index, 1);
                state.pagination.count -= 1;
                showSuccess(`Pays "${deletedCountry.name_en}" supprimé avec succès`);
            }
            // Vider currentCountry si c'est le pays supprimé
            if (((_a = state.currentCountry) === null || _a === void 0 ? void 0 : _a.guid) === guid) {
                state.currentCountry = null;
            }
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError
                ? error.getUserMessage()
                : 'Erreur lors de la suppression du pays';
            setError(errorMessage);
            showError(errorMessage);
            return false;
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Applique des filtres et recharge les pays
     */
    const applyFilters = (filters_1, ...args_1) => __awaiter(this, [filters_1, ...args_1], void 0, function* (filters, resetPagination = true) {
        state.filters = Object.assign({}, filters);
        if (resetPagination) {
            state.pagination.offset = 0;
        }
        setLoading(true);
        clearError();
        try {
            const response = yield countries_service_1.countriesService.getFiltered(state.filters, {
                offset: state.pagination.offset,
                limit: state.pagination.limit,
            });
            state.countries = response.items;
            state.pagination = response.pagination;
            state.revision = response.revision || null;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError
                ? error.getUserMessage()
                : "Erreur lors de l'application des filtres";
            setError(errorMessage);
            showError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Efface tous les filtres
     */
    const clearFilters = () => __awaiter(this, void 0, void 0, function* () {
        state.filters = {};
        state.pagination.offset = 0;
        yield fetchCountries();
    });
    /**
     * Charge la page suivante
     */
    const loadNextPage = () => __awaiter(this, void 0, void 0, function* () {
        if (!hasMorePages.value)
            return;
        const nextOffset = state.pagination.offset + state.pagination.limit;
        if (Object.keys(state.filters).length > 0) {
            yield applyFilters(state.filters, false);
        }
        else {
            yield fetchCountries({
                offset: nextOffset,
                limit: state.pagination.limit,
            });
        }
    });
    /**
     * Charge la page précédente
     */
    const loadPreviousPage = () => __awaiter(this, void 0, void 0, function* () {
        if (state.pagination.offset <= 0)
            return;
        const prevOffset = Math.max(0, state.pagination.offset - state.pagination.limit);
        if (Object.keys(state.filters).length > 0) {
            yield applyFilters(state.filters, false);
        }
        else {
            yield fetchCountries({
                offset: prevOffset,
                limit: state.pagination.limit,
            });
        }
    });
    /**
     * Va à une page spécifique
     */
    const goToPage = (page) => __awaiter(this, void 0, void 0, function* () {
        const offset = (page - 1) * state.pagination.limit;
        if (Object.keys(state.filters).length > 0) {
            state.pagination.offset = offset;
            yield applyFilters(state.filters, false);
        }
        else {
            yield fetchCountries({
                offset,
                limit: state.pagination.limit,
            });
        }
    });
    /**
     * Recherche un pays par code
     */
    const searchByCode = (code) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        clearError();
        try {
            const country = yield countries_service_1.countriesService.getByCode(code);
            state.currentCountry = country;
            return country;
        }
        catch (error) {
            const errorMessage = error instanceof api_service_1.ApiError ? error.getUserMessage() : 'Pays non trouvé';
            setError(errorMessage);
            showWarning(errorMessage);
            return null;
        }
        finally {
            setLoading(false);
        }
    });
    /**
     * Actualise les données (utile pour les mises à jour en temps réel)
     */
    const refresh = () => __awaiter(this, void 0, void 0, function* () {
        if (Object.keys(state.filters).length > 0) {
            yield applyFilters(state.filters, false);
        }
        else {
            yield fetchCountries({
                offset: state.pagination.offset,
                limit: state.pagination.limit,
            });
        }
    });
    // Retour de l'interface publique
    return {
        // État
        state: (0, vue_1.readonly)(state),
        // Getters
        hasCountries,
        isLoading,
        hasError,
        hasMorePages,
        currentPage,
        // Actions
        fetchCountries,
        fetchCountryById,
        createCountry,
        updateCountry,
        deleteCountry,
        applyFilters,
        clearFilters,
        loadNextPage,
        loadPreviousPage,
        goToPage,
        searchByCode,
        refresh,
        clearError,
    };
}
