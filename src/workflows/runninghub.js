/**
 * 云端 RunningHub 通道。
 *
 * ⚠️ **本地与云端支持同样的五种 kind**（t2i/i2i/r2v/tts/music）——
 * 差异只在**跑在哪、计不计费、受什么约束**，不是「云端能力更强的一档」，
 * 也不是「本地一档、云端一档」（设计 §2.4 / K14）。
 *
 * RunningHub 有 **standard / plus 两档**（`RUNNINGHUB_TIERS`）：两档跑同一批 kind，
 * 差别是排队与配额。
 *
 * **API 契约尚未实测**（设计附录 A · V8「未确认」）：路径与字段名都做成可注入/可配置的，
 * 单测用假客户端跑完整流程。**不硬连**——没有注入 `fetchImpl` 时模块仍可加载。
 */

import { RUNNINGHUB_TIERS } from '../core/constants.js';
import { outputFile } from './spec.js';

/** RunningHub 的默认路径（可在构造时覆盖）。 */
export const RUNNINGHUB_PATHS = Object.freeze({
  ping: '/task/openapi/status',
  create: '/task/openapi/create',
  status: '/task/openapi/outputs',
});

/**
 * 建一个 RunningHub 客户端。
 *
 * @param {object} options
 * @param {string} options.baseUrl
 * @param {string} options.apiKey
 * @param {string} [options.tier]  standard | plus
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 * @param {Record<string, string>} [options.paths]
 */
export function createRunningHubClient({
  baseUrl,
  apiKey,
  tier = 'standard',
  fetchImpl,
  timeoutMs = 30_000,
  paths,
} = {}) {
  if (!baseUrl) throw new Error('createRunningHubClient 需要 baseUrl');
  if (!RUNNINGHUB_TIERS.includes(tier)) {
    throw new Error(`未知 RunningHub 档位 ${tier}（允许 ${RUNNINGHUB_TIERS.join(' / ')}）`);
  }
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('没有可用的 fetch 实现：请注入 fetchImpl');
  }
  const root = String(baseUrl).replace(/\/+$/, '');
  const route = { ...RUNNINGHUB_PATHS, ...(paths ?? {}) };

  async function request(pathname, { method = 'GET', body, signal } = {}) {
    const init = { method, headers: { 'x-api-key': String(apiKey ?? '') } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers['content-type'] = 'application/json';
    }
    if (signal) init.signal = signal;
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (controller) init.signal = controller.signal;
    try {
      const res = await doFetch(`${root}${pathname}`, init);
      if (!res || res.ok === false) {
        const status = res?.status ?? 'ERR';
        const text = typeof res?.text === 'function' ? await res.text().catch(() => '') : '';
        throw new Error(`RunningHub ${method} ${pathname} 失败（${status}）：${text.slice(0, 400)}`);
      }
      if (typeof res.json === 'function') return await res.json();
      return res;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    baseUrl: root,
    tier,
    paths: route,
    ping: async ({ signal } = {}) => request(route.ping, { signal }),
    createTask: async ({ workflow, extra, signal } = {}) =>
      request(route.create, {
        method: 'POST',
        body: { apiKey, tier, workflow, ...(extra ?? {}) },
        signal,
      }),
    getTask: async (taskId, { signal } = {}) =>
      request(`${route.status}/${encodeURIComponent(taskId)}`, { signal }),
  };
}

/** RunningHub 任务状态（设计 §8.5 的视频状态语义，云端任务通用）。 */
export const RUNNINGHUB_TASK_STATUS = Object.freeze({
  queued: 'queued',
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
});

/**
 * 轮询等任务结束。
 *
 * @param {object} options
 * @param {object} options.client
 * @param {string} options.taskId
 * @param {number} [options.pollMs]
 * @param {number} [options.maxWaitMs]  队列/执行等待上限（默认与编排层的队列上限一致）
 * @param {() => Promise<void>} [options.sleep]
 * @param {() => number} [options.now]
 */
export async function waitForTask({
  client,
  taskId,
  pollMs = 3000,
  maxWaitMs = 120 * 60 * 1000,
  sleep,
  now = () => Date.now(),
} = {}) {
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const started = now();
  for (;;) {
    const record = await client.getTask(taskId);
    const status = String(record?.status ?? record?.data?.status ?? '').toLowerCase();
    if (status === RUNNINGHUB_TASK_STATUS.succeeded) return record;
    if (status === RUNNINGHUB_TASK_STATUS.failed) {
      throw new Error(record?.error ?? record?.message ?? 'RunningHub 任务失败');
    }
    if (status === RUNNINGHUB_TASK_STATUS.cancelled) {
      throw new Error('RunningHub 任务已取消');
    }
    if (now() - started > maxWaitMs) {
      throw new Error(`RunningHub 任务等待超过 ${Math.round(maxWaitMs / 60000)} 分钟，已放弃`);
    }
    await wait(pollMs);
  }
}

/**
 * 云端 RunningHub 通道。
 *
 * 通道契约与 ComfyUI 通道一致：
 *   `generate({ spec, payload, signal })` → `{ promptId, outputs[], raw }`
 *
 * @param {object} options
 * @param {object} options.client
 * @param {number} [options.maxWaitMs]
 */
export function createRunningHubChannel({ client, maxWaitMs } = {}) {
  if (!client) throw new Error('createRunningHubChannel 需要 client');
  return {
    id: 'runninghub',
    position: 'cloud',
    provider: 'runninghub',
    tier: client.tier,
    client,

    async probe() {
      await client.ping();
      return { ok: true, tier: client.tier };
    },

    async generate({ payload, signal }) {
      const created = await client.createTask({ workflow: payload.prompt, signal });
      const taskId = created?.taskId ?? created?.task_id ?? created?.data?.taskId ?? null;
      if (!taskId) throw new Error('RunningHub 没有返回 taskId');
      const record = await waitForTask({ client, taskId, maxWaitMs, signal });
      const outputs = [];
      const list = record?.outputs ?? record?.data?.outputs ?? [];
      for (const item of Array.isArray(list) ? list : []) {
        outputs.push({
          nodeId: item?.nodeId ?? null,
          classType: item?.classType ?? null,
          files: [
            outputFile({
              filename: item?.filename ?? null,
              url: item?.url ?? item?.downloadUrl ?? null,
              type: item?.type ?? 'output',
              // 云端下载链接是临时的 → 必须落盘
              ephemeral: true,
            }),
          ],
        });
      }
      return { promptId: String(taskId), outputs, raw: record };
    },
  };
}
