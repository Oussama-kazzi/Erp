# ERP Startup Script
# Run this once each time you boot your PC before using the app

Write-Host "`n Starting ERP Manager...`n" -ForegroundColor Cyan

# 1. Start MongoDB
$mongodExe  = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
$dataDir    = "$env:USERPROFILE\mongodb\data"
$logFile    = "$env:USERPROFILE\mongodb\log\mongod.log"

$alreadyRunning = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($alreadyRunning) {
  Write-Host " MongoDB already running (PID $($alreadyRunning.Id))" -ForegroundColor Green
} else {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  New-Item -ItemType Directory -Path (Split-Path $logFile) -Force | Out-Null
  Start-Process -FilePath $mongodExe `
    -ArgumentList "--dbpath `"$dataDir`" --logpath `"$logFile`" --port 27017 --bind_ip 127.0.0.1" `
    -WindowStyle Hidden
  Start-Sleep -Seconds 3
  Write-Host " MongoDB started on port 27017" -ForegroundColor Green
}

# 2. Start Backend
$backendDir = "C:\Users\PC\Desktop\project\erp\backend"
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/k cd /d `"$backendDir`" && npm run dev" `
  -WindowStyle Normal

# 3. Start Frontend
$frontendDir = "C:\Users\PC\Desktop\project\erp\frontend"
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/k cd /d `"$frontendDir`" && npm run dev" `
  -WindowStyle Normal

Write-Host " Backend starting at http://localhost:5000" -ForegroundColor Green
Write-Host " Frontend starting at http://localhost:5173" -ForegroundColor Green
Write-Host "`n Opening browser in 5 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
