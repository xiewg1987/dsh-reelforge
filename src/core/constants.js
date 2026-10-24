/**
 * ReelForge 唯一枚举来源（冻结契约 F8）。
 *
 * 纪律：工作流映射表、写入校验、界面下拉三处**都从这里取**，任何文件都不得再写一份枚举。
 * 判定规则（`nameMatches` 等）同样只在这里定义。
 *
 * 沿用 infinite-creation `lib/shared/index.js` 的纪律：纯数据、无运行时依赖、可单测。
 *
 * ⚠️ 三处**不要"修好"**的地方（这是上游的真实行为，不是 bug）：
 *   1. `VIDEO_RESOLUTION_OPTIONS` 里**没有** `1080P` / `2K` / `4K` —— 它们能存、能用，
 *      但不在下拉里。界面下拉必须照此。
 *   2. `nameMatches` 用**规范化后精确相等**，不是 `includes`；`textMentions` 才做长名覆盖。
 *   3. `HW_DEFAULT_FREE` 里 amd 默认为 3、nvidia 为 0。
 */

// ─────────────────────────────────────────────────────────────
// 身份与宿主契约（F1 / F2）
// ─────────────────────────────────────────────────────────────

/** 包名。三处必须完全相等：package.json.name / cordis.patch.yml 的 name / client.js 的 id。 */
export const PACKAGE_NAME = '@local/reelforge';

/**
 * 右栏 Tab 的 **kind**。
 * ⚠️ R8：右栏持久化的是 kind，**一经发布不可改名** —— 改名会让老用户已打开的 Tab
 * 全部变成「这类内容还没有可用的查看方式」。TAB_ID 可改，kind 不可改。
 */
export const TAB_KIND = 'reelforge-workbench';

/**
 * Tab **类型**的 id（`ctx.sidebarRightTabs.register({ id })` 的 id）。
 * 插槽 `sidebar.right.pane.tab` 的注册键用的是 **definition.id**，不是 kind。
 * 另：可选的第二个 Tab（历史运行与成本记录）。
 */
export const TAB_TYPE_ID = PACKAGE_NAME;
export const RUNS_TAB_KIND = 'reelforge-runs';

/**
 * 宿主投影里 ReelForge 视图的键。
 *
 * 宿主 `ctx.sessionProjections` 按 key 发布客户端可见视图；浏览器半
 * `ctx.sessions.list.getSnapshot().projectionsBySession[id].values[key]` 按同一个 key 读。
 * 宿主半与客户端半各有一份镜像（`src/client/manifest.js` 的 `RF.PROJECTION_KEY`），
 * 由单测逐项比对——改这里必须同时改那边。
 */
export const PROJECTION_KEY = 'reelforge/project';

// ─────────────────────────────────────────────────────────────
// 工具 id（冻结契约 F4）
// ─────────────────────────────────────────────────────────────

/** 注册给 DSH 模型的 12 个工具 + 2 个只读技能工具。签名定死后只填实现，不改 id、不加参数。 */
export const TOOL_IDS = Object.freeze({
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
});

/**
 * 触发类工具：会烧钱、占显存、覆盖既有产物 → **必须走宿主的 `ask` 人工授权**（R4）。
 * 判定只能看这张表，不许在调用点临时写布尔。
 */
export const TRIGGER_TOOL_IDS = Object.freeze([
  TOOL_IDS.runStage,
  TOOL_IDS.regenerateShot,
  TOOL_IDS.assembleChapter,
  TOOL_IDS.rollback,
]);

/**
 * 工作台在浏览器半直接发起工具调用时用的指令前缀。
 *
 * 宿主客户端没有「直接执行工具」的公开 API（见 `src/client/entry.js` 的说明），
 * 所以 UI 写操作被翻译成一句会话指令交给模型去调对应工具。这句话走的是
 * **与用户输入完全相同**的 `kind: 'user'` 通道 —— 不排除掉，用户点一下按钮，
 * 工作台的「对话输入」区就被工具调用日志刷掉了。
 *
 * 前缀冻结在常量里（客户端拼句子、宿主半识别），两边不许各写一份。
 */
export const TOOL_CALL_PROMPT_PREFIX = '请调用工具 ';

// ─────────────────────────────────────────────────────────────
// 资产（§6.4）
// ─────────────────────────────────────────────────────────────

/** 10 类资产。 */
export const ASSET_CATEGORIES = Object.freeze([
  'character',
  'scene',
  'prop',
  'costume',
  'age',
  'voice',
  'music',
  'sfx',
  'video',
  'other',
]);

/** 变体类：必须带 `parent_id` 指向角色，缺则拒绝写入。 */
export const VARIANT_ASSET_CATEGORIES = Object.freeze(['costume', 'age']);

/** 资产的产物字段：只有渲染阶段可写（F3）。 */
export const ASSET_PRODUCT_FIELDS = Object.freeze(['image_path', 'voice_ref']);

/** 资产的内容字段：模型与外部可写。 */
export const ASSET_CONTENT_FIELDS = Object.freeze([
  'id',
  'category',
  'name',
  'description',
  'parent_id',
  'tags',
]);

// ─────────────────────────────────────────────────────────────
// 上下文三键（§6.3）
// ─────────────────────────────────────────────────────────────

/** 只有这三个键，多写一个 → 报错，不静默丢弃。 */
export const CONTEXT_KEYS = Object.freeze(['bible', 'style', 'continuity']);

/** 注入顺序 = 数组顺序。 */
export const CONTEXT_INJECTION_ORDER = Object.freeze(['bible', 'style', 'continuity']);

/** 注入标题固定三个，生成时拼进提示词，标题不能自创。 */
export const CONTEXT_INJECTION_TITLES = Object.freeze({
  bible: '【人物圣经（一致性锚点，后续所有生成必须遵守）】',
  style: '【风格指南（统一画风/光线/色调）】',
  continuity: '【连续性记录】',
});

/** `bible` 必须包含的章节名——场景站位表。 */
export const BIBLE_STANDING_TABLE_HEADING = '场景站位表';

// ─────────────────────────────────────────────────────────────
// 状态枚举
// ─────────────────────────────────────────────────────────────

export const SHOT_STATUS = Object.freeze({
  pending: 'pending',
  generating: 'generating',
  done: 'done',
  failed: 'failed',
});

export const JOB_STATUS = Object.freeze({
  running: 'running',
  done: 'done',
  failed: 'failed',
  interrupted: 'interrupted',
});

export const JOB_TYPES = Object.freeze(['create', 'regenerate', 'import_workflow']);

export const SKILL_SOURCES = Object.freeze(['bundled', 'installed', 'generated']);

// ─────────────────────────────────────────────────────────────
// 生成层：五种 kind（§8.1）
// ─────────────────────────────────────────────────────────────

/**
 * 五种生成 kind。**kind 与「跑在哪」是正交的两维**——
 * 同一批 kind 在本地与云端都跑得起来，差异在跑在哪、计不计费、受什么约束。
 */
export const GENERATION_KINDS = Object.freeze(['t2i', 'i2i', 'r2v', 'tts', 'music']);

/** 执行位置（运行位置）。 */
export const RUN_POSITIONS = Object.freeze(['local', 'cloud']);

/** 云端 provider：三个并列，不是笼统的「云端」。 */
export const CLOUD_PROVIDERS = Object.freeze(['runninghub', 'online-api', 'dsh']);

/** 本地 ComfyUI provider。 */
export const COMFY_PROVIDERS = Object.freeze(['native', 'runninghub']);

/** RunningHub 档位。 */
export const RUNNINGHUB_TIERS = Object.freeze(['standard', 'plus']);

/** 硬件预设。 */
export const HW_MODES = Object.freeze(['nvidia', 'amd']);

/** 默认释放计数（上游真实取值，不要对称化）。 */
export const HW_DEFAULT_FREE = Object.freeze({ nvidia: 0, amd: 3 });

/** ComfyUI-Kernel 版本门槛：低于判坏。image 必须不带 ck attention，video 建议带。 */
export const CK_MIN_VERSION = '0.2.36';

/** 显存门槛（GB）：含 video 阶段 8GB，否则 4GB。低于门槛**直接拒不拆批**。 */
export const VRAM_GATE_GB = Object.freeze({ video: 8, other: 4 });

/** 并发上限。 */
export const CONCURRENCY = Object.freeze({ video: 1, runninghub: 1, image: 2 });

/** 排队等待上限：超过这个时长就不再干等，直接报错（避免一条任务永远卡住）。 */
export const QUEUE_WAIT_LIMIT_MS = 120 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// 阶段模型（冻结契约 F7）
// ─────────────────────────────────────────────────────────────

/** 四阶段，固定顺序串行。 */
export const STAGES = Object.freeze(['llm', 'image', 'tts', 'video']);

/** video 硬依赖 image（缺参考图直接报错），软依赖 tts（缺失时降质但必须说出来）。 */
export const STAGE_DEPENDENCIES = Object.freeze({
  llm: Object.freeze({ hard: [], soft: [] }),
  image: Object.freeze({ hard: [], soft: [] }),
  tts: Object.freeze({ hard: [], soft: [] }),
  video: Object.freeze({ hard: ['image'], soft: ['tts'] }),
});

/** 界面进度条 6 步（与 §10.2 / 设计稿 StageBar 一致）。 */
export const STAGE_STEPS = Object.freeze([
  'requirement',
  'run',
  'plan',
  'generate',
  'storyboard',
  'deliver',
]);

export const STAGE_STEP_LABELS = Object.freeze({
  requirement: '需求',
  run: '运行',
  plan: '方案',
  generate: '生成',
  storyboard: '分镜',
  deliver: '交付',
});

/** 阶段与进度条的映射：跑到哪个阶段 = 走到第几步。 */
export const STAGE_TO_STEP = Object.freeze({
  llm: 'generate',
  image: 'generate',
  tts: 'generate',
  video: 'generate',
});

/**
 * 项目视图的 7 个页签（RF7 §6.4「Tab 条固定 7 项」）。
 *
 * 顺序 = 评审稿 §6.4 与画板索引 §八给的顺序：
 * **枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志**。
 *
 * ⚠️ 与旧版（v4/v6）的差别有两处，都是 RF7 改的：
 *   1. **「章节」进 Tab**（旧版没有，章节是 v6 的引导屏）；
 *   2. **「技能」出 Tab**（旧版在 Tab 里，RF7 把「技能与工作流」改成**流程屏**）。
 *
 * 「技能」是 `FLOW_SCREENS.skills`，不是页签。
 */
export const WORKBENCH_TABS = Object.freeze([
  Object.freeze({ id: 'hub', labelKey: 'hub' }),
  Object.freeze({ id: 'chapters', labelKey: 'chapters' }),
  Object.freeze({ id: 'assets', labelKey: 'assets' }),
  Object.freeze({ id: 'shots', labelKey: 'shots' }),
  Object.freeze({ id: 'context', labelKey: 'context' }),
  Object.freeze({ id: 'output', labelKey: 'output' }),
  Object.freeze({ id: 'log', labelKey: 'log' }),
]);

/**
 * 流程屏（RF7 的 8 块「流程屏」形态画板）—— **项目视图之外**的独立屏。
 *
 * ## 为什么是「两层」而不是 15 个页签
 *
 * RF7 画板索引 §八把 18 块板分成三类：
 *
 * - **流程屏**（无 Tab 条）：一次性动作或跨步决策 ——
 *   RunGate · Intake · Stages · ShotDetail · Music · Skills · Settings · ProjectSettings；
 * - **Tab 屏**（固定 7 项 Tab）：Hub · Chapters · Assets · Storyboard · Context · Output · Log；
 * - **规范板**：ChatRows · Degraded · Picker。
 *
 * 流程屏的骨架只有 4 条（Header / StageRail / Scroll / Footer），**没有页签条** ——
 * 它们按用户操作流程串成一条链，不是并排的分类。
 */
export const FLOW_SCREENS = Object.freeze([
  'runGate',         // 01 启动检查（环境门 · 冷启动首屏）
  'settings',        // 14 服务配置（ComfyUI / LLM / 运行时 / 生成维护）
  'intake',          // 02 新建项目（小说 → 自动拆章）
  'projectSettings', // 15 项目设置（成片规格 / 字幕 / 声音 / 危险操作）
  'stages',          // 06 生成执行（四阶段进度 + 勾选）
  'shotDetail',      // 08 分镜详情（单镜展开）
  'music',           // 09 背景音乐（生成 / 试听 / 应用）
  'skills',          // 13 技能与工作流（**从旧版页签移到这里**）
]);

/**
 * 规范板（RF7 画板索引 §八第三类）—— **不是主流程的一环**，是规则层。
 *
 * - `degraded`：失败与降级（阻塞 / 警告 / 缺料 / 空态 / 软降级五态）；
 * - `picker`：素材选择器（右栏内嵌弹窗形态）。
 *
 * 它们仍然可以被导航到（RunGate 的「查看失败清单」、素材卡的「选择参考图」），
 * 所以也进 `FLOW_SCREEN_STEPS` / `STAGE_STEP_TARGETS` 的体系。
 */
export const SPEC_SCREENS = Object.freeze([
  'degraded',
  'picker',
]);

/**
 * 每块流程屏 / 规范板归在 6 步进度条的哪一步 —— **与 RF7 画板索引逐块一致**。
 *
 * 需求 1/6：Intake · ProjectSettings（· Chapters 既是 Tab 也是需求步的骨架页）
 * 运行 2/6：RunGate · Settings
 * 生成 4/6：Stages · Skills（· Assets / Context / Log 是 Tab）
 * 分镜 5/6：ShotDetail
 * 交付 6/6：Music
 */
export const FLOW_SCREEN_STEPS = Object.freeze({
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
});

/**
 * 6 步进度条每一步点下去落到哪一屏。
 *
 * - 需求 → 流程屏「新建项目」；
 * - 运行 → 流程屏「启动检查」（环境门，冷启动首屏）；
 * - 方案 → **页签「章节」**（见下方说明）；
 * - 生成 → 流程屏「生成执行」；
 * - 分镜 → 页签「分镜」（列表；单镜详情从列表进去）；
 * - 交付 → 页签「成片」。
 *
 * ## ⚠️ 「方案」这一步没有自己的画板
 *
 * RF7 的 18 块板里**没有 Plan 板**（旧的 v4 05 号板「执行路径」被 RF7 撤掉了：
 * 执行位置 local/cloud 并进 RunGate 屏，执行 kind 由工具 `reelforge.update_plan` 写）。
 * 但 6 步轨里「方案」这一步还在（画板索引 §八明写 6 步）——
 * ⇒ 这一步落到**页签「章节」**：那块的副标题就是「先骨架 · 再逐章生成」，
 * 是 RF7 里唯一还承担「方案 / 骨架规划」职责的画板。
 *
 * 这是**按画板推出来的落点，不是设计稿明写的**，属待 owner 确认项。
 */
export const STAGE_STEP_TARGETS = Object.freeze({
  requirement: Object.freeze({ kind: 'flow', screen: 'intake' }),
  run: Object.freeze({ kind: 'flow', screen: 'runGate' }),
  plan: Object.freeze({ kind: 'tab', tab: 'chapters' }),
  generate: Object.freeze({ kind: 'flow', screen: 'stages' }),
  storyboard: Object.freeze({ kind: 'tab', tab: 'shots' }),
  deliver: Object.freeze({ kind: 'tab', tab: 'output' }),
});

// ─────────────────────────────────────────────────────────────
// 视频参数（§6.1、§7.2）
// ─────────────────────────────────────────────────────────────

/** 分辨率 → 百万像素数。 */
export const VIDEO_RESOLUTION_MP = Object.freeze({
  '360P': 0.25,
  '480P': 0.5,
  '720P': 1,
  '768P': 1,
  '1080P': 2,
  '2K': 2,
  '4K': 4,
});

/**
 * 分辨率**下拉选项**。
 * ⚠️ `1080P` / `2K` / `4K` **能存、能用，但不在下拉里** —— 上游真实行为，不要"修好"。
 */
export const VIDEO_RESOLUTION_OPTIONS = Object.freeze(['360P', '480P', '720P', '768P', 'custom']);

/** 8 种画幅。9:16 是**成片画幅**，不是 UI 形态。 */
export const VIDEO_ASPECT_RATIOS = Object.freeze([
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '21:9',
]);

/**
 * 画幅 → ComfyUI 枚举标签的**翻译表**（`roles.aspect_ratio.map`）。
 *
 * ⚠️ 这不是新枚举：它把 {@link VIDEO_ASPECT_RATIOS} 的取值翻译成 ComfyUI 节点认识的字符串。
 * 键集必须与 `VIDEO_ASPECT_RATIOS` **完全相等**——F8 的一致性锚点，单测盯着，漂移即红。
 */
export const ASPECT_RATIO_LABELS = Object.freeze({
  '1:1': '1:1 (Square)',
  '2:3': '2:3 (Portrait)',
  '3:2': '3:2 (Landscape)',
  '3:4': '3:4 (Portrait)',
  '4:3': '4:3 (Landscape)',
  '9:16': '9:16 (Portrait Widescreen)',
  '16:9': '16:9 (Landscape Widescreen)',
  '21:9': '21:9 (Cinematic Widescreen)',
});

export const VIDEO_DIM_MIN = 64;
export const VIDEO_DIM_MAX = 4096;

/** 镜头时长硬约束（秒）。 */
export const SHOT_DURATION_MIN = 1;
export const SHOT_DURATION_MAX = 15;
export const SHOT_DURATION_DEFAULT = 5;

/** 对白速度上限：字/秒。 */
export const SHOT_DIALOGUE_MAX_RATE = 5.5;

/** 每镜说话人上限。 */
export const MAX_SPEAKERS_PER_SHOT = 2;

/** 拆章兜底：每章字数。 */
export const FALLBACK_CHAPTER_CHARS = 6000;

/** 章节标题正则：第N章/节/回/卷/集/部/篇 或 chapter N。 */
export const CHAPTER_HEADING_RE = /第\s*\d+\s*[章节回卷集部篇]|chapter\s+\d+/i;

/**
 * 行首匹配形态：章节标题必须独占一行（可带前后空白）。
 * 与 {@link CHAPTER_HEADING_RE} 配合使用，先按行切开再判定，避免正文里出现的
 * 「第三章提到的那件事」被误判成标题。
 */
export const CHAPTER_HEADING_LINE_RE = /^[ \t]*[^\n]*$/gm;

/** 章节标题去空白后用于消歧。 */
export const CHAPTER_HEADING_NORMALIZE_RE = /[\s　]+/g;

// ─────────────────────────────────────────────────────────────
// 参考素材（§7.4）
// ─────────────────────────────────────────────────────────────

/** 参考顺序：人物图 → 场景图 → 道具图 → 人物语音。 */
export const REFERENCE_ORDER = Object.freeze(['character', 'scene', 'prop', 'voice']);

/** 角色参考图优先级：服装 > 年龄变体 > 角色原图。独立维度，不叠加。 */
export const CHARACTER_REFERENCE_PRIORITY = Object.freeze(['costume', 'age', 'character']);

/** 参考数量上限。 */
export const REFERENCE_LIMITS = Object.freeze({ images: 9, audios: 3, videos: 3 });

/** 参考标签格式。 */
export const REFERENCE_TAG_FORMATS = Object.freeze({
  character: '{name}（人物形象）',
  costume: '{name}（服装名）',
  scene: '{name}（场景背景）',
  prop: '{name}（道具）',
  voice: '{name}（音色）',
});

/** 提示词里的参考占位符。改写提示词时必须原样保留。 */
export const REF_PLACEHOLDER_RE = /__MINIMAX_H3_REF_\d+__/g;

/** 提示词改写最多尝试次数。 */
export const PROMPT_REWRITE_MAX_ATTEMPTS = 2;

// ─────────────────────────────────────────────────────────────
// 写入门禁白名单（冻结契约 F3，§6.5）
// ─────────────────────────────────────────────────────────────

/** 分镜层。 */
export const SHOT_CONTENT_FIELDS = Object.freeze([
  'chapter',
  'scene_name',
  'shot_size',
  'camera',
  'visual',
  'dialogue',
  'narration',
  'sub_shots',
  'resolution',
  'aspect_ratio',
  'video_prompt',
  'character_ids',
  'scene_ids',
  'prop_ids',
  'costume_ids',
  'age_ids',
  'audio_ids',
  'references',
  'idx',
  'duration',
  'provenance',
]);

export const SHOT_PRODUCT_FIELDS = Object.freeze([
  'status',
  'error',
  'video_path',
  'video_prompt_used',
  'prompt_id',
  'seed',
]);

/** 章节层。 */
export const CHAPTER_CONTENT_FIELDS = Object.freeze(['title', 'novel', 'script']);

export const CHAPTER_PRODUCT_FIELDS = Object.freeze([
  'seq',
  'status',
  'music_path',
  'music_prompt',
  'music_prompt_used',
]);

/** 项目层。 */
export const PROJECT_CONTENT_FIELDS = Object.freeze([
  'name',
  'novel',
  'idea',
  'style',
  'video_resolution',
  'video_aspect_ratio',
  'video_width',
  'video_height',
  'target_duration',
  'enable_bgm',
  'enable_subtitles',
]);

export const PROJECT_PRODUCT_FIELDS = Object.freeze(['status', 'context']);

// ─────────────────────────────────────────────────────────────
// 技能引擎（§8.2）
// ─────────────────────────────────────────────────────────────

/** 技能正文与参考文件的截断上限（字符）。 */
export const SKILL_MAX_CONTENT_CHARS = 120000;

/** 参考文件索引里的预览字数。 */
export const SKILL_REFERENCE_PREVIEW_CHARS = 160;

/** 技能名禁止出现的字符/片段（防 `path.join` 逃出技能目录）。 */
export const SKILL_NAME_FORBIDDEN = Object.freeze(['/', '\\', ':', '.', '..']);

/** 参考文件只允许这两种扩展名，且按文件名**精确匹配**。 */
export const SKILL_REFERENCE_EXTENSIONS = Object.freeze(['.md', '.txt']);

/** 中文技能正文优先。 */
export const SKILL_CN_FILENAME = 'SKILL.cn.md';
export const SKILL_EN_FILENAME = 'SKILL.md';

/** 总流水线技能（无条件注入为「当前工作模式技能」）。 */
export const NOVEL_TO_VIDEO_SKILL = 'novel-to-video';

// ─────────────────────────────────────────────────────────────
// 对话消息行（§10.3）
// ─────────────────────────────────────────────────────────────

/** 7 类结构化消息行。视图注册在 `conversation.chat.node` 插槽，键为事件定义的 kind。 */
export const CHAT_ROW_KINDS = Object.freeze([
  'reelforge-progress',
  'reelforge-chapters',
  'reelforge-storyboard',
  'reelforge-plan',
  'reelforge-assets',
  'reelforge-deliver',
  'reelforge-changelog',
]);

/** 默认折叠的消息行（折叠态是默认视图）。 */
export const CHAT_ROW_COLLAPSIBLE = Object.freeze([
  'reelforge-progress',
  'reelforge-chapters',
  'reelforge-storyboard',
]);

// ─────────────────────────────────────────────────────────────
// 交付物（§9.2）
// ─────────────────────────────────────────────────────────────

/** 按章组织的交付物种类。 */
export const DELIVERABLE_KINDS = Object.freeze([
  'video_subtitled',
  'video_clean',
  'srt',
  'storyboard_html',
  'storyboard_image',
  'reference_pack',
  'assets',
  'music_library',
]);

/** 交付物文件名模板（章节序号 NN）。 */
export const DELIVERABLE_FILENAMES = Object.freeze({
  video_subtitled: 'ch{NN}_带字幕.mp4',
  video_clean: 'ch{NN}.mp4',
  srt: 'ch{NN}.srt',
  storyboard_html: 'ch{NN}_分镜表.html',
  storyboard_image: 'ch{NN}_分镜表.jpg',
  reference_pack: 'ch{NN}_参考图包.zip',
});

/**
 * 七种降级（§9.3）。每一种都有明确的产出形态与话术。
 * 「宁可交付不完整但诚实的结果，也不用占位物假装成功。」
 */
export const DEGRADE_KINDS = Object.freeze({
  videoProviderDown: 'video_provider_down',
  imageProviderDown: 'image_provider_down',
  voiceMissing: 'voice_missing',
  ffmpegMissing: 'ffmpeg_missing',
  partialShotFailed: 'partial_shot_failed',
  vramInsufficient: 'vram_insufficient',
  modelChannelUnreachable: 'model_channel_unreachable',
});

/** 三级回滚模式（§6.6）。 */
export const ROLLBACK_MODES = Object.freeze(['single', 'batch', 'timepoint']);

/**
 * 变更日志投影里保留的条目条数上限。
 *
 * 变更日志**文件**可以一直长，但投影状态是要被宿主持久化的（每次工具结果都带一份），
 * 不设上限的话长会话会把状态撑大。超出后保留**最新**的这些条，
 * 并在 wire view 里带上 `total`（真实总数）——**不静默丢**：界面能说清「只显示最近 N 条」。
 */
export const CHANGELOG_VIEW_LIMIT = 500;

/** 技能正文预览的字符数（wire view 只带预览，不带整篇正文）。 */
export const SKILL_BODY_PREVIEW_CHARS = 400;

// ─────────────────────────────────────────────────────────────
// 体积上限
// ─────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

export const UPLOAD_MAX_BYTES = Object.freeze({
  image: 20 * MB,
  audio: 100 * MB,
  video: 500 * MB,
});

export const REFERENCE_IMAGE_MAX_BYTES = 10 * MB;
export const SKILL_ZIP_MAX_BYTES = 20 * MB;

// ─────────────────────────────────────────────────────────────
// 匹配规则（唯一实现，禁 includes）
// ─────────────────────────────────────────────────────────────

/**
 * 规范化名称：剥离括号内的身份后缀 + 去空白 + 转小写。
 *
 * 括号剥离是 §7.4 ④ 的明写要求：「小明（少年）」仍与「小明」相等。
 * 不剥离的话，包含匹配会把「小明（少年）」当成另一个角色，
 * 用 `includes` 匹配则会把「明」误判成「小明」——**错挂他人音色**。
 */
export function normalizeName(value) {
  return String(value ?? '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(CHAPTER_HEADING_NORMALIZE_RE, '')
    .toLowerCase();
}

/**
 * 名称匹配：**规范化后精确相等**，不是 `includes`。
 * 用 `includes` 会让「林岸」命中「林岸的船」，产生静默错配。
 */
export function nameMatches(a, b) {
  return normalizeName(a) === normalizeName(b);
}

/**
 * 文本提及：`text` 里提到 `name`。
 * 排除「更长的名字覆盖了更短的名字」的情况——短名命中时若存在更长的匹配名，
 * 视为未提及（避免「林岸」被「林岸的船」覆盖掉）。
 */
export function textMentions(text, name) {
  const haystack = String(text ?? '');
  const needle = normalizeName(name);
  if (!needle) return false;
  if (!haystack.includes(needle)) return false;
  for (const other of haystack.split(/[\s　,，。.!！?？;；:：、/\\]+/)) {
    const candidate = normalizeName(other);
    if (candidate.length > needle.length && candidate.includes(needle)) {
      // 存在更长的完整词覆盖了它 → 本条按未提及处理
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────

/** 判断字段是否在内容字段白名单内。 */
export function isContentField(field, layer) {
  const table = {
    shot: SHOT_CONTENT_FIELDS,
    chapter: CHAPTER_CONTENT_FIELDS,
    project: PROJECT_CONTENT_FIELDS,
  }[layer];
  return Array.isArray(table) && table.includes(field);
}

/** 判断字段是否在产物字段白名单内。 */
export function isProductField(field, layer) {
  const table = {
    shot: SHOT_PRODUCT_FIELDS,
    chapter: CHAPTER_PRODUCT_FIELDS,
    project: PROJECT_PRODUCT_FIELDS,
    asset: ASSET_PRODUCT_FIELDS,
  }[layer];
  return Array.isArray(table) && table.includes(field);
}

/** 工具是否属于触发类（走 `ask`）。 */
export function isTriggerTool(toolId) {
  return TRIGGER_TOOL_IDS.includes(toolId);
}
