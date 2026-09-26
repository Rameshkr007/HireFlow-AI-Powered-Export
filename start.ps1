Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  HireFlow - AI-Powered Export Outreach Platform" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
Write-Host "Starting Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  HireFlow is launching!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "  Demo Credentials:" -ForegroundColor Cyan
Write-Host "  Email    : admin@hireflow.com"
Write-Host "  Password : admin123"
Write-Host "===================================================" -ForegroundColor Green
