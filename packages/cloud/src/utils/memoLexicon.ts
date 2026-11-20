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
