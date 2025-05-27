// src/services/okxService.js
import axios from 'axios';
import { config } from '../config/index.js';
import { getOkxAuthHeaders } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

// Base client for the domain
const baseClient = axios.create({ baseURL: config.okx.apiDomain });

async function makeOkxRequest(method, fullRequestPathWithQuery, params = {}, body = null) {
    // fullRequestPathWithQuery is now the complete path like /api/v5/dex/aggregator/all-tokens?chainId=1
    // params are already incorporated into fullRequestPathWithQuery for GET, or not used in sign string for GET body.
    // For GET, params are used by axios for the actual request, but fullRequestPathWithQuery is used for signature.
    const bodyString = body ? JSON.stringify(body) : '';
    const headers = getOkxAuthHeaders(method, fullRequestPathWithQuery, bodyString);

    logger.debug(`Making OKX Request: ${method} ${config.okx.apiDomain}${fullRequestPathWithQuery}`);
    if (body) logger.debug('Body:', bodyString);

    try {
        let response;
        if (method === 'GET') {
            // Axios will append params to fullRequestPathWithQuery if fullRequestPathWithQuery doesn't already have them
            // To be safe, ensure fullRequestPathWithQuery for GET *includes* the query string.
            response = await baseClient.get(fullRequestPathWithQuery, { headers });
        } else if (method === 'POST') {
            response = await baseClient.post(fullRequestPathWithQuery, body, { headers });
        } else {
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        logger.debug(`OKX Response Status: ${response.status}`);
        // logger.debug(`OKX Response Data:`, JSON.stringify(response.data, null, 2));

        if (response.data.code !== "0") {
            throw new Error(`OKX API Error (code ${response.data.code}): ${response.data.msg || 'Unknown error'}`);
        }
        return response.data.data;
    } catch (error) {
        const errorUrl = `${config.okx.apiDomain}${fullRequestPathWithQuery}`;
        if (error.response) {
            logger.error(`OKX API Request Failed: ${error.message}`, {
                status: error.response.status,
                data: error.response.data,
                url: errorUrl
            });
            throw new Error(`OKX API Error: ${error.response.data?.msg || error.message} (Status: ${error.response.status})`);
        } else {
            logger.error(`OKX API Request Failed: ${error.message}`, { url: errorUrl });
            throw error;
        }
    }
}

function buildPathWithQuery(pathPrefix, endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return pathPrefix + endpoint + (queryString ? `?${queryString}` : '');
}

// --- Cross-Chain Endpoints ---
export async function getCrossChainSupportedChains() {
    const path = buildPathWithQuery(config.okx.crossChainPathPrefix, '/supported/chain');
    return makeOkxRequest('GET', path);
}

export async function getCrossChainQuotes(params) {
    // params: { fromChainId, toChainId, fromTokenAddress, toTokenAddress, amount, slippage (optional) }
    const path = buildPathWithQuery(config.okx.crossChainPathPrefix, '/quote', params);
    return makeOkxRequest('GET', path, params); // Pass params for axios to build the final URL
}

export async function buildCrossChainTransaction(params) {
    const path = buildPathWithQuery(config.okx.crossChainPathPrefix, '/build-tx', params);
    return makeOkxRequest('GET', path, params);
}

// --- Pre-Transaction Endpoints ---
export async function getPreTransactionSupportedChains() {
    const path = buildPathWithQuery(config.okx.preTransactionPathPrefix, '/supported/chain');
    return makeOkxRequest('GET', path);
}

export async function getGasPrice(chainId) {
    const params = { chainIndex: chainId };
    const path = buildPathWithQuery(config.okx.preTransactionPathPrefix, '/gas-price', params);
    return makeOkxRequest('GET', path, params);
}

export async function getGasLimit(params) {
    const path = buildPathWithQuery(config.okx.preTransactionPathPrefix, '/gas-limit', params);
    return makeOkxRequest('GET', path, params);
}

// --- Market Endpoints ---
export async function getMarketSupportedChains() {
    const path = buildPathWithQuery(config.okx.marketPathPrefix, '/supported/chain');
    return makeOkxRequest('GET', path);
}

export async function getMarketPrice(params) {
    const path = buildPathWithQuery(config.okx.marketPathPrefix, '/price', params);
    return makeOkxRequest('GET', path, params);
}

export async function getAllTokens(chainId) {
    const params = { chainId };
    const path = buildPathWithQuery(config.okx.aggregatorPathPrefix, '/all-tokens', params);
    return makeOkxRequest('GET', path, params);
}