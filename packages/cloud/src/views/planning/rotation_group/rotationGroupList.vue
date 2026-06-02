<template>
  <div class="flex h-full bg-slate-50 overflow-hidden min-w-[80rem]">

    <!-- ══════════════════════════════════════════
         PANNEAU GAUCHE — liste des groupes
    ══════════════════════════════════════════ -->
    <div
        class="flex flex-col border-r border-slate-200 bg-white transition-all duration-300 flex-shrink-0"
        :class="selected ? 'w-80' : 'flex-1'"
    >
      <!-- Header -->
      <div class="px-5 pt-5 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2">
          <IconRefresh :size="11" />
          <span>Planning & Rotations</span>
          <IconChevronRight :size="11" />
          <span class="text-slate-600 font-semibold">Rotation Group</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-lg font-bold text-slate-800 leading-tight">Groupes de rotation</h1>
            <p class="text-slate-400 text-xs mt-0.5">{{ pagination.count }} groupe{{ pagination.count !== 1 ? 's' : '' }}</p>
          </div>
          <button
              @click="openCreate"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-200 transition flex-shrink-0"
          >
            <IconPlus :size="13" /> Nouveau
          </button>
        </div>

        <!-- Search -->
        <div class="relative mt-3">
          <IconSearch :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
              v-model="searchInput"
              @keyup.enter="applySearch"
              type="text"
              placeholder="Rechercher..."
              class="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
          />
          <button v-if="searchInput" @click="clearSearch"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <IconX :size="12" />
          </button>
        </div>

        <!-- Filter chips -->
        <div class="flex gap-1.5 mt-2">
          <button
              v-for="f in STATUS_FILTERS" :key="f.value"
              @click="setStatusFilter(f.value)"
              class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition"
              :class="filterActive === f.value
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
          >{{ f.label }}</button>
        </div>
      </div>

      <!-- Liste scrollable -->
      <div class="flex-1 overflow-y-auto py-2 px-3 space-y-1.5">

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-slate-400">
          <IconLoader2 :size="16" class="animate-spin" />
          <span class="text-xs">Chargement...</span>
        </div>

        <!-- Empty -->
        <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <IconRefresh :size="22" class="opacity-30" />
          </div>
          <p class="text-xs">Aucun groupe trouvé</p>
          <button @click="openCreate" class="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition">
            Créer le premier groupe →
          </button>
        </div>

        <!-- Cards -->
        <div
            v-else
            v-for="item in items"
            :key="item.guid"
            @click="selectGroup(item)"
            class="group relative rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden"
            :class="selected?.guid === item.guid
            ? 'border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100'
            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'"
        >
          <!-- Barre couleur gauche -->
          <div
              class="absolute left-0 top-0 bottom-0 w-0.5 transition-all"
              :class="selected?.guid === item.guid ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-indigo-200'"
          />

          <div class="px-4 py-3 pl-5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800 truncate leading-tight">{{ item.name }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Cycle {{ item.cycle_length }} {{ item.cycle_unit === 'week' ? 'sem.' : 'j.' }}
                  · {{ (item.cycle_templates?.length ?? 0) }} position{{ (item.cycle_templates?.length ?? 0) > 1 ? 's' : '' }}
                </p>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span
                    class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    :class="item.active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="item.active ? 'bg-emerald-500' : 'bg-slate-300'" />
                  {{ item.active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>

            <!-- Pills config -->
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              <span class="chip">
                <IconArrowRight :size="9" :class="item.direction === 'backward' ? 'rotate-180' : ''" />
                {{ item.direction === 'forward' ? 'Avance' : 'Recule' }}
              </span>
              <span class="chip" :class="item.auto_advance ? 'chip-indigo' : ''">
                <IconRefresh :size="9" />
                Auto {{ item.auto_advance ? 'ON' : 'OFF' }}
              </span>
              <span class="chip">
                <IconCalendar :size="9" />
                Pas {{ item.rotation_step }}
              </span>
            </div>
          </div>

          <!-- Actions au hover -->
          <div class="absolute right-2 bottom-4 flex items-center gap-1">
            <button @click.stop="openEdit(item)"
                    class="w-6 h-6 rounded-md flex items-center justify-center bg-indigo-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-100 transition"
            ><IconPencil :size="12" /></button>
            <button @click.stop="confirmDelete(item)"
                    class="w-6 h-6 rounded-md flex items-center justify-center bg-red-50 text-slate-400 hover:text-red-500 hover:bg-red-100 transition"
            ><IconTrash :size="12" /></button>
          </div>
        </div>
      </div>

      <!-- Pagination compacte -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-shrink-0 gap-2">
        <!-- Lignes par page -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-slate-400">Lignes</span>
          <select
              :value="pagination.limit"
              @change="changePerPage(Number(($event.target as HTMLSelectElement).value))"
              class="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:border-indigo-400 cursor-pointer transition"
          >
            <option v-for="n in [5, 10, 20, 50]" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <!-- Résumé + nav -->
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400">
            {{ rangeStart }}–{{ rangeEnd }}
            <span class="text-slate-600 font-semibold">/ {{ pagination.count }}</span>
          </span>
          <div class="flex items-center gap-1">
            <button @click="prevPage" :disabled="currentPage === 1"
                    class="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition"
            ><IconChevronLeft :size="12" /></button>
            <span class="text-[11px] text-slate-600 font-bold px-1.5">{{ currentPage }}/{{ totalPages }}</span>
            <button @click="nextPage" :disabled="currentPage === totalPages"
                    class="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition"
            ><IconChevronRight :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         PANNEAU DROIT — détail du groupe sélectionné
    ══════════════════════════════════════════ -->
    <transition name="panel">
      <div v-if="selected" class="flex-1 flex flex-col overflow-hidden bg-slate-50">

        <!-- Header détail -->
        <div class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <IconRefresh :size="18" class="text-indigo-500" />
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-bold text-slate-800 truncate">{{ selected.name }}</h2>
              <p class="text-xs text-slate-400">
                Depuis le {{ formatDate(selected.start_date) }}
                · Cycle {{ selected.cycle_length }} {{ selected.cycle_unit === 'week' ? 'semaine(s)' : 'jour(s)' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Toggle actif/inactif -->
            <button @click="toggleActive"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
                    :class="selected.active
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'"
            >
              <span class="w-2 h-2 rounded-full" :class="selected.active ? 'bg-emerald-500' : 'bg-slate-300'" />
              {{ selected.active ? 'Actif' : 'Inactif' }}
            </button>
            <button @click="openEdit(selected)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <IconPencil :size="13" /> Modifier
            </button>
            <button @click="selected = null"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            ><IconX :size="15" /></button>
          </div>
        </div>

        <!-- Contenu détail -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          <!-- Stats cards -->
          <div class="grid grid-cols-4 gap-3">
            <div v-for="stat in groupStats" :key="stat.label"
                 class="bg-white rounded-xl border border-slate-200 px-4 py-3"
            >
              <p class="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{{ stat.label }}</p>
              <p class="text-xl font-bold mt-1" :class="stat.color">{{ stat.value }}</p>
            </div>
          </div>

          <!-- Séquence de rotation -->
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <p class="text-sm font-bold text-slate-700">
                Séquence de rotation
                <span class="text-slate-400 font-normal ml-1">({{ selected.cycle_templates?.length ?? 0 }} étapes)</span>
              </p>
              <button @click="openAddPosition"
                      class="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition"
              >
                <IconPlus :size="13" /> Ajouter une position
              </button>
            </div>

            <!-- Empty sequence -->
            <div v-if="!selected.cycle_templates?.length"
                 class="flex flex-col items-center justify-center py-12 text-slate-400 gap-2"
            >
              <IconStack :size="28" class="opacity-20" />
              <p class="text-xs">Aucune position définie</p>
              <button @click="openAddPosition" class="text-xs text-indigo-500 hover:text-indigo-600 font-medium mt-1">
                Ajouter la première position →
              </button>
            </div>

            <!-- Steps timeline -->
            <div v-else class="px-5 py-4 flex flex-col gap-2">
              <div
                  v-for="(tpl, idx) in selected.cycle_templates"
                  :key="tpl.guid"
                  class="flex items-center gap-4 group"
              >
                <!-- Step number -->
                <div class="flex flex-col items-center flex-shrink-0 w-8">
                  <div
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :class="idx === 0
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-500'"
                  >{{ idx + 1 }}</div>
                  <div v-if="idx < (selected.cycle_templates?.length ?? 0) - 1"
                       class="w-px h-5 bg-slate-200 mt-1"
                  />
                </div>

                <!-- Template card -->
                <div class="flex-1 flex items-center gap-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl px-4 py-2.5 transition group-hover:shadow-sm">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-800 truncate">
                      {{ tpl.template_snapshot?.name ?? '—' }}
                    </p>
                    <p class="text-[11px] text-slate-400 mt-0.5">
                      {{ firstScheduleOfTemplate(tpl.template_snapshot) }}
                    </p>
                  </div>
                  <!-- Jours du template -->
                  <div class="flex gap-1 flex-shrink-0">
                    <span
                        v-for="day in workedDaysOfTemplate(tpl.template_snapshot)"
                        :key="day"
                        class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-400"
                    >{{ DAY_FR[day] ?? day }}</span>
                  </div>
                  <!-- Remove -->
                  <button @click="removePosition(tpl)"
                          class="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 opacity-100 text-slate-600 hover:text-red-500 hover:bg-red-100 transition"
                  ><IconTrash :size="12" /></button>
                </div>

                <!-- Cycle indicator à la fin -->
                <div v-if="idx === (selected.cycle_templates?.length ?? 0) - 1"
                     class="flex-shrink-0 w-8 flex flex-col items-center"
                >
                  <div class="w-px h-4 bg-slate-200" />
                  <IconRefresh :size="14" class="text-indigo-300 my-1" />
                  <p class="text-[9px] text-slate-400 text-center leading-tight">Cycle<br/>reprend</p>
                </div>
                <div v-else class="w-8 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- État vide : aucun groupe sélectionné -->
      <div v-else-if="!loading && items.length > 0"
           class="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4"
      >
        <div class="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
          <IconRefresh :size="36" class="opacity-30" />
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-slate-400">Sélectionnez un groupe</p>
          <p class="text-xs text-slate-300 mt-1">Cliquez sur une carte pour voir le détail</p>
        </div>
      </div>
    </transition>

    <!-- ══ Delete modal ══ -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="deleteTarget = null">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle :size="18" class="text-red-500" />
            </div>
            <div>
              <p class="text-slate-800 font-semibold text-sm">Supprimer le groupe</p>
              <p class="text-slate-400 text-xs mt-0.5">Cette action est irréversible</p>
            </div>
          </div>
          <p class="text-slate-600 text-sm mb-5">
            Supprimer <span class="font-semibold text-slate-800">« {{ deleteTarget.name }} »</span> ?
          </p>
          <div class="flex gap-2">
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

    <!-- ══ Add position modal ══ -->
    <Teleport to="body">
      <div v-if="showAddPosition" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAddPosition = false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <h3 class="text-sm font-bold text-slate-800 mb-4">Ajouter une position</h3>
          <div class="space-y-3">
            <div>
              <label class="field-label">Modèle d'emploi du temps <span class="text-red-500">*</span></label>
              <select v-model="newPositionTemplate" class="field mt-1 cursor-pointer">
                <option value="">Sélectionner un template...</option>
                <option v-for="t in rotationTemplates" :key="t.guid" :value="t.guid">
                  {{ t.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="field-label">Position (index)</label>
              <input type="number" v-model.number="newPositionIndex" min="0"
                     class="field mt-1" placeholder="0" />
            </div>
          </div>
          <p v-if="addPositionError" class="text-xs text-red-500 mt-2">{{ addPositionError }}</p>
          <div class="flex gap-2 mt-5">
            <button @click="showAddPosition = false"
                    class="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
            >Annuler</button>
            <button @click="doAddPosition" :disabled="addingPosition"
                    class="flex-1 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-60"
            >{{ addingPosition ? 'Ajout...' : 'Ajouter' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ Form drawer ══ -->
    <RotationGroupForm
        v-if="showForm"
        :group="editTarget"
        @close="showForm = false"
        @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IconRefresh, IconPlus, IconSearch, IconLoader2, IconX,
  IconPencil, IconTrash, IconChevronLeft, IconChevronRight,
  IconAlertTriangle, IconArrowRight, IconCalendar,
  IconStack, IconChevronRight as IconChevronRightNav,
} from '@tabler/icons-vue'
import RotationGroupService    from '@/service/RotationGroup'
import SessionTemplateService  from '@/service/SessionTemplate'
import RotationGroupForm       from './rotationGroupForm.vue'
import type { IRotationGroup, IRotationGroupTemplate } from './type'
import type { ISessionTemplate, IDefinition } from '../session_template/type'
import type { IPagination } from '../session_model/type'

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lu', Tue: 'Ma', Wed: 'Me', Thu: 'Je', Fri: 'Ve', Sat: 'Sa', Sun: 'Di',
}
const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Actifs' },
  { value: 'false', label: 'Inactifs' },
]

// ── State ──────────────────────────────────────────────────────────────────
const items             = ref<IRotationGroup[]>([])
const selected          = ref<IRotationGroup | null>(null)
const rotationTemplates = ref<ISessionTemplate[]>([])
const loading           = ref(false)

const searchInput  = ref('')
const searchActive = ref('')
const filterActive = ref('')

const pagination = ref<IPagination>({ offset: 0, limit: 10, count: 0 })

const showForm      = ref(false)
const editTarget    = ref<IRotationGroup | null>(null)
const deleteTarget  = ref<IRotationGroup | null>(null)
const deleteLoading = ref(false)

const showAddPosition    = ref(false)
const newPositionTemplate = ref('')
const newPositionIndex    = ref(0)
const addPositionError    = ref('')
const addingPosition      = ref(false)

// ── Computed ───────────────────────────────────────────────────────────────
const currentPage = computed(() =>
    Math.floor(pagination.value.offset / pagination.value.limit) + 1
)
const totalPages = computed(() =>
    Math.max(1, Math.ceil(pagination.value.count / pagination.value.limit))
)
const rangeStart = computed(() => pagination.value.count === 0 ? 0 : pagination.value.offset + 1)
const rangeEnd   = computed(() =>
    Math.min(pagination.value.offset + pagination.value.limit, pagination.value.count)
)

const groupStats = computed(() => {
  if (!selected.value) return []
  const s = selected.value
  return [
    { label: 'Positions',  value: s.cycle_templates?.length ?? 0,  color: 'text-indigo-600' },
    { label: 'Longueur',   value: `${s.cycle_length} ${s.cycle_unit === 'week' ? 'sem' : 'j'}`, color: 'text-slate-700' },
    { label: 'Pas',        value: s.rotation_step,           color: 'text-slate-700' },
    { label: 'Auto-avance',value: s.auto_advance ? 'Oui' : 'Non', color: s.auto_advance ? 'text-emerald-600' : 'text-slate-400' },
  ]
})

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function workedDaysOfTemplate(tpl?: ISessionTemplate): string[] {
  if (!tpl?.definition) return []
  return DAY_ORDER.filter((d) => {
    const v = tpl.definition[d]
    return Array.isArray(v) && v.length > 0
  })
}

function firstScheduleOfTemplate(tpl?: ISessionTemplate): string {
  if (!tpl?.definition) return '—'
  for (const day of DAY_ORDER) {
    const blocks = tpl.definition[day]
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      return `${blocks[0].work[0]} – ${blocks[0].work[1]}`
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
    if (searchActive.value)   filters.search = searchActive.value
    if (filterActive.value)   filters.active = filterActive.value === 'true'

    const res = await RotationGroupService.list(filters)
    if (res?.success) {
      items.value      = res.data.rotation_groups.items
      pagination.value = { ...pagination.value, ...res.data.rotation_groups.pagination }
      // Sync le groupe sélectionné si encore dans la liste
      if (selected.value) {
        const refreshed = items.value.find((i) => i.guid === selected.value!.guid)
        if (refreshed) selected.value = refreshed
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadRotationTemplates() {
  const res = await SessionTemplateService.listForRotation()
  if (res?.success) rotationTemplates.value = res.data.templates?.items ?? []
  console.log('loadRotationTemplates', rotationTemplates.value.length)
}

// ── Search / Filters ───────────────────────────────────────────────────────
function applySearch() { searchActive.value = searchInput.value.trim(); pagination.value.offset = 0; load() }
function clearSearch() { searchInput.value = ''; searchActive.value = ''; pagination.value.offset = 0; load() }
function setStatusFilter(val: string) { filterActive.value = val; pagination.value.offset = 0; load() }
function prevPage() { if (currentPage.value > 1) { pagination.value.offset -= pagination.value.limit; load() } }
function nextPage() { if (currentPage.value < totalPages.value) { pagination.value.offset += pagination.value.limit; load() } }
function changePerPage(v: number) { pagination.value.limit = v; pagination.value.offset = 0; load() }

// ── Selection ──────────────────────────────────────────────────────────────
async function selectGroup(item: IRotationGroup) {
  // Recharge le détail complet (avec templates) si nécessaire
  if (selected.value?.guid === item.guid) { selected.value = null; return }
  // const res = await RotationGroupService.getByGuid(item.guid)
  // selected.value = res?.success ? res.data : item
  selected.value = item
}

// ── Toggle active ──────────────────────────────────────────────────────────
async function toggleActive() {
  if (!selected.value) return
  const res = await RotationGroupService.toggleActive(selected.value.guid, !selected.value.active)
  if (res?.success) { selected.value = { ...selected.value, active: !selected.value.active }; await load() }
}

// ── CRUD ───────────────────────────────────────────────────────────────────
function openCreate() { editTarget.value = null; showForm.value = true }
function openEdit(item: IRotationGroup) { editTarget.value = item; showForm.value = true }
function confirmDelete(item: IRotationGroup) { deleteTarget.value = item }

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    deleteLoading.value = true
    await RotationGroupService.delete(deleteTarget.value.guid)
    if (selected.value?.guid === deleteTarget.value.guid) selected.value = null
    deleteTarget.value = null
    await load()
  } finally {
    deleteLoading.value = false
  }
}

function onSaved() {
  showForm.value = false
  load()
  // Recharge le détail si le groupe édité était sélectionné
  if (selected.value && editTarget.value?.guid === selected.value.guid) {
    selectGroup(selected.value)
  }
}

// ── Positions ──────────────────────────────────────────────────────────────
function openAddPosition() {
  newPositionTemplate.value = ''
  newPositionIndex.value = selected.value?.cycle_templates?.length ?? 0
  addPositionError.value = ''
  showAddPosition.value = true
}

async function doAddPosition() {
  if (!newPositionTemplate.value) { addPositionError.value = 'Sélectionnez un template'; return }
  if (!selected.value) return
  addingPosition.value = true
  const res = await RotationGroupService.addPosition({
    rotation_group:   selected.value.guid,
    session_template: newPositionTemplate.value,
    position:         newPositionIndex.value,
  })
  addingPosition.value = false
  if (res?.success) {
    showAddPosition.value = false
    await selectGroup(selected.value) // Recharge les templates
    await load()
  } else {
    addPositionError.value = res?.error?.message ?? 'Erreur lors de l\'ajout'
  }
}

async function removePosition(tpl: IRotationGroupTemplate) {
  await RotationGroupService.removePosition(tpl.guid)
  if (selected.value) await selectGroup(selected.value)
  await load()
}

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(() => { load(); loadRotationTemplates() })
</script>

<style scoped>
.chip {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
  bg-slate-100 text-slate-500;
}
.chip-indigo {
  @apply bg-indigo-50 text-indigo-500;
}
.field-label { @apply text-[10.5px] font-bold text-slate-500 uppercase tracking-wide; }
.field {
  @apply w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800
  placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition;
}

/* Transition panneau droit */
.panel-enter-active, .panel-leave-active { transition: opacity 0.2s, transform 0.2s; }
.panel-enter-from, .panel-leave-to       { opacity: 0; transform: translateX(12px); }
</style>