# ReelForge 设计（重开 · RF7）

> **2026-10-24**：`design/` 已清空，从此目录重新起稿。
> **纪律**：只借鉴 [infinite-creation](https://github.com/SwotAtmk/infinite-creation) 的**流程与能力契约**；**页面布局、组件造型、配色、图标一律 ReelForge 原创**，不贴 IC 截图、不复刻 Next 全屏 App。
> **美术管线**：100% 在 ArtCraft 的 **FigCraft** 里确定性排版产出，**不用扩散模型画 UI**。

## 真源顺序

```text
1. 读 REF-flow-infinite-creation.md（借什么 / 不借什么）
2. 读 IA-DSH-右栏.md（信息架构）
3. 读 STYLE-SPEC.md（明/暗两套美术令牌 + FigCraft 布局规则）
4. **改 design/_tools/build-rf7.mjs**（主稿脚本）→ node build-rf7.mjs
   → design/ReelForge-RF7.figcraft（真源）+ design/{dark,light,components}/*
5. 评审稿 DESIGN-评审稿-RF7.md 你签字
6. 才改 src/client/（见 docs/UI设计与代码一致性.md）
```

**为什么第 4 步是脚本不是手拖**：FigCraft 的自动布局一旦手改就没有 diff、不能复现、不能批量换主题。
脚本是 RF7 的可版本化真源；`.figcraft` 是它的产物，可以在 FigCraft 里继续手改，但改完要回写脚本。

## 目录（随稿增长）

| 文件 | 用途 |
| --- | --- |
| [REF-flow-infinite-creation.md](./REF-flow-infinite-creation.md) | 流程对照：IC → ReelForge（DSH） |
| [IA-DSH-右栏.md](./IA-DSH-右栏.md) | 双表面：对话 + 右栏；首次进入、Tab、流程屏 |
| [STYLE-SPEC.md](./STYLE-SPEC.md) | 560×900 画布、RF7 明/暗令牌、Stage 条规范、FigCraft 布局铁律 |
| [BOARD-INDEX.md](./BOARD-INDEX.md) | 画板清单与绘制顺序（含完成状态） |
| [DESIGN-评审稿-RF7.md](./DESIGN-评审稿-RF7.md) | 给你审的方向与检查表 |
| `_tools/build-rf7.mjs` | **主稿脚本**：令牌 → 变量 → 组件 → 画板 → 导出 |
| `_tools/check-svg.mjs` | 出稿校验：尺寸 / 禁 opacity / 颜色白名单 |
| `_tools/inspect.mjs` | 按名字查图层几何（排错用） |
| `_archive/` | 历史主稿快照（`v0-prebuild` = 重开前的 P0 手工稿） |

## 出稿物

| 路径 | 内容 |
| --- | --- |
| `design/ReelForge-RF7.figcraft` | **主稿**：3 页（Dark / Light / Components）、14 个令牌变量、11 个真组件 |
| `design/dark/`、`design/light/` | **18 板** × 2 主题 × PNG + SVG（560×900，逐帧独立导出，共 72 件） |
| `design/components/` | 组件表 PNG + SVG（1200×900） |

## 与代码的关系

`src/client/workbench/**` 已按 RF7 实现；**FigCraft 仍为视觉真源**，实机对照 `design/dark/*.png` 走查。
