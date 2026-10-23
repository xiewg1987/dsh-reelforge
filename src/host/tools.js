/**
 * 注册给 DSH 模型的 12 个工具 + 2 个只读技能工具（冻结契约 F4）。
 *
 * ## 为什么不用 `defineTool`
 *
 * 宿主的 `defineTool` 住在 `@deepseek-ai/dsh-tools` 里。外部插件的 profile 里**没有**这个包，
 * 而本插件坚持**零额外依赖**（不引入 Docker / 独立服务 / 额外安装）。
 * `ctx.tools.register()` 接受的是**普通对象**，所以这里直接构造 `ToolDefinition`。
 * 代价是参数校验要自己做——而这正好是**写入门禁**要干的事（§6.5），不是负担。
 *
 * ## 工具参数封闭（§6.5 要点 1）
 *
 * 每个工具的 `parameters` **只列内容字段**。产物字段（`status` / `video_path` / `seed`）
 * 根本不出现——模型传了也进不来。
 *
 * ## 状态怎么进日志（R1 + R2）
 *
 * 工具返回的规范值里带一个 `patch`；`output.presentationMeta` 把它包成
 * `meta.reelforge` 持久化到 `tool/result` 事件上。投影层 fold 这些补丁重建状态，
 * 所以**不新增会话事件 type**，状态也**完全可从日志重建**。
 */
import { ASSET_CATEGORIES, ASSET_CONTENT_FIELDS, CONTEXT_KEYS, GENERATION_KINDS, RUN_POSITIONS, SHOT_DURATION_MAX, SHOT_DURATION_MIN, TOOL_IDS, VARIANT_ASSET_CATEGORIES } from '../core/constants.js';
import { createAsset, updateAsset } from '../core/assets.js';
import { CHANGELOG_LAYERS, sameRow } from '../core/changelog.js';
import { buildChangelogPayload } from '../core/changelogPayload.js';
import { writeContext } from '../core/consistency.js';
import { materializeProject } from '../core/projectSchema.js';
import { buildPlanPayload } from '../core/planPayload.js';
import { quantizeDurations } from '../core/quantize.js';
import { splitNovelIntoChapters } from '../core/splitChapters.js';
import { validateChapterShots } from '../core/storyboardSchema.js';
import { createSkillTools } from '../skills/skillTools.js';
import { loadSpecSetDir, resolveSpec } from '../workflows/spec.js';
import { createHostChangelog, readRows } from './changelogStore.js';
import { assembleAndDeliver } from './deliverBridge.js';
import { jsonSchemaForLayer, validateWrite } from './gate.js';
import { BUNDLED_SKILLS_DIR, WORKFLOW_SPECS_DIR } from './paths.js';
import { runStage } from './stageBridge.js';
import { resolveProjectPath, resolveWorkspaceRoot, writeFileAtomic } from './workspace.js';

/** 分镜上可以绑资产的字段。 */
const BINDABLE_SHOT_FIELDS = Object.freeze([
  'character_ids',
  'scene_ids',
  'prop_ids',
  'costume_ids',
  'age_ids',
  'audio_ids',
]);

/**
 * 构造一个 ReelForge 工具定义。
 *
 * @param {{ name: string, description: string, parameters: object, execute: Function,
 *           chatKind?: string, chatData?: (value: unknown) => object }} options 工具定义要素。
 *   `chatKind` = 这个工具的结果要在对话里呈现成哪一类消息行（§10.3 的 7 个 kind）。
 * @returns {object} `ToolDefinition` 普通对象。
 */
function defineReelForgeTool({ name, description, parameters, execute, chatKind, chatData }) {
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
 * @param {unknown} value 工具返回值。
 * @returns {string} 文本。
 */
function renderSummary(value) {
  if (!value || typeof value !== 'object') return JSON.stringify(value, null, 2);
  const { patch, ...rest } = value;
  return JSON.stringify(rest, null, 2);
}

/**
 * 取出工具执行上下文里的会话信息。
 * @param {object} exec 工具执行上下文。
 * @returns {{ sessionId: string, cwd: string } | { error: string }} 会话信息或错误。
 */
function sessionContext(exec) {
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
async function materialize(state, cwd, config) {
  if (!state.project) return null;
  const root = resolveWorkspaceRoot(cwd, config.workspaceDir);
  const file = resolveProjectPath(root, 'project.json');
  if (!file) return null;
  const payload = materializeProject({ ...state.project, chapters: state.chapters });
  await writeFileAtomic(file, `${JSON.stringify(payload, null, 2)}\n`);
  return file;
}

/**
 * 生成全部工具定义。
 *
 * @param {{ store: import('./projection.js').ProjectionStore, config: object,
 *           deps?: object }} deps 依赖。
 *   `deps` = 宿主注入的**能力对象**（通道客户端 / 探测客户端等）：
 *   `probe`（探测客户端）/ `comfyClient` / `runningHubClient` / `dshCall` /
 *   `uploadFile` / `userWorkflows` / `hw` / `vramGb` / `ffmpegClient` …
 *   没有它，触发类工具既跑不起来、也说不清「缺哪个能力」。
 * @returns {object[]} `ToolDefinition` 数组。
 */
export function createToolDefinitions({ store, config, deps = {} }) {
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
   * @returns {Promise<void>} 完成。
   */
  const recordChanges = async (sessionId, cwd, before, after) => {
    try {
      const changes = diffRows(before, after);
      if (changes.length === 0) return;
      const engine = changelogOf(sessionId, cwd);
      const projectId = projectIdOf(store.stateOf(sessionId), sessionId);
      const batchId = nextBatchId(sessionId);
      for (const change of changes) {
        const { layer, rowId } = splitRowKey(change.key);
        // 未知层不猜：变更日志只认 CHANGELOG_LAYERS 里的层。
        if (!CHANGELOG_LAYERS.includes(layer)) continue;
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
  };

  /**
   * 应用补丁 + 记变更 + 物化落盘。
   *
   * 顺序：**先记变更再落盘**——落盘失败时变更记录已经在了（回滚仍有依据）；
   * 记变更失败只 warn，不挡写入。
   *
   * @param {string} sessionId 会话 id。
   * @param {string} cwd 会话工作目录。
   * @param {object[]} patches 状态补丁。
   * @returns {Promise<object[]>} 补丁。
   */
  const commit = async (sessionId, cwd, patches) => {
    const before = snapshotRows(readRows(store.stateOf(sessionId)));
    store.applyPatches(sessionId, patches);
    const after = snapshotRows(readRows(store.stateOf(sessionId)));
    await recordChanges(sessionId, cwd, before, after);
    await materialize(store.stateOf(sessionId), cwd, config);
    return patches;
  };

  /** 下一个批次 id（一次工具调用 = 一个批次）。 */
  const nextBatchId = (sessionId) => {
    const next = (batchCounters.get(sessionId) ?? 0) + 1;
    batchCounters.set(sessionId, next);
    return `batch_${sessionId}_${String(next).padStart(4, '0')}`;
  };

  return [
    // ── 1. 导入小说 → 拆章 ──
    defineReelForgeTool({
      name: TOOL_IDS.importNovel,
      description:
        '导入小说正文并自动拆章。拆章判定顺序固定：命中 ≥2 个「第N章」标题按标题切；'
        + '否则正文 ≤6000 字算单章；再否则按 6000 字均分。只写项目内容字段。',
      parameters: {
        ...jsonSchemaForLayer('project'),
        required: ['novel'],
      },
      execute: async (args, exec) => {
        const gate = validateWrite('project', args);
        if (!gate.ok) return { ok: false, errors: gate.errors };
        // 空正文会拆出 0 章——那是一个「有名字、没有内容」的空项目。
        // 与其落一个空壳，不如说清缺什么（DoD：不许静默降质）。
        if (typeof gate.value.novel !== 'string' || gate.value.novel.trim() === '') {
          return { ok: false, errors: ['novel 不能为空：导入小说至少要有一段正文（空正文拆不出任何章节）'] };
        }
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        const chapters = splitNovelIntoChapters(gate.value.novel);
        const patches = [
          { op: 'project.set', value: projectContent(gate.value) },
          ...chapters.map((chapter) => ({
            op: 'chapter.upsert',
            seq: chapter.seq,
            value: { title: chapter.title, novel: chapter.content, script: '' },
          })),
        ];
        await commit(context.sessionId, context.cwd, patches);
        return {
          ok: true,
          chapterCount: chapters.length,
          chapters: chapters.map((chapter) => ({
            seq: chapter.seq,
            title: chapter.title,
            chars: chapter.content.length,
          })),
          patch: patches,
        };
      },
      chatKind: 'reelforge-chapters',
      chatData: (value) => ({
        chapters: (value.chapters ?? []).map((chapter) => ({
          id: chapter.seq ?? null,
          title: chapter.title ?? '',
          shotCount: chapter.shotCount ?? 0,
          durationSec: chapter.durationSec ?? 0,
          status: 'queued',
          tone: 'queued',
        })),
      }),
    }),

    // ── 2. 写分镜（整章） ──
    defineReelForgeTool({
      name: TOOL_IDS.setStoryboard,
      description:
        '写某一章的分镜（整章批量或单镜）。只收内容字段；产物字段（status / video_path / seed）'
        + '不可写。章内 idx 必须 ≥1 且唯一，对白不超过 5.5 字每秒，每镜最多 2 个说话人。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号（章内唯一）' },
          shots: {
            type: 'array',
            description: '分镜数组，元素只含内容字段',
            items: jsonSchemaForLayer('shot'),
          },
        },
        required: ['seq', 'shots'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        if (!Number.isInteger(args.seq) || args.seq < 1) {
          return { ok: false, errors: ['seq 必须是 ≥1 的整数'] };
        }
        if (!Array.isArray(args.shots)) {
          return { ok: false, errors: ['shots 必须是数组'] };
        }
        const errors = [];
        const accepted = [];
        args.shots.forEach((shot, index) => {
          const gate = validateWrite('shot', shot, { chapterShots: accepted });
          if (!gate.ok) {
            errors.push(`第 ${index + 1} 条分镜：${gate.errors.join('；')}`);
            return;
          }
          accepted.push(gate.value);
        });
        if (errors.length) return { ok: false, errors };

        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 章必须存在：`chapter.shots` 补丁落到不存在的章上会被投影**静默忽略**，
        // 工具却回「已写 N 镜」——那是骗人（DoD：不许静默降质）。
        const state = store.stateOf(context.sessionId);
        const chapter = (state.chapters ?? []).find((item) => item.seq === args.seq);
        if (!chapter) {
          return { ok: false, errors: [`第 ${args.seq} 章不存在（${describeChapters(state)}）`] };
        }

        // 章级复核：逐条过完门禁之后，再对**整章**判一次（idx 唯一 / 速率 / 说话人数）。
        const chapterCheck = validateChapterShots(accepted);
        if (!chapterCheck.ok) return { ok: false, errors: chapterCheck.errors };

        // 时长量化（§7.2）：项目声明了目标时长时，整章按后端允许集合 D 守恒分配。
        const quantized = quantizeChapter(state.project, accepted, null, null);
        if (quantized.errors.length) return { ok: false, errors: quantized.errors };

        const patches = [{ op: 'chapter.shots', seq: args.seq, shots: quantized.shots }];
        await commit(context.sessionId, context.cwd, patches);
        return {
          ok: true,
          seq: args.seq,
          shotCount: quantized.shots.length,
          shots: quantized.shots,
          warnings: quantized.warnings,
          patch: patches,
        };
      },
      chatKind: 'reelforge-storyboard',
      chatData: (value) => ({
        seq: value.seq,
        shots: (value.shots ?? []).map((shot) => ({
          id: shot.idx ?? null,
          label: shot.scene_name ?? `镜头 ${shot.idx ?? '?'}`,
          shot_size: shot.shot_size ?? '',
          camera: shot.camera ?? '',
          duration: shot.duration ?? 0,
          dialogue: shot.dialogue ?? '',
          status: 'queued',
          tone: 'queued',
        })),
      }),
    }),

    // ── 3. 写上下文三键 ──
    defineReelForgeTool({
      name: TOOL_IDS.saveContext,
      description:
        '写上下文三键之一：bible（人物圣经，必须含场景站位表，整段覆盖并合并）、'
        + 'style（风格指南，整段覆盖）、continuity（连续性记录，追加）。只接受这三个键，多写报错。',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: [...CONTEXT_KEYS], description: '上下文键' },
          value: { type: 'string', description: '内容' },
        },
        required: ['key', 'value'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        if (!CONTEXT_KEYS.includes(args.key)) {
          return { ok: false, errors: [`key 只能是 ${CONTEXT_KEYS.join(' | ')}`] };
        }
        if (typeof args.value !== 'string') {
          return { ok: false, errors: ['value 必须是字符串'] };
        }
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 落盘用 T2 的写入器：bible 先读回再合并、style 整段覆盖、continuity 只追加
        const root = resolveWorkspaceRoot(context.cwd, config.workspaceDir);
        let written;
        try {
          written = writeContext(root, args.key, args.value);
        } catch (error) {
          return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
        }

        const patches = [{ op: 'context.set', key: args.key, value: args.value }];
        await commit(context.sessionId, context.cwd, patches);
        return {
          ok: true,
          key: args.key,
          warnings: written?.warnings ?? [],
          patch: patches,
        };
      },
    }),

    // ── 4. 改单镜内容 ──
    defineReelForgeTool({
      name: TOOL_IDS.updateShot,
      description: '改某一章某一镜的内容字段。产物字段不可写。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号' },
          idx: { type: 'integer', description: '章内镜号' },
          ...jsonSchemaForLayer('shot').properties,
        },
        required: ['seq', 'idx'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const { seq, idx, ...fields } = args;
        if (!Number.isInteger(seq) || seq < 1) return { ok: false, errors: ['seq 必须是 ≥1 的整数'] };
        if (!Number.isInteger(idx) || idx < 1) return { ok: false, errors: ['idx 必须是 ≥1 的整数'] };
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        const state = store.stateOf(context.sessionId);
        const chapter = state.chapters.find((item) => item.seq === seq);
        const existing = chapter?.shots.find((shot) => shot.idx === idx);
        if (!existing) return { ok: false, errors: [`第 ${seq} 章没有 idx=${idx} 的分镜`] };

        const gate = validateWrite('shot', fields, {
          existing,
          chapterShots: (chapter?.shots ?? []).filter((shot) => shot.idx !== idx),
        });
        if (!gate.ok) return { ok: false, errors: gate.errors };

        // 时长量化（§7.2）：项目声明了目标时长时，整章按后端允许集合 D 守恒分配。
        const quantized = quantizeChapter(state.project, chapter?.shots ?? [], gate.value, idx);
        const patches = quantized.rewritten
          ? [{ op: 'chapter.shots', seq, shots: quantized.shots }]
          : [{ op: 'shot.set', seq, idx, value: gate.value }];
        await commit(context.sessionId, context.cwd, patches);
        return {
          ok: true,
          seq,
          idx,
          warnings: quantized.warnings,
          patch: patches,
        };
      },
    }),

    // ── 5. 新建资产 ──
    defineReelForgeTool({
      name: TOOL_IDS.createAsset,
      description:
        '新建一个资产。分类只能取 10 类之一；服装（costume）与年龄（age）是变体类，必须带 parent_id。'
        + '产物字段（image_path / voice_ref）不可写。',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '资产 id（不填则自动生成）' },
          category: { type: 'string', enum: [...ASSET_CATEGORIES], description: '资产分类' },
          name: { type: 'string', description: '资产名' },
          description: { type: 'string', description: '描述' },
          parent_id: { type: 'string', description: '变体类必填：指向角色资产 id' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签' },
        },
        required: ['category', 'name'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const errors = validateAsset(args, true);
        if (errors.length) return { ok: false, errors };
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 资产模型归 T2：分类枚举、变体 parent_id、产物字段门禁都在那边
        let asset;
        try {
          asset = createAsset(pickAssetFields(args));
        } catch (error) {
          return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
        }
        asset.id = args.id || asset.id || `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

        const patches = [{ op: 'asset.upsert', value: asset }];
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, asset, patch: patches };
      },
      chatKind: 'reelforge-assets',
      chatData: (value) => ({ assets: value.asset ? [value.asset] : [] }),
    }),

    // ── 6. 改资产 ──
    defineReelForgeTool({
      name: TOOL_IDS.updateAsset,
      description: '改一个资产的内容字段。产物字段（image_path / voice_ref）不可写。',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '资产 id' },
          category: { type: 'string', enum: [...ASSET_CATEGORIES] },
          name: { type: 'string' },
          description: { type: 'string' },
          parent_id: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['id'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const { id, ...fields } = args;
        const errors = validateAsset(fields, false);
        if (errors.length) return { ok: false, errors };
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        const state = store.stateOf(context.sessionId);
        const existing = state.assets.find((item) => item.id === id);
        // 资产必须存在：不存在时旧实现会**绕过 createAsset 的校验**写一个
        // 只有 id 的残缺资产（没有分类、没有名字），还回 ok:true。
        // 那是「接口答应了却没做到」——直接报错，并说清现在有哪些资产。
        if (!existing) {
          return { ok: false, errors: [`没有资产 id=${id}（${describeAssets(state)}）`] };
        }
        let asset;
        try {
          asset = updateAsset(existing, pickAssetFields(fields));
        } catch (error) {
          return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
        }

        const patches = [{ op: 'asset.upsert', value: asset }];
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, asset, patch: patches };
      },
      chatKind: 'reelforge-assets',
      chatData: (value) => ({ assets: value.asset ? [value.asset] : [] }),
    }),

    // ── 7. 绑资产到分镜 ──
    defineReelForgeTool({
      name: TOOL_IDS.bindAsset,
      description: '把资产 id 绑到某一镜。只收 id 数组，数组元素必须是字符串。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号' },
          idx: { type: 'integer', description: '章内镜号' },
          field: { type: 'string', enum: [...BINDABLE_SHOT_FIELDS], description: '要绑定的字段' },
          ids: { type: 'array', items: { type: 'string' }, description: '资产 id 数组' },
        },
        required: ['seq', 'idx', 'field', 'ids'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        if (!BINDABLE_SHOT_FIELDS.includes(args.field)) {
          return { ok: false, errors: [`field 只能是 ${BINDABLE_SHOT_FIELDS.join(' | ')}`] };
        }
        if (!Array.isArray(args.ids) || args.ids.some((id) => typeof id !== 'string')) {
          return { ok: false, errors: ['ids 必须是字符串数组'] };
        }
        if (!Number.isInteger(args.seq) || args.seq < 1) {
          return { ok: false, errors: ['seq 必须是 ≥1 的整数'] };
        }
        if (!Number.isInteger(args.idx) || args.idx < 1) {
          return { ok: false, errors: ['idx 必须是 ≥1 的整数'] };
        }
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 目标镜必须存在：`asset.bind` 补丁落到不存在的镜上会被投影**静默忽略**，
        // 工具却回 ok:true——什么也没绑上，却说成功了（DoD：不许静默降质）。
        const state = store.stateOf(context.sessionId);
        const chapter = (state.chapters ?? []).find((item) => item.seq === args.seq);
        if (!chapter) {
          return { ok: false, errors: [`第 ${args.seq} 章不存在（${describeChapters(state)}）`] };
        }
        const shot = (chapter.shots ?? []).find((item) => item.idx === args.idx);
        if (!shot) {
          return {
            ok: false,
            errors: [`第 ${args.seq} 章没有 idx=${args.idx} 的分镜（${describeShots(chapter)}）`],
          };
        }

        const patches = [{
          op: 'asset.bind',
          seq: args.seq,
          idx: args.idx,
          field: args.field,
          ids: args.ids,
        }];
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, patch: patches };
      },
    }),

    // ── 8. 跑阶段（触发类） ──
    defineReelForgeTool({
      name: TOOL_IDS.runStage,
      description:
        '跑一个阶段：llm（剧本与提示词）/ image（参考图）/ tts（音色样本）/ video（视频）。'
        + '固定顺序串行；video 硬依赖 image（缺参考图直接报错），软依赖 tts（缺失会降质并标出来）。'
        + '本工具会消耗算力与费用，需用户确认。',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', enum: ['llm', 'image', 'tts', 'video'], description: '阶段' },
          seq: { type: 'integer', description: '限定章节（不填则全部）' },
        },
        required: ['stage'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };
        const result = await runStage({
          stage: args.stage,
          seq: args.seq,
          sessionId: context.sessionId,
          store,
          config,
          cwd: context.cwd,
          signal: exec.signal,
          deps,
        });
        if (result.patches?.length) {
          await commit(context.sessionId, context.cwd, result.patches);
        }
        return {
          ok: result.ok,
          stage: result.stage,
          position: result.position,
          provider: result.provider,
          items: result.items ?? [],
          products: result.products ?? [],
          skipped: result.skipped ?? [],
          failed: result.failed ?? [],
          warnings: result.warnings ?? [],
          errors: result.errors ?? [],
          patch: result.patches ?? [],
        };
      },
      chatKind: 'reelforge-progress',
      chatData: (value) => ({
        stage: value.stage ?? '',
        chapter: value.items?.length ? `${value.items.length} 项` : '',
        shot: value.skipped?.length ? `跳过 ${value.skipped.length}` : '',
        elapsed: value.warnings?.length ? `${value.warnings.length} 条提示` : '',
      }),
    }),

    // ── 9. 重生成单镜（触发类） ──
    defineReelForgeTool({
      name: TOOL_IDS.regenerateShot,
      description: '重生成某一章某一镜的视频。参数没变时不重复计费（内容指纹幂等）。会消耗算力与费用，需用户确认。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号' },
          idx: { type: 'integer', description: '章内镜号' },
        },
        required: ['seq', 'idx'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 目标镜必须存在：章里没这一镜时，旧实现会走「本阶段没有待处理项」的
        // **成功分支**——什么都没重生成，却回 ok:true（DoD：不许静默降质）。
        const state = store.stateOf(context.sessionId);
        const chapter = (state.chapters ?? []).find((item) => item.seq === args.seq);
        if (!chapter) {
          return {
            ok: false,
            stage: 'video',
            seq: args.seq,
            idx: args.idx,
            items: [],
            warnings: [],
            errors: [`第 ${args.seq} 章不存在（${describeChapters(state)}）`],
            patch: [],
          };
        }
        const shot = (chapter.shots ?? []).find((item) => item.idx === args.idx);
        if (!shot) {
          return {
            ok: false,
            stage: 'video',
            seq: args.seq,
            idx: args.idx,
            items: [],
            warnings: [],
            errors: [`第 ${args.seq} 章没有 idx=${args.idx} 的分镜（${describeShots(chapter)}）`],
            patch: [],
          };
        }

        const result = await runStage({
          stage: 'video',
          seq: args.seq,
          idx: args.idx,
          force: true,
          sessionId: context.sessionId,
          store,
          config,
          cwd: context.cwd,
          signal: exec.signal,
          deps,
        });
        if (result.patches?.length) {
          await commit(context.sessionId, context.cwd, result.patches);
        }
        // 这一镜**已有产物**：重生成会覆盖它——要说出来，别让人以为没动过。
        const warnings = [...(result.warnings ?? [])];
        if (shot.video_path) {
          warnings.unshift(
            `第 ${args.seq} 章第 ${args.idx} 镜已有产物（video_path=${shot.video_path}），本次重生成会覆盖它`,
          );
        }
        return {
          ok: result.ok,
          stage: result.stage,
          seq: args.seq,
          idx: args.idx,
          items: result.items ?? [],
          warnings,
          errors: result.errors ?? [],
          patch: result.patches ?? [],
        };
      },
      chatKind: 'reelforge-progress',
      chatData: (value) => ({
        stage: 'video',
        chapter: `第 ${value.seq ?? '?'} 章`,
        shot: `第 ${value.idx ?? '?'} 镜`,
        elapsed: value.items?.length ? '重生成' : '',
      }),
    }),

    // ── 10. 合成章节（触发类） ──
    defineReelForgeTool({
      name: TOOL_IDS.assembleChapter,
      description:
        '把某一章的片段合成为成片并生成字幕。输出 H.264 + AAC / 24fps / yuv420p / faststart；'
        + '带字幕与无字幕两版。缺 ffmpeg 时会明说并附拼接命令。需用户确认。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号' },
        },
        required: ['seq'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };
        const result = await assembleAndDeliver({
          seq: args.seq,
          store,
          sessionId: context.sessionId,
          config,
          cwd: context.cwd,
          signal: exec.signal,
          deps,
        });
        if (result.patches?.length) {
          await commit(context.sessionId, context.cwd, result.patches);
        }
        return {
          ok: result.ok,
          seq: result.seq,
          title: result.title,
          degradations: result.degradations ?? [],
          notices: result.notices ?? [],
          payload: result.payload,
          errors: result.errors ?? [],
          patch: result.patches ?? [],
        };
      },
      chatKind: 'reelforge-deliver',
      chatData: (value) => ({
        chapters: (value.payload?.chapters ?? []).map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          shotCount: chapter.shotCount,
          durationSec: chapter.durationSec,
          deliverables: chapter.deliverables,
        })),
      }),
    }),

    // ── 11. 指定章节背景音乐 ──
    defineReelForgeTool({
      name: TOOL_IDS.setChapterMusic,
      description: '给某一章指定背景音乐。写内容字段，不触发生成。',
      parameters: {
        type: 'object',
        properties: {
          seq: { type: 'integer', description: '章节序号' },
          music_path: { type: 'string', description: '工作区内的音乐文件相对路径' },
        },
        required: ['seq', 'music_path'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };

        // 章必须存在：`chapter.music` 补丁落到不存在的章上会被投影**静默忽略**，
        // 工具却回 ok:true——音乐根本没设上（DoD：不许静默降质）。
        const state = store.stateOf(context.sessionId);
        const chapter = (state.chapters ?? []).find((item) => item.seq === args.seq);
        if (!chapter) {
          return { ok: false, errors: [`没有第 ${args.seq} 章（${describeChapters(state)}）`] };
        }

        const patches = [{
          op: 'chapter.music',
          seq: args.seq,
          value: { music_path: args.music_path },
        }];
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, patch: patches };
      },
    }),

    // ── 12. 回滚（触发类） ──
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
          patch: [],
        };
      },
      chatKind: 'reelforge-changelog',
      chatData: (value) => buildChangelogPayload({
        entries: (value.rolledBack ?? []).map((item) => ({
          id: item.entryId ?? null,
          at: item.at ?? null,
          summary: `${item.layer ?? ''} ${item.rowId ?? ''} · ${item.field ?? ''}`,
          field: item.field ?? '*',
          batchId: item.batchId,
        })),
      }),
    }),

    // ── 13. 改执行路径（kind × 位置）──
    defineReelForgeTool({
      name: TOOL_IDS.updatePlan,
      description:
        '改执行路径：选生成 kind（t2i / i2i / r2v / tts / music）与运行位置（local / cloud）。'
        + 'kind 与位置是**正交的两维**——同一批 kind 在本地与云端都跑得起来，'
        + '差别在跑在哪、计不计费、受什么约束。改方案不烧钱，所以不走 ask。',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...GENERATION_KINDS], description: '生成 kind' },
          position: { type: 'string', enum: [...RUN_POSITIONS], description: '运行位置' },
        },
        required: ['kind', 'position'],
        additionalProperties: false,
      },
      execute: async (args, exec) => {
        if (!GENERATION_KINDS.includes(args.kind)) {
          return { ok: false, errors: [`kind 必须是 ${GENERATION_KINDS.join(' | ')}`] };
        }
        if (!RUN_POSITIONS.includes(args.position)) {
          return { ok: false, errors: [`position 必须是 ${RUN_POSITIONS.join(' | ')}`] };
        }
        const context = sessionContext(exec);
        if (context.error) return { ok: false, errors: [context.error] };
        const provider = args.position === 'cloud' ? config.cloudProvider : 'native';
        const patches = [{ op: 'plan.set', value: { kind: args.kind, position: args.position, provider } }];
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, ...planOf(args.kind, args.position, provider), patch: patches };
      },
      chatKind: 'reelforge-plan',
      chatData: (value) => ({
        kind: value.kind,
        position: value.position,
        provider: value.provider,
        candidates: value.candidates,
      }),
    }),

    // ── 14. 读技能正文（只读） ──
    defineReelForgeTool({
      name: TOOL_IDS.skill,
      description:
        '读一个技能的正文，返回 XML 包裹的正文 + 参考文件索引（每条含文件名、字数、前 160 字预览）。'
        + '技能不存在时抛错并列出可用项。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '技能名' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      execute: async (args) => {
        const tools = createSkillTools({ bundledDir: BUNDLED_SKILLS_DIR });
        try {
          // `runSkill` 返回的是**一整段 XML 文本**（不是对象）——别用展开运算符摊开它。
          return { ok: true, content: tools.skill({ name: args.name }) };
        } catch (error) {
          return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
        }
      },
    }),

    // ── 15. 读技能参考文件（只读） ──
    defineReelForgeTool({
      name: TOOL_IDS.skillReference,
      description:
        '读一个技能的参考文件全文。按文件名精确匹配，仅 .md / .txt。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '技能名' },
          ref: { type: 'string', description: '参考文件名' },
        },
        required: ['name', 'ref'],
        additionalProperties: false,
      },
      execute: async (args) => {
        const tools = createSkillTools({ bundledDir: BUNDLED_SKILLS_DIR });
        try {
          return { ok: true, content: tools.skill_reference({ name: args.name, ref: args.ref }) };
        } catch (error) {
          return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
        }
      },
    }),
  ];
}

/**
 * 只取项目内容字段。
 * @param {object} value 合并后的值。
 * @returns {object} 项目内容字段。
 */
function projectContent(value) {
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
 */
const ALLOWED_DURATIONS = Object.freeze(
  Array.from({ length: SHOT_DURATION_MAX - SHOT_DURATION_MIN + 1 }, (_, i) => SHOT_DURATION_MIN + i),
);

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
function quantizeChapter(project, shots, override, overrideIdx) {
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
 * 造「执行路径」的行数据（`kind × 位置`）。
 *
 * 候选表 = 五种 kind × 两个位置 = 10 项，**kind 与位置是正交的两维**：
 * 同一批 kind 在本地与云端都跑得起来，差别在跑在哪、计不计费、受什么约束。
 *
 * ⚠️ 形状由 **T5 的 `buildPlanPayload`（F9）** 决定——这里只负责**备料**，
 * 不自己拼 payload（自己拼 = 两处实现 = 形状必然漂）。
 *
 * 候选的 `sourceFile` 来自随包规格集；规格集读不到时留空字符串——
 * **不许编一个假的文件名**。
 *
 * @param {string} kind 当前 kind。
 * @param {string} position 当前执行位置。
 * @param {string} provider 当前 provider。
 * @returns {{ kind: string, position: string, provider?: string, candidates: Array<object> }} 行数据。
 */
function planOf(kind, position, provider) {
  const candidates = [];
  for (const candidateKind of GENERATION_KINDS) {
    for (const candidatePosition of RUN_POSITIONS) {
      candidates.push({
        kind: candidateKind,
        position: candidatePosition,
        sourceFile: sourceFileOf(candidateKind, candidatePosition),
        label: `${candidateKind} · ${candidatePosition}`,
      });
    }
  }
  const built = buildPlanPayload({ kind, position, provider, candidates });
  return built.payload;
}

/**
 * 取某 kind × 位置的规格文件（相对工作区）。
 * @param {string} kind 生成 kind。
 * @param {string} position 执行位置。
 * @returns {string} 规格里的模板相对路径；取不到返回空串。
 */
function sourceFileOf(kind, position) {
  try {
    const specSets = loadSpecSetDir(WORKFLOW_SPECS_DIR);
    const resolved = resolveSpec({
      kind,
      provider: position === 'cloud' ? 'runninghub' : 'native',
      hw: 'nvidia',
      specSets,
    });
    return resolved?.spec?.sourceFile ?? '';
  } catch {
    return '';
  }
}

/**
 * 只取资产内容字段。
 * @param {object} value 资产值。
 * @returns {object} 资产内容字段。
 */
function pickAssetFields(value) {
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
function validateAsset(asset, requireCategory) {
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
function snapshotRows(rows) {
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
function snapshotRow(row) {
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
function normalizeUndefined(value) {
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
function diffRows(before, after) {
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
function splitRowKey(key) {
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
function projectIdOf(state, sessionId) {
  const name = state?.project?.name;
  if (typeof name === 'string' && name.trim() !== '') return name;
  return sessionId;
}

// ─────────────────────────────────────────────────────────────
// 错误话术：说清「缺什么」
// ─────────────────────────────────────────────────────────────

/**
 * 当前项目有哪些章（错误话术用）。
 * @param {object} state 投影状态。
 * @returns {string} 一句话。
 */
function describeChapters(state) {
  const seqs = (state?.chapters ?? []).map((chapter) => chapter?.seq).filter((seq) => seq !== undefined && seq !== null);
  if (seqs.length === 0) return '当前项目还没有章节';
  return `当前项目有第 ${seqs.join('、')} 章`;
}

/**
 * 当前项目有哪些资产（错误话术用）。
 * @param {object} state 投影状态。
 * @returns {string} 一句话。
 */
function describeAssets(state) {
  const ids = (state?.assets ?? []).map((asset) => asset?.id).filter((id) => typeof id === 'string' && id !== '');
  if (ids.length === 0) return '当前项目还没有任何资产';
  return `当前项目有资产 ${ids.join('、')}`;
}

/**
 * 某一章现有哪几镜（错误话术用）。
 * @param {object | undefined} chapter 章。
 * @returns {string} 一句话。
 */
function describeShots(chapter) {
  const idxs = (chapter?.shots ?? []).map((shot) => shot?.idx).filter((idx) => idx !== undefined && idx !== null);
  if (idxs.length === 0) return '该章还没有分镜';
  return `该章现有 idx ${idxs.join('、')}`;
}

