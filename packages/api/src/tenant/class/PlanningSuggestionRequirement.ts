import PlanningSuggestionRequirementModel, {
  PlanningAllocationMode,
  PlanningDayKey,
  PlanningServiceType,
} from '../model/PlanningSuggestionRequirementModel.js';

import PlanningSuggestionConfig from './PlanningSuggestionConfig.js';
import SessionTemplate from './SessionTemplates.js';

export default class PlanningSuggestionRequirement extends PlanningSuggestionRequirementModel {
  private configObj?: PlanningSuggestionConfig;
  private sessionTemplateObj?: SessionTemplate;
  private continuationTemplateObj?: SessionTemplate;

  constructor() {
    super();
  }

  static _load(
    identifier: number | string,
    byGuid: boolean = false,
  ): Promise<PlanningSuggestionRequirement | null> {
    return new PlanningSuggestionRequirement().load(identifier, byGuid);
  }

  static _listByConfig(
    configId: number,
    activeOnly: boolean = false,
  ): Promise<PlanningSuggestionRequirement[] | null> {
    return new PlanningSuggestionRequirement().listByConfig(configId, activeOnly);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getConfig(): number | undefined {
    return this.config;
  }

  getSessionTemplate(): number | undefined {
    return this.session_template;
  }

  getContinuationTemplate(): number | null | undefined {
    return this.continuation_template;
  }

  getContinuationDayOffset(): number {
    return this.continuation_day_offset;
  }

  getDayOfWeek(): PlanningDayKey | undefined {
    return this.day_of_week;
  }

  getServiceType(): PlanningServiceType {
    return this.service_type;
  }

  getAllocationMode(): PlanningAllocationMode {
    return this.allocation_mode;
  }

  getMinEmployees(): number {
    return this.min_employees;
  }

  getTargetEmployees(): number {
    return this.target_employees;
  }

  getMaxEmployees(): number | null | undefined {
    return this.max_employees;
  }

  getPriority(): number {
    return this.priority;
  }

  isActive(): boolean {
    return this.active;
  }

  isGuard(): boolean {
    return this.service_type === 'GUARD';
  }

  isFillRemaining(): boolean {
    return this.allocation_mode === 'FILL_REMAINING';
  }

  setConfig(value: number): this {
    this.config = value;
    this.configObj = undefined;
    return this;
  }

  setSessionTemplate(value: number): this {
    this.session_template = value;
    this.sessionTemplateObj = undefined;
    return this;
  }

  setContinuationTemplate(value: number | null): this {
    this.continuation_template = value;
    this.continuationTemplateObj = undefined;
    return this;
  }

  setContinuationDayOffset(value: number): this {
    this.continuation_day_offset = value;
    return this;
  }

  setDayOfWeek(value: PlanningDayKey): this {
    this.day_of_week = value;
    return this;
  }

  setServiceType(value: PlanningServiceType): this {
    this.service_type = value;

    if (value === 'STANDARD') {
      this.continuation_template = null;
      this.continuation_day_offset = 0;
      this.continuationTemplateObj = undefined;
    }

    return this;
  }

  setAllocationMode(value: PlanningAllocationMode): this {
    this.allocation_mode = value;
    return this;
  }

  setMinEmployees(value: number): this {
    this.min_employees = value;
    return this;
  }

  setTargetEmployees(value: number): this {
    this.target_employees = value;
    return this;
  }

  setMaxEmployees(value: number | null): this {
    this.max_employees = value;
    return this;
  }

  setPriority(value: number): this {
    this.priority = value;
    return this;
  }

  setActive(value: boolean): this {
    this.active = value;
    return this;
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  async getConfigObj(): Promise<PlanningSuggestionConfig | null> {
    if (this.configObj) return this.configObj;
    if (!this.config) return null;

    const config = await PlanningSuggestionConfig._load(this.config);

    if (config) {
      this.configObj = config;
    }

    return config;
  }

  async getSessionTemplateObj(): Promise<SessionTemplate | null> {
    if (this.sessionTemplateObj) {
      return this.sessionTemplateObj;
    }

    if (!this.session_template) {
      return null;
    }

    const template = await SessionTemplate._load(this.session_template);

    if (template) {
      this.sessionTemplateObj = template;
    }

    return template;
  }

  async getContinuationTemplateObj(): Promise<SessionTemplate | null> {
    if (this.continuationTemplateObj) {
      return this.continuationTemplateObj;
    }

    if (!this.continuation_template) {
      return null;
    }

    const template = await SessionTemplate._load(this.continuation_template);

    if (template) {
      this.continuationTemplateObj = template;
    }

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
    const config = await this.getConfigObj();
    const template = await this.getSessionTemplateObj();
    const continuationTemplate = await this.getContinuationTemplateObj();

    return {
      guid: this.guid,

      config: config
        ? {
            guid: config.getGuid(),
            name: config.getName(),
            version: config.getVersion(),
          }
        : null,

      session_template: template
        ? {
            guid: template.getGuid(),
            name: template.getName(),
            definition: template.getDefinition(),
          }
        : null,

      continuation_template: continuationTemplate
        ? {
            guid: continuationTemplate.getGuid(),
            name: continuationTemplate.getName(),
            definition: continuationTemplate.getDefinition(),
          }
        : null,

      continuation_day_offset: this.continuation_day_offset,

      day_of_week: this.day_of_week,
      service_type: this.service_type,
      allocation_mode: this.allocation_mode,
      min_employees: this.min_employees,
      target_employees: this.target_employees,
      max_employees: this.max_employees ?? null,
      priority: this.priority,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  hydrate(data: any): PlanningSuggestionRequirement {
    this.id = data.id;
    this.guid = data.guid;
    this.config = data.config;
    this.session_template = data.session_template;
    this.continuation_template = data.continuation_template ?? null;
    this.continuation_day_offset = data.continuation_day_offset ?? 0;
    this.day_of_week = data.day_of_week;
    this.service_type = data.service_type ?? 'STANDARD';
    this.allocation_mode = data.allocation_mode ?? 'RANGE';
    this.min_employees = data.min_employees ?? 0;
    this.target_employees = data.target_employees ?? 0;
    this.max_employees = data.max_employees ?? null;
    this.priority = data.priority ?? 100;
    this.active = data.active ?? true;
    this.deleted_at = data.deleted_at ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    return this;
  }

  private async load(
    identifier: number | string,
    byGuid: boolean,
  ): Promise<PlanningSuggestionRequirement | null> {
    const data = byGuid
      ? await this.findByGuid(String(identifier))
      : await this.find(Number(identifier));

    return data ? this.hydrate(data) : null;
  }

  private async listByConfig(
    configId: number,
    activeOnly: boolean,
  ): Promise<PlanningSuggestionRequirement[] | null> {
    const dataset = await this.listAllByConfig(configId, activeOnly);

    if (!dataset?.length) {
      return null;
    }

    return dataset.map((data) => new PlanningSuggestionRequirement().hydrate(data));
  }
}
