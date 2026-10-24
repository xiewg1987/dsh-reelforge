/**
 * 回滚工具（1 个，触发类）。
 *
 * ## 三级回滚
 *
 * | mode | 键 | 语义 |
 * | --- | --- | --- |
 * | `single` | `entryId` | 回滚一条变更 |
 * | `batch` | `batchId` | 回滚一整批（一次工具调用 = 一个批次） |
 * | `timepoint` | `at`（ISO 时间串） | 回滚到某一刻之前的所有变更 |
 *
 * ## 关键纪律
 *
 * 1. **漂移保护**：快照之后这一行又被改过 ⇒ 返回 409，需要 `force` 才能覆盖。
 * 2. **回滚的写回必须进会话日志**：以前这里返回 `patch: []`，写回只落在内存投影里 ⇒
 *    重启后回滚「消失」（R1 破洞）。现在补丁跟着 `presentationMeta` 进日志 ⇒ 可重放。
 * 3. **回滚不写新的变更记录**：否则回滚 → 记录 → 再回滚，无限循环
 *    （见 `changelog.js` 里 `recordChanges` 的说明）。
 */
import { TOOL_IDS } from '../../core/constants.js';
import { buildChangelogPayload } from '../../core/changelogPayload.js';
import { projectIdOf } from './changelog.js';
import { defineReelForgeTool, sessionContext } from './shared.js';

/**
 * 回滚工具（1 个）。
 *
 * @param {import('./shared.js').ToolContext} ctx 工具上下文。
 * @returns {object[]} 工具定义数组。
 */
export function createRollbackTools(ctx) {
  const { store, changelogOf, syncChangelog } = ctx;
  return [
    defineReelForgeTool({
      name: TOOL_IDS.rollback,
      description:
        '回滚内容变更。三级回滚：mode=single 单条（给 entryId）/ mode=batch 整批（给 batchId）/ '
        + 'mode=timepoint 按时间点（给 at，ISO 时间串）。'
        + '记录已漂移时返回 409，需要 force 才能覆盖。媒体二进制不随回滚删除。需用户确认。',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['single', 'batch', 'timepoint'],
            description: '回滚模式',
          },
          entryId: { type: 'string', description: 'single 模式：单条回滚的记录 id' },
          batchId: { type: 'string', description: 'batch 模式：整批回滚的批次 id' },
          at: { type: 'string', description: 'timepoint 模式：回滚到该 ISO 时间点' },
          force: { type: 'boolean', description: '漂移时强制覆盖' },
        },
        required: ['mode'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };
        const engine = changelogOf(context.sessionId, context.cwd);
        const result = await engine.rollback({
          mode: args.mode,
          entryId: args.entryId,
          batchId: args.batchId,
          at: args.at,
          force: args.force,
          // 与记录变更时**同一个键**（见 `projectIdOf`）：两边对不上就查不到变更。
          projectId: projectIdOf(store.stateOf(context.sessionId), context.sessionId),
        });
        const patches = Array.isArray(result.patches) ? result.patches : [];
        // 回滚改了内容行 ⇒ 那些补丁必须进会话日志，否则**重放日志回不到回滚后的状态**
        // （R1）。以前这里返回 `patch: []`，写回只落在内存投影里 ⇒ 重启后回滚「消失」。
        // 顺带同步一份变更日志视图：回滚后漂移标记会变（当前行不再等于快照的 after）。
        const touched = (result.rolledBack ?? []).map(item => `${item.layer ?? ''}:${item.rowId ?? ''}`);
        await syncChangelog(context.sessionId, context.cwd, patches, touched);
        return {
          ok: result.ok !== false,
          status: result.status,
          code: result.code ?? null,
          mode: result.mode ?? args.mode,
          rolledBack: result.rolledBack ?? [],
          restored: result.restored ?? 0,
          forced: result.forced === true,
          conflicts: result.conflicts ?? [],
          message: result.message ?? '',
          notice: result.notice ?? '',
          patch: patches,
        };
      },
      chatKind: 'reelforge-changelog',
      chatData: (/** @param {import('./shared.js').RollbackResult} value @returns {object} */ (value) => buildChangelogPayload({
        entries: (value.rolledBack ?? []).map((item) => ({
          id: item.entryId ?? null,
          at: item.at ?? null,
          summary: `${item.layer ?? ''} ${item.rowId ?? ''} · ${item.field ?? ''}`,
          field: item.field ?? '*',
          batchId: item.batchId,
        })),
      })),
    }),
  ];
}
