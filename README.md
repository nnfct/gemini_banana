<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

Note: Backend is now Python FastAPI (backend_py) only. Legacy Node backend was removed to avoid confusion.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ORGriwJMQVw1Sd-cSjddK7sGBrrm_B6D

## Run Locally

**Prerequisites:**  Node.js (frontend tooling) and Python 3.11+ (backend_py)


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app with Python backend:
   `npm run dev:py`

---

## 로컬 실행(한국어)

사전 준비: Node.js 설치

1) 의존성 설치
```
npm install
```

2) 환경 변수 설정
- `GEMINI_API_KEY`를 로컬 환경변수 또는 `.env.local`(존재 시) 등에 설정

3) 앱 실행
```
npm run dev
```

분리된 백엔드/프론트 구조를 사용하는 경우(모노레포):
```
npm run install:all   # 루트/백엔드/프론트 의존성 설치
npm run dev           # 백엔드(3000) + 프론트(5173) 동시 실행

# 또는 FastAPI(Python) 백엔드로 테스트
npm run dev:py        # FastAPI(3001) + 프론트(5173)
```
