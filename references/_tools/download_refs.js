// 统一下载器：把 pin 列表下载到 references/<platform>/<query-slug>/
// 用法: node download_refs.js <manifest.json> <referencesRoot>
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const manifestFile = process.argv[2];
const root = process.argv[3];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const items = manifest.items;

function curlGet(url, referer, outPath) {
  const args = ['-sS', '-L', '-o', outPath, '-w', '%{http_code}\t%{content_type}\t%{size_download}',
    '-m', '40', '--connect-timeout', '12', '-A', UA, '-H', `Referer: ${referer}`];
  const r = spawnSync('curl.exe', [...args, url], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (r.error) return { ok: false, code: 'ERR', type: '', size: 0, err: r.error.message };
  const [code, type, size] = (r.stdout || '').split('\t');
  return { ok: code === '200', code, type: type || '', size: Number(size) || 0, stderr: r.stderr };
}

// Pinterest：236x 路径 -> 尝试 originals/.jpg, originals/.png, 736x/.jpg
function pinVariants(imgUrl) {
  const m = imgUrl.match(/i\.pinimg\.com\/(\d+x\/)?([a-z0-9]{2}\/[a-z0-9]{2}\/[a-z0-9]{2}\/[a-f0-9]{32})\.(\w+)/i);
  if (!m) return [];
  const base = m[2];
  return [
    `https://i.pinimg.com/originals/${base}.jpg`,
    `https://i.pinimg.com/originals/${base}.png`,
    `https://i.pinimg.com/736x/${base}.jpg`,
  ];
}

function huabanVariants(url) {
  const out = [url];
  const alt = url.replace('gd-hbimg-edge.huaban.com', 'hbimg.huaban.com').replace('gd-hbimg.huaban.com', 'hbimg.huaban.com');
  if (alt !== url) out.push(alt);
  return out;
}

const slug = s => (s || 'misc').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'misc';
const extOf = ct => {
  if (!ct) return '.jpg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('gif')) return '.gif';
  return '.jpg';
};

let ok = 0, fail = 0;
const results = [];
for (const it of items) {
  const dir = path.join(root, it.platform, slug(it.query));
  fs.mkdirSync(dir, { recursive: true });
  const variants = it.platform === 'pinterest' ? pinVariants(it.imageUrl) : huabanVariants(it.imageUrl);
  let done = null;
  for (const v of variants) {
    const tmp = path.join(dir, `.tmp_${it.id}`);
    const res = curlGet(v, it.page || it.sourceHost || 'https://www.pinterest.com/', tmp);
    if (res.ok && res.size > 1500) {
      const ext = extOf(res.type);
      const final = path.join(dir, `${it.id}${ext}`);
      fs.renameSync(tmp, final);
      done = { file: path.relative(root, final).replace(/\\/g, '/'), bytes: res.size, contentType: res.type, imageUrl: v };
      break;
    }
    try { fs.unlinkSync(tmp); } catch {}
  }
  if (done) {
    ok++;
    results.push({ ...it, ...done });
    console.log(`OK   ${it.platform}/${slug(it.query)}/${path.basename(done.file)}  ${(done.bytes / 1024).toFixed(0)}KB`);
  } else {
    fail++;
    results.push({ ...it, file: null, error: 'all variants failed' });
    console.log(`FAIL ${it.platform} ${it.id}  ${(it.imageUrl || '').slice(0, 80)}`);
  }
}

fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, downloaded: results, stats: { ok, fail, total: items.length } }, null, 2), 'utf8');
console.log(`\n=== downloaded ok=${ok} fail=${fail} total=${items.length} ===`);
