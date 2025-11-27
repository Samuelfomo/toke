// src/api/class/FraudAlerts.ts

import FraudAlertsModel from '../model/FraudAlertsModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import User from './User.js';
import TimeEntries from './TimeEntries.js';

export default class FraudAlerts extends FraudAlertsModel {
  private userObj?: User;
  private timeEntryObj?: TimeEntries;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES ===

  static _load(identifier: any, byGuid: boolean = false): Promise<FraudAlerts | null> {
    return new FraudAlerts().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudAlerts[] | null> {
    return new FraudAlerts().list(conditions, paginationOptions);
  }

  static _listByUser(user: number): Promise<FraudAlerts[] | null> {
    return new FraudAlerts().listByUser(user);
  }

  static _listByTimeEntry(time_entry: number): Promise<FraudAlerts[] | null> {
    return new FraudAlerts().listByTimeEntry(time_entry);
  }

  static _listPending(): Promise<FraudAlerts[] | null> {
    return new FraudAlerts().listPending();
  }

  static _listCritical(hours: number = 24): Promise<FraudAlerts[] | null> {
    return new FraudAlerts().listCritical(hours);
  }

  static async getStatistics(start_date?: Date, end_date?: Date): Promise<any> {
    const model = new FraudAlerts();
    return await model.getAlertStatistics(start_date, end_date);
  }

  static async detectSuspiciousUsers(min_alerts: number = 5, days: number = 30): Promise<any[]> {
    const model = new FraudAlerts();
    return await model.findSuspiciousUsers(min_alerts, days);
  }

  static async analyzeUserPatterns(user: number, days: number = 30): Promise<any> {
    const model = new FraudAlerts();
    const patterns = await model.findRepeatingPatterns(user, days);
    const alertCount = await model.countAlertsByUser(user, undefined, undefined);

    return {
      user_id: user,
      analysis_period_days: days,
      total_alerts: alertCount,
      repeating_patterns: patterns,
      risk_level: alertCount > 10 ? 'high' : alertCount > 5 ? 'medium' : 'low',
    };
  }

  // === GETTERS ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getUser(): number | undefined {
    return this.user;
  }

  async getUserObj(): Promise<User | null> {
    if (!this.user) return null;
    if (!this.userObj) {
      this.userObj = (await User._load(this.user)) || undefined;
    }
    return this.userObj || null;
  }

  getTimeEntry(): number | undefined {
    return this.time_entry;
  }

  async getTimeEntryObj(): Promise<TimeEntries | null> {
    if (!this.time_entry) return null;
    if (!this.timeEntryObj) {
      this.timeEntryObj = (await TimeEntries._load(this.time_entry)) || undefined;
    }
    return this.timeEntryObj || null;
  }

  getAlertType(): string | undefined {
    return this.alert_type;
  }

  getAlertSeverity(): string | undefined {
    return this.alert_severity;
  }

  getAlertDescription(): string | undefined {
    return this.alert_description;
  }

  getAlertData(): any | undefined {
    return this.alert_data;
  }

  isInvestigated(): boolean {
    return this.investigated === true;
  }

  isFalsePositive(): boolean {
    return this.false_positive === true;
  }

  getInvestigationNotes(): string | undefined {
    return this.investigation_notes;
  }

  getInvestigatedAt(): Date | undefined {
    return this.investigated_at;
  }

  // === SETTERS ===

  setUser(user: number): FraudAlerts {
    this.user = user;
    return this;
  }

  setTimeEntry(time_entry: number): FraudAlerts {
    this.time_entry = time_entry;
    return this;
  }

  setAlertType(type: string): FraudAlerts {
    this.alert_type = type;
    return this;
  }

  setAlertSeverity(severity: string): FraudAlerts {
    this.alert_severity = severity;
    return this;
  }

  setAlertDescription(description: string): FraudAlerts {
    this.alert_description = description;
    return this;
  }

  setAlertData(data: any): FraudAlerts {
    this.alert_data = data;
    return this;
  }

  // === MÉTHODES MÉTIER ===

  async investigate(investigator_id: number, notes: string): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot investigate unsaved alert');
    }

    const success = await this.markAsInvestigated(this.id, investigator_id, notes);
    if (!success) {
      throw new Error('Failed to mark alert as investigated');
    }

    this.investigated = true;
    this.investigation_notes = notes;
    this.investigated_at = new Date();
  }

  async markFalsePositive(investigator_id: number, reason: string): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot mark unsaved alert as false positive');
    }

    const success = await this.markAsFalsePositive(this.id, investigator_id, reason);
    if (!success) {
      throw new Error('Failed to mark alert as false positive');
    }

    this.false_positive = true;
    this.investigated = true;
    this.investigation_notes = `False positive: ${reason}`;
    this.investigated_at = new Date();
  }

  isCritical(): boolean {
    return this.alert_severity === 'critical';
  }

  isHigh(): boolean {
    return this.alert_severity === 'high';
  }

  isPending(): boolean {
    return !this.investigated && !this.false_positive;
  }

  getDaysSinceCreation(): number {
    if (!this.created_at) return 0;
    const now = new Date();
    const diffTime = now.getTime() - this.created_at.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(threshold_days: number = 3): boolean {
    return this.isPending() && this.getDaysSinceCreation() > threshold_days;
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

  async load(identifier: any, byGuid: boolean = false): Promise<FraudAlerts | null> {
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
  ): Promise<FraudAlerts[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new FraudAlerts().hydrate(data));
  }

  async listByUser(user: number): Promise<FraudAlerts[] | null> {
    const dataset = await this.listAllByUser(user);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new FraudAlerts().hydrate(data));
  }

  async listByTimeEntry(time_entry: number): Promise<FraudAlerts[] | null> {
    const dataset = await this.listAllByTimeEntry(time_entry);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new FraudAlerts().hydrate(data));
  }

  async listPending(): Promise<FraudAlerts[] | null> {
    const dataset = await this.listAllPending();
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new FraudAlerts().hydrate(data));
  }

  async listCritical(hours: number = 24): Promise<FraudAlerts[] | null> {
    const dataset = await this.findCriticalAlerts(hours);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new FraudAlerts().hydrate(data));
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: FraudAlert Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const user = await this.getUserObj();
    const timeEntry = await this.getTimeEntryObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.ALERT_TYPE]: this.alert_type,
      [RS.ALERT_SEVERITY]: this.alert_severity,
      [RS.ALERT_DESCRIPTION]: this.alert_description,
      [RS.INVESTIGATED]: this.investigated,
      [RS.FALSE_POSITIVE]: this.false_positive,
      [RS.CREATED_AT]: this.created_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.USER]: user?.getGuid(),
        [RS.TIME_ENTRY]: timeEntry?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.USER]: user ? user.toJSON() : null,
      [RS.TIME_ENTRY]: timeEntry ? await timeEntry.toJSON(responseValue.MINIMAL) : null,
      [RS.ALERT_DATA]: this.alert_data,
      [RS.INVESTIGATION_NOTES]: this.investigation_notes,
      [RS.INVESTIGATED_AT]: this.investigated_at,
      // Méta
      is_critical: this.isCritical(),
      is_pending: this.isPending(),
      is_overdue: this.isOverdue(),
      days_since_creation: this.getDaysSinceCreation(),
    };
  }

  private hydrate(data: any): FraudAlerts {
    this.id = data.id;
    this.guid = data.guid;
    this.user = data.user;
    this.time_entry = data.time_entry;
    this.alert_type = data.alert_type;
    this.alert_severity = data.alert_severity;
    this.alert_description = data.alert_description;
    this.alert_data = data.alert_data;
    this.investigated = data.investigated;
    this.investigation_notes = data.investigation_notes;
    this.false_positive = data.false_positive;
    this.investigated_at = data.investigated_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
