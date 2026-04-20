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

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.FAMILY]: this.family,
      [RS.OFFSET]: this.offset,
      [RS.ASSIGNED_AT]: this.assigned_at,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.RELATED]: relatedObj
          ? this.isUserRotation()
            ? (relatedObj as User).getGuid()
            : (relatedObj as Groups).getGuid()
          : null,
        [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.getGuid() : null,
        [RS.ROTATION_GROUP]: rotationGroupObj ? rotationGroupObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.RELATED]: relatedObj
        ? this.isUserRotation()
          ? (relatedObj as User).toPublicJSON()
          : await (relatedObj as Groups).toPublicJSON()
        : null,
      [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.toPublicJSON() : null,
      [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
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

// import { TimezoneConfigUtils } from '@toke/shared';
//
// import RotationAssignmentModel from '../model/RotationAssignmentsModel.js';
// import { RotationTemplateSnapshot } from '../model/RotationGroupTemplateModel.js';
// import W from '../../tools/watcher.js';
// import G from '../../tools/glossary.js';
// import {
//   responseStructure as RS,
//   responseValue,
//   tableName,
//   ViewMode,
// } from '../../utils/response.model.js';
// import { TenantRevision } from '../../tools/revision.js';
//
// import RotationGroup from './RotationGroups.js';
// import User from './User.js';
// import Groups from './Groups.js';
//
// export default class RotationAssignment extends RotationAssignmentModel {
//   private relatedObj?: User | Groups;
//   private assignedByObj?: User;
//   private rotationGroupObj?: RotationGroup;
//
//   constructor() {
//     super();
//   }
//
//   // ============================================
//   // MÉTHODES STATIQUES DE CHARGEMENT
//   // ============================================
//
//   static _load(
//     identifier: any,
//     byGuid: boolean = false,
//     byUserAndGroup: boolean = false,
//     byGroupsAndGroup: boolean = false,
//   ): Promise<RotationAssignment | null> {
//     return new RotationAssignment().load(identifier, byGuid, byUserAndGroup, byGroupsAndGroup);
//   }
//
//   static _list(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().list(conditions, paginationOptions);
//   }
//
//   static _listByUser(
//     userId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().listByUser(userId, paginationOptions);
//   }
//
//   static _listByAssignedBy(
//     manager: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().listByAssignedBy(manager, paginationOptions);
//   }
//
//   static _listByGroups(
//     groupsId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().listByGroups(groupsId, paginationOptions);
//   }
//
//   static _listByRotationGroup(
//     rotationGroupId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().listByRotationGroup(rotationGroupId, paginationOptions);
//   }
//
//   static _listByOffset(
//     offset: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     return new RotationAssignment().listByOffset(offset, paginationOptions);
//   }
//
//   static async exportable(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<{
//     revision: string;
//     pagination: { offset?: number; limit?: number; count?: number };
//     items: any[];
//   }> {
//     let items: any[] = [];
//     const assignments = await this._list(conditions, paginationOptions);
//     if (assignments) {
//       items = await Promise.all(assignments.map(async (a) => await a.toJSON()));
//     }
//     return {
//       revision: await TenantRevision.getRevision(tableName.ROTATION_ASSIGNMENTS),
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || items.length,
//         count: items.length,
//       },
//       items,
//     };
//   }
//
//   // ============================================
//   // GETTERS FLUENT
//   // ============================================
//
//   getId(): number | undefined {
//     return this.id;
//   }
//   getGuid(): string | undefined {
//     return this.guid;
//   }
//   getUser(): number | null | undefined {
//     return this.user;
//   }
//   getAssignedBy(): number | undefined {
//     return this.assigned_by;
//   }
//   getGroups(): number | null | undefined {
//     return this.groups;
//   }
//   getRotationGroup(): number | undefined {
//     return this.rotation_group;
//   }
//   getOffset(): number | undefined {
//     return this.offset;
//   }
//   getAssignedAt(): Date | undefined {
//     return this.assigned_at;
//   }
//   getDeletedAt(): Date | null | undefined {
//     return this.deleted_at;
//   }
//   getCreatedAt(): Date | undefined {
//     return this.created_at;
//   }
//   getUpdatedAt(): Date | undefined {
//     return this.updated_at;
//   }
//
//   /**
//    * Retourne la date du dernier avancement de l'offset par le cron.
//    * Format 'YYYY-MM-DD' (DATEONLY). null si jamais avancé.
//    * Utilisé comme garde-fou d'idempotence dans shouldAdvanceToday().
//    */
//   getLastAdvancedDate(): string | null {
//     return this.last_advanced_date ?? null;
//   }
//
//   isActive(): boolean {
//     return this.active === true;
//   }
//
//   async getUserObj(): Promise<User | null> {
//     if (!this.user) return null;
//     if (!this.userObj) this.userObj = (await User._load(this.user)) || undefined;
//     return this.userObj || null;
//   }
//
//   async getAssignedByObj(): Promise<User | null> {
//     if (!this.assigned_by) return null;
//     if (!this.assignedByObj) this.assignedByObj = (await User._load(this.assigned_by)) || undefined;
//     return this.assignedByObj || null;
//   }
//
//   async getGroupsObj(): Promise<Groups | null> {
//     if (!this.groups) return null;
//     if (!this.groupsObj) this.groupsObj = (await Groups._load(this.groups)) || undefined;
//     return this.groupsObj || null;
//   }
//
//   async getRotationGroupObj(): Promise<RotationGroup | null> {
//     if (!this.rotation_group) return null;
//     if (!this.rotationGroupObj) {
//       this.rotationGroupObj = (await RotationGroup._load(this.rotation_group)) || undefined;
//     }
//     return this.rotationGroupObj || null;
//   }
//
//   // ============================================
//   // SETTERS FLUENT
//   // ============================================
//
//   setUser(userId: number | null): RotationAssignment {
//     this.user = userId;
//     this.userObj = undefined;
//     return this;
//   }
//
//   setAssignedBy(manager: number): RotationAssignment {
//     this.assigned_by = manager;
//     this.assignedByObj = undefined;
//     return this;
//   }
//
//   setGroups(groupsId: number | null): RotationAssignment {
//     this.groups = groupsId;
//     this.groupsObj = undefined;
//     return this;
//   }
//
//   setRotationGroup(rotationGroupId: number): RotationAssignment {
//     this.rotation_group = rotationGroupId;
//     this.rotationGroupObj = undefined;
//     return this;
//   }
//
//   setOffset(offset: number): RotationAssignment {
//     this.offset = offset;
//     return this;
//   }
//
//   setAssignedAt(assignedAt: Date): RotationAssignment {
//     this.assigned_at = assignedAt;
//     return this;
//   }
//
//   // ============================================
//   // MÉTHODES MÉTIER
//   // ============================================
//
//   isNew(): boolean {
//     return this.id === undefined;
//   }
//   isUserRotation(): boolean {
//     return this.user !== null && this.user !== undefined;
//   }
//   isGroupsRotation(): boolean {
//     return this.groups !== null && this.groups !== undefined;
//   }
//
//   /**
//    * Retourne le snapshot JSONB du template applicable pour une date donnée,
//    * en tenant compte de l'offset de cette assignation.
//    * Aucune requête vers session_templates — le snapshot est déjà en mémoire
//    * dans les slots du RotationGroup.
//    */
//   async getSnapshotForDate(targetDate: Date): Promise<Omit<RotationTemplateSnapshot, 'id'> | null> {
//     const rotationGroup = await this.getRotationGroupObj();
//     if (!rotationGroup) return null;
//     return rotationGroup.getSnapshotForDate(this.offset ?? 0, targetDate);
//   }
//
//   /**
//    * Méthode réservée exclusivement au cron de rotation.
//    *
//    * Met à jour en une seule opération atomique :
//    *   - l'offset (nouvelle position dans le cycle de templates)
//    *   - last_advanced_date (garde-fou anti-double avancement)
//    *
//    * Bypass de validate() intentionnel — voir updateOffsetOnly() dans le Model.
//    *
//    * @param newOffset    - Nouvelle position calculée : (oldOffset + 1) % templateCount
//    * @param advancedDate - Date du jour 'YYYY-MM-DD' (depuis executedAt normalisé)
//    */
//   async applyRotationOffset(newOffset: number, advancedDate: string): Promise<boolean> {
//     if (!this.id) throw new Error('Cannot update offset on unsaved assignment');
//
//     const updated = await this.updateOffsetOnly(this.id, newOffset, advancedDate);
//     if (updated) {
//       this.offset = newOffset;
//       this.last_advanced_date = advancedDate;
//     }
//     return updated;
//   }
//
//   isRecentAssignment(daysThreshold: number = 7): boolean {
//     if (!this.assigned_at) return false;
//     const now = TimezoneConfigUtils.getCurrentTime();
//     const diffDays = (now.getTime() - this.assigned_at.getTime()) / (1000 * 60 * 60 * 24);
//     return diffDays <= daysThreshold;
//   }
//
//   getDaysAssigned(): number {
//     if (!this.assigned_at) return 0;
//     const now = TimezoneConfigUtils.getCurrentTime();
//     return Math.floor((now.getTime() - this.assigned_at.getTime()) / (1000 * 60 * 60 * 24));
//   }
//
//   async save(): Promise<void> {
//     try {
//       if (this.isNew()) {
//         await this.create();
//       } else {
//         await this.update();
//       }
//     } catch (error: any) {
//       throw new Error(error.message || error);
//     }
//   }
//
//   // ============================================
//   // CHARGEMENT ET LISTING
//   // ============================================
//
//   async load(
//     identifier: any,
//     byGuid: boolean = false,
//     byUserAndGroup: boolean = false,
//     byGroupsAndGroup: boolean = false,
//   ): Promise<RotationAssignment | null> {
//     const data = byGuid
//       ? await this.findByGuid(identifier)
//       : byUserAndGroup
//         ? await this.findByUserAndGroup(identifier.user, identifier.rotationGroup)
//         : byGroupsAndGroup
//           ? await this.findByGroupsAndGroupRotation(identifier.groups, identifier.rotationGroup)
//           : await this.find(Number(identifier));
//
//     if (!data) return null;
//     return this.hydrate(data);
//   }
//
//   async list(
//     conditions: Record<string, any> = {},
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAll(conditions, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async listByUser(
//     userId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAllByUser(userId, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async listByAssignedBy(
//     manager: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAllByAssignedBy(manager, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async listByGroups(
//     groupsId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAllByGroups(groupsId, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async listByRotationGroup(
//     rotationGroupId: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAllByRotationGroup(rotationGroupId, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async listByOffset(
//     offset: number,
//     paginationOptions: { offset?: number; limit?: number } = {},
//   ): Promise<RotationAssignment[] | null> {
//     const dataset = await this.listAllByOffset(offset, paginationOptions);
//     if (!dataset || dataset.length === 0) return null;
//     return dataset.map((data) => new RotationAssignment().hydrate(data));
//   }
//
//   async delete(): Promise<boolean> {
//     if (this.id !== undefined) {
//       await W.isOccur(!this.id, `${G.identifierMissing.code}: RotationAssignment Delete`);
//       return await this.trash(this.id);
//     }
//     return false;
//   }
//
//   async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
//     const userObj = await this.getUserObj();
//     const assignedByObj = await this.getAssignedByObj();
//     const groupsObj = await this.getGroupsObj();
//     const rotationGroupObj = await this.getRotationGroupObj();
//
//     const baseData = {
//       [RS.GUID]: this.guid,
//       [RS.OFFSET]: this.offset,
//       [RS.ASSIGNED_AT]: this.assigned_at,
//       [RS.ACTIVE]: this.active,
//     };
//
//     if (view === responseValue.MINIMAL) {
//       return {
//         ...baseData,
//         [RS.USER]: userObj ? userObj.getGuid() : null,
//         [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.getGuid() : null,
//         [RS.GROUP]: groupsObj ? groupsObj.getGuid() : null,
//         [RS.ROTATION_GROUP]: rotationGroupObj ? rotationGroupObj.getGuid() : null,
//       };
//     }
//
//     return {
//       ...baseData,
//       [RS.USER]: userObj ? userObj.toPublicJSON() : null,
//       [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.toPublicJSON() : null,
//       [RS.GROUP]: groupsObj ? await groupsObj.toPublicJSON() : null,
//       [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
//     };
//   }
//
//   async toPUBLIC(): Promise<object> {
//     const assignedByObj = await this.getAssignedByObj();
//     const rotationGroupObj = await this.getRotationGroupObj();
//
//     return {
//       [RS.GUID]: this.guid,
//       [RS.OFFSET]: this.offset,
//       [RS.ASSIGNED_AT]: this.assigned_at,
//       [RS.ASSIGNED_BY]: assignedByObj ? await assignedByObj.toJSON() : null,
//       [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
//     };
//   }
//
//   // ============================================
//   // MÉTHODES PRIVÉES
//   // ============================================
//
//   private hydrate(data: any): RotationAssignment {
//     this.id = data.id;
//     this.guid = data.guid;
//     this.user = data.user;
//     this.assigned_by = data.assigned_by;
//     this.groups = data.groups;
//     this.rotation_group = data.rotation_group;
//     this.offset = data.offset;
//     this.assigned_at = data.assigned_at;
//     this.last_advanced_date = data.last_advanced_date ?? null;
//     this.active = data.active;
//     this.deleted_at = data.deleted_at;
//     this.created_at = data.created_at;
//     this.updated_at = data.updated_at;
//     return this;
//   }
// }
//
// // import { TimezoneConfigUtils } from '@toke/shared';
// //
// // import RotationAssignmentModel from '../model/RotationAssignmentsModel.js';
// // import W from '../../tools/watcher.js';
// // import G from '../../tools/glossary.js';
// // import {
// //   responseStructure as RS,
// //   responseValue,
// //   tableName,
// //   ViewMode,
// // } from '../../utils/response.model.js';
// // import { TenantRevision } from '../../tools/revision.js';
// // import { RotationTemplateSnapshot } from '../model/RotationGroupTemplateModel.js';
// //
// // import RotationGroup from './RotationGroups.js';
// // import User from './User.js';
// // import Groups from './Groups.js';
// //
// // export default class RotationAssignment extends RotationAssignmentModel {
// //   private userObj?: User;
// //   private assignedByObj?: User;
// //   private groupsObj?: Groups;
// //   private rotationGroupObj?: RotationGroup;
// //
// //   constructor() {
// //     super();
// //   }
// //
// //   // ============================================
// //   // MÉTHODES STATIQUES DE CHARGEMENT
// //   // ============================================
// //
// //   static _load(
// //     identifier: any,
// //     byGuid: boolean = false,
// //     byUserAndGroup: boolean = false,
// //     byGroupsAndGroup: boolean = false,
// //   ): Promise<RotationAssignment | null> {
// //     return new RotationAssignment().load(identifier, byGuid, byUserAndGroup, byGroupsAndGroup);
// //   }
// //
// //   static _list(
// //     conditions: Record<string, any> = {},
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().list(conditions, paginationOptions);
// //   }
// //
// //   static _listByUser(
// //     userId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().listByUser(userId, paginationOptions);
// //   }
// //
// //   static _listByAssignedBy(
// //     manager: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().listByAssignedBy(manager, paginationOptions);
// //   }
// //
// //   static _listByGroups(
// //     groupsId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().listByGroups(groupsId, paginationOptions);
// //   }
// //
// //   static _listByRotationGroup(
// //     rotationGroupId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().listByRotationGroup(rotationGroupId, paginationOptions);
// //   }
// //
// //   static _listByOffset(
// //     offset: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     return new RotationAssignment().listByOffset(offset, paginationOptions);
// //   }
// //
// //   static async exportable(
// //     conditions: Record<string, any> = {},
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<{
// //     revision: string;
// //     pagination: { offset?: number; limit?: number; count?: number };
// //     items: any[];
// //   }> {
// //     let items: any[] = [];
// //     const assignments = await this._list(conditions, paginationOptions);
// //     if (assignments) {
// //       items = await Promise.all(assignments.map(async (assignment) => await assignment.toJSON()));
// //     }
// //     return {
// //       revision: await TenantRevision.getRevision(tableName.ROTATION_ASSIGNMENTS),
// //       pagination: {
// //         offset: paginationOptions.offset || 0,
// //         limit: paginationOptions.limit || items.length,
// //         count: items.length,
// //       },
// //       items,
// //     };
// //   }
// //
// //   // ============================================
// //   // GETTERS FLUENT
// //   // ============================================
// //
// //   getId(): number | undefined {
// //     return this.id;
// //   }
// //
// //   getGuid(): string | undefined {
// //     return this.guid;
// //   }
// //
// //   getUser(): number | null | undefined {
// //     return this.user;
// //   }
// //
// //   getAssignedBy(): number | undefined {
// //     return this.assigned_by;
// //   }
// //
// //   async getUserObj(): Promise<User | null> {
// //     if (!this.user) return null;
// //     if (!this.userObj) {
// //       this.userObj = (await User._load(this.user)) || undefined;
// //     }
// //     return this.userObj || null;
// //   }
// //
// //   async getAssignedByObj(): Promise<User | null> {
// //     if (!this.assigned_by) return null;
// //     if (!this.assignedByObj) {
// //       this.assignedByObj = (await User._load(this.assigned_by)) || undefined;
// //     }
// //     return this.assignedByObj || null;
// //   }
// //
// //   getGroups(): number | null | undefined {
// //     return this.groups;
// //   }
// //
// //   async getGroupsObj(): Promise<Groups | null> {
// //     if (!this.groups) return null;
// //     if (!this.groupsObj) {
// //       this.groupsObj = (await Groups._load(this.groups)) || undefined;
// //     }
// //     return this.groupsObj || null;
// //   }
// //
// //   getRotationGroup(): number | undefined {
// //     return this.rotation_group;
// //   }
// //
// //   async getRotationGroupObj(): Promise<RotationGroup | null> {
// //     if (!this.rotation_group) return null;
// //     if (!this.rotationGroupObj) {
// //       this.rotationGroupObj = (await RotationGroup._load(this.rotation_group)) || undefined;
// //     }
// //     return this.rotationGroupObj || null;
// //   }
// //
// //   getOffset(): number | undefined {
// //     return this.offset;
// //   }
// //
// //   getAssignedAt(): Date | undefined {
// //     return this.assigned_at;
// //   }
// //
// //   getDeletedAt(): Date | null | undefined {
// //     return this.deleted_at;
// //   }
// //
// //   getCreatedAt(): Date | undefined {
// //     return this.created_at;
// //   }
// //   getUpdatedAt(): Date | undefined {
// //     return this.updated_at;
// //   }
// //
// //   getLastCycleIndex(): number {
// //     return this.last_cycle_index ?? 0;
// //   }
// //
// //   isActive(): boolean {
// //     return this.active;
// //   }
// //
// //   // ============================================
// //   // SETTERS FLUENT
// //   // ============================================
// //
// //   setUser(userId: number | null): RotationAssignment {
// //     this.user = userId;
// //     this.userObj = undefined; // Reset cache
// //     return this;
// //   }
// //
// //   setAssignedBy(manager: number): RotationAssignment {
// //     this.assigned_by = manager;
// //     this.assignedByObj = undefined; // Reset cache
// //     return this;
// //   }
// //
// //   setGroups(groupsId: number | null): RotationAssignment {
// //     this.groups = groupsId;
// //     this.groupsObj = undefined;
// //     return this;
// //   }
// //
// //   setRotationGroup(rotationGroupId: number): RotationAssignment {
// //     this.rotation_group = rotationGroupId;
// //     this.rotationGroupObj = undefined; // Reset cache
// //     return this;
// //   }
// //
// //   setOffset(offset: number): RotationAssignment {
// //     this.offset = offset;
// //     return this;
// //   }
// //
// //   setAssignedAt(assignedAt: Date): RotationAssignment {
// //     this.assigned_at = assignedAt;
// //     return this;
// //   }
// //
// //   setLastCycleIndex(index: number): RotationAssignment {
// //     this.last_cycle_index = index;
// //     return this;
// //   }
// //
// //   // ============================================
// //   // MÉTHODES MÉTIER
// //   // ============================================
// //
// //   isNew(): boolean {
// //     return this.id === undefined;
// //   }
// //
// //   /**
// //    * Vérifie si la rotation est pour un utilisateur spécifique
// //    */
// //   isUserRotation(): boolean {
// //     return this.user !== null && this.user !== undefined;
// //   }
// //
// //   /**
// //    * Vérifie si la rotation est pour une groups
// //    */
// //   isGroupsRotation(): boolean {
// //     return this.groups === null && this.groups === undefined;
// //   }
// //
// //   /**
// //    * Retourne le snapshot JSONB du template applicable pour une date donnée,
// //    * en tenant compte de l'offset de cette assignation.
// //    *
// //    * Remplace l'ancienne getTemplateForDate() qui retournait un ID entier
// //    * et nécessitait un SessionTemplate._load() supplémentaire.
// //    * Ici le snapshot est déjà en mémoire dans les slots du RotationGroup.
// //    */
// //   async getSnapshotForDate(targetDate: Date): Promise<Omit<RotationTemplateSnapshot, 'id'> | null> {
// //     const rotationGroup = await this.getRotationGroupObj();
// //     if (!rotationGroup) return null;
// //
// //     return rotationGroup.getSnapshotForDate(this.offset ?? 0, targetDate);
// //   }
// //
// //   /**
// //    * Met à jour l'offset directement en DB sans déclencher validate().
// //    * Réservé exclusivement au cron de rotation.
// //    *
// //    * validate() est intentionnellement bypassée car :
// //    *   - elle rejette assigned_at si antérieur à 5 min
// //    *   - elle vérifie user|groups — non portés par l'instance cron
// //    *   - le cron modifie uniquement la position dans le cycle,
// //    *     jamais la configuration de l'assignation
// //    */
// //   async applyRotationOffset(newOffset: number): Promise<boolean> {
// //     if (!this.id) throw new Error('Cannot update offset on unsaved assignment');
// //
// //     const updated = await this.updateOffsetOnly(this.id, newOffset);
// //     if (updated) this.offset = newOffset;
// //     return updated;
// //   }
// //
// //   /**
// //    * Vérifie si l'assignment est récent (assigné il y a moins de X jours)
// //    */
// //   isRecentAssignment(daysThreshold: number = 7): boolean {
// //     if (!this.assigned_at) return false;
// //
// //     const now = TimezoneConfigUtils.getCurrentTime();
// //     const diffTime = now.getTime() - this.assigned_at.getTime();
// //     const diffDays = diffTime / (1000 * 60 * 60 * 24);
// //
// //     return diffDays <= daysThreshold;
// //   }
// //
// //   /**
// //    * Calcule depuis combien de jours l'utilisateur est assigné
// //    */
// //   getDaysAssigned(): number {
// //     if (!this.assigned_at) return 0;
// //
// //     const now = TimezoneConfigUtils.getCurrentTime();
// //     const diffTime = now.getTime() - this.assigned_at.getTime();
// //     return Math.floor(diffTime / (1000 * 60 * 60 * 24));
// //   }
// //
// //   async save(): Promise<void> {
// //     try {
// //       if (this.isNew()) {
// //         await this.create();
// //       } else {
// //         await this.update();
// //       }
// //     } catch (error: any) {
// //       throw new Error(error.message || error);
// //     }
// //   }
// //
// //   // ============================================
// //   // CHARGEMENT ET LISTING
// //   // ============================================
// //
// //   async load(
// //     identifier: any,
// //     byGuid: boolean = false,
// //     byUserAndGroup: boolean = false,
// //     byGroupsAndGroup: boolean = false,
// //   ): Promise<RotationAssignment | null> {
// //     const data = byGuid
// //       ? await this.findByGuid(identifier)
// //       : byUserAndGroup
// //         ? await this.findByUserAndGroup(identifier.user, identifier.rotationGroup)
// //         : byGroupsAndGroup
// //           ? await this.findByGroupsAndGroupRotation(identifier.groups, identifier.rotationGroup)
// //           : await this.find(Number(identifier));
// //
// //     if (!data) return null;
// //     return this.hydrate(data);
// //   }
// //
// //   async list(
// //     conditions: Record<string, any> = {},
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAll(conditions, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async listByUser(
// //     userId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAllByUser(userId, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async listByAssignedBy(
// //     manager: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAllByAssignedBy(manager, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async listByGroups(
// //     groupsId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAllByGroups(groupsId, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async listByRotationGroup(
// //     rotationGroupId: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAllByRotationGroup(rotationGroupId, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async listByOffset(
// //     offset: number,
// //     paginationOptions: { offset?: number; limit?: number } = {},
// //   ): Promise<RotationAssignment[] | null> {
// //     const dataset = await this.listAllByOffset(offset, paginationOptions);
// //     if (!dataset || dataset.length === 0) return null;
// //     return dataset.map((data) => new RotationAssignment().hydrate(data));
// //   }
// //
// //   async delete(): Promise<boolean> {
// //     if (this.id !== undefined) {
// //       await W.isOccur(!this.id, `${G.identifierMissing.code}: RotationAssignment Delete`);
// //       return await this.trash(this.id);
// //     }
// //     return false;
// //   }
// //
// //   // async applyRotationOffset(newOffset: number, currentCycle: number): Promise<boolean> {
// //   //   if (!this.id) throw new Error('Cannot update offset on unsaved assignment');
// //   //   const updated = await this.updateOffsetOnly(this.id, newOffset, currentCycle);
// //   //   if (updated) this.offset = newOffset;
// //   //   return updated;
// //   // }
// //
// //   async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
// //     const userObj = await this.getUserObj();
// //     const assignedByObj = await this.getAssignedByObj();
// //     const groupsObj = await this.getGroupsObj();
// //     const rotationGroupObj = await this.getRotationGroupObj();
// //
// //     const baseData = {
// //       [RS.GUID]: this.guid,
// //       [RS.OFFSET]: this.offset,
// //       [RS.ASSIGNED_AT]: this.assigned_at,
// //       [RS.ACTIVE]: this.active,
// //     };
// //
// //     if (view === responseValue.MINIMAL) {
// //       return {
// //         ...baseData,
// //         [RS.USER]: userObj ? userObj.getGuid() : null,
// //         [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.getGuid() : null,
// //         [RS.GROUP]: groupsObj ? groupsObj.getGuid() : null,
// //         [RS.ROTATION_GROUP]: rotationGroupObj ? rotationGroupObj.getGuid() : null,
// //       };
// //     }
// //
// //     return {
// //       ...baseData,
// //       [RS.USER]: userObj ? userObj.toPublicJSON() : null,
// //       [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.toPublicJSON() : null,
// //       [RS.GROUP]: groupsObj ? await groupsObj.toPublicJSON() : null,
// //       [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
// //     };
// //   }
// //
// //   async toPUBLIC(): Promise<object> {
// //     const assignedByObj = await this.getAssignedByObj();
// //     const rotationGroupObj = await this.getRotationGroupObj();
// //
// //     return {
// //       [RS.GUID]: this.guid,
// //       [RS.OFFSET]: this.offset,
// //       [RS.ASSIGNED_AT]: this.assigned_at,
// //       [RS.ACTIVE]: this.active,
// //       [RS.ASSIGNED_BY]: assignedByObj ? await assignedByObj.toJSON() : null,
// //       [RS.ROTATION_GROUP]: rotationGroupObj ? await rotationGroupObj.toJSON() : null,
// //     };
// //   }
// //
// //   // ============================================
// //   // MÉTHODES PRIVÉES
// //   // ============================================
// //
// //   private hydrate(data: any): RotationAssignment {
// //     this.id = data.id;
// //     this.guid = data.guid;
// //     this.user = data.user;
// //     this.assigned_by = data.assigned_by;
// //     this.groups = data.groups;
// //     this.rotation_group = data.rotation_group;
// //     this.offset = data.offset;
// //     this.assigned_at = data.assigned_at;
// //     this.deleted_at = data.deleted_at;
// //     this.created_at = data.created_at;
// //     this.updated_at = data.updated_at;
// //     this.active = data.active;
// //     return this;
// //   }
// // }
