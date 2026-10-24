/* ─────────────────────────────────────────────────────────────────────────────
 * v6 自有 UI 模块（设计稿 §3）—— 只用 `--dsw-alias-*` / `--rf-*`。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  RF.renderChapterUnitBadge = function renderChapterUnitBadge(props) {
    return h('span', { className: `${RF.CLS}-badge` }, props.t('v6.chapterUnit'));
  };

  RF.renderDualEntry = function renderDualEntry(props) {
    return h('div', { className: `${RF.CLS}-dual-entry` },
      h('div', { className: `${RF.CLS}-dual-entry__half` }, props.t('v6.dualEntry.chat')),
      h('div', { className: `${RF.CLS}-dual-entry__half` }, props.t('v6.dualEntry.panel')));
  };

  RF.renderChatSync = function renderChatSync(props) {
    const project = props.project ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const text = String(project.input?.text ?? '').trim();
    const position = String(project.runPosition ?? '');
    let message = props.t('v6.chatSync.empty');
    if (chapters.length > 0) {
      message = props.t('v6.chatSync.imported', {
        count: chapters.length,
        pending: position === '' ? props.t('v6.chatSync.needRun') : props.t('v6.chatSync.ready'),
      });
    } else if (text !== '') {
      message = props.t('v6.chatSync.captured');
    }
    return h('div', { className: `${RF.CLS}-chat-sync` }, message);
  };

  RF.renderCostThermometer = function renderCostThermometer(props) {
    const spent = Number(props.project?.cost?.spent) || 0;
    const cap = Number(props.project?.cost?.cap) || 0;
    const ratio = cap > 0 ? Math.min(1, spent / cap) : 0;
    const warn = cap > 0 && spent / cap >= 0.8;
    return h('div', { className: `${RF.CLS}-cost-row` },
      h('div', { className: `${RF.CLS}-cost-track` },
        h('div', {
          className: `${RF.CLS}-cost-fill${warn ? ` ${RF.CLS}-cost-fill--warn` : ''}`,
          style: { width: `${Math.round(ratio * 100)}%` },
        })),
      h('span', { className: `${RF.CLS}-cost-label` }, props.t('v6.cost', {
        spent: RF.formatMoney(spent),
        cap: RF.formatMoney(cap),
      })));
  };

  RF.renderStageDNA = function renderStageDNA(props) {
    const project = props.project ?? {};
    const stage = RF.stageStepsState(project);
    return h('div', { className: `${RF.CLS}-stage-dna` },
      h('div', { className: `${RF.CLS}-stage-dna__steps` },
        RF.STAGE_STEPS.map((step, index) => h('span', {
          key: step,
          className: `${RF.CLS}-stage-dna__dot${index === stage.current ? ` ${RF.CLS}-stage-dna__dot--current` : index < stage.current ? ` ${RF.CLS}-stage-dna__dot--passed` : ''}`,
          title: props.t(`stage.${step}`),
        }))),
      h('div', { className: `${RF.CLS}-stage-dna__bars` },
        RF.STAGES.map(stageId => h('span', {
          key: stageId,
          className: `${RF.CLS}-stage-dna__bar${stageId === 'tts' ? ` ${RF.CLS}-stage-dna__bar--active` : ''}`,
          title: props.t(`stages.${stageId}`),
        }))));
  };

  RF.renderAskStrip = function renderAskStrip(props) {
    return h('div', { className: `${RF.CLS}-ask-strip` }, props.message ?? props.t(props.messageKey));
  };

  RF.renderNextHint = function renderNextHint(props) {
    return h('div', { className: `${RF.CLS}-next-hint` }, props.t(props.hintKey));
  };

})(RF);
