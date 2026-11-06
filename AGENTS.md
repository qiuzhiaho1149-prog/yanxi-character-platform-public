# 嫣汐项目 · Agent 工作规则

> 本文件是项目级硬规则。系统/用户/开发者指令优先于本文件。
> 开始任何工作前，先读 [`项目总览.md`](项目总览.md) 和 [`项目/04-当前状态与交接.md`](项目/04-当前状态与交接.md)。

## 0. 运行边界（最高优先级）

**本机 = 仓库开发 + 文档 + 备份 + 编辑。不是角色运行环境。**

严禁在本机启动或运行：

- DSH 角色运行实例 / NapCat / OneBot / QQ 协议端
- TTS / MiniMax / 语音合成 / 语音切片 / ffmpeg 音频处理
- 角色调度器 / B 站自动任务 / 好友自动同意
- 任何会被当成“线上验证”的服务

**所有实际运行、功能测试、联调、上线验证都在云端。**

本机只允许：

- 编辑源码、文档、prompt、pack
- `git` 提交/备份/推送
- 与云端做文件同步
- 查看云端日志（通过 SSH）

如果发现本地有角色/TTS/QQ 相关进程，先确认是不是用户原有界面，不得擅自启动新的。

## 1. 云端环境

真实实例值放 `部署/private/实例值.local.md`（已 ignore，不进公开仓库）。
公开文档/AGENTS 里只写占位符。

| 项 | 位置 |
| --- | --- |
| 云端主机 | `<SERVER_IP>`（见私有实例值） |
| 云端用户 | `<DEPLOY_USER>` |
| DSH profile | `/home/<DEPLOY_USER>/.dsh/profiles/yanxi` |
| 角色数据根 | `/var/lib/yanxi/characters/yanxi` |
| 角色包 | `/var/lib/yanxi/characters/yanxi/character-packs/yanxi` |
| 环境变量 | `/etc/dsh-yanxi.env`（600） |
| OneBot WS | `127.0.0.1:3001` |
| 预算代理 | `127.0.0.1:3002` |
| DSH Web | `127.0.0.1:8790`（不暴露公网） |
| TTS 脚本 | `/home/<DEPLOY_USER>/minimax_voice.py` |
| TTS venv | `/home/<DEPLOY_USER>/voice-venv` |
| 语音参考 | `/home/<DEPLOY_USER>/voice-refs/` |
| 服务 | `dsh-yanxi` / `napcat-budget-proxy` / `napcat-owner-gate` / `napcat` Docker |

## 2. 云端部署/更新流程

### 2.1 本地

1. 修改本仓库文件（源码 / prompt / pack / cloud-patches）
2. `bash scripts/check-sensitive.sh`
3. `git add/commit/push`
4. 只把需要上线的文件同步到云端

### 2.2 云端

```bash
export CLOUD_HOST='<SERVER_IP>'
export CLOUD_USER='<DEPLOY_USER>'
PROFILE="/home/$CLOUD_USER/.dsh/profiles/yanxi"
DATA_ROOT='/var/lib/yanxi/characters/yanxi'

# 1. 先备份
ssh "$CLOUD_USER@$CLOUD_HOST" "cp -a '$PROFILE' '$PROFILE.bak.$(date +%Y%m%d-%H%M%S)'"

# 2. 上传变更文件（示例）
scp -r 插件/dsh-yanxi/lib/*.js \
  "$CLOUD_USER@$CLOUD_HOST:$PROFILE/node_modules/dsh-yanxi/lib/"

scp -r 部署/cloud-patches/qq-onebot-overlay/src/* \
  "$CLOUD_USER@$CLOUD_HOST:$PROFILE/node_modules/dsh-qq-onebot/src/"

# 3. pack / profile / env
scp -r packs/yanxi/* "$CLOUD_USER@$CLOUD_HOST:$DATA_ROOT/character-packs/yanxi/"
# cordis.patch.yml 按私有实例值脱敏/替换后再上传，不能直接传占位符

# 4. 重启
ssh "$CLOUD_USER@$CLOUD_HOST" 'sudo systemctl restart dsh-yanxi'

# 5. 验证
ssh "$CLOUD_USER@$CLOUD_HOST" 'systemctl is-active dsh-yanxi; sudo docker ps --filter name=napcat; tail -50 /var/lib/yanxi/characters/yanxi/logs/dsh-yanxi.log'
```

### 2.3 部署后

- 在云端用真实 QQ/语音/图片验证，不在本机模拟
- 更新 `项目/04-当前状态与交接.md`，写 PASS / FAIL / NOT RUN
- 云端手工改动必须回写 `部署/cloud-patches/` 或源码，避免漂移

## 3. 修改归属

- Kernel / Character Pack / Window / Operations 的边界按 `项目/02` 判断
- 角色专属逻辑放 `packs/`，平台逻辑放插件/Kernel
- 云端不是唯一副本：云端改完必须回写仓库
- 不直接在云端改大段代码；先本地改、检查、再部署
- 不把测试脚本、临时音频、日志写到本机运行目录

## 4. 测试与验证

- **功能测试、TTS 验证、QQ 收发、图片/语音入站、B 站任务、上线验证：只在云端做**
- 本机允许 `node --check`、`git diff`、`git status` 等静态检查；不允许本机启动运行时
- 验证结论只写云端证据：日志、消息 ID、服务状态、云端文件
- 不拿本机生成的音频冒充云端 TTS 结果
- 任何“已修复”必须对应云端验证；没有就写 NOT RUN

## 5. 提示词纪律

- 角色 prompt 正向优先：写“她怎么反应”，不堆“不要提 X”
- 身份默认：直接进入事情，不自我介绍、不自证
- 一条消息只做一件事，答完就停；第二句必须带新信息
- 被叫到时先给具体状态/反应，不写通用接话
- 安全/隐私/泄露硬边界交给 guard/输出过滤器，prompt 只留最少原则
- 详细见 `项目/05`

## 6. 开源源码纪律

- 提交前 `scripts/check-sensitive.sh --staged`
- 不提交真实 QQ/群号、服务器 IP、cookie、API key、个人路径、二维码、会话/日记/事件流
- 真实实例值只在 `部署/private/` 或云端 env
- 公开仓库用 `scripts/export-public.sh` 生成脱敏快照
- 私有仓库历史未重写，不要直接把私有仓库改 public
- 素材授权（角色名/音色/参考音频/立绘/歌词）单独确认

## 7. 当前关键陷阱

- QQ 群：`requireMention: true` + `groupWakeProbability`；`false` 会每句都回
- 语音：MiniMax 余额不足返回 1008；`qq_send_voice` 要过 dsh-yanxi guard
- 空间效果：官方 4 个固定 sound_effects，无强度参数；默认关闭
- 唱歌：TTS 不能唱歌；克隆音色不能直接接 Music；真唱需 MUTA/AISingers 或 RVC
- 图片：依赖 `vision-inline.js` + `DEEPSEEK_API_KEY`
- 账号：机房 IP 风控，掉线需重新扫码；不要频繁重启 NapCat
- seed：事件流只追加；云端 seed 与本地 pack 可能不同步，行为层走 selfdoc
- 云端路径曾因脱敏被写成 `/home/<user>`；部署前必须确认实际 `RUNTIME_HOME`

## 8. 收尾

- 更新 `项目/04` 当前状态/已知问题/下一步
- 有架构影响：更新 `项目/02`；需求：`项目/01`；路线：`项目/03`；决策：`项目/07`
- 验证结果写 PASS / FAIL / NOT RUN，不写“应该可以”
- 不删除历史文档/事件流
