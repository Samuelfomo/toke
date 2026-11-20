import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue';

import type {
  AttendanceOverview,
  AttendanceStatisticsFilters,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import type { AttendanceStatisticsServiceError } from '../services/attendance-statistics.service.js';
import { describeAttendancePeriod } from '../utils/attendance-period.js';
import { resolveAttendanceOverviewPageState } from '../utils/attendance-overview-state.js';

import { useAttendanceStatistics } from './useAttendanceStatistics.js';

import type {
  AttendanceFiltersSubmission,
  AttendanceOverviewPageState,
  AttendancePeriodPreset,
} from '@/views/modules/attendance-statistics';

export interface UseAttendanceOverviewPageOptions {
  service: import('../services/attendance-statistics.service.js').AttendanceStatisticsService;
  businessToday: BusinessDate;
  initialFilters: AttendanceStatisticsFilters;
  initialPreset?: AttendancePeriodPreset;
  autoLoad?: boolean;
}

export interface UseAttendanceOverviewPageResult {
  filters: Ref<AttendanceStatisticsFilters>;
  overview: Readonly<Ref<AttendanceOverview | null>>;
  error: Readonly<Ref<AttendanceStatisticsServiceError | null>>;
  isLoading: Readonly<Ref<boolean>>;
  isRefreshing: Readonly<Ref<boolean>>;
  pageState: ComputedRef<AttendanceOverviewPageState>;
  periodLabel: ComputedRef<string>;
  activePreset: Ref<AttendancePeriodPreset>;
  hasStaleDataWarning: ComputedRef<boolean>;
  initialize: () => Promise<AttendanceOverview | null>;
  applyFilters: (submission: AttendanceFiltersSubmission) => Promise<AttendanceOverview | null>;
  resetFilters: () => Promise<AttendanceOverview | null>;
  refresh: () => Promise<AttendanceOverview | null>;
  retry: () => Promise<AttendanceOverview | null>;
}

export function useAttendanceOverviewPage(
  options: UseAttendanceOverviewPageOptions,
): UseAttendanceOverviewPageResult {
  const initialPreset = options.initialPreset ?? 'current_month';
  const activePreset = ref<AttendancePeriodPreset>(initialPreset);

  const statistics = useAttendanceStatistics({
    service: options.service,
    initialFilters: options.initialFilters,
    businessToday: options.businessToday,
    autoLoad: false,
  });

  const pageState = computed<AttendanceOverviewPageState>(() =>
    resolveAttendanceOverviewPageState({
      hasData: statistics.hasData.value,
      isLoading: statistics.isLoading.value,
      hasError: statistics.error.value !== null,
      teamSize: statistics.overview.value?.scope.teamSize ?? null,
    }),
  );

  const periodLabel = computed(() =>
    describeAttendancePeriod(statistics.filters.value.startDate, statistics.filters.value.endDate),
  );

  const hasStaleDataWarning = computed(
    () => statistics.overview.value !== null && statistics.error.value !== null,
  );

  function initialize(): Promise<AttendanceOverview | null> {
    return statistics.load();
  }

  async function applyFilters(
    submission: AttendanceFiltersSubmission,
  ): Promise<AttendanceOverview | null> {
    activePreset.value = submission.preset;
    return statistics.setFilters(submission.filters, true);
  }

  async function resetFilters(): Promise<AttendanceOverview | null> {
    activePreset.value = initialPreset;
    return statistics.resetFilters(true);
  }

  function refresh(): Promise<AttendanceOverview | null> {
    return statistics.refresh();
  }

  function retry(): Promise<AttendanceOverview | null> {
    return statistics.load();
  }

  if (options.autoLoad !== false) {
    onMounted(() => {
      void initialize();
    });
  }

  return {
    filters: statistics.filters,
    overview: statistics.overview,
    error: statistics.error,
    isLoading: statistics.isLoading,
    isRefreshing: statistics.isRefreshing,
    pageState,
    periodLabel,
    activePreset,
    hasStaleDataWarning,
    initialize,
    applyFilters,
    resetFilters,
    refresh,
    retry,
  };
}
