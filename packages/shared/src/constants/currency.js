"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_ERRORS = exports.CURRENCY_DEFAULTS = exports.CURRENCY_VALIDATION = void 0;
exports.CURRENCY_VALIDATION = {
    CODE: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 3,
        PATTERN: /^[A-Z]{3}$/,
    },
    NAME: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 50,
    },
    SYMBOL: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 10,
    },
    DECIMAL_PLACES: {
        MIN_VALUE: 0,
        MAX_VALUE: 10,
    },
    GUID: {
        LENGTH: 6,
        MIN_VALUE: 100000,
        MAX_VALUE: 999999,
    },
};
exports.CURRENCY_DEFAULTS = {
    ACTIVE: true,
    DECIMAL_PLACES: 2,
    PAGINATION: {
        OFFSET: 0,
        LIMIT: 50,
        MAX_LIMIT: 500,
    },
};
const CURRENCY_LABEL = 'Currency';
exports.CURRENCY_ERRORS = {
    CURRENCY: CURRENCY_LABEL,
    CODE_REQUIRED: `${CURRENCY_LABEL} code (ISO) is required`,
    CODE_INVALID: 'Currency code must be exactly 3 uppercase letters (ISO 3166-1 alpha-3)',
    CODE_EXISTS: 'Currency code already exists',
    NAME_REQUIRED: 'Currency name (English) is required',
    NAME_INVALID: 'Currency name must be between 2 and 50 characters',
    SYMBOL_REQUIRED: 'Currency symbol is required',
    SYMBOL_INVALID: 'Currency symbol is invalid',
    INVALID_BOOLEAN: 'Invalid boolean value',
    DECIMAL_PLACES_REQUIRED: 'Currency decimal places required',
    DECIMAL_PLACES_INVALID: 'Currency decimal places is invalid',
    GUID_INVALID: 'GUID must be a 6-digit number',
    NOT_FOUND: 'Currency not found',
    CREATION_FAILED: 'Failed to create currency',
    UPDATE_FAILED: 'Failed to update currency',
    DELETE_FAILED: 'Failed to delete currency',
    EXPORT_FAILED: 'Failed to export countries',
};
