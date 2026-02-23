# Agent Ecosystem installer for Windows
# Usage: irm https://raw.githubusercontent.com/sickn33/agent-ecosystem/main/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"

$Repo = "sickn33/agent-ecosystem"
$Binary = "aeco"

# Detect architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
$OS = "windows"

Write-Host "[INFO] Fetching latest release..."
try {
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
    $Tag = $Release.tag_name
} catch {
    Write-Host "[WARN] Could not fetch latest release, trying 'latest'"
    $Tag = "latest"
}

Write-Host "[INFO] Installing $Binary $Tag for $OS/$Arch..."

$Url = "https://github.com/$Repo/releases/download/$Tag/$Binary-$OS-$Arch.exe"

# Install to user local bin
$InstallDir = Join-Path $env:LOCALAPPDATA "agent-ecosystem\bin"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$DestPath = Join-Path $InstallDir "$Binary.exe"
Invoke-WebRequest -Uri $Url -OutFile $DestPath -UseBasicParsing

# Add to PATH if not already there
$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$UserPath;$InstallDir", "User")
    $env:PATH = "$env:PATH;$InstallDir"
    Write-Host "[INFO] Added $InstallDir to user PATH"
}

Write-Host "[OK] $Binary installed to $DestPath"
Write-Host ""
Write-Host "Quick start:"
Write-Host "  cd your-repo"
Write-Host "  aeco init              # Initialize in current repo"
Write-Host "  aeco ready --quick     # Bootstrap everything"
Write-Host ""
Write-Host "Or use Go install:"
Write-Host "  go install github.com/$Repo/cmd/aeco@latest"
