/**
 * 装载验证脚本（合流后的**收口检查**）。
 *
 * 它模拟宿主装载一个 bundle 时会走的每一步，**不安装任何东西、不改 profile**：
 *
 *   1. 清单：package.json 的 `exports` / `files` / `dsh.bundle.patch` 指向的文件都在；
 *   2. 导入图：包内每个 `import` 都能解析——相对路径存在，裸 specifier 是 Node 内置；
 *      （装进 profile 之后按 `src/**` 分发，一条写错的相对路径就是**装载即报错**）
 *   3. R7：包名三处相等；
 *   4. 宿主半：`import()` 入口 → `apply(ctx, config)` → 工具 / 投影 / 提示词段落；
 *   5. 客户端半：在假浏览器上下文里 eval `client.js` → Tab 两段注册 + 7 个消息行 + 样式；
 *   6. patch 文件：结构检查（顶层数组 + insert 行）。
 *
 * 用法：`node scripts/verify-bundle.mjs`
 * 退出码 0 = 全部通过；1 = 有失败项。
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinModules } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 失败项收集器。 */
const failures = [];
/** 成功项收集器。 */
const passes = [];

/**
 * 记一条通过。
 * @param {string} label 标签。
 * @param {string} [detail] 细节。
 */
function pass(label, detail = '') {
  passes.push(detail === '' ? label : `${label} — ${detail}`);
}

/**
 * 记一条失败。
 * @param {string} label 标签。
 * @param {string} detail 细节。
 */
function fail(label, detail) {
  failures.push(`${label} — ${detail}`);
}

/**
 * 递归列出目录下的文件。
 * @param {string} dir 目录。
 * @param {string[]} [skip] 要跳过的目录名。
 * @returns {string[]} 相对路径。
 */
function walk(dir, skip = ['node_modules', '__tests__', '.git']) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (skip.includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, skip));
    else out.push(full);
  }
  return out;
}

// ── 1. 清单 ───────────────────────────────────────────────
{
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const targets = [
    ['exports["."]', pkg.exports?.['.'] ?? null],
    ['exports["./client"]', pkg.exports?.['./client'] ?? null],
    ['dsh.bundle.patch', pkg.dsh?.bundle?.patch ?? null],
  ];
  for (const [label, rel] of targets) {
    if (rel === null) {
      fail('清单', `${label} 缺失`);
      continue;
    }
    const resolved = path.resolve(ROOT, rel);
    if (existsSync(resolved)) pass('清单', `${label} → ${rel}`);
    else fail('清单', `${label} → ${rel} 不存在`);
  }

  // files 里的 glob 要有东西（否则 npm pack 会带一个空目录）。
  // ⚠️ `!` 开头的是**排除项**（npm 的 negation），不校验「目录存在」——
  //    `!src/**/__tests__/**` 指向的目录本来就应该存在，排除项没有「命中」语义。
  const patterns = pkg.files ?? [];
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;
    const base = path.resolve(ROOT, pattern.replace(/\/?\*\*$/, '').replace(/\/\*(\.[^/]+)?$/, ''));
    if (!existsSync(base)) {
      fail('清单', `files 条目「${pattern}」在仓库里没有对应目录`);
    }
  }
  if (!failures.some((item) => item.startsWith('清单'))) {
    const includes = patterns.filter((item) => !item.startsWith('!'));
    pass('清单', `files 的 ${includes.length} 条包含项全部命中（另有 ${patterns.length - includes.length} 条排除项）`);
  }
}

// ── 2. 导入图 ─────────────────────────────────────────────
{
  const builtins = new Set(builtinModules);
  const files = [
    path.join(ROOT, 'index.js'),
    // ⚠️ `.jsx` 也要扫：客户端片段里的 JSX 是**源码**形态，
    // 一旦有人往里写了 `import`，它同样是「装进 profile 后才炸」的相对路径。
    ...walk(path.join(ROOT, 'src')).filter((file) => {
      if (!file.endsWith('.js') && !file.endsWith('.jsx')) return false;
      if (file.endsWith('.test.js')) return false;
      const rel = path.relative(path.join(ROOT, 'src'), file).split(path.sep).join('/');
      if (rel.startsWith('client/ui/') || rel.startsWith('client/generated/')) return false;
      return true;
    }),
  ];
  const importRe = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let checked = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const specifiers = new Set();
    for (const re of [importRe, dynamicRe]) {
      re.lastIndex = 0;
      let match = re.exec(text);
      while (match !== null) {
        specifiers.add(match[1]);
        match = re.exec(text);
      }
    }
    for (const specifier of specifiers) {
      checked += 1;
      if (specifier.startsWith('node:') || builtins.has(specifier)) continue;
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), specifier);
        if (existsSync(resolved)) continue;
        fail('导入图', `${path.relative(ROOT, file)} → ${specifier} 解析不到`);
        continue;
      }
      fail('导入图', `${path.relative(ROOT, file)} → ${specifier} 是裸 specifier（本插件坚持零 npm 运行时依赖）`);
    }
  }
  if (failures.length === 0) pass('导入图', `${files.length} 个文件 / ${checked} 条 import 全部可解析`);
}

// ── 3. R7 ─────────────────────────────────────────────────
{
  const require = createRequire(path.join(ROOT, 'scripts', 'verify-bundle.mjs'));
  const check = path.join(ROOT, 'scripts', 'check-package-identity.mjs');
  if (existsSync(check)) {
    try {
      require(check);
    } catch (error) {
      // check-package-identity 自带进程退出逻辑；它跑不到这里说明抛了。
      fail('R7', error?.message ?? String(error));
    }
  }
}

// ── 4. 宿主半 ─────────────────────────────────────────────
{
  const { apply } = await import(pathToFileURL(path.join(ROOT, 'index.js')).href);
  const tools = [];
  const projections = [];
  const sections = [];
  const routes = [];
  const listeners = new Map();

  const scoped = {
    sessionProjections: {
      register(definition) {
        projections.push(definition);
        return () => undefined;
      },
    },
    systemPrompt: {
      section(definition) {
        sections.push(definition);
        return () => undefined;
      },
      getSectionOrder() {
        return 5000;
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
        tools.push(definition);
        return () => undefined;
      },
    },
    on(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
      return () => undefined;
    },
    inject(names, callback) {
      callback(scoped);
      return () => undefined;
    },
  };

  try {
    apply(ctx, {
      workspaceDir: '.reelforge',
      runPosition: 'cloud',
      cloudProvider: 'dsh',
    });
  } catch (error) {
    fail('宿主半', `apply() 抛异常：${error?.message ?? String(error)}`);
  }

  if (tools.length === 15) pass('宿主半', `注册 15 个工具`);
  else fail('宿主半', `注册了 ${tools.length} 个工具，期望 15`);

  for (const tool of tools) {
    if (typeof tool.name !== 'string' || tool.name === '') fail('宿主半', '有工具没有 name');
    if (typeof tool.description !== 'string' || tool.description === '') fail('宿主半', `工具 ${tool.name} 没有 description`);
    if (tool.parameters === null || typeof tool.parameters !== 'object') fail('宿主半', `工具 ${tool.name} 没有 parameters`);
    if (tool.output === null || typeof tool.output !== 'object') fail('宿主半', `工具 ${tool.name} 没有 output`);
    if (typeof tool.execute !== 'function') fail('宿主半', `工具 ${tool.name} 没有 execute`);
  }
  if (failures.length === 0) pass('宿主半', '每个工具都有 name/description/parameters/output/execute');

  if (projections.length === 1 && projections[0].key === 'reelforge/project') {
    pass('宿主半', '会话投影单元已注册（key = reelforge/project）');
  } else {
    fail('宿主半', `会话投影单元注册异常：${projections.map((item) => item.key).join(',') || '（无）'}`);
  }

  if (sections.some((item) => item.name === 'reelforge:skills')) pass('宿主半', '技能目录提示词段落已注册');
  else fail('宿主半', '没有注册技能目录提示词段落');

  // 路由门禁按**具体路径**核对，不数条数 ——
  // 数条数是脆写法：加一条新路由（例如 `/api/reelforge.file`）就会误红，
  // 而真正要防的是「该有的路由少了」。多注册不受约束，少注册一定红。
  const REQUIRED_ROUTES = ['/api/reelforge.state', '/api/reelforge.capabilities', '/api/reelforge.file'];
  const routePaths = routes.map((route) => route.path);
  const missingRoutes = REQUIRED_ROUTES.filter((path) => !routePaths.includes(path));
  if (missingRoutes.length === 0) {
    pass('宿主半', `Connection 通道注册了必需的 ${REQUIRED_ROUTES.length} 条路由（${routePaths.join(' / ')}）`);
  } else {
    fail('宿主半', `Connection 通道缺路由：${missingRoutes.join(' / ')}`);
  }

  if (listeners.has('tools/pre-execute') && listeners.has('session/event')) {
    pass('宿主半', '触发类闸门与事件 fold 都挂上了');
  } else {
    fail('宿主半', '事件监听没挂全');
  }

  // 对话输入截获的接入面（§10.5）：宿主在 Agent 收到 prompt 前触发的瀑布钩子。
  if (listeners.has('agent/pre-step')) {
    pass('宿主半', '对话输入截获钩子已挂上（agent/pre-step）');
  } else {
    fail('宿主半', '没有挂 agent/pre-step 钩子 —— 对话输入不会被截获进工作台');
  }
}

// ── 5. 客户端半 ───────────────────────────────────────────
{
  const clientSource = readFileSync(path.join(ROOT, 'client.js'), 'utf8');
  const calls = { load: [], effects: [], injections: [], registers: [], locales: [], shortcuts: [], openTabs: [] };
  const elements = [];

  /**
   * 假 `ctx.effect`：cordis 的 scoped context 也是 Context 实例，
   * 所以注入后的回调里**照样能调 effect**——假实现要照这个语义来。
   * @param {Function} fn 副作用。
   * @param {string} label 标签。
   */
  const effect = (fn, label) => {
    calls.effects.push(label);
    try {
      fn();
    } catch (error) {
      fail('客户端半', `effect「${label}」抛异常：${error?.message ?? String(error)}`);
    }
  };

  /** 假 React：createElement + hooks + Radix 需要的 createContext / forwardRef。 */
  const React = {
    createElement(type, props, ...children) {
      return { type, props, children };
    },
    Fragment: 'Fragment',
    forwardRef(render) {
      return render;
    },
    createContext(defaultValue) {
      return {
        Provider({ children }) {
          return children;
        },
        Consumer: null,
        _defaultValue: defaultValue,
      };
    },
    useContext(ctx) {
      return ctx?._defaultValue;
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => undefined];
    },
    useEffect() {},
    useLayoutEffect() {},
    useMemo(fn) {
      return fn();
    },
    useCallback(fn) {
      return fn;
    },
    useRef(initial) {
      return { current: initial };
    },
    useId() {
      return 'mock-react-id';
    },
    useSyncExternalStore(subscribe, getSnapshot) {
      return getSnapshot();
    },
  };

  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(spec) {
          calls.load.push(spec);
        },
      },
    },
    document: {
      head: {
        appendChild(node) {
          elements.push(node);
        },
      },
      createElement(tag) {
        return { tag, dataset: {}, textContent: '' };
      },
    },
    console,
    React,
    require: (name) => {
      if (name === 'react') return React;
      throw new Error(`客户端产物请求了未声明的依赖：${name}`);
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const ctx = {
    effect,
    inject(names, callback) {
      calls.injections.push(names);
      callback({
        effect,
        uiConversation: {
          events: {
            register(definition) {
              calls.registers.push(definition);
            },
          },
        },
      });
    },
    locale: {
      register(namespace, dictionary) {
        calls.locales.push(namespace);
      },
      bind() {
        return (key) => key;
      },
    },
    sidebarRightTabs: {
      register(definition) {
        calls.registers.push(definition);
      },
    },
    slots: {
      inject(name, fn) {
        calls.injections.push(name);
        fn();
      },
      register(definition) {
        calls.registers.push(definition);
      },
    },
    sessions: {
      list: {
        getSnapshot: () => ({ byId: {}, projectionsBySession: {} }),
        subscribe: () => () => undefined,
      },
    },
    shortcuts: {
      register(command) {
        calls.shortcuts.push(command);
        return () => undefined;
      },
    },
    sidebarRight: {
      mounted: { getSnapshot: () => null },
      openTab(kind, options) {
        calls.openTabs.push({ kind, options });
      },
    },
  };

  // 客户端产物是一段脚本：用一个函数包起来跑。
  const factory = new Function('window', 'document', 'console', 'React', 'require', 'globalThis', 'self', `${clientSource}\n//# sourceURL=reelforge-client.js`);
  try {
    factory(sandbox.window, sandbox.document, sandbox.console, React, sandbox.require, sandbox, sandbox);
  } catch (error) {
    fail('客户端半', `执行 client.js 抛异常：${error?.message ?? String(error)}`);
  }

  const loaded = calls.load[0];
  if (loaded?.id === '@local/reelforge') pass('客户端半', 'ModuleLoader.load 的 id 正确');
  else fail('客户端半', `ModuleLoader.load 的 id 是 ${loaded?.id ?? '（无）'}`);

  if (typeof loaded?.factory === 'function') {
    const exported = loaded.factory(sandbox.require);
    if (typeof exported?.apply === 'function') {
      pass('客户端半', 'factory 导出 apply()');
      try {
        exported.apply(ctx);
      } catch (error) {
        fail('客户端半', `apply() 抛异常：${error?.message ?? String(error)}`);
        if (process.env.RF_VERBOSE === '1') console.error(error?.stack);
      }
    } else {
      fail('客户端半', 'factory 没有导出 apply()');
    }
  } else {
    fail('客户端半', 'factory 不是函数');
  }

  const tabType = calls.registers.find((item) => item.kind === 'reelforge-workbench');
  if (tabType?.id === '@local/reelforge') pass('客户端半', '右栏 Tab 类型已注册');
  else fail('客户端半', '右栏 Tab 类型没注册');

  const chatRows = calls.registers.filter((item) => item.name === 'conversation.chat.node');
  if (chatRows.length === 7) pass('客户端半', '7 个消息行视图已注册');
  else fail('客户端半', `消息行视图注册了 ${chatRows.length} 个，期望 7`);

  if (elements.length >= 1) pass('客户端半', '插件自有样式已注入');
  else fail('客户端半', '样式没有注入');

  // 快捷键：3 个、id 合 R12 正则、**不声明 web:linux**（R13）
  if (calls.shortcuts.length === 3) pass('客户端半', '注册 3 个快捷键');
  else fail('客户端半', `注册了 ${calls.shortcuts.length} 个快捷键，期望 3`);

  const idPattern = /^[a-z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)+$/;
  for (const command of calls.shortcuts) {
    if (!idPattern.test(command.id ?? '')) fail('客户端半', `快捷键 id「${command.id}」不合 R12 正则`);
    if (Object.prototype.hasOwnProperty.call(command.defaults ?? {}, 'web:linux')) {
      fail('客户端半', `快捷键「${command.id}」声明了 web:linux（R13：web:linux 只支持 3 种组合）`);
    }
    if (typeof command.resolve !== 'function') fail('客户端半', `快捷键「${command.id}」没有 resolve`);
  }
  if (!failures.some((item) => item.includes('快捷键'))) {
    pass('客户端半', '快捷键 id 合 R12 且未声明 web:linux（R13）');
  }
}

// ── 6. patch 文件结构 ─────────────────────────────────────
{
  const patchFile = path.join(ROOT, 'cordis.patch.yml');
  const text = readFileSync(patchFile, 'utf8');
  const lines = text.split(/\r?\n/);
  const meaningful = lines.filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));

  if (meaningful[0]?.trim() === '- insert:') pass('patch', '顶层是数组且第一项是 insert');
  else fail('patch', `顶层结构异常：${meaningful[0]?.trim() ?? '（空）'}`);

  const insertIndex = meaningful.findIndex((line) => /^\s*- id:\s*\S+/.test(line));
  const nameLine = meaningful.find((line) => /^\s*name:\s*['"]?@local\/reelforge['"]?\s*$/.test(line));
  const hasConfig = meaningful.some((line) => /^\s*config:\s*$/.test(line));
  if (insertIndex >= 0) pass('patch', 'insert 行有 id');
  else fail('patch', 'insert 行没有 id');
  if (nameLine !== undefined) pass('patch', 'insert 行的 name 是包名');
  else fail('patch', 'insert 行的 name 不是 @local/reelforge');
  if (hasConfig) pass('patch', 'insert 行带 config 块（R5：可调值进 Config）');
  else fail('patch', 'insert 行没有 config 块');

  // ── R8：Config 三处一致 ────────────────────────────────
  // config.js 的 CONFIG_DEFAULTS、cordis.patch.yml、patch.dev.yml
  // 说的是同一份可调值。三处任何一处单独改，另外两处不跟，就会出现
  // 「联调时是一套配置、装进宿主后是另一套」——而且**不报错**，只是行为不同。
  {
    /**
     * 解析 patch 文件里的 config 块，摊平成 `a.b` → 标量。
     *
     * 只支持这两个 patch 文件用到的 YAML 子集（两层缩进、标量值），
     * 不引 YAML 解析器——本项目坚持零 npm 运行时依赖。
     *
     * @param {string} text 文件全文。
     * @returns {Record<string, unknown>} 摊平后的键值。
     */
    const parsePatchConfig = (text) => {
      /** @type {Record<string, unknown>} */
      const flat = {};
      const lines = text.split(/\r?\n/);
      const configIndex = lines.findIndex((line) => /^\s*config:\s*$/.test(line));
      if (configIndex === -1) return flat;
      const configIndent = lines[configIndex].match(/^\s*/)[0].length;
      /** config 的直接子项缩进。 */
      const childIndent = configIndent + 2;
      /** 当前嵌套前缀（`stages` 之类）。 */
      let prefix = '';
      for (let i = configIndex + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.trim() === '' || line.trim().startsWith('#')) continue;
        const indent = line.match(/^\s*/)[0].length;
        if (indent <= configIndent) break;
        const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!match) continue;
        const [, key, rawValue] = match;
        // 回到 config 的直接子项层级时，前一个嵌套前缀必须丢掉，
        // 否则 `stages:` 之后的所有字段都会被错记成 `stages.xxx`。
        if (indent === childIndent) prefix = '';
        if (rawValue === '') {
          prefix = `${prefix}${key}.`;
          continue;
        }
        // ⚠️ 标量与原始文本要分开存：`value` 一旦被标成 `unknown`，
        // 就不能再拿它去跑正则（正则只吃 string）。
        const raw = rawValue.replace(/^['"]|['"]$/g, '');
        /** @type {unknown} */
        let value = raw;
        if (raw === 'true') value = true;
        else if (raw === 'false') value = false;
        else if (raw === 'null' || raw === '~') value = null;
        else if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
        flat[`${prefix}${key}`] = value;
      }
      return flat;
    };

    const defaults = (await import(pathToFileURL(path.join(ROOT, 'src', 'host', 'config.js')).href))
      .CONFIG_DEFAULTS;
    /** @type {Record<string, unknown>} */
    const expected = {};
    for (const [key, value] of Object.entries(defaults)) {
      // `deps` 是宿主注入的能力对象，不是可调值，不在 patch 里出现。
      if (key === 'deps') continue;
      if (value && typeof value === 'object') {
        for (const [sub, subValue] of Object.entries(value)) expected[`${key}.${sub}`] = subValue;
      } else {
        expected[key] = value;
      }
    }

    const patchFiles = ['cordis.patch.yml', 'patch.dev.yml'];
    for (const fileName of patchFiles) {
      const filePath = path.join(ROOT, fileName);
      if (!existsSync(filePath)) {
        fail('R8', `${fileName} 不存在`);
        continue;
      }
      const actual = parsePatchConfig(readFileSync(filePath, 'utf8'));
      const diffs = [];
      for (const [key, want] of Object.entries(expected)) {
        if (!(key in actual)) diffs.push(`${key} 缺失（应为 ${JSON.stringify(want)}）`);
        else if (actual[key] !== want) diffs.push(`${key} = ${JSON.stringify(actual[key])}，应为 ${JSON.stringify(want)}`);
      }
      for (const key of Object.keys(actual)) {
        if (!(key in expected)) diffs.push(`${key} 多余（Config 里没有这个字段）`);
      }
      if (diffs.length === 0) {
        pass('R8', `${fileName} 的 config 与 CONFIG_DEFAULTS 逐项一致（${Object.keys(expected).length} 项）`);
      } else {
        fail('R8', `${fileName} 的 config 与 CONFIG_DEFAULTS 不一致：${diffs.join('；')}`);
      }
    }
  }
}

// ── 汇总 ─────────────────────────────────────────────────
console.log('── ReelForge bundle 装载验证 ──────────────────────────');
for (const item of passes) console.log(`  ✓ ${item}`);
for (const item of failures) console.log(`  ✗ ${item}`);
console.log('──────────────────────────────────────────────────────');
console.log(`通过 ${passes.length} 项，失败 ${failures.length} 项`);
process.exit(failures.length === 0 ? 0 : 1);
