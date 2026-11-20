export type AttendancePdfColor = readonly [number, number, number];

export interface AttendancePdfTheme {
  fontFamily: string;
  colors: {
    text: AttendancePdfColor;
    mutedText: AttendancePdfColor;
    border: AttendancePdfColor;
    surface: AttendancePdfColor;
    surfaceMuted: AttendancePdfColor;
    headerRule: AttendancePdfColor;
    accent: AttendancePdfColor;
    danger: AttendancePdfColor;
    warning: AttendancePdfColor;
    success: AttendancePdfColor;
  };
}

/**
 * Thème volontairement neutre. Les couleurs de marque du tenant pourront être
 * injectées plus tard sans modifier le moteur de pagination.
 */
export const DEFAULT_ATTENDANCE_PDF_THEME: AttendancePdfTheme = {
  fontFamily: 'helvetica',
  colors: {
    text: [31, 41, 55],
    mutedText: [107, 114, 128],
    border: [209, 213, 219],
    surface: [255, 255, 255],
    surfaceMuted: [249, 250, 251],
    headerRule: [229, 231, 235],
    accent: [55, 65, 81],
    danger: [153, 27, 27],
    warning: [146, 64, 14],
    success: [22, 101, 52],
  },
};
