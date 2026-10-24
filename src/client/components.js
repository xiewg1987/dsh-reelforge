/* ─────────────────────────────────────────────────────────────────────────────
 * 7 组基础组件的**全部态**（画板 15）。
 *
 * 两条视觉纪律：
 *   1. 状态色只用令牌色，**不用 `opacity` 表达层级**；
 *   2. 禁用态用**实色**令牌（`--dsw-alias-state-idle-primary` 一类的实色），不用半透明。
 *
 * 组件只吐 class 名，样式在 `src/client/workbench/styles.js`（只用 `--dsw-alias-*`）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 组件 class 前缀：与宿主 primitive 的类名不撞。 */
  RF.CLS = 'rf';

  /**
   * 按钮：主要 / 次要 / 幽灵 / 危险。
   *
   * RF7 的零件里有三种按钮：`Button/Primary`（40 高 · accent 底）、
   * `Button/Ghost`（28 高 · surface-3 底）、`Button/Danger`（透明底 · 错误色描边）。
   * `secondary` 是旧版的次要按钮名，保留为 `ghost` 的别名（老词条还在用）。
   *
   * @param {{ label: string, variant?: string, onClick?: function, disabled?: boolean, title?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Button = function Button(props) {
    const variant = ['secondary', 'ghost', 'danger'].includes(props.variant)
      ? (props.variant === 'secondary' ? 'ghost' : props.variant)
      : 'primary';
    const disabled = props.disabled === true;
    return h('button', {
      type: 'button',
      className: `${RF.CLS}-btn ${RF.CLS}-btn--${variant}${disabled ? ` ${RF.CLS}-btn--disabled` : ''}`,
      disabled,
      title: props.title,
      onClick: disabled ? undefined : props.onClick,
    }, props.label);
  };

  /**
   * 输入框：默认 / 聚焦 / 错误。
   * @param {{ value?: string, placeholder?: string, state?: string, onChange?: function, label?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Input = function Input(props) {
    const state = props.state === 'focus' || props.state === 'error' ? props.state : 'default';
    return h('label', { className: `${RF.CLS}-field` },
      props.label === undefined ? null : h('span', { className: `${RF.CLS}-field__label` }, props.label),
      h('input', {
        className: `${RF.CLS}-input ${RF.CLS}-input--${state}`,
        value: props.value ?? '',
        placeholder: props.placeholder ?? '',
        onChange: props.onChange,
      }));
  };

  /**
   * 胶囊 / 标签（RF7 的 `RF/StatusPill`）。
   *
   * RF7 的胶囊只有四种底：surface-3 + 文字色（中性 / 绿 / 黄 / 红），
   * 外加 accent-dim 底 + accent 字（当前态）。
   *
   * ⚠️ 词条名有两套：RF7 的语义名（`accent` / `ok` / `error` / `neutral` / `warn`）
   * 与旧版的机械名（`running` / `done` / `failed` / `queued`）。
   * 两者都认，class 名照原样吐出去 —— 旧测试按 `rf-pill--running` 找，
   * 样式表把两套映射到同一套配色。
   *
   * @param {{ label: string, tone?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Pill = function Pill(props) {
    const tones = ['neutral', 'accent', 'ok', 'warn', 'error', 'running', 'done', 'failed', 'queued'];
    const tone = tones.includes(props.tone) ? props.tone : 'queued';
    return h('span', { className: `${RF.CLS}-pill ${RF.CLS}-pill--${tone}` }, props.label);
  };

  /**
   * 进度条：进行中 / 完成 / 失败。
   * @param {{ value?: number, tone?: string, label?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Progress = function Progress(props) {
    const tone = ['running', 'done', 'failed'].includes(props.tone) ? props.tone : 'running';
    const ratio = Math.max(0, Math.min(1, Number(props.value ?? 0)));
    return h('div', { className: `${RF.CLS}-progress ${RF.CLS}-progress--${tone}`, role: 'progressbar' },
      h('div', { className: `${RF.CLS}-progress__fill`, style: { width: `${Math.round(ratio * 100)}%` } }),
      props.label === undefined ? null : h('span', { className: `${RF.CLS}-progress__label` }, props.label));
  };

  /**
   * 空态：无数据 / 出错了。
   *
   * ⚠️ `action` 是**可选的行动按钮**（RF7 的「去新建项目」这类入口）。
   * 以前这个槽位不存在 ⇒ 空态里的按钮被静默丢掉，
   * 用户看到一句「还没有章节」却没有任何可点的东西。
   *
   * @param {{ title: string, hint?: string, tone?: string, action?: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.EmptyState = function EmptyState(props) {
    const tone = props.tone === 'error' ? 'error' : 'empty';
    return h('div', { className: `${RF.CLS}-empty ${RF.CLS}-empty--${tone}` },
      h('div', { className: `${RF.CLS}-empty__title` }, props.title),
      props.hint === undefined ? null : h('div', { className: `${RF.CLS}-empty__hint` }, props.hint),
      props.action === undefined || props.action === null
        ? null
        : h('div', { className: `${RF.CLS}-empty__action` }, props.action));
  };

  /**
   * Toast：信息 / 警告 / 错误。
   * @param {{ message: string, tone?: string, onDismiss?: function }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Toast = function Toast(props) {
    const tone = ['info', 'warning', 'error'].includes(props.tone) ? props.tone : 'info';
    return h('div', { className: `${RF.CLS}-toast ${RF.CLS}-toast--${tone}`, role: 'status' },
      h('span', { className: `${RF.CLS}-toast__message` }, props.message),
      props.onDismiss === undefined
        ? null
        : h('button', { type: 'button', className: `${RF.CLS}-toast__close`, onClick: props.onDismiss }, '×'));
  };

  /**
   * 卡片：默认 / 选中 / 禁用。
   *
   * ⚠️ 带 `onClick` 的卡片**必须键盘可达**：只挂 `onClick` 的 `div`
   * 鼠标能用、键盘用不了（实机验证时抓到的）。
   *
   * ⇒ 可点时补 `role="button"` + `tabIndex` + Enter/Space 键。
   * 事件来自卡片**内部**的按钮时**不重复触发**卡片自己的动作。
   *
   * `className` 用来挂 RF7 的零件变体（如 `rf-hubstrip` 的横向排版）。
   *
   * @param {{ children: any, state?: string, onClick?: function, accent?: boolean, tone?: string, className?: string }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.Card = function Card(props) {
    const state = props.state === 'selected' || props.state === 'disabled' ? props.state : 'default';
    const clickable = state !== 'disabled' && typeof props.onClick === 'function';
    // `accent` = 左侧 4px 强调色竖条（RF7 阶段卡的选中态）。
    const accent = props.accent === true ? ` ${RF.CLS}-card--accent` : '';
    // `tone` = 状态面：
    //   `warn`        黄面 + 黄描边
    //   `error`       红面 + 红描边
    //   `warn-border` 普通面 + 黄描边
    const tone = ['warn', 'error', 'warn-border'].includes(props.tone) ? ` ${RF.CLS}-card--${props.tone}` : '';
    const extra = typeof props.className === 'string' && props.className !== '' ? ` ${props.className}` : '';
    return h('div', {
      className: `${RF.CLS}-card ${RF.CLS}-card--${state}${accent}${tone}${extra}`,
      onClick: clickable ? props.onClick : undefined,
      role: clickable ? 'button' : undefined,
      tabIndex: clickable ? 0 : undefined,
      onKeyDown: clickable
        ? (event) => {
          if (event?.target !== event?.currentTarget) return;
          const key = event?.key;
          if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
          if (event?.preventDefault) event.preventDefault();
          props.onClick(event);
        }
        : undefined,
    }, props.children);
  };

  /** 分组标题（画板里的 12px 分组标签）。 */
  RF.SectionLabel = function SectionLabel(props) {
    return h('div', { className: `${RF.CLS}-section` }, props.children);
  };

  /** 一行键值（设计稿里大量使用的「标签 + 值」行）。 */
  RF.MetaRow = function MetaRow(props) {
    return h('div', { className: `${RF.CLS}-meta` },
      h('span', { className: `${RF.CLS}-meta__key` }, props.label),
      h('span', { className: `${RF.CLS}-meta__value` }, props.value));
  };

  /**
   * 组件集合（页签与消息行统一从这里取）。
   *
   * ⚠️ 顺序约束：这段必须**放在所有组件定义之后**。
   * 它是一次性快照（`RF.ui = { Button: RF.Button, ... }`），若在 `RF.SectionLabel` /
   * `RF.MetaRow` 定义之前执行，这两个槽位会永久取到 `undefined`，
   * 页签与消息行里 `h(RF.ui.SectionLabel, ...)` 就会抛
   * "Element type is invalid"（有数据时必崩）。
   */
  RF.ui = {
    Button: RF.Button,
    Input: RF.Input,
    Pill: RF.Pill,
    Progress: RF.Progress,
    EmptyState: RF.EmptyState,
    Toast: RF.Toast,
    Card: RF.Card,
    SectionLabel: RF.SectionLabel,
    MetaRow: RF.MetaRow,
  };
})(RF);
