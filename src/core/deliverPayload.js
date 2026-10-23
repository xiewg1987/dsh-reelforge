/**
 * `reelforge-deliver` 聊天行的**纯数据组装**（F9，形状冻结在 T5 §2.4.4）。
 *
 * 冻结形状：
 *
 * ```text
 * { chapters: [ { id, title, shotCount, durationSec,
 *                  deliverables: [ { kind, label, path, bytes } ] } ] }
 * ```
 *
 * ⚠️ **形状不许自己发挥**：与 T5 的视图不一致时**改本文件，不改 T5 的视图**。
 * 因此这里**只输出上面这些字段**——不额外加键，也不把降级话术塞进 payload：
 * 降级话术走**对话文本 / 工具结果**（由宿主层拼接 `degradeNotices()`）。
 *
 * 本模块是纯逻辑，无 `ctx`。
 */

import { DELIVERABLE_KINDS } from './constants.js';

/**
 * 校验一个交付物 kind。**白名单外一律报错，不静默丢弃**（§6.5 的纪律）。
 */
export function assertDeliverableKind(kind) {
  if (!DELIVERABLE_KINDS.includes(kind)) {
    throw new Error(`未知交付物 kind：${kind}（合法值：${DELIVERABLE_KINDS.join(' / ')}）`);
  }
  return kind;
}

/**
 * 组装 `reelforge-deliver` payload。
 *
 * @param {object} input
 * @param {Array} [input.chapters] 每章 `{ id, title, shotCount, durationSec, deliverables }`
 * @returns {{chapters: Array}}
 */
export function buildDeliverPayload(input = {}) {
  const chapters = Array.isArray(input.chapters) ? input.chapters : [];
  return {
    chapters: chapters.map((chapter) => ({
      // 交付结果用 `chapterId`，冻结形状用 `id`——两种都收，输出恒为 `id`
      id: chapter?.id ?? chapter?.chapterId ?? null,
      title: chapter?.title ?? '',
      shotCount: Number(chapter?.shotCount ?? 0) || 0,
      durationSec: Number(chapter?.durationSec ?? 0) || 0,
      deliverables: (Array.isArray(chapter?.deliverables) ? chapter.deliverables : []).map((item) => ({
        kind: assertDeliverableKind(item?.kind),
        label: item?.label ?? '',
        path: item?.path ?? null,
        bytes: Number.isFinite(item?.bytes) ? Number(item.bytes) : null,
      })),
    })),
  };
}

/**
 * 形状自检——用来在合流时断言「我产出的和 T5 视图要读的是同一份」。
 * @param {Record<string, unknown>|null|undefined} payload 待校验的 payload（非对象直接 false）
 */
export function isDeliverPayloadShape(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'chapters') return false;
  if (!Array.isArray(payload.chapters)) return false;
  for (const chapter of payload.chapters) {
    const chapterKeys = Object.keys(chapter).sort().join(',');
    if (chapterKeys !== 'deliverables,durationSec,id,shotCount,title') return false;
    if (!Array.isArray(chapter.deliverables)) return false;
    for (const item of chapter.deliverables) {
      const itemKeys = Object.keys(item).sort().join(',');
      if (itemKeys !== 'bytes,kind,label,path') return false;
    }
  }
  return true;
}
