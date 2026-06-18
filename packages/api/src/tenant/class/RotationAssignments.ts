import { RAFamily, TimezoneConfigUtils } from '@toke/shared';

import RotationAssignmentModel from '../model/RotationAssignmentsModel.js';
import { RotationTemplateSnapshot } from '../model/RotationGroupTemplateModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';

import RotationGroup from './RotationGroups.js';
import User from './User.js';
import Groups from './Groups.js';

export default class RotationAssignment extends RotationAssignmentModel {
  private relatedObj?: User | Groups;
  private assignedByObj?: User;
  private rotationGroupObj?: RotationGroup;

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byRelatedAndGroup: boolean = false,
  ): Promise<RotationAssignment | null> {
    return new RotationAssignment().load(identifier, byGuid, byRelatedAndGroup);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().list(conditions, paginationOptions);
  }

  static _listByRelated(
    family: RAFamily,
    related: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByRelated(family, related, paginationOptions);
  }

  static _listByAssignedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByAssignedBy(manager, paginationOptions);
  }

  static _listByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByRotationGroup(rotationGroupId, paginationOptions);
  }

  static _listByOffset(
    offset: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByOffset(offset, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const assignments = await this._list(conditions, paginationOptions);
    if (assignments) {
      items = await Promise.all(assignments.map(async (a) => await a.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.ROTATION_ASSIGNMENTS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  // ============================================
  // GETTERS
  // ============================================

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getFamily(): RAFamily | undefined {
    return this.family;
  }

  getRelated(): string | undefined {
    return this.related;
  }

  async getRelatedObj(): Promise<User | Groups | null> {
    if (!this.related || !this.family) return null;
    if (!this.relatedObj) {
      this.relatedObj =
        this.family === 'user'
          ? (await User._load(this.related, true)) || undefined
          : (await Groups._load(this.related, true)) || undefined;
    }
    return this.relatedObj || null;
  }

  getAssignedBy(): number | undefined {
    return this.assigned_by;
  }

  async getAssignedByObj(): Promise<User | null> {
    if (!this.assigned_by) return null;
    if (!this.assignedByObj) {
      this.assignedByObj = (await User._load(this.assigned_by)) || undefined;
    }
    return this.assignedByObj || null;
  }

  getRotationGroup(): number | undefined {
    return this.rotation_group;
  }

  async getRotationGroupObj(): Promise<RotationGroup | null> {
    if (!this.rotation_group) return null;
    if (!this.rotationGroupObj) {
      this.rotationGroupObj = (await RotationGroup._load(this.rotation_group)) || undefined;
    }
    return this.rotationGroupObj || null;
  }

  getOffset(): number | undefined {
    return this.offset;
  }

  getAssignedAt(): Date | undefined {
    return this.assigned_at;
  }

  /**
   * Retourne la date du dernier avancement de l'offset par le cron.
   * Format 'YYYY-MM-DD'. null si jamais avancé.
   */
  getLastAdvancedDate(): string | null {
    return this.last_advanced_date ?? null;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  isActive(): boolean {
    return this.active === true;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setFamily(family: RAFamily): RotationAssignment {
    this.family = family;
    return this;
  }

  setRelated(related: string): RotationAssignment {
    this.related = related;
    this.relatedObj = undefined; // Reset cache
    return this;
  }

  setAssignedBy(manager: number): RotationAssignment {
    this.assigned_by = manager;
    this.assignedByObj = undefined;
    return this;
  }

  setRotationGroup(rotationGroupId: number): RotationAssignment {
    this.rotation_group = rotationGroupId;
    this.rotationGroupObj = undefined;
    return this;
  }

  setOffset(offset: number): RotationAssignment {
    this.offset = offset;
    return this;
  }

  setAssignedAt(assignedAt: Date): RotationAssignment {
    this.assigned_at = assignedAt;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  isUserRotation(): boolean {
    return this.family === 'user';
  }

  isGroupsRotation(): boolean {
    return this.family === 'group';
  }

  /**
   * Retourne le snapshot JSONB du template applicable pour une date donnée,
   * en tenant compte de l'offset de cette assignation.
   */
  async getSnapshotForDate(): Promise<Omit<RotationTemplateSnapshot, 'id'> | null> {
    const rotationGroup = await this.getRotationGroupObj();
    if (!rotationGroup) return null;
    return rotationGroup.getSnapshotForDate(this.offset ?? 0);
  }

  /**
   * Méthode réservée exclusivement au cron de rotation.
   * Met à jour en une seule opération atomique :
   *   - l'offset (nouvelle position dans le cycle de templates)
   *   - last_advanced_date (garde-fou anti-double avancement)
   */
  async applyRotationOffset(newOffset: number, advancedDate: string): Promise<boolean> {
    if (!this.id) throw new Error('Cannot update offset on unsaved assignment');

    const updated = await this.updateOffsetOnly(this.id, newOffset, advancedDate);
    if (updated) {
      this.offset = newOffset;
      this.last_advanced_date = advancedDate;
    }
    return updated;
  }

  isRecentAssignment(daysThreshold: number = 7): boolean {
    if (!this.assigned_at) return false;
    const now = TimezoneConfigUtils.getCurrentTime();
    const diffDays = (now.getTime() - this.assigned_at.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= daysThreshold;
  }

  getDaysAssigned(): number {
    if (!this.assigned_at) return 0;
    const now = TimezoneConfigUtils.getCurrentTime();
    return Math.floor((now.getTime() - this.assigned_at.getTime()) / (1000 * 60 * 60 * 24));
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

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(
    identifier: any,
    byGuid: boolean = false,
    byRelatedAndGroup: boolean = false,
  ): Promise<RotationAssignment | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else if (byRelatedAndGroup) {
      // identifier = { family, related, rotationGroup }
      data = await this.findByRelatedAndRotationGroup(
        identifier.family,
        identifier.related,
        identifier.rotationGroup,
      );
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignment().hydrate(data));
  }

  async listByRelated(
    family: RAFamily,
    related: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByRelated(family, related, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignment().hydrate(data));
  }

  async listByAssignedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByAssignedBy(manager, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignment().hydrate(data));
  }

  async listByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByRotationGroup(rotationGroupId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignment().hydrate(data));
  }

  async listByOffset(
    offset: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByOffset(offset, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationAssignment().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: RotationAssignment Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const relatedObj = await this.getRelatedObj();
    const assignedByObj = await this.getAssignedByObj();
    const rotationGroupObj = await this.getRotationGroupObj();

    return {
      [RS.GUID]: this.guid,
      [RS.FAMILY]: this.family,
      [RS.OFFSET]: this.offset,
      [RS.ASSIGNED_AT]: this.assigned_at,
      [RS.ACTIVE]: this.active,

      [RS.RELATED]: relatedObj
        ? this.isUserRotation()
          ? (relatedObj as User).toPublicJSON()
          : await (relatedObj as Groups).toJSON()
        : null,
      [RS.ASSIGNED_BY]: assignedByObj
        ? {
            [RS.NAME]: assignedByObj.getFullName(),
            [RS.GUID]: assignedByObj.getGuid(),
          }
        : null,
      [RS.ROTATION_GROUP]: rotationGroupObj
        ? {
            [RS.NAME]: rotationGroupObj.getName(),
            [RS.GUID]: rotationGroupObj.getGuid(),
          }
        : null,
    };
  }

  async toPUBLIC(): Promise<object> {
    const assignedByObj = await this.getAssignedByObj();
    const rotationGroupObj = await this.getRotationGroupObj();

    return {
      [RS.GUID]: this.guid,
      [RS.FAMILY]: this.family,
      [RS.OFFSET]: this.offset,
      [RS.ASSIGNED_AT]: this.assigned_at,
      [RS.ASSIGNED_BY]: assignedByObj ? await assignedByObj.toJSON() : null,
      [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationAssignment {
    this.id = data.id;
    this.guid = data.guid;
    this.family = data.family;
    this.related = data.related;
    this.rotation_group = data.rotation_group;
    this.offset = data.offset;
    this.assigned_by = data.assigned_by;
    this.active = data.active;
    this.assigned_at = data.assigned_at;
    this.last_advanced_date = data.last_advanced_date ?? null;
    this.deleted_at = data.deleted_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
