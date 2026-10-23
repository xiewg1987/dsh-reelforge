/**
 * 提示词装配 + 参考标签（§7.4 ③ / §8.4）。
 *
 * ── 纪律 ────────────────────────────────────────────────────────────────────
 *
 * 1. 参考素材在提示词里用**占位符**引用：`__MINIMAX_H3_REF_N__`，**N 从 1 起**。
 * 2. 校验正则：`/__MINIMAX_H3_REF_\d+__/g`（取自 `constants.js`，不在此另写一份）。
 * 3. 标签序号必须与**装配顺序**严格一致——序号错了就是挂错参考图。
 * 4. **提示词改写最多 2 次尝试**（`PROMPT_REWRITE_MAX_ATTEMPTS`），且**必须保留全部占位符**——
 *    丢一个占位符等于引用素材丢失，**不许静默降质**。
 */

import { PROMPT_REWRITE_MAX_ATTEMPTS, REF_PLACEHOLDER_RE } from './constants.js';
import { buildContextInjection } from './consistency.js';

/** 提示词相关的错误。 */
export class PromptError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PromptError';
    this.code = details.code ?? 'prompt_error';
    Object.assign(this, details);
  }
}

/**
 * 生成占位符。**N 从 1 起**。
 *
 * @param {number} index 1 起的序号
 * @returns {string} `__MINIMAX_H3_REF_N__`
 */
export function buildRefPlaceholder(index) {
  const n = Number(index);
  if (!Number.isInteger(n) || n < 1) {
    throw new PromptError(`参考占位符序号必须是从 1 起的整数，收到 ${index}。`, { code: 'prompt_placeholder_index_invalid', index });
  }
  return `__MINIMAX_H3_REF_${n}__`;
}

/**
 * 取出文本里出现的占位符（按出现顺序，去重）。
 *
 * @param {string} text
 * @returns {string[]}
 */
export function collectRefPlaceholders(text) {
  const found = String(text ?? '').match(new RegExp(REF_PLACEHOLDER_RE.source, 'g')) ?? [];
  return [...new Set(found)];
}

/**
 * 校验改写后的提示词**是否保留了全部占位符**。
 *
 * @param {string} original 原提示词
 * @param {string} rewritten 改写后的提示词
 * @returns {{ok: boolean, missing: string[], added: string[]}}
 */
export function validateRefPlaceholders(original, rewritten) {
  const before = collectRefPlaceholders(original);
  const after = collectRefPlaceholders(rewritten);
  const afterSet = new Set(after);
  const beforeSet = new Set(before);
  const missing = before.filter((p) => !afterSet.has(p));
  const added = after.filter((p) => !beforeSet.has(p));
  return { ok: missing.length === 0, missing, added };
}

/**
 * 占位符必须齐全——不齐就报错。
 *
 * @param {string} original
 * @param {string} rewritten
 */
export function assertRefPlaceholdersPreserved(original, rewritten) {
  const check = validateRefPlaceholders(original, rewritten);
  if (!check.ok) {
    throw new PromptError(
      `改写后的提示词丢了参考占位符：${check.missing.join('、')}——丢一个占位符等于引用素材丢失，拒绝交付。`,
      { code: 'prompt_placeholder_lost', missing: check.missing, added: check.added },
    );
  }
  return true;
}

/**
 * 带占位符保护的提示词改写。
 *
 * 每次尝试都**从原文重来**，最多 `PROMPT_REWRITE_MAX_ATTEMPTS`（2）次。
 * 连续失败 → **抛错**，不返回丢了占位符的提示词。
 *
 * @param {string} original 原提示词
 * @param {(prompt: string, info: {attempt: number}) => string} rewriteFn 改写函数
 * @param {{maxAttempts?: number}} [options]
 * @returns {{prompt: string, attempts: number, warnings: Array<object>}}
 */
export function rewritePromptPreservingRefs(original, rewriteFn, options = {}) {
  const maxAttempts = options.maxAttempts ?? PROMPT_REWRITE_MAX_ATTEMPTS;
  const warnings = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = rewriteFn(original, { attempt });
    if (typeof candidate !== 'string') {
      throw new PromptError('提示词改写函数必须返回字符串。', { code: 'prompt_rewrite_invalid', attempt });
    }
    const check = validateRefPlaceholders(original, candidate);
    if (check.ok) {
      return { prompt: candidate, attempts: attempt, warnings };
    }
    warnings.push({
      code: 'prompt_placeholder_lost',
      message: `第 ${attempt} 次改写丢了参考占位符（${check.missing.join('、')}），已回到原文重试。`,
      attempt,
      missing: check.missing,
    });
  }

  throw new PromptError(
    `提示词连续 ${maxAttempts} 次改写都丢了参考占位符——拒绝交付（丢一个占位符等于引用素材丢失）。`,
    { code: 'prompt_placeholder_lost_exhausted', attempts: maxAttempts, warnings },
  );
}

/**
 * 把参考装配结果渲染成提示词里的参考块。
 *
 * 每个参考一行：`__MINIMAX_H3_REF_N__` 紧跟中文标签文本。
 *
 * @param {Array<object>} refs 参考项（`{ refIndex, label }`）
 * @returns {string}
 */
export function formatRefBlock(refs) {
  const list = Array.isArray(refs) ? refs : [];
  if (list.length === 0) return '';
  const lines = list
    .slice()
    .sort((a, b) => (a?.refIndex ?? 0) - (b?.refIndex ?? 0))
    .map((ref) => `${buildRefPlaceholder(ref.refIndex)}${ref.label ?? ''}`);
  return `参考素材（编号与参考图顺序一致，不得改号）：\n${lines.join('\n')}`;
}

/**
 * 分镜正文描述块。
 *
 * ⚠️ `video_prompt` **必须在里面**：它是 llm 阶段写出来的「视频提示词」，
 * 不带它 = 生成请求里根本没有模型写的那段内容（画面全靠 scene_name 猜）。
 *
 * @param {object} shot
 * @returns {string}
 */
export function buildShotDescription(shot) {
  const sh = shot ?? {};
  const lines = [];
  if (sh.scene_name) lines.push(`场景：${sh.scene_name}`);
  if (sh.camera) lines.push(`运镜：${sh.camera}`);
  if (sh.visual) lines.push(`画面：${sh.visual}`);
  if (sh.video_prompt) lines.push(`视频提示词：${sh.video_prompt}`);
  if (sh.dialogue) lines.push(`台词：${sh.dialogue}`);
  if (sh.narration) lines.push(`旁白：${sh.narration}`);
  if (sh.duration != null) lines.push(`时长：${sh.duration} 秒`);
  return lines.join('\n');
}

/**
 * 装配一个分镜的完整生成提示词。
 *
 * 结构：上下文注入（固定三标题） → 分镜描述 → 参考素材块 → 附加段落。
 *
 * @param {{
 *   shot?: object,
 *   refs?: Array<object>,
 *   context?: {bible?: string, style?: string, continuity?: Array},
 *   extraSections?: string[]
 * }} input
 * @returns {string}
 */
export function buildShotPrompt(input = {}) {
  const { shot, refs, context, extraSections = [] } = input;
  const parts = [];

  const injection = buildContextInjection(context ?? {});
  if (injection.trim()) parts.push(injection);

  const description = buildShotDescription(shot);
  if (description.trim()) parts.push(description);

  const refBlock = formatRefBlock(refs);
  if (refBlock.trim()) parts.push(refBlock);

  for (const section of extraSections) {
    if (section && String(section).trim()) parts.push(String(section).trim());
  }

  return parts.join('\n\n');
}
