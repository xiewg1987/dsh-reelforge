/* ─────────────────────────────────────────────────────────────────────────────
 * 断点判定：**按实测宽度**判，不按窗口宽（§4.3）。
 *
 * 右栏宽度区间 300–1150，永远全高：
 *   < 420        单列；两列网格降为一列；表格降为卡片流
 *   420 – 899    单列为主，两列网格可用
 *   ≥ 900        两列网格启用
 *
 * 画板 560×900 是**设计稿比例**，不是运行时比例；9:16 只作为成片画幅出现在播放器画面区。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /** 断点常量（宽度以 CSS 像素计）。 */
  RF.BREAKPOINTS = { narrow: 420, wide: 900 };

  /**
   * 宽度 → 断点名。
   * @param {number} width - 实测宽度。
   * @returns {string} `narrow` | `medium` | `wide`。
   */
  RF.breakpointFor = function breakpointFor(width) {
    const value = Number(width);
    if (!Number.isFinite(value)) return 'medium';
    if (value < RF.BREAKPOINTS.narrow) return 'narrow';
    if (value < RF.BREAKPOINTS.wide) return 'medium';
    return 'wide';
  };

  /**
   * 宽度 → 两列网格的列数。
   * @param {number} width - 实测宽度。
   * @returns {number} 1 或 2。
   */
  RF.columnsFor = function columnsFor(width) {
    return RF.breakpointFor(width) === 'wide' ? 2 : 1;
  };

  /**
   * 宽度 → 表格是否降为卡片流。
   * @param {number} width - 实测宽度。
   * @returns {boolean} 是否降级为卡片流。
   */
  RF.isCardFlow = function isCardFlow(width) {
    return RF.breakpointFor(width) === 'narrow';
  };
})(RF);
