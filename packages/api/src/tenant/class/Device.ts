import { DeviceType, TimezoneConfigUtils } from '@toke/shared';

import DeviceModel from '../model/DeviceModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

import User from './User.js';

export default class Device extends DeviceModel {
  private assignedToObj?: User;
  private createdByObj?: User;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<Device | null> {
    return new Device().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Device[] | null> {
    return new Device().list(conditions, paginationOptions);
  }

  static _listByType(device_type: string): Promise<Device[] | null> {
    return new Device().listByType(device_type);
  }

  static _listByUser(assigned_to: number): Promise<Device[] | null> {
    return new Device().listByUser(assigned_to);
  }

  static _listByCreator(created_by: number): Promise<Device[] | null> {
    return new Device().listByCreator(created_by);
  }

  static _listActiveDevices(): Promise<Device[] | null> {
    return new Device().listActiveDevices();
  }

  static async deactivateInactiveDevices(daysInactive: number = 90): Promise<number> {
    return new Device().deactivateInactiveDevices(daysInactive);
  }

  static async exportable(
    conditions: Record<string, any> = { ['active']: true },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const devices = await this._list(conditions, paginationOptions);
    if (devices) {
      items = await Promise.all(
        devices.map(async (device) => await device.toJSON(responseValue.MINIMAL)),
      );
    }
    return {
      revision: await TenantRevision.getRevision(tableName.DEVICE),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  static async getDeviceStatistics(): Promise<any> {
    return new Device().getDeviceStatistics();
  }

  // === GETTERS FLUENT ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getName(): string | undefined {
    return this.name;
  }

  getDeviceType(): string | undefined {
    return this.device_type;
  }

  getAssignedTo(): number | undefined {
    return this.assigned_to;
  }

  async getAssignedToObj(): Promise<User | null> {
    if (!this.assigned_to) return null;
    if (!this.assignedToObj) {
      this.assignedToObj = (await User._load(this.assigned_to)) || undefined;
    }
    return this.assignedToObj || null;
  }

  getGpsAccuracy(): number | undefined {
    return this.gps_accuracy;
  }

  getCustomGeofenceRadius(): number | undefined {
    return this.custom_geofence_radius;
  }

  getLastSeenAt(): Date | undefined {
    return this.last_seen_at;
  }

  isActive(): boolean {
    return this.active === true;
  }

  getCreatedBy(): number | undefined {
    return this.created_by;
  }

  async getCreatedByObj(): Promise<User | null> {
    if (!this.created_by) return null;
    if (!this.createdByObj) {
      this.createdByObj = (await User._load(this.created_by)) || undefined;
    }
    return this.createdByObj || null;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  // === SETTERS FLUENT ===

  setName(name: string): Device {
    this.name = name;
    return this;
  }

  setDeviceType(device_type: string): Device {
    this.device_type = device_type;
    return this;
  }

  setAssignedTo(assigned_to: number): Device {
    this.assigned_to = assigned_to;
    return this;
  }

  setGpsAccuracy(gps_accuracy: number): Device {
    this.gps_accuracy = gps_accuracy;
    return this;
  }

  setCustomGeofenceRadius(custom_geofence_radius: number): Device {
    this.custom_geofence_radius = custom_geofence_radius;
    return this;
  }

  setLastSeenAt(last_seen_at: Date): Device {
    this.last_seen_at = last_seen_at;
    return this;
  }

  setActive(active: boolean): Device {
    this.active = active;
    return this;
  }

  setCreatedBy(created_by: number): Device {
    this.created_by = created_by;
    return this;
  }

  // === MÉTHODES MÉTIER SPÉCIALISÉES ===

  isAndroid(): boolean {
    return this.device_type === DeviceType.ANDROID;
  }

  isIOS(): boolean {
    return this.device_type === DeviceType.IOS;
  }

  isOther(): boolean {
    return this.device_type === DeviceType.OTHER;
  }

  // === GESTION ACTIVITÉ ===

  async updateLastSeen(): Promise<void> {
    if (!this.id) return;
    await this.updateLastSeenDate(this.id);
    this.last_seen_at = TimezoneConfigUtils.getCurrentTime();
  }

  getDaysSinceLastSeen(): number | null {
    if (!this.last_seen_at) return null;

    const today = TimezoneConfigUtils.getCurrentTime();
    const lastSeen = new Date(this.last_seen_at);
    const diffTime = today.getTime() - lastSeen.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  isInactive(days: number = 30): boolean {
    const daysSinceLastSeen = this.getDaysSinceLastSeen();
    return daysSinceLastSeen !== null && daysSinceLastSeen >= days;
  }

  hasGoodAccuracy(threshold: number = 50): boolean {
    return this.gps_accuracy !== undefined && this.gps_accuracy <= threshold;
  }

  // === GESTION GEOFENCE ===

  async updateGeofenceRadius(new_radius: number, reason?: string): Promise<void> {
    this.custom_geofence_radius = new_radius;
    await this.save();

    console.log(
      `Device ${this.guid} geofence radius updated to ${new_radius}m. Reason: ${reason || 'Not specified'}`,
    );
  }

  // === RÉASSIGNATION ===

  async reassignDevice(new_user: number, reason?: string): Promise<void> {
    const oldUserId = this.assigned_to;
    this.assigned_to = new_user;
    await this.save();

    console.log(
      `Device ${this.guid} reassigned from user ${oldUserId} to ${new_user}. Reason: ${reason || 'Not specified'}`,
    );
  }

  // === MÉTHODES DE BASE ===

  isNew(): boolean {
    return this.id === undefined;
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async load(identifier: any, byGuid: boolean = false): Promise<Device | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Device[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Device().hydrate(data));
  }

  async listByType(device_type: string): Promise<Device[] | null> {
    const dataset = await this.listAllByType(device_type);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Device().hydrate(data));
  }

  async listByUser(assigned_to: number): Promise<Device[] | null> {
    const dataset = await this.listAllByUser(assigned_to);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Device().hydrate(data));
  }

  async listByCreator(created_by: number): Promise<Device[] | null> {
    const dataset = await this.listAllByCreator(created_by);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Device().hydrate(data));
  }

  async listActiveDevices(): Promise<Device[] | null> {
    const dataset = await this.listAllActiveDevices();
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Device().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Device Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const assignedTo = await this.getAssignedToObj();
    const createdBy = await this.getCreatedByObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.NAME]: this.name,
      [RS.DEVICE_TYPE]: this.device_type,
      [RS.GPS_ACCURACY]: this.gps_accuracy,
      [RS.CUSTOM_GEOFENCE_RADIUS]: this.custom_geofence_radius,
      [RS.LAST_SEEN_AT]: this.last_seen_at,
      [RS.ACTIVE]: this.active,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.ASSIGNED_TO]: assignedTo?.getGuid(),
        [RS.CREATED_BY]: createdBy?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.ASSIGNED_TO]: assignedTo ? await assignedTo.toJSON() : null,
      [RS.CREATED_BY]: createdBy ? await createdBy.toJSON() : null,
      // Informations calculées
      days_since_last_seen: this.getDaysSinceLastSeen(),
      is_inactive: this.isInactive(),
      has_good_accuracy: this.hasGoodAccuracy(),
    };
  }

  // === MÉTHODES PRIVÉES ===

  private hydrate(data: any): Device {
    this.id = data.id;
    this.guid = data.guid;
    this.name = data.name;
    this.device_type = data.device_type;
    this.assigned_to = data.assigned_to;
    this.gps_accuracy = data.gps_accuracy;
    this.custom_geofence_radius = data.custom_geofence_radius;
    this.last_seen_at = data.last_seen_at;
    this.active = data.active;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private async updateLastSeenDate(device: number): Promise<number> {
    return await new Device().updateLastSeenUser(device);
  }
}
