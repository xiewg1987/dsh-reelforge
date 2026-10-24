/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台样式 —— RF7 规格（`design/STYLE-SPEC.md` + `design/BOARD-INDEX.md`）。
 *
 * ## 骨架五层（RF7 画板索引 §八 / STYLE-SPEC §1）
 *
 *   Header 60 · StageRail 50 · TabBar 44 · Scroll（唯一滚动容器）· Footer 70
 *   外边距 20（内容宽 520）· 圆角：卡片 10 · 按钮 8 · 芯片 6 · Stage chip 6
 *
 * ## 颜色：RF7 的 14 个设计令牌 → 宿主 `--dsw-alias-*`
 *
 * RF7 出了**暗/亮两套稿**，但**代码只绑宿主 token**（STYLE-SPEC §7 /
 * 设计方案 §4.3 / 硬规则 R6 / 验收项 A7）—— 插件不写十六进制字面量，
 * 明暗由宿主切。下面的映射表是 RF7 两套设计值 ↔ 宿主 token 的对照。
 *
 * ### RF7 令牌 → 宿主 token
 *
 * | RF7 令牌 | 暗色稿 | 浅色稿 | 宿主 token | 浅色实测 | 暗色实测 |
 * | --- | --- | --- | --- | --- | --- |
 * | rf-bg | #0A0C10 | #F4F5F7 | --dsw-alias-bg-base（浅色再压深 4%） | #F4F5F6 | #151517 |
 * | rf-surface | #141820 | #FFFFFF | --dsw-alias-bg-base（浅色用 bg-base） | #FFFFFF | #232324 |
 * | rf-surface-2 | #10141C | #EBEDF2 | color-mix(--dsw-alias-bg-base 94%, --dsw-alias-label-primary 6%) | #EFF0F1 | #1A1A1B |
 * | rf-surface-3 | #1C2230 | #DDE1E8 | --dsw-alias-bg-layer-3（浅色压深 10%） | #E5E7E8 | #363638 |
 * | rf-line | #252A34 | #D0D4DC | --dsw-alias-border-l2 | rgba(0,0,0,.1) | rgba(255,255,255,.12) |
 * | rf-text-1 | #EEF1F6 | #121418 | --dsw-alias-label-primary | #0F1115 | #F9FAFB |
 * | rf-text-2 | #9AA3B2 | #5C6370 | --dsw-alias-label-secondary | #61666B | #CFD3D6 |
 * | rf-text-3 | #6B7380 | #8B919C | --dsw-alias-label-tertiary | #81858C | #ADB2B8 |
 * | rf-accent | #5B8DEF | #3568D4 | --dsw-alias-brand-primary-new-colorprimary-new-color | #4176E6 | #5686FE |
 * | rf-accent-dim | #1A2744 | #E3EBFA | color-mix(--rf-accent 14%, --rf-surface) | 淡蓝 | 深蓝 |
 * | rf-ok | #3DDC84 | #1F9D55 | --dsw-alias-state-success-primary | #22C55E | #22C55E |
 * | rf-warn | #E5A045 | #C7841A | --dsw-alias-state-warn-label | #DD8629 | #DD8629 |
 * | rf-error | #F07178 | #D92D20 | --dsw-alias-state-error-primary | #EC1313 | #F25A5A |
 * | rf-on-accent | #FFFFFF | #FFFFFF | --dsw-alias-toast-label | #FFFFFF | #FFFFFF |
 *
 * ### 三条推导纪律
 *
 * 1. **强调色必须是宿主的 accent，不是 `brand-primary`。**
 *    宿主把 `brand-primary` 绑成近黑（浅色）/ 近白（暗色）
 *    （`packages/client/ui-dockkit/src/components/dockkit.module.css:10` 的注释点名了这件事），
 *    拿它当强调色 = 整个工作台没有颜色。
 * 2. **明暗两套的「表面相对关系」要一致。**
 *    RF7 暗色稿是 `bg < surface-2 < surface`（条比卡片深），
 *    浅色稿是 `bg > surface-2 < surface`（卡片比底亮）——
 *    两套的共同点是**卡片比条亮、条比底深**。宿主浅色主题把 layer-1/2/3 全压成纯白，
 *    直接用会「一片白没有层次」，所以浅色下用 `color-mix` 从 bg-base 压深派生出层次
 *    （**没有写死颜色值**，仍随宿主主题走）。
 * 3. **强调色上的字用 `toast-label`，不用 `label-primary-foreground`。**
 *    后者会随主题反转（暗色变近黑），蓝底近黑字读不清；
 *    宿主自己的做法也是「蓝底上的箭头保持白色」
 *    （`ui-conversation/src/client/skeleton/InputBar.module.css:384`）。
 *
 * ⚠️ 明暗分支用 `body[data-ds-dark-theme]`（宿主主题源
 * `packages/client/ui-theme/src/styles/design-platform.css` 就是这么切的）。
 * 宿主**没有设 `color-scheme`**，所以 CSS 的 `light-dark()` 不可用。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.STYLES = `
.rf-root {
  /* ── RF7 令牌层（唯一颜色真源）────────────────────────────────────────
   * 浅色是默认分支（宿主亮色主题）；暗色分支见下方 body[data-ds-dark-theme]。 */
  /* 面板底：浅色下把纯白压深 4%，才有 RF7 浅色稿那层灰。 */
  --rf-bg: color-mix(in srgb, var(--dsw-alias-bg-base) 96%, var(--dsw-alias-label-primary) 4%);
  /* 卡面：浅色稿是纯白。 */
  --rf-surface: var(--dsw-alias-bg-base);
  /* Stage / Tab 条：比卡面深（RF7 两套稿都是「条比卡片深」）。 */
  --rf-surface-2: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);
  /* 芯片 / 输入底：浅色下压深一档。 */
  --rf-surface-3: color-mix(in srgb, var(--dsw-alias-bg-base) 90%, var(--dsw-alias-label-primary) 10%);
  --rf-line: var(--dsw-alias-border-l2);
  --rf-text-1: var(--dsw-alias-label-primary);
  --rf-text-2: var(--dsw-alias-label-secondary);
  --rf-text-3: var(--dsw-alias-label-tertiary);
  --rf-accent: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  /* 当前 Stage chip 底 = accent 薄薄一层压在卡面上。 */
  --rf-accent-dim: color-mix(in srgb, var(--rf-accent) 14%, var(--rf-surface));
  --rf-ok: var(--dsw-alias-state-success-primary);
  --rf-warn: var(--dsw-alias-state-warn-label);
  --rf-error: var(--dsw-alias-state-error-primary);
  --rf-on-accent: var(--dsw-alias-toast-label);
  /* 强调色 hover：浅色压深、暗色提亮（靠 label-primary 的明暗差）。 */
  --rf-accent-hover: color-mix(in srgb, var(--rf-accent) 86%, var(--dsw-alias-label-primary));

  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--rf-bg);
  color: var(--rf-text-1);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
}
/* 宿主暗色主题：RF7 暗色稿的相对关系（底 < 条 < 卡面）。 */
body[data-ds-dark-theme] .rf-root {
  --rf-bg: var(--dsw-alias-bg-base);
  --rf-surface: var(--dsw-alias-bg-layer-1);
  --rf-surface-2: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 22%, var(--dsw-alias-bg-base));
  --rf-surface-3: var(--dsw-alias-bg-layer-3);
}

/* ── Header（60）─────────────────────────────────────────────────────── */
.rf-header {
  flex: 0 0 auto;
  height: 60px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: var(--rf-bg);
}
/* 面板头 logo = RF/FilmMark：accent-dim 底 + 12×12 accent 方块（RF7 组件表）。 */
.rf-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--rf-accent-dim);
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rf-header__logo::after {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--rf-accent);
}
/* 流程屏里，面板头 logo 是「回到项目视图」的出口。 */
.rf-header__logo--button {
  border: 0;
  padding: 0;
  cursor: pointer;
}
.rf-header__text { min-width: 0; flex: 1 1 auto; }
.rf-header__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--rf-text-1);
}
.rf-header__subtitle {
  font-size: 10px;
  color: var(--rf-text-3);
}
/* 面板头右上角的胶囊 = RF/StatusPill。 */
.rf-header__status {
  flex: 0 0 auto;
  border-radius: 6px;
  padding: 5px 10px;
  background: var(--rf-surface-3);
  color: var(--rf-text-2);
  font-size: 10px;
}

/* ── Stage 轨（50）───────────────────────────────────────────────────── */
.rf-stagebar {
  flex: 0 0 auto;
  height: 50px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 20px 0 24px;
  background: var(--rf-surface-2);
  overflow-x: auto;
}
.rf-stagebar__step {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: 10px;
  white-space: nowrap;
  cursor: pointer;
  color: var(--rf-text-3);
}
.rf-stagebar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: var(--rf-line);
}
/* 当前步：点 = accent，文字套 accent-dim 胶囊（RF7 的 StepLabel chip）。 */
.rf-stagebar__step--current { color: var(--rf-accent); font-weight: 600; }
.rf-stagebar__step--current .rf-stagebar__dot { background: var(--rf-accent); }
.rf-stagebar__step--current .rf-stagebar__label {
  background: var(--rf-accent-dim);
  border-radius: 6px;
  padding: 3px 6px;
}
/* 已过：点 = ok，文字 = text-2。未到：点 = line，文字 = text-3。 */
.rf-stagebar__step--passed { color: var(--rf-text-2); }
.rf-stagebar__step--passed .rf-stagebar__dot { background: var(--rf-ok); }
.rf-stagebar__step--upcoming { color: var(--rf-text-3); }
.rf-stagebar__step--upcoming .rf-stagebar__dot { background: var(--rf-line); }
.rf-stagebar__count {
  margin-left: auto;
  font-size: 10px;
  color: var(--rf-text-3);
  flex: 0 0 auto;
}

/* ── Tab 条（44）────────────────────────────────────────────────────── */
.rf-tabs {
  flex: 0 0 auto;
  height: 44px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: var(--rf-bg);
  overflow-x: auto;
}
/* 未选中：透明底 + text-2；选中：accent-dim 底 + accent 字（RF7 的 TabChip）。 */
.rf-tabs__item {
  border: 0;
  background: transparent;
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--rf-text-2);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
}
.rf-tabs__item--active {
  background: var(--rf-accent-dim);
  color: var(--rf-accent);
  font-weight: 600;
}

/* ── Scroll（唯一滚动容器）──────────────────────────────────────────── */
.rf-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}
/* 屏内纵向排版：RF7 的 Scroll 是 lay:v + gap:16。 */
.rf-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Footer（70）────────────────────────────────────────────────────── */
.rf-footer {
  flex: 0 0 auto;
  height: 70px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: var(--rf-surface-2);
}
.rf-footer__text { min-width: 0; flex: 1 1 auto; }
.rf-footer__label {
  font-size: 10px;
  color: var(--rf-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-footer__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--rf-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── 卡片 / 分区 ────────────────────────────────────────────────────── */
.rf-card {
  border: 1px solid var(--rf-line);
  border-radius: 10px;
  background: var(--rf-surface);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 选中态描边 = accent（RF7 分镜行 / 素材卡）。**不染底**：RF7 三块板的
   选中卡填充与未选中一样，只有描边换色（板 06 另加左侧 4px 条）。 */
.rf-card--selected { border-color: var(--rf-accent); }
.rf-card--accent { border-left: 4px solid var(--rf-accent); }
/* 状态面（RF7 Degraded 板）：面 = 状态色薄薄一层压在卡面上，描边 = 状态色本身。 */
.rf-card--warn {
  background: color-mix(in srgb, var(--rf-warn) 10%, var(--rf-surface));
  border-color: var(--rf-warn);
}
.rf-card--error {
  background: color-mix(in srgb, var(--rf-error) 10%, var(--rf-surface));
  border-color: var(--rf-error);
}
.rf-card--warn-border { border-color: var(--rf-warn); }
.rf-card--disabled {
  border-color: var(--dsw-alias-border-l1);
  background: var(--rf-surface-2);
  color: var(--rf-text-3);
}
/* 无描边提示卡（RF7 NoticeCard）：surface-2 面 + 无描边。 */
.rf-notice {
  border: 0;
  border-radius: 10px;
  background: var(--rf-surface-2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rf-notice__main { font-size: 11px; color: var(--rf-text-2); }
.rf-notice__sub { font-size: 10px; color: var(--rf-text-3); }
/* 分区标题（RF7 SectionHead）：13/600 主标题 + 10px 副标题。 */
.rf-sechead { display: flex; flex-direction: column; gap: 4px; }
.rf-sechead__title { font-size: 13px; font-weight: 600; color: var(--rf-text-1); }
.rf-sechead__sub { font-size: 10px; color: var(--rf-text-3); }
.rf-section {
  font-size: 12px;
  color: var(--rf-text-2);
  margin: 4px 0 8px;
}

/* ── 按钮 ───────────────────────────────────────────────────────────── */
.rf-btn {
  border-radius: 8px;
  border: 1px solid var(--rf-line);
  padding: 6px 12px;
  white-space: nowrap;
  flex: 0 0 auto;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  background: var(--rf-surface-3);
  color: var(--rf-text-1);
}
/* 主按钮 = accent 底 + on-accent 字（RF7 Footer 主按钮，40 高）。 */
.rf-btn--primary {
  height: 40px;
  padding: 0 16px;
  font-weight: 600;
  background: var(--rf-accent);
  border-color: var(--rf-accent);
  color: var(--rf-on-accent);
}
.rf-btn--primary:hover { background: var(--rf-accent-hover); border-color: var(--rf-accent-hover); }
/* 次要按钮 = RF/Button/Ghost（28 高 / surface-3 底 / text-2 字）。 */
.rf-btn--secondary,
.rf-btn--ghost {
  height: 28px;
  padding: 0 10px;
  font-size: 10px;
  border-color: transparent;
  background: var(--rf-surface-3);
  color: var(--rf-text-2);
}
/* 危险按钮 = RF/Button/Danger（透明底 + 错误色描边与字）。 */
.rf-btn--danger {
  height: 34px;
  padding: 0 14px;
  font-size: 11px;
  background: transparent;
  border-color: var(--rf-error);
  color: var(--rf-error);
}
.rf-btn--disabled {
  height: 40px;
  background: var(--rf-surface-3);
  border-color: var(--rf-line);
  color: var(--rf-text-3);
  cursor: not-allowed;
}
/* ⚠️ 禁用态必须压过 :hover —— .rf-btn--primary:hover 的特异性 (0,2,0)
 * 高于 .rf-btn--disabled 的 (0,1,0)，不一起写的话禁用的主按钮一悬停就变蓝。 */
.rf-btn--disabled:hover,
.rf-btn--disabled:focus {
  background: var(--rf-surface-3);
  border-color: var(--rf-line);
  color: var(--rf-text-3);
}

/* ── 胶囊（RF7 StatusPill）──────────────────────────────────────────── */
.rf-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 10px;
  background: var(--rf-surface-3);
  color: var(--rf-text-2);
}
.rf-pill--running,
.rf-pill--accent { background: var(--rf-accent-dim); color: var(--rf-accent); }
.rf-pill--done,
.rf-pill--ok { background: var(--rf-surface-3); color: var(--rf-ok); }
.rf-pill--failed,
.rf-pill--error { background: var(--rf-surface-3); color: var(--rf-error); }
.rf-pill--queued,
.rf-pill--neutral { background: var(--rf-surface-3); color: var(--rf-text-3); }
.rf-pill--warn { background: var(--rf-surface-3); color: var(--rf-warn); }

/* ── 进度条 ─────────────────────────────────────────────────────────── */
.rf-progress {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--rf-surface-3);
  overflow: hidden;
}
.rf-progress__fill { height: 100%; background: var(--rf-accent); }
.rf-progress--done .rf-progress__fill { background: var(--rf-ok); }
.rf-progress--failed .rf-progress__fill { background: var(--rf-error); }
.rf-progress__label { position: absolute; inset: 0; font-size: 10px; color: var(--rf-text-2); }
/* RF7 进度条：轨道 surface-3，填充 accent，6 高 r3。 */
.rf-track {
  height: 6px;
  border-radius: 3px;
  background: var(--rf-surface-3);
  overflow: hidden;
}
.rf-track__fill { height: 100%; border-radius: 3px; background: var(--rf-accent); }
.rf-track__fill--ok { background: var(--rf-ok); }
.rf-track__fill--warn { background: var(--rf-warn); }

/* ── 空态 / 提示 ────────────────────────────────────────────────────── */
.rf-empty {
  border: 1px dashed var(--rf-line);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}
.rf-empty--error { border-color: var(--rf-error); }
.rf-empty__title { font-size: 12px; color: var(--rf-text-1); }
.rf-empty__hint { font-size: 11px; color: var(--rf-text-3); margin-top: 4px; }
.rf-empty__action { margin-top: 12px; display: flex; justify-content: center; }
.rf-toast {
  display: flex;
  gap: 8px;
  align-items: center;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  background: var(--rf-surface-3);
  color: var(--rf-text-1);
}
.rf-toast--warning { color: var(--rf-warn); }
.rf-toast--error { color: var(--rf-error); }
.rf-toast__close { border: 0; background: transparent; color: inherit; cursor: pointer; }
.rf-note { font-size: 11px; color: var(--rf-text-3); margin-top: 8px; }
.rf-note--warn { color: var(--rf-warn); }
.rf-note--error { color: var(--rf-error); }

/* ── 行 / 键值 ──────────────────────────────────────────────────────── */
.rf-meta { display: flex; gap: 8px; font-size: 11px; padding: 2px 0; }
.rf-meta__key { color: var(--rf-text-3); flex: 0 0 auto; }
.rf-meta__value { color: var(--rf-text-2); min-width: 0; }
.rf-row { display: flex; gap: 12px; align-items: center; padding: 8px 0; }
.rf-row:last-child { border-bottom: 0; }
.rf-row__main { flex: 1 1 auto; min-width: 0; }
.rf-row__title { font-size: 12px; color: var(--rf-text-1); }
.rf-row__sub { font-size: 11px; color: var(--rf-text-3); }
/* RF7 KvRow：标签 104 定宽 + 值 + 右侧状态。 */
.rf-kv { display: flex; gap: 10px; align-items: center; }
.rf-kv__label { flex: 0 0 104px; font-size: 11px; color: var(--rf-text-2); }
.rf-kv__value { flex: 1 1 auto; min-width: 0; font-size: 11px; color: var(--rf-text-1); }
.rf-kv__state { flex: 0 0 auto; font-size: 11px; }
.rf-kv__state--ok { color: var(--rf-ok); }
.rf-kv__state--warn { color: var(--rf-warn); }
.rf-kv__state--error { color: var(--rf-error); }
.rf-kv__state--muted { color: var(--rf-text-3); }

/* ── 网格 ───────────────────────────────────────────────────────────── */
.rf-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
.rf-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* ── 芯片行（RF7 ChipRow）────────────────────────────────────────────── */
.rf-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.rf-chip {
  border: 0;
  background: transparent;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 10px;
  color: var(--rf-text-2);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.rf-chip--on {
  background: var(--rf-accent-dim);
  color: var(--rf-accent);
  font-weight: 600;
}

/* ── 缩略图占位（RF7 Thumb）──────────────────────────────────────────── */
.rf-thumb {
  border-radius: 8px;
  background: var(--rf-surface-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--rf-text-3);
  flex: 0 0 auto;
}
.rf-thumb--picked { background: var(--rf-accent-dim); color: var(--rf-accent); }

/* ── 播放器条（RF7 PlayerBar）────────────────────────────────────────── */
.rf-playerbar {
  height: 32px;
  border-radius: 16px;
  background: var(--rf-surface-3);
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--rf-text-2);
}
.rf-playerbar__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--rf-text-2);
  flex: 0 0 auto;
}
/* 代码块（RF7 CodeBox）*/
.rf-code {
  border-radius: 8px;
  background: var(--rf-surface-2);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: var(--rf-text-2);
  word-break: break-all;
}

/* ── 单选 / 勾选（RF7 Radio / Checkbox）──────────────────────────────── */
.rf-radio {
  width: 16px;
  height: 16px;
  border-radius: 8px;
  border: 1px solid var(--rf-line);
  background: var(--rf-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
}
.rf-radio--on { border-color: var(--rf-accent); }
.rf-radio__dot {
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background: var(--rf-accent);
}
.rf-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--rf-line);
  background: var(--rf-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
}
.rf-check--on { background: var(--rf-accent); border-color: var(--rf-accent); }
.rf-check__tick { width: 6px; height: 6px; border-radius: 3px; background: var(--rf-on-accent); }

/* ── 枢纽条（RF7 HubStrip）───────────────────────────────────────────── */
.rf-hubstrip { flex-direction: row; align-items: center; gap: 14px; }
.rf-hubstat { display: flex; flex-direction: column; gap: 4px; flex: 1 1 0; min-width: 0; }
.rf-hubstat__caption { font-size: 10px; color: var(--rf-text-3); }
.rf-hubstat__value { font-size: 13px; font-weight: 600; color: var(--rf-text-1); }
.rf-hubstat__sub { font-size: 10px; color: var(--rf-text-2); }
.rf-divider { width: 1px; height: 42px; background: var(--rf-line); flex: 0 0 auto; }
/* 镜头摘要卡（RF7 ShotChip）*/
.rf-shotchip { gap: 6px; padding: 12px; }
.rf-shotchip__id { font-size: 10px; color: var(--rf-text-3); }
.rf-shotchip__size { font-size: 12px; font-weight: 600; color: var(--rf-text-1); }
.rf-shotstate { display: flex; align-items: center; gap: 6px; }
.rf-shotstate__dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }
.rf-shotstate__text { font-size: 10px; color: var(--rf-text-2); }

/* ── 对话同步行（RF7 ChatSyncLine）──────────────────────────────────── */
.rf-chat-sync {
  font-size: 10px;
  color: var(--rf-text-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── 输入 ───────────────────────────────────────────────────────────── */
.rf-field { display: inline-flex; flex-direction: column; gap: 4px; }
.rf-field__label { font-size: 10px; color: var(--rf-text-3); }
.rf-input {
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--rf-surface-3);
  color: var(--rf-text-1);
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
}
.rf-input--focus { border-color: var(--rf-accent); }
.rf-input--error { border-color: var(--rf-error); color: var(--rf-error); }
.rf-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}
/* RF7 输入占位块（只读展示态）：surface-3 底 + 8 圆角。 */
.rf-fieldbox {
  border-radius: 8px;
  background: var(--rf-surface-3);
  min-height: 32px;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--rf-text-1);
  display: flex;
  align-items: center;
}
.rf-fieldbox--placeholder { color: var(--rf-text-3); }
.rf-fieldbox--masked { color: var(--rf-text-2); }

/* ── 降级矩阵 ───────────────────────────────────────────────────────── */
.rf-matrix {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rf-matrix:last-child { border-bottom: 0; }
.rf-matrix__head { font-size: 11px; color: var(--rf-text-3); }

/* ── 捕获的对话输入 ─────────────────────────────────────────────────── */
.rf-captured {
  border: 1px solid var(--rf-line);
  border-left: 3px solid var(--rf-accent);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--rf-surface);
}
.rf-captured__label { font-size: 11px; color: var(--rf-text-3); margin-bottom: 4px; }
.rf-captured__text {
  font-size: 12px;
  color: var(--rf-text-1);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rf-captured__text--empty { color: var(--rf-text-3); }

/* ── 对话消息行 ─────────────────────────────────────────────────────── */
.rf-chatrow {
  border: 1px solid var(--rf-line);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--rf-surface);
}
.rf-chatrow__head { display: flex; gap: 8px; align-items: center; }
.rf-chatrow__kind {
  font-size: 10px;
  color: var(--rf-text-3);
  background: var(--rf-surface-3);
  border-radius: 4px;
  padding: 2px 6px;
}
.rf-chatrow__title { font-size: 11px; color: var(--rf-text-1); }
.rf-chatrow__body { margin-top: 8px; font-size: 11px; color: var(--rf-text-3); }
.rf-chatrow__toggle { border: 0; background: transparent; color: var(--rf-accent); font-size: 11px; cursor: pointer; }

/* ── 播放器 / 开关 ──────────────────────────────────────────────────── */
.rf-player { display: flex; gap: 12px; }
.rf-player__frame {
  width: 240px;
  aspect-ratio: 9 / 16;
  border-radius: 10px;
  background: var(--rf-surface-3);
  border: 1px solid var(--rf-line);
}
.rf-player__video { object-fit: contain; display: block; }
.rf-player__side { flex: 1 1 auto; min-width: 0; }
.rf-switch { display: inline-flex; width: 44px; height: 20px; border-radius: 10px; background: var(--dsw-alias-state-idle-primary); border: 0; }
.rf-switch--on { background: var(--rf-accent); }

/* ── 成本条 / 阶段 DNA / 其它小组件 ─────────────────────────────────── */
.rf-cost-row { display: flex; align-items: center; gap: 8px; }
.rf-cost-track { flex: 1 1 auto; height: 6px; border-radius: 3px; background: var(--rf-surface-3); overflow: hidden; }
.rf-cost-fill { height: 100%; background: var(--rf-accent); }
.rf-cost-fill--warn { background: var(--rf-warn); }
.rf-cost-label { flex: 0 0 auto; font-size: 10px; color: var(--rf-text-3); }
.rf-stage-dna__steps { display: flex; gap: 6px; margin-bottom: 6px; }
.rf-stage-dna__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rf-surface-3); }
.rf-stage-dna__dot--passed { background: var(--rf-ok); }
.rf-stage-dna__dot--current { background: var(--rf-accent); }
.rf-stage-dna__bars { display: flex; gap: 4px; height: 4px; }
.rf-stage-dna__bar { flex: 1 1 25%; border-radius: 2px; background: var(--rf-surface-3); }
.rf-stage-dna__bar--active { background: var(--rf-accent); }
.rf-dual-entry {
  display: flex;
  gap: 0;
  border: 1px solid var(--rf-line);
  border-radius: 8px;
  overflow: hidden;
}
.rf-dual-entry__half {
  flex: 1 1 50%;
  padding: 10px 12px;
  font-size: 11px;
  color: var(--rf-text-2);
  background: var(--rf-surface);
  text-align: center;
}
.rf-dual-entry__half + .rf-dual-entry__half { border-left: 1px solid var(--rf-line); }
.rf-ask-strip {
  border: 1px dashed var(--rf-line);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  color: var(--rf-text-2);
}
.rf-next-hint { font-size: 11px; color: var(--rf-text-3); }
.rf-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--rf-surface-3);
  color: var(--rf-text-2);
}

/* ── 分镜行（RF7 Storyboard 板）─────────────────────────────────────
 * 选中行 = accent-dim 底 + accent 描边（RF7 画板 07 的 shotRow 就是这么画的：
 * 选中时 fill=accent-dim、stroke=accent；未选中时**无底无描边**）。 */
.rf-shotrow {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--rf-text-1);
}
.rf-shotrow--on {
  background: var(--rf-accent-dim);
  border-color: var(--rf-accent);
}
.rf-shotrow__id { flex: 0 0 auto; font-size: 11px; font-weight: 600; color: var(--rf-text-2); }
.rf-shotrow--on .rf-shotrow__id { color: var(--rf-accent); }
.rf-shotrow__title { flex: 1 1 auto; min-width: 0; font-size: 11px; color: var(--rf-text-1); }
.rf-shotrow__dur { flex: 0 0 auto; font-size: 10px; color: var(--rf-text-3); }
.rf-shotrow__state { flex: 0 0 auto; font-size: 10px; color: var(--rf-text-3); }

/* ── 注入预览行（RF7 Context 板）────────────────────────────────── */
.rf-inject__line { font-size: 10px; color: var(--rf-accent); }

/* ── 成片播放器占位（RF7 Output 板：168 高的占位块）───────────────── */
.rf-playerbox {
  height: 168px;
  border-radius: 10px;
  background: var(--rf-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--rf-text-3);
}

/* ── 日志行的时间列 ─────────────────────────────────────────────── */
.rf-log__time { flex: 0 0 auto; font-size: 10px; color: var(--rf-text-3); }

/* ── 三列网格（RF7 Picker 板：缩略图 2×3）──────────────────────── */
.rf-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

/* ── 横向规格条（RF7 Intake 板的「分辨率 / 比例 / 背景音乐」）──── */
.rf-settingsbar { flex-direction: row; align-items: center; gap: 14px; }

/* ── 虚线投放区（RF7 Intake / Skills 板的拖放框）────────────────── */
.rf-dropzone {
  border: 1px dashed var(--rf-line);
  border-radius: 8px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--rf-text-3);
}

/* ── 四阶段分段条（RF7 Stages 板）──────────────────────────────── */
.rf-segments { display: flex; gap: 4px; }
.rf-segment { flex: 1 1 25%; height: 6px; border-radius: 3px; background: var(--rf-surface-3); }
.rf-segment--on { background: var(--rf-accent); }
/* 图例色：llm 完成（绿）/ image 进行中（蓝）/ 待跑（中性）。 */
.rf-legend { font-size: 10px; color: var(--rf-text-3); }
.rf-legend--ok { color: var(--rf-ok); }
.rf-legend--accent { color: var(--rf-accent); }
.rf-legend--muted { color: var(--rf-text-3); }

/* ── 步骤序号圆点（RF7 Skills 板的工作流自迭代）────────────────── */
.rf-stepnum {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--rf-accent-dim);
  color: var(--rf-accent);
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

/* ── 素材选择器条目（RF7 Picker 板）────────────────────────────── */
.rf-pickeritem {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: flex;
  justify-content: center;
}
.rf-pickeritem--on .rf-thumb {
  outline: 2px solid var(--rf-accent);
  outline-offset: 2px;
}
`;
})(RF);
