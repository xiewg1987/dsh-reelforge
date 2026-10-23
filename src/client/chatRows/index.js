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
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, props.kind),
        h('span', { className: `${RF.CLS}-chatrow__title` }, props.title),
        h('button', {
          type: 'button',
          className: `${RF.CLS}-chatrow__toggle`,
          'aria-expanded': open ? 'true' : 'false',
          onClick: () => setOpen(value => !value),
        }, open ? '收起' : '展开')),
      h('div', { className: `${RF.CLS}-chatrow__body` }, open ? props.children : props.summary));
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
    const summary = `${data.stage ?? ''} · ${data.chapter ?? ''} · ${data.shot ?? ''} · ${data.elapsed ?? ''}`;
    return disclosure({
      React: RF.React,
      kind: 'reelforge-progress',
      title: RF.chatRows.t('chat.progress'),
      summary,
      children: h('div', null,
        h(RF.ui.MetaRow, { label: 'stage', value: String(data.stage ?? '') }),
        h(RF.ui.MetaRow, { label: 'chapter', value: String(data.chapter ?? '') }),
        h(RF.ui.MetaRow, { label: 'shot', value: String(data.shot ?? '') }),
        h(RF.ui.MetaRow, { label: 'elapsed', value: String(data.elapsed ?? '') })),
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
    const summary = `${chapters.length} 章`;
    return disclosure({
      React: RF.React,
      kind: 'reelforge-chapters',
      title: RF.chatRows.t('chat.chapters'),
      summary,
      children: h('div', null, chapters.map(chapter => h('div', { key: chapter.id, className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
          h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} 镜 · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
        h(RF.ui.Pill, { label: chapter.status ?? '', tone: chapter.tone ?? 'queued' })))),
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
    const summary = `${shots.length} 镜`;
    return disclosure({
      React: RF.React,
      kind: 'reelforge-storyboard',
      title: RF.chatRows.t('chat.storyboard'),
      summary,
      children: h('div', null, shots.map(shot => h('div', { key: shot.id, className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, shot.label ?? shot.id),
          h('div', { className: `${RF.CLS}-row__sub` }, `${RF.formatDuration(shot.duration ?? 0)} · ${shot.dialogue ?? ''}`)),
        h(RF.ui.Pill, { label: shot.status ?? '', tone: shot.tone ?? 'queued' })))),
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
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-plan'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.plan'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, `${data.kind ?? ''} · ${data.position ?? ''}`),
            h('div', { className: `${RF.CLS}-row__sub` }, data.provider ?? ''))),
        h('div', { className: `${RF.CLS}-row` }, candidates.map(candidate => h(RF.ui.Button, {
          key: `${candidate.kind}-${candidate.position}`,
          label: candidate.label ?? `${candidate.kind} · ${candidate.position}`,
          variant: candidate.kind === data.kind && candidate.position === data.position ? 'primary' : 'secondary',
          onClick: () => patch(candidate.kind, candidate.position),
        })))));
  };

  /**
   * 资产卡行：人物 / 场景 / 道具 + 变体挂载关系。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowAssets = function chatRowAssets(props) {
    const data = dataOf(props);
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-assets'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.assets'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        assets.map(asset => h('div', { key: asset.id, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, asset.name ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` }, asset.description ?? '')),
          h(RF.ui.Pill, { label: asset.category ?? '', tone: 'queued' })))));
  };

  /**
   * 成片行：播放器 + 交付物列表，可单章下载。
   * @param {object} props - 插槽 props。
   * @returns {object} React 元素。
   */
  RF.chatRowDeliver = function chatRowDeliver(props) {
    const data = dataOf(props);
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-deliver'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.deliver'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        chapters.map(chapter => h('div', { key: chapter.id },
          h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
          h('div', { className: `${RF.CLS}-row__sub` }, `${chapter.shotCount ?? 0} 镜 · ${RF.formatDuration(chapter.durationSec ?? 0)}`),
          (chapter.deliverables ?? []).map(item => h('div', { key: `${item.kind}-${item.path}`, className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__sub` }, `${item.label ?? item.kind} · ${RF.formatBytes(item.bytes ?? 0)}`)),
            h(RF.ui.Button, { label: RF.chatRows.t('common.download'), variant: 'secondary' })))))));
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
    return h('div', { className: `${RF.CLS}-chatrow` },
      h('div', { className: `${RF.CLS}-chatrow__head` },
        h('span', { className: `${RF.CLS}-chatrow__kind` }, 'reelforge-changelog'),
        h('span', { className: `${RF.CLS}-chatrow__title` }, RF.chatRows.t('chat.changelog'))),
      h('div', { className: `${RF.CLS}-chatrow__body` },
        h('div', { className: `${RF.CLS}-row` }, modes.map(mode => h(RF.ui.Button, {
          key: mode,
          label: RF.chatRows.t(`log.${mode}`),
          variant: 'secondary',
          onClick: () => RF.actions?.callTool?.(RF.TOOL_IDS.rollback, { mode }),
        }))),
        entries.map(entry => h('div', { key: entry.id, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__sub` }, entry.at ?? ''),
            h('div', { className: `${RF.CLS}-row__title` }, entry.summary ?? '')),
          entry.drifted === true ? h(RF.ui.Pill, { label: RF.chatRows.t('log.drifted'), tone: 'failed' }) : null))));
  };
})(RF);
