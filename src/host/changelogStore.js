/**
 * 变更日志存储（T1 宿主半 ↔ T4 变更日志引擎）。
 *
 * ## 为什么落盘
 *
 * 变更日志是**回滚的依据**：漂移检测要拿「快照之后的当前值」和「快照里的 after」比。
 * 事实源永远是会话日志（R1），所以：
 *
 *   - **条目**（before / after 快照）落在工作区的 JSONL 里——它比会话日志更方便按项目查；
 *   - **当前行值**直接从投影状态读——投影本身就是会话日志的 fold，不另存一份。
 *
 * ## 漂移保护
 *
 * `readRows` 读投影里的当前行，`writeRow` 把回滚结果写回投影。
 * 两者都走同一条 fold，所以「漂移」= 快照之后这一行又被改过——**整批原子拒绝**，
 * 除非显式 `force`。
 *
 * ## 本模块守住的五条
 *
 * 1. **行形状一致**：当前行与快照里的 `after` 必须是**同一个 JSON 形状**——
 *    章节行**不带 `shots` 键**（分镜是独立的行 `shot:<seq>:<idx>`）。
 *    用 `shots: undefined` 表达「不带」是错的：JSONL 往返会把这个键丢掉，
 *    而漂移检测比的是规范化 JSON（`undefined` 渲染成 `null`）——
 *    于是「当前行」与「快照」永远不相等，章节层回滚**恒定误判成漂移**。
 * 2. **条目 id 全局唯一**：id = `前缀_时间戳_序号_随机后缀`（见 `core/changelog.js`）。
 *    重启后序号接着文件里已有的最大序号走；随机后缀保证两个引擎实例也不撞号。
 * 3. **按项目隔离**：`list` 只回本项目的条目；`clearProject` 只删本项目的行。
 * 4. **坏行不静默丢**：读回时逐行记账（`engine.readErrors`），失败路径说清缺什么。
 * 5. **落盘原子 + 不越界**：`clearProject` 用原子写；工作区目录必须在会话目录内。
 *
 * @module host/changelogStore
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  CHANGELOG_LAYERS,
  createChangelog,
  isProjectCreation,
  isProjectDeletion,
  selectRollbackTargets,
} from '../core/changelog.js';
import { resolveProjectPath, writeFileAtomic } from './workspace.js';

/** 变更日志文件名（工作区内）。 */
const LOG_FILE = 'changelog.jsonl';

/** 合法变更操作（与 `createChangeEntry` 的白名单一致）。 */
const CHANGE_OPS = Object.freeze(['create', 'update', 'delete']);

/** 坏行样本的截短长度（诊断里回显一行片段，够定位即可）。 */
const SAMPLE_MAX = 80;

/**
 * 待校验的变更日志条目（**字段值全部待校验**）。
 *
 * 本函数是**校验器**：值不对就返回原因字符串，不抛错。
 * 所以字段类型一律写 `unknown`——结论由下面的逐项判定给出。
 *
 * @typedef {Record<string, unknown>} ChangelogEntryCandidate
 */

/**
 * 校验一条变更日志条目。
 *
 * 不校验的后果不是「多一条脏数据」，而是**回滚退错变更**：
 * 缺 `id` 的条目没法定位，缺 `layer` / `rowId` 的条目没法写回投影，
 * `op` 不对会让「项目创建不可回滚」这条硬约束失效。
 *
 * @param {ChangelogEntryCandidate} entry 解析出来的对象。
 * @returns {string|null} 合规则返回 `null`，否则返回**说清缺什么**的原因。
 */
export function validateEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '不是 JSON 对象';
  if (typeof entry.id !== 'string' || entry.id.length === 0) return '缺 id';
  if (entry.projectId === undefined) return '缺 projectId';
  if (entry.projectId !== null && typeof entry.projectId !== 'string') return 'projectId 不是字符串';
  if (!CHANGELOG_LAYERS.includes(/** @type {string} */ (entry.layer))) return `未知内容表层：${JSON.stringify(entry.layer)}`;
  if (!CHANGE_OPS.includes(/** @type {string} */ (entry.op))) return `未知变更操作：${JSON.stringify(entry.op)}`;
  if (entry.rowId === null || entry.rowId === undefined || String(entry.rowId).length === 0) return '缺 rowId';
  if (!Number.isFinite(Number(entry.seq))) return 'seq 不是数字';
  return null;
}

/**
 * 解析工作区目录，并做**越界防护**。
 *
 * `workspaceDir` 是配置项，写成 `../x` 就会让变更日志落到会话目录之外
 * （配置误写、提示注入都可能造成这种越界）。所以这里要求它**必须位于会话目录内**。
 *
 * 复用 `resolveProjectPath`（它已经处理了绝对路径 / Windows 盘符 / UNC），
 * 只多放行一种情况：**工作区目录就是会话目录本身**（`workspaceDir = '.'`）——
 * `resolveProjectPath` 面向的是*文件*路径，它把「解析后等于基准目录」也判成非法。
 *
 * @param {string} sessionCwd 会话工作目录。
 * @param {unknown} workspaceDir 工作区目录名（相对会话目录）。
 * @returns {string} 绝对路径。
 */
export function resolveChangelogWorkspace(sessionCwd, workspaceDir) {
  const base = path.resolve(sessionCwd);
  if (typeof workspaceDir !== 'string' || workspaceDir.length === 0) {
    throw new Error('workspaceDir 必须是非空字符串（相对会话目录）');
  }
  const resolved = resolveProjectPath(base, workspaceDir);
  if (resolved) return resolved;
  const fallback = path.resolve(base, workspaceDir);
  if (fallback === base) return base;
  throw new Error(
    `workspaceDir 必须位于会话目录内（相对路径，且不能越界）：${JSON.stringify(workspaceDir)}`,
  );
}

/**
 * 建一个宿主侧的变更日志引擎。
 *
 * @param {object} options
 * @param {import('./projection.js').ProjectionStore} options.store 投影存储。
 * @param {string} options.sessionId 会话 id。
 * @param {string} options.cwd 会话工作目录。
 * @param {object} options.config 插件配置。
 * @param {(sessionId: string, patches: object[]) => Promise<void>} options.commit 提交补丁并落盘。
 * @returns {object} 变更日志引擎。
 */
export function createHostChangelog({ store, sessionId, cwd, config, commit }) {
  const workspaceRoot = resolveChangelogWorkspace(cwd, config.workspaceDir);
  const file = path.join(workspaceRoot, LOG_FILE);

  /** 最近一次读文件的坏行诊断（`engine.readErrors`）。 */
  let lastBadLines = [];

  /**
   * **本次回滚写回的补丁**（给工具回给日志层用）。
   *
   * 回滚改了内容行 ⇒ 那些补丁必须进会话日志，否则**重放日志回不到回滚后的状态**
   * （R1：状态完全可从日志重建）。以前回滚工具返回 `patch: []`，
   * 写回只落在内存投影里 ⇒ 重启/重放后回滚「消失」。
   */
  let writtenPatches = [];

  /**
   * 读整个日志文件。
   *
   * **坏行不静默丢**：每一行都要有说法——要么解析成合法条目，要么进 `badLines` 记账
   * （行号 + 原因 + 样本）。否则「文件坏了」会退化成「少了几条」，谁也查不出问题。
   *
   * @returns {Promise<{items: object[], entries: object[], badLines: object[]}>}
   */
  const readEntries = async () => {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      return { items: [], entries: [], badLines: [] };
    }

    const items = [];
    const entries = [];
    const badLines = [];
    const lines = raw.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const text = lines[index].trim();
      if (text.length === 0) continue;
      let parsed;
      let parseFailed = false;
      try {
        parsed = JSON.parse(text);
      } catch {
        parseFailed = true;
      }
      const reason = parseFailed ? 'JSON 解析失败' : validateEntry(parsed);
      const item = {
        raw: text,
        line: index + 1,
        entry: reason === null ? parsed : null,
        reason,
      };
      items.push(item);
      if (reason === null) entries.push(parsed);
      else {
        badLines.push({
          line: item.line,
          reason,
          sample: text.slice(0, SAMPLE_MAX),
        });
      }
    }
    return { items, entries, badLines };
  };

  /** 文件里已经用掉的最大序号（重启后新条目接着它走）。 */
  const maxSeqOf = (entries) => entries.reduce((max, entry) => {
    const value = Number(entry?.seq);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  /** 引擎（核心逻辑）。**懒创建**：第一次用之前先读一次文件，把序号接上。 */
  let engine = null;
  let booting = null;

  const boot = async () => {
    if (engine) return engine;
    booting ??= (async () => {
      const read = await readEntries();
      lastBadLines = read.badLines;
      engine = createChangelog({
        store: {
          async append(entry) {
            await mkdir(workspaceRoot, { recursive: true });
            await appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8');
          },
          async list(projectId) {
            const read = await readEntries();
            lastBadLines = read.badLines;
            const wanted = projectId ?? null;
            return read.entries.filter((entry) => (entry.projectId ?? null) === wanted);
          },
          async clearProject(projectId) {
            const read = await readEntries();
            lastBadLines = read.badLines;
            const wanted = projectId ?? null;
            // 只删本项目的行；**别的项目的行原样保留**（连原始文本都保留）。
            // 坏行无法归属到某个项目 → 一并保留（删掉就是毁证据）。
            const kept = read.items.filter((item) => (
              item.entry === null || (item.entry.projectId ?? null) !== wanted
            ));
            const removed = read.entries.length - kept.filter((item) => item.entry !== null).length;
            // 原子写：崩溃时不会留半截文件。
            await writeFileAtomic(file, kept.map((item) => `${item.raw}\n`).join(''));
            return removed;
          },
        },
        readRows: async () => readRows(store.stateOf(sessionId)),
        writeRow: async (_projectId, layer, rowId, value) => {
          await writeRow({ store, sessionId, commit, layer, rowId, value, written: writtenPatches });
        },
        // 序号接着文件里已有的最大序号走 → 重启后新条目排在旧条目之后
        // （`list` 的排序与整批回滚的 seq 倒序都靠它）。
        startSeq: maxSeqOf(read.entries),
      });
      return engine;
    })();
    return booting;
  };

  return {
    /** 记一条变更（快照 before / after）。 */
    async record(input = {}) {
      const core = await boot();
      return core.record(input);
    },

    /** 读一个项目的全部变更（最新在后）。 */
    async list(projectId) {
      const core = await boot();
      return core.list(projectId);
    },

    /** 随项目删除一并清除变更日志（只删这个项目的行）。 */
    async clearProject(projectId) {
      const core = await boot();
      return core.clearProject(projectId);
    },

    /**
     * 三级回滚（核心语义在 `core/changelog.js`）。
     *
     * 宿主层多管两件事：
     *
     * 1. **reference 层不支持回滚** → 明确报错，不静默空操作（`writeRow` 没有这一层的补丁）；
     * 2. **坏行诊断**挂到结果上（失败路径要说清缺什么）。
     */
    async rollback(request = {}) {
      const core = await boot();
      writtenPatches = [];

      // ① reference 层：没有能写回投影的补丁 → 明确报「该层不支持回滚」。
      //    项目创建 / 删除的硬约束优先级更高（那是核心引擎的 403），这里不抢。
      const entries = await core.list(request.projectId);
      const targets = selectRollbackTargets(entries, request);
      const forbidden = targets.find((entry) => isProjectCreation(entry) || isProjectDeletion(entry));
      if (!forbidden) {
        const unsupported = targets.find((entry) => entry.layer === 'reference');
        if (unsupported) {
          return {
            ok: false,
            status: 422,
            code: 'layer_not_rollbackable',
            mode: request.mode ?? null,
            message: `参考图层（reference）暂不支持回滚：条目 ${unsupported.id} 没有能写回投影的补丁。请手动改回参考图。`,
            entryId: unsupported.id,
            layer: 'reference',
            rolledBack: [],
            restored: 0,
            forced: false,
            conflicts: [],
          };
        }
      }

      // ② 核心回滚。
      const result = await core.rollback(request);

      // ③ 坏行诊断：失败路径要说清「文件里有几行坏了」，成功路径也别装作没看见。
      if (lastBadLines.length > 0) {
        const detail = `变更日志文件有 ${lastBadLines.length} 行损坏（第 ${lastBadLines.map((item) => item.line).join('、')} 行），这些变更无法回滚；请修复或删除损坏行后重试`;
        result.warnings = [...(result.warnings ?? []), detail];
        if (result.ok === false && typeof result.message === 'string' && result.message.length > 0) {
          result.message = `${result.message}（${detail}）`;
        }
      }
      // ④ 写回的补丁：给工具回给日志层（R1：回滚后的状态也要能从日志重建）。
      result.patches = [...writtenPatches];
      return result;
    },

    /**
     * 最近一次读文件的**坏行诊断**：`{ line, reason, sample }`。
     *
     * 诊断不是给人看的日志，是「说清缺什么」的一部分：文件读回来少了条目时，
     * 这里能回答「少了哪些行、为什么少」。
     */
    get readErrors() {
      return lastBadLines.map((item) => ({ ...item }));
    },
  };
}

/**
 * 读投影里的所有行（按 `layer:rowId` 建索引）。
 *
 * 行键格式（**契约**，`src/host/tools.js` 的 diff 依赖它）：
 * `project:project` / `chapter:<seq>` / `shot:<seq>:<idx>` / `asset:<id>`。
 *
 * @param {object} state 投影状态。
 * @returns {Record<string, object|null>} 行索引。
 */
export function readRows(state) {
  const rows = {};

  const project = state?.project ?? null;
  if (project) rows['project:project'] = project;

  for (const chapter of state?.chapters ?? []) {
    const seq = chapter?.seq ?? null;
    if (seq === null) continue;
    // 章节行**不带 shots**：分镜是独立的行（`shot:<seq>:<idx>`）。
    //
    // ⚠️ 不能用 `{ ...chapter, shots: undefined }` 表达「不带」——
    // `undefined` 过不了 JSONL 往返（`JSON.stringify` 直接把键丢掉），
    // 而漂移检测比的是规范化 JSON（`undefined` 渲染成 `null`），
    // 于是「当前行」与「快照里的 after」永远不相等 → 章节层回滚恒定误判成漂移（409）。
    const { shots, ...rest } = chapter;
    rows[`chapter:${seq}`] = rest;
    for (const shot of shots ?? []) {
      rows[`shot:${seq}:${shot.idx}`] = shot;
    }
  }

  for (const asset of state?.assets ?? []) {
    if (asset?.id) rows[`asset:${asset.id}`] = asset;
  }

  return rows;
}

/**
 * 把回滚结果写回投影。
 *
 * ## `value === null` = **删掉这一行**
 *
 * 核心层的契约明写：`row === null` 表示删除该行（`src/core/changelog.js` 的
 * `writeRow` 说明）。回滚「新建」这类变更时，该行的旧值就是「这一行本来不存在」，
 * 恢复旧值 = 删掉这一行。
 *
 * ⚠️ 以前这里把 `null` 降级成 `{}` 再走 upsert —— 而 upsert 是**合并**语义，
 * 空对象合并不进去 ⇒ **回滚什么都没改**，工具却回报 `restored: 1`（谎报成功）。
 * 现在 `null` 走独立的删除补丁：改了就是删了，没改就是没改。
 *
 * @param {object} options
 * @param {import('./projection.js').ProjectionStore} options.store 投影存储。
 * @param {string} options.sessionId 会话 id。
 * @param {(sessionId: string, patches: object[]) => Promise<void>} options.commit 提交补丁。
 * @param {string} options.layer 内容表层。
 * @param {string} options.rowId 行 id。
 * @param {object | null} options.value 行值（行快照；`null` = 该行不存在 ⇒ 删掉它）。
 * @param {object[]} [options.written] 收集写回补丁的数组（给日志层用）。
 * @returns {Promise<void>} 完成。
 */
async function writeRow({ store, sessionId, commit, layer, rowId, value, written }) {
  const patches = [];
  // 旧值是「不存在」⇒ 这一行要被删掉；否则是把行写回旧值。
  const deleting = value === null;

  if (layer === 'project') {
    patches.push(deleting
      ? { op: 'project.delete' }
      : { op: 'project.set', value: value ?? {} });
  } else if (layer === 'chapter') {
    patches.push(deleting
      ? { op: 'chapter.delete', seq: Number(rowId) }
      : { op: 'chapter.upsert', seq: Number(rowId), value: value ?? {} });
  } else if (layer === 'shot') {
    const [seq, idx] = String(rowId).split(':');
    patches.push(deleting
      ? { op: 'shot.delete', seq: Number(seq), idx: Number(idx) }
      : { op: 'shot.set', seq: Number(seq), idx: Number(idx), value: value ?? {} });
  } else if (layer === 'asset') {
    patches.push(deleting
      ? { op: 'asset.delete', id: rowId }
      : { op: 'asset.upsert', value: { id: rowId, ...(value ?? {}) } });
  } else {
    // 未知层：不猜。**报错**而不是静默返回——静默返回会让回滚「报成功但什么也没改」。
    // （`reference` 层在 `rollback` 里已经被提前拦下并明确报「该层不支持回滚」。）
    throw new Error(`变更日志回滚不支持内容表层：${layer}`);
  }

  if (Array.isArray(written)) written.push(...patches);
  store.applyPatches(sessionId, patches);
  if (typeof commit === 'function') await commit(sessionId, patches);
}
