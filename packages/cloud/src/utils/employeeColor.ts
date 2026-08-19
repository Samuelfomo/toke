export const EMPLOYEE_COLOR_PATTERN = /^#[0-9A-F]{6}$/

export function normalizeEmployeeColor(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toUpperCase()
    return EMPLOYEE_COLOR_PATTERN.test(normalized) ? normalized : null
}

export function employeeColorRgb(value: unknown): [number, number, number] | null {
    const color = normalizeEmployeeColor(value)
    if (!color) return null

    return [
        Number.parseInt(color.slice(1, 3), 16),
        Number.parseInt(color.slice(3, 5), 16),
        Number.parseInt(color.slice(5, 7), 16),
    ]
}

export function employeeColorText(value: unknown): '#FFFFFF' | '#0F172A' | '#475569' {
    const rgb = employeeColorRgb(value)
    if (!rgb) return '#475569'

    const [r, g, b] = rgb
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance >= 0.62 ? '#0F172A' : '#FFFFFF'
}

export function employeeAvatarStyle(value: unknown): Record<string, string> {
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

export function employeePhotoStyle(value: unknown): Record<string, string> {
    const color = normalizeEmployeeColor(value)
    return color
        ? { borderColor: color }
        : { borderColor: '#E2E8F0' }
}
