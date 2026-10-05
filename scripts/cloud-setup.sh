#!/usr/bin/env bash
# Prepares a Claude Code cloud session: JS workspace deps, the Remotion video project
# (marketing/video, npm) with its headless browser, and Pillow for marketing/brand scripts.
# Unity (client/) cannot be opened in the cloud.
set -u
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
log() { echo "cloud-setup: $*" >&2; }

command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1 || npm i -g pnpm@9.15.4 >/dev/null 2>&1
pnpm install --frozen-lockfile >/dev/null 2>&1 || pnpm install >/dev/null 2>&1 || log "pnpm install failed"

( cd marketing/video \
  && { npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1 || log "marketing/video npm install failed"; } \
  && { npx --no-install remotion browser ensure >/dev/null 2>&1 || log "remotion browser download failed"; } \
  && node scripts/prepare.mjs >/dev/null 2>&1 )

python3 -c "import PIL" 2>/dev/null || pip install --quiet pillow >/dev/null 2>&1 || log "pillow install failed"
if ! command -v ffmpeg >/dev/null 2>&1; then
  SUDO=""; [ "$(id -u)" = "0" ] || SUDO="sudo -n"
  { $SUDO apt-get update -qq && $SUDO apt-get install -y -qq ffmpeg; } >/dev/null 2>&1     || log "ffmpeg missing (Remotion bundles its own; marketing/brand video ads need it)"
fi
exit 0
