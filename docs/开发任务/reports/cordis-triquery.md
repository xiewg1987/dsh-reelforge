# cordis_inspect_query 三查归档

### cordis_inspect_query 三查

**状态**：本机 PATH 中**未找到** `cordis_inspect_query`（自动化跑数）。

**代码侧已冻结、装载验证已覆盖的扩展点**（`scripts/verify-bundle.mjs` + 源码）：

| 查项 | 本仓库结论 | 代码位置 |
| --- | --- | --- |
| `--service Tool` | `ctx.tools.register(definition)`，15 工具含 name/description/parameters/output/execute | `src/host/apply.js` · `src/host/tools.js` |
| `--event Event` | **不新增 type**；fold 监听 `session/event`；消息行挂 `tool/result` + `reelforge.kind` | `src/host/apply.js` · `src/host/chatEvents.js` |
| `--slots Slots` | 右栏 `sidebar.right.pane.tab`（key=Tab id）；聊天 `conversation.chat.node`（key=7 kind） | `src/client/entry.js` |
| 存储服务 | **未在本机 CLI 确认**；变更日志与私有目录走工作区 `.reelforge/` 与 `changelogStore` | `src/host/changelogStore.js` · `src/host/paths.js` |

**DSH 实机补验**（装上插件后人工执行一次并贴输出）：
```bash
cordis_inspect_query --service Tool
cordis_inspect_query --event Event
cordis_inspect_query --slots Slots
```

