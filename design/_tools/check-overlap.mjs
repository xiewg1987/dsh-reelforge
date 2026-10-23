#!/usr/bin/env node
// 检测「文字被后绘制的矩形遮住」：估算文字盒，检查其后出现的矩形是否覆盖它。
import { readFileSync } from 'node:fs';

const CHAR_W = { ascii: 0.56, cjk: 1.0 };

function textWidth(s, size) {
  let w = 0;
  for (const ch of s) w += (ch.charCodeAt(0) > 0x2e80 ? CHAR_W.cjk : CHAR_W.ascii) * size;
  return w;
}

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const name = file.split(/[\\/]/).pop();
  const items = [];
  for (const m of src.matchAll(/<(text|rect)\b([^>]*?)(\/?)>(?:([^<]*)<\/text>)?/g)) {
    const tag = m[1], attrs = m[2], body = m[4] ?? '';
    const get = (k) => { const r = attrs.match(new RegExp(`${k}="([^"]*)"`)); return r ? r[1] : undefined; };
    if (tag === 'rect') {
      const x = +(get('x') ?? 0), y = +(get('y') ?? 0), w = +(get('width') ?? 0), h = +(get('height') ?? 0);
      const fill = (get('fill') ?? '').toUpperCase();
      if (fill.startsWith('URL(') || fill === 'NONE') continue;
      items.push({ kind: 'rect', x, y, w, h, i: m.index });
    } else {
      const x = +(get('x') ?? 0), y = +(get('y') ?? 0), size = +(get('font-size') ?? 12);
      const anchor = get('text-anchor');
      const s = body.replace(/&amp;/g, '&').trim();
      if (!s) continue;
      const tw = textWidth(s, size);
      const th = size;
      const lx = anchor === 'end' ? x - tw : anchor === 'middle' ? x - tw / 2 : x;
      items.push({ kind: 'text', lx, y: y - size * 0.82, w: tw, h: th, s, i: m.index });
    }
  }
  const hits = [];
  for (const t of items.filter(o => o.kind === 'text')) {
    const tArea = Math.max(1, t.w * t.h);
    for (const r of items.filter(o => o.kind === 'rect' && o.i > t.i)) {
      const ox = Math.min(t.lx + t.w, r.x + r.w) - Math.max(t.lx, r.x);
      const oy = Math.min(t.y + t.h, r.y + r.h) - Math.max(t.y, r.y);
      if (ox > 0 && oy > 0) {
        const ratio = (ox * oy) / tArea;
        if (ratio >= 0.55) { hits.push(`"${t.s}" (x ${t.lx.toFixed(0)}..${(t.lx + t.w).toFixed(0)}, y ${t.y.toFixed(0)}..${(t.y + t.h).toFixed(0)}) 被后画 rect (${r.x},${r.y},${r.w}x${r.h}) 覆盖 ${Math.round(ratio * 100)}%`); break; }
      }
    }
  }
  if (hits.length) { console.log(`--- ${name} ---`); hits.forEach(h => console.log('   ' + h)); }
}
