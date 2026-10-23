/**
 * 分镜 schema 与业务校验（§6.1 / §6.5 / §7.2）——纯逻辑，可单测。
 *
 * 这一层回答的是「一条分镜**能不能写进库**」，不是「能不能渲染」。
 * 校验必须发生在**写入口**（门禁），不能拖到渲染前——否则错误离写入点太远，
 * 用户写完一整章才被告知第 3 镜超速。
 */
import {
  MAX_SPEAKERS_PER_SHOT,
  SHOT_DIALOGUE_MAX_RATE,
  SHOT_DURATION_DEFAULT,
  SHOT_DURATION_MAX,
  SHOT_DURATION_MIN,
} from './constants.js';

/** 台词行里的「说话人：」前缀，形如 `小夏：那一夜…`。 */
const SPEAKER_PREFIX_RE = /^\s*([^：:\n]{1,24})\s*[：:]/;

/**
 * 取出台词里的说话人列表（保持出现顺序，去重）。
 *
 * 台词可以是字符串（多行）或 `{ speaker, text }` 数组，两种都支持。
 *
 * @param {unknown} dialogue 台词。
 * @returns {string[]} 说话人名。
 */
export function collectSpeakers(dialogue) {
  const speakers = [];
  const push = (name) => {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) return;
    if (!speakers.includes(trimmed)) speakers.push(trimmed);
  };

  if (typeof dialogue === 'string') {
    for (const line of dialogue.split(/\r?\n/)) {
      const match = SPEAKER_PREFIX_RE.exec(line);
      if (match) push(match[1]);
    }
    return speakers;
  }

  if (Array.isArray(dialogue)) {
    for (const entry of dialogue) {
      if (typeof entry === 'string') {
        for (const line of entry.split(/\r?\n/)) {
          const match = SPEAKER_PREFIX_RE.exec(line);
          if (match) push(match[1]);
        }
        continue;
      }
      if (entry && typeof entry === 'object') {
        push(entry.speaker ?? entry.name);
      }
    }
  }
  return speakers;
}

/**
 * 台词总字数（不含说话人前缀与空白）。
 *
 * @param {unknown} dialogue 台词。
 * @returns {number} 字数。
 */
export function countDialogueChars(dialogue) {
  if (typeof dialogue === 'string') {
    return dialogue
      .split(/\r?\n/)
      .map((line) => line.replace(SPEAKER_PREFIX_RE, ''))
      .join('')
      .replace(/\s/g, '').length;
  }
  if (Array.isArray(dialogue)) {
    return dialogue.reduce((sum, entry) => {
      if (typeof entry === 'string') return sum + countDialogueChars(entry);
      if (entry && typeof entry === 'object') {
        const text = typeof entry.text === 'string' ? entry.text : '';
        return sum + text.replace(/\s/g, '').length;
      }
      return sum;
    }, 0);
  }
  return 0;
}

/**
 * 校验一条分镜。
 *
 * @param {object} shot 分镜（内容字段）。
 * @param {{ chapterShots?: readonly object[], skipDialogueRate?: boolean }} [context]
 *   `chapterShots` = 同章已有分镜（idx 唯一性）；
 *   `skipDialogueRate` = 只改无关字段时跳过对白速率检查——
 *   拿库里的旧台词重算，会把历史超速台词变成整行不可编辑（§6.5 要点 6）。
 * @returns {{ ok: boolean, errors: string[] }} 校验结果；`errors` 为空即通过。
 */
export function validateShot(shot, context = {}) {
  const errors = [];
  const chapterShots = context.chapterShots ?? [];
  const skipDialogueRate = context.skipDialogueRate === true;

  if (!shot || typeof shot !== 'object') {
    return { ok: false, errors: ['分镜必须是对象'] };
  }

  // ── idx：章内唯一且 ≥1 ──
  if (shot.idx === undefined) {
    errors.push('idx 缺失（新建分镜必须提供）');
  } else if (!Number.isInteger(shot.idx)) {
    errors.push('idx 必须是整数');
  } else if (shot.idx < 1) {
    errors.push(`idx 必须 ≥1，收到 ${shot.idx}`);
  } else {
    const duplicated = chapterShots.some((other) => other.idx === shot.idx && other !== shot);
    if (duplicated) errors.push(`idx ${shot.idx} 在本章内重复`);
  }

  // ── duration：1..15，缺省 5 ──
  const duration = shot.duration ?? SHOT_DURATION_DEFAULT;
  if (typeof duration !== 'number' || !Number.isFinite(duration)) {
    errors.push('duration 必须是数字');
  } else if (duration < SHOT_DURATION_MIN || duration > SHOT_DURATION_MAX) {
    errors.push(`duration 必须在 ${SHOT_DURATION_MIN}..${SHOT_DURATION_MAX} 秒之间，收到 ${duration}`);
  }

  // ── 对白速率：字数 / 时长 ≤ 5.5 字每秒 ──
  const chars = countDialogueChars(shot.dialogue);
  if (!skipDialogueRate && chars > 0 && typeof duration === 'number' && duration > 0) {
    const rate = chars / duration;
    if (rate > SHOT_DIALOGUE_MAX_RATE) {
      errors.push(
        `对白 ${chars} 字 / ${duration}s = ${rate.toFixed(2)} 字每秒，超过上限 ${SHOT_DIALOGUE_MAX_RATE}`,
      );
    }
  }

  // ── 说话人数：≤2 ──
  const speakers = collectSpeakers(shot.dialogue);
  if (speakers.length > MAX_SPEAKERS_PER_SHOT) {
    errors.push(`一镜最多 ${MAX_SPEAKERS_PER_SHOT} 个说话人，收到 ${speakers.length}：${speakers.join('、')}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 校验整章分镜（逐条 + idx 唯一性）。
 *
 * @param {readonly object[]} shots 分镜数组。
 * @returns {{ ok: boolean, errors: string[] }} 校验结果。
 */
export function validateChapterShots(shots) {
  const errors = [];
  if (!Array.isArray(shots)) {
    return { ok: false, errors: ['分镜必须是数组'] };
  }
  shots.forEach((shot, index) => {
    const result = validateShot(shot, { chapterShots: shots.slice(0, index) });
    for (const error of result.errors) {
      errors.push(`第 ${index + 1} 条分镜：${error}`);
    }
  });
  return { ok: errors.length === 0, errors };
}
