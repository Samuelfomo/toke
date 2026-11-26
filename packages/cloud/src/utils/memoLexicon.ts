/** Lexique d'affichage uniquement : ne transforme jamais les données envoyées à l'API. */
const anomalyLabels: Record<string, string> = {
  session_already_open: 'Session déjà ouverte', session_not_found: 'Aucune session ouverte',
  session_too_long: 'Durée de session inhabituelle', pause_already_active: 'Pause déjà en cours',
  pause_not_active: 'Aucune pause en cours', mission_already_active: 'Mission déjà en cours',
  mission_not_active: 'Aucune mission en cours', timing_abnormal: 'Horaire inhabituel',
  duration_abnormal: 'Durée de travail inhabituelle', frequency_suspicious: 'Fréquence de pointage inhabituelle',
  gps_spoofing_suspected: 'Position GPS suspecte', distance_impossible: 'Déplacement incohérent',
  geofence_violation: 'Pointage hors de la zone autorisée', unauthorized_qr_code: 'QR Code non autorisé',
  expired_qr_code: 'QR Code expiré', late_arrival: 'Retard à l’arrivée',
  early_departure: 'Départ anticipé', absent_no_show: 'Absence constatée',
  pause_too_long: 'Pause trop longue', pause_no_return: 'Aucun retour de pause détecté',
  missed_work_block: 'Plage de travail non effectuée', off_schedule_clocking: 'Pointage hors planning',
  work_on_rest_day: 'Pointage un jour de repos', pause_outside_block: 'Pause hors plage autorisée',
};
const titleReplacements: Array<[RegExp, string]> = [
  [/\bEarly Departure\b/gi, 'Départ anticipé'],
  [/\bLate Arrival\b/gi, 'Retard à l’arrivée'],
  [/\bRest Day Score\b/gi, 'Activité un jour de repos'],
  [/\bDelay\b/gi, 'Retard'],
  [/\bEntrée anomaly\b/gi, 'Anomalie d’entrée'],
  [/\bSortie anomaly\b/gi, 'Anomalie de sortie'],
  [/\bincident\(s\)/gi, 'incident(s)'],
];
export function formatMemoMessage(value: string): string {
  if (!value) return '';
  const clean = value.trim();
  return anomalyLabels[clean.toLowerCase()] ?? clean.replace(/\b[a-z]+(?:_[a-z]+)+\b/gi, match => anomalyLabels[match.toLowerCase()] ?? match);
}
export function formatMemoTitle(value: string): string {
  let title = formatMemoMessage(value || 'Sans titre');
  for (const [pattern, replacement] of titleReplacements) title = title.replace(pattern, replacement);
  return title;
}

const pointageLabels: Record<string, string> = {
  clock_in: 'Arrivée', clock_out: 'Départ',
  pause_start: 'Début de pause', pause_end: 'Fin de pause',
  external_mission: 'Début de mission', external_mission_end: 'Fin de mission',
  waypoint: 'Point de passage',
};
const correctionLabels: Record<string, string> = {
  auto_close_previous_session: 'Clôture de la session précédente',
  create_retroactive_session: 'Création rétroactive de la session',
  auto_close_previous_pause: 'Clôture de la pause précédente',
  auto_create_missing_session: 'Création de la session manquante',
  auto_close_active_pause: 'Clôture de la pause en cours',
  auto_create_session_for_mission: 'Création d’une session pour la mission',
  auto_create_session_and_mission_for_mission_end: 'Création de la session et de la mission manquantes',
  auto_create_mission_start: 'Création du début de mission manquant',
};

export function formatAutomaticMemoDetails(value: string): string {
  if (/^\s*(?:\{|\[)/.test(value)) return '';
  return formatMemoMessage(value
    .replace(/^[ \t]*Détails:[ \t]*(?:\{[\s\S]*?^\}|\[[\s\S]*?^\]|[^\n]*)/gm, '')
    .replace(/^.*RÉSOLUTION D'HORAIRE:[^\n]*\n[\s\S]*?(?=^🔍|$(?![\s\S]))/gm, '')
    .replace(/^.*MÉMO AUTO-GÉNÉRÉ.*\n|^[ \t]*- (?:GPS|Précision):.*$/gm, '')
    .replace(/(^[ \t]*- Type: )([a-z_]+)/gmi, (_, prefix, type) => prefix + (pointageLabels[type] ?? type))
    .replace(/(^[ \t]*• )([a-z_]+)$/gm, (_, prefix, action) => prefix + (correctionLabels[action] ?? action))
    .replace(/\[(LOW|MEDIUM|HIGH|CRITICAL)\]/g, (_, level) =>
      ({ LOW: 'Faible', MEDIUM: 'Modérée', HIGH: 'Élevée', CRITICAL: 'Critique' })[level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'])
    .replace(/\n{3,}/g, '\n\n'));
}
