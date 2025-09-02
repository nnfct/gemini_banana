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

---

## 한국어 안내

### 개요
이 디렉터리는 기존 Node.js 백엔드를 Python(FastAPI)로 단계적으로 이전하기 위한 스켈레톤입니다. 헬스체크와 API 정보, 가상 피팅/추천 라우트의 스텁을 제공합니다.

### 빠른 실행
```powershell
# 레포 루트가 아닌, backend_py 디렉터리에서 실행
cd backend_py
python -m venv .venv
.\.venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 서버 실행 (기본 3000 포트)
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

### 엔드포인트
- GET `/health`: 헬스 체크
- GET `/api`: API 정보
- POST `/api/generate`, GET `/api/generate/status`: 가상 피팅 스텁
- POST `/api/recommend`, POST `/api/recommend/from-fitting`: 추천 스텁
- GET `/api/recommend/status`, GET `/api/recommend/catalog`: 상태/카탈로그 통계

### 환경변수(.env)
`.env.example`를 복사해 `.env` 작성 (필수 아님):
```
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 비고
- CORS는 로컬 프론트(`FRONTEND_URL`)를 허용합니다.
- 현재는 스텁 응답이며, 추후 카탈로그/AI 호출 로직을 점진적으로 이식합니다.
