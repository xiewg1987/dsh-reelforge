/**
 * ReelForge RF7 · FigCraft 主稿构建器
 *
 * 纪律（design/README.md 真源顺序）：
 *   1) 流程只借鉴 infinite-creation，美术 100% 原创
 *   2) 全部美术资产在 ArtCraft 的 FigCraft 里长出来
 *   3) 颜色一律走 RF7 令牌变量（Dark/Light 双模式），不写死 hex
 *   4) 布局一律走 FigCraft 自动布局，不手算 y 坐标 → 不会文字溢出、不会大片留白
 *
 * 用法：node design/_tools/build-rf7.mjs
 * 产物：design/ReelForge-RF7.figcraft + design/{dark,light}/*.png|svg
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESIGN = path.resolve(HERE, '..');
const DOC = path.join(DESIGN, 'ReelForge-RF7.figcraft');
const FIG = 'C:\\Program Files\\FigCraft\\figcraft-cli.exe';

/* ───────────────────────── 令牌（唯一颜色真源） ───────────────────────── */

const TOKENS = {
  'rf-bg': { Dark: '#0A0C10', Light: '#F4F5F7' },
  'rf-surface': { Dark: '#141820', Light: '#FFFFFF' },
  'rf-surface-2': { Dark: '#10141C', Light: '#EBEDF2' },
  'rf-surface-3': { Dark: '#1C2230', Light: '#DDE1E8' },
  'rf-line': { Dark: '#252A34', Light: '#D0D4DC' },
  'rf-text-1': { Dark: '#EEF1F6', Light: '#121418' },
  'rf-text-2': { Dark: '#9AA3B2', Light: '#5C6370' },
  'rf-text-3': { Dark: '#6B7380', Light: '#8B919C' },
  'rf-accent': { Dark: '#5B8DEF', Light: '#3568D4' },
  'rf-accent-dim': { Dark: '#1A2744', Light: '#E3EBFA' },
  'rf-ok': { Dark: '#3DDC84', Light: '#1F9D55' },
  'rf-warn': { Dark: '#E5A045', Light: '#C7841A' },
  'rf-error': { Dark: '#F07178', Light: '#D92D20' },
  'rf-on-accent': { Dark: '#FFFFFF', Light: '#FFFFFF' },
};

const STEPS = ['需求', '运行', '方案', '生成', '分镜', '交付'];
const FONT = 'Noto Sans SC';
const W = 560;
const H = 900;

/* ───────────────────────── DSL ───────────────────────── */

const F = (name, p = {}, kids = []) => ({ t: 'frame', name, p, kids });
const R = (name, p = {}) => ({ t: 'rect', name, p });
const E = (name, p = {}) => ({ t: 'ell', name, p });
const T = (name, s, p = {}) => ({ t: 'text', name, s, p });

const ID_MAP = new Map();

/**
 * FigCraft 自动布局实测规则（design/_tools/_probe-layout*.mjs 探针结论）：
 *   · 没显式 sizing 的图层一律 100×100（不是 hug）→ 每轴都要显式给
 *   · 没有 fills 的 frame 默认白底 → 透明要写 fills: []
 *   · hug 只对「有自动布局的 frame」或文本合法
 *   · fill 需要父级有自动布局；主轴 fill 也能吃下剩余空间
 */
function resolve(node, theme, parentMeta) {
  const p = node.p || {};
  const props = {};
  const binds = [];
  // 父级宽度确定（fixed/fill）才能让子级 fill；父级自己 hug 时 fill 会归零
  const parentVertical = parentMeta?.lay === 'vertical';
  const parentDefinite = parentMeta?.sizingH === 'fixed' || parentMeta?.sizingH === 'fill';
  const canFill = parentVertical && parentDefinite;
  const hex = (tok) => {
    const t = TOKENS[tok];
    if (!t) throw new Error(`未知令牌 ${tok} @ ${node.name}`);
    return t[theme];
  };

  /* 填充：默认透明（FigCraft 默认白底，必须显式压掉） */
  if (p.fill === 'none') props.fills = [];
  else if (p.fill) { props.fills = [hex(p.fill)]; binds.push(['fill', p.fill]); }
  else if (node.t === 'text') { props.fills = [hex('rf-text-1')]; binds.push(['fill', 'rf-text-1']); }
  else props.fills = [];

  if (p.stroke === 'none') props.strokes = [];
  else if (p.stroke) {
    props.strokes = [hex(p.stroke)];
    props.strokeWeight = p.sw ?? 1;
    binds.push(['strokes/0/color', p.stroke]);
  }
  if (p.dash) props.dashes = [4, 3];
  if (p.r != null) props.cornerRadius = p.r;
  if (p.lay) props.layout = p.lay === 'v' ? 'vertical' : p.lay === 'h' ? 'horizontal' : p.lay;
  if (p.gap != null) props.gap = p.gap;
  if (p.pad != null) {
    // 数组语义：[上,右,下,左]；两元素按「上下 / 左右」对称解析
    const q = Array.isArray(p.pad)
      ? (p.pad.length === 2 ? [p.pad[0], p.pad[1], p.pad[0], p.pad[1]] : p.pad)
      : [p.pad, p.pad, p.pad, p.pad];
    props.paddingTop = q[0]; props.paddingRight = q[1];
    props.paddingBottom = q[2]; props.paddingLeft = q[3];
  }
  if (p.main) props.mainAlign = p.main;
  if (p.cross) props.crossAlign = p.cross;
  if (p.clip) props.clip = true;

  /* 尺寸 */
  if (node.t === 'text') {
    props.fontFamily = p.fam || FONT;
    props.fontSize = p.sz ?? 12;
    props.lineHeight = p.lh ?? 'auto';
    if (p.w != null) {
      // 定宽文本：用于表格列对齐（超宽则换行）
      props.width = p.w;
      props.sizingH = p.szH || 'fixed';
      props.textAutoResize = p.auto || 'height';
    } else {
      props.sizingH = p.szH || (canFill ? 'fill' : 'hug');
      props.textAutoResize = p.auto || (props.sizingH === 'fill' ? 'height' : 'widthAndHeight');
    }
    if (p.szV) props.sizingV = p.szV;
    if (p.wght) props.fontVariations = { wght: p.wght };
    if (p.align) props.textAlign = p.align;
  } else {
    props.sizingH = p.szH || (p.w != null ? 'fixed' : canFill ? 'fill' : 'hug');
    props.sizingV = p.szV || (p.h != null ? 'fixed' : 'hug');
    if (p.w != null) props.width = p.w;
    if (p.h != null) props.height = p.h;
  }
  return { props, binds, sizingH: props.sizingH };
}

/* ───────────────────────── FigCraft 驱动 ───────────────────────── */

let passNo = 0;

function run(cmds, { fresh = false } = {}) {
  const tmp = path.join(HERE, `.pass${String(passNo++).padStart(2, '0')}.json`);
  fs.writeFileSync(tmp, JSON.stringify(cmds, null, 1), 'utf8');
  const args = ['run', tmp];
  let outDoc = DOC;
  if (!fresh) {
    outDoc = path.join(HERE, '.doc.tmp.figcraft');
    args.push('--in', DOC);
  }
  args.push('--out', outDoc, '--automation-read-root', DESIGN, '--automation-write-root', DESIGN);
  let stdout = '';
  try {
    stdout = execFileSync(FIG, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const bad = String(err.stdout || '').split(/\r?\n/).filter((l) => l.includes('"ok":false'));
    console.error(`✗ 第 ${passNo - 1} 趟失败：${bad[0] || err.message}`);
    throw err;
  }
  if (!fresh) {
    fs.copyFileSync(outDoc, DOC);
    fs.rmSync(outDoc, { force: true });
  }
  return stdout.split(/\r?\n/).filter((l) => l.trim().startsWith('{')).map((l) => JSON.parse(l));
}

/** 建一棵子树：逐层下发命令，逐层抓 id */
function buildTree(nodes, parentId, theme, keyBase, binds) {
  const metaOf = new Map(); // id → {lay, sizingH}
  let level = nodes.map((n, i) => ({ n, parent: parentId, key: `${keyBase}.${i}` }));
  while (level.length) {
    const resolved = [];
    const cmds = level.map(({ n, parent, key }) => {
      const r = resolve(n, theme, metaOf.get(parent));
      resolved.push(r);
      r.binds.forEach(([field, v]) => binds.push({ key, field, var: v }));
      const params = {
        type: n.t === 'text' ? 'text' : n.t === 'ell' ? 'ellipse' : n.t === 'rect' ? 'rectangle' : 'frame',
        name: n.name, parent, props: r.props,
      };
      if (n.t === 'text') params.text = n.s;
      if (n.p?.xy) { params.x = n.p.xy[0]; params.y = n.p.xy[1]; }
      return { command: 'node.create', params };
    });
    const out = run(cmds);
    out.forEach((r, i) => {
      if (!r.ok) throw new Error(`建节点失败 ${level[i].n.name}: ${r.error}`);
      level[i].id = r.result.id;
      ID_MAP.set(level[i].key, r.result.id);
      const l = level[i].n.p?.lay;
      metaOf.set(r.result.id, {
        lay: l === 'v' ? 'vertical' : l === 'h' ? 'horizontal' : undefined,
        sizingH: resolved[i].sizingH,
      });
    });
    const next = [];
    level.forEach(({ n, key, id }) => {
      (n.kids || []).forEach((kid, j) => next.push({ n: kid, parent: id, key: `${key}.${j}` }));
    });
    level = next;
  }
}

/* ───────────────────────── 复用组件 ───────────────────────── */

function filmMark() {
  return F('RF/FilmMark', { w: 28, h: 28, r: 8, fill: 'rf-accent-dim', lay: 'h', main: 'center', cross: 'center' }, [
    R('FilmMark-core', { w: 12, h: 12, r: 3, fill: 'rf-accent' }),
  ]);
}

function statusPill(label, tone = 'neutral') {
  const map = {
    neutral: ['rf-surface-3', 'rf-text-2'],
    accent: ['rf-accent-dim', 'rf-accent'],
    ok: ['rf-surface-3', 'rf-ok'],
    warn: ['rf-surface-3', 'rf-warn'],
  };
  const [bg, fg] = map[tone] || map.neutral;
  return F('RF/StatusPill', { r: 6, fill: bg, lay: 'h', pad: [5, 10], cross: 'center' }, [
    T('Pill-label', label, { sz: 10, fill: fg }),
  ]);
}

function header(title, sub, pill) {
  return F('RF/Header', { h: 60, fill: 'rf-bg', lay: 'h', pad: [0, 20], gap: 12, cross: 'center' }, [
    filmMark(),
    F('Header-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
      T('Header-title', title, { sz: 14, wght: 600, fill: 'rf-text-1' }),
      T('Header-sub', sub, { sz: 10, fill: 'rf-text-3' }),
    ]),
    statusPill(pill.label, pill.tone),
  ]);
}

function stageRail(current) {
  const kids = STEPS.map((label, i) => {
    const state = i < current ? 'done' : i === current ? 'now' : 'todo';
    const dotFill = state === 'done' ? 'rf-ok' : state === 'now' ? 'rf-accent' : 'rf-line';
    const textFill = state === 'done' ? 'rf-text-2' : state === 'now' ? 'rf-accent' : 'rf-text-3';
    return F(`Stage-${i + 1}-${label}`, { w: 56, lay: 'h', gap: 5, cross: 'center' }, [
      E(`Dot-${i + 1}`, { w: 7, h: 7, fill: dotFill }),
      F(`StepLabel-${i + 1}`, {
        r: 6, lay: 'h', pad: state === 'now' ? [3, 6] : 0, cross: 'center',
        fill: state === 'now' ? 'rf-accent-dim' : undefined,
      }, [
        T(`StepText-${i + 1}`, label, { sz: 10, wght: state === 'now' ? 600 : 400, fill: textFill }),
      ]),
    ]);
  });
  return F('RF/StageRail', { h: 50, fill: 'rf-surface-2', lay: 'h', pad: [0, 20, 0, 24], gap: 20, cross: 'center' }, [
    F('Stage-steps', { lay: 'h', gap: 20, cross: 'center' }, kids),
    F('Stage-counter', { lay: 'h', szH: 'fill', main: 'max', cross: 'center' }, [
      T('Counter', `${current + 1} / ${STEPS.length}`, { sz: 10, fill: 'rf-text-3' }),
    ]),
  ]);
}

function tabBar(active = '枢纽') {
  const items = ['枢纽', '章节', '素材', '分镜', '上下文', '成片', '日志'];
  return F('RF/TabBar', { h: 44, fill: 'rf-bg', lay: 'h', pad: [0, 20], gap: 12, cross: 'center' }, [
    ...items.map((label) => {
      const on = label === active;
      return F(`Tab-${label}`, { lay: 'h', cross: 'center' }, [
        F(`TabChip-${label}`, {
          r: 6, lay: 'h', pad: [4, 8], cross: 'center',
          fill: on ? 'rf-accent-dim' : 'none',
        }, [
          T(`TabText-${label}`, label, { sz: 12, wght: on ? 600 : 400, fill: on ? 'rf-accent' : 'rf-text-2' }),
        ]),
      ]);
    }),
  ]);
}

function primaryButton(label, { disabled = false } = {}) {
  return F('RF/Button/Primary', {
    h: 40, r: 8, lay: 'h', pad: [0, 16], main: 'center', cross: 'center',
    fill: disabled ? 'rf-surface-3' : 'rf-accent',
  }, [
    T('Button-label', label, { sz: 12, wght: 600, fill: disabled ? 'rf-text-3' : 'rf-on-accent' }),
  ]);
}

function ghostButton(label) {
  return F('RF/Button/Ghost', { h: 28, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], main: 'center', cross: 'center' }, [
    T('Ghost-label', label, { sz: 10, fill: 'rf-text-2' }),
  ]);
}

function footer(label, copy, button, { disabled = false } = {}) {
  return F('RF/Footer', { h: 70, fill: 'rf-surface-2', lay: 'h', pad: [0, 20], gap: 12, cross: 'center' }, [
    F('Footer-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
      T('Footer-label', label, { sz: 10, fill: 'rf-text-3' }),
      T('Footer-main', copy, { sz: 13, wght: 600, fill: 'rf-text-1' }),
    ]),
    primaryButton(button, { disabled }),
  ]);
}

function scroll(kids) {
  return F('RF/Scroll', { lay: 'v', pad: 20, gap: 16, szV: 'fill', fill: 'rf-bg', clip: true }, kids);
}

function sectionHead(title, sub) {
  const kids = [T('Sec-title', title, { sz: 13, wght: 600, fill: 'rf-text-1' })];
  if (sub) kids.push(T('Sec-sub', sub, { sz: 10, fill: 'rf-text-3' }));
  return F('RF/SectionHead', { lay: 'v', gap: 4 }, kids);
}

function card(kids, { name = 'RF/Card', h = null, stroke = 'rf-line', fill = 'rf-surface', pad = 14, gap = 10, lay = 'v', dash = false } = {}) {
  const p = { r: 10, lay, pad, gap, szH: 'fill', fill, stroke, sw: 1 };
  if (h) p.h = h;
  if (dash) p.dash = true;
  return F(name, p, kids);
}

function radio(selected) {
  const kids = [E('Radio-ring', { w: 16, h: 16, fill: 'none', stroke: selected ? 'rf-accent' : 'rf-line', sw: 1.5 })];
  if (selected) kids.push(E('Radio-dot', { w: 7, h: 7, fill: 'rf-accent' }));
  return F('RF/Radio', { w: 16, h: 16, fill: 'none', lay: 'h', main: 'center', cross: 'center' }, kids);
}

function chatSync(text) {
  return F('RF/ChatSyncLine', { lay: 'h' }, [T('Sync-text', text, { sz: 10, fill: 'rf-text-3' })]);
}

/* ───────────────────────── 板 01 RunGate ───────────────────────── */

function boardRunGate() {
  const localCard = card([
    F('Local-row', { lay: 'h', gap: 8, cross: 'center' }, [
      radio(true),
      T('Local-title', '本地运行', { sz: 13, wght: 600, fill: 'rf-text-1' }),
    ]),
    T('Local-sub', 'ComfyUI · 本机', { sz: 10, fill: 'rf-text-3' }),
    T('Local-fact-1', '· 数据不出本机', { sz: 10, fill: 'rf-ok' }),
    T('Local-fact-2', '· 无按次计费', { sz: 10, fill: 'rf-ok' }),
  ], { name: 'RF/RunGateCard', h: 138 });

  const cloudCard = card([
    F('Cloud-row', { lay: 'h', gap: 8, cross: 'center' }, [
      radio(false),
      T('Cloud-title', '云端运行', { sz: 13, wght: 600, fill: 'rf-text-1' }),
    ]),
    T('Cloud-sub', '托管工作流 · 按需调度', { sz: 10, fill: 'rf-text-3' }),
    T('Cloud-fact-1', '· 无需 GPU', { sz: 10, fill: 'rf-ok' }),
    T('Cloud-fact-2', '· 按次计费', { sz: 10, fill: 'rf-warn' }),
  ], { name: 'RF/RunGateCard', h: 138 });

  return F('RF-RunGate', { w: W, h: H, xy: [0, 0], lay: 'v', fill: 'rf-bg', clip: true }, [
    header('启动检查', '首次启动 · 环境就绪', { label: '4 / 6 通过', tone: 'warn' }),
    stageRail(1),
    scroll([
      card([
        F('Gate-sum-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
          F('Gate-sum-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
            T('Gate-sum-title', '环境检查', { sz: 13, wght: 600, fill: 'rf-text-1' }),
            T('Gate-sum-meta', '6 项检查 · 4 通过 · 1 警告 · 1 未配置', { sz: 10, fill: 'rf-text-3' }),
          ]),
          ghostButton('重跑检查'),
        ]),
        progressBar(340),
      ], { name: 'RF/CheckSummary', gap: 10 }),
      sectionHead('执行位置', '同一批 kind，差别只在跑在哪、算不算钱'),
      F('Gate-cards', { lay: 'h', gap: 12, szH: 'fill' }, [localCard, cloudCard]),
      sectionHead('检查项'),
      card([
        kvRow('ComfyUI 服务', '0.3.18 · 127.0.0.1:8188', '通过', 'rf-ok'),
        kvRow('LLM 接口', 'deepseek-v4-flash-vision', '通过', 'rf-ok'),
        kvRow('Agent 运行时', '内置 openclaude', '通过', 'rf-ok'),
        kvRow('ffmpeg', '7.1', '通过', 'rf-ok'),
        kvRow('磁盘可用', '218 GB', '通过', 'rf-ok'),
        kvRow('显存预估', '视频需 12 GB', '警告', 'rf-warn'),
        kvRow('云端账号', 'RunningHub', '未配置', 'rf-text-3'),
      ], { name: 'RF/CheckList', gap: 10 }),
      card([
        T('Notice-main', '探测只在本机跑 · 不上传任何文件', { sz: 11, fill: 'rf-text-2' }),
        T('Notice-sub', '不符合本机要求时，可跳过探测直接走云端', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12, gap: 4 }),
    ]),
    footer('下一步', '全部通过即可开跑', '开始生产'),
  ]);
}
/* ───────────────────────── 板 02 Hub ───────────────────────── */

function boardHub() {
  const stat = (caption, value, sub) => F('Hub-stat', { lay: 'v', gap: 4, szH: 'fill' }, [
    T('Stat-caption', caption, { sz: 10, fill: 'rf-text-3' }),
    T('Stat-value', value, { sz: 13, wght: 600, fill: 'rf-text-1' }),
    T('Stat-sub', sub, { sz: 10, fill: 'rf-text-2' }),
  ]);

  const hubStrip = card([
    stat('成本', '¥ 4.60', 'image × 12'),
    R('Hub-divider', { w: 1, h: 42, fill: 'rf-line' }),
    stat('当前阶段', 'image', '第 1 章 · 4 / 5 步'),
  ], { name: 'RF/HubStrip', lay: 'h', gap: 14, pad: 14, cross: 'center' });

  const chapter = card([
    F('Chapter-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
      F('Chapter-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
        T('Chapter-title', '第 1 章 · 风起', { sz: 12, wght: 600, fill: 'rf-text-1' }),
        T('Chapter-sub', '8 镜 · 02:14 · 分镜已定稿', { sz: 10, fill: 'rf-text-3' }),
      ]),
      statusPill('生成中', 'accent'),
    ]),
    F('Progress-track', { h: 6, r: 3, fill: 'rf-surface-3', lay: 'h', szH: 'fill' }, [
      R('Progress-fill', { w: 168, h: 6, r: 3, fill: 'rf-accent' }),
    ]),
  ], { name: 'RF/ChapterRail', gap: 12 });

  const shotChip = (id, size, state, tone) => card([
    T('Shot-id', id, { sz: 10, fill: 'rf-text-3' }),
    T('Shot-size', size, { sz: 12, wght: 600, fill: 'rf-text-1' }),
    F('Shot-state', { lay: 'h', gap: 6, cross: 'center' }, [
      E('Shot-dot', { w: 6, h: 6, fill: tone }),
      T('Shot-state-text', state, { sz: 10, fill: 'rf-text-2' }),
    ]),
  ], { name: 'RF/ShotChip', pad: 12, gap: 6 });

  return F('RF-Hub', { w: W, h: H, xy: [W + 80, 0], lay: 'v', fill: 'rf-bg', clip: true }, [
    header('枢纽', '章节 · 镜头摘要 · 成本', { label: '进行中', tone: 'accent' }),
    stageRail(3),
    tabBar('枢纽'),
    scroll([
      hubStrip,
      chatSync('对话已同步：第 1 章 bible 写入上下文'),
      sectionHead('章节进度'),
      chapter,
      sectionHead('镜头脚本', '按章 idx'),
      F('Shot-row-1', { lay: 'h', gap: 12, szH: 'fill' }, [
        shotChip('C1-S01', '全景', '已出图', 'rf-ok'),
        shotChip('C1-S02', '中景', '已出图', 'rf-ok'),
      ]),
      F('Shot-row-2', { lay: 'h', gap: 12, szH: 'fill' }, [
        shotChip('C1-S03', '特写', '生成中', 'rf-accent'),
        shotChip('C1-S04', '过肩', '排队中', 'rf-line'),
      ]),
      F('Shot-row-3', { lay: 'h', gap: 12, szH: 'fill' }, [
        shotChip('C1-S05', '中近', '排队中', 'rf-line'),
        shotChip('C1-S06', '远景', '排队中', 'rf-line'),
      ]),
      F('Shot-more', { lay: 'h', gap: 6, cross: 'center' }, [
        T('Shot-more-text', '还有 2 镜待生成', { sz: 10, fill: 'rf-text-3' }),
        T('Shot-more-link', '查看全部 8 镜', { sz: 10, fill: 'rf-accent' }),
      ]),
    ]),
    footer('当前阶段', '第 1 章生成中 · 成片未就绪', '查看成片', { disabled: true }),
  ]);
}

/* ───────────────────────── 板 03 Intake ───────────────────────── */

function boardIntake() {
  const chapterRow = (idx, title, meta) => card([
    T('Row-idx', idx, { sz: 11, fill: 'rf-text-3' }),
    F('Row-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
      T('Row-title', title, { sz: 12, wght: 600, fill: 'rf-text-1' }),
      T('Row-meta', meta, { sz: 10, fill: 'rf-text-3' }),
    ]),
    T('Row-action', '导入', { sz: 11, fill: 'rf-accent' }),
  ], { name: 'RF/ChapterPickRow', h: 54, pad: 12, gap: 10, lay: 'h', cross: 'center' });

  const setting = (caption, value) => F('Setting-cell', { lay: 'v', gap: 3 }, [
    T('Setting-caption', caption, { sz: 10, fill: 'rf-text-3' }),
    T('Setting-value', value, { sz: 12, fill: 'rf-text-1' }),
  ]);

  return F('RF-Intake', { w: W, h: H, xy: [(W + 80) * 2, 0], lay: 'v', fill: 'rf-bg', clip: true }, [
    header('新建项目', '小说 · 剧本 · 一句话', { label: '待导入', tone: 'neutral' }),
    stageRail(0),
    scroll([
      card([
        F('Intake-name', { h: 34, r: 8, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], cross: 'center' }, [
          T('Intake-name-text', '项目名，例如《妈妈的时间》', { sz: 11, fill: 'rf-text-3' }),
        ]),
        T('Intake-label', '画风', { sz: 10, fill: 'rf-text-3' }),
        chipRow(['写实', '二次元', '国漫', '3D', '悬疑']),
      ], { name: 'RF/ProjectSetup', gap: 10 }),
      card([
        T('Area-placeholder', '粘贴小说原文，或上传 .txt；一句话想法也行', { sz: 11, fill: 'rf-text-3' }),
        T('Area-hint', '自动拆章 · 一章一集 · 可从对话直接导入', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/TextArea', h: 110, pad: 12, gap: 6, dash: true }),
      card([
        setting('分辨率', '768P'),
        R('Set-divider-1', { w: 1, h: 30, fill: 'rf-line' }),
        setting('比例', '9 : 16'),
        R('Set-divider-2', { w: 1, h: 30, fill: 'rf-line' }),
        setting('背景音乐', '生成'),
      ], { name: 'RF/ProjectSettings', lay: 'h', gap: 14, pad: 12, cross: 'center' }),
      sectionHead('参考图片素材', '可选 · 品牌 / 产品 / 角色定妆'),
      card([
        F('Ref-row', { lay: 'h', gap: 10, cross: 'center' }, [
          thumbBox('参考图', { w: 48, h: 48 }),
          F('Ref-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
            T('Ref-name', 'sk2-gift-box.jpg', { sz: 11, fill: 'rf-text-1' }),
            T('Ref-use', '用途：产品参考，生成时保持外观一致', { sz: 10, fill: 'rf-text-3' }),
          ]),
          ghostButton('移除'),
        ]),
        F('Ref-add', { h: 32, r: 8, fill: 'rf-surface-2', stroke: 'rf-line', sw: 1, dash: true, lay: 'h', main: 'center', cross: 'center' }, [
          T('Ref-add-text', '+ 选择参考图片', { sz: 10, fill: 'rf-text-3' }),
        ]),
      ], { name: 'RF/ReferenceInput', gap: 10 }),
      sectionHead('章节预览', '2 章 · 15 段'),
      F('Chapter-rows', { lay: 'v', gap: 8, szH: 'fill' }, [
        chapterRow('01', '风起', '3.2 万字 · 预计 8 段'),
        chapterRow('02', '归途', '2.8 万字 · 预计 7 段'),
      ]),
      chatSync('对话已同步：正文已写入项目'),
    ]),
    footer('下一步', '拆章并建立项目', '创建并打开'),
  ]);
}

/* ───────────────────────── 通用零件 ───────────────────────── */

function kvRow(label, value, state, tone, right) {
  const kids = [
    T('Kv-label', label, { sz: 11, fill: 'rf-text-2', w: 104 }),
    T('Kv-value', value, { sz: 11, fill: 'rf-text-1', szH: 'fill', auto: 'height' }),
  ];
  if (state) kids.push(T('Kv-state', state, { sz: 11, fill: tone || 'rf-text-3' }));
  if (right) kids.push(right);
  return F('RF/KvRow', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, kids);
}

function listRow(title, meta, right, { name = 'RF/ListRow', gap = 4 } = {}) {
  return F(name, { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
    F('Row-copy', { lay: 'v', gap, szH: 'fill' }, [
      T('Row-title', title, { sz: 12, wght: 600, fill: 'rf-text-1' }),
      meta ? T('Row-meta', meta, { sz: 10, fill: 'rf-text-3' }) : null,
    ].filter(Boolean)),
    right || null,
  ].filter(Boolean));
}

function progressBar(width, tone = 'rf-accent') {
  return F('RF/ProgressBar', { h: 6, r: 3, fill: 'rf-surface-3', lay: 'h', szH: 'fill' }, [
    R('Progress-fill', { w: width, h: 6, r: 3, fill: tone }),
  ]);
}

function checkbox(checked) {
  return F('RF/Checkbox', {
    w: 16, h: 16, r: 4, fill: checked ? 'rf-accent' : 'rf-surface',
    stroke: checked ? 'rf-accent' : 'rf-line', sw: 1.5,
    lay: 'h', main: 'center', cross: 'center',
  }, checked ? [E('Checkbox-tick', { w: 6, h: 6, fill: 'rf-on-accent' })] : []);
}

function thumbBox(label, { w = 64, h = 64, tone = 'rf-surface-3' } = {}) {
  return F('RF/Thumb', { w, h, r: 8, fill: tone, lay: 'h', main: 'center', cross: 'center' }, [
    T('Thumb-label', label, { sz: 9, fill: 'rf-text-3' }),
  ]);
}

function playerBar(duration, { w = 200 } = {}) {
  return F('RF/PlayerBar', { h: 32, r: 16, fill: 'rf-surface-3', lay: 'h', pad: [0, 12], gap: 8, cross: 'center' }, [
    E('Player-play', { w: 10, h: 10, fill: 'rf-text-2' }),
    T('Player-time', `0:00 / ${duration}`, { sz: 10, fill: 'rf-text-2' }),
  ]);
}

function codeBox(lines) {
  return F('RF/CodeBox', { r: 8, fill: 'rf-surface-2', stroke: 'none', lay: 'v', pad: 10, gap: 4 }, [
    ...lines.map((t, i) => T(`Code-line-${i}`, t, { sz: 10, fill: 'rf-text-2' })),
  ]);
}

function chipRow(items, activeIndex = 0) {
  return F('RF/ChipRow', { lay: 'h', gap: 8, szH: 'fill' }, items.map((label, i) => F(`Chip-${i}`, {
    r: 6, lay: 'h', pad: [4, 8], cross: 'center', fill: i === activeIndex ? 'rf-accent-dim' : 'none',
  }, [
    T(`Chip-text-${i}`, label, { sz: 10, wght: i === activeIndex ? 600 : 400, fill: i === activeIndex ? 'rf-accent' : 'rf-text-2' }),
  ])));
}

/* ───────────────────────── 板 03 Stages 生成执行 ───────────────────────── */

function boardStages() {
  const stageRow = (name, desc, state, tone, pct) => F(`StageRow-${name}`, { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
    checkbox(state === '已完成' || state === '运行中'),
    F('StageRow-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
      T('StageRow-name', name, { sz: 12, wght: 600, fill: 'rf-text-1' }),
      T('StageRow-desc', desc, { sz: 10, fill: 'rf-text-3' }),
    ]),
    T('StageRow-state', state, { sz: 11, fill: tone }),
  ]);

  const queueRow = (title, meta, tone) => F('Queue-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
    E('Queue-dot', { w: 6, h: 6, fill: tone }),
    T('Queue-title', title, { sz: 11, fill: 'rf-text-1', szH: 'fill' }),
    T('Queue-meta', meta, { sz: 10, fill: 'rf-text-3' }),
  ]);

  return F('RF-Stages', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('生成执行', '四阶段 · 实时进度', { label: '生成中', tone: 'accent' }),
    stageRail(3),
    scroll([
      card([
        F('Stage-bar', { lay: 'h', gap: 4, szH: 'fill' }, [
          R('Seg-llm', { w: 120, h: 6, r: 3, fill: 'rf-ok' }),
          R('Seg-image', { w: 150, h: 6, r: 3, fill: 'rf-accent' }),
          R('Seg-tts', { w: 120, h: 6, r: 3, fill: 'rf-surface-3' }),
          R('Seg-video', { w: 90, h: 6, r: 3, fill: 'rf-surface-3' }),
        ]),
        F('Stage-legend', { lay: 'h', gap: 8, cross: 'center', szH: 'fill' }, [
          T('Leg-1', 'llm 完成', { sz: 10, fill: 'rf-ok' }),
          T('Leg-2', 'image 3/12', { sz: 10, fill: 'rf-accent' }),
          T('Leg-3', 'tts 待跑', { sz: 10, fill: 'rf-text-3' }),
          T('Leg-4', 'video 待跑', { sz: 10, fill: 'rf-text-3' }),
        ]),
      ], { name: 'RF/StageProgress', gap: 10 }),
      card([
        F('Now-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
          F('Now-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
            T('Now-title', '正在生成 · 第 3 / 12 张', { sz: 13, wght: 600, fill: 'rf-text-1' }),
            T('Now-sub', '阿岚 · 场景参考图 · seed 8831661447', { sz: 10, fill: 'rf-text-3' }),
          ]),
          statusPill('image', 'accent'),
        ]),
        progressBar(210),
        F('Now-meta', { lay: 'h', gap: 12, cross: 'center' }, [
          T('Now-gpu', 'GPU 62%', { sz: 10, fill: 'rf-text-2' }),
          T('Now-vram', '显存 12.4 / 16 GB', { sz: 10, fill: 'rf-text-2' }),
          T('Now-eta', '预计剩余 8 分', { sz: 10, fill: 'rf-text-3' }),
        ]),
      ], { name: 'RF/CurrentTask', gap: 10 }),
      sectionHead('队列', '接下来 4 个任务'),
      card([
        queueRow('程予 · 场景参考图', '2 分后', 'rf-text-3'),
        queueRow('玉佩 · 道具图', '4 分后', 'rf-text-3'),
        queueRow('老巷 · 场景参考图', '6 分后', 'rf-text-3'),
        queueRow('阿岚 · 年轻期变体', '9 分后', 'rf-text-3'),
      ], { name: 'RF/QueueList', pad: 12, gap: 9 }),
      sectionHead('本次要跑的阶段'),
      card([
        stageRow('llm · 文本创作', '人物圣经 / 风格 / 拆章 / 拆分镜', '已完成', 'rf-ok'),
        stageRow('image · 资产生图', '人物 / 场景 / 道具 + 服装年龄变体', '运行中', 'rf-accent'),
        stageRow('tts · 音色设计', '只给有台词的角色设计音色', '待跑', 'rf-text-3'),
        stageRow('video · 分镜视频', '硬依赖 image；软依赖 tts', '待跑', 'rf-text-3'),
      ], { name: 'RF/StagePicker', gap: 11 }),
      card([
        T('Mem-main', '每 3 次生成后自动释放 ComfyUI 显存', { sz: 11, fill: 'rf-text-2' }),
        T('Mem-sub', '下一批会重新加载模型（约 1–3 分）；也可立即释放', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12, gap: 4 }),
    ]),
    footer('当前阶段', 'image · 3 / 12 · 已用 12 分', '暂停生成'),
  ]);
}

/* ───────────────────────── 板 04 ShotDetail 分镜详情 ───────────────────────── */

function boardShotDetail() {
  return F('RF-ShotDetail', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('分镜详情', '第 1 章 · 分镜 1', { label: '已生成', tone: 'ok' }),
    stageRail(4),
    scroll([
      card([
        T('Shot-title', '分镜 1 · 【场景 01】城门官道 · 清晨薄雾', { sz: 13, wght: 600, fill: 'rf-text-1' }),
        T('Shot-meta', '时长 12s · 768P · 9:16 · seed 8831661447', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/ShotHead', gap: 6 }),
      sectionHead('参考素材', '角色 / 场景 / 道具 / 服装 / 语音（仅台词角色）'),
      card([
        F('Ref-row', { lay: 'h', gap: 10, cross: 'center' }, [
          thumbBox('顾析杏', { w: 58, h: 58 }),
          thumbBox('官道', { w: 58, h: 58 }),
          thumbBox('车厢', { w: 58, h: 58 }),
          F('Ref-gap', { lay: 'h', szH: 'fill' }),
          playerBar('0:07', { w: 160 }),
        ]),
      ], { name: 'RF/ReferenceRow', pad: 12, gap: 10 }),
      sectionHead('提示词 & 分镜脚本'),
      card([
        T('Script-lens', '镜头：PUSH IN', { sz: 11, fill: 'rf-text-1' }),
        T('Script-scene', '画面：薄雾中的官道全景，马车沿石板官道驶近；切入车厢内。', { sz: 11, fill: 'rf-text-2' }),
        T('Script-line', '台词：顾析杏（心声）：竟穿进了看过的书里，成了人人厌烦的苦千金。', { sz: 11, fill: 'rf-text-2' }),
        T('Script-sub-label', '子镜头', { sz: 11, wght: 600, fill: 'rf-text-1' }),
        T('Script-sub-1', '[0–4s] 官道大全景，运镜缓推', { sz: 10, fill: 'rf-text-3' }),
        T('Script-sub-2', '[4–8s] 车厢内，抬手掀开车帘', { sz: 10, fill: 'rf-text-3' }),
        T('Script-sub-3', '[8–12s] 放下车帘，低头看向掌心', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/ScriptCard', gap: 7 }),
      sectionHead('视频提示词'),
      codeBox([
        '__MINIMAX_H3_REF_1__ is the character reference for 顾析杏…',
        '__MINIMAX_H3_REF_2__ is the misty city-gate causeway at dawn…',
        '__MINIMAX_H3_REF_3__ is the interior of an ancient wooden carriage…',
        '0–4s: wide establishing shot … 8–12s: she lowers the blind …',
      ]),
    ]),
    footer('分镜', '8 镜 · 1 待审', '重新生成此镜'),
  ]);
}

/* ───────────────────────── 板 05 Music 背景音乐 ───────────────────────── */

function boardMusic() {
  const musicCard = (title, meta, applied, duration) => card([
    F('Music-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
      F('Music-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
        T('Music-title', title, { sz: 12, wght: 600, fill: 'rf-text-1' }),
        T('Music-meta', meta, { sz: 10, fill: 'rf-text-3' }),
      ]),
      applied ? statusPill('已应用', 'ok') : null,
    ].filter(Boolean)),
    playerBar(duration, { w: 180 }),
    F('Music-actions', { lay: 'h', gap: 8 }, [
      ghostButton('预览'),
      F('RF/Button/Ghost', { h: 28, r: 6, fill: 'rf-accent-dim', lay: 'h', pad: [0, 10], main: 'center', cross: 'center' }, [
        T('Apply-label', '应用到章节', { sz: 10, fill: 'rf-accent' }),
      ]),
    ]),
  ], { name: 'RF/MusicCard', gap: 10 });

  return F('RF-Music', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('背景音乐', '生成 · 试听 · 应用', { label: '2 条', tone: 'neutral' }),
    stageRail(5),
    scroll([
      card([
        T('Gen-label', '生成新的背景音乐', { sz: 12, wght: 600, fill: 'rf-text-1' }),
        F('Gen-field', { h: 34, r: 8, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], cross: 'center' }, [
          T('Gen-placeholder', '描述想要的音乐，如「克制钢琴，冷调，渐强」', { sz: 11, fill: 'rf-text-3' }),
        ]),
        F('Gen-row', { lay: 'h', gap: 8, cross: 'center' }, [
          chipRow(['纯音乐', '带人声', '钢琴', '弦乐']),
          F('Gen-gap', { lay: 'h', szH: 'fill' }),
          F('RF/Button/Primary', { h: 32, r: 8, fill: 'rf-accent', lay: 'h', pad: [0, 14], main: 'center', cross: 'center' }, [
            T('Gen-btn', '生成', { sz: 11, wght: 600, fill: 'rf-on-accent' }),
          ]),
        ]),
      ], { name: 'RF/MusicGenerator', gap: 10 }),
      sectionHead('音乐库', '一次生成可应用到多个章节'),
      musicCard('夜雨里的琴', '纯音乐 · 2:14 · 克制钢琴', true, '2:14'),
      musicCard('远山与风', '纯音乐 · 1:48 · 弦乐渐强', false, '1:48'),
      card([
        T('Music-note', '应用后会随成片一起合成；替换不删除原曲，可随时换回。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12 }),
    ]),
    footer('交付', '2 条音乐 · 1 条已应用到第 1 章', '应用到第 1 章'),
  ]);
}

/* ───────────────────────── 板 06 Skills 技能与工作流 ───────────────────────── */

function boardSkills() {
  const skillRow = (name, source, state, tone) => listRow(name, source, T('Skill-state', state, { sz: 11, fill: tone }), { name: 'RF/SkillRow' });

  return F('RF-Skills', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('技能与工作流', '装好的技能 · 新的工作流', { label: '6 已装', tone: 'neutral' }),
    stageRail(3),
    scroll([
      sectionHead('已装技能', '6 个 · 1 个待装'),
      card([
        skillRow('novel-to-video', '本地 · 总流水线', '可用', 'rf-ok'),
        skillRow('story-pipeline', '本地 · 小说→分镜', '可用', 'rf-ok'),
        skillRow('image-prompt', '本地 · 图提示词', '可用', 'rf-ok'),
        skillRow('video-prompt', '本地 · 视频提示词', '可用', 'rf-ok'),
        skillRow('voice-design', '本地 · 音色规范', '可用', 'rf-ok'),
        skillRow('minimax-h3-official', '官方 · H3 提示词', '待装', 'rf-text-3'),
      ], { name: 'RF/SkillList', gap: 10 }),
      sectionHead('工作流自迭代', '粘贴 ComfyUI 工作流 JSON'),
      card([
        F('Wf-step', { lay: 'h', gap: 8, cross: 'center' }, [
          F('Wf-num', { w: 18, h: 18, r: 9, fill: 'rf-accent-dim', lay: 'h', main: 'center', cross: 'center' }, [
            T('Wf-num-text', '1', { sz: 10, fill: 'rf-accent' }),
          ]),
          T('Wf-step-text', '分析节点 · 推导工作流规格', { sz: 11, fill: 'rf-text-2' }),
        ]),
        F('Wf-step', { lay: 'h', gap: 8, cross: 'center' }, [
          F('Wf-num', { w: 18, h: 18, r: 9, fill: 'rf-accent-dim', lay: 'h', main: 'center', cross: 'center' }, [
            T('Wf-num-text', '2', { sz: 10, fill: 'rf-accent' }),
          ]),
          T('Wf-step-text', '注册工作流 · 起草 SKILL.md', { sz: 11, fill: 'rf-text-2' }),
        ]),
        F('Wf-drop', { h: 44, r: 8, fill: 'rf-surface-2', stroke: 'rf-line', sw: 1, dash: true, lay: 'h', main: 'center', cross: 'center' }, [
          T('Wf-drop-text', '把工作流 JSON 拖到这里', { sz: 11, fill: 'rf-text-3' }),
        ]),
        F('RF/Button/Primary', { h: 34, r: 8, fill: 'rf-accent', lay: 'h', pad: [0, 14], main: 'center', cross: 'center' }, [
          T('Wf-btn', '分析并注册', { sz: 11, wght: 600, fill: 'rf-on-accent' }),
        ]),
      ], { name: 'RF/WorkflowRegister', gap: 12 }),
      card([
        T('Skill-note', '新技能立刻可被 Agent 路由调用；不修改也能只注册工作流。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12 }),
    ]),
    footer('技能', '6 已装 · 1 待装', '安装新技能'),
  ]);
}

/* ───────────────────────── 板 07 Settings 服务配置 ───────────────────────── */

function boardSettings() {
  const field = (label, value, mask = false) => F('Set-field', { lay: 'v', gap: 4, szH: 'fill' }, [
    T('Set-label', label, { sz: 10, fill: 'rf-text-3' }),
    F('Set-input', { h: 32, r: 8, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], cross: 'center' }, [
      T('Set-value', value, { sz: 11, fill: mask ? 'rf-text-2' : 'rf-text-1' }),
    ]),
  ]);

  return F('RF-Settings', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('服务配置', 'ComfyUI · LLM · 运行时', { label: '3 项待测', tone: 'warn' }),
    stageRail(1),
    scroll([
      sectionHead('ComfyUI', '本地渲染服务'),
      card([
        field('服务地址', 'http://127.0.0.1:8188'),
        F('Set-actions', { lay: 'h', gap: 8, cross: 'center' }, [
          ghostButton('测试连接'),
          T('Set-hint', '未测试', { sz: 10, fill: 'rf-text-3' }),
        ]),
      ], { name: 'RF/SettingGroup', gap: 10 }),
      sectionHead('LLM（OpenAI 兼容）', 'Agent 的大脑'),
      card([
        F('Set-two', { lay: 'h', gap: 10, szH: 'fill' }, [
          field('Base URL', 'https://api.deepseek.com/v1'),
          field('模型', 'deepseek-v4-flash-vision'),
        ]),
        field('API Key', 'sk-••••••••••••', true),
      ], { name: 'RF/SettingGroup', gap: 10 }),
      sectionHead('Agent 运行时', '默认内置，也可交给本机 CLI'),
      card([
        chipRow(['内置 openclaude', 'Claude Code', 'Codex', 'Gemini', '自定义']),
      ], { name: 'RF/SettingGroup', gap: 10 }),
      sectionHead('生成维护'),
      card([
        kvRow('显存释放间隔', '3 次', '可调', 'rf-text-2', ghostButton('修改')),
        kvRow('单任务超时', '90 分钟', '', 'rf-text-2'),
        kvRow('RunningHub Key', '未配置', '未登录', 'rf-warn', ghostButton('去设置')),
      ], { name: 'RF/SettingGroup', gap: 10 }),
    ]),
    footer('设置', '已保存 · 3 项待测', '保存并重测'),
  ]);
}

/* ───────────────────────── 板 08 ProjectSettings 项目设置 ───────────────────────── */

function boardProjectSettings() {
  return F('RF-ProjectSettings', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('项目设置', '规格 · 风格 · 字幕', { label: '已保存', tone: 'ok' }),
    stageRail(0),
    scroll([
      sectionHead('成片规格'),
      card([
        F('Spec-row', { lay: 'h', gap: 10, cross: 'center' }, [
          F('Spec-cell', { lay: 'v', gap: 4, szH: 'fill' }, [
            T('Spec-cap', '分辨率', { sz: 10, fill: 'rf-text-3' }),
            T('Spec-val', '768P', { sz: 12, fill: 'rf-text-1' }),
          ]),
          F('Spec-cell', { lay: 'v', gap: 4, szH: 'fill' }, [
            T('Spec-cap', '比例', { sz: 10, fill: 'rf-text-3' }),
            T('Spec-val', '9 : 16', { sz: 12, fill: 'rf-text-1' }),
          ]),
          F('Spec-cell', { lay: 'v', gap: 4, szH: 'fill' }, [
            T('Spec-cap', '风格', { sz: 10, fill: 'rf-text-3' }),
            T('Spec-val', '写实 · 冷调', { sz: 12, fill: 'rf-text-1' }),
          ]),
        ]),
      ], { name: 'RF/SettingGroup' }),
      sectionHead('字幕'),
      card([
        kvRow('自动添加字幕', '开', '', 'rf-ok', statusPill('开', 'ok')),
        kvRow('烧录位置', '底部居中', '', 'rf-text-2'),
        kvRow('隐藏角色名', '开', '', 'rf-ok'),
        T('Set-hint', '成片同时导出带字幕、不带字幕两版，外加 SRT 文件。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/SettingGroup', gap: 10 }),
      sectionHead('声音'),
      card([
        kvRow('生成背景音乐', '开', '', 'rf-ok'),
        kvRow('语音合成', 'H3 参考音色（flac）', '', 'rf-text-2'),
      ], { name: 'RF/SettingGroup', gap: 10 }),
      sectionHead('危险操作'),
      card([
        T('Danger-text', '删除项目会连同资产、分镜与成片一起清除，不可恢复。', { sz: 11, fill: 'rf-text-2' }),
        F('RF/Button/Danger', { h: 34, r: 8, fill: 'none', stroke: 'rf-error', sw: 1, lay: 'h', pad: [0, 14], main: 'center', cross: 'center' }, [
          T('Danger-label', '删除这个项目', { sz: 11, fill: 'rf-error' }),
        ]),
      ], { name: 'RF/DangerCard', fill: 'rf-surface', stroke: 'rf-error', sw: 1, gap: 10 }),
    ]),
    footer('项目设置', '上次保存 10:42', '保存设置'),
  ]);
}

/* ───────────────────────── 板 10 Chapters 章节管理 ───────────────────────── */

function boardChapters() {
  const chapterCard = (idx, meta, tone, state) => card([
    T('Ch-title', idx, { sz: 13, wght: 600, fill: 'rf-text-1' }),
    F('Ch-meta-row', { lay: 'h', gap: 8, cross: 'center' }, [
      T('Ch-meta', meta, { sz: 10, fill: 'rf-text-3' }),
      state ? statusPill(state, tone) : null,
    ].filter(Boolean)),
    F('Ch-actions', { lay: 'h', gap: 6 }, [
      F('RF/Button/Ghost', { h: 26, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 8], main: 'center', cross: 'center' }, [
        T('Ch-act-gen', '生成', { sz: 10, fill: 'rf-text-2' }),
      ]),
      F('RF/Button/Ghost', { h: 26, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 8], main: 'center', cross: 'center' }, [
        T('Ch-act-edit', '编辑', { sz: 10, fill: 'rf-text-2' }),
      ]),
      F('RF/Button/Ghost', { h: 26, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 8], main: 'center', cross: 'center' }, [
        T('Ch-act-more', '操作', { sz: 10, fill: 'rf-text-2' }),
      ]),
    ]),
  ], { name: 'RF/ChapterCard', pad: 12, gap: 8 });

  return F('RF-Chapters', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('章节', '先骨架 · 再逐章生成', { label: '5 章', tone: 'neutral' }),
    stageRail(0),
    tabBar('章节'),
    scroll([
      chatSync('先规划整本书的章节骨架，再逐章生成。素材库全项目共用。'),
      F('Ch-cta', { lay: 'h', gap: 8, szH: 'fill' }, [
        F('RF/Button/Primary', { h: 34, r: 8, fill: 'rf-accent', lay: 'h', pad: [0, 12], main: 'center', cross: 'center' }, [
          T('Ch-cta-add', '新增章节', { sz: 11, wght: 600, fill: 'rf-on-accent' }),
        ]),
        F('RF/Button/Ghost', { h: 34, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 12], main: 'center', cross: 'center' }, [
          T('Ch-cta-all', '生成全部章节', { sz: 11, fill: 'rf-text-2' }),
        ]),
      ]),
      F('Ch-grid-1', { lay: 'h', gap: 12, szH: 'fill' }, [
        chapterCard('第 1 章', '5 / 5 镜 · 02:14', 'ok', '完成'),
        chapterCard('第 2 章', '6 / 6 镜 · 03:02', 'ok', '完成'),
      ]),
      F('Ch-grid-2', { lay: 'h', gap: 12, szH: 'fill' }, [
        chapterCard('第 3 章', '4 / 4 镜 · 01:40', 'ok', '完成'),
        chapterCard('第 5 章', '暂无分镜', 'neutral', '待生成'),
      ]),
      F('Ch-grid-3', { lay: 'h', gap: 12, szH: 'fill' }, [
        chapterCard('第 4 章', '3 / 5 镜 · 生成中', 'accent', '生成中'),
        chapterCard('第 6 章', '暂无分镜', 'neutral', '待生成'),
      ]),
      card([
        T('Ch-note', '章节是独立的成片单元：可以只跑一章，也可以续跑上次没跑完的。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12 }),
    ]),
    footer('章节', '5 章 · 19 镜', '生成全部章节'),
  ]);
}

/* ───────────────────────── 板 11 Assets 素材库 ───────────────────────── */

function boardAssets() {
  const assetCard = (name, type, meta, actions, tone = 'rf-ok') => card([
    T('Asset-name', name, { sz: 12, wght: 600, fill: 'rf-text-1' }),
    F('Asset-type-row', { lay: 'h', gap: 6, cross: 'center' }, [
      T('Asset-type', type, { sz: 10, fill: 'rf-text-3' }),
      statusPill('done', tone),
    ]),
    T('Asset-meta', meta, { sz: 10, fill: 'rf-text-3' }),
    F('Asset-actions', { lay: 'h', gap: 6, wrap: true }, actions.map((a, i) => F(`Asset-act-${i}`, {
      h: 24, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 8], main: 'center', cross: 'center',
    }, [
      T(`Asset-act-text-${i}`, a, { sz: 10, fill: 'rf-text-2' }),
    ]))),
  ], { name: 'RF/AssetCard', pad: 12, gap: 8 });

  return F('RF-Assets', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('素材库', '人物 · 场景 · 道具 · 变体', { label: '18 项', tone: 'neutral' }),
    stageRail(3),
    tabBar('素材'),
    scroll([
      F('As-cta', { lay: 'h', gap: 8, szH: 'fill' }, [
        F('RF/Button/Primary', { h: 32, r: 8, fill: 'rf-accent', lay: 'h', pad: [0, 12], main: 'center', cross: 'center' }, [
          T('As-cta-text', '新建资产', { sz: 11, wght: 600, fill: 'rf-on-accent' }),
        ]),
        F('As-gap', { lay: 'h', szH: 'fill' }),
      ]),
      chipRow(['全部 18', '人物 3', '场景 4', '道具 9', '服装 2', '语音 1']),
      F('As-grid-1', { lay: 'h', gap: 12, szH: 'fill' }, [
        assetCard('林晚', 'character', '服装 2 套 · 有台词', ['生成图', '换装', '年龄', '设计音色']),
        assetCard('程予', 'character', '服装 1 套 · 有台词', ['生成图', '换装', '设计音色']),
      ]),
      F('As-grid-2', { lay: 'h', gap: 12, szH: 'fill' }, [
        assetCard('居家卧室', 'scene', '3 个视角', ['生成图', '重新生成', '上传替换']),
        assetCard('旁白音色', 'voice', 'flac · 已试听', ['设计音色', '上传替换']),
      ]),
      F('As-grid-3', { lay: 'h', gap: 12, szH: 'fill' }, [
        assetCard('玉佩', 'prop', '1 个变体 · 关键道具', ['生成图', '重新生成']),
        assetCard('夜雨', 'music', '1:48 · 弦乐渐强', ['试听', '应用到章节']),
      ]),
      F('As-more', { lay: 'h', gap: 6, cross: 'center' }, [
        T('As-more-text', '还有 10 项 · 音效 / 视频 / 参考', { sz: 10, fill: 'rf-text-3' }),
        T('As-more-link', '查看全部 18 项', { sz: 10, fill: 'rf-accent' }),
      ]),
      card([
        T('As-gap-text', '3 个分镜缺参考图，video 阶段会直接报错（硬依赖 image）。', { sz: 11, fill: 'rf-warn' }),
      ], { name: 'RF/GapCard', fill: 'rf-surface-2', stroke: 'rf-warn', sw: 1, pad: 12 }),
    ]),
    footer('素材', '18 项 · 3 项待补', '新建资产'),
  ]);
}

/* ───────────────────────── 板 12 Storyboard 分镜审查 ───────────────────────── */

function boardStoryboard() {
  const shotRow = (id, title, dur, state, tone, on) => F(`ShotRow-${id}`, {
    lay: 'h', gap: 8, cross: 'center', szH: 'fill', pad: [8, 10], r: 8,
    fill: on ? 'rf-accent-dim' : 'none', stroke: on ? 'rf-accent' : 'none', sw: 1,
  }, [
    T('ShotRow-id', id, { sz: 11, wght: 600, fill: on ? 'rf-accent' : 'rf-text-2' }),
    T('ShotRow-title', title, { sz: 11, fill: 'rf-text-1', szH: 'fill', auto: 'height' }),
    T('ShotRow-dur', dur, { sz: 10, fill: 'rf-text-3' }),
    T('ShotRow-state', state, { sz: 10, fill: tone }),
  ]);

  return F('RF-Storyboard', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('分镜审查', '逐镜预览 · 不满意就重来', { label: '16 镜', tone: 'neutral' }),
    stageRail(4),
    tabBar('分镜'),
    scroll([
      shotRow('01', '城门官道 · 清晨薄雾', '12s', '已生成', 'rf-ok', true),
      shotRow('02', '车厢内 · 掀开车帘', '08s', '已生成', 'rf-ok', false),
      shotRow('03', '低头看掌心', '11s', '待审', 'rf-warn', false),
      shotRow('04', '京城街景 · 远景', '06s', '待审', 'rf-warn', false),
      sectionHead('选中镜 · 分镜 1', '参考素材与提示词'),
      card([
        F('Sb-refs', { lay: 'h', gap: 8, cross: 'center' }, [
          thumbBox('角色', { w: 48, h: 48 }),
          thumbBox('场景', { w: 48, h: 48 }),
          thumbBox('道具', { w: 48, h: 48 }),
          F('Sb-gap', { lay: 'h', szH: 'fill' }),
          playerBar('0:07', { w: 150 }),
        ]),
        T('Sb-prompt', '镜头 PUSH IN · 薄雾官道全景，马车驶近…', { sz: 10, fill: 'rf-text-2' }),
      ], { name: 'RF/ShotPreview', gap: 10 }),
      sectionHead('重新生成'),
      card([
        F('Reg-row', { lay: 'h', gap: 8, szH: 'fill' }, [
          F('RF/Button/Ghost', { h: 28, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], main: 'center', cross: 'center' }, [
            T('Reg-seed', '换一个种子', { sz: 10, fill: 'rf-text-2' }),
          ]),
          F('RF/Button/Ghost', { h: 28, r: 6, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], main: 'center', cross: 'center' }, [
            T('Reg-rewrite', '按反馈改写', { sz: 10, fill: 'rf-text-2' }),
          ]),
        ]),
        F('Reg-input', { h: 34, r: 8, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], cross: 'center' }, [
          T('Reg-placeholder', '写下不满意的地方，例如「车帘再慢一点」', { sz: 11, fill: 'rf-text-3' }),
        ]),
      ], { name: 'RF/RegenerateCard', gap: 10 }),
    ]),
    footer('分镜', '16 镜 · 2 待审', '重新生成选中镜'),
  ]);
}

/* ───────────────────────── 板 13 Context 上下文 ───────────────────────── */

function boardContext() {
  const ctxCard = (key, title, meta, tone, state) => card([
    F('Ctx-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
      F('Ctx-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
        T('Ctx-title', title, { sz: 12, wght: 600, fill: 'rf-text-1' }),
        T('Ctx-meta', meta, { sz: 10, fill: 'rf-text-3' }),
      ]),
      statusPill(state, tone),
    ]),
    F('Ctx-actions', { lay: 'h', gap: 8 }, [
      ghostButton('查看'),
      ghostButton('从对话写入'),
    ]),
  ], { name: 'RF/ContextCard', gap: 10 });

  return F('RF-Context', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('上下文', '生成前必须齐的三把钥匙', { label: '三键齐', tone: 'ok' }),
    stageRail(3),
    tabBar('上下文'),
    scroll([
      chatSync('对话已同步：第 1 章 bible 写入上下文'),
      ctxCard('bible', '人物圣经', '12 人 · 34 条锚点 · 含场景站位表', 'ok', '已就绪'),
      ctxCard('style', '风格指南', '写实 · 冷调 · 柔光 · 全片禁止项 3 条', 'ok', '已就绪'),
      ctxCard('continuity', '连续性记录', '18 条 · 3 条冲突待处理', 'warn', '待处理'),
      sectionHead('注入预览', '每次生成时固定注入这三段'),
      card([
        T('Ctx-inject-1', '【人物圣经（一致性锚点，后续所有生成必须遵守）】', { sz: 10, fill: 'rf-accent' }),
        T('Ctx-inject-2', '【风格指南（统一画风/光线/色调）】', { sz: 10, fill: 'rf-accent' }),
        T('Ctx-inject-3', '【连续性记录】', { sz: 10, fill: 'rf-accent' }),
      ], { name: 'RF/InjectPreview', gap: 5 }),
      card([
        T('Ctx-rule-1', '只有 bible / style / continuity 三键，多写一个会直接报错。', { sz: 10, fill: 'rf-text-3' }),
        T('Ctx-rule-2', 'bible 每次写入前先读回现有内容，不覆盖已有人物与衣橱。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12, gap: 4 }),
    ]),
    footer('上下文', '三键齐备 · 连续性待处理 3 条', '冻结锚点'),
  ]);
}

/* ───────────────────────── 板 14 Output 成片 ───────────────────────── */

function boardOutput() {
  return F('RF-Output', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('成片', '合成 · 字幕 · 交付', { label: '1 个', tone: 'neutral' }),
    stageRail(5),
    tabBar('成片'),
    scroll([
      card([
        F('Out-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
          F('Out-copy', { lay: 'v', gap: 3, szH: 'fill' }, [
            T('Out-name', '第1章_风起_e52dc3ec.mp4', { sz: 12, wght: 600, fill: 'rf-text-1' }),
            T('Out-meta', '27.4 MB · 2026/10/24 09:12', { sz: 10, fill: 'rf-text-3' }),
          ]),
          F('RF/Button/Primary', { h: 30, r: 8, fill: 'rf-accent', lay: 'h', pad: [0, 12], main: 'center', cross: 'center' }, [
            T('Out-dl', '下载', { sz: 11, wght: 600, fill: 'rf-on-accent' }),
          ]),
        ]),
      ], { name: 'RF/ExportRow' }),
      F('Out-player', { h: 168, r: 10, fill: 'rf-surface-2', lay: 'h', main: 'center', cross: 'center' }, [
        T('Out-player-text', '成片预览 · 0:00 / 2:14', { sz: 11, fill: 'rf-text-3' }),
      ]),
      sectionHead('交付物', '字幕双版本 + SRT'),
      card([
        kvRow('带字幕成片', 'mp4 · 27.4 MB', '已生成', 'rf-ok'),
        kvRow('不带字幕成片', 'mp4 · 26.9 MB', '已生成', 'rf-ok'),
        kvRow('字幕文件', 'srt', '已生成', 'rf-ok'),
      ], { name: 'RF/DeliverList', gap: 10 }),
      sectionHead('章节'),
      card([
        listRow('第 1 章 · 风起', '8 镜 · 02:14', T('Out-ch1', '已导出', { sz: 10, fill: 'rf-ok' })),
        listRow('第 2 章 · 归途', '6 镜 · 03:02', T('Out-ch2', '未生成', { sz: 10, fill: 'rf-text-3' })),
      ], { name: 'RF/ChapterList', gap: 10 }),
    ]),
    footer('交付', '第 1 章 02:14 · 已导出', '下载成片'),
  ]);
}

/* ───────────────────────── 板 15 Log 运行日志 ───────────────────────── */

function boardLog() {
  const changeRow = (time, what, batch) => F('Log-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
    T('Log-time', time, { sz: 10, fill: 'rf-text-3' }),
    T('Log-what', what, { sz: 11, fill: 'rf-text-1', szH: 'fill', auto: 'height' }),
    T('Log-batch', batch, { sz: 10, fill: 'rf-text-2' }),
  ]);

  return F('RF-Log', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('运行日志', '谁在什么时候改了什么', { label: '42 条', tone: 'neutral' }),
    stageRail(3),
    tabBar('日志'),
    scroll([
      sectionHead('变更记录', '每一步都可回滚'),
      card([
        changeRow('09:12', '写入 第 1 章 bible（人物圣经）', 'batch_7a'),
        changeRow('09:08', '生成 3 张场景参考图', 'batch_7a'),
        changeRow('09:05', '写入 第 1 章 分镜 8 条', 'batch_6f'),
        changeRow('08:58', '修改 项目设置 · 分辨率', 'batch_61'),
      ], { name: 'RF/ChangeList', gap: 9 }),
      sectionHead('运行输出'),
      codeBox([
        '[09:12] llm  stage 开始 · bible 已写入',
        '[09:11] image stage · 第 2 / 3 张 · seed 8831661447',
        '[09:10] image stage · 第 1 / 3 张 · 12.4s',
        '[09:09] comfyui · 显存 12.4 / 16 GB',
      ]),
      sectionHead('回滚'),
      card([
        kvRow('按批次回滚', 'batch_7a', '', 'rf-text-2', ghostButton('回滚')),
        kvRow('按时间点回滚', '选择时刻', '', 'rf-text-2', ghostButton('选择')),
        kvRow('回滚单条', '最近一条', '', 'rf-text-2', ghostButton('回滚')),
        T('Log-note', '回滚只恢复内容，磁盘上的图片视频不会跟着删。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/RollbackCard', gap: 10 }),
    ]),
    footer('日志', '近 42 条变更 · 4 个批次', '回滚本批'),
  ]);
}

/* ───────────────────────── 板 16 ChatRows 对话行 ───────────────────────── */

function boardChatRows() {
  const row = (name, kids, { fill = 'rf-surface', stroke = 'none', sw = 1 } = {}) => F(name, {
    r: 8, fill, stroke, sw, lay: 'v', pad: 12, gap: 6,
  }, kids);

  return F('RF-ChatRows', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('对话行', 'DSH 对话面 · 右栏为辅', { label: '规范', tone: 'neutral' }),
    stageRail(3),
    scroll([
      sectionHead('同步行', '同一状态两边可读'),
      row('Sync-row', [
        T('Sync-text', '对话已同步：第 1 章 bible 写入上下文', { sz: 11, fill: 'rf-text-3' }),
      ], { fill: 'rf-surface-2' }),
      sectionHead('进度行', '长任务要看得见'),
      row('Progress-row', [
        F('Prog-row', { lay: 'h', gap: 10, cross: 'center', szH: 'fill' }, [
          T('Prog-text', 'image 阶段 · 第 3 / 12 张', { sz: 11, fill: 'rf-text-1', szH: 'fill' }),
          T('Prog-pct', '62%', { sz: 11, fill: 'rf-accent' }),
        ]),
        progressBar(280),
      ]),
      sectionHead('结构化结果行'),
      row('Result-row', [
        T('Result-title', '第 1 章分镜已定稿', { sz: 11, wght: 600, fill: 'rf-text-1' }),
        T('Result-meta', '8 镜 · 02:14 · 时长合计合法 · 台词无超速', { sz: 10, fill: 'rf-text-3' }),
      ]),
      sectionHead('错误行', '缺什么说清楚'),
      row('Error-row', [
        T('Error-title', 'video 阶段缺少 3 张参考图', { sz: 11, wght: 600, fill: 'rf-error' }),
        T('Error-meta', '硬依赖 image，不能先跑起来再说。已暂停该批。', { sz: 10, fill: 'rf-text-2' }),
        ghostButton('去补素材'),
      ], { fill: 'rf-surface', stroke: 'rf-error', sw: 1 }),
      sectionHead('授权行', '烧钱的动作要人工点头'),
      row('Ask-row', [
        T('Ask-title', '将对通过 RunningHub 云端生成', { sz: 11, wght: 600, fill: 'rf-text-1' }),
        T('Ask-meta', '预计 12 张 · 按次计费', { sz: 10, fill: 'rf-text-3' }),
        F('Ask-actions', { lay: 'h', gap: 8 }, [
          F('RF/Button/Primary', { h: 28, r: 6, fill: 'rf-accent', lay: 'h', pad: [0, 12], main: 'center', cross: 'center' }, [
            T('Ask-yes', '允许', { sz: 10, wght: 600, fill: 'rf-on-accent' }),
          ]),
          ghostButton('拒绝'),
        ]),
      ]),
    ]),
    footer('规范', '对话为主 · 右栏为辅', '查看右栏'),
  ]);
}

/* ───────────────────────── 板 17 Degraded 降级与失败 ───────────────────────── */

function boardDegraded() {
  return F('RF-Degraded', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('降级与失败', '不许静默降质', { label: '规范', tone: 'neutral' }),
    stageRail(1),
    scroll([
      sectionHead('阻塞', '服务没起来就直说'),
      card([
        T('D1-title', 'ComfyUI 未连接', { sz: 12, wght: 600, fill: 'rf-error' }),
        T('D1-meta', '127.0.0.1:8188 连不上 · 本批已暂停', { sz: 10, fill: 'rf-text-2' }),
        T('D1-hint', '只能走云端档，会按次计费；也可以先修本地再续跑。', { sz: 10, fill: 'rf-text-3' }),
        ghostButton('重试连接'),
      ], { name: 'RF/StateCard', fill: 'rf-surface', stroke: 'rf-error', sw: 1, gap: 7 }),
      sectionHead('警告', '能跑但会打折'),
      card([
        T('D2-title', '显存不足，视频需分块', { sz: 12, wght: 600, fill: 'rf-warn' }),
        T('D2-meta', '预计需要 12 GB，当前 16 GB · 已自动降为分块编码', { sz: 10, fill: 'rf-text-2' }),
      ], { name: 'RF/StateCard', fill: 'rf-surface', stroke: 'rf-warn', sw: 1, gap: 7 }),
      sectionHead('缺料', '缺的东西要点名'),
      card([
        T('D3-title', '3 个分镜缺参考图', { sz: 12, wght: 600, fill: 'rf-warn' }),
        T('D3-meta', '分镜 07 / 09 / 11 的角色参考图未生成', { sz: 10, fill: 'rf-text-2' }),
        ghostButton('去补齐'),
      ], { name: 'RF/StateCard', fill: 'rf-surface', stroke: 'rf-warn', sw: 1, gap: 7 }),
      sectionHead('空态', '还没开始时说什么'),
      card([
        T('D4-title', '这个项目还没有章节', { sz: 12, wght: 600, fill: 'rf-text-1' }),
        T('D4-meta', '粘贴小说原文，或直接说「用这句话做一集」', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/StateCard', gap: 7 }),
      card([
        T('D5-title', '软降级 · 2 个角色没有音色', { sz: 11, wght: 600, fill: 'rf-warn' }),
        T('D5-meta', '这两镜没有台词，video 仍可跑；出片会少一层人声质感。', { sz: 10, fill: 'rf-text-2' }),
      ], { name: 'RF/StateCard', fill: 'rf-surface', stroke: 'rf-warn', sw: 1, gap: 6 }),
    ]),
    footer('规范', '失败要说清代价与替代', '查看失败清单'),
  ]);
}

/* ───────────────────────── 板 18 Picker 素材选择器 ───────────────────────── */

function boardPicker() {
  return F('RF-Picker', { w: W, h: H, lay: 'v', fill: 'rf-bg', clip: true }, [
    header('素材选择器', '弹窗形态 · 560 内嵌', { label: '规范', tone: 'neutral' }),
    stageRail(3),
    scroll([
      card([
        F('Pk-search', { h: 32, r: 8, fill: 'rf-surface-3', lay: 'h', pad: [0, 10], cross: 'center' }, [
          T('Pk-search-text', '搜角色 / 场景 / 道具', { sz: 11, fill: 'rf-text-3' }),
        ]),
        chipRow(['全部', '角色', '场景', '道具', '服装']),
        F('Pk-grid-1', { lay: 'h', gap: 8, szH: 'fill' }, [
          thumbBox('林晚', { w: 76, h: 76 }),
          thumbBox('程予', { w: 76, h: 76 }),
          thumbBox('官道', { w: 76, h: 76 }),
        ]),
        F('Pk-grid-2', { lay: 'h', gap: 8, szH: 'fill' }, [
          thumbBox('车厢', { w: 76, h: 76 }),
          thumbBox('玉佩', { w: 76, h: 76 }),
          thumbBox('车帘', { w: 76, h: 76 }),
        ]),
        F('Pk-picked', { lay: 'h', gap: 8, cross: 'center' }, [
          thumbBox('已选 1', { w: 40, h: 40, tone: 'rf-accent-dim' }),
          thumbBox('已选 2', { w: 40, h: 40, tone: 'rf-accent-dim' }),
          T('Pk-picked-text', '已选 2 个 · 参考图上限 9', { sz: 10, fill: 'rf-text-3' }),
          F('Pk-gap', { lay: 'h', szH: 'fill' }),
          ghostButton('清空'),
        ]),
      ], { name: 'RF/PickerCard', gap: 12 }),
      card([
        T('Pk-note', '只有出镜或出声的角色才占名额；参考图 ≤ 9、音视频 ≤ 3 是后端硬上限。', { sz: 10, fill: 'rf-text-3' }),
      ], { name: 'RF/NoticeCard', fill: 'rf-surface-2', stroke: 'none', pad: 12 }),
    ]),
    footer('规范', '弹窗 · 右侧栏内嵌', '确定（2）'),
  ]);
}

/* ───────────────────────── 画板清单（顺序 = IC 完整流程顺序） ───────────────────────── */

const BOARD_SPECS = [
  ['RF-RunGate', boardRunGate],
  ['RF-Intake', boardIntake],
  ['RF-Chapters', boardChapters],
  ['RF-Assets', boardAssets],
  ['RF-Context', boardContext],
  ['RF-Stages', boardStages],
  ['RF-Storyboard', boardStoryboard],
  ['RF-ShotDetail', boardShotDetail],
  ['RF-Music', boardMusic],
  ['RF-Output', boardOutput],
  ['RF-Hub', boardHub],
  ['RF-Log', boardLog],
  ['RF-Skills', boardSkills],
  ['RF-Settings', boardSettings],
  ['RF-ProjectSettings', boardProjectSettings],
  ['RF-ChatRows', boardChatRows],
  ['RF-Degraded', boardDegraded],
  ['RF-Picker', boardPicker],
];

/* ───────────────────────── 组件表 ───────────────────────── */

function componentSpecs() {
  return [
    ['RF/FilmMark', filmMark()],
    ['RF/StatusPill', statusPill('生成中', 'accent')],
    ['RF/StageRail', stageRail(3)],
    ['RF/TabBar', tabBar('枢纽')],
    ['RF/Button/Primary', primaryButton('选好位置，开始探测')],
    ['RF/Button/Ghost', ghostButton('收起')],
    ['RF/ChatSyncLine', chatSync('对话已同步：第 1 章 bible 写入上下文')],
    ['RF/Card', card([T('Card-demo', '卡片正文', { sz: 12, fill: 'rf-text-1' })], { name: 'RF/Card' })],
    ['RF/RunGateCard', card([
      F('C-row', { lay: 'h', gap: 8, cross: 'center' }, [radio(true), T('C-title', '本地运行', { sz: 13, wght: 600, fill: 'rf-text-1' })]),
      T('C-sub', 'ComfyUI · 本机', { sz: 10, fill: 'rf-text-3' }),
    ], { name: 'RF/RunGateCard', h: 96 })],
    ['RF/HubStrip', card([T('H-demo', '¥ 4.60 · image × 12', { sz: 12, fill: 'rf-text-1' })], { name: 'RF/HubStrip' })],
    ['RF/ShotChip', card([
      T('S-id', 'C1-S01', { sz: 10, fill: 'rf-text-3' }),
      T('S-size', '全景', { sz: 12, wght: 600, fill: 'rf-text-1' }),
    ], { name: 'RF/ShotChip' })],
  ];
}

/** 组件表上的组件是顶层展示位，没有自动布局父级 → fill 降级为 hug */
function stripFill(n) {
  const p = { ...(n.p || {}) };
  if (p.w == null) p.szH = 'hug';
  else if (p.szH === 'fill') p.szH = 'fixed';
  if (p.szV === 'fill') p.szV = 'hug';
  return { ...n, p, kids: (n.kids || []).map(stripFill) };
}

/* ───────────────────────── 主流程 ───────────────────────── */

function main() {
  if (!fs.existsSync(FIG)) throw new Error(`找不到 FigCraft CLI：${FIG}`);

  const marker = path.join(HERE, '.build-ok');
  if (fs.existsSync(DOC)) {
    if (fs.existsSync(marker)) {
      const archive = path.join(DESIGN, '_archive');
      fs.mkdirSync(archive, { recursive: true });
      fs.copyFileSync(DOC, path.join(archive, `ReelForge-RF7.v${Date.now()}.figcraft`));
      console.log('· 上一版已归档到 design/_archive/');
    }
    fs.rmSync(marker, { force: true });
  }

  /* Pass 1 · 页面 + 变量 */
  const p1 = [
    { command: 'page.rename', params: { name: 'RF7/Dark' } },
    { command: 'page.add', params: { name: 'RF7/Components' } },
    { command: 'variable.createCollection', params: { name: 'RF7', modes: ['Dark', 'Light'] } },
  ];
  for (const [name, modes] of Object.entries(TOKENS)) {
    p1.push({ command: 'variable.create', params: { collection: 'RF7', name, type: 'color', values: modes } });
  }
  const r1 = run(p1, { fresh: true });
  const pageIds = {};
  const varIds = new Map();
  r1.forEach((r, i) => {
    if (!r.ok) throw new Error(`Pass1 失败 ${p1[i].command}: ${r.error}`);
    if (p1[i].command === 'variable.create' && r.result?.id) varIds.set(p1[i].params.name, r.result.id);
  });
  const pl = run([{ command: 'page.list', params: {} }]);
  const pages = pl[0].result || [];
  pageIds.dark = pages.find((p) => p.name === 'RF7/Dark')?.id;
  pageIds.components = pages.find((p) => p.name === 'RF7/Components')?.id;
  if (!pageIds.dark || !pageIds.components) throw new Error(`页面解析失败：${JSON.stringify(pages)}`);
  console.log(`· 页面 Dark=${pageIds.dark} Components=${pageIds.components} · 变量 ${varIds.size} 个`);

  /* Pass 2 · 模式 */
  run([
    { command: 'variable.setMode', params: { ids: [pageIds.dark], collection: 'RF7', mode: 'Dark' } },
    { command: 'variable.setMode', params: { ids: [pageIds.components], collection: 'RF7', mode: 'Dark' } },
  ]);

  /* Pass 3 · Dark 页建板 */
  const binds = [];
  const boards = BOARD_SPECS.map(([, fn], i) => {
    const node = fn();
    node.p.xy = [(i % 4) * 640, Math.floor(i / 4) * 980];
    return node;
  });
  buildTree(boards, pageIds.dark, 'Dark', 'board', binds);

  /* Pass 4 · 组件页（组件表 = 一张板，组件本体可被 component.create 真身化） */
  const specs = componentSpecs();
  const compRows = [];
  for (let i = 0; i < specs.length; i += 2) {
    const kids = [];
    for (let j = 0; j < 2 && i + j < specs.length; j++) {
      const [label, node] = specs[i + j];
      kids.push(F(`Comp-slot-${i + j}`, { lay: 'v', gap: 6, szH: 'fill' }, [
        T(`Comp-label-${i + j}`, label, { sz: 10, fill: 'rf-text-3' }),
        stripFill(node),
      ]));
    }
    compRows.push(F(`Comp-row-${i / 2}`, { lay: 'h', gap: 16, szH: 'fill' }, kids));
  }
  const compBoard = F('RF-Components', { w: 1200, h: 900, lay: 'v', pad: 24, gap: 18, fill: 'rf-bg', clip: true }, [
    F('Comp-head', { lay: 'v', gap: 4 }, [
      T('Comp-title', 'RF7 组件库', { sz: 14, wght: 600, fill: 'rf-text-1' }),
      T('Comp-sub', '全部组件绑定 RF7 令牌变量 · 换主题只需切变量模式', { sz: 10, fill: 'rf-text-3' }),
    ]),
    ...compRows,
  ]);
  buildTree([compBoard], pageIds.components, 'Dark', 'comp', binds);
  const compIds = specs.map((_, i) => ID_MAP.get(`comp.0.${1 + Math.floor(i / 2)}.${i % 2}.1`));
  console.log(`· 板 + 组件节点 ${ID_MAP.size} 个`);

  /* Pass 5 · 变量绑定 */
  const groups = new Map();
  for (const b of binds) {
    const id = ID_MAP.get(b.key);
    if (!id) continue;
    const gk = `${b.field}|${b.var}`;
    if (!groups.has(gk)) groups.set(gk, { field: b.field, var: b.var, ids: [] });
    groups.get(gk).ids.push(id);
  }
  const bindCmds = [...groups.values()].map((g) => ({
    command: 'variable.bind',
    params: { ids: g.ids, field: g.field, variable: varIds.get(g.var) ?? g.var },
  }));
  if (bindCmds.length) {
    const rb = run(bindCmds);
    rb.forEach((r, i) => { if (!r.ok) throw new Error(`绑定失败 ${bindCmds[i].params.field}→${bindCmds[i].params.variable}: ${r.error}`); });
    console.log(`· 变量绑定 ${bindCmds.length} 组 / ${binds.length} 个节点`);
  }

  /* Pass 6 · Dark 页 → Light 页 */
  const dup = run([{ command: 'page.duplicate', params: { id: pageIds.dark } }]);
  if (!dup[0].ok) throw new Error(`复制页失败：${dup[0].error}`);
  const lightId = dup[0].result?.id;
  const rl = run([
    { command: 'page.rename', params: { id: lightId, name: 'RF7/Light' } },
    { command: 'variable.setMode', params: { ids: [lightId], collection: 'RF7', mode: 'Light' } },
  ]);
  rl.forEach((r, i) => { if (!r.ok) throw new Error(`Light 页失败：${r.error}`); });
  console.log(`· Light 页 ${lightId}`);

  /* Pass 7 · 组件真身 */
  if (compIds.length) {
    const rc = run(compIds.map((id) => ({ command: 'component.create', params: { ids: [id] } })));
    const bad = rc.filter((r) => !r.ok);
    console.log(bad.length ? `⚠ 组件化失败 ${bad.length} 个：${bad[0].error}` : `· 组件 ${compIds.length} 个已真身化`);
  }

  /* Pass 8 · 字体度量回测 */
  run([{ command: 'text.refit', params: {} }]);

  exportAll();
  fs.writeFileSync(marker, new Date().toISOString());
  // 清掉中间脚本
  for (const f of fs.readdirSync(HERE)) {
    if (/^\.pass\d+\.json$/.test(f) || f === '.inspect.json' || f === '.pl.json' || f === '.pl2.json' || f === '.pl3.json') {
      fs.rmSync(path.join(HERE, f), { force: true });
    }
  }

  console.log(`\n✅ 主稿：${DOC}`);
  for (const p of ['dark', 'light']) {
    const dir = path.join(DESIGN, p);
    if (fs.existsSync(dir)) console.log(`   ${p}/ → ${fs.readdirSync(dir).sort().join(', ')}`);
  }
}

function exportAll() {
  for (const [theme, page] of [['dark', 'RF7/Dark'], ['light', 'RF7/Light']]) {
    const dir = path.join(DESIGN, theme);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name] of BOARD_SPECS) {
      for (const format of ['png', 'svg']) {
        const out = path.join(dir, `${theme}-${name}.${format}`);
        try {
          execFileSync(FIG, ['export', DOC, '-o', out, '--format', format, '--page', page, '--node', name,
            '--automation-read-root', DESIGN, '--automation-write-root', DESIGN], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) {
          console.warn(`⚠ 导出失败 ${out}: ${err.message}`);
        }
      }
    }
  }
  // 组件表
  const compDir = path.join(DESIGN, 'components');
  fs.mkdirSync(compDir, { recursive: true });
  for (const format of ['png', 'svg']) {
    const out = path.join(compDir, `RF-Components.${format}`);
    try {
      execFileSync(FIG, ['export', DOC, '-o', out, '--format', format, '--page', 'RF7/Components', '--node', 'RF-Components',
        '--automation-read-root', DESIGN, '--automation-write-root', DESIGN], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      console.warn(`⚠ 导出失败 ${out}: ${err.message}`);
    }
  }
}

main();
