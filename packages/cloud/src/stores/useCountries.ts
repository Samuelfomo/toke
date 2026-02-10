// cloud/src/composables/useCountries.ts
import { computed, reactive, readonly } from 'vue';
import {
  Country,
  COUNTRY_DEFAULTS,
  CountryFilters,
  CountryListResponse,
  CreateCountryDto,
  PaginationOptions,
  UpdateCountryDto,
} from '@toke/shared';

import { useNotifications } from './useNotifications';

import { countriesService } from '@/services/countries.service';
import { ApiError } from '@/services/api.service';

interface UseCountriesState {
  countries: Country[];
  currentCountry: Country | null;
  loading: boolean;
  error: string | null;
  pagination: {
    offset: number;
    limit: number;
    count: number;
    total?: number;
  };
  filters: CountryFilters;
  revision: string | null;
}

export function useCountries() {
  // État réactif
  const state = reactive<UseCountriesState>({
    countries: [],
    currentCountry: null,
    loading: false,
    error: null,
    pagination: {
      offset: 0,
      limit: COUNTRY_DEFAULTS.PAGINATION.LIMIT,
      count: 0,
    },
    filters: {},
    revision: null,
  });

  const { showSuccess, showError, showWarning } = useNotifications();

  // Getters computed
  const hasCountries = computed(() => state.countries.length > 0);
  const isLoading = computed(() => state.loading);
  const hasError = computed(() => !!state.error);
  const hasMorePages = computed(() => {
    return state.pagination.total
      ? state.pagination.offset + state.pagination.limit < state.pagination.total
      : state.pagination.count >= state.pagination.limit;
  });
  const currentPage = computed(
    () => Math.floor(state.pagination.offset / state.pagination.limit) + 1,
  );

  // Actions
  const setLoading = (loading: boolean) => {
    state.loading = loading;
  };

  const setError = (error: string | null) => {
    state.error = error;
  };

  const clearError = () => {
    state.error = null;
  };

  /**
   * Charge tous les pays avec options de pagination
   */
  const fetchCountries = async (options: PaginationOptions = {}) => {
    setLoading(true);
    clearError();

    try {
      const paginationOptions = {
        offset: options.offset ?? state.pagination.offset,
        limit: options.limit ?? state.pagination.limit,
      };

      const response: CountryListResponse = await countriesService.getAll(paginationOptions);

      state.countries = response.items;
      state.pagination = response.pagination;
      state.revision = response.revision || null;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.getUserMessage() : 'Erreur lors du chargement des pays';

      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge un pays par son identifiant
   */
  const fetchCountryById = async (identifier: string | number) => {
    setLoading(true);
    clearError();

    try {
      const country = await countriesService.getById(identifier);
      state.currentCountry = country;
      return country;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.getUserMessage() : 'Erreur lors du chargement du pays';

      setError(errorMessage);
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée un nouveau pays
   */
  const createCountry = async (countryData: CreateCountryDto): Promise<Country | null> => {
    setLoading(true);
    clearError();

    try {
      const newCountry = await countriesService.create(countryData);

      // Ajouter le nouveau pays à la liste
      state.countries.unshift(newCountry);
      state.pagination.count += 1;

      showSuccess(`Pays "${newCountry.name_en}" créé avec succès`);
      return newCountry;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.getUserMessage() : 'Erreur lors de la création du pays';

      setError(errorMessage);
      showError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Met à jour un pays existant
   */
  const updateCountry = async (
    guid: number,
    countryData: UpdateCountryDto,
  ): Promise<Country | null> => {
    setLoading(true);
    clearError();

    try {
      const updatedCountry = await countriesService.update(guid, countryData);

      // Mettre à jour le pays dans la liste
      const index = state.countries.findIndex((c) => c.guid === guid);
      if (index !== -1) {
        state.countries[index] = updatedCountry;
      }

      // Mettre à jour le pays current si c'est le même
      if (state.currentCountry?.guid === guid) {
        state.currentCountry = updatedCountry;
      }

      showSuccess(`Pays "${updatedCountry.name_en}" mis à jour avec succès`);
      return updatedCountry;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.getUserMessage()
          : 'Erreur lors de la mise à jour du pays';

      setError(errorMessage);
      showError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Supprime un pays
   */
  const deleteCountry = async (guid: number): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      await countriesService.delete(guid);

      // Retirer le pays de la liste
      const index = state.countries.findIndex((c) => c.guid === guid);
      if (index !== -1) {
        const deletedCountry = state.countries[index];
        state.countries.splice(index, 1);
        state.pagination.count -= 1;

        showSuccess(`Pays "${deletedCountry.name_en}" supprimé avec succès`);
      }

      // Vider currentCountry si c'est le pays supprimé
      if (state.currentCountry?.guid === guid) {
        state.currentCountry = null;
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.getUserMessage()
          : 'Erreur lors de la suppression du pays';

      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Applique des filtres et recharge les pays
   */
  const applyFilters = async (filters: CountryFilters, resetPagination = true) => {
    state.filters = { ...filters };

    if (resetPagination) {
      state.pagination.offset = 0;
    }

    setLoading(true);
    clearError();

    try {
      const response = await countriesService.getFiltered(state.filters, {
        offset: state.pagination.offset,
        limit: state.pagination.limit,
      });

      state.countries = response.items;
      state.pagination = response.pagination;
      state.revision = response.revision || null;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.getUserMessage()
          : "Erreur lors de l'application des filtres";

      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efface tous les filtres
   */
  const clearFilters = async () => {
    state.filters = {};
    state.pagination.offset = 0;
    await fetchCountries();
  };

  /**
   * Charge la page suivante
   */
  const loadNextPage = async () => {
    if (!hasMorePages.value) return;

    const nextOffset = state.pagination.offset + state.pagination.limit;

    if (Object.keys(state.filters).length > 0) {
      await applyFilters(state.filters, false);
    } else {
      await fetchCountries({
        offset: nextOffset,
        limit: state.pagination.limit,
      });
    }
  };

  /**
   * Charge la page précédente
   */
  const loadPreviousPage = async () => {
    if (state.pagination.offset <= 0) return;

    const prevOffset = Math.max(0, state.pagination.offset - state.pagination.limit);

    if (Object.keys(state.filters).length > 0) {
      await applyFilters(state.filters, false);
    } else {
      await fetchCountries({
        offset: prevOffset,
        limit: state.pagination.limit,
      });
    }
  };

  /**
   * Va à une page spécifique
   */
  const goToPage = async (page: number) => {
    const offset = (page - 1) * state.pagination.limit;

    if (Object.keys(state.filters).length > 0) {
      state.pagination.offset = offset;
      await applyFilters(state.filters, false);
    } else {
      await fetchCountries({
        offset,
        limit: state.pagination.limit,
      });
    }
  };

  /**
   * Recherche un pays par code
   */
  const searchByCode = async (code: string): Promise<Country | null> => {
    setLoading(true);
    clearError();

    try {
      const country = await countriesService.getByCode(code);
      state.currentCountry = country;
      return country;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.getUserMessage() : 'Pays non trouvé';

      setError(errorMessage);
      showWarning(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualise les données (utile pour les mises à jour en temps réel)
   */
  const refresh = async () => {
    if (Object.keys(state.filters).length > 0) {
      await applyFilters(state.filters, false);
    } else {
      await fetchCountries({
        offset: state.pagination.offset,
        limit: state.pagination.limit,
      });
    }
  };

  // Retour de l'interface publique
  return {
    // État
    state: readonly(state),

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
