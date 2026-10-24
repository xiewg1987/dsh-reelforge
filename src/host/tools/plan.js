/**
 * 执行路径工具（1 个）：`update_plan` —— 改「跑什么、在哪跑」。
 *
 * ## 为什么单独一个文件
 *
 * 这个工具**不烧钱**（只是改方案），所以不走 `ask` 闸门；它要读的也只有
 * 「kind × 位置」这一张候选表。跟生产类工具（`run_stage` 等真烧钱的）混在一起
 * 会让人误以为它也是触发类。
 *
 * ## kind 与位置是**正交的两维**
 *
 * 同一批 kind（t2i / i2i / r2v / tts / music）在本地与云端**都跑得起来**，
 * 差别只在跑在哪、计不计费、受什么约束 —— 不是「本地一种、云端另一种」。
 */
import { GENERATION_KINDS, RUN_POSITIONS, TOOL_IDS } from '../../core/constants.js';
import { buildPlanPayload } from '../../core/planPayload.js';
import { loadSpecSetDir, resolveSpec } from '../../workflows/spec.js';
import { WORKFLOW_SPECS_DIR } from '../paths.js';
import { defineReelForgeTool, sessionContext } from './shared.js';

/**
 * 执行路径工具（1 个）。
 *
 * @param {import('./shared.js').ToolContext} ctx 工具上下文。
 * @returns {object[]} 工具定义数组。
 */
export function createPlanTools(ctx) {
  const { config, commit } = ctx;
  return [
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
        /** @type {Array<{ op: string, value: unknown }>} */
        const patches = [{ op: 'plan.set', value: { kind: args.kind, position: args.position, provider } }];
        const { analyzeWorkflowForPlan } = await import('../workflowView.js');
        const analysis = await analyzeWorkflowForPlan(context.cwd, config.workspaceDir, args.kind);
        if (analysis) patches.push({ op: 'workflowAnalysis.set', value: analysis });
        await commit(context.sessionId, context.cwd, patches);
        return { ok: true, ...planOf(args.kind, args.position, provider), patch: patches };
      },
      chatKind: 'reelforge-plan',
      chatData: (/** @param {import('./shared.js').PlanResult} value @returns {object} */ (value) => ({
        kind: value.kind,
        position: value.position,
        provider: value.provider,
        candidates: value.candidates,
      })),
    }),
  ];
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
    // `resolveSpec` 的规格是 `Record<string, unknown>`（规格集里的字段形状不固定），
    // `sourceFile` 按约定是工作区内的相对路径字符串。
    return /** @type {string} */ (resolved?.spec?.sourceFile ?? '');
  } catch {
    return '';
  }
}
