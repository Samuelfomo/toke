export class SuggestionApprovalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SuggestionApprovalError';
  }
}

/** Use the real instant and an explicit zone, independently of the server zone. */
export function suggestionApplicationPeriod(
  from: string,
  to: string,
  effectiveFrom: unknown,
  now: Date,
  timeZone: string,
): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string): string => parts.find((value) => value.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  if (effectiveFrom !== undefined) {
    if (
      typeof effectiveFrom !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) ||
      !Number.isFinite(Date.parse(`${effectiveFrom}T00:00:00.000Z`)) ||
      new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString().slice(0, 10) !== effectiveFrom
    ) {
      throw new SuggestionApprovalError(
        'La date de prise d’effet doit être une date valide au format YYYY-MM-DD.',
        'SUGGESTION_EFFECTIVE_FROM_INVALID',
        400,
      );
    }
    if (effectiveFrom < tomorrow || effectiveFrom < from || effectiveFrom > to) {
      throw new SuggestionApprovalError(
        'La date de prise d’effet doit être dans la période de la suggestion et au plus tôt demain.',
        'SUGGESTION_EFFECTIVE_FROM_OUT_OF_RANGE',
        422,
        { earliest_date: tomorrow > from ? tomorrow : from, period_to: to },
      );
    }
  }

  const applicationFrom =
    (effectiveFrom as string | undefined) ?? (from > tomorrow ? from : tomorrow);
  if (applicationFrom > to) {
    throw new SuggestionApprovalError(
      'Cette suggestion est expirée : aucune journée future ne peut être appliquée. Générez une nouvelle suggestion.',
      'SUGGESTION_PERIOD_EXPIRED',
      422,
    );
  }
  return { from: applicationFrom, to };
}

export function assertSafeSuggestionBoundary(
  originalFrom: string,
  applicationFrom: string,
  source: string | undefined,
  itemGuid: string,
): void {
  if (
    applicationFrom > originalFrom &&
    (source === 'GUARD_CONTINUATION' || source === 'POST_GUARD_REST')
  ) {
    throw new SuggestionApprovalError(
      'La prise d’effet coupe une garde ou son repos. Choisissez une autre date ou régénérez la suggestion sur la période future.',
      'SUGGESTION_UNSAFE_APPLICATION_BOUNDARY',
      422,
      { item_guid: itemGuid, effective_from: applicationFrom },
    );
  }
}
