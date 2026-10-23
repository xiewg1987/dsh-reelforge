/* ─────────────────────────────────────────────────────────────────────────────
 * 快捷键注册与 `resolve`（§10.4 · R11 / R12 / R13）。
 *
 * 快捷键服务是**客户端**服务（`packages/client/shortcuts`），所以本文件在 `src/client/` 下。
 *
 * 键位用 `Ctrl+Alt+` 区间避开宿主已占用的默认键位（R11 清单里的
 * `⌘K ⌘/ ⌘N ⌘O ⌘G ⌘F ⌘A ⌘B ⌘\ ⌘↵ ⌘W ⌘R ⌘, ⌘P ⌘T` 与 `Ctrl+\`` 全部是单修饰键，
 * 与 `Ctrl+Alt+X` 不冲突）。
 *
 * **不声明 `web:linux`**（R13）：该平台只支持 3 种组合，
 * `control+alt` 会被宿主判定为「Unsupported Web shortcut」。
 *
 * `resolve` 的前置检查（不查会抛异常）：
 *   1. `ctx.sidebarRight.mounted.getSnapshot()` 为假 → `{ status:'blocked', reason:'no session surface is mounted' }`
 *   2. 否则 → 打开 kind = `reelforge-workbench` 的 Tab → `{ status:'handled', run }`
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 右栏未挂载会话时的固定理由文案（契约要求逐字一致）。 */
  RF.NO_SESSION_REASON = 'no session surface is mounted';

  /** 快捷键 id 必须匹配 R12 的正则。 */
  RF.SHORTCUT_ID_PATTERN = /^[a-z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)+$/;

  /** 三个命令的键位（键码 + 修饰键）。`web:macos` 用 meta+alt：宿主只接受 primary+alt。 */
  RF.SHORTCUT_COMMANDS = [
    { id: RF.SHORTCUT_IDS.workbench, code: 'KeyR', focus: 'chapters' },
    { id: RF.SHORTCUT_IDS.shots, code: 'KeyS', focus: 'shots' },
    { id: RF.SHORTCUT_IDS.player, code: 'KeyP', focus: 'output' },
  ];

  /**
   * 注册三个快捷键。
   * @param {object} ctx - 客户端上下文。
   * @returns {void}
   */
  RF.registerShortcuts = function registerShortcuts(ctx) {
    const t = typeof RF.t === 'function' ? RF.t : (key) => key;
    for (const command of RF.SHORTCUT_COMMANDS) {
      ctx.effect(() => ctx.shortcuts.register({
        id: command.id,
        label: () => t('title'),
        aliases: [`reelforge ${command.focus}`],
        defaults: {
          'desktop:macos': { code: command.code, modifiers: ['control', 'alt'] },
          'desktop:windows': { code: command.code, modifiers: ['control', 'alt'] },
          'desktop:linux': { code: command.code, modifiers: ['control', 'alt'] },
          // macOS Web 只接受 primary+alt 或三修饰键；`control+alt` 会被判为不支持。
          'web:macos': { code: command.code, modifiers: ['meta', 'alt'] },
          'web:windows': { code: command.code, modifiers: ['control', 'alt'] },
          // ⚠️ 故意**不声明** web:linux 这一档（R13）。
        },
        regions: ['page', 'editable'],
        modals: [],
        resolve: () => {
          const mounted = ctx.sidebarRight && ctx.sidebarRight.mounted;
          const isMounted = mounted !== undefined && mounted !== null
            && typeof mounted.getSnapshot === 'function'
            && mounted.getSnapshot() !== undefined
            && mounted.getSnapshot() !== null;
          if (!isMounted) {
            return { status: 'blocked', reason: RF.NO_SESSION_REASON };
          }
          return {
            status: 'handled',
            run: () => {
              ctx.sidebarRight.openTab(RF.TAB_KIND, { params: { focus: command.focus } });
            },
          };
        },
      }), `reelforge: shortcut ${command.id}`);
    }
  };
})(RF);
