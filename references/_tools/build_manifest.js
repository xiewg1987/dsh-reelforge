// 汇总 references/ 下已下载的参考图 → manifest.json
// 用法: node build_manifest.js <referencesRoot> <huabanManifest> <pinterestManifest>
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const srcs = [process.argv[3], process.argv[4]].filter(Boolean).map(f => JSON.parse(fs.readFileSync(f, 'utf8')).items);

const byId = new Map();
for (const list of srcs) for (const it of list) byId.set(it.id, it);

const items = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['_pages', '_tools'].includes(e.name)) continue;
      walk(p);
    } else if (/\.(png|jpe?g|webp|gif)$/i.test(e.name)) {
      const id = path.basename(e.name).replace(/\.(png|jpe?g|webp|gif)$/i, '');
      const rel = path.relative(root, p).replace(/\\/g, '/');
      const meta = byId.get(id) || {};
      const qDir = path.basename(path.dirname(rel));
      items.push({
        id,
        platform: meta.platform || (rel.startsWith('pinterest/') ? 'pinterest' : 'huaban'),
        query: meta.query || qDir,
        queries: meta.queries || undefined,
        title: meta.title || '',
        author: meta.author || '',
        board: meta.board || '',
        sourcePage: meta.page || '',
        sourceHost: meta.sourceHost || '',
        imageUrl: meta.imageUrl || '',
        file: rel,
        bytes: fs.statSync(p).size,
      });
    }
  }
}
walk(root);

items.sort((a, b) => (a.platform + a.query + a.id).localeCompare(b.platform + b.query + b.id));

const byPlatform = {};
for (const it of items) byPlatform[it.platform] = (byPlatform[it.platform] || 0) + 1;
const byQuery = {};
for (const it of items) byQuery[`${it.platform}/${it.query}`] = (byQuery[`${it.platform}/${it.query}`] || 0) + 1;

const manifest = {
  generatedAt: new Date().toISOString(),
  purpose: 'ReelForge DSH 插件的界面设计参考（对应设计方案 §10.2 右栏工作台 / §10.3 聊天行）',
  note: '图片仅作设计参考，版权归原作者；manifest 记录来源以便按 URL 重下。',
  stats: { total: items.length, bytes: items.reduce((a, b) => a + b.bytes, 0), byPlatform, byQuery },
  items,
};
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json written:', items.length, 'items,', (manifest.stats.bytes / 1024 / 1024).toFixed(1), 'MB');
console.log(JSON.stringify(byQuery, null, 2));
