<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Supprimer le pays
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer le pays
                  <span class="font-semibold">{{ country?.name_en }}</span>
                  <span v-if="country?.name_local"> ({{ country.name_local }})</span> ?
                </p>
                <p class="text-sm text-gray-500 mt-2">
                  Cette action est irréversible et toutes les données associées seront définitivement perdues.
                </p>

                <!-- Détails du pays -->
                <div v-if="country" class="mt-4 p-3 bg-gray-50 rounded-md">
                  <div class="flex items-center space-x-3 mb-2">
                    <span class="text-2xl">{{ generateFlagEmoji(country.code) }}</span>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ country.name_en }}</div>
                      <div class="text-xs text-gray-500">Code: {{ country.code }} • GUID: {{ country.guid }}</div>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 space-y-1">
                    <div>Devise: {{ country.default_currency_code }}</div>
                    <div>Langue: {{ country.default_language_code }}</div>
                    <div>Téléphone: {{ country.phone_prefix }}</div>
                    <div>Fuseau: {{ country.timezone_default || 'UTC' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
              type="button"
              @click="$emit('confirm')"
              :disabled="isDeleting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isDeleting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
          </button>
          <button
              type="button"
              @click="$emit('close')"
              :disabled="isDeleting"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Country, CountryFormattingUtils } from '@toke/shared';

// Props
interface Props {
  isOpen: boolean;
  country?: Country | null;
}

const props = withDefaults(defineProps<Props>(), {
  country: null
});

// Emits
const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

// État local
const isDeleting = ref(false);

// Méthodes
const generateFlagEmoji = (countryCode: string): string => {
  return CountryFormattingUtils.generateFlagEmoji(countryCode);
};
</script>