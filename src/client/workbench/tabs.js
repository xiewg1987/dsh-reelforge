/* ─────────────────────────────────────────────────────────────────────────────
 * 项目视图的 7 块 Tab 屏（RF7 画板索引 §八「Tab 屏」）。
 *
 * 枢纽 11 · 章节 03 · 素材 04 · 分镜 07 · 上下文 05 · 成片 10 · 日志 12
 *
 * 每块屏按 `design/_tools/build-rf7.mjs` 里对应的 `boardXxx()` 排版 ——
 * 那份脚本是设计稿的**真源**（几何 + 令牌变量），这里是它的代码版。
 *
 * 纪律：
 *   1. 数据只从宿主投影读（R1）；交互态走 `props.state`；
 *   2. **数据没有就说清楚没有**，不编内容（RF7 §6.7「失败不许静默降质」）；
 *   3. 排版用 `workbench/rf7.js` 的零件，样式只写 class 名。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 镜头状态 → 胶囊色调 + 词条键。
   *
   * @param {string} status - 机器状态。
   * @returns {{ tone: string, key: string }} 胶囊信息。
   */
  function shotStatus(status) {
    const raw = String(status ?? '');
    if (raw === 'done') return { tone: 'done', key: 'rf7.status.done' };
    if (raw === 'generating') return { tone: 'running', key: 'rf7.status.generating' };
    if (raw === 'failed') return { tone: 'failed', key: 'rf7.status.failed' };
    return { tone: 'queued', key: 'rf7.status.pending' };
  }

  /**
   * 章节状态 → 胶囊色调 + 词条键。
   *
   * @param {string} status - 机器状态。
   * @returns {{ tone: string, key: string }} 胶囊信息。
   */
  function chapterStatus(status) {
    const raw = String(status ?? '');
    if (raw === 'done') return { tone: 'done', key: 'rf7.status.done' };
    if (raw === 'running') return { tone: 'running', key: 'rf7.status.generating' };
    if (raw === 'failed') return { tone: 'failed', key: 'rf7.status.failed' };
    return { tone: 'queued', key: 'rf7.status.pending' };
  }

  /**
   * 资产分类 → 展示名（RF7 素材板的筛选芯片）。
   *
   * @param {string} category - 机器分类。
   * @param {function} t - 翻译函数。
   * @returns {string} 展示名。
   */
  function assetCategoryName(category, t) {
    return RF.labelOf('asset.category', category, t);
  }

  // ══════════════════════════════════════════════════════════════
  // 11 枢纽（Hub）—— 有章节后的默认落点
  // ══════════════════════════════════════════════════════════════

  RF.tabHub = function tabHub(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const shots = Array.isArray(project.shots) ? project.shots : [];

    if (chapters.length === 0) {
      return h('div', { className: `${RF.CLS}-stack` },
        RF.r7ChatSync({ t, project }),
        h(RF.ui.EmptyState, {
          title: t('rf7.hub.empty.title'),
          hint: t('rf7.hub.empty.hint'),
          action: h(RF.ui.Button, {
            label: t('rf7.hub.empty.action'),
            variant: 'primary',
            onClick: () => props.state.goFlow('intake'),
          }),
        }));
    }

    // 成本 + 当前阶段 = RF/HubStrip（横向两格 + 竖分隔线）。
    const cost = project.cost ?? {};
    const kind = String(project.plan?.kind ?? '');
    const position = RF.currentPosition(project);
    const chapter = chapters.find(item => Number(item.id) === Number(position?.chapter)) ?? chapters[0];
    const chapterShots = shots.filter(shot => Number(shot.seq) === Number(chapter.id));
    const doneShots = chapterShots.filter(shot => String(shot.status ?? '') === 'done').length;
    const visible = chapterShots.slice(0, 6);
    const rest = chapterShots.length - visible.length;

    const hubStrip = h(RF.ui.Card, { className: `${RF.CLS}-hubstrip` },
      RF.r7Stat(t('rf7.hub.costLabel'), RF.formatMoney(cost.spent ?? 0), kind === '' ? t('rf7.hub.kindUnset') : kind),
      h('div', { className: `${RF.CLS}-divider` }),
      RF.r7Stat(
        t('rf7.hub.stageLabel'),
        kind === '' ? t('rf7.hub.stageUnset') : kind,
        t('rf7.hub.stageSub', {
          chapter: Number(chapter.id) || 1,
          done: doneShots,
          total: chapterShots.length,
        })));

    const chapterRail = h(RF.ui.Card, null,
      h('div', { className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, t('rf7.hub.chapterTitle', {
            chapter: Number(chapter.id) || 1,
            title: chapter.title,
          })),
          h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.hub.chapterMeta', {
            shots: chapter.shotCount ?? 0,
            duration: RF.formatDuration(chapter.durationSec ?? 0),
          }))),
        h(RF.ui.Pill, {
          label: t(chapterStatus(chapter.status).key),
          tone: chapterStatus(chapter.status).tone,
        })),
      RF.r7Track(chapterShots.length === 0 ? 0 : doneShots / chapterShots.length));

    const rows = [];
    for (let index = 0; index < visible.length; index += 2) {
      const pair = visible.slice(index, index + 2);
      rows.push(h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--two` },
        pair.map(shot => RF.r7ShotChip(
          t('rf7.hub.shotId', { seq: Number(shot.seq) || 1, idx: Number(shot.idx) || 1 }),
          shot.shotSize === '' ? t('rf7.hub.shotSizeUnknown') : shot.shotSize,
          t(shotStatus(shot.status).key),
          shotStatus(shot.status).tone === 'done'
            ? 'ok'
            : (shotStatus(shot.status).tone === 'running' ? 'accent' : 'line')))));
    }

    return h('div', { className: `${RF.CLS}-stack` },
      hubStrip,
      RF.r7ChatSync({ t, project }),
      RF.r7SectionHead(t('rf7.hub.sectionChapters')),
      chapterRail,
      RF.r7SectionHead(t('rf7.hub.sectionShots'), t('rf7.hub.sectionShotsSub')),
      ...rows,
      h('div', { className: `${RF.CLS}-row` },
        h('span', { className: `${RF.CLS}-note` }, t('rf7.hub.moreShots', { count: rest > 0 ? rest : 0 })),
        h(RF.ui.Button, {
          label: t('rf7.hub.viewAll', { count: chapterShots.length }),
          variant: 'secondary',
          onClick: () => props.state.goTab('shots'),
        })),
      // ── 屏间入口 ──
      // RF7 画板只画屏内内容；「项目设置」「技能与工作流」在 RF7 里是流程屏
      // （技能是从旧页签挪过来的，页签条里已经没有它）⇒ 枢纽是它们的落点。
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.hub.actProjectSettings'),
          variant: 'secondary',
          onClick: () => props.state.goFlow('projectSettings'),
        }),
        h(RF.ui.Button, {
          label: t('rf7.hub.actSkills'),
          variant: 'secondary',
          onClick: () => props.state.goFlow('skills'),
        })));
  };

  // ══════════════════════════════════════════════════════════════
  // 03 章节（Chapters）
  // ══════════════════════════════════════════════════════════════

  RF.tabChapters = function tabChapters(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];

    const card = chapter => h(RF.ui.Card, null,
      h('div', { className: `${RF.CLS}-row__title` }, t('rf7.chapters.chapterTitle', { chapter: Number(chapter.id) || 1 })),
      h('div', { className: `${RF.CLS}-row` },
        h('span', { className: `${RF.CLS}-row__sub` }, (Number(chapter.shotCount) || 0) === 0
          ? t('rf7.chapters.noShots')
          : t('rf7.chapters.shotsMeta', {
            shots: chapter.shotCount,
            duration: RF.formatDuration(chapter.durationSec ?? 0),
          })),
        h(RF.ui.Pill, {
          label: t(chapterStatus(chapter.status).key),
          tone: chapterStatus(chapter.status).tone,
        })),
      h('div', { className: `${RF.CLS}-row` },
        // 「生成」接得到工具（`run_stage` 的 `seq` 限定章节）⇒ 真接线。
        h(RF.ui.Button, {
          label: t('rf7.chapters.actGenerate'),
          variant: 'secondary',
          onClick: () => props.state.runStage('llm', chapter.id),
        }),
        // 「编辑」「操作」插件**没有对应工具** ⇒ 禁用 + 说清缺什么（不做死按钮）。
        h(RF.ui.Button, {
          label: t('rf7.chapters.actEdit'),
          variant: 'secondary',
          disabled: true,
          title: t('rf7.chapters.actEditDisabled'),
        }),
        h(RF.ui.Button, {
          label: t('rf7.chapters.actMore'),
          variant: 'secondary',
          disabled: true,
          title: t('rf7.chapters.actMoreDisabled'),
        })));

    const rows = [];
    for (let index = 0; index < chapters.length; index += 2) {
      const pair = chapters.slice(index, index + 2);
      rows.push(h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--two` }, pair.map(card)));
    }

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7ChatSync({ t, project }),
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.chapters.actAdd'),
          variant: 'primary',
          onClick: () => props.state.goFlow('intake'),
        }),
        h(RF.ui.Button, {
          label: t('rf7.chapters.actGenerateAll'),
          variant: 'secondary',
          onClick: () => props.state.runStage('llm'),
        })),
      ...rows,
      RF.r7Notice(t('rf7.chapters.notice'), t('rf7.chapters.noticeSub')));
  };

  // ══════════════════════════════════════════════════════════════
  // 04 素材库（Assets）
  // ══════════════════════════════════════════════════════════════

  RF.tabAssets = function tabAssets(props) {
    const t = props.t;
    const project = props.project ?? {};
    const assets = Array.isArray(project.assets) ? project.assets : [];
    const category = props.state.assetCategory;
    const shown = RF.assetsByCategory(project, category);
    // 缺口警示：**实算**缺参考图的分镜数（写死「3 个」= 面板在骗人）。
    const missingShots = RF.shotsMissingReferences(project);
    const shots = Array.isArray(project.shots) ? project.shots : [];
    const gapText = missingShots.length > 0
      ? t('rf7.assets.gapTitle', { count: missingShots.length })
      : (shots.length === 0 ? t('rf7.assets.gapNoShots') : t('rf7.assets.gapNone'));

    const chipItems = ['all'].concat(RF.ASSET_CATEGORIES.filter(item => (
      assets.filter(asset => String(asset?.category ?? '') === item).length > 0
    )));
    const chipLabels = chipItems.map(item => (item === 'all'
      ? t('rf7.assets.chipAll', { count: assets.length })
      : `${assetCategoryName(item, t)} ${assets.filter(asset => String(asset?.category ?? '') === item).length}`));

    const card = asset => h(RF.ui.Card, null,
      h('div', { className: `${RF.CLS}-row__title` }, asset.name),
      h('div', { className: `${RF.CLS}-row` },
        h('span', { className: `${RF.CLS}-row__sub` }, assetCategoryName(asset.category, t)),
        h(RF.ui.Pill, { label: t('rf7.assets.stateReady'), tone: 'done' })),
      h('div', { className: `${RF.CLS}-row__sub` }, asset.description === ''
        ? t('rf7.assets.noDescription')
        : asset.description),
      h('div', { className: `${RF.CLS}-chips` },
        [t('rf7.assets.actGenerate'), t('rf7.assets.actReplace')].map(action => h('span', {
          className: `${RF.CLS}-chip`,
        }, action))));

    const rows = [];
    for (let index = 0; index < shown.length; index += 2) {
      const pair = shown.slice(index, index + 2);
      rows.push(h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--two` }, pair.map(card)));
    }

    return h('div', { className: `${RF.CLS}-stack` },
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.assets.actCreate'),
          variant: 'primary',
          onClick: () => props.state.goFlow('picker'),
        })),
      RF.r7ChipRow(chipLabels, chipItems.indexOf(category), index => {
        props.state.setAssetCategory(chipItems[index] ?? 'all');
      }),
      ...rows,
      h('div', { className: `${RF.CLS}-row` },
        h('span', { className: `${RF.CLS}-note` }, t('rf7.assets.more', { count: assets.length - shown.length })),
        h(RF.ui.Button, {
          label: t('rf7.assets.viewAll', { count: assets.length }),
          variant: 'secondary',
          onClick: () => props.state.setAssetCategory('all'),
        })),
      RF.r7Notice(gapText, t('rf7.assets.gapSub')));
  };

  // ══════════════════════════════════════════════════════════════
  // 07 分镜审查（Storyboard）
  // ══════════════════════════════════════════════════════════════

  RF.tabShots = function tabShots(props) {
    const t = props.t;
    const project = props.project ?? {};
    const shots = Array.isArray(project.shots) ? project.shots : [];
    const selectedId = props.state.selectedShotId;
    const selected = RF.currentShot(project, selectedId);

    const rows = shots.map(shot => {
      const on = selected !== null && String(shot.id) === String(selected.id);
      const status = shotStatus(shot.status);
      return h('button', {
        key: String(shot.id),
        type: 'button',
        className: `${RF.CLS}-shotrow${on ? ` ${RF.CLS}-shotrow--on` : ''}`,
        onClick: () => props.state.selectShot(String(shot.id)),
      },
      h('span', { className: `${RF.CLS}-shotrow__id` }, String(Number(shot.idx) || 0).padStart(2, '0')),
      h('span', { className: `${RF.CLS}-shotrow__title` }, shot.label),
      h('span', { className: `${RF.CLS}-shotrow__dur` }, t('rf7.storyboard.duration', { seconds: shot.duration ?? 0 })),
      h('span', { className: `${RF.CLS}-shotrow__state` }, t(status.key)));
    });

    const preview = selected === null
      ? null
      : h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          RF.r7Thumb(t('rf7.storyboard.refCharacter'), { size: 48 }),
          RF.r7Thumb(t('rf7.storyboard.refScene'), { size: 48 }),
          RF.r7Thumb(t('rf7.storyboard.refProp'), { size: 48 }),
          h('div', { style: { flex: '1 1 auto' } }),
          RF.r7PlayerBar(t('rf7.storyboard.duration', { seconds: selected.duration ?? 0 }))),
        h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.storyboard.promptLine', {
          size: selected.shotSize === '' ? '-' : selected.shotSize,
        })));

    return h('div', { className: `${RF.CLS}-stack` },
      ...rows,
      selected === null
        ? h(RF.ui.EmptyState, { title: t('rf7.storyboard.empty.title'), hint: t('rf7.storyboard.empty.hint') })
        : RF.r7SectionHead(
          t('rf7.storyboard.sectionSelected', { idx: Number(selected.idx) || 1 }),
          t('rf7.storyboard.sectionSelectedSub')),
      preview,
      RF.r7SectionHead(t('rf7.storyboard.sectionRegenerate')),
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('rf7.storyboard.actSeed'),
            variant: 'secondary',
            onClick: () => props.state.regenerateShot(selected),
          }),
          h(RF.ui.Button, {
            label: t('rf7.storyboard.actRewrite'),
            variant: 'secondary',
            onClick: () => props.state.regenerateShot(selected),
          })),
        RF.r7FieldBox(t('rf7.storyboard.feedbackPlaceholder'), 'placeholder')),
      // ── 屏间入口 ──
      // 画板 07 是分镜**列表**，画板 08 是**单镜展开** ⇒ 列表页给一条进详情的路。
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.storyboard.actDetail'),
          variant: 'secondary',
          disabled: selected === null,
          title: selected === null ? t('rf7.storyboard.actDetailDisabled') : undefined,
          onClick: () => {
            // 进详情前把「当前镜」落成显式选中 —— 列表高亮哪一镜，详情就展开哪一镜。
            props.state.selectShot(String(selected.id));
            props.state.goFlow('shotDetail');
          },
        })));
  };

  // ══════════════════════════════════════════════════════════════
  // 05 上下文（Context）
  // ══════════════════════════════════════════════════════════════

  RF.tabContext = function tabContext(props) {
    const t = props.t;
    const project = props.project ?? {};
    const context = project.context ?? {};

    const expanded = String(props.state.expandedContextKey ?? '');
    const card = (key, titleKey, metaKey, value, tone) => {
      const filled = String(value ?? '').trim() !== '';
      return h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t(titleKey)),
            h('div', { className: `${RF.CLS}-row__sub` }, t(metaKey))),
          h(RF.ui.Pill, {
            label: t(filled ? 'rf7.context.stateReady' : 'rf7.context.stateMissing'),
            tone: filled ? tone : 'queued',
          })),
        // 「查看」= 展开这一键的正文（纯本地交互，不需要工具）。
        expanded === key
          ? h('div', { className: `${RF.CLS}-row__sub` }, filled ? value : t('rf7.context.stateMissing'))
          : null,
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('rf7.context.actView'),
            variant: 'secondary',
            onClick: () => props.state.toggleContextKey(key),
          }),
          // 「从对话写入」需要先选键再填内容，而这一屏没有输入位 ⇒ 禁用 + 说清。
          h(RF.ui.Button, {
            label: t('rf7.context.actWrite'),
            variant: 'secondary',
            disabled: true,
            title: t('rf7.context.actWriteDisabled'),
          })));
    };

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7ChatSync({ t, project }),
      card('bible', 'rf7.context.bibleTitle', 'rf7.context.bibleMeta', context.bible, 'done'),
      card('style', 'rf7.context.styleTitle', 'rf7.context.styleMeta', context.style, 'done'),
      card('continuity', 'rf7.context.continuityTitle', 'rf7.context.continuityMeta', context.continuity, 'warn'),
      RF.r7SectionHead(t('rf7.context.sectionInject'), t('rf7.context.sectionInjectSub')),
      h(RF.ui.Card, null, RF.CONTEXT_INJECTION_ORDER.map(key => h('div', {
        className: `${RF.CLS}-inject__line`,
      }, RF.CONTEXT_INJECTION_TITLES[key]))),
      RF.r7Notice(t('rf7.context.rule1'), t('rf7.context.rule2')));
  };

  // ══════════════════════════════════════════════════════════════
  // 10 成片（Output）
  // ══════════════════════════════════════════════════════════════

  RF.tabOutput = function tabOutput(props) {
    const t = props.t;
    const project = props.project ?? {};
    const deliverables = Array.isArray(project.deliverables) ? project.deliverables : [];
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];

    const videos = deliverables.filter(item => String(item.kind ?? '').startsWith('video'));
    const first = videos[0] ?? deliverables[0] ?? null;

    const exportRow = first === null
      ? null
      : h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, first.label === '' ? t('rf7.output.untitled') : first.label),
            h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.output.fileMeta', {
              size: RF.formatBytes(first.bytes ?? 0),
              time: RF.formatDateTime(first.at ?? ''),
            }))),
          h(RF.ui.Button, {
            label: t('rf7.output.actDownload'),
            variant: 'primary',
            onClick: () => window.open(RF.deliverableUrl(first), '_blank'),
          })));

    const deliverList = deliverables.length === 0
      ? h(RF.ui.EmptyState, { title: t('rf7.output.empty.title'), hint: t('rf7.output.empty.hint') })
      : h(RF.ui.Card, null, deliverables.map(item => RF.r7KvRow(
        item.label === '' ? String(item.kind ?? '') : item.label,
        t('rf7.output.deliverMeta', { size: RF.formatBytes(item.bytes ?? 0) }),
        t('rf7.output.stateReady'),
        'ok')));

    return h('div', { className: `${RF.CLS}-stack` },
      exportRow,
      h('div', { className: `${RF.CLS}-playerbox` }, t('rf7.output.playerPlaceholder')),
      RF.r7SectionHead(t('rf7.output.sectionDeliver'), t('rf7.output.sectionDeliverSub')),
      h('div', { id: 'rf-deliverables' }, deliverList),
      RF.r7SectionHead(t('rf7.output.sectionChapters')),
      h(RF.ui.Card, null, chapters.length === 0
        ? h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.output.noChapters'))
        : chapters.map(chapter => h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('rf7.output.chapterTitle', {
              chapter: Number(chapter.id) || 1,
              title: chapter.title,
            })),
            h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.output.chapterMeta', {
              shots: chapter.shotCount ?? 0,
              duration: RF.formatDuration(chapter.durationSec ?? 0),
            })))))),
      // ── 屏间入口：背景音乐（画板 09 · 交付步；音乐库按章应用）──
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.output.actMusic'),
          variant: 'secondary',
          onClick: () => props.state.goFlow('music'),
        })));
  };

  // ══════════════════════════════════════════════════════════════
  // 12 运行日志（Log）
  // ══════════════════════════════════════════════════════════════

  RF.tabLog = function tabLog(props) {
    const t = props.t;
    const project = props.project ?? {};
    const changelog = project.changelog ?? {};
    const entries = Array.isArray(changelog.entries) ? changelog.entries : [];

    const changeList = entries.length === 0
      ? h(RF.ui.EmptyState, { title: t('rf7.log.empty.title'), hint: t('rf7.log.empty.hint') })
      : h(RF.ui.Card, null, entries.slice(0, 20).map(entry => h('div', { className: `${RF.CLS}-row` },
        h('span', { className: `${RF.CLS}-log__time` }, RF.formatDateTime(entry.at ?? '')),
        h('span', { className: `${RF.CLS}-row__main` }, String(entry.summary ?? '')),
        entry.drifted === true
          ? h(RF.ui.Pill, { label: t('rf7.log.drifted'), tone: 'warn' })
          : null)));

    const latest = entries[entries.length - 1] ?? null;

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7SectionHead(t('rf7.log.sectionChanges'), t('rf7.log.sectionChangesSub')),
      changeList,
      RF.r7SectionHead(t('rf7.log.sectionOutput')),
      RF.r7CodeBox(entries.slice(-6).reverse().map(entry => `[${RF.formatDateTime(entry.at ?? '')}] ${String(entry.summary ?? '')}`)),
      RF.r7SectionHead(t('rf7.log.sectionRollback')),
      h(RF.ui.Card, null,
        // 「按批次回滚」需要批次号、「按时间点回滚」需要可选时间点 ——
        // 投影里的变更日志**两者都没有** ⇒ 禁用 + 说清（不假装能做）。
        RF.r7KvRow(t('rf7.log.rollbackBatch'), '-', '', 'muted',
          h(RF.ui.Button, {
            label: t('rf7.log.actRollback'),
            variant: 'secondary',
            disabled: true,
            title: t('rf7.log.rollbackBatchDisabled'),
          })),
        RF.r7KvRow(t('rf7.log.rollbackTime'), '-', '', 'muted',
          h(RF.ui.Button, {
            label: t('rf7.log.actPick'),
            variant: 'secondary',
            disabled: true,
            title: t('rf7.log.rollbackTimeDisabled'),
          })),
        RF.r7KvRow(t('rf7.log.rollbackSingle'),
          latest === null ? '-' : String(latest.summary ?? ''),
          '', 'muted',
          h(RF.ui.Button, {
            label: t('rf7.log.actRollback'),
            variant: 'secondary',
            onClick: latest === null ? undefined : () => props.state.rollback(latest, 'single'),
          })),
        h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.log.rollbackNote'))));
  };
})(RF);
