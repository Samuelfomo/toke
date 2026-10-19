<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div class="flex items-start justify-between gap-3 px-4 py-3">
      <div>
        <h4 class="text-sm font-bold text-slate-800">Lieu du pointage</h4>
        <p class="mt-1 text-xs text-slate-500">{{ siteName || 'Position enregistrée' }}</p>
      </div>
      <span v-if="withinGeofence !== null" class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold"
            :class="withinGeofence ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
        {{ withinGeofence ? 'Dans la zone' : 'Hors zone' }}
      </span>
    </div>
    <template v-if="position">
      <div class="relative h-60 bg-slate-100 sm:h-72">
        <div ref="mapElement" class="h-full w-full" aria-label="Carte du lieu du pointage"></div>
        <div v-if="mapError" class="absolute inset-0 flex items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">
          {{ mapError }}
        </div>
      </div>
      <div v-if="zoneDistanceLabel" class="border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">{{ zoneDistanceLabel }}</div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <span class="text-xs text-slate-600">{{ accuracyLabel }}</span>
        <button
            type="button"
            class="inline-flex items-center gap-1 text-xs font-semibold text-[#004AAD] hover:underline"
            @click="openExpandedMap"
        >
          Agrandir la carte
          <span aria-hidden="true">⤢</span>
        </button>
      </div>
      <p v-if="zoneUnavailable && !mapError" class="px-4 pb-3 text-xs text-slate-500">La zone du site ne peut pas être affichée sur cette carte.</p>
    </template>
    <p v-else class="px-4 pb-4 text-sm text-slate-500">La position de ce pointage n'est pas disponible.</p>
  </section>
  <Teleport to="body">
    <div v-if="expanded" role="dialog" aria-modal="true" aria-label="Carte du pointage"
         class="fixed inset-0 z-[500] flex flex-col bg-white">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div class="min-w-0">
          <h2 class="truncate text-base font-bold text-slate-800">Lieu du pointage</h2>
          <p class="truncate text-xs text-slate-500">{{ siteName || 'Position enregistrée' }}</p>
        </div>
        <button ref="closeButton" type="button" @click="closeExpandedMap" aria-label="Fermer la carte"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Fermer ✕
        </button>
      </div>
      <div class="relative min-h-0 flex-1 bg-slate-100">
        <div ref="expandedMapElement" class="h-full w-full" aria-label="Position et périmètre du site sur la carte"></div>
        <div v-if="expandedMapError" class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-700">
          {{ expandedMapError }}
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm">
        <span class="font-medium text-slate-700">{{ zoneDistanceLabel || locationLabel }}</span>
        <span class="text-xs text-slate-500">{{ accuracyLabel }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import SiteService from '@/service/SiteService'
import {isValidPolygon} from '@/utils/geo/polygon'

type Position = {lat: number; lng: number}
const props = defineProps<{
  coordinates: string | null
  siteGuid?: string | null
  siteName?: string | null
  withinGeofence: boolean | null
  gpsAccuracy: number | null
}>()

const mapElement = ref<HTMLDivElement | null>(null)
const mapError = ref('')
const expandedMapError = ref('')
const expandedMapElement = ref<HTMLDivElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const expanded = ref(false)
let expandedMap: any = null
let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''
let cachedSiteGuid: string | null = null
let cachedRing: number[][] | null = null
const locationLabel = computed(() => props.withinGeofence === true ? 'Dans la zone autorisée' : props.withinGeofence === false ? 'Hors zone autorisée' : 'Position enregistrée')
const zoneUnavailable = ref(false)
const zoneDistanceLabel = ref('')
let map: any = null
let generation = 0

const position = computed<Position | null>(() => {
  if (typeof props.coordinates !== 'string') return null
  const parts = props.coordinates.split(',').map(v => Number(v.trim()))
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null
  const [lat, lng] = parts
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? {lat, lng} : null
})
const accuracyLabel = computed(() =>
  props.gpsAccuracy !== null && Number.isFinite(props.gpsAccuracy) && props.gpsAccuracy > 0
    ? `Précision GPS estimée : ± ${Math.round(props.gpsAccuracy)} m`
    : 'Précision GPS indisponible',
)

/** Mesure de lecture cartographique, sans modifier la validation métier émise par Toké.
 * Projection équirectangulaire locale autour du point (précision adaptée aux sites usuels).
 * Les limites GPS imprécises ou nulles restent explicitement non qualifiées.
 */
function pointPolygonDistanceMeters(point: Position, ring: number[][]): {distance: number; inside: boolean} {
  const earthRadius = 6371008.8
  const cosLat = Math.cos(point.lat * Math.PI / 180)
  const vertices = ring.map(([lat, lng]) => ({
    x: (lng - point.lng) * Math.PI / 180 * earthRadius * cosLat,
    y: (lat - point.lat) * Math.PI / 180 * earthRadius,
  }))
  let inside = false
  let minDistanceSquared = Infinity
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j], b = vertices[i]
    const crossesRay = (a.y > 0) !== (b.y > 0) &&
      0 < (b.x - a.x) * (-a.y) / (b.y - a.y) + a.x
    if (crossesRay) inside = !inside
    const dx = b.x - a.x, dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, (-a.x * dx - a.y * dy) / len2)) : 0
    const distanceSquared = (a.x + t * dx) ** 2 + (a.y + t * dy) ** 2
    minDistanceSquared = Math.min(minDistanceSquared, distanceSquared)
  }
  return {inside, distance: Math.sqrt(minDistanceSquared)}
}

// Les deux cartes reçoivent les mêmes données géographiques : aucune perte du périmètre en plein écran.
function paintMap(y: any, element: HTMLDivElement, ring: number[][] | null) {
  const point = position.value!
  const mapInstance = new y.Map(element, {
    center: [point.lat, point.lng], zoom: 17, controls: ['zoomControl'],
  }, {suppressMapOpenBlock: true})
  mapInstance.geoObjects.add(new y.Placemark([point.lat, point.lng],
    {hintContent: 'Lieu du pointage'}, {preset: 'islands#blueCircleDotIcon'}))
  if (props.gpsAccuracy !== null && Number.isFinite(props.gpsAccuracy) && props.gpsAccuracy > 0) {
    mapInstance.geoObjects.add(new y.Circle([[point.lat, point.lng], props.gpsAccuracy], {}, {
      fillColor: '#004AAD18', strokeColor: '#004AAD', strokeWidth: 1,
    }))
  }
  if (ring) {
    mapInstance.geoObjects.add(new y.Polygon([ring], {hintContent: 'Zone autorisée du site'}, {
      fillColor: '#004AAD19', strokeColor: '#004AAD', strokeWidth: 2,
    }))
    const bounds = mapInstance.geoObjects.getBounds?.()
    if (bounds) mapInstance.setBounds(bounds, {checkZoomRange: true, zoomMargin: 44})
  }
  return mapInstance
}

async function fetchSiteRing(token: number): Promise<number[][] | null> {
  if (!props.siteGuid) return null
  if (cachedSiteGuid === props.siteGuid) return cachedRing
  const response = await SiteService.getSite(props.siteGuid)
  if (token !== generation) return null
  const site = response?.data?.site ?? response?.data?.data?.site ?? response?.site ?? null
  const polygon = site?.geofence_polygon
  cachedSiteGuid = props.siteGuid
  cachedRing = isValidPolygon(polygon)
    ? polygon.coordinates[0].map(([longitude, latitude]: number[]) => [latitude, longitude])
    : null
  return cachedRing
}

function setDistanceLabel(ring: number[][] | null) {
  zoneDistanceLabel.value = ''
  if (!ring || !position.value) return
  const point = position.value
  const separation = pointPolygonDistanceMeters(point, ring)
  if (!Number.isFinite(separation.distance) || !ring.every(([lat, lng]) => Math.abs(lat - point.lat) < 0.1 && Math.abs(lng - point.lng) < 0.1)) return
  const distance = Math.round(separation.distance)
  zoneDistanceLabel.value = separation.inside
    ? `Position enregistrée dans le périmètre, à environ ${distance} m de sa limite.`
    : `Position enregistrée à environ ${distance} m de la limite du site.`
}

async function drawMap() {
  const token = ++generation
  try { map?.destroy?.() } catch (error) { console.warn('[PointageLocationMap] Destruction carte', error) }
  map = null
  mapError.value = ''
  zoneUnavailable.value = false
  zoneDistanceLabel.value = ''
  if (!position.value) return
  await nextTick()
  if (token !== generation) return
  const y = (window as any).ymaps
  if (!y) { mapError.value = 'La carte est momentanément indisponible.'; return }
  try {
    await new Promise<void>((resolve) => y.ready(resolve))
    if (token !== generation || !mapElement.value || !position.value) return
    let ring: number[][] | null = null
    try { ring = await fetchSiteRing(token) }
    catch (error) { console.warn('[PointageLocationMap] Zone du site', error) }
    if (token !== generation || !mapElement.value || !position.value) return
    zoneUnavailable.value = !ring
    setDistanceLabel(ring)
    map = paintMap(y, mapElement.value, ring)
    if (expanded.value) await renderExpandedMap()
  } catch (error) {
    console.warn('[PointageLocationMap] Carte indisponible', error)
    if (token === generation) mapError.value = 'La carte est momentanément indisponible.'
  }
}

async function renderExpandedMap() {
  if (!expanded.value || !position.value) return
  await nextTick()
  if (!expandedMapElement.value) return
  expandedMapError.value = ''
  try { expandedMap?.destroy?.() } catch {}
  expandedMap = null
  const y = (window as any).ymaps
  if (!y) { expandedMapError.value = 'La carte est momentanément indisponible.'; return }
  try {
    await new Promise<void>((resolve) => y.ready(resolve))
    if (!expanded.value || !expandedMapElement.value || !position.value) return
    expandedMap = paintMap(y, expandedMapElement.value, cachedSiteGuid === props.siteGuid ? cachedRing : null)
  } catch (error) {
    console.warn('[PointageLocationMap] Vue agrandie', error)
    expandedMapError.value = 'La carte est momentanément indisponible.'
  }
}

function openExpandedMap() {
  if (!position.value || expanded.value) return
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  expanded.value = true
  void nextTick(() => { closeButton.value?.focus(); void renderExpandedMap() })
}
function closeExpandedMap() {
  if (!expanded.value) return
  expanded.value = false
  document.body.style.overflow = previousBodyOverflow
  try { expandedMap?.destroy?.() } catch {}
  expandedMap = null
  void nextTick(() => previousFocus?.focus())
}
function onEscape(event: KeyboardEvent) { if (event.key === 'Escape' && expanded.value) closeExpandedMap() }
window.addEventListener('keydown', onEscape)
watch(() => [props.coordinates, props.siteGuid, props.gpsAccuracy], () => {
  closeExpandedMap()
  void drawMap()
}, {immediate: true, flush: 'post'})
onBeforeUnmount(() => {
  generation++
  closeExpandedMap()
  window.removeEventListener('keydown', onEscape)
  try { map?.destroy?.() } catch {}
  map = null
})
</script>
