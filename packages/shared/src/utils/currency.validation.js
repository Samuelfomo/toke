"use strict";
// À ajouter dans shared/src/utils/validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyValidationUtils = void 0;
const currency_js_1 = require("../constants/currency.js");
class CurrencyValidationUtils {
    /**
     * Valide un code devise ISO 4217
     */
    static validateCurrencyCode(code) {
        if (!code || typeof code !== 'string')
            return false;
        const trimmed = code.trim().toUpperCase();
        return currency_js_1.CURRENCY_VALIDATION.CODE.PATTERN.test(trimmed);
    }
    /**
     * Valide un nom de devise
     */
    static validateCurrencyName(name) {
        if (!name || typeof name !== 'string')
            return false;
        const trimmed = name.trim();
        return (trimmed.length >= currency_js_1.CURRENCY_VALIDATION.NAME.MIN_LENGTH &&
            trimmed.length <= currency_js_1.CURRENCY_VALIDATION.NAME.MAX_LENGTH);
    }
    /**
     * Valide un symbole de devise
     */
    static validateCurrencySymbol(symbol) {
        if (!symbol || typeof symbol !== 'string')
            return false;
        const trimmed = symbol.trim();
        return (trimmed.length >= currency_js_1.CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH &&
            trimmed.length <= currency_js_1.CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH);
    }
    /**
     * Valide les décimales d'une devise
     */
    static validateDecimalPlaces(decimalPlaces) {
        return (Number.isInteger(decimalPlaces) &&
            decimalPlaces >= currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE &&
            decimalPlaces <= currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE);
    }
    /**
     * Valide un GUID de devise (6 digits)
     */
    static validateCurrencyGuid(guid) {
        const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
        return (!isNaN(numGuid) &&
            numGuid >= currency_js_1.CURRENCY_VALIDATION.GUID.MIN_VALUE &&
            numGuid <= currency_js_1.CURRENCY_VALIDATION.GUID.MAX_VALUE);
    }
    static isBoolean(value) {
        return typeof value === 'boolean';
    }
    /**
     * Nettoie et normalise les données de devise
     */
    static cleanCurrencyData(data) {
        const cleaned = Object.assign({}, data);
        if (cleaned.code) {
            cleaned.code = cleaned.code.toString().trim().toUpperCase();
        }
        if (cleaned.name) {
            cleaned.name = cleaned.name.toString().trim();
        }
        if (cleaned.symbol) {
            cleaned.symbol = cleaned.symbol.toString().trim();
        }
        if (cleaned.decimal_places !== undefined) {
            const parsed = parseInt(cleaned.decimal_places);
            cleaned.decimal_places = isNaN(parsed) ? 2 : parsed;
        }
        if (cleaned.active !== undefined) {
            cleaned.active = Boolean(cleaned.active === 'true' || cleaned.active === true || cleaned.active === 1);
        }
        return cleaned;
    }
    /**
     * Valide qu'une devise est complète pour création
     */
    static isValidForCreation(data) {
        return (this.validateCurrencyCode(data.code) &&
            this.validateCurrencyName(data.name) &&
            this.validateCurrencySymbol(data.symbol) &&
            this.validateDecimalPlaces(data.decimal_places));
    }
    /**
     * Extrait les erreurs de validation pour une devise
     */
    static getValidationErrors(data) {
        const errors = [];
        if (!this.validateCurrencyCode(data.code)) {
            errors.push('Invalid currency code: must be 3 uppercase letters (ISO 4217)');
        }
        if (!this.validateCurrencyName(data.name)) {
            errors.push(`Invalid currency name: must be between ${currency_js_1.CURRENCY_VALIDATION.NAME.MIN_LENGTH} and ${currency_js_1.CURRENCY_VALIDATION.NAME.MAX_LENGTH} characters`);
        }
        if (!this.validateCurrencySymbol(data.symbol)) {
            errors.push(`Invalid currency symbol: must be between ${currency_js_1.CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH} and ${currency_js_1.CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH} characters`);
        }
        if (data.decimal_places !== undefined && !this.validateDecimalPlaces(data.decimal_places)) {
            errors.push(`Invalid decimal places: must be between ${currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE} and ${currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE}`);
        }
        return errors;
    }
}
exports.CurrencyValidationUtils = CurrencyValidationUtils;
