// schemas/groups.ts
import { z } from 'zod';

import {
  GROUPS_CODES,
  GROUPS_DEFAULTS,
  GROUPS_ERRORS,
  GROUPS_VALIDATION,
  groupsCode,
} from '../../constants/tenant/groups.js';

// Schema pour un membre de l'équipe
const groupsMemberSchema = z.object({
  user: z
    .string({
      required_error: GROUPS_ERRORS.MEMBER_USER_REQUIRED,
      invalid_type_error: GROUPS_ERRORS.MEMBER_USER_INVALID,
    })
    .trim()
    .min(GROUPS_VALIDATION.MEMBER.USER.MIN_LENGTH, GROUPS_ERRORS.MEMBER_USER_INVALID)
    .max(GROUPS_VALIDATION.MEMBER.USER.MAX_LENGTH, GROUPS_ERRORS.MEMBER_USER_INVALID),

  joined_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: GROUPS_ERRORS.MEMBER_JOINED_AT_INVALID,
    })
    // .default(() => TimezoneConfigUtils.getCurrentTime()),
    .default(GROUPS_DEFAULTS.MEMBER_JOINED_AT),

  active: z
    .boolean({
      invalid_type_error: GROUPS_ERRORS.MEMBER_ACTIVE_INVALID,
    })
    .default(GROUPS_DEFAULTS.MEMBER_ACTIVE),
});

// // Schema pour une assignation de session
// const assignedSessionSchema = z.object({
//   session_template: z
//     .string({
//       required_error: GROUPS_ERRORS.SESSION_TEMPLATE_REQUIRED,
//       invalid_type_error: GROUPS_ERRORS.SESSION_TEMPLATE_INVALID,
//     })
//     // .int()
//     .trim()
//     .min(GROUPS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH, GROUPS_ERRORS.SESSION_TEMPLATE_INVALID)
//     .max(GROUPS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH, GROUPS_ERRORS.SESSION_TEMPLATE_INVALID),
//
//   assign_at: z
//     .union([z.date(), z.string().transform((val) => new Date(val))], {
//       invalid_type_error: GROUPS_ERRORS.SESSION_ASSIGN_AT_INVALID,
//     })
//     .default(GROUPS_DEFAULTS.SESSION_ASSIGN_AT),
//
//   active: z
//     .boolean({
//       required_error: GROUPS_ERRORS.SESSION_ACTIVE_INVALID,
//       invalid_type_error: GROUPS_ERRORS.SESSION_ACTIVE_INVALID,
//     })
//     .default(GROUPS_DEFAULTS.SESSION_ACTIVE),
// });

// Base schema pour les validations communes
const baseGroupSchema = z.object({
  name: z
    .string({
      required_error: GROUPS_ERRORS.NAME_REQUIRED,
      invalid_type_error: GROUPS_ERRORS.NAME_INVALID,
    })
    .min(GROUPS_VALIDATION.NAME.MIN_LENGTH, GROUPS_ERRORS.NAME_INVALID)
    .max(GROUPS_VALIDATION.NAME.MAX_LENGTH, GROUPS_ERRORS.NAME_INVALID)
    .trim(),

  manager: z
    .string({
      required_error: GROUPS_ERRORS.MANAGER_REQUIRED,
      invalid_type_error: GROUPS_ERRORS.MANAGER_INVALID,
    })
    // .int()
    .trim()
    .min(GROUPS_VALIDATION.MANAGER.MIN_LENGTH, GROUPS_ERRORS.MANAGER_INVALID)
    .max(GROUPS_VALIDATION.MANAGER.MAX_LENGTH, GROUPS_ERRORS.MANAGER_INVALID),

  members: z
    .array(groupsMemberSchema, {
      invalid_type_error: GROUPS_ERRORS.MEMBERS_INVALID,
    })
    .default(() => []),

  // assigned_sessions: z
  //   .array(assignedSessionSchema, {
  //     invalid_type_error: GROUPS_ERRORS.ASSIGNED_SESSIONS_INVALID,
  //   })
  //   .default(() => []),
});

// Schema avec validations métier complexes
const groupsWithValidation = baseGroupSchema.refine(
  (data) => {
    // Vérifier l'unicité des user IDs dans members
    const userIds = data.members.map((m) => m.user);
    const uniqueUserIds = new Set(userIds);
    return userIds.length === uniqueUserIds.size;
  },
  {
    message: GROUPS_ERRORS.MEMBER_DUPLICATE,
    path: ['members'],
  },
);
// .refine(
//   (data) => {
//     // Vérifier qu'il n'y a qu'une seule session active
//     const activeSessions = data.assigned_sessions.filter((s) => s.active);
//     return activeSessions.length <= 1;
//   },
//   {
//     message: GROUPS_ERRORS.MULTIPLE_ACTIVE_SESSIONS,
//     path: ['assigned_sessions'],
//   },
// );

// Schema pour la création - tous les champs requis
export const createGroupSchema = groupsWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateGroupSchema = baseGroupSchema.partial();

// ✅ Schema pour l'ajout de plusieurs membres
export const groupsMembersArraySchema = z
  .array(groupsMemberSchema, {
    invalid_type_error: GROUPS_ERRORS.MEMBERS_INVALID,
  })
  .min(1, GROUPS_ERRORS.MEMBERS_INVALID)
  .refine(
    (members) => {
      // unicité des users
      const ids = members.map((m) => m.user);
      return ids.length === new Set(ids).size;
    },
    {
      message: GROUPS_ERRORS.MEMBER_DUPLICATE,
      path: ['members'],
    },
  );

// Schema pour les filtres
export const groupsFiltersSchema = z
  .object({
    name: z.string().optional(),
    manager: z.string().trim().optional(),
    has_members: z.boolean().optional(),
    has_active_session: z.boolean().optional(),
    member_user: z.string().trim().optional(),
    session_template: z.string().trim().optional(),
    created_at_from: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
    created_at_to: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  })
  .strict();

// Schema pour validation GUID
export const groupsGuidSchema = z
  .string()
  .min(GROUPS_VALIDATION.GUID.MIN_LENGTH, GROUPS_ERRORS.GUID_INVALID)
  .max(GROUPS_VALIDATION.GUID.MAX_LENGTH, GROUPS_ERRORS.GUID_INVALID);

// Constante partagée pour le mapping field -> code
const FIELD_TO_CODE_MAP: Record<string, groupsCode> = {
  name: GROUPS_CODES.NAME_INVALID,
  manager: GROUPS_CODES.MANAGER_INVALID,
  members: GROUPS_CODES.MEMBERS_INVALID,
  // assigned_sessions: GROUPS_CODES.ASSIGNED_SESSIONS_INVALID,
  'members.user': GROUPS_CODES.MEMBER_USER_INVALID,
  'members.joined_at': GROUPS_CODES.MEMBER_JOINED_AT_INVALID,
  'members.active': GROUPS_CODES.MEMBER_ACTIVE_INVALID,
  // 'assigned_sessions.session_template': GROUPS_CODES.SESSION_TEMPLATE_INVALID,
  // 'assigned_sessions.assign_at': GROUPS_CODES.SESSION_ASSIGN_AT_INVALID,
  // 'assigned_sessions.active': GROUPS_CODES.SESSION_ACTIVE_INVALID,
};

// Fonction de validation pour la création
export const validateGroupsCreation = (data: any) => {
  const result = createGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path.join('.');

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || GROUPS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Fonction de validation pour la mise à jour
export const validateGroupsUpdate = (data: any) => {
  const result = updateGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path.join('.');

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || GROUPS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateGroupsFilters = (data: any) => {
  const result = groupsFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = GROUPS_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateGroupsGuid = (guid: any) => {
  const result = groupsGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(GROUPS_ERRORS.GUID_INVALID);
    error.code = GROUPS_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Validation pour l'ajout d'un membre
export const validateMemberAddition = (newMember: any) => {
  // Valider le nouveau membre
  const result = groupsMemberSchema.safeParse(newMember);
  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const error: any = new Error(firstError.message);
    error.code = GROUPS_CODES.MEMBER_USER_INVALID;
    throw error;
  }

  return result.data;
};

// ✅ Validation pour l'ajout de plusieurs membres
export const validateMembersAddition = (members: any) => {
  const result = groupsMembersArraySchema.safeParse(members);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path.join('.');

    const error: any = new Error(firstError.message);
    error.code =
      FIELD_TO_CODE_MAP[`members.${field}`] ||
      FIELD_TO_CODE_MAP['members'] ||
      GROUPS_CODES.MEMBERS_INVALID;

    throw error;
  }

  return result.data;
};

// // Validation pour l'ajout d'une session
// export const validateSessionAssignment = (assignedSessions: any[], newSession: any) => {
//   // Si la nouvelle session est active, désactiver les autres
//   if (newSession.active) {
//     const activeSessions = assignedSessions.filter((s) => s.active);
//     if (activeSessions.length > 0) {
//       const error: any = new Error(GROUPS_ERRORS.MULTIPLE_ACTIVE_SESSIONS);
//       error.code = GROUPS_CODES.MULTIPLE_ACTIVE_SESSIONS;
//       throw error;
//     }
//   }
//
//   // Valider la nouvelle session
//   const result = assignedSessionSchema.safeParse(newSession);
//   if (!result.success) {
//     const firstError = result.error.issues[0]!;
//     const error: any = new Error(firstError.message);
//     error.code = GROUPS_CODES.SESSION_TEMPLATE_INVALID;
//     throw error;
//   }
//
//   return result.data;
// };

// Schema complet pour les réponses (avec métadonnées)
export const groupsResponseSchema = baseGroupSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

// Export groupé pour faciliter les imports
export const groupSchemas = {
  validateGroupsCreation,
  validateGroupsUpdate,
  validateGroupsFilters,
  validateGroupsGuid,
  validateMemberAddition,
  validateMembersAddition,
  // validateSessionAssignment,
  createGroupSchema,
  updateGroupSchema,
  groupsFiltersSchema,
  groupsGuidSchema,
  groupsMemberSchema,
  // assignedSessionSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateGroupsInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupsInput = z.infer<typeof updateGroupSchema>;
export type GroupsData = z.infer<typeof groupsResponseSchema>;
export type GroupsFilters = z.infer<typeof groupsFiltersSchema>;
export type GroupsMember = z.infer<typeof groupsMemberSchema>;
// export type AssignedSession = z.infer<typeof assignedSessionSchema>;
