/* ─────────────────────────────────────────────────────────────────────────────
 * 流程屏（RF7 画板索引 §八「流程屏」8 块）+ 两块规范板。
 *
 * 启动检查 01 · 服务配置 14 · 新建项目 02 · 项目设置 15
 * 生成执行 06 · 分镜详情 08 · 背景音乐 09 · 技能与工作流 13
 * 规范板：降级与失败 17 · 素材选择器 18
 *
 * 排版照 `design/_tools/build-rf7.mjs` 里对应的 `boardXxx()`。
 *
 * ## 数据纪律
 *
 * 1. **探测结果**走独立只读路由（`/api/reelforge.probe`），不进 wire view；
 * 2. **服务配置**走 `/api/reelforge.capabilities`（**只读**，插件没有写配置的通道）；
 * 3. 数据没有就**说清没有**（RF7 §6.7），不编内容。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 启动检查的检查行清单与状态桶**不在这里定义** —— 胶囊/底栏（`chrome.js`）
   * 要用同一份口径，否则两边的数字会对不上。
   * 统一放在共享层：`RF.PROBE_GATE_ROWS` / `RF.probeGateRows()` / `RF.probeGateSummary()`。
   *
   * 三条规矩（详见 `src/client/shared.js`）：
   * 1. 「ComfyUI-Kernel 版本」并进「ComfyUI 服务」行（同一份 `systemStats` 数据）；
   * 2. 「Agent 运行时」不是检查项 ⇒ 屏内单独一行说明，不计入「N 项检查」；
   * 3. 行清单随探测范围变（云端档不列本地专属行）。
   */

  // ══════════════════════════════════════════════════════════════
  // 01 启动检查（RunGate）—— 环境门，冷启动首屏
  // ══════════════════════════════════════════════════════════════

  RF.flowRunGate = function flowRunGate(props) {
    const t = props.t;
    const state = props.state;
    const view = state.probe?.view ?? null;
    const report = view?.report ?? null;
    const items = Array.isArray(report?.items) ? report.items : [];
    // ⚠️ 用 `||` 不用 `??`：投影里 `runPosition` 是**空字符串**而不是 undefined，
    // `??` 不会往下走 ⇒ 界面刚选的位置永远不亮（已提交的位置优先，没提交才用界面选择）。
    const position = String(props.project?.runPosition || state.pendingPosition || '');
    const probed = items.length > 0;
    const probeError = String(state.probe?.error ?? '');
    const loading = state.probe?.loading === true;
    // 这一份结果是**哪个位置**探出来的（宿主回传）。
    const probedPosition = String(view?.position ?? '');

    // 汇总口径 = **显示出来的检查行**（total = 行数）⇒ 「N 项检查 · X 通过 · …」
    // 永远加得起来；胶囊/底栏用的是同一个 `RF.probeGateSummary()`。
    const summary = RF.probeGateSummary(report);
    const rows = summary.rows.map(row => {
      const conf = RF.PROBE_GATE_BUCKETS[row.bucket] ?? RF.PROBE_GATE_BUCKETS.unset;
      const detail = row.detail === null
        ? ''
        : (row.detail.raw !== undefined ? row.detail.raw : t(row.detail.key, row.detail.params));
      const value = detail === '' ? row.message : `${row.message} · ${detail}`;
      return RF.r7KvRow(t(row.labelKey), value, t(conf.key), conf.tone);
    });

    const positionCard = (key, titleKey, subKey, facts, value) => h(RF.ui.Card, {
      state: position === value ? 'selected' : 'default',
      onClick: () => state.choosePosition(value),
    },
    h('div', { className: `${RF.CLS}-row` },
      RF.r7Radio(position === value),
      h('span', { className: `${RF.CLS}-row__title` }, t(titleKey))),
    h('div', { className: `${RF.CLS}-row__sub` }, t(subKey)),
    ...facts.map(fact => h('div', { className: `${RF.CLS}-row__sub` }, t(fact.key, fact.params))));

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('rf7.runGate.summaryTitle')),
            h('div', { className: `${RF.CLS}-row__sub` }, !probed
              ? t(loading ? 'rf7.runGate.probingMeta' : 'rf7.runGate.pendingMeta')
              : t('rf7.runGate.summaryMeta', {
                total: summary.total,
                passed: summary.passed,
                failed: summary.failed,
                warned: summary.warned,
                unconfigured: summary.unset,
              }))),
          h(RF.ui.Button, {
            label: probed ? t('rf7.runGate.actRerun') : t('rf7.runGate.actStart'),
            variant: 'secondary',
            // ⚠️ 没选执行位置就没有探测范围 ⇒ 按钮禁用并说清缺什么（不做死按钮）。
            disabled: !probed && position === '',
            title: !probed && position === '' ? t('rf7.runGate.pendingHint') : undefined,
            onClick: () => (probed ? state.reloadProbe() : state.startProbe()),
          })),
        RF.r7Track(probed && summary.total > 0 ? summary.passed / summary.total : 0)),
      RF.r7SectionHead(t('rf7.runGate.sectionPosition'), t('rf7.runGate.sectionPositionSub')),
      h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--two` },
        positionCard('local', 'rf7.runGate.localTitle', 'rf7.runGate.localSub', [
          { key: 'rf7.runGate.localFact1' },
          { key: 'rf7.runGate.localFact2' },
        ], 'local'),
        positionCard('cloud', 'rf7.runGate.cloudTitle', 'rf7.runGate.cloudSub', [
          { key: 'rf7.runGate.cloudFact1' },
          { key: 'rf7.runGate.cloudFact2' },
        ], 'cloud')),
      // 结果属于另一个执行位置 ⇒ 说清楚，别让用户以为这就是当前这份环境的结论。
      probed && probedPosition !== '' && position !== '' && probedPosition !== position
        ? RF.r7Notice(t('rf7.runGate.staleTitle'), t('rf7.runGate.staleHint'))
        : null,
      RF.r7SectionHead(t('rf7.runGate.sectionChecks'), probed ? undefined : t('rf7.runGate.pendingHint')),
      // ⚠️ **没探测过就不铺清单**：一行行「未配置」是编出来的内容（数据纪律 §3）。
      probed
        ? h(RF.ui.Card, null, ...rows)
        : h(RF.ui.Card, null, RF.r7Notice(
          probeError !== '' ? probeError : t('rf7.runGate.pendingTitle'),
          t('rf7.runGate.pendingHint'))),
      // 「Agent 运行时」是**宿主自带的事实**，不是检查项（没有探测项）⇒
      // 放在检查清单**外面**单独一行，不计入「N 项检查」。
      h(RF.ui.Card, null, RF.r7KvRow(
        t('rf7.runGate.checkAgent'),
        t('rf7.runGate.agentValue'),
        t('rf7.runGate.builtin'),
        'muted')),
      RF.r7Notice(t('rf7.runGate.noticeMain'), t('rf7.runGate.noticeSub')),
      // ── 屏间入口 ──
      // 「服务配置」与 RunGate 同源（IC SettingsPage.jsx）；「查看失败清单」是规范板
      // 「降级与失败」的入口。RF7 画板没画屏间入口，这里按画板语义补，待 owner 复核。
      h('div', { className: `${RF.CLS}-row` },
        h(RF.ui.Button, {
          label: t('rf7.runGate.actSettings'),
          variant: 'secondary',
          onClick: () => state.goFlow('settings'),
        }),
        h(RF.ui.Button, {
          label: t('rf7.runGate.actFailures'),
          variant: 'secondary',
          onClick: () => state.goFlow('degraded'),
        })));
  };

  // ══════════════════════════════════════════════════════════════
  // 14 服务配置（Settings）—— 只读屏
  // ══════════════════════════════════════════════════════════════

  RF.flowSettings = function flowSettings(props) {
    const t = props.t;
    const capabilities = props.state.capabilities ?? {};
    const comfy = String(capabilities.comfyBaseUrl ?? '');
    const budget = Number(capabilities.budgetLimitCny ?? 0);
    const stages = Array.isArray(capabilities.stages) ? capabilities.stages : [];

    const field = (labelKey, value, kind) => h('div', { className: `${RF.CLS}-field` },
      h('span', { className: `${RF.CLS}-field__label` }, t(labelKey)),
      RF.r7FieldBox(value === '' ? t('rf7.settings.unset') : value, kind));

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7SectionHead(t('rf7.settings.sectionComfy'), t('rf7.settings.sectionComfySub')),
      h(RF.ui.Card, null,
        field('rf7.settings.labelAddress', comfy, 'value'),
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('rf7.settings.actTest'),
            variant: 'secondary',
            onClick: () => props.state.reloadProbe(),
          }),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.settings.testHint')))),
      RF.r7SectionHead(t('rf7.settings.sectionLlm'), t('rf7.settings.sectionLlmSub')),
      h(RF.ui.Card, null,
        field('rf7.settings.labelBaseUrl', '', 'placeholder'),
        field('rf7.settings.labelModel', '', 'placeholder'),
        field('rf7.settings.labelApiKey', '', 'masked'),
        RF.r7Notice(t('rf7.settings.llmNotice'), t('rf7.settings.llmNoticeSub'))),
      RF.r7SectionHead(t('rf7.settings.sectionRuntime'), t('rf7.settings.sectionRuntimeSub')),
      h(RF.ui.Card, null,
        // 运行时切换 = 改插件配置 ⇒ 这一屏是只读的 ⇒ 芯片行禁用 + 说清。
        RF.r7ChipRow(
          [t('rf7.settings.runtimeBuiltin'), t('rf7.settings.runtimeClaudeCode'), t('rf7.settings.runtimeCodex'), t('rf7.settings.runtimeGemini'), t('rf7.settings.runtimeCustom')],
          0,
          undefined,
          t('rf7.settings.runtimeDisabled'))),
      RF.r7SectionHead(t('rf7.settings.sectionMaintenance')),
      h(RF.ui.Card, null,
        RF.r7KvRow(t('rf7.settings.rowFree'), t('rf7.settings.valueFree'), t('rf7.settings.stateAdjustable'), 'muted'),
        RF.r7KvRow(t('rf7.settings.rowTimeout'), t('rf7.settings.valueTimeout'), '', 'muted'),
        RF.r7KvRow(t('rf7.settings.rowCloudKey'), t('rf7.settings.valueCloudKey'), t('rf7.settings.stateNotLoggedIn'), 'warn')),
      RF.r7Notice(
        t('rf7.settings.readonlyTitle'),
        t('rf7.settings.readonlySub', { budget: RF.formatMoney(budget), stages: stages.length })));
  };

  // ══════════════════════════════════════════════════════════════
  // 02 新建项目（Intake）
  // ══════════════════════════════════════════════════════════════

  RF.flowIntake = function flowIntake(props) {
    const t = props.t;
    const state = props.state;
    const project = props.project ?? {};
    const intake = project.intake ?? {};
    const headings = Array.isArray(intake.headings) ? intake.headings : [];

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-field` },
          h('span', { className: `${RF.CLS}-field__label` }, t('rf7.intake.labelName')),
          h('input', {
            className: `${RF.CLS}-input`,
            value: state.projectName ?? '',
            placeholder: t('rf7.intake.namePlaceholder'),
            onChange: (event) => state.setProjectName(event?.target?.value ?? ''),
          })),
        h('span', { className: `${RF.CLS}-field__label` }, t('rf7.intake.labelStyle')),
        RF.r7ChipRow([
          t('rf7.intake.styleRealistic'),
          t('rf7.intake.styleAnime'),
          t('rf7.intake.styleComic'),
          t('rf7.intake.style3d'),
          t('rf7.intake.styleSuspense'),
        ], state.projectStyleIndex ?? 0, index => state.setProjectStyleIndex(index))),
      h(RF.ui.Card, null,
        h('textarea', {
          className: `${RF.CLS}-textarea ${RF.CLS}-input--focus`,
          value: state.novelText ?? '',
          placeholder: t('rf7.intake.textPlaceholder'),
          onChange: (event) => state.setNovelText(event?.target?.value ?? ''),
        }),
        h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.intake.textHint'))),
      h(RF.ui.Card, { className: `${RF.CLS}-settingsbar` },
        RF.r7Stat(t('rf7.intake.specResolution'), String(project.settings?.resolution ?? '') || t('rf7.settings.unset'), ''),
        h('div', { className: `${RF.CLS}-divider` }),
        RF.r7Stat(t('rf7.intake.specAspect'), String(project.settings?.aspectRatio ?? '') || t('rf7.settings.unset'), ''),
        h('div', { className: `${RF.CLS}-divider` }),
        RF.r7Stat(t('rf7.intake.specMusic'), project.settings?.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '')),
      RF.r7SectionHead(t('rf7.intake.sectionReferences'), t('rf7.intake.sectionReferencesSub')),
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          RF.r7Thumb(t('rf7.intake.refThumb'), { size: 48 }),
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('rf7.intake.refName')),
            h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.intake.refUse'))),
          // 移除参考图没有对应工具 ⇒ 禁用 + 说清。
          h(RF.ui.Button, {
            label: t('rf7.intake.actRemove'),
            variant: 'secondary',
            disabled: true,
            title: t('rf7.intake.actRemoveDisabled'),
          })),
        h('div', { className: `${RF.CLS}-dropzone` }, t('rf7.intake.actAddReference'))),
      RF.r7SectionHead(t('rf7.intake.sectionChapters'), t('rf7.intake.sectionChaptersSub', {
        count: headings.length,
        chars: Number(intake.chars ?? 0),
      })),
      h('div', { className: `${RF.CLS}-stack` }, headings.length === 0
        ? [h(RF.ui.EmptyState, { title: t('rf7.intake.noChapters'), hint: t('rf7.intake.noChaptersHint') })]
        : headings.slice(0, 4).map(heading => h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-row__sub` }, String(heading.seq ?? 0).padStart(2, '0')),
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, heading.title),
              h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.intake.chapterMeta'))),
            // 逐章导入：宿主只有「整本 import_novel」这一个导入工具，
            // 没有「只导入这一章」⇒ 禁用并指向底栏的「创建并打开」。
            h(RF.ui.Button, {
              label: t('rf7.intake.actImport'),
              variant: 'secondary',
              disabled: true,
              title: t('rf7.intake.actImportDisabled'),
            }))))),
      RF.r7ChatSync({ t, project }));
  };

  // ══════════════════════════════════════════════════════════════
  // 15 项目设置（ProjectSettings）—— 只读屏
  // ══════════════════════════════════════════════════════════════

  RF.flowProjectSettings = function flowProjectSettings(props) {
    const t = props.t;
    const settings = props.project?.settings ?? {};

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7SectionHead(t('rf7.projectSettings.sectionSpec')),
      h(RF.ui.Card, null, h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--two` },
        RF.r7Stat(t('rf7.projectSettings.rowResolution'), String(settings.resolution ?? '') || t('rf7.settings.unset'), ''),
        RF.r7Stat(t('rf7.projectSettings.rowAspect'), String(settings.aspectRatio ?? '') || t('rf7.settings.unset'), ''),
        RF.r7Stat(t('rf7.projectSettings.rowStyle'), t('rf7.projectSettings.styleDefault'), ''))),
      RF.r7SectionHead(t('rf7.projectSettings.sectionSubtitles')),
      h(RF.ui.Card, null,
        RF.r7KvRow(t('rf7.projectSettings.rowAutoSub'), settings.enableSubtitles === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted'),
        RF.r7KvRow(t('rf7.projectSettings.rowPosition'), t('rf7.projectSettings.bottomCenter'), '', 'muted'),
        RF.r7KvRow(t('rf7.projectSettings.rowHideName'), t('rf7.intake.on'), '', 'muted'),
        h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.projectSettings.subtitleNote'))),
      RF.r7SectionHead(t('rf7.projectSettings.sectionSound')),
      h(RF.ui.Card, null,
        RF.r7KvRow(t('rf7.projectSettings.rowBgm'), settings.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted'),
        RF.r7KvRow(t('rf7.projectSettings.rowVoice'), t('rf7.projectSettings.voiceH3'), '', 'muted')),
      RF.r7SectionHead(t('rf7.projectSettings.sectionDanger')),
      h(RF.ui.Card, { tone: 'error' },
        h('div', { className: `${RF.CLS}-notice__main` }, t('rf7.projectSettings.dangerText')),
        // 危险操作（删项目 / 清空）插件**没有对应工具** ⇒ 禁用 + 说清替代。
        h(RF.ui.Button, {
          label: t('rf7.projectSettings.dangerAction'),
          variant: 'danger',
          disabled: true,
          title: t('rf7.projectSettings.dangerDisabled'),
        })));
  };

  // ══════════════════════════════════════════════════════════════
  // 06 生成执行（Stages）
  // ══════════════════════════════════════════════════════════════

  RF.flowStages = function flowStages(props) {
    const t = props.t;
    const state = props.state;
    const project = props.project ?? {};
    const stageData = project.stages ?? {};
    const globalStages = Array.isArray(stageData.global) ? stageData.global : [];
    const kind = String(project.plan?.kind ?? '');

    const legend = [
      { key: 'rf7.stages.legendLlm', tone: 'ok' },
      { key: 'rf7.stages.legendImage', tone: 'accent' },
      { key: 'rf7.stages.legendTts', tone: 'muted' },
      { key: 'rf7.stages.legendVideo', tone: 'muted' },
    ];

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-segments` },
          RF.STAGES.map(stageId => h('span', {
            key: stageId,
            className: `${RF.CLS}-segment ${globalStages.includes(stageId)
              ? `${RF.CLS}-segment--on`
              : `${RF.CLS}-segment--off`}`,
          }))),
        h('div', { className: `${RF.CLS}-row` }, legend.map(item => h('span', {
          className: `${RF.CLS}-legend ${RF.CLS}-legend--${item.tone}`,
        }, t(item.key))))),
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('rf7.stages.currentTitle', { kind: kind === '' ? '-' : kind })),
            h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.stages.currentSub'))),
          h(RF.ui.Pill, { label: kind === '' ? t('rf7.stages.stateUnset') : kind, tone: kind === '' ? 'queued' : 'running' })),
        RF.r7Track(0.25),
        h('div', { className: `${RF.CLS}-row` },
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.stages.metaGpu')),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.stages.metaVram')),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.stages.metaEta')))),
      RF.r7SectionHead(t('rf7.stages.sectionQueue'), t('rf7.stages.sectionQueueSub')),
      h(RF.ui.Card, null,
        (state.queue ?? []).length === 0
          ? h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.stages.queueEmpty'))
          : state.queue.map(item => h('div', { className: `${RF.CLS}-row` },
            h('span', { className: `${RF.CLS}-shotstate__dot` }),
            h('span', { className: `${RF.CLS}-row__main` }, item.title),
            h('span', { className: `${RF.CLS}-row__sub` }, item.meta)))),
      RF.r7SectionHead(t('rf7.stages.sectionPicker')),
      h(RF.ui.Card, null, RF.STAGES.map(stageId => h('div', { className: `${RF.CLS}-row` },
        RF.r7Checkbox(globalStages.includes(stageId)),
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, t(`stages.${stageId}`)),
          h('div', { className: `${RF.CLS}-row__sub` }, t(`rf7.stages.desc.${stageId}`))),
        h('span', { className: `${RF.CLS}-row__sub` }, globalStages.includes(stageId)
          ? t('rf7.stages.stateEnabled')
          : t('rf7.stages.stateDisabled'))))),
      RF.r7Notice(t('rf7.stages.memMain'), t('rf7.stages.memSub')));
  };

  // ══════════════════════════════════════════════════════════════
  // 08 分镜详情（ShotDetail）
  // ══════════════════════════════════════════════════════════════

  RF.flowShotDetail = function flowShotDetail(props) {
    const t = props.t;
    // 口径与分镜列表一致：显式选中的那一镜，没选过就取第一镜（画板 07 永远有一镜高亮）。
    const shot = RF.currentShot(props.project, props.state.selectedShotId);

    if (shot === null) {
      return h('div', { className: `${RF.CLS}-stack` },
        h(RF.ui.EmptyState, {
          title: t('rf7.shotDetail.empty.title'),
          hint: t('rf7.shotDetail.empty.hint'),
          action: h(RF.ui.Button, {
            label: t('rf7.shotDetail.empty.action'),
            variant: 'primary',
            onClick: () => props.state.goTab('shots'),
          }),
        }));
    }

    const references = Array.isArray(shot.references) ? shot.references : [];

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__title` }, t('rf7.shotDetail.headTitle', {
          chapter: Number(shot.seq) || 1,
          idx: Number(shot.idx) || 1,
          label: shot.label,
        })),
        h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.shotDetail.meta', {
          duration: shot.duration ?? 0,
          ratio: shot.aspectRatio === '' ? '-' : shot.aspectRatio,
        }))),
      RF.r7SectionHead(t('rf7.shotDetail.sectionReferences'), t('rf7.shotDetail.sectionReferencesSub')),
      h(RF.ui.Card, null, h('div', { className: `${RF.CLS}-row` },
        references.length === 0
          ? h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.shotDetail.noReferences'))
          : references.map(reference => RF.r7Thumb(reference.label === '' ? reference.tag : reference.label, { size: 58 })),
        h('div', { style: { flex: '1 1 auto' } }),
        RF.r7PlayerBar(t('rf7.shotDetail.duration', { seconds: shot.duration ?? 0 })))),
      RF.r7SectionHead(t('rf7.shotDetail.sectionScript')),
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__title` }, t('rf7.shotDetail.scriptLens', { size: shot.shotSize === '' ? '-' : shot.shotSize })),
        h('div', { className: `${RF.CLS}-row__sub` }, t('rf7.shotDetail.scriptMissing'))),
      RF.r7SectionHead(t('rf7.shotDetail.sectionPrompt')),
      h(RF.ui.Card, { tone: 'warn' },
        h('div', { className: `${RF.CLS}-notice__main` }, t('rf7.shotDetail.promptMissing')),
        h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.shotDetail.promptMissingSub'))));
  };

  // ══════════════════════════════════════════════════════════════
  // 09 背景音乐（Music）
  // ══════════════════════════════════════════════════════════════

  RF.flowMusic = function flowMusic(props) {
    const t = props.t;
    const tracks = RF.musicAssets(props.project ?? {});

    // ⚠️ 这一屏的三个动作**都接不上**（能力缺口，不是界面 bug）：
    //   生成 —— 插件没有「生成音乐」的工具；
    //   预览 —— 投影里没有音频文件路径，没有可播的 URL；
    //   应用 —— `set_chapter_music` 要工作区相对路径，投影里没有。
    // ⇒ 一律禁用 + 说清缺什么、给什么替代（见屏内 notice）。

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__title` }, t('rf7.music.generateTitle')),
        RF.r7FieldBox(t('rf7.music.generatePlaceholder'), 'placeholder'),
        h('div', { className: `${RF.CLS}-row` },
          RF.r7ChipRow([
            t('rf7.music.chipInstrumental'),
            t('rf7.music.chipVocal'),
            t('rf7.music.chipPiano'),
            t('rf7.music.chipStrings'),
          ], 0, undefined, t('rf7.music.chipsDisabled')),
          h('div', { style: { flex: '1 1 auto' } }),
          h(RF.ui.Button, {
            label: t('rf7.music.actGenerate'),
            variant: 'primary',
            disabled: true,
            title: t('rf7.music.actGenerateDisabled'),
          }))),
      RF.r7SectionHead(t('rf7.music.sectionLibrary'), t('rf7.music.sectionLibrarySub')),
      tracks.length === 0
        ? h(RF.ui.Card, { tone: 'warn' },
          h('div', { className: `${RF.CLS}-notice__main` }, t('rf7.music.emptyTitle')),
          h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.music.emptySub')))
        : h('div', { className: `${RF.CLS}-stack` }, tracks.map(track => h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, track.name),
              h('div', { className: `${RF.CLS}-row__sub` }, track.description)),
            h(RF.ui.Pill, { label: t('rf7.music.stateApplied'), tone: 'done' })),
          RF.r7PlayerBar('-'),
          h('div', { className: `${RF.CLS}-row` },
            h(RF.ui.Button, {
              label: t('rf7.music.actPreview'),
              variant: 'secondary',
              disabled: true,
              title: t('rf7.music.actPreviewDisabled'),
            }),
            h(RF.ui.Button, {
              label: t('rf7.music.actApply'),
              variant: 'secondary',
              disabled: true,
              title: t('rf7.music.actApplyDisabled'),
            }))))),
      RF.r7Notice(t('rf7.music.note'), ''));
  };

  // ══════════════════════════════════════════════════════════════
  // 13 技能与工作流（Skills）—— 从旧版页签移过来的流程屏
  // ══════════════════════════════════════════════════════════════

  RF.flowSkills = function flowSkills(props) {
    const t = props.t;
    const skills = Array.isArray(props.project?.skills) ? props.project.skills : [];
    const analysis = props.project?.workflowAnalysis ?? null;

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7SectionHead(t('rf7.skills.sectionInstalled'), t('rf7.skills.sectionInstalledSub', {
        count: skills.length,
      })),
      h(RF.ui.Card, null, skills.length === 0
        ? h(RF.ui.EmptyState, { title: t('rf7.skills.empty.title'), hint: t('rf7.skills.empty.hint') })
        : skills.map(skill => h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, skill.name),
            h('div', { className: `${RF.CLS}-row__sub` }, t(`rf7.skills.source.${skill.source ?? 'bundled'}`))),
          h(RF.ui.Pill, { label: t('rf7.skills.stateReady'), tone: 'done' })))),
      RF.r7SectionHead(t('rf7.skills.sectionIterate'), t('rf7.skills.sectionIterateSub')),
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('span', { className: `${RF.CLS}-stepnum` }, '1'),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.skills.step1'))),
        h('div', { className: `${RF.CLS}-row` },
          h('span', { className: `${RF.CLS}-stepnum` }, '2'),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.skills.step2'))),
        h('div', { className: `${RF.CLS}-dropzone` }, t('rf7.skills.dropHint')),
        analysis === null
          // 分析工作流：宿主没有暴露「分析工作流文件」的工具 ⇒ 禁用 + 说清替代。
          ? h(RF.ui.Button, {
            label: t('rf7.skills.actAnalyze'),
            variant: 'primary',
            disabled: true,
            title: t('rf7.skills.actAnalyzeDisabled'),
          })
          : RF.r7Notice(String(analysis.summary ?? t('rf7.skills.analyzed')), '')),
      RF.r7Notice(t('rf7.skills.note'), ''));
  };

  // ══════════════════════════════════════════════════════════════
  // 18 素材选择器（Picker）—— 规范板
  // ══════════════════════════════════════════════════════════════

  RF.flowPicker = function flowPicker(props) {
    const t = props.t;
    const state = props.state;
    const all = RF.assetsByCategory(props.project ?? {}, 'all');
    const category = String(state.assetCategory ?? 'all');
    const assets = category === 'all' ? all : all.filter(asset => String(asset?.category ?? '') === category);
    const picked = Array.isArray(state.pickerSelection) ? state.pickerSelection : [];
    const limit = RF.REFERENCE_LIMITS.images;

    // 分类芯片（RF7 板 18）：全部 / 角色 / 场景 / 道具 / 服装。
    const chipItems = [
      { id: 'all', key: 'rf7.picker.chipAll' },
      { id: 'character', key: 'rf7.picker.chipCharacter' },
      { id: 'scene', key: 'rf7.picker.chipScene' },
      { id: 'prop', key: 'rf7.picker.chipProp' },
      { id: 'costume', key: 'rf7.picker.chipCostume' },
    ];
    const activeIndex = Math.max(0, chipItems.findIndex(item => item.id === category));

    const grid = [];
    for (let index = 0; index < assets.length; index += 3) {
      const slice = assets.slice(index, index + 3);
      grid.push(h('div', { className: `${RF.CLS}-grid ${RF.CLS}-grid--three` },
        slice.map(asset => h('button', {
          key: String(asset.id),
          type: 'button',
          className: `${RF.CLS}-pickeritem${picked.includes(String(asset.id)) ? ` ${RF.CLS}-pickeritem--on` : ''}`,
          onClick: () => state.togglePicker(String(asset.id)),
        }, RF.r7Thumb(asset.name, { size: 76, picked: picked.includes(String(asset.id)) })))));
    }

    return h('div', { className: `${RF.CLS}-stack` },
      h(RF.ui.Card, null,
        RF.r7FieldBox(t('rf7.picker.searchPlaceholder'), 'placeholder'),
        RF.r7ChipRow(
          chipItems.map(item => t(item.key)),
          activeIndex,
          index => state.setAssetCategory(chipItems[index]?.id ?? 'all')),
        ...grid,
        h('div', { className: `${RF.CLS}-row` },
          picked.map(id => RF.r7Thumb(t('rf7.picker.pickedThumb'), { size: 40, picked: true })),
          h('span', { className: `${RF.CLS}-row__sub` }, t('rf7.picker.pickedCount', {
            count: picked.length,
            limit,
          })),
          h('div', { style: { flex: '1 1 auto' } }),
          h(RF.ui.Button, {
            label: t('rf7.picker.actClear'),
            variant: 'secondary',
            onClick: () => state.clearPicker(),
          }))),
      RF.r7Notice(t('rf7.picker.note'), ''));
  };

  // ══════════════════════════════════════════════════════════════
  // 17 降级与失败（Degraded）—— 规范板：五态分开说清代价与替代
  // ══════════════════════════════════════════════════════════════

  RF.flowDegraded = function flowDegraded(props) {
    const t = props.t;
    const state = props.state;
    const project = props.project ?? {};
    const view = state.probe?.view ?? null;
    const degradations = Array.isArray(view?.degrade?.degradations) ? view.degrade.degradations : [];
    const notices = Array.isArray(view?.degrade?.notices) ? view.degrade.notices : [];
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    // 缺料 / 软降级：**实算**，不许写死数字（写死 = 面板在骗人）。
    const missing = RF.shotsMissingReferences(project);
    const noVoice = RF.charactersWithoutVoice(project);

    const stateCard = (titleKey, metaKey, tone) => h(RF.ui.Card, { tone },
      h('div', { className: `${RF.CLS}-notice__main` }, t(titleKey)),
      h('div', { className: `${RF.CLS}-notice__sub` }, t(metaKey)));

    const missingShots = missing
      .map(shot => String(Number(shot.idx) || 0).padStart(2, '0'))
      .join(' / ');

    return h('div', { className: `${RF.CLS}-stack` },
      RF.r7SectionHead(t('rf7.degraded.sectionBlocked'), t('rf7.degraded.sectionBlockedSub')),
      degradations.length === 0
        ? stateCard('rf7.degraded.noneTitle', 'rf7.degraded.noneSub', 'warn-border')
        : degradations.map(item => h(RF.ui.Card, { tone: 'error' },
          h('div', { className: `${RF.CLS}-notice__main` }, String(item.message ?? item.kind ?? '')),
          h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.degraded.blockedHint')))),
      RF.r7SectionHead(t('rf7.degraded.sectionWarning'), t('rf7.degraded.sectionWarningSub')),
      notices.length === 0
        ? stateCard('rf7.degraded.noWarningTitle', 'rf7.degraded.noWarningSub', 'warn-border')
        : notices.map(item => h(RF.ui.Card, { tone: 'warn' },
          h('div', { className: `${RF.CLS}-notice__main` }, String(item.message ?? item.kind ?? '')),
          h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.degraded.warningHint')))),
      // 缺料（画板 17 第三段）：缺的东西要点名。
      RF.r7SectionHead(t('rf7.degraded.sectionMissing'), t('rf7.degraded.sectionMissingSub')),
      missing.length === 0
        ? stateCard('rf7.degraded.noMissingTitle', 'rf7.degraded.noMissingSub', 'warn-border')
        : h(RF.ui.Card, { tone: 'warn' },
          h('div', { className: `${RF.CLS}-notice__main` }, t('rf7.degraded.missingTitle', { count: missing.length })),
          h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.degraded.missingSub', { shots: missingShots })),
          h(RF.ui.Button, {
            label: t('rf7.degraded.actFill'),
            variant: 'secondary',
            onClick: () => state.goTab('assets'),
          })),
      // 空态（画板 17 第四段）：**只有真的还没开始时**才说「没有章节」。
      chapters.length === 0
        ? h('div', { className: `${RF.CLS}-stack` },
          RF.r7SectionHead(t('rf7.degraded.sectionEmpty'), t('rf7.degraded.sectionEmptySub')),
          stateCard('rf7.degraded.emptyTitle', 'rf7.degraded.emptySub', 'warn-border'))
        : null,
      // 软降级（画板 17 第五张卡）：仍可跑，但要说清少什么。
      noVoice.length === 0
        ? null
        : h(RF.ui.Card, { tone: 'warn' },
          h('div', { className: `${RF.CLS}-notice__main` }, t('rf7.degraded.softTitle', { count: noVoice.length })),
          h('div', { className: `${RF.CLS}-notice__sub` }, t('rf7.degraded.softSub'))));
  };
})(RF);
