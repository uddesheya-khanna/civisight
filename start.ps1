# CiviSight AI — Windows PowerShell Quick-Start Helper
#
# Usage (from repo root in PowerShell):
#   .\start.ps1 backend
#   .\start.ps1 frontend
#   .\start.ps1 test
#   .\start.ps1 build
#
# Or open two terminals and run both:
#   Terminal 1: .\start.ps1 backend
#   Terminal 2: .\start.ps1 frontend

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backend","frontend","test","build","health","install")]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$PythonExe = Join-Path $RepoRoot "backend\venv\Scripts\python.exe"

if ($Target -eq "backend") {
    Write-Host "Starting CiviSight backend on http://localhost:8000 ..." -ForegroundColor Cyan
    Write-Host "OpenAPI docs: http://localhost:8000/docs" -ForegroundColor Cyan
    & $PythonExe -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
}

elseif ($Target -eq "frontend") {
    Write-Host "Starting Vite dev server on http://localhost:5173 ..." -ForegroundColor Cyan
    Set-Location (Join-Path $RepoRoot "frontend")
    npm run dev
}

elseif ($Target -eq "test") {
    Write-Host "Running backend test suite..." -ForegroundColor Cyan
    & $PythonExe -m pytest backend/app/tests -v
}

elseif ($Target -eq "build") {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Set-Location (Join-Path $RepoRoot "frontend")
    npm run build
}

elseif ($Target -eq "health") {
    Write-Host "Backend health check:" -ForegroundColor Cyan
    Invoke-RestMethod http://localhost:8000/api/health | ConvertTo-Json
}

elseif ($Target -eq "install") {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    & $PythonExe -m pip install -r backend/requirements.txt
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location (Join-Path $RepoRoot "frontend")
    npm install
}
