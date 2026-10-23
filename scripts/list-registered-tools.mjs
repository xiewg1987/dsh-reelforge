/**
 * 列出插件向宿主 `tools.register` 提交的全部工具定义。
 *
 * 为什么需要它：T1 的验收标准原本写的是「`cordis_inspect_query --service Tool` 能看到 13 个工具」。
 * 但在 DSH 0.2.1-alpha.1 里，`cordis_inspect_query` 是**暴露给模型用的宿主工具**
 * （见 `packages/preset/agent-preset/skills/cordis-plugin-development`），不是 PATH 上的 CLI；
 * 本机没有 LLM 通道时无法由模型发起调用。
 *
 * 所以这里给出**等价证据**：插件 `apply()` 之后，到底向宿主的工具服务提交了哪些工具定义。
 * 配套的真机证据在 `docs/开发任务/实机/`：
 *   ① 真实 DSH 宿主激活插件时**没有** `1 entry did not activate` 告警（注册失败就会失败整个 entry）；
 *   ② 用宿主自己的 `assertSupportedJsonSchema` 审这批定义：0 / 15 不合规。
 *
 * 用法：`node scripts/list-registered-tools.mjs`
 * 退出码 0 = 工具齐备；非 0 = 数量或命名不符合预期。
 */
import { apply, name as PLUGIN_NAME } from '../index.js';
import { TOOL_IDS } from '../src/core/constants.js';

/** 宿主上下文里本脚本关心的几个面（其余服务这个插件用不到）。 */
const registeredTools = [];
const listeners = new Map();
const routes = [];
const projections = [];
const promptSections = [];

const scoped = {
  sessionProjections: {
    register(definition) {
      projections.push(definition);
      return () => undefined;
    },
  },
  systemPrompt: {
    getSectionOrder: () => 0,
    section(definition) {
      promptSections.push(definition);
      return () => undefined;
    },
  },
  connection: {
    fetch: {
      register(route) {
        routes.push(route);
        return () => undefined;
      },
    },
  },
};

const ctx = {
  tools: {
    register(definition) {
      registeredTools.push(definition);
      return () => undefined;
    },
  },
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(handler);
    return () => undefined;
  },
  inject(names, callback) {
    callback(scoped);
    return () => undefined;
  },
};

const dispose = apply(ctx, {
  workspaceDir: '.reelforge',
  runPosition: 'cloud',
  cloudProvider: 'dsh',
});

console.log(`插件：${PLUGIN_NAME}`);
console.log(`向宿主 tools.register 提交的工具：${registeredTools.length} 个\n`);

for (const tool of registeredTools) {
  const description = String(tool.description ?? '').split('\n')[0].trim();
  console.log(`· ${tool.name}`);
  console.log(`    ${description}`);
}

console.log('');
console.log(`路由 ${routes.length} 条：${routes.map((r) => r.path).join('、')}`);
console.log(`投影单元 ${projections.length} 个 · systemPrompt 段 ${promptSections.length} 个 · 监听 ${[...listeners.keys()].join('、')}`);

/** 预期：13 个 ReelForge 工具 + 2 个只读技能工具 = 15 个。 */
const expectedIds = Object.values(TOOL_IDS);
const missing = expectedIds.filter((id) => !registeredTools.some((tool) => tool.name === id));

dispose?.();

if (missing.length) {
  console.error(`\n✗ 缺工具：${missing.join('、')}`);
  process.exit(1);
}
console.log(`\n✓ ${expectedIds.length} 个预期工具全部注册到位（共 ${registeredTools.length} 个）`);
