export default class TimezoneConfig {
  // Timezone pour l'Afrique Centrale (Cameroun, Congo, etc.)
  private static readonly TIMEZONE = 'Africa/Douala'; // UTC+1
  /**
   * Retourne le timezone configuré
   */
  public static getTimezone(): string {
    return TimezoneConfig.TIMEZONE;
  }

  /**
   * Retourne la date/heure actuelle au timezone Africa/Douala
   */
  public static getCurrentTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TimezoneConfig.TIMEZONE }));
  }
}
