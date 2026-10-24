# ReelForge 代码约束

> **这份文件给谁**：任何要改这个仓库代码的人或 agent（owner / Cursor / Codex / 复核者）。
> **怎么用**：每条约束都写了「为什么」和「怎么自己查」。改代码前先读 §0，改完照 §8 跑门禁。
> **约束的来源**：全部来自**代码与门禁本身**，不是愿望。写了就有人能查得到，查得到就假不了。

---

## §0 三十秒速查（最常犯的 9 条）

| # | 约束 | 违反了会怎样 |
|---|---|---|
| 1 | 改 `src/client/**` 后必须 `npm run build:client`，**并把 `client.js` 一起提交** | CI 第 12 步漂移检查变红；实机跑的是旧页面 |
| 2 | `client.js` 是**产物**，**禁手改** | 下次构建把你的手改直接冲掉，且看不出是谁改的 |
| 3 | 客户端片段**不许有 `import` / `export`**，只能 IIFE 包裹 + 挂 `RF` 命名空间 | 拼装时语法错，产物整个装载失败 |
| 4 | 页签/流程：**shadcn** 写 `<Button>` / `<Card>` / `<Badge>`（`RF.workbenchCard` / `RF.statusToneClass`）；**复合件**写 `RF.ui.*`；**禁止** `RF.ui.Button` / `label=` | 与 bundle 注入不一致；`rg 'RF\\.ui\\.(Button\|Pill)'` 应为空 |
| 5 | 新增 `.jsx` 片段要登记进 `src/client/ui/tailwind.config.cjs` 的 `content` | **样式静默消失**（类名被 purge，构建不报错） |
| 6 | 枚举只写在 `src/core/constants.js`；客户端镜像写 `src/client/manifest.js` | 测试逐项比对，红 |
| 7 | 界面文案只写在 `src/client/locale.js`，改完跑 `npm run sync:locale` | `locale/*.json` 与源不一致，红 |
| 8 | 客户端代码**不要用 `useCallback`** | `flow.test.js` 的 hook 运行时没有它 ⇒ 直接抛异常 |
| 9 | 只跑**受影响的测试子集**，不要默认跑全量 `npm test` | 全量 57 个文件 / 774 条是噪音；真正要问的是「这次改动被测到没有」 |

---

## §1 仓库分层与依赖方向

```
src/core/      20 个文件  纯业务规则：零 ctx、零 IO、可单测、不 import 宿主
src/host/      22 个文件  宿主装配：工具 / 路由 / 投影 / 闸门 / 存储
src/client/    浏览器半片段（挂在一个 RF 命名空间里）
src/media/     ffmpeg 合成 / 字幕 / 交付物落盘
src/skills/    技能目录扫描 + 技能工具
src/workflows/ ComfyUI / RunningHub 通道 + 规格解析
```

**依赖方向只能从上往下**：

```text
host  ──▶ core ──▶ (无)
client ──▶ core 的**字面镜像**（见 §4.2，不是 import）
```

- `src/core/**` **不许**出现真实的 `ctx.` 访问（注释里提一句不算）、**不许** import `src/host/**`。
  它**可以**用 node 内置模块 —— 现在有 5 个文件在用：
  `consistency.js` / `skillDraft.js`（落盘）、`probe.js`（`execFile` 探本机环境）、
  `changelog.js` / `stageOrchestrator.js`（`randomBytes` / `createHash`）。
- `src/host/**` 才有资格碰 `ctx`。
- `src/client/**` 是**浏览器**代码：不许出现 `node:fs` 之类（它跑在浏览器里）。

**怎么查**：`npm run typecheck` 走 `tsc --checkJs`；
`scripts/verify-coverage.mjs` 的门槛盯 **10 个文件** —— `src/host/changelogStore.js`、
`src/host/stageBridge.js`、`src/host/tools/` 下的 7 个、以及 `src/core/projectSchema.js`
（其余文件不设覆盖率门槛，但仍要有测试）。

---

## §2 全项目铁律

### 2.1 零 npm 运行时依赖

`package.json` 的 `dependencies` 与 `peerDependencies` **必须永远是空的**。

- 宿主只分发 `client.js` 与 `src/**`，插件装进 profile 时**不装任何 npm 包**。
- 现在 devDependencies 里有 esbuild / tailwindcss / postcss / autoprefixer / radix / clsx /
  tailwind-merge / class-variance-authority / typescript —— 它们**只在构建期用**，
  产物里是**内联**的（`src/client/generated/ui-shadcn.js` 里没有一条 `import`）。
- ⚠️ 往 `dependencies` 里加任何东西 = 插件在宿主里装不上。

**怎么查**：`scripts/check-package-identity.mjs` 会报；`npm pack --dry-run` 也能看。

### 2.2 TypeScript 必须钉死精确版本

`package.json` 里是 `"typescript": "6.0.3"`（**不带 `^`**）。

为什么：客户端 JSX 的转译结果**依赖 TypeScript 打印器行为**。换个 6.0.x 小版本，
`client.js` 就可能差几个字节 ⇒ CI 的产物漂移检查随机变红，而且没有任何报错提示你原因。

**怎么查**：`git diff --exit-code -- client.js` 那一步红了但源码没改 ⇒ 先怀疑 TS 版本。

### 2.3 注释是信息载体，不是装饰

这套代码里的大量注释记录的是**踩过的坑**（为什么不能写 `id`、为什么不能自动探测、
为什么 id 字段随回滚模式变）。改代码时：

- **删代码必须同时删/改对应注释**，不能留下指向不存在行为的注释；
- **不要为了「整洁」删掉解释性注释**；
- 新增坑要在**同一处**写清楚，格式跟随邻近注释（`⚠️` 标危险、`✅` 标结论）。

### 2.4 改完只跑受影响的子集

```powershell
# 改了客户端 → 只跑客户端
node --test "src/client/__tests__/*.test.js" "src/client/workbench/__tests__/*.test.js"

# 改了宿主半 → 只跑宿主半
node --test "src/host/__tests__/*.test.js"
```

`npm test`（全量 57 个测试文件 / 774 条用例 —— 2026-10-24 快照，只作量级参考）、
`npm run verify:all`、`npm run verify:coverage` 属于**重活**，
默认不跑，除非本次改动动了它们守的东西，或明确要求「跑全量」。

---

## §3 客户端半（改动最频繁，约束最多）

> **先分清什么被移除了、什么还在**（2026-10-24 那次 Tailwind + shadcn 重写）：
>
> - **移除的是「旧 `rf-*` class 体系」** —— `src/client/components.js`（9 个吐 `rf-*` 类名的
>   手写基础组件）、`src/client/workbench/rf7.js`（14 个手写零件）、`src/client/workbench/styles.js`
>   （`--rf-*` CSS 表）三个文件没了。
> - **shadcn 原语**（`Button` / `Card` / `Badge` / `Input` …）在 `register.jsx` 挂 **`RF.Button` 等**，
>   页签/流程/消息行 JSX 里写 **自由变量 `<Button>`**（`build-client.mjs` 在片段装完后注入
>   `var Button = RF.Button`，与 shadcn 文档同一套 `variant` / `size` / `children`）。
> - **`RF.ui` 只留工作台复合件**（`SectionHead` / `KvRow` / `EmptyState` / `ChipRow` …，共 14+ 个），
>   在 `workbench-ui.jsx`；**不要**再往 `RF.ui` 上挂 Button 包装层。
> - 两条 JSX 管线之间仍**不能 import**：管线 B 靠 **`RF.*` + 自由变量 shadcn** 接管线 A 的 bundle（见 3.1 / 3.9）。

### 3.1 现在有**两条** JSX 管线，别混

| 管线 | 覆盖文件 | 工具 | JSX 运行时 | 产物 |
|---|---|---|---|---|
| **A · esbuild** | `src/client/ui/**`（shadcn 组件 + 工作台零件） | esbuild 0.25.10 | **automatic**（`react/jsx-runtime`） | `src/client/generated/ui-shadcn.js` |
| **B · TypeScript** | `src/client/workbench/**`、`src/client/chatRows/index.jsx`、`src/client/entry.jsx` | `ts.transpileModule` | **classic**（`jsxFactory: 'h'`） | 直接拼进 `client.js` |

- 管线 A 的 `react` 被 esbuild 别名到 `src/client/ui/lib/react-shim.js`，
  `react/jsx-runtime` 别名到 `src/client/ui/lib/jsx-runtime-shim.js`。
  **shim 里不允许出现真的 `import { useState } from 'react'`** —— 宿主不提供那个包。
- 管线 B 的 JSX 编译成 `h(...)` 调用，`h` 是产物壳里的 `var h = React.createElement`。

**规则**：一个文件只走一条管线。新建文件时先想清楚它在 `src/client/ui/`（走 A）还是在别处（走 B）。
**别把管线 A 的文件挪进管线 B 的目录**（反之亦然）—— 两条管线的 JSX 运行时不同。

### 3.2 扩展名就是语义

- `.jsx` = **含 JSX**，构建时**必须**转译；
- `.js` = **纯 JavaScript**，原样拼进产物。

靠扩展名区分，构建脚本**不维护**「哪个文件要转译」的名单（`src/client/compile.mjs` 的
`fragmentSource()` 是唯一判定点）。所以：**写了 JSX 就必须用 `.jsx` 后缀**，
否则 JSX 语法会被原样拼进产物 → 装载即语法错误。

### 3.3 片段三要素

每个客户端片段（`build-client.mjs` 的 `FRAGMENTS` 列表项）必须满足：

1. **IIFE 包裹**：`;(function (RF) { 'use strict'; ... })(RF);`
2. **没有 `import` / `export`** —— 片段是被**拼进同一个函数体**的，不是模块；
3. **只往 `RF` 命名空间上挂东西**，靠 `RF.xxx` 跨片段通信。

**怎么查**：`scripts/verify-bundle.mjs` 的「导入图」检查会扫 `src/**` 的 `.js` / `.jsx`，
相对路径写错 ⇒ 装载即报错。

### 3.4 自由变量契约：`h` / `React` / `RF`

产物壳是这么写的（`build-client.mjs`，**一个字都不能改**）：

```js
factory: function (require) {
  'use strict';
  var React = require('react');   // 宿主注入
  var h = React.createElement;    // 经典 JSX 工厂
  var RF = {};                    // 跨片段的全局命名空间
  ... 片段按 FRAGMENTS 顺序拼在这里 ...
  // shadcn 原语（与 RF.Button 同一引用，供 h(Button, …)）
  var Button = RF.Button;
  var Card = RF.Card;
  var Badge = RF.Badge;
  var Input = RF.Input;
  var Label = RF.Label;
  var Progress = RF.Progress;
  var Alert = RF.Alert;
  var AlertDescription = RF.AlertDescription;
  var cn = RF.cn;
}
```

⇒ 所有片段（**包括 `generated/ui-shadcn.js`**，它的 `react-shim.js` 里
`createElement` 直接调自由变量 `h`）都能看到 `React` / `h` / `RF`；**页签类片段**还能用 `Button` / `Card` 等。

**规则**：
- 片段里**不要**自己 `import` 或重新定义 `React` / `h` / `RF` / `Button` 等注入名；
- 片段里**不要**用 `require()` —— 宿主只提供 `react`；
- 需要 React hooks 时用 `RF.React`（`entry.jsx` 会把宿主 React 挂上去）或闭包里的 `React`。
- 单测装载片段时用 `src/client/__tests__/fragment-eval.js` 的 `runClientFragment()`，**与产物注入同一套自由变量**。

### 3.5 片段顺序是**正确性约束**

`FRAGMENTS` 的顺序（15 个片段）不是随便排的：后面的片段会读前面片段挂到 `RF` 上的东西。

```text
manifest.js            常量
locale.js              文案
shared.js              共享
generated/tailwind-styles.js   样式（RF.STYLES）
generated/ui-shadcn.js         UI 包（RF.Button / RF.ui 复合件 / RF.workbenchCard …）
workbench/stageSteps.js        阶段推进
workbench/breakpoints.js       断点
workbench/chrome.js            按屏外壳
workbench/tabs.jsx             7 个页签
workbench/flow.jsx             10 块流程屏
workbench/Workbench.jsx        主壳
chatRows/index.jsx             7 类消息行
chatEvents.js                  会话事件
shortcuts.js                   快捷键
entry.jsx                      入口（两段注册）
```

- 改顺序会让 `RF.Button` / `RF.ui.*` / `RF.TAB_RENDERERS` 在定义之前被读到 ⇒ 运行时 `undefined`。
- **新增片段要问一句：它依赖谁？依赖的必须排在它前面。**

**怎么查**：`build-client.mjs` 的 `FRAGMENTS` 注释里写了理由。

### 3.6 Tailwind `content` 扫描范围 —— **静默失败点**

`src/client/ui/tailwind.config.cjs` 的 `content` 数组**只列了具体路径**：

```js
content: [
  'components/**/*.jsx', 'register.jsx', 'workbench-ui.jsx', 'layout-tw.js',
  '../workbench/**/*.jsx', '../chatRows/**/*.jsx',
]
```

⚠️ **Tailwind 是按文件内容扫类名的**。一个 `.jsx` 文件如果**不在**这个列表里，
它里面写的 `className="text-xs"` 这些类**不会被生成 CSS** ⇒
**页面样式静默消失，构建不报错，测试也可能照样过**。

**规则**：新增/移动任何含 `className` 的 `.jsx` 文件，**必须**同步登记进 `content`。
（当前 `src/client/entry.jsx` 没被收录 —— 它也确实没写任何 `className`，所以还没出事。）

### 3.7 `.rf-root` 是样式的作用域根

```js
// tailwind.config.cjs
important: '.rf-root',   // 所有工具类都带 !important，且作用域是 .rf-root
```

- 所有 UI 必须渲染在 `RF.tw.root`（`className` 含 `rf-root`）**里面**。
  外面的元素**拿不到任何 Tailwind 样式**。
- `--rf-*` 语义令牌定义在 `src/client/ui/globals.css` 的 `@layer base { .rf-root { … } }` 里
  ⇒ **在 `.rf-root` 之外引用 `var(--rf-ok)` 会解析失败**。
- 主壳根节点就是 `<section className={RF.tw.root}>`（`Workbench.jsx`）—— 别把它换掉。

### 3.8 暗色只有一条路径

```js
darkMode: ['selector', 'body[data-ds-dark-theme] .rf-root']
```

宿主切暗色是靠给 `body` 打 `data-ds-dark-theme` 属性实现的。**插件自己没有暗色开关**，
也不要写 `dark:` 前缀的 Tailwind 变体（那套机制在这里不生效）——
暗色差异走 `globals.css` 里 `body[data-ds-dark-theme] .rf-root` 那一段。

### 3.9 shadcn 原语用 `Button`，复合件用 `RF.ui.*`

**管线 B 的页签/流程/消息行**（`workbench/**`、`chatRows/index.jsx`）：

- **shadcn 原语**：JSX 写 **`<Button>` / `<Card>` / `<Badge>` …**（shadcn 的 `variant` / `size` / `children`），
  **禁止** `RF.ui.Button` 或 `label=` 适配层。
- **状态胶囊**：`<Badge variant="outline" className={RF.cn(…, RF.statusToneClass(tone))}>…</Badge>`。
- **工作台 Card 布局/选态**：`<Card {...RF.workbenchCard({ state, tone, className, onClick })}>…</Card>`（`RF.workbenchCard` 在 `register.jsx`）。
- **复合零件**：仍走 **`RF.ui.*`**（函数或小组件），来源 `workbench-ui.jsx`，例如
  `RF.ui.SectionHead` / `KvRow` / `ChipRow` / `EmptyState` / `Track` / `Stat` / `ShotChip` / `ChatSync` …

**管线 A**（`src/client/ui/**`）在 esbuild 里 **直接 import** shadcn 源码；装 bundle 时把同一实现挂到 **`RF.Button` 等**。

**为什么**：管线 B **不能 import** 管线 A 的文件；`generated/ui-shadcn.js` 先把 shadcn 打进 `RF`，
再由 `build-client.mjs` 注入自由变量，页签才能写与 shadcn 文档一致的 JSX。

**怎么查**：
- 页签/流程里不应出现 `RF.ui.Button` / `RF.ui.Pill`（`rg 'RF\\.ui\\.(Button|Pill)' src/client/workbench src/client/chatRows` 应为空）。
- `register.jsx` 挂 `RF.Button = …`（shadcn forwardRef），**不**挂 `RF.ui.Button`。
- 复合件引用：`rg 'RF\\.ui\\.' src/client/workbench`（仍应有 `SectionHead`、`EmptyState` 等）。

### 3.10 客户端代码不要用 `useCallback`

每个测试文件自己写了一份**最小 hook 运行时**，能力不一致：

| hook | render.test.js | flow.test.js | entry-actions / tool-args |
|---|---|---|---|
| `useState` / `useRef` / `useEffect` | ✅ | ✅ | ✅ |
| `useSyncExternalStore` | ✅ | ✅ | ✅ |
| `useCallback` | ✅ | ❌ **没有** | ✅ |
| `useId` | ✅ | ❌ | ❌ |

⇒ 客户端代码**一律不用 `useCallback`**（`Workbench.jsx` 里有同样的注释说明）。
需要稳定引用就自己写模块级函数，不要包 `useCallback`。

### 3.11 交互态 vs 投影态

页面**同时**有两份状态，别混：

- **投影态**（`RF.useProjection(React)` 拿到的）：宿主从会话日志 fold 出来的**事实**。
- **交互态**（`React.useState`）：用户还没提交的东西（选了位置、填了名字、勾了素材）。

规则：
- **数据没有就说清楚没有**，不编内容（RF7 §6.7「失败不许静默降质」）；
- 提交类动作要把交互态**写进投影**才算数，光改 `useState` 什么也没发生；
- 别把交互态当事实展示（比如「已选 0 个」必须是真的 0，不是初始值忘了刷新）。

### 3.12 工具调用契约（错了整条被宿主拒收）

- 工具 id 只能用 `RF.TOOL_IDS.*`，不许写字符串字面量。
- 指令前缀只能用 `RF.TOOL_CALL_PROMPT_PREFIX`，**不许**自己写「请调用工具 …」——
  宿主半靠这个前缀识别工作台自己发的指令。
- 必填参数名必须与宿主 schema 一致：
  - `regenerate_shot` 用 `seq` + `idx`（**不是** `id`）；
  - `update_plan` 的 `kind` 与 `position` **都必填**（只发位置会被整条拒收）；
  - `rollback` 的 id 字段**随模式变**：`single`→`entryId`、`batch`→`batchId`、`timepoint`→`at`，
    且 schema 是 `additionalProperties:false`，发错字段名整条拒收。
- 触发类工具（`run_stage` / `regenerate_shot` / `assemble_chapter` / `rollback`）
  会弹宿主授权门 —— 客户端**不需要**自己再确认一遍。

**怎么查**：`src/client/__tests__/tool-args-contract.test.js` 逐个比对参数名。

### 3.13 `client.js` 是产物

- **禁手改**（文件头第一行就写着）。
- 改完 `src/client/**` 必须 `npm run build:client`，**并把 `client.js` 一起提交**。
- 构建是**确定性**的：同一份源码永远得到同一份 `client.js`
  （`t5-client.test.js` 的「无漂移」用例会拿 `buildClient()` 的返回值跟仓库里那份逐字比）。
- ⚠️ **只有 `client.js` 的写入有幂等保护**（内容没变就不重写，避免 mtime 抖动连带
  `npm pack` 的 shasum 每次都变）。`build-ui.mjs` 写 `generated/ui-shadcn.js` 与
  `generated/tailwind-styles.js` 是**无条件重写** —— 内容是确定的（`git diff` 依然干净），
  但这两个文件的 **mtime 每次构建都会变**。

### 3.14 同步到实机

```powershell
npm run build:client:dsh   # = build:client + sync:dsh
```

`sync:dsh` 把 `client.js` 拷进 `~/.dsh/profiles/web/node_modules/@local/reelforge/`。
⚠️ `pnpm dsh plugin add file:…` 在依赖已登记时常常 `added 0`，**不会**重拷 ⇒
**改了客户端不跑 `sync:dsh`，浏览器跑的还是旧的**。之后还要**重启 DSH 宿主**（boot 时才快照 client.js）。

---

## §4 宿主半

### 4.1 枚举唯一来源

`src/core/constants.js` 是**唯一**枚举来源。工作流映射表、写入校验、界面下拉**三处都从这里取**，
任何文件都不得再写一份。

⚠️ `constants.js` 文件头列了三条**不要「修好」**的上游真实行为：
`VIDEO_RESOLUTION_OPTIONS` 里没有 1080P/2K/4K；`nameMatches` 是规范化后精确相等；
`HW_DEFAULT_FREE` 里 amd 默认 3、nvidia 默认 0。

### 4.2 客户端只能有**字面镜像**

浏览器侧无法 import 本包 ESM（宿主只分发 `client.js`），所以 `src/client/manifest.js` 里
有一份 `src/core/constants.js` 的**字面镜像**。

- 镜像**不是**「另写一份枚举」：`t5-client.test.js` 会把两边**逐项比对**，不一致就红。
- 改 `constants.js` ⇒ **必须**同步改 `manifest.js`。
- 镜像里最容易漏的是 `RF.CHAT_ROW_KINDS`（7 个）、`RF.CHAT_ROW_COLLAPSIBLE`（3 个）、
  `RF.WORKBENCH_TABS`（7 个）、`RF.TAB_KIND` / `RF.TAB_TYPE_ID`。

### 4.3 投影是唯一事实源（R1）

状态**只从会话日志 fold 出来**。宿主工具产出 `meta.reelforge.patches`（状态补丁），
经会话事件 → fold → `src/host/projection.js` → wire view。

**不要**另建一条状态通道，**不要**在插件里存第二份状态。

### 4.4 四条只读路由

全在 Connection 认证通道内（`src/host/apply.js`）：

| 路由 | 是什么 | 注意 |
|---|---|---|
| `/api/reelforge.state` | 会话投影的 wire view | **唯一**的数据同步通道 |
| `/api/reelforge.capabilities` | Config 归一化后的可调值 | 只读：插件**没有**写配置的通道 |
| `/api/reelforge.probe` | 环境探测报告 | **不进 wire view**（是能力事实不是会话状态）；30s 缓存 |
| `/api/reelforge.file` | 交付物下载 / 视频播放 | 路径**必须**过越界防护 |

### 4.5 `inject` 清单必须**精确**覆盖

客户端的 `RF.CLIENT_INJECT`（`src/client/manifest.js`）必须与客户端源码里
**每一次 `ctx.<服务>` 访问**一一对应：

- **漏一个** ⇒ 宿主抛 `cannot get property "xxx" without inject`；
- **多一个**（宿主没提供的服务）⇒ fiber 永远 pending。

⚠️ `remote.session` 是**独立服务名**，不是 `remote` 的子属性。

**怎么查**：`src/client/__tests__/client-inject.test.js` 逐个核对（多和少都判红）。

### 4.6 宿主服务名不能猜

客户端只许用宿主**真实提供**的 9 个服务：
`slots` / `locale` / `sidebarRightTabs` / `sidebarRight` / `sessions` / `shortcuts` /
`uiConversation` / `remote` / `remote.session`。
多写一个就是 4.5 的「多一个」。

### 4.7 右栏 Tab 是**两段注册**

```js
ctx.sidebarRightTabs.register({ id, kind, … });           // id = 类型身份
ctx.slots.register({ name: 'sidebar.right.pane.tab', key: definition.id }, Body);
```

⚠️ 插槽的 key 是 **`definition.id`**（= `@local/reelforge`），**不是 kind**。
写成 kind ⇒ 页面空白且不报错。

⚠️ `TAB_KIND`（`reelforge-workbench`）是**右栏持久化用的**，R8 规定**一经发布不可改名** ——
改名会让老用户已打开的 Tab 全部变成「这类内容还没有可用的查看方式」。

### 4.8 包名三处相等（R7）

`package.json.name` / `cordis.patch.yml` 的 `name` / `client.js` 里 `load({ id })` 的 `id`
必须**完全相等**（`@local/reelforge`）。不等 ⇒ 客户端半**静默不加载**。

**怎么查**：`npm run check:identity`。

### 4.9 Config 三处一致（R8）

`src/host/config.js` 的 `CONFIG_DEFAULTS` / `cordis.patch.yml` 的 config 块 /
`patch.dev.yml` 的 config 块 —— 三处逐项相等（现在 13 项）。

**怎么查**：`npm run verify:bundle` 的最后两段。

---

## §5 文案

### 5.1 唯一来源 + 同步

- 源：`src/client/locale.js`（命名空间 `reelforge`）。
- 副本：`locale/{zh,en}.json` 的 `ui` 段（**产物**）。

```powershell
# 改完 src/client/locale.js 必跑
npm run sync:locale
```

`t5-client.test.js` 会**逐键逐值**比对两边 —— 不同步就红。`sync:locale` 是幂等的。

### 5.2 界面上的每一句可见文字都从 locale 取

不在组件里写死中文/英文。工具用 `tool.*.label`，阶段用 `stages.*`，上下文键用 `context.section.*`。

### 5.3 文案三纪律

1. **不裸露技术词**：`llm 阶段`、`image 阶段`、`bible`、`reelforge.update_shot` 不进中文界面。
2. **不重复**：面板头副标题与底栏第二行曾经是同一句 —— 同一句不要出现两遍。
3. **不撒谎**：运行位置没选时不能说「云端运行」；工作台不显示整段小说正文
   （`project.idea` 可能就是一整章）。

---

## §6 设计真源

`design/` 是 UI 的真源（`ReelForge-RF7.figcraft` + `BOARD-INDEX.md` + `IA-DSH-右栏.md` +
`STYLE-SPEC.md`）。流程：

```text
改意图 → 改 design/ → 导出 SVG/PNG → 写规格 → 评审 → 更新映射表 → 改 src/client/** → 自证
```

**禁止跳过设计与规格直接改 `src/client/`**（详见 `docs/UI设计与代码一致性.md` ——
画板 ↔ 代码映射表在那里，**已纳入版本控制**；规则本身以本节为准）。

验收要能指出**画板名**（如 `RF-RunGate`）+ 实机截图或 DOM 断言。

---

## §7 测试与 Git

### 7.1 测试目录**不进 Git**

`.gitignore` 里是 `src/**/__tests__/`（**必须带 `**`**，否则盖不到
`src/client/workbench/__tests__/`）。

- 测试是**本地的验证资产**，不随仓库上传。
- ⚠️ **已追踪的文件 ignore 不生效** ⇒ 新增测试目录时要 `git rm -r --cached` 解追踪。
- 后果：干净 clone 上**没有测试文件** ⇒ CI 第 8/10 步会**跳过**（判跳过不判红），
  单测与覆盖率**只由本地守着**。

### 7.2 门禁跑不过的原因分类

| 现象 | 多半是 |
|---|---|
| `client.js` 漂移 | 忘了 `npm run build:client` |
| 枚举比对红 | 改了 `constants.js` 没同步 `manifest.js` |
| locale 比对红 | 改了 `locale.js` 没跑 `sync:locale` |
| inject 清单红 | 新用了 `ctx.<svc>` 没加进 `CLIENT_INJECT`（或加了多余的） |
| 样式消失 | 新 `.jsx` 没登记进 `tailwind.config.cjs` 的 `content` |
| 导入图检查红 | 相对路径写错（`import` 图检查） |
| 「客户端半」装载检查红 | 片段里写了 `import`/`export`、或 JSX 没转译（用了 `.js` 后缀） |
| 验收门禁红（退出码 2） | `docs/开发任务/` 没进版本控制（`.gitignore` 白名单只放了 `!docs/开发任务/`） |

### 7.3 工作区操作

- 删除文件走 `rm -- "<path>"`（可恢复），**不要** `Remove-Item`。
- **不要**在助手后台起 DSH 宿主 —— 宿主由 owner 自己重启。
- 改插件源码后：构建 → 同步 → **owner 重启宿主** → 浏览器 Ctrl+F5。

---

## §8 门禁速查

```powershell
npm run check:identity     # R7 包名三处相等
npm run verify:bundle      # 清单 / 导入图 / 宿主半 / 客户端半 / patch / R8 Config 三处一致
npm run build:client       # 重建 client.js（改了 src/client/** 必跑）
npm run typecheck          # tsc --checkJs（JSDoc 类型与实现一致）
npm run sync:locale        # locale.js → locale/*.json（改了文案必跑）
npm run sync:dsh           # client.js → DSH web profile（要实机看效果时）
node --test "src/client/__tests__/*.test.js"   # 改了客户端 ⇒ 只跑这组
node --test "src/host/__tests__/*.test.js"     # 改了宿主半 ⇒ 只跑这组
```

全量（**默认不跑**，只在明确要求或改动动了它们守的东西时）：
`npm test` / `npm run verify:coverage` / `npm run verify:acceptance` / `npm run verify:all`。

CI（`.github/workflows/ci.yml`）12 步，顺序即依赖：
identity → bundle → typecheck → build → test → pack → coverage → acceptance → **产物漂移检查**。

---

## §9 代码里已经失效的引用（别照着抄）

改名前的老路径还留在注释里，照着它们去找文件会找不到：

| 老路径 | 现在的真身 |
|---|---|
| `src/client/components.js` | `src/client/ui/register.jsx`（shadcn → `RF.Button` 等 + `RF.ui` 复合件入口） |
| `src/client/workbench/rf7.js` | `src/client/ui/workbench-ui.jsx`（14 个工作台零件） |
| `src/client/workbench/styles.js` | `src/client/ui/globals.css` + `src/client/ui/layout-tw.js` → `generated/tailwind-styles.js` |
| `src/client/workbench/tabs.js` | `src/client/workbench/tabs.jsx` |
| `src/client/workbench/flow.js` | `src/client/workbench/flow.jsx` |
| `src/client/workbench/Workbench.js` | `src/client/workbench/Workbench.jsx` |
| `src/client/chatRows/index.js` | `src/client/chatRows/index.jsx` |
| `src/client/entry.js` | `src/client/entry.jsx` |
| `src/client/generated/` | **是产物**（`ui-shadcn.js` / `tailwind-styles.js`），由 `build-ui.mjs` 生成，禁手改 |

⚠️ **`docs/开发任务/T5-工作台差距表.md` 与 `docs/开发任务/实机/*.md` 里满是这些老路径 ——
那是对的，不要改**：它们是**历史记录**（上一轮的差距快照 / 原始实机记录），
描述的是当时的事实。改它们等于篡改验收证据。

**2026-10-24 已清理的三处**（活代码 / 活规格里的过期引用）：

1. `src/client/generated/tailwind.css` —— 上一轮迭代的残留（`build-ui.mjs` 不生成它、
   没人引用它、它的 CSS 与真产物内容不同）⇒ **已删除**，不要再建。
2. `src/client/build-client.mjs` 的 `FRAGMENTS` 顺序说明 —— 与实际列表对不上 ⇒ **已改正**
   （真实顺序见 §3.5，以列表本身为准）。
3. `src/client/workbench/tabs.jsx` 文件头「排版用 `workbench/rf7.js` 的零件」⇒ **已改正**
   （复合零件在 `workbench-ui.jsx` → `RF.ui.*`；按钮/卡片/胶囊用 `<Button>` / `<Card>` / `<Badge>`）。
