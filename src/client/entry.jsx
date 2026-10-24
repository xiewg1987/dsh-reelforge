/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端入口：Tab 类型注册 + 页面体注册 + 标题 + 文案 + 消息行视图 + 样式 + 快捷键。
 *
 * 宿主 Tab 契约（**两段注册**，已查证 `packages/client/ui-sidebar-right`）：
 *   1. `ctx.sidebarRightTabs.register({ id, kind, ... })` —— `id` 是**类型身份**，全局唯一；
 *   2. `ctx.slots.register({ name: 'sidebar.right.pane.tab', key: definition.id }, Body)`
 *      —— ⚠️ 插槽的 key 是 **definition.id**，不是 kind。写成 kind 页面就是空白。
 *
 * R7：`window.__ModuleLoader__.load({ id })` 的 id 必须与 `package.json` 的 name、
 * `cordis.patch.yml` 的 name **完全相等**，否则 client 半静默不加载。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 客户端 locale 命名空间。 */
  RF.NAMESPACE = 'reelforge';

  /** 7 类消息行 → 视图组件。 */
  RF.CHAT_ROW_VIEWS = {
    'reelforge-progress': function (props) { return RF.chatRowProgress(props); },
    'reelforge-chapters': function (props) { return RF.chatRowChapters(props); },
    'reelforge-storyboard': function (props) { return RF.chatRowStoryboard(props); },
    'reelforge-plan': function (props) { return RF.chatRowPlan(props); },
    'reelforge-assets': function (props) { return RF.chatRowAssets(props); },
    'reelforge-deliver': function (props) { return RF.chatRowDeliver(props); },
    'reelforge-changelog': function (props) { return RF.chatRowChangelog(props); },
  };

  /**
   * 标题：右栏页签胶囊与浮动面板头部的文字。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.WorkbenchTitle = function WorkbenchTitle(props) {
    const t = typeof props.t === 'function' ? props.t : (key) => key;
    return <span>{t('title')}</span>;
  };

  /**
   * 工具 id → locale 词条前缀（`tool.<name>.label` / `tool.<name>.say`）。
   *
   * ⚠️ 这里只存**词条键**，不存文案：文案在 locale 里，en 界面要跟着切。
   * （早先这里存的是中文，en 界面整段中文 —— 现在收归 locale。）
   *
   * @type {Record<string, string>}
   */
  const TOOL_HINT_KEYS = {
    'reelforge.regenerate_shot': 'tool.regenerateShot',
    'reelforge.rollback': 'tool.rollback',
    'reelforge.run_stage': 'tool.runStage',
    'reelforge.assemble_chapter': 'tool.assembleChapter',
    'reelforge.update_shot': 'tool.updateShot',
    'reelforge.update_plan': 'tool.updatePlan',
    'reelforge.update_asset': 'tool.updateAsset',
    'reelforge.create_asset': 'tool.createAsset',
    'reelforge.bind_asset': 'tool.bindAsset',
    'reelforge.save_context': 'tool.saveContext',
    'reelforge.set_storyboard': 'tool.setStoryboard',
    'reelforge.import_novel': 'tool.importNovel',
    'reelforge.set_chapter_music': 'tool.setChapterMusic',
  };

  /**
   * 工具调用适配器（UI 写操作的唯一入口）。
   *
   * ⚠️ **接口点**：宿主客户端没有公开「直接执行工具」的 API —— 工具是模型调用的。
   * 这里的实现把 UI 的写操作**转成一条会话指令**交给模型去调对应工具（id 走 F4 的冻结表），
   * 触发类工具（回滚 / 重生成 / 合成 / 跑阶段）由宿主侧的 `ask` 机制接管。
   * 合流时请主控确认这条链路，并把这里替换成宿主最终的调用方式。
   *
   * **加固（本次）**：原实现「没有 transport ⇒ 只 `console.warn`」是**静默降质** ——
   * 用户点了没反应，界面上零反馈，只在控制台留一行字。这违反本项目的 DoD 条款
   * 「失败路径要说清缺什么、给什么替代——不许静默降质」。现在改成**可见失败 + 可重放**：
   *
   *   1. 投递不出去的请求进 `RF.actions.pending` 队列（可观测、可重放）；
   *   2. 同时发一条结构化通知（`RF.notify` → `RF.actions.notices`），
   *      文案说清**缺什么**（没有可直调工具的通道）与**给什么替代**（在对话里怎么说）；
   *   3. `console.warn` **保留**（它是诊断信息），但不再是唯一的失败信号。
   *
   * **transport 已对真实宿主核实**（DSH 0.2.1-alpha.1，`packages/api/session-controller`）：
   *   - 宿主**没有**「客户端直接执行工具」的 API —— `remote.commands` 是**斜杠命令**
   *     通道 `execute(agentId, line, attachments)`，不是工具执行器；
   *   - 唯一的通道是 **`ctx.remote.session.prompt`**（`SessionPromptRequest`：
   *     `requestId` / `sessionId` / `mode` / `content`）—— 也就是「把工具指令当一条
   *     会话消息投进去，由模型去调对应工具」这条既有设计；
   *   - `ctx.remote.session` 是**独立的服务名**（`remote.session`），必须在
   *     `RF.CLIENT_INJECT` 里声明才能读到 —— 没声明时 Cordis 的注入守卫会抛
   *     `cannot get property "remote.session" without inject`。
   */
  RF.actions = {
    /** 已经发起过的调用记录（成功与待重放都在这里）。 */
    requests: [],
    /** 投递不出去、等着重放的请求队列。 */
    pending: [],
    /** 结构化通知（默认 `RF.notify` 的落点，UI 可读、可清）。 */
    notices: [],
    /** 通知订阅者（`RF.onNotice` 注册）。 */
    listeners: [],

    /**
     * 把一条请求投给宿主。
     *
     * ⚠️ **读宿主服务属性会抛错，不是返回 undefined**：宿主的 ctx 是 Cordis 能力代理，
     * 没在 `inject` 里声明的服务，访问时抛
     * `cannot get property "<svc>" without inject`。
     * 所以「这条通道有没有」只能问在一个 try 里 —— 以前 `typeof remote.commands`
     * 写在 try **外面**，点一下「回滚」整条链直接炸飞：页面上什么都不发生
     * （用户看到的就是「点了没反应」），只有控制台一行红字。
     *
     * @param {{ toolId: string, args: object, ask: boolean }} request - 请求。
     * @returns {{ delivered: boolean, reason: string }} 投递结果。
     */
    deliver(request) {
      const ctx = RF.ctx;
      if (ctx === undefined || ctx === null) return { delivered: false, reason: 'no-remote' };
      const sessionId = RF.currentSessionId;
      if (sessionId === undefined || sessionId === '') return { delivered: false, reason: 'no-session' };

      try {
        // ⚠️ `ctx.remote.session` 读的是**服务名 `remote.session`**：宿主把每个
        // Remote 命名空间各注册成一个独立服务键
        // （`packages/api/session-controller/src/client/index.ts`）。
        // 不在 `RF.CLIENT_INJECT` 里声明它，宿主就会抛
        // `cannot get property "remote.session" without inject`。
        //
        // 宿主**没有**「客户端直接执行工具」的 API（已在真实宿主上核实）：
        // `remote.commands` 是斜杠命令通道 `execute(agentId, line, attachments)`，
        // 不是工具执行器，读它反而触发注入守卫。
        // 唯一的通道是**会话指令**：把工具 id 与参数拼成一句话投进当前会话，
        // 由模型去调对应工具。宿主半靠 `RF.TOOL_CALL_PROMPT_PREFIX` 把这句话
        // 从「用户输入」里排除（`src/core/inputCapture.js`）。
        const session = ctx.remote.session;
        if (session === undefined || session === null || typeof session.prompt !== 'function') {
          return { delivered: false, reason: 'no-transport' };
        }
        const outcome = session.prompt({
          requestId: RF.newRequestId(),
          sessionId,
          // 「排队」不是「插队」：点按钮不该打断正在跑的那一轮。
          mode: 'queue',
          content: [{
            type: 'text',
            // 前缀冻结在 `RF.TOOL_CALL_PROMPT_PREFIX`：宿主半靠它把工作台自己
            // 发出的指令从「用户输入」里排除（`src/core/inputCapture.js`）。
            text: `${RF.TOOL_CALL_PROMPT_PREFIX}${request.toolId}，参数 ${JSON.stringify(request.args)}`,
          }],
        });
        // 宿主拒收 / 传输失败 ⇒ **可见失败**，不能当成已经生效。
        if (outcome !== undefined && typeof outcome.then === 'function') {
          outcome.then(
            (result) => {
              if (result !== null && typeof result === 'object' && result.ok === false) {
                RF.actions.reportRefused(request, result.error?.message ?? '');
              }
            },
            (error) => { RF.actions.reportRefused(request, String(error)); },
          );
        }
        return { delivered: true, reason: 'session-prompt' };
      } catch (error) {
        // 通道不可用**不是**用户能理解的错误：降级到「可见失败 + 可重放」路径，
        // 绝不让一次点击把整条链炸掉。
        console.warn('[reelforge] tool transport unavailable:', error);
        return { delivered: false, reason: 'transport-unavailable' };
      }
    },

    /**
     * 发起一次工具调用。
     *
     * @param {string} toolId - 工具 id。
     * @param {object} args - 参数。
     * @param {{ ask?: boolean }} [options] - 选项。
     * @returns {{ toolId: string, args: object, ask: boolean }} 请求记录（形状不变）。
     */
    callTool(toolId, args, options) {
      const ask = options?.ask !== false && RF.TRIGGER_TOOL_IDS.indexOf(toolId) >= 0;
      const request = { toolId, args: args ?? {}, ask };
      RF.actions.requests.push(request);
      const delivery = RF.actions.deliver(request);
      if (!delivery.delivered) {
        // 投递不出去 ⇒ 入队 + 可见失败，绝不静默丢。
        RF.actions.pending.push({
          toolId: request.toolId,
          args: request.args,
          ask: request.ask,
          reason: delivery.reason,
          at: Date.now(),
          attempts: 0,
        });
        RF.notify({
          level: 'error',
          toolId: request.toolId,
          message: RF.actions.describeUndelivered(request),
        });
        // 诊断信息，保留；但**不是**唯一的失败信号（用户可见路径是上面那条通知）。
        console.warn('[reelforge] tool request has no client transport:', request);
      }
      return request;
    },

    /**
     * 拼一句「缺什么、给什么替代」的文案。
     * @param {{ toolId: string }} request - 请求。
     * @returns {string} 文案。
     */
    describeUndelivered(request) {
      const prefix = TOOL_HINT_KEYS[request.toolId];
      const label = prefix === undefined ? RF.tr('notice.unknownTool') : RF.tr(`${prefix}.label`);
      const say = prefix === undefined ? RF.tr('notice.sayFallback') : RF.tr(`${prefix}.say`);
      return RF.tr('notice.undelivered', { label, say });
    },

    /**
     * 宿主拒收 / 传输失败 ⇒ **可见失败**。
     *
     * 已经投出去但宿主没接受，和「根本投不出去」是两回事：文案要分开说，
     * 不能都报成「还没接上工具通道」。
     *
     * @param {{ toolId: string, args: object, ask: boolean }} request - 请求。
     * @param {string} reason - 宿主给的原因（可空）。
     * @returns {void}
     */
    reportRefused(request, reason) {
      const prefix = TOOL_HINT_KEYS[request.toolId];
      const label = prefix === undefined ? RF.tr('notice.unknownTool') : RF.tr(`${prefix}.label`);
      const say = prefix === undefined ? RF.tr('notice.sayFallback') : RF.tr(`${prefix}.say`);
      RF.notify({
        level: 'error',
        toolId: request.toolId,
        message: RF.tr('notice.hostRefused', { label, say, reason: reason ?? '' }),
      });
      console.warn('[reelforge] host refused the tool request:', request, reason);
    },

    /**
     * 重放待办队列：逐条再投一次，投出去的出队，投不出去的留下并累加尝试次数。
     *
     * @returns {{ delivered: number, remaining: number }} 结果。
     */
    retryPending() {
      const remaining = [];
      let delivered = 0;
      for (const entry of RF.actions.pending) {
        const request = { toolId: entry.toolId, args: entry.args, ask: entry.ask };
        const result = RF.actions.deliver(request);
        if (result.delivered) {
          delivered += 1;
          RF.actions.requests.push(request);
        } else {
          remaining.push({ ...entry, attempts: (entry.attempts ?? 0) + 1 });
        }
      }
      // 原地改写，保留数组身份（UI 可能已经持有引用）。
      RF.actions.pending.length = 0;
      for (const entry of remaining) RF.actions.pending.push(entry);
      if (delivered > 0) {
        RF.notify({ level: 'info', message: RF.tr('notice.replayed', { count: delivered }) });
      }
      if (remaining.length > 0) {
        RF.notify({
          level: 'error',
          message: RF.tr('notice.stillPending', { count: remaining.length }),
        });
      }
      return { delivered, remaining: remaining.length };
    },
  };

  /**
   * 通知钩子：默认实现**不依赖宿主 API**，纯前端即可工作。
   *
   * - 默认实现：把结构化通知塞进 `RF.actions.notices`（UI 可读、可清）；
   * - 可替换：宿主或 UI 可以整体换掉 `RF.notify`，也可以用 `RF.onNotice` 订阅 ——
   *   这样将来接上真正的「直接执行工具」通道时，**这里一行都不用改**。
   *
   * @param {{ level: string, toolId?: string, message: string }} notice - 通知。
   * @returns {object} 原样返回这条通知。
   */
  RF.notify = function notify(notice) {
    RF.actions.notices.push(notice);
    for (const listener of RF.actions.listeners.slice()) {
      try {
        listener(notice);
      } catch (error) {
        console.error('[reelforge] notice listener failed:', error);
      }
    }
    return notice;
  };

  /**
   * 订阅通知（与替换 `RF.notify` 二选一或并用）。
   * @param {(notice: object) => void} listener - 监听器。
   * @returns {function} 退订函数。
   */
  RF.onNotice = function onNotice(listener) {
    if (typeof listener !== 'function') return () => undefined;
    RF.actions.listeners.push(listener);
    return () => {
      const index = RF.actions.listeners.indexOf(listener);
      if (index >= 0) RF.actions.listeners.splice(index, 1);
    };
  };

  /**
   * 注入插件自有样式（只用 `--dsw-alias-*` token）。
   * @returns {function} 清理函数。
   */
  RF.injectStyles = function injectStyles() {
    if (typeof document === 'undefined') return () => {};
    const tag = document.createElement('style');
    tag.dataset.plugin = RF.TAB_TYPE_ID;
    tag.dataset.pluginCss = `${RF.TAB_TYPE_ID}/workbench.css`;
    tag.textContent = RF.TAILWIND_STYLES ?? RF.STYLES ?? '';
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  };

  /**
   * 客户端插件主体。
   * @param {object} ctx - 客户端根上下文。
   * @returns {void}
   */
  RF.apply = function apply(ctx) {
    RF.ctx = ctx;
    RF.React = RF.React ?? (typeof React === 'undefined' ? undefined : React);

    ctx.effect(() => RF.injectStyles(), 'reelforge: styles');
    ctx.effect(() => ctx.locale.register(RF.NAMESPACE, RF.locale), 'reelforge: dictionaries');
    const t = ctx.locale.bind(RF.NAMESPACE);
    RF.t = t;
    RF.chatRows.t = t;

    // ── 阶段一：Tab **类型**（id 是类型身份，全局唯一） ──
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: RF.TAB_TYPE_ID,
      kind: RF.TAB_KIND,
      title: () => t('title'),
      guide: [{ id: 'reelforge-workbench', order: 0, title: () => t('title'), description: () => t('subtitle') }],
    }), 'reelforge: workbench tab type');

    // ── 阶段二：页面体（插槽 key = definition.id，**不是 kind**） ──
    // ⚠️ `inject: (sessionId) => ({ sessionId })` **不能少**：右栏页签体是
    // **会话作用域**插槽，只有声明了这个 inject 面，宿主才会把会话 id 递进来
    // （宿主做法见 `packages/client/ui-sidebar-browser/src/client/index.ts`：
    // `inject: (sessionId, actions) => {...}`）。
    // 没有它 → `props.sessionId` 是 undefined → `RF.currentSessionId` 永远是空
    // → 写操作（回滚 / 生成 / 改时长）**全部投递不出去**。
    ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: RF.TAB_TYPE_ID,
      locale: RF.NAMESPACE,
      inject: sessionId => ({ sessionId }),
    }, RF.Workbench)), 'reelforge: workbench body');

    // ⚠️ `locale: RF.NAMESPACE` **不能少**：宿主只在注册声明了 `locale:` 时
    // 才往组件 props 里注入 `t`（`packages/client/ui-renderer/.../scoped-slots.tsx`）。
    // 少了这一行，`RF.WorkbenchTitle` 就退到 `(key) => key` 的兜底，
    // 右栏页签胶囊上会显示字面量 **title** 而不是「ReelForge 工作台」。
    ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab.title',
      key: RF.TAB_TYPE_ID,
      locale: RF.NAMESPACE,
    }, RF.WorkbenchTitle)), 'reelforge: workbench title');

    // ── 7 类对话消息行：视图注册在 `conversation.chat.node`，键为事件定义的 kind ──
    for (const kind of RF.CHAT_ROW_KINDS) {
      const view = RF.CHAT_ROW_VIEWS[kind];
      ctx.effect(() => ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: kind,
        locale: RF.NAMESPACE,
      }, view)), `reelforge: chat row ${kind}`);
    }

    // ── 投影订阅：把宿主投影喂进模块级单例（R14） ──
    ctx.effect(() => RF.bindProjection(ctx), 'reelforge: projection binding');

    // ── 7 个 kind 的事件定义（挂已有的 `tool/result`，不新增会话事件 type） ──
    ctx.inject(['uiConversation'], (scoped) => {
      RF.registerChatEvents(scoped);
    });

    // ── 快捷键 ──
    RF.registerShortcuts(ctx);
  };
})(RF);
