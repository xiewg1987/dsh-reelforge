/**
 * kind × 执行位置 的**规格矩阵**（设计稿 05 号板）。
 *
 * ## 为什么在宿主侧算
 *
 * 规格集是**随包只读资源**（`workflows/specs/*.json`），不是会话状态 ——
 * 和技能目录同一条路：宿主侧读 → 喂给视图。客户端不该去读磁盘，
 * 更不该把「本地与云端是同一 kind 的两套 sourceFile」这件事**再实现一遍**。
 *
 * ## 为什么缓存
 *
 * 规格集随包只读，进程生命周期内不会变；而 wire view 每次投影变化都会重算 ——
 * 每读 5 个 JSON 文件是纯浪费。缓存一次，**引用稳定**（宿主用 `Object.is` 比较视图）。
 */
import { GENERATION_KINDS } from '../core/constants.js';
import { loadSpecSetDir } from '../workflows/spec.js';
import { WORKFLOW_SPECS_DIR } from './paths.js';

/**
 * 本地档的硬件档顺序：**nvidia 优先，amd 兜底**。
 *
 * 与 `resolveSpec()` 的取用顺序一致（AMD 机拿 nvidia 的工作流会 OOM）。
 */
const LOCAL_VARIANTS = Object.freeze(['local-nvidia', 'local-amd']);

/** 云端档。 */
const CLOUD_VARIANT = 'cloud-runninghub';

/**
 * @typedef {object} SpecBrief
 * @property {string} id 规格 id（真实 id，不是设计稿里的示意名）。
 * @property {string} name 规格名。
 * @property {string} sourceFile 工作流源文件。
 */

/**
 * @typedef {object} SpecMatrixRow
 * @property {string} kind 生成 kind。
 * @property {SpecBrief | null} local 本地档规格。
 * @property {SpecBrief | null} cloud 云端档规格。
 */

/** @type {SpecMatrixRow[] | null} */
let cached = null;

/**
 * 取一个规格的简要信息（只留界面上要显示的三样）。
 *
 * @param {Record<string, unknown> | undefined | null} spec
 * @returns {SpecBrief | null}
 */
function briefOf(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (spec);
  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? ''),
    sourceFile: String(record.sourceFile ?? ''),
  };
}

/**
 * kind × 位置的规格矩阵（读一次，缓存）。
 *
 * 读不出来（目录缺失 / 文件坏了）时**不抛**，返回每行 `local/cloud` 都是 null 的矩阵 ——
 * 界面据此显示「规格集读不到」，而不是假装有规格。
 *
 * @returns {SpecMatrixRow[]} 矩阵行（按 `GENERATION_KINDS` 顺序）。
 */
export function planMatrix() {
  if (cached !== null) return cached;
  /** @type {Record<string, { specs?: Record<string, unknown> }>} */
  let sets = {};
  try {
    sets = loadSpecSetDir(WORKFLOW_SPECS_DIR);
  } catch (error) {
    console.warn(
      '[reelforge] 规格集读取失败（执行路径屏会显示「规格集读不到」）：',
      error instanceof Error ? error.message : String(error),
    );
    sets = {};
  }
  cached = GENERATION_KINDS.map(kind => {
    const specs = /** @type {Record<string, unknown>} */ (sets[kind]?.specs ?? {});
    const local = /** @type {Record<string, unknown> | null} */ (
      LOCAL_VARIANTS.map(variant => specs[variant]).find(Boolean) ?? null
    );
    return {
      kind,
      local: briefOf(local),
      cloud: briefOf(/** @type {Record<string, unknown> | null} */ (specs[CLOUD_VARIANT] ?? null)),
    };
  });
  return cached;
}

/**
 * 规格集条数（板 04 号板「provider 规格」那一行的补充值）。
 *
 * @returns {{ total: number, local: number, cloud: number }} 计数。
 */
export function specCounts() {
  const rows = planMatrix();
  let local = 0;
  let cloud = 0;
  for (const row of rows) {
    if (row.local !== null) local += 1;
    if (row.cloud !== null) cloud += 1;
  }
  return { total: local + cloud, local, cloud };
}
