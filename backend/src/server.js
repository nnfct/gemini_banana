console.log('🚀 Server file loaded');

import { createApp } from './app.js';
import config from './utils/config.js';

console.log('📦 Imports loaded successfully');

/**
 * Main server entry point
 * Starts the Express server and handles graceful shutdown
 */
async function startServer() {
    try {
        console.log('🔧 Starting server initialization...');

        // Create the Express application
        const app = await createApp();
        console.log('✅ Express app created successfully');

        // Start the server
        const server = app.listen(config.server.port, config.server.host, () => {
            console.log(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
            console.log(`📝 Environment: ${config.server.nodeEnv}`);
            console.log(`🏥 Health check: http://${config.server.host}:${config.server.port}/health`);
            console.log(`📚 API info: http://${config.server.host}:${config.server.port}/api`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

            server.close((err) => {
                if (err) {
                    console.error('❌ Error during server shutdown:', err);
                    process.exit(1);
                }

                console.log('✅ Server closed successfully');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('⚠️  Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('💥 Uncaught Exception:', err);
            gracefulShutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

        return server;

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
    console.log('✅ Starting server...');
    startServer();
}

export { startServer };
export default startServer;