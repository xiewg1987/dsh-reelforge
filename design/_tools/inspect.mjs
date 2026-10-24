/**
 * 按名字查图层几何（排错用）
 * 用法：node design/_tools/inspect.mjs "Tab-枢纽" "TabChip-枢纽" ...
 * 需要设计稿已存在；只读，不改稿。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESIGN = path.resolve(HERE, '..');
const FIG = 'C:\\Program Files\\FigCraft\\figcraft-cli.exe';
const DOC = path.join(DESIGN, 'ReelForge-RF7.figcraft');
const OUT = path.join(HERE, '.inspect.figcraft');

const queries = process.argv.slice(2);
if (!queries.length) {
  console.error('用法：node inspect.mjs <名字...>');
  process.exit(1);
}

function run(cmds) {
  const tmp = path.join(HERE, '.inspect.json');
  fs.writeFileSync(tmp, JSON.stringify(cmds, null, 1), 'utf8');
  const out = execFileSync(FIG, ['run', tmp, '--in', DOC, '--out', OUT,
    '--automation-read-root', DESIGN, '--automation-write-root', DESIGN],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.split(/\r?\n/).filter((l) => l.trim().startsWith('{')).map((l) => JSON.parse(l));
}

const cmds = [];
for (const q of queries) {
  cmds.push({ command: 'select.byName', params: { query: q, page: 'all' } });
  cmds.push({ command: 'inspect.properties', params: {} });
}
const res = run(cmds);

for (let i = 0; i < queries.length; i++) {
  const sel = res[i * 2];
  const props = res[i * 2 + 1];
  const selTxt = JSON.stringify(sel.result ?? sel.error);
  console.log(`\n=== ${queries[i]} ===`);
  console.log('select:', selTxt.slice(0, 300));
  if (props.ok) {
    for (const sec of props.result.sections ?? []) {
      const rows = (sec.rows ?? []).map((r) => `${r.label}=${r.value}`).join(' · ');
      if (rows) console.log(`  [${sec.title}] ${rows}`);
    }
  } else {
    console.log('inspect err:', JSON.stringify(props.error));
  }
}
