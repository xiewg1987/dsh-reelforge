/**
 * 只读技能工具（2 个）：读技能正文 / 读技能参考文件。
 *
 * ## 这一组在做什么
 *
 * 给模型一个**看**技能目录的窗口：技能正文与它的参考文件是**磁盘上的只读资源**，
 * 不进会话投影（跟 `budgetLimitCny` 走同一条路）。
 *
 * 两个工具都是**只读**的：不写状态、不烧钱、不走 `ask`。
 * 技能不存在时抛错并列出可用项（错误话术由 `src/skills/skillTools.js` 给）。
 */
import { TOOL_IDS } from '../../core/constants.js';
import { createSkillTools } from '../../skills/skillTools.js';
import { BUNDLED_SKILLS_DIR } from '../paths.js';
import { defineReelForgeTool } from './shared.js';

/**
 * 只读技能工具（2 个）。
 *
 * ⚠️ 名字不叫 `createSkillTools` —— 那个名字属于 `src/skills/skillTools.js` 里的
 *    **工具实现**（读技能目录的引擎）；这里造的是**宿主侧的工具定义**。
 *
 * @returns {object[]} 工具定义数组。
 */
export function createSkillReadTools() {
  return [
    // ── 1. 读技能正文（只读） ──
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

    // ── 2. 读技能参考文件（只读） ──
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
