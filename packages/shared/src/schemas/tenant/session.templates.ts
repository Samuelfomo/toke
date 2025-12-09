// schemas/session_templates.ts
import { z } from 'zod';

import {
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_ERRORS,
  SESSION_TEMPLATE_VALIDATION,
  SessionTemplateCode,
  VALID_DAYS,
} from '../../constants/tenant/session.templates.js';

// Time format validation (HH:MM)
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

// Work block schema
const workBlockSchema = z
  .object({
    work: z
      .array(z.string().regex(timeRegex, SESSION_TEMPLATE_ERRORS.WORK_TIME_INVALID))
      .length(2, SESSION_TEMPLATE_ERRORS.WORK_INVALID_FORMAT)
      .refine(
        ([start, end]) => {
          const [startHour, startMin] = start!.split(':').map(Number);
          const [endHour, endMin] = end!.split(':').map(Number);
          const startMinutes = startHour! * 60 + startMin!;
          const endMinutes = endHour! * 60 + endMin!;
          return startMinutes < endMinutes;
        },
        { message: SESSION_TEMPLATE_ERRORS.WORK_START_AFTER_END },
      ),
    // work: z
    //   .tuple([
    //     z.string().regex(timeRegex, SESSION_TEMPLATE_ERRORS.WORK_TIME_INVALID),
    //     z.string().regex(timeRegex, SESSION_TEMPLATE_ERRORS.WORK_TIME_INVALID),
    //   ])
    //   .refine(
    //     ([start, end]) => {
    //       const [startHour, startMin] = start.split(':').map(Number);
    //       const [endHour, endMin] = end.split(':').map(Number);
    //
    //       const startMinutes = startHour * 60 + startMin;
    //       const endMinutes = endHour * 60 + endMin;
    //
    //       return startMinutes < endMinutes;
    //     },
    //     { message: SESSION_TEMPLATE_ERRORS.WORK_START_AFTER_END },
    //   ),
    pause: z
      .array(z.string().regex(timeRegex, SESSION_TEMPLATE_ERRORS.PAUSE_TIME_INVALID))
      .length(2, SESSION_TEMPLATE_ERRORS.PAUSE_INVALID_FORMAT)
      .refine(
        ([start, end]) => {
          const [startHour, startMin] = start!.split(':').map(Number);
          const [endHour, endMin] = end!.split(':').map(Number);
          const startMinutes = startHour! * 60 + startMin!;
          const endMinutes = endHour! * 60 + endMin!;
          return startMinutes < endMinutes;
        },
        { message: SESSION_TEMPLATE_ERRORS.PAUSE_START_AFTER_END },
      )
      .nullable()
      .optional()
      .superRefine((pause, ctx) => {
        // Pause validation is done in parent refine
      }),

    tolerance: z
      .number({
        required_error: SESSION_TEMPLATE_ERRORS.TOLERANCE_REQUIRED,
        invalid_type_error: SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID,
      })
      .int(SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
      .min(SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN, SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
      .max(SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX, SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID),
  })
  .refine(
    (block) => {
      // Validate pause is within work block
      if (block.pause) {
        const [workStartHour, workStartMin] = block.work[0]!.split(':').map(Number);
        const [workEndHour, workEndMin] = block.work[1]!.split(':').map(Number);
        const [pauseStartHour, pauseStartMin] = block.pause[0]!.split(':').map(Number);
        const [pauseEndHour, pauseEndMin] = block.pause[1]!.split(':').map(Number);

        const workStart = workStartHour! * 60 + workStartMin!;
        const workEnd = workEndHour! * 60 + workEndMin!;
        const pauseStart = pauseStartHour! * 60 + pauseStartMin!;
        const pauseEnd = pauseEndHour! * 60 + pauseEndMin!;

        return pauseStart >= workStart && pauseEnd <= workEnd;
      }
      return true;
    },
    { message: SESSION_TEMPLATE_ERRORS.PAUSE_OUTSIDE_WORK },
  );

// Definition schema with day-based blocks
const definitionSchema = z.record(z.enum(VALID_DAYS), z.array(workBlockSchema)).refine(
  (definition) => {
    // Check for overlapping blocks on each day
    for (const [day, blocks] of Object.entries(definition)) {
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const block1 = blocks[i];
          const block2 = blocks[j];

          const [start1Hour, start1Min] = block1!.work[0]!.split(':').map(Number);
          const [end1Hour, end1Min] = block1!.work[1]!.split(':').map(Number);
          const [start2Hour, start2Min] = block2!.work[0]!.split(':').map(Number);
          const [end2Hour, end2Min] = block2!.work[1]!.split(':').map(Number);

          const start1 = start1Hour! * 60 + start1Min!;
          const end1 = end1Hour! * 60 + end1Min!;
          const start2 = start2Hour! * 60 + start2Min!;
          const end2 = end2Hour! * 60 + end2Min!;

          // Check for overlap
          if (start1 < end2 && start2 < end1) {
            return false;
          }
        }
      }
    }
    return true;
  },
  { message: SESSION_TEMPLATE_ERRORS.OVERLAPPING_BLOCKS },
);

// Base schema for common validations
const baseSessionTemplateSchema = z.object({
  // tenant: z
  //   .string({
  //     required_error: SESSION_TEMPLATE_ERRORS.TENANT_REQUIRED,
  //     invalid_type_error: SESSION_TEMPLATE_ERRORS.TENANT_INVALID,
  //   })
  //   .min(SESSION_TEMPLATE_VALIDATION.TENANT.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.TENANT_INVALID)
  //   .max(SESSION_TEMPLATE_VALIDATION.TENANT.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.TENANT_INVALID)
  //   .trim(),

  name: z
    .string({
      required_error: SESSION_TEMPLATE_ERRORS.NAME_REQUIRED,
      invalid_type_error: SESSION_TEMPLATE_ERRORS.NAME_INVALID,
    })
    .min(SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.NAME_INVALID)
    .max(SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.NAME_INVALID)
    .trim(),

  // valid_from: z
  //   .string({
  //     required_error: SESSION_TEMPLATE_ERRORS.VALID_FROM_REQUIRED,
  //     invalid_type_error: SESSION_TEMPLATE_ERRORS.VALID_FROM_INVALID,
  //   })
  //   .datetime(SESSION_TEMPLATE_ERRORS.VALID_FROM_INVALID)
  //   .or(z.date()),
  valid_from: z
    .union([z.string(), z.date()])
    .refine((val) => !isNaN(new Date(val).getTime()), SESSION_TEMPLATE_ERRORS.VALID_FROM_INVALID),
  valid_to: z
    .union([z.string(), z.date(), z.null()])
    .refine(
      (val) => val === null || !isNaN(new Date(val).getTime()),
      SESSION_TEMPLATE_ERRORS.VALID_TO_INVALID,
    )
    .optional(),

  // valid_to: z
  //   .string({
  //     invalid_type_error: SESSION_TEMPLATE_ERRORS.VALID_TO_INVALID,
  //   })
  //   .datetime(SESSION_TEMPLATE_ERRORS.VALID_TO_INVALID)
  //   .or(z.date())
  //   .nullable()
  //   .optional(),

  definition: definitionSchema,
});

// Schema for creation - all fields required
export const createSessionTemplateSchema = baseSessionTemplateSchema;

// Schema for updates - all fields optional
export const updateSessionTemplateSchema = baseSessionTemplateSchema.partial();

// Schema for filters
export const sessionTemplateFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    name: z.string().optional(),
    valid_from: z.string().datetime().optional(),
    valid_to: z.string().datetime().optional(),
    valid_at: z.string().datetime().optional(),
  })
  .strict();

// Schema for GUID validation
export const sessionTemplateGuidSchema = z
  .string()
  .min(SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.GUID_INVALID)
  .max(SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.GUID_INVALID);

// Shared constant for field -> code mapping
const FIELD_TO_CODE_MAP: Record<string, SessionTemplateCode> = {
  tenant: SESSION_TEMPLATE_CODES.TENANT_INVALID,
  name: SESSION_TEMPLATE_CODES.NAME_INVALID,
  valid_from: SESSION_TEMPLATE_CODES.VALID_FROM_INVALID,
  valid_to: SESSION_TEMPLATE_CODES.VALID_TO_INVALID,
  definition: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
};

// Validation function for creation
export const validateSessionTemplateCreation = (data: any) => {
  const result = createSessionTemplateSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SESSION_TEMPLATE_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Validation function for update
export const validateSessionTemplateUpdate = (data: any) => {
  const result = updateSessionTemplateSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SESSION_TEMPLATE_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateSessionTemplateFilters = (data: any) => {
  const result = sessionTemplateFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = SESSION_TEMPLATE_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateSessionTemplateGuid = (guid: any) => {
  const result = sessionTemplateGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(SESSION_TEMPLATE_ERRORS.GUID_INVALID);
    error.code = SESSION_TEMPLATE_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const sessionTemplateResponseSchema = baseSessionTemplateSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const sessionTemplateSchemas = {
  validateSessionTemplateCreation,
  validateSessionTemplateUpdate,
  validateSessionTemplateFilters,
  validateSessionTemplateGuid,
  createSessionTemplateSchema,
  updateSessionTemplateSchema,
  sessionTemplateFiltersSchema,
  sessionTemplateGuidSchema,
};

// TypeScript types generated from schemas
export type CreateSessionTemplateInput = z.infer<typeof createSessionTemplateSchema>;
export type UpdateSessionTemplateInput = z.infer<typeof updateSessionTemplateSchema>;
export type SessionTemplateData = z.infer<typeof sessionTemplateResponseSchema>;
export type SessionTemplateFilters = z.infer<typeof sessionTemplateFiltersSchema>;
export type WorkBlock = z.infer<typeof workBlockSchema>;
export type SessionDefinition = z.infer<typeof definitionSchema>;
