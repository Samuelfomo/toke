// utils/session_templates.validation.ts
import {
  DayOfWeek,
  SESSION_TEMPLATE_VALIDATION,
  VALID_DAYS,
} from '../../constants/tenant/session.templates.js';

export class SessionTemplateValidationUtils {
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates time format (HH:MM)
   */
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Converts time string to minutes
   */
  static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours! * 60 + minutes!;
  }

  /**
   * Formats minutes to HH:MM
   */
  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /** Durée nette d'un bloc (travail - pause) en minutes */
  static blockNetMinutes(block: { work: string[]; pause?: string[] | null }): number {
    let duration = this.timeToMinutes(block.work[1]!) - this.timeToMinutes(block.work[0]!);
    if (block.pause) {
      duration -= this.timeToMinutes(block.pause[1]!) - this.timeToMinutes(block.pause[0]!);
    }
    return duration;
  }

  /** Durée nette d'une journée en minutes */
  static dayNetMinutes(blocks: { work: string[]; pause?: string[] | null }[]): number {
    return blocks.reduce((sum, b) => sum + this.blockNetMinutes(b), 0);
  }

  /** Durée nette de toute la définition en minutes */
  static weekNetMinutes(definition: Record<string, any[] | null>): number {
    return Object.values(definition).reduce((sum, blocks) => {
      if (!blocks) return sum;
      return sum + this.dayNetMinutes(blocks);
    }, 0);
  }

  /**
   * Normalise une définition partielle vers 7 jours.
   * Jours absents → null (férié).
   */
  static normalizeDefinition(
    input: Partial<Record<DayOfWeek, any[] | null>>,
  ): Record<DayOfWeek, any[] | null> {
    const out: Record<string, any[] | null> = {};
    for (const day of VALID_DAYS) {
      out[day] = day in input ? (input[day] ?? null) : null;
    }
    return out as Record<DayOfWeek, any[] | null>;
  }

  /** Nettoie les données brutes avant persistance */
  static clean(data: Record<string, any>): Record<string, any> {
    const out = { ...data };
    if (out.name) out.name = String(out.name).trim();
    if (out.definition) out.definition = this.cleanDefinition(out.definition);
    return out;
  }

  /**
   * Cleans definition object
   */
  static cleanDefinition(definition: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const day of VALID_DAYS) {
      const value = definition[day];

      // Jour non envoyé → on laisse undefined (normalisé plus tard)
      if (value === undefined) continue;

      // Jour férié → on conserve null
      if (value === null) {
        cleaned[day] = null;
        continue;
      }

      // Jour repos ou travaillé
      if (Array.isArray(value)) {
        cleaned[day] = value.map((block) => this.cleanWorkBlock(block));
        // continue;
      }

      // Toute autre valeur est invalide → ignorée ou throw
      // throw new Error(`Invalid definition value for day ${day}`);
    }

    return cleaned;
  }

  // /**
  //  * 🔧 NOUVELLE FONCTION
  //  * Normalise une définition partielle vers 7 jours complets
  //  *
  //  * @param input - Définition partielle reçue de l'API
  //  * @returns Définition complète (7 jours)
  //  */
  // static normalizeDefinition(
  //   input: Partial<Record<DayOfWeek, any[] | null>>,
  // ): Record<DayOfWeek, any[] | null> {
  //   const normalized: Record<string, any[] | null> = {};
  //
  //   for (const day of VALID_DAYS) {
  //     if (day in input) {
  //       // Le jour est défini → utiliser sa valeur (peut être null, [], ou [...])
  //       normalized[day] = input[day] ?? null;
  //     } else {
  //       // ⚠️ DÉCISION MÉTIER : jour non défini = férié
  //       normalized[day] = null;
  //
  //       // Alternative si tu préfères : jour non défini = repos
  //       // normalized[day] = [];
  //     }
  //   }
  //
  //   return normalized as Record<DayOfWeek, any[] | null>;
  // }

  /**
   * Validates work block
   */
  static validateWorkBlock(block: any): boolean {
    if (typeof block !== 'object' || block === null) return false;

    // Validate work field
    if (!block.work || !Array.isArray(block.work) || block.work.length !== 2) {
      return false;
    }

    if (!this.validateTimeFormat(block.work[0]) || !this.validateTimeFormat(block.work[1])) {
      return false;
    }

    // Check work start < end
    const workStart = this.timeToMinutes(block.work[0]);
    const workEnd = this.timeToMinutes(block.work[1]);
    if (workStart >= workEnd) return false;

    // Validate pause if present
    if (block.pause !== null && block.pause !== undefined) {
      if (!Array.isArray(block.pause) || block.pause.length !== 2) {
        return false;
      }

      if (!this.validateTimeFormat(block.pause[0]) || !this.validateTimeFormat(block.pause[1])) {
        return false;
      }

      const pauseStart = this.timeToMinutes(block.pause[0]);
      const pauseEnd = this.timeToMinutes(block.pause[1]);

      // Check pause start < end
      if (pauseStart >= pauseEnd) return false;

      // Check pause within work block
      if (pauseStart < workStart || pauseEnd > workEnd) return false;
    }

    // Validate tolerance
    return !(
      typeof block.tolerance !== 'number' ||
      block.tolerance < SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN ||
      block.tolerance > SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX ||
      !Number.isInteger(block.tolerance)
    );
  }

  /**
   * Validates definition object
   */
  static validateDefinition(definition: any): boolean {
    if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
      return false;
    }

    // Check for invalid day keys
    for (const day of Object.keys(definition)) {
      if (!VALID_DAYS.includes(day as DayOfWeek)) {
        return false;
      }
    }

    // Validate each day's value
    for (const [day, value] of Object.entries(definition)) {
      // undefined → non envoyé (OK)
      if (value === undefined) continue;

      // null → jour férié (OK)
      if (value === null) continue;

      // Sinon → doit être un tableau (repos ou travail)
      if (!Array.isArray(value)) {
        return false;
      }

      const blocks = value;

      // Validate each block
      for (const block of blocks) {
        if (!this.validateWorkBlock(block)) {
          return false;
        }
      }

      // Check for overlapping blocks (seulement s'il y a des blocks)
      if (blocks.length > 1 && !this.validateNoOverlappingBlocks(blocks)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if blocks overlap on the same day
   */
  static validateNoOverlappingBlocks(blocks: any[]): boolean {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        const start1 = this.timeToMinutes(block1.work[0]);
        const end1 = this.timeToMinutes(block1.work[1]);
        const start2 = this.timeToMinutes(block2.work[0]);
        const end2 = this.timeToMinutes(block2.work[1]);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    return (
      guid.length >= SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH
    );
  }

  /**
   * Cleans and normalizes session template data
   */
  static cleanSessionTemplateData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };
    if (cleaned.name !== undefined && cleaned.name !== null) {
      cleaned.name = cleaned.name.toString().trim();
    }
    if (cleaned.definition !== undefined && cleaned.definition !== null) {
      cleaned.definition = this.cleanDefinition(cleaned.definition);
    }
    return cleaned;
  }

  /**
   * Cleans work block
   */
  static cleanWorkBlock(block: any): any {
    const cleaned: any = {
      work: block.work,
      tolerance: parseInt(block.tolerance, 10),
    };

    if (block.pause !== null && block.pause !== undefined) {
      cleaned.pause = block.pause;
    } else {
      cleaned.pause = null;
    }

    return cleaned;
  }

  /**
   * Calculates total work time for a day (in minutes)
   */
  static calculateDayWorkTime(blocks: any[]): number {
    let totalMinutes = 0;

    for (const block of blocks) {
      const workStart = this.timeToMinutes(block.work[0]);
      const workEnd = this.timeToMinutes(block.work[1]);
      let workTime = workEnd - workStart;

      // Subtract pause time if present
      if (block.pause) {
        const pauseStart = this.timeToMinutes(block.pause[0]);
        const pauseEnd = this.timeToMinutes(block.pause[1]);
        workTime -= pauseEnd - pauseStart;
      }

      totalMinutes += workTime;
    }

    return totalMinutes;
  }

  /**
   * Calculates total weekly work time (in minutes)
   */
  static calculateWeeklyWorkTime(definition: Record<string, any[]>): number {
    let totalMinutes = 0;

    for (const blocks of Object.values(definition)) {
      totalMinutes += this.calculateDayWorkTime(blocks);
    }

    return totalMinutes;
  }

  /**
   * 🔧 UTILITAIRE BONUS
   * Détecte si une définition est "semaine entière fériée"
   */
  static isFullWeekHoliday(definition: Record<DayOfWeek, any[] | null>): boolean {
    return VALID_DAYS.every((day) => definition[day] === null);
  }

  /**
   * 🔧 UTILITAIRE BONUS
   * Crée une semaine entière de jours fériés
   */
  static createFullWeekHoliday(): Record<DayOfWeek, null> {
    const definition: Record<string, null> = {};
    for (const day of VALID_DAYS) {
      definition[day] = null;
    }
    return definition as Record<DayOfWeek, null>;
  }
}
