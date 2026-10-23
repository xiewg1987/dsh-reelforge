/**
 * 技能目录注入（§8.2）。
 *
 * ── 刻意不做关键词路由表 ────────────────────────────────────────────────────
 *
 * 上游 infinite-creation 有 22 条 `KEYWORD_ROUTES` 正则，但**`routeSkill()` 在生产路径中
 * 根本没被调用**——实际靠 systemPrompt 里的映射 + LLM 自主 `skill(name)`。
 * 照抄那 22 条正则 = 抄一套长期漂移、且本来就没在跑的代码。
 *
 * ReelForge **只做两件事**：
 * ① 产出「技能目录」文本（name + description + whenToUse），由宿主注入 systemPrompt；
 * ② 把 `novel-to-video` **无条件注入**为「当前工作模式技能」兜底。
 *
 * 本模块**不出现宿主 ctx**：只产出字符串，注入动作由 `src/host/` 调用 `ctx.systemPrompt.section()` 完成。
 */

import { NOVEL_TO_VIDEO_SKILL } from '../core/constants.js';

/**
 * 技能目录里的一条（一个技能一行）。
 *
 * @param {object} skill
 * @returns {string}
 */
export function formatSkillEntry(skill) {
  if (!skill || !skill.name) return '';
  const description = String(skill.description ?? '').trim();
  const whenToUse = String(skill.whenToUse ?? '').trim();
  const parts = [`- **${skill.name}**：${description}`];
  if (whenToUse) parts.push(`（适用：${whenToUse}）`);
  return parts.join('');
}

/**
 * 技能目录正文。
 *
 * @param {Array<object>} skills
 * @returns {string}
 */
export function buildSkillCatalog(skills) {
  const list = Array.isArray(skills) ? skills : [];
  const entries = list.map(formatSkillEntry).filter(Boolean);
  if (entries.length === 0) return '';
  return entries.join('\n');
}

/**
 * 产出注入到 systemPrompt 的技能段落。
 *
 * **兜底无条件注入**：`novel-to-video` 无论技能目录里有没有，都作为
 * 「当前工作模式技能」出现在最前面——这是上游的兜底行为，必须照抄。
 *
 * @param {Array<object>} skills 可用技能
 * @param {{modeSkill?: string, extra?: string}} [options]
 * @returns {string}
 */
export function buildSkillPromptSection(skills, options = {}) {
  const modeSkill = options.modeSkill ?? NOVEL_TO_VIDEO_SKILL;
  const list = Array.isArray(skills) ? skills : [];

  const blocks = [];

  blocks.push(
    [
      '## ReelForge 技能目录',
      '',
      '下面是当前可用的技能。**按描述自行判断该调用哪个**，不要凭关键词猜测。',
      '',
      `当前工作模式技能：**${modeSkill}**（总流水线，无条件生效）。`,
      '不确定该做什么时，先读它。',
      '',
      '读取方式：',
      '- `skill(name)` —— 读技能正文，返回技能参考文件索引',
      '- `skill_reference(name, ref)` —— 读单个参考文件（按文件名精确匹配，仅 .md / .txt）',
    ].join('\n'),
  );

  const catalog = buildSkillCatalog(list);
  if (catalog) {
    blocks.push(['### 可用技能', '', catalog].join('\n'));
  }

  if (options.extra && String(options.extra).trim()) {
    blocks.push(String(options.extra).trim());
  }

  return blocks.join('\n\n');
}

/**
 * 技能目录的精简版（给 UI / 工作台用，只要 name + description）。
 *
 * @param {Array<object>} skills
 * @returns {Array<{name: string, description: string, whenToUse: string, version: string, source: string}>}
 */
export function summarizeSkills(skills) {
  const list = Array.isArray(skills) ? skills : [];
  return list.map((skill) => ({
    name: skill.name,
    description: String(skill.description ?? ''),
    whenToUse: String(skill.whenToUse ?? ''),
    version: String(skill.version ?? ''),
    source: String(skill.source ?? ''),
  }));
}
