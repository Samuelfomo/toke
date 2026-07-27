import { RAFamily, ROTATION_GROUP_DEFAULTS, SAFamily } from '@toke/shared';

import SessionTemplate from '../tenant/class/SessionTemplates.js';
import RotationGroup from '../tenant/class/RotationGroups.js';
import User from '../tenant/class/User.js';
import Groups from '../tenant/class/Groups.js';
import RotationAssignment from '../tenant/class/RotationAssignments.js';
import ScheduleAssignments from '../tenant/class/ScheduleAssignments.js';

// === TYPES ===

export interface WorkBlock {
  work: [string, string]; // ["08:00", "12:00"]
  pause: [string, string] | null; // ["12:00", "14:00"] ou null
  tolerance: number; // minutes
}

export interface DaySchedule {
  [key: string]: WorkBlock[]; // "Mon": [...], "Tue": [...]
}

export interface ApplicableSchedule {
  template_id: number;
  template_name: string;
  template_guid: string;
  source: 'exception' | 'rotation' | 'direct' | 'default';
  source_details: any;
  schedule_date: string;
  is_work_day: boolean;
  expected_blocks: WorkBlock[];
  day_definition: DaySchedule;
  tolerance_minutes: number;
}

export interface ScheduleResolutionResult {
  success: boolean;
  applicable_schedule: ApplicableSchedule | null;
  resolution_path: string[];
  error?: string;
}

// === SERVICE ===

class ScheduleResolutionService {
  /**
   * Point d'entrée principal - Résout l'horaire applicable pour un utilisateur à une date donnée
   * Ordre de priorité: exception → rotation → template direct → défaut entreprise
   */
  async getApplicableSchedule(userId: number, targetDate: Date): Promise<ScheduleResolutionResult> {
    const resolutionPath: string[] = [];
    const dateStr = this.formatDate(targetDate);

    try {
      // 1️⃣ Récupérer l'utilisateur et son groupe actif
      const userObj = await User._load(userId);
      if (!userObj) {
        throw new Error('User not found');
      }

      const activeGroup = await Groups._load(userId, false, true);

      // 2️⃣ Récupérer toutes les assignations applicables
      // à la date demandée.
      const candidates: Array<{
        type: 'schedule' | 'rotation';
        assignedAt: Date;
        source: 'user' | 'group';
        priority: number;
        data: any;
      }> = [];

      const userGuid = userObj.getGuid();
      if (!userGuid) {
        throw new Error('User GUID is missing');
      }

      // ─────────────────────────────────────────────
      // 1. PLANNINGS INDIVIDUELS
      // Priorité maximale : 400
      // ─────────────────────────────────────────────

      resolutionPath.push(`Checking user schedule assignments applicable on ${dateStr}`);

      const userSchedules = await ScheduleAssignments._listForRelatedOnDate(
        SAFamily.USER,
        userGuid,
        dateStr,
      );

      for (const schedule of userSchedules ?? []) {
        candidates.push({
          type: 'schedule',
          assignedAt: schedule.getCreatedAt() ?? new Date(0),
          source: 'user',
          priority: 400,
          data: schedule,
        });

        resolutionPath.push(`✅ User schedule found: ${schedule.getGuid()}`);
      }

      // ─────────────────────────────────────────────
      // 2. ROTATIONS INDIVIDUELLES
      // Priorité : 300
      // ─────────────────────────────────────────────

      resolutionPath.push('Checking user rotation assignments');

      const userRotations = await RotationAssignment._listByRelated(RAFamily.USER, userGuid);

      for (const rotation of userRotations ?? []) {
        candidates.push({
          type: 'rotation',
          assignedAt: rotation.getCreatedAt() ?? new Date(0),
          source: 'user',
          priority: 300,
          data: rotation,
        });

        resolutionPath.push(`✅ User rotation found: ${rotation.getGuid()}`);
      }

      // ─────────────────────────────────────────────
      // 3. ASSIGNATIONS DU GROUPE ACTIF
      // ─────────────────────────────────────────────

      if (activeGroup) {
        const groupGuid = activeGroup.getGuid();

        if (!groupGuid) {
          throw new Error('Active group GUID is missing');
        }

        // Planning de groupe : priorité 200
        resolutionPath.push(`Checking group schedule assignments applicable on ${dateStr}`);

        const groupSchedules = await ScheduleAssignments._listForRelatedOnDate(
          SAFamily.GROUP,
          groupGuid,
          dateStr,
        );

        for (const schedule of groupSchedules ?? []) {
          candidates.push({
            type: 'schedule',
            assignedAt: schedule.getCreatedAt() ?? new Date(0),
            source: 'group',
            priority: 200,
            data: schedule,
          });

          resolutionPath.push(`✅ Group schedule found: ${schedule.getGuid()}`);
        }

        // Rotation de groupe : priorité 100
        resolutionPath.push('Checking group rotation assignments');

        const groupRotations = await RotationAssignment._listByRelated(RAFamily.GROUP, groupGuid);

        for (const rotation of groupRotations ?? []) {
          candidates.push({
            type: 'rotation',
            assignedAt: rotation.getCreatedAt() ?? new Date(0),
            source: 'group',
            priority: 100,
            data: rotation,
          });

          resolutionPath.push(`✅ Group rotation found: ${rotation.getGuid()}`);
        }
      }

      // 3️⃣ Priorité métier, puis assignation la plus récente
      candidates.sort(
        (a, b) => b.priority - a.priority || b.assignedAt.getTime() - a.assignedAt.getTime(),
      );

      // 4️⃣ Appliquer le plus récent
      if (candidates.length > 0) {
        const winner = candidates[0];
        resolutionPath.push(
          `🏆 Winner: ${winner.type} from ${winner.source} ` +
            `(priority: ${winner.priority}, assigned: ${winner.assignedAt.toISOString()})`,
        );

        if (winner.type === 'schedule') {
          return await this.buildFromScheduleAssignment(winner.data, dateStr, resolutionPath);
        } else {
          return await this.buildFromRotationAssignment(
            winner.data,
            targetDate,
            dateStr,
            resolutionPath,
          );
        }
      }

      // 5️⃣ Fallback: Template par défaut du tenant
      resolutionPath.push('⚠️ No assignments found, using tenant default');
      const defaultSchedule = await this.resolveFromDefault(userId, this.getDayOfWeek(targetDate));

      if (defaultSchedule) {
        resolutionPath.push(`✅ Default template applied`);
        return {
          success: true,
          applicable_schedule: defaultSchedule,
          resolution_path: resolutionPath,
        };
      }

      // ❌ Aucun horaire trouvé
      resolutionPath.push('❌ No schedule found - no work expected');
      return {
        success: true,
        applicable_schedule: this.createNoWorkSchedule(dateStr),
        resolution_path: resolutionPath,
      };
    } catch (error: any) {
      return {
        success: false,
        applicable_schedule: null,
        resolution_path: resolutionPath,
        error: error.message,
      };
    }
  }

  /**
   * Parser une heure "HH:MM" en minutes depuis minuit
   */
  public parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculer différence en minutes entre deux heures
   */
  public calculateMinutesDiff(time1: string, time2: string): number {
    return this.parseTimeToMinutes(time2) - this.parseTimeToMinutes(time1);
  }

  /**
   * Fallback sur horaire par défaut de l'entreprise
   */
  private async resolveFromDefault(
    userId: number,
    dayOfWeek: string,
  ): Promise<ApplicableSchedule | null> {
    // TODO: Implémenter récupération du template par défaut de l'entreprise

    const defaultSessionTemplate = await SessionTemplate._load({}, false, true);
    if (defaultSessionTemplate) {
      return await this.buildScheduleFromTemplate(defaultSessionTemplate, dayOfWeek, 'default', {
        session_guid: defaultSessionTemplate.getGuid(),
        name: defaultSessionTemplate.getName(),
        // start_date: defaultSessionTemplate.getValidFrom(),
        // end_date: defaultSessionTemplate.getValidTo(),
        definition: defaultSessionTemplate.getDefinition(),
        user: userId,
      });
    }
    return null;
  }

  /**
   * Construit un schedule depuis un ScheduleAssignment
   */
  private async buildFromScheduleAssignment(
    assignment: ScheduleAssignments,
    dateStr: string,
    resolutionPath: string[],
  ): Promise<ScheduleResolutionResult> {
    const template = SessionTemplate.toObject(assignment.getSessionTemplate());

    if (!template) {
      resolutionPath.push('❌ Template not found');
      return {
        success: false,
        applicable_schedule: null,
        resolution_path: resolutionPath,
        error: 'Template not found',
      };
    }

    const applicableSchedule = await this.buildScheduleFromTemplate(template, dateStr, 'direct', {
      assignment_guid: assignment.getGuid(),
      template_name: template.getName(),
      assigned_at: assignment.getCreatedAt(),
      start_date: assignment.getStartDate(),
      end_date: assignment.getEndDate(),
    });

    return {
      success: true,
      applicable_schedule: applicableSchedule,
      resolution_path: resolutionPath,
    };
  }

  /**
   * Construit un schedule depuis un RotationAssignment
   */
  private async buildFromRotationAssignment(
    assignment: RotationAssignment,
    targetDate: Date,
    dateStr: string,
    resolutionPath: string[],
  ): Promise<ScheduleResolutionResult> {
    const rotationGroup = await assignment.getRotationGroupObj();

    if (!rotationGroup) {
      resolutionPath.push('❌ Rotation group not found');
      return {
        success: false,
        applicable_schedule: null,
        resolution_path: resolutionPath,
        error: 'Rotation group not found',
      };
    }

    const offset = assignment.getOffset() || 0;
    const templateId = await this.calculateRotationTemplateId(rotationGroup, targetDate, offset);
    const template = await SessionTemplate._load(templateId);

    if (!templateId) {
      resolutionPath.push('❌ Could not calculate rotation template');
      return {
        success: false,
        applicable_schedule: null,
        resolution_path: resolutionPath,
        error: 'Rotation calculation failed',
      };
    }

    if (!template) {
      resolutionPath.push('❌ template not found');
      return {
        success: false,
        applicable_schedule: null,
        resolution_path: resolutionPath,
        error: 'template assign to rotation not found',
      };
    }

    const applicableSchedule = await this.buildScheduleFromTemplate(template, dateStr, 'rotation', {
      rotation_group_guid: rotationGroup.getGuid(),
      rotation_group_name: rotationGroup.getName(),
      assigned_at: assignment.getCreatedAt(),
      cycle_length: rotationGroup.getCycleLength(),
      cycle_unit: rotationGroup.getCycleUnit(),
      auto_advance: rotationGroup.getAutoAdvance(),
      direction: rotationGroup.getDirection(),
      rotation_step: rotationGroup.getRotationStep(),
      offset: offset,
    });

    return {
      success: true,
      applicable_schedule: applicableSchedule,
      resolution_path: resolutionPath,
    };
  }

  /**
   * Calcul de l'index du template dans une rotation
   * Implémente la logique: cycle_index = floor(diff(target_date, start_date, unit)) % cycle_length
   */
  private async calculateRotationTemplateId(
    rotationGroup: RotationGroup,
    targetDate: Date,
    offset: number,
  ): Promise<number | null> {
    const startDateStr = new Date(rotationGroup.getStartDate()!);
    const rotationStep = rotationGroup.getRotationStep() ?? ROTATION_GROUP_DEFAULTS.ROTATION_STEP;
    const cycleUnit = rotationGroup.getCycleUnit()!;

    if (!startDateStr || !cycleUnit) return null;

    const startDate = new Date(startDateStr);

    const slots = await rotationGroup.getCycleSlots();

    // const cycleTemplates = slots.find((s) => s.getId());
    const templateIds = slots.map((slot) => slot.getId()).filter((id): id is number => Boolean(id));

    const templateCount = templateIds.length;
    if (templateCount === 0) return null;

    // ───────────────────────────────────────────
    // 1. Calcul du temps écoulé
    // ───────────────────────────────────────────
    const diffMs = targetDate.getTime() - startDate.getTime();

    let diffUnits: number;

    if (cycleUnit === 'day') {
      diffUnits = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } else if (cycleUnit === 'week') {
      diffUnits = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    } else {
      return null;
    }

    if (diffUnits < 0) return null;

    // ───────────────────────────────────────────
    // 2. Nombre de rotations effectuées
    // ───────────────────────────────────────────
    const rotationsPassed = Math.floor(diffUnits / rotationStep);

    // ───────────────────────────────────────────
    // 3. Position réelle dans le cycle
    // ───────────────────────────────────────────
    const index = (rotationsPassed + offset) % templateCount;

    return templateIds[index] ?? null;
  }

  /**
   * Construction d'un ApplicableSchedule depuis un template_id
   */
  private async buildScheduleFromTemplate(
    template: SessionTemplate,
    dateStr: string,
    source: 'exception' | 'rotation' | 'direct' | 'default',
    sourceDetails: any,
  ): Promise<ApplicableSchedule | null> {
    if (!template) {
      return null;
    }

    const definition = template.getDefinition();
    const targetDate = new Date(dateStr);
    const dayOfWeek = this.getDayOfWeek(targetDate);

    // // 🔍 DEBUG - AJOUTEZ CES LOGS
    // console.log('🔍 DEBUG buildScheduleFromTemplate:');
    // console.log('   Date:', dateStr);
    // console.log('   Target date:', targetDate.toISOString());
    // console.log('   Day of week (calculated):', dayOfWeek);
    // console.log('   Template definition keys:', Object.keys(definition));
    // console.log('   Definition[dayOfWeek]:', definition[dayOfWeek]);
    // console.log('   Template definition:', JSON.stringify(definition, null, 2));

    // Récupérer les blocs de travail pour ce jour
    const dayBlocks = definition[dayOfWeek] || [];
    const isWorkDay = dayBlocks.length > 0;

    console.log('   Day blocks:', dayBlocks);
    console.log('   Is work day:', isWorkDay);

    return {
      template_id: template.getId()!,
      template_name: template.getName()!,
      template_guid: template.getGuid()!,
      source: source,
      source_details: sourceDetails,
      schedule_date: dateStr,
      is_work_day: isWorkDay,
      expected_blocks: dayBlocks,
      day_definition: definition,
      tolerance_minutes: dayBlocks[0]?.tolerance || 0,
    };
  }

  /**
   * Créer un schedule "pas de travail attendu"
   */
  private createNoWorkSchedule(dateStr: string): ApplicableSchedule {
    return {
      template_id: 0,
      template_name: 'No Schedule',
      template_guid: 'no-schedule',
      source: 'default',
      source_details: { reason: 'no_schedule_found' },
      schedule_date: dateStr,
      is_work_day: false,
      expected_blocks: [],
      day_definition: {},
      tolerance_minutes: 0,
    };
  }

  /**
   * Utilitaires de date
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // private getDayOfWeek(date: Date): string {
  //   // const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  //   return VALID_DAYS[date.getDay()];
  // }
  private getDayOfWeek(date: Date): string {
    // ✅ HARDCODED pour éviter toute ambiguïté
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIndex = date.getDay(); // 0-6
    return days[dayIndex];
  }
}

// Export singleton
export default new ScheduleResolutionService();
