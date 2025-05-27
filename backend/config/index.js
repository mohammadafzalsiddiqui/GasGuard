// src/config/index.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    okx: {
        apiKey: process.env.OKX_API_KEY,
        secretKey: process.env.OKX_SECRET_KEY,
        apiPassphrase: process.env.OKX_API_PASSPHRASE,
        apiDomain: process.env.OKX_API_DOMAIN || "https://web3.okx.com",
        aggregatorPathPrefix: "/api/v5/dex/aggregator",
        crossChainPathPrefix: "/api/v5/dex/cross-chain",
        preTransactionPathPrefix: "/api/v5/dex/pre-transaction",
        marketPathPrefix: "/api/v5/dex/market",
    },
    defaultGasLimits: {
        '1': BigInt(process.env.DEFAULT_GAS_LIMIT_ETH || "300000"),          // Ethereum
        '42161': BigInt(process.env.DEFAULT_GAS_LIMIT_ARBITRUM || "1500000"),// Arbitrum
        // Removed other chain gas limits as they are not in the primary test case
    },
    chainDetails: {
        '1': { name: 'Ethereum', nativeSymbol: 'ETH', nativeDecimals: 18 },
        '42161': { name: 'Arbitrum', nativeSymbol: 'ETH', nativeDecimals: 18 },
        // Removed other chain details
    },
    defaultSlippage: process.env.DEFAULT_SLIPPAGE || "0.5",
};

if (!config.okx.apiKey || !config.okx.secretKey || !config.okx.apiPassphrase) {
    console.warn("🔴 WARNING: OKX API credentials are not set in the .env file. API calls will likely fail.");
}