import { SiteType } from '@toke/shared';

import SiteModel from '../model/SiteModel.js';
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

export default class Site extends SiteModel {
  private createdByObj?: User;
  private qrReferenceObj?: User;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<Site | null> {
    return new Site().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Site[] | null> {
    return new Site().list(conditions, paginationOptions);
  }

  static _listByType(site_type: string): Promise<Site[] | null> {
    return new Site().listByType(site_type);
  }

  static _listByCreator(created_by: number): Promise<Site[] | null> {
    return new Site().listByCreator(created_by);
  }

  static _listActiveSites(): Promise<Site[] | null> {
    return new Site().listActiveSites();
  }

  static _listPublicSites(): Promise<Site[] | null> {
    return new Site().listPublicSites();
  }

  // static async _getUserAccessibleSites(
  //   user_id: number,
  //   user_roles: string[],
  // ): Promise<Site[] | null> {
  //   return new Site().getUserAccessibleSites(user_id, user_roles);
  // }

  // static async _findNearLocation(
  //   latitude: number,
  //   longitude: number,
  //   radiusMeters: number = 1000,
  // ): Promise<Site[] | null> {
  //   return new Site().findNearLocation(latitude, longitude, radiusMeters);
  // }

  static async validateQRAccess(qr_token: string): Promise<Site | null> {
    return new Site().findByQRToken(qr_token);
  }

  static async deactivateExpiredSites(): Promise<number> {
    return new Site().deactivateExpiredSites();
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
    const sites = await this._list(conditions, paginationOptions);
    if (sites) {
      items = await Promise.all(
        sites.map(async (site) => await site.toJSON(responseValue.MINIMAL)),
      );
    }
    return {
      revision: await TenantRevision.getRevision(tableName.SITES),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  static async getSiteStatistics(): Promise<any> {
    return new Site().getSiteStatistics();
  }

  // === GETTERS FLUENT ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getTenant(): string | undefined {
    return this.tenant;
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

  getName(): string | undefined {
    return this.name;
  }

  getSiteType(): string | undefined {
    return this.site_type;
  }

  getAddress(): any | undefined {
    return this.address;
  }

  getGeofencePolygon(): any | undefined {
    return this.geofence_polygon;
  }

  getGeofenceRadius(): number | undefined {
    return this.geofence_radius;
  }

  getQRReference(): number | undefined {
    return this.qr_reference;
  }

  async getQRReferenceObj(): Promise<User | null> {
    if (!this.qr_reference) return null;
    if (!this.qrReferenceObj) {
      this.qrReferenceObj = (await User._load(this.qr_reference)) || undefined;
    }
    return this.qrReferenceObj || null;
  }

  getQRCodeData(): any | undefined {
    return this.qr_code_data;
  }

  isActive(): boolean {
    return this.active === true;
  }

  isPublic(): boolean {
    return this.public === true;
  }

  getAllowedRoles(): any | undefined {
    return this.allowed_roles;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  // === SETTERS FLUENT ===

  setTenant(tenant: string): Site {
    this.tenant = tenant;
    return this;
  }

  setCreatedBy(created_by: number): Site {
    this.created_by = created_by;
    return this;
  }

  setName(name: string): Site {
    this.name = name;
    return this;
  }

  setSiteType(site_type: string): Site {
    this.site_type = site_type;
    return this;
  }

  setAddress(address: any): Site {
    this.address = address;
    return this;
  }

  setGeofencePolygon(geofence_polygon: any): Site {
    this.geofence_polygon = geofence_polygon;
    return this;
  }

  setGeofenceRadius(geofence_radius: number): Site {
    this.geofence_radius = geofence_radius;
    return this;
  }

  setQRReference(qr_reference: number): Site {
    this.qr_reference = qr_reference;
    return this;
  }

  setActive(active: boolean): Site {
    this.active = active;
    return this;
  }

  setPublic(publicSite: boolean): Site {
    this.public = publicSite;
    return this;
  }

  setQRCodeData(qr_code_data: any): Site {
    this.qr_code_data = qr_code_data;
    return this;
  }

  setAllowedRoles(allowed_roles: any): Site {
    this.allowed_roles = allowed_roles;
    return this;
  }

  // === MÉTHODES MÉTIER SPÉCIALISÉES ===

  isManagerSite(): boolean {
    return this.site_type === SiteType.MANAGER;
  }

  isGlobalSite(): boolean {
    return this.site_type === SiteType.GLOBAL;
  }

  isTemporarySite(): boolean {
    return this.site_type === SiteType.TEMPORARY;
  }

  isPublicSite(): boolean {
    return this.site_type === SiteType.PUBLIC;
  }

  // === VALIDATION GÉOSPATIALE ===

  // async validateGeofenceAccess(
  //   latitude: number,
  //   longitude: number,
  // ): Promise<{
  //   access_granted: boolean;
  //   distance_from_center: number;
  //   within_geofence: boolean;
  //   tolerance_applied: number;
  // }> {
  //   if (!this.id) {
  //     return {
  //       access_granted: false,
  //       distance_from_center: -1,
  //       within_geofence: false,
  //       tolerance_applied: 0,
  //     };
  //   }
  //   return await super.validateGeofenceAccess(this.id, latitude, longitude);
  // }

  // === GESTION QR CODE ===

  async regenerateQRCode(reason?: string): Promise<any> {
    if (!this.id) return null;
    const newQRData = await this.regenerateQRCodeData(this.id);
    if (newQRData) {
      this.qr_code_data = newQRData;
    }
    return newQRData;
  }

  getQRToken(): string | null {
    return this.qr_code_data?.qr_token || null;
  }

  validateQRToken(providedToken: string): boolean {
    const storedToken = this.getQRToken();
    return storedToken === providedToken;
  }

  // === GESTION PERMISSIONS ===

  async validateUserAccess(user_id: number, user_roles: string[] = []): Promise<boolean> {
    if (!this.isActive()) return false;

    // Site public
    if (this.isPublic()) return true;

    // Créateur du site
    if (this.created_by === user_id) return true;

    // Vérification des rôles autorisés
    if (this.allowed_roles && Array.isArray(this.allowed_roles)) {
      return user_roles.some((role) => this.allowed_roles.includes(role));
    }

    return false;
  }

  // === GESTION SITES TEMPORAIRES ===

  isExpired(): boolean {
    if (!this.isTemporarySite()) return false;

    const autoExpireDate = this.qr_code_data?.auto_expire_date;
    if (!autoExpireDate) return false;

    return new Date() > new Date(autoExpireDate);
  }

  getDaysUntilExpiration(): number | null {
    if (!this.isTemporarySite()) return null;

    const autoExpireDate = this.qr_code_data?.auto_expire_date;
    if (!autoExpireDate) return null;

    const today = new Date();
    const expirationDate = new Date(autoExpireDate);
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  isExpiringSoon(days: number = 7): boolean {
    const daysUntilExpiration = this.getDaysUntilExpiration();
    return daysUntilExpiration !== null && daysUntilExpiration <= days && daysUntilExpiration >= 0;
  }

  async extendValidity(new_end_date: Date, approved_by: number): Promise<void> {
    if (!this.isTemporarySite()) {
      throw new Error('Seuls les sites temporaires peuvent être étendus');
    }

    this.qr_code_data = {
      ...this.qr_code_data,
      auto_expire_date: new_end_date.toISOString(),
      extended_by: approved_by,
      extended_at: new Date().toISOString(),
    };
    await this.save();
  }

  // === ÉVOLUTION SITE ===

  async expandGeofence(new_polygon: any, reason: string): Promise<void> {
    // Log de la modification pour audit
    const oldPolygon = this.geofence_polygon;

    this.geofence_polygon = new_polygon;
    await this.save();

    // TODO: Implémenter le logging d'audit
    console.log(`Site ${this.guid} géofence étendu. Raison: ${reason}`);
  }

  async addTeamMembers(user: number[]): Promise<void> {
    // Cette méthode pourrait être étendue pour gérer une table de liaison
    // Pour l'instant, on peut l'implémenter via allowed_roles ou une logique similaire
    console.log(`Ajout membres équipe ${user.join(', ')} au site ${this.guid}`);
  }

  async removeTeamMembers(user_ids: number[]): Promise<void> {
    // Similaire à addTeamMembers
    console.log(`Retrait membres équipe ${user_ids.join(', ')} du site ${this.guid}`);
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

  async load(identifier: any, byGuid: boolean = false): Promise<Site | null> {
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
  ): Promise<Site[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Site().hydrate(data));
  }

  async listByType(site_type: string): Promise<Site[] | null> {
    const dataset = await this.listAllByType(site_type);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Site().hydrate(data));
  }

  async listByCreator(created_by: number): Promise<Site[] | null> {
    const dataset = await this.listAllByCreator(created_by);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Site().hydrate(data));
  }

  async listActiveSites(): Promise<Site[] | null> {
    const dataset = await this.listAllActiveSites();
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Site().hydrate(data));
  }

  async listPublicSites(): Promise<Site[] | null> {
    const dataset = await this.listAllPublicSites();
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new Site().hydrate(data));
  }

  // async getUserAccessibleSites(user_id: number, user_roles: string[]): Promise<Site[] | null> {
  //   const dataset = await super.getUserAccessibleSites(user_id, user_roles);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new Site().hydrate(data));
  // }

  // async findNearLocation(
  //   latitude: number,
  //   longitude: number,
  //   radiusMeters: number = 1000,
  // ): Promise<Site[] | null> {
  //   const dataset = await this.findSitesNearLocation(latitude, longitude, radiusMeters);
  //   if (!dataset || dataset.length === 0) return null;
  //   return dataset.map((data) => new Site().hydrate(data));
  // }

  async findByQRToken(qr_token: string): Promise<Site | null> {
    const data = await this.getByQRToken(qr_token);
    if (!data) return null;
    return new Site().hydrate(data);
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Site Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const createdBy = await this.getCreatedByObj();
    const qrReference = await this.getQRReferenceObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.NAME]: this.name,
      [RS.SITE_TYPE]: this.site_type,
      [RS.ADDRESS]: this.address,
      [RS.GEOFENCE_RADIUS]: this.geofence_radius,
      [RS.ACTIVE]: this.active,
      [RS.PUBLIC]: this.public,
      [RS.ALLOWED_ROLES]: this.allowed_roles,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.CREATED_BY]: createdBy?.getGuid(),
        [RS.QR_REFERENCE]: qrReference?.getGuid(),
        [RS.QR_TOKEN]: this.getQRToken(),
      };
    }

    return {
      ...baseData,
      [RS.CREATED_BY]: createdBy ? createdBy.toJSON() : null,
      [RS.QR_REFERENCE]: qrReference ? qrReference.toJSON() : null,
      [RS.GEOFENCE_POLYGON]: this.geofence_polygon,
      [RS.QR_CODE_DATA]: this.qr_code_data,
      // Informations calculées
      is_expired: this.isExpired(),
      days_until_expiration: this.getDaysUntilExpiration(),
      is_expiring_soon: this.isExpiringSoon(),
    };
  }

  // === MÉTHODES PRIVÉES ===

  private hydrate(data: any): Site {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.created_by = data.created_by;
    this.name = data.name;
    this.site_type = data.site_type;
    this.address = data.address;
    this.geofence_polygon = data.geofence_polygon;
    this.geofence_radius = data.geofence_radius;
    this.qr_reference = data.qr_reference;
    this.qr_code_data = data.qr_code_data;
    this.active = data.active;
    this.public = data.public;
    this.allowed_roles = data.allowed_roles;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
