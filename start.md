Copy-Item backend\.env.example backend\.env -ErrorAction SilentlyContinue; Copy-Item frontend\.env.example frontend\.env -ErrorAction SilentlyContinue; npm run install:all

npm run dev