/* eslint-disable */
// ReelForge 客户端产物（由 `node src/client/build-client.mjs` 从 `src/client/**` 生成，请勿手改）。
// 包名三处相等（R7）：package.json.name / cordis.patch.yml name / 这里的 id 必须完全一致。
window.__ModuleLoader__.load({
  id: '@local/reelforge',
  factory: function (require) {
    'use strict';
    var React = require('react');
    var h = React.createElement;
    var RF = {};

/* ── src/client/manifest.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端常量（F8 的客户端侧镜像）。
 *
 * 浏览器侧的产物无法 import 宿主包或本包的 ESM 源码（宿主只分发 `client.js`
 * 与 `client.<name>.js` 分片），所以这里有一份**字面镜像**。
 * 镜像不是「另写一份枚举」：`src/client/__tests__/t5-client.test.js` 会把本文件
 * 的取值与唯一枚举来源 `src/core/constants.js` 逐项比对，不一致就红。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** Tab **类型**的 id —— 插槽 `sidebar.right.pane.tab` 的注册键用的就是它（不是 kind）。 */
  RF.TAB_TYPE_ID = '@local/reelforge';

  /** 右栏 Tab 的 kind（F2 · R8：一经发布不可改名）。 */
  RF.TAB_KIND = 'reelforge-workbench';

  /** 7 类对话消息行：视图注册在 `conversation.chat.node`，键为事件定义的 kind。 */
  RF.CHAT_ROW_KINDS = [
    'reelforge-progress',
    'reelforge-chapters',
    'reelforge-storyboard',
    'reelforge-plan',
    'reelforge-assets',
    'reelforge-deliver',
    'reelforge-changelog',
  ];

  /** 默认折叠的消息行（折叠态是默认视图）。 */
  RF.CHAT_ROW_COLLAPSIBLE = [
    'reelforge-progress',
    'reelforge-chapters',
    'reelforge-storyboard',
  ];

  /** 7 个页签（Tab **内部**的二级分区，不是 7 个宿主 Tab）。 */
  RF.WORKBENCH_TABS = [
    { id: 'chapters', labelKey: 'chapters' },
    { id: 'shots', labelKey: 'shots' },
    { id: 'assets', labelKey: 'assets' },
    { id: 'context', labelKey: 'context' },
    { id: 'skills', labelKey: 'skills' },
    { id: 'output', labelKey: 'output' },
    { id: 'log', labelKey: 'log' },
  ];

  /** 6 步进度条（需求 · 运行 · 方案 · 生成 · 分镜 · 交付）。 */
  RF.STAGE_STEPS = ['requirement', 'run', 'plan', 'generate', 'storyboard', 'deliver'];

  /**
   * 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）—— **项目视图之外**的独立屏。
   *
   * 设计稿 17 号板自己写明右栏工作台是 **7 个页签**（项目视图）；
   * 板 02–06 的骨架里**没有页签条**（只有 Header / StageBar / Scroll / Footer），
   * 它们是按流程串起来的独立屏。⇒ 两层，不是 13 个页签。
   */
  RF.FLOW_SCREENS = ['intake', 'runmode', 'device', 'plan', 'stages', 'degraded'];

  /** 每块流程屏归在 6 步进度条的哪一步（与设计稿 §2.1 全表一致）。 */
  RF.FLOW_SCREEN_STEPS = {
    intake: 'requirement',
    runmode: 'run',
    device: 'run',
    plan: 'plan',
    stages: 'generate',
    degraded: 'generate',
  };

  /** 6 步进度条每一步点下去落到哪一屏。 */
  RF.STAGE_STEP_TARGETS = {
    requirement: { kind: 'flow', screen: 'intake' },
    run: { kind: 'flow', screen: 'runmode' },
    plan: { kind: 'flow', screen: 'plan' },
    generate: { kind: 'flow', screen: 'stages' },
    storyboard: { kind: 'tab', tab: 'shots' },
    deliver: { kind: 'tab', tab: 'output' },
  };

  /** 四阶段（固定顺序串行）。 */
  RF.STAGES = ['llm', 'image', 'tts', 'video'];

  /** 阶段依赖：video 硬依赖 image、软依赖 tts。 */
  RF.STAGE_DEPENDENCIES = {
    llm: { hard: [], soft: [] },
    image: { hard: [], soft: [] },
    tts: { hard: [], soft: [] },
    video: { hard: ['image'], soft: ['tts'] },
  };

  /** 10 类资产。 */
  RF.ASSET_CATEGORIES = [
    'character', 'scene', 'prop', 'costume', 'age', 'voice', 'music', 'sfx', 'video', 'other',
  ];

  /** 变体类：必须带 `parent_id` 指向父资产。 */
  RF.VARIANT_ASSET_CATEGORIES = ['costume', 'age'];

  /** 角色参考图优先级：服装 > 年龄变体 > 角色原图（独立维度，不叠加）。 */
  RF.CHARACTER_REFERENCE_PRIORITY = ['costume', 'age', 'character'];

  /** 生成 kind（kind × 执行位置是正交两维）。 */
  RF.GENERATION_KINDS = ['t2i', 'i2i', 'r2v', 'tts', 'music'];

  /** 执行位置。 */
  RF.RUN_POSITIONS = ['local', 'cloud'];

  /** 云端 provider（三个并列，不是一个笼统的「云端」）。 */
  RF.CLOUD_PROVIDERS = ['runninghub', 'online-api', 'dsh'];

  /** 上下文三键；注入顺序即数组顺序。 */
  RF.CONTEXT_KEYS = ['bible', 'style', 'continuity'];

  /** 技能来源三档。 */
  RF.SKILL_SOURCES = ['bundled', 'installed', 'generated'];

  /** 上下文键的写入语义：bible / style 整段覆盖，continuity 追加。 */
  RF.CONTEXT_WRITE_MODE = { bible: 'overwrite', style: 'overwrite', continuity: 'append' };

  /** 快捷键 id（R12 正则）。 */
  RF.SHORTCUT_IDS = {
    workbench: 'dsh.reelforge.workbench',
    shots: 'dsh.reelforge.shots',
    player: 'dsh.reelforge.player',
  };

  /** 触发类工具：走宿主的 `ask` 人工授权（R4）。 */
  RF.TRIGGER_TOOL_IDS = [
    'reelforge.run_stage',
    'reelforge.regenerate_shot',
    'reelforge.assemble_chapter',
    'reelforge.rollback',
  ];

  /**
   * 工作台直接发起工具调用时用的指令前缀（`src/core/constants.js` 的字面镜像）。
   *
   * ⚠️ 两边必须一致：客户端用它拼句子，宿主半用同一前缀把**工作台自己发出的**
   * 指令从「用户输入」里排除（`src/core/inputCapture.js`）。
   */
  RF.TOOL_CALL_PROMPT_PREFIX = '请调用工具 ';

  /** 13 个 ReelForge 工具 id（F4）。 */
  RF.TOOL_IDS = {
    importNovel: 'reelforge.import_novel',
    setStoryboard: 'reelforge.set_storyboard',
    saveContext: 'reelforge.save_context',
    updateShot: 'reelforge.update_shot',
    createAsset: 'reelforge.create_asset',
    updateAsset: 'reelforge.update_asset',
    bindAsset: 'reelforge.bind_asset',
    runStage: 'reelforge.run_stage',
    regenerateShot: 'reelforge.regenerate_shot',
    assembleChapter: 'reelforge.assemble_chapter',
    setChapterMusic: 'reelforge.set_chapter_music',
    rollback: 'reelforge.rollback',
    updatePlan: 'reelforge.update_plan',
    skill: 'skill',
    skillReference: 'skill_reference',
  };

  /** 宿主投影里 ReelForge 视图的键（T1 的投影必须以此键发布）。 */
  RF.PROJECTION_KEY = 'reelforge/project';

  /**
   * 客户端插件**必须声明**的宿主服务清单（Cordis fiber inject）。
   *
   * ⚠️ 为什么这条这么重要：Cordis 会守卫上下文上的属性访问 ——
   * 插件没在 `inject` 里声明的服务，`ctx.<svc>` 访问会直接抛
   * `cannot get property "<svc>" without inject`，
   * **客户端插件整条 fiber 失败**，宿主启动时打「1 entry did not activate」，
   * 右栏不会出现 ReelForge Tab。
   *
   * 宿主把客户端模块的**全部导出**当对象插件传给 Loader，所以这份清单
   * 必须由产物 `return { inject: RF.CLIENT_INJECT, apply: RF.apply }` 交出去。
   *
   * 清单必须**覆盖客户端源码里每一次 `ctx.<svc>` 属性访问**
   * （`src/client/__tests__/client-inject.test.js` 会逐个核对，漏一个就红）。
   * 声明一个宿主**没有提供**的服务同样会失败 —— fiber 会永远停在 pending。
   */
  RF.CLIENT_INJECT = [
    'slots',            // 插槽注册表（ui-renderer）
    'locale',           // 文案字典（locale）
    'sidebarRightTabs', // 右栏页签类型注册表（ui-sidebar-right）
    'sidebarRight',     // 右栏控制器：打开页签（ui-sidebar-right）
    'sessions',         // 会话列表：投影订阅（session-controller）
    'shortcuts',        // 快捷键注册表（shortcuts）
    'uiConversation',   // 对话事件定义（ui-conversation）
    'remote',           // 宿主 RPC 面：写操作通道（connection）
    // ⚠️ `remote.session` 是**独立的服务名**（不是 `remote` 的子属性）：
    // 宿主把每个 Remote 命名空间各注册成一个服务键
    // （`packages/api/session-controller/src/client/index.ts` 的 inject 清单：
    // `remote` / `remote.commands` / `remote.session` / `remote.subagents`）。
    // 不声明它，读 `ctx.remote.session` 会抛
    // `cannot get property "remote.session" without inject` —— 写操作全废。
    'remote.session',   // 会话指令通道：把 UI 写操作投进当前会话（session-controller）
  ];
})(RF);

/* ── src/client/locale.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端文案（Client locale 服务的数据源）。
 *
 * 命名空间 `reelforge`，注册在 `ctx.locale.register('reelforge', { zh, en })`。
 * 界面上的**每一句可见文字**都从这里取，不在组件里写死。
 *
 * 键是扁平的点分串；`locale/{en,zh}.json` 的 `ui` 段是同一份映射的静态副本，
 * `src/client/__tests__/t5-client.test.js` 会逐键比对两边是否一致。
 *
 * ── 文案纪律（2026-10-23 改版）───────────────────────────────────────────────
 *
 * 1. **不裸露技术词**：`llm 阶段`、`image 阶段`、`bible`、`reelforge.update_shot`
 *    这类内部名不进中文界面 —— 阶段名用 `stages.*`，上下文键用 `context.section.*`，
 *    工具用 `tool.*.label`。
 * 2. **不重复**：面板头副标题与底栏第二行曾经是同一句；底栏改说「当前进度」。
 * 3. **不撒谎**：运行位置没选时不能说「云端运行」（`status.idle` 现在接上了）；
 *    工作台不再显示整段小说正文（`project.idea` 可能就是一整章）。
 * 4. **与新链路一致**：用户在对话框里说的话会被自动截获写进工作台，
 *    所以「去对话框里让助手带你走下一步」这类把人推回去的引导语要改掉。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.locale = {
    zh: {
      'title': 'ReelForge 工作台',
      'subtitle': '把小说做成按章交付的短剧',
      'project.summary': '{name}· {chapters} 章 · {shots} 镜',
      'project.unnamed': '未命名项目',
      'status.local': '本地',
      'status.cloud': '云端',
      'status.idle': '待开始',
      'provider.runninghub': 'RunningHub',
      'provider.online-api': 'Online API',
      'provider.dsh': 'DSH',
      'stage.requirement': '需求',
      'stage.run': '运行',
      'stage.plan': '方案',
      'stage.generate': '生成',
      'stage.storyboard': '分镜',
      'stage.deliver': '交付',
      'stage.count': '{current} / 6',
      'tab.chapters': '章节',
      'tab.shots': '分镜',
      'tab.assets': '资产',
      'tab.context': '上下文',
      'tab.skills': '技能',
      'tab.output': '成片',
      'tab.log': '日志',
      'footer.position': '第 {chapter} 章 · 第 {shot} / {shots} 镜',
      'footer.idle': '还没有开始生成',
      'action.viewOutput': '查看成片',
      // ── 按屏外壳（Header 胶囊 / Footer 三件套）──
      // 设计稿 17 块板每块都不同；owner 裁决「按屏变化」（Q1 / Q3）。
      'chrome.chapters.footerLabel': '当前阶段',
      'chrome.shots.title': '分镜表',
      'chrome.shots.subtitle': '第 {chapter} 章 · {name} · {shots} 镜',
      'chrome.shots.subtitleEmpty': '还没有分镜表',
      'chrome.shots.capsule': '章 {current} / {total}',
      'chrome.shots.capsuleEmpty': '还没有章',
      'chrome.shots.footerLabel': '下一步',
      'chrome.shots.footerValue': '跑 video 阶段出片',
      'chrome.shots.action': '生成第 1 章',
      'chrome.shots.disabledHint': '还没有分镜表：先把小说正文粘到对话框拆章，才能生成这一章。',
      'chrome.assets.title': '资产库',
      'chrome.assets.subtitle': '10 类资产，变体挂在父资产下',
      'chrome.assets.capsule': '{count} 项资产',
      'chrome.assets.footerLabel': '下一步',
      'chrome.assets.footerValue': '逐镜写分镜',
      'chrome.assets.action': '继续',
      'chrome.context.title': '上下文',
      'chrome.context.subtitle': '一致性锚点：圣经 / 风格 / 连续性',
      'chrome.context.capsule': '{count} 个分区',
      'chrome.context.footerLabel': '下一步',
      'chrome.context.footerValue': '生成资产参考图',
      'chrome.context.action': '继续',
      'chrome.skills.title': '技能',
      'chrome.skills.subtitle': '写作规范以技能形式装载',
      'chrome.skills.capsule': '{count} 个来源',
      'chrome.skills.footerLabel': '技能来源',
      'chrome.skills.footerValue': '内置 {bundled} · 已装 {installed} · 自建 {generated}',
      'chrome.skills.action': '安装技能包',
      'chrome.skills.disabledHint': '技能包安装走对话框：请说「安装技能包 <名称>」',
      'chrome.output.title': '成片',
      'chrome.output.subtitle': '第 {chapter} 章 {name} · {shots} 镜 · {duration}s',
      'chrome.output.subtitleEmpty': '还没有成片',
      'chrome.output.capsule': '{position}渲染',
      'chrome.output.capsuleIdle': '还没开始渲染',
      'chrome.output.footerLabel': '本集用时',
      'chrome.output.footerValue': '成本 {cost} · {status}',
      'chrome.output.statusIdle': '还没开始渲染',
      'chrome.output.statusPending': '还在渲染',
      'chrome.output.statusDone': '渲染完成',
      'chrome.output.action': '交付物',
      'chrome.output.disabledHint': '还没有交付物：合成一章之后，这里会列出成片与素材。',
      'chrome.log.title': '变更日志',
      'chrome.log.subtitle': '谁在什么时候改了什么，可回滚',
      'chrome.log.capsule': '{count} 条',
      'chrome.log.footerLabel': '全项目',
      'chrome.log.footerValue': '{count} 条',
      // ── 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）──
      'flow.backToWorkbench': '回到工作台',
      'flow.intake.title': '导入小说',
      'flow.intake.subtitle': '粘贴正文，ReelForge 自动拆章',
      'flow.intake.capsule': '新项目',
      'flow.intake.sourceLabel': '小说正文',
      'flow.intake.chars': '已粘贴字数',
      'flow.intake.noHeadings': '还没检测到「第N章」标题，将按兜底字数均分。',
      'flow.intake.fallbackRule': '识别到 {count} 个「第N章」标题 → 拆为 {count} 章；无标题时按 {fallback} 字兜底均分',
      'flow.intake.importLabel': '导入正文',
      'flow.intake.importPlaceholder': '把小说正文粘到这里…',
      'flow.intake.importAction': '导入并拆章',
      'flow.intake.importDisabled': '正文是空的：至少要有一段正文才能拆章',
      'flow.intake.safetyNote': '正文只做内容解析，不会被当作指令执行',
      'flow.intake.previewLabel': '自动拆章预览',
      'flow.intake.previewEmpty': '还没有章节。导入正文后这里会列出拆出来的章。',
      'flow.intake.previewRule': '章节标题正则：第N章 / 第N节 / Chapter N',
      'flow.intake.settingsLabel': '项目设置',
      'flow.intake.setting.aspectRatio': '画幅',
      'flow.intake.setting.resolution': '分辨率',
      'flow.intake.setting.targetDuration': '目标时长',
      'flow.intake.setting.bgm': 'BGM',
      'flow.intake.unset': '未设置',
      'flow.intake.durationUnlimited': '不限（按章）',
      'flow.intake.settingsReadonly': '这四项目前只能在插件配置里改，面板只读：没有对应的写入工具。',
      'flow.intake.pendingLabel': '助手提出的待确认项',
      'flow.intake.pendingEmpty': '暂时没有待确认项。有需要拿主意的地方，助手会列在这里。',
      'flow.intake.footerLabel': '下一步',
      'flow.intake.footerValue': '选运行位置：本地还是云端',
      'flow.intake.action': '继续',
      'flow.runmode.title': '运行位置',
      'flow.runmode.subtitle': '同一批工作流，跑在这台机器还是云端',
      'flow.runmode.capsule': '{count} 种位置',
      'flow.runmode.sectionLabel': '两种执行位置',
      'flow.runmode.sectionNote': '本地与云端跑的是同一批 kind，差别只在跑在哪、算不算钱',
      'flow.runmode.localTitle': '本地运行',
      'flow.runmode.localSubtitle': '在你机器的 ComfyUI 上跑',
      'flow.runmode.local.pro1': '数据不出本机',
      'flow.runmode.local.pro2': '无按次计费',
      'flow.runmode.local.pro3': '可无限重试',
      'flow.runmode.local.con1': '需独立显卡 8G 显存',
      'flow.runmode.local.con2': '需 ComfyUI + CK ≥ 0.2.36',
      'flow.runmode.local.con3': '速度受本机硬件限制',
      'flow.runmode.cloudTitle': '云端运行',
      'flow.runmode.cloudSubtitle': '跑托管工作流，按次计费',
      'flow.runmode.cloud.pro1': '开箱即用，无需 GPU',
      'flow.runmode.cloud.pro2': '与本地同一批 kind',
      'flow.runmode.cloud.pro3': '排队由云端管',
      'flow.runmode.cloud.con1': '按次计费',
      'flow.runmode.cloud.con2': '参考图需上传',
      'flow.runmode.cloud.con3': '需要外网可达',
      'flow.runmode.deviceCheck': '开始设备检查',
      'flow.runmode.providersAvailable': '{count} 个 provider 可用',
      'flow.runmode.providerLabel': '云端 provider',
      'flow.runmode.providerReadonly': 'provider 由插件配置决定：面板里改不了，改了也不会生效。',
      'flow.runmode.compareLabel': '运行位置会影响什么',
      'flow.runmode.compare.kinds': '可用 kind',
      'flow.runmode.compare.kindsValue': '本地与云端同为 t2i / i2i / r2v / tts / music',
      'flow.runmode.compare.diff': '差异在哪',
      'flow.runmode.compare.diffValue': '同一 kind 的两套 sourceFile：本机工作流 vs 托管工作流',
      'flow.runmode.compare.cost': '成本',
      'flow.runmode.compare.costValue': '本地无按次费用 · 云端按次计费',
      'flow.runmode.compare.limit': '限制',
      'flow.runmode.compare.limitValue': '本地受显存与 CK 版本约束 · 云端受排队与配额约束',
      'flow.runmode.switchable': '运行位置可以随时改：只影响尚未生成的镜头。已产出的分镜表与参考图不重跑，也不重复计费。',
      'flow.runmode.footerHint': '不确定？云端随时能切；本地要先过设备检查',
      'flow.runmode.footerLabel': '下一步',
      'flow.runmode.footerValue': '探测本机能否本地生成',
      'flow.runmode.action': '继续，出执行路径',
      'flow.device.title': '设备检查',
      'flow.device.subtitle': '本地档要过 9 项探测',
      'flow.device.capsule': '{count} 项探测',
      'flow.device.loading': '正在探测…',
      'flow.device.failed': '探测没跑起来',
      'flow.device.retry': '重试',
      'flow.device.recheck': '重新检测',
      'flow.device.done': '检测完成 · {count} 项 · 用时 {seconds}s',
      'flow.device.footnote': '探测结果只落在插件状态，不写进会话日志',
      'flow.device.tableLabel': '本地档探测',
      'flow.device.tableNote': '探测项与设计稿 §7.1 逐条对应；显存不足是明说，不是静默降级',
      'flow.device.ok': '已通过',
      'flow.device.row.comfy': 'ComfyUI 可达',
      'flow.device.row.ckVersion': 'CK 版本',
      'flow.device.row.vram': '显存',
      'flow.device.row.gpu': 'GPU',
      'flow.device.row.ffmpeg': 'ffmpeg',
      'flow.device.row.encoders': '编码器',
      'flow.device.row.disk': '磁盘余量',
      'flow.device.row.llm': 'LLM 通道',
      'flow.device.row.provider': 'provider 规格',
      'flow.device.row.videoBackend': '视频后端硬约束',
      'flow.device.method.comfy': 'GET :8188/system_stats',
      'flow.device.method.ckVersion': 'comfy-kitchen',
      'flow.device.method.vram': 'nvidia-smi',
      'flow.device.method.gpu': 'nvidia-smi',
      'flow.device.method.ffmpeg': 'ffmpeg -version',
      'flow.device.method.encoders': 'ffmpeg -encoders',
      'flow.device.method.disk': '卷可用空间',
      'flow.device.method.llm': 'DSH 会话',
      'flow.device.method.provider': 'workflows/specs',
      'flow.device.method.videoBackend': '规格声明（静态）',
      'flow.device.conclusionTitle': '本机跑不满当前方案，缺口如下',
      'flow.device.toCloud': '改用云端运行',
      'flow.device.onlyImage': '只跑到 image 阶段',
      'flow.device.allOk': '本机探测全部通过',
      'flow.device.localStillLabel': '本地仍可完成',
      'flow.device.localStill.storyboard': '分镜表',
      'flow.device.localStill.references': '参考图',
      'flow.device.localStill.compose': '成片合成（需 ffmpeg）',
      'flow.device.bottomNote': '探测项与设计稿 §7.1 逐条对应；显存不足是明说，不是静默降级',
      'flow.device.vramHint': '显存 {have}GB 低于 video 阶段门槛 {need}GB：不自动拆批，显存不够就明说，可先只跑 llm + image',
      'flow.device.footerLabel': '下一步',
      'flow.device.footerValue': '按探测结果出执行路径',
      'flow.device.action': '继续',
      'flow.plan.title': '执行路径',
      'flow.plan.subtitle': '哪种生成方式，跑在哪台机器上',
      'flow.plan.capsule': '{count} 种 kind',
      'flow.plan.axisLabel': 'kind 类型 × 执行位置',
      'flow.plan.group.image': '图像',
      'flow.plan.group.video': '视频',
      'flow.plan.localSub': '你的 ComfyUI 工作流',
      'flow.plan.cloudSub': '托管工作流',
      'flow.plan.specCount': '{count} 套规格',
      'flow.plan.noSpec': '这一档没有规格',
      'flow.plan.spec.local': '本地',
      'flow.plan.spec.cloud': '云端',
      'flow.plan.billed': '按次计费',
      'flow.plan.mappingLabel': 'kind → 规格映射',
      'flow.plan.kind.t2i': '文生图',
      'flow.plan.kind.i2i': '图生图',
      'flow.plan.kind.r2v': '参考图生视频',
      'flow.plan.kind.tts': '语音合成',
      'flow.plan.kind.music': '配乐',
      'flow.plan.current': '当前',
      'flow.plan.mappingNote': '本地与云端是同一 kind 的两套 sourceFile，不是两档能力',
      'flow.plan.scoreLabel': '辅助评分（不决定路径，只做微调）',
      'flow.plan.scoreMissing': '还没有评分器：这一栏暂不参与决策，执行矩阵才是决定项。',
      'flow.plan.bottomNote': '评分是参考，选择权在执行矩阵',
      'flow.plan.needPosition': '先选运行位置（本地还是云端），再选 kind。',
      'flow.plan.footerLabel': '下一步',
      'flow.plan.footerValue': '选要跑哪些阶段',
      'flow.plan.action': '继续',
      'flow.stages.title': '执行阶段',
      'flow.stages.subtitle': '四个阶段，可按章勾选',
      'flow.stages.capsule': '{count} 个阶段',
      'flow.stages.llm.sub': '写人物圣经 / 风格指南 / 拆镜 / 写视频提示词',
      'flow.stages.llm.hint': '需要 LLM 通道 · 不烧渲染时间',
      'flow.stages.image.sub': '人物 / 场景 / 道具参考图 + 服装与年龄变体',
      'flow.stages.image.hint': '产出后续两阶段的参考图',
      'flow.stages.tts.sub': '角色音色样本，只给说话角色生成',
      'flow.stages.tts.hint': '软依赖：缺失时视频静默降质，界面会标出来',
      'flow.stages.video.sub': '逐镜出片 → 自审重试 → 背景音乐 → 合成 → 字幕',
      'flow.stages.video.hint': '硬依赖 image：没有参考图直接报错',
      'flow.stages.readonly': '阶段开关目前来自插件配置：面板里没有对应的写入工具，所以只读。',
      'flow.stages.vramTitle': '含 video 阶段需 8GB 显存',
      'flow.stages.vramNote': '不自动拆批：显存不够就明说，可先只跑 llm + image',
      'flow.stages.byChapterLabel': '按章勾选（覆盖上面的全局设置）',
      'flow.stages.noChapter': '还没有章节，所以没有按章设置。',
      'flow.stages.chapterRow': '第 {seq} 章 {name}',
      'flow.stages.chapterPending': '待开始',
      'flow.stages.bottomNote': '阶段按固定顺序串行执行，不按勾选顺序',
      'flow.stages.footerLabel': '下一步',
      'flow.stages.footerValue': '准备一致性锚点（人物圣经与风格）',
      'flow.stages.action': '开始阶段一',
      'flow.degrade.title': '降级与失败',
      'flow.degrade.subtitle': '缺什么就说清楚，不假装成功',
      'flow.degrade.capsule': '{count} 种缺失',
      'flow.degrade.loading': '正在读取降级状态…',
      'flow.degrade.failed': '降级状态没读出来',
      'flow.degrade.missingItem': '缺失项',
      'flow.degrade.colVideo': '成片',
      'flow.degrade.colStoryboard': '分镜表',
      'flow.degrade.colPack': '参考图',
      'flow.degrade.matrixNote': '软依赖缺失也要说出来：音色缺失只降质，不报错',
      'flow.degrade.noneTitle': '当前没有降级',
      'flow.degrade.noneBody': '探测与交付都没发现缺口。',
      'flow.degrade.outputsLine': '成片 {video} · 分镜表 {storyboard} · 参考图 {pack}',
      'flow.degrade.rerun': '补跑 tts',
      'flow.degrade.accept': '接受现状',
      'flow.degrade.dialogLabel': '对话里怎么说',
      'flow.degrade.noNotices': '还没有降级话术：没有缺失就没有要说的话。',
      'flow.degrade.footerLabel': '宁可交付不完整但诚实的结果',
      'flow.degrade.footerValue': '降级说明',
      'flow.degrade.action': '查看降级说明',
      'degrade.kind.video_provider_down': '视频通道不可用',
      'degrade.kind.image_provider_down': '图像通道不可用',
      'degrade.kind.voice_missing': '音色缺失',
      'degrade.kind.ffmpeg_missing': '缺 ffmpeg',
      'degrade.kind.partial_shot_failed': '部分镜失败',
      'degrade.kind.vram_insufficient': '显存不足',
      'degrade.kind.model_channel_unreachable': '模型通道不可达',
      'degrade.video.none': '无',
      'degrade.video.text_card': '文字卡',
      'degrade.video.placeholder': '占位帧',
      'degrade.video.silent': '静音成片',
      'degrade.pack.full': '有',
      'degrade.pack.text_card': '文字卡',
      'degrade.pack.partial': '部分',
      'degrade.pack.none': '无',
      'degrade.storyboard.yes': '有',
      'degrade.storyboard.no': '无',
      'stage.go.requirement': '去「需求」这一步',
      'stage.go.run': '去「运行」这一步',
      'stage.go.plan': '去「方案」这一步',
      'stage.go.generate': '去「生成」这一步',
      'stage.go.storyboard': '去「分镜」这一步',
      'stage.go.deliver': '去「交付」这一步',
      'chrome.log.action': '导出日志',
      'chrome.stat.row': '{position} · 已用 {spent} / 上限 {cap}',
      'captured.label': '你的需求（自动捕获）',
      'captured.empty': '在中间的对话框里写下你想做的事，它会原样落在这里。',
      'common.confirm': '确认',
      'common.cancel': '取消',
      'common.retry': '重试',
      'common.download': '下载',
      'common.close': '关闭',
      'common.back': '返回',
      'common.next': '下一步',
      'common.start': '开始',
      'common.regenerate': '重生成',
      'common.rollback': '回滚',
      'common.loading': '加载中…',
      'common.unknown': '未知',
      'common.on': '开启',
      'common.off': '关闭',
      'empty.generic': '这里还是空的。{hint}',
      'empty.chapters': '还没有章节。把小说正文粘到对话框，这里会自动拆章。',
      'empty.shots': '还没有分镜。助手会按上面的需求生成分镜表。',
      'empty.assets': '还没有参考图。助手会按需生成人物、场景与道具图。',
      'empty.context': '上下文是空的。让人物圣经、风格指南或连续性记录先落一笔。',
      'empty.skills': '还没有技能。装一个技能包，或让助手自建一个。',
      'empty.output': '还没有成片。合成一章即可出片。',
      'empty.log': '还没有变更。',
      'empty.hint': '下一步：把需求写全，下面就会往下走。',
      'stages.llm': '剧本与提示词',
      'stages.image': '参考图',
      'stages.tts': '音色样本',
      'stages.video': '视频',
      'hardDependency': 'video 硬依赖 image：没有参考图直接报错。',
      'softDependency': 'video 软依赖 tts：缺失时视频降质，界面会标出来。',
      'chat.progress': '阶段进度',
      'chat.chapters': '章节列表',
      'chat.storyboard': '分镜卡片',
      'chat.plan': '执行路径',
      'chat.assets': '资产卡',
      'chat.deliver': '成片与交付物',
      'chat.changelog': '变更日志',
      'chat.expand': '展开',
      'chat.collapse': '收起',
      'chat.progress.stage': '阶段',
      'chat.progress.chapter': '章节',
      'chat.progress.shot': '镜头',
      'chat.progress.elapsed': '耗时',
      'unit.chapter': '章',
      'unit.shot': '镜',
      'chat.summary.chapters': '{chapters} 章 · {shots} 镜',
      'chat.summary.shots': '{shots} 镜',
      'chat.summary.plan': '{kind} · {position}',
      'shot.status.pending': '待生成',
      'shot.status.generating': '生成中',
      'shot.status.done': '已完成',
      'shot.status.failed': '失败',
      'chapter.status.queued': '待写分镜',
      'chapter.status.failed': '有分镜失败',
      'chapter.status.running': '生成中',
      'chapter.status.done': '已完成',
      'asset.category.character': '人物',
      'asset.category.scene': '场景',
      'asset.category.prop': '道具',
      'asset.category.costume': '服装',
      'asset.category.age': '年龄变体',
      'asset.category.voice': '音色',
      'asset.category.music': '配乐',
      'asset.category.sfx': '音效',
      'asset.category.video': '视频',
      'asset.category.other': '其他',
      'context.section.bible': '人物圣经',
      'context.section.style': '风格指南',
      'context.section.continuity': '连续性记录',
      'skills.bundled': '内置',
      'skills.installed': '已装',
      'skills.generated': '自建',
      'skills.emptyDescription': 'description 为空会让技能既不可路由也不出现在目录里。',
      'skills.notDistributed': '插件不分发第三方技能正文，用户自行安装上游技能包。',
      'skills.previewTitle': '正文预览',
      'button.primary': '主要按钮',
      'button.secondary': '次要按钮',
      'button.disabled': '禁用按钮',
      'button.danger': '危险按钮',
      'input.default': '默认输入框',
      'input.focus': '聚焦输入框',
      'input.error': '错误输入框',
      'pill.running': '进行中',
      'pill.done': '已完成',
      'pill.failed': '失败',
      'pill.queued': '排队',
      'progress.running': '进行中',
      'progress.done': '完成',
      'progress.failed': '失败',
      'emptyState.noData': '暂无数据',
      'emptyState.error': '出错了',
      'toast.info': '信息',
      'toast.warning': '警告',
      'toast.error': '错误',
      'card.default': '默认卡片',
      'card.selected': '选中卡片',
      'card.disabled': '禁用卡片',
      'chapter.unit': '章节 = 一个可独立交付的成片单元 · 一章一集',
      'shots.quantize': '时长量化',
      'shots.refs': '参考素材标签',
      'shots.assembly': '装配顺序：人物图 → 场景图 → 道具图 → 人物语音 · 图 ≤9 音视频 ≤3',
      'assets.priority': '参考图优先级：服装 > 年龄变体 > 角色原图（独立维度，不叠加）',
      'assets.variants': '变体类（服装 / 年龄）必须带 parent_id，挂在原资产下',
      'context.overwrite': '整段覆盖',
      'context.append': '追加',
      'context.keys': '上下文只允许三个键，多写的键一律报错不静默丢弃',
      'output.chapters': '章节刻度',
      'output.subtitles': '字幕',
      'output.voice': '角色音轨',
      'output.bgm': '背景音乐',
      'output.speed': '倍速 {rate}×',
      'deliver.downloadAll': '打包下载本章',
      'deliver.binaryKept': '媒体二进制不随回滚删除（视频与图片留在原地）',
      'log.drifted': '这条记录已漂移，回滚会覆盖后来的改动',
      'log.force': '强制回滚',
      'log.projectLocked': '项目层不可回滚：本插件没有删除项目的 API',
      'log.single': '回滚单条',
      'log.batch': '回滚整批',
      'log.timepoint': '回滚到时间点',
      'workflow.diagnostics': '解析诊断',
      'workflow.loaders': '加载节点',
      'workflow.modelLoaders': '模型加载节点',
      'workflow.saves': '保存节点',
      'workflow.samplers': '采样节点',
      'workflow.sizeNodes': '尺寸节点',
      'workflow.textCandidates': '文本候选',
      'workflow.hasVideoFields': '含视频字段',
      'tool.importNovel.label': '导入小说',
      'tool.importNovel.say': '导入这本小说',
      'tool.setStoryboard.label': '设置分镜表',
      'tool.setStoryboard.say': '用这份分镜表',
      'tool.saveContext.label': '保存上下文',
      'tool.saveContext.say': '把这段存进人物圣经',
      'tool.updateShot.label': '修改分镜',
      'tool.updateShot.say': '把第 3 镜的时长改成 5 秒',
      'tool.createAsset.label': '新建资产',
      'tool.createAsset.say': '新建一个角色参考图',
      'tool.updateAsset.label': '修改资产',
      'tool.updateAsset.say': '更新角色参考图',
      'tool.bindAsset.label': '绑定资产',
      'tool.bindAsset.say': '把参考图绑到第 3 镜',
      'tool.updatePlan.label': '更新执行方案',
      'tool.updatePlan.say': '把执行方案换成 i2i',
      'tool.runStage.label': '跑阶段',
      'tool.runStage.say': '跑 image 阶段',
      'tool.regenerateShot.label': '重生成镜头',
      'tool.regenerateShot.say': '重生成第 3 镜',
      'tool.assembleChapter.label': '合成章节',
      'tool.assembleChapter.say': '合成第 1 章',
      'tool.setChapterMusic.label': '设置章节配乐',
      'tool.setChapterMusic.say': '给第 1 章配乐',
      'tool.rollback.label': '回滚',
      'tool.rollback.say': '回滚到第 2 章',
      'notice.undelivered': '这次「{label}」没生效：工作台还没接上工具通道。可重试，或在对话框里说「{say}」。',
      'notice.hostRefused': '这次「{label}」没生效：宿主没接受这次调用{reason}。可以在对话框里说「{say}」。',
      'notice.unknownTool': '未知的操作',
      'notice.sayFallback': '直接说出你要做的操作',
      'notice.replayed': '已重放 {count} 条待办请求。',
      'notice.stillPending': '仍有 {count} 条请求投递不出去：工作台还没接上工具通道。',
    },
    en: {
      'title': 'ReelForge Workbench',
      'subtitle': 'Turn a novel into a short film, delivered one chapter at a time',
      'project.summary': '{name}· {chapters} chapters · {shots} shots',
      'project.unnamed': 'Untitled project',
      'status.local': 'Local',
      'status.cloud': 'Cloud',
      'status.idle': 'Not started',
      'provider.runninghub': 'RunningHub',
      'provider.online-api': 'Online API',
      'provider.dsh': 'DSH',
      'stage.requirement': 'Requirement',
      'stage.run': 'Run',
      'stage.plan': 'Plan',
      'stage.generate': 'Generate',
      'stage.storyboard': 'Storyboard',
      'stage.deliver': 'Deliver',
      'stage.count': '{current} / 6',
      'tab.chapters': 'Chapters',
      'tab.shots': 'Shots',
      'tab.assets': 'Assets',
      'tab.context': 'Context',
      'tab.skills': 'Skills',
      'tab.output': 'Output',
      'tab.log': 'Log',
      'footer.position': 'Ch. {chapter} · shot {shot} / {shots}',
      'footer.idle': 'Nothing generated yet',
      'action.viewOutput': 'View output',
    // ── Per-screen chrome (header capsule / footer trio) ──
      // Every board in the design has its own; owner ruled "per screen" (Q1 / Q3).
      'chrome.chapters.footerLabel': 'Current stage',
      'chrome.shots.title': 'Storyboard',
      'chrome.shots.subtitle': 'Chapter {chapter} · {name} · {shots} shots',
      'chrome.shots.subtitleEmpty': 'No storyboard yet',
      'chrome.shots.capsule': 'Chapter {current} / {total}',
      'chrome.shots.capsuleEmpty': 'No chapters yet',
      'chrome.shots.footerLabel': 'Next',
      'chrome.shots.footerValue': 'Run the video stage',
      'chrome.shots.action': 'Generate chapter 1',
      'chrome.shots.disabledHint': 'No storyboard yet: paste the novel in the chat box to split it into chapters first.',
      'chrome.assets.title': 'Assets',
      'chrome.assets.subtitle': '10 asset types; variants hang off a parent asset',
      'chrome.assets.capsule': '{count} assets',
      'chrome.assets.footerLabel': 'Next',
      'chrome.assets.footerValue': 'Write the storyboard shot by shot',
      'chrome.assets.action': 'Continue',
      'chrome.context.title': 'Context',
      'chrome.context.subtitle': 'Continuity anchors: bible / style / continuity',
      'chrome.context.capsule': '{count} sections',
      'chrome.context.footerLabel': 'Next',
      'chrome.context.footerValue': 'Generate asset reference images',
      'chrome.context.action': 'Continue',
      'chrome.skills.title': 'Skills',
      'chrome.skills.subtitle': 'Writing rules loaded as skills',
      'chrome.skills.capsule': '{count} sources',
      'chrome.skills.footerLabel': 'Skill sources',
      'chrome.skills.footerValue': 'Bundled {bundled} · installed {installed} · self-made {generated}',
      'chrome.skills.action': 'Install skill pack',
      'chrome.skills.disabledHint': 'Skill packs are installed from the chat: say "install skill pack <name>"',
      'chrome.output.title': 'Output',
      'chrome.output.subtitle': 'Chapter {chapter} {name} · {shots} shots · {duration}s',
      'chrome.output.subtitleEmpty': 'No output yet',
      'chrome.output.capsule': '{position} render',
      'chrome.output.capsuleIdle': 'No render yet',
      'chrome.output.footerLabel': 'This episode took',
      'chrome.output.footerValue': 'Cost {cost} · {status}',
      'chrome.output.statusIdle': 'No render yet',
      'chrome.output.statusPending': 'still rendering',
      'chrome.output.statusDone': 'render complete',
      'chrome.output.action': 'Deliverables',
      'chrome.output.disabledHint': 'No deliverables yet: assemble a chapter and the video and assets will be listed here.',
      'chrome.log.title': 'Changelog',
      'chrome.log.subtitle': 'Who changed what, when — and how to roll it back',
      'chrome.log.capsule': '{count} entries',
      'chrome.log.footerLabel': 'Whole project',
      'chrome.log.footerValue': '{count} entries',
      // ── 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）──
      'flow.backToWorkbench': 'Back to workbench',
      'flow.intake.title': 'Import novel',
      'flow.intake.subtitle': 'Paste the text, ReelForge splits it into chapters',
      'flow.intake.capsule': 'New project',
      'flow.intake.sourceLabel': 'Novel text',
      'flow.intake.chars': 'Pasted characters',
      'flow.intake.noHeadings': 'No “Chapter N” heading found yet; it will fall back to an even split.',
      'flow.intake.fallbackRule': '{count} “Chapter N” headings found → split into {count} chapters; without headings it splits every {fallback} characters',
      'flow.intake.importLabel': 'Import text',
      'flow.intake.importPlaceholder': 'Paste the novel here…',
      'flow.intake.importAction': 'Import & split',
      'flow.intake.importDisabled': 'The text is empty: at least one paragraph is needed to split chapters',
      'flow.intake.safetyNote': 'The text is only parsed as content, never executed as an instruction',
      'flow.intake.previewLabel': 'Automatic split preview',
      'flow.intake.previewEmpty': 'No chapters yet. Import the text and the split chapters show up here.',
      'flow.intake.previewRule': 'Chapter heading pattern: 第N章 / 第N节 / Chapter N',
      'flow.intake.settingsLabel': 'Project settings',
      'flow.intake.setting.aspectRatio': 'Aspect ratio',
      'flow.intake.setting.resolution': 'Resolution',
      'flow.intake.setting.targetDuration': 'Target duration',
      'flow.intake.setting.bgm': 'BGM',
      'flow.intake.unset': 'Not set',
      'flow.intake.durationUnlimited': 'Unlimited (per chapter)',
      'flow.intake.settingsReadonly': 'These four are configurable in the plugin config only — the panel has no write tool for them, so it is read-only.',
      'flow.intake.pendingLabel': 'Questions from the assistant',
      'flow.intake.pendingEmpty': 'Nothing to confirm right now. Open questions will be listed here.',
      'flow.intake.footerLabel': 'Next',
      'flow.intake.footerValue': 'Pick the run position: local or cloud',
      'flow.intake.action': 'Continue',
      'flow.runmode.title': 'Run position',
      'flow.runmode.subtitle': 'The same workflows, on this machine or in the cloud',
      'flow.runmode.capsule': '{count} positions',
      'flow.runmode.sectionLabel': 'Two execution positions',
      'flow.runmode.sectionNote': 'Local and cloud run the same kinds — the difference is where it runs and whether it costs',
      'flow.runmode.localTitle': 'Run locally',
      'flow.runmode.localSubtitle': 'Runs on your own ComfyUI',
      'flow.runmode.local.pro1': 'Data never leaves the machine',
      'flow.runmode.local.pro2': 'No per-run fee',
      'flow.runmode.local.pro3': 'Retry as often as you like',
      'flow.runmode.local.con1': 'Needs a discrete GPU with 8G VRAM',
      'flow.runmode.local.con2': 'Needs ComfyUI + CK ≥ 0.2.36',
      'flow.runmode.local.con3': 'Speed is limited by your hardware',
      'flow.runmode.cloudTitle': 'Run in the cloud',
      'flow.runmode.cloudSubtitle': 'Runs hosted workflows, billed per run',
      'flow.runmode.cloud.pro1': 'Works out of the box, no GPU',
      'flow.runmode.cloud.pro2': 'Same kinds as local',
      'flow.runmode.cloud.pro3': 'The cloud handles the queue',
      'flow.runmode.cloud.con1': 'Billed per run',
      'flow.runmode.cloud.con2': 'Reference images must be uploaded',
      'flow.runmode.cloud.con3': 'Needs outbound network access',
      'flow.runmode.deviceCheck': 'Start device check',
      'flow.runmode.providersAvailable': '{count} providers available',
      'flow.runmode.providerLabel': 'Cloud provider',
      'flow.runmode.providerReadonly': 'The provider comes from the plugin config: the panel cannot change it, and a change here would not take effect.',
      'flow.runmode.compareLabel': 'What the run position changes',
      'flow.runmode.compare.kinds': 'Available kinds',
      'flow.runmode.compare.kindsValue': 'Local and cloud both support t2i / i2i / r2v / tts / music',
      'flow.runmode.compare.diff': 'Where they differ',
      'flow.runmode.compare.diffValue': 'Two sourceFile sets per kind: your own workflow vs a hosted one',
      'flow.runmode.compare.cost': 'Cost',
      'flow.runmode.compare.costValue': 'Local has no per-run fee · cloud is billed per run',
      'flow.runmode.compare.limit': 'Limits',
      'flow.runmode.compare.limitValue': 'Local is bound by VRAM and CK version · cloud is bound by queue and quota',
      'flow.runmode.switchable': 'You can switch position at any time: it only affects shots that are not generated yet. Existing storyboards and reference images are not re-run and are not billed twice.',
      'flow.runmode.footerHint': 'Not sure? Cloud can be switched at any time; local has to pass the device check first',
      'flow.runmode.footerLabel': 'Next',
      'flow.runmode.footerValue': 'Probe whether this machine can generate locally',
      'flow.runmode.action': 'Continue to execution path',
      'flow.device.title': 'Device check',
      'flow.device.subtitle': 'The local profile must pass 9 probes',
      'flow.device.capsule': '{count} probes',
      'flow.device.loading': 'Probing…',
      'flow.device.failed': 'The probe did not run',
      'flow.device.retry': 'Retry',
      'flow.device.recheck': 'Re-check',
      'flow.device.done': 'Check complete · {count} probes · {seconds}s',
      'flow.device.footnote': 'Probe results stay in the plugin state and are never written to the session log',
      'flow.device.tableLabel': 'Local profile probes',
      'flow.device.tableNote': 'Each probe maps to design §7.1; too little VRAM is stated, never silently downgraded',
      'flow.device.ok': 'Passed',
      'flow.device.row.comfy': 'ComfyUI reachable',
      'flow.device.row.ckVersion': 'CK version',
      'flow.device.row.vram': 'VRAM',
      'flow.device.row.gpu': 'GPU',
      'flow.device.row.ffmpeg': 'ffmpeg',
      'flow.device.row.encoders': 'Encoders',
      'flow.device.row.disk': 'Free disk',
      'flow.device.row.llm': 'LLM channel',
      'flow.device.row.provider': 'Provider specs',
      'flow.device.row.videoBackend': 'Video backend constraints',
      'flow.device.method.comfy': 'GET :8188/system_stats',
      'flow.device.method.ckVersion': 'comfy-kitchen',
      'flow.device.method.vram': 'nvidia-smi',
      'flow.device.method.gpu': 'nvidia-smi',
      'flow.device.method.ffmpeg': 'ffmpeg -version',
      'flow.device.method.encoders': 'ffmpeg -encoders',
      'flow.device.method.disk': 'free space on the volume',
      'flow.device.method.llm': 'DSH session',
      'flow.device.method.provider': 'workflows/specs',
      'flow.device.method.videoBackend': 'spec declaration (static)',
      'flow.device.conclusionTitle': 'This machine cannot run the current plan. The gaps:',
      'flow.device.toCloud': 'Switch to cloud',
      'flow.device.onlyImage': 'Run up to the image stage',
      'flow.device.allOk': 'All local probes passed',
      'flow.device.localStillLabel': 'Still possible locally',
      'flow.device.localStill.storyboard': 'Storyboard',
      'flow.device.localStill.references': 'Reference images',
      'flow.device.localStill.compose': 'Compose the film (needs ffmpeg)',
      'flow.device.bottomNote': 'Each probe maps to design §7.1; too little VRAM is stated, never silently downgraded',
      'flow.device.vramHint': '{have}GB VRAM is below the {need}GB gate for the video stage: no automatic split — the shortfall is stated, and you can run llm + image only',
      'flow.device.footerLabel': 'Next',
      'flow.device.footerValue': 'Derive the execution path from the probe results',
      'flow.device.action': 'Continue',
      'flow.plan.title': 'Execution path',
      'flow.plan.subtitle': 'Which generation mode, on which machine',
      'flow.plan.capsule': '{count} kinds',
      'flow.plan.axisLabel': 'Kind × execution position',
      'flow.plan.group.image': 'Image',
      'flow.plan.group.video': 'Video',
      'flow.plan.localSub': 'Your own ComfyUI workflow',
      'flow.plan.cloudSub': 'Hosted workflow',
      'flow.plan.specCount': '{count} specs',
      'flow.plan.noSpec': 'No spec in this column',
      'flow.plan.spec.local': 'Local',
      'flow.plan.spec.cloud': 'Cloud',
      'flow.plan.billed': 'Billed per run',
      'flow.plan.mappingLabel': 'Kind → spec mapping',
      'flow.plan.kind.t2i': 'Text to image',
      'flow.plan.kind.i2i': 'Image to image',
      'flow.plan.kind.r2v': 'Reference image to video',
      'flow.plan.kind.tts': 'Speech synthesis',
      'flow.plan.kind.music': 'Score',
      'flow.plan.current': 'Current',
      'flow.plan.mappingNote': 'Local and cloud are two sourceFile sets of the same kind, not two tiers of capability',
      'flow.plan.scoreLabel': 'Auxiliary score (does not pick the path, only fine-tunes)',
      'flow.plan.scoreMissing': 'There is no scorer yet: this block takes no part in the decision — the matrix does.',
      'flow.plan.bottomNote': 'The score is a reference; the execution matrix decides',
      'flow.plan.needPosition': 'Pick the run position (local or cloud) first, then the kind.',
      'flow.plan.footerLabel': 'Next',
      'flow.plan.footerValue': 'Choose which stages to run',
      'flow.plan.action': 'Continue',
      'flow.stages.title': 'Execution stages',
      'flow.stages.subtitle': 'Four stages, selectable per chapter',
      'flow.stages.capsule': '{count} stages',
      'flow.stages.llm.sub': 'Write the character bible / style guide / shot breakdown / video prompts',
      'flow.stages.llm.hint': 'Needs the LLM channel · burns no render time',
      'flow.stages.image.sub': 'Character / scene / prop reference images + costume and age variants',
      'flow.stages.image.hint': 'Produces the reference images for the later stages',
      'flow.stages.tts.sub': 'Voice samples, only for speaking roles',
      'flow.stages.tts.hint': 'Soft dependency: missing voices silently degrade the video — the UI marks it',
      'flow.stages.video.sub': 'Shot by shot → self-review retry → score → compose → subtitles',
      'flow.stages.video.hint': 'Hard dependency on image: no reference image is an error',
      'flow.stages.readonly': 'The stage switches come from the plugin config: the panel has no write tool for them, so it is read-only.',
      'flow.stages.vramTitle': 'The video stage needs 8GB VRAM',
      'flow.stages.vramNote': 'No automatic split: too little VRAM is stated, and you can run llm + image only',
      'flow.stages.byChapterLabel': 'Per chapter (overrides the global setting above)',
      'flow.stages.noChapter': 'No chapters yet, so there is nothing to set per chapter.',
      'flow.stages.chapterRow': 'Chapter {seq} {name}',
      'flow.stages.chapterPending': 'Not started',
      'flow.stages.bottomNote': 'Stages always run in a fixed order, not in the order you tick them',
      'flow.stages.footerLabel': 'Next',
      'flow.stages.footerValue': 'Prepare the consistency anchors (character bible and style)',
      'flow.stages.action': 'Start stage one',
      'flow.degrade.title': 'Degradation & failure',
      'flow.degrade.subtitle': 'Say what is missing, never pretend it worked',
      'flow.degrade.capsule': '{count} kinds of missing',
      'flow.degrade.loading': 'Reading degradation state…',
      'flow.degrade.failed': 'The degradation state could not be read',
      'flow.degrade.missingItem': 'Missing item',
      'flow.degrade.colVideo': 'Film',
      'flow.degrade.colStoryboard': 'Storyboard',
      'flow.degrade.colPack': 'Reference images',
      'flow.degrade.matrixNote': 'Soft dependency loss is stated too: a missing voice only degrades, it is not an error',
      'flow.degrade.noneTitle': 'No degradation right now',
      'flow.degrade.noneBody': 'Neither the probe nor the delivery found a gap.',
      'flow.degrade.outputsLine': 'Film {video} · storyboard {storyboard} · reference images {pack}',
      'flow.degrade.rerun': 'Re-run tts',
      'flow.degrade.accept': 'Accept as is',
      'flow.degrade.dialogLabel': 'How it is phrased in chat',
      'flow.degrade.noNotices': 'No degradation phrasing yet: nothing missing, nothing to say.',
      'flow.degrade.footerLabel': 'Prefer an incomplete but honest result',
      'flow.degrade.footerValue': 'Degradation notes',
      'flow.degrade.action': 'View degradation notes',
      'degrade.kind.video_provider_down': 'Video channel down',
      'degrade.kind.image_provider_down': 'Image channel down',
      'degrade.kind.voice_missing': 'Voice missing',
      'degrade.kind.ffmpeg_missing': 'ffmpeg missing',
      'degrade.kind.partial_shot_failed': 'Some shots failed',
      'degrade.kind.vram_insufficient': 'Not enough VRAM',
      'degrade.kind.model_channel_unreachable': 'Model channel unreachable',
      'degrade.video.none': 'None',
      'degrade.video.text_card': 'Text card',
      'degrade.video.placeholder': 'Placeholder frame',
      'degrade.video.silent': 'Silent film',
      'degrade.pack.full': 'All',
      'degrade.pack.text_card': 'Text card',
      'degrade.pack.partial': 'Partial',
      'degrade.pack.none': 'None',
      'degrade.storyboard.yes': 'Yes',
      'degrade.storyboard.no': 'No',
      'stage.go.requirement': 'Go to the “Brief” step',
      'stage.go.run': 'Go to the “Run” step',
      'stage.go.plan': 'Go to the “Plan” step',
      'stage.go.generate': 'Go to the “Generate” step',
      'stage.go.storyboard': 'Go to the “Storyboard” step',
      'stage.go.deliver': 'Go to the “Deliver” step',
      'chrome.log.action': 'Export log',
      'chrome.stat.row': '{position} · spent {spent} / cap {cap}',
      'captured.label': 'Your brief (auto-captured)',
      'captured.empty': 'Type what you want in the chat box and it lands here verbatim.',
      'common.confirm': 'Confirm',
      'common.cancel': 'Cancel',
      'common.retry': 'Retry',
      'common.download': 'Download',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.start': 'Start',
      'common.regenerate': 'Regenerate',
      'common.rollback': 'Rollback',
      'common.loading': 'Loading…',
      'common.unknown': 'Unknown',
      'common.on': 'On',
      'common.off': 'Off',
      'empty.generic': 'This is empty. {hint}',
      'empty.chapters': 'No chapters yet. Paste the novel in the chat box and it splits here.',
      'empty.shots': 'No shots yet. The assistant writes the storyboard from the brief above.',
      'empty.assets': 'No reference images yet. The assistant makes character, scene and prop images as needed.',
      'empty.context': 'Context is empty. Start a bible, a style guide or a continuity note.',
      'empty.skills': 'No skill yet. Install a pack, or let the assistant build one.',
      'empty.output': 'No output yet. Assemble a chapter to get a film.',
      'empty.log': 'No change yet.',
      'empty.hint': 'Next: complete the brief and the pipeline continues.',
      'stages.llm': 'Script & prompts',
      'stages.image': 'Reference images',
      'stages.tts': 'Voice samples',
      'stages.video': 'Video',
      'hardDependency': 'video hard-depends on image: missing reference images are an error.',
      'softDependency': 'video soft-depends on tts: missing voices degrade the video and the UI says so.',
      'chat.progress': 'Stage progress',
      'chat.chapters': 'Chapter list',
      'chat.storyboard': 'Storyboard cards',
      'chat.plan': 'Execution path',
      'chat.assets': 'Asset cards',
      'chat.deliver': 'Film & deliverables',
      'chat.changelog': 'Changelog',
      'chat.expand': 'Expand',
      'chat.collapse': 'Collapse',
      'chat.progress.stage': 'Stage',
      'chat.progress.chapter': 'Chapter',
      'chat.progress.shot': 'Shot',
      'chat.progress.elapsed': 'Elapsed',
      'unit.chapter': 'chapters',
      'unit.shot': 'shots',
      'chat.summary.chapters': '{chapters} chapters · {shots} shots',
      'chat.summary.shots': '{shots} shots',
      'chat.summary.plan': '{kind} · {position}',
      'shot.status.pending': 'Not generated',
      'shot.status.generating': 'Generating',
      'shot.status.done': 'Done',
      'shot.status.failed': 'Failed',
      'chapter.status.queued': 'No storyboard yet',
      'chapter.status.failed': 'A shot failed',
      'chapter.status.running': 'Generating',
      'chapter.status.done': 'Done',
      'asset.category.character': 'Character',
      'asset.category.scene': 'Scene',
      'asset.category.prop': 'Prop',
      'asset.category.costume': 'Costume',
      'asset.category.age': 'Age variant',
      'asset.category.voice': 'Voice',
      'asset.category.music': 'Music',
      'asset.category.sfx': 'SFX',
      'asset.category.video': 'Video',
      'asset.category.other': 'Other',
      'context.section.bible': 'Character bible',
      'context.section.style': 'Style guide',
      'context.section.continuity': 'Continuity notes',
      'skills.bundled': 'Bundled',
      'skills.installed': 'Installed',
      'skills.generated': 'Generated',
      'skills.emptyDescription': 'An empty description disables both routing and the skill directory.',
      'skills.notDistributed': 'The plugin ships no third-party skill bodies; install upstream packs yourself.',
      'skills.previewTitle': 'Body preview',
      'button.primary': 'Primary button',
      'button.secondary': 'Secondary button',
      'button.disabled': 'Disabled button',
      'button.danger': 'Danger button',
      'input.default': 'Default input',
      'input.focus': 'Focused input',
      'input.error': 'Error input',
      'pill.running': 'Running',
      'pill.done': 'Done',
      'pill.failed': 'Failed',
      'pill.queued': 'Queued',
      'progress.running': 'Running',
      'progress.done': 'Complete',
      'progress.failed': 'Failed',
      'emptyState.noData': 'No data',
      'emptyState.error': 'Something failed',
      'toast.info': 'Info',
      'toast.warning': 'Warning',
      'toast.error': 'Error',
      'card.default': 'Default card',
      'card.selected': 'Selected card',
      'card.disabled': 'Disabled card',
      'chapter.unit': 'A chapter is one independently deliverable unit — one episode per chapter.',
      'shots.quantize': 'Duration quantization',
      'shots.refs': 'Reference tags',
      'shots.assembly': 'Assembly order: character → scene → prop → voice · images ≤9, media ≤3',
      'assets.priority': 'Reference priority: costume > age variant > character (independent axes)',
      'assets.variants': 'Variant classes (costume / age) must carry parent_id and hang under the parent',
      'context.overwrite': 'Overwrite whole section',
      'context.append': 'Append',
      'context.keys': 'Context allows exactly three keys; an extra key is an error, never a silent drop',
      'output.chapters': 'Chapter scale',
      'output.subtitles': 'Subtitles',
      'output.voice': 'Character audio',
      'output.bgm': 'Background music',
      'output.speed': 'Speed {rate}×',
      'deliver.downloadAll': 'Download this chapter',
      'deliver.binaryKept': 'Media binaries are not deleted by a rollback (video and images stay in place)',
      'log.drifted': 'This record drifted; rolling back overwrites later changes',
      'log.force': 'Force rollback',
      'log.projectLocked': 'The project layer cannot be rolled back: this plugin has no API to delete a project',
      'log.single': 'Roll back one',
      'log.batch': 'Roll back a batch',
      'log.timepoint': 'Roll back to a point in time',
      'workflow.diagnostics': 'Parse diagnostics',
      'workflow.loaders': 'Loaders',
      'workflow.modelLoaders': 'Model loaders',
      'workflow.saves': 'Savers',
      'workflow.samplers': 'Samplers',
      'workflow.sizeNodes': 'Size nodes',
      'workflow.textCandidates': 'Text candidates',
      'workflow.hasVideoFields': 'Has video fields',
      'tool.importNovel.label': 'Import novel',
      'tool.importNovel.say': 'import this novel',
      'tool.setStoryboard.label': 'Set storyboard',
      'tool.setStoryboard.say': 'use this storyboard',
      'tool.saveContext.label': 'Save context',
      'tool.saveContext.say': 'save this into the character bible',
      'tool.updateShot.label': 'Edit shot',
      'tool.updateShot.say': 'set shot 3 to 5 seconds',
      'tool.createAsset.label': 'New asset',
      'tool.createAsset.say': 'create a character reference image',
      'tool.updateAsset.label': 'Edit asset',
      'tool.updateAsset.say': 'update the character reference image',
      'tool.bindAsset.label': 'Bind asset',
      'tool.bindAsset.say': 'bind the reference image to shot 3',
      'tool.updatePlan.label': 'Update execution plan',
      'tool.updatePlan.say': 'switch the execution plan to i2i',
      'tool.runStage.label': 'Run stage',
      'tool.runStage.say': 'run the image stage',
      'tool.regenerateShot.label': 'Regenerate shot',
      'tool.regenerateShot.say': 'regenerate shot 3',
      'tool.assembleChapter.label': 'Assemble chapter',
      'tool.assembleChapter.say': 'assemble chapter 1',
      'tool.setChapterMusic.label': 'Set chapter music',
      'tool.setChapterMusic.say': 'add music to chapter 1',
      'tool.rollback.label': 'Roll back',
      'tool.rollback.say': 'roll back to chapter 2',
      'notice.undelivered': '“{label}” did not go through: the workbench has no tool channel yet. Retry, or say “{say}” in the chat box.',
      'notice.hostRefused': '“{label}” did not go through: the host refused the call{reason}. Say “{say}” in the chat box instead.',
      'notice.unknownTool': 'Unknown action',
      'notice.sayFallback': 'what you want done',
      'notice.replayed': 'Replayed {count} queued request(s).',
      'notice.stillPending': '{count} request(s) still cannot be delivered: the workbench has no tool channel yet.',
    },
  };
})(RF);

/* ── src/client/shared.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端共享层：投影读取、模块级单例、格式化助手。
 *
 * R1：会话日志是唯一事实源，插件内存只是派生缓存 —— 客户端只**读**宿主投影。
 * R14：两个 Tab 共享数据时，状态放**模块级单例 + `useSyncExternalStore`**，
 *      不能放组件 `useState`；单例只存派生视图，业务事实仍在会话投影里。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 空投影：宿主还没发布 ReelForge 视图时的占位。 */
  RF.EMPTY_PROJECTION = Object.freeze({
    name: '',
    subtitle: '',
    runPosition: '',
    provider: '',
    // 执行路径：没选 kind 时为 null。客户端 6 步进度条靠它判断「方案这步过没过」。
    plan: null,
    stage: 'requirement',
    chapters: [],
    shots: [],
    assets: [],
    context: { bible: '', style: '', continuity: '' },
    skills: [],
    deliverables: [],
    changelog: { entries: [], total: 0, modes: ['single', 'batch', 'timepoint'] },
    // 需求（板 02）：正文规模 + 检测到的章节标题（**没有正文**）。
    intake: { chars: 0, headings: [], fallbackChars: 0 },
    // 项目设置（板 02）：画幅 / 分辨率 / 目标时长 / BGM。
    settings: {
      aspectRatio: '',
      resolution: '',
      targetDuration: null,
      enableBgm: false,
      enableSubtitles: false,
    },
    // 执行路径矩阵（板 05）：kind × 位置的规格来源。
    planMatrix: [],
    // 执行阶段（板 06）：全局开关 + 按章覆盖。
    stages: { global: [], byChapter: [] },
    // 对话输入截获（§10.5）：用户在 DSH 输入框里敲的原文，由宿主钩子写进状态。
    input: { text: '' },
    cost: { spent: 0, cap: 0 },
    budget: {},
    workflowAnalysis: null,
  });

  /**
   * 设备检查 / 降级矩阵的宿主路由 URL（板 04 / 16 号板）。
   *
   * 探测结果是**能力事实**，不是会话状态 ⇒ 不进 wire view，走一条独立只读路由
   * （宿主半 `src/host/probeRoute.js`）。`refresh=1` 绕过宿主侧缓存强制重跑。
   *
   * @param {{ position?: string, provider?: string, refresh?: boolean }} [options] - 选项。
   * @returns {string} 同源 URL。
   */
  RF.probeUrl = function probeUrl(options = {}) {
    const query = new URLSearchParams();
    const sessionId = RF.currentSessionId ?? '';
    if (sessionId !== '') query.set('session', sessionId);
    if (typeof options.position === 'string' && options.position !== '') {
      query.set('position', options.position);
    }
    if (typeof options.provider === 'string' && options.provider !== '') {
      query.set('provider', options.provider);
    }
    if (options.refresh === true) query.set('refresh', '1');
    return `/api/reelforge.probe?${query.toString()}`;
  };

  /**
   * 会话指令的请求 id。
   *
   * 宿主 `SessionPromptRequest.requestId` 要求**客户端铸造**一个唯一身份
   * （宿主用它去重：同一个 requestId 重复投递只算一次）。
   * 用 `crypto.randomUUID()`；老浏览器没有 `crypto` 时退回「时间戳 + 随机数」，
   * 保证**每次调用都不一样**（重复 id 会被宿主当重放而丢掉）。
   *
   * @returns {string} 请求 id。
   */
  RF.newRequestId = function newRequestId() {
    const cryptoRef = globalThis.crypto;
    if (cryptoRef !== undefined && cryptoRef !== null && typeof cryptoRef.randomUUID === 'function') {
      return cryptoRef.randomUUID();
    }
    return `rf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  /** 交付物 / 成片文件的同源读取 URL（宿主 Connection 路由）。 */
  RF.deliverableUrl = function deliverableUrl(relativePath) {
    if (typeof relativePath !== 'string' || relativePath.length === 0) return '';
    const sessionId = RF.currentSessionId ?? '';
    const query = new URLSearchParams({ path: relativePath });
    if (sessionId !== '') query.set('session', sessionId);
    return `/api/reelforge.file?${query.toString()}`;
  };

  /**
   * 模块级单例：派生视图 + 订阅通道（**不是事实源**）。
   * @returns {{ getSnapshot: function, subscribe: function, set: function }} 单例。
   */
  RF.createStore = function createStore() {
    let snapshot = RF.EMPTY_PROJECTION;
    /** @type {Set<function>} */
    const listeners = new Set();
    return {
      getSnapshot() {
        return snapshot;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      set(next) {
        if (next === snapshot) return;
        snapshot = next;
        for (const listener of listeners) listener();
      },
    };
  };

  /** 工作台与（可选的）历史运行 Tab 共享的单例。 */
  RF.store = RF.createStore();

  /**
   * 从会话列表快照里取 ReelForge 投影视图。
   * @param {object} sessions - `ctx.sessions.list.getSnapshot()` 的返回值。
   * @param {string} sessionId - 当前会话 id。
   * @returns {object} 投影视图（缺失时返回空投影）。
   */
  RF.readProjection = function readProjection(sessions, sessionId) {
    if (sessions === null || typeof sessions !== 'object') return RF.EMPTY_PROJECTION;
    const rows = /** @type {Record<string, any>} */ (sessions).projectionsBySession;
    if (rows === null || typeof rows !== 'undefined' && rows === undefined) return RF.EMPTY_PROJECTION;
    const row = rows[sessionId];
    if (row === undefined || row === null) return RF.EMPTY_PROJECTION;
    const values = row.values;
    if (values === null || typeof values !== 'object') return RF.EMPTY_PROJECTION;
    const view = values[RF.PROJECTION_KEY];
    if (view === null || typeof view !== 'object') return RF.EMPTY_PROJECTION;
    return Object.assign({}, RF.EMPTY_PROJECTION, view);
  };

  /**
   * 订阅会话列表，把最新投影喂进模块级单例。
   * @param {object} ctx - 客户端上下文（只用 `ctx.sessions`，不碰别的服务）。
   * @returns {function} 取消订阅的函数。
   */
  RF.bindProjection = function bindProjection(ctx) {
    const list = ctx.sessions && ctx.sessions.list;
    if (list === undefined || list === null) return () => {};
    const pull = () => {
      const sessions = list.getSnapshot();
      const ids = Object.keys(sessions.byId ?? {});
      for (const id of ids) {
        const view = RF.readProjection(sessions, id);
        if (view !== RF.EMPTY_PROJECTION) {
          RF.store.set(view);
          return;
        }
      }
    };
    pull();
    return list.subscribe(pull);
  };

  /**
   * 读模块级单例的派生视图（`useSyncExternalStore` 的订阅端）。
   * @param {function} React - React。
   * @returns {object} 当前投影视图。
   */
  RF.useProjection = function useProjection(React) {
    return React.useSyncExternalStore(RF.store.subscribe, RF.store.getSnapshot, RF.store.getSnapshot);
  };

  /**
   * 按 `{prefix}.{value}` 取本地化词条。
   *
   * 词条不存在时**原样返回 value**：宁可显示 `pending` 或 `online-api`，
   * 也不要显示 `shot.status.pending` 这种键名（宿主查不到 locale 就回键名）。
   *
   * @param {string} prefix - 词条前缀（`chapter.status` / `asset.category` …）。
   * @param {string} value - 机器值。
   * @param {function} t - translate 函数。
   * @returns {string} 显示名。
   */
  RF.labelOf = function labelOf(prefix, value, t) {
    const raw = String(value ?? '').trim();
    if (raw === '') return '';
    const key = `${prefix}.${raw}`;
    const known = RF.locale && RF.locale.zh ? RF.locale.zh[key] !== undefined : false;
    return known ? t(key) : raw;
  };

  /**
   * 当前进度：第几章的第几镜（底栏第二行）。
   *
   * 规则：先找正在跑的那一章；没有就找第一个还没完成的；都没有就取最后一章。
   * 章内镜号 = 已完成镜数 + 1（上限不超过总镜数）。
   *
   * @param {object} project - 投影视图。
   * @returns {{ chapter: number, shot: number, shots: number } | null} 进度；没有章节时返回 null。
   */
  RF.currentPosition = function currentPosition(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    if (chapters.length === 0) return null;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    const running = chapters.find(chapter => chapter.status === 'running');
    const pending = chapters.find(chapter => chapter.status !== 'done');
    const target = running ?? pending ?? chapters[chapters.length - 1];
    const prefix = `${target.id}-`;
    const chapterShots = shots.filter(shot => String(shot.id ?? '').startsWith(prefix));
    const total = Number(target.shotCount) || chapterShots.length || 0;
    const done = chapterShots.filter(shot => shot.status === 'done').length;
    const index = total > 0 ? Math.min(done + 1, total) : 0;
    return { chapter: target.id, shot: index, shots: total };
  };

  /**
   * 格式化成人类可读的字节数。
   * @param {number} bytes - 字节数。
   * @returns {string} 文本。
   */
  RF.formatBytes = function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let size = value;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${index === 0 ? size : size.toFixed(1)} ${units[index]}`;
  };

  /**
   * 格式化成金额文本。
   * @param {number} amount - 金额。
   * @returns {string} 文本。
   */
  RF.formatMoney = function formatMoney(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '¥0.00';
    return `¥${value.toFixed(2)}`;
  };

  /**
   * 格式化成日期文本（`YYYY-MM-DD`）。
   *
   * 设计稿 12 号板要技能行右侧显示「3.4 KB · 2026-10-22」。
   * 读不出来就返回空串 —— 显示 `Invalid Date` 比不显示更糟。
   *
   * @param {string} value - ISO 时间串。
   * @returns {string} 日期文本。
   */
  RF.formatDate = function formatDate(value) {
    const text = String(value ?? '').trim();
    if (text === '') return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const pad = part => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  /**
   * 格式化成日期时间文本（`YYYY-MM-DD HH:mm`）。
   *
   * 变更日志要回答「谁在**什么时候**改了什么」—— 只给日期不够。
   *
   * @param {string} value - ISO 时间串。
   * @returns {string} 文本。
   */
  RF.formatDateTime = function formatDateTime(value) {
    const text = String(value ?? '').trim();
    if (text === '') return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const pad = part => String(part).padStart(2, '0');
    return `${RF.formatDate(text)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  /**
   * 格式化成秒数文本。
   * @param {number} seconds - 秒数。
   * @returns {string} 文本。
   */
  RF.formatDuration = function formatDuration(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return '0.0s';
    return `${value.toFixed(1)}s`;
  };

  /**
   * 插值：把 `{name}` 占位替换成取值。
   * @param {string} template - 模板。
   * @param {Record<string, string | number>} values - 取值。
   * @returns {string} 结果。
   */
  RF.interpolate = function interpolate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (whole, key) => (
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole
    ));
  };

  /**
   * 安全取词：宿主 `t` 还没绑定时不至于吐键名、也不抛异常。
   *
   * 背景：`RF.t` 是 `RF.apply` 里 `ctx.locale.bind(ns)` 的结果，
   * 而通知重放（`retryPending`）、快捷键注册这些路径**不保证**先跑过 `apply`；
   * 宿主查不到 locale 时 `translate` 直接回键名（`locale/index.ts`）。
   * ⇒ 宁可退回**本地词典**（中文兜底），也不让用户看见 `notice.undelivered` 这种串。
   *
   * @param {string} key - 词条键。
   * @param {Record<string, string | number>} [params] - 插值参数。
   * @returns {string} 文案。
   */
  RF.tr = function tr(key, params) {
    if (typeof RF.t === 'function') return RF.t(key, params);
    const dictionary = RF.locale && RF.locale.zh ? RF.locale.zh : {};
    const template = dictionary[key];
    if (typeof template !== 'string') return key;
    return params === undefined ? template : RF.interpolate(template, params);
  };
})(RF);

/* ── src/client/components.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 7 组基础组件的**全部态**（画板 15）。
 *
 * 两条视觉纪律：
 *   1. 状态色只用令牌色，**不用 `opacity` 表达层级**；
 *   2. 禁用态用**实色**令牌（`--dsw-alias-state-idle-primary` 一类的实色），不用半透明。
 *
 * 组件只吐 class 名，样式在 `src/client/workbench/styles.js`（只用 `--dsw-alias-*`）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 组件 class 前缀：与宿主 primitive 的类名不撞。 */
  RF.CLS = 'rf';

  /**
   * 按钮：主要 / 次要 / 禁用 / 危险。
   * @param {{ label: string, variant?: string, onClick?: function, disabled?: boolean, title?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Button = function Button(props) {
    const variant = props.variant === 'secondary' || props.variant === 'danger' ? props.variant : 'primary';
    const disabled = props.disabled === true;
    return h('button', {
      type: 'button',
      className: `${RF.CLS}-btn ${RF.CLS}-btn--${variant}${disabled ? ` ${RF.CLS}-btn--disabled` : ''}`,
      disabled,
      title: props.title,
      onClick: disabled ? undefined : props.onClick,
    }, props.label);
  };

  /**
   * 输入框：默认 / 聚焦 / 错误。
   * @param {{ value?: string, placeholder?: string, state?: string, onChange?: function, label?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Input = function Input(props) {
    const state = props.state === 'focus' || props.state === 'error' ? props.state : 'default';
    return h('label', { className: `${RF.CLS}-field` },
      props.label === undefined ? null : h('span', { className: `${RF.CLS}-field__label` }, props.label),
      h('input', {
        className: `${RF.CLS}-input ${RF.CLS}-input--${state}`,
        value: props.value ?? '',
        placeholder: props.placeholder ?? '',
        onChange: props.onChange,
      }));
  };

  /**
   * 胶囊 / 标签：进行中 / 已完成 / 失败 / 排队 / **降级**。
   *
   * ⚠️ 画板 15 的胶囊只列了 4 态；第 5 种 `warn`（降级但仍交付）是
   * **画板 16 降级矩阵**要的语义 —— 那一板明写「每格用 10-11px 文字，
   * 绿 #3FB950 / 黄 #D29922 / 红 #F85149」：绿=有、红=无、黄=降级但仍交付。
   * 少了它，「静帧成片 / 部分镜 / 静音成片」会渲染成灰色 = 看不出是降级。
   *
   * @param {{ label: string, tone?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Pill = function Pill(props) {
    const tone = ['running', 'done', 'failed', 'queued', 'warn'].includes(props.tone) ? props.tone : 'queued';
    return h('span', { className: `${RF.CLS}-pill ${RF.CLS}-pill--${tone}` }, props.label);
  };

  /**
   * 进度条：进行中 / 完成 / 失败。
   * @param {{ value?: number, tone?: string, label?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Progress = function Progress(props) {
    const tone = ['running', 'done', 'failed'].includes(props.tone) ? props.tone : 'running';
    const ratio = Math.max(0, Math.min(1, Number(props.value ?? 0)));
    return h('div', { className: `${RF.CLS}-progress ${RF.CLS}-progress--${tone}`, role: 'progressbar' },
      h('div', { className: `${RF.CLS}-progress__fill`, style: { width: `${Math.round(ratio * 100)}%` } }),
      props.label === undefined ? null : h('span', { className: `${RF.CLS}-progress__label` }, props.label));
  };

  /**
   * 空态：无数据 / 出错了。
   * @param {{ title: string, hint?: string, tone?: string, action?: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.EmptyState = function EmptyState(props) {
    const tone = props.tone === 'error' ? 'error' : 'empty';
    return h('div', { className: `${RF.CLS}-empty ${RF.CLS}-empty--${tone}` },
      h('div', { className: `${RF.CLS}-empty__title` }, props.title),
      props.hint === undefined ? null : h('div', { className: `${RF.CLS}-empty__hint` }, props.hint));
  };

  /**
   * Toast：信息 / 警告 / 错误。
   * @param {{ message: string, tone?: string, onDismiss?: function }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Toast = function Toast(props) {
    const tone = ['info', 'warning', 'error'].includes(props.tone) ? props.tone : 'info';
    return h('div', { className: `${RF.CLS}-toast ${RF.CLS}-toast--${tone}`, role: 'status' },
      h('span', { className: `${RF.CLS}-toast__message` }, props.message),
      props.onDismiss === undefined
        ? null
        : h('button', { type: 'button', className: `${RF.CLS}-toast__close`, onClick: props.onDismiss }, '×'));
  };

  /**
   * 卡片：默认 / 选中 / 禁用。
   *
   * ⚠️ 带 `onClick` 的卡片**必须键盘可达**：只挂 `onClick` 的 `div`
   * 鼠标能用、键盘用不了（实机验证时抓到的：运行位置屏的两张大卡
   * 与分镜/技能的选择卡都只能靠鼠标）。
   *
   * ⇒ 可点时补 `role="button"` + `tabIndex` + Enter/Space 键。
   * 事件来自卡片**内部**的按钮时**不重复触发**卡片自己的动作
   * （否则在子按钮上按 Enter 会同时选中卡片）。
   *
   * @param {{ children: any, state?: string, onClick?: function, accent?: boolean, tone?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Card = function Card(props) {
    const state = props.state === 'selected' || props.state === 'disabled' ? props.state : 'default';
    const clickable = state !== 'disabled' && typeof props.onClick === 'function';
    // `accent` = 左侧 4px 强调色竖条（画板 06 号板：阶段卡选中态
    // 「描边 #4C8DFF + 左侧 4px #4C8DFF 条」）。别的板只要描边，不要竖条。
    const accent = props.accent === true ? ` ${RF.CLS}-card--accent` : '';
    // `tone` = 状态面（画板 17 号板的 WARN-SURF / ERROR-SURF 两个令牌）：
    //   `warn`        黄面 + 黄描边（画板 06 号板「显存门槛提示条」）
    //   `error`       红面 + 红描边（画板 04 号板「结论卡」）
    //   `warn-border` 普通面 + 黄描边（画板 16 号板「一次真实降级」卡）
    const tone = ['warn', 'error', 'warn-border'].includes(props.tone) ? ` ${RF.CLS}-card--${props.tone}` : '';
    return h('div', {
      className: `${RF.CLS}-card ${RF.CLS}-card--${state}${accent}${tone}`,
      onClick: clickable ? props.onClick : undefined,
      role: clickable ? 'button' : undefined,
      tabIndex: clickable ? 0 : undefined,
      onKeyDown: clickable
        ? (event) => {
          if (event?.target !== event?.currentTarget) return;
          const key = event?.key;
          if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
          if (event?.preventDefault) event.preventDefault();
          props.onClick(event);
        }
        : undefined,
    }, props.children);
  };

  /** 分组标题（画板里的 12px 分组标签）。 */
  RF.SectionLabel = function SectionLabel(props) {
    return h('div', { className: `${RF.CLS}-section` }, props.children);
  };

  /** 一行键值（设计稿里大量使用的「标签 + 值」行）。 */
  RF.MetaRow = function MetaRow(props) {
    return h('div', { className: `${RF.CLS}-meta` },
      h('span', { className: `${RF.CLS}-meta__key` }, props.label),
      h('span', { className: `${RF.CLS}-meta__value` }, props.value));
  };

  /**
   * 组件集合（页签与消息行统一从这里取）。
   *
   * ⚠️ 顺序约束：这段必须**放在所有组件定义之后**。
   * 它是一次性快照（`RF.ui = { Button: RF.Button, ... }`），若在 `RF.SectionLabel` /
   * `RF.MetaRow` 定义之前执行，这两个槽位会永久取到 `undefined`，
   * 页签与消息行里 `h(RF.ui.SectionLabel, ...)` 就会抛
   * "Element type is invalid"（有数据时必崩）。
   */
  RF.ui = {
    Button: RF.Button,
    Input: RF.Input,
    Pill: RF.Pill,
    Progress: RF.Progress,
    EmptyState: RF.EmptyState,
    Toast: RF.Toast,
    Card: RF.Card,
    SectionLabel: RF.SectionLabel,
    MetaRow: RF.MetaRow,
  };
})(RF);

/* ── src/client/workbench/stageSteps.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 6 步进度条的**纯函数**（需求 · 运行 · 方案 · 生成 · 分镜 · 交付）。
 *
 * 当前步由项目状态推导，不自建第二份业务状态（R1）：
 *   0 requirement 没有项目
 *   1 run        还没选运行位置
 *   2 plan       还没选 kind × 执行位置
 *   3 generate   有章节、还没分镜
 *   4 storyboard 有分镜、还没成片
 *   5 deliver    有成片
 *
 * 步 id 来自 `RF.STAGE_STEPS`（`src/core/constants.js` 的镜像，由单测比对）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 推导当前步的下标。
   * @param {object} project - 投影视图。
   * @returns {number} 0..5。
   */
  RF.stageStepIndex = function stageStepIndex(project) {
    const view = project === null || typeof project !== 'object' ? RF.EMPTY_PROJECTION : project;
    const chapters = Array.isArray(view.chapters) ? view.chapters : [];
    const shots = Array.isArray(view.shots) ? view.shots : [];
    const deliverables = Array.isArray(view.deliverables) ? view.deliverables : [];
    if (chapters.length === 0) return 0;
    if (typeof view.runPosition !== 'string' || view.runPosition === '') return 1;
    if (view.plan === null || typeof view.plan !== 'object' || typeof view.plan.kind !== 'string') return 2;
    if (shots.length === 0) return 3;
    if (deliverables.length === 0) return 4;
    return 5;
  };

  /**
   * 推导当前步的 id。
   * @param {object} project - 投影视图。
   * @returns {string} 步 id。
   */
  RF.stageStep = function stageStep(project) {
    return RF.STAGE_STEPS[RF.stageStepIndex(project)];
  };

  /**
   * 6 步进度条的完整状态：当前步、已过步、计数。
   * @param {object} project - 投影视图。
   * @returns {{ current: number, currentId: string, passed: number[], upcoming: number[], count: string }} 状态。
   */
  RF.stageStepsState = function stageStepsState(project) {
    const current = RF.stageStepIndex(project);
    const passed = [];
    const upcoming = [];
    for (let index = 0; index < RF.STAGE_STEPS.length; index += 1) {
      if (index < current) passed.push(index);
      else if (index > current) upcoming.push(index);
    }
    return {
      current,
      currentId: RF.STAGE_STEPS[current],
      passed,
      upcoming,
      count: `${current + 1} / ${RF.STAGE_STEPS.length}`,
    };
  };
})(RF);

/* ── src/client/workbench/breakpoints.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 断点判定：**按实测宽度**判，不按窗口宽（设计方案 §4.3）。
 *
 * 右栏宽度区间 300–1150，永远全高：
 *   < 420        窄栏：单列；表格降为卡片流
 *   420 – 559    单列（净宽不足 520，放不下设计稿的两列网格）
 *   ≥ 560        两列网格启用
 *
 * ## 560 这个阈值是**从设计稿栅格推出来的**，不是拍的
 *
 * `design/STYLE-SPEC.md` §1 栅格：左右外边距 20px ⇒ 内容净宽 **520**；
 * **两列网格每列 254、列间距 12**（`20 + 254 + 12 + 254 = 540`）。
 * ⇒ 面板宽度 ≥ `20 + 520 + 20 = 560` 时，两列网格才与设计稿 **1:1** 对上。
 *
 * 设计稿 §6 明确要求两列的画板有三块：`RF/RunMode`（两张并列大卡 254×280）、
 * `RF/Plan`（**2×2 矩阵** 254×150 四卡）、`RF/Assets`（两列网格 254 宽）。
 *
 * ⚠️ 阈值之前写的是 **900** —— 那是把验收门禁的**测试宽度档**
 * （300 / 560 / 900 / 1150）误当成了列数阈值。后果是：这三块板在右栏里
 * **永远退化成单列**，与设计稿正好相反（实机截图抓到：板 03 的两张大卡
 * 上下堆叠、板 05 的 2×2 矩阵竖着排）。
 *
 * 画板 560×900 是**设计稿比例**，不是运行时比例；9:16 只作为成片画幅出现在播放器画面区。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 断点常量（宽度以 CSS 像素计）。
   *
   * - `narrow = 420`：窄栏 —— 表格降为卡片流。
   * - `wide = 560`：**两列网格的门槛**（净宽 ≥ 520 = STYLE-SPEC §1 的两列网格净宽）。
   */
  RF.BREAKPOINTS = { narrow: 420, wide: 560 };

  /**
   * 宽度 → 断点名。
   * @param {number} width - 实测宽度。
   * @returns {string} `narrow` | `medium` | `wide`。
   */
  RF.breakpointFor = function breakpointFor(width) {
    const value = Number(width);
    if (!Number.isFinite(value)) return 'medium';
    if (value < RF.BREAKPOINTS.narrow) return 'narrow';
    if (value < RF.BREAKPOINTS.wide) return 'medium';
    return 'wide';
  };

  /**
   * 宽度 → 两列网格的列数。
   * @param {number} width - 实测宽度。
   * @returns {number} 1 或 2。
   */
  RF.columnsFor = function columnsFor(width) {
    return RF.breakpointFor(width) === 'wide' ? 2 : 1;
  };

  /**
   * 宽度 → 表格是否降为卡片流。
   * @param {number} width - 实测宽度。
   * @returns {boolean} 是否降级为卡片流。
   */
  RF.isCardFlow = function isCardFlow(width) {
    return RF.breakpointFor(width) === 'narrow';
  };
})(RF);

/* ── src/client/workbench/chrome.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台外壳的**按屏定义**：Header 三件套（标题 / 副标 / 胶囊）+ Footer 三件套
 * （标签 / 值 / 按钮）。
 *
 * 背景：设计稿 17 块板的 Header 胶囊与 Footer 文案**每块都不同** ——
 *   01 工作台    云端 · RunningHub   |  当前阶段 / 阶段三 tts · 角色音色样本 | 查看成片
 *   07 上下文    3 个分区             |  下一步 / 生成资产参考图             | 继续
 *   08 资产库    24 项资产            |  下一步 / 逐镜写分镜                 | 继续
 *   09 分镜表    章 1 / 3             |  下一步 / 跑 video 阶段出片          | 生成第 1 章
 *   10 成片      云端渲染             |  本集用时 / 成本 ¥4.60 · 云端渲染完成 | 交付物
 *   12 技能      3 个来源             |  技能来源 / 内置 3 · 已装 1 · 自建 1 | 安装技能包
 *   13 变更日志  42 条                |  本章 6 条 / 全项目 42 条            | 导出日志
 *
 * 实现以前是**全局固定**的一套（恒为「运行位置 · provider」+「成本 + 进度 + 查看成片」）。
 * owner 已裁决（Q1 底栏按屏变化 / Q3 胶囊显示当前屏摘要）：**按屏变化**。
 *
 * 本文件只回答「这一屏长什么样」；「怎么渲染」在 `Workbench.js`。
 * 计数、章节号、成本这类动态部分由这里的函数从投影视图现算 —— 不写死。
 * ───────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 当前章：优先取客户端算出来的「正在跑」那一章，否则第一章。
   *
   * @param {object} project - 投影视图。
   * @returns {object | null} 当前章（wire view 的 chapterViews 一项）；没有章时 null。
   */
  function currentChapter(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    if (chapters.length === 0) return null;
    const position = RF.currentPosition(project);
    const seq = position === null ? null : Number(position.chapter);
    const hit = chapters.find(chapter => Number(chapter.id) === seq);
    return hit ?? chapters[0];
  }

  /**
   * 全项目镜数（各章镜数之和）。
   *
   * @param {object} project - 投影视图。
   * @returns {number} 镜数。
   */
  function totalShots(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    return chapters.reduce((sum, chapter) => sum + (Number(chapter.shotCount) || 0), 0);
  }

  /**
   * 运行位置标签。**没选位置时不能说「云端运行」** —— 那是撒谎。
   *
   * @param {object} project - 投影视图。
   * @param {function} t - 翻译函数。
   * @returns {string} 位置标签。
   */
  function positionLabel(project, t) {
    const position = String(project?.runPosition ?? '');
    if (position === '') return t('status.idle');
    if (position === 'local' || position === 'cloud') return t(`status.${position}`);
    return position;
  }

  /**
   * 章节时长（秒）。
   *
   * @param {object | null} chapter - 当前章。
   * @returns {number} 秒数。
   */
  function chapterDuration(chapter) {
    return chapter === null ? 0 : (Number(chapter.durationSec) || 0);
  }

  /**
   * 技能按来源分档计数。
   *
   * @param {object} project - 投影视图。
   * @returns {{ bundled: number, installed: number, generated: number, sources: number }} 三档计数 + 来源档数。
   */
  function skillCounts(project) {
    const skills = Array.isArray(project?.skills) ? project.skills : [];
    const count = source => skills.filter(skill => String(skill.source ?? 'bundled') === source).length;
    const bundled = count('bundled');
    const installed = count('installed');
    const generated = count('generated');
    // 「几个来源」= 有技能的来源档数（bundled / installed / generated），**不是技能个数**。
    // 设计稿 12 号板：胶囊「3 个来源」而底栏是「内置 3 · 已装 1 · 自建 1」（5 个技能、3 个来源）。
    const sources = [bundled, installed, generated].filter(value => value > 0).length;
    return { bundled, installed, generated, sources };
  }

  /**
   * 静态文案包装成函数。
   *
   * 契约统一：外壳的 `subtitle` / `footerLabel` / `footerValue` **一律是函数**。
   * 以前静态文案用 `xxxKey` 字符串、动态文案用 `xxx` 函数，调用方到处判类型 ——
   * 漏判一处就是 `chrome.subtitle is not a function`（真出过）。
   * 静态与动态的差别只该留在**这一层**，不该漏到渲染层。
   *
   * @param {string} key - 词条键。
   * @returns {(project: object, t: function) => string} 取词条的函数。
   */
  function staticText(key) {
    return (_project, t) => t(key);
  }

  /**
   * 变更日志条数。
   *
   * 用 `total`（宿主报的真实总数）而不是 `entries.length` ——
   * 投影里条目有上限截断时，真实总数才不会被截断数冒充。
   *
   * @param {object} project - 投影视图。
   * @returns {number} 条数。
   */
  function logCount(project) {
    const changelog = project?.changelog ?? {};
    const entries = Array.isArray(changelog.entries) ? changelog.entries.length : 0;
    const total = Number(changelog.total);
    return Number.isFinite(total) && total > 0 ? total : entries;
  }

  /**
   * 有没有进入生成阶段（阶段走到「生成」之后）。
   *
   * 用它区分「还没开始渲染」与「还在渲染」—— 两者都不该说成「渲染完成」。
   *
   * @param {object} project - 投影视图。
   * @returns {boolean} 是否已进入生成阶段。
   */
  function renderStarted(project) {
    const stage = String(project?.stage ?? '');
    return stage === 'generate' || stage === 'storyboard' || stage === 'deliver';
  }

  /**
   * 每屏的外壳描述。
   *
   * @typedef {object} TabChrome
   * @property {string} titleKey Header 标题词条。
   * @property {(project: object, t: function, ctx?: object) => string} subtitle Header 副标题。
   * @property {(project: object, t: function, ctx?: object) => string} capsule Header 右侧胶囊。
   * @property {(project: object, t: function) => string} footerLabel Footer 第一行标签。
   * @property {(project: object, t: function) => string} footerValue Footer 第二行。
   * @property {(project: object) => object} footerAction Footer 按钮。
   * @property {string} [disabledHintKey] 按钮不可用时的**兜底**说明词条（说清缺什么、给什么替代）。
   */

  /**
   * 底栏按钮的动作描述。
   *
   * @typedef {object} FooterAction
   * @property {string} key 按钮文案词条。
   * @property {string} kind `tab` / `tool` / `export` / `scroll` / `flow` / `none`。
   * @property {string} [tab] `kind === 'tab'` 时切到哪个页签。
   * @property {string} [screen] `kind === 'flow'` 时切到哪块流程屏。
   * @property {string} [tool] `kind === 'tool'` 时调哪个工具。
   * @property {object | function} [params] `kind === 'tool'` 时的参数（可以是函数）。
   * @property {boolean} [disabled] 不可用时置 true。
   * @property {string} [hintKey] 不可用时的说明词条（说清缺什么、给什么替代）。
   */

  RF.TAB_CHROME = {
    /**
     * 01 工作台（基准板）：胶囊是全局运行状态，底栏第一行是「当前阶段」。
     */
    chapters: {
      titleKey: 'title',
      subtitle: (project, t) => {
        // ⚠️ 只取 `name`，**不要**取 `subtitle` —— 后者可能是整段小说正文，
        // 塞进面板头会把头撑爆（设计稿 01 号板副标是「《夜航船》· 3 章 · 24 镜」）。
        const name = String(project?.name ?? '').trim() || t('project.unnamed');
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        return t('project.summary', {
          name: `《${name}》`,
          chapters: chapters.length,
          shots: totalShots(project),
        });
      },
      capsule: (project, t) => {
        const position = positionLabel(project, t);
        const provider = String(project?.provider ?? '');
        if (position === t('status.idle') || provider === '') return position;
        return `${position} · ${RF.labelOf('provider', provider, t)}`;
      },
      footerLabel: staticText('chrome.chapters.footerLabel'),
      footerValue: (project, t) => {
        const stageLabel = t(`stage.${RF.stageStep(project)}`);
        const position = RF.currentPosition(project);
        const positionText = position === null ? t('footer.idle') : t('footer.position', position);
        return `${stageLabel} · ${positionText}`;
      },
      footerAction: () => ({ key: 'action.viewOutput', kind: 'tab', tab: 'output' }),
    },

    /**
     * 09 分镜表：胶囊是「章 N / 总数」，底栏指向下一步（跑 video 出片）。
     *
     * ⚠️ 没有章时**不能说「章 1 / 0」**（自相矛盾），也不能让「生成第 1 章」
     * 变成点了没反应的按钮 —— 禁用 + 说清缺什么。
     */
    shots: {
      titleKey: 'chrome.shots.title',
      subtitle: (project, t) => {
        const chapter = currentChapter(project);
        if (chapter === null) return t('chrome.shots.subtitleEmpty');
        return t('chrome.shots.subtitle', {
          chapter: chapter.id,
          name: chapter.title,
          shots: chapter.shotCount,
        });
      },
      capsule: (project, t) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return t('chrome.shots.capsuleEmpty');
        const chapter = currentChapter(project);
        return t('chrome.shots.capsule', { current: chapter?.id ?? 1, total: chapters.length });
      },
      footerLabel: staticText('chrome.shots.footerLabel'),
      footerValue: staticText('chrome.shots.footerValue'),
      footerAction: (project) => {
        const chapter = currentChapter(project);
        if (chapter === null) {
          return { key: 'chrome.shots.action', kind: 'none', hintKey: 'chrome.shots.disabledHint' };
        }
        return {
          key: 'chrome.shots.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.runStage,
          params: { stage: 'video', seq: Number(chapter.id) || 1 },
        };
      },
    },

    /**
     * 08 资产库：胶囊是资产件数，底栏指向下一步（逐镜写分镜）。
     */
    assets: {
      titleKey: 'chrome.assets.title',
      subtitle: staticText('chrome.assets.subtitle'),
      capsule: (project, t) => t('chrome.assets.capsule', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      footerLabel: staticText('chrome.assets.footerLabel'),
      footerValue: staticText('chrome.assets.footerValue'),
      footerAction: () => ({ key: 'chrome.assets.action', kind: 'tab', tab: 'shots' }),
    },

    /**
     * 07 上下文：胶囊是分区数，底栏指向下一步（生成资产参考图）。
     */
    context: {
      titleKey: 'chrome.context.title',
      subtitle: staticText('chrome.context.subtitle'),
      capsule: (project, t) => t('chrome.context.capsule', { count: RF.CONTEXT_KEYS.length }),
      footerLabel: staticText('chrome.context.footerLabel'),
      footerValue: staticText('chrome.context.footerValue'),
      footerAction: () => ({ key: 'chrome.context.action', kind: 'tab', tab: 'assets' }),
    },

    /**
     * 12 技能：胶囊是来源数，底栏第一行是来源构成。
     */
    skills: {
      titleKey: 'chrome.skills.title',
      subtitle: staticText('chrome.skills.subtitle'),
      capsule: (project, t) => t('chrome.skills.capsule', { count: skillCounts(project).sources }),
      footerLabel: staticText('chrome.skills.footerLabel'),
      footerValue: (project, t) => {
        const counts = skillCounts(project);
        return t('chrome.skills.footerValue', counts);
      },
      footerAction: () => ({ key: 'chrome.skills.action', kind: 'none', hintKey: 'chrome.skills.disabledHint' }),
      disabledHintKey: 'chrome.skills.disabledHint',
    },

    /**
     * 10 成片：胶囊是渲染位置，底栏第一行是本集用时。
     *
     * ⚠️ 没开始渲染时不说「待开始渲染」（不通顺）；也没有交付物时，
     * 「交付物」按钮不能点了没反应 —— 禁用 + 说清缺什么。
     */
    output: {
      titleKey: 'chrome.output.title',
      subtitle: (project, t) => {
        const chapter = currentChapter(project);
        if (chapter === null) return t('chrome.output.subtitleEmpty');
        return t('chrome.output.subtitle', {
          chapter: chapter.id,
          name: chapter.title,
          shots: chapter.shotCount,
          duration: chapterDuration(chapter).toFixed(1),
        });
      },
      capsule: (project, t) => {
        const position = positionLabel(project, t);
        if (position === t('status.idle')) return t('chrome.output.capsuleIdle');
        return t('chrome.output.capsule', { position });
      },
      footerLabel: staticText('chrome.output.footerLabel'),
      footerValue: (project, t) => {
        const cost = RF.formatMoney(project?.cost?.spent ?? 0);
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length > 0) {
          return t('chrome.output.footerValue', { cost, status: t('chrome.output.statusDone') });
        }
        // 还没到出片阶段但已经开始生成 → 说「还在渲染」，别装成已经完成。
        if (renderStarted(project)) {
          return t('chrome.output.footerValue', { cost, status: t('chrome.output.statusPending') });
        }
        return t('chrome.output.statusIdle');
      },
      footerAction: (project) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'chrome.output.action', kind: 'none', hintKey: 'chrome.output.disabledHint' };
        }
        return { key: 'chrome.output.action', kind: 'scroll', target: 'rf-deliverables' };
      },
    },

    /**
     * 13 变更日志：胶囊是条目数，底栏是条目构成。
     */
    log: {
      titleKey: 'chrome.log.title',
      subtitle: staticText('chrome.log.subtitle'),
      capsule: (project, t) => t('chrome.log.capsule', { count: logCount(project) }),
      footerLabel: staticText('chrome.log.footerLabel'),
      footerValue: (project, t) => t('chrome.log.footerValue', { count: logCount(project) }),
      footerAction: () => ({ key: 'chrome.log.action', kind: 'export' }),
    },

    // ══════════════════════════════════════════════════════════════
    // 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）
    //
    // 这些屏**不在页签栏里**（设计稿 17 号板明写右栏是 7 个页签），
    // 它们的骨架只有 Header / StageBar / Scroll / Footer 四段。
    // ══════════════════════════════════════════════════════════════

    /**
     * 02 导入小说：胶囊是「新项目」，底栏指向「选运行位置」。
     */
    intake: {
      titleKey: 'flow.intake.title',
      subtitle: staticText('flow.intake.subtitle'),
      capsule: staticText('flow.intake.capsule'),
      footerLabel: staticText('flow.intake.footerLabel'),
      footerValue: staticText('flow.intake.footerValue'),
      footerAction: () => ({ key: 'flow.intake.action', kind: 'flow', screen: 'runmode' }),
    },

    /**
     * 03 运行位置：胶囊是「2 种位置」，底栏指向「出执行路径」。
     */
    runmode: {
      titleKey: 'flow.runmode.title',
      subtitle: staticText('flow.runmode.subtitle'),
      capsule: (project, t) => t('flow.runmode.capsule', { count: RF.RUN_POSITIONS.length }),
      footerLabel: staticText('flow.runmode.footerLabel'),
      footerValue: staticText('flow.runmode.footerValue'),
      footerAction: () => ({ key: 'flow.runmode.action', kind: 'flow', screen: 'plan' }),
    },

    /**
     * 04 设备检查：胶囊是**真实探测项数**（不是写死的 9），
     * 底栏指向「按探测结果出执行路径」。
     */
    device: {
      titleKey: 'flow.device.title',
      subtitle: staticText('flow.device.subtitle'),
      capsule: (project, t, context) => t('flow.device.capsule', {
        count: Array.isArray(context?.probe?.view?.report?.items)
          ? context.probe.view.report.items.length
          : 0,
      }),
      footerLabel: staticText('flow.device.footerLabel'),
      footerValue: staticText('flow.device.footerValue'),
      footerAction: () => ({ key: 'flow.device.action', kind: 'flow', screen: 'plan' }),
    },

    /**
     * 05 执行路径：胶囊是「5 种 kind」，底栏指向「选要跑哪些阶段」。
     */
    plan: {
      titleKey: 'flow.plan.title',
      subtitle: staticText('flow.plan.subtitle'),
      capsule: (project, t) => t('flow.plan.capsule', { count: RF.GENERATION_KINDS.length }),
      footerLabel: staticText('flow.plan.footerLabel'),
      footerValue: staticText('flow.plan.footerValue'),
      footerAction: () => ({ key: 'flow.plan.action', kind: 'flow', screen: 'stages' }),
    },

    /**
     * 06 执行阶段：胶囊是「4 个阶段」，底栏主按钮**真的开跑阶段一**。
     */
    stages: {
      titleKey: 'flow.stages.title',
      subtitle: staticText('flow.stages.subtitle'),
      capsule: (project, t) => t('flow.stages.capsule', { count: RF.STAGES.length }),
      footerLabel: staticText('flow.stages.footerLabel'),
      footerValue: staticText('flow.stages.footerValue'),
      footerAction: () => ({
        key: 'flow.stages.action',
        kind: 'tool',
        tool: RF.TOOL_IDS.runStage,
        params: { stage: 'llm' },
      }),
    },

    /**
     * 16 降级与失败：胶囊是**真实缺失项数**，底栏指向「回到工作台」。
     */
    degraded: {
      titleKey: 'flow.degrade.title',
      subtitle: staticText('flow.degrade.subtitle'),
      capsule: (project, t, context) => t('flow.degrade.capsule', {
        count: Array.isArray(context?.probe?.view?.degrade?.matrix)
          ? context.probe.view.degrade.matrix.length
          : 0,
      }),
      footerLabel: staticText('flow.degrade.footerLabel'),
      footerValue: staticText('flow.degrade.footerValue'),
      footerAction: () => ({ key: 'flow.degrade.action', kind: 'tab', tab: 'chapters' }),
    },
  };

  /**
   * 取某屏的外壳描述（找不到就回落到工作台基准板）。
   *
   * @param {string} tabId - 页签 id。
   * @returns {TabChrome} 外壳描述。
   */
  RF.tabChrome = function tabChrome(tabId) {
    return RF.TAB_CHROME[tabId] ?? RF.TAB_CHROME.chapters;
  };
})(RF);

/* ── src/client/workbench/styles.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台样式（只用 `--dsw-alias-*` 主题 token，不写十六进制字面量）。
 *
 * 骨架四层：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 * 右栏 Tab 容器是 `overflow:hidden` —— 不自建滚动容器，内容超高时底栏会被裁掉且滚不到（R7）。
 *
 * 状态色只用令牌色；禁用态用**实色**令牌，不用 `opacity` 表达层级。
 *
 * ## 颜色：设计令牌 → 宿主 token 的映射（差距表 §4.17 第 1 条）
 *
 * 设计稿板 17 给的是**一套深色**的 17 个令牌；宿主有明暗两套主题，
 * 所以每个设计令牌都落到一个 `--dsw-alias-*` 上 —— 跟着宿主明暗自动切，
 * 插件**不写十六进制字面量**（设计方案 §4.3 / 硬规则 R6 / 验收项 A7）。
 *
 * ⚠️ 强调色这一支是宿主的 **accent**，**不是** `brand-primary`。
 * 宿主自己的 `packages/client/ui-dockkit/src/components/dockkit.module.css:10` 写着：
 * 「Emphasis … takes the platform's accent
 *  (`--dsw-alias-brand-primary-new-colorprimary-new-color`), not
 *  `--dsw-alias-brand-primary`, which this platform binds to its near-black」
 * —— `brand-primary` 在本平台是**近黑（浅色主题）/ 近白（暗色主题）**，
 * 拿它当强调色 = 整个工作台没有颜色（owner 实机反馈「UI 颜色都没有改变」）。
 * 设计稿板 01 / 06 的当前步点、选中卡描边、主按钮、开关、进度条全是那支蓝。
 *
 * ### 17 个设计令牌 → 宿主 token（板 17 号板）
 *
 * 设计稿给的是**一套深色**色板；宿主有明暗两套主题，下表的「浅/暗」是宿主
 * 两套主题下该 token 的实际取值（宿主主题源：
 * packages/client/ui-theme/src/styles/design-platform.css）。
 *
 * | 设计令牌 | hex | 宿主 token | 浅色 | 暗色 | 用在哪 |
 * | --- | --- | --- | --- | --- | --- |
 * | BG | #0B0E14 | --dsw-alias-bg-base | #FFFFFF | #151517 | 面板底 |
 * | SURFACE | #171A20 | --dsw-alias-bg-layer-1 | #FFFFFF | #232324 | 卡面 |
 * | SURFACE-2 | #12151B | --dsw-alias-bg-layer-2 | #FFFFFF | #2C2C2E | StageBar / 页签条 |
 * | SURFACE-3 | #1F2127 | --dsw-alias-bg-layer-3 | #FFFFFF | #353638 | 胶囊 / 输入底 |
 * | LINE | #23262B | --dsw-alias-border-l2 | rgba(0,0,0,.1) | rgba(255,255,255,.12) | 常规边框 |
 * | LINE-2 | #2D3035 | --dsw-alias-border-l3 | rgba(0,0,0,.12) | rgba(255,255,255,.16) | 强边框 |
 * | TEXT-1 | #F2F5F9 | --dsw-alias-label-primary | #0F1115 | #F9FAFB | 主文字 |
 * | TEXT-2 | #8A93A5 | --dsw-alias-label-secondary | #61666B | #CFD3D6 | 次文字 |
 * | TEXT-3 | #5B6472 | --dsw-alias-label-tertiary | #81858C | #ADB2B8 | 三级文字 |
 * | ACCENT | #4C8DFF | --dsw-alias-brand-primary-new-colorprimary-new-color | #4176E6 | #5686FE | 强调色：当前步点 / 选中描边 / 主按钮 / 开关 / 进度条 / logo |
 * | ACCENT-DIM | #16203A | color-mix(accent 14%, transparent) | 淡蓝 | #32394B | 选中态胶囊底（板 01 当前步 chip） |
 * | OK | #3FB950 | --dsw-alias-state-success-primary | #22C55E | #22C55E | 完成 |
 * | WARN | #D29922 | --dsw-alias-state-warn-label | #DD8629 | #DD8629 | 警告 |
 * | WARN-SURF | #2A2214 | color-mix(state-warn-label 10%, bg-layer-1) | #FCF3EA | #362D25 | 警告面（板 06 显存条 / 板 16 降级详情卡描边） |
 * | ERROR | #F85149 | --dsw-alias-state-error-primary | #EC1313 | #F25A5A | 错误 |
 * | ERROR-SURF | #2A1618 | color-mix(state-error-primary 10%, bg-layer-1) | #FDE7E7 | #382929 | 错误面（板 04 结论卡） |
 * | WHITE | #FFFFFF | --dsw-alias-toast-label | #FFFFFF | #FFFFFF | 强调色上的标记 |
 *
 * ⚠️ 两处**故意**不用最接近的宿主 token：
 *   1. ACCENT 用 `brand-primary-new-colorprimary-new-color` 而不是别的蓝 ——
 *      宿主自己在 dockkit / trajectory / settings 里就用它当强调色，语义一致。
 *   2. WHITE 用 `toast-label` 而不是 `label-primary-foreground` ——
 *      后者会随主题反转（暗色主题变近黑），蓝底近黑字读不清；宿主自己的
 *      做法也是「蓝底上的箭头保持白色」（InputBar.module.css:384）。
 *
 * 底色与中性色**跟随宿主主题**：宿主切暗色时面板与设计稿几乎 1:1
 * （BG #151517 vs #0B0E14、SURFACE #232324 vs #171A20、TEXT-1 #F9FAFB vs #F2F5F9）；
 * 浅色主题下宿主把 layer-1/2/3 全压成纯白，面板没有表面层次 —— 那是宿主
 * 浅色主题本身的取法，插件不另立一套（§4.3 / R6）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.STYLES = `
.rf-root {
  /* ── 插件级语义色层：设计令牌 → 宿主 token ────────────────────────────
   * 下面每个 --rf-* 都是**一个设计令牌**，值全部由宿主 token 派生。 */
  /* 强调色 = 设计稿 ACCENT（hex 见文件头的映射表）：宿主 accent 那一支。 */
  --rf-accent: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  /* 强调色的暗面 = 设计稿 ACCENT-DIM：选中态胶囊底（板 01 号板当前步 chip）。
     用 color-mix 而不是写死色值 —— 跟着宿主主题自动深浅。 */
  --rf-accent-dim: color-mix(in srgb, var(--rf-accent) 14%, transparent);
  /* 强调色上的标记（主按钮文字 / 面板头 ▶ 三角）：**两套主题都是白**。
     取 --dsw-alias-toast-label（明暗两套都是 neutral-bluish-00 = 白）——
     label-primary-foreground 会随主题反转（暗色主题变近黑），蓝底近黑字读不清；
     宿主自己的做法也是「蓝底上的箭头保持白色」
     （ui-conversation/src/client/skeleton/InputBar.module.css:384）。 */
  --rf-on-accent: var(--dsw-alias-toast-label);
  /* 强调色的 hover：浅色主题压深、暗色主题提亮（靠 label-primary 的明暗差）。 */
  --rf-accent-hover: color-mix(in srgb, var(--rf-accent) 86%, var(--dsw-alias-label-primary));

  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
}
.rf-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
/* 面板头 logo = 蓝底 + 白色 ▶（设计稿板 01 号板）。 */
.rf-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--rf-accent);
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* ▶ 用纯 CSS 三角（border 技巧）—— 不引图片、不写死颜色。 */
.rf-header__logo::after {
  content: '';
  width: 0;
  height: 0;
  border-left: 9px solid var(--rf-on-accent);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}
/* 流程屏里，面板头 logo 是「回到工作台」的出口。 */
.rf-header__logo--button {
  border: 0;
  padding: 0;
  cursor: pointer;
}
.rf-header__text { min-width: 0; flex: 1 1 auto; }
.rf-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.rf-header__subtitle {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.rf-header__status {
  flex: 0 0 auto;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rf-stagebar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow-x: auto;
}
.rf-stagebar__step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  /* StageBar 的步点是**可点**的（点哪一步到那一屏）—— 按钮态要复位，
     底色与文字色交给 current / passed / upcoming 三个修饰类。 */
  border: 0;
  background: transparent;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
}
/* 当前步的胶囊底 = 设计稿 ACCENT-DIM（板 01 号板）。 */
.rf-stagebar__step--current {
  background: var(--rf-accent-dim);
  color: var(--dsw-alias-label-primary);
}
.rf-stagebar__step--passed { color: var(--dsw-alias-label-secondary); }
.rf-stagebar__step--upcoming { color: var(--dsw-alias-label-caption); }
.rf-stagebar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
}
/* 当前步点 = 设计稿 ACCENT（板 01 号板）。 */
.rf-stagebar__dot--current { background: var(--rf-accent); }
.rf-stagebar__dot--passed { background: var(--dsw-alias-state-success-primary); }
.rf-stagebar__dot--upcoming { background: var(--dsw-alias-state-idle-primary); }
.rf-stagebar__count {
  margin-left: auto;
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
}
.rf-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 4px;
  padding: 8px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow-x: auto;
}
.rf-tabs__item {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.rf-tabs__item--active {
  border-color: var(--rf-accent);
  background: var(--rf-accent-dim);
  color: var(--dsw-alias-label-primary);
}
.rf-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
}
.rf-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-1);
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.rf-footer__text { min-width: 0; flex: 1 1 auto; }
.rf-footer__label {
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
  /* 成本位是单行数据，不能被挤成两行 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-footer__value {
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  /* 副标题在窄栏里单行截断（header 里还有一份全文），不要折成三行把底栏撑高 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
.rf-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.rf-section {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  margin: 4px 0 8px;
}
.rf-card {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 12px;
  margin-bottom: 12px;
}
/* 选中态描边 = 设计稿 ACCENT（板 03 / 05 / 06 号板）。
   ⚠️ **不染底**：设计稿三块板的选中卡，填充色与没选中一样（同一个 SURFACE 色），
   只有描边换成 ACCENT（06 号板另加左侧 4px 条）—— 染底是多加的，不是设计稿。 */
.rf-card--selected {
  border-color: var(--rf-accent);
}
/* 板 06 号板：阶段卡选中态 = 蓝描边 **+ 左侧 4px 蓝条**。 */
.rf-card--accent { border-left: 4px solid var(--rf-accent); }
/* 状态面（画板 17 号板的 WARN-SURF / ERROR-SURF 两个令牌）：
   面 = 状态色薄薄一层压在卡面色上，描边 = 状态色本身。
   画板 06 号板「显存门槛提示条」黄面 / 画板 04 号板「结论卡」红面。 */
.rf-card--warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-label) 10%, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-alias-state-warn-label);
}
.rf-card--error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-alias-state-error-primary);
}
/* 画板 16 号板「一次真实降级」卡：普通面 + 黄描边。 */
.rf-card--warn-border { border-color: var(--dsw-alias-state-warn-label); }
.rf-card--disabled { border-color: var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-caption); }
.rf-btn {
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  padding: 6px 12px;
  /* 按钮文字不许被 flex 压扁折行（窄栏下会变成「成／片」两行） */
  white-space: nowrap;
  flex: 0 0 auto;
  font-size: 12px;
  cursor: pointer;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
}
/* 主按钮 = 设计稿 ACCENT 蓝底 + 白字（板 01 / 03 / 05 / 06 号板的 Footer 主按钮）。 */
.rf-btn--primary { background: var(--rf-accent); border-color: var(--rf-accent); color: var(--rf-on-accent); }
.rf-btn--primary:hover { background: var(--rf-accent-hover); border-color: var(--rf-accent-hover); }
.rf-btn--secondary { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); }
.rf-btn--danger { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }
.rf-btn--disabled { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l1); color: var(--dsw-alias-label-caption); cursor: not-allowed; }
/* ⚠️ 禁用态的优先级必须压过 :hover —— 否则禁用的主按钮一悬停就变蓝，
     看起来像可点的。.rf-btn--primary:hover 的特异性 (0,2,0) 高于
     .rf-btn--disabled 的 (0,1,0)，所以禁用态要把 :hover 一起写。 */
.rf-btn--disabled:hover,
.rf-btn--disabled:focus { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l1); }
.rf-field { display: inline-flex; flex-direction: column; gap: 4px; }
.rf-field__label { font-size: 10px; color: var(--dsw-alias-label-caption); }
.rf-input {
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  padding: 6px 8px;
  font-size: 12px;
}
.rf-input--focus { border-color: var(--rf-accent); }
.rf-input--error { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
/* 多行正文（板 02 的「小说正文」输入）。 */
.rf-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}
.rf-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
}
/* 进行中 = 设计稿「生成中 6/8」：ACCENT-DIM 底 + ACCENT 字（板 01 号板）。 */
.rf-pill--running { background: var(--rf-accent-dim); color: var(--rf-accent); }
.rf-pill--done { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-success-primary); }
.rf-pill--failed { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-error-primary); }
.rf-pill--queued { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-caption); }
/* 降级但仍交付（板 16 号板降级矩阵的黄色格）：
   板 15 的胶囊只列了 4 态，「降级」是跨流程规范板 16 追加的第 5 种语义。 */
.rf-pill--warn { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-warn-label); }
/* 进度条填充 = 设计稿 ACCENT（板 01 号板，运行中）。 */
.rf-progress { position: relative; height: 8px; border-radius: 4px; background: var(--dsw-alias-bg-layer-3); overflow: hidden; }
.rf-progress__fill { height: 100%; background: var(--rf-accent); }
.rf-progress--done .rf-progress__fill { background: var(--dsw-alias-state-success-primary); }
.rf-progress--failed .rf-progress__fill { background: var(--dsw-alias-state-error-primary); }
.rf-progress__label { position: absolute; inset: 0; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.rf-empty { border: 1px dashed var(--dsw-alias-border-l3); border-radius: 8px; padding: 16px; text-align: center; }
.rf-empty--error { border-color: var(--dsw-alias-state-error-primary); }
.rf-empty__title { font-size: 12px; color: var(--dsw-alias-label-primary); }
.rf-empty__hint { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 4px; }
.rf-toast { display: flex; gap: 8px; align-items: center; border-radius: 8px; padding: 8px 12px; font-size: 12px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); }
.rf-toast--warning { color: var(--dsw-alias-state-warn-label); }
.rf-toast--error { color: var(--dsw-alias-state-error-primary); }
.rf-toast__close { border: 0; background: transparent; color: inherit; cursor: pointer; }
.rf-meta { display: flex; gap: 8px; font-size: 11px; padding: 2px 0; }
.rf-meta__key { color: var(--dsw-alias-label-caption); flex: 0 0 auto; }
.rf-meta__value { color: var(--dsw-alias-label-secondary); min-width: 0; }
.rf-row { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rf-row:last-child { border-bottom: 0; }
.rf-row__main { flex: 1 1 auto; min-width: 0; }
.rf-row__title { font-size: 12px; color: var(--dsw-alias-label-primary); }
.rf-row__sub { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
/* 降级矩阵（板 16 号板）：缺失项 + 3 列产出形态。
   第一列吃掉剩余宽度，三列按内容宽度 —— 窄栏（300px）也不破版。 */
.rf-matrix { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rf-matrix:last-child { border-bottom: 0; }
.rf-matrix__head { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rf-note { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 8px; }
.rf-note--warn { color: var(--dsw-alias-state-warn-label); }
.rf-note--error { color: var(--dsw-alias-state-error-primary); }
.rf-captured {
  border: 1px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--rf-accent);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.rf-captured__label {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  margin-bottom: 4px;
}
.rf-captured__text {
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rf-captured__text--empty { color: var(--dsw-alias-label-caption); }
.rf-chatrow { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 12px; margin-bottom: 8px; background: var(--dsw-alias-bg-layer-1); }
.rf-chatrow__head { display: flex; gap: 8px; align-items: center; }
.rf-chatrow__kind { font-size: 10px; color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-3); border-radius: 4px; padding: 2px 6px; }
.rf-chatrow__title { font-size: 11px; color: var(--dsw-alias-label-primary); }
.rf-chatrow__body { margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rf-chatrow__toggle { border: 0; background: transparent; color: var(--rf-accent); font-size: 11px; cursor: pointer; }
.rf-player { display: flex; gap: 12px; }
.rf-player__frame { width: 240px; aspect-ratio: 9 / 16; border-radius: 10px; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); }
.rf-player__video { object-fit: contain; display: block; }
.rf-player__side { flex: 1 1 auto; min-width: 0; }
.rf-switch { display: inline-flex; width: 44px; height: 20px; border-radius: 10px; background: var(--dsw-alias-state-idle-primary); border: 0; }
/* 开关打开 = 设计稿 ACCENT 胶囊（板 10 号板）。 */
.rf-switch--on { background: var(--rf-accent); }
`;
})(RF);

/* ── src/client/workbench/tabs.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 7 个页签（Tab **内部**的二级分区，segmented control —— 不是开 7 个宿主 Tab）。
 *
 * 每页都有空态，文案说清「为什么空 + 下一步做什么」。
 * 业务数据只从宿主投影读（R1）；组件里的 `useState` 只放交互态。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 空态（统一口径：说清为什么空 + 下一步做什么）。
   * @param {{ t: function, key: string }} props - 属性。
   * @returns {object} React 元素。
   */
  function emptyOf(props) {
    return h(RF.ui.EmptyState, {
      title: props.t(`empty.${props.key}`),
      hint: props.t('empty.hint'),
    });
  }

  /**
   * 降级入口卡（设计稿 16 号板的入口）。
   *
   * ## 为什么它不能挂在「有交付物」分支里
   *
   * 降级矩阵是**跨流程规范板**，入口在成片页（交付物最常被降级影响）。
   *
   * ⚠️ 但它**必须**在成片页的空态下**也**渲染 ——
   * 降级恰恰是「**没出成片**」的时候最该看的（设计稿 16 号板：「缺什么就说清楚，
   * 不假装成功」）。早期版本把它放在 `tabOutput` 的末尾，而空态早退
   * （`deliverables.length === 0`）会把它整块跳过 ⇒
   * **最需要降级说明的场景，恰恰看不到降级说明的入口**（实机抓到）。
   *
   * @param {{ t: function, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  function degradeEntryCard(props) {
    return h(RF.ui.Card, null,
      h('div', { className: `${RF.CLS}-row__title` }, props.t('flow.degrade.title')),
      h('div', { className: `${RF.CLS}-row__sub` }, props.t('flow.degrade.subtitle')),
      h(RF.ui.Button, {
        label: props.t('flow.degrade.action'),
        variant: 'secondary',
        onClick: () => props.state.goFlow('degraded'),
      }));
  }

  /**
   * 章节页：章节列表 + 每章四阶段勾选 + 依赖提示。
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabChapters = function tabChapters(props) {
    const chapters = Array.isArray(props.project.chapters) ? props.project.chapters : [];
    if (chapters.length === 0) return emptyOf({ t: props.t, key: 'chapters' });
    return h('div', null,
      h(RF.ui.SectionLabel, null, props.t('tab.chapters')),
      chapters.map(chapter => h(RF.ui.Card, { key: chapter.id ?? chapter.title, state: 'default' },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} ${props.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
          h(RF.ui.Pill, { label: RF.labelOf('chapter.status', chapter.status, props.t), tone: chapter.status ?? 'queued' })),
        h('div', { className: `${RF.CLS}-row` }, RF.STAGES.map(stage => h(RF.ui.Pill, {
          key: stage,
          label: props.t(`stages.${stage}`),
          tone: (chapter.stages ?? []).includes(stage) ? 'done' : 'queued',
        }))))),
      h('div', { className: `${RF.CLS}-note` }, props.t('hardDependency')),
      h('div', { className: `${RF.CLS}-note` }, props.t('softDependency')),
      h('div', { className: `${RF.CLS}-note` }, props.t('chapter.unit')));
  };

  /**
   * 分镜页：逐镜卡片 + 选中镜详情（时长量化三选一 / 参考标签 / 装配顺序）。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabShots = function tabShots(props) {
    const shots = Array.isArray(props.project.shots) ? props.project.shots : [];
    if (shots.length === 0) return emptyOf({ t: props.t, key: 'shots' });
    const selected = shots.find(shot => shot.id === props.state.selectedShotId) ?? shots[0];
    const quantize = Array.isArray(selected.quantized) ? selected.quantized : [];
    return h('div', null,
      h(RF.ui.SectionLabel, null, props.t('tab.shots')),
      shots.map(shot => h(RF.ui.Card, {
        key: shot.id,
        state: shot.id === selected.id ? 'selected' : 'default',
        onClick: () => props.state.selectShot(shot.id),
      },
        h('div', { className: `${RF.CLS}-row__title` }, shot.label ?? shot.id),
        h('div', { className: `${RF.CLS}-row__sub` }, `${shot.shotSize ?? ''} · ${RF.formatDuration(shot.duration ?? 0)} · ${shot.aspectRatio ?? ''}`))),
      h(RF.ui.SectionLabel, null, props.t('shots.quantize')),
      h('div', { className: `${RF.CLS}-row` }, quantize.map(value => h(RF.ui.Button, {
        key: value,
        label: RF.formatDuration(value),
        variant: value === selected.duration ? 'primary' : 'secondary',
        // 把「选中的是哪一镜」一起传出去：改时长要发 `seq` + `idx`（工具必填）。
        onClick: () => props.state.setDuration(selected, value),
      }))),
      h(RF.ui.SectionLabel, null, props.t('shots.refs')),
      h('div', null, (selected.references ?? []).map(reference => h(RF.ui.MetaRow, {
        key: reference.tag,
        label: reference.tag,
        value: reference.label,
      }))),
      h('div', { className: `${RF.CLS}-note` }, props.t('shots.assembly')));
  };

  /**
   * 资产页：10 类筛选 + 网格 + 变体挂载说明。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabAssets = function tabAssets(props) {
    const assets = Array.isArray(props.project.assets) ? props.project.assets : [];
    const filter = props.state.assetCategory;
    const visible = filter === 'all' ? assets : assets.filter(asset => asset.category === filter);
    const grid = assets.length === 0
      ? emptyOf({ t: props.t, key: 'assets' })
      : h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        visible.map(asset => h(RF.ui.Card, { key: asset.id },
          h('div', { className: `${RF.CLS}-row__title` }, asset.name ?? ''),
          h('div', { className: `${RF.CLS}-row__sub` }, asset.description ?? ''),
          asset.parent_id === undefined ? null : h(RF.ui.Pill, { label: asset.parent_id, tone: 'running' }))));
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, ['all'].concat(RF.ASSET_CATEGORIES).map(category => h('button', {
        key: category,
        type: 'button',
        className: `${RF.CLS}-tabs__item${category === filter ? ` ${RF.CLS}-tabs__item--active` : ''}`,
        onClick: () => props.state.setAssetCategory(category),
      }, category === 'all' ? props.t('tab.assets') : RF.labelOf('asset.category', category, props.t)))),
      grid,
      h('div', { className: `${RF.CLS}-note` }, props.t('assets.variants')),
      h('div', { className: `${RF.CLS}-note` }, props.t('assets.priority')));
  };

  /**
   * 上下文页：三栏 bible / style / continuity，**写入语义不同**。
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  /**
   * 工作流解析结果 + diagnostics（§8.3 · T5 A27）。
   * @param {{ t: function, analysis: object | null }} props
   * @returns {object | null}
   */
  RF.renderWorkflowAnalysis = function renderWorkflowAnalysis(props) {
    const analysis = props.analysis;
    if (analysis === null || analysis === undefined || typeof analysis !== 'object') return null;
    const diag = analysis.diagnostics ?? {};
    const rows = [
      ['loaders', diag.loaders],
      ['modelLoaders', diag.modelLoaders],
      ['saves', diag.saves],
      ['samplers', diag.samplers],
      ['sizeNodes', diag.sizeNodes],
      ['textCandidates', diag.textCandidates],
    ];
    return h(RF.ui.Card, null,
      h(RF.ui.SectionLabel, null, props.t('workflow.diagnostics')),
      h('div', { className: `${RF.CLS}-row__title` }, `${analysis.kind ?? ''} · ${analysis.name ?? analysis.id ?? ''}`),
      h('div', { className: `${RF.CLS}-row__sub` }, analysis.sourceFile ?? ''),
      rows.map(([key, entries]) => h(RF.ui.MetaRow, {
        key,
        label: props.t(`workflow.${key}`),
        value: String(Array.isArray(entries) ? entries.length : 0),
      })),
      h(RF.ui.MetaRow, {
        label: props.t('workflow.hasVideoFields'),
        value: diag.hasVideoFields ? 'true' : 'false',
      }),
      Array.isArray(analysis.outputs) && analysis.outputs.length
        ? h('div', { className: `${RF.CLS}-note` }, analysis.outputs.join(' · '))
        : null);
  };

  RF.tabContext = function tabContext(props) {
    const context = props.project.context ?? {};
    const keys = RF.CONTEXT_KEYS;
    const empty = keys.every(key => String(context[key] ?? '').trim() === '');
    const workflowBlock = RF.renderWorkflowAnalysis({
      t: props.t,
      analysis: props.project.workflowAnalysis,
    });
    return h('div', null,
      workflowBlock,
      empty && workflowBlock === null ? emptyOf({ t: props.t, key: 'context' }) : null,
      keys.map(key => h(RF.ui.Card, { key },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, RF.labelOf('context.section', key, props.t)),
            h('div', { className: `${RF.CLS}-row__sub` }, String(context[key] ?? '').slice(0, 240))),
          h(RF.ui.Pill, {
            label: props.t(RF.CONTEXT_WRITE_MODE[key] === 'append' ? 'context.append' : 'context.overwrite'),
            tone: RF.CONTEXT_WRITE_MODE[key] === 'append' ? 'running' : 'queued',
          })))),
      h('div', { className: `${RF.CLS}-note` }, props.t('context.keys')));
  };

  /**
   * 技能页：来源筛选 + 列表 + 正文预览 + 参考文件索引。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabSkills = function tabSkills(props) {
    const skills = Array.isArray(props.project.skills) ? props.project.skills : [];
    const source = props.state.skillSource;
    const visible = source === 'all' ? skills : skills.filter(skill => skill.source === source);
    const selected = skills.find(skill => skill.name === props.state.selectedSkillName);
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, ['all'].concat(RF.SKILL_SOURCES).map(item => h('button', {
        key: item,
        type: 'button',
        className: `${RF.CLS}-tabs__item${item === source ? ` ${RF.CLS}-tabs__item--active` : ''}`,
        onClick: () => props.state.setSkillSource(item),
      }, item === 'all' ? props.t('tab.skills') : props.t(`skills.${item}`)))),
      skills.length === 0 ? emptyOf({ t: props.t, key: 'skills' }) : visible.map(skill => h(RF.ui.Card, {
        key: skill.name,
        state: skill.name === props.state.selectedSkillName ? 'selected' : 'default',
        onClick: () => props.state.selectSkill(skill.name),
      },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, skill.name ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, skill.description ?? '')),
          h(RF.ui.Pill, { label: props.t(`skills.${skill.source ?? 'bundled'}`), tone: 'running' })),
        // 右侧「3.4 KB · 2026-10-22」（设计稿 12 号板）：体积 + 最近修改日期。
        h('div', { className: `${RF.CLS}-row__sub` }, skillMeta(skill)),
        String(skill.description ?? '').trim() === ''
          ? h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, props.t('skills.emptyDescription'))
          : null)),
      selected === undefined ? null : h(RF.ui.Card, null,
        // 卡片标题是「正文预览 · {技能名}」（设计稿 12 号板），不是「技能 · {技能名}」。
        h(RF.ui.SectionLabel, null, `${props.t('skills.previewTitle')} · ${selected.name}`),
        // 正文**预览**（宿主只送预览，不送整篇正文）。
        h('div', { className: `${RF.CLS}-row__sub` }, String(selected.bodyPreview ?? '').slice(0, 400)),
        (selected.references ?? []).map(reference => h(RF.ui.MetaRow, {
          key: reference.file ?? '',
          label: reference.file ?? '',
          value: reference.preview ?? '',
        }))),
      h('div', { className: `${RF.CLS}-note` }, props.t('skills.notDistributed')));
  };

  /**
   * 技能行的「体积 · 日期」副行（设计稿 12 号板）。
   *
   * 两样都没有就返回空串 —— 不拼一个假的「0 B」出来。
   *
   * @param {object} skill 技能视图。
   * @returns {string} 文本。
   */
  function skillMeta(skill) {
    const parts = [];
    if (Number(skill?.bytes) > 0) parts.push(RF.formatBytes(skill.bytes));
    const date = RF.formatDate(skill?.updatedAt ?? '');
    if (date !== '') parts.push(date);
    return parts.join(' · ');
  }

  /**
   * 成片页：播放器（章节刻度 / 倍速 / 字幕音轨开关）+ 交付物下载。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabOutput = function tabOutput(props) {
    const deliverables = Array.isArray(props.project.deliverables) ? props.project.deliverables : [];
    // 空态**也要**给降级入口（见 {@link degradeEntryCard} 的说明）。
    if (deliverables.length === 0) {
      return h('div', null,
        emptyOf({ t: props.t, key: 'output' }),
        degradeEntryCard(props));
    }
    const primaryVideo = deliverables.find(item => item.kind === 'video_clean' || item.kind === 'video_subtitled' || (typeof item.path === 'string' && item.path.endsWith('.mp4')));
    const videoSrc = primaryVideo?.path ? RF.deliverableUrl(primaryVideo.path) : '';
    return h('div', null,
      h('div', { className: `${RF.CLS}-player` },
        videoSrc === ''
          ? h('div', { className: `${RF.CLS}-player__frame` })
          : h('video', {
            className: `${RF.CLS}-player__frame ${RF.CLS}-player__video`,
            controls: true,
            preload: 'metadata',
            src: videoSrc,
          }),
        h('div', { className: `${RF.CLS}-player__side` },
          h(RF.ui.SectionLabel, null, props.t('output.chapters')),
          (props.project.chapters ?? []).map(chapter => h(RF.ui.Progress, {
            key: chapter.id,
            value: chapter.progress ?? 0,
            tone: chapter.progress >= 1 ? 'done' : 'running',
            label: chapter.title,
          })),
          h('div', { className: `${RF.CLS}-row__sub` }, props.t('output.speed', { rate: props.state.speed })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.subtitles')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.subtitles ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.subtitles ? 'true' : 'false',
              onClick: () => props.state.toggle('subtitles'),
            })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.voice')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.voice ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.voice ? 'true' : 'false',
              onClick: () => props.state.toggle('voice'),
            })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.bgm')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.bgm ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.bgm ? 'true' : 'false',
              onClick: () => props.state.toggle('bgm'),
            })))),
      h(RF.ui.SectionLabel, null, props.t('tab.output')),
      // 交付物清单带锚点：底栏「交付物」按钮滚到这里（设计稿 10 号板的主按钮）。
      h('div', { id: 'rf-deliverables' },
        deliverables.map(item => h(RF.ui.Card, { key: `${item.chapterId ?? ''}-${item.kind}` },
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, item.label ?? item.kind),
              h('div', { className: `${RF.CLS}-row__sub` }, RF.formatBytes(item.bytes ?? 0))),
            item.path
              ? h('a', {
                className: `${RF.CLS}-btn ${RF.CLS}-btn--secondary`,
                href: RF.deliverableUrl(item.path),
                download: item.label ?? item.kind,
              }, props.t('common.download'))
              : h(RF.ui.Button, { label: props.t('common.download'), variant: 'secondary' }))))),
      h('div', { className: `${RF.CLS}-note` }, props.t('deliver.binaryKept')),
      // ── 降级入口（板 16 号板）──
      // 降级矩阵是**跨流程规范板**，不该占一个页签；它的入口就在成片页
      // （交付物最常被降级影响），底栏按钮就是设计稿 16 号板写的那句「查看降级说明」。
      degradeEntryCard(props));
  };

  /**
   * 日志页：变更日志 + 三级回滚 + 漂移保护。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabLog = function tabLog(props) {
    const changelog = props.project.changelog ?? { entries: [], modes: ['single', 'batch', 'timepoint'] };
    const entries = Array.isArray(changelog.entries) ? changelog.entries : [];
    const modes = Array.isArray(changelog.modes) ? changelog.modes : ['single', 'batch', 'timepoint'];
    if (entries.length === 0) return emptyOf({ t: props.t, key: 'log' });
    const drifted = entries.find(entry => entry.drifted === true);
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, modes.map(mode => h(RF.ui.Button, {
        key: mode,
        label: props.t(`log.${mode}`),
        variant: mode === props.state.rollbackMode ? 'primary' : 'secondary',
        onClick: () => props.state.setRollbackMode(mode),
      }))),
      entries.map(entry => {
        // ⚠️ 项目层的「新建 / 删除」**永不可回滚**（宿主硬约束：没有删除项目的 API，
        // 回滚项目创建等于变相创建项目 ⇒ 403 拒绝）。
        // 以前这里照样挂一个可点的「回滚」⇒ 点了必然失败，用户只看到「什么都没发生」。
        // 现在禁用 + 说清缺什么。
        const locked = entry.layer === 'project' && (entry.op === 'create' || entry.op === 'delete');
        return h(RF.ui.Card, { key: entry.id },
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__sub` }, RF.formatDateTime(entry.at ?? '')),
              h('div', { className: `${RF.CLS}-row__title` }, entry.summary ?? ''),
              // 字段 + 批次（设计稿 13 号板：行内标签含「批次 batch_7f3a」）。
              h('div', { className: `${RF.CLS}-row__sub` },
                [entry.field ?? '', entry.batchId ?? ''].filter(Boolean).join(' · ')),
              locked
                ? h('div', { className: `${RF.CLS}-row__sub ${RF.CLS}-note--warn` }, props.t('log.projectLocked'))
                : null),
            h(RF.ui.Button, {
              label: props.t('common.rollback'),
              variant: 'secondary',
              disabled: locked,
              title: locked ? props.t('log.projectLocked') : undefined,
              onClick: () => props.state.rollback(entry),
            })));
      }),
      drifted === undefined ? null : h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, props.t('log.drifted')),
        h(RF.ui.Button, { label: props.t('log.force'), variant: 'danger', onClick: () => props.state.rollback(drifted, true) })),
      h('div', { className: `${RF.CLS}-note` }, props.t('deliver.binaryKept')));
  };
})(RF);

/* ── src/client/workbench/flow.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）。
 *
 * ## 为什么是「独立屏」而不是页签
 *
 * 设计稿 17 号板自己写明：右栏工作台是 **7 个页签**（章节 / 分镜 / 资产 / 上下文 /
 * 技能 / 成片 / 日志）—— 那是**项目视图**。
 * 板 02–06 的公共骨架只有 4 条（Header / StageBar / Scroll / Footer），**没有页签条**，
 * 它们按用户操作流程串成一条链：导入 → 运行位置 → 设备检查 → 执行路径 → 执行阶段。
 * 板 16 是跨流程规范板（降级矩阵）。
 *
 * ⇒ **两层并存**：项目视图（7 页签）+ 流程屏（这 6 块）。13 个页签在 326–547px 的右栏放不下。
 *
 * ## 三条纪律
 *
 * 1. **没有写入口的控件一律禁用 + 说清缺什么** —— 不许留「点了没反应」的按钮。
 * 2. **不编数据**：没有的字段显示「未接入 / 未设置」，不拿样例值冒充真实值。
 * 3. 业务数据只从宿主投影读（R1）；组件里的 `useState` 只放交互态。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 设备检查的 9 行（设计稿 04 号板的行序）。
   *
   * 「GPU」不是独立探测项 —— 型号是 `vram` 探测的副产品（`nvidia-smi` 一次问两件事），
   * 所以那一行从 `vram` 的 `gpuName` 取。
   *
   * @typedef {object} DeviceRow
   * @property {string} id 探测项 id（`gpu` 是从 `vram` 派生的行）。
   * @property {string} labelKey 行名词条。
   * @property {string} methodKey 探测方式词条。
   * @property {function} extra 补充值（由探测项算出）。
   */

  /** @type {DeviceRow[]} */
  var DEVICE_ROWS = [
    {
      id: 'comfy',
      labelKey: 'flow.device.row.comfy',
      methodKey: 'flow.device.method.comfy',
      extra: function (item) { return String(item?.value ?? ''); },
    },
    {
      id: 'ckVersion',
      labelKey: 'flow.device.row.ckVersion',
      methodKey: 'flow.device.method.ckVersion',
      extra: function () { return '≥ 0.2.36'; },
    },
    {
      id: 'vram',
      labelKey: 'flow.device.row.vram',
      methodKey: 'flow.device.method.vram',
      extra: function () { return '门槛 8 GB'; },
    },
    {
      id: 'gpu',
      labelKey: 'flow.device.row.gpu',
      methodKey: 'flow.device.method.gpu',
      extra: function (item) { return String(item?.source ?? ''); },
    },
    {
      id: 'ffmpeg',
      labelKey: 'flow.device.row.ffmpeg',
      methodKey: 'flow.device.method.ffmpeg',
      extra: function () { return '在 PATH'; },
    },
    {
      id: 'encoders',
      labelKey: 'flow.device.row.encoders',
      methodKey: 'flow.device.method.encoders',
      extra: function (item) {
        const list = Array.isArray(item?.value) ? item.value : [];
        return list.join(' / ');
      },
    },
    {
      id: 'disk',
      labelKey: 'flow.device.row.disk',
      methodKey: 'flow.device.method.disk',
      extra: function (item) {
        const value = Number(item?.value);
        return Number.isFinite(value) ? `${value} GB` : '';
      },
    },
    {
      id: 'llm',
      labelKey: 'flow.device.row.llm',
      methodKey: 'flow.device.method.llm',
      extra: function () { return '阶段一可用'; },
    },
    {
      id: 'provider',
      labelKey: 'flow.device.row.provider',
      methodKey: 'flow.device.method.provider',
      extra: function (item, view) {
        const specs = view?.specs ?? {};
        return `${specs.total ?? 0} 套 · 本地 ${specs.local ?? 0} / 云端 ${specs.cloud ?? 0}`;
      },
    },
  ];

  /**
   * 找探测项。
   * @param {object} report 探测报告。
   * @param {string} id 探测项 id。
   * @returns {object | undefined} 探测项。
   */
  function itemOf(report, id) {
    const items = Array.isArray(report?.items) ? report.items : [];
    return items.find(item => item?.id === id);
  }

  /**
   * 探测项的状态色（done / failed / queued）。
   * @param {object | undefined} item 探测项。
   * @returns {string} 色调。
   */
  function itemTone(item) {
    const status = String(item?.status ?? '');
    if (status === 'ok') return 'done';
    if (status === 'failed') return 'failed';
    if (status === 'warn') return 'queued';
    return 'queued';
  }

  /**
   * 探测结论的文案（状态点旁边的字）。
   * @param {object | undefined} item 探测项。
   * @returns {string} 结论。
   */
  function itemVerdict(item) {
    const status = String(item?.status ?? '');
    if (status === 'ok') return RF.locale?.zh?.['flow.device.ok'] ?? '已通过';
    if (status === 'warn') return String(item?.message ?? '');
    return String(item?.message ?? '');
  }

  /**
   * 02 · 小说导入与自动拆章。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowIntake = function flowIntake(props) {
    const t = props.t;
    const project = props.project ?? {};
    const intake = project.intake ?? {};
    const settings = project.settings ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const headings = Array.isArray(intake.headings) ? intake.headings : [];
    const fallbackChars = Number(intake.fallbackChars) || 0;
    const text = String(props.state.novelText ?? '');

    return h('div', null,
      // ── 来源卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.sourceLabel')),
        h(RF.ui.MetaRow, { label: t('flow.intake.chars'), value: String(intake.chars ?? 0) }),
        headings.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.intake.noHeadings'))
          : h('div', null, headings.slice(0, 5).map(heading => h('div', {
            key: `heading-${heading.seq}`,
            className: `${RF.CLS}-row`,
          },
          h('span', { className: `${RF.CLS}-row__title` }, heading.title ?? '')))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.fallbackRule', {
          count: headings.length,
          fallback: fallbackChars,
        }))),

      // ── 导入入口（正文 + 导入按钮）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.importLabel')),
        h('textarea', {
          className: `${RF.CLS}-input ${RF.CLS}-textarea`,
          value: text,
          placeholder: t('flow.intake.importPlaceholder'),
          onChange: event => props.state.setNovelText(event?.target?.value ?? ''),
        }),
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('flow.intake.importAction'),
            variant: 'primary',
            disabled: text.trim() === '',
            title: text.trim() === '' ? t('flow.intake.importDisabled') : undefined,
            onClick: () => props.state.importNovel(),
          })),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.safetyNote'))),

      // ── 自动拆章预览卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.previewLabel')),
        chapters.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.intake.previewEmpty'))
          : h('div', null, chapters.map(chapter => h('div', {
            key: chapter.id ?? chapter.title,
            className: `${RF.CLS}-row`,
          },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` },
              `${chapter.shotCount ?? 0} ${t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`))))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.previewRule'))),

      // ── 项目设置卡（只读 + 说清为什么改不了）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.settingsLabel')),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.aspectRatio'),
          value: settings.aspectRatio === '' ? t('flow.intake.unset') : settings.aspectRatio,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.resolution'),
          value: settings.resolution === '' ? t('flow.intake.unset') : settings.resolution,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.targetDuration'),
          value: settings.targetDuration === null || settings.targetDuration === undefined
            ? t('flow.intake.durationUnlimited')
            : `${settings.targetDuration}s`,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.bgm'),
          value: settings.enableBgm === true ? t('common.on') : t('common.off'),
        }),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.intake.settingsReadonly'))),

      // ── 待确认卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.pendingLabel')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.pendingEmpty'))));
  };

  /**
   * 03 · 运行位置选择。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowRunMode = function flowRunMode(props) {
    const t = props.t;
    const project = props.project ?? {};
    const plan = project.plan ?? null;
    const current = String(project.runPosition ?? '');
    const pending = String(props.state.pendingPosition ?? '');
    const provider = String(project.provider ?? '');
    const clouds = RF.CLOUD_PROVIDERS;

    const positionCard = (position, title, subtitle, pros, cons) => {
      const selected = (current !== '' ? current : pending) === position;
      return h(RF.ui.Card, {
        key: position,
        state: selected ? 'selected' : 'default',
        onClick: () => props.state.choosePosition(position),
      },
      h(RF.ui.Pill, { label: position.toUpperCase(), tone: selected ? 'running' : 'queued' }),
      h('div', { className: `${RF.CLS}-row__title` }, t(title)),
      h('div', { className: `${RF.CLS}-row__sub` }, t(subtitle)),
      h('div', null, pros.map(pro => h('div', { key: `pro-${pro}`, className: `${RF.CLS}-row__sub` },
        `· ${t(pro)}`))),
      h('div', null, cons.map(con => h('div', { key: `con-${con}`, className: `${RF.CLS}-note ${RF.CLS}-note--warn` },
        `· ${t(con)}`))),
      position === 'local'
        ? h('div', { className: `${RF.CLS}-row` }, h(RF.ui.Button, {
          label: t('flow.runmode.deviceCheck'),
          variant: 'secondary',
          onClick: event => {
            if (event?.stopPropagation) event.stopPropagation();
            props.state.goFlow('device');
          },
        }))
        : h('div', { className: `${RF.CLS}-row__sub` }, t('flow.runmode.providersAvailable', { count: clouds.length })));
    };

    return h('div', null,
      h(RF.ui.SectionLabel, null, t('flow.runmode.sectionLabel')),
      h('div', { className: `${RF.CLS}-note` }, t('flow.runmode.sectionNote')),
      h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        positionCard(
          'local',
          'flow.runmode.localTitle',
          'flow.runmode.localSubtitle',
          ['flow.runmode.local.pro1', 'flow.runmode.local.pro2', 'flow.runmode.local.pro3'],
          ['flow.runmode.local.con1', 'flow.runmode.local.con2', 'flow.runmode.local.con3'],
        ),
        positionCard(
          'cloud',
          'flow.runmode.cloudTitle',
          'flow.runmode.cloudSubtitle',
          ['flow.runmode.cloud.pro1', 'flow.runmode.cloud.pro2', 'flow.runmode.cloud.pro3'],
          ['flow.runmode.cloud.con1', 'flow.runmode.cloud.con2', 'flow.runmode.cloud.con3'],
        )),

      // ── 云端 provider 三选一（当前配置值是唯一事实源）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.runmode.providerLabel')),
        h('div', { className: `${RF.CLS}-row` }, clouds.map(item => h(RF.ui.Pill, {
          key: item,
          label: RF.labelOf('provider', item, t),
          tone: provider === item ? 'done' : 'queued',
        }))),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.runmode.providerReadonly'))),

      // ── 影响对照表四行 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.runmode.compareLabel')),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.kinds'), value: t('flow.runmode.compare.kindsValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.diff'), value: t('flow.runmode.compare.diffValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.cost'), value: t('flow.runmode.compare.costValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.limit'), value: t('flow.runmode.compare.limitValue') })),

      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.runmode.switchable'))),
      h('div', { className: `${RF.CLS}-note` }, t('flow.runmode.footerHint')));
  };

  /**
   * 04 · 本地档设备检查。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowDevice = function flowDevice(props) {
    const t = props.t;
    const probe = props.state.probe ?? null;

    if (probe === null) {
      return h('div', null, h(RF.ui.EmptyState, { title: t('flow.device.loading'), hint: t('empty.hint') }));
    }
    if (probe.error !== undefined && probe.error !== null && probe.error !== '') {
      return h('div', null, h(RF.ui.EmptyState, {
        title: t('flow.device.failed'),
        hint: String(probe.error),
        tone: 'error',
      }), h(RF.ui.Button, {
        label: t('flow.device.retry'),
        variant: 'secondary',
        onClick: () => props.state.reloadProbe(),
      }));
    }

    const view = probe.view ?? {};
    const report = view.report ?? {};
    const items = Array.isArray(report.items) ? report.items : [];
    const blockers = Array.isArray(report.blockers) ? report.blockers : [];
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const vram = itemOf(report, 'vram');
    const vramGb = Number(vram?.value);
    const vramOk = Number.isFinite(vramGb) && vramGb >= 8;

    // 设计稿 9 行之外的探测项：**失败才显示**（成功的那条没有信息量）。
    const extraFailures = items.filter(item => (
      !DEVICE_ROWS.some(row => row.id === item?.id) && String(item?.status ?? '') === 'failed'
    ));

    return h('div', null,
      // ── 检测状态条 ──
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.done', {
              count: items.length,
              seconds: ((Number(view.at) || 0) > 0 ? ((Date.now() - Number(view.at)) / 1000).toFixed(1) : '0.0'),
            })),
            h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.footnote'))),
          h(RF.ui.Button, {
            label: t('flow.device.recheck'),
            variant: 'secondary',
            disabled: probe.loading === true,
            onClick: () => props.state.reloadProbe(),
          }))),

      // ── 9 行探测表 ──
      h(RF.ui.SectionLabel, null, t('flow.device.tableLabel')),
      h(RF.ui.Card, null,
        DEVICE_ROWS.map(row => {
          const item = row.id === 'gpu' ? vram : itemOf(report, row.id);
          return h('div', { key: row.id, className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, t(row.labelKey)),
              h('div', { className: `${RF.CLS}-row__sub` }, t(row.methodKey))),
            h(RF.ui.Pill, {
              label: itemVerdict(item),
              tone: itemTone(item),
            }));
        }),
        extraFailures.map(item => h('div', { key: `extra-${item.id}`, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.row.videoBackend')),
            h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.method.videoBackend'))),
          h(RF.ui.Pill, { label: String(item.message ?? ''), tone: 'failed' }))),
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.tableNote'))),

      // ── 结论卡 ──
      blockers.length > 0
        // 板 04 号板：结论卡是**红底**（ERROR-SURF），不是普通卡面。
        ? h(RF.ui.Card, { tone: 'error' },
          h('div', { className: `${RF.CLS}-row__title ${RF.CLS}-note--error` }, t('flow.device.conclusionTitle')),
          blockers.map(blocker => h('div', {
            key: `blocker-${blocker.id}`,
            className: `${RF.CLS}-row__sub`,
          }, `· ${String(blocker.message ?? '')}`)),
          h('div', { className: `${RF.CLS}-row` },
            h(RF.ui.Button, {
              label: t('flow.device.toCloud'),
              variant: 'primary',
              onClick: () => props.state.choosePosition('cloud'),
            }),
            h(RF.ui.Button, {
              label: t('flow.device.onlyImage'),
              variant: 'secondary',
              onClick: () => props.state.runStage('image'),
            })))
        : h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.allOk')),
          warnings.map(warning => h('div', {
            key: `warn-${warning.id}`,
            className: `${RF.CLS}-note ${RF.CLS}-note--warn`,
          }, `· ${String(warning.message ?? '')}`))),

      // ── 本地仍可完成 ──
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.localStillLabel')),
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Pill, { label: t('flow.device.localStill.storyboard'), tone: 'queued' }),
          h(RF.ui.Pill, { label: t('flow.device.localStill.references'), tone: 'queued' }),
          h(RF.ui.Pill, { label: t('flow.device.localStill.compose'), tone: 'queued' })),
        h('div', { className: `${RF.CLS}-note` }, t('flow.device.bottomNote'))),

      vramOk
        ? null
        : h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.device.vramHint', {
          have: Number.isFinite(vramGb) ? vramGb : 0,
          need: 8,
        })));
  };

  /**
   * 05 · 执行路径（kind × 位置矩阵）。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowPlan = function flowPlan(props) {
    const t = props.t;
    const project = props.project ?? {};
    const plan = project.plan ?? null;
    const matrix = Array.isArray(project.planMatrix) ? project.planMatrix : [];
    const position = String(props.state.pendingPosition ?? (plan?.position ?? ''));

    /** 矩阵里 kind 的分组（设计稿：图像 = t2i/i2i，视频 = r2v/tts/music）。 */
    var GROUPS = [
      { key: 'image', kinds: ['t2i', 'i2i'], label: 'flow.plan.group.image' },
      { key: 'video', kinds: ['r2v', 'tts', 'music'], label: 'flow.plan.group.video' },
    ];

    const cell = (group, where) => {
      const rows = matrix.filter(row => group.kinds.includes(String(row?.kind ?? '')));
      const brief = where === 'local'
        ? rows.map(row => row?.local).find(Boolean)
        : rows.map(row => row?.cloud).find(Boolean);
      const selected = plan !== null
        && String(plan.position ?? '') === where
        && group.kinds.includes(String(plan.kind ?? ''));
      return h(RF.ui.Card, {
        key: `${group.key}-${where}`,
        state: selected ? 'selected' : 'default',
        onClick: () => props.state.choosePosition(where),
      },
      h('div', { className: `${RF.CLS}-row__title` }, t(group.label)),
      h('div', { className: `${RF.CLS}-row__sub` }, t(where === 'local' ? 'flow.plan.localSub' : 'flow.plan.cloudSub')),
      h('div', { className: `${RF.CLS}-row__sub` }, t('flow.plan.specCount', { count: rows.length })),
      brief
        ? h('div', { className: `${RF.CLS}-row__sub` }, brief.sourceFile ?? '')
        : h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.plan.noSpec')),
      where === 'cloud'
        ? h('div', { className: `${RF.CLS}-row__sub` }, t('flow.plan.billed'))
        : null);
    };

    /**
     * 规格 id（拿不到就说「这一档没有规格」，不编）。
     * @param {object | null | undefined} brief 规格摘要。
     * @returns {string} 规格 id。
     */
    const specIdOf = (brief) => {
      const id = String(brief?.id ?? '');
      return id === '' ? t('flow.plan.noSpec') : id;
    };

    return h('div', null,
      h(RF.ui.SectionLabel, null, t('flow.plan.axisLabel')),
      h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        cell(GROUPS[0], 'local'),
        cell(GROUPS[0], 'cloud'),
        cell(GROUPS[1], 'local'),
        cell(GROUPS[1], 'cloud')),

      // ── kind → 规格映射 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.plan.mappingLabel')),
        matrix.map(row => h('div', {
          key: String(row?.kind ?? ''),
          className: `${RF.CLS}-row`,
          onClick: () => props.state.chooseKind(String(row?.kind ?? '')),
        },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, String(row?.kind ?? '')),
          // 板 05 号板：「t2i → 文生图 · local_sdxl_t2i / cloud_h3_t2i」
          // —— 同一 kind 的**两套 sourceFile**，不是两档能力（少一列就讲不清这件事）。
          h('div', { className: `${RF.CLS}-row__sub` },
            `${t(`flow.plan.kind.${row?.kind ?? ''}`)} · `
            + `${t('flow.plan.spec.local')} ${specIdOf(row?.local)} / `
            + `${t('flow.plan.spec.cloud')} ${specIdOf(row?.cloud)}`)),
        h(RF.ui.Pill, {
          label: plan !== null && String(plan.kind ?? '') === String(row?.kind ?? '') ? t('flow.plan.current') : '',
          tone: plan !== null && String(plan.kind ?? '') === String(row?.kind ?? '') ? 'running' : 'queued',
        }))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.plan.mappingNote'))),

      // ── 辅助评分（没有评分器 ⇒ 明说，不编数字）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.plan.scoreLabel')),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.plan.scoreMissing')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.plan.bottomNote'))));
  };

  /**
   * 06 · 四阶段勾选。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowStages = function flowStages(props) {
    const t = props.t;
    const project = props.project ?? {};
    const stages = project.stages ?? {};
    const global = Array.isArray(stages.global) ? stages.global : [];
    const byChapter = Array.isArray(stages.byChapter) ? stages.byChapter : [];
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];

    return h('div', null,
      // ── 四张全局阶段卡 ──
      RF.STAGES.map((stage, index) => {
        const enabled = global.includes(stage);
        // 板 06 号板：阶段卡选中态 = 蓝描边 **+ 左侧 4px 蓝条**（`accent`）。
        return h(RF.ui.Card, { key: stage, state: enabled ? 'selected' : 'default', accent: true },
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, stage),
              h('div', { className: `${RF.CLS}-row__sub` }, t(`flow.stages.${stage}.sub`)),
              h('div', { className: `${RF.CLS}-note` }, t(`flow.stages.${stage}.hint`))),
            h(RF.ui.Pill, { label: `STAGE ${index + 1}`, tone: enabled ? 'running' : 'queued' })));
        }),
      h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.stages.readonly')),

      // ── 显存门槛提示条 ──
      // 板 06 号板：这条是**黄底**（WARN-SURF），不是普通卡面。
      h(RF.ui.Card, { tone: 'warn' },
        h('div', { className: `${RF.CLS}-row__title ${RF.CLS}-note--warn` }, t('flow.stages.vramTitle')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.stages.vramNote'))),

      // ── 按章勾选 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.stages.byChapterLabel')),
        byChapter.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.stages.noChapter'))
          : byChapter.map(row => {
            const chapter = chapters.find(item => Number(item?.id) === Number(row?.seq));
            const list = Array.isArray(row?.stages) ? row.stages : [];
            return h('div', { key: String(row?.seq ?? ''), className: `${RF.CLS}-row` },
              h('div', { className: `${RF.CLS}-row__main` },
                h('div', { className: `${RF.CLS}-row__title` },
                  t('flow.stages.chapterRow', {
                    seq: row?.seq ?? '',
                    name: chapter?.title ?? '',
                  })),
                h('div', { className: `${RF.CLS}-row__sub` },
                  list.length === 0
                    ? t('flow.stages.chapterPending')
                    : list.map(stage => t(`stages.${stage}`)).join(' · '))));
          }),
        h('div', { className: `${RF.CLS}-note` }, t('flow.stages.bottomNote'))));
  };

  /**
   * 16 · 降级矩阵。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowDegraded = function flowDegraded(props) {
    const t = props.t;
    const probe = props.state.probe ?? null;

    if (probe === null) {
      return h('div', null, h(RF.ui.EmptyState, { title: t('flow.degrade.loading'), hint: t('empty.hint') }));
    }
    if (probe.error !== undefined && probe.error !== null && probe.error !== '') {
      return h('div', null, h(RF.ui.EmptyState, {
        title: t('flow.degrade.failed'),
        hint: String(probe.error),
        tone: 'error',
      }), h(RF.ui.Button, {
        label: t('flow.device.retry'),
        variant: 'secondary',
        onClick: () => props.state.reloadProbe(),
      }));
    }

    const degrade = probe.view?.degrade ?? {};
    const rows = Array.isArray(degrade.matrix) ? degrade.matrix : [];
    const degradations = Array.isArray(degrade.degradations) ? degrade.degradations : [];
    const notices = Array.isArray(degrade.notices) ? degrade.notices : [];

    /**
     * 产出形态 → 胶囊色调。
     *
     * 板 16 号板明写「每格用 10-11px 文字，绿 #3FB950 / 黄 #D29922 / 红 #F85149」：
     * 绿=有、红=无、**黄=降级但仍交付**。中间那档（静帧成片 / 部分镜 /
     * 静音成片 / 无声成片 / 占位帧）原来落在「排队」的灰色上，
     * 看不出是降级 —— 现在落到黄。
     *
     * @param {string} form 形态（`none` / `text_card` / `placeholder` / `silent` / `full` / `partial`）。
     * @returns {string} 色调。
     */
    const formTone = (form) => {
      if (form === 'none') return 'failed';
      if (form === 'full') return 'done';
      return 'warn';
    };

    return h('div', null,
      // ── 降级矩阵表（板 16 号板：缺失项 × 成片 / 分镜表 / 参考图，7 行 3 列值）──
      // ⚠️ 三列值**都要显示** —— 只显示成片那一列，
      // 「分镜表还在、参考图没了」这种关键事实就说不出来了。
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-matrix` },
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.missingItem')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colVideo')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colStoryboard')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colPack'))),
        rows.map(row => h('div', { key: String(row?.kind ?? ''), className: `${RF.CLS}-matrix` },
          h('div', { className: `${RF.CLS}-row__title` }, t(`degrade.kind.${row?.kind ?? ''}`)),
          h(RF.ui.Pill, {
            label: t(`degrade.video.${row?.video ?? 'none'}`),
            tone: formTone(String(row?.video ?? 'none')),
          }),
          h(RF.ui.Pill, {
            label: row?.storyboard === false ? t('degrade.storyboard.no') : t('degrade.storyboard.yes'),
            tone: row?.storyboard === false ? 'failed' : 'done',
          }),
          h(RF.ui.Pill, {
            label: t(`degrade.pack.${row?.referencePack ?? 'none'}`),
            tone: formTone(String(row?.referencePack ?? 'none')),
          }))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.matrixNote'))),

      // ── 一次真实降级 ──
      // 板 16 号板：这张卡是**普通面 + 黄描边**（WARN-SURF 用在描边上）。
      degradations.length === 0
        ? h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row__title` }, t('flow.degrade.noneTitle')),
          h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.noneBody')))
        : h(RF.ui.Card, { tone: 'warn-border' },
          h('div', { className: `${RF.CLS}-row__title` }, t(`degrade.kind.${degradations[0].kind ?? ''}`)),
          h('div', { className: `${RF.CLS}-row__sub` }, String(degradations[0].message ?? '')),
          h('div', { className: `${RF.CLS}-row__sub` }, t('flow.degrade.outputsLine', {
            video: t(`degrade.video.${degrade.outputs?.video ?? 'none'}`),
            storyboard: degrade.outputs?.storyboard === false
              ? t('degrade.storyboard.no')
              : t('degrade.storyboard.yes'),
            pack: t(`degrade.pack.${degrade.outputs?.referencePack ?? 'none'}`),
          })),
          h('div', { className: `${RF.CLS}-row` },
            h(RF.ui.Button, {
              label: t('flow.degrade.rerun'),
              variant: 'secondary',
              onClick: () => props.state.runStage('tts'),
            }),
            h(RF.ui.Button, {
              label: t('flow.degrade.accept'),
              variant: 'secondary',
              onClick: () => props.state.goFlow('stages'),
            }))),

      // ── 对话话术 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.degrade.dialogLabel')),
        notices.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.noNotices'))
          : h('div', null, notices.slice(0, 4).map((notice, index) => h('div', {
            key: `notice-${index}`,
            className: `${RF.CLS}-row__sub`,
          }, `· ${String(notice)}`)))));
  };
})(RF);

/* ── src/client/workbench/Workbench.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 右栏工作台主壳：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 *
 * 骨架铁律（R7）：右栏 Tab 容器是 `overflow:hidden` —— 外层 `section` 必须
 * `height:100%` + `boxSizing:border-box` + `display:flex` + `flexDirection:column`，
 * 内层内容层必须 `flex:1; min-height:0; overflowY:auto`，否则内容超高时底栏被裁掉且滚不到。
 *
 * 断点按**实测宽度**判（`ResizeObserver` 量容器宽度），不按窗口宽。
 * 组件里的 `useState` 只放交互态，业务数据只从宿主投影读（R1）。
 *
 * ── 两层导航（2026-10-24）────────────────────────────────────────────
 *
 * - **项目视图**（默认）：7 个页签（设计稿 17 号板明写「右栏工作台 7 个页签」）。
 * - **流程屏**：设计稿 02 / 03 / 04 / 05 / 06 / 16 —— 它们的骨架里**没有页签条**
 *   （只有 Header / StageBar / Scroll / Footer），按用户操作流程串成一条链。
 *
 * 进入流程屏的入口：**StageBar 的 6 个步点**（点哪一步到那一屏）+ 流程屏自己的
 * 「继续」链（底栏按钮）。退出：StageBar 的后 3 步 + 面板头的返回按钮。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 7 个页签 → 渲染函数。 */
  RF.TAB_RENDERERS = {
    chapters: RF.tabChapters,
    shots: RF.tabShots,
    assets: RF.tabAssets,
    context: RF.tabContext,
    skills: RF.tabSkills,
    output: RF.tabOutput,
    log: RF.tabLog,
  };

  /** 6 块流程屏 → 渲染函数（设计稿 02 / 03 / 04 / 05 / 06 / 16）。 */
  RF.FLOW_RENDERERS = {
    intake: RF.flowIntake,
    runmode: RF.flowRunMode,
    device: RF.flowDevice,
    plan: RF.flowPlan,
    stages: RF.flowStages,
    degraded: RF.flowDegraded,
  };

  /**
   * 对话输入截获块（§10.5）：把宿主钩子截到的用户原文摆在工作台最上面。
   *
   * 没有截到时也显示一行提示 —— 这个块是「输入会自己进来」的唯一可见证据，
   * 平时空着等于功能不存在。
   *
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.renderCapturedInput = function renderCapturedInput(props) {
    const text = String(props.project?.input?.text ?? '').trim();
    const empty = text === '';
    return h('div', { className: `${RF.CLS}-captured` },
      h('div', { className: `${RF.CLS}-captured__label` }, props.t('captured.label')),
      h('div', {
        className: `${RF.CLS}-captured__text${empty ? ` ${RF.CLS}-captured__text--empty` : ''}`,
      }, empty ? props.t('captured.empty') : text));
  };

  /**
   * 工作台主壳。
   * @param {object} props - 插槽注入的 props（`useTabInfo` / `useSessions` / `t` 等）。
   * @returns {object} React 元素。
   */
  RF.Workbench = function Workbench(props) {
    const React = RF.React;
    const t = typeof props.t === 'function' ? props.t : (key, values) => RF.interpolate(key, values ?? {});
    const project = RF.useProjection(React);

    const [activeTab, setActiveTab] = React.useState('chapters');
    const [mode, setMode] = React.useState('tabs');
    const [flowScreen, setFlowScreen] = React.useState('intake');
    const [selectedShotId, setSelectedShotId] = React.useState(null);
    const [assetCategory, setAssetCategory] = React.useState('all');
    const [skillSource, setSkillSource] = React.useState('all');
    const [selectedSkillName, setSelectedSkillName] = React.useState(null);
    const [speed, setSpeed] = React.useState(1);
    const [subtitles, setSubtitles] = React.useState(true);
    const [voice, setVoice] = React.useState(true);
    const [bgm, setBgm] = React.useState(false);
    const [rollbackMode, setRollbackMode] = React.useState('single');
    const [novelText, setNovelText] = React.useState('');
    const [pendingPosition, setPendingPosition] = React.useState('');
    const [planHint, setPlanHint] = React.useState('');
    const [probe, setProbe] = React.useState(null);
    const [probeLoading, setProbeLoading] = React.useState(false);
    const [width, setWidth] = React.useState(0);

    const shellRef = React.useRef(null);
    React.useEffect(() => {
      const element = shellRef.current;
      if (element === null || element === undefined) return undefined;
      const measure = () => setWidth(element.getBoundingClientRect().width);
      measure();
      if (typeof ResizeObserver === 'undefined') {
        globalThis.addEventListener?.('resize', measure);
        return () => globalThis.removeEventListener?.('resize', measure);
      }
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    const twoColumns = RF.columnsFor(width) === 2;
    const stage = RF.stageStepsState(project);
    const inFlow = mode === 'flow';
    const activeScreen = inFlow ? flowScreen : activeTab;
    const render = inFlow
      ? (RF.FLOW_RENDERERS[flowScreen] ?? RF.flowIntake)
      : (RF.TAB_RENDERERS[activeTab] ?? RF.tabChapters);

    // 流程屏里，StageBar 高亮的是**这一屏所属的那一步**（设计稿 §2.1 全表）。
    const flowStepIndex = RF.STAGE_STEPS.indexOf(RF.FLOW_SCREEN_STEPS[flowScreen] ?? '');
    const currentIndex = inFlow ? (flowStepIndex >= 0 ? flowStepIndex : 0) : stage.current;
    const passedIndex = inFlow
      ? RF.STAGE_STEPS.map((_, index) => index).filter(index => index < currentIndex)
      : stage.passed;

    // ── 探测数据（设备检查 / 降级矩阵两屏用）──
    // ⚠️ 这里**不用** `useCallback`：客户端测试用的最小 hook 运行时没有它。
    // `loadProbe` 只依赖模块级函数与两个稳定的 setter，所以依赖数组窄一点也安全。
    const loadProbe = (refresh) => {
      if (typeof fetch !== 'function') {
        setProbe({ view: null, error: '当前环境没有 fetch，读不到探测结果' });
        return;
      }
      setProbeLoading(true);
      fetch(RF.probeUrl({ refresh: refresh === true }))
        .then(response => response.json())
        .then(view => {
          setProbe({ view, error: null });
          setProbeLoading(false);
        })
        .catch(error => {
          setProbe({ view: null, error: error?.message ?? String(error) });
          setProbeLoading(false);
        });
    };

    React.useEffect(() => {
      if (activeScreen === 'device' || activeScreen === 'degraded') loadProbe(false);
    }, [activeScreen]);

    // 快捷键带 `params.focus` 打开某个页签（`ctx.sidebarRight.openTab(kind, { params })`）。
    const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined;
    const focus = tabInfo?.tab?.navigation?.params?.focus;
    React.useEffect(() => {
      if (typeof focus === 'string' && RF.WORKBENCH_TABS.some(tab => tab.id === focus)) {
        setMode('tabs');
        setActiveTab(focus);
      }
    }, [focus]);
    React.useEffect(() => {
      if (typeof props.sessionId === 'string') RF.currentSessionId = props.sessionId;
    }, [props.sessionId]);

    const goFlow = (screen) => {
      if (typeof screen !== 'string' || RF.FLOW_RENDERERS[screen] === undefined) return;
      setMode('flow');
      setFlowScreen(screen);
    };
    const goTab = (tab) => {
      if (typeof tab !== 'string' || RF.TAB_RENDERERS[tab] === undefined) return;
      setMode('tabs');
      setActiveTab(tab);
    };

    const state = {
      selectedShotId,
      selectShot: setSelectedShotId,
      // ⚠️ `reelforge.update_shot` 的必填参数是 `seq` + `idx`
      // （`src/host/tools.js`：`required: ['seq', 'idx']`）——
      // 只发 `{ duration }` 会被宿主拒收，改时长永远不生效。
      // 所以这里要拿住「选中的是哪一章的第几镜」，由调用方把这一镜传进来。
      setDuration: (shot, value) => RF.actions?.callTool?.(RF.TOOL_IDS.updateShot, {
        seq: shot?.seq,
        idx: shot?.idx,
        duration: value,
      }),
      assetCategory,
      setAssetCategory,
      skillSource,
      setSkillSource,
      selectedSkillName,
      selectSkill: setSelectedSkillName,
      speed,
      setSpeed,
      subtitles,
      voice,
      bgm,
      toggle: key => {
        if (key === 'subtitles') setSubtitles(value => !value);
        else if (key === 'voice') setVoice(value => !value);
        else if (key === 'bgm') setBgm(value => !value);
      },
      rollbackMode,
      setRollbackMode,
      // ⚠️ 参数名必须是 `entryId`：`reelforge.rollback` 的 schema 是
      // `entryId`（单条模式）+ `additionalProperties: false` —— 发成 `id`
      // 会被宿主当成未知键**整条拒收**，回滚永远不生效。
      rollback: (entry, force) => RF.actions?.callTool?.(RF.TOOL_IDS.rollback, {
        entryId: entry.id,
        mode: rollbackMode,
        ...(force === true ? { force: true } : {}),
      }),
      twoColumns,
      // ── 流程屏相关 ──
      goFlow,
      goTab,
      novelText,
      setNovelText,
      pendingPosition,
      planHint,
      probe: probe === null ? null : { ...probe, loading: probeLoading },
      reloadProbe: () => loadProbe(true),
      /**
       * 导入小说：走 `reelforge.import_novel`（`novel` 是必填）。
       */
      importNovel: () => {
        const text = String(novelText).trim();
        if (text === '') return;
        RF.actions?.callTool?.(RF.TOOL_IDS.importNovel, { novel: text });
      },
      /**
       * 选运行位置。
       *
       * ⚠️ `reelforge.update_plan` 的 `kind` 与 `position` **都是必填** ——
       * 只发位置会被宿主整条拒收。所以：
       *   已经选过 kind → 直接改位置；
       *   还没选 kind   → 先记住位置（客户端交互态），等「执行路径」选完 kind 一起写入。
       */
      choosePosition: (position) => {
        const kind = project.plan?.kind;
        if (typeof kind === 'string' && kind !== '') {
          RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
          return;
        }
        setPendingPosition(position);
        setPlanHint('');
      },
      /**
       * 选生成 kind（写进 `reelforge.update_plan`）。
       */
      chooseKind: (kind) => {
        const position = pendingPosition !== '' ? pendingPosition : String(project.plan?.position ?? '');
        if (position === '') {
          setPlanHint(t('flow.plan.needPosition'));
          return;
        }
        setPlanHint('');
        RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
      },
      /**
       * 跑一个阶段（`reelforge.run_stage`，触发类 ⇒ 宿主会弹授权）。
       */
      runStage: (stage) => {
        RF.actions?.callTool?.(RF.TOOL_IDS.runStage, { stage });
      },
    };

    // 底栏第二行：当前跑到第几章的第几镜（成本行已按 owner 裁决移进滚动区底部）。
    const current = RF.currentPosition(project);
    const positionLabel = current === null
      ? t('footer.idle')
      : t('footer.position', current);

    // ── 按屏外壳（Header 三件套 + Footer 三件套）──
    // owner 裁决「按屏变化」（Q1 底栏 / Q3 胶囊）：设计稿 17 块板的胶囊与底栏文案
    // 每块都不同，以前实现是全局固定的一套。每屏长什么样在 `workbench/chrome.js`。
    const chrome = RF.tabChrome(activeScreen);
    // 底栏动作**由屏上的数据决定**：没章时「生成第 1 章」不能是可点的按钮，
    // 没有交付物时「交付物」也不能点了没反应 —— 都要禁用 + 说清缺什么。
    const chromeAction = typeof chrome.footerAction === 'function'
      ? chrome.footerAction(project)
      : (chrome.footerAction ?? {});
    const chromeTitle = chrome.titleKey === undefined ? '' : t(chrome.titleKey);
    // 外壳契约：subtitle / capsule / footerLabel / footerValue **一律是函数**
    // （静态文案在 chrome.js 里就包好了，渲染层不再判类型）。
    // 第三个参数 `ctx` 带的是**屏外数据**（目前只有设备检查 / 降级矩阵的探测结果）。
    const chromeContext = { probe };
    const chromeSubtitle = chrome.subtitle(project, t, chromeContext);
    const chromeCapsule = chrome.capsule(project, t, chromeContext);
    const chromeLabel = chrome.footerLabel(project, t);
    const chromeValue = chrome.footerValue(project, t);
    const chromeDisabled = chromeAction.disabled === true || chromeAction.kind === 'none';
    const chromeHintKey = chromeAction.hintKey ?? chrome.disabledHintKey;

    // 「导出日志」：把变更日志导出成 JSON 文件（浏览器直接下载，不经过宿主）。
    const exportChangelog = () => {
      const entries = Array.isArray(project.changelog?.entries) ? project.changelog.entries : [];
      const blob = new Blob([JSON.stringify({ entries }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reelforge-changelog.json';
      link.click();
      URL.revokeObjectURL(url);
    };

    // 底栏主按钮：切页签 / 调工具 / 导出文件 / 切流程屏 / 暂不可用。
    const runChromeAction = () => {
      const action = chromeAction;
      if (action.kind === 'tab') {
        goTab(action.tab);
        return;
      }
      if (action.kind === 'flow') {
        goFlow(action.screen);
        return;
      }
      if (action.kind === 'tool') {
        const params = typeof action.params === 'function' ? action.params(project) : action.params;
        RF.actions?.callTool?.(action.tool, params ?? {});
        return;
      }
      if (action.kind === 'export') exportChangelog();
      if (action.kind === 'scroll') {
        // 「交付物」按钮：滚到本页的交付物清单（设计稿 10 号板的主按钮）。
        const target = document.getElementById(action.target);
        if (target !== null && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start' });
        }
      }
    };

    // StageBar 点哪一步 → 到那一屏（设计稿把 StageBar 定义成进度指示，这里加成可点）。
    const goStageStep = (step) => {
      const target = RF.STAGE_STEP_TARGETS[step];
      if (target === undefined) return;
      if (target.kind === 'flow') goFlow(target.screen);
      else goTab(target.tab);
    };

    return h('section', { className: `${RF.CLS}-root`, ref: shellRef },
      h('header', { className: `${RF.CLS}-header` },
        inFlow
          ? h('button', {
            type: 'button',
            className: `${RF.CLS}-header__logo ${RF.CLS}-header__logo--button`,
            title: t('flow.backToWorkbench'),
            'aria-label': t('flow.backToWorkbench'),
            onClick: () => goTab('chapters'),
          })
          : h('div', { className: `${RF.CLS}-header__logo`, 'aria-hidden': true }),
        h('div', { className: `${RF.CLS}-header__text` },
          h('div', { className: `${RF.CLS}-header__title` }, chromeTitle),
          h('div', { className: `${RF.CLS}-header__subtitle` }, chromeSubtitle)),
        h('span', { className: `${RF.CLS}-header__status` }, chromeCapsule)),
      h('nav', { className: `${RF.CLS}-stagebar`, 'aria-label': t('title') },
        RF.STAGE_STEPS.map((step, index) => {
          const tone = index === currentIndex ? 'current' : passedIndex.indexOf(index) >= 0 ? 'passed' : 'upcoming';
          return h('button', {
            key: step,
            type: 'button',
            className: `${RF.CLS}-stagebar__step ${RF.CLS}-stagebar__step--${tone}`,
            title: t(`stage.go.${step}`),
            onClick: () => goStageStep(step),
          },
          h('span', { className: `${RF.CLS}-stagebar__dot ${RF.CLS}-stagebar__dot--${tone}` }),
          h('span', null, t(`stage.${step}`)));
        }),
        h('span', { className: `${RF.CLS}-stagebar__count` }, t('stage.count', { current: currentIndex + 1 }))),
      inFlow
        ? null
        : h('div', { className: `${RF.CLS}-tabs`, role: 'tablist' },
          RF.WORKBENCH_TABS.map(tab => h('button', {
            key: tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab.id === activeTab ? 'true' : 'false',
            className: `${RF.CLS}-tabs__item${tab.id === activeTab ? ` ${RF.CLS}-tabs__item--active` : ''}`,
            onClick: () => goTab(tab.id),
          }, t(`tab.${tab.labelKey}`)))),
      h('div', { className: `${RF.CLS}-scroll` },
        RF.renderCapturedInput({ t, project }),
        render({ t, project, state, width }),
        // 成本与进度**移进滚动区底部**（owner 裁决 Q2：设计稿 01 号板把它放在滚动区内，
        // y=816；底栏只留「本屏标签 + 本屏主文案 + 本屏主按钮」）。
        activeTab === 'chapters' && !inFlow
          ? h('div', { className: `${RF.CLS}-note` }, t('chrome.stat.row', {
            position: positionLabel,
            spent: RF.formatMoney(project.cost?.spent ?? 0),
            cap: RF.formatMoney(project.cost?.cap ?? 0),
          }))
          : null,
        // 底栏主按钮暂不可用时，**说清缺什么、给什么替代**（不静默做成死按钮）。
        chromeDisabled && chromeHintKey !== undefined
          ? h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t(chromeHintKey))
          : null),
      h('footer', { className: `${RF.CLS}-footer` },
        h('div', { className: `${RF.CLS}-footer__text` },
          h('div', { className: `${RF.CLS}-footer__label` }, chromeLabel),
          h('div', { className: `${RF.CLS}-footer__value` }, chromeValue)),
        h(RF.ui.Button, {
          label: t(chromeAction.key),
          variant: 'primary',
          disabled: chromeDisabled,
          title: chromeDisabled && chromeHintKey !== undefined ? t(chromeHintKey) : undefined,
          onClick: () => runChromeAction(),
        })));
  };
})(RF);

/* ── src/client/chatRows/index.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 7 类对话消息行的视图（注册在 `conversation.chat.node`，键为事件定义的 kind）。
 *
 * 形态约定（§2.4）：
 *   progress / chapters / storyboard **默认折叠**（折叠态是默认视图）；
 *   plan 行可在对话内直接改 kind × 位置（**不烧钱，不走 ask**）；
 *   changelog 行的回滚**走 ask**（由宿主的 `ask` 机制承担，插件只发起请求）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 消息行的文案入口（由入口注入绑定后的 translate）。 */
  RF.chatRows = RF.chatRows || { t: (key) => key };

  /**
   * 折叠壳：折叠态只留一行摘要，展开是用户主动要的。
   * @param {{ React: object, kind: string, title: string, summary: string, children: any, defaultOpen?: boolean }} props - 属性。
   * @returns {object} React 元素。
   */
  function disclosure(props) {
    const React = props.React;
    const [open, setOpen] = React.useState(props.defaultOpen === true);
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, props.kind),
        h('span', { className: `${RF.CLS}-chatrow__title` }, props.title),
        h('button', {
          type: 'button',
          className: `${RF.CLS}-chatrow__toggle`,
          'aria-expanded': open ? 'true' : 'false',
          onClick: () => setOpen(value => !value),
        }, open ? RF.chatRows.t('chat.collapse') : RF.chatRows.t('chat.expand'))),
      h('div', { className: `${RF.CLS}-chatrow__body` }, open ? props.children : props.summary));
  }

  /**
   * 把若干段拼成摘要，空段不占位（`第 2 章 · S02-07 · 已跑 04:12`）。
   * @param {...unknown} parts - 片段。
   * @returns {string} 摘要。
   */
  function joinParts(...parts) {
    return parts
      .map(part => String(part ?? '').trim())
      .filter(part => part !== '')
      .join(' · ');
  }

  /** 行数据：宿主事件定义物化出来的 `node.data`。 */
  function dataOf(props) {
    const node = props.node ?? {};
    return node.data ?? {};
  }

  /**
   * 阶段进度行：轻量、可折叠。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowProgress = function chatRowProgress(props) {
    const data = dataOf(props);
    // 阶段值是内部 id（`image` / `tts` …）：走 `stages.*` 词条，
    // 查不到就原样显示 —— 既不裸奔技术词，也不吐 `stages.image` 这种键名。
    const stage = RF.labelOf('stages', String(data.stage ?? ''), RF.chatRows.t);
    const summary = joinParts(stage, data.chapter, data.shot, data.elapsed);
    return disclosure({
      React: RF.React,
      kind: 'reelforge-progress',
      title: RF.chatRows.t('chat.progress'),
      summary,
      children: h('div', null,
        h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.stage'), value: stage }),
        h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.chapter'), value: String(data.chapter ?? '') }),
        h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.shot'), value: String(data.shot ?? '') }),
        h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.elapsed'), value: String(data.elapsed ?? '') })),
    });
  };

  /**
   * 章节列表行：可展开看单章状态。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowChapters = function chatRowChapters(props) {
    const data = dataOf(props);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    const shots = chapters.reduce((sum, chapter) => sum + (Number(chapter.shotCount) || 0), 0);
    const summary = RF.chatRows.t('chat.summary.chapters', { chapters: chapters.length, shots });
    return disclosure({
      React: RF.React,
      kind: 'reelforge-chapters',
      title: RF.chatRows.t('chat.chapters'),
      summary,
      children: h('div', null, chapters.map(chapter => h('div', { key: chapter.id, className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
          h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
        h(RF.ui.Pill, { label: RF.labelOf('chapter.status', chapter.status, RF.chatRows.t), tone: chapter.tone ?? 'queued' })))),
    });
  };

  /**
   * 分镜卡片行：可展开看单镜。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowStoryboard = function chatRowStoryboard(props) {
    const data = dataOf(props);
    const shots = Array.isArray(data.shots) ? data.shots : [];
    const summary = RF.chatRows.t('chat.summary.shots', { shots: shots.length });
    return disclosure({
      React: RF.React,
      kind: 'reelforge-storyboard',
      title: RF.chatRows.t('chat.storyboard'),
      summary,
      children: h('div', null, shots.map(shot => h('div', { key: shot.id, className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, shot.label ?? shot.id),
          h('div', { className: `${RF.CLS}-row__sub` }, `${RF.formatDuration(shot.duration ?? 0)} · ${shot.dialogue ?? ''}`)),
        h(RF.ui.Pill, { label: RF.labelOf('shot.status', shot.status, RF.chatRows.t), tone: shot.tone ?? 'queued' })))),
    });
  };

  /**
   * 执行路径行：**对话内直接改** kind × 位置（不烧钱，不走 ask）。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowPlan = function chatRowPlan(props) {
    const data = dataOf(props);
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const patch = (kind, position) => RF.actions?.callTool?.('reelforge.update_plan', { kind, position }, { ask: false });
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-plan'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.plan'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, RF.chatRows.t('chat.summary.plan', { kind: data.kind ?? '', position: data.position ?? '' })),
            h('div', { className: `${RF.CLS}-row__sub` }, data.provider ?? ''))),
        h('div', { className: `${RF.CLS}-row` }, candidates.map(candidate => h(RF.ui.Button, {
          key: `${candidate.kind}-${candidate.position}`,
          label: candidate.label ?? `${candidate.kind} · ${candidate.position}`,
          variant: candidate.kind === data.kind && candidate.position === data.position ? 'primary' : 'secondary',
          onClick: () => patch(candidate.kind, candidate.position),
        })))));
  };

  /**
   * 资产卡行：人物 / 场景 / 道具 + 变体挂载关系。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowAssets = function chatRowAssets(props) {
    const data = dataOf(props);
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-assets'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.assets'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        assets.map(asset => h('div', { key: asset.id, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, asset.name ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, asset.description ?? '')),
          h(RF.ui.Pill, { label: RF.labelOf('asset.category', asset.category, RF.chatRows.t), tone: 'queued' })))));
  };

  /**
   * 成片行：播放器 + 交付物列表，可单章下载。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowDeliver = function chatRowDeliver(props) {
    const data = dataOf(props);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-deliver'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.deliver'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        chapters.map((chapter) => {
          const deliverables = Array.isArray(chapter.deliverables) ? chapter.deliverables : [];
          const videoPath = deliverables.find(d => typeof d.path === 'string' && d.path.endsWith('.mp4'))?.path ?? '';
          return h('div', { key: chapter.id },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`),
            deliverables.map(item => h('div', { key: `${item.kind}-${item.path}`, className: `${RF.CLS}-row` },
              h('div', { className: `${RF.CLS}-row__main` },
                h('div', { className: `${RF.CLS}-row__sub` }, `${item.label ?? item.kind} · ${RF.formatBytes(item.bytes ?? 0)}`)),
              item.path
                ? h('a', {
                  className: `${RF.CLS}-btn ${RF.CLS}-btn--secondary`,
                  href: RF.deliverableUrl(item.path),
                  download: item.label ?? item.kind,
                }, RF.chatRows.t('common.download'))
                : h(RF.ui.Button, { label: RF.chatRows.t('common.download'), variant: 'secondary' }))),
            videoPath === '' ? null : h('video', {
              className: `${RF.CLS}-player__video`,
              controls: true,
              preload: 'metadata',
              src: RF.deliverableUrl(videoPath),
            }));
        })));
  };

  /**
   * 变更日志行：回滚入口（单条 / 整批 / 时间点）——**走 ask**。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowChangelog = function chatRowChangelog(props) {
    const data = dataOf(props);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const modes = Array.isArray(data.modes) ? data.modes : ['single', 'batch', 'timepoint'];
    // 三个按钮都是**动作**（这一行里没有每行各自的回滚按钮），所以各自要带足
    // 宿主工具要的定位参数：`reelforge.rollback` 的 schema 是
    // `mode` + `entryId`（单条）/ `batchId`（整批）/ `at`（时间点），
    // 且 `additionalProperties: false` —— 只发 `mode` 会被整条拒收。
    // 目标取这一行里**最新**的那条变更（数组末尾）。
    const latest = entries.length > 0 ? entries[entries.length - 1] : null;
    const rollbackArgs = (mode) => {
      if (latest === null) return null;
      if (mode === 'batch') return { mode, batchId: latest.batchId };
      if (mode === 'timepoint') return { mode, at: latest.at };
      return { mode, entryId: latest.id };
    };
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-changelog'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.changelog'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        h('div', { className: `${RF.CLS}-row` }, modes.map(mode => h(RF.ui.Button, {
          key: mode,
          label: RF.chatRows.t(`log.${mode}`),
          variant: 'secondary',
          onClick: () => {
            const args = rollbackArgs(mode);
            if (args === null) return;
            RF.actions?.callTool?.(RF.TOOL_IDS.rollback, args);
          },
        }))),
        entries.map(entry => h('div', { key: entry.id, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__sub` }, entry.at ?? ''),
            h('div', { className: `${RF.CLS}-row__title` }, entry.summary ?? '')),
          entry.drifted === true ? h(RF.ui.Pill, { label: RF.chatRows.t('log.drifted'), tone: 'failed' }) : null))));
  };
})(RF);

/* ── src/client/chatEvents.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 7 个 kind 的**会话事件定义** + `conversation.chat.node` 视图注册（客户端侧）。
 *
 * R2：**绝不新增会话事件 `type`**。7 个 kind 全部挂在**已有的** `tool/result`
 * 事件类型上；哪一行由工具结果负载里的 `reelforge.kind` 声明。
 * 插件私有数据（进度快照、阶段耗时）走**存储服务**，不进会话事件。
 *
 * 视图注册在 `conversation.chat.node` 插槽，**键为事件定义的 kind**。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 7 个 kind 全部挂靠的**已有**会话事件 type（R2：不新增 type）。 */
  RF.CHAT_ROW_EVENT_TYPE = 'tool/result';

  /** 工具结果负载里声明「这一条是哪一行」的字段路径。 */
  RF.CHAT_ROW_KIND_FIELD = 'reelforge.kind';

  /**
   * 从一个事件里读出 ReelForge 行负载。
   * @param {object} event - 会话事件。
   * @returns {object | null} 负载。
   */
  RF.chatRowPayload = function chatRowPayload(event) {
    if (event === null || typeof event !== 'object') return null;
    if (event.type !== RF.CHAT_ROW_EVENT_TYPE) return null;
    const data = event.data;
    if (data === null || typeof data !== 'object') return null;
    const meta = data.meta !== null && typeof data.meta === 'object' ? data.meta : null;
    const direct = data.reelforge !== null && typeof data.reelforge === 'object' ? data.reelforge : null;
    const payload = direct ?? (meta !== null && meta.reelforge !== null && typeof meta.reelforge === 'object' ? meta.reelforge : null);
    return payload;
  };

  /**
   * 生成一个 kind 的事件定义。
   * @param {string} kind - 消息行 kind。
   * @returns {object} 事件定义。
   */
  RF.chatEventDefinition = function chatEventDefinition(kind) {
    return {
      kind,
      target: 'chat',
      match(event) {
        const payload = RF.chatRowPayload(event);
        if (payload === null) return null;
        if (payload.kind !== kind) return null;
        const data = /** @type {any} */ (event).data ?? {};
        const id = String(data.toolCallId ?? data.callId ?? /** @type {any} */ (event).seq ?? kind);
        return { id: `${kind}:${id}`, role: 'update' };
      },
      start(context, match) {
        return { payload: RF.chatRowPayload(match.event) ?? {} };
      },
      update(context, match) {
        const payload = RF.chatRowPayload(match.event);
        if (payload === null) return context.state;
        return { payload };
      },
      buildViewNode(context) {
        const matches = context.matches ?? [];
        const last = matches.length === 0 ? undefined : matches[matches.length - 1];
        const seq = last?.event?.seq ?? 0;
        return {
          key: context.key,
          kind,
          id: context.id,
          target: 'chat',
          anchorSeq: seq,
          location: context.start?.location ?? { kind: 'unresolved' },
          visibility: 'visible',
          data: context.state?.payload ?? {},
        };
      },
    };
  };

  /**
   * 注册 7 个事件定义。
   * @param {object} ctx - 客户端上下文。
   * @returns {void}
   */
  RF.registerChatEvents = function registerChatEvents(ctx) {
    for (const kind of RF.CHAT_ROW_KINDS) {
      ctx.effect(() => ctx.uiConversation.events.register(RF.chatEventDefinition(kind)), `reelforge: chat event ${kind}`);
    }
  };
})(RF);

/* ── src/client/shortcuts.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 快捷键注册与 `resolve`（§10.4 · R11 / R12 / R13）。
 *
 * 快捷键服务是**客户端**服务（`packages/client/shortcuts`），所以本文件在 `src/client/` 下。
 *
 * 键位怎么选的（这段推理改过一次，第二次才是对的）
 *
 * 第一版按「宿主占用的键全是**单修饰键**（⌘K ⌘/ ⌘N ⌘O ⌘G ⌘F ⌘A ⌘B ⌘\ ⌘↵ ⌘W ⌘R ⌘,
 * ⌘P ⌘T），所以 `Ctrl+Alt+X` 一定不冲突」来推 —— **这个前提是错的**：
 * 宿主除了单修饰键，还大量使用**双修饰键**（`primary+alt`），而 `primary` 在
 * Windows/Linux 上就是 `control`。于是 `Ctrl+Alt+R` 正好撞上宿主的 `page.refresh`
 * （web:windows 上它是 `KeyR` + `primary+alt`），`Ctrl+Alt+P` 撞上 `workspace.files`。
 * 宿主的 `ShortcutRegistry.register` 遇到冲突直接抛
 * `Conflicting shortcut defaults: ... and ... (web:windows)` ——
 * **整条客户端 fiber 失败，右栏不会出现 ReelForge Tab**。
 *
 * 现在的选键规则（对着 DSH 0.2.1-alpha.1 源码核过）：
 *
 * 1. 宿主已占用的字母键：`A B F G K N O P R T W`（还有 `Comma` `Slash`
 *    `Backslash` `Backquote` `Enter` 等非字母键）—— 一律不碰。
 * 2. **浏览器/系统保留键**：宿主 `bindingIssue` 规定，带 `primary` 修饰时
 *    `C V X Z Y Q H` 一律保留（复制/粘贴/剪切/撤销/重做/查找/帮助）—— 一律不碰。
 * 3. 剩下可用：`D E I J L M S U` 等。**本插件取 `D` `S` `M`**：
 *    `D`=Dashboard（工作台总览）· `S`=Storyboard（分镜）· `M`=Movie（成片）。
 *
 * 键位语义同时写在 `aliases` 里（`reelforge chapters` 等），所以字母只是把手。
 *
 * **不声明 `web:linux`**（R13）：该平台只认 3 种组合，
 * `control+alt` 会被宿主判定为「Unsupported Web shortcut」。
 * 宿主的 `resolveShortcutDefault` **不回退**到别的平台档，所以不声明就是「该平台无快捷键」。
 *
 * `resolve` 的前置检查（不查会抛异常）：
 *   1. `ctx.sidebarRight.mounted.getSnapshot()` 为假 → `{ status:'blocked', reason:'no session surface is mounted' }`
 *   2. 否则 → 打开 kind = `reelforge-workbench` 的 Tab → `{ status:'handled', run }`
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 右栏未挂载会话时的固定理由文案（契约要求逐字一致）。 */
  RF.NO_SESSION_REASON = 'no session surface is mounted';

  /** 快捷键 id 必须匹配 R12 的正则。 */
  RF.SHORTCUT_ID_PATTERN = /^[a-z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)+$/;

  /**
   * 三个命令的键位（键码 + 修饰键）。
   *
   * 键码必须**同时**避开：宿主已占用的字母键、浏览器保留键、彼此。
   * 详见文件头「键位怎么选的」。
   */
  RF.SHORTCUT_COMMANDS = [
    { id: RF.SHORTCUT_IDS.workbench, code: 'KeyD', focus: 'chapters' },
    { id: RF.SHORTCUT_IDS.shots, code: 'KeyS', focus: 'shots' },
    { id: RF.SHORTCUT_IDS.player, code: 'KeyM', focus: 'output' },
  ];

  /**
   * 注册三个快捷键。
   * @param {object} ctx - 客户端上下文。
   * @returns {void}
   */
  RF.registerShortcuts = function registerShortcuts(ctx) {
    const t = (key, values) => RF.tr(key, values);
    for (const command of RF.SHORTCUT_COMMANDS) {
      ctx.effect(() => ctx.shortcuts.register({
        id: command.id,
        label: () => t('title'),
        aliases: [`reelforge ${command.focus}`],
        defaults: {
          'desktop:macos': { code: command.code, modifiers: ['control', 'alt'] },
          'desktop:windows': { code: command.code, modifiers: ['control', 'alt'] },
          'desktop:linux': { code: command.code, modifiers: ['control', 'alt'] },
          // macOS Web 只接受 primary+alt 或三修饰键；`control+alt` 会被判为不支持。
          'web:macos': { code: command.code, modifiers: ['meta', 'alt'] },
          'web:windows': { code: command.code, modifiers: ['control', 'alt'] },
          // ⚠️ 故意**不声明** web:linux 这一档（R13）。
        },
        regions: ['page', 'editable'],
        modals: [],
        resolve: () => {
          const mounted = ctx.sidebarRight && ctx.sidebarRight.mounted;
          const isMounted = mounted !== undefined && mounted !== null
            && typeof mounted.getSnapshot === 'function'
            && mounted.getSnapshot() !== undefined
            && mounted.getSnapshot() !== null;
          if (!isMounted) {
            return { status: 'blocked', reason: RF.NO_SESSION_REASON };
          }
          return {
            status: 'handled',
            run: () => {
              ctx.sidebarRight.openTab(RF.TAB_KIND, { params: { focus: command.focus } });
            },
          };
        },
      }), `reelforge: shortcut ${command.id}`);
    }
  };
})(RF);

/* ── src/client/entry.js ───────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
 * 客户端入口：Tab 类型注册 + 页面体注册 + 标题 + 文案 + 消息行视图 + 样式 + 快捷键。
 *
 * 宿主 Tab 契约（**两段注册**，已查证 `packages/client/ui-sidebar-right`）：
 *   1. `ctx.sidebarRightTabs.register({ id, kind, ... })` —— `id` 是**类型身份**，全局唯一；
 *   2. `ctx.slots.register({ name: 'sidebar.right.pane.tab', key: definition.id }, Body)`
 *      —— ⚠️ 插槽的 key 是 **definition.id**，不是 kind。写成 kind 页面就是空白。
 *
 * R7：`window.__ModuleLoader__.load({ id })` 的 id 必须与 `package.json` 的 name、
 * `cordis.patch.yml` 的 name **完全相等**，否则 client 半静默不加载。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 客户端 locale 命名空间。 */
  RF.NAMESPACE = 'reelforge';

  /** 7 类消息行 → 视图组件。 */
  RF.CHAT_ROW_VIEWS = {
    'reelforge-progress': function (props) { return RF.chatRowProgress(props); },
    'reelforge-chapters': function (props) { return RF.chatRowChapters(props); },
    'reelforge-storyboard': function (props) { return RF.chatRowStoryboard(props); },
    'reelforge-plan': function (props) { return RF.chatRowPlan(props); },
    'reelforge-assets': function (props) { return RF.chatRowAssets(props); },
    'reelforge-deliver': function (props) { return RF.chatRowDeliver(props); },
    'reelforge-changelog': function (props) { return RF.chatRowChangelog(props); },
  };

  /**
   * 标题：右栏页签胶囊与浮动面板头部的文字。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.WorkbenchTitle = function WorkbenchTitle(props) {
    const t = typeof props.t === 'function' ? props.t : (key) => key;
    return h('span', null, t('title'));
  };

  /**
   * 工具 id → locale 词条前缀（`tool.<name>.label` / `tool.<name>.say`）。
   *
   * ⚠️ 这里只存**词条键**，不存文案：文案在 locale 里，en 界面要跟着切。
   * （早先这里存的是中文，en 界面整段中文 —— 现在收归 locale。）
   *
   * @type {Record<string, string>}
   */
  const TOOL_HINT_KEYS = {
    'reelforge.regenerate_shot': 'tool.regenerateShot',
    'reelforge.rollback': 'tool.rollback',
    'reelforge.run_stage': 'tool.runStage',
    'reelforge.assemble_chapter': 'tool.assembleChapter',
    'reelforge.update_shot': 'tool.updateShot',
    'reelforge.update_plan': 'tool.updatePlan',
    'reelforge.update_asset': 'tool.updateAsset',
    'reelforge.create_asset': 'tool.createAsset',
    'reelforge.bind_asset': 'tool.bindAsset',
    'reelforge.save_context': 'tool.saveContext',
    'reelforge.set_storyboard': 'tool.setStoryboard',
    'reelforge.import_novel': 'tool.importNovel',
    'reelforge.set_chapter_music': 'tool.setChapterMusic',
  };

  /**
   * 工具调用适配器（UI 写操作的唯一入口）。
   *
   * ⚠️ **接口点**：宿主客户端没有公开「直接执行工具」的 API —— 工具是模型调用的。
   * 这里的实现把 UI 的写操作**转成一条会话指令**交给模型去调对应工具（id 走 F4 的冻结表），
   * 触发类工具（回滚 / 重生成 / 合成 / 跑阶段）由宿主侧的 `ask` 机制接管。
   * 合流时请主控确认这条链路，并把这里替换成宿主最终的调用方式。
   *
   * **加固（本次）**：原实现「没有 transport ⇒ 只 `console.warn`」是**静默降质** ——
   * 用户点了没反应，界面上零反馈，只在控制台留一行字。这违反本项目的 DoD 条款
   * 「失败路径要说清缺什么、给什么替代——不许静默降质」。现在改成**可见失败 + 可重放**：
   *
   *   1. 投递不出去的请求进 `RF.actions.pending` 队列（可观测、可重放）；
   *   2. 同时发一条结构化通知（`RF.notify` → `RF.actions.notices`），
   *      文案说清**缺什么**（没有可直调工具的通道）与**给什么替代**（在对话里怎么说）；
   *   3. `console.warn` **保留**（它是诊断信息），但不再是唯一的失败信号。
   *
   * **transport 已对真实宿主核实**（DSH 0.2.1-alpha.1，`packages/api/session-controller`）：
   *   - 宿主**没有**「客户端直接执行工具」的 API —— `remote.commands` 是**斜杠命令**
   *     通道 `execute(agentId, line, attachments)`，不是工具执行器；
   *   - 唯一的通道是 **`ctx.remote.session.prompt`**（`SessionPromptRequest`：
   *     `requestId` / `sessionId` / `mode` / `content`）—— 也就是「把工具指令当一条
   *     会话消息投进去，由模型去调对应工具」这条既有设计；
   *   - `ctx.remote.session` 是**独立的服务名**（`remote.session`），必须在
   *     `RF.CLIENT_INJECT` 里声明才能读到 —— 没声明时 Cordis 的注入守卫会抛
   *     `cannot get property "remote.session" without inject`。
   */
  RF.actions = {
    /** 已经发起过的调用记录（成功与待重放都在这里）。 */
    requests: [],
    /** 投递不出去、等着重放的请求队列。 */
    pending: [],
    /** 结构化通知（默认 `RF.notify` 的落点，UI 可读、可清）。 */
    notices: [],
    /** 通知订阅者（`RF.onNotice` 注册）。 */
    listeners: [],

    /**
     * 把一条请求投给宿主。
     *
     * ⚠️ **读宿主服务属性会抛错，不是返回 undefined**：宿主的 ctx 是 Cordis 能力代理，
     * 没在 `inject` 里声明的服务，访问时抛
     * `cannot get property "<svc>" without inject`。
     * 所以「这条通道有没有」只能问在一个 try 里 —— 以前 `typeof remote.commands`
     * 写在 try **外面**，点一下「回滚」整条链直接炸飞：页面上什么都不发生
     * （用户看到的就是「点了没反应」），只有控制台一行红字。
     *
     * @param {{ toolId: string, args: object, ask: boolean }} request - 请求。
     * @returns {{ delivered: boolean, reason: string }} 投递结果。
     */
    deliver(request) {
      const ctx = RF.ctx;
      if (ctx === undefined || ctx === null) return { delivered: false, reason: 'no-remote' };
      const sessionId = RF.currentSessionId;
      if (sessionId === undefined || sessionId === '') return { delivered: false, reason: 'no-session' };

      try {
        // ⚠️ `ctx.remote.session` 读的是**服务名 `remote.session`**：宿主把每个
        // Remote 命名空间各注册成一个独立服务键
        // （`packages/api/session-controller/src/client/index.ts`）。
        // 不在 `RF.CLIENT_INJECT` 里声明它，宿主就会抛
        // `cannot get property "remote.session" without inject`。
        //
        // 宿主**没有**「客户端直接执行工具」的 API（已在真实宿主上核实）：
        // `remote.commands` 是斜杠命令通道 `execute(agentId, line, attachments)`，
        // 不是工具执行器，读它反而触发注入守卫。
        // 唯一的通道是**会话指令**：把工具 id 与参数拼成一句话投进当前会话，
        // 由模型去调对应工具。宿主半靠 `RF.TOOL_CALL_PROMPT_PREFIX` 把这句话
        // 从「用户输入」里排除（`src/core/inputCapture.js`）。
        const session = ctx.remote.session;
        if (session === undefined || session === null || typeof session.prompt !== 'function') {
          return { delivered: false, reason: 'no-transport' };
        }
        const outcome = session.prompt({
          requestId: RF.newRequestId(),
          sessionId,
          // 「排队」不是「插队」：点按钮不该打断正在跑的那一轮。
          mode: 'queue',
          content: [{
            type: 'text',
            // 前缀冻结在 `RF.TOOL_CALL_PROMPT_PREFIX`：宿主半靠它把工作台自己
            // 发出的指令从「用户输入」里排除（`src/core/inputCapture.js`）。
            text: `${RF.TOOL_CALL_PROMPT_PREFIX}${request.toolId}，参数 ${JSON.stringify(request.args)}`,
          }],
        });
        // 宿主拒收 / 传输失败 ⇒ **可见失败**，不能当成已经生效。
        if (outcome !== undefined && typeof outcome.then === 'function') {
          outcome.then(
            (result) => {
              if (result !== null && typeof result === 'object' && result.ok === false) {
                RF.actions.reportRefused(request, result.error?.message ?? '');
              }
            },
            (error) => { RF.actions.reportRefused(request, String(error)); },
          );
        }
        return { delivered: true, reason: 'session-prompt' };
      } catch (error) {
        // 通道不可用**不是**用户能理解的错误：降级到「可见失败 + 可重放」路径，
        // 绝不让一次点击把整条链炸掉。
        console.warn('[reelforge] tool transport unavailable:', error);
        return { delivered: false, reason: 'transport-unavailable' };
      }
    },

    /**
     * 发起一次工具调用。
     *
     * @param {string} toolId - 工具 id。
     * @param {object} args - 参数。
     * @param {{ ask?: boolean }} [options] - 选项。
     * @returns {{ toolId: string, args: object, ask: boolean }} 请求记录（形状不变）。
     */
    callTool(toolId, args, options) {
      const ask = options?.ask !== false && RF.TRIGGER_TOOL_IDS.indexOf(toolId) >= 0;
      const request = { toolId, args: args ?? {}, ask };
      RF.actions.requests.push(request);
      const delivery = RF.actions.deliver(request);
      if (!delivery.delivered) {
        // 投递不出去 ⇒ 入队 + 可见失败，绝不静默丢。
        RF.actions.pending.push({
          toolId: request.toolId,
          args: request.args,
          ask: request.ask,
          reason: delivery.reason,
          at: Date.now(),
          attempts: 0,
        });
        RF.notify({
          level: 'error',
          toolId: request.toolId,
          message: RF.actions.describeUndelivered(request),
        });
        // 诊断信息，保留；但**不是**唯一的失败信号（用户可见路径是上面那条通知）。
        console.warn('[reelforge] tool request has no client transport:', request);
      }
      return request;
    },

    /**
     * 拼一句「缺什么、给什么替代」的文案。
     * @param {{ toolId: string }} request - 请求。
     * @returns {string} 文案。
     */
    describeUndelivered(request) {
      const prefix = TOOL_HINT_KEYS[request.toolId];
      const label = prefix === undefined ? RF.tr('notice.unknownTool') : RF.tr(`${prefix}.label`);
      const say = prefix === undefined ? RF.tr('notice.sayFallback') : RF.tr(`${prefix}.say`);
      return RF.tr('notice.undelivered', { label, say });
    },

    /**
     * 宿主拒收 / 传输失败 ⇒ **可见失败**。
     *
     * 已经投出去但宿主没接受，和「根本投不出去」是两回事：文案要分开说，
     * 不能都报成「还没接上工具通道」。
     *
     * @param {{ toolId: string, args: object, ask: boolean }} request - 请求。
     * @param {string} reason - 宿主给的原因（可空）。
     * @returns {void}
     */
    reportRefused(request, reason) {
      const prefix = TOOL_HINT_KEYS[request.toolId];
      const label = prefix === undefined ? RF.tr('notice.unknownTool') : RF.tr(`${prefix}.label`);
      const say = prefix === undefined ? RF.tr('notice.sayFallback') : RF.tr(`${prefix}.say`);
      RF.notify({
        level: 'error',
        toolId: request.toolId,
        message: RF.tr('notice.hostRefused', { label, say, reason: reason ?? '' }),
      });
      console.warn('[reelforge] host refused the tool request:', request, reason);
    },

    /**
     * 重放待办队列：逐条再投一次，投出去的出队，投不出去的留下并累加尝试次数。
     *
     * @returns {{ delivered: number, remaining: number }} 结果。
     */
    retryPending() {
      const remaining = [];
      let delivered = 0;
      for (const entry of RF.actions.pending) {
        const request = { toolId: entry.toolId, args: entry.args, ask: entry.ask };
        const result = RF.actions.deliver(request);
        if (result.delivered) {
          delivered += 1;
          RF.actions.requests.push(request);
        } else {
          remaining.push({ ...entry, attempts: (entry.attempts ?? 0) + 1 });
        }
      }
      // 原地改写，保留数组身份（UI 可能已经持有引用）。
      RF.actions.pending.length = 0;
      for (const entry of remaining) RF.actions.pending.push(entry);
      if (delivered > 0) {
        RF.notify({ level: 'info', message: RF.tr('notice.replayed', { count: delivered }) });
      }
      if (remaining.length > 0) {
        RF.notify({
          level: 'error',
          message: RF.tr('notice.stillPending', { count: remaining.length }),
        });
      }
      return { delivered, remaining: remaining.length };
    },
  };

  /**
   * 通知钩子：默认实现**不依赖宿主 API**，纯前端即可工作。
   *
   * - 默认实现：把结构化通知塞进 `RF.actions.notices`（UI 可读、可清）；
   * - 可替换：宿主或 UI 可以整体换掉 `RF.notify`，也可以用 `RF.onNotice` 订阅 ——
   *   这样将来接上真正的「直接执行工具」通道时，**这里一行都不用改**。
   *
   * @param {{ level: string, toolId?: string, message: string }} notice - 通知。
   * @returns {object} 原样返回这条通知。
   */
  RF.notify = function notify(notice) {
    RF.actions.notices.push(notice);
    for (const listener of RF.actions.listeners.slice()) {
      try {
        listener(notice);
      } catch (error) {
        console.error('[reelforge] notice listener failed:', error);
      }
    }
    return notice;
  };

  /**
   * 订阅通知（与替换 `RF.notify` 二选一或并用）。
   * @param {(notice: object) => void} listener - 监听器。
   * @returns {function} 退订函数。
   */
  RF.onNotice = function onNotice(listener) {
    if (typeof listener !== 'function') return () => undefined;
    RF.actions.listeners.push(listener);
    return () => {
      const index = RF.actions.listeners.indexOf(listener);
      if (index >= 0) RF.actions.listeners.splice(index, 1);
    };
  };

  /**
   * 注入插件自有样式（只用 `--dsw-alias-*` token）。
   * @returns {function} 清理函数。
   */
  RF.injectStyles = function injectStyles() {
    if (typeof document === 'undefined') return () => {};
    const tag = document.createElement('style');
    tag.dataset.plugin = RF.TAB_TYPE_ID;
    tag.dataset.pluginCss = `${RF.TAB_TYPE_ID}/workbench.css`;
    tag.textContent = RF.STYLES;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  };

  /**
   * 客户端插件主体。
   * @param {object} ctx - 客户端根上下文。
   * @returns {void}
   */
  RF.apply = function apply(ctx) {
    RF.ctx = ctx;
    RF.React = RF.React ?? (typeof React === 'undefined' ? undefined : React);

    ctx.effect(() => RF.injectStyles(), 'reelforge: styles');
    ctx.effect(() => ctx.locale.register(RF.NAMESPACE, RF.locale), 'reelforge: dictionaries');
    const t = ctx.locale.bind(RF.NAMESPACE);
    RF.t = t;
    RF.chatRows.t = t;

    // ── 阶段一：Tab **类型**（id 是类型身份，全局唯一） ──
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: RF.TAB_TYPE_ID,
      kind: RF.TAB_KIND,
      title: () => t('title'),
      guide: [{ id: 'reelforge-workbench', order: 0, title: () => t('title'), description: () => t('subtitle') }],
    }), 'reelforge: workbench tab type');

    // ── 阶段二：页面体（插槽 key = definition.id，**不是 kind**） ──
    // ⚠️ `inject: (sessionId) => ({ sessionId })` **不能少**：右栏页签体是
    // **会话作用域**插槽，只有声明了这个 inject 面，宿主才会把会话 id 递进来
    // （宿主做法见 `packages/client/ui-sidebar-browser/src/client/index.ts`：
    // `inject: (sessionId, actions) => {...}`）。
    // 没有它 → `props.sessionId` 是 undefined → `RF.currentSessionId` 永远是空
    // → 写操作（回滚 / 生成 / 改时长）**全部投递不出去**。
    ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: RF.TAB_TYPE_ID,
      locale: RF.NAMESPACE,
      inject: sessionId => ({ sessionId }),
    }, RF.Workbench)), 'reelforge: workbench body');

    // ⚠️ `locale: RF.NAMESPACE` **不能少**：宿主只在注册声明了 `locale:` 时
    // 才往组件 props 里注入 `t`（`packages/client/ui-renderer/.../scoped-slots.tsx`）。
    // 少了这一行，`RF.WorkbenchTitle` 就退到 `(key) => key` 的兜底，
    // 右栏页签胶囊上会显示字面量 **title** 而不是「ReelForge 工作台」。
    ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab.title',
      key: RF.TAB_TYPE_ID,
      locale: RF.NAMESPACE,
    }, RF.WorkbenchTitle)), 'reelforge: workbench title');

    // ── 7 类对话消息行：视图注册在 `conversation.chat.node`，键为事件定义的 kind ──
    for (const kind of RF.CHAT_ROW_KINDS) {
      const view = RF.CHAT_ROW_VIEWS[kind];
      ctx.effect(() => ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: kind,
        locale: RF.NAMESPACE,
      }, view)), `reelforge: chat row ${kind}`);
    }

    // ── 投影订阅：把宿主投影喂进模块级单例（R14） ──
    ctx.effect(() => RF.bindProjection(ctx), 'reelforge: projection binding');

    // ── 7 个 kind 的事件定义（挂已有的 `tool/result`，不新增会话事件 type） ──
    ctx.inject(['uiConversation'], (scoped) => {
      RF.registerChatEvents(scoped);
    });

    // ── 快捷键 ──
    RF.registerShortcuts(ctx);
  };
})(RF);


    // ⚠️ `inject` 不能少：宿主把模块导出当对象插件传给 Loader，
    // 不声明宿主服务，客户端整条 fiber 会失败（cordis 的 inject 守卫）。
    return { inject: RF.CLIENT_INJECT, apply: RF.apply };
  },
});
