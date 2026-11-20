export const EMPLOYEE_COLOR_PATTERN = /^#[0-9A-F]{6}$/

export const EMPLOYEE_COLOR_PALETTE = [
    '#2563EB',
    '#DC2626',
    '#16A34A',
    '#D97706',
    '#7C3AED',
    '#0891B2',
    '#DB2777',
    '#4F46E5',

    '#65A30D',
    '#EA580C',
    '#0F766E',
    '#9333EA',
    '#0284C7',
    '#BE123C',
    '#15803D',
    '#B45309',

    '#6D28D9',
    '#0E7490',
    '#C026D3',
    '#1D4ED8',
    '#A21CAF',
    '#0369A1',
    '#B91C1C',
    '#047857',

    '#A16207',
    '#5B21B6',
    '#0D9488',
    '#C2410C',
    '#4338CA',
    '#155E75',
    '#9D174D',
    '#166534',
] as const

export function normalizeEmployeeColor(value: unknown): string | null {
    if (typeof value !== 'string') return null

    const normalized = value.trim().toUpperCase()

    return EMPLOYEE_COLOR_PATTERN.test(normalized)
        ? normalized
        : null
}

export function employeeColorRgb(
    value: unknown,
): [number, number, number] | null {
    const color = normalizeEmployeeColor(value)

    if (!color) return null

    return [
        Number.parseInt(color.slice(1, 3), 16),
        Number.parseInt(color.slice(3, 5), 16),
        Number.parseInt(color.slice(5, 7), 16),
    ]
}

export function employeeColorText(
    value: unknown,
): '#FFFFFF' | '#0F172A' | '#475569' {
    const rgb = employeeColorRgb(value)

    if (!rgb) return '#475569'

    const [r, g, b] = rgb

    const luminance =
        (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance >= 0.62
        ? '#0F172A'
        : '#FFFFFF'
}

export function employeeAvatarStyle(
    value: unknown,
): Record<string, string> {
    const color = normalizeEmployeeColor(value)

    if (!color) {
        return {
            backgroundColor: '#F1F5F9',
            borderColor: '#CBD5E1',
            color: '#475569',
        }
    }

    return {
        backgroundColor: color,
        borderColor: color,
        color: employeeColorText(color),
    }
}

export function employeePhotoStyle(
    value: unknown,
): Record<string, string> {
    const color = normalizeEmployeeColor(value)

    return color
        ? { borderColor: color }
        : { borderColor: '#E2E8F0' }
}