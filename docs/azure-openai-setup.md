# Azure OpenAI 실제 연동 가이드

## 🎯 목표
가상 피팅 이미지를 Azure OpenAI Vision API로 실제 분석하여 정확한 상품 추천 제공

## 📋 준비 사항

### 1. Azure OpenAI 리소스 생성
1. Azure Portal (https://portal.azure.com) 접속
2. "Create a resource" → "AI + Machine Learning" → "Azure OpenAI"
3. 리소스 생성 후 "Keys and Endpoint" 메뉴에서 정보 확인

### 2. GPT-4 Vision 모델 배포
1. Azure OpenAI Studio (https://oai.azure.com) 접속
2. "Deployments" → "Create new deployment"
3. 모델: `gpt-4-vision-preview` 또는 `gpt-4o` 선택
4. Deployment name 설정 (예: `gpt-4-vision`)

## 🛠️ 설정 단계

### 1. 환경 변수 설정
`.env` 파일을 다음과 같이 수정:

```env
GEMINI_API_KEY=your_gemini_key_here

# Azure OpenAI 실제 정보로 교체
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_KEY=your_32_character_api_key_here
AZURE_OPENAI_DEPLOYMENT_ID=gpt-4-vision
```

**💡 정보 확인 방법:**
- `AZURE_OPENAI_ENDPOINT`: Azure Portal → OpenAI 리소스 → "Keys and Endpoint"
- `AZURE_OPENAI_KEY`: 같은 위치의 "KEY 1" 또는 "KEY 2"
- `AZURE_OPENAI_DEPLOYMENT_ID`: Azure OpenAI Studio → "Deployments"에서 생성한 이름

## 🚀 실행 명령어 순서

### 1. 패키지 설치 확인
```bash
npm install openai
```

### 2. Azure OpenAI 연결 테스트
```bash
npm run test-azure
```

**예상 출력:**
```
🔍 Azure OpenAI 설정 확인 중...
환경 변수 확인:
- AZURE_OPENAI_ENDPOINT: ✅ 설정됨
- AZURE_OPENAI_KEY: ✅ 설정됨
- AZURE_OPENAI_DEPLOYMENT_ID: ✅ 설정됨

🔗 Azure OpenAI 연결 테스트 중...
✅ Azure OpenAI 연결 성공!

🖼️  Vision API 테스트 중...
✅ Vision API 테스트 성공!
```

### 3. 서버 실행
```bash
# 터미널 1
npm run server

# 터미널 2 
npm run dev
```

### 4. 테스트
브라우저에서 `http://localhost:5173/` 접속하여 가상 피팅 → 추천 테스트

## 🔍 문제 해결

### 연결 테스트 실패 시

#### ❌ 401 Unauthorized
```
💡 API 키가 잘못되었을 수 있습니다.
```
**해결방법:** Azure Portal에서 KEY 1 또는 KEY 2를 다시 복사

#### ❌ 404 Not Found  
```
💡 Endpoint URL이나 Deployment ID가 잘못되었을 수 있습니다.
```
**해결방법:** 
- Endpoint URL 형식 확인: `https://your-name.openai.azure.com/`
- Deployment ID 확인: Azure OpenAI Studio → Deployments

#### ❌ Vision 기능 오류
```
💡 Vision 기능이 지원되지 않는 모델일 수 있습니다.
```
**해결방법:** `gpt-4-vision-preview` 또는 `gpt-4o` 모델 사용

## 📊 실제 분석 결과 예시

### Mock vs 실제 Azure OpenAI 분석 비교

**Mock (기존):**
```json
{
  "top": ["black", "hoodie", "oversized", "casual"],
  "pants": ["blue", "jeans", "straight", "regular"]
}
```

**Azure OpenAI Vision (실제):**
```json
{
  "top": ["dark_charcoal", "pullover_hoodie", "relaxed_fit", "streetwear", "cotton_blend"],
  "pants": ["medium_wash_denim", "straight_leg", "mid_rise", "classic_cut"],
  "shoes": ["white_leather", "low_top_sneakers", "minimalist_design"],
  "overall_style": ["contemporary_casual", "urban", "young_adult"]
}
```

## 🎨 실제 연동 시 장점

1. **정확한 색상 인식**: "black" → "dark_charcoal", "medium_wash_denim"
2. **세밀한 스타일 분석**: "hoodie" → "pullover_hoodie", "streetwear"
3. **재질 추론**: "cotton_blend", "white_leather"
4. **컨텍스트 이해**: "contemporary_casual", "urban"

## 🔄 개발 워크플로우

1. **개발**: Mock 데이터로 빠른 개발/테스트
2. **검증**: Azure OpenAI로 실제 분석 품질 확인  
3. **배포**: 프로덕션에서 실제 Vision API 사용

## 💰 비용 고려사항

- GPT-4 Vision API 호출 비용 발생
- 개발 중에는 Mock 사용 권장
- 프로덕션에서는 캐싱으로 비용 최적화

## 🖼️ Azure Computer Vision 설정 (추천 알고리즘용)

### 1. Azure Computer Vision 리소스 생성
1. Azure Portal (https://portal.azure.com) 접속
2. "Create a resource" → "AI + Machine Learning" → "Computer Vision"
3. 리소스 생성 후 "Keys and Endpoint" 메뉴에서 정보 확인

### 2. 환경 변수 설정
`.env` 파일에 다음을 추가:

```env
# Azure Computer Vision (추천 알고리즘용)
AZURE_COMPUTER_VISION_ENDPOINT=https://your-computer-vision-resource.cognitiveservices.azure.com/
AZURE_COMPUTER_VISION_KEY=your_32_character_api_key_here
```

### 3. 패키지 설치 확인
```bash
npm install @azure/cognitiveservices-computervision @azure/ms-rest-js
```

### 4. Computer Vision 연결 테스트
```bash
# 테스트 파일 실행 (필요 시 생성)
node test-azure-computer-vision.js
```

**예상 출력:**
```
🔍 Azure Computer Vision 설정 확인 중...
✅ Computer Vision 연결 성공!
🖼️ 이미지 분석 테스트 중...
✅ 태그 추출: ["shirt", "blue", "casual"]
✅ 캡션 생성: "A person wearing a blue shirt"
```

### 5. 추천 알고리즘 작동 방식
- **입력**: 가상 피팅 이미지 (base64)
- **분석**: Computer Vision으로 태그/캡션 추출
- **매칭**: 카탈로그와 키워드 매칭으로 상품 추천
- **출력**: 카테고리별 추천 상품 리스트

---

**✅ Computer Vision 설정 완료 시 더 정확하고 빠른 추천 알고리즘을 사용할 수 있습니다!**
