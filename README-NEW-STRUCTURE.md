# AI Virtual Try-On - Separated Architecture

This project has been restructured to separate the backend and frontend into independent applications.

## Project Structure

```
project-root/
├── backend/          # Node.js Express API server
├── frontend/         # React + Vite application
├── package.json      # Root package.json with workspace management
└── README-NEW-STRUCTURE.md
```

## Quick Start

### Install Dependencies
```bash
npm run install:all
```

### Development
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run them separately:
npm run dev:backend   # Backend on http://localhost:3000
npm run dev:frontend  # Frontend on http://localhost:5173
```

### Build
```bash
# Build both projects
npm run build

# Or build separately:
npm run build:backend
npm run build:frontend
```

### Testing
```bash
# Run all tests
npm test

# Or test separately:
npm run test:backend
npm run test:frontend
```

## Environment Setup

### Backend Environment
Copy `backend/.env.example` to `backend/.env` and configure:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `PORT`: Backend server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

### Frontend Environment
Copy `frontend/.env.example` to `frontend/.env` and configure:
- `VITE_API_URL`: Backend API URL (default: http://localhost:3000)

## Development Workflow

1. The frontend development server (Vite) runs on port 5173
2. The backend API server runs on port 3000
3. Vite is configured to proxy `/api` requests to the backend
4. Both servers support hot reload for development

## Migration Status

This is the initial project structure setup. The existing code will be migrated in subsequent tasks according to the implementation plan.

---

## 한국어 안내

### 프로젝트 구조
```
project-root/
├─ backend/          # Node.js Express API 서버
├─ frontend/         # React + Vite 앱
├─ package.json      # 워크스페이스 관리
└─ README-NEW-STRUCTURE.md
```

### 빠른 시작
- 의존성 설치(루트, 백엔드, 프론트):
```powershell
npm run install:all
```

- 개발 서버 실행(동시):
```powershell
npm run dev
```

- 개별 실행:
```powershell
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

### 빌드
```powershell
npm run build           # 전체 빌드
npm run build:backend   # 백엔드만
npm run build:frontend  # 프론트만
```

### 테스트
```powershell
npm test
npm run test:backend
npm run test:frontend
```

### 환경 설정
- 백엔드: `backend/.env.example`를 `backend/.env`로 복사 후 값 설정
  - `GEMINI_API_KEY`: Google Gemini API 키
  - `PORT`: API 포트(기본 3000)
  - `FRONTEND_URL`: CORS 허용 프론트 URL(기본 http://localhost:5173)
- 프론트: `frontend/.env.example`를 `frontend/.env`로 복사 후 값 설정
  - `VITE_API_URL`: 백엔드 API URL(기본 http://localhost:3000)

### 개발 흐름
1) 프론트(5173), 백엔드(3000)로 분리 실행
2) Vite 프록시가 `/api` 요청을 백엔드로 전달
3) 양쪽 모두 핫 리로드 지원

### 마이그레이션 상태
초기 구조 분리 완료. 향후 계획에 따라 코드·기능을 점진적으로 이전/정리합니다.
