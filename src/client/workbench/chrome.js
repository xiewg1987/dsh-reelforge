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
   * 每屏的外壳描述。
   *
   * @typedef {object} TabChrome
   * @property {string} titleKey Header 标题词条。
   * @property {(project: object, t: function) => string} subtitle Header 副标题。
   * @property {(project: object, t: function) => string} capsule Header 右侧胶囊。
   * @property {(project: object, t: function) => string} footerLabel Footer 第一行标签。
   * @property {(project: object, t: function) => string} footerValue Footer 第二行。
   * @property {{ key: string, kind: string, tab?: string, tool?: string, params?: function }} footerAction Footer 按钮。
   * @property {string} [disabledHintKey] 按钮不可用时的说明词条（说清缺什么、给什么替代）。
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
      footerAction: { key: 'action.viewOutput', kind: 'tab', tab: 'output' },
    },

    /**
     * 09 分镜表：胶囊是「章 N / 总数」，底栏指向下一步（跑 video 出片）。
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
        const chapter = currentChapter(project);
        return t('chrome.shots.capsule', { current: chapter?.id ?? 1, total: chapters.length });
      },
      footerLabel: staticText('chrome.shots.footerLabel'),
      footerValue: staticText('chrome.shots.footerValue'),
      footerAction: {
        key: 'chrome.shots.action',
        kind: 'tool',
        tool: RF.TOOL_IDS.runStage,
        params: (project) => {
          const chapter = currentChapter(project);
          return { stage: 'video', ...(chapter === null ? {} : { seq: Number(chapter.id) || 1 }) };
        },
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
      footerAction: { key: 'chrome.assets.action', kind: 'tab', tab: 'shots' },
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
      footerAction: { key: 'chrome.context.action', kind: 'tab', tab: 'assets' },
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
      footerAction: { key: 'chrome.skills.action', kind: 'none' },
      disabledHintKey: 'chrome.skills.disabledHint',
    },

    /**
     * 10 成片：胶囊是渲染位置，底栏第一行是本集用时。
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
      capsule: (project, t) => t('chrome.output.capsule', { position: positionLabel(project, t) }),
      footerLabel: staticText('chrome.output.footerLabel'),
      footerValue: (project, t) => {
        const cost = RF.formatMoney(project?.cost?.spent ?? 0);
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        const status = deliverables.length === 0 ? t('chrome.output.statusPending') : t('chrome.output.statusDone');
        return t('chrome.output.footerValue', { cost, status });
      },
      footerAction: { key: 'chrome.output.action', kind: 'scroll', target: 'rf-deliverables' },
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
      footerAction: { key: 'chrome.log.action', kind: 'export' },
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
