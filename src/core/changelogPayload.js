/**
 * `reelforge-changelog` 聊天行的**纯数据组装**（F9，形状冻结在 T5 §2.4.4）。
 *
 * 冻结形状：
 *
 * ```text
 * { entries: [ { id, at, summary, field, batchId?, drifted? } ],
 *   modes: ['single','batch','timepoint'] }
 * ```
 *
 * ⚠️ **形状不许自己发挥**：与 T5 的视图不一致时**改本文件，不改 T5 的视图**。
 *
 * `drifted` 表示**这条变更现在已经漂移**（快照之后该行又被改过 →
 * 直接回滚会被漂移保护 409 拒绝）。它是可选字段：不是漂移时**不出现**，
 * 与 `batchId?` 的处理方式一致。
 *
 * 本模块是纯逻辑，无 `ctx`。
 */

import { ROLLBACK_MODES } from './changelog.js';

/**
 * 组装 `reelforge-changelog` payload。
 *
 * @param {object} input
 * @param {Array} [input.entries] 变更日志条目
 * @param {Function|Set} [input.isDrifted] 漂移判定：`(entry) => boolean` 或漂移 id 的 Set
 * @returns {{entries: Array, modes: string[]}}
 */
export function buildChangelogPayload(input = {}) {
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const drift = input.isDrifted;
  const isDrifted = (entry) => {
    if (typeof drift === 'function') return Boolean(drift(entry));
    if (drift instanceof Set) return drift.has(entry?.id);
    return false;
  };

  return {
    entries: entries.map((entry) => {
      const item = {
        id: entry?.id ?? null,
        at: entry?.at ?? null,
        summary: entry?.summary ?? '',
        field: entry?.field ?? '*',
      };
      if (entry?.batchId) item.batchId = entry.batchId;
      if (isDrifted(entry)) item.drifted = true;
      return item;
    }),
    modes: [...ROLLBACK_MODES],
  };
}

/**
 * 形状自检。
 * @param {Record<string, unknown>|null|undefined} payload 待校验的 payload（非对象直接 false）
 */
export function isChangelogPayloadShape(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const keys = Object.keys(payload).sort().join(',');
  if (keys !== 'entries,modes') return false;
  if (!Array.isArray(payload.entries)) return false;
  for (const entry of payload.entries) {
    const entryKeys = Object.keys(entry);
    const allowed = new Set(['id', 'at', 'summary', 'field', 'batchId', 'drifted']);
    for (const key of entryKeys) {
      if (!allowed.has(key)) return false;
    }
    for (const required of ['id', 'at', 'summary', 'field']) {
      if (!entryKeys.includes(required)) return false;
    }
  }
  if (!Array.isArray(payload.modes)) return false;
  return payload.modes.join(',') === ROLLBACK_MODES.join(',');
}
