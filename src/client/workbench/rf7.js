/* ─────────────────────────────────────────────────────────────────────────────
 * RF7 基础件（`design/_tools/build-rf7.mjs` 里那些 `RF/*` 零件的代码版）。
 *
 * 设计稿的每个板都是「零件 + 内容」两层：
 * 零件（卡片 / 分区标题 / 键值行 / 芯片行 / 缩略图 / 提示卡 / 播放器条 / 代码块 /
 * 单选 / 勾选 / 进度条 / 枢纽条 / 镜头卡）在本文件里各有一个函数，
 * 各板只负责**排内容**。
 *
 * 纪律：
 *   1. 颜色一律走 `--rf-*`（styles.js 的令牌层），**不写十六进制字面量**；
 *   2. 不用 `opacity` 表达层级，状态用实色；
 *   3. 零件只吐 class 名，样式全在 `workbench/styles.js`。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 分区标题：13/600 主标题 + 10px 副标题（RF7 SectionHead）。 */
  RF.r7SectionHead = function r7SectionHead(title, sub) {
    return h('div', { className: `${RF.CLS}-sechead` },
      h('div', { className: `${RF.CLS}-sechead__title` }, title),
      sub === undefined || sub === null || sub === ''
        ? null
        : h('div', { className: `${RF.CLS}-sechead__sub` }, sub));
  };

  /**
   * 键值行：标签（104 定宽）+ 值 + 右侧状态（RF7 KvRow）。
   * @param {string} label - 标签。
   * @param {string} value - 值。
   * @param {string} [state] - 右侧状态文字（可空）。
   * @param {string} [tone] - 状态色调：ok / warn / error / muted。
   * @param {object} [right] - 右侧自定义节点（按钮等）。
   * @returns {object} React 元素。
   */
  RF.r7KvRow = function r7KvRow(label, value, state, tone, right) {
    const kids = [
      h('span', { className: `${RF.CLS}-kv__label` }, label),
      h('span', { className: `${RF.CLS}-kv__value` }, value),
    ];
    if (state !== undefined && state !== null && state !== '') {
      const key = ['ok', 'warn', 'error', 'muted'].includes(tone) ? tone : 'muted';
      kids.push(h('span', { className: `${RF.CLS}-kv__state ${RF.CLS}-kv__state--${key}` }, state));
    }
    if (right !== undefined && right !== null) kids.push(right);
    return h('div', { className: `${RF.CLS}-kv` }, kids);
  };

  /**
   * 芯片行（RF7 ChipRow）：选中项 accent-dim 底 + accent 字。
   *
   * ⚠️ **没有回调的芯片行 = 不可用的筛选器**（插件没有对应能力）⇒ 按钮必须
   * **禁用并写明原因**，不能留一批「点了没反应」的按钮。
   *
   * @param {Array<string>} items - 芯片文案。
   * @param {number} [activeIndex] - 选中项下标（-1 = 无选中）。
   * @param {function} [onSelect] - 点击回调（下标）。
   * @param {string} [disabledTitle] - 不可用时的说明（tooltip）。
   * @returns {object} React 元素。
   */
  RF.r7ChipRow = function r7ChipRow(items, activeIndex, onSelect, disabledTitle) {
    const list = Array.isArray(items) ? items : [];
    const usable = typeof onSelect === 'function';
    return h('div', { className: `${RF.CLS}-chips` },
      list.map((label, index) => h('button', {
        key: `${label}-${index}`,
        type: 'button',
        className: `${RF.CLS}-chip${index === activeIndex ? ` ${RF.CLS}-chip--on` : ''}`,
        disabled: !usable,
        title: usable ? undefined : disabledTitle,
        onClick: usable ? () => onSelect(index) : undefined,
      }, label)));
  };

  /**
   * 缩略图占位（RF7 Thumb）：只定版式不画内容。
   * @param {string} label - 占位文字。
   * @param {{ size?: number, picked?: boolean }} [options] - 尺寸与已选态。
   * @returns {object} React 元素。
   */
  RF.r7Thumb = function r7Thumb(label, options) {
    const opts = options ?? {};
    const size = Number(opts.size) > 0 ? Number(opts.size) : 48;
    return h('div', {
      className: `${RF.CLS}-thumb${opts.picked === true ? ` ${RF.CLS}-thumb--picked` : ''}`,
      style: { width: `${size}px`, height: `${size}px` },
    }, label);
  };

  /**
   * 提示卡（RF7 NoticeCard）：surface-2 面 + 无描边，一行主文案 + 可选副文案。
   * @param {string} main - 主文案。
   * @param {string} [sub] - 副文案。
   * @returns {object} React 元素。
   */
  RF.r7Notice = function r7Notice(main, sub) {
    return h('div', { className: `${RF.CLS}-notice` },
      h('div', { className: `${RF.CLS}-notice__main` }, main),
      sub === undefined || sub === null || sub === ''
        ? null
        : h('div', { className: `${RF.CLS}-notice__sub` }, sub));
  };

  /** 播放器条（RF7 PlayerBar）：占位播放头 + 时间。 */
  RF.r7PlayerBar = function r7PlayerBar(duration) {
    return h('div', { className: `${RF.CLS}-playerbar` },
      h('span', { className: `${RF.CLS}-playerbar__dot` }),
      h('span', null, `0:00 / ${duration}`));
  };

  /** 代码块（RF7 CodeBox）。 */
  RF.r7CodeBox = function r7CodeBox(lines) {
    const list = Array.isArray(lines) ? lines : [];
    return h('div', { className: `${RF.CLS}-code` },
      list.map((line, index) => h('div', { key: `${index}` }, line)));
  };

  /** 单选圈（RF7 Radio）：选中 = accent 描边 + 中心点。 */
  RF.r7Radio = function r7Radio(selected) {
    return h('span', {
      className: `${RF.CLS}-radio${selected === true ? ` ${RF.CLS}-radio--on` : ''}`,
      'aria-hidden': true,
    }, selected === true ? h('span', { className: `${RF.CLS}-radio__dot` }) : null);
  };

  /** 勾选框（RF7 Checkbox）：选中 = accent 底 + 白色对勾。 */
  RF.r7Checkbox = function r7Checkbox(checked) {
    return h('span', {
      className: `${RF.CLS}-check${checked === true ? ` ${RF.CLS}-check--on` : ''}`,
      'aria-hidden': true,
    }, checked === true ? h('span', { className: `${RF.CLS}-check__tick` }) : null);
  };

  /**
   * 进度条（RF7 ProgressBar）：轨道 surface-3 + 填充 accent。
   * @param {number} ratio - 0..1。
   * @param {string} [tone] - ok / warn。
   * @returns {object} React 元素。
   */
  RF.r7Track = function r7Track(ratio, tone) {
    const value = Math.max(0, Math.min(1, Number(ratio) || 0));
    const key = ['ok', 'warn'].includes(tone) ? tone : '';
    return h('div', { className: `${RF.CLS}-track` },
      h('div', {
        className: `${RF.CLS}-track__fill${key === '' ? '' : ` ${RF.CLS}-track__fill--${key}`}`,
        style: { width: `${Math.round(value * 100)}%` },
      }));
  };

  /**
   * 枢纽条的一格（RF7 HubStrip 的 stat）。
   * @param {string} caption - 小标题。
   * @param {string} value - 主值。
   * @param {string} sub - 副值。
   * @returns {object} React 元素。
   */
  RF.r7Stat = function r7Stat(caption, value, sub) {
    return h('div', { className: `${RF.CLS}-hubstat` },
      h('div', { className: `${RF.CLS}-hubstat__caption` }, caption),
      h('div', { className: `${RF.CLS}-hubstat__value` }, value),
      h('div', { className: `${RF.CLS}-hubstat__sub` }, sub));
  };

  /**
   * 镜头摘要卡（RF7 ShotChip）：镜号 + 景别 + 状态点。
   * @param {string} id - 镜号。
   * @param {string} size - 景别。
   * @param {string} state - 状态文字。
   * @param {string} tone - 状态点颜色令牌：ok / accent / line。
   * @returns {object} React 元素。
   */
  RF.r7ShotChip = function r7ShotChip(id, size, state, tone) {
    const color = tone === 'ok'
      ? 'var(--rf-ok)'
      : (tone === 'accent' ? 'var(--rf-accent)' : 'var(--rf-line)');
    return h('div', { className: `${RF.CLS}-card ${RF.CLS}-shotchip` },
      h('div', { className: `${RF.CLS}-shotchip__id` }, id),
      h('div', { className: `${RF.CLS}-shotchip__size` }, size),
      h('div', { className: `${RF.CLS}-shotstate` },
        h('span', { className: `${RF.CLS}-shotstate__dot`, style: { background: color } }),
        h('span', { className: `${RF.CLS}-shotstate__text` }, state)));
  };

  /**
   * 对话同步行（RF7 `RF/ChatSyncLine`）：一行 10px 次级文案。
   *
   * 语义：「同一状态两边可读」—— 对话面写入的东西，右栏用一行字说明它到了。
   *
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.r7ChatSync = function r7ChatSync(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const text = String(project.input?.text ?? '').trim();
    const position = String(project.runPosition ?? '');
    let message = t('rf7.chatSync.empty');
    if (chapters.length > 0) {
      message = t('rf7.chatSync.imported', {
        count: chapters.length,
        pending: position === '' ? t('rf7.chatSync.needRun') : t('rf7.chatSync.ready'),
      });
    } else if (text !== '') {
      message = t('rf7.chatSync.captured');
    }
    return h('div', { className: `${RF.CLS}-chat-sync` }, message);
  };

  /**
   * 只读输入占位（RF7 的 Set-input / Intake-name 那种「只定版式」的框）。
   * @param {string} text - 框里的文字。
   * @param {string} [kind] - placeholder（占位）/ masked（打码）/ value（正常）。
   * @returns {object} React 元素。
   */
  RF.r7FieldBox = function r7FieldBox(text, kind) {
    const variant = kind === 'masked' ? 'masked' : (kind === 'value' ? 'value' : 'placeholder');
    return h('div', {
      className: `${RF.CLS}-fieldbox ${variant === 'value' ? '' : `${RF.CLS}-fieldbox--${variant}`}`.trim(),
    }, text);
  };
})(RF);
