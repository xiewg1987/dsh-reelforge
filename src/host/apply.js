/**
 * 宿主侧装配：注册工具、投影、路由、提示词段落与授权闸门。
 *
 * 分层纪律（§5.2）：宿主专属逻辑全在这里，`src/core/` 一行 `ctx` 都不出现。
 */
import { PROJECTION_KEY, TRIGGER_TOOL_IDS } from '../core/constants.js';
import { buildSkillPromptSection } from '../skills/route.js';
import { buildSkillRegistry } from '../skills/skillTools.js';
import { resolveConfig } from './config.js';
import { BUNDLED_SKILLS_DIR, PRIVATE_DIR } from './paths.js';
import {
  ProjectionStore,
  STATE_VERSION,
  applyEvent,
  buildWireView,
  initialState,
} from './projection.js';
import { createToolDefinitions } from './tools.js';

/** Connection 认证通道上的路由。挂在 `/api` 共享通道下，会经过与官方 remote 相同的栅栏。 */
const STATE_PATH = '/api/reelforge.state';
const CAPABILITIES_PATH = '/api/reelforge.capabilities';

/** 汇总响应不应被任何中间缓存。 */
const NO_STORE = { 'cache-control': 'no-store' };

/**
 * 装配插件。
 *
 * @param {object} ctx 宿主上下文。
 * @param {unknown} rawConfig patch 行里的 `config:` 块。
 */
export function applyReelForge(ctx, rawConfig) {
  const config = resolveConfig(rawConfig);
  const store = new ProjectionStore();
  /** @type {Array<() => void>} R3：插件自己的 effect 里保留全部注册项的清理函数。 */
  const disposers = [];

  /**
   * 记录宿主返回的 unregister。
   * @param {unknown} dispose 清理函数。
   */
  function track(dispose) {
    if (typeof dispose === 'function') disposers.push(dispose);
  }

  // ── 15 个工具（13 个 ReelForge + 2 个只读技能工具）──
  // `deps` 是宿主注入的**能力对象**（通道客户端 / 探测客户端等）：
  // 触发类工具没有它就既跑不起来、也说不清「缺哪个能力」，所以必须一路透传到工具里。
  for (const definition of createToolDefinitions({ store, config, deps: config.deps ?? {} })) {
    track(ctx.tools.register(definition));
  }

  // ── 触发类工具的人工授权（R4）──
  // 「只用最弱的够用机制」：需要等用户决策的动作走 `tools/pre-execute` 返回 `ask`，
  // 而不是自己实现一套弹窗。
  track(ctx.on('tools/pre-execute', (exec, next) => {
    if (!TRIGGER_TOOL_IDS.includes(exec.name)) return next();
    return {
      kind: 'ask',
      reason: `ReelForge：${exec.name} 会消耗算力与费用，需要你的确认。`,
      displayReason: {
        en: `ReelForge: ${exec.name} consumes compute and cost. Please confirm.`,
        zh: `ReelForge：${exec.name} 会消耗算力与费用，请确认。`,
      },
    };
  }));

  // ── 会话事件 → 投影 fold（R1：日志是唯一事实源，这里只是派生缓存）──
  track(ctx.on('session/event', (session, event) => {
    if (!session || !session.id) return;
    store.applyEvent(session.id, event);
  }));

  // ── 宿主投影单元：把状态发布成浏览器半可见的视图 ──
  // `ctx.sessionProjections` 是**可选**服务（没有 Agent / 会话投影的外壳里不存在），
  // 所以走 `ctx.inject` 而不是写进 `export const inject`——否则插件整个装不上。
  track(ctx.inject(['sessionProjections'], (scoped) => {
    track(scoped.sessionProjections.register({
      key: PROJECTION_KEY,
      // 运行时契约只要 `{parse}`（`ErasedDefinition`），不需要 zod。
      stateSchema: { parse: assertPlainObject },
      init: () => initialState(),
      apply: (state, event) => applyEvent(state, event),
      wire: {
        viewSchema: { parse: assertPlainObject },
        view: (state) => buildWireView(state),
      },
      stateVersion: STATE_VERSION,
    }));
  }));

  // ── 技能目录注入到 systemPrompt ──
  // 模型要**先看到有哪些技能**才可能去读技能正文；没有这一段，`skill` 工具是瞎的。
  track(ctx.inject(['systemPrompt'], (scoped) => {
    track(scoped.systemPrompt.section({
      name: 'reelforge:skills',
      order: scoped.systemPrompt.getSectionOrder('TOOLS_SDK') - 100,
      // 技能正文里可能有 `{...}`，插值会把它吃掉——所以关掉插值。
      interpolate: false,
      text: () => buildSkillSection(),
    }));
  }));

  // ── 浏览器半的数据通道 ──
  // 官方 `ctx.remote.<namespace>` 对第三方插件是关闭的：它的客户端装配是 harness
  // 内部包的静态清单，第三方包加不进去。第三方可用的是
  // `ctx.connection.fetch.register`——在 Connection 的认证栅栏内注册精确路由，
  // 浏览器用同源 fetch 直接读。
  track(ctx.inject(['connection'], (child) => {
    track(registerRoutes(child, store, config));
  }));

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]();
    }
  };
}

/**
 * 校验一个值是普通对象。
 *
 * 宿主用 `stateSchema.parse` 判断持久化缓存里的状态是否可用；这里只做**最低限度**的
 * 形状校验——真 schema 是 zod，本插件坚持零额外依赖，所以不引。
 *
 * @param {unknown} value 待校验的值。
 * @returns {object} 原值。
 */
function assertPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ReelForge 投影状态必须是普通对象');
  }
  return value;
}

/**
 * 技能目录段落（systemPrompt 注入用）。
 *
 * 技能目录**随包只读**，扫一次就够，所以这里做进程内缓存；
 * 扫不出来时给一段说明而不是空段——空段会让模型以为插件没有技能。
 *
 * @returns {string} 段落文本。
 */
let skillSectionCache = null;
function buildSkillSection() {
  if (skillSectionCache !== null) return skillSectionCache;
  try {
    const registry = buildSkillRegistry({ bundledDir: BUNDLED_SKILLS_DIR });
    skillSectionCache = buildSkillPromptSection(registry.skills);
  } catch {
    skillSectionCache = '## ReelForge 技能目录\n\n（技能目录读取失败：`skill` 工具会报具体原因。）';
  }
  return skillSectionCache;
}

/**
 * 在 Connection 的认证通道里注册路由。
 *
 * @param {object} ctx 带 connection 服务的上下文。
 * @param {ProjectionStore} store 投影存储。
 * @param {object} config 插件配置。
 * @returns {() => void} 路由注销函数。
 */
function registerRoutes(ctx, store, config) {
  const disposers = [];
  disposers.push(ctx.connection.fetch.register({
    path: STATE_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => {
      const sessionId = readSessionParam(request);
      const state = sessionId
        ? store.stateOf(sessionId)
        : store.stateOf(store.lastSessionId());
      return Response.json(buildWireView(state), { headers: NO_STORE });
    },
  }));

  disposers.push(ctx.connection.fetch.register({
    path: CAPABILITIES_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: () => Response.json(
      {
        runPosition: config.runPosition,
        cloudProvider: config.cloudProvider,
        comfyBaseUrl: config.comfyBaseUrl,
        stages: config.stages,
        budgetLimitCny: config.budgetLimitCny,
        enableBgm: config.enableBgm,
        enableSubtitles: config.enableSubtitles,
        targetDuration: config.targetDuration,
        enableRunsTab: config.enableRunsTab,
        privateDir: PRIVATE_DIR,
      },
      { headers: NO_STORE },
    ),
  }));

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]();
    }
  };
}

/**
 * 从请求里取 `session` 查询参数。
 * @param {unknown} request 请求对象。
 * @returns {string | undefined} 会话 id。
 */
function readSessionParam(request) {
  try {
    const url = new URL(request.url);
    return url.searchParams.get('session') ?? undefined;
  } catch {
    return undefined;
  }
}
