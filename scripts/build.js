#!/usr/bin/env node

/**
 * Production build script for the entire application
 * Builds both backend and frontend for production deployment
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🏗️  Starting production build...\n');

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

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            cwd,
            stdio: 'pipe',
            shell: true,
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                stdout += message + '\n';
                colorLog(colors.blue, 'BUILD', message);
            }
        });

        process.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                stderr += message + '\n';
                colorLog(colors.yellow, 'BUILD', message);
            }
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with exit code ${code}\nStderr: ${stderr}`));
            }
        });
    });
}

async function buildBackend() {
    colorLog(colors.green, 'BACKEND', 'Building backend...');
    try {
        await runCommand('npm', ['run', 'build:prod'], join(rootDir, 'backend'));
        colorLog(colors.green, 'BACKEND', 'Backend build completed successfully!');
    } catch (error) {
        colorLog(colors.red, 'BACKEND', `Backend build failed: ${error.message}`);
        throw error;
    }
}

async function buildFrontend() {
    colorLog(colors.green, 'FRONTEND', 'Building frontend...');
    try {
        await runCommand('npm', ['run', 'build:prod'], join(rootDir, 'frontend'));
        colorLog(colors.green, 'FRONTEND', 'Frontend build completed successfully!');
    } catch (error) {
        colorLog(colors.red, 'FRONTEND', `Frontend build failed: ${error.message}`);
        throw error;
    }
}

async function createBuildInfo() {
    const buildInfo = {
        buildTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: 'production'
    };

    try {
        await fs.writeFile(
            join(rootDir, 'build-info.json'),
            JSON.stringify(buildInfo, null, 2)
        );
        colorLog(colors.green, 'BUILD', 'Build info created');
    } catch (error) {
        colorLog(colors.yellow, 'BUILD', `Warning: Could not create build info: ${error.message}`);
    }
}

async function build() {
    try {
        const startTime = Date.now();

        // Build backend and frontend in parallel
        await Promise.all([
            buildBackend(),
            buildFrontend()
        ]);

        // Create build info
        await createBuildInfo();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        colorLog(colors.green, 'BUILD', `✅ Production build completed successfully in ${duration}s!`);

        console.log('\n📦 Build artifacts:');
        console.log('   - Backend: ./backend/dist/');
        console.log('   - Frontend: ./frontend/dist/');
        console.log('\n🚀 Ready for deployment!');

    } catch (error) {
        colorLog(colors.red, 'BUILD', `❌ Build failed: ${error.message}`);
        process.exit(1);
    }
}

build();