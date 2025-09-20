// utils/org.hierarchy.validation.ts
import {
  ORG_HIERARCHY_DEFAULTS,
  ORG_HIERARCHY_VALIDATION,
  RelationshipType,
} from '../../constants/tenant/org.hierarchy.js';

export class OrgHierarchyValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < ORG_HIERARCHY_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > ORG_HIERARCHY_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates subordinate ID
   */
  static validateSubordinateId(subordinateId: number): boolean {
    if (typeof subordinateId !== 'number' || !Number.isInteger(subordinateId)) return false;
    return (
      subordinateId >= ORG_HIERARCHY_VALIDATION.SUBORDINATE.MIN &&
      subordinateId <= ORG_HIERARCHY_VALIDATION.SUBORDINATE.MAX
    );
  }

  /**
   * Validates supervisor ID
   */
  static validateSupervisorId(supervisorId: number): boolean {
    if (typeof supervisorId !== 'number' || !Number.isInteger(supervisorId)) return false;
    return (
      supervisorId >= ORG_HIERARCHY_VALIDATION.SUPERVISOR.MIN &&
      supervisorId <= ORG_HIERARCHY_VALIDATION.SUPERVISOR.MAX
    );
  }

  /**
   * Validates that subordinate and supervisor are not the same
   */
  static validateNotSelfSupervision(subordinateId: number, supervisorId: number): boolean {
    return subordinateId !== supervisorId;
  }

  /**
   * Validates relationship type
   */
  static validateRelationshipType(relationshipType: string): boolean {
    if (!relationshipType || typeof relationshipType !== 'string') return false;
    const trimmed = relationshipType.trim();

    return (
      trimmed.length >= ORG_HIERARCHY_VALIDATION.RELATIONSHIP_TYPE.MIN_LENGTH &&
      trimmed.length <= ORG_HIERARCHY_VALIDATION.RELATIONSHIP_TYPE.MAX_LENGTH &&
      Object.values(RelationshipType).includes(trimmed as RelationshipType)
    );
  }

  /**
   * Validates effective from date
   */
  static validateEffectiveFrom(effectiveFrom: Date | string): boolean {
    if (!effectiveFrom) return false;
    const date = new Date(effectiveFrom);
    if (isNaN(date.getTime())) return false;

    // Effective from cannot be in the future (allowing same day)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date <= today;
  }

  /**
   * Validates effective to date
   */
  static validateEffectiveTo(effectiveTo: Date | string | null): boolean {
    if (effectiveTo === null || effectiveTo === undefined) return true;
    const date = new Date(effectiveTo);
    return !isNaN(date.getTime());
  }

  /**
   * Validates effective date logic (to > from)
   */
  static validateEffectiveDateLogic(
    effectiveFrom: Date | string,
    effectiveTo: Date | string | null,
  ): boolean {
    if (!effectiveTo) return true;

    const fromDate = new Date(effectiveFrom);
    const toDate = new Date(effectiveTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false;

    return toDate > fromDate;
  }

  /**
   * Validates department
   */
  static validateDepartment(department: string | null): boolean {
    if (department === null || department === undefined) return true;
    if (typeof department !== 'string') return false;

    const trimmed = department.trim();
    return (
      trimmed.length >= ORG_HIERARCHY_VALIDATION.DEPARTMENT.MIN_LENGTH &&
      trimmed.length <= ORG_HIERARCHY_VALIDATION.DEPARTMENT.MAX_LENGTH
    );
  }

  /**
   * Validates cost center
   */
  static validateCostCenter(costCenter: string | null): boolean {
    if (costCenter === null || costCenter === undefined) return true;
    if (typeof costCenter !== 'string') return false;

    const trimmed = costCenter.trim();
    return (
      trimmed.length >= ORG_HIERARCHY_VALIDATION.COST_CENTER.MIN_LENGTH &&
      trimmed.length <= ORG_HIERARCHY_VALIDATION.COST_CENTER.MAX_LENGTH
    );
  }

  /**
   * Validates delegation level
   */
  static validateDelegationLevel(delegationLevel: number): boolean {
    if (typeof delegationLevel !== 'number' || !Number.isInteger(delegationLevel)) return false;
    return (
      delegationLevel >= ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MIN &&
      delegationLevel <= ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MAX
    );
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= ORG_HIERARCHY_DEFAULTS.PAGINATION?.MAX_LIMIT
    );
  }

  /**
   * Checks for overlapping relationships
   */
  static hasOverlappingRelationship(
    existingRelationships: any[],
    subordinateId: number,
    supervisorId: number,
    effectiveFrom: Date | string,
    effectiveTo: Date | string | null,
    excludeId?: string,
  ): boolean {
    const newFrom = new Date(effectiveFrom);
    const newTo = effectiveTo ? new Date(effectiveTo) : null;

    return existingRelationships.some((rel) => {
      // Skip the record being updated
      if (excludeId && rel.guid === excludeId) return false;

      // Only check relationships for the same subordinate-supervisor pair
      if (rel.subordinate_id !== subordinateId || rel.supervisor_id !== supervisorId) return false;

      const existingFrom = new Date(rel.effective_from);
      const existingTo = rel.effective_to ? new Date(rel.effective_to) : null;

      // Check for overlap
      if (!newTo && !existingTo) {
        // Both are open-ended
        return true;
      } else if (!newTo) {
        // New is open-ended, existing has end date
        return newFrom <= existingTo!;
      } else if (!existingTo) {
        // Existing is open-ended, new has end date
        return existingFrom <= newTo;
      } else {
        // Both have end dates
        return newFrom <= existingTo && existingFrom <= newTo;
      }
    });
  }

  /**
   * Detects circular hierarchy
   */
  static hasCircularHierarchy(
    hierarchyData: any[],
    subordinateId: number,
    supervisorId: number,
    maxDepth: number = 10,
  ): boolean {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const checkCircular = (currentId: number, targetId: number, depth: number): boolean => {
      if (depth > maxDepth) return true; // Assume circular if too deep
      if (currentId === targetId) return true;
      if (visited.has(currentId)) return false;
      if (recursionStack.has(currentId)) return true;

      visited.add(currentId);
      recursionStack.add(currentId);

      // Find all supervisors of the current user
      const supervisors = hierarchyData
        .filter((rel) => rel.subordinate_id === currentId && this.isEffective(rel))
        .map((rel) => rel.supervisor_id);

      for (const supId of supervisors) {
        if (checkCircular(supId, targetId, depth + 1)) {
          return true;
        }
      }

      recursionStack.delete(currentId);
      return false;
    };

    // Check if making supervisorId a subordinate of subordinateId creates a cycle
    return checkCircular(supervisorId, subordinateId, 0);
  }

  /**
   * Checks if a relationship is currently effective
   */
  static isEffective(relationship: any, checkDate?: Date): boolean {
    const date = checkDate || new Date();
    const effectiveFrom = new Date(relationship.effective_from);
    const effectiveTo = relationship.effective_to ? new Date(relationship.effective_to) : null;

    return date >= effectiveFrom && (!effectiveTo || date <= effectiveTo);
  }

  /**
   * Calculates hierarchy depth
   */
  static calculateHierarchyDepth(
    hierarchyData: any[],
    userId: number,
    maxDepth: number = 20,
  ): number {
    const visited = new Set<number>();

    const calculateDepth = (currentId: number, depth: number): number => {
      if (depth > maxDepth || visited.has(currentId)) return depth;
      visited.add(currentId);

      const subordinates = hierarchyData
        .filter((rel) => rel.supervisor_id === currentId && this.isEffective(rel))
        .map((rel) => rel.subordinate_id);

      if (subordinates.length === 0) return depth;

      return Math.max(...subordinates.map((subId) => calculateDepth(subId, depth + 1)));
    };

    return calculateDepth(userId, 0);
  }

  /**
   * Cleans and normalizes hierarchy data
   */
  static cleanHierarchyData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    if (cleaned.subordinate_id !== undefined && cleaned.subordinate_id !== null) {
      cleaned.subordinate_id = Number(cleaned.subordinate_id);
    }

    if (cleaned.supervisor_id !== undefined && cleaned.supervisor_id !== null) {
      cleaned.supervisor_id = Number(cleaned.supervisor_id);
    }

    if (cleaned.delegation_level !== undefined && cleaned.delegation_level !== null) {
      cleaned.delegation_level = Number(cleaned.delegation_level);
    }

    // Clean string fields
    ['relationship_type', 'department', 'cost_center'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert dates
    ['effective_from', 'effective_to'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    return cleaned;
  }

  /**
   * Validates that a hierarchy relationship is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'subordinate_id',
      'supervisor_id',
      'relationship_type',
      'effective_from',
      'delegation_level',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateSubordinateId(data.subordinate_id) &&
      this.validateSupervisorId(data.supervisor_id) &&
      this.validateNotSelfSupervision(data.subordinate_id, data.supervisor_id) &&
      this.validateRelationshipType(data.relationship_type) &&
      this.validateEffectiveFrom(data.effective_from) &&
      this.validateEffectiveTo(data.effective_to) &&
      this.validateEffectiveDateLogic(data.effective_from, data.effective_to) &&
      this.validateDepartment(data.department) &&
      this.validateCostCenter(data.cost_center) &&
      this.validateDelegationLevel(data.delegation_level) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a hierarchy relationship is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, validate only fields that are present
    const validations = [
      data.subordinate_id === undefined || this.validateSubordinateId(data.subordinate_id),
      data.supervisor_id === undefined || this.validateSupervisorId(data.supervisor_id),
      data.relationship_type === undefined || this.validateRelationshipType(data.relationship_type),
      data.effective_from === undefined || this.validateEffectiveFrom(data.effective_from),
      data.effective_to === undefined || this.validateEffectiveTo(data.effective_to),
      data.department === undefined || this.validateDepartment(data.department),
      data.cost_center === undefined || this.validateCostCenter(data.cost_center),
      data.delegation_level === undefined || this.validateDelegationLevel(data.delegation_level),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    // Additional validation for self-supervision and date logic
    if (data.subordinate_id !== undefined && data.supervisor_id !== undefined) {
      validations.push(this.validateNotSelfSupervision(data.subordinate_id, data.supervisor_id));
    }

    if (data.effective_from !== undefined || data.effective_to !== undefined) {
      const from = data.effective_from || new Date(); // Use current date if not provided
      const to = data.effective_to;
      validations.push(this.validateEffectiveDateLogic(from, to));
    }

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a hierarchy relationship
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (
      data.subordinate_id === undefined ||
      data.subordinate_id === null ||
      !this.validateSubordinateId(data.subordinate_id)
    ) {
      errors.push(
        `Invalid subordinate_id: must be between ${ORG_HIERARCHY_VALIDATION.SUBORDINATE.MIN} and ${ORG_HIERARCHY_VALIDATION.SUBORDINATE.MAX}`,
      );
    }

    if (
      data.supervisor_id === undefined ||
      data.supervisor_id === null ||
      !this.validateSupervisorId(data.supervisor_id)
    ) {
      errors.push(
        `Invalid supervisor_id: must be between ${ORG_HIERARCHY_VALIDATION.SUPERVISOR.MIN} and ${ORG_HIERARCHY_VALIDATION.SUPERVISOR.MAX}`,
      );
    }

    if (
      data.subordinate_id &&
      data.supervisor_id &&
      !this.validateNotSelfSupervision(data.subordinate_id, data.supervisor_id)
    ) {
      errors.push('Self-supervision is not allowed');
    }

    if (
      data.relationship_type === undefined ||
      data.relationship_type === null ||
      !this.validateRelationshipType(data.relationship_type)
    ) {
      errors.push(
        `Invalid relationship_type: must be 1-${ORG_HIERARCHY_VALIDATION.RELATIONSHIP_TYPE.MAX_LENGTH} characters and a valid type`,
      );
    }

    if (
      data.effective_from === undefined ||
      data.effective_from === null ||
      !this.validateEffectiveFrom(data.effective_from)
    ) {
      errors.push('Invalid effective_from: must be a valid date not in the future');
    }

    if (data.effective_to !== undefined && !this.validateEffectiveTo(data.effective_to)) {
      errors.push('Invalid effective_to: must be a valid date');
    }

    if (
      data.effective_from &&
      data.effective_to &&
      !this.validateEffectiveDateLogic(data.effective_from, data.effective_to)
    ) {
      errors.push('Invalid date range: effective_to must be after effective_from');
    }

    if (data.department !== undefined && !this.validateDepartment(data.department)) {
      errors.push(
        `Invalid department: must be 1-${ORG_HIERARCHY_VALIDATION.DEPARTMENT.MAX_LENGTH} characters`,
      );
    }

    if (data.cost_center !== undefined && !this.validateCostCenter(data.cost_center)) {
      errors.push(
        `Invalid cost_center: must be 1-${ORG_HIERARCHY_VALIDATION.COST_CENTER.MAX_LENGTH} characters`,
      );
    }

    if (
      data.delegation_level === undefined ||
      data.delegation_level === null ||
      !this.validateDelegationLevel(data.delegation_level)
    ) {
      errors.push(
        `Invalid delegation_level: must be between ${ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MIN} and ${ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MAX}`,
      );
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${ORG_HIERARCHY_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.subordinate_id && this.validateSubordinateId(data.subordinate_id)) ||
      (data.supervisor_id && this.validateSupervisorId(data.supervisor_id)) ||
      (data.relationship_type && this.validateRelationshipType(data.relationship_type)) ||
      (data.department && this.validateDepartment(data.department)) ||
      (data.cost_center && this.validateCostCenter(data.cost_center)) ||
      (data.delegation_level && this.validateDelegationLevel(data.delegation_level)) ||
      (data.effective_from && !isNaN(new Date(data.effective_from).getTime())) ||
      (data.effective_to && !isNaN(new Date(data.effective_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Gets all subordinates for a supervisor
   */
  static getSubordinates(
    hierarchyData: any[],
    supervisorId: number,
    includeInactive: boolean = false,
  ): any[] {
    return hierarchyData.filter(
      (rel) => rel.supervisor_id === supervisorId && (includeInactive || this.isEffective(rel)),
    );
  }

  /**
   * Gets all supervisors for a subordinate
   */
  static getSupervisors(
    hierarchyData: any[],
    subordinateId: number,
    includeInactive: boolean = false,
  ): any[] {
    return hierarchyData.filter(
      (rel) => rel.subordinate_id === subordinateId && (includeInactive || this.isEffective(rel)),
    );
  }

  /**
   * Gets the hierarchy chain (all levels up)
   */
  static getHierarchyChain(hierarchyData: any[], userId: number, maxLevels: number = 10): any[] {
    const chain: any[] = [];
    let currentId = userId;
    let level = 0;

    while (level < maxLevels) {
      const supervisor = hierarchyData.find(
        (rel) => rel.subordinate_id === currentId && this.isEffective(rel),
      );

      if (!supervisor) break;

      chain.push(supervisor);
      currentId = supervisor.supervisor_id;
      level++;

      // Prevent infinite loops
      if (chain.some((item) => item.supervisor_id === currentId && item !== supervisor)) {
        break;
      }
    }

    return chain;
  }

  /**
   * Gets organization tree starting from a user
   */
  static getOrganizationTree(hierarchyData: any[], rootUserId: number, maxDepth: number = 10): any {
    const buildTree = (userId: number, depth: number): any => {
      if (depth >= maxDepth) return { user_id: userId, subordinates: [] };

      const subordinates = this.getSubordinates(hierarchyData, userId).map((rel) => ({
        ...rel,
        subordinates: buildTree(rel.subordinate_id, depth + 1).subordinates,
      }));

      return {
        user_id: userId,
        subordinates,
      };
    };

    return buildTree(rootUserId, 0);
  }

  /**
   * Calculates span of control (number of direct reports)
   */
  static calculateSpanOfControl(hierarchyData: any[], supervisorId: number): number {
    return this.getSubordinates(hierarchyData, supervisorId).length;
  }

  /**
   * Gets relationship summary for a user
   */
  static getUserRelationshipSummary(
    hierarchyData: any[],
    userId: number,
  ): {
    asSubordinate: number;
    asSupervisor: number;
    relationshipTypes: string[];
    departments: string[];
  } {
    const asSubordinate = hierarchyData.filter(
      (rel) => rel.subordinate_id === userId && this.isEffective(rel),
    );
    const asSupervisor = hierarchyData.filter(
      (rel) => rel.supervisor_id === userId && this.isEffective(rel),
    );

    const allRelationships = [...asSubordinate, ...asSupervisor];
    const relationshipTypes = [...new Set(allRelationships.map((rel) => rel.relationship_type))];
    const departments = [...new Set(allRelationships.map((rel) => rel.department).filter(Boolean))];

    return {
      asSubordinate: asSubordinate.length,
      asSupervisor: asSupervisor.length,
      relationshipTypes,
      departments,
    };
  }

  /**
   * Validates business rules for hierarchy creation
   */
  static validateBusinessRules(
    data: any,
    existingHierarchy: any[],
    maxHierarchyDepth: number = 10,
    maxSpanOfControl: number = 50,
  ): string[] {
    const errors: string[] = [];

    // Check for overlapping relationships
    if (
      this.hasOverlappingRelationship(
        existingHierarchy,
        data.subordinate_id,
        data.supervisor_id,
        data.effective_from,
        data.effective_to,
      )
    ) {
      errors.push('Overlapping relationship exists for the same period');
    }

    // Check for circular hierarchy
    if (this.hasCircularHierarchy(existingHierarchy, data.subordinate_id, data.supervisor_id)) {
      errors.push('Circular hierarchy relationship detected');
    }

    // Check hierarchy depth
    const depth = this.calculateHierarchyDepth(existingHierarchy, data.supervisor_id);
    if (depth >= maxHierarchyDepth) {
      errors.push(`Hierarchy depth exceeds maximum allowed levels (${maxHierarchyDepth})`);
    }

    // Check span of control
    const spanOfControl = this.calculateSpanOfControl(existingHierarchy, data.supervisor_id);
    if (spanOfControl >= maxSpanOfControl) {
      errors.push(`Supervisor's span of control exceeds maximum allowed (${maxSpanOfControl})`);
    }

    return errors;
  }
}
