import {
  AttendanceStatisticsService,
  type AttendanceStatisticsHttpClient,
} from '../services/attendance-statistics.service.js';
import type { BusinessDate } from '../types/attendance-statistics.types.js';
import type { AttendanceSiteOption } from '../types/attendance-statistics.ui.types.js';

export interface AttendanceStatisticsRuntimeOptions {
  httpClient: AttendanceStatisticsHttpClient;
  managerGuid: string;
  businessToday: BusinessDate;
  managerName?: string;
  siteOptions?: readonly AttendanceSiteOption[];
  endpoint?: string;
}

export interface AttendanceStatisticsRuntime {
  service: AttendanceStatisticsService;
  managerGuid: string;
  businessToday: BusinessDate;
  managerName: string;
  siteOptions: readonly AttendanceSiteOption[];
}

/**
 * Point de branchement recommandé avec le véritable frontend manager.
 *
 * Cette fonction ne calcule aucune statistique. Elle assemble uniquement :
 * - le client HTTP déjà authentifié du projet ;
 * - le manager de la session courante ;
 * - la date métier fournie par l'application ;
 * - les sites disponibles pour le filtre.
 */
export function createAttendanceStatisticsRuntime(
  options: AttendanceStatisticsRuntimeOptions,
): AttendanceStatisticsRuntime {
  const managerGuid = options.managerGuid.trim();
  if (!managerGuid) {
    throw new Error('Attendance statistics runtime requires a managerGuid');
  }

  const service = new AttendanceStatisticsService(
    options.httpClient,
    options.endpoint ?? '/attendance/statistics/overview',
  );

  return {
    service,
    managerGuid,
    businessToday: options.businessToday,
    managerName: options.managerName?.trim() ?? '',
    siteOptions: options.siteOptions ?? [],
  };
}
