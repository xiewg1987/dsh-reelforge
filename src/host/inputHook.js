/**
 * 对话输入截获钩子（§10.5）。
 *
 * ── 接入面（已对宿主源码核实）──────────────────────────────────────────────
 *
 * 宿主在 Agent 收到 prompt 之前触发瀑布事件 `agent/pre-step`
 * （`packages/core/agent/src/runtime-types.ts`）：
 *
 * ```ts
 * 'agent/pre-step'(this: Scoped<Agent>, payload: {
 *   agent: Agent; messages: UserMessage[]; turn: number; step: number; signal: AbortSignal
 * }, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>
 * ```
 *
 * 宿主对它做了 scope 过滤：**未打 scope 标签的监听者全局可见**
 * （`packages/core/scope/src/index.ts` 的 `scopeTarget`），所以第三方插件在根
 * context 上监听一次就能覆盖所有会话，不必逐个 Agent 挂 —— 这也是宿主自带的
 * `tool-skill` 插件用的同一手法。
 *
 * ── 为什么要「先 `next()` 再截获」───────────────────────────────────────────
 *
 * 瀑布事件的约定是：调用 `next()` 拿到下游的决策，再决定是否改写。
 * 本插件**不改写**决策（只观察），但**顺序**很关键：
 *
 * - 下游若 `reject`，这一步的消息不会进入模型、也不会被记进会话日志
 *   （宿主文档：「If the proposed step is rejected, the claimed message ends here」）。
 *   此时不截获，才能保证「钩子截获到的」与「日志重放能重建的」**严格同源**
 *   （R1：会话日志是唯一事实源）。
 * - 反过来先截获再 `next()`，就会留下一条日志里查无此文的输入。
 *
 * 本模块**不改写** prompt：`PreStepDecision.messages` 一行不动。
 * 「提示词要怎么改」是另一件事，落在 `src/core/promptSection.js`（systemPrompt 段落）。
 */
import { extractCapturedInput } from '../core/inputCapture.js';

/**
 * 注册输入截获钩子。
 *
 * @param {object} ctx 宿主上下文。
 * @param {import('./projection.js').ProjectionStore} store 投影存储。
 * @returns {() => void} 注销函数。
 */
export function registerInputHook(ctx, store) {
  return ctx.on('agent/pre-step', async ({ agent, messages }, next) => {
    const decision = await next();
    if (decision.kind === 'reject') return decision;

    const text = extractCapturedInput(messages);
    if (text === '') return decision;

    const sessionId = sessionIdOf(agent);
    if (sessionId === '') return decision;

    store.apply(sessionId, { op: 'input.set', value: { text } });
    return decision;
  });
}

/**
 * 取 Agent 所属会话的 id。
 *
 * @param {unknown} agent 宿主给的 Agent。
 * @returns {string} 会话 id；取不到时返回空串。
 */
function sessionIdOf(agent) {
  if (!agent || typeof agent !== 'object') return '';
  const session = /** @type {{ session?: { id?: unknown } }} */ (agent).session;
  if (!session || typeof session !== 'object') return '';
  const id = session.id;
  return typeof id === 'string' && id !== '' ? id : '';
}
