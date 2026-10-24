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
      return RF.ui.KvRow(t(row.labelKey), value, t(conf.key), conf.tone);
    });

    const positionRadioName = 'reelforge-run-position';

    const positionCard = (cardKey, titleKey, subKey, facts, value) => (
      <label key={cardKey} className={RF.tw.positionCard}>
        <RF.ui.Card state={position === value ? 'selected' : 'default'}>
          <div className={RF.tw.row}>
            <RF.ui.RadioInput
              name={positionRadioName}
              value={value}
              checked={position === value}
              onChange={() => state.choosePosition(value)}
            />
            <span className={RF.tw.rowTitle}>{t(titleKey)}</span>
          </div>
          <div className={RF.tw.rowSub}>{t(subKey)}</div>
          {facts.map(fact => (
            <div key={fact.key} className={RF.tw.rowSub}>{t(fact.key, fact.params)}</div>
          ))}
        </RF.ui.Card>
      </label>
    );

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          <div className={RF.tw.row}>
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>{t('rf7.runGate.summaryTitle')}</div>
              <div className={RF.tw.rowSub}>
                {!probed
                  ? t(loading ? 'rf7.runGate.probingMeta' : 'rf7.runGate.pendingMeta')
                  : t('rf7.runGate.summaryMeta', {
                    total: summary.total,
                    passed: summary.passed,
                    failed: summary.failed,
                    warned: summary.warned,
                    unconfigured: summary.unset,
                  })}
              </div>
            </div>
            <RF.ui.Button
              label={probed ? t('rf7.runGate.actRerun') : t('rf7.runGate.actStart')}
              variant="secondary"
              disabled={!probed && position === ''}
              title={!probed && position === '' ? t('rf7.runGate.pendingHint') : undefined}
              onClick={() => (probed ? state.reloadProbe() : state.startProbe())}
            />
          </div>
          {RF.ui.Track(probed && summary.total > 0 ? summary.passed / summary.total : 0)}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.runGate.sectionPosition'), t('rf7.runGate.sectionPositionSub'))}
        <div
          className={RF.tw.gridTwo}
          role="radiogroup"
          aria-label={t('rf7.runGate.sectionPosition')}
        >
          {positionCard('local', 'rf7.runGate.localTitle', 'rf7.runGate.localSub', [
            { key: 'rf7.runGate.localFact1' },
            { key: 'rf7.runGate.localFact2' },
          ], 'local')}
          {positionCard('cloud', 'rf7.runGate.cloudTitle', 'rf7.runGate.cloudSub', [
            { key: 'rf7.runGate.cloudFact1' },
            { key: 'rf7.runGate.cloudFact2' },
          ], 'cloud')}
        </div>
        {probed && probedPosition !== '' && position !== '' && probedPosition !== position
          ? RF.ui.Notice(t('rf7.runGate.staleTitle'), t('rf7.runGate.staleHint'))
          : null}
        {RF.ui.SectionHead(t('rf7.runGate.sectionChecks'), probed ? undefined : t('rf7.runGate.pendingHint'))}
        {probed
          ? (
            <RF.ui.Card>{rows}</RF.ui.Card>
          )
          : (
            <RF.ui.Card>
              {RF.ui.Notice(
                probeError !== '' ? probeError : t('rf7.runGate.pendingTitle'),
                t('rf7.runGate.pendingHint'),
              )}
            </RF.ui.Card>
          )}
        <RF.ui.Card>
          {RF.ui.KvRow(
            t('rf7.runGate.checkAgent'),
            t('rf7.runGate.agentValue'),
            t('rf7.runGate.builtin'),
            'muted',
          )}
        </RF.ui.Card>
        {RF.ui.Notice(t('rf7.runGate.noticeMain'), t('rf7.runGate.noticeSub'))}
        <div className={RF.tw.row}>
          <RF.ui.Button
            label={t('rf7.runGate.actSettings')}
            variant="secondary"
            onClick={() => state.goFlow('settings')}
          />
          <RF.ui.Button
            label={t('rf7.runGate.actFailures')}
            variant="secondary"
            onClick={() => state.goFlow('degraded')}
          />
        </div>
      </div>
    );
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

    const field = (labelKey, value, kind) => (
      <div key={labelKey} className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground">{t(labelKey)}</span>
        {RF.ui.FieldBox(value === '' ? t('rf7.settings.unset') : value, kind)}
      </div>
    );

    return (
      <div className={RF.tw.stack}>
        {RF.ui.SectionHead(t('rf7.settings.sectionComfy'), t('rf7.settings.sectionComfySub'))}
        <RF.ui.Card>
          {field('rf7.settings.labelAddress', comfy, 'value')}
          <div className={RF.tw.row}>
            <RF.ui.Button
              label={t('rf7.settings.actTest')}
              variant="secondary"
              onClick={() => props.state.reloadProbe()}
            />
            <span className={RF.tw.rowSub}>{t('rf7.settings.testHint')}</span>
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.settings.sectionLlm'), t('rf7.settings.sectionLlmSub'))}
        <RF.ui.Card>
          {field('rf7.settings.labelBaseUrl', '', 'placeholder')}
          {field('rf7.settings.labelModel', '', 'placeholder')}
          {field('rf7.settings.labelApiKey', '', 'masked')}
          {RF.ui.Notice(t('rf7.settings.llmNotice'), t('rf7.settings.llmNoticeSub'))}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.settings.sectionRuntime'), t('rf7.settings.sectionRuntimeSub'))}
        <RF.ui.Card>
          {RF.ui.ChipRow(
            [t('rf7.settings.runtimeBuiltin'), t('rf7.settings.runtimeClaudeCode'), t('rf7.settings.runtimeCodex'), t('rf7.settings.runtimeGemini'), t('rf7.settings.runtimeCustom')],
            0,
            undefined,
            t('rf7.settings.runtimeDisabled'),
          )}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.settings.sectionMaintenance'))}
        <RF.ui.Card>
          {RF.ui.KvRow(t('rf7.settings.rowFree'), t('rf7.settings.valueFree'), t('rf7.settings.stateAdjustable'), 'muted')}
          {RF.ui.KvRow(t('rf7.settings.rowTimeout'), t('rf7.settings.valueTimeout'), '', 'muted')}
          {RF.ui.KvRow(t('rf7.settings.rowCloudKey'), t('rf7.settings.valueCloudKey'), t('rf7.settings.stateNotLoggedIn'), 'warn')}
        </RF.ui.Card>
        {RF.ui.Notice(
          t('rf7.settings.readonlyTitle'),
          t('rf7.settings.readonlySub', { budget: RF.formatMoney(budget), stages: stages.length }),
        )}
      </div>
    );
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

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">{t('rf7.intake.labelName')}</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-secondary px-3 py-1 text-xs text-foreground"
              value={state.projectName ?? ''}
              placeholder={t('rf7.intake.namePlaceholder')}
              onChange={(event) => state.setProjectName(event?.target?.value ?? '')}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{t('rf7.intake.labelStyle')}</span>
          {RF.ui.ChipRow([
            t('rf7.intake.styleRealistic'),
            t('rf7.intake.styleAnime'),
            t('rf7.intake.styleComic'),
            t('rf7.intake.style3d'),
            t('rf7.intake.styleSuspense'),
          ], state.projectStyleIndex ?? 0, index => state.setProjectStyleIndex(index))}
        </RF.ui.Card>
        <RF.ui.Card>
          <textarea
            className={RF.tw.textarea}
            value={state.novelText ?? ''}
            placeholder={t('rf7.intake.textPlaceholder')}
            onChange={(event) => state.setNovelText(event?.target?.value ?? '')}
          />
          <div className={RF.tw.rowSub}>{t('rf7.intake.textHint')}</div>
        </RF.ui.Card>
        <RF.ui.Card className={RF.tw.hubstrip}>
          {RF.ui.Stat(t('rf7.intake.specResolution'), String(project.settings?.resolution ?? '') || t('rf7.settings.unset'), '')}
          <div className={RF.tw.divider} />
          {RF.ui.Stat(t('rf7.intake.specAspect'), String(project.settings?.aspectRatio ?? '') || t('rf7.settings.unset'), '')}
          <div className={RF.tw.divider} />
          {RF.ui.Stat(t('rf7.intake.specMusic'), project.settings?.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '')}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.intake.sectionReferences'), t('rf7.intake.sectionReferencesSub'))}
        <RF.ui.Card>
          <div className={RF.tw.row}>
            {RF.ui.Thumb(t('rf7.intake.refThumb'), { size: 48 })}
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>{t('rf7.intake.refName')}</div>
              <div className={RF.tw.rowSub}>{t('rf7.intake.refUse')}</div>
            </div>
            <RF.ui.Button
              label={t('rf7.intake.actRemove')}
              variant="secondary"
              disabled
              title={t('rf7.intake.actRemoveDisabled')}
            />
          </div>
          <div className={`flex min-h-10 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground`}>{t('rf7.intake.actAddReference')}</div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.intake.sectionChapters'), t('rf7.intake.sectionChaptersSub', {
          count: headings.length,
          chars: Number(intake.chars ?? 0),
        }))}
        <div className={RF.tw.stack}>
          {headings.length === 0
            ? (
              <RF.ui.EmptyState title={t('rf7.intake.noChapters')} hint={t('rf7.intake.noChaptersHint')} />
            )
            : headings.slice(0, 4).map(heading => (
              <RF.ui.Card key={heading.seq ?? heading.title}>
                <div className={RF.tw.row}>
                  <span className={RF.tw.rowSub}>{String(heading.seq ?? 0).padStart(2, '0')}</span>
                  <div className={RF.tw.rowMain}>
                    <div className={RF.tw.rowTitle}>{heading.title}</div>
                    <div className={RF.tw.rowSub}>{t('rf7.intake.chapterMeta')}</div>
                  </div>
                  <RF.ui.Button
                    label={t('rf7.intake.actImport')}
                    variant="secondary"
                    disabled
                    title={t('rf7.intake.actImportDisabled')}
                  />
                </div>
              </RF.ui.Card>
            ))}
        </div>
        {RF.ui.ChatSync({ t, project })}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 15 项目设置（ProjectSettings）—— 只读屏
  // ══════════════════════════════════════════════════════════════

  RF.flowProjectSettings = function flowProjectSettings(props) {
    const t = props.t;
    const settings = props.project?.settings ?? {};

    return (
      <div className={RF.tw.stack}>
        {RF.ui.SectionHead(t('rf7.projectSettings.sectionSpec'))}
        <RF.ui.Card>
          <div className={RF.tw.gridTwo}>
            {RF.ui.Stat(t('rf7.projectSettings.rowResolution'), String(settings.resolution ?? '') || t('rf7.settings.unset'), '')}
            {RF.ui.Stat(t('rf7.projectSettings.rowAspect'), String(settings.aspectRatio ?? '') || t('rf7.settings.unset'), '')}
            {RF.ui.Stat(t('rf7.projectSettings.rowStyle'), t('rf7.projectSettings.styleDefault'), '')}
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.projectSettings.sectionSubtitles'))}
        <RF.ui.Card>
          {RF.ui.KvRow(t('rf7.projectSettings.rowAutoSub'), settings.enableSubtitles === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted')}
          {RF.ui.KvRow(t('rf7.projectSettings.rowPosition'), t('rf7.projectSettings.bottomCenter'), '', 'muted')}
          {RF.ui.KvRow(t('rf7.projectSettings.rowHideName'), t('rf7.intake.on'), '', 'muted')}
          <div className={"text-[10px] text-muted-foreground"}>{t('rf7.projectSettings.subtitleNote')}</div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.projectSettings.sectionSound'))}
        <RF.ui.Card>
          {RF.ui.KvRow(t('rf7.projectSettings.rowBgm'), settings.enableBgm === true ? t('rf7.intake.on') : t('rf7.intake.off'), '', 'muted')}
          {RF.ui.KvRow(t('rf7.projectSettings.rowVoice'), t('rf7.projectSettings.voiceH3'), '', 'muted')}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.projectSettings.sectionDanger'))}
        <RF.ui.Card tone="error">
          <div className={"text-[11px] text-muted-foreground"}>{t('rf7.projectSettings.dangerText')}</div>
          <RF.ui.Button
            label={t('rf7.projectSettings.dangerAction')}
            variant="danger"
            disabled
            title={t('rf7.projectSettings.dangerDisabled')}
          />
        </RF.ui.Card>
      </div>
    );
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

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          <div className={`flex gap-1`}>
            {RF.STAGES.map(stageId => (
              <span
                key={stageId}
                className={`h-1.5 flex-1 rounded-sm bg-secondary ${globalStages.includes(stageId)
                  ? `bg-primary`
                  : `h-1.5 flex-1 rounded-sm bg-secondary--off`}`}
              />
            ))}
          </div>
          <div className={RF.tw.row}>
            {legend.map(item => (
              <span key={item.key} className={`text-[10px] text-muted-foreground text-[10px] text-muted-foreground--${item.tone}`}>
                {t(item.key)}
              </span>
            ))}
          </div>
        </RF.ui.Card>
        <RF.ui.Card>
          <div className={RF.tw.row}>
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>{t('rf7.stages.currentTitle', { kind: kind === '' ? '-' : kind })}</div>
              <div className={RF.tw.rowSub}>{t('rf7.stages.currentSub')}</div>
            </div>
            <RF.ui.Pill label={kind === '' ? t('rf7.stages.stateUnset') : kind} tone={kind === '' ? 'queued' : 'running'} />
          </div>
          {RF.ui.Track(0.25)}
          <div className={RF.tw.row}>
            <span className={RF.tw.rowSub}>{t('rf7.stages.metaGpu')}</span>
            <span className={RF.tw.rowSub}>{t('rf7.stages.metaVram')}</span>
            <span className={RF.tw.rowSub}>{t('rf7.stages.metaEta')}</span>
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.stages.sectionQueue'), t('rf7.stages.sectionQueueSub'))}
        <RF.ui.Card>
          {(state.queue ?? []).length === 0
            ? (
              <div className={RF.tw.rowSub}>{t('rf7.stages.queueEmpty')}</div>
            )
            : state.queue.map((item, index) => (
              <div key={index} className={RF.tw.row}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className={RF.tw.rowMain}>{item.title}</span>
                <span className={RF.tw.rowSub}>{item.meta}</span>
              </div>
            ))}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.stages.sectionPicker'))}
        <RF.ui.Card>
          {RF.STAGES.map(stageId => (
            <div key={stageId} className={RF.tw.row}>
              {RF.ui.CheckboxIndicator(globalStages.includes(stageId))}
              <div className={RF.tw.rowMain}>
                <div className={RF.tw.rowTitle}>{t(`stages.${stageId}`)}</div>
                <div className={RF.tw.rowSub}>{t(`rf7.stages.desc.${stageId}`)}</div>
              </div>
              <span className={RF.tw.rowSub}>
                {globalStages.includes(stageId)
                  ? t('rf7.stages.stateEnabled')
                  : t('rf7.stages.stateDisabled')}
              </span>
            </div>
          ))}
        </RF.ui.Card>
        {RF.ui.Notice(t('rf7.stages.memMain'), t('rf7.stages.memSub'))}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 08 分镜详情（ShotDetail）
  // ══════════════════════════════════════════════════════════════

  RF.flowShotDetail = function flowShotDetail(props) {
    const t = props.t;
    // 口径与分镜列表一致：显式选中的那一镜，没选过就取第一镜（画板 07 永远有一镜高亮）。
    const shot = RF.currentShot(props.project, props.state.selectedShotId);

    if (shot === null) {
      return (
        <div className={RF.tw.stack}>
          <RF.ui.EmptyState
            title={t('rf7.shotDetail.empty.title')}
            hint={t('rf7.shotDetail.empty.hint')}
            action={(
              <RF.ui.Button
                label={t('rf7.shotDetail.empty.action')}
                variant="primary"
                onClick={() => props.state.goTab('shots')}
              />
            )}
          />
        </div>
      );
    }

    const references = Array.isArray(shot.references) ? shot.references : [];

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          <div className={RF.tw.rowTitle}>
            {t('rf7.shotDetail.headTitle', {
              chapter: Number(shot.seq) || 1,
              idx: Number(shot.idx) || 1,
              label: shot.label,
            })}
          </div>
          <div className={RF.tw.rowSub}>
            {t('rf7.shotDetail.meta', {
              duration: shot.duration ?? 0,
              ratio: shot.aspectRatio === '' ? '-' : shot.aspectRatio,
            })}
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.shotDetail.sectionReferences'), t('rf7.shotDetail.sectionReferencesSub'))}
        <RF.ui.Card>
          <div className={RF.tw.row}>
            {references.length === 0
              ? (
                <span className={RF.tw.rowSub}>{t('rf7.shotDetail.noReferences')}</span>
              )
              : references.map((reference, index) => (
                <span key={index}>{RF.ui.Thumb(reference.label === '' ? reference.tag : reference.label, { size: 58 })}</span>
              ))}
            <div style={{ flex: '1 1 auto' }} />
            {RF.ui.PlayerBar(t('rf7.shotDetail.duration', { seconds: shot.duration ?? 0 }))}
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.shotDetail.sectionScript'))}
        <RF.ui.Card>
          <div className={RF.tw.rowTitle}>
            {t('rf7.shotDetail.scriptLens', { size: shot.shotSize === '' ? '-' : shot.shotSize })}
          </div>
          <div className={RF.tw.rowSub}>{t('rf7.shotDetail.scriptMissing')}</div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.shotDetail.sectionPrompt'))}
        <RF.ui.Card tone="warn">
          <div className={"text-[11px] text-muted-foreground"}>{t('rf7.shotDetail.promptMissing')}</div>
          <div className={"text-[10px] text-muted-foreground"}>{t('rf7.shotDetail.promptMissingSub')}</div>
        </RF.ui.Card>
      </div>
    );
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

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          <div className={RF.tw.rowTitle}>{t('rf7.music.generateTitle')}</div>
          {RF.ui.FieldBox(t('rf7.music.generatePlaceholder'), 'placeholder')}
          <div className={RF.tw.row}>
            {RF.ui.ChipRow([
              t('rf7.music.chipInstrumental'),
              t('rf7.music.chipVocal'),
              t('rf7.music.chipPiano'),
              t('rf7.music.chipStrings'),
            ], 0, undefined, t('rf7.music.chipsDisabled'))}
            <div style={{ flex: '1 1 auto' }} />
            <RF.ui.Button
              label={t('rf7.music.actGenerate')}
              variant="primary"
              disabled
              title={t('rf7.music.actGenerateDisabled')}
            />
          </div>
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.music.sectionLibrary'), t('rf7.music.sectionLibrarySub'))}
        {tracks.length === 0
          ? (
            <RF.ui.Card tone="warn">
              <div className={"text-[11px] text-muted-foreground"}>{t('rf7.music.emptyTitle')}</div>
              <div className={"text-[10px] text-muted-foreground"}>{t('rf7.music.emptySub')}</div>
            </RF.ui.Card>
          )
          : (
            <div className={RF.tw.stack}>
              {tracks.map(track => (
                <RF.ui.Card key={track.name}>
                  <div className={RF.tw.row}>
                    <div className={RF.tw.rowMain}>
                      <div className={RF.tw.rowTitle}>{track.name}</div>
                      <div className={RF.tw.rowSub}>{track.description}</div>
                    </div>
                    <RF.ui.Pill label={t('rf7.music.stateApplied')} tone="done" />
                  </div>
                  {RF.ui.PlayerBar('-')}
                  <div className={RF.tw.row}>
                    <RF.ui.Button
                      label={t('rf7.music.actPreview')}
                      variant="secondary"
                      disabled
                      title={t('rf7.music.actPreviewDisabled')}
                    />
                    <RF.ui.Button
                      label={t('rf7.music.actApply')}
                      variant="secondary"
                      disabled
                      title={t('rf7.music.actApplyDisabled')}
                    />
                  </div>
                </RF.ui.Card>
              ))}
            </div>
          )}
        {RF.ui.Notice(t('rf7.music.note'), '')}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 13 技能与工作流（Skills）—— 从旧版页签移过来的流程屏
  // ══════════════════════════════════════════════════════════════

  RF.flowSkills = function flowSkills(props) {
    const t = props.t;
    const skills = Array.isArray(props.project?.skills) ? props.project.skills : [];
    const analysis = props.project?.workflowAnalysis ?? null;

    return (
      <div className={RF.tw.stack}>
        {RF.ui.SectionHead(t('rf7.skills.sectionInstalled'), t('rf7.skills.sectionInstalledSub', {
          count: skills.length,
        }))}
        <RF.ui.Card>
          {skills.length === 0
            ? (
              <RF.ui.EmptyState title={t('rf7.skills.empty.title')} hint={t('rf7.skills.empty.hint')} />
            )
            : skills.map(skill => (
              <div key={skill.name} className={RF.tw.row}>
                <div className={RF.tw.rowMain}>
                  <div className={RF.tw.rowTitle}>{skill.name}</div>
                  <div className={RF.tw.rowSub}>{t(`rf7.skills.source.${skill.source ?? 'bundled'}`)}</div>
                </div>
                <RF.ui.Pill label={t('rf7.skills.stateReady')} tone="done" />
              </div>
            ))}
        </RF.ui.Card>
        {RF.ui.SectionHead(t('rf7.skills.sectionIterate'), t('rf7.skills.sectionIterateSub'))}
        <RF.ui.Card>
          <div className={RF.tw.row}>
            <span className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-primary`}>1</span>
            <span className={RF.tw.rowSub}>{t('rf7.skills.step1')}</span>
          </div>
          <div className={RF.tw.row}>
            <span className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-primary`}>2</span>
            <span className={RF.tw.rowSub}>{t('rf7.skills.step2')}</span>
          </div>
          <div className={`flex min-h-10 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground`}>{t('rf7.skills.dropHint')}</div>
          {analysis === null
            ? (
              <RF.ui.Button
                label={t('rf7.skills.actAnalyze')}
                variant="primary"
                disabled
                title={t('rf7.skills.actAnalyzeDisabled')}
              />
            )
            : RF.ui.Notice(String(analysis.summary ?? t('rf7.skills.analyzed')), '')}
        </RF.ui.Card>
        {RF.ui.Notice(t('rf7.skills.note'), '')}
      </div>
    );
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
      grid.push(
        <div key={index} className={RF.tw.gridThree}>
          {slice.map(asset => (
            <button
              key={String(asset.id)}
              type="button"
              className={RF.cn(RF.tw.pickerItem, picked.includes(String(asset.id)) && RF.tw.pickerItemOn)}
              onClick={() => state.togglePicker(String(asset.id))}
            >
              {RF.ui.Thumb(asset.name, { size: 76, picked: picked.includes(String(asset.id)) })}
            </button>
          ))}
        </div>,
      );
    }

    return (
      <div className={RF.tw.stack}>
        <RF.ui.Card>
          {RF.ui.FieldBox(t('rf7.picker.searchPlaceholder'), 'placeholder')}
          {RF.ui.ChipRow(
            chipItems.map(item => t(item.key)),
            activeIndex,
            index => state.setAssetCategory(chipItems[index]?.id ?? 'all'),
          )}
          {grid}
          <div className={RF.tw.row}>
            {picked.map(id => (
              <span key={id}>{RF.ui.Thumb(t('rf7.picker.pickedThumb'), { size: 40, picked: true })}</span>
            ))}
            <span className={RF.tw.rowSub}>
              {t('rf7.picker.pickedCount', {
                count: picked.length,
                limit,
              })}
            </span>
            <div style={{ flex: '1 1 auto' }} />
            <RF.ui.Button
              label={t('rf7.picker.actClear')}
              variant="secondary"
              onClick={() => state.clearPicker()}
            />
          </div>
        </RF.ui.Card>
        {RF.ui.Notice(t('rf7.picker.note'), '')}
      </div>
    );
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

    const stateCard = (titleKey, metaKey, tone) => (
      <RF.ui.Card tone={tone}>
        <div className={"text-[11px] text-muted-foreground"}>{t(titleKey)}</div>
        <div className={"text-[10px] text-muted-foreground"}>{t(metaKey)}</div>
      </RF.ui.Card>
    );

    const missingShots = missing
      .map(shot => String(Number(shot.idx) || 0).padStart(2, '0'))
      .join(' / ');

    return (
      <div className={RF.tw.stack}>
        {RF.ui.SectionHead(t('rf7.degraded.sectionBlocked'), t('rf7.degraded.sectionBlockedSub'))}
        {degradations.length === 0
          ? stateCard('rf7.degraded.noneTitle', 'rf7.degraded.noneSub', 'warn-border')
          : degradations.map((item, index) => (
            <RF.ui.Card key={index} tone="error">
              <div className={"text-[11px] text-muted-foreground"}>{String(item.message ?? item.kind ?? '')}</div>
              <div className={"text-[10px] text-muted-foreground"}>{t('rf7.degraded.blockedHint')}</div>
            </RF.ui.Card>
          ))}
        {RF.ui.SectionHead(t('rf7.degraded.sectionWarning'), t('rf7.degraded.sectionWarningSub'))}
        {notices.length === 0
          ? stateCard('rf7.degraded.noWarningTitle', 'rf7.degraded.noWarningSub', 'warn-border')
          : notices.map((item, index) => (
            <RF.ui.Card key={index} tone="warn">
              <div className={"text-[11px] text-muted-foreground"}>{String(item.message ?? item.kind ?? '')}</div>
              <div className={"text-[10px] text-muted-foreground"}>{t('rf7.degraded.warningHint')}</div>
            </RF.ui.Card>
          ))}
        {RF.ui.SectionHead(t('rf7.degraded.sectionMissing'), t('rf7.degraded.sectionMissingSub'))}
        {missing.length === 0
          ? stateCard('rf7.degraded.noMissingTitle', 'rf7.degraded.noMissingSub', 'warn-border')
          : (
            <RF.ui.Card tone="warn">
              <div className={"text-[11px] text-muted-foreground"}>{t('rf7.degraded.missingTitle', { count: missing.length })}</div>
              <div className={"text-[10px] text-muted-foreground"}>{t('rf7.degraded.missingSub', { shots: missingShots })}</div>
              <RF.ui.Button
                label={t('rf7.degraded.actFill')}
                variant="secondary"
                onClick={() => state.goTab('assets')}
              />
            </RF.ui.Card>
          )}
        {chapters.length === 0
          ? (
            <div className={RF.tw.stack}>
              {RF.ui.SectionHead(t('rf7.degraded.sectionEmpty'), t('rf7.degraded.sectionEmptySub'))}
              {stateCard('rf7.degraded.emptyTitle', 'rf7.degraded.emptySub', 'warn-border')}
            </div>
          )
          : null}
        {noVoice.length === 0
          ? null
          : (
            <RF.ui.Card tone="warn">
              <div className={"text-[11px] text-muted-foreground"}>{t('rf7.degraded.softTitle', { count: noVoice.length })}</div>
              <div className={"text-[10px] text-muted-foreground"}>{t('rf7.degraded.softSub')}</div>
            </RF.ui.Card>
          )}
      </div>
    );
  };
})(RF);
