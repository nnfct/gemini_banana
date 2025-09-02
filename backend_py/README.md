# Python Backend (FastAPI) Skeleton

This is a minimal FastAPI skeleton to prepare a migration path from the Node.js backend. It provides a health endpoint and stub routes that mirror the current API surface.

## Endpoints

- GET `/health` – service health
- GET `/api` – API info
- POST `/api/generate` – stub virtual try-on generation
- GET `/api/generate/status` – generator service status (stub)
- POST `/api/recommend` – stub recommendation from uploads
- POST `/api/recommend/from-fitting` – stub recommendation from generated image
- GET `/api/recommend/status` – recommendation service status (stub)
- GET `/api/recommend/catalog` – catalog stats (stub)

## Quick Start

```bash
cd backend_py
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt

# Run (env vars optional via .env)
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

## Environment

Copy `.env.example` to `.env` if needed.

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Notes

- CORS allows `FRONTEND_URL` for local dev.
- Models align with the Node backend types; responses are placeholders for now.
- When ready, incrementally port real logic (catalog/search, AI calls) and swap the frontend proxy to point here.

