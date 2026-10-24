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
    // 需求（板 02）：正文规模 + 检测到的章节标题（**没有正文**）。
    intake: { chars: 0, headings: [], fallbackChars: 0 },
    // 项目设置（板 02）：画幅 / 分辨率 / 目标时长 / BGM。
    settings: {
      aspectRatio: '',
      resolution: '',
      targetDuration: null,
      enableBgm: false,
      enableSubtitles: false,
    },
    // 执行路径矩阵（板 05）：kind × 位置的规格来源。
    planMatrix: [],
    // 执行阶段（板 06）：全局开关 + 按章覆盖。
    stages: { global: [], byChapter: [] },
    // 对话输入截获（§10.5）：用户在 DSH 输入框里敲的原文，由宿主钩子写进状态。
    input: { text: '' },
    cost: { spent: 0, cap: 0 },
    budget: {},
    workflowAnalysis: null,
  });

  /**
   * 设备检查 / 降级矩阵的宿主路由 URL（板 04 / 16 号板）。
   *
   * 探测结果是**能力事实**，不是会话状态 ⇒ 不进 wire view，走一条独立只读路由
   * （宿主半 `src/host/probeRoute.js`）。`refresh=1` 绕过宿主侧缓存强制重跑。
   *
   * @param {{ position?: string, provider?: string, refresh?: boolean }} [options] - 选项。
   * @returns {string} 同源 URL。
   */
  RF.probeUrl = function probeUrl(options = {}) {
    const query = new URLSearchParams();
    const sessionId = RF.currentSessionId ?? '';
    if (sessionId !== '') query.set('session', sessionId);
    if (typeof options.position === 'string' && options.position !== '') {
      query.set('position', options.position);
    }
    if (typeof options.provider === 'string' && options.provider !== '') {
      query.set('provider', options.provider);
    }
    if (options.refresh === true) query.set('refresh', '1');
    return `/api/reelforge.probe?${query.toString()}`;
  };

  /**
   * 服务配置读数的宿主路由 URL（RF7 板 14「服务配置」）。
   *
   * `/api/reelforge.capabilities` 是**只读**的：它把插件 Config 归一化后的
   * 可调值回给客户端（ComfyUI 地址 / 预算上限 / BGM / 字幕 / 目标时长）。
   * ⚠️ 它**不提供写入通道** —— 改配置要改插件的 `config` 块（见 RF7 设置屏的说明）。
   *
   * @returns {string} 同源 URL。
   */
  RF.capabilitiesUrl = function capabilitiesUrl() {
    return '/api/reelforge.capabilities';
  };

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
   * 参考素材上限（`src/core/constants.js` 的 `REFERENCE_LIMITS` 镜像）。
   *
   * RF7 的素材选择器板要显示「参考图上限 9」—— 那是**后端硬上限**，
   * 不是界面自己定的数。
   *
   * @type {{ images: number, audios: number, videos: number }}
   */
  RF.REFERENCE_LIMITS = Object.freeze({ images: 9, audios: 3, videos: 3 });

  /**
   * 按 id 找一镜。
   *
   * 投影里的镜头 id 是 `${seq}-${idx}`（见 `src/host/projection.js`）。
   *
   * @param {object} project - 投影视图。
   * @param {string | null | undefined} shotId - 镜头 id。
   * @returns {object | null} 镜头；找不到时 null。
   */
  RF.shotById = function shotById(project, shotId) {
    if (typeof shotId !== 'string' || shotId === '') return null;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.find(shot => String(shot?.id ?? '') === shotId) ?? null;
  };

  /**
   * **当前这一镜**：显式选中的那一镜；没选过就取第一镜。
   *
   * ## 为什么要有这个（实机抓出来的）
   *
   * 画板 07（分镜审查）里**永远有一镜是高亮选中态**，画板 08（分镜详情）就是
   * 那一镜的展开。所以「当前镜」的口径必须**只有一处**：
   * 列表页高亮哪一镜，详情屏就得展开哪一镜，外壳的副标题 / 胶囊也得说哪一镜。
   *
   * 之前列表页有兜底（取第一镜），详情屏与外壳却是严格选中 ⇒
   * 用户在列表页看到第 1 镜高亮，点进详情却写着「还没选镜」（实机走查抓到的真缺陷）。
   *
   * @param {object} project - 投影视图。
   * @param {string | null | undefined} shotId - 显式选中的镜头 id。
   * @returns {object | null} 当前镜头；一镜都没有时 null。
   */
  RF.currentShot = function currentShot(project, shotId) {
    const explicit = RF.shotById(project, shotId);
    if (explicit !== null) return explicit;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.length === 0 ? null : shots[0];
  };

  /**
   * 缺参考图的分镜（画板 17「缺料」态 / 画板 04「缺口警示」共用同一口径）。
   *
   * 投影里每一镜的 `references` 是**已解析出来的**参考素材
   * （`src/host/projection.js` 走 `resolveRefs`）⇒ 空数组 = 这一镜没参考图，
   * 而 video 阶段硬依赖 image ⇒ 这是**真缺料**，不是「还没写」。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 缺参考图的分镜。
   */
  RF.shotsMissingReferences = function shotsMissingReferences(project) {
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.filter(shot => {
      const references = Array.isArray(shot?.references) ? shot.references : [];
      return references.length === 0;
    });
  };

  /**
   * 没有音色的角色（画板 17「软降级」态）。
   *
   * 判定：分类是 `character` 的资产，**没有**任何 `voice` 资产把 `parent_id`
   * 指到它 ⇒ 这一角色没有音色（软降级：仍可跑，出片少一层人声质感）。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 没有音色的角色资产。
   */
  RF.charactersWithoutVoice = function charactersWithoutVoice(project) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    const characters = assets.filter(asset => String(asset?.category ?? '') === 'character');
    const voices = assets.filter(asset => String(asset?.category ?? '') === 'voice');
    return characters.filter(character => {
      const id = String(character?.id ?? '');
      return !voices.some(voice => String(voice?.parent_id ?? '') === id);
    });
  };

  /**
   * 按分类筛资产。
   *
   * @param {object} project - 投影视图。
   * @param {string} category - 分类；`'all'` = 全部。
   * @returns {Array<object>} 资产数组。
   */
  RF.assetsByCategory = function assetsByCategory(project, category) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    if (category === 'all' || category === undefined || category === '') return assets;
    return assets.filter(asset => String(asset?.category ?? '') === category);
  };

  /**
   * 音乐类资产（RF7 背景音乐板的「音乐库」）。
   *
   * ⚠️ 投影里的资产**没有文件路径**（只有 id / name / description / category），
   * 而 `reelforge.set_chapter_music` 要的是工作区相对路径 ——
   * ⇒ 这一屏能列条目，但「应用到章节」接不上，见 chrome 的 `music` 屏。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 音乐资产数组。
   */
  RF.musicAssets = function musicAssets(project) {
    return RF.assetsByCategory(project, 'music');
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
