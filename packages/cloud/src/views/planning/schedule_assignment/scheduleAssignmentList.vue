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
  <div class="mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-hidden bg-slate-50 px-4 pb-5 sm:px-6 lg:px-8">

    <!-- ── En-tête ── -->
    <div class="py-5 flex-shrink-0">
      <div class="flex flex-col items-start gap-4 xl:flex-row xl:justify-between">
        <div>
          <div class="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5 font-medium">
            <IconCalendarStats :size="11"/>
            <span>Planning & Rotations</span>
            <IconChevronRight :size="11"/>
            <span class="text-slate-800">Planning standard</span>
          </div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Planning standard</h1>
          <p class="text-slate-400 text-sm mt-0.5">Visualisez le planning par blocs horaires sur la période
            sélectionnée.</p>
        </div>
        <div class="flex w-full min-w-0 flex-wrap items-center gap-2 lg:gap-5 xl:flex-1 xl:justify-end">
          <div class="relative" ref="exportDropdownRef">
            <button @click="exportDropdownOpen = !exportDropdownOpen"
                    class="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition">
              <IconUpload :size="14"/>
              Exporter
              <IconChevronDown :size="13" class="text-slate-400"/>
            </button>
            <Transition name="dropdown">
              <div v-if="exportDropdownOpen"
                   class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <button @click="handleExportCSV" :disabled="!canExport || exportLoading === 'csv'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFileText :size="15" class="text-green-500"/>
                  <span>Exporter CSV</span>
                  <IconLoader2 v-if="exportLoading === 'csv'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
                <button @click="handleExportPDF" :disabled="!canExport || exportLoading === 'pdf'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFile :size="15" class="text-red-500"/>
                  <span>Aperçu PDF</span>
                  <IconLoader2 v-if="exportLoading === 'pdf'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Export simplifié : format mural inspiré du planning manuel du client -->
          <div class="relative" ref="simpleExportDropdownRef">
            <button @click="simpleExportDropdownOpen = !simpleExportDropdownOpen"
                    class="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition">
              <IconFileText :size="14"/>
              Export simplifié
              <IconChevronDown :size="13" class="text-emerald-500"/>
            </button>
            <Transition name="dropdown">
              <div v-if="simpleExportDropdownOpen"
                   class="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <button @click="handleSimpleExportPDF" :disabled="!canExport || simpleExportLoading === 'pdf'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFile :size="15" class="text-red-500"/>
                  <span>PDF pour affichage</span>
                  <IconLoader2 v-if="simpleExportLoading === 'pdf'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
                <button @click="handleSimpleExportExcel" :disabled="!canExport || simpleExportLoading === 'excel'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconTable :size="15" class="text-blue-500"/>
                  <span>Excel simplifié</span>
                  <IconLoader2 v-if="simpleExportLoading === 'excel'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
                <button @click="handleSimpleExportCSV" :disabled="!canExport || simpleExportLoading === 'csv'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <IconFileText :size="15" class="text-green-500"/>
                  <span>CSV simplifié</span>
                  <IconLoader2 v-if="simpleExportLoading === 'csv'" :size="12" class="ml-auto animate-spin text-slate-400"/>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Planning optimisé : choix explicite de la stratégie de couleur du PDF -->
          <div class="flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-indigo-200 bg-white sm:w-auto sm:flex-row">
            <label class="sr-only" for="optimized-pdf-mode">Type de PDF optimisé</label>
            <select
                id="optimized-pdf-mode"
                v-model="optimizedPdfMode"
                :disabled="optimizedExportLoading"
                @focus="showOptimizedPreview"
                @change="showOptimizedPreview"
                class="w-full min-w-0 sm:w-auto sm:min-w-[180px] bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none border-r border-indigo-100 disabled:opacity-50"
                title="Choisir le mode de visualisation et d'export du planning optimisé"
            >
              <option value="personalized">PDF personnalisé</option>
              <option value="generalized">PDF généralisé · services</option>
            </select>

            <label class="sr-only" for="optimized-months-per-page">Nombre de mois par page</label>
            <select
                id="optimized-months-per-page"
                v-model.number="optimizedMonthsPerPage"
                :disabled="optimizedExportLoading"
                @focus="showOptimizedPreview"
                @change="showOptimizedPreview"
                class="w-full min-w-0 sm:w-auto sm:min-w-[125px] bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none border-r border-indigo-100 disabled:opacity-50"
                title="Choisir le nombre de calendriers mensuels par page optimisée"
            >
              <option :value="1">1 mois / page</option>
              <option :value="2">2 mois / page</option>
              <option :value="3">3 mois / page</option>
              <option :value="4">4 mois / page</option>
              <option :value="6">6 mois / page</option>
            </select>

            <button
                @click="handleOptimizedExportPDF"
                :disabled="!canExport || optimizedExportLoading"
                class="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                :title="optimizedPdfMode === 'personalized'
                  ? 'Les couleurs représentent les employés'
                  : 'Les couleurs représentent les services'"
            >
              <IconLoader2 v-if="optimizedExportLoading" :size="14" class="animate-spin"/>
              <IconCalendarStats v-else :size="14"/>
              Générer PDF
            </button>
          </div>

          <button @click="handleExportExcel" :disabled="!canExport || exportLoading === 'excel'"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <IconLoader2 v-if="exportLoading === 'excel'" :size="14" class="animate-spin"/>
            <IconTable v-else :size="14"/>
            Générer Excel
          </button>

          <button @click="openPlanningSuggestionModule"
                  class="flex items-center gap-2 px-4 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition">
            <IconSparkles :size="15"/>
            Planification assistée
          </button>

          <button @click="openCreate"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition">
            <IconPlus :size="15"/>
            Nouvelle affectation
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">

      <!-- ── Barre de filtres ── -->
      <div class="bg-white border border-slate-100 px-2 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Type</span>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button @click="setTargetType('user')"
                    class="px-3 py-1.5 text-xs font-semibold transition"
                    :class="filterType === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Employé
            </button>
            <button @click="setTargetType('group')"
                    class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                    :class="filterType === 'group' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Groupe
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1 min-w-[220px]">
        <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">
          {{ filterType === 'group' ? 'Groupe' : 'Employé' }}
        </span>
          <div class="relative">
            <IconUsers v-if="filterType === 'group'" :size="13"
                       class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <IconUser v-else :size="13"
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <select v-model="selectedTargetGuid"
                    class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition cursor-pointer">
              <option value="">{{ filterType === 'group' ? 'Tous les groupes' : 'Tous les employés' }}</option>
              <option v-for="t in availableTargets" :key="t.guid" :value="t.guid">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Période</span>
          <div class="flex items-center gap-1.5">
            <input
                type="date"
                v-model="draftPeriodFrom"
                class="filter-input text-xs py-1.5 cursor-pointer"
            />
            <IconArrowRight :size="12" class="text-slate-300 flex-shrink-0"/>
            <input
                type="date"
                v-model="draftPeriodTo"
                :min="draftPeriodFrom"
                class="filter-input text-xs py-1.5 cursor-pointer"
            />
            <button
                type="button"
                @click="applyPeriod"
                :disabled="!canApplyPeriod || loading"
                class="ml-1 flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                :title="periodValidationError || (hasPendingPeriodChange ? 'Appliquer la période sélectionnée' : 'Période déjà appliquée')"
            >
              <IconLoader2 v-if="loading" :size="12" class="animate-spin"/>
              <IconSearch v-else :size="12"/>
              Rechercher
            </button>
          </div>
          <p v-if="periodValidationError" class="text-[10px] font-medium text-red-500">
            {{ periodValidationError }}
          </p>
          <p v-else-if="hasPendingPeriodChange" class="text-[10px] font-medium text-blue-500">
            Période modifiée — cliquez sur Rechercher pour l'appliquer.
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Affichage</span>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
                @click="displayMode = 'detailed'"
                class="px-3 py-1.5 text-xs font-semibold transition"
                :class="displayMode === 'detailed' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Détaillé</button>
            <button
                @click="displayMode = 'simple'"
                class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                :class="displayMode === 'simple' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Simplifié</button>
            <button
                @click="displayMode = 'optimized'"
                class="px-3 py-1.5 text-xs font-semibold transition border-l border-slate-200"
                :class="displayMode === 'optimized' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
            >Optimisé</button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Période rapide</span>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button @click="setPeriodRange('week')"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 transition">
              Semaine
            </button>
            <button @click="setPeriodRange('month')"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 transition border-l border-slate-200">
              Mois
            </button>
            <button v-if="displayMode === 'optimized'" @click="setPeriodRange('sixMonths')"
                    class="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition border-l border-slate-200">
              6 mois
            </button>
          </div>
        </div>

        <!-- La limite d'employés concerne uniquement la grille détaillée. -->
        <div v-if="displayMode === 'detailed'" class="flex flex-col gap-1">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-wide">Afficher</span>
          <select v-model="employeesPerPage"
                  class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 transition cursor-pointer">
            <option :value="10">10 employés</option>
            <option :value="15">15 employés</option>
            <option :value="25">25 employés</option>
            <option :value="50">50 employés</option>
          </select>
        </div>

        <div class="flex-1"/>

        <button @click="advancedFiltersOpen = !advancedFiltersOpen"
                class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                :class="advancedFiltersOpen ? 'bg-slate-50 border-blue-300 text-blue-600' : ''">
          <IconFilter :size="12"/>
          Filtres avancés
        </button>
      </div>

      <!-- ── Filtres avancés ── -->
      <Transition name="slide-down">
        <div v-if="advancedFiltersOpen"
             class="bg-white border border-slate-100 px-2 py-3 flex items-center gap-3 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-medium">Statut :</span>
            <select v-model="filterStatus" class="filter-input text-xs py-1.5 cursor-pointer">
              <option value="">Tous</option>
              <option value="active">Actif uniquement</option>
              <option value="inactive">Inactif uniquement</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-medium">Recherche :</span>
            <div class="relative">
              <IconSearch :size="12"
                          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input v-model="searchQuery" type="text" placeholder="Nom, code..."
                     class="filter-input !pl-7 text-base py-1.5 w-44"/>
            </div>
          </div>
          <button @click="resetFilters" class="text-xs text-blue-500 hover:text-blue-600 font-semibold transition ml-2">
            Réinitialiser
          </button>
        </div>
      </Transition>

      <!-- ── Contenu principal ── -->
      <div class="flex-1 overflow-y-auto py-6">

        <!--
          IMPORTANT : une seule branche de rendu à la fois.
          L'ancien template permettait au loader ET à la vue active d'être visibles simultanément.
        -->
        <PlanningLoadingState
            v-if="loading"
            :mode="displayMode"
            :refreshing="hasLoadedOnce"
        />

        <template v-else>
          <div
              v-if="unresolvedTemplateGuids.length > 0"
              class="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
          >
            <IconAlertTriangle :size="18" class="mt-0.5 flex-shrink-0 text-amber-500"/>
            <div>
              <p class="text-sm font-bold">Certains modèles horaires sont introuvables</p>
              <p class="mt-0.5 text-xs text-amber-700">
                Les affectations existent, mais {{ unresolvedTemplateGuids.length }} modèle(s) ne peuvent pas être résolus :
                {{ unresolvedTemplateGuids.join(', ') }}.
              </p>
            </div>
          </div>

          <div v-if="allFlatMembers.length === 0"
               class="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
            <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <IconAlertTriangle :size="28" class="text-amber-500"/>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-slate-600">Aucune affectation active</p>
              <p class="text-xs text-slate-400 mt-0.5">Aucun planning standard trouvé sur la période sélectionnée.</p>
            </div>
            <button @click="openCreate" class="text-xs font-semibold text-blue-500 hover:text-blue-600 transition">
              + Créer une affectation
            </button>
          </div>

          <component
              v-else
              :is="activePlanningView"
              v-bind="activeViewProps"
              @adjust="openDayAdjustment"
          />
        </template>
      </div>

      <!-- ── Modal désactivation ── -->
      <Teleport to="body">
        <div v-if="deactivateTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true"/>
          <div role="alertdialog" aria-modal="true" aria-labelledby="deactivate-schedule-assignment-title"
               class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <IconPower :size="18" class="text-amber-500"/>
              </div>
              <div>
                <p id="deactivate-schedule-assignment-title" class="text-slate-800 font-bold text-sm">Désactiver
                  l'affectation</p>
                <p class="text-slate-400 text-xs mt-0.5">L'affectation sera marquée inactive</p>
              </div>
            </div>
            <p class="text-slate-600 text-sm mb-5">
              Désactiver l'affectation de
              <span class="font-semibold text-slate-800">{{ getTargetName(deactivateTarget) }}</span> ?
            </p>
            <div class="flex gap-2">
              <button type="button" @click="deactivateTarget = null" :disabled="actionLoading"
                      class="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50">
                Annuler
              </button>
              <button @click="doDeactivate" :disabled="actionLoading"
                      class="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition disabled:opacity-60">
                {{ actionLoading ? '...' : 'Désactiver' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <ScheduleDayAdjustmentModal
          v-if="adjustmentTarget && userStore.user?.guid"
          :employee="adjustmentTarget.member"
          :date="adjustmentTarget.date"
          :manager-guid="userStore.user.guid"
          @close="adjustmentTarget = null"
          @saved="onDayAdjustmentSaved"
      />

      <ScheduleAssignmentForm
          v-if="showForm"
          :assignment="editTarget"
          @close="showForm = false"
          @saved="onSaved"
      />

    </div>
  </div>

</template>
<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useRouter} from 'vue-router'
import {
  IconCalendarStats, IconChevronRight, IconPlus, IconLoader2,
  IconUser, IconUsers, IconFilter, IconSearch, IconArrowRight,
  IconPower, IconAlertTriangle, IconSparkles,
  IconUpload, IconChevronDown, IconTable,
  IconFile, IconFileText, IconArrowLeft,
} from '@tabler/icons-vue'

import ScheduleAssignmentService from '@/service/ScheduleAssignment'
import SessionTemplateService from '@/service/SessionTemplate'
import ScheduleAssignmentForm from './scheduleAssignmentForm.vue'
import ScheduleDayAdjustmentModal from './components/ScheduleDayAdjustmentModal.vue'
import ScheduleDetailedView from './components/views/ScheduleDetailedView.vue'
import ScheduleSimpleView from './components/views/ScheduleSimpleView.vue'
import ScheduleOptimizedView from './components/views/ScheduleOptimizedView.vue'
import PlanningLoadingState from './components/states/PlanningLoadingState.vue'
import type {
  PlanningDisplayMode,
  ScheduleDayAdjustmentTarget,
  SchedulePlanningMember,
  SchedulePlanningSlot,
} from './components/views/schedulePlanningView.types'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import {
  getTargetName,
  hasTemplateDefinition,
  isGroupAssignment,
  isGuardContinuationAssignment,
  isManualOverrideAssignment,
  isPlannedRestAssignment,
  isUserAssignment,
  resolveFullTemplate,
} from './type'
import type {
  IScheduleAssignment,
  ISessionTemplateInline,
} from './type'
import {useUserStore} from '@/stores/userStore'
import {useTeamStore} from '@/stores/teamStore'
import {normalizeEmployeeColor} from '@/utils/employeeColor'
import {exportScheduleCSV, exportScheduleExcel} from '@/utils/exports/scheduleAssignment.export'
import {exportSchedulePDF} from "@/utils/exports/exportSchedulePDF";
import {
  exportScheduleSimpleCSV,
  exportScheduleSimpleExcel,
} from '@/utils/exports/scheduleAssignment.simple.export'
import {exportScheduleSimplePDF} from '@/utils/exports/exportScheduleSimplePDF'
import {exportScheduleOptimizedPDF} from '@/utils/exports/exportScheduleOptimizedPDF'
import type {
  OptimizedMonthsPerPage,
  OptimizedPdfMode,
} from '@/utils/exports/scheduleAssignment.optimized.export'

const userStore = useUserStore()
const teamStore = useTeamStore()
const router = useRouter()

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim',
}
const JS_DAY_TO_KEY: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}

// ── State ──────────────────────────────────────────────────────────────────
const allAssignments = ref<IScheduleAssignment[]>([])
const sessionTemplates = ref<ISessionTemplateInline[]>([])
const loading = ref(false)
const hasLoadedOnce = ref(false)
let loadRequestSequence = 0

const filterType = ref<'user' | 'group'>('user')
const selectedTargetGuid = ref('')
const displayMode = ref<PlanningDisplayMode>('detailed')
const advancedFiltersOpen = ref(false)
const filterStatus = ref('active')
const searchQuery = ref('')
const exportDropdownOpen = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)
const exportLoading = ref<'pdf' | 'excel' | 'csv' | null>(null)
const simpleExportDropdownOpen = ref(false)
const simpleExportDropdownRef = ref<HTMLElement | null>(null)
const simpleExportLoading = ref<'pdf' | 'excel' | 'csv' | null>(null)
const optimizedExportLoading = ref(false)
const optimizedPdfMode = ref<OptimizedPdfMode>('personalized')
const optimizedMonthsPerPage = ref<OptimizedMonthsPerPage>(6)
const employeesPerPage = ref<number>(10)

const today = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)

// Période appliquée : seule source utilisée par la grille et les appels API.
const periodFrom = ref(monday.toISOString().split('T')[0])
const periodTo = ref(sunday.toISOString().split('T')[0])

// Période en cours de saisie : modifier ces valeurs ne déclenche aucun appel API.
const draftPeriodFrom = ref(periodFrom.value)
const draftPeriodTo = ref(periodTo.value)

const hasPendingPeriodChange = computed(
    () =>
        draftPeriodFrom.value !== periodFrom.value
        || draftPeriodTo.value !== periodTo.value,
)

const periodValidationError = computed(() => {
  if (!draftPeriodFrom.value || !draftPeriodTo.value) {
    return 'Sélectionnez une date de début et une date de fin.'
  }
  if (draftPeriodFrom.value > draftPeriodTo.value) {
    return 'La date de fin doit être postérieure ou égale à la date de début.'
  }
  return ''
})

const canApplyPeriod = computed(
    () => hasPendingPeriodChange.value && !periodValidationError.value,
)

const showForm = ref(false)
const editTarget = ref<IScheduleAssignment | null>(null)
const deactivateTarget = ref<IScheduleAssignment | null>(null)
const adjustmentTarget = ref<ScheduleDayAdjustmentTarget | null>(null)
const actionLoading = ref(false)

const modalOpen = computed(() =>
    Boolean(deactivateTarget.value || adjustmentTarget.value),
)
useBodyScrollLock(modalOpen)

const templatesByGuid = computed<ReadonlyMap<string, ISessionTemplateInline>>(
    () => new Map(
        sessionTemplates.value.map((template) => [template.guid, template]),
    ),
)

// ── Computed : jours calendrier ────────────────────────────────────────────
const calendarDays = computed(() => {
  const days: {
    iso: string; dayLabel: string; dayNum: string; monthNum: string
    isWeekend: boolean; isToday: boolean; jsDay: number
  }[] = []
  const cursor = new Date(periodFrom.value)
  const end = new Date(periodTo.value)
  const todayIso = new Date().toISOString().split('T')[0]
  while (cursor <= end) {
    const iso = cursor.toISOString().split('T')[0]
    const jsDay = cursor.getDay()
    days.push({
      iso,
      dayLabel: DAY_FR[JS_DAY_TO_KEY[jsDay]] ?? '',
      dayNum: String(cursor.getDate()).padStart(2, '0'),
      monthNum: String(cursor.getMonth() + 1).padStart(2, '0'),
      isWeekend: jsDay === 0 || jsDay === 6,
      isToday: iso === todayIso,
      jsDay,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

// ── Cibles disponibles ─────────────────────────────────────────────────────
function isInActivePeriod(a: IScheduleAssignment): boolean {
  return a.start_date <= periodTo.value
      && (a.end_date === null || a.end_date >= periodFrom.value)
}

const availableTargets = computed(() => {
  // Mode Employé : tous les individus — directs (family:'user') ET membres de groupes (family:'group')
  if (filterType.value === 'user') {
    const map = new Map<string, string>()
    for (const a of allAssignments.value) {
      if (!isInActivePeriod(a)) continue
      if (isUserAssignment(a)) {
        if (!map.has(a.related.guid))
          map.set(a.related.guid, `${a.related.first_name} ${a.related.last_name}`.trim())
      } else if (isGroupAssignment(a)) {
        for (const m of a.related.members.items) {
          if (!map.has(m.user.guid))
            map.set(m.user.guid, `${m.user.first_name} ${m.user.last_name}`.trim())
        }
      }
    }
    return Array.from(map.entries())
        .map(([guid, name]) => ({guid, name}))
        .filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  // Mode Groupe : les groupes + entrée virtuelle "Sans groupe" pour les assignments user
  const groups = new Map<string, string>()  // guid → name
  let hasDirect = false

  for (const a of allAssignments.value) {
    if (!isInActivePeriod(a)) continue
    if (isGroupAssignment(a)) {
      if (!groups.has(a.related.guid)) groups.set(a.related.guid, a.related.name)
    } else if (isUserAssignment(a)) {
      hasDirect = true
    }
  }

  const result = Array.from(groups.entries())
      .map(([guid, name]) => ({guid, name}))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  if (hasDirect) result.push({guid: '__no_group__', name: 'Sans groupe'})

  return result.filter((t) => !searchQuery.value || t.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// ── Affectations filtrées ──────────────────────────────────────────────────
const filteredAssignments = computed(() => {
  return allAssignments.value.filter((a) => {
    // Filtre statut actif/inactif
    if (filterStatus.value === 'active' && !a.active) return false
    if (filterStatus.value === 'inactive' && a.active) return false

    // Filtre période
    if (!isInActivePeriod(a)) return false

    // Mode EMPLOYÉ — filtre individuel optionnel
    if (filterType.value === 'user') {
      if (!selectedTargetGuid.value) return true  // tout le monde
      // Chercher le guid dans les assignments directs OU dans les membres d'un groupe
      if (isUserAssignment(a)) {
        return a.related.guid === selectedTargetGuid.value
      }
      if (isGroupAssignment(a)) {
        return a.related.members.items.some(m => m.user.guid === selectedTargetGuid.value)
      }
      return false
    }

    // Mode GROUPE — filtre par groupe ou "Sans groupe"
    if (!selectedTargetGuid.value) return true  // tous groupes + directs
    if (selectedTargetGuid.value === '__no_group__') return isUserAssignment(a)
    return isGroupAssignment(a) && a.related.guid === selectedTargetGuid.value
  })
})

const unresolvedTemplateGuids = computed(() => {
  const guids = new Set<string>()

  for (const assignment of filteredAssignments.value) {
    if (isPlannedRestAssignment(assignment)) continue
    if (resolveFullTemplate(assignment, templatesByGuid.value)) continue
    guids.add(assignment.session_template.guid)
  }

  return Array.from(guids).sort()
})

// ── Membres plats et résolution par date ──────────────────────────────────
type ScheduleSlot = SchedulePlanningSlot
type FlatMember = SchedulePlanningMember

interface MemberAccumulator {
  guid: string
  name: string
  firstName: string
  lastName: string
  code: string
  employeeColor: string | null
  groupName: string | null
  directAssignments: IScheduleAssignment[]
  groupAssignments: IScheduleAssignment[]
}

function assignmentCoversIso(assignment: IScheduleAssignment, iso: string): boolean {
  return assignment.start_date <= iso && (assignment.end_date === null || assignment.end_date >= iso)
}

function dayKeyFromIso(iso: string): string {
  return JS_DAY_TO_KEY[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]
}

function assignmentSlotsForIso(
    assignment: IScheduleAssignment,
    iso: string,
): ScheduleSlot[] {
  // Un repos publié est une affectation volontaire sans bloc horaire.
  if (isPlannedRestAssignment(assignment)) return []

  const template = resolveFullTemplate(
      assignment,
      templatesByGuid.value,
  )
  if (!template) return []

  const key = dayKeyFromIso(iso) as keyof typeof template.definition
  const blocks = template.definition[key]
  if (!Array.isArray(blocks)) return []

  return blocks.map((block) => ({
    work: [block.work[0], block.work[1]],
    pause: block.pause ? [block.pause[0], block.pause[1]] : undefined,
  }))
}

function newestApplicableAssignment(
    assignments: IScheduleAssignment[],
    iso: string,
): IScheduleAssignment | null {
  return assignments
      .filter((assignment) => assignmentCoversIso(assignment, iso))
      .sort((a, b) => {
        const manualDelta =
            Number(isManualOverrideAssignment(b))
            - Number(isManualOverrideAssignment(a))
        if (manualDelta !== 0) return manualDelta

        return (
            b.start_date.localeCompare(a.start_date)
            || b.guid.localeCompare(a.guid)
        )
      })[0] ?? null
}

function normalizedSlotTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : value
}

function slotMinutes(value: string): number {
  const [hour = 0, minute = 0] = normalizedSlotTime(value).split(':').map(Number)
  return hour * 60 + minute
}

function isTechnicalGuardContinuation(
    assignment: IScheduleAssignment,
    iso: string,
): boolean {
  if (isGuardContinuationAssignment(assignment)) return true

  const slots = assignmentSlotsForIso(assignment, iso)
  if (!slots.length) return false

  return slots.every((slot) =>
      normalizedSlotTime(slot.work[0]) === '00:00'
      && slotMinutes(slot.work[1]) <= 12 * 60,
  )
}

function slotsStartGuard(slots: ScheduleSlot[]): boolean {
  return slots.some((slot) =>
      slotMinutes(slot.work[0]) >= 12 * 60
      && slotMinutes(slot.work[1]) >= 23 * 60 + 50,
  )
}

function manualBaseOverrideForDate(
    assignments: IScheduleAssignment[],
    iso: string,
): IScheduleAssignment | null {
  return newestApplicableAssignment(
      assignments.filter((assignment) =>
          isManualOverrideAssignment(assignment)
          && !isGuardContinuationAssignment(assignment)
          && (assignment.adjustment?.service_date ?? assignment.start_date) === iso,
      ),
      iso,
  )
}

function baseAssignmentForDate(
    member: MemberAccumulator,
    iso: string,
): {
  winner: IScheduleAssignment | null
  manualOverride: IScheduleAssignment | null
} {
  const manualOverride = manualBaseOverrideForDate(member.directAssignments, iso)
  if (manualOverride) {
    return {winner: manualOverride, manualOverride}
  }

  const direct = newestApplicableAssignment(
      member.directAssignments.filter((assignment) =>
          !isManualOverrideAssignment(assignment)
          && !isTechnicalGuardContinuation(assignment, iso),
      ),
      iso,
  )

  if (direct) return {winner: direct, manualOverride: null}

  const group = newestApplicableAssignment(
      member.groupAssignments.filter((assignment) =>
          !isTechnicalGuardContinuation(assignment, iso),
      ),
      iso,
  )

  return {winner: group, manualOverride: null}
}

function continuationAssignmentsForDate(
    member: MemberAccumulator,
    iso: string,
    previousEffectiveGuard: boolean,
    previousDayHadManualOverride: boolean,
): IScheduleAssignment[] {
  const manualContinuations = member.directAssignments.filter((assignment) =>
      assignmentCoversIso(assignment, iso)
      && isGuardContinuationAssignment(assignment),
  )

  // Un override du jour précédent remplace explicitement le service d'origine.
  // S'il ne s'agit plus d'une garde, la continuité technique historique ne doit
  // donc plus réapparaître.
  if (previousDayHadManualOverride) {
    return previousEffectiveGuard ? manualContinuations : []
  }

  if (!previousEffectiveGuard) return manualContinuations

  const technicalDirect = newestApplicableAssignment(
      member.directAssignments.filter((assignment) =>
          !isManualOverrideAssignment(assignment)
          && isTechnicalGuardContinuation(assignment, iso),
      ),
      iso,
  )

  const technicalGroup = technicalDirect
      ? null
      : newestApplicableAssignment(
          member.groupAssignments.filter((assignment) =>
              isTechnicalGuardContinuation(assignment, iso),
          ),
          iso,
      )

  return [
    ...manualContinuations,
    ...(technicalDirect ? [technicalDirect] : []),
    ...(technicalGroup ? [technicalGroup] : []),
  ]
}

function deduplicateSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  const seen = new Set<string>()

  return slots.filter((slot) => {
    const key = JSON.stringify({
      work: slot.work,
      pause: slot.pause ?? null,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function resolveEmployeeColor(
    guid: string,
    inlineColor?: string | null,
): string | null {
  return (
      normalizeEmployeeColor(inlineColor)
      ?? teamStore.getEmployeeById(guid)?.employeeColor
      ?? null
  )
}

const allFlatMembers = computed<FlatMember[]>(() => {
  const members = new Map<string, MemberAccumulator>()

  const ensureMember = (
      guid: string,
      name: string,
      firstName: string,
      lastName: string,
      code: string,
      employeeColor: string | null,
      groupName: string | null,
  ): MemberAccumulator => {
    const existing = members.get(guid)
    if (existing) {
      if (!existing.groupName && groupName) existing.groupName = groupName
      if (!existing.employeeColor && employeeColor) existing.employeeColor = employeeColor
      return existing
    }

    const created: MemberAccumulator = {
      guid,
      name,
      firstName,
      lastName,
      code,
      employeeColor,
      groupName,
      directAssignments: [],
      groupAssignments: [],
    }
    members.set(guid, created)
    return created
  }

  for (const assignment of filteredAssignments.value) {
    if (isUserAssignment(assignment)) {
      const member = ensureMember(
          assignment.related.guid,
          `${assignment.related.first_name} ${assignment.related.last_name}`.trim(),
          assignment.related.first_name ?? '',
          assignment.related.last_name ?? '',
          assignment.related.employee_code ?? '',
          resolveEmployeeColor(
              assignment.related.guid,
              assignment.related.employee_color,
          ),
          null,
      )
      member.directAssignments.push(assignment)
      continue
    }

    if (isGroupAssignment(assignment)) {
      for (const groupMember of assignment.related.members.items) {
        if (!groupMember.active) continue
        if (
            filterType.value === 'user'
            && selectedTargetGuid.value
            && groupMember.user.guid !== selectedTargetGuid.value
        ) continue

        const member = ensureMember(
            groupMember.user.guid,
            `${groupMember.user.first_name} ${groupMember.user.last_name}`.trim(),
            groupMember.user.first_name ?? '',
            groupMember.user.last_name ?? '',
            groupMember.user.employee_code ?? '',
            resolveEmployeeColor(
                groupMember.user.guid,
                groupMember.user.employee_color,
            ),
            assignment.related.name,
        )
        member.groupAssignments.push(assignment)
      }
    }
  }

  const result: FlatMember[] = []

  for (const member of members.values()) {
    const scheduleByDate: Record<string, ScheduleSlot[]> = {}
    const restByDate: Record<string, boolean> = {}
    const legacySchedule: Record<string, ScheduleSlot[]> = {}

    const previousIso = (() => {
      const previous = new Date(`${periodFrom.value}T00:00:00.000Z`)
      previous.setUTCDate(previous.getUTCDate() - 1)
      return previous.toISOString().slice(0, 10)
    })()

    const previousResolution = baseAssignmentForDate(member, previousIso)
    let previousEffectiveGuard = previousResolution.winner
        ? slotsStartGuard(assignmentSlotsForIso(previousResolution.winner, previousIso))
        : false
    let previousDayHadManualOverride = Boolean(previousResolution.manualOverride)

    for (const day of calendarDays.value) {
      const resolution = baseAssignmentForDate(member, day.iso)
      const baseWinner = resolution.winner
      const baseSlots = baseWinner
          ? assignmentSlotsForIso(baseWinner, day.iso)
          : []

      const continuationSlots = continuationAssignmentsForDate(
          member,
          day.iso,
          previousEffectiveGuard,
          previousDayHadManualOverride,
      ).flatMap((assignment) => assignmentSlotsForIso(assignment, day.iso))

      const slots = deduplicateSlots([
        ...continuationSlots,
        ...baseSlots,
      ])

      if (slots.length > 0 || baseWinner) {
        scheduleByDate[day.iso] = slots
      }

      restByDate[day.iso] = Boolean(
          baseWinner
          && isPlannedRestAssignment(baseWinner),
      )

      const key = dayKeyFromIso(day.iso)
      if (!(key in legacySchedule) && slots.length > 0) {
        legacySchedule[key] = slots
      }

      previousEffectiveGuard = slotsStartGuard(baseSlots)
      previousDayHadManualOverride = Boolean(resolution.manualOverride)
    }

    result.push({
      guid: member.guid,
      name: member.name,
      firstName: member.firstName,
      lastName: member.lastName,
      code: member.code,
      employeeColor: member.employeeColor,
      groupName: member.groupName,
      scheduleByDate,
      restByDate,
      schedule: legacySchedule,
    })
  }

  if (filterType.value === 'user') {
    return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  return result.sort((a, b) => {
    const groupA = a.groupName ?? '\uFFFF'
    const groupB = b.groupName ?? '\uFFFF'
    if (groupA !== groupB) return groupA.localeCompare(groupB, 'fr')
    return a.name.localeCompare(b.name, 'fr')
  })
})

// Membres affichés dans Semaine/Mois (limités)
const visibleMembers = computed(() => allFlatMembers.value.slice(0, employeesPerPage.value))
const hiddenCount = computed(() => Math.max(0, allFlatMembers.value.length - employeesPerPage.value))
const canExport = computed(() => allFlatMembers.value.length > 0)

/**
 * Le mode choisi dans le sélecteur est aussi le mode d'aperçu.
 * Aucun appel API : on ne fait que changer le composant/rendu local.
 */
function showOptimizedPreview(): void {
  displayMode.value = 'optimized'
}


function openDayAdjustment(target: ScheduleDayAdjustmentTarget): void {
  const todayIso = new Date().toISOString().slice(0, 10)
  if (target.date < todayIso) return

  adjustmentTarget.value = target
}

async function onDayAdjustmentSaved(): Promise<void> {
  adjustmentTarget.value = null
  await load()
}

const activePlanningView = computed(() => {
  switch (displayMode.value) {
    case 'simple': return ScheduleSimpleView
    case 'optimized': return ScheduleOptimizedView
    default: return ScheduleDetailedView
  }
})

const activeViewProps = computed(() => {
  if (displayMode.value === 'simple') {
    return {
      members: allFlatMembers.value,
      periodFrom: periodFrom.value,
      periodTo: periodTo.value,
    }
  }

  if (displayMode.value === 'optimized') {
    return {
      members: allFlatMembers.value,
      periodFrom: periodFrom.value,
      periodTo: periodTo.value,
      visualMode: optimizedPdfMode.value,
      monthsPerPage: optimizedMonthsPerPage.value,
    }
  }

  return {
    members: visibleMembers.value,
    days: calendarDays.value,
    hiddenCount: hiddenCount.value,
  }
})

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  if (!userStore.user?.guid) return

  // Seule la requête la plus récente a le droit de mettre à jour l'écran.
  // Cela évite qu'un changement rapide de période affiche une ancienne réponse.
  const requestId = ++loadRequestSequence
  loading.value = true

  try {
    // Les templates sont structurels et ne dépendent pas de la période.
    // On les charge au premier passage uniquement (ou on retente si le chargement
    // précédent n'a rien retourné). Les recherches suivantes ne rappellent donc
    // que l'endpoint des affectations.
    const shouldLoadTemplates = sessionTemplates.value.length === 0

    const teamPromise = teamStore
        .loadTeam(userStore.user.guid)
        .catch((error) => {
          console.warn('Couleurs employés indisponibles dans le planning', error)
          return []
        })

    const [assignmentResponse, templateResponse] = await Promise.all([
      ScheduleAssignmentService.list(userStore.user.guid, {
        limit: 200,
        date_from: periodFrom.value,
        date_to: periodTo.value,
      }),
      shouldLoadTemplates
          ? SessionTemplateService.list({
            active: true,
            current: true,
            limit: 250,
          })
          : Promise.resolve(null),
      teamPromise,
    ])

    if (requestId !== loadRequestSequence) return

    allAssignments.value = assignmentResponse?.success
        ? assignmentResponse.data?.schedule_assignments?.items ?? []
        : []

    if (templateResponse) {
      const rawTemplates = templateResponse?.success
          ? templateResponse.data?.templates?.items
          ?? templateResponse.data?.session_templates?.items
          ?? []
          : []

      sessionTemplates.value = rawTemplates.filter(hasTemplateDefinition)
    }
  } catch (error: unknown) {
    if (requestId !== loadRequestSequence) return

    console.error('Impossible de charger le planning standard', error)
    allAssignments.value = []
    sessionTemplates.value = []
  } finally {
    if (requestId === loadRequestSequence) {
      hasLoadedOnce.value = true
      loading.value = false
    }
  }
}

// ── Actions ────────────────────────────────────────────────────────────────
function setTargetType(type: 'user' | 'group') {
  filterType.value = type
  selectedTargetGuid.value = ''
}

function setPeriodRange(mode: 'week' | 'month' | 'sixMonths') {
  if (!draftPeriodFrom.value) return

  const from = new Date(`${draftPeriodFrom.value}T00:00:00`)
  const end = new Date(from)

  if (mode === 'week') {
    end.setDate(from.getDate() + 6)
  } else if (mode === 'month') {
    end.setMonth(from.getMonth() + 1, 0)
  } else {
    // De la date choisie jusqu'à la fin du 6e mois inclus.
    end.setMonth(from.getMonth() + 6, 0)
  }

  draftPeriodTo.value = [
    end.getFullYear(),
    String(end.getMonth() + 1).padStart(2, '0'),
    String(end.getDate()).padStart(2, '0'),
  ].join('-')
}

async function applyPeriod(): Promise<void> {
  if (!canApplyPeriod.value || loading.value) return

  periodFrom.value = draftPeriodFrom.value
  periodTo.value = draftPeriodTo.value

  await load()
}

function resetFilters() {
  filterStatus.value = 'active';
  searchQuery.value = ''
}

function openCreate() {
  editTarget.value = null;
  showForm.value = true
}

function openEdit(item: IScheduleAssignment) {
  editTarget.value = item;
  showForm.value = true
}

function confirmDeactivate(item: IScheduleAssignment) {
  deactivateTarget.value = item
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  try {
    actionLoading.value = true
    await ScheduleAssignmentService.deactivate(deactivateTarget.value.guid)
    deactivateTarget.value = null
    await load()
  } finally {
    actionLoading.value = false
  }
}

function onSaved() {
  showForm.value = false;
  load()
}

function simpleExportOptions() {
  return {
    members: allFlatMembers.value,
    periodFrom: periodFrom.value,
    periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  }
}

async function handleSimpleExportPDF() {
  if (!canExport.value) return
  simpleExportLoading.value = 'pdf'
  simpleExportDropdownOpen.value = false
  try {
    exportScheduleSimplePDF(simpleExportOptions())
  } finally {
    simpleExportLoading.value = null
  }
}

async function handleSimpleExportExcel() {
  if (!canExport.value) return
  simpleExportLoading.value = 'excel'
  simpleExportDropdownOpen.value = false
  try {
    exportScheduleSimpleExcel(simpleExportOptions())
  } finally {
    simpleExportLoading.value = null
  }
}

async function handleSimpleExportCSV() {
  if (!canExport.value) return
  simpleExportLoading.value = 'csv'
  simpleExportDropdownOpen.value = false
  try {
    exportScheduleSimpleCSV(simpleExportOptions())
  } finally {
    simpleExportLoading.value = null
  }
}

function optimizedExportOptions() {
  return {
    members: allFlatMembers.value,
    periodFrom: periodFrom.value,
    periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
    pdfMode: optimizedPdfMode.value,
    monthsPerPage: optimizedMonthsPerPage.value,
  }
}

async function handleOptimizedExportPDF() {
  if (!canExport.value) return
  optimizedExportLoading.value = true
  try {
    exportScheduleOptimizedPDF(optimizedExportOptions())
  } finally {
    optimizedExportLoading.value = false
  }
}

async function handleExportPDF() {
  if (!canExport.value) return
  exportLoading.value = 'pdf';
  exportDropdownOpen.value = false
  try {
    exportSchedulePDF({
      members: allFlatMembers.value,
      periodFrom: periodFrom.value,
      periodTo: periodTo.value,
      generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
      tenantName: userStore.tenant?.name,
    })
  } finally {
    exportLoading.value = null
  }
}

async function handleExportExcel() {
  exportScheduleExcel({
    members: allFlatMembers.value,
    periodFrom: periodFrom.value, periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

async function handleExportCSV() {
  exportScheduleCSV({
    members: allFlatMembers.value,
    periodFrom: periodFrom.value, periodTo: periodTo.value,
    generatedBy: `${userStore.user?.first_name} ${userStore.user?.last_name}`.trim(),
    tenantName: userStore.tenant?.name,
  })
}

function onDocumentClick(e: MouseEvent) {
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(e.target as Node)) {
    exportDropdownOpen.value = false
  }
  if (simpleExportDropdownRef.value && !simpleExportDropdownRef.value.contains(e.target as Node)) {
    simpleExportDropdownOpen.value = false
  }
}

function openPlanningSuggestionModule(): void {
  router.push({name: 'planning-suggestion-dashboard'})
}

onMounted(() => {
  load();
  document.addEventListener('click', onDocumentClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
<style scoped>
.filter-input {
  @apply px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700
  focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition;
}

.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 100px;
  overflow: hidden;
}

.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>