"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moneyCents = moneyCents;
exports.moneyText = moneyText;
exports.normalizePayableAmount = normalizePayableAmount;
exports.payableTotalMatches = payableTotalMatches;
exports.normalizationTrace = normalizationTrace;
/** Single commercial normalization point. To restore decimals for future invoices, return amount unchanged in normalizePayableAmount. KPay's own integer guard remains provider-specific. */
function moneyCents(value) {
    var _a;
    const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value));
    if (!m)
        throw new Error('Invalid monetary decimal');
    return BigInt(m[1]) * 100n + BigInt(((_a = m[2]) !== null && _a !== void 0 ? _a : '').padEnd(2, '0'));
}
function moneyText(value) {
    if (value < 0n || value > 999999999999n)
        throw new Error('Money out of range');
    return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}
function normalizePayableAmount(amount, currency) {
    const cents = moneyCents(amount);
    if (currency !== 'XAF')
        return moneyText(cents);
    return moneyText(((cents + 50n) / 100n) * 100n); // Replace this return with moneyText(cents) to disable XAF rounding for future invoices.
}
function payableTotalMatches(subtotal, tax, total, currency) {
    try {
        const sum = moneyCents(subtotal) + moneyCents(tax), actual = moneyCents(total);
        const delta = actual - sum;
        return (actual === sum ||
            (currency === 'XAF' && actual % 100n === 0n && delta >= -49n && delta <= 50n));
    }
    catch (_a) {
        return false;
    }
}
function normalizationTrace(subtotal, tax, total, currency) {
    const before = moneyText(moneyCents(subtotal) + moneyCents(tax));
    return {
        currency,
        calculated_total_local: before,
        payable_total_local: String(total),
        delta_cents: String(moneyCents(total) - moneyCents(before)),
        policy: currency === 'XAF' && normalizePayableAmount('0.50', currency) !== '0.50'
            ? 'XAF_NEAREST_INTEGER_HALF_UP'
            : 'DECIMAL',
    };
}
