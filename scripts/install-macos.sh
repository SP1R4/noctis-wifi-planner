#!/usr/bin/env bash
# NOCTIS WiFi Planner — macOS installer
# Installs Homebrew (if missing) and Node.js, then runs `npm install` and
# `npm run build`. Run from the repo root:
#   bash scripts/install-macos.sh

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

# Sanity check: we expect to run from the repo root.
[[ -f package.json ]] || die "Run this from the repo root (package.json not found here)."
grep -q '"noctis-wifi-planner"' package.json || die "package.json doesn't look like noctis-wifi-planner."

[[ "$(uname -s)" == "Darwin" ]] || die "This script is for macOS. Use scripts/install-ubuntu.sh on Linux."

log "Checking for Homebrew…"
if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew not found. Installing from https://brew.sh …"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon shells need brew on PATH for the rest of this script.
  if [[ -x /opt/homebrew/bin/brew ]]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
  if [[ -x /usr/local/bin/brew ]];   then eval "$(/usr/local/bin/brew shellenv)";   fi
fi
ok "Homebrew $(brew --version | head -1)"

log "Checking for Node.js…"
if ! command -v node >/dev/null 2>&1; then
  warn "Node.js not found. Installing via Homebrew…"
  brew install node
fi
node_major=$(node --version | sed -E 's/^v([0-9]+).*/\1/')
[[ "$node_major" -ge 18 ]] || die "Node $node_major detected; need >=18. Try: brew upgrade node"
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
  ${C_GREEN}open dist/index.html${C_RESET}         → portable, no server needed

EOF
