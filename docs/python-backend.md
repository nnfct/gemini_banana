# Python Backend (FastAPI) – Dev Guide

This doc explains how to run the FastAPI backend alongside the current Node backend and how to point the frontend to it for testing.

## Quick Run (Monorepo Scripts)

Option A – Node backend + Frontend (default)

```bash
npm run dev
```

Option B – Python backend + Frontend

```bash
# First time only: create venv and install deps
cd backend_py
python -m venv .venv
./.venv/Scripts/python -m pip install --upgrade pip
./.venv/Scripts/python -m pip install -r requirements.txt
cd ..

# Then run both (FastAPI on 3001, frontend points to 3001)
npm run dev:py
```

Notes
- On macOS/Linux, replace `./.venv/Scripts/python` with `./.venv/bin/python`.
- The frontend will use `VITE_API_URL=http://localhost:3001` when started via `dev:frontend:py`.
- Endpoints available:
  - `GET /health`
  - `GET /api`
  - `POST /api/generate`, `GET /api/generate/status`
  - `POST /api/recommend`, `POST /api/recommend/from-fitting`, `GET /api/recommend/status`, `GET /api/recommend/catalog`

## Why This Setup

- Feature-first on Node while validating FastAPI in parallel.
- Minimal switching cost: just change which dev script you run.
- Safe: secrets remain only in backend env files or runtime env, not in the frontend.

