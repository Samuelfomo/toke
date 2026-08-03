<template>
  <div class="space-y-6">
    <PlanningPageHeader
        eyebrow="Contrôle avant publication"
        :title="suggestion
                ? `Suggestion du ${formatDate(suggestion.period_from)} au ${formatDate(suggestion.period_to)}`
                : 'Aperçu de la suggestion'"
        description="Contrôlez les scores, les gardes, les congés et chaque affectation avant de publier le planning officiel."
    >
      <template #actions>
        <button
            class="secondary-button"
            @click="router.push({ name: 'planning-suggestion-list' })"
        >
          <IconArrowLeft :size="16" />
          Retour
        </button>

        <template v-if="suggestion?.status === 'draft'">
          <button
              class="danger-button"
              @click="confirmAction = 'reject'"
          >
            <IconX :size="16" />
            Rejeter
          </button>

          <button
              class="primary-button disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canApprove"
              :title="approveBlocker || 'Valider et publier'"
              @click="confirmAction = 'approve'"
          >
            <IconCircleCheck :size="16" />
            Valider et publier
          </button>
        </template>
      </template>
    </PlanningPageHeader>

    <PlanningInfoPanel
        v-if="errorMessage"
        tone="warning"
        title="Chargement impossible"
        :description="errorMessage"
    />

    <PlanningInfoPanel
        v-if="suggestion?.status === 'draft' && approveBlocker"
        tone="warning"
        title="Publication bloquée"
        :description="approveBlocker"
        important="Corrigez les violations dures ou les minimums de couverture avant de publier."
    />

    <div v-if="loading" class="space-y-4">
      <div class="h-28 animate-pulse rounded-2xl bg-slate-100" />
      <div class="h-96 animate-pulse rounded-2xl bg-slate-100" />
    </div>

    <template v-else-if="suggestion">
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-5">
          <Score
              label="Conformité globale"
              :value="suggestion.conformity_score"
          />
          <Score
              label="Couverture"
              :value="suggestion.diagnostics.coverageScore"
          />
          <Score
              label="Équité"
              :value="suggestion.diagnostics.fairnessScore"
          />
          <Info
              label="Collaborateurs"
              :value="String(suggestion.items.length)"
          />
          <Info
              label="Solveur"
              :value="solverLabel"
          />
        </div>
      </section>

      <section
          v-if="guardPools.length"
          class="rounded-2xl border border-violet-100 bg-violet-50/30 p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <IconUsersGroup :size="20" />
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-500">
                Gardes
              </p>
              <h2 class="mt-1 text-base font-bold text-slate-900">
                Équipes de garde par semaine
              </h2>
              <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                Composition informative calculée par le moteur. Les contraintes
                correspondantes ont déjà été appliquées par OR-Tools.
              </p>
            </div>
          </div>

          <span class="w-fit rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold text-violet-700">
            {{ guardPools.length }} semaine(s)
          </span>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <article
              v-for="pool in guardPools"
              :key="`${pool.weekFrom}-${pool.weekTo}`"
              class="rounded-xl border border-violet-100 bg-white p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Semaine
                </p>
                <p class="mt-1 text-sm font-bold text-slate-900">
                  Du {{ formatDate(pool.weekFrom) }} au
                  {{ formatDate(pool.weekTo) }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-bold text-violet-700">
                  Pool hebdomadaire
                </span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600">
                  {{ pool.selectionModeLabel }}
                </span>
              </div>
            </div>

            <div class="mt-4 space-y-2">
              <div
                  v-for="employee in pool.employees"
                  :key="employee.guid"
                  class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                    :class="employee.resolved
                            ? 'bg-slate-900 text-white'
                            : 'bg-amber-100 text-amber-700'"
                >
                  {{ employee.resolved ? initials(employee.name) : '?' }}
                </div>

                <div class="min-w-0">
                  <p
                      class="truncate text-xs font-bold"
                      :class="employee.resolved
                              ? 'text-slate-800'
                              : 'text-amber-800'"
                  >
                    {{ employee.name }}
                  </p>
                  <p class="mt-0.5 truncate text-[10px] text-slate-400">
                    {{ employee.employeeCode ?? employee.guid }}
                  </p>
                </div>
              </div>

              <p
                  v-if="!pool.employees.length"
                  class="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[10px] text-slate-400"
              >
                Aucun collaborateur dans ce pool.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <Legend label="Horaire fixe" tone="indigo" />
            <Legend label="Service généré" tone="blue" />
            <Legend label="Garde / continuation" tone="violet" />
            <Legend label="Congé hebdomadaire" tone="rose" />
            <Legend label="Repos après garde" tone="amber" />
            <Legend label="Repos du modèle" tone="slate" />
            <Legend label="Non affecté" tone="empty" />
          </div>

          <div class="inline-flex rounded-xl border border-slate-200 p-1">
            <button
                class="tab-button"
                :class="activeTab === 'planning' ? 'active' : ''"
                @click="activeTab = 'planning'"
            >
              Planning
            </button>
            <button
                class="tab-button"
                :class="activeTab === 'coverage' ? 'active' : ''"
                @click="activeTab = 'coverage'"
            >
              Couverture
            </button>
            <button
                class="tab-button"
                :class="activeTab === 'issues' ? 'active' : ''"
                @click="activeTab = 'issues'"
            >
              Alertes {{ suggestion.diagnostics.violations.length }}
            </button>
          </div>
        </div>
      </section>

      <section
          v-if="activeTab === 'planning'"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="overflow-auto">
          <table
              class="border-collapse"
              style="min-width: max-content; width: 100%"
          >
            <thead class="sticky top-0 z-20">
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="sticky left-0 z-30 min-w-[220px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Collaborateur
              </th>

              <th
                  v-for="day in calendarDays"
                  :key="day.iso"
                  class="min-w-[108px] px-2 py-3 text-center"
                  :class="day.outsidePeriod
                                        ? 'bg-amber-50/60'
                                        : day.weekend
                                            ? 'bg-slate-100/70'
                                            : ''"
              >
                <p
                    class="text-[10px] font-bold uppercase"
                    :class="day.outsidePeriod
                                            ? 'text-amber-700'
                                            : 'text-slate-500'"
                >
                  {{ day.shortLabel }}
                </p>
                <p class="mt-0.5 text-[10px] text-slate-400">
                  {{ day.dayMonth }}
                </p>
                <p
                    v-if="day.outsidePeriod"
                    class="mt-1 text-[8px] font-bold uppercase text-amber-600"
                >
                  suite
                </p>
              </th>
            </tr>
            </thead>

            <tbody>
            <tr
                v-for="item in suggestion.items"
                :key="item.guid"
                class="border-b border-slate-100 last:border-0"
            >
              <td class="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                    {{ initials(item.user.name) }}
                  </div>
                  <div>
                    <p class="max-w-[150px] truncate text-xs font-bold text-slate-800">
                      {{ item.user.name }}
                    </p>
                    <p class="mt-0.5 text-[10px] text-slate-400">
                      {{ item.user.employee_code ?? 'Sans code' }}
                    </p>
                  </div>
                </div>
              </td>

              <td
                  v-for="day in calendarDays"
                  :key="day.iso"
                  class="p-1.5 align-middle"
                  :class="day.weekend ? 'bg-slate-50/70' : ''"
              >
                <button
                    type="button"
                    class="cell-card"
                    :class="cellClasses(item, day.iso)"
                    :disabled="suggestion.status !== 'draft' || !(day.iso in item.schedule)"
                    @click="openCell(item, day.iso)"
                >
                                        <span class="block truncate text-[10px] font-bold">
                                            {{ cellLabel(item, day.iso) }}
                                        </span>
                  <span class="mt-1 block truncate text-[9px] opacity-70">
                                            {{ cellTime(item, day.iso) }}
                                        </span>
                  <span
                      v-if="isManual(item, day.iso)"
                      class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500"
                  />
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
          v-else-if="activeTab === 'coverage'"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px]">
            <thead class="bg-slate-50">
            <tr class="text-left text-[10px] font-bold uppercase text-slate-400">
              <th class="px-5 py-3">Date</th>
              <th class="px-4 py-3">Service</th>
              <th class="px-4 py-3">Mode</th>
              <th class="px-4 py-3">Minimum</th>
              <th class="px-4 py-3">Cible</th>
              <th class="px-4 py-3">Affectés</th>
              <th class="px-5 py-3">État</th>
            </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
            <tr
                v-for="coverage in suggestion.diagnostics.coverage"
                :key="`${coverage.date}-${coverage.requirementGuid}`"
            >
              <td class="px-5 py-3 text-xs font-semibold text-slate-700">
                {{ formatDate(coverage.date) }}
              </td>
              <td class="px-4 py-3 text-xs text-slate-600">
                {{ coverage.templateName }}
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">
                {{ ALLOCATION_LABELS[coverage.allocationMode] }}
              </td>
              <td class="px-4 py-3 text-xs text-slate-600">
                {{ coverage.minimum }}
              </td>
              <td class="px-4 py-3 text-xs text-slate-600">
                {{ coverage.target }}
              </td>
              <td class="px-4 py-3 text-xs font-bold text-slate-800">
                {{ coverage.assigned }}
              </td>
              <td class="px-5 py-3">
                                    <span
                                        class="rounded-full px-2 py-1 text-[9px] font-bold"
                                        :class="coverage.status === 'COVERED'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-red-50 text-red-700'"
                                    >
                                        {{ coverageLabel(coverage.status) }}
                                    </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="space-y-3">
        <PlanningInfoPanel
            v-if="!suggestion.diagnostics.violations.length"
            tone="success"
            title="Aucune violation détectée"
            description="Le moteur n’a retourné aucune contrainte dure ou alerte sur cette suggestion."
        />

        <article
            v-for="violation in suggestion.diagnostics.violations"
            :key="`${violation.code}-${violation.date}-${violation.employeeGuid}`"
            class="rounded-2xl border p-4"
            :class="violation.severity === 'HARD'
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'"
        >
          <div class="flex items-start gap-3">
            <IconAlertTriangle
                :size="18"
                :class="violation.severity === 'HARD'
                                ? 'text-red-600'
                                : 'text-amber-600'"
            />
            <div>
              <div class="flex gap-2">
                <p class="text-xs font-bold text-slate-900">
                  {{ violation.code }}
                </p>
                <span
                    class="text-[9px] font-bold uppercase"
                    :class="violation.severity === 'HARD'
                                        ? 'text-red-700'
                                        : 'text-amber-700'"
                >
                                    {{ violation.severity }}
                                </span>
              </div>
              <p class="mt-1 text-xs leading-5 text-slate-600">
                {{ violation.message }}
              </p>
              <p
                  v-if="violation.date"
                  class="mt-1 text-[10px] text-slate-400"
              >
                {{ formatDate(violation.date) }}
              </p>
            </div>
          </div>
        </article>
      </section>
    </template>

    <SuggestionCellEditor
        :open="cellEditorOpen"
        :suggestion-guid="suggestion?.guid ?? ''"
        :item="selectedItem"
        :iso="selectedIso"
        :templates="templates"
        @close="cellEditorOpen = false"
        @saved="onCellSaved"
    />

    <PlanningConfirmDialog
        :open="confirmAction !== null"
        :danger="confirmAction === 'reject'"
        :loading="actionLoading"
        :title="confirmAction === 'approve'
                ? 'Valider et publier ce planning ?'
                : 'Rejeter cette suggestion ?'"
        :description="confirmAction === 'approve'
                ? 'Les affectations officielles seront créées pour les collaborateurs et remplaceront les affectations qui chevauchent la période.'
                : 'Cette proposition ne sera pas publiée et quittera la liste principale.'"
        :important="confirmAction === 'approve'
                ? 'Vérifiez les gardes, les congés hebdomadaires, les repos post-garde et les cellules modifiées manuellement.'
                : 'Le rejet ne modifie aucun planning déjà publié.'"
        :confirm-label="confirmAction === 'approve'
                ? 'Publier le planning'
                : 'Rejeter la suggestion'"
        @cancel="confirmAction = null"
        @confirm="resolveAction"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onMounted,
  ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCircleCheck,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-vue'

import SessionTemplateService from '@/service/SessionTemplate'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'

import PlanningConfirmDialog from '../components/PlanningConfirmDialog.vue'
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue'
import PlanningPageHeader from '../components/PlanningPageHeader.vue'
import SuggestionCellEditor from './SuggestionCellEditor.vue'
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
const activeTab = ref<'planning' | 'coverage' | 'issues'>('planning')
const cellEditorOpen = ref(false)
const selectedItem = ref<ScheduleSuggestionItem | null>(null)
const selectedIso = ref('')
const confirmAction = ref<'approve' | 'reject' | null>(null)
const actionLoading = ref(false)

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

const solverLabel = computed(() => {
  const solver = suggestion.value?.diagnostics.solver

  return solver
      ? `${solver.usedSolver}${solver.fallbackUsed ? ' · fallback' : ''}`
      : '—'
})

type GuardPoolView = SuggestionGuardPool & {
  selectionModeLabel: string
  employees: Array<{
    guid: string
    name: string
    employeeCode: string | null
    resolved: boolean
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

  return [...(currentSuggestion.diagnostics.guardPools ?? [])]
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
            employeeCode: item?.user.employee_code ?? null,
            resolved: Boolean(item),
          }
        }),
      }))
})

const hardViolations = computed(() =>
    suggestion.value?.diagnostics.violations.filter(
        (violation) => violation.severity === 'HARD',
    ) ?? [],
)

const belowMinimumCoverage = computed(() =>
    suggestion.value?.diagnostics.coverage.filter(
        (coverage) => coverage.status === 'BELOW_MINIMUM',
    ) ?? [],
)

const canApprove = computed(
    () =>
        Boolean(suggestion.value) &&
        hardViolations.value.length === 0 &&
        belowMinimumCoverage.value.length === 0,
)

const approveBlocker = computed(() => {
  if (hardViolations.value.length > 0) {
    return `${hardViolations.value.length} violation(s) dure(s) empêchent la publication.`
  }

  if (belowMinimumCoverage.value.length > 0) {
    return `${belowMinimumCoverage.value.length} besoin(s) sont sous le minimum obligatoire.`
  }

  return ''
})

const calendarDays = computed(() => {
  if (!suggestion.value) return []

  const scheduleDates = suggestion.value.items.flatMap((item) =>
      Object.keys(item.schedule),
  )

  const maximumDate =
      scheduleDates.sort().at(-1) ?? suggestion.value.period_to

  const result: Array<{
    iso: string
    shortLabel: string
    dayMonth: string
    weekend: boolean
    outsidePeriod: boolean
  }> = []

  const current = new Date(
      `${suggestion.value.period_from}T12:00:00`,
  )
  const end = new Date(`${maximumDate}T12:00:00`)

  while (current <= end) {
    const iso = current.toISOString().slice(0, 10)

    result.push({
      iso,
      shortLabel: new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
      })
          .format(current)
          .replace('.', ''),
      dayMonth: new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }).format(current),
      weekend: [0, 6].includes(current.getDay()),
      outsidePeriod: iso > suggestion.value.period_to,
    })

    current.setDate(current.getDate() + 1)
  }

  return result
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

    suggestion.value =
        responseData(suggestionResponse).suggestion ?? null

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

function initials(name: string): string {
  return name
      .split(/\s+/)
      .slice(0, 2)
      .map((value) => value[0])
      .join('')
      .toUpperCase()
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
    FIXED: 'border-indigo-100 bg-indigo-50 text-indigo-800',
    GENERATED: isGuard(item, iso)
        ? 'border-violet-100 bg-violet-50 text-violet-800'
        : 'border-blue-100 bg-blue-50 text-blue-800',
    FILL_REMAINING:
        'border-cyan-100 bg-cyan-50 text-cyan-800',
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

function cellTime(
    item: ScheduleSuggestionItem,
    iso: string,
): string {
  if (!(iso in item.schedule)) return ''

  const templateGuid = item.schedule[iso]
  if (!templateGuid) return '—'

  const template = templateMap.value.get(templateGuid)
  const day = dayKeys[new Date(`${iso}T12:00:00`).getDay()]
  const blocks = template?.definition?.[day]

  return Array.isArray(blocks) && blocks.length
      ? `${blocks[0].work[0]}–${blocks[0].work[1]}`
      : 'Horaire'
}

function openCell(
    item: ScheduleSuggestionItem,
    iso: string,
): void {
  if (!(iso in item.schedule)) return

  selectedItem.value = item
  selectedIso.value = iso
  cellEditorOpen.value = true
}

async function onCellSaved(): Promise<void> {
  cellEditorOpen.value = false
  await load()
}

async function resolveAction(): Promise<void> {
  if (!suggestion.value || !confirmAction.value) return

  if (confirmAction.value === 'approve' && !canApprove.value) {
    errorMessage.value = approveBlocker.value
    confirmAction.value = null
    return
  }

  const action = confirmAction.value
  actionLoading.value = true

  try {
    const response =
        action === 'approve'
            ? await ScheduleSuggestionService.approve(
                suggestion.value.guid,
            )
            : await ScheduleSuggestionService.reject(
                suggestion.value.guid,
            )

    if (!response?.success) throw response

    confirmAction.value = null

    await router.push({
      name:
          action === 'approve'
              ? 'schedule-assignment'
              : 'planning-suggestion-list',
    })
  } catch (error: any) {
    errorMessage.value = responseError(
        error,
        'Cette action n’a pas pu être exécutée.',
    )
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

const Score = defineComponent({
  props: {
    label: String,
    value: Number,
  },
  setup(props) {
    return () =>
        h('div', { class: 'bg-white p-5' }, [
          h(
              'p',
              {
                class: 'text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400',
              },
              props.label,
          ),
          h(
              'p',
              {
                class: 'mt-1 text-2xl font-bold text-slate-900',
              },
              `${props.value ?? 0}%`,
          ),
        ])
  },
})

const Info = defineComponent({
  props: {
    label: String,
    value: String,
  },
  setup(props) {
    return () =>
        h('div', { class: 'bg-white p-5' }, [
          h(
              'p',
              {
                class: 'text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400',
              },
              props.label,
          ),
          h(
              'p',
              {
                class: 'mt-1 text-lg font-bold text-slate-900',
              },
              props.value,
          ),
        ])
  },
})

const Legend = defineComponent({
  props: {
    label: String,
    tone: String,
  },
  setup(props) {
    const colors: Record<string, string> = {
      indigo: 'bg-indigo-500',
      blue: 'bg-blue-500',
      violet: 'bg-violet-500',
      rose: 'bg-rose-500',
      amber: 'bg-amber-500',
      slate: 'bg-slate-400',
      empty: 'border border-dashed border-slate-400 bg-white',
    }

    return () =>
        h(
            'span',
            {
              class: 'inline-flex items-center gap-2 text-[10px] font-semibold text-slate-500',
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

onMounted(load)
</script>

<style scoped>
.primary-button,
.secondary-button,
.danger-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  padding: 0.65rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.primary-button {
  background: #4f46e5;
  color: #fff;
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
}

.danger-button {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
}

.tab-button {
  border-radius: 0.55rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #64748b;
}

.tab-button.active {
  background: #0f172a;
  color: #fff;
}

.cell-card {
  position: relative;
  width: 100%;
  min-height: 48px;
  border-width: 1px;
  border-radius: 0.7rem;
  padding: 0.45rem 0.4rem;
  text-align: center;
  transition: 0.14s;
}

.cell-card:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgb(15 23 42 / 0.08);
}

.cell-card:disabled {
  cursor: default;
}
</style>
