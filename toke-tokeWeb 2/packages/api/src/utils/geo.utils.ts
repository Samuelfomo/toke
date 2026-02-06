// src/utils/geo.utils.ts (NOUVEAU FICHIER)

/**
 * ✅ Calcul distance entre 2 points GPS (Haversine Formula)
 * Plus précis que Pythagore pour distances courtes (<100km)
 *
 * @param lat1 - Latitude point 1
 * @param lon1 - Longitude point 1
 * @param lat2 - Latitude point 2
 * @param lon2 - Longitude point 2
 * @returns Distance en mètres
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Rayon Terre en mètres

  const φ1 = (lat1 * Math.PI) / 180; // Latitude 1 en radians
  const φ2 = (lat2 * Math.PI) / 180; // Latitude 2 en radians
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance en mètres

  return distance;
}

/**
 * ✅ Calcul bearing (angle/direction) entre 2 points
 * Utile pour savoir dans quelle direction l'utilisateur est par rapport au site
 *
 * @returns Angle en degrés (0-360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * ✅ Formater distance en format lisible
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * ✅ Vérifier si coordonnées GPS valides
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * ✅ Calculer précision GPS en catégorie
 */
export function getGPSAccuracyLevel(accuracy: number): {
  level: 'excellent' | 'good' | 'moderate' | 'poor';
  description: string;
} {
  if (accuracy <= 5) {
    return { level: 'excellent', description: 'Excellente (≤5m)' };
  } else if (accuracy <= 15) {
    return { level: 'good', description: 'Bonne (5-15m)' };
  } else if (accuracy <= 50) {
    return { level: 'moderate', description: 'Modérée (15-50m)' };
  } else {
    return { level: 'poor', description: 'Faible (>50m)' };
  }
}
