/**
 * 生产类工具（5 个）：跑阶段 / 重生成单镜 / 合成成片 / 指定 BGM / 改执行路径。
 *
 * ## 这一组在做什么
 *
 * 真正去**烧算力、烧钱**的那几个工具，以及「决定跑在哪、跑什么」的那一个。
 *
 * - `run_stage` / `regenerate_shot` / `assemble_chapter` 是**触发类** ——
 *   宿主会先弹 `ask` 让人确认（闸门在 `src/host/apply.js` 的 `tools/pre-execute`）。
 * - `set_chapter_music` 只写内容字段，**不触发生成**。
 * - `update_plan` 改方案（kind × 位置），**不烧钱**，所以不走 `ask`。
 *
 * ## 共同纪律
 *
 * - **不许静默降质**：目标镜不存在 ⇒ 直接报错，不走「本阶段没有待处理项」的成功分支。
 * - **覆盖已有产物要说出来**：重生成会覆盖旧 `video_path`，警告里点名。
 */
import { TOOL_IDS } from '../../core/constants.js';
import { assembleAndDeliver } from '../deliverBridge.js';
import { runStage } from '../stageBridge.js';
import {
  defineReelForgeTool,
  describeChapters,
  describeShots,
  sessionContext,
} from './shared.js';

/**
 * 生产类工具（5 个）。
 *
 * @param {import('./shared.js').ToolContext} ctx 工具上下文。
 * @returns {object[]} 工具定义数组。
 */
export function createProductionTools(ctx) {
  const { store, config, deps, commit } = ctx;
  return [
    // ── 1. 跑阶段（触发类） ──
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
      chatData: (/** @param {import('./shared.js').RunStageResult} value @returns {object} */ (value) => ({
        stage: value.stage ?? '',
        chapter: value.items?.length ? `${value.items.length} 项` : '',
        shot: value.skipped?.length ? `跳过 ${value.skipped.length}` : '',
        elapsed: value.warnings?.length ? `${value.warnings.length} 条提示` : '',
      })),
    }),

    // ── 2. 重生成单镜（触发类） ──
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
      chatData: (/** @param {import('./shared.js').RegenerateShotResult} value @returns {object} */ (value) => ({
        stage: 'video',
        chapter: `第 ${value.seq ?? '?'} 章`,
        shot: `第 ${value.idx ?? '?'} 镜`,
        elapsed: value.items?.length ? '重生成' : '',
      })),
    }),

    // ── 3. 合成章节（触发类） ──
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
      chatData: (/** @param {import('./shared.js').AssembleResult} value @returns {object} */ (value) => ({
        chapters: (value.payload?.chapters ?? []).map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          shotCount: chapter.shotCount,
          durationSec: chapter.durationSec,
          deliverables: chapter.deliverables,
        })),
      })),
    }),

    // ── 4. 指定章节背景音乐 ──
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
  ];
}
