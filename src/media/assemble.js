/**
 * 片段 → 成片 + 字幕烧录（设计方案 §9.1 / 任务书 §2.1）。
 *
 * **按章合成，一章一条成片**。六步：
 *
 *  1. **探测**每个片段（分辨率 / 帧率 / 时长 / 音轨）→ 找出不一致项。
 *  2. **归一**：统一到目标分辨率（9:16 → 1080×1920）、帧率、像素格式 `yuv420p`、采样率。
 *  3. **拼接**：concat demuxer（片段参数已归一时）或 filter_complex（需转场 / 补帧时）。
 *  4. **音轨**：H3 原生音轨 → 直接用；TTS 叠加 → 按分镜时间轴对齐；
 *     BGM → `amix` 混音 + `loudnorm` 归一化 + ducking。
 *  5. **字幕**：按台词 / 旁白生成 SRT，按 `enable_subtitles` 决定是否烧录，
 *     **同时保留不烧录的一版**；烧录时**自动去掉角色名前缀**（在 `srt.js` 生成时就剥掉）。
 *  6. **输出**：`H.264` + `AAC` / 24fps / `yuv420p` / `+faststart`。
 *
 * ## 「无字幕版必须重封装，不重渲」
 *
 * 归一后的片段 → concat 得到 **master**（一次编码）。
 * 然后：
 *
 * - 无字幕版 = master 的 **stream copy**（`-c copy`，不重渲）
 * - 带字幕版 = master **烧录字幕**（必须重新编码画面，这是烧录的本质）
 *
 * ## 「路径必须有基准」
 *
 * 传给 ffmpeg 的路径全是**工作区相对路径**（`exports/ch01.mp4` / `.reelforge/tmp/...`），
 * 所以两件事必须成立：
 *
 * 1. **子进程 cwd = 工作区**——否则成片落到**宿主进程的启动目录**（`assembleChapter`
 *    会把 cwd 钉到 `options.cwd`，不给就从 `resolvePath` 反推）。
 * 2. **concat list 里的路径相对「list 文件所在目录」**——concat demuxer 是按
 *    list 所在目录解析相对路径的，不是按 cwd。
 *
 * ## 「产物必须有画面」
 *
 * ffmpeg 一旦显式 `-map` 就只保留被 map 的流。混音那一步如果只 map 音频，
 * 母版就没有画面，而后面的重封装与烧录会**继承**它并照样 exit 0
 * ⇒ 合成后必须**探测产物是否含视频流**，没有就当失败处理，绝不报成功。
 *
 * ## 降级
 *
 * 本机没有 ffmpeg 是**正常情况**（不是阻塞项）：
 * 此时不出成片，改为交付「分镜表 + 参考图包 + 可直接执行的拼接命令」，
 * 话术见 `src/core/degrade.js`。
 *
 * 本模块**不硬连** ffmpeg——客户端由构造参数注入（可替换成 fake 客户端做单测）。
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { DELIVERABLE_FILENAMES } from '../core/constants.js';
import { detectDegradations, resolveOutputs, degradeNotices } from '../core/degrade.js';
import { probeTools } from './ffmpeg.js';
import { buildSrt, buildShotTimeline } from './srt.js';

/**
 * 带 `code` 的错误（ffmpeg 子进程失败的分类码）。
 * @typedef {Error & { code?: string }} FfmpegError
 */

/**
 * 目标规格（画幅 / 帧率 / 像素格式 / 编码 / 采样率）。
 * @typedef {object} TargetSpec
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {string} pixFmt
 * @property {number} sampleRate
 * @property {string} videoCodec
 * @property {string} audioCodec
 */

/**
 * 章节信息（`{ id, seq, title }` + 章节级 BGM）。
 * @typedef {object} ChapterInfo
 * @property {string} [id]
 * @property {number|string} [seq]
 * @property {string} [title]
 * @property {string} [music_path] 章节 BGM 路径
 */

/**
 * 项目内容字段（合成时只读画幅与两个开关）。
 * @typedef {object} ProjectInfo
 * @property {number} [video_width]
 * @property {number} [video_height]
 * @property {string} [video_aspect_ratio]
 * @property {boolean} [enable_bgm]
 * @property {boolean} [enable_subtitles]
 */

/**
 * 分镜（合成 / 交付会用到的字段）。
 * @typedef {object} ShotInfo
 * @property {number} [idx]
 * @property {string} [id]
 * @property {number} [duration] 镜长（秒）
 * @property {string} [video_path]
 * @property {string} [audio_path]
 * @property {string} [tts_path]
 * @property {string} [shot_size]
 * @property {string} [size]
 * @property {string} [framing]
 * @property {string} [camera]
 * @property {string} [visual]
 * @property {string} [dialogue]
 * @property {string} [narration]
 * @property {string} [scene_name]
 * @property {string} [video_prompt]
 * @property {string} [image_prompt]
 * @property {Array<string|{path?: string, name?: string}>} [references]
 * @property {string[]} [character_ids]
 * @property {string[]} [costume_ids]
 * @property {string[]} [age_ids]
 * @property {string[]} [scene_ids]
 * @property {string[]} [prop_ids]
 */

/**
 * 资产（参考图包按 id 绑定参考图时用）。
 * @typedef {object} AssetInfo
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [image_path]
 */

/**
 * 字幕（`buildSrt()` 的结果）。
 * @typedef {object} SrtResult
 * @property {string} [srt] SRT 全文
 * @property {string} [text] SRT 全文（别名）
 * @property {Array<object>} [cues] 字幕条目
 */

/**
 * 文件 IO（宿主可注入别的实现）。
 * @typedef {object} FileIo
 * @property {(dir: string) => Promise<unknown>} mkdir
 * @property {(file: string, data: string|Buffer, encoding?: string) => Promise<unknown>} writeFile
 * @property {(file: string) => Promise<Buffer>} readFile
 * @property {(file: string) => Promise<{size: number}>} stat
 */

/**
 * ffmpeg 客户端（注入；单测用 fake 客户端）。
 * @typedef {object} FfmpegClient
 * @property {(tool: string, args: string[], execOptions?: {cwd?: string}) => Promise<{code: number, stdout: string, stderr: string}>} exec
 * @property {(file: string, options?: {cwd?: string}) => Promise<object>} probe
 * @property {(tool: string) => Promise<{available: boolean, version: string|null, reason: string|null, detail: string|null}>} version
 */

/**
 * 默认文件 IO（宿主可注入别的实现）。
 * @returns {FileIo}
 */
export function createDefaultIo() {
  return {
    mkdir: (dir) => fsp.mkdir(dir, { recursive: true }),
    writeFile: (file, data) => fsp.writeFile(file, data),
    readFile: (file) => fsp.readFile(file),
    stat: (file) => fsp.stat(file),
  };
}

/** 章节序号补零：`1` → `01`。 */
export function padSeq(seq) {
  const n = Number(seq);
  if (!Number.isFinite(n) || n <= 0) return '01';
  return String(Math.floor(n)).padStart(2, '0');
}

/**
 * 交付物路径（相对工作区根）。
 * 路径模板**只从 `constants.js` 取**（F8），本文件不另写一份。
 */
export function deliverablePath(kind, seq) {
  const template = DELIVERABLE_FILENAMES[kind];
  if (!template) return null;
  return `exports/${template.replace('{NN}', padSeq(seq))}`;
}

/** 没有单文件模板的交付物（目录型）。 */
export const DELIVERABLE_DIRS = Object.freeze({
  assets: 'assets',
  music_library: 'assets/music',
});

/** 目录型交付物的相对路径。 */
export function deliverableDir(kind) {
  return DELIVERABLE_DIRS[kind] ?? null;
}

/**
 * 画幅 → 像素尺寸。短边固定 1080，长边按比例取偶数。
 * `9:16` → `1080×1920`（竖版短剧的成片画幅）。
 */
export function dimensionsForAspect(ratio, shortSide = 1080) {
  const m = String(ratio ?? '').match(/^\s*(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)\s*$/);
  if (!m) return { width: shortSide, height: shortSide };
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!a || !b) return { width: shortSide, height: shortSide };
  const even = (n) => Math.max(2, Math.round(n / 2) * 2);
  if (a <= b) return { width: even(shortSide), height: even((shortSide * b) / a) };
  return { width: even((shortSide * a) / b), height: even(shortSide) };
}

/**
 * 目标规格。
 * 项目里显式给了 `video_width` / `video_height` 就用它，否则按画幅推。
 *
 * @param {ProjectInfo} [project] 项目内容字段
 * @returns {TargetSpec} 目标规格
 */
export function resolveTarget(project = {}) {
  const width = Number(project.video_width) || 0;
  const height = Number(project.video_height) || 0;
  const dims =
    width > 0 && height > 0
      ? { width, height }
      : dimensionsForAspect(project.video_aspect_ratio || '9:16');
  return {
    width: dims.width,
    height: dims.height,
    fps: 24,
    pixFmt: 'yuv420p',
    sampleRate: 48000,
    videoCodec: 'libx264',
    audioCodec: 'aac',
  };
}

/**
 * 找出片段之间的不一致项（探测阶段的产出）。
 * @param {Array} probes
 * @param {object} target
 */
export function findInconsistencies(probes = [], target = resolveTarget()) {
  const issues = [];
  for (const probe of probes) {
    if (!probe) continue;
    if (probe.width !== target.width || probe.height !== target.height) {
      issues.push({
        file: probe.file,
        field: 'resolution',
        expected: `${target.width}x${target.height}`,
        actual: `${probe.width}x${probe.height}`,
      });
    }
    if (Math.abs((probe.fps ?? 0) - target.fps) > 0.01) {
      issues.push({ file: probe.file, field: 'fps', expected: target.fps, actual: probe.fps });
    }
    if (probe.pixFmt !== target.pixFmt) {
      issues.push({ file: probe.file, field: 'pixFmt', expected: target.pixFmt, actual: probe.pixFmt });
    }
    if (!probe.hasAudio) {
      issues.push({ file: probe.file, field: 'audio', expected: 'aac', actual: 'none' });
    }
  }
  return issues;
}

/** ffmpeg 滤镜里的路径转义（Windows 的 `C:\...` 会把滤镜解析器搞崩）。 */
export function escapeFilterPath(filePath) {
  return String(filePath ?? '').replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/**
 * concat list 里某一条 `file` 的路径：**相对 list 文件所在目录**。
 *
 * ffmpeg 的 concat demuxer 把 list 里的相对路径按 **list 文件所在目录** 解析，
 * **不是**按进程 cwd。工作区相对路径（`.reelforge/tmp/ch01/seg_001.mp4`）会被
 * 拼成 `.reelforge/tmp/ch01/.reelforge/tmp/ch01/seg_001.mp4` → `Impossible to open`。
 *
 * 统一换算成「相对 list 目录」的路径，并统一用 **正斜杠**：
 * concat 的 `file '...'` 里反斜杠是**转义符**，Windows 绝对路径 `C:\...` 会被吃掉。
 *
 * @param {string} listFile concat list 文件路径
 * @param {string} target   被引用的文件路径
 * @returns {string} 相对 list 目录的路径（正斜杠）
 */
export function concatEntryPath(listFile, target) {
  const listDir = path.dirname(String(listFile ?? ''));
  const abs = String(target ?? '');
  let rel = abs;
  try {
    rel = path.relative(listDir, abs);
  } catch {
    rel = abs;
  }
  // 跨盘符时 `path.relative` 会退回绝对路径——那种情况下只能用绝对路径本身。
  if (!rel || path.isAbsolute(rel)) rel = abs;
  return rel.replace(/\\/g, '/');
}

/**
 * 从 `resolvePath` 反推**工作区根**（相对路径的解析基准）。
 *
 * `resolvePath` 的契约是「相对路径 → 工作区绝对路径」，而工作区根就是
 * 「相对路径的基准目录」——问一次 `resolvePath('.')` 就能拿到：
 * 宿主实现返回 `<root>/.`，测试实现返回 `<root>`，两者 `path.resolve` 后一致。
 *
 * @param {Function} resolvePath 相对路径 → 绝对路径
 * @returns {string|null} 工作区根；推不出来时返回 `null`（= 继承进程 cwd）
 */
export function inferWorkspaceRoot(resolvePath) {
  try {
    const resolved = path.resolve(String(resolvePath('.') ?? '.'));
    return resolved || null;
  } catch {
    return null;
  }
}

/**
 * 校验产物**确实含视频流**。
 *
 * ffmpeg 的规则：一旦显式 `-map`，就只保留被 map 的流。混音那一步一旦漏了
 * `-map 0:v`，母版就只剩音频——后面的重封装与烧录会**继承**这个「无画面」母版，
 * 而且**照样 exit 0**（`subtitles=` 滤镜在没有视频输入时也不报错）。
 * ⇒ 「静默产出无画面成片还报 ok:true」必须在这里被拦下来。
 *
 * @param {FfmpegClient} client ffmpeg 客户端
 * @param {string} file   产物路径
 * @param {object} [options]
 * @param {string} [options.cwd] 工作区 cwd
 * @returns {Promise<object>} 探测结果（含视频流时）
 * @throws {Error} `FFMPEG_NO_VIDEO_STREAM`——产物没有视频流，**不能算成片**
 */
export async function verifyVideoStream(client, file, options = {}) {
  const probe = await client.probe(file, options);
  if (!probe?.videoCodec) {
    /** @type {FfmpegError} */
    const error = new Error(
      `成片缺少视频流（只有音频），不能算成片：${file}`
      + `（实测：video=${probe?.videoCodec ?? 'none'}，audio=${probe?.audioCodec ?? 'none'}）`,
    );
    error.code = 'FFMPEG_NO_VIDEO_STREAM';
    throw error;
  }
  return probe;
}

/** 归一一个片段：缩放 + 补边 + 帧率 + 像素格式 + 音频参数。 */
export function planNormalizeClip({ input, output, target = resolveTarget(), hasAudio = true }) {
  const vf = [
    `scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease`,
    `pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2`,
    'setsar=1',
    `fps=${target.fps}`,
    `format=${target.pixFmt}`,
  ].join(',');
  const args = ['-y', '-i', input];
  let audioMap = '0:a?';
  if (!hasAudio) {
    // 补一条静音轨，保证所有片段都有音轨（否则 concat 会因参数不一致失败）
    args.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=${target.sampleRate}`);
    audioMap = '1:a';
  }
  args.push(
    '-vf', vf,
    '-map', '0:v',
    '-map', audioMap,
    '-r', String(target.fps),
    '-c:v', target.videoCodec,
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', target.pixFmt,
    '-c:a', target.audioCodec,
    '-ar', String(target.sampleRate),
    '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    output,
  );
  return args;
}

/** concat demuxer 拼接（片段已归一时用 `-c copy`，不重渲）。 */
export function planConcat({ listFile, output }) {
  return ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', output];
}

/**
 * 音轨混合：主音轨（H3 原生）+ TTS（按分镜时间轴对齐）+ BGM（amix + loudnorm + ducking）。
 * 画面走 `-map 0:v` + `-c:v copy`——混音**不重渲画面**，但**必须把画面带上**
 * （一旦显式 `-map` 就只保留被 map 的流，漏了 `-map 0:v` 画面就没了）。
 */
export function planAudioMix({
  master,
  ttsTracks = [],
  bgm = null,
  durationSec = null,
  output,
  target = resolveTarget(),
}) {
  const sr = target.sampleRate;
  const args = ['-y', '-i', master];
  const filters = [];
  const voiceLabels = [];

  filters.push(`[0:a]aresample=${sr},aformat=sample_fmts=fltp:channel_layouts=stereo[base]`);
  voiceLabels.push('[base]');

  ttsTracks.forEach((track, index) => {
    const inputIndex = index + 1;
    args.push('-i', track.path);
    const delay = Math.max(0, Math.round(track.delayMs ?? 0));
    const trimSec = Number.isFinite(track.trimSec) ? track.trimSec : null;
    const trim = trimSec ? `,atrim=0:${trimSec}` : '';
    filters.push(
      `[${inputIndex}:a]aresample=${sr},aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delay}|${delay}${trim}[tts${index}]`,
    );
    voiceLabels.push(`[tts${index}]`);
  });

  const voiceMix =
    voiceLabels.length > 1
      ? `${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:duration=first:dropout_transition=0[voice]`
      : '[base]';
  if (voiceLabels.length > 1) filters.push(voiceMix);
  else filters.push('[base]anull[voice]');

  if (bgm && bgm.path) {
    const bgmIndex = 1 + ttsTracks.length;
    args.push('-i', bgm.path);
    const bgmTrim = Number.isFinite(durationSec) ? `,atrim=0:${durationSec}` : '';
    filters.push(
      `[${bgmIndex}:a]aresample=${sr},aformat=sample_fmts=fltp:channel_layouts=stereo${bgmTrim},asetpts=N/SR/TB[bgmraw]`,
    );
    // ducking：BGM 为主信号，人声为侧链触发
    filters.push('[bgmraw][voice]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=250[bgmducked]');
    filters.push(
      "[voice][bgmducked]amix=inputs=2:duration=first:weights='1 0.35',loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
    );
  } else {
    filters.push('[voice]loudnorm=I=-16:TP=-1.5:LRA=11[aout]');
  }

  args.push(
    '-filter_complex', filters.join(';'),
    // ⚠️ **必须显式 map 视频流**：ffmpeg 的规则是「一旦显式 -map，就只保留被 map 的流」。
    //     只写 `-map [aout]` 会把画面丢掉 → 母版只剩音频，而后续的重封装与烧录
    //     **继承**这个无画面母版，还都 exit 0 ⇒ 静默产出一个「有声音的音频文件」。
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', target.audioCodec,
    '-ar', String(sr),
    '-ac', '2',
    '-movflags', '+faststart',
    output,
  );
  return args;
}

/**
 * 烧录字幕。**角色名前缀已在 SRT 生成时剥掉**，这里只负责压进画面。
 *
 * @param {object} options
 * @param {string} options.input 待烧录的母版路径
 * @param {string} options.srtPath 字幕文件路径
 * @param {string} options.output 产物路径
 * @param {TargetSpec} [options.target] 目标规格（默认 `resolveTarget()`）
 * @param {string} [options.style] ASS 样式串；不给用内置默认
 * @returns {string[]} ffmpeg 参数
 */
export function planBurnSubtitles({ input, srtPath, output, target = resolveTarget(), style }) {
  const forceStyle = style ?? 'FontName=Noto Sans SC,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=60,Alignment=2';
  const filter = `subtitles='${escapeFilterPath(srtPath)}':force_style='${forceStyle}'`;
  return [
    '-y', '-i', input,
    '-vf', filter,
    '-r', String(target.fps),
    '-c:v', target.videoCodec,
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', target.pixFmt,
    '-c:a', target.audioCodec,
    '-ar', String(target.sampleRate),
    '-movflags', '+faststart',
    output,
  ];
}

/**
 * 无字幕版：**重封装**（`-c copy`），不重渲。
 * 这是 §7 风险表第 1 条的正面解法。
 */
export function planRemux({ input, output }) {
  return ['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', output];
}

/**
 * 分镜表拼版（9×N 缩略图）。
 *
 * ## 「先 concat，再 tile」
 *
 * `tile` 滤镜**只吃一个输入**——它拼的是**同一个输入的多帧**，不是多个输入。
 * 把 N 张格子直接喂给它，ffmpeg 会报
 * `More input link labels than it has inputs: N > 1`。
 * ⇒ 先用 `concat=n=N:v=1:a=0` 把 N 张格子串成**一个多帧流**，再交给 `tile` 摆网格。
 *
 * `tile` 在 EOF 时会 flush 掉**没铺满的网格**（空格用 `color` 填），
 * 所以 N 不必凑满 `列 × 行`（2 张图走 `tile=9x1`，底下 7 格是底色）。
 *
 * ## 「颜色必须写成 0xRRGGBB」
 *
 * ffmpeg 的颜色解析器**不认三位缩写**（`#222`），只认 `0xRRGGBB`（或颜色名）——
 * `#222` 会让整条命令直接失败：`Invalid 0xRRGGBB[AA] color string: '222'`。
 * `#222` 想表达的就是 `#222222`（深灰：拼版底色 / 空格填充），这里**保持配色意图不变**，
 * 只把写法换成 ffmpeg 认的 `0x222222`。
 *
 * ## 「格子必须归一成同一套参数」
 *
 * `concat` 要求各输入的**链接参数完全一致**（尺寸 / SAR / 像素格式）。
 * `scale` 为了保住原图的显示比例，会给每张图算出**各自的 SAR**
 * （366×828 的图算出 `17324:17319`，1440×1920 的算出 `1281:1280`）
 * ⇒ 两张图比例不同时，`concat` 直接报
 * `Input link ... parameters do not match ...` → `Error reinitializing filters!`。
 * ⇒ 格子链末尾补 `setsar=1`（与 `planNormalizeClip` 同一套做法）：
 * 每个格子都是 **320×568 的方形像素**格，参数天然一致。
 *
 * ## 网格形状
 *
 * `列 × 行`，其中 `列 = columns`（默认 9）、`行 = ceil(N / 列)`（至少 1）。
 * ⇒ 拼版图宽度恒为 `9 × 格宽 + 8 × 内边距 + 2 × 外边距`（默认 2960px），
 * 高度随行数增长——「每行 9 格」是这张图的固定契约。
 *
 * @param {object} options
 * @param {string[]} options.images     参考图路径（每镜一张）
 * @param {string}   options.output     产物路径
 * @param {number}  [options.columns=9] 每行的格子数
 * @param {number}  [options.cellWidth=320]
 * @param {number}  [options.cellHeight=568]
 * @returns {string[]} ffmpeg 参数
 */
export function planContactSheet({ images = [], output, columns = 9, cellWidth = 320, cellHeight = 568 }) {
  const args = ['-y'];
  for (const image of images) args.push('-i', image);
  const parts = images.map(
    (_, index) =>
      `[${index}:v]scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=decrease,pad=${cellWidth}:${cellHeight}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[cell${index}]`,
  );
  const rows = Math.max(1, Math.ceil(images.length / columns));
  // N 张格子 → 一个多帧流（concat）→ 一张网格图（tile）。
  parts.push(
    `${images.map((_, index) => `[cell${index}]`).join('')}concat=n=${images.length}:v=1:a=0[cat]`,
  );
  parts.push(`[cat]tile=${columns}x${rows}:padding=8:margin=8:color=0x222222[out]`);
  args.push('-filter_complex', parts.join(';'), '-map', '[out]', '-frames:v', '1', '-q:v', '3', output);
  return args;
}

/**
 * 缺 ffmpeg 时给用户的**可执行拼接命令**。
 * @returns {{command: string, listContent: string, listFileName: string}}
 */
export function buildConcatCommand({ clips = [], output, listFileName = 'concat.txt', target = resolveTarget() }) {
  const listContent = clips.map((clip) => `file '${String(clip).replace(/'/g, "'\\''")}'`).join('\n');
  const safeList = listContent ? `${listContent}\n` : '';
  const command = [
    `ffmpeg -f concat -safe 0 -i "${listFileName}"`,
    `-c:v ${target.videoCodec}`,
    `-pix_fmt ${target.pixFmt}`,
    `-r ${target.fps}`,
    `-c:a ${target.audioCodec}`,
    `-ar ${target.sampleRate}`,
    '-movflags +faststart',
    `"${output}"`,
  ].join(' ');
  return { command, listContent: safeList, listFileName };
}

/** 章节里参与合成的片段（只取有视频文件的镜头）。 */
export function collectClips(shots = []) {
  const clips = [];
  const missing = [];
  for (const shot of shots) {
    const clipPath = shot?.video_path ?? null;
    if (clipPath) clips.push({ shot, path: clipPath });
    else missing.push({ shot, idx: shot?.idx ?? null });
  }
  return { clips, missing };
}

/**
 * 降级话术里**带上那条可执行拼接命令**。
 *
 * 「本机缺 ffmpeg，未能出成片；附拼接命令」这句话本身不含命令——
 * 命令只躺在结构化字段 `result.concatCommand` 里，**只透传 notices 的调用方拿不到**。
 * 所以把命令（和配套的 list 内容）直接写进话术文本。
 *
 * @param {object} concat `buildConcatCommand()` 的结果
 * @returns {string[]} 话术文本
 */
export function concatNotices(concat) {
  if (!concat?.command) return [];
  const notices = [`可执行拼接命令（缺 ffmpeg，拿到任意 ffmpeg 的机器上直接跑）：${concat.command}`];
  if (concat.listContent) {
    notices.push(
      `拼接清单内容（存成 ${concat.listFileName}，与上面的命令配套；路径相对该清单文件所在目录）：`
      + `\n${String(concat.listContent).trimEnd()}`,
    );
  }
  return notices;
}

/**
 * 合成一章。
 *
 * @param {object} options
 * @param {ChapterInfo} [options.chapter] `{ id, seq, title }`
 * @param {ShotInfo[]} [options.shots] 本章分镜
 * @param {ProjectInfo} [options.project] 项目内容字段（画幅 / 开关）
 * @param {FfmpegClient} [options.client] ffmpeg 客户端（注入）；不给则走「缺 ffmpeg」降级
 * @param {FileIo} [options.io] 文件 IO（注入）
 * @param {(p: string) => string} [options.resolvePath] 相对路径 → 绝对路径
 * @param {SrtResult} [options.srt] 字幕；不给则内部生成
 * @param {object} [options.degrades] 额外的降级输入（视频 provider 挂等）
 * @param {string} [options.tmpDir] 临时目录（默认 `.reelforge/tmp`）
 * @param {string} [options.exportsDir] 交付目录（默认 `exports`）
 * @param {AbortSignal} [options.signal] 取消信号：**真消费**——每步之前检查，
 *   并把信号透传给 ffmpeg 客户端，中止时杀掉正在跑的子进程。
 * @param {string} [options.cwd] 工作区目录（ffmpeg 子进程的 cwd）。
 *   不给就从 `resolvePath` 反推——**必须钉住**：传给 ffmpeg 的路径全是相对路径
 *   （`exports/ch01.mp4`），不钉 cwd 就等于把成片写进**宿主进程的启动目录**。
 * @returns {Promise<object>} 合成结果
 */
export async function assembleChapter(options = {}) {
  const {
    chapter = {},
    shots = [],
    project = {},
    client,
    io = createDefaultIo(),
    resolvePath = (p) => p,
    degrades = {},
    tmpDir = '.reelforge/tmp',
    exportsDir = 'exports',
    cwd = null,
    signal = null,
  } = options;

  const seq = Number(chapter.seq ?? 1);
  const target = resolveTarget(project);
  const timeline = buildShotTimeline(shots);
  const { clips, missing } = collectClips(shots);

  const srt = options.srt ?? buildSrt(shots);
  const srtPath = deliverablePath('srt', seq);

  /** ffmpeg / ffprobe 子进程的工作目录：显式 `cwd` 优先，否则从 `resolvePath` 反推。 */
  const ffmpegCwd = cwd ?? inferWorkspaceRoot(resolvePath);
  /** 每次调用 ffmpeg / ffprobe 都带上它——相对路径才有确定的解析基准。 */
  const execOptions = {
    ...(ffmpegCwd ? { cwd: ffmpegCwd } : {}),
    // 取消信号透传给 ffmpeg 客户端：中止时**杀掉正在跑的子进程**，
    // 而不是等它自己跑完（一章 24 镜的编码可能跑好几分钟）。
    ...(signal ? { signal } : {}),
  };

  /**
   * 取消检查：被中止就**立刻停**，并说清停在哪一步。
   *
   * 合成链和生成链（`src/workflows/*`）的取消语义必须一致——
   * 否则「我取消了」只对生成阶段有效，合成阶段照样把 CPU 烧完。
   *
   * @param {string} step 当前步骤名（写进错误消息）。
   * @throws {Error} `code = 'ABORTED'` 的取消错误。
   */
  const ensureNotAborted = (step) => {
    if (!signal?.aborted) return;
    /** @type {FfmpegError} */
    const error = new Error(`第 ${seq} 章合成已取消（停在「${step}」）：临时产物留在 ${tmpDir}/ch${padSeq(seq)}，可重新合成`);
    error.code = 'ABORTED';
    error.name = 'AbortError';
    throw error;
  };

  /**
   * ffmpeg 返回了非 0 时判定「这是被取消，不是失败」。
   *
   * @param {{code?: number, stderr?: string, spawnError?: string}} run ffmpeg 结果。
   * @param {string} step 当前步骤名。
   */
  const throwIfAborted = (run, step) => {
    if (run?.spawnError === 'ABORT_ERR' || signal?.aborted) ensureNotAborted(step);
  };

  const result = {
    ok: false,
    chapterId: chapter.id ?? null,
    title: chapter.title ?? null,
    seq,
    target,
    outputs: [],
    inconsistencies: [],
    commands: [],
    notices: [],
    degradations: [],
    masterPath: null,
    durationSec: timeline.reduce((sum, slot) => sum + slot.durationMs, 0) / 1000,
  };

  if (!client) {
    const degradations = detectDegradations({ ...degrades, ffmpegAvailable: false });
    const concat = buildConcatCommand({
      clips: clips.map((c) => c.path),
      output: deliverablePath('video_clean', seq),
      listFileName: `concat_ch${padSeq(seq)}.txt`,
      target,
    });
    result.degradations = degradations;
    result.notices = [...degradeNotices(degradations), ...concatNotices(concat)];
    result.outputMatrix = resolveOutputs(degradations);
    result.concatCommand = concat;
    result.failureReason = 'ffmpeg 不可用';
    return result;
  }

  const tools = await probeTools(client);
  if (!tools.ffmpeg.available) {
    const degradations = detectDegradations({ ...degrades, ffmpegAvailable: false });
    const concat = buildConcatCommand({
      clips: clips.map((c) => c.path),
      output: deliverablePath('video_clean', seq),
      listFileName: `concat_ch${padSeq(seq)}.txt`,
      target,
    });
    result.degradations = degradations;
    result.notices = [...degradeNotices(degradations), ...concatNotices(concat)];
    result.outputMatrix = resolveOutputs(degradations);
    result.concatCommand = concat;
    result.failureReason = 'ffmpeg 不可用';
    return result;
  }

  // 1. 探测
  ensureNotAborted('探测');
  const probes = [];
  for (const clip of clips) {
    probes.push(await client.probe(clip.path, execOptions));
  }
  result.inconsistencies = findInconsistencies(probes, target);

  // 2. 归一
  const tmpChapterDir = `${tmpDir}/ch${padSeq(seq)}`;
  await io.mkdir(resolvePath(tmpChapterDir));
  const normalized = [];
  for (let i = 0; i < clips.length; i += 1) {
    ensureNotAborted('归一');
    const probe = probes[i];
    const segPath = `${tmpChapterDir}/seg_${String(i + 1).padStart(3, '0')}.mp4`;
    const args = planNormalizeClip({
      input: clips[i].path,
      output: segPath,
      target,
      hasAudio: probe.hasAudio !== false,
    });
    const run = await client.exec('ffmpeg', args, execOptions);
    result.commands.push({ tool: 'ffmpeg', args, code: run.code });
    throwIfAborted(run, '归一');
    if (run.code !== 0) {
      /** @type {FfmpegError} */
      const error = new Error(`归一片段失败：${clips[i].path}\n${String(run.stderr ?? '').trim()}`);
      error.code = 'FFMPEG_NORMALIZE_FAILED';
      throw error;
    }
    normalized.push(segPath);
  }

  // 3. 拼接（片段参数已归一 → concat demuxer + stream copy）
  const listFile = `${tmpChapterDir}/concat.txt`;
  // ⚠️ list 里写**相对 list 文件所在目录**的路径（`seg_001.mp4`），
  //    不是工作区相对路径（`.reelforge/tmp/ch01/seg_001.mp4`）——
  //    concat demuxer 按 **list 所在目录** 解析相对路径，后者会被拼成
  //    `.reelforge/tmp/ch01/.reelforge/tmp/ch01/seg_001.mp4` → `Impossible to open`。
  await io.writeFile(
    resolvePath(listFile),
    normalized
      .map((p) => `file '${concatEntryPath(listFile, p).replace(/'/g, "'\\''")}'`)
      .join('\n') + (normalized.length ? '\n' : ''),
  );
  const masterPath = `${tmpChapterDir}/master.mp4`;
  const concatArgs = planConcat({ listFile, output: masterPath });
  ensureNotAborted('拼接');
  const concatRun = await client.exec('ffmpeg', concatArgs, execOptions);
  result.commands.push({ tool: 'ffmpeg', args: concatArgs, code: concatRun.code });
  throwIfAborted(concatRun, '拼接');
  if (concatRun.code !== 0) {
    /** @type {FfmpegError} */
    const error = new Error(`拼接失败\n${String(concatRun.stderr ?? '').trim()}`);
    error.code = 'FFMPEG_CONCAT_FAILED';
    throw error;
  }
  result.masterPath = masterPath;

  // 4. 音轨（TTS 按分镜时间轴对齐 + BGM 混音 / ducking）
  const orderedShots = [...shots].sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0));
  const ttsTracks = [];
  timeline.forEach((slot, index) => {
    const shot = orderedShots[index];
    const audioPath = shot?.audio_path ?? shot?.tts_path ?? null;
    if (!audioPath) return;
    ttsTracks.push({
      path: audioPath,
      delayMs: slot.startMs,
      trimSec: (slot.startMs + slot.durationMs) / 1000,
      shotId: slot.shotId,
      index,
    });
  });
  const bgmEnabled = project.enable_bgm !== false;
  const bgmPath = chapter.music_path ?? null;
  let mixedMaster = masterPath;
  if (ttsTracks.length > 0 || (bgmEnabled && bgmPath)) {
    const mixedPath = `${tmpChapterDir}/master_mixed.mp4`;
    const mixArgs = planAudioMix({
      master: masterPath,
      ttsTracks,
      bgm: bgmEnabled && bgmPath ? { path: bgmPath } : null,
      durationSec: result.durationSec,
      output: mixedPath,
      target,
    });
    ensureNotAborted('混音');
    const mixRun = await client.exec('ffmpeg', mixArgs, execOptions);
    result.commands.push({ tool: 'ffmpeg', args: mixArgs, code: mixRun.code });
    throwIfAborted(mixRun, '混音');
    if (mixRun.code !== 0) {
      /** @type {FfmpegError} */
      const error = new Error(`混音失败\n${String(mixRun.stderr ?? '').trim()}`);
      error.code = 'FFMPEG_MIX_FAILED';
      throw error;
    }
    mixedMaster = mixedPath;
  }

  // 4b. **母版校验**：必须确实含视频流。
  //     混音那一步一旦漏了 `-map 0:v`，母版就只剩音频——而重封装与烧录会继承它，
  //     还都 exit 0 ⇒ 静默产出「有声音的音频文件」还报 ok:true。
  //     这里必须**拦下来并说清**，绝不能当成成功。
  await verifyVideoStream(client, mixedMaster, execOptions);

  // 5. 字幕文件（enable_subtitles 关时**仍然交付 .srt**，只是不烧录）
  await io.mkdir(resolvePath(exportsDir));
  await io.writeFile(resolvePath(srtPath), srt.srt, 'utf8');
  result.outputs.push({ kind: 'srt', path: srtPath, bytes: Buffer.byteLength(srt.srt, 'utf8') });

  // 6. 无字幕版：**重封装，不重渲**
  const cleanPath = deliverablePath('video_clean', seq);
  const remuxArgs = planRemux({ input: mixedMaster, output: cleanPath });
  ensureNotAborted('重封装');
  const remuxRun = await client.exec('ffmpeg', remuxArgs, execOptions);
  result.commands.push({ tool: 'ffmpeg', args: remuxArgs, code: remuxRun.code });
  throwIfAborted(remuxRun, '重封装');
  if (remuxRun.code !== 0) {
    /** @type {FfmpegError} */
    const error = new Error(`重封装失败\n${String(remuxRun.stderr ?? '').trim()}`);
    error.code = 'FFMPEG_REMUX_FAILED';
    throw error;
  }
  await verifyVideoStream(client, cleanPath, execOptions);
  result.outputs.push({ kind: 'video_clean', path: cleanPath, bytes: null });

  // 7. 带字幕版：烧录（画面必须重新编码——这就是「烧录」）
  if (project.enable_subtitles !== false) {
    const subPath = deliverablePath('video_subtitled', seq);
    const burnArgs = planBurnSubtitles({ input: mixedMaster, srtPath, output: subPath, target });
    ensureNotAborted('字幕烧录');
    const burnRun = await client.exec('ffmpeg', burnArgs, execOptions);
    result.commands.push({ tool: 'ffmpeg', args: burnArgs, code: burnRun.code });
    throwIfAborted(burnRun, '字幕烧录');
    if (burnRun.code !== 0) {
      /** @type {FfmpegError} */
      const error = new Error(`字幕烧录失败\n${String(burnRun.stderr ?? '').trim()}`);
      error.code = 'FFMPEG_BURN_FAILED';
      throw error;
    }
    await verifyVideoStream(client, subPath, execOptions);
    result.outputs.push({ kind: 'video_subtitled', path: subPath, bytes: null });
  }

  const degradations = detectDegradations({
    ...degrades,
    ffmpegAvailable: true,
    failedShots: missing.map((m) => m.idx).filter((n) => Number.isFinite(n)),
  });
  result.degradations = degradations;
  result.notices = degradeNotices(degradations);
  result.ok = true;
  return result;
}
