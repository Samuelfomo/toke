import { createHash, randomBytes } from 'node:crypto';

import { PointageType, TIME_ENTRIES_ERRORS } from '@toke/shared';

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const TIME_ENTRY_EXTERNAL_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export interface TimeEntryExternalIdContext {
  user?: number;
  local_id?: string | null;
  device?: number | string | null;
  site?: number | string | null;
  qr_code?: number | string | null;
  pointage_type?: PointageType | string | null;
  clocked_at?: Date | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const encodeTime = (timestamp: number): string => {
  let value = BigInt(Math.max(0, Math.floor(timestamp)));
  let result = '';

  for (let index = 0; index < 10; index += 1) {
    result = ULID_ALPHABET.charAt(Number(value % 32n)) + result;
    value /= 32n;
  }

  return result;
};

const encodeEntropy = (bytes: Uint8Array): string => {
  let buffer = 0;
  let bits = 0;
  let result = '';

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += ULID_ALPHABET.charAt((buffer >>> (bits - 5)) & 31);
      bits -= 5;
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }

  return result;
};

const parseTimestamp = (value?: Date | string | null): number | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const normalizeDate = (value?: Date | string | null): string | null => {
  const timestamp = parseTimestamp(value);
  return timestamp === null ? null : new Date(timestamp).toISOString();
};

const hasValue = (value: unknown): boolean =>
  value !== undefined && value !== null && String(value).trim() !== '';

/**
 * Produit une empreinte stable uniquement pour la période de compatibilité
 * avec les anciennes applications qui n'envoient pas encore external_id.
 */
const buildLegacySeed = (context: TimeEntryExternalIdContext): string | null => {
  const localId = context.local_id?.trim();

  if (context.user !== undefined && localId) {
    return `time-entry:legacy-local:${context.user}:${localId}`;
  }

  const clockedAt = normalizeDate(context.clocked_at);
  const hasStableFingerprint =
    context.user !== undefined &&
    hasValue(context.device) &&
    hasValue(context.pointage_type) &&
    clockedAt !== null &&
    hasValue(context.latitude) &&
    hasValue(context.longitude);

  if (!hasStableFingerprint) {
    return null;
  }

  return [
    'time-entry:legacy-fingerprint',
    context.user,
    context.device,
    context.site ?? '',
    context.qr_code ?? '',
    context.pointage_type,
    clockedAt,
    context.latitude,
    context.longitude,
  ].join('|');
};

/**
 * Génère un ULID aléatoire pour un nouveau client, ou déterministe lorsqu'une
 * ancienne application ne transmet pas external_id mais fournit assez de
 * données stables pour reconnaître une nouvelle tentative.
 */
export const generateTimeEntryExternalId = (context: TimeEntryExternalIdContext = {}): string => {
  const seed = buildLegacySeed(context);
  const timestamp = parseTimestamp(context.clocked_at) ?? (seed ? 0 : Date.now());
  const entropy = seed
    ? createHash('sha256').update(seed).digest().subarray(0, 10)
    : randomBytes(10);

  return `${encodeTime(timestamp)}${encodeEntropy(entropy)}`;
};

export const normalizeTimeEntryExternalId = (externalId?: string | null): string | undefined => {
  const normalized = externalId?.trim().toUpperCase();
  return normalized || undefined;
};

/**
 * Retourne l'identifiant fourni lorsqu'il est valide. Pendant la transition,
 * génère un identifiant de compatibilité lorsque la valeur est absente ou vide.
 */
export const resolveTimeEntryExternalId = (
  externalId?: string | null,
  context: TimeEntryExternalIdContext = {},
): string => {
  const normalized = normalizeTimeEntryExternalId(externalId);

  if (normalized) {
    if (!TIME_ENTRY_EXTERNAL_ID_PATTERN.test(normalized)) {
      throw new Error(TIME_ENTRIES_ERRORS.EXTERNAL_ID_INVALID);
    }

    return normalized;
  }

  return generateTimeEntryExternalId(context);
};
