import { VALID_DAYS } from '@toke/shared';

import SessionTemplate from '../tenant/class/SessionTemplates.js';
import RotationAssignment from '../tenant/class/RotationAssignments.js';
import RotationGroup from '../tenant/class/RotationGroups.js';
import ScheduleException from '../tenant/class/ScheduleExceptions.js';
import User from '../tenant/class/User.js';

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
    const dayOfWeek = this.getDayOfWeek(targetDate);

    try {
      // 1️⃣ ÉTAPE 1 : Chercher exception active
      resolutionPath.push('Checking schedule_exceptions');
      const exceptionSchedule = await this.resolveFromException(userId, dateStr);

      if (exceptionSchedule) {
        resolutionPath.push(`✅ Exception found: ${exceptionSchedule.template_name}`);
        return {
          success: true,
          applicable_schedule: exceptionSchedule,
          resolution_path: resolutionPath,
        };
      }
      resolutionPath.push('❌ No active exception');

      // 2️⃣ ÉTAPE 2 : Chercher rotation assignment
      resolutionPath.push('Checking rotation_assignments');
      const rotationSchedule = await this.resolveFromRotation(userId, targetDate);

      if (rotationSchedule) {
        resolutionPath.push(`✅ Rotation found: ${rotationSchedule.template_name}`);
        return {
          success: true,
          applicable_schedule: rotationSchedule,
          resolution_path: resolutionPath,
        };
      }
      resolutionPath.push('❌ No rotation assignment');

      // 3️⃣ ÉTAPE 3 : Chercher template direct (assignation individuelle)
      // TODO: Implémenter table user_schedule_assignments
      resolutionPath.push('Checking direct template assignment');
      const directSchedule = await this.resolveFromDefaultTemplate(userId, dateStr);
      if (directSchedule) {
        resolutionPath.push(`✅ User default template found: ${directSchedule.template_name}`);
        return {
          success: true,
          applicable_schedule: directSchedule,
          resolution_path: resolutionPath,
        };
      }
      resolutionPath.push('❌ No direct template (not implemented yet)');

      // 4️⃣ ÉTAPE 4 : Fallback sur défaut entreprise
      resolutionPath.push('⚠️ Falling back to default company schedule');
      const defaultSchedule = await this.resolveFromDefault(userId, dayOfWeek);

      if (defaultSchedule) {
        resolutionPath.push(`✅ Default schedule applied`);
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
   * Résolution depuis schedule_exceptions
   */
  private async resolveFromException(
    userId: number,
    dateStr: string,
    groupId?: number,
  ): Promise<ApplicableSchedule | null> {
    // Chercher exception utilisateur
    const userException = await ScheduleException._listForUserOnDate(userId, dateStr);

    if (userException && userException.length > 0) {
      const exception = userException[0];
      return await this.buildScheduleFromTemplate(
        exception.getSessionTemplate()!,
        dateStr,
        'exception',
        {
          exception_guid: exception.getGuid(),
          reason: exception.getReason(),
          start_date: exception.getStartDate(),
          end_date: exception.getEndDate(),
        },
      );
    }

    // TODO: Chercher exception groupe si pas d'exception utilisateur
    // const groupException = await ScheduleException._listForGroupOnDate(groupId, dateStr);

    return null;
  }

  // Checking direct template assignment
  private async resolveFromDefaultTemplate(
    userId: number,
    dateStr: string,
  ): Promise<ApplicableSchedule | null> {
    const userObj = await User._load(userId);
    const userSchedule = await userObj?.getSessionTemplateObj();
    if (userSchedule) {
      return await this.buildScheduleFromTemplate(userSchedule.getId()!, dateStr, 'default', {
        session_guid: userSchedule.getGuid(),
        name: userSchedule.getName(),
        start_date: userSchedule.getValidFrom(),
        end_date: userSchedule.getValidTo(),
        definition: userSchedule.getDefinition(),
      });
    }

    return null;
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
      return await this.buildScheduleFromTemplate(
        defaultSessionTemplate.getId()!,
        dayOfWeek,
        'default',
        {
          session_guid: defaultSessionTemplate.getGuid(),
          name: defaultSessionTemplate.getName(),
          start_date: defaultSessionTemplate.getValidFrom(),
          end_date: defaultSessionTemplate.getValidTo(),
          definition: defaultSessionTemplate.getDefinition(),
          user: userId,
        },
      );
    }
    return null;
  }

  /**
   * Résolution depuis rotation_assignments + rotation_groups
   */
  private async resolveFromRotation(
    userId: number,
    targetDate: Date,
  ): Promise<ApplicableSchedule | null> {
    // Récupérer l'assignation rotation de l'utilisateur
    const assignments = await RotationAssignment._listByUser(userId);

    if (!assignments || assignments.length === 0) {
      return null;
    }

    // Prendre la première assignation active
    const assignment = assignments[0];
    const rotationGroupId = assignment.getRotationGroup()!;
    const offset = assignment.getOffset()!;

    // Charger le groupe de rotation
    const rotationGroup = await RotationGroup._load(rotationGroupId);

    if (!rotationGroup || !rotationGroup.isActive()) {
      return null;
    }

    // Calculer l'index du template à utiliser
    const templateId = this.calculateRotationTemplateId(rotationGroup, targetDate, offset);

    if (!templateId) {
      return null;
    }

    return await this.buildScheduleFromTemplate(
      templateId,
      this.formatDate(targetDate),
      'rotation',
      {
        rotation_group_guid: rotationGroup.getGuid(),
        rotation_group_name: rotationGroup.getName(),
        cycle_length: rotationGroup.getCycleLength(),
        cycle_unit: rotationGroup.getCycleUnit(),
        offset: offset,
      },
    );
  }

  /**
   * Calcul de l'index du template dans une rotation
   * Implémente la logique: cycle_index = floor(diff(target_date, start_date, unit)) % cycle_length
   */
  private calculateRotationTemplateId(
    rotationGroup: RotationGroup,
    targetDate: Date,
    offset: number,
  ): number | null {
    const startDate = new Date(rotationGroup.getStartDate()!);
    const cycleLength = rotationGroup.getCycleLength()!;
    const cycleUnit = rotationGroup.getCycleUnit()!;
    const cycleTemplates = rotationGroup.getCycleTemplates()!;

    // Calculer différence en unités (jours ou semaines)
    let diff: number;
    if (cycleUnit === 'day') {
      diff = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (cycleUnit === 'week') {
      diff = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    } else {
      return null;
    }

    // Calculer position dans le cycle
    const cycleIndex = Math.floor(diff) % cycleLength;

    // Appliquer l'offset utilisateur
    const actualIndex = (cycleIndex + offset) % cycleLength;

    // Récupérer le template_id correspondant
    return cycleTemplates[actualIndex] || null;
  }

  /**
   * Construction d'un ApplicableSchedule depuis un template_id
   */
  private async buildScheduleFromTemplate(
    templateId: number,
    dateStr: string,
    source: 'exception' | 'rotation' | 'direct' | 'default',
    sourceDetails: any,
  ): Promise<ApplicableSchedule | null> {
    const template = await SessionTemplate._load(templateId);

    if (!template) {
      return null;
    }

    const definition = template.getDefinition();
    const targetDate = new Date(dateStr);
    const dayOfWeek = this.getDayOfWeek(targetDate);

    // Récupérer les blocs de travail pour ce jour
    const dayBlocks = definition[dayOfWeek] || [];
    const isWorkDay = dayBlocks.length > 0;

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

  private getDayOfWeek(date: Date): string {
    // const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return VALID_DAYS[date.getDay()];
  }
}

// Export singleton
export default new ScheduleResolutionService();
