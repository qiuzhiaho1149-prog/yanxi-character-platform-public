#!/usr/bin/env bash
# 生成公开快照：只复制白名单，不带历史/备份/私有实例值。
# 用法: scripts/export-public.sh /tmp/yanxi-public
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-/tmp/yanxi-public}"

if [ -e "$DEST" ] && [ "$(ls -A "$DEST" 2>/dev/null || true)" ]; then
  echo "目标已存在且非空：$DEST" >&2
  echo "换一个空目录，或手动清理后再运行。" >&2
  exit 1
fi
mkdir -p "$DEST"

FILES=(README.md SECURITY.md CONTRIBUTING.md LICENSE ASSETS.md AGENTS.md .env.example .gitignore .gitattributes)
for f in "${FILES[@]}"; do [ -e "$ROOT/$f" ] && cp -a "$ROOT/$f" "$DEST/"; done

DIRS=(项目 packs 插件 人设 scripts 部署 .githooks .github)
for d in "${DIRS[@]}"; do [ -d "$ROOT/$d" ] && cp -a "$ROOT/$d" "$DEST/"; done

# 不带私密部署值
rm -rf "$DEST/部署/private"
rm -f "$DEST/scripts/sensitive-denylist.local"
# 不带运行时生成物
find "$DEST" -name '*.local.md' -delete
find "$DEST" -name '.DS_Store' -delete

echo "公开快照: $DEST"
echo "文件数: $(find "$DEST" -type f | wc -l)"
echo "下一步：cd $DEST && git init -b main && git add -A && git commit"
