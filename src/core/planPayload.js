/**
 * `reelforge-plan` 行的数据组装（**F9** 冻结形状）。
 *
 * 形状：`{ kind, position, provider?, candidates: [{ kind, position, sourceFile, label }] }`
 *
 * 枚举只从 `src/core/constants.js` 取（F8）：kind 走 `GENERATION_KINDS`，
 * 执行位置走 `RUN_POSITIONS`，云端 provider 走 `CLOUD_PROVIDERS`。
 *
 * 纯逻辑、无宿主依赖、可单测。
 */

import { CLOUD_PROVIDERS, GENERATION_KINDS, RUN_POSITIONS } from './constants.js';

/**
 * 归一化一个候选（kind × 位置 → 规格来源）。
 * @param {unknown} candidate - 候选。
 * @returns {{ kind: string, position: string, sourceFile: string, label: string } | null} 归一化结果。
 */
function normalizeCandidate(candidate) {
  if (candidate === null || typeof candidate !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (candidate);
  const kind = typeof record.kind === 'string' ? record.kind : '';
  const position = typeof record.position === 'string' ? record.position : '';
  if (!GENERATION_KINDS.includes(kind)) return null;
  if (!RUN_POSITIONS.includes(position)) return null;
  const sourceFile = typeof record.sourceFile === 'string' ? record.sourceFile : '';
  const label = typeof record.label === 'string' && record.label.trim() !== '' ? record.label : `${kind} · ${position}`;
  return { kind, position, sourceFile, label };
}

/**
 * 组装 `reelforge-plan` 行数据。
 *
 * @param {{ kind?: string, position?: string, provider?: string, candidates?: readonly unknown[] }} input - 输入。
 * @returns {{ ok: boolean, payload: { kind: string, position: string, provider?: string, candidates: Array<{ kind: string, position: string, sourceFile: string, label: string }> }, errors: string[] }}
 */
export function buildPlanPayload(input) {
  /** @type {string[]} */
  const errors = [];
  const kind = typeof input?.kind === 'string' ? input.kind : '';
  const position = typeof input?.position === 'string' ? input.position : '';
  if (!GENERATION_KINDS.includes(kind)) errors.push(`kind: "${kind}" is not one of ${GENERATION_KINDS.join(' / ')}`);
  if (!RUN_POSITIONS.includes(position)) errors.push(`position: "${position}" is not one of ${RUN_POSITIONS.join(' / ')}`);

  /** @type {Array<{ kind: string, position: string, sourceFile: string, label: string }>} */
  const candidates = [];
  for (const candidate of input?.candidates ?? []) {
    const normalized = normalizeCandidate(candidate);
    if (normalized !== null) candidates.push(normalized);
  }

  const provider = typeof input?.provider === 'string' && input.provider.trim() !== '' ? input.provider : undefined;
  if (provider !== undefined && position === 'cloud' && !CLOUD_PROVIDERS.includes(provider)) {
    errors.push(`provider: "${provider}" is not one of ${CLOUD_PROVIDERS.join(' / ')}`);
  }

  /** @type {{ kind: string, position: string, provider?: string, candidates: typeof candidates }} */
  const payload = {
    kind,
    position,
    ...(provider === undefined ? {} : { provider }),
    candidates,
  };
  return { ok: errors.length === 0, payload, errors };
}

/**
 * 在对话行里改「kind × 执行位置」——**不烧钱，不走 ask**（§2.4.2）。
 *
 * 改的是方案，不是产物：只改当前选中的 kind 与 position，
 * 若候选表里有对应项则同步它的 `sourceFile` 与 `label`。
 *
 * @param {object} payload - 现有行数据。
 * @param {{ kind?: string, position?: string }} patch - 改动。
 * @returns {{ ok: boolean, payload: object, errors: string[] }} 结论。
 */
export function patchPlanSelection(payload, patch) {
  const current = payload !== null && typeof payload === 'object' ? /** @type {Record<string, unknown>} */ (payload) : {};
  const nextKind = typeof patch?.kind === 'string' && patch.kind !== '' ? patch.kind : String(current.kind ?? '');
  const nextPosition = typeof patch?.position === 'string' && patch.position !== '' ? patch.position : String(current.position ?? '');
  const candidates = Array.isArray(current.candidates) ? current.candidates : [];
  const matched = candidates.find(entry => entry !== null && typeof entry === 'object'
    && /** @type {Record<string, unknown>} */ (entry).kind === nextKind
    && /** @type {Record<string, unknown>} */ (entry).position === nextPosition);
  return buildPlanPayload({
    kind: nextKind,
    position: nextPosition,
    ...(typeof current.provider === 'string' ? { provider: current.provider } : {}),
    candidates,
    ...(matched === undefined ? {} : {}),
  });
}

export default buildPlanPayload;
