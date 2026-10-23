/**
 * 设备检查（板 04 号板）+ 降级矩阵（板 16 号板）的**宿主侧数据源**。
 *
 * ## 为什么这两块走独立路由，而不是进 wire view
 *
 * - **探测结果是能力事实，不是会话状态**：设计稿 04 号板的脚注写明
 *   「探测结果只落在插件状态，**不写进会话日志**」。放进会话投影就等于把它写进日志了。
 * - **探测很贵**：要跑 `nvidia-smi` / `ffmpeg -version` / HTTP 探活。
 *   wire view 每次投影变化都重算 —— 那等于每次工具调用都重跑一遍系统探测。
 *
 * ⇒ 单独一条只读路由 + 进程内缓存；界面上的「重新检测」按钮走 `refresh=1` 强制重跑。
 *
 * ## 降级矩阵为什么也在这条路由里
 *
 * 矩阵的「当前真实状态」由能力事实决定（缺 ffmpeg / 显存不足 / provider 挂），
 * 跟探测报告是同一批事实 ⇒ 一次请求一起给，别让界面发两次。
 */
import { degradeFromProbe, degradeMatrix, degradeNotices, resolveOutputs } from '../core/degrade.js';
import { probeCapabilities } from '../core/probe.js';
import { specCounts } from './specMatrix.js';

/** 探测结果的缓存时长（毫秒）。点「重新检测」会绕过它。 */
export const PROBE_CACHE_TTL_MS = 30_000;

/**
 * @typedef {object} ProbeCacheEntry
 * @property {number} at 缓存时刻。
 * @property {object} report 探测报告。
 */

/** @type {Map<string, ProbeCacheEntry>} */
const cache = new Map();

/**
 * 取缓存里的探测报告（没过期才给）。
 *
 * @param {string} key 缓存键。
 * @returns {object | null}
 */
function cachedReport(key) {
  const entry = cache.get(key);
  if (entry === undefined) return null;
  if (Date.now() - entry.at > PROBE_CACHE_TTL_MS) return null;
  return entry.report;
}

/**
 * 从会话状态里取「项目层面」的降级事实（失败镜、缺音色）。
 *
 * 能力层面的事实（缺 ffmpeg、显存不足…）由探测报告给，这里只补**会话里已经发生**的。
 *
 * @param {object | null} state 投影状态。
 * @returns {{ failedShots: number[], missingVoices: Array<{name: string}> }}
 */
export function sessionDegradeFacts(state) {
  const chapters = Array.isArray(state?.chapters) ? state.chapters : [];
  /** @type {number[]} */
  const failedShots = [];
  for (const chapter of chapters) {
    const shots = Array.isArray(chapter?.shots) ? chapter.shots : [];
    for (const shot of shots) {
      if (String(shot?.status ?? '') === 'failed') failedShots.push(Number(shot?.idx) || 0);
    }
  }
  const assets = Array.isArray(state?.assets) ? state.assets : [];
  const missingVoices = assets
    .filter(asset => String(asset?.category ?? '') === 'voice' && !asset?.voice_ref)
    .map(asset => ({ name: String(asset?.name ?? '') }))
    .filter(item => item.name !== '');
  return { failedShots, missingVoices };
}

/**
 * 跑一次探测并算出降级（宿主侧）。
 *
 * @param {object} options
 * @param {object} [options.config] 归一化后的 Config。
 * @param {object | null} [options.state] 会话投影状态（取项目层面的降级事实）。
 * @param {string} [options.position] 运行位置（默认 local —— 板 04 是「本地档设备检查」）。
 * @param {string} [options.provider] provider。
 * @param {boolean} [options.refresh] 忽略缓存强制重跑。
 * @param {string} [options.cwd] 会话工作目录（磁盘余量探测用）。
 * @returns {Promise<object>} 视图。
 */
export async function buildProbeView(options = {}) {
  const config = options.config ?? {};
  const state = options.state ?? null;
  const position = options.position ?? 'local';
  const provider = options.provider ?? 'native';
  const refresh = options.refresh === true;
  const cwd = options.cwd ?? '';
  const key = `${position}|${provider}`;
  let report = refresh ? null : cachedReport(key);
  if (report === null) {
    const deps = {
      ...(config?.deps ?? {}),
      ...(cwd ? { workspaceDir: cwd } : {}),
    };
    report = await probeCapabilities({ position, provider, deps });
    cache.set(key, { at: Date.now(), report });
  }

  const facts = sessionDegradeFacts(state);
  const degradations = degradeFromProbe(report, facts);
  const specs = specCounts();

  return {
    ok: true,
    position,
    provider,
    at: report.at,
    report,
    specs,
    degrade: {
      // 矩阵 = 实现的真实产出形态（由 `DEGRADE_MATRIX` 生成，不另写一份）。
      matrix: degradeMatrix(),
      degradations,
      notices: degradeNotices(degradations),
      outputs: resolveOutputs(degradations),
    },
  };
}
