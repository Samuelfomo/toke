// utils/sites.validation.ts
import { SITES_DEFAULTS, SITES_VALIDATION, SiteType } from '../../constants/tenant/sites.js';

export class SitesValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < SITES_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > SITES_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates tenant
   */
  static validateTenant(tenant: string): boolean {
    if (!tenant || typeof tenant !== 'string') return false;
    const trimmed = tenant.trim();
    return (
      trimmed.length >= SITES_VALIDATION.TENANT.MIN_LENGTH &&
      trimmed.length <= SITES_VALIDATION.TENANT.MAX_LENGTH
    );
  }

  /**
   * Validates created by user ID
   */
  static validateCreatedBy(createdBy: number): boolean {
    if (typeof createdBy !== 'number' || !Number.isInteger(createdBy)) return false;
    return (
      createdBy >= SITES_VALIDATION.CREATED_BY.MIN && createdBy <= SITES_VALIDATION.CREATED_BY.MAX
    );
  }

  /**
   * Validates site name
   */
  static validateName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= SITES_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= SITES_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates site type
   */
  static validateSiteType(siteType: string): boolean {
    if (!siteType || typeof siteType !== 'string') return false;
    return Object.values(SiteType).includes(siteType as SiteType);
  }

  /**
   * Validates address object
   */
  static validateAddress(address: any): boolean {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return false;

    // Check required fields
    const requiredFields = SITES_VALIDATION.ADDRESS.REQUIRED_FIELDS;
    for (const field of requiredFields) {
      if (
        !address[field] ||
        typeof address[field] !== 'string' ||
        address[field].trim().length === 0
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates address structure and content
   */
  static validateAddressStructure(address: any): boolean {
    if (!this.validateAddress(address)) return false;

    // Additional validation for specific address fields
    const validations = [
      address.city && address.city.trim().length <= 100,
      address.location && address.location.trim().length <= 255,
      address.place_name && address.place_name.trim().length <= 255,
      !address.postal_code ||
        (typeof address.postal_code === 'string' && address.postal_code.trim().length <= 20),
      !address.country ||
        (typeof address.country === 'string' && address.country.trim().length <= 100),
      !address.state || (typeof address.state === 'string' && address.state.trim().length <= 100),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Validates geofence polygon
   */
  static validateGeofencePolygon(polygon: any): boolean {
    if (!polygon || typeof polygon !== 'object') return false;

    try {
      // Basic GeoJSON polygon validation
      if (polygon.type !== 'Polygon') return false;
      if (!Array.isArray(polygon.coordinates)) return false;
      if (polygon.coordinates.length === 0) return false;

      // Validate coordinate arrays
      for (const ring of polygon.coordinates) {
        if (!Array.isArray(ring) || ring.length < 4) return false;

        for (const coord of ring) {
          if (!Array.isArray(coord) || coord.length !== 2) return false;
          if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') return false;

          // Validate longitude and latitude ranges
          if (coord[0] < -180 || coord[0] > 180) return false; // longitude
          if (coord[1] < -90 || coord[1] > 90) return false; // latitude
        }

        // First and last coordinates should be the same (closed ring)
        const firstCoord = ring[0];
        const lastCoord = ring[ring.length - 1];
        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates geofence radius
   */
  static validateGeofenceRadius(radius: number): boolean {
    if (typeof radius !== 'number' || !Number.isInteger(radius)) return false;
    return (
      radius >= SITES_VALIDATION.GEOFENCE_RADIUS.MIN &&
      radius <= SITES_VALIDATION.GEOFENCE_RADIUS.MAX
    );
  }

  /**
   * Validates QR reference
   */
  static validateQrReference(qrReference: number | null): boolean {
    if (qrReference === null || qrReference === undefined) return true;
    if (typeof qrReference !== 'number' || !Number.isInteger(qrReference)) return false;
    return (
      qrReference >= SITES_VALIDATION.QR_REFERENCE.MIN &&
      qrReference <= SITES_VALIDATION.QR_REFERENCE.MAX
    );
  }

  /**
   * Validates QR code data
   */
  static validateQrCodeData(qrCodeData: any): boolean {
    if (qrCodeData === null || qrCodeData === undefined) return true;
    if (typeof qrCodeData !== 'object' || Array.isArray(qrCodeData)) return false;

    try {
      JSON.stringify(qrCodeData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates active status
   */
  static validateActive(active: boolean): boolean {
    return typeof active === 'boolean';
  }

  /**
   * Validates public status
   */
  static validatePublic(isPublic: boolean): boolean {
    return typeof isPublic === 'boolean';
  }

  /**
   * Validates allowed roles
   */
  static validateAllowedRoles(allowedRoles: any): boolean {
    if (allowedRoles === null || allowedRoles === undefined) return true;
    if (typeof allowedRoles !== 'object' || Array.isArray(allowedRoles)) return false;

    try {
      JSON.stringify(allowedRoles);
      // Additional validation: should be an array of role IDs or role codes
      if (Array.isArray(allowedRoles)) {
        return allowedRoles.every((role) => typeof role === 'string' || typeof role === 'number');
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates coordinates
   */
  static validateCoordinates(longitude: number, latitude: number): boolean {
    return (
      typeof longitude === 'number' &&
      typeof latitude === 'number' &&
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90
    );
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= (SITES_DEFAULTS.PAGINATION?.MAX_LIMIT || 500)
    );
  }

  /**
   * Checks for geofence overlap
   */
  static hasGeofenceOverlap(
    newPolygon: any,
    existingSites: any[],
    excludeSiteId?: string,
  ): boolean {
    // Simplified overlap detection - in real implementation, use proper GIS library
    for (const site of existingSites) {
      if (excludeSiteId && site.guid === excludeSiteId) continue;
      if (!site.geofence_polygon) continue;

      // Basic bounding box overlap check
      if (this.boundingBoxOverlap(newPolygon, site.geofence_polygon)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validates site type permissions
   */
  static validateSiteTypePermission(siteType: string, userPermissions: any): boolean {
    switch (siteType) {
      case SiteType.GLOBAL:
        return userPermissions?.sites?.create_global || false;
      case SiteType.PUBLIC:
        return userPermissions?.sites?.create_public || false;
      case SiteType.TEMPORARY:
        return userPermissions?.sites?.create_temporary || false;
      case SiteType.MANAGER:
      default:
        return userPermissions?.sites?.create || false;
    }
  }

  /**
   * Cleans and normalizes site data
   */
  static cleanSiteData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    if (cleaned.created_by !== undefined && cleaned.created_by !== null) {
      cleaned.created_by = Number(cleaned.created_by);
    }

    if (cleaned.qr_reference !== undefined && cleaned.qr_reference !== null) {
      cleaned.qr_reference = Number(cleaned.qr_reference);
    }

    if (cleaned.geofence_radius !== undefined && cleaned.geofence_radius !== null) {
      cleaned.geofence_radius = Number(cleaned.geofence_radius);
    }

    // Clean string fields
    ['tenant', 'name', 'site_type'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert boolean fields
    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(cleaned.active);
    }

    if (cleaned.public !== undefined) {
      cleaned.public = Boolean(cleaned.public);
    }

    // Parse JSON fields if they come as strings
    ['address', 'geofence_polygon', 'qr_code_data', 'allowed_roles'].forEach((field) => {
      if (
        cleaned[field] !== undefined &&
        cleaned[field] !== null &&
        typeof cleaned[field] === 'string'
      ) {
        try {
          cleaned[field] = JSON.parse(cleaned[field]);
        } catch {
          throw new Error(`Invalid ${field}: must be valid JSON`);
        }
      }
    });

    return cleaned;
  }

  /**
   * Validates that a site is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['tenant', 'created_by', 'name', 'geofence_polygon', 'geofence_radius'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateTenant(data.tenant) &&
      this.validateCreatedBy(data.created_by) &&
      this.validateName(data.name) &&
      (data.site_type === undefined || this.validateSiteType(data.site_type)) &&
      (data.address === undefined || this.validateAddressStructure(data.address)) &&
      this.validateGeofencePolygon(data.geofence_polygon) &&
      this.validateGeofenceRadius(data.geofence_radius) &&
      this.validateQrReference(data.qr_reference) &&
      this.validateQrCodeData(data.qr_code_data) &&
      (data.active === undefined || this.validateActive(data.active)) &&
      (data.public === undefined || this.validatePublic(data.public)) &&
      this.validateAllowedRoles(data.allowed_roles) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a site is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, validate only fields that are present
    const validations = [
      data.tenant === undefined || this.validateTenant(data.tenant),
      data.created_by === undefined || this.validateCreatedBy(data.created_by),
      data.name === undefined || this.validateName(data.name),
      data.site_type === undefined || this.validateSiteType(data.site_type),
      data.address === undefined || this.validateAddressStructure(data.address),
      data.geofence_polygon === undefined || this.validateGeofencePolygon(data.geofence_polygon),
      data.geofence_radius === undefined || this.validateGeofenceRadius(data.geofence_radius),
      data.qr_reference === undefined || this.validateQrReference(data.qr_reference),
      data.qr_code_data === undefined || this.validateQrCodeData(data.qr_code_data),
      data.active === undefined || this.validateActive(data.active),
      data.public === undefined || this.validatePublic(data.public),
      data.allowed_roles === undefined || this.validateAllowedRoles(data.allowed_roles),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a site
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.tenant || !this.validateTenant(data.tenant)) {
      errors.push(`Invalid tenant: must be 1-${SITES_VALIDATION.TENANT.MAX_LENGTH} characters`);
    }

    if (
      data.created_by === undefined ||
      data.created_by === null ||
      !this.validateCreatedBy(data.created_by)
    ) {
      errors.push(
        `Invalid created_by: must be between ${SITES_VALIDATION.CREATED_BY.MIN} and ${SITES_VALIDATION.CREATED_BY.MAX}`,
      );
    }

    if (!data.name || !this.validateName(data.name)) {
      errors.push(`Invalid name: must be 1-${SITES_VALIDATION.NAME.MAX_LENGTH} characters`);
    }

    if (data.site_type !== undefined && !this.validateSiteType(data.site_type)) {
      errors.push(`Invalid site_type: must be one of ${Object.values(SiteType).join(', ')}`);
    }

    if (data.address !== undefined && !this.validateAddressStructure(data.address)) {
      errors.push(
        `Invalid address: must contain ${SITES_VALIDATION.ADDRESS.REQUIRED_FIELDS.join(', ')}`,
      );
    }

    if (!data.geofence_polygon || !this.validateGeofencePolygon(data.geofence_polygon)) {
      errors.push('Invalid geofence_polygon: must be a valid GeoJSON polygon');
    }

    if (
      data.geofence_radius === undefined ||
      data.geofence_radius === null ||
      !this.validateGeofenceRadius(data.geofence_radius)
    ) {
      errors.push(
        `Invalid geofence_radius: must be between ${SITES_VALIDATION.GEOFENCE_RADIUS.MIN} and ${SITES_VALIDATION.GEOFENCE_RADIUS.MAX} meters`,
      );
    }

    if (data.qr_reference !== undefined && !this.validateQrReference(data.qr_reference)) {
      errors.push(
        `Invalid qr_reference: must be between ${SITES_VALIDATION.QR_REFERENCE.MIN} and ${SITES_VALIDATION.QR_REFERENCE.MAX}`,
      );
    }

    if (data.qr_code_data !== undefined && !this.validateQrCodeData(data.qr_code_data)) {
      errors.push('Invalid qr_code_data: must be a valid JSON object');
    }

    if (data.active !== undefined && !this.validateActive(data.active)) {
      errors.push('Invalid active: must be a boolean value');
    }

    if (data.public !== undefined && !this.validatePublic(data.public)) {
      errors.push('Invalid public: must be a boolean value');
    }

    if (data.allowed_roles !== undefined && !this.validateAllowedRoles(data.allowed_roles)) {
      errors.push('Invalid allowed_roles: must be a valid JSON object or array');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${SITES_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.tenant && this.validateTenant(data.tenant)) ||
      (data.created_by && this.validateCreatedBy(data.created_by)) ||
      (data.name && this.validateName(data.name)) ||
      (data.site_type && this.validateSiteType(data.site_type)) ||
      (data.active !== undefined && this.validateActive(data.active)) ||
      (data.public !== undefined && this.validatePublic(data.public)) ||
      (data.qr_reference && this.validateQrReference(data.qr_reference)) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Calculates the area of a polygon (approximate)
   */
  static calculatePolygonArea(polygon: any): number {
    if (!this.validateGeofencePolygon(polygon)) return 0;

    try {
      const coords = polygon.coordinates[0]; // Outer ring
      let area = 0;
      const n = coords.length - 1; // Exclude duplicate last point

      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i][0] * coords[j][1];
        area -= coords[j][0] * coords[i][1];
      }

      return Math.abs(area) / 2;
    } catch {
      return 0;
    }
  }

  /**
   * Calculates the center point of a polygon
   */
  static calculatePolygonCenter(polygon: any): { longitude: number; latitude: number } | null {
    if (!this.validateGeofencePolygon(polygon)) return null;

    try {
      const coords = polygon.coordinates[0]; // Outer ring
      let longitude = 0,
        latitude = 0;
      const n = coords.length - 1; // Exclude duplicate last point

      for (let i = 0; i < n; i++) {
        longitude += coords[i][0];
        latitude += coords[i][1];
      }

      return {
        longitude: longitude / n,
        latitude: latitude / n,
      };
    } catch {
      return null;
    }
  }

  /**
   * Checks if a point is inside a polygon (basic implementation)
   */
  static isPointInPolygon(point: { longitude: number; latitude: number }, polygon: any): boolean {
    if (!this.validateGeofencePolygon(polygon)) return false;

    try {
      const coords = polygon.coordinates[0]; // Outer ring
      const x = point.longitude,
        y = point.latitude;
      let inside = false;

      for (let i = 0, j = coords.length - 2; i < coords.length - 1; j = i++) {
        const xi = coords[i][0],
          yi = coords[i][1];
        const xj = coords[j][0],
          yj = coords[j][1];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    } catch {
      return false;
    }
  }

  /**
   * Gets site summary statistics
   */
  static getSiteSummary(sites: any[]): {
    totalSites: number;
    activeSites: number;
    publicSites: number;
    siteTypes: Record<string, number>;
    averageGeofenceRadius: number;
  } {
    const summary = {
      totalSites: sites.length,
      activeSites: 0,
      publicSites: 0,
      siteTypes: {} as Record<string, number>,
      averageGeofenceRadius: 0,
    };

    let totalRadius = 0;

    sites.forEach((site) => {
      if (site.active) summary.activeSites++;
      if (site.public) summary.publicSites++;

      const siteType = site.site_type || SiteType.MANAGER;
      summary.siteTypes[siteType] = (summary.siteTypes[siteType] || 0) + 1;

      if (site.geofence_radius) {
        totalRadius += site.geofence_radius;
      }
    });

    summary.averageGeofenceRadius = sites.length > 0 ? totalRadius / sites.length : 0;

    return summary;
  }

  /**
   * Finds sites within distance from a point
   */
  static findSitesNearPoint(
    sites: any[],
    point: { longitude: number; latitude: number },
    maxDistanceKm: number,
  ): any[] {
    return sites.filter((site) => {
      const center = this.calculatePolygonCenter(site.geofence_polygon);
      if (!center) return false;

      const distance = this.calculateDistance(point, center);
      return distance <= maxDistanceKm;
    });
  }

  /**
   * Calculates distance between two points (Haversine formula)
   */
  static calculateDistance(
    point1: { longitude: number; latitude: number },
    point2: { longitude: number; latitude: number },
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Validates business rules for site creation
   */
  static validateBusinessRules(data: any, existingSites: any[], userPermissions: any): string[] {
    const errors: string[] = [];

    // Check site type permissions
    if (data.site_type && !this.validateSiteTypePermission(data.site_type, userPermissions)) {
      errors.push('Insufficient permissions to create this site type');
    }

    // Check for geofence overlap
    if (data.geofence_polygon && this.hasGeofenceOverlap(data.geofence_polygon, existingSites)) {
      errors.push('Geofence overlaps with existing site');
    }

    // Check polygon area (not too small or too large)
    if (data.geofence_polygon) {
      const area = this.calculatePolygonArea(data.geofence_polygon);
      if (area < 0.000001) {
        // Very small area
        errors.push('Geofence area is too small');
      } else if (area > 1) {
        // Very large area (roughly 1 square degree)
        errors.push('Geofence area is too large');
      }
    }

    return errors;
  }

  /**
   * Basic bounding box overlap detection
   */
  private static boundingBoxOverlap(polygon1: any, polygon2: any): boolean {
    try {
      const bbox1 = this.calculateBoundingBox(polygon1);
      const bbox2 = this.calculateBoundingBox(polygon2);

      return !(
        bbox1.maxLng < bbox2.minLng ||
        bbox2.maxLng < bbox1.minLng ||
        bbox1.maxLat < bbox2.minLat ||
        bbox2.maxLat < bbox1.minLat
      );
    } catch {
      return false;
    }
  }

  /**
   * Calculate bounding box for a polygon
   */
  private static calculateBoundingBox(polygon: any): {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  } {
    const coords = polygon.coordinates[0]; // Outer ring
    let minLng = coords[0][0],
      maxLng = coords[0][0];
    let minLat = coords[0][1],
      maxLat = coords[0][1];

    for (const coord of coords) {
      minLng = Math.min(minLng, coord[0]);
      maxLng = Math.max(maxLng, coord[0]);
      minLat = Math.min(minLat, coord[1]);
      maxLat = Math.max(maxLat, coord[1]);
    }

    return { minLng, maxLng, minLat, maxLat };
  }

  /**
   * Converts degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
