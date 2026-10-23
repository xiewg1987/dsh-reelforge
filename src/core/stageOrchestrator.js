/**
 * 四阶段编排（冻结契约 F7）+ 幂等 + 断点续跑 + 触发类授权请求。
 *
 * 阶段模型**固定**：`llm → image → tts → video`，**不按用户勾选顺序**跑。
 * 六条编排纪律（设计 §8.4 / §2.6）：
 *   1. 固定顺序串行；
 *   2. **硬依赖 = 报错，软依赖 = 降质但必须说出来**；
 *   3. `llm` 与渲染阶段**双向互斥**；
 *   4. 并发：video **1** / runninghub **1** / image **2**；
 *   5. 队列等待上限 **120 分钟**；
 *   6. **不做自动拆批**——显存不够就**明说不够**，直接拒该阶段。
 *
 * 本模块是**纯逻辑**（设计 §5.2）：不碰宿主上下文对象、不联网、不写盘。
 * 所有对外动作都通过注入的依赖完成，因此可单测。
 *
 * **F6 只消费**：`resolveRefs(shot, assets, refsOptions)` 由 T2 提供，
 * 本模块**只调用、不实现**（风险表 #1：两处实现 = 一致性必然崩）。
 */

import { createHash } from 'node:crypto';

import {
  CONCURRENCY,
  PROMPT_REWRITE_MAX_ATTEMPTS,
  QUEUE_WAIT_LIMIT_MS,
  REF_PLACEHOLDER_RE,
  STAGES,
  STAGE_DEPENDENCIES,
  isProductField,
  isTriggerTool,
} from './constants.js';
import { checkVramGate } from './probe.js';

/** 队列等待上限（毫秒）。唯一来源是 `constants.js`（F8），本模块不再另立一份。 */
export { QUEUE_WAIT_LIMIT_MS };

/** 渲染阶段（与 `llm` 互斥的一侧）。 */
export const RENDER_STAGES = Object.freeze(['image', 'tts', 'video']);

/**
 * 按固定顺序排列阶段（**忽略请求顺序**）。
 * @param {string[]} requested
 * @returns {string[]}
 */
export function orderStages(requested) {
  const wanted = new Set((requested ?? []).filter((s) => STAGES.includes(s)));
  return STAGES.filter((stage) => wanted.has(stage));
}

/**
 * `llm` 与渲染阶段的**双向互斥**。
 *
 * @param {string[]} requested
 * @param {{ renderDisabled?: boolean, llmDisabled?: boolean }} options
 * @returns {{ stages: string[], notices: Array<{ stage: string, message: string }> }}
 */
export function resolveMutualExclusion(requested, { renderDisabled = false, llmDisabled = false } = {}) {
  const ordered = orderStages(requested);
  const notices = [];
  let stages = ordered;

  if (renderDisabled) {
    const dropped = stages.filter((s) => RENDER_STAGES.includes(s));
    stages = stages.filter((s) => !RENDER_STAGES.includes(s));
    if (dropped.length > 0) {
      notices.push({
        stage: 'llm',
        message: `渲染阶段已禁用（renderDisabled），本次不跑：${dropped.join('、')}`,
      });
    }
  }
  if (llmDisabled) {
    const dropped = stages.filter((s) => s === 'llm');
    stages = stages.filter((s) => s !== 'llm');
    if (dropped.length > 0) {
      notices.push({
        stage: 'image',
        message: 'LLM 阶段已禁用（llmDisabled），本次不跑 llm',
      });
    }
  }
  return { stages, notices };
}

/**
 * 稳定序列化（键排序，数组保序）——指纹的输入必须是稳定的。
 * @param {unknown} value
 */
export function canonicalize(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * 内容指纹。
 *
 * **只算影响结果的字段**（风险表 #10：算在所有字段上 → 改个备注就重算重计费）。
 * 调用方只把「会改变结果」的字段放进 `content`（提示词、参考素材、seed、参数）。
 *
 * @param {unknown} content
 * @returns {string}
 */
export function computeFingerprint(content) {
  return createHash('sha256').update(canonicalize(content)).digest('hex');
}

/**
 * 各阶段的并发上限。
 * @typedef {object} ConcurrencyTable
 * @property {number} video
 * @property {number} runninghub
 * @property {number} image
 */

/**
 * 组装指纹输入（规格 id + 提示词 + 参考素材指纹 + seed + 参数）。
 *
 * @param {object} options
 * @param {{ id?: string, kind?: string }} [options.spec]
 * @param {string} [options.prompt]
 * @param {string} [options.negativePrompt]
 * @param {Array<{ path?: string, label?: string, assetId?: string }>} [options.refs]
 * @param {number|string} [options.seed]
 * @param {Record<string, unknown>} [options.params]
 */
export function buildFingerprintParts({ spec, prompt, negativePrompt, refs, seed, params } = {}) {
  return {
    specId: spec?.id ?? null,
    kind: spec?.kind ?? null,
    prompt: prompt ?? null,
    negativePrompt: negativePrompt ?? null,
    refs: (refs ?? []).map((r) => ({ path: r?.path ?? null, label: r?.label ?? null, assetId: r?.assetId ?? null })),
    seed: seed ?? null,
    params: params ?? {},
  };
}

/**
 * 收集提示词里的参考占位符（`__MINIMAX_H3_REF_N__`）。
 * @param {string} text
 * @returns {string[]}
 */
export function collectPlaceholders(text) {
  const matches = String(text ?? '').match(REF_PLACEHOLDER_RE) ?? [];
  return [...new Set(matches)];
}

/**
 * 校验改写后的提示词**是否保住了全部占位符**。
 * @param {string} original
 * @param {string} rewritten
 */
export function validatePromptRewrite(original, rewritten) {
  const expected = collectPlaceholders(original);
  const actual = new Set(collectPlaceholders(rewritten));
  const missing = expected.filter((p) => !actual.has(p));
  return { ok: missing.length === 0, missing, expected };
}

/**
 * 提示词改写：**最多 2 次尝试**，每次都要保住全部占位符。
 * 仍失败 → **保留原提示词**并报错（设计 §8.4）。
 *
 * @param {object} options
 * @param {string} options.text
 * @param {(text: string, info: { attempt: number }) => Promise<string>|string} options.rewrite
 * @param {number} [options.maxAttempts]
 */
export async function rewritePrompt({ text, rewrite, maxAttempts = PROMPT_REWRITE_MAX_ATTEMPTS }) {
  const attempts = [];
  let last = text;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const rewritten = await rewrite(text, { attempt });
    last = rewritten;
    const check = validatePromptRewrite(text, rewritten);
    attempts.push({ attempt, ok: check.ok, missing: check.missing });
    if (check.ok) return { text: rewritten, ok: true, attempts, missing: [] };
  }
  return {
    text,
    ok: false,
    attempts,
    missing: validatePromptRewrite(text, last).missing,
  };
}

/**
 * 并发闸门 + 队列等待统计。
 *
 * 队列等待上限：超过就**放弃并报错**（不无限等、不静默跳过）。
 *
 * @param {object} options
 * @param {number} [options.limit]
 * @param {() => number} [options.now]
 * @param {number} [options.waitLimitMs]
 */
export function createLimiter({ limit = 1, now = () => Date.now(), waitLimitMs = QUEUE_WAIT_LIMIT_MS } = {}) {
  let active = 0;
  const waiters = [];
  const stats = { waitedMs: 0, maxWaitMs: 0, waitedCount: 0 };

  return {
    get active() {
      return active;
    },
    get limit() {
      return limit;
    },
    get stats() {
      return { ...stats };
    },
    async run(fn) {
      if (active >= limit) {
        const started = now();
        await new Promise((resolve) => waiters.push(resolve));
        const waited = Math.max(0, now() - started);
        stats.waitedMs += waited;
        stats.waitedCount += 1;
        stats.maxWaitMs = Math.max(stats.maxWaitMs, waited);
        if (waited >= waitLimitMs) {
          throw new Error(
            `队列等待已达上限 ${Math.round(waitLimitMs / 60000)} 分钟，已放弃（不静默跳过、不自动拆批）`,
          );
        }
      } else {
        active += 1;
      }
      try {
        return await fn();
      } finally {
        active -= 1;
        const next = waiters.shift();
        if (next) {
          active += 1;
          next();
        }
      }
    },
  };
}

/**
 * 某阶段的并发上限。
 * @param {string} stage
 * @param {{ position?: string, provider?: string }} request
 * @param {ConcurrencyTable} [table]
 */
export function resolveConcurrency(stage, request = {}, table = CONCURRENCY) {
  if (request.position === 'cloud' && request.provider === 'runninghub') {
    return table.runninghub ?? 1;
  }
  return table[stage] ?? 1;
}

/**
 * video 的**硬依赖**：没有参考图 → 直接抛错（不出片、不静默降级）。
 *
 * @param {{ images?: unknown[] }} refs
 */
export function assertVideoHardDependency(refs) {
  const images = Array.isArray(refs?.images) ? refs.images : [];
  if (images.length === 0) {
    throw new Error(
      'video 阶段硬依赖 image：这一镜没有任何参考图（人物 / 场景 / 道具参考图），不出片',
    );
  }
  return true;
}

/**
 * 产物字段自检：只有产物字段能由生成阶段写（设计 §6.5）。
 * @param {{ layer?: string, id?: string, fields?: Record<string, unknown> }} product
 */
export function assertProductShape(product) {
  const layer = product?.layer ?? 'shot';
  const fields = product?.fields ?? {};
  for (const field of Object.keys(fields)) {
    if (!isProductField(field, layer)) {
      throw new Error(`生成阶段只能写产物字段，「${field}」不是 ${layer} 层的产物字段`);
    }
  }
  return product;
}

/**
 * 触发类工具的**人工授权请求**（R4：`tools/pre-execute` 返回 `ask`）。
 *
 * 本模块**只负责产生这个请求**；工具注册在 `src/host/tools.js`（T1），
 * 判定依据是 constants.js 里的 `isTriggerTool()`（F8）。
 *
 * @param {object} options
 * @param {string} [options.toolId]
 * @param {string[]} [options.stages]
 * @param {string} [options.summary]
 * @returns {{ kind: 'ask', reason: string, displayReason: { en: string, zh: string } }|{ kind: 'allow' }}
 */
export function buildToolApproval({ toolId, stages = [], summary = '' } = {}) {
  if (!isTriggerTool(toolId)) return { kind: 'allow' };
  const list = stages.join(' → ');
  const reason = [
    `触发类操作 ${toolId}`,
    list ? `将执行阶段：${list}` : null,
    summary || null,
  ]
    .filter(Boolean)
    .join('；');
  return {
    kind: 'ask',
    reason,
    displayReason: {
      en: `About to run ${list || 'a stage'} (${toolId}). ${summary}`.trim(),
      zh: `即将执行${list || '阶段'}（${toolId}）。${summary}`.trim(),
    },
  };
}

/**
 * 阶段依赖检查（硬依赖 = 报错；软依赖 = 降质但说出来）。
 *
 * @param {string} stage
 * @param {object} [context]
 * @param {object} [context.request]
 * @param {string[]} [context.completedStages]
 */
export function checkStageDependencies(stage, { request = {}, completedStages = [] } = {}) {
  const errors = [];
  const warnings = [];
  const deps = STAGE_DEPENDENCIES[stage] ?? { hard: [], soft: [] };

  for (const dep of deps.hard ?? []) {
    if (completedStages.includes(dep)) continue;
    if ((request.stages ?? []).includes(dep)) {
      errors.push(`${stage} 硬依赖 ${dep}：本次运行没有 ${dep} 的产物，不能跑 ${stage}`);
      continue;
    }
    errors.push(`${stage} 硬依赖 ${dep}：${dep} 阶段没跑过，不能跑 ${stage}`);
  }

  for (const dep of deps.soft ?? []) {
    if (completedStages.includes(dep)) continue;
    warnings.push(`${stage} 软依赖 ${dep} 缺失：本次结果已降质（${dep} 没跑过）`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * 建一个阶段编排器。
 *
 * @param {object} deps
 * @param {(stage: string, request: object) => Promise<object>} [deps.preflight]
 *   阶段前置校验（探测）。返回 `{ ok, blockers, warnings }`。
 * @param {(stage: string, item: object, info: object) => Promise<object>} [deps.execute]
 *   执行单个工作项。返回 `{ ok, product?, warnings?, error? }`。
 * @param {(stage: string, item: object, request: object) => string} [deps.fingerprint]
 *   内容指纹。默认用 `item.fingerprintContent` 算。
 * @param {(shot: object, assets: object, refsOptions: object) => Promise<object>} [deps.resolveRefs]
 *   **F6**：T2 提供的参考装配。本模块只消费。
 * @param {() => number} [deps.now]
 * @param {AbortSignal} [deps.signal]
 * @param {ConcurrencyTable} [deps.concurrency] 各阶段的并发上限
 * @param {number} [deps.queueWaitLimitMs] 队列等待上限（毫秒）
 * @param {object} [deps.refsOptions] 传给 `resolveRefs` 的参考装配选项
 */
export function createStageOrchestrator(deps = {}) {
  const {
    preflight = async () => ({ ok: true, blockers: [], warnings: [] }),
    execute = async () => ({ ok: true, product: null, warnings: [] }),
    fingerprint = (stage, item) =>
      computeFingerprint({
        stage,
        id: item?.id ?? null,
        // 规格换了（换模型 / 换 sourceFile）→ 结果一定不同 → 指纹必须变
        specId: item?.specId ?? null,
        content: item?.fingerprintContent ?? null,
      }),
    resolveRefs = null,
    now = () => Date.now(),
    signal,
    concurrency = CONCURRENCY,
    queueWaitLimitMs = QUEUE_WAIT_LIMIT_MS,
    refsOptions = {},
  } = deps;

  async function run(request = {}) {
    const { stages, notices } = resolveMutualExclusion(request.stages ?? [], request);
    const state = {
      ...(request.state ?? {}),
      completed: { ...(request.state?.completed ?? {}) },
    };

    const stageResults = [];
    const products = [];
    const skipped = [];
    const failed = [];
    const warnings = [];
    const errors = [];
    const completedStages = [];

    for (const stage of stages) {
      const stageResult = { stage, status: 'done', items: [], warnings: [], errors: [], message: null };
      stageResults.push(stageResult);
      for (const notice of notices) {
        if (notice.stage === stage) {
          stageResult.warnings.push(notice.message);
          warnings.push(notice.message);
        }
      }

      // ① 依赖：硬依赖 → 报错；软依赖 → 降质但说出来
      const dependency = checkStageDependencies(stage, { request, completedStages });
      stageResult.warnings.push(...dependency.warnings);
      warnings.push(...dependency.warnings);
      if (!dependency.ok) {
        stageResult.status = 'refused';
        stageResult.errors.push(...dependency.errors);
        errors.push(...dependency.errors);
        continue;
      }

      // ② 阶段前置校验（探测）：探不过就不开跑
      let pre;
      try {
        pre = await preflight(stage, request);
      } catch (error) {
        pre = { ok: false, blockers: [{ id: 'preflight', message: error?.message ?? String(error) }], warnings: [] };
      }
      const preWarnings = (pre?.warnings ?? []).map((w) => (typeof w === 'string' ? w : w.message)).filter(Boolean);
      stageResult.warnings.push(...preWarnings);
      if (pre?.ok === false) {
        const blockers = (pre.blockers ?? []).map((b) => (typeof b === 'string' ? b : b.message)).filter(Boolean);
        stageResult.status = 'refused';
        stageResult.errors.push(...blockers);
        errors.push(...blockers);
        continue;
      }

      // ③ 显存门槛：不足 → **直接拒该阶段**，不拆批、不静默降级
      const gate = checkVramGate(request.vramGb, stage);
      if (!gate.ok) {
        stageResult.status = 'refused';
        stageResult.errors.push(gate.message);
        errors.push(gate.message);
        continue;
      }

      const items = [...(request.items?.[stage] ?? [])];
      if (items.length === 0) {
        stageResult.status = 'skipped';
        stageResult.message = '本阶段没有待处理项';
        completedStages.push(stage);
        continue;
      }

      const limit = resolveConcurrency(stage, request, concurrency);
      const limiter = createLimiter({ limit, now, waitLimitMs: queueWaitLimitMs });

      const settled = await Promise.all(
        items.map((item) => {
          const key = item.key ?? `${stage}:${item.id ?? ''}`;
          return limiter
            .run(async () => {
              const fp = fingerprint(stage, item, request);
              try {
                const done = state.completed[key];
                if (done && done.fingerprint === fp) {
                  // 幂等：内容指纹没变 → **不重复生成、不重复计费**
                  return {
                    item,
                    key,
                    fingerprint: fp,
                    skipped: true,
                    reason: 'unchanged',
                    product: done.product ?? null,
                    warnings: [],
                  };
                }

                const itemWarnings = [];
                let refs = null;
                if (stage === 'video') {
                  // F6 的参考装配：注入在编排器上或本次请求上都行
                  const assemble = resolveRefs ?? request.resolveRefs ?? null;
                  if (typeof assemble !== 'function') {
                    throw new Error('video 阶段需要 F6 的 resolveRefs：没有注入参考装配函数');
                  }
                  refs = await assemble(item.shot ?? item, item.assets ?? request.assets ?? [], refsOptions);
                  // 硬依赖：没有参考图 → 直接抛错
                  assertVideoHardDependency(refs);
                  // 软依赖：没有参考音 → 降质，**必须说出来**
                  const audios = Array.isArray(refs?.audios) ? refs.audios : [];
                  if (audios.length === 0) {
                    itemWarnings.push(
                      '本镜没有可用参考音（tts 阶段缺失或角色音色未生成）：视频声音已降质，参考音不会出现在成片里',
                    );
                  }
                  for (const warning of refs?.warnings ?? []) {
                    // F6 的 warnings 是 `{ code, message, ... }`；也兼容纯字符串
                    itemWarnings.push(
                      typeof warning === 'string'
                        ? warning
                        : (warning?.message ?? JSON.stringify(warning)),
                    );
                  }
                }

                const outcome = await execute(stage, item, { refs, request, signal, now });
                const outcomeWarnings = (outcome?.warnings ?? []).map(String);
                const product = outcome?.product ?? null;
                if (product) assertProductShape(product);
                return {
                  item,
                  key,
                  fingerprint: fp,
                  skipped: false,
                  product,
                  degraded: itemWarnings.length > 0,
                  warnings: [...itemWarnings, ...outcomeWarnings],
                  error: outcome?.ok === false ? outcome.error ?? '执行失败' : null,
                };
              } catch (error) {
                return {
                  item,
                  key,
                  fingerprint: fp,
                  skipped: false,
                  product: null,
                  degraded: false,
                  warnings: [],
                  error: error?.message ?? String(error),
                };
              }
            })
            .catch((error) => ({
              // 队列等待超限等闸门级错误
              item,
              key,
              fingerprint: null,
              skipped: false,
              product: null,
              degraded: false,
              warnings: [],
              error: error?.message ?? String(error),
            }));
        }),
      );

      for (const result of settled) {
        if (!result) continue;
        const record = {
          key: result.key,
          id: result.item?.id ?? null,
          fingerprint: result.fingerprint,
          skipped: result.skipped,
          degraded: result.degraded ?? false,
          warnings: result.warnings ?? [],
          error: result.error ?? null,
        };
        stageResult.items.push(record);
        if (result.warnings?.length) {
          stageResult.warnings.push(...result.warnings);
          warnings.push(...result.warnings);
        }
        if (result.error) {
          stageResult.errors.push(result.error);
          errors.push(result.error);
          failed.push({ stage, key: result.key, id: record.id, error: result.error });
          continue;
        }
        if (result.skipped) {
          skipped.push({ stage, key: result.key, id: record.id, reason: result.reason });
          if (result.product) products.push(result.product);
          continue;
        }
        if (result.product) products.push(result.product);
        state.completed[result.key] = {
          fingerprint: result.fingerprint,
          product: result.product ?? null,
          at: now(),
        };
      }

      if (stageResult.errors.length > 0) stageResult.status = 'failed';
      else if (stageResult.items.every((i) => i.skipped) && stageResult.items.length > 0) {
        stageResult.status = 'done';
        stageResult.message = '全部命中内容指纹，未重复生成';
      }
      completedStages.push(stage);
    }

    return {
      stages: stageResults,
      products,
      skipped,
      failed,
      warnings,
      errors,
      state,
      ok: errors.length === 0 && failed.length === 0,
    };
  }

  return { run };
}
