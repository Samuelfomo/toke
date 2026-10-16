"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSessionTemplateGuid = exports.validateSessionTemplateFilters = exports.validateSessionTemplateUpdate = exports.validateSessionTemplateCreation = exports.sessionTemplateGuidSchema = exports.sessionTemplateFiltersSchema = exports.updateSessionTemplateSchema = exports.createSessionTemplateSchema = void 0;
const zod_1 = require("zod");
const session_templates_js_1 = require("../../constants/tenant/session.templates.js");
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
const timeString = (errorMsg) => zod_1.z.string().regex(timeRegex, errorMsg);
const workBlockSchema = zod_1.z
    .object({
    work: zod_1.z
        .array(timeString(session_templates_js_1.SESSION_TEMPLATE_ERRORS.WORK_TIME_INVALID))
        .length(2, session_templates_js_1.SESSION_TEMPLATE_ERRORS.WORK_INVALID_FORMAT)
        .refine(([start, end]) => toMin(start) < toMin(end), {
        message: session_templates_js_1.SESSION_TEMPLATE_ERRORS.WORK_START_AFTER_END,
    }),
    pause: zod_1.z
        .array(timeString(session_templates_js_1.SESSION_TEMPLATE_ERRORS.PAUSE_TIME_INVALID))
        .length(2, session_templates_js_1.SESSION_TEMPLATE_ERRORS.PAUSE_INVALID_FORMAT)
        .refine(([start, end]) => toMin(start) < toMin(end), {
        message: session_templates_js_1.SESSION_TEMPLATE_ERRORS.PAUSE_START_AFTER_END,
    })
        .nullable()
        .optional(),
    tolerance: zod_1.z
        .number({ invalid_type_error: session_templates_js_1.SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID })
        .int(session_templates_js_1.SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
        .min(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN, session_templates_js_1.SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID)
        .max(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX, session_templates_js_1.SESSION_TEMPLATE_ERRORS.TOLERANCE_INVALID),
})
    .refine((block) => {
    if (!block.pause)
        return true;
    const workStart = toMin(block.work[0]);
    const workEnd = toMin(block.work[1]);
    const pauseStart = toMin(block.pause[0]);
    const pauseEnd = toMin(block.pause[1]);
    return pauseStart >= workStart && pauseEnd <= workEnd;
}, { message: session_templates_js_1.SESSION_TEMPLATE_ERRORS.PAUSE_OUTSIDE_WORK });
const dayValueSchema = zod_1.z.union([zod_1.z.array(workBlockSchema), zod_1.z.null()]);
const definitionSchema = zod_1.z
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
        if (!value)
            continue;
        const blocks = value;
        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                const s1 = toMin(blocks[i].work[0]);
                const e1 = toMin(blocks[i].work[1]);
                const s2 = toMin(blocks[j].work[0]);
                const e2 = toMin(blocks[j].work[1]);
                if (s1 < e2 && s2 < e1) {
                    ctx.addIssue({
                        path: [day],
                        code: zod_1.z.ZodIssueCode.custom,
                        message: session_templates_js_1.SESSION_TEMPLATE_ERRORS.OVERLAPPING_BLOCKS,
                    });
                }
            }
        }
    }
});
// ─── Base schema ─────────────────────────────────────────────────────────────
const baseSchema = zod_1.z.object({
    name: zod_1.z
        .string({ required_error: session_templates_js_1.SESSION_TEMPLATE_ERRORS.NAME_REQUIRED })
        .min(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.NAME_INVALID)
        .max(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.NAME_INVALID)
        .trim(),
    definition: definitionSchema,
    default: zod_1.z.boolean().default(false),
    current: zod_1.z.boolean().default(true),
    for_rotation: zod_1.z.boolean().default(false),
    session_model: zod_1.z
        .string({
        required_error: session_templates_js_1.SESSION_TEMPLATE_ERRORS.SESSION_MODEL_REQUIRED,
        invalid_type_error: session_templates_js_1.SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID,
    })
        .min(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID)
        .max(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.SESSION_MODEL_INVALID)
        .trim(),
});
// ─── Exports ─────────────────────────────────────────────────────────────────
exports.createSessionTemplateSchema = baseSchema;
exports.updateSessionTemplateSchema = baseSchema.partial();
exports.sessionTemplateFiltersSchema = zod_1.z
    .object({
    name: zod_1.z.string().optional(),
    current: zod_1.z.boolean().optional(),
    for_rotation: zod_1.z.boolean().optional(),
    session_model: zod_1.z.string().optional(),
})
    .strict();
exports.sessionTemplateGuidSchema = zod_1.z
    .string()
    .min(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.GUID_INVALID)
    .max(session_templates_js_1.SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH, session_templates_js_1.SESSION_TEMPLATE_ERRORS.GUID_INVALID);
// ─── Validators ──────────────────────────────────────────────────────────────
const FIELD_TO_CODE = {
    name: session_templates_js_1.SESSION_TEMPLATE_CODES.NAME_INVALID,
    definition: session_templates_js_1.SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
    session_model: session_templates_js_1.SESSION_TEMPLATE_CODES.SESSION_MODEL_INVALID,
};
function throwFirst(result) {
    var _a;
    const first = result.error.issues[0];
    const field = first.path[0];
    const error = new Error(first.message);
    error.code = (_a = FIELD_TO_CODE[field]) !== null && _a !== void 0 ? _a : session_templates_js_1.SESSION_TEMPLATE_CODES.VALIDATION_FAILED;
    throw error;
}
const validateSessionTemplateCreation = (data) => {
    const result = exports.createSessionTemplateSchema.safeParse(data);
    if (!result.success)
        throwFirst(result);
    return result.data;
};
exports.validateSessionTemplateCreation = validateSessionTemplateCreation;
const validateSessionTemplateUpdate = (data) => {
    const result = exports.updateSessionTemplateSchema.safeParse(data);
    if (!result.success)
        throwFirst(result);
    return result.data;
};
exports.validateSessionTemplateUpdate = validateSessionTemplateUpdate;
const validateSessionTemplateFilters = (data) => {
    const result = exports.sessionTemplateFiltersSchema.safeParse(data);
    if (!result.success) {
        const error = new Error(result.error.issues[0].message);
        error.code = session_templates_js_1.SESSION_TEMPLATE_CODES.FILTER_INVALID;
        throw error;
    }
    return result.data;
};
exports.validateSessionTemplateFilters = validateSessionTemplateFilters;
const validateSessionTemplateGuid = (guid) => {
    const result = exports.sessionTemplateGuidSchema.safeParse(guid);
    if (!result.success) {
        const error = new Error(session_templates_js_1.SESSION_TEMPLATE_ERRORS.GUID_INVALID);
        error.code = session_templates_js_1.SESSION_TEMPLATE_CODES.INVALID_GUID;
        throw error;
    }
    return result.data;
};
exports.validateSessionTemplateGuid = validateSessionTemplateGuid;
// ─── Helpers ─────────────────────────────────────────────────────────────────
function toMin(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}
