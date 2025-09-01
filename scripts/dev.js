#!/usr/bin/env node

/**
 * Development server startup script
 * Ensures backend starts before frontend and provides better error handling
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting development servers...\n');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
};

function colorLog(color, prefix, message) {
    console.log(`${color}${colors.bright}[${prefix}]${colors.reset} ${message}`);
}

// Start backend server
const backend = spawn('npm', ['run', 'dev'], {
    cwd: join(rootDir, 'backend'),
    stdio: 'pipe',
    shell: true,
});

backend.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
        colorLog(colors.blue, 'BACKEND', message);
    }
});

backend.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
        colorLog(colors.red, 'BACKEND', message);
    }
});

// Wait for backend to be ready, then start frontend
let backendReady = false;
let frontendStarted = false;

backend.stdout.on('data', (data) => {
    const message = data.toString();
    if (message.includes('Server running on') && !backendReady) {
        backendReady = true;
        colorLog(colors.green, 'SYSTEM', 'Backend server is ready! Starting frontend...\n');

        // Start frontend server after a short delay
        setTimeout(() => {
            if (!frontendStarted) {
                startFrontend();
            }
        }, 1000);
    }
});

function startFrontend() {
    frontendStarted = true;

    const frontend = spawn('npm', ['run', 'dev'], {
        cwd: join(rootDir, 'frontend'),
        stdio: 'pipe',
        shell: true,
    });

    frontend.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            colorLog(colors.green, 'FRONTEND', message);
        }
    });

    frontend.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            colorLog(colors.yellow, 'FRONTEND', message);
        }
    });

    frontend.on('close', (code) => {
        colorLog(colors.red, 'FRONTEND', `Process exited with code ${code}`);
        process.exit(code);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        colorLog(colors.yellow, 'SYSTEM', 'Shutting down servers...');
        frontend.kill('SIGINT');
        backend.kill('SIGINT');
        process.exit(0);
    });
}

backend.on('close', (code) => {
    colorLog(colors.red, 'BACKEND', `Process exited with code ${code}`);
    process.exit(code);
});

// Fallback: start frontend after 5 seconds if backend doesn't signal ready
setTimeout(() => {
    if (!frontendStarted) {
        colorLog(colors.yellow, 'SYSTEM', 'Backend taking longer than expected, starting frontend anyway...');
        startFrontend();
    }
}, 5000);