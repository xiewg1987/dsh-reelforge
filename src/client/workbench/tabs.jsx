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
 *   3. shadcn 用 `<Button>` / `<Card>` / `<Badge>`；复合件用 `RF.ui.*`（`workbench-ui.jsx`）；类名走 Tailwind / `RF.tw`。
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
      return (
        <div className={RF.tw.stack}>
          {RF.ui.ChatSync({ t, project })}
          <RF.ui.EmptyState
            title={t('rf7.hub.empty.title')}
            hint={t('rf7.hub.empty.hint')}
            action={(
              <Button type="button" variant="default" size="lg" className="h-10 font-semibold" onClick={() => props.state.goFlow('intake')} >{t('rf7.hub.empty.action')}</Button>
            )}
          />
        </div>
      );
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

    const hubStrip = (
      <Card {...RF.workbenchCard({ className: RF.tw.hubstrip })}>
        {RF.ui.Stat(t('rf7.hub.costLabel'), RF.formatMoney(cost.spent ?? 0), kind === '' ? t('rf7.hub.kindUnset') : kind)}
        <div className={RF.tw.divider} />
        {RF.ui.Stat(
          t('rf7.hub.stageLabel'),
          kind === '' ? t('rf7.hub.stageUnset') : kind,
          t('rf7.hub.stageSub', {
            chapter: Number(chapter.id) || 1,
            done: doneShots,
            total: chapterShots.length,
          }),
        )}
      </Card>
    );

    const chapterRail = (
      <Card {...RF.workbenchCard()}>
        <div className={RF.tw.row}>
          <div className={RF.tw.rowMain}>
            <div className={RF.tw.rowTitle}>
              {t('rf7.hub.chapterTitle', {
                chapter: Number(chapter.id) || 1,
                title: chapter.title,
              })}
            </div>
            <div className={RF.tw.rowSub}>
              {t('rf7.hub.chapterMeta', {
                shots: chapter.shotCount ?? 0,
                duration: RF.formatDuration(chapter.durationSec ?? 0),
              })}
            </div>
          </div>
          <Badge variant="outline" className={RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(chapterStatus(chapter.status).tone))}>{t(chapterStatus(chapter.status).key)}</Badge>
        </div>
        {RF.ui.Track(chapterShots.length === 0 ? 0 : doneShots / chapterShots.length)}
      </Card>
    );

    const rows = [];
    for (let index = 0; index < visible.length; index += 2) {
      const pair = visible.slice(index, index + 2);
      rows.push(
        <div key={index} className={RF.tw.gridTwo}>
          {pair.map(shot => RF.ui.ShotChip(
            t('rf7.hub.shotId', { seq: Number(shot.seq) || 1, idx: Number(shot.idx) || 1 }),
            shot.shotSize === '' ? t('rf7.hub.shotSizeUnknown') : shot.shotSize,
            t(shotStatus(shot.status).key),
            shotStatus(shot.status).tone === 'done'
              ? 'ok'
              : (shotStatus(shot.status).tone === 'running' ? 'accent' : 'line'),
          ))}
        </div>,
      );
    }

    return (
      <div className={RF.tw.stack}>
        {hubStrip}
        {RF.ui.ChatSync({ t, project })}
        {RF.ui.SectionHead(t('rf7.hub.sectionChapters'))}
        {chapterRail}
        {RF.ui.SectionHead(t('rf7.hub.sectionShots'), t('rf7.hub.sectionShotsSub'))}
        {rows}
        <div className={RF.tw.row}>
          <span className={RF.tw.note}>{t('rf7.hub.moreShots', { count: rest > 0 ? rest : 0 })}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => props.state.goTab('shots')}
          >
            {t('rf7.hub.viewAll', { count: chapterShots.length })}
          </Button>
        </div>
        <div className={RF.tw.row}>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.goFlow('projectSettings')} >{t('rf7.hub.actProjectSettings')}</Button>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.goFlow('skills')} >{t('rf7.hub.actSkills')}</Button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 03 章节（Chapters）
  // ══════════════════════════════════════════════════════════════

  RF.tabChapters = function tabChapters(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];

    const card = chapter => (
      <Card key={chapter.id} {...RF.workbenchCard()}>
        <div className={RF.tw.rowTitle}>
          {t('rf7.chapters.chapterTitle', { chapter: Number(chapter.id) || 1 })}
        </div>
        <div className={RF.tw.row}>
          <span className={RF.tw.rowSub}>
            {(Number(chapter.shotCount) || 0) === 0
              ? t('rf7.chapters.noShots')
              : t('rf7.chapters.shotsMeta', {
                shots: chapter.shotCount,
                duration: RF.formatDuration(chapter.durationSec ?? 0),
              })}
          </span>
          <Badge variant="outline" className={RF.cn("rounded-md px-2.5 py-1 text-[10px] font-normal", RF.statusToneClass(chapterStatus(chapter.status).tone))}>{t(chapterStatus(chapter.status).key)}</Badge>
        </div>
        <div className={RF.tw.row}>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.runStage('llm', chapter.id)} >{t('rf7.chapters.actGenerate')}</Button>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled
            title={t('rf7.chapters.actEditDisabled')} >{t('rf7.chapters.actEdit')}</Button>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled
            title={t('rf7.chapters.actMoreDisabled')} >{t('rf7.chapters.actMore')}</Button>
        </div>
      </Card>
    );

    const rows = [];
    for (let index = 0; index < chapters.length; index += 2) {
      const pair = chapters.slice(index, index + 2);
      rows.push(
        <div key={index} className={RF.tw.gridTwo}>
          {pair.map(card)}
        </div>,
      );
    }

    return (
      <div className={RF.tw.stack}>
        {RF.ui.ChatSync({ t, project })}
        <div className={RF.tw.row}>
          <Button type="button" variant="default" size="lg" className="h-10 font-semibold" onClick={() => props.state.goFlow('intake')} >{t('rf7.chapters.actAdd')}</Button>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.runStage('llm')} >{t('rf7.chapters.actGenerateAll')}</Button>
        </div>
        {rows}
        {RF.ui.Notice(t('rf7.chapters.notice'), t('rf7.chapters.noticeSub'))}
      </div>
    );
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

    const card = asset => (
      <Card key={asset.id} {...RF.workbenchCard()}>
        <div className={RF.tw.rowTitle}>{asset.name}</div>
        <div className={RF.tw.row}>
          <span className={RF.tw.rowSub}>{assetCategoryName(asset.category, t)}</span>
          <Badge variant="outline" className={RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('done'))}>{t('rf7.assets.stateReady')}</Badge>
        </div>
        <div className={RF.tw.rowSub}>
          {asset.description === '' ? t('rf7.assets.noDescription') : asset.description}
        </div>
        <div className={RF.tw.chips}>
          {[t('rf7.assets.actGenerate'), t('rf7.assets.actReplace')].map(action => (
            <span key={action} className={RF.tw.chip}>{action}</span>
          ))}
        </div>
      </Card>
    );

    const rows = [];
    for (let index = 0; index < shown.length; index += 2) {
      const pair = shown.slice(index, index + 2);
      rows.push(
        <div key={index} className={RF.tw.gridTwo}>
          {pair.map(card)}
        </div>,
      );
    }

    return (
      <div className={RF.tw.stack}>
        <div className={RF.tw.row}>
          <Button type="button" variant="default" size="lg" className="h-10 font-semibold" onClick={() => props.state.goFlow('picker')} >{t('rf7.assets.actCreate')}</Button>
        </div>
        {RF.ui.ChipRow(chipLabels, chipItems.indexOf(category), index => {
          props.state.setAssetCategory(chipItems[index] ?? 'all');
        })}
        {rows}
        <div className={RF.tw.row}>
          <span className={RF.tw.note}>{t('rf7.assets.more', { count: assets.length - shown.length })}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => props.state.setAssetCategory('all')}
          >
            {t('rf7.assets.viewAll', { count: assets.length })}
          </Button>
        </div>
        {RF.ui.Notice(gapText, t('rf7.assets.gapSub'))}
      </div>
    );
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
      return (
        <button
          key={String(shot.id)}
          type="button"
          className={RF.cn(RF.tw.shotrow, on && RF.tw.shotrowOn)}
          onClick={() => props.state.selectShot(String(shot.id))}
        >
          <span className={RF.cn(RF.tw.rowTitle, `font-semibold`)}>{String(Number(shot.idx) || 0).padStart(2, '0')}</span>
          <span className={RF.cn(RF.tw.rowMain, `text-xs`)}>{shot.label}</span>
          <span className={`text-[10px] text-muted-foreground`}>{t('rf7.storyboard.duration', { seconds: shot.duration ?? 0 })}</span>
          <span className={`text-[10px] text-muted-foreground shrink-0`}>{t(status.key)}</span>
        </button>
      );
    });

    const preview = selected === null
      ? null
      : (
        <Card {...RF.workbenchCard()}>
          <div className={RF.tw.row}>
            {RF.ui.Thumb(t('rf7.storyboard.refCharacter'), { size: 48 })}
            {RF.ui.Thumb(t('rf7.storyboard.refScene'), { size: 48 })}
            {RF.ui.Thumb(t('rf7.storyboard.refProp'), { size: 48 })}
            <div style={{ flex: '1 1 auto' }} />
            {RF.ui.PlayerBar(t('rf7.storyboard.duration', { seconds: selected.duration ?? 0 }))}
          </div>
          <div className={RF.tw.rowSub}>
            {t('rf7.storyboard.promptLine', {
              size: selected.shotSize === '' ? '-' : selected.shotSize,
            })}
          </div>
        </Card>
      );

    return (
      <div className={RF.tw.stack}>
        {rows}
        {selected === null
          ? (
            <RF.ui.EmptyState title={t('rf7.storyboard.empty.title')} hint={t('rf7.storyboard.empty.hint')} />
          )
          : RF.ui.SectionHead(
            t('rf7.storyboard.sectionSelected', { idx: Number(selected.idx) || 1 }),
            t('rf7.storyboard.sectionSelectedSub'),
          )}
        {preview}
        {RF.ui.SectionHead(t('rf7.storyboard.sectionRegenerate'))}
        <Card {...RF.workbenchCard()}>
          <div className={RF.tw.row}>
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.regenerateShot(selected)} >{t('rf7.storyboard.actSeed')}</Button>
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.regenerateShot(selected)} >{t('rf7.storyboard.actRewrite')}</Button>
          </div>
          {RF.ui.FieldBox(t('rf7.storyboard.feedbackPlaceholder'), 'placeholder')}
        </Card>
        <div className={RF.tw.row}>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled={selected === null}
            title={selected === null ? t('rf7.storyboard.actDetailDisabled') : undefined}
            onClick={() => {
              props.state.selectShot(String(selected.id));
              props.state.goFlow('shotDetail');
            }} >{t('rf7.storyboard.actDetail')}</Button>
        </div>
      </div>
    );
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
      return (
        <Card key={key} {...RF.workbenchCard()}>
          <div className={RF.tw.row}>
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>{t(titleKey)}</div>
              <div className={RF.tw.rowSub}>{t(metaKey)}</div>
            </div>
            <Badge variant="outline" className={RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass(filled ? tone : 'queued'))}>{t(filled ? 'rf7.context.stateReady' : 'rf7.context.stateMissing')}</Badge>
          </div>
          {expanded === key
            ? (
              <div className={RF.tw.rowSub}>{filled ? value : t('rf7.context.stateMissing')}</div>
            )
            : null}
          <div className={RF.tw.row}>
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.toggleContextKey(key)} >{t('rf7.context.actView')}</Button>
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled
              title={t('rf7.context.actWriteDisabled')} >{t('rf7.context.actWrite')}</Button>
          </div>
        </Card>
      );
    };

    return (
      <div className={RF.tw.stack}>
        {RF.ui.ChatSync({ t, project })}
        {card('bible', 'rf7.context.bibleTitle', 'rf7.context.bibleMeta', context.bible, 'done')}
        {card('style', 'rf7.context.styleTitle', 'rf7.context.styleMeta', context.style, 'done')}
        {card('continuity', 'rf7.context.continuityTitle', 'rf7.context.continuityMeta', context.continuity, 'warn')}
        {RF.ui.SectionHead(t('rf7.context.sectionInject'), t('rf7.context.sectionInjectSub'))}
        <Card {...RF.workbenchCard()}>
          {RF.CONTEXT_INJECTION_ORDER.map(key => (
            <div key={key} className={`text-[10px] text-primary`}>{RF.CONTEXT_INJECTION_TITLES[key]}</div>
          ))}
        </Card>
        {RF.ui.Notice(t('rf7.context.rule1'), t('rf7.context.rule2'))}
      </div>
    );
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
      : (
        <Card {...RF.workbenchCard()}>
          <div className={RF.tw.row}>
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>{first.label === '' ? t('rf7.output.untitled') : first.label}</div>
              <div className={RF.tw.rowSub}>
                {t('rf7.output.fileMeta', {
                  size: RF.formatBytes(first.bytes ?? 0),
                  time: RF.formatDateTime(first.at ?? ''),
                })}
              </div>
            </div>
            <Button type="button" variant="default" size="lg" className="h-10 font-semibold" onClick={() => window.open(RF.deliverableUrl(first), '_blank')} >{t('rf7.output.actDownload')}</Button>
          </div>
        </Card>
      );

    const deliverList = deliverables.length === 0
      ? (
        <RF.ui.EmptyState title={t('rf7.output.empty.title')} hint={t('rf7.output.empty.hint')} />
      )
      : (
        <Card {...RF.workbenchCard()}>
          {deliverables.map(item => RF.ui.KvRow(
            item.label === '' ? String(item.kind ?? '') : item.label,
            t('rf7.output.deliverMeta', { size: RF.formatBytes(item.bytes ?? 0) }),
            t('rf7.output.stateReady'),
            'ok',
          ))}
        </Card>
      );

    return (
      <div className={RF.tw.stack}>
        {exportRow}
        <div className={`flex h-[168px] items-center justify-center rounded-[10px] bg-muted text-[11px] text-muted-foreground`}>{t('rf7.output.playerPlaceholder')}</div>
        {RF.ui.SectionHead(t('rf7.output.sectionDeliver'), t('rf7.output.sectionDeliverSub'))}
        <div id="rf-deliverables">{deliverList}</div>
        {RF.ui.SectionHead(t('rf7.output.sectionChapters'))}
        <Card {...RF.workbenchCard()}>
          {chapters.length === 0
            ? (
              <div className={RF.tw.rowSub}>{t('rf7.output.noChapters')}</div>
            )
            : chapters.map(chapter => (
              <div key={chapter.id} className={RF.tw.row}>
                <div className={RF.tw.rowMain}>
                  <div className={RF.tw.rowTitle}>
                    {t('rf7.output.chapterTitle', {
                      chapter: Number(chapter.id) || 1,
                      title: chapter.title,
                    })}
                  </div>
                  <div className={RF.tw.rowSub}>
                    {t('rf7.output.chapterMeta', {
                      shots: chapter.shotCount ?? 0,
                      duration: RF.formatDuration(chapter.durationSec ?? 0),
                    })}
                  </div>
                </div>
              </div>
            ))}
        </Card>
        <div className={RF.tw.row}>
          <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => props.state.goFlow('music')} >{t('rf7.output.actMusic')}</Button>
        </div>
      </div>
    );
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
      ? (
        <RF.ui.EmptyState title={t('rf7.log.empty.title')} hint={t('rf7.log.empty.hint')} />
      )
      : (
        <Card {...RF.workbenchCard()}>
          {entries.slice(0, 20).map(entry => (
            <div key={entry.id} className={RF.tw.row}>
              <span className={`shrink-0 text-[10px] text-muted-foreground`}>{RF.formatDateTime(entry.at ?? '')}</span>
              <span className={RF.tw.rowMain}>{String(entry.summary ?? '')}</span>
              {entry.drifted === true ? (
                <Badge variant="outline" className={RF.cn('rounded-md px-2.5 py-1 text-[10px] font-normal', RF.statusToneClass('warn'))}>{t('rf7.log.drifted')}</Badge>
              ) : null}
            </div>
          ))}
        </Card>
      );

    const latest = entries[entries.length - 1] ?? null;

    return (
      <div className={RF.tw.stack}>
        {RF.ui.SectionHead(t('rf7.log.sectionChanges'), t('rf7.log.sectionChangesSub'))}
        {changeList}
        {RF.ui.SectionHead(t('rf7.log.sectionOutput'))}
        {RF.ui.CodeBox(entries.slice(-6).reverse().map(entry => `[${RF.formatDateTime(entry.at ?? '')}] ${String(entry.summary ?? '')}`))}
        {RF.ui.SectionHead(t('rf7.log.sectionRollback'))}
        <Card {...RF.workbenchCard()}>
          {RF.ui.KvRow(t('rf7.log.rollbackBatch'), '-', '', 'muted',
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled
              title={t('rf7.log.rollbackBatchDisabled')} >{t('rf7.log.actRollback')}</Button>)}
          {RF.ui.KvRow(t('rf7.log.rollbackTime'), '-', '', 'muted',
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" disabled
              title={t('rf7.log.rollbackTimeDisabled')} >{t('rf7.log.actPick')}</Button>)}
          {RF.ui.KvRow(
            t('rf7.log.rollbackSingle'),
            latest === null ? '-' : String(latest.summary ?? ''),
            '',
            'muted',
            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px]" onClick={latest === null ? undefined : () => props.state.rollback(latest, 'single')} >{t('rf7.log.actRollback')}</Button>,
          )}
          <div className="text-[10px] text-muted-foreground">{t('rf7.log.rollbackNote')}</div>
        </Card>
      </div>
    );
  };
})(RF);
