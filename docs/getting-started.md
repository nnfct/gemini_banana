# 실행 가이드

## 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일에서 다음 값들을 설정하세요:

```env
# Gemini API (이미지 생성용)
GEMINI_API_KEY=your_gemini_api_key_here

# Azure OpenAI (상품 추천용 - 선택사항, MVP에서는 mock 사용)
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT_ID=your_deployment_id
```

### 3. 서버 실행
두 개의 터미널이 필요합니다:

**터미널 1 - API 서버:**
```bash
npm run server
```

**터미널 2 - 프론트엔드 개발 서버:**
```bash
npm run dev
```

### 4. 접속
브라우저에서 `http://localhost:5173/`로 접속하세요.

## 주요 기능

### 1. 가상 피팅 이미지 생성
- 사용자 사진과 의류 사진을 업로드
- Gemini API를 통해 가상 피팅 이미지 생성
- 엔드포인트: `POST /api/generate`

### 2. 상품 추천 (새로 추가됨)
- 업로드된 의류 이미지 분석
- 카탈로그에서 유사한 상품 추천
- 엔드포인트: `POST /api/recommend`
- MVP: 간단한 키워드 매칭으로 구현
- 향후: Azure OpenAI를 통한 이미지 분석으로 업그레이드 예정

## API 테스트

### 추천 API 테스트 (PowerShell)
```powershell
$body = @{
    person = @{
        base64 = "base64_encoded_image_data"
        mimeType = "image/jpeg"
    }
    clothingItems = @{
        top = @{
            base64 = "base64_encoded_clothing_image"
            mimeType = "image/jpeg"
        }
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method Post -Uri 'http://localhost:5173/api/recommend' -ContentType 'application/json' -Body $body
```

## 프로젝트 구조

```
├── api/
│   ├── generate.js      # 가상 피팅 이미지 생성
│   └── recommend.js     # 상품 추천 로직
├── components/          # React 컴포넌트
├── data/
│   └── catalog.json     # 상품 카탈로그 (MVP용)
├── docs/                # 프로젝트 문서
├── services/
│   └── geminiService.ts # API 호출 서비스
├── server.js           # Express 서버
└── vite.config.ts      # Vite 설정 (API 프록시 포함)
```

## 다음 단계

1. **Azure OpenAI 연동**: MVP의 키워드 매칭을 실제 이미지 분석으로 업그레이드
2. **벡터 데이터베이스**: Azure Cognitive Search를 통한 정밀한 시각적 유사성 검색
3. **카탈로그 확장**: 더 많은 상품 데이터와 메타데이터 추가
4. **UI 개선**: 추천 상품을 표시하는 전용 컴포넌트 추가

## 문제 해결

### 서버가 시작되지 않는 경우
```bash
# 기존 node 프로세스 종료
tasklist /FI "IMAGENAME eq node.exe"
taskkill /PID [PID_NUMBER] /F

# 서버 재시작
npm run server
```

### API 호출 실패
- 서버(포트 3000)와 Vite(포트 5173)가 모두 실행 중인지 확인
- `.env` 파일에 올바른 API 키가 설정되었는지 확인
- 네트워크/방화벽 설정 확인
