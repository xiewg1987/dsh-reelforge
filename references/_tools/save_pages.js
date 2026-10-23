// 保存搜索页原文（Pinterest HTML + 花瓣 API JSON）到 references/_pages/
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });

// 保留中文：Windows 文件名支持 CJK，避免中文词被洗成同名导致互相覆盖
const slug = s => s.toLowerCase().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');

const pinQueries = ['storyboard app ui design', 'AI video generation app interface design', 'short drama storyboard app UI design'];
const hbQueries = ['分镜', '工作台', 'UI设计', '短剧', 'AI设计', '编辑器', '看板', '产品设计'];

function curl(url, referer) {
  const r = spawnSync('curl.exe', ['-sS', '-L', '--compressed', '-m', '30', '-A', UA, '-H', `Referer: ${referer}`, url],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  return { ok: !r.error && r.stdout && r.stdout.length > 0, body: r.stdout || '', err: r.error ? r.error.message : '' };
}

for (const q of pinQueries) {
  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}&rs=typed`;
  const { ok, body, err } = curl(url, 'https://www.pinterest.com/');
  const f = path.join(outDir, `pinterest-${slug(q)}.html`);
  if (ok) { fs.writeFileSync(f, body, 'utf8'); console.log(`OK   ${path.basename(f)}  ${(body.length / 1024).toFixed(0)}KB`); }
  else console.log(`FAIL pinterest "${q}": ${err}`);
}

for (const q of hbQueries) {
  const url = `https://api.huaban.com/search?q=${encodeURIComponent(q)}&type=pin&page=1`;
  const { ok, body, err } = curl(url, 'https://huaban.com/');
  const f = path.join(outDir, `huaban-${slug(q)}.json`);
  if (ok) { fs.writeFileSync(f, body, 'utf8'); console.log(`OK   ${path.basename(f)}  ${(body.length / 1024).toFixed(0)}KB`); }
  else console.log(`FAIL huaban "${q}": ${err}`);
}
