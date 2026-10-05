#!/usr/bin/env bash
# Installs JS workspace deps when running in a Claude Code cloud session.
# Unity (client/) cannot be opened in the cloud; only web, backend, packages and marketing.
set -u
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1 || npm i -g pnpm@9.15.4 >/dev/null 2>&1
pnpm install --frozen-lockfile >/dev/null 2>&1 || pnpm install >/dev/null 2>&1 || echo "cloud-setup: pnpm install failed" >&2
exit 0
