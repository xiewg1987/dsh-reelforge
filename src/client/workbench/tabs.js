/* ─────────────────────────────────────────────────────────────────────────────
 * 7 个页签（Tab **内部**的二级分区，segmented control —— 不是开 7 个宿主 Tab）。
 *
 * 每页都有空态，文案说清「为什么空 + 下一步做什么」。
 * 业务数据只从宿主投影读（R1）；组件里的 `useState` 只放交互态。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 空态（统一口径：说清为什么空 + 下一步做什么）。
   * @param {{ t: function, key: string }} props - 属性。
   * @returns {object} React 元素。
   */
  function emptyOf(props) {
    return h(RF.ui.EmptyState, {
      title: props.t(`empty.${props.key}`),
      hint: props.t('empty.hint'),
    });
  }

  /**
   * 章节页：章节列表 + 每章四阶段勾选 + 依赖提示。
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabChapters = function tabChapters(props) {
    const chapters = Array.isArray(props.project.chapters) ? props.project.chapters : [];
    if (chapters.length === 0) return emptyOf({ t: props.t, key: 'chapters' });
    return h('div', null,
      h(RF.ui.SectionLabel, null, props.t('tab.chapters')),
      chapters.map(chapter => h(RF.ui.Card, { key: chapter.id ?? chapter.title, state: 'default' },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} ${props.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
          h(RF.ui.Pill, { label: RF.labelOf('chapter.status', chapter.status, props.t), tone: chapter.status ?? 'queued' })),
        h('div', { className: `${RF.CLS}-row` }, RF.STAGES.map(stage => h(RF.ui.Pill, {
          key: stage,
          label: props.t(`stages.${stage}`),
          tone: (chapter.stages ?? []).includes(stage) ? 'done' : 'queued',
        }))))),
      h('div', { className: `${RF.CLS}-note` }, props.t('hardDependency')),
      h('div', { className: `${RF.CLS}-note` }, props.t('softDependency')),
      h('div', { className: `${RF.CLS}-note` }, props.t('chapter.unit')));
  };

  /**
   * 分镜页：逐镜卡片 + 选中镜详情（时长量化三选一 / 参考标签 / 装配顺序）。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabShots = function tabShots(props) {
    const shots = Array.isArray(props.project.shots) ? props.project.shots : [];
    if (shots.length === 0) return emptyOf({ t: props.t, key: 'shots' });
    const selected = shots.find(shot => shot.id === props.state.selectedShotId) ?? shots[0];
    const quantize = Array.isArray(selected.quantized) ? selected.quantized : [];
    return h('div', null,
      h(RF.ui.SectionLabel, null, props.t('tab.shots')),
      shots.map(shot => h(RF.ui.Card, {
        key: shot.id,
        state: shot.id === selected.id ? 'selected' : 'default',
        onClick: () => props.state.selectShot(shot.id),
      },
        h('div', { className: `${RF.CLS}-row__title` }, shot.label ?? shot.id),
        h('div', { className: `${RF.CLS}-row__sub` }, `${shot.shotSize ?? ''} · ${RF.formatDuration(shot.duration ?? 0)} · ${shot.aspectRatio ?? ''}`))),
      h(RF.ui.SectionLabel, null, props.t('shots.quantize')),
      h('div', { className: `${RF.CLS}-row` }, quantize.map(value => h(RF.ui.Button, {
        key: value,
        label: RF.formatDuration(value),
        variant: value === selected.duration ? 'primary' : 'secondary',
        onClick: () => props.state.setDuration(value),
      }))),
      h(RF.ui.SectionLabel, null, props.t('shots.refs')),
      h('div', null, (selected.references ?? []).map(reference => h(RF.ui.MetaRow, {
        key: reference.tag,
        label: reference.tag,
        value: reference.label,
      }))),
      h('div', { className: `${RF.CLS}-note` }, props.t('shots.assembly')));
  };

  /**
   * 资产页：10 类筛选 + 网格 + 变体挂载说明。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabAssets = function tabAssets(props) {
    const assets = Array.isArray(props.project.assets) ? props.project.assets : [];
    const filter = props.state.assetCategory;
    const visible = filter === 'all' ? assets : assets.filter(asset => asset.category === filter);
    const grid = assets.length === 0
      ? emptyOf({ t: props.t, key: 'assets' })
      : h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        visible.map(asset => h(RF.ui.Card, { key: asset.id },
          h('div', { className: `${RF.CLS}-row__title` }, asset.name ?? ''),
          h('div', { className: `${RF.CLS}-row__sub` }, asset.description ?? ''),
          asset.parent_id === undefined ? null : h(RF.ui.Pill, { label: asset.parent_id, tone: 'running' }))));
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, ['all'].concat(RF.ASSET_CATEGORIES).map(category => h('button', {
        key: category,
        type: 'button',
        className: `${RF.CLS}-tabs__item${category === filter ? ` ${RF.CLS}-tabs__item--active` : ''}`,
        onClick: () => props.state.setAssetCategory(category),
      }, category === 'all' ? props.t('tab.assets') : RF.labelOf('asset.category', category, props.t)))),
      grid,
      h('div', { className: `${RF.CLS}-note` }, props.t('assets.variants')),
      h('div', { className: `${RF.CLS}-note` }, props.t('assets.priority')));
  };

  /**
   * 上下文页：三栏 bible / style / continuity，**写入语义不同**。
   * @param {{ t: function, project: object }} props - 属性。
   * @returns {object} React 元素。
   */
  /**
   * 工作流解析结果 + diagnostics（§8.3 · T5 A27）。
   * @param {{ t: function, analysis: object | null }} props
   * @returns {object | null}
   */
  RF.renderWorkflowAnalysis = function renderWorkflowAnalysis(props) {
    const analysis = props.analysis;
    if (analysis === null || analysis === undefined || typeof analysis !== 'object') return null;
    const diag = analysis.diagnostics ?? {};
    const rows = [
      ['loaders', diag.loaders],
      ['modelLoaders', diag.modelLoaders],
      ['saves', diag.saves],
      ['samplers', diag.samplers],
      ['sizeNodes', diag.sizeNodes],
      ['textCandidates', diag.textCandidates],
    ];
    return h(RF.ui.Card, null,
      h(RF.ui.SectionLabel, null, props.t('workflow.diagnostics')),
      h('div', { className: `${RF.CLS}-row__title` }, `${analysis.kind ?? ''} · ${analysis.name ?? analysis.id ?? ''}`),
      h('div', { className: `${RF.CLS}-row__sub` }, analysis.sourceFile ?? ''),
      rows.map(([key, entries]) => h(RF.ui.MetaRow, {
        key,
        label: props.t(`workflow.${key}`),
        value: String(Array.isArray(entries) ? entries.length : 0),
      })),
      h(RF.ui.MetaRow, {
        label: props.t('workflow.hasVideoFields'),
        value: diag.hasVideoFields ? 'true' : 'false',
      }),
      Array.isArray(analysis.outputs) && analysis.outputs.length
        ? h('div', { className: `${RF.CLS}-note` }, analysis.outputs.join(' · '))
        : null);
  };

  RF.tabContext = function tabContext(props) {
    const context = props.project.context ?? {};
    const keys = RF.CONTEXT_KEYS;
    const empty = keys.every(key => String(context[key] ?? '').trim() === '');
    const workflowBlock = RF.renderWorkflowAnalysis({
      t: props.t,
      analysis: props.project.workflowAnalysis,
    });
    return h('div', null,
      workflowBlock,
      empty && workflowBlock === null ? emptyOf({ t: props.t, key: 'context' }) : null,
      keys.map(key => h(RF.ui.Card, { key },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, RF.labelOf('context.section', key, props.t)),
            h('div', { className: `${RF.CLS}-row__sub` }, String(context[key] ?? '').slice(0, 240))),
          h(RF.ui.Pill, {
            label: props.t(RF.CONTEXT_WRITE_MODE[key] === 'append' ? 'context.append' : 'context.overwrite'),
            tone: RF.CONTEXT_WRITE_MODE[key] === 'append' ? 'running' : 'queued',
          })))),
      h('div', { className: `${RF.CLS}-note` }, props.t('context.keys')));
  };

  /**
   * 技能页：来源筛选 + 列表 + 正文预览 + 参考文件索引。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabSkills = function tabSkills(props) {
    const skills = Array.isArray(props.project.skills) ? props.project.skills : [];
    const source = props.state.skillSource;
    const visible = source === 'all' ? skills : skills.filter(skill => skill.source === source);
    const selected = skills.find(skill => skill.name === props.state.selectedSkillName);
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, ['all'].concat(RF.SKILL_SOURCES).map(item => h('button', {
        key: item,
        type: 'button',
        className: `${RF.CLS}-tabs__item${item === source ? ` ${RF.CLS}-tabs__item--active` : ''}`,
        onClick: () => props.state.setSkillSource(item),
      }, item === 'all' ? props.t('tab.skills') : props.t(`skills.${item}`)))),
      skills.length === 0 ? emptyOf({ t: props.t, key: 'skills' }) : visible.map(skill => h(RF.ui.Card, {
        key: skill.name,
        state: skill.name === props.state.selectedSkillName ? 'selected' : 'default',
        onClick: () => props.state.selectSkill(skill.name),
      },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, skill.name ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, skill.description ?? '')),
          h(RF.ui.Pill, { label: props.t(`skills.${skill.source ?? 'bundled'}`), tone: 'running' })),
        String(skill.description ?? '').trim() === ''
          ? h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, props.t('skills.emptyDescription'))
          : null)),
      selected === undefined ? null : h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, `${props.t('tab.skills')} · ${selected.name}`),
        h('div', { className: `${RF.CLS}-row__sub` }, String(selected.body ?? '').slice(0, 400)),
        (selected.references ?? []).map(reference => h(RF.ui.MetaRow, { key: reference.name, label: reference.name, value: reference.preview ?? '' }))),
      h('div', { className: `${RF.CLS}-note` }, props.t('skills.notDistributed')));
  };

  /**
   * 成片页：播放器（章节刻度 / 倍速 / 字幕音轨开关）+ 交付物下载。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabOutput = function tabOutput(props) {
    const deliverables = Array.isArray(props.project.deliverables) ? props.project.deliverables : [];
    if (deliverables.length === 0) return emptyOf({ t: props.t, key: 'output' });
    const primaryVideo = deliverables.find(item => item.kind === 'video_clean' || item.kind === 'video_subtitled' || (typeof item.path === 'string' && item.path.endsWith('.mp4')));
    const videoSrc = primaryVideo?.path ? RF.deliverableUrl(primaryVideo.path) : '';
    return h('div', null,
      h('div', { className: `${RF.CLS}-player` },
        videoSrc === ''
          ? h('div', { className: `${RF.CLS}-player__frame` })
          : h('video', {
            className: `${RF.CLS}-player__frame ${RF.CLS}-player__video`,
            controls: true,
            preload: 'metadata',
            src: videoSrc,
          }),
        h('div', { className: `${RF.CLS}-player__side` },
          h(RF.ui.SectionLabel, null, props.t('output.chapters')),
          (props.project.chapters ?? []).map(chapter => h(RF.ui.Progress, {
            key: chapter.id,
            value: chapter.progress ?? 0,
            tone: chapter.progress >= 1 ? 'done' : 'running',
            label: chapter.title,
          })),
          h('div', { className: `${RF.CLS}-row__sub` }, props.t('output.speed', { rate: props.state.speed })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.subtitles')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.subtitles ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.subtitles ? 'true' : 'false',
              onClick: () => props.state.toggle('subtitles'),
            })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.voice')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.voice ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.voice ? 'true' : 'false',
              onClick: () => props.state.toggle('voice'),
            })),
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, props.t('output.bgm')),
            h('button', {
              type: 'button',
              className: `rf-switch${props.state.bgm ? ' rf-switch--on' : ''}`,
              role: 'switch',
              'aria-checked': props.state.bgm ? 'true' : 'false',
              onClick: () => props.state.toggle('bgm'),
            })))),
      h(RF.ui.SectionLabel, null, props.t('tab.output')),
      // 交付物清单带锚点：底栏「交付物」按钮滚到这里（设计稿 10 号板的主按钮）。
      h('div', { id: 'rf-deliverables' },
        deliverables.map(item => h(RF.ui.Card, { key: `${item.chapterId ?? ''}-${item.kind}` },
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, item.label ?? item.kind),
              h('div', { className: `${RF.CLS}-row__sub` }, RF.formatBytes(item.bytes ?? 0))),
            item.path
              ? h('a', {
                className: `${RF.CLS}-btn ${RF.CLS}-btn--secondary`,
                href: RF.deliverableUrl(item.path),
                download: item.label ?? item.kind,
              }, props.t('common.download'))
              : h(RF.ui.Button, { label: props.t('common.download'), variant: 'secondary' }))))),
      h('div', { className: `${RF.CLS}-note` }, props.t('deliver.binaryKept')));
  };

  /**
   * 日志页：变更日志 + 三级回滚 + 漂移保护。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.tabLog = function tabLog(props) {
    const changelog = props.project.changelog ?? { entries: [], modes: ['single', 'batch', 'timepoint'] };
    const entries = Array.isArray(changelog.entries) ? changelog.entries : [];
    const modes = Array.isArray(changelog.modes) ? changelog.modes : ['single', 'batch', 'timepoint'];
    if (entries.length === 0) return emptyOf({ t: props.t, key: 'log' });
    const drifted = entries.find(entry => entry.drifted === true);
    return h('div', null,
      h('div', { className: `${RF.CLS}-row` }, modes.map(mode => h(RF.ui.Button, {
        key: mode,
        label: props.t(`log.${mode}`),
        variant: mode === props.state.rollbackMode ? 'primary' : 'secondary',
        onClick: () => props.state.setRollbackMode(mode),
      }))),
      entries.map(entry => h(RF.ui.Card, { key: entry.id },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__sub` }, entry.at ?? ''),
            h('div', { className: `${RF.CLS}-row__title` }, entry.summary ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, entry.field ?? '')),
          h(RF.ui.Button, {
            label: props.t('common.rollback'),
            variant: 'secondary',
            onClick: () => props.state.rollback(entry),
          })))),
      drifted === undefined ? null : h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, props.t('log.drifted')),
        h(RF.ui.Button, { label: props.t('log.force'), variant: 'danger', onClick: () => props.state.rollback(drifted, true) })),
      h('div', { className: `${RF.CLS}-note` }, props.t('deliver.binaryKept')));
  };
})(RF);
