import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

/**
 * Main route registry with automatic route discovery
 * Provides centralized route management and registration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates the main router with all registered routes
 * @returns {express.Router} Configured router with all routes
 */
export async function createRouter() {
    const router = Router();

    // Add route-level middleware for all API routes
    router.use((req, res, next) => {
        // Add request ID for tracking
        req.id = generateRequestId();

        // Add request timestamp
        req.timestamp = new Date().toISOString();

        // Log incoming requests in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📥 ${req.method} ${req.url} [${req.id}]`);
        }

        next();
    });

    // Register routes automatically
    await registerRoutes(router);

    return router;
}

/**
 * Automatically discovers and registers route modules
 * @param {express.Router} router - Express router instance
 */
async function registerRoutes(router) {
    try {
        const routeFiles = await readdir(__dirname);

        for (const file of routeFiles) {
            // Skip index.js and non-JS files
            if (file === 'index.js' || !file.endsWith('.js')) {
                continue;
            }

            const routeName = file.replace('.js', '');
            const routePath = join(__dirname, file);

            try {
                // Dynamic import of route module
                const routeModule = await import(`file://${routePath}`);

                // Check if module exports a router
                if (routeModule.default && typeof routeModule.default === 'function') {
                    // Mount the route with /api prefix
                    router.use(`/api/${routeName}`, routeModule.default);
                    console.log(`✅ Registered route: /api/${routeName}`);
                } else if (routeModule.router) {
                    // Alternative export pattern
                    router.use(`/api/${routeName}`, routeModule.router);
                    console.log(`✅ Registered route: /api/${routeName}`);
                } else {
                    console.warn(`⚠️  Route file ${file} does not export a router`);
                }
            } catch (error) {
                console.error(`❌ Failed to load route ${file}:`, error.message);
            }
        }
    } catch (error) {
        console.error('❌ Failed to read routes directory:', error.message);
    }
}

/**
 * Manually registers a route with the router
 * @param {express.Router} router - Express router instance
 * @param {string} path - Route path
 * @param {express.Router} routeHandler - Route handler
 * @param {Object} options - Registration options
 */
export function registerRoute(router, path, routeHandler, options = {}) {
    const { middleware = [], prefix = '/api' } = options;

    // Apply route-level middleware if provided
    if (middleware.length > 0) {
        router.use(`${prefix}${path}`, ...middleware);
    }

    // Register the route
    router.use(`${prefix}${path}`, routeHandler);

    console.log(`✅ Manually registered route: ${prefix}${path}`);
}

/**
 * Creates route-level middleware for authentication
 * @param {Object} options - Authentication options
 * @returns {Function} Express middleware function
 */
export function createAuthMiddleware(options = {}) {
    const { required = true, roles = [] } = options;

    return (req, res, next) => {
        // TODO: Implement authentication logic
        // For now, just pass through
        if (required) {
            // In a real implementation, check for valid token/session
            // req.user = await validateToken(req.headers.authorization);
        }

        next();
    };
}

/**
 * Creates route-level middleware for rate limiting
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
export function createRateLimitMiddleware(options = {}) {
    const { windowMs = 15 * 60 * 1000, max = 100 } = options; // 15 minutes, 100 requests

    // Simple in-memory rate limiting (use Redis in production)
    const requests = new Map();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (requests.has(key)) {
            const userRequests = requests.get(key).filter(time => time > windowStart);
            requests.set(key, userRequests);
        } else {
            requests.set(key, []);
        }

        const userRequests = requests.get(key);

        if (userRequests.length >= max) {
            return res.status(429).json({
                error: {
                    message: 'Too many requests',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        }

        userRequests.push(now);
        next();
    };
}

/**
 * Creates route-level middleware for caching responses
 * @param {Object} options - Caching options
 * @returns {Function} Express middleware function
 */
export function createCacheMiddleware(options = {}) {
    const { ttl = 300, key = null } = options; // 5 minutes default TTL

    // Simple in-memory cache (use Redis in production)
    const cache = new Map();

    return (req, res, next) => {
        const cacheKey = key ? key(req) : `${req.method}:${req.url}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < ttl * 1000) {
            return res.json(cached.data);
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function (data) {
            cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return originalJson.call(this, data);
        };

        next();
    };
}

/**
 * Generates a unique request ID for tracking
 * @returns {string} Unique request ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a route handler wrapper with common functionality
 * @param {Function} handler - Route handler function
 * @param {Object} options - Handler options
 * @returns {Function} Wrapped route handler
 */
export function createRouteHandler(handler, options = {}) {
    const {
        validation = null,
        auth = false,
        rateLimit = null,
        cache = null
    } = options;

    const middleware = [];

    // Add authentication middleware
    if (auth) {
        middleware.push(createAuthMiddleware(typeof auth === 'object' ? auth : {}));
    }

    // Add rate limiting middleware
    if (rateLimit) {
        middleware.push(createRateLimitMiddleware(rateLimit));
    }

    // Add caching middleware
    if (cache) {
        middleware.push(createCacheMiddleware(cache));
    }

    // Add validation middleware
    if (validation) {
        middleware.push(validation);
    }

    // Return the complete middleware chain
    return [...middleware, handler];
}

export default createRouter;