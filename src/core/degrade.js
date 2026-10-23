/**
 * 降级矩阵：7 种缺失的判定与**具体话术**（设计方案 §9.3 / 任务书 §2.3）。
 *
 * 通用原则（§9.3 原文）：
 *
 * - 宁可交付「不完整但诚实」的结果并说清缺什么，**也不要用占位物假装成功**。
 * - **软依赖缺失也要说出来**（音色缺失、参考音被截断）——
 *   upstream（infinite-creation）那边是静默降质的，ReelForge 要在界面上显式化。
 * - 降级文案里**不写「已完成」**：一律写「已用占位帧占位」「本机缺 ffmpeg，未能出成片」…
 *
 * 本模块是**纯逻辑**：判定输入 → 降级条目 + 话术文本，**不碰 ctx、不碰文件**。
 * 话术由调用方（宿主层）拼进对话文本与工具结果。
 */

import { DEGRADE_KINDS, VRAM_GATE_GB } from './constants.js';

/**
 * 7 种降级 kind。
 *
 * 枚举的唯一来源是 `src/core/constants.js`（F8）；这里只做**转出**，
 * 保持本文件原有引用方式可用。
 */
export { DEGRADE_KINDS };

/** 降级后的产出形态。 */
export const DEGRADE_OUTPUTS = Object.freeze({
  /** 成片：没有成片。 */
  videoNone: 'none',
  /** 成片：纯文字卡代替画面。 */
  videoTextCard: 'text_card',
  /** 成片：占位帧代替失败镜。 */
  videoPlaceholder: 'placeholder',
  /** 成片：出了，但缺参考音（静音）。 */
  videoSilent: 'silent',
  /** 参考图包：齐全。 */
  packFull: 'full',
  /** 参考图包：文字卡代替参考图。 */
  packTextCard: 'text_card',
  /** 参考图包：标缺（部分条目缺失）。 */
  packPartial: 'partial',
  /** 参考图包：没有。 */
  packNone: 'none',
});

/**
 * 产出形态的「降级程度」排序——合并多个降级时取**最差**的那个。
 * 数值越小越差。
 */
const VIDEO_RANK = Object.freeze({
  [DEGRADE_OUTPUTS.videoNone]: 0,
  [DEGRADE_OUTPUTS.videoTextCard]: 1,
  [DEGRADE_OUTPUTS.videoPlaceholder]: 2,
  [DEGRADE_OUTPUTS.videoSilent]: 3,
});

const PACK_RANK = Object.freeze({
  [DEGRADE_OUTPUTS.packNone]: 0,
  [DEGRADE_OUTPUTS.packTextCard]: 1,
  [DEGRADE_OUTPUTS.packPartial]: 2,
  [DEGRADE_OUTPUTS.packFull]: 3,
});

/** 话术里**禁止**出现的说法：降级时写「已完成」等于假装成功。 */
export const FORBIDDEN_COMPLETION_WORDS = Object.freeze(['已完成']);

/**
 * 话术里是否混进了「假装完成」的说法。
 * @param {string} message
 */
export function hasFalseCompletionClaim(message) {
  const text = String(message ?? '');
  return FORBIDDEN_COMPLETION_WORDS.some((word) => text.includes(word));
}

/** 把「镜号列表」格式化成 `4、7`（升序、去重）。 */
export function formatShotNumbers(list = []) {
  const seen = new Set();
  const numbers = [];
  for (const item of list) {
    const n = Number(item?.idx ?? item);
    if (!Number.isFinite(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    numbers.push(n);
  }
  return numbers.sort((a, b) => a - b).map((n) => String(n)).join('、');
}

/** 把角色名列表归一成 `{ name, reason }`。 */
function normalizeVoices(missingVoices) {
  if (!missingVoices) return [];
  const list = Array.isArray(missingVoices) ? missingVoices : [missingVoices];
  return list
    .map((item) => {
      if (typeof item === 'string') return { name: item.trim(), reason: null };
      const name = String(item?.name ?? item?.character ?? '').trim();
      if (!name) return null;
      return { name, reason: item?.reason ? String(item.reason) : null };
    })
    .filter(Boolean);
}

/** 把「布尔或带原因的对象」归一成 `{ down: boolean, reason }`。 */
function normalizeFlag(value) {
  if (value && typeof value === 'object') {
    return { down: true, reason: value.reason ? String(value.reason) : null };
  }
  return { down: value === true, reason: null };
}

/**
 * 判定降级。
 *
 * @param {object} input
 * @param {boolean|{reason?:string}} [input.videoProviderDown] 视频 provider 全挂
 * @param {boolean|{reason?:string}} [input.imageProviderDown] 图像 provider 挂
 * @param {Array<string|{name:string,reason?:string}>} [input.missingVoices] 音色缺失
 * @param {boolean} [input.ffmpegAvailable=true] 本机有没有 ffmpeg
 * @param {string} [input.ffmpegReason] 缺 ffmpeg 的原因（写进降级话术的 `details`）
 * @param {Array<number|{idx:number}>} [input.failedShots] 失败镜号
 * @param {number|null} [input.vramGb] 本机显存（GB）
 * @param {number} [input.vramRequiredGb] 门槛（默认取 constants 的 `VRAM_GATE_GB.video`）
 * @param {boolean} [input.modelChannelReachable=true] 模型通道是否可达
 * @returns {Array<{kind:string, outputs:{video:string,storyboard:boolean,referencePack:string}, message:string, details:object}>}
 */
export function detectDegradations(input = {}) {
  const degradations = [];

  const video = normalizeFlag(input.videoProviderDown);
  if (video.down) {
    const reason = video.reason || '视频 provider 全部失败';
    degradations.push({
      kind: DEGRADE_KINDS.videoProviderDown,
      outputs: {
        video: DEGRADE_OUTPUTS.videoNone,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packFull,
      },
      message: `未生成视频：${reason}。已交付分镜与提示词，可在别处生成后回来合成`,
      details: { reason },
    });
  }

  const image = normalizeFlag(input.imageProviderDown);
  if (image.down) {
    const reason = image.reason || '图像 provider 不可用';
    degradations.push({
      kind: DEGRADE_KINDS.imageProviderDown,
      outputs: {
        video: DEGRADE_OUTPUTS.videoTextCard,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packTextCard,
      },
      message: `参考图不可用，已用文字卡占位。视频阶段硬依赖参考图，本次未能跑视频阶段（原因：${reason}）`,
      details: { reason, hardDependency: 'image' },
    });
  }

  for (const voice of normalizeVoices(input.missingVoices)) {
    degradations.push({
      kind: DEGRADE_KINDS.voiceMissing,
      outputs: {
        video: DEGRADE_OUTPUTS.videoSilent,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packFull,
      },
      message: `${voice.name} 的参考音不可用，该镜声音已缺失`,
      details: { name: voice.name, reason: voice.reason, softDependency: 'tts' },
    });
  }

  if (input.ffmpegAvailable === false) {
    degradations.push({
      kind: DEGRADE_KINDS.ffmpegMissing,
      outputs: {
        video: DEGRADE_OUTPUTS.videoNone,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packFull,
      },
      message: '本机缺 ffmpeg，未能出成片；附拼接命令',
      details: { reason: input.ffmpegReason ?? null },
    });
  }

  const failed = Array.isArray(input.failedShots) ? input.failedShots : [];
  const failedNumbers = formatShotNumbers(failed);
  if (failedNumbers) {
    degradations.push({
      kind: DEGRADE_KINDS.partialShotFailed,
      outputs: {
        video: DEGRADE_OUTPUTS.videoPlaceholder,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packPartial,
      },
      message: `第 ${failedNumbers} 镜生成失败，已用占位帧占位`,
      details: { shots: failedNumbers.split('、').map(Number) },
    });
  }

  const requiredGb = Number.isFinite(input.vramRequiredGb)
    ? Number(input.vramRequiredGb)
    : VRAM_GATE_GB.video;
  const vramGb = Number.isFinite(input.vramGb) ? Number(input.vramGb) : null;
  if (vramGb !== null && vramGb < requiredGb) {
    degradations.push({
      kind: DEGRADE_KINDS.vramInsufficient,
      outputs: {
        video: DEGRADE_OUTPUTS.videoNone,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packFull,
      },
      message: `显存不足 ${requiredGb}GB，本机跑不动视频阶段；已交付分镜与参考图`,
      details: { vramGb, requiredGb },
    });
  }

  if (input.modelChannelReachable === false) {
    degradations.push({
      kind: DEGRADE_KINDS.modelChannelUnreachable,
      outputs: {
        video: DEGRADE_OUTPUTS.videoNone,
        storyboard: true,
        referencePack: DEGRADE_OUTPUTS.packNone,
      },
      message: '模型通道不可达，本次只产出分镜',
      details: {},
    });
  }

  return degradations;
}

/**
 * 合并多个降级的产出矩阵——**取最差**。
 * @param {Array} degradations
 * @returns {{video: string, storyboard: boolean, referencePack: string}}
 */
export function resolveOutputs(degradations = []) {
  let video = null;
  let pack = null;
  let storyboard = true;
  for (const item of degradations) {
    const outputs = item?.outputs ?? {};
    if (outputs.video != null) {
      if (video === null || VIDEO_RANK[outputs.video] < VIDEO_RANK[video]) video = outputs.video;
    }
    if (outputs.referencePack != null) {
      if (pack === null || PACK_RANK[outputs.referencePack] < PACK_RANK[pack]) pack = outputs.referencePack;
    }
    if (outputs.storyboard === false) storyboard = false;
  }
  return {
    video: video ?? null,
    storyboard,
    referencePack: pack ?? null,
  };
}

/**
 * 降级话术文本列表——宿主层直接拼进对话文本 / 工具结果。
 * @param {Array} degradations
 * @returns {string[]}
 */
export function degradeNotices(degradations = []) {
  return degradations.map((item) => item.message).filter(Boolean);
}

/**
 * 一次给全：判定 → 降级条目 + 产出矩阵 + 话术。
 * @param {object} input 见 {@link detectDegradations}
 */
export function evaluateDegradation(input = {}) {
  const degradations = detectDegradations(input);
  return {
    degradations,
    outputs: resolveOutputs(degradations),
    notices: degradeNotices(degradations),
  };
}
