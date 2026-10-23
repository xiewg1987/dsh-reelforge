/**
 * DSH 模型通道（云端 provider 之一，与 RunningHub / 在线 API 并列，不是「云端的一档」）。
 *
 * 设计 §8.5 已实测的能力：
 *   图像 `generate_image`（`requests[]`；`input_urls[]` 支持图生图）→ `node_id` → `get_asset_url`
 *   视频 `submit_video_generation` + `query_video_generation`（异步）
 *   配音 `synthesize_speech` / `batch_text_to_audio`（批量 ≤10）、`get_voice_list`
 *   音乐 `batch_text_to_music`（批量 ≤5）
 *
 * 三条**实测坑**必须落进实现：
 *   1. 只收 **HTTPS URL**，不收本地路径 / base64 → 本地文件先 `upload_temp_url`；
 *   2. 结果先拿 `node_id`，再用 `get_asset_url` 换下载链接——**不要自己拼 CDN URL**；
 *   3. **下载链接是临时的**（H3 视频保留 7 天）→ 返回值带 `ephemeral: true`，
 *      调用方**必须落盘到工作区**，别只存链接。
 *
 * **不硬连**：所有工具调用都走注入的 `call(toolName, args)`，
 * 单测用假连接器跑完整流程。
 */

import { GENERATION_KINDS } from '../core/constants.js';
import { outputFile } from './spec.js';

/** DSH 模型通道用到的连接器工具名。 */
export const DSH_TOOLS = Object.freeze({
  generateImage: 'generate_image',
  submitVideo: 'submit_video_generation',
  queryVideo: 'query_video_generation',
  synthesizeSpeech: 'synthesize_speech',
  batchTextToAudio: 'batch_text_to_audio',
  batchTextToMusic: 'batch_text_to_music',
  getVoiceList: 'get_voice_list',
  uploadTempUrl: 'upload_temp_url',
  getAssetUrl: 'get_asset_url',
});

/** kind → DSH 通道的能力入口。 */
export const DSH_KIND_TOOL = Object.freeze({
  t2i: DSH_TOOLS.generateImage,
  i2i: DSH_TOOLS.generateImage,
  r2v: DSH_TOOLS.submitVideo,
  tts: DSH_TOOLS.synthesizeSpeech,
  music: DSH_TOOLS.batchTextToMusic,
});

/** 视频查询接口的状态（设计 §8.5）。 */
export const DSH_VIDEO_STATUS = Object.freeze({
  queued: 'queued',
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
});

/**
 * 建一个 DSH 模型通道客户端。
 *
 * @param {object} options
 * @param {(tool: string, args: object) => Promise<any>} options.call  注入的连接器调用
 */
export function createDshMediaClient({ call } = {}) {
  if (typeof call !== 'function') {
    throw new Error('createDshMediaClient 需要注入 call(tool, args)');
  }
  return {
    call,
    generateImage: (requests) => call(DSH_TOOLS.generateImage, { requests }),
    submitVideo: (args) => call(DSH_TOOLS.submitVideo, args),
    queryVideo: (args) => call(DSH_TOOLS.queryVideo, args),
    synthesizeSpeech: (args) => call(DSH_TOOLS.synthesizeSpeech, args),
    batchTextToAudio: (args) => call(DSH_TOOLS.batchTextToAudio, args),
    batchTextToMusic: (args) => call(DSH_TOOLS.batchTextToMusic, args),
    getVoiceList: (args) => call(DSH_TOOLS.getVoiceList, args ?? {}),
    uploadTempUrl: (args) => call(DSH_TOOLS.uploadTempUrl, args),
    getAssetUrl: (args) => call(DSH_TOOLS.getAssetUrl, args),
  };
}

/**
 * 把本地路径换成临时 HTTPS URL（DSH 通道不收本地路径）。
 * @param {object} client
 * @param {string} path
 */
export async function toTempUrl(client, path) {
  const result = await client.uploadTempUrl({ file_path: path });
  const url = result?.url ?? result?.temp_url ?? result?.data?.url ?? null;
  if (!url) throw new Error(`upload_temp_url 没有返回可用链接（${path}）`);
  return String(url);
}

/**
 * 把 DSH 通道的请求参数整理成各工具的形状。
 *
 * @param {string} kind
 * @param {object} request  { prompt, negativePrompt, aspectRatio, resolution, duration, inputUrls, text, voiceDescription, caption, lyrics, maxDuration }
 * @returns {{ tool: string, args: object }}
 */
export function buildDshRequest(kind, request = {}) {
  if (!GENERATION_KINDS.includes(kind)) {
    throw new Error(`DSH 通道不支持 kind=${kind}`);
  }
  const prompt = request.prompt ?? request.videoPrompt ?? request.text ?? '';
  if (kind === 't2i' || kind === 'i2i') {
    const item = { prompt };
    if (request.aspectRatio) item.aspect_ratio = request.aspectRatio;
    if (request.resolution) item.resolution = request.resolution;
    if (kind === 'i2i') {
      item.input_urls = [...(request.inputUrls ?? [])];
      if (request.negativePrompt) item.negative_prompt = request.negativePrompt;
    }
    return { tool: DSH_TOOLS.generateImage, args: { requests: [item] } };
  }
  if (kind === 'r2v') {
    const args = { prompt };
    if (request.duration !== undefined) args.duration = request.duration;
    if (request.resolution) args.resolution = request.resolution;
    if (request.aspectRatio) args.aspect_ratio = request.aspectRatio;
    if (request.inputUrls?.length) args.input_urls = [...request.inputUrls];
    if (request.audioUrls?.length) args.audio_urls = [...request.audioUrls];
    return { tool: DSH_TOOLS.submitVideo, args };
  }
  if (kind === 'tts') {
    const args = { text: request.text ?? prompt };
    if (request.voiceDescription) args.voice_description = request.voiceDescription;
    if (request.voiceId) args.voice_id = request.voiceId;
    return { tool: DSH_TOOLS.synthesizeSpeech, args };
  }
  const args = { caption: request.caption ?? prompt };
  if (request.lyrics !== undefined) args.lyrics = request.lyrics;
  if (request.maxDuration !== undefined) args.max_duration = request.maxDuration;
  return { tool: DSH_TOOLS.batchTextToMusic, args };
}

/**
 * DSH 通道。
 *
 * 通道契约与 ComfyUI / RunningHub 一致：
 *   `generate({ kind, request, signal })` → `{ promptId, outputs[], raw }`
 *
 * @param {object} options
 * @param {object} options.client
 * @param {number} [options.pollMs]
 * @param {number} [options.maxWaitMs]
 */
export function createDshChannel({ client, pollMs = 3000, maxWaitMs } = {}) {
  if (!client) throw new Error('createDshChannel 需要 client');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function resolveAsset(nodeId) {
    if (!nodeId) return null;
    const result = await client.getAssetUrl({ node_id: nodeId });
    const url = result?.url ?? result?.download_url ?? result?.data?.url ?? null;
    // 下载链接是临时的 → 标出来，调用方必须落盘
    if (!url) return null;
    return { nodeId, file: outputFile({ url: String(url), ephemeral: true }) };
  }

  return {
    id: 'dsh',
    position: 'cloud',
    provider: 'dsh',
    client,

    async probe() {
      // DSH 通道的探活 = 工具目录可达
      await client.getVoiceList({});
      return { ok: true };
    },

    async generate({ kind, request, signal }) {
      const built = buildDshRequest(kind, request);
      const started = await client.call(built.tool, built.args);

      if (kind === 'r2v') {
        const taskId = started?.task_id ?? started?.taskId ?? started?.id ?? null;
        if (!taskId) throw new Error('DSH 视频提交没有返回 task_id');
        const deadline = Date.now() + (maxWaitMs ?? 120 * 60 * 1000);
        for (;;) {
          if (signal?.aborted) throw new Error('DSH 视频查询被取消');
          const record = await client.queryVideo({ task_id: taskId });
          const status = String(record?.status ?? '').toLowerCase();
          if (status === DSH_VIDEO_STATUS.succeeded) {
            const nodeId = record?.node_id ?? record?.output?.node_id ?? null;
            const asset = await resolveAsset(nodeId);
            return {
              promptId: String(taskId),
              outputs: asset
                ? [{ nodeId: asset.nodeId, classType: null, files: [asset.file] }]
                : [],
              raw: record,
            };
          }
          if (status === DSH_VIDEO_STATUS.failed) {
            throw new Error(record?.error ?? 'DSH 视频生成失败');
          }
          if (status === DSH_VIDEO_STATUS.cancelled) {
            throw new Error('DSH 视频生成已取消');
          }
          if (Date.now() > deadline) {
            throw new Error('DSH 视频生成等待超时，已放弃');
          }
          await sleep(pollMs);
        }
      }

      const nodeId = started?.node_id ?? started?.nodeId ?? started?.output?.node_id ?? null;
      const asset = await resolveAsset(nodeId);
      return {
        promptId: nodeId ? String(nodeId) : null,
        outputs: asset ? [{ nodeId: asset.nodeId, classType: null, files: [asset.file] }] : [],
        raw: started,
      };
    },
  };
}
