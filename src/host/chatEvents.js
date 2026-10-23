/**
 * ReelForge 会话消息行的事件契约（**F9** · T5 独占文件）。
 *
 * ⚠️ 重要：**7 个 kind 的事件定义与 `conversation.chat.node` 视图注册发生在客户端**——
 * `conversation.chat.node` 是客户端插槽（`ctx.slots`），`ctx.uiConversation` 也是客户端服务。
 * 因此：
 *   - **客户端侧**的实现见 `src/client/chatEvents.js`（它被拼进 `client.js` 产物）；
 *   - **本文件**是同一契约的**权威纯逻辑副本**：事件 type、kind 字段路径、
 *     负载匹配器与行数据形状，供宿主侧的工具实现与测试引用。
 *
 * R2（**绝不新增会话事件 `type`**）：7 个 kind **全部挂在已有的 `tool/result` 事件类型上**，
 * 由工具结果负载里的 `reelforge.kind` 声明是哪一行。插件私有数据（进度快照、
 * 阶段耗时）放**存储服务**，不进会话事件。
 *
 * 验收 A15 要求「注册前后会话事件 `type` 集合的差集为空」——
 * 本文件导出的 `CHAT_ROW_EVENT_TYPE` 就是注册前后都存在的那一个 type，
 * 客户端只注册**事件定义**（`ctx.uiConversation.events.register`），
 * 它**不追加任何会话事件**，所以 type 集合不变。
 */

/** 7 个 kind 全部挂靠的**已有**会话事件 type（注册前后都不新增）。 */
export const CHAT_ROW_EVENT_TYPE = 'tool/result';

/** 工具结果负载里声明「这一条是哪一行」的字段路径。 */
export const CHAT_ROW_KIND_FIELD = 'reelforge.kind';

/** 7 类结构化消息行（与 `src/core/constants.js` 的 `CHAT_ROW_KINDS` 一致）。 */
export const CHAT_ROW_KINDS = Object.freeze([
  'reelforge-progress',
  'reelforge-chapters',
  'reelforge-storyboard',
  'reelforge-plan',
  'reelforge-assets',
  'reelforge-deliver',
  'reelforge-changelog',
]);

/** 默认折叠的消息行。 */
export const CHAT_ROW_COLLAPSIBLE = Object.freeze([
  'reelforge-progress',
  'reelforge-chapters',
  'reelforge-storyboard',
]);

/**
 * 判断一个会话事件是不是 ReelForge 消息行。
 * @param {unknown} event - 会话事件。
 * @returns {boolean} 是否是。
 */
export function isChatRowEvent(event) {
  return readChatRowPayload(event) !== null;
}

/**
 * 读一个会话事件里的 ReelForge 行负载。
 * @param {unknown} event - 会话事件。
 * @returns {object | null} 负载；不是行事件时为 null。
 */
export function readChatRowPayload(event) {
  if (event === null || typeof event !== 'object') return null;
  const record = /** @type {Record<string, any>} */ (event);
  if (record.type !== CHAT_ROW_EVENT_TYPE) return null;
  const data = record.data;
  if (data === null || typeof data !== 'object') return null;
  const direct = data.reelforge;
  if (direct !== null && typeof direct === 'object') return direct;
  const meta = data.meta;
  if (meta !== null && typeof meta === 'object' && meta.reelforge !== null && typeof meta.reelforge === 'object') {
    return meta.reelforge;
  }
  return null;
}

/**
 * 读一个会话事件声明的行 kind。
 * @param {unknown} event - 会话事件。
 * @returns {string | null} kind。
 */
export function readChatRowKind(event) {
  const payload = readChatRowPayload(event);
  if (payload === null) return null;
  const kind = payload.kind;
  return typeof kind === 'string' ? kind : null;
}

/**
 * 行数据的形状校验：只认已冻结的 7 个 kind。
 * @param {unknown} kind - 候选 kind。
 * @returns {boolean} 是否合法。
 */
export function isChatRowKind(kind) {
  return typeof kind === 'string' && CHAT_ROW_KINDS.includes(kind);
}
