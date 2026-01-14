export interface SitesResponse {
    success: boolean
    data: Data
}

export interface Data {
    sites: Sites
}

export interface Sites {
    items: Site[]
}

export interface Pagination {
    offset: number
    limit: number
    count: number
}

export interface Site {
    guid: string
    name: string
    site_type: string
    address: Address
    geofence_radius: number
    active: boolean
    public: boolean
    geofence_polygon: GeofencePolygon
    created_at: string
    updated_at: string
    created_by: string
}

export interface Address {
    city: string
    location: string
    place_name: string
}

export interface GeofencePolygon {
    crs: Crs
    type: string
    coordinates: number[][][]
}

export interface Crs {
    type: string
    properties: Properties
}

export interface Properties {
    name: string
}
