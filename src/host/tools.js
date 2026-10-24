/**
 * 宿主半的**工具定义入口**（薄壳）。
 *
 * ## 为什么还留这个文件
 *
 * 实现按职责拆进了 `src/host/tools/`（7 个文件，每个 100–470 行）：
 *
 * | 文件 | 负责 |
 * | --- | --- |
 * | `tools/index.js` | 汇总：造共享上下文 + 拼 15 个工具 |
 * | `tools/shared.js` | 类型定义 + 工具工厂 + 通用辅助 |
 * | `tools/changelog.js` | 变更日志引擎 + 行快照 / diff |
 * | `tools/content.js` | 7 个内容类工具 |
 * | `tools/production.js` | 5 个生产类工具 |
 * | `tools/rollback.js` | 回滚工具 |
 * | `tools/skills.js` | 2 个只读技能工具 |
 *
 * 原来这里是**一个 1635 行的巨型文件**（`createToolDefinitions` 一个函数占 953 行，
 * 15 个工具全挤在里面）。拆分的动机很简单：改任何一个工具都要在 1600 行里找。
 *
 * ## 保持不变的契约
 *
 * - 导出名仍是 `createToolDefinitions`，签名不变 ⇒ `src/host/apply.js` 不用改。
 * - 15 个工具的 name / description / parameters / output / execute **逐字未变**。
 * - 工具在清单里的**顺序**不变（内容类 → 生产类 → 回滚 → 技能）。
 *
 * ## 三条铁律（拆开后依然成立）
 *
 * 1. **工具参数封闭**（§6.5）：`parameters` 只列内容字段，产物字段根本不出现 ——
 *    模型传了也进不来。
 * 2. **状态怎么进日志**（R1 + R2）：工具返回值带 `patch`；`output.presentationMeta`
 *    把它包成 `meta.reelforge` 持久化到 `tool/result` 事件上，投影层 fold 重建状态 ——
 *    不新增会话事件 type，状态完全可从日志重建。
 * 3. **不用 `defineTool`**：宿主那个 helper 住在外部插件拿不到的包里，
 *    而本插件坚持零额外依赖，所以直接构造 `ToolDefinition`。
 */
export { createToolDefinitions } from './tools/index.js';
