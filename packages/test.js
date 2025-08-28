import { Country, POPULAR_CURRENCIES, CountryFormattingUtils } from '@toke/shared';
import { useCountries } from '@/composables/useCountries';
import Header from "./components/layouts/header.vue";
import Footer from "./components/layouts/footer.vue";
// import CountryFormModal from "./components/country/CountryFormModal.vue";
import ConfirmDeleteModal from "./components/country/ConfirmDeleteModal.vue";

// Composables
const {
    state,
    hasCountries,
    isLoading,
    hasError,
    hasMorePages,
    currentPage,
    fetchCountries,
    createCountry,
    updateCountry,
    deleteCountry,
    applyFilters: applyCountryFilters,
    clearFilters,
    loadNextPage,
    loadPreviousPage,
    refresh,
    clearError
} = useCountries();

// État local du composant
const isModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const selectedCountry = ref<Country | null>(null);
const isEditing = ref(false);
const countryToDelete = ref<Country | null>(null);

const filters = reactive({
    default_currency_code: '',
    default_language_code: '',
    is_active: undefined as boolean | undefined
});

const popularCurrencies = POPULAR_CURRENCIES;

// Méthodes
const openCreateModal = () => {
    selectedCountry.value = null;
    isEditing.value = false;
    isModalOpen.value = true;
};

const editCountry = (country: Country) => {
    selectedCountry.value = country;
    isEditing.value = true;
    isModalOpen.value = true;
};

const closeModal = () => {
    isModalOpen.value = false;
    selectedCountry.value = null;
    isEditing.value = false;
};

const handleSave = async (countryData: any) => {
    if (isEditing.value && selectedCountry.value) {
        await updateCountry(selectedCountry.value.guid, countryData);
    } else {
        await createCountry(countryData);
    }
    closeModal();
};

const confirmDelete = (country: Country) => {
    countryToDelete.value = country;
    isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
    isDeleteModalOpen.value = false;
    countryToDelete.value = null;
};

const handleDelete = async () => {
    if (countryToDelete.value) {
        await deleteCountry(countryToDelete.value.guid);
        closeDeleteModal();
    }
};

const applyFilters = () => {
    const activeFilters: any = {};

    if (filters.default_currency_code) {
        activeFilters.default_currency_code = filters.default_currency_code;
    }
    if (filters.default_language_code) {
        activeFilters.default_language_code = filters.default_language_code;
    }
    if (filters.is_active !== undefined) {
        activeFilters.is_active = filters.is_active;
    }

    applyCountryFilters(activeFilters);
};

const clearAllFilters = () => {
    filters.default_currency_code = '';
    filters.default_language_code = '';
    filters.is_active = undefined;
    clearFilters();
};

const refreshData = () => {
    refresh();
};

const generateFlagEmoji = (countryCode: string): string => {
    return CountryFormattingUtils.generateFlagEmoji(countryCode);
};