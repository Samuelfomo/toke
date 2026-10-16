"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentAttemptError = exports.ATTEMPT_STATUSES = void 0;
exports.guid = guid;
exports.normalizeAttempt = normalizeAttempt;
exports.wholeXaf = wholeXaf;
exports.canTransition = canTransition;
exports.providerFor = providerFor;
exports.ATTEMPT_STATUSES = [
    'CREATED',
    'UNKNOWN',
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
];
class PaymentAttemptError extends Error {
    constructor(message, status = 409) {
        super(message);
        this.status = status;
    }
}
exports.PaymentAttemptError = PaymentAttemptError;
function guid(value) {
    if (!Number.isInteger(value) || Number(value) < 100000 || Number(value) > 999999)
        throw new PaymentAttemptError('Invalid public GUID', 400);
    return Number(value);
}
function normalizeAttempt(i) {
    var _a;
    guid(i.tenantGuid);
    guid(i.transactionGuid);
    if (!['TEST', 'LIVE'].includes(i.environment))
        throw new PaymentAttemptError('Invalid payment environment', 400);
    const phone = String((_a = i.phoneNumber) !== null && _a !== void 0 ? _a : '')
        .trim()
        .replace(/^\+/, '');
    if (!/^2376\d{8}$/.test(phone))
        throw new PaymentAttemptError('Expected Cameroon international phone number', 400);
    if (typeof i.idempotencyKey !== 'string' || !/^[A-Za-z0-9_:-]{8,128}$/.test(i.idempotencyKey))
        throw new PaymentAttemptError('Invalid idempotency key', 400);
    return Object.assign(Object.assign({}, i), { phoneNumber: phone });
}
function wholeXaf(v) {
    const text = String(v);
    if (!/^\d{1,10}(?:\.0{1,2})?$/.test(text) || BigInt(text.split('.')[0]) <= 0n)
        throw new PaymentAttemptError('XAF payment requires a positive integer amount; invoice reconciliation required');
    return BigInt(text.split('.')[0]).toString();
}
function canTransition(from, to) {
    if (!exports.ATTEMPT_STATUSES.includes(from) || !exports.ATTEMPT_STATUSES.includes(to))
        return false;
    if (from === to)
        return true;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(from))
        return false;
    if (from === 'PROCESSING' && ['CREATED', 'PENDING'].includes(to))
        return false;
    return to !== 'CREATED';
}
function providerFor(code) {
    if (code === 'MTN_MOMO')
        return 'MTN_MOMO_CMR';
    if (code === 'ORANGE_MONEY')
        return 'ORANGE_CMR';
    throw new PaymentAttemptError('Unsupported payment method');
}
