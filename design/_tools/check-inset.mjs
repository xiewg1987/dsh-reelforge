#!/usr/bin/env node
// 找出「贴在带描边卡片右边界上」的元素：卡片有 stroke，子元素右边界与卡片右边界重合。
import { readFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const name = file.split(/[\\/]/).pop();
  const cards = [...src.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke="[^"]*"/g)]
    .map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], right: +m[1] + +m[3], bottom: +m[2] + +m[4] }))
    .filter(c => c.w <= 520);
  const hits = [];
  for (const m of src.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*>/g)) {
    const x = +m[1], y = +m[2], w = +m[3], h = +m[4], right = x + w;
    if (w >= 520) continue;
    for (const c of cards) {
      if (Math.abs(right - c.right) < 0.01 && y >= c.y && y + h <= c.bottom + 0.01 && !(x === c.x && w === c.w)) {
        hits.push(`rect x=${x} w=${w} right=${right} 贴住描边卡 (x=${c.x} y=${c.y} w=${c.w} h=${c.h})`);
      }
    }
  }
  for (const m of src.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*text-anchor="end"[^>]*>([^<]*)</g)) {
    const x = +m[1], y = +m[2];
    for (const c of cards) {
      if (Math.abs(x - c.right) < 0.01 && y >= c.y && y <= c.bottom) {
        hits.push(`text end x=${x} y=${y} "${m[3]}" 贴住描边卡 (x=${c.x} y=${c.y} w=${c.w} h=${c.h})`);
      }
    }
  }
  if (hits.length) { console.log(`--- ${name} ---`); hits.forEach(h => console.log('   ' + h)); }
}
