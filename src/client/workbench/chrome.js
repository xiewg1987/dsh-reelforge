/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台外壳的**按屏定义**：Header 三件套（标题 / 副标 / 胶囊）+ Footer 三件套
 * （标签 / 值 / 按钮）。
 *
 * 背景：设计稿 17 块板的 Header 胶囊与 Footer 文案**每块都不同** ——
 *   01 工作台    云端 · RunningHub   |  当前阶段 / 阶段三 tts · 角色音色样本 | 查看成片
 *   07 上下文    3 个分区             |  下一步 / 生成资产参考图             | 继续
 *   08 资产库    24 项资产            |  下一步 / 逐镜写分镜                 | 继续
 *   09 分镜表    章 1 / 3             |  下一步 / 跑 video 阶段出片          | 生成第 1 章
 *   10 成片      云端渲染             |  本集用时 / 成本 ¥4.60 · 云端渲染完成 | 交付物
 *   12 技能      3 个来源             |  技能来源 / 内置 3 · 已装 1 · 自建 1 | 安装技能包
 *   13 变更日志  42 条                |  本章 6 条 / 全项目 42 条            | 导出日志
 *
 * 实现以前是**全局固定**的一套（恒为「运行位置 · provider」+「成本 + 进度 + 查看成片」）。
 * owner 已裁决（Q1 底栏按屏变化 / Q3 胶囊显示当前屏摘要）：**按屏变化**。
 *
 * 本文件只回答「这一屏长什么样」；「怎么渲染」在 `Workbench.js`。
 * 计数、章节号、成本这类动态部分由这里的函数从投影视图现算 —— 不写死。
 * ───────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 当前章：优先取客户端算出来的「正在跑」那一章，否则第一章。
   *
   * @param {object} project - 投影视图。
   * @returns {object | null} 当前章（wire view 的 chapterViews 一项）；没有章时 null。
   */
  function currentChapter(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    if (chapters.length === 0) return null;
    const position = RF.currentPosition(project);
    const seq = position === null ? null : Number(position.chapter);
    const hit = chapters.find(chapter => Number(chapter.id) === seq);
    return hit ?? chapters[0];
  }

  /**
   * 全项目镜数（各章镜数之和）。
   *
   * @param {object} project - 投影视图。
   * @returns {number} 镜数。
   */
  function totalShots(project) {
    const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
    return chapters.reduce((sum, chapter) => sum + (Number(chapter.shotCount) || 0), 0);
  }

  /**
   * 运行位置标签。**没选位置时不能说「云端运行」** —— 那是撒谎。
   *
   * @param {object} project - 投影视图。
   * @param {function} t - 翻译函数。
   * @returns {string} 位置标签。
   */
  function positionLabel(project, t) {
    const position = String(project?.runPosition ?? '');
    if (position === '') return t('status.idle');
    if (position === 'local' || position === 'cloud') return t(`status.${position}`);
    return position;
  }

  /**
   * 章节时长（秒）。
   *
   * @param {object | null} chapter - 当前章。
   * @returns {number} 秒数。
   */
  function chapterDuration(chapter) {
    return chapter === null ? 0 : (Number(chapter.durationSec) || 0);
  }

  /**
   * 技能按来源分档计数。
   *
   * @param {object} project - 投影视图。
   * @returns {{ bundled: number, installed: number, generated: number, sources: number }} 三档计数 + 来源档数。
   */
  function skillCounts(project) {
    const skills = Array.isArray(project?.skills) ? project.skills : [];
    const count = source => skills.filter(skill => String(skill.source ?? 'bundled') === source).length;
    const bundled = count('bundled');
    const installed = count('installed');
    const generated = count('generated');
    // 「几个来源」= 有技能的来源档数（bundled / installed / generated），**不是技能个数**。
    // 设计稿 12 号板：胶囊「3 个来源」而底栏是「内置 3 · 已装 1 · 自建 1」（5 个技能、3 个来源）。
    const sources = [bundled, installed, generated].filter(value => value > 0).length;
    return { bundled, installed, generated, sources };
  }

  /**
   * 静态文案包装成函数。
   *
   * 契约统一：外壳的 `subtitle` / `footerLabel` / `footerValue` **一律是函数**。
   * 以前静态文案用 `xxxKey` 字符串、动态文案用 `xxx` 函数，调用方到处判类型 ——
   * 漏判一处就是 `chrome.subtitle is not a function`（真出过）。
   * 静态与动态的差别只该留在**这一层**，不该漏到渲染层。
   *
   * @param {string} key - 词条键。
   * @returns {(project: object, t: function) => string} 取词条的函数。
   */
  function staticText(key) {
    return (_project, t) => t(key);
  }

  /**
   * 变更日志条数。
   *
   * 用 `total`（宿主报的真实总数）而不是 `entries.length` ——
   * 投影里条目有上限截断时，真实总数才不会被截断数冒充。
   *
   * @param {object} project - 投影视图。
   * @returns {number} 条数。
   */
  function logCount(project) {
    const changelog = project?.changelog ?? {};
    const entries = Array.isArray(changelog.entries) ? changelog.entries.length : 0;
    const total = Number(changelog.total);
    return Number.isFinite(total) && total > 0 ? total : entries;
  }

  /**
   * 有没有进入生成阶段（阶段走到「生成」之后）。
   *
   * 用它区分「还没开始渲染」与「还在渲染」—— 两者都不该说成「渲染完成」。
   *
   * @param {object} project - 投影视图。
   * @returns {boolean} 是否已进入生成阶段。
   */
  function renderStarted(project) {
    const stage = String(project?.stage ?? '');
    return stage === 'generate' || stage === 'storyboard' || stage === 'deliver';
  }

  /**
   * 每屏的外壳描述。
   *
   * @typedef {object} TabChrome
   * @property {string} titleKey Header 标题词条。
   * @property {(project: object, t: function, ctx?: object) => string} subtitle Header 副标题。
   * @property {(project: object, t: function, ctx?: object) => string} capsule Header 右侧胶囊。
   * @property {(project: object, t: function) => string} footerLabel Footer 第一行标签。
   * @property {(project: object, t: function) => string} footerValue Footer 第二行。
   * @property {(project: object) => object} footerAction Footer 按钮。
   * @property {string} [disabledHintKey] 按钮不可用时的**兜底**说明词条（说清缺什么、给什么替代）。
   */

  /**
   * 底栏按钮的动作描述。
   *
   * @typedef {object} FooterAction
   * @property {string} key 按钮文案词条。
   * @property {string} kind `tab` / `tool` / `export` / `scroll` / `flow` / `none`。
   * @property {string} [tab] `kind === 'tab'` 时切到哪个页签。
   * @property {string} [screen] `kind === 'flow'` 时切到哪块流程屏。
   * @property {string} [tool] `kind === 'tool'` 时调哪个工具。
   * @property {object | function} [params] `kind === 'tool'` 时的参数（可以是函数）。
   * @property {boolean} [disabled] 不可用时置 true。
   * @property {string} [hintKey] 不可用时的说明词条（说清缺什么、给什么替代）。
   */

  RF.TAB_CHROME = {
    /**
     * 01 工作台（基准板）：胶囊是全局运行状态，底栏第一行是「当前阶段」。
     */
    chapters: {
      titleKey: 'title',
      subtitle: (project, t) => {
        // ⚠️ 只取 `name`，**不要**取 `subtitle` —— 后者可能是整段小说正文，
        // 塞进面板头会把头撑爆（设计稿 01 号板副标是「《夜航船》· 3 章 · 24 镜」）。
        const name = String(project?.name ?? '').trim() || t('project.unnamed');
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        return t('project.summary', {
          name: `《${name}》`,
          chapters: chapters.length,
          shots: totalShots(project),
        });
      },
      capsule: (project, t) => {
        const position = positionLabel(project, t);
        const provider = String(project?.provider ?? '');
        if (position === t('status.idle') || provider === '') return position;
        return `${position} · ${RF.labelOf('provider', provider, t)}`;
      },
      footerLabel: staticText('chrome.chapters.footerLabel'),
      footerValue: (project, t) => {
        const stageLabel = t(`stage.${RF.stageStep(project)}`);
        const position = RF.currentPosition(project);
        const positionText = position === null ? t('footer.idle') : t('footer.position', position);
        return `${stageLabel} · ${positionText}`;
      },
      footerAction: () => ({ key: 'action.viewOutput', kind: 'tab', tab: 'output' }),
    },

    /**
     * 09 分镜表：胶囊是「章 N / 总数」，底栏指向下一步（跑 video 出片）。
     *
     * ⚠️ 没有章时**不能说「章 1 / 0」**（自相矛盾），也不能让「生成第 1 章」
     * 变成点了没反应的按钮 —— 禁用 + 说清缺什么。
     */
    shots: {
      titleKey: 'chrome.shots.title',
      subtitle: (project, t) => {
        const chapter = currentChapter(project);
        if (chapter === null) return t('chrome.shots.subtitleEmpty');
        return t('chrome.shots.subtitle', {
          chapter: chapter.id,
          name: chapter.title,
          shots: chapter.shotCount,
        });
      },
      capsule: (project, t) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return t('chrome.shots.capsuleEmpty');
        const chapter = currentChapter(project);
        return t('chrome.shots.capsule', { current: chapter?.id ?? 1, total: chapters.length });
      },
      footerLabel: staticText('chrome.shots.footerLabel'),
      footerValue: staticText('chrome.shots.footerValue'),
      footerAction: (project) => {
        const chapter = currentChapter(project);
        if (chapter === null) {
          return { key: 'chrome.shots.action', kind: 'none', hintKey: 'chrome.shots.disabledHint' };
        }
        return {
          key: 'chrome.shots.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.runStage,
          params: { stage: 'video', seq: Number(chapter.id) || 1 },
        };
      },
    },

    /**
     * 08 资产库：胶囊是资产件数，底栏指向下一步（逐镜写分镜）。
     */
    assets: {
      titleKey: 'chrome.assets.title',
      subtitle: staticText('chrome.assets.subtitle'),
      capsule: (project, t) => t('chrome.assets.capsule', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      footerLabel: staticText('chrome.assets.footerLabel'),
      footerValue: staticText('chrome.assets.footerValue'),
      footerAction: () => ({ key: 'chrome.assets.action', kind: 'tab', tab: 'shots' }),
    },

    /**
     * 07 上下文：胶囊是分区数，底栏指向下一步（生成资产参考图）。
     */
    context: {
      titleKey: 'chrome.context.title',
      subtitle: staticText('chrome.context.subtitle'),
      capsule: (project, t) => t('chrome.context.capsule', { count: RF.CONTEXT_KEYS.length }),
      footerLabel: staticText('chrome.context.footerLabel'),
      footerValue: staticText('chrome.context.footerValue'),
      footerAction: () => ({ key: 'chrome.context.action', kind: 'tab', tab: 'assets' }),
    },

    /**
     * 12 技能：胶囊是来源数，底栏第一行是来源构成。
     */
    skills: {
      titleKey: 'chrome.skills.title',
      subtitle: staticText('chrome.skills.subtitle'),
      capsule: (project, t) => t('chrome.skills.capsule', { count: skillCounts(project).sources }),
      footerLabel: staticText('chrome.skills.footerLabel'),
      footerValue: (project, t) => {
        const counts = skillCounts(project);
        return t('chrome.skills.footerValue', counts);
      },
      footerAction: () => ({ key: 'chrome.skills.action', kind: 'none', hintKey: 'chrome.skills.disabledHint' }),
      disabledHintKey: 'chrome.skills.disabledHint',
    },

    /**
     * 10 成片：胶囊是渲染位置，底栏第一行是本集用时。
     *
     * ⚠️ 没开始渲染时不说「待开始渲染」（不通顺）；也没有交付物时，
     * 「交付物」按钮不能点了没反应 —— 禁用 + 说清缺什么。
     */
    output: {
      titleKey: 'chrome.output.title',
      subtitle: (project, t) => {
        const chapter = currentChapter(project);
        if (chapter === null) return t('chrome.output.subtitleEmpty');
        return t('chrome.output.subtitle', {
          chapter: chapter.id,
          name: chapter.title,
          shots: chapter.shotCount,
          duration: chapterDuration(chapter).toFixed(1),
        });
      },
      capsule: (project, t) => {
        const position = positionLabel(project, t);
        if (position === t('status.idle')) return t('chrome.output.capsuleIdle');
        return t('chrome.output.capsule', { position });
      },
      footerLabel: staticText('chrome.output.footerLabel'),
      footerValue: (project, t) => {
        const cost = RF.formatMoney(project?.cost?.spent ?? 0);
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length > 0) {
          return t('chrome.output.footerValue', { cost, status: t('chrome.output.statusDone') });
        }
        // 还没到出片阶段但已经开始生成 → 说「还在渲染」，别装成已经完成。
        if (renderStarted(project)) {
          return t('chrome.output.footerValue', { cost, status: t('chrome.output.statusPending') });
        }
        return t('chrome.output.statusIdle');
      },
      footerAction: (project) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'chrome.output.action', kind: 'none', hintKey: 'chrome.output.disabledHint' };
        }
        return { key: 'chrome.output.action', kind: 'scroll', target: 'rf-deliverables' };
      },
    },

    /**
     * 13 变更日志：胶囊是条目数，底栏是条目构成。
     */
    log: {
      titleKey: 'chrome.log.title',
      subtitle: staticText('chrome.log.subtitle'),
      capsule: (project, t) => t('chrome.log.capsule', { count: logCount(project) }),
      footerLabel: staticText('chrome.log.footerLabel'),
      footerValue: (project, t) => t('chrome.log.footerValue', { count: logCount(project) }),
      footerAction: () => ({ key: 'chrome.log.action', kind: 'export' }),
    },

    // ══════════════════════════════════════════════════════════════
    // 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）
    //
    // 这些屏**不在页签栏里**（设计稿 17 号板明写右栏是 7 个页签），
    // 它们的骨架只有 Header / StageBar / Scroll / Footer 四段。
    // ══════════════════════════════════════════════════════════════

    /**
     * 02 导入小说：胶囊是「新项目」，底栏指向「选运行位置」。
     */
    intake: {
      titleKey: 'flow.intake.title',
      subtitle: staticText('flow.intake.subtitle'),
      capsule: staticText('flow.intake.capsule'),
      footerLabel: staticText('flow.intake.footerLabel'),
      footerValue: staticText('flow.intake.footerValue'),
      footerAction: () => ({ key: 'flow.intake.action', kind: 'flow', screen: 'runmode' }),
    },

    /**
     * 03 运行位置：胶囊是「2 种位置」，底栏指向「出执行路径」。
     */
    runmode: {
      titleKey: 'flow.runmode.title',
      subtitle: staticText('flow.runmode.subtitle'),
      capsule: (project, t) => t('flow.runmode.capsule', { count: RF.RUN_POSITIONS.length }),
      footerLabel: staticText('flow.runmode.footerLabel'),
      footerValue: staticText('flow.runmode.footerValue'),
      footerAction: () => ({ key: 'flow.runmode.action', kind: 'flow', screen: 'plan' }),
    },

    /**
     * 04 设备检查：胶囊是**真实探测项数**（不是写死的 9），
     * 底栏指向「按探测结果出执行路径」。
     */
    device: {
      titleKey: 'flow.device.title',
      subtitle: staticText('flow.device.subtitle'),
      capsule: (project, t, context) => t('flow.device.capsule', {
        count: Array.isArray(context?.probe?.view?.report?.items)
          ? context.probe.view.report.items.length
          : 0,
      }),
      footerLabel: staticText('flow.device.footerLabel'),
      footerValue: staticText('flow.device.footerValue'),
      footerAction: () => ({ key: 'flow.device.action', kind: 'flow', screen: 'plan' }),
    },

    /**
     * 05 执行路径：胶囊是「5 种 kind」，底栏指向「选要跑哪些阶段」。
     */
    plan: {
      titleKey: 'flow.plan.title',
      subtitle: staticText('flow.plan.subtitle'),
      capsule: (project, t) => t('flow.plan.capsule', { count: RF.GENERATION_KINDS.length }),
      footerLabel: staticText('flow.plan.footerLabel'),
      footerValue: staticText('flow.plan.footerValue'),
      footerAction: () => ({ key: 'flow.plan.action', kind: 'flow', screen: 'stages' }),
    },

    /**
     * 06 执行阶段：胶囊是「4 个阶段」，底栏主按钮**真的开跑阶段一**。
     */
    stages: {
      titleKey: 'flow.stages.title',
      subtitle: staticText('flow.stages.subtitle'),
      capsule: (project, t) => t('flow.stages.capsule', { count: RF.STAGES.length }),
      footerLabel: staticText('flow.stages.footerLabel'),
      footerValue: staticText('flow.stages.footerValue'),
      footerAction: () => ({
        key: 'flow.stages.action',
        kind: 'tool',
        tool: RF.TOOL_IDS.runStage,
        params: { stage: 'llm' },
      }),
    },

    /**
     * 16 降级与失败：胶囊是**真实缺失项数**，底栏指向「回到工作台」。
     */
    degraded: {
      titleKey: 'flow.degrade.title',
      subtitle: staticText('flow.degrade.subtitle'),
      capsule: (project, t, context) => t('flow.degrade.capsule', {
        count: Array.isArray(context?.probe?.view?.degrade?.matrix)
          ? context.probe.view.degrade.matrix.length
          : 0,
      }),
      footerLabel: staticText('flow.degrade.footerLabel'),
      footerValue: staticText('flow.degrade.footerValue'),
      footerAction: () => ({ key: 'flow.degrade.action', kind: 'tab', tab: 'chapters' }),
    },
  };

  /**
   * 取某屏的外壳描述（找不到就回落到工作台基准板）。
   *
   * @param {string} tabId - 页签 id。
   * @returns {TabChrome} 外壳描述。
   */
  RF.tabChrome = function tabChrome(tabId) {
    return RF.TAB_CHROME[tabId] ?? RF.TAB_CHROME.chapters;
  };
})(RF);
