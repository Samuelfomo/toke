import type { SiteAddressValue } from '@/utils/geo/siteLocation.types';

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const cleaned = clean(item);
        if (cleaned) return cleaned;
      }
      continue;
    }

    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return '';
};

const getProperty = (geoObject: any, key: string): unknown => {
  try {
    return geoObject?.properties?.get?.(key);
  } catch {
    return undefined;
  }
};

const callString = (geoObject: any, method: string): string => {
  try {
    const value = geoObject?.[method]?.();
    return clean(value);
  } catch {
    return '';
  }
};

const callArray = (geoObject: any, method: string): string[] => {
  try {
    const value = geoObject?.[method]?.();
    return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
  } catch {
    return [];
  }
};

/**
 * Convertit un résultat Yandex (GeocodeResult ou résultat de SearchControl)
 * vers le format d'adresse déjà attendu par l'API Toké.
 *
 * Le mapping est volontairement défensif : la richesse des objets retournés
 * par Yandex varie suivant le pays et le type d'objet recherché.
 */
export const mapYandexGeoObjectToSiteAddress = (
  geoObject: any,
  fallbackName = '',
): SiteAddressValue => {
  const localities = callArray(geoObject, 'getLocalities');
  const administrativeAreas = callArray(geoObject, 'getAdministrativeAreas');

  const name = firstNonEmpty(
    getProperty(geoObject, 'name'),
    getProperty(geoObject, 'text'),
    fallbackName,
  );

  const description = firstNonEmpty(
    getProperty(geoObject, 'description'),
    getProperty(geoObject, 'balloonContentHeader'),
  );

  const addressLine = firstNonEmpty(
    callString(geoObject, 'getAddressLine'),
    getProperty(geoObject, 'address'),
    description,
    name,
  );

  const city = firstNonEmpty(
    localities[0],
    administrativeAreas[administrativeAreas.length - 1],
    getProperty(geoObject, 'metaDataProperty.GeocoderMetaData.Address.Components.locality'),
  );

  const location = firstNonEmpty(
    localities[1],
    callString(geoObject, 'getThoroughfare'),
    description,
    administrativeAreas[0],
    localities[0],
    city,
  );

  const placeName = firstNonEmpty(
    addressLine,
    name,
    callString(geoObject, 'getPremise'),
    callString(geoObject, 'getThoroughfare'),
    location,
    city,
  );

  return {
    city,
    location,
    place_name: placeName,
  };
};

export const isUsableSiteAddress = (address: SiteAddressValue): boolean =>
  Boolean(address.city && address.location && address.place_name);
