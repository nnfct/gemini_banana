## 기능 추가 계획 (초안)

목표: 추천 품질과 사용성 개선을 중심으로, 현재 구조를 유지하며 빠르게 확장 가능한 기능을 단계적으로 추가합니다.

1) 즉시 정리(안전·품질)
- 비밀키 분리: 실제 키는 `backend/.env`와 루트 `.env.development`에서 제거하고, 예시는 `*.env.example`만 유지.
- .gitignore 강화: 모든 디렉터리의 `.env*` 무시 처리 완료(추가 반영).
- 개발 서버 혼선 정리: 루트 `server.js`와 `api/*`는 개발용(모의 응답)으로 명시하고, 운영/통합은 `backend/`만 사용.

2) 단기 기능(우선순위 높음)
- 추천 필터/정렬: 가격 범위(min/max), 태그 제외(`excludeTags`) UI 추가 → 백엔드 `/api/recommend` 옵션과 연동.
- 아이템 클릭 동작: 추천 카드 클릭 시 상품 상세(모달 또는 별도 페이지) 스텁 추가, 이벤트 로깅(콘솔 → 훗날 분석).
- 통화/표시 형식: 가격을 KRW 통화 형식으로 표기(적용 완료). 다국어(i18n) 도입 전까지는 한/영 혼용 최소화.
- 로딩/오류 UX: 추천 로딩 스피너, 오류 토스트 메시지 표준화(컴포넌트 이미 존재, 일관 적용).

3) 중기 기능(선택)
- 다국어(i18n) 베이스라인: `en/ko` 간단 스위치용 헬퍼 추가 후 점진적 적용.
- 추천 품질 향상: Azure OpenAI/Computer Vision 사용 시 분석 키워드 가중치/동의어 처리(백엔드 `catalog.service` 확장).
- 이미지 캐싱: 생성 이미지/썸네일 캐시로 재요청 최소화(프론트 메모리 캐시 → HTTP 캐시 정책).

4) API 체크리스트
- POST `/api/generate`: 가상 피팅 이미지 생성 (현행 유지)
- POST `/api/recommend`: 업로드 이미지 기반 추천(옵션: `maxPerCategory, minPrice, maxPrice, excludeTags`)
- POST `/api/recommend/from-fitting`: 생성 이미지 기반 추천(현행 유지)
- GET `/api/recommend/status`, `/api/generate/status`, `/health`: 상태/헬스 확인(현행 유지)

5) 개발 메모
- 프론트엔드: `frontend/src/components/features/recommendations/RecommendationDisplay.tsx` 가격 표기 KRW 적용.
- 백엔드: `backend/src` 라우트/서비스는 일관된 에러/검증 처리 완료. 옵션 필터 UI만 붙이면 바로 활용 가능.
- 레거시: 루트 `components/`와 `api/`는 레거시로 분류하거나 `legacy/`로 이동 권장(코드 혼동 방지).

