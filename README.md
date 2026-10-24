# ReelForge

> DSH Web 插件：把**小说正文**变成**可交付的短剧成片**——拆章、分镜、资产、参考装配、生成、合成、回滚。

*Local DSH Web plugin — turn a novel into a deliverable short-drama episode.*

[![license](https://img.shields.io/badge/license-MIT-4c8dff.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-0.2.1--alpha-4c8dff)](https://github.com/deepseek-ai/deepseek-harness)

一个扩展，一个面：

- **ReelForge 工作台** —— DSH Web 右侧栏的一个 Tab：6 步进度条 + 7 个页签（章节 · 分镜 · 资产 · 上下文 · 技能 · 成片 · 日志），底部常驻成本位。

**数据与产物全部留在本机**：不额外调模型、不上传任何东西，章节、资产、成片都落在会话工作区的 `.reelforge/` 下。

> **状态**：本包尚未发布到 npm（`package.json` 里 `private: true`）。当前只能用本地路径装载，见「安装」。
> 已验证环境：DSH `0.2.1-alpha.1`（构建号 `5badb15`）、Node v22.22.3、Windows / PowerShell 7。

### 开发进度（2026-10-23）

T1–T5 共 **116** 条验收项（`npm run verify:acceptance`）：

| 状态 | 数量 | 说明 |
|---|---:|---|
| 自动化通过 | 104 | 单测 / 命令 / 静态扫描 |
| 实机通过 | 6 | 证据在 `docs/开发任务/实机/`（**已纳入 Git**），`npm run verify:acceptance` 逐条核对 |
| N/A | 3 | 无客户端分片（单文件拼接构建） |
| 实机待补 | 0 | — |
| **证据缺失** | **3** | **T5 A4 / A19 / A27** —— 代码已实现，但实机原始记录里缺对应事实，门禁判「证据缺失」（退出码 1）。**这一栏不是「已通过」**，别按上表其他行读 |

**工程面**：`npm run verify:bundle` / `typecheck` / `test`（742 用例，740 pass + 2 skip）/ `verify:coverage` 均可过；`npm run verify:acceptance` 目前**退出码 1**（上述 3 项证据缺失），CI 已把它列为**阻断步骤**。

**未发布变更**（见 [CHANGELOG](CHANGELOG.md) `[Unreleased]`）：对话输入截获（`agent/pre-step`）+ systemPrompt 工作流段落重写。

---

## 界面预览

GitHub **包含** `design/`（RF7 设计真源 + 18 板暗/亮出稿）与 `docs/开发任务/`（验收门禁硬依赖它：不跟踪 ⇒ 干净 clone 上 `npm run verify:all` 直接退出码 2）；`references/`（第三方 UI 参考图）仅本地保留，见 `.gitignore`。

- **设计稿**（非运行截图）：`design/dark/` 与 `design/light/` 各 **18 张**（560×900，PNG + SVG）+ `design/components/RF-Components.png`（组件表）。FigCraft 主稿 `design/ReelForge-RF7.figcraft`，建稿脚本 `design/_tools/build-rf7.mjs`（脚本是真源，改它重出全套）。
- **实机观察记录**：`docs/开发任务/实机/dsh-0.2.1-alpha.1.md`（在 Git 里 —— 门禁按每条验收项声明的「必须出现的事实」逐条核对它）。

---

## 功能

在 DSH Web 右侧栏增加 **ReelForge 工作台** Tab；模型通过 15 个工具驱动整条流水线，工作台负责看进度、看结果、下载成片。

**工作台**

- **阶段条** —— 6 步：需求 · 运行 · 方案 · 生成 · 分镜 · 交付，按项目实际状态推导当前步。
- **7 个页签** —— 章节 / 分镜 / 资产 / 上下文 / 技能 / 成片 / 日志，每页显示**真实数据**（不是占位），空态文案说清「为什么空 + 下一步」。
- **对话里的 7 类消息行** —— 阶段进度 / 章节列表 / 分镜卡片 / 执行路径 / 资产卡 / 成片交付 / 变更日志，进度类默认折叠。
- **成本位常驻** —— 底栏显示「已用 / 上限」，上限来自 `config.budgetLimitCny`。
- **明暗跟随宿主** —— 面板样式全部走宿主 CSS 变量（`var(--dsw-alias-*)`），不硬编码色值。
- **中文 / English** —— 文案键集在 `locale/zh.json` 与 `locale/en.json` 里一一对应。

**工具（13 个 ReelForge + 2 个只读技能工具）**

| 工具 | 作用 |
|---|---|
| `reelforge.import_novel` | 导入小说正文并自动拆章（按「第N章」标题切，否则按 6000 字均分） |
| `reelforge.set_storyboard` | 写某一章的分镜（整章批量或单镜） |
| `reelforge.save_context` | 写上下文三键之一：`bible` / `style` / `continuity` |
| `reelforge.update_shot` | 改某一镜的内容字段 |
| `reelforge.create_asset` | 新建资产（10 类；`costume` / `age` 是变体类，必须带 `parent_id`） |
| `reelforge.update_asset` | 改一个资产的内容字段 |
| `reelforge.bind_asset` | 把资产 id 绑到某一镜 |
| `reelforge.run_stage` | 跑一个阶段：`llm` → `image` → `tts` → `video`（固定顺序串行） |
| `reelforge.regenerate_shot` | 重生成某一镜（内容指纹幂等，参数没变不重复计费） |
| `reelforge.assemble_chapter` | 把一章合成为成片并生成字幕（带字幕 / 无字幕两版） |
| `reelforge.set_chapter_music` | 给某一章指定背景音乐 |
| `reelforge.rollback` | 三级回滚：`single` / `batch` / `timepoint` |
| `reelforge.update_plan` | 改执行路径（kind × 位置是正交两维，不烧钱、不走 ask） |
| `skill` / `skill_reference` | 读随包技能正文与参考文件 |

**产物落盘**（相对会话工作区）

```
<repo>/
  .reelforge/                  ← 项目根（config.workspaceDir，默认 .reelforge）
    project.json               项目 / 章节 / 分镜 三层物化
    context/bible.md           人物圣经（含场景站位表）
    context/style.md           风格指南
    context/continuity.json    连续性记录（只追加）
    changelog.jsonl            变更日志（回滚的依据）
  exports/                     ← 交付物
    ch01.mp4                   成片（无字幕版）
    ch01_带字幕.mp4             成片（带字幕版）
    ch01.srt                   字幕
```

成片规格：**H.264 / AAC / 24fps / yuv420p / +faststart**。

**数据怎么来**

- 事实源永远是**会话日志**（R1）：状态由日志里的 `tool/result` 补丁重建，插件内存只是派生缓存。
- 模型通过工具写入内容字段，**产物字段（`status` / `video_path` / `seed` / `image_path` / `voice_ref`）不可写**——只有渲染阶段能写，写了会报错并说明原因。
- 消耗算力与费用的动作（`run_stage` / `regenerate_shot` / `assemble_chapter` / `rollback`）走宿主的 `ask` 人工授权。

---

## 安装

本包尚未发布到 npm，从**本地路径**装载：

```powershell
cd D:\Code\WebCode\deepseek-harness
pnpm dsh plugin --profile web add file:D:/Code/WebCode/dsh-reelforge
pnpm dsh web
```

装载完在 DSH Web 右侧栏就能看到「ReelForge 工作台」。

> **坑**：pnpm 的 `file:` 依赖是**拷贝**不是链接 —— 改了仓库源码不会自动生效，要重新 `plugin add` 或手动同步一次。
> 宿主在 boot 时会**快照** `client.js`，所以换产物后必须**重启宿主**，浏览器才能拿到新的。

### 发布到 npm 前要改的几处

本包目前是 `private: true` + `@local/` scope，**发布前**必须改这几项（仓库地址尚未确定，这里不编造）：

| 字段 | 现在 | 发布时应为 |
|---|---|---|
| `name` | `@local/reelforge` | 裸包名（如 `reelforge`）—— npm 上 `@local` scope 未开通 |
| `private` | `true` | 删掉这一行 |
| `publishConfig` | 无 | `{ "access": "public" }` |
| `repository` / `homepage` / `bugs` | 无 | 指向本仓库的真实地址 |
| `scripts.prepublishOnly` | 无 | `npm run verify:all`（发布前强制跑完整验证链） |

> 设计稿 `design/`（建稿脚本 + FigCraft 主稿 + 18 板暗/亮出稿）与 `docs/开发任务/`（任务书 + 实机证据）**均已纳入 Git**，`docs/` 根下的设计方案等仍在本地。两者都**不在 npm 包 `files` 里**，所以 npm 页若要用图仍需另配 `repository` + 可访问的静态资源，或把预览图放进仓库根目录（如 `icon.svg` 一类已跟踪文件）。

`dsh.client.inject` 声明的是**客户端模块包名**（模块图预取边，宿主据此保证这些模块先加载）；
**cordis 服务注入**来自客户端产物导出的 `inject`（`src/client/manifest.js` 的 `RF.CLIENT_INJECT`，是**服务名**清单）。
两者是不同命名空间，别混。

### 兼容版本

本插件当前对齐 **DSH `0.2.1-alpha.1`**，且**零 npm 运行时依赖**（`dependencies` / `peerDependencies` 都是空的）——
不引入任何 `@deepseek-ai/dsh-*` 包，因此不会顶替宿主自己那份同名包，也就不存在版本预检失败的风险。

宿主侧对插件的三条硬性要求，本项目都满足：

- 工具的 `output.schema` 必须是宿主 `SCHEMA_TYPES`（object/array/string/number/integer/boolean/null）里的形状——`{type:'json'}` 会让**整个插件装不上**。
- 客户端产物必须返回 `{ inject, apply }`，`inject` 清单**精确等于**源码里每一次 `ctx.<svc>` 访问——少一个运行时报 `without inject`，客户端 fiber 整条失败、右栏不会出现 Tab。
- 快捷键默认键位不得与宿主占用键冲突——冲突时宿主抛 `Conflicting shortcut defaults`，同样导致右栏无 Tab。

---

## 使用

**打开工作台**：DSH Web 右侧栏 → 「ReelForge 工作台」Tab。也可以从右栏引导页（guide）里挑「ReelForge 工作台」入口。

**快捷键**（与宿主键位零冲突）

| 键 | 作用 |
|---|---|
| `Ctrl+Alt+D` | 打开工作台 → 章节页 |
| `Ctrl+Alt+S` | 打开工作台 → 分镜页 |
| `Ctrl+Alt+M` | 打开工作台 → 成片页 |

> macOS Web 端是 `⌘+Alt+<D/S/M>`（宿主在 macOS 上要求含 primary 修饰键）。桌面端一律 `Ctrl+Alt+<D/S/M>`，不用 `Cmd`。

**让模型来驱动**：在对话里说「把这本小说转成短剧」即可，模型会读随包技能（`skills/` 下 5 个）再调工具。

---

## 配置

全部可调值在 `cordis.patch.yml` 的 `config:` 块里，用户 patch 层覆盖后**在插件升级中存活**：

| 字段 | 默认 | 说明 |
|---|---|---|
| `workspaceDir` | `.reelforge` | 项目根目录（相对会话工作目录），所有产物落在这里 |
| `runPosition` | `cloud` | 运行位置：`local` / `cloud` |
| `comfyBaseUrl` | `http://127.0.0.1:8188` | 本地 ComfyUI 地址（仅 `local` 档使用） |
| `cloudProvider` | `dsh` | 云端 provider：`runninghub` / `online-api` / `dsh` |
| `stages` | 四阶段全开 | `llm` / `image` / `tts` / `video` 的开关 |
| `budgetLimitCny` | `12` | 成本上限（工作台底栏常驻显示） |
| `enableBgm` | `true` | 默认输出背景音乐 |
| `enableSubtitles` | `true` | 默认输出字幕 |
| `targetDuration` | `null` | 目标时长（秒）；`null` = 不限，按章交付 |
| `enableRunsTab` | `false` | 是否开放第二个右栏 Tab（历史运行与成本记录） |

值不合法时**立刻报错**（指明字段与合法取值），不会默默用默认值。

---

## 开发

### 目录

```
src/
  core/            纯逻辑（不出现 ctx）：枚举唯一来源、拆章、一致性、引用装配、变更日志、投影
  host/            宿主装配：工具注册、Config、投影、闸门、工作区、落盘桥
  client/          浏览器半（右栏工作台 Tab + 7 类消息行），经 new Function 装载
  workflows/       生成执行：工作流装配、ComfyUI / RunningHub / DSH 通道、参考解析
  media/           合成：ffmpeg 客户端、章节合成、交付
  skills/          技能工厂：技能工具、技能正文
scripts/
  check-package-identity.mjs  包名三处一致性（R7）
  verify-bundle.mjs           产物与包名 / 裸 specifier 检查
  verify-typecheck.mjs        JSDoc 类型检查（tsc --checkJs）
  verify-coverage.mjs         覆盖率门槛
  verify-acceptance.mjs       116 条验收项逐条实跑判定
  run-task-dod.mjs            报告生成
  list-registered-tools.mjs   列出向宿主提交的工具
skills/            随包技能正文（5 个，各带 references/）
workflows/         随包工作流模板（specs/ 5 种 kind + templates/）
locale/            zh.json / en.json
docs/开发任务/    （**已纳入 Git**）T1–T5 任务书 + 实机原始记录 —— 验收门禁硬依赖
docs/              （本地）设计方案等其余文档 —— 未纳入 Git
design/            （**已纳入 Git**）RF7 设计真源：_tools/ 建稿脚本 + FigCraft 主稿 + 18 板暗/亮 SVG/PNG
references/        （本地）第三方 UI 参考图 —— **未纳入 Git**
```

### 产物体积

| 项 | 值 |
|---|---|
| npm 包（tarball） | **~329 kB** |
| 解压后 | ~1.1 MB |
| 文件数 | 93 |
| **运行时** npm 依赖 | **0**（`dependencies` / `peerDependencies` 都是空的） |

`files` 排除了 `src/**/__tests__/**`（测试占 `src/` 体积的一半，不进包）。
`design/` 进了 Git（设计真源与出稿要能评审、能 diff），但**不在 `files` 里**，所以不进 npm 包；`references/` 整目录忽略，不进 Git 也不进 npm 包；`docs/开发任务/` 进了 Git 但同样**不在 `files` 里**。

### scripts

```powershell
npm run check:identity     # 包名三处一致（R7）
npm run verify:bundle      # 装载验证 + R8 Config 三处一致
npm run typecheck          # JSDoc 类型检查（tsc --checkJs）
npm test                   # 742 条测试（740 pass；无 ffmpeg 时 2 条显式 skip）
npm run verify:coverage    # 覆盖率门槛（4 个文件）
npm run verify:acceptance  # 116 条验收项
npm run verify:all         # 上面这些的组合（= prepublishOnly）
npm run acceptance         # 重新生成交付报告（连跑两次逐文件 SHA256 一致）
```

> `npm run typecheck` 跑的是 `tsc --checkJs`——本项目**保持零运行时依赖的纯 JS**，
> 类型信息写在 JSDoc 里，由机器检查。
> typescript 只作为 **devDependency**（不进产物、不进 `dependencies`）；脚本还会自寻 tsc：
> ① 环境变量 `RF_TSC_PATH` ② 本项目 `node_modules/typescript` ③ 环境变量 `DSH_REPO` 指向的宿主仓库 ④ PATH 上的 `tsc`。
> 都找不到就**明确报缺什么**并给安装命令，不静默跳过。
>
> `tsconfig.json` **排除 `src/client/**`**——客户端是 `new Function('RF','React','h', src)` 字符串执行，
> `h` / `RF` / `React` 是宿主注入的标识符，tsc 看不见（与覆盖率门槛排除客户端 13 个文件同口径）。

### 本地联调

```powershell
# 1. 同步源码到 profile（pnpm 的 file: 依赖是拷贝，改源码不会自动生效）
# 2. 重启宿主（boot 时会快照 client.js，不重启浏览器拿到的是旧产物）
cd D:\Code\WebCode\deepseek-harness
pnpm dsh plugin --profile web add file:D:/Code/WebCode/dsh-reelforge
pnpm dsh web
```

### 实现要点

- **状态不落内存。** 会话日志是唯一事实源，投影是纯 fold；重建状态 = fold 日志里的 `tool/result` 补丁。
- **不走官方 remotes。** `ctx.remote.<namespace>` 对第三方插件是关闭的（Client 侧是静态清单，第三方包加不进去）。改走 `ctx.connection.fetch.register`，在 Connection 的认证栅栏内注册精确路由（`/api/reelforge.state`、`/api/reelforge.capabilities`），浏览器同源 `fetch` 直读。
- **枚举只有一个来源。** `src/core/constants.js` 是唯一枚举来源；客户端的 `src/client/manifest.js` 是它的**字面镜像**，单测逐项比对，不一致就红。
- **Config 三处一致（R8）。** `src/host/config.js` 的 `CONFIG_DEFAULTS`、`cordis.patch.yml`、`patch.dev.yml` 说的是同一份可调值。`npm run verify:bundle` 会逐项比对这三处（含 `stages.*` 嵌套字段，共 13 项）——三处任何一处单独改、另外两处不跟，就会出现「联调是一套配置、装进宿主是另一套」，而**不报错**，只是行为不同。
- **客户端是字符串执行的。** `src/client/**` 通过 `new Function('RF','React','h', src)` 装载，`h` / `RF` / `React` 是宿主注入的标识符。所以 `tsc` 与 node 覆盖率都**不覆盖 `src/client/**`**——覆盖率表里文件缺席视为 0%，不是「跳过」。
- **失败路径必须说清缺什么。** 缺 ffmpeg 就说「本机缺 ffmpeg，未能出片」并附可执行的拼接命令；缺通道客户端就说「宿主未注入通道客户端」并给出注入点——不静默降级、不报 TypeError。
- **取消是真的取消。** 宿主的 `exec.signal` 一路传到生成链（ComfyUI / RunningHub / DSH）与合成链（ffmpeg）。
  合成链中止时**杀掉正在跑的 ffmpeg 子进程**（不是等它跑完），云端轮询每轮之前查一次取消——
  RunningHub 的默认等待上限是 120 分钟，不查就等于「我取消了」完全无效。
  被取消时报的是「已取消（停在第几步）」，**不会误报成「失败」或「超时」**。

---

## 已知限制

- **成本记账尚未接入**：底栏「已用」恒为 `¥0.00`（上限是真实的，来自 Config）。会话事件里没有花费字段可 fold。
- **合成需要真 ffmpeg / ffprobe**：缺失时走降级路径（不出片、明说原因、附拼接命令）。真机验证用的是 ffmpeg 9.0.2。
- **未实机验证的窄项**：面板在 900px / 1150px 两档宽度下未实机验证（宿主右栏宽度上限 = 视口 × 0.7，当前 782px 视口最多到 547px）；成片播放与交付物下载、导入小说的解析结果与 diagnostics 展示，需要 LLM 通道与真成片才能验。
- **`cordis_inspect_query` 无法由本机发起**：它在 DSH 里是暴露给**模型**用的宿主工具，不是 PATH 上的 CLI。

---

## License

[MIT](LICENSE) —— 除非另有说明。
