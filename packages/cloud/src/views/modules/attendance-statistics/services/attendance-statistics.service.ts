import type {
  ApiErrorEnvelope,
  ApiErrorPayload,
  ApiSuccessEnvelope,
  AttendanceOverview,
  AttendanceStatisticsFilters,
  AttendanceStatisticsQueryParams,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import { validateAttendanceStatisticsFilters } from '../utils/business-date.js';

export interface HttpGetOptions {
  params?: Record<string, string>;
  signal?: AbortSignal;
}

/** Compatible avec Axios et avec les clients internes exposant get(url, config). */
export interface AttendanceStatisticsHttpClient {
  get<T>(url: string, options?: HttpGetOptions): Promise<{ data: T }>;
}

export interface GetAttendanceOverviewOptions {
  signal?: AbortSignal;
  businessToday?: BusinessDate;
}

export type AttendanceStatisticsServiceErrorCode =
  | 'invalid_filters'
  | 'request_cancelled'
  | 'invalid_response'
  | 'network_error'
  | string;

export class AttendanceStatisticsServiceError extends Error {
  constructor(
    public readonly code: AttendanceStatisticsServiceErrorCode,
    message: string,
    public readonly status: number | null = null,
    public readonly field: string | null = null,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'AttendanceStatisticsServiceError';
  }
}

export class AttendanceStatisticsService {
  constructor(
    private readonly httpClient: AttendanceStatisticsHttpClient,
    private readonly endpoint = '/attendance/statistics/overview',
  ) {}

  async getOverview(
    filters: AttendanceStatisticsFilters,
    options: GetAttendanceOverviewOptions = {},
  ): Promise<AttendanceOverview> {
    const validation = validateAttendanceStatisticsFilters(filters, options.businessToday);
    if (!validation.ok) {
      throw new AttendanceStatisticsServiceError(
        'invalid_filters',
        validation.error.message,
        null,
        validation.error.field ?? null,
        validation.error,
      );
    }

    const params = this.toQueryParams(filters);

    try {
      const requestOptions: HttpGetOptions = {
        params: params as unknown as Record<string, string>,
      };
      if (options.signal !== undefined) requestOptions.signal = options.signal;

      const response = await this.httpClient.get<ApiSuccessEnvelope<AttendanceOverview>>(
        this.endpoint,
        requestOptions,
      );

      if (!isSuccessEnvelope(response.data) || !isAttendanceOverview(response.data.data)) {
        throw new AttendanceStatisticsServiceError(
          'invalid_response',
          "La réponse de l'API de statistiques ne respecte pas le contrat attendu",
        );
      }

      return response.data.data;
    } catch (error: unknown) {
      if (error instanceof AttendanceStatisticsServiceError) throw error;
      if (isAbortError(error)) {
        throw new AttendanceStatisticsServiceError(
          'request_cancelled',
          'La requête de statistiques a été annulée',
        );
      }

      const normalized = readHttpError(error);
      if (normalized !== null) {
        throw new AttendanceStatisticsServiceError(
          normalized.payload.code,
          normalized.payload.message,
          normalized.status,
          normalized.payload.field ?? null,
          normalized.payload.details ?? null,
        );
      }

      throw new AttendanceStatisticsServiceError(
        'network_error',
        "Impossible de joindre l'API de statistiques de pointage",
      );
    }
  }

  toQueryParams(filters: AttendanceStatisticsFilters): AttendanceStatisticsQueryParams {
    const params: AttendanceStatisticsQueryParams = {
      manager: filters.managerGuid.trim(),
      start_date: filters.startDate,
      end_date: filters.endDate,
    };

    const siteGuid = filters.siteGuid?.trim();
    if (siteGuid) params.site = siteGuid;

    return params;
  }
}

function isSuccessEnvelope(value: unknown): value is ApiSuccessEnvelope<unknown> {
  if (!isRecord(value)) return false;
  return value.success === true && 'data' in value;
}

function isAttendanceOverview(value: unknown): value is AttendanceOverview {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== 'string') return false;
  if (!isRecord(value.period) || !isRecord(value.scope) || !isRecord(value.summary)) return false;
  if (!Array.isArray(value.daily) || !Array.isArray(value.employees) || !Array.isArray(value.issues)) {
    return false;
  }
  if (!isRecord(value.dataQuality)) return false;
  return (
    typeof value.period.startDate === 'string' &&
    typeof value.period.endDate === 'string' &&
    typeof value.period.dayCount === 'number' &&
    typeof value.scope.managerGuid === 'string' &&
    typeof value.scope.teamSize === 'number' &&
    typeof value.dataQuality.reliableForAttendanceRate === 'boolean'
  );
}

function readHttpError(error: unknown): { status: number | null; payload: ApiErrorPayload } | null {
  if (!isRecord(error)) return null;
  const response = error.response;
  if (!isRecord(response)) return null;

  const status = typeof response.status === 'number' ? response.status : null;
  const body = response.data;
  if (!isApiErrorEnvelope(body)) return null;

  return { status, payload: body.error };
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) return false;
  return typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

function isAbortError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.name === 'AbortError' || error.code === 'ERR_CANCELED';
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
