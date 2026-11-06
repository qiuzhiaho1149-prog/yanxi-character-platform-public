#!/usr/bin/env bash
# 角色数据根 dry-run / 复制脚本（Phase 1.5）
# 用法:
#   ./migrate-character-data.sh                 # dry-run：只盘点，不写
#   sudo ./migrate-character-data.sh --copy     # 备份 + 复制到 target，不切换 root
set -euo pipefail

SOURCE="${SOURCE:-/home/<user>/.dsh-yanxi}"
TARGET="${TARGET:-/var/lib/yanxi/characters/yanxi}"
MODE="${1:-dry-run}"

KEY_FILES=(events.jsonl owner.json config.json home.json state.json)
DIARY_DIR="$SOURCE/diary"

echo "== 角色数据根盘点 =="
echo "source: $SOURCE"
echo "target: $TARGET"
echo "mode:   $MODE"

for f in "${KEY_FILES[@]}"; do
  if [ -e "$SOURCE/$f" ]; then
    printf '  %-12s %10s bytes  %s\n' "$f" "$(stat -c %s "$SOURCE/$f")" "$(stat -c %y "$SOURCE/$f" | cut -d. -f1)"
  else
    printf '  %-12s MISSING\n' "$f"
  fi
done

echo "  events lines: $(wc -l < "$SOURCE/events.jsonl" 2>/dev/null || echo 0)"
echo "  diary files:  $(find "$DIARY_DIR" -maxdepth 1 -type f 2>/dev/null | wc -l)"
echo "  total size:   $(du -sh "$SOURCE" 2>/dev/null | awk '{print $1}')"
echo "  target exists: $([ -e "$TARGET" ] && echo yes || echo no)"

if [ "$MODE" != "--copy" ]; then
  echo
  echo "DRY-RUN: 没有写入任何东西。确认后再用 --copy。"
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$SOURCE.bak.$STAMP"
echo
echo "备份 source → $BACKUP"
cp -a "$SOURCE" "$BACKUP"

echo "创建 target"
mkdir -p "$TARGET"
echo "复制（排除 character-packs / logs / instance.json）"
rsync -a --delete \
  --exclude 'character-packs/' \
  --exclude 'logs/' \
  --exclude 'instance.json' \
  "$SOURCE/" "$TARGET/"

echo "复制后核对："
for f in events.jsonl owner.json; do
  [ -e "$TARGET/$f" ] && echo "  $f: $(stat -c %s "$TARGET/$f") bytes"
done
echo "  target size: $(du -sh "$TARGET" | awk '{print $1}')"
echo
echo "COPY 完成；未切换 root。切换前请先验证事件流/日记/owner.json，再改 profile root。"
