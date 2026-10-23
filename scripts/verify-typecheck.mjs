/**
 * 类型检查（typecheck）：跑 `tsc --checkJs` 检查 `src/**` 的 JSDoc 类型标注。
 *
 * ── 为什么要有 ──────────────────────────────────────────────────────────────
 * 本项目是**零依赖的纯 JS**（没有 .ts、没有运行时依赖），但 54 个生产文件里
 * 有 49 个写了 JSDoc 类型标注。这些标注**从来没被机器检查过** —— 写错了也没人知道。
 * 本脚本把它们变成会被 CI 卡住的东西。
 *
 * ── 为什么排除 `src/client/**` ───────────────────────────────────────────────
 * 客户端片段是通过 `new Function('RF','React','h', src)` 以**字符串**执行的，
 * `h` / `RF` / `React` 是宿主注入的标识符，不是模块作用域里的变量。
 * `tsc` 看不到这些注入，于是把 220 个「找不到名称 h/RF/React」当成错误——
 * 那是架构决定的，不是缺陷。
 * （同一个理由让 node 的覆盖率也不统计 `src/client/**` 的 13 个文件：
 *   覆盖率表里**文件缺席 = 视为 0%**，不是「跳过」。）
 *
 * ── tsc 从哪来 ───────────────────────────────────────────────────────────────
 * 本项目**不把 typescript 装进依赖**（保持零依赖）。脚本按顺序自寻：
 *   ① 环境变量 RF_TSC_PATH（显式指定）
 *   ② 本项目 node_modules/typescript
 *   ③ 环境变量 DSH_REPO 指向的宿主仓库 / 同级目录的 deepseek-harness
 *   ④ PATH 上的 tsc
 * 都找不到就**明确报缺什么**并给安装命令，不静默跳过。
 *
 * 用法：`node scripts/verify-typecheck.mjs`
 * 退出码：0 = 无类型错误；1 = 有类型错误；2 = 找不到 tsc（环境未就绪）。
 */
import { existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSCONFIG = path.join(ROOT, 'tsconfig.json');

/**
 * 找 tsc 可执行文件。
 * @returns {{ path: string, source: string } | null}
 */
function findTsc() {
  const envPath = process.env.RF_TSC_PATH;
  if (envPath && existsSync(envPath)) return { path: envPath, source: '环境变量 RF_TSC_PATH' };

  const local = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  if (existsSync(local)) return { path: local, source: '本项目 node_modules/typescript' };

  const candidates = [];
  if (process.env.DSH_REPO) candidates.push(path.join(process.env.DSH_REPO, 'node_modules', 'typescript', 'bin', 'tsc'));
  candidates.push(path.join(path.dirname(ROOT), 'deepseek-harness', 'node_modules', 'typescript', 'bin', 'tsc'));
  for (const candidate of candidates) {
    if (existsSync(candidate)) return { path: candidate, source: `宿主仓库的 typescript（${candidate}）` };
  }

  const onPath = spawnSync('tsc', ['--version'], { encoding: 'utf8', shell: true, windowsHide: true });
  if (onPath.status === 0) return { path: 'tsc', source: 'PATH 上的 tsc' };

  return null;
}

if (!existsSync(TSCONFIG)) {
  console.error('✗ 缺少 tsconfig.json');
  process.exit(2);
}

const tsc = findTsc();
if (!tsc) {
  console.error('✗ 找不到 tsc，无法做类型检查。');
  console.error('  本项目**不把 typescript 装进依赖**（保持零依赖），所以请用下面任一方式指路：');
  console.error('    ① 设环境变量 RF_TSC_PATH = \'<typescript 的 bin/tsc 绝对路径>\'');
  console.error('    ② 设环境变量 DSH_REPO = \'<DSH 宿主仓库路径>\'（用宿主仓库里已装的 typescript）');
  console.error('    ③ 或在本项目装一个开发依赖：pnpm add -D typescript');
  process.exit(2);
}

console.log(`tsc 来源：${tsc.source}`);

/**
 * 找 `@types/node`（脚本层要用 `process` / `node:fs` / `Buffer` 这些 Node 内置类型）。
 *
 * 与 tsc 同一个策略：项目零依赖，不装 @types/node，按「本项目 → 宿主仓库 → 放弃」找。
 * 找不到不是致命错误——只是 `scripts/**` 里的 Node 内置会报 TS2591，
 * 那部分错误在下面单独归类，不混进业务错误。
 *
 * @param {string} tscPath tsc 的位置（用来推断同级的 node_modules）。
 * @returns {string | null} @types 目录的绝对路径。
 */
function findNodeTypes(tscPath) {
  const roots = [];
  if (path.isAbsolute(tscPath)) {
    // .../node_modules/typescript/bin/tsc -> .../node_modules/@types
    const nm = path.resolve(path.dirname(tscPath), '..', '..');
    roots.push(path.join(nm, '@types'));
  }
  roots.push(path.join(ROOT, 'node_modules', '@types'));
  if (process.env.DSH_REPO) roots.push(path.join(process.env.DSH_REPO, 'node_modules', '@types'));
  roots.push(path.join(path.dirname(ROOT), 'deepseek-harness', 'node_modules', '@types'));
  for (const root of roots) {
    if (existsSync(path.join(root, 'node'))) return root;
  }
  return null;
}

const typeRoots = findNodeTypes(tsc.path);
if (typeRoots) {
  console.log(`@types/node 来源：${typeRoots}`);
} else {
  console.log('@types/node：未找到（scripts/** 的 Node 内置类型会报 TS2591，不影响 src/** 的结论）');
}

/**
 * 跑 tsc。`@types` 的位置是机器相关的，所以**不写进仓库里的 tsconfig.json**，
 * 而是用一份临时配置 `extends` 仓库配置再覆盖 typeRoots。
 * @returns {{ status: number, lines: string[] }}
 */
function runTsc() {
  const args = [tsc.path, '-p', TSCONFIG, '--pretty', 'false'];
  if (typeRoots) {
    // `extends` 之后，include/exclude 是**相对配置文件自身所在目录**解析的。
    // 临时配置放在 %TEMP%，所以必须把仓库 tsconfig 里的 include/exclude 转成绝对路径，
    // 否则 tsc 会按「%TEMP%/src/**」去找、找不到就退化成扫全项目（src/client 会被算进来）。
    const base = JSON.parse(readFileSync(TSCONFIG, 'utf8'));
    const toAbsolute = (patterns) => (patterns ?? []).map((p) => path.join(ROOT, p).replace(/\\/g, '/'));
    const tempConfig = path.join(os.tmpdir(), `rf-tsconfig-${process.pid}.json`);
    writeFileSync(tempConfig, JSON.stringify({
      extends: TSCONFIG.replace(/\\/g, '/'),
      compilerOptions: { types: ['node'], typeRoots: [typeRoots.replace(/\\/g, '/')] },
      include: toAbsolute(base.include),
      exclude: toAbsolute(base.exclude),
    }, null, 2), 'utf8');
    try {
      args[2] = tempConfig;
      const run = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT, windowsHide: true });
      const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
      return { status: run.status ?? 1, lines: output ? output.split('\n') : [] };
    } finally {
      rmSync(tempConfig, { force: true });
    }
  }
  const run = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT, windowsHide: true });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
  return { status: run.status ?? 1, lines: output ? output.split('\n') : [] };
}

const { status, lines } = runTsc();

if (status === 0) {
  console.log('✓ 类型检查通过：JSDoc 类型标注与实现一致');
  process.exit(0);
}

// tsc 的输出里，一条错误可能占多行（第一行带文件位置，后面是详情续行）。
// 按「行首是 文件(行,列): error」把续行归到它所属的那条错误上。
const groups = [];
for (const line of lines) {
  if (/^\S+\(\d+,\d+\): error TS\d+:/.test(line)) groups.push({ file: line.slice(0, line.indexOf('(')), line });
  else if (groups.length) groups[groups.length - 1].line += `\n      ${line.trim()}`;
}

const byFile = new Map();
for (const group of groups) {
  if (!byFile.has(group.file)) byFile.set(group.file, []);
  byFile.get(group.file).push(group);
}

console.error(`✗ 类型检查未通过：${groups.length} 条`);
console.error(`  涉及 ${byFile.size} 个文件：`);
for (const [file, items] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.error(`  ${file} — ${items.length} 条`);
}
console.error('');
for (const group of groups) {
  console.error(`  ${group.line}`);
}
process.exit(1);
