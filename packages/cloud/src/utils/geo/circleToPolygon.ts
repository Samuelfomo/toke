import type { GeoJsonPolygon, SiteCoordinates } from './siteLocation.types';

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEFAULT_SEGMENTS = 32;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Génère un polygone GeoJSON fermé autour d'un point WGS84.
 *
 * Le format de sortie reste compatible avec l'API Toké actuelle :
 * GeoJSON utilise [longitude, latitude] et le premier point est répété à la fin.
 */
export const circleToPolygon = (
  center: SiteCoordinates,
  radiusMeters: number,
  segments = DEFAULT_SEGMENTS,
): GeoJsonPolygon => {
  if (!Number.isFinite(center.lat) || center.lat < -90 || center.lat > 90) {
    throw new Error('Latitude invalide');
  }

  if (!Number.isFinite(center.lng) || center.lng < -180 || center.lng > 180) {
    throw new Error('Longitude invalide');
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error('Le rayon doit être supérieur à 0 mètre');
  }

  if (!Number.isInteger(segments) || segments < 8 || segments > 128) {
    throw new Error('Le nombre de segments doit être compris entre 8 et 128');
  }

  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const lat1 = toRadians(center.lat);
  const lng1 = toRadians(center.lng);
  const ring: number[][] = [];

  for (let index = 0; index < segments; index += 1) {
    const bearing = (2 * Math.PI * index) / segments;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

    let lng = toDegrees(lng2);
    lng = ((lng + 540) % 360) - 180;

    ring.push([lng, toDegrees(lat2)]);
  }

  // GeoJSON Polygon : le ring extérieur doit être fermé.
  ring.push([...ring[0]]);

  return {
    crs: {
      type: 'name',
      properties: { name: 'EPSG:4326' },
    },
    type: 'Polygon',
    coordinates: [ring],
  };
};
