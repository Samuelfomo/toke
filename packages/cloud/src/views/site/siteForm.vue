<template>
  <div class="flex min-h-screen">
    <div class="flex flex-col w-full">
      <Header />

      <!-- Loader -->
      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
        <svg aria-hidden="true" role="status" class="w-40 h-40 text-gray-200 animate-spin dark:text-gray-600"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#006FFF"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 6l0 -3" />
          <path d="M16.25 7.75l2.15 -2.15" />
          <path d="M18 12l3 0" />
          <path d="M16.25 16.25l2.15 2.15" />
          <path d="M12 18l0 3" />
          <path d="M7.75 16.25l-2.15 2.15" />
          <path d="M6 12l-3 0" />
          <path d="M7.75 7.75l-2.15 -2.15" />
        </svg>
        <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Chargement...</p>
      </div>

      <div class="flex-grow flex">
        <main class="flex-grow bg-gradient-to-br from-blue-600 to-white rounded-lg shadow-md lg:pl-32 lg:p-16 py-6 w-full">
          <div class="bg-gray-50 bg-opacity-90 px-8 py-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-3xl font-semibold text-gray-800">
                {{ isEditMode ? 'Modifier le Site' : 'Ajouter un Nouveau Site' }}
              </h3>
              <button @click="goBack" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Retour
              </button>
            </div>

            <div class="bg-white p-8 rounded-lg shadow-md">
              <form @submit.prevent="submitSite">
                <!-- Informations Générales -->
                <div class="mb-8">
                  <h4 class="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">Informations Générales</h4>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Nom du Site -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="site-name">
                        Nom du Site <span class="text-red-500">*</span>
                      </label>
                      <input v-model="formData.name" id="site-name" type="text" required
                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             placeholder="Ex: IMEDIATIS SARL"/>
                    </div>

                    <!-- Type de Site -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="site-type">
                        Type de Site <span class="text-red-500">*</span>
                      </label>
                      <select v-model="formData.site_type" id="site-type" required
                              class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Sélectionner un type</option>
                        <option value="global_site">Global Site</option>
                        <option value="manager_site">Manager Site</option>
                      </select>
                    </div>

                    <!-- Rayon de Géofencing -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="geofence-radius">
                        Rayon de Géofencing (mètres) <span class="text-red-500">*</span>
                      </label>
                      <input v-model.number="formData.geofence_radius" id="geofence-radius" type="number" required min="1"
                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             placeholder="Ex: 100"/>
                    </div>

                    <!-- Statut -->
                    <div class="flex items-center space-x-6 pt-8">
                      <label class="inline-flex items-center">
                        <input type="checkbox" v-model="formData.active" class="form-checkbox h-5 w-5 accent-green-600"/>
                        <span class="ml-2 font-medium text-base">Site Actif</span>
                      </label>
                      <label class="inline-flex items-center">
                        <input type="checkbox" v-model="formData.public" class="form-checkbox h-5 w-5 accent-blue-600"/>
                        <span class="ml-2 font-medium text-base">Site Public</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Adresse -->
                <div class="mb-8">
                  <h4 class="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">Adresse</h4>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Ville -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="city">
                        Ville <span class="text-red-500">*</span>
                      </label>
                      <input v-model="formData.address.city" id="city" type="text" required
                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             placeholder="Ex: Douala"/>
                    </div>

                    <!-- Localisation -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="location">
                        Localisation <span class="text-red-500">*</span>
                      </label>
                      <input v-model="formData.address.location" id="location" type="text" required
                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             placeholder="Ex: Makepe"/>
                    </div>

                    <!-- Nom du Lieu -->
                    <div>
                      <label class="text-gray-700 block font-medium text-base mb-2" for="place-name">
                        Nom du Lieu
                      </label>
                      <input v-model="formData.address.place_name" id="place-name" type="text"
                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             placeholder="Ex: ABOU DE BANGUI"/>
                    </div>
                  </div>
                </div>

                <!-- Coordonnées Géographiques -->
                <div class="mb-8">
                  <div class="flex items-center justify-between mb-4 pb-2 border-b">
                    <h4 class="text-xl font-semibold text-gray-700">Coordonnées Géographiques (Polygone)</h4>
                    <button type="button" @click="openMapSelector"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                      Sélectionner sur la carte
                    </button>
                  </div>

                  <div class="bg-gray-50 p-4 rounded">
                    <p class="text-sm text-gray-600 mb-3">
                      Les coordonnées définissent la zone géographique du site.
                      Vous pouvez les saisir manuellement ci-dessous ou les sélectionner sur la carte.
                    </p>

                    <!-- Saisie manuelle des points -->
                    <div class="mb-4">
                      <div class="flex items-center justify-between mb-2">
                        <label class="text-sm font-medium text-gray-700">Ajouter un point manuellement</label>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input v-model.number="manualPoint.lng" type="number" step="0.000001"
                               class="p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Longitude (ex: 9.751171)"/>
                        <input v-model.number="manualPoint.lat" type="number" step="0.000001"
                               class="p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Latitude (ex: 4.085104)"/>
                        <button type="button" @click="addManualPoint"
                                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                          Ajouter le point
                        </button>
                      </div>
                    </div>

                    <!-- Liste des points -->
                    <div v-if="formData.geofence_polygon.coordinates[0] && formData.geofence_polygon.coordinates[0].length > 0">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">
                          Points du polygone: {{ formData.geofence_polygon.coordinates[0].length - 1 }}
                          <span class="text-xs text-gray-500">(minimum 3 requis)</span>
                        </span>
                        <button type="button" @click="clearCoordinates"
                                class="text-sm text-red-600 hover:text-red-800 font-medium">
                          Tout effacer
                        </button>
                      </div>
                      <div class="max-h-60 overflow-y-auto bg-white p-3 rounded border border-gray-200">
                        <div v-for="(coord, index) in displayCoordinates" :key="index"
                             class="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded group">
                          <span class="text-sm text-gray-700">
                            <span class="font-medium text-blue-600">Point {{ index + 1 }}:</span>
                            <span class="ml-2">Lng: {{ coord[0].toFixed(6) }}, Lat: {{ coord[1].toFixed(6) }}</span>
                          </span>
                          <button type="button" @click="removePoint(index)"
                                  class="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-6 text-gray-500 text-sm bg-white rounded border border-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                      <p>Aucune coordonnée définie.</p>
                      <p class="text-xs mt-1">Ajoutez des points manuellement ou cliquez sur "Sélectionner sur la carte"</p>
                    </div>
                  </div>
                </div>

                <!-- Boutons d'Action -->
                <div class="flex justify-end space-x-4 pt-6 border-t">
                  <button type="button" @click="goBack"
                          class="px-6 py-3 bg-gray-300 shadow font-medium tracking-wider text-black rounded hover:shadow-lg hover:bg-gray-600 hover:text-gray-100">
                    Annuler
                  </button>
                  <button type="submit" ref="submitButton"
                          class="px-6 py-3 bg-lime-700 text-white font-medium rounded hover:bg-lime-800 tracking-wider transition shadow-sm hover:shadow-lg">
                    {{ isEditMode ? 'Mettre à Jour' : 'Enregistrer' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      <!-- Message dynamique -->
      <div ref="successMessage"
           :class="['fixed right-8 top-[10%] text-white p-4 rounded-lg shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 z-[100]',
                    messageType === 'success' ? 'bg-green-600' : 'bg-red-600']">
        <div class="flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>{{ messageText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import Header from "@/views/components/header.vue";
import HeadBuilder from "@/utils/HeadBuilder";
import SiteService from "@/service/SiteService";
import {CreateSite} from "@/utils/interfaces/site.interface";
import { useUserStore } from '@/composables/userStore';

const route = useRoute();
const router = useRouter();
const isLoading = ref(false);
const siteGuid = ref<string | null>(route.query.guid ? String(route.query.guid) : null);
const isEditMode = computed(() => !!siteGuid.value && siteGuid.value !== 'new');
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');
const submitButton = ref(null);

const userStore = useUserStore();

const formData = ref<CreateSite>({
  name: '',
  site_type: '',
  address: {
    city: '',
    location: '',
    place_name: ''
  },
  geofence_radius: 100,
  active: true,
  public: false,
  geofence_polygon: {
    crs: {
      type: "name",
      properties: {
        name: "EPSG:4326"
      }
    },
    type: "Polygon",
    coordinates: [[]]
  },
  created_by: userStore.user?.guid || '',
});

const manualPoint = ref({
  lng: null as number | null,
  lat: null as number | null
});

// Coordonnées à afficher (sans le point de fermeture dupliqué)
const displayCoordinates = computed(() => {
  const coords = formData.value.geofence_polygon.coordinates[0];
  if (coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
    return coords.slice(0, -1);
  }
  return coords;
});

const goBack = () => {
  router.push('/sites');
};

const openMapSelector = () => {
  sessionStorage.setItem('siteFormData', JSON.stringify(formData.value));
  const guid = siteGuid.value || 'new';
  router.push({
    path: '/sites/map',
    query: { guid, mode: 'select' }
  });
};

const addManualPoint = () => {
  if (manualPoint.value.lng === null || manualPoint.value.lat === null) {
    messageType.value = 'error';
    messageText.value = 'Veuillez entrer une longitude et une latitude valides';
    showMessage();
    return;
  }

  // Valider les coordonnées
  if (Math.abs(manualPoint.value.lat) > 90 || Math.abs(manualPoint.value.lng) > 180) {
    messageType.value = 'error';
    messageText.value = 'Coordonnées invalides (Lat: -90 à 90, Lng: -180 à 180)';
    showMessage();
    return;
  }

  // Retirer le point de fermeture s'il existe
  const coords = formData.value.geofence_polygon.coordinates[0];
  const hasClosingPoint = coords.length > 0 &&
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1];

  if (hasClosingPoint) {
    coords.pop();
  }

  // Ajouter le nouveau point
  coords.push([manualPoint.value.lng, manualPoint.value.lat]);

  // Ajouter le point de fermeture si on a au moins 3 points
  if (coords.length >= 3) {
    coords.push([...coords[0]]);
  }

  // Réinitialiser le formulaire
  manualPoint.value = { lng: null, lat: null };

  messageType.value = 'success';
  messageText.value = `Point ${coords.length - (coords.length >= 3 ? 1 : 0)} ajouté`;
  showMessage();
};

const removePoint = (index: number) => {
  const coords = formData.value.geofence_polygon.coordinates[0];

  // Retirer le point de fermeture s'il existe
  const hasClosingPoint = coords.length > 0 &&
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1];

  if (hasClosingPoint) {
    coords.pop();
  }

  // Supprimer le point à l'index
  coords.splice(index, 1);

  // Rajouter le point de fermeture si on a encore au moins 3 points
  if (coords.length >= 3) {
    coords.push([...coords[0]]);
  }
};

const clearCoordinates = () => {
  formData.value.geofence_polygon.coordinates = [[]];
  messageType.value = 'success';
  messageText.value = 'Tous les points ont été effacés';
  showMessage();
};

const showMessage = () => {
  gsap.to(successMessage.value, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: 'power3.out',
    onComplete: () => {
      setTimeout(() => {
        gsap.to(successMessage.value, {
          opacity: 0,
          y: -10,
          duration: 0.5
        });
      }, 2000);
    }
  });
};

const loadSiteData = async () => {
  if (!siteGuid.value || siteGuid.value === 'new') return;

  isLoading.value = true;
  try {
    const response = await SiteService.getSite(siteGuid.value);
    Object.assign(formData.value, response.data.site);
    formData.value.created_by = response.data.site.created_by.guid;
    isLoading.value = false;
  } catch (error) {
    messageType.value = 'error';
    messageText.value = 'Erreur lors du chargement des données';
    showMessage();
    isLoading.value = false;
  }
};

const submitSite = async () => {
  if (!formData.value.name || !formData.value.site_type || !formData.value.address.city || !formData.value.address.location) {
    messageType.value = 'error';
    messageText.value = 'Veuillez remplir tous les champs obligatoires';
    showMessage();
    return;
  }

  const coords = formData.value.geofence_polygon.coordinates[0];
  const actualPointsCount = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
      ? coords.length - 1
      : coords.length;

  if (actualPointsCount < 3) {
    messageType.value = 'error';
    messageText.value = 'Veuillez définir au moins 3 points pour le polygone';
    showMessage();
    return;
  }

  isLoading.value = true;
  try {
    const response = isEditMode.value
        ? await SiteService.updateSite(siteGuid.value!, formData.value)
        : await SiteService.createSite(formData.value);

    gsap.to(submitButton.value, {
      scale: 0.95,
      duration: 0.1,
      onComplete: () => {
        gsap.to(submitButton.value, {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.3)'
        });
      }
    });

    const isSuccess =
        (isEditMode.value && response.success) ||
        (!isEditMode.value && response.success);

    if (!isSuccess) {
      messageType.value = 'error';
      messageText.value =
          response?.data?.error?.message ||
          (isEditMode.value ? 'Échec de la mise à jour du site' : 'Échec de la création du site');

      showMessage();
    } else {
      messageType.value = 'success';
      messageText.value = isEditMode.value
          ? 'Site mis à jour avec succès'
          : 'Site créé avec succès';

      showMessage();

      setTimeout(() => {
        router.push('/sites');
      }, 2000);
    }

  } catch (error: any) {
    messageType.value = 'error';
    messageText.value = error.response?.data?.message || 'Une erreur est survenue';
    showMessage();
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Site - Toké',
    css: [],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  // Vérifier si des données ont été sauvegardées depuis la carte
  const savedData = sessionStorage.getItem('siteFormData');
  if (savedData) {
    const parsed = JSON.parse(savedData);
    Object.assign(formData.value, parsed);
    sessionStorage.removeItem('siteFormData');
  } else if (isEditMode.value) {
    await loadSiteData();
  }
});
</script>

<style scoped>
.fixed {
  transition: opacity 0.5s ease;
}
</style>

<!--<template>-->
<!--  <div class="flex min-h-screen">-->
<!--    <div class="flex flex-col w-full">-->
<!--      <Header />-->

<!--      &lt;!&ndash; Loader &ndash;&gt;-->
<!--      <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">-->
<!--        <svg aria-hidden="true" role="status" class="w-40 h-40 text-gray-200 animate-spin dark:text-gray-600"-->
<!--             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#006FFF"-->
<!--             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">-->
<!--          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>-->
<!--          <path d="M12 6l0 -3" />-->
<!--          <path d="M16.25 7.75l2.15 -2.15" />-->
<!--          <path d="M18 12l3 0" />-->
<!--          <path d="M16.25 16.25l2.15 2.15" />-->
<!--          <path d="M12 18l0 3" />-->
<!--          <path d="M7.75 16.25l-2.15 2.15" />-->
<!--          <path d="M6 12l-3 0" />-->
<!--          <path d="M7.75 7.75l-2.15 -2.15" />-->
<!--        </svg>-->
<!--        <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Chargement...</p>-->
<!--      </div>-->

<!--      <div class="flex-grow flex">-->
<!--        <main class="flex-grow bg-gradient-to-br from-blue-600 to-white rounded-lg shadow-md lg:pl-32 lg:p-16 py-6 w-full">-->
<!--          <div class="bg-gray-50 bg-opacity-90 px-8 py-6">-->
<!--            <div class="flex items-center justify-between mb-6">-->
<!--              <h3 class="text-3xl font-semibold text-gray-800">-->
<!--                {{ siteGuid ? 'Modifier le Site' : 'Ajouter un Nouveau Site' }}-->
<!--              </h3>-->
<!--              <button @click="goBack" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center">-->
<!--                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">-->
<!--                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>-->
<!--                </svg>-->
<!--                Retour-->
<!--              </button>-->
<!--            </div>-->

<!--            <div class="bg-white p-8 rounded-lg shadow-md">-->
<!--              <form @submit.prevent="submitSite">-->
<!--                &lt;!&ndash; Informations Générales &ndash;&gt;-->
<!--                <div class="mb-8">-->
<!--                  <h4 class="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">Informations Générales</h4>-->

<!--                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">-->
<!--                    &lt;!&ndash; Nom du Site &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="site-name">-->
<!--                        Nom du Site <span class="text-red-500">*</span>-->
<!--                      </label>-->
<!--                      <input v-model="formData.name" id="site-name" type="text" required-->
<!--                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"-->
<!--                             placeholder="Ex: IMEDIATIS SARL"/>-->
<!--                    </div>-->

<!--                    &lt;!&ndash; Type de Site &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="site-type">-->
<!--                        Type de Site <span class="text-red-500">*</span>-->
<!--                      </label>-->
<!--                      <select v-model="formData.site_type" id="site-type" required-->
<!--                              class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">-->
<!--                        <option value="">Sélectionner un type</option>-->
<!--                        <option value="global_site">Global Site</option>-->
<!--                        <option value="manager_site">Manager Site</option>-->
<!--                      </select>-->
<!--                    </div>-->

<!--                    &lt;!&ndash; Rayon de Géofencing &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="geofence-radius">-->
<!--                        Rayon de Géofencing (mètres) <span class="text-red-500">*</span>-->
<!--                      </label>-->
<!--                      <input v-model.number="formData.geofence_radius" id="geofence-radius" type="number" required min="1"-->
<!--                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"-->
<!--                             placeholder="Ex: 100"/>-->
<!--                    </div>-->

<!--                    &lt;!&ndash; Statut &ndash;&gt;-->
<!--                    <div class="flex items-center space-x-6 pt-8">-->
<!--                      <label class="inline-flex items-center">-->
<!--                        <input type="checkbox" v-model="formData.active" class="form-checkbox h-5 w-5 accent-green-600"/>-->
<!--                        <span class="ml-2 font-medium text-base">Site Actif</span>-->
<!--                      </label>-->
<!--                      <label class="inline-flex items-center">-->
<!--                        <input type="checkbox" v-model="formData.public" class="form-checkbox h-5 w-5 accent-blue-600"/>-->
<!--                        <span class="ml-2 font-medium text-base">Site Public</span>-->
<!--                      </label>-->
<!--                    </div>-->
<!--                  </div>-->
<!--                </div>-->

<!--                &lt;!&ndash; Adresse &ndash;&gt;-->
<!--                <div class="mb-8">-->
<!--                  <h4 class="text-xl font-semibold text-gray-700 mb-4 pb-2 border-b">Adresse</h4>-->

<!--                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">-->
<!--                    &lt;!&ndash; Ville &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="city">-->
<!--                        Ville <span class="text-red-500">*</span>-->
<!--                      </label>-->
<!--                      <input v-model="formData.address.city" id="city" type="text" required-->
<!--                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"-->
<!--                             placeholder="Ex: Douala"/>-->
<!--                    </div>-->

<!--                    &lt;!&ndash; Localisation &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="location">-->
<!--                        Localisation <span class="text-red-500">*</span>-->
<!--                      </label>-->
<!--                      <input v-model="formData.address.location" id="location" type="text" required-->
<!--                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"-->
<!--                             placeholder="Ex: Makepe"/>-->
<!--                    </div>-->

<!--                    &lt;!&ndash; Nom du Lieu &ndash;&gt;-->
<!--                    <div>-->
<!--                      <label class="text-gray-700 block font-medium text-base mb-2" for="place-name">-->
<!--                        Nom du Lieu-->
<!--                      </label>-->
<!--                      <input v-model="formData.address.place_name" id="place-name" type="text"-->
<!--                             class="p-4 w-full border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"-->
<!--                             placeholder="Ex: ABOU DE BANGUI"/>-->
<!--                    </div>-->
<!--                  </div>-->
<!--                </div>-->

<!--                &lt;!&ndash; Coordonnées Géographiques &ndash;&gt;-->
<!--                <div class="mb-8">-->
<!--                  <div class="flex items-center justify-between mb-4 pb-2 border-b">-->
<!--                    <h4 class="text-xl font-semibold text-gray-700">Coordonnées Géographiques (Polygone)</h4>-->
<!--                    <button type="button" @click="openMapSelector"-->
<!--                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm">-->
<!--                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">-->
<!--                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>-->
<!--                      </svg>-->
<!--                      Sélectionner sur la carte-->
<!--                    </button>-->
<!--                  </div>-->

<!--                  <div class="bg-gray-50 p-4 rounded">-->
<!--                    <p class="text-sm text-gray-600 mb-3">-->
<!--                      Les coordonnées définissent la zone géographique du site.-->
<!--                      Vous pouvez les saisir manuellement ou les sélectionner sur la carte.-->
<!--                    </p>-->

<!--                    <div v-if="formData.geofence_polygon.coordinates[0] && formData.geofence_polygon.coordinates[0].length > 0">-->
<!--                      <div class="flex items-center justify-between mb-2">-->
<!--                        <span class="text-sm font-medium text-gray-700">-->
<!--                          Points du polygone: {{ formData.geofence_polygon.coordinates[0].length }}-->
<!--                        </span>-->
<!--                        <button type="button" @click="clearCoordinates"-->
<!--                                class="text-sm text-red-600 hover:text-red-800">-->
<!--                          Effacer-->
<!--                        </button>-->
<!--                      </div>-->
<!--                      <div class="max-h-40 overflow-y-auto bg-white p-3 rounded border border-gray-200">-->
<!--                        <div v-for="(coord, index) in formData.geofence_polygon.coordinates[0]" :key="index"-->
<!--                             class="text-xs text-gray-600 py-1">-->
<!--                          Point {{ index + 1 }}: [{{ coord[0].toFixed(6) }}, {{ coord[1].toFixed(6) }}]-->
<!--                        </div>-->
<!--                      </div>-->
<!--                    </div>-->
<!--                    <div v-else class="text-center py-4 text-gray-500 text-sm">-->
<!--                      Aucune coordonnée définie. Cliquez sur "Sélectionner sur la carte" pour définir la zone.-->
<!--                    </div>-->
<!--                  </div>-->
<!--                </div>-->

<!--                &lt;!&ndash; Boutons d'Action &ndash;&gt;-->
<!--                <div class="flex justify-end space-x-4 pt-6 border-t">-->
<!--                  <button type="button" @click="goBack"-->
<!--                          class="px-6 py-3 bg-gray-300 shadow font-medium tracking-wider text-black rounded hover:shadow-lg hover:bg-gray-600 hover:text-gray-100">-->
<!--                    Annuler-->
<!--                  </button>-->
<!--                  <button type="submit" ref="submitButton"-->
<!--                          class="px-6 py-3 bg-lime-700 text-white font-medium rounded hover:bg-lime-800 tracking-wider transition shadow-sm hover:shadow-lg">-->
<!--                    {{ siteGuid ? 'Mettre à Jour' : 'Enregistrer' }}-->
<!--                  </button>-->
<!--                </div>-->
<!--              </form>-->
<!--            </div>-->
<!--          </div>-->
<!--        </main>-->
<!--      </div>-->

<!--      &lt;!&ndash; Message dynamique &ndash;&gt;-->
<!--      <div ref="successMessage"-->
<!--           :class="['fixed right-8 top-[10%] text-white p-4 rounded-lg shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 z-[100]',-->
<!--                    messageType === 'success' ? 'bg-green-600' : 'bg-red-600']">-->
<!--        <div class="flex items-center">-->
<!--          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>-->
<!--          </svg>-->
<!--          <span>{{ messageText }}</span>-->
<!--        </div>-->
<!--      </div>-->

<!--&lt;!&ndash;      <Footer />&ndash;&gt;-->
<!--    </div>-->
<!--  </div>-->
<!--</template> -->

<!--<script setup lang="ts">-->
<!--import { ref, onMounted } from 'vue';-->
<!--import { useRoute, useRouter } from 'vue-router';-->
<!--import gsap from 'gsap';-->
<!--import Header from "@/views/components/header.vue";-->
<!--import HeadBuilder from "@/utils/HeadBuilder";-->
<!--import SiteService from "@/service/SiteService";-->
<!--import {CreateSite, Site} from "@/utils/interfaces/site.interface";-->
<!--import { useUserStore } from '@/composables/userStore'-->

<!--const route = useRoute();-->
<!--const router = useRouter();-->
<!--const isLoading = ref(false);-->
<!--const siteGuid = ref<string | any>(route.query.guid || null);-->
<!--const successMessage = ref(null);-->
<!--const messageType = ref('success');-->
<!--const messageText = ref('');-->
<!--const submitButton = ref(null);-->

<!--const userStore = useUserStore();-->

<!--const formData = ref<CreateSite>({-->
<!--  name: '',-->
<!--  site_type: '',-->
<!--  address: {-->
<!--    city: '',-->
<!--    location: '',-->
<!--    place_name: ''-->
<!--  },-->
<!--  geofence_radius: 100,-->
<!--  active: true,-->
<!--  public: false,-->
<!--  geofence_polygon: {-->
<!--    crs: {-->
<!--      type: "name",-->
<!--      properties: {-->
<!--        name: "EPSG:4326"-->
<!--      }-->
<!--    },-->
<!--    type: "Polygon",-->
<!--    coordinates: [[]]-->
<!--  },-->
<!--  created_by: userStore.user?.guid || '',-->
<!--});-->

<!--const goBack = () => {-->
<!--  router.push('/sites');-->
<!--};-->

<!--const openMapSelector = () => {-->
<!--  // Sauvegarder les données actuelles et naviguer vers la carte-->
<!--  sessionStorage.setItem('siteFormData', JSON.stringify(formData.value));-->
<!--  router.push({-->
<!--    path: `/sites/map/?guid=${siteGuid.value || 'new'}`,-->
<!--    query: { mode: 'select' }-->
<!--  });-->
<!--};-->

<!--const clearCoordinates = () => {-->
<!--  formData.value.geofence_polygon.coordinates = [[]];-->
<!--};-->

<!--const showMessage = () => {-->
<!--  gsap.to(successMessage.value, {-->
<!--    opacity: 1,-->
<!--    y: 0,-->
<!--    duration: 0.5,-->
<!--    ease: 'power3.out',-->
<!--    onComplete: () => {-->
<!--      setTimeout(() => {-->
<!--        gsap.to(successMessage.value, {-->
<!--          opacity: 0,-->
<!--          y: -10,-->
<!--          duration: 0.5-->
<!--        });-->
<!--      }, 2000);-->
<!--    }-->
<!--  });-->
<!--};-->

<!--const loadSiteData = async () => {-->
<!--  if (!siteGuid.value) return;-->

<!--  isLoading.value = true;-->
<!--  try {-->
<!--    // API call to fetch site data-->
<!--    const response = await SiteService.getSite(siteGuid.value);-->
<!--    formData.value = response.data.site;-->

<!--    isLoading.value = false;-->
<!--  } catch (error) {-->
<!--    messageType.value = 'error';-->
<!--    messageText.value = 'Erreur lors du chargement des données';-->
<!--    showMessage();-->
<!--    isLoading.value = false;-->
<!--  }-->
<!--};-->

<!--const submitSite = async () => {-->
<!--  if (!formData.value.name || !formData.value.site_type || !formData.value.address.city || !formData.value.address.location) {-->
<!--    messageType.value = 'error';-->
<!--    messageText.value = 'Veuillez remplir tous les champs obligatoires';-->
<!--    showMessage();-->
<!--    return;-->
<!--  }-->

<!--  if (formData.value.geofence_polygon.coordinates[0].length < 3) {-->
<!--    messageType.value = 'error';-->
<!--    messageText.value = 'Veuillez définir au moins 3 points pour le polygone';-->
<!--    showMessage();-->
<!--    return;-->
<!--  }-->

<!--  isLoading.value = true;-->
<!--  try {-->
<!--    // API call to save site-->
<!--    const response = siteGuid.value-->
<!--      ? await SiteService.updateSite(siteGuid.value, formData.value)-->
<!--      : await SiteService.createSite(formData.value);-->

<!--    gsap.to(submitButton.value, {-->
<!--      scale: 0.95,-->
<!--      duration: 0.1,-->
<!--      onComplete: () => {-->
<!--        gsap.to(submitButton.value, {-->
<!--          scale: 1,-->
<!--          duration: 0.3,-->
<!--          ease: 'elastic.out(1, 0.3)'-->
<!--        });-->
<!--      }-->
<!--    });-->

<!--    messageType.value = 'success';-->
<!--    messageText.value = siteGuid.value-->
<!--        ? 'Site mis à jour avec succès'-->
<!--        : 'Site créé avec succès';-->
<!--    showMessage();-->

<!--    console.log("response", response );-->
<!--    console.log("formData", formData.value)-->

<!--    // setTimeout(() => {-->
<!--    //   router.push('/sites');-->
<!--    // }, 2000);-->
<!--  } catch (error: any) {-->
<!--    messageType.value = 'error';-->
<!--    messageText.value = error.response?.data?.message || 'Une erreur est survenue';-->
<!--    showMessage();-->
<!--  } finally {-->
<!--    isLoading.value = false;-->
<!--  }-->
<!--};-->

<!--onMounted(() => {-->
<!--  -->
<!--  HeadBuilder.apply({-->
<!--    title: 'Site - Toké',-->
<!--    css: [],-->
<!--    meta: { viewport: "width=device-width, initial-scale=1.0" }-->
<!--  });-->
<!--  // Vérifier si des données ont été sauvegardées depuis la carte-->
<!--  const savedData = sessionStorage.getItem('siteFormData');-->
<!--  if (!savedData || siteGuid.value !== undefined) {-->
<!--    formData.value = savedData? JSON.parse(savedData) : null;-->
<!--    sessionStorage.removeItem('siteFormData');-->
<!--  } else {-->
<!--    loadSiteData();-->
<!--  }-->
<!--});-->
<!--</script>-->

<!--<style scoped>-->
<!--.fixed {-->
<!--  transition: opacity 0.5s ease;-->
<!--}-->
<!--</style>-->