import { SITES_DEFAULTS, SITES_ERRORS, SitesValidationUtils, SiteType } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class SiteModel extends BaseModel {
  public readonly db = {
    tableName: tableName.SITES,
    id: 'id',
    guid: 'guid',
    tenant: 'tenant',
    created_by: 'created_by',
    name: 'name',
    site_type: 'site_type',
    address: 'address',
    geofence_polygon: 'geofence_polygon',
    geofence_radius: 'geofence_radius',
    qr_reference: 'qr_reference',
    qr_code_data: 'qr_code_data',
    active: 'active',
    public: 'public',
    allowed_roles: 'allowed_roles',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected tenant?: string;
  protected created_by?: number;
  protected name?: string;
  protected site_type?: string;
  protected address?: any;
  protected geofence_polygon?: any;
  protected geofence_radius?: number;
  protected qr_reference?: number;
  protected qr_code_data?: any;
  protected active?: boolean;
  protected public?: boolean;
  protected allowed_roles?: any;
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

  // === RECHERCHES PAR CRITÈRES ===

  protected async listAllByType(site_type: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.site_type]: site_type });
  }

  protected async listAllByCreator(created_by: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.created_by]: created_by });
  }

  protected async listAllActiveSites(): Promise<any[]> {
    const conditions: any = { [this.db.active]: SITES_DEFAULTS.ACTIVE };
    return await this.findAll(this.db.tableName, conditions);
  }

  protected async listAllPublicSites(): Promise<any[]> {
    const conditions: any = {
      [this.db.public]: SITES_DEFAULTS.PUBLIC,
      [this.db.active]: SITES_DEFAULTS.ACTIVE,
    };
    return await this.findAll(this.db.tableName, conditions);
  }

  protected async listAllByTypeSite(site_type: SiteType): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.site_type]: site_type,
    });
  }

  // // === VALIDATIONS GÉOSPATIALES ===
  //
  // protected async findSitesNearLocation(
  //   latitude: number,
  //   longitude: number,
  //   radiusMeters: number = 1000,
  // ): Promise<any[]> {
  //   await this.ensureInitialized();
  //
  //   const query = `
  //     SELECT *,
  //       ST_Distance(
  //         ST_Transform(geofence_polygon, 3857),
  //         ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857)
  //       ) as distance_meters
  //     FROM ${this.db.tableName}
  //     WHERE ST_DWithin(
  //       ST_Transform(geofence_polygon, 3857),
  //       ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
  //       $3
  //     )
  //     AND active = true
  //     ORDER BY distance_meters ASC
  //   `;
  //
  //   try {
  //     const results = await this.sequelize.query(query, {
  //       bind: [longitude, latitude, radiusMeters],
  //       type: this.sequelize.QueryTypes.SELECT,
  //     });
  //     return results as any[];
  //   } catch (error) {
  //     console.error('Erreur recherche géospatiale:', error);
  //     return [];
  //   }
  // }
  //
  // protected async validateGeofenceAccess(
  //   site_id: number,
  //   latitude: number,
  //   longitude: number,
  // ): Promise<{
  //   access_granted: boolean;
  //   distance_from_center: number;
  //   within_geofence: boolean;
  //   tolerance_applied: number;
  // }> {
  //   await this.ensureInitialized();
  //
  //   const query = `
  //     SELECT
  //       geofence_radius,
  //       ST_Distance(
  //         ST_Transform(ST_Centroid(geofence_polygon), 3857),
  //         ST_Transform(ST_SetSRID(ST_MakePoint($2, $3), 4326), 3857)
  //       ) as distance_from_center,
  //       ST_Contains(
  //         ST_Buffer(
  //           ST_Transform(geofence_polygon, 3857),
  //           geofence_radius
  //         ),
  //         ST_Transform(ST_SetSRID(ST_MakePoint($2, $3), 4326), 3857)
  //       ) as within_geofence
  //     FROM ${this.db.tableName}
  //     WHERE id = $1
  //   `;
  //
  //   try {
  //     const [result] = (await this.sequelize.query(query, {
  //       bind: [site_id, longitude, latitude],
  //       type: this.sequelize.QueryTypes.SELECT,
  //     })) as any[];
  //
  //     if (!result) {
  //       return {
  //         access_granted: false,
  //         distance_from_center: -1,
  //         within_geofence: false,
  //         tolerance_applied: 0,
  //       };
  //     }
  //
  //     return {
  //       access_granted: result.within_geofence,
  //       distance_from_center: Math.round(result.distance_from_center),
  //       within_geofence: result.within_geofence,
  //       tolerance_applied: result.geofence_radius,
  //     };
  //   } catch (error) {
  //     console.error('Erreur validation géofence:', error);
  //     return {
  //       access_granted: false,
  //       distance_from_center: -1,
  //       within_geofence: false,
  //       tolerance_applied: 0,
  //     };
  //   }
  // }

  // === GESTION QR CODES ===

  protected async findByQRToken(qr_token: string): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.qr_code_data]: {
        [Op.contains]: { qr_token },
      },
    });
  }

  protected async regenerateQRCodeData(site: number): Promise<any> {
    const siteData = await this.find(site);
    if (!siteData) return null;

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const qr_token = `QR_${siteData.name.replace(/\s+/g, '_').toUpperCase()}_${siteData.created_by}_${timestamp}`;

    const qr_content = {
      site_guid: siteData.guid,
      site_id: siteData.id,
      site_name: siteData.name,
      site_type: siteData.site_type,
      manager_id: siteData.created_by,
      creation_date: new Date().toISOString(),
      qr_token,
      checksum: this.generateChecksum(qr_token + siteData.guid),
    };

    await this.updateOne(
      this.db.tableName,
      { [this.db.qr_code_data]: qr_content },
      { [this.db.id]: site },
    );

    return qr_content;
  }

  protected async getUserAccessibleSites(user_id: number, user_roles: string[]): Promise<any[]> {
    const conditions = {
      [this.db.active]: true,
      [Op.or]: [
        { [this.db.public]: true },
        { [this.db.created_by]: user_id },
        {
          [this.db.allowed_roles]: {
            [Op.overlap]: user_roles,
          },
        },
      ],
    };

    return await this.findAll(this.db.tableName, conditions);
  }

  // === GESTION PERMISSIONS ===

  protected async findExpiredTemporarySites(): Promise<any[]> {
    const currentDate = new Date().toISOString();

    return await this.findAll(this.db.tableName, {
      [this.db.site_type]: SiteType.TEMPORARY,
      [this.db.qr_code_data]: {
        [Op.contains]: {
          auto_expire_date: {
            [Op.lt]: currentDate,
          },
        },
      },
      [this.db.active]: true,
    });
  }

  // === SITES TEMPORAIRES ===

  protected async deactivateExpiredSites(): Promise<number> {
    const expiredSites = await this.findExpiredTemporarySites();

    if (expiredSites.length === 0) return 0;

    const expiredIds = expiredSites.map((site) => site.id);

    return await this.updateOne(
      this.db.tableName,
      { [this.db.active]: false },
      { [this.db.id]: { [Op.in]: expiredIds } },
    );
  }

  protected async getSiteStatistics(): Promise<any> {
    const [totalSites, activeSites, sitesByType, sitesByTenant] = await Promise.all([
      this.count(this.db.tableName, {}),
      this.count(this.db.tableName, { [this.db.active]: true }),
      this.countByGroup(this.db.tableName, this.db.site_type, { [this.db.active]: true }),
      this.countByGroup(this.db.tableName, this.db.tenant, { [this.db.active]: true }),
    ]);

    return {
      total_sites: totalSites,
      active_sites: activeSites,
      sites_by_type: sitesByType,
      sites_by_tenant: sitesByTenant,
    };
  }

  // === STATISTIQUES ===

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  // === LISTE ET PAGINATION ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.uuidTokenGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(SITES_ERRORS.GUID_GENERATION_FAILED);
    }

    // Génération automatique du QR code
    const qr_content = await this.generateInitialQRCode();

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.tenant]: this.tenant,
      [this.db.created_by]: this.created_by,
      [this.db.name]: this.name,
      [this.db.site_type]: this.site_type,
      [this.db.address]: this.address,
      [this.db.geofence_polygon]: this.geofence_polygon,
      [this.db.geofence_radius]: this.geofence_radius,
      [this.db.qr_reference]: this.qr_reference,
      [this.db.qr_code_data]: qr_content,
      [this.db.active]: this.active,
      [this.db.public]: this.public,
      [this.db.allowed_roles]: this.allowed_roles,
    });

    if (!lastID) {
      throw new Error(SITES_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
    this.qr_code_data = qr_content;
  }

  // === CRUD OPERATIONS ===

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(SITES_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.address !== undefined) updateData[this.db.address] = this.address;
    if (this.geofence_polygon !== undefined)
      updateData[this.db.geofence_polygon] = this.geofence_polygon;
    if (this.geofence_radius !== undefined)
      updateData[this.db.geofence_radius] = this.geofence_radius;
    if (this.active !== undefined) updateData[this.db.active] = this.active;
    if (this.public !== undefined) updateData[this.db.public] = this.public;
    if (this.allowed_roles !== undefined) updateData[this.db.allowed_roles] = this.allowed_roles;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(SITES_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private generateChecksum(data: string): string {
    // Simple checksum pour validation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  private async generateInitialQRCode(): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const qr_token = `QR_${this.name?.replace(/\s+/g, '_').toUpperCase()}_${this.created_by}_${timestamp}`;

    return {
      guid: this.guid,
      name: this.name,
      site_type: this.site_type,
      manager: this.created_by,
      creation_date: new Date().toISOString(),
      qr_token,
      checksum: this.generateChecksum(qr_token + (this.guid || '')),
    };
  }

  private async validate(): Promise<void> {
    if (!this.tenant) {
      throw new Error(SITES_ERRORS.TENANT_REQUIRED);
    }
    if (!SitesValidationUtils.validateTenant(this.tenant)) {
      throw new Error(SITES_ERRORS.TENANT_INVALID);
    }
    if (!this.created_by) {
      throw new Error(SITES_ERRORS.CREATED_BY_REQUIRED);
    }
    if (!SitesValidationUtils.validateCreatedBy(this.created_by)) {
      throw new Error(SITES_ERRORS.CREATED_BY_INVALID);
    }
    if (!this.name) {
      throw new Error(SITES_ERRORS.NAME_REQUIRED);
    }
    if (!SitesValidationUtils.validateName(this.name)) {
      throw new Error(SITES_ERRORS.NAME_INVALID);
    }
    if (this.site_type && !SitesValidationUtils.validateSiteType(this.site_type)) {
      throw new Error(SITES_ERRORS.SITE_TYPE_INVALID);
    }
    if (this.address && !SitesValidationUtils.validateAddress(this.address)) {
      throw new Error(SITES_ERRORS.ADDRESS_INVALID);
    }
    if (
      this.geofence_polygon &&
      !SitesValidationUtils.validateGeofencePolygon(this.geofence_polygon)
    ) {
      throw new Error(SITES_ERRORS.GEOFENCE_POLYGON_INVALID);
    }
    if (!this.geofence_polygon) {
      throw new Error(SITES_ERRORS.GEOFENCE_POLYGON_REQUIRED);
    }
    if (!SitesValidationUtils.validateGeofencePolygon(this.geofence_polygon)) {
      throw new Error(SITES_ERRORS.GEOFENCE_POLYGON_INVALID);
    }
    if (!this.geofence_radius) {
      throw new Error(SITES_ERRORS.GEOFENCE_RADIUS_REQUIRED);
    }
    if (!SitesValidationUtils.validateGeofenceRadius(this.geofence_radius)) {
      throw new Error(SITES_ERRORS.GEOFENCE_RADIUS_INVALID);
    }

    if (this.qr_reference && !SitesValidationUtils.validateQrReference(this.qr_reference)) {
      throw new Error(SITES_ERRORS.QR_REFERENCE_INVALID);
    }

    if (!this.qr_code_data) {
      throw new Error(SITES_ERRORS.QR_CODE_DATA_REQUIRED);
    }
    if (!SitesValidationUtils.validateQrCodeData(this.qr_code_data)) {
      throw new Error(SITES_ERRORS.QR_CODE_DATA_INVALID);
    }
    if (this.active !== undefined && !SitesValidationUtils.validateActive(this.active)) {
      throw new Error(SITES_ERRORS.ACTIVE_STATUS_INVALID);
    }
    if (this.public !== undefined && !SitesValidationUtils.validatePublic(this.public)) {
      throw new Error(SITES_ERRORS.PUBLIC_STATUS_INVALID);
    }
    if (this.allowed_roles && !SitesValidationUtils.validateAllowedRoles(this.allowed_roles)) {
      throw new Error(SITES_ERRORS.ALLOWED_ROLES_INVALID);
    }

    const cleaned = SitesValidationUtils.cleanSiteData(this);
    Object.assign(this, cleaned);
  }
}
