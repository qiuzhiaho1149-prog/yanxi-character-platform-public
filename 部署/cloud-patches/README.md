# 云端补丁包（P0.1）

> 目的：把当前云端跑着、但只存在于服务器上的改动收进仓库，避免“重装/升级就丢”。

## 来源与版本

- 上游：`dsh-qq-onebot@1.2.8`（MIT）
- 当前云端：`/home/<user>/.dsh/profiles/yanxi/node_modules/dsh-qq-onebot/`
- 本目录 overlay 是云端实际运行的修改版文件
- `dsh-yanxi` 是本地 fork，`dsh-yanxi-overlay/lib/restrict.js` 是云端额外白名单补丁

## 内容

```text
qq-onebot-overlay/
  src/tools.js           # qq_send_voice + 语音导演 + MiniMax 调用
  src/prompts.js         # 正向行为规则 + 图片/群规则
  src/inbound.js         # 图片自动描述注入
  src/outbound.js        # 错误兜底：不把 provider 原文发到 QQ
  src/context-guard.js   # 窗口未知时的绝对阈值兜底
  src/onebot/segment.js  # QQ face/mface 处理
  src/face-map.js        # 169 个 QQ 表情名（src 顶层）
  src/onebot/face-map.js # 同上，onebot 目录副本
  src/vision-inline.js   # DeepSeek Flash 视觉描述
dsh-yanxi-overlay/
  lib/restrict.js        # HER_TOOLS 加入 see_image / qq_send_voice
sidecars/
  owner-gate.js          # owner 好友/群邀请自动同意
  napcat-budget-proxy.js # 500 条/天预算代理
  minimax_voice.py       # MiniMax 克隆/TTS
profile/
  cordis.patch.template.yml  # 脱敏配置模板（accessToken 占位）
  package.json               # bundle 顺序
systemd/
  dsh-yanxi.service
  napcat-budget-proxy.service
  napcat-owner-gate.service
```

## 部署步骤

### 1. 备份

```bash
PROFILE=/home/<user>/.dsh/profiles/yanxi
cp -a "$PROFILE" "$PROFILE.bak.$(date +%Y%m%d-%H%M%S)"
```

### 2. 应用 QQ 插件 overlay

```bash
cd 部署/cloud-patches
PROFILE=/home/<user>/.dsh/profiles/yanxi
cp -a qq-onebot-overlay/src/. "$PROFILE/node_modules/dsh-qq-onebot/src/"
cp -a dsh-yanxi-overlay/lib/. "$PROFILE/node_modules/dsh-yanxi/lib/"
```

### 3. 安装 sidecar / systemd（首次）

```bash
sudo cp sidecars/owner-gate.js /home/<user>/napcat/owner-gate.js
sudo cp sidecars/napcat-budget-proxy.js /home/<user>/napcat/napcat-budget-proxy.js
sudo cp sidecars/minimax_voice.py /home/<user>/minimax_voice.py

sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now napcat-budget-proxy napcat-owner-gate
```

### 4. profile 配置

`profile/cordis.patch.template.yml` 是脱敏模板：

1. 复制到云端 `cordis.patch.yml`
2. 把 `<ONEBOT_ACCESS_TOKEN>` 换成真实 token
3. 确认 `MINIMAX_VOICE_ID` 在 `/etc/dsh-yanxi.env`，不在 profile
4. 重启 DSH

```bash
sudo systemctl restart dsh-yanxi
```

### 5. 验证

```bash
systemctl is-active dsh-yanxi napcat-budget-proxy napcat-owner-gate
sudo docker logs --tail 30 napcat
dsh --profile yanxi --dump-config | grep -E "requireMention|groupWakeProbability"
```

## 注意

- 这是**当前版本快照**，不是自动跟随上游升级的方案；升级 `dsh-qq-onebot` 后要重新生成 overlay/diff。
- 不要把真实 `accessToken`、cookie、`/etc/dsh-yanxi.env` 提交进仓库。
- `owner-gate.js` 会读取 `/home/<user>/napcat/onebot.token`，该文件不入库。
- 应用前先确认 QQ 小号在线，避免重启叠加掉线。
