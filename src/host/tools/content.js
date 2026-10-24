/**
 * 内容类工具（7 个）：写项目 / 写分镜 / 写上下文 / 改单镜 / 建资产 / 改资产 / 绑资产。
 *
 * ## 这一组在做什么
 *
 * 都是**写内容**的工具：只往项目里放「人写的东西」（正文、章节、分镜、人物圣经、
 * 资产、资产绑定）。**不碰生成、不碰钱**——消耗算力与费用的工具在 `production.js`。
 *
 * ## 共同纪律
 *
 * - **产物字段不可写**：`status` / `video_path` / `seed` / `image_path` / `voice_ref`
 *   根本不在 schema 里（模型传了也进不来），只有渲染阶段能写。
 * - **不许静默降质**：章不存在、镜不存在、资产不存在 ⇒ 直接报错并说清现在有什么，
 *   不写一个补丁让投影静默忽略、然后回 `ok: true`。
 * - **所有写入走 `ctx.commit()`** ⇒ 顺带记变更、变更日志进投影、物化落盘。
 */
import {
  ASSET_CATEGORIES,
  CONTEXT_KEYS,
  TOOL_IDS,
} from '../../core/constants.js';
import { createAsset, updateAsset } from '../../core/assets.js';
import { writeContext } from '../../core/consistency.js';
import { splitNovelIntoChapters } from '../../core/splitChapters.js';
import { validateChapterShots } from '../../core/storyboardSchema.js';
import { jsonSchemaForLayer, validateWrite } from '../gate.js';
import { resolveWorkspaceRoot } from '../workspace.js';
import {
  defineReelForgeTool,
  describeAssets,
  describeChapters,
  describeShots,
  pickAssetFields,
  projectContent,
  quantizeChapter,
  sessionContext,
  validateAsset,
} from './shared.js';

/**
 * 分镜上可以绑资产的字段。
 * @type {ReadonlyArray<string>}
 */
export const BINDABLE_SHOT_FIELDS = Object.freeze([
  'character_ids',
  'scene_ids',
  'prop_ids',
  'costume_ids',
  'age_ids',
  'audio_ids',
]);

/**
 * 内容类工具（7 个）。
 *
 * @param {import('./shared.js').ToolContext} ctx 工具上下文。
 * @returns {object[]} 工具定义数组。
 */
export function createContentTools(ctx) {
  const { store, config, commit } = ctx;
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
      chatData: (/** @param {import('./shared.js').ImportNovelResult} value @returns {object} */ (value) => ({
        chapters: (value.chapters ?? []).map((chapter) => ({
          id: chapter.seq ?? null,
          title: chapter.title ?? '',
          shotCount: chapter.shotCount ?? 0,
          durationSec: chapter.durationSec ?? 0,
          status: 'queued',
          tone: 'queued',
        })),
      })),
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
      chatData: (/** @param {import('./shared.js').StoryboardResult} value @returns {object} */ (value) => ({
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
      })),
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
      chatData: (/** @param {import('./shared.js').AssetResult} value @returns {object} */ (value) => ({ assets: value.asset ? [value.asset] : [] })),
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
      chatData: (/** @param {import('./shared.js').AssetResult} value @returns {object} */ (value) => ({ assets: value.asset ? [value.asset] : [] })),
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
  ];
}
