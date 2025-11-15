# PowerShell script to download and install Node.js
# Run this with: powershell -ExecutionPolicy Bypass -File install-nodejs.ps1

Write-Host "Downloading Node.js LTS installer..." -ForegroundColor Cyan

$nodeVersion = "20.11.0"
$installerUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
$installerPath = "$env:TEMP\nodejs-installer.msi"

try {
    # Download installer
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    Write-Host "Downloaded successfully!" -ForegroundColor Green

    # Run installer
    Write-Host "Starting installer..." -ForegroundColor Cyan
    Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /quiet /norestart" -Wait

    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "Please close and reopen your terminal to use npm" -ForegroundColor Yellow

    # Clean up
    Remove-Item $installerPath -ErrorAction SilentlyContinue

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Please install manually from: https://nodejs.org/" -ForegroundColor Yellow
}
