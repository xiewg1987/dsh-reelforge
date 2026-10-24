/**
 * 工具定义的**共享层**（`src/host/tools/` 的地基）。
 *
 * ## 这个文件放什么
 *
 * - 全部 JSDoc 类型定义（`ToolExecContext` / `ToolResult` / 各工具返回值形状）
 * - `defineReelForgeTool`：工具定义的**唯一工厂**（参数封闭、`patch` 通道、消息行 kind 都在这里定型）
 * - 各个工具组都要用的纯辅助函数（会话上下文、物化、变更视图、时长量化、资产校验、错误话术）
 *
 * ## 不放什么
 *
 * 任何**具体工具**的定义（15 个工具分布在 `content.js` / `production.js` /
 * `rollback.js` / `skills.js` 四个文件里），以及变更日志引擎（`changelog.js`）。
 *
 * ## 为什么拆
 *
 * 原先是单个 1635 行的 `src/host/tools.js`：`createToolDefinitions` 一个函数占 953 行，
 * 15 个工具挤在里面，改任何一个都要在 1600 行里找。现在按**职责**切成 7 个文件，
 * 每个 100–470 行，每个文件自己讲清自己负责什么。
 *
 * 分层纪律（§5.2）不变：宿主专属逻辑全在 `src/host/`，`src/core/` 一行 `ctx` 都不出现。
 */
import {
  ASSET_CATEGORIES,
  ASSET_CONTENT_FIELDS,
  SHOT_DURATION_MAX,
  SHOT_DURATION_MIN,
  VARIANT_ASSET_CATEGORIES,
} from '../../core/constants.js';
import { detectDrift } from '../../core/changelog.js';
import { materializeProject } from '../../core/projectSchema.js';
import { quantizeDurations } from '../../core/quantize.js';
import { resolveProjectPath, resolveWorkspaceRoot, writeFileAtomic } from '../workspace.js';

// ─────────────────────────────────────────────────────────────
// 类型定义（JSDoc）
//
// 这里的 typedef 是**给 tsc 看的契约**，不参与运行：
//   - `ToolExecContext`：宿主注入的工具执行上下文（`execute` 的第二个参数）。
//   - `ToolResult`：工具返回值信封 `{ ok, errors?, ... }`。
//   - `SessionContext`：会话信息（成功 / 失败二选一）。
//   - `*Result`：各工具**返回值**的形状——`chatData` 回调的入参就是它。
//
// ⚠️ 其它文件用 `import('./shared.js').X` 引用这里的类型 —— **只在这里定义一次**，
//    别处再写一份 = 两处实现 = 形状必然漂。
// ─────────────────────────────────────────────────────────────

/**
 * 宿主注入的工具执行上下文（`execute` 的第二个参数）。
 *
 * 本插件只用到两处：当前会话（`agent.session`）与取消信号（`signal`）。
 *
 * @typedef {object} ToolExecContext
 * @property {{ session?: { id: string, header?: { cwd?: string } } }} [agent] 当前 Agent 与它的会话。
 * @property {AbortSignal} [signal] 取消信号。
 */

/**
 * 工具返回值信封。
 *
 * 规范值恒为 `{ ok, errors?, ... }`；其余键由各工具自己带
 * （`chapterCount` / `shotCount` / `patch` / …）。
 *
 * @typedef {object} ToolResult
 * @property {boolean} ok 是否成功。
 * @property {string[]} [errors] 失败原因（`ok: false` 时给出）。
 * @property {unknown} [patch] 状态补丁——给日志与投影用，**不给模型看**。
 */

/**
 * 会话信息（成功分支）。
 *
 * ⚠️ 出错时这个形状**整个不存在**——`sessionContext` 要么给会话信息，要么给一句错误。
 * 这里用 `never` + `?` 表达「该分支里这个字段不存在」：联合类型的属性访问
 * 要求**每个成员**都声明过该属性，少一个就报 TS2339。
 *
 * @typedef {object} SessionContextOk
 * @property {string} sessionId 会话 id。
 * @property {string} cwd 会话工作目录。
 * @property {never} [error] 成功分支里永远没有 `error`。
 */

/**
 * 会话信息（失败分支）。
 *
 * @typedef {object} SessionContextError
 * @property {never} [sessionId] 失败分支里没有会话 id。
 * @property {never} [cwd] 失败分支里没有工作目录。
 * @property {string} error 错误信息。
 */

/**
 * `sessionContext` 的返回值：成功与失败二选一。
 *
 * @typedef {SessionContextOk | SessionContextError} SessionContext
 */

/**
 * `importNovel` 的返回值（`chatData` 的入参）。
 *
 * @typedef {object} ImportNovelResult
 * @property {Array<{ seq?: number, title?: string, shotCount?: number, durationSec?: number }>} [chapters] 章节摘要。
 */

/**
 * `setStoryboard` 的返回值。
 *
 * @typedef {object} StoryboardResult
 * @property {number} [seq] 章节序号。
 * @property {Array<{ idx?: number, scene_name?: string, shot_size?: string, camera?: string, duration?: number, dialogue?: string }>} [shots] 分镜列表。
 */

/**
 * 资产行（`createAsset` / `updateAsset` 的返回值里带一个）。
 *
 * @typedef {object} AssetRow
 * @property {string} [id] 资产 id。
 * @property {string} [category] 分类。
 * @property {string} [name] 名字。
 * @property {string} [description] 描述。
 * @property {string} [parent_id] 变体类指向的角色资产 id。
 * @property {string[]} [tags] 标签。
 */

/**
 * `createAsset` / `updateAsset` 的返回值。
 *
 * @typedef {object} AssetResult
 * @property {AssetRow} [asset] 资产行。
 */

/**
 * `runStage` 的返回值。
 *
 * @typedef {object} RunStageResult
 * @property {string} [stage] 阶段。
 * @property {unknown[]} [items] 处理项。
 * @property {unknown[]} [skipped] 跳过项。
 * @property {string[]} [warnings] 提示。
 */

/**
 * `regenerateShot` 的返回值。
 *
 * @typedef {object} RegenerateShotResult
 * @property {number} [seq] 章节序号。
 * @property {number} [idx] 章内镜号。
 * @property {unknown[]} [items] 处理项。
 */

/**
 * 交付 payload 里的章节条目。
 *
 * @typedef {object} DeliverChapter
 * @property {string | null} id 章节 id。
 * @property {string} title 章节标题。
 * @property {number} shotCount 镜数。
 * @property {number} durationSec 时长（秒）。
 * @property {Array<{ kind: string, label: string, path: string | null, bytes: number | null }>} deliverables 交付物。
 */

/**
 * `assembleChapter` 的返回值。
 *
 * @typedef {object} AssembleResult
 * @property {{ chapters?: DeliverChapter[] }} [payload] 交付 payload。
 */

/**
 * 回滚命中的变更日志条目。
 *
 * @typedef {object} RolledBackEntry
 * @property {string} entryId 条目 id。
 * @property {string} layer 层。
 * @property {string} rowId 行 id。
 * @property {string} field 字段。
 * @property {string} op 变更类型。
 * @property {string | null} [batchId] 批次 id。
 * @property {string | null} [at] 时间戳。
 */

/**
 * `rollback` 的返回值。
 *
 * @typedef {object} RollbackResult
 * @property {RolledBackEntry[]} [rolledBack] 已回滚的条目。
 */

/**
 * 执行路径的行数据（`kind × 位置`）。
 *
 * @typedef {object} PlanResult
 * @property {string} [kind] 生成 kind。
 * @property {string} [position] 运行位置。
 * @property {string} [provider] provider。
 * @property {Array<{ kind: string, position: string, sourceFile: string, label: string }>} [candidates] 候选表。
 */

/**
 * 工具组共享的**上下文**（各工具组函数的入参）。
 *
 * 拆文件之后，跨组共享的东西（store / config / deps / commit 入口）不能再靠闭包，
 * 改成显式传一个上下文对象 —— 依赖关系看得见，也不怕循环引用。
 *
 * @typedef {object} ToolContext
 * @property {import('../projection.js').ProjectionStore} store 投影存储。
 * @property {object} config 插件配置。
 * @property {object} deps 宿主注入的能力对象。
 * @property {(sessionId: string, cwd: string, patches: object[]) => Promise<object[]>} commit 应用补丁 + 记变更 + 物化落盘。
 * @property {(sessionId: string, cwd: string) => object} changelogOf 取变更日志引擎。
 * @property {(sessionId: string, cwd: string, patches: object[], changedKeys: string[]) => Promise<void>} syncChangelog 同步变更日志到投影。
 */

/**
 * 构造一个 ReelForge 工具定义。
 *
 * @param {{ name: string, description: string, parameters: object,
 *           execute: (args: any, exec: ToolExecContext) => ToolResult | Promise<ToolResult>,
 *           chatKind?: string, chatData?: (value: unknown) => object }} options 工具定义要素。
 *   `chatKind` = 这个工具的结果要在对话里呈现成哪一类消息行（§10.3 的 7 个 kind）。
 *   `args` 的形状由各工具自己的 `parameters`（JSON Schema）约束、宿主校验后传入，
 *   没有一个单一类型能覆盖 15 个工具，故为 `any`；`chatData` 的入参形状则由
 *   每个调用点自己用 `@param` 声明（见 `ImportNovelResult` 等 typedef）。
 * @returns {object} `ToolDefinition` 普通对象。
 */
export function defineReelForgeTool({ name, description, parameters, execute, chatKind, chatData }) {
  return {
    name,
    description,
    parameters,
    output: {
      // DSH 只认「标准 JSON Schema 子集」：根节点的 `type` 必须是
      // object / array / string / number / integer / boolean / null 之一。
      // 宿主的 `defineTool` 会把作者层的 `{ type: 'json' }` 编译成
      // **注解式 schema**（没有 `type`）；我们直接注册 raw definition，
      // 走不到那层编译，所以这里必须写编译后的等价形状，否则整个插件
      // 在宿主里**装都装不上**（ctx.tools.register 抛 JsonSchemaError）。
      // 工具返回值统一是 `{ ok, errors?, ... }` 信封，所以声明成开放对象。
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: renderSummary(value) }],
      // presentationMeta 会被原样持久化到 tool/result 的 meta 字段。
      // 载荷形状 = `{ kind, patches, ...行数据 }`：
      //   - `kind` 告诉客户端「这是哪一行」（客户端只看这一层，不新增会话事件 type）
      //   - `patches` 是状态补丁，投影层靠它 fold 重建状态
      //   - 其余键是这一行要渲染的数据
      presentationMeta: (_args, value) => {
        if (!value || typeof value !== 'object') return {};
        const patch = value.patch;
        const rowData = typeof chatData === 'function' ? chatData(value) : {};
        const payload = {
          ...rowData,
          ...(chatKind === undefined ? {} : { kind: chatKind }),
          ...(patch === undefined ? {} : { patches: Array.isArray(patch) ? patch : [patch] }),
        };
        return { reelforge: payload };
      },
    },
    execute,
  };
}

/**
 * 渲染给模型看的摘要：去掉 `patch`（那是给日志看的，不是给模型看的）。
 * @param {Record<string, unknown> | null | undefined} value 工具返回值。
 * @returns {string} 文本。
 */
function renderSummary(value) {
  if (!value || typeof value !== 'object') return JSON.stringify(value, null, 2);
  const { patch, ...rest } = value;
  return JSON.stringify(rest, null, 2);
}

/**
 * 取出工具执行上下文里的会话信息。
 *
 * @param {ToolExecContext} exec 工具执行上下文。
 * @returns {SessionContext} 会话信息或错误（成功 / 失败二选一）。
 */
export function sessionContext(exec) {
  const session = exec && exec.agent && exec.agent.session;
  if (!session) return { error: '该工具需要在有会话的 Agent 里运行' };
  const cwd = session.header && session.header.cwd;
  if (!cwd) return { error: '会话没有工作目录，无法定位工作区' };
  return { sessionId: session.id, cwd };
}

/**
 * 把投影状态物化成 `project.json` 落盘。
 *
 * `project.json` 是**物化导出**，不是事实源（事实源永远是会话日志，R1）。
 *
 * @param {object} state 投影状态。
 * @param {string} cwd 会话工作目录。
 * @param {object} config 插件配置。
 * @returns {Promise<string | null>} 写入的绝对路径；无项目或越界时 `null`。
 */
export async function materialize(state, cwd, config) {
  if (!state.project) return null;
  const root = resolveWorkspaceRoot(cwd, config.workspaceDir);
  const file = resolveProjectPath(root, 'project.json');
  if (!file) return null;
  const payload = materializeProject({ ...state.project, chapters: state.chapters });
  await writeFileAtomic(file, `${JSON.stringify(payload, null, 2)}\n`);
  return file;
}

/**
 * 把一条变更日志条目转成**给客户端看的视图**。
 *
 * ## 为什么裁字段
 *
 * 条目原文带 `before` / `after` 两份**完整行快照**（项目行里可能有整段小说正文）。
 * 这些是回滚的依据，留在 JSONL 里；**进会话投影的必须是裁过的视图** ——
 * 否则每条工具结果都会拖着整段正文，状态会被撑爆。
 *
 * 裁掉的字段： `before` / `after`（回滚依据，不给界面）/ `projectId`（界面上用不上）。
 *
 * @param {object} entry 变更日志条目。
 * @param {Record<string, object|null>} rows 当前行索引（算漂移用）。
 * @returns {object} 客户端视图。
 */
export function changelogView(entry, rows) {
  const key = `${entry.layer}:${entry.rowId}`;
  const current = rows[key] ?? null;
  return {
    id: entry.id,
    at: entry.at ?? null,
    seq: Number(entry.seq) || 0,
    batchId: entry.batchId ?? null,
    layer: entry.layer,
    rowId: entry.rowId,
    op: entry.op,
    field: entry.field ?? '*',
    summary: entry.summary ?? '',
    drifted: detectDrift(entry, current),
  };
}

/**
 * 只取项目内容字段。
 * @param {object} value 合并后的值。
 * @returns {object} 项目内容字段。
 */
export function projectContent(value) {
  const result = {};
  for (const key of ['name', 'novel', 'idea', 'style', 'video_resolution', 'video_aspect_ratio',
    'video_width', 'video_height', 'target_duration', 'enable_bgm', 'enable_subtitles']) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

/**
 * 后端允许的时长集合 D（H3 的整数秒档位，§7.2）。
 *
 * ⚠️ D **由调用方传入**——这里按 H3 的约定取 1..15 的整数秒。
 * 写成非整数（比如 4.5）的时长后端会拒，所以门禁与量化都以这张表为准。
 *
 * ⚠️ `Object.freeze` 让静态类型成了 `readonly number[]`，而 `quantizeDurations`
 * 的入参签名是 `number[]`（在 `src/core/quantize.js`，不是本文件能改的）。
 * 这里用一次**类型断言**把静态类型对齐成 `number[]`：`quantizeDurations` 只**读**
 * 这个集合，运行时没人改它（冻结本身也在运行时兜底），行为不变。
 */
const ALLOWED_DURATIONS = /** @type {number[]} */ (Object.freeze(
  Array.from({ length: SHOT_DURATION_MAX - SHOT_DURATION_MIN + 1 }, (_, i) => SHOT_DURATION_MIN + i),
));

/**
 * 时长量化（§7.2）。
 *
 * **只有项目声明了 `target_duration` 才量化**：没有目标时量化会平白改动模型写的值
 * （甚至拆镜 / 并镜），那是副作用不是纠错。
 *
 * @param {object | null} project 项目状态。
 * @param {object[]} shots 本章分镜（**就地修改**：时长与 idx 可能变）。
 * @param {object | null} override 即将写入的单镜值（改单镜时传）。
 * @param {number | null} overrideIdx 被改的镜号。
 * @returns {{ shots: object[], rewritten: boolean, warnings: string[], errors: string[] }} 结论。
 */
export function quantizeChapter(project, shots, override, overrideIdx) {
  const list = Array.isArray(shots) ? shots : [];
  const target = Number(project?.target_duration);
  if (!Number.isFinite(target) || target <= 0) {
    return { shots: list, rewritten: false, warnings: [], errors: [] };
  }

  // 把即将写入的值先并进去，再整章一起分配。
  const working = list.map((shot) => ({ ...shot }));
  if (override !== null && override !== undefined && overrideIdx !== null) {
    const index = working.findIndex((shot) => shot.idx === overrideIdx);
    if (index >= 0) working[index] = { ...working[index], ...override };
  }

  let changes;
  try {
    changes = quantizeDurations(working, ALLOWED_DURATIONS, target);
  } catch (error) {
    return {
      shots: list,
      rewritten: false,
      warnings: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  const changed = changes.some((change) => change.changed);
  const warnings = changes
    .filter((change) => change.changed)
    .map((change) => `镜头 ${change.idx} 的时长已按后端约束调整为 ${change.after}s`);
  return { shots: changed ? working : list, rewritten: changed, warnings, errors: [] };
}

/**
 * 只取资产内容字段。
 * @param {object} value 资产值。
 * @returns {object} 资产内容字段。
 */
export function pickAssetFields(value) {
  const result = {};
  for (const key of ASSET_CONTENT_FIELDS) {
    if (key === 'id') continue;
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

/**
 * 资产基础校验（分类枚举 + 变体必须带 parent_id）。
 * @param {object} asset 资产值。
 * @param {boolean} requireCategory 新建时分类必填。
 * @returns {string[]} 错误列表。
 */
export function validateAsset(asset, requireCategory) {
  const errors = [];
  if (requireCategory || asset.category !== undefined) {
    if (!ASSET_CATEGORIES.includes(asset.category)) {
      errors.push(`category 必须是 ${ASSET_CATEGORIES.join(' | ')} 之一`);
    }
  }
  if (asset.name !== undefined && typeof asset.name !== 'string') {
    errors.push('name 必须是字符串');
  }
  if (requireCategory && typeof asset.name !== 'string') {
    errors.push('name 必填');
  }
  if (VARIANT_ASSET_CATEGORIES.includes(asset.category)) {
    if (typeof asset.parent_id !== 'string' || asset.parent_id === '') {
      errors.push(`${asset.category} 是变体类，必须带 parent_id 指向角色资产`);
    }
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────
// 错误话术：说清「缺什么」
// ─────────────────────────────────────────────────────────────

/**
 * 当前项目有哪些章（错误话术用）。
 * @param {object} state 投影状态。
 * @returns {string} 一句话。
 */
export function describeChapters(state) {
  const seqs = (state?.chapters ?? []).map((chapter) => chapter?.seq).filter((seq) => seq !== undefined && seq !== null);
  if (seqs.length === 0) return '当前项目还没有章节';
  return `当前项目有第 ${seqs.join('、')} 章`;
}

/**
 * 当前项目有哪些资产（错误话术用）。
 * @param {object} state 投影状态。
 * @returns {string} 一句话。
 */
export function describeAssets(state) {
  const ids = (state?.assets ?? []).map((asset) => asset?.id).filter((id) => typeof id === 'string' && id !== '');
  if (ids.length === 0) return '当前项目还没有任何资产';
  return `当前项目有资产 ${ids.join('、')}`;
}

/**
 * 某一章现有哪几镜（错误话术用）。
 * @param {object | undefined} chapter 章。
 * @returns {string} 一句话。
 */
export function describeShots(chapter) {
  const idxs = (chapter?.shots ?? []).map((shot) => shot?.idx).filter((idx) => idx !== undefined && idx !== null);
  if (idxs.length === 0) return '该章还没有分镜';
  return `该章现有 idx ${idxs.join('、')}`;
}
