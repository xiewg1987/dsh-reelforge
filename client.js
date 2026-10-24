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

  /**
   * 项目视图的 7 个页签（RF7 §6.4「Tab 条固定 7 项」）。
   *
   * ⚠️ 这是 `src/core/constants.js` 里 `WORKBENCH_TABS` 的**字面镜像**
   * （F8 门禁逐项比对）—— 改一处必须改两处。
   *
   * 顺序 = 枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志。
   * 「技能」不在页签里（RF7 把它改成流程屏 `skills`）。
   */
  RF.WORKBENCH_TABS = [
    { id: 'hub', labelKey: 'hub' },
    { id: 'chapters', labelKey: 'chapters' },
    { id: 'assets', labelKey: 'assets' },
    { id: 'shots', labelKey: 'shots' },
    { id: 'context', labelKey: 'context' },
    { id: 'output', labelKey: 'output' },
    { id: 'log', labelKey: 'log' },
  ];

  /** 6 步进度条（需求 · 运行 · 方案 · 生成 · 分镜 · 交付）。 */
  RF.STAGE_STEPS = ['requirement', 'run', 'plan', 'generate', 'storyboard', 'deliver'];

  /**
   * 流程屏（RF7 的 8 块流程屏形态画板）—— **项目视图之外**的独立屏。
   *
   * RF7 画板索引 §八：流程屏 = RunGate · Settings · Intake · ProjectSettings ·
   * Stages · ShotDetail · Music · Skills；规范板 = Degraded · Picker。
   */
  RF.FLOW_SCREENS = ['runGate', 'settings', 'intake', 'projectSettings', 'stages', 'shotDetail', 'music', 'skills'];

  /** 规范板（规则层，不是主流程的一环）。 */
  RF.SPEC_SCREENS = ['degraded', 'picker'];

  /** 每块流程屏 / 规范板归在 6 步进度条的哪一步（与 RF7 画板索引逐块一致）。 */
  RF.FLOW_SCREEN_STEPS = {
    runGate: 'run',
    settings: 'run',
    intake: 'requirement',
    projectSettings: 'requirement',
    stages: 'generate',
    shotDetail: 'storyboard',
    music: 'deliver',
    skills: 'generate',
    degraded: 'run',
    picker: 'generate',
  };

  /**
   * 6 步进度条每一步点下去落到哪一屏。
   *
   * ⚠️ 「方案」这一步 RF7 没有对应画板（旧 Plan 板被撤了），
   * 落**页签「章节」**（那块的副标题就是「先骨架 · 再逐章生成」）—— 待 owner 确认项。
   */
  RF.STAGE_STEP_TARGETS = {
    requirement: { kind: 'flow', screen: 'intake' },
    run: { kind: 'flow', screen: 'runGate' },
    plan: { kind: 'tab', tab: 'chapters' },
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

  /**
   * 注入标题固定三个，生成时拼进提示词，标题不能自创
   * （`src/core/constants.js` 的 `CONTEXT_INJECTION_TITLES` 镜像，F8 门禁比对）。
   */
  RF.CONTEXT_INJECTION_TITLES = {
    bible: '【人物圣经（一致性锚点，后续所有生成必须遵守）】',
    style: '【风格指南（统一画风/光线/色调）】',
    continuity: '【连续性记录】',
  };

  /**
   * 上下文注入顺序（`src/core/constants.js` 的 `CONTEXT_INJECTION_ORDER` 镜像）。
   *
   * ⚠️ 注入的**顺序**是契约的一部分（bible → style → continuity），
   * 界面上的「注入预览」必须按这个顺序显示 —— 所以顺序本身也要有客户端镜像，
   * 不能在前端另写一份（F8 门禁比对）。
   */
  RF.CONTEXT_INJECTION_ORDER = ['bible', 'style', 'continuity'];

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
      // RF7 §6.4 的 7 个页签：枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志
      'tab.hub': '枢纽',
      'tab.chapters': '章节',
      'tab.shots': '分镜',
      'tab.assets': '素材',
      'tab.context': '上下文',
      'tab.skills': '技能',
      'tab.output': '成片',
      'tab.log': '日志',
      'footer.position': '第 {chapter} 章 · 第 {shot} / {shots} 镜',
      'footer.idle': '还没有开始生成',
      'action.viewOutput': '查看成片',
      // ── 按屏外壳（Header 胶囊 / Footer 三件套）──
      // 设计稿 17 块板每块都不同；owner 裁决「按屏变化」（Q1 / Q3）。
      'chrome.hub.footerLabel': '当前阶段',
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
      'flow.intake.action': '确认并继续',
      'flow.guide.title': 'ReelForge',
      'flow.guide.subtitle': '在 DSH 里把小说做成按章短剧',
      'flow.guide.footerLabel': '建议',
      'flow.guide.footerValue': '从导入正文开始',
      'flow.guide.action': '打开导入页',
      'flow.guide.heroTitle': '六步走完，对话和右栏都可以',
      'flow.guide.heroSub': '在对话里说需求，或在右栏点按 —— 两边同步，不会各走各的。',
      'flow.guide.stepsLabel': '六步总览',
      'flow.guide.go': '前往',
      'flow.guide.step.requirement': '导入小说并自动拆章',
      'flow.guide.step.run': '选本地或云端，必要时做本机探测',
      'flow.guide.step.plan': '按 kind 与位置出执行路径',
      'flow.guide.step.generate': '勾选四阶段并开始跑',
      'flow.guide.step.storyboard': '在分镜表里改镜头与时长',
      'flow.guide.step.deliver': '合成按章成片并导出',
      'flow.guide.target.intake': '→ 02 导入',
      'flow.guide.target.runstack': '→ 03 运行栈',
      'flow.guide.target.plan': '→ 05 执行路径',
      'flow.guide.target.stages': '→ 06 执行阶段',
      'flow.guide.target.shots': '→ 09 分镜表',
      'flow.guide.target.output': '→ 10 成片',
      'flow.runstack.title': '运行与环境',
      'flow.runstack.subtitle': '选位置 · 选 provider · 本机探测',
      'flow.runstack.footerLabel': '下一步',
      'flow.runstack.footerValue': '出执行路径',
      'flow.runstack.action': '继续',
      'v6.chapterUnit': '一章一集',
      'v6.dualEntry.chat': '在对话里说需求',
      'v6.dualEntry.panel': '在右栏点按',
      'v6.chatSync.empty': '对话与右栏尚未同步：写需求或导入正文即可开始。',
      'v6.chatSync.captured': '对话已同步：已捕获需求，导入正文后会拆章。',
      'v6.chatSync.imported': '对话已同步：导入 {count} 章 · {pending}',
      'v6.chatSync.needRun': '待运行位置确认',
      'v6.chatSync.ready': '可继续执行',
      'v6.cost': '¥{spent} / ¥{cap}',
      'v6.hub.chapterProgress': '章节进度',
      'v6.hub.shotScript': '镜头脚本',
      'v6.hub.noShots': '这一章还没有镜头脚本，跑完 llm 阶段后会出现在这里。',
      'v6.hub.moreShots': '还有 {count} 镜',
      'v6.hub.nextHint': '也可在对话里说：继续跑 image',
      'v6.guide.openIntake': '打开引导',
      'v6.runstack.deviceSection': '本机探测（仅 local）',
      'v6.runstack.deviceCloudSkip': '云端模式无需设备检查',
      'v6.runstack.devicePending': '正在读取本机探测结果…',
      'v6.probe.title': '本机环境（第一步预检）',
      'v6.probe.loading': '正在探测 ComfyUI / 显存 / ffmpeg …',
      'v6.probe.ok': '预检完成：{count} 项已通过，可继续导入与选运行位置',
      'v6.probe.blockers': '预检发现 {count} 项阻塞：{first}',
      'v6.probe.warnings': '预检有 {count} 项未通过，建议先看运行栈',
      'v6.probe.recheck': '重新探测',
      'v6.probe.detail': '查看详情',
      'v6.runstack.deviceSummary': '已探测 {count} 项，展开查看详情',
      'v6.runstack.expand': '展开探测',
      'v6.runstack.collapse': '收起',
      'v6.runstack.askCloud': '云端模式下无需设备检查，可直接继续。',
      'v6.runstack.askLocal': '本地模式建议展开并完成探测，再选执行路径。',
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
      'empty.hub': '还没有章节。从引导页导入正文，或直接在对话里说需求。',
      'empty.hubHint': '下一步：先做运行与环境检测，再导入正文。',
      'v6.firstRun.openRunStack': '运行与环境检测',
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

      // ── RF7（design/DESIGN-评审稿-RF7.md · 18 块板）────────────────────
      'rf7.status.done': '完成',
      'rf7.status.generating': '生成中',
      'rf7.status.failed': '失败',
      'rf7.status.pending': '待生成',

      'rf7.chatSync.empty': '还没有同步内容：在对话框里说的话会出现在这里。',
      'rf7.chatSync.imported': '对话已同步：{count} 章已写入项目（{pending}）',
      'rf7.chatSync.needRun': '还没跑阶段',
      'rf7.chatSync.ready': '已进入运行',
      'rf7.chatSync.captured': '对话已同步：正文已写入项目',

      'rf7.hub.title': '枢纽',
      'rf7.hub.subtitle': '章节 · 镜头摘要 · 成本',
      'rf7.hub.capsule.empty': '还没有章节',
      'rf7.hub.capsule.planned': '待生成',
      'rf7.hub.capsule.running': '进行中',
      'rf7.hub.costLabel': '成本',
      'rf7.hub.stageLabel': '当前阶段',
      'rf7.hub.stageUnset': '未选方案',
      'rf7.hub.kindUnset': '未选生成方式',
      'rf7.hub.stageSub': '第 {chapter} 章 · {done} / {total} 步',
      'rf7.hub.chapterTitle': '第 {chapter} 章 · {title}',
      'rf7.hub.chapterMeta': '{shots} 镜 · {duration}',
      'rf7.hub.sectionChapters': '章节进度',
      'rf7.hub.sectionShots': '镜头脚本',
      'rf7.hub.sectionShotsSub': '按章 idx',
      'rf7.hub.shotId': 'C{seq}-S{idx}',
      'rf7.hub.shotSizeUnknown': '未标注景别',
      'rf7.hub.moreShots': '还有 {count} 镜待生成',
      'rf7.hub.viewAll': '查看全部 {count} 镜',
      'rf7.hub.footerLabel': '当前阶段',
      'rf7.hub.footerValue.empty': '还没有章节',
      'rf7.hub.footerValue.generating': '第 {chapter} 章生成中 · 成片未就绪',
      'rf7.hub.footerValue.ready': '第 {chapter} 章已出片 · {count} 个交付物',
      'rf7.hub.empty.title': '这个项目还没有章节',
      'rf7.hub.empty.hint': '先粘贴小说原文，自动拆章后再回到这里看全局。',
      'rf7.hub.empty.action': '去新建项目',
      'rf7.hub.action': '查看成片',
      'rf7.hub.actionDisabled': '成片还没生成：先把 video 阶段跑完，交付物会出现在「成片」页签。',
      // ── 屏间入口：项目设置 / 技能与工作流（RF7 把「技能」从页签挪成了流程屏，
      //    所以枢纽是它唯一的落点；项目设置对应 EditProject.jsx）──
      'rf7.hub.actProjectSettings': '项目设置',
      'rf7.hub.actSkills': '技能与工作流',

      'rf7.chapters.title': '章节',
      'rf7.chapters.subtitle': '先骨架 · 再逐章生成',
      'rf7.chapters.capsule': '{count} 章',
      'rf7.chapters.footerLabel': '章节',
      'rf7.chapters.footerValue': '{chapters} 章 · {shots} 镜',
      'rf7.chapters.chapterTitle': '第 {chapter} 章',
      'rf7.chapters.shotsMeta': '{shots} 镜 · {duration}',
      'rf7.chapters.noShots': '暂无分镜',
      'rf7.chapters.actAdd': '新增章节',
      'rf7.chapters.actGenerateAll': '生成全部章节',
      'rf7.chapters.actGenerate': '生成',
      'rf7.chapters.actEdit': '编辑',
      'rf7.chapters.actMore': '操作',
      'rf7.chapters.actEditDisabled': '插件还没有改章节的工具：改标题 / 删章要让助手在对话里做。',
      'rf7.chapters.actMoreDisabled': '插件还没有章节操作菜单：章节的复制 / 排序先在对话里做。',
      'rf7.chapters.notice': '章节是独立的成片单元：可以只跑一章，也可以续跑上次没跑完的。',
      'rf7.chapters.noticeSub': '素材库全项目共用，不必每章重做。',
      'rf7.chapters.action': '生成全部章节',
      'rf7.chapters.actionDisabled': '还没有正文：先在「新建项目」里粘贴原文或上传 .txt。',

      'rf7.assets.title': '素材库',
      'rf7.assets.subtitle': '人物 · 场景 · 道具 · 变体',
      'rf7.assets.capsule': '{count} 项',
      'rf7.assets.chipAll': '全部 {count}',
      'rf7.assets.footerLabel': '素材',
      'rf7.assets.footerValue': '{count} 项',
      'rf7.assets.actCreate': '新建资产',
      'rf7.assets.actGenerate': '生成图',
      'rf7.assets.actReplace': '上传替换',
      'rf7.assets.stateReady': '已就绪',
      'rf7.assets.noDescription': '没有描述',
      'rf7.assets.more': '还有 {count} 项 · 音效 / 视频 / 参考',
      'rf7.assets.viewAll': '查看全部 {count} 项',
      'rf7.assets.gapTitle': '{count} 个分镜缺参考图，video 阶段会直接报错（硬依赖 image）。',
      'rf7.assets.gapSub': '补齐参考图才能跑 video 阶段。',
      'rf7.assets.action': '新建资产',
      'rf7.assets.actionDisabled': '新建资产要填分类和名字：用上方素材库里的「新建资产」入口。',

      'rf7.storyboard.title': '分镜审查',
      'rf7.storyboard.subtitle': '逐镜预览 · 不满意就重来',
      'rf7.storyboard.capsule': '{count} 镜',
      'rf7.storyboard.footerLabel': '分镜',
      'rf7.storyboard.footerValue': '{count} 镜 · {pending} 待审',
      'rf7.storyboard.duration': '{seconds}s',
      'rf7.storyboard.refCharacter': '角色',
      'rf7.storyboard.refScene': '场景',
      'rf7.storyboard.refProp': '道具',
      'rf7.storyboard.promptLine': '镜头 {size} · 参考素材与提示词',
      'rf7.storyboard.sectionSelected': '选中镜 · 分镜 {idx}',
      'rf7.storyboard.sectionSelectedSub': '参考素材与提示词',
      'rf7.storyboard.sectionRegenerate': '重新生成',
      'rf7.storyboard.actSeed': '换一个种子',
      'rf7.storyboard.actRewrite': '按反馈改写',
      'rf7.storyboard.feedbackPlaceholder': '写下不满意的地方，例如「车帘再慢一点」',
      'rf7.storyboard.empty.title': '还没有分镜',
      'rf7.storyboard.empty.hint': '先跑 llm 阶段产出分镜，再回到这里逐镜看。',
      'rf7.storyboard.action': '重新生成选中镜',
      'rf7.storyboard.actionDisabled': '还没有分镜：先跑 llm 阶段产出分镜。',
      // ── 屏间入口：分镜详情（画板 07 是列表、画板 08 是单镜展开）──
      'rf7.storyboard.actDetail': '查看分镜详情',
      'rf7.storyboard.actDetailDisabled': '还没有分镜：先跑 llm 阶段产出分镜。',

      'rf7.context.title': '上下文',
      'rf7.context.subtitle': '生成前必须齐的三把钥匙',
      'rf7.context.capsule.ready': '三键齐',
      'rf7.context.capsule.missing': '缺 {missing} 把',
      'rf7.context.footerLabel': '上下文',
      'rf7.context.footerValue': '{ready} / {total} 键齐备 · 连续性 {continuity} 条',
      'rf7.context.bibleTitle': '人物圣经',
      'rf7.context.bibleMeta': '人物锚点与场景站位表',
      'rf7.context.styleTitle': '风格指南',
      'rf7.context.styleMeta': '统一画风 / 光线 / 色调',
      'rf7.context.continuityTitle': '连续性记录',
      'rf7.context.continuityMeta': '跨章连续性事实与冲突',
      'rf7.context.stateReady': '已就绪',
      'rf7.context.stateMissing': '未写入',
      'rf7.context.actView': '查看',
      'rf7.context.actWrite': '从对话写入',
      'rf7.context.actWriteDisabled': '插件没有「从对话写入上下文」这个动作：让助手在对话里写三键，锚点会随每次生成注入。',
      'rf7.context.sectionInject': '注入预览',
      'rf7.context.sectionInjectSub': '每次生成时固定注入这三段',
      'rf7.context.rule1': '只有 bible / style / continuity 三键，多写一个会直接报错。',
      'rf7.context.rule2': 'bible 每次写入前先读回现有内容，不覆盖已有人物与衣橱。',
      'rf7.context.action': '冻结锚点',
      'rf7.context.actionDisabled': '还没有「冻结锚点」这个动作：让助手在对话里写入三键即可，锚点随每次生成注入。',

      'rf7.output.title': '成片',
      'rf7.output.subtitle': '合成 · 字幕 · 交付',
      'rf7.output.capsule': '{count} 个',
      'rf7.output.footerLabel': '交付',
      'rf7.output.footerValue.empty': '还没有交付物',
      'rf7.output.footerValue': '第 {chapter} 章 {duration} · {count} 个交付物',
      'rf7.output.actDownload': '下载',
      // ── 屏间入口：背景音乐（画板 09 · 交付步）──
      'rf7.output.actMusic': '背景音乐',
      'rf7.output.deliverMeta': '{size}',
      'rf7.output.stateReady': '已生成',
      'rf7.output.fileMeta': '{size} · {time}',
      'rf7.output.untitled': '未命名成片',
      'rf7.output.playerPlaceholder': '成片预览 · 0:00 / 0:00',
      'rf7.output.sectionDeliver': '交付物',
      'rf7.output.sectionDeliverSub': '字幕双版本 + SRT',
      'rf7.output.sectionChapters': '章节',
      'rf7.output.chapterTitle': '第 {chapter} 章 · {title}',
      'rf7.output.chapterMeta': '{shots} 镜 · {duration}',
      'rf7.output.noChapters': '还没有章节',
      'rf7.output.empty.title': '还没有成片',
      'rf7.output.empty.hint': '跑完 video 阶段并合成后，文件会出现在这里。',
      'rf7.output.action': '下载成片',
      'rf7.output.actionDisabled': '还没有交付物：先把 video 阶段跑完再合成。',

      'rf7.log.title': '运行日志',
      'rf7.log.subtitle': '谁在什么时候改了什么',
      'rf7.log.capsule': '{count} 条',
      'rf7.log.footerLabel': '日志',
      'rf7.log.footerValue': '近 {count} 条变更',
      'rf7.log.sectionChanges': '变更记录',
      'rf7.log.sectionChangesSub': '每一步都可回滚',
      'rf7.log.sectionOutput': '运行输出',
      'rf7.log.sectionRollback': '回滚',
      'rf7.log.drifted': '已漂移',
      'rf7.log.empty.title': '还没有变更记录',
      'rf7.log.empty.hint': '每次写入内容都会在这里留一条。',
      'rf7.log.rollbackBatch': '按批次回滚',
      'rf7.log.rollbackTime': '按时间点回滚',
      'rf7.log.rollbackSingle': '回滚单条',
      'rf7.log.actRollback': '回滚',
      'rf7.log.actPick': '选择',
      'rf7.log.rollbackBatchDisabled': '变更日志里没有批次号，没法按批回滚：先用「回滚单条」。',
      'rf7.log.rollbackTimeDisabled': '变更日志里没有可选的时间点，没法按时间点回滚：先用「回滚单条」。',
      'rf7.log.rollbackNote': '回滚只恢复内容，磁盘上的图片视频不会跟着删。',
      'rf7.log.action': '回滚本批',
      'rf7.log.actionDisabled': '还没有变更记录：改一次内容后这里就会有记录。',
      'rf7.log.actionNoBatch': '变更日志没有批次号：只能用「回滚单条」或「按时间点回滚」。',

      'rf7.runGate.title': '启动检查',
      'rf7.runGate.subtitle': '首次启动 · 环境就绪',
      'rf7.runGate.capsule': '{passed} / {total} 通过',
      'rf7.runGate.capsule.pending': '还没探测',
      'rf7.runGate.footerLabel': '下一步',
      'rf7.runGate.footerValue.pending': '正在探测本机环境…',
      'rf7.runGate.footerValue.failed': '{count} 项没通过，先修好再开跑',
      'rf7.runGate.footerValue.ready': '全部通过即可开跑',
      'rf7.runGate.summaryTitle': '环境检查',
      'rf7.runGate.summaryMeta': '{total} 项检查 · {passed} 通过 · {failed} 未通过 · {warned} 警告 · {unconfigured} 未配置',
      'rf7.runGate.pendingMeta': '还没探测',
      'rf7.runGate.probingMeta': '正在检测…',
      'rf7.runGate.actRerun': '重跑检查',
      'rf7.runGate.actStart': '开始检测',
      'rf7.runGate.pendingTitle': '还没检测',
      'rf7.runGate.pendingHint': '先选执行位置，再点「开始检测」；不符合本机要求时可直接选云端运行',
      'rf7.runGate.staleTitle': '这份结果不是当前执行位置的',
      'rf7.runGate.staleHint': '已按新位置重新检测，或点「重跑检查」',
      'rf7.runGate.sectionPosition': '执行位置',
      'rf7.runGate.sectionPositionSub': '同一批生成方式，差别只在跑在哪、算不算钱',
      'rf7.runGate.localTitle': '本地运行',
      'rf7.runGate.localSub': 'ComfyUI · 本机',
      'rf7.runGate.localFact1': '· 数据不出本机',
      'rf7.runGate.localFact2': '· 无按次计费',
      'rf7.runGate.cloudTitle': '云端运行',
      'rf7.runGate.cloudSub': '托管工作流 · 按需调度',
      'rf7.runGate.cloudFact1': '· 无需 GPU',
      'rf7.runGate.cloudFact2': '· 按次计费',
      'rf7.runGate.sectionChecks': '检查项',
      'rf7.runGate.checkComfy': 'ComfyUI 服务',
      'rf7.runGate.checkLlm': 'LLM 接口',
      'rf7.runGate.checkAgent': 'Agent 运行时',
      'rf7.runGate.checkFfmpeg': 'ffmpeg',
      'rf7.runGate.checkDisk': '磁盘可用',
      'rf7.runGate.checkVram': '显存预估',
      'rf7.runGate.checkCloud': '云端账号',
      'rf7.runGate.check.comfy': 'ComfyUI 服务',
      'rf7.runGate.check.llm': 'LLM 接口',
      'rf7.runGate.check.ffmpeg': 'ffmpeg',
      'rf7.runGate.check.disk': '磁盘可用',
      'rf7.runGate.check.vram': '显存预估',
      'rf7.runGate.check.provider': '云端账号',
      'rf7.runGate.check.ckVersion': 'ComfyUI-Kernel 版本',
      'rf7.runGate.check.encoders': '视频编码器',
      'rf7.runGate.check.videoBackend': '视频后端',
      // CK 版本不单列（与「ComfyUI 服务」同一份数据）⇒ 结论拼进那一行的值里。
      'rf7.runGate.kernelOk': 'CK {version} 达标',
      'rf7.runGate.kernelFail': 'CK {version} 低于门槛 {min}',
      'rf7.runGate.kernelMissing': 'CK 版本号缺失',
      'rf7.runGate.agentValue': '随宿主（DSH 内置）',
      'rf7.runGate.pass': '通过',
      'rf7.runGate.warn': '警告',
      'rf7.runGate.fail': '未通过',
      'rf7.runGate.unconfigured': '未配置',
      'rf7.runGate.builtin': '宿主内置',
      'rf7.runGate.noticeMain': '探测只在本机跑 · 不上传任何文件',
      'rf7.runGate.noticeSub': '不符合本机要求时，可跳过探测直接走云端',
      'rf7.runGate.action': '开始生产',
      // ── 屏间入口 ──
      // RF7 的画板只画了每块板的**屏内**内容，没写屏间入口（除 Stage 轨 3 步 + 页签 7 项）；
      // 这两条按画板语义补：服务配置与 RunGate 同源（SettingsPage.jsx），
      // 失败清单对应规范板「降级与失败」。属对画板的补充，待 owner 复核。
      'rf7.runGate.actSettings': '服务配置',
      'rf7.runGate.actFailures': '查看失败清单',

      'rf7.settings.title': '服务配置',
      'rf7.settings.subtitle': 'ComfyUI · LLM · 运行时',
      'rf7.settings.capsule': '只读',
      'rf7.settings.footerLabel': '设置',
      'rf7.settings.footerValue': '只读 · 配置在插件 config 里',
      'rf7.settings.sectionComfy': 'ComfyUI',
      'rf7.settings.sectionComfySub': '本地渲染服务',
      'rf7.settings.labelAddress': '服务地址',
      'rf7.settings.labelBaseUrl': 'Base URL',
      'rf7.settings.labelModel': '模型',
      'rf7.settings.labelApiKey': 'API Key',
      'rf7.settings.actTest': '测试连接',
      'rf7.settings.testHint': '点一次「测试连接」会重跑本机探测',
      'rf7.settings.sectionLlm': 'LLM（OpenAI 兼容）',
      'rf7.settings.sectionLlmSub': 'Agent 的大脑',
      'rf7.settings.llmNotice': 'LLM 配置由宿主管理，插件读不到。',
      'rf7.settings.llmNoticeSub': 'Base URL / 模型 / API Key 在 DSH 的模型设置里改。',
      'rf7.settings.sectionRuntime': 'Agent 运行时',
      'rf7.settings.sectionRuntimeSub': '默认内置，也可交给本机 CLI',
      'rf7.settings.runtimeBuiltin': '内置 openclaude',
      'rf7.settings.runtimeClaudeCode': 'Claude Code',
      'rf7.settings.runtimeCodex': 'Codex',
      'rf7.settings.runtimeGemini': 'Gemini',
      'rf7.settings.runtimeCustom': '自定义',
      'rf7.settings.runtimeDisabled': '运行时还不能在这里切换：改运行时要在插件配置里设（这一屏是只读的）。',
      'rf7.settings.sectionMaintenance': '生成维护',
      'rf7.settings.rowFree': '显存释放间隔',
      'rf7.settings.valueFree': '3 次',
      'rf7.settings.rowTimeout': '单任务超时',
      'rf7.settings.valueTimeout': '90 分钟',
      'rf7.settings.rowCloudKey': 'RunningHub Key',
      'rf7.settings.valueCloudKey': '未配置',
      'rf7.settings.stateAdjustable': '可调',
      'rf7.settings.stateNotLoggedIn': '未登录',
      'rf7.settings.unset': '未配置',
      'rf7.settings.readonlyTitle': '这一屏是只读的',
      'rf7.settings.readonlySub': '插件没有写配置的通道：改地址、密钥、维护参数要编辑插件的 config 块（预算上限 ¥{budget} · 已开阶段 {stages} 个）。',
      'rf7.settings.action': '保存并重测',
      'rf7.settings.actionDisabled': '插件没有写配置的通道：改配置请编辑插件的 config 块；「测试连接」按钮可以重跑探测。',

      'rf7.intake.title': '新建项目',
      'rf7.intake.subtitle': '小说 · 剧本 · 一句话',
      'rf7.intake.capsule.ready': '正文已写入',
      'rf7.intake.capsule.empty': '待导入',
      'rf7.intake.footerLabel': '下一步',
      'rf7.intake.footerValue': '拆章并建立项目',
      'rf7.intake.labelName': '项目名',
      'rf7.intake.namePlaceholder': '项目名，例如《妈妈的时间》',
      'rf7.intake.labelStyle': '画风',
      'rf7.intake.styleRealistic': '写实',
      'rf7.intake.styleAnime': '二次元',
      'rf7.intake.styleComic': '国漫',
      'rf7.intake.style3d': '3D',
      'rf7.intake.styleSuspense': '悬疑',
      'rf7.intake.textPlaceholder': '粘贴小说原文，或上传 .txt；一句话想法也行',
      'rf7.intake.textHint': '自动拆章 · 一章一集 · 可从对话直接导入',
      'rf7.intake.specResolution': '分辨率',
      'rf7.intake.specAspect': '比例',
      'rf7.intake.specMusic': '背景音乐',
      'rf7.intake.on': '开',
      'rf7.intake.off': '关',
      'rf7.intake.sectionReferences': '参考图片素材',
      'rf7.intake.sectionReferencesSub': '可选 · 品牌 / 产品 / 角色定妆',
      'rf7.intake.refThumb': '参考图',
      'rf7.intake.refName': '参考图文件名',
      'rf7.intake.refUse': '用途：产品参考，生成时保持外观一致',
      'rf7.intake.actAddReference': '+ 选择参考图片',
      'rf7.intake.actRemove': '移除',
      'rf7.intake.actRemoveDisabled': '插件还没有移除参考图的动作：重新上传覆盖即可。',
      'rf7.intake.sectionChapters': '章节预览',
      'rf7.intake.sectionChaptersSub': '{count} 章 · 正文 {chars} 字',
      'rf7.intake.chapterMeta': '自动拆章 · 一章一集',
      'rf7.intake.noChapters': '还没有拆出章节',
      'rf7.intake.noChaptersHint': '粘贴正文后这里会显示自动拆章的结果。',
      'rf7.intake.actImport': '导入',
      'rf7.intake.actImportDisabled': '宿主只有「整本导入」这一个动作：先用底栏的「创建并打开」导入全文，这里就会列出章节。',
      'rf7.intake.action': '创建并打开',
      'rf7.intake.actionDisabled': '还没有正文：先在上面粘贴小说原文或上传 .txt，再点「创建并打开」。',

      'rf7.projectSettings.title': '项目设置',
      'rf7.projectSettings.subtitle': '规格 · 风格 · 字幕',
      'rf7.projectSettings.capsule': '只读',
      'rf7.projectSettings.footerLabel': '项目设置',
      'rf7.projectSettings.footerValue': '{resolution} · {aspect}',
      'rf7.projectSettings.sectionSpec': '成片规格',
      'rf7.projectSettings.rowResolution': '分辨率',
      'rf7.projectSettings.rowAspect': '比例',
      'rf7.projectSettings.rowStyle': '风格',
      'rf7.projectSettings.styleDefault': '写实 · 冷调',
      'rf7.projectSettings.sectionSubtitles': '字幕',
      'rf7.projectSettings.rowAutoSub': '自动添加字幕',
      'rf7.projectSettings.rowPosition': '烧录位置',
      'rf7.projectSettings.bottomCenter': '底部居中',
      'rf7.projectSettings.rowHideName': '隐藏角色名',
      'rf7.projectSettings.subtitleNote': '成片同时导出带字幕、不带字幕两版，外加 SRT 文件。',
      'rf7.projectSettings.sectionSound': '声音',
      'rf7.projectSettings.rowBgm': '生成背景音乐',
      'rf7.projectSettings.rowVoice': '语音合成',
      'rf7.projectSettings.voiceH3': 'H3 参考音色（flac）',
      'rf7.projectSettings.sectionDanger': '危险操作',
      'rf7.projectSettings.dangerText': '删除项目会连同资产、分镜与成片一起清除，不可恢复。',
      'rf7.projectSettings.dangerAction': '删除这个项目',
      'rf7.projectSettings.dangerDisabled': '插件还没有删除项目的动作：要让助手在对话里删除（宿主会二次确认）。',
      'rf7.projectSettings.unset': '未设置',
      'rf7.projectSettings.action': '保存设置',
      'rf7.projectSettings.actionDisabled': '插件还没有写项目设置的工具：分辨率 / 比例 / 字幕 / 声音要让助手在对话里改。',

      'rf7.stages.title': '生成执行',
      'rf7.stages.subtitle': '四阶段 · 实时进度',
      'rf7.stages.capsule': '{count} 个阶段',
      'rf7.stages.footerLabel': '当前阶段',
      'rf7.stages.footerValue': '{kind} · {stage}',
      'rf7.stages.footerValue.unset': '还没选生成方式',
      'rf7.stages.legendLlm': 'llm 完成',
      'rf7.stages.legendImage': 'image 进行中',
      'rf7.stages.legendTts': 'tts 待跑',
      'rf7.stages.legendVideo': 'video 待跑',
      'rf7.stages.currentTitle': '正在生成 · {kind}',
      'rf7.stages.currentSub': '任务详情',
      'rf7.stages.metaGpu': 'GPU —',
      'rf7.stages.metaVram': '显存 —',
      'rf7.stages.metaEta': '预计剩余 —',
      'rf7.stages.sectionQueue': '队列',
      'rf7.stages.sectionQueueSub': '接下来几个任务',
      'rf7.stages.queueEmpty': '队列是空的：没有等待中的任务。',
      'rf7.stages.sectionPicker': '本次要跑的阶段',
      'rf7.stages.stateEnabled': '已完成',
      'rf7.stages.stateDisabled': '待跑',
      'rf7.stages.stateUnset': '未选生成方式',
      'rf7.stages.desc.llm': '人物圣经 / 风格 / 拆章 / 拆分镜',
      'rf7.stages.desc.image': '人物 / 场景 / 道具 + 服装年龄变体',
      'rf7.stages.desc.tts': '只给有台词的角色设计音色',
      'rf7.stages.desc.video': '硬依赖 image；软依赖 tts',
      'rf7.stages.memMain': '每 3 次生成后自动释放 ComfyUI 显存',
      'rf7.stages.memSub': '下一批会重新加载模型（约 1–3 分）；也可立即释放',
      'rf7.stages.action': '暂停生成',
      'rf7.stages.actionDisabled': '还没有「暂停生成」这个能力：等本批跑完，或去「服务配置」调显存释放间隔。',

      'rf7.shotDetail.title': '分镜详情',
      'rf7.shotDetail.subtitle': '第 {chapter} 章 · 分镜 {idx}',
      'rf7.shotDetail.subtitle.empty': '还没有分镜',
      'rf7.shotDetail.headTitle': '分镜 {chapter} · {idx} · {label}',
      'rf7.shotDetail.meta': '时长 {duration}s · {ratio}',
      'rf7.shotDetail.capsule.done': '已生成',
      'rf7.shotDetail.capsule.pending': '待生成',
      'rf7.shotDetail.capsule.empty': '没有分镜',
      'rf7.shotDetail.footerLabel': '分镜',
      'rf7.shotDetail.footerValue': '{count} 镜 · {pending} 待审',
      'rf7.shotDetail.sectionReferences': '参考素材',
      'rf7.shotDetail.sectionReferencesSub': '角色 / 场景 / 道具 / 服装 / 语音（仅台词角色）',
      'rf7.shotDetail.noReferences': '这一镜还没有参考素材。',
      'rf7.shotDetail.duration': '{seconds}s',
      'rf7.shotDetail.sectionScript': '提示词 & 分镜脚本',
      'rf7.shotDetail.scriptLens': '镜头：{size}',
      'rf7.shotDetail.scriptMissing': '分镜脚本还没有写进投影：脚本由助手通过分镜写入工具落库，这一屏只显示已落库的参考与规格。',
      'rf7.shotDetail.sectionPrompt': '视频提示词',
      'rf7.shotDetail.promptMissing': '视频提示词还没有写进投影。',
      'rf7.shotDetail.promptMissingSub': '提示词随分镜一起写入；这里不编内容。',
      'rf7.shotDetail.empty.title': '还没有分镜',
      'rf7.shotDetail.empty.hint': '先跑 llm 阶段产出分镜，再回来看单镜详情。',
      'rf7.shotDetail.empty.action': '去分镜列表',
      'rf7.shotDetail.action': '重新生成此镜',
      'rf7.shotDetail.actionDisabled': '还没有分镜：先跑 llm 阶段产出分镜。',

      'rf7.music.title': '背景音乐',
      'rf7.music.subtitle': '生成 · 试听 · 应用',
      'rf7.music.capsule': '{count} 条',
      'rf7.music.footerLabel': '交付',
      'rf7.music.footerValue': '{count} 条音乐',
      'rf7.music.generateTitle': '生成新的背景音乐',
      'rf7.music.generatePlaceholder': '描述想要的音乐，如「克制钢琴，冷调，渐强」',
      'rf7.music.chipInstrumental': '纯音乐',
      'rf7.music.chipVocal': '带人声',
      'rf7.music.chipPiano': '钢琴',
      'rf7.music.chipStrings': '弦乐',
      'rf7.music.actGenerate': '生成',
      'rf7.music.chipsDisabled': '音乐风格还不能选：插件还没有生成音乐的工具。',
      'rf7.music.actGenerateDisabled': '插件还没有「生成音乐」的工具：让助手在对话里描述并生成音乐。',
      'rf7.music.sectionLibrary': '音乐库',
      'rf7.music.sectionLibrarySub': '一次生成可应用到多个章节',
      'rf7.music.stateApplied': '已应用',
      'rf7.music.actPreview': '预览',
      'rf7.music.actApply': '应用到章节',
      'rf7.music.actPreviewDisabled': '投影里没有音频文件路径，没有可播的地址：让助手先把音乐生成到工作区。',
      'rf7.music.actApplyDisabled': '「应用到章节」要工作区里的音乐文件路径，投影里没有：让助手先把音乐生成到工作区。',
      'rf7.music.emptyTitle': '音乐库还是空的',
      'rf7.music.emptySub': '投影里没有音乐条目：音乐资产要由助手在对话里生成并落库。',
      'rf7.music.note': '应用后会随成片一起合成；替换不删除原曲，可随时换回。',
      'rf7.music.action': '应用到第 1 章',
      'rf7.music.actionDisabled': '投影里没有音乐文件路径：让助手先把音乐生成到工作区，再应用。',

      'rf7.skills.title': '技能与工作流',
      'rf7.skills.subtitle': '装好的技能 · 新的工作流',
      'rf7.skills.capsule': '{count} 已装',
      'rf7.skills.footerLabel': '技能',
      'rf7.skills.footerValue': '{total} 已装 · 内置 {bundled} · 已装 {installed} · 自建 {generated}',
      'rf7.skills.sectionInstalled': '已装技能',
      'rf7.skills.sectionInstalledSub': '{count} 个 · 磁盘上的技能目录',
      'rf7.skills.stateReady': '可用',
      'rf7.skills.source.bundled': '内置 · 随包',
      'rf7.skills.source.installed': '已装 · 本机',
      'rf7.skills.source.generated': '自建 · 本机',
      'rf7.skills.empty.title': '还没有装技能',
      'rf7.skills.empty.hint': '把技能目录放进插件的技能目录，重启后就会出现在这里。',
      'rf7.skills.sectionIterate': '工作流自迭代',
      'rf7.skills.sectionIterateSub': '粘贴 ComfyUI 工作流 JSON',
      'rf7.skills.step1': '分析节点 · 推导工作流规格',
      'rf7.skills.step2': '注册工作流 · 起草 SKILL.md',
      'rf7.skills.dropHint': '把工作流 JSON 拖到这里',
      'rf7.skills.actAnalyze': '分析并注册',
      'rf7.skills.actAnalyzeDisabled': '插件还没有「分析工作流」的工具：把工作流 JSON 放进技能目录后由助手注册。',
      'rf7.skills.analyzed': '已分析',
      'rf7.skills.note': '新技能立刻可被 Agent 路由调用；不修改也能只注册工作流。',
      'rf7.skills.action': '安装新技能',
      'rf7.skills.actionDisabled': '插件还没有装技能的工具：把技能目录放进插件的技能目录即可被发现。',

      'rf7.degraded.title': '降级与失败',
      'rf7.degraded.subtitle': '不许静默降质',
      'rf7.degraded.capsule': '{count} 项降级',
      'rf7.degraded.footerLabel': '规范',
      'rf7.degraded.footerValue': '失败要说清代价与替代',
      'rf7.degraded.sectionBlocked': '阻塞',
      'rf7.degraded.sectionBlockedSub': '服务没起来就直说',
      'rf7.degraded.sectionWarning': '警告',
      'rf7.degraded.sectionWarningSub': '能跑但会打折',
      'rf7.degraded.sectionEmpty': '空态',
      'rf7.degraded.sectionEmptySub': '还没开始时说什么',
      'rf7.degraded.sectionMissing': '缺料',
      'rf7.degraded.sectionMissingSub': '缺的东西要点名',
      'rf7.degraded.missingTitle': '{count} 个分镜缺参考图',
      'rf7.degraded.missingSub': '分镜 {shots} 的参考图未生成，video 阶段会直接报错（硬依赖 image）。',
      'rf7.degraded.noMissingTitle': '没有缺料项',
      'rf7.degraded.noMissingSub': '每一镜的参考图都齐了。',
      'rf7.degraded.actFill': '去补齐',
      'rf7.degraded.softTitle': '软降级 · {count} 个角色没有音色',
      'rf7.degraded.softSub': '这些角色仍可跑，video 阶段不阻塞；出片会少一层人声质感。',
      'rf7.assets.gapNone': '没有分镜缺参考图。',
      'rf7.assets.gapNoShots': '还没有分镜，参考图缺口无从谈起。',
      'rf7.degraded.blockedHint': '只能走云端档，会按次计费；也可以先修本地再续跑。',
      'rf7.degraded.warningHint': '已自动降为分块编码，下一批会重新加载模型。',
      'rf7.degraded.noneTitle': '没有阻塞项',
      'rf7.degraded.noneSub': '这一批可以开跑。',
      'rf7.degraded.noWarningTitle': '没有警告项',
      'rf7.degraded.noWarningSub': '能力都齐。',
      'rf7.degraded.emptyTitle': '这个项目还没有章节',
      'rf7.degraded.emptySub': '粘贴小说原文，或直接说「用这句话做一集」。',
      'rf7.degraded.action': '查看失败清单',

      'rf7.picker.title': '素材选择器',
      'rf7.picker.subtitle': '弹窗形态 · 右侧栏内嵌',
      'rf7.picker.capsule': '已选 {count}',
      'rf7.picker.footerLabel': '规范',
      'rf7.picker.footerValue': '已选 {count} 个 · 上限 {limit} 张',
      'rf7.picker.searchPlaceholder': '搜角色 / 场景 / 道具',
      'rf7.picker.chipAll': '全部',
      'rf7.picker.chipCharacter': '角色',
      'rf7.picker.chipScene': '场景',
      'rf7.picker.chipProp': '道具',
      'rf7.picker.chipCostume': '服装',
      'rf7.picker.pickedThumb': '已选',
      'rf7.picker.pickedCount': '已选 {count} 个 · 参考图上限 {limit}',
      'rf7.picker.actClear': '清空',
      'rf7.picker.note': '只有出镜或出声的角色才占名额；参考图 ≤ 9、音视频 ≤ 3 是后端硬上限。',
      'rf7.picker.action': '确定',
      'rf7.picker.actionDisabled': '先选素材并选中要绑定的那一镜。',
      'rf7.picker.actionNoBindable': '选中的素材没有能绑到镜头的分类：只有角色 / 场景 / 道具 / 服装 / 年龄变体 / 语音能绑。',
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
      'tab.hub': 'Hub',
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
      'chrome.hub.footerLabel': 'Current stage',
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
      'flow.intake.action': 'Confirm and continue',
      'flow.guide.title': 'ReelForge',
      'flow.guide.subtitle': 'Turn a novel into chapter-based short drama inside DSH',
      'flow.guide.footerLabel': 'Tip',
      'flow.guide.footerValue': 'Start by importing the text',
      'flow.guide.action': 'Open import',
      'flow.guide.heroTitle': 'Six steps — chat or panel both work',
      'flow.guide.heroSub': 'Say what you want in chat, or tap through the panel — both stay in sync.',
      'flow.guide.stepsLabel': 'Six steps',
      'flow.guide.go': 'Go',
      'flow.guide.step.requirement': 'Import the novel and split chapters',
      'flow.guide.step.run': 'Pick local or cloud; probe the machine if needed',
      'flow.guide.step.plan': 'Choose kind × position for the run plan',
      'flow.guide.step.generate': 'Select stages and start the pipeline',
      'flow.guide.step.storyboard': 'Edit shots and timing in the storyboard',
      'flow.guide.step.deliver': 'Assemble per-chapter output and export',
      'flow.guide.target.intake': '→ 02 Import',
      'flow.guide.target.runstack': '→ 03 Run stack',
      'flow.guide.target.plan': '→ 05 Plan',
      'flow.guide.target.stages': '→ 06 Stages',
      'flow.guide.target.shots': '→ 09 Storyboard',
      'flow.guide.target.output': '→ 10 Output',
      'flow.runstack.title': 'Run & environment',
      'flow.runstack.subtitle': 'Position · provider · local probe',
      'flow.runstack.footerLabel': 'Next',
      'flow.runstack.footerValue': 'Execution plan',
      'flow.runstack.action': 'Continue',
      'v6.chapterUnit': 'One chapter, one episode',
      'v6.dualEntry.chat': 'Say it in chat',
      'v6.dualEntry.panel': 'Tap in the panel',
      'v6.chatSync.empty': 'Chat and panel not synced yet — write a brief or import text.',
      'v6.chatSync.captured': 'Synced: brief captured; import text to split chapters.',
      'v6.chatSync.imported': 'Synced: {count} chapters · {pending}',
      'v6.chatSync.needRun': 'Run position pending',
      'v6.chatSync.ready': 'Ready to continue',
      'v6.cost': '{spent} / {cap}',
      'v6.hub.chapterProgress': 'Chapter progress',
      'v6.hub.shotScript': 'Shot script',
      'v6.hub.noShots': 'No shots for this chapter yet — they appear after the llm stage.',
      'v6.hub.moreShots': '{count} more shots',
      'v6.hub.nextHint': 'You can also say in chat: continue image',
      'v6.guide.openIntake': 'Open guide',
      'v6.runstack.deviceSection': 'Local probe (local only)',
      'v6.runstack.deviceCloudSkip': 'No device check in cloud mode',
      'v6.runstack.devicePending': 'Loading local probe results…',
      'v6.probe.title': 'Local environment (step-1 preflight)',
      'v6.probe.loading': 'Probing ComfyUI / VRAM / ffmpeg…',
      'v6.probe.ok': 'Preflight done: {count} checks passed — continue import & run position',
      'v6.probe.blockers': 'Preflight blocked ({count}): {first}',
      'v6.probe.warnings': '{count} checks failed — open run stack for details',
      'v6.probe.recheck': 'Re-probe',
      'v6.probe.detail': 'Details',
      'v6.runstack.deviceSummary': '{count} checks done — expand for details',
      'v6.runstack.expand': 'Expand probe',
      'v6.runstack.collapse': 'Collapse',
      'v6.runstack.askCloud': 'Cloud mode skips device check — you can continue.',
      'v6.runstack.askLocal': 'Local mode: expand and finish probe before choosing a plan.',
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
      'empty.hub': 'No chapters yet. Import from the guide, or say what you want in chat.',
      'empty.hubHint': 'Next: run environment check, then import text.',
      'v6.firstRun.openRunStack': 'Run & environment check',
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

      // ── RF7 (design/DESIGN-评审稿-RF7.md · 18 boards) ─────────────────
      'rf7.status.done': 'Done',
      'rf7.status.generating': 'Running',
      'rf7.status.failed': 'Failed',
      'rf7.status.pending': 'Not generated',

      'rf7.chatSync.empty': 'Nothing synced yet: what you type in the chat shows up here.',
      'rf7.chatSync.imported': 'Synced from chat: {count} chapter(s) written ({pending})',
      'rf7.chatSync.needRun': 'no stage run yet',
      'rf7.chatSync.ready': 'running',
      'rf7.chatSync.captured': 'Synced from chat: the text was written into the project',

      'rf7.hub.title': 'Hub',
      'rf7.hub.subtitle': 'Chapters · shot summary · cost',
      'rf7.hub.capsule.empty': 'No chapters yet',
      'rf7.hub.capsule.planned': 'Planned',
      'rf7.hub.capsule.running': 'Running',
      'rf7.hub.costLabel': 'Cost',
      'rf7.hub.stageLabel': 'Current stage',
      'rf7.hub.stageUnset': 'No plan yet',
      'rf7.hub.kindUnset': 'No mode picked',
      'rf7.hub.stageSub': 'Chapter {chapter} · {done} / {total} steps',
      'rf7.hub.chapterTitle': 'Chapter {chapter} · {title}',
      'rf7.hub.chapterMeta': '{shots} shots · {duration}',
      'rf7.hub.sectionChapters': 'Chapter progress',
      'rf7.hub.sectionShots': 'Shot script',
      'rf7.hub.sectionShotsSub': 'by chapter idx',
      'rf7.hub.shotId': 'C{seq}-S{idx}',
      'rf7.hub.shotSizeUnknown': 'No framing',
      'rf7.hub.moreShots': '{count} more shot(s) queued',
      'rf7.hub.viewAll': 'View all {count} shots',
      'rf7.hub.footerLabel': 'Current stage',
      'rf7.hub.footerValue.empty': 'No chapters yet',
      'rf7.hub.footerValue.generating': 'Chapter {chapter} is generating · no cut yet',
      'rf7.hub.footerValue.ready': 'Chapter {chapter} is cut · {count} deliverable(s)',
      'rf7.hub.empty.title': 'This project has no chapters yet',
      'rf7.hub.empty.hint': 'Paste the novel first; chapters split automatically, then the hub shows the whole picture.',
      'rf7.hub.empty.action': 'Create a project',
      'rf7.hub.action': 'View the cut',
      'rf7.hub.actionDisabled': 'No cut yet: run the video stage first; deliverables land in the Output tab.',
      // ── cross-screen entries: project settings / skills & workflows ──
      'rf7.hub.actProjectSettings': 'Project settings',
      'rf7.hub.actSkills': 'Skills & workflows',

      'rf7.chapters.title': 'Chapters',
      'rf7.chapters.subtitle': 'Skeleton first, then chapter by chapter',
      'rf7.chapters.capsule': '{count} chapters',
      'rf7.chapters.footerLabel': 'Chapters',
      'rf7.chapters.footerValue': '{chapters} chapters · {shots} shots',
      'rf7.chapters.chapterTitle': 'Chapter {chapter}',
      'rf7.chapters.shotsMeta': '{shots} shots · {duration}',
      'rf7.chapters.noShots': 'No storyboard yet',
      'rf7.chapters.actAdd': 'Add chapter',
      'rf7.chapters.actGenerateAll': 'Generate all chapters',
      'rf7.chapters.actGenerate': 'Generate',
      'rf7.chapters.actEdit': 'Edit',
      'rf7.chapters.actMore': 'More',
      'rf7.chapters.actEditDisabled': 'The plugin has no tool for editing a chapter yet: ask the assistant in chat to rename or drop a chapter.',
      'rf7.chapters.actMoreDisabled': 'The plugin has no chapter action menu yet: duplicate or reorder chapters from chat for now.',
      'rf7.chapters.notice': 'A chapter is an independent unit of delivery: run one, or resume the one you left off.',
      'rf7.chapters.noticeSub': 'The asset library is shared by the whole project.',
      'rf7.chapters.action': 'Generate all chapters',
      'rf7.chapters.actionDisabled': 'No text yet: paste the source or upload a .txt in "New project" first.',

      'rf7.assets.title': 'Assets',
      'rf7.assets.subtitle': 'Characters · scenes · props · variants',
      'rf7.assets.capsule': '{count} items',
      'rf7.assets.chipAll': 'All {count}',
      'rf7.assets.footerLabel': 'Assets',
      'rf7.assets.footerValue': '{count} items',
      'rf7.assets.actCreate': 'New asset',
      'rf7.assets.actGenerate': 'Generate image',
      'rf7.assets.actReplace': 'Upload',
      'rf7.assets.stateReady': 'Ready',
      'rf7.assets.noDescription': 'No description',
      'rf7.assets.more': '{count} more · sfx / video / references',
      'rf7.assets.viewAll': 'View all {count} items',
      'rf7.assets.gapTitle': '{count} shots are missing reference images; the video stage fails on them (image is a hard dependency).',
      'rf7.assets.gapSub': 'Fill the references before running the video stage.',
      'rf7.assets.action': 'New asset',
      'rf7.assets.actionDisabled': 'A new asset needs a category and a name: use the "New asset" entry in the library above.',

      'rf7.storyboard.title': 'Storyboard',
      'rf7.storyboard.subtitle': 'Review shot by shot, redo what you dislike',
      'rf7.storyboard.capsule': '{count} shots',
      'rf7.storyboard.footerLabel': 'Storyboard',
      'rf7.storyboard.footerValue': '{count} shots · {pending} to review',
      'rf7.storyboard.duration': '{seconds}s',
      'rf7.storyboard.refCharacter': 'Character',
      'rf7.storyboard.refScene': 'Scene',
      'rf7.storyboard.refProp': 'Prop',
      'rf7.storyboard.promptLine': 'Shot {size} · references and prompt',
      'rf7.storyboard.sectionSelected': 'Selected shot · #{idx}',
      'rf7.storyboard.sectionSelectedSub': 'References and prompt',
      'rf7.storyboard.sectionRegenerate': 'Regenerate',
      'rf7.storyboard.actSeed': 'Another seed',
      'rf7.storyboard.actRewrite': 'Rewrite from feedback',
      'rf7.storyboard.feedbackPlaceholder': 'Say what is off, e.g. "slow the curtain down"',
      'rf7.storyboard.empty.title': 'No storyboard yet',
      'rf7.storyboard.empty.hint': 'Run the llm stage to get the storyboard, then come back shot by shot.',
      'rf7.storyboard.action': 'Regenerate selected shot',
      'rf7.storyboard.actionDisabled': 'No storyboard yet: run the llm stage first.',
      // ── cross-screen entry: shot detail (board 07 is the list, board 08 the single shot) ──
      'rf7.storyboard.actDetail': 'Open shot detail',
      'rf7.storyboard.actDetailDisabled': 'No storyboard yet: run the llm stage first.',

      'rf7.context.title': 'Context',
      'rf7.context.subtitle': 'The three keys every generation needs',
      'rf7.context.capsule.ready': 'All three keys',
      'rf7.context.capsule.missing': '{missing} missing',
      'rf7.context.footerLabel': 'Context',
      'rf7.context.footerValue': '{ready} / {total} keys · {continuity} continuity note(s)',
      'rf7.context.bibleTitle': 'Character bible',
      'rf7.context.bibleMeta': 'Character anchors and the blocking table',
      'rf7.context.styleTitle': 'Style guide',
      'rf7.context.styleMeta': 'One look for art, light and tone',
      'rf7.context.continuityTitle': 'Continuity log',
      'rf7.context.continuityMeta': 'Cross-chapter facts and conflicts',
      'rf7.context.stateReady': 'Ready',
      'rf7.context.stateMissing': 'Empty',
      'rf7.context.actView': 'View',
      'rf7.context.actWrite': 'Write from chat',
      'rf7.context.actWriteDisabled': 'The plugin has no write-context-from-chat action: have the assistant write the three keys in chat and they are injected on every generation.',
      'rf7.context.sectionInject': 'Injection preview',
      'rf7.context.sectionInjectSub': 'These three blocks go into every generation',
      'rf7.context.rule1': 'Only bible / style / continuity are accepted; a fourth key is an error.',
      'rf7.context.rule2': 'Writing the bible reads the current one back first; existing characters are never overwritten.',
      'rf7.context.action': 'Freeze anchors',
      'rf7.context.actionDisabled': 'There is no "freeze anchors" action yet: have the assistant write the three keys in chat; they are injected on every generation.',

      'rf7.output.title': 'Output',
      'rf7.output.subtitle': 'Assembly · subtitles · delivery',
      'rf7.output.capsule': '{count} files',
      'rf7.output.footerLabel': 'Delivery',
      'rf7.output.footerValue.empty': 'No deliverable yet',
      'rf7.output.footerValue': 'Chapter {chapter} {duration} · {count} deliverable(s)',
      'rf7.output.actDownload': 'Download',
      // ── cross-screen entry: background music (board 09 · delivery step) ──
      'rf7.output.actMusic': 'Background music',
      'rf7.output.deliverMeta': '{size}',
      'rf7.output.stateReady': 'Generated',
      'rf7.output.fileMeta': '{size} · {time}',
      'rf7.output.untitled': 'Untitled cut',
      'rf7.output.playerPlaceholder': 'Preview · 0:00 / 0:00',
      'rf7.output.sectionDeliver': 'Deliverables',
      'rf7.output.sectionDeliverSub': 'Two cuts plus an SRT',
      'rf7.output.sectionChapters': 'Chapters',
      'rf7.output.chapterTitle': 'Chapter {chapter} · {title}',
      'rf7.output.chapterMeta': '{shots} shots · {duration}',
      'rf7.output.noChapters': 'No chapters yet',
      'rf7.output.empty.title': 'No cut yet',
      'rf7.output.empty.hint': 'Once the video stage finishes and the chapter is assembled, the files show up here.',
      'rf7.output.action': 'Download the cut',
      'rf7.output.actionDisabled': 'No deliverable yet: run the video stage and assemble first.',

      'rf7.log.title': 'Run log',
      'rf7.log.subtitle': 'Who changed what, and when',
      'rf7.log.capsule': '{count} entries',
      'rf7.log.footerLabel': 'Log',
      'rf7.log.footerValue': '{count} recent change(s)',
      'rf7.log.sectionChanges': 'Change log',
      'rf7.log.sectionChangesSub': 'Every step can be rolled back',
      'rf7.log.sectionOutput': 'Run output',
      'rf7.log.sectionRollback': 'Rollback',
      'rf7.log.drifted': 'Drifted',
      'rf7.log.empty.title': 'No changes recorded yet',
      'rf7.log.empty.hint': 'Every content write leaves an entry here.',
      'rf7.log.rollbackBatch': 'Roll back a batch',
      'rf7.log.rollbackTime': 'Roll back to a point in time',
      'rf7.log.rollbackSingle': 'Roll back one entry',
      'rf7.log.actRollback': 'Roll back',
      'rf7.log.actPick': 'Pick',
      'rf7.log.rollbackBatchDisabled': 'The changelog carries no batch id, so a batch rollback is impossible: use "Roll back one entry".',
      'rf7.log.rollbackTimeDisabled': 'The changelog carries no selectable time point, so a time-point rollback is impossible: use "Roll back one entry".',
      'rf7.log.rollbackNote': 'A rollback restores content only; images and videos already on disk stay.',
      'rf7.log.action': 'Roll back this batch',
      'rf7.log.actionDisabled': 'No changes recorded yet: write something once and an entry appears here.',
      'rf7.log.actionNoBatch': 'The change log carries no batch id: use "roll back one entry" or "roll back to a point in time".',

      'rf7.runGate.title': 'Start check',
      'rf7.runGate.subtitle': 'First run · environment readiness',
      'rf7.runGate.capsule': '{passed} / {total} passing',
      'rf7.runGate.capsule.pending': 'Not probed yet',
      'rf7.runGate.footerLabel': 'Next',
      'rf7.runGate.footerValue.pending': 'Probing this machine…',
      'rf7.runGate.footerValue.failed': '{count} check(s) failed — fix them before starting',
      'rf7.runGate.footerValue.ready': 'All green — ready to produce',
      'rf7.runGate.summaryTitle': 'Environment check',
      'rf7.runGate.summaryMeta': '{total} checks · {passed} pass · {failed} fail · {warned} warn · {unconfigured} unset',
      'rf7.runGate.pendingMeta': 'Not probed yet',
      'rf7.runGate.probingMeta': 'Checking…',
      'rf7.runGate.actRerun': 'Re-run checks',
      'rf7.runGate.actStart': 'Run check',
      'rf7.runGate.pendingTitle': 'Not checked yet',
      'rf7.runGate.pendingHint': 'Pick a run position, then run the check — or go straight to the cloud',
      'rf7.runGate.staleTitle': 'These results are not from the current run position',
      'rf7.runGate.staleHint': 'Re-probing for the new position, or hit “Re-run checks”',
      'rf7.runGate.sectionPosition': 'Where it runs',
      'rf7.runGate.sectionPositionSub': 'Same kinds either way; only the machine and the bill differ',
      'rf7.runGate.localTitle': 'Run locally',
      'rf7.runGate.localSub': 'ComfyUI · this machine',
      'rf7.runGate.localFact1': '· data never leaves this machine',
      'rf7.runGate.localFact2': '· no per-run fee',
      'rf7.runGate.cloudTitle': 'Run in the cloud',
      'rf7.runGate.cloudSub': 'Hosted workflows · scheduled on demand',
      'rf7.runGate.cloudFact1': '· no GPU needed',
      'rf7.runGate.cloudFact2': '· billed per run',
      'rf7.runGate.sectionChecks': 'Checks',
      'rf7.runGate.checkComfy': 'ComfyUI service',
      'rf7.runGate.checkLlm': 'LLM endpoint',
      'rf7.runGate.checkAgent': 'Agent runtime',
      'rf7.runGate.checkFfmpeg': 'ffmpeg',
      'rf7.runGate.checkDisk': 'Free disk',
      'rf7.runGate.checkVram': 'VRAM estimate',
      'rf7.runGate.checkCloud': 'Cloud account',
      'rf7.runGate.check.comfy': 'ComfyUI service',
      'rf7.runGate.check.llm': 'LLM endpoint',
      'rf7.runGate.check.ffmpeg': 'ffmpeg',
      'rf7.runGate.check.disk': 'Free disk',
      'rf7.runGate.check.vram': 'VRAM estimate',
      'rf7.runGate.check.provider': 'Cloud account',
      'rf7.runGate.check.ckVersion': 'ComfyUI-Kernel version',
      'rf7.runGate.check.encoders': 'Video encoders',
      'rf7.runGate.check.videoBackend': 'Video backend',
      // CK version is not a separate row (same data as "ComfyUI service") ⇒ folded into that row's value.
      'rf7.runGate.kernelOk': 'CK {version} OK',
      'rf7.runGate.kernelFail': 'CK {version} below required {min}',
      'rf7.runGate.kernelMissing': 'CK version missing',
      'rf7.runGate.agentValue': 'Provided by the host (DSH built-in)',
      'rf7.runGate.pass': 'Pass',
      'rf7.runGate.warn': 'Warning',
      'rf7.runGate.fail': 'Failed',
      'rf7.runGate.unconfigured': 'Not configured',
      'rf7.runGate.builtin': 'Built in',
      'rf7.runGate.noticeMain': 'Probing runs on this machine only · nothing is uploaded',
      'rf7.runGate.noticeSub': 'If this machine does not qualify, skip the probe and use the cloud',
      'rf7.runGate.action': 'Start producing',
      // ── cross-screen entries (added per board semantics; see the zh block above) ──
      'rf7.runGate.actSettings': 'Service setup',
      'rf7.runGate.actFailures': 'View failure list',

      'rf7.settings.title': 'Services',
      'rf7.settings.subtitle': 'ComfyUI · LLM · runtime',
      'rf7.settings.capsule': 'Read-only',
      'rf7.settings.footerLabel': 'Settings',
      'rf7.settings.footerValue': 'Read-only · lives in the plugin config',
      'rf7.settings.sectionComfy': 'ComfyUI',
      'rf7.settings.sectionComfySub': 'Local rendering service',
      'rf7.settings.labelAddress': 'Service address',
      'rf7.settings.labelBaseUrl': 'Base URL',
      'rf7.settings.labelModel': 'Model',
      'rf7.settings.labelApiKey': 'API key',
      'rf7.settings.actTest': 'Test connection',
      'rf7.settings.testHint': '"Test connection" re-runs the local probe',
      'rf7.settings.sectionLlm': 'LLM (OpenAI compatible)',
      'rf7.settings.sectionLlmSub': 'The agent brain',
      'rf7.settings.llmNotice': 'The LLM is configured by the host; the plugin cannot read it.',
      'rf7.settings.llmNoticeSub': 'Change base URL, model and API key in the DSH model settings.',
      'rf7.settings.sectionRuntime': 'Agent runtime',
      'rf7.settings.sectionRuntimeSub': 'Built-in by default, or hand it to a local CLI',
      'rf7.settings.runtimeBuiltin': 'Built-in openclaude',
      'rf7.settings.runtimeClaudeCode': 'Claude Code',
      'rf7.settings.runtimeCodex': 'Codex',
      'rf7.settings.runtimeGemini': 'Gemini',
      'rf7.settings.runtimeCustom': 'Custom',
      'rf7.settings.runtimeDisabled': 'The agent runtime cannot be switched here: change it in the plugin config (this screen is read-only).',
      'rf7.settings.sectionMaintenance': 'Generation upkeep',
      'rf7.settings.rowFree': 'VRAM release interval',
      'rf7.settings.valueFree': 'every 3 runs',
      'rf7.settings.rowTimeout': 'Per-task timeout',
      'rf7.settings.valueTimeout': '90 min',
      'rf7.settings.rowCloudKey': 'RunningHub key',
      'rf7.settings.valueCloudKey': 'not set',
      'rf7.settings.stateAdjustable': 'tunable',
      'rf7.settings.stateNotLoggedIn': 'not logged in',
      'rf7.settings.unset': 'Not set',
      'rf7.settings.readonlyTitle': 'This screen is read-only',
      'rf7.settings.readonlySub': 'The plugin has no channel for writing config: change addresses, keys and upkeep values in the plugin config block (budget ¥{budget} · {stages} stage(s) enabled).',
      'rf7.settings.action': 'Save and re-test',
      'rf7.settings.actionDisabled': 'The plugin cannot write config: edit the plugin config block; "Test connection" re-runs the probe.',

      'rf7.intake.title': 'New project',
      'rf7.intake.subtitle': 'Novel · script · one line',
      'rf7.intake.capsule.ready': 'Text written',
      'rf7.intake.capsule.empty': 'Not imported',
      'rf7.intake.footerLabel': 'Next',
      'rf7.intake.footerValue': 'Split the chapters and create the project',
      'rf7.intake.labelName': 'Project name',
      'rf7.intake.namePlaceholder': 'Project name, e.g. "The Hours of Mother"',
      'rf7.intake.labelStyle': 'Art style',
      'rf7.intake.styleRealistic': 'Realistic',
      'rf7.intake.styleAnime': 'Anime',
      'rf7.intake.styleComic': 'Comic',
      'rf7.intake.style3d': '3D',
      'rf7.intake.styleSuspense': 'Suspense',
      'rf7.intake.textPlaceholder': 'Paste the novel, or upload a .txt; one line is enough',
      'rf7.intake.textHint': 'Chapters split automatically · one chapter per episode · can come straight from chat',
      'rf7.intake.specResolution': 'Resolution',
      'rf7.intake.specAspect': 'Aspect',
      'rf7.intake.specMusic': 'Background music',
      'rf7.intake.on': 'On',
      'rf7.intake.off': 'Off',
      'rf7.intake.sectionReferences': 'Reference images',
      'rf7.intake.sectionReferencesSub': 'Optional · brand / product / character look',
      'rf7.intake.refThumb': 'Reference',
      'rf7.intake.refName': 'reference-image.jpg',
      'rf7.intake.refUse': 'Use: product reference, keep the look consistent',
      'rf7.intake.actAddReference': '+ Choose reference images',
      'rf7.intake.actRemove': 'Remove',
      'rf7.intake.actRemoveDisabled': 'The plugin has no remove-reference action yet: upload the file again to replace it.',
      'rf7.intake.sectionChapters': 'Chapter preview',
      'rf7.intake.sectionChaptersSub': '{count} chapters · {chars} characters',
      'rf7.intake.chapterMeta': 'Split automatically · one chapter per episode',
      'rf7.intake.noChapters': 'No chapters split yet',
      'rf7.intake.noChaptersHint': 'Paste the text and the split result shows up here.',
      'rf7.intake.actImport': 'Import',
      'rf7.intake.action': 'Create and open',
      'rf7.intake.actImportDisabled': 'The host only offers whole-novel import: use "Create and open" in the footer first, then the chapters show up here.',
      'rf7.intake.actionDisabled': 'There is no text yet: paste the novel (or upload a .txt) above, then press "Create and open".',

      'rf7.projectSettings.title': 'Project settings',
      'rf7.projectSettings.subtitle': 'Format · style · subtitles',
      'rf7.projectSettings.capsule': 'Read-only',
      'rf7.projectSettings.footerLabel': 'Project settings',
      'rf7.projectSettings.footerValue': '{resolution} · {aspect}',
      'rf7.projectSettings.sectionSpec': 'Output format',
      'rf7.projectSettings.rowResolution': 'Resolution',
      'rf7.projectSettings.rowAspect': 'Aspect',
      'rf7.projectSettings.rowStyle': 'Style',
      'rf7.projectSettings.styleDefault': 'Realistic · cold',
      'rf7.projectSettings.sectionSubtitles': 'Subtitles',
      'rf7.projectSettings.rowAutoSub': 'Add subtitles automatically',
      'rf7.projectSettings.rowPosition': 'Burn-in position',
      'rf7.projectSettings.bottomCenter': 'Bottom centre',
      'rf7.projectSettings.rowHideName': 'Hide character names',
      'rf7.projectSettings.subtitleNote': 'Each cut exports with subtitles, without subtitles, plus an SRT file.',
      'rf7.projectSettings.sectionSound': 'Sound',
      'rf7.projectSettings.rowBgm': 'Generate background music',
      'rf7.projectSettings.rowVoice': 'Voice synthesis',
      'rf7.projectSettings.voiceH3': 'H3 reference voice (flac)',
      'rf7.projectSettings.sectionDanger': 'Danger zone',
      'rf7.projectSettings.dangerText': 'Deleting the project also clears assets, storyboard and cuts. It cannot be undone.',
      'rf7.projectSettings.dangerAction': 'Delete this project',
      'rf7.projectSettings.dangerDisabled': 'The plugin has no delete-project action: ask the assistant in chat to delete it (the host asks for confirmation).',
      'rf7.projectSettings.unset': 'Not set',
      'rf7.projectSettings.action': 'Save settings',
      'rf7.projectSettings.actionDisabled': 'The plugin has no tool for writing project settings yet: ask the assistant in chat to change resolution, aspect, subtitles or sound.',

      'rf7.stages.title': 'Generation',
      'rf7.stages.subtitle': 'Four stages · live progress',
      'rf7.stages.capsule': '{count} stages',
      'rf7.stages.footerLabel': 'Current stage',
      'rf7.stages.footerValue': '{kind} · {stage}',
      'rf7.stages.footerValue.unset': 'No mode picked yet',
      'rf7.stages.legendLlm': 'llm done',
      'rf7.stages.legendImage': 'image running',
      'rf7.stages.legendTts': 'tts pending',
      'rf7.stages.legendVideo': 'video pending',
      'rf7.stages.currentTitle': 'Generating · {kind}',
      'rf7.stages.currentSub': 'Task details',
      'rf7.stages.metaGpu': 'GPU —',
      'rf7.stages.metaVram': 'VRAM —',
      'rf7.stages.metaEta': 'About — left',
      'rf7.stages.sectionQueue': 'Queue',
      'rf7.stages.sectionQueueSub': 'What comes next',
      'rf7.stages.queueEmpty': 'The queue is empty: nothing is waiting.',
      'rf7.stages.sectionPicker': 'Stages for this run',
      'rf7.stages.stateEnabled': 'Done',
      'rf7.stages.stateDisabled': 'Pending',
      'rf7.stages.stateUnset': 'No mode picked yet',
      'rf7.stages.desc.llm': 'Character bible / style / chapters / storyboard',
      'rf7.stages.desc.image': 'Characters / scenes / props plus outfit and age variants',
      'rf7.stages.desc.tts': 'Design voices only for characters that speak',
      'rf7.stages.desc.video': 'Hard dependency on image; soft dependency on tts',
      'rf7.stages.memMain': 'ComfyUI VRAM is released after every 3 runs',
      'rf7.stages.memSub': 'The next batch reloads the model (about 1–3 min); you can also free it now',
      'rf7.stages.action': 'Pause generation',
      'rf7.stages.actionDisabled': 'There is no "pause generation" capability yet: wait for the batch to finish, or tune the VRAM interval in Services.',

      'rf7.shotDetail.title': 'Shot detail',
      'rf7.shotDetail.subtitle': 'Chapter {chapter} · shot {idx}',
      'rf7.shotDetail.subtitle.empty': 'No storyboard yet',
      'rf7.shotDetail.headTitle': 'Shot {chapter} · {idx} · {label}',
      'rf7.shotDetail.meta': '{duration}s · {ratio}',
      'rf7.shotDetail.capsule.done': 'Generated',
      'rf7.shotDetail.capsule.pending': 'Not generated',
      'rf7.shotDetail.capsule.empty': 'No storyboard',
      'rf7.shotDetail.footerLabel': 'Storyboard',
      'rf7.shotDetail.footerValue': '{count} shots · {pending} to review',
      'rf7.shotDetail.sectionReferences': 'References',
      'rf7.shotDetail.sectionReferencesSub': 'Character / scene / prop / outfit / voice (speaking roles only)',
      'rf7.shotDetail.noReferences': 'This shot has no references yet.',
      'rf7.shotDetail.duration': '{seconds}s',
      'rf7.shotDetail.sectionScript': 'Prompt & storyboard script',
      'rf7.shotDetail.scriptLens': 'Camera: {size}',
      'rf7.shotDetail.scriptMissing': 'The storyboard script is not in the projection yet: the script is stored by the assistant through the storyboard write tool, so this screen only shows what is already stored.',
      'rf7.shotDetail.sectionPrompt': 'Video prompt',
      'rf7.shotDetail.promptMissing': 'The video prompt is not in the projection yet.',
      'rf7.shotDetail.promptMissingSub': 'The prompt is written together with the storyboard; nothing is invented here.',
      'rf7.shotDetail.empty.title': 'No storyboard yet',
      'rf7.shotDetail.empty.hint': 'Run the llm stage to produce a storyboard, then come back for the single-shot detail.',
      'rf7.shotDetail.empty.action': 'Go to the storyboard',
      'rf7.shotDetail.action': 'Regenerate this shot',
      'rf7.shotDetail.actionDisabled': 'No storyboard yet: run the llm stage first.',

      'rf7.music.title': 'Background music',
      'rf7.music.subtitle': 'Generate · preview · apply',
      'rf7.music.capsule': '{count} tracks',
      'rf7.music.footerLabel': 'Delivery',
      'rf7.music.footerValue': '{count} track(s)',
      'rf7.music.generateTitle': 'Generate a new track',
      'rf7.music.generatePlaceholder': 'Describe the music, e.g. "restrained piano, cold, rising"',
      'rf7.music.chipInstrumental': 'Instrumental',
      'rf7.music.chipVocal': 'With vocals',
      'rf7.music.chipPiano': 'Piano',
      'rf7.music.chipStrings': 'Strings',
      'rf7.music.actGenerate': 'Generate',
      'rf7.music.chipsDisabled': 'The music style cannot be picked yet: the plugin has no generate-music tool.',
      'rf7.music.sectionLibrary': 'Music library',
      'rf7.music.sectionLibrarySub': 'One generated track can serve several chapters',
      'rf7.music.stateApplied': 'Applied',
      'rf7.music.actPreview': 'Preview',
      'rf7.music.actApply': 'Apply to chapter',
      'rf7.music.actGenerateDisabled': 'The plugin has no generate-music tool: describe the track in chat and let the assistant generate it.',
      'rf7.music.actPreviewDisabled': 'The projection carries no audio file path, so there is nothing to play: have the assistant generate the track into the workspace first.',
      'rf7.music.actApplyDisabled': 'Applying to a chapter needs the music file path inside the workspace, which the projection does not carry: have the assistant generate the track into the workspace first.',
      'rf7.music.emptyTitle': 'The music library is empty',
      'rf7.music.emptySub': 'The projection carries no music entries: the assistant has to generate the music into the workspace first.',
      'rf7.music.note': 'Applied music is mixed into the cut; replacing it keeps the original, so you can switch back.',
      'rf7.music.action': 'Apply to chapter 1',
      'rf7.music.actionDisabled': 'The projection carries no music file path: have the assistant generate the track into the workspace first.',

      'rf7.skills.title': 'Skills & workflows',
      'rf7.skills.subtitle': 'Installed skills · new workflows',
      'rf7.skills.capsule': '{count} installed',
      'rf7.skills.footerLabel': 'Skills',
      'rf7.skills.footerValue': '{total} installed · bundled {bundled} · installed {installed} · self-made {generated}',
      'rf7.skills.sectionInstalled': 'Installed skills',
      'rf7.skills.sectionInstalledSub': '{count} from the skills folder on disk',
      'rf7.skills.stateReady': 'Usable',
      'rf7.skills.source.bundled': 'Bundled · shipped with the plugin',
      'rf7.skills.source.installed': 'Installed · local',
      'rf7.skills.source.generated': 'Self-made · local',
      'rf7.skills.empty.title': 'No skill installed yet',
      'rf7.skills.empty.hint': 'Drop a skill folder into the plugin skills directory and it shows up after a restart.',
      'rf7.skills.sectionIterate': 'Workflow self-iteration',
      'rf7.skills.sectionIterateSub': 'Paste a ComfyUI workflow JSON',
      'rf7.skills.step1': 'Analyse the nodes · derive the workflow spec',
      'rf7.skills.step2': 'Register the workflow · draft SKILL.md',
      'rf7.skills.dropHint': 'Drop the workflow JSON here',
      'rf7.skills.actAnalyze': 'Analyse and register',
      'rf7.skills.actAnalyzeDisabled': 'The plugin has no analyse-workflow tool: drop the workflow JSON into the skills directory and let the assistant register it.',
      'rf7.skills.analyzed': 'Analysed',
      'rf7.skills.note': 'A new skill can be routed by the agent right away; the workflow can also be registered without touching the skill.',
      'rf7.skills.action': 'Install a skill',
      'rf7.skills.actionDisabled': 'The plugin has no skill installer: drop a folder into the plugin skills directory and it is discovered.',

      'rf7.degraded.title': 'Degraded & failed',
      'rf7.degraded.subtitle': 'Never degrade silently',
      'rf7.degraded.capsule': '{count} degradation(s)',
      'rf7.degraded.footerLabel': 'Rules',
      'rf7.degraded.footerValue': 'Say what it costs and what to do instead',
      'rf7.degraded.sectionBlocked': 'Blocked',
      'rf7.degraded.sectionBlockedSub': 'If the service is down, say so',
      'rf7.degraded.sectionWarning': 'Warning',
      'rf7.degraded.sectionWarningSub': 'It runs, but cheaper',
      'rf7.degraded.sectionEmpty': 'Empty',
      'rf7.degraded.sectionEmptySub': 'Say something before you start',
      'rf7.degraded.sectionMissing': 'Missing inputs',
      'rf7.degraded.sectionMissingSub': 'Name what is missing',
      'rf7.degraded.missingTitle': '{count} shots miss reference images',
      'rf7.degraded.missingSub': 'Shots {shots} have no reference images; the video stage needs them (hard dependency on image).',
      'rf7.degraded.noMissingTitle': 'No missing inputs',
      'rf7.degraded.noMissingSub': 'Every shot has its reference images.',
      'rf7.degraded.actFill': 'Fill the gap',
      'rf7.degraded.softTitle': 'Soft degradation · {count} characters have no voice',
      'rf7.degraded.softSub': 'They still run; the video stage is not blocked, but the cut loses a layer of human voice.',
      'rf7.assets.gapNone': 'No shot misses reference images.',
      'rf7.assets.gapNoShots': 'No storyboard yet, so there is no reference gap to report.',
      'rf7.degraded.blockedHint': 'Only the cloud path is left and it is billed per run; or fix the local one and resume.',
      'rf7.degraded.warningHint': 'Already switched to tiled encoding; the next batch reloads the model.',
      'rf7.degraded.noneTitle': 'Nothing is blocked',
      'rf7.degraded.noneSub': 'This batch can run.',
      'rf7.degraded.noWarningTitle': 'No warnings',
      'rf7.degraded.noWarningSub': 'Every capability is in place.',
      'rf7.degraded.emptyTitle': 'This project has no chapters yet',
      'rf7.degraded.emptySub': 'Paste the novel, or just say "make an episode out of this".',
      'rf7.degraded.action': 'See the failure list',

      'rf7.picker.title': 'Material picker',
      'rf7.picker.subtitle': 'Modal shape · embedded in the right panel',
      'rf7.picker.capsule': '{count} picked',
      'rf7.picker.footerLabel': 'Rules',
      'rf7.picker.footerValue': '{count} picked · limit {limit}',
      'rf7.picker.searchPlaceholder': 'Search character / scene / prop',
      'rf7.picker.chipAll': 'All',
      'rf7.picker.chipCharacter': 'Character',
      'rf7.picker.chipScene': 'Scene',
      'rf7.picker.chipProp': 'Prop',
      'rf7.picker.chipCostume': 'Outfit',
      'rf7.picker.pickedThumb': 'Picked',
      'rf7.picker.pickedCount': '{count} picked · reference limit {limit}',
      'rf7.picker.actClear': 'Clear',
      'rf7.picker.note': 'Only characters that appear or speak take a slot; reference images ≤ 9 and audio/video ≤ 3 are hard backend limits.',
      'rf7.picker.action': 'Confirm',
      'rf7.picker.actionDisabled': 'Pick some material first, and select the shot to bind them to.',
      'rf7.picker.actionNoBindable': 'None of the picked material is in a bindable category: only character / scene / prop / costume / age variant / voice can be bound to a shot.',
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
   * 服务配置读数的宿主路由 URL（RF7 板 14「服务配置」）。
   *
   * `/api/reelforge.capabilities` 是**只读**的：它把插件 Config 归一化后的
   * 可调值回给客户端（ComfyUI 地址 / 预算上限 / BGM / 字幕 / 目标时长）。
   * ⚠️ 它**不提供写入通道** —— 改配置要改插件的 `config` 块（见 RF7 设置屏的说明）。
   *
   * @returns {string} 同源 URL。
   */
  RF.capabilitiesUrl = function capabilitiesUrl() {
    return '/api/reelforge.capabilities';
  };

  /* ───────────────────────────────────────────────────────────────────────────
   * 启动检查的「检查行模型」（RF7 板 01）
   *
   * ## 为什么要一份模型，而不是两个文件各算一遍
   *
   * 启动检查的行同时出现在三处：屏内清单、顶部胶囊、底栏。
   * 三处各算一次 ⇒ 迟早对不上（胶囊写「6 / 9 通过」，屏里写「6 项检查」），
   * 用户一眼就看出面板在编数字。所以行模型与汇总**只有这一份**。
   *
   * ## 三条硬规矩
   *
   * 1. **「ComfyUI-Kernel 版本」不单列**：它和「ComfyUI 服务」是**同一份数据**
   *    （一次 `systemStats` 调用读出的 `comfy_kitchen_version`），拆成两行 =
   *    同一个故障报两遍。结论并进 ComfyUI 那行，状态取更差的那个。
   * 2. **「Agent 运行时」不是检查项**：它没有探测项，是宿主自带的事实 ⇒
   *    屏内单独一行说明，**不计入**「N 项检查」。
   * 3. **范围随运行位置变**：云端档只列云端相关的行（本地专属行在云端是
   *    「不适用」，不是「没配置」）。
   * ─────────────────────────────────────────────────────────────────────────── */

  /**
   * 检查行清单：固定行（行首 id + 并入同一行的探测项 + 文案词条键）。
   *
   * `merge` = 与本行**同一份数据**的探测项，结论并进本行，不单列。
   *
   * @type {ReadonlyArray<{ probeId: string, labelKey: string, merge: ReadonlyArray<string> }>}
   */
  RF.PROBE_GATE_ROWS = Object.freeze([
    Object.freeze({ probeId: 'comfy', labelKey: 'rf7.runGate.checkComfy', merge: Object.freeze(['ckVersion']) }),
    Object.freeze({ probeId: 'llm', labelKey: 'rf7.runGate.checkLlm', merge: Object.freeze([]) }),
    Object.freeze({ probeId: 'ffmpeg', labelKey: 'rf7.runGate.checkFfmpeg', merge: Object.freeze([]) }),
    Object.freeze({ probeId: 'disk', labelKey: 'rf7.runGate.checkDisk', merge: Object.freeze([]) }),
    Object.freeze({ probeId: 'vram', labelKey: 'rf7.runGate.checkVram', merge: Object.freeze([]) }),
    Object.freeze({ probeId: 'provider', labelKey: 'rf7.runGate.checkCloud', merge: Object.freeze([]) }),
  ]);

  /**
   * 状态桶 → 展示词条键 + 色调。
   *
   * @type {Readonly<Record<string, { key: string, tone: string }>>}
   */
  RF.PROBE_GATE_BUCKETS = Object.freeze({
    ok: Object.freeze({ key: 'rf7.runGate.pass', tone: 'ok' }),
    warn: Object.freeze({ key: 'rf7.runGate.warn', tone: 'warn' }),
    failed: Object.freeze({ key: 'rf7.runGate.fail', tone: 'error' }),
    unset: Object.freeze({ key: 'rf7.runGate.unconfigured', tone: 'muted' }),
  });

  /**
   * 机器状态 → 状态桶。
   * @param {unknown} status - 机器状态。
   * @returns {string} 状态桶（ok / warn / failed / unset）。
   */
  RF.probeGateBucket = function probeGateBucket(status) {
    const raw = String(status ?? '');
    if (raw === 'ok' || raw === 'warn' || raw === 'failed') return raw;
    return 'unset';
  };

  /**
   * 取更差的桶（unset < ok < warn < failed）。
   * @param {string} a - 桶 A。
   * @param {string} b - 桶 B。
   * @returns {string} 更差的桶。
   */
  RF.probeGateWorse = function probeGateWorse(a, b) {
    const order = ['unset', 'ok', 'warn', 'failed'];
    const left = order.indexOf(a);
    const right = order.indexOf(b);
    return left >= right ? a : b;
  };

  /**
   * CK（ComfyUI-Kernel）版本的结论 → 词条键 + 参数。
   *
   * 成功时探测项的 `message` 只是 `'ok'`（没有信息量），所以成功路径用
   * `value`（版本号）自己拼；失败路径用词条把「低于门槛」说清楚。
   *
   * @param {object} part - ckVersion 探测项。
   * @returns {{ key: string, params: object } | { raw: string }} 描述。
   */
  RF.probeGateKernelDetail = function probeGateKernelDetail(part) {
    const version = String(part?.value ?? '').trim();
    const min = String(part?.min ?? '').trim();
    if (RF.probeGateBucket(part?.status) === 'ok') {
      return { key: 'rf7.runGate.kernelOk', params: { version } };
    }
    if (version === '') return { key: 'rf7.runGate.kernelMissing', params: {} };
    if (min !== '') return { key: 'rf7.runGate.kernelFail', params: { version, min } };
    // 门槛值没随报告带回来（老宿主）⇒ 用探测项自己的话，不自己编门槛。
    return { raw: String(part?.message ?? '') };
  };

  /**
   * 探测报告 → 检查行。
   *
   * @param {object} report - 探测报告（`report.items`）。
   * @returns {Array<{ id: string, labelKey: string, bucket: string, message: string, detail: object|null }>} 行。
   */
  RF.probeGateRows = function probeGateRows(report) {
    const items = Array.isArray(report?.items) ? report.items : [];
    const index = new Map(items.map(item => [String(item?.id ?? ''), item]));
    const inScope = new Set(index.keys());
    const rows = [];
    const covered = new Set();

    for (const spec of RF.PROBE_GATE_ROWS) {
      const ids = [spec.probeId, ...spec.merge];
      // 整个行都不在本次探测范围内 ⇒ 不显示（云端档不列本地专属行）。
      if (!ids.some(id => inScope.has(id))) continue;
      for (const id of ids) covered.add(id);
      const parts = ids.map(id => index.get(id)).filter(part => part !== undefined);
      const bucket = parts.reduce(
        (worst, part) => RF.probeGateWorse(worst, RF.probeGateBucket(part?.status)),
        'unset',
      );
      const primary = index.get(spec.probeId);
      // 并入项（CK 版本）的结论挂到 detail ⇒ 屏内渲染时拼进同一行的值里。
      const merged = ids.length > 1 ? index.get(spec.merge[0]) : undefined;
      rows.push({
        id: spec.probeId,
        labelKey: spec.labelKey,
        bucket,
        message: String(primary?.message ?? ''),
        detail: merged === undefined ? null : RF.probeGateKernelDetail(merged),
      });
    }

    // 探测到但固定行没覆盖的项 ⇒ **追加显示**，不许藏起来。
    for (const item of items) {
      const id = String(item?.id ?? '');
      if (covered.has(id)) continue;
      rows.push({
        id,
        labelKey: `rf7.runGate.check.${id}`,
        bucket: RF.probeGateBucket(item?.status),
        message: String(item?.message ?? ''),
        detail: null,
      });
    }
    return rows;
  };

  /**
   * 探测报告 → 汇总（口径 = **显示出来的检查行**）。
   *
   * ⚠️ total = 行数，所以「N 项检查 · X 通过 · Y 未通过 · Z 警告 · W 未配置」
   *    永远加得起来（每行恰好一个桶）。
   *
   * @param {object} report - 探测报告。
   * @returns {{ rows: Array<object>, total: number, passed: number, failed: number, warned: number, unset: number }} 汇总。
   */
  RF.probeGateSummary = function probeGateSummary(report) {
    const rows = RF.probeGateRows(report);
    const count = bucket => rows.filter(row => row.bucket === bucket).length;
    return {
      rows,
      total: rows.length,
      passed: count('ok'),
      failed: count('failed'),
      warned: count('warn'),
      unset: count('unset'),
    };
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
   * 参考素材上限（`src/core/constants.js` 的 `REFERENCE_LIMITS` 镜像）。
   *
   * RF7 的素材选择器板要显示「参考图上限 9」—— 那是**后端硬上限**，
   * 不是界面自己定的数。
   *
   * @type {{ images: number, audios: number, videos: number }}
   */
  RF.REFERENCE_LIMITS = Object.freeze({ images: 9, audios: 3, videos: 3 });

  /**
   * 按 id 找一镜。
   *
   * 投影里的镜头 id 是 `${seq}-${idx}`（见 `src/host/projection.js`）。
   *
   * @param {object} project - 投影视图。
   * @param {string | null | undefined} shotId - 镜头 id。
   * @returns {object | null} 镜头；找不到时 null。
   */
  RF.shotById = function shotById(project, shotId) {
    if (typeof shotId !== 'string' || shotId === '') return null;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.find(shot => String(shot?.id ?? '') === shotId) ?? null;
  };

  /**
   * **当前这一镜**：显式选中的那一镜；没选过就取第一镜。
   *
   * ## 为什么要有这个（实机抓出来的）
   *
   * 画板 07（分镜审查）里**永远有一镜是高亮选中态**，画板 08（分镜详情）就是
   * 那一镜的展开。所以「当前镜」的口径必须**只有一处**：
   * 列表页高亮哪一镜，详情屏就得展开哪一镜，外壳的副标题 / 胶囊也得说哪一镜。
   *
   * 之前列表页有兜底（取第一镜），详情屏与外壳却是严格选中 ⇒
   * 用户在列表页看到第 1 镜高亮，点进详情却写着「还没选镜」（实机走查抓到的真缺陷）。
   *
   * @param {object} project - 投影视图。
   * @param {string | null | undefined} shotId - 显式选中的镜头 id。
   * @returns {object | null} 当前镜头；一镜都没有时 null。
   */
  RF.currentShot = function currentShot(project, shotId) {
    const explicit = RF.shotById(project, shotId);
    if (explicit !== null) return explicit;
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.length === 0 ? null : shots[0];
  };

  /**
   * 缺参考图的分镜（画板 17「缺料」态 / 画板 04「缺口警示」共用同一口径）。
   *
   * 投影里每一镜的 `references` 是**已解析出来的**参考素材
   * （`src/host/projection.js` 走 `resolveRefs`）⇒ 空数组 = 这一镜没参考图，
   * 而 video 阶段硬依赖 image ⇒ 这是**真缺料**，不是「还没写」。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 缺参考图的分镜。
   */
  RF.shotsMissingReferences = function shotsMissingReferences(project) {
    const shots = Array.isArray(project?.shots) ? project.shots : [];
    return shots.filter(shot => {
      const references = Array.isArray(shot?.references) ? shot.references : [];
      return references.length === 0;
    });
  };

  /**
   * 没有音色的角色（画板 17「软降级」态）。
   *
   * 判定：分类是 `character` 的资产，**没有**任何 `voice` 资产把 `parent_id`
   * 指到它 ⇒ 这一角色没有音色（软降级：仍可跑，出片少一层人声质感）。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 没有音色的角色资产。
   */
  RF.charactersWithoutVoice = function charactersWithoutVoice(project) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    const characters = assets.filter(asset => String(asset?.category ?? '') === 'character');
    const voices = assets.filter(asset => String(asset?.category ?? '') === 'voice');
    return characters.filter(character => {
      const id = String(character?.id ?? '');
      return !voices.some(voice => String(voice?.parent_id ?? '') === id);
    });
  };

  /**
   * 按分类筛资产。
   *
   * @param {object} project - 投影视图。
   * @param {string} category - 分类；`'all'` = 全部。
   * @returns {Array<object>} 资产数组。
   */
  RF.assetsByCategory = function assetsByCategory(project, category) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    if (category === 'all' || category === undefined || category === '') return assets;
    return assets.filter(asset => String(asset?.category ?? '') === category);
  };

  /**
   * 音乐类资产（RF7 背景音乐板的「音乐库」）。
   *
   * ⚠️ 投影里的资产**没有文件路径**（只有 id / name / description / category），
   * 而 `reelforge.set_chapter_music` 要的是工作区相对路径 ——
   * ⇒ 这一屏能列条目，但「应用到章节」接不上，见 chrome 的 `music` 屏。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 音乐资产数组。
   */
  RF.musicAssets = function musicAssets(project) {
    return RF.assetsByCategory(project, 'music');
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

/* ── src/client/generated/tailwind-styles.js ───────────────────────────── */
/* eslint-disable */
// 由 src/client/build-ui.mjs 生成，请勿手改。
;(function (RF) {
'use strict';
RF.TAILWIND_STYLES = "*, ::before, ::after {\n  --tw-border-spacing-x: 0;\n  --tw-border-spacing-y: 0;\n  --tw-translate-x: 0;\n  --tw-translate-y: 0;\n  --tw-rotate: 0;\n  --tw-skew-x: 0;\n  --tw-skew-y: 0;\n  --tw-scale-x: 1;\n  --tw-scale-y: 1;\n  --tw-pan-x:  ;\n  --tw-pan-y:  ;\n  --tw-pinch-zoom:  ;\n  --tw-scroll-snap-strictness: proximity;\n  --tw-gradient-from-position:  ;\n  --tw-gradient-via-position:  ;\n  --tw-gradient-to-position:  ;\n  --tw-ordinal:  ;\n  --tw-slashed-zero:  ;\n  --tw-numeric-figure:  ;\n  --tw-numeric-spacing:  ;\n  --tw-numeric-fraction:  ;\n  --tw-ring-inset:  ;\n  --tw-ring-offset-width: 0px;\n  --tw-ring-offset-color: #fff;\n  --tw-ring-color: rgb(59 130 246 / 0.5);\n  --tw-ring-offset-shadow: 0 0 #0000;\n  --tw-ring-shadow: 0 0 #0000;\n  --tw-shadow: 0 0 #0000;\n  --tw-shadow-colored: 0 0 #0000;\n  --tw-blur:  ;\n  --tw-brightness:  ;\n  --tw-contrast:  ;\n  --tw-grayscale:  ;\n  --tw-hue-rotate:  ;\n  --tw-invert:  ;\n  --tw-saturate:  ;\n  --tw-sepia:  ;\n  --tw-drop-shadow:  ;\n  --tw-backdrop-blur:  ;\n  --tw-backdrop-brightness:  ;\n  --tw-backdrop-contrast:  ;\n  --tw-backdrop-grayscale:  ;\n  --tw-backdrop-hue-rotate:  ;\n  --tw-backdrop-invert:  ;\n  --tw-backdrop-opacity:  ;\n  --tw-backdrop-saturate:  ;\n  --tw-backdrop-sepia:  ;\n  --tw-contain-size:  ;\n  --tw-contain-layout:  ;\n  --tw-contain-paint:  ;\n  --tw-contain-style:  ;\n}\n\n::backdrop {\n  --tw-border-spacing-x: 0;\n  --tw-border-spacing-y: 0;\n  --tw-translate-x: 0;\n  --tw-translate-y: 0;\n  --tw-rotate: 0;\n  --tw-skew-x: 0;\n  --tw-skew-y: 0;\n  --tw-scale-x: 1;\n  --tw-scale-y: 1;\n  --tw-pan-x:  ;\n  --tw-pan-y:  ;\n  --tw-pinch-zoom:  ;\n  --tw-scroll-snap-strictness: proximity;\n  --tw-gradient-from-position:  ;\n  --tw-gradient-via-position:  ;\n  --tw-gradient-to-position:  ;\n  --tw-ordinal:  ;\n  --tw-slashed-zero:  ;\n  --tw-numeric-figure:  ;\n  --tw-numeric-spacing:  ;\n  --tw-numeric-fraction:  ;\n  --tw-ring-inset:  ;\n  --tw-ring-offset-width: 0px;\n  --tw-ring-offset-color: #fff;\n  --tw-ring-color: rgb(59 130 246 / 0.5);\n  --tw-ring-offset-shadow: 0 0 #0000;\n  --tw-ring-shadow: 0 0 #0000;\n  --tw-shadow: 0 0 #0000;\n  --tw-shadow-colored: 0 0 #0000;\n  --tw-blur:  ;\n  --tw-brightness:  ;\n  --tw-contrast:  ;\n  --tw-grayscale:  ;\n  --tw-hue-rotate:  ;\n  --tw-invert:  ;\n  --tw-saturate:  ;\n  --tw-sepia:  ;\n  --tw-drop-shadow:  ;\n  --tw-backdrop-blur:  ;\n  --tw-backdrop-brightness:  ;\n  --tw-backdrop-contrast:  ;\n  --tw-backdrop-grayscale:  ;\n  --tw-backdrop-hue-rotate:  ;\n  --tw-backdrop-invert:  ;\n  --tw-backdrop-opacity:  ;\n  --tw-backdrop-saturate:  ;\n  --tw-backdrop-sepia:  ;\n  --tw-contain-size:  ;\n  --tw-contain-layout:  ;\n  --tw-contain-paint:  ;\n  --tw-contain-style:  ;\n}/*\n! tailwindcss v3.4.17 | MIT License | https://tailwindcss.com\n*//*\n1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)\n2. Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)\n*/\n\n*,\n::before,\n::after {\n  box-sizing: border-box; /* 1 */\n  border-width: 0; /* 2 */\n  border-style: solid; /* 2 */\n  border-color: #e5e7eb; /* 2 */\n}\n\n::before,\n::after {\n  --tw-content: '';\n}\n\n/*\n1. Use a consistent sensible line-height in all browsers.\n2. Prevent adjustments of font size after orientation changes in iOS.\n3. Use a more readable tab size.\n4. Use the user's configured `sans` font-family by default.\n5. Use the user's configured `sans` font-feature-settings by default.\n6. Use the user's configured `sans` font-variation-settings by default.\n7. Disable tap highlights on iOS\n*/\n\nhtml,\n:host {\n  line-height: 1.5; /* 1 */\n  -webkit-text-size-adjust: 100%; /* 2 */\n  -moz-tab-size: 4; /* 3 */\n  -o-tab-size: 4;\n     tab-size: 4; /* 3 */\n  font-family: ui-sans-serif, system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\"; /* 4 */\n  font-feature-settings: normal; /* 5 */\n  font-variation-settings: normal; /* 6 */\n  -webkit-tap-highlight-color: transparent; /* 7 */\n}\n\n/*\n1. Remove the margin in all browsers.\n2. Inherit line-height from `html` so users can set them as a class directly on the `html` element.\n*/\n\nbody {\n  margin: 0; /* 1 */\n  line-height: inherit; /* 2 */\n}\n\n/*\n1. Add the correct height in Firefox.\n2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)\n3. Ensure horizontal rules are visible by default.\n*/\n\nhr {\n  height: 0; /* 1 */\n  color: inherit; /* 2 */\n  border-top-width: 1px; /* 3 */\n}\n\n/*\nAdd the correct text decoration in Chrome, Edge, and Safari.\n*/\n\nabbr:where([title]) {\n  -webkit-text-decoration: underline dotted;\n          text-decoration: underline dotted;\n}\n\n/*\nRemove the default font size and weight for headings.\n*/\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  font-size: inherit;\n  font-weight: inherit;\n}\n\n/*\nReset links to optimize for opt-in styling instead of opt-out.\n*/\n\na {\n  color: inherit;\n  text-decoration: inherit;\n}\n\n/*\nAdd the correct font weight in Edge and Safari.\n*/\n\nb,\nstrong {\n  font-weight: bolder;\n}\n\n/*\n1. Use the user's configured `mono` font-family by default.\n2. Use the user's configured `mono` font-feature-settings by default.\n3. Use the user's configured `mono` font-variation-settings by default.\n4. Correct the odd `em` font sizing in all browsers.\n*/\n\ncode,\nkbd,\nsamp,\npre {\n  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; /* 1 */\n  font-feature-settings: normal; /* 2 */\n  font-variation-settings: normal; /* 3 */\n  font-size: 1em; /* 4 */\n}\n\n/*\nAdd the correct font size in all browsers.\n*/\n\nsmall {\n  font-size: 80%;\n}\n\n/*\nPrevent `sub` and `sup` elements from affecting the line height in all browsers.\n*/\n\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\n\nsub {\n  bottom: -0.25em;\n}\n\nsup {\n  top: -0.5em;\n}\n\n/*\n1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)\n2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)\n3. Remove gaps between table borders by default.\n*/\n\ntable {\n  text-indent: 0; /* 1 */\n  border-color: inherit; /* 2 */\n  border-collapse: collapse; /* 3 */\n}\n\n/*\n1. Change the font styles in all browsers.\n2. Remove the margin in Firefox and Safari.\n3. Remove default padding in all browsers.\n*/\n\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: inherit; /* 1 */\n  font-feature-settings: inherit; /* 1 */\n  font-variation-settings: inherit; /* 1 */\n  font-size: 100%; /* 1 */\n  font-weight: inherit; /* 1 */\n  line-height: inherit; /* 1 */\n  letter-spacing: inherit; /* 1 */\n  color: inherit; /* 1 */\n  margin: 0; /* 2 */\n  padding: 0; /* 3 */\n}\n\n/*\nRemove the inheritance of text transform in Edge and Firefox.\n*/\n\nbutton,\nselect {\n  text-transform: none;\n}\n\n/*\n1. Correct the inability to style clickable types in iOS and Safari.\n2. Remove default button styles.\n*/\n\nbutton,\ninput:where([type='button']),\ninput:where([type='reset']),\ninput:where([type='submit']) {\n  -webkit-appearance: button; /* 1 */\n  background-color: transparent; /* 2 */\n  background-image: none; /* 2 */\n}\n\n/*\nUse the modern Firefox focus style for all focusable elements.\n*/\n\n:-moz-focusring {\n  outline: auto;\n}\n\n/*\nRemove the additional `:invalid` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)\n*/\n\n:-moz-ui-invalid {\n  box-shadow: none;\n}\n\n/*\nAdd the correct vertical alignment in Chrome and Firefox.\n*/\n\nprogress {\n  vertical-align: baseline;\n}\n\n/*\nCorrect the cursor style of increment and decrement buttons in Safari.\n*/\n\n::-webkit-inner-spin-button,\n::-webkit-outer-spin-button {\n  height: auto;\n}\n\n/*\n1. Correct the odd appearance in Chrome and Safari.\n2. Correct the outline style in Safari.\n*/\n\n[type='search'] {\n  -webkit-appearance: textfield; /* 1 */\n  outline-offset: -2px; /* 2 */\n}\n\n/*\nRemove the inner padding in Chrome and Safari on macOS.\n*/\n\n::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n\n/*\n1. Correct the inability to style clickable types in iOS and Safari.\n2. Change font properties to `inherit` in Safari.\n*/\n\n::-webkit-file-upload-button {\n  -webkit-appearance: button; /* 1 */\n  font: inherit; /* 2 */\n}\n\n/*\nAdd the correct display in Chrome and Safari.\n*/\n\nsummary {\n  display: list-item;\n}\n\n/*\nRemoves the default spacing and border for appropriate elements.\n*/\n\nblockquote,\ndl,\ndd,\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nhr,\nfigure,\np,\npre {\n  margin: 0;\n}\n\nfieldset {\n  margin: 0;\n  padding: 0;\n}\n\nlegend {\n  padding: 0;\n}\n\nol,\nul,\nmenu {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n/*\nReset default styling for dialogs.\n*/\ndialog {\n  padding: 0;\n}\n\n/*\nPrevent resizing textareas horizontally by default.\n*/\n\ntextarea {\n  resize: vertical;\n}\n\n/*\n1. Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)\n2. Set the default placeholder color to the user's configured gray 400 color.\n*/\n\ninput::-moz-placeholder, textarea::-moz-placeholder {\n  opacity: 1; /* 1 */\n  color: #9ca3af; /* 2 */\n}\n\ninput::placeholder,\ntextarea::placeholder {\n  opacity: 1; /* 1 */\n  color: #9ca3af; /* 2 */\n}\n\n/*\nSet the default cursor for buttons.\n*/\n\nbutton,\n[role=\"button\"] {\n  cursor: pointer;\n}\n\n/*\nMake sure disabled buttons don't get the pointer cursor.\n*/\n:disabled {\n  cursor: default;\n}\n\n/*\n1. Make replaced elements `display: block` by default. (https://github.com/mozdevs/cssremedy/issues/14)\n2. Add `vertical-align: middle` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)\n   This can trigger a poorly considered lint error in some tools but is included by design.\n*/\n\nimg,\nsvg,\nvideo,\ncanvas,\naudio,\niframe,\nembed,\nobject {\n  display: block; /* 1 */\n  vertical-align: middle; /* 2 */\n}\n\n/*\nConstrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)\n*/\n\nimg,\nvideo {\n  max-width: 100%;\n  height: auto;\n}\n\n/* Make elements with the HTML hidden attribute stay hidden by default */\n[hidden]:where(:not([hidden=\"until-found\"])) {\n  display: none;\n}\n  .rf-root {\n    --radius: 10px;\n    --rf-bg: color-mix(in srgb, var(--dsw-alias-bg-base) 96%, var(--dsw-alias-label-primary) 4%);\n    --rf-surface: var(--dsw-alias-bg-base);\n    --rf-surface-2: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);\n    --rf-surface-3: color-mix(in srgb, var(--dsw-alias-bg-base) 90%, var(--dsw-alias-label-primary) 10%);\n    --rf-line: var(--dsw-alias-border-l2);\n    --rf-text-1: var(--dsw-alias-label-primary);\n    --rf-text-2: var(--dsw-alias-label-secondary);\n    --rf-text-3: var(--dsw-alias-label-tertiary);\n    --rf-accent: var(--dsw-alias-brand-primary-new-colorprimary-new-color);\n    --rf-accent-dim: color-mix(in srgb, var(--rf-accent) 14%, var(--rf-surface));\n    --rf-ok: var(--dsw-alias-state-success-primary);\n    --rf-warn: var(--dsw-alias-state-warn-label);\n    --rf-error: var(--dsw-alias-state-error-primary);\n    --rf-on-accent: var(--dsw-alias-toast-label);\n    --rf-accent-hover: color-mix(in srgb, var(--rf-accent) 86%, var(--dsw-alias-label-primary));\n    --background: var(--rf-bg);\n    --foreground: var(--rf-text-1);\n    --card: var(--rf-surface);\n    --card-foreground: var(--rf-text-1);\n    --popover: var(--rf-surface);\n    --popover-foreground: var(--rf-text-1);\n    --primary: var(--rf-accent);\n    --primary-foreground: var(--rf-on-accent);\n    --secondary: var(--rf-surface-3);\n    --secondary-foreground: var(--rf-text-1);\n    --muted: var(--rf-surface-2);\n    --muted-foreground: var(--rf-text-2);\n    --accent: var(--rf-accent-dim);\n    --accent-foreground: var(--rf-text-1);\n    --destructive: var(--rf-error);\n    --destructive-foreground: var(--rf-on-accent);\n    --border: var(--rf-line);\n    --input: var(--rf-line);\n    --ring: var(--rf-accent);\n  }\n\n  body[data-ds-dark-theme] .rf-root {\n    --rf-bg: var(--dsw-alias-bg-base);\n    --rf-surface: var(--dsw-alias-bg-layer-1);\n    --rf-surface-2: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 22%, var(--dsw-alias-bg-base));\n    --rf-surface-3: var(--dsw-alias-bg-layer-3);\n  }\n.rf-root .pointer-events-none {\n  pointer-events: none;\n}\n.rf-root .visible {\n  visibility: visible;\n}\n.rf-root .collapse {\n  visibility: collapse;\n}\n.rf-root .relative {\n  position: relative;\n}\n.rf-root .my-1 {\n  margin-top: 0.25rem;\n  margin-bottom: 0.25rem;\n}\n.rf-root .mb-1 {\n  margin-bottom: 0.25rem;\n}\n.rf-root .mb-2 {\n  margin-bottom: 0.5rem;\n}\n.rf-root .ml-auto {\n  margin-left: auto;\n}\n.rf-root .mt-1 {\n  margin-top: 0.25rem;\n}\n.rf-root .mt-2 {\n  margin-top: 0.5rem;\n}\n.rf-root .mt-3 {\n  margin-top: 0.75rem;\n}\n.rf-root .box-border {\n  box-sizing: border-box;\n}\n.rf-root .block {\n  display: block;\n}\n.rf-root .flex {\n  display: flex;\n}\n.rf-root .inline-flex {\n  display: inline-flex;\n}\n.rf-root .grid {\n  display: grid;\n}\n.rf-root .h-1\\.5 {\n  height: 0.375rem;\n}\n.rf-root .h-10 {\n  height: 2.5rem;\n}\n.rf-root .h-11 {\n  height: 2.75rem;\n}\n.rf-root .h-2 {\n  height: 0.5rem;\n}\n.rf-root .h-2\\.5 {\n  height: 0.625rem;\n}\n.rf-root .h-4 {\n  height: 1rem;\n}\n.rf-root .h-7 {\n  height: 1.75rem;\n}\n.rf-root .h-8 {\n  height: 2rem;\n}\n.rf-root .h-9 {\n  height: 2.25rem;\n}\n.rf-root .h-\\[168px\\] {\n  height: 168px;\n}\n.rf-root .h-\\[18px\\] {\n  height: 18px;\n}\n.rf-root .h-\\[42px\\] {\n  height: 42px;\n}\n.rf-root .h-\\[50px\\] {\n  height: 50px;\n}\n.rf-root .h-\\[60px\\] {\n  height: 60px;\n}\n.rf-root .h-\\[70px\\] {\n  height: 70px;\n}\n.rf-root .h-\\[7px\\] {\n  height: 7px;\n}\n.rf-root .h-full {\n  height: 100%;\n}\n.rf-root .min-h-0 {\n  min-height: 0px;\n}\n.rf-root .min-h-10 {\n  min-height: 2.5rem;\n}\n.rf-root .min-h-8 {\n  min-height: 2rem;\n}\n.rf-root .min-h-\\[120px\\] {\n  min-height: 120px;\n}\n.rf-root .w-1\\.5 {\n  width: 0.375rem;\n}\n.rf-root .w-2\\.5 {\n  width: 0.625rem;\n}\n.rf-root .w-4 {\n  width: 1rem;\n}\n.rf-root .w-7 {\n  width: 1.75rem;\n}\n.rf-root .w-9 {\n  width: 2.25rem;\n}\n.rf-root .w-\\[104px\\] {\n  width: 104px;\n}\n.rf-root .w-\\[18px\\] {\n  width: 18px;\n}\n.rf-root .w-\\[7px\\] {\n  width: 7px;\n}\n.rf-root .w-full {\n  width: 100%;\n}\n.rf-root .w-px {\n  width: 1px;\n}\n.rf-root .min-w-0 {\n  min-width: 0px;\n}\n.rf-root .flex-1 {\n  flex: 1 1 0%;\n}\n.rf-root .shrink-0 {\n  flex-shrink: 0;\n}\n.rf-root .transform {\n  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));\n}\n.rf-root .cursor-pointer {\n  cursor: pointer;\n}\n.rf-root .resize-y {\n  resize: vertical;\n}\n.rf-root .resize {\n  resize: both;\n}\n.rf-root .grid-cols-1 {\n  grid-template-columns: repeat(1, minmax(0, 1fr));\n}\n.rf-root .grid-cols-2 {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}\n.rf-root .grid-cols-3 {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n}\n.rf-root .flex-row {\n  flex-direction: row;\n}\n.rf-root .flex-col {\n  flex-direction: column;\n}\n.rf-root .flex-wrap {\n  flex-wrap: wrap;\n}\n.rf-root .items-center {\n  align-items: center;\n}\n.rf-root .justify-center {\n  justify-content: center;\n}\n.rf-root .gap-1 {\n  gap: 0.25rem;\n}\n.rf-root .gap-1\\.5 {\n  gap: 0.375rem;\n}\n.rf-root .gap-2 {\n  gap: 0.5rem;\n}\n.rf-root .gap-2\\.5 {\n  gap: 0.625rem;\n}\n.rf-root .gap-3 {\n  gap: 0.75rem;\n}\n.rf-root .gap-3\\.5 {\n  gap: 0.875rem;\n}\n.rf-root .gap-4 {\n  gap: 1rem;\n}\n.rf-root .gap-5 {\n  gap: 1.25rem;\n}\n.rf-root :is(.space-y-1\\.5 > :not([hidden]) ~ :not([hidden])) {\n  --tw-space-y-reverse: 0;\n  margin-top: calc(0.375rem * calc(1 - var(--tw-space-y-reverse)));\n  margin-bottom: calc(0.375rem * var(--tw-space-y-reverse));\n}\n.rf-root .overflow-hidden {\n  overflow: hidden;\n}\n.rf-root .overflow-x-auto {\n  overflow-x: auto;\n}\n.rf-root .overflow-y-auto {\n  overflow-y: auto;\n}\n.rf-root .overflow-x-hidden {\n  overflow-x: hidden;\n}\n.rf-root .whitespace-nowrap {\n  white-space: nowrap;\n}\n.rf-root .break-all {\n  word-break: break-all;\n}\n.rf-root .rounded {\n  border-radius: 0.25rem;\n}\n.rf-root .rounded-2xl {\n  border-radius: 1rem;\n}\n.rf-root .rounded-\\[10px\\] {\n  border-radius: 10px;\n}\n.rf-root .rounded-full {\n  border-radius: 9999px;\n}\n.rf-root .rounded-lg {\n  border-radius: var(--radius);\n}\n.rf-root .rounded-md {\n  border-radius: calc(var(--radius) - 2px);\n}\n.rf-root .rounded-sm {\n  border-radius: calc(var(--radius) - 4px);\n}\n.rf-root .border {\n  border-width: 1px;\n}\n.rf-root .border-0 {\n  border-width: 0px;\n}\n.rf-root .border-l-4 {\n  border-left-width: 4px;\n}\n.rf-root .border-t {\n  border-top-width: 1px;\n}\n.rf-root .border-dashed {\n  border-style: dashed;\n}\n.rf-root .border-\\[var\\(--rf-warn\\)\\] {\n  border-color: var(--rf-warn);\n}\n.rf-root .border-border {\n  border-color: var(--border);\n}\n.rf-root .border-destructive {\n  border-color: var(--destructive);\n}\n.rf-root .border-input {\n  border-color: var(--input);\n}\n.rf-root .border-primary {\n  border-color: var(--primary);\n}\n.rf-root .border-transparent {\n  border-color: transparent;\n}\n.rf-root .border-l-primary {\n  border-left-color: var(--primary);\n}\n.rf-root .bg-\\[color-mix\\(in_srgb\\2c var\\(--rf-warn\\)_10\\%\\2c var\\(--card\\)\\)\\] {\n  background-color: color-mix(in srgb,var(--rf-warn) 10%,var(--card));\n}\n.rf-root .bg-\\[var\\(--rf-ok\\)\\] {\n  background-color: var(--rf-ok);\n}\n.rf-root .bg-\\[var\\(--rf-warn\\)\\] {\n  background-color: var(--rf-warn);\n}\n.rf-root .bg-accent {\n  background-color: var(--accent);\n}\n.rf-root .bg-background {\n  background-color: var(--background);\n}\n.rf-root .bg-border {\n  background-color: var(--border);\n}\n.rf-root .bg-card {\n  background-color: var(--card);\n}\n.rf-root .bg-destructive {\n  background-color: var(--destructive);\n}\n.rf-root .bg-muted {\n  background-color: var(--muted);\n}\n.rf-root .bg-muted-foreground {\n  background-color: var(--muted-foreground);\n}\n.rf-root .bg-primary {\n  background-color: var(--primary);\n}\n.rf-root .bg-primary-foreground {\n  background-color: var(--primary-foreground);\n}\n.rf-root .bg-secondary {\n  background-color: var(--secondary);\n}\n.rf-root .bg-transparent {\n  background-color: transparent;\n}\n.rf-root .object-contain {\n  -o-object-fit: contain;\n     object-fit: contain;\n}\n.rf-root .p-0 {\n  padding: 0px;\n}\n.rf-root .p-2\\.5 {\n  padding: 0.625rem;\n}\n.rf-root .p-3 {\n  padding: 0.75rem;\n}\n.rf-root .p-3\\.5 {\n  padding: 0.875rem;\n}\n.rf-root .p-4 {\n  padding: 1rem;\n}\n.rf-root .p-5 {\n  padding: 1.25rem;\n}\n.rf-root .px-1\\.5 {\n  padding-left: 0.375rem;\n  padding-right: 0.375rem;\n}\n.rf-root .px-2 {\n  padding-left: 0.5rem;\n  padding-right: 0.5rem;\n}\n.rf-root .px-2\\.5 {\n  padding-left: 0.625rem;\n  padding-right: 0.625rem;\n}\n.rf-root .px-3 {\n  padding-left: 0.75rem;\n  padding-right: 0.75rem;\n}\n.rf-root .px-4 {\n  padding-left: 1rem;\n  padding-right: 1rem;\n}\n.rf-root .px-5 {\n  padding-left: 1.25rem;\n  padding-right: 1.25rem;\n}\n.rf-root .px-8 {\n  padding-left: 2rem;\n  padding-right: 2rem;\n}\n.rf-root .py-0\\.5 {\n  padding-top: 0.125rem;\n  padding-bottom: 0.125rem;\n}\n.rf-root .py-1 {\n  padding-top: 0.25rem;\n  padding-bottom: 0.25rem;\n}\n.rf-root .py-1\\.5 {\n  padding-top: 0.375rem;\n  padding-bottom: 0.375rem;\n}\n.rf-root .py-2 {\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n}\n.rf-root .py-3 {\n  padding-top: 0.75rem;\n  padding-bottom: 0.75rem;\n}\n.rf-root .pl-6 {\n  padding-left: 1.5rem;\n}\n.rf-root .pt-0 {\n  padding-top: 0px;\n}\n.rf-root .text-left {\n  text-align: left;\n}\n.rf-root .text-center {\n  text-align: center;\n}\n.rf-root .font-sans {\n  font-family: ui-sans-serif, system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\n}\n.rf-root .text-\\[10px\\] {\n  font-size: 10px;\n}\n.rf-root .text-\\[11px\\] {\n  font-size: 11px;\n}\n.rf-root .text-\\[13px\\] {\n  font-size: 13px;\n}\n.rf-root .text-\\[9px\\] {\n  font-size: 9px;\n}\n.rf-root .text-sm {\n  font-size: 0.875rem;\n  line-height: 1.25rem;\n}\n.rf-root .text-xs {\n  font-size: 0.75rem;\n  line-height: 1rem;\n}\n.rf-root .font-medium {\n  font-weight: 500;\n}\n.rf-root .font-normal {\n  font-weight: 400;\n}\n.rf-root .font-semibold {\n  font-weight: 600;\n}\n.rf-root .leading-none {\n  line-height: 1;\n}\n.rf-root .leading-normal {\n  line-height: 1.5;\n}\n.rf-root .tracking-tight {\n  letter-spacing: -0.025em;\n}\n.rf-root .text-\\[var\\(--rf-ok\\)\\] {\n  color: var(--rf-ok);\n}\n.rf-root .text-\\[var\\(--rf-warn\\)\\] {\n  color: var(--rf-warn);\n}\n.rf-root .text-card-foreground {\n  color: var(--card-foreground);\n}\n.rf-root .text-destructive {\n  color: var(--destructive);\n}\n.rf-root .text-destructive-foreground {\n  color: var(--destructive-foreground);\n}\n.rf-root .text-foreground {\n  color: var(--foreground);\n}\n.rf-root .text-muted-foreground {\n  color: var(--muted-foreground);\n}\n.rf-root .text-primary {\n  color: var(--primary);\n}\n.rf-root .text-primary-foreground {\n  color: var(--primary-foreground);\n}\n.rf-root .text-secondary-foreground {\n  color: var(--secondary-foreground);\n}\n.rf-root .no-underline {\n  text-decoration-line: none;\n}\n.rf-root .underline-offset-4 {\n  text-underline-offset: 4px;\n}\n.rf-root .accent-primary {\n  accent-color: var(--primary);\n}\n.rf-root .shadow-none {\n  --tw-shadow: 0 0 #0000;\n  --tw-shadow-colored: 0 0 #0000;\n  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);\n}\n.rf-root .shadow-sm {\n  --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n  --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);\n  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);\n}\n.rf-root .outline {\n  outline-style: solid;\n}\n.rf-root .filter {\n  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);\n}\n.rf-root .transition-all {\n  transition-property: all;\n  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n  transition-duration: 150ms;\n}\n.rf-root .transition-colors {\n  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;\n  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n  transition-duration: 150ms;\n}\n@keyframes enter {\n\n  from {\n    opacity: var(--tw-enter-opacity, 1);\n    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0));\n  }\n}\n@keyframes exit {\n\n  to {\n    opacity: var(--tw-exit-opacity, 1);\n    transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0));\n  }\n}\n.rf-root .running {\n  animation-play-state: running;\n}\n.rf-root .file\\:border-0::file-selector-button {\n  border-width: 0px;\n}\n.rf-root .file\\:bg-transparent::file-selector-button {\n  background-color: transparent;\n}\n.rf-root .file\\:text-sm::file-selector-button {\n  font-size: 0.875rem;\n  line-height: 1.25rem;\n}\n.rf-root .file\\:font-medium::file-selector-button {\n  font-weight: 500;\n}\n.rf-root .file\\:text-foreground::file-selector-button {\n  color: var(--foreground);\n}\n.rf-root .placeholder\\:text-muted-foreground::-moz-placeholder {\n  color: var(--muted-foreground);\n}\n.rf-root .placeholder\\:text-muted-foreground::placeholder {\n  color: var(--muted-foreground);\n}\n.rf-root .after\\:block::after {\n  content: var(--tw-content);\n  display: block;\n}\n.rf-root .after\\:h-3::after {\n  content: var(--tw-content);\n  height: 0.75rem;\n}\n.rf-root .after\\:w-3::after {\n  content: var(--tw-content);\n  width: 0.75rem;\n}\n.rf-root .after\\:rounded-sm::after {\n  content: var(--tw-content);\n  border-radius: calc(var(--radius) - 4px);\n}\n.rf-root .after\\:bg-primary::after {\n  content: var(--tw-content);\n  background-color: var(--primary);\n}\n.rf-root .hover\\:bg-accent:hover {\n  background-color: var(--accent);\n}\n.rf-root .hover\\:text-accent-foreground:hover {\n  color: var(--accent-foreground);\n}\n.rf-root .hover\\:underline:hover {\n  text-decoration-line: underline;\n}\n.rf-root .hover\\:opacity-90:hover {\n  opacity: 0.9;\n}\n.rf-root .focus\\:outline-none:focus {\n  outline: 2px solid transparent;\n  outline-offset: 2px;\n}\n.rf-root .focus\\:ring-2:focus {\n  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);\n  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);\n  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);\n}\n.rf-root .focus\\:ring-ring:focus {\n  --tw-ring-color: var(--ring);\n}\n.rf-root .focus\\:ring-offset-2:focus {\n  --tw-ring-offset-width: 2px;\n}\n.rf-root .focus-visible\\:outline-none:focus-visible {\n  outline: 2px solid transparent;\n  outline-offset: 2px;\n}\n.rf-root .focus-visible\\:ring-2:focus-visible {\n  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);\n  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);\n  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);\n}\n.rf-root .focus-visible\\:ring-ring:focus-visible {\n  --tw-ring-color: var(--ring);\n}\n.rf-root .focus-visible\\:ring-offset-2:focus-visible {\n  --tw-ring-offset-width: 2px;\n}\n.rf-root .focus-visible\\:ring-offset-background:focus-visible {\n  --tw-ring-offset-color: var(--background);\n}\n.rf-root .disabled\\:pointer-events-none:disabled {\n  pointer-events: none;\n}\n.rf-root .disabled\\:cursor-not-allowed:disabled {\n  cursor: not-allowed;\n}\n.rf-root .disabled\\:opacity-50:disabled {\n  opacity: 0.5;\n}\n.rf-root .disabled\\:opacity-60:disabled {\n  opacity: 0.6;\n}\n.rf-root :is(.peer:disabled ~ .peer-disabled\\:cursor-not-allowed) {\n  cursor: not-allowed;\n}\n.rf-root :is(.peer:disabled ~ .peer-disabled\\:opacity-70) {\n  opacity: 0.7;\n}\n.rf-root .dark\\:border-destructive:where(body[data-ds-dark-theme] .rf-root, body[data-ds-dark-theme] .rf-root *) {\n  border-color: var(--destructive);\n}\n.rf-root :is(.\\[\\&\\>svg\\+div\\]\\:translate-y-\\[-3px\\]>svg+div) {\n  --tw-translate-y: -3px;\n  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));\n}\n.rf-root :is(.\\[\\&\\>svg\\]\\:absolute>svg) {\n  position: absolute;\n}\n.rf-root :is(.\\[\\&\\>svg\\]\\:left-4>svg) {\n  left: 1rem;\n}\n.rf-root :is(.\\[\\&\\>svg\\]\\:top-4>svg) {\n  top: 1rem;\n}\n.rf-root :is(.\\[\\&\\>svg\\]\\:text-destructive>svg) {\n  color: var(--destructive);\n}\n.rf-root :is(.\\[\\&\\>svg\\]\\:text-foreground>svg) {\n  color: var(--foreground);\n}\n.rf-root :is(.\\[\\&\\>svg\\~\\*\\]\\:pl-7>svg~*) {\n  padding-left: 1.75rem;\n}\n.rf-root :is(.focus-within\\:\\[\\&_\\.rf-ui-card\\]\\:border-primary .rf-ui-card:focus-within) {\n  border-color: var(--primary);\n}\n.rf-root :is(.\\[\\&_\\.stage-dot\\]\\:bg-\\[var\\(--rf-ok\\)\\] .stage-dot) {\n  background-color: var(--rf-ok);\n}\n.rf-root :is(.\\[\\&_\\.stage-dot\\]\\:bg-border .stage-dot) {\n  background-color: var(--border);\n}\n.rf-root :is(.\\[\\&_\\.stage-dot\\]\\:bg-primary .stage-dot) {\n  background-color: var(--primary);\n}\n.rf-root :is(.\\[\\&_\\.stage-label\\]\\:rounded-md .stage-label) {\n  border-radius: calc(var(--radius) - 2px);\n}\n.rf-root :is(.\\[\\&_\\.stage-label\\]\\:bg-accent .stage-label) {\n  background-color: var(--accent);\n}\n.rf-root :is(.\\[\\&_\\.stage-label\\]\\:px-1\\.5 .stage-label) {\n  padding-left: 0.375rem;\n  padding-right: 0.375rem;\n}\n.rf-root :is(.\\[\\&_\\.stage-label\\]\\:py-0\\.5 .stage-label) {\n  padding-top: 0.125rem;\n  padding-bottom: 0.125rem;\n}\n.rf-root :is(.\\[\\&_\\.thumb-target\\]\\:outline .thumb-target) {\n  outline-style: solid;\n}\n.rf-root :is(.\\[\\&_\\.thumb-target\\]\\:outline-2 .thumb-target) {\n  outline-width: 2px;\n}\n.rf-root :is(.\\[\\&_\\.thumb-target\\]\\:outline-offset-2 .thumb-target) {\n  outline-offset: 2px;\n}\n.rf-root :is(.\\[\\&_\\.thumb-target\\]\\:outline-primary .thumb-target) {\n  outline-color: var(--primary);\n}\n.rf-root :is(.\\[\\&_p\\]\\:leading-relaxed p) {\n  line-height: 1.625;\n}\n.rf-root :is(.\\[\\&_svg\\]\\:pointer-events-none svg) {\n  pointer-events: none;\n}\n.rf-root :is(.\\[\\&_svg\\]\\:size-4 svg) {\n  width: 1rem;\n  height: 1rem;\n}\n.rf-root :is(.\\[\\&_svg\\]\\:shrink-0 svg) {\n  flex-shrink: 0;\n}";
RF.STYLES = RF.TAILWIND_STYLES;
})(RF);

/* ── src/client/generated/ui-shadcn.js ───────────────────────────── */
/* eslint-disable */
// 由 src/client/build-ui.mjs 生成，请勿手改。
;(function (RF) {
'use strict';
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/ui/lib/react-shim.js
var react_shim_exports = {};
__export(react_shim_exports, {
  Fragment: () => Fragment,
  createContext: () => createContext,
  createElement: () => createElement,
  default: () => react_shim_default,
  forwardRef: () => forwardRef,
  useCallback: () => useCallback,
  useContext: () => useContext,
  useEffect: () => useEffect,
  useId: () => useId,
  useLayoutEffect: () => useLayoutEffect,
  useMemo: () => useMemo,
  useRef: () => useRef,
  useState: () => useState
});
function createElement(type, props, ...children) {
  return h(type, props, ...children);
}
function forwardRef(render) {
  function Forwarded(props) {
    return render(props, props?.ref);
  }
  Forwarded.displayName = render.displayName || render.name || "Forwarded";
  return Forwarded;
}
function createContext(defaultValue) {
  return React.createContext(defaultValue);
}
var ReactShim, react_shim_default, Fragment, useContext, useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect, useId;
var init_react_shim = __esm({
  "src/client/ui/lib/react-shim.js"() {
    ReactShim = {
      createElement,
      forwardRef,
      createContext,
      useContext: (...args) => React.useContext(...args),
      useState: (...args) => React.useState(...args),
      useMemo: (...args) => React.useMemo(...args),
      useCallback: (...args) => React.useCallback(...args),
      useRef: (...args) => React.useRef(...args),
      useEffect: (...args) => React.useEffect(...args),
      useLayoutEffect: (...args) => React.useLayoutEffect(...args),
      useId: (...args) => React.useId ? React.useId(...args) : "rf-ui",
      Fragment: React.Fragment
    };
    react_shim_default = ReactShim;
    Fragment = React.Fragment;
    useContext = (...args) => React.useContext(...args);
    useState = (...args) => React.useState(...args);
    useMemo = (...args) => React.useMemo(...args);
    useCallback = (...args) => React.useCallback(...args);
    useRef = (...args) => React.useRef(...args);
    useEffect = (...args) => React.useEffect(...args);
    useLayoutEffect = (...args) => React.useLayoutEffect(...args);
    useId = (...args) => React.useId ? React.useId(...args) : "rf-ui";
  }
});

// node_modules/react-dom/cjs/react-dom.development.js
var require_react_dom_development = __commonJS({
  "node_modules/react-dom/cjs/react-dom.development.js"(exports) {
    "use strict";
    (function() {
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function createPortal$1(children, containerInfo, implementation) {
        var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
        if (null == key) key = null;
        else if (key === REACT_OPTIMISTIC_KEY) key = REACT_OPTIMISTIC_KEY;
        else {
          try {
            testStringCoercion(key);
            var JSCompiler_inline_result = false;
          } catch (e) {
            JSCompiler_inline_result = true;
          }
          JSCompiler_inline_result && (console.error(
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            "function" === typeof Symbol && Symbol.toStringTag && key[Symbol.toStringTag] || key.constructor.name || "Object"
          ), testStringCoercion(key));
          key = "" + key;
        }
        return {
          $$typeof: REACT_PORTAL_TYPE,
          key,
          children,
          containerInfo,
          implementation
        };
      }
      function getCrossOriginStringAs(as, input) {
        if ("font" === as) return "";
        if ("string" === typeof input)
          return "use-credentials" === input ? input : "";
      }
      function getValueDescriptorExpectingObjectForWarning(thing) {
        return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : 'something with type "' + typeof thing + '"';
      }
      function getValueDescriptorExpectingEnumForWarning(thing) {
        return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : "string" === typeof thing ? JSON.stringify(thing) : "number" === typeof thing ? "`" + thing + "`" : 'something with type "' + typeof thing + '"';
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React2 = (init_react_shim(), __toCommonJS(react_shim_exports)), Internals = {
        d: {
          f: noop,
          r: function() {
            throw Error(
              "Invalid form element. requestFormReset must be passed a form that was rendered by React."
            );
          },
          D: noop,
          C: noop,
          L: noop,
          m: noop,
          X: noop,
          S: noop,
          M: noop
        },
        p: 0,
        findDOMNode: null
      }, REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable"), REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"), ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      "function" === typeof Map && null != Map.prototype && "function" === typeof Map.prototype.forEach && "function" === typeof Set && null != Set.prototype && "function" === typeof Set.prototype.clear && "function" === typeof Set.prototype.forEach || console.error(
        "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
      );
      exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
      exports.browser = function(reason) {
        return { $$typeof: REACT_RECOVERABLE_TYPE, _reason: reason };
      };
      exports.createPortal = function(children, container) {
        var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
        if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
          throw Error("Target container is not a DOM element.");
        return createPortal$1(children, container, null, key);
      };
      exports.flushSync = function(fn) {
        var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
        try {
          if (ReactSharedInternals.T = null, Internals.p = 2, fn)
            return fn();
        } finally {
          ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f() && console.error(
            "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
          );
        }
      };
      exports.preconnect = function(href, options) {
        "string" === typeof href && href ? null != options && "object" !== typeof options ? console.error(
          "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
          getValueDescriptorExpectingEnumForWarning(options)
        ) : null != options && "string" !== typeof options.crossOrigin && console.error(
          "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
          getValueDescriptorExpectingObjectForWarning(options.crossOrigin)
        ) : console.error(
          "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          getValueDescriptorExpectingObjectForWarning(href)
        );
        "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
      };
      exports.prefetchDNS = function(href) {
        if ("string" !== typeof href || !href)
          console.error(
            "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
            getValueDescriptorExpectingObjectForWarning(href)
          );
        else if (1 < arguments.length) {
          var options = arguments[1];
          "object" === typeof options && options.hasOwnProperty("crossOrigin") ? console.error(
            "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
            getValueDescriptorExpectingEnumForWarning(options)
          ) : console.error(
            "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
            getValueDescriptorExpectingEnumForWarning(options)
          );
        }
        "string" === typeof href && Internals.d.D(href);
      };
      exports.preinit = function(href, options) {
        "string" === typeof href && href ? null == options || "object" !== typeof options ? console.error(
          "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
          getValueDescriptorExpectingEnumForWarning(options)
        ) : "style" !== options.as && "script" !== options.as && console.error(
          'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
          getValueDescriptorExpectingEnumForWarning(options.as)
        ) : console.error(
          "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          getValueDescriptorExpectingObjectForWarning(href)
        );
        if ("string" === typeof href && options && "string" === typeof options.as) {
          var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
          "style" === as ? Internals.d.S(
            href,
            "string" === typeof options.precedence ? options.precedence : void 0,
            {
              crossOrigin,
              integrity,
              fetchPriority
            }
          ) : "script" === as && Internals.d.X(href, {
            crossOrigin,
            integrity,
            fetchPriority,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0
          });
        }
      };
      exports.preinitModule = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "script" !== options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingEnumForWarning(options.as) + ".");
        if (encountered)
          console.error(
            "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
            encountered
          );
        else
          switch (encountered = options && "string" === typeof options.as ? options.as : "script", encountered) {
            case "script":
              break;
            default:
              encountered = getValueDescriptorExpectingEnumForWarning(encountered), console.error(
                'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
                encountered,
                href
              );
          }
        if ("string" === typeof href)
          if ("object" === typeof options && null !== options) {
            if (null == options.as || "script" === options.as)
              encountered = getCrossOriginStringAs(
                options.as,
                options.crossOrigin
              ), Internals.d.M(href, {
                crossOrigin: encountered,
                integrity: "string" === typeof options.integrity ? options.integrity : void 0,
                nonce: "string" === typeof options.nonce ? options.nonce : void 0,
                fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
              });
          } else null == options && Internals.d.M(href);
      };
      exports.preload = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        null == options || "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : "string" === typeof options.as && options.as || (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
        encountered && console.error(
          'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
          encountered
        );
        if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
          encountered = options.as;
          var crossOrigin = getCrossOriginStringAs(
            encountered,
            options.crossOrigin
          );
          Internals.d.L(href, encountered, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0,
            type: "string" === typeof options.type ? options.type : void 0,
            fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
            referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
            imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
            imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
            media: "string" === typeof options.media ? options.media : void 0
          });
        }
      };
      exports.preloadModule = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "string" !== typeof options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
        encountered && console.error(
          'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
          encountered
        );
        "string" === typeof href && (options ? (encountered = getCrossOriginStringAs(
          options.as,
          options.crossOrigin
        ), Internals.d.m(href, {
          as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
          crossOrigin: encountered,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0,
          fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
        })) : Internals.d.m(href));
      };
      exports.requestFormReset = function(form) {
        Internals.d.r(form);
      };
      exports.unstable_batchedUpdates = function(fn, a) {
        return fn(a);
      };
      exports.useFormState = function(action, initialState, permalink) {
        return resolveDispatcher().useFormState(action, initialState, permalink);
      };
      exports.useFormStatus = function() {
        return resolveDispatcher().useHostTransitionStatus();
      };
      exports.version = "19.3.1";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react-dom/index.js
var require_react_dom = __commonJS({
  "node_modules/react-dom/index.js"(exports, module) {
    "use strict";
    if (false) {
      checkDCE();
      module.exports = null;
    } else {
      module.exports = require_react_dom_development();
    }
  }
});

// src/client/ui/components/ui/card.jsx
init_react_shim();

// node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}

// node_modules/tailwind-merge/dist/bundle-mjs.mjs
var CLASS_PART_SEPARATOR = "-";
var createClassGroupUtils = (config) => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = (className) => {
    const classParts = className.split(CLASS_PART_SEPARATOR);
    if (classParts[0] === "" && classParts.length !== 1) {
      classParts.shift();
    }
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    const conflicts = conflictingClassGroups[classGroupId] || [];
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
    }
    return conflicts;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
var getGroupRecursive = (classParts, classPartObject) => {
  if (classParts.length === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[0];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : void 0;
  if (classGroupFromNextClassPart) {
    return classGroupFromNextClassPart;
  }
  if (classPartObject.validators.length === 0) {
    return void 0;
  }
  const classRest = classParts.join(CLASS_PART_SEPARATOR);
  return classPartObject.validators.find(({
    validator
  }) => validator(classRest))?.classGroupId;
};
var arbitraryPropertyRegex = /^\[(.+)\]$/;
var getGroupIdForArbitraryProperty = (className) => {
  if (arbitraryPropertyRegex.test(className)) {
    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
    const property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(":"));
    if (property) {
      return "arbitrary.." + property;
    }
  }
};
var createClassMap = (config) => {
  const {
    theme,
    classGroups
  } = config;
  const classMap = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  for (const classGroupId in classGroups) {
    processClassesRecursively(classGroups[classGroupId], classMap, classGroupId, theme);
  }
  return classMap;
};
var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  classGroup.forEach((classDefinition) => {
    if (typeof classDefinition === "string") {
      const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
      classPartObjectToEdit.classGroupId = classGroupId;
      return;
    }
    if (typeof classDefinition === "function") {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
        return;
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId
      });
      return;
    }
    Object.entries(classDefinition).forEach(([key, classGroup2]) => {
      processClassesRecursively(classGroup2, getPart(classPartObject, key), classGroupId, theme);
    });
  });
};
var getPart = (classPartObject, path) => {
  let currentClassPartObject = classPartObject;
  path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
    if (!currentClassPartObject.nextPart.has(pathPart)) {
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: /* @__PURE__ */ new Map(),
        validators: []
      });
    }
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
  });
  return currentClassPartObject;
};
var isThemeGetter = (func) => func.isThemeGetter;
var createLruCache = (maxCacheSize) => {
  if (maxCacheSize < 1) {
    return {
      get: () => void 0,
      set: () => {
      }
    };
  }
  let cacheSize = 0;
  let cache = /* @__PURE__ */ new Map();
  let previousCache = /* @__PURE__ */ new Map();
  const update = (key, value) => {
    cache.set(key, value);
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = /* @__PURE__ */ new Map();
    }
  };
  return {
    get(key) {
      let value = cache.get(key);
      if (value !== void 0) {
        return value;
      }
      if ((value = previousCache.get(key)) !== void 0) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (cache.has(key)) {
        cache.set(key, value);
      } else {
        update(key, value);
      }
    }
  };
};
var IMPORTANT_MODIFIER = "!";
var MODIFIER_SEPARATOR = ":";
var MODIFIER_SEPARATOR_LENGTH = MODIFIER_SEPARATOR.length;
var createParseClassName = (config) => {
  const {
    prefix,
    experimentalParseClassName
  } = config;
  let parseClassName = (className) => {
    const modifiers = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    for (let index = 0; index < className.length; index++) {
      let currentCharacter = className[index];
      if (bracketDepth === 0 && parenDepth === 0) {
        if (currentCharacter === MODIFIER_SEPARATOR) {
          modifiers.push(className.slice(modifierStart, index));
          modifierStart = index + MODIFIER_SEPARATOR_LENGTH;
          continue;
        }
        if (currentCharacter === "/") {
          postfixModifierPosition = index;
          continue;
        }
      }
      if (currentCharacter === "[") {
        bracketDepth++;
      } else if (currentCharacter === "]") {
        bracketDepth--;
      } else if (currentCharacter === "(") {
        parenDepth++;
      } else if (currentCharacter === ")") {
        parenDepth--;
      }
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
    const baseClassName = stripImportantModifier(baseClassNameWithImportantModifier);
    const hasImportantModifier = baseClassName !== baseClassNameWithImportantModifier;
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
    return {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    };
  };
  if (prefix) {
    const fullPrefix = prefix + MODIFIER_SEPARATOR;
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.substring(fullPrefix.length)) : {
      isExternal: true,
      modifiers: [],
      hasImportantModifier: false,
      baseClassName: className,
      maybePostfixModifierPosition: void 0
    };
  }
  if (experimentalParseClassName) {
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => experimentalParseClassName({
      className,
      parseClassName: parseClassNameOriginal
    });
  }
  return parseClassName;
};
var stripImportantModifier = (baseClassName) => {
  if (baseClassName.endsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(0, baseClassName.length - 1);
  }
  if (baseClassName.startsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(1);
  }
  return baseClassName;
};
var createSortModifiers = (config) => {
  const orderSensitiveModifiers = Object.fromEntries(config.orderSensitiveModifiers.map((modifier) => [modifier, true]));
  const sortModifiers = (modifiers) => {
    if (modifiers.length <= 1) {
      return modifiers;
    }
    const sortedModifiers = [];
    let unsortedModifiers = [];
    modifiers.forEach((modifier) => {
      const isPositionSensitive = modifier[0] === "[" || orderSensitiveModifiers[modifier];
      if (isPositionSensitive) {
        sortedModifiers.push(...unsortedModifiers.sort(), modifier);
        unsortedModifiers = [];
      } else {
        unsortedModifiers.push(modifier);
      }
    });
    sortedModifiers.push(...unsortedModifiers.sort());
    return sortedModifiers;
  };
  return sortModifiers;
};
var createConfigUtils = (config) => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  sortModifiers: createSortModifiers(config),
  ...createClassGroupUtils(config)
});
var SPLIT_CLASSES_REGEX = /\s+/;
var mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds,
    sortModifiers
  } = configUtils;
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = "";
  for (let index = classNames.length - 1; index >= 0; index -= 1) {
    const originalClassName = classNames[index];
    const {
      isExternal,
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    if (isExternal) {
      result = originalClassName + (result.length > 0 ? " " + result : result);
      continue;
    }
    let hasPostfixModifier = !!maybePostfixModifierPosition;
    let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = sortModifiers(modifiers).join(":");
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.includes(classId)) {
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    result = originalClassName + (result.length > 0 ? " " + result : result);
  }
  return result;
};
function twJoin() {
  let index = 0;
  let argument;
  let resolvedValue;
  let string = "";
  while (index < arguments.length) {
    if (argument = arguments[index++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
}
var toValue = (mix) => {
  if (typeof mix === "string") {
    return mix;
  }
  let resolvedValue;
  let string = "";
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
function createTailwindMerge(createConfigFirst, ...createConfigRest) {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall = initTailwindMerge;
  function initTailwindMerge(classList) {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  }
  function tailwindMerge(classList) {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments));
  };
}
var fromTheme = (key) => {
  const themeGetter = (theme) => theme[key] || [];
  themeGetter.isThemeGetter = true;
  return themeGetter;
};
var arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
var arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
var fractionRegex = /^\d+\/\d+$/;
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var isFraction = (value) => fractionRegex.test(value);
var isNumber = (value) => !!value && !Number.isNaN(Number(value));
var isInteger = (value) => !!value && Number.isInteger(Number(value));
var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
var isTshirtSize = (value) => tshirtUnitRegex.test(value);
var isAny = () => true;
var isLengthOnly = (value) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
);
var isNever = () => false;
var isShadow = (value) => shadowRegex.test(value);
var isImage = (value) => imageRegex.test(value);
var isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
var isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
var isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
var isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
var isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
var isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
var isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
var isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
var isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
var isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
var isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
var isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
var isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
var isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
var getIsArbitraryValue = (value, testLabel, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
var getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
  const result = arbitraryVariableRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return shouldMatchNoLabel;
  }
  return false;
};
var isLabelPosition = (label) => label === "position" || label === "percentage";
var isLabelImage = (label) => label === "image" || label === "url";
var isLabelSize = (label) => label === "length" || label === "size" || label === "bg-size";
var isLabelLength = (label) => label === "length";
var isLabelNumber = (label) => label === "number";
var isLabelFamilyName = (label) => label === "family-name";
var isLabelShadow = (label) => label === "shadow";
var getDefaultConfig = () => {
  const themeColor = fromTheme("color");
  const themeFont = fromTheme("font");
  const themeText = fromTheme("text");
  const themeFontWeight = fromTheme("font-weight");
  const themeTracking = fromTheme("tracking");
  const themeLeading = fromTheme("leading");
  const themeBreakpoint = fromTheme("breakpoint");
  const themeContainer = fromTheme("container");
  const themeSpacing = fromTheme("spacing");
  const themeRadius = fromTheme("radius");
  const themeShadow = fromTheme("shadow");
  const themeInsetShadow = fromTheme("inset-shadow");
  const themeTextShadow = fromTheme("text-shadow");
  const themeDropShadow = fromTheme("drop-shadow");
  const themeBlur = fromTheme("blur");
  const themePerspective = fromTheme("perspective");
  const themeAspect = fromTheme("aspect");
  const themeEase = fromTheme("ease");
  const themeAnimate = fromTheme("animate");
  const scaleBreak = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
  const scalePosition = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ];
  const scalePositionWithArbitrary = () => [...scalePosition(), isArbitraryVariable, isArbitraryValue];
  const scaleOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
  const scaleOverscroll = () => ["auto", "contain", "none"];
  const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
  const scaleInset = () => [isFraction, "full", "auto", ...scaleUnambiguousSpacing()];
  const scaleGridTemplateColsRows = () => [isInteger, "none", "subgrid", isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartAndEnd = () => ["auto", {
    span: ["full", isInteger, isArbitraryVariable, isArbitraryValue]
  }, isInteger, isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartOrEnd = () => [isInteger, "auto", isArbitraryVariable, isArbitraryValue];
  const scaleGridAutoColsRows = () => ["auto", "min", "max", "fr", isArbitraryVariable, isArbitraryValue];
  const scaleAlignPrimaryAxis = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"];
  const scaleAlignSecondaryAxis = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"];
  const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
  const scaleSizing = () => [isFraction, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
  const scaleBgPosition = () => [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition, {
    position: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleBgRepeat = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }];
  const scaleBgSize = () => ["auto", "cover", "contain", isArbitraryVariableSize, isArbitrarySize, {
    size: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
  const scaleRadius = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    themeRadius,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleBorderWidth = () => ["", isNumber, isArbitraryVariableLength, isArbitraryLength];
  const scaleLineStyle = () => ["solid", "dashed", "dotted", "double"];
  const scaleBlendMode = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
  const scaleMaskImagePosition = () => [isNumber, isPercent, isArbitraryVariablePosition, isArbitraryPosition];
  const scaleBlur = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    themeBlur,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleRotate = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleScale = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleTranslate = () => [isFraction, "full", ...scaleUnambiguousSpacing()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [isTshirtSize],
      breakpoint: [isTshirtSize],
      color: [isAny],
      container: [isTshirtSize],
      "drop-shadow": [isTshirtSize],
      ease: ["in", "out", "in-out"],
      font: [isAnyNonArbitrary],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [isTshirtSize],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [isTshirtSize],
      shadow: [isTshirtSize],
      spacing: ["px", isNumber],
      text: [isTshirtSize],
      "text-shadow": [isTshirtSize],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": scaleBreak()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": scaleBreak()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: scalePositionWithArbitrary()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: scaleOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": scaleOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": scaleOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: scaleOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": scaleOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": scaleOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: scaleInset()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": scaleInset()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": scaleInset()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: scaleInset()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: scaleInset()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: scaleInset()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: scaleInset()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: scaleInset()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: scaleInset()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [isInteger, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [isFraction, "full", "auto", themeContainer, ...scaleUnambiguousSpacing()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [isNumber, isFraction, "auto", "initial", "none", isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [isInteger, "first", "last", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": scaleGridAutoColsRows()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": scaleGridAutoColsRows()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: scaleUnambiguousSpacing()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": scaleUnambiguousSpacing()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": scaleUnambiguousSpacing()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...scaleAlignPrimaryAxis(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...scaleAlignSecondaryAxis(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...scaleAlignPrimaryAxis()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": scaleAlignPrimaryAxis()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: scaleUnambiguousSpacing()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: scaleUnambiguousSpacing()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: scaleUnambiguousSpacing()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: scaleMargin()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: scaleMargin()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: scaleMargin()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: scaleMargin()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: scaleMargin()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: scaleMargin()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: scaleMargin()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: scaleMargin()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: scaleMargin()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: scaleSizing()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [themeContainer, "screen", ...scaleSizing()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          themeContainer,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...scaleSizing()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          themeContainer,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [themeBreakpoint]
          },
          ...scaleSizing()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...scaleSizing()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...scaleSizing()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...scaleSizing()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", themeText, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [themeFontWeight, isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", isPercent, isArbitraryValue]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [isArbitraryVariableFamilyName, isArbitraryValue, themeFont]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [isNumber, "none", isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          themeLeading,
          ...scaleUnambiguousSpacing()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: scaleColor()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: scaleColor()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...scaleLineStyle(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [isNumber, "from-font", "auto", isArbitraryVariable, isArbitraryLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: scaleColor()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [isNumber, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: scaleUnambiguousSpacing()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: scaleBgPosition()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: scaleBgRepeat()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: scaleBgSize()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, isInteger, isArbitraryVariable, isArbitraryValue],
          radial: ["", isArbitraryVariable, isArbitraryValue],
          conic: [isInteger, isArbitraryVariable, isArbitraryValue]
        }, isArbitraryVariableImage, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: scaleColor()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: scaleColor()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: scaleColor()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: scaleColor()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: scaleRadius()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": scaleRadius()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": scaleRadius()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": scaleRadius()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": scaleRadius()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": scaleRadius()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": scaleRadius()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": scaleRadius()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": scaleRadius()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": scaleRadius()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": scaleRadius()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": scaleRadius()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": scaleRadius()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": scaleRadius()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": scaleRadius()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: scaleBorderWidth()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": scaleBorderWidth()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": scaleBorderWidth()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": scaleBorderWidth()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": scaleBorderWidth()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": scaleBorderWidth()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": scaleBorderWidth()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": scaleBorderWidth()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": scaleBorderWidth()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": scaleBorderWidth()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": scaleBorderWidth()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: scaleColor()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": scaleColor()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": scaleColor()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": scaleColor()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": scaleColor()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": scaleColor()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": scaleColor()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": scaleColor()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": scaleColor()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: scaleColor()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...scaleLineStyle(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", isNumber, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: scaleColor()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: scaleColor()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", themeInsetShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": scaleColor()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: scaleBorderWidth()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: scaleColor()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [isNumber, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": scaleColor()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": scaleBorderWidth()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": scaleColor()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", themeTextShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": scaleColor()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...scaleBlendMode(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": scaleBlendMode()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [isNumber]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": scaleMaskImagePosition()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": scaleMaskImagePosition()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": scaleColor()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": scaleColor()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": scaleMaskImagePosition()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": scaleMaskImagePosition()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": scaleColor()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": scaleColor()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": scaleMaskImagePosition()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": scaleMaskImagePosition()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": scaleColor()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": scaleColor()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": scaleMaskImagePosition()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": scaleMaskImagePosition()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": scaleColor()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": scaleColor()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": scaleMaskImagePosition()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": scaleMaskImagePosition()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": scaleColor()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": scaleColor()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": scaleMaskImagePosition()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": scaleMaskImagePosition()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": scaleColor()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": scaleColor()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": scaleMaskImagePosition()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": scaleMaskImagePosition()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": scaleColor()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": scaleColor()
      }],
      "mask-image-radial": [{
        "mask-radial": [isArbitraryVariable, isArbitraryValue]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": scaleMaskImagePosition()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": scaleMaskImagePosition()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": scaleColor()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": scaleColor()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": scalePosition()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [isNumber]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": scaleMaskImagePosition()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": scaleMaskImagePosition()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": scaleColor()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": scaleColor()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: scaleBgPosition()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: scaleBgRepeat()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: scaleBgSize()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: scaleBlur()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeDropShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": scaleColor()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": scaleBlur()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": scaleUnambiguousSpacing()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [isNumber, "initial", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", themeEase, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", themeAnimate, isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": scalePositionWithArbitrary()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: scaleRotate()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": scaleRotate()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": scaleRotate()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": scaleRotate()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: scaleScale()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": scaleScale()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": scaleScale()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": scaleScale()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: scaleSkew()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": scaleSkew()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": scaleSkew()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [isArbitraryVariable, isArbitraryValue, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: scalePositionWithArbitrary()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: scaleTranslate()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": scaleTranslate()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": scaleTranslate()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": scaleTranslate()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: scaleColor()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: scaleColor()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", isArbitraryVariable, isArbitraryValue]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...scaleColor()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...scaleColor()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
};
var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);

// src/client/ui/lib/utils.js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/client/ui/lib/jsx-runtime-shim.js
init_react_shim();
function jsx(type, props, key) {
  if (key !== void 0 && props !== null) {
    return createElement(type, { ...props, key });
  }
  return createElement(type, props);
}
function jsxs(type, props, key) {
  return jsx(type, props, key);
}

// src/client/ui/components/ui/card.jsx
var Card = forwardRef(function Card2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      className: cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className),
      ...props
    }
  );
});
Card.displayName = "Card";
var CardHeader = forwardRef(function CardHeader2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("flex flex-col space-y-1.5 p-4", className), ...props });
});
CardHeader.displayName = "CardHeader";
var CardTitle = forwardRef(function CardTitle2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("font-semibold leading-none tracking-tight", className), ...props });
});
CardTitle.displayName = "CardTitle";
var CardDescription = forwardRef(function CardDescription2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm text-muted-foreground", className), ...props });
});
CardDescription.displayName = "CardDescription";
var CardContent = forwardRef(function CardContent2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("p-4 pt-0", className), ...props });
});
CardContent.displayName = "CardContent";
var CardFooter = forwardRef(function CardFooter2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("flex items-center p-4 pt-0", className), ...props });
});
CardFooter.displayName = "CardFooter";

// src/client/ui/workbench-ui.jsx
function attachWorkbenchUi(RF) {
  const { tw: tw2 } = RF;
  RF.ui.SectionHead = function SectionHead(title, sub) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[13px] font-semibold text-foreground", children: title }),
      sub === void 0 || sub === null || sub === "" ? null : /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: sub })
    ] });
  };
  RF.ui.KvRow = function KvRow(label, value, state, tone, right) {
    const stateClass = {
      ok: "text-[var(--rf-ok)]",
      warn: "text-[var(--rf-warn)]",
      error: "text-destructive",
      muted: "text-muted-foreground"
    }[["ok", "warn", "error", "muted"].includes(tone) ? tone : "muted"];
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
      /* @__PURE__ */ jsx("span", { className: "w-[104px] shrink-0 text-[11px] text-muted-foreground", children: label }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 text-[11px] text-foreground", children: value }),
      state !== void 0 && state !== null && state !== "" ? /* @__PURE__ */ jsx("span", { className: cn("shrink-0 text-[11px]", stateClass), children: state }) : null,
      right !== void 0 && right !== null ? right : null
    ] });
  };
  RF.ui.ChipRow = function ChipRow(items, activeIndex, onSelect, disabledTitle) {
    const list = Array.isArray(items) ? items : [];
    const usable = typeof onSelect === "function";
    return /* @__PURE__ */ jsx("div", { className: tw2.chips, children: list.map((label, index) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: cn(tw2.chip, index === activeIndex && tw2.chipOn),
        disabled: !usable,
        title: usable ? void 0 : disabledTitle,
        onClick: usable ? () => onSelect(index) : void 0,
        children: label
      },
      `${label}-${index}`
    )) });
  };
  RF.ui.Thumb = function Thumb(label, options) {
    const opts = options ?? {};
    const size = Number(opts.size) > 0 ? Number(opts.size) : 48;
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "thumb-target inline-flex shrink-0 items-center justify-center rounded-lg bg-secondary text-[9px] text-muted-foreground",
          opts.picked === true && "bg-accent text-primary"
        ),
        style: { width: `${size}px`, height: `${size}px` },
        children: label
      }
    );
  };
  RF.ui.Notice = function Notice(main, sub) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 rounded-[10px] border-0 bg-muted p-3", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: main }),
      sub === void 0 || sub === null || sub === "" ? null : /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: sub })
    ] });
  };
  RF.ui.PlayerBar = function PlayerBar(duration) {
    return /* @__PURE__ */ jsxs("div", { className: "inline-flex h-8 items-center gap-2 rounded-2xl bg-secondary px-3 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" }),
      /* @__PURE__ */ jsx("span", { children: `0:00 / ${duration}` })
    ] });
  };
  RF.ui.CodeBox = function CodeBox(lines) {
    const list = Array.isArray(lines) ? lines : [];
    return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-1 break-all rounded-lg bg-muted p-2.5 text-[10px] text-muted-foreground", children: list.map((line, index) => /* @__PURE__ */ jsx("div", { children: line }, `${index}`)) });
  };
  RF.ui.RadioInput = function RadioInput(props) {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type: "radio",
        className: "h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60",
        name: props.name,
        value: props.value,
        checked: props.checked === true,
        disabled: props.disabled === true,
        onChange: props.onChange
      }
    );
  };
  RF.ui.CheckboxIndicator = function CheckboxIndicator(checked) {
    return /* @__PURE__ */ jsx(
      "span",
      {
        className: cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-card",
          checked === true && "border-primary bg-primary"
        ),
        "aria-hidden": true,
        children: checked === true ? /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-sm bg-primary-foreground" }) : null
      }
    );
  };
  RF.ui.Track = function Track(ratio, tone) {
    const value = Math.max(0, Math.min(1, Number(ratio) || 0));
    const fillClass = tone === "ok" ? "bg-[var(--rf-ok)]" : tone === "warn" ? "bg-[var(--rf-warn)]" : "bg-primary";
    return /* @__PURE__ */ jsx("div", { className: "h-1.5 overflow-hidden rounded-sm bg-secondary", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: cn("h-full rounded-sm", fillClass),
        style: { width: `${Math.round(value * 100)}%` }
      }
    ) });
  };
  RF.ui.Stat = function Stat(caption, value, sub) {
    return /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: caption }),
      /* @__PURE__ */ jsx("div", { className: "text-[13px] font-semibold text-foreground", children: value }),
      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: sub })
    ] });
  };
  RF.ui.ShotChip = function ShotChip(id, size, state, tone) {
    const dotClass = tone === "ok" ? "bg-[var(--rf-ok)]" : tone === "accent" ? "bg-primary" : "bg-border";
    return /* @__PURE__ */ jsxs(Card, { ...RF.workbenchCard({ className: "gap-1.5 p-3" }), children: [
      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: id }),
      /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-foreground", children: size }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx("span", { className: cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass) }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: state })
      ] })
    ] });
  };
  RF.ui.ChatSync = function ChatSync(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const text = String(project.input?.text ?? "").trim();
    const position = String(project.runPosition ?? "");
    let message = t("rf7.chatSync.empty");
    if (chapters.length > 0) {
      message = t("rf7.chatSync.imported", {
        count: chapters.length,
        pending: position === "" ? t("rf7.chatSync.needRun") : t("rf7.chatSync.ready")
      });
    } else if (text !== "") {
      message = t("rf7.chatSync.captured");
    }
    return /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1.5 text-[10px] text-muted-foreground", children: message });
  };
  RF.ui.EmptyState = function EmptyState(props) {
    const isError = props.tone === "error";
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn(
          "rounded-lg border border-dashed p-4 text-center",
          isError ? "border-destructive" : "border-border"
        ),
        children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs font-medium text-foreground", children: props.title }),
          props.hint === void 0 ? null : /* @__PURE__ */ jsx("div", { className: "mt-1 text-[11px] text-muted-foreground", children: props.hint }),
          props.action === void 0 || props.action === null ? null : /* @__PURE__ */ jsx("div", { className: "mt-3 flex justify-center", children: props.action })
        ]
      }
    );
  };
  RF.ui.FieldBox = function FieldBox(text, kind) {
    const muted = kind === "placeholder" || kind === "masked";
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "flex min-h-8 items-center rounded-lg bg-secondary px-2.5 py-1.5 text-[11px]",
          muted ? "text-muted-foreground" : "text-foreground"
        ),
        children: text
      }
    );
  };
}

// src/client/ui/components/ui/alert.jsx
init_react_shim();

// node_modules/class-variance-authority/dist/index.mjs
var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
var cx = clsx;
var cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};

// src/client/ui/components/ui/alert.jsx
var alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
var Alert = forwardRef(function Alert2({ className, variant, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props });
});
Alert.displayName = "Alert";
var AlertTitle = forwardRef(function AlertTitle2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("mb-1 font-medium leading-none tracking-tight", className), ...props });
});
AlertTitle.displayName = "AlertTitle";
var AlertDescription = forwardRef(function AlertDescription2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm [&_p]:leading-relaxed", className), ...props });
});
AlertDescription.displayName = "AlertDescription";

// src/client/ui/components/ui/badge.jsx
init_react_shim();
var badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}

// src/client/ui/components/ui/button.jsx
init_react_shim();

// node_modules/@radix-ui/react-slot/dist/index.mjs
init_react_shim();

// node_modules/@radix-ui/react-compose-refs/dist/index.mjs
init_react_shim();
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

// node_modules/@radix-ui/react-slot/dist/index.mjs
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = (void 0).toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if ((void 0).count(newElement) > 1) return (void 0).only(null);
          return (void 0)(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: (void 0)(newElement) ? (void 0)(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
var Slot = /* @__PURE__ */ createSlot("Slot");
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if ((void 0)(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return (void 0)(children, props2);
    }
    return (void 0).count(children) > 1 ? (void 0).only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return (void 0)(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}

// src/client/ui/components/ui/button.jsx
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
var Button = forwardRef(function Button2({ className, variant, size, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      className: cn(buttonVariants({ variant, size, className })),
      ref,
      ...props
    }
  );
});
Button.displayName = "Button";

// src/client/ui/components/ui/input.jsx
init_react_shim();
var Input = forwardRef(function Input2({ className, type, ...props }, ref) {
  return /* @__PURE__ */ jsx(
    "input",
    {
      type,
      className: cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ref,
      ...props
    }
  );
});
Input.displayName = "Input";

// src/client/ui/components/ui/label.jsx
init_react_shim();

// node_modules/@radix-ui/react-label/dist/index.mjs
init_react_shim();

// node_modules/@radix-ui/react-primitive/dist/index.mjs
init_react_shim();
var ReactDOM = __toESM(require_react_dom(), 1);
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = createSlot(`Primitive.${node}`);
  const Node = forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});

// node_modules/@radix-ui/react-label/dist/index.mjs
var NAME = "Label";
var Label = forwardRef((props, forwardedRef) => {
  return /* @__PURE__ */ jsx(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        props.onMouseDown?.(event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label.displayName = NAME;
var Root = Label;

// src/client/ui/components/ui/label.jsx
var labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
var Label2 = forwardRef(function Label3({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx(Root, { ref, className: cn(labelVariants(), className), ...props });
});
Label2.displayName = Root.displayName;

// src/client/ui/components/ui/progress.jsx
init_react_shim();

// node_modules/@radix-ui/react-progress/dist/index.mjs
init_react_shim();

// node_modules/@radix-ui/react-context/dist/index.mjs
init_react_shim();
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const value = useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsx(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext2(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const context = useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext2];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}

// node_modules/@radix-ui/react-progress/dist/index.mjs
var PROGRESS_NAME = "Progress";
var DEFAULT_MAX = 100;
var [createProgressContext, createProgressScope] = createContextScope(PROGRESS_NAME);
var [ProgressProvider, useProgressContext] = createProgressContext(PROGRESS_NAME);
var Progress = forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeProgress,
      value: valueProp = null,
      max: maxProp,
      getValueLabel = defaultGetValueLabel,
      ...progressProps
    } = props;
    if ((maxProp || maxProp === 0) && !isValidMaxNumber(maxProp)) {
      console.error(getInvalidMaxError(`${maxProp}`, "Progress"));
    }
    const max = isValidMaxNumber(maxProp) ? maxProp : DEFAULT_MAX;
    if (valueProp !== null && !isValidValueNumber(valueProp, max)) {
      console.error(getInvalidValueError(`${valueProp}`, "Progress"));
    }
    const value = isValidValueNumber(valueProp, max) ? valueProp : null;
    const valueLabel = isNumber2(value) ? getValueLabel(value, max) : void 0;
    return /* @__PURE__ */ jsx(ProgressProvider, { scope: __scopeProgress, value, max, children: /* @__PURE__ */ jsx(
      Primitive.div,
      {
        "aria-valuemax": max,
        "aria-valuemin": 0,
        "aria-valuenow": isNumber2(value) ? value : void 0,
        "aria-valuetext": valueLabel,
        role: "progressbar",
        "data-state": getProgressState(value, max),
        "data-value": value ?? void 0,
        "data-max": max,
        ...progressProps,
        ref: forwardedRef
      }
    ) });
  }
);
Progress.displayName = PROGRESS_NAME;
var INDICATOR_NAME = "ProgressIndicator";
var ProgressIndicator = forwardRef(
  (props, forwardedRef) => {
    const { __scopeProgress, ...indicatorProps } = props;
    const context = useProgressContext(INDICATOR_NAME, __scopeProgress);
    return /* @__PURE__ */ jsx(
      Primitive.div,
      {
        "data-state": getProgressState(context.value, context.max),
        "data-value": context.value ?? void 0,
        "data-max": context.max,
        ...indicatorProps,
        ref: forwardedRef
      }
    );
  }
);
ProgressIndicator.displayName = INDICATOR_NAME;
function defaultGetValueLabel(value, max) {
  return `${Math.round(value / max * 100)}%`;
}
function getProgressState(value, maxValue) {
  return value == null ? "indeterminate" : value === maxValue ? "complete" : "loading";
}
function isNumber2(value) {
  return typeof value === "number";
}
function isValidMaxNumber(max) {
  return isNumber2(max) && !isNaN(max) && max > 0;
}
function isValidValueNumber(value, max) {
  return isNumber2(value) && !isNaN(value) && value <= max && value >= 0;
}
function getInvalidMaxError(propValue, componentName) {
  return `Invalid prop \`max\` of value \`${propValue}\` supplied to \`${componentName}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX}\`.`;
}
function getInvalidValueError(propValue, componentName) {
  return `Invalid prop \`value\` of value \`${propValue}\` supplied to \`${componentName}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`;
}
var Root2 = Progress;
var Indicator = ProgressIndicator;

// src/client/ui/components/ui/progress.jsx
var Progress2 = forwardRef(function Progress3({ className, value, ...props }, ref) {
  return /* @__PURE__ */ jsx(
    Root2,
    {
      ref,
      className: cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className),
      ...props,
      children: /* @__PURE__ */ jsx(
        Indicator,
        {
          className: "h-full w-full flex-1 bg-primary transition-all",
          style: { transform: `translateX(-${100 - (value || 0)}%)` }
        }
      )
    }
  );
});
Progress2.displayName = Root2.displayName;

// src/client/ui/layout-tw.js
var tw = {
  root: "rf-root flex h-full box-border flex-col overflow-hidden bg-background text-foreground text-[13px] leading-normal font-sans",
  header: "flex h-[60px] shrink-0 items-center gap-3 px-5 bg-background",
  headerLogo: "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent after:block after:h-3 after:w-3 after:rounded-sm after:bg-primary",
  headerLogoBtn: "border-0 p-0 cursor-pointer",
  headerText: "min-w-0 flex-1",
  headerTitle: "text-sm font-semibold text-foreground",
  headerSubtitle: "text-[10px] text-muted-foreground",
  stagebar: "flex h-[50px] shrink-0 items-center gap-5 overflow-x-auto bg-muted px-5 pl-6",
  stageStep: "inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-inherit text-[10px] whitespace-nowrap",
  stageDot: "h-[7px] w-[7px] shrink-0 rounded-full bg-border",
  stageCount: "ml-auto shrink-0 text-[10px] text-muted-foreground",
  tabs: "flex h-11 shrink-0 items-center gap-3 overflow-x-auto bg-background px-5",
  tabItem: "cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 font-inherit text-xs text-muted-foreground whitespace-nowrap",
  tabItemActive: "bg-accent font-semibold text-primary",
  scroll: "min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5",
  stack: "flex flex-col gap-4",
  footer: "flex h-[70px] shrink-0 items-center gap-3 border-t border-border px-5 bg-background",
  footerText: "min-w-0 flex-1",
  footerLabel: "text-[10px] text-muted-foreground",
  footerValue: "text-xs font-medium text-foreground",
  row: "flex items-center gap-3 py-2",
  rowMain: "min-w-0 flex-1",
  rowTitle: "text-xs text-foreground",
  rowSub: "text-[11px] text-muted-foreground",
  grid: "grid grid-cols-1 gap-3",
  gridTwo: "grid grid-cols-2 gap-3",
  gridThree: "grid grid-cols-3 gap-3",
  hubstrip: "flex flex-row items-center gap-3.5",
  divider: "h-[42px] w-px shrink-0 bg-border",
  note: "mt-2 text-[11px] text-muted-foreground",
  noteWarn: "mt-2 text-[11px] text-[var(--rf-warn)]",
  chatrow: "mb-2 rounded-lg border border-border bg-card p-3",
  chatrowHead: "flex items-center gap-2",
  chatrowKind: "rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground",
  chatrowTitle: "text-[11px] text-foreground",
  chatrowToggle: "cursor-pointer border-0 bg-transparent text-[11px] text-primary",
  chatrowBody: "mt-2 text-[11px] text-muted-foreground",
  chips: "flex flex-wrap gap-2",
  chip: "cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 font-inherit text-[10px] text-muted-foreground whitespace-nowrap",
  chipOn: "bg-accent font-semibold text-primary",
  shotrow: "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-left font-inherit text-foreground",
  shotrowOn: "border-primary bg-accent",
  textarea: "block min-h-[120px] w-full resize-y rounded-lg border border-input bg-secondary px-2.5 py-1.5 font-inherit text-xs leading-normal",
  positionCard: "block cursor-pointer focus-within:[&_.rf-ui-card]:border-primary",
  pickerItem: "flex cursor-pointer justify-center border-0 bg-transparent p-0",
  pickerItemOn: "[&_.thumb-target]:outline [&_.thumb-target]:outline-2 [&_.thumb-target]:outline-primary [&_.thumb-target]:outline-offset-2"
};
function stageStepClass(tone) {
  if (tone === "current") {
    return "font-semibold text-primary [&_.stage-dot]:bg-primary [&_.stage-label]:rounded-md [&_.stage-label]:bg-accent [&_.stage-label]:px-1.5 [&_.stage-label]:py-0.5";
  }
  if (tone === "passed") return "text-muted-foreground [&_.stage-dot]:bg-[var(--rf-ok)]";
  return "text-muted-foreground [&_.stage-dot]:bg-border";
}

// src/client/ui/register.jsx
function attachReelforgeUi(RF) {
  RF.ui = {};
  RF.cn = cn;
  RF.tw = tw;
  RF.stageStepClass = stageStepClass;
  RF.Button = Button;
  RF.Input = Input;
  RF.Label = Label2;
  RF.Card = Card;
  RF.Badge = Badge;
  RF.Progress = Progress2;
  RF.Alert = Alert;
  RF.AlertDescription = AlertDescription;
  RF.statusToneClass = function statusToneClass(tone) {
    const map = {
      accent: "border-transparent bg-accent text-primary",
      running: "border-transparent bg-accent text-primary",
      ok: "border-transparent bg-secondary text-[var(--rf-ok)]",
      done: "border-transparent bg-secondary text-[var(--rf-ok)]",
      warn: "border-transparent bg-secondary text-[var(--rf-warn)]",
      error: "border-transparent bg-secondary text-destructive",
      failed: "border-transparent bg-secondary text-destructive",
      neutral: "border-transparent bg-secondary text-muted-foreground",
      queued: "border-transparent bg-secondary text-muted-foreground"
    };
    return map[tone ?? "queued"] ?? map.queued;
  };
  RF.workbenchCard = function workbenchCard(options) {
    const props = options ?? {};
    const state = props.state === "selected" || props.state === "disabled" ? props.state : "default";
    const clickable = state !== "disabled" && typeof props.onClick === "function";
    return {
      className: cn(
        "rf-ui-card flex flex-col gap-2.5 rounded-[10px] border bg-card p-3.5 shadow-none",
        state === "selected" && "border-primary",
        props.accent === true && "border-l-4 border-l-primary",
        props.tone === "warn" && "border-[var(--rf-warn)] bg-[color-mix(in_srgb,var(--rf-warn)_10%,var(--card))]",
        props.tone === "error" && "border-destructive bg-destructive/10",
        props.tone === "warn-border" && "border-[var(--rf-warn)]",
        state === "disabled" && "pointer-events-none border-border/60 bg-muted text-muted-foreground",
        clickable && "cursor-pointer",
        props.className
      ),
      onClick: clickable ? props.onClick : void 0,
      role: clickable ? "button" : void 0,
      tabIndex: clickable ? 0 : void 0,
      onKeyDown: clickable ? (event) => {
        if (event?.target !== event?.currentTarget) return;
        const key = event?.key;
        if (key !== "Enter" && key !== " " && key !== "Spacebar") return;
        if (event?.preventDefault) event.preventDefault();
        props.onClick(event);
      } : void 0
    };
  };
  RF.ui.SectionLabel = function SectionLabel(props) {
    return /* @__PURE__ */ jsx("div", { className: "my-1 text-xs text-muted-foreground", children: props.children });
  };
  RF.ui.MetaRow = function MetaRow(props) {
    return /* @__PURE__ */ jsxs("div", { className: "flex gap-2 py-0.5 text-[11px]", children: [
      /* @__PURE__ */ jsx("span", { className: "shrink-0 text-muted-foreground", children: props.label }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 text-foreground/80", children: props.value })
    ] });
  };
  attachWorkbenchUi(RF);
}

/*! Bundled license information:

react-dom/cjs/react-dom.development.js:
  (**
   * @license React
   * react-dom.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

attachReelforgeUi(RF);
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
 * 工作台外壳的**按屏定义**（RF7 规格）：Header 三件套（标题 / 副标 / 胶囊）
 * + Footer 三件套（标签 / 主文案 / 一个主按钮）。
 *
 * ## 为什么要逐屏写
 *
 * RF7 的 18 块板，**每块的胶囊与底栏文案都不同**（画板索引逐块给了文案），
 * 以前实现是一套全局固定的（「运行位置 · provider」+「成本 + 进度 + 查看成片」）。
 * RF7 §6.2 把 Footer 定成硬约束：**本屏标签 / 本屏主文案 / 一个主按钮**，
 * 不可点时**禁用并写明缺什么**。
 *
 * ## 底栏按钮的接线纪律（这一批最要紧的一条）
 *
 * 底栏主按钮**不许是「点了没反应」的死按钮**。所以每一块板分三种：
 *
 * 1. **有对应工具** → 接工具（`kind: 'tool'`），参数名逐字对齐宿主 schema；
 * 2. **有对应屏** → 接导航（`kind: 'tab'` / `'flow'` / `'scroll'`）；
 * 3. **能力还没有** → `kind: 'none'` + **禁用说明**（说清缺什么、给什么替代）。
 *
 * 第 3 类在本批里占 6 块板（服务配置 / 项目设置 / 生成执行 / 上下文 / 素材库 / 技能），
 * 原因都是同一个：**RF7 画板假设插件能改配置、能暂停、能装技能**，
 * 而插件当前**没有写配置的工具、没有暂停的工具、没有装技能的工具**。
 * 这是**能力缺口**，不是界面 bug —— 界面按纪律禁用 + 说清，而不是假装能做。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 当前章：优先取客户端算出来的「正在跑」那一章，否则第一章。
   *
   * @param {object} project - 投影视图。
   * @returns {object | null} 当前章；没有章时 null。
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
   * @returns {{ bundled: number, installed: number, generated: number, total: number }} 三档计数 + 总数。
   */
  function skillCounts(project) {
    const skills = Array.isArray(project?.skills) ? project.skills : [];
    const count = source => skills.filter(skill => String(skill.source ?? 'bundled') === source).length;
    return {
      bundled: count('bundled'),
      installed: count('installed'),
      generated: count('generated'),
      total: skills.length,
    };
  }

  /**
   * 静态文案包装成函数。
   *
   * 契约统一：外壳的 `subtitle` / `capsule` / `footerLabel` / `footerValue`
   * **一律是函数**。静态与动态的差别只该留在**这一层**。
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
   * 变更日志条目（最新的在前）。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 条目数组。
   */
  function logEntries(project) {
    const changelog = project?.changelog ?? {};
    return Array.isArray(changelog.entries) ? changelog.entries : [];
  }

  /**
   * 有没有进入生成阶段。
   *
   * @param {object} project - 投影视图。
   * @returns {boolean} 是否已进入生成阶段。
   */
  function renderStarted(project) {
    const stage = String(project?.stage ?? '');
    return stage === 'generate' || stage === 'storyboard' || stage === 'deliver';
  }

  /**
   * 探测结果的汇总（RF7 RunGate 的检查行模型）。
   *
   * ⚠️ 口径必须和屏内清单**完全一致**（同一个 `RF.probeGateSummary()`）——
   *    两边各算一次 ⇒ 胶囊写「6 / 9 通过」、屏里写「6 项检查」，用户一眼看出在编数字。
   *
   * @param {object} context - 屏外数据上下文。
   * @returns {{ rows: Array<object>, passed: number, warned: number, failed: number, unset: number, total: number }} 汇总。
   */
  function probeSummary(context) {
    const report = context?.probe?.view?.report ?? null;
    const summary = RF.probeGateSummary(report);
    return {
      rows: summary.rows,
      passed: summary.passed,
      warned: summary.warned,
      failed: summary.failed,
      unset: summary.unset,
      total: summary.total,
    };
  }

  /**
   * 上下文三键的齐备情况（RF7 Context 板）。
   *
   * @param {object} project - 投影视图。
   * @returns {{ ready: number, total: number, continuity: number }} 齐备键数 / 总数 / 连续性条数。
   */
  function contextSummary(project) {
    const context = project?.context ?? {};
    const keys = RF.CONTEXT_KEYS;
    const ready = keys.filter(key => String(context[key] ?? '').trim() !== '').length;
    const continuity = String(context.continuity ?? '').trim();
    return {
      ready,
      total: keys.length,
      continuity: continuity === '' ? 0 : continuity.split(/\r?\n/).filter(line => line.trim() !== '').length,
    };
  }

  /**
   * 当前选中的那一镜（RF7 分镜详情 / 素材选择器都要它）。
   *
   * 「选中」是**交互态**，不在投影里 —— 所以从屏外数据上下文取。
   *
   * ⚠️ 口径统一走 `RF.currentShot`：显式选中的那一镜，没选过就取第一镜
   * （画板 07 永远有一镜高亮）。列表页 / 详情屏 / 外壳必须同口径，
   * 否则会出现「列表高亮第 1 镜、详情说没选镜」。
   *
   * @param {object} project - 投影视图。
   * @param {object} [context] - 屏外数据上下文。
   * @returns {object | null} 镜头；一镜都没有时 null。
   */
  function selectedShot(project, context) {
    return RF.currentShot(project, context?.selectedShotId);
  }

  /**
   * 素材选择器里已选的资产 id（交互态）。
   *
   * @param {object} [context] - 屏外数据上下文。
   * @returns {Array<string>} 资产 id 数组。
   */
  function pickerSelection(context) {
    return Array.isArray(context?.pickerSelection) ? context.pickerSelection : [];
  }

  /**
   * 资产分类 → `reelforge.bind_asset` 的 `field`。
   *
   * ⚠️ **这六个值就是宿主 schema 的枚举**（`additionalProperties:false` +
   * `field.enum`）—— 写成 `references` 之类会被宿主**整条拒收**，
   * 表现为「点了没反应」。别自己发明字段名。
   *
   * @type {Record<string, string>}
   */
  const BIND_FIELD_BY_CATEGORY = {
    character: 'character_ids',
    scene: 'scene_ids',
    prop: 'prop_ids',
    costume: 'costume_ids',
    age: 'age_ids',
    voice: 'audio_ids',
  };

  /**
   * 把选中的资产按「能绑的分类」分组。
   *
   * 一次 `bind_asset` 只吃一个 field ⇒ 角色一组、场景一组……
   * 不能绑的分类（音乐 / 音效 / 视频 / 其它）**不绑**，也不假装绑了。
   *
   * @param {object} project - 投影视图。
   * @param {Array<string>} selection - 选中的资产 id。
   * @returns {Array<{ field: string, ids: Array<string> }>} 分组结果。
   */
  function bindAssetGroups(project, selection) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    const groups = new Map();
    for (const id of selection) {
      const asset = assets.find(item => String(item?.id ?? '') === String(id));
      const field = BIND_FIELD_BY_CATEGORY[String(asset?.category ?? '')];
      if (field === undefined) continue;
      if (!groups.has(field)) groups.set(field, []);
      groups.get(field).push(String(id));
    }
    return [...groups.entries()].map(([field, ids]) => ({ field, ids }));
  }

  /**
   * 每屏的外壳描述。
   *
   * @typedef {object} TabChrome
   * @property {string} titleKey Header 标题词条。
   * @property {(project: object, t: function, ctx?: object) => string} subtitle Header 副标题。
   * @property {(project: object, t: function, ctx?: object) => string} capsule Header 右侧胶囊文案。
   * @property {(project: object, t: function, ctx?: object) => string} capsuleTone 胶囊色调。
   * @property {(project: object, t: function) => string} footerLabel Footer 第一行标签。
   * @property {(project: object, t: function) => string} footerValue Footer 第二行。
   * @property {(project) => object} footerAction Footer 按钮。
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
   * @property {object | function} [params] `kind === 'tool'` 时的参数。
   * @property {boolean} [disabled] 不可用时置 true。
   * @property {string} [hintKey] 不可用时的说明词条（说清缺什么、给什么替代）。
   */

  RF.TAB_CHROME = {
    // ══════════════════════════════════════════════════════════════
    // Tab 屏（7 块 · RF7 §6.4 固定页签：枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志）
    // ══════════════════════════════════════════════════════════════

    /**
     * 11 枢纽（Hub）：全局落点。
     * 胶囊是整体状态；底栏是「当前阶段」，主按钮「查看成片」——**成片没就绪时禁用**。
     */
    hub: {
      titleKey: 'rf7.hub.title',
      subtitle: staticText('rf7.hub.subtitle'),
      capsule: (project, t) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return t('rf7.hub.capsule.empty');
        if (!renderStarted(project)) return t('rf7.hub.capsule.planned');
        return t('rf7.hub.capsule.running');
      },
      capsuleTone: (project) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return 'neutral';
        return renderStarted(project) ? 'accent' : 'neutral';
      },
      footerLabel: staticText('rf7.hub.footerLabel'),
      footerValue: (project, t) => {
        const chapter = currentChapter(project);
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (chapter === null) return t('rf7.hub.footerValue.empty');
        if (deliverables.length === 0) {
          return t('rf7.hub.footerValue.generating', {
            chapter: Number(chapter.id) || 1,
            title: chapter.title,
          });
        }
        return t('rf7.hub.footerValue.ready', {
          chapter: Number(chapter.id) || 1,
          title: chapter.title,
          count: deliverables.length,
        });
      },
      footerAction: (project, t, context) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'rf7.hub.action', kind: 'none', hintKey: 'rf7.hub.actionDisabled' };
        }
        return { key: 'rf7.hub.action', kind: 'tab', tab: 'output' };
      },
    },

    /**
     * 03 章节（Chapters）：先骨架 · 再逐章生成。
     * 主按钮「生成全部章节」= 跑 llm 阶段（它产出章节与分镜）。
     */
    chapters: {
      titleKey: 'rf7.chapters.title',
      subtitle: staticText('rf7.chapters.subtitle'),
      capsule: (project, t) => t('rf7.chapters.capsule', {
        count: Array.isArray(project?.chapters) ? project.chapters.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.chapters.footerLabel'),
      footerValue: (project, t) => t('rf7.chapters.footerValue', {
        chapters: Array.isArray(project?.chapters) ? project.chapters.length : 0,
        shots: totalShots(project),
      }),
      footerAction: (project, t, context) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        const hasNovel = Number(project?.intake?.chars ?? 0) > 0;
        if (!hasNovel && chapters.length === 0) {
          return { key: 'rf7.chapters.action', kind: 'none', hintKey: 'rf7.chapters.actionDisabled' };
        }
        return {
          key: 'rf7.chapters.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.runStage,
          params: { stage: 'llm' },
        };
      },
    },

    /**
     * 04 素材库（Assets）：10 类资产。
     * 主按钮「新建资产」**当前没有对应工具**（`create_asset` 要求分类 + 名字，
     * 底栏没有输入位）⇒ 禁用并指向屏内的「新建资产」表单。
     */
    assets: {
      titleKey: 'rf7.assets.title',
      subtitle: staticText('rf7.assets.subtitle'),
      capsule: (project, t) => t('rf7.assets.capsule', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.assets.footerLabel'),
      footerValue: (project, t) => t('rf7.assets.footerValue', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      footerAction: () => ({ key: 'rf7.assets.action', kind: 'none', hintKey: 'rf7.assets.actionDisabled' }),
    },

    /**
     * 07 分镜审查（Storyboard）：逐镜预览。
     * 主按钮「重新生成选中镜」→ `reelforge.regenerate_shot`（触发类 ⇒ 宿主弹授权）。
     */
    shots: {
      titleKey: 'rf7.storyboard.title',
      subtitle: staticText('rf7.storyboard.subtitle'),
      capsule: (project, t) => t('rf7.storyboard.capsule', {
        count: Array.isArray(project?.shots) ? project.shots.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.storyboard.footerLabel'),
      footerValue: (project, t) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        const pending = shots.filter(shot => String(shot?.status ?? '') !== 'done').length;
        return t('rf7.storyboard.footerValue', { count: shots.length, pending });
      },
      footerAction: (project, t, context) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        if (shots.length === 0) {
          return { key: 'rf7.storyboard.action', kind: 'none', hintKey: 'rf7.storyboard.actionDisabled' };
        }
        return {
          key: 'rf7.storyboard.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.regenerateShot,
          params: (current, _t, currentContext) => {
            const picked = selectedShot(current, currentContext)
              ?? shots.find(shot => String(shot?.status ?? '') !== 'done')
              ?? shots[0];
            return { seq: Number(picked?.seq) || 1, idx: Number(picked?.idx) || 1 };
          },
        };
      },
    },

    /**
     * 05 上下文（Context）：生成前必须齐的三把钥匙。
     * 主按钮「冻结锚点」**当前没有对应工具** ⇒ 禁用并说清替代路径。
     */
    context: {
      titleKey: 'rf7.context.title',
      subtitle: staticText('rf7.context.subtitle'),
      capsule: (project, t) => {
        const summary = contextSummary(project);
        return summary.ready === summary.total
          ? t('rf7.context.capsule.ready')
          : t('rf7.context.capsule.missing', { missing: summary.total - summary.ready });
      },
      capsuleTone: (project) => {
        const summary = contextSummary(project);
        return summary.ready === summary.total ? 'ok' : 'warn';
      },
      footerLabel: staticText('rf7.context.footerLabel'),
      footerValue: (project, t) => {
        const summary = contextSummary(project);
        return t('rf7.context.footerValue', {
          ready: summary.ready,
          total: summary.total,
          continuity: summary.continuity,
        });
      },
      footerAction: () => ({ key: 'rf7.context.action', kind: 'none', hintKey: 'rf7.context.actionDisabled' }),
    },

    /**
     * 10 成片（Output）：合成 · 字幕 · 交付。
     * 主按钮「下载成片」→ 滚到交付物清单；没有交付物时禁用。
     */
    output: {
      titleKey: 'rf7.output.title',
      subtitle: staticText('rf7.output.subtitle'),
      capsule: (project, t) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        return t('rf7.output.capsule', { count: deliverables.length });
      },
      capsuleTone: (project) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        return deliverables.length > 0 ? 'accent' : 'neutral';
      },
      footerLabel: staticText('rf7.output.footerLabel'),
      footerValue: (project, t) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) return t('rf7.output.footerValue.empty');
        const chapter = currentChapter(project);
        return t('rf7.output.footerValue', {
          chapter: Number(chapter?.id) || 1,
          duration: chapterDuration(chapter).toFixed(0),
          count: deliverables.length,
        });
      },
      footerAction: (project, t, context) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'rf7.output.action', kind: 'none', hintKey: 'rf7.output.actionDisabled' };
        }
        return { key: 'rf7.output.action', kind: 'scroll', target: 'rf-deliverables' };
      },
    },

    /**
     * 12 运行日志（Log）：谁在什么时候改了什么。
     * 主按钮「回滚本批」—— **变更日志里没有批次号** ⇒ 禁用并指向屏内的两级回滚。
     */
    log: {
      titleKey: 'rf7.log.title',
      subtitle: staticText('rf7.log.subtitle'),
      capsule: (project, t) => t('rf7.log.capsule', { count: logCount(project) }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.log.footerLabel'),
      footerValue: (project, t) => t('rf7.log.footerValue', { count: logCount(project) }),
      footerAction: (project, t, context) => {
        const entries = logEntries(project);
        if (entries.length === 0) {
          return { key: 'rf7.log.action', kind: 'none', hintKey: 'rf7.log.actionDisabled' };
        }
        return { key: 'rf7.log.action', kind: 'none', hintKey: 'rf7.log.actionNoBatch' };
      },
    },

    // ══════════════════════════════════════════════════════════════
    // 流程屏（8 块 · 无页签条）
    // ══════════════════════════════════════════════════════════════

    /**
     * 01 启动检查（RunGate）：环境门，冷启动首屏。
     * 胶囊是**真实**探测结果（通过 / 警告 / 未通过），底栏指向「新建项目」。
     */
    runGate: {
      titleKey: 'rf7.runGate.title',
      subtitle: staticText('rf7.runGate.subtitle'),
      capsule: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return t('rf7.runGate.capsule.pending');
        return t('rf7.runGate.capsule', {
          passed: summary.passed,
          total: summary.total,
        });
      },
      capsuleTone: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return 'neutral';
        if (summary.failed > 0) return 'warn';
        if (summary.warned > 0) return 'warn';
        return 'ok';
      },
      footerLabel: staticText('rf7.runGate.footerLabel'),
      footerValue: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return t('rf7.runGate.footerValue.pending');
        if (summary.failed > 0) {
          return t('rf7.runGate.footerValue.failed', { count: summary.failed });
        }
        return t('rf7.runGate.footerValue.ready');
      },
      footerAction: () => ({ key: 'rf7.runGate.action', kind: 'flow', screen: 'intake' }),
    },

    /**
     * 14 服务配置（Settings）：ComfyUI / LLM / 运行时 / 生成维护。
     *
     * ⚠️ **只读屏**：插件没有写配置的工具（配置在插件 `config` 块 / 宿主设置里）。
     * 主按钮「保存并重测」因此禁用，屏内「重跑检查」按钮负责重测。
     */
    settings: {
      titleKey: 'rf7.settings.title',
      subtitle: staticText('rf7.settings.subtitle'),
      capsule: staticText('rf7.settings.capsule'),
      capsuleTone: () => 'warn',
      footerLabel: staticText('rf7.settings.footerLabel'),
      footerValue: staticText('rf7.settings.footerValue'),
      footerAction: () => ({ key: 'rf7.settings.action', kind: 'none', hintKey: 'rf7.settings.actionDisabled' }),
    },

    /**
     * 02 新建项目（Intake）：小说 → 自动拆章。
     *
     * 主按钮「创建并打开」= **导入正文**（`reelforge.import_novel`）⇒ 拆章并建立项目。
     * ⚠️ `import_novel` 的必填参数是 `novel` —— 正文为空时不能发（会被宿主拒收），
     * 所以正文为空 ⇒ 禁用并说清缺什么。
     * 已经导入过（投影里已有正文字数）⇒ 这一步已经做完了，直接去「启动检查」。
     */
    intake: {
      titleKey: 'rf7.intake.title',
      subtitle: staticText('rf7.intake.subtitle'),
      capsule: (project, t) => {
        const chars = Number(project?.intake?.chars ?? 0);
        return chars > 0 ? t('rf7.intake.capsule.ready') : t('rf7.intake.capsule.empty');
      },
      capsuleTone: (project) => (Number(project?.intake?.chars ?? 0) > 0 ? 'accent' : 'neutral'),
      footerLabel: staticText('rf7.intake.footerLabel'),
      footerValue: staticText('rf7.intake.footerValue'),
      footerAction: (project, t, context) => {
        const chars = Number(project?.intake?.chars ?? 0);
        if (chars > 0) return { key: 'rf7.intake.action', kind: 'flow', screen: 'runGate' };
        const text = String(context?.novelText ?? '').trim();
        if (text === '') {
          return { key: 'rf7.intake.action', kind: 'none', hintKey: 'rf7.intake.actionDisabled' };
        }
        return {
          key: 'rf7.intake.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.importNovel,
          // ⚠️ `import_novel` 的 schema 是 `additionalProperties:false` ⇒ 只发认识的键。
          params: (_current, _translate, currentContext) => {
            const args = { novel: String(currentContext?.novelText ?? '').trim() };
            const name = String(currentContext?.projectName ?? '').trim();
            if (name !== '') args.name = name;
            return args;
          },
        };
      },
    },

    /**
     * 15 项目设置（ProjectSettings）：成片规格 / 字幕 / 声音 / 危险操作。
     *
     * ⚠️ **只读屏**：项目层字段（分辨率 / 比例 / 字幕 / 声音）能读，
     * 但插件**没有写项目设置的工具** ⇒ 主按钮禁用并说明改法。
     */
    projectSettings: {
      titleKey: 'rf7.projectSettings.title',
      subtitle: staticText('rf7.projectSettings.subtitle'),
      capsule: staticText('rf7.projectSettings.capsule'),
      capsuleTone: () => 'ok',
      footerLabel: staticText('rf7.projectSettings.footerLabel'),
      footerValue: (project, t) => t('rf7.projectSettings.footerValue', {
        resolution: String(project?.settings?.resolution ?? '') || t('rf7.projectSettings.unset'),
        aspect: String(project?.settings?.aspectRatio ?? '') || t('rf7.projectSettings.unset'),
      }),
      footerAction: () => ({ key: 'rf7.projectSettings.action', kind: 'none', hintKey: 'rf7.projectSettings.actionDisabled' }),
    },

    /**
     * 06 生成执行（Stages）：四阶段进度 + 勾选。
     * 主按钮「暂停生成」—— **没有暂停能力** ⇒ 禁用并说明替代（等本批跑完 / 去设置调显存释放间隔）。
     */
    stages: {
      titleKey: 'rf7.stages.title',
      subtitle: staticText('rf7.stages.subtitle'),
      capsule: (project, t) => t('rf7.stages.capsule', { count: RF.STAGES.length }),
      capsuleTone: () => 'accent',
      footerLabel: staticText('rf7.stages.footerLabel'),
      footerValue: (project, t) => {
        const stage = String(project?.stage ?? '');
        const kind = String(project?.plan?.kind ?? '');
        if (kind === '') return t('rf7.stages.footerValue.unset');
        return t('rf7.stages.footerValue', { kind, stage: stage === '' ? '-' : stage });
      },
      footerAction: () => ({ key: 'rf7.stages.action', kind: 'none', hintKey: 'rf7.stages.actionDisabled' }),
    },

    /**
     * 08 分镜详情（ShotDetail）：单镜展开。
     * 主按钮「重新生成此镜」→ `reelforge.regenerate_shot`。
     */
    shotDetail: {
      titleKey: 'rf7.shotDetail.title',
      subtitle: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return t('rf7.shotDetail.subtitle.empty');
        return t('rf7.shotDetail.subtitle', {
          chapter: Number(shot.seq) || 1,
          idx: Number(shot.idx) || 1,
        });
      },
      capsule: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return t('rf7.shotDetail.capsule.empty');
        return String(shot.status ?? '') === 'done'
          ? t('rf7.shotDetail.capsule.done')
          : t('rf7.shotDetail.capsule.pending');
      },
      capsuleTone: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return 'neutral';
        return String(shot.status ?? '') === 'done' ? 'ok' : 'warn';
      },
      footerLabel: staticText('rf7.shotDetail.footerLabel'),
      footerValue: (project, t) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        const pending = shots.filter(shot => String(shot?.status ?? '') !== 'done').length;
        return t('rf7.shotDetail.footerValue', { count: shots.length, pending });
      },
      footerAction: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) {
          return { key: 'rf7.shotDetail.action', kind: 'none', hintKey: 'rf7.shotDetail.actionDisabled' };
        }
        return {
          key: 'rf7.shotDetail.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.regenerateShot,
          params: { seq: Number(shot.seq) || 1, idx: Number(shot.idx) || 1 },
        };
      },
    },

    /**
     * 09 背景音乐（Music）：生成 / 试听 / 应用。
     *
     * ⚠️ 音乐条目来自「音乐类资产」，而**投影里没有音乐文件路径**
     * （`reelforge.set_chapter_music` 要的是工作区相对路径）⇒ 主按钮禁用并说清缺什么。
     */
    music: {
      titleKey: 'rf7.music.title',
      subtitle: staticText('rf7.music.subtitle'),
      capsule: (project, t) => t('rf7.music.capsule', {
        count: RF.musicAssets(project).length,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.music.footerLabel'),
      footerValue: (project, t) => t('rf7.music.footerValue', {
        count: RF.musicAssets(project).length,
      }),
      footerAction: () => ({ key: 'rf7.music.action', kind: 'none', hintKey: 'rf7.music.actionDisabled' }),
    },

    /**
     * 13 技能与工作流（Skills）：**从旧版页签移过来的流程屏**。
     * 主按钮「安装新技能」—— 插件没有装技能的工具 ⇒ 禁用并说清装法。
     */
    skills: {
      titleKey: 'rf7.skills.title',
      subtitle: staticText('rf7.skills.subtitle'),
      capsule: (project, t) => t('rf7.skills.capsule', { count: skillCounts(project).total }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.skills.footerLabel'),
      footerValue: (project, t) => {
        const counts = skillCounts(project);
        return t('rf7.skills.footerValue', counts);
      },
      footerAction: () => ({ key: 'rf7.skills.action', kind: 'none', hintKey: 'rf7.skills.actionDisabled' }),
    },

    // ══════════════════════════════════════════════════════════════
    // 规范板（规则层）
    // ══════════════════════════════════════════════════════════════

    /**
     * 17 降级与失败（Degraded）：阻塞 / 警告 / 缺料 / 空态 / 软降级五态。
     * 主按钮「查看失败清单」→ 页签「日志」。
     */
    degraded: {
      titleKey: 'rf7.degraded.title',
      subtitle: staticText('rf7.degraded.subtitle'),
      capsule: (project, t, context) => {
        const degradations = Array.isArray(context?.probe?.view?.degrade?.degradations)
          ? context.probe.view.degrade.degradations
          : [];
        return t('rf7.degraded.capsule', { count: degradations.length });
      },
      capsuleTone: (project, t, context) => {
        const degradations = Array.isArray(context?.probe?.view?.degrade?.degradations)
          ? context.probe.view.degrade.degradations
          : [];
        return degradations.length > 0 ? 'warn' : 'neutral';
      },
      footerLabel: staticText('rf7.degraded.footerLabel'),
      footerValue: staticText('rf7.degraded.footerValue'),
      footerAction: () => ({ key: 'rf7.degraded.action', kind: 'tab', tab: 'log' }),
    },

    /**
     * 18 素材选择器（Picker）：右栏内嵌弹窗形态。
     *
     * 主按钮「确定」→ `reelforge.bind_asset`，把选中的素材绑到那一镜。
     *
     * ⚠️ **两个必须按宿主 schema 来的细节**：
     *   1. `field` 的枚举只有六个（`character_ids` / `scene_ids` / `prop_ids` /
     *      `costume_ids` / `age_ids` / `audio_ids`）—— 写 `references` 会被**整条拒收**；
     *   2. 一次调用只吃**一个** field ⇒ 选中的素材按分类分组，逐组发。
     */
    picker: {
      titleKey: 'rf7.picker.title',
      subtitle: staticText('rf7.picker.subtitle'),
      capsule: (project, t, context) => t('rf7.picker.capsule', { count: pickerSelection(context).length }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.picker.footerLabel'),
      footerValue: (project, t, context) => t('rf7.picker.footerValue', {
        count: pickerSelection(context).length,
        limit: RF.REFERENCE_LIMITS?.images ?? 9,
      }),
      footerAction: (project, t, context) => {
        const selection = pickerSelection(context);
        const shot = selectedShot(project, context);
        if (selection.length === 0 || shot === null) {
          return { key: 'rf7.picker.action', kind: 'none', hintKey: 'rf7.picker.actionDisabled' };
        }
        const groups = bindAssetGroups(project, selection);
        if (groups.length === 0) {
          return { key: 'rf7.picker.action', kind: 'none', hintKey: 'rf7.picker.actionNoBindable' };
        }
        return {
          key: 'rf7.picker.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.bindAsset,
          // ⚠️ 返回**一组**参数：每组一个 field，Workbench 会逐个发。
          params: groups.map(group => ({
            seq: Number(shot.seq) || 1,
            idx: Number(shot.idx) || 1,
            field: group.field,
            ids: group.ids,
          })),
        };
      },
    },
  };

  /**
   * 取某屏的外壳描述（找不到就回落到枢纽）。
   *
   * @param {string} screenId - 页签 id 或流程屏 id。
   * @returns {TabChrome} 外壳描述。
   */
  RF.tabChrome = function tabChrome(screenId) {
    return RF.TAB_CHROME[screenId] ?? RF.TAB_CHROME.hub;
  };
})(RF);

/* ── src/client/workbench/tabs.jsx ───────────────────────────── */
"use strict";
/* ─────────────────────────────────────────────────────────────────────────────
 * 项目视图的 7 块 Tab 屏（RF7 画板索引 §八「Tab 屏」）。
 *
 * 枢纽 11 · 章节 03 · 素材 04 · 分镜 07 · 上下文 05 · 成片 10 · 日志 12
 *
 * 每块屏按 `design/_tools/build-rf7.mjs` 里对应的 `boardXxx()` 排版 ——
 * 那份脚本是设计稿的**真源**（几何 + 令牌变量），这里是它的代码版。
 *
 * 纪律：
 *   1. 数据只从宿主投影读（R1）；交互态走 `props.state`；
 *   2. **数据没有就说清楚没有**，不编内容（RF7 §6.7「失败不许静默降质」）；
 *   3. shadcn 用 `<Button>` / `<Card>` / `<Badge>`；复合件用 `RF.ui.*`（`workbench-ui.jsx`）；类名走 Tailwind / `RF.tw`。
 * ─────────────────────────────────────────────────────────────────────────── */
;
(function (RF) {
    'use strict';
    /**
     * 镜头状态 → 胶囊色调 + 词条键。
     *
     * @param {string} status - 机器状态。
     * @returns {{ tone: string, key: string }} 胶囊信息。
     */
    function shotStatus(status) {
        const raw = String(status ?? '');
        if (raw === 'done')
            return { tone: 'done', key: 'rf7.status.done' };
        if (raw === 'generating')
            return { tone: 'running', key: 'rf7.status.generating' };
        if (raw === 'failed')
            return { tone: 'failed', key: 'rf7.status.failed' };
        return { tone: 'queued', key: 'rf7.status.pending' };
    }
    /**
     * 章节状态 → 胶囊色调 + 词条键。
     *
     * @param {string} status - 机器状态。
     * @returns {{ tone: string, key: string }} 胶囊信息。
     */
    function chapterStatus(status) {
        const raw = String(status ?? '');
        if (raw === 'done')
            return { tone: 'done', key: 'rf7.status.done' };
        if (raw === 'running')
            return { tone: 'running', key: 'rf7.status.generating' };
        if (raw === 'failed')
            return { tone: 'failed', key: 'rf7.status.failed' };
        return { tone: 'queued', key: 'rf7.status.pending' };
    }
    /**
     * 资产分类 → 展示名（RF7 素材板的筛选芯片）。
     *
     * @param {string} category - 机器分类。
     * @param {function} t - 翻译函数。
     * @returns {string} 展示名。
     */
    function assetCategoryName(category, t) {
        return RF.labelOf('asset.category', category, t);
    }
    // ══════════════════════════════════════════════════════════════
    // 11 枢纽（Hub）—— 有章节后的默认落点
    // ══════════════════════════════════════════════════════════════
    RF.tabHub = function tabHub(props) {
        const t = props.t;
        const project = props.project ?? {};
        const chapters = Array.isArray(project.chapters) ? project.chapters : [];
        const shots = Array.isArray(project.shots) ? project.shots : [];
        if (chapters.length === 0) {
            return (h("div", { className: RF.tw.stack },
                RF.ui.ChatSync({ t, project }),
                h(RF.ui.EmptyState, { title: t('rf7.hub.empty.title'), hint: t('rf7.hub.empty.hint'), action: (h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", onClick: () => props.state.goFlow('intake') }, t('rf7.hub.empty.action'))) })));
        }
        // 成本 + 当前阶段 = RF/HubStrip（横向两格 + 竖分隔线）。
        const cost = project.cost ?? {};
        const kind = String(project.plan?.kind ?? '');
        const position = RF.currentPosition(project);
        const chapter = chapters.find(item => Number(item.id) === Number(position?.chapter)) ?? chapters[0];
        const chapterShots = shots.filter(shot => Number(shot.seq) === Number(chapter.id));
        const doneShots = chapterShots.filter(shot => String(shot.status ?? '') === 'done').length;
        const visible = chapterShots.slice(0, 6);
        const rest = chapterShots.length - visible.length;
        const hubStrip = (h(Card, { ...RF.workbenchCard({ className: RF.tw.hubstrip }) },
            RF.ui.Stat(t('rf7.hub.costLabel'), RF.formatMoney(cost.spent ?? 0), kind === '' ? t('rf7.hub.kindUnset') : kind),
            h("div", { className: RF.tw.divider }),
            RF.ui.Stat(t('rf7.hub.stageLabel'), kind === '' ? t('rf7.hub.stageUnset') : kind, t('rf7.hub.stageSub', {
                chapter: Number(chapter.id) || 1,
                done: doneShots,
                total: chapterShots.length,
            }))));
        const chapterRail = (h(Card, { ...RF.workbenchCard() },
            h("div", { className: RF.tw.row },
                h("div", { className: RF.tw.rowMain },
                    h("div", { className: RF.tw.rowTitle }, t('rf7.hub.chapterTitle', {
                        chapter: Number(chapter.id) || 1,
                        title: chapter.title,
                    })),
                    h("div", { className: RF.tw.rowSub }, t('rf7.hub.chapterMeta', {
                        shots: chapter.shotCount ?? 0,
                        duration: RF.formatDuration(chapter.durationSec ?? 0),
                    }))),
                h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(chapterStatus(chapter.status).tone)) }, t(chapterStatus(chapter.status).key))),
            RF.ui.Track(chapterShots.length === 0 ? 0 : doneShots / chapterShots.length)));
        const rows = [];
        for (let index = 0; index < visible.length; index += 2) {
            const pair = visible.slice(index, index + 2);
            rows.push(h("div", { key: index, className: RF.tw.gridTwo }, pair.map(shot => RF.ui.ShotChip(t('rf7.hub.shotId', { seq: Number(shot.seq) || 1, idx: Number(shot.idx) || 1 }), shot.shotSize === '' ? t('rf7.hub.shotSizeUnknown') : shot.shotSize, t(shotStatus(shot.status).key), shotStatus(shot.status).tone === 'done'
                ? 'ok'
                : (shotStatus(shot.status).tone === 'running' ? 'accent' : 'line')))));
        }
        return (h("div", { className: RF.tw.stack },
            hubStrip,
            RF.ui.ChatSync({ t, project }),
            RF.ui.SectionHead(t('rf7.hub.sectionChapters')),
            chapterRail,
            RF.ui.SectionHead(t('rf7.hub.sectionShots'), t('rf7.hub.sectionShotsSub')),
            rows,
            h("div", { className: RF.tw.row },
                h("span", { className: RF.tw.note }, t('rf7.hub.moreShots', { count: rest > 0 ? rest : 0 })),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.goTab('shots') }, t('rf7.hub.viewAll', { count: chapterShots.length }))),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.goFlow('projectSettings') }, t('rf7.hub.actProjectSettings')),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.goFlow('skills') }, t('rf7.hub.actSkills')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 03 章节（Chapters）
    // ══════════════════════════════════════════════════════════════
    RF.tabChapters = function tabChapters(props) {
        const t = props.t;
        const project = props.project ?? {};
        const chapters = Array.isArray(project.chapters) ? project.chapters : [];
        const card = chapter => (h(Card, { key: chapter.id, ...RF.workbenchCard() },
            h("div", { className: RF.tw.rowTitle }, t('rf7.chapters.chapterTitle', { chapter: Number(chapter.id) || 1 })),
            h("div", { className: RF.tw.row },
                h("span", { className: RF.tw.rowSub }, (Number(chapter.shotCount) || 0) === 0
                    ? t('rf7.chapters.noShots')
                    : t('rf7.chapters.shotsMeta', {
                        shots: chapter.shotCount,
                        duration: RF.formatDuration(chapter.durationSec ?? 0),
                    })),
                h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(chapterStatus(chapter.status).tone)) }, t(chapterStatus(chapter.status).key))),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.runStage('llm', chapter.id) }, t('rf7.chapters.actGenerate')),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.chapters.actEditDisabled') }, t('rf7.chapters.actEdit')),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.chapters.actMoreDisabled') }, t('rf7.chapters.actMore')))));
        const rows = [];
        for (let index = 0; index < chapters.length; index += 2) {
            const pair = chapters.slice(index, index + 2);
            rows.push(h("div", { key: index, className: RF.tw.gridTwo }, pair.map(card)));
        }
        return (h("div", { className: RF.tw.stack },
            RF.ui.ChatSync({ t, project }),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", onClick: () => props.state.goFlow('intake') }, t('rf7.chapters.actAdd')),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.runStage('llm') }, t('rf7.chapters.actGenerateAll'))),
            rows,
            RF.ui.Notice(t('rf7.chapters.notice'), t('rf7.chapters.noticeSub'))));
    };
    // ══════════════════════════════════════════════════════════════
    // 04 素材库（Assets）
    // ══════════════════════════════════════════════════════════════
    RF.tabAssets = function tabAssets(props) {
        const t = props.t;
        const project = props.project ?? {};
        const assets = Array.isArray(project.assets) ? project.assets : [];
        const category = props.state.assetCategory;
        const shown = RF.assetsByCategory(project, category);
        // 缺口警示：**实算**缺参考图的分镜数（写死「3 个」= 面板在骗人）。
        const missingShots = RF.shotsMissingReferences(project);
        const shots = Array.isArray(project.shots) ? project.shots : [];
        const gapText = missingShots.length > 0
            ? t('rf7.assets.gapTitle', { count: missingShots.length })
            : (shots.length === 0 ? t('rf7.assets.gapNoShots') : t('rf7.assets.gapNone'));
        const chipItems = ['all'].concat(RF.ASSET_CATEGORIES.filter(item => (assets.filter(asset => String(asset?.category ?? '') === item).length > 0)));
        const chipLabels = chipItems.map(item => (item === 'all'
            ? t('rf7.assets.chipAll', { count: assets.length })
            : `${assetCategoryName(item, t)} ${assets.filter(asset => String(asset?.category ?? '') === item).length}`));
        const card = asset => (h(Card, { key: asset.id, ...RF.workbenchCard() },
            h("div", { className: RF.tw.rowTitle }, asset.name),
            h("div", { className: RF.tw.row },
                h("span", { className: RF.tw.rowSub }, assetCategoryName(asset.category, t)),
                h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('done')) }, t('rf7.assets.stateReady'))),
            h("div", { className: RF.tw.rowSub }, asset.description === '' ? t('rf7.assets.noDescription') : asset.description),
            h("div", { className: RF.tw.chips }, [t('rf7.assets.actGenerate'), t('rf7.assets.actReplace')].map(action => (h("span", { key: action, className: RF.tw.chip }, action))))));
        const rows = [];
        for (let index = 0; index < shown.length; index += 2) {
            const pair = shown.slice(index, index + 2);
            rows.push(h("div", { key: index, className: RF.tw.gridTwo }, pair.map(card)));
        }
        return (h("div", { className: RF.tw.stack },
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", onClick: () => props.state.goFlow('picker') }, t('rf7.assets.actCreate'))),
            RF.ui.ChipRow(chipLabels, chipItems.indexOf(category), index => {
                props.state.setAssetCategory(chipItems[index] ?? 'all');
            }),
            rows,
            h("div", { className: RF.tw.row },
                h("span", { className: RF.tw.note }, t('rf7.assets.more', { count: assets.length - shown.length })),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.setAssetCategory('all') }, t('rf7.assets.viewAll', { count: assets.length }))),
            RF.ui.Notice(gapText, t('rf7.assets.gapSub'))));
    };
    // ══════════════════════════════════════════════════════════════
    // 07 分镜审查（Storyboard）
    // ══════════════════════════════════════════════════════════════
    RF.tabShots = function tabShots(props) {
        const t = props.t;
        const project = props.project ?? {};
        const shots = Array.isArray(project.shots) ? project.shots : [];
        const selectedId = props.state.selectedShotId;
        const selected = RF.currentShot(project, selectedId);
        const rows = shots.map(shot => {
            const on = selected !== null && String(shot.id) === String(selected.id);
            const status = shotStatus(shot.status);
            return (h("button", { key: String(shot.id), type: "button", className: RF.cn(RF.tw.shotrow, on && RF.tw.shotrowOn), onClick: () => props.state.selectShot(String(shot.id)) },
                h("span", { className: RF.cn(RF.tw.rowTitle, `font-semibold`) }, String(Number(shot.idx) || 0).padStart(2, '0')),
                h("span", { className: RF.cn(RF.tw.rowMain, `text-xs`) }, shot.label),
                h("span", { className: `text-[10px] text-muted-foreground` }, t('rf7.storyboard.duration', { seconds: shot.duration ?? 0 })),
                h("span", { className: `text-[10px] text-muted-foreground shrink-0` }, t(status.key))));
        });
        const preview = selected === null
            ? null
            : (h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    RF.ui.Thumb(t('rf7.storyboard.refCharacter'), { size: 48 }),
                    RF.ui.Thumb(t('rf7.storyboard.refScene'), { size: 48 }),
                    RF.ui.Thumb(t('rf7.storyboard.refProp'), { size: 48 }),
                    h("div", { style: { flex: '1 1 auto' } }),
                    RF.ui.PlayerBar(t('rf7.storyboard.duration', { seconds: selected.duration ?? 0 }))),
                h("div", { className: RF.tw.rowSub }, t('rf7.storyboard.promptLine', {
                    size: selected.shotSize === '' ? '-' : selected.shotSize,
                }))));
        return (h("div", { className: RF.tw.stack },
            rows,
            selected === null
                ? (h(RF.ui.EmptyState, { title: t('rf7.storyboard.empty.title'), hint: t('rf7.storyboard.empty.hint') }))
                : RF.ui.SectionHead(t('rf7.storyboard.sectionSelected', { idx: Number(selected.idx) || 1 }), t('rf7.storyboard.sectionSelectedSub')),
            preview,
            RF.ui.SectionHead(t('rf7.storyboard.sectionRegenerate')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.regenerateShot(selected) }, t('rf7.storyboard.actSeed')),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.regenerateShot(selected) }, t('rf7.storyboard.actRewrite'))),
                RF.ui.FieldBox(t('rf7.storyboard.feedbackPlaceholder'), 'placeholder')),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: selected === null, title: selected === null ? t('rf7.storyboard.actDetailDisabled') : undefined, onClick: () => {
                        props.state.selectShot(String(selected.id));
                        props.state.goFlow('shotDetail');
                    } }, t('rf7.storyboard.actDetail')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 05 上下文（Context）
    // ══════════════════════════════════════════════════════════════
    RF.tabContext = function tabContext(props) {
        const t = props.t;
        const project = props.project ?? {};
        const context = project.context ?? {};
        const expanded = String(props.state.expandedContextKey ?? '');
        const card = (key, titleKey, metaKey, value, tone) => {
            const filled = String(value ?? '').trim() !== '';
            return (h(Card, { key: key, ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, t(titleKey)),
                        h("div", { className: RF.tw.rowSub }, t(metaKey))),
                    h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass(filled ? tone : 'queued')) }, t(filled ? 'rf7.context.stateReady' : 'rf7.context.stateMissing'))),
                expanded === key
                    ? (h("div", { className: RF.tw.rowSub }, filled ? value : t('rf7.context.stateMissing')))
                    : null,
                h("div", { className: RF.tw.row },
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.toggleContextKey(key) }, t('rf7.context.actView')),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.context.actWriteDisabled') }, t('rf7.context.actWrite')))));
        };
        return (h("div", { className: RF.tw.stack },
            RF.ui.ChatSync({ t, project }),
            card('bible', 'rf7.context.bibleTitle', 'rf7.context.bibleMeta', context.bible, 'done'),
            card('style', 'rf7.context.styleTitle', 'rf7.context.styleMeta', context.style, 'done'),
            card('continuity', 'rf7.context.continuityTitle', 'rf7.context.continuityMeta', context.continuity, 'warn'),
            RF.ui.SectionHead(t('rf7.context.sectionInject'), t('rf7.context.sectionInjectSub')),
            h(Card, { ...RF.workbenchCard() }, RF.CONTEXT_INJECTION_ORDER.map(key => (h("div", { key: key, className: `text-[10px] text-primary` }, RF.CONTEXT_INJECTION_TITLES[key])))),
            RF.ui.Notice(t('rf7.context.rule1'), t('rf7.context.rule2'))));
    };
    // ══════════════════════════════════════════════════════════════
    // 10 成片（Output）
    // ══════════════════════════════════════════════════════════════
    RF.tabOutput = function tabOutput(props) {
        const t = props.t;
        const project = props.project ?? {};
        const deliverables = Array.isArray(project.deliverables) ? project.deliverables : [];
        const chapters = Array.isArray(project.chapters) ? project.chapters : [];
        const videos = deliverables.filter(item => String(item.kind ?? '').startsWith('video'));
        const first = videos[0] ?? deliverables[0] ?? null;
        const exportRow = first === null
            ? null
            : (h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, first.label === '' ? t('rf7.output.untitled') : first.label),
                        h("div", { className: RF.tw.rowSub }, t('rf7.output.fileMeta', {
                            size: RF.formatBytes(first.bytes ?? 0),
                            time: RF.formatDateTime(first.at ?? ''),
                        }))),
                    h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", onClick: () => window.open(RF.deliverableUrl(first), '_blank') }, t('rf7.output.actDownload')))));
        const deliverList = deliverables.length === 0
            ? (h(RF.ui.EmptyState, { title: t('rf7.output.empty.title'), hint: t('rf7.output.empty.hint') }))
            : (h(Card, { ...RF.workbenchCard() }, deliverables.map(item => RF.ui.KvRow(item.label === '' ? String(item.kind ?? '') : item.label, t('rf7.output.deliverMeta', { size: RF.formatBytes(item.bytes ?? 0) }), t('rf7.output.stateReady'), 'ok'))));
        return (h("div", { className: RF.tw.stack },
            exportRow,
            h("div", { className: `flex h-[168px] items-center justify-center rounded-[10px] bg-muted text-[11px] text-muted-foreground` }, t('rf7.output.playerPlaceholder')),
            RF.ui.SectionHead(t('rf7.output.sectionDeliver'), t('rf7.output.sectionDeliverSub')),
            h("div", { id: "rf-deliverables" }, deliverList),
            RF.ui.SectionHead(t('rf7.output.sectionChapters')),
            h(Card, { ...RF.workbenchCard() }, chapters.length === 0
                ? (h("div", { className: RF.tw.rowSub }, t('rf7.output.noChapters')))
                : chapters.map(chapter => (h("div", { key: chapter.id, className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, t('rf7.output.chapterTitle', {
                            chapter: Number(chapter.id) || 1,
                            title: chapter.title,
                        })),
                        h("div", { className: RF.tw.rowSub }, t('rf7.output.chapterMeta', {
                            shots: chapter.shotCount ?? 0,
                            duration: RF.formatDuration(chapter.durationSec ?? 0),
                        }))))))),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.goFlow('music') }, t('rf7.output.actMusic')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 12 运行日志（Log）
    // ══════════════════════════════════════════════════════════════
    RF.tabLog = function tabLog(props) {
        const t = props.t;
        const project = props.project ?? {};
        const changelog = project.changelog ?? {};
        const entries = Array.isArray(changelog.entries) ? changelog.entries : [];
        const changeList = entries.length === 0
            ? (h(RF.ui.EmptyState, { title: t('rf7.log.empty.title'), hint: t('rf7.log.empty.hint') }))
            : (h(Card, { ...RF.workbenchCard() }, entries.slice(0, 20).map(entry => (h("div", { key: entry.id, className: RF.tw.row },
                h("span", { className: `shrink-0 text-[10px] text-muted-foreground` }, RF.formatDateTime(entry.at ?? '')),
                h("span", { className: RF.tw.rowMain }, String(entry.summary ?? '')),
                entry.drifted === true ? (h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('warn')) }, t('rf7.log.drifted'))) : null)))));
        const latest = entries[entries.length - 1] ?? null;
        return (h("div", { className: RF.tw.stack },
            RF.ui.SectionHead(t('rf7.log.sectionChanges'), t('rf7.log.sectionChangesSub')),
            changeList,
            RF.ui.SectionHead(t('rf7.log.sectionOutput')),
            RF.ui.CodeBox(entries.slice(-6).reverse().map(entry => `[${RF.formatDateTime(entry.at ?? '')}] ${String(entry.summary ?? '')}`)),
            RF.ui.SectionHead(t('rf7.log.sectionRollback')),
            h(Card, { ...RF.workbenchCard() },
                RF.ui.KvRow(t('rf7.log.rollbackBatch'), '-', '', 'muted', h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.log.rollbackBatchDisabled') }, t('rf7.log.actRollback'))),
                RF.ui.KvRow(t('rf7.log.rollbackTime'), '-', '', 'muted', h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.log.rollbackTimeDisabled') }, t('rf7.log.actPick'))),
                RF.ui.KvRow(t('rf7.log.rollbackSingle'), latest === null ? '-' : String(latest.summary ?? ''), '', 'muted', h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: latest === null ? undefined : () => props.state.rollback(latest, 'single') }, t('rf7.log.actRollback'))),
                h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.log.rollbackNote')))));
    };
})(RF);

/* ── src/client/workbench/flow.jsx ───────────────────────────── */
"use strict";
/* ─────────────────────────────────────────────────────────────────────────────
 * 流程屏（RF7 画板索引 §八「流程屏」8 块）+ 两块规范板。
 *
 * 启动检查 01 · 服务配置 14 · 新建项目 02 · 项目设置 15
 * 生成执行 06 · 分镜详情 08 · 背景音乐 09 · 技能与工作流 13
 * 规范板：降级与失败 17 · 素材选择器 18
 *
 * 排版照 `design/_tools/build-rf7.mjs` 里对应的 `boardXxx()`。
 *
 * ## 数据纪律
 *
 * 1. **探测结果**走独立只读路由（`/api/reelforge.probe`），不进 wire view；
 * 2. **服务配置**走 `/api/reelforge.capabilities`（**只读**，插件没有写配置的通道）；
 * 3. 数据没有就**说清没有**（RF7 §6.7），不编内容。
 * 4. shadcn 用 `<Button>` / `<Card>` / `<Badge>`；复合件用 `RF.ui.*`（见 AGENTS.md §3.9）。
 * ─────────────────────────────────────────────────────────────────────────── */
;
(function (RF) {
    'use strict';
    /**
     * 启动检查的检查行清单与状态桶**不在这里定义** —— 胶囊/底栏（`chrome.js`）
     * 要用同一份口径，否则两边的数字会对不上。
     * 统一放在共享层：`RF.PROBE_GATE_ROWS` / `RF.probeGateRows()` / `RF.probeGateSummary()`。
     *
     * 三条规矩（详见 `src/client/shared.js`）：
     * 1. 「ComfyUI-Kernel 版本」并进「ComfyUI 服务」行（同一份 `systemStats` 数据）；
     * 2. 「Agent 运行时」不是检查项 ⇒ 屏内单独一行说明，不计入「N 项检查」；
     * 3. 行清单随探测范围变（云端档不列本地专属行）。
     */
    // ══════════════════════════════════════════════════════════════
    // 01 启动检查（RunGate）—— 环境门，冷启动首屏
    // ══════════════════════════════════════════════════════════════
    RF.flowRunGate = function flowRunGate(props) {
        const t = props.t;
        const state = props.state;
        const view = state.probe?.view ?? null;
        const report = view?.report ?? null;
        const items = Array.isArray(report?.items) ? report.items : [];
        // ⚠️ 用 `||` 不用 `??`：投影里 `runPosition` 是**空字符串**而不是 undefined，
        // `??` 不会往下走 ⇒ 界面刚选的位置永远不亮（已提交的位置优先，没提交才用界面选择）。
        const position = String(props.project?.runPosition || state.pendingPosition || '');
        const probed = items.length > 0;
        const probeError = String(state.probe?.error ?? '');
        const loading = state.probe?.loading === true;
        // 这一份结果是**哪个位置**探出来的（宿主回传）。
        const probedPosition = String(view?.position ?? '');
        // 汇总口径 = **显示出来的检查行**（total = 行数）⇒ 「N 项检查 · X 通过 · …」
        // 永远加得起来；胶囊/底栏用的是同一个 `RF.probeGateSummary()`。
        const summary = RF.probeGateSummary(report);
        const rows = summary.rows.map(row => {
            const conf = RF.PROBE_GATE_BUCKETS[row.bucket] ?? RF.PROBE_GATE_BUCKETS.unset;
            const detail = row.detail === null
                ? ''
                : (row.detail.raw !== undefined ? row.detail.raw : t(row.detail.key, row.detail.params));
            const value = detail === '' ? row.message : `${row.message} · ${detail}`;
            return RF.ui.KvRow(t(row.labelKey), value, t(conf.key), conf.tone);
        });
        const positionRadioName = 'reelforge-run-position';
        const positionCard = (cardKey, titleKey, subKey, facts, value) => (h("label", { key: cardKey, className: RF.tw.positionCard },
            h(Card, { ...RF.workbenchCard({ state: position === value ? 'selected' : 'default' }) },
                h("div", { className: RF.tw.row },
                    h(RF.ui.RadioInput, { name: positionRadioName, value: value, checked: position === value, onChange: () => state.choosePosition(value) }),
                    h("span", { className: RF.tw.rowTitle }, t(titleKey))),
                h("div", { className: RF.tw.rowSub }, t(subKey)),
                facts.map(fact => (h("div", { key: fact.key, className: RF.tw.rowSub }, t(fact.key, fact.params)))))));
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, t('rf7.runGate.summaryTitle')),
                        h("div", { className: RF.tw.rowSub }, !probed
                            ? t(loading ? 'rf7.runGate.probingMeta' : 'rf7.runGate.pendingMeta')
                            : t('rf7.runGate.summaryMeta', {
                                total: summary.total,
                                passed: summary.passed,
                                failed: summary.failed,
                                warned: summary.warned,
                                unconfigured: summary.unset,
                            }))),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: !probed && position === '', title: !probed && position === '' ? t('rf7.runGate.pendingHint') : undefined, onClick: () => (probed ? state.reloadProbe() : state.startProbe()) }, probed ? t('rf7.runGate.actRerun') : t('rf7.runGate.actStart'))),
                RF.ui.Track(probed && summary.total > 0 ? summary.passed / summary.total : 0)),
            RF.ui.SectionHead(t('rf7.runGate.sectionPosition'), t('rf7.runGate.sectionPositionSub')),
            h("div", { className: RF.tw.gridTwo, role: "radiogroup", "aria-label": t('rf7.runGate.sectionPosition') },
                positionCard('local', 'rf7.runGate.localTitle', 'rf7.runGate.localSub', [
                    { key: 'rf7.runGate.localFact1' },
                    { key: 'rf7.runGate.localFact2' },
                ], 'local'),
                positionCard('cloud', 'rf7.runGate.cloudTitle', 'rf7.runGate.cloudSub', [
                    { key: 'rf7.runGate.cloudFact1' },
                    { key: 'rf7.runGate.cloudFact2' },
                ], 'cloud')),
            probed && probedPosition !== '' && position !== '' && probedPosition !== position
                ? RF.ui.Notice(t('rf7.runGate.staleTitle'), t('rf7.runGate.staleHint'))
                : null,
            RF.ui.SectionHead(t('rf7.runGate.sectionChecks'), probed ? undefined : t('rf7.runGate.pendingHint')),
            probed
                ? (h(Card, { ...RF.workbenchCard() }, rows))
                : (h(Card, { ...RF.workbenchCard() }, RF.ui.Notice(probeError !== '' ? probeError : t('rf7.runGate.pendingTitle'), t('rf7.runGate.pendingHint')))),
            h(Card, { ...RF.workbenchCard() }, RF.ui.KvRow(t('rf7.runGate.checkAgent'), t('rf7.runGate.agentValue'), t('rf7.runGate.builtin'), 'muted')),
            RF.ui.Notice(t('rf7.runGate.noticeMain'), t('rf7.runGate.noticeSub')),
            h("div", { className: RF.tw.row },
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => state.goFlow('settings') }, t('rf7.runGate.actSettings')),
                h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => state.goFlow('degraded') }, t('rf7.runGate.actFailures')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 14 服务配置（Settings）—— 只读屏
    // ══════════════════════════════════════════════════════════════
    RF.flowSettings = function flowSettings(props) {
        const t = props.t;
        const capabilities = props.state.capabilities ?? {};
        const comfy = String(capabilities.comfyBaseUrl ?? '');
        const budget = Number(capabilities.budgetLimitCny ?? 0);
        const stages = Array.isArray(capabilities.stages) ? capabilities.stages : [];
        const field = (labelKey, value, kind) => (h("div", { key: labelKey, className: "flex flex-col gap-1" },
            h("span", { className: "text-[10px] text-muted-foreground" }, t(labelKey)),
            RF.ui.FieldBox(value === '' ? t('rf7.settings.unset') : value, kind)));
        return (h("div", { className: RF.tw.stack },
            RF.ui.SectionHead(t('rf7.settings.sectionComfy'), t('rf7.settings.sectionComfySub')),
            h(Card, { ...RF.workbenchCard() },
                field('rf7.settings.labelAddress', comfy, 'value'),
                h("div", { className: RF.tw.row },
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => props.state.reloadProbe() }, t('rf7.settings.actTest')),
                    h("span", { className: RF.tw.rowSub }, t('rf7.settings.testHint')))),
            RF.ui.SectionHead(t('rf7.settings.sectionLlm'), t('rf7.settings.sectionLlmSub')),
            h(Card, { ...RF.workbenchCard() },
                field('rf7.settings.labelBaseUrl', '', 'placeholder'),
                field('rf7.settings.labelModel', '', 'placeholder'),
                field('rf7.settings.labelApiKey', '', 'masked'),
                RF.ui.Notice(t('rf7.settings.llmNotice'), t('rf7.settings.llmNoticeSub'))),
            RF.ui.SectionHead(t('rf7.settings.sectionRuntime'), t('rf7.settings.sectionRuntimeSub')),
            h(Card, { ...RF.workbenchCard() }, RF.ui.ChipRow([t('rf7.settings.runtimeBuiltin'), t('rf7.settings.runtimeClaudeCode'), t('rf7.settings.runtimeCodex'), t('rf7.settings.runtimeGemini'), t('rf7.settings.runtimeCustom')], 0, undefined, t('rf7.settings.runtimeDisabled'))),
            RF.ui.SectionHead(t('rf7.settings.sectionMaintenance')),
            h(Card, { ...RF.workbenchCard() },
                RF.ui.KvRow(t('rf7.settings.rowFree'), t('rf7.settings.valueFree'), t('rf7.settings.stateAdjustable'), 'muted'),
                RF.ui.KvRow(t('rf7.settings.rowTimeout'), t('rf7.settings.valueTimeout'), '', 'muted'),
                RF.ui.KvRow(t('rf7.settings.rowCloudKey'), t('rf7.settings.valueCloudKey'), t('rf7.settings.stateNotLoggedIn'), 'warn')),
            RF.ui.Notice(t('rf7.settings.readonlyTitle'), t('rf7.settings.readonlySub', { budget: RF.formatMoney(budget), stages: stages.length }))));
    };
    // ══════════════════════════════════════════════════════════════
    // 02 新建项目（Intake）
    // ══════════════════════════════════════════════════════════════
    RF.flowIntake = function flowIntake(props) {
        const t = props.t;
        const state = props.state;
        const project = props.project ?? {};
        const intake = project.intake ?? {};
        const headings = Array.isArray(intake.headings) ? intake.headings : [];
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: "flex flex-col gap-1" },
                    h("span", { className: "text-[10px] text-muted-foreground" }, t('rf7.intake.labelName')),
                    h("input", { className: "flex h-9 w-full rounded-md border border-input bg-secondary px-3 py-1 text-xs text-foreground", value: state.projectName ?? '', placeholder: t('rf7.intake.namePlaceholder'), onChange: (event) => state.setProjectName(event?.target?.value ?? '') })),
                h("span", { className: "text-[10px] text-muted-foreground" }, t('rf7.intake.labelStyle')),
                RF.ui.ChipRow([
                    t('rf7.intake.styleRealistic'),
                    t('rf7.intake.styleAnime'),
                    t('rf7.intake.styleComic'),
                    t('rf7.intake.style3d'),
                    t('rf7.intake.styleSuspense'),
                ], state.projectStyleIndex ?? 0, index => state.setProjectStyleIndex(index))),
            h(Card, { ...RF.workbenchCard() },
                h("textarea", { className: RF.tw.textarea, value: state.novelText ?? '', placeholder: t('rf7.intake.textPlaceholder'), onChange: (event) => state.setNovelText(event?.target?.value ?? '') }),
                h("div", { className: RF.tw.rowSub }, t('rf7.intake.textHint'))),
            h(Card, { ...RF.workbenchCard({ className: RF.tw.hubstrip }) },
                RF.ui.Stat(t('rf7.intake.specResolution'), String(project.settings?.resolution ?? '') || t('rf7.settings.unset'), ''),
                h("div", { className: RF.tw.divider }),
                RF.ui.Stat(t('rf7.intake.specAspect'), String(project.settings?.aspectRatio ?? '') || t('rf7.settings.unset'), ''),
                h("div", { className: RF.tw.divider }),
                RF.ui.Stat(t('rf7.intake.specMusic'), project.settings?.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '')),
            RF.ui.SectionHead(t('rf7.intake.sectionReferences'), t('rf7.intake.sectionReferencesSub')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    RF.ui.Thumb(t('rf7.intake.refThumb'), { size: 48 }),
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, t('rf7.intake.refName')),
                        h("div", { className: RF.tw.rowSub }, t('rf7.intake.refUse'))),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.intake.actRemoveDisabled') }, t('rf7.intake.actRemove'))),
                h("div", { className: `flex min-h-10 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground` }, t('rf7.intake.actAddReference'))),
            RF.ui.SectionHead(t('rf7.intake.sectionChapters'), t('rf7.intake.sectionChaptersSub', {
                count: headings.length,
                chars: Number(intake.chars ?? 0),
            })),
            h("div", { className: RF.tw.stack }, headings.length === 0
                ? (h(RF.ui.EmptyState, { title: t('rf7.intake.noChapters'), hint: t('rf7.intake.noChaptersHint') }))
                : headings.slice(0, 4).map(heading => (h(Card, { key: heading.seq ?? heading.title, ...RF.workbenchCard() },
                    h("div", { className: RF.tw.row },
                        h("span", { className: RF.tw.rowSub }, String(heading.seq ?? 0).padStart(2, '0')),
                        h("div", { className: RF.tw.rowMain },
                            h("div", { className: RF.tw.rowTitle }, heading.title),
                            h("div", { className: RF.tw.rowSub }, t('rf7.intake.chapterMeta'))),
                        h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.intake.actImportDisabled') }, t('rf7.intake.actImport'))))))),
            RF.ui.ChatSync({ t, project })));
    };
    // ══════════════════════════════════════════════════════════════
    // 15 项目设置（ProjectSettings）—— 只读屏
    // ══════════════════════════════════════════════════════════════
    RF.flowProjectSettings = function flowProjectSettings(props) {
        const t = props.t;
        const settings = props.project?.settings ?? {};
        return (h("div", { className: RF.tw.stack },
            RF.ui.SectionHead(t('rf7.projectSettings.sectionSpec')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.gridTwo },
                    RF.ui.Stat(t('rf7.projectSettings.rowResolution'), String(settings.resolution ?? '') || t('rf7.settings.unset'), ''),
                    RF.ui.Stat(t('rf7.projectSettings.rowAspect'), String(settings.aspectRatio ?? '') || t('rf7.settings.unset'), ''),
                    RF.ui.Stat(t('rf7.projectSettings.rowStyle'), t('rf7.projectSettings.styleDefault'), ''))),
            RF.ui.SectionHead(t('rf7.projectSettings.sectionSubtitles')),
            h(Card, { ...RF.workbenchCard() },
                RF.ui.KvRow(t('rf7.projectSettings.rowAutoSub'), settings.enableSubtitles === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted'),
                RF.ui.KvRow(t('rf7.projectSettings.rowPosition'), t('rf7.projectSettings.bottomCenter'), '', 'muted'),
                RF.ui.KvRow(t('rf7.projectSettings.rowHideName'), t('rf7.intake.on'), '', 'muted'),
                h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.projectSettings.subtitleNote'))),
            RF.ui.SectionHead(t('rf7.projectSettings.sectionSound')),
            h(Card, { ...RF.workbenchCard() },
                RF.ui.KvRow(t('rf7.projectSettings.rowBgm'), settings.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted'),
                RF.ui.KvRow(t('rf7.projectSettings.rowVoice'), t('rf7.projectSettings.voiceH3'), '', 'muted')),
            RF.ui.SectionHead(t('rf7.projectSettings.sectionDanger')),
            h(Card, { ...RF.workbenchCard({ tone: "error" }) },
                h("div", { className: "text-[11px] text-muted-foreground" }, t('rf7.projectSettings.dangerText')),
                h(Button, { type: "button", variant: "destructive", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.projectSettings.dangerDisabled') }, t('rf7.projectSettings.dangerAction')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 06 生成执行（Stages）
    // ══════════════════════════════════════════════════════════════
    RF.flowStages = function flowStages(props) {
        const t = props.t;
        const state = props.state;
        const project = props.project ?? {};
        const stageData = project.stages ?? {};
        const globalStages = Array.isArray(stageData.global) ? stageData.global : [];
        const kind = String(project.plan?.kind ?? '');
        const legend = [
            { key: 'rf7.stages.legendLlm', tone: 'ok' },
            { key: 'rf7.stages.legendImage', tone: 'accent' },
            { key: 'rf7.stages.legendTts', tone: 'muted' },
            { key: 'rf7.stages.legendVideo', tone: 'muted' },
        ];
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: `flex gap-1` }, RF.STAGES.map(stageId => (h("span", { key: stageId, className: `h-1.5 flex-1 rounded-sm bg-secondary ${globalStages.includes(stageId)
                        ? `bg-primary`
                        : `h-1.5 flex-1 rounded-sm bg-secondary--off`}` })))),
                h("div", { className: RF.tw.row }, legend.map(item => (h("span", { key: item.key, className: `text-[10px] text-muted-foreground text-[10px] text-muted-foreground--${item.tone}` }, t(item.key)))))),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, t('rf7.stages.currentTitle', { kind: kind === '' ? '-' : kind })),
                        h("div", { className: RF.tw.rowSub }, t('rf7.stages.currentSub'))),
                    h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(kind === '' ? 'queued' : 'running')) }, kind === '' ? t('rf7.stages.stateUnset') : kind)),
                RF.ui.Track(0.25),
                h("div", { className: RF.tw.row },
                    h("span", { className: RF.tw.rowSub }, t('rf7.stages.metaGpu')),
                    h("span", { className: RF.tw.rowSub }, t('rf7.stages.metaVram')),
                    h("span", { className: RF.tw.rowSub }, t('rf7.stages.metaEta')))),
            RF.ui.SectionHead(t('rf7.stages.sectionQueue'), t('rf7.stages.sectionQueueSub')),
            h(Card, { ...RF.workbenchCard() }, (state.queue ?? []).length === 0
                ? (h("div", { className: RF.tw.rowSub }, t('rf7.stages.queueEmpty')))
                : state.queue.map((item, index) => (h("div", { key: index, className: RF.tw.row },
                    h("span", { className: "h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }),
                    h("span", { className: RF.tw.rowMain }, item.title),
                    h("span", { className: RF.tw.rowSub }, item.meta))))),
            RF.ui.SectionHead(t('rf7.stages.sectionPicker')),
            h(Card, { ...RF.workbenchCard() }, RF.STAGES.map(stageId => (h("div", { key: stageId, className: RF.tw.row },
                RF.ui.CheckboxIndicator(globalStages.includes(stageId)),
                h("div", { className: RF.tw.rowMain },
                    h("div", { className: RF.tw.rowTitle }, t(`stages.${stageId}`)),
                    h("div", { className: RF.tw.rowSub }, t(`rf7.stages.desc.${stageId}`))),
                h("span", { className: RF.tw.rowSub }, globalStages.includes(stageId)
                    ? t('rf7.stages.stateEnabled')
                    : t('rf7.stages.stateDisabled')))))),
            RF.ui.Notice(t('rf7.stages.memMain'), t('rf7.stages.memSub'))));
    };
    // ══════════════════════════════════════════════════════════════
    // 08 分镜详情（ShotDetail）
    // ══════════════════════════════════════════════════════════════
    RF.flowShotDetail = function flowShotDetail(props) {
        const t = props.t;
        // 口径与分镜列表一致：显式选中的那一镜，没选过就取第一镜（画板 07 永远有一镜高亮）。
        const shot = RF.currentShot(props.project, props.state.selectedShotId);
        if (shot === null) {
            return (h("div", { className: RF.tw.stack },
                h(RF.ui.EmptyState, { title: t('rf7.shotDetail.empty.title'), hint: t('rf7.shotDetail.empty.hint'), action: (h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", onClick: () => props.state.goTab('shots') }, t('rf7.shotDetail.empty.action'))) })));
        }
        const references = Array.isArray(shot.references) ? shot.references : [];
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.rowTitle }, t('rf7.shotDetail.headTitle', {
                    chapter: Number(shot.seq) || 1,
                    idx: Number(shot.idx) || 1,
                    label: shot.label,
                })),
                h("div", { className: RF.tw.rowSub }, t('rf7.shotDetail.meta', {
                    duration: shot.duration ?? 0,
                    ratio: shot.aspectRatio === '' ? '-' : shot.aspectRatio,
                }))),
            RF.ui.SectionHead(t('rf7.shotDetail.sectionReferences'), t('rf7.shotDetail.sectionReferencesSub')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    references.length === 0
                        ? (h("span", { className: RF.tw.rowSub }, t('rf7.shotDetail.noReferences')))
                        : references.map((reference, index) => (h("span", { key: index }, RF.ui.Thumb(reference.label === '' ? reference.tag : reference.label, { size: 58 })))),
                    h("div", { style: { flex: '1 1 auto' } }),
                    RF.ui.PlayerBar(t('rf7.shotDetail.duration', { seconds: shot.duration ?? 0 })))),
            RF.ui.SectionHead(t('rf7.shotDetail.sectionScript')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.rowTitle }, t('rf7.shotDetail.scriptLens', { size: shot.shotSize === '' ? '-' : shot.shotSize })),
                h("div", { className: RF.tw.rowSub }, t('rf7.shotDetail.scriptMissing'))),
            RF.ui.SectionHead(t('rf7.shotDetail.sectionPrompt')),
            h(Card, { ...RF.workbenchCard({ tone: "warn" }) },
                h("div", { className: "text-[11px] text-muted-foreground" }, t('rf7.shotDetail.promptMissing')),
                h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.shotDetail.promptMissingSub')))));
    };
    // ══════════════════════════════════════════════════════════════
    // 09 背景音乐（Music）
    // ══════════════════════════════════════════════════════════════
    RF.flowMusic = function flowMusic(props) {
        const t = props.t;
        const tracks = RF.musicAssets(props.project ?? {});
        // ⚠️ 这一屏的三个动作**都接不上**（能力缺口，不是界面 bug）：
        //   生成 —— 插件没有「生成音乐」的工具；
        //   预览 —— 投影里没有音频文件路径，没有可播的 URL；
        //   应用 —— `set_chapter_music` 要工作区相对路径，投影里没有。
        // ⇒ 一律禁用 + 说清缺什么、给什么替代（见屏内 notice）。
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.rowTitle }, t('rf7.music.generateTitle')),
                RF.ui.FieldBox(t('rf7.music.generatePlaceholder'), 'placeholder'),
                h("div", { className: RF.tw.row },
                    RF.ui.ChipRow([
                        t('rf7.music.chipInstrumental'),
                        t('rf7.music.chipVocal'),
                        t('rf7.music.chipPiano'),
                        t('rf7.music.chipStrings'),
                    ], 0, undefined, t('rf7.music.chipsDisabled')),
                    h("div", { style: { flex: '1 1 auto' } }),
                    h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", disabled: true, title: t('rf7.music.actGenerateDisabled') }, t('rf7.music.actGenerate')))),
            RF.ui.SectionHead(t('rf7.music.sectionLibrary'), t('rf7.music.sectionLibrarySub')),
            tracks.length === 0
                ? (h(Card, { ...RF.workbenchCard({ tone: "warn" }) },
                    h("div", { className: "text-[11px] text-muted-foreground" }, t('rf7.music.emptyTitle')),
                    h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.music.emptySub'))))
                : (h("div", { className: RF.tw.stack }, tracks.map(track => (h(Card, { key: track.name, ...RF.workbenchCard() },
                    h("div", { className: RF.tw.row },
                        h("div", { className: RF.tw.rowMain },
                            h("div", { className: RF.tw.rowTitle }, track.name),
                            h("div", { className: RF.tw.rowSub }, track.description)),
                        h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass("done")) }, t('rf7.music.stateApplied'))),
                    RF.ui.PlayerBar('-'),
                    h("div", { className: RF.tw.row },
                        h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.music.actPreviewDisabled') }, t('rf7.music.actPreview')),
                        h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", disabled: true, title: t('rf7.music.actApplyDisabled') }, t('rf7.music.actApply')))))))),
            RF.ui.Notice(t('rf7.music.note'), '')));
    };
    // ══════════════════════════════════════════════════════════════
    // 13 技能与工作流（Skills）—— 从旧版页签移过来的流程屏
    // ══════════════════════════════════════════════════════════════
    RF.flowSkills = function flowSkills(props) {
        const t = props.t;
        const skills = Array.isArray(props.project?.skills) ? props.project.skills : [];
        const analysis = props.project?.workflowAnalysis ?? null;
        return (h("div", { className: RF.tw.stack },
            RF.ui.SectionHead(t('rf7.skills.sectionInstalled'), t('rf7.skills.sectionInstalledSub', {
                count: skills.length,
            })),
            h(Card, { ...RF.workbenchCard() }, skills.length === 0
                ? (h(RF.ui.EmptyState, { title: t('rf7.skills.empty.title'), hint: t('rf7.skills.empty.hint') }))
                : skills.map(skill => (h("div", { key: skill.name, className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, skill.name),
                        h("div", { className: RF.tw.rowSub }, t(`rf7.skills.source.${skill.source ?? 'bundled'}`))),
                    h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass("done")) }, t('rf7.skills.stateReady')))))),
            RF.ui.SectionHead(t('rf7.skills.sectionIterate'), t('rf7.skills.sectionIterateSub')),
            h(Card, { ...RF.workbenchCard() },
                h("div", { className: RF.tw.row },
                    h("span", { className: `inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-primary` }, "1"),
                    h("span", { className: RF.tw.rowSub }, t('rf7.skills.step1'))),
                h("div", { className: RF.tw.row },
                    h("span", { className: `inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-primary` }, "2"),
                    h("span", { className: RF.tw.rowSub }, t('rf7.skills.step2'))),
                h("div", { className: `flex min-h-10 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground` }, t('rf7.skills.dropHint')),
                analysis === null
                    ? (h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", disabled: true, title: t('rf7.skills.actAnalyzeDisabled') }, t('rf7.skills.actAnalyze')))
                    : RF.ui.Notice(String(analysis.summary ?? t('rf7.skills.analyzed')), '')),
            RF.ui.Notice(t('rf7.skills.note'), '')));
    };
    // ══════════════════════════════════════════════════════════════
    // 18 素材选择器（Picker）—— 规范板
    // ══════════════════════════════════════════════════════════════
    RF.flowPicker = function flowPicker(props) {
        const t = props.t;
        const state = props.state;
        const all = RF.assetsByCategory(props.project ?? {}, 'all');
        const category = String(state.assetCategory ?? 'all');
        const assets = category === 'all' ? all : all.filter(asset => String(asset?.category ?? '') === category);
        const picked = Array.isArray(state.pickerSelection) ? state.pickerSelection : [];
        const limit = RF.REFERENCE_LIMITS.images;
        // 分类芯片（RF7 板 18）：全部 / 角色 / 场景 / 道具 / 服装。
        const chipItems = [
            { id: 'all', key: 'rf7.picker.chipAll' },
            { id: 'character', key: 'rf7.picker.chipCharacter' },
            { id: 'scene', key: 'rf7.picker.chipScene' },
            { id: 'prop', key: 'rf7.picker.chipProp' },
            { id: 'costume', key: 'rf7.picker.chipCostume' },
        ];
        const activeIndex = Math.max(0, chipItems.findIndex(item => item.id === category));
        const grid = [];
        for (let index = 0; index < assets.length; index += 3) {
            const slice = assets.slice(index, index + 3);
            grid.push(h("div", { key: index, className: RF.tw.gridThree }, slice.map(asset => (h("button", { key: String(asset.id), type: "button", className: RF.cn(RF.tw.pickerItem, picked.includes(String(asset.id)) && RF.tw.pickerItemOn), onClick: () => state.togglePicker(String(asset.id)) }, RF.ui.Thumb(asset.name, { size: 76, picked: picked.includes(String(asset.id)) }))))));
        }
        return (h("div", { className: RF.tw.stack },
            h(Card, { ...RF.workbenchCard() },
                RF.ui.FieldBox(t('rf7.picker.searchPlaceholder'), 'placeholder'),
                RF.ui.ChipRow(chipItems.map(item => t(item.key)), activeIndex, index => state.setAssetCategory(chipItems[index]?.id ?? 'all')),
                grid,
                h("div", { className: RF.tw.row },
                    picked.map(id => (h("span", { key: id }, RF.ui.Thumb(t('rf7.picker.pickedThumb'), { size: 40, picked: true })))),
                    h("span", { className: RF.tw.rowSub }, t('rf7.picker.pickedCount', {
                        count: picked.length,
                        limit,
                    })),
                    h("div", { style: { flex: '1 1 auto' } }),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => state.clearPicker() }, t('rf7.picker.actClear')))),
            RF.ui.Notice(t('rf7.picker.note'), '')));
    };
    // ══════════════════════════════════════════════════════════════
    // 17 降级与失败（Degraded）—— 规范板：五态分开说清代价与替代
    // ══════════════════════════════════════════════════════════════
    RF.flowDegraded = function flowDegraded(props) {
        const t = props.t;
        const state = props.state;
        const project = props.project ?? {};
        const view = state.probe?.view ?? null;
        const degradations = Array.isArray(view?.degrade?.degradations) ? view.degrade.degradations : [];
        const notices = Array.isArray(view?.degrade?.notices) ? view.degrade.notices : [];
        const chapters = Array.isArray(project.chapters) ? project.chapters : [];
        // 缺料 / 软降级：**实算**，不许写死数字（写死 = 面板在骗人）。
        const missing = RF.shotsMissingReferences(project);
        const noVoice = RF.charactersWithoutVoice(project);
        const stateCard = (titleKey, metaKey, tone) => (h(Card, { ...RF.workbenchCard({ tone: tone }) },
            h("div", { className: "text-[11px] text-muted-foreground" }, t(titleKey)),
            h("div", { className: "text-[10px] text-muted-foreground" }, t(metaKey))));
        const missingShots = missing
            .map(shot => String(Number(shot.idx) || 0).padStart(2, '0'))
            .join(' / ');
        return (h("div", { className: RF.tw.stack },
            RF.ui.SectionHead(t('rf7.degraded.sectionBlocked'), t('rf7.degraded.sectionBlockedSub')),
            degradations.length === 0
                ? stateCard('rf7.degraded.noneTitle', 'rf7.degraded.noneSub', 'warn-border')
                : degradations.map((item, index) => (h(Card, { key: index, ...RF.workbenchCard({ tone: "error" }) },
                    h("div", { className: "text-[11px] text-muted-foreground" }, String(item.message ?? item.kind ?? '')),
                    h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.degraded.blockedHint'))))),
            RF.ui.SectionHead(t('rf7.degraded.sectionWarning'), t('rf7.degraded.sectionWarningSub')),
            notices.length === 0
                ? stateCard('rf7.degraded.noWarningTitle', 'rf7.degraded.noWarningSub', 'warn-border')
                : notices.map((item, index) => (h(Card, { key: index, ...RF.workbenchCard({ tone: "warn" }) },
                    h("div", { className: "text-[11px] text-muted-foreground" }, String(item.message ?? item.kind ?? '')),
                    h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.degraded.warningHint'))))),
            RF.ui.SectionHead(t('rf7.degraded.sectionMissing'), t('rf7.degraded.sectionMissingSub')),
            missing.length === 0
                ? stateCard('rf7.degraded.noMissingTitle', 'rf7.degraded.noMissingSub', 'warn-border')
                : (h(Card, { ...RF.workbenchCard({ tone: "warn" }) },
                    h("div", { className: "text-[11px] text-muted-foreground" }, t('rf7.degraded.missingTitle', { count: missing.length })),
                    h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.degraded.missingSub', { shots: missingShots })),
                    h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => state.goTab('assets') }, t('rf7.degraded.actFill')))),
            chapters.length === 0
                ? (h("div", { className: RF.tw.stack },
                    RF.ui.SectionHead(t('rf7.degraded.sectionEmpty'), t('rf7.degraded.sectionEmptySub')),
                    stateCard('rf7.degraded.emptyTitle', 'rf7.degraded.emptySub', 'warn-border')))
                : null,
            noVoice.length === 0
                ? null
                : (h(Card, { ...RF.workbenchCard({ tone: "warn" }) },
                    h("div", { className: "text-[11px] text-muted-foreground" }, t('rf7.degraded.softTitle', { count: noVoice.length })),
                    h("div", { className: "text-[10px] text-muted-foreground" }, t('rf7.degraded.softSub'))))));
    };
})(RF);

/* ── src/client/workbench/Workbench.jsx ───────────────────────────── */
"use strict";
/* ─────────────────────────────────────────────────────────────────────────────
 * 右栏工作台主壳（RF7 规格）：Header / StageRail / TabBar / Scroll / Footer。
 *
 * ## 骨架铁律（R7）
 *
 * 右栏 Tab 容器是 `overflow:hidden` —— 外层 `section` 必须 `height:100%` +
 * `boxSizing:border-box` + `display:flex` + `flexDirection:column`，
 * 内层内容层必须 `flex:1; min-height:0; overflowY:auto`，
 * 否则内容超高时底栏被裁掉且滚不到。
 *
 * ## RF7 的两层导航（评审稿 §6.3 / §6.4 · 画板索引 §八）
 *
 * - **项目视图**（默认）：固定 7 个页签 —— 枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志；
 * - **流程屏**：无页签条（只有 Header / StageRail / Scroll / Footer）——
 *   RunGate · Settings · Intake · ProjectSettings · Stages · ShotDetail · Music · Skills；
 * - **规范板**：降级与失败 · 素材选择器。
 *
 * 进入流程屏的入口：**Stage 轨的 6 个步点**（点哪一步到那一屏）+ 各屏自己的主按钮。
 * 退出：面板头的返回按钮（回枢纽）。
 *
 * ## 冷启动（RF7 IA「首次进入」）
 *
 * 打开右栏且**没有章节** ⇒ 直接落 **RunGate（启动检查）**，
 * Stage 轨高亮「运行 2/6」（需求步视为已过：用户已从对话或空项目进来）。
 * ─────────────────────────────────────────────────────────────────────────── */
;
(function (RF) {
    'use strict';
    /** 7 个页签 → 渲染函数（RF7 §6.4）。 */
    RF.TAB_RENDERERS = {
        hub: RF.tabHub,
        chapters: RF.tabChapters,
        assets: RF.tabAssets,
        shots: RF.tabShots,
        context: RF.tabContext,
        output: RF.tabOutput,
        log: RF.tabLog,
    };
    /** 8 块流程屏 + 2 块规范板 → 渲染函数（RF7 画板索引 §八）。 */
    RF.FLOW_RENDERERS = {
        runGate: RF.flowRunGate,
        settings: RF.flowSettings,
        intake: RF.flowIntake,
        projectSettings: RF.flowProjectSettings,
        stages: RF.flowStages,
        shotDetail: RF.flowShotDetail,
        music: RF.flowMusic,
        skills: RF.flowSkills,
        degraded: RF.flowDegraded,
        picker: RF.flowPicker,
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
        const [activeTab, setActiveTab] = React.useState('hub');
        const [mode, setMode] = React.useState('tabs');
        const [flowScreen, setFlowScreen] = React.useState('runGate');
        const [selectedShotId, setSelectedShotId] = React.useState(null);
        const [assetCategory, setAssetCategory] = React.useState('all');
        const [pickerSelection, setPickerSelection] = React.useState([]);
        const [projectName, setProjectName] = React.useState('');
        const [projectStyleIndex, setProjectStyleIndex] = React.useState(0);
        const [novelText, setNovelText] = React.useState('');
        const [expandedContextKey, setExpandedContextKey] = React.useState('');
        const [pendingPosition, setPendingPosition] = React.useState('');
        const [probe, setProbe] = React.useState(null);
        const [capabilities, setCapabilities] = React.useState(null);
        const [probeLoading, setProbeLoading] = React.useState(false);
        const [width, setWidth] = React.useState(0);
        const shellRef = React.useRef(null);
        React.useEffect(() => {
            const element = shellRef.current;
            if (element === null || element === undefined)
                return undefined;
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
            ? (RF.FLOW_RENDERERS[flowScreen] ?? RF.flowRunGate)
            : (RF.TAB_RENDERERS[activeTab] ?? RF.tabHub);
        // 流程屏里，Stage 轨高亮的是**这一屏所属的那一步**（RF7 画板索引逐块给了）。
        const flowStepIndex = RF.STAGE_STEPS.indexOf(RF.FLOW_SCREEN_STEPS[flowScreen] ?? '');
        const currentIndex = inFlow ? (flowStepIndex >= 0 ? flowStepIndex : 0) : stage.current;
        const passedIndex = inFlow
            ? RF.STAGE_STEPS.map((_, index) => index).filter(index => index < currentIndex)
            : stage.passed;
        // ── 探测数据（启动检查 / 降级两屏用）──
        // ⚠️ 这里**不用** `useCallback`：客户端测试用的最小 hook 运行时没有它。
        //
        // ⚠️ **探测不自动跑**（IA「首次进入」：用户选 local/cloud + 完成/跳过探测）：
        // 探测范围是运行位置的函数（设计 §7.1）—— 没选位置就没有确定的范围。
        // 进右栏就发探测请求 = 替用户选了一个范围（宿主默认 local），
        // 界面还显示成「已经检过」⇒ 用户看到的不是他选的环境。
        // 所以：**只有用户点了「开始检测」才探**。
        const loadProbe = (refresh, position) => {
            if (typeof fetch !== 'function') {
                setProbe({ view: null, error: '当前环境没有 fetch，读不到探测结果' });
                return;
            }
            setProbeLoading(true);
            fetch(RF.probeUrl({
                refresh: refresh === true,
                position: typeof position === 'string' && position !== '' ? position : undefined,
            }))
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
        // 服务配置（只读路由）：给 RF7 的「服务配置」屏提供读数。
        const capabilitiesStartedRef = React.useRef(false);
        React.useEffect(() => {
            if (capabilitiesStartedRef.current)
                return;
            capabilitiesStartedRef.current = true;
            if (typeof fetch !== 'function')
                return;
            fetch(RF.capabilitiesUrl())
                .then(response => response.json())
                .then(value => setCapabilities(value ?? null))
                .catch(() => setCapabilities(null));
        }, []);
        // 冷启动：没有章节 ⇒ 直接落「启动检查」（RF7 IA「首次进入」）。
        const autoEntryRef = React.useRef(false);
        React.useEffect(() => {
            const chapters = Array.isArray(project.chapters) ? project.chapters : [];
            if (autoEntryRef.current || chapters.length > 0)
                return;
            autoEntryRef.current = true;
            setMode('flow');
            setFlowScreen('runGate');
            setPendingPosition(prev => (prev === '' ? 'local' : prev));
        }, [project.chapters]);
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
            if (typeof props.sessionId === 'string')
                RF.currentSessionId = props.sessionId;
        }, [props.sessionId]);
        const goFlow = (screen) => {
            if (typeof screen !== 'string' || RF.FLOW_RENDERERS[screen] === undefined)
                return;
            setMode('flow');
            setFlowScreen(screen);
        };
        const goTab = (tab) => {
            if (typeof tab !== 'string' || RF.TAB_RENDERERS[tab] === undefined)
                return;
            setMode('tabs');
            setActiveTab(tab);
        };
        const state = {
            selectedShotId,
            selectShot: setSelectedShotId,
            assetCategory,
            setAssetCategory,
            pickerSelection,
            togglePicker: (id) => {
                setPickerSelection(prev => (prev.includes(id)
                    ? prev.filter(item => item !== id)
                    : [...prev, id]));
            },
            clearPicker: () => setPickerSelection([]),
            projectName,
            setProjectName,
            projectStyleIndex,
            setProjectStyleIndex,
            novelText,
            setNovelText,
            /** 上下文屏「查看」展开的键（空 = 都没展开）。 */
            expandedContextKey,
            toggleContextKey: (key) => {
                setExpandedContextKey(prev => (prev === key ? '' : key));
            },
            pendingPosition,
            twoColumns,
            // ── 流程屏相关 ──
            goFlow,
            goTab,
            probe: probe === null ? null : { ...probe, loading: probeLoading },
            /**
             * 当前生效的运行位置（已写进项目的优先，没写就用界面上的选择）。
             * @returns {string} `local` / `cloud` / `''`（还没选）。
             */
            probePosition: String(project.plan?.position || pendingPosition || ''),
            /**
             * 开始检测（走宿主缓存）。
             * ⚠️ 没有位置就不发请求 —— 没有范围就没有事实。
             */
            startProbe: () => {
                const position = String(project.plan?.position || pendingPosition || '');
                if (position === '')
                    return;
                loadProbe(false, position);
            },
            /** 重跑检查（绕过宿主缓存强制重跑）。 */
            reloadProbe: () => {
                const position = String(project.plan?.position || pendingPosition || '');
                if (position === '')
                    return;
                loadProbe(true, position);
            },
            capabilities,
            /**
             * 导入小说：走 `reelforge.import_novel`（`novel` 是必填）。
             */
            importNovel: () => {
                const text = String(novelText).trim();
                if (text === '')
                    return;
                RF.actions?.callTool?.(RF.TOOL_IDS.importNovel, { novel: text });
            },
            /**
             * 选运行位置。
             *
             * ⚠️ `reelforge.update_plan` 的 `kind` 与 `position` **都是必填** ——
             * 只发位置会被宿主整条拒收。所以：
             *   已经选过 kind → 直接改位置；
             *   还没选 kind   → 先记住位置（客户端交互态），等执行路径选完 kind 一起写入。
             */
            choosePosition: (position) => {
                const kind = project.plan?.kind;
                // 已经探过、而这次结果属于**另一个位置**（本地 9 项 / 云端 3 项）⇒
                // 旧结果留着就是在骗人 ⇒ 立刻按新位置重探一次。
                // 没探过（probe === null）⇒ 不探，等用户点「开始检测」。
                const probedPosition = String(probe?.view?.position ?? '');
                const stale = probe !== null && probedPosition !== '' && probedPosition !== position;
                if (typeof kind === 'string' && kind !== '') {
                    RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
                    if (stale)
                        loadProbe(false, position);
                    return;
                }
                setPendingPosition(position);
                if (stale)
                    loadProbe(false, position);
            },
            /**
             * 选生成 kind（写进 `reelforge.update_plan`）。
             */
            chooseKind: (kind) => {
                const position = pendingPosition !== '' ? pendingPosition : String(project.plan?.position ?? '');
                if (position === '')
                    return;
                RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
            },
            /**
             * 跑一个阶段（`reelforge.run_stage`，触发类 ⇒ 宿主会弹授权）。
             *
             * `seq` 限定章节（宿主 schema 的可选参数；不填 = 全部章节）。
             *
             * @param {string} stage - 阶段。
             * @param {number} [seq] - 限定章节。
             * @returns {void}
             */
            runStage: (stage, seq) => {
                const args = { stage };
                if (seq !== undefined && seq !== null && Number.isFinite(Number(seq)))
                    args.seq = Number(seq);
                RF.actions?.callTool?.(RF.TOOL_IDS.runStage, args);
            },
            /**
             * 重新生成一镜（`reelforge.regenerate_shot`，触发类 ⇒ 宿主会弹授权）。
             *
             * ⚠️ 参数名是 `seq` + `idx`（不是 `id`）：宿主 schema `required: ['seq','idx']`，
             * 发成 `{ id }` 会被整条拒收。
             */
            regenerateShot: (shot) => {
                if (shot === null || shot === undefined)
                    return;
                RF.actions?.callTool?.(RF.TOOL_IDS.regenerateShot, {
                    seq: Number(shot.seq) || 1,
                    idx: Number(shot.idx) || 1,
                });
            },
            /**
             * 回滚一条变更（`reelforge.rollback`）。
             *
             * ⚠️ **id 字段随模式变**：`single` 用 `entryId`、`batch` 用 `batchId`、
             * `timepoint` 用 `at`；而且 schema 是 `additionalProperties:false` ——
             * 发错字段名会被宿主当成未知键**整条拒收**（以前这里恒发 `entryId`，批模式必然失效）。
             *
             * @param {object} entry - 变更条目。
             * @param {string} mode - 回滚模式。
             * @param {boolean} [force] - 漂移时强制覆盖。
             */
            rollback: (entry, mode, force) => {
                const kind = mode === 'batch' ? 'batch' : (mode === 'timepoint' ? 'timepoint' : 'single');
                const params = { mode: kind };
                if (kind === 'batch')
                    params.batchId = String(entry?.batchId ?? entry?.batch ?? '');
                else if (kind === 'timepoint')
                    params.at = String(entry?.at ?? '');
                else
                    params.entryId = String(entry?.id ?? '');
                if (force === true)
                    params.force = true;
                RF.actions?.callTool?.(RF.TOOL_IDS.rollback, params);
            },
        };
        // ── 按屏外壳（Header 三件套 + Footer 三件套）──
        const chrome = RF.tabChrome(activeScreen);
        // 外壳上下文：**交互态**（不在投影里的那部分）也要给外壳，
        // 否则「正文还没写」这类判断只能看到空投影，底栏就会给出可点的死按钮。
        const chromeContext = {
            probe,
            capabilities,
            selectedShotId,
            pickerSelection,
            novelText,
            projectName,
        };
        const chromeAction = typeof chrome.footerAction === 'function'
            ? chrome.footerAction(project, t, chromeContext)
            : (chrome.footerAction ?? {});
        const chromeTitle = chrome.titleKey === undefined ? '' : t(chrome.titleKey);
        const chromeSubtitle = chrome.subtitle(project, t, chromeContext);
        const chromeCapsule = chrome.capsule(project, t, chromeContext);
        const chromeCapsuleTone = typeof chrome.capsuleTone === 'function'
            ? chrome.capsuleTone(project, t, chromeContext)
            : 'neutral';
        const chromeLabel = chrome.footerLabel(project, t);
        // ⚠️ **必须传 chromeContext**：RunGate 底栏要读探测结果（有几项没通过）、
        // Picker 底栏要读已选张数 —— 漏传的话这两个底栏永远停在初值
        //（RunGate 一直说「正在探测本机环境…」，Picker 一直说「已选 0 个」）。
        const chromeValue = chrome.footerValue(project, t, chromeContext);
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
                const raw = typeof action.params === 'function'
                    ? action.params(project, t, chromeContext)
                    : action.params;
                // ⚠️ `params` 可以是**一组**：素材选择器要把不同分类分别绑到不同字段，
                // 而宿主的 `bind_asset` 一次只吃一个字段 ⇒ 逐个发。
                const list = Array.isArray(raw) ? raw : [raw];
                for (const args of list)
                    RF.actions?.callTool?.(action.tool, args ?? {});
                return;
            }
            if (action.kind === 'export')
                exportChangelog();
            if (action.kind === 'scroll') {
                const target = document.getElementById(action.target);
                if (target !== null && typeof target.scrollIntoView === 'function') {
                    target.scrollIntoView({ block: 'start' });
                }
            }
        };
        // Stage 轨点哪一步 → 到那一屏（设计稿把 Stage 轨定义成进度指示，这里加成可点）。
        const goStageStep = (step) => {
            const target = RF.STAGE_STEP_TARGETS[step];
            if (target === undefined)
                return;
            if (target.kind === 'flow')
                goFlow(target.screen);
            else
                goTab(target.tab);
        };
        const capsuleTone = chromeCapsuleTone === 'accent'
            ? 'accent'
            : (chromeCapsuleTone === 'ok' ? 'ok' : (chromeCapsuleTone === 'warn' ? 'warn' : 'neutral'));
        return (h("section", { className: RF.tw.root, ref: shellRef },
            h("header", { className: RF.tw.header },
                inFlow
                    ? (h("button", { type: "button", className: RF.cn(RF.tw.headerLogo, RF.tw.headerLogoBtn), title: t('flow.backToWorkbench'), "aria-label": t('flow.backToWorkbench'), onClick: () => goTab('hub') }))
                    : (h("div", { className: RF.tw.headerLogo, "aria-hidden": true })),
                h("div", { className: RF.tw.headerText },
                    h("div", { className: RF.tw.headerTitle }, chromeTitle),
                    h("div", { className: RF.tw.headerSubtitle }, chromeSubtitle)),
                h(Badge, { variant: "outline", className: RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(capsuleTone)) }, chromeCapsule)),
            h("nav", { className: RF.tw.stagebar, "aria-label": t('title') },
                RF.STAGE_STEPS.map((step, index) => {
                    const tone = index === currentIndex ? 'current' : passedIndex.indexOf(index) >= 0 ? 'passed' : 'upcoming';
                    return (h("button", { key: step, type: "button", className: RF.cn(RF.tw.stageStep, RF.stageStepClass(tone)), title: t(`stage.go.${step}`), onClick: () => goStageStep(step) },
                        h("span", { className: RF.cn('stage-dot', RF.tw.stageDot) }),
                        h("span", { className: "stage-label" }, t(`stage.${step}`))));
                }),
                h("span", { className: RF.tw.stageCount }, t('stage.count', { current: currentIndex + 1 }))),
            inFlow
                ? null
                : (h("div", { className: RF.tw.tabs, role: "tablist" }, RF.WORKBENCH_TABS.map(tab => (h("button", { key: tab.id, type: "button", role: "tab", "aria-selected": tab.id === activeTab ? 'true' : 'false', className: RF.cn(RF.tw.tabItem, tab.id === activeTab && RF.tw.tabItemActive), onClick: () => goTab(tab.id) }, t(`tab.${tab.labelKey}`)))))),
            h("div", { className: RF.tw.scroll },
                render({ t, project, state, width }),
                chromeDisabled && chromeHintKey !== undefined
                    ? (h("div", { className: RF.tw.noteWarn }, t(chromeHintKey)))
                    : null),
            h("footer", { className: RF.tw.footer },
                h("div", { className: RF.tw.footerText },
                    h("div", { className: RF.tw.footerLabel }, chromeLabel),
                    h("div", { className: RF.tw.footerValue }, chromeValue)),
                h(Button, { type: "button", variant: "default", size: "lg", className: "h-10 font-semibold", disabled: chromeDisabled, title: chromeDisabled && chromeHintKey !== undefined ? t(chromeHintKey) : undefined, onClick: () => runChromeAction() }, t(chromeAction.key)))));
    };
})(RF);

/* ── src/client/chatRows/index.jsx ───────────────────────────── */
"use strict";
/* ─────────────────────────────────────────────────────────────────────────────
 * 7 类对话消息行的视图（注册在 `conversation.chat.node`，键为事件定义的 kind）。
 *
 * 形态约定（§2.4）：
 *   progress / chapters / storyboard **默认折叠**（折叠态是默认视图）；
 *   plan 行可在对话内直接改 kind × 位置（**不烧钱，不走 ask**）；
 *   changelog 行的回滚**走 ask**（由宿主的 `ask` 机制承担，插件只发起请求）。
 * ─────────────────────────────────────────────────────────────────────────── */
;
(function (RF) {
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
        return (h("div", { className: RF.tw.chatrow },
            h("div", { className: RF.tw.chatrowHead },
                h("span", { className: RF.tw.chatrowKind }, props.kind),
                h("span", { className: RF.tw.chatrowTitle }, props.title),
                h("button", { type: "button", className: RF.tw.chatrowToggle, "aria-expanded": open ? 'true' : 'false', onClick: () => setOpen(value => !value) }, open ? RF.chatRows.t('chat.collapse') : RF.chatRows.t('chat.expand'))),
            h("div", { className: RF.tw.chatrowBody }, open ? props.children : props.summary)));
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
            children: (h("div", null,
                h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.stage'), value: stage }),
                h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.chapter'), value: String(data.chapter ?? '') }),
                h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.shot'), value: String(data.shot ?? '') }),
                h(RF.ui.MetaRow, { label: RF.chatRows.t('chat.progress.elapsed'), value: String(data.elapsed ?? '') }))),
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
            children: (h("div", null, chapters.map(chapter => (h("div", { key: chapter.id, className: RF.tw.row },
                h("div", { className: RF.tw.rowMain },
                    h("div", { className: RF.tw.rowTitle }, chapter.title ?? ''),
                    h("div", { className: RF.tw.rowSub }, `${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
                h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass(chapter.tone ?? 'queued')) }, RF.labelOf('chapter.status', chapter.status, RF.chatRows.t))))))),
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
            children: (h("div", null, shots.map(shot => (h("div", { key: shot.id, className: RF.tw.row },
                h("div", { className: RF.tw.rowMain },
                    h("div", { className: RF.tw.rowTitle }, shot.label ?? shot.id),
                    h("div", { className: RF.tw.rowSub }, `${RF.formatDuration(shot.duration ?? 0)} · ${shot.dialogue ?? ''}`)),
                h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass(shot.tone ?? 'queued')) }, RF.labelOf('shot.status', shot.status, RF.chatRows.t))))))),
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
        return (h("div", { className: RF.tw.chatrow },
            h("div", { className: RF.tw.chatrowHead },
                h("span", { className: RF.tw.chatrowKind }, "reelforge-plan"),
                h("span", { className: RF.tw.chatrowTitle }, RF.chatRows.t('chat.plan'))),
            h("div", { className: RF.tw.chatrowBody },
                h("div", { className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowTitle }, RF.chatRows.t('chat.summary.plan', { kind: data.kind ?? '', position: data.position ?? '' })),
                        h("div", { className: RF.tw.rowSub }, data.provider ?? ''))),
                h("div", { className: RF.tw.row }, candidates.map(candidate => {
                    const selected = candidate.kind === data.kind && candidate.position === data.position;
                    return (h(Button, { key: `${candidate.kind}-${candidate.position}`, type: "button", variant: selected ? 'default' : 'secondary', size: selected ? 'lg' : 'sm', className: selected ? 'h-10 font-semibold' : 'h-7 text-[10px]', onClick: () => patch(candidate.kind, candidate.position) }, candidate.label ?? `${candidate.kind} · ${candidate.position}`));
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
        return (h("div", { className: RF.tw.chatrow },
            h("div", { className: RF.tw.chatrowHead },
                h("span", { className: RF.tw.chatrowKind }, "reelforge-assets"),
                h("span", { className: RF.tw.chatrowTitle }, RF.chatRows.t('chat.assets'))),
            h("div", { className: RF.tw.chatrowBody }, assets.map(asset => (h("div", { key: asset.id, className: RF.tw.row },
                h("div", { className: RF.tw.rowMain },
                    h("div", { className: RF.tw.rowTitle }, asset.name ?? ''),
                    h("div", { className: RF.tw.rowSub }, asset.description ?? '')),
                h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('queued')) }, RF.labelOf('asset.category', asset.category, RF.chatRows.t))))))));
    };
    /**
     * 成片行：播放器 + 交付物列表，可单章下载。
     * @param {object} props - 插槽 props。
     * @returns {object} React 元素。
     */
    RF.chatRowDeliver = function chatRowDeliver(props) {
        const data = dataOf(props);
        const chapters = Array.isArray(data.chapters) ? data.chapters : [];
        return (h("div", { className: RF.tw.chatrow },
            h("div", { className: RF.tw.chatrowHead },
                h("span", { className: RF.tw.chatrowKind }, "reelforge-deliver"),
                h("span", { className: RF.tw.chatrowTitle }, RF.chatRows.t('chat.deliver'))),
            h("div", { className: RF.tw.chatrowBody }, chapters.map(chapter => {
                const deliverables = Array.isArray(chapter.deliverables) ? chapter.deliverables : [];
                const videoPath = deliverables.find(d => typeof d.path === 'string' && d.path.endsWith('.mp4'))?.path ?? '';
                return (h("div", { key: chapter.id },
                    h("div", { className: RF.tw.rowTitle }, chapter.title ?? ''),
                    h("div", { className: RF.tw.rowSub }, `${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`),
                    deliverables.map(item => (h("div", { key: `${item.kind}-${item.path}`, className: RF.tw.row },
                        h("div", { className: RF.tw.rowMain },
                            h("div", { className: RF.tw.rowSub }, `${item.label ?? item.kind} · ${RF.formatBytes(item.bytes ?? 0)}`)),
                        item.path
                            ? (h("a", { className: "inline-flex h-7 items-center rounded-md bg-secondary px-2.5 text-[10px] text-muted-foreground no-underline", href: RF.deliverableUrl(item.path), download: item.label ?? item.kind }, RF.chatRows.t('common.download')))
                            : (h(Button, { type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]" }, RF.chatRows.t('common.download')))))),
                    videoPath === '' ? null : (h("video", { className: `block object-contain`, controls: true, preload: "metadata", src: RF.deliverableUrl(videoPath) }))));
            }))));
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
            if (latest === null)
                return null;
            if (mode === 'batch')
                return { mode, batchId: latest.batchId };
            if (mode === 'timepoint')
                return { mode, at: latest.at };
            return { mode, entryId: latest.id };
        };
        return (h("div", { className: RF.tw.chatrow },
            h("div", { className: RF.tw.chatrowHead },
                h("span", { className: RF.tw.chatrowKind }, "reelforge-changelog"),
                h("span", { className: RF.tw.chatrowTitle }, RF.chatRows.t('chat.changelog'))),
            h("div", { className: RF.tw.chatrowBody },
                h("div", { className: RF.tw.row }, modes.map(mode => (h(Button, { key: mode, type: "button", variant: "secondary", size: "sm", className: "h-7 text-[10px]", onClick: () => {
                        const args = rollbackArgs(mode);
                        if (args === null)
                            return;
                        RF.actions?.callTool?.(RF.TOOL_IDS.rollback, args);
                    } }, RF.chatRows.t(`log.${mode}`))))),
                entries.map(entry => (h("div", { key: entry.id, className: RF.tw.row },
                    h("div", { className: RF.tw.rowMain },
                        h("div", { className: RF.tw.rowSub }, entry.at ?? ''),
                        h("div", { className: RF.tw.rowTitle }, entry.summary ?? '')),
                    entry.drifted === true ? (h(Badge, { variant: "outline", className: RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('failed')) }, RF.chatRows.t('log.drifted'))) : null))))));
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

/* ── src/client/entry.jsx ───────────────────────────── */
"use strict";
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
;
(function (RF) {
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
        return h("span", null, t('title'));
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
            if (ctx === undefined || ctx === null)
                return { delivered: false, reason: 'no-remote' };
            const sessionId = RF.currentSessionId;
            if (sessionId === undefined || sessionId === '')
                return { delivered: false, reason: 'no-session' };
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
                    outcome.then((result) => {
                        if (result !== null && typeof result === 'object' && result.ok === false) {
                            RF.actions.reportRefused(request, result.error?.message ?? '');
                        }
                    }, (error) => { RF.actions.reportRefused(request, String(error)); });
                }
                return { delivered: true, reason: 'session-prompt' };
            }
            catch (error) {
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
                }
                else {
                    remaining.push({ ...entry, attempts: (entry.attempts ?? 0) + 1 });
                }
            }
            // 原地改写，保留数组身份（UI 可能已经持有引用）。
            RF.actions.pending.length = 0;
            for (const entry of remaining)
                RF.actions.pending.push(entry);
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
            }
            catch (error) {
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
        if (typeof listener !== 'function')
            return () => undefined;
        RF.actions.listeners.push(listener);
        return () => {
            const index = RF.actions.listeners.indexOf(listener);
            if (index >= 0)
                RF.actions.listeners.splice(index, 1);
        };
    };
    /**
     * 注入插件自有样式（只用 `--dsw-alias-*` token）。
     * @returns {function} 清理函数。
     */
    RF.injectStyles = function injectStyles() {
        if (typeof document === 'undefined')
            return () => { };
        const tag = document.createElement('style');
        tag.dataset.plugin = RF.TAB_TYPE_ID;
        tag.dataset.pluginCss = `${RF.TAB_TYPE_ID}/workbench.css`;
        tag.textContent = RF.TAILWIND_STYLES ?? RF.STYLES ?? '';
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


    // shadcn 原语：页签/流程 JSX 编译成 h(Button, …)，与 RF.Button 同一引用。
    var Button = RF.Button;
    var Input = RF.Input;
    var Label = RF.Label;
    var Card = RF.Card;
    var Badge = RF.Badge;
    var Progress = RF.Progress;
    var Alert = RF.Alert;
    var AlertDescription = RF.AlertDescription;
    var cn = RF.cn;

    // ⚠️ `inject` 不能少：宿主把模块导出当对象插件传给 Loader，
    // 不声明宿主服务，客户端整条 fiber 会失败（cordis 的 inject 守卫）。
    return { inject: RF.CLIENT_INJECT, apply: RF.apply };
  },
});
