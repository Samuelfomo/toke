<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AttendanceAnalysisContextBar from '../components/AttendanceAnalysisContextBar.vue';
import AttendanceAttentionEmployees from '../components/AttendanceAttentionEmployees.vue';
import AttendanceDataQualityAlert from '../components/AttendanceDataQualityAlert.vue';
import AttendanceFilters from '../components/AttendanceFilters.vue';
import AttendanceEmployeesSection from '../components/AttendanceEmployeesSection.vue';
import AttendanceKpiDrilldown from '../components/AttendanceKpiDrilldown.vue';
import AttendanceKpiGrid from '../components/AttendanceKpiGrid.vue';
import AttendanceIssuesSection from '../components/AttendanceIssuesSection.vue';
import AttendanceLargeDatasetNotice from '../components/AttendanceLargeDatasetNotice.vue';
import AttendanceOverviewEmptyState from '../components/AttendanceOverviewEmptyState.vue';
import AttendanceOverviewErrorState from '../components/AttendanceOverviewErrorState.vue';
import AttendanceOverviewHeader from '../components/AttendanceOverviewHeader.vue';
import AttendanceOverviewSkeleton from '../components/AttendanceOverviewSkeleton.vue';
import AttendancePdfExportDialog from '../components/AttendancePdfExportDialog.vue';
import AttendanceSecondaryInsights from '../components/AttendanceSecondaryInsights.vue';
import AttendanceStatusDistribution from '../components/AttendanceStatusDistribution.vue';
import AttendanceVisualizations from '../components/AttendanceVisualizations.vue';
import type { AttendanceStatisticsService } from '../services/attendance-statistics.service.js';
import type { AttendanceStatus, BusinessDate } from '../types/attendance-statistics.types.js';
import type { AttendanceIssue } from '../types/attendance-statistics.types.js';
import type { AttendanceIssueTarget } from '../utils/attendance-issues.js';
import type { AttendanceDataQualityMetricId } from '../utils/attendance-data-quality.js';
import { getAttendanceDataQualityNavigationTarget } from '../utils/attendance-data-quality.js';
import type { AttendanceDashboardAction, AttendancePrimaryKpiId } from '../utils/attendance-dashboard-actions.js';
import {
  clearAttendanceAnalysisDate,
  clearAttendanceAnalysisStatus,
  createAttendanceAnalysisContext,
  getAttendanceAnalysisEmployeeCount,
  isAttendanceAnalysisContextValid,
  type AttendanceAnalysisContext,
} from '../utils/attendance-analysis-context.js';
import type { AttendanceFiltersSubmission, AttendancePeriodPreset, AttendanceSiteOption } from '../types/attendance-statistics.ui.types.js';
import { useAttendanceOverviewPage } from '../composables/useAttendanceOverviewPage.js';
import { getAttendancePeriodForPreset } from '../utils/attendance-period.js';
import { getAttendanceDataQualityLevel } from '../utils/attendance-status.js';
import type { AttendancePdfExportMode, AttendancePdfPresentationContext } from '../pdf/types/attendance-pdf.types.js';
import type { AttendanceJsPdfLoader } from '../pdf/integration/attendance-pdf-runtime.js';
import { buildAttendancePdfPresentationContext } from '../pdf/integration/attendance-pdf-ui.js';

interface Props {
  service: AttendanceStatisticsService;
  managerGuid: string;
  businessToday: BusinessDate;
  managerName?: string;
  siteOptions?: readonly AttendanceSiteOption[];
  initialSiteGuid?: string | null;
  initialStartDate?: BusinessDate;
  initialEndDate?: BusinessDate;
  initialPreset?: AttendancePeriodPreset;
  title?: string;
  pdfPresentationContext?: AttendancePdfPresentationContext;
  loadJsPdf?: AttendanceJsPdfLoader;
}

const props = withDefaults(defineProps<Props>(), {
  managerName: '',
  siteOptions: () => [],
  initialSiteGuid: null,
  initialPreset: 'current_month',
  title: 'Statistiques de présence',
});

const defaultPeriod = getAttendancePeriodForPreset(props.initialPreset, props.businessToday);
const page = useAttendanceOverviewPage({
  service: props.service,
  businessToday: props.businessToday,
  initialPreset: props.initialPreset,
  initialFilters: {
    managerGuid: props.managerGuid,
    siteGuid: props.initialSiteGuid,
    startDate: props.initialStartDate ?? defaultPeriod.startDate,
    endDate: props.initialEndDate ?? defaultPeriod.endDate,
  },
});

const employeesSectionRef = ref<InstanceType<typeof AttendanceEmployeesSection> | null>(null);
const issuesSectionRef = ref<InstanceType<typeof AttendanceIssuesSection> | null>(null);
const selectedKpiId = ref<AttendancePrimaryKpiId | null>(null);
const analysisContext = ref<AttendanceAnalysisContext | null>(null);
const filtersOpen = ref(false);
const pdfExportOpen = ref(false);
const pdfExportMode = ref<AttendancePdfExportMode>('period_summary');
const pdfExportEmployeeGuid = ref<string | null>(null);
const pdfExportIssue = ref<AttendanceIssue | null>(null);
const pdfExportFeedback = ref<string | null>(null);


function handleDataQualityMetricExplore(metricId: AttendanceDataQualityMetricId): void {
  const target = getAttendanceDataQualityNavigationTarget(metricId);

  if (target.type === 'issue') {
    analysisContext.value = createAttendanceAnalysisContext({
      source: 'quality',
      issue: target.issue,
      label: target.label,
    });
    issuesSectionRef.value?.focusIssue(target.issue);
    return;
  }

  analysisContext.value = createAttendanceAnalysisContext({
    source: 'quality',
    label: target.label,
  });
  issuesSectionRef.value?.focusFamily(target.family);
}

function handleDayStatusExplore(payload: { date: BusinessDate; status: 'ABSENT' | 'LATE' }): void {
  analysisContext.value = createAttendanceAnalysisContext({
    source: 'trend',
    date: payload.date,
    status: payload.status,
  });
  employeesSectionRef.value?.applyDayStatusFilter(payload.date, payload.status);
}

function handlePeriodStatusExplore(status: AttendanceStatus): void {
  analysisContext.value = createAttendanceAnalysisContext({
    source: 'status_distribution',
    status,
  });
  employeesSectionRef.value?.applyStatusFilter(status);
}

function openIssueTarget(target: AttendanceIssueTarget): void {
  analysisContext.value = createAttendanceAnalysisContext({
    source: 'issues',
    date: target.date as BusinessDate,
    employeeGuid: target.employeeGuid,
    employeeName: target.employeeName,
    issue: target.issue,
  });
  employeesSectionRef.value?.openEmployee(target.employeeGuid, target.date as BusinessDate);
}

function openAttentionEmployee(employeeGuid: string): void {
  const employee = page.overview.value?.employees.find((item) => item.employeeGuid === employeeGuid) ?? null;
  analysisContext.value = createAttendanceAnalysisContext({
    source: 'attention',
    employeeGuid,
    employeeName: employee?.employeeName ?? null,
    label: employee ? `${employee.employeeName} · éléments à examiner` : 'Employé à examiner',
  });
  employeesSectionRef.value?.openEmployee(employeeGuid, null);
}

function showAllAttentionEmployees(): void {
  analysisContext.value = createAttendanceAnalysisContext({
    source: 'attention',
    label: 'Employés avec éléments à examiner',
  });
  employeesSectionRef.value?.applyIssuesFilter('with_issues');
}

function handleKpiSelect(id: AttendancePrimaryKpiId): void {
  selectedKpiId.value = selectedKpiId.value === id ? null : id;
}

function handleDashboardAction(action: AttendanceDashboardAction): void {
  if (action.type === 'filter_employees') {
    analysisContext.value = createAttendanceAnalysisContext({
      source: 'kpi',
      status: action.status,
      label: action.label,
    });
    employeesSectionRef.value?.applyStatusFilter(action.status);
    return;
  }
  if (action.type === 'show_all_employees_with_issues') {
    analysisContext.value = createAttendanceAnalysisContext({ source: 'kpi', label: action.label });
    employeesSectionRef.value?.applyIssuesFilter('with_issues');
    return;
  }
  analysisContext.value = createAttendanceAnalysisContext({ source: 'kpi', label: action.label });
  issuesSectionRef.value?.focusSection();
}

function clearAnalysisContext(): void {
  analysisContext.value = null;
  employeesSectionRef.value?.resetAnalysisFilters();
}

function clearAnalysisDate(): void {
  if (!analysisContext.value) return;
  analysisContext.value = clearAttendanceAnalysisDate(analysisContext.value);
  employeesSectionRef.value?.clearDateFilter();
}

function clearAnalysisStatus(): void {
  if (!analysisContext.value) return;
  analysisContext.value = clearAttendanceAnalysisStatus(analysisContext.value);
  employeesSectionRef.value?.clearStatusFilter();
}

function handleManualEmployeeFilters(): void {
  analysisContext.value = null;
}

function handleOverviewFiltersApply(submission: AttendanceFiltersSubmission): void {
  analysisContext.value = null;
  selectedKpiId.value = null;
  employeesSectionRef.value?.resetAnalysisFilters();
  filtersOpen.value = false;
  page.applyFilters(submission);
}

function handleOverviewFiltersReset(): void {
  analysisContext.value = null;
  selectedKpiId.value = null;
  employeesSectionRef.value?.resetAnalysisFilters();
  filtersOpen.value = false;
  page.resetFilters();
}

function openPdfExport(
  mode: AttendancePdfExportMode,
  options: { employeeGuid?: string | null; issue?: AttendanceIssue | null } = {},
): void {
  if (!page.overview.value) return;
  pdfExportMode.value = mode;
  pdfExportEmployeeGuid.value = options.employeeGuid ?? null;
  pdfExportIssue.value = options.issue ?? null;
  pdfExportFeedback.value = null;
  pdfExportOpen.value = true;
}

function openEmployeePdfExport(employeeGuid: string): void {
  openPdfExport('employee_sheet', { employeeGuid });
}

function handlePdfPreviewed(filename: string): void {
  pdfExportFeedback.value = `Aperçu PDF ouvert : ${filename}`;
}

const selectedSiteName = computed(() => {
  const siteGuid = page.overview.value?.scope.siteGuid ?? null;
  if (!siteGuid) return null;
  return props.siteOptions.find((site) => site.guid === siteGuid)?.name ?? null;
});

const resolvedPdfPresentationContext = computed(() =>
  buildAttendancePdfPresentationContext({
    ...(props.pdfPresentationContext ? { base: props.pdfPresentationContext } : {}),
    ...(props.managerName ? { managerName: props.managerName } : {}),
    siteName: selectedSiteName.value,
  }),
);

const analysisEmployeeCount = computed(() =>
  page.overview.value ? getAttendanceAnalysisEmployeeCount(page.overview.value, analysisContext.value) : 0,
);

watch(
  () => page.overview.value,
  (overview) => {
    if (overview && analysisContext.value && !isAttendanceAnalysisContextValid(overview, analysisContext.value)) {
      analysisContext.value = null;
      employeesSectionRef.value?.resetAnalysisFilters();
    }
  },
);

const qualityLevel = computed(() =>
  page.overview.value ? getAttendanceDataQualityLevel(page.overview.value.dataQuality) : null,
);
const errorMessage = computed(() => page.error.value?.message ?? "Une erreur inattendue empêche l'affichage des statistiques.");
const liveMessage = computed(() => {
  if (page.isRefreshing.value) return 'Actualisation des statistiques en cours.';
  if (page.pageState.value === 'loading') return 'Chargement des statistiques en cours.';
  if (page.pageState.value === 'error') return `Chargement impossible. ${errorMessage.value}`;
  if (page.pageState.value === 'empty') return 'Aucun collaborateur dans le périmètre chargé.';
  if (page.overview.value) return `Statistiques chargées pour ${page.overview.value.scope.teamSize} collaborateur${page.overview.value.scope.teamSize > 1 ? 's' : ''}.`;
  return '';
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
    <nav aria-label="Accès rapide au contenu" class="sr-only focus-within:not-sr-only">
      <div class="fixed left-4 top-4 z-[70] flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-xl">
        <a href="#attendance-main-content" class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller au contenu</a>
        <a href="#attendance-issues" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller aux anomalies</a>
        <a href="#attendance-employees" class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller aux employés</a>
      </div>
    </nav>

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</p>

    <div class="mx-auto max-w-[1600px] space-y-5">
      <AttendanceOverviewHeader
        :title="title"
        :manager-name="managerName"
        :period-label="page.periodLabel.value"
        :overview="page.overview.value"
        :quality="page.overview.value?.dataQuality ?? null"
        :is-refreshing="page.isRefreshing.value"
        :filters-open="filtersOpen"
        :can-export="page.pageState.value === 'ready' && page.overview.value !== null"
        @toggle-filters="filtersOpen = !filtersOpen"
        @refresh="page.refresh"
        @export="openPdfExport('period_summary')"
      />

      <p v-if="pdfExportFeedback" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900" role="status">
        {{ pdfExportFeedback }}
      </p>

      <div id="attendance-filters-panel" v-show="filtersOpen">
        <AttendanceFilters
          :model-value="page.filters.value"
          :business-today="businessToday"
          :site-options="siteOptions"
          :active-preset="page.activePreset.value"
          :disabled="page.isLoading.value || page.isRefreshing.value"
          @apply="handleOverviewFiltersApply"
          @reset="handleOverviewFiltersReset"
        />
      </div>

      <div v-if="page.hasStaleDataWarning.value" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        L'actualisation a échoué. Les dernières données chargées restent affichées.
        <button type="button" class="ml-1 font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700" @click="page.retry">Réessayer</button>
      </div>

      <main id="attendance-main-content" tabindex="-1" class="outline-none">
        <AttendanceOverviewSkeleton v-if="page.pageState.value === 'loading'" />
        <AttendanceOverviewErrorState v-else-if="page.pageState.value === 'error'" :message="errorMessage" @retry="page.retry" />
        <AttendanceOverviewEmptyState v-else-if="page.pageState.value === 'empty'" :manager-name="managerName" />

        <template v-else-if="page.pageState.value === 'ready' && page.overview.value">
          <slot name="dashboard" :overview="page.overview.value" :filters="page.filters.value" :refresh="page.refresh">
            <div class="space-y-6">
              <AttendanceDataQualityAlert v-if="qualityLevel !== 'reliable'" :quality="page.overview.value.dataQuality" @explore-metric="handleDataQualityMetricExplore" />

              <AttendanceKpiGrid :overview="page.overview.value" :selected-kpi-id="selectedKpiId" @select="handleKpiSelect" />
              <AttendanceKpiDrilldown :overview="page.overview.value" :kpi-id="selectedKpiId" @action="handleDashboardAction" @close="selectedKpiId = null" />

              <AttendanceAnalysisContextBar
                :context="analysisContext"
                :employee-count="analysisEmployeeCount"
                @clear="clearAnalysisContext"
                @clear-date="clearAnalysisDate"
                @clear-status="clearAnalysisStatus"
                @export="openPdfExport('current_analysis')"
              />

              <AttendanceVisualizations
                :overview="page.overview.value"
                :active-date="analysisContext?.date ?? null"
                @explore-day-status="handleDayStatusExplore"
              />

              <div class="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                <AttendanceIssuesSection ref="issuesSectionRef" :issues="page.overview.value.issues" @view-employee="openIssueTarget" @export="openPdfExport('issues_only')" />
                <AttendanceStatusDistribution
                  :overview="page.overview.value"
                  :active-status="analysisContext?.status ?? null"
                  @explore-status="handlePeriodStatusExplore"
                />
              </div>

              <AttendanceAttentionEmployees :employees="page.overview.value.employees" @view-employee="openAttentionEmployee" @view-all="showAllAttentionEmployees" />

              <AttendanceEmployeesSection
                ref="employeesSectionRef"
                :employees="page.overview.value.employees"
                @manual-filter-change="handleManualEmployeeFilters"
                @export-employee="openEmployeePdfExport"
              />

              <AttendanceSecondaryInsights :overview="page.overview.value" />
              <AttendanceLargeDatasetNotice :overview="page.overview.value" />

              <slot name="after-kpis" :overview="page.overview.value" :filters="page.filters.value" :refresh="page.refresh" />
            </div>
          </slot>
        </template>
      </main>
    </div>

    <AttendancePdfExportDialog
      :open="pdfExportOpen"
      :overview="page.overview.value"
      :analysis-context="analysisContext"
      :presentation-context="resolvedPdfPresentationContext"
      :initial-mode="pdfExportMode"
      :initial-employee-guid="pdfExportEmployeeGuid"
      :initial-issue="pdfExportIssue"
      :load-js-pdf="loadJsPdf"
      @close="pdfExportOpen = false"
      @previewed="handlePdfPreviewed"
    />
  </div>
</template>
