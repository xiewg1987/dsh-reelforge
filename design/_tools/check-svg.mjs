/**
 * RF7 出稿校验（design/README.md 承诺的 check-svg）
 *
 * 规则：
 *   1) 画板尺寸必须是 560×900（组件表 1200×900）
 *   2) SVG 里不允许出现 opacity（层级用颜色深浅表达，不用透明度）
 *   3) 所有 fill 颜色必须来自 RF7 令牌表（暗稿只能出现暗色值，亮稿只能出现亮色值）
 *
 * 用法：node design/_tools/check-svg.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESIGN = path.resolve(HERE, '..');

const PALETTE = {
  dark: new Set(['#0A0C10', '#141820', '#10141C', '#1C2230', '#252A34', '#EEF1F6', '#9AA3B2', '#6B7380',
    '#5B8DEF', '#1A2744', '#3DDC84', '#E5A045', '#F07178', '#FFFFFF']),
  light: new Set(['#F4F5F7', '#FFFFFF', '#EBEDF2', '#DDE1E8', '#D0D4DC', '#121418', '#5C6370', '#8B919C',
    '#3568D4', '#E3EBFA', '#1F9D55', '#C7841A', '#D92D20']),
};

const TARGETS = [
  { dir: 'dark', size: '0 0 560 900', palette: 'dark' },
  { dir: 'light', size: '0 0 560 900', palette: 'light' },
  { dir: 'components', size: '0 0 1200 900', palette: 'dark' },
];

let bad = 0;
for (const { dir, size, palette } of TARGETS) {
  const full = path.join(DESIGN, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter((n) => n.endsWith('.svg'))) {
    const p = path.join(full, f);
    const svg = fs.readFileSync(p, 'utf8');
    const problems = [];

    const vb = svg.match(/viewBox="([^"]+)"/)?.[1];
    if (vb !== size) problems.push(`viewBox=${vb}（应为 ${size}）`);

    if (/opacity=/.test(svg)) problems.push('出现 opacity（层级不许用透明度）');

    const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());
    const allowed = PALETTE[palette] ?? new Set();
    const outside = [...new Set(fills.filter((c) => !allowed.has(c)))];
    if (outside.length) problems.push(`越界颜色 ${outside.join(', ')}`);

    if (problems.length) {
      bad++;
      console.log(`✗ ${dir}/${f}\n    ${problems.join('\n    ')}`);
    } else {
      console.log(`✓ ${dir}/${f}  ${vb} · ${new Set(fills).size} 种令牌色`);
    }
  }
}

console.log(bad ? `\n✗ ${bad} 个文件不合规` : '\n✅ 全部出稿合规');
process.exit(bad ? 1 : 0);
