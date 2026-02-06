// cloud/src/services/countries.service.ts

import {
    Country,
    CreateCountryDto,
    UpdateCountryDto,
    CountryListResponse,
    PaginationOptions,
    CountryFilters,
    API_ROUTES,
    createCountrySchema,
    updateCountrySchema,
    countrySchema,
    countryListResponseSchema
} from '@toke/shared';
import { apiService } from './api.service';

export class CountriesService {

    /**
     * Récupère tous les pays avec pagination
     */
    static async getAll(options: PaginationOptions = {}): Promise<CountryListResponse> {
        const params = new URLSearchParams();
        if (options.offset !== undefined) params.append('offset', options.offset.toString());
        if (options.limit !== undefined) params.append('limit', options.limit.toString());

        const url = `${API_ROUTES.COUNTRIES}${params.toString() ? '?' + params.toString() : ''}`;
        return  await apiService.get<CountryListResponse>(url);

        // Validation de la réponse avec le schéma partagé
        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère un pays par son identifiant (ID, GUID ou code)
     */
    static async getById(identifier: string | number): Promise<Country> {
        const url = API_ROUTES.COUNTRIES_BY_ID(identifier);
        return  await apiService.get<Country>(url);

        // Validation avec le schéma partagé
        // return countrySchema.parse(response);
    }

    /**
     * Récupère un pays par son code ISO
     */
    static async getByCode(code: string): Promise<Country> {
        const url = API_ROUTES.COUNTRIES_BY_CODE(code);
    return  await apiService.get<Country>(url);

        // return countrySchema.parse(response);
    }

    /**
     * Crée un nouveau pays
     */
    static async create(countryData: CreateCountryDto): Promise<Country> {
        // Validation côté client avec le schéma partagé
        const validatedData = createCountrySchema.parse(countryData);

        return  await apiService.post<Country>(API_ROUTES.COUNTRIES, validatedData);
        // return countrySchema.parse(response);
    }

    /**
     * Met à jour un pays existant
     */
    static async update(guid: number, countryData: UpdateCountryDto): Promise<Country> {
        // Validation côté client
        const validatedData = updateCountrySchema.parse(countryData);

        const url = API_ROUTES.COUNTRIES_BY_GUID(guid);
        return  await apiService.put<Country>(url, validatedData);

        // return countrySchema.parse(response);
    }

    /**
     * Supprime un pays
     */
    static async delete(guid: number): Promise<void> {
        const url = API_ROUTES.COUNTRIES_BY_GUID(guid);
        await apiService.delete(url);
    }

    /**
     * Liste les pays avec filtres
     */
    static async getFiltered(
        filters: CountryFilters,
        pagination: PaginationOptions = {}
    ): Promise<CountryListResponse> {
        const params = new URLSearchParams();

        // Filtres
        if (filters.timezone_default) params.append('timezone_default', filters.timezone_default);
        if (filters.default_currency_code) params.append('default_currency_code', filters.default_currency_code);
        if (filters.default_language_code) params.append('default_language_code', filters.default_language_code);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());

        // Pagination
        if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
        if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());

        const url = `${API_ROUTES.COUNTRIES_LIST}?${params.toString()}`;
        return  await apiService.get<CountryListResponse>(url);

        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère les pays par fuseau horaire
     */
    static async getByTimezone(
        timezone: string,
        pagination: PaginationOptions = {}
    ): Promise<CountryListResponse> {
        const params = new URLSearchParams();
        if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
        if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());

        const url = `${API_ROUTES.COUNTRIES_BY_TIMEZONE(timezone)}?${params.toString()}`;
        return  await apiService.get<CountryListResponse>(url);

        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère les pays par devise
     */
    static async getByCurrency(
        currency: string,
        pagination: PaginationOptions = {}
    ): Promise<CountryListResponse> {
        const params = new URLSearchParams();
        if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
        if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());

        const url = `${API_ROUTES.COUNTRIES_BY_CURRENCY(currency)}?${params.toString()}`;
        return  await apiService.get<CountryListResponse>(url);

        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère les pays par langue
     */
    static async getByLanguage(
        language: string,
        pagination: PaginationOptions = {}
    ): Promise<CountryListResponse> {
        const params = new URLSearchParams();
        if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
        if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());

        const url = `${API_ROUTES.COUNTRIES_BY_LANGUAGE(language)}?${params.toString()}`;
        return  await apiService.get<CountryListResponse>(url);

        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère les pays par statut (actif/inactif)
     */
    static async getByStatus(
        isActive: boolean,
        pagination: PaginationOptions = {}
    ): Promise<CountryListResponse> {
        const params = new URLSearchParams();
        if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
        if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());

        const url = `${API_ROUTES.COUNTRIES_BY_STATUS(isActive)}?${params.toString()}`;
        return  await apiService.get<CountryListResponse>(url);

        // return countryListResponseSchema.parse(response);
    }

    /**
     * Récupère la révision actuelle des pays
     */
    static async getRevision(): Promise<{ revision: string; checked_at: string }> {
       return  await apiService.get<{ revision: string; checked_at: string }>(
            API_ROUTES.COUNTRIES_REVISION
        );
    }
}

export const countriesService = CountriesService;