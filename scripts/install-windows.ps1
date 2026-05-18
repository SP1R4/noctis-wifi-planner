# NOCTIS WiFi Planner — Windows installer (PowerShell)
# Installs Node.js LTS via winget (or Chocolatey if you already use it),
# then runs `npm install` and `npm run build`.
#
# Run from the repo root in a PowerShell window:
#   powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1
#
# If you hit "running scripts is disabled on this system", either use the
# command above or run once as Administrator:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = 'Stop'

function Write-Step    ($msg) { Write-Host "==> $msg" -ForegroundColor White }
function Write-Ok      ($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn    ($msg) { Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Fail    ($msg) { Write-Host "[X]  $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path 'package.json')) {
  Write-Fail "Run this from the repo root (package.json not found here)."
}
$pkg = Get-Content 'package.json' -Raw
if ($pkg -notmatch 'noctis-wifi-planner') {
  Write-Fail "package.json doesn't look like noctis-wifi-planner."
}

# --- Node.js -----------------------------------------------------------------
Write-Step "Checking for Node.js…"
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
  $nodeVersion = (node --version).TrimStart('v')
  $nodeMajor = [int]($nodeVersion -split '\.')[0]
  if ($nodeMajor -ge 18) {
    Write-Ok "Node v$nodeVersion already installed"
    $nodeOk = $true
  } else {
    Write-Warn "Node v$nodeVersion is too old (need >=18). Will install LTS."
  }
}

if (-not $nodeOk) {
  Write-Step "Installing Node.js LTS…"
  $installed = $false
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "    Using winget…"
    winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    $installed = $true
  } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "    Using Chocolatey…"
    choco install nodejs-lts -y
    $installed = $true
  } else {
    Write-Fail "Neither winget nor Chocolatey is available. Install Node.js manually from https://nodejs.org/ then rerun this script."
  }

  if ($installed) {
    # winget/choco add Node to PATH for new processes, but not this one. Pull
    # the user+machine PATH out of the registry so `node` resolves below.
    $env:PATH = `
      [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + `
      [Environment]::GetEnvironmentVariable('Path', 'User')
  }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node was installed but isn't on PATH for this session. Close and reopen PowerShell, then rerun this script."
  }
  Write-Ok "Node $(node --version), npm $(npm --version)"
}

# --- Project setup ----------------------------------------------------------
Write-Step "Installing project dependencies (npm install)…"
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed." }
Write-Ok "Dependencies installed"

Write-Step "Running tests…"
npm test
if ($LASTEXITCODE -ne 0) { Write-Fail "Tests failed." }
Write-Ok "Tests pass"

Write-Step "Building production bundle…"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed." }
Write-Ok "Built to .\dist\"

Write-Host ""
Write-Host "All set." -ForegroundColor White
Write-Host "Two ways to run it:" -ForegroundColor White
Write-Host ""
Write-Host "  npm run dev               -> http://localhost:5173 (hot reload)" -ForegroundColor Green
Write-Host "  start dist\index.html     -> portable, no server needed" -ForegroundColor Green
Write-Host ""
