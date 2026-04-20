import { TimezoneConfigUtils } from '@toke/shared';

import RotationGroupTemplateModel, {
  RotationTemplateSnapshot,
} from '../model/RotationGroupTemplateModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import RotationGroupTemplateLog from './RotationGroupTemplateLog.js';
import SessionTemplate from './SessionTemplates.js';

export default class RotationGroupTemplate extends RotationGroupTemplateModel {
  // Version interne du snapshot — incrémentée à chaque updateSnapshot
  private snapshotVersion: number = 1;

  constructor() {
    super();
  }

  // ============================================
  // FACTORY — snapshot à partir d'un SessionTemplate
  // ============================================

  /**
   * Construit un snapshot prêt à être persisté à partir d'un SessionTemplate chargé.
   * Suit la même forme que ScheduleAssignments.createTemplateSnapshot() pour
   * assurer la cohérence des JSONB à travers le projet.
   */
  static createSnapshot(sessionTemplate: SessionTemplate): RotationTemplateSnapshot {
    return {
      id: sessionTemplate.getId()!,
      guid: sessionTemplate.getGuid()!,
      name: sessionTemplate.getName()!,
      definition: sessionTemplate.getDefinition(),
      version: sessionTemplate.getVersion()!,
      is_default: sessionTemplate.isDefaultSessionTemplate(),
      snapshot_date: new Date().toISOString(),
    };
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<RotationGroupTemplate | null> {
    return new RotationGroupTemplate().load(identifier, byGuid);
  }

  static _listByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplate[] | null> {
    return new RotationGroupTemplate().listByRotationGroup(rotationGroupId, paginationOptions);
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
  getRotationGroup(): number | undefined {
    return this.rotation_group;
  }
  getPosition(): number | undefined {
    return this.position;
  }
  // getTemplateSnapshot(): Omit<RotationTemplateSnapshot, 'id'> | undefined {
  //   return this.template_snapshot;
  // }

  getTemplateSnapshot(): Omit<RotationTemplateSnapshot, 'id'> | undefined {
    if (!this.template_snapshot) return undefined;

    const { id, ...rest } = this.template_snapshot;
    return rest;
  }
  getSourceTemplateId(): number | null | undefined {
    return this.source_template;
  }
  getSourceTemplateGuid(): string | null | undefined {
    return this.source_template_guid;
  }
  getSnapshotVersion(): number {
    return this.snapshotVersion;
  }
  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }
  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setRotationGroup(rotationGroupId: number): RotationGroupTemplate {
    this.rotation_group = rotationGroupId;
    return this;
  }

  setPosition(position: number): RotationGroupTemplate {
    this.position = position;
    return this;
  }

  setTemplateSnapshot(snapshot: RotationTemplateSnapshot): RotationGroupTemplate {
    this.template_snapshot = snapshot;
    return this;
  }

  setSourceTemplate(id: number | null, guid: string | null): RotationGroupTemplate {
    this.source_template = id;
    this.source_template_guid = guid;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Remplace le snapshot de ce slot par celui d'un nouveau SessionTemplate,
   * incrémente la version interne et crée le log d'audit.
   *
   * @param newSessionTemplate - SessionTemplate chargé (source du nouveau snapshot)
   * @param modifiedBy         - ID du manager qui effectue la modification
   * @param reason             - Raison optionnelle
   */
  async replaceSnapshot(
    newSessionTemplate: SessionTemplate,
    modifiedBy: number,
    reason?: string,
  ): Promise<void> {
    if (this.isNew()) {
      throw new Error('Cannot replace snapshot on an unsaved RotationGroupTemplate');
    }

    const previousSnapshot = this.template_snapshot ?? null;
    const previousVersion = this.snapshotVersion;
    const newVersion = previousVersion + 1;
    const newSnapshot = RotationGroupTemplate.createSnapshot(newSessionTemplate);

    // Persiste le nouveau snapshot en DB
    await this.updateSnapshot(newSnapshot);
    this.snapshotVersion = newVersion;

    // Calcule le diff entre les deux snapshots pour auditabilité
    const changedFields = previousSnapshot
      ? this.computeChangedFields(previousSnapshot, newSnapshot)
      : null;

    // Crée le log immuable
    await this.logSnapshotChange({
      previousSnapshot,
      newSnapshot,
      previousVersion: previousVersion === 1 && !previousSnapshot ? null : previousVersion,
      newVersion,
      modifiedBy,
      modificationReason: reason,
      changedFields,
    });

    // Met à jour la référence source
    this.source_template = newSessionTemplate.getId() ?? null;
    this.source_template_guid = newSessionTemplate.getGuid() ?? null;
  }

  async save(): Promise<void> {
    if (this.isNew()) {
      await this.create();
    }
    // Les mises à jour passent par replaceSnapshot() — pas de save() générique
    // pour les updates, afin de garantir que chaque changement soit toujours loggé.
  }

  async delete(): Promise<boolean> {
    if (this.id === undefined) return false;
    return await this.trash(this.id);
  }

  // ============================================
  // CHARGEMENT ET LISTING
  // ============================================

  async load(identifier: any, byGuid: boolean = false): Promise<RotationGroupTemplate | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async listByRotationGroup(
    rotationGroupId: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroupTemplate[] | null> {
    const dataset = await this.listAllByRotationGroup(rotationGroupId, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroupTemplate().hydrate(data));
  }

  // ============================================
  // SÉRIALISATION
  // ============================================

  toJSON(view: ViewMode = responseValue.FULL): object {
    if (view === responseValue.MINIMAL) {
      return {
        [RS.GUID]: this.guid,
        [RS.POSITION]: this.position,
        [RS.TEMPLATE_SNAPSHOT]: this.getTemplateSnapshot(), // this.template_snapshot,
      };
    }

    return {
      [RS.GUID]: this.guid,
      // [RS.ROTATION_GROUP]: this.rotation_group,
      [RS.POSITION]: this.position,
      [RS.TEMPLATE_SNAPSHOT]: this.getTemplateSnapshot(), // this.template_snapshot,
      // [RS.SOURCE_TEMPLATE]: this.source_template,
      [RS.SOURCE_TEMPLATE_GUID]: this.source_template_guid,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  /**
   * Calcule un diff lisible entre deux snapshots.
   * Aligné sur la même logique que ScheduleAssignments.computeChangedFields().
   */
  private computeChangedFields(old: RotationTemplateSnapshot, next: RotationTemplateSnapshot): any {
    const changes: any = {};

    if (old.name !== next.name) {
      changes.name = { old: old.name, new: next.name };
    }
    if (old.version !== next.version) {
      changes.source_version = { old: old.version, new: next.version };
    }
    if (JSON.stringify(old.definition) !== JSON.stringify(next.definition)) {
      changes.definition_changed = true;

      const oldDays = Object.keys(old.definition || {});
      const newDays = Object.keys(next.definition || {});
      const allDays = new Set([...oldDays, ...newDays]);

      const modifiedDays = [...allDays].filter(
        (day) =>
          JSON.stringify((old.definition || {})[day]) !==
          JSON.stringify((next.definition || {})[day]),
      );

      if (modifiedDays.length > 0) {
        changes.modified_days = modifiedDays;
      }
    }

    return changes;
  }

  private async logSnapshotChange(params: {
    previousSnapshot: RotationTemplateSnapshot | null;
    newSnapshot: RotationTemplateSnapshot;
    previousVersion: number | null;
    newVersion: number;
    modifiedBy: number;
    modificationReason?: string;
    changedFields?: any;
  }): Promise<void> {
    const log = new RotationGroupTemplateLog();
    log
      .setRotationGroupTemplate(this.id!)
      .setPosition(this.position!)
      .setPreviousSnapshot(params.previousSnapshot)
      .setNewSnapshot(params.newSnapshot)
      .setPreviousVersion(params.previousVersion)
      .setNewVersion(params.newVersion)
      .setModifiedBy(params.modifiedBy)
      .setModificationReason(params.modificationReason ?? null)
      .setChangedFields(params.changedFields ?? null)
      .setExecutedAt(TimezoneConfigUtils.getCurrentTime());

    await log.save();
  }

  private hydrate(data: any): RotationGroupTemplate {
    this.id = data.id;
    this.guid = data.guid;
    // this.rotation_group = data.rotation_group;
    this.position = data.position;
    this.template_snapshot = data.template_snapshot;
    // this.source_template = data.source_template;
    this.source_template_guid = data.source_template_guid;
    this.deleted_at = data.deleted_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    // La version du snapshot est reconstruite à partir du log ou initialisée à 1
    this.snapshotVersion = data.snapshot_version ?? 1;
    return this;
  }
}
