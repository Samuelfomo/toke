// shared/src/utils/formatting.ts

export class CountryFormattingUtils {
  /**
   * Formate un code pays (ISO 3166-1) en majuscules
   */
  static formatCountryCode(code: string): string {
    return code?.trim().toUpperCase() || '';
  }

  /**
   * Formate un code devise (ISO 4217) en majuscules
   */
  static formatCurrencyCode(code: string): string {
    return code?.trim().toUpperCase() || '';
  }

  /**
   * Formate un code langue (ISO 639-1) en minuscules
   */
  static formatLanguageCode(code: string): string {
    return code?.trim().toLowerCase() || '';
  }

  /**
   * Formate un nom de pays
   */
  static formatCountryName(name: string): string {
    return name?.trim() || '';
  }

  /**
   * Formate un préfixe téléphonique
   */
  static formatPhonePrefix(prefix: string): string {
    const cleaned = prefix?.toString().trim() || '';
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Génère le nom d'affichage complet d'un pays
   */
  static getDisplayName(nameEn: string, nameLocal?: string): string {
    if (!nameEn) return 'Unknown Country';
    return nameLocal && nameLocal !== nameEn ? `${nameEn} (${nameLocal})` : nameEn;
  }

  /**
   * Formate le fuseau horaire
   */
  static formatTimezone(timezone: string): string {
    return timezone?.trim() || 'UTC';
  }

  /**
   * Extrait le code du drapeau emoji depuis le nom du pays
   */
  static extractFlagEmoji(name: string): string | null {
    const emojiRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
    const match = name?.match(emojiRegex);
    return match ? match[0] : null;
  }

  /**
   * Génère le drapeau emoji à partir du code pays
   */
  static generateFlagEmoji(countryCode: string): string {
    const code = countryCode?.toUpperCase();
    if (!code || code.length !== 2) return '';

    // Convertit les lettres en indicateurs régionaux Unicode
    const codePoints = code
      .split('')
      .map((char) => 0x1f1e6 + char.charCodeAt(0) - 'A'.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Formate l'affichage de la devise
   */
  static formatCurrencyDisplay(currencyCode: string): string {
    const formatted = this.formatCurrencyCode(currencyCode);
    return formatted || 'N/A';
  }
}

export class DateFormattingUtils {
  /**
   * Formate une date en format ISO
   */
  static toISOString(date: Date | string): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  }

  /**
   * Formate une date pour l'affichage (locale française)
   */
  static toDisplayDate(date: Date | string, locale = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formate une date et heure pour l'affichage
   */
  static toDisplayDateTime(date: Date | string, locale = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Calcule le temps relatif ("il y a 2 heures")
   */
  static timeAgo(date: Date | string, locale = 'fr'): string {
    const now = new Date();
    const past = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return locale === 'fr' ? "à l'instant" : 'just now';
    if (diffMins < 60) return locale === 'fr' ? `il y a ${diffMins}min` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'fr' ? `il y a ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'fr' ? `il y a ${diffDays}j` : `${diffDays}d ago`;

    return this.toDisplayDate(past, locale === 'fr' ? 'fr-FR' : 'en-US');
  }
}

export class GeneralFormattingUtils {
  /**
   * Formate un nombre avec des séparateurs de milliers
   */
  static formatNumber(num: number, locale = 'fr-FR'): string {
    return new Intl.NumberFormat(locale).format(num);
  }

  /**
   * Formate un pourcentage
   */
  static formatPercentage(value: number, decimals = 1, locale = 'fr-FR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }

  /**
   * Tronque un texte avec ellipses
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Capitalise la première lettre de chaque mot
   */
  static titleCase(text: string): string {
    return text?.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()) || '';
  }

  /**
   * Génère des initiales à partir d'un nom
   */
  static generateInitials(name: string, maxLength = 2): string {
    return (
      name
        ?.split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, maxLength) || ''
    );
  }

  /**
   * Formate une taille de fichier
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Nettoie et normalise une chaîne pour URL
   */
  static slugify(text: string): string {
    return (
      text
        ?.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || ''
    );
  }
}
