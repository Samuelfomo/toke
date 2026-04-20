import {
  CycleUnit,
  Direction,
  ROTATION_GROUP_VALIDATION,
} from '../../constants/tenant/rotation.groups.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export interface RotationTemplateSnapshot {
  id: number;
  guid: string;
  name: string;
  definition: any;
  version: number;
  is_default: boolean;
  snapshot_date: string; // ISO string
}

export class RotationGroupValidationUtils {
  // ============================================================
  // VALIDATEURS DE CHAMPS SCALAIRES
  // ============================================================

  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH
    );
  }

  static validateCycleLength(cycleLength: any): boolean {
    if (typeof cycleLength !== 'number') return false;
    return (
      Number.isInteger(cycleLength) &&
      cycleLength >= ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN &&
      cycleLength <= ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX
    );
  }

  static validateRotationStep(rotationStep: any): boolean {
    if (typeof rotationStep !== 'number') return false;
    return (
      Number.isInteger(rotationStep) &&
      rotationStep >= ROTATION_GROUP_VALIDATION.ROTATION_STEP.MIN &&
      rotationStep <= ROTATION_GROUP_VALIDATION.ROTATION_STEP.MAX
    );
  }

  static validateCycleUnit(cycleUnit: any): boolean {
    if (!cycleUnit || typeof cycleUnit !== 'string') return false;
    return Object.values(CycleUnit).includes(cycleUnit as CycleUnit);
  }

  static validateDirection(direction: any): boolean {
    if (!direction || typeof direction !== 'string') return false;
    return Object.values(Direction).includes(direction as Direction);
  }

  /**
   * Valide un tableau de GUIDs de SessionTemplate.
   *
   * Changement vs ancienne version :
   *   Avant  → validait un INTEGER[] (IDs internes)
   *   Maintenant → valide un STRING[] (GUIDs)
   *
   * Les règles de cardinalité (min/max items) et d'unicité sont inchangées.
   * La résolution des GUIDs vers des SessionTemplates réels est effectuée
   * plus tard, dans RotationGroup.initializeCycleFromGuids().
   */
  static validateCycleTemplates(cycleTemplates: any): boolean {
    if (!Array.isArray(cycleTemplates)) return false;

    if (
      cycleTemplates.length < ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS ||
      cycleTemplates.length > ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS
    ) {
      return false;
    }

    // Chaque entrée doit être une string non-vide
    for (const guid of cycleTemplates) {
      if (typeof guid !== 'string' || guid.trim().length === 0) {
        return false;
      }
    }

    // Pas de GUID dupliqué
    const unique = new Set(cycleTemplates.map((g) => g.trim()));
    return unique.size === cycleTemplates.length;
  }

  static validateStartDate(startDate: any): boolean {
    if (!startDate || typeof startDate !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) return false;
    const date = new Date(startDate);
    return !isNaN(date.getTime());
  }

  static validateActive(active: any): boolean {
    return typeof active === 'boolean';
  }
  static validateAutoAdvance(active: any): boolean {
    return typeof active === 'boolean';
  }

  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    return (
      guid.length >= ROTATION_GROUP_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH
    );
  }

  // ============================================================
  // NETTOYAGE / NORMALISATION
  // ============================================================

  static cleanRotationGroupData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.tenant !== undefined && cleaned.tenant !== null) {
      cleaned.tenant = cleaned.tenant.toString().trim();
    }

    if (cleaned.name !== undefined && cleaned.name !== null) {
      cleaned.name = cleaned.name.toString().trim();
    }

    if (cleaned.cycle_length !== undefined) {
      cleaned.cycle_length = parseInt(cleaned.cycle_length, 10);
      if (isNaN(cleaned.cycle_length)) {
        throw new Error('Invalid cycle_length: must be a valid integer');
      }
    }

    if (cleaned.cycle_unit !== undefined && cleaned.cycle_unit !== null) {
      cleaned.cycle_unit = cleaned.cycle_unit.toString().toLowerCase();
    }

    // Nettoyage des GUIDs : trim uniquement (pas de conversion numérique)
    if (cleaned.cycle_templates !== undefined) {
      if (!Array.isArray(cleaned.cycle_templates)) {
        throw new Error('cycle_templates must be an array');
      }
      cleaned.cycle_templates = cleaned.cycle_templates.map((guid: any) => {
        if (typeof guid !== 'string' || guid.trim().length === 0) {
          throw new Error('Each cycle_template entry must be a non-empty string (GUID)');
        }
        return guid.trim();
      });
    }

    if (cleaned.start_date !== undefined && cleaned.start_date !== null) {
      if (cleaned.start_date instanceof Date) {
        cleaned.start_date = cleaned.start_date.toISOString().split('T')[0];
      } else {
        cleaned.start_date = cleaned.start_date.toString().trim();
      }
    }

    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(cleaned.active);
    }

    return cleaned;
  }

  // ============================================================
  // CALCULS DE CYCLE
  // (inchangés — opèrent sur des snapshots déjà résolus)
  // ============================================================

  /**
   * Calcule le jour courant dans le cycle à partir de la date de début.
   */
  static calculateCurrentCycleDay(
    startDate: string,
    cycleLength: number,
    cycleUnit: CycleUnit,
    currentDate: Date = TimezoneConfigUtils.getCurrentTime(),
  ): number {
    const start = new Date(startDate);
    const diffTime = currentDate.getTime() - start.getTime();

    let diffUnits: number;
    if (cycleUnit === CycleUnit.DAY) {
      diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }

    return diffUnits % cycleLength;
  }

  /**
   * Retourne le snapshot du template à appliquer pour une date donnée.
   * Remplace l'ancienne signature qui retournait un ID entier.
   *
   * @param snapshots   - Tableau ordonné de snapshots (depuis RotationGroupTemplates)
   * @param targetDate  - Date cible
   */
  static getSnapshotForDate(
    startDate: string,
    cycleLength: number,
    cycleUnit: CycleUnit,
    snapshots: RotationTemplateSnapshot[],
    targetDate: Date = TimezoneConfigUtils.getCurrentTime(),
  ): RotationTemplateSnapshot | null {
    if (snapshots.length === 0) return null;
    const cycleDay = this.calculateCurrentCycleDay(startDate, cycleLength, cycleUnit, targetDate);
    return snapshots[cycleDay] ?? snapshots[0] ?? null;
  }

  /**
   * Vérifie que le nombre de templates fournis correspond bien à cycle_length.
   */
  static validateCycleTemplatesLength(templates: any[], cycleLength: number): boolean {
    return templates.length === cycleLength;
  }

  /**
   * Génère un aperçu du planning de rotation pour les N prochaines unités.
   * Retourne des snapshots complets au lieu des anciens IDs entiers.
   */
  static generateRotationPreview(
    startDate: string,
    cycleLength: number,
    cycleUnit: CycleUnit,
    snapshots: RotationTemplateSnapshot[],
    unitsToPreview: number = 7,
  ): Array<{ date: string; cycleDay: number; snapshot: RotationTemplateSnapshot }> {
    const preview: Array<{
      date: string;
      cycleDay: number;
      snapshot: RotationTemplateSnapshot;
    }> = [];

    const start = new Date(startDate);

    for (let i = 0; i < unitsToPreview; i++) {
      const currentDate = new Date(start);

      if (cycleUnit === CycleUnit.DAY) {
        currentDate.setDate(currentDate.getDate() + i);
      } else {
        currentDate.setDate(currentDate.getDate() + i * 7);
      }

      const cycleDay = this.calculateCurrentCycleDay(
        startDate,
        cycleLength,
        cycleUnit,
        currentDate,
      );

      const snapshot = snapshots[cycleDay] ?? snapshots[0];
      if (!snapshot) continue;

      preview.push({
        date: this.formatDate(currentDate),
        cycleDay,
        snapshot,
      });
    }

    return preview;
  }

  static getRotationCycleDates(
    startDate: string,
    cycleLength: number,
    cycleUnit: CycleUnit,
  ): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(start);

    if (cycleUnit === CycleUnit.DAY) {
      end.setDate(end.getDate() + cycleLength - 1);
    } else {
      end.setDate(end.getDate() + cycleLength * 7 - 1);
    }

    return { start, end };
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  static isDateInRotationCycle(
    startDate: string,
    cycleLength: number,
    cycleUnit: CycleUnit,
    targetDate: Date,
  ): boolean {
    const start = new Date(startDate);
    const { end } = this.getRotationCycleDates(startDate, cycleLength, cycleUnit);
    return targetDate >= start && targetDate <= end;
  }
}

// import { CycleUnit, ROTATION_GROUP_VALIDATION } from '../../constants/tenant/rotation.groups.js';
// import { TimezoneConfigUtils } from '../timezone.config.validation.js';
//
// export class RotationGroupValidationUtils {
//   // /**
//   //  * Validates tenant
//   //  */
//   // static validateTenant(tenant: any): boolean {
//   //   if (!tenant || typeof tenant !== 'string') return false;
//   //   const trimmed = tenant.trim();
//   //   return (
//   //     trimmed.length >= ROTATION_GROUP_VALIDATION.TENANT.MIN_LENGTH &&
//   //     trimmed.length <= ROTATION_GROUP_VALIDATION.TENANT.MAX_LENGTH
//   //   );
//   // }
//
//   /**
//    * Validates name
//    */
//   static validateName(name: any): boolean {
//     if (!name || typeof name !== 'string') return false;
//     const trimmed = name.trim();
//     return (
//       trimmed.length >= ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH &&
//       trimmed.length <= ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH
//     );
//   }
//
//   /**
//    * Validates cycle_length
//    */
//   static validateCycleLength(cycleLength: any): boolean {
//     if (typeof cycleLength !== 'number') return false;
//     return (
//       Number.isInteger(cycleLength) &&
//       cycleLength >= ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN &&
//       cycleLength <= ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX
//     );
//   }
//
//   /**
//    * Validates cycle_unit
//    */
//   static validateCycleUnit(cycleUnit: any): boolean {
//     if (!cycleUnit || typeof cycleUnit !== 'string') return false;
//     return Object.values(CycleUnit).includes(cycleUnit as CycleUnit);
//   }
//
//   /**
//    * Validates cycle_templates
//    */
//   static validateCycleTemplates(cycleTemplates: any): boolean {
//     if (!Array.isArray(cycleTemplates)) return false;
//
//     // Check min/max items
//     if (
//       cycleTemplates.length < ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS ||
//       cycleTemplates.length > ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS
//     ) {
//       return false;
//     }
//
//     // Check all items are positive integers
//     for (const id of cycleTemplates) {
//       if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
//         return false;
//       }
//     }
//
//     // Check for duplicates
//     const uniqueIds = new Set(cycleTemplates);
//     if (uniqueIds.size !== cycleTemplates.length) {
//       return false;
//     }
//
//     return true;
//   }
//
//   /**
//    * Validates start_date (YYYY-MM-DD format)
//    */
//   static validateStartDate(startDate: any): boolean {
//     if (!startDate || typeof startDate !== 'string') return false;
//
//     // Check format YYYY-MM-DD
//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//     if (!dateRegex.test(startDate)) return false;
//
//     // Check if valid date
//     const date = new Date(startDate);
//     return !isNaN(date.getTime());
//   }
//
//   /**
//    * Validates active status
//    */
//   static validateActive(active: any): boolean {
//     return typeof active === 'boolean';
//   }
//
//   /**
//    * Validates GUID
//    */
//   static validateGuid(guid: any): boolean {
//     if (!guid || typeof guid !== 'string') return false;
//     return (
//       guid.length >= ROTATION_GROUP_VALIDATION.GUID.MIN_LENGTH &&
//       guid.length <= ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH
//     );
//   }
//
//   /**
//    * Cleans and normalizes rotation group data
//    */
//   static cleanRotationGroupData(data: Record<string, any>): Record<string, any> {
//     const cleaned = { ...data };
//
//     // Clean string fields
//     if (cleaned.tenant !== undefined && cleaned.tenant !== null) {
//       cleaned.tenant = cleaned.tenant.toString().trim();
//     }
//
//     if (cleaned.name !== undefined && cleaned.name !== null) {
//       cleaned.name = cleaned.name.toString().trim();
//     }
//
//     // Convert cycle_length to number
//     if (cleaned.cycle_length !== undefined) {
//       cleaned.cycle_length = parseInt(cleaned.cycle_length, 10);
//       if (isNaN(cleaned.cycle_length)) {
//         throw new Error('Invalid cycle_length: must be a valid integer');
//       }
//     }
//
//     // Clean cycle_unit
//     if (cleaned.cycle_unit !== undefined && cleaned.cycle_unit !== null) {
//       cleaned.cycle_unit = cleaned.cycle_unit.toString().toLowerCase();
//     }
//
//     // Clean cycle_templates
//     if (cleaned.cycle_templates !== undefined) {
//       if (!Array.isArray(cleaned.cycle_templates)) {
//         throw new Error('cycle_templates must be an array');
//       }
//       cleaned.cycle_templates = cleaned.cycle_templates.map((id) => {
//         const numId = typeof id === 'string' ? parseInt(id, 10) : id;
//         if (isNaN(numId)) {
//           throw new Error('Invalid template ID in cycle_templates');
//         }
//         return numId;
//       });
//     }
//
//     // Clean start_date
//     if (cleaned.start_date !== undefined && cleaned.start_date !== null) {
//       // Convert to YYYY-MM-DD format if it's a Date object
//       if (cleaned.start_date instanceof Date) {
//         cleaned.start_date = cleaned.start_date.toISOString().split('T')[0];
//       } else {
//         cleaned.start_date = cleaned.start_date.toString().trim();
//       }
//     }
//
//     // Convert boolean fields
//     if (cleaned.active !== undefined) {
//       cleaned.active = Boolean(cleaned.active);
//     }
//
//     return cleaned;
//   }
//
//   /**
//    * Calculates the current cycle day based on start_date and cycle_length
//    */
//   static calculateCurrentCycleDay(
//     startDate: string,
//     cycleLength: number,
//     cycleUnit: CycleUnit,
//     currentDate: Date = TimezoneConfigUtils.getCurrentTime(),
//   ): number {
//     const start = new Date(startDate);
//     const diffTime = currentDate.getTime() - start.getTime();
//
//     let diffUnits: number;
//     if (cycleUnit === CycleUnit.DAY) {
//       diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//     } else {
//       // WEEK
//       diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
//     }
//
//     return diffUnits % cycleLength;
//   }
//
//   /**
//    * Gets the session template ID for a specific date
//    */
//   static getSessionTemplateForDate(
//     startDate: string,
//     cycleLength: number,
//     cycleUnit: CycleUnit,
//     cycleTemplates: number[],
//     targetDate: Date = TimezoneConfigUtils.getCurrentTime(),
//   ): number {
//     const cycleDay = this.calculateCurrentCycleDay(startDate, cycleLength, cycleUnit, targetDate);
//     return cycleTemplates[cycleDay] || cycleTemplates[0]!;
//   }
//
//   /**
//    * Validates that cycle_templates length matches cycle_length
//    */
//   static validateCycleTemplatesLength(cycleTemplates: number[], cycleLength: number): boolean {
//     return cycleTemplates.length === cycleLength;
//   }
//
//   /**
//    * Gets the date range covered by the rotation cycle
//    */
//   static getRotationCycleDates(
//     startDate: string,
//     cycleLength: number,
//     cycleUnit: CycleUnit,
//   ): { start: Date; end: Date } {
//     const start = new Date(startDate);
//     const end = new Date(start);
//
//     if (cycleUnit === CycleUnit.DAY) {
//       end.setDate(end.getDate() + cycleLength - 1);
//     } else {
//       // WEEK
//       end.setDate(end.getDate() + cycleLength * 7 - 1);
//     }
//
//     return { start, end };
//   }
//
//   /**
//    * Formats a date to YYYY-MM-DD
//    */
//   static formatDate(date: Date): string {
//     return date.toISOString().split('T')[0]!;
//   }
//
//   /**
//    * Checks if a date is within the rotation cycle
//    */
//   static isDateInRotationCycle(
//     startDate: string,
//     cycleLength: number,
//     cycleUnit: CycleUnit,
//     targetDate: Date,
//   ): boolean {
//     const start = new Date(startDate);
//     const { end } = this.getRotationCycleDates(startDate, cycleLength, cycleUnit);
//     return targetDate >= start && targetDate <= end;
//   }
//
//   /**
//    * Generates a preview of the rotation schedule
//    */
//   static generateRotationPreview(
//     startDate: string,
//     cycleLength: number,
//     cycleUnit: CycleUnit,
//     cycleTemplates: number[],
//     daysToPreview: number = 7,
//   ): Array<{ date: string; cycleDay: number; templateId: number }> {
//     const preview: Array<{ date: string; cycleDay: number; templateId: number }> = [];
//     const start = new Date(startDate);
//
//     for (let i = 0; i < daysToPreview; i++) {
//       const currentDate = new Date(start);
//       if (cycleUnit === CycleUnit.DAY) {
//         currentDate.setDate(currentDate.getDate() + i);
//       } else {
//         currentDate.setDate(currentDate.getDate() + i * 7);
//       }
//
//       const cycleDay = this.calculateCurrentCycleDay(
//         startDate,
//         cycleLength,
//         cycleUnit,
//         currentDate,
//       );
//       const templateId = cycleTemplates[cycleDay]!;
//
//       preview.push({
//         date: this.formatDate(currentDate),
//         cycleDay,
//         templateId,
//       });
//     }
//
//     return preview;
//   }
// }
