Copy-Item backend\.env.example backend\.env -ErrorAction SilentlyContinue; Copy-Item frontend\.env.example frontend\.env -ErrorAction SilentlyContinue; npm run install:all

npm run dev

# macOS / Linux (bash, zsh)
# .env.example 파일들을 복사하고 의존성 설치 후 개발서버 실행
cp backend/.env.example backend/.env 2>/dev/null || true
cp frontend/.env.example frontend/.env 2>/dev/null || true
npm run install:all

npm run