# 贡献指南

## 先读

- `项目/README.md`：项目入口
- `项目/00-项目章程.md`：边界与三原则
- `项目/01-需求规格.md`：优先级
- `项目/05-提示词与人格设计原则.md`：提示词正向优先
- `AGENTS.md`：Agent 工作规则

## 开发

```bash
cd 插件/dsh-yanxi
node --test
```

- 零依赖是 `dsh-yanxi` 的硬约束；不要加 npm 依赖。
- 事件流只追加，不删除/重排。
- 不改写 `seed` 事件；角色数据属于运行数据。
- 云端改动必须同步到 `部署/cloud-patches/` 或源码，不能只留在服务器。

## 提示词

- 写“她怎么反应”，不要枚举“不要提 X”。
- 身份默认，不自我介绍、不自证。
- 安全/隐私边界优先放 guard/输出过滤器，不塞进角色台词清单。

## 提交

```bash
git config core.hooksPath .githooks
scripts/check-sensitive.sh --staged
```

不要提交 `.env`、真实 QQ 号/群号、服务器 IP、cookie、二维码、会话记录、私有部署手册。

## 素材授权

代码是 MIT，但角色名、音色、参考音频、立绘、歌词、第三方插件素材不一定在 MIT 范围内；提交前确认授权。
