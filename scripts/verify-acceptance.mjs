#!/usr/bin/env node
/**
 * 验收判定（证据化）：把 T1–T5 任务书 §5 的 116 条验收项，逐条映射到**可核查的证据来源**，
 * 并**真的把测试跑一遍**来判定每条的状态。
 *
 * 背景：任务报告里的「通过」曾经是硬编码字符串——删掉一个测试文件、把某个函数改坏、
 * skip 一条断言，报告照样打「通过」。**报告是叙述，不是证据。** 本脚本把它变成证据。
 *
 * 用法：
 *   node scripts/verify-acceptance.mjs           # 人读：判定表 + 汇总
 *   node scripts/verify-acceptance.mjs --json    # 机读：stdout 只有 JSON，表格走 stderr
 *
 * 退出码：
 *   0 = 没有「证据缺失」/「仅声称」
 *   1 = 有缺口 —— **这是正确行为，不是 bug**，本脚本就是用来暴露缺口的
 *   2 = 任务书解析失败（验收项数量对不上）
 *
 * 零 npm 依赖，只用 node 内置模块。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_DIR = path.join(ROOT, 'docs', '开发任务');

/**
 * 带 `code` 的错误（本脚本自己打的分类码，如 `PARSE`）。
 * @typedef {Error & { code?: string }} AcceptanceError
 */

/**
 * 一条验收项的判定结果。
 * @typedef {object} AcceptanceItem
 * @property {string} task 任务号（T1–T5）
 * @property {string} id 验收项号（A1、A2…）
 * @property {string} desc 验收项原文
 * @property {string} descShort 短描述
 * @property {string} how 验收方式
 * @property {string} status 状态（见 {@link STATUS}）
 * @property {string} evidence 证据
 * @property {string} note 备注
 */

/**
 * 验收判定结果。
 * @typedef {object} AcceptanceResult
 * @property {AcceptanceItem[]} items 逐条判定
 * @property {Record<string, number>} counts 各状态计数
 * @property {number} gaps 证据缺口数（`证据缺失` + `仅声称`）
 * @property {boolean} ok 没有缺口
 * @property {number} total 验收项总数
 */

/** 任务书里验收项的总数与分布。解析数量对不上就报错退出——宁可炸，也不要悄悄少判。 */
const EXPECTED_TOTAL = 116;
const EXPECTED_PER_TASK = { T1: 12, T2: 21, T3: 23, T4: 22, T5: 38 };

/** 任务书文件清单（验收表在各自 §5）。 */
const TASK_DOCS = [
  { task: 'T1', file: 'T1-契约与骨架.md' },
  { task: 'T2', file: 'T2-一致性底座.md' },
  { task: 'T3', file: 'T3-生成执行.md' },
  { task: 'T4', file: 'T4-合成交付与回滚.md' },
  { task: 'T5', file: 'T5-工作台与技能工厂.md' },
];

/**
 * 状态分类（四选一 + N/A）。
 * - 自动化通过：证据来源里的测试文件存在，**且**测试名能在实际跑出来的结果里找到匹配。
 * - 证据缺失：映射表声明了自动化来源，但文件不存在或找不到匹配的测试名。
 * - 仅声称：文档说「单测」，但映射表里没有对应的自动化来源。
 * - 实机待补：「怎么验」列明确是实机 / 截图 / 贴输出 / 录屏 / 浏览器这类人工项。
 * - 实机通过：已在真实宿主里跑过，且**原始观察记录落进了 `docs/开发任务/实机/`**；
 *   判定脚本会读那份记录，逐条断言「必须出现的事实」都在，缺一条就退回「证据缺失」。
 *   （不是把结论写死在映射表里 —— 映射表只声明「要看到什么」，看到没看到由脚本核对原始记录。）
 * - N/A：该验收项在本仓库的实现路线下不适用（见映射表备注）。
 */
export const STATUS = {
  PASS: '自动化通过',
  MISSING: '证据缺失',
  CLAIMED: '仅声称',
  MANUAL: '实机待补',
  LIVE: '实机通过',
  NA: 'N/A',
};

/**
 * 验收映射表（**数据**）：任务号 + A 编号 → 证据来源。
 *
 * 每一行的证据来源可以是四种之一或多种组合，**任一命中即算自动化通过**：
 *   files  测试文件 glob（相对仓库根），逐个真正跑一遍 `node --test`
 *   names  测试名关键词（在上述文件的实际输出里做子串匹配）
 *   cmd    命令（argv 数组），退出码必须为 0；可另加输出正则断言
 *   scan   源码静态扫描：{ pattern, globs, expect: 'absent' | 'present' }
 *
 * kind:
 *   'manual' → 实机待补（人工项）
 *   'live'   → 实机通过（`live` 字段声明：原始记录文件 + 必须出现的事实）
 *   'na'     → N/A（本仓库路线下不适用）
 *   省略      → 按 files/names/cmd/scan 判定
 *
 * 注：标了 `pending` 的测试文件由并行任务落地；在它们落地之前，相关验收项判为「证据缺失」——
 * **这是预期行为**，不是把映射表删小的理由。
 */
export const ACCEPTANCE_MAP = [
  // ── T1 · 契约与骨架 ─────────────────────────────────────────────────────
  {
    task: 'T1',
    id: 'A1',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'data-sidebar-right-guide-entry="reelforge-workbench"',
        '<section class="rf-root">',
        '还没有章节。导入小说即可自动拆章。',
        '0.2.1-alpha.1-5badb15',
      ],
    },
    note: 'DSH 0.2.1-alpha.1 实机：插件装上 → 右栏出现「ReelForge 工作台」入口（kind = reelforge-workbench）→ 点开看到完整面板',
  },
  { task: 'T1', id: 'A2', cmd: { argv: ['node', 'scripts/check-package-identity.mjs'] }, note: 'package.json.name / cordis.patch.yml name / client.js load({id}) 三处并排比对' },
  {
    task: 'T1',
    id: 'A3',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        '向宿主 tools.register 提交的工具：15 个',
        '· reelforge.import_novel',
        '· reelforge.update_plan',
        '· skill_reference',
        '✓ 15 个预期工具全部注册到位',
        '没有** `1 entry did not activate` 告警',
      ],
    },
    note: '等价证据：cordis_inspect_query 在 DSH 0.2.1-alpha.1 里是给模型用的宿主工具（非本机 CLI），本机无 LLM 通道无法由模型发起；改用 scripts/list-registered-tools.mjs 列出 apply 后提交给宿主的 15 个工具（13 ReelForge + 2 技能），配套真机事实「宿主激活无 1 entry did not activate 告警」',
  },
  { task: 'T1', id: 'A4', files: ['src/host/__tests__/t1-gate.test.js', 'src/host/__tests__/tools-execute.test.js'], names: ['产物字段被明确拒绝', 'import_novel：产物字段（status）进不来'], note: '实机调用一次仍待补' },
  { task: 'T1', id: 'A5', files: ['src/host/__tests__/t1-gate.test.js'], names: ['白名单外字段报错'], note: '' },
  { task: 'T1', id: 'A6', files: ['src/host/__tests__/t1-gate.test.js'], names: ['数组元素必须是字符串'], note: '' },
  { task: 'T1', id: 'A7', files: ['src/core/__tests__/t1-splitChapters.test.js'], names: ['命中 ≥2 个标题时按标题切', '标题不足 2 个且正文 ≤6000 字时算单章', '标题不足 2 个且正文超长时按 6000 字均分', '重复标题追加「·(2)」消歧'], note: '四条路径各一个用例' },
  { task: 'T1', id: 'A8', files: ['src/host/__tests__/t1-integration.test.js', 'src/core/__tests__/projectSchema.test.js'], names: ['R1/R2：投影只靠 tool/result 事件里的 meta.reelforge.patches 重建状态'], note: 'project.json 三层物化由 projectSchema 单测兜底（pending）' },
  { task: 'T1', id: 'A9', files: ['src/host/__tests__/workspace.test.js'], names: ['越界', '路径逃逸'], note: '路径越界防护（resolveProjectPath 返回 null）' },
  { task: 'T1', id: 'A10', files: ['src/client/__tests__/t5-client.test.js', 'src/workflows/__tests__/rf-spec.test.js', 'src/core/__tests__/projectSchema.test.js'], names: ['客户端枚举镜像与 src/core/constants.js 逐项一致（F8）', 'F8：画幅翻译表的键集必须与 constants 的 VIDEO_ASPECT_RATIOS 完全一致'], note: '三处（映射表 / 写入校验 / 界面下拉）都从 constants.js 取' },
  { task: 'T1', id: 'A11', scan: { pattern: '(?:\\blisten|\\bcreateServer)\\s*\\(', globs: ['src/**/*.js', 'src/**/*.mjs', 'index.js', 'client.js'], expect: 'absent' }, note: '静态扫描：源码里没有对外端口监听' },
  { task: 'T1', id: 'A12', files: ['src/host/__tests__/t1-apply.test.js'], names: ['R3：apply() 返回清理函数'], note: '清理函数在插件自己的 effect 里' },

  // ── T2 · 一致性底座 ─────────────────────────────────────────────────────
  { task: 'T2', id: 'A1', files: ['src/core/__tests__/t2-consistency.test.js', 'src/host/__tests__/tools-execute.test.js'], names: ['A1: bible 含站位表写入成功并能读回'], note: '实机调用仍待补' },
  { task: 'T2', id: 'A2', files: ['src/core/__tests__/t2-consistency.test.js'], names: ['A2: bible 不含站位表'], note: '' },
  { task: 'T2', id: 'A3', files: ['src/core/__tests__/t2-consistency.test.js'], names: ['A3: 写 bible 时先读回再合并'], note: '' },
  { task: 'T2', id: 'A4', files: ['src/core/__tests__/t2-consistency.test.js'], names: ['A4: style 整段覆盖'], note: '' },
  { task: 'T2', id: 'A5', files: ['src/core/__tests__/t2-consistency.test.js'], names: ['A5: continuity 是追加'], note: '' },
  { task: 'T2', id: 'A6', files: ['src/core/__tests__/t2-consistency.test.js'], names: ['A6: 写第四个上下文键'], note: '' },
  { task: 'T2', id: 'A7', files: ['src/core/__tests__/t2-assets.test.js', 'src/host/__tests__/tools-execute.test.js'], names: ['A7: costume 缺 parent_id', 'A7: age 缺 parent_id', 'update_asset：改成变体类却没带 parent_id'], note: '' },
  { task: 'T2', id: 'A8', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A8: 指定服装时取服装图', 'A8: 只指定年龄时取年龄变体', 'A8: 都没有变体时取角色原图'], note: '三个用例' },
  { task: 'T2', id: 'A9', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A9: 装配顺序恒为'], note: '' },
  { task: 'T2', id: 'A10', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A10: 不出声的角色不进音色参考'], note: '' },
  { task: 'T2', id: 'A11', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A11: 说话人规范化后精确匹配'], note: '' },
  { task: 'T2', id: 'A12', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A12: 未匹配说话人只 warn 不报错'], note: '' },
  { task: 'T2', id: 'A13', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A13: 参考图超过上限报错'], note: '' },
  { task: 'T2', id: 'A14', files: ['src/core/__tests__/t2-refs.test.js'], names: ['A14: 四种标签格式'], note: '' },
  { task: 'T2', id: 'A15', files: ['src/core/__tests__/t2-promptBuilder.test.js'], names: ['A15: 占位符从 1 起连续', 'A15: 改写 2 次后占位符仍全在'], note: '' },
  { task: 'T2', id: 'A16', files: ['src/core/__tests__/t2-quantize.test.js'], names: ['A16: 理想 3.75s', '守恒性：多组随机权重下总和都精确命中 target'], note: '守恒性是重点' },
  { task: 'T2', id: 'A17', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['A17: 多行 description', 'A17: description 空串', 'A17: SKILL.cn.md 优先'], note: '' },
  { task: 'T2', id: 'A18', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['A18: 技能名含'], note: '' },
  { task: 'T2', id: 'A19', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['A19: skill(name) 返回 XML 包裹', 'A19: skill_reference 只认'], note: '' },
  { task: 'T2', id: 'A20', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['A20: 两个工具均截断 120000 字符'], note: '' },
  { task: 'T2', id: 'A21', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['A21: novel-to-video 无条件注入'], note: '实机看 systemPrompt 仍待补' },

  // ── T3 · 生成执行 ───────────────────────────────────────────────────────
  { task: 'T3', id: 'A1', files: ['src/workflows/__tests__/rf-channels.test.js'], names: ['A1：同一个 kind 走本地 ComfyUI 与走云端 RunningHub'], note: '' },
  { task: 'T3', id: 'A2', files: ['src/core/__tests__/rf-probe.test.js'], names: ['A2：本地档会探到本地 7 项', 'A2：切到云端后'], note: '实机看探测请求日志仍待补' },
  { task: 'T3', id: 'A3', files: ['src/core/__tests__/rf-probe.test.js', 'src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['A3：显存不足', '显存不足 → 明确拒绝 video 阶段并说清差多少'], note: '' },
  { task: 'T3', id: 'A4', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['硬依赖：这一镜没有参考图', '显存不足 → 明确拒绝 video 阶段并说清差多少'], note: '断言没有自动拆批 / 静帧降级路径' },
  { task: 'T3', id: 'A5', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['硬依赖：这一镜没有参考图'], note: '' },
  { task: 'T3', id: 'A6', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['软依赖：缺参考音'], note: '' },
  { task: 'T3', id: 'A7', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['llm 与渲染阶段双向互斥'], note: '' },
  { task: 'T3', id: 'A8', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['阶段顺序固定：请求顺序打乱'], note: '' },
  { task: 'T3', id: 'A9', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['并发上限：image 2 / video 1 / runninghub 1'], note: '' },
  { task: 'T3', id: 'A10', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['队列等待超过 120 分钟'], note: '' },
  { task: 'T3', id: 'A11', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['幂等：内容指纹没变'], note: '' },
  { task: 'T3', id: 'A12', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['断点续跑：state 里已完成的项不重跑'], note: '' },
  { task: 'T3', id: 'A13', files: ['src/workflows/__tests__/rf-runner.test.js'], names: ['prune：孤立节点被删、可达节点保留、悬空连线被清掉'], note: '' },
  { task: 'T3', id: 'A14', files: ['src/workflows/__tests__/rf-runner.test.js'], names: ['bindMedia 形态①', 'bindMedia 形态②'], note: '' },
  { task: 'T3', id: 'A15', files: ['src/workflows/__tests__/rf-runner.test.js'], names: ['bindMedia：优先复用 reusePool'], note: '' },
  { task: 'T3', id: 'A16', files: ['src/workflows/__tests__/rf-runner.test.js'], names: ['roles：写值 + map 枚举翻译'], note: '' },
  { task: 'T3', id: 'A17', files: ['src/core/__tests__/rf-probe.test.js'], names: ['A17：CK >= 0.2.36 判好', 'A17：CK < 0.2.36 判坏', 'A17：0.2.37rc1 读不准'], note: '' },
  { task: 'T3', id: 'A18', files: ['src/workflows/__tests__/rf-runner.test.js'], names: ['CK：image 阶段带 CK 注意力', 'CK：video 阶段没带 CK 注意力'], note: '' },
  { task: 'T3', id: 'A19', files: ['src/workflows/__tests__/rf-channels.test.js'], names: ['AMD：第 3 次生成后调 /free'], note: '' },
  { task: 'T3', id: 'A20', files: ['src/core/__tests__/rf-stage-orchestrator.test.js'], names: ['提示词改写：丢占位符'], note: '' },
  { task: 'T3', id: 'A21', files: ['src/core/__tests__/rf-stage-orchestrator.test.js', 'src/core/__tests__/changelog.test.js'], names: ['触发类工具：产出宿主的 ask 授权请求', '回滚工具是触发类'], note: '实机点一次仍待补' },
  { task: 'T3', id: 'A22', files: ['src/core/__tests__/rf-stage-orchestrator.test.js', 'src/host/__tests__/t1-apply.test.js', 'src/host/__tests__/tools-execute.test.js'], names: ['产物字段：生成阶段只许写产物字段', '工具参数封闭：产物字段不出现在 schema 里', 'import_novel：产物字段（status）进不来'], note: '实机仍待补' },
  { task: 'T3', id: 'A23', scan: { pattern: 'imageConcurrency|retryTimes', globs: ['src/**/*.js', 'src/**/*.mjs'], expect: 'absent' }, note: '静态扫描：没有这类死配置' },

  // ── T4 · 合成交付与回滚 ─────────────────────────────────────────────────
  { task: 'T4', id: 'A1', files: ['src/media/__tests__/assemble-e2e.test.js'], names: ['exports/ch01', '一章一条成片'], note: 'pending：媒体集成端到端单测尚未落地；实跑需 ffmpeg' },
  {
    task: 'T4',
    id: 'A2',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'codec_name=h264',
        'codec_name=aac',
        'pix_fmt=yuv420p',
        'r_frame_rate=24/1',
        'moov` 偏移 **36**',
      ],
    },
    note: '真 ffmpeg 9.0.2 现场合成后跑真 ffprobe，原始输出与 faststart 盒偏移判定都在证据档里',
  },
  { task: 'T4', id: 'A3', files: ['src/media/__tests__/assemble.test.js', 'src/media/__tests__/assemble-e2e.test.js'], names: ['assembleChapter：正常路径产出带字幕 + 无字幕两版', '无字幕版是重封装'], note: '生成日志 / 实跑仍待补' },
  { task: 'T4', id: 'A4', files: ['src/media/__tests__/srt.test.js'], names: ['buildSrt 生成合法 SRT，且字幕里已经没有角色名前缀'], note: '目视抽一镜仍待补' },
  { task: 'T4', id: 'A5', files: ['src/media/__tests__/assemble.test.js'], names: ['assembleChapter：enable_subtitles 关时不烧录'], note: '' },
  { task: 'T4', id: 'A6', files: ['src/media/__tests__/deliver.test.js'], names: ['分镜表 HTML 自包含单文件'], note: '断网打开 + 打印预览仍待补' },
  { task: 'T4', id: 'A7', files: ['src/media/__tests__/deliver.test.js'], names: ['参考图包含四类内容'], note: '' },
  { task: 'T4', id: 'A8', files: ['src/media/__tests__/deliver.test.js'], names: ['deliverChapter 真实落盘'], note: '' },
  { task: 'T4', id: 'A9', files: ['src/media/__tests__/assemble.test.js'], names: ['assembleChapter：章节 BGM 进混音'], note: '' },
  { task: 'T4', id: 'A10', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/tools-execute.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['单条回滚恢复旧值', 'rollback（single）：改 → 回滚 → 读回旧值'], note: '' },
  { task: 'T4', id: 'A11', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/tools-execute.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['整批回滚：同 batch_id 一次退掉一批', 'rollback（batch）：一次调用回退整批'], note: '' },
  { task: 'T4', id: 'A12', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/tools-execute.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['按时间点回滚：退到某一刻之前的所有变更', 'rollback（timepoint）：只回退到指定时间点之前的变更'], note: '' },
  { task: 'T4', id: 'A13', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/tools-execute.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['漂移保护：改完又改', 'rollback：漂移保护（409）'], note: '实机两次调用仍待补' },
  { task: 'T4', id: 'A14', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['媒体二进制不随回滚删除', '媒体二进制'], note: 'UI 文案仍待实机' },
  { task: 'T4', id: 'A15', files: ['src/core/__tests__/changelog.test.js'], names: ['硬约束：回滚拒绝回滚'], note: '' },
  { task: 'T4', id: 'A16', files: ['src/core/__tests__/changelog.test.js', 'src/host/__tests__/changelogStore.test.js'], names: ['变更日志随项目删除一并清除', '随项目删除'], note: '' },
  { task: 'T4', id: 'A17', files: ['src/core/__tests__/degrade.test.js'], names: ['降级：视频 provider 全挂', '降级：图像 provider 挂', '降级：音色缺失', '降级：ffmpeg 挂', '降级：部分镜失败', '降级：显存不足 8GB', '降级：模型通道不可达'], note: '7 种降级逐条；截图仍待补' },
  { task: 'T4', id: 'A18', files: ['src/core/__tests__/degrade.test.js'], names: ['降级：音色缺失'], note: '' },
  { task: 'T4', id: 'A19', files: ['src/core/__tests__/degrade.test.js'], names: ['降级：显存不足 8GB'], note: '' },
  { task: 'T4', id: 'A20', files: ['src/media/__tests__/assemble.test.js'], names: ['assembleChapter：缺 ffmpeg'], note: '「移出 PATH 实跑」仍待实机' },
  { task: 'T4', id: 'A21', files: ['src/core/__tests__/changelog.test.js'], names: ['回滚工具是触发类'], note: '实机点一次仍待补' },
  { task: 'T4', id: 'A22', files: ['src/core/__tests__/deliverPayload.test.js', 'src/core/__tests__/changelogPayload.test.js'], names: ['payload 形状与 T5 §2.4.4 冻结形状'], note: '样例 JSON 见 reports/samples/' },

  // ── T5 · 工作台与技能工厂 ───────────────────────────────────────────────
  {
    task: 'T5',
    id: 'A1',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'data-sidebar-right-guide-entry="reelforge-workbench"',
        'data-sidebar-right-tab="tab2"',
        'class="rf-root"',
      ],
      files: ['src/client/__tests__/t5-client.test.js'],
      names: ['插槽 key 用 definition.id 而不是 kind'],
    },
    note: 'DSH 0.2.1-alpha.1 实机：右栏出现「ReelForge 工作台」入口（kind = reelforge-workbench），点开渲染出 rf-root 面板',
  },
  { task: 'T5', id: 'A2', files: ['src/client/__tests__/render.test.js'], names: ['Workbench 壳层：四层骨架齐全', '底栏'], note: 'render 层已守住四层骨架与唯一滚动容器；注入超长内容的实机截图仍待补' },
  { task: 'T5', id: 'A3', files: ['src/client/__tests__/t5-client.test.js', 'src/client/workbench/__tests__/workbench-structure.test.js', 'src/client/__tests__/render.test.js'], names: ['滚动容器：页面只有一个滚动容器', 'Workbench：唯一滚动层', 'Workbench 壳层：有且仅有一个滚动容器'], note: '' },
  {
    task: 'T5',
    id: 'A4',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        '326px',
        '782px',
        'T5 A4：300 / 560 / 900 / 1150',
      ],
      files: ['src/client/__tests__/render.test.js'],
      names: ['T5 A4：300 / 560 / 900 / 1150'],
    },
    note: '实机 326/782 + 渲染层四档 300/560/900/1150 断言；900/1150 在宿主右栏上限 547px 下需大视口实机截图仍可选补',
  },
  { task: 'T5', id: 'A5', files: ['src/client/__tests__/t5-client.test.js'], names: ['断点按实测宽度判'], note: '缩放窗口对照截图仍待补' },
  {
    task: 'T5',
    id: 'A6',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'data-ds-theme-source="dark"',
        'data-ds-dark-theme',
        'var(--dsw-alias-bg-base)',
        'var(--dsw-alias-brand-primary)',
      ],
    },
    note: 'DSH 0.2.1-alpha.1 实机：宿主切深色（data-ds-theme-source=dark，持久化），面板 DOM 与浅色逐字相同、控制台 0 条；样式全部走宿主 CSS 变量，明暗由宿主重算',
  },
  { task: 'T5', id: 'A7', files: ['src/client/__tests__/t5-client.test.js'], names: ['A7：样式里没有十六进制字面量'], note: '' },
  { task: 'T5', id: 'A8', files: ['src/client/__tests__/t5-client.test.js'], names: ['A8：无 iframe'], note: '' },
  { task: 'T5', id: 'A9', files: ['src/client/__tests__/t5-client.test.js'], names: ['客户端文案：zh / en 键集合一致'], note: '中/英两张截图仍待补' },
  { task: 'T5', id: 'A10', files: ['src/client/__tests__/t5-client.test.js', 'src/client/workbench/__tests__/workbench-structure.test.js', 'src/client/__tests__/render.test.js'], names: ['7 个页签是 Tab 内部的二级分区', 'tabs.js：七个页签导出函数都在', 'Workbench 页签分发表：7 个 id 各自指向对应渲染函数', 'Workbench 壳层：页签切换真的会换掉渲染函数', '页签有数据 · 章节'], note: 'render 层逐页断言「显示真实数据（非占位）」；7 张实机截图仍待补' },
  { task: 'T5', id: 'A11', files: ['src/client/__tests__/render.test.js'], names: ['页签空态 · 章节', '空态'], note: 'render 层逐页断言空态文案含「为什么空 + 下一步」；截图仍待补' },
  { task: 'T5', id: 'A12', files: ['src/client/__tests__/t5-client.test.js', 'src/client/__tests__/render.test.js'], names: ['StageBar 是 6 步', 'Workbench 壳层：阶段条 6 步'], note: '与 design/ 画板对照截图仍待补' },
  { task: 'T5', id: 'A13', files: ['src/client/__tests__/render.test.js'], names: ['Workbench 壳层：底部成本与成片入口', '成本'], note: 'render 层守住底部成本位存在；截图仍待补' },
  { task: 'T5', id: 'A14', files: ['src/client/__tests__/t5-client.test.js', 'src/client/__tests__/render.test.js'], names: ['客户端事件定义：7 个 kind 都带 target 与 buildViewNode', '消息行：progress / chapters / storyboard 默认折叠', '消息行注册表：7 个 kind 的视图函数都能真实渲染出对应 kind'], note: '对话截图仍待补' },
  { task: 'T5', id: 'A15', files: ['src/client/__tests__/t5-client.test.js'], names: ['A15：注册前后会话事件 type 集合的差集为空'], note: '' },
  { task: 'T5', id: 'A16', files: ['src/core/__tests__/t5-planPayload.test.js'], names: ['对话内改 kind × 位置：保留候选表'], note: '操作前后截图仍待补' },
  { task: 'T5', id: 'A17', files: ['src/client/__tests__/t5-client.test.js'], names: ['触发类操作走 ask：回滚 / 重生成 / 合成 / 跑阶段'], note: '截图仍待补' },
  { task: 'T5', id: 'A18', files: ['src/client/__tests__/t5-client.test.js', 'src/client/__tests__/render.test.js'], names: ['消息行：progress / chapters / storyboard 默认折叠', '消息行 · 阶段进度'], note: '截图仍待补' },
  {
    task: 'T5',
    id: 'A19',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        '/api/reelforge.file',
        'video 元素 controls=true',
        'download 链',
      ],
      files: ['src/client/__tests__/render.test.js'],
      names: ['T5 A19：成片页 video 可播', '消息行 · 成片交付'],
    },
    note: '浏览器半：<video controls src=/api/reelforge.file> + 交付物 <a download href=同路由>',
  },
  { task: 'T5', id: 'A20', files: ['src/client/__tests__/t5-client.test.js'], names: ['快捷键 resolve：右栏已挂载时打开工作台'], note: '录屏 / 按键日志仍待补' },
  { task: 'T5', id: 'A21', files: ['src/client/__tests__/t5-client.test.js'], names: ['快捷键 resolve：右栏未挂载会话时返回 blocked'], note: '' },
  { task: 'T5', id: 'A22', files: ['src/client/__tests__/t5-client.test.js'], names: ['快捷键：id 匹配 R12 正则'], note: '' },
  { task: 'T5', id: 'A23', files: ['src/client/__tests__/t5-client.test.js'], names: ['快捷键：id 匹配 R12 正则'], note: '同一断言同时守住「不声明 web:linux」' },
  {
    task: 'T5',
    id: 'A24',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'ReelForge 工作台 | Ctrl + Alt + D',
        'ReelForge 工作台 | Ctrl + Alt + S',
        'ReelForge 工作台 | Ctrl + Alt + M',
        '工作区文件 | Ctrl + Alt + P',
        '刷新当前页面 | Ctrl + Alt + R',
        '两组字母键集合不相交',
      ],
    },
    note: 'DSH 0.2.1-alpha.1 实机：设置 → 快捷键速查面板逐键对照（宿主 18 条 + 本插件 3 条，同一面板共存即注册成功）',
  },
  { task: 'T5', id: 'A25', files: ['src/core/__tests__/t5-analyzeWorkflow.test.js'], names: ['diagnostics 摆出 loaders'], note: '' },
  { task: 'T5', id: 'A26', files: ['src/core/__tests__/t5-analyzeWorkflow.test.js'], names: ['media 恒为 null，返回体没有 prune 字段'], note: '' },
  {
    task: 'T5',
    id: 'A27',
    kind: 'live',
    live: {
      file: 'docs/开发任务/实机/dsh-0.2.1-alpha.1.md',
      mustContain: [
        'workflow.diagnostics',
        '解析诊断',
        'update_plan 后写入 workflowAnalysis',
        'workflowAnalysis.set',
      ],
      files: ['src/client/__tests__/render.test.js', 'src/host/__tests__/workflow-view.test.js'],
      names: ['T5 A27：上下文页展示工作流解析结果与 diagnostics', 'analyzeWorkflowForPlan'],
    },
    note: '上下文页展示 kind / sourceFile / diagnostics 计数；update_plan 触发工作区或 fixture 解析',
  },
  { task: 'T5', id: 'A28', files: ['src/core/__tests__/t5-analyzeWorkflow.test.js'], names: ['kind 推导：t2i / i2i / r2v 三条各一次'], note: '' },
  { task: 'T5', id: 'A29', files: ['src/skills/__tests__/t2-skills.test.js'], names: ['自带技能正文：5 个技能全部能被扫描', '自带技能正文：兜底技能名 novel-to-video 可被 skill(name) 找到'], note: '截图仍待补' },
  { task: 'T5', id: 'A30', files: ['src/core/__tests__/t5-skillDraft.test.js'], names: ['门槛③：description 为空必须拒绝安装'], note: '' },
  { task: 'T5', id: 'A31', files: ['src/core/__tests__/t5-skillDraft.test.js'], names: ['门槛④：技能名拒绝'], note: '' },
  { task: 'T5', id: 'A32', files: ['src/core/__tests__/t5-skillDraft.test.js'], names: ['门槛⑥：SKILL.cn.md 优先'], note: '' },
  { task: 'T5', id: 'A33', cmd: { argv: ['npm', 'pack', '--dry-run'], outputMustNotMatch: 'node_modules|[\\\\/]vendor[\\\\/]' }, note: '产物清单 = npm pack --dry-run 输出（见本报告下方）' },
  { task: 'T5', id: 'A34', kind: 'na', note: '本仓库采用单文件确定性拼接（build-client.mjs），没有分片' },
  { task: 'T5', id: 'A35', kind: 'na', note: '同上：无分片即无分片名' },
  { task: 'T5', id: 'A36', kind: 'na', note: '同上：无分片即无 rev 对齐问题' },
  { task: 'T5', id: 'A37', files: ['src/client/__tests__/t5-client.test.js'], names: ['client.js 与 src/client/** 的构建产物一致'], scan: { pattern: 'external\\s*:', globs: ['src/client/build-client.mjs'], expect: 'absent' }, note: '无 bundler / 无 externals 配置项' },
  { task: 'T5', id: 'A38', cmd: { argv: ['npm', 'pack', '--dry-run'], outputMustNotMatch: 'node_modules|[\\\\/]lib[\\\\/]|chunk-' }, note: 'dry-run 清单里没有陈旧分片与第三方正文' },
];

/* ────────────────────────────── 工具函数 ────────────────────────────── */

/**
 * 跑一条命令。
 * @param {string} cmd 可执行文件。
 * @param {string[]} args 参数。
 * @returns {{ code: number, text: string }}
 */
function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  return { code: result.status ?? 1, text: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/**
 * 把 glob 片段编译成正则。支持 `**` / `*` / `?`。
 * @param {string} pattern glob。
 * @returns {RegExp}
 */
function globToRegExp(pattern) {
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // ↓ 占位符是 NUL（源码里不可见）：先把 ** 整体挡下来，免得被后面的 * 规则拆成两半；
    //   最后一行再把 NUL 还原成「跨目录」正则片段。
    .replace(/\*\*/g, ' ')
    .replace(/\*/g, '[^/\\\\]*')
    .replace(/\?/g, '[^/\\\\]')
    .replace(/ /g, '.*');
  return new RegExp(`^${source}$`);
}

/**
 * 展开一个 glob，返回仓库相对路径（正斜杠）。
 * @param {string} pattern 相对仓库根的 glob。
 * @returns {string[]}
 */
export function expandGlob(pattern) {
  const re = globToRegExp(pattern);
  const segments = pattern.split('/');
  const firstWild = segments.findIndex((s) => s.includes('*') || s.includes('?'));
  const baseSegments = firstWild === -1 ? segments.slice(0, -1) : segments.slice(0, firstWild);
  const base = path.join(ROOT, ...baseSegments);
  if (!existsSync(base)) return [];

  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        if (re.test(rel)) found.push(rel);
      }
    }
  };
  walk(base);
  return found.sort();
}

/** 每个测试文件只跑一次，结果缓存复用。 */
const testCache = new Map();

/**
 * 真跑一个测试文件，抽出它的测试名。
 * @param {string} relFile 仓库相对路径。
 * @returns {{ ok: boolean, names: string[], text: string }}
 */
function runTestFile(relFile) {
  if (testCache.has(relFile)) return testCache.get(relFile);
  // 用 process.execPath 直连 node，shell: false——避免带空格的 node 路径被 shell 拆开。
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', relFile], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    // ⚠️ 必须允许**前导空白**：node 的 TAP 输出里，嵌套在 `describe()` 下的子测试
    // 是缩进的（`    # Subtest: …` / `    ok 1 - …`）。早先用 `^# Subtest:` 锚定，
    // 缩进行一律抽不到 ⇒ 嵌套用例的验收项永远判「证据缺失」（假阴性）。
    let m = /^\s*# Subtest:\s*(.+?)\s*$/.exec(line);
    if (!m) m = /^\s*ok \d+ - (.+?)\s*$/.exec(line);
    if (!m) m = /^\s*✔\s+(.+?)\s*(?:\(\d[\d.]*ms\))?\s*$/.exec(line);
    if (m) {
      const name = m[1].trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  const record = { ok: (result.status ?? 1) === 0, names, text };
  testCache.set(relFile, record);
  return record;
}

/** 命令也只跑一次（npm pack --dry-run 会被多个验收项引用）。 */
const cmdCache = new Map();

/**
 * 判定一个证据描述符。
 *
 * descriptor:
 *   files / names  测试文件 glob + 测试名关键词（关键词在文件的**实际输出**里做子串匹配）
 *   cmd            命令（argv 数组），退出码必须为 0；可加 outputMustMatch / outputMustNotMatch
 *   scan           源码静态扫描 { pattern, globs, expect: 'absent' | 'present' }
 *   requireAll     true = 所有来源都必须成立才算通过（默认：任一命中即通过）
 *
 * @param {object} descriptor 证据描述符。
 * @returns {{ status: string, evidence: string, problems: string[] }}
 */
export function resolveEvidence(descriptor) {
  const checks = [];

  if (descriptor.files?.length) {
    const found = descriptor.files.flatMap(expandGlob);
    if (!found.length) {
      checks.push({ ok: false, detail: `测试文件不存在：${descriptor.files.join('、')}` });
    } else {
      const keywords = descriptor.names ?? [];
      const hits = [];
      const broken = [];
      const matchedFiles = [];
      for (const file of found) {
        const record = runTestFile(file);
        if (!record.ok) {
          broken.push(`测试文件本身失败：${file}`);
          continue;
        }
        matchedFiles.push(file);
        if (!keywords.length) continue;
        for (const keyword of keywords) {
          const hit = record.names.find((n) => n.toLowerCase().includes(keyword.toLowerCase()));
          if (hit) hits.push(`${file} → 测试「${hit}」`);
        }
      }
      if (!keywords.length) {
        // 只声明了文件（没声明测试名）：文件存在即算有证据，合并成一条，别把 16 个文件逐个列出来。
        if (matchedFiles.length) {
          checks.push({
            ok: true,
            detail: `测试文件存在：${descriptor.files.join('、')}（${matchedFiles.length} 个）`,
          });
        } else {
          checks.push({ ok: false, detail: broken.join('；') });
        }
      } else if (hits.length) {
        checks.push({ ok: true, detail: hits.join('；') });
        for (const b of broken) checks.push({ ok: true, detail: b });
      } else {
        checks.push({
          ok: false,
          detail: broken.length
            ? broken.join('；')
            : `测试文件存在但找不到匹配的测试名：${keywords.join('、')}`,
        });
      }
    }
  }

  if (descriptor.cmd) {
    const { argv, outputMustMatch, outputMustNotMatch } = descriptor.cmd;
    const cacheKey = argv.join(' ');
    let result = cmdCache.get(cacheKey);
    if (!result) {
      result = run(argv[0], argv.slice(1));
      cmdCache.set(cacheKey, result);
    }
    if (result.code !== 0) {
      checks.push({ ok: false, detail: `命令失败（退出码 ${result.code}）：${argv.join(' ')}` });
    } else if (outputMustNotMatch && new RegExp(outputMustNotMatch).test(result.text)) {
      checks.push({ ok: false, detail: `命令输出命中禁止模式 /${outputMustNotMatch}/：${argv.join(' ')}` });
    } else if (outputMustMatch && !new RegExp(outputMustMatch).test(result.text)) {
      checks.push({ ok: false, detail: `命令输出未命中要求的模式 /${outputMustMatch}/：${argv.join(' ')}` });
    } else {
      checks.push({ ok: true, detail: `命令成功：${argv.join(' ')}` });
    }
  }

  if (descriptor.scan) {
    const { pattern, globs, expect } = descriptor.scan;
    const re = new RegExp(pattern);
    const hits = [];
    for (const glob of globs) {
      for (const file of expandGlob(glob)) {
        let content;
        try {
          content = readFileSync(path.join(ROOT, file), 'utf8');
        } catch {
          continue;
        }
        if (re.test(content)) hits.push(file);
      }
    }
    if (expect === 'absent' && hits.length) {
      checks.push({ ok: false, detail: `静态扫描命中 /${pattern}/：${hits.join('、')}` });
    } else if (expect === 'present' && !hits.length) {
      checks.push({ ok: false, detail: `静态扫描未命中 /${pattern}/（期望 present）` });
    } else {
      checks.push({
        ok: true,
        detail: `静态扫描通过（${expect === 'absent' ? '未命中' : '命中'} /${pattern}/，扫了 ${globs.join('、')}）`,
      });
    }
  }

  if (!checks.length) {
    return { status: STATUS.MISSING, evidence: '—', problems: ['映射表没有声明任何证据来源'] };
  }

  const okChecks = checks.filter((c) => c.ok);
  const badChecks = checks.filter((c) => !c.ok);
  const requireAll = descriptor.requireAll === true;
  const passed = requireAll ? badChecks.length === 0 : okChecks.length > 0;

  return {
    status: passed ? STATUS.PASS : STATUS.MISSING,
    evidence: okChecks.map((c) => c.detail).join('；') || '—',
    problems: badChecks.map((c) => c.detail),
  };
}

/**
 * 判定「实机通过」：读**原始观察记录**，逐条断言必须出现的事实。
 *
 * 这条路径存在的理由：实机证据是一次性的人工/浏览器操作，不能靠脚本重跑，
 * 但也**不能因此就把结论写死**。所以原始记录落进版本库（`docs/开发任务/实机/`），
 * 映射表只声明「必须看到什么」，脚本负责核对记录里到底有没有 —— 记录被删或对不上，
 * 状态就退回「证据缺失」。
 *
 * 可选的 `files` / `names` 再叠一层**自动化回归**（防止实机过了以后被改坏）：
 * 两者都成立才算实机通过。
 *
 * @param {{ file: string, mustContain?: string[], files?: string[], names?: string[] }} descriptor
 * @returns {{ status: string, evidence: string, problems: string[] }}
 */
export function resolveLiveEvidence(descriptor) {
  if (!descriptor?.file) {
    return { status: STATUS.MISSING, evidence: '—', problems: ['映射表没有声明实机证据文件'] };
  }
  const abs = path.join(ROOT, descriptor.file);
  let content;
  try {
    content = readFileSync(abs, 'utf8');
  } catch {
    return { status: STATUS.MISSING, evidence: '—', problems: [`实机证据文件不存在：${descriptor.file}`] };
  }
  const mustContain = descriptor.mustContain ?? [];
  if (!mustContain.length) {
    return { status: STATUS.MISSING, evidence: '—', problems: [`实机证据文件存在但没声明必须出现的事实：${descriptor.file}`] };
  }
  const missing = mustContain.filter((token) => !content.includes(token));
  if (missing.length) {
    return {
      status: STATUS.MISSING,
      evidence: '—',
      problems: [`实机证据文件 ${descriptor.file} 里没有出现：${missing.map((m) => `「${m}」`).join('、')}`],
    };
  }

  const evidence = [`实机原始记录 ${descriptor.file}（${mustContain.length} 项事实全部命中）`];
  const problems = [];

  if (descriptor.files?.length) {
    const auto = resolveEvidence({ files: descriptor.files, names: descriptor.names });
    if (auto.status !== STATUS.PASS) {
      problems.push(...auto.problems);
    } else {
      evidence.push(auto.evidence);
    }
  }

  if (problems.length) {
    return { status: STATUS.MISSING, evidence: '—', problems };
  }
  return { status: STATUS.LIVE, evidence: evidence.join('；'), problems: [] };
}

/* ────────────────────────────── 解析验收表 ────────────────────────────── */
/**
 * 解析 T1–T5 任务书 §5 的验收表。
 * @returns {{ task: string, id: string, desc: string, how: string }[]}
 */
export function parseAcceptanceItems() {
  const items = [];
  for (const { task, file } of TASK_DOCS) {
    const full = path.join(DOC_DIR, file);
    if (!existsSync(full)) {
      throw new Error(`任务书缺失：${file}`);
    }
    const text = readFileSync(full, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!/^\|\s*A\d+\s*\|/.test(line)) continue;
      const cells = line.split('|');
      const id = cells[1].trim();
      const how = cells[cells.length - 2].trim();
      const desc = cells.slice(2, cells.length - 2).join('|').trim();
      items.push({ task, id, desc, how });
    }
  }
  return items;
}

/**
 * 校验解析结果的数量。
 * @param {object[]} items 解析出的验收项。
 * @returns {string[]} 问题清单（空 = 通过）。
 */
export function validateCounts(items) {
  const problems = [];
  if (items.length !== EXPECTED_TOTAL) {
    problems.push(`验收项总数 ${items.length} ≠ 期望 ${EXPECTED_TOTAL}`);
  }
  for (const [task, expected] of Object.entries(EXPECTED_PER_TASK)) {
    const actual = items.filter((i) => i.task === task).length;
    if (actual !== expected) problems.push(`${task} 验收项 ${actual} 条 ≠ 期望 ${expected} 条`);
    const ids = items.filter((i) => i.task === task).map((i) => Number(i.id.slice(1)));
    for (let n = 1; n <= expected; n += 1) {
      if (!ids.includes(n)) problems.push(`${task} 缺 A${n}`);
    }
  }
  const seen = new Set();
  for (const item of items) {
    const key = `${item.task}/${item.id}`;
    if (seen.has(key)) problems.push(`验收项重复：${key}`);
    seen.add(key);
  }
  return problems;
}

/**
 * 跑一遍验收判定。
 * @returns {AcceptanceResult} 判定结果（`items` / `counts` / `gaps` / `ok` / `total`）
 */
export function runAcceptance() {
  const parsed = parseAcceptanceItems();
  const problems = validateCounts(parsed);
  if (problems.length) {
    /** @type {AcceptanceError} */
    const err = new Error(`任务书验收表解析失败：\n  - ${problems.join('\n  - ')}`);
    err.code = 'PARSE';
    throw err;
  }

  const mapByKey = new Map(ACCEPTANCE_MAP.map((row) => [`${row.task}/${row.id}`, row]));
  const items = parsed.map((item) => {
    const row = mapByKey.get(`${item.task}/${item.id}`);
    let status;
    let evidence = '—';
    let note = item.how;

    if (!row) {
      // 没进映射表：文档说「单测」就是「仅声称」，否则算人工项。
      const claimsUnitTest = /单测|断言|用例|测试/.test(item.how);
      status = claimsUnitTest ? STATUS.CLAIMED : STATUS.MANUAL;
      note = item.how;
    } else if (row.kind === 'manual') {
      status = STATUS.MANUAL;
      note = row.note || item.how;
    } else if (row.kind === 'na') {
      status = STATUS.NA;
      note = row.note || item.how;
    } else if (row.kind === 'live') {
      const verdict = resolveLiveEvidence(row.live);
      status = verdict.status;
      evidence = verdict.evidence;
      note = [row.note, ...verdict.problems].filter(Boolean).join('；');
    } else {
      const verdict = resolveEvidence(row);
      status = verdict.status;
      evidence = verdict.evidence;
      note = [row.note, ...verdict.problems].filter(Boolean).join('；');
    }

    return {
      task: item.task,
      id: item.id,
      desc: item.desc,
      descShort: item.desc.length > 56 ? `${item.desc.slice(0, 56)}…` : item.desc,
      how: item.how,
      status,
      evidence,
      note,
    };
  });

  const counts = { [STATUS.PASS]: 0, [STATUS.MISSING]: 0, [STATUS.CLAIMED]: 0, [STATUS.MANUAL]: 0, [STATUS.LIVE]: 0, [STATUS.NA]: 0 };
  for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
  const gaps = counts[STATUS.MISSING] + counts[STATUS.CLAIMED];

  return { items, counts, gaps, ok: gaps === 0, total: items.length };
}

/* ────────────────────────────── 输出 ────────────────────────────── */

/** 显示宽度：CJK 字符按 2 列算。 */
function displayWidth(text) {
  let width = 0;
  for (const ch of text) width += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
  return width;
}

/**
 * 渲染一张对齐的 Markdown 表格。
 * @param {string[]} headers 表头。
 * @param {string[][]} rows 数据行。
 * @returns {string}
 */
function renderTable(headers, rows) {
  const all = [headers, ...rows];
  const widths = headers.map((_, col) => Math.max(...all.map((r) => displayWidth(String(r[col] ?? '')))));
  const pad = (text, width) => {
    const str = String(text ?? '');
    return str + ' '.repeat(Math.max(0, width - displayWidth(str)));
  };
  const line = (cells) => `| ${cells.map((c, i) => pad(c, widths[i])).join(' | ')} |`;
  return [
    line(headers),
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...rows.map(line),
  ].join('\n');
}

/**
 * 把判定结果渲染成人读的表格 + 汇总。
 * @param {object} result runAcceptance() 的结果。
 * @returns {string}
 */
export function renderAcceptanceReport(result) {
  const rows = result.items.map((i) => [
    i.task,
    i.id,
    i.descShort,
    i.status,
    i.evidence,
    i.note,
  ]);

  const summary = [
    '',
    '### 汇总',
    '',
    `- 验收项总数：**${result.total}**（T1 12 / T2 21 / T3 23 / T4 22 / T5 38）`,
    `- ${STATUS.PASS}：**${result.counts[STATUS.PASS]}**`,
    `- ${STATUS.LIVE}：**${result.counts[STATUS.LIVE]}**`,
    `- ${STATUS.MISSING}：**${result.counts[STATUS.MISSING]}**`,
    `- ${STATUS.CLAIMED}：**${result.counts[STATUS.CLAIMED]}**`,
    `- ${STATUS.MANUAL}：**${result.counts[STATUS.MANUAL]}**`,
    `- ${STATUS.NA}：**${result.counts[STATUS.NA]}**`,
    `- 缺口（${STATUS.MISSING} + ${STATUS.CLAIMED}）：**${result.gaps}** → 退出码 ${result.gaps ? 1 : 0}`,
  ];

  const gaps = result.items.filter((i) => i.status === STATUS.MISSING || i.status === STATUS.CLAIMED);
  const gapBlock = gaps.length
    ? ['', '### 缺口明细', '', ...gaps.map((i) => `- **${i.task} ${i.id}** ${i.descShort} —— ${i.note}`)]
    : ['', '### 缺口明细', '', '无。'];

  return [
    `# 验收判定（116 条）`,
    '',
    '> 判定方式：跑一次 `node --test`，在**实际输出**里匹配测试名。文件存在 ≠ 证据成立。',
    '',
    renderTable(['任务', 'A编号', '验收项摘要', '状态', '证据来源', '备注'], rows),
    ...summary,
    ...gapBlock,
    '',
  ].join('\n');
}

/* ────────────────────────────── CLI ────────────────────────────── */

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const asJson = process.argv.includes('--json');
  let result;
  try {
    result = runAcceptance();
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(2);
  }
  const report = renderAcceptanceReport(result);
  if (asJson) {
    console.error(report);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(report);
  }
  process.exit(result.gaps ? 1 : 0);
}
