import cors from 'cors';
import config from '../utils/config.js';

/**
 * CORS middleware configuration
 * Handles Cross-Origin Resource Sharing with configurable settings
 */

/**
 * Creates CORS middleware with default configuration
 * @returns {Function} CORS middleware function
 */
export function createCorsMiddleware() {
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // In development, allow all origins
            if (config.server.nodeEnv === 'development') {
                return callback(null, true);
            }

            // In production, check against allowed origins
            const allowedOrigins = Array.isArray(config.server.cors.origin)
                ? config.server.cors.origin
                : [config.server.cors.origin];

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS policy`));
            }
        },
        credentials: config.server.cors.credentials,
        methods: config.server.cors.methods,
        allowedHeaders: config.server.cors.allowedHeaders,
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
        maxAge: 86400 // 24 hours
    };

    return cors(corsOptions);
}

/**
 * Creates CORS middleware with custom options
 * @param {Object} customOptions - Custom CORS options to override defaults
 * @returns {Function} CORS middleware function
 */
export function createCustomCorsMiddleware(customOptions = {}) {
    const defaultOptions = {
        origin: config.server.cors.origin,
        credentials: config.server.cors.credentials,
        methods: config.server.cors.methods,
        allowedHeaders: config.server.cors.allowedHeaders
    };

    const mergedOptions = { ...defaultOptions, ...customOptions };
    return cors(mergedOptions);
}

/**
 * Preflight handler for complex CORS requests
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Function} next - Express next function
 */
export function handlePreflight(req, res, next) {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', config.server.cors.origin);
        res.header('Access-Control-Allow-Methods', config.server.cors.methods.join(', '));
        res.header('Access-Control-Allow-Headers', config.server.cors.allowedHeaders.join(', '));
        res.header('Access-Control-Allow-Credentials', config.server.cors.credentials);
        res.header('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }
    next();
}

// Export default CORS middleware
export default createCorsMiddleware();