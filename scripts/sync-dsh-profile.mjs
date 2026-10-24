/**
 * 把刚构建的 client.js 同步进 DSH web profile。
 *
 * `pnpm dsh plugin add file:...` 在依赖已登记时常常 `added 0`，
 * **不会**重拷 file: 包 → 浏览器仍跑旧的 node_modules/@local/reelforge/client.js。
 *
 * 用法（在 dsh-reelforge 根目录）：
 *   node scripts/sync-dsh-profile.mjs
 *   npm run sync:dsh
 */

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const profileDir = join(homedir(), '.dsh', 'profiles', 'web');
const pluginDir = join(profileDir, 'node_modules', '@local', 'reelforge');
const marker = "'tab.hub'";

function fail(message) {
  console.error(`sync-dsh-profile: ${message}`);
  process.exit(1);
}

const built = join(root, 'client.js');
if (!existsSync(built)) {
  fail('找不到 client.js，请先 npm run build:client');
}

if (!existsSync(join(profileDir, 'package.json'))) {
  fail(`找不到 profile：${profileDir}（先跑一次 pnpm dsh web 或 plugin add）`);
}

const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
const dep = pkg.dependencies?.['@local/reelforge'] ?? '';
if (!String(dep).toLowerCase().includes('reelforge')) {
  fail('web profile 的 package.json 里没有 @local/reelforge 依赖');
}

if (existsSync(pluginDir)) {
  rmSync(pluginDir, { recursive: true, force: true });
}

const install = spawnSync('pnpm', ['install'], {
  cwd: profileDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (install.status !== 0) {
  fail('pnpm install 失败');
}

const installedClient = join(pluginDir, 'client.js');
if (!existsSync(installedClient)) {
  fail('安装后仍没有 node_modules/@local/reelforge/client.js');
}

const text = readFileSync(installedClient, 'utf8');
if (!text.includes(marker)) {
  fail(`profile 里的 client.js 不含 v6 标记 ${marker}，路径或构建可能不对`);
}

const builtSize = readFileSync(built).length;
const installedSize = readFileSync(installedClient).length;
if (builtSize !== installedSize) {
  fail(`体积不一致：仓库 ${builtSize} B，profile ${installedSize} B`);
}

console.log(`sync-dsh-profile: OK (${installedSize} bytes, v6 client in ${pluginDir})`);
console.log('下一步：重启 pnpm dsh web，浏览器 Ctrl+F5');
