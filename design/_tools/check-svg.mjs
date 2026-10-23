#!/usr/bin/env node
// v2 画板几何校验器：检查尺寸、越界、禁用元素、字体与颜色白名单。
// 用法: node check-svg.mjs <file.svg> [more.svg ...]
import { readFileSync } from 'node:fs';

const W = 560, H = 900;
const PALETTE = new Set([
  '#0B0E14', '#171A20', '#12151B', '#1F2127', '#23262B', '#2D3035',
  '#F2F5F9', '#8A93A5', '#5B6472', '#4C8DFF', '#16203A',
  '#3FB950', '#D29922', '#2A2214', '#F85149', '#2A1618', '#FFFFFF',
]);
const BANNED = ['<line', '<path', '<g', '<defs', '<image', '<linearGradient', '<radialGradient', 'opacity=', 'transform=', 'filter='];

const num = (s) => (s === undefined ? 0 : parseFloat(s));
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

let bad = 0;
for (const file of process.argv.slice(2)) {
  const errs = [];
  const src = readFileSync(file, 'utf8');
  const name = file.split(/[\\/]/).pop();

  if (src.charCodeAt(0) === 0xfeff) errs.push('文件带 BOM');
  if (!src.trimStart().startsWith('<svg')) errs.push('首字符不是 <svg');
  if (attr(src.slice(0, 400), 'width') !== String(W)) errs.push(`width 不是 ${W}`);
  if (attr(src.slice(0, 400), 'height') !== String(H)) errs.push(`height 不是 ${H}`);
  if (attr(src.slice(0, 400), 'viewBox') !== `0 0 ${W} ${H}`) errs.push(`viewBox 不是 0 0 ${W} ${H}`);

  for (const b of BANNED) if (src.includes(b)) errs.push(`含禁用元素/属性: ${b}`);

  // 元素越界
  for (const m of src.matchAll(/<rect\b[^>]*>/g)) {
    const x = num(attr(m[0], 'x')), y = num(attr(m[0], 'y'));
    const w = num(attr(m[0], 'width')), h = num(attr(m[0], 'height'));
    if (x + w > W + 0.01) errs.push(`rect 越界右: x=${x} w=${w} → ${x + w}`);
    if (y + h > H + 0.01) errs.push(`rect 越界下: y=${y} h=${h} → ${y + h}`);
    if (x < -0.01 || y < -0.01) errs.push(`rect 越界左上: x=${x} y=${y}`);
  }
  for (const m of src.matchAll(/<circle\b[^>]*>/g)) {
    const cx = num(attr(m[0], 'cx')), cy = num(attr(m[0], 'cy')), r = num(attr(m[0], 'r'));
    if (cx + r > W + 0.01) errs.push(`circle 越界右: cx=${cx} r=${r}`);
    if (cy + r > H + 0.01) errs.push(`circle 越界下: cy=${cy} r=${r}`);
  }
  for (const m of src.matchAll(/<polygon\b[^>]*points="([^"]*)"[^>]*>/g)) {
    for (const p of m[1].split(/\s+/).filter(Boolean)) {
      const [px, py] = p.split(',').map(Number);
      if (px > W || py > H) errs.push(`polygon 点越界: ${px},${py}`);
    }
  }
  for (const m of src.matchAll(/<text\b[^>]*>/g)) {
    const x = num(attr(m[0], 'x')), y = num(attr(m[0], 'y'));
    const size = num(attr(m[0], 'font-size')) || 12;
    if (x > W) errs.push(`text 越界右: x=${x}`);
    if (y > H) errs.push(`text 越界下: y=${y}`);
    if (y - size < 0) errs.push(`text 越界上: y=${y} size=${size}`);
    if (x < 0) errs.push(`text 越界左: x=${x}`);
    const fill = attr(m[0], 'fill');
    if (fill && !PALETTE.has(fill.toUpperCase())) errs.push(`text 颜色不在白名单: ${fill}`);
    const fam = attr(m[0], 'font-family');
    if (fam && !/^(Noto Sans SC|Inter)$/.test(fam)) errs.push(`字体不在白名单: ${fam}`);
    if (size && ![10, 11, 12, 13, 15].includes(size)) errs.push(`字号不在白名单: ${size}`);
  }
  for (const m of src.matchAll(/fill="([^"]*)"/g)) {
    const c = m[1];
    if (!c.startsWith('url(') && !PALETTE.has(c.toUpperCase())) errs.push(`颜色不在白名单: ${c}`);
  }

  if (errs.length) {
    bad++;
    console.log(`FAIL ${name}`);
    for (const e of [...new Set(errs)]) console.log(`     - ${e}`);
  } else {
    console.log(`PASS ${name}`);
  }
}
process.exit(bad ? 1 : 0);
