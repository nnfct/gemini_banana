$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Push-Location "$PSScriptRoot/.."
try {
  $backend = Resolve-Path 'backend_py'
  $venvPy = Join-Path $backend '.venv/Scripts/python.exe'
  if (-not (Test-Path $venvPy)) { $venvPy = 'python' }

  Write-Host "[PY] Starting FastAPI on http://localhost:3001" -ForegroundColor Cyan
  Start-Process -FilePath $venvPy -ArgumentList @('-m','uvicorn','app.main:app','--reload','--host','0.0.0.0','--port','3001') -WorkingDirectory $backend -NoNewWindow
}
finally {
  Pop-Location
}

