#!/usr/bin/env bash
# NOCTIS WiFi Planner — Ubuntu/Debian installer
# Installs Node.js 20 LTS via NodeSource (Apt) if missing, then runs
# `npm install` and `npm run build`. Tested on Ubuntu 22.04 / 24.04 and
# Debian 12. Run from the repo root:
#   bash scripts/install-ubuntu.sh

set -euo pipefail

C_RESET=$'\033[0m'
C_BOLD=$'\033[1m'
C_GREEN=$'\033[32m'
C_YELLOW=$'\033[33m'
C_RED=$'\033[31m'

log()  { printf '%s==>%s %s\n' "$C_BOLD" "$C_RESET" "$*"; }
ok()   { printf '%s✓%s %s\n'   "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s!%s %s\n'   "$C_YELLOW" "$C_RESET" "$*"; }
die()  { printf '%s✗%s %s\n'   "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

[[ -f package.json ]] || die "Run this from the repo root (package.json not found here)."
grep -q '"noctis-wifi-planner"' package.json || die "package.json doesn't look like noctis-wifi-planner."

[[ "$(uname -s)" == "Linux" ]] || die "This script is for Linux. Use scripts/install-macos.sh on macOS."

# Choose the right sudo prefix. If the user is already root (e.g. a Docker
# container), apt commands don't need sudo and the binary may not exist.
SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "Not running as root and 'sudo' is not installed. Install sudo or rerun as root."
  SUDO="sudo"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  die "This script uses apt-get (Ubuntu/Debian). For other distros, install Node 18+ manually and run 'npm install && npm run build'."
fi

log "Updating package lists…"
$SUDO apt-get update -y -qq
ok "Package lists refreshed"

log "Checking for curl + ca-certificates (NodeSource requires them)…"
$SUDO apt-get install -y -qq curl ca-certificates gnupg
ok "curl/ca-certificates installed"

log "Checking for Node.js…"
need_node_install=0
if ! command -v node >/dev/null 2>&1; then
  need_node_install=1
else
  node_major=$(node --version | sed -E 's/^v([0-9]+).*/\1/')
  if [[ "$node_major" -lt 18 ]]; then
    warn "Node $node_major is too old (need >=18). Reinstalling…"
    need_node_install=1
  fi
fi

if [[ "$need_node_install" -eq 1 ]]; then
  log "Installing Node 20 LTS from NodeSource…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y -qq nodejs
fi
ok "Node $(node --version), npm $(npm --version)"

log "Installing project dependencies (npm install)…"
npm install
ok "Dependencies installed"

log "Running tests…"
npm test
ok "Tests pass"

log "Building production bundle…"
npm run build
ok "Built to ./dist/"

cat <<EOF

${C_BOLD}All set.${C_RESET} Two ways to run it:

  ${C_GREEN}npm run dev${C_RESET}                  → http://localhost:5173 (hot reload)
  ${C_GREEN}xdg-open dist/index.html${C_RESET}     → portable, no server needed

EOF
