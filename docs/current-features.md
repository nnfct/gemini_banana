# AI 가상 피팅 및 패션 추천 시스템 - 현재 기능

## 프로젝트 개요
AI 기반 가상 피팅과 패션 상품 추천을 제공하는 웹 애플리케이션입니다. 사용자가 자신의 사진과 의류 이미지를 업로드하면 AI가 가상으로 착용한 모습을 생성하고, 유사한 상품을 추천합니다.

## 기술 스택

### 프론트엔드
- **React 19.1.1** + **TypeScript**
- **Vite** (빌드 도구)
- **Tailwind CSS** (스타일링)

### 백엔드
- **Node.js** + **Express**
- **Google Gemini API** (이미지 생성)
- **Azure OpenAI** (이미지 분석 및 추천)

### 주요 라이브러리
- `@google/genai`: Gemini AI 모델 연동
- `openai`: Azure OpenAI 연동
- `cors`, `body-parser`: API 미들웨어

## 현재 구현된 기능

### 1. 가상 피팅 (Virtual Try-On)
- **사용자 이미지 업로드**: 전신 사진 업로드
- **의류 이미지 업로드**: 상의, 하의, 신발 각각 업로드 가능
- **AI 이미지 합성**: Gemini 2.5 Flash를 사용하여 가상 착용 이미지 생성
- **실시간 결과 표시**: 생성된 이미지를 즉시 화면에 표시

### 2. 상품 추천 시스템
- **업로드 기반 추천**: 업로드한 의류와 유사한 상품 추천
- **가상 피팅 결과 기반 추천**: 생성된 이미지를 분석하여 카테고리별 추천
- **Azure OpenAI Vision 분석**: 이미지의 색상, 스타일, 패턴 등을 분석
- **카테고리별 분류**: 상의, 하의, 신발, 액세서리로 구분된 추천

### 3. E-Commerce UI
- **상품 카탈로그 표시**: 브랜드별 상품 목록
- **할인 정보 표시**: 할인율과 가격 정보
- **반응형 디자인**: 모바일 친화적 UI

### 4. 네비게이션 시스템
- **하단 네비게이션**: 홈과 가상 피팅 간 전환
- **페이지 상태 관리**: React state를 통한 페이지 관리

## API 엔드포인트

### POST /api/generate
가상 피팅 이미지 생성
```json
{
  "person": { "base64": "...", "mimeType": "image/jpeg" },
  "clothingItems": {
    "top": { "base64": "...", "mimeType": "image/jpeg" },
    "pants": { "base64": "...", "mimeType": "image/jpeg" },
    "shoes": { "base64": "...", "mimeType": "image/jpeg" }
  }
}
```

### POST /api/recommend
업로드된 이미지 기반 상품 추천
```json
{
  "person": { "base64": "...", "mimeType": "image/jpeg" },
  "clothingItems": { ... }
}
```

### POST /api/recommend-from-fitting
가상 피팅 결과 기반 상품 추천
```json
{
  "generatedImage": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "originalClothingItems": { ... }
}
```

## 데이터 구조

### UploadedImage
```typescript
interface UploadedImage {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}
```

### 상품 카탈로그
```json
{
  "id": "p001",
  "title": "블랙 오버사이즈 후드티",
  "tags": ["black", "hoodie", "oversized", "casual"],
  "price": 42000,
  "imageUrl": "...",
  "category": "top"
}
```

## 환경 변수
- `GEMINI_API_KEY`: Google Gemini API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_DEPLOYMENT_ID`: Azure OpenAI 배포 ID

## 개발 서버 실행
```bash
npm install
npm run dev    # 프론트엔드 (포트 5173)
npm run server # 백엔드 API (포트 3000)
```

## 현재 제한사항
1. **Mock 데이터**: Azure OpenAI 미설정 시 mock 추천 사용
2. **로컬 카탈로그**: 실제 상품 DB 대신 JSON 파일 사용
3. **이미지 저장**: 생성된 이미지의 영구 저장 기능 없음
4. **사용자 관리**: 로그인/회원가입 기능 없음
5. **결제 시스템**: 상품 구매 기능 없음

## 향후 개선 방향
1. **백엔드/프론트엔드 분리**: 독립적인 배포 및 확장성
2. **데이터베이스 연동**: 실제 상품 DB 및 사용자 관리
3. **성능 최적화**: 이미지 처리 및 API 응답 속도 개선
4. **기능 확장**: 장바구니, 결제, 리뷰 시스템 등