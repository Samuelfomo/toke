"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentTransactionValidationUtils = void 0;
// utils/payment.transaction.validation.ts
const payment_transaction_js_1 = require("../constants/payment.transaction.js");
class PaymentTransactionValidationUtils {
    /**
     * Validates billing cycle ID
     */
    static validateBillingCycle(billingCycle) {
        if (!billingCycle || typeof billingCycle !== 'number')
            return false;
        return (Number.isInteger(billingCycle) &&
            billingCycle >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MIN_VALUE &&
            billingCycle <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MAX_VALUE);
    }
    /**
     * Validates adjustment ID
     */
    static validateAdjustment(adjustment) {
        if (!adjustment || typeof adjustment !== 'number')
            return false;
        return (Number.isInteger(adjustment) &&
            adjustment >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MIN_VALUE &&
            adjustment <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MAX_VALUE);
    }
    /**
     * Validates amount in USD
     */
    static validateAmountUsd(amount) {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return (!isNaN(numAmount) &&
            numAmount >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MIN_VALUE &&
            numAmount <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MAX_VALUE);
    }
    /**
     * Validates amount in local currency
     */
    static validateAmountLocal(amount) {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return (!isNaN(numAmount) &&
            numAmount >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MIN_VALUE &&
            numAmount <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MAX_VALUE);
    }
    /**
     * Validates currency code
     */
    static validateCurrencyCode(code) {
        if (!code || typeof code !== 'string')
            return false;
        const upperCode = code.trim().toUpperCase();
        return (upperCode.length === payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.LENGTH &&
            payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.PATTERN.test(upperCode));
    }
    /**
     * Validates exchange rate
     */
    static validateExchangeRate(rate) {
        const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
        return (!isNaN(numRate) &&
            numRate >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MIN_VALUE &&
            numRate <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MAX_VALUE);
    }
    /**
     * Validates payment method ID
     */
    static validatePaymentMethod(paymentMethod) {
        if (!paymentMethod || typeof paymentMethod !== 'number')
            return false;
        return (Number.isInteger(paymentMethod) &&
            paymentMethod >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MIN_VALUE &&
            paymentMethod <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MAX_VALUE);
    }
    /**
     * Validates payment reference
     */
    static validatePaymentReference(reference) {
        if (!reference || typeof reference !== 'string')
            return false;
        const trimmed = reference.trim();
        return (trimmed.length >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MIN_LENGTH &&
            trimmed.length <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MAX_LENGTH &&
            trimmed !== '');
    }
    /**
     * Validates transaction status
     */
    static validateTransactionStatus(status) {
        return Object.values(payment_transaction_js_1.PaymentTransactionStatus).includes(status);
    }
    /**
     * Validates failure reason
     */
    static validateFailureReason(reason) {
        if (!reason)
            return true; // Optional field
        if (typeof reason !== 'string')
            return false;
        const trimmed = reason.trim();
        return (trimmed.length >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MIN_LENGTH &&
            trimmed.length <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MAX_LENGTH);
    }
    /**
     * Validates GUID
     */
    static validateGuid(guid) {
        const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
        return (Number.isInteger(numGuid) &&
            numGuid >= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.GUID.MIN_VALUE &&
            numGuid <= payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.GUID.MAX_VALUE);
    }
    /**
     * Validates date
     */
    static validateDate(date) {
        if (!date)
            return false;
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }
    /**
     * Validates amount consistency (USD * exchange_rate ≈ local)
     */
    static validateAmountConsistency(amountUsd, exchangeRate, amountLocal) {
        const calculatedLocal = amountUsd * exchangeRate;
        const tolerance = payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE;
        return Math.abs(calculatedLocal - amountLocal) <= tolerance;
    }
    /**
     * Validates date sequence (completion/failure after initiation)
     */
    static validateDateSequence(initiatedAt, completedOrFailedAt) {
        return completedOrFailedAt.getTime() >= initiatedAt.getTime();
    }
    /**
     * Validates status transition
     */
    static validateStatusTransition(newStatus) {
        return Object.values(payment_transaction_js_1.PaymentTransactionStatus).includes(newStatus);
    }
    /**
     * Validates transaction for business rules
     */
    static validateTransactionBusinessRules(transaction, paymentMethod, billingCycle, adjustment) {
        const errors = [];
        // Check payment method compatibility
        if (paymentMethod) {
            if (!paymentMethod.active) {
                errors.push('Payment method is not active');
            }
            // Check currency support
            if (paymentMethod.supported_currencies &&
                !paymentMethod.supported_currencies.includes(transaction.currency_code)) {
                errors.push(`Currency ${transaction.currency_code} is not supported by this payment method`);
            }
            // Check amount limits
            if (transaction.amount_usd < paymentMethod.min_amount_usd) {
                errors.push(`Amount ${transaction.amount_usd} USD is below minimum limit of ${paymentMethod.min_amount_usd} USD`);
            }
            if (paymentMethod.max_amount_usd && transaction.amount_usd > paymentMethod.max_amount_usd) {
                errors.push(`Amount ${transaction.amount_usd} USD exceeds maximum limit of ${paymentMethod.max_amount_usd} USD`);
            }
        }
        // Check billing cycle consistency
        if (billingCycle && adjustment) {
            if (billingCycle.id !== adjustment.billing_cycle_id) {
                errors.push('Transaction billing cycle does not match adjustment billing cycle');
            }
        }
        // Check amount consistency
        if (!this.validateAmountConsistency(transaction.amount_usd, transaction.exchange_rate_used, transaction.amount_local)) {
            errors.push('Amount consistency error: USD amount * exchange rate must equal local amount');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Calculates expected local amount based on USD and exchange rate
     */
    static calculateExpectedLocalAmount(amountUsd, exchangeRate) {
        return Math.round(amountUsd * exchangeRate * 100) / 100; // Round to 2 decimal places
    }
    /**
     * Calculates processing duration in milliseconds
     */
    static calculateProcessingDuration(initiatedAt, completedOrFailedAt) {
        if (!completedOrFailedAt)
            return null;
        return completedOrFailedAt.getTime() - initiatedAt.getTime();
    }
    /**
     * Formats processing duration to human readable format
     */
    static formatProcessingDuration(durationMs) {
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    /**
     * Cleans and normalizes transaction data
     */
    static cleanTransactionData(data) {
        const cleaned = Object.assign({}, data);
        // Clean billing cycle
        if (cleaned.billing_cycle !== undefined) {
            cleaned.billing_cycle = parseInt(cleaned.billing_cycle.toString().trim());
            if (isNaN(cleaned.billing_cycle)) {
                throw new Error('Invalid billing_cycle: must be a valid integer');
            }
        }
        // Clean adjustment
        if (cleaned.adjustment !== undefined) {
            cleaned.adjustment = parseInt(cleaned.adjustment.toString().trim());
            if (isNaN(cleaned.adjustment)) {
                throw new Error('Invalid adjustment: must be a valid integer');
            }
        }
        // Clean amount USD
        if (cleaned.amount_usd !== undefined) {
            cleaned.amount_usd = parseFloat(cleaned.amount_usd.toString());
            if (isNaN(cleaned.amount_usd)) {
                throw new Error('Invalid amount_usd: must be a valid number');
            }
            cleaned.amount_usd = Math.round(cleaned.amount_usd * 100) / 100; // Round to 2 decimal places
        }
        // Clean amount local
        if (cleaned.amount_local !== undefined) {
            cleaned.amount_local = parseFloat(cleaned.amount_local.toString());
            if (isNaN(cleaned.amount_local)) {
                throw new Error('Invalid amount_local: must be a valid number');
            }
            cleaned.amount_local = Math.round(cleaned.amount_local * 100) / 100; // Round to 2 decimal places
        }
        // Clean currency code
        if (cleaned.currency_code !== undefined) {
            cleaned.currency_code = cleaned.currency_code.toString().trim().toUpperCase();
        }
        // Clean exchange rate
        if (cleaned.exchange_rate_used !== undefined) {
            cleaned.exchange_rate_used = parseFloat(cleaned.exchange_rate_used.toString());
            if (isNaN(cleaned.exchange_rate_used)) {
                throw new Error('Invalid exchange_rate_used: must be a valid number');
            }
            cleaned.exchange_rate_used = Math.round(cleaned.exchange_rate_used * 1000000) / 1000000; // Round to 6 decimal places
        }
        // Clean payment method
        if (cleaned.payment_method !== undefined) {
            cleaned.payment_method = parseInt(cleaned.payment_method.toString().trim());
            if (isNaN(cleaned.payment_method)) {
                throw new Error('Invalid payment_method: must be a valid integer');
            }
        }
        // Clean payment reference
        if (cleaned.payment_reference !== undefined) {
            cleaned.payment_reference = cleaned.payment_reference.toString().trim();
        }
        // Clean transaction status
        if (cleaned.transaction_status !== undefined) {
            cleaned.transaction_status = cleaned.transaction_status.toString().trim().toUpperCase();
        }
        // Clean failure reason
        if (cleaned.failure_reason !== undefined) {
            cleaned.failure_reason = cleaned.failure_reason.toString().trim();
        }
        // Clean GUID
        if (cleaned.guid !== undefined) {
            cleaned.guid = parseInt(cleaned.guid.toString());
            if (isNaN(cleaned.guid)) {
                throw new Error('Invalid GUID: must be a valid 6-digit number');
            }
        }
        // Clean dates
        ['initiated_at', 'completed_at', 'failed_at'].forEach((dateField) => {
            if (cleaned[dateField] !== undefined) {
                cleaned[dateField] = new Date(cleaned[dateField]);
                if (isNaN(cleaned[dateField].getTime())) {
                    throw new Error(`Invalid ${dateField}: must be a valid date`);
                }
            }
        });
        return cleaned;
    }
    /**
     * Validates that a transaction is complete for creation
     */
    static isValidForCreation(data) {
        const requiredFields = [
            'billing_cycle',
            'adjustment',
            'amount_usd',
            'amount_local',
            'currency_code',
            'exchange_rate_used',
            'payment_method',
            'payment_reference',
        ];
        // Check required fields
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                return false;
            }
        }
        return (this.validateBillingCycle(data.billing_cycle) &&
            this.validateAdjustment(data.adjustment) &&
            this.validateAmountUsd(data.amount_usd) &&
            this.validateAmountLocal(data.amount_local) &&
            this.validateCurrencyCode(data.currency_code) &&
            this.validateExchangeRate(data.exchange_rate_used) &&
            this.validatePaymentMethod(data.payment_method) &&
            this.validatePaymentReference(data.payment_reference) &&
            this.validateAmountConsistency(data.amount_usd, data.exchange_rate_used, data.amount_local) &&
            (data.transaction_status === undefined ||
                this.validateTransactionStatus(data.transaction_status)) &&
            (data.failure_reason === undefined || this.validateFailureReason(data.failure_reason)));
    }
    /**
     * Extracts validation errors for a transaction
     */
    static getValidationErrors(data) {
        const errors = [];
        if (!data.billing_cycle || !this.validateBillingCycle(data.billing_cycle)) {
            errors.push(`Invalid billing_cycle: must be an integer between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MAX_VALUE}`);
        }
        if (!data.adjustment || !this.validateAdjustment(data.adjustment)) {
            errors.push(`Invalid adjustment: must be an integer between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MAX_VALUE}`);
        }
        if (data.amount_usd === undefined || !this.validateAmountUsd(data.amount_usd)) {
            errors.push(`Invalid amount_usd: must be between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MAX_VALUE}`);
        }
        if (data.amount_local === undefined || !this.validateAmountLocal(data.amount_local)) {
            errors.push(`Invalid amount_local: must be between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`);
        }
        if (!data.currency_code || !this.validateCurrencyCode(data.currency_code)) {
            errors.push('Invalid currency_code: must be a valid 3-letter ISO 4217 currency code');
        }
        if (data.exchange_rate_used === undefined ||
            !this.validateExchangeRate(data.exchange_rate_used)) {
            errors.push(`Invalid exchange_rate_used: must be between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`);
        }
        if (!data.payment_method || !this.validatePaymentMethod(data.payment_method)) {
            errors.push(`Invalid payment_method: must be an integer between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MIN_VALUE} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MAX_VALUE}`);
        }
        if (!data.payment_reference || !this.validatePaymentReference(data.payment_reference)) {
            errors.push(`Invalid payment_reference: must be between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MIN_LENGTH} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MAX_LENGTH} characters`);
        }
        if (data.transaction_status !== undefined &&
            !this.validateTransactionStatus(data.transaction_status)) {
            errors.push('Invalid transaction_status: must be one of PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED');
        }
        if (data.failure_reason !== undefined && !this.validateFailureReason(data.failure_reason)) {
            errors.push(`Invalid failure_reason: must be between ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MIN_LENGTH} and ${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MAX_LENGTH} characters`);
        }
        if (data.guid !== undefined && !this.validateGuid(data.guid)) {
            errors.push('Invalid GUID: must be a 6-digit integer between 100000 and 999999');
        }
        // Check amount consistency
        if (data.amount_usd !== undefined &&
            data.exchange_rate_used !== undefined &&
            data.amount_local !== undefined) {
            if (!this.validateAmountConsistency(data.amount_usd, data.exchange_rate_used, data.amount_local)) {
                errors.push(`Amount consistency error: amount_usd * exchange_rate_used must equal amount_local (tolerance: ±${payment_transaction_js_1.PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE})`);
            }
        }
        // Check date sequences
        if (data.initiated_at && data.completed_at) {
            if (!this.validateDateSequence(new Date(data.initiated_at), new Date(data.completed_at))) {
                errors.push('Invalid date sequence: completed_at must be after initiated_at');
            }
        }
        if (data.initiated_at && data.failed_at) {
            if (!this.validateDateSequence(new Date(data.initiated_at), new Date(data.failed_at))) {
                errors.push('Invalid date sequence: failed_at must be after initiated_at');
            }
        }
        // Check failure reason requirement for FAILED status
        if (data.transaction_status === payment_transaction_js_1.PaymentTransactionStatus.FAILED) {
            if (!data.failure_reason || data.failure_reason.trim().length === 0) {
                errors.push('failure_reason is required when transaction_status is FAILED');
            }
        }
        return errors;
    }
    /**
     * Validates filter data for transaction searches
     */
    static validateFilterData(filters) {
        const validFilters = [
            'billing_cycle',
            'adjustment',
            'payment_method',
            'currency_code',
            'transaction_status',
            'payment_reference',
            'min_amount_usd',
            'max_amount_usd',
            'min_amount_local',
            'max_amount_local',
            'initiated_after',
            'initiated_before',
            'completed_after',
            'completed_before',
            'failed_after',
            'failed_before',
        ];
        // Check if at least one valid filter is provided
        return validFilters.some((filter) => filters[filter] !== undefined);
    }
    /**
     * Normalizes payment reference for search
     */
    static normalizePaymentReference(reference) {
        if (!this.validatePaymentReference(reference)) {
            throw new Error('Invalid payment reference for normalization');
        }
        return reference.trim();
    }
    /**
     * Normalizes currency code for search
     */
    static normalizeCurrencyCode(code) {
        if (!this.validateCurrencyCode(code)) {
            throw new Error('Invalid currency code for normalization');
        }
        return code.trim().toUpperCase();
    }
    /**
     * Gets recommended actions for a transaction based on its current state
     */
    static getRecommendedActions(transaction) {
        const status = transaction.transaction_status || transaction.status;
        const actions = [];
        if (status === payment_transaction_js_1.PaymentTransactionStatus.PENDING) {
            actions.push('start_processing', 'cancel');
        }
        else if (status === payment_transaction_js_1.PaymentTransactionStatus.PROCESSING) {
            actions.push('complete', 'fail', 'cancel');
        }
        else if (status === payment_transaction_js_1.PaymentTransactionStatus.COMPLETED) {
            actions.push('refund');
        }
        return actions;
    }
}
exports.PaymentTransactionValidationUtils = PaymentTransactionValidationUtils;
