/**
 * 小说自动拆章（§6.2）——纯逻辑，与宿主无关，可单测。
 *
 * 判定顺序照抄 infinite-creation 的 `splitNovelIntoChapters()`，**顺序不能改**：
 *   1. 命中 ≥2 个章节标题 → 按标题切
 *   2. 命中 <2 个但正文 ≤ FALLBACK_CHAPTER_CHARS → 单章
 *   3. 否则按 FALLBACK_CHAPTER_CHARS 均分
 *   4. 重复标题追加「·(2)」消歧
 *
 * 与上游的两处有意差异，两处都是为了**不丢用户数据**：
 *   - 首个标题之前的前言并入第一章，而不是被丢掉；
 *   - 标题必须出现在行首（允许 markdown 标题符），避免正文里
 *     「第三章提到的那件事」这类句子被误判成标题。
 */
import { CHAPTER_HEADING_RE, FALLBACK_CHAPTER_CHARS } from './constants.js';

/** 行首允许的 markdown 标题符。 */
const MARKDOWN_HEADING_PREFIX_RE = /^#{1,6}\s*/;

/** 换行归一：CRLF / CR → LF，避免不同来源的正文切分结果不一致。 */
export function normalizeNewlines(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

/**
 * 找出正文里的章节标题行。
 *
 * 标题必须**独占一行**且去掉 markdown 标记后**从行首开始**匹配 `CHAPTER_HEADING_RE`。
 *
 * @param {string} novel 小说正文。
 * @returns {{ line: number, title: string }[]} 命中的标题行，按出现顺序。
 */
export function findChapterHeadings(novel) {
  const lines = normalizeNewlines(novel).split('\n');
  const headings = [];
  for (let line = 0; line < lines.length; line += 1) {
    const trimmed = lines[line].trim();
    if (!trimmed) continue;
    const title = trimmed.replace(MARKDOWN_HEADING_PREFIX_RE, '').trim();
    if (!title) continue;
    const match = CHAPTER_HEADING_RE.exec(title);
    // 必须从行首开始：正文里的「第三章提到的那件事」不算标题
    if (!match || match.index !== 0) continue;
    headings.push({ line, title });
  }
  return headings;
}

/**
 * 把小说拆成章节。
 *
 * @param {string} novel 小说正文。
 * @param {{ fallbackChars?: number }} [options] 覆盖兜底字数（测试用）。
 * @returns {{ seq: number, title: string, content: string }[]} 章节列表；空正文返回空数组。
 */
export function splitNovelIntoChapters(novel, options = {}) {
  const fallbackChars = options.fallbackChars ?? FALLBACK_CHAPTER_CHARS;
  const text = normalizeNewlines(novel).trim();
  if (!text) return [];

  const headings = findChapterHeadings(text);
  let raw;
  if (headings.length >= 2) {
    raw = splitByHeadings(text, headings);
  } else if (text.length <= fallbackChars) {
    raw = [{ title: '全文', content: text }];
  } else {
    raw = splitEvenly(text, fallbackChars);
  }

  return dedupeTitles(raw).map((chapter, index) => ({
    seq: index + 1,
    title: chapter.title,
    content: chapter.content,
  }));
}

/**
 * 按标题切分。首个标题之前的前言并入第一章——导入工具丢用户数据是不可接受的。
 * @param {string} text 归一化后的正文。
 * @param {{ line: number, title: string }[]} headings 标题行。
 */
function splitByHeadings(text, headings) {
  const lines = text.split('\n');
  const chapters = [];
  const preamble = lines.slice(0, headings[0].line).join('\n').trim();

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    const end = i + 1 < headings.length ? headings[i + 1].line : lines.length;
    const content = lines.slice(heading.line + 1, end).join('\n').trim();
    chapters.push({ title: heading.title, content });
  }

  if (preamble) {
    const first = chapters[0];
    chapters[0] = {
      title: first.title,
      content: first.content ? `${preamble}\n\n${first.content}` : preamble,
    };
  }
  return chapters;
}

/**
 * 均分：切成 ⌈长度/兜底字数⌉ 份，各份长度尽量相等（差不超过 1 字）。
 * @param {string} text 正文。
 * @param {number} size 兜底字数。
 */
function splitEvenly(text, size) {
  const count = Math.max(1, Math.ceil(text.length / size));
  const base = Math.floor(text.length / count);
  const remainder = text.length % count;
  const chapters = [];
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    const length = base + (i < remainder ? 1 : 0);
    chapters.push({ title: `第 ${i + 1} 段`, content: text.slice(cursor, cursor + length).trim() });
    cursor += length;
  }
  return chapters;
}

/**
 * 重名消歧：第二个同名章变成「标题·(2)」，第三个「·(3)」。
 * @param {{ title: string, content: string }[]} chapters 原始章节。
 */
function dedupeTitles(chapters) {
  const seen = new Map();
  return chapters.map((chapter) => {
    const occurrence = (seen.get(chapter.title) ?? 0) + 1;
    seen.set(chapter.title, occurrence);
    return occurrence === 1 ? chapter : { ...chapter, title: `${chapter.title}·(${occurrence})` };
  });
}
