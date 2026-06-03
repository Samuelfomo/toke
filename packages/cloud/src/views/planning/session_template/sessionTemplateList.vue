<template>
  <div class="flex flex-col h-full bg-slate-50 w-full min-w-[80rem] max-w-[1300px]">

    <!-- ── Header ── -->
    <div class="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5">
            <IconCalendarEvent :size="12" />
            <span>Planning & Rotations</span>
            <IconChevronRight :size="12" />
            <span class="text-slate-600 font-medium">Session Template</span>
          </div>
          <h1 class="text-xl font-bold text-slate-800">Session Template</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Créez et gérez les emplois du temps standards réutilisables.
          </p>
        </div>
        <button
            @click="openCreate"
            class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 transition flex-shrink-0"
        >
          <IconPlus :size="15" />
          Nouveau modèle
        </button>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="flex-1 overflow-y-auto px-8 py-5 flex flex-col gap-4">

      <!-- ── Toolbar ── -->
      <div class="flex items-center gap-3 flex-wrap">

        <!-- Search -->
        <div class="relative flex-1 min-w-[220px] max-w-sm">
          <button @click="applySearch" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition">
            <IconSearch :size="14" />
          </button>
          <input
              v-model="searchInput"
              @keyup.enter="applySearch"
              type="text"
              placeholder="Rechercher un modèle..."
              class="input-base !pl-9 !pr-8 w-full"
          />
          <button v-if="searchInput" @click="clearSearch"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            <IconX :size="13" />
          </button>
        </div>

        <!-- Norme -->
        <select v-model="filterModel" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Norme : Toutes</option>
          <option v-for="sm in sessionModels" :key="sm.guid" :value="sm.guid">
            {{ sm.name }}
          </option>
        </select>

        <!-- Statut -->
        <select v-model="filterActive" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Statut : Tous</option>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </select>

        <!-- Rotation -->
        <select v-model="filterRotation" @change="resetAndLoad" class="input-base w-auto cursor-pointer">
          <option value="">Type : Tous</option>
          <option value="true">Pour rotation</option>
          <option value="false">Standard</option>
        </select>

        <div class="flex-1" />

        <!-- Per page -->
        <div class="flex items-center gap-2 text-slate-400 text-xs">
          <span>Lignes :</span>
          <select
              :value="pagination.limit"
              @change="changePerPage(Number(($event.target as HTMLSelectElement).value))"
              class="input-base w-auto cursor-pointer text-xs py-1.5"
          >
            <option v-for="n in [5, 10, 20, 50]" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>

      <!-- ── Table ── -->
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[780px] border-collapse">

            <thead>
            <tr class="border-b border-slate-100 text-[10.5px] font-bold tracking-widest uppercase text-slate-400">
              <th class="px-5 py-3 text-left">Modèle</th>
              <th class="px-4 py-3 text-left">Norme associée</th>
              <th class="px-4 py-3 text-left">Jours travaillés</th>
              <th class="px-4 py-3 text-left">Horaire type</th>
              <th class="px-4 py-3 text-left">Rotation</th>
              <th class="px-4 py-3 text-left">Statut</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
            </thead>

            <!-- Loading -->
            <tbody v-if="loading">
            <tr>
              <td colspan="7" class="py-20 text-center">
                <div class="flex items-center justify-center gap-2 text-slate-400">
                  <IconLoader2 :size="18" class="animate-spin" />
                  <span class="text-sm">Chargement...</span>
                </div>
              </td>
            </tr>
            </tbody>

            <!-- Empty -->
            <tbody v-else-if="items.length === 0">
            <tr>
              <td colspan="7" class="py-20 text-center">
                <div class="flex flex-col items-center gap-3 text-slate-400">
                  <IconCalendarEvent :size="36" class="opacity-20" />
                  <p class="text-sm">Aucun modèle trouvé</p>
                  <button @click="openCreate" class="text-xs text-blue-500 hover:text-blue-600 transition">
                    Créer le premier modèle →
                  </button>
                </div>
              </td>
            </tr>
            </tbody>

            <tbody v-else>
            <tr
                v-for="item in items"
                :key="item.guid"
                class="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition group"
            >
              <!-- Nom -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <IconCalendarEvent :size="14" class="text-blue-500" />
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-slate-800">{{ item.name }}</p>
                  </div>
                </div>
              </td>

              <!-- Norme -->
              <td class="px-4 py-3.5">
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                    <IconShieldCheck :size="11" class="text-slate-400" />
                    {{ item.session_model.name ?? '—' }}
                  </span>
              </td>

              <!-- Jours travaillés -->
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                    <span
                        v-for="day in workedDays(item.definition)"
                        :key="day"
                        class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-500"
                    >{{ DAY_FR[day] ?? day }}</span>
                  <span v-if="workedDays(item.definition).length === 0" class="text-slate-300 text-xs">—</span>
                </div>
              </td>

              <!-- Horaire type (premier bloc lundi ou premier jour disponible) -->
              <td class="px-4 py-3.5 text-xs text-slate-600">
                {{ firstScheduleSummary(item.definition) }}
              </td>

              <!-- Rotation -->
              <td class="px-4 py-3.5">
                  <span
                      class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      :class="item.for_rotation
                      ? 'bg-violet-50 text-violet-600'
                      : 'bg-slate-100 text-slate-400'"
                  >
                    <IconCheck v-if="item.for_rotation" :size="10" />
                    <IconMinus v-else :size="10" />
                    {{ item.for_rotation ? 'Oui' : 'Non' }}
                  </span>
              </td>

              <!-- Statut -->
              <td class="px-4 py-3.5">
                  <span
                      class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      :class="item.is_current
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full"
                          :class="item.is_current ? 'bg-emerald-400' : 'bg-slate-300'" />
                    {{ item.is_current ? 'Actif' : 'Inactif' }}
                  </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5">
                <div class="flex items-center justify-end gap-1.5 opacity-100 transition">
                  <button @click="openEdit(item)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-slate-400 hover:text-blue-500 hover:bg-blue-100 transition"
                          title="Modifier"
                  >
                    <IconPencil :size="14" />
                  </button>
                  <button @click="confirmDelete(item)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-slate-400 hover:text-red-500 hover:bg-red-100 transition"
                          title="Supprimer"
                  >
                    <IconTrash :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Pagination ── -->
      <div
          v-if="pagination.count > 0"
          class="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500"
      >
        <span>
          {{ rangeStart }}–{{ rangeEnd }} sur
          <span class="text-slate-700 font-semibold">{{ pagination.count }}</span>
          résultat{{ pagination.count > 1 ? 's' : '' }}
        </span>

        <div class="flex items-center gap-1">
          <button @click="goToPage(1)" :disabled="currentPage === 1" class="pg-btn">
            <IconChevronsLeft :size="13" />
          </button>
          <button @click="prevPage" :disabled="currentPage === 1" class="pg-btn">
            <IconChevronLeft :size="13" />
          </button>

          <template v-for="p in visiblePages" :key="`pg-${p}`">
            <span v-if="p === '...'" class="px-1.5 text-slate-300 select-none">…</span>
            <button
                v-else
                @click="goToPage(Number(p))"
                class="pg-btn min-w-[30px]"
                :class="currentPage === Number(p) ? '!bg-blue-500 !text-white !border-blue-500' : ''"
            >{{ p }}</button>
          </template>

          <button @click="nextPage" :disabled="currentPage === totalPages" class="pg-btn">
            <IconChevronRight :size="13" />
          </button>
          <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="pg-btn">
            <IconChevronsRight :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete modal ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="deleteTarget = null">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle :size="20" class="text-red-500" />
            </div>
            <div>
              <p class="text-slate-800 font-semibold text-sm">Supprimer le modèle</p>
              <p class="text-slate-400 text-xs mt-0.5">Cette action est irréversible</p>
            </div>
          </div>
          <p class="text-slate-600 text-sm mb-6">
            Voulez-vous supprimer <span class="text-slate-800 font-semibold">« {{ deleteTarget.name }} »</span> ?
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null"
                    class="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
            >Annuler</button>
            <button @click="doDelete" :disabled="deleteLoading"
                    class="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-60"
            >{{ deleteLoading ? 'Suppression...' : 'Supprimer' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Form modal ── -->
    <SessionTemplateForm
        v-if="showForm"
        :template="editTarget"
        :session-models="sessionModels"
        @close="showForm = false"
        @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IconCalendarEvent, IconPlus, IconSearch, IconLoader2, IconX,
  IconPencil, IconTrash, IconCheck, IconMinus, IconShieldCheck,
  IconChevronLeft, IconChevronRight,
  IconChevronsLeft, IconChevronsRight,
  IconAlertTriangle,
} from '@tabler/icons-vue'
import SessionTemplateService from '@/service/SessionTemplate'
import SessionModelService    from '@/service/SessionModelService'
import SessionTemplateForm    from './sessionTemplateForm.vue'
import type { ISessionTemplate, IDefinition } from './type'
import {IPagination, ISessionModel} from '../session_model/type'

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── State ──────────────────────────────────────────────────────────────────
const items          = ref<ISessionTemplate[]>([])
const sessionModels  = ref<ISessionModel[]>([])
// const sessionModels  = ref<{ guid: string; name: string; workday: string[]; pause_allowed: boolean }[]>([])
const loading        = ref(false)

const searchInput    = ref('')
const searchActive   = ref('')
const filterModel    = ref('')
const filterActive   = ref('')
const filterRotation = ref('')

const pagination = ref<IPagination>({ offset: 0, limit: 10, count: 0 })

const showForm      = ref(false)
const editTarget    = ref<ISessionTemplate | null>(null)
const deleteTarget  = ref<ISessionTemplate | null>(null)
const deleteLoading = ref(false)

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
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  if (cur > 3) result.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) result.push(i)
  if (cur < total - 2) result.push('...')
  result.push(total)
  return result
})

// ── Helpers ────────────────────────────────────────────────────────────────
function workedDays(def: IDefinition): string[] {
  return DAY_ORDER.filter((d) => def[d] && Array.isArray(def[d]) && (def[d] as any[]).length > 0)
}

function firstScheduleSummary(def: IDefinition): string {
  for (const day of DAY_ORDER) {
    const blocks = def[day]
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      const b = blocks[0]
      return `${b.work[0]} – ${b.work[1]}`
    }
  }
  return '—'
}

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  try {
    loading.value = true
    const filters: Record<string, any> = {
      offset: pagination.value.offset,
      limit:  pagination.value.limit,
    }
    if (searchActive.value)    filters.search        = searchActive.value
    if (filterModel.value)     filters.session_model = filterModel.value
    if (filterActive.value)    filters.active        = filterActive.value === 'true'
    if (filterRotation.value)  filters.for_rotation  = filterRotation.value === 'true'

    const res = await SessionTemplateService.list(filters)
    if (res?.success) {
      items.value      = res.data.templates.items
      pagination.value = { ...pagination.value, ...res.data.session_templates.pagination }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadSessionModels() {
  const res = await SessionModelService.list({ active: true, limit: 100 })
  if (res?.success) sessionModels.value = res.data.session_models.items
}

// ── Search / Filters ───────────────────────────────────────────────────────
function applySearch() {
  searchActive.value = searchInput.value.trim()
  pagination.value.offset = 0
  load()
}
function clearSearch() {
  searchInput.value = ''; searchActive.value = ''
  pagination.value.offset = 0; load()
}
function resetAndLoad() { pagination.value.offset = 0; load() }
function changePerPage(v: number) { pagination.value.limit = v; pagination.value.offset = 0; load() }

// ── Pagination ─────────────────────────────────────────────────────────────
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  pagination.value.offset = (page - 1) * pagination.value.limit
  load()
}
function prevPage() { goToPage(currentPage.value - 1) }
function nextPage() { goToPage(currentPage.value + 1) }

// ── CRUD ───────────────────────────────────────────────────────────────────
function openCreate() { editTarget.value = null; showForm.value = true }
function openEdit(item: ISessionTemplate) { editTarget.value = item; showForm.value = true }
function confirmDelete(item: ISessionTemplate) { deleteTarget.value = item }

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    deleteLoading.value = true
    await SessionTemplateService.delete(deleteTarget.value.guid)
    deleteTarget.value = null
    await load()
  } finally {
    deleteLoading.value = false
  }
}
function onSaved() { showForm.value = false; load() }

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(() => { loadSessionModels(); load() })
</script>

<style scoped>
.input-base {
  @apply px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
  placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition;
}
.pg-btn {
  @apply h-7 px-2 min-w-[28px] flex items-center justify-center rounded-lg
  border border-slate-200 text-slate-500
  hover:bg-slate-50 hover:text-slate-700
  disabled:opacity-30 disabled:cursor-not-allowed
  transition text-xs font-semibold;
}
</style>