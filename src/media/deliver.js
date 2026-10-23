/**
 * 交付物落盘（设计方案 §9.2 / 任务书 §2.2）。
 *
 * **按章组织，每章一套，路径带章节序号**：
 *
 * | 交付物 | 路径 |
 * | --- | --- |
 * | 成片（带字幕） | `exports/chNN_带字幕.mp4` |
 * | 成片（无字幕） | `exports/chNN.mp4`（**重封装，不重渲**） |
 * | 字幕 | `exports/chNN.srt` |
 * | 分镜表 | `exports/chNN_分镜表.html`（**自包含单文件**，可离线打开、可打印成 PDF） |
 * | 分镜表（图） | `exports/chNN_分镜表.jpg`（9×N 拼版） |
 * | 参考图包 | `exports/chNN_参考图包.zip` |
 * | 成片清单 | `exports/chNN_交付清单.json` |
 * | 资产原件 | `assets/` |
 * | 背景音乐库 | `assets/music/` |
 *
 * **成片必须落盘，不只存链接**——远端链接会过期。
 *
 * ## 「路径必须有基准」
 *
 * 交给 ffmpeg 的路径全是**工作区相对路径**（`exports/ch01_分镜表.jpg`），
 * 所以两件事必须成立：
 *
 * 1. **子进程 cwd = 工作区**——否则拼版图会落进**宿主进程的启动目录**，
 *    工作区的 `exports/` 里根本没有这张图（而「文件没落盘就不列进清单」
 *    的逻辑会把这次失败**静默吞掉**）。cwd 由 `inferWorkspaceRoot(resolvePath)`
 *    反推（与 `assemble.js` 同一个函数），或由调用方显式给。
 * 2. **concat 清单里的路径相对「清单文件所在目录」**——concat demuxer 按
 *    **清单所在目录**解析相对路径，不是按 cwd（用 `concatEntryPath` 换算）。
 *
 * 零依赖：`node:zlib` 手写 ZIP（不引任何第三方库），缩略图以 base64 内联进 HTML。
 */

import * as fsp from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';

import { DELIVERABLE_KINDS } from '../core/constants.js';
import { detectDegradations, resolveOutputs, degradeNotices } from '../core/degrade.js';
import { buildSrt } from './srt.js';
import {
  createDefaultIo,
  deliverablePath,
  deliverableDir,
  padSeq,
  planContactSheet,
  buildConcatCommand,
  concatEntryPath,
  concatNotices,
  inferWorkspaceRoot,
} from './assemble.js';
import { probeTools } from './ffmpeg.js';

/**
 * @typedef {import('./assemble.js').ChapterInfo} ChapterInfo
 * @typedef {import('./assemble.js').ShotInfo} ShotInfo
 * @typedef {import('./assemble.js').AssetInfo} AssetInfo
 * @typedef {import('./assemble.js').FileIo} FileIo
 * @typedef {import('./assemble.js').FfmpegClient} FfmpegClient
 * @typedef {import('./assemble.js').SrtResult} SrtResult
 */

/**
 * 项目内容字段（参考图包里的 `project.json` 片段要抄的那一份）。
 * @typedef {object} DeliverProject
 * @property {string} [projectId]
 * @property {string} [name]
 * @property {string} [style]
 * @property {string} [video_resolution]
 * @property {string} [video_aspect_ratio]
 * @property {number} [video_width]
 * @property {number} [video_height]
 * @property {boolean} [enable_bgm]
 * @property {boolean} [enable_subtitles]
 */

/**
 * `assembleChapter()` 的结果（交付时只读成片与降级信息）。
 * @typedef {object} AssembleResult
 * @property {boolean} [ok]
 * @property {number|string} [seq]
 * @property {number} [durationSec]
 * @property {Array<{kind?: string, path?: string, bytes?: number|null}>} [outputs]
 * @property {Array<{kind: string, message: string}>} [degradations]
 */

/** 交付物的人类可读标签（中文）。 */
export const DELIVERABLE_LABELS = Object.freeze({
  video_subtitled: '成片（带字幕）',
  video_clean: '成片（无字幕）',
  srt: '字幕',
  storyboard_html: '分镜表',
  storyboard_image: '分镜表（图）',
  reference_pack: '参考图包',
  assets: '资产原件',
  music_library: '背景音乐库',
  manifest: '成片清单',
  concat_command: '拼接命令',
});

/** HTML 转义。 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 读一个文件的 base64 data URI；读不到就返回 null（调用方占位）。 */
export async function readDataUri(io, path, resolvePath) {
  if (!path) return null;
  try {
    const buffer = await io.readFile(resolvePath(path));
    const ext = String(path).split('.').pop()?.toLowerCase() ?? '';
    const mime =
      { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext] ??
      'application/octet-stream';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * ffmpeg 报错摘要：取 stderr 的最后一行（截断）。
 * 降级话术要**说清为什么没出图**，所以不能只写「失败」。
 *
 * @param {string} stderr
 * @param {number} [limit] 摘要长度上限
 * @returns {string} 以「：」开头的摘要（没有内容时返回空串）
 */
export function stderrSummary(stderr, limit = 200) {
  const lines = String(stderr ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  const last = lines[lines.length - 1];
  return last.length > limit ? `：${last.slice(0, limit)}…` : `：${last}`;
}

// ─────────────────────────────────────────────────────────────
// ZIP（零依赖）
// ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

/** CRC32（ZIP 用）。 */
export function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * 造一个 ZIP。
 * @param {Array<{name: string, data: Buffer|string}>} entries
 * @returns {Buffer}
 */
export function createZip(entries = []) {
  const parts = [];
  const central = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = 0x21; // 1980-01-01

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data ?? ''), 'utf8');
    const crc = crc32(raw);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 文件名
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    parts.push(local, nameBuf, payload);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(dosTime, 12);
    header.writeUInt16LE(dosDate, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(payload.length, 20);
    header.writeUInt32LE(raw.length, 24);
    header.writeUInt16LE(nameBuf.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, centralBuffer, end]);
}

// ─────────────────────────────────────────────────────────────
// 分镜表 HTML（自包含单文件）
// ─────────────────────────────────────────────────────────────

const STORYBOARD_CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px;
  font-family: "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
  background: #ffffff;
  color: #1a1a1a;
  line-height: 1.6;
}
h1 { font-size: 20px; margin: 0 0 4px; }
.meta { color: #555; font-size: 13px; margin-bottom: 16px; }
.shot {
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 14px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.shot-head { display: flex; gap: 12px; align-items: flex-start; }
.thumb {
  width: 120px;
  height: 213px;
  flex: 0 0 120px;
  border: 1px solid #ccc;
  border-radius: 4px;
  object-fit: cover;
  background: #f2f2f2;
}
.thumb-missing {
  width: 120px; height: 213px; flex: 0 0 120px;
  border: 1px dashed #bbb; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 6px; font-size: 11px; color: #777; background: #fafafa;
}
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { border: 1px solid #e0e0e0; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f6f6f6; width: 84px; font-weight: 600; white-space: nowrap; }
.cols { width: 84px; color: #666; }
.dialogue { font-weight: 600; }
.narration { color: #444; font-style: italic; }
@media print {
  @page { size: A4; margin: 12mm; }
  body { padding: 0; background: #fff; }
  .shot { border-color: #999; }
  .no-print { display: none; }
}
`;

/**
 * 造自包含的分镜表 HTML。
 *
 * **自包含**：样式内联、缩略图以 base64 data URI 内嵌、**不引用任何外部资源**
 * → 可离线打开、可直接打印成 PDF。
 *
 * @param {object} options
 * @param {ChapterInfo} [options.chapter] `{ id, seq, title }`
 * @param {ShotInfo[]} [options.shots]
 * @param {Map<string,string>|Record<string,string>} [options.thumbnails] shotId → data URI（读不到就没有该镜缩略图）
 * @returns {string} 自包含的 HTML
 */
export function buildStoryboardHtml({ chapter = {}, shots = [], thumbnails = {} } = {}) {
  const thumbOf = (id) => {
    if (thumbnails instanceof Map) return thumbnails.get(id) ?? null;
    return thumbnails?.[id] ?? null;
  };
  const rows = shots
    .slice()
    .sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0))
    .map((shot) => {
      const id = shot?.id ?? `shot_${shot?.idx ?? 0}`;
      const dataUri = thumbOf(id);
      const thumb = dataUri
        ? `<img class="thumb" src="${dataUri}" alt="镜 ${escapeHtml(shot?.idx ?? '')} 缩略图">`
        : `<div class="thumb-missing">参考图不可用，已用文字卡占位</div>`;
      const cells = [
        ['镜号', escapeHtml(shot?.idx ?? '')],
        ['景别', escapeHtml(shot?.shot_size ?? shot?.size ?? shot?.framing ?? '')],
        ['运镜', escapeHtml(shot?.camera ?? '')],
        ['时长', `${escapeHtml(shot?.duration ?? '')} 秒`],
        ['画面', escapeHtml(shot?.visual ?? '')],
        ['对白', `<span class="dialogue">${escapeHtml(shot?.dialogue ?? '')}</span>`],
        ['旁白', `<span class="narration">${escapeHtml(shot?.narration ?? '')}</span>`],
        ['场景', escapeHtml(shot?.scene_name ?? '')],
      ];
      return `      <section class="shot">
        <div class="shot-head">
          ${thumb}
          <table>
${cells.map(([k, v]) => `            <tr><th>${k}</th><td>${v}</td></tr>`).join('\n')}
          </table>
        </div>
      </section>`;
    })
    .join('\n');

  const total = shots.reduce((sum, shot) => sum + (Number(shot?.duration) || 0), 0);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(chapter?.title ?? '分镜表')} · 分镜表</title>
<style>${STORYBOARD_CSS}</style>
</head>
<body>
<header>
<h1>${escapeHtml(chapter?.title ?? '未命名章节')} · 分镜表</h1>
<div class="meta">章节 ${escapeHtml(chapter?.seq ?? '')} · 镜数 ${shots.length} · 预计时长 ${total} 秒</div>
</header>
${rows}
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────
// 参考图包
// ─────────────────────────────────────────────────────────────

/** 取一镜的参考图路径（显式 references + 按 id 绑定的资产图）。 */
export function resolveShotReferencePaths(shot = {}, assets = []) {
  const out = [];
  const seen = new Set();
  const push = (path, name) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    out.push({ path, name: name ?? path.split('/').pop() });
  };
  for (const ref of shot.references ?? []) {
    if (typeof ref === 'string') push(ref);
    else if (ref?.path) push(ref.path, ref.name);
  }
  const ids = [
    ...(shot.character_ids ?? []),
    ...(shot.costume_ids ?? []),
    ...(shot.age_ids ?? []),
    ...(shot.scene_ids ?? []),
    ...(shot.prop_ids ?? []),
  ];
  for (const asset of assets) {
    if (!asset?.image_path) continue;
    if (ids.includes(asset.id)) push(asset.image_path, asset.name);
  }
  return out;
}

/**
 * 造参考图包（ZIP）。
 * 含：每镜参考图 + `project.json` 片段 + 每镜提示词 `.txt` + `manifest.json`。
 *
 * @param {object} options
 * @param {ChapterInfo} [options.chapter] `{ id, seq, title }`
 * @param {ShotInfo[]} [options.shots]
 * @param {DeliverProject} [options.project]
 * @param {AssetInfo[]} [options.assets]
 * @param {FileIo} [options.io] 文件 IO（注入）
 * @param {(p: string) => string} [options.resolvePath] 相对路径 → 绝对路径
 * @param {string} [options.generatedAt] 生成时间（ISO 串）；不给用当前时间
 * @returns {Promise<{zip: Buffer, manifest: object, entries: Array<object>}>} 参考图包
 */
export async function buildReferencePack({
  chapter = {},
  shots = [],
  project = {},
  assets = [],
  io,
  resolvePath = (p) => p,
  generatedAt = null,
} = {}) {
  const entries = [];
  const ordered = shots.slice().sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0));

  for (const shot of ordered) {
    const shotId = shot?.id ?? `shot_${shot?.idx ?? 0}`;
    const dir = `shots/${shotId}`;
    const refs = resolveShotReferencePaths(shot, assets);
    let refIndex = 0;
    for (const ref of refs) {
      refIndex += 1;
      const ext = String(ref.path).split('.').pop()?.toLowerCase() ?? 'bin';
      try {
        const data = await io.readFile(resolvePath(ref.path));
        entries.push({ name: `${dir}/ref_${String(refIndex).padStart(2, '0')}.${ext}`, data });
      } catch {
        // 参考图读不到就不塞进包里（清单里会标缺）
      }
    }
    const promptText = [
      `# ${shotId}（镜号 ${shot?.idx ?? ''}）`,
      '',
      '## 画面',
      shot?.visual ?? '',
      '',
      '## 运镜',
      shot?.camera ?? '',
      '',
      '## 视频提示词',
      shot?.video_prompt ?? '',
      '',
      '## 图像提示词',
      shot?.image_prompt ?? '',
      '',
      '## 对白',
      shot?.dialogue ?? '',
      '',
      '## 旁白',
      shot?.narration ?? '',
    ].join('\n');
    entries.push({ name: `${dir}/prompt.txt`, data: promptText });
  }

  const projectFragment = {
    schemaVersion: '2.0',
    projectId: project?.projectId ?? null,
    project: {
      name: project?.name ?? null,
      style: project?.style ?? null,
      video_resolution: project?.video_resolution ?? null,
      video_aspect_ratio: project?.video_aspect_ratio ?? null,
      video_width: project?.video_width ?? null,
      video_height: project?.video_height ?? null,
      enable_bgm: project?.enable_bgm ?? null,
      enable_subtitles: project?.enable_subtitles ?? null,
    },
    chapter: {
      id: chapter?.id ?? null,
      seq: chapter?.seq ?? null,
      title: chapter?.title ?? null,
    },
    shots: ordered,
  };
  entries.push({ name: 'project.json', data: JSON.stringify(projectFragment, null, 2) });

  const manifest = {
    kind: 'reference_pack',
    chapter: { id: chapter?.id ?? null, seq: chapter?.seq ?? null, title: chapter?.title ?? null },
    generatedAt: generatedAt ?? new Date().toISOString(),
    entries: entries.map((entry) => ({ path: entry.name, bytes: Buffer.byteLength(entry.data) })),
  };
  entries.push({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });

  return { zip: createZip(entries), manifest, entries };
}

// ─────────────────────────────────────────────────────────────
// 章节交付
// ─────────────────────────────────────────────────────────────

/**
 * 交付一章。
 *
 * @param {object} options
 * @param {ChapterInfo} [options.chapter] `{ id, seq, title }`
 * @param {ShotInfo[]}  [options.shots]
 * @param {DeliverProject} [options.project]
 * @param {AssetInfo[]}  [options.assets]
 * @param {FfmpegClient} [options.client] ffmpeg 客户端（拼版图 / 拼接命令需要）
 * @param {FileIo} [options.io]
 * @param {(p: string) => string} [options.resolvePath] 相对路径 → 绝对路径
 * @param {AssembleResult} [options.assembleResult] `assembleChapter()` 的结果（成片等）
 * @param {SrtResult} [options.srt] 字幕，不给则内部生成
 * @param {object} [options.degrades] 额外降级输入
 * @param {string} [options.exportsDir] 交付目录（默认 `exports`）
 * @param {string} [options.cwd] 工作区目录（ffmpeg 子进程的 cwd）。
 *   不给就从 `resolvePath` 反推——**必须钉住**：拼版图的输出路径是相对路径
 *   （`exports/ch01_分镜表.jpg`），不钉 cwd 就等于把它写进**宿主进程的启动目录**。
 */
export async function deliverChapter(options = {}) {
  const {
    chapter = {},
    shots = [],
    project = {},
    assets = [],
    client = null,
    io = createDefaultIo(),
    resolvePath = (p) => p,
    assembleResult = null,
    degrades = {},
    exportsDir = 'exports',
    cwd = null,
  } = options;

  const seq = Number(chapter.seq ?? 1);
  const ordered = shots.slice().sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0));
  /** @type {SrtResult} */
  const srt = options.srt ?? buildSrt(ordered);
  const deliverables = [];
  /**
   * **白名单分流**：`deliverables` 只放 `DELIVERABLE_KINDS` 里的 kind
   * （它们要进 `reelforge-deliver` 的冻结 payload）；
   * 不在白名单的产物（成片清单 / 拼接命令）进 `extras`，
   * 只在磁盘与成片清单 JSON 里出现，不进 payload。
   */
  const extras = [];
  const pushDeliverable = (item) => {
    if (DELIVERABLE_KINDS.includes(item.kind)) deliverables.push(item);
    else extras.push(item);
  };

  /**
   * ffmpeg 子进程的工作目录：显式 `cwd` 优先，否则从 `resolvePath` 反推
   * （**同一个函数** `inferWorkspaceRoot`，与 `assemble.js` 保持一致）。
   */
  const ffmpegCwd = cwd ?? inferWorkspaceRoot(resolvePath);
  /** 每次调用 ffmpeg 都带上它——相对路径才有确定的解析基准。 */
  const execOptions = ffmpegCwd ? { cwd: ffmpegCwd } : {};

  const write = async (relPath, data) => {
    await io.writeFile(resolvePath(relPath), data);
    let bytes = null;
    try {
      const stat = await io.stat(resolvePath(relPath));
      bytes = stat.size;
    } catch {
      bytes = null;
    }
    return bytes;
  };

  await io.mkdir(resolvePath(exportsDir));

  // 成片（来自合成阶段）
  for (const output of assembleResult?.outputs ?? []) {
    if (!output?.path) continue;
    pushDeliverable({
      kind: output.kind,
      label: DELIVERABLE_LABELS[output.kind] ?? output.kind,
      path: output.path,
      bytes: output.bytes ?? null,
    });
  }

  // 字幕（enable_subtitles 关时也交付 .srt）
  const srtPath = deliverablePath('srt', seq);
  if (!deliverables.some((item) => item.kind === 'srt')) {
    const bytes = await write(srtPath, srt.text ?? srt.srt ?? '');
    deliverables.push({ kind: 'srt', label: DELIVERABLE_LABELS.srt, path: srtPath, bytes });
  }

  // 分镜表 HTML（自包含）
  /** @type {Record<string, string>} */
  const thumbnails = {};
  for (const shot of ordered) {
    const id = shot?.id ?? `shot_${shot?.idx ?? 0}`;
    const refs = resolveShotReferencePaths(shot, assets);
    for (const ref of refs) {
      const uri = await readDataUri(io, ref.path, resolvePath);
      if (uri) {
        thumbnails[id] = uri;
        break;
      }
    }
  }
  const html = buildStoryboardHtml({ chapter, shots: ordered, thumbnails });
  const htmlPath = deliverablePath('storyboard_html', seq);
  const htmlBytes = await write(htmlPath, html);
  deliverables.push({
    kind: 'storyboard_html',
    label: DELIVERABLE_LABELS.storyboard_html,
    path: htmlPath,
    bytes: htmlBytes,
  });

  // 分镜表拼版图（需要 ffmpeg；缺了就说缺了，不假装出图）
  let tools = null;
  if (client) tools = await probeTools(client);
  const hasVideo = deliverables.some((item) => item.kind === 'video_clean');
  // 没给客户端、也没有成片 → 按「本机缺 ffmpeg」处理（不假装出片）
  const ffmpegAvailable = tools ? tools.ffmpeg.available === true : hasVideo;
  /**
   * 拼版图必须**真的能调用** ffmpeg：没有客户端就是调不了。
   * （以前这里只看 `ffmpegAvailable`——没客户端但有成片时会对 `null` 调 `exec`，直接崩。）
   */
  const canRenderSheet = Boolean(client) && ffmpegAvailable;
  /** 拼版图相关的降级话术：缺什么 / 为什么没出图。 */
  const sheetNotices = [];
  if (canRenderSheet) {
    const imagePaths = [];
    for (const shot of ordered) {
      const refs = resolveShotReferencePaths(shot, assets);
      if (refs[0]) imagePaths.push(refs[0].path);
    }
    if (imagePaths.length > 0) {
      const imagePath = deliverablePath('storyboard_image', seq);
      // **直接用上游 `planContactSheet` 的产物**：滤镜图（`concat` 串多帧流 + `tile` 摆网格
      // + `color=0x222222`）已经是 ffmpeg 认的写法，调用侧**不再做二次校正**。
      const args = planContactSheet({ images: imagePaths, output: imagePath });
      // ⚠️ **必须带 cwd**：输出路径是**工作区相对路径**（`exports/ch01_分镜表.jpg`），
      //    不钉 cwd 就落进**宿主进程的启动目录**——工作区里根本没有这张图，
      //    而「文件没落盘就不列进清单」的逻辑会把这次失败**静默吞掉**。
      const run = await client.exec('ffmpeg', args, execOptions);
      if (run.code !== 0) {
        sheetNotices.push(
          `分镜表拼版图生成失败（ffmpeg 退出码 ${run.code}），未出图${stderrSummary(run.stderr)}`,
        );
      } else {
        let bytes = null;
        try {
          bytes = (await io.stat(resolvePath(imagePath))).size;
        } catch {
          bytes = null;
        }
        // 文件没落盘就不列进交付物清单——不假装出图
        if (bytes === null) {
          sheetNotices.push(`分镜表拼版图未落盘（工作区里找不到 ${imagePath}），未出图`);
        } else {
          deliverables.push({
            kind: 'storyboard_image',
            label: DELIVERABLE_LABELS.storyboard_image,
            path: imagePath,
            bytes,
          });
        }
      }
    } else {
      sheetNotices.push('没有可用参考图，未能出分镜表拼版图（分镜表 HTML 仍已交付）');
    }
  } else {
    sheetNotices.push(
      client
        ? '本机缺 ffmpeg，未能出分镜表拼版图（分镜表 HTML 与参考图包不受影响）'
        : '未提供 ffmpeg 客户端，未能出分镜表拼版图（分镜表 HTML 与参考图包不受影响）',
    );
  }

  // 参考图包
  const pack = await buildReferencePack({
    chapter,
    shots: ordered,
    project,
    assets,
    io,
    resolvePath,
  });
  const packPath = deliverablePath('reference_pack', seq);
  const packBytes = await write(packPath, pack.zip);
  deliverables.push({
    kind: 'reference_pack',
    label: DELIVERABLE_LABELS.reference_pack,
    path: packPath,
    bytes: packBytes,
  });

  // 资产原件 / 背景音乐库（目录型交付物）
  deliverables.push({
    kind: 'assets',
    label: DELIVERABLE_LABELS.assets,
    path: deliverableDir('assets'),
    bytes: null,
  });
  deliverables.push({
    kind: 'music_library',
    label: DELIVERABLE_LABELS.music_library,
    path: deliverableDir('music_library'),
    bytes: null,
  });

  // 缺 ffmpeg / 没有成片 → 附可执行的拼接命令
  const notices = [];
  const degradations =
    assembleResult?.degradations ?? detectDegradations({ ...degrades, ffmpegAvailable });
  if (!hasVideo) {
    const clips = ordered.map((shot) => shot?.video_path).filter(Boolean);
    const cmdPath = `${exportsDir}/concat_ch${padSeq(seq)}.txt`;
    /**
     * ⚠️ **concat 清单里的路径按「清单文件所在目录」解析，不是按 cwd**
     *    （concat demuxer 的规则）。清单落在 `exports/` 下，片段却是工作区相对路径
     *    （`.reelforge/tmp/ch01/seg_001.mp4`）→ 直接写进去会被拼成
     *    `exports/.reelforge/tmp/...` → `Impossible to open`。
     *    所以条目要换算成「相对 exports/」的路径（`../.reelforge/tmp/...`）。
     */
    const concat = buildConcatCommand({
      clips: clips.map((clip) => concatEntryPath(cmdPath, clip)),
      output: deliverablePath('video_clean', seq),
      // 命令里的清单路径也按**工作区根**给（`exports/concat_ch01.txt`）——
      // 这样整条命令在**工作区根**执行就成立（输入与输出同一基准）。
      listFileName: cmdPath,
    });
    const bytes = await write(cmdPath, `${concat.listContent}\n${concat.command}\n`);
    pushDeliverable({
      kind: 'concat_command',
      label: DELIVERABLE_LABELS.concat_command,
      path: cmdPath,
      bytes,
    });
    // 命令本身要**进话术文本**：只透传 notices 的调用方拿不到文件里的命令。
    notices.push(...concatNotices(concat));
  }

  // 成片清单（文件级产物：落盘 + 记进清单 JSON，不进冻结 payload）
  const manifest = {
    kind: 'chapter_manifest',
    chapter: { id: chapter?.id ?? null, seq, title: chapter?.title ?? null },
    shotCount: ordered.length,
    durationSec: ordered.reduce((sum, shot) => sum + (Number(shot?.duration) || 0), 0),
    generatedAt: new Date().toISOString(),
    deliverables: [...deliverables, ...extras].map((item) => ({
      kind: item.kind,
      label: item.label,
      path: item.path,
      bytes: item.bytes,
    })),
    degradations: degradations.map((item) => ({ kind: item.kind, message: item.message })),
  };
  const manifestPath = `${exportsDir}/ch${padSeq(seq)}_交付清单.json`;
  const manifestBytes = await write(manifestPath, JSON.stringify(manifest, null, 2));
  pushDeliverable({
    kind: 'manifest',
    label: DELIVERABLE_LABELS.manifest,
    path: manifestPath,
    bytes: manifestBytes,
  });

  notices.push(...degradeNotices(degradations));
  // 拼版图的话术排最后：它说的是「这张图为什么没有」，不是「成片为什么没有」。
  notices.push(...sheetNotices);

  // 自检：进 payload 的交付物 kind 必须都在白名单里（否则冻结 payload 构造会抛）
  assertDeliverableKinds(deliverables.map((item) => item.kind));

  return {
    chapterId: chapter?.id ?? null,
    title: chapter?.title ?? null,
    seq,
    shotCount: ordered.length,
    durationSec: manifest.durationSec,
    deliverables,
    extras,
    degradations,
    notices,
    outputMatrix: resolveOutputs(degradations),
  };
}

/**
 * 交付物 kind 合法性自检（白名单外一律报错，不静默丢弃）。
 * 进 `reelforge-deliver` 冻结 payload 的 kind **必须**都在 `DELIVERABLE_KINDS` 里。
 */
export function assertDeliverableKinds(kinds = []) {
  for (const kind of kinds) {
    if (!DELIVERABLE_KINDS.includes(kind)) {
      throw new Error(`未知交付物 kind：${kind}（合法值：${DELIVERABLE_KINDS.join(' / ')}）`);
    }
  }
  return true;
}

export { createDefaultIo };
