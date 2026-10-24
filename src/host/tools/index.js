/**
 * 工具定义的**汇总入口**（`src/host/tools/` 的门面）。
 *
 * ## 15 个工具怎么分布
 *
 * | 文件 | 工具 | 个数 |
 * | --- | --- | ---: |
 * | `content.js` | import_novel · set_storyboard · save_context · update_shot · create_asset · update_asset · bind_asset | 7 |
 * | `production.js` | run_stage · regenerate_shot · assemble_chapter · set_chapter_music | 4 |
 * | `rollback.js` | rollback | 1 |
 * | `plan.js` | update_plan | 1 |
 * | `skills.js` | skill · skill_reference | 2 |
 * | **合计** | | **15** |
 *
 * ## 共享上下文怎么来的
 *
 * 原来 15 个工具挤在一个闭包里（`createToolDefinitions` 953 行），共享的东西靠闭包捕获。
 * 拆开后改成显式的**上下文对象**：
 *
 * ```
 * createToolDefinitions({ store, config, deps })
 *   └─ 造变更日志上下文（changelogs / batchCounters 是**实例级**状态）
 *        └─ 造 ToolContext { store, config, deps, commit, changelogOf, syncChangelog }
 *             ├─ createContentTools(ctx)
 *             ├─ createProductionTools(ctx)
 *             ├─ createRollbackTools(ctx)
 *             ├─ createPlanTools(ctx)
 *             └─ createSkillReadTools()
 * ```
 *
 * ⚠️ **顺序有意义**：返回的数组顺序 = 模型在工具清单里看到的顺序，
 *    与拆分前保持一致（内容类 → 生产类 → 回滚 → 执行路径 → 技能）。
 */
import { createChangelogContext } from './changelog.js';
import { createContentTools } from './content.js';
import { createPlanTools } from './plan.js';
import { createProductionTools } from './production.js';
import { createRollbackTools } from './rollback.js';
import { createSkillReadTools } from './skills.js';

/**
 * 生成全部工具定义。
 *
 * @param {{ store: import('../projection.js').ProjectionStore, config: object,
 *           deps?: object }} deps 依赖。
 *   `deps` = 宿主注入的**能力对象**（通道客户端 / 探测客户端等）：
 *   `probe`（探测客户端）/ `comfyClient` / `runningHubClient` / `dshCall` /
 *   `uploadFile` / `userWorkflows` / `hw` / `vramGb` / `ffmpegClient` …
 *   没有它，触发类工具既跑不起来、也说不清「缺哪个能力」。
 * @returns {object[]} `ToolDefinition` 数组（15 个）。
 */
export function createToolDefinitions({ store, config, deps = {} }) {
  // 变更日志引擎（回滚要用）——**每个插件实例一份**。
  const changelog = createChangelogContext({ store, config });
  const ctx = {
    store,
    config,
    deps,
    commit: changelog.commit,
    changelogOf: changelog.changelogOf,
    syncChangelog: changelog.syncChangelog,
  };

  return [
    ...createContentTools(ctx),
    ...createProductionTools(ctx),
    ...createRollbackTools(ctx),
    ...createPlanTools(ctx),
    ...createSkillReadTools(),
  ];
}
