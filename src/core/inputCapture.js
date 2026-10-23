/**
 * 对话输入截获（§10.5）——从宿主交给我们的消息里取出**用户原文**。
 *
 * ── 为什么要单独一个模块 ────────────────────────────────────────────────────
 *
 * 「什么算用户输入」这条规则必须能脱离宿主单测：`src/core/` 一行 `ctx` 都不出现
 * （§5.2 分层纪律），而截获规则恰恰是最容易悄悄漂移的地方（多一条消息就变一次行为）。
 *
 * ── 截获面（已对宿主源码核实）──────────────────────────────────────────────
 *
 * 宿主在 Agent 收到 prompt 前触发瀑布事件 `agent/pre-step`
 * （`packages/core/agent/src/runtime-types.ts`，payload 带 `messages` / `turn` / `step`）。
 * 本插件在**根 context** 上监听它：宿主对该事件做了 scope 过滤（未打 scope 标签的
 * 监听者全局可见），所以第三方插件在根层监听即可，不必逐个 Agent 挂。
 *
 * `messages` 是**本次从收件箱里取走的消息**：有新用户输入时非空，
 * 工具续跑的那一步为空 —— 所以「`messages` 非空」就是「这次有新的用户输入」的判据。
 */
import { TOOL_CALL_PROMPT_PREFIX } from './constants.js';

/** 截获文本的最大长度（字符）。超长时截断并**显式标注**，不静默丢内容。 */
export const INPUT_CAPTURE_MAX_CHARS = 4000;

/**
 * 从一批消息里取出用户输入的原文。
 *
 * 规则（每条都有理由，不是随手定的）：
 *
 * 1. **只看 `source.kind === 'user'`** —— 注入上下文（技能正文、运行时上下文、
 *    `agent.inject()` 通知）也是 user 角色消息，但它们不是「用户说的话」，
 *    混进来会让工作台显示一堆机器自说自话。
 * 2. **只取 `type === 'text'` 的内容块** —— 图片与文件没有文字可显示；
 *    附件本身由工作台的资产页承载。
 * 3. **多条消息按顺序拼接** —— 一次输入里可能带多段文字。
 * 4. **工作台自己发起的工具指令不算用户输入** —— 客户端点按钮时会用
 *    `remote.session.prompt` 发一句「请调用工具 X」；它走的是同一个 `kind: 'user'` 通道，
 *    不排除掉就会把工作台的输入区刷成工具调用日志。前缀由
 *    {@link TOOL_CALL_PROMPT_PREFIX} 统一冻结：客户端用它拼句子，宿主半用同一前缀识别。
 *
 * @param {readonly unknown[]} messages 宿主交来的消息数组。
 * @returns {string} 用户输入原文；没有可用输入时返回空串。
 */
export function extractCapturedInput(messages) {
  if (!Array.isArray(messages)) return '';
  const chunks = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const source = /** @type {{ source?: { kind?: unknown } }} */ (message).source;
    if (!source || source.kind !== 'user') continue;
    const content = /** @type {{ content?: unknown }} */ (message).content;
    if (!Array.isArray(content)) continue;
    const blocks = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const typed = /** @type {{ type?: unknown, text?: unknown }} */ (block);
      if (typed.type !== 'text') continue;
      const text = typeof typed.text === 'string' ? typed.text : '';
      if (text === '') continue;
      blocks.push(text);
    }
    if (blocks.length === 0) continue;
    const joined = blocks.join('\n').trim();
    if (joined === '') continue;
    // 工作台自己发出的工具指令：整条排除，不进输入区。
    if (joined.startsWith(TOOL_CALL_PROMPT_PREFIX)) continue;
    chunks.push(joined);
  }
  return truncate(chunks.join('\n').trim());
}

/**
 * 截断超长文本，并在末尾**显式标注**被截掉多少。
 *
 * 不静默截断：工作台上显示的输入若与用户实际敲的不一致，用户没法判断
 * 到底是自己写太长还是插件吃掉了内容。
 *
 * @param {string} text 原文。
 * @returns {string} 截断后的文本。
 */
export function truncate(text) {
  const value = String(text ?? '');
  if (value.length <= INPUT_CAPTURE_MAX_CHARS) return value;
  const kept = value.slice(0, INPUT_CAPTURE_MAX_CHARS);
  return `${kept}\n…（已截断，共 ${value.length} 字）`;
}
