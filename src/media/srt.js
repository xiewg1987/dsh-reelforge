/**
 * 台词 → SRT（设计方案 §9.1 第 5 步 / §9.2 字幕交付物）。
 *
 * 两条硬纪律：
 *
 *  1. **烧录前必须去掉角色名前缀**——台词写的是「小夏：那一夜…」，
 *     成片字幕只显示「那一夜…」。这里在**生成 SRT 时就剥掉**，
 *     交付的 `.srt` 与烧录用的字幕流是同一份，不会出现「.srt 有前缀、成片没有」的对不上。
 *  2. **时间轴由分镜时长推**——不引入额外的音轨对齐数据源，
 *     镜时长就是字幕窗；一镜内同时有旁白与对白时按文本长度切分该窗。
 */

/** 角色名前缀里不允许出现的字符（出现即判定「不是角色名」）。 */
const PREFIX_FORBIDDEN = /[，,。.!！?？；;、（）()【】\[\]"“”'’\n\r]/;

/** 方括号式角色名：【旁白】 */
const BRACKET_SPEAKER_RE = /^【([^】]{1,12})】\s*/;

/** 冒号式角色名：小夏： */
const COLON_SPEAKER_RE = /^([^：:]{1,12})[：:]\s*/;

/** 角色名里出现这些字符时，判定为普通文本而非角色名（避免把 `https://…` 误剥）。 */
const PREFIX_LOOKS_LIKE_URL = /[./@\\]/;

/**
 * 纯 ASCII 的候选名：只有「首字母大写的单词」才算角色名。
 * 这样 `Alice: hi` 能剥，`https://example.com` 不会误剥。
 */
const ASCII_SPEAKER_RE = /^[A-Z][A-Za-z' -]{0,11}$/;

/**
 * 拆出角色名与台词正文。
 * @param {string} text
 * @returns {{speaker: string|null, line: string}}
 */
export function splitSpeaker(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { speaker: null, line: '' };

  const bracket = raw.match(BRACKET_SPEAKER_RE);
  if (bracket) {
    const speaker = bracket[1].trim();
    const line = raw.slice(bracket[0].length).trim();
    return line ? { speaker, line } : { speaker: null, line: raw };
  }

  const colon = raw.match(COLON_SPEAKER_RE);
  if (colon) {
    const candidate = colon[1].trim();
    const line = raw.slice(colon[0].length).trim();
    const asciiOnly = !/[^\x00-\x7F]/.test(candidate);
    const usable =
      candidate.length > 0 &&
      candidate.length <= 12 &&
      !PREFIX_FORBIDDEN.test(candidate) &&
      !PREFIX_LOOKS_LIKE_URL.test(candidate) &&
      (!asciiOnly || ASCII_SPEAKER_RE.test(candidate));
    if (usable && line) return { speaker: candidate, line };
  }
  return { speaker: null, line: raw };
}

/**
 * 去掉角色名前缀（「小夏：那一夜…」→「那一夜…」）。
 * 判定不出角色名时**原样返回**——宁可留前缀，也不误删正文。
 */
export function stripSpeakerPrefix(text) {
  return splitSpeaker(text).line;
}

/** SRT 时间戳：`HH:MM:SS,mmm` */
export function formatSrtTimestamp(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0));
  const millis = total % 1000;
  const totalSeconds = Math.floor(total / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** 按标点优先断行；超长时不丢字（剩余内容并进最后一行）。 */
export function wrapSubtitle(text, options = {}) {
  const maxChars = options.maxChars ?? 22;
  const maxLines = options.maxLines ?? 2;
  const clean = String(text ?? '').replace(/\s*\r?\n+\s*/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

  const lines = [];
  let rest = clean;
  while (rest.length > maxChars && lines.length < maxLines - 1) {
    let cut = -1;
    for (let i = maxChars; i > Math.floor(maxChars / 2); i -= 1) {
      if (/[，。！？、；：,.!?;:\s]/.test(rest[i - 1])) {
        cut = i;
        break;
      }
    }
    if (cut === -1) cut = maxChars;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) lines.push(rest);
  return lines.join('\n');
}

/**
 * 分镜时长 → 镜级时间轴。
 * @param {Array<{id?:string, idx?:number, duration?:number}>} shots
 * @returns {Array<{shotId: string, idx: number, startMs: number, endMs: number, durationMs: number}>}
 */
export function buildShotTimeline(shots = [], options = {}) {
  const startAtMs = options.startAtMs ?? 0;
  const defaultDuration = options.defaultDurationSec ?? 5;
  const ordered = [...shots].sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0));
  let cursor = startAtMs;
  const timeline = [];
  ordered.forEach((shot, index) => {
    const seconds = Number(shot?.duration);
    const durationMs = Math.round(
      (Number.isFinite(seconds) && seconds > 0 ? seconds : defaultDuration) * 1000,
    );
    timeline.push({
      shotId: shot?.id ?? `shot_${index + 1}`,
      idx: Number(shot?.idx ?? index + 1),
      startMs: cursor,
      endMs: cursor + durationMs,
      durationMs,
    });
    cursor += durationMs;
  });
  return timeline;
}

/**
 * 把一镜的窗口按文本长度切给旁白 / 对白。
 * 窗口太小时按比例分配（不强行最小值），否则台词会被挤成 0 毫秒。
 */
function splitWindow(startMs, endMs, weights, minMs = 800) {
  const total = endMs - startMs;
  const sum = weights.reduce((acc, w) => acc + Math.max(1, w), 0);
  if (total < minMs * weights.length) {
    let cursor = startMs;
    return weights.map((w) => {
      const span = Math.round((total * Math.max(1, w)) / sum);
      const item = { startMs: cursor, endMs: cursor + span };
      cursor += span;
      return item;
    });
  }
  let cursor = startMs;
  return weights.map((w) => {
    const span = Math.max(minMs, Math.round((total * Math.max(1, w)) / sum));
    const item = { startMs: cursor, endMs: Math.min(endMs, cursor + span) };
    cursor = item.endMs;
    return item;
  });
}

/**
 * 分镜 → SRT 文本 + 字幕条目。
 *
 * @param {Array} shots 分镜数组，每项 `{ id, idx, duration, dialogue, narration }`
 * @param {object} [options]
 * @param {number} [options.startAtMs=0]
 * @param {number} [options.maxChars=22]
 * @returns {{srt: string, cues: Array<{index:number, startMs:number, endMs:number, text:string, speaker:string|null, shotId:string}>}}
 */
export function buildSrt(shots = [], options = {}) {
  const maxChars = options.maxChars ?? 22;
  const ordered = [...shots].sort((a, b) => Number(a?.idx ?? 0) - Number(b?.idx ?? 0));
  const timeline = buildShotTimeline(ordered, options);
  const cues = [];
  let index = 0;

  for (let i = 0; i < ordered.length; i += 1) {
    const shot = ordered[i];
    const slot = timeline[i];
    if (!shot || !slot) continue;

    const narration = String(shot.narration ?? '').trim();
    const dialogue = String(shot.dialogue ?? '').trim();
    const parts = [];
    if (narration) {
      const split = splitSpeaker(narration);
      parts.push({ kind: 'narration', speaker: split.speaker, text: split.line });
    }
    if (dialogue) {
      const split = splitSpeaker(dialogue);
      parts.push({ kind: 'dialogue', speaker: split.speaker, text: split.line });
    }
    if (parts.length === 0) continue;

    const weights = parts.map((p) => p.text.length);
    const windows = splitWindow(slot.startMs, slot.endMs, weights);

    parts.forEach((part, i) => {
      const text = wrapSubtitle(part.text, { maxChars });
      if (!text) return;
      index += 1;
      cues.push({
        index,
        startMs: windows[i].startMs,
        endMs: windows[i].endMs,
        text,
        speaker: part.speaker,
        shotId: slot.shotId,
        kind: part.kind,
      });
    });
  }

  const srt = cues
    .map(
      (cue) =>
        `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}\n`,
    )
    .join('\n');

  return { srt, cues };
}
