import EmployeePlanningProfileModel, {
  EmployeePlanningMode,
  FixedRestDayMode,
} from '../model/EmployeePlanningProfileModel.js';

import SessionTemplate from './SessionTemplates.js';
import User from './User.js';

export default class EmployeePlanningProfile extends EmployeePlanningProfileModel {
  private userObj?: User;
  private fixedSessionTemplateObj?: SessionTemplate;

  constructor() {
    super();
  }

  static _load(
    identifier: number | string,
    byGuid: boolean = false,
  ): Promise<EmployeePlanningProfile | null> {
    return new EmployeePlanningProfile().load(identifier, byGuid);
  }

  static _loadByUser(userId: number): Promise<EmployeePlanningProfile | null> {
    return new EmployeePlanningProfile().loadByUser(userId);
  }

  static _listActive(): Promise<EmployeePlanningProfile[] | null> {
    return new EmployeePlanningProfile().listActive();
  }

  static _listByMode(mode: EmployeePlanningMode): Promise<EmployeePlanningProfile[] | null> {
    return new EmployeePlanningProfile().listByMode(mode);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getUser(): number | undefined {
    return this.user;
  }

  getPlanningMode(): EmployeePlanningMode {
    return this.planning_mode;
  }

  getFixedSessionTemplate(): number | null | undefined {
    return this.fixed_session_template;
  }

  getFixedRestDayMode(): FixedRestDayMode {
    return this.fixed_rest_day_mode;
  }

  getRotationOrder(): number | null | undefined {
    return this.rotation_order;
  }

  getMaxWeeklyMinutes(): number | null | undefined {
    return this.max_weekly_minutes;
  }

  isActive(): boolean {
    return this.active;
  }

  isFixed(): boolean {
    return this.planning_mode === 'FIXED';
  }

  isRotating(): boolean {
    return this.planning_mode === 'ROTATING';
  }

  isExcluded(): boolean {
    return this.planning_mode === 'EXCLUDED';
  }

  setUser(value: number): this {
    this.user = value;
    this.userObj = undefined;
    return this;
  }

  setPlanningMode(value: EmployeePlanningMode): this {
    this.planning_mode = value;

    if (value !== 'FIXED') {
      this.fixed_session_template = null;
      this.fixed_rest_day_mode = 'TEMPLATE';
      this.fixedSessionTemplateObj = undefined;
    }

    return this;
  }

  setFixedSessionTemplate(value: number | null): this {
    this.fixed_session_template = value;
    this.fixedSessionTemplateObj = undefined;
    return this;
  }

  setFixedRestDayMode(value: FixedRestDayMode): this {
    this.fixed_rest_day_mode = value;
    return this;
  }

  setRotationOrder(value: number | null): this {
    this.rotation_order = value;
    return this;
  }

  setMaxWeeklyMinutes(value: number | null): this {
    this.max_weekly_minutes = value;
    return this;
  }

  setActive(value: boolean): this {
    this.active = value;
    return this;
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  async getUserObj(): Promise<User | null> {
    if (this.userObj) return this.userObj;
    if (!this.user) return null;

    const user = await User._load(this.user);
    if (user) this.userObj = user;
    return user;
  }

  async getFixedSessionTemplateObj(): Promise<SessionTemplate | null> {
    if (this.fixedSessionTemplateObj) return this.fixedSessionTemplateObj;
    if (!this.fixed_session_template) return null;

    const template = await SessionTemplate._load(this.fixed_session_template);
    if (template) this.fixedSessionTemplateObj = template;
    return template;
  }

  async save(): Promise<void> {
    if (this.isNew()) {
      await this.create();
    } else {
      await this.update();
    }
  }

  async softDelete(): Promise<boolean> {
    if (!this.id) return false;
    return await this.trash(this.id);
  }

  async toJSON(): Promise<object> {
    const user = await this.getUserObj();
    const fixedTemplate = await this.getFixedSessionTemplateObj();

    return {
      guid: this.guid,
      user: user
        ? {
            guid: user.getGuid(),
            name: user.getFullName(),
            employee_code: (user as any).getEmployeeCode?.() ?? null,
          }
        : null,
      planning_mode: this.planning_mode,
      fixed_session_template: fixedTemplate
        ? {
            guid: fixedTemplate.getGuid(),
            name: fixedTemplate.getName(),
            definition: fixedTemplate.getDefinition(),
          }
        : null,
      fixed_rest_day_mode: this.fixed_rest_day_mode,
      rotation_order: this.rotation_order ?? null,
      max_weekly_minutes: this.max_weekly_minutes ?? null,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  hydrate(data: any): EmployeePlanningProfile {
    this.id = data.id;
    this.guid = data.guid;
    this.user = data.user;
    this.planning_mode = data.planning_mode ?? 'ROTATING';
    this.fixed_session_template = data.fixed_session_template ?? null;
    this.fixed_rest_day_mode = data.fixed_rest_day_mode ?? 'TEMPLATE';
    this.rotation_order = data.rotation_order ?? null;
    this.max_weekly_minutes = data.max_weekly_minutes ?? null;
    this.active = data.active ?? true;
    this.deleted_at = data.deleted_at ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private async load(
    identifier: number | string,
    byGuid: boolean,
  ): Promise<EmployeePlanningProfile | null> {
    const data = byGuid
      ? await this.findByGuid(String(identifier))
      : await this.find(Number(identifier));

    return data ? this.hydrate(data) : null;
  }

  private async loadByUser(userId: number): Promise<EmployeePlanningProfile | null> {
    const data = await this.findByUser(userId, true);
    return data ? this.hydrate(data) : null;
  }

  private async listActive(): Promise<EmployeePlanningProfile[] | null> {
    const dataset = await this.listAllActive();
    if (!dataset?.length) return null;
    return dataset.map((data) => new EmployeePlanningProfile().hydrate(data));
  }

  private async listByMode(mode: EmployeePlanningMode): Promise<EmployeePlanningProfile[] | null> {
    const dataset = await this.listAllByMode(mode);
    if (!dataset?.length) return null;
    return dataset.map((data) => new EmployeePlanningProfile().hydrate(data));
  }
}
