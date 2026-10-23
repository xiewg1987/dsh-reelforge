/**
 * ReelForge 宿主半入口。
 *
 * 与 `client.js`（浏览器半）配对：
 * - 宿主半：本文件 → `src/host/apply.js`
 * - 浏览器半：`client.js` → `src/client/**`
 *
 * R7（包名三处相等）：`package.json.name` / `cordis.patch.yml` 的 `name` /
 * `client.js` 里 `window.__ModuleLoader__.load({ id })` 的 `id` 必须完全相等。
 * 跑 `node scripts/check-package-identity.mjs` 校验。
 */
import { applyReelForge } from './src/host/apply.js';

/**
 * Cordis 插件名：日志与 fiber 诊断用的显示名。
 * 与 `cordis.patch.yml` 的行 id 取同一个值（都是包名），从日志反查插件时是同一个词。
 */
export const name = '@local/reelforge';

/**
 * 宿主半依赖的服务。
 *
 * `tools` 是必需的（12 个工具要注册）；`connection` 与 `systemPrompt` 是可选的——
 * 没有 Web 外壳时没有连接，没有 Agent 时没有系统提示词，插件都应当照常工作。
 */
export const inject = ['tools'];

/**
 * 装配插件。
 *
 * @param {object} ctx 宿主上下文。
 * @param {unknown} config patch 行里的 `config:` 块。
 */
export function apply(ctx, config) {
  return applyReelForge(ctx, config);
}
