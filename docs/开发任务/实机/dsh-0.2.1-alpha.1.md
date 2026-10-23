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


---

## 事实 10：工作台七屏 + 写操作全链路（2026-10-24 实机，DSH 0.2.1-alpha.1）

这一轮用**真实宿主 + 系统 Chrome**（Playwright `channel: 'chrome'`，视口 1600×1000）跑了一遍：
逐屏截图 + 抓**原始 DOM 文案** + 真的点按钮看副作用。

### 10.1 环境与复跑

| 项 | 值 |
| --- | --- |
| 宿主 | `@deepseek-ai/dsh-root` 0.2.1-alpha.1（源码 `D:\ScriptProject\deepseek-harness`） |
| 插件安装 | `dsh plugin --profile web add "link:D:/ScriptProject/dsh-reelforge"`（**符号链接**，改仓库即生效，不用重装） |
| 隔离 profile | `DSH_HOME=%TEMP%\dsh-rf-ui` |
| 模型通道 | 本机 mock（`http://127.0.0.1:8098/v1`）：mock 扮演模型，听懂「请调用工具 X，参数 {...}」就去调对应工具；每个请求体落盘 |
| 控制台错误 | **0 条** |

复跑：

```powershell
# 1) 起带日志的 mock（8098）
node "$env:TEMP\rf-mock-log.mjs"
# 2) 起宿主（3081）
$env:DSH_HOME = "$env:TEMP\dsh-rf-ui"
$env:DEEPSEEK_BASE_URL = 'http://127.0.0.1:8098/v1'
$env:DEEPSEEK_API_KEY = 'mock-key'
node --import tsx/esm apps/cli/src/bin.ts web --port 3081 --no-open
# 3) 浏览器脚本：发消息 → 工具调用 → 逐屏 → 点回滚 → 点「允许一次」
node "$env:TEMP\rf-ui-e2e3.mjs" "http://127.0.0.1:3081/?token=<token>" "$env:TEMP\rf-ui-e2e6"
```

### 10.2 空态七屏（新建会话、还没发消息）

原始 innerText（逐屏点开抓的，**没有手抄**）：

### 阶段条（.rf-stagebar 原始 innerText）
```text
需求
运行
方案
生成
分镜
交付
1 / 6
```

### 七屏逐屏原始文案（.rf-header__title / __subtitle / __status / .rf-scroll）
```text
--- 页签「章节」
title: ReelForge 工作台
subtitle: 《未命名项目》· 0 章 · 0 镜
capsule: 待开始
footer.label: 当前阶段
footer.value: 需求 · 还没有开始生成
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
还没有章节。把小说正文粘到对话框，这里会自动拆章。
下一步：把需求写全，下面就会往下走。
还没有开始生成 · 已用 ¥0.00 / 上限 ¥12.00

--- 页签「分镜」
title: 分镜表
subtitle: 还没有分镜表
capsule: 还没有章
footer.label: 下一步
footer.value: 跑 video 阶段出片
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
还没有分镜。助手会按上面的需求生成分镜表。
下一步：把需求写全，下面就会往下走。
还没有分镜表：先把小说正文粘到对话框拆章，才能生成这一章。

--- 页签「资产」
title: 资产库
subtitle: 10 类资产，变体挂在父资产下
capsule: 0 项资产
footer.label: 下一步
footer.value: 逐镜写分镜
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
资产
人物
场景
道具
服装
年龄变体
音色
配乐
音效
视频
其他
还没有参考图。助手会按需生成人物、场景与道具图。
下一步：把需求写全，下面就会往下走。
变体类（服装 / 年龄）必须带 parent_id，挂在原资产下
参考图优先级：服装 > 年龄变体 > 角色原图（独立维度，不叠加）

--- 页签「上下文」
title: 上下文
subtitle: 一致性锚点：圣经 / 风格 / 连续性
capsule: 3 个分区
footer.label: 下一步
footer.value: 生成资产参考图
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
上下文是空的。让人物圣经、风格指南或连续性记录先落一笔。
下一步：把需求写全，下面就会往下走。
人物圣经
整段覆盖
风格指南
整段覆盖
连续性记录
追加
上下文只允许三个键，多写的键一律报错不静默丢弃

--- 页签「技能」
title: 技能
subtitle: 写作规范以技能形式装载
capsule: 1 个来源
footer.label: 技能来源
footer.value: 内置 5 · 已装 0 · 自建 0
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
技能
内置
已装
自建
novel-to-video
ReelForge 总流水线——把小说/创意变成带配音字幕的短剧成片，是当前工作模式技能，不确定该做哪一步时先读它
内置
6.4 KB · 2026-10-23
reelforge-image-prompt
资产参考图与镜头图的提示词规范——人物三视图、场景图、道具图、服装与年龄变体怎么写才不漂
内置
6.6 KB · 2026-10-23
reelforge-story-pipeline
把小说正文变成剧本与分镜表——拆章、写人物圣经、拆分镜、绑定资产，并守住时长与说话人硬约束
内置
7.1 KB · 2026-10-23
reelforge-video-prompt
视频提示词与参考标签规范——每镜怎么写、参考素材怎么编号挂载、改写时怎么保住占位符
内置
6.3 KB · 2026-10-23
reelforge-voice-design
角色音色设计规范——音色描述怎么写、怎么绑到角色、缺音色时怎么说清楚
内置
5.6 KB · 2026-10-23
插件不分发第三方技能正文，用户自行安装上游技能包。
技能包安装走对话框：请说「安装技能包 <名称>」

--- 页签「成片」
title: 成片
subtitle: 还没有成片
capsule: 还没开始渲染
footer.label: 本集用时
footer.value: 还没开始渲染
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
还没有成片。合成一章即可出片。
下一步：把需求写全，下面就会往下走。
还没有交付物：合成一章之后，这里会列出成片与素材。

--- 页签「日志」
title: 变更日志
subtitle: 谁在什么时候改了什么，可回滚
capsule: 0 条
footer.label: 全项目
footer.value: 0 条
body:
你的需求（自动捕获）
在中间的对话框里写下你想做的事，它会原样落在这里。
还没有变更。
下一步：把需求写全，下面就会往下走。

```

### 控制台错误条数：0

### 工作台根节点原始 DOM 开头（.rf-root 原始 outerHTML 前 1200 字符）
```html
<section class="rf-root"><header class="rf-header"><div class="rf-header__logo" aria-hidden="true"></div><div class="rf-header__text"><div class="rf-header__title">变更日志</div><div class="rf-header__subtitle">谁在什么时候改了什么，可回滚</div></div><span class="rf-header__status">0 条</span></header><nav class="rf-stagebar" aria-label="ReelForge 工作台"><span class="rf-stagebar__step rf-stagebar__step--current"><span class="rf-stagebar__dot rf-stagebar__dot--current"></span><span>需求</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>运行</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>方案</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>生成</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>分镜</span></span><span class="rf-stagebar__step rf-stagebar__step--upcoming"><span class="rf-stagebar__dot rf-stagebar__dot--upcoming"></span><span>
```

### 10.3 有数据时七屏（发消息 → `reelforge.import_novel` 真跑通 → 2 章）

原始 innerText（每屏的标题 / 副标 / 胶囊 / 底栏两行 / 正文）：

```text
--- 页签「章节」
subtitle: 《夜航船》· 2 章 · 0 镜
capsule: 待开始
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
章节
第1章
0 镜 · 0.0s
待写分镜
剧本与提示词
参考图
音色样本
视频
第2章
0 镜 · 0.0s
待写分镜
剧本与提示词
参考图
音色样本
视频
video 硬依赖 image：没有参考图直接报错。
video 软依赖 tts：缺失时视频降质，界面会标出来。
章节 = 一个可独立交付的成片单元 · 一章一集
第 1 章 · 第 0 / 0 镜 · 已用 ¥0.00 / 上限 ¥12.00

--- 页签「分镜」
subtitle: 第 1 章 · 第1章 · 0 镜
capsule: 章 1 / 2
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
还没有分镜。助手会按上面的需求生成分镜表。
下一步：把需求写全，下面就会往下走。

--- 页签「资产」
subtitle: 10 类资产，变体挂在父资产下
capsule: 0 项资产
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
资产
人物
场景
道具
服装
年龄变体
音色
配乐
音效
视频
其他
还没有参考图。助手会按需生成人物、场景与道具图。
下一步：把需求写全，下面就会往下走。
变体类（服装 / 年龄）必须带 parent_id，挂在原资产下
参考图优先级：服装 > 年龄变体 > 角色原图（独立维度，不叠加）

--- 页签「上下文」
subtitle: 一致性锚点：圣经 / 风格 / 连续性
capsule: 3 个分区
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
上下文是空的。让人物圣经、风格指南或连续性记录先落一笔。
下一步：把需求写全，下面就会往下走。
人物圣经
整段覆盖
风格指南
整段覆盖
连续性记录
追加
上下文只允许三个键，多写的键一律报错不静默丢弃

--- 页签「技能」
subtitle: 写作规范以技能形式装载
capsule: 1 个来源
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
技能
内置
已装
自建
novel-to-video
ReelForge 总流水线——把小说/创意变成带配音字幕的短剧成片，是当前工作模式技能，不确定该做哪一步时先读它
内置
6.4 KB · 2026-10-23
reelforge-image-prompt
资产参考图与镜头图的提示词规范——人物三视图、场景图、道具图、服装与年龄变体怎么写才不漂
内置
6.6 KB · 2026-10-23
reelforge-story-pipeline
把小说正文变成剧本与分镜表——拆章、写人物圣经、拆分镜、绑定资产，并守住时长与说话人硬约束
内置
7.1 KB · 2026-10-23
reelforge-video-prompt
视频提示词与参考标签规范——每镜怎么写、参考素材怎么编号挂载、改写时怎么保住占位符
内置
6.3 KB · 2026-10-23
reelforge-voice-design
角色音色设计规范——音色描述怎么写、怎么绑到角色、缺音色时怎么说清楚
内置
5.6 KB · 2026-10-23
插件不分发第三方技能正文，用户自行安装上游技能包。
技能包安装走对话框：请说「安装技能包 <名称>」

--- 页签「成片」
subtitle: 第 1 章 第1章 · 0 镜 · 0.0s
capsule: 还没开始渲染
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
还没有成片。合成一章即可出片。
下一步：把需求写全，下面就会往下走。
还没有交付物：合成一章之后，这里会列出成片与素材。

--- 页签「日志」
subtitle: 谁在什么时候改了什么，可回滚
capsule: 21 条
body:
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
回滚单条
回滚整批
回滚到时间点
2026-10-24 00:42
新建章节 1
* · batch_session-efa7f758-906b-4c0a-86fb-2887757c255b_0001
回滚
2026-10-24 00:42
新建章节 2
* · batch_session-efa7f758-906b-4c0a-86fb-2887757c255b_0001
回滚
2026-10-24 00:42
新建项目 project
* · batch_session-efa7f758-906b-4c0a-86fb-2887757c255b_0001
回滚
2026-10-24 00:46
新建章节 1
* · batch_session-c02da33c-fa01-4cef-8c93-7ec06c59f554_0001
回滚
2026-10-24 00:46
新建章节 2
* · batch_session-c02da33c-fa01-4cef-8c93-7ec06c59f554_0001
回滚
2026-10-24 00:46
新建项目 project
* · batch_session-c02da33c-fa01-4cef-8c93-7ec06c59f554_0001
回滚
2026-10-24 00:58
新建章节 1
* · batch_session-2316e61a-7494-4dc1-a7ef-976d3473e3c9_0001
回滚
2026-10-24 00:58
新建章节 2
* · batch_session-2316e61a-7494-4dc1-a7ef-976d3473e3c9_0001
回滚
2026-10-24 00:58
新建项目 project
* · batch_session-2316e61a-7494-4dc1-a7ef-976d3473e3c9_0001
回滚
2026-10-24 01:14
新建章节 1
* · batch_session-0

```

### 10.4 写操作全链路：点「回滚」→ 宿主 ask 授权 → 允许 → **数据真变**

**① 工作台按钮把工具指令投进会话**（对话区原文）：

```text
请调用工具 reelforge.rollback，参数 {"entryId":"cl_20261023172437892_000019_8cec7dbe","mode":"single"}
```

**② 模型转成工具调用**（mock 收到的请求体原文，节选）：

```json
{"type":"tool_use","name":"reelforge.rollback","input":{"entryId":"cl_20261023172437892_000019_8cec7dbe","mode":"single"}}
```

**③ 宿主弹 ask 人工授权**（`[data-approval-key]` 面板原始 innerText）：

```text
等待审批
ReelForge：reelforge.rollback 会消耗算力与费用，请确认。
拒绝
允许一次
```

**④ 点「允许一次」后工具真跑**（工具返回原文）：

```json
[{"type":"text","text":"{\n  \"ok\": true,\n  \"status\": 200,\n  \"code\": null,\n  \"mode\": \"single\",\n  \"rolledBack\": [\n    {\n      \"entryId\": \"cl_20261023164239906_000001_adc42e41\",\n      \"layer\": \"chapter\",\n      \"rowId\": \"1\",\n      \"field\": \"*\",\n      \"op\": \"create\",\n      \"batchId\": \"batch_session-efa7f758-906b-4c0a-86fb-2887757c255b_0001\",\n      \"at\": \"2026-10-23T16:42:39.906Z\"\n    }\n  ],\n  \"restored\": 1,\n  \"forced\": false,\n  \"conflicts\": [],\n  \"message\": \"\",\n  \"notice\": \"媒体二进制不随回滚删除：磁盘上的图片 / 视频文件仍然保留，本次只回滚内容行。\"\n}"}]
```

**⑤ 界面跟着变**（回滚「新建章节 1」之后）：

| 观察点 | 回滚前 | 回滚后 |
| --- | --- | --- |
| 章节页副标 | 《夜航船》· 2 章 · 0 镜 | 2 → 1 章 |
| 章节页正文 | 第1章 + 第2章 | 第2章（第1章 被回滚删除） |
| 日志页 | 21 条 | 21 条（日志是审计轨迹，条目不删） |
| 日志页漂移卡 | 无 | 无（回滚后不再误报「已漂移」） |
| 控制台错误 | 0 | 0 |

回滚后的章节页正文原文：

```text
你的需求（自动捕获）
导入小说：第1章 林岸站在码头。第2章 船舱里没有灯。
章节
第2章
0 镜 · 0.0s
待写分镜
剧本与提示词
参考图
音色样本
视频
video 硬依赖 image：没有参考图直接报错。
video 软依赖 tts：缺失时视频降质，界面会标出来。
章节 = 一个可独立交付的成片单元 · 一章一集
第 2 章 · 第 0 / 0 镜 · 已用 ¥0.00 / 上限 ¥12.00
```

> 这一轮实机抓出并修掉的缺陷：`reelforge.rollback` 回滚「新建」类变更时，
> 宿主接线层把「删掉这一行」降级成了「upsert 一个空对象」——upsert 是**合并**语义，
> 空对象合并不进去 ⇒ **回滚什么都没改**，工具却回报 `"restored": 1`（谎报成功）。
> 修法见 `src/host/projection.js`（新增 `chapter.delete` / `shot.delete` /
> `asset.delete` / `project.delete` 补丁）与 `src/host/changelogStore.js`（`value === null` ⇒ 走删除补丁）。
