import { CountryCode, getCountries, isValidPhoneNumber } from 'libphonenumber-js';

export default class CountryPhoneValidation {
  static validatePhoneNumber(phone: string, code: string): boolean {
    // Normalisation du code pays
    const countryCode = code.toUpperCase();

    // Vérifie que le code pays existe bien dans libphonenumber-js
    const isCountryValid = countryCode && getCountries().includes(countryCode as CountryCode);

    return !(!isCountryValid || !isValidPhoneNumber(phone, countryCode as CountryCode));
  }
}
