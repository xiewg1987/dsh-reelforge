/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台样式（只用 `--dsw-alias-*` 主题 token，不写十六进制字面量）。
 *
 * 骨架四层：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 * 右栏 Tab 容器是 `overflow:hidden` —— 不自建滚动容器，内容超高时底栏会被裁掉且滚不到（R7）。
 *
 * 状态色只用令牌色；禁用态用**实色**令牌，不用 `opacity` 表达层级。
 *
 * ## 颜色：设计令牌 → 宿主 token 的映射（差距表 §4.17 第 1 条）
 *
 * 设计稿板 17 给的是**一套深色**的 17 个令牌；宿主有明暗两套主题，
 * 所以每个设计令牌都落到一个 `--dsw-alias-*` 上 —— 跟着宿主明暗自动切，
 * 插件**不写十六进制字面量**（设计方案 §4.3 / 硬规则 R6 / 验收项 A7）。
 *
 * ⚠️ 强调色这一支是宿主的 **accent**，**不是** `brand-primary`。
 * 宿主自己的 `packages/client/ui-dockkit/src/components/dockkit.module.css:10` 写着：
 * 「Emphasis … takes the platform's accent
 *  (`--dsw-alias-brand-primary-new-colorprimary-new-color`), not
 *  `--dsw-alias-brand-primary`, which this platform binds to its near-black」
 * —— `brand-primary` 在本平台是**近黑（浅色主题）/ 近白（暗色主题）**，
 * 拿它当强调色 = 整个工作台没有颜色（owner 实机反馈「UI 颜色都没有改变」）。
 * 设计稿板 01 / 06 的当前步点、选中卡描边、主按钮、开关、进度条全是那支蓝。
 *
 * ### 17 个设计令牌 → 宿主 token（板 17 号板）
 *
 * 设计稿给的是**一套深色**色板；宿主有明暗两套主题，下表的「浅/暗」是宿主
 * 两套主题下该 token 的实际取值（宿主主题源：
 * packages/client/ui-theme/src/styles/design-platform.css）。
 *
 * | 设计令牌 | hex | 宿主 token | 浅色 | 暗色 | 用在哪 |
 * | --- | --- | --- | --- | --- | --- |
 * | BG | #0B0E14 | --dsw-alias-bg-base | #FFFFFF | #151517 | 面板底 |
 * | SURFACE | #171A20 | --dsw-alias-bg-layer-1 | #FFFFFF | #232324 | 卡面 |
 * | SURFACE-2 | #12151B | --dsw-alias-bg-layer-2 | #FFFFFF | #2C2C2E | StageBar / 页签条 |
 * | SURFACE-3 | #1F2127 | --dsw-alias-bg-layer-3 | #FFFFFF | #353638 | 胶囊 / 输入底 |
 * | LINE | #23262B | --dsw-alias-border-l2 | rgba(0,0,0,.1) | rgba(255,255,255,.12) | 常规边框 |
 * | LINE-2 | #2D3035 | --dsw-alias-border-l3 | rgba(0,0,0,.12) | rgba(255,255,255,.16) | 强边框 |
 * | TEXT-1 | #F2F5F9 | --dsw-alias-label-primary | #0F1115 | #F9FAFB | 主文字 |
 * | TEXT-2 | #8A93A5 | --dsw-alias-label-secondary | #61666B | #CFD3D6 | 次文字 |
 * | TEXT-3 | #5B6472 | --dsw-alias-label-tertiary | #81858C | #ADB2B8 | 三级文字 |
 * | ACCENT | #4C8DFF | --dsw-alias-brand-primary-new-colorprimary-new-color | #4176E6 | #5686FE | 强调色：当前步点 / 选中描边 / 主按钮 / 开关 / 进度条 / logo |
 * | ACCENT-DIM | #16203A | color-mix(accent 14%, transparent) | 淡蓝 | #32394B | 选中态胶囊底（板 01 当前步 chip） |
 * | OK | #3FB950 | --dsw-alias-state-success-primary | #22C55E | #22C55E | 完成 |
 * | WARN | #D29922 | --dsw-alias-state-warn-label | #DD8629 | #DD8629 | 警告 |
 * | WARN-SURF | #2A2214 | color-mix(state-warn-label 10%, bg-layer-1) | #FCF3EA | #362D25 | 警告面（板 06 显存条 / 板 16 降级详情卡描边） |
 * | ERROR | #F85149 | --dsw-alias-state-error-primary | #EC1313 | #F25A5A | 错误 |
 * | ERROR-SURF | #2A1618 | color-mix(state-error-primary 10%, bg-layer-1) | #FDE7E7 | #382929 | 错误面（板 04 结论卡） |
 * | WHITE | #FFFFFF | --dsw-alias-toast-label | #FFFFFF | #FFFFFF | 强调色上的标记 |
 *
 * ⚠️ 两处**故意**不用最接近的宿主 token：
 *   1. ACCENT 用 `brand-primary-new-colorprimary-new-color` 而不是别的蓝 ——
 *      宿主自己在 dockkit / trajectory / settings 里就用它当强调色，语义一致。
 *   2. WHITE 用 `toast-label` 而不是 `label-primary-foreground` ——
 *      后者会随主题反转（暗色主题变近黑），蓝底近黑字读不清；宿主自己的
 *      做法也是「蓝底上的箭头保持白色」（InputBar.module.css:384）。
 *
 * 底色与中性色**跟随宿主主题**：宿主切暗色时面板与设计稿几乎 1:1
 * （BG #151517 vs #0B0E14、SURFACE #232324 vs #171A20、TEXT-1 #F9FAFB vs #F2F5F9）；
 * 浅色主题下宿主把 layer-1/2/3 全压成纯白，面板没有表面层次 —— 那是宿主
 * 浅色主题本身的取法，插件不另立一套（§4.3 / R6）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.STYLES = `
.rf-root {
  /* ── 插件级语义色层：设计令牌 → 宿主 token ────────────────────────────
   * 下面每个 --rf-* 都是**一个设计令牌**，值全部由宿主 token 派生。 */
  /* 强调色 = 设计稿 ACCENT（hex 见文件头的映射表）：宿主 accent 那一支。 */
  --rf-accent: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  /* 强调色的暗面 = 设计稿 ACCENT-DIM：选中态胶囊底（板 01 号板当前步 chip）。
     用 color-mix 而不是写死色值 —— 跟着宿主主题自动深浅。 */
  --rf-accent-dim: color-mix(in srgb, var(--rf-accent) 18%, var(--dsw-alias-bg-layer-2));
  --rf-stage-passed: var(--dsw-alias-state-success-primary);
  --rf-stage-idle: var(--dsw-alias-border-l3);
  /* 强调色上的标记（主按钮文字 / 面板头 ▶ 三角）：**两套主题都是白**。
     取 --dsw-alias-toast-label（明暗两套都是 neutral-bluish-00 = 白）——
     label-primary-foreground 会随主题反转（暗色主题变近黑），蓝底近黑字读不清；
     宿主自己的做法也是「蓝底上的箭头保持白色」
     （ui-conversation/src/client/skeleton/InputBar.module.css:384）。 */
  --rf-on-accent: var(--dsw-alias-toast-label);
  /* 强调色的 hover：浅色主题压深、暗色主题提亮（靠 label-primary 的明暗差）。 */
  --rf-accent-hover: color-mix(in srgb, var(--rf-accent) 86%, var(--dsw-alias-label-primary));

  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
}
.rf-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
/* 面板头 logo = 蓝底 + 白色 ▶（设计稿板 01 号板）。 */
.rf-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--rf-accent);
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* ▶ 用纯 CSS 三角（border 技巧）—— 不引图片、不写死颜色。 */
.rf-header__logo::after {
  content: '';
  width: 0;
  height: 0;
  border-left: 9px solid var(--rf-on-accent);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}
/* 流程屏里，面板头 logo 是「回到工作台」的出口。 */
.rf-header__logo--button {
  border: 0;
  padding: 0;
  cursor: pointer;
}
.rf-header__text { min-width: 0; flex: 1 1 auto; }
.rf-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.rf-header__subtitle {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.rf-header__status {
  flex: 0 0 auto;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rf-stagebar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow-x: auto;
}
.rf-stagebar__step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  /* StageBar 的步点是**可点**的（点哪一步到那一屏）—— 按钮态要复位，
     底色与文字色交给 current / passed / upcoming 三个修饰类。 */
  border: 0;
  background: transparent;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
}
/* 当前步的胶囊底 = 设计稿 ACCENT-DIM（板 01 号板）。 */
.rf-stagebar__step--current {
  background: var(--rf-accent-dim);
  color: var(--dsw-alias-label-primary);
}
.rf-stagebar__step--passed { color: var(--dsw-alias-label-tertiary); }
.rf-stagebar__step--upcoming { color: var(--dsw-alias-label-caption); }
.rf-stagebar__step--passed:hover,
.rf-stagebar__step--upcoming:hover { color: var(--dsw-alias-label-secondary); }
.rf-stagebar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
}
/* 当前步点 = 设计稿 ACCENT（板 01 号板）。 */
.rf-stagebar__dot--current { background: var(--rf-accent); }
.rf-stagebar__dot--passed { background: var(--rf-stage-passed); }
.rf-stagebar__dot--upcoming { background: var(--rf-stage-idle); }
.rf-stagebar__count {
  margin-left: auto;
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
}
.rf-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 4px;
  padding: 8px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow-x: auto;
}
.rf-tabs__item {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.rf-tabs__item--active {
  border-color: var(--rf-accent);
  background: var(--rf-accent-dim);
  color: var(--dsw-alias-label-primary);
}
.rf-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
}
.rf-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--dsw-alias-bg-layer-1);
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.rf-footer__text { min-width: 0; flex: 1 1 auto; }
.rf-footer__label {
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
  /* 成本位是单行数据，不能被挤成两行 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-footer__value {
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  /* 副标题在窄栏里单行截断（header 里还有一份全文），不要折成三行把底栏撑高 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
.rf-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.rf-section {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  margin: 4px 0 8px;
}
.rf-card {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 12px;
  margin-bottom: 12px;
}
/* 选中态描边 = 设计稿 ACCENT（板 03 / 05 / 06 号板）。
   ⚠️ **不染底**：设计稿三块板的选中卡，填充色与没选中一样（同一个 SURFACE 色），
   只有描边换成 ACCENT（06 号板另加左侧 4px 条）—— 染底是多加的，不是设计稿。 */
.rf-card--selected {
  border-color: var(--rf-accent);
}
/* 板 06 号板：阶段卡选中态 = 蓝描边 **+ 左侧 4px 蓝条**。 */
.rf-card--accent { border-left: 4px solid var(--rf-accent); }
/* 状态面（画板 17 号板的 WARN-SURF / ERROR-SURF 两个令牌）：
   面 = 状态色薄薄一层压在卡面色上，描边 = 状态色本身。
   画板 06 号板「显存门槛提示条」黄面 / 画板 04 号板「结论卡」红面。 */
.rf-card--warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-label) 10%, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-alias-state-warn-label);
}
.rf-card--error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-alias-state-error-primary);
}
/* 画板 16 号板「一次真实降级」卡：普通面 + 黄描边。 */
.rf-card--warn-border { border-color: var(--dsw-alias-state-warn-label); }
.rf-card--disabled { border-color: var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-caption); }
.rf-btn {
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  padding: 6px 12px;
  /* 按钮文字不许被 flex 压扁折行（窄栏下会变成「成／片」两行） */
  white-space: nowrap;
  flex: 0 0 auto;
  font-size: 12px;
  cursor: pointer;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
}
/* 主按钮 = 设计稿 ACCENT 蓝底 + 白字（板 01 / 03 / 05 / 06 号板的 Footer 主按钮）。 */
.rf-btn--primary { background: var(--rf-accent); border-color: var(--rf-accent); color: var(--rf-on-accent); }
.rf-btn--primary:hover { background: var(--rf-accent-hover); border-color: var(--rf-accent-hover); }
.rf-btn--secondary { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); }
.rf-btn--danger { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }
.rf-btn--disabled { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l1); color: var(--dsw-alias-label-caption); cursor: not-allowed; }
/* ⚠️ 禁用态的优先级必须压过 :hover —— 否则禁用的主按钮一悬停就变蓝，
     看起来像可点的。.rf-btn--primary:hover 的特异性 (0,2,0) 高于
     .rf-btn--disabled 的 (0,1,0)，所以禁用态要把 :hover 一起写。 */
.rf-btn--disabled:hover,
.rf-btn--disabled:focus { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l1); }
.rf-field { display: inline-flex; flex-direction: column; gap: 4px; }
.rf-field__label { font-size: 10px; color: var(--dsw-alias-label-caption); }
.rf-input {
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  padding: 6px 8px;
  font-size: 12px;
}
.rf-input--focus { border-color: var(--rf-accent); }
.rf-input--error { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
/* 多行正文（板 02 的「小说正文」输入）。 */
.rf-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}
.rf-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
}
/* 进行中 = 设计稿「生成中 6/8」：ACCENT-DIM 底 + ACCENT 字（板 01 号板）。 */
.rf-pill--running { background: var(--rf-accent-dim); color: var(--rf-accent); }
.rf-pill--done { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-success-primary); }
.rf-pill--failed { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-error-primary); }
.rf-pill--queued { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-caption); }
/* 降级但仍交付（板 16 号板降级矩阵的黄色格）：
   板 15 的胶囊只列了 4 态，「降级」是跨流程规范板 16 追加的第 5 种语义。 */
.rf-pill--warn { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-warn-label); }
/* 进度条填充 = 设计稿 ACCENT（板 01 号板，运行中）。 */
.rf-progress { position: relative; height: 8px; border-radius: 4px; background: var(--dsw-alias-bg-layer-3); overflow: hidden; }
.rf-progress__fill { height: 100%; background: var(--rf-accent); }
.rf-progress--done .rf-progress__fill { background: var(--dsw-alias-state-success-primary); }
.rf-progress--failed .rf-progress__fill { background: var(--dsw-alias-state-error-primary); }
.rf-progress__label { position: absolute; inset: 0; font-size: 10px; color: var(--dsw-alias-label-secondary); }
.rf-empty { border: 1px dashed var(--dsw-alias-border-l3); border-radius: 8px; padding: 16px; text-align: center; }
.rf-empty--error { border-color: var(--dsw-alias-state-error-primary); }
.rf-empty__title { font-size: 12px; color: var(--dsw-alias-label-primary); }
.rf-empty__hint { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 4px; }
.rf-toast { display: flex; gap: 8px; align-items: center; border-radius: 8px; padding: 8px 12px; font-size: 12px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); }
.rf-toast--warning { color: var(--dsw-alias-state-warn-label); }
.rf-toast--error { color: var(--dsw-alias-state-error-primary); }
.rf-toast__close { border: 0; background: transparent; color: inherit; cursor: pointer; }
.rf-meta { display: flex; gap: 8px; font-size: 11px; padding: 2px 0; }
.rf-meta__key { color: var(--dsw-alias-label-caption); flex: 0 0 auto; }
.rf-meta__value { color: var(--dsw-alias-label-secondary); min-width: 0; }
.rf-row { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rf-row:last-child { border-bottom: 0; }
.rf-row__main { flex: 1 1 auto; min-width: 0; }
.rf-row__title { font-size: 12px; color: var(--dsw-alias-label-primary); }
.rf-row__sub { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
/* 降级矩阵（板 16 号板）：缺失项 + 3 列产出形态。
   第一列吃掉剩余宽度，三列按内容宽度 —— 窄栏（300px）也不破版。 */
.rf-matrix { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rf-matrix:last-child { border-bottom: 0; }
.rf-matrix__head { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rf-note { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 8px; }
.rf-note--warn { color: var(--dsw-alias-state-warn-label); }
.rf-note--error { color: var(--dsw-alias-state-error-primary); }
.rf-captured {
  border: 1px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--rf-accent);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.rf-captured__label {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  margin-bottom: 4px;
}
.rf-captured__text {
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rf-captured__text--empty { color: var(--dsw-alias-label-caption); }
.rf-chatrow { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 12px; margin-bottom: 8px; background: var(--dsw-alias-bg-layer-1); }
.rf-chatrow__head { display: flex; gap: 8px; align-items: center; }
.rf-chatrow__kind { font-size: 10px; color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-3); border-radius: 4px; padding: 2px 6px; }
.rf-chatrow__title { font-size: 11px; color: var(--dsw-alias-label-primary); }
.rf-chatrow__body { margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rf-chatrow__toggle { border: 0; background: transparent; color: var(--rf-accent); font-size: 11px; cursor: pointer; }
.rf-player { display: flex; gap: 12px; }
.rf-player__frame { width: 240px; aspect-ratio: 9 / 16; border-radius: 10px; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); }
.rf-player__video { object-fit: contain; display: block; }
.rf-player__side { flex: 1 1 auto; min-width: 0; }
.rf-switch { display: inline-flex; width: 44px; height: 20px; border-radius: 10px; background: var(--dsw-alias-state-idle-primary); border: 0; }
/* 开关打开 = 设计稿 ACCENT 胶囊（板 10 号板）。 */
.rf-switch--on { background: var(--rf-accent); }
.rf-dual-entry { display: flex; gap: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.rf-dual-entry__half { flex: 1 1 50%; padding: 10px 12px; font-size: 11px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); text-align: center; }
.rf-dual-entry__half + .rf-dual-entry__half { border-left: 1px solid var(--dsw-alias-border-l2); }
.rf-chat-sync { font-size: 10px; color: var(--dsw-alias-label-caption); margin-bottom: 12px; }
.rf-cost-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rf-cost-track { flex: 1 1 auto; height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-layer-3); overflow: hidden; }
.rf-cost-fill { height: 100%; background: var(--rf-accent); }
.rf-cost-fill--warn { background: var(--dsw-alias-state-warn-primary); }
.rf-cost-label { flex: 0 0 auto; font-size: 10px; color: var(--dsw-alias-label-caption); }
.rf-stage-dna { margin-bottom: 12px; }
.rf-stage-dna__steps { display: flex; gap: 6px; margin-bottom: 6px; }
.rf-stage-dna__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-bg-layer-3); }
.rf-stage-dna__dot--passed { background: var(--dsw-alias-state-success-primary); }
.rf-stage-dna__dot--current { background: var(--rf-accent); }
.rf-stage-dna__bars { display: flex; gap: 4px; height: 4px; }
.rf-stage-dna__bar { flex: 1 1 25%; border-radius: 2px; background: var(--dsw-alias-bg-layer-3); }
.rf-stage-dna__bar--active { background: var(--rf-accent); }
.rf-ask-strip { border: 1px dashed var(--dsw-alias-border-l2); border-radius: 8px; padding: 10px 12px; font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 12px; }
.rf-next-hint { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 12px; }
.rf-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 4px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); }
`;
})(RF);
