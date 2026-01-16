import {
  DEVICES_DEFAULTS,
  DEVICES_ERRORS,
  DevicesValidationUtils,
  DeviceType,
  TimezoneConfigUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class DeviceModel extends BaseModel {
  public readonly db = {
    tableName: tableName.DEVICE,
    id: 'id',
    guid: 'guid',
    name: 'name',
    // identified: 'identified',
    device_type: 'device_type',
    assigned_to: 'assigned_to',
    gps_accuracy: 'gps_accuracy',
    custom_geofence_radius: 'custom_geofence_radius',
    last_seen_at: 'last_seen_at',
    active: 'active',
    config_by: 'config_by',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected name?: string;
  // protected identified?: string;
  protected device_type?: string;
  protected assigned_to?: number;
  protected gps_accuracy?: number;
  protected custom_geofence_radius?: number;
  protected last_seen_at?: Date;
  protected active?: boolean;
  protected config_by?: number;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // === RECHERCHES DE BASE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  // protected async findByIdentified(identified: string): Promise<any> {
  //   return await this.findOne(this.db.tableName, { [this.db.identified]: identified });
  // }

  // === RECHERCHES PAR CRITÈRES ===

  protected async listAllByType(device_type: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.device_type]: device_type });
  }

  protected async listAllByUser(assigned_to: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.assigned_to]: assigned_to });
  }

  protected async listAllActiveDevices(): Promise<any[]> {
    const conditions: any = { [this.db.active]: DEVICES_DEFAULTS.ACTIVE };
    return await this.findAll(this.db.tableName, conditions);
  }

  protected async listAllByConfig(config_by: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.config_by]: config_by });
  }

  protected async listAllByDeviceType(device_type: DeviceType): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.device_type]: device_type,
    });
  }

  // === RECHERCHES SPÉCIFIQUES ===

  protected async findInactiveDevices(daysInactive: number = 30): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysInactive);

    return await this.findAll(this.db.tableName, {
      [this.db.last_seen_at]: {
        [Op.lt]: thresholdDate,
      },
      [this.db.active]: true,
    });
  }

  protected async findDevicesByAccuracy(minAccuracy: number, maxAccuracy: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.gps_accuracy]: {
        [Op.between]: [minAccuracy, maxAccuracy],
      },
      [this.db.active]: true,
    });
  }

  // === GESTION ACTIVITÉ ===

  protected async updateLastSeenUser(device: number): Promise<number> {
    return await this.updateOne(
      this.db.tableName,
      { [this.db.last_seen_at]: TimezoneConfigUtils.getCurrentTime().toISOString() },
      { [this.db.id]: device },
    );
  }

  protected async deactivateInactiveDevices(daysInactive: number = 90): Promise<number> {
    const inactiveDevices = await this.findInactiveDevices(daysInactive);

    if (inactiveDevices.length === 0) return 0;

    const inactiveIds = inactiveDevices.map((device) => device.id);

    return await this.updateOne(
      this.db.tableName,
      { [this.db.active]: false },
      { [this.db.id]: { [Op.in]: inactiveIds } },
    );
  }

  // === STATISTIQUES ===

  protected async getDeviceStatistics(): Promise<any> {
    const [totalDevices, activeDevices, devicesByType, devicesByUser] = await Promise.all([
      this.count(this.db.tableName, {}),
      this.count(this.db.tableName, { [this.db.active]: true }),
      this.countByGroup(this.db.tableName, this.db.device_type, { [this.db.active]: true }),
      this.countByGroup(this.db.tableName, this.db.assigned_to, { [this.db.active]: true }),
    ]);

    return {
      total_devices: totalDevices,
      active_devices: activeDevices,
      devices_by_type: devicesByType,
      devices_by_user: devicesByUser,
    };
  }

  // === LISTE ET PAGINATION ===

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  // === CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(DEVICES_ERRORS.GUID_GENERATION_FAILED);
    }

    // const existingIdentified = await this.findByIdentified(this.identified);
    // if (existingIdentified) {
    //   throw new Error('Identifier already exists');
    // }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.device_type]: this.device_type,
      [this.db.assigned_to]: this.assigned_to,
      [this.db.gps_accuracy]: this.gps_accuracy,
      [this.db.custom_geofence_radius]: this.custom_geofence_radius,
      [this.db.last_seen_at]:
        this.last_seen_at || TimezoneConfigUtils.getCurrentTime().toISOString(),
      [this.db.active]: this.active,
      [this.db.config_by]: this.config_by,
    });

    if (!lastID) {
      throw new Error(DEVICES_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(DEVICES_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.device_type !== undefined) updateData[this.db.device_type] = this.device_type;
    if (this.assigned_to !== undefined) updateData[this.db.assigned_to] = this.assigned_to;
    if (this.gps_accuracy !== undefined) updateData[this.db.gps_accuracy] = this.gps_accuracy;
    if (this.custom_geofence_radius !== undefined)
      updateData[this.db.custom_geofence_radius] = this.custom_geofence_radius;
    if (this.last_seen_at !== undefined) updateData[this.db.last_seen_at] = this.last_seen_at;
    if (this.active !== undefined) updateData[this.db.active] = this.active;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(DEVICES_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {
    if (!this.name) {
      throw new Error(DEVICES_ERRORS.NAME_REQUIRED);
    }
    if (!DevicesValidationUtils.validateName(this.name)) {
      throw new Error(DEVICES_ERRORS.NAME_INVALID);
    }
    if (!this.device_type) {
      throw new Error(DEVICES_ERRORS.DEVICE_TYPE_REQUIRED);
    }
    if (!DevicesValidationUtils.validateDeviceType(this.device_type)) {
      throw new Error(DEVICES_ERRORS.DEVICE_TYPE_INVALID);
    }
    if (!this.assigned_to) {
      throw new Error(DEVICES_ERRORS.ASSIGNED_TO_REQUIRED);
    }
    // if (!this.gps_accuracy) {
    //   throw new Error(DEVICES_ERRORS.GPS_ACCURACY_REQUIRED);
    // }
    if (this.gps_accuracy && !DevicesValidationUtils.validateGpsAccuracy(this.gps_accuracy)) {
      throw new Error(DEVICES_ERRORS.GPS_ACCURACY_INVALID);
    }
    // if (!this.custom_geofence_radius) {
    //   throw new Error(DEVICES_ERRORS.GEOFENCE_RADIUS_REQUIRED);
    // }
    if (
      this.custom_geofence_radius &&
      !DevicesValidationUtils.validateGeofenceRadius(this.custom_geofence_radius)
    ) {
      throw new Error(DEVICES_ERRORS.GEOFENCE_RADIUS_INVALID);
    }
    if (this.active !== undefined && !DevicesValidationUtils.validateActive(this.active)) {
      throw new Error(DEVICES_ERRORS.ACTIVE_STATUS_INVALID);
    }

    const cleaned = DevicesValidationUtils.cleanDeviceData(this);
    Object.assign(this, cleaned);
  }
}
