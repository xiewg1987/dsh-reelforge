/* ─────────────────────────────────────────────────────────────────────────────
 * 流程屏（设计稿 02 / 03 / 04 / 05 / 06 / 16）。
 *
 * ## 为什么是「独立屏」而不是页签
 *
 * 设计稿 17 号板自己写明：右栏工作台是 **7 个页签**（章节 / 分镜 / 资产 / 上下文 /
 * 技能 / 成片 / 日志）—— 那是**项目视图**。
 * 板 02–06 的公共骨架只有 4 条（Header / StageBar / Scroll / Footer），**没有页签条**，
 * 它们按用户操作流程串成一条链：导入 → 运行位置 → 设备检查 → 执行路径 → 执行阶段。
 * 板 16 是跨流程规范板（降级矩阵）。
 *
 * ⇒ **两层并存**：项目视图（7 页签）+ 流程屏（这 6 块）。13 个页签在 326–547px 的右栏放不下。
 *
 * ## 三条纪律
 *
 * 1. **没有写入口的控件一律禁用 + 说清缺什么** —— 不许留「点了没反应」的按钮。
 * 2. **不编数据**：没有的字段显示「未接入 / 未设置」，不拿样例值冒充真实值。
 * 3. 业务数据只从宿主投影读（R1）；组件里的 `useState` 只放交互态。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 设备检查的 9 行（设计稿 04 号板的行序）。
   *
   * 「GPU」不是独立探测项 —— 型号是 `vram` 探测的副产品（`nvidia-smi` 一次问两件事），
   * 所以那一行从 `vram` 的 `gpuName` 取。
   *
   * @typedef {object} DeviceRow
   * @property {string} id 探测项 id（`gpu` 是从 `vram` 派生的行）。
   * @property {string} labelKey 行名词条。
   * @property {string} methodKey 探测方式词条。
   * @property {function} extra 补充值（由探测项算出）。
   */

  /** @type {DeviceRow[]} */
  var DEVICE_ROWS = [
    {
      id: 'comfy',
      labelKey: 'flow.device.row.comfy',
      methodKey: 'flow.device.method.comfy',
      extra: function (item) { return String(item?.value ?? ''); },
    },
    {
      id: 'ckVersion',
      labelKey: 'flow.device.row.ckVersion',
      methodKey: 'flow.device.method.ckVersion',
      extra: function () { return '≥ 0.2.36'; },
    },
    {
      id: 'vram',
      labelKey: 'flow.device.row.vram',
      methodKey: 'flow.device.method.vram',
      extra: function () { return '门槛 8 GB'; },
    },
    {
      id: 'gpu',
      labelKey: 'flow.device.row.gpu',
      methodKey: 'flow.device.method.gpu',
      extra: function (item) { return String(item?.source ?? ''); },
    },
    {
      id: 'ffmpeg',
      labelKey: 'flow.device.row.ffmpeg',
      methodKey: 'flow.device.method.ffmpeg',
      extra: function () { return '在 PATH'; },
    },
    {
      id: 'encoders',
      labelKey: 'flow.device.row.encoders',
      methodKey: 'flow.device.method.encoders',
      extra: function (item) {
        const list = Array.isArray(item?.value) ? item.value : [];
        return list.join(' / ');
      },
    },
    {
      id: 'disk',
      labelKey: 'flow.device.row.disk',
      methodKey: 'flow.device.method.disk',
      extra: function (item) {
        const value = Number(item?.value);
        return Number.isFinite(value) ? `${value} GB` : '';
      },
    },
    {
      id: 'llm',
      labelKey: 'flow.device.row.llm',
      methodKey: 'flow.device.method.llm',
      extra: function () { return '阶段一可用'; },
    },
    {
      id: 'provider',
      labelKey: 'flow.device.row.provider',
      methodKey: 'flow.device.method.provider',
      extra: function (item, view) {
        const specs = view?.specs ?? {};
        return `${specs.total ?? 0} 套 · 本地 ${specs.local ?? 0} / 云端 ${specs.cloud ?? 0}`;
      },
    },
  ];

  /**
   * 找探测项。
   * @param {object} report 探测报告。
   * @param {string} id 探测项 id。
   * @returns {object | undefined} 探测项。
   */
  function itemOf(report, id) {
    const items = Array.isArray(report?.items) ? report.items : [];
    return items.find(item => item?.id === id);
  }

  /**
   * 探测项的状态色（done / failed / queued）。
   * @param {object | undefined} item 探测项。
   * @returns {string} 色调。
   */
  function itemTone(item) {
    const status = String(item?.status ?? '');
    if (status === 'ok') return 'done';
    if (status === 'failed') return 'failed';
    if (status === 'warn') return 'queued';
    return 'queued';
  }

  /**
   * 探测结论的文案（状态点旁边的字）。
   * @param {object | undefined} item 探测项。
   * @returns {string} 结论。
   */
  function itemVerdict(item) {
    const status = String(item?.status ?? '');
    if (status === 'ok') return RF.locale?.zh?.['flow.device.ok'] ?? '已通过';
    if (status === 'warn') return String(item?.message ?? '');
    return String(item?.message ?? '');
  }

  /**
   * 02 · 小说导入与自动拆章。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowIntake = function flowIntake(props) {
    const t = props.t;
    const project = props.project ?? {};
    const intake = project.intake ?? {};
    const settings = project.settings ?? {};
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];
    const headings = Array.isArray(intake.headings) ? intake.headings : [];
    const fallbackChars = Number(intake.fallbackChars) || 0;
    const text = String(props.state.novelText ?? '');

    return h('div', null,
      RF.renderDualEntry({ t }),
      RF.renderChatSync({ t, project }),
      // ── 来源卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.sourceLabel')),
        h(RF.ui.MetaRow, { label: t('flow.intake.chars'), value: String(intake.chars ?? 0) }),
        headings.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.intake.noHeadings'))
          : h('div', null, headings.slice(0, 5).map(heading => h('div', {
            key: `heading-${heading.seq}`,
            className: `${RF.CLS}-row`,
          },
          h('span', { className: `${RF.CLS}-row__title` }, heading.title ?? '')))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.fallbackRule', {
          count: headings.length,
          fallback: fallbackChars,
        }))),

      // ── 导入入口（正文 + 导入按钮）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.importLabel')),
        h('textarea', {
          className: `${RF.CLS}-input ${RF.CLS}-textarea`,
          value: text,
          placeholder: t('flow.intake.importPlaceholder'),
          onChange: event => props.state.setNovelText(event?.target?.value ?? ''),
        }),
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Button, {
            label: t('flow.intake.importAction'),
            variant: 'primary',
            disabled: text.trim() === '',
            title: text.trim() === '' ? t('flow.intake.importDisabled') : undefined,
            onClick: () => props.state.importNovel(),
          })),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.safetyNote'))),

      // ── 自动拆章预览卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.previewLabel')),
        chapters.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.intake.previewEmpty'))
          : h('div', null, chapters.map(chapter => h('div', {
            key: chapter.id ?? chapter.title,
            className: `${RF.CLS}-row`,
          },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, chapter.title ?? ''),
            h('div', { className: `${RF.CLS}-row__sub` },
              `${chapter.shotCount ?? 0} ${t('unit.shot')} · ${RF.formatDuration(chapter.durationSec ?? 0)}`))))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.previewRule'))),

      // ── 项目设置卡（只读 + 说清为什么改不了）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.settingsLabel')),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.aspectRatio'),
          value: settings.aspectRatio === '' ? t('flow.intake.unset') : settings.aspectRatio,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.resolution'),
          value: settings.resolution === '' ? t('flow.intake.unset') : settings.resolution,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.targetDuration'),
          value: settings.targetDuration === null || settings.targetDuration === undefined
            ? t('flow.intake.durationUnlimited')
            : `${settings.targetDuration}s`,
        }),
        h(RF.ui.MetaRow, {
          label: t('flow.intake.setting.bgm'),
          value: settings.enableBgm === true ? t('common.on') : t('common.off'),
        }),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.intake.settingsReadonly'))),

      // ── 待确认卡 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.intake.pendingLabel')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.intake.pendingEmpty'))));
  };

  /**
   * 03 · 运行位置选择。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowRunMode = function flowRunMode(props) {
    const t = props.t;
    const project = props.project ?? {};
    const plan = project.plan ?? null;
    const current = String(project.runPosition ?? '');
    const pending = String(props.state.pendingPosition ?? '');
    const provider = String(project.provider ?? '');
    const clouds = RF.CLOUD_PROVIDERS;

    const positionCard = (position, title, subtitle, pros, cons) => {
      const selected = (current !== '' ? current : pending) === position;
      return h(RF.ui.Card, {
        key: position,
        state: selected ? 'selected' : 'default',
        onClick: () => props.state.choosePosition(position),
      },
      h(RF.ui.Pill, { label: position.toUpperCase(), tone: selected ? 'running' : 'queued' }),
      h('div', { className: `${RF.CLS}-row__title` }, t(title)),
      h('div', { className: `${RF.CLS}-row__sub` }, t(subtitle)),
      h('div', null, pros.map(pro => h('div', { key: `pro-${pro}`, className: `${RF.CLS}-row__sub` },
        `· ${t(pro)}`))),
      h('div', null, cons.map(con => h('div', { key: `con-${con}`, className: `${RF.CLS}-note ${RF.CLS}-note--warn` },
        `· ${t(con)}`))),
      position === 'local'
        ? h('div', { className: `${RF.CLS}-row` }, h(RF.ui.Button, {
          label: t('flow.runmode.deviceCheck'),
          variant: 'secondary',
            onClick: event => {
            if (event?.stopPropagation) event.stopPropagation();
            props.state.setDeviceExpanded(true);
            props.state.reloadProbe();
          },
        }))
        : h('div', { className: `${RF.CLS}-row__sub` }, t('flow.runmode.providersAvailable', { count: clouds.length })));
    };

    return h('div', null,
      h(RF.ui.SectionLabel, null, t('flow.runmode.sectionLabel')),
      h('div', { className: `${RF.CLS}-note` }, t('flow.runmode.sectionNote')),
      h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        positionCard(
          'local',
          'flow.runmode.localTitle',
          'flow.runmode.localSubtitle',
          ['flow.runmode.local.pro1', 'flow.runmode.local.pro2', 'flow.runmode.local.pro3'],
          ['flow.runmode.local.con1', 'flow.runmode.local.con2', 'flow.runmode.local.con3'],
        ),
        positionCard(
          'cloud',
          'flow.runmode.cloudTitle',
          'flow.runmode.cloudSubtitle',
          ['flow.runmode.cloud.pro1', 'flow.runmode.cloud.pro2', 'flow.runmode.cloud.pro3'],
          ['flow.runmode.cloud.con1', 'flow.runmode.cloud.con2', 'flow.runmode.cloud.con3'],
        )),

      // ── 云端 provider 三选一（当前配置值是唯一事实源）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.runmode.providerLabel')),
        h('div', { className: `${RF.CLS}-row` }, clouds.map(item => h(RF.ui.Pill, {
          key: item,
          label: RF.labelOf('provider', item, t),
          tone: provider === item ? 'done' : 'queued',
        }))),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.runmode.providerReadonly'))),

      // ── 影响对照表四行 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.runmode.compareLabel')),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.kinds'), value: t('flow.runmode.compare.kindsValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.diff'), value: t('flow.runmode.compare.diffValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.cost'), value: t('flow.runmode.compare.costValue') }),
        h(RF.ui.MetaRow, { label: t('flow.runmode.compare.limit'), value: t('flow.runmode.compare.limitValue') })),

      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.runmode.switchable'))),
      h('div', { className: `${RF.CLS}-note` }, t('flow.runmode.footerHint')));
  };

  /**
   * 04 · 本地档设备检查。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowDevice = function flowDevice(props) {
    const t = props.t;
    const probe = props.state.probe ?? null;

    if (probe === null) {
      return h('div', null, h(RF.ui.EmptyState, { title: t('flow.device.loading'), hint: t('empty.hint') }));
    }
    if (probe.error !== undefined && probe.error !== null && probe.error !== '') {
      return h('div', null, h(RF.ui.EmptyState, {
        title: t('flow.device.failed'),
        hint: String(probe.error),
        tone: 'error',
      }), h(RF.ui.Button, {
        label: t('flow.device.retry'),
        variant: 'secondary',
        onClick: () => props.state.reloadProbe(),
      }));
    }

    const view = probe.view ?? {};
    const report = view.report ?? {};
    const items = Array.isArray(report.items) ? report.items : [];
    const blockers = Array.isArray(report.blockers) ? report.blockers : [];
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const vram = itemOf(report, 'vram');
    const vramGb = Number(vram?.value);
    const vramOk = Number.isFinite(vramGb) && vramGb >= 8;

    // 设计稿 9 行之外的探测项：**失败才显示**（成功的那条没有信息量）。
    const extraFailures = items.filter(item => (
      !DEVICE_ROWS.some(row => row.id === item?.id) && String(item?.status ?? '') === 'failed'
    ));

    return h('div', null,
      // ── 检测状态条 ──
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.done', {
              count: items.length,
              seconds: ((Number(view.at) || 0) > 0 ? ((Date.now() - Number(view.at)) / 1000).toFixed(1) : '0.0'),
            })),
            h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.footnote'))),
          h(RF.ui.Button, {
            label: t('flow.device.recheck'),
            variant: 'secondary',
            disabled: probe.loading === true,
            onClick: () => props.state.reloadProbe(),
          }))),

      // ── 9 行探测表 ──
      h(RF.ui.SectionLabel, null, t('flow.device.tableLabel')),
      h(RF.ui.Card, null,
        DEVICE_ROWS.map(row => {
          const item = row.id === 'gpu' ? vram : itemOf(report, row.id);
          return h('div', { key: row.id, className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, t(row.labelKey)),
              h('div', { className: `${RF.CLS}-row__sub` }, t(row.methodKey))),
            h(RF.ui.Pill, {
              label: itemVerdict(item),
              tone: itemTone(item),
            }));
        }),
        extraFailures.map(item => h('div', { key: `extra-${item.id}`, className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.row.videoBackend')),
            h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.method.videoBackend'))),
          h(RF.ui.Pill, { label: String(item.message ?? ''), tone: 'failed' }))),
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.tableNote'))),

      // ── 结论卡 ──
      blockers.length > 0
        // 板 04 号板：结论卡是**红底**（ERROR-SURF），不是普通卡面。
        ? h(RF.ui.Card, { tone: 'error' },
          h('div', { className: `${RF.CLS}-row__title ${RF.CLS}-note--error` }, t('flow.device.conclusionTitle')),
          blockers.map(blocker => h('div', {
            key: `blocker-${blocker.id}`,
            className: `${RF.CLS}-row__sub`,
          }, `· ${String(blocker.message ?? '')}`)),
          h('div', { className: `${RF.CLS}-row` },
            h(RF.ui.Button, {
              label: t('flow.device.toCloud'),
              variant: 'primary',
              onClick: () => props.state.choosePosition('cloud'),
            }),
            h(RF.ui.Button, {
              label: t('flow.device.onlyImage'),
              variant: 'secondary',
              onClick: () => props.state.runStage('image'),
            })))
        : h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row__title` }, t('flow.device.allOk')),
          warnings.map(warning => h('div', {
            key: `warn-${warning.id}`,
            className: `${RF.CLS}-note ${RF.CLS}-note--warn`,
          }, `· ${String(warning.message ?? '')}`))),

      // ── 本地仍可完成 ──
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.device.localStillLabel')),
        h('div', { className: `${RF.CLS}-row` },
          h(RF.ui.Pill, { label: t('flow.device.localStill.storyboard'), tone: 'queued' }),
          h(RF.ui.Pill, { label: t('flow.device.localStill.references'), tone: 'queued' }),
          h(RF.ui.Pill, { label: t('flow.device.localStill.compose'), tone: 'queued' })),
        h('div', { className: `${RF.CLS}-note` }, t('flow.device.bottomNote'))),

      vramOk
        ? null
        : h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.device.vramHint', {
          have: Number.isFinite(vramGb) ? vramGb : 0,
          need: 8,
        })));
  };

  /**
   * 05 · 执行路径（kind × 位置矩阵）。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowPlan = function flowPlan(props) {
    const t = props.t;
    const project = props.project ?? {};
    const plan = project.plan ?? null;
    const matrix = Array.isArray(project.planMatrix) ? project.planMatrix : [];
    const position = String(props.state.pendingPosition ?? (plan?.position ?? ''));

    /** 矩阵里 kind 的分组（设计稿：图像 = t2i/i2i，视频 = r2v/tts/music）。 */
    var GROUPS = [
      { key: 'image', kinds: ['t2i', 'i2i'], label: 'flow.plan.group.image' },
      { key: 'video', kinds: ['r2v', 'tts', 'music'], label: 'flow.plan.group.video' },
    ];

    const cell = (group, where) => {
      const rows = matrix.filter(row => group.kinds.includes(String(row?.kind ?? '')));
      const brief = where === 'local'
        ? rows.map(row => row?.local).find(Boolean)
        : rows.map(row => row?.cloud).find(Boolean);
      const selected = plan !== null
        && String(plan.position ?? '') === where
        && group.kinds.includes(String(plan.kind ?? ''));
      return h(RF.ui.Card, {
        key: `${group.key}-${where}`,
        state: selected ? 'selected' : 'default',
        onClick: () => props.state.choosePosition(where),
      },
      h('div', { className: `${RF.CLS}-row__title` }, t(group.label)),
      h('div', { className: `${RF.CLS}-row__sub` }, t(where === 'local' ? 'flow.plan.localSub' : 'flow.plan.cloudSub')),
      h('div', { className: `${RF.CLS}-row__sub` }, t('flow.plan.specCount', { count: rows.length })),
      brief
        ? h('div', { className: `${RF.CLS}-row__sub` }, brief.sourceFile ?? '')
        : h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.plan.noSpec')),
      where === 'cloud'
        ? h('div', { className: `${RF.CLS}-row__sub` }, t('flow.plan.billed'))
        : null);
    };

    /**
     * 规格 id（拿不到就说「这一档没有规格」，不编）。
     * @param {object | null | undefined} brief 规格摘要。
     * @returns {string} 规格 id。
     */
    const specIdOf = (brief) => {
      const id = String(brief?.id ?? '');
      return id === '' ? t('flow.plan.noSpec') : id;
    };

    return h('div', null,
      h(RF.ui.SectionLabel, null, t('flow.plan.axisLabel')),
      h('div', { className: `${RF.CLS}-grid${props.state.twoColumns ? ` ${RF.CLS}-grid--two` : ''}` },
        cell(GROUPS[0], 'local'),
        cell(GROUPS[0], 'cloud'),
        cell(GROUPS[1], 'local'),
        cell(GROUPS[1], 'cloud')),

      // ── kind → 规格映射 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.plan.mappingLabel')),
        matrix.map(row => h('div', {
          key: String(row?.kind ?? ''),
          className: `${RF.CLS}-row`,
          onClick: () => props.state.chooseKind(String(row?.kind ?? '')),
        },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, String(row?.kind ?? '')),
          // 板 05 号板：「t2i → 文生图 · local_sdxl_t2i / cloud_h3_t2i」
          // —— 同一 kind 的**两套 sourceFile**，不是两档能力（少一列就讲不清这件事）。
          h('div', { className: `${RF.CLS}-row__sub` },
            `${t(`flow.plan.kind.${row?.kind ?? ''}`)} · `
            + `${t('flow.plan.spec.local')} ${specIdOf(row?.local)} / `
            + `${t('flow.plan.spec.cloud')} ${specIdOf(row?.cloud)}`)),
        h(RF.ui.Pill, {
          label: plan !== null && String(plan.kind ?? '') === String(row?.kind ?? '') ? t('flow.plan.current') : '',
          tone: plan !== null && String(plan.kind ?? '') === String(row?.kind ?? '') ? 'running' : 'queued',
        }))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.plan.mappingNote'))),

      // ── 辅助评分（没有评分器 ⇒ 明说，不编数字）──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.plan.scoreLabel')),
        h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.plan.scoreMissing')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.plan.bottomNote'))));
  };

  /**
   * 06 · 四阶段勾选。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowStages = function flowStages(props) {
    const t = props.t;
    const project = props.project ?? {};
    const stages = project.stages ?? {};
    const global = Array.isArray(stages.global) ? stages.global : [];
    const byChapter = Array.isArray(stages.byChapter) ? stages.byChapter : [];
    const chapters = Array.isArray(project.chapters) ? project.chapters : [];

    return h('div', null,
      // ── 四张全局阶段卡 ──
      RF.STAGES.map((stage, index) => {
        const enabled = global.includes(stage);
        // 板 06 号板：阶段卡选中态 = 蓝描边 **+ 左侧 4px 蓝条**（`accent`）。
        return h(RF.ui.Card, { key: stage, state: enabled ? 'selected' : 'default', accent: true },
          h('div', { className: `${RF.CLS}-row` },
            h('div', { className: `${RF.CLS}-row__main` },
              h('div', { className: `${RF.CLS}-row__title` }, stage),
              h('div', { className: `${RF.CLS}-row__sub` }, t(`flow.stages.${stage}.sub`)),
              h('div', { className: `${RF.CLS}-note` }, t(`flow.stages.${stage}.hint`))),
            h(RF.ui.Pill, { label: `STAGE ${index + 1}`, tone: enabled ? 'running' : 'queued' })));
        }),
      h('div', { className: `${RF.CLS}-note ${RF.CLS}-note--warn` }, t('flow.stages.readonly')),

      // ── 显存门槛提示条 ──
      // 板 06 号板：这条是**黄底**（WARN-SURF），不是普通卡面。
      h(RF.ui.Card, { tone: 'warn' },
        h('div', { className: `${RF.CLS}-row__title ${RF.CLS}-note--warn` }, t('flow.stages.vramTitle')),
        h('div', { className: `${RF.CLS}-note` }, t('flow.stages.vramNote'))),

      // ── 按章勾选 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.stages.byChapterLabel')),
        byChapter.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.stages.noChapter'))
          : byChapter.map(row => {
            const chapter = chapters.find(item => Number(item?.id) === Number(row?.seq));
            const list = Array.isArray(row?.stages) ? row.stages : [];
            return h('div', { key: String(row?.seq ?? ''), className: `${RF.CLS}-row` },
              h('div', { className: `${RF.CLS}-row__main` },
                h('div', { className: `${RF.CLS}-row__title` },
                  t('flow.stages.chapterRow', {
                    seq: row?.seq ?? '',
                    name: chapter?.title ?? '',
                  })),
                h('div', { className: `${RF.CLS}-row__sub` },
                  list.length === 0
                    ? t('flow.stages.chapterPending')
                    : list.map(stage => t(`stages.${stage}`)).join(' · '))));
          }),
        h('div', { className: `${RF.CLS}-note` }, t('flow.stages.bottomNote'))));
  };

  /**
   * 16 · 降级矩阵。
   * @param {{ t: function, project: object, state: object }} props - 属性。
   * @returns {object} React 元素。
   */
  RF.flowDegraded = function flowDegraded(props) {
    const t = props.t;
    const probe = props.state.probe ?? null;

    if (probe === null) {
      return h('div', null, h(RF.ui.EmptyState, { title: t('flow.degrade.loading'), hint: t('empty.hint') }));
    }
    if (probe.error !== undefined && probe.error !== null && probe.error !== '') {
      return h('div', null, h(RF.ui.EmptyState, {
        title: t('flow.degrade.failed'),
        hint: String(probe.error),
        tone: 'error',
      }), h(RF.ui.Button, {
        label: t('flow.device.retry'),
        variant: 'secondary',
        onClick: () => props.state.reloadProbe(),
      }));
    }

    const degrade = probe.view?.degrade ?? {};
    const rows = Array.isArray(degrade.matrix) ? degrade.matrix : [];
    const degradations = Array.isArray(degrade.degradations) ? degrade.degradations : [];
    const notices = Array.isArray(degrade.notices) ? degrade.notices : [];

    /**
     * 产出形态 → 胶囊色调。
     *
     * 板 16 号板明写「每格用 10-11px 文字，绿 #3FB950 / 黄 #D29922 / 红 #F85149」：
     * 绿=有、红=无、**黄=降级但仍交付**。中间那档（静帧成片 / 部分镜 /
     * 静音成片 / 无声成片 / 占位帧）原来落在「排队」的灰色上，
     * 看不出是降级 —— 现在落到黄。
     *
     * @param {string} form 形态（`none` / `text_card` / `placeholder` / `silent` / `full` / `partial`）。
     * @returns {string} 色调。
     */
    const formTone = (form) => {
      if (form === 'none') return 'failed';
      if (form === 'full') return 'done';
      return 'warn';
    };

    return h('div', null,
      // ── 降级矩阵表（板 16 号板：缺失项 × 成片 / 分镜表 / 参考图，7 行 3 列值）──
      // ⚠️ 三列值**都要显示** —— 只显示成片那一列，
      // 「分镜表还在、参考图没了」这种关键事实就说不出来了。
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-matrix` },
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.missingItem')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colVideo')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colStoryboard')),
          h('div', { className: `${RF.CLS}-matrix__head` }, t('flow.degrade.colPack'))),
        rows.map(row => h('div', { key: String(row?.kind ?? ''), className: `${RF.CLS}-matrix` },
          h('div', { className: `${RF.CLS}-row__title` }, t(`degrade.kind.${row?.kind ?? ''}`)),
          h(RF.ui.Pill, {
            label: t(`degrade.video.${row?.video ?? 'none'}`),
            tone: formTone(String(row?.video ?? 'none')),
          }),
          h(RF.ui.Pill, {
            label: row?.storyboard === false ? t('degrade.storyboard.no') : t('degrade.storyboard.yes'),
            tone: row?.storyboard === false ? 'failed' : 'done',
          }),
          h(RF.ui.Pill, {
            label: t(`degrade.pack.${row?.referencePack ?? 'none'}`),
            tone: formTone(String(row?.referencePack ?? 'none')),
          }))),
        h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.matrixNote'))),

      // ── 一次真实降级 ──
      // 板 16 号板：这张卡是**普通面 + 黄描边**（WARN-SURF 用在描边上）。
      degradations.length === 0
        ? h(RF.ui.Card, null,
          h('div', { className: `${RF.CLS}-row__title` }, t('flow.degrade.noneTitle')),
          h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.noneBody')))
        : h(RF.ui.Card, { tone: 'warn-border' },
          h('div', { className: `${RF.CLS}-row__title` }, t(`degrade.kind.${degradations[0].kind ?? ''}`)),
          h('div', { className: `${RF.CLS}-row__sub` }, String(degradations[0].message ?? '')),
          h('div', { className: `${RF.CLS}-row__sub` }, t('flow.degrade.outputsLine', {
            video: t(`degrade.video.${degrade.outputs?.video ?? 'none'}`),
            storyboard: degrade.outputs?.storyboard === false
              ? t('degrade.storyboard.no')
              : t('degrade.storyboard.yes'),
            pack: t(`degrade.pack.${degrade.outputs?.referencePack ?? 'none'}`),
          })),
          h('div', { className: `${RF.CLS}-row` },
            h(RF.ui.Button, {
              label: t('flow.degrade.rerun'),
              variant: 'secondary',
              onClick: () => props.state.runStage('tts'),
            }),
            h(RF.ui.Button, {
              label: t('flow.degrade.accept'),
              variant: 'secondary',
              onClick: () => props.state.goFlow('stages'),
            }))),

      // ── 对话话术 ──
      h(RF.ui.Card, null,
        h(RF.ui.SectionLabel, null, t('flow.degrade.dialogLabel')),
        notices.length === 0
          ? h('div', { className: `${RF.CLS}-note` }, t('flow.degrade.noNotices'))
          : h('div', null, notices.slice(0, 4).map((notice, index) => h('div', {
            key: `notice-${index}`,
            className: `${RF.CLS}-row__sub`,
          }, `· ${String(notice)}`)))));
  };

  /** v6 · 00 引导总览。 */
  var GUIDE_STEPS = [
    { step: 'requirement', descKey: 'flow.guide.step.requirement', targetKey: 'flow.guide.target.intake', go: state => state.goFlow('intake') },
    { step: 'run', descKey: 'flow.guide.step.run', targetKey: 'flow.guide.target.runstack', go: state => state.goFlow('runstack') },
    { step: 'plan', descKey: 'flow.guide.step.plan', targetKey: 'flow.guide.target.plan', go: state => state.goFlow('plan') },
    { step: 'generate', descKey: 'flow.guide.step.generate', targetKey: 'flow.guide.target.stages', go: state => state.goFlow('stages') },
    { step: 'storyboard', descKey: 'flow.guide.step.storyboard', targetKey: 'flow.guide.target.shots', go: state => state.goTab('shots') },
    { step: 'deliver', descKey: 'flow.guide.step.deliver', targetKey: 'flow.guide.target.output', go: state => state.goTab('output') },
  ];

  RF.flowGuide = function flowGuide(props) {
    const t = props.t;
    const currentStep = RF.FLOW_SCREEN_STEPS.guide ?? 'requirement';
    const currentIndex = RF.STAGE_STEPS.indexOf(currentStep);
    return h('div', null,
      h(RF.ui.Card, null,
        h('div', { className: `${RF.CLS}-row__title` }, t('flow.guide.heroTitle')),
        h('div', { className: `${RF.CLS}-row__sub` }, t('flow.guide.heroSub'))),
      RF.renderDualEntry({ t }),
      h(RF.ui.SectionLabel, null, t('flow.guide.stepsLabel')),
      GUIDE_STEPS.map((item, index) => h(RF.ui.Card, {
        key: item.step,
        state: index === currentIndex ? 'selected' : 'default',
      },
        h('div', { className: `${RF.CLS}-row` },
          h('div', { className: `${RF.CLS}-row__main` },
            h('div', { className: `${RF.CLS}-row__title` }, t(`stage.${item.step}`)),
            h('div', { className: `${RF.CLS}-row__sub` }, t(item.descKey))),
          h(RF.ui.Button, {
            label: t('flow.guide.go'),
            variant: 'secondary',
            onClick: () => item.go(props.state),
          })),
        h('div', { className: `${RF.CLS}-note` }, t(item.targetKey)))));
  };

  RF.flowRunStack = function flowRunStack(props) {
    const t = props.t;
    const project = props.project ?? {};
    const position = String(project.runPosition ?? props.state.pendingPosition ?? '');
    const expanded = props.state.deviceExpanded === true;
    const probe = props.state.probe ?? null;
    const report = probe?.view?.report ?? {};
    const items = Array.isArray(report.items) ? report.items : [];
    const summary = items.length === 0
      ? t('v6.runstack.devicePending')
      : t('v6.runstack.deviceSummary', { count: items.length });

    return h('div', null,
      RF.renderDualEntry({ t }),
      RF.flowRunMode(props),
      h('div', { className: `${RF.CLS}-row` },
        h('div', { className: `${RF.CLS}-row__main` },
          h('div', { className: `${RF.CLS}-row__title` }, t('v6.runstack.deviceSection')),
          h('div', { className: `${RF.CLS}-row__sub` }, position === 'cloud' ? t('v6.runstack.deviceCloudSkip') : summary)),
        position !== 'cloud'
          ? h(RF.ui.Button, {
            label: expanded ? t('v6.runstack.collapse') : t('v6.runstack.expand'),
            variant: 'secondary',
            onClick: () => props.state.setDeviceExpanded(!expanded),
          })
          : null),
      position !== 'cloud' && expanded ? RF.flowDevice(props) : null,
      RF.renderAskStrip({
        t,
        messageKey: position === 'cloud' ? 'v6.runstack.askCloud' : 'v6.runstack.askLocal',
      }));
  };
})(RF);
