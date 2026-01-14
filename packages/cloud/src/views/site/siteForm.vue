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
                {{ siteGuid ? 'Modifier le Site' : 'Ajouter un Nouveau Site' }}
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
                      Vous pouvez les saisir manuellement ou les sélectionner sur la carte.
                    </p>

                    <div v-if="formData.geofence_polygon.coordinates[0] && formData.geofence_polygon.coordinates[0].length > 0">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">
                          Points du polygone: {{ formData.geofence_polygon.coordinates[0].length }}
                        </span>
                        <button type="button" @click="clearCoordinates"
                                class="text-sm text-red-600 hover:text-red-800">
                          Effacer
                        </button>
                      </div>
                      <div class="max-h-40 overflow-y-auto bg-white p-3 rounded border border-gray-200">
                        <div v-for="(coord, index) in formData.geofence_polygon.coordinates[0]" :key="index"
                             class="text-xs text-gray-600 py-1">
                          Point {{ index + 1 }}: [{{ coord[0].toFixed(6) }}, {{ coord[1].toFixed(6) }}]
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-4 text-gray-500 text-sm">
                      Aucune coordonnée définie. Cliquez sur "Sélectionner sur la carte" pour définir la zone.
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
                    {{ siteGuid ? 'Mettre à Jour' : 'Enregistrer' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      <!-- Message dynamique -->
      <div ref="successMessage"
           :class="['fixed right-8 top-[10%] text-white p-4 rounded-lg shadow-lg opacity-0 transform translate-y-4 transition-all duration-300 z-50',
                    messageType === 'success' ? 'bg-green-600' : 'bg-red-600']">
        <div class="flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>{{ messageText }}</span>
        </div>
      </div>

      <Footer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import Header from "@/views/components/header.vue";
import HeadBuilder from "@/utils/HeadBuilder";

const route = useRoute();
const router = useRouter();
const isLoading = ref(false);
const siteGuid = ref<string | any>(route.query.guid || null);
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');
const submitButton = ref(null);

const formData = ref<any>({
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
  }
});

const goBack = () => {
  router.push('/sites');
};

const openMapSelector = () => {
  // Sauvegarder les données actuelles et naviguer vers la carte
  sessionStorage.setItem('siteFormData', JSON.stringify(formData.value));
  router.push({
    path: `/sites/map/?guid=${siteGuid.value || 'new'}`,
    query: { mode: 'select' }
  });
};

const clearCoordinates = () => {
  formData.value.geofence_polygon.coordinates = [[]];
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
  if (!siteGuid.value) return;

  isLoading.value = true;
  try {
    // API call to fetch site data
    // const response = await api.getSite(siteGuid.value);
    // formData.value = response.data;

    // Simulation
    setTimeout(() => {
      formData.value = {
        name: "IMEDIATIS SARL",
        site_type: "global_site",
        address: {
          city: "Douala",
          location: "Makepe",
          place_name: "ABOU DE BANGUI"
        },
        geofence_radius: 100,
        active: true,
        public: true,
        geofence_polygon: {
          crs: { type: "name", properties: { name: "EPSG:4326" } },
          type: "Polygon",
          coordinates: [[[9.751171, 4.085104], [9.751342, 4.084906], [9.751542, 4.085018], [9.751299, 4.085196], [9.751171, 4.085104]]]
        }
      };
      isLoading.value = false;
    }, 1000);
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

  if (formData.value.geofence_polygon.coordinates[0].length < 3) {
    messageType.value = 'error';
    messageText.value = 'Veuillez définir au moins 3 points pour le polygone';
    showMessage();
    return;
  }

  isLoading.value = true;
  try {
    // API call to save site
    // const response = siteGuid.value
    //   ? await api.updateSite(siteGuid.value, formData.value)
    //   : await api.createSite(formData.value);

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

    messageType.value = 'success';
    messageText.value = siteGuid.value
        ? 'Site mis à jour avec succès'
        : 'Site créé avec succès';
    showMessage();

    setTimeout(() => {
      router.push('/sites');
    }, 2000);
  } catch (error: any) {
    messageType.value = 'error';
    messageText.value = error.response?.data?.message || 'Une erreur est survenue';
    showMessage();
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {

  HeadBuilder.apply({
    title: 'Site - Toké',
    css: [],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
  // Vérifier si des données ont été sauvegardées depuis la carte
  const savedData = sessionStorage.getItem('siteFormData');
  if (savedData) {
    formData.value = JSON.parse(savedData);
    sessionStorage.removeItem('siteFormData');
  } else {
    loadSiteData();
  }
});
</script>

<style scoped>
.fixed {
  transition: opacity 0.5s ease;
}
</style>