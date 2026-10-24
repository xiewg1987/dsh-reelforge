# UI 设计与代码一致性

> **硬规则**：任何 ReelForge 右栏 UI 变更，**必须先更新设计稿（FigCraft + SVG + 规格），再改 `src/client/` 代码**。  
> **RF7**：设计真源为 `design/ReelForge-RF7.figcraft` + `design/BOARD-INDEX.md`；`src/client/workbench/**` 已按 RF7 对齐（2026-10-24 起）。

---

## 1. 为什么

- 设计真源在 **`design/`**（18 板 × 暗/亮 + 组件表），不是 DSH 实机截图。
- 流程参照 [infinite-creation](https://github.com/SwotAtmk/infinite-creation)（见 `design/REF-flow-infinite-creation.md`）；**UI 不参照 IC 页面**。
- 验收：`npm run verify:acceptance` 中 UI 项要求能指出 **画板名**（如 `RF-RunGate`）与实机截图或 DOM 断言。

---

## 2. 真源顺序（Single source of truth）

```text
1. 改意图 / 交互  →  design/ReelForge-RF7.figcraft（RF7/Dark · RF7/Light · RF7/Components）
2. 导出 / 同步     →  design/dark|light/dark-RF-*.png|svg（或 node design/_tools/build-rf7.mjs）
3. 写清规格        →  design/IA-DSH-右栏.md · design/STYLE-SPEC.md · design/BOARD-INDEX.md
4. 评审签字        →  design/DESIGN-评审稿-RF7.md
5. 更新映射表      →  本文 §4
6. 改代码          →  src/client/** → npm run build:client → npm run build:client:dsh
7. 自证            →  PNG 与实机并排
```

**禁止跳过 1–4 直接改 6。**

---

## 3. FigCraft 与导出分工

| 产物 | 职责 |
| --- | --- |
| `ReelForge-RF7.figcraft` | 可编辑主稿、变量令牌、11 组件 |
| `design/dark|light/*-RF-*.svg` | 可 diff、`design/_tools/check-svg.mjs` 校验 |
| `design/dark|light/*-RF-*.png` | 2× 评审/开发对照 |
| `design/components/RF-Components.*` | 组件全态 |

```powershell
cd D:\Code\WebCode\dsh-reelforge\design
node _tools/check-svg.mjs    # 37/37 尺寸与色表
node _tools/build-rf7.mjs    # 可选：从脚本再生稿（与 FigCraft 主稿二选一维护）
```

规范：`design/STYLE-SPEC.md`（560×900、Stage 六步、RF7 令牌）。

---

## 4. 画板 ↔ 代码映射（RF7）

### 4.1 两层导航

| 层 | 代码 | 说明 |
| --- | --- | --- |
| **6 步 Stage 轨** | `RF.STAGE_STEPS` · `RF.stageStepsState` · `STAGE_STEP_TARGETS` | 用户心智主轴；点击步点 → `STAGE_STEP_TARGETS` |
| **7 Tab**（项目视图） | `WORKBENCH_TABS` · `RF.TAB_RENDERERS` | 枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志 |
| **8 流程屏** | `FLOW_SCREENS` · `RF.FLOW_RENDERERS` | 无 Tab 条：RunGate … Skills |
| **2 规范板** | `SPEC_SCREENS` | degraded · picker |

壳层：`Workbench.jsx`（Header / StageRail / TabBar? / Scroll / Footer）；按屏文案 `chrome.js` 的 `TAB_CHROME` + `FLOW_CHROME`。

### 4.2 18 张画板

| 画板 | Stage 示意 | 形态 | 渲染函数 | 外壳词条前缀 |
| --- | --- | --- | --- | --- |
| RF-RunGate | 运行 2/6 | 流程 | `flowRunGate` | `rf7.runGate.*` |
| RF-Intake | 需求 1/6 | 流程 | `flowIntake` | `rf7.intake.*` |
| RF-ProjectSettings | 需求 1/6 | 流程 | `flowProjectSettings` | `rf7.projectSettings.*` |
| RF-Settings | 运行 2/6 | 流程 | `flowSettings` | `rf7.settings.*` |
| RF-Stages | 生成 4/6 | 流程 | `flowStages` | `rf7.stages.*` |
| RF-ShotDetail | 分镜 5/6 | 流程 | `flowShotDetail` | `rf7.shotDetail.*` |
| RF-Music | 交付 6/6 | 流程 | `flowMusic` | `rf7.music.*` |
| RF-Skills | 生成 4/6 | 流程 | `flowSkills` | `rf7.skills.*` |
| RF-Hub | 随项目 | Tab `hub` | `tabHub` | `rf7.hub.*` |
| RF-Chapters | 需求/方案 | Tab `chapters` | `tabChapters` | `rf7.chapters.*` |
| RF-Assets | 生成 | Tab `assets` | `tabAssets` | `rf7.assets.*` |
| RF-Context | 生成 | Tab `context` | `tabContext` | `rf7.context.*` |
| RF-Storyboard | 分镜 | Tab `shots` | `tabShots` | `rf7.storyboard.*` |
| RF-Output | 交付 | Tab `output` | `tabOutput` | `rf7.output.*` |
| RF-Log | 生成 | Tab `log` | `tabLog` | `rf7.log.*` |
| RF-Degraded | 运行 | 规范 | `flowDegraded` | `rf7.degraded.*` |
| RF-Picker | 生成 | 规范 | `flowPicker` | `rf7.picker.*` |
| RF-ChatRows | — | 对话面 | `src/client/chatRows/**` | `rf7.chat.*` |

**冷启动**：无章节 → `mode=flow` · `runGate`（`Workbench.jsx`）；Stage 轨在流程屏上按 `FLOW_SCREEN_STEPS[screen]` 高亮。

**Stage 点击落点**（`STAGE_STEP_TARGETS`）：需求→Intake；运行→RunGate；方案→Tab 章节；生成→Stages；分镜→Tab 分镜；交付→Tab 成片。

### 4.3 零件库（2026-10-24 起改 Tailwind + shadcn）

| 模块 | 职责 |
| --- | --- |
| `src/client/ui/register.jsx` | shadcn 原语 → `RF.Button` / `RF.Card` / `RF.Badge` …；页签 JSX 用自由变量 `<Button>`；`RF.workbenchCard()` / `RF.statusToneClass()` |
| `src/client/ui/workbench-ui.jsx` | 14 个工作台复合零件（SectionHead · Track · KvRow · ChipRow · EmptyState · FieldBox …）→ **`RF.ui.*` only** |
| `src/client/ui/globals.css` + `src/client/ui/layout-tw.js` | `--rf-*` 令牌映射宿主 `--dsw-alias-*` + Tailwind 类名表 → 产物 `generated/tailwind-styles.js` |
| `locale/zh.json` + `locale.js` | `rf7.*` 文案（运行时不硬编码中文） |

⚠️ **旧的 `workbench/rf7.js` 与 `workbench/styles.js` 已删除**（2026-10-24）——
shadcn 原语走 `<Button>` / `<Card>` / `<Badge>`（与 `RF.Button` 同源）；复合零件走 `RF.ui.*`；样式走 Tailwind + `layout-tw.js`，不再有手写的 `rf-*` class 体系。

### 4.4 已移除 / 勿复活

- v6 `flowGuide` · `flowRunStack` · `flowRunMode` · 顶栏预检条 · Tab「技能」（改 `flowSkills`）
- 全 Tab 顶部「需求捕获块」（内容在 Intake / 对话）

---

## 5. 改 UI 的检查清单

- [ ] FigCraft 画板名 `RF-*` 与导出文件名 `dark-RF-*` 一致（见 `BOARD-INDEX.md`）
- [ ] Stage 当前步、计数与 `STYLE-SPEC.md` §4 一致
- [ ] `node design/_tools/check-svg.mjs` 无报错
- [ ] 更新本文 §4（新屏或改名）
- [ ] `npm run build:client` → `npm run build:client:dsh` → 重启 DSH · Ctrl+F5
- [ ] 实机与 `design/dark/dark-RF-*.png` 并排：信息架构一致（允许主题色差）

---

## 6. 与宿主主题

- **运行时**用 `var(--dsw-alias-*)`（R6），不在组件里写死 STYLE-SPEC hex。
- **设计稿**用 RF7 令牌出图，对照看结构与文案。

---

## 7. 相关文件

| 路径 | 说明 |
| --- | --- |
| `design/BOARD-INDEX.md` | 18 板清单与 IC 来源 |
| `design/DESIGN-评审稿-RF7.md` | 评审与签字 |
| `design/IA-DSH-右栏.md` | 双表面 · Tab/Stage · 屏间入口 |
| `src/core/constants.js` | `WORKBENCH_TABS` · `FLOW_SCREENS` · `STAGE_STEP_TARGETS`（F8） |
| `docs/开发任务/T5-工作台与技能工厂.md` | T5 边界与消息行 |
