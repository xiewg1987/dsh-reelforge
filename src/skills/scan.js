/**
 * 技能目录扫描 + frontmatter 解析（§8.2）。
 *
 * ── 三个必须照抄的解析坑 ────────────────────────────────────────────────────
 *
 * 1. **frontmatter 解析器只识别单行标量**。多行 `description: >` 会**失配**——
 *    正文能读到但描述为空 → 路由失效、也不出现在技能目录里。
 *    本实现：块标量（`>` / `|`）**整个键不识别**（与上游同一失配形态），
 *    并把 `description` 为空的技能**当非法技能处理**（不进目录、记一条错误）。
 * 2. **`SKILL.cn.md` 优先于 `SKILL.md`**。
 * 3. **技能名安全校验**：拒绝 `/` `\` `:`、`.`、`..`（防 `path.join` 逃出技能目录）。
 *
 * ── 边界 ────────────────────────────────────────────────────────────────────
 *
 * * **不做关键词路由表**——上游那 22 条正则的 `routeSkill()` 在生产路径里根本没被调用。
 * * 本模块**不出现宿主 ctx**：技能目录路径由调用方以参数传入。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  SKILL_CN_FILENAME,
  SKILL_EN_FILENAME,
  SKILL_NAME_FORBIDDEN,
  SKILL_REFERENCE_EXTENSIONS,
  SKILL_REFERENCE_PREVIEW_CHARS,
} from '../core/constants.js';

/** frontmatter 分隔符正则（照抄上游形态）。 */
export const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/** 技能名非法时抛出的错误。 */
export class SkillError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'SkillError';
    this.code = details.code ?? 'skill_error';
    Object.assign(this, details);
  }
}

/**
 * 解析 frontmatter。
 *
 * **只识别单行标量**：`key: value`。块标量（`>` / `|` / `>-` / `|-`）**不识别**——
 * 这就是上游「多行 `description: >` 失配」的同一形态（不是 bug，是必须照抄的行为）。
 *
 * @param {string} text 技能正文原文
 * @returns {{matched: boolean, data: object, body: string}}
 */
export function parseFrontmatter(text) {
  const source = String(text ?? '');
  const matched = FRONTMATTER_RE.exec(source);
  if (!matched) {
    return { matched: false, data: {}, body: source };
  }

  const data = {};
  for (const line of matched[1].split(/\r?\n/)) {
    // 只认行首的 `key: value`（缩进行不是键）
    const parsed = /^([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (!parsed) continue;
    const key = parsed[1];
    const rawValue = parsed[2].trim();
    // 块标量不识别 → 该键当作没写（上游同款失配）
    if (rawValue === '>' || rawValue === '|' || rawValue === '>-' || rawValue === '|-' || rawValue === '>+' || rawValue === '|+') {
      continue;
    }
    const unquoted = rawValue.replace(/^['"]/, '').replace(/['"]$/, '');
    data[key] = unquoted.trim();
  }

  return { matched: true, data, body: source.slice(matched[0].length) };
}

/**
 * 技能名安全校验。
 *
 * 规则取自 `SKILL_NAME_FORBIDDEN`（`constants.js` 是唯一枚举来源）：
 * 名字里**不得出现** `/` `\` `:` `.` `..` 中的任何一个——这既挡住路径分隔符，
 * 也挡住 `.` / `..` 这种目录逃逸。
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSafeSkillName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return !SKILL_NAME_FORBIDDEN.some((forbidden) => trimmed.includes(forbidden));
}

/**
 * 技能名非法 → 抛错。
 *
 * @param {string} name
 * @returns {string} 通过校验的技能名
 */
export function assertSafeSkillName(name) {
  if (!isSafeSkillName(name)) {
    throw new SkillError(
      `技能名非法：「${name}」。不得包含 ${SKILL_NAME_FORBIDDEN.join(' / ')}（防 path.join 逃出技能目录），也不得是绝对路径。`,
      { code: 'skill_name_unsafe', name },
    );
  }
  return String(name).trim();
}

/**
 * 找技能正文文件：**`SKILL.cn.md` 优先于 `SKILL.md`**。
 *
 * @param {string} skillDir
 * @returns {string|null} 文件名（不存在则 null）
 */
export function findSkillFile(skillDir) {
  if (existsSync(path.join(skillDir, SKILL_CN_FILENAME))) return SKILL_CN_FILENAME;
  if (existsSync(path.join(skillDir, SKILL_EN_FILENAME))) return SKILL_EN_FILENAME;
  return null;
}

/**
 * 读同目录 `meta.yaml` 的 `version`（可选字段）。
 *
 * @param {string} skillDir
 * @returns {string}
 */
export function readMetaVersion(skillDir) {
  const metaFile = path.join(skillDir, 'meta.yaml');
  if (!existsSync(metaFile)) return '';
  try {
    const raw = readFileSync(metaFile, 'utf8');
    const matched = /^version[ \t]*:[ \t]*(.*)$/m.exec(raw);
    return matched ? matched[1].trim().replace(/^['"]|['"]$/g, '') : '';
  } catch {
    return '';
  }
}

/**
 * 列出技能的参考文件索引：文件名 / 字数 / 前 160 字预览。
 *
 * 只收 `.md` / `.txt`（`skill_reference` 只认这两种）。
 *
 * @param {string} skillDir
 * @returns {Array<{file: string, chars: number, preview: string}>}
 */
export function listSkillReferences(skillDir) {
  const dir = path.join(skillDir, 'references');
  if (!existsSync(dir)) return [];
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const references = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SKILL_REFERENCE_EXTENSIONS.includes(ext)) continue;
    let content = '';
    try {
      content = readFileSync(path.join(dir, entry.name), 'utf8');
    } catch {
      content = '';
    }
    references.push({
      file: entry.name,
      chars: content.length,
      preview: content.slice(0, SKILL_REFERENCE_PREVIEW_CHARS),
    });
  }
  references.sort((a, b) => a.file.localeCompare(b.file));
  return references;
}

/**
 * 扫描一个技能目录。
 *
 * @param {string} dir 技能目录（**路径由调用方传入**，本模块不碰宿主 ctx）
 * @param {{source?: string, includeBody?: boolean}} [options]
 *   `source`：`bundled` / `installed` / `generated`；不传则留空，由 `skillTools` 按
 *   「name === 'novel-to-video' ? 'bundled' : 'installed'」的兜底规则判定。
 * @returns {{skills: Array<object>, errors: Array<object>}}
 */
export function scanSkills(dir, options = {}) {
  const skills = [];
  const errors = [];

  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    errors.push({ code: 'skills_dir_missing', message: `技能目录不存在：${dir}`, dir });
    return { skills, errors };
  }

  const seenNames = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(dir, entry.name);
    const file = findSkillFile(skillDir);
    if (!file) continue;

    let raw = '';
    try {
      raw = readFileSync(path.join(skillDir, file), 'utf8');
    } catch (err) {
      errors.push({ code: 'skill_read_failed', message: `读取技能失败：${entry.name}`, dir: skillDir, cause: String(err) });
      continue;
    }

    const { matched, data, body } = parseFrontmatter(raw);
    const name = String(data.name ?? entry.name).trim();

    if (!isSafeSkillName(name)) {
      errors.push({
        code: 'skill_name_unsafe',
        message: `技能名非法，已跳过：${name}（目录 ${entry.name}）`,
        skill: entry.name,
        name,
      });
      continue;
    }

    // description 为空 → 技能既不可路由也不出现在目录里 → 当非法技能处理
    const description = String(data.description ?? '').trim();
    if (!description) {
      errors.push({
        code: 'skill_invalid_description',
        message: `技能「${entry.name}」的 description 为空——已按非法技能处理（不路由、不进技能目录）。${matched ? '' : '该文件没有可解析的 frontmatter。'}`,
        skill: entry.name,
        name,
      });
      continue;
    }

    if (seenNames.has(name)) {
      errors.push({
        code: 'skill_name_duplicated',
        message: `技能名重复：「${name}」（${seenNames.get(name)} 与 ${skillDir}），保留先出现的那个。`,
        skill: entry.name,
        name,
      });
      continue;
    }
    seenNames.set(name, skillDir);

    const skill = {
      name,
      description,
      whenToUse: String(data.whenToUse ?? '').trim(),
      version: String(data.version ?? readMetaVersion(skillDir)).trim(),
      dir: skillDir,
      file,
      dirName: entry.name,
      source: options.source ?? null,
      references: listSkillReferences(skillDir),
    };
    if (options.includeBody) skill.body = body;
    skills.push(skill);
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { skills, errors };
}

/**
 * 技能目录是否为空（宿主用来决定要不要注入技能目录）。
 *
 * @param {string} dir
 */
export function isEmptySkillDir(dir) {
  try {
    return statSync(dir).isDirectory() && readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}
