/**
 * 两个只读技能工具（§8.2）。
 *
 * | 工具 | 行为 |
 * | --- | --- |
 * | `skill(name)` | 返回 **XML 包裹**的技能正文 + 参考文件索引（文件名 / 字数 / 前 160 字预览）+ Base directory |
 * | `skill_reference(name, ref)` | 按**文件名精确匹配**读单个参考文件，**仅 `.md` / `.txt`** |
 *
 * 两者**均截断 120000 字符**（`SKILL_MAX_CONTENT_CHARS`）。
 * 技能不存在 → **抛错并列出可用项**（不许返回空内容糊弄过去）。
 *
 * 来源判定：`source = name === 'novel-to-video' ? 'bundled' : 'installed'`；
 * 扫描时若已知道来源（插件自带目录 / 用户安装目录），以扫描结果为准。
 *
 * 本模块**不出现宿主 ctx**：技能目录路径由调用方以参数传入。
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  NOVEL_TO_VIDEO_SKILL,
  SKILL_MAX_CONTENT_CHARS,
  SKILL_REFERENCE_EXTENSIONS,
  SKILL_SOURCES,
} from '../core/constants.js';
import { SkillError, assertSafeSkillName, findSkillFile, scanSkills } from './scan.js';

/** 转义 XML 文本。 */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 截断到上限字符（附一条截断说明，保证结果长度 ≤ 上限）。 */
export function truncateContent(text, maxChars = SKILL_MAX_CONTENT_CHARS) {
  const body = String(text ?? '');
  if (body.length <= maxChars) return body;
  const notice = `\n\n[内容超过 ${maxChars} 字符，已截断]`;
  return body.slice(0, Math.max(0, maxChars - notice.length)) + notice;
}

/** 判定技能来源。 */
export function resolveSkillSource(skill) {
  if (skill?.source && SKILL_SOURCES.includes(skill.source)) return skill.source;
  return skill?.name === NOVEL_TO_VIDEO_SKILL ? 'bundled' : 'installed';
}

/**
 * 建立技能登记表。
 *
 * @param {{dirs?: Array<{path: string, source?: string}>, bundledDir?: string, installedDir?: string, source?: string}} [options]
 * @returns {{skills: Array<object>, byKey: Map<string, object>, errors: Array<object>, list: () => Array<object>}}
 */
export function buildSkillRegistry(options = {}) {
  const dirs = [];
  if (options.bundledDir) dirs.push({ path: options.bundledDir, source: options.source ?? 'bundled' });
  if (options.installedDir) dirs.push({ path: options.installedDir, source: options.source ?? 'installed' });
  for (const entry of options.dirs ?? []) {
    dirs.push({ path: entry.path, source: entry.source ?? options.source ?? null });
  }

  const skills = [];
  const errors = [];
  const byKey = new Map();

  for (const entry of dirs) {
    const scanned = scanSkills(entry.path, { source: entry.source ?? null });
    for (const error of scanned.errors) errors.push(error);
    for (const skill of scanned.skills) {
      const key = skill.name;
      if (byKey.has(key)) {
        errors.push({
          code: 'skill_name_duplicated',
          message: `技能名重复：「${key}」，保留先出现的那个（${byKey.get(key).dir}）。`,
          skill: skill.name,
        });
        continue;
      }
      byKey.set(key, skill);
      // 目录名也能找到（技能改名后不至于失联）
      if (skill.dirName && !byKey.has(skill.dirName)) byKey.set(skill.dirName, skill);
      skills.push(skill);
    }
  }

  return {
    skills,
    byKey,
    errors,
    list: () => skills,
  };
}

function findSkill(registry, name) {
  const key = String(name ?? '').trim();
  if (!key) {
    throw new SkillError('必须给出技能名。', { code: 'skill_name_required' });
  }
  assertSafeSkillName(key);
  const skill = registry?.byKey?.get(key);
  if (!skill) {
    const available = (registry?.skills ?? []).map((s) => s.name);
    throw new SkillError(
      `技能「${key}」不存在。可用技能：${available.length > 0 ? available.join('、') : '（技能目录为空）'}`,
      { code: 'skill_not_found', name: key, available },
    );
  }
  return skill;
}

/**
 * `skill(name)` —— XML 包裹的技能正文 + 参考文件索引。
 *
 * @param {object} registry
 * @param {string} name
 * @param {{maxChars?: number}} [options]
 * @returns {string}
 */
export function runSkill(registry, name, options = {}) {
  const skill = findSkill(registry, name);
  const file = findSkillFile(skill.dir);
  if (!file) {
    throw new SkillError(`技能「${skill.name}」没有正文文件。`, { code: 'skill_body_missing', name: skill.name });
  }

  const raw = readFileSync(path.join(skill.dir, file), 'utf8');
  const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '').replace(/^\s+/, '');

  const references = skill.references ?? [];
  const referenceXml = references.length
    ? [
      `<references count="${references.length}">`,
      ...references.map(
        (ref) =>
          `  <reference file="${escapeXml(ref.file)}" chars="${Number(ref.chars) || 0}" preview="${escapeXml(ref.preview)}" />`,
      ),
      '</references>',
    ].join('\n')
    : '<references count="0" />';

  const xml = [
    `<skill name="${escapeXml(skill.name)}" source="${escapeXml(resolveSkillSource(skill))}" version="${escapeXml(skill.version ?? '')}" base_directory="${escapeXml(skill.dir)}">`,
    `  <description>${escapeXml(skill.description)}</description>`,
    referenceXml,
    '  <content>',
    body.replace(/^\s+|\s+$/g, ''),
    '  </content>',
    '</skill>',
  ].join('\n');

  return truncateContent(xml, options.maxChars ?? SKILL_MAX_CONTENT_CHARS);
}

/**
 * `skill_reference(name, ref)` —— 按文件名精确匹配读单个参考文件。
 *
 * @param {object} registry
 * @param {string} name
 * @param {string} ref 文件名（可带 `references/` 前缀）
 * @param {{maxChars?: number}} [options]
 * @returns {string}
 */
export function runSkillReference(registry, name, ref, options = {}) {
  const skill = findSkill(registry, name);
  const rawRef = String(ref ?? '').trim();
  if (!rawRef) {
    throw new SkillError('必须给出参考文件名。', { code: 'skill_reference_name_required', name: skill.name });
  }

  const extension = path.extname(rawRef).toLowerCase();
  if (!SKILL_REFERENCE_EXTENSIONS.includes(extension)) {
    throw new SkillError(
      `参考文件只允许 ${SKILL_REFERENCE_EXTENSIONS.join(' / ')}，收到「${rawRef}」。`,
      { code: 'skill_reference_extension_invalid', name: skill.name, ref: rawRef },
    );
  }

  const basename = path.basename(rawRef);
  const dir = path.join(skill.dir, 'references');
  const available = (skill.references ?? []).map((r) => r.file);
  const target = available.find((file) => file === basename);
  if (!target) {
    throw new SkillError(
      `技能「${skill.name}」里没有参考文件「${basename}」。可用：${available.length > 0 ? available.join('、') : '（无）'}`,
      { code: 'skill_reference_not_found', name: skill.name, ref: basename, available },
    );
  }

  const file = path.join(dir, target);
  if (!existsSync(file)) {
    throw new SkillError(`参考文件读不到：${target}`, { code: 'skill_reference_read_failed', name: skill.name, ref: target });
  }
  const content = readFileSync(file, 'utf8');
  return truncateContent(content, options.maxChars ?? SKILL_MAX_CONTENT_CHARS);
}

/**
 * 造一组可直接注册给宿主的工具实现。
 *
 * 宿主（`src/host/tools.js`）拿它注册 `skill` / `skill_reference` 两个只读工具：
 *
 * ```js
 * const tools = createSkillTools({ bundledDir, installedDir });
 * ctx.tools.register({ id: 'skill', execute: ({ name }) => tools.skill({ name }) });
 * ```
 *
 * @param {object} [options] 见 `buildSkillRegistry`
 */
export function createSkillTools(options = {}) {
  const registry = buildSkillRegistry(options);
  return {
    registry,
    listSkills: () => registry.skills.map((s) => ({ ...s, source: resolveSkillSource(s) })),
    skill: (args = {}) => runSkill(registry, args?.name),
    skill_reference: (args = {}) => runSkillReference(registry, args?.name, args?.ref),
  };
}
