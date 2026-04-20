import { CycleUnit, Direction, ROTATION_GROUP_DEFAULTS, TimezoneConfigUtils } from '@toke/shared';

import RotationGroupModel from '../model/RotationGroupsModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { TenantRevision } from '../../tools/revision.js';
import { RotationTemplateSnapshot } from '../model/RotationGroupTemplateModel.js';

import SessionTemplate from './SessionTemplates.js';
import RotationGroupTemplate from './RotationGroupTemplate.js';

export default class RotationGroup extends RotationGroupModel {
  // Cache des slots du cycle — chargé à la demande
  private cycleTemplatesObjs?: RotationGroupTemplate[];

  constructor() {
    super();
  }

  // ============================================
  // MÉTHODES STATIQUES DE CHARGEMENT
  // ============================================

  static _load(identifier: any, byGuid: boolean = false): Promise<RotationGroup | null> {
    return new RotationGroup().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().list(conditions, paginationOptions);
  }

  static _listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().listByActiveStatus(isActive, paginationOptions);
  }

  static _listByCycleUnit(
    cycleUnit: CycleUnit,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    return new RotationGroup().listByCycleUnit(cycleUnit, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {
      active: ROTATION_GROUP_DEFAULTS.ACTIVE,
    },
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const groups = await this._list(conditions, paginationOptions);
    if (groups) {
      items = await Promise.all(groups.map(async (group) => await group.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.ROTATION_GROUPS),
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
  getTenant(): string | undefined {
    return this.tenant;
  }
  getName(): string | undefined {
    return this.name;
  }
  getCycleLength(): number | undefined {
    return this.cycle_length;
  }
  getCycleUnit(): CycleUnit | undefined {
    return this.cycle_unit;
  }
  getDirection(): Direction | undefined {
    return this.direction || ROTATION_GROUP_DEFAULTS.DIRECTION;
  }
  getAutoAdvance(): boolean | undefined {
    return this.auto_advance ?? ROTATION_GROUP_DEFAULTS.AUTO_ADVANCE;
  }
  getRotationStep(): number | undefined {
    return this.rotation_step ?? ROTATION_GROUP_DEFAULTS.ROTATION_STEP;
  }
  getStartDate(): string | undefined {
    return this.start_date;
  }
  isActive(): boolean | undefined {
    return this.active;
  }
  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  /**
   * Retourne les slots du cycle (RotationGroupTemplate[]) triés par position.
   * Les snapshots JSONB sont embarqués dans chaque slot.
   * Résultat mis en cache pour la durée de vie de l'instance.
   */
  async getCycleSlots(): Promise<RotationGroupTemplate[]> {
    if (!this.id) return [];
    if (!this.cycleTemplatesObjs) {
      this.cycleTemplatesObjs = (await RotationGroupTemplate._listByRotationGroup(this.id)) ?? [];
    }
    return this.cycleTemplatesObjs;
  }

  /**
   * Retourne les snapshots bruts du cycle, triés par position.
   * Pratique pour les calculs de rotation (getTemplateForDate, etc.)
   * sans avoir besoin des métadonnées complètes du slot.
   */
  async getCycleSnapshots(): Promise<Omit<RotationTemplateSnapshot, 'id'>[]> {
    const slots = await this.getCycleSlots();
    return slots.map((slot) => slot.getTemplateSnapshot()!).filter(Boolean);
  }

  // ============================================
  // SETTERS FLUENT
  // ============================================

  setTenant(tenant: string): RotationGroup {
    this.tenant = tenant;
    return this;
  }

  setName(name: string): RotationGroup {
    this.name = name;
    return this;
  }

  setCycleLength(cycleLength: number): RotationGroup {
    this.cycle_length = cycleLength;
    return this;
  }

  setCycleUnit(cycleUnit: CycleUnit): RotationGroup {
    this.cycle_unit = cycleUnit;
    return this;
  }

  setDirection(direction: Direction): RotationGroup {
    this.direction = direction;
    return this;
  }
  setAutoAdvance(autoAdvance: boolean): RotationGroup {
    this.auto_advance = autoAdvance;
    return this;
  }
  setRotationStep(rotationStep: number): RotationGroup {
    this.rotation_step = rotationStep;
    return this;
  }

  setStartDate(startDate: string): RotationGroup {
    this.start_date = startDate;
    return this;
  }

  setActive(active: boolean): RotationGroup {
    this.active = active;
    return this;
  }

  // ============================================
  // MÉTHODES MÉTIER — GESTION DU CYCLE
  // ============================================

  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Initialise les slots du cycle à partir d'une liste de GUIDs de SessionTemplate.
   * Doit être appelé APRÈS save() (le RotationGroup doit avoir un id).
   *
   * C'est le point d'entrée principal lors de la CRÉATION d'un RotationGroup :
   * le manager fournit les GUIDs des templates dans l'ordre souhaité, et cette
   * méthode résout chaque template, prend un snapshot et crée un slot.
   *
   * @param templateGuids - GUIDs des SessionTemplates dans l'ordre du cycle
   *
   * Validation Zod alignée : cycle_templates est un array de strings (GUIDs),
   * min 1 item, max 100 items, sans doublons — conforme au schéma Zod actuel.
   */
  async initializeCycleFromGuids(templateGuids: string[]): Promise<void> {
    if (!this.id) {
      throw new Error('RotationGroup must be saved before initializing cycle templates');
    }
    if (!templateGuids || templateGuids.length === 0) {
      throw new Error('At least one template GUID is required to initialize the cycle');
    }

    const slots: RotationGroupTemplate[] = [];

    for (let position = 0; position < templateGuids.length; position++) {
      const guid = templateGuids[position]!;
      const sessionTemplate = await SessionTemplate._load(guid, true /* byGuid */);

      if (!sessionTemplate) {
        throw new Error(`SessionTemplate not found for GUID: ${guid} (position ${position})`);
      }

      const snapshot = RotationGroupTemplate.createSnapshot(sessionTemplate);

      const slot = new RotationGroupTemplate();
      slot
        .setRotationGroup(this.id)
        .setPosition(position)
        .setTemplateSnapshot(snapshot)
        .setSourceTemplate(sessionTemplate.getId() ?? null, sessionTemplate.getGuid() ?? null);

      await slot.save();
      slots.push(slot);
    }

    // Invalide le cache pour forcer un rechargement à la prochaine lecture
    this.cycleTemplatesObjs = slots;
  }

  /**
   * Remplace le snapshot d'UN slot précis dans le cycle.
   * Le manager choisit un nouveau SessionTemplate pour une position donnée.
   * Un log d'audit est créé automatiquement dans RotationGroupTemplateLog.
   *
   * @param position          - Index (0-based) du slot à remplacer
   * @param newTemplateGuid   - GUID du nouveau SessionTemplate source
   * @param modifiedBy        - ID du manager qui effectue la modification
   * @param reason            - Raison optionnelle de la modification
   */
  async replaceCycleSlot(
    position: number,
    newTemplateGuid: string,
    modifiedBy: number,
    reason?: string,
  ): Promise<void> {
    if (!this.id) {
      throw new Error('RotationGroup must be saved before replacing a cycle slot');
    }

    const slots = await this.getCycleSlots();
    const slot = slots.find((s) => s.getPosition() === position);

    if (!slot) {
      throw new Error(`No cycle slot found at position ${position}`);
    }

    const newSessionTemplate = await SessionTemplate._load(newTemplateGuid, true /* byGuid */);
    if (!newSessionTemplate) {
      throw new Error(`SessionTemplate not found for GUID: ${newTemplateGuid}`);
    }

    // replaceSnapshot() gère l'update DB + la création du log en une seule opération
    await slot.replaceSnapshot(newSessionTemplate, modifiedBy, reason);

    // Invalide le cache
    this.cycleTemplatesObjs = undefined;
  }

  /**
   * Retourne le snapshot applicable pour un offset donné.
   *
   * L'offset est la source de vérité — c'est le cron qui le maintient
   * à jour chaque jour/semaine. Cette méthode lit simplement la position
   * correspondante dans le cycle.
   *
   * Le modulo sûr ((x % n) + n) % n gère les offsets négatifs
   * (cas direction=backward qui peut produire des valeurs négatives
   * en transit si l'offset n'a pas encore été normalisé).
   *
   * @param offset - Position actuelle de l'assignation dans le cycle
   */
  async getSnapshotForDate(offset: number): Promise<Omit<RotationTemplateSnapshot, 'id'> | null> {
    const snapshots = await this.getCycleSnapshots();
    if (snapshots.length === 0) return null;

    const position = ((offset % snapshots.length) + snapshots.length) % snapshots.length;
    return snapshots[position] ?? null;
  }

  /**
   * Vérifie si la rotation est dans le futur
   */
  isInFuture(): boolean {
    if (!this.start_date) return false;
    const startDate = new Date(this.start_date);
    return startDate > TimezoneConfigUtils.getCurrentTime();
  }

  /**
   * Nombre de cycles complets écoulés depuis start_date.
   *
   * Utilise rotation_step pour un calcul cohérent avec le cron :
   * un "cycle complet" = templateCount × rotation_step unités de temps.
   *
   * Paramètre templateCount requis car cycle_length est décoratif
   * et peut être null — la borne réelle vient des slots.
   *
   * @param templateCount - Nombre de slots dans le cycle
   */
  getCyclesElapsed(templateCount: number): number {
    if (!this.start_date || templateCount < 1) return 0;

    const startDate = new Date(this.start_date);
    startDate.setHours(0, 0, 0, 0);

    const now = TimezoneConfigUtils.getCurrentTime();
    now.setHours(0, 0, 0, 0);

    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs < 0) return 0;

    const rotationStep = this.rotation_step ?? ROTATION_GROUP_DEFAULTS.ROTATION_STEP;

    // Nombre d'avancements effectués = diffUnits / rotationStep
    // Nombre de cycles complets = avancements / templateCount
    if (this.cycle_unit === CycleUnit.DAY) {
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const advances = Math.floor(diffDays / rotationStep);
      return Math.floor(advances / templateCount);
    }

    // CycleUnit.WEEK
    const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
    const advances = Math.floor(diffWeeks / rotationStep);
    return Math.floor(advances / templateCount);
  }

  /**
   * Position actuelle théorique dans le cycle (pour affichage/reporting).
   * Ne remplace PAS l'offset de l'assignation comme source de vérité.
   */
  async getCurrentCyclePosition(): Promise<number> {
    const snapshots = await this.getCycleSnapshots();
    if (snapshots.length === 0) return 0;
    return this.getCyclesElapsed(snapshots.length) % snapshots.length;
  }

  // ============================================
  // PERSISTANCE
  // ============================================

  /**
   * Sauvegarde le RotationGroup (métadonnées uniquement).
   * Les slots du cycle sont gérés séparément via initializeCycleFromGuids()
   * ou replaceCycleSlot().
   */
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

  async load(identifier: any, byGuid: boolean = false): Promise<RotationGroup | null> {
    const data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async listByActiveStatus(
    isActive: boolean,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAllByActiveStatus(isActive, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async listByCycleUnit(
    cycleUnit: CycleUnit,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<RotationGroup[] | null> {
    const dataset = await this.listAllByCycleUnit(cycleUnit, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new RotationGroup().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: RotationGroup Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  // ============================================
  // SÉRIALISATION
  // ============================================

  /**
   * Retourne la représentation JSON du RotationGroup avec les templates du cycle embarqués.
   * En FULL : chaque slot expose son snapshot complet + métadonnées.
   * En MINIMAL : chaque slot expose uniquement position + snapshot.
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const slots = await this.getCycleSlots();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.TENANT]: this.tenant,
      [RS.NAME]: this.name,
      [RS.CYCLE_LENGTH]: this.cycle_length,
      [RS.CYCLE_UNIT]: this.cycle_unit,
      [RS.DIRECTION]: this.direction,
      [RS.AUTO_ADVANCE]: this.auto_advance,
      [RS.ROTATION_STEP]: this.rotation_step,
      [RS.START_DATE]: this.start_date,
      [RS.ACTIVE]: this.active,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.CYCLE_TEMPLATES]: slots.map((slot) => ({
          [RS.POSITION]: slot.getPosition(),
          [RS.TEMPLATE_SNAPSHOT]: slot.getTemplateSnapshot(),
        })),
      };
    }

    return {
      ...baseData,
      [RS.CYCLE_TEMPLATES]: slots.map((slot) => slot.toJSON(responseValue.FULL)),
    };
  }

  // ============================================
  // MÉTHODES PRIVÉES
  // ============================================

  private hydrate(data: any): RotationGroup {
    this.id = data.id;
    this.guid = data.guid;
    this.tenant = data.tenant;
    this.name = data.name;
    this.cycle_length = data.cycle_length;
    this.cycle_unit = data.cycle_unit;
    this.direction = data.direction;
    this.auto_advance = data.auto_advance;
    this.rotation_step = data.rotation_step;
    this.start_date = data.start_date;
    this.active = data.active;
    this.deleted_at = data.deleted_at;
    // Invalide le cache des slots à chaque hydratation
    this.cycleTemplatesObjs = undefined;
    return this;
  }
}
