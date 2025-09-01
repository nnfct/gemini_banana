# Development Guide

This guide covers the development setup and workflow for the AI Virtual Try-On application.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation
```bash
# Install all dependencies
npm run install:all
```

### Development Servers

#### Option 1: Concurrent Development (Recommended)
Start both backend and frontend servers simultaneously:
```bash
npm run dev
```

#### Option 2: Ordered Development
Start backend first, then frontend (better for debugging):
```bash
npm run dev:ordered
```

#### Option 3: Individual Servers
Start servers individually:
```bash
# Backend only (runs on http://localhost:3000)
npm run dev:backend-only

# Frontend only (runs on http://localhost:5173)
npm run dev:frontend-only
```

## Development Features

### Hot Reload
- **Backend**: Uses nodemon to restart server on file changes
- **Frontend**: Uses Vite HMR for instant updates without page refresh

### API Proxy
The frontend development server automatically proxies API requests to the backend:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Proxy: `/api/*` requests are forwarded to backend

### Environment Configuration
- `.env.development` - Development-specific environment variables
- `backend/.env` - Backend environment variables
- `frontend/.env.local` - Frontend environment variables (create if needed)

## Available Scripts

### Root Level Scripts
```bash
npm run dev                 # Start both servers concurrently
npm run dev:ordered         # Start servers in order (backend first)
npm run dev:backend-only    # Start only backend
npm run dev:frontend-only   # Start only frontend
npm run build              # Build both projects
npm run test               # Run all tests
npm run test:watch         # Run tests in watch mode
npm run lint               # Lint all code
npm run lint:fix           # Fix linting issues
npm run clean              # Clean all node_modules and dist folders
npm run clean:install      # Clean and reinstall all dependencies
```

### Backend Scripts
```bash
cd backend
npm run dev                # Development server with nodemon
npm run dev:debug          # Development server with Node.js debugger
npm run start              # Production server
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
npm run health             # Check server health
```

### Frontend Scripts
```bash
cd frontend
npm run dev                # Development server with Vite
npm run build              # Production build
npm run preview            # Preview production build
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:ui            # Run tests with UI
```

## Development Workflow

### 1. Starting Development
```bash
# Clone and setup
git clone <repository>
cd <project>
npm run install:all

# Start development servers
npm run dev
```

### 2. Making Changes
- Backend changes trigger automatic server restart
- Frontend changes trigger instant HMR updates
- API changes are immediately available to frontend via proxy

### 3. Testing Changes
```bash
# Run all tests
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run specific project tests
npm run test:backend
npm run test:frontend
```

### 4. Code Quality
```bash
# Check code quality
npm run lint

# Fix linting issues
npm run lint:fix
```

## Debugging

### Backend Debugging
```bash
cd backend
npm run dev:debug
```
Then attach your debugger to `http://localhost:9229`

### Frontend Debugging
Use browser developer tools. Source maps are enabled in development.

### API Debugging
- Backend logs all requests and responses
- Frontend proxy logs all forwarded requests
- Health check: `http://localhost:3000/health`

## Troubleshooting

### Port Conflicts
If ports 3000 or 5173 are in use:
1. Kill existing processes: `npx kill-port 3000 5173`
2. Or modify ports in configuration files

### Proxy Issues
If API calls aren't working:
1. Check backend server is running on port 3000
2. Check Vite proxy configuration in `frontend/vite.config.ts`
3. Check browser network tab for proxy errors

### Hot Reload Not Working
1. Check nodemon configuration in `backend/nodemon.json`
2. Check Vite HMR in browser console
3. Try restarting development servers

### Dependencies Issues
```bash
# Clean and reinstall everything
npm run clean:install
```

## Project Structure

```
project-root/
├── backend/                 # Backend Express server
│   ├── src/                # Source code
│   ├── nodemon.json        # Nodemon configuration
│   └── package.json        # Backend dependencies
├── frontend/               # Frontend React app
│   ├── src/                # Source code
│   ├── vite.config.ts      # Vite configuration
│   └── package.json        # Frontend dependencies
├── scripts/                # Development scripts
│   └── dev.js             # Ordered development startup
├── .env.development        # Development environment
├── DEVELOPMENT.md          # This file
└── package.json           # Root workspace configuration
```