/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台样式（只用 `--dsw-alias-*` 主题 token，不写十六进制字面量）。
 *
 * 骨架四层：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 * 右栏 Tab 容器是 `overflow:hidden` —— 不自建滚动容器，内容超高时底栏会被裁掉且滚不到（R7）。
 *
 * 状态色只用令牌色；禁用态用**实色**令牌，不用 `opacity` 表达层级。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.STYLES = `
.rf-root {
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
.rf-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--dsw-alias-brand-primary);
  flex: 0 0 auto;
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
}
.rf-stagebar__step--current {
  background: var(--dsw-alias-button-primary-dimmed);
  color: var(--dsw-alias-label-primary);
}
.rf-stagebar__step--passed { color: var(--dsw-alias-label-secondary); }
.rf-stagebar__step--upcoming { color: var(--dsw-alias-label-caption); }
.rf-stagebar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.rf-stagebar__dot--current { background: var(--dsw-alias-brand-primary); }
.rf-stagebar__dot--passed { background: var(--dsw-alias-state-success-primary); }
.rf-stagebar__dot--upcoming { background: var(--dsw-alias-state-idle-primary); }
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
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-button-primary-dimmed);
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
.rf-card--selected { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-button-primary-dimmed); }
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
.rf-btn--primary { background: var(--dsw-alias-button-primary-fill); border-color: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.rf-btn--primary:hover { background: var(--dsw-alias-button-primary-hover); }
.rf-btn--secondary { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary); }
.rf-btn--danger { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }
.rf-btn--disabled { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l1); color: var(--dsw-alias-label-caption); cursor: not-allowed; }
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
.rf-input--focus { border-color: var(--dsw-alias-state-business-primary); }
.rf-input--error { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.rf-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
}
.rf-pill--running { background: var(--dsw-alias-button-primary-dimmed); color: var(--dsw-alias-state-business-primary); }
.rf-pill--done { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-success-primary); }
.rf-pill--failed { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-error-primary); }
.rf-pill--queued { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-caption); }
.rf-progress { position: relative; height: 8px; border-radius: 4px; background: var(--dsw-alias-bg-layer-3); overflow: hidden; }
.rf-progress__fill { height: 100%; background: var(--dsw-alias-brand-primary); }
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
.rf-note { font-size: 11px; color: var(--dsw-alias-label-caption); margin-top: 8px; }
.rf-note--warn { color: var(--dsw-alias-state-warn-label); }
.rf-note--error { color: var(--dsw-alias-state-error-primary); }
.rf-captured {
  border: 1px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--dsw-alias-brand-primary);
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
.rf-chatrow__toggle { border: 0; background: transparent; color: var(--dsw-alias-state-business-primary); font-size: 11px; cursor: pointer; }
.rf-player { display: flex; gap: 12px; }
.rf-player__frame { width: 240px; aspect-ratio: 9 / 16; border-radius: 10px; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); }
.rf-player__side { flex: 1 1 auto; min-width: 0; }
.rf-switch { display: inline-flex; width: 44px; height: 20px; border-radius: 10px; background: var(--dsw-alias-state-idle-primary); border: 0; }
.rf-switch--on { background: var(--dsw-alias-brand-primary); }
`;
})(RF);
