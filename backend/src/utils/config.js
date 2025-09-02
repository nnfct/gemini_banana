import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration management for the backend application
 * All environment variables are validated and typed here
 */
const config = {
    // Server configuration
    server: {
        port: parseInt(process.env.PORT) || 5000,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    },

    // AI service configurations
    ai: {
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview',
            maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 1000
        },
        azure: {
            openai: {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiKey: process.env.AZURE_OPENAI_KEY,
                deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID,
                apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
            },
            computerVision: {
                endpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT,
                apiKey: process.env.AZURE_COMPUTER_VISION_KEY,
                apiVersion: process.env.AZURE_COMPUTER_VISION_API_VERSION || '2023-10-01'
            }
        }
    },

    // Upload and file handling
    upload: {
        // Support both MAX_UPLOAD_SIZE and legacy MAX_FILE_SIZE envs
        maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        quality: parseFloat(process.env.IMAGE_QUALITY) || 0.8
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined'
    }
};

/**
 * Validates required environment variables
 * @throws {Error} If required environment variables are missing
 */
export function validateConfig() {
    const requiredVars = [];

    // Check for required AI service keys (optional for development)
    if (config.server.nodeEnv === 'production' && !config.ai.gemini.apiKey) {
        requiredVars.push('GEMINI_API_KEY');
    }

    if (requiredVars.length > 0) {
        throw new Error(`Missing required environment variables: ${requiredVars.join(', ')}`);
    }
}

/**
 * Gets configuration value by path (e.g., 'server.port')
 * @param {string} path - Dot-separated path to config value
 * @returns {any} Configuration value
 */
export function getConfig(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
}

export default config;
