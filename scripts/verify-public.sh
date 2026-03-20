#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${E2E_BASE_URL:-https://bb.keti.eu.org}"

echo "[verify-public] base url: ${BASE_URL}"

echo "[1/3] Typecheck"
npm run -s typecheck

echo "[2/3] 角色权限回归（公网）"
E2E_BASE_URL="$BASE_URL" npm run -s e2e:auth

echo "[3/3] 站点健康审计（本地容器）"
npm run -s audit:site

echo "[verify-public] done"
