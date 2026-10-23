# DSH 实机证据（0.2.1-alpha.1）

> 本文件是**原始观察记录**，不是叙述性的「已验证」声明。
>
> `scripts/verify-acceptance.mjs` 会读它，按每条验收项声明的「必须出现的事实」逐条断言；
> 事实缺失时，对应验收项判为**证据缺失**（而不是通过）。所以这里的每一行都会被机器核对。

## 环境

| 项 | 值 |
| --- | --- |
| 宿主包 | `@deepseek-ai/dsh-root` 0.2.1-alpha.1（源码 `D:\ScriptProject\deepseek-harness`，构建号 `5badb15`） |
| 宿主页面标题 | `DSH 本地构建` |
| 宿主页面版本串 | `0.2.1-alpha.1-5badb15` |
| Node | v22.22.3 |
| profile | `rf-test`（`DSH_HOME` 指向本机临时目录） |
| 插件安装方式 | `dsh plugin add "file:D:/ScriptProject/dsh-reelforge"`，安装后宿主自动把 `@local/reelforge` 写进 `dsh.profile.bundles` |
| 宿主启动告警 | 无（此前修 schema 前有 `1 entry did not activate`，现宿主干净激活） |

## 复跑步骤（可重复）

```powershell
# 1. 同步仓库源码到 profile（pnpm 的 file: 依赖是「拷贝」不是链接，改源码不会自动生效）
& "$env:TEMP\rf-smoke\sync-profile.ps1"

# 2. 重启 DSH（宿主 boot 时快照 client.js，不重启浏览器拿到的是旧产物）
Set-Location 'D:\ScriptProject\deepseek-harness'
$env:DSH_HOME = "$env:TEMP\rf-dsh-home"
node --import tsx/esm apps/cli/src/bin.ts --profile rf-test --no-open
# 输出：dsh web: http://127.0.0.1:3080/?token=<token>

# 3. 浏览器打开该地址（用 open_tab，不要用 reload / navigate）
# 4. 点「打开右侧边栏」→ 右栏「开始」页出现「ReelForge 工作台」入口 → 点它 → 工作台面板渲染
```

---

## 事实 1：右栏出现 ReelForge 入口（kind = `reelforge-workbench`）

宿主右栏「开始」页引导区原始 DOM 片段：

```html
<div data-slot="sidebar.right.tab.guide.entry">
  <button type="button" class="Caii9q_entry" data-sidebar-right-guide-entry="reelforge-workbench">
    <span class="Caii9q_entryIcon"></span>
    <span class="Caii9q_entryText">
      <span class="Caii9q_entryTitle">ReelForge 工作台</span>
      <span class="Caii9q_entryDescription">章节 · 分镜 · 资产 · 上下文 · 技能 · 成片 · 日志</span>
    </span>
  </button>
</div>
```

同一页里宿主自带的两个入口（用来对照，说明「ReelForge 工作台」确实是本插件注册进来的）：

```html
<button type="button" class="Caii9q_entry" data-sidebar-right-guide-entry="files" aria-keyshortcuts="Control+Alt+P">
  <span class="Caii9q_entryTitle">工作区文件</span>
  <span class="Caii9q_entryDescription">浏览会话工作区的文件</span>
</button>
```

## 事实 2：点开后工作台面板真的渲染出来

右栏 Tab 宿主容器原始 DOM 片段：

```html
<div class="moZRpG_tabBody" data-sidebar-right-tab="tab2" data-sidebar-right-occurrence="537a4750-2a00-4791-899a-d83befa9340a">
  <div data-slot="sidebar.right.pane.tab">
```

面板自身原始 DOM（`rf-root` 全文，未删节）：

```html
<section class="rf-root"><header class="rf-header"><div class="rf-header__text"><div class="rf-header__title">ReelForge 工作台</div><div class="rf-header__subtitle">章节 · 分镜 · 资产 · 上下文 · 技能 · 成片 · 日志</div></div><span class="rf-header__status">云端运行</span></header><nav class="rf-stagebar" aria-label="ReelForge 工作台"><span class="rf-stagebar__step rf-stagebar__step--current"><span class="rf-stagebar__dot rf-stagebar__dot--current"></span><span>需求</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>运行</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>方案</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>生成</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>分镜</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>交付</span></span><span class="rf-stagebar__count">1 / 6</span></nav><div class="rf-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" class="rf-tabs__item rf-tabs__item--active">章节</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">分镜</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">资产</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">上下文</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">技能</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">成片</button><button type="button" role="tab" aria-selected="false" class="rf-tabs__item">日志</button></div><div class="rf-scroll"><div class="rf-empty rf-empty--empty"><div class="rf-empty__title">还没有章节。导入小说即可自动拆章。</div><div class="rf-empty__hint">在对话里让助手带你走下一步。</div></div></div><footer class="rf-footer"><div class="rf-footer__text"><div class="rf-footer__label">已用 ¥0.00 / 上限 ¥12.00</div><div class="rf-footer__value">章节 · 分镜 · 资产 · 上下文 · 技能 · 成片 · 日志</div></div><button type="button" class="rf-btn rf-btn--primary">成片</button></footer></section>
```

要点（脚本按这些 token 断言）：

- 面板根节点 `class="rf-root"`
- 7 个二级页签：章节 / 分镜 / 资产 / 上下文 / 技能 / 成片 / 日志
- 6 步阶段条：需求 / 运行 / 方案 / 生成 / 分镜 / 交付，计数 `1 / 6`
- 空态文案 `还没有章节。导入小说即可自动拆章。`
- 底栏成本位 `已用 ¥0.00 / 上限 ¥12.00`（上限来自 `config.budgetLimitCny`，默认 12）
- 滚动容器只有 `rf-scroll` 一个，底栏 `rf-footer` 在它外面（结构上不会被裁掉）

## 事实 3：浏览器控制台零错误

宿主页面加载 + 展开右栏 + 点开工作台全程，浏览器 console 采集结果为 `0` 条（无 error / warn / uncaught exception）。

## 事实 4：快捷键与宿主逐键对照

宿主设置面板「快捷键速查」的**原文**（换行已机械规整为单行；每一行都是面板里真实的一条）：

```text
新会话 | Ctrl + /
展开／收起左侧栏 | Ctrl + Alt + B
搜索会话 | Ctrl + Alt + K
添加工作区 | Ctrl + Alt + O
重命名会话 | Ctrl + Alt + G
分叉会话 | Ctrl + Shift + F
归档会话 | Ctrl + Alt + A
打开设置 | Ctrl + Alt + ,
在本地打开 | Ctrl + Shift + O
展开／收起右侧栏 | Ctrl + Shift + B
工作区文件 | Ctrl + Alt + P
新建终端 | Ctrl + `
分栏 | Ctrl + \
面板全屏／退出全屏 | Ctrl + Alt + Enter
刷新当前页面 | Ctrl + Alt + R
关闭当前页面／窗口 | Ctrl + Alt + W
ReelForge 工作台 | Ctrl + Alt + M
ReelForge 工作台 | Ctrl + Alt + S
ReelForge 工作台 | Ctrl + Alt + D
```

宿主自己的字母键集合：`B K O G F A P R W`（另有 `,` `、` `\` `` ` `` 这类非字母键）。
本插件的三个字母键：`D S M`。

**结论：两组字母键集合不相交**；且宿主能在同一个「快捷键速查」面板里同时列出两组，说明
`ShortcutRegistry.register` 全部注册成功——冲突时宿主会抛
`Conflicting shortcut defaults` 并让整条客户端 fiber 失败（右栏将不再出现 ReelForge 入口）。

> 修前对照：本插件原用 `KeyR`（撞「刷新当前页面」`Ctrl + Alt + R`）、`KeyP`（撞「工作区文件」
> `Ctrl + Alt + P`），实机表现为客户端 fiber 抛错、右栏无 ReelForge 入口。

## 事实 5：宿主工具定义全部合规

用宿主自己的校验器（`packages/core/tools/src/json-schema.ts` 的 `assertSupportedJsonSchema`）
审本插件的 15 个工具定义：`0 / 15` 不合规。

宿主不支持的两种写法（修前踩中）：
- `output.schema: { type: 'json' }` —— `'json'` 不在 `SCHEMA_TYPES`（object/array/string/number/integer/boolean/null）内
- `{ type: ['number', 'null'] }` —— 宿主明确不支持 type 数组（"type arrays are not supported"）

---

## 事实 6：插件向宿主提交的工具清单（T1 A3）

DSH 0.2.1-alpha.1 里 `cordis_inspect_query` 是**暴露给模型用的宿主工具**
（见 `packages/preset/agent-preset/skills/cordis-plugin-development/`），**不是 PATH 上的 CLI**；
本机没有 LLM 通道时无法由模型发起该调用，所以拿不到「`--service Tool` 的输出」原文。

这里给出**等价证据**：`node scripts/list-registered-tools.mjs`（仓库内可复现）列出插件 `apply()` 之后
向宿主 `tools.register` 提交的全部工具定义 —— 13 个 ReelForge 工具 + 2 个只读技能工具 = 15 个。

```text
插件：@local/reelforge
向宿主 tools.register 提交的工具：15 个

· reelforge.import_novel
· reelforge.set_storyboard
· reelforge.save_context
· reelforge.update_shot
· reelforge.create_asset
· reelforge.update_asset
· reelforge.bind_asset
· reelforge.run_stage
· reelforge.regenerate_shot
· reelforge.assemble_chapter
· reelforge.set_chapter_music
· reelforge.rollback
· reelforge.update_plan
· skill
· skill_reference

路由 2 条：/api/reelforge.state、/api/reelforge.capabilities
投影单元 1 个 · systemPrompt 段 1 个 · 监听 tools/pre-execute、session/event

✓ 15 个预期工具全部注册到位（共 15 个）
```

配套的真机事实：真实 DSH 宿主激活插件时**没有** `1 entry did not activate` 告警 ——
`ctx.tools.register` 一旦抛错（比如 schema 非法），宿主会丢弃整个 entry，
所以「宿主干净激活」本身就是「这批工具注册成功」的证据。

---

## 事实 7：明 / 暗主题（T5 A6）

宿主设置 → 通用设置 → 外观 → 深色。切换后宿主的根节点属性（原文）：

```html
<html lang="zh-CN" data-ds-theme-source="dark" style="color-scheme: dark;">
<body data-ds-dark-theme="">
```

主题偏好是**持久化**的（重开宿主页面仍是 `dark`；boot 脚本里 `const preference = "dark"`）。

深色下工作台面板的 `rf-root` DOM 与浅色下**逐字相同**（结构、7 个页签、6 步阶段条、
空态文案、底栏成本位全在），无报错、控制台 0 条。

**结构性保证**：面板样式**全部**走宿主 CSS 变量，没有一处硬编码色值 ——
`var(--dsw-alias-bg-base)`、`var(--dsw-alias-bg-layer-1/2/3)`、`var(--dsw-alias-label-primary/secondary/tertiary/caption)`、
`var(--dsw-alias-border-l1/l2)`、`var(--dsw-alias-brand-primary)`、`var(--dsw-alias-button-primary-fill/-hover/-dimmed)`、
`var(--dsw-alias-state-success-primary)`、`var(--dsw-alias-state-idle-primary)`、`var(--dsw-alias-state-error-primary)`。
所以明暗切换由宿主重算变量，插件不需要自己判主题。

---

## 事实 8：面板宽度实测（T5 A4 的部分证据）

宿主视口 **782px**（MiniMax Code 桌面端 FilePanel 的宽度）。宿主自己的宽度约束
（`packages/client/ui-layout/src/client/columns.ts`）：

```ts
export const RIGHTBAR_MIN = 300        // 右栏拖拽下限
export const RIGHTBAR_MAX_RATIO = 0.7  // 右栏最大宽度 = 视口 × 0.7
export const RIGHTBAR_DEFAULT_RATIO = 0.45
```

实测两档（`inspect` 的 `rect` 原文）：

| 场景 | 面板 rect | 宽度 |
| --- | --- | --- |
| 宿主默认右栏 | `x: 456, width: 326` | 326px |
| 宿主「面板全屏」 | `x: 0, width: 782` | 782px |

两档下面板均**不破版**：底栏成本位单行显示（`已用 ¥0.00 / 上限 ¥12.00`）、副标题单行省略、
主按钮「成片」保持单行、7 个页签与 6 步阶段条均完整。

窄栏（326px）下曾出现「成片」按钮被压成两行、副标题折成三行把底栏撑高 ——
已修（`src/client/workbench/styles.js`：`.rf-btn` 加 `white-space: nowrap` + `flex: 0 0 auto`，
`.rf-footer__label` / `.rf-footer__value` 加单行省略）。

**未覆盖**：验收标准的 900px / 1150px 两档在本宿主窗口下**物理不可达** ——
右栏宽度上限 = 视口 × `RIGHTBAR_MAX_RATIO` = 782 × 0.7 = **547px**，
要达到 900px 需要视口 ≥ 1286px、1150px 需要 ≥ 1643px。这两档留作实机待补。

---

## 事实 9：成片规格的 ffprobe 原文（T4 A2）

用**真 ffmpeg 9.0.2** 现场合成一章成片（`src/media/assemble.js` 的 `assembleChapter`，
`src/media/__tests__/assemble-e2e.test.js` 同一条路径），再对产物跑**真 ffprobe**。

产物：`exports/ch01.mp4`（无字幕版）、`exports/ch01_带字幕.mp4`、`exports/ch01.srt`

`ffprobe` 原文（`-show_entries stream=... -of default=noprint_wrappers=1`）：

```text
index=0
codec_name=h264
profile=High
codec_type=video
width=270
height=480
pix_fmt=yuv420p
r_frame_rate=24/1
avg_frame_rate=24/1
index=1
codec_name=aac
profile=LC
codec_type=audio
sample_rate=48000
channels=2
channel_layout=stereo
format_name=mov,mp4,m4a,3gp,3g2,mj2
duration=6.021322
size=228203
bit_rate=303193
```

`ffprobe` 摘要原文：

```text
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '.../exports/ch01.mp4':
  Duration: 00:00:06.02, start: 0.000000, bitrate: 303 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 270x480 [SAR 1:1 DAR 9:16], 209 kb/s, 24 fps, 24 tbr, 12288 tbn, start 0.021322 (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 87 kb/s (default)
```

faststart 判定（读 mp4 盒偏移）：`moov` 偏移 **36**，`mdat` 偏移 **5632** → `moov` 在前 = **true**。

对照验收标准「H.264 / AAC / 24fps / yuv420p / +faststart」：

| 标准 | 实测 | |
| --- | --- | --- |
| H.264 | `codec_name=h264` / `profile=High` | ✓ |
| AAC | `codec_name=aac` / `profile=LC` / 48000 Hz / stereo | ✓ |
| 24fps | `r_frame_rate=24/1` / `avg_frame_rate=24/1` | ✓ |
| yuv420p | `pix_fmt=yuv420p` | ✓ |
| +faststart | `moov`(36) 在 `mdat`(5632) 之前 | ✓ |

复跑方式：

```powershell
$env:RF_FFMPEG_PATH  = '<ffmpeg.exe>'
$env:RF_FFPROBE_PATH = '<ffprobe.exe>'
node --test src/media/__tests__/assemble-e2e.test.js   # 真 ffmpeg 实跑组
```

