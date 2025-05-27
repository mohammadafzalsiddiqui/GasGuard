// src/server.js
import express from 'express';
import { findBestSwapRoute } from './core/swapOptimizer.js'; // Your core logic
import { logger } from './utils/logger.js';
import { config } from './config/index.js'; // For port or other server configs

const app = express();
const PORT = process.env.PORT || 3001; // Use environment variable or default

app.use(express.json()); // Middleware to parse JSON request bodies

// --- API Endpoint ---
app.post('/api/v1/gasguard/find-best-route', async (req, res) => {
    const swapParams = req.body;
    logger.info(`API Call to /find-best-route with params:`, swapParams);

    // Basic validation for required parameters
    if (!swapParams.fromChainId || !swapParams.fromTokenAddress || !swapParams.fromTokenAmount ||
        !swapParams.toChainId || !swapParams.toTokenAddress) {
        logger.warn("API Call /find-best-route: Missing required parameters.");
        return res.status(400).json({
            error: "Missing required parameters",
            message: "Please provide fromChainId, fromTokenAddress, fromTokenAmount, toChainId, and toTokenAddress."
        });
    }
    // Slippage can use default from config if not provided by client
    if (!swapParams.slippage) {
        swapParams.slippage = config.defaultSlippage || "0.5";
        logger.info(`API Call /find-best-route: Slippage not provided, using default: ${swapParams.slippage}`);
    }


    try {
        const result = await findBestSwapRoute(swapParams);

        if (result.error) {
            // You might want to map specific backend errors to different HTTP status codes
            logger.error(`API Call /find-best-route: Error from swapOptimizer - ${result.details || result.error}`);
            return res.status(500).json(result); // Or be more specific, e.g., 404 if no routes
        }
        if (!result.bestRoute && result.allRoutes && result.allRoutes.length === 0) {
            logger.info("API Call /find-best-route: No routes found for the given parameters.");
            return res.status(404).json({
                message: "No routes found for the specified swap parameters.",
                details: result.message, // Contains "No quote results from API" or similar
                paramsUsed: result.paramsUsed
            });
        }

        logger.info("API Call /find-best-route: Successfully processed request.");
        return res.status(200).json(result);

    } catch (error) {
        logger.error("API Call /find-best-route: Unexpected server error -", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
});

// Basic root endpoint for health check or info
app.get('/', (req, res) => {
    res.send('GasGuard Swap Optimizer Backend is running!');
});

app.listen(PORT, () => {
    logger.info(` GasGuard Swap Optimizer Backend listening on http://localhost:${PORT} `);
});