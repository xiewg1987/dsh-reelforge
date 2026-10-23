/* ─────────────────────────────────────────────────────────────────────────────
 * 7 个 kind 的**会话事件定义** + `conversation.chat.node` 视图注册（客户端侧）。
 *
 * R2：**绝不新增会话事件 `type`**。7 个 kind 全部挂在**已有的** `tool/result`
 * 事件类型上；哪一行由工具结果负载里的 `reelforge.kind` 声明。
 * 插件私有数据（进度快照、阶段耗时）走**存储服务**，不进会话事件。
 *
 * 视图注册在 `conversation.chat.node` 插槽，**键为事件定义的 kind**。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 7 个 kind 全部挂靠的**已有**会话事件 type（R2：不新增 type）。 */
  RF.CHAT_ROW_EVENT_TYPE = 'tool/result';

  /** 工具结果负载里声明「这一条是哪一行」的字段路径。 */
  RF.CHAT_ROW_KIND_FIELD = 'reelforge.kind';

  /**
   * 从一个事件里读出 ReelForge 行负载。
   * @param {object} event - 会话事件。
   * @returns {object | null} 负载。
   */
  RF.chatRowPayload = function chatRowPayload(event) {
    if (event === null || typeof event !== 'object') return null;
    if (event.type !== RF.CHAT_ROW_EVENT_TYPE) return null;
    const data = event.data;
    if (data === null || typeof data !== 'object') return null;
    const meta = data.meta !== null && typeof data.meta === 'object' ? data.meta : null;
    const direct = data.reelforge !== null && typeof data.reelforge === 'object' ? data.reelforge : null;
    const payload = direct ?? (meta !== null && meta.reelforge !== null && typeof meta.reelforge === 'object' ? meta.reelforge : null);
    return payload;
  };

  /**
   * 生成一个 kind 的事件定义。
   * @param {string} kind - 消息行 kind。
   * @returns {object} 事件定义。
   */
  RF.chatEventDefinition = function chatEventDefinition(kind) {
    return {
      kind,
      target: 'chat',
      match(event) {
        const payload = RF.chatRowPayload(event);
        if (payload === null) return null;
        if (payload.kind !== kind) return null;
        const data = /** @type {any} */ (event).data ?? {};
        const id = String(data.toolCallId ?? data.callId ?? /** @type {any} */ (event).seq ?? kind);
        return { id: `${kind}:${id}`, role: 'update' };
      },
      start(context, match) {
        return { payload: RF.chatRowPayload(match.event) ?? {} };
      },
      update(context, match) {
        const payload = RF.chatRowPayload(match.event);
        if (payload === null) return context.state;
        return { payload };
      },
      buildViewNode(context) {
        const matches = context.matches ?? [];
        const last = matches.length === 0 ? undefined : matches[matches.length - 1];
        const seq = last?.event?.seq ?? 0;
        return {
          key: context.key,
          kind,
          id: context.id,
          target: 'chat',
          anchorSeq: seq,
          location: context.start?.location ?? { kind: 'unresolved' },
          visibility: 'visible',
          data: context.state?.payload ?? {},
        };
      },
    };
  };

  /**
   * 注册 7 个事件定义。
   * @param {object} ctx - 客户端上下文。
   * @returns {void}
   */
  RF.registerChatEvents = function registerChatEvents(ctx) {
    for (const kind of RF.CHAT_ROW_KINDS) {
      ctx.effect(() => ctx.uiConversation.events.register(RF.chatEventDefinition(kind)), `reelforge: chat event ${kind}`);
    }
  };
})(RF);
