/**
 * 能力探测（preflight）—— **范围随运行位置变**（设计 §7.1）。
 *
 * 原则照抄上游 `stages.js`：**每个阶段跑之前先探自己需要的东西，探不过就不开跑**。
 *
 * | 能力 | 探测方式 | 门槛 | 谁需要 |
 * | --- | --- | --- | --- |
 * | `comfy` ComfyUI 可达 | `GET /system_stats` | 不通 → 该阶段不可用 | image / tts / video |
 * | `ckVersion` CK 版本 | 读 system_stats 里的 comfy-kitchen 版本 | `>= 0.2.36` 判坏 | image / video |
 * | `vram` GPU 与显存余量 | nvidia-smi / system_stats 的 `vram_free` | video 阶段需 ≥ 8GB | video |
 * | `ffmpeg` ffmpeg/ffprobe | `ffmpeg -version` | 缺 → 无法合成 | video 尾段 |
 * | `encoders` 可用编码器 | `ffmpeg -encoders` 过滤 libx264/h264_nvenc/aac | 无 aac → 无声 | 合成 |
 * | `disk` 本地磁盘余量 | 目标工作区所在卷 | 不足 → 不开跑 | 全部 |
 * | `llm` LLM 通道可达 | `/models` 探活（5s 超时） | 不通 → llm 阶段不可用 | llm |
 * | `provider` provider 可达性 | 轻量 ping（云端）/ 规格集完整性（本地） | 失败 → 该 kind 不可用 | 云端全部 |
 * | `videoBackend` 视频后端硬约束 | 规格声明（静态） | 静态 | r2v |
 *
 * **本地跑 9 项，云端只探 provider 可达性 + 视频后端硬约束 + LLM 通道。**
 * 混检是浪费——本地项对云端毫无意义，还会在用户根本不想本地跑的时候跳出吓人的结论。
 *
 * 探测结果**只落插件状态，不进会话日志**（R2）。本模块不写日志、不碰宿主上下文对象。
 * 所有对外动作都走注入的 `deps`（fetch / 进程 / statfs），因此可单测、可假客户端。
 */

import { execFile } from 'node:child_process';
import { statfs } from 'node:fs/promises';

import {
  CK_MIN_VERSION,
  REFERENCE_LIMITS,
  SHOT_DURATION_MAX,
  SHOT_DURATION_MIN,
  VRAM_GATE_GB,
} from './constants.js';

/** 9 项能力的 id。 */
export const PROBE_IDS = Object.freeze([
  'comfy',
  'ckVersion',
  'vram',
  'ffmpeg',
  'encoders',
  'disk',
  'llm',
  'provider',
  'videoBackend',
]);

/**
 * **探测范围是运行位置的函数**（设计 §7.1）。
 * 本地 = 7 项本地专属 + LLM 通道 + 规格集 = 9 项；云端 = 3 项。
 */
export const PROBE_SCOPE = Object.freeze({
  local: Object.freeze(PROBE_IDS),
  cloud: Object.freeze(['llm', 'provider', 'videoBackend']),
});

/**
 * 每个阶段需要哪些探测项过了才开跑 —— **同样随运行位置变**：
 * 云端档不探本地 ComfyUI / 显存 / ffmpeg（那是本地档的事），只探 provider 与硬约束。
 */
export const STAGE_PROBE_REQUIREMENTS = Object.freeze({
  local: Object.freeze({
    llm: Object.freeze(['llm', 'disk']),
    image: Object.freeze(['comfy', 'ckVersion', 'disk', 'provider']),
    tts: Object.freeze(['comfy', 'ckVersion', 'disk', 'provider']),
    video: Object.freeze(['comfy', 'ckVersion', 'vram', 'ffmpeg', 'encoders', 'disk', 'provider']),
  }),
  cloud: Object.freeze({
    llm: Object.freeze(['llm']),
    image: Object.freeze(['provider']),
    tts: Object.freeze(['provider']),
    video: Object.freeze(['provider', 'videoBackend']),
  }),
});

/** 磁盘余量门槛（GB）。低于就不开跑。 */
export const DISK_MIN_GB = 2;

/**
 * 解析 CK 版本：**只比前 3 段且每段必须是纯数字**。
 *
 * `0.2.37rc1` → 第 3 段 `37rc1` 不是纯数字 → **读不准 → 保守判坏**
 * （用字符串序比较会把它当成「比 0.2.36 新」而放行坏版本）。
 *
 * @param {unknown} version
 * @returns {{ ok: boolean, reason: string, parts: number[]|null }}
 */
export function parseCkVersion(version) {
  const raw = String(version ?? '').trim();
  if (!raw) return { ok: false, reason: '版本号缺失', parts: null };
  const segments = raw.split('.');
  const parts = [];
  for (let i = 0; i < 3; i += 1) {
    const segment = segments[i];
    if (segment === undefined) {
      parts.push(0);
      continue;
    }
    if (!/^\d+$/.test(segment)) {
      return { ok: false, reason: `版本号 ${raw} 的第 ${i + 1} 段「${segment}」不是纯数字，读不准`, parts: null };
    }
    parts.push(Number(segment));
  }
  return { ok: true, reason: 'ok', parts };
}

/**
 * 比较两个三段版本号。
 * @param {number[]} a
 * @param {number[]} b
 */
export function compareVersionParts(a, b) {
  for (let i = 0; i < 3; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

/**
 * CK 版本门槛判定。
 * @param {unknown} version
 * @param {string} [min]
 */
export function compareCkVersion(version, min = CK_MIN_VERSION) {
  const parsed = parseCkVersion(version);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason, min, actual: version ?? null, parts: null };
  }
  const minParsed = parseCkVersion(min);
  const ok = compareVersionParts(parsed.parts, minParsed.parts) >= 0;
  return {
    ok,
    reason: ok ? 'ok' : `comfy-kitchen 版本 ${version} 低于门槛 ${min}`,
    min,
    actual: version ?? null,
    parts: parsed.parts,
  };
}

/**
 * 显存门槛判定。
 *
 * 含 video 阶段需 **8GB**，否则 **4GB**。**不足 → 直接拒，不拆批**（设计 §7.1 / K16）。
 *
 * @param {number|null} vramGb
 * @param {string} stage
 */
export function checkVramGate(vramGb, stage) {
  const requiredGb = stage === 'video' ? VRAM_GATE_GB.video : VRAM_GATE_GB.other;
  if (typeof vramGb !== 'number' || !Number.isFinite(vramGb)) {
    return {
      ok: false,
      requiredGb,
      actualGb: null,
      message: `读不到显存余量，无法确认是否满足 ${requiredGb}GB 门槛`,
    };
  }
  const ok = vramGb >= requiredGb;
  return {
    ok,
    requiredGb,
    actualGb: vramGb,
    message: ok
      ? `显存 ${vramGb}GB ≥ ${requiredGb}GB`
      : `当前 ${vramGb}GB，${stage} 阶段需 ${requiredGb}GB`,
  };
}

/**
 * 视频后端硬约束（规格声明，静态）。
 * @param {object} [options]
 * @param {number} [options.duration]
 * @param {number} [options.imageCount]
 * @param {number} [options.audioCount]
 */
export function checkVideoBackendConstraints({
  duration,
  imageCount = 0,
  audioCount = 0,
} = {}) {
  const errors = [];
  if (duration !== undefined && duration !== null) {
    if (duration < SHOT_DURATION_MIN || duration > SHOT_DURATION_MAX) {
      errors.push(`镜头时长 ${duration}s 超出后端允许的 ${SHOT_DURATION_MIN}–${SHOT_DURATION_MAX}s`);
    }
  }
  if (imageCount > REFERENCE_LIMITS.images) {
    errors.push(`参考图 ${imageCount} 张超出后端上限 ${REFERENCE_LIMITS.images}`);
  }
  if (audioCount > REFERENCE_LIMITS.audios) {
    errors.push(`参考音视频 ${audioCount} 段超出后端上限 ${REFERENCE_LIMITS.audios}`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 默认的子进程执行器（ffmpeg / nvidia-smi 用）。
 * 可以整体替换成假的，便于单测。
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function defaultRunner(command, args = [], timeoutMs = 10_000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        code: error?.code ?? (error ? 1 : 0),
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
        error: error ? error.message : null,
      });
    });
  });
}

/** 默认的磁盘余量查询。 */
export async function defaultStatfs(targetPath) {
  const stats = await statfs(targetPath);
  return { bavail: Number(stats.bavail), bsize: Number(stats.bsize) };
}

/**
 * 能力客户端**没注入**时的统一话术。
 *
 * ## 为什么要专门写这个
 *
 * 缺客户端时，旧实现直接 `await deps.llm.ping()` → 抛
 * `TypeError: Cannot read properties of undefined (reading 'ping')`。
 * 那是**实现细节**：用户看不懂「缺什么、怎么补」，只看到一个内部异常尾巴。
 * 按 DoD（失败路径要说清缺什么、给什么替代），这里必须换成一句人话。
 *
 * @param {string} unreachable 「XX 不可达」的前缀。
 * @param {string} clientLabel 客户端的名字。
 * @param {string} key 注入点（如 `deps.probe.llm`）。
 * @param {string} method 客户端上应有的方法名。
 * @returns {string} 错误消息。
 */
function missingClientMessage(unreachable, clientLabel, key, method) {
  return `${unreachable}：宿主未注入${clientLabel}（${key}，需要 ${method}() 方法）；`
    + `请在宿主装配时注入 ${key} = { ${method}() }`
    + '（或用 cordis.patch.yml 的 config.deps 注入通道客户端）';
}

/**
 * 探测一次。
 *
 * @param {object} options
 * @param {string} options.position  local | cloud
 * @param {string} [options.provider]
 * @param {object} [options.deps]
 * @param {() => number} [options.now]
 * @returns {Promise<object>} 探测报告
 */
export async function probeCapabilities({ position, provider, deps = {}, now = () => Date.now() } = {}) {
  const scope = PROBE_SCOPE[position] ?? PROBE_SCOPE.local;
  const run = deps.run ?? defaultRunner;
  const statfsImpl = deps.statfs ?? defaultStatfs;
  const items = [];

  const add = (id, status, message, extra = {}) => {
    items.push({ id, scope: position, status, message, ...extra });
  };

  // ── 本地专属：ComfyUI 与它的系统事实 ──────────────────────────
  let comfyStats = null;
  if (scope.includes('comfy')) {
    const comfy = deps.comfy;
    if (!comfy || typeof comfy.systemStats !== 'function') {
      // 宿主没注入 ComfyUI 通道客户端 → **明确判坏并说清怎么补**，
      // 不去碰 `deps.comfy.systemStats`（那会抛内部 TypeError）。
      add('comfy', 'failed', missingClientMessage('ComfyUI 不可达', 'ComfyUI 通道客户端', 'deps.probe.comfy', 'systemStats'), {
        value: null,
      });
    } else {
      try {
        comfyStats = await comfy.systemStats();
        add('comfy', 'ok', 'ComfyUI 可达', { value: comfyStats?.system?.comfyui_version ?? null });
      } catch (error) {
        add('comfy', 'failed', `ComfyUI 不可达：${error?.message ?? error}`, { value: null });
      }
    }
  }

  if (scope.includes('ckVersion')) {
    const version =
      comfyStats?.system?.comfy_kitchen_version ??
      comfyStats?.system?.['comfy-kitchen_version'] ??
      comfyStats?.system?.kitchen_version ??
      null;
    const result = compareCkVersion(version);
    add('ckVersion', result.ok ? 'ok' : 'failed', result.reason, { value: version ?? null });
  }

  if (scope.includes('vram')) {
    let vramGb = null;
    let source = null;
    const smi = await run('nvidia-smi', ['--query-gpu=memory.total', '--format=csv,noheader,nounits']);
    if (smi?.code === 0) {
      const numbers = String(smi.stdout)
        .split('\n')
        .map((line) => Number(line.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (numbers.length > 0) {
        vramGb = Math.round((numbers.reduce((a, b) => a + b, 0) / 1024) * 10) / 10;
        source = 'nvidia-smi';
      }
    }
    if (vramGb === null && Array.isArray(comfyStats?.devices)) {
      const total = comfyStats.devices.reduce(
        (sum, d) => sum + (d?.vram_total ?? d?.torch_vram_total ?? 0),
        0,
      );
      if (total > 0) {
        vramGb = Math.round((total / 1024 ** 3) * 10) / 10;
        source = 'comfy';
      }
    }
    const status = vramGb === null ? 'warn' : 'ok';
    add(
      'vram',
      status,
      vramGb === null ? '读不到显存余量' : `显存 ${vramGb}GB（${source}）`,
      { value: vramGb, source },
    );
  }

  if (scope.includes('ffmpeg')) {
    const result = await run('ffmpeg', ['-version']);
    const ok = result?.code === 0;
    const versionLine = String(result?.stdout ?? '').split('\n')[0] ?? '';
    add('ffmpeg', ok ? 'ok' : 'failed', ok ? versionLine || 'ffmpeg 可用' : '缺 ffmpeg，无法合成', {
      value: ok ? versionLine : null,
    });
  }

  if (scope.includes('encoders')) {
    const result = await run('ffmpeg', ['-encoders']);
    const text = String(result?.stdout ?? '');
    const found = ['libx264', 'h264_nvenc', 'aac'].filter((name) => text.includes(name));
    const hasAac = found.includes('aac');
    add(
      'encoders',
      hasAac ? 'ok' : 'warn',
      hasAac ? `可用编码器：${found.join('、')}` : '没有 aac 编码器 → 成片将无声',
      { value: found },
    );
  }

  if (scope.includes('disk')) {
    const target = deps.workspaceDir ?? process.cwd();
    try {
      const stats = await statfsImpl(target);
      const freeGb = Math.round(((stats.bavail * stats.bsize) / 1024 ** 3) * 10) / 10;
      add(
        'disk',
        freeGb >= DISK_MIN_GB ? 'ok' : 'failed',
        freeGb >= DISK_MIN_GB
          ? `工作区所在卷剩余 ${freeGb}GB`
          : `工作区所在卷只剩 ${freeGb}GB，不够开跑（需 ${DISK_MIN_GB}GB）`,
        { value: freeGb, min: DISK_MIN_GB },
      );
    } catch (error) {
      add('disk', 'failed', `读不到磁盘余量：${error?.message ?? error}`, { value: null });
    }
  }

  // ── 两边都要 ────────────────────────────────────────────────
  if (scope.includes('llm')) {
    const llm = deps.llm;
    if (!llm || typeof llm.ping !== 'function') {
      // 宿主没注入 LLM 通道客户端 → 说清缺什么、怎么补（不抛内部 TypeError）。
      add('llm', 'failed', missingClientMessage('LLM 通道不可达', 'LLM 通道客户端', 'deps.probe.llm', 'ping'), {
        value: false,
      });
    } else {
      try {
        await llm.ping();
        add('llm', 'ok', 'LLM 通道可达', { value: true });
      } catch (error) {
        add('llm', 'failed', `LLM 通道不可达：${error?.message ?? error}`, { value: false });
      }
    }
  }

  if (scope.includes('provider')) {
    if (position === 'cloud') {
      const providerClient = deps.provider;
      if (!providerClient || typeof providerClient.ping !== 'function') {
        // 云端档必须有 provider 客户端：没有就说清缺哪个、怎么补。
        add('provider', 'failed', missingClientMessage(
          `provider ${provider ?? 'cloud'} 不可达`,
          '云端 provider 客户端',
          'deps.probe.provider',
          'ping',
        ), {
          value: false,
          check: 'provider',
        });
      } else {
        try {
          await providerClient.ping();
          add('provider', 'ok', `provider ${provider ?? 'cloud'} 可达`, { value: true, check: 'provider' });
        } catch (error) {
          add('provider', 'failed', `provider ${provider ?? 'cloud'} 不可达：${error?.message ?? error}`, {
            value: false,
            check: 'provider',
          });
        }
      }
    } else {
      // 本地档的同一项换成「规格集完整性」：规格能不能加载、模板在不在
      const result = (await deps.specSet?.check?.()) ?? { ok: true, message: '规格集可用', errors: [] };
      add(
        'provider',
        result.ok ? 'ok' : 'failed',
        result.ok ? result.message : `规格集有问题：${(result.errors ?? []).join('；')}`,
        { value: result.ok, check: 'specSet' },
      );
    }
  }

  if (scope.includes('videoBackend')) {
    const constraints = deps.videoBackend?.constraints ?? {};
    const result = checkVideoBackendConstraints(constraints);
    add(
      'videoBackend',
      result.ok ? 'ok' : 'failed',
      result.ok ? '视频后端硬约束满足' : result.errors.join('；'),
      { value: constraints },
    );
  }

  const blockers = items.filter((i) => i.status === 'failed');
  const warnings = items.filter((i) => i.status === 'warn');

  return {
    position: position ?? 'local',
    provider: provider ?? null,
    at: now(),
    scope: [...scope],
    items,
    ok: blockers.length === 0,
    blockers: blockers.map((i) => ({ id: i.id, message: i.message })),
    warnings: warnings.map((i) => ({ id: i.id, message: i.message })),
  };
}

/**
 * 从探测报告里挑出某个阶段需要的项，并汇总成「能不能开跑」。
 *
 * @param {object} report
 * @param {string} stage
 * @returns {{ ok: boolean, blockers: object[], warnings: object[] }}
 */
export function selectForStage(report, stage) {
  const table = STAGE_PROBE_REQUIREMENTS[report?.position] ?? STAGE_PROBE_REQUIREMENTS.local;
  const required = table[stage] ?? [];
  const items = report?.items ?? [];
  const blockers = [];
  const warnings = [];
  for (const id of required) {
    const item = items.find((i) => i.id === id);
    if (!item) {
      blockers.push({ id, message: `探测报告里缺 ${id}（探测范围与该阶段不匹配）` });
      continue;
    }
    if (item.status === 'failed') blockers.push({ id, message: item.message });
    else if (item.status === 'warn') warnings.push({ id, message: item.message });
  }
  return { ok: blockers.length === 0, blockers, warnings };
}
