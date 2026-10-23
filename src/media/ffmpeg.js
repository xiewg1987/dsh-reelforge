/**
 * ffmpeg / ffprobe 封装（设计方案 §9.1）。
 *
 * 纪律：
 *
 *  1. **双工具形态保留**：ffprobe 负责探测，ffmpeg 负责处理，链式参数**原样透传**
 *     （本模块不解释、不重排、不吞参数）。
 *  2. **客户端可注入**：runner 由构造参数传入，模块内**不硬连**任何外部进程；
 *     单测用 fake 客户端即可跑通全流程，不需要本机装 ffmpeg。
 *  3. **缺失要优雅**：本机没有 ffmpeg 是**正常情况**（不是阻塞项），
 *     探测返回 `available: false` + `reason`，**不抛异常**——
 *     「缺 ffmpeg 的降级路径」本身就是本任务的交付内容之一（§9.3）。
 *  4. **相对路径要有基准**：ffmpeg / ffprobe 收到的路径大多是**工作区相对路径**
 *     （`exports/ch01.mp4`）。不钉 cwd 就等于让它们落进**宿主进程的启动目录**。
 *     所以客户端支持 `cwd`（客户端级默认值 + 单次调用覆盖），
 *     并把 cwd 一路透传到 `spawn`。
 *
 * 本模块只做「进程调用 + 结果解析」，**不含业务判断**（归一 / 拼接 / 字幕在 `assemble.js`）。
 */

import { spawn } from 'node:child_process';

export const FFMPEG = 'ffmpeg';
export const FFPROBE = 'ffprobe';

/**
 * 带 `code` 的错误。
 *
 * Node 的系统错误（`ENOENT` / `EPERM` …）自带 `code`；本模块自己打的分类码
 * （`FFPROBE_MISSING` / `FFPROBE_FAILED` / `FFPROBE_BAD_OUTPUT`）也放在同一个位置。
 *
 * @typedef {Error & { code?: string }} FfmpegError
 */

/**
 * 单个工具（ffmpeg / ffprobe）的可用性探测结果。
 *
 * @typedef {object} ToolAvailability
 * @property {boolean} available 工具能不能用
 * @property {string|null} version 版本号（探测不到时为 null）
 * @property {string|null} reason 失败原因（`not-found` / `error`；可用时为 null）
 * @property {string|null} detail 失败细节（错误码 / stderr 摘要）
 */

/** spawn 失败时能被判定为「工具不存在」的错误码。 */
const MISSING_TOOL_CODES = new Set(['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM']);

/**
 * 默认 runner：基于 `node:child_process.spawn`。
 * **永远 resolve，不 reject**——命令失败是正常业务结果，由调用方看 `code`。
 *
 * 支持 `options.signal`（AbortSignal）：中止时**杀掉子进程**并返回
 * `spawnError: 'ABORT_ERR'`，让调用方能区分「被取消」与「ffmpeg 自己失败」。
 */
export function createDefaultRunner() {
  return function run(bin, args, options = {}) {
    const { input, cwd, timeoutMs, signal } = options;
    return new Promise((resolve) => {
      // 调用方已经中止：**根本不起进程**。
      if (signal?.aborted) {
        resolve({ code: -1, stdout: '', stderr: '已取消', spawnError: 'ABORT_ERR' });
        return;
      }
      let child;
      try {
        child = spawn(bin, args, { cwd, windowsHide: true });
      } catch (err) {
        resolve({
          code: -1,
          stdout: '',
          stderr: String(err?.message ?? err),
          spawnError: String((/** @type {FfmpegError} */ (err))?.code ?? 'ESPAWN'),
        });
        return;
      }
      let stdout = '';
      let stderr = '';
      let settled = false;
      /** @type {NodeJS.Timeout|null} */
      let timer = null;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeout(timer);
        if (signal && typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        }
        resolve(result);
      };
      /**
       * 中止回调：杀掉子进程并给出**可判定**的结果。
       * 杀掉进程后 `close` 也会来一次，但 `finish` 只认第一次，结论不会被覆盖。
       */
      const onAbort = () => {
        child.kill?.();
        finish({ code: -1, stdout, stderr: `${stderr}\n已取消`, spawnError: 'ABORT_ERR' });
      };
      child.stdout?.on('data', (chunk) => { stdout += chunk; });
      child.stderr?.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (err) => {
        finish({
          code: -1,
          stdout,
          stderr: `${stderr}${String(err?.message ?? err)}`,
          spawnError: String((/** @type {FfmpegError} */ (err))?.code ?? 'ESPAWN'),
        });
      });
      child.on('close', (code) => {
        finish({ code: typeof code === 'number' ? code : -1, stdout, stderr });
      });
      if (input != null) {
        child.stdin?.end(input);
      } else {
        child.stdin?.end();
      }
      if (signal && typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          child.kill?.();
          finish({ code: -1, stdout, stderr: `${stderr}\n超时 ${timeoutMs}ms`, spawnError: 'ETIMEDOUT' });
        }, timeoutMs);
        if (typeof timer.unref === 'function') timer.unref();
      }
    });
  };
}

/** 解析 `24000/1001` 这类帧率。 */
export function parseRatio(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!raw.includes('/')) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const [num, den] = raw.split('/').map((part) => Number(part));
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

/** 从 `ffmpeg -version` 的首行里抽出版本号。 */
export function parseVersion(stdout) {
  const first = String(stdout ?? '').split(/\r?\n/)[0] ?? '';
  const m = first.match(/version\s+([^\s-]+)/i);
  return m ? m[1] : (first.trim() || null);
}

/**
 * 建一个 ffmpeg 客户端。
 *
 * @param {object} [options]
 * @param {Function} [options.runner] `(bin, args, opts) => Promise<{code, stdout, stderr, spawnError?}>`，默认用 spawn
 * @param {object}   [options.bins]   `{ ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' }`，允许指向绝对路径
 * @param {string}   [options.cwd]    **工作区目录**：所有相对路径的解析基准。
 *   不给就继承**宿主进程 cwd**（旧行为）——那正是「成片落到工作区之外」的成因。
 *   单次调用的 `execOptions.cwd` / `probe(file, { cwd })` 优先级更高。
 */
export function createFfmpegClient(options = {}) {
  const run = options.runner ?? createDefaultRunner();
  const bins = options.bins ?? {};
  const defaultCwd = options.cwd ?? null;

  const binOf = (tool) => bins[tool] ?? tool;

  /** 单次调用的 cwd：调用方给的优先，其次客户端默认的，都没有就不传（继承进程 cwd）。 */
  const cwdOf = (execOptions) => execOptions?.cwd ?? defaultCwd ?? undefined;

  return {
    /** 实际会被调用的可执行文件名（可能是绝对路径）。 */
    binOf,

    /** 客户端级默认工作目录（`null` = 继承宿主进程 cwd）。 */
    cwd: defaultCwd,

    /** 链式参数原样透传：不做任何解释。 */
    async exec(tool, args, execOptions = {}) {
      return run(binOf(tool), args, { ...execOptions, cwd: cwdOf(execOptions) });
    },

    /**
     * 探测工具是否存在 + 版本。
     * 缺工具返回 `{ available:false, reason:'not-found' }`，**不抛异常**。
     */
    async version(tool) {
      const result = await run(binOf(tool), ['-version']);
      if (result.spawnError && MISSING_TOOL_CODES.has(result.spawnError)) {
        return { available: false, version: null, reason: 'not-found', detail: result.spawnError };
      }
      if (result.code !== 0) {
        return {
          available: false,
          version: null,
          reason: 'error',
          detail: String(result.stderr ?? '').trim().slice(0, 400) || `exit ${result.code}`,
        };
      }
      return { available: true, version: parseVersion(result.stdout), reason: null, detail: null };
    },

    /**
     * ffprobe 探测单个媒体文件。
     *
     * @param {string} file 待探测的文件（相对路径按 cwd 解析）
     * @param {object} [options]
     * @param {string} [options.cwd] 本次探测的工作目录（优先于客户端默认 cwd）
     */
    async probe(file, options = {}) {
      const result = await run(binOf(FFPROBE), [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        file,
      ], { ...options, cwd: cwdOf(options) });
      if (result.spawnError && MISSING_TOOL_CODES.has(result.spawnError)) {
        /** @type {FfmpegError} */
        const err = new Error(`ffprobe 不可用：${result.spawnError}`);
        err.code = 'FFPROBE_MISSING';
        throw err;
      }
      if (result.code !== 0) {
        /** @type {FfmpegError} */
        const err = new Error(`ffprobe 失败（${file}）：${String(result.stderr ?? '').trim() || `exit ${result.code}`}`);
        err.code = 'FFPROBE_FAILED';
        throw err;
      }
      let data;
      try {
        data = JSON.parse(result.stdout);
      } catch {
        /** @type {FfmpegError} */
        const err = new Error(`ffprobe 输出无法解析（${file}）`);
        err.code = 'FFPROBE_BAD_OUTPUT';
        throw err;
      }
      return normalizeProbe(data, file);
    },
  };
}

/** 把 ffprobe 的 JSON 归一成我们只关心的字段。 */
export function normalizeProbe(data, file) {
  const streams = Array.isArray(data?.streams) ? data.streams : [];
  const video = streams.find((s) => s?.codec_type === 'video');
  const audio = streams.find((s) => s?.codec_type === 'audio');
  const durationSec = Number(data?.format?.duration ?? video?.duration ?? 0) || 0;
  return {
    file,
    width: Number(video?.width ?? 0) || 0,
    height: Number(video?.height ?? 0) || 0,
    fps: parseRatio(video?.avg_frame_rate) ?? parseRatio(video?.r_frame_rate) ?? 0,
    pixFmt: video?.pix_fmt ?? null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    hasAudio: Boolean(audio),
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    bitrate: Number(data?.format?.bit_rate ?? 0) || 0,
  };
}

/**
 * 批量探测；单个文件失败不吞——错误里带文件名。
 * @param {object} client
 * @param {string[]} [files]
 * @param {object} [options] 透传给 `client.probe`（例如 `{ cwd }`）
 */
export async function probeAll(client, files = [], options = {}) {
  const probes = [];
  for (const file of files) {
    probes.push(await client.probe(file, options));
  }
  return probes;
}

/**
 * 探测 ffmpeg / ffprobe 两个工具的可用性。
 * @returns {Promise<{ffmpeg: ToolAvailability, ffprobe: ToolAvailability, available: boolean, missing: string[]}>}
 */
export async function probeTools(client) {
  const ffmpeg = await client.version(FFMPEG);
  const ffprobe = await client.version(FFPROBE);
  const missing = [];
  if (!ffmpeg.available) missing.push(FFMPEG);
  if (!ffprobe.available) missing.push(FFPROBE);
  return { ffmpeg, ffprobe, available: missing.length === 0, missing };
}
