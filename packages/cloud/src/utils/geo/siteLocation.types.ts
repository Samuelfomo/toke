export type SiteLocationSource = 'none' | 'gps' | 'search' | 'map' | 'manual';

export type SiteGeolocationStatus = 'idle' | 'locating' | 'success' | 'error';
export type SiteGeolocationErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unknown';

export type SiteLocationAccuracyLevel = 'good' | 'medium' | 'low' | 'unknown';

export interface SiteCoordinates {
  /** Latitude WGS84. */
  lat: number;
  /** Longitude WGS84. */
  lng: number;
}

export interface SiteAddressValue {
  city: string;
  location: string;
  place_name: string;
}

export interface SiteLocationSelection {
  coordinates: SiteCoordinates | null;
  source: SiteLocationSource;
  /** Précision estimée de la position en mètres. */
  accuracy: number | null;
  address: SiteAddressValue;
  addressResolved: boolean;
}

export interface SiteGeolocationError {
  code: SiteGeolocationErrorCode;
  message: string;
  browserCode?: number;
}

export interface GeoJsonPolygon {
  crs?: {
    type: 'name';
    properties: {
      name: string;
    };
  };
  type: 'Polygon';
  coordinates: number[][][];
}
