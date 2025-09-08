Write-Host "🚨 EMERGENCY STOP: Killing all Node.js processes immediately..."

# Force kill all node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ All Node.js processes terminated"

# Clean database locks
$dbPath = "data/e2e-old-man-footy.db"
if (Test-Path "$dbPath-wal") { Remove-Item "$dbPath-wal" -Force }
if (Test-Path "$dbPath-shm") { Remove-Item "$dbPath-shm" -Force }
Write-Host "✅ Database lock files cleaned"

Write-Host "🎉 Emergency stop completed!"
