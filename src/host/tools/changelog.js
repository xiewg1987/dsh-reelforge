/**
 * 变更日志引擎 + 行快照 / diff（**所有内容写入路径的公共出口**）。
 *
 * ## 这个文件为什么独立
 *
 * 「记变更」这件事横跨所有工具组：任何改了内容行的工具都要走同一条路
 * （写补丁 → 记变更 → 同步变更日志视图 → 物化落盘）。把它从工具组里抽出来，
 * 依赖关系才看得见：工具组只调 `commit()`，变更引擎的实现细节不外泄。
 *
 * ## 关键约束
 *
 * 1. **`commit` 是所有正常写入路径的唯一入口** —— 挂在它上面 = 「凡是改了内容行，
 *    就一定有一条变更记录」，回滚才有依据。
 * 2. **回滚不能再造变更记录** —— 否则回滚 → 记录 → 再回滚，无限循环。
 *    回滚走的是 `changelogOf` 里那个只做物化的 `commit` 回调，不经过 `recordChanges`。
 * 3. **记日志失败不影响主流程** —— 变更日志是**辅助**产物，写不进去只 `console.warn`。
 */
import { CHANGELOG_LAYERS, sameRow } from '../../core/changelog.js';
import { createHostChangelog, readRows } from '../changelogStore.js';
import { materialize, changelogView } from './shared.js';

/**
 * 变更日志上下文：**每个插件实例一份**（`changelogs` / `batchCounters` 都是实例级状态）。
 *
 * @param {{ store: import('../projection.js').ProjectionStore, config: object }} deps 依赖。
 * @returns {{
 *   changelogOf: (sessionId: string, cwd: string) => object,
 *   recordChanges: (sessionId: string, cwd: string, before: Record<string, object|null>, after: Record<string, object|null>) => Promise<string[]>,
 *   syncChangelog: (sessionId: string, cwd: string, patches: object[], changedKeys: string[]) => Promise<void>,
 *   commit: (sessionId: string, cwd: string, patches: object[]) => Promise<object[]>,
 *   nextBatchId: (sessionId: string) => string,
 * }} 变更日志上下文。
 */
export function createChangelogContext({ store, config }) {
  /** 变更日志引擎（回滚要用）。每个会话一份。 */
  const changelogs = new Map();
  const changelogOf = (sessionId, cwd) => {
    const existing = changelogs.get(sessionId);
    if (existing !== undefined) return existing;
    const engine = createHostChangelog({
      store,
      sessionId,
      cwd,
      config,
      commit: async (id, patches) => {
        await materialize(store.stateOf(id), cwd, config);
        void patches;
      },
    });
    changelogs.set(sessionId, engine);
    return engine;
  };

  /** 每个会话一个批次计数：一次工具调用 = 一个 batch（回滚 mode=batch 按它整批回退）。 */
  const batchCounters = new Map();

  /**
   * 记下这一笔内容变更（**best-effort**）。
   *
   * ## 为什么挂在 `commit` 上
   *
   * `commit` 是**所有正常写入路径的唯一入口**（工具 → 补丁 → 投影 → 落盘）。
   * 挂在这里 = 「凡是改了内容行，就一定有一条变更记录」，回滚才有依据。
   *
   * ## 为什么不挂在回滚的写回路径上
   *
   * 回滚自己**不能再造一条变更记录**——否则回滚 → 记录 → 再回滚，无限循环。
   * 回滚走的是 `changelogOf` 里那个只做物化的 `commit` 回调，不经过这里。
   *
   * ## 记日志失败不影响主流程
   *
   * 变更日志是**辅助**产物：写不进去只 `console.warn` 记下原因，
   * 不让工具调用失败（否则一次磁盘故障会挡住全部内容写入）。
   *
   * @param {string} sessionId 会话 id。
   * @param {string} cwd 会话工作目录。
   * @param {Record<string, object|null>} before 写入前的行索引。
   * @param {Record<string, object|null>} after 写入后的行索引。
   * @returns {Promise<string[]>} 记了变更的行键（`layer:rowId`）；失败时是空数组。
   */
  const recordChanges = async (sessionId, cwd, before, after) => {
    const changedKeys = [];
    try {
      const changes = diffRows(before, after);
      if (changes.length === 0) return changedKeys;
      const engine = changelogOf(sessionId, cwd);
      const projectId = projectIdOf(store.stateOf(sessionId), sessionId);
      const batchId = nextBatchId(sessionId);
      for (const change of changes) {
        const { layer, rowId } = splitRowKey(change.key);
        // 未知层不猜：变更日志只认 CHANGELOG_LAYERS 里的层。
        if (!CHANGELOG_LAYERS.includes(layer)) continue;
        changedKeys.push(change.key);
        await engine.record({
          projectId,
          layer,
          rowId,
          op: change.op,
          field: '*',
          before: change.before,
          after: change.after,
          batchId,
        });
      }
    } catch (error) {
      console.warn(
        '[reelforge] 变更日志记录失败（不影响本次写入）：',
        error?.message ?? error,
      );
    }
    return changedKeys;
  };

  /**
   * 把变更日志同步进投影 —— **`changelog.set` 的产出方**（§7 B6）。
   *
   * ## 以前为什么日志页永远是空的
   *
   * `changelog.set` 这个 op 全仓库**只有定义（`projection.js`）没有产出方**：
   * 变更记在工作区的 JSONL 里，但那份数据**从来没进过投影** ⇒ 客户端读到的
   * `changelog.entries` 恒为空数组 ⇒ 日志页恒空态。
   *
   * ## 现在怎么做
   *
   * 凡是改了内容行 → 记一条变更 → 把**变更视图**追加成一条 `changelog.set` 补丁 →
   * ① 落进投影（客户端立刻看得见）② **塞进工具返回的 `patch` 数组**
   * （`presentationMeta` 会把它持久化到 `tool/result` 的 meta 上 ⇒ 重放日志也能重建，R1）。
   *
   * ## 为什么只带增量
   *
   * 每条工具结果都塞完整列表 ⇒ 会话日志按工具调用次数**平方增长**。
   * 这里只带**新出现**的条目（按 id 去重）；投影侧 `changelog.set` 按 id 合并。
   *
   * ## 漂移标记
   *
   * `drifted` = 「这一行在快照之后又被改过」。它只在**这次动过的行**上重算 ——
   * 对全部条目重算意味着每条快照都要做一次规范化 JSON 比对，长会话里太贵。
   * 其余条目沿用上次判定（漂移是相对当下的事实，会变；这个近似有代价，已写明）。
   *
   * @param {string} sessionId 会话 id。
   * @param {string} cwd 会话工作目录。
   * @param {object[]} patches 工具的补丁数组（**原地追加**变更日志补丁）。
   * @param {string[]} changedKeys 这次动过的行键。
   * @returns {Promise<void>} 完成。
   */
  const syncChangelog = async (sessionId, cwd, patches, changedKeys) => {
    try {
      const engine = changelogOf(sessionId, cwd);
      const projectId = projectIdOf(store.stateOf(sessionId), sessionId);
      const entries = await engine.list(projectId);
      if (entries.length === 0) return;
      const state = store.stateOf(sessionId);
      const known = new Set((state.changelog?.entries ?? []).map(item => item?.id));
      const rows = readRows(state);
      const touched = new Set(changedKeys);
      const payload = [];
      for (const entry of entries) {
        const key = `${entry.layer}:${entry.rowId}`;
        const isNew = !known.has(entry.id);
        // 老条目只有在「这次动过的行」上才重算漂移；其余原样保留。
        if (!isNew && !touched.has(key)) continue;
        payload.push(changelogView(entry, rows));
      }
      if (payload.length === 0) return;
      const patch = {
        op: 'changelog.set',
        value: { entries: payload, total: entries.length },
      };
      patches.push(patch);
      store.applyPatches(sessionId, [patch]);
    } catch (error) {
      console.warn(
        '[reelforge] 变更日志投影同步失败（不影响本次写入）：',
        error?.message ?? error,
      );
    }
  };

  /**
   * 应用补丁 + 记变更 + 同步变更日志 + 物化落盘。
   *
   * 顺序：**先记变更再落盘**——落盘失败时变更记录已经在了（回滚仍有依据）；
   * 记变更失败只 warn，不挡写入。
   *
   * ⚠️ `patches` 会被**原地追加**一条 `changelog.set` 补丁。工具返回的是
   * `patch: patches`（同一个数组引用），所以这条补丁会跟着进会话日志 ⇒ 可重放。
   *
   * @param {string} sessionId 会话 id。
   * @param {string} cwd 会话工作目录。
   * @param {object[]} patches 状态补丁。
   * @returns {Promise<object[]>} 补丁（含追加的变更日志补丁）。
   */
  const commit = async (sessionId, cwd, patches) => {
    const before = snapshotRows(readRows(store.stateOf(sessionId)));
    store.applyPatches(sessionId, patches);
    const after = snapshotRows(readRows(store.stateOf(sessionId)));
    const changedKeys = await recordChanges(sessionId, cwd, before, after);
    await syncChangelog(sessionId, cwd, patches, changedKeys);
    await materialize(store.stateOf(sessionId), cwd, config);
    return patches;
  };

  /** 下一个批次 id（一次工具调用 = 一个批次）。 */
  const nextBatchId = (sessionId) => {
    const next = (batchCounters.get(sessionId) ?? 0) + 1;
    batchCounters.set(sessionId, next);
    return `batch_${sessionId}_${String(next).padStart(4, '0')}`;
  };

  return { changelogOf, recordChanges, syncChangelog, commit, nextBatchId };
}

// ─────────────────────────────────────────────────────────────
// 变更日志：行快照与 diff
// ─────────────────────────────────────────────────────────────

/**
 * 给行索引做一份**快照**（深拷贝）。
 *
 * `readRows` 返回的行里有**引用**（分镜行直接指向投影里的那个对象），
 * 不拷贝的话「写之前的样子」会被之后的写入污染，diff 就成了假的。
 *
 * ## 为什么要把 `undefined` 归一成 `null`
 *
 * 变更日志落盘是 JSON——**JSON 存不下 `undefined`**：那个键在写盘时会被丢掉，
 * 回读时就与「当前行」差了个键，漂移检测（`sameRow` 的规范化 JSON 全等）
 * 会**永远**判定成漂移，于是那一层一也回滚不了。
 *
 * 归一成 `null` 不改语义：`canonicalJson` 里 `undefined` 与 `null` 都归到 `'null'`，
 * 所以归一前后比较结果完全一样，而 JSON 往返不再丢键。
 *
 * @param {Record<string, object|null>} rows 行索引。
 * @returns {Record<string, object|null>} 快照。
 */
export function snapshotRows(rows) {
  const snapshot = {};
  for (const [key, row] of Object.entries(rows ?? {})) {
    snapshot[key] = snapshotRow(row);
  }
  return snapshot;
}

/**
 * 深拷贝一行，并把 `undefined` 归一成 `null`（见 `snapshotRows` 的说明）。
 * @param {object|null} row 行。
 * @returns {object|null} 拷贝。
 */
export function snapshotRow(row) {
  if (row === null || row === undefined) return null;
  try {
    return normalizeUndefined(structuredClone(row));
  } catch {
    return normalizeUndefined(JSON.parse(JSON.stringify(row)));
  }
}

/**
 * 把对象里的 `undefined` 递归归一成 `null`。
 * @param {unknown} value 值。
 * @returns {unknown} 归一后的值。
 */
export function normalizeUndefined(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizeUndefined);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = normalizeUndefined(item);
    }
    return result;
  }
  return value;
}

/**
 * 比较两次的行索引，得出「变了哪些行」。
 *
 * 用**深比较**（`sameRow` 的规范化 JSON 全等），不用 `===`——
 * 行是对象，`===` 永远为 false，那就成了「每次写都算全变」。
 *
 * op 的判定（回滚的硬约束靠它）：
 *   - 写之前没有这一行 → `create`
 *   - 写之后没有这一行 → `delete`
 *   - 两边都有但内容不同 → `update`
 *
 * ⚠️ `project` 层的 `create` / `delete` 意味着「新建 / 删除项目」——
 * 按硬约束（没有删除项目的 API）这两者**不可回滚**，
 * 所以这里必须如实记 `create` / `delete`，不能一律记 `update`。
 *
 * @param {Record<string, object|null>} before 写入前的行索引。
 * @param {Record<string, object|null>} after 写入后的行索引。
 * @returns {Array<{key: string, op: string, before: object|null, after: object|null}>} 变更列表。
 */
export function diffRows(before, after) {
  const changes = [];
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].sort();
  for (const key of keys) {
    const had = Object.hasOwn(before ?? {}, key);
    const has = Object.hasOwn(after ?? {}, key);
    const oldRow = had ? before[key] : null;
    const newRow = has ? after[key] : null;
    if (sameRow(oldRow, newRow)) continue;
    const op = !had ? 'create' : (!has ? 'delete' : 'update');
    changes.push({ key, op, before: oldRow, after: newRow });
  }
  return changes;
}

/**
 * 把行键拆成「层 + 行 id」。
 *
 * 行键的**规范形式**由 `src/host/changelogStore.js` 的 `readRows` 决定：
 * `project:project` / `chapter:<seq>` / `shot:<seq>:<idx>` / `asset:<id>`。
 * 这里只拆第一段冒号，后面的整体当行 id（`shot:2:5` → 层 `shot`、行 `2:5`）。
 *
 * @param {string} key 行键。
 * @returns {{ layer: string, rowId: string }} 层与行 id。
 */
export function splitRowKey(key) {
  const index = String(key).indexOf(':');
  if (index < 0) return { layer: String(key), rowId: '' };
  return { layer: String(key).slice(0, index), rowId: String(key).slice(index + 1) };
}

/**
 * 变更日志的**项目标识**。
 *
 * 投影里**没有**稳定的项目 id 字段（`project` 只有 name 与内容字段），
 * 所以这里用**项目名**——和 `rollback` 工具查询时用的键**同一个来源**
 * （`rollback` 分支同样走这个函数），两边对不上就「按项目查变更」查不到东西。
 * 还没建项目时退到会话 id（会话内唯一，不会随项目改名漂移）。
 *
 * @param {object} state 投影状态。
 * @param {string} sessionId 会话 id。
 * @returns {string} 项目标识。
 */
export function projectIdOf(state, sessionId) {
  const name = state?.project?.name;
  if (typeof name === 'string' && name.trim() !== '') return name;
  return sessionId;
}
