import type { GeoJsonPolygon, SiteCoordinates } from './siteLocation.types';

export const getPolygonRing = (polygon?: GeoJsonPolygon | null): number[][] => {
  return polygon?.coordinates?.[0] ?? [];
};

export const getPolygonPoints = (polygon?: GeoJsonPolygon | null): number[][] => {
  const ring = getPolygonRing(polygon);
  if (ring.length === 0) return [];

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first?.[0] === last?.[0] && first?.[1] === last?.[1];

  return isClosed ? ring.slice(0, -1) : [...ring];
};

const isValidCoordinate = (coordinate: number[]) => {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;
  const [lng, lat] = coordinate;
  return Number.isFinite(lng)
    && Number.isFinite(lat)
    && lng >= -180
    && lng <= 180
    && lat >= -90
    && lat <= 90;
};

export const isValidPolygon = (polygon?: GeoJsonPolygon | null): boolean => {
  if (!polygon || polygon.type !== 'Polygon') return false;
  const points = getPolygonPoints(polygon);
  return points.length >= 3 && points.every(isValidCoordinate);
};

/**
 * Normalise un polygon avant envoi à l'API Toké :
 * - vérifie les coordonnées WGS84 [longitude, latitude]
 * - supprime une éventuelle fermeture dupliquée
 * - referme exactement une fois le ring extérieur
 *
 * Retourne null lorsque la géométrie ne peut pas être envoyée au backend.
 */
export const normalizePolygonForApi = (
  polygon?: GeoJsonPolygon | null,
): GeoJsonPolygon | null => {
  if (!polygon || polygon.type !== 'Polygon') return null;

  const points = getPolygonPoints(polygon).map(([lng, lat]) => [Number(lng), Number(lat)]);
  if (points.length < 3 || !points.every(isValidCoordinate)) return null;

  const ring = points.map((point) => [...point]);
  ring.push([...ring[0]]);

  return {
    ...polygon,
    type: 'Polygon',
    coordinates: [ring],
  };
};

/**
 * Centre moyen du ring. Suffisant pour initialiser le marqueur d'un ancien site.
 * Ce n'est pas un calcul de centroïde géodésique destiné à des traitements SIG.
 */
export const getPolygonApproximateCenter = (
  polygon?: GeoJsonPolygon | null,
): SiteCoordinates | null => {
  const points = getPolygonPoints(polygon).filter(isValidCoordinate);
  if (points.length === 0) return null;

  const sum = points.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
};
