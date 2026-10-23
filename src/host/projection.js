/**
 * 会话状态投影（§6.7）——纯逻辑，可单测。
 *
 * R1：**会话日志是唯一事实源**，插件内存只是派生缓存。所以本模块**不订阅、不回读**，
 * 只提供「一个纯 fold」：给一个已提交事件，算出下一个状态。
 *
 * ## 数据怎么进日志
 *
 * R2 禁止 append 新 `type` 的会话事件，所以本插件**不新增事件类型**。
 * 状态变更通过**已有**的 `tool/result` 事件携带：
 *
 *   - 工具的 `output.presentationMeta` 会被原样持久化到 `tool/result` 的 `meta` 字段
 *     （见宿主 `ToolResult.meta`：「tool-private presentation payload … persisted verbatim
 *     on `tool/result`」）；
 *   - 本模块认 `meta.reelforge` 这个补丁对象，其余一律忽略。
 *
 * 因此**重建状态 = fold 日志里的 `tool/result`**，不依赖任何内存残留。
 *
 * ## 与 `ctx.sessionProjections` 的差异（有意）
 *
 * 宿主推荐用 `ctx.sessionProjections` 单元承载这类 fold，但那条路要求：
 *   ① `stateSchema` / `wire.viewSchema` 是 **Zod** schema（外部插件要多引一个依赖）；
 *   ② 客户端读取投影值的 API 在本插件里未能验证；
 *   ③ `wire.view` 需要在 `@deepseek-ai/dsh-session/types` 上做模块增补。
 * 三条都不满足时，本模块用「纯 fold + `tool/result` 补丁」实现同一语义，
 * 并由 `src/host/routes.js` 把投影结果通过 Connection 认证通道交给浏览器半。
 */
import {
  CHANGELOG_VIEW_LIMIT,
  CONTEXT_KEYS,
  FALLBACK_CHAPTER_CHARS,
  ROLLBACK_MODES,
  SHOT_DURATION_DEFAULT,
  SHOT_DURATION_MAX,
  SHOT_DURATION_MIN,
  STAGES,
} from '../core/constants.js';
import { extractCapturedInput } from '../core/inputCapture.js';
import { resolveRefs } from '../core/refs.js';
import { findChapterHeadings } from '../core/splitChapters.js';
import { planMatrix } from './specMatrix.js';

/** 投影状态版本。状态字段或 fold 语义变化时**必须 +1**，否则旧的持久化缓存会被错误复用。 */
export const STATE_VERSION = 2;

/**
 * 空状态的初始值。
 * @returns {object} 初始状态（纯 JSON）。
 */
export function initialState() {
  return {
    version: STATE_VERSION,
    project: null,
    chapters: [],
    assets: [],
    context: { bible: '', style: '', continuity: [] },
    progress: null,
    plan: null,
    workflowAnalysis: null,
    deliverables: [],
    changelog: { entries: [], total: 0 },
    input: { text: '' },
  };
}

/**
 * 状态补丁（F9 的 `patches` 数组元素）。
 *
 * 补丁格式由 `src/host/tools.js` 的 `output.presentationMeta` 产出，
 * 字段随 `op` 变化——这里列的是**所有 op 用得到的字段**（可选，缺失即"没带"）。
 *
 * @typedef {object} ProjectionPatch
 * @property {string} [op] 补丁操作名（`project.set` / `chapter.upsert` / `shot.set` …）。
 * @property {unknown} [value] 补丁载荷（行内容 / 上下文值 / 计划 …）。
 * @property {number} [seq] 章节序号。
 * @property {number} [idx] 章内镜号。
 * @property {string} [key] 上下文键（`bible` / `style` / `continuity`）。
 * @property {string} [field] 字段名（资产绑定用）。
 * @property {string[]} [ids] id 列表（资产绑定用）。
 * @property {Array<unknown>} [shots] 分镜列表（`chapter.shots` 用）。
 */

/**
 * 补丁载荷（F9 新形状）。
 *
 * ⚠️ 早于 F9 的实现把补丁**直接**放在 `meta.reelforge` 上（单个补丁），
 * 那时 `op` 在顶层——两种形状本模块都要认（见 `applyEvent`）。
 *
 * @typedef {object} ProjectionPayload
 * @property {Array<ProjectionPatch>} [patches] F9 新形状：补丁数组。
 * @property {string} [op] 旧形状：单个补丁的操作名。
 * @property {unknown} [value] 旧形状：单个补丁的载荷。
 */

/**
 * 纯 fold：把一个已提交的会话事件作用到状态上。
 *
 * 工具结果的 `output.presentationMeta` 落成 `meta.reelforge`，形状是
 * `{ kind, patches: [ ...补丁 ], ...行数据 }`（F9）。**状态补丁一律在 `patches` 里**，
 * 行数据（`chapters` / `shots` / `assets` …）只给客户端渲染，不参与状态重建。
 *
 * 兼容两种历史形状（早于 F9 的实现曾把补丁直接放在 `meta.reelforge` 上）：
 *   - `meta.reelforge` 是补丁数组 → 逐个作用；
 *   - `meta.reelforge` 带 `op` → 当作单个补丁。
 *
 * ## `user/message`：对话输入截获（§10.5）
 *
 * 用户在对话框里敲的原文会作为 `user/message` 事件进入会话日志
 * （`packages/core/session/src/types.ts`：`'user/message': UserMessage`）。
 * 所以**截获结果同样能从日志重放出来** —— 钩子（`src/host/inputHook.js`）只是让
 * 它更早到达工作台，日志仍是唯一事实源（R1）。
 *
 * 只认 `source.kind === 'user'`：注入上下文（技能正文、`agent.inject()` 通知）
 * 也是 user 角色消息，但不是「用户说的话」。
 *
 * @param {object} state 当前状态。
 * @param {{ type?: string, data?: unknown, time?: number }} event 会话事件。
 * @returns {object} 下一个状态；**事件与本投影无关时返回同一个引用**（零下游开销）。
 */
export function applyEvent(state, event) {
  if (!event || typeof event.type !== 'string') return state;
  if (event.type === 'user/message') return applyUserMessage(state, event);
  if (event.type !== 'tool/result') return state;
  const data = /** @type {{ meta?: unknown }} */ (event.data);
  const meta = data && data.meta;
  if (!meta || typeof meta !== 'object') return state;
  const payload = /** @type {ProjectionPayload | ProjectionPatch[] | undefined} */ (
    /** @type {{ reelforge?: unknown }} */ (meta).reelforge
  );
  if (payload === undefined || payload === null) return state;

  // F9 新形状：{ kind, patches: [...] }
  if (!Array.isArray(payload) && typeof payload === 'object' && Array.isArray(payload.patches)) {
    let next = state;
    for (const one of payload.patches) next = applyPatch(next, one);
    return next;
  }
  if (Array.isArray(payload)) {
    let next = state;
    for (const one of payload) next = applyPatch(next, one);
    return next;
  }
  if (typeof payload !== 'object' || typeof payload.op !== 'string') return state;
  return applyPatch(state, payload);
}

/**
 * 把一条 `user/message` 事件作用到状态上：截获用户输入。
 *
 * @param {object} state 当前状态。
 * @param {{ data?: unknown }} event 会话事件。
 * @returns {object} 下一个状态。
 */
function applyUserMessage(state, event) {
  const message = event.data;
  if (!message || typeof message !== 'object') return state;
  const text = extractCapturedInput([message]);
  if (text === '') return state;
  return applyPatch(state, { op: 'input.set', value: { text } });
}

/**
 * 把一个状态补丁作用到状态上。纯函数。
 *
 * 补丁格式（由 `src/host/tools.js` 的 `output.presentationMeta` 产出）：
 * ```
 * { op: 'project.set',    value: { ...项目内容字段 } }
 * { op: 'chapter.upsert', seq: 1, value: { ...章节内容字段 } }
 * { op: 'chapter.shots',  seq: 1, shots: [ ...分镜内容字段 ] }
 * { op: 'shot.set',       seq: 1, idx: 3, value: { ...分镜内容字段 } }
 * { op: 'context.set',    key: 'bible' | 'style' | 'continuity', value: ... }
 * { op: 'asset.upsert',   value: { ...资产字段 } }
 * { op: 'asset.bind',     seq: 1, idx: 3, field: 'character_ids', ids: ['a','b'] }
 * { op: 'chapter.music',  seq: 1, value: { music_path: '...' } }
 * { op: 'progress',       value: { stage, chapterSeq, shotIdx, elapsedMs } }
 * { op: 'plan.set',       value: { kind, position, provider } }
 * { op: 'deliver.set',    value: { chapters: [ { id, title, shotCount, durationSec, deliverables } ] } }
 * { op: 'changelog.set',  value: { entries: [ ... ] } }
 * ```
 *
 * ## 删除类补丁（`*.delete`）
 *
 * 回滚「新建」这类变更时，该行的旧值是「**这一行本来不存在**」——
 * 恢复旧值就等于**删掉这一行**。没有删除类补丁时，宿主接线层只能把「删行」
 * 降级成「upsert 一个空对象」，那个操作会**什么都不改**（`chapter.upsert`
 * 是合并语义：空对象合并不进去），于是回滚**谎报成功**。
 *
 * 所以删除必须有独立补丁：改了就是删了，没改就是没改。
 *
 * @param {object} state 当前状态。
 * @param {object} patch 补丁。
 * @returns {object} 下一个状态。
 */
export function applyPatch(state, patch) {
  switch (patch.op) {
    case 'project.set':
      return { ...state, project: { ...(state.project ?? {}), ...(patch.value ?? {}) } };

    case 'chapter.upsert': {
      const seq = patch.seq;
      const index = state.chapters.findIndex((chapter) => chapter.seq === seq);
      // 分镜以 `chapter.shots` 补丁为准；补丁没带分镜时，保留已有的（**不静默清空**）。
      const shots = Array.isArray(patch.value?.shots)
        ? patch.value.shots
        : (index >= 0 ? state.chapters[index].shots : []);
      const chapter = {
        ...(index >= 0 ? state.chapters[index] : { seq, shots: [] }),
        ...(patch.value ?? {}),
        shots,
      };
      const chapters = [...state.chapters];
      if (index >= 0) chapters[index] = chapter;
      else chapters.push(chapter);
      chapters.sort((a, b) => a.seq - b.seq);
      return { ...state, chapters };
    }

    case 'chapter.shots': {
      const seq = patch.seq;
      const index = state.chapters.findIndex((chapter) => chapter.seq === seq);
      if (index < 0) return state;
      const chapters = [...state.chapters];
      chapters[index] = { ...chapters[index], shots: [...(patch.shots ?? [])] };
      return { ...state, chapters };
    }

    // ── 删除类补丁：回滚「新建」时把这一行真正删掉 ──
    case 'project.delete':
      // 项目行本来只有一行；删掉 = 没有项目内容了。
      return { ...state, project: null };

    case 'chapter.delete': {
      // 章节的分镜住在章节对象里 ⇒ 删章即删它的分镜。
      const chapters = state.chapters.filter((chapter) => chapter.seq !== patch.seq);
      if (chapters.length === state.chapters.length) return state;
      return { ...state, chapters };
    }

    case 'shot.delete': {
      const chapterIndex = state.chapters.findIndex((chapter) => chapter.seq === patch.seq);
      if (chapterIndex < 0) return state;
      const chapter = state.chapters[chapterIndex];
      const shots = chapter.shots.filter((shot) => shot.idx !== patch.idx);
      if (shots.length === chapter.shots.length) return state;
      const chapters = [...state.chapters];
      chapters[chapterIndex] = { ...chapter, shots };
      return { ...state, chapters };
    }

    case 'asset.delete': {
      const assets = state.assets.filter((asset) => asset.id !== patch.id);
      if (assets.length === state.assets.length) return state;
      return { ...state, assets };
    }

    case 'shot.set': {
      const seq = patch.seq;
      const chapterIndex = state.chapters.findIndex((chapter) => chapter.seq === seq);
      if (chapterIndex < 0) return state;
      const chapter = state.chapters[chapterIndex];
      const shotIndex = chapter.shots.findIndex((shot) => shot.idx === patch.idx);
      const shots = [...chapter.shots];
      if (shotIndex >= 0) shots[shotIndex] = { ...shots[shotIndex], ...(patch.value ?? {}) };
      else shots.push({ idx: patch.idx, ...(patch.value ?? {}) });
      shots.sort((a, b) => a.idx - b.idx);
      const chapters = [...state.chapters];
      chapters[chapterIndex] = { ...chapter, shots };
      return { ...state, chapters };
    }

    case 'context.set': {
      if (!CONTEXT_KEYS.includes(patch.key)) return state;
      const context = { ...state.context };
      if (patch.key === 'continuity') {
        // continuity 是**追加**语义（§6.3）
        context.continuity = [...context.continuity, ...(Array.isArray(patch.value) ? patch.value : [patch.value])];
      } else {
        // bible / style 是**整段覆盖**
        context[patch.key] = String(patch.value ?? '');
      }
      return { ...state, context };
    }

    case 'asset.upsert': {
      const asset = patch.value ?? {};
      if (!asset || typeof asset !== 'object' || !asset.id) return state;
      const index = state.assets.findIndex((existing) => existing.id === asset.id);
      const assets = [...state.assets];
      if (index >= 0) assets[index] = { ...assets[index], ...asset };
      else assets.push(asset);
      return { ...state, assets };
    }

    case 'asset.bind': {
      const seq = patch.seq;
      const chapterIndex = state.chapters.findIndex((chapter) => chapter.seq === seq);
      if (chapterIndex < 0) return state;
      const chapter = state.chapters[chapterIndex];
      const shotIndex = chapter.shots.findIndex((shot) => shot.idx === patch.idx);
      if (shotIndex < 0) return state;
      const shots = [...chapter.shots];
      shots[shotIndex] = { ...shots[shotIndex], [patch.field]: [...(patch.ids ?? [])] };
      const chapters = [...state.chapters];
      chapters[chapterIndex] = { ...chapter, shots };
      return { ...state, chapters };
    }

    case 'chapter.music': {
      const seq = patch.seq;
      const index = state.chapters.findIndex((chapter) => chapter.seq === seq);
      if (index < 0) return state;
      const chapters = [...state.chapters];
      chapters[index] = { ...chapters[index], ...(patch.value ?? {}) };
      return { ...state, chapters };
    }

    case 'progress':
      return { ...state, progress: patch.value ?? null };

    case 'plan.set':
      return { ...state, plan: { ...(state.plan ?? {}), ...(patch.value ?? {}) } };

    case 'workflowAnalysis.set':
      return { ...state, workflowAnalysis: patch.value ?? null };

    case 'deliver.set': {
      const value = patch.value ?? {};
      const chapters = Array.isArray(value.chapters) ? value.chapters : [];
      const deliverables = chapters.flatMap((chapter) => (
        (Array.isArray(chapter?.deliverables) ? chapter.deliverables : []).map((item) => ({
          ...item,
          chapterId: chapter?.id ?? chapter?.chapterId ?? null,
        }))
      ));
      return { ...state, deliverables };
    }

    case 'changelog.set': {
      // **按 id 合并**（幂等 upsert），不是整份替换。
      //
      // 为什么要合并：变更日志条目是**增量**产出的（每条工具结果只带新增的那几条），
      // 整份替换的话，工具结果里必须塞完整列表 ⇒ 会话日志按工具调用次数**平方增长**。
      // 合并后每条工具结果只带增量，日志与状态都是线性增长。
      //
      // 同一个 id 再来一次就**覆盖**（幂等）：重放同一条日志不会产生重复条目。
      const incoming = Array.isArray(patch.value?.entries) ? patch.value.entries : [];
      const existing = Array.isArray(state.changelog?.entries) ? state.changelog.entries : [];
      const byId = new Map(existing.map(entry => [entry?.id ?? null, entry]));
      for (const entry of incoming) byId.set(entry?.id ?? null, entry);
      const merged = [...byId.values()];
      // 超出上限时保留**最新**的那些；真实总数由 wire view 的 `total` 给出（不静默丢）。
      const capped = merged.length > CHANGELOG_VIEW_LIMIT
        ? merged.slice(merged.length - CHANGELOG_VIEW_LIMIT)
        : merged;
      // 真实总数：宿主报的就用，没报就按手上的条数算。**上限截断不静默** ——
      // 界面能说「共 N 条（只带最近 M 条）」。
      const reported = Number(patch.value?.total);
      const total = Number.isFinite(reported) && reported > 0
        ? Math.max(reported, capped.length)
        : capped.length;
      return { ...state, changelog: { ...(state.changelog ?? {}), entries: capped, total } };
    }

    case 'input.set': {
      // 对话输入截获（§10.5）：空文本不覆盖已有值 —— 空是「没截到」，
      // 不是「用户把输入清空了」，两者不能混。
      const text = typeof patch.value?.text === 'string' ? patch.value.text : '';
      if (text === '') return state;
      return { ...state, input: { ...(state.input ?? {}), text } };
    }

    default:
      // 未知补丁：忽略而不是报错——补丁格式演进时旧日志仍要能重建
      return state;
  }
}

/**
 * 按会话保存投影状态的容器。
 *
 * 它只是**派生缓存**（R1）：任何一格都能由会话日志重新 fold 出来。
 * 用 `Map` 而不是模块级变量，是为了让每个插件实例各有一份，不跨实例串味。
 */
export class ProjectionStore {
  constructor() {
    /** @type {Map<string, object>} 会话 id → 投影状态。 */
    this.sessions = new Map();
  }

  /**
   * 读某会话的当前状态。**未建立时返回空状态的同一个引用**（不每次新建）。
   * @param {string} sessionId 会话 id。
   * @returns {object} 投影状态。
   */
  stateOf(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (existing !== undefined) return existing;
    const initial = initialState();
    this.sessions.set(sessionId, initial);
    return initial;
  }

  /**
   * 最近一次有活动的会话 id。
   *
   * 浏览器半有时拿不到自己的会话 id（比如面板被拖成浮窗），这时退回到
   * 「最近活动的那个会话」——比直接报「没有状态」有用。
   *
   * @returns {string} 会话 id；没有任何会话时返回空串。
   */
  lastSessionId() {
    let latest = '';
    for (const [id] of this.sessions) latest = id;
    return latest;
  }

  /**
   * 作用一个补丁。
   * @param {string} sessionId 会话 id。
   * @param {object} patch 补丁。
   * @returns {object} 新状态。
   */
  apply(sessionId, patch) {
    const next = applyPatch(this.stateOf(sessionId), patch);
    this.sessions.set(sessionId, next);
    return next;
  }

  /**
   * 作用一组补丁。
   * @param {string} sessionId 会话 id。
   * @param {readonly object[]} patches 补丁数组。
   * @returns {object} 新状态。
   */
  applyPatches(sessionId, patches) {
    let next = this.stateOf(sessionId);
    for (const patch of patches) next = applyPatch(next, patch);
    this.sessions.set(sessionId, next);
    return next;
  }

  /**
   * 用一个会话事件推进状态（重放日志时用）。
   * @param {string} sessionId 会话 id。
   * @param {object} event 会话事件。
   * @returns {object} 新状态。
   */
  applyEvent(sessionId, event) {
    const next = applyEvent(this.stateOf(sessionId), event);
    if (next !== this.sessions.get(sessionId)) this.sessions.set(sessionId, next);
    return next;
  }
}

// ─────────────────────────────────────────────────────────────
// 客户端视图（wire view）
// ─────────────────────────────────────────────────────────────

/**
 * 允许时长集合 D：H3 的整数秒档位（§7.2）。**不在这里内置后端知识**，
 * 但工作台要给出「时长量化三选一」的候选，所以按 H3 的约定取 1..15。
 */
const ALLOWED_DURATIONS = Object.freeze(
  Array.from({ length: SHOT_DURATION_MAX - SHOT_DURATION_MIN + 1 }, (_, i) => SHOT_DURATION_MIN + i),
);

/**
 * 取离 `value` 最近的三个允许时长（当前值优先）。
 * @param {number} value 当前时长。
 * @returns {number[]} 候选时长（升序）。
 */
function durationCandidates(value) {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : SHOT_DURATION_DEFAULT;
  const sorted = [...ALLOWED_DURATIONS].sort((a, b) => (
    Math.abs(a - base) - Math.abs(b - base) || a - b
  ));
  return sorted.slice(0, 3).sort((a, b) => a - b);
}

/**
 * 由章节与分镜推导章节状态。
 *
 * ⚠️ 这里**只给机器值**（`queued` / `running` / `failed` / `done`），不给中文标签 ——
 * 显示文案由客户端按当前语言取（`RF.labelOf('chapter.status', …)`），
 * 宿主半不产出中文标签，en 界面才不会露出中文。
 *
 * @param {object} chapter 章节状态。
 * @returns {{ status: string, progress: number }} 结论。
 */
function chapterStatus(chapter) {
  const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
  if (shots.length === 0) return { status: 'queued', progress: 0 };
  const statuses = shots.map((shot) => String(shot.status ?? 'pending'));
  if (statuses.includes('failed')) return { status: 'failed', progress: 0 };
  if (statuses.includes('generating')) return { status: 'running', progress: 0.5 };
  const done = statuses.filter((status) => status === 'done').length;
  if (done === shots.length) return { status: 'done', progress: 1 };
  return { status: 'queued', progress: done / shots.length };
}

/**
 * 某章已完成的阶段（产物字段齐了就算该阶段跑过）。
 * @param {object} chapter 章节状态。
 * @returns {string[]} 阶段名。
 */
function chapterStages(chapter) {
  const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
  if (shots.length === 0) return [];
  const stages = [];
  if (shots.every((shot) => shot.script !== undefined || shot.prompt !== undefined)) stages.push('llm');
  if (shots.every((shot) => Boolean(shot.image_path))) stages.push('image');
  if (shots.every((shot) => Boolean(shot.audio_path ?? shot.voice_ref))) stages.push('tts');
  if (shots.every((shot) => Boolean(shot.video_path))) stages.push('video');
  return stages;
}

/**
 * 产出会话投影的**客户端视图**。
 *
 * 宿主 `ctx.sessionProjections` 的 `wire.view(state)` 走这里；
 * 浏览器半 `ctx.sessions.list.getSnapshot().projectionsBySession[id].values[key]` 读到的
 * 就是这个形状（键名与 `src/client/shared.js` 的 `RF.EMPTY_PROJECTION` 对齐）。
 *
 * 纯函数：同样输入必然同样输出，且**引用稳定**——宿主用 `Object.is` 比较两次视图，
 * 引用变了就会触发一次无谓的下发。
 *
 * @param {object} state 投影状态。
 * @param {{ budgetLimitCny?: number, skills?: Array<object>, stages?: Record<string, boolean>, defaults?: { enableBgm?: boolean, enableSubtitles?: boolean, targetDuration?: number|null } }} [options]
 *   来自 `Config` 的运行参数与宿主侧的只读资源。
 *   `budgetLimitCny` 是**预算上限**（元），设计 T1 §config：上限走 Config、不硬编码。
 *   不传时按 0 处理（没有 Config 的纯投影场景）。
 *   `skills` 是**技能目录**（磁盘上的只读资源，不是会话状态）——技能文件本来就是
 *   磁盘上的事实源，没有「从日志 fold 出来」这回事，所以由宿主侧扫描后注入。
 *   不传时按空数组处理（技能页显示空态，而不是假装有技能）。
 *   `stages` 是**全局四阶段开关**（Config 的可调值）——板 06 号板「四张全局阶段卡」
 *   的勾选初值。不传时按「全开」处理（Config 的默认值就是全开）。
 * @returns {object} 客户端视图。
 */
export function buildWireView(state, options = {}) {
  const current = state ?? initialState();
  const budgetLimitCny = Number.isFinite(options.budgetLimitCny) && options.budgetLimitCny >= 0
    ? options.budgetLimitCny
    : 0;
  const skills = Array.isArray(options.skills) ? options.skills : [];
  const globalStages = Array.isArray(STAGES)
    ? STAGES.filter(stage => (options.stages ?? {})[stage] !== false)
    : [];
  const project = current.project ?? {};
  const assets = Array.isArray(current.assets) ? current.assets : [];
  const chapters = Array.isArray(current.chapters) ? current.chapters : [];

  const chapterViews = chapters.map((chapter) => {
    const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
    const derived = chapterStatus(chapter);
    return {
      id: chapter.seq ?? null,
      title: chapter.title ?? '',
      shotCount: shots.length,
      durationSec: shots.reduce((sum, shot) => sum + (Number(shot.duration) || 0), 0),
      status: derived.status,
      stages: chapterStages(chapter),
      progress: derived.progress,
    };
  });

  const shotViews = chapters.flatMap((chapter) => {
    const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
    return shots.map((shot) => {
      /** @type {Array<{tag: string, label: string}>} */
      let references = [];
      try {
        const resolved = resolveRefs(shot, assets, {});
        references = [...resolved.images, ...resolved.audios].map((ref) => ({
          tag: `ref_${ref.refIndex}`,
          label: ref.label ?? '',
        }));
      } catch {
        // 参考装配超限等异常**不许炸掉整个视图**：这一镜显示空参考，其余照常。
        references = [];
      }
      return {
        id: `${chapter.seq ?? 0}-${shot.idx ?? 0}`,
        // ⚠️ `seq` / `idx` 必须单列出来：客户端改一镜时长时要发
        // `reelforge.update_shot`，而那个工具的必填参数就是 `seq` + `idx`
        // （`src/host/tools.js` 的 `required: ['seq', 'idx']`）。
        // 只给一个拼出来的 `id` 的话，客户端只能靠拆字符串反推 —— 拆错了没人知道。
        seq: chapter.seq ?? 0,
        idx: shot.idx ?? 0,
        label: shot.scene_name ?? `镜头 ${shot.idx ?? '?'}`,
        shotSize: shot.shot_size ?? '',
        duration: Number(shot.duration) || 0,
        aspectRatio: project.video_aspect_ratio ?? '',
        quantized: durationCandidates(shot.duration),
        references,
        status: String(shot.status ?? 'pending'),
      };
    });
  });

  const plan = current.plan ?? {};
  const deliverables = Array.isArray(current.deliverables) ? current.deliverables : [];
  const changelog = current.changelog ?? { entries: [] };

  return {
    name: project.name ?? '',
    subtitle: project.idea ?? '',
    runPosition: plan.position ?? '',
    provider: plan.provider ?? '',
    // plan：执行路径（kind × 位置）。
    //
    // 客户端的 6 步进度条靠 `plan.kind` 判断「方案这步过没过」—— **wire view 以前从不
    // 输出 plan**，于是 `stageStepIndex` 恒停在第 3 步「方案」，`4/6` `5/6` `6/6`
    // 永不可达（§7 B1）。宿主自己算得出 `stage`（第 6 步），两边长期互相矛盾。
    //
    // 没选 kind 时必须是 `null`（不是 `{kind:''}`）：客户端要靠它区分
    // 「还没选方案」和「方案已定」，空串会被当成「已定」而错误地前进一格。
    plan: typeof plan.kind === 'string' && plan.kind !== ''
      ? { kind: plan.kind, position: plan.position ?? '', provider: plan.provider ?? '' }
      : null,
    stage: deriveStage(current, { plan, deliverables }),
    // ── 需求（板 02）────────────────────────────────────────
    // 只给**字数**与**检测到的章节标题**，**不给正文** ——
    // 正文动辄几万字，塞进会话投影会把它撑爆（界面也不需要正文）。
    intake: {
      chars: String(project.novel ?? '').length,
      headings: findChapterHeadings(project.novel ?? '').map((heading, index) => ({
        seq: index + 1,
        title: heading.title,
      })),
      fallbackChars: FALLBACK_CHAPTER_CHARS,
    },
    // 项目设置（板 02 的「项目设置卡」）：画幅 / 分辨率 / 目标时长 / BGM。
    // 项目层没写过的项回落到 **Config 默认值**（那是可调值的唯一来源）。
    settings: {
      aspectRatio: project.video_aspect_ratio ?? '',
      resolution: project.video_resolution ?? '',
      targetDuration: Number.isFinite(project.target_duration)
        ? Number(project.target_duration)
        : (Number.isFinite(options.defaults?.targetDuration) ? Number(options.defaults.targetDuration) : null),
      enableBgm: project.enable_bgm === undefined
        ? options.defaults?.enableBgm === true
        : project.enable_bgm === true,
      enableSubtitles: project.enable_subtitles === undefined
        ? options.defaults?.enableSubtitles === true
        : project.enable_subtitles === true,
    },
    // 执行路径矩阵（板 05）：kind × 位置的规格来源（随包只读资源，宿主侧读一次）。
    planMatrix: planMatrix(),
    // 执行阶段（板 06）：全局开关（Config）+ 按章覆盖（章节实际跑过的阶段）。
    stages: {
      global: globalStages,
      byChapter: chapterViews.map(chapter => ({ seq: chapter.id, stages: chapter.stages })),
    },
    chapters: chapterViews,
    shots: shotViews,
    assets: assets.map((asset) => ({
      id: asset.id ?? null,
      name: asset.name ?? '',
      description: asset.description ?? '',
      category: asset.category ?? 'other',
      parent_id: asset.parent_id,
    })),
    context: {
      bible: current.context?.bible ?? '',
      style: current.context?.style ?? '',
      continuity: Array.isArray(current.context?.continuity)
        ? current.context.continuity.join('\n')
        : current.context?.continuity ?? '',
    },
    skills: skills.map(skill => ({
      name: skill.name ?? '',
      description: skill.description ?? '',
      source: skill.source ?? 'bundled',
      version: skill.version ?? '',
      bytes: Number(skill.bytes) || 0,
      updatedAt: skill.updatedAt ?? '',
      // 只带**正文预览**，不带整篇正文（正文动辄上万字，撑爆会话投影）。
      bodyPreview: skill.bodyPreview ?? '',
      references: (Array.isArray(skill.references) ? skill.references : []).map(reference => ({
        file: reference.file ?? '',
        chars: Number(reference.chars) || 0,
        preview: reference.preview ?? '',
      })),
    })),
    deliverables: deliverables.map((item) => ({
      chapterId: item.chapterId ?? null,
      kind: item.kind ?? '',
      label: item.label ?? '',
      bytes: Number(item.bytes) || 0,
      path: item.path ?? null,
    })),
    changelog: {
      entries: Array.isArray(changelog.entries) ? changelog.entries : [],
      // 真实总数（可能大于 `entries.length` —— 上限截断时由宿主报真实值）。
      total: Math.max(Number(changelog.total) || 0, Array.isArray(changelog.entries) ? changelog.entries.length : 0),
      modes: [...ROLLBACK_MODES],
    },
    // 对话输入截获（§10.5）：用户在对话框里敲的原文，由钩子写进状态、日志重放可重建。
    input: { text: current.input?.text ?? '' },
    workflowAnalysis: current.workflowAnalysis ?? null,
    // `spent`：成本记账尚未接入会话事件（R1 只认 `tool/result` 补丁），
    // 所以实际花费恒为 0；`cap` 必须来自 Config，不能写死 —— 否则工作台显示「上限 ¥0.00」。
    cost: { spent: 0, cap: budgetLimitCny },
    budget: {},
  };
}

/**
 * 推导工作台顶部的 6 步进度（`requirement → run → plan → generate → storyboard → deliver`）。
 * @param {object} state 投影状态。
 * @param {{ plan: object, deliverables: object[] }} derived 已算出的派生值。
 * @returns {string} 步骤名。
 */
function deriveStage(state, { plan, deliverables }) {
  if (!state.project) return 'requirement';
  if (!plan.kind) return 'run';
  const chapters = Array.isArray(state.chapters) ? state.chapters : [];
  const hasShots = chapters.some((chapter) => (chapter.shots ?? []).length > 0);
  if (!hasShots) return 'plan';
  const generated = chapters.some((chapter) => (chapter.shots ?? []).some((shot) => shot.video_path));
  if (!generated) return 'generate';
  if (deliverables.length === 0) return 'storyboard';
  return 'deliver';
}
