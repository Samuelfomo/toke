import QrCodeGenerationModel from '../model/QrCodeGenerationModel.js';
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
import Site from './Site.js';

export default class QrCodeGeneration extends QrCodeGenerationModel {
  private managerObj?: User;
  private siteObj?: Site;

  constructor() {
    super();
  }

  static _load(identifier: any, byGuid: boolean = false): Promise<QrCodeGeneration | null> {
    return new QrCodeGeneration().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    return new QrCodeGeneration().list(conditions, paginationOptions);
  }

  static _listBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    return new QrCodeGeneration().listBySite(site, paginationOptions);
  }

  static _listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    return new QrCodeGeneration().listByManager(manager, paginationOptions);
  }

  static async exportable(paginationOptions: { offset?: number; limit?: number } = {}): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const qrCodes = await this._list({}, paginationOptions);
    if (qrCodes) {
      items = qrCodes.map((qrCode) => qrCode.toJSON());
    }
    return {
      revision: await TenantRevision.getRevision(tableName.QR_CODE_GENERATION),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // === GETTERS ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getSite(): number | undefined {
    return this.site;
  }

  getManager(): number | undefined {
    return this.manager;
  }

  async getManagerObj(): Promise<User | null> {
    if (!this.manager) return null;
    if (!this.managerObj) {
      this.managerObj = (await User._load(this.manager)) || undefined;
    }
    return this.managerObj || null;
  }

  async getSiteObj(): Promise<Site | null> {
    if (!this.site) return null;
    if (!this.siteObj) {
      this.siteObj = (await Site._load(this.site)) || undefined;
    }
    return this.siteObj || null;
  }

  getValidFrom(): Date | undefined {
    return this.valid_from;
  }

  getValidTo(): Date | undefined {
    return this.valid_to;
  }

  // === SETTERS ===

  setGuid(guid: string): QrCodeGeneration {
    this.guid = guid;
    return this;
  }

  setSite(site: number): QrCodeGeneration {
    this.site = site;
    return this;
  }

  setManager(manager: number): QrCodeGeneration {
    this.manager = manager;
    return this;
  }

  setValidFrom(valid_from: Date | null): QrCodeGeneration {
    this.valid_from = valid_from || undefined;
    return this;
  }

  setValidTo(valid_to: Date | null): QrCodeGeneration {
    this.valid_to = valid_to || undefined;
    return this;
  }

  // === MÉTHODES MÉTIER ===

  isExpired(): boolean {
    if (!this.valid_to) {
      return false;
    }
    return new Date() > this.valid_to;
  }

  isActive(): boolean {
    const now = new Date();
    const afterStart = !this.valid_from || now >= this.valid_from;
    const beforeEnd = !this.valid_to || now <= this.valid_to;
    return afterStart && beforeEnd;
  }

  isUnlimited(): boolean {
    return !this.valid_from && !this.valid_to;
  }

  getRemainingDays(): number | null {
    if (!this.valid_to) {
      return null;
    }
    const now = new Date();
    const diff = this.valid_to.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // === LOGIQUE ===

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
      throw new Error(error);
    }
  }

  async load(identifier: any, byGuid: boolean = false): Promise<QrCodeGeneration | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new QrCodeGeneration().hydrate(data));
  }

  async listBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    const dataset = await this.listAllBySite(site, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new QrCodeGeneration().hydrate(data));
  }

  async listByManager(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<QrCodeGeneration[] | null> {
    const dataset = await this.listAllByManager(manager, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new QrCodeGeneration().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: QrCodeGeneration Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const site = await this.getSiteObj();
    const manager = await this.getManagerObj();
    const baseData = {
      [RS.GUID]: this.guid,
      [RS.VALID_FROM]: this.valid_from,
      [RS.VALID_TO]: this.valid_to,
      is_expired: this.isExpired(),
      is_active: this.isActive(),
      is_unlimited: this.isUnlimited(),
      remaining_days: this.getRemainingDays(),
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.SITE]: site?.getGuid(),
        [RS.MANAGER]: manager?.getGuid(),
      };
    }
    return {
      ...baseData,
      [RS.SITE]: await site?.toJSON(),
      [RS.MANAGER]: manager?.toJSON(),
    };
  }

  private hydrate(data: any): QrCodeGeneration {
    this.id = data.id;
    this.guid = data.guid;
    this.site = data.site;
    this.manager = data.manager;
    this.valid_from = data.valid_from;
    this.valid_to = data.valid_to;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
