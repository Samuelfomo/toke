<template>
  <div class="flex flex-col min-h-0 flex-1 overflow-hidden">

    <!-- ── Bandeau en-tête ── -->
    <div class="flex-shrink-0 bg-[#004aad] text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <IconSparkles :size="16" />
        </div>
        <div class="min-w-0">
          <p class="text-[10px] text-blue-200 font-medium uppercase tracking-wide">Suggestion de planning</p>
          <p class="text-sm font-bold truncate">{{ periodLabel }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap flex-shrink-0">
        <!-- Score -->
        <div class="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5">
          <div class="w-2 h-2 rounded-full flex-shrink-0" :class="scoreColor" />
          <span class="text-xs font-semibold">{{ suggestion.conformity_score ?? 0 }}% conforme</span>
        </div>

        <!-- Semaines d'historique analysées -->
        <div class="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 text-xs text-blue-200">
          <IconHistory :size="12" />
          {{ suggestion.history_weeks }} sem. analysée{{ suggestion.history_weeks > 1 ? 's' : '' }}
        </div>

        <!-- Nb employés -->
        <div class="hidden sm:flex items-center gap-1.5 text-xs text-blue-200">
          <IconUsers :size="13" />
          {{ visibleItems.length }} employé(s)
        </div>

        <!-- Regénérer -->
        <button
            @click="$emit('regenerate')"
            :disabled="!!actionLoading"
            class="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition disabled:opacity-50"
        >
          <IconLoader2 v-if="actionLoading === 'regenerate'" :size="12" class="animate-spin" />
          <IconRefresh v-else :size="12" />
          Regénérer
        </button>

        <!-- Fermer -->
        <button
            @click="$emit('close')"
            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition"
            title="Fermer"
        >
          <IconX :size="15" />
        </button>
      </div>
    </div>

    <!-- ── Pied de page actions ── -->
    <div class="flex-shrink-0 border-b border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

      <!-- Sous-info -->
      <div class="flex items-center gap-2 min-w-0">
        <IconInfoCircle :size="12" class="text-blue-400 flex-shrink-0" />
        <span class="text-[11px] text-gray-500 truncate">
          Basé sur <span class="font-semibold text-gray-700">{{ suggestion.history_weeks }} semaine{{ suggestion.history_weeks > 1 ? 's' : '' }}</span> d'historique
          · Cliquez sur une cellule pour modifier · Non enregistré avant validation
        </span>
        <span class="flex items-center gap-1 ml-3 text-[11px] text-amber-600">
         <span class="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
        Modifié manuellement
       </span>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button
            @click="handleReject"
            :disabled="!!actionLoading"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
        >
          <IconLoader2 v-if="actionLoading === 'reject'" :size="13" class="animate-spin" />
          <IconThumbDown v-else :size="13" />
          Rejeter
        </button>
        <button
            @click="handleApprove"
            :disabled="!!actionLoading"
            class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#004aad] hover:bg-[#003a8c] text-white text-sm font-bold transition disabled:opacity-50 shadow-sm shadow-blue-200"
        >
          <IconLoader2 v-if="actionLoading === 'approve'" :size="13" class="animate-spin" />
          <IconCheck v-else :size="13" />
          Valider le planning
        </button>
      </div>
    </div>
    <div v-if="errorMsg" class="flex-shrink-0  px-4 sm:px-6 mb-3 mt-1 flex items-center justify-end w-full">
      <p  class="text-xs text-red-500 flex items-end gap-1.5 ml-auto bg-red-50/50 px-2.5 py-2 rounded-lg border border-red-200">
        <IconAlertCircle :size="12" class="flex-shrink-0" />
        {{ errorMsg }}
      </p>
    </div>


    <!-- ── Grille scrollable ── -->
    <div class="flex-1 min-h-0 overflow-auto max-w-7xl">
      <table class="border-collapse text-sm" style="min-width: max-content; width: 100%;">

        <!-- En-tête colonnes -->
        <thead class="sticky top-0 z-10">
        <tr class="bg-gray-50 border-b border-gray-200">
          <th class="sticky left-0 z-20 bg-gray-50 text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-[210px] min-w-[210px]">
            Employé
          </th>
          <th
              v-for="day in calendarDays"
              :key="day.iso"
              class="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide w-[96px] min-w-[96px]"
              :class="
                  day.isToday   ? 'bg-blue-50 text-[#004aad]' :
                  day.isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
                "
          >
            <div>{{ day.dayLabel }}</div>
            <div class="font-normal text-[10px] mt-0.5 opacity-70">{{ day.dayNum }}/{{ day.monthNum }}</div>
          </th>
        </tr>
        </thead>

        <!-- Corps -->
        <tbody>
        <tr
            v-for="item in visibleItems"
            :key="item.guid"
            class="border-b border-gray-100 hover:bg-gray-50/60 transition"
        >
          <!-- Colonne employé sticky -->
          <td class="sticky left-0 z-[5] bg-white border-r border-gray-100 px-4 py-2 w-[210px] min-w-[210px]">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-[#004aad]/10 text-[#004aad] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {{ initials(item.user.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-800 truncate">{{ item.user.name }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ item.user.employee_code ?? '—' }}</p>
              </div>
              <!-- Bouton retirer de la suggestion -->
              <button
                  @click.stop="removeItem(item)"
                  :disabled="removingItemGuid === item.guid"
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0 disabled:opacity-50"
                  title="Retirer de la suggestion"
              >
                <IconLoader2 v-if="removingItemGuid === item.guid" :size="11" class="animate-spin text-red-400" />
                <IconTrash   v-else :size="12" />
              </button>
            </div>
          </td>

          <!-- Cellules par jour -->
          <td
              v-for="day in calendarDays"
              :key="day.iso"
              class="px-1.5 py-1.5 align-middle w-[96px] min-w-[96px]"
              :class="day.isWeekend ? 'bg-gray-50/60' : ''"
          >
            <SuggestionCell
                :template-guid="item.schedule[day.iso] ?? null"
                :reason="item.reasons[day.iso] ?? null"
                :templates="availableTemplates"
                :loading="patchLoading === `${item.guid}-${day.iso}`"
                :is-manual="manualCells.has(`${item.guid}-${day.iso}`)"
                @open-modal="openCellModal(item, day.iso, `${day.dayLabel} ${day.dayNum}/${day.monthNum}`)"
            />
          </td>
        </tr>

        <tr v-if="!visibleItems.length">
          <td :colspan="calendarDays.length + 1" class="px-6 py-12 text-center text-sm text-gray-400 italic">
            Aucun employé dans cette suggestion.
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Modal édition cellule ── -->
    <SuggestionCellModal
        v-model="modalOpen"
        :employee-name="modalItem?.user.name ?? ''"
        :day-label="modalDayLabel"
        :template-guid="modalItem && modalIso ? (modalItem.schedule[modalIso] ?? null) : null"
        :reason="modalItem && modalIso ? (modalItem.reasons[modalIso] ?? null) : null"
        :templates="availableTemplates"
        :saving="modalSaving"
        @confirm="onModalConfirm"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconSparkles, IconUsers, IconRefresh, IconX, IconInfoCircle,
  IconLoader2, IconThumbDown, IconCheck, IconTrash, IconAlertCircle,
  IconHistory
} from '@tabler/icons-vue'

import SuggestionCell      from './suggestionCell.vue'
import SuggestionCellModal from './suggestionCellModal.vue'
import type { CellModalPayload } from './suggestionCellModal.vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import type { ISuggestion, ISuggestionItem } from '@/service/ScheduleSuggestionService'
import type { AvailableTemplate } from './suggestionCellModal.vue'
import SessionTemplateService from "@/service/SessionTemplate";

// ── Props & Emits ──────────────────────────────────────────────────────────

const props = defineProps<{
  suggestion:         ISuggestion
  availableTemplates: AvailableTemplate[]
}>()

const emit = defineEmits<{
  (e: 'close'):                               void
  (e: 'approved'):                            void
  (e: 'rejected'):                            void
  (e: 'regenerate'):                          void
  (e: 'item-patched', item: ISuggestionItem): void
}>()

const DAY_FR_PREVIEW: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu',
  Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const JS_DAY_TO_KEY_PREVIEW: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
}

const calendarDays = computed(() => {
  const days: {
    iso: string; dayLabel: string; dayNum: string; monthNum: string
    isWeekend: boolean; isToday: boolean
  }[] = []
  const cursor   = new Date(props.suggestion.period_from + 'T00:00:00')
  const end      = new Date(props.suggestion.period_to   + 'T00:00:00')
  const todayIso = new Date().toISOString().split('T')[0]

  while (cursor <= end) {
    const iso   = cursor.toISOString().split('T')[0]
    const jsDay = cursor.getDay()
    const key   = JS_DAY_TO_KEY_PREVIEW[jsDay]
    days.push({
      iso,
      dayLabel:  DAY_FR_PREVIEW[key] ?? key,
      dayNum:    String(cursor.getDate()).padStart(2, '0'),
      monthNum:  String(cursor.getMonth() + 1).padStart(2, '0'),
      isWeekend: jsDay === 0 || jsDay === 6,
      isToday:   iso === todayIso,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

// ── State ──────────────────────────────────────────────────────────────────

const actionLoading    = ref<'approve' | 'reject' | 'regenerate' | null>(null)
const patchLoading     = ref<string | null>(null)
const removedItemGuids = ref<Set<string>>(new Set())

// Modal
const modalOpen     = ref(false)
const modalItem     = ref<ISuggestionItem | null>(null)
const modalIso      = ref<string>('')
const modalDayLabel = ref<string>('')
const modalSaving   = ref(false)

const errorMsg = ref<string | null>(null)
const removingItemGuid = ref<string | null>(null)
const manualCells = ref<Set<string>>(new Set())

function extractError(error: any): string {
  const raw = error?.message ?? ''
  return raw.includes(' - ') ? raw.split(' - ').slice(1).join(' - ') : (raw || 'Une erreur est survenue.')
}


// ── Computed ───────────────────────────────────────────────────────────────

const visibleItems = computed(() =>
    (props.suggestion.items ?? []).filter((i) => !removedItemGuids.value.has(i.guid))
)

const periodLabel = computed(() => {
  const fmt = (s: string) =>
      new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(props.suggestion.period_from)} → ${fmt(props.suggestion.period_to)}`
})

const scoreColor = computed(() => {
  const s = props.suggestion.conformity_score ?? 0
  if (s >= 80) return 'bg-green-400'
  if (s >= 60) return 'bg-amber-400'
  return 'bg-red-400'
})

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── Gestion suppression employé (locale) ──────────────────────────────────

async function removeItem(item: ISuggestionItem) {
  if (removingItemGuid.value) return   // un retrait déjà en cours
  removingItemGuid.value = item.guid
  errorMsg.value         = null
  try {
    await ScheduleSuggestionService.deleteItem(props.suggestion.guid, item.guid)
    // Succès → retrait local
    removedItemGuids.value = new Set([...removedItemGuids.value, item.guid])
  } catch (error: any) {
    errorMsg.value = extractError(error)
  } finally {
    removingItemGuid.value = null
  }
}

// ── Gestion modal cellule ─────────────────────────────────────────────────

function openCellModal(item: ISuggestionItem, iso: string, dayLabel: string) {
  modalItem.value     = item
  modalIso.value      = iso
  modalDayLabel.value = dayLabel
  modalOpen.value     = true
}

async function onModalConfirm(payload: CellModalPayload) {
  if (!modalItem.value || !modalIso.value) return
  modalSaving.value = true
  errorMsg.value    = null
  try {
    const res = await ScheduleSuggestionService.patchItem(
        props.suggestion.guid,
        modalItem.value.guid,
        { iso: modalIso.value, template_guid: payload.templateGuid },
    )
    if (res?.data?.item) {
      emit('item-patched', res.data.item as ISuggestionItem)
      // Marquer la cellule comme modifiée manuellement
      const cellKey = `${modalItem.value.guid}-${modalIso.value}`
      manualCells.value = new Set([...manualCells.value, cellKey])
    }
    modalOpen.value = false
  } catch (error: any) {
    errorMsg.value = extractError(error)
    // Le modal reste ouvert — le manager voit l'erreur et peut réessayer
  } finally {
    modalSaving.value = false
  }
}

// ── Actions principales ────────────────────────────────────────────────────

async function handleApprove() {
  actionLoading.value = 'approve'
  errorMsg.value      = null
  try {
    const res = await ScheduleSuggestionService.approve(props.suggestion.guid)
    emit('approved')
  } catch (error: any) {
    errorMsg.value = extractError(error)
  } finally { actionLoading.value = null }
}

async function handleReject() {
  actionLoading.value = 'reject'
  errorMsg.value      = null
  try {
    await ScheduleSuggestionService.reject(props.suggestion.guid)
    emit('rejected')
  } catch (error: any) {
    errorMsg.value = extractError(error)
  } finally { actionLoading.value = null }
}
</script>