/**
 * shadcn/ui 源码 → 可拼进 client.js 的片段 + Tailwind CSS 字符串。
 * 裸 npm 依赖在此内联（R9）；产物目录 `generated/` 不含 import。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import autoprefixer from 'autoprefixer';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const here = dirname(fileURLToPath(import.meta.url));
const uiDir = join(here, 'ui');
const outDir = join(here, 'generated');

const banner = [
  '/* eslint-disable */',
  '// 由 src/client/build-ui.mjs 生成，请勿手改。',
].join('\n');

/**
 * Tailwind + shadcn + 工作台布局（@import workbench-layout.css）。
 * @returns {Promise<string>}
 */
async function buildTailwindCss() {
  const inputPath = join(uiDir, 'globals.css');
  const css = readFileSync(inputPath, 'utf8');
  const result = await postcss([
    tailwindcss({ config: join(uiDir, 'tailwind.config.cjs') }),
    autoprefixer(),
  ]).process(css, { from: inputPath });
  return result.css.replace(/\r\n/g, '\n').trim();
}

/**
 * @returns {string} IIFE 片段源码。
 */
async function buildUiBundle() {
  const entry = join(uiDir, 'register.jsx');
  const shim = join(uiDir, 'lib', 'react-shim.js');
  const jsxRuntime = join(uiDir, 'lib', 'jsx-runtime-shim.js');
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'react',
    alias: {
      react: shim,
      'react/jsx-runtime': jsxRuntime,
    },
    logLevel: 'warning',
  });
  let body = result.outputFiles[0].text;
  body = body.replace(/^export\s*\{\s*attachReelforgeUi\s*\}\s*;?\s*$/m, '');
  body = body.replace(/export\s+function attachReelforgeUi/g, 'function attachReelforgeUi');
  return `${banner}\n;(function (RF) {\n'use strict';\n${body}\nattachReelforgeUi(RF);\n})(RF);\n`;
}

/**
 * @returns {{ uiFragment: string, tailwindFragment: string }}
 */
export async function buildUiArtifacts() {
  mkdirSync(outDir, { recursive: true });
  const css = await buildTailwindCss();
  const uiFragment = await buildUiBundle();
  const tailwindFragment = `${banner}\n;(function (RF) {\n'use strict';\nRF.TAILWIND_STYLES = ${JSON.stringify(css)};\nRF.STYLES = RF.TAILWIND_STYLES;\n})(RF);\n`;
  writeFileSync(join(outDir, 'ui-shadcn.js'), uiFragment, 'utf8');
  writeFileSync(join(outDir, 'tailwind-styles.js'), tailwindFragment, 'utf8');
  return { uiFragment, tailwindFragment };
}

const isDirectRun = (() => {
  const entry = process.argv[1];
  if (typeof entry !== 'string' || entry === '') return false;
  try {
    return resolve(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  await buildUiArtifacts();
  process.stdout.write('ui-shadcn.js + tailwind-styles.js written\n');
}
