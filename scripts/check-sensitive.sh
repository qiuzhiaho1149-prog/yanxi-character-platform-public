#!/usr/bin/env bash
# 提交前敏感信息扫描。用法:
#   scripts/check-sensitive.sh --staged   只查暂存区（index）
#   scripts/check-sensitive.sh            查工作区 tracked 文件
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 通用密钥/凭据模式。不要在公开脚本里写真实 QQ/IP/token。
PATTERNS=(
  'sk-[A-Za-z0-9_-]{24,}'
  'SESSDATA=[A-Za-z0-9%]{20,}'
  'bili_jct=[A-Za-z0-9]{20,}'
  'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY'
  '[A-Za-z0-9._%+-]+@(gmail|qq|outlook|163|126|icloud)\.[A-Za-z]{2,}'
)

# 本地实例标识只放在被 ignore 的 denylist 里（真实 QQ/群/IP/路径）。
DENYLIST="${SENSITIVE_DENYLIST:-$ROOT/scripts/sensitive-denylist.local}"
if [ -f "$DENYLIST" ]; then
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    PATTERNS+=("$line")
  done < "$DENYLIST"
fi

EXCLUDES=(
  ':(exclude)scripts/check-sensitive.sh'
  ':(exclude)scripts/sensitive-denylist.local'
  ':(exclude)部署/private/**'
)

MODE="${1:-}"
HITS=0
for pat in "${PATTERNS[@]}"; do
  if [ "$MODE" = "--staged" ]; then
    OUT=$(git grep --cached -nEI "$pat" -- . "${EXCLUDES[@]}" 2>/dev/null || true)
  else
    OUT=$(git grep -nEI "$pat" -- . "${EXCLUDES[@]}" 2>/dev/null || true)
  fi
  if [ -n "$OUT" ]; then
    echo "敏感模式命中: $pat"
    printf '%s\n' "$OUT" | head -5
    HITS=$((HITS+1))
  fi
done

if [ "$HITS" -gt 0 ]; then
  echo
  echo "发现 $HITS 类敏感内容。请替换为占位符后再提交。"
  echo "规则示例见 SECURITY.md；真实实例值放 scripts/sensitive-denylist.local（已 ignore）。"
  exit 1
fi
echo "敏感扫描通过"
