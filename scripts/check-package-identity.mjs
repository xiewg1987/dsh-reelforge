#!/usr/bin/env node
/**
 * R7 机器校验：包名三处必须完全相等。
 *
 * ① package.json 的 "name"
 * ② cordis.patch.yml 里 insert 行的 "name"
 * ③ client.js 里 window.__ModuleLoader__.load({ id })
 *
 * 三处不一致 → client **半静默不加载**：控制台不报错，右栏就是没这个 Tab。
 * 这条靠人记靠不住，改成脚本盯。
 *
 * 用法：node scripts/check-package-identity.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 从 cordis.patch.yml 里取 insert 行的 name（不引 YAML 依赖，手工解析这一种形状）。 */
function readPatchName() {
  const text = readFileSync(join(root, 'cordis.patch.yml'), 'utf8');
  const lines = text.split(/\r?\n/);
  const inInsert = lines.some((l) => /^\s*-\s*insert\s*:/.test(l));
  if (!inInsert) throw new Error('cordis.patch.yml 里没有 insert 段');
  for (const line of lines) {
    const m = /^\s*name:\s*['"]?([^'"\n#]+?)['"]?\s*(?:#.*)?$/.exec(line);
    if (m) return m[1].trim();
  }
  throw new Error('cordis.patch.yml 的 insert 段里没有 name 行');
}

/** 从 client.js 里取 load({ id }) 的 id 字面量。 */
function readClientId() {
  const text = readFileSync(join(root, 'client.js'), 'utf8');
  const m = /__ModuleLoader__\s*\.\s*load\s*\(\s*\{[\s\S]{0,400}?\bid\s*:\s*['"]([^'"]+)['"]/.exec(text);
  if (!m) throw new Error('client.js 里找不到 window.__ModuleLoader__.load({ id })');
  return m[1];
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pkgName = pkg.name;
const patchName = readPatchName();

const problems = [];
if (pkgName !== patchName) {
  problems.push(`package.json.name = ${pkgName}  ≠  cordis.patch.yml name = ${patchName}`);
}

let clientId = null;
try {
  clientId = readClientId();
  if (clientId !== pkgName) {
    problems.push(`package.json.name = ${pkgName}  ≠  client.js id = ${clientId}`);
  }
} catch (err) {
  problems.push(`${err.message}（client.js 可能还没写）`);
}

if (problems.length) {
  console.error('✗ R7 包名三处不一致：');
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}

console.log(`✓ R7 包名三处一致：${pkgName}`);
console.log(`  · package.json.name      = ${pkgName}`);
console.log(`  · cordis.patch.yml name  = ${patchName}`);
console.log(`  · client.js id           = ${clientId}`);
