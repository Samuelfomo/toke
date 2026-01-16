import { TimezoneConfigUtils } from '@toke/shared';

import RotationAssignmentModel from '../model/RotationAssignmentsModel.js';
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
  private userObj?: User;
  private assignedByObj?: User;
  private groupsObj?: Groups;
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
    byUserAndGroup: boolean = false,
    byGroupsAndGroup: boolean = false,
  ): Promise<RotationAssignment | null> {
    return new RotationAssignment().load(identifier, byGuid, byUserAndGroup, byGroupsAndGroup);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().list(conditions, paginationOptions);
  }

  static _listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByUser(userId, paginationOptions);
  }

  static _listByAssignedBy(
    manager: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByAssignedBy(manager, paginationOptions);
  }

  static _listByGroups(
    groupsId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    return new RotationAssignment().listByGroups(groupsId, paginationOptions);
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
      items = await Promise.all(assignments.map(async (assignment) => await assignment.toJSON()));
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
  // GETTERS FLUENT
  // ============================================

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getUser(): number | null | undefined {
    return this.user;
  }

  getAssignedBy(): number | undefined {
    return this.assigned_by;
  }

  async getUserObj(): Promise<User | null> {
    if (!this.user) return null;
    if (!this.userObj) {
      this.userObj = (await User._load(this.user)) || undefined;
    }
    return this.userObj || null;
  }

  async getAssignedByObj(): Promise<User | null> {
    if (!this.assigned_by) return null;
    if (!this.assignedByObj) {
      this.assignedByObj = (await User._load(this.assigned_by)) || undefined;
    }
    return this.assignedByObj || null;
  }

  getGroups(): number | null | undefined {
    return this.groups;
  }

  async getGroupsObj(): Promise<Groups | null> {
    if (!this.groups) return null;
    if (!this.groupsObj) {
      this.groupsObj = (await Groups._load(this.groups)) || undefined;
    }
    return this.groupsObj || null;
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

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setUser(userId: number | null): RotationAssignment {
    this.user = userId;
    this.userObj = undefined; // Reset cache
    return this;
  }

  setAssignedBy(manager: number): RotationAssignment {
    this.assigned_by = manager;
    this.assignedByObj = undefined; // Reset cache
    return this;
  }

  setGroups(groupsId: number | null): RotationAssignment {
    this.groups = groupsId;
    this.groupsObj = undefined;
    return this;
  }

  setRotationGroup(rotationGroupId: number): RotationAssignment {
    this.rotation_group = rotationGroupId;
    this.rotationGroupObj = undefined; // Reset cache
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

  /**
   * Vérifie si la rotation est pour un utilisateur spécifique
   */
  isUserRotation(): boolean {
    return this.user !== null && this.user !== undefined;
  }

  /**
   * Vérifie si la rotation est pour une groups
   */
  isGroupsRotation(): boolean {
    return this.groups === null && this.groups === undefined;
  }

  /**
   * Calcule quel template doit être appliqué pour une date donnée
   * en tenant compte de l'offset de cet assignment
   */
  async getTemplateForDate(targetDate: Date): Promise<number | null> {
    const rotationGroup = await this.getRotationGroupObj();
    if (!rotationGroup) return null;

    return rotationGroup.getTemplateForDate(this.offset ?? 0, targetDate);
  }

  /**
   * Vérifie si l'assignment est récent (assigné il y a moins de X jours)
   */
  isRecentAssignment(daysThreshold: number = 7): boolean {
    if (!this.assigned_at) return false;

    const now = TimezoneConfigUtils.getCurrentTime();
    const diffTime = now.getTime() - this.assigned_at.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays <= daysThreshold;
  }

  /**
   * Calcule depuis combien de jours l'utilisateur est assigné
   */
  getDaysAssigned(): number {
    if (!this.assigned_at) return 0;

    const now = TimezoneConfigUtils.getCurrentTime();
    const diffTime = now.getTime() - this.assigned_at.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
    byUserAndGroup: boolean = false,
    byGroupsAndGroup: boolean = false,
  ): Promise<RotationAssignment | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byUserAndGroup
        ? await this.findByUserAndGroup(identifier.user, identifier.rotationGroup)
        : byGroupsAndGroup
          ? await this.findByGroupsAndGroupRotation(identifier.groups, identifier.rotationGroup)
          : await this.find(Number(identifier));

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

  async listByUser(
    userId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByUser(userId, paginationOptions);
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

  async listByGroups(
    groupsId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationAssignment[] | null> {
    const dataset = await this.listAllByGroups(groupsId, paginationOptions);
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
    const userObj = await this.getUserObj();
    const assignedByObj = await this.getAssignedByObj();
    const groupsObj = await this.getGroupsObj();
    const rotationGroupObj = await this.getRotationGroupObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.OFFSET]: this.offset,
      [RS.ASSIGNED_AT]: this.assigned_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.USER]: userObj ? userObj.getGuid() : null,
        [RS.ASSIGNED_BY]: assignedByObj ? assignedByObj.getGuid() : null,
        [RS.GROUPS]: groupsObj ? groupsObj.getGuid() : null,
        [RS.ROTATION_GROUP]: rotationGroupObj ? rotationGroupObj.getGuid() : null,
      };
    }

    return {
      ...baseData,
      [RS.USER]: userObj ? await userObj.toJSON() : null,
      [RS.ASSIGNED_BY]: assignedByObj ? await assignedByObj.toJSON() : null,
      [RS.GROUPS]: groupsObj ? await groupsObj.toJSON() : null,
      [RS.ROTATION_GROUP]: rotationGroupObj
        ? await rotationGroupObj.toJSON(responseValue.MINIMAL)
        : null,
    };
  }

  async toPUBLIC(): Promise<object> {
    const assignedByObj = await this.getAssignedByObj();
    const rotationGroupObj = await this.getRotationGroupObj();

    return {
      [RS.GUID]: this.guid,
      [RS.OFFSET]: this.offset,
      [RS.ASSIGNED_AT]: this.assigned_at,
      [RS.ASSIGNED_BY]: assignedByObj ? await assignedByObj.toJSON() : null,
      [RS.ROTATION_GROUP]: rotationGroupObj
        ? await rotationGroupObj.toJSON(responseValue.FULL)
        : null,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationAssignment {
    this.id = data.id;
    this.guid = data.guid;
    this.user = data.user;
    this.assigned_by = data.assigned_by;
    this.groups = data.groups;
    this.rotation_group = data.rotation_group;
    this.offset = data.offset;
    this.assigned_at = data.assigned_at;
    this.deleted_at = data.deleted_at;
    return this;
  }
}
