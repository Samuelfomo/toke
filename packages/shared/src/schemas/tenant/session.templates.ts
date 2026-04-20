import { z } from 'zod';

import {
  SESSION_TEMPLATE_CODES,
  SESSION_TEMPLATE_ERRORS,
  SESSION_TEMPLATE_VALIDATION,
  SessionTemplateCode,
} from '../../constants/tenant/session.templates.js';

const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const timeString = (errorMsg: string) => z.string().regex(timeRegex, errorMsg);

const workBlockSchema = z
  .object({
    work: z
      .array(timeString(SESSION_TEMPLATE_ERRORS.WORK_TIME_INVALID))
      .length(2, SESSION_TEMPLATE_ERRORS.WORK_INVALID_FORMAT)
      .refine(([start, end]) => toMin(start!) < toMin(end!), {
        message: SESSION_TEMPLATE_ERRORS.WORK_START_AFTER_END,
      }),
    pause: z
      .array(timeString(SESSION_TEMPLATE_ERRORS.PAUSE_TIME_INVALID))
      .length(2, SESSION_TEMPLATE_ERRORS.PAUSE_INVALID_FORMAT)
      .refine(([start, end]) => toMin(start!) < toMin(end!), {
        message: SESSION_TEMPLATE_ERRORS.PAUSE_START_AFTER_END,
      })
      .nullable()
      .optional(),
    tolerance: z
      .number({ invalid_type_error: SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID })
      .int(SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
      .min(SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN, SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
      .max(SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX, SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID),
  })
  .refine(
    (block) => {
      if (!block.pause) return true;
      const workStart = toMin(block.work[0]!);
      const workEnd = toMin(block.work[1]!);
      const pauseStart = toMin(block.pause[0]!);
      const pauseEnd = toMin(block.pause[1]!);
      return pauseStart >= workStart && pauseEnd <= workEnd;
    },
    { message: SESSION_TEMPLATE_ERRORS.PAUSE_OUTSIDE_WORK },
  );

const dayValueSchema = z.union([z.array(workBlockSchema), z.null()]);

const definitionSchema = z
  .object({
    Mon: dayValueSchema.optional(),
    Tue: dayValueSchema.optional(),
    Wed: dayValueSchema.optional(),
    Thu: dayValueSchema.optional(),
    Fri: dayValueSchema.optional(),
    Sat: dayValueSchema.optional(),
    Sun: dayValueSchema.optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    for (const [day, value] of Object.entries(def)) {
      if (!value) continue;
      const blocks = value;
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const s1 = toMin(blocks[i]!.work[0]!);
          const e1 = toMin(blocks[i]!.work[1]!);
          const s2 = toMin(blocks[j]!.work[0]!);
          const e2 = toMin(blocks[j]!.work[1]!);
          if (s1 < e2 && s2 < e1) {
            ctx.addIssue({
              path: [day],
              code: z.ZodIssueCode.custom,
              message: SESSION_TEMPLATE_ERRORS.OVERLAPPING_BLOCKS,
            });
          }
        }
      }
    }
  });

// ─── Base schema ─────────────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z
    .string({ required_error: SESSION_TEMPLATE_ERRORS.NAME_REQUIRED })
    .min(SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.NAME_INVALID)
    .max(SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.NAME_INVALID)
    .trim(),
  definition: definitionSchema,
  default: z.boolean().default(false),
  current: z.boolean().default(true),
  for_rotation: z.boolean().default(false),
  session_model: z
    .string({
      required_error: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_REQUIRED,
      invalid_type_error: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID,
    })
    .min(SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID)
    .max(SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID)
    .trim(),
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const createSessionTemplateSchema = baseSchema;
export const updateSessionTemplateSchema = baseSchema.partial();

export const sessionTemplateFiltersSchema = z
  .object({
    name: z.string().optional(),
    current: z.boolean().optional(),
    for_rotation: z.boolean().optional(),
    session_model: z.string().optional(),
  })
  .strict();

export const sessionTemplateGuidSchema = z
  .string()
  .min(SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH, SESSION_TEMPLATE_ERRORS.GUID_INVALID)
  .max(SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH, SESSION_TEMPLATE_ERRORS.GUID_INVALID);

// ─── Validators ──────────────────────────────────────────────────────────────

const FIELD_TO_CODE: Record<string, SessionTemplateCode> = {
  name: SESSION_TEMPLATE_CODES.NAME_INVALID,
  definition: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
  session_model: SESSION_TEMPLATE_CODES.SESSION_MODEL_INVALID,
};

function throwFirst(result: z.SafeParseError<any>): never {
  const first = result.error.issues[0]!;
  const field = first.path[0] as string;
  const error: any = new Error(first.message);
  error.code = FIELD_TO_CODE[field] ?? SESSION_TEMPLATE_CODES.VALIDATION_FAILED;
  throw error;
}

export const validateSessionTemplateCreation = (data: unknown) => {
  const result = createSessionTemplateSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
};

export const validateSessionTemplateUpdate = (data: unknown) => {
  const result = updateSessionTemplateSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
};

export const validateSessionTemplateFilters = (data: unknown) => {
  const result = sessionTemplateFiltersSchema.safeParse(data);
  if (!result.success) {
    const error: any = new Error(result.error.issues[0]!.message);
    error.code = SESSION_TEMPLATE_CODES.FILTER_INVALID;
    throw error;
  }
  return result.data;
};

export const validateSessionTemplateGuid = (guid: unknown) => {
  const result = sessionTemplateGuidSchema.safeParse(guid);
  if (!result.success) {
    const error: any = new Error(SESSION_TEMPLATE_ERRORS.GUID_INVALID);
    error.code = SESSION_TEMPLATE_CODES.INVALID_GUID;
    throw error;
  }
  return result.data;
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateSessionTemplateInput = z.infer<typeof createSessionTemplateSchema>;
export type UpdateSessionTemplateInput = z.infer<typeof updateSessionTemplateSchema>;
export type SessionTemplateFilters = z.infer<typeof sessionTemplateFiltersSchema>;
export type WorkBlock = z.infer<typeof workBlockSchema>;
export type DayValue = z.infer<typeof dayValueSchema>;
export type SessionDefinition = z.infer<typeof definitionSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}
