<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <form @submit.prevent="handleSubmit">
          <div class="bg-white px-6 pt-6 pb-4">
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-gray-900" id="modal-title">
                {{ isEditing ? 'Modifier le pays' : 'Créer un nouveau pays' }}
              </h3>
              <p class="mt-2 text-sm text-gray-600">
                {{ isEditing ? 'Modifiez les informations du pays' : 'Remplissez les informations du nouveau pays' }}
              </p>
            </div>

            <!-- Affichage des erreurs de validation -->
            <div v-if="validationErrors.length > 0" class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">Erreurs de validation :</h3>
                  <ul class="mt-2 text-sm text-red-700 list-disc list-inside">
                    <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Code pays -->
              <div>
                <label for="code" class="block text-sm font-medium text-gray-700 mb-2">
                  Code pays (ISO) *
                </label>
                <input
                    id="code"
                    v-model="form.code"
                    type="text"
                    maxlength="2"
                    placeholder="CM"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                    :class="{ 'border-red-500': getFieldError('code') }"
                    required
                />
                <p v-if="getFieldError('code')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('code') }}
                </p>
              </div>

              <!-- Nom anglais -->
              <div>
                <label for="name_en" class="block text-sm font-medium text-gray-700 mb-2">
                  Nom (anglais) *
                </label>
                <input
                    id="name_en"
                    v-model="form.name_en"
                    type="text"
                    placeholder="Cameroon"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('name_en') }"
                    required
                />
                <p v-if="getFieldError('name_en')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('name_en') }}
                </p>
              </div>

              <!-- Nom local -->
              <div>
                <label for="name_local" class="block text-sm font-medium text-gray-700 mb-2">
                  Nom local
                </label>
                <input
                    id="name_local"
                    v-model="form.name_local"
                    type="text"
                    placeholder="Cameroun"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('name_local') }"
                />
                <p v-if="getFieldError('name_local')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('name_local') }}
                </p>
              </div>

              <!-- Code devise -->
              <div>
                <label for="default_currency_code" class="block text-sm font-medium text-gray-700 mb-2">
                  Code devise *
                </label>
                <select
                    id="default_currency_code"
                    v-model="form.default_currency_code"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('default_currency_code') }"
                    required
                >
                  <option value="">Sélectionnez une devise</option>
                  <option v-for="currency in popularCurrencies" :key="currency" :value="currency">
                    {{ currency }}
                  </option>
                </select>
                <p v-if="getFieldError('default_currency_code')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('default_currency_code') }}
                </p>
              </div>

              <!-- Code langue -->
              <div>
                <label for="default_language_code" class="block text-sm font-medium text-gray-700 mb-2">
                  Code langue *
                </label>
                <select
                    id="default_language_code"
                    v-model="form.default_language_code"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('default_language_code') }"
                    required
                >
                  <option value="">Sélectionnez une langue</option>
                  <option value="fr">Français (fr)</option>
                  <option value="en">Anglais (en)</option>
                  <option value="es">Espagnol (es)</option>
                  <option value="ar">Arabe (ar)</option>
                  <option value="pt">Portugais (pt)</option>
                  <option value="de">Allemand (de)</option>
                </select>
                <p v-if="getFieldError('default_language_code')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('default_language_code') }}
                </p>
              </div>

              <!-- Préfixe téléphonique -->
              <div>
                <label for="phone_prefix" class="block text-sm font-medium text-gray-700 mb-2">
                  Préfixe téléphonique *
                </label>
                <input
                    id="phone_prefix"
                    v-model="form.phone_prefix"
                    type="text"
                    placeholder="+237"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('phone_prefix') }"
                    required
                />
                <p v-if="getFieldError('phone_prefix')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('phone_prefix') }}
                </p>
              </div>

              <!-- Fuseau horaire -->
              <div class="md:col-span-2">
                <label for="timezone_default" class="block text-sm font-medium text-gray-700 mb-2">
                  Fuseau horaire
                </label>
                <select
                    id="timezone_default"
                    v-model="form.timezone_default"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{ 'border-red-500': getFieldError('timezone_default') }"
                >
                  <option value="">UTC (par défaut)</option>
                  <option v-for="timezone in popularTimezones" :key="timezone" :value="timezone">
                    {{ timezone }}
                  </option>
                </select>
                <p v-if="getFieldError('timezone_default')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('timezone_default') }}
                </p>
              </div>

              <!-- Statut actif -->
              <div class="md:col-span-2">
                <div class="flex items-center">
                  <input
                      id="active"
                      v-model="form.active"
                      type="checkbox"
                      class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label for="active" class="ml-2 block text-sm text-gray-700">
                    Pays actif
                  </label>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  Décochez pour désactiver temporairement ce pays
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
                type="submit"
                :disabled="isSubmitting"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSubmitting ? 'Sauvegarde...' : (isEditing ? 'Modifier' : 'Créer') }}
            </button>
            <button
                type="button"
                @click="$emit('close')"
                :disabled="isSubmitting"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { Country, CreateCountryDto, UpdateCountryDto, POPULAR_CURRENCIES, POPULAR_TIMEZONES, createCountrySchema, updateCountrySchema } from '@toke/shared';
import { ZodError } from 'zod';

// Props
interface Props {
  isOpen: boolean;
  country?: Country | null;
  isEditing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  country: null,
  isEditing: false
});

// Emits
const emit = defineEmits<{
  close: [];
  save: [data: CreateCountryDto | UpdateCountryDto];
}>();

// État local
const isSubmitting = ref(false);
const validationErrors = ref<string[]>([]);

const form = reactive({
  code: '',
  name_en: '',
  name_local: '',
  default_currency_code: '',
  default_language_code: '',
  phone_prefix: '',
  timezone_default: '',
  active: true
});

// Données statiques
const popularCurrencies = POPULAR_CURRENCIES;
const popularTimezones = POPULAR_TIMEZONES;

// Surveiller les changements de props pour remplir le formulaire
watch(() => props.country, (newCountry) => {
  if (newCountry && props.isEditing) {
    form.code = newCountry.code;
    form.name_en = newCountry.name_en;
    form.name_local = newCountry.name_local || '';
    form.default_currency_code = newCountry.default_currency_code;
    form.default_language_code = newCountry.default_language_code;
    form.phone_prefix = newCountry.phone_prefix;
    form.timezone_default = newCountry.timezone_default || '';
    form.active = newCountry.active;
  } else {
    // Réinitialiser le formulaire pour création
    form.code = '';
    form.name_en = '';
    form.name_local = '';
    form.default_currency_code = '';
    form.default_language_code = '';
    form.phone_prefix = '';
    form.timezone_default = '';
    form.active = true;
  }
  validationErrors.value = [];
}, { immediate: true });

// Surveiller l'ouverture/fermeture du modal
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    validationErrors.value = [];
  }
});

// Fonction pour obtenir les erreurs d'un champ spécifique
const getFieldError = (fieldName: string): string | null => {
  const error = validationErrors.value.find(err =>
      err.toLowerCase().includes(fieldName.toLowerCase())
  );
  return error || null;
};

// Gestion de la soumission du formulaire
const handleSubmit = async () => {
  validationErrors.value = [];
  isSubmitting.value = true;

  try {
    // Préparer les données à envoyer
    const formData = {
      code: form.code.trim().toUpperCase(),
      name_en: form.name_en.trim(),
      name_local: form.name_local.trim() || undefined,
      default_currency_code: form.default_currency_code.trim().toUpperCase(),
      default_language_code: form.default_language_code.trim().toLowerCase(),
      phone_prefix: form.phone_prefix.trim(),
      timezone_default: form.timezone_default.trim() || undefined,
      active: form.active
    };

    // Nettoyer les valeurs undefined pour la création
    const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== undefined)
    );

    // Validation avec Zod
    if (props.isEditing) {
      updateCountrySchema.parse(cleanedData);
    } else {
      createCountrySchema.parse(cleanedData);
    }

    // Émettre l'événement de sauvegarde
    emit('save', cleanedData);

  } catch (error) {
    if (error instanceof ZodError) {
      // Transformer les erreurs Zod en messages lisibles
      validationErrors.value = error.errors.map(err => {
        const field = err.path.join('.');
        switch (field) {
          case 'code':
            return 'Le code pays doit contenir exactement 2 lettres majuscules';
          case 'name_en':
            return 'Le nom anglais est requis (2-128 caractères)';
          case 'name_local':
            return 'Le nom local doit contenir 2-128 caractères';
          case 'default_currency_code':
            return 'Le code devise doit contenir exactement 3 lettres majuscules';
          case 'default_language_code':
            return 'Le code langue doit contenir exactement 2 lettres minuscules';
          case 'phone_prefix':
            return 'Le préfixe téléphonique doit commencer par + suivi de 1-5 chiffres';
          case 'timezone_default':
            return 'Format de fuseau horaire invalide';
          default:
            return err.message;
        }
      });
    } else {
      validationErrors.value = ['Une erreur de validation est survenue'];
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>