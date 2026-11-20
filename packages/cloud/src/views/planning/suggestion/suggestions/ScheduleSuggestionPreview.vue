<template>
  <div class="space-y-3">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <button class="secondary-button" @click="router.push({ name: 'planning-suggestion-list' })">
          <IconArrowLeft :size="15" /> Retour
        </button>
        <h1 class="mt-2 text-xl font-bold text-slate-900">
          {{ suggestion ? `Suggestion du ${formatDate(suggestion.period_from)} au ${formatDate(suggestion.period_to)}` : 'Suggestion de planning' }}
        </h1>
      </div>
      <div v-if="suggestion?.status === 'draft'" class="flex flex-wrap gap-2">
        <button class="secondary-button" :disabled="loading || actionLoading" @click="openBulkEditor">
          <IconEdit :size="15" /> Modifier en groupe
        </button>
        <button class="secondary-button" :disabled="loading || actionLoading" @click="confirmAction = 'regenerate'">
          <IconRefresh :size="15" /> Régénérer autour des décisions
        </button>
        <button class="secondary-button" :disabled="loading || actionLoading" @click="confirmAction = 'reject'">Rejeter</button>
        <button class="primary-button" :disabled="loading || actionLoading" @click="openPublication">Vérifier et publier</button>
      </div>
    </header>

    <p v-if="errorMessage" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{{ errorMessage }}</p>
    <p v-if="loading && !suggestion" role="status" class="p-4 text-sm text-slate-600">Chargement du planning…</p>

    <template v-if="suggestion">
      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
        <div v-if="alertSummary" class="inline-flex flex-wrap items-center gap-x-2 rounded-md px-2 py-1 font-semibold"
            :class="alertSummary.critical ? 'bg-red-50 text-red-800' : alertSummary.warnings ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'">
          <span>{{ alertSummary.label }}</span>
          <button v-if="alertSummary.critical || alertSummary.warnings" type="button" class="link-button py-1"
              aria-haspopup="dialog" @click="detailsPanel = 'alerts'">Voir les détails</button>
        </div>
        <button class="secondary-button" @click="detailsPanel = 'coverage'">
          Couverture<template v-if="suggestion.diagnostics?.coverageScore != null"> {{ ' ' + suggestion.diagnostics.coverageScore }} %</template>
        </button>
        <button class="secondary-button" @click="detailsPanel = 'context'">
          <template v-if="suggestion.diagnostics?.fairnessScore != null">Équité {{ suggestion.diagnostics.fairnessScore }} % · </template>Équipes de garde
        </button>
      </div>

      <section class="min-w-0 rounded-xl border border-slate-200 bg-white" aria-label="Planning hebdomadaire">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
          <div class="view-switch" role="group" aria-label="Vue du planning">
            <button type="button" :aria-pressed="viewMode === 'employees'" @click="viewMode = 'employees'">Collaborateurs</button>
            <button type="button" :aria-pressed="viewMode === 'services'" @click="viewMode = 'services'">Services</button>
          </div>
          <nav class="week-pagination" aria-label="Navigation par semaine">
            <button type="button" class="secondary-button" aria-label="Semaine précédente" :disabled="weekIndex === 0" @click="weekIndex--">
              <span aria-hidden="true">‹</span> Précédent
            </button>
            <p ref="weekHeading" tabindex="-1" aria-live="polite" class="text-center text-xs font-bold text-slate-800">
              Semaine {{ weekIndex + 1 }}/{{ weeks.length }}
              <span class="block font-medium text-slate-600">{{ visibleDays[0]?.dayMonth }} – {{ visibleDays.at(-1)?.dayMonth }}</span>
            </p>
            <button type="button" class="secondary-button" aria-label="Semaine suivante" :disabled="weekIndex >= weeks.length - 1" @click="weekIndex++">
              Suivant <span aria-hidden="true">›</span>
            </button>
          </nav>
        </div>

        <div class="border-b border-slate-200 px-3 py-2">
          <SuggestionFilters
              class="!border-0 !p-0"
              :search="employeeSearch" :manual-only="manualOnly" :guard-only="guardOnly" :unassigned-only="unassignedOnly"
              :manual-count="manualCellCount" :guard-count="guardCellCount" :unassigned-count="unassignedCellCount"
              @update:search="employeeSearch = $event" @update:manualOnly="manualOnly = $event"
              @update:guardOnly="guardOnly = $event" @update:unassignedOnly="unassignedOnly = $event"
              @reset="resetPlanningFilters"
          />
        </div>

        <div class="table-scroll">
          <table class="week-table">
            <caption class="sr-only">Affectations de la semaine</caption>
            <colgroup><col :class="viewMode === 'employees' ? 'employee-column' : 'service-column'" /><col span="7" /></colgroup>
            <thead>
              <tr>
                <th scope="col" class="row-heading">{{ viewMode === 'employees' ? 'Éq.' : 'Service' }}</th>
                <th v-for="day in visibleDays" :key="day.iso" scope="col" :class="{ weekend: day.weekend }">
                  <span class="block capitalize">{{ day.shortLabel }}</span>
                  <span class="font-normal">{{ day.dayMonth }}</span>
                  <span v-if="day.spillover" class="block text-amber-800">Suite</span>
                </th>
              </tr>
            </thead>
            <tbody v-if="viewMode === 'employees'">
              <tr v-for="item in filteredItems" :key="item.guid">
                <th scope="row" class="row-heading">
                  <button type="button" class="acronym" :title="item.user.name" :aria-label="`${acronyms.get(item.guid)} · ${item.user.name}`" @click="selectedName = item.user.name">
                    {{ acronyms.get(item.guid) }}
                  </button>
                </th>
                <td v-for="day in visibleDays" :id="employeeCellId(item.guid, day.iso)" :key="day.iso" tabindex="-1" :class="{ weekend: day.weekend }">
                  <button v-if="day.iso in item.schedule"
                      type="button" class="cell-card" :class="cellClasses(item, day.iso)"
                      :disabled="suggestion.status !== 'draft'"
                      :title="`${item.user.name} · ${formatDate(day.iso)} · ${cellLabel(item, day.iso)}`"
                      :aria-label="`${item.user.name} · ${formatDate(day.iso)} · ${cellLabel(item, day.iso)}`"
                      @click="openCell(item, day.iso)">
                    <span class="block font-bold">{{ cellLabel(item, day.iso) }}</span>
                    <span v-for="(time, index) in cellTimes(item, day.iso)" :key="index" class="block opacity-80">{{ time }}</span>
                    <span v-if="isManual(item, day.iso)" class="sr-only">Modification manuelle</span>
                  </button>
                  <span v-else class="empty-cell">—</span>
                </td>
              </tr>
              <tr v-if="!filteredItems.length"><td colspan="8" class="p-4 text-center text-slate-600">Aucun collaborateur ne correspond aux filtres.</td></tr>
            </tbody>
            <tbody v-else>
              <tr v-for="service in serviceRows" :key="service.guid">
                <th scope="row" class="row-heading service-name" :title="service.name">{{ service.name }}</th>
                <td v-for="day in visibleDays" :id="serviceCellId(service.guid, day.iso)" :key="day.iso" tabindex="-1" :class="{ weekend: day.weekend }">
                  <div class="service-cell">
                    <button v-for="item in service.members.get(day.iso)" :key="item.guid" type="button"
                        class="acronym" :class="cellClasses(item, day.iso)" :title="item.user.name"
                        :aria-label="`${item.user.name} · ${formatDate(day.iso)} · ${service.name}`"
                        @click="suggestion.status === 'draft' ? openCell(item, day.iso) : selectedName = item.user.name">
                      {{ acronyms.get(item.guid) }}
                    </button>
                    <button v-if="suggestion.status === 'draft' && day.inPeriod && service.editableDates.has(day.iso)" type="button" class="acronym add-button"
                        :aria-label="`Choisir un collaborateur pour ${service.name} le ${formatDate(day.iso)}`"
                        @click="serviceSelection = { iso: day.iso, name: service.name, guid: service.guid }">+</button>
                    <span v-else-if="!service.members.get(day.iso)?.length" class="empty-cell">—</span>
                  </div>
                </td>
              </tr>
              <tr v-if="!serviceRows.length"><td colspan="8" class="p-4 text-center text-slate-600">Aucun service pour cette semaine.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="space-y-2 border-t border-slate-200 px-3 py-2">
          <ul class="employee-legend" aria-label="Légende des collaborateurs">
            <li v-for="item in suggestion.items" :key="item.guid" class="flex items-start gap-2 text-xs text-slate-700">
              <strong class="acronym bg-slate-100 text-slate-900">{{ acronyms.get(item.guid) }}</strong>
              <span class="min-w-0 break-words py-1">{{ item.user.name }}</span>
            </li>
          </ul>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <Legend label="Service" tone="blue" /><Legend label="Garde / continuation" tone="violet" />
            <Legend label="Congé hebdomadaire" tone="rose" /><Legend label="Repos après garde" tone="amber" />
            <Legend label="Repos" tone="slate" /><Legend label="Non affecté" tone="empty" /><Legend label="Modification manuelle" tone="orange" />
          </div>
        </div>
      </section>
    </template>

    <PlanningDrawer :open="Boolean(selectedName)" :title="selectedName" width="md" @close="selectedName = ''" />

    <PlanningDrawer :open="Boolean(serviceSelection)" :title="serviceSelection?.name ?? 'Choisir un collaborateur'"
        :description="serviceSelection ? formatDate(serviceSelection.iso) : undefined" width="md" @close="serviceSelection = null">
      <div class="grid gap-2">
        <button v-for="item in serviceCandidates" :key="item.guid" type="button" class="secondary-button justify-between"
            @click="editServiceMember(item)">
          {{ item.user.name }} <span>{{ cellLabel(item, serviceSelection!.iso) }}</span>
        </button>
        <p v-if="!serviceCandidates.length" class="text-sm text-slate-600">Aucun collaborateur avec une journée modifiable à cette date.</p>
      </div>
    </PlanningDrawer>

    <PlanningDrawer :open="detailsPanel !== null" :title="detailsTitle" width="lg" @close="detailsPanel = null">
      <template v-if="detailsPanel === 'alerts'">
        <p v-if="!alertGroups.length" class="text-sm text-slate-600">
          {{ alertSummary ? 'Aucune alerte signalée.' : 'Diagnostics indisponibles pour cette suggestion.' }}
        </p>
        <section v-for="group in alertGroups" :key="group.title" class="mb-4">
          <h3 class="rounded-md px-2 py-1 text-sm font-bold" :class="group.tone">{{ group.title }}</h3>
          <ul class="divide-y divide-slate-200">
            <li v-for="(alert, index) in group.items" :key="index" class="space-y-1 py-2 text-sm">
              <p class="text-slate-800">{{ alert.message }}</p>
              <p v-if="alertEmployee(alert.employeeGuid)" class="text-xs text-slate-600">{{ alertEmployee(alert.employeeGuid) }}</p>
              <button v-if="alert.date && hasCalendarDate(alert.date)" type="button" class="link-button" @click="jumpToAlert(alert)">
                Accéder au {{ formatDate(alert.date) }}
              </button>
              <span v-else-if="alert.date" class="text-slate-600">{{ formatDate(alert.date) }}</span>
            </li>
          </ul>
        </section>
      </template>
      <template v-else-if="detailsPanel === 'coverage'">
        <ul class="divide-y divide-slate-200">
          <li v-for="entry in sortedCoverage" :key="`${entry.date}-${entry.requirementGuid}`" class="py-2 text-sm">
            <button type="button" class="link-button" @click="jumpToAlert({ date: entry.date, templateGuid: entry.templateGuid })">
              {{ formatDate(entry.date) }} · {{ entry.templateName }}
            </button>
            <p class="text-slate-700">{{ entry.assigned }} affecté(s) · minimum {{ entry.minimum }} · cible {{ entry.target }} · {{ ALLOCATION_LABELS[entry.allocationMode] }}</p>
            <span :class="coverageClass(entry.status)">{{ coverageLabel(entry.status) }}</span>
          </li>
        </ul>
      </template>
      <div v-else class="space-y-4 text-sm">
        <p>Conformité {{ suggestion?.conformity_score }} % · {{ suggestion?.items.length }} collaborateurs</p>
        <p v-if="generationScope?.temporaryExcludedEmployeeCount">{{ temporaryExcludedNames }}</p>
        <p v-if="historyReview?.warning">Historique d’équité indisponible.</p>
        <p v-if="historyReview?.anomalies?.length || historyReview?.boundaryRelaxedForFeasibility">{{ historyReviewMessage }}</p>
        <section aria-labelledby="suggestion-guard-teams">
          <h3 id="suggestion-guard-teams" class="font-bold text-slate-900">Équipes de garde par semaine</h3>
          <p v-if="!guardPools.length" class="mt-1 text-xs text-slate-600">Aucune équipe hebdomadaire renseignée dans cette suggestion.</p>
          <p v-else class="mt-1 text-xs text-slate-600">Répartition proposée selon les règles de garde de la période.</p>
          <ul v-if="guardPools.length" class="mt-2 divide-y divide-slate-200 border-y border-slate-200">
            <li v-for="pool in guardPools" :key="`${pool.weekFrom}-${pool.weekTo}`" class="space-y-2 py-2">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div>
                  <h4 class="font-semibold">{{ formatDate(pool.weekFrom) }} – {{ formatDate(pool.weekTo) }}</h4>
                  <p class="text-xs text-slate-600">{{ pool.selectionModeLabel }} · {{ pool.employees.length }} membre(s)</p>
                </div>
                <button v-if="hasCalendarDate(pool.weekFrom)" type="button" class="link-button text-xs"
                    :aria-label="`Voir la semaine du ${formatDate(pool.weekFrom)} dans le planning`"
                    @click="showPlanningWeek(pool.weekFrom)">
                  Voir la semaine
                </button>
              </div>
              <ul v-if="pool.employees.length" class="flex flex-wrap gap-x-3 gap-y-1">
                <li v-for="employee in pool.employees" :key="employee.guid" class="inline-flex items-center gap-1 text-xs"
                    :class="employee.acronym ? 'text-slate-700' : 'text-amber-800'">
                  <strong v-if="employee.acronym" class="acronym" :title="employee.name">{{ employee.acronym }}</strong>
                  <span>{{ employee.name }}</span>
                </li>
              </ul>
              <p v-else class="text-xs text-slate-600">Aucun collaborateur dans cette équipe.</p>
            </li>
          </ul>
        </section>
      </div>
    </PlanningDrawer>

    <PlanningDrawer :open="publicationOpen" title="Vérifier la publication" width="lg" :loading="actionLoading" @close="closePublication">
      <form class="space-y-4 text-sm" @submit.prevent="checkPublication()">
        <div class="flex flex-wrap items-end gap-2">
          <label for="approval-date" class="grid gap-1 font-semibold">Date de prise d’effet
            <input id="approval-date" v-model="effectiveDate" :disabled="actionLoading" type="date" class="rounded-lg border border-slate-300 p-2" />
          </label>
          <button class="secondary-button" :disabled="checkingPublication || actionLoading">Vérifier la date</button>
        </div>
        <p v-if="checkingPublication" role="status">Vérification en cours…</p>
        <p v-if="publicationError" role="alert" class="text-red-800">{{ publicationError }}</p>
        <template v-if="approvalPreview">
          <p class="font-semibold" aria-live="polite">
            {{ approvalPreview.can_publish ? 'Publication possible' : 'Publication bloquée' }}
            <template v-if="approvalPreview.effective_from"> · {{ formatDate(approvalPreview.effective_from) }}</template>
          </p>
          <p v-if="approvalPreview.can_publish">La publication remplacera les affectations concernées à partir de cette date.</p>
          <p v-else role="alert" class="text-red-800">
            {{ publicationBlocker ?? 'La date sélectionnée ne permet pas de publier cette suggestion.' }}
          </p>
          <details v-if="approvalPreview.alerts.length" class="rounded-lg border border-slate-200 p-2">
            <summary class="cursor-pointer font-semibold text-slate-800">
              {{ publicationAlertLabel }} — Voir les détails
            </summary>
            <ul class="mt-2 space-y-2">
              <li v-for="(alert, index) in approvalPreview.alerts" :key="index" class="rounded-lg bg-slate-50 p-2" :class="{ 'text-red-800': alert.severity === 'BLOCKING' }">
                <strong v-if="alert.severity !== 'INFO'" class="block">
                  {{ alert.severity === 'BLOCKING' ? 'Blocage' : alert.severity === 'CONFIRMATION_REQUIRED' ? 'À confirmer' : 'Avertissement' }}
                </strong>
                {{ alert.message }}
                <ul v-if="alert.details?.conflicts?.length" class="mt-1 list-disc pl-5">
                  <li v-for="(conflict, conflictIndex) in alert.details.conflicts" :key="conflictIndex">
                    {{ publicationConflictLabel(conflict) }}
                  </li>
                </ul>
              </li>
            </ul>
          </details>
          <p v-for="action in approvalPreview.suggested_actions ?? []" :key="action.code">{{ action.message }}</p>
          <button v-if="approvalPreview.earliest_valid_date" :disabled="actionLoading" type="button" class="secondary-button"
              @click="choosePublicationDate(approvalPreview.earliest_valid_date)">
            Choisir le {{ formatDate(approvalPreview.earliest_valid_date) }}
          </button>
        </template>
      </form>
      <template #footer>
        <button type="button" class="primary-button" :disabled="!canConfirmPublication" @click="confirmPublication">
          Confirmer et publier
        </button>
      </template>
    </PlanningDrawer>

    <SuggestionCellEditor v-if="suggestion" :open="Boolean(editorItem)" :suggestion-guid="suggestion.guid"
        :item="editorItem" :iso="editorIso" :templates="templates" :initial-template-guid="editorTemplate"
        @close="closeCell" @saved="onCellSaved" @bulk="openBulkFromCell" />
    <SuggestionBulkEditor :open="bulkEditorOpen" :suggestion="suggestion" :templates="templates"
        :initial-item-guid="bulkSeed?.guid" :initial-iso="bulkSeed?.iso" @close="bulkEditorOpen = false" @saved="onBulkSaved" />
    <PlanningConfirmDialog :open="confirmAction !== null" :danger="confirmAction === 'reject'" :loading="actionLoading"
        :title="confirmAction === 'regenerate' ? 'Régénérer autour des décisions du manager ?' : 'Rejeter cette suggestion ?'"
        :description="confirmAction === 'regenerate' ? 'Toké conservera les décisions manuelles et recalculera les cellules automatiques.' : 'Le rejet ne modifie aucun planning déjà publié.'"
        :confirm-label="confirmAction === 'regenerate' ? 'Régénérer le reste' : 'Rejeter la suggestion'"
        @cancel="confirmAction = null" @confirm="resolveAction" />
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  nextTick,
  watch,
  ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconEdit,
  IconRefresh,
} from '@tabler/icons-vue'

import SessionTemplateService from '@/service/SessionTemplate'
import ScheduleSuggestionService, { type ApprovalPreview } from '@/service/ScheduleSuggestionService'

import PlanningConfirmDialog from '../components/PlanningConfirmDialog.vue'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import SuggestionBulkEditor from './SuggestionBulkEditor.vue'
import SuggestionFilters from './SuggestionFilters.vue'
import SuggestionCellEditor from './SuggestionCellEditor.vue'
import { employeeAcronyms, suggestionWeeks } from './suggestionWeek'
import { planningAlerts, planningAlertSummary, type AlertTarget } from './suggestionAlerts'
import {
  ALLOCATION_LABELS,
  formatDate,
  responseData,
  responseError,
} from '../planningSuggestion.helpers'
import { reasonBusinessLabel } from '../teamWeeklyLeave.helpers'
import type {
  PlanningDayKey,
  PlanningTemplateMini,
  ScheduleSuggestion,
  ScheduleSuggestionItem,
  SuggestionReasonSource,
  GuardTeamSelectionMode,
  SuggestionGuardPool,
} from '../planningSuggestion.type'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')
const suggestion = ref<ScheduleSuggestion | null>(null)
const templates = ref<PlanningTemplateMini[]>([])
const viewMode = ref<'employees' | 'services'>('employees')
const weekIndex = ref(0)
const weekHeading = ref<HTMLElement | null>(null)
const detailsPanel = ref<'alerts' | 'coverage' | 'context' | null>(null)
const detailsTitle = computed(() => ({
  alerts: 'Alertes du planning', coverage: 'Couverture des services', context: 'Équité et équipes de garde',
})[detailsPanel.value ?? 'context'])
const selectedName = ref('')
const bulkEditorOpen = ref(false)
const bulkSeed = ref<{ guid: string; iso: string } | null>(null)
const editorItem = ref<ScheduleSuggestionItem | null>(null)
const editorIso = ref('')
const editorTemplate = ref<string>()
const serviceSelection = ref<{ iso: string; name: string; guid: string } | null>(null)
const confirmAction = ref<'reject' | 'regenerate' | null>(null)
const publicationOpen = ref(false)
const effectiveDate = ref('')
const checkingPublication = ref(false)
const publicationError = ref('')
const approvalPreview = ref<ApprovalPreview | null>(null)
let publicationRequest = 0
const actionLoading = ref(false)
const employeeSearch = ref('')
const manualOnly = ref(false)
const guardOnly = ref(false)
const unassignedOnly = ref(false)

const dayKeys: PlanningDayKey[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]

const templateMap = computed(
    () => new Map(templates.value.map((template) => [template.guid, template])),
)

const historyReview = computed(
  () => suggestion.value?.diagnostics?.historyReview ?? null,
)

const generationScope = computed(
  () => suggestion.value?.diagnostics?.generationScope ?? null,
)

const historyReviewMessage = computed(() => {
  const review = historyReview.value
  if (!review) return ''
  const ignored = review.summary?.ignoredAmbiguousRecords ?? 0
  const adjusted = review.summary?.adjustedAnomalyCount ?? 0
  const boundary = review.boundaryRelaxedForFeasibility
    ? ' Une continuité historique a aussi été relâchée pour ne pas rendre la suggestion impossible.'
    : ''
  return `${ignored} entrée(s) ambiguë(s) neutralisée(s) · ${adjusted} anomalie(s) ajustée(s) par le manager.${boundary}`
})

const temporaryExcludedNames = computed(() => {
  const names = generationScope.value?.temporaryExcludedEmployees
    ?.map((employee) => employee.name)
    .filter(Boolean) ?? []

  return names.length
    ? `Exclus pour cette suggestion : ${names.join(', ')}.`
    : 'Ces exclusions sont ponctuelles et ne modifient pas les profils employés.'
})

type GuardPoolView = SuggestionGuardPool & {
  selectionModeLabel: string
  employees: Array<{
    guid: string
    name: string
    acronym?: string
  }>
}

const GUARD_POOL_SELECTION_LABELS: Record<
    GuardTeamSelectionMode,
    string
> = {
  ROTATION_ORDER: 'Ordre de rotation',
  OPTIMIZED: 'Choix optimisé',
}

const guardPools = computed<GuardPoolView[]>(() => {
  const currentSuggestion = suggestion.value
  if (!currentSuggestion) return []

  const itemsByUserGuid = new Map(
      currentSuggestion.items.map(
          (item) => [item.user.guid, item] as const,
      ),
  )

  return [...(currentSuggestion.diagnostics?.guardPools ?? [])]
      .filter((pool) => pool.mode === 'WEEKLY_POOL')
      .sort((a, b) => a.weekFrom.localeCompare(b.weekFrom))
      .map((pool): GuardPoolView => ({
        ...pool,
        selectionModeLabel:
            GUARD_POOL_SELECTION_LABELS[pool.selectionMode],
        employees: pool.employeeGuids.map((guid) => {
          const item = itemsByUserGuid.get(guid)

          return {
            guid,
            name: item?.user.name ?? 'Collaborateur introuvable',
            acronym: item ? acronyms.value.get(item.guid) : undefined,
          }
        }),
      }))
})

const sortedCoverage = computed(() =>
    [...(suggestion.value?.diagnostics?.coverage ?? [])].sort((left, right) => {
      const priority: Record<string, number> = {
        BELOW_MINIMUM: 0,
        ABOVE_MAXIMUM: 1,
        BELOW_TARGET: 2,
        COVERED: 3,
      }
      return (priority[left.status] ?? 9) - (priority[right.status] ?? 9)
        || left.date.localeCompare(right.date)
    }),
)

const alerts = computed(() => planningAlerts(suggestion.value?.diagnostics))
const alertSummary = computed(() => planningAlertSummary(alerts.value))
const alertGroups = computed(() => [
  { title: 'Anomalies critiques', tone: 'bg-red-50 text-red-800', items: alerts.value?.filter(alert => alert.critical) ?? [] },
  { title: 'Avertissements', tone: 'bg-amber-50 text-amber-900', items: alerts.value?.filter(alert => !alert.critical) ?? [] },
].filter(group => group.items.length))

function alertEmployee(guid?: string | null): string | undefined {
  return guid ? suggestion.value?.items.find(item => item.user.guid === guid)?.user.name : undefined
}

const publicationBlocker = computed(() =>
  approvalPreview.value?.alerts.find(alert => alert.severity === 'BLOCKING')?.message,
)
const publicationAlertLabel = computed(() => {
  const alerts = approvalPreview.value?.alerts ?? []
  const blockers = alerts.filter(alert => alert.severity === 'BLOCKING').length
  const warnings = alerts.filter(alert => alert.severity === 'WARNING').length
  const confirmations = alerts.filter(alert => alert.severity === 'CONFIRMATION_REQUIRED').length
  const parts = [
    blockers ? `${blockers} blocage${blockers === 1 ? '' : 's'}` : '',
    warnings ? `${warnings} avertissement${warnings === 1 ? '' : 's'}` : '',
    confirmations ? `${confirmations} point${confirmations === 1 ? '' : 's'} à confirmer` : '',
  ].filter(Boolean)
  return parts.join(' · ') || 'Informations de publication'
})

const weeks = computed(() => {
  const current = suggestion.value
  if (!current) return []
  const last = current.items.reduce((end, item) =>
    Object.keys(item.schedule).reduce((latest, date) => date > latest ? date : latest, end),
  current.period_to)
  return suggestionWeeks(current.period_from, current.period_to, last)
})
const visibleDays = computed(() => weeks.value[weekIndex.value] ?? [])
watch(weeks, value => { weekIndex.value = Math.min(weekIndex.value, Math.max(0, value.length - 1)) })

const acronyms = computed(() => employeeAcronyms((suggestion.value?.items ?? []).map(item => ({
  guid: item.guid, name: item.user.name,
}))))

const serviceRows = computed(() => {
  const services = new Map<string, { guid: string; name: string; members: Map<string, ScheduleSuggestionItem[]>; editableDates: Set<string> }>()
  const getService = (guid: string, name: string) => {
    let service = services.get(guid)
    if (!service) {
      service = { guid, name, members: new Map(), editableDates: new Set() }
      services.set(guid, service)
    }
    return service
  }

  const dates = new Set(visibleDays.value.map(day => day.iso))
  for (const entry of sortedCoverage.value) {
    if (dates.has(entry.date)) {
      const name = entry.templateName?.trim() || templateMap.value.get(entry.templateGuid)?.name?.trim() || 'Service sans nom'
      getService(entry.templateGuid, name).editableDates.add(entry.date)
    }
  }
  for (const item of filteredItems.value) {
    for (const day of visibleDays.value) {
      const guid = item.schedule[day.iso]
      if (!guid) continue
      const name = templateMap.value.get(guid)?.name?.trim()
        || reason(item, day.iso)?.templateName?.trim()
        || 'Service sans nom'
      const service = getService(guid, name)
      if (service.name === 'Service sans nom') service.name = name
      service.editableDates.add(day.iso)
      const members = service.members.get(day.iso) ?? []
      members.push(item)
      service.members.set(day.iso, members)
    }
  }
  return [...services.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
})
const serviceCandidates = computed(() => {
  const selection = serviceSelection.value
  if (!selection) return []
  return (suggestion.value?.items ?? []).filter(item =>
    selection.iso in item.schedule && item.schedule[selection.iso] !== selection.guid)
})

const canConfirmPublication = computed(() => Boolean(
  approvalPreview.value?.can_publish && approvalPreview.value.effective_from &&
  !checkingPublication.value && !actionLoading.value,
))

const manualCellCount = computed(() =>
    suggestion.value?.items.reduce(
        (count, item) => count + Object.keys(item.schedule).filter((iso) => isManual(item, iso)).length,
        0,
    ) ?? 0,
)

const guardCellCount = computed(() =>
    suggestion.value?.items.reduce(
        (count, item) => count + Object.keys(item.schedule).filter((iso) => isGuard(item, iso)).length,
        0,
    ) ?? 0,
)

const unassignedCellCount = computed(() =>
    suggestion.value?.items.reduce(
        (count, item) => count + Object.keys(item.schedule).filter((iso) => item.schedule[iso] === null).length,
        0,
    ) ?? 0,
)

const filteredItems = computed(() => {
  const query = employeeSearch.value.trim().toLocaleLowerCase('fr')
  return (suggestion.value?.items ?? []).filter((item) => {
    const matchesSearch = !query || [item.user.name, item.user.employee_code, acronyms.value.get(item.guid)]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('fr').includes(query))
    const dates = Object.keys(item.schedule)
    const matchesManual = !manualOnly.value || dates.some((iso) => isManual(item, iso))
    const matchesGuard = !guardOnly.value || dates.some((iso) => isGuard(item, iso))
    const matchesUnassigned = !unassignedOnly.value || dates.some((iso) => item.schedule[iso] === null)
    return matchesSearch && matchesManual && matchesGuard && matchesUnassigned
  })
})

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const [suggestionResponse, templateResponse] = await Promise.all([
      ScheduleSuggestionService.getByGuid(
          String(route.params.guid),
      ),
      SessionTemplateService.list({
        current: true,
        active: true,
        limit: 250,
      }),
    ])

    if (!suggestionResponse?.success) throw suggestionResponse
    suggestion.value = responseData(suggestionResponse).suggestion ?? null

    templates.value =
        templateResponse?.data?.templates?.items ??
        templateResponse?.data?.session_templates?.items ??
        []
  } catch (error: any) {
    errorMessage.value = responseError(
        error,
        'Impossible de charger cette suggestion.',
    )
  } finally {
    loading.value = false
  }
}

function reason(
    item: ScheduleSuggestionItem,
    iso: string,
) {
  return item.reasons?.[iso] ?? null
}

function isManual(
    item: ScheduleSuggestionItem,
    iso: string,
): boolean {
  return (
      reason(item, iso)?.factors?.some((factor) =>
          factor.toLowerCase().includes('manuel'),
      ) ?? false
  )
}

function source(
    item: ScheduleSuggestionItem,
    iso: string,
): SuggestionReasonSource | 'MANUAL' {
  if (isManual(item, iso)) return 'MANUAL'

  const explicitSource = reason(item, iso)?.source
  if (explicitSource) return explicitSource

  return item.schedule[iso] === null
      ? 'UNASSIGNED'
      : 'GENERATED'
}

function cellClasses(
    item: ScheduleSuggestionItem,
    iso: string,
): string {
  if (!(iso in item.schedule)) {
    return 'border-slate-100 bg-white text-slate-300'
  }

  const currentSource = source(item, iso)

  const classes: Record<
      SuggestionReasonSource | 'MANUAL',
      string
  > = {
    FIXED: 'border-blue-100 bg-blue-50 text-blue-800',
    GENERATED: isGuard(item, iso)
        ? 'border-violet-100 bg-violet-50 text-violet-800'
        : 'border-blue-100 bg-blue-50 text-blue-800',
    FILL_REMAINING:
        'border-blue-100 bg-blue-50 text-blue-800',
    GUARD_CONTINUATION:
        'border-violet-200 bg-violet-100 text-violet-900',
    POST_GUARD_REST:
        'border-amber-100 bg-amber-50 text-amber-800',
    WEEKLY_LEAVE:
        'border-rose-200 bg-rose-50 text-rose-800',
    TEMPLATE_REST:
        'border-slate-200 bg-slate-100 text-slate-600',
    UNASSIGNED:
        'border-dashed border-slate-200 bg-white text-slate-400',
    REST: 'border-slate-200 bg-slate-100 text-slate-500',
    MANUAL:
        'border-orange-200 bg-orange-50 text-orange-800',
  }

  return classes[currentSource]
}

function isGuard(
    item: ScheduleSuggestionItem,
    iso: string,
): boolean {
  const name = (reason(item, iso)?.templateName ?? '').toLowerCase()
  return name.includes('guard') || name.includes('garde')
}

type RestReasonSource = Extract<
    SuggestionReasonSource,
    | 'WEEKLY_LEAVE'
    | 'POST_GUARD_REST'
    | 'TEMPLATE_REST'
    | 'UNASSIGNED'
    | 'REST'
>

function isRestSource(value: SuggestionReasonSource | 'MANUAL',
): value is RestReasonSource {
  return ( value === 'WEEKLY_LEAVE' || value === 'POST_GUARD_REST' || value === 'TEMPLATE_REST' || value === 'UNASSIGNED' || value === 'REST')
}

function cellLabel(item: ScheduleSuggestionItem, iso: string): string {
  if (!(iso in item.schedule)) return '—'

  const currentSource = source(item, iso)
  const currentReason = reason(item, iso)

  if (isRestSource(currentSource)) {
    return reasonBusinessLabel(currentSource)
  }

  const templateGuid = item.schedule[iso]

  return currentReason?.templateName
      ?? (templateGuid ? templateMap.value.get(templateGuid)?.name : undefined)
      ?? 'Service'
}

function cellTimes(item: ScheduleSuggestionItem, iso: string): string[] {
  const templateGuid = item.schedule[iso]
  if (!templateGuid) return []
  const day = dayKeys[new Date(`${iso}T12:00:00`).getDay()]
  const blocks = templateMap.value.get(templateGuid)?.definition?.[day]
  return Array.isArray(blocks) ? blocks.map(block => `${block.work[0]}–${block.work[1]}`) : []
}

function resetPlanningFilters(): void {
  employeeSearch.value = ''
  manualOnly.value = false
  guardOnly.value = false
  unassignedOnly.value = false
}

const employeeCellId = (guid: string, iso: string) => `employee-${guid}-${iso}`
const serviceCellId = (guid: string, iso: string) => `service-${guid}-${iso}`
const hasCalendarDate = (date: string) => weeks.value.some(week => week.some(day => day.iso === date))

async function jumpToAlert(alert: AlertTarget): Promise<void> {
  const { date } = alert
  if (!date) return
  if (!hasCalendarDate(date)) return
  const item = suggestion.value?.items.find(item => item.user.guid === alert.employeeGuid)
  let target: string | undefined
  if (item) {
    viewMode.value = 'employees'
    target = employeeCellId(item.guid, date)
  } else if (alert.templateGuid) {
    viewMode.value = 'services'
    target = serviceCellId(alert.templateGuid, date)
  }
  resetPlanningFilters()
  await showPlanningWeek(date, target)
}

async function showPlanningWeek(date: string, target?: string): Promise<void> {
  const index = weeks.value.findIndex(week => week.some(day => day.iso === date))
  if (index === -1) return
  weekIndex.value = index
  detailsPanel.value = null
  await nextTick()
  const cell = target ? document.getElementById(target) : null
  const focusTarget = cell ?? weekHeading.value
  focusTarget?.focus()
}

function openBulkEditor(): void {
  bulkSeed.value = null
  bulkEditorOpen.value = true
}

function openBulkFromCell(): void {
  if (!editorItem.value) return
  bulkSeed.value = { guid: editorItem.value.guid, iso: editorIso.value }
  closeCell()
  bulkEditorOpen.value = true
}

function openCell(item: ScheduleSuggestionItem, iso: string, template?: string): void {
  if (suggestion.value?.status !== 'draft' || !(iso in item.schedule)) return
  editorIso.value = iso
  editorTemplate.value = template
  editorItem.value = item
}

async function editServiceMember(item: ScheduleSuggestionItem): Promise<void> {
  const selection = serviceSelection.value
  if (!selection) return
  serviceSelection.value = null
  await nextTick()
  openCell(item, selection.iso, selection.guid)
}

function closeCell(): void {
  editorItem.value = null
}

async function onCellSaved(item: ScheduleSuggestionItem | null): Promise<void> {
  const current = suggestion.value
  if (current && item) {
    current.items = current.items.map(previous => previous.guid === item.guid ? item : previous)
  }
  closeCell()
  await load()
}

async function onBulkSaved(): Promise<void> {
  bulkEditorOpen.value = false
  await load()
}

function openPublication(): void {
  publicationOpen.value = true
  effectiveDate.value = ''
  void checkPublication()
}

function closePublication(): void {
  publicationOpen.value = false
  publicationRequest++
  checkingPublication.value = false
  approvalPreview.value = null
  publicationError.value = ''
}

watch(effectiveDate, () => {
  publicationRequest++
  checkingPublication.value = false
  approvalPreview.value = null
  publicationError.value = ''
}, { flush: 'sync' })

async function checkPublication(): Promise<void> {
  const current = suggestion.value
  if (!current || !publicationOpen.value) return
  const request = ++publicationRequest
  checkingPublication.value = true
  approvalPreview.value = null
  publicationError.value = ''
  try {
    const response = await ScheduleSuggestionService.previewApproval(current.guid, effectiveDate.value || undefined)
    if (request !== publicationRequest) return
    if (!response.success || !response.data) throw response
    approvalPreview.value = response.data
  } catch (error) {
    if (request === publicationRequest) {
      publicationError.value = responseError(error, 'Impossible de vérifier la publication.')
    }
  } finally {
    if (request === publicationRequest) checkingPublication.value = false
  }
}

function choosePublicationDate(date: string): void {
  effectiveDate.value = date
  void checkPublication()
}

function publicationConflictLabel(conflict: { conflict_type?: string; continuation_date?: string; item_guid?: string }): string {
  const name = suggestion.value?.items.find(item => item.guid === conflict.item_guid)?.user.name
  const kind = conflict.conflict_type === 'POST_GUARD_REST' ? 'Repos après garde'
    : conflict.conflict_type === 'PUBLISHED_GUARD_CONTINUATION' ? 'Garde déjà publiée' : 'Continuation de garde'
  return [kind, name, conflict.continuation_date && formatDate(conflict.continuation_date)].filter(Boolean).join(' · ')
}

async function confirmPublication(): Promise<void> {
  const guid = suggestion.value?.guid
  const date = approvalPreview.value?.effective_from
  if (!canConfirmPublication.value || !guid || !date) return
  actionLoading.value = true
  publicationError.value = ''
  try {
    const response = await ScheduleSuggestionService.approve(guid, date)
    if (!response.success) throw response
    closePublication()
    await router.push({ name: 'schedule-assignment' })
  } catch (error) {
    const message = responseError(error, 'Impossible de publier la suggestion.')
    effectiveDate.value = date
    await checkPublication()
    if (publicationOpen.value) publicationError.value = message
  } finally {
    actionLoading.value = false
  }
}

async function resolveAction(): Promise<void> {
  if (!suggestion.value || !confirmAction.value) return

  const action = confirmAction.value
  actionLoading.value = true

  try {
    const response = action === 'regenerate'
      ? await ScheduleSuggestionService.regenerate(suggestion.value.guid)
      : await ScheduleSuggestionService.reject(suggestion.value.guid)

    if (!response?.success) throw response

    confirmAction.value = null

    if (action === 'regenerate') {
      await load()
      return
    }

    await router.push({ name: 'planning-suggestion-list' })
  } catch (error: any) {
    if (action === 'regenerate') {
      const details =
          error?.details ??
          error?.error?.details ??
          error?.data?.details ??
          error?.data?.error?.details ??
          error?.response?.data?.error?.details
      const firstBlocker = Array.isArray(details?.blockers)
          ? details.blockers[0]
          : null
      const suggestedAction = Array.isArray(firstBlocker?.suggested_actions)
          ? firstBlocker.suggested_actions[0]
          : null

      errorMessage.value = firstBlocker?.message
          ? `${firstBlocker.message}${suggestedAction ? ` — ${suggestedAction}` : ''}`
          : responseError(
              error,
              'La régénération n’a pas pu être exécutée.',
          )
    } else {
      errorMessage.value = responseError(
          error,
          'Cette action n’a pas pu être exécutée.',
      )
    }
    confirmAction.value = null
  } finally {
    actionLoading.value = false
  }
}

function coverageLabel(status: string): string {
  return {
    COVERED: 'Couvert',
    BELOW_TARGET: 'Sous la cible',
    BELOW_MINIMUM: 'Minimum non atteint',
    ABOVE_MAXIMUM: 'Maximum dépassé',
  }[status] ?? status
}

function coverageClass(status: string): string {
  return {
    COVERED: 'bg-emerald-50 text-emerald-700',
    BELOW_TARGET: 'bg-amber-50 text-amber-700',
    BELOW_MINIMUM: 'bg-red-50 text-red-700',
    ABOVE_MAXIMUM: 'bg-orange-50 text-orange-700',
  }[status] ?? 'bg-slate-100 text-slate-600'
}

const Legend = defineComponent({
  props: {
    label: String,
    tone: String,
  },
  setup(props) {
    const colors: Record<string, string> = {
      indigo: 'bg-blue-500',
      blue: 'bg-blue-500',
      violet: 'bg-violet-500',
      rose: 'bg-rose-500',
      amber: 'bg-amber-500',
      slate: 'bg-slate-400',
      orange: 'bg-orange-500',
      empty: 'border border-dashed border-slate-400 bg-white',
    }

    return () =>
        h(
            'span',
            {
              class: 'inline-flex items-center gap-2 text-xs font-semibold text-slate-500',
            },
            [
              h('span', {
                class: `h-2 w-2 rounded-full ${
                    colors[props.tone ?? 'slate']
                }`,
              }),
              props.label,
            ],
        )
  },
})

onMounted(async () => {
  await load()
  if (suggestion.value && route.query.panel === 'alerts') detailsPanel.value = 'alerts'
})
</script>

<style scoped>
.primary-button, .secondary-button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  border-radius: .5rem;
  padding: .35rem .65rem;
  font-size: .75rem;
  font-weight: 700;
}
.primary-button { background: #1d4ed8; color: white; }
.secondary-button { border: 1px solid #e2e8f0; background: white; color: #334155; }
button:disabled { cursor: default; opacity: .55; }
.cell-card:disabled { opacity: 1; }
button:focus-visible, select:focus-visible, a:focus-visible, td:focus, [tabindex="-1"]:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.link-button { text-align: left; font-weight: 700; color: #1d4ed8; text-decoration: underline; }
.table-scroll { overflow-x: auto; }
.week-table { width: 100%; min-width: 35rem; table-layout: fixed; border-collapse: collapse; font-size: .73rem; }
.employee-column { width: 3.85rem; }
.service-column { width: 9rem; }
@media (min-width: 1024px) { .service-column { width: 11rem; } }
.week-table th, .week-table td { border: 1px solid #e2e8f0; padding: .25rem; vertical-align: middle; }
.week-table thead th { background: #f8fafc; color: #334155; }
.week-table .row-heading { position: sticky; left: 0; z-index: 1; background: #f8fafc; }
.week-table .weekend { background: #f1f5f9; }
.week-table .service-name { padding-inline: .55rem; color: #0f172a; text-align: left; overflow-wrap: anywhere; }
.view-switch { display: inline-flex; gap: .2rem; padding: .2rem; border-radius: .6rem; background: #f1f5f9; }
.view-switch button { min-height: 2rem; padding: .25rem .6rem; border-radius: .4rem; color: #334155; font-size: .75rem; font-weight: 700; }
.view-switch button[aria-pressed="true"] { background: #1d4ed8; color: white; }
.week-pagination { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .45rem; }
@media (max-width: 639px) { .week-pagination { width: 100%; } }
.employee-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: .35rem .65rem; }
.employee-legend .acronym { flex-shrink: 0; min-width: 2.15rem; min-height: 1.45rem; }
.cell-card { width: 100%; min-height: 2.5rem; border-width: 1px; border-radius: .4rem; padding: .25rem; overflow-wrap: anywhere; }
.cell-card:not(:disabled):hover, .acronym:hover { box-shadow: inset 0 0 0 1px #2563eb; }
.service-cell { display: flex; flex-wrap: wrap; justify-content: center; gap: .2rem; }
.acronym { display: inline-flex; min-height: 1.8rem; align-items: center; justify-content: center; padding: .12rem .28rem; border-radius: .35rem; border-width: 1px; font-size: .71rem; font-weight: 800; }
.row-heading .acronym { color: #0f172a; background: #fff; border-color: #cbd5e1; }
.add-button { color: #1d4ed8; border-color: #bfdbfe; background: #fff; }
.empty-cell { display: block; text-align: center; color: #64748b; }
</style>
