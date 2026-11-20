export interface PercentageFormatOptions {
  locale?: string;
  maximumFractionDigits?: number;
  nullLabel?: string;
}

/**
 * Formate un taux retourné par l'API. null signifie « non calculable ».
 */
export function formatPercentage(
  value: number | null,
  options: PercentageFormatOptions = {},
): string {
  if (value === null || !Number.isFinite(value)) {
    return options.nullLabel ?? 'Non calculable';
  }

  const formatter = new Intl.NumberFormat(options.locale ?? 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  });
  return `${formatter.format(value)} %`;
}
