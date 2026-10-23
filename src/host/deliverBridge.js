/**
 * 合成与交付桥（T1 宿主半 ↔ T4 媒体层）。
 *
 * T4 的 `src/media/{assemble,deliver}.js` 是纯逻辑 + 可注入 IO：不认识工作区、
 * 不认识会话、不认识宿主上下文。本文件负责：
 *
 *   - 把工作区绝对路径接上（`resolvePath` 走**越界防护**，§11）；
 *   - 没有 ffmpeg 时把**降级结论**原样带出去（不吞、不假装成功）；
 *   - 把交付结果折成 `reelforge-deliver` 的**冻结 payload**（F9）。
 *
 * @module host/deliverBridge
 */
import { DELIVERABLE_KINDS } from '../core/constants.js';
import { buildDeliverPayload } from '../core/deliverPayload.js';
import { assembleChapter, createDefaultIo } from '../media/assemble.js';
import { deliverChapter } from '../media/deliver.js';
import { createFfmpegClient } from '../media/ffmpeg.js';
import { resolveWorkspaceRoot } from './workspace.js';

/**
 * 合成并交付一章。
 *
 * @param {object} options
 * @param {number} options.seq 章节序号。
 * @param {import('./projection.js').ProjectionStore} options.store 投影存储。
 * @param {string} options.sessionId 会话 id。
 * @param {object} options.config 插件配置。
 * @param {string} options.cwd 会话工作目录。
 * @param {AbortSignal} [options.signal] 取消信号。
 * @param {object} [options.deps] 注入能力（ffmpeg 客户端等）。
 * @returns {Promise<object>} 交付结论。
 */
export async function assembleAndDeliver({
  seq,
  store,
  sessionId,
  config,
  cwd,
  signal,
  deps = {},
}) {
  const state = store.stateOf(sessionId);
  const chapter = (state.chapters ?? []).find((item) => item.seq === seq);
  if (!chapter) {
    return { ok: false, errors: [`没有第 ${seq} 章`] };
  }
  const shots = Array.isArray(chapter.shots) ? chapter.shots : [];
  if (shots.length === 0) {
    return { ok: false, errors: [`第 ${seq} 章还没有分镜，无法合成`] };
  }

  const workspaceRoot = resolveWorkspaceRoot(cwd, config.workspaceDir);
  const io = deps.io ?? createDefaultIo();

  /** 相对路径 → 工作区绝对路径（越界返回 null，宁可不写也不越界）。 */
  const resolvePath = (relative) => {
    const resolved = resolveWithin(workspaceRoot, relative);
    return resolved ?? relative;
  };

  // ffmpeg 客户端：没有就传 `null`，T4 会走**降级路径**并把命令给出来。
  const client = deps.ffmpegClient ?? createFfmpegClient({});

  const assembleResult = await assembleChapter({
    chapter,
    shots,
    project: state.project ?? {},
    client,
    io,
    resolvePath,
    // ⚠️ `tmpDir` 与 `exportsDir` **都相对 `workspaceRoot`**（= `<cwd>/<workspaceDir>`），
    // 因为 `resolvePath` 是相对 workspaceRoot 解析的。
    // 这里若写 '.reelforge/tmp'，会落成 `<cwd>/.reelforge/.reelforge/tmp`（多一层）。
    tmpDir: 'tmp',
    exportsDir: 'exports',
    signal,
  });

  const deliverResult = await deliverChapter({
    chapter,
    shots,
    project: state.project ?? {},
    assets: state.assets ?? [],
    client,
    io,
    resolvePath,
    assembleResult,
    exportsDir: 'exports',
  });

  const deliverables = (deliverResult?.deliverables ?? [])
    .filter((item) => DELIVERABLE_KINDS.includes(item.kind))
    .map((item) => ({
      kind: item.kind,
      label: item.label ?? item.kind,
      path: item.path ?? null,
      bytes: Number.isFinite(item.bytes) ? Number(item.bytes) : null,
    }));

  const payload = buildDeliverPayload({
    chapters: [{
      id: chapter.seq ?? null,
      title: chapter.title ?? '',
      shotCount: shots.length,
      durationSec: assembleResult?.durationSec ?? 0,
      deliverables,
    }],
  });

  return {
    ok: assembleResult?.ok !== false && (deliverResult?.ok !== false),
    seq,
    title: chapter.title ?? '',
    assemble: assembleResult,
    deliver: deliverResult,
    degradations: assembleResult?.degradations ?? [],
    notices: assembleResult?.notices ?? [],
    payload,
    patches: [{ op: 'deliver.set', value: payload }],
  };
}

/**
 * 相对路径越界防护（工作区内）。
 *
 * @param {string} base 工作区绝对路径。
 * @param {string} relative 相对路径。
 * @returns {string | null} 绝对路径；越界返回 `null`。
 */
function resolveWithin(base, relative) {
  if (typeof relative !== 'string' || relative.length === 0) return null;
  if (relative.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(relative)) return null;
  const root = base.replace(/[\\/]+$/, '');
  const target = `${root}/${relative.replace(/^[\\/]+/, '')}`;
  const normalizedTarget = target.replace(/\\/g, '/');
  const normalizedRoot = root.replace(/\\/g, '/');
  if (!normalizedTarget.startsWith(`${normalizedRoot}/`)) return null;
  return target;
}
