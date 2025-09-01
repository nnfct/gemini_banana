#!/usr/bin/env node

/**
 * Backend build script
 * Copies source files and processes environment configurations for production
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');
const srcDir = join(backendDir, 'src');
const distDir = join(backendDir, 'dist');
const dataDir = join(backendDir, 'data');

console.log('🏗️  Building backend for production...');

async function copyDirectory(src, dest) {
    try {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = join(src, entry.name);
            const destPath = join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
                console.log(`📄 Copied: ${entry.name}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error copying ${src} to ${dest}:`, error.message);
        throw error;
    }
}

async function createProductionPackageJson() {
    try {
        // Read the original package.json
        const packageJsonPath = join(backendDir, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

        // Create production version with only necessary fields
        const prodPackageJson = {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            type: packageJson.type,
            main: packageJson.main,
            scripts: {
                start: 'node src/server.js',
                health: packageJson.scripts.health
            },
            dependencies: packageJson.dependencies,
            keywords: packageJson.keywords,
            author: packageJson.author,
            license: packageJson.license
        };

        // Write production package.json
        const prodPackageJsonPath = join(distDir, 'package.json');
        await fs.writeFile(prodPackageJsonPath, JSON.stringify(prodPackageJson, null, 2));
        console.log('📦 Created production package.json');
    } catch (error) {
        console.error('❌ Error creating production package.json:', error.message);
        throw error;
    }
}

async function createDockerIgnore() {
    const dockerIgnoreContent = `# Development files
node_modules
npm-debug.log*
.npm
.env.local
.env.development
.env.test

# IDE files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Coverage directory used by tools like istanbul
coverage

# Build artifacts
dist
build

# Test files
**/*.test.js
**/*.spec.js
test/
tests/

# Documentation
*.md
!README.md

# Git
.git
.gitignore`;

    await fs.writeFile(join(backendDir, '.dockerignore'), dockerIgnoreContent);
    console.log('🐳 Created .dockerignore');
}

async function build() {
    try {
        console.log('📁 Copying source files...');
        await copyDirectory(srcDir, join(distDir, 'src'));

        console.log('📁 Copying data files...');
        try {
            await copyDirectory(dataDir, join(distDir, 'data'));
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️  Data directory not found, skipping...');
            } else {
                throw error;
            }
        }

        console.log('📦 Creating production package.json...');
        await createProductionPackageJson();

        console.log('🐳 Creating Docker ignore file...');
        await createDockerIgnore();

        console.log('✅ Backend build completed successfully!');
        console.log(`📂 Build output: ${distDir}`);
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

build();