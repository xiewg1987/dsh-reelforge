/* ─────────────────────────────────────────────────────────────────────────────
 * 7 类对话消息行的视图（注册在 `conversation.chat.node`，键为事件定义的 kind）。
 *
 * 形态约定（§2.4）：
 *   progress / chapters / storyboard **默认折叠**（折叠态是默认视图）；
 *   plan 行可在对话内直接改 kind × 位置（**不烧钱，不走 ask**）；
 *   changelog 行的回滚**走 ask**（由宿主的 `ask` 机制承担，插件只发起请求）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 消息行的文案入口（由入口注入绑定后的 translate）。 */
  RF.chatRows = RF.chatRows || { t: (key) => key };

  /**
   * 折叠壳：折叠态只留一行摘要，展开是用户主动要的。
   * @param {{ React: object, kind: string, title: string, summary: string, children: any, defaultOpen?: boolean }} props - 属性。
   * @returns {object} React 元素。
   */
  function disclosure(props) {
    const React = props.React;
    const [open, setOpen] = React.useState(props.defaultOpen === true);
    return (
      <div className={RF.tw.chatrow}>
        <div className={RF.tw.chatrowHead}>
          <span className={RF.tw.chatrowKind}>{props.kind}</span>
          <span className={RF.tw.chatrowTitle}>{props.title}</span>
          <button
            type="button"
            className={RF.tw.chatrowToggle}
            aria-expanded={open ? 'true' : 'false'}
            onClick={() => setOpen(value => !value)}
          >
            {open ? RF.chatRows.t('chat.collapse') : RF.chatRows.t('chat.expand')}
          </button>
        </div>
        <div className={RF.tw.chatrowBody}>{open ? props.children : props.summary}</div>
      </div>
    );
  }

  /**
   * 把若干段拼成摘要，空段不占位（`第 2 章 · S02-07 · 已跑 04:12`）。
   * @param {...unknown} parts - 片段。
   * @returns {string} 摘要。
   */
  function joinParts(...parts) {
    return parts
      .map(part => String(part ?? '').trim())
      .filter(part => part !== '')
      .join(' · ');
  }

  /** 行数据：宿主事件定义物化出来的 `node.data`。 */
  function dataOf(props) {
    const node = props.node ?? {};
    return node.data ?? {};
  }

  /**
   * 阶段进度行：轻量、可折叠。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowProgress = function chatRowProgress(props) {
    const data = dataOf(props);
    // 阶段值是内部 id（`image` / `tts` …）：走 `stages.*` 词条，
    // 查不到就原样显示 —— 既不裸奔技术词，也不吐 `stages.image` 这种键名。
    const stage = RF.labelOf('stages', String(data.stage ?? ''), RF.chatRows.t);
    const summary = joinParts(stage, data.chapter, data.shot, data.elapsed);
    return disclosure({
      React: RF.React,
      kind: 'reelforge-progress',
      title: RF.chatRows.t('chat.progress'),
      summary,
      children: (
        <div>
          <RF.ui.MetaRow label={RF.chatRows.t('chat.progress.stage')} value={stage} />
          <RF.ui.MetaRow label={RF.chatRows.t('chat.progress.chapter')} value={String(data.chapter ?? '')} />
          <RF.ui.MetaRow label={RF.chatRows.t('chat.progress.shot')} value={String(data.shot ?? '')} />
          <RF.ui.MetaRow label={RF.chatRows.t('chat.progress.elapsed')} value={String(data.elapsed ?? '')} />
        </div>
      ),
    });
  };

  /**
   * 章节列表行：可展开看单章状态。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowChapters = function chatRowChapters(props) {
    const data = dataOf(props);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    const shots = chapters.reduce((sum, chapter) => sum + (Number(chapter.shotCount) || 0), 0);
    const summary = RF.chatRows.t('chat.summary.chapters', { chapters: chapters.length, shots });
    return disclosure({
      React: RF.React,
      kind: 'reelforge-chapters',
      title: RF.chatRows.t('chat.chapters'),
      summary,
      children: (
        <div>
          {chapters.map(chapter => (
            <div key={chapter.id} className={RF.tw.row}>
              <div className={RF.tw.rowMain}>
                <div className={RF.tw.rowTitle}>{chapter.title ?? ''}</div>
                <div className={RF.tw.rowSub}>
                  {`${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`}
                </div>
              </div>
              <RF.ui.Pill
                label={RF.labelOf('chapter.status', chapter.status, RF.chatRows.t)}
                tone={chapter.tone ?? 'queued'}
              />
            </div>
          ))}
        </div>
      ),
    });
  };

  /**
   * 分镜卡片行：可展开看单镜。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowStoryboard = function chatRowStoryboard(props) {
    const data = dataOf(props);
    const shots = Array.isArray(data.shots) ? data.shots : [];
    const summary = RF.chatRows.t('chat.summary.shots', { shots: shots.length });
    return disclosure({
      React: RF.React,
      kind: 'reelforge-storyboard',
      title: RF.chatRows.t('chat.storyboard'),
      summary,
      children: (
        <div>
          {shots.map(shot => (
            <div key={shot.id} className={RF.tw.row}>
              <div className={RF.tw.rowMain}>
                <div className={RF.tw.rowTitle}>{shot.label ?? shot.id}</div>
                <div className={RF.tw.rowSub}>
                  {`${RF.formatDuration(shot.duration ?? 0)} · ${shot.dialogue ?? ''}`}
                </div>
              </div>
              <RF.ui.Pill
                label={RF.labelOf('shot.status', shot.status, RF.chatRows.t)}
                tone={shot.tone ?? 'queued'}
              />
            </div>
          ))}
        </div>
      ),
    });
  };

  /**
   * 执行路径行：**对话内直接改** kind × 位置（不烧钱，不走 ask）。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowPlan = function chatRowPlan(props) {
    const data = dataOf(props);
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const patch = (kind, position) => RF.actions?.callTool?.('reelforge.update_plan', { kind, position }, { ask: false });
    return (
      <div className={RF.tw.chatrow}>
        <div className={RF.tw.chatrowHead}>
          <span className={RF.tw.chatrowKind}>reelforge-plan</span>
          <span className={RF.tw.chatrowTitle}>{RF.chatRows.t('chat.plan')}</span>
        </div>
        <div className={RF.tw.chatrowBody}>
          <div className={RF.tw.row}>
            <div className={RF.tw.rowMain}>
              <div className={RF.tw.rowTitle}>
                {RF.chatRows.t('chat.summary.plan', { kind: data.kind ?? '', position: data.position ?? '' })}
              </div>
              <div className={RF.tw.rowSub}>{data.provider ?? ''}</div>
            </div>
          </div>
          <div className={RF.tw.row}>
            {candidates.map(candidate => (
              <RF.ui.Button
                key={`${candidate.kind}-${candidate.position}`}
                label={candidate.label ?? `${candidate.kind} · ${candidate.position}`}
                variant={candidate.kind === data.kind && candidate.position === data.position ? 'primary' : 'secondary'}
                onClick={() => patch(candidate.kind, candidate.position)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * 资产卡行：人物 / 场景 / 道具 + 变体挂载关系。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowAssets = function chatRowAssets(props) {
    const data = dataOf(props);
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return (
      <div className={RF.tw.chatrow}>
        <div className={RF.tw.chatrowHead}>
          <span className={RF.tw.chatrowKind}>reelforge-assets</span>
          <span className={RF.tw.chatrowTitle}>{RF.chatRows.t('chat.assets')}</span>
        </div>
        <div className={RF.tw.chatrowBody}>
          {assets.map(asset => (
            <div key={asset.id} className={RF.tw.row}>
              <div className={RF.tw.rowMain}>
                <div className={RF.tw.rowTitle}>{asset.name ?? ''}</div>
                <div className={RF.tw.rowSub}>{asset.description ?? ''}</div>
              </div>
              <RF.ui.Pill
                label={RF.labelOf('asset.category', asset.category, RF.chatRows.t)}
                tone="queued"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 成片行：播放器 + 交付物列表，可单章下载。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowDeliver = function chatRowDeliver(props) {
    const data = dataOf(props);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    return (
      <div className={RF.tw.chatrow}>
        <div className={RF.tw.chatrowHead}>
          <span className={RF.tw.chatrowKind}>reelforge-deliver</span>
          <span className={RF.tw.chatrowTitle}>{RF.chatRows.t('chat.deliver')}</span>
        </div>
        <div className={RF.tw.chatrowBody}>
          {chapters.map(chapter => {
            const deliverables = Array.isArray(chapter.deliverables) ? chapter.deliverables : [];
            const videoPath = deliverables.find(d => typeof d.path === 'string' && d.path.endsWith('.mp4'))?.path ?? '';
            return (
              <div key={chapter.id}>
                <div className={RF.tw.rowTitle}>{chapter.title ?? ''}</div>
                <div className={RF.tw.rowSub}>
                  {`${chapter.shotCount ?? 0} ${RF.chatRows.t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`}
                </div>
                {deliverables.map(item => (
                  <div key={`${item.kind}-${item.path}`} className={RF.tw.row}>
                    <div className={RF.tw.rowMain}>
                      <div className={RF.tw.rowSub}>
                        {`${item.label ?? item.kind} · ${RF.formatBytes(item.bytes ?? 0)}`}
                      </div>
                    </div>
                    {item.path
                      ? (
                        <a
                          className="inline-flex h-7 items-center rounded-md bg-secondary px-2.5 text-[10px] text-muted-foreground no-underline"
                          href={RF.deliverableUrl(item.path)}
                          download={item.label ?? item.kind}
                        >
                          {RF.chatRows.t('common.download')}
                        </a>
                      )
                      : (
                        <RF.ui.Button label={RF.chatRows.t('common.download')} variant="secondary" />
                      )}
                  </div>
                ))}
                {videoPath === '' ? null : (
                  <video
                    className={`block object-contain`}
                    controls
                    preload="metadata"
                    src={RF.deliverableUrl(videoPath)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * 变更日志行：回滚入口（单条 / 整批 / 时间点）——**走 ask**。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowChangelog = function chatRowChangelog(props) {
    const data = dataOf(props);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const modes = Array.isArray(data.modes) ? data.modes : ['single', 'batch', 'timepoint'];
    // 三个按钮都是**动作**（这一行里没有每行各自的回滚按钮），所以各自要带足
    // 宿主工具要的定位参数：`reelforge.rollback` 的 schema 是
    // `mode` + `entryId`（单条）/ `batchId`（整批）/ `at`（时间点），
    // 且 `additionalProperties: false` —— 只发 `mode` 会被整条拒收。
    // 目标取这一行里**最新**的那条变更（数组末尾）。
    const latest = entries.length > 0 ? entries[entries.length - 1] : null;
    const rollbackArgs = (mode) => {
      if (latest === null) return null;
      if (mode === 'batch') return { mode, batchId: latest.batchId };
      if (mode === 'timepoint') return { mode, at: latest.at };
      return { mode, entryId: latest.id };
    };
    return (
      <div className={RF.tw.chatrow}>
        <div className={RF.tw.chatrowHead}>
          <span className={RF.tw.chatrowKind}>reelforge-changelog</span>
          <span className={RF.tw.chatrowTitle}>{RF.chatRows.t('chat.changelog')}</span>
        </div>
        <div className={RF.tw.chatrowBody}>
          <div className={RF.tw.row}>
            {modes.map(mode => (
              <RF.ui.Button
                key={mode}
                label={RF.chatRows.t(`log.${mode}`)}
                variant="secondary"
                onClick={() => {
                  const args = rollbackArgs(mode);
                  if (args === null) return;
                  RF.actions?.callTool?.(RF.TOOL_IDS.rollback, args);
                }}
              />
            ))}
          </div>
          {entries.map(entry => (
            <div key={entry.id} className={RF.tw.row}>
              <div className={RF.tw.rowMain}>
                <div className={RF.tw.rowSub}>{entry.at ?? ''}</div>
                <div className={RF.tw.rowTitle}>{entry.summary ?? ''}</div>
              </div>
              {entry.drifted === true ? (
                <RF.ui.Pill label={RF.chatRows.t('log.drifted')} tone="failed" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };
})(RF);
