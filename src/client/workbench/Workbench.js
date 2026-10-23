/* ─────────────────────────────────────────────────────────────────────────────
 * 右栏工作台主壳：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 *
 * 骨架铁律（R7）：右栏 Tab 容器是 `overflow:hidden` —— 外层 `section` 必须
 * `height:100%` + `boxSizing:border-box` + `display:flex` + `flexDirection:column`，
 * 内层内容层必须 `flex:1; min-height:0; overflowY:auto`，否则内容超高时底栏被裁掉且滚不到。
 *
 * 断点按**实测宽度**判（`ResizeObserver` 量容器宽度），不按窗口宽。
 * 组件里的 `useState` 只放交互态，业务数据只从宿主投影读（R1）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 7 个页签 → 渲染函数。 */
  RF.TAB_RENDERERS = {
    chapters: RF.tabChapters,
    shots: RF.tabShots,
    assets: RF.tabAssets,
    context: RF.tabContext,
    skills: RF.tabSkills,
    output: RF.tabOutput,
    log: RF.tabLog,
  };

  /**
   * 对话输入截获块（§10.5）：把宿主钩子截到的用户原文摆在工作台最上面。
   *
   * 没有截到时也显示一行提示 —— 这个块是「输入会自己进来」的唯一可见证据，
   * 平时空着等于功能不存在。
   *
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.renderCapturedInput = function renderCapturedInput(props) {
    const text = String(props.project?.input?.text ?? '').trim();
    const empty = text === '';
    return h('div', { className: `${RF.CLS}-captured` },
      h('div', { className: `${RF.CLS}-captured__label` }, props.t('captured.label')),
      h('div', {
        className: `${RF.CLS}-captured__text${empty ? ` ${RF.CLS}-captured__text--empty` : ''}`,
      }, empty ? props.t('captured.empty') : text));
  };

  /**
   * 工作台主壳。
   * @param {object} props - 插槽注入的 props（`useTabInfo` / `useSessions` / `t` 等）。
   * @returns {object} React 元素。
   */
  RF.Workbench = function Workbench(props) {
    const React = RF.React;
    const t = typeof props.t === 'function' ? props.t : (key, values) => RF.interpolate(key, values ?? {});
    const project = RF.useProjection(React);

    const [activeTab, setActiveTab] = React.useState('chapters');
    const [selectedShotId, setSelectedShotId] = React.useState(null);
    const [assetCategory, setAssetCategory] = React.useState('all');
    const [skillSource, setSkillSource] = React.useState('all');
    const [selectedSkillName, setSelectedSkillName] = React.useState(null);
    const [speed, setSpeed] = React.useState(1);
    const [subtitles, setSubtitles] = React.useState(true);
    const [voice, setVoice] = React.useState(true);
    const [bgm, setBgm] = React.useState(false);
    const [rollbackMode, setRollbackMode] = React.useState('single');
    const [width, setWidth] = React.useState(0);

    const shellRef = React.useRef(null);
    React.useEffect(() => {
      const element = shellRef.current;
      if (element === null || element === undefined) return undefined;
      const measure = () => setWidth(element.getBoundingClientRect().width);
      measure();
      if (typeof ResizeObserver === 'undefined') {
        globalThis.addEventListener?.('resize', measure);
        return () => globalThis.removeEventListener?.('resize', measure);
      }
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    const twoColumns = RF.columnsFor(width) === 2;
    const stage = RF.stageStepsState(project);
    const render = RF.TAB_RENDERERS[activeTab] ?? RF.tabChapters;

    // 快捷键带 `params.focus` 打开某个页签（`ctx.sidebarRight.openTab(kind, { params })`）。
    const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined;
    const focus = tabInfo?.tab?.navigation?.params?.focus;
    React.useEffect(() => {
      if (typeof focus === 'string' && RF.WORKBENCH_TABS.some(tab => tab.id === focus)) setActiveTab(focus);
    }, [focus]);
    React.useEffect(() => {
      if (typeof props.sessionId === 'string') RF.currentSessionId = props.sessionId;
    }, [props.sessionId]);

    const state = {
      selectedShotId,
      selectShot: setSelectedShotId,
      setDuration: value => RF.actions?.callTool?.(RF.TOOL_IDS.updateShot, { duration: value }),
      assetCategory,
      setAssetCategory,
      skillSource,
      setSkillSource,
      selectedSkillName,
      selectSkill: setSelectedSkillName,
      speed,
      setSpeed,
      subtitles,
      voice,
      bgm,
      toggle: key => {
        if (key === 'subtitles') setSubtitles(value => !value);
        else if (key === 'voice') setVoice(value => !value);
        else if (key === 'bgm') setBgm(value => !value);
      },
      rollbackMode,
      setRollbackMode,
      rollback: (entry, force) => RF.actions?.callTool?.(RF.TOOL_IDS.rollback, {
        id: entry.id,
        mode: rollbackMode,
        ...(force === true ? { force: true } : {}),
      }),
      twoColumns,
    };

    // 底栏第二行：当前跑到第几章的第几镜（成本行已按 owner 裁决移进滚动区底部）。
    const current = RF.currentPosition(project);
    const positionLabel = current === null
      ? t('footer.idle')
      : t('footer.position', current);

    // ── 按屏外壳（Header 三件套 + Footer 三件套）──
    // owner 裁决「按屏变化」（Q1 底栏 / Q3 胶囊）：设计稿 17 块板的胶囊与底栏文案
    // 每块都不同，以前实现是全局固定的一套。每屏长什么样在 `workbench/chrome.js`。
    const chrome = RF.tabChrome(activeTab);
    const chromeAction = chrome.footerAction ?? {};
    const chromeTitle = chrome.titleKey === undefined ? '' : t(chrome.titleKey);
    // 外壳契约：subtitle / capsule / footerLabel / footerValue **一律是函数**
    // （静态文案在 chrome.js 里就包好了，渲染层不再判类型）。
    const chromeSubtitle = chrome.subtitle(project, t);
    const chromeCapsule = chrome.capsule(project, t);
    const chromeLabel = chrome.footerLabel(project, t);
    const chromeValue = chrome.footerValue(project, t);

    // 「导出日志」：把变更日志导出成 JSON 文件（浏览器直接下载，不经过宿主）。
    const exportChangelog = () => {
      const entries = Array.isArray(project.changelog?.entries) ? project.changelog.entries : [];
      const blob = new Blob([JSON.stringify({ entries }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reelforge-changelog.json';
      link.click();
      URL.revokeObjectURL(url);
    };

    // 底栏主按钮：切页签 / 调工具 / 导出文件 / 暂不可用。
    const runChromeAction = () => {
      const action = chromeAction;
      if (action.kind === 'tab') {
        setActiveTab(action.tab);
        return;
      }
      if (action.kind === 'tool') {
        const params = typeof action.params === 'function' ? action.params(project) : action.params;
        RF.actions?.callTool?.(action.tool, params ?? {});
        return;
      }
      if (action.kind === 'export') exportChangelog();
      if (action.kind === 'scroll') {
        // 「交付物」按钮：滚到本页的交付物清单（设计稿 10 号板的主按钮）。
        const target = document.getElementById(action.target);
        if (target !== null && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start' });
        }
      }
    };

    return h('section', { className: `${RF.CLS}-root`, ref: shellRef },
      h('header', { className: `${RF.CLS}-header` },
        h('div', { className: `${RF.CLS}-header__logo`, 'aria-hidden': true }),
        h('div', { className: `${RF.CLS}-header__text` },
          h('div', { className: `${RF.CLS}-header__title` }, chromeTitle),
          h('div', { className: `${RF.CLS}-header__subtitle` }, chromeSubtitle)),
        h('span', { className: `${RF.CLS}-header__status` }, chromeCapsule)),
      h('nav', { className: `${RF.CLS}-stagebar`, 'aria-label': t('title') },
        RF.STAGE_STEPS.map((step, index) => {
          const tone = index === stage.current ? 'current' : stage.passed.indexOf(index) >= 0 ? 'passed' : 'upcoming';
          return h('span', { key: step, className: `${RF.CLS}-stagebar__step ${RF.CLS}-stagebar__step--${tone}` },
            h('span', { className: `${RF.CLS}-stagebar__dot ${RF.CLS}-stagebar__dot--${tone}` }),
            h('span', null, t(`stage.${step}`)));
        }),
        h('span', { className: `${RF.CLS}-stagebar__count` }, t('stage.count', { current: stage.current + 1 }))),
      h('div', { className: `${RF.CLS}-tabs`, role: 'tablist' },
        RF.WORKBENCH_TABS.map(tab => h('button', {
          key: tab.id,
          type: 'button',
          role: 'tab',
          'aria-selected': tab.id === activeTab ? 'true' : 'false',
          className: `${RF.CLS}-tabs__item${tab.id === activeTab ? ` ${RF.CLS}-tabs__item--active` : ''}`,
          onClick: () => setActiveTab(tab.id),
        }, t(`tab.${tab.labelKey}`)))),
      h('div', { className: `${RF.CLS}-scroll` },
        RF.renderCapturedInput({ t, project }),
        render({ t, project, state, width }),
        // 成本与进度**移进滚动区底部**（owner 裁决 Q2：设计稿 01 号板把它放在滚动区内，
        // y=816；底栏只留「本屏标签 + 本屏主文案 + 本屏主按钮」）。
        activeTab === 'chapters'
          ? h('div', { className: `${RF.CLS}-note` }, t('chrome.stat.row', {
            position: positionLabel,
            spent: RF.formatMoney(project.cost?.spent ?? 0),
            cap: RF.formatMoney(project.cost?.cap ?? 0),
          }))
          : null,
        // 底栏主按钮暂不可用时，**说清缺什么、给什么替代**（不静默做成死按钮）。
        chromeAction.kind === 'none' && chrome.disabledHintKey !== undefined
          ? h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t(chrome.disabledHintKey))
          : null),
      h('footer', { className: `${RF.CLS}-footer` },
        h('div', { className: `${RF.CLS}-footer__text` },
          h('div', { className: `${RF.CLS}-footer__label` }, chromeLabel),
          h('div', { className: `${RF.CLS}-footer__value` }, chromeValue)),
        h(RF.ui.Button, {
          label: t(chromeAction.key),
          variant: 'primary',
          disabled: chromeAction.kind === 'none',
          title: chromeAction.kind === 'none' && chrome.disabledHintKey !== undefined
            ? t(chrome.disabledHintKey)
            : undefined,
          onClick: () => runChromeAction(),
        })));
  };
})(RF);
