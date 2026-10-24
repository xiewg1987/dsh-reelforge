/* ─────────────────────────────────────────────────────────────────────────────
 * 工作台外壳的**按屏定义**（RF7 规格）：Header 三件套（标题 / 副标 / 胶囊）
 * + Footer 三件套（标签 / 主文案 / 一个主按钮）。
 *
 * ## 为什么要逐屏写
 *
 * RF7 的 18 块板，**每块的胶囊与底栏文案都不同**（画板索引逐块给了文案），
 * 以前实现是一套全局固定的（「运行位置 · provider」+「成本 + 进度 + 查看成片」）。
 * RF7 §6.2 把 Footer 定成硬约束：**本屏标签 / 本屏主文案 / 一个主按钮**，
 * 不可点时**禁用并写明缺什么**。
 *
 * ## 底栏按钮的接线纪律（这一批最要紧的一条）
 *
 * 底栏主按钮**不许是「点了没反应」的死按钮**。所以每一块板分三种：
 *
 * 1. **有对应工具** → 接工具（`kind: 'tool'`），参数名逐字对齐宿主 schema；
 * 2. **有对应屏** → 接导航（`kind: 'tab'` / `'flow'` / `'scroll'`）；
 * 3. **能力还没有** → `kind: 'none'` + **禁用说明**（说清缺什么、给什么替代）。
 *
 * 第 3 类在本批里占 6 块板（服务配置 / 项目设置 / 生成执行 / 上下文 / 素材库 / 技能），
 * 原因都是同一个：**RF7 画板假设插件能改配置、能暂停、能装技能**，
 * 而插件当前**没有写配置的工具、没有暂停的工具、没有装技能的工具**。
 * 这是**能力缺口**，不是界面 bug —— 界面按纪律禁用 + 说清，而不是假装能做。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 当前章：优先取客户端算出来的「正在跑」那一章，否则第一章。
   *
   * @param {object} project - 投影视图。
   * @returns {object | null} 当前章；没有章时 null。
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
   * @returns {{ bundled: number, installed: number, generated: number, total: number }} 三档计数 + 总数。
   */
  function skillCounts(project) {
    const skills = Array.isArray(project?.skills) ? project.skills : [];
    const count = source => skills.filter(skill => String(skill.source ?? 'bundled') === source).length;
    return {
      bundled: count('bundled'),
      installed: count('installed'),
      generated: count('generated'),
      total: skills.length,
    };
  }

  /**
   * 静态文案包装成函数。
   *
   * 契约统一：外壳的 `subtitle` / `capsule` / `footerLabel` / `footerValue`
   * **一律是函数**。静态与动态的差别只该留在**这一层**。
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
   * 变更日志条目（最新的在前）。
   *
   * @param {object} project - 投影视图。
   * @returns {Array<object>} 条目数组。
   */
  function logEntries(project) {
    const changelog = project?.changelog ?? {};
    return Array.isArray(changelog.entries) ? changelog.entries : [];
  }

  /**
   * 有没有进入生成阶段。
   *
   * @param {object} project - 投影视图。
   * @returns {boolean} 是否已进入生成阶段。
   */
  function renderStarted(project) {
    const stage = String(project?.stage ?? '');
    return stage === 'generate' || stage === 'storyboard' || stage === 'deliver';
  }

  /**
   * 探测结果里的检查项（RF7 RunGate 的 7 行清单的数据源）。
   *
   * @param {object} context - 屏外数据上下文。
   * @returns {{ items: Array<object>, passed: number, warned: number, failed: number, total: number }} 汇总。
   */
  function probeSummary(context) {
    const items = Array.isArray(context?.probe?.view?.report?.items)
      ? context.probe.view.report.items
      : [];
    const count = status => items.filter(item => String(item?.status ?? '') === status).length;
    return {
      items,
      passed: count('ok'),
      warned: count('warn'),
      failed: count('failed'),
      total: items.length,
    };
  }

  /**
   * 上下文三键的齐备情况（RF7 Context 板）。
   *
   * @param {object} project - 投影视图。
   * @returns {{ ready: number, total: number, continuity: number }} 齐备键数 / 总数 / 连续性条数。
   */
  function contextSummary(project) {
    const context = project?.context ?? {};
    const keys = RF.CONTEXT_KEYS;
    const ready = keys.filter(key => String(context[key] ?? '').trim() !== '').length;
    const continuity = String(context.continuity ?? '').trim();
    return {
      ready,
      total: keys.length,
      continuity: continuity === '' ? 0 : continuity.split(/\r?\n/).filter(line => line.trim() !== '').length,
    };
  }

  /**
   * 当前选中的那一镜（RF7 分镜详情 / 素材选择器都要它）。
   *
   * 「选中」是**交互态**，不在投影里 —— 所以从屏外数据上下文取。
   *
   * ⚠️ 口径统一走 `RF.currentShot`：显式选中的那一镜，没选过就取第一镜
   * （画板 07 永远有一镜高亮）。列表页 / 详情屏 / 外壳必须同口径，
   * 否则会出现「列表高亮第 1 镜、详情说没选镜」。
   *
   * @param {object} project - 投影视图。
   * @param {object} [context] - 屏外数据上下文。
   * @returns {object | null} 镜头；一镜都没有时 null。
   */
  function selectedShot(project, context) {
    return RF.currentShot(project, context?.selectedShotId);
  }

  /**
   * 素材选择器里已选的资产 id（交互态）。
   *
   * @param {object} [context] - 屏外数据上下文。
   * @returns {Array<string>} 资产 id 数组。
   */
  function pickerSelection(context) {
    return Array.isArray(context?.pickerSelection) ? context.pickerSelection : [];
  }

  /**
   * 资产分类 → `reelforge.bind_asset` 的 `field`。
   *
   * ⚠️ **这六个值就是宿主 schema 的枚举**（`additionalProperties:false` +
   * `field.enum`）—— 写成 `references` 之类会被宿主**整条拒收**，
   * 表现为「点了没反应」。别自己发明字段名。
   *
   * @type {Record<string, string>}
   */
  const BIND_FIELD_BY_CATEGORY = {
    character: 'character_ids',
    scene: 'scene_ids',
    prop: 'prop_ids',
    costume: 'costume_ids',
    age: 'age_ids',
    voice: 'audio_ids',
  };

  /**
   * 把选中的资产按「能绑的分类」分组。
   *
   * 一次 `bind_asset` 只吃一个 field ⇒ 角色一组、场景一组……
   * 不能绑的分类（音乐 / 音效 / 视频 / 其它）**不绑**，也不假装绑了。
   *
   * @param {object} project - 投影视图。
   * @param {Array<string>} selection - 选中的资产 id。
   * @returns {Array<{ field: string, ids: Array<string> }>} 分组结果。
   */
  function bindAssetGroups(project, selection) {
    const assets = Array.isArray(project?.assets) ? project.assets : [];
    const groups = new Map();
    for (const id of selection) {
      const asset = assets.find(item => String(item?.id ?? '') === String(id));
      const field = BIND_FIELD_BY_CATEGORY[String(asset?.category ?? '')];
      if (field === undefined) continue;
      if (!groups.has(field)) groups.set(field, []);
      groups.get(field).push(String(id));
    }
    return [...groups.entries()].map(([field, ids]) => ({ field, ids }));
  }

  /**
   * 每屏的外壳描述。
   *
   * @typedef {object} TabChrome
   * @property {string} titleKey Header 标题词条。
   * @property {(project: object, t: function, ctx?: object) => string} subtitle Header 副标题。
   * @property {(project: object, t: function, ctx?: object) => string} capsule Header 右侧胶囊文案。
   * @property {(project: object, t: function, ctx?: object) => string} capsuleTone 胶囊色调。
   * @property {(project: object, t: function) => string} footerLabel Footer 第一行标签。
   * @property {(project: object, t: function) => string} footerValue Footer 第二行。
   * @property {(project) => object} footerAction Footer 按钮。
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
   * @property {object | function} [params] `kind === 'tool'` 时的参数。
   * @property {boolean} [disabled] 不可用时置 true。
   * @property {string} [hintKey] 不可用时的说明词条（说清缺什么、给什么替代）。
   */

  RF.TAB_CHROME = {
    // ══════════════════════════════════════════════════════════════
    // Tab 屏（7 块 · RF7 §6.4 固定页签：枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志）
    // ══════════════════════════════════════════════════════════════

    /**
     * 11 枢纽（Hub）：全局落点。
     * 胶囊是整体状态；底栏是「当前阶段」，主按钮「查看成片」——**成片没就绪时禁用**。
     */
    hub: {
      titleKey: 'rf7.hub.title',
      subtitle: staticText('rf7.hub.subtitle'),
      capsule: (project, t) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return t('rf7.hub.capsule.empty');
        if (!renderStarted(project)) return t('rf7.hub.capsule.planned');
        return t('rf7.hub.capsule.running');
      },
      capsuleTone: (project) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        if (chapters.length === 0) return 'neutral';
        return renderStarted(project) ? 'accent' : 'neutral';
      },
      footerLabel: staticText('rf7.hub.footerLabel'),
      footerValue: (project, t) => {
        const chapter = currentChapter(project);
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (chapter === null) return t('rf7.hub.footerValue.empty');
        if (deliverables.length === 0) {
          return t('rf7.hub.footerValue.generating', {
            chapter: Number(chapter.id) || 1,
            title: chapter.title,
          });
        }
        return t('rf7.hub.footerValue.ready', {
          chapter: Number(chapter.id) || 1,
          title: chapter.title,
          count: deliverables.length,
        });
      },
      footerAction: (project, t, context) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'rf7.hub.action', kind: 'none', hintKey: 'rf7.hub.actionDisabled' };
        }
        return { key: 'rf7.hub.action', kind: 'tab', tab: 'output' };
      },
    },

    /**
     * 03 章节（Chapters）：先骨架 · 再逐章生成。
     * 主按钮「生成全部章节」= 跑 llm 阶段（它产出章节与分镜）。
     */
    chapters: {
      titleKey: 'rf7.chapters.title',
      subtitle: staticText('rf7.chapters.subtitle'),
      capsule: (project, t) => t('rf7.chapters.capsule', {
        count: Array.isArray(project?.chapters) ? project.chapters.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.chapters.footerLabel'),
      footerValue: (project, t) => t('rf7.chapters.footerValue', {
        chapters: Array.isArray(project?.chapters) ? project.chapters.length : 0,
        shots: totalShots(project),
      }),
      footerAction: (project, t, context) => {
        const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
        const hasNovel = Number(project?.intake?.chars ?? 0) > 0;
        if (!hasNovel && chapters.length === 0) {
          return { key: 'rf7.chapters.action', kind: 'none', hintKey: 'rf7.chapters.actionDisabled' };
        }
        return {
          key: 'rf7.chapters.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.runStage,
          params: { stage: 'llm' },
        };
      },
    },

    /**
     * 04 素材库（Assets）：10 类资产。
     * 主按钮「新建资产」**当前没有对应工具**（`create_asset` 要求分类 + 名字，
     * 底栏没有输入位）⇒ 禁用并指向屏内的「新建资产」表单。
     */
    assets: {
      titleKey: 'rf7.assets.title',
      subtitle: staticText('rf7.assets.subtitle'),
      capsule: (project, t) => t('rf7.assets.capsule', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.assets.footerLabel'),
      footerValue: (project, t) => t('rf7.assets.footerValue', {
        count: Array.isArray(project?.assets) ? project.assets.length : 0,
      }),
      footerAction: () => ({ key: 'rf7.assets.action', kind: 'none', hintKey: 'rf7.assets.actionDisabled' }),
    },

    /**
     * 07 分镜审查（Storyboard）：逐镜预览。
     * 主按钮「重新生成选中镜」→ `reelforge.regenerate_shot`（触发类 ⇒ 宿主弹授权）。
     */
    shots: {
      titleKey: 'rf7.storyboard.title',
      subtitle: staticText('rf7.storyboard.subtitle'),
      capsule: (project, t) => t('rf7.storyboard.capsule', {
        count: Array.isArray(project?.shots) ? project.shots.length : 0,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.storyboard.footerLabel'),
      footerValue: (project, t) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        const pending = shots.filter(shot => String(shot?.status ?? '') !== 'done').length;
        return t('rf7.storyboard.footerValue', { count: shots.length, pending });
      },
      footerAction: (project, t, context) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        if (shots.length === 0) {
          return { key: 'rf7.storyboard.action', kind: 'none', hintKey: 'rf7.storyboard.actionDisabled' };
        }
        return {
          key: 'rf7.storyboard.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.regenerateShot,
          params: (current, _t, currentContext) => {
            const picked = selectedShot(current, currentContext)
              ?? shots.find(shot => String(shot?.status ?? '') !== 'done')
              ?? shots[0];
            return { seq: Number(picked?.seq) || 1, idx: Number(picked?.idx) || 1 };
          },
        };
      },
    },

    /**
     * 05 上下文（Context）：生成前必须齐的三把钥匙。
     * 主按钮「冻结锚点」**当前没有对应工具** ⇒ 禁用并说清替代路径。
     */
    context: {
      titleKey: 'rf7.context.title',
      subtitle: staticText('rf7.context.subtitle'),
      capsule: (project, t) => {
        const summary = contextSummary(project);
        return summary.ready === summary.total
          ? t('rf7.context.capsule.ready')
          : t('rf7.context.capsule.missing', { missing: summary.total - summary.ready });
      },
      capsuleTone: (project) => {
        const summary = contextSummary(project);
        return summary.ready === summary.total ? 'ok' : 'warn';
      },
      footerLabel: staticText('rf7.context.footerLabel'),
      footerValue: (project, t) => {
        const summary = contextSummary(project);
        return t('rf7.context.footerValue', {
          ready: summary.ready,
          total: summary.total,
          continuity: summary.continuity,
        });
      },
      footerAction: () => ({ key: 'rf7.context.action', kind: 'none', hintKey: 'rf7.context.actionDisabled' }),
    },

    /**
     * 10 成片（Output）：合成 · 字幕 · 交付。
     * 主按钮「下载成片」→ 滚到交付物清单；没有交付物时禁用。
     */
    output: {
      titleKey: 'rf7.output.title',
      subtitle: staticText('rf7.output.subtitle'),
      capsule: (project, t) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        return t('rf7.output.capsule', { count: deliverables.length });
      },
      capsuleTone: (project) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        return deliverables.length > 0 ? 'accent' : 'neutral';
      },
      footerLabel: staticText('rf7.output.footerLabel'),
      footerValue: (project, t) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) return t('rf7.output.footerValue.empty');
        const chapter = currentChapter(project);
        return t('rf7.output.footerValue', {
          chapter: Number(chapter?.id) || 1,
          duration: chapterDuration(chapter).toFixed(0),
          count: deliverables.length,
        });
      },
      footerAction: (project, t, context) => {
        const deliverables = Array.isArray(project?.deliverables) ? project.deliverables : [];
        if (deliverables.length === 0) {
          return { key: 'rf7.output.action', kind: 'none', hintKey: 'rf7.output.actionDisabled' };
        }
        return { key: 'rf7.output.action', kind: 'scroll', target: 'rf-deliverables' };
      },
    },

    /**
     * 12 运行日志（Log）：谁在什么时候改了什么。
     * 主按钮「回滚本批」—— **变更日志里没有批次号** ⇒ 禁用并指向屏内的两级回滚。
     */
    log: {
      titleKey: 'rf7.log.title',
      subtitle: staticText('rf7.log.subtitle'),
      capsule: (project, t) => t('rf7.log.capsule', { count: logCount(project) }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.log.footerLabel'),
      footerValue: (project, t) => t('rf7.log.footerValue', { count: logCount(project) }),
      footerAction: (project, t, context) => {
        const entries = logEntries(project);
        if (entries.length === 0) {
          return { key: 'rf7.log.action', kind: 'none', hintKey: 'rf7.log.actionDisabled' };
        }
        return { key: 'rf7.log.action', kind: 'none', hintKey: 'rf7.log.actionNoBatch' };
      },
    },

    // ══════════════════════════════════════════════════════════════
    // 流程屏（8 块 · 无页签条）
    // ══════════════════════════════════════════════════════════════

    /**
     * 01 启动检查（RunGate）：环境门，冷启动首屏。
     * 胶囊是**真实**探测结果（通过 / 警告 / 未通过），底栏指向「新建项目」。
     */
    runGate: {
      titleKey: 'rf7.runGate.title',
      subtitle: staticText('rf7.runGate.subtitle'),
      capsule: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return t('rf7.runGate.capsule.pending');
        return t('rf7.runGate.capsule', {
          passed: summary.passed,
          total: summary.total,
        });
      },
      capsuleTone: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return 'neutral';
        if (summary.failed > 0) return 'warn';
        if (summary.warned > 0) return 'warn';
        return 'ok';
      },
      footerLabel: staticText('rf7.runGate.footerLabel'),
      footerValue: (project, t, context) => {
        const summary = probeSummary(context);
        if (summary.total === 0) return t('rf7.runGate.footerValue.pending');
        if (summary.failed > 0) {
          return t('rf7.runGate.footerValue.failed', { count: summary.failed });
        }
        return t('rf7.runGate.footerValue.ready');
      },
      footerAction: () => ({ key: 'rf7.runGate.action', kind: 'flow', screen: 'intake' }),
    },

    /**
     * 14 服务配置（Settings）：ComfyUI / LLM / 运行时 / 生成维护。
     *
     * ⚠️ **只读屏**：插件没有写配置的工具（配置在插件 `config` 块 / 宿主设置里）。
     * 主按钮「保存并重测」因此禁用，屏内「重跑检查」按钮负责重测。
     */
    settings: {
      titleKey: 'rf7.settings.title',
      subtitle: staticText('rf7.settings.subtitle'),
      capsule: staticText('rf7.settings.capsule'),
      capsuleTone: () => 'warn',
      footerLabel: staticText('rf7.settings.footerLabel'),
      footerValue: staticText('rf7.settings.footerValue'),
      footerAction: () => ({ key: 'rf7.settings.action', kind: 'none', hintKey: 'rf7.settings.actionDisabled' }),
    },

    /**
     * 02 新建项目（Intake）：小说 → 自动拆章。
     *
     * 主按钮「创建并打开」= **导入正文**（`reelforge.import_novel`）⇒ 拆章并建立项目。
     * ⚠️ `import_novel` 的必填参数是 `novel` —— 正文为空时不能发（会被宿主拒收），
     * 所以正文为空 ⇒ 禁用并说清缺什么。
     * 已经导入过（投影里已有正文字数）⇒ 这一步已经做完了，直接去「启动检查」。
     */
    intake: {
      titleKey: 'rf7.intake.title',
      subtitle: staticText('rf7.intake.subtitle'),
      capsule: (project, t) => {
        const chars = Number(project?.intake?.chars ?? 0);
        return chars > 0 ? t('rf7.intake.capsule.ready') : t('rf7.intake.capsule.empty');
      },
      capsuleTone: (project) => (Number(project?.intake?.chars ?? 0) > 0 ? 'accent' : 'neutral'),
      footerLabel: staticText('rf7.intake.footerLabel'),
      footerValue: staticText('rf7.intake.footerValue'),
      footerAction: (project, t, context) => {
        const chars = Number(project?.intake?.chars ?? 0);
        if (chars > 0) return { key: 'rf7.intake.action', kind: 'flow', screen: 'runGate' };
        const text = String(context?.novelText ?? '').trim();
        if (text === '') {
          return { key: 'rf7.intake.action', kind: 'none', hintKey: 'rf7.intake.actionDisabled' };
        }
        return {
          key: 'rf7.intake.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.importNovel,
          // ⚠️ `import_novel` 的 schema 是 `additionalProperties:false` ⇒ 只发认识的键。
          params: (_current, _translate, currentContext) => {
            const args = { novel: String(currentContext?.novelText ?? '').trim() };
            const name = String(currentContext?.projectName ?? '').trim();
            if (name !== '') args.name = name;
            return args;
          },
        };
      },
    },

    /**
     * 15 项目设置（ProjectSettings）：成片规格 / 字幕 / 声音 / 危险操作。
     *
     * ⚠️ **只读屏**：项目层字段（分辨率 / 比例 / 字幕 / 声音）能读，
     * 但插件**没有写项目设置的工具** ⇒ 主按钮禁用并说明改法。
     */
    projectSettings: {
      titleKey: 'rf7.projectSettings.title',
      subtitle: staticText('rf7.projectSettings.subtitle'),
      capsule: staticText('rf7.projectSettings.capsule'),
      capsuleTone: () => 'ok',
      footerLabel: staticText('rf7.projectSettings.footerLabel'),
      footerValue: (project, t) => t('rf7.projectSettings.footerValue', {
        resolution: String(project?.settings?.resolution ?? '') || t('rf7.projectSettings.unset'),
        aspect: String(project?.settings?.aspectRatio ?? '') || t('rf7.projectSettings.unset'),
      }),
      footerAction: () => ({ key: 'rf7.projectSettings.action', kind: 'none', hintKey: 'rf7.projectSettings.actionDisabled' }),
    },

    /**
     * 06 生成执行（Stages）：四阶段进度 + 勾选。
     * 主按钮「暂停生成」—— **没有暂停能力** ⇒ 禁用并说明替代（等本批跑完 / 去设置调显存释放间隔）。
     */
    stages: {
      titleKey: 'rf7.stages.title',
      subtitle: staticText('rf7.stages.subtitle'),
      capsule: (project, t) => t('rf7.stages.capsule', { count: RF.STAGES.length }),
      capsuleTone: () => 'accent',
      footerLabel: staticText('rf7.stages.footerLabel'),
      footerValue: (project, t) => {
        const stage = String(project?.stage ?? '');
        const kind = String(project?.plan?.kind ?? '');
        if (kind === '') return t('rf7.stages.footerValue.unset');
        return t('rf7.stages.footerValue', { kind, stage: stage === '' ? '-' : stage });
      },
      footerAction: () => ({ key: 'rf7.stages.action', kind: 'none', hintKey: 'rf7.stages.actionDisabled' }),
    },

    /**
     * 08 分镜详情（ShotDetail）：单镜展开。
     * 主按钮「重新生成此镜」→ `reelforge.regenerate_shot`。
     */
    shotDetail: {
      titleKey: 'rf7.shotDetail.title',
      subtitle: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return t('rf7.shotDetail.subtitle.empty');
        return t('rf7.shotDetail.subtitle', {
          chapter: Number(shot.seq) || 1,
          idx: Number(shot.idx) || 1,
        });
      },
      capsule: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return t('rf7.shotDetail.capsule.empty');
        return String(shot.status ?? '') === 'done'
          ? t('rf7.shotDetail.capsule.done')
          : t('rf7.shotDetail.capsule.pending');
      },
      capsuleTone: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) return 'neutral';
        return String(shot.status ?? '') === 'done' ? 'ok' : 'warn';
      },
      footerLabel: staticText('rf7.shotDetail.footerLabel'),
      footerValue: (project, t) => {
        const shots = Array.isArray(project?.shots) ? project.shots : [];
        const pending = shots.filter(shot => String(shot?.status ?? '') !== 'done').length;
        return t('rf7.shotDetail.footerValue', { count: shots.length, pending });
      },
      footerAction: (project, t, context) => {
        const shot = selectedShot(project, context);
        if (shot === null) {
          return { key: 'rf7.shotDetail.action', kind: 'none', hintKey: 'rf7.shotDetail.actionDisabled' };
        }
        return {
          key: 'rf7.shotDetail.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.regenerateShot,
          params: { seq: Number(shot.seq) || 1, idx: Number(shot.idx) || 1 },
        };
      },
    },

    /**
     * 09 背景音乐（Music）：生成 / 试听 / 应用。
     *
     * ⚠️ 音乐条目来自「音乐类资产」，而**投影里没有音乐文件路径**
     * （`reelforge.set_chapter_music` 要的是工作区相对路径）⇒ 主按钮禁用并说清缺什么。
     */
    music: {
      titleKey: 'rf7.music.title',
      subtitle: staticText('rf7.music.subtitle'),
      capsule: (project, t) => t('rf7.music.capsule', {
        count: RF.musicAssets(project).length,
      }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.music.footerLabel'),
      footerValue: (project, t) => t('rf7.music.footerValue', {
        count: RF.musicAssets(project).length,
      }),
      footerAction: () => ({ key: 'rf7.music.action', kind: 'none', hintKey: 'rf7.music.actionDisabled' }),
    },

    /**
     * 13 技能与工作流（Skills）：**从旧版页签移过来的流程屏**。
     * 主按钮「安装新技能」—— 插件没有装技能的工具 ⇒ 禁用并说清装法。
     */
    skills: {
      titleKey: 'rf7.skills.title',
      subtitle: staticText('rf7.skills.subtitle'),
      capsule: (project, t) => t('rf7.skills.capsule', { count: skillCounts(project).total }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.skills.footerLabel'),
      footerValue: (project, t) => {
        const counts = skillCounts(project);
        return t('rf7.skills.footerValue', counts);
      },
      footerAction: () => ({ key: 'rf7.skills.action', kind: 'none', hintKey: 'rf7.skills.actionDisabled' }),
    },

    // ══════════════════════════════════════════════════════════════
    // 规范板（规则层）
    // ══════════════════════════════════════════════════════════════

    /**
     * 17 降级与失败（Degraded）：阻塞 / 警告 / 缺料 / 空态 / 软降级五态。
     * 主按钮「查看失败清单」→ 页签「日志」。
     */
    degraded: {
      titleKey: 'rf7.degraded.title',
      subtitle: staticText('rf7.degraded.subtitle'),
      capsule: (project, t, context) => {
        const degradations = Array.isArray(context?.probe?.view?.degrade?.degradations)
          ? context.probe.view.degrade.degradations
          : [];
        return t('rf7.degraded.capsule', { count: degradations.length });
      },
      capsuleTone: (project, t, context) => {
        const degradations = Array.isArray(context?.probe?.view?.degrade?.degradations)
          ? context.probe.view.degrade.degradations
          : [];
        return degradations.length > 0 ? 'warn' : 'neutral';
      },
      footerLabel: staticText('rf7.degraded.footerLabel'),
      footerValue: staticText('rf7.degraded.footerValue'),
      footerAction: () => ({ key: 'rf7.degraded.action', kind: 'tab', tab: 'log' }),
    },

    /**
     * 18 素材选择器（Picker）：右栏内嵌弹窗形态。
     *
     * 主按钮「确定」→ `reelforge.bind_asset`，把选中的素材绑到那一镜。
     *
     * ⚠️ **两个必须按宿主 schema 来的细节**：
     *   1. `field` 的枚举只有六个（`character_ids` / `scene_ids` / `prop_ids` /
     *      `costume_ids` / `age_ids` / `audio_ids`）—— 写 `references` 会被**整条拒收**；
     *   2. 一次调用只吃**一个** field ⇒ 选中的素材按分类分组，逐组发。
     */
    picker: {
      titleKey: 'rf7.picker.title',
      subtitle: staticText('rf7.picker.subtitle'),
      capsule: (project, t, context) => t('rf7.picker.capsule', { count: pickerSelection(context).length }),
      capsuleTone: () => 'neutral',
      footerLabel: staticText('rf7.picker.footerLabel'),
      footerValue: (project, t, context) => t('rf7.picker.footerValue', {
        count: pickerSelection(context).length,
        limit: RF.REFERENCE_LIMITS?.images ?? 9,
      }),
      footerAction: (project, t, context) => {
        const selection = pickerSelection(context);
        const shot = selectedShot(project, context);
        if (selection.length === 0 || shot === null) {
          return { key: 'rf7.picker.action', kind: 'none', hintKey: 'rf7.picker.actionDisabled' };
        }
        const groups = bindAssetGroups(project, selection);
        if (groups.length === 0) {
          return { key: 'rf7.picker.action', kind: 'none', hintKey: 'rf7.picker.actionNoBindable' };
        }
        return {
          key: 'rf7.picker.action',
          kind: 'tool',
          tool: RF.TOOL_IDS.bindAsset,
          // ⚠️ 返回**一组**参数：每组一个 field，Workbench 会逐个发。
          params: groups.map(group => ({
            seq: Number(shot.seq) || 1,
            idx: Number(shot.idx) || 1,
            field: group.field,
            ids: group.ids,
          })),
        };
      },
    },
  };

  /**
   * 取某屏的外壳描述（找不到就回落到枢纽）。
   *
   * @param {string} screenId - 页签 id 或流程屏 id。
   * @returns {TabChrome} 外壳描述。
   */
  RF.tabChrome = function tabChrome(screenId) {
    return RF.TAB_CHROME[screenId] ?? RF.TAB_CHROME.hub;
  };
})(RF);
