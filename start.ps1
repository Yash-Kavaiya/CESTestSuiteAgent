#
# Dialogflow CX Testing Tool - Startup Script
# Runs both frontend and backend servers
#

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Dialogflow CX Testing Tool - Startup    " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Servers Started!                        " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend:  " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Close the server windows to stop them." -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Green
