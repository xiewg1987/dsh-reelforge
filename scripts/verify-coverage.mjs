#!/usr/bin/env node
/**
 * 覆盖率门槛：对指定的低覆盖热点文件设最低阈值，跑一次带覆盖率的测试并逐条判定。
 *
 * 用法：
 *   node scripts/verify-coverage.mjs           # 人读：实测 vs 阈值
 *   node scripts/verify-coverage.mjs --json    # 机读：stdout 只有 JSON
 *
 * 退出码：
 *   0 = 全部达标
 *   1 = 有文件不达标（任一行 ❌）
 *
 * ── 阈值调整 ──────────────────────────────────────────────────────────────
 * 下面 COVERAGE_GATES 常量里的 minLine / minFuncs **可以直接改**。
 * 这是「当前实测的低覆盖热点」清单：改了阈值就改了门槛，脚本本身不用动。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 覆盖率门槛清单。**可通过改常量调整。**
 * @type {{ file: string, minLine: number, minFuncs: number }[]}
 */
export const COVERAGE_GATES = [
  { file: 'src/host/tools.js', minLine: 85, minFuncs: 80 },
  { file: 'src/host/changelogStore.js', minLine: 85, minFuncs: 80 },
  { file: 'src/core/projectSchema.js', minLine: 85, minFuncs: 80 },
  { file: 'src/host/stageBridge.js', minLine: 80, minFuncs: 75 },
];

/** 跑覆盖率用的测试 glob。 */
const TEST_GLOB = 'src/**/__tests__/*.test.js';

/**
 * 跑一次带覆盖率的测试。
 * @returns {{ code: number, text: string }}
 */
function runCoverageCommand() {
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-reporter=spec', '--experimental-test-coverage', TEST_GLOB],
    { cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 128 * 1024 * 1024 },
  );
  return { code: result.status ?? 1, text: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/**
 * 解析 node 的覆盖率表格。
 *
 * 表格是**缩进树**而不是 `|` 分隔的完整路径：
 *   src                    ← 目录行（百分比列是空的）
 *    host                 ← 目录行
 *     tools.js  | 62.87 | … ← 文件行（缩进 = 深度）
 *   all files              ← 汇总行，必须跳过
 *
 * @param {string} text node 的完整输出。
 * @returns {Map<string, { line: number, branch: number, funcs: number, uncovered: string }>}
 */
export function parseCoverageTable(text) {
  const rows = new Map();
  const lines = text.split(/\r?\n/);

  const start = lines.findIndex((l) => l.includes('start of coverage report'));
  const end = lines.findIndex((l) => l.includes('end of coverage report'));
  if (start === -1 || end === -1 || end < start) return rows;

  const stack = [];
  for (const raw of lines.slice(start + 1, end)) {
    // 去掉 reporter 前缀（spec 是「ℹ 」，tap 是「# 」）。
    const line = raw.replace(/^[\u2139#]\s/, '');
    if (!line.includes('|')) continue;

    const cells = line.split('|');
    const head = cells[0];
    const name = head.trim();
    if (!name || name === 'all files' || name === 'file') continue;

    // 缩进 = 深度。**目录行也要进路径栈**，否则子文件拼不出完整路径。
    const depth = head.length - head.trimStart().length;
    stack[depth] = name;
    stack.length = depth + 1;

    const linePct = Number.parseFloat(cells[1] ?? '');
    if (!Number.isFinite(linePct)) continue; // 目录行：百分比列是空的

    rows.set(stack.join('/'), {
      line: linePct,
      branch: Number.parseFloat(cells[2] ?? '0') || 0,
      funcs: Number.parseFloat(cells[3] ?? '0') || 0,
      uncovered: (cells[4] ?? '').trim(),
    });
  }
  return rows;
}

/**
 * 列出 src 下**没有**出现在覆盖率表格里的源文件。
 *
 * node 的覆盖率只统计**真正被执行过**的模块：`src/client/**` 是通过
 * `new Function` 字符串执行的，不在 V8 的插桩范围内，所以整目录缺席——
 * 这是**预期现象**，不是覆盖率没跑出来。
 *
 * @param {Map<string, object>} rows 覆盖率表格。
 * @returns {string[]}
 */
export function missingFromCoverage(rows) {
  const missing = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '__tests__' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(?:js|mjs)$/.test(entry.name)) continue;
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (!rows.has(rel)) missing.push(rel);
    }
  };
  walk(path.join(ROOT, 'src'));
  return missing.sort();
}

/**
 * 跑覆盖率门槛判定。
 * @returns {{ gates: object[], missing: string[], ok: boolean, testCode: number, rows: Map }}
 */
export function runCoverage() {
  const { code, text } = runCoverageCommand();
  const rows = parseCoverageTable(text);
  const missing = missingFromCoverage(rows);

  const gates = COVERAGE_GATES.map((gate) => {
    const hit = rows.get(gate.file);
    const actual = hit ?? { line: 0, branch: 0, funcs: 0, uncovered: '' };
    const lineOk = actual.line >= gate.minLine;
    const funcsOk = actual.funcs >= gate.minFuncs;
    return {
      file: gate.file,
      minLine: gate.minLine,
      minFuncs: gate.minFuncs,
      line: actual.line,
      funcs: actual.funcs,
      branch: actual.branch,
      uncovered: actual.uncovered,
      present: Boolean(hit),
      lineOk,
      funcsOk,
      ok: lineOk && funcsOk,
    };
  });

  return { gates, missing, ok: gates.every((g) => g.ok), testCode: code, rows };
}

/**
 * 渲染人读的覆盖率门槛报告。
 * @param {object} result runCoverage() 的结果。
 * @returns {string}
 */
export function renderCoverageReport(result) {
  const rows = result.gates.map((g) => [
    `\`${g.file}\``,
    `${g.line.toFixed(2)}${g.present ? '' : '（未进表，按 0% 计）'}`,
    `≥ ${g.minLine}`,
    `${g.funcs.toFixed(2)}${g.present ? '' : '（未进表，按 0% 计）'}`,
    `≥ ${g.minFuncs}`,
    g.ok ? '✅ 达标' : '❌ 不达标',
  ]);

  const table = [
    '| 文件 | 行% 实测 | 行% 门槛 | 函数% 实测 | 函数% 门槛 | 判定 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');

  const clientFiles = result.missing.filter((f) => f.startsWith('src/client/'));
  const otherMissing = result.missing.filter((f) => !f.startsWith('src/client/'));

  const notes = [
    '',
    '### 说明',
    '',
    `- 数据来源：\`node --test --test-reporter=spec --experimental-test-coverage "${TEST_GLOB}"\`（测试退出码 ${result.testCode}）。`,
    '- 表格里只有**文件行**参与判定；目录汇总行（`src` / `core` / `host` …）与总汇总行（`all files`）已跳过。',
    `- **文件不在表格里 = 视为 0%**（不是「跳过」）。本轮未进表的文件共 ${result.missing.length} 个。`,
  ];

  if (clientFiles.length) {
    notes.push(
      `- 其中 \`src/client/**\` 共 ${clientFiles.length} 个文件未进表：这些片段是通过 \`new Function\` 以字符串执行的，node 的覆盖率不插桩这条路径，**这是预期现象，不是脚本坏了**。示例：${clientFiles.slice(0, 4).map((f) => `\`${f}\``).join('、')}${clientFiles.length > 4 ? ' …' : ''}`,
    );
  }
  if (otherMissing.length) {
    notes.push(
      `- 其余未进表的源文件（${otherMissing.length} 个）：${otherMissing.map((f) => `\`${f}\``).join('、')}`,
    );
  }

  notes.push(
    '',
    `### 结论：${result.ok ? '**全部达标**' : `**${result.gates.filter((g) => !g.ok).length} 个文件不达标**`}`,
    '',
  );

  return [
    '# 覆盖率门槛',
    '',
    '> 阈值常量在本脚本顶部的 `COVERAGE_GATES`，**可通过改常量调整**。',
    '',
    table,
    ...notes,
  ].join('\n');
}

/* ────────────────────────────── CLI ────────────────────────────── */

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const asJson = process.argv.includes('--json');
  const result = runCoverage();
  const report = renderCoverageReport(result);
  if (asJson) {
    console.error(report);
    console.log(JSON.stringify({ ...result, rows: [...result.rows] }, null, 2));
  } else {
    console.log(report);
  }
  process.exit(result.ok ? 0 : 1);
}
