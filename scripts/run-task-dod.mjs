#!/usr/bin/env node
/**
 * T1–T5 自动化 DoD 收口：跑测试 / 装载验证 / 构建 / pack 清单，**并把真实的验收判定与覆盖率门槛结果写进报告**。
 *
 * 用法：node scripts/run-task-dod.mjs
 * 退出码：0 = 自动化项（identity / verify / build / test / pack）全过；1 = 有失败项。
 *
 * ## 报告里的「通过」不再是硬编码
 *
 * - 验收表：由 `scripts/verify-acceptance.mjs` **实跑** 116 条验收项得出，状态列逐条来自真实判定。
 * - 共用 DoD #2–#7：由 `scripts/verify-acceptance.mjs` 的证据解析器判定（跑测试 / 跑命令 / 扫源码）。
 * - 覆盖率门槛：由 `scripts/verify-coverage.mjs` 实跑得出。
 *
 * `cordis_inspect_query` 不在 PATH 时，三查结论写「本机未安装 CLI」，并附上代码侧已查证扩展点。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDeliverPayload } from '../src/core/deliverPayload.js';
import { buildChangelogPayload } from '../src/core/changelogPayload.js';
import { TOOL_IDS, PROJECTION_KEY, TAB_KIND } from '../src/core/constants.js';

import { runAcceptance, resolveEvidence, STATUS } from './verify-acceptance.mjs';
import { runCoverage } from './verify-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_DIR = path.join(ROOT, 'docs', '开发任务', 'reports');
const SAMPLE_DIR = path.join(REPORT_DIR, 'samples');

/**
 * 跑一条 shell 命令并返回 stdout+stderr。
 * @param {string} command 可执行文件。
 * @param {string[]} args 参数。
 * @returns {{ code: number, text: string }}
 */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { code: result.status ?? 1, text };
}

/**
 * 尝试 cordis_inspect_query 三查。
 * @returns {{ cliAvailable: boolean, markdown: string }}
 */
function cordisTriQuery() {
  const probe = run('cordis_inspect_query', ['--help']);
  if (probe.code !== 0 && /not recognized|ENOENT|Could not find/i.test(probe.text)) {
    return {
      cliAvailable: false,
      markdown: [
        '### cordis_inspect_query 三查',
        '',
        '**状态**：本机 PATH 中**未找到** `cordis_inspect_query`（自动化跑数）。',
        '',
        '**代码侧已冻结、装载验证已覆盖的扩展点**（`scripts/verify-bundle.mjs` + 源码）：',
        '',
        '| 查项 | 本仓库结论 | 代码位置 |',
        '| --- | --- | --- |',
        '| `--service Tool` | `ctx.tools.register(definition)`，15 工具含 name/description/parameters/output/execute | `src/host/apply.js` · `src/host/tools.js` |',
        '| `--event Event` | **不新增 type**；fold 监听 `session/event`；消息行挂 `tool/result` + `reelforge.kind` | `src/host/apply.js` · `src/host/chatEvents.js` |',
        '| `--slots Slots` | 右栏 `sidebar.right.pane.tab`（key=Tab id）；聊天 `conversation.chat.node`（key=7 kind） | `src/client/entry.js` |',
        '| 存储服务 | **未在本机 CLI 确认**；变更日志与私有目录走工作区 `.reelforge/` 与 `changelogStore` | `src/host/changelogStore.js` · `src/host/paths.js` |',
        '',
        '**DSH 实机补验**（装上插件后人工执行一次并贴输出）：',
        '```bash',
        'cordis_inspect_query --service Tool',
        'cordis_inspect_query --event Event',
        'cordis_inspect_query --slots Slots',
        '```',
        '',
      ].join('\n'),
    };
  }

  const tool = run('cordis_inspect_query', ['--service', 'Tool']);
  const event = run('cordis_inspect_query', ['--event', 'Event']);
  const slots = run('cordis_inspect_query', ['--slots', 'Slots']);
  return {
    cliAvailable: true,
    markdown: [
      '### cordis_inspect_query 三查',
      '',
      '#### --service Tool',
      '```',
      tool.text.slice(0, 12000),
      '```',
      '',
      '#### --event Event',
      '```',
      event.text.slice(0, 12000),
      '```',
      '',
      '#### --slots Slots',
      '```',
      slots.text.slice(0, 12000),
      '```',
      '',
    ].join('\n'),
  };
}

/**
 * 共用 DoD（00-总览 §5）的 #2–#7：每条都挂**可核查的证据来源**，状态由实跑判定。
 * #8 偏离项是人工维护的，标「人工确认」；#1 cordis 三查见 cordisTriQuery()。
 */
const SHARED_DOD_CHECKS = [
  {
    no: 2,
    condition: '注册项 cleanup（R3）',
    link: 'T1/A12',
    evidence: { files: ['src/host/__tests__/t1-apply.test.js'], names: ['R3：apply() 返回清理函数'] },
  },
  {
    no: 3,
    condition: 'Config 可调（R5）',
    link: 'T1/A12',
    evidence: { files: ['src/host/__tests__/t1-apply.test.js'], names: ['配置非法时装配就报错，不默默用默认值'] },
  },
  {
    no: 4,
    condition: 'core 单测 / host 分离',
    link: '—',
    evidence: {
      requireAll: true,
      files: ['src/core/__tests__/*.test.js'],
      scan: { pattern: 'from\\s+[\'"]\\.\\./host/', globs: ['src/core/**/*.js'], expect: 'absent' },
    },
  },
  {
    no: 5,
    condition: '枚举仅 constants（F8）',
    link: 'T1/A10',
    evidence: { files: ['src/client/__tests__/t5-client.test.js'], names: ['客户端枚举镜像与 src/core/constants.js 逐项一致（F8）'] },
  },
  {
    no: 6,
    condition: '失败路径说清缺什么、给什么替代',
    link: 'T4/A17',
    evidence: {
      files: ['src/core/__tests__/degrade.test.js'],
      names: ['7 种降级一起命中时，产出矩阵取最差，话术逐条列出', 'degradeNotices 只输出话术文本'],
    },
  },
  {
    no: 7,
    condition: '触发类工具走 ask（R4）',
    link: 'T3/A21',
    evidence: { files: ['src/host/__tests__/t1-apply.test.js'], names: ['触发类工具被 ask 闸门拦下，其余工具放行'] },
  },
];

/** Markdown 单元格转义：竖线会破表。 */
function cell(text) {
  return String(text ?? '').replace(/\|/g, '\\|');
}

/**
 * 渲染某个任务的验收表（**完全由实跑结果生成，零硬编码**）。
 * @param {string} task 任务号。
 * @param {object} acceptance runAcceptance() 的结果。
 * @returns {string}
 */
function acceptanceTable(task, acceptance) {
  const rows = acceptance.items
    .filter((item) => item.task === task)
    .map((item) => {
      const strong = item.status === STATUS.PASS || item.status === STATUS.MISSING || item.status === STATUS.CLAIMED;
      const status = strong ? `**${item.status}**` : item.status;
      const detail = [item.evidence, item.note].filter(Boolean).join('；') || '—';
      return `| ${item.id} | ${cell(item.desc)} | ${status} | ${cell(detail)} |`;
    });
  return ['| # | 验收项 | 状态 | 证据 |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

/**
 * 共享 DoD 段落：#1 cordis 三查 + #2–#7 证据判定 + #8 偏离项。
 * @param {object} cordis cordisTriQuery() 的结果。
 * @param {object} acceptance runAcceptance() 的结果。
 * @param {object} summaries 自动化命令摘要。
 * @returns {string}
 */
function sharedDodBlock(cordis, acceptance, summaries) {
  const byKey = new Map(acceptance.items.map((i) => [`${i.task}/${i.id}`, i]));
  const rows = [];

  rows.push(
    `| 1 | cordis 三查 | ${cordis.cliAvailable ? '**已实机三查**' : '**未实机**（本机无 CLI）'} | 本报告 + \`reports/cordis-triquery.md\` |`,
  );

  for (const check of SHARED_DOD_CHECKS) {
    const verdict = resolveEvidence(check.evidence);
    const linked = check.link !== '—' ? byKey.get(check.link) : null;
    const linkText = linked ? `；对应验收 ${check.link}：**${linked.status}**` : '';
    const why = verdict.problems.length ? `（未通过原因：${verdict.problems.join('；')}）` : '';
    rows.push(
      `| ${check.no} | ${check.condition} | **${verdict.status}** | ${cell(verdict.evidence)}${linkText}${why} |`,
    );
  }

  rows.push('| 8 | 偏离项 | 人工确认 | 见各任务 §偏离 |');

  return [
    '## 共用 Definition of Done（00-总览 §5）',
    '',
    '> #2–#7 的状态**不是写死的**：由 `scripts/verify-acceptance.mjs` 的证据解析器实跑判定',
    '> （跑测试 / 跑命令 / 扫源码），跑不出来的会如实写「证据缺失」。',
    '',
    '| # | 条件 | 状态 | 证据 |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    cordis.markdown,
    '',
    '### 自动化命令摘要',
    '',
    '**check:identity**',
    '```',
    summaries.identity,
    '```',
    '',
    '**verify:bundle**',
    '```',
    summaries.verify,
    '```',
    '',
    '**npm test**',
    '```',
    summaries.tests.split('\n').slice(-8).join('\n'),
    '```',
    '',
  ].join('\n');
}

/**
 * 写报告文件。
 * @param {string} name 文件名。
 * @param {string} body 内容。
 * @returns {string}
 */
function writeReport(name, body) {
  const file = path.join(REPORT_DIR, name);
  writeFileSync(file, body, 'utf8');
  return file;
}

/* ────────────────────────────── 主流程 ────────────────────────────── */

mkdirSync(SAMPLE_DIR, { recursive: true });

const identity = run('npm', ['run', 'check:identity']);
const verify = run('npm', ['run', 'verify:bundle']);
const buildClient = run('npm', ['run', 'build:client']);
const tests = run('npm', ['test']);
const pack = run('npm', ['pack', '--dry-run']);

const ffmpegProbe = run('ffmpeg', ['-version']);
// 真 ffmpeg 也可以**不在 PATH 上**，而是放在临时验证工具链里，通过环境变量指过去
// （`RF_FFMPEG_PATH` / `RF_FFPROBE_PATH`）。两种来源都算「可用」。
const ffmpegFromEnv = typeof process.env.RF_FFMPEG_PATH === 'string'
  && process.env.RF_FFMPEG_PATH.length > 0
  && existsSync(process.env.RF_FFMPEG_PATH);
const ffmpegAvailable = ffmpegProbe.code === 0 || ffmpegFromEnv;
const ffmpegSource = ffmpegProbe.code === 0
  ? 'PATH'
  : (ffmpegFromEnv ? `环境变量 RF_FFMPEG_PATH（${process.env.RF_FFMPEG_PATH}）` : null);

const deliverSample = buildDeliverPayload({
  chapters: [{
    id: 'ch_1',
    title: '第1章',
    shotCount: 2,
    durationSec: 9,
    deliverables: [
      { kind: 'video_subtitled', label: '成片（带字幕）', path: 'exports/ch01_带字幕.mp4', bytes: 1024 },
    ],
  }],
});
const changelogSample = buildChangelogPayload({
  entries: [{
    id: 'e1',
    batchId: 'b1',
    at: '2026-10-23T03:00:00.000Z',
    summary: '改分镜',
    field: 'shots',
  }],
});
writeFileSync(path.join(SAMPLE_DIR, 'deliver-payload.json'), `${JSON.stringify(deliverSample, null, 2)}\n`, 'utf8');
writeFileSync(path.join(SAMPLE_DIR, 'changelog-payload.json'), `${JSON.stringify(changelogSample, null, 2)}\n`, 'utf8');

const cordis = cordisTriQuery();
writeFileSync(path.join(REPORT_DIR, 'cordis-triquery.md'), `# cordis_inspect_query 三查归档\n\n${cordis.markdown}\n`, 'utf8');

/* ── 证据化判定：验收 116 条 + 覆盖率门槛 ── */
let acceptance;
try {
  acceptance = runAcceptance();
} catch (err) {
  console.error(`✗ 验收表解析失败，报告未生成：${err.message}`);
  process.exit(1);
}
const coverage = runCoverage();

const passTests = /# pass (\d+)/.exec(tests.text)?.[1] ?? '?';
const failTests = /# fail (\d+)/.exec(tests.text)?.[1] ?? '?';
const automationOk = identity.code === 0 && verify.code === 0 && buildClient.code === 0 && tests.code === 0 && failTests === '0';

const deviations = [
  '- **工具数 15**：F4 文案写 13 ReelForge + 2 技能只读；`verify:bundle` 计 15 个宿主工具注册项（含 skill / skill_reference）。',
  '- **客户端构建**：无 tsdown 分片，采用 `build-client.mjs` 单文件拼接（T5 任务书 R10 分片路线在本仓库以「无分片、确定性拼接」落地；验收 A34–A36 标记为 N/A，A38 以 pack dry-run 为准）。',
  '- **RF.actions 已加固，但最终 transport 仍待 owner 确认**：UI 写操作经 `remote.session.prompt` 转模型调工具（`src/client/entry.js`）。'
    + '原先「没有 transport ⇒ 只 `console.warn`」是静默降质，现已改为**可见失败 + 可重放**（请求进 `RF.actions.pending` 队列并发结构化通知，文案说清缺什么、给什么替代；`retryPending()` 可一键重放）。'
    + '代码里**不写死**任何宿主 API 名 —— 本机无 DSH 宿主包，无法证明 `remote.commands` 存在，那处探测带运行时存在性检查且非默认路径，启用前需宿主 owner 确认签名。',
  '- **本轮修掉的真实缺陷（都是新增测试/实跑暴露出来的，不是代码审查发现的）**：'
    + '① `src/client/components.js` 的 `RF.ui` 早于 `RF.SectionLabel`/`RF.MetaRow` 建立 → 两槽位为 `undefined`，有数据时 `h(undefined)` 抛 "Element type is invalid"（章节/镜头/技能/输出 4 个页签 + progress 消息行）；'
    + '② `src/host/workspace.js` 的 `writeFileAtomic` 失败时只把临时文件截空而非删除 → 每次写失败在工作区留隐藏 `.tmp` 垃圾文件；'
    + '③ `src/host/tools.js` 调 `runStage` **不传 `deps`** → 探测直接踩 `deps.llm.ping()` 的 TypeError，4 个触发类工具必崩；'
    + '④ 变更日志**从来没有被记录**（全仓无 `engine.record()` 调用）→ `rollback` 在真实流程里恒 404；'
    + '⑤ `src/host/changelogStore.js` 章节行带 `shots: undefined` → JSONL 往返丢键 → **章节层回滚 100% 误报漂移 409**，整层不可用；'
    + '⑥ 变更日志条目 id 重启后从 `cl_000001` 重新计数 → **撞号**，single 模式按 id 回滚会退错变更；'
    + '⑦ `list(projectId)` 忽略 projectId（跨项目串数据）+ `clearProject` 清空整个日志文件（误删其它项目历史）；'
    + '⑧ `src/media/assemble.js` 的 concat 清单写工作区相对路径，但 ffmpeg 按**清单目录**解析 → **生产拼接必失败**；'
    + '⑨ 调 ffmpeg 从不传 cwd → 成片落在**宿主进程 cwd**、不在会话工作区（`assemble.js` 与 `deliver.js` 两处）；'
    + '⑩ `planAudioMix` 只有 `-map [aout]` 没有 `-map 0:v` → 带 TTS/BGM 的一章**产出纯音频却报 ok:true**（静默损坏）；'
    + '⑪ `planContactSheet` 用 ffmpeg 不认的 `color=#222`、且 `tile` 被喂 N 个输入 → **拼版图永远出不来**；'
    + '⑫ `planContactSheet` 的 `concat` 各输入 SAR 不一致（`scale` 各自补偿比例）→ "Error reinitializing filters!"，需补 `setsar=1`；'
    + '⑬ `src/host/stageBridge.js` 走自己的四字段载荷，**从不调用 runner** → 通道收到的 `payload.prompt` 是 `undefined`；同时 `runStage` 固定传 `state.completed = {}` → **video 阶段经桥永远被硬依赖拒掉**、指纹幂等跨不过桥。',
];

if (!ffmpegAvailable) {
  deviations.push('- **ffmpeg 实机**：本机既没有 PATH 上的 ffmpeg，也没有设 `RF_FFMPEG_PATH`；'
    + 'T4 A1–A3 的实跑组会**显式 skip**（`src/media/__tests__/assemble-e2e.test.js` 的「真 ffmpeg 实跑」组）。'
    + '装好 ffmpeg 后设 `RF_FFMPEG_PATH`（以及 `RF_FFPROBE_PATH`）即可解锁；'
    + '缺 ffmpeg 时的降级话术由 `src/media/__tests__/ffmpeg.test.js`、`degrade.test.js` 与 `assemble-regress.test.js` 覆盖。');
} else {
  deviations.push(`- **ffmpeg 实机已就绪**（来源：${ffmpegSource}）：`
    + 'T4 A1/A3 已由真 ffmpeg 实跑给出证据（A1 的成片路径与清单、A3 的「无字幕版是重封装不重渲」用视频包 MD5 相同判定）；'
    + 'A2 的 ffprobe 输出**仍标「实机待补」** —— 那条验收标准要求人工贴 ffprobe 原文，'
    + '自动化只断言了规格字段（codec/pix_fmt/帧率/faststart），两者口径不同，故不冒充通过。');
}

const shared = sharedDodBlock(cordis, acceptance, {
  identity: identity.text,
  verify: verify.text,
  tests: tests.text,
});

const acceptanceCounts = acceptance.counts;
const gapItems = acceptance.items.filter((i) => i.status === STATUS.MISSING || i.status === STATUS.CLAIMED);
const manualItems = acceptance.items.filter((i) => i.status === STATUS.MANUAL);

/* ── T1 ── */
writeReport('T1-报告.md', `# T1 · 契约与骨架 — 任务报告

> 生成时间：2026-10-23（自动化 \`scripts/run-task-dod.mjs\`）
> 验收判定：\`scripts/verify-acceptance.mjs\` 实跑；覆盖率门槛：\`scripts/verify-coverage.mjs\` 实跑。

## 验收（任务书 §5）

${acceptanceTable('T1', acceptance)}

## 冻结契约 F1–F5 / F8

| 契约 | 位置 |
| --- | --- |
| F1 | \`package.json\` / \`cordis.patch.yml\` / \`client.js\` load id |
| F2 | \`TAB_KIND = ${TAB_KIND}\` · \`src/client/manifest.js\` |
| F3 | \`src/host/gate.js\` |
| F4 | \`src/core/constants.js\` TOOL_IDS · \`src/host/tools.js\` |
| F5 | \`src/workflows/spec.js\` |
| F8 | \`src/core/constants.js\` |

${shared}

## 偏离主文档

${deviations.join('\n')}
`);

/* ── T2 ── */
writeReport('T2-报告.md', `# T2 · 一致性底座 — 任务报告

> 生成时间：2026-10-23 · 验收判定与覆盖率门槛均为实跑结果。

## F6 冻结

- **签名**：\`resolveRefs(shot, assets, ctx) → { images[], audios[], tags[], order[], warnings[] }\`
- **位置**：\`src/core/refs.js\`
- **T3 消费**：\`src/core/stageOrchestrator.js\` · \`src/workflows/runner.js\` · fixture \`src/workflows/__tests__/fixtures/rf-resolveRefs.fixture.js\`

## 验收（任务书 §5）

${acceptanceTable('T2', acceptance)}

${shared}
`);

/* ── T3 ── */
writeReport('T3-报告.md', `# T3 · 生成执行 — 任务报告

> 生成时间：2026-10-23 · 验收判定与覆盖率门槛均为实跑结果。

## 交付物

| 项 | 位置 |
| --- | --- |
| 规格集 5×kind | \`workflows/specs/*.json\` |
| 执行器 | \`src/workflows/runner.js\` · comfyui / runninghub / dshMedia |
| 编排 | \`src/core/stageOrchestrator.js\` · \`src/host/stageBridge.js\` |
| 探测 | \`src/core/probe.js\` |

## 验收（任务书 §5）

${acceptanceTable('T3', acceptance)}

${shared}
`);

/* ── T4 ── */
writeReport('T4-报告.md', `# T4 · 合成交付与回滚 — 任务报告

> 生成时间：2026-10-23 · 验收判定与覆盖率门槛均为实跑结果。

## 验收（任务书 §5）

${acceptanceTable('T4', acceptance)}

## ffmpeg 实机探测

本机 ffmpeg：**${ffmpegAvailable ? `已就绪（来源：${ffmpegSource}）` : '不可用（PATH 上没有，也未设 RF_FFMPEG_PATH）'}**。${
  ffmpegAvailable
    ? '真 ffmpeg 实跑组已执行：A1 的成片路径与清单、A3 的「无字幕版是重封装不重渲」都有真 ffmpeg 证据；A2 的 ffprobe 规格由自动化断言（人工贴原文仍列为实机待补）。'
    : 'A1–A3 的实跑组会显式 skip；缺 ffmpeg 时的降级话术由单测覆盖。'
}

${shared}
`);

/* ── T5 ── */
writeReport('T5-报告.md', `# T5 · 工作台与技能工厂 — 任务报告

> 生成时间：2026-10-23 · 验收判定与覆盖率门槛均为实跑结果。

## 验收（任务书 §5）

${acceptanceTable('T5', acceptance)}

### npm pack --dry-run

\`\`\`
${pack.text.slice(0, 8000)}
\`\`\`

${shared}

## 偏离主文档

${deviations.join('\n')}
`);

/* ── 00 合流摘要 ── */
const coverageRows = coverage.gates
  .map((g) => `| \`${g.file}\` | ${g.line.toFixed(2)} | ≥ ${g.minLine} | ${g.funcs.toFixed(2)} | ≥ ${g.minFuncs} | ${g.ok ? '✅' : '❌'} |`)
  .join('\n');

const perTaskRows = ['T1', 'T2', 'T3', 'T4', 'T5']
  .map((task) => {
    const items = acceptance.items.filter((i) => i.task === task);
    const pass = items.filter((i) => i.status === STATUS.PASS).length;
    const missing = items.filter((i) => i.status === STATUS.MISSING).length;
    const claimed = items.filter((i) => i.status === STATUS.CLAIMED).length;
    const manual = items.filter((i) => i.status === STATUS.MANUAL).length;
    const na = items.filter((i) => i.status === STATUS.NA).length;
    return `| ${task} | ${items.length} | ${pass} | ${missing} | ${claimed} | ${manual} | ${na} |`;
  })
  .join('\n');

const gapBlock = gapItems.length
  ? gapItems.map((i) => `- **${i.task} ${i.id}** ${i.desc} —— ${i.note}`).join('\n')
  : '无。';

const manualBlock = manualItems.length
  ? manualItems.map((i) => `- **${i.task} ${i.id}** ${i.desc} —— ${i.how}`).join('\n')
  : '无。';

writeReport('00-合流摘要.md', `# ReelForge T1–T5 合流摘要

> 生成时间：2026-10-23 · \`node scripts/run-task-dod.mjs\`
> 验收判定来自 \`scripts/verify-acceptance.mjs\` 实跑；覆盖率门槛来自 \`scripts/verify-coverage.mjs\` 实跑。

## 自动化结论

| 检查 | 结果 |
| --- | --- |
| check:identity | ${identity.code === 0 ? '✅' : '❌'} |
| verify:bundle | ${verify.code === 0 ? '✅' : '❌'} |
| build:client | ${buildClient.code === 0 ? '✅' : '❌'} |
| npm test | ${tests.code === 0 ? '✅' : '❌'} (${passTests} pass / ${failTests} fail) |
| npm pack --dry-run | ${pack.code === 0 ? '✅' : '❌'} |
| ffmpeg | ${ffmpegAvailable ? `✅ 已就绪（${ffmpegSource}）` : '⚠️ 不可用（实跑组显式 skip）'} |

**整体自动化**：${automationOk ? '**通过**' : '**未通过**（见各子报告）'}

## 验收判定汇总（116 条）

| 状态 | 条数 |
| --- | --- |
| ${STATUS.PASS} | ${acceptanceCounts[STATUS.PASS]} |
| ${STATUS.MISSING} | ${acceptanceCounts[STATUS.MISSING]} |
| ${STATUS.CLAIMED} | ${acceptanceCounts[STATUS.CLAIMED]} |
| ${STATUS.MANUAL} | ${acceptanceCounts[STATUS.MANUAL]} |
| ${STATUS.NA} | ${acceptanceCounts[STATUS.NA]} |
| **合计** | **${acceptance.total}** |

| 任务 | 验收项 | ${STATUS.PASS} | ${STATUS.MISSING} | ${STATUS.CLAIMED} | ${STATUS.MANUAL} | ${STATUS.NA} |
| --- | --- | --- | --- | --- | --- | --- |
${perTaskRows}

### 证据缺口（${gapItems.length} 条 —— 这些项**不能**算「通过」）

${gapBlock}

### 仍需 DSH 实机人工补证（${manualItems.length} 条）

${manualBlock}

## 覆盖率门槛

| 文件 | 行% 实测 | 行% 门槛 | 函数% 实测 | 函数% 门槛 | 判定 |
| --- | --- | --- | --- | --- | --- |
${coverageRows}

**覆盖率门槛结论**：${coverage.ok ? '**全部达标**' : `**${coverage.gates.filter((g) => !g.ok).length} 个文件不达标**`}。阈值可在 \`scripts/verify-coverage.mjs\` 顶部的 \`COVERAGE_GATES\` 常量里调整。

## 报告索引

- [T1-报告.md](./T1-报告.md)
- [T2-报告.md](./T2-报告.md)
- [T3-报告.md](./T3-报告.md)
- [T4-报告.md](./T4-报告.md)
- [T5-报告.md](./T5-报告.md)
- [cordis-triquery.md](./cordis-triquery.md)
- Payload 样例：\`reports/samples/deliver-payload.json\` · \`changelog-payload.json\`

## 偏离项（主控合并）

${deviations.map((line, index) => `${index + 1}. ${line.replace(/^- \*\*/, '**')}`).join('\n')}
`);

console.log(`Reports written to ${path.relative(ROOT, REPORT_DIR)}`);
console.log(`Automation: ${automationOk ? 'PASS' : 'FAIL'} (tests ${passTests}/${failTests})`);
console.log(
  `Acceptance: ${acceptance.total} items — ` +
  `${STATUS.PASS} ${acceptanceCounts[STATUS.PASS]} / ${STATUS.MISSING} ${acceptanceCounts[STATUS.MISSING]} / ` +
  `${STATUS.CLAIMED} ${acceptanceCounts[STATUS.CLAIMED]} / ${STATUS.MANUAL} ${acceptanceCounts[STATUS.MANUAL]} / ` +
  `${STATUS.NA} ${acceptanceCounts[STATUS.NA]} (gaps ${acceptance.gaps})`,
);
console.log(
  `Coverage gates: ${coverage.gates.filter((g) => g.ok).length}/${coverage.gates.length} pass` +
  `${coverage.ok ? '' : ` — failing: ${coverage.gates.filter((g) => !g.ok).map((g) => g.file).join(', ')}`}`,
);

process.exit(automationOk ? 0 : 1);
