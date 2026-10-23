/* ─────────────────────────────────────────────────────────────────────────────
 * 右栏工作台主壳：Header / StageBar / Scroll（**唯一滚动容器**）/ Footer。
 *
 * 骨架铁律（R7）：右栏 Tab 容器是 `overflow:hidden` —— 外层 `section` 必须
 * `height:100%` + `boxSizing:border-box` + `display:flex` + `flexDirection:column`，
 * 内层内容层必须 `flex:1; min-height:0; overflowY:auto`，否则内容超高时底栏被裁掉且滚不到。
 *
 * 断点按**实测宽度**判（`ResizeObserver` 量容器宽度），不按窗口宽。
 * 组件里的 `useState` 只放交互态，业务数据只从宿主投影读（R1）。
 *
 * ── 两层导航（2026-10-24）────────────────────────────────────────────
 *
 * - **项目视图**（默认）：7 个页签（设计稿 17 号板明写「右栏工作台 7 个页签」）。
 * - **流程屏**：设计稿 02 / 03 / 04 / 05 / 06 / 16 —— 它们的骨架里**没有页签条**
 *   （只有 Header / StageBar / Scroll / Footer），按用户操作流程串成一条链。
 *
 * 进入流程屏的入口：**StageBar 的 6 个步点**（点哪一步到那一屏）+ 流程屏自己的
 * 「继续」链（底栏按钮）。退出：StageBar 的后 3 步 + 面板头的返回按钮。
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

  /** 6 块流程屏 → 渲染函数（设计稿 02 / 03 / 04 / 05 / 06 / 16）。 */
  RF.FLOW_RENDERERS = {
    intake: RF.flowIntake,
    runmode: RF.flowRunMode,
    device: RF.flowDevice,
    plan: RF.flowPlan,
    stages: RF.flowStages,
    degraded: RF.flowDegraded,
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
    const [mode, setMode] = React.useState('tabs');
    const [flowScreen, setFlowScreen] = React.useState('intake');
    const [selectedShotId, setSelectedShotId] = React.useState(null);
    const [assetCategory, setAssetCategory] = React.useState('all');
    const [skillSource, setSkillSource] = React.useState('all');
    const [selectedSkillName, setSelectedSkillName] = React.useState(null);
    const [speed, setSpeed] = React.useState(1);
    const [subtitles, setSubtitles] = React.useState(true);
    const [voice, setVoice] = React.useState(true);
    const [bgm, setBgm] = React.useState(false);
    const [rollbackMode, setRollbackMode] = React.useState('single');
    const [novelText, setNovelText] = React.useState('');
    const [pendingPosition, setPendingPosition] = React.useState('');
    const [planHint, setPlanHint] = React.useState('');
    const [probe, setProbe] = React.useState(null);
    const [probeLoading, setProbeLoading] = React.useState(false);
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
    const inFlow = mode === 'flow';
    const activeScreen = inFlow ? flowScreen : activeTab;
    const render = inFlow
      ? (RF.FLOW_RENDERERS[flowScreen] ?? RF.flowIntake)
      : (RF.TAB_RENDERERS[activeTab] ?? RF.tabChapters);

    // 流程屏里，StageBar 高亮的是**这一屏所属的那一步**（设计稿 §2.1 全表）。
    const flowStepIndex = RF.STAGE_STEPS.indexOf(RF.FLOW_SCREEN_STEPS[flowScreen] ?? '');
    const currentIndex = inFlow ? (flowStepIndex >= 0 ? flowStepIndex : 0) : stage.current;
    const passedIndex = inFlow
      ? RF.STAGE_STEPS.map((_, index) => index).filter(index => index < currentIndex)
      : stage.passed;

    // ── 探测数据（设备检查 / 降级矩阵两屏用）──
    // ⚠️ 这里**不用** `useCallback`：客户端测试用的最小 hook 运行时没有它。
    // `loadProbe` 只依赖模块级函数与两个稳定的 setter，所以依赖数组窄一点也安全。
    const loadProbe = (refresh) => {
      if (typeof fetch !== 'function') {
        setProbe({ view: null, error: '当前环境没有 fetch，读不到探测结果' });
        return;
      }
      setProbeLoading(true);
      fetch(RF.probeUrl({ refresh: refresh === true }))
        .then(response => response.json())
        .then(view => {
          setProbe({ view, error: null });
          setProbeLoading(false);
        })
        .catch(error => {
          setProbe({ view: null, error: error?.message ?? String(error) });
          setProbeLoading(false);
        });
    };

    React.useEffect(() => {
      if (activeScreen === 'device' || activeScreen === 'degraded') loadProbe(false);
    }, [activeScreen]);

    // 快捷键带 `params.focus` 打开某个页签（`ctx.sidebarRight.openTab(kind, { params })`）。
    const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined;
    const focus = tabInfo?.tab?.navigation?.params?.focus;
    React.useEffect(() => {
      if (typeof focus === 'string' && RF.WORKBENCH_TABS.some(tab => tab.id === focus)) {
        setMode('tabs');
        setActiveTab(focus);
      }
    }, [focus]);
    React.useEffect(() => {
      if (typeof props.sessionId === 'string') RF.currentSessionId = props.sessionId;
    }, [props.sessionId]);

    const goFlow = (screen) => {
      if (typeof screen !== 'string' || RF.FLOW_RENDERERS[screen] === undefined) return;
      setMode('flow');
      setFlowScreen(screen);
    };
    const goTab = (tab) => {
      if (typeof tab !== 'string' || RF.TAB_RENDERERS[tab] === undefined) return;
      setMode('tabs');
      setActiveTab(tab);
    };

    const state = {
      selectedShotId,
      selectShot: setSelectedShotId,
      // ⚠️ `reelforge.update_shot` 的必填参数是 `seq` + `idx`
      // （`src/host/tools.js`：`required: ['seq', 'idx']`）——
      // 只发 `{ duration }` 会被宿主拒收，改时长永远不生效。
      // 所以这里要拿住「选中的是哪一章的第几镜」，由调用方把这一镜传进来。
      setDuration: (shot, value) => RF.actions?.callTool?.(RF.TOOL_IDS.updateShot, {
        seq: shot?.seq,
        idx: shot?.idx,
        duration: value,
      }),
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
      // ⚠️ 参数名必须是 `entryId`：`reelforge.rollback` 的 schema 是
      // `entryId`（单条模式）+ `additionalProperties: false` —— 发成 `id`
      // 会被宿主当成未知键**整条拒收**，回滚永远不生效。
      rollback: (entry, force) => RF.actions?.callTool?.(RF.TOOL_IDS.rollback, {
        entryId: entry.id,
        mode: rollbackMode,
        ...(force === true ? { force: true } : {}),
      }),
      twoColumns,
      // ── 流程屏相关 ──
      goFlow,
      goTab,
      novelText,
      setNovelText,
      pendingPosition,
      planHint,
      probe: probe === null ? null : { ...probe, loading: probeLoading },
      reloadProbe: () => loadProbe(true),
      /**
       * 导入小说：走 `reelforge.import_novel`（`novel` 是必填）。
       */
      importNovel: () => {
        const text = String(novelText).trim();
        if (text === '') return;
        RF.actions?.callTool?.(RF.TOOL_IDS.importNovel, { novel: text });
      },
      /**
       * 选运行位置。
       *
       * ⚠️ `reelforge.update_plan` 的 `kind` 与 `position` **都是必填** ——
       * 只发位置会被宿主整条拒收。所以：
       *   已经选过 kind → 直接改位置；
       *   还没选 kind   → 先记住位置（客户端交互态），等「执行路径」选完 kind 一起写入。
       */
      choosePosition: (position) => {
        const kind = project.plan?.kind;
        if (typeof kind === 'string' && kind !== '') {
          RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
          return;
        }
        setPendingPosition(position);
        setPlanHint('');
      },
      /**
       * 选生成 kind（写进 `reelforge.update_plan`）。
       */
      chooseKind: (kind) => {
        const position = pendingPosition !== '' ? pendingPosition : String(project.plan?.position ?? '');
        if (position === '') {
          setPlanHint(t('flow.plan.needPosition'));
          return;
        }
        setPlanHint('');
        RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
      },
      /**
       * 跑一个阶段（`reelforge.run_stage`，触发类 ⇒ 宿主会弹授权）。
       */
      runStage: (stage) => {
        RF.actions?.callTool?.(RF.TOOL_IDS.runStage, { stage });
      },
    };

    // 底栏第二行：当前跑到第几章的第几镜（成本行已按 owner 裁决移进滚动区底部）。
    const current = RF.currentPosition(project);
    const positionLabel = current === null
      ? t('footer.idle')
      : t('footer.position', current);

    // ── 按屏外壳（Header 三件套 + Footer 三件套）──
    // owner 裁决「按屏变化」（Q1 底栏 / Q3 胶囊）：设计稿 17 块板的胶囊与底栏文案
    // 每块都不同，以前实现是全局固定的一套。每屏长什么样在 `workbench/chrome.js`。
    const chrome = RF.tabChrome(activeScreen);
    // 底栏动作**由屏上的数据决定**：没章时「生成第 1 章」不能是可点的按钮，
    // 没有交付物时「交付物」也不能点了没反应 —— 都要禁用 + 说清缺什么。
    const chromeAction = typeof chrome.footerAction === 'function'
      ? chrome.footerAction(project)
      : (chrome.footerAction ?? {});
    const chromeTitle = chrome.titleKey === undefined ? '' : t(chrome.titleKey);
    // 外壳契约：subtitle / capsule / footerLabel / footerValue **一律是函数**
    // （静态文案在 chrome.js 里就包好了，渲染层不再判类型）。
    // 第三个参数 `ctx` 带的是**屏外数据**（目前只有设备检查 / 降级矩阵的探测结果）。
    const chromeContext = { probe };
    const chromeSubtitle = chrome.subtitle(project, t, chromeContext);
    const chromeCapsule = chrome.capsule(project, t, chromeContext);
    const chromeLabel = chrome.footerLabel(project, t);
    const chromeValue = chrome.footerValue(project, t);
    const chromeDisabled = chromeAction.disabled === true || chromeAction.kind === 'none';
    const chromeHintKey = chromeAction.hintKey ?? chrome.disabledHintKey;

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

    // 底栏主按钮：切页签 / 调工具 / 导出文件 / 切流程屏 / 暂不可用。
    const runChromeAction = () => {
      const action = chromeAction;
      if (action.kind === 'tab') {
        goTab(action.tab);
        return;
      }
      if (action.kind === 'flow') {
        goFlow(action.screen);
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

    // StageBar 点哪一步 → 到那一屏（设计稿把 StageBar 定义成进度指示，这里加成可点）。
    const goStageStep = (step) => {
      const target = RF.STAGE_STEP_TARGETS[step];
      if (target === undefined) return;
      if (target.kind === 'flow') goFlow(target.screen);
      else goTab(target.tab);
    };

    return h('section', { className: `${RF.CLS}-root`, ref: shellRef },
      h('header', { className: `${RF.CLS}-header` },
        inFlow
          ? h('button', {
            type: 'button',
            className: `${RF.CLS}-header__logo ${RF.CLS}-header__logo--button`,
            title: t('flow.backToWorkbench'),
            'aria-label': t('flow.backToWorkbench'),
            onClick: () => goTab('chapters'),
          })
          : h('div', { className: `${RF.CLS}-header__logo`, 'aria-hidden': true }),
        h('div', { className: `${RF.CLS}-header__text` },
          h('div', { className: `${RF.CLS}-header__title` }, chromeTitle),
          h('div', { className: `${RF.CLS}-header__subtitle` }, chromeSubtitle)),
        h('span', { className: `${RF.CLS}-header__status` }, chromeCapsule)),
      h('nav', { className: `${RF.CLS}-stagebar`, 'aria-label': t('title') },
        RF.STAGE_STEPS.map((step, index) => {
          const tone = index === currentIndex ? 'current' : passedIndex.indexOf(index) >= 0 ? 'passed' : 'upcoming';
          return h('button', {
            key: step,
            type: 'button',
            className: `${RF.CLS}-stagebar__step ${RF.CLS}-stagebar__step--${tone}`,
            title: t(`stage.go.${step}`),
            onClick: () => goStageStep(step),
          },
          h('span', { className: `${RF.CLS}-stagebar__dot ${RF.CLS}-stagebar__dot--${tone}` }),
          h('span', null, t(`stage.${step}`)));
        }),
        h('span', { className: `${RF.CLS}-stagebar__count` }, t('stage.count', { current: currentIndex + 1 }))),
      inFlow
        ? null
        : h('div', { className: `${RF.CLS}-tabs`, role: 'tablist' },
          RF.WORKBENCH_TABS.map(tab => h('button', {
            key: tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab.id === activeTab ? 'true' : 'false',
            className: `${RF.CLS}-tabs__item${tab.id === activeTab ? ` ${RF.CLS}-tabs__item--active` : ''}`,
            onClick: () => goTab(tab.id),
          }, t(`tab.${tab.labelKey}`)))),
      h('div', { className: `${RF.CLS}-scroll` },
        RF.renderCapturedInput({ t, project }),
        render({ t, project, state, width }),
        // 成本与进度**移进滚动区底部**（owner 裁决 Q2：设计稿 01 号板把它放在滚动区内，
        // y=816；底栏只留「本屏标签 + 本屏主文案 + 本屏主按钮」）。
        activeTab === 'chapters' && !inFlow
          ? h('div', { className: `${RF.CLS}-note` }, t('chrome.stat.row', {
            position: positionLabel,
            spent: RF.formatMoney(project.cost?.spent ?? 0),
            cap: RF.formatMoney(project.cost?.cap ?? 0),
          }))
          : null,
        // 底栏主按钮暂不可用时，**说清缺什么、给什么替代**（不静默做成死按钮）。
        chromeDisabled && chromeHintKey !== undefined
          ? h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t(chromeHintKey))
          : null),
      h('footer', { className: `${RF.CLS}-footer` },
        h('div', { className: `${RF.CLS}-footer__text` },
          h('div', { className: `${RF.CLS}-footer__label` }, chromeLabel),
          h('div', { className: `${RF.CLS}-footer__value` }, chromeValue)),
        h(RF.ui.Button, {
          label: t(chromeAction.key),
          variant: 'primary',
          disabled: chromeDisabled,
          title: chromeDisabled && chromeHintKey !== undefined ? t(chromeHintKey) : undefined,
          onClick: () => runChromeAction(),
        })));
  };
})(RF);
