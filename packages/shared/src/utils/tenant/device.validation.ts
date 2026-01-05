// utils/devices.validation.ts
import { DEVICES_DEFAULTS, DEVICES_VALIDATION, DeviceType } from '../../constants/tenant/device.js';

export class DevicesValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    if (
      trimmed.length < DEVICES_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > DEVICES_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates device name
   */
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= DEVICES_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= DEVICES_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates device type
   */
  static validateDeviceType(deviceType: any): boolean {
    if (!deviceType || typeof deviceType !== 'string') return false;
    return Object.values(DeviceType).includes(deviceType as DeviceType);
  }

  /**
   * Validates GPS accuracy
   */
  static validateGpsAccuracy(accuracy: any): boolean {
    if (typeof accuracy !== 'number' || !Number.isInteger(accuracy)) return false;
    return (
      accuracy >= DEVICES_VALIDATION.GPS_ACCURACY.MIN &&
      accuracy <= DEVICES_VALIDATION.GPS_ACCURACY.MAX
    );
  }

  /**
   * Validates geofence radius
   */
  static validateGeofenceRadius(radius: any): boolean {
    if (typeof radius !== 'number' || !Number.isInteger(radius)) return false;
    return (
      radius >= DEVICES_VALIDATION.GEOFENCE_RADIUS.MIN &&
      radius <= DEVICES_VALIDATION.GEOFENCE_RADIUS.MAX
    );
  }

  /**
   * Validates active status
   */
  static validateActive(active: any): boolean {
    return typeof active === 'boolean';
  }

  /**
   * Validates last seen date
   */
  static validateLastSeenAt(lastSeenAt: any): boolean {
    if (!lastSeenAt) return true; // Optional field

    if (lastSeenAt instanceof Date) {
      return !isNaN(lastSeenAt.getTime());
    }

    if (typeof lastSeenAt === 'string') {
      return !isNaN(Date.parse(lastSeenAt));
    }

    return false;
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
      limit <= (DEVICES_DEFAULTS.PAGINATION?.MAX_LIMIT || 500)
    );
  }

  /**
   * Cleans and normalizes device data
   */
  static cleanDeviceData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    if (cleaned.assigned_to !== undefined && cleaned.assigned_to !== null) {
      cleaned.assigned_to = Number(cleaned.assigned_to);
    }

    if (cleaned.created_by !== undefined && cleaned.created_by !== null) {
      cleaned.created_by = Number(cleaned.created_by);
    }

    if (cleaned.gps_accuracy !== undefined && cleaned.gps_accuracy !== null) {
      cleaned.gps_accuracy = Number(cleaned.gps_accuracy);
    }

    if (cleaned.custom_geofence_radius !== undefined && cleaned.custom_geofence_radius !== null) {
      cleaned.custom_geofence_radius = Number(cleaned.custom_geofence_radius);
    }

    // Clean string fields
    ['name', 'device_type'].forEach((field) => {
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

    // Parse date fields
    if (cleaned.last_seen_at !== undefined && cleaned.last_seen_at !== null) {
      if (typeof cleaned.last_seen_at === 'string') {
        cleaned.last_seen_at = new Date(cleaned.last_seen_at);
      }
    }

    return cleaned;
  }

  /**
   * Validates that a device is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'name',
      'device_type',
      'assigned_to',
      'gps_accuracy',
      'custom_geofence_radius',
      'created_by',
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateName(data.name) &&
      this.validateDeviceType(data.device_type) &&
      this.validateGpsAccuracy(data.gps_accuracy) &&
      this.validateGeofenceRadius(data.custom_geofence_radius) &&
      (data.active === undefined || this.validateActive(data.active)) &&
      (data.last_seen_at === undefined || this.validateLastSeenAt(data.last_seen_at)) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a device is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    const validations = [
      data.name === undefined || this.validateName(data.name),
      data.device_type === undefined || this.validateDeviceType(data.device_type),
      data.gps_accuracy === undefined || this.validateGpsAccuracy(data.gps_accuracy),
      data.custom_geofence_radius === undefined ||
        this.validateGeofenceRadius(data.custom_geofence_radius),
      data.active === undefined || this.validateActive(data.active),
      data.last_seen_at === undefined || this.validateLastSeenAt(data.last_seen_at),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a device
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || !this.validateName(data.name)) {
      errors.push(`Invalid name: must be 1-${DEVICES_VALIDATION.NAME.MAX_LENGTH} characters`);
    }

    if (
      data.device_type === undefined ||
      data.device_type === null ||
      !this.validateDeviceType(data.device_type)
    ) {
      errors.push(`Invalid device_type: must be one of ${Object.values(DeviceType).join(', ')}`);
    }

    if (
      data.assigned_to === undefined ||
      data.assigned_to === null ||
      typeof data.assigned_to !== 'number'
    ) {
      errors.push('Invalid assigned_to: must be a valid user ID');
    }

    if (
      data.gps_accuracy === undefined ||
      data.gps_accuracy === null ||
      !this.validateGpsAccuracy(data.gps_accuracy)
    ) {
      errors.push(
        `Invalid gps_accuracy: must be between ${DEVICES_VALIDATION.GPS_ACCURACY.MIN} and ${DEVICES_VALIDATION.GPS_ACCURACY.MAX}`,
      );
    }

    if (
      data.custom_geofence_radius === undefined ||
      data.custom_geofence_radius === null ||
      !this.validateGeofenceRadius(data.custom_geofence_radius)
    ) {
      errors.push(
        `Invalid custom_geofence_radius: must be between ${DEVICES_VALIDATION.GEOFENCE_RADIUS.MIN} and ${DEVICES_VALIDATION.GEOFENCE_RADIUS.MAX} meters`,
      );
    }

    if (data.active !== undefined && !this.validateActive(data.active)) {
      errors.push('Invalid active: must be a boolean value');
    }

    if (data.last_seen_at !== undefined && !this.validateLastSeenAt(data.last_seen_at)) {
      errors.push('Invalid last_seen_at: must be a valid date');
    }

    if (
      data.created_by === undefined ||
      data.created_by === null ||
      typeof data.created_by !== 'number'
    ) {
      errors.push('Invalid created_by: must be a valid user ID');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(`Invalid GUID: must be 1-${DEVICES_VALIDATION.GUID.MAX_LENGTH} characters`);
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.name && this.validateName(data.name)) ||
      (data.device_type && this.validateDeviceType(data.device_type)) ||
      (data.assigned_to && typeof data.assigned_to === 'number') ||
      (data.created_by && typeof data.created_by === 'number') ||
      (data.active !== undefined && this.validateActive(data.active)) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Gets device summary statistics
   */
  static getDeviceSummary(devices: any[]): {
    totalDevices: number;
    activeDevices: number;
    deviceTypes: Record<string, number>;
    averageGpsAccuracy: number;
    averageGeofenceRadius: number;
    inactiveDevices: number;
  } {
    const summary = {
      totalDevices: devices.length,
      activeDevices: 0,
      deviceTypes: {} as Record<string, number>,
      averageGpsAccuracy: 0,
      averageGeofenceRadius: 0,
      inactiveDevices: 0,
    };

    let totalAccuracy = 0;
    let totalRadius = 0;

    devices.forEach((device) => {
      if (device.active) {
        summary.activeDevices++;
      } else {
        summary.inactiveDevices++;
      }

      const deviceType = device.device_type || DeviceType.OTHER;
      summary.deviceTypes[deviceType] = (summary.deviceTypes[deviceType] || 0) + 1;

      if (device.gps_accuracy) {
        totalAccuracy += device.gps_accuracy;
      }

      if (device.custom_geofence_radius) {
        totalRadius += device.custom_geofence_radius;
      }
    });

    summary.averageGpsAccuracy = devices.length > 0 ? totalAccuracy / devices.length : 0;
    summary.averageGeofenceRadius = devices.length > 0 ? totalRadius / devices.length : 0;

    return summary;
  }

  /**
   * Calculates device health score (0-100)
   */
  static calculateDeviceHealthScore(device: any): number {
    let score = 100;

    // Penalize for poor GPS accuracy
    if (device.gps_accuracy > 100) {
      score -= 30;
    } else if (device.gps_accuracy > 50) {
      score -= 15;
    }

    // Penalize for inactivity
    if (device.last_seen_at) {
      const daysSinceLastSeen = this.getDaysSinceDate(new Date(device.last_seen_at));
      if (daysSinceLastSeen > 90) {
        score -= 40;
      } else if (daysSinceLastSeen > 30) {
        score -= 20;
      } else if (daysSinceLastSeen > 7) {
        score -= 10;
      }
    }

    // Penalize if inactive
    if (!device.active) {
      score -= 50;
    }

    return Math.max(0, score);
  }

  /**
   * Gets days since a date
   */
  static getDaysSinceDate(date: Date): number {
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Finds devices that need attention
   */
  static findDevicesNeedingAttention(devices: any[]): {
    poorAccuracy: any[];
    inactive: any[];
    longInactive: any[];
  } {
    return {
      poorAccuracy: devices.filter((d) => d.gps_accuracy > 100),
      inactive: devices.filter((d) => {
        if (!d.last_seen_at) return false;
        return this.getDaysSinceDate(new Date(d.last_seen_at)) > 7;
      }),
      longInactive: devices.filter((d) => {
        if (!d.last_seen_at) return false;
        return this.getDaysSinceDate(new Date(d.last_seen_at)) > 30;
      }),
    };
  }

  /**
   * Groups devices by user
   */
  static groupDevicesByUser(devices: any[]): Map<number, any[]> {
    const grouped = new Map<number, any[]>();

    devices.forEach((device) => {
      if (device.assigned_to) {
        if (!grouped.has(device.assigned_to)) {
          grouped.set(device.assigned_to, []);
        }
        grouped.get(device.assigned_to)!.push(device);
      }
    });

    return grouped;
  }

  /**
   * Validates business rules for device creation
   */
  static validateBusinessRules(data: any, existingDevices: any[]): string[] {
    const errors: string[] = [];

    // Check for duplicate device names for the same user
    const duplicateName = existingDevices.find(
      (d) =>
        d.name.toLowerCase() === data.name?.toLowerCase() &&
        d.assigned_to === data.assigned_to &&
        d.active,
    );

    if (duplicateName) {
      errors.push('A device with this name already exists for this user');
    }

    // Validate GPS accuracy is reasonable
    if (data.gps_accuracy && data.gps_accuracy > 1000) {
      errors.push('GPS accuracy seems unreasonably high (>1000m)');
    }

    // Validate geofence radius is reasonable
    if (data.custom_geofence_radius && data.custom_geofence_radius < 10) {
      errors.push('Geofence radius is too small (<10m)');
    }

    return errors;
  }
}
