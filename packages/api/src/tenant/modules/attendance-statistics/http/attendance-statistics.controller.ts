import type { Request, Response } from 'express';
import { HttpStatus } from '@toke/shared';

import R from '../../../../tools/response.js';
import {
  AttendanceStatisticsError,
  AttendanceStatisticsService,
} from '../application/attendance-statistics.service.js';
import { TenantAttendanceStatisticsAdapter } from '../infrastructure/tenant-attendance-statistics.adapter.js';

import { parseAttendanceOverviewQuery } from './attendance-statistics.query.js';

export class AttendanceStatisticsController {
  constructor(private readonly service: AttendanceStatisticsService) {}

  overview = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseAttendanceOverviewQuery(
      req.query as Record<string, unknown>,
      this.service.getBusinessToday(),
    );

    if (!parsed.ok) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, parsed.error);
    }

    try {
      const overview = await this.service.getOverview(parsed.value);
      return R.handleSuccess(res, overview);
    } catch (error: unknown) {
      if (error instanceof AttendanceStatisticsError) {
        const code = error.code === 'MANAGER_NOT_FOUND' ? 'manager_not_found' : 'site_not_found';
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code,
          message: error.message,
        });
      }

      console.error('[AttendanceStatisticsController] overview failed', error);

      if (error instanceof Error) {
        console.error('name:', error.name);
        console.error('message:', error.message);
        console.error('stack:', error.stack);
      }

      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'attendance_statistics_overview_failed',
        message: 'Impossible de générer les statistiques de pointage',
      });
    }
  };
}

export function createAttendanceStatisticsController(): AttendanceStatisticsController {
  const adapter = new TenantAttendanceStatisticsAdapter();
  const service = new AttendanceStatisticsService(adapter);
  return new AttendanceStatisticsController(service);
}
