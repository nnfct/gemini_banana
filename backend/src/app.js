import express from 'express';
import bodyParser from 'body-parser';
import config, { validateConfig } from './utils/config.js';
import corsMiddleware from './middleware/cors.js';
import { errorHandler, notFoundHandler, requestTimeout } from './middleware/error.js';
import { sanitizeRequestBody } from './middleware/validation.js';
import { createRouter } from './routes/index.js';

/**
 * Creates and configures the Express application
 * @returns {express.Application} Configured Express app
 */
export async function createApp() {
    // Validate configuration before starting
    validateConfig();

    const app = express();

    // Trust proxy for proper IP handling behind load balancers
    app.set('trust proxy', 1);

    // Request timeout middleware
    app.use(requestTimeout(30000));

    // CORS middleware
    app.use(corsMiddleware);

    // Body parsing middleware
    app.use(bodyParser.json({
        limit: config.upload.maxSize,
        type: 'application/json'
    }));

    app.use(bodyParser.urlencoded({
        extended: true,
        limit: config.upload.maxSize
    }));

    // Security middleware
    app.use(sanitizeRequestBody());

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: config.server.nodeEnv,
            version: process.env.npm_package_version || '1.0.0'
        });
    });

    // API info endpoint
    app.get('/api', (req, res) => {
        res.json({
            name: 'AI Virtual Try-On API',
            version: process.env.npm_package_version || '1.0.0',
            environment: config.server.nodeEnv,
            endpoints: {
                health: '/health',
                generate: '/api/generate',
                recommend: '/api/recommend'
            }
        });
    });

    // Register all API routes
    const apiRouter = await createRouter();
    app.use('/', apiRouter);

    // 404 handler (must be after all routes)
    app.use(notFoundHandler);

    // Global error handler (must be last)
    app.use(errorHandler);

    return app;
}

export default createApp;