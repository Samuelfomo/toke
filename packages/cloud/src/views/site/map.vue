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
        <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Chargement de la carte...</p>
      </div>

      <div class="flex-grow flex">
        <main class="flex-grow bg-gray-100 relative">
          <!-- Panneau d'Information -->
          <div class="flex flex-col items-center">

            <div class="absolute top-2 z-10 bg-white rounded-lg shadow-lg p-4 max-w-md">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-800">{{ siteData?.name || 'Nouveau Site' }}</h3>
                <button @click="goBack" class="p-1 hover:bg-gray-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>

              <div v-if="siteData" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Type:</span>
                  <span class="font-medium">{{ siteData.site_type === 'global_site' ? 'Global' : 'Manager' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Ville:</span>
                  <span class="font-medium">{{ siteData.address?.city }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Localisation:</span>
                  <span class="font-medium">{{ siteData.address?.location }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Rayon:</span>
                  <span class="font-medium">{{ siteData.geofence_radius }}m</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Statut:</span>
                  <span :class="siteData.active ? 'text-green-600' : 'text-red-600'" class="font-medium">
                  {{ siteData.active ? 'Actif' : 'Inactif' }}
                </span>
                </div>
              </div>

              <!-- Mode d'édition -->
              <div v-if="isEditMode" class="mt-4 pt-4 border-t">
                <p class="text-sm text-blue-600 mb-3">
                  Cliquez sur la carte pour dessiner ou modifier le polygone
                </p>

                <div class="flex space-x-2">
                  <button @click="clearPolygon"
                          class="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                    Effacer
                  </button>
                  <button disabled
                          class="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                    Annuler dernier
                  </button>
                  <button @click="savePolygon"
                          class="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                    Sauvegarder
                  </button>
                </div>

                <p class="text-xs text-gray-500 mt-2">
                  Utilise les poignées sur la carte pour ajuster la zone
                </p>
              </div>

              <!-- Boutons d'action en mode visualisation -->
              <div v-else class="mt-4 pt-4 border-t space-y-2">
                <button @click="enableEditMode"
                        class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Modifier le Polygone
                </button>
                <button @click="goToEdit"
                        class="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Modifier le Site
                </button>
              </div>
            </div>
          </div>

          <!-- Légende -->
          <div class="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Légende</h4>
            <div class="space-y-1 text-xs">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-blue-500 opacity-30 mr-2"></div>
                <span>Zone du site</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 border-2 border-blue-600 mr-2"></div>
                <span>Contour</span>
              </div>
              <div class="flex items-center">
                <div class="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>Points du polygone</span>
              </div>
            </div>
          </div>

<!--          &lt;!&ndash; Barre de recherche &ndash;&gt;-->

<!--          <div class="absolute top-2 right-44 z-10 bg-white rounded-lg shadow-lg p-3 w-80">-->
<!--            <div class="flex space-x-2">-->
<!--              <input-->
<!--                  v-model="searchQuery"-->
<!--                  @keyup.enter="searchLocation"-->
<!--                  type="text"-->
<!--                  placeholder="Ex: Akwa Douala, Hôpital Général, 4.05, 9.76"-->
<!--                  class="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300 text-sm"-->
<!--              />-->
<!--              <button-->
<!--                  @click="searchLocation"-->
<!--                  class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"-->
<!--              >-->
<!--                🔍-->
<!--              </button>-->
<!--            </div>-->
<!--          </div>-->


          <div ref="mapContainer" class="w-full h-screen"></div>
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

<!--      <Footer />-->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import Header from "@/views/components/header.vue";
import SiteService from "@/service/SiteService";
import {Site} from "@/utils/interfaces/site.interface";

const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const siteGuid = ref(route.query.guid);
const isEditMode = ref(route.query.mode === 'select');
const siteData = ref<Site | null>(null);
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');

const mapContainer = ref<HTMLDivElement | null>(null)

let map:any = null
let polygon:any = null
const MAX_POINTS = 4;

// const searchQuery = ref('');
// let searchMarker:any = null;


const goBack = () => {
  if (isEditMode.value) {
    // router.push(`/sites/edit/${siteGuid.value}`);
    router.push({
      name: 'edit',
      query: { guid: siteGuid.value?.toString() },
    });
  } else {
    router.push('/sites');
  }
};

const goToEdit = () => {
  // router.push(`/sites/edit/${siteGuid.value}`);

  router.push({
    name: 'edit',
    query: { guid: siteGuid.value?.toString() },
  });
};

const enableEditMode = () => {
  isEditMode.value = true;

  if (!polygon) {
    polygon = new ymaps.Polygon([[]], {}, style());
    map.geoObjects.add(polygon);
    polygon.editor.startDrawing();
  } else {
    polygon.editor.startEditing();
  }

  polygon.editor.events.add('geometrychange', limitPolygonPoints);
};

const clearPolygon = () => {
  if (polygon) map.geoObjects.remove(polygon);

  polygon = new ymaps.Polygon([[]], {}, style());
  map.geoObjects.add(polygon);
  polygon.editor.startDrawing();

  polygon.editor.events.add('geometrychange', limitPolygonPoints);
};

const style = () => ({
  fillColor: '#2563eb55',
  strokeColor: '#2563eb',
  strokeWidth: 2
})

// const searchLocation = () => {
//   if (!searchQuery.value || !map) return;
//
//   // @ts-ignore
//   ymaps.geocode(searchQuery.value, { results: 1 }).then((res: any) => {
//     if (res.geoObjects.getLength() === 0) {
//       messageType.value = 'error';
//       messageText.value = 'Aucun résultat trouvé';
//       showMessage();
//       return;
//     }
//
//     const firstResult = res.geoObjects.get(0);
//     const coords = firstResult.geometry.getCoordinates();
//
//     // Supprimer ancien marqueur
//     if (searchMarker) map.geoObjects.remove(searchMarker);
//
//     // Créer un nouveau marqueur
//     searchMarker = new ymaps.Placemark(coords, {
//       balloonContent: firstResult.getAddressLine()
//     });
//
//     map.geoObjects.add(searchMarker);
//
//     // Centrer la carte
//     map.setCenter(coords, 17, { duration: 500 });
//   }).catch((err: any) => {
//     console.error('Erreur géocodage:', err);
//     messageType.value = 'error';
//     messageText.value = 'Erreur lors de la recherche';
//     showMessage();
//   });
// };



const limitPolygonPoints = () => {
  if (!polygon) return;

  const coords = polygon.geometry.getCoordinates()[0];
  if (!coords) return;

  if (coords.length > MAX_POINTS) {
    coords.splice(MAX_POINTS); // coupe à 4 points
    polygon.geometry.setCoordinates([coords]);

    messageType.value = 'error';
    messageText.value = 'Limite atteinte : 4 points maximum';
    showMessage();
  }
};


const savePolygon = () => {
  if (!polygon) return

  const coords = polygon.geometry.getCoordinates()[0]
  if (coords.length < 3) {
    messageType.value = 'error'
    messageText.value = 'Au moins 3 points sont requis'
    showMessage()
    return
  }

  const geoCoords = coords.map((c:any)=>[c[1], c[0]])
  geoCoords.push([...geoCoords[0]])

  const formData = JSON.parse(sessionStorage.getItem('siteFormData') || '{}')

  formData.geofence_polygon = {
    type: "Polygon",
    coordinates: [geoCoords]
  }

  sessionStorage.setItem('siteFormData', JSON.stringify(formData))

  messageType.value = 'success'
  messageText.value = 'Polygone sauvegardé avec succès'
  showMessage()
  setTimeout(() => {
    router.push(`/sites/edit?guid=${siteGuid.value === 'new' ? '' : siteGuid.value}`);
  }, 1500);
}


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
  if (siteGuid.value === 'new') {
    isLoading.value = false;
    return;
  }

  try {
    // API call
    const response = await SiteService.getSite(siteGuid.value?.toString()!);
    // siteData.value = response.data;

    // Simulation
    setTimeout(() => {
      console.log('Site:', response.data.site);
      siteData.value = response.data? response.data.site :  null

      // Charger le polygone existant
      if (siteData.value?.geofence_polygon?.coordinates[0]) {
        drawPolygon(siteData.value.geofence_polygon.coordinates[0])
      }

      if (isEditMode.value) enableEditMode()
      isLoading.value = false;
    }, 1000);
  } catch (error) {
    console.error('Erreur de chargement:', error);
    isLoading.value = false;
  }
};
const drawPolygon = (coords:any) => {
  polygon = new ymaps.Polygon(
      [coords.map((c:any)=>[c[1], c[0]])],
      {},
      {
        fillColor: '#2563eb55',
        strokeColor: '#2563eb',
        strokeWidth: 2
      }
  )

  map.geoObjects.add(polygon)
  map.setBounds(polygon.geometry.getBounds(), { zoomMargin: 50 })
}


onMounted(() => {
  initMap()
});

const initMap = () => {
  if (!(window as any).ymaps) {
    console.error("Yandex Maps non chargé. Vérifie le script dans index.html");
    return;
  }

  ymaps.ready(() => {
    map = new ymaps.Map(mapContainer.value, {
      center: [4.0511, 9.7679],
      zoom: 13,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl', 'searchControl']
    });

    loadSiteData();
  });
};


</script>

<style scoped>
.cursor-crosshair {
  cursor: crosshair;
}
</style>