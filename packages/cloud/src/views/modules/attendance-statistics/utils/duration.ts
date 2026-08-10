export interface DurationFormatOptions {
  emptyLabel?: string;
  showZeroMinutes?: boolean;
}

/**
 * Formate une durée déjà calculée par le backend.
 * Une valeur null reste inconnue et n'est jamais transformée en zéro.
 */
export function formatDurationMinutes(
  minutes: number | null,
  options: DurationFormatOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? '—';
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return emptyLabel;

  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0 && options.showZeroMinutes !== true) return `${hours} h`;
  return `${hours} h ${String(remainingMinutes).padStart(2, '0')} min`;
}

export function formatDelayMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '—';
  if (minutes <= 0) return 'À l’heure';
  return `${Math.round(minutes)} min`;
}
