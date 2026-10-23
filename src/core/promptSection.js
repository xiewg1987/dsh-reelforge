/**
 * 注入到 systemPrompt 的 ReelForge 段落（§8.2 / §10.5）。
 *
 * ── 为什么要改提示词 ────────────────────────────────────────────────────────
 *
 * 原来这里只注了一段「技能目录」——**只说有哪些技能，没说这个插件是干什么的、
 * 状态存在哪、该按什么顺序调工具**。模型看到 15 个 `reelforge.*` 工具却没有
 * 工作流约束，典型表现是「在对话里描述一遍剧情」而不用工具写状态，
 * 于是工作台一片空白。
 *
 * 接入对话输入截获之后又多一条约定要讲清楚：
 * **用户在对话框里说的话会被自动截获并写进工作台**，模型不需要（也不应该）
 * 再把需求复述一遍。
 *
 * 本模块是**纯文本产出**：不出现宿主 ctx（§5.2），注入动作由 `src/host/apply.js`
 * 调 `ctx.systemPrompt.section()` 完成。
 */
import { TOOL_IDS } from './constants.js';

/**
 * 工具职责表（id → 一句话职责）。
 *
 * ⚠️ 这是**给模型看的职责说明**，不是执行契约：真正的参数签名以工具自身的
 * schema 为准。这里只保证「id 与冻结表一致」，不写参数细节，避免两处漂移。
 *
 * @type {ReadonlyArray<readonly [string, string]>}
 */
const TOOL_ROLES = Object.freeze([
  [TOOL_IDS.importNovel, '导入小说正文并自动拆章（写项目与章节）'],
  [TOOL_IDS.setStoryboard, '写分镜表：每镜的画面、时长、台词与参考'],
  [TOOL_IDS.updateShot, '改某一镜（画面、时长、台词、参考）'],
  [TOOL_IDS.saveContext, '写人物圣经 / 风格指南 / 连续性记录'],
  [TOOL_IDS.createAsset, '新建资产（角色 / 场景 / 道具 / 服装 / 年龄 / 音色 …）'],
  [TOOL_IDS.updateAsset, '改资产内容（名称、描述、标签）'],
  [TOOL_IDS.bindAsset, '把资产绑到某一镜的参考位上'],
  [TOOL_IDS.updatePlan, '选执行方案（生成 kind × 本地 / 云端）'],
  [TOOL_IDS.runStage, '跑一个阶段（llm → image → tts → video）'],
  [TOOL_IDS.regenerateShot, '重生成某一镜'],
  [TOOL_IDS.assembleChapter, '把一章合成为成片'],
  [TOOL_IDS.setChapterMusic, '给一章配乐'],
  [TOOL_IDS.rollback, '回滚到某个历史点'],
]);

/**
 * 产出「ReelForge 工作流」段落（模型看得懂的那部分）。
 *
 * @returns {string} 段落文本。
 */
export function buildWorkflowPromptSection() {
  const toolLines = TOOL_ROLES.map(([id, role]) => `- \`${id}\` —— ${role}`).join('\n');
  return [
    '## ReelForge 工作流',
    '',
    '你在 DSH 里带着 **ReelForge** 插件工作：把小说 / 创意做成**按章交付的短剧**。',
    '',
    '**状态只存在于工具里，不存在于你的描述里。** 右侧「ReelForge 工作台」是唯一的进度面板，',
    '它显示的内容全部来自工具的产出。你要用工具写状态，不要只在对话里把剧情复述一遍。',
    '',
    '**用户在对话框里说的话会被自动截获并写进工作台的「对话输入」区** ——',
    '所以你不需要复述需求，也不需要再确认「我记下了」。',
    '',
    '### 工具与职责',
    '',
    toolLines,
    '',
    '### 推进顺序',
    '',
    '1. 需求 → 导入正文（`import_novel`，自动拆章）',
    '2. 写分镜（`set_storyboard`）→ 建资产（`create_asset` / `update_asset`）→ 绑定参考（`bind_asset`）',
    '3. 选执行方案（`update_plan`）→ 跑阶段（`run_stage`，四阶段固定串行：llm → image → tts → video）',
    '4. 合成出片（`assemble_chapter`）→ 需要时配乐（`set_chapter_music`）、回滚（`rollback`）',
    '',
    '### 硬约束',
    '',
    '- `run_stage` / `regenerate_shot` / `assemble_chapter` / `rollback` 会**消耗算力与费用**，',
    '  宿主会向用户弹确认。用户拒绝就停下并说明当前卡在哪，**不要换参数重试硬闯**。',
    '- video 阶段硬依赖 image 的参考图、软依赖 tts 的音色：缺失时按工具报错处理，不要假装有。',
    '- 工具报错了就说清**缺什么、给什么替代**，不要用一句「已完成」盖过去。',
  ].join('\n');
}

/**
 * 组装完整的 ReelForge systemPrompt 段落：工作流说明 + 技能目录。
 *
 * @param {string} skillSection 技能目录段落（`src/skills/route.js` 产出）。
 * @returns {string} 段落文本。
 */
export function buildReelForgePromptSection(skillSection) {
  const workflow = buildWorkflowPromptSection();
  const skills = String(skillSection ?? '').trim();
  return skills === '' ? workflow : `${workflow}\n\n${skills}`;
}
