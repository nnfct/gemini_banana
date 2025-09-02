$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Push-Location "$PSScriptRoot/.."
try {
  $frontend = Resolve-Path 'frontend'
  $env:VITE_API_URL = 'http://localhost:3001'
  Write-Host "[FE] Starting Vite with VITE_API_URL=$($env:VITE_API_URL)" -ForegroundColor Cyan
  Start-Process -FilePath 'npm' -ArgumentList @('run','dev') -WorkingDirectory $frontend -NoNewWindow
}
finally {
  Pop-Location
}

