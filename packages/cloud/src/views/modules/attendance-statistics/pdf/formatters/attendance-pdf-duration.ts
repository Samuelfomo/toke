export interface AttendancePdfDurationFormatOptions {
    emptyLabel?: string;
    fractionDigits?: number;
}

/**
 * Formate une durée en heures décimales mathématiques pour les rapports PDF.
 * Exemple : 112 h 52 min = 112,87 h.
 *
 * La valeur source reste exprimée en minutes côté API. Le PDF effectue uniquement
 * la conversion d'unité minutes -> heures pour la présentation.
 */
export function formatAttendancePdfDuration(
    minutes: number | null,
    options: AttendancePdfDurationFormatOptions = {},
): string {
    const emptyLabel = options.emptyLabel ?? '—';
    const fractionDigits = options.fractionDigits ?? 2;

    if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return emptyLabel;

    return (minutes / 60).toFixed(fractionDigits).replace('.', ',');
}

export function formatAttendancePdfDurationDelta(minutes: number): string {
    if (!Number.isFinite(minutes)) return '—';
    if (minutes === 0) return '0,00';

    const sign = minutes > 0 ? '+' : '-';
    return `${sign}${formatAttendancePdfDuration(Math.abs(minutes))}`;
}
