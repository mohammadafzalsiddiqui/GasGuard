import crypto from 'crypto'; // Standard Node.js crypto module
import { config } from '../config/index.js';

/**
 * Generates the required OKX API headers for authentication.
 * @param {string} method - HTTP method (e.g., 'GET', 'POST')
 * @param {string} fullRequestPathWithQuery - The full request path including query string (e.g., '/api/v5/dex/quote?param=value')
 * @param {string} body - The request body (stringified JSON, or empty string for GET)
 * @returns {object} Headers object
 */
export function getOkxAuthHeaders(method, fullRequestPathWithQuery, body = '') {
    const timestamp = new Date().toISOString();
    // This is the string to sign
    const message = timestamp + method.toUpperCase() + fullRequestPathWithQuery + body;
    // console.log("OKX String-to-sign:", message); // Uncomment for debugging signature issues

    const signature = crypto
        .createHmac('sha256', config.okx.secretKey)
        .update(message)
        .digest('base64');

    return {
        'OK-ACCESS-KEY': config.okx.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': config.okx.apiPassphrase,
        'Content-Type': 'application/json',
    };
}

// Helper to convert token amounts from smallest unit to decimal
// (You'll need token decimal info from OKX API or a hardcoded list)
// src/utils/helpers.js
import { logger } from '../utils/logger.js'; // Make sure logger is imported if you use it here

export function toDecimal(amount, decimals) {
    if (amount === undefined || amount === null) {
        logger.warn(`toDecimal: input 'amount' is undefined or null. Returning 0.`);
        return 0; // Or handle as an error, or return NaN, depending on desired behavior
    }
    if (decimals === undefined || decimals === null || isNaN(parseInt(decimals))) {
        logger.warn(`toDecimal: Decimals not provided or invalid for amount ${amount}. Amount type: ${typeof amount}. Defaulting to interpreting amount as base units with 0 decimal shift.`);
        // If amount is already a BigInt string, convert, otherwise try to parse
        try {
            return Number(BigInt(amount)); // Treat as if it has 0 decimals to shift
        } catch (e) {
            logger.error(`toDecimal: Failed to convert amount "${amount}" to BigInt when decimals are missing. Error: ${e.message}`);
            return 0; // Fallback
        }
    }
    try {
        return Number(BigInt(amount)) / (10 ** Number(decimals));
    } catch (e) {
        logger.error(`toDecimal: Failed to convert amount "${amount}" with decimals "${decimals}". Error: ${e.message}`);
        return 0; // Fallback
    }
}

export function toBaseUnit(amount, decimals) {
    if (amount === undefined || amount === null) {
        logger.warn(`toBaseUnit: input 'amount' is undefined or null. Returning BigInt(0).`);
        return BigInt(0);
    }
    if (decimals === undefined || decimals === null || isNaN(parseInt(decimals))) {
        logger.warn(`toBaseUnit: Decimals not provided or invalid for amount ${amount}. Assuming amount is already in base units or an error state.`);
        try {
            // Attempt to round if it's a number, then convert to BigInt
            return BigInt(Math.round(Number(amount)));
        } catch (e) {
            logger.error(`toBaseUnit: Failed to convert amount "${amount}" to BigInt when decimals are missing. Error: ${e.message}`);
            return BigInt(0); // Fallback
        }
    }
    try {
        // If amount is already a string representation of a float, Number() will handle it.
        return BigInt(Math.round(Number(amount) * (10 ** Number(decimals))));
    } catch (e) {
        logger.error(`toBaseUnit: Failed to convert amount "${amount}" with decimals "${decimals}". Error: ${e.message}`);
        return BigInt(0); // Fallback
    }
}