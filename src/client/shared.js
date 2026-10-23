/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端共享层：投影读取、模块级单例、格式化助手。
 *
 * R1：会话日志是唯一事实源，插件内存只是派生缓存 —— 客户端只**读**宿主投影。
 * R14：两个 Tab 共享数据时，状态放**模块级单例 + `useSyncExternalStore`**，
 *      不能放组件 `useState`；单例只存派生视图，业务事实仍在会话投影里。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 空投影：宿主还没发布 ReelForge 视图时的占位。 */
  RF.EMPTY_PROJECTION = Object.freeze({
    name: '',
    subtitle: '',
    runPosition: '',
    provider: '',
    // 执行路径：没选 kind 时为 null。客户端 6 步进度条靠它判断「方案这步过没过」。
    plan: null,
    stage: 'requirement',
    chapters: [],
    shots: [],
    assets: [],
    context: { bible: '', style: '', continuity: '' },
    skills: [],
    deliverables: [],
    changelog: { entries: [], total: 0, modes: ['single', 'batch', 'timepoint'] },
    // 对话输入截获（§10.5）：用户在 DSH 输入框里敲的原文，由宿主钩子写进状态。
    input: { text: '' },
    cost: { spent: 0, cap: 0 },
    budget: {},
    workflowAnalysis: null,
  });

  /**
   * 会话指令的请求 id。
   *
   * 宿主 `SessionPromptRequest.requestId` 要求**客户端铸造**一个唯一身份
   * （宿主用它去重：同一个 requestId 重复投递只算一次）。
   * 用 `crypto.randomUUID()`；老浏览器没有 `crypto` 时退回「时间戳 + 随机数」，
   * 保证**每次调用都不一样**（重复 id 会被宿主当重放而丢掉）。
   *
   * @returns {string} 请求 id。
   */
  RF.newRequestId = function newRequestId() {
    const cryptoRef = globalThis.crypto;
    if (cryptoRef !== undefined && cryptoRef !== null && typeof cryptoRef.randomUUID === 'function') {
      return cryptoRef.randomUUID();
    }
    return `rf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  /** 交付物 / 成片文件的同源读取 URL（宿主 Connection 路由）。 */
  RF.deliverableUrl = function deliverableUrl(relativePath) {
    if (typeof relativePath !== 'string' || relativePath.length === 0) return '';
    const sessionId = RF.currentSessionId ?? '';
    const query = new URLSearchParams({ path: relativePath });
    if (sessionId !== '') query.set('session', sessionId);
    return `/api/reelforge.file?${query.toString()}`;
  };

  /**
   * 模块级单例：派生视图 + 订阅通道（**不是事实源**）。
   * @returns {{ getSnapshot: function, subscribe: function, set: function }} 单例。
   */
  RF.createStore = function createStore() {
    let snapshot = RF.EMPTY_PROJECTION;
    /** @type {Set<function>} */
    const listeners = new Set();
    return {
      getSnapshot() {
        return snapshot;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      set(next) {
        if (next === snapshot) return;
        snapshot = next;
        for (const listener of listeners) listener();
      },
    };
  };

  /** 工作台与（可选的）历史运行 Tab 共享的单例。 */
  RF.store = RF.createStore();

  /**
   * 从会话列表快照里取 ReelForge 投影视图。
   * @param {object} sessions - `ctx.sessions.list.getSnapshot()` 的返回值。
   * @param {string} sessionId - 当前会话 id。
   * @returns {object} 投影视图（缺失时返回空投影）。
   */
  RF.readProjection = function readProjection(sessions, sessionId) {
    if (sessions === null || typeof sessions !== 'object') return RF.EMPTY_PROJECTION;
    const rows = /** @type {Record<string, any>} */ (sessions).projectionsBySession;
    if (rows === null || typeof rows !== 'undefined' && rows === undefined) return RF.EMPTY_PROJECTION;
    const row = rows[sessionId];
    if (row === undefined || row === null) return RF.EMPTY_PROJECTION;
    const values = row.values;
    if (values === null || typeof values !== 'object') return RF.EMPTY_PROJECTION;
    const view = values[RF.PROJECTION_KEY];
    if (view === null || typeof view !== 'object') return RF.EMPTY_PROJECTION;
    return Object.assign({}, RF.EMPTY_PROJECTION, view);
  };

  /**
   * 订阅会话列表，把最新投影喂进模块级单例。
   * @param {object} ctx - 客户端上下文（只用 `ctx.sessions`，不碰别的服务）。
   * @returns {function} 取消订阅的函数。
   */
  RF.bindProjection = function bindProjection(ctx) {
    const list = ctx.sessions && ctx.sessions.list;
    if (list === undefined || list === null) return () => {};
    const pull = () => {
      const sessions = list.getSnapshot();
      const ids = Object.keys(sessions.byId ?? {});
      for (const id of ids) {
        const view = RF.readProjection(sessions, id);
        if (view !== RF.EMPTY_PROJECTION) {
          RF.store.set(view);
          return;
        }
      }
    };
    pull();
    return list.subscribe(pull);
  };

  /**
   * 读模块级单例的派生视图（`useSyncExternalStore` 的订阅端）。
   * @param {function} React - React。
   * @returns {object} 当前投影视图。
   */
  RF.useProjection = function useProjection(React) {
    return React.useSyncExternalStore(RF.store.subscribe, RF.store.getSnapshot, RF.store.getSnapshot);
  };

  /**
   * 按 `{prefix}.{value}` 取本地化词条。
   *
   * 词条不存在时**原样返回 value**：宁可显示 `pending` 或 `online-api`，
   * 也不要显示 `shot.status.pending` 这种键名（宿主查不到 locale 就回键名）。
   *
   * @param {string} prefix - 词条前缀（`chapter.status` / `asset.category` …）。
   * @param {string} value - 机器值。
   * @param {function} t - translate 函数。
   * @returns {string} 显示名。
   */
  RF.labelOf = function labelOf(prefix, value, t) {
    const raw = String(value ?? '').trim();
    if (raw === '') return '';
    const key = `${prefix}.${raw}`;
    const known = RF.locale && RF.locale.zh ? RF.locale.zh[key] !== undefined : false;
    return known ? t(key) : raw;
  };

  /**
   * 当前进度：第几章的第几镜（底栏第二行）。
   *
   * 规则：先找正在跑的那一章；没有就找第一个还没完成的；都没有就取最后一章。
   * 章内镜号 = 已完成镜数 + 1（上限不超过总镜数）。
   *
   * @param {object} project - 投影视图。
   * @returns {{ chapter: number, shot: number, shots: number } | null} 进度；没有章节时返回 null。
   */
  RF.currentPosition = function currentPosition(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    if (chapters.length === 0) return null;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    const running = chapters.find(chapter => chapter.status === 'running');
    const pending = chapters.find(chapter => chapter.status !== 'done');
    const target = running ?? pending ?? chapters[chapters.length - 1];
    const prefix = `${target.id}-`;
    const chapterShots = shots.filter(shot => String(shot.id ?? '').startsWith(prefix));
    const total = Number(target.shotCount) || chapterShots.length || 0;
    const done = chapterShots.filter(shot => shot.status === 'done').length;
    const index = total > 0 ? Math.min(done + 1, total) : 0;
    return { chapter: target.id, shot: index, shots: total };
  };

  /**
   * 格式化成人类可读的字节数。
   * @param {number} bytes - 字节数。
   * @returns {string} 文本。
   */
  RF.formatBytes = function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let size = value;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${index === 0 ? size : size.toFixed(1)} ${units[index]}`;
  };

  /**
   * 格式化成金额文本。
   * @param {number} amount - 金额。
   * @returns {string} 文本。
   */
  RF.formatMoney = function formatMoney(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '¥0.00';
    return `¥${value.toFixed(2)}`;
  };

  /**
   * 格式化成日期文本（`YYYY-MM-DD`）。
   *
   * 设计稿 12 号板要技能行右侧显示「3.4 KB · 2026-10-22」。
   * 读不出来就返回空串 —— 显示 `Invalid Date` 比不显示更糟。
   *
   * @param {string} value - ISO 时间串。
   * @returns {string} 日期文本。
   */
  RF.formatDate = function formatDate(value) {
    const text = String(value ?? '').trim();
    if (text === '') return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const pad = part => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  /**
   * 格式化成日期时间文本（`YYYY-MM-DD HH:mm`）。
   *
   * 变更日志要回答「谁在**什么时候**改了什么」—— 只给日期不够。
   *
   * @param {string} value - ISO 时间串。
   * @returns {string} 文本。
   */
  RF.formatDateTime = function formatDateTime(value) {
    const text = String(value ?? '').trim();
    if (text === '') return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const pad = part => String(part).padStart(2, '0');
    return `${RF.formatDate(text)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  /**
   * 格式化成秒数文本。
   * @param {number} seconds - 秒数。
   * @returns {string} 文本。
   */
  RF.formatDuration = function formatDuration(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return '0.0s';
    return `${value.toFixed(1)}s`;
  };

  /**
   * 插值：把 `{name}` 占位替换成取值。
   * @param {string} template - 模板。
   * @param {Record<string, string | number>} values - 取值。
   * @returns {string} 结果。
   */
  RF.interpolate = function interpolate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (whole, key) => (
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole
    ));
  };

  /**
   * 安全取词：宿主 `t` 还没绑定时不至于吐键名、也不抛异常。
   *
   * 背景：`RF.t` 是 `RF.apply` 里 `ctx.locale.bind(ns)` 的结果，
   * 而通知重放（`retryPending`）、快捷键注册这些路径**不保证**先跑过 `apply`；
   * 宿主查不到 locale 时 `translate` 直接回键名（`locale/index.ts`）。
   * ⇒ 宁可退回**本地词典**（中文兜底），也不让用户看见 `notice.undelivered` 这种串。
   *
   * @param {string} key - 词条键。
   * @param {Record<string, string | number>} [params] - 插值参数。
   * @returns {string} 文案。
   */
  RF.tr = function tr(key, params) {
    if (typeof RF.t === 'function') return RF.t(key, params);
    const dictionary = RF.locale && RF.locale.zh ? RF.locale.zh : {};
    const template = dictionary[key];
    if (typeof template !== 'string') return key;
    return params === undefined ? template : RF.interpolate(template, params);
  };
})(RF);
