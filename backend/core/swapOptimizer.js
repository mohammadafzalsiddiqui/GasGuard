// src/core/swapOptimizer.js
import {
    getCrossChainQuotes,
    getGasPrice,
    getMarketPrice, // Keep for potential future use with USD conversion
    getAllTokens
} from '../services/okxService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { toDecimal, toBaseUnit } from '../utils/helpers.js';


async function getTokenDecimals(chainId, tokenAddress) {
    try {
        const tokensOnChain = await getAllTokens(chainId);
        const tokenInfo = tokensOnChain.find(t => t.tokenContractAddress && t.tokenContractAddress.toLowerCase() === tokenAddress.toLowerCase());
        if (tokenInfo && typeof tokenInfo.decimals !== 'undefined' && tokenInfo.decimals !== null) {
            return parseInt(tokenInfo.decimals);
        }
        logger.warn(`Could not find decimals for token ${tokenAddress} on chain ${chainId}. Defaulting to 18.`);
        return 18;
    } catch (error) {
        logger.error(`Error fetching token list for decimals for chain ${chainId}: ${error.message}`);
        logger.warn(`Defaulting to 18 decimals for token ${tokenAddress} on chain ${chainId} due to error.`);
        return 18;
    }
}


export async function findBestSwapRoute(swapParams) {
    const { fromChainId, fromTokenAddress, fromTokenAmount, toChainId, toTokenAddress, slippage } = swapParams;
    logger.info(`Finding best swap route for: From ${fromTokenAmount} ${fromTokenAddress}(${fromChainId}) to ${toTokenAddress}(${toChainId}), Slippage: ${slippage || config.defaultSlippage || "0.5"}`);

    if (!fromChainId || !fromTokenAddress || !fromTokenAmount || !toChainId || !toTokenAddress) {
        throw new Error("Missing required swap parameters for findBestSwapRoute.");
    }

    const fromTokenDecimals = await getTokenDecimals(fromChainId, fromTokenAddress);
    const amountInBaseUnits = toBaseUnit(fromTokenAmount, fromTokenDecimals).toString();
    logger.info(`Input amount in base units (${fromTokenDecimals} dec): ${amountInBaseUnits}`);

    let quotesApiResult;
    const slippageToUse = slippage || config.defaultSlippage || "0.5";

    try {
        quotesApiResult = await getCrossChainQuotes({
            fromChainId,
            toChainId,
            fromTokenAddress,
            toTokenAddress,
            amount: amountInBaseUnits,
            slippage: slippageToUse,
        });
    } catch (error) {
        logger.error(`Failed to get cross-chain quotes: ${error.message}`);
        return { error: "Failed to get quotes", details: error.message, routes: [] };
    }

    if (!quotesApiResult || !Array.isArray(quotesApiResult) || quotesApiResult.length === 0) {
        logger.warn("No quote results returned from API or result is not an array.");
        return { message: "No quote results from API", routes: [] };
    }

    let currentGasPrice;
    try {
        const gasPriceResult = await getGasPrice(fromChainId);
        // logger.debug("Raw gasPriceResult from API:", JSON.stringify(gasPriceResult, null, 2)); // Kept for targeted debugging if needed

        if (!gasPriceResult || !Array.isArray(gasPriceResult) || gasPriceResult.length === 0) {
            throw new Error("Gas price API response is not a valid array or is empty.");
        }
        const gasInfo = gasPriceResult[0];
        if (gasInfo.supportEip1559 && gasInfo.eip1559Protocol && gasInfo.eip1559Protocol.baseFee) {
            const baseFee = BigInt(gasInfo.eip1559Protocol.baseFee);
            const priorityFeeValue = gasInfo.eip1559Protocol.safePriorityFee || gasInfo.eip1559Protocol.proposePriorityFee || "0";
            const priorityFee = BigInt(priorityFeeValue);
            currentGasPrice = baseFee + priorityFee;
            logger.info(`Using EIP-1559 gas price (base + priority): ${currentGasPrice}`);
        } else if (gasInfo.normal) {
            currentGasPrice = BigInt(gasInfo.normal);
            logger.info(`Using legacy 'normal' gas price: ${currentGasPrice}`);
        } else {
            throw new Error("Could not determine gas price from API response ('normal' or EIP-1559 data missing).");
        }
        if (currentGasPrice <= 0) {
             throw new Error(`Calculated gas price (${currentGasPrice}) is not valid (zero or negative).`);
        }
    } catch (error) {
        logger.error(`Failed to get or process gas price for chain ${fromChainId}: ${error.message}`);
        return { error: "Failed to get or process gas price", details: error.message, routes: [] };
    }

    logger.warn("USD price fetching for tokens is simplified/skipped for this version. Net value comparisons are approximate.");

    const processedRoutes = [];
    for (const quoteResponseObject of quotesApiResult) {
        // logger.debug("Processing Quote Response Object:", JSON.stringify(quoteResponseObject, (key,value) => typeof value === 'bigint' ? value.toString() : value, 2));
        if (!quoteResponseObject.routerList || !Array.isArray(quoteResponseObject.routerList) || quoteResponseObject.routerList.length === 0) {
            logger.warn("Quote response object missing routerList or it's empty. Skipping.");
            continue;
        }

        for (const routerListItem of quoteResponseObject.routerList) {
            // logger.debug("Processing routerListItem:", JSON.stringify(routerListItem, (key,value) => typeof value === 'bigint' ? value.toString() : value, 2));
            if (routerListItem.toTokenAmount === undefined || routerListItem.toTokenAmount === null) {
                logger.warn(`Router list item for ${routerListItem.router?.bridgeName || 'Unknown bridge'} missing toTokenAmount. Skipping.`);
                continue;
            }

            const toTokenDecimals = await getTokenDecimals(quoteResponseObject.toChainId, quoteResponseObject.toToken.tokenContractAddress);
            const outputAmountDecimal = toDecimal(routerListItem.toTokenAmount, toTokenDecimals);
            const sourceChainNativeDecimals = config.chainDetails[quoteResponseObject.fromChainId]?.nativeDecimals || 18;

            let gasCostForRouteDecimal;
            let gasCostSourceDescription;
            let gasCostRaw; // To store the raw gas cost value (string)

            if (routerListItem.fromChainNetworkFee && BigInt(routerListItem.fromChainNetworkFee) > 0) {
                gasCostRaw = routerListItem.fromChainNetworkFee;
                gasCostForRouteDecimal = Number(toDecimal(gasCostRaw, sourceChainNativeDecimals));
                gasCostSourceDescription = "API Provided (fromChainNetworkFee)";
            } else {
                const gasLimitFromRoute = routerListItem.estimateGasFee;
                const gasLimit = BigInt(gasLimitFromRoute || config.defaultGasLimits[quoteResponseObject.fromChainId] || config.defaultGasLimits['1']);
                const calculatedGasCostRaw = gasLimit * currentGasPrice;
                gasCostRaw = calculatedGasCostRaw.toString();
                gasCostForRouteDecimal = Number(toDecimal(gasCostRaw, sourceChainNativeDecimals));
                gasCostSourceDescription = "Calculated (gasLimit * gasPrice)";
            }
            logger.info(`Route: ${routerListItem.router?.bridgeName || 'Unknown'}, Output: ${outputAmountDecimal.toFixed(6)}, Gas Cost (${gasCostSourceDescription}): ${gasCostForRouteDecimal.toFixed(8)} ${config.chainDetails[fromChainId]?.nativeSymbol || 'Native'}`);

            processedRoutes.push({
                bridgeName: routerListItem.router?.bridgeName || 'Unknown Bridge',
                bridgeId: routerListItem.router?.bridgeId,
                outputAmountRaw: routerListItem.toTokenAmount,
                outputAmountDecimal: Number(outputAmountDecimal),
                gasPriceRaw: currentGasPrice.toString(),
                estimatedGasLimitFromRoute: routerListItem.estimateGasFee, // The limit from API
                gasCostFinalDecimal: gasCostForRouteDecimal,
                gasCostFinalRaw: gasCostRaw, // Store the chosen raw gas cost
                gasCostSource: gasCostSourceDescription,
                sortKey: Number(outputAmountDecimal) - gasCostForRouteDecimal, // Tentative: better with USD
                routeDetails: routerListItem
            });
        }
    }

    processedRoutes.sort((a, b) => {
        const sortKeyA = a.sortKey !== undefined ? a.sortKey : -Infinity;
        const sortKeyB = b.sortKey !== undefined ? b.sortKey : -Infinity;
        return sortKeyB - sortKeyA; // Higher sortKey (better net tentative value) comes first
    });

    logger.info(`Processed ${processedRoutes.length} routes.`);
    if (processedRoutes.length > 0) {
        logger.info(`Best route found via ${processedRoutes[0].bridgeName}: Output ${processedRoutes[0].outputAmountDecimal.toFixed(6)}, Gas Cost ${processedRoutes[0].gasCostFinalDecimal.toFixed(8)}`);
    }

    return {
        message: processedRoutes.length > 0 ? "Routes processed" : "No viable routes after processing",
        bestRoute: processedRoutes.length > 0 ? processedRoutes[0] : null,
        allRoutes: processedRoutes,
        paramsUsed: { ...swapParams, amountInBaseUnits, slippage: slippageToUse }
    };
}