/**
 * Convertit les représentations usuelles d'un INTERVAL PostgreSQL en minutes.
 * La fonction reste indépendante de Sequelize afin d'être testable isolément.
 */
export function parsePostgresIntervalMinutes(
  value: string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return null;

  let total = 0;
  let matched = false;

  const dayMatch = /(-?\d+(?:\.\d+)?)\s+days?/.exec(normalized);
  if (dayMatch) {
    total += Number(dayMatch[1]) * 24 * 60;
    matched = true;
  }

  const hourMatch = /(-?\d+(?:\.\d+)?)\s+hours?/.exec(normalized);
  if (hourMatch) {
    total += Number(hourMatch[1]) * 60;
    matched = true;
  }

  const minuteMatch = /(-?\d+(?:\.\d+)?)\s+(?:minutes?|mins?)/.exec(normalized);
  if (minuteMatch) {
    total += Number(minuteMatch[1]);
    matched = true;
  }

  const secondMatch = /(-?\d+(?:\.\d+)?)\s+(?:seconds?|secs?)/.exec(normalized);
  if (secondMatch) {
    total += Number(secondMatch[1]) / 60;
    matched = true;
  }

  const clockMatch = /(?:^|\s)(-?\d+):(\d{2})(?::(\d{2}(?:\.\d+)?))?(?:$|\s)/.exec(
    normalized,
  );
  if (clockMatch) {
    const hours = Number(clockMatch[1]);
    const sign = hours < 0 ? -1 : 1;
    total +=
      hours * 60 +
      sign * Number(clockMatch[2]) +
      (sign * Number(clockMatch[3] ?? 0)) / 60;
    matched = true;
  }

  return matched && Number.isFinite(total) && total >= 0 ? Math.round(total) : null;
}
