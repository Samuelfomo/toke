<template>
  <div class="mx-auto w-full max-w-[1500px] py-6 flex justify-end">
    <RouterLink
        :to="{ name: 'planning-menu' }"
        class="inline-flex items-center gap-2 bg-slate-50/30 rounded-md hover:bg-slate-50 p-2 text-sm font-semibold text-slate-600 no-underline transition hover:text-blue-700"
    >
      <IconArrowLeft :size="18"/>
      Retour aux outils de planification
    </RouterLink>
  </div>

  <div class="mx-auto flex h-full w-full max-w-[1500px] flex-col bg-slate-50">

    <!-- ── Header ── -->
    <div class="relative shrink-0 border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div class="absolute inset-0 pointer-events-none"/>

      <div class="relative flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <div class="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
            <IconShieldCheck :size="12"/>
            <span>Planning & Rotations</span>
            <IconChevronRight :size="12"/>
            <span class="text-slate-700">Session Model</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Session Model</h1>
          <p class="mt-1 text-sm text-slate-600">Définissez les normes de travail applicables aux emplois du temps.</p>
        </div>
        <button
            @click="openCreate"
            class="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
            text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200 flex-shrink-0"
        >
          <IconPlus :size="16"/>
          Nouvelle norme
        </button>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">

      <!-- ── Toolbar ── -->
      <div class="flex items-center gap-3 flex-wrap bg-white p-4">

        <!-- Search -->
        <div class="relative flex-1 min-w-[180px] max-w-sm">
          <button @click="applySearch"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition">
            <IconSearch :size="14"/>
          </button>
          <input
              v-model="searchInput"
              @keyup.enter="applySearch"
              type="text"
              placeholder="Rechercher (Entrée pour valider)..."
              class="input-base !pl-9 !pr-8 w-full"
          />
          <button v-if="searchInput" @click="clearSearch"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
            <IconX :size="13"/>
          </button>
        </div>

        <!-- Statut -->
        <select v-model="filterActive" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Statut : Tous</option>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </select>

        <!-- Pause -->
        <select v-model="filterPause" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Pause : Tous</option>
          <option value="true">Pause autorisée</option>
          <option value="false">Sans pause</option>
        </select>

        <!-- Rotation -->
        <select v-model="filterRotation" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Rotation : Tous</option>
          <option value="true">Rotation activée</option>
          <option value="false">Sans rotation</option>
        </select>

        <div class="flex-1"/>

        <!-- Lignes par page — masqué sur mobile -->
        <div class="hidden sm:flex items-center gap-2 text-slate-500 text-xs">
          <span>Lignes :</span>
          <select
              :value="pagination.limit"
              @change="changePerPage(Number(($event.target as HTMLSelectElement).value))"
              class="input-base w-auto cursor-pointer text-xs py-1.5"
          >
            <option v-for="n in PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- Table — desktop uniquement (≥ md)                         -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div class="hidden md:block bg-white w-full border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">

            <thead>
            <tr class="border-b border-slate-100 text-xs font-black tracking-widest uppercase text-white bg-blue-950">
              <th class="px-5 py-3 text-left">Nom</th>
              <th class="px-4 py-3 text-left">Jours ouvrés</th>
              <th class="px-4 py-3 text-left">Normal</th>
              <th class="px-4 py-3 text-left">Min / Max</th>
              <th class="px-4 py-3 text-left">Pause</th>
              <th class="px-4 py-3 text-left">Rotation</th>
              <th class="px-4 py-3 text-left">Extra</th>
              <th class="px-4 py-3 text-left">Statut</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
            </thead>

            <!-- Loading -->
            <tbody v-if="loading">
            <tr>
              <td colspan="9" class="py-20 text-center">
                <div class="flex items-center justify-center gap-3 text-slate-400">
                  <IconLoader2 :size="20" class="animate-spin"/>
                  <span class="text-sm">Chargement...</span>
                </div>
              </td>
            </tr>
            </tbody>

            <!-- Empty -->
            <tbody v-else-if="items.length === 0">
            <tr>
              <td colspan="9" class="py-20 text-center">
                <div class="flex flex-col items-center gap-3 text-slate-400">
                  <IconShieldCheck :size="40" class="opacity-20"/>
                  <p class="text-sm">Aucune norme trouvée</p>
                  <button @click="openCreate" class="text-xs text-blue-500 hover:text-blue-400 transition">
                    Créer la première norme →
                  </button>
                </div>
              </td>
            </tr>
            </tbody>

            <!-- Rows -->
            <tbody v-else>
            <tr
                v-for="item in items"
                :key="item.guid"
                class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition group"
            >
              <td class="px-5 py-3.5">
                <p class="text-sm font-semibold text-slate-800">{{ item.name }}</p>
              </td>

              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span
                      v-for="day in item.workday" :key="day"
                      class="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600"
                  >{{ DAY_FR[day] ?? day }}</span>
                </div>
              </td>

              <td class="px-4 py-3.5 text-sm font-medium text-slate-700">{{ fmt(item.normal_session_time) }}</td>

              <td class="px-4 py-3.5 text-xs">
                <span class="text-emerald-600">↓ {{ fmt(item.min_working_time) }}</span>
                <span class="mx-1 text-slate-300">/</span>
                <span class="text-amber-500">↑ {{ fmt(item.max_working_time) }}</span>
              </td>

              <td class="px-4 py-3.5">
                <span v-if="item.pause_allowed"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
                >
                  <IconCheck :size="10"/> {{ item.pause_count }}x · {{ fmt(item.pause_duration) }}
                </span>
                <span v-else
                      class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                  <IconMinus :size="10"/> Non
                </span>
              </td>

              <td class="px-4 py-3.5">
                <span
                    class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    :class="item.rotation_allowed ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'"
                >
                  <IconCheck v-if="item.rotation_allowed" :size="10"/>
                  <IconMinus v-else :size="10"/>
                  {{ item.rotation_allowed ? 'Oui' : 'Non' }}
                </span>
              </td>

              <td class="px-4 py-3.5">
                <span v-if="item.extra_allowed"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
                >
                  <IconCheck :size="10"/> {{ fmt(item.extra_max) }}
                </span>
                <span v-else
                      class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                  <IconMinus :size="10"/> Non
                </span>
              </td>

              <td class="px-4 py-3.5">
                <span
                    class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    :class="item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="item.active ? 'bg-emerald-500' : 'bg-slate-300'"/>
                  {{ item.active ? 'Actif' : 'Inactif' }}
                </span>
              </td>

              <td class="px-4 py-3.5">
                <div class="flex items-center justify-end gap-1.5 transition">
                  <button @click="openEdit(item)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 bg-blue-50 transition"
                          title="Modifier">
                    <IconPencil :size="15"/>
                  </button>
                  <button @click="confirmDelete(item)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 bg-red-50 transition"
                          title="Supprimer">
                    <IconTrash :size="15"/>
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- Cards — mobile uniquement (< md)                          -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div class="md:hidden flex flex-col gap-3">

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center gap-3 text-slate-400 py-16">
          <IconLoader2 :size="20" class="animate-spin"/>
          <span class="text-sm">Chargement...</span>
        </div>

        <!-- Empty -->
        <div v-else-if="items.length === 0" class="flex flex-col items-center gap-3 text-slate-400 py-16">
          <IconShieldCheck :size="40" class="opacity-20"/>
          <p class="text-sm">Aucune norme trouvée</p>
          <button @click="openCreate" class="text-xs text-blue-500 hover:text-blue-400 transition">
            Créer la première norme →
          </button>
        </div>

        <!-- Cards -->
        <div
            v-else
            v-for="item in items"
            :key="item.guid"
            class="bg-white border border-slate-200 rounded-xl p-4"
        >
          <!-- Ligne 1 : nom + statut -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <p class="text-sm font-semibold text-slate-800">{{ item.name }}</p>
            <span
                class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                :class="item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="item.active ? 'bg-emerald-500' : 'bg-slate-300'"/>
              {{ item.active ? 'Actif' : 'Inactif' }}
            </span>
          </div>

          <!-- Ligne 2 : jours ouvrés -->
          <div class="flex flex-wrap gap-1 mb-3">
            <span
                v-for="day in item.workday" :key="day"
                class="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600"
            >{{ DAY_FR[day] ?? day }}</span>
          </div>

          <!-- Ligne 3 : durées -->
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-slate-50 rounded-lg px-2.5 py-2">
              <p class="text-xs text-slate-400 mb-0.5">Min</p>
              <p class="text-xs font-semibold text-emerald-600">{{ fmt(item.min_working_time) }}</p>
            </div>
            <div class="bg-slate-50 rounded-lg px-2.5 py-2">
              <p class="text-xs text-slate-400 mb-0.5">Normal</p>
              <p class="text-xs font-semibold text-slate-700">{{ fmt(item.normal_session_time) }}</p>
            </div>
            <div class="bg-slate-50 rounded-lg px-2.5 py-2">
              <p class="text-xs text-slate-400 mb-0.5">Max</p>
              <p class="text-xs font-semibold text-amber-500">{{ fmt(item.max_working_time) }}</p>
            </div>
          </div>

          <!-- Ligne 4 : badges pause / rotation / extra -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            <span v-if="item.pause_allowed"
                  class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
            >
              <IconCheck :size="10"/> {{ item.pause_count }}x · {{ fmt(item.pause_duration) }}
            </span>
            <span v-else
                  class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
              <IconMinus :size="10"/> Pas de pause
            </span>

            <span
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                :class="item.rotation_allowed ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'"
            >
              <IconCheck v-if="item.rotation_allowed" :size="10"/>
              <IconMinus v-else :size="10"/>
              Rotation {{ item.rotation_allowed ? 'Oui' : 'Non' }}
            </span>

            <span v-if="item.extra_allowed"
                  class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
            >
              <IconCheck :size="10"/> Extra {{ fmt(item.extra_max) }}
            </span>
          </div>

          <!-- Ligne 5 : actions -->
          <div class="flex gap-2 pt-3 border-t border-slate-100">
            <button
                @click="openEdit(item)"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
            >
              <IconPencil :size="13"/>
              Modifier
            </button>
            <button
                @click="confirmDelete(item)"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition"
            >
              <IconTrash :size="13"/>
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <!-- ── Pagination ── -->
      <div
          v-if="pagination.count > 0"
          class="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500 flex-shrink-0"
      >
        <span>
          {{ rangeStart }}–{{ rangeEnd }} sur
          <span class="text-slate-300 font-semibold">{{ pagination.count }}</span>
          résultat{{ pagination.count > 1 ? 's' : '' }}
        </span>

        <div class="flex items-center gap-1">
          <button @click="goToPage(1)" :disabled="currentPage === 1" class="pg-btn" title="Première page">
            <IconChevronsLeft :size="14"/>
          </button>
          <button @click="prevPage" :disabled="currentPage === 1" class="pg-btn" title="Page précédente">
            <IconChevronLeft :size="14"/>
          </button>

          <template v-for="p in visiblePages" :key="`pg-${p}`">
            <span v-if="p === '...'" class="px-2 text-slate-600 select-none">…</span>
            <button
                v-else
                @click="goToPage(Number(p))"
                class="pg-btn min-w-[32px]"
                :class="currentPage === Number(p) ? '!bg-blue-600 !text-white !border-blue-600' : ''"
            >{{ p }}
            </button>
          </template>

          <button @click="nextPage" :disabled="currentPage === totalPages" class="pg-btn" title="Page suivante">
            <IconChevronRight :size="14"/>
          </button>
          <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="pg-btn"
                  title="Dernière page">
            <IconChevronsRight :size="14"/>
          </button>
        </div>
      </div>

    </div><!-- /body -->

    <!-- ── Delete modal ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true"/>
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-session-model-title"
             class="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle :size="20" class="text-red-400"/>
            </div>
            <div>
              <p id="delete-session-model-title" class="text-white font-semibold text-sm">Supprimer la norme</p>
              <p class="text-slate-400 text-xs mt-0.5">Cette action est irréversible</p>
            </div>
          </div>
          <p class="text-slate-300 text-sm mb-6">
            Voulez-vous supprimer <span class="text-white font-semibold">« {{ deleteTarget.name }} »</span> ?
          </p>
          <div class="flex gap-3">
            <button type="button" @click="deleteTarget = null" :disabled="deleteLoading"
                    class="flex-1 px-4 py-2 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition disabled:cursor-not-allowed disabled:opacity-50">
              Annuler
            </button>
            <button @click="doDelete" :disabled="deleteLoading"
                    class="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {{ deleteLoading ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Form drawer ── -->
    <SessionModelForm
        v-if="showForm"
        :model="editTarget"
        @close="showForm = false"
        @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {
  IconShieldCheck, IconPlus, IconSearch, IconLoader2, IconX,
  IconPencil, IconTrash, IconCheck, IconMinus,
  IconChevronLeft, IconChevronRight,
  IconChevronsLeft, IconChevronsRight,
  IconAlertTriangle, IconArrowLeft,
} from '@tabler/icons-vue'
import SessionModelService from '@/service/SessionModelService'
import SessionModelForm from './sessionModelForm.vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import type {ISessionModel, IPagination} from './type'

// ── Constants ──────────────────────────────────────────────────────────────
const PER_PAGE_OPTIONS = [5, 10, 20, 50]
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}

// ── State ──────────────────────────────────────────────────────────────────
const items = ref<ISessionModel[]>([])
const loading = ref(false)

const searchInput = ref('')
const searchActive = ref('')

const filterActive = ref('')
const filterPause = ref('')
const filterRotation = ref('')

const pagination = ref<IPagination>({offset: 0, limit: 10, count: 0})

const showForm = ref(false)
const editTarget = ref<ISessionModel | null>(null)
const deleteTarget = ref<ISessionModel | null>(null)
const deleteLoading = ref(false)

const deleteDialogOpen = computed(() => Boolean(deleteTarget.value))
useBodyScrollLock(deleteDialogOpen)

// ── Computed ───────────────────────────────────────────────────────────────
const currentPage = computed(() =>
    Math.floor(pagination.value.offset / pagination.value.limit) + 1
)
const totalPages = computed(() =>
    Math.max(1, Math.ceil(pagination.value.count / pagination.value.limit))
)
const rangeStart = computed(() =>
    pagination.value.count === 0 ? 0 : pagination.value.offset + 1
)
const rangeEnd = computed(() =>
    Math.min(pagination.value.offset + pagination.value.limit, pagination.value.count)
)

const visiblePages = computed<(number | '...')[]>(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  if (cur > 3) result.push('...')
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let i = start; i <= end; i++) result.push(i)
  if (cur < total - 2) result.push('...')
  result.push(total)
  return result
})

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(min: number | null | undefined) {
  if (min == null || min === 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  try {
    loading.value = true
    const filters: Record<string, any> = {
      offset: pagination.value.offset,
      limit: pagination.value.limit,
    }
    if (searchActive.value) filters.search = searchActive.value
    if (filterActive.value) filters.active = filterActive.value === 'true'
    if (filterPause.value) filters.pause_allowed = filterPause.value === 'true'
    if (filterRotation.value) filters.rotation_allowed = filterRotation.value === 'true'

    const res = await SessionModelService.list(filters)
    if (res?.success) {
      items.value = res.data.session_models.items
      pagination.value = {...pagination.value, ...res.data.session_models.pagination}
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ── Search ─────────────────────────────────────────────────────────────────
function applySearch() {
  searchActive.value = searchInput.value.trim()
  pagination.value.offset = 0
  load()
}

function clearSearch() {
  searchInput.value = ''
  searchActive.value = ''
  pagination.value.offset = 0
  load()
}

// ── Filtres ────────────────────────────────────────────────────────────────
function resetAndLoad() {
  pagination.value.offset = 0;
  load()
}

function changePerPage(value: number) {
  pagination.value.limit = value
  pagination.value.offset = 0
  load()
}

// ── Pagination ─────────────────────────────────────────────────────────────
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  pagination.value.offset = (page - 1) * pagination.value.limit
  load()
}

function prevPage() {
  goToPage(currentPage.value - 1)
}

function nextPage() {
  goToPage(currentPage.value + 1)
}

// ── CRUD ───────────────────────────────────────────────────────────────────
function openCreate() {
  editTarget.value = null;
  showForm.value = true
}

function openEdit(item: ISessionModel) {
  editTarget.value = item;
  showForm.value = true
}

function confirmDelete(item: ISessionModel) {
  deleteTarget.value = item
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    deleteLoading.value = true
    await SessionModelService.delete(deleteTarget.value.guid)
    deleteTarget.value = null
    await load()
  } finally {
    deleteLoading.value = false
  }
}

function onSaved() {
  showForm.value = false;
  load()
}

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  pagination.value.limit = 5
  pagination.value.offset = 0
  await load()
})
</script>

<style scoped>
.input-base {
  @apply px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500
  placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition;
}

.pg-btn {
  @apply h-8 px-2 min-w-[32px] flex items-center justify-center rounded-lg
  border border-white/10 text-slate-400
  hover:bg-white/10 hover:text-slate-200
  disabled:opacity-25 disabled:cursor-not-allowed
  transition text-xs font-semibold;
}
</style>
