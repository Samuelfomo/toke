import { PointageType } from '@toke/shared';

import TimeEntries from '../tenant/class/TimeEntries.js';

const COORDINATE_EPSILON = 0.00000001;

export interface TimeEntryIdempotentRequest {
  pointage_type: PointageType;
  clocked_at: Date;
  latitude: number;
  longitude: number;
  site_id: number | null;
  device_id: number;
  qr_code_id: number | null;
}

export interface TimeEntryIdempotentReplay {
  entry: TimeEntries;
  matches: boolean;
}

const sameInstant = (left?: Date, right?: Date): boolean => {
  if (!left || !right) return false;

  return left.getTime() === right.getTime();
};

const sameCoordinate = (left: number | undefined, right: number): boolean => {
  if (left === undefined) return false;

  return Math.abs(left - right) < COORDINATE_EPSILON;
};

const matchesIdempotentRequest = (
  entry: TimeEntries,
  request: TimeEntryIdempotentRequest,
): boolean => {
  return (
    entry.getPointageType() === request.pointage_type &&
    sameInstant(entry.getClockedAt(), request.clocked_at) &&
    (entry.getSite() ?? null) === request.site_id &&
    entry.getDevice() === request.device_id &&
    (entry.getQrCode() ?? null) === request.qr_code_id &&
    sameCoordinate(entry.getLatitude(), request.latitude) &&
    sameCoordinate(entry.getLongitude(), request.longitude)
  );
};

export const findTimeEntryIdempotentReplay = async (
  userId: number,
  externalId: string,
  request: TimeEntryIdempotentRequest,
): Promise<TimeEntryIdempotentReplay | null> => {
  const existingEntry = await TimeEntries._loadByExternalId(userId, externalId);

  if (!existingEntry) {
    return null;
  }

  return {
    entry: existingEntry,
    matches: matchesIdempotentRequest(existingEntry, request),
  };
};
