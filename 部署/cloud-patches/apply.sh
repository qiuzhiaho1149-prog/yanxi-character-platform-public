#!/usr/bin/env bash
# 应用云端 overlay；先在服务器备份 profile，再复制文件，最后重启 DSH。
# 不会写入密钥；profile 模板需要手动替换 token。
set -euo pipefail

PROFILE="${PROFILE:-/home/<user>/.dsh/profiles/yanxi}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$PROFILE/node_modules/dsh-qq-onebot" ]; then
  echo "找不到 dsh-qq-onebot: $PROFILE" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp -a "$PROFILE" "$PROFILE.bak.$STAMP"
echo "备份: $PROFILE.bak.$STAMP"

cp -a "$ROOT/qq-onebot-overlay/src/." "$PROFILE/node_modules/dsh-qq-onebot/src/"
cp -a "$ROOT/dsh-yanxi-overlay/lib/." "$PROFILE/node_modules/dsh-yanxi/lib/"

echo "overlay 已应用。"
echo "下一步：核对 profile/cordis.patch.template.yml 与真实 cordis.patch.yml（token 不提交），然后："
echo "  sudo systemctl restart dsh-yanxi"
