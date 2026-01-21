export interface SiteBase {
  name: string;
  site_type?: string;
  address: Address;
  geofence_radius?: number;
  active?: boolean;
  public?: boolean;
  geofence_polygon: GeofencePolygon;
  created_by: string;
}

export interface Address {
  city: string;
  location: string;
  place_name: string;
}

export interface GeofencePolygon {
  crs?: Crs;
  type: string;
  coordinates: number[][][];
}

export interface Crs {
  type: string;
  properties: Properties;
}

export interface Properties {
  name: string;
}

export interface Site extends SiteBase {
  // id: number; // Database ID
  guid: string; // Unique GUID
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Pour les créations (sans ID, GUID, timestamps)
export interface CreateSite extends SiteBase {}

// Pour les mises à jour (tous les champs optionnels sauf les IDs)
export interface UpdateSite extends Partial<SiteBase> {}
