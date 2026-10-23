// 花瓣 API 采集：多关键词 → 参考图候选
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const outFile = process.argv[2];
const queries = process.argv.slice(3);

(async () => {
  const items = [];
  const seen = new Set();
  for (const q of queries) {
    const url = `https://api.huaban.com/search?q=${encodeURIComponent(q)}&type=pin&page=1`;
    let data;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://huaban.com/' } });
      data = await res.json();
    } catch (e) { console.error(`[${q}] fetch fail: ${e.message}`); continue; }
    const pins = data.pins || [];
    console.log(`[${q}] pins=${pins.length} pin_count=${data.pin_count}`);
    let n = 0;
    for (const p of pins) {
      if (!p.file || !p.file.url) continue;
      if (seen.has(p.pin_id)) continue;
      seen.add(p.pin_id);
      items.push({
        platform: 'huaban',
        query: q,
        id: `hb_${p.pin_id}`,
        pinId: String(p.pin_id),
        title: (p.raw_text || '').slice(0, 120) || (p.text_meta && p.text_meta.title) || '',
        imageUrl: p.file.url,
        page: `https://huaban.com/pin/${p.pin_id}`,
        sourceHost: 'https://huaban.com/',
        width: p.file.width, height: p.file.height,
        author: p.user && p.user.username ? p.user.username : '',
        board: p.board && p.board.name ? p.board.name : '',
        likeCount: p.like_count, repinCount: p.repin_count,
      });
      n++;
      if (n >= 12) break;
    }
  }
  fs.writeFileSync(outFile, JSON.stringify({ items }, null, 2), 'utf8');
  console.log(`\n=== huaban candidates: ${items.length} -> ${outFile} ===`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
