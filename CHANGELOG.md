# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-23

> 首个可运行版本。**尚未发布到 npm**（`package.json` 里 `private: true`），只能用本地路径装载。

### Notes

- 本项目是**零 npm 运行时依赖**的纯 JS 插件（无 `.ts`、无 `dependencies` / `peerDependencies`）。
  类型信息写在 JSDoc 里，由 `npm run typecheck`（`tsc --checkJs`）机器检查。
- 实机验证环境：DSH `0.2.1-alpha.1`（构建号 `5badb15`）、Node v22.22.3、Windows / PowerShell 7。
  原始观察记录见 `docs/开发任务/实机/dsh-0.2.1-alpha.1.md`，验收脚本逐条核对。

### Added

- **宿主半**：15 个工具（13 个 `reelforge.*` + 2 个只读技能工具）、2 条 Connection 认证路由
  （`/api/reelforge.state`、`/api/reelforge.capabilities`）、1 个会话投影单元、1 段 systemPrompt 技能目录。
- **浏览器半**：右栏「ReelForge 工作台」Tab —— 6 步阶段条 + 7 个页签
  （章节 · 分镜 · 资产 · 上下文 · 技能 · 成片 · 日志）+ 常驻成本位；
  对话里 7 类消息行（进度 / 章节 / 分镜 / 执行路径 / 资产 / 交付 / 变更日志）。
- **合成链**：`assemble_chapter` 产出带字幕 / 无字幕两版成片与 srt，
  规格 **H.264 / AAC / 24fps / yuv420p / +faststart**；无字幕版是**重封装**（`-c copy`），不重渲。
- **回滚**：三级（`single` / `batch` / `timepoint`），变更日志落 `changelog.jsonl`。
- **随包技能** 5 个（`novel-to-video` / `story-pipeline` / `image-prompt` / `video-prompt` / `voice-design`），
  各带 `references/`。
- **验证链**：116 条验收项逐条实跑判定（`scripts/verify-acceptance.mjs`）、覆盖率门槛
  （`scripts/verify-coverage.mjs`）、JSDoc 类型检查（`scripts/verify-typecheck.mjs`）、
  报告生成（`scripts/run-task-dod.mjs`，连跑两次产出字节一致）、CI（`.github/workflows/ci.yml`）。
- **JSDoc 类型门禁**：`tsc --checkJs` 查「标注与实现不一致」——
  **310 条**错误清零（`TS2339` 252 / `TS2591` 85 / `TS2741` 14 / `TS2353` 13 / `TS2345` 8 / `TS2739` 8 / `TS2322` 6 …）。
  全程**只改 JSDoc 标注与类型断言**，零运行时逻辑改动（改动前后用 TypeScript 编译器
  API 比对 AST，节点完全一致）。
- **R8：Config 三处一致**：`src/host/config.js` 的 `CONFIG_DEFAULTS`、`cordis.patch.yml`、
  `patch.dev.yml` 说的是同一份可调值（13 项，含 `stages.*`）。`npm run verify:bundle`
  逐项比对——三处任何一处单独改、另外两处不跟，就会「联调是一套配置、装进宿主是另一套」，
  而**不报错**，只是行为不同。
- **实机证据落库**：`docs/开发任务/实机/` 存原始观察记录，验收脚本按「必须出现的事实」逐条核对，
  缺任何一条就退回「证据缺失」——状态不是写死的结论。

### Fixed

- **插件在真实 DSH 里装不上**（此前从未在任何真实宿主里成功激活过）：
  - 工具的 `output.schema` 用了 `{type:'json'}`，不在宿主的 `SCHEMA_TYPES` 内 →
    `ctx.tools.register` 抛 `JsonSchemaError`，**15 个工具全不合规、插件整个装不上**。
  - 可空数字参数用了 `{type:['number','null']}`（type 数组），宿主明确不支持 → 改用 `oneOf`。
- **客户端 fiber 失败、右栏无 Tab**：
  - 客户端产物只返回 `{apply}`、没返回 `inject` → 每次访问 `ctx.locale` 抛
    `cannot get property "locale" without inject`。
  - 快捷键默认键位 `KeyR` / `KeyP` 与宿主占用键冲突（`page.refresh` / `workspace.files`）→
    宿主抛 `Conflicting shortcut defaults`，整条客户端 fiber 失败。改用宿主未占用的
    `KeyD` / `KeyS` / `KeyM`。
- **预算上限没从 Config 走到客户端视图**：工作台底栏显示「上限 ¥0.00」，而 `config.budgetLimitCny`
  默认是 12 —— 投影层把 `cost.cap` 写死了 0。现在由 Config 透传，非法值回退 0。
- **窄栏破版**：宿主右栏只有 326px 时，底栏「成片」主按钮被 flex 压成两行、副标题折成三行把底栏撑高。
  按钮改为不收缩、不折行；成本位与副标题改单行省略。

### Changed

- `output.schema` 统一为 `{type:'object', additionalProperties:true}`（宿主两种方言下都合法）。
- 快捷键保留 `Ctrl+Alt+<字母>` 方案（不改修饰键），只换键码；macOS Web 端用 `meta+alt`
  （宿主在 macOS 上要求含 primary）；**不声明 `web:linux`**（该平台只认 3 种组合，宿主判定不支持）。

### Security

- 工作区路径越界防护：`workspaceDir` 必须在会话目录内，否则直接报错，一个字节都不落到会话目录外。

### 发布形态

- **README / CHANGELOG / LICENSE（MIT）/ `tsconfig.json` / `pnpm-workspace.yaml` / `patch.dev.yml`** 补齐，
  结构对齐已发布的同族插件（`dsh-usage-meters`）。
- `package.json` 补 `license` / `author` / `keywords` / `engines` / `main` / `exports["./package.json"]` /
  `dependencies` / `peerDependencies` / `prepublishOnly`，`files` 排除 `src/**/__tests__/**`
  （随包体积 588 kB → 431 kB）。
- `dsh.client.inject` 补齐 `dsh-client-locale` 与 `dsh-client-ui-slots` 两个**模块包名**——
  注意它与客户端产物导出的 `inject`（**cordis 服务名**清单）是两个不同命名空间。
- `files` 排除 `docs/开发任务/reports/**`——**自动生成的** DoD 报告不随包发布
  （仓库里照常提交，验收证据链不受影响）。
- `npm run build:client` 改成**幂等**：内容相同就不重写 `client.js`（保住 mtime）。

### 修复

- **交付报告每次重跑都出假 diff**（可复现性失效）：报告内嵌 `npm pack --dry-run` 的原始输出，
  而 tarball 哈希**每次都变**——tar 里带文件 mtime。三层根因都修了：
  ① `build:client` 之前每次都**重写** `client.js`（内容相同也写），mtime 一变 tarball 哈希就变
  ⇒ 改成内容相同就不写；
  ② 归一化里补上 `shasum` / `integrity`——tarball 哈希是**纯噪声**
  （「包内容有没有变」由 git diff 判定，不由 tarball 哈希判定）；
  ③ `files` 排除自动生成的 DoD 报告——它在内嵌的 pack 清单里会形成**自引用**
  （报告含自己的体积 ⇒ 体积变 ⇒ 清单变 ⇒ 报告变），包体积在 441.4↔441.5 kB 之间来回震荡。
  现在 **7 份报告连跑两次逐文件 SHA256 完全一致**。

- **合成中间产物多落一层目录**：`deliverBridge` 把 `tmpDir` 写成 `.reelforge/tmp`，
  而 `resolvePath` 是相对工作区根（`<cwd>/.reelforge`）解析的，实际落成
  `<cwd>/.reelforge/.reelforge/tmp`。改为 `tmp`（与 `exportsDir` 同级），并补回归测试。
- **取消信号在合成链上被静默吞掉**：宿主把 `exec.signal` 一路传到 `assembleChapter`，
  但实现**声明了参数、从不消费**——而生成链（`src/workflows/*`）是认取消的。
  于是「我取消了」在合成阶段无效，ffmpeg 照样把 CPU 烧完。
  现在：`ffmpeg` 客户端支持 `AbortSignal`（中止时**杀掉子进程**并返回
  `spawnError: 'ABORT_ERR'`），`assembleChapter` 每步之前检查取消、
  把信号透传给客户端；被取消时报的是「已取消（停在第几步）」，
  **不会误报成「归一片段失败」**。补 7 条用例（`src/media/__tests__/assemble-abort.test.js`）。
- **取消信号在云端 RunningHub 通道上被静默吞掉**：`waitForTask` 声明了 `signal` 却**从不消费**，
  而默认等待上限是 **120 分钟**——「我取消了」在云端这条通道上等于没取消，任务会一直轮询到超时。
  现在：每轮之前检查取消、把信号透传给 `getTask`（正在进行的请求也会被取消），
  被取消时报的是「轮询被取消」而不是「等待超时」。补 8 条用例
  （`src/workflows/__tests__/rf-cancellation.test.js`）。
- **缺参数时抛裸 `TypeError`**（违反「失败路径必须说清缺什么」）：
  `waitForTask` 缺 `client` / `taskId`、ComfyUI 的 AMD 档显存释放缺 `free`，
  原本抛的是 `TypeError: Cannot read properties of undefined` / `free is not a function`。
  现在给可读错误，并说清缺什么、为什么需要它。
