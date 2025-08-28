<template>
  <div class="flex min-h-screen">
    <div class="flex flex-col w-full">
      <!-- Header -->
      <Header />

      <!-- Loader -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
        <svg aria-hidden="true" role="status" class="w-32 h-32 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101"
             fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#3AEA52"/>
        </svg>
        <p class="mt-4 font-bold text-white animate-pulse">Loading...</p>
      </div>

      <!-- Main Content Area -->
      <div class="flex-grow flex">
        <main class="flex-grow bg-neutral-100 lg:pl-32 lg:p-16 py-6 w-full space-y-6">

          <!-- Header section avec actions -->
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">Gestion des Pays</h1>
              <p class="text-gray-600">Gérez les pays et leurs informations</p>
            </div>

            <div class="flex gap-4">
              <button
                  @click="refreshData"
                  :disabled="isLoading"
                  class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Actualiser
              </button>

              <button
                  @click="openCreateModal"
                  class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                Créer un pays
              </button>
            </div>
          </div>

          <!-- Filtres -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Filtres</h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                <select
                    v-model="filters.default_currency_code"
                    @change="applyFilters"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Toutes les devises</option>
                  <option v-for="currency in popularCurrencies" :key="currency" :value="currency">
                    {{ currency }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                <select
                    v-model="filters.default_language_code"
                    @change="applyFilters"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Toutes les langues</option>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="ar">Arabe</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                    v-model="filters.is_active"
                    @change="applyFilters"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option :value="undefined">Tous les statuts</option>
                  <option :value="true">Actif</option>
                  <option :value="false">Inactif</option>
                </select>
              </div>

              <div class="flex items-end">
                <button
                    @click="clearAllFilters"
                    class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              </div>
            </div>
          </div>

          <!-- Message d'erreur -->
          <div v-if="hasError" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <div class="flex">
              <div class="ml-3">
                <p class="text-sm">{{ state.error }}</p>
                <button
                    @click="clearError"
                    class="text-red-500 hover:text-red-700 text-sm underline mt-1"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>

          <!-- Liste des pays -->
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">
                Pays ({{ state.pagination.count }})
              </h3>
            </div>

            <div v-if="!hasCountries && !isLoading" class="p-8 text-center text-gray-500">
              <p class="text-lg">Aucun pays trouvé</p>
              <p class="text-sm mt-2">Créez votre premier pays ou modifiez vos filtres</p>
            </div>

            <div v-else class="divide-y divide-gray-200">
              <div
                  v-for="country in state.countries"
                  :key="country.guid"
                  class="p-6 hover:bg-gray-50 transition-colors duration-150"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-grow">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">{{ generateFlagEmoji(country.code) }}</span>
                      <div>
                        <h4 class="text-lg font-semibold text-gray-900">
                          {{ country.name_en }}
                          <span v-if="country.name_local" class="text-sm text-gray-500 font-normal">
                            ({{ country.name_local }})
                          </span>
                        </h4>
                        <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>Code: {{ country.code }}</span>
                          <span>Devise: {{ country.default_currency_code }}</span>
                          <span>Langue: {{ country.default_language_code }}</span>
                          <span>Téléphone: {{ country.phone_prefix }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center space-x-3">
                    <span
                        :class="country.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                        class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ country.active ? 'Actif' : 'Inactif' }}
                    </span>

                    <div class="flex space-x-2">
                      <button
                          @click="editCountry(country)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Modifier
                      </button>
                      <button
                          @click="confirmDelete(country)"
                          class="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="hasCountries" class="flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow-md">
            <div class="flex items-center text-sm text-gray-700">
              <span>
                Page {{ currentPage }} • {{ state.pagination.count }} résultats
              </span>
            </div>

            <div class="flex space-x-2">
              <button
                  @click="loadPreviousPage"
                  :disabled="state.pagination.offset <= 0 || isLoading"
                  class="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                  @click="loadNextPage"
                  :disabled="!hasMorePages || isLoading"
                  class="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>

        </main>
      </div>

      <!-- Footer -->
      <Footer />
    </div>
  </div>

  <!-- Modal de création/édition -->
  <CountryFormModal
      :is-open="isModalOpen"
      :country="selectedCountry"
      :is-editing="isEditing"
      @close="closeModal"
      @save="handleSave"
  />

  <!-- Modal de confirmation de suppression -->
  <ConfirmDeleteModal
      :is-open="isDeleteModalOpen"
      :country="countryToDelete"
      @close="closeDeleteModal"
      @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Country, POPULAR_CURRENCIES, CountryFormattingUtils } from '@toke/shared';
import { useCountries } from '@/composables/useCountries';
import Header from "./components/layouts/header.vue";
import Footer from "./components/layouts/footer.vue";
import CountryFormModal from "./components/country/countryFormModal.vue";
import ConfirmDeleteModal from "./components/country/confirmDeleteModal.vue";

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

// Chargement initial
onMounted(() => {
  fetchCountries();
});
</script>