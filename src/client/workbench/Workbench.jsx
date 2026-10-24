/* ─────────────────────────────────────────────────────────────────────────────
 * 右栏工作台主壳（RF7 规格）：Header / StageRail / TabBar / Scroll / Footer。
 *
 * ## 骨架铁律（R7）
 *
 * 右栏 Tab 容器是 `overflow:hidden` —— 外层 `section` 必须 `height:100%` +
 * `boxSizing:border-box` + `display:flex` + `flexDirection:column`，
 * 内层内容层必须 `flex:1; min-height:0; overflowY:auto`，
 * 否则内容超高时底栏被裁掉且滚不到。
 *
 * ## RF7 的两层导航（评审稿 §6.3 / §6.4 · 画板索引 §八）
 *
 * - **项目视图**（默认）：固定 7 个页签 —— 枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志；
 * - **流程屏**：无页签条（只有 Header / StageRail / Scroll / Footer）——
 *   RunGate · Settings · Intake · ProjectSettings · Stages · ShotDetail · Music · Skills；
 * - **规范板**：降级与失败 · 素材选择器。
 *
 * 进入流程屏的入口：**Stage 轨的 6 个步点**（点哪一步到那一屏）+ 各屏自己的主按钮。
 * 退出：面板头的返回按钮（回枢纽）。
 *
 * ## 冷启动（RF7 IA「首次进入」）
 *
 * 打开右栏且**没有章节** ⇒ 直接落 **RunGate（启动检查）**，
 * Stage 轨高亮「运行 2/6」（需求步视为已过：用户已从对话或空项目进来）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 7 个页签 → 渲染函数（RF7 §6.4）。 */
  RF.TAB_RENDERERS = {
    hub: RF.tabHub,
    chapters: RF.tabChapters,
    assets: RF.tabAssets,
    shots: RF.tabShots,
    context: RF.tabContext,
    output: RF.tabOutput,
    log: RF.tabLog,
  };

  /** 8 块流程屏 + 2 块规范板 → 渲染函数（RF7 画板索引 §八）。 */
  RF.FLOW_RENDERERS = {
    runGate: RF.flowRunGate,
    settings: RF.flowSettings,
    intake: RF.flowIntake,
    projectSettings: RF.flowProjectSettings,
    stages: RF.flowStages,
    shotDetail: RF.flowShotDetail,
    music: RF.flowMusic,
    skills: RF.flowSkills,
    degraded: RF.flowDegraded,
    picker: RF.flowPicker,
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

    const [activeTab, setActiveTab] = React.useState('hub');
    const [mode, setMode] = React.useState('tabs');
    const [flowScreen, setFlowScreen] = React.useState('runGate');
    const [selectedShotId, setSelectedShotId] = React.useState(null);
    const [assetCategory, setAssetCategory] = React.useState('all');
    const [pickerSelection, setPickerSelection] = React.useState([]);
    const [projectName, setProjectName] = React.useState('');
    const [projectStyleIndex, setProjectStyleIndex] = React.useState(0);
    const [novelText, setNovelText] = React.useState('');
    const [expandedContextKey, setExpandedContextKey] = React.useState('');
    const [pendingPosition, setPendingPosition] = React.useState('');
    const [probe, setProbe] = React.useState(null);
    const [capabilities, setCapabilities] = React.useState(null);
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
      ? (RF.FLOW_RENDERERS[flowScreen] ?? RF.flowRunGate)
      : (RF.TAB_RENDERERS[activeTab] ?? RF.tabHub);

    // 流程屏里，Stage 轨高亮的是**这一屏所属的那一步**（RF7 画板索引逐块给了）。
    const flowStepIndex = RF.STAGE_STEPS.indexOf(RF.FLOW_SCREEN_STEPS[flowScreen] ?? '');
    const currentIndex = inFlow ? (flowStepIndex >= 0 ? flowStepIndex : 0) : stage.current;
    const passedIndex = inFlow
      ? RF.STAGE_STEPS.map((_, index) => index).filter(index => index < currentIndex)
      : stage.passed;

    // ── 探测数据（启动检查 / 降级两屏用）──
    // ⚠️ 这里**不用** `useCallback`：客户端测试用的最小 hook 运行时没有它。
    //
    // ⚠️ **探测不自动跑**（IA「首次进入」：用户选 local/cloud + 完成/跳过探测）：
    // 探测范围是运行位置的函数（设计 §7.1）—— 没选位置就没有确定的范围。
    // 进右栏就发探测请求 = 替用户选了一个范围（宿主默认 local），
    // 界面还显示成「已经检过」⇒ 用户看到的不是他选的环境。
    // 所以：**只有用户点了「开始检测」才探**。
    const loadProbe = (refresh, position) => {
      if (typeof fetch !== 'function') {
        setProbe({ view: null, error: '当前环境没有 fetch，读不到探测结果' });
        return;
      }
      setProbeLoading(true);
      fetch(RF.probeUrl({
        refresh: refresh === true,
        position: typeof position === 'string' && position !== '' ? position : undefined,
      }))
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

    // 服务配置（只读路由）：给 RF7 的「服务配置」屏提供读数。
    const capabilitiesStartedRef = React.useRef(false);
    React.useEffect(() => {
      if (capabilitiesStartedRef.current) return;
      capabilitiesStartedRef.current = true;
      if (typeof fetch !== 'function') return;
      fetch(RF.capabilitiesUrl())
        .then(response => response.json())
        .then(value => setCapabilities(value ?? null))
        .catch(() => setCapabilities(null));
    }, []);

    // 冷启动：没有章节 ⇒ 直接落「启动检查」（RF7 IA「首次进入」）。
    const autoEntryRef = React.useRef(false);
    React.useEffect(() => {
      const chapters = Array.isArray(project.chapters) ? project.chapters : [];
      if (autoEntryRef.current || chapters.length > 0) return;
      autoEntryRef.current = true;
      setMode('flow');
      setFlowScreen('runGate');
      setPendingPosition(prev => (prev === '' ? 'local' : prev));
    }, [project.chapters]);

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
      assetCategory,
      setAssetCategory,
      pickerSelection,
      togglePicker: (id) => {
        setPickerSelection(prev => (prev.includes(id)
          ? prev.filter(item => item !== id)
          : [...prev, id]));
      },
      clearPicker: () => setPickerSelection([]),
      projectName,
      setProjectName,
      projectStyleIndex,
      setProjectStyleIndex,
      novelText,
      setNovelText,
      /** 上下文屏「查看」展开的键（空 = 都没展开）。 */
      expandedContextKey,
      toggleContextKey: (key) => {
        setExpandedContextKey(prev => (prev === key ? '' : key));
      },
      pendingPosition,
      twoColumns,
      // ── 流程屏相关 ──
      goFlow,
      goTab,
      probe: probe === null ? null : { ...probe, loading: probeLoading },
      /**
       * 当前生效的运行位置（已写进项目的优先，没写就用界面上的选择）。
       * @returns {string} `local` / `cloud` / `''`（还没选）。
       */
      probePosition: String(project.plan?.position || pendingPosition || ''),
      /**
       * 开始检测（走宿主缓存）。
       * ⚠️ 没有位置就不发请求 —— 没有范围就没有事实。
       */
      startProbe: () => {
        const position = String(project.plan?.position || pendingPosition || '');
        if (position === '') return;
        loadProbe(false, position);
      },
      /** 重跑检查（绕过宿主缓存强制重跑）。 */
      reloadProbe: () => {
        const position = String(project.plan?.position || pendingPosition || '');
        if (position === '') return;
        loadProbe(true, position);
      },
      capabilities,
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
       *   还没选 kind   → 先记住位置（客户端交互态），等执行路径选完 kind 一起写入。
       */
      choosePosition: (position) => {
        const kind = project.plan?.kind;
        // 已经探过、而这次结果属于**另一个位置**（本地 9 项 / 云端 3 项）⇒
        // 旧结果留着就是在骗人 ⇒ 立刻按新位置重探一次。
        // 没探过（probe === null）⇒ 不探，等用户点「开始检测」。
        const probedPosition = String(probe?.view?.position ?? '');
        const stale = probe !== null && probedPosition !== '' && probedPosition !== position;
        if (typeof kind === 'string' && kind !== '') {
          RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
          if (stale) loadProbe(false, position);
          return;
        }
        setPendingPosition(position);
        if (stale) loadProbe(false, position);
      },
      /**
       * 选生成 kind（写进 `reelforge.update_plan`）。
       */
      chooseKind: (kind) => {
        const position = pendingPosition !== '' ? pendingPosition : String(project.plan?.position ?? '');
        if (position === '') return;
        RF.actions?.callTool?.(RF.TOOL_IDS.updatePlan, { kind, position });
      },
      /**
       * 跑一个阶段（`reelforge.run_stage`，触发类 ⇒ 宿主会弹授权）。
       *
       * `seq` 限定章节（宿主 schema 的可选参数；不填 = 全部章节）。
       *
       * @param {string} stage - 阶段。
       * @param {number} [seq] - 限定章节。
       * @returns {void}
       */
      runStage: (stage, seq) => {
        const args = { stage };
        if (seq !== undefined && seq !== null && Number.isFinite(Number(seq))) args.seq = Number(seq);
        RF.actions?.callTool?.(RF.TOOL_IDS.runStage, args);
      },
      /**
       * 重新生成一镜（`reelforge.regenerate_shot`，触发类 ⇒ 宿主会弹授权）。
       *
       * ⚠️ 参数名是 `seq` + `idx`（不是 `id`）：宿主 schema `required: ['seq','idx']`，
       * 发成 `{ id }` 会被整条拒收。
       */
      regenerateShot: (shot) => {
        if (shot === null || shot === undefined) return;
        RF.actions?.callTool?.(RF.TOOL_IDS.regenerateShot, {
          seq: Number(shot.seq) || 1,
          idx: Number(shot.idx) || 1,
        });
      },
      /**
       * 回滚一条变更（`reelforge.rollback`）。
       *
       * ⚠️ **id 字段随模式变**：`single` 用 `entryId`、`batch` 用 `batchId`、
       * `timepoint` 用 `at`；而且 schema 是 `additionalProperties:false` ——
       * 发错字段名会被宿主当成未知键**整条拒收**（以前这里恒发 `entryId`，批模式必然失效）。
       *
       * @param {object} entry - 变更条目。
       * @param {string} mode - 回滚模式。
       * @param {boolean} [force] - 漂移时强制覆盖。
       */
      rollback: (entry, mode, force) => {
        const kind = mode === 'batch' ? 'batch' : (mode === 'timepoint' ? 'timepoint' : 'single');
        const params = { mode: kind };
        if (kind === 'batch') params.batchId = String(entry?.batchId ?? entry?.batch ?? '');
        else if (kind === 'timepoint') params.at = String(entry?.at ?? '');
        else params.entryId = String(entry?.id ?? '');
        if (force === true) params.force = true;
        RF.actions?.callTool?.(RF.TOOL_IDS.rollback, params);
      },
    };

    // ── 按屏外壳（Header 三件套 + Footer 三件套）──
    const chrome = RF.tabChrome(activeScreen);
    // 外壳上下文：**交互态**（不在投影里的那部分）也要给外壳，
    // 否则「正文还没写」这类判断只能看到空投影，底栏就会给出可点的死按钮。
    const chromeContext = {
      probe,
      capabilities,
      selectedShotId,
      pickerSelection,
      novelText,
      projectName,
    };
    const chromeAction = typeof chrome.footerAction === 'function'
      ? chrome.footerAction(project, t, chromeContext)
      : (chrome.footerAction ?? {});
    const chromeTitle = chrome.titleKey === undefined ? '' : t(chrome.titleKey);
    const chromeSubtitle = chrome.subtitle(project, t, chromeContext);
    const chromeCapsule = chrome.capsule(project, t, chromeContext);
    const chromeCapsuleTone = typeof chrome.capsuleTone === 'function'
      ? chrome.capsuleTone(project, t, chromeContext)
      : 'neutral';
    const chromeLabel = chrome.footerLabel(project, t);
    // ⚠️ **必须传 chromeContext**：RunGate 底栏要读探测结果（有几项没通过）、
    // Picker 底栏要读已选张数 —— 漏传的话这两个底栏永远停在初值
    //（RunGate 一直说「正在探测本机环境…」，Picker 一直说「已选 0 个」）。
    const chromeValue = chrome.footerValue(project, t, chromeContext);
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
        const raw = typeof action.params === 'function'
          ? action.params(project, t, chromeContext)
          : action.params;
        // ⚠️ `params` 可以是**一组**：素材选择器要把不同分类分别绑到不同字段，
        // 而宿主的 `bind_asset` 一次只吃一个字段 ⇒ 逐个发。
        const list = Array.isArray(raw) ? raw : [raw];
        for (const args of list) RF.actions?.callTool?.(action.tool, args ?? {});
        return;
      }
      if (action.kind === 'export') exportChangelog();
      if (action.kind === 'scroll') {
        const target = document.getElementById(action.target);
        if (target !== null && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start' });
        }
      }
    };

    // Stage 轨点哪一步 → 到那一屏（设计稿把 Stage 轨定义成进度指示，这里加成可点）。
    const goStageStep = (step) => {
      const target = RF.STAGE_STEP_TARGETS[step];
      if (target === undefined) return;
      if (target.kind === 'flow') goFlow(target.screen);
      else goTab(target.tab);
    };

    const capsuleTone = chromeCapsuleTone === 'accent'
      ? 'accent'
      : (chromeCapsuleTone === 'ok' ? 'ok' : (chromeCapsuleTone === 'warn' ? 'warn' : 'neutral'));

    return (
      <section className={RF.tw.root} ref={shellRef}>
        <header className={RF.tw.header}>
          {inFlow
            ? (
              <button
                type="button"
                className={RF.cn(RF.tw.headerLogo, RF.tw.headerLogoBtn)}
                title={t('flow.backToWorkbench')}
                aria-label={t('flow.backToWorkbench')}
                onClick={() => goTab('hub')}
              />
            )
            : (
              <div className={RF.tw.headerLogo} aria-hidden />
            )}
          <div className={RF.tw.headerText}>
            <div className={RF.tw.headerTitle}>{chromeTitle}</div>
            <div className={RF.tw.headerSubtitle}>{chromeSubtitle}</div>
          </div>
          <Badge variant="outline" className={RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(capsuleTone))}>{chromeCapsule}</Badge>
        </header>
        <nav className={RF.tw.stagebar} aria-label={t('title')}>
          {RF.STAGE_STEPS.map((step, index) => {
            const tone = index === currentIndex ? 'current' : passedIndex.indexOf(index) >= 0 ? 'passed' : 'upcoming';
            return (
              <button
                key={step}
                type="button"
                className={RF.cn(RF.tw.stageStep, RF.stageStepClass(tone))}
                title={t(`stage.go.${step}`)}
                onClick={() => goStageStep(step)}
              >
                <span className={RF.cn('stage-dot', RF.tw.stageDot)} />
                <span className="stage-label">{t(`stage.${step}`)}</span>
              </button>
            );
          })}
          <span className={RF.tw.stageCount}>{t('stage.count', { current: currentIndex + 1 })}</span>
        </nav>
        {inFlow
          ? null
          : (
            <div className={RF.tw.tabs} role="tablist">
              {RF.WORKBENCH_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTab ? 'true' : 'false'}
                  className={RF.cn(RF.tw.tabItem, tab.id === activeTab && RF.tw.tabItemActive)}
                  onClick={() => goTab(tab.id)}
                >
                  {t(`tab.${tab.labelKey}`)}
                </button>
              ))}
            </div>
          )}
        <div className={RF.tw.scroll}>
          {render({ t, project, state, width })}
          {chromeDisabled && chromeHintKey !== undefined
            ? (
              <div className={RF.tw.noteWarn}>{t(chromeHintKey)}</div>
            )
            : null}
        </div>
        <footer className={RF.tw.footer}>
          <div className={RF.tw.footerText}>
            <div className={RF.tw.footerLabel}>{chromeLabel}</div>
            <div className={RF.tw.footerValue}>{chromeValue}</div>
          </div>
          <Button type="button" variant="default" size="lg" className="h-10 font-semibold" disabled={chromeDisabled}
            title={chromeDisabled && chromeHintKey !== undefined ? t(chromeHintKey) : undefined}
            onClick={() => runChromeAction()} >{t(chromeAction.key)}</Button>
        </footer>
      </section>
    );
  };
})(RF);
