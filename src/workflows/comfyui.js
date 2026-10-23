/**
 * 本地 ComfyUI 通道（REST + WS）。
 *
 * 设计 §8.6 的实现约束都落在这里：
 *   - `/system_stats` 探活 + 读 comfy-kitchen 版本 + `vram_free`；
 *   - CK 版本门槛 `>= 0.2.36`（比较逻辑在 `src/core/probe.js`）；
 *   - AMD 档默认**每 3 次生成后**调 `/free` 释放显存，**所有 kind 都计入计数**。
 *
 * **不硬连**：HTTP 用注入的 `fetchImpl`，WebSocket 用注入的 `wsFactory`，
 * 默认取全局实现。没有这两个注入时模块仍可加载（只是不能真跑），
 * 因此单测可以用假客户端跑完整流程，不必真的连 ComfyUI。
 */

import { HW_DEFAULT_FREE } from '../core/constants.js';
import { outputFile } from './spec.js';

/** ComfyUI 的 REST 路径。 */
export const COMFY_ENDPOINTS = Object.freeze({
  systemStats: '/system_stats',
  prompt: '/prompt',
  history: '/history',
  view: '/view',
  uploadImage: '/upload/image',
  uploadAudio: '/upload/audio',
  free: '/free',
  ws: '/ws',
});

/**
 * REST 请求选项。
 * @typedef {object} RequestOptions
 * @property {string} [method]       默认 GET
 * @property {unknown} [body]         FormData，或任意可 JSON 化的值
 * @property {Record<string, string>} [headers]
 * @property {AbortSignal} [signal]
 * @property {boolean} [raw]          true = 返回原始 Response（不解析 JSON）
 */

/**
 * 上传素材的选项。
 * @typedef {object} UploadOptions
 * @property {string} [filename]      缺省取 `file.name`，再缺省 'upload'
 * @property {boolean} [overwrite]    默认 true
 * @property {string} [type]          默认 input
 */

/**
 * ComfyUI 经 WS 推来的消息（形状随 `type` 变化）。
 * @typedef {object} ComfyMessage
 * @property {string} [type]          progress | executing | execution_error | execution_interrupted
 * @property {Record<string, unknown>} [data]
 */

/**
 * 等一个 prompt 跑完的选项。
 * @typedef {object} WaitOptions
 * @property {(data: Record<string, unknown>) => void} [onProgress]
 * @property {AbortSignal} [signal]
 * @property {ComfyMessage[]} [events]      已缓存的事件（回扫用）
 * @property {Set<Function>|null} [subscribers]  已订阅的处理器（内部用）
 */

/**
 * `connect()` 的选项。
 * @typedef {object} ConnectOptions
 * @property {string} [promptId]
 * @property {(data: Record<string, unknown>) => void} [onProgress]
 * @property {AbortSignal} [signal]
 * @property {object} [ws]            直接给一个建好的 WebSocket（跳过工厂）
 */

/**
 * 上传的素材载荷：`File` / `Blob` / `Uint8Array` / 带 `arrayBuffer()` 的对象。
 * @typedef {{ name?: string, arrayBuffer: () => Promise<ArrayBuffer> }} UploadPayload
 */

/**
 * `connect()` 返回的连接句柄——**同步返回**，不是 Promise。
 * @typedef {object} ComfyConnection
 * @property {object} socket
 * @property {ComfyMessage[]} events
 * @property {() => void} close
 * @property {(pid: string) => Promise<unknown>} wait
 */

/**
 * @typedef {object} ComfyClient
 * @property {string} baseUrl
 * @property {string} clientId
 * @property {() => Promise<object>} systemStats
 * @property {(prompt: object, opts?: object) => Promise<object>} submitPrompt
 * @property {(promptId: string) => Promise<object>} getHistory
 * @property {(file: UploadPayload, opts?: object) => Promise<object>} uploadImage
 * @property {(file: UploadPayload, opts?: object) => Promise<object>} uploadAudio
 * @property {(opts?: object) => Promise<void>} free
 * @property {(opts?: object) => Promise<object>} downloadOutput
 * @property {(opts?: object) => ComfyConnection} connect
 * @property {(promptId: string, opts?: object) => Promise<unknown>} waitForPrompt
 */

/**
 * 建一个 ComfyUI 客户端。
 *
 * @param {object} options
 * @param {string} [options.baseUrl]              例：`http://127.0.0.1:8188`
 * @param {typeof fetch} [options.fetchImpl]    注入的 HTTP 实现
 * @param {(url: string) => object} [options.wsFactory] 注入的 WebSocket 工厂
 * @param {number} [options.timeoutMs]
 * @param {string} [options.clientId]
 * @returns {ComfyClient}
 */
export function createComfyClient({
  baseUrl,
  fetchImpl,
  wsFactory,
  timeoutMs = 30_000,
  clientId,
} = {}) {
  if (!baseUrl) throw new Error('createComfyClient 需要 baseUrl');
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('没有可用的 fetch 实现：请注入 fetchImpl');
  }
  const root = String(baseUrl).replace(/\/+$/, '');
  const id = clientId ?? `reelforge-${Math.random().toString(36).slice(2, 10)}`;

  /**
   * @param {string} pathname
   * @param {RequestOptions} [opts]
   */
  async function request(pathname, { method = 'GET', body, headers, signal, raw = false } = {}) {
    const url = `${root}${pathname}`;
    const init = { method, headers: /** @type {Record<string, string>} */ ({ ...(headers ?? {}) }) };
    if (body !== undefined) {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
      if (!(body instanceof FormData) && !init.headers['content-type']) {
        init.headers['content-type'] = 'application/json';
      }
    }
    if (signal) init.signal = signal;
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (controller) init.signal = controller.signal;
    try {
      const res = await doFetch(url, init);
      if (!res || res.ok === false) {
        const status = res?.status ?? 'ERR';
        const text = typeof res?.text === 'function' ? await res.text().catch(() => '') : '';
        throw new Error(`ComfyUI ${method} ${pathname} 失败（${status}）：${text.slice(0, 400)}`);
      }
      if (raw) return res;
      if (typeof res.json === 'function') return await res.json();
      return res;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * @param {string} pathname
   * @param {string} field
   * @param {UploadPayload} file
   * @param {UploadOptions} [opts]
   */
  async function upload(pathname, field, file, { filename, overwrite = true, type = 'input' } = {}) {
    const form = new FormData();
    const name = filename ?? (file && file.name) ?? 'upload';
    const blob =
      file instanceof Blob
        ? file
        : new Blob([
            /** @type {BlobPart} */ (
              file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer())
            ),
          ]);
    form.append(field, blob, /** @type {string} */ (name));
    form.append('overwrite', String(overwrite));
    form.append('type', type);
    return request(pathname, { method: 'POST', body: form });
  }

  function parseMessage(raw) {
    // 浏览器/Node 的 WebSocket 事件是 `{ data }`，也兼容直接给字符串
    const text =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'data' in raw
          ? raw.data
          : String(raw);
    try {
      return JSON.parse(typeof text === 'string' ? text : String(text));
    } catch {
      return null;
    }
  }

  function attach(socket, handler) {
    if (typeof socket.addEventListener === 'function') socket.addEventListener('message', handler);
    else if (typeof socket.on === 'function') socket.on('message', handler);
    else throw new Error('WebSocket 对象不支持 message 监听');
  }

  function detach(socket, handler) {
    try {
      if (typeof socket.removeEventListener === 'function') socket.removeEventListener('message', handler);
      else if (typeof socket.off === 'function') socket.off('message', handler);
    } catch {
      /* 关闭失败不影响结论 */
    }
  }

  /**
   * @param {ConnectOptions} [opts]
   */
  function connect({ promptId, onProgress, signal, ws } = {}) {
    const factory = wsFactory ?? ((url) => (globalThis.WebSocket ? new globalThis.WebSocket(url) : null));
    if (typeof factory !== 'function') throw new Error('没有可用的 WebSocket 实现：请注入 wsFactory');
    const url = `${root.replace(/^http/, 'ws')}${COMFY_ENDPOINTS.ws}?clientId=${encodeURIComponent(id)}`;
    const socket = ws ?? factory(url);
    if (!socket) throw new Error('WebSocket 工厂没有返回连接对象');

    // 事件缓冲：ComfyUI 可能在「提交请求返回前」就把执行消息推过来了，
    // 只在 wait() 里临时挂监听会漏消息 → 先缓存，再回扫。
    const events = [];
    const subscribers = new Set();
    const listener = (raw) => {
      const msg = parseMessage(raw);
      if (!msg) return;
      events.push(msg);
      for (const subscriber of [...subscribers]) subscriber(msg);
    };
    attach(socket, listener);

    return {
      socket,
      events,
      close: () => {
        detach(socket, listener);
        subscribers.clear();
      },
      wait: (pid) => waitForPrompt(socket, pid ?? promptId, { onProgress, signal, events, subscribers }),
    };
  }

  /**
   * @param {object} socket
   * @param {string} promptId
   * @param {WaitOptions} [opts]
   */
  function waitForPrompt(
    socket,
    promptId,
    { onProgress, signal, events = [], subscribers = null } = {},
  ) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (subscribers) subscribers.delete(handle);
        else detach(socket, handle);
        if (signal && typeof signal.removeEventListener === 'function') {
          signal.removeEventListener('abort', onAbort);
        }
      };
      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(arg);
      };
      const onAbort = () => finish(reject, new Error('ComfyUI 等待被取消'));
      const handle = (msg) => {
        const data = msg?.data ?? {};
        if (data.prompt_id && promptId && data.prompt_id !== promptId) return;
        if (msg.type === 'progress') {
          if (onProgress) onProgress(data);
          return;
        }
        if (msg.type === 'executing' && (data.node === null || data.node === undefined)) {
          finish(resolve, { done: true });
        } else if (msg.type === 'execution_error') {
          finish(reject, new Error(data.exception_message || 'ComfyUI 执行失败'));
        } else if (msg.type === 'execution_interrupted') {
          finish(reject, new Error('ComfyUI 执行被中断'));
        }
      };

      // ① 回扫已经收到的事件（提交期间推来的消息不能丢）
      for (const msg of events) {
        handle(msg);
        if (settled) return;
      }
      // ② 再订阅后续事件
      if (subscribers) subscribers.add(handle);
      else attach(socket, handle);

      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  return {
    baseUrl: root,
    clientId: id,
    systemStats: () => request(COMFY_ENDPOINTS.systemStats),
    submitPrompt: (prompt, { signal } = {}) =>
      request(COMFY_ENDPOINTS.prompt, { method: 'POST', body: { prompt, client_id: id }, signal }),
    getHistory: (promptId) => request(`${COMFY_ENDPOINTS.history}/${encodeURIComponent(promptId)}`),
    uploadImage: (file, opts) => upload(COMFY_ENDPOINTS.uploadImage, 'image', file, opts),
    uploadAudio: (file, opts) => upload(COMFY_ENDPOINTS.uploadAudio, 'audio', file, opts),
    free: async ({ unloadModels = true, freeMemory = true } = {}) => {
      await request(COMFY_ENDPOINTS.free, {
        method: 'POST',
        body: { unload_models: unloadModels, free_memory: freeMemory },
      });
    },
    downloadOutput: async ({ filename, subfolder = '', type = 'output' }) => {
      const query = new URLSearchParams({ filename, subfolder, type });
      const res = await request(`${COMFY_ENDPOINTS.view}?${query.toString()}`, { raw: true });
      if (typeof res.arrayBuffer === 'function') return await res.arrayBuffer();
      return res;
    },
    connect,
    waitForPrompt: (promptId, opts) => waitForPrompt(opts?.socket, promptId, opts),
  };
}

/**
 * 深搜一个键名匹配的字符串值（用来找 comfy-kitchen 版本——上游字段名不统一）。
 * @param {unknown} node
 * @param {(key: string) => boolean} match
 */
export function deepFindString(node, match) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindString(item, match);
      if (found) return found;
    }
    return null;
  }
  for (const [key, value] of Object.entries(node)) {
    if (match(key) && typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const found = deepFindString(value, match);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 从 `/system_stats` 里抽 comfy-kitchen 版本。
 * @param {object} stats
 * @returns {string|null}
 */
export function extractCkVersion(stats) {
  const system = stats?.system ?? {};
  const direct =
    system.comfy_kitchen_version ??
    system['comfy-kitchen_version'] ??
    system.kitchen_version ??
    system.ck_version;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  return deepFindString(stats, (key) => /kitchen/i.test(key));
}

/**
 * 从 `/system_stats` 里抽显存总量（GB）。
 * @param {object} stats
 * @returns {number|null}
 */
export function extractVramGb(stats) {
  const devices = Array.isArray(stats?.devices) ? stats.devices : [];
  let total = 0;
  let found = false;
  for (const device of devices) {
    const bytes = device?.vram_total ?? device?.torch_vram_total;
    if (typeof bytes === 'number' && bytes > 0) {
      total += bytes;
      found = true;
    }
  }
  if (!found) {
    const system = stats?.system ?? {};
    const bytes = system.vram_total;
    if (typeof bytes === 'number' && bytes > 0) {
      total = bytes;
      found = true;
    }
  }
  return found ? Math.round((total / 1024 ** 3) * 10) / 10 : null;
}

/**
 * 启动参数（若 ComfyUI 报上来）。
 * @param {object} stats
 * @returns {string[]}
 */
export function extractArgv(stats) {
  const system = stats?.system ?? {};
  const argv = system.argv ?? system.args;
  return Array.isArray(argv) ? argv.map(String) : [];
}

/**
 * AMD 档的显存释放计数。
 *
 * **所有 kind 都计入计数**（AMD Dynamic VRAM 下任意连续生成都会逐步变慢），
 * 每 `interval` 次生成后调一次 `/free`。
 *
 * @param {object} options
 * @param {string} [options.hw]     nvidia | amd
 * @param {number} [options.every]  覆盖释放间隔
 * @param {() => Promise<void>} [options.free]
 */
export function createVramReleaser({ hw = 'nvidia', every, free } = {}) {
  const interval = every ?? HW_DEFAULT_FREE[hw] ?? 0;
  let count = 0;
  return {
    get count() {
      return count;
    },
    get interval() {
      return interval;
    },
    /** 记一次生成（不分类——各 kind 都计数）。返回是否触发了 /free。 */
    async note() {
      count += 1;
      if (interval > 0 && count % interval === 0) {
        // 守卫放在**用到的这一刻**：nvidia 档 interval = 0、根本不会调 free，
        // 不该在构造时就报错。而真要用时，缺 free 必须说清缺什么，
        // 而不是抛一个裸的 `TypeError: free is not a function`。
        if (typeof free !== 'function') {
          throw new Error(
            `ComfyUI 显存释放缺少 free()（${hw} 档每 ${interval} 次生成后要调一次 /free）`,
          );
        }
        await free();
        return true;
      }
      return false;
    },
    reset() {
      count = 0;
    },
  };
}

/**
 * 本地 ComfyUI 通道。
 *
 * 通道契约（comfyui / runninghub / dsh 三家一致）：
 *   `generate({ spec, payload, signal })` → `{ promptId, outputs[], raw }`
 *   `outputs[]` 的每一项：`{ nodeId, classType, files: [{ filename, subfolder, type }] }`
 *
 * @param {object} options
 * @param {ComfyClient} [options.client]
 * @param {string} [options.hw]
 * @param {(payload: object, opts: { client: ComfyClient, signal?: AbortSignal }) => Promise<object>} [options.uploadFile]
 *   把本地文件传上去换成 ComfyUI 里的文件名，并返回**改过路径的载荷**。
 *   不注入时本地路径会原样写进工作流（云端模板用绝对 URL 时可不管）。
 */
export function createComfyChannel({ client, hw = 'nvidia', uploadFile } = {}) {
  if (!client) throw new Error('createComfyChannel 需要 client');
  const releaser = createVramReleaser({
    hw,
    free: async () => {
      await client.free();
    },
  });

  return {
    id: 'comfyui',
    position: 'local',
    client,
    releaser,

    async probe() {
      const stats = await client.systemStats();
      return {
        ok: true,
        stats,
        ckVersion: extractCkVersion(stats),
        vramGb: extractVramGb(stats),
        argv: extractArgv(stats),
      };
    },

    async generate({ payload, signal }) {
      // 本地文件先上传，再把上传后的名字绑进工作流
      let prompt = payload.prompt;
      if (typeof uploadFile === 'function') {
        prompt = await uploadFile(payload, { client, signal });
      }

      const { socket, wait } = client.connect({ signal });
      const submitted = await client.submitPrompt(prompt, { signal });
      const promptId = submitted?.prompt_id ?? submitted?.promptId ?? null;
      if (!promptId) throw new Error('ComfyUI 没有返回 prompt_id');
      await wait(promptId);
      await releaser.note();

      const history = await client.getHistory(promptId);
      const record = history?.[promptId] ?? history ?? {};
      const outputs = [];
      for (const [nodeId, nodeOutput] of Object.entries(record.outputs ?? {})) {
        const files = [];
        for (const kind of ['images', 'gifs', 'videos', 'audio', 'files']) {
          for (const item of nodeOutput?.[kind] ?? []) {
            files.push(
              outputFile({
                filename: item?.filename ?? null,
                subfolder: item?.subfolder ?? '',
                type: item?.type ?? 'output',
                ephemeral: false,
              }),
            );
          }
        }
        outputs.push({ nodeId, classType: null, files });
      }
      return { promptId, outputs, raw: record };
    },
  };
}
