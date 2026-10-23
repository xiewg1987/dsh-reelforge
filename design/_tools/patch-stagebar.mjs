#!/usr/bin/env node
// 把 5 步 StageBar 改成 6 步（新增「运行」）：需求 · 运行 · 方案 · 生成 · 分镜 · 交付
// 当前步由原文件中高亮（fill="#F2F5F9"）的那一步自动判定，可用 override 覆盖。
import { readFileSync, writeFileSync } from 'node:fs';

const STEPS = ['需求', '运行', '方案', '生成', '分镜', '交付'];
const DOTS = [24, 100, 176, 252, 328, 404];
// 旧 5 步里高亮文字的 x → 新 6 步的步骤下标
const OLD_X_TO_NEW = { 33: 0, 113: 2, 206: 3, 273: 4 };
const OVERRIDE = { '08-RF-Deliver.svg': 5 };

for (const file of process.argv.slice(2)) {
  const name = file.split(/[\\/]/).pop();
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);

  const start = lines.findIndex((l) => /width="560" height="50" fill="#12151B"/.test(l));
  const end = lines.findIndex((l, i) => i > start && /y="109" width="560" height="1"/.test(l));
  if (start < 0 || end < 0) { console.log(`SKIP ${name}（找不到 StageBar 块）`); continue; }

  let cur = null;
  for (let i = start; i <= end; i++) {
    const m = lines[i].match(/<text x="(\d+)" y="89"[^>]*fill="#F2F5F9"/);
    if (m) { cur = OLD_X_TO_NEW[Number(m[1])]; break; }
  }
  if (cur === null || cur === undefined) { console.log(`SKIP ${name}（找不到高亮步）`); continue; }
  if (OVERRIDE[name] !== undefined) cur = OVERRIDE[name];

  const block = [];
  block.push('  <rect x="0" y="60" width="560" height="50" fill="#12151B"/>');
  for (let i = 0; i < STEPS.length; i++) {
    const D = DOTS[i];
    if (i === cur) {
      block.push(`  <rect x="${D - 12}" y="74" width="56" height="22" rx="6" fill="#16203A"/>`);
      block.push(`  <circle cx="${D}" cy="85" r="3.5" fill="#4C8DFF"/>`);
      block.push(`  <text x="${D + 10}" y="89" font-family="Noto Sans SC" font-size="11" fill="#F2F5F9">${STEPS[i]}</text>`);
    } else if (i < cur) {
      block.push(`  <circle cx="${D}" cy="85" r="3.5" fill="#3FB950"/>`);
      block.push(`  <text x="${D + 9}" y="89" font-family="Noto Sans SC" font-size="11" fill="#8A93A5">${STEPS[i]}</text>`);
    } else {
      block.push(`  <circle cx="${D}" cy="85" r="3.5" fill="#2D3035"/>`);
      block.push(`  <text x="${D + 9}" y="89" font-family="Noto Sans SC" font-size="11" fill="#5B6472">${STEPS[i]}</text>`);
    }
  }
  block.push(`  <text x="540" y="89" text-anchor="end" font-family="Inter" font-size="11" fill="#5B6472">${cur + 1} / 6</text>`);
  block.push('  <rect x="0" y="109" width="560" height="1" fill="#23262B"/>');

  const out = [...lines.slice(0, start), ...block, ...lines.slice(end + 1)].join('\n');
  writeFileSync(file, out, 'utf8');
  console.log(`OK   ${name}  当前步=${STEPS[cur]}  ${cur + 1}/6`);
}
