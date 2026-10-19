/** Adaptation de lecture des réponses de pointage pour l'interface manager.
 * Les indicateurs restent indépendants : ne pas déduire la validation d'un mémo.
 */
export interface PointageMemoReference {
  guid: string
  title: string
}

export interface PointagePresentationSource {
  guid: string
  pointage_status?: string | null
  is_valid?: boolean | null
  requires_validation?: boolean | null
  has_anomalies?: boolean | null
  within_geofence?: boolean | null
  created_offline?: boolean | null
  coordinates?: string | null
  gps_accuracy?: number | null
  memo?: PointageMemoReference | string | null
}

export type AttentionReason = 'validation' | 'invalid' | 'anomaly' | 'outside_zone'

export function getMemoReference(entry: PointagePresentationSource): PointageMemoReference | null {
  const memo = entry.memo
  if (!memo || typeof memo !== 'object' || typeof memo.guid !== 'string' || !memo.guid) return null
  return { guid: memo.guid, title: typeof memo.title === 'string' ? memo.title : 'Mémo associé' }
}

export function getAttentionReasons(entry: PointagePresentationSource): AttentionReason[] {
  const reasons: AttentionReason[] = []
  if (entry.requires_validation === true) reasons.push('validation')
  if (entry.is_valid === false) reasons.push('invalid')
  if (entry.has_anomalies === true) reasons.push('anomaly')
  if (entry.within_geofence === false) reasons.push('outside_zone')
  return reasons
}

export function getPointageOverview(entry: PointagePresentationSource): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  explanation: string
} {
  const reasons = getAttentionReasons(entry)
  if (entry.pointage_status === 'rejected') {
    return { label: 'Rejeté', tone: 'danger', explanation: 'Ce pointage a été rejeté.' }
  }
  if (reasons.length > 0) {
    return { label: 'À examiner', tone: 'warning', explanation: 'Ce pointage comporte un ou plusieurs éléments à vérifier.' }
  }
  if (entry.pointage_status === 'pending') {
    return { label: 'En attente', tone: 'warning', explanation: 'Ce pointage est en attente de traitement.' }
  }
  if (entry.pointage_status === 'accepted' && entry.is_valid === true) {
    return { label: 'Enregistré et valide', tone: 'success', explanation: 'Ce pointage est accepté et déclaré valide.' }
  }
  return { label: 'Enregistré', tone: 'neutral', explanation: 'Consultez les informations du pointage.' }
}

/** Les coordonnées sont enregistrées sous forme "latitude,longitude". */
export function parsePointageCoordinates(value: string | null | undefined): { lat: number; lng: number } | null {
  if (!value) return null
  const segments = value.split(',').map((part) => part.trim())
  if (segments.length !== 2 || segments.some((part) => part === '')) return null
  const lat = Number(segments[0])
  const lng = Number(segments[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function getLocationSummary(entry: PointagePresentationSource): string {
  if (!parsePointageCoordinates(entry.coordinates)) return 'Position non disponible'
  if (entry.within_geofence === true) return 'Position enregistrée dans la zone autorisée'
  if (entry.within_geofence === false) return 'Position enregistrée hors de la zone autorisée'
  return 'Position enregistrée'
}

export function getGpsAccuracyLabel(accuracy: number | null | undefined): string {
  return typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0
    ? `Précision estimée : ±${Math.round(accuracy)} m`
    : 'Précision GPS indisponible'
}

/** Détection d'un écart de réception, sans lui attribuer une cause non démontrée. */
export function getReceptionDelayMs(clockedAt: string | null | undefined, receivedAt: string | null | undefined): number | null {
  if (!clockedAt || !receivedAt) return null
  const start = new Date(clockedAt).getTime()
  const received = new Date(receivedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(received)) return null
  return Math.max(0, received - start)
}
