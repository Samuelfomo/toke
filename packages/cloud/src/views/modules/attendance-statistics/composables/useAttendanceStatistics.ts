import { computed, onScopeDispose, ref, shallowRef, type ComputedRef, type Ref } from 'vue';

import type {
  AttendanceDataQualityLevel,
  AttendanceEmployeeOverview,
  AttendanceOverview,
  AttendanceStatisticsFilters,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import {
  AttendanceStatisticsService,
  AttendanceStatisticsServiceError,
} from '../services/attendance-statistics.service.js';
import { getAttendanceDataQualityLevel } from '../utils/attendance-status.js';

export interface UseAttendanceStatisticsOptions {
  service: AttendanceStatisticsService;
  initialFilters: AttendanceStatisticsFilters;
  /** Date métier fournie par l'application ou le serveur, jamais devinée via UTC. */
  businessToday?: BusinessDate;
  autoLoad?: boolean;
}

export interface UseAttendanceStatisticsResult {
  filters: Ref<AttendanceStatisticsFilters>;
  overview: Readonly<Ref<AttendanceOverview | null>>;
  error: Readonly<Ref<AttendanceStatisticsServiceError | null>>;
  isLoading: Readonly<Ref<boolean>>;
  isRefreshing: Readonly<Ref<boolean>>;
  hasData: ComputedRef<boolean>;
  isEmptyTeam: ComputedRef<boolean>;
  dataQualityLevel: ComputedRef<AttendanceDataQualityLevel | null>;
  selectedEmployeeGuid: Ref<string | null>;
  selectedEmployee: ComputedRef<AttendanceEmployeeOverview | null>;
  load: (override?: Partial<AttendanceStatisticsFilters>) => Promise<AttendanceOverview | null>;
  refresh: () => Promise<AttendanceOverview | null>;
  setFilters: (
    patch: Partial<AttendanceStatisticsFilters>,
    reload?: boolean,
  ) => Promise<AttendanceOverview | null>;
  resetFilters: (reload?: boolean) => Promise<AttendanceOverview | null>;
  selectEmployee: (employeeGuid: string | null) => void;
  cancel: () => void;
}

export function useAttendanceStatistics(
  options: UseAttendanceStatisticsOptions,
): UseAttendanceStatisticsResult {
  const initialFilters = cloneFilters(options.initialFilters);
  const filters = ref<AttendanceStatisticsFilters>(cloneFilters(initialFilters));
  const overview = shallowRef<AttendanceOverview | null>(null);
  const error = shallowRef<AttendanceStatisticsServiceError | null>(null);
  const isLoading = ref(false);
  const isRefreshing = ref(false);
  const selectedEmployeeGuid = ref<string | null>(null);

  let activeController: AbortController | null = null;
  let requestSequence = 0;

  const hasData = computed(() => overview.value !== null);
  const isEmptyTeam = computed(() => overview.value?.scope.teamSize === 0);
  const dataQualityLevel = computed(() =>
    overview.value === null ? null : getAttendanceDataQualityLevel(overview.value.dataQuality),
  );
  const selectedEmployee = computed(() => {
    if (overview.value === null || selectedEmployeeGuid.value === null) return null;
    return (
      overview.value.employees.find(
        (employee) => employee.employeeGuid === selectedEmployeeGuid.value,
      ) ?? null
    );
  });

  async function load(
    override: Partial<AttendanceStatisticsFilters> = {},
  ): Promise<AttendanceOverview | null> {
    const nextFilters = { ...filters.value, ...override };
    filters.value = nextFilters;

    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const sequence = ++requestSequence;

    const isFirstLoad = overview.value === null;
    isLoading.value = isFirstLoad;
    isRefreshing.value = !isFirstLoad;
    error.value = null;

    try {
      const requestOptions: { signal: AbortSignal; businessToday?: BusinessDate } = {
        signal: controller.signal,
      };
      if (options.businessToday !== undefined) {
        requestOptions.businessToday = options.businessToday;
      }

      const result = await options.service.getOverview(nextFilters, requestOptions);

      if (sequence !== requestSequence) return null;
      overview.value = result;

      if (
        selectedEmployeeGuid.value !== null &&
        !result.employees.some(
          (employee) => employee.employeeGuid === selectedEmployeeGuid.value,
        )
      ) {
        selectedEmployeeGuid.value = null;
      }

      return result;
    } catch (caught: unknown) {
      if (sequence !== requestSequence) return null;

      const normalized =
        caught instanceof AttendanceStatisticsServiceError
          ? caught
          : new AttendanceStatisticsServiceError(
              'unexpected_error',
              'Une erreur inattendue est survenue lors du chargement des statistiques',
            );

      if (normalized.code !== 'request_cancelled') error.value = normalized;
      return null;
    } finally {
      if (sequence === requestSequence) {
        isLoading.value = false;
        isRefreshing.value = false;
        activeController = null;
      }
    }
  }

  function refresh(): Promise<AttendanceOverview | null> {
    return load();
  }

  async function setFilters(
    patch: Partial<AttendanceStatisticsFilters>,
    reload = false,
  ): Promise<AttendanceOverview | null> {
    filters.value = { ...filters.value, ...patch };
    return reload ? load() : null;
  }

  async function resetFilters(reload = false): Promise<AttendanceOverview | null> {
    filters.value = cloneFilters(initialFilters);
    selectedEmployeeGuid.value = null;
    return reload ? load() : null;
  }

  function selectEmployee(employeeGuid: string | null): void {
    selectedEmployeeGuid.value = employeeGuid;
  }

  function cancel(): void {
    activeController?.abort();
    activeController = null;
  }

  onScopeDispose(cancel);

  if (options.autoLoad === true) {
    void load();
  }

  return {
    filters,
    overview,
    error,
    isLoading,
    isRefreshing,
    hasData,
    isEmptyTeam,
    dataQualityLevel,
    selectedEmployeeGuid,
    selectedEmployee,
    load,
    refresh,
    setFilters,
    resetFilters,
    selectEmployee,
    cancel,
  };
}

function cloneFilters(filters: AttendanceStatisticsFilters): AttendanceStatisticsFilters {
  return {
    managerGuid: filters.managerGuid,
    siteGuid: filters.siteGuid,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}
