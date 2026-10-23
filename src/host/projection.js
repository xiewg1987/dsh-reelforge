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
  CONTEXT_KEYS,
  ROLLBACK_MODES,
  SHOT_DURATION_DEFAULT,
  SHOT_DURATION_MAX,
  SHOT_DURATION_MIN,
} from '../core/constants.js';
import { resolveRefs } from '../core/refs.js';

/** 投影状态版本。状态字段或 fold 语义变化时**必须 +1**，否则旧的持久化缓存会被错误复用。 */
export const STATE_VERSION = 1;

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
    deliverables: [],
    changelog: { entries: [] },
  };
}

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
 * @param {object} state 当前状态。
 * @param {{ type?: string, data?: { meta?: { reelforge?: unknown } } }} event 会话事件。
 * @returns {object} 下一个状态；**事件与本投影无关时返回同一个引用**（零下游开销）。
 */
export function applyEvent(state, event) {
  if (!event || event.type !== 'tool/result') return state;
  const meta = event.data && event.data.meta;
  if (!meta || typeof meta !== 'object') return state;
  const payload = meta.reelforge;
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
      const entries = Array.isArray(patch.value?.entries) ? patch.value.entries : [];
      return { ...state, changelog: { entries } };
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
 * @param {object} chapter 章节状态。
 * @returns {{ status: string, statusLabel: string, progress: number }} 结论。
 */
function chapterStatus(chapter) {
  const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
  if (shots.length === 0) return { status: 'queued', statusLabel: '待写分镜', progress: 0 };
  const statuses = shots.map((shot) => String(shot.status ?? 'pending'));
  if (statuses.includes('failed')) return { status: 'failed', statusLabel: '有分镜失败', progress: 0 };
  if (statuses.includes('generating')) return { status: 'running', statusLabel: '生成中', progress: 0.5 };
  const done = statuses.filter((status) => status === 'done').length;
  if (done === shots.length) return { status: 'done', statusLabel: '已完成', progress: 1 };
  return { status: 'queued', statusLabel: '待生成', progress: done / shots.length };
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
 * @param {{ budgetLimitCny?: number }} [options] 来自 `Config` 的运行参数。
 *   `budgetLimitCny` 是**预算上限**（元），设计 T1 §config：上限走 Config、不硬编码。
 *   不传时按 0 处理（没有 Config 的纯投影场景）。
 * @returns {object} 客户端视图。
 */
export function buildWireView(state, options = {}) {
  const current = state ?? initialState();
  const budgetLimitCny = Number.isFinite(options.budgetLimitCny) && options.budgetLimitCny >= 0
    ? options.budgetLimitCny
    : 0;
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
      statusLabel: derived.statusLabel,
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
    stage: deriveStage(current, { plan, deliverables }),
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
    skills: [],
    deliverables: deliverables.map((item) => ({
      chapterId: item.chapterId ?? null,
      kind: item.kind ?? '',
      label: item.label ?? '',
      bytes: Number(item.bytes) || 0,
      path: item.path ?? null,
    })),
    changelog: {
      entries: Array.isArray(changelog.entries) ? changelog.entries : [],
      modes: [...ROLLBACK_MODES],
    },
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
