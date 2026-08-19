const BASE_EMPLOYEE_COLORS = [
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
] as const;

function componentToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase();
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 1) [r1, g1, b1] = [c, x, 0];
  else if (h < 2) [r1, g1, b1] = [x, c, 0];
  else if (h < 3) [r1, g1, b1] = [0, c, x];
  else if (h < 4) [r1, g1, b1] = [0, x, c];
  else if (h < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return `#${componentToHex((r1 + m) * 255)}${componentToHex((g1 + m) * 255)}${componentToHex((b1 + m) * 255)}`;
}

export default class EmployeeColorUtils {
  static readonly PATTERN = /^#[0-9A-F]{6}$/;

  static normalize(value: string): string {
    return value.trim().toUpperCase();
  }

  static isValid(value: unknown): value is string {
    return typeof value === 'string' && this.PATTERN.test(this.normalize(value));
  }

  /**
   * Retourne une suite déterministe de couleurs visuellement espacées.
   * Les 32 premières proviennent d'une palette contrôlée.
   * Au-delà, on utilise l'angle d'or pour répartir les teintes.
   */
  static candidate(index: number): string {
    if (index < BASE_EMPLOYEE_COLORS.length) {
      return BASE_EMPLOYEE_COLORS[index]!;
    }

    const fallbackIndex = index - BASE_EMPLOYEE_COLORS.length;
    const hue = (fallbackIndex * 137.50776405) % 360;
    const saturation = [68, 74, 80][fallbackIndex % 3]!;
    const lightness = [42, 50, 46, 55][Math.floor(fallbackIndex / 3) % 4]!;

    return hslToHex(hue, saturation, lightness);
  }
}
