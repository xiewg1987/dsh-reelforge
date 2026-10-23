/**
 * 上下文三键（`bible` / `style` / `continuity`）—— 读写与注入。
 *
 * ── 纪律 ────────────────────────────────────────────────────────────────────
 *
 * 1. **只有三个键**。多写一个 → **报错**，不静默丢弃（F8：键名取自 `constants.js`）。
 * 2. `bible` 与 `style` 是**整段覆盖**；`continuity` 是**追加**（`{t, content}` 数组）。
 * 3. `bible` 写入时**先读回再合并**，**不得覆盖已有人物与衣橱**，且**必须含「场景站位表」章节**。
 * 4. 注入标题固定三个，取自 `CONTEXT_INJECTION_TITLES`，**不得自创**。
 * 5. **代码层不写 schema**——结构约定在技能正文与 systemPrompt 层（照抄上游形态）。
 *
 * ── 落点 ────────────────────────────────────────────────────────────────────
 *
 * `<projectRoot>/context/bible.md` · `<projectRoot>/context/style.md` · `<projectRoot>/context/continuity.json`
 *
 * 本模块**不出现宿主上下文对象**：项目根目录由调用方（`src/host/`）以参数传入。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  BIBLE_STANDING_TABLE_HEADING,
  CONTEXT_INJECTION_ORDER,
  CONTEXT_INJECTION_TITLES,
  CONTEXT_KEYS,
} from './constants.js';

// ─────────────────────────────────────────────────────────────
// 错误
// ─────────────────────────────────────────────────────────────

/** 上下文相关的错误。`code` 区分原因，便于宿主把话术说清楚。 */
export class ConsistencyError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConsistencyError';
    this.code = details.code ?? 'consistency_error';
    Object.assign(this, details);
  }
}

// ─────────────────────────────────────────────────────────────
// 键校验
// ─────────────────────────────────────────────────────────────

/**
 * 校验上下文键。**只认 `bible` / `style` / `continuity`**。
 * 多写一个键 → 抛错，不静默丢弃。
 *
 * @param {string} key
 * @returns {string} 通过校验的键
 */
export function validateContextKey(key) {
  const name = String(key ?? '');
  if (!CONTEXT_KEYS.includes(name)) {
    throw new ConsistencyError(
      `上下文只有 ${CONTEXT_KEYS.length} 个键（${CONTEXT_KEYS.join(' / ')}），收到「${name}」——已报错，没有静默丢弃。`,
      { code: 'context_key_invalid', key: name, allowed: [...CONTEXT_KEYS] },
    );
  }
  return name;
}

/** 批量校验（`save_context` 一次带多个键时用）。任何一个非法就整体报错。 */
export function validateContextKeys(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  const invalid = list.filter((k) => !CONTEXT_KEYS.includes(String(k ?? '')));
  if (invalid.length > 0) {
    throw new ConsistencyError(
      `上下文只有 ${CONTEXT_KEYS.length} 个键（${CONTEXT_KEYS.join(' / ')}），收到非法键：${invalid.join('、')}——已报错，没有静默丢弃。`,
      { code: 'context_key_invalid', invalid, allowed: [...CONTEXT_KEYS] },
    );
  }
  return list.map((k) => validateContextKey(k));
}

// ─────────────────────────────────────────────────────────────
// bible 校验与合并
// ─────────────────────────────────────────────────────────────

/**
 * `bible` 必须含「场景站位表」章节（空间锚点 / 角色默认方位 / 道具锚点 / 180° 轴线与允许机位）。
 * 缺 → 报错并说清缺什么。
 *
 * @param {string} text
 * @returns {string} 通过校验的原文
 */
export function assertBibleHasStandingTable(text) {
  const body = String(text ?? '');
  if (!body.trim()) {
    throw new ConsistencyError('bible 不能为空：至少要写「场景站位表」章节（空间锚点 / 角色默认方位 / 道具锚点 / 180° 轴线与允许机位）。', {
      code: 'bible_missing_standing_table',
      missing: BIBLE_STANDING_TABLE_HEADING,
    });
  }
  if (!body.includes(BIBLE_STANDING_TABLE_HEADING)) {
    throw new ConsistencyError(
      `bible 缺少「${BIBLE_STANDING_TABLE_HEADING}」章节：必须写清空间锚点、角色默认方位、道具锚点、180° 轴线与允许机位。`,
      { code: 'bible_missing_standing_table', missing: BIBLE_STANDING_TABLE_HEADING },
    );
  }
  return body;
}

/** 受保护的章节：已有的人物与衣橱不能被覆盖。 */
const PROTECTED_HEADING_RE = /(人物|衣橱|角色|wardrobe|character)/i;

/** 匹配受保护标题。 */
function matchesProtected(heading) {
  return PROTECTED_HEADING_RE.test(String(heading ?? ''));
}

/** 把 markdown 拆成树：一级标题是根，每个标题是一个节点。 */
function parseMarkdownTree(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const flat = [];
  const preamble = [];
  let current = null;

  for (const line of lines) {
    const matched = /^(#{1,6})\s*(.*)$/.exec(line);
    if (matched) {
      current = { level: matched[1].length, heading: matched[2].trim(), body: [], children: [] };
      flat.push(current);
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }

  const root = { level: 0, heading: '', body: [], children: [] };
  const stack = [root];
  for (const node of flat) {
    while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return { root, preamble: preamble.join('\n').replace(/\s+$/, '') };
}

function cloneNode(node) {
  return {
    level: node.level,
    heading: node.heading,
    body: [...node.body],
    children: node.children.map(cloneNode),
  };
}

function containsHeading(node, heading) {
  if (node.heading === heading) return true;
  return node.children.some((child) => containsHeading(child, heading));
}

function hasProtectedDescendant(node) {
  return node.children.some((child) => matchesProtected(child.heading) || hasProtectedDescendant(child));
}

/**
 * 一个章节是否受保护（已有的人物 / 衣橱不覆盖）。
 *
 * 例外两种：
 * - 它的子树里还有别的受保护章节（那它只是个分组标题，逐节合并更准）。
 * - 它的子树里含「场景站位表」（站位表必须永远来自本次写入）。
 */
function isProtected(node) {
  if (!matchesProtected(node.heading)) return false;
  if (containsHeading(node, BIBLE_STANDING_TABLE_HEADING)) return false;
  if (hasProtectedDescendant(node)) return false;
  return true;
}

function sameHeading(a, b) {
  return String(a?.heading ?? '').trim() === String(b?.heading ?? '').trim();
}

/** 合并两棵章节树。 */
function mergeTrees(existingChildren, incomingChildren) {
  const merged = [];
  const usedExisting = new Set();

  for (const incoming of incomingChildren) {
    const index = existingChildren.findIndex((ex, i) => !usedExisting.has(i) && sameHeading(ex, incoming));
    if (index === -1) {
      merged.push(cloneNode(incoming));
      continue;
    }
    usedExisting.add(index);
    const existing = existingChildren[index];

    if (isProtected(existing)) {
      // 已有的人物与衣橱：**不覆盖**
      merged.push(cloneNode(existing));
      continue;
    }

    const incomingBody = incoming.body.join('\n').trim();
    const existingBody = existing.body.join('\n').trim();
    merged.push({
      level: incoming.level,
      heading: incoming.heading,
      // 本次写入没给正文 → 不拿空正文抹掉已有内容
      body: incomingBody ? [...incoming.body] : [...existing.body],
      children: mergeTrees(existing.children, incoming.children),
    });
  }

  // 本次没提到的旧章节：受保护的留下（人物与衣橱不丢），其余按「整段覆盖」丢掉
  existingChildren.forEach((existing, index) => {
    if (usedExisting.has(index)) return;
    if (isProtected(existing)) merged.push(cloneNode(existing));
  });

  return merged;
}

function renderNode(node) {
  const parts = [];
  if (node.level > 0) parts.push(`${'#'.repeat(node.level)} ${node.heading}`);
  const body = node.body.join('\n').replace(/\s+$/, '');
  if (body) parts.push(body);
  for (const child of node.children) {
    const rendered = renderNode(child);
    if (rendered) parts.push(rendered);
  }
  return parts.join('\n\n');
}

/**
 * 合并 `bible`：**先读回再合并**，不覆盖已有人物与衣橱。
 *
 * 规则：
 * - 同名章节：受保护（人物 / 衣橱 / 角色）→ **以已有内容为准**；其余 → 本次写入为准（整段覆盖）。
 * - 本次没提到的旧章节：受保护的保留，其余丢弃（整段覆盖）。
 * - 「场景站位表」永远来自本次写入。
 *
 * @param {string} existing 已有的 bible（可为空）
 * @param {string} incoming 本次要写入的 bible
 * @returns {string} 合并后的 bible
 */
export function mergeBible(existing, incoming) {
  const existingTree = parseMarkdownTree(existing ?? '');
  const incomingTree = parseMarkdownTree(incoming ?? '');
  const mergedChildren = mergeTrees(existingTree.root.children, incomingTree.root.children);

  const mergedRoot = { level: 0, heading: '', body: [], children: mergedChildren };
  const parts = [];
  const preamble = [existingTree.preamble, incomingTree.preamble].filter((p) => p && p.trim()).join('\n\n');
  if (preamble.trim()) parts.push(preamble);
  const rendered = renderNode(mergedRoot);
  if (rendered) parts.push(rendered);
  return parts.join('\n\n').replace(/\s+$/, '') + '\n';
}

// ─────────────────────────────────────────────────────────────
// continuity 追加
// ─────────────────────────────────────────────────────────────

/**
 * 追加一条连续性记录。**只追加，不覆盖**。
 *
 * @param {Array<{t: string, content: string}>} existing 已有记录
 * @param {string|{content: string}} entry 本次记录
 * @param {string} [now] 时间戳（ISO），默认取当前时间
 * @returns {Array<{t: string, content: string}>} 新的记录数组
 */
export function appendContinuity(existing, entry, now) {
  const list = Array.isArray(existing) ? existing : [];
  const content = typeof entry === 'string' ? entry : String(entry?.content ?? '');
  if (!content.trim()) {
    throw new ConsistencyError('continuity 记录内容不能为空。', { code: 'continuity_entry_empty' });
  }
  const stamp = now ?? new Date().toISOString();
  return [...list, { t: stamp, content }];
}

// ─────────────────────────────────────────────────────────────
// 注入
// ─────────────────────────────────────────────────────────────

/** 把 continuity 数组渲染成注入文本。 */
export function renderContinuity(entries) {
  if (!Array.isArray(entries)) return '';
  return entries
    .map((entry) => `- [${entry?.t ?? '?'}] ${String(entry?.content ?? '').trim()}`)
    .filter((line) => line.trim() !== '- []')
    .join('\n');
}

/**
 * 按固定顺序与固定标题拼出注入文本。
 *
 * - 顺序：`CONTEXT_INJECTION_ORDER`（bible → style → continuity）
 * - 标题：`CONTEXT_INJECTION_TITLES`（**不可自创**）
 * - 空章节**整段不出现**（不注入空标题）。
 *
 * @param {{bible?: string, style?: string, continuity?: Array}} context
 * @returns {string}
 */
export function buildContextInjection(context) {
  const source = context ?? {};
  const blocks = [];

  for (const key of CONTEXT_INJECTION_ORDER) {
    const title = CONTEXT_INJECTION_TITLES[key];
    let body = '';
    if (key === 'continuity') {
      body = renderContinuity(source.continuity);
    } else {
      body = String(source[key] ?? '').trim();
    }
    if (!body.trim()) continue;
    blocks.push(`${title}\n${body.trim()}`);
  }
  return blocks.join('\n\n');
}

/**
 * 规范化上下文对象：补齐三个键，continuity 永远是数组。
 *
 * @param {object} context
 * @returns {{bible: string, style: string, continuity: Array}}
 */
export function normalizeContext(context) {
  const source = context ?? {};
  const unknown = Object.keys(source).filter((k) => !CONTEXT_KEYS.includes(k));
  if (unknown.length > 0) {
    throw new ConsistencyError(
      `上下文只有 ${CONTEXT_KEYS.length} 个键（${CONTEXT_KEYS.join(' / ')}），收到非法键：${unknown.join('、')}——已报错，没有静默丢弃。`,
      { code: 'context_key_invalid', invalid: unknown, allowed: [...CONTEXT_KEYS] },
    );
  }
  return {
    bible: String(source.bible ?? ''),
    style: String(source.style ?? ''),
    continuity: Array.isArray(source.continuity) ? source.continuity : [],
  };
}

// ─────────────────────────────────────────────────────────────
// 落盘
// ─────────────────────────────────────────────────────────────

/** 上下文文件名（`bible.md` / `style.md` / `continuity.json`）。 */
export const CONTEXT_FILE_NAMES = Object.freeze({
  bible: 'bible.md',
  style: 'style.md',
  continuity: 'continuity.json',
});

/** 上下文目录名（相对项目根目录）。 */
export const CONTEXT_DIR_NAME = 'context';

/** 项目根 → 上下文目录。 */
export function contextDir(projectRoot) {
  return path.join(String(projectRoot ?? ''), CONTEXT_DIR_NAME);
}

function readTextIfExists(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * 读回上下文三键。文件不存在 → 空值（不是错误）。
 *
 * @param {string} projectRoot 项目根目录
 * @returns {{bible: string, style: string, continuity: Array<{t: string, content: string}>}}
 */
export function readContext(projectRoot) {
  const dir = contextDir(projectRoot);
  let continuity = [];
  const raw = readTextIfExists(path.join(dir, CONTEXT_FILE_NAMES.continuity));
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      continuity = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.continuity) ? parsed.continuity : [];
    } catch {
      continuity = [];
    }
  }
  return {
    bible: readTextIfExists(path.join(dir, CONTEXT_FILE_NAMES.bible)),
    style: readTextIfExists(path.join(dir, CONTEXT_FILE_NAMES.style)),
    continuity,
  };
}

/**
 * 写一个上下文键。
 *
 * - `bible`：先校验（含「场景站位表」），**先读回再合并**，落 `context/bible.md`
 * - `style`：整段覆盖，落 `context/style.md`
 * - `continuity`：**只追加**，落 `context/continuity.json`
 *
 * @param {string} projectRoot 项目根目录
 * @param {string} key 只能是 bible / style / continuity
 * @param {string|object} value 内容
 * @param {{now?: string}} [options]
 * @returns {{key: string, value: any, path: string, warnings: Array}}
 */
export function writeContext(projectRoot, key, value, options = {}) {
  const name = validateContextKey(key);
  const dir = contextDir(projectRoot);
  const warnings = [];
  mkdirSync(dir, { recursive: true });

  if (name === 'bible') {
    const incoming = assertBibleHasStandingTable(value);
    const existing = readTextIfExists(path.join(dir, CONTEXT_FILE_NAMES.bible));
    const merged = mergeBible(existing, incoming);
    const file = path.join(dir, CONTEXT_FILE_NAMES.bible);
    writeFileSync(file, merged, 'utf8');
    if (existing.trim() && existing.trim() !== incoming.trim()) {
      warnings.push({
        code: 'bible_merged',
        message: 'bible 已合并写入：已有人物与衣橱按「不覆盖」保留，「场景站位表」以本次写入为准。',
      });
    }
    return { key: name, value: merged, path: file, warnings };
  }

  if (name === 'style') {
    const body = String(value ?? '');
    if (!body.trim()) {
      throw new ConsistencyError('style 不能为空。', { code: 'context_value_empty', key: name });
    }
    const file = path.join(dir, CONTEXT_FILE_NAMES.style);
    writeFileSync(file, body, 'utf8');
    return { key: name, value: body, path: file, warnings };
  }

  // continuity：只追加
  const existing = readContext(projectRoot).continuity;
  const next = appendContinuity(existing, value, options.now);
  const file = path.join(dir, CONTEXT_FILE_NAMES.continuity);
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return { key: name, value: next, path: file, warnings };
}
