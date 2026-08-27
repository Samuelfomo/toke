<template>
  <div class="flex min-h-screen flex-col bg-slate-100">
    <Header />

    <main class="relative flex-1 overflow-hidden" style="min-height: calc(100vh - 64px)">
      <div ref="mapContainer" class="absolute inset-0 h-full w-full"></div>

      <div v-if="isLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/75 backdrop-blur-sm">
        <div class="rounded-2xl bg-white px-6 py-5 shadow-xl ring-1 ring-slate-200">
          <div class="flex items-center gap-3">
            <svg class="h-6 w-6 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-slate-900">Chargement de la carte</p>
              <p class="mt-0.5 text-xs text-slate-500">Récupération du site et de sa zone de pointage…</p>
            </div>
          </div>
        </div>
      </div>

      <aside class="absolute left-3 right-3 top-16 z-20 max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-white/80 bg-white/95 shadow-xl backdrop-blur sm:left-auto sm:right-4 sm:w-[370px]">
        <div class="p-4 sm:p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <span
                  v-if="siteData"
                  :class="siteData.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'"
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
                >
                  <span :class="siteData.active ? 'bg-emerald-500' : 'bg-slate-400'" class="mr-1.5 h-1.5 w-1.5 rounded-full"></span>
                  {{ siteData.active ? 'Site actif' : 'Site inactif' }}
                </span>
                <span v-if="siteData" class="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                  {{ siteTypeLabel(siteData.site_type) }}
                </span>
              </div>

              <h1 class="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {{ siteData?.name || (loadError ? 'Site indisponible' : 'Visualisation du site') }}
              </h1>
              <p v-if="siteAddressLine" class="mt-1 text-sm leading-5 text-slate-500">{{ siteAddressLine }}</p>
            </div>

            <button type="button" @click="goBack" class="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" title="Retour à la liste">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="loadError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ loadError }}</div>

          <template v-if="siteData">
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Zone</p>
                <p class="mt-1 text-sm font-semibold text-slate-800">{{ zoneLabel }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rayon</p>
                <p class="mt-1 text-sm font-semibold text-slate-800">{{ siteData.geofence_radius ? `${siteData.geofence_radius} m` : '—' }}</p>
              </div>
            </div>

            <div v-if="siteData.address?.place_name" class="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Adresse / lieu-dit</p>
              <p class="mt-1 text-sm font-medium leading-5 text-slate-700">{{ siteData.address.place_name }}</p>
            </div>

            <div v-if="searchResultTitle" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 flex-none text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1118 0z" />
                  <circle cx="12" cy="10" r="3" stroke-width="2" />
                </svg>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Résultat de recherche</p>
                  <p class="mt-0.5 truncate text-sm font-semibold text-slate-800">{{ searchResultTitle }}</p>
                  <p v-if="searchResultDescription" class="mt-0.5 text-xs leading-4 text-slate-600">{{ searchResultDescription }}</p>
                  <p class="mt-1 text-[11px] text-amber-700">La recherche ne modifie pas la localisation enregistrée du site.</p>
                </div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" @click="focusSite" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" stroke-width="2" />
                </svg>
                Centrer sur le site
              </button>

              <button type="button" :disabled="isLocating" @click="locateMe" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                <svg v-if="!isLocating" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="3" stroke-width="2" />
                  <path stroke-linecap="round" stroke-width="2" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                <svg v-else class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                {{ isLocating ? 'Localisation…' : 'Ma position' }}
              </button>
            </div>

            <button type="button" @click="goToEdit" class="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modifier le site
            </button>
          </template>
        </div>
      </aside>


      <div class="absolute bottom-3 left-3 z-10 rounded-xl border border-white/80 bg-white/90 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:left-4">
        <div class="space-y-1.5 text-[11px] text-slate-600">
          <div class="flex items-center gap-2"><span class="h-3 w-5 rounded border-2 border-indigo-600 bg-indigo-200/60"></span><span>Zone enregistrée</span></div>
          <div class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-indigo-600"></span><span>Centre du site</span></div>
          <div v-if="hasUserPosition" class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-sky-500"></span><span>Votre position</span></div>
        </div>
      </div>

      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-2 opacity-0">
        <div v-if="toast.visible" :class="toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-red-600'" class="absolute bottom-4 left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl sm:bottom-6">
          {{ toast.message }}
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Header from '@/views/components/header.vue';
import SiteService from '@/service/SiteService';
import type { Site } from '@/utils/interfaces/site.interface';
import { getPolygonApproximateCenter, getPolygonPoints, isValidPolygon } from '@/utils/geo/polygon';

const route = useRoute();
const router = useRouter();
const mapContainer = ref<HTMLDivElement | null>(null);
const siteData = ref<Site | null>(null);
const isLoading = ref(true);
const isLocating = ref(false);
const loadError = ref('');
const searchResultTitle = ref('');
const searchResultDescription = ref('');
const hasUserPosition = ref(false);
const toast = reactive({ visible: false, type: 'success' as 'success' | 'warning' | 'error', message: '' });

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let map: any = null;
let sitePolygon: any = null;
let siteMarker: any = null;
let searchControl: any = null;
let userMarker: any = null;
let accuracyCircle: any = null;

const siteGuid = computed(() => {
  const raw = route.query.guid;
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
});

const siteAddressLine = computed(() => {
  const address: any = siteData.value?.address;
  return address ? [address.location, address.city].filter(Boolean).join(', ') : '';
});

const zoneLabel = computed(() => {
  const pointCount = getPolygonPoints(siteData.value?.geofence_polygon as any).length;
  if (!pointCount) return 'Non disponible';
  return pointCount >= 16 ? 'Zone géographique' : `Polygone · ${pointCount} sommets`;
});

const siteTypeLabel = (type?: string) => ({
  manager_site: 'Site manager',
  global_site: 'Site global',
  temporary_site: 'Site temporaire',
  public_site: 'Site public',
} as Record<string, string>)[type || ''] || type || 'Site';

const showToast = (type: 'success' | 'warning' | 'error', message: string) => {
  if (toastTimer) clearTimeout(toastTimer);
  Object.assign(toast, { visible: true, type, message });
  toastTimer = setTimeout(() => { toast.visible = false; }, 3200);
};

const goBack = () => router.push('/sites');
const goToEdit = () => siteGuid.value && router.push({ name: 'edit', query: { guid: siteGuid.value } });

const styleForSite = () => ({
  fillColor: siteData.value?.active === false ? '#64748b2b' : '#4f46e533',
  strokeColor: siteData.value?.active === false ? '#64748b' : '#4f46e5',
  strokeWidth: 3,
});

const focusSite = () => {
  if (!map || !siteData.value) return;
  try { searchControl?.hideResult?.(); } catch {}
  searchResultTitle.value = '';
  searchResultDescription.value = '';

  const bounds = sitePolygon?.geometry?.getBounds?.();
  if (bounds) {
    map.setBounds(bounds, {
      checkZoomRange: true,
      duration: 350,
      zoomMargin: window.innerWidth >= 640 ? [90, 90, 90, 410] : [90, 30, 170, 30],
    });
    return;
  }

  const center = getPolygonApproximateCenter(siteData.value.geofence_polygon as any);
  if (center) map.setCenter([center.lat, center.lng], 17, { duration: 350 });
};

const drawSite = () => {
  if (!map || !siteData.value) return;
  if (sitePolygon) map.geoObjects.remove(sitePolygon);
  if (siteMarker) map.geoObjects.remove(siteMarker);

  const polygon: any = siteData.value.geofence_polygon;
  if (!isValidPolygon(polygon)) {
    showToast('warning', 'La zone géographique de ce site est invalide ou absente.');
    return;
  }

  const y = (window as any).ymaps;
  const coordinates = polygon.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);
  sitePolygon = new y.Polygon(
    [coordinates],
    {
      hintContent: siteData.value.name,
      balloonContentHeader: siteData.value.name,
      balloonContentBody: siteAddressLine.value || 'Zone de pointage enregistrée',
    },
    styleForSite(),
  );
  map.geoObjects.add(sitePolygon);

  const center = getPolygonApproximateCenter(polygon);
  if (center) {
    siteMarker = new y.Placemark(
      [center.lat, center.lng],
      {
        hintContent: siteData.value.name,
        balloonContentHeader: siteData.value.name,
        balloonContentBody: `${siteAddressLine.value || 'Site Toké'}${siteData.value.geofence_radius ? `<br>Rayon configuré : ${siteData.value.geofence_radius} m` : ''}`,
      },
      { preset: siteData.value.active === false ? 'islands#grayCircleDotIcon' : 'islands#violetCircleDotIcon' },
    );
    map.geoObjects.add(siteMarker);
  }

  nextTick(focusSite);
};

const handleSearchResultSelect = (event: any) => {
  if (!searchControl) return;
  const index = event.get('index');
  searchControl.getResult(index).then((geoObject: any) => {
    searchResultTitle.value = String(geoObject?.properties?.get?.('name') || geoObject?.properties?.get?.('text') || 'Résultat sélectionné');
    searchResultDescription.value = String(geoObject?.properties?.get?.('description') || '');
    const coords = geoObject?.geometry?.getCoordinates?.();
    if (Array.isArray(coords) && coords.length >= 2) map?.setCenter(coords, Math.max(map.getZoom?.() || 15, 16), { duration: 300 });
  }, () => showToast('error', 'Impossible de lire ce résultat de recherche.'));
};

const handleSearchLoad = (event: any) => {
  if (event?.get?.('skip')) return;
  if ((searchControl?.getResultsCount?.() ?? 0) === 0) showToast('warning', 'Aucun lieu correspondant trouvé sur la carte.');
};

const configureSearch = () => {
  if (!map || searchControl) return;
  const y = (window as any).ymaps;
  searchControl = new y.control.SearchControl({
    options: {
      provider: 'yandex#search',
      resultsPerPage: 8,
      placeholderContent: 'Rechercher une adresse ou un établissement',
      size: 'large',
      suppressYandexSearch: false,
    },
  });
  map.controls.add(searchControl, { float: 'left', floatIndex: 100 });
  searchControl.events.add('resultselect', handleSearchResultSelect);
  searchControl.events.add('load', handleSearchLoad);
};

const locateMe = () => {
  if (!map) return;
  if (!navigator.geolocation) {
    showToast('error', 'La géolocalisation n’est pas prise en charge par ce navigateur.');
    return;
  }

  isLocating.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.max(1, Math.round(position.coords.accuracy || 0));
      const y = (window as any).ymaps;
      if (userMarker) map.geoObjects.remove(userMarker);
      if (accuracyCircle) map.geoObjects.remove(accuracyCircle);

      accuracyCircle = new y.Circle([[lat, lng], accuracy], { hintContent: `Précision estimée : ± ${accuracy} m` }, {
        fillColor: '#0ea5e91f', strokeColor: '#0284c7', strokeWidth: 1,
      });
      userMarker = new y.Placemark([lat, lng], {
        hintContent: 'Votre position',
        balloonContent: `Votre position actuelle<br>Précision estimée : ± ${accuracy} m`,
      }, { preset: 'islands#blueCircleDotIcon' });

      map.geoObjects.add(accuracyCircle);
      map.geoObjects.add(userMarker);
      map.setCenter([lat, lng], 17, { duration: 350 });
      hasUserPosition.value = true;
      showToast(accuracy > 100 ? 'warning' : 'success', accuracy > 100 ? `Position trouvée avec une précision faible (± ${accuracy} m).` : `Position trouvée (± ${accuracy} m).`);
      isLocating.value = false;
    },
    (error) => {
      const messages: Record<number, string> = {
        1: 'Accès à la position refusé. Autorisez la localisation dans votre navigateur.',
        2: 'Votre position est actuellement indisponible.',
        3: 'La recherche de votre position a pris trop de temps.',
      };
      showToast('error', messages[error.code] || 'Impossible de récupérer votre position.');
      isLocating.value = false;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
  );
};

const loadSite = async () => {
  if (!siteGuid.value) {
    loadError.value = 'Aucun site n’a été indiqué pour cette visualisation.';
    isLoading.value = false;
    return;
  }

  try {
    const response = await SiteService.getSite(siteGuid.value);
    const site = response?.data?.site ?? response?.site ?? null;
    if (!site) throw new Error('Site non trouvé');
    siteData.value = site;
    drawSite();
  } catch (error) {
    console.error('Erreur de chargement du site :', error);
    loadError.value = 'Impossible de charger ce site. Revenez à la liste et réessayez.';
  } finally {
    isLoading.value = false;
  }
};

const initMap = () => {
  const y = (window as any).ymaps;
  if (!y) {
    loadError.value = 'Yandex Maps n’est pas disponible. Vérifiez le chargement du script cartographique.';
    isLoading.value = false;
    return;
  }

  y.ready(() => {
    if (!mapContainer.value) {
      loadError.value = 'Le conteneur de carte est indisponible.';
      isLoading.value = false;
      return;
    }

    map = new y.Map(mapContainer.value, {
      center: [4.0511, 9.7679],
      zoom: 13,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
    }, { suppressMapOpenBlock: true });

    configureSearch();
    loadSite();
  });
};

onMounted(initMap);
onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer);
  try { searchControl?.events?.remove?.('resultselect', handleSearchResultSelect); } catch {}
  try { searchControl?.events?.remove?.('load', handleSearchLoad); } catch {}
  try { map?.destroy?.(); } catch {}
  map = null;
  sitePolygon = null;
  siteMarker = null;
  searchControl = null;
  userMarker = null;
  accuracyCircle = null;
});
</script>
