/* ─────────────────────────────────────────────────────────────────────────────
 * 01 · 枢纽首页（v6 Hub，设计稿 01-RF-Hub）。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  function emptyOf(props) {
    return h(RF.ui.EmptyState, {
      title: props.t('empty.hub'),
      hint: props.t('empty.hubHint'),
      action: h(RF.ui.Button, {
        label: props.t('v6.firstRun.openRunStack'),
        variant: 'primary',
        onClick: () => {
          props.state.setDeviceExpanded(true);
          props.state.goFlow('runstack');
        },
      }),
    });
  }

  RF.tabHub = function tabHub(props) {
    const t = props.t;
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const shots = Array.isArray(project.shots) ? project.shots : [];
    if (chapters.length === 0) return emptyOf(props);

    const position = RF.currentPosition(project);
    const chapterSeq = position === null ? Number(chapters[0]?.id) || 1 : Number(position.chapter);
    const chapterShots = shots.filter(shot => Number(shot.seq) === chapterSeq);
    const visibleShots = chapterShots.slice(0, 4);
    const rest = chapterShots.length - visibleShots.length;

    return h('div', null,
      RF.renderCostThermometer({ t, project }),
      RF.renderStageDNA({ t, project }),
      RF.renderChatSync({ t, project }),
      h(RF.ui.SectionLabel, null, t('v6.hub.chapterProgress')),
      h(RF.ui.Card, null,
        chapters.map(chapter => h('div', { key: chapter.id ?? chapter.title, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` },
              `${chapter.shotCount ?? 0} ${t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`)),
          h(RF.ui.Pill, {
            label: RF.labelOf('chapter.status', chapter.status, t),
            tone: chapter.status ?? 'queued',
          })))),
      h('div', { className: `${RF.CLS}-note` }, t('chapter.unit')),
      h(RF.ui.SectionLabel, null, t('v6.hub.shotScript')),
      visibleShots.length === 0
        ? h('div', { className: `${RF.CLS}-note` }, t('v6.hub.noShots'))
        : visibleShots.map(shot => h(RF.ui.Card, {
          key: shot.id ?? `${shot.seq}-${shot.idx}`,
          state: 'default',
        },
          h('div', { className: `${RF.CLS}-row__title` }, shot.label ?? shot.id),
          h('div', { className: `${RF.CLS}-row__sub` },
            `${shot.shotSize ?? ''} · ${RF.formatDuration(shot.duration ?? 0)} · ${shot.aspectRatio ?? ''}`))),
      rest > 0
        ? h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('v6.hub.moreShots', { count: rest }),
            variant: 'secondary',
            onClick: () => props.state.goTab('shots'),
          }))
        : null,
      RF.renderNextHint({ t, hintKey: 'v6.hub.nextHint' }));
  };
})(RF);
