/* ─────────────────────────────────────────────────────────────────────────────
 * 断点判定：**按实测宽度**判，不按窗口宽（设计方案 §4.3）。
 *
 * 右栏宽度区间 300–1150，永远全高：
 *   < 420        窄栏：单列；表格降为卡片流
 *   420 – 559    单列（净宽不足 520，放不下设计稿的两列网格）
 *   ≥ 560        两列网格启用
 *
 * ## 560 这个阈值是**从设计稿栅格推出来的**，不是拍的
 *
 * `design/STYLE-SPEC.md` §1 栅格：左右外边距 20px ⇒ 内容净宽 **520**；
 * **两列网格每列 254、列间距 12**（`20 + 254 + 12 + 254 = 540`）。
 * ⇒ 面板宽度 ≥ `20 + 520 + 20 = 560` 时，两列网格才与设计稿 **1:1** 对上。
 *
 * 设计稿 §6 明确要求两列的画板有三块：`RF/RunMode`（两张并列大卡 254×280）、
 * `RF/Plan`（**2×2 矩阵** 254×150 四卡）、`RF/Assets`（两列网格 254 宽）。
 *
 * ⚠️ 阈值之前写的是 **900** —— 那是把验收门禁的**测试宽度档**
 * （300 / 560 / 900 / 1150）误当成了列数阈值。后果是：这三块板在右栏里
 * **永远退化成单列**，与设计稿正好相反（实机截图抓到：板 03 的两张大卡
 * 上下堆叠、板 05 的 2×2 矩阵竖着排）。
 *
 * 画板 560×900 是**设计稿比例**，不是运行时比例；9:16 只作为成片画幅出现在播放器画面区。
 * ─────────────────────────────────────────────────────────────────────────── */
;(function (RF) {
  'use strict';

  /**
   * 断点常量（宽度以 CSS 像素计）。
   *
   * - `narrow = 420`：窄栏 —— 表格降为卡片流。
   * - `wide = 560`：**两列网格的门槛**（净宽 ≥ 520 = STYLE-SPEC §1 的两列网格净宽）。
   */
  RF.BREAKPOINTS = { narrow: 420, wide: 560 };

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
