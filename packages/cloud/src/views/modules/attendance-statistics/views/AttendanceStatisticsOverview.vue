<script setup lang="ts">
import {computed, ref} from 'vue';

import AttendanceDataQualityAlert from '../components/AttendanceDataQualityAlert.vue';
import AttendanceFilters from '../components/AttendanceFilters.vue';
import AttendanceEmployeesSection from '../components/AttendanceEmployeesSection.vue';
import AttendanceKpiGrid from '../components/AttendanceKpiGrid.vue';
import AttendanceIssuesSection from '../components/AttendanceIssuesSection.vue';
import AttendanceLargeDatasetNotice from '../components/AttendanceLargeDatasetNotice.vue';
import AttendanceOverviewEmptyState from '../components/AttendanceOverviewEmptyState.vue';
import AttendanceOverviewErrorState from '../components/AttendanceOverviewErrorState.vue';
import AttendanceOverviewHeader from '../components/AttendanceOverviewHeader.vue';
import AttendanceOverviewScopeCard from '../components/AttendanceOverviewScopeCard.vue';
import AttendanceOverviewSkeleton from '../components/AttendanceOverviewSkeleton.vue';
import AttendanceVisualizations from '../components/AttendanceVisualizations.vue';
import type {AttendanceStatisticsService} from '@/views/modules/attendance-statistics';
import type {BusinessDate} from '@/views/modules/attendance-statistics';
import type {AttendanceIssueTarget} from '../utils/attendance-issues.js';
import type {
  AttendancePeriodPreset,
  AttendanceSiteOption,
} from '@/views/modules/attendance-statistics';
import {useAttendanceOverviewPage} from '@/views/modules/attendance-statistics';
import {getAttendancePeriodForPreset} from '../utils/attendance-period.js';

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

function openIssueTarget(target: AttendanceIssueTarget): void {
  employeesSectionRef.value?.openEmployee(target.employeeGuid, target.date);
}

const errorMessage = computed(
    () => page.error.value?.message ?? "Une erreur inattendue empêche l'affichage des statistiques.",
);
const liveMessage = computed(() => {
  if (page.isRefreshing.value) return 'Actualisation des statistiques en cours.';
  if (page.pageState.value === 'loading') return 'Chargement des statistiques en cours.';
  if (page.pageState.value === 'error') return `Chargement impossible. ${errorMessage.value}`;
  if (page.pageState.value === 'empty') return 'Aucun collaborateur dans le périmètre chargé.';
  if (page.overview.value) {
    return `Statistiques chargées pour ${page.overview.value.scope.teamSize} collaborateur${page.overview.value.scope.teamSize > 1 ? 's' : ''}.`;
  }
  return '';
});
</script>

<template>
  <div class="min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
    <nav aria-label="Accès rapide au contenu" class="sr-only focus-within:not-sr-only">
      <div class="fixed left-4 top-4 z-[70] flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-xl">
        <a href="#attendance-main-content"
           class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller
          au contenu</a>
        <a href="#attendance-issues"
           class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller
          aux anomalies</a>
        <a href="#attendance-employees"
           class="rounded-lg bg-white px-3 py-2 text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Aller
          aux employés</a>
      </div>
    </nav>

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</p>

    <div class="mx-auto max-w-[1600px] space-y-5">
      <AttendanceOverviewHeader
          :title="title"
          :manager-name="managerName"
          :period-label="page.periodLabel.value"
          :overview="page.overview.value"
          :is-refreshing="page.isRefreshing.value"
          @refresh="page.refresh"
      />

      <AttendanceFilters
          :model-value="page.filters.value"
          :business-today="businessToday"
          :site-options="siteOptions"
          :active-preset="page.activePreset.value"
          :disabled="page.isLoading.value || page.isRefreshing.value"
          @apply="page.applyFilters"
          @reset="page.resetFilters"
      />

      <div
          v-if="page.hasStaleDataWarning.value"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
      >
        L'actualisation a échoué. Les dernières données chargées restent affichées.
        <button
            type="button"
            class="ml-1 font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            @click="page.retry"
        >
          Réessayer
        </button>
      </div>

      <section id="attendance-main-content" tabindex="-1" class="outline-none">
        <AttendanceOverviewSkeleton v-if="page.pageState.value === 'loading'"
                                    :class="page.pageState.value === 'loading' ? 'bg-slate-50' : ''"/>

        <AttendanceOverviewErrorState
            v-else-if="page.pageState.value === 'error'"
            :message="errorMessage"
            @retry="page.retry"
        />

        <AttendanceOverviewEmptyState
            v-else-if="page.pageState.value === 'empty'"
            :manager-name="managerName"
        />

        <template v-else-if="page.pageState.value === 'ready' && page.overview.value">
          <slot
              name="dashboard"
              :overview="page.overview.value"
              :filters="page.filters.value"
              :refresh="page.refresh"
          >
            <div class="space-y-5">
              <AttendanceOverviewScopeCard :overview="page.overview.value"/>
              <AttendanceDataQualityAlert :quality="page.overview.value.dataQuality"/>
              <AttendanceKpiGrid :overview="page.overview.value"/>
              <AttendanceLargeDatasetNotice :overview="page.overview.value"/>
              <AttendanceIssuesSection
                  :issues="page.overview.value.issues"
                  @view-employee="openIssueTarget"
              />
              <AttendanceVisualizations :overview="page.overview.value"/>
              <AttendanceEmployeesSection
                  ref="employeesSectionRef"
                  :employees="page.overview.value.employees"
              />

              <slot
                  name="after-kpis"
                  :overview="page.overview.value"
                  :filters="page.filters.value"
                  :refresh="page.refresh"
              />
            </div>
          </slot>
        </template>
      </section>
    </div>
  </div>
</template>
