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
          <div class="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-md">
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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ polygonPoints.length > 0 ? 'Cliquez pour ajouter des points au polygone' : 'Cliquez sur la carte pour définir le polygone' }}
              </p>

              <div class="flex space-x-2">
                <button @click="clearPolygon"
                        class="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                  Effacer
                </button>
                <button @click="undoLastPoint" :disabled="polygonPoints.length === 0"
                        class="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  Annuler dernier
                </button>
                <button @click="savePolygon" :disabled="polygonPoints.length < 3"
                        class="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  Sauvegarder
                </button>
              </div>

              <p class="text-xs text-gray-500 mt-2">
                Points définis: {{ polygonPoints.length }} {{ polygonPoints.length < 3 ? '(minimum 3 requis)' : '' }}
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

          <!-- Canvas de la Carte -->
          <canvas ref="mapCanvas"
                  @click="handleMapClick"
                  @mousemove="handleMouseMove"
                  class="w-full h-screen cursor-crosshair"></canvas>
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
import { ref, onMounted, onUnmounted } from 'vue';
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
const mapCanvas = ref<any>(null);
const successMessage = ref(null);
const messageType = ref('success');
const messageText = ref('');

let ctx:any = null;
let mapImage = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

// Points du polygone en cours d'édition
const polygonPoints = ref<any>([]);
const mousePos = ref({ x: 0, y: 0 });

// Coordonnées du centre de Douala pour l'exemple
const mapCenter = { lat: 4.0511, lng: 9.7679 };
const mapZoom = 13;

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
  polygonPoints.value = [];
  if (siteData.value?.geofence_polygon?.coordinates[0]) {
    // Convertir les coordonnées géographiques en points canvas
    polygonPoints.value = siteData.value.geofence_polygon.coordinates[0].map((coord : any) =>
        latLngToCanvas(coord[1], coord[0])
    );
  }
  drawMap();
};

const clearPolygon = () => {
  polygonPoints.value = [];
  drawMap();
};

const undoLastPoint = () => {
  if (polygonPoints.value.length > 0) {
    polygonPoints.value.pop();
    drawMap();
  }
};

const savePolygon = () => {
  if (polygonPoints.value.length < 3) {
    messageType.value = 'error';
    messageText.value = 'Au moins 3 points sont requis pour définir un polygone';
    showMessage();
    return;
  }

  // Convertir les points canvas en coordonnées géographiques
  const coordinates = polygonPoints.value.map((point : any) => {
    const latLng = canvasToLatLng(point.x, point.y);
    return [latLng.lng, latLng.lat];
  });

  // Fermer le polygone en ajoutant le premier point à la fin
  coordinates.push([...coordinates[0]]);

  // Sauvegarder dans sessionStorage et retourner au formulaire
  const formData = JSON.parse(sessionStorage.getItem('siteFormData') || '{}');
  formData.geofence_polygon = {
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    type: "Polygon",
    coordinates: [coordinates]
  };
  sessionStorage.setItem('siteFormData', JSON.stringify(formData));

  messageType.value = 'success';
  messageText.value = 'Polygone sauvegardé avec succès';
  showMessage();

  setTimeout(() => {
    router.push(`/sites/edit?guid=${siteGuid.value === 'new' ? '' : siteGuid.value}`);
  }, 1500);
};

const handleMapClick = (e: any) => {
  if (!isEditMode.value) return;

  const rect = mapCanvas.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  polygonPoints.value.push({ x, y });
  drawMap();
};

const handleMouseMove = (e: any) => {
  if (!isEditMode.value) return;

  const rect = mapCanvas.value.getBoundingClientRect();
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  drawMap();
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

// Conversion coordonnées géographiques -> canvas
const latLngToCanvas = (lat: number, lng: number) => {
  const canvas = mapCanvas.value;
  const x = ((lng - mapCenter.lng) / 0.01) * (canvas.width / 10) + canvas.width / 2;
  const y = ((mapCenter.lat - lat) / 0.01) * (canvas.height / 10) + canvas.height / 2;
  return { x, y };
};

// Conversion canvas -> coordonnées géographiques
const canvasToLatLng = (x: number, y: number) => {
  const canvas = mapCanvas.value;
  const lng = ((x - canvas.width / 2) / (canvas.width / 10)) * 0.01 + mapCenter.lng;
  const lat = mapCenter.lat - ((y - canvas.height / 2) / (canvas.height / 10)) * 0.01;
  return { lat, lng };
};

const drawMap = () => {
  if (!ctx || !mapCanvas.value) return;

  const canvas = mapCanvas.value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessiner le fond de carte (grille simple)
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner une grille
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Dessiner le polygone existant ou en cours
  if (polygonPoints.value.length > 0) {
    // Remplissage
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.moveTo(polygonPoints.value[0].x, polygonPoints.value[0].y);
    for (let i = 1; i < polygonPoints.value.length; i++) {
      ctx.lineTo(polygonPoints.value[i].x, polygonPoints.value[i].y);
    }
    if (isEditMode.value && polygonPoints.value.length >= 3) {
      ctx.lineTo(mousePos.value.x, mousePos.value.y);
    }
    ctx.closePath();
    ctx.fill();

    // Contour
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    polygonPoints.value.forEach((point: any, index: number) => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Numéro du point
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index + 1, point.x, point.y);
    });

    // Ligne vers le curseur en mode édition
    if (isEditMode.value && polygonPoints.value.length > 0) {
      ctx.strokeStyle = '#93c5fd';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(polygonPoints.value[polygonPoints.value.length - 1].x,
          polygonPoints.value[polygonPoints.value.length - 1].y);
      ctx.lineTo(mousePos.value.x, mousePos.value.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
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
        polygonPoints.value = siteData.value.geofence_polygon.coordinates[0].map((coord: any) =>
            latLngToCanvas(coord[1], coord[0])
        );
      }

      isLoading.value = false;
      drawMap();
    }, 1000);
  } catch (error) {
    console.error('Erreur de chargement:', error);
    isLoading.value = false;
  }
};

const initCanvas = () => {
  const canvas = mapCanvas.value;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx = canvas.getContext('2d');
  drawMap();
};

const handleResize = () => {
  if (mapCanvas.value) {
    initCanvas();
  }
};

onMounted(() => {
  initCanvas();
  loadSiteData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.cursor-crosshair {
  cursor: crosshair;
}
</style>