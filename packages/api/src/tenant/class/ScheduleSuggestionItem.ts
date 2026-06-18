import ScheduleSuggestionItemModel from '../model/ScheduleSuggestionItemModel.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import User from './User.js';

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleSuggestionItem — classe métier
// ─────────────────────────────────────────────────────────────────────────────

export default class ScheduleSuggestionItem extends ScheduleSuggestionItemModel {
  private userObj?: User;

  constructor() {
    super();
  }

  // ── Factory statiques ─────────────────────────────────────────────────────

  static _load(guid: string): Promise<ScheduleSuggestionItem | null> {
    return new ScheduleSuggestionItem().load(guid);
  }

  static _listBySuggestion(suggestionId: number): Promise<ScheduleSuggestionItem[] | null> {
    return new ScheduleSuggestionItem().listBySuggestion(suggestionId);
  }

  static _findBySuggestionAndUser(
    suggestionId: number,
    userId: number,
  ): Promise<ScheduleSuggestionItem | null> {
    return new ScheduleSuggestionItem().findByIds(suggestionId, userId);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  getId(): number | undefined {
    return this.id;
  }
  getGuid(): string | undefined {
    return this.guid;
  }
  getSuggestion(): number | undefined {
    return this.suggestion;
  }
  getUser(): number | undefined {
    return this.user;
  }
  getSchedule(): Record<string, string | null> | undefined {
    return this.schedule;
  }
  getReasons(): Record<string, any> | null | undefined {
    return this.reasons;
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  setSuggestion(v: number): this {
    this.suggestion = v;
    return this;
  }
  setUser(v: number): this {
    this.user = v;
    return this;
  }
  setSchedule(v: Record<string, string | null>): this {
    this.schedule = v;
    return this;
  }
  setReasons(v: Record<string, any> | null): this {
    this.reasons = v;
    return this;
  }

  // ── Chargement de l'objet user ────────────────────────────────────────────

  async getUserObj(): Promise<User | null> {
    if (this.userObj) return this.userObj;
    if (!this.user) return null;
    const u = await User._load(this.user);
    if (u) this.userObj = u;
    return u;
  }

  // ── Cycle de vie ─────────────────────────────────────────────────────────

  async save(): Promise<void> {
    await this.create();
  }

  async patchScheduleDay(
    iso: string,
    templateGuid: string | null,
    reason?: Record<string, any> | null,
  ): Promise<void> {
    if (!this.schedule) throw new Error('No schedule loaded on item');

    const newSchedule = { ...this.schedule, [iso]: templateGuid };
    const newReasons = this.reasons
      ? { ...this.reasons, [iso]: reason ?? null }
      : { [iso]: reason ?? null };

    await this.updateSchedule(newSchedule, newReasons);
  }

  async softDelete(): Promise<boolean> {
    if (!this.id) return false;
    return await this.trash(this.id);
  }

  // ── Méthodes de chargement interne ───────────────────────────────────────

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const userObj = await this.getUserObj();

    return {
      [RS.GUID]: this.guid,
      [RS.USER]: userObj
        ? {
            [RS.GUID]: userObj.getGuid(),
            [RS.NAME]: userObj.getFullName(),
            [RS.EMPLOYEE_CODE]: (userObj as any).getEmployeeCode?.() ?? null,
          }
        : { [RS.GUID]: null, [RS.NAME]: '—' },
      [RS.SCHEDULE]: this.schedule ?? {},
      [RS.REASONS]: this.reasons ?? {},
    };
  }

  hydrate(data: any): ScheduleSuggestionItem {
    this.id = data.id;
    this.guid = data.guid;
    this.suggestion = data.suggestion;
    this.user = data.user;
    this.schedule = data.schedule ?? {};
    this.reasons = data.reasons ?? null;
    this.deleted_at = data.deleted_at ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private async load(guid: string): Promise<ScheduleSuggestionItem | null> {
    const data = await this.findByGuid(guid);
    if (!data) return null;
    return this.hydrate(data);
  }

  // ── toJSON ────────────────────────────────────────────────────────────────

  private async listBySuggestion(suggestionId: number): Promise<ScheduleSuggestionItem[] | null> {
    const dataset = await this.listAllBySuggestion(suggestionId);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((d) => new ScheduleSuggestionItem().hydrate(d));
  }

  // ── Hydratation ───────────────────────────────────────────────────────────

  private async findByIds(
    suggestionId: number,
    userId: number,
  ): Promise<ScheduleSuggestionItem | null> {
    const data = await this.findBySuggestionAndUser(suggestionId, userId);
    if (!data) return null;
    return this.hydrate(data);
  }
}
