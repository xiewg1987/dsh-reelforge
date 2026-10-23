/**
 * 生成技能的**格式校验 + 落盘**（§2.7.2 的六条硬门槛 · T5 §2.7）。
 *
 * 设计边界：
 *   - **不搬上游「LLM 起草 SKILL.md」路径** —— 正文由 DSH 对话里的模型起草，
 *     插件只保证「落盘的技能能被引擎正确读到」（格式校验 + 落盘两件事）。
 *   - `generated` 技能**不写进插件包的 `skills/`**（那会被 `npm pack` 带走），
 *     落盘到调用方给定的目录（插件自有存储或工作区）。
 *   - 插件**不分发**第三方技能正文 / vendor 代码 / ComfyUI 模板。
 *
 * 六条硬门槛（不通过就是「拒绝安装」，不是警告）：
 *   ① frontmatter 必须能匹配；② `name` 事实上必填（缺省用目录名兜底**但不报错**，UI 标黄）；
 *   ③ `description` 为空**必须拒绝**（空串会让路由与技能目录双双失效）；
 *   ④ 技能名拒绝 `/` `\` `:`、绝对路径、`.` `..`；
 *   ⑤ 多行标量在安装时**规范化成单行**；⑥ `SKILL.cn.md` 优先于 `SKILL.md`。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  SKILL_CN_FILENAME,
  SKILL_EN_FILENAME,
  SKILL_NAME_FORBIDDEN,
  SKILL_ZIP_MAX_BYTES,
} from './constants.js';

/** 中文正文优先于英文正文。 */
export const SKILL_DOCUMENT_PRIORITY = Object.freeze([SKILL_CN_FILENAME, SKILL_EN_FILENAME]);

/**
 * 技能名是否安全：拒绝 `/` `\` `:`、绝对路径、`.` `..`。
 * @param {unknown} name - 候选技能名。
 * @returns {boolean} 是否安全。
 */
export function isSafeSkillName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed === '') return false;
  if (trimmed === '.' || trimmed === '..') return false;
  for (const forbidden of SKILL_NAME_FORBIDDEN) {
    if (forbidden === '..') {
      if (trimmed.includes('..')) return false;
      continue;
    }
    if (trimmed.includes(forbidden)) return false;
  }
  // 绝对路径（POSIX 与 Windows 两种写法）。
  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(trimmed)) return false;
  return true;
}

/**
 * 拆出 `---` 包裹的 frontmatter 与正文。
 * @param {unknown} text - 文件全文。
 * @returns {{ ok: boolean, frontmatter: Record<string, string>, body: string, error: string | null }}
 */
export function parseFrontmatter(text) {
  if (typeof text !== 'string') {
    return { ok: false, frontmatter: {}, body: '', error: 'frontmatter: file content is not a string' };
  }
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(normalized);
  if (match === null) {
    return { ok: false, frontmatter: {}, body: normalized, error: 'frontmatter: missing or malformed "---" block' };
  }
  const frontmatter = parseScalarBlock(match[1]);
  return { ok: true, frontmatter, body: match[2] ?? '', error: null };
}

/**
 * 解析 frontmatter 的标量块：单行标量 + 折叠/字面块标量（块标量会被拼回单行）。
 * @param {string} block - frontmatter 文本。
 * @returns {Record<string, string>} 键值表。
 */
function parseScalarBlock(block) {
  /** @type {Record<string, string>} */
  const result = {};
  const lines = block.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
      // 折叠/字面块标量：吃掉缩进续行，拼成单行。
      const parts = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const next = lines[cursor];
        if (next.trim() === '') {
          parts.push('');
          continue;
        }
        if (!/^\s/.test(next)) break;
        parts.push(next.trim());
      }
      index = parts.length === 0 ? index : index + parts.length;
      result[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    result[key] = unquote(raw);
  }
  return result;
}

/**
 * 去掉一层引号。
 * @param {string} value - 原始值。
 * @returns {string} 去引号后的值。
 */
function unquote(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) return value.slice(1, -1);
  }
  return value;
}

/**
 * 把多行标量规范化成单行，返回可安全落盘的 frontmatter 文本。
 * @param {string} text - 文件全文。
 * @returns {string} 规范化后的全文。
 */
export function normalizeMultilineScalars(text) {
  const parsed = parseFrontmatter(text);
  if (!parsed.ok) return typeof text === 'string' ? text : '';
  const lines = [];
  for (const [key, value] of Object.entries(parsed.frontmatter)) {
    const flat = String(value).replace(/\s+/g, ' ').trim();
    lines.push(`${key}: ${flat.includes(' ') || flat.includes(':') ? JSON.stringify(flat) : flat}`);
  }
  const body = parsed.body.replace(/^\n+/, '');
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

/**
 * 校验一份技能草稿（六条硬门槛）。
 *
 * @param {{ text: string, fallbackName?: string }} draft - 草稿。
 * @returns {{ ok: boolean, name: string | null, description: string | null, errors: string[], warnings: string[], frontmatter: Record<string, string>, body: string, text: string }}
 */
export function validateSkillDraft(draft) {
  const source = draft && typeof draft.text === 'string' ? draft.text : '';
  const fallbackName = typeof draft?.fallbackName === 'string' ? draft.fallbackName.trim() : '';
  const parsed = parseFrontmatter(source);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!parsed.ok) errors.push(parsed.error ?? 'frontmatter: missing or malformed "---" block');

  const rawName = parsed.frontmatter.name;
  const name = typeof rawName === 'string' && rawName.trim() !== '' ? rawName.trim() : fallbackName;
  if (name === '') {
    errors.push('name: missing and no directory name to fall back to');
  } else if (!isSafeSkillName(name)) {
    errors.push(`name: "${name}" contains a forbidden character or path fragment`);
  } else if (typeof rawName !== 'string' || rawName.trim() === '') {
    // 缺省用目录名兜底**但不报错**——只在 UI 上标黄。
    warnings.push(`name: missing, fell back to the directory name "${name}"`);
  }

  const description = typeof parsed.frontmatter.description === 'string' ? parsed.frontmatter.description.trim() : '';
  if (description === '') {
    errors.push('description: empty description disables both routing and the skill directory');
  }

  return {
    ok: errors.length === 0,
    name: name === '' ? null : name,
    description: description === '' ? null : description,
    errors,
    warnings,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    text: parsed.ok ? normalizeMultilineScalars(source) : source,
  };
}

/**
 * 在可用文件里挑正文文件：`SKILL.cn.md` 优先于 `SKILL.md`。
 * @param {Iterable<string>} available - 可用文件名。
 * @returns {string | null} 选中的文件名。
 */
export function selectSkillDocument(available) {
  const names = new Set(available);
  for (const candidate of SKILL_DOCUMENT_PRIORITY) {
    if (names.has(candidate)) return candidate;
  }
  return null;
}

/**
 * 技能包体积门槛：超过 `SKILL_ZIP_MAX_BYTES` 拒绝。
 * @param {number} bytes - 包字节数。
 * @returns {{ ok: boolean, error: string | null }} 结论。
 */
export function checkSkillPackageSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) {
    return { ok: false, error: 'skill package: size is not a number' };
  }
  if (size > SKILL_ZIP_MAX_BYTES) {
    return { ok: false, error: `skill package: ${size} bytes exceeds the ${SKILL_ZIP_MAX_BYTES} byte limit` };
  }
  return { ok: true, error: null };
}

/**
 * 落盘一份技能草稿。
 *
 * 只做「格式校验 + 落盘」两件事：正文由对话里的模型起草，插件不生成内容。
 * 目标目录由调用方给出（插件自有存储或工作区）——**绝不写进插件包的 `skills/`**。
 *
 * @param {{ targetDir: string, name: string, text: string, references?: Record<string, string> }} input - 落盘输入。
 * @returns {{ ok: boolean, path: string | null, errors: string[], warnings: string[] }} 结论。
 */
export function installSkillDraft(input) {
  const targetDir = typeof input?.targetDir === 'string' ? input.targetDir : '';
  if (targetDir === '') {
    return { ok: false, path: null, errors: ['targetDir: missing'], warnings: [] };
  }
  const validated = validateSkillDraft({ text: input?.text ?? '', fallbackName: input?.name });
  if (!validated.ok) {
    return { ok: false, path: null, errors: validated.errors, warnings: validated.warnings };
  }
  const name = /** @type {string} */ (validated.name);
  if (!isSafeSkillName(name)) {
    return { ok: false, path: null, errors: [`name: "${name}" contains a forbidden character or path fragment`], warnings: validated.warnings };
  }
  const root = resolve(targetDir);
  const directory = join(root, name);
  if (!directory.startsWith(root)) {
    return { ok: false, path: null, errors: [`name: "${name}" escapes the skill directory`], warnings: validated.warnings };
  }
  mkdirSync(directory, { recursive: true });
  const path = join(directory, SKILL_EN_FILENAME);
  writeFileSync(path, validated.text, 'utf8');
  const references = input?.references ?? {};
  for (const [referenceName, referenceText] of Object.entries(references)) {
    if (referenceName.includes('/') || referenceName.includes('\\') || referenceName.includes('..')) continue;
    writeFileSync(join(directory, referenceName), referenceText, 'utf8');
  }
  return { ok: true, path, errors: [], warnings: validated.warnings };
}

export default validateSkillDraft;
