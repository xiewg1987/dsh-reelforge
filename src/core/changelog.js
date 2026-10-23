/**
 * 变更日志 + 三级回滚 + 漂移保护（设计方案 §6.6 / 任务书 §2.4）。
 *
 * ## 语义
 *
 * | 能力 | 语义 |
 * | --- | --- |
 * | 单条回滚 | 恢复某一行的旧值 |
 * | 整批回滚 | 一次调用 = 一个 `batch_id`，整批回退 |
 * | 按时间点回滚 | 回退到某个时刻之前的所有变更 |
 * | **漂移保护** | 变更之后该行又被改过 → **409 拒绝**，`force: true` 才覆盖 |
 * | 硬约束 | **没有任何 API 用于删除项目**；回滚也拒绝回滚「项目创建」 |
 *
 * ## 实现要点
 *
 * - 快照存在**插件自有存储**（注入的 `store`），**不塞会话日志**（R2）。
 * - **媒体二进制不随回滚删除**——回滚只恢复内容行，磁盘上的图片 / 视频文件留着；
 *   结果里带 `mediaKept` + 一句**必须让用户看到**的提示。
 * - 漂移保护是**必需的**：回滚会覆盖别人（模型或用户）在这之后的修改。
 * - 变更日志**随项目删除一并清除**，不自动清理。
 *
 * 本模块是**纯逻辑**（无 `ctx`）：存储、行读写、时钟全部由构造参数注入。
 */

import { randomBytes } from 'node:crypto';

import { ROLLBACK_MODES, TOOL_IDS, isTriggerTool } from './constants.js';

/**
 * 变更日志条目（一次变更的快照）。
 * @typedef {object} ChangeEntry
 * @property {string} [id] 条目 id
 * @property {string|null} [projectId] 所属项目
 * @property {string|null} [at] 时间戳（ISO 串）
 * @property {number} [seq] 序号（同一运行内严格递增）
 * @property {string|null} [batchId] 整批回滚的批次 id
 * @property {string} [layer] 内容表层（`project` / `chapter` / `shot` / `asset` / `reference`）
 * @property {string} [rowId] 行 id
 * @property {string} [op] 变更操作（`create` / `update` / `delete`）
 * @property {string} [field] 变更的字段（`*` = 整行）
 * @property {unknown} [before] 变更前的行
 * @property {unknown} [after] 变更后的行
 * @property {string} [summary] 人类可读的变更摘要
 */

/**
 * `createChangeEntry()` 的输入（`id` / `at` / `seq` 通常由调用方补齐）。
 * @typedef {object} ChangeEntryInput
 * @property {string} [id]
 * @property {string} [projectId]
 * @property {string} [at]
 * @property {number} [seq]
 * @property {string|null} [batchId]
 * @property {string} [layer]
 * @property {string} [rowId]
 * @property {string} [op]
 * @property {string} [field]
 * @property {unknown} [before]
 * @property {unknown} [after]
 * @property {string|null} [summary]
 */

/**
 * 插件自有存储（变更日志快照；**不塞会话日志**）。
 * @typedef {object} ChangelogStore
 * @property {(projectId: string) => Promise<ChangeEntry[]>} list 读一个项目的全部条目
 * @property {(entry: ChangeEntry) => Promise<unknown>} append 追加一条条目
 * @property {(projectId: string) => Promise<unknown>} clearProject 随项目删除一并清除
 */

/**
 * 回滚请求（三级回滚共用）。
 * @typedef {object} RollbackRequest
 * @property {'single'|'batch'|'timepoint'} [mode] 回滚模式
 * @property {string} [entryId] mode = single
 * @property {string} [batchId] mode = batch
 * @property {string} [at] mode = timepoint（ISO 时间串）
 * @property {boolean} [force] 漂移时强制覆盖
 * @property {string} [projectId]
 */

/** 内容表（快照对象）。与 §6.6 的 `projects/chapters/shots/assets/reference_images` 对应。 */
export const CHANGELOG_LAYERS = Object.freeze(['project', 'chapter', 'shot', 'asset', 'reference']);

/** 三级回滚模式。 */
/** 三级回滚模式。枚举的唯一来源是 `src/core/constants.js`（F8）；这里只做转出。 */
export { ROLLBACK_MODES };

/** 回滚是触发类工具 → 宿主层必须走 `ask` 人工授权（R4）。判定依据在 `constants.js`。 */
export const ROLLBACK_TOOL_ID = TOOL_IDS.rollback;
export const ROLLBACK_REQUIRES_ASK = isTriggerTool(TOOL_IDS.rollback);

/** 层的中文标签（话术用）。 */
export const LAYER_LABELS = Object.freeze({
  project: '项目',
  chapter: '章节',
  shot: '分镜',
  asset: '资产',
  reference: '参考图',
});

/** 媒体二进制不随回滚删除——UI 必须把这句话说出来。 */
export const MEDIA_KEPT_NOTICE = '媒体二进制不随回滚删除：磁盘上的图片 / 视频文件仍然保留，本次只回滚内容行。';

/**
 * 变更日志条目 id 的形状（正则）。
 *
 * 形状：`{前缀}_{时间戳}_{序号}_{随机后缀}`，例如 `cl_20261023010000000_000001_3f9a2c71`。
 *
 * 三段各自负责一件事：
 *
 * - **时间戳**：条目自己的 `at`（去掉非数字字符，最多 17 位）——时钟可注入，测试可断言形状；
 * - **序号**：同一次运行内**严格递增**（宿主还会把文件里已有的最大序号接上来，跨重启不撞号）；
 * - **随机后缀**：**引擎实例级**随机量——保证两个引擎实例（哪怕同一毫秒、同一序号）也不撞号。
 *
 * ⚠️ 为什么必须有随机后缀：条目 id 是 `single` 回滚**唯一**的定位键。
 * 只靠「时间戳 + 序号」的话，两个进程（两个会话共用同一个日志文件）在同一毫秒
 * 写下同一个序号就会撞号 —— 回滚会**静默退错变更**，比报错更危险。
 */
export const ENTRY_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*_\d{1,17}_\d{6}_[0-9a-f]{8}$/;

/**
 * 造一个**全局唯一**的条目 id。
 *
 * @param {object} options
 * @param {string} options.idPrefix 前缀（默认 `cl`）。
 * @param {string} options.at 条目的时间戳（ISO 串）。
 * @param {number} options.seq 序号。
 * @param {string} options.nonce 引擎实例随机后缀（十六进制）。
 * @returns {string} 条目 id。
 */
export function buildEntryId({ idPrefix, at, seq, nonce }) {
  const stamp = String(at ?? '').replace(/[^0-9]/g, '').slice(0, 17) || '0';
  return `${idPrefix}_${stamp}_${String(seq).padStart(6, '0')}_${nonce}`;
}

/**
 * 稳定序列化（键排序）——用来比较「当前行」与「快照里的 after」是否一致。
 */
export function canonicalJson(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** 两行是否等价。 */
export function sameRow(a, b) {
  return canonicalJson(a ?? null) === canonicalJson(b ?? null);
}

/**
 * 漂移检测：当前行与快照的 `after` 不一致 → 变更之后该行又被改过。
 *
 * ## 为什么要拿 `before` 一起比
 *
 * 漂移保护要挡住的是「**覆盖别人的改动**」：
 * 当前行既不是这条变更写完后的样子（`after`），也不是这条变更动手前的样子（`before`），
 * 说明这行后来被**别人**改成了第三个状态 ⇒ 回滚会抹掉那个改动 ⇒ 拒绝。
 *
 * 而「当前行 == `before`」有两种可能：
 *   1. 这条变更还没落到这一行上；
 *   2. 这条变更**已经被回滚掉了**（回滚就是把行写回 `before`）。
 * 两种都不是「被别人改过」，再回滚一次只是把同一行再写一遍，不会覆盖任何东西 ⇒ 不算漂移。
 *
 * ⚠️ 不这么判的话：回滚「新建」之后那一行不存在（`current = null` = `before`），
 * 会被误判成漂移 ⇒ 日志页挂出「已漂移」卡片，再点一次回滚还会撞 409。
 *
 * @param {object} entry
 * @param {object|null} currentRow
 */
export function detectDrift(entry, currentRow) {
  const current = currentRow ?? null;
  if (sameRow(current, entry?.after ?? null)) return false;
  if (sameRow(current, entry?.before ?? null)) return false;
  return true;
}

/** 截短文本，给变更摘要用。 */
export function summarizeValue(value, max = 24) {
  if (value === null || value === undefined) return '空';
  if (typeof value === 'string') {
    const oneLine = value.replace(/\s+/g, ' ').trim();
    return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine || '空';
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > max ? `${json.slice(0, max)}…` : json;
  }
  return String(value);
}

/**
 * 从行快照里取出「变更的那个字段」的值；取不到就退回整行。
 */
function pickValue(row, field) {
  if (row === null || row === undefined) return row ?? null;
  if (typeof row !== 'object' || Array.isArray(row)) return row;
  if (!field || field === '*') return row;
  return Object.hasOwn(row, field) ? row[field] : row;
}

/**
 * 生成一条人类可读的变更摘要。
 * @param {object} entry
 */
export function describeChange(entry) {
  const layerLabel = LAYER_LABELS[entry?.layer] ?? entry?.layer ?? '内容';
  const rowId = entry?.rowId ?? '';
  if (entry?.op === 'create') return `新建${layerLabel} ${rowId}`;
  if (entry?.op === 'delete') return `删除${layerLabel} ${rowId}`;
  const field = entry?.field && entry.field !== '*' ? entry.field : '整行';
  const before = pickValue(entry?.before, entry?.field);
  const after = pickValue(entry?.after, entry?.field);
  return `${layerLabel} ${rowId} 的 ${field}：「${summarizeValue(before)}」→「${summarizeValue(after)}」`;
}

/**
 * 造一条变更日志条目（纯函数）。
 *
 * @param {ChangeEntryInput} [input] 条目内容；`layer` / `op` 非法直接抛错
 * @returns {ChangeEntry} 变更日志条目
 */
export function createChangeEntry({
  id,
  projectId,
  at,
  seq = 0,
  batchId = null,
  layer,
  rowId,
  op,
  field = '*',
  before = null,
  after = null,
  summary = null,
} = {}) {
  if (!CHANGELOG_LAYERS.includes(layer)) {
    throw new Error(`未知内容表层：${layer}`);
  }
  if (!['create', 'update', 'delete'].includes(op)) {
    throw new Error(`未知变更操作：${op}`);
  }
  const entry = {
    id,
    projectId: projectId ?? null,
    at: at ?? null,
    seq,
    batchId: batchId ?? null,
    layer,
    rowId,
    op,
    field: field ?? '*',
    before: before ?? null,
    after: after ?? null,
  };
  entry.summary = summary ?? describeChange(entry);
  return entry;
}

/** 项目创建 / 项目删除都不可回滚（硬约束：没有删除项目的 API）。 */
export function isProjectCreation(entry) {
  return entry?.layer === 'project' && entry?.op === 'create';
}

export function isProjectDeletion(entry) {
  return entry?.layer === 'project' && entry?.op === 'delete';
}

/**
 * 按回滚请求挑目标条目。
 * @param {Array} entries
 * @param {RollbackRequest} [request]
 * @returns {Array} 目标条目（新 → 旧）
 */
export function selectRollbackTargets(entries = [], request = {}) {
  const mode = request.mode;
  if (mode === 'single') {
    const found = entries.find((entry) => entry.id === request.entryId);
    return found ? [found] : [];
  }
  if (mode === 'batch') {
    return entries
      .filter((entry) => entry.batchId && entry.batchId === request.batchId)
      .sort((a, b) => Number(b.seq ?? 0) - Number(a.seq ?? 0));
  }
  if (mode === 'timepoint') {
    const target = request.at ? Date.parse(request.at) : Number.NaN;
    if (!Number.isFinite(target)) return [];
    return entries
      .filter((entry) => {
        const at = Date.parse(entry.at ?? '');
        return Number.isFinite(at) && at <= target;
      })
      .sort((a, b) => Number(b.seq ?? 0) - Number(a.seq ?? 0));
  }
  return [];
}

/**
 * 建一个变更日志实例。
 *
 * @param {object} options
 * @param {ChangelogStore} [options.store] 插件自有存储：`{ list(projectId), append(entry), clearProject(projectId) }`（**不给就抛错**）
 * @param {() => Date|string|number} [options.clock] `() => Date | string`，默认 `() => new Date()`
 * @param {(projectId: string) => Promise<Record<string, object|null>>} [options.readRows]
 *   `(projectId) => Promise<Record<'layer:rowId', row|null>>`（**不给就抛错**）
 * @param {(projectId: string, layer: string, rowId: string, row: object|null) => Promise<void>} [options.writeRow]
 *   `(projectId, layer, rowId, row|null) => Promise<void>`（`row === null` 表示删除该行；**不给就抛错**）
 * @param {string} [options.idPrefix] 条目 id 前缀，默认 `cl`。
 * @param {number} [options.startSeq] 序号的起点（默认 0）。宿主把**日志文件里已有的最大序号**传进来，
 *   重启后新条目就接着旧序号走 —— 排序（`list`）与整批回滚（按 seq 倒序）都靠它。
 */
export function createChangelog(options = {}) {
  const {
    store,
    clock = () => new Date(),
    readRows,
    writeRow,
    idPrefix = 'cl',
    startSeq = 0,
  } = options;

  if (!store) throw new Error('createChangelog 需要 store（插件自有存储）');
  if (!readRows) throw new Error('createChangelog 需要 readRows');
  if (!writeRow) throw new Error('createChangelog 需要 writeRow');

  const start = Number(startSeq);
  let seq = Number.isFinite(start) && start > 0 ? Math.trunc(start) : 0;

  /**
   * 引擎实例随机后缀：保证**两个引擎实例**（哪怕同一毫秒、同一序号）也不会撞 id。
   * 一个实例只生成一次 —— 同实例内靠 `seq` 区分，跨实例靠它区分。
   */
  const nonce = randomBytes(4).toString('hex');

  const nowIso = () => {
    const value = clock();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    return String(value ?? '');
  };

  const keyOf = (layer, rowId) => `${layer}:${rowId}`;

  return {
    /** 记一条变更（快照 before / after）。 */
    async record(input = {}) {
      seq += 1;
      // 时间戳**只取一次**：`at` 与 id 用的是同一个值（否则 id 的时间戳会与条目时间对不上）。
      const at = input.at ?? nowIso();
      const entry = createChangeEntry({
        ...input,
        id: input.id ?? buildEntryId({ idPrefix, at, seq, nonce }),
        at,
        seq,
      });
      await store.append(entry);
      return entry;
    },

    /** 读一个项目的全部变更（最新在后）。 */
    async list(projectId) {
      const entries = (await store.list(projectId)) ?? [];
      return [...entries].sort((a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0));
    },

    /** 随项目删除一并清除变更日志（不自动清理）。 */
    async clearProject(projectId) {
      return store.clearProject(projectId);
    },

    /**
     * 三级回滚。
     *
     * @param {RollbackRequest} [request] 回滚请求（`mode` / `entryId` / `batchId` / `at` / `force` / `projectId`）
     */
    async rollback(request = {}) {
      const mode = request.mode;
      if (!ROLLBACK_MODES.includes(mode)) {
        return { ok: false, status: 400, code: 'invalid_mode', mode, message: `未知的回滚模式：${mode}` };
      }
      if (mode === 'single' && !request.entryId) {
        return { ok: false, status: 400, code: 'missing_entry_id', mode, message: '单条回滚需要 entryId' };
      }
      if (mode === 'batch' && !request.batchId) {
        return { ok: false, status: 400, code: 'missing_batch_id', mode, message: '整批回滚需要 batchId' };
      }
      if (mode === 'timepoint' && !request.at) {
        return { ok: false, status: 400, code: 'missing_at', mode, message: '按时间点回滚需要 at' };
      }

      const entries = await this.list(request.projectId);
      const targets = selectRollbackTargets(entries, request);
      if (targets.length === 0) {
        return { ok: false, status: 404, code: 'entry_not_found', mode, message: '没有匹配的回滚目标' };
      }

      // 硬约束：回滚拒绝回滚「项目创建」（项目删除同样拒绝——那等于变相创建项目）
      const forbidden = targets.find((entry) => isProjectCreation(entry) || isProjectDeletion(entry));
      if (forbidden) {
        return {
          ok: false,
          status: 403,
          code: 'project_creation_not_rollbackable',
          mode,
          message: '回滚拒绝回滚「项目创建」：本插件没有删除项目的 API，项目层不可回滚。',
          entryId: forbidden.id,
        };
      }

      // 漂移检测：任一目标行在快照之后又被改过 → 409 拒绝（整批原子拒绝）
      const rows = (await readRows(request.projectId)) ?? {};
      const conflicts = [];
      for (const entry of targets) {
        const current = rows[keyOf(entry.layer, entry.rowId)] ?? null;
        if (detectDrift(entry, current)) {
          conflicts.push({
            entryId: entry.id,
            layer: entry.layer,
            rowId: entry.rowId,
            field: entry.field,
            expected: entry.after,
            actual: current,
          });
        }
      }
      if (conflicts.length > 0 && request.force !== true) {
        return {
          ok: false,
          status: 409,
          code: 'drift_detected',
          mode,
          message: '漂移保护：该行在快照之后又被改过，已拒绝回滚。加 force: true 才会覆盖。',
          conflicts,
          hint: '该行在快照之后又被改过。加 force: true 覆盖，或先回滚更晚的变更。',
        };
      }

      const rolledBack = [];
      for (const entry of targets) {
        await writeRow(request.projectId, entry.layer, entry.rowId, entry.before ?? null);
        rolledBack.push({
          entryId: entry.id,
          layer: entry.layer,
          rowId: entry.rowId,
          field: entry.field,
          op: entry.op,
          batchId: entry.batchId,
          at: entry.at,
        });
      }

      return {
        ok: true,
        status: 200,
        mode,
        rolledBack,
        restored: rolledBack.length,
        forced: conflicts.length > 0 && request.force === true,
        conflicts,
        mediaKept: true,
        notice: MEDIA_KEPT_NOTICE,
      };
    },
  };
}
