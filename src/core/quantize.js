/**
 * 镜头时长量化（§7.2，**纯函数**）。
 *
 * 允许时长集合 `D` **由调用方传入**（H3 → `[1..15]` 整数秒），本模块不内置任何后端知识。
 *
 * ── 规则（照抄 §7.2）─────────────────────────────────────────────────────────
 *
 * 1. 取允许时长集合 `D`。
 * 2. 每镜理想时长**投影到 D 上取最近值**。
 * 3. **带约束的分配**：先按权重分配理想时长，再逐镜就近取整，**用差额在多镜之间做守恒调整**
 *    （保证总和精确命中 `targetDuration`）。
 * 4. 量化后某镜超出上限 → **拆镜**；低于下限 → **并镜**。
 * 5. 结果**写回 `shots[].duration`**，并在 `provenance.authorAdded` 记一笔
 *    「时长已按后端约束调整为 4/4/4/5/5/4/4（合计 30）」。
 *
 * 「拆镜 / 并镜」的真正触发条件是**镜头数**而不是单镜范围：
 * 目标 30 秒、单镜上限 15 秒 → 至少要 2 镜（拆）；目标 4 秒、单镜下限 1 秒 → 至多 4 镜（并）。
 *
 * ── 纯度说明 ────────────────────────────────────────────────────────────────
 *
 * `planQuantization()` 是纯函数（**不改入参**，只算不改）。
 * `quantizeDurations()` 按契约**写回** `shots[].duration` 与 `provenance`，并返回变更清单。
 * 两者共用同一份工作项清单，**算与写不会漂**。
 */

import { SHOT_DURATION_DEFAULT } from './constants.js';

/** 量化相关的错误。 */
export class QuantizeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'QuantizeError';
    this.code = details.code ?? 'quantize_error';
    Object.assign(this, details);
  }
}

/** 清洗允许时长集合：去重、升序、只留正数。 */
export function normalizeAllowedDurations(allowed) {
  const list = Array.isArray(allowed) ? allowed : [];
  const values = list
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  const unique = [...new Set(values)];
  if (unique.length === 0) {
    throw new QuantizeError('允许时长集合 D 为空：没有可用的时长档位。', { code: 'quantize_empty_allowed_set' });
  }
  return unique;
}

/** D 里比 `value` 大的下一个值（没有则 null）。 */
function nextUp(value, allowed) {
  for (const candidate of allowed) {
    if (candidate > value + 1e-9) return candidate;
  }
  return null;
}

/** D 里比 `value` 小的下一个值（没有则 null）。 */
function nextDown(value, allowed) {
  for (let i = allowed.length - 1; i >= 0; i -= 1) {
    const candidate = allowed[i];
    if (candidate < value - 1e-9) return candidate;
  }
  return null;
}

/** 投影到 D 上取最近值（并列时取小的）。 */
function projectToAllowed(value, allowed) {
  let best = allowed[0];
  let bestDistance = Math.abs(value - best);
  for (const candidate of allowed) {
    const distance = Math.abs(value - candidate);
    if (distance < bestDistance - 1e-9) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * 守恒分配：把 `target` 精确分给 `n` 镜，每镜落在 D 内。
 *
 * 先按权重比例分，再逐镜就近投影，最后用差额在多镜之间**守恒调整**。
 *
 * @param {number[]} weights 每镜权重（理想时长）
 * @param {number} target 目标总时长
 * @param {number[]} allowed 升序的允许时长集合
 * @returns {{ values: number[], residual: number }}
 */
export function allocateConserving(weights, target, allowed) {
  const n = weights.length;
  if (n === 0) return { values: [], residual: 0 };

  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  const raw = weights.map((w) => (sumWeights > 0 ? (target * w) / sumWeights : target / n));

  const values = raw.map((r) => projectToAllowed(r, allowed));
  let total = values.reduce((acc, v) => acc + v, 0);

  // 差额守恒调整：谁被舍入得最亏，谁先拿回差额
  const step = allowed.length > 1 ? Math.min(...allowed.slice(1).map((v, i) => v - allowed[i])) : 1;
  const slack = raw.map((r, i) => (r - values[i]) / (step || 1));

  let guard = 0;
  while (Math.abs(total - target) > 1e-9 && guard < 100000) {
    guard += 1;
    const diff = target - total;
    const candidates = [];
    for (let i = 0; i < n; i += 1) {
      const next = diff > 0 ? nextUp(values[i], allowed) : nextDown(values[i], allowed);
      if (next == null) continue;
      const delta = next - values[i];
      if (Math.sign(delta) !== Math.sign(diff)) continue;
      candidates.push({ index: i, next, delta, slack: slack[i] });
    }
    if (candidates.length === 0) break;

    // 不越界优先；再按「被舍入得最亏的先补」
    const safe = candidates.filter((c) => Math.abs(c.delta) <= Math.abs(diff) + 1e-9);
    const pool = safe.length > 0 ? safe : candidates;
    pool.sort((a, b) => (diff > 0 ? a.slack - b.slack : b.slack - a.slack) || (a.index - b.index));

    const chosen = pool[0];
    total += chosen.delta;
    values[chosen.index] = chosen.next;
  }

  return { values, residual: target - total };
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

/**
 * 量化前的规划（**纯函数**：不改入参、不改分镜对象）。
 *
 * @param {Array<object>} shots
 * @param {number[]} allowed 允许时长集合 D
 * @param {number} targetDuration 目标总时长（秒）
 * @returns {{
 *   changes: Array<{idx: number, before: number|null, after: number, changed: boolean}>,
 *   durations: number[], summary: string, total: number, target: number,
 *   residual: number, splits: Array<object>, merges: Array<object>,
 *   warnings: Array<object>, items: Array<object>
 * }}
 */
export function planQuantization(shots, allowed, targetDuration) {
  const list = Array.isArray(shots) ? shots : [];
  const D = normalizeAllowedDurations(allowed);
  const warnings = [];

  if (list.length === 0) {
    return {
      changes: [],
      durations: [],
      summary: '',
      total: 0,
      target: 0,
      residual: 0,
      splits: [],
      merges: [],
      warnings,
      items: [],
    };
  }

  const dMin = D[0];
  const dMax = D[D.length - 1];

  /** 工作项：`shot` 是要写的目标对象（拆镜会产生新对象，并镜保留邻居对象）。 */
  let items = list.map((shot) => ({
    shot,
    ideal: Number.isFinite(Number(shot?.duration)) ? Number(shot.duration) : SHOT_DURATION_DEFAULT,
    before: Number.isFinite(Number(shot?.duration)) ? Number(shot.duration) : null,
    isNew: false,
    mergedFrom: null,
  }));

  const sumIdeal = items.reduce((acc, w) => acc + w.ideal, 0);
  const target = Number.isFinite(Number(targetDuration)) && Number(targetDuration) > 0 ? Number(targetDuration) : sumIdeal;
  if (!(target > 0)) {
    throw new QuantizeError('目标时长必须大于 0。', { code: 'quantize_invalid_target', target });
  }

  // 镜头数约束：太少了要拆镜（每镜装不下），太多了要并镜（每镜摊不到下限）
  const minShots = Math.ceil(target / dMax - 1e-9);
  const maxShots = Math.floor(target / dMin + 1e-9);

  const splits = [];
  const merges = [];

  // 拆镜：把理想时长最长的镜一分为二
  let guard = 0;
  while (items.length < minShots && guard < 10000) {
    guard += 1;
    let pivot = 0;
    for (let i = 1; i < items.length; i += 1) {
      if (items[i].ideal > items[pivot].ideal) pivot = i;
    }
    const source = items[pivot];
    const firstHalf = source.ideal / 2;
    const secondHalf = source.ideal - firstHalf;
    const created = { ...source.shot };
    items.splice(
      pivot,
      1,
      { shot: source.shot, ideal: firstHalf, before: source.before, isNew: false, mergedFrom: null },
      { shot: created, ideal: secondHalf, before: null, isNew: true, mergedFrom: null },
    );
    splits.push({ source: source.before, into: [firstHalf, secondHalf] });
  }

  // 并镜：把最短的镜并进相邻的镜
  guard = 0;
  while (items.length > maxShots && guard < 10000) {
    guard += 1;
    let pivot = 0;
    for (let i = 1; i < items.length; i += 1) {
      if (items[i].ideal < items[pivot].ideal) pivot = i;
    }
    const source = items[pivot];
    const neighbourIndex = pivot + 1 < items.length ? pivot + 1 : pivot - 1;
    const neighbour = items[neighbourIndex];
    if (!neighbour) break;
    const mergedIdeal = source.ideal + neighbour.ideal;
    const at = Math.min(pivot, neighbourIndex);
    items.splice(at, 2, {
      shot: neighbour.shot,
      ideal: mergedIdeal,
      before: neighbour.before,
      isNew: false,
      mergedFrom: source.shot,
    });
    merges.push({ kept: neighbour.before, removed: source.before, ideal: mergedIdeal });
  }

  const { values, residual } = allocateConserving(items.map((w) => w.ideal), target, D);
  const total = values.reduce((acc, v) => acc + v, 0);

  if (Math.abs(residual) > 1e-6) {
    warnings.push({
      code: 'quantize_residual',
      message: `目标时长 ${target} 秒无法被允许时长集合精确命中（差 ${round(residual)} 秒）——已按最接近的可行分配落盘。`,
      residual: round(residual),
      target,
    });
  }

  const changes = items.map((w, i) => {
    const after = values[i];
    const before = w.before;
    return {
      idx: i + 1,
      before,
      after,
      changed: before == null || Math.abs(before - after) > 1e-9,
    };
  });

  const summary = `时长已按后端约束调整为 ${values.map(round).join('/')}（合计 ${round(total)}）`;

  return {
    changes,
    durations: values,
    summary,
    total,
    target,
    residual,
    splits,
    merges,
    warnings,
    items: items.map((w, i) => ({ ...w, after: values[i] })),
  };
}

/**
 * 量化并**写回** `shots[].duration` 与 `provenance.authorAdded`。
 *
 * @param {Array<object>} shots 分镜数组（**就地修改**：长度与顺序可能因拆镜/并镜而变）
 * @param {number[]} allowed 允许时长集合 D
 * @param {number} targetDuration 目标总时长（秒）
 * @param {{provenance?: {authorAdded: string[]}}} [options] `provenance` 存在时，汇总记写进它
 * @returns {Array<{idx: number, before: number|null, after: number, changed: boolean}>}
 */
export function quantizeDurations(shots, allowed, targetDuration, options = {}) {
  const list = Array.isArray(shots) ? shots : [];
  if (list.length === 0) return [];

  const plan = planQuantization(list, allowed, targetDuration);

  // 写回时长 + 重排 idx（章内唯一、连续）
  const finalShots = [];
  plan.items.forEach((item, i) => {
    item.shot.duration = plan.durations[i];
    finalShots.push(item.shot);
  });
  finalShots.forEach((shot, i) => {
    shot.idx = i + 1;
  });

  // provenance：每镜一条 + 汇总一条
  for (let i = 0; i < finalShots.length; i += 1) {
    const change = plan.changes[i];
    if (!change || !change.changed) continue;
    const shot = finalShots[i];
    shot.provenance = shot.provenance ?? { userGiven: [], authorAdded: [], pendingConfirm: [] };
    shot.provenance.authorAdded = Array.isArray(shot.provenance.authorAdded) ? shot.provenance.authorAdded : [];
    shot.provenance.authorAdded.push(
      `时长已按后端约束调整：${change.before == null ? '新建' : change.before} → ${change.after}`,
    );
  }
  if (plan.summary) {
    const sink = options.provenance;
    if (sink && Array.isArray(sink.authorAdded)) {
      sink.authorAdded.push(plan.summary);
    } else if (finalShots.length > 0) {
      const anchor = finalShots[0];
      anchor.provenance = anchor.provenance ?? { userGiven: [], authorAdded: [], pendingConfirm: [] };
      anchor.provenance.authorAdded = Array.isArray(anchor.provenance.authorAdded) ? anchor.provenance.authorAdded : [];
      anchor.provenance.authorAdded.push(plan.summary);
    }
  }

  // 把结果写回调用方（保持同一个数组引用）
  list.length = 0;
  list.push(...finalShots);

  return finalShots.map((shot, i) => {
    const change = plan.changes[i] ?? { before: shot.duration, after: shot.duration };
    return {
      idx: shot.idx,
      before: change.before,
      after: shot.duration,
      changed: change.before == null || Math.abs(change.before - shot.duration) > 1e-9,
    };
  });
}
