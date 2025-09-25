"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersValidationUtils = void 0;
// utils/users.validation.ts
const users_js_1 = require("../../constants/tenant/users.js");
class UsersValidationUtils {
    /**
     * Validates tenant
     */
    static validateTenant(tenant) {
        if (!tenant || typeof tenant !== 'string')
            return false;
        const trimmed = tenant.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.TENANT.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.TENANT.MAX_LENGTH);
    }
    /**
     * Validates email
     */
    static validateEmail(email) {
        if (email === null || email === undefined)
            return true;
        if (typeof email !== 'string')
            return false;
        const trimmed = email.trim().toLowerCase();
        if (trimmed.length < users_js_1.USERS_VALIDATION.EMAIL.MIN_LENGTH ||
            trimmed.length > users_js_1.USERS_VALIDATION.EMAIL.MAX_LENGTH) {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
    }
    /**
     * Validates first name
     */
    static validateFirstName(firstName) {
        if (!firstName || typeof firstName !== 'string')
            return false;
        const trimmed = firstName.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.FIRST_NAME.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.FIRST_NAME.MAX_LENGTH);
    }
    /**
     * Validates last name
     */
    static validateLastName(lastName) {
        if (!lastName || typeof lastName !== 'string')
            return false;
        const trimmed = lastName.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.LAST_NAME.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.LAST_NAME.MAX_LENGTH);
    }
    /**
     * Validates phone number
     */
    static validatePhoneNumber(phoneNumber) {
        if (phoneNumber === null || phoneNumber === undefined)
            return true;
        if (typeof phoneNumber !== 'string')
            return false;
        const trimmed = phoneNumber.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.PHONE_NUMBER.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.PHONE_NUMBER.MAX_LENGTH);
    }
    /**
     * Validates employee code
     */
    static validateEmployeeCode(employeeCode) {
        if (employeeCode === null || employeeCode === undefined)
            return true;
        if (typeof employeeCode !== 'string')
            return false;
        const trimmed = employeeCode.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH);
    }
    /**
     * Validates PIN hash
     */
    static validatePinHash(pinHash) {
        if (pinHash === null || pinHash === undefined)
            return true;
        if (typeof pinHash !== 'string')
            return false;
        return users_js_1.USERS_VALIDATION.PIN.PATTERN.test(pinHash);
    }
    /**
     * Validates password hash
     */
    static validatePasswordHash(passwordHash) {
        if (passwordHash === null || passwordHash === undefined)
            return true;
        if (typeof passwordHash !== 'string')
            return false;
        return (passwordHash.length >= users_js_1.USERS_VALIDATION.PASSWORD.MIN_LENGTH &&
            passwordHash.length <= users_js_1.USERS_VALIDATION.PASSWORD.MAX_LENGTH &&
            users_js_1.USERS_VALIDATION.PASSWORD.PATTERN.test(passwordHash));
    }
    /**
     * Validates OTP token
     */
    static validateOtpToken(otpToken) {
        if (otpToken === null || otpToken === undefined)
            return true;
        if (typeof otpToken !== 'string')
            return false;
        const trimmed = otpToken.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.OTP_TOKEN.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.OTP_TOKEN.MAX_LENGTH);
    }
    /**
     * Validates OTP expiration date
     */
    static validateOtpExpiresAt(date) {
        if (date === null || date === undefined)
            return true;
        const expirationDate = new Date(date);
        return !isNaN(expirationDate.getTime());
    }
    /**
     * Validates QR code token
     */
    static validateQrCodeToken(qrToken) {
        if (qrToken === null || qrToken === undefined)
            return true;
        if (typeof qrToken !== 'string')
            return false;
        const trimmed = qrToken.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.QR_CODE_TOKEN.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.QR_CODE_TOKEN.MAX_LENGTH);
    }
    /**
     * Validates QR code expiration date
     */
    static validateQrCodeExpiresAt(date) {
        if (date === null || date === undefined)
            return true;
        const expirationDate = new Date(date);
        return !isNaN(expirationDate.getTime());
    }
    /**
     * Validates avatar URL
     */
    static validateAvatarUrl(avatarUrl) {
        if (avatarUrl === null || avatarUrl === undefined)
            return true;
        if (typeof avatarUrl !== 'string')
            return false;
        const trimmed = avatarUrl.trim();
        if (trimmed.length > users_js_1.USERS_VALIDATION.AVATAR_URL.MAX_LENGTH)
            return false;
        try {
            new URL(trimmed);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Validates hire date
     */
    static validateHireDate(date) {
        if (date === null || date === undefined)
            return true;
        const hireDate = new Date(date);
        if (isNaN(hireDate.getTime()))
            return false;
        // Hire date cannot be in the future
        return hireDate <= new Date();
    }
    /**
     * Validates department
     */
    static validateDepartment(department) {
        if (department === null || department === undefined)
            return true;
        if (typeof department !== 'string')
            return false;
        const trimmed = department.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.DEPARTMENT.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.DEPARTMENT.MAX_LENGTH);
    }
    /**
     * Validates job title
     */
    static validateJobTitle(jobTitle) {
        if (jobTitle === null || jobTitle === undefined)
            return true;
        if (typeof jobTitle !== 'string')
            return false;
        const trimmed = jobTitle.trim();
        return (trimmed.length >= users_js_1.USERS_VALIDATION.JOB_TITLE.MIN_LENGTH &&
            trimmed.length <= users_js_1.USERS_VALIDATION.JOB_TITLE.MAX_LENGTH);
    }
    /**
     * Validates active status
     */
    static validateActive(active) {
        return typeof active === 'boolean';
    }
    /**
     * Validates last login date
     */
    static validateLastLoginAt(date) {
        if (date === null || date === undefined)
            return true;
        const loginDate = new Date(date);
        return !isNaN(loginDate.getTime());
    }
    /**
     * Validates GUID
     */
    static validateGuid(guid) {
        if (!guid || typeof guid !== 'string')
            return false;
        // UUID v4 regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(guid);
    }
    /**
     * Validates OTP token expiration
     */
    static isOtpTokenExpired(expiresAt) {
        if (!expiresAt)
            return true;
        const expiration = new Date(expiresAt);
        return expiration <= new Date();
    }
    /**
     * Validates QR code token expiration
     */
    static isQrCodeTokenExpired(expiresAt) {
        if (!expiresAt)
            return true;
        const expiration = new Date(expiresAt);
        return expiration <= new Date();
    }
    /**
     * Checks if user has valid authentication method
     */
    static hasValidAuthMethod(passwordHash, pinHash) {
        return !!(passwordHash || pinHash);
    }
    /**
     * Cleans and normalizes user data
     */
    static cleanUserData(data) {
        const cleaned = Object.assign({}, data);
        // Clean string fields
        ['tenant', 'first_name', 'last_name', 'department', 'job_title'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = cleaned[field].toString().trim();
            }
        });
        // Clean and normalize email
        if (cleaned.email !== undefined && cleaned.email !== null) {
            cleaned.email = cleaned.email.toString().trim().toLowerCase();
        }
        // Clean optional string fields
        ['phone_number', 'employee_code', 'otp_token', 'qr_code_token', 'avatar_url'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = cleaned[field].toString().trim();
            }
        });
        // Convert dates
        ['hire_date', 'last_login_at', 'otp_expires_at', 'qr_code_expires_at'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                const date = new Date(cleaned[field]);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid ${field}: must be a valid date`);
                }
                cleaned[field] = date;
            }
        });
        // Convert boolean fields
        if (cleaned.active !== undefined) {
            cleaned.active = Boolean(cleaned.active);
        }
        return cleaned;
    }
    /**
     * Validates that a user is complete for creation
     */
    static isValidForCreation(data) {
        const requiredFields = ['tenant', 'first_name', 'last_name'];
        // Check required fields
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                return false;
            }
        }
        return (this.validateTenant(data.tenant) &&
            this.validateEmail(data.email) &&
            this.validateFirstName(data.first_name) &&
            this.validateLastName(data.last_name) &&
            this.validatePhoneNumber(data.phone_number) &&
            this.validateEmployeeCode(data.employee_code) &&
            this.validatePinHash(data.pin_hash) &&
            this.validatePasswordHash(data.password_hash) &&
            this.validateOtpToken(data.otp_token) &&
            this.validateOtpExpiresAt(data.otp_expires_at) &&
            this.validateQrCodeToken(data.qr_code_token) &&
            this.validateQrCodeExpiresAt(data.qr_code_expires_at) &&
            this.validateAvatarUrl(data.avatar_url) &&
            this.validateHireDate(data.hire_date) &&
            this.validateDepartment(data.department) &&
            this.validateJobTitle(data.job_title) &&
            this.validateLastLoginAt(data.last_login_at));
    }
    /**
     * Extracts validation errors for a user
     */
    static getValidationErrors(data) {
        const errors = [];
        if (!data.tenant || !this.validateTenant(data.tenant)) {
            errors.push(`Invalid tenant: must be 1-${users_js_1.USERS_VALIDATION.TENANT.MAX_LENGTH} characters`);
        }
        if (data.email !== undefined && !this.validateEmail(data.email)) {
            errors.push(`Invalid email: must be a valid email address, 1-${users_js_1.USERS_VALIDATION.EMAIL.MAX_LENGTH} characters`);
        }
        if (!data.first_name || !this.validateFirstName(data.first_name)) {
            errors.push(`Invalid first_name: must be 1-${users_js_1.USERS_VALIDATION.FIRST_NAME.MAX_LENGTH} characters`);
        }
        if (!data.last_name || !this.validateLastName(data.last_name)) {
            errors.push(`Invalid last_name: must be 1-${users_js_1.USERS_VALIDATION.LAST_NAME.MAX_LENGTH} characters`);
        }
        if (data.phone_number !== undefined && !this.validatePhoneNumber(data.phone_number)) {
            errors.push(`Invalid phone_number: must be ${users_js_1.USERS_VALIDATION.PHONE_NUMBER.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.PHONE_NUMBER.MAX_LENGTH} characters`);
        }
        if (data.employee_code !== undefined && !this.validateEmployeeCode(data.employee_code)) {
            errors.push(`Invalid employee_code: must be ${users_js_1.USERS_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH} characters`);
        }
        if (data.pin_hash !== undefined && !this.validatePinHash(data.pin_hash)) {
            errors.push('Invalid pin_hash: must match required pattern');
        }
        if (data.password_hash !== undefined && !this.validatePasswordHash(data.password_hash)) {
            errors.push(`Invalid password_hash: must be ${users_js_1.USERS_VALIDATION.PASSWORD.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.PASSWORD.MAX_LENGTH} characters and match pattern`);
        }
        if (data.otp_token !== undefined && !this.validateOtpToken(data.otp_token)) {
            errors.push(`Invalid otp_token: must be ${users_js_1.USERS_VALIDATION.OTP_TOKEN.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.OTP_TOKEN.MAX_LENGTH} characters`);
        }
        if (data.otp_expires_at !== undefined && !this.validateOtpExpiresAt(data.otp_expires_at)) {
            errors.push('Invalid otp_expires_at: must be a valid date');
        }
        if (data.qr_code_token !== undefined && !this.validateQrCodeToken(data.qr_code_token)) {
            errors.push(`Invalid qr_code_token: must be ${users_js_1.USERS_VALIDATION.QR_CODE_TOKEN.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.QR_CODE_TOKEN.MAX_LENGTH} characters`);
        }
        if (data.qr_code_expires_at !== undefined &&
            !this.validateQrCodeExpiresAt(data.qr_code_expires_at)) {
            errors.push('Invalid qr_code_expires_at: must be a valid date');
        }
        if (data.avatar_url !== undefined && !this.validateAvatarUrl(data.avatar_url)) {
            errors.push(`Invalid avatar_url: must be a valid URL, max ${users_js_1.USERS_VALIDATION.AVATAR_URL.MAX_LENGTH} characters`);
        }
        if (data.hire_date !== undefined && !this.validateHireDate(data.hire_date)) {
            errors.push('Invalid hire_date: must be a valid date not in the future');
        }
        if (data.department !== undefined && !this.validateDepartment(data.department)) {
            errors.push(`Invalid department: must be ${users_js_1.USERS_VALIDATION.DEPARTMENT.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.DEPARTMENT.MAX_LENGTH} characters`);
        }
        if (data.job_title !== undefined && !this.validateJobTitle(data.job_title)) {
            errors.push(`Invalid job_title: must be ${users_js_1.USERS_VALIDATION.JOB_TITLE.MIN_LENGTH}-${users_js_1.USERS_VALIDATION.JOB_TITLE.MAX_LENGTH} characters`);
        }
        if (data.active !== undefined && !this.validateActive(data.active)) {
            errors.push('Invalid active: must be a boolean value');
        }
        if (data.last_login_at !== undefined && !this.validateLastLoginAt(data.last_login_at)) {
            errors.push('Invalid last_login_at: must be a valid date');
        }
        if (data.guid !== undefined && !this.validateGuid(data.guid)) {
            errors.push('Invalid GUID: must be a valid UUID v4');
        }
        return errors;
    }
    /**
     * Validates filter data for searches
     */
    static validateFilterData(data) {
        return ((data.tenant && this.validateTenant(data.tenant)) ||
            (data.email && this.validateEmail(data.email)) ||
            (data.first_name && this.validateFirstName(data.first_name)) ||
            (data.last_name && this.validateLastName(data.last_name)) ||
            (data.phone_number && this.validatePhoneNumber(data.phone_number)) ||
            (data.employee_code && this.validateEmployeeCode(data.employee_code)) ||
            (data.department && this.validateDepartment(data.department)) ||
            (data.job_title && this.validateJobTitle(data.job_title)) ||
            (data.active !== undefined && this.validateActive(data.active)) ||
            (data.hire_date_from && !isNaN(new Date(data.hire_date_from).getTime())) ||
            (data.hire_date_to && !isNaN(new Date(data.hire_date_to).getTime())) ||
            (data.last_login_from && !isNaN(new Date(data.last_login_from).getTime())) ||
            (data.last_login_to && !isNaN(new Date(data.last_login_to).getTime())));
    }
    /**
     * Calculates days since last login
     */
    static calculateDaysSinceLastLogin(lastLoginAt) {
        if (!lastLoginAt)
            return -1;
        const login = new Date(lastLoginAt);
        const now = new Date();
        const diffTime = now.getTime() - login.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    /**
     * Calculates user age based on hire date
     */
    static calculateTenureInDays(hireDate) {
        if (!hireDate)
            return -1;
        const hire = new Date(hireDate);
        const now = new Date();
        const diffTime = now.getTime() - hire.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    /**
     * Checks if user needs password reset
     */
    static needsPasswordReset(lastLoginAt, maxDaysInactive = 90) {
        if (!lastLoginAt)
            return true;
        const daysSinceLogin = this.calculateDaysSinceLastLogin(lastLoginAt);
        return daysSinceLogin > maxDaysInactive;
    }
    /**
     * Checks if user has complete profile
     */
    static hasCompleteProfile(data) {
        const essentialFields = ['first_name', 'last_name', 'email', 'department', 'job_title'];
        return essentialFields.every((field) => data[field] && data[field].toString().trim().length > 0);
    }
    /**
     * Generates user display name
     */
    static generateDisplayName(firstName, lastName) {
        return `${firstName.trim()} ${lastName.trim()}`;
    }
    /**
     * Checks if user email is corporate
     */
    static isCorporateEmail(email, corporateDomains) {
        var _a;
        if (!email)
            return false;
        const domain = (_a = email.split('@')[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        return corporateDomains.some((corpDomain) => domain === corpDomain.toLowerCase());
    }
}
exports.UsersValidationUtils = UsersValidationUtils;
