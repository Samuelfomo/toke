import { AttendanceDayService } from '../../application/attendance-day.service.js';
import { LegacyAttendanceScheduleRepository } from './legacy-attendance-schedule.repository.js';
import { LegacyAttendanceSessionRepository } from './legacy-attendance-session.repository.js';
import { TokeAttendanceScheduleDataSource } from './toke-attendance-schedule.datasource.js';
import { TokeAttendanceSessionDataSource } from './toke-attendance-session.datasource.js';

/**
 * Point de composition destiné au futur contrôleur tenant.
 * Le fuseau doit venir de la configuration du tenant, jamais d'une constante
 * propre au module statistique.
 */
export function createTenantAttendanceDayService(
  businessTimezone: string,
): AttendanceDayService {
  return new AttendanceDayService(
    new LegacyAttendanceSessionRepository(
      new TokeAttendanceSessionDataSource(),
    ),
    new LegacyAttendanceScheduleRepository(
      new TokeAttendanceScheduleDataSource(businessTimezone),
    ),
  );
}
