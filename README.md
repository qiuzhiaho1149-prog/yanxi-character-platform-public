# 嫣汐 · 角色成长平台

> 一个可自托管的角色成长系统：**Kernel 负责「怎么活」，Character Pack 负责「谁在活」，Window 负责「在哪活」**。  
> 当前处于 Phase 0 / Phase 1.5：嫣汐单角色 QQ 实验版已跑通，正在做角色包、数据隔离和云端编排。

## 它是什么

- 不是一段固定人格 prompt，而是从事件流里长出来的角色
- 同一个角色可以有多个窗口（QQ 私聊/群、B 站、本地）
- 换角色不重写内核；换平台不改角色
- 角色有生活能力，但看不到密钥、其他角色/会话和宿主内部
- 目标是开源可迁移的 Character Pack，而不是绑定某个平台

## 当前能力

| 模块 | 状态 |
| --- | --- |
| QQ 私聊/群（真号 OneBot） | 可用 |
| 角色成长事件流 / 日记 / 心情 | 可用 |
| 图片、表情包、GIF 识别 | 已接入自动视觉描述 |
| 语音收发（克隆音色 + 语音导演） | 可用，持续调 |
| 群聊 @ / 名字唤醒 / 概率插话 | 已修，待回归 |
| B 站浏览 / 评论 | 已配置 |
| 500 条/天出站预算 | 可用 |
| Character Pack 只读加载 | 可用 |
| 独立角色数据卷 | 可用（Phase 1.5） |
| Gateway / 多角色 Worker | 未实现 |

## 架构

```text
QQ / B站 / 本地
      │  Window Adapter
      ▼
Gateway（规划中）
      │
Character Runtime（当前：dsh-yanxi）
      │
Character Pack（种子/行为/资产/窗口策略）
      │
Event Log（只追加）+ Memory + Social + Media
```

详细设计：

- [项目总览](项目总览.md)
- [项目章程](项目/00-项目章程.md)
- [需求规格](项目/01-需求规格.md)
- [系统架构](项目/02-系统架构.md)
- [云端多角色与热插拔架构](项目/08-云端多角色与热插拔架构.md)
- [提示词与人格设计原则](项目/05-提示词与人格设计原则.md)
- [当前状态与交接](项目/04-当前状态与交接.md)

## 仓库结构

```text
项目/                 当前权威项目文档
packs/yanxi/          嫣汐 Character Pack（草案，runtime 只读加载）
插件/dsh-yanxi/       角色成长引擎（基于 dsh-fish fork）
插件/dsh-yanxi-life/  生活沙箱
插件/dsh-yanxi-vision/视觉工具
部署/cloud-patches/   云端补丁 overlay / sidecar / profile 模板
人设/                 嫣汐人设与资料
```

## 快速开始

1. 安装 DSH（DeepSeek Harness）
2. 复制 `.env.example` 为 `.env`，填入自己的 key/账号
3. 安装 `插件/` 下的 bundle，按 `部署/cloud-patches/README.md` 配置 OneBot / NapCat
4. 按 `项目/06-运维与故障恢复.md` 启动服务
5. 用 `scripts/check-sensitive.sh` 检查是否误提交了实例值

> 本仓库不包含任何真实 QQ 号、群号、服务器 IP、cookie、API key 或运行时数据。

## 开源与素材

- 代码：MIT，见 [LICENSE](LICENSE)
- 安全与脱敏：[SECURITY.md](SECURITY.md)
- 贡献：[CONTRIBUTING.md](CONTRIBUTING.md)
- 开源发布前请读：[项目/09-开源发布与脱敏.md](项目/09-开源发布与脱敏.md)

**角色名、音色、参考音频、立绘、歌词、第三方插件素材不一定在 MIT 范围内。** 发布 Character Pack 前请确认授权；不要把没有授权的角色素材随代码一起开源。

## 当前不做

- 群主动加群/加好友
- 同 QQ 号多角色共用一个窗口
- 无限主动推送
- 全平台同时上线
