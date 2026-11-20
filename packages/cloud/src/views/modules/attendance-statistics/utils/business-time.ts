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


/**
 * Affiche l'heure métier sans conversion de fuseau. Lorsque la date réelle diffère
 * de la journée de rattachement, la date est ajoutée pour rendre les sessions
 * traversant minuit explicites (ex. 02/09 08:15).
 */
export function formatBusinessTimeWithDate(
  value: string | null,
  actualDate: string | null,
  referenceDate: string,
  emptyLabel = '—',
): string {
  const time = formatBusinessTime(value, emptyLabel);
  if (!value || !actualDate || actualDate === referenceDate) return time;
  const [, month, day] = actualDate.split('-');
  if (!month || !day) return `${actualDate} ${time}`;
  return `${day}/${month} ${time}`;
}
