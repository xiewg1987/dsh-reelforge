/**
 * 客户端片段的 JSX 转译（T5 · R10 的补齐）。
 *
 * ## 为什么需要这一步 ────────────────────────────────────────────────────────
 *
 * 宿主注入的 `React` 只有 `React.createElement` 这一个入口，**没有 JSX 运行时**
 * （`react/jsx-runtime` 宿主不提供）。而页面要按 React 的写法写，就得有 JSX。
 *
 * 所以：**源码用 JSX 写，构建时转成 `React.createElement` 调用。**
 *
 * ## 为什么用 TypeScript 而不是加一个新依赖 ──────────────────────────────────
 *
 * - `typescript` **本来就是 devDependency**（`package.json` 里已声明），
 *   零新增依赖、零新增运行时依赖；
 * - 宿主包的构建工具（tsdown）认不了工作区外的第三方包名，用不了；
 * - `ts.transpileModule` 只做**语法层转译**，不做类型检查 ——
 *   片段里 `RF` / `h` / `React` 都是宿主注入的标识符（模块作用域里不存在），
 *   类型检查本来就对它们无意义（`tsconfig.json` 已把 `src/client/**` 排除）。
 *
 * ## 文件扩展名的约定 ──────────────────────────────────────────────────────
 *
 * - `.jsx` = **含 JSX 的片段** ⇒ 构建时必须转译；
 * - `.js`  = **纯 JavaScript 的片段**（常量 / 文案 / 样式表 / 纯函数）⇒ 原样拼进产物。
 *
 * 靠扩展名区分，构建脚本就不需要维护「哪个文件要转译」的名单，也不会漏。
 *
 * ## 转译选项为什么这么定 ──────────────────────────────────────────────────
 *
 * | 选项 | 值 | 理由 |
 * |---|---|---|
 * | `jsx` | `React`（经典运行时） | 自动运行时要 `require('react/jsx-runtime')`，**宿主没有这个包** ⇒ 会直接装载失败。 |
 * | `jsxFactory` | `h` | 产物壳里已经有 `var h = React.createElement;` ⇒ 产物形状与今天**逐字一致**，宿主契约一个字不改。 |
 * | `jsxFragmentFactory` | `React.Fragment` | `<>…</>` 的落点；`React` 在产物作用域与测试作用域里都在。 |
 * | `alwaysStrict` | 缺省（不显式关） | 显式写 `false` 在 TypeScript 6.0 已废弃（会**阻断**转译）。缺省时 `strict: false` ⇒ 不注入 `"use strict"` 前导 —— 片段是被**拼进同一个函数体**的，插在中间的那句只是无意义的表达式语句。片段自己的 IIFE 里本来就有 `'use strict';`。 |
 * | `target` | `ES2022` | 与 `tsconfig.json` 一致；不改语法级别（`?.` / `??` 等原样保留）。 |
 * | `removeComments` | `false` | 注释是这套代码的**主要信息载体**（踩过的坑都写在注释里）⇒ 必须留。 |
 * | `newLine` | `LineFeed` | Windows / Linux 产出必须逐字相同，否则 CI 的产物漂移检查会随机变红。 |
 *
 * ## 确定性 ────────────────────────────────────────────────────────────────
 *
 * 同一份源码 ⇒ 同一份产物（`transpileModule` 是纯函数，已实测两次转译逐字相同）。
 * ⚠️ 但**转译结果依赖 TypeScript 的版本**（打印器行为可能变）⇒
 * `typescript` 在 `package.json` 里必须**钉死精确版本**，否则 `npm install` 换个
 * 小版本就可能让 `client.js` 漂移、CI 的漂移检查变红。
 *
 * 用法：
 * ```js
 * import { fragmentSource } from './compile.mjs';
 * const js = fragmentSource('workbench/flow.jsx');
 * ```
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** 仓库根目录。 */
export const ROOT = join(here, '..', '..');
/** 客户端源码目录。 */
export const CLIENT_DIR = here;

/**
 * TypeScript 模块（懒加载一次，之后复用）。
 * @type {{ ts: object, source: string } | null}
 */
let typescriptCache = null;

/**
 * 找 TypeScript。
 *
 * 顺序：本项目 `node_modules` → `DSH_REPO` 指向的宿主仓库 → 同级的 `deepseek-harness`。
 * 找不到就**明确报缺什么**（给出安装命令），不静默跳过 ——
 * 静默跳过等于让构建产出「看起来成功、其实是旧的」产物。
 *
 * @returns {{ ts: object, source: string }}
 */
function resolveTypeScript() {
  if (typescriptCache !== null) return typescriptCache;
  const attempts = [];
  const requireFrom = (baseDir) => createRequire(join(baseDir, 'package.json'));

  attempts.push(['本项目 node_modules/typescript', () => requireFrom(ROOT)('typescript')]);

  const hostRepos = [];
  if (process.env.DSH_REPO) hostRepos.push(process.env.DSH_REPO);
  hostRepos.push(join(dirname(ROOT), 'deepseek-harness'));
  for (const repo of hostRepos) {
    if (!existsSync(join(repo, 'node_modules', 'typescript'))) continue;
    attempts.push([`宿主仓库的 typescript（${repo}）`, () => requireFrom(repo)('typescript')]);
  }

  const failures = [];
  for (const [source, load] of attempts) {
    try {
      const ts = load();
      if (ts && typeof ts.transpileModule === 'function') {
        typescriptCache = { ts, source };
        return typescriptCache;
      }
      failures.push(`${source}：不是可用的 TypeScript`);
    } catch (error) {
      failures.push(`${source}：${error?.message ?? String(error)}`);
    }
  }

  throw new Error([
    '✗ 找不到可用的 TypeScript，无法把客户端片段里的 JSX 转成 React.createElement 调用。',
    '  试过的位置：',
    ...failures.map(line => `    · ${line}`),
    '  装一个开发依赖即可（它只服务于构建，不进产物）：',
    '    npm install --no-save typescript@' + pinnedVersion(),
    '  或设 DSH_REPO 指向装了 typescript 的 DSH 宿主仓库。',
  ].join('\n'));
}

/**
 * `package.json` 里声明的 typescript 版本（转译结果依赖它 ⇒ 必须钉死）。
 * @returns {string} 版本号。
 */
function pinnedVersion() {
  try {
    const require = createRequire(join(ROOT, 'package.json'));
    const pkg = require('./package.json');
    return String(pkg?.devDependencies?.typescript ?? 'latest');
  } catch {
    return 'latest';
  }
}

/**
 * 转译选项（见文件头表格）。枚举值必须来自真实的 TypeScript，不能写死数字。
 *
 * @param {object} ts - TypeScript 模块。
 * @returns {object} compilerOptions。
 */
export function jsxCompilerOptions(ts) {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.React,
    jsxFactory: 'h',
    jsxFragmentFactory: 'React.Fragment',
    // ⚠️ 不要显式写 `alwaysStrict: false` —— TypeScript 6.0 已把它标成废弃，
    // 显式写会让 `transpileModule` 报**错误**（诊断 category = Error）从而阻断构建。
    // `strict: false`（缺省）已经足够：不注入 `"use strict";` 前导。
    strict: false,
    removeComments: false,
    newLine: ts.NewLineKind.LineFeed,
  };
}

/**
 * 把一段客户端片段源码转成等价的 JavaScript。
 *
 * @param {string} source - 片段源码（可以含 JSX）。
 * @param {string} relativePath - 片段的相对路径（只用于报错信息）。
 * @returns {string} 转译后的 JavaScript。
 */
export function compileFragment(source, relativePath) {
  const { ts, source: tsSource } = resolveTypeScript();
  const result = ts.transpileModule(source, {
    fileName: relativePath.endsWith('.jsx') ? relativePath : `${relativePath}.js`,
    reportDiagnostics: true,
    compilerOptions: jsxCompilerOptions(ts),
  });

  const errors = (result.diagnostics ?? [])
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    const details = errors.map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
      if (!diagnostic.file || diagnostic.start === undefined) return message;
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      return `${relativePath}:${line + 1}:${character + 1} ${message}`;
    });
    throw new Error(`✗ 客户端片段转译失败（${tsSource}）：\n  ${details.join('\n  ')}`);
  }

  return result.outputText;
}

/**
 * 读一个客户端片段的**最终形态**源码：
 * `.jsx` ⇒ 转译成 JavaScript；`.js` ⇒ 原样返回。
 *
 * ⚠️ 构建脚本与**所有**客户端测试都必须走这个函数 ——
 * 否则「测试里能跑、构建出来是坏的」这种漂移就会发生。
 *
 * @param {string} relativePath - 相对 `src/client` 的路径。
 * @returns {string} 可直接执行的 JavaScript。
 */
export function fragmentSource(relativePath) {
  const normalized = relativePath.split('\\').join('/');
  const source = readFileSync(join(CLIENT_DIR, normalized), 'utf8').replace(/\r\n/g, '\n');
  if (!normalized.endsWith('.jsx')) return source;
  return compileFragment(source, normalized);
}

/**
 * 当前生效的 TypeScript 版本（构建日志里打出来，便于排查产物漂移）。
 * @returns {string} 版本号。
 */
export function typeScriptVersion() {
  const { ts } = resolveTypeScript();
  return String(ts.version ?? 'unknown');
}

// 直接跑本文件 → 自检（转译一小段 JSX 并打印结果）。
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
  const probe = `
;(function (RF) {
  'use strict';
  RF.Probe = function Probe(props) {
    return <div className={props.className}>{props.text}</div>;
  };
})(RF);
`;
  console.log(`typescript ${typeScriptVersion()}`);
  console.log(compileFragment(probe, 'probe.jsx'));
}
