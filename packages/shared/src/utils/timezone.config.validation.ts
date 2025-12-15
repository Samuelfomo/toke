export class TimezoneConfigUtils {
  // Timezone pour l'Afrique Centrale (Cameroun, Congo, etc.)
  private static readonly TIMEZONE = 'Africa/Douala'; // UTC+1
  /**
   * Retourne le timezone configuré
   */
  public static getTimezone(): string {
    return TimezoneConfigUtils.TIMEZONE;
  }

  /**
   * Retourne la date/heure actuelle au timezone Africa/Douala
   */
  public static getCurrentTime(): Date {
    const now = new Date();
    return new Date(
      now.toLocaleString('en-US', {
        timeZone: TimezoneConfigUtils.TIMEZONE,
      }),
    );
  }
}
