const BUSINESS_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/**
 * Affiche exactement l'heure métier fournie par le serveur.
 * Aucune conversion Date, UTC ou locale n'est appliquée.
 */
export function formatBusinessTime(value: string | null, emptyLabel = '—'): string {
  if (value === null || value.trim() === '') return emptyLabel;
  const normalized = value.trim();
  return BUSINESS_TIME_PATTERN.test(normalized) ? normalized.slice(0, 5) : normalized;
}
