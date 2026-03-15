#!/usr/bin/env bash
set -euo pipefail

# BrandIt — Automated Setup
# Registers BrandIt as a Claude Code plugin by merging config into ~/.claude/settings.json

SETTINGS_DIR="$HOME/.claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.json"
BRANDIT_PATH="$(cd "$(dirname "$0")" && pwd)"

# --- Colors (fall back to plain text if no tty) ---
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi

info()    { echo -e "${BOLD}$1${RESET}"; }
success() { echo -e "${GREEN}OK${RESET} $1"; }
error()   { echo -e "${RED}ERROR${RESET} $1" >&2; }
warn()    { echo -e "${YELLOW}NOTE${RESET} $1"; }

# --- Prerequisites ---
check_prereqs() {
  local missing=0

  if ! command -v claude &>/dev/null; then
    error "'claude' not found. Install Claude Code: https://claude.ai/download"
    missing=1
  fi

  if ! command -v node &>/dev/null; then
    error "'node' not found. Install Node.js: https://nodejs.org"
    missing=1
  fi

  if ! command -v jq &>/dev/null; then
    error "'jq' not found. Install it: brew install jq"
    missing=1
  fi

  if [[ $missing -ne 0 ]]; then
    echo ""
    echo "Install missing tools, then run this script again."
    exit 1
  fi

  success "Prerequisites (claude, node, jq)"
}

# --- Install ---
install_brandit() {
  mkdir -p "$SETTINGS_DIR"

  if [[ ! -f "$SETTINGS_FILE" ]]; then
    echo '{}' > "$SETTINGS_FILE"
    warn "Created $SETTINGS_FILE"
  fi

  if ! jq empty "$SETTINGS_FILE" 2>/dev/null; then
    error "$SETTINGS_FILE contains invalid JSON."
    error "Fix it manually or delete it, then run this script again."
    exit 1
  fi

  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  success "Backed up settings to settings.json.bak"

  jq --arg path "$BRANDIT_PATH" '
    .extraKnownMarketplaces.brandit.source = {
      "source": "directory",
      "path": $path
    } |
    .enabledPlugins["brandit@brandit"] = true
  ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  success "Registered BrandIt plugin at $BRANDIT_PATH"

  local ok=1
  jq -e '.extraKnownMarketplaces.brandit.source.path' "$SETTINGS_FILE" >/dev/null 2>&1 || ok=0
  jq -e '.enabledPlugins["brandit@brandit"] == true' "$SETTINGS_FILE" >/dev/null 2>&1 || ok=0

  if [[ $ok -eq 1 ]]; then
    success "Verified installation"
  else
    error "Verification failed. Check $SETTINGS_FILE manually."
    error "A backup is at $SETTINGS_FILE.bak"
    exit 1
  fi

  # Install npm dependencies if not already present
  if [[ ! -d "$BRANDIT_PATH/node_modules" ]]; then
    info "Installing dependencies..."
    (cd "$BRANDIT_PATH" && npm install --silent)
    success "Dependencies installed"
  else
    success "Dependencies already installed"
  fi

  print_quickstart
}

# --- Uninstall ---
uninstall_brandit() {
  if [[ ! -f "$SETTINGS_FILE" ]]; then
    warn "No settings file found at $SETTINGS_FILE. Nothing to uninstall."
    exit 0
  fi

  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  success "Backed up settings to settings.json.bak"

  jq '
    del(.extraKnownMarketplaces.brandit) |
    del(.enabledPlugins["brandit@brandit"]) |
    if .extraKnownMarketplaces == {} then del(.extraKnownMarketplaces) else . end |
    if .enabledPlugins == {} then del(.enabledPlugins) else . end
  ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  success "BrandIt removed from settings"
  echo ""
  echo "To reinstall: ./setup.sh"
}

# --- Quick Start Guide ---
print_quickstart() {
  echo ""
  info "==========================================="
  info " BrandIt installed!"
  info "==========================================="
  echo ""
  echo "Start a new Claude Code session, then:"
  echo ""
  info "  Generate brand identity for a new idea:"
  echo "  /brandit A habit tracker for remote teams"
  echo ""
  info "  Or after running ProveIt:"
  echo "  /brandit"
  echo "  (reads discovery.md from the current directory)"
  echo ""
  info "  What you'll get:"
  echo "  - 3 complete brand directions to choose from"
  echo "  - AI-generated logo with your brand fonts"
  echo "  - Design system tokens (CSS + JSON)"
  echo "  - Brand guidelines document (brand.md)"
  echo ""
  info "  Tip: Run ProveIt first for smarter brand suggestions:"
  echo "  /proveit → validate → /brandit → brand it"
  echo ""
}

# --- Main ---
case "${1:-}" in
  --uninstall)
    info "Uninstalling BrandIt..."
    check_prereqs
    uninstall_brandit
    ;;
  --help|-h)
    echo "Usage: ./setup.sh [--uninstall]"
    echo ""
    echo "  ./setup.sh             Install BrandIt as a Claude Code plugin"
    echo "  ./setup.sh --uninstall Remove BrandIt from Claude Code settings"
    ;;
  "")
    info "Installing BrandIt..."
    check_prereqs
    install_brandit
    ;;
  *)
    error "Unknown option: $1"
    echo "Usage: ./setup.sh [--uninstall]"
    exit 1
    ;;
esac
