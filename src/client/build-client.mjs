/**
 * 客户端产物构建脚本（T5 · R10）。
 *
 * 为什么有这一步：宿主的 Client 构建工具（tsdown + `packages/client/tsdown.client.ts`）
 * **对本插件不可用** —— 共享预设的 `workspaceManifest(id)` 只认登记在 DSH workspace 里的
 * 包名，`@local/reelforge` 是工作区外的第三方包，会直接抛错；而改用 tsdown 本身需要
 * 新增 npm 依赖并给 `package.json` 加脚本，两者都被本任务禁止。
 *
 * 所以走**单文件拼装**路线：`src/client/**` 下的片段按固定顺序拼进 `client.js`。
 *
 * - 片段是普通函数体，只用 `RF` 命名空间与闭包里的 `React` / `h`。
 * - **`.jsx` 片段先经 TypeScript 转译**（JSX → `React.createElement` 调用），
 *   `.js` 片段原样拼进去（详见 `compile.mjs`）。
 * - 产物是**确定性的**：同一份源码永远得到同一份 `client.js`（`node --test` 会比对）。
 *
 * 用法：node src/client/build-client.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildUiArtifacts } from './build-ui.mjs';
import { fragmentSource, typeScriptVersion } from './compile.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/**
 * 片段顺序：常量 → 文案 → 共享 → UI 包 → 纯函数 → 按屏外壳 → 样式 → 页签 → 流程屏 → 主壳 → 消息行 → 快捷键 → 入口。
 *
 * ⚠️ **顺序是正确性约束**：片段之间靠全局 `RF` 命名空间串联（后面的片段用前面的片段
 * 声明的东西），改顺序会让 `RF.ui` 在定义之前就被读到 ⇒ 运行时 `undefined`。
 */
export const FRAGMENTS = [
  'manifest.js',
  'locale.js',
  'shared.js',
  join('generated', 'tailwind-styles.js'),
  join('generated', 'ui-shadcn.js'),
  join('workbench', 'stageSteps.js'),
  join('workbench', 'breakpoints.js'),
  join('workbench', 'chrome.js'),
  join('workbench', 'tabs.jsx'),
  join('workbench', 'flow.jsx'),
  join('workbench', 'Workbench.jsx'),
  join('chatRows', 'index.jsx'),
  'chatEvents.js',
  join('shortcuts.js'),
  'entry.jsx',
];

/**
 * 读一个片段的**最终形态**源码。
 *
 * ⚠️ `.jsx` ⇒ 经 TypeScript 转译；`.js` ⇒ 原样。
 * 走的是 `compile.mjs` 的同一个函数 —— 构建与测试共用一条路径，
 * 不会出现「测试里能跑、构建出来是坏的」。
 *
 * @param {string} relativePath - 相对 `src/client` 的路径。
 * @returns {string} 可直接执行的 JavaScript。
 */
function readFragment(relativePath) {
  return fragmentSource(relativePath);
}

/**
 * 组装 `client.js`。
 * @returns {string} 产物文本。
 */
export async function buildClient() {
  await buildUiArtifacts();
  const parts = FRAGMENTS.map(relativePath => {
    const source = readFragment(relativePath);
    return `/* ── src/client/${relativePath.split('\\').join('/')} ───────────────────────────── */\n${source.trim()}\n`;
  });
  return [
    '/* eslint-disable */',
    '// ReelForge 客户端产物（由 `node src/client/build-client.mjs` 从 `src/client/**` 生成，请勿手改）。',
    '// 包名三处相等（R7）：package.json.name / cordis.patch.yml name / 这里的 id 必须完全一致。',
    "window.__ModuleLoader__.load({",
    "  id: '@local/reelforge',",
    '  factory: function (require) {',
    "    'use strict';",
    "    var React = require('react');",
    '    var h = React.createElement;',
    '    var RF = {};',
    '',
    parts.join('\n'),
    '',
    '    // ⚠️ `inject` 不能少：宿主把模块导出当对象插件传给 Loader，',
    '    // 不声明宿主服务，客户端整条 fiber 会失败（cordis 的 inject 守卫）。',
    '    return { inject: RF.CLIENT_INJECT, apply: RF.apply };',
    '  },',
    '});',
    '',
  ].join('\n');
}

// ⚠️ **只在本文件被当脚本直接跑的时候才写盘**。
//
// 这个文件同时是「模块」和「脚本」：单测会 `import('../build-client.mjs')` 来拿
// `buildClient()`。以前顶层无条件写盘 ⇒ **import 一次就重写一次 client.js**，
// 后果是：
//   1. 漂移单测自己把产物改对再比对 ⇒ 永远「无漂移」（它比的是自己刚写的版本）；
//   2. CI 的 `git diff --exit-code -- client.js` 那一步跑在单测之后 ⇒ 看到的永远是
//      单测刚写好的文件 ⇒ **CI 的产物漂移检查形同虚设**。
//
// 所以：被 import 时只导出函数，不碰磁盘；只有 `node build-client.mjs` 才落盘。
const isDirectRun = (() => {
  const entry = process.argv[1];
  if (typeof entry !== 'string' || entry === '') return false;
  try {
    return resolve(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  const target = join(root, 'client.js');
  const output = await buildClient();
  // ⚠️ **内容没变就不要重写**：重写会改 mtime，而 mtime 进 tarball ——
  // `npm pack` 的 `shasum` / `integrity` 就每次都变，交付报告每次出假 diff。
  // 幂等写入同时让「产物与源码一致」的判定更可信（mtime 不动 ⇒ git diff 干净）。
  let changed = true;
  try {
    changed = readFileSync(target, 'utf8') !== output;
  } catch {
    changed = true;
  }
  if (changed) {
    writeFileSync(target, output, 'utf8');
    process.stdout.write(`client.js written: ${relative(root, target)} (${output.length} bytes)\n`);
  } else {
    process.stdout.write(`client.js unchanged: ${relative(root, target)} (${output.length} bytes)\n`);
  }
  process.stdout.write(`typescript ${typeScriptVersion()}\n`);
}