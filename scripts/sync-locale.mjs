/**
 * 同步 `locale/{zh,en}.json` 的 `ui` 段 —— 唯一来源是 `src/client/locale.js`。
 *
 * 为什么需要它：界面文案有两份副本（`src/client/locale.js` 与 `locale/*.json`
 * 的 `ui` 段），`src/client/__tests__/t5-client.test.js` 会**逐键逐值**比对两边。
 * 手抄三份必然漂移 ⇒ 这里从唯一来源生成副本。
 *
 * 什么时候跑：**改完 `src/client/locale.js` 之后**，跑一次：
 *   npm run sync:locale
 * 幂等：内容一致时不会改写文件（避免无谓的 mtime 抖动）。
 *
 * ⚠️ 跑完还是要跑 `npm test` —— 比对测试会告诉你有没有漏同步。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(root, 'src', 'client');

/**
 * 装一次客户端片段，取出 RF.locale。
 * @returns {object} `RF.locale`。
 */
function loadLocale() {
  const RF = {};
  const source = readFileSync(join(clientDir, 'locale.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('RF', source)(RF);
  if (!RF.locale || !RF.locale.zh || !RF.locale.en) throw new Error('locale.js 没有导出 RF.locale');
  return RF.locale;
}

const locale = loadLocale();
let changed = 0;

for (const [lang, dict] of [['zh', locale.zh], ['en', locale.en]]) {
  const file = join(root, 'locale', `${lang}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const before = JSON.stringify(json.ui ?? null);
  json.ui = dict;
  const after = JSON.stringify(json.ui);
  if (before === after) {
    console.log(`${lang}.json: ui 段已是最新（${Object.keys(dict).length} 键），未改写`);
    continue;
  }
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  changed += 1;
  console.log(`${lang}.json: ui 段已同步（${Object.keys(dict).length} 键）`);
}

console.log(changed === 0 ? 'locale 无漂移' : `locale 同步完成：${changed} 个文件改写`);
