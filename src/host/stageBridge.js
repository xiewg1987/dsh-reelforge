/**
 * 阶段执行桥（T1 宿主半 ↔ T3 编排器）。
 *
 * ## 职责边界
 *
 * T3 的 `src/core/stageOrchestrator.js` 是**纯逻辑**：它不认识宿主、不认识工作区、
 * 不知道 ComfyUI 在哪。本文件负责把「宿主世界」翻译成编排器认识的东西：
 *
 *   - 从投影状态里**造工作项**（每个阶段该做什么）；
 *   - 把探测（probe）、通道（comfyui / runninghub / dsh）**注入**编排器；
 *   - 把编排器产出的**产物**翻译回状态补丁（`shot.set` / `asset.upsert`）。
 *
 * 编排器**不碰**的东西：文件读写、网络、宿主上下文——一律走注入。
 *
 * ## llm 阶段的特殊处理
 *
 * `llm` 阶段写的是**内容字段**（人物圣经 / 风格指南 / 分镜 / 提示词），
 * 不是产物字段——而内容字段只能由**模型**写（写入门禁 §6.5）。
 * 在 DSH 里，「模型」就是当前会话里的那个模型，它通过
 * `save_context` / `set_storyboard` 两个工具来写。
 *
 * 所以 `llm` 阶段在桥里的动作是：**产出待办清单**（哪一章缺什么），
 * 让模型在这一轮里把它写掉；桥**不代写**内容。
 *
 * ## 桥负责的三件"跨调用"的事
 *
 * 编排器（`src/core/stageOrchestrator.js`）是**一次调用一个语义**：
 * 硬依赖看的是"**同一次编排**里跑过哪些阶段"，幂等看的是"**上一次编排**留下的指纹表"。
 * 桥一次只跑一个阶段，于是这两件事都得由桥翻译：
 *
 * 1. **已经跑过的阶段**（F1）→ 折成"空工作项的补跑阶段"塞进这一次编排，
 *    编排器才认这次 `video` 的 `image` 硬依赖已经满足；
 * 2. **上一次的指纹表**（F5）→ 按会话缓存带回来，"内容没变就不重复生成、
 *    不重复计费"才在桥这一侧生效；
 * 3. **提交载荷**（F2）→ 走 `src/workflows/runner.js` 的既有能力
 *    （克隆模板 → 写 roles → 绑参考素材 → 裁剪），通道拿到的必须是**装好的工作流**。
 *
 * @module host/stageBridge
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { GENERATION_KINDS, STAGE_DEPENDENCIES, STAGES } from '../core/constants.js';
import { analyzeWorkflow } from '../core/analyzeWorkflow.js';
import { buildShotPrompt } from '../core/promptBuilder.js';
import { computeFingerprint, createStageOrchestrator } from '../core/stageOrchestrator.js';
import { checkVramGate, probeCapabilities, selectForStage } from '../core/probe.js';
import { flattenRefs, resolveRefs } from '../core/refs.js';
import { loadSpecSetDir, normalizeAnalyzedSpec, REQUIRED_ROLES_BY_KIND, resolveSpec } from '../workflows/spec.js';
import { bindMedia, buildPromptPayload, cloneTemplate } from '../workflows/runner.js';
import { WORKFLOW_SPECS_DIR } from './paths.js';
import { resolveProjectPath, resolveWorkspaceRoot, writeFileAtomic } from './workspace.js';

/** 需要**参考图**的资产类别（`image` 阶段的对象）。 */
const IMAGE_ASSET_CATEGORIES = Object.freeze(['character', 'scene', 'prop', 'costume', 'age']);

/** 云端产物的落盘目录（**工作区内**，产物字段写的就是这里的相对路径）。 */
const REMOTE_FILE_DIRS = Object.freeze({
  image: 'assets/images',
  tts: 'assets/voices',
  video: 'assets/videos',
});

/** 扩展名从 url 看不出来时的兜底。 */
const REMOTE_FILE_EXT = Object.freeze({
  image: '.png',
  tts: '.wav',
  video: '.mp4',
});

/** 幂等指纹缓存的会话上限（超出按最旧淘汰，别让内存无限长）。 */
const FINGERPRINT_CACHE_MAX_SESSIONS = 16;

/**
 * 会话内的**幂等指纹缓存**（派生缓存，不是事实源）。
 *
 * 编排器把"内容指纹 → 产物"记在 `state.completed`（按工作项 key），
 * 而桥每次调用都是**一次新的编排**——不把上次的表带过去，
 * "内容没变就不重复生成、不重复计费"在桥这一侧就永远不生效（`skipped` 恒空）。
 *
 * 事实源仍然是投影状态里的**产物字段**（重启后靠它兜底）；
 * 这张表只负责"跑了一半 / 补丁没提交"这类重跑不再重复计费。
 *
 * @type {Map<string, Map<string, {fingerprint: string, product: object|null, at: number}>>}
 */
const fingerprintCache = new Map();

/**
 * 缓存键：会话 id + 工作区根（同一个会话换了工程就是另一份）。
 * @param {string} sessionId
 * @param {string} workspaceRoot
 */
function cacheKey(sessionId, workspaceRoot) {
  return `${sessionId}::${workspaceRoot}`;
}

/**
 * 读某个会话的指纹表。
 * @param {string} sessionId
 * @param {string} workspaceRoot
 * @returns {Record<string, object>} 指纹表（`{ [itemKey]: {fingerprint, product, at} }`）。
 */
function readFingerprints(sessionId, workspaceRoot) {
  const table = fingerprintCache.get(cacheKey(sessionId, workspaceRoot));
  return table ? Object.fromEntries(table) : {};
}

/**
 * 把这次的指纹表并回缓存。
 * @param {string} sessionId
 * @param {string} workspaceRoot
 * @param {Record<string, object>} completed
 */
function writeFingerprints(sessionId, workspaceRoot, completed) {
  const key = cacheKey(sessionId, workspaceRoot);
  const table = fingerprintCache.get(key) ?? new Map();
  for (const [itemKey, entry] of Object.entries(completed ?? {})) {
    if (!entry || typeof entry !== 'object') continue;
    table.set(itemKey, entry);
  }
  fingerprintCache.set(key, table);
  while (fingerprintCache.size > FINGERPRINT_CACHE_MAX_SESSIONS) {
    const oldest = fingerprintCache.keys().next();
    if (oldest.done) break;
    fingerprintCache.delete(oldest.value);
  }
}

/**
 * 从投影状态推导「哪些阶段已经跑过」。
 *
 * 判据只看**产物字段**——产物字段在 = 那一阶段真的跑过：
 *
 * - `image`：有参考图类资产（人物 / 场景 / 道具 / 服装 / 年龄）拿到了 `image_path`；
 * - `tts`：有音色资产拿到了 `voice_ref`；
 * - `video`：有分镜拿到了 `video_path`。
 *
 * 为什么必须有它：编排器的硬依赖判定看的是"**同一次编排**里跑过哪些阶段"，
 * 桥一次只跑一个阶段 → 不把这个结论喂回去，`video` 永远过不了 `image` 那道硬依赖。
 *
 * @param {object} state 投影状态。
 * @returns {Set<string>} 已经跑过的阶段名。
 */
export function deriveCompletedStages(state) {
  const completed = new Set();
  const assets = Array.isArray(state?.assets) ? state.assets : [];

  const imageAssets = assets.filter((asset) => IMAGE_ASSET_CATEGORIES.includes(asset?.category));
  if (imageAssets.some((asset) => Boolean(asset.image_path))) completed.add('image');

  const voiceAssets = assets.filter((asset) => asset?.category === 'voice');
  if (voiceAssets.some((asset) => Boolean(asset.voice_ref))) completed.add('tts');

  const shots = (Array.isArray(state?.chapters) ? state.chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter?.shots) ? chapter.shots : []));
  if (shots.some((shot) => Boolean(shot.video_path))) completed.add('video');

  return completed;
}

/**
 * 阶段 → 生成 kind 的映射。
 *
 * `image` 阶段出的是**参考图**（`t2i`），`video` 阶段出的是**成片**（`r2v`），
 * `tts` 阶段出的是**音色**（`tts`）。`llm` 阶段不出图，故没有 kind。
 */
const STAGE_KIND = Object.freeze({
  llm: null,
  image: 't2i',
  tts: 'tts',
  video: 'r2v',
});

/**
 * 读规格集目录（一次读完，后面复用）。
 * @returns {Record<string, object>} kind → 规格集。
 */
function readSpecSets() {
  try {
    return loadSpecSetDir(WORKFLOW_SPECS_DIR);
  } catch {
    return {};
  }
}

/**
 * 从工作区里读一张 ComfyUI 模板（用户自备，插件不分发）。
 *
 * @param {string} workspaceRoot 工作区绝对路径。
 * @param {string} sourceFile 相对路径。
 * @returns {Promise<object | null>} 模板；读不到返回 `null`。
 */
async function readTemplate(workspaceRoot, sourceFile) {
  const file = resolveProjectPath(workspaceRoot, sourceFile);
  if (!file) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 造出某一阶段的工作项。
 *
 * @param {string} stage 阶段名。
 * @param {object} state 投影状态。
 * @param {{seq?: number, idx?: number, force?: boolean}} [scope] 限定范围。
 *   `force` = 已有产物的也重做（**重生成单镜**用）。
 * @returns {Array<object>} 工作项。
 */
export function buildItems(stage, state, scope = {}) {
  const { seq, idx, force = false } = scope;
  const chapters = (Array.isArray(state.chapters) ? state.chapters : [])
    .filter((chapter) => seq === undefined || chapter.seq === seq);
  const assets = Array.isArray(state.assets) ? state.assets : [];

  if (stage === 'llm') {
    const items = [];
    for (const chapter of chapters) {
      const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
      const missing = [];
      if (shots.length === 0) missing.push('分镜');
      if (shots.some((shot) => !shot.video_prompt)) missing.push('视频提示词');
      if (missing.length === 0) continue;
      items.push({
        id: `llm:${chapter.seq}`,
        key: `llm:${chapter.seq}`,
        stage,
        shot: null,
        assets,
        chapter,
        missing,
        fingerprintContent: JSON.stringify({
          seq: chapter.seq,
          title: chapter.title ?? '',
          shots: shots.length,
          novel: (chapter.novel ?? '').length,
        }),
      });
    }
    return items;
  }

  if (stage === 'image') {
    return assets
      .filter((asset) => IMAGE_ASSET_CATEGORIES.includes(asset.category))
      .filter((asset) => force || !asset.image_path)
      .map((asset) => ({
        id: `image:${asset.id}`,
        key: `image:${asset.id}`,
        stage,
        asset,
        assets,
        fingerprintContent: JSON.stringify({
          id: asset.id,
          category: asset.category,
          name: asset.name ?? '',
          description: asset.description ?? '',
        }),
      }));
  }

  if (stage === 'tts') {
    return assets
      .filter((asset) => asset.category === 'voice' && (force || !asset.voice_ref))
      .map((asset) => ({
        id: `tts:${asset.id}`,
        key: `tts:${asset.id}`,
        stage,
        asset,
        assets,
        fingerprintContent: JSON.stringify({
          id: asset.id,
          name: asset.name ?? '',
          parent: asset.parent_id ?? null,
        }),
      }));
  }

  if (stage === 'video') {
    const items = [];
    for (const chapter of chapters) {
      const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
      for (const shot of shots) {
        if (!force && shot.video_path) continue;
        if (idx !== undefined && shot.idx !== idx) continue;
        items.push({
          id: `video:${chapter.seq}:${shot.idx}`,
          key: `video:${chapter.seq}:${shot.idx}`,
          stage,
          shot,
          chapter,
          assets,
          fingerprintContent: JSON.stringify({
            seq: chapter.seq,
            idx: shot.idx,
            video_prompt: shot.video_prompt ?? '',
            duration: shot.duration ?? 0,
            aspect_ratio: shot.aspect_ratio ?? '',
            // 参考素材也进指纹：参考图换了 → 结果一定不同 → 必须重跑
            refs: refFingerprintOf(shot, assets),
          }),
        });
      }
    }
    return items;
  }

  return [];
}

/**
 * 视频阶段的**参考素材指纹**（参考图 / 参考音的路径与序号）。
 *
 * 参考素材直接进生成请求（提示词里的占位符 + 媒体绑定），
 * 不进指纹的话「换了参考图」会被幂等跳过 —— 结果就停在旧参考上。
 *
 * @param {object} shot 分镜。
 * @param {Array<object>} assets 资产清单。
 * @returns {string[]} 形如 `1:assets/lin.png` 的条目。
 */
function refFingerprintOf(shot, assets) {
  try {
    const refs = resolveRefs(shot, assets, {});
    return [...(refs?.images ?? []), ...(refs?.audios ?? [])]
      .map((ref) => `${ref.refIndex}:${ref.path}`);
  } catch {
    // 装配本身会报错（超限等）→ 那一项本来就跑不起来，指纹不背这个锅
    return [];
  }
}

/**
 * 跑一个阶段。
 *
 * @param {object} options
 * @param {string} options.stage 阶段名。
 * @param {number} [options.seq] 限定章节。
 * @param {number} [options.idx] 限定章内镜号（重生成单镜）。
 * @param {boolean} [options.force] 已有产物的也重做（重生成单镜）。
 * @param {string} options.sessionId 会话 id。
 * @param {import('./projection.js').ProjectionStore} options.store 投影存储。
 * @param {object} options.config 插件配置。
 * @param {string} options.cwd 会话工作目录。
 * @param {AbortSignal} [options.signal] 取消信号。
 * @param {object} [options.deps] 注入的外部能力（通道客户端等）。
 * @returns {Promise<object>} 执行结论。
 */
export async function runStage({
  stage,
  seq,
  idx,
  force = false,
  sessionId,
  store,
  config,
  cwd,
  signal,
  deps = {},
}) {
  if (!STAGES.includes(stage)) {
    return { ok: false, errors: [`未知阶段：${stage}（合法值：${STAGES.join(' | ')}）`] };
  }

  const state = store.stateOf(sessionId);
  const plan = state.plan ?? {};
  const position = plan.position ?? config.runPosition;
  const provider = plan.provider ?? (position === 'cloud' ? config.cloudProvider : 'native');
  const workspaceRoot = resolveWorkspaceRoot(cwd, config.workspaceDir);

  const items = buildItems(stage, state, { seq, idx, force });
  const warnings = [];

  if (items.length === 0) {
    return {
      ok: true,
      stage,
      position,
      provider,
      items: [],
      products: [],
      skipped: [],
      failed: [],
      warnings: [`${stage} 阶段没有待处理项`],
      errors: [],
      patches: [],
    };
  }

  // ── 探测（范围随运行位置变：本地探 9 项，云端只探 provider 与硬约束）──
  const probe = await probeCapabilities({ position, provider, deps: deps.probe ?? {}, now: () => Date.now() });

  // ── 已经跑过的阶段（跨调用）──
  // 编排器的硬依赖判定看的是"**同一次编排**里跑过哪些阶段"，
  // 桥一次只跑一个阶段 → 把**已经跑过的依赖阶段**折成"空工作项的补跑阶段"
  // 塞进这一次编排，编排器才认这次 video 的 image 硬依赖已经满足。
  const completedStages = deriveCompletedStages(state);
  const stageDeps = STAGE_DEPENDENCIES[stage] ?? { hard: [], soft: [] };
  const satisfied = [...(stageDeps.hard ?? []), ...(stageDeps.soft ?? [])]
    .filter((dep) => completedStages.has(dep));
  // 补跑阶段也要过编排器的**显存门槛**——门槛过不去时它会被拒，
  // 于是真正的阶段又变成"image 阶段没跑过"（说法还是错的）。
  // 所以只有"这一阶段本来就跑得起来"（显存读得到且够）时才补跑。
  const vramGb = deps.vramGb ?? null;
  const noOpStages = new Set(checkVramGate(vramGb, stage).ok ? satisfied : []);
  const planStages = [...noOpStages, stage];

  // ── 编排器 ──
  const specSets = readSpecSets();
  const specId = specFingerprintId({
    kind: STAGE_KIND[stage],
    provider,
    hw: deps.hw ?? 'nvidia',
    userWorkflows: deps.userWorkflows ?? {},
    specSets,
  });
  const orchestrator = createStageOrchestrator({
    preflight: (targetStage) => (
      // 补跑阶段没有工作项，探不过也无所谓——它只是去把"这个阶段跑过了"说给编排器听
      noOpStages.has(targetStage)
        ? { ok: true, blockers: [], warnings: [] }
        : selectForStage(probe, targetStage)
    ),
    // 指纹里带规格 id + 模板路径：换了规格 / 换了工作流 → 结果一定不同 → 必须重跑
    fingerprint: (targetStage, item) => computeFingerprint({
      stage: targetStage,
      id: item?.id ?? null,
      specId,
      content: item?.fingerprintContent ?? null,
    }),
    resolveRefs: (shot, shotAssets, options) => resolveRefs(shot, shotAssets, options),
    signal,
    now: () => Date.now(),
    execute: async (targetStage, item, context) => executeStage({
      stage: targetStage,
      item,
      context,
      workspaceRoot,
      specSets,
      deps,
      position,
      provider,
      state,
    }),
  });

  const result = await orchestrator.run({
    stages: planStages,
    position,
    provider,
    items: { [stage]: items },
    // force = 重做：指纹表不适用（否则"重生成单镜"会被幂等跳过）
    state: { completed: force ? {} : readFingerprints(sessionId, workspaceRoot) },
    vramGb,
  });

  // 指纹表留到下一次调用（"内容没变就不重复生成、不重复计费"）
  writeFingerprints(sessionId, workspaceRoot, result.state?.completed);

  // ── 产物 → 状态补丁 ──
  const patches = productsToPatches(result.products ?? []);
  for (const warning of result.warnings ?? []) warnings.push(warning);
  const stageResult = (result.stages ?? []).find((entry) => entry.stage === stage);

  return {
    ok: result.ok !== false,
    stage,
    position,
    provider,
    items: stageResult?.items ?? [],
    products: result.products ?? [],
    skipped: result.skipped ?? [],
    failed: result.failed ?? [],
    warnings,
    errors: result.errors ?? [],
    probe: { ok: probe.ok, blockers: probe.blockers, warnings: probe.warnings },
    patches,
  };
}

/**
 * 算出「规格指纹」：规格 id + 模板路径。
 *
 * 规格换了（换模型 / 换 sourceFile）→ 结果一定不同 → 指纹必须变
 * （这条纪律写在 `src/core/stageOrchestrator.js` 的默认指纹函数里）。
 * 取不到规格时返回 `null`——不猜，也不因此让整次运行失败。
 *
 * @param {object} options
 * @returns {string|null}
 */
function specFingerprintId({ kind, provider, hw, userWorkflows, specSets }) {
  if (!kind) return null;
  try {
    const resolved = resolveSpec({ kind, provider, hw, userWorkflows, specSets });
    const spec = resolved?.spec;
    if (!spec) return null;
    return `${spec.id}@${spec.sourceFile}`;
  } catch {
    return null;
  }
}

/**
 * 执行单个工作项（编排器注入的 `execute`）。
 *
 * @param {object} options
 * @returns {Promise<{ok: boolean, product: object | null, warnings: string[], error?: string}>} 结论。
 */
async function executeStage({ stage, item, context, workspaceRoot, specSets, deps, position, provider, state }) {
  try {
    if (stage === 'llm') {
      // llm 阶段：桥不代写内容，产出**待办清单**交给模型。
      // 不产出产物字段（内容字段由模型经写入门禁写入）。
      return {
        ok: true,
        product: null,
        warnings: [`第 ${item.chapter?.seq ?? '?'} 章待补：${(item.missing ?? []).join('、')}`],
      };
    }

    const kind = STAGE_KIND[stage];
    if (!GENERATION_KINDS.includes(kind)) {
      return { ok: false, product: null, warnings: [], error: `阶段 ${stage} 没有对应的生成 kind` };
    }

    const channel = await resolveChannel({ stage, kind, position, provider, deps });
    if (!channel.channel) {
      return {
        ok: false,
        product: null,
        warnings: [],
        error: channel.error,
      };
    }

    const resolved = resolveSpec({
      kind,
      provider,
      hw: deps.hw ?? 'nvidia',
      userWorkflows: deps.userWorkflows ?? {},
      specSets,
    });

    const userWorkflowPath = `workflows/${kind}.json`;
    const userTemplate = await readTemplate(workspaceRoot, userWorkflowPath);

    // 规格取用顺序：随包规格集 → **用户工作流的确定性解析**（§8.3）。
    // 用户的工作流节点布局跟随包规格假设的不一样时，解析出来的规格才准。
    let spec = resolved.spec;
    let sourceFile = spec?.sourceFile ?? '';
    if (!spec && userTemplate) {
      try {
        spec = normalizeAnalyzedSpec(analyzeWorkflow(userTemplate, {
          id: `reelforge/${kind}`,
          kind,
          name: kind,
          sourceFile: userWorkflowPath,
        }));
        sourceFile = userWorkflowPath;
      } catch (error) {
        return {
          ok: false,
          product: null,
          warnings: [],
          error: `解析用户工作流「${userWorkflowPath}」失败：${error?.message ?? String(error)}`,
        };
      }
    }

    if (!spec) {
      return {
        ok: false,
        product: null,
        warnings: [],
        error: `找不到 ${kind} 的工作流规格：${resolved.errors.join('；') || '规格集缺失'}`
          + `（可以在工作区放 workflows/${kind}.json，插件会按 §8.3 解析它）`,
      };
    }

    // r2v 必须声明 media（参考图绑定）——解析出来的规格没有 media 声明就说清楚。
    if (kind === 'r2v' && (spec.media === null || spec.media === undefined)) {
      return {
        ok: false,
        product: null,
        warnings: [],
        error: 'r2v 规格必须声明 media（参考图绑定）；随包规格已声明，用户工作流解析出来的规格没有——'
          + '请改用随包规格或手写一份规格文件',
      };
    }

    const template = sourceFile === userWorkflowPath
      ? userTemplate
      : await readTemplate(workspaceRoot, sourceFile);
    if (!template) {
      return {
        ok: false,
        product: null,
        warnings: [],
        error: `读不到工作流模板「${sourceFile}」（工作区内的相对路径，用户自备）`,
      };
    }

    const values = buildValues(stage, item, context?.refs ?? null, state);
    const media = buildMedia(stage, context?.refs ?? null);

    // 提交载荷走 **runner 的既有能力**：克隆模板 → 写 roles → 绑参考素材 → 裁剪。
    // 通道读的就是 `payload.prompt`（comfyui / runninghub）——
    // 这里必须给它**装好的工作流**，而不是 spec / template / values 的原始四件套。
    const built = buildPromptPayload({ spec, template, values, media });
    // 裁剪误删的参考素材 loader 节点补回来（见 `restoreMediaLoaders` 的说明）
    restoreMediaLoaders({ prompt: built.prompt, spec, template, media });
    const payload = { ...built, spec, template, values, media };

    // 可达性裁剪会把「没接进产物链」的节点删掉——提示词节点被删 = 这次提交是空提示词。
    // 与其白跑一次（还计费），不如当场说清。
    const prunedRoles = built.meta.appliedRoles.filter((entry) => !built.prompt[entry.node]);
    const lostRequired = prunedRoles.filter((entry) => (REQUIRED_ROLES_BY_KIND[kind] ?? []).includes(entry.role));
    if (lostRequired.length > 0) {
      return {
        ok: false,
        product: null,
        warnings: [],
        error: '工作流模板里的提示词节点被可达性裁剪删掉了（'
          + `${lostRequired.map((entry) => `${entry.role}@节点${entry.node}`).join('、')}）：`
          + '这些节点没接进产物链，写进去的提示词不会生效——请检查模板接线',
      };
    }
    const warnings = prunedRoles.map((entry) => (
      `角色「${entry.role}」写进了节点 ${entry.node}，但该节点被可达性裁剪删掉了（没接进产物链）`
    ));

    const outcome = await channel.channel.generate({
      spec,
      payload,
      kind,
      request: buildChannelRequest({ values, media, base: { item, position, provider } }),
      signal: context?.signal,
    });

    // 云端通道给的是**会过期的下载链接** → 先落盘到工作区，产物字段才写得下本地路径
    const persisted = await persistOutcomeFiles({ outcome, stage, item, workspaceRoot, deps });

    return {
      ok: true,
      product: productOf(stage, item, persisted),
      warnings,
    };
  } catch (error) {
    return { ok: false, product: null, warnings: [], error: error?.message ?? String(error) };
  }
}

/**
 * 把可达性裁剪误删的**参考素材 loader 节点**补回载荷。
 *
 * runner 的可达性遍历只看**顶层**连线（`isLink(value)`），
 * 而 `fieldsByType` 形态的参考素材写的是**嵌套**连线（`ref_images.ref_image_0`）——
 * loader 节点于是被判成"不可达"删掉，提交出去的工作流引用了**不存在的节点**。
 *
 * 这里用 runner 自己的 `bindMedia` 再算一遍（同一份规格 + 同一份素材），
 * 把被裁掉的 loader 节点原样补回去——不改 runner，只在桥这一侧兜住。
 *
 * @param {object} options
 * @param {Record<string, any>} options.prompt 裁剪后的工作流（**就地修改**）。
 * @param {object} options.spec 工作流规格。
 * @param {object} options.template 工作流模板。
 * @param {Array<object>} options.media 媒体项。
 * @returns {string[]} 补回去的节点 id。
 */
function restoreMediaLoaders({ prompt, spec, template, media }) {
  if (!prompt || !Array.isArray(media) || media.length === 0) return [];
  let bound;
  try {
    const nodes = cloneTemplate(template);
    bound = bindMedia(nodes, spec, media);
  } catch {
    return [];
  }
  const loaderIds = new Set((bound?.bound ?? []).map((entry) => String(entry.loaderId)));
  const restored = [];
  for (const id of loaderIds) {
    if (prompt[id]) continue;
    const node = bound.nodes[id];
    if (!node) continue;
    prompt[id] = node;
    restored.push(id);
  }
  return restored;
}

/**
 * 造通道要的请求参数.
 *
 * - ComfyUI / RunningHub 吃 `payload.prompt`（装好的工作流）；
 * - DSH 是**模型通道**，不吃工作流，吃 `request.prompt` / `request.text`
 *   （`src/workflows/dshMedia.js` 的 `buildDshRequest` 契约）。
 *
 * 两边都给齐——少给一边就是"提交了空提示词"。
 *
 * @param {object} options
 * @param {Record<string, unknown>} options.values 角色值。
 * @param {Array<object>} options.media 媒体项。
 * @param {object} options.base 基础字段（item / position / provider）。
 * @returns {object} 请求参数。
 */
function buildChannelRequest({ values, media, base }) {
  // DSH 只收 HTTPS 链接；本地路径要先传成临时 URL（`upload_temp_url`）——
  // 通道没接这一步时宁可不给，也不给一个它一定拒绝的值。
  const remote = media.filter((item) => typeof item?.path === 'string' && /^https?:\/\//i.test(item.path));
  return {
    ...base,
    prompt: values.positive_prompt ?? values.text ?? '',
    negativePrompt: values.negative_prompt ?? '',
    aspectRatio: values.aspect_ratio ?? '',
    duration: values.seconds,
    text: values.text,
    caption: values.caption,
    inputUrls: remote.filter((item) => item.type === 'image').map((item) => item.path),
    audioUrls: remote.filter((item) => item.type === 'audio').map((item) => item.path),
  };
}

/**
 * 把通道产物里的**临时链接**落盘到工作区。
 *
 * 云端通道（DSH / RunningHub）给的是**会过期的下载链接**（H3 视频保留 7 天），
 * 产物字段必须写**工作区内的本地路径**，否则：
 *
 * - 交付层读不到文件；
 * - 下次 `buildItems` 的"已有产物就跳过"判断不成立 → **重复生成、重复计费**。
 *
 * @param {object} options
 * @returns {Promise<object>} 落盘后的通道结果。
 */
async function persistOutcomeFiles({ outcome, stage, item, workspaceRoot, deps }) {
  const outputs = Array.isArray(outcome?.outputs) ? outcome.outputs : [];
  if (outputs.length === 0) return outcome;

  const dir = REMOTE_FILE_DIRS[stage] ?? 'assets/files';
  const base = remoteFileBase(stage, item);
  let index = 0;
  const persisted = [];

  for (const output of outputs) {
    const files = Array.isArray(output?.files) ? output.files : [];
    const nextFiles = [];
    for (const file of files) {
      const url = file?.url;
      if (typeof url !== 'string' || url === '') {
        nextFiles.push(file);
        continue;
      }
      const relative = `${dir}/${base}${index > 0 ? `-${index}` : ''}${extensionOf(url, stage)}`;
      await downloadToWorkspace({ url, relative, workspaceRoot, fetchImpl: deps.fetchImpl });
      nextFiles.push({ ...file, filename: relative, subfolder: '', url: null, ephemeral: false });
      index += 1;
    }
    persisted.push({ ...output, files: nextFiles });
  }

  return { ...outcome, outputs: persisted };
}

/**
 * 产物落盘的文件名主干（不含扩展名）。
 * @param {string} stage
 * @param {object} item 工作项。
 * @returns {string}
 */
function remoteFileBase(stage, item) {
  const raw = stage === 'video'
    ? `ch${item?.chapter?.seq ?? 0}_${item?.shot?.idx ?? 0}`
    : String(item?.asset?.id ?? 'artifact');
  return raw.replace(/[^A-Za-z0-9_-]/g, '_') || 'artifact';
}

/**
 * 从下载链接里取扩展名；取不到就用该阶段的兜底扩展名。
 * @param {string} url
 * @param {string} stage
 * @returns {string}
 */
function extensionOf(url, stage) {
  try {
    const match = /\.([A-Za-z0-9]{1,5})$/.exec(new URL(url).pathname);
    if (match) return `.${match[1].toLowerCase()}`;
  } catch {
    // 不是合法 URL → 用兜底扩展名
  }
  return REMOTE_FILE_EXT[stage] ?? '.bin';
}

/**
 * 把一个下载链接落到工作区里。
 *
 * @param {object} options
 * @param {string} options.url 下载链接。
 * @param {string} options.relative 工作区相对路径。
 * @param {string} options.workspaceRoot 工作区绝对路径。
 * @param {Function} [options.fetchImpl] 注入的 fetch 实现（默认用全局的）。
 * @returns {Promise<string>} 工作区相对路径。
 */
async function downloadToWorkspace({ url, relative, workspaceRoot, fetchImpl }) {
  const target = resolveProjectPath(workspaceRoot, relative);
  if (!target) throw new Error(`云端产物落盘路径越界：${relative}`);
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('没有可用的 fetch 实现：无法把云端产物下载到工作区（请注入 deps.fetchImpl）');
  }
  const res = await doFetch(url);
  if (!res || res.ok === false) {
    throw new Error(`云端产物下载失败（${res?.status ?? 'ERR'}）：${url}`);
  }
  const data = Buffer.from(await res.arrayBuffer());
  await writeFileAtomic(target, data);
  return relative;
}

/**
 * 选一个执行通道。
 *
 * **缺通道客户端时要说清缺哪个、怎么补**——不能只回一句「没有可用通道」，
 * 更不能让它变成内部 TypeError（DoD：失败路径要说清缺什么、给什么替代）。
 *
 * @param {object} options
 * @returns {Promise<{channel: {generate: Function} | null, error: string | null}>} 通道与错误说明。
 */
async function resolveChannel({ stage, kind, position, provider, deps }) {
  if (position === 'local') {
    const client = deps.comfyClient ?? null;
    if (!client) {
      return {
        channel: null,
        error: `${stage} 阶段没有可用的执行通道：宿主未注入 ComfyUI 通道客户端（deps.comfyClient）；`
          + '请在宿主装配时注入 deps.comfyClient（或用 cordis.patch.yml 的 config.deps 注入通道客户端）',
      };
    }
    const { createComfyChannel } = await import('../workflows/comfyui.js');
    return {
      channel: createComfyChannel({ client, hw: deps.hw ?? 'nvidia', uploadFile: deps.uploadFile }),
      error: null,
    };
  }
  if (provider === 'runninghub') {
    const client = deps.runningHubClient ?? null;
    if (!client) {
      return {
        channel: null,
        error: `${stage} 阶段没有可用的执行通道：宿主未注入 RunningHub 通道客户端（deps.runningHubClient）；`
          + '请在宿主装配时注入 deps.runningHubClient（或用 cordis.patch.yml 的 config.deps 注入通道客户端）',
      };
    }
    const { createRunningHubChannel } = await import('../workflows/runninghub.js');
    return { channel: createRunningHubChannel({ client }), error: null };
  }
  if (provider === 'dsh') {
    if (typeof deps.dshCall !== 'function') {
      return {
        channel: null,
        error: `${stage} 阶段没有可用的执行通道：宿主未注入 DSH 通道客户端（deps.dshCall，需要一个可调用的函数）；`
          + '请在宿主装配时注入 deps.dshCall（或用 cordis.patch.yml 的 config.deps 注入通道客户端）',
      };
    }
    const { createDshMediaClient, createDshChannel } = await import('../workflows/dshMedia.js');
    return {
      channel: createDshChannel({ client: createDshMediaClient({ call: deps.dshCall }) }),
      error: null,
    };
  }
  // 其余云端 provider（online-api）尚未接通道 —— 明确报「没有通道」，不静默成功。
  void stage;
  void kind;
  return {
    channel: null,
    error: `${stage} 阶段没有可用的执行通道：provider ${provider} 尚未接入通道`
      + `（位置=${position}，provider=${provider}）；可用的 provider 是 runninghub / dsh`,
  };
}

/**
 * 造工作流参数表（角色名 → 值）。
 *
 * 视频阶段的正向提示词由 **T2 的 `buildShotPrompt`** 组装——它负责把
 * 上下文三键（bible / style / continuity）与参考块（`__MINIMAX_H3_REF_N__` 占位符）
 * 一起拼进去，**不在这里另写一套**（两处拼提示词 = 参考号必然对不上）。
 *
 * @param {string} stage 阶段。
 * @param {object} item 工作项。
 * @param {object | null} refs F6 的参考装配结果。
 * @param {object} state 投影状态（上下文三键从这里来）。
 * @returns {Record<string, unknown>} 参数表。
 */
function buildValues(stage, item, refs, state) {
  if (stage === 'image') {
    const asset = item.asset ?? {};
    return {
      positive_prompt: `${asset.name ?? ''} ${asset.description ?? ''}`.trim(),
      negative_prompt: '',
      caption: asset.name ?? '',
    };
  }
  if (stage === 'tts') {
    const asset = item.asset ?? {};
    return {
      text: asset.description ?? asset.name ?? '',
      caption: asset.name ?? '',
    };
  }
  if (stage === 'video') {
    const shot = item.shot ?? {};
    const context = state?.context ?? {};
    return {
      positive_prompt: buildShotPrompt({
        shot,
        refs: refs === null ? [] : flattenRefs(refs),
        context: {
          bible: context.bible ?? '',
          style: context.style ?? '',
          continuity: Array.isArray(context.continuity) ? context.continuity : [],
        },
      }),
      negative_prompt: '',
      seconds: shot.duration ?? 5,
      aspect_ratio: shot.aspect_ratio ?? '9:16',
      caption: shot.scene_name ?? '',
    };
  }
  return {};
}

/**
 * 造媒体绑定清单（交给 runner 的 `bindMedia`）。
 *
 * @param {string} stage 阶段。
 * @param {object | null} refs F6 的参考装配结果。
 * @returns {Array<object>} 媒体项。
 */
function buildMedia(stage, refs) {
  if (stage !== 'video' || refs === null) return [];
  const images = Array.isArray(refs.images) ? refs.images : [];
  const audios = Array.isArray(refs.audios) ? refs.audios : [];
  return [...images, ...audios].map((ref) => ({
    type: ref.kind === 'voice' ? 'audio' : 'image',
    path: ref.path ?? null,
    label: ref.label ?? '',
  }));
}

/**
 * 把通道结果折成**产物字段**（写入门禁只认产物字段）。
 *
 * @param {string} stage 阶段。
 * @param {object} item 工作项。
 * @param {object} outcome 通道结果。
 * @returns {object} 产物。
 */
function productOf(stage, item, outcome) {
  const files = (outcome?.outputs ?? []).flatMap((output) => output.files ?? []);
  const first = files[0] ?? null;
  const pathOf = first?.filename
    ? [first.subfolder, first.filename].filter(Boolean).join('/')
    : null;

  if (stage === 'image') {
    return {
      layer: 'asset',
      id: item.asset?.id ?? null,
      fields: pathOf === null ? {} : { image_path: pathOf },
    };
  }
  if (stage === 'tts') {
    return {
      layer: 'asset',
      id: item.asset?.id ?? null,
      fields: pathOf === null ? {} : { voice_ref: pathOf },
    };
  }
  if (stage === 'video') {
    return {
      layer: 'shot',
      id: `${item.chapter?.seq ?? 0}:${item.shot?.idx ?? 0}`,
      fields: {
        status: 'done',
        ...(pathOf === null ? {} : { video_path: pathOf }),
        ...(outcome?.promptId ? { prompt_id: outcome.promptId } : {}),
      },
    };
  }
  return { layer: 'shot', id: null, fields: {} };
}

/**
 * 把产物折成状态补丁。
 *
 * 资产层的产物是**合并**（`asset.upsert` 会与既有行合并），分镜层的是**替换**
 * （`shot.set` 只覆盖给定字段）——两层语义不同，别混。
 *
 * @param {Array<object>} products 产物。
 * @returns {Array<object>} 补丁。
 */
export function productsToPatches(products) {
  const patches = [];
  for (const product of products) {
    if (!product) continue;
    if (product.layer === 'asset') {
      const id = product.id ?? null;
      if (id === null) continue;
      patches.push({ op: 'asset.upsert', value: { id, ...(product.fields ?? {}) } });
      continue;
    }
    if (product.layer !== 'shot') continue;
    const [seq, idx] = String(product.id ?? ':').split(':');
    patches.push({
      op: 'shot.set',
      seq: Number(seq),
      idx: Number(idx),
      value: product.fields ?? {},
    });
  }
  return patches;
}
