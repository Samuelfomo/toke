// schemas/teams.ts
import { z } from 'zod';

import {
  TeamCode,
  TEAMS_CODES,
  TEAMS_DEFAULTS,
  TEAMS_ERRORS,
  TEAMS_VALIDATION,
} from '../../constants/tenant/teams.js';

// Schema pour un membre de l'équipe
const teamMemberSchema = z.object({
  user: z
    .string({
      required_error: TEAMS_ERRORS.MEMBER_USER_REQUIRED,
      invalid_type_error: TEAMS_ERRORS.MEMBER_USER_INVALID,
    })
    .trim()
    .min(TEAMS_VALIDATION.MEMBER.USER.MIN_LENGTH, TEAMS_ERRORS.MEMBER_USER_INVALID)
    .max(TEAMS_VALIDATION.MEMBER.USER.MAX_LENGTH, TEAMS_ERRORS.MEMBER_USER_INVALID),

  joined_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: TEAMS_ERRORS.MEMBER_JOINED_AT_INVALID,
    })
    // .default(() => TimezoneConfigUtils.getCurrentTime()),
    .default(TEAMS_DEFAULTS.MEMBER_JOINED_AT),

  active: z
    .boolean({
      invalid_type_error: TEAMS_ERRORS.MEMBER_ACTIVE_INVALID,
    })
    .default(TEAMS_DEFAULTS.MEMBER_ACTIVE),
});

// Schema pour une assignation de session
const assignedSessionSchema = z.object({
  session_template: z
    .string({
      required_error: TEAMS_ERRORS.SESSION_TEMPLATE_REQUIRED,
      invalid_type_error: TEAMS_ERRORS.SESSION_TEMPLATE_INVALID,
    })
    // .int()
    .trim()
    .min(TEAMS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH, TEAMS_ERRORS.SESSION_TEMPLATE_INVALID)
    .max(TEAMS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH, TEAMS_ERRORS.SESSION_TEMPLATE_INVALID),

  assign_at: z
    .union([z.date(), z.string().transform((val) => new Date(val))], {
      invalid_type_error: TEAMS_ERRORS.SESSION_ASSIGN_AT_INVALID,
    })
    .default(TEAMS_DEFAULTS.SESSION_ASSIGN_AT),

  active: z
    .boolean({
      required_error: TEAMS_ERRORS.SESSION_ACTIVE_INVALID,
      invalid_type_error: TEAMS_ERRORS.SESSION_ACTIVE_INVALID,
    })
    .default(TEAMS_DEFAULTS.SESSION_ACTIVE),
});

// Base schema pour les validations communes
const baseTeamsSchema = z.object({
  name: z
    .string({
      required_error: TEAMS_ERRORS.NAME_REQUIRED,
      invalid_type_error: TEAMS_ERRORS.NAME_INVALID,
    })
    .min(TEAMS_VALIDATION.NAME.MIN_LENGTH, TEAMS_ERRORS.NAME_INVALID)
    .max(TEAMS_VALIDATION.NAME.MAX_LENGTH, TEAMS_ERRORS.NAME_INVALID)
    .trim(),

  manager: z
    .string({
      required_error: TEAMS_ERRORS.MANAGER_REQUIRED,
      invalid_type_error: TEAMS_ERRORS.MANAGER_INVALID,
    })
    // .int()
    .trim()
    .min(TEAMS_VALIDATION.MANAGER.MIN_LENGTH, TEAMS_ERRORS.MANAGER_INVALID)
    .max(TEAMS_VALIDATION.MANAGER.MAX_LENGTH, TEAMS_ERRORS.MANAGER_INVALID),

  members: z
    .array(teamMemberSchema, {
      invalid_type_error: TEAMS_ERRORS.MEMBERS_INVALID,
    })
    .default(() => []),

  assigned_sessions: z
    .array(assignedSessionSchema, {
      invalid_type_error: TEAMS_ERRORS.ASSIGNED_SESSIONS_INVALID,
    })
    .default(() => []),
});

// Schema avec validations métier complexes
const teamsWithValidation = baseTeamsSchema
  .refine(
    (data) => {
      // Vérifier l'unicité des user IDs dans members
      const userIds = data.members.map((m) => m.user);
      const uniqueUserIds = new Set(userIds);
      return userIds.length === uniqueUserIds.size;
    },
    {
      message: TEAMS_ERRORS.MEMBER_DUPLICATE,
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Vérifier qu'il n'y a qu'une seule session active
      const activeSessions = data.assigned_sessions.filter((s) => s.active);
      return activeSessions.length <= 1;
    },
    {
      message: TEAMS_ERRORS.MULTIPLE_ACTIVE_SESSIONS,
      path: ['assigned_sessions'],
    },
  );

// Schema pour la création - tous les champs requis
export const createTeamsSchema = teamsWithValidation;

// Schema pour les mises à jour - tous les champs optionnels
export const updateTeamsSchema = baseTeamsSchema.partial();

// Schema pour les filtres
export const teamsFiltersSchema = z
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
export const teamsGuidSchema = z
  .string()
  .min(TEAMS_VALIDATION.GUID.MIN_LENGTH, TEAMS_ERRORS.GUID_INVALID)
  .max(TEAMS_VALIDATION.GUID.MAX_LENGTH, TEAMS_ERRORS.GUID_INVALID);

// Constante partagée pour le mapping field -> code
const FIELD_TO_CODE_MAP: Record<string, TeamCode> = {
  name: TEAMS_CODES.NAME_INVALID,
  manager: TEAMS_CODES.MANAGER_INVALID,
  members: TEAMS_CODES.MEMBERS_INVALID,
  assigned_sessions: TEAMS_CODES.ASSIGNED_SESSIONS_INVALID,
  'members.user': TEAMS_CODES.MEMBER_USER_INVALID,
  'members.joined_at': TEAMS_CODES.MEMBER_JOINED_AT_INVALID,
  'members.active': TEAMS_CODES.MEMBER_ACTIVE_INVALID,
  'assigned_sessions.session_template': TEAMS_CODES.SESSION_TEMPLATE_INVALID,
  'assigned_sessions.assign_at': TEAMS_CODES.SESSION_ASSIGN_AT_INVALID,
  'assigned_sessions.active': TEAMS_CODES.SESSION_ACTIVE_INVALID,
};

// Fonction de validation pour la création
export const validateTeamsCreation = (data: any) => {
  const result = createTeamsSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path.join('.');

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || TEAMS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Fonction de validation pour la mise à jour
export const validateTeamsUpdate = (data: any) => {
  const result = updateTeamsSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path.join('.');

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || TEAMS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateTeamsFilters = (data: any) => {
  const result = teamsFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = TEAMS_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateTeamsGuid = (guid: any) => {
  const result = teamsGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(TEAMS_ERRORS.GUID_INVALID);
    error.code = TEAMS_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Validation pour l'ajout d'un membre
export const validateMemberAddition = (newMember: any) => {
  // Valider le nouveau membre
  const result = teamMemberSchema.safeParse(newMember);
  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const error: any = new Error(firstError.message);
    error.code = TEAMS_CODES.MEMBER_USER_INVALID;
    throw error;
  }

  return result.data;
};

// export const validateMemberAddition = (teamMembers: any[], newMember: any) => {
//   // Vérifier si l'utilisateur existe déjà
//   const existingMember = teamMembers.find((m) => m.user === newMember.user);
//   if (existingMember) {
//     const error: any = new Error(TEAMS_ERRORS.MEMBER_DUPLICATE);
//     error.code = TEAMS_CODES.MEMBER_DUPLICATE;
//     throw error;
//   }
//
//   // Valider le nouveau membre
//   const result = teamMemberSchema.safeParse(newMember);
//   if (!result.success) {
//     const firstError = result.error.issues[0]!;
//     const error: any = new Error(firstError.message);
//     error.code = TEAMS_CODES.MEMBER_USER_INVALID;
//     throw error;
//   }
//
//   return result.data;
// };

// Validation pour l'ajout d'une session
export const validateSessionAssignment = (assignedSessions: any[], newSession: any) => {
  // Si la nouvelle session est active, désactiver les autres
  if (newSession.active) {
    const activeSessions = assignedSessions.filter((s) => s.active);
    if (activeSessions.length > 0) {
      const error: any = new Error(TEAMS_ERRORS.MULTIPLE_ACTIVE_SESSIONS);
      error.code = TEAMS_CODES.MULTIPLE_ACTIVE_SESSIONS;
      throw error;
    }
  }

  // Valider la nouvelle session
  const result = assignedSessionSchema.safeParse(newSession);
  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const error: any = new Error(firstError.message);
    error.code = TEAMS_CODES.SESSION_TEMPLATE_INVALID;
    throw error;
  }

  return result.data;
};

// Schema complet pour les réponses (avec métadonnées)
export const teamsResponseSchema = baseTeamsSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

// Export groupé pour faciliter les imports
export const teamsSchemas = {
  validateTeamsCreation,
  validateTeamsUpdate,
  validateTeamsFilters,
  validateTeamsGuid,
  validateMemberAddition,
  validateSessionAssignment,
  createTeamsSchema,
  updateTeamsSchema,
  teamsFiltersSchema,
  teamsGuidSchema,
  teamMemberSchema,
  assignedSessionSchema,
};

// Types TypeScript générés à partir des schemas
export type CreateTeamsInput = z.infer<typeof createTeamsSchema>;
export type UpdateTeamsInput = z.infer<typeof updateTeamsSchema>;
export type TeamsData = z.infer<typeof teamsResponseSchema>;
export type TeamsFilters = z.infer<typeof teamsFiltersSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type AssignedSession = z.infer<typeof assignedSessionSchema>;
