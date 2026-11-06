# 嫣汐 Character Pack（草案）

这是 Phase 1.5 的角色包脚手架，**尚未被运行时加载**。

现状：
- 云端仍由 `dsh-yanxi` + profile prompt 覆盖驱动
- 本 pack 先把“角色应该由哪些只读文件描述”固定下来
- 数据运行时写入 `dataRoot`，不写进 pack

下一步：
1. 运行时支持读取 `character.json`
2. 当前嫣汐数据迁移到 `dataRoot`
3. 单角色 Gateway 绑定
4. 行为回归

## 参考音频

- `assets/yanxi-reference.wav`：登录+互动拼接混合参考，约 66.8 秒
- 克隆音色：`yanxiClone04`
- 原始 217 条语音包不随仓库发布
