# ReelForge UI · RF7 设计评审稿

> **状态：全流程 18 板完成（暗 + 亮）** —— FigCraft 主稿已出 `RF7/Dark` · `RF7/Light` · `RF7/Components` 三页；
> 出稿 **72 件**（18 板 × 2 主题 × PNG/SVG）+ 组件表 2 件；`check-svg.mjs` **37/37 全绿**。
> **`src/client/` 已按 RF7 对齐**（`Workbench` · `flow.js` · `tabs.js` · `chrome.js` · `rf7.js`）；映射见 `docs/UI设计与代码一致性.md` §4。
> 流程参照 [infinite-creation](https://github.com/SwotAtmk/infinite-creation)；**美术 100% 原创**。

## 1. 18 张是怎么定出来的（先看这条）

**不是拍脑袋，也不是数 README 文字。** 核对路径：

1. 拉 IC 仓库 **递归文件树**（5393 条）→ 定位 `app/pages/*.jsx` 全部真实页面组件；
2. 下载 IC **页面截图 13 张**（`j1–j8` 项目与设置页、`d1-1/d1-2/d1-3/d2` 分镜与成片页）**逐张看图**；
3. 读 `docs/run_demo.md` 的真实分镜表 → 交叉验证每页实际承载的数据。

得到 **12 个 IC 真实页面** + DSH 宿主特有的 3 类（对话行 / 失败态 / 素材选择器），按「一屏一任务」展开成 **18 张板**：

| # | IC 页面（代码位置） | → RF7 画板 | 形态 |
| --- | --- | --- | --- |
| 1 | `SettingsPage.jsx` + 宿主 probe | RunGate 启动检查 | 流程屏 |
| 2 | `ProjectsPage.jsx`（新建卡） | Intake 新建项目 | 流程屏 |
| 3 | `ChaptersView.jsx` | Chapters 章节 | Tab |
| 4 | `AssetsTab.jsx` | Assets 素材库 | Tab |
| 5 | 人物圣经 / 风格指南 / 连续性 | Context 上下文 | Tab |
| 6 | 实时进度 + 阶段勾选 | Stages 生成执行 | 流程屏 |
| 7 | `ShotsTab.jsx`（列表） | Storyboard 分镜审查 | Tab |
| 8 | `ShotsTab.jsx`（单镜展开） | ShotDetail 分镜详情 | 流程屏 |
| 9 | `MusicTab.jsx` | Music 背景音乐 | 流程屏 |
| 10 | `ExportsTab.jsx` | Output 成片 | Tab |
| 11 | `ProjectsPage.jsx`（项目列表） | Hub 枢纽 | Tab |
| 12 | `ConsoleTab.jsx` | Log 运行日志 | Tab |
| 13 | `SkillsTab.jsx` + `WorkflowsTab.jsx` | Skills 技能与工作流 | 流程屏 |
| 14 | `SettingsPage.jsx` | Settings 服务配置 | 流程屏 |
| 15 | `EditProject.jsx` | ProjectSettings 项目设置 | 流程屏 |
| 16 | —（DSH 对话面） | ChatRows 对话行 | 规范板 |
| 17 | —（失败与降级） | Degraded 降级与失败 | 规范板 |
| 18 | `ReferencePicker.jsx` / `ShotMaterialPicker.jsx` | Picker 素材选择器 | 规范板 |

完整映射与**能力契约**见 [REF-flow-infinite-creation.md](./REF-flow-infinite-creation.md)；逐板内容要点见 [BOARD-INDEX.md](./BOARD-INDEX.md)。

## 2. 你要审什么

| 文件 | 审什么 |
| --- | --- |
| [REF-flow-infinite-creation.md](./REF-flow-infinite-creation.md) | 借的流程够不够、有没有多借 IC 的壳 |
| [IA-DSH-右栏.md](./IA-DSH-右栏.md) | 冷启动 RunGate、Hub、Tab/Stage 两层结构 |
| [STYLE-SPEC.md](./STYLE-SPEC.md) | RF7 明/暗令牌、Stage 条、**FigCraft 布局铁律** |
| [BOARD-INDEX.md](./BOARD-INDEX.md) | 18 板清单与逐板内容要点 |
| **FigCraft 主稿** `design/ReelForge-RF7.figcraft` | 3 页：RF7/Dark · RF7/Light · RF7/Components（3984 节点 / 14 变量 / 11 组件） |
| **导出件** `design/dark/` `design/light/` | 评审用 PNG/SVG，非编辑真源 |
| **组件表** `design/components/RF-Components.png` | 11 个真组件全态 |

## 3. 建议评审路径（按流程走一遍，别跳板）

1. **RunGate**（启动检查）→ 2. **Settings**（服务配置）→ 3. **Intake**（新建项目）→ 4. **ProjectSettings**（项目设置）
   → 5. **Chapters**（章节骨架）→ 6. **Context**（三把钥匙）→ 7. **Assets**（素材库）
   → 8. **Stages**（生成执行）→ 9. **Hub**（枢纽，看全局态）
   → 10. **Storyboard**（分镜列表）→ 11. **ShotDetail**（单镜详情）
   → 12. **Music**（背景音乐）→ 13. **Output**（成片交付）
   → 14. **Log**（日志与回滚）→ 15. **Skills**（技能与工作流）
   → 16–18. **ChatRows / Degraded / Picker**（规范板，最后看规则层）

每板都有暗/亮两版，**建议对照着看**（`design/dark/` 与 `design/light/` 同名文件）。

## 4. 与 infinite-creation 的关系（一句话）

**同一套生产流水线契约，不同宿主、不同 UI。** DSH 对话 = IC 的外部 Agent；右栏 = 结构化工作台，不是 IC 的 Next 页面。

## 5. 这一轮改了什么（对比重开前那版手工稿）

| 问题 | 现在 |
| --- | --- |
| Stage 条只剩一个蓝方块，六个步点/字全没画 | 六步轨完整：步点 + 文字 + 当前步 chip + 右侧 `n / 6`，**18 板全部带轨** |
| Header/页签胶囊文字被裁、贴到画布左缘 | 全局内边距规则修正，文字不再溢出容器 |
| 两张大卡下半截全空、探测卡巨大留白 | 全部改自动布局：卡片按内容收紧，没有手算坐标 |
| 主按钮没字 | 每屏页脚 = 标签 + 主文案 + **一个带字的主按钮**（不可点时禁用并说明原因） |
| 导出事故：RunGate 的 SVG 里塞了三块板 | 逐帧独立导出，`check-svg.mjs` 校验尺寸（37/37 通过） |
| 颜色是写死的 hex，明暗两套各画一遍 | **一个文件双主题**：14 个令牌变量 + Dark/Light 双模式，复制页即得亮稿 |
| 没有组件概念 | 11 个真组件（`component.create`）+ 组件表 |
| 缺「插件第一次启动跑检测」这一屏 | 首屏改为 **RF-RunGate**：6 项环境检查 + 执行位置选择，作为流程第 2 步「运行 2/6」 |
| 只给了 3 张板，看不出全流程 | 按 IC 真实页面清单出齐 **18 张**，全流程可走通 |

## 6. 关键设计决定（请重点看这几条）

1. **暗/亮同源**：两套稿由同一份几何 + 同一组令牌变量派生，改一次两边同时变。
2. **Footer 三件套**（IA 硬约束）：本屏标签 / 本屏主文案 / 一个主按钮；不可点时**禁用并写明缺什么**（Hub 的「查看成片」就是禁用态，因为第 1 章还在生成）。
3. **Hub 是默认落点**：有章节后进枢纽，Tab 只在项目视图出现，流程屏不占 Tab。
4. **Tab 条固定 7 项**（枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志），与 IC 项目视图 6 tab 的真实结构对齐。
5. **环境门独立成屏**：设备/服务就绪探测独立在 RunGate，**不在滚动区顶单独铺一条**。
6. **语义色**：`数据不出本机` 绿、`按次计费` 橙、`显存预估` 橙 —— 状态一眼可辨，不靠文案解释。
7. **失败不许静默降质**（Degraded 板）：阻塞 / 警告 / 缺料 / 空态 / 软降级五态分开说清代价与替代。
8. **烧钱动作要人工点头**（ChatRows 授权行）：走云端按次计费前必须在对话面请求授权。

## 7. 已知取舍

- 字体统一用 **Noto Sans SC**（本机没装 Inter），代码阶段按宿主字体栈再映射。
- 板内**不使用实例化复用**，统一普通 frame + 令牌绑定（规避 headless 管线里实例覆写的高风险）；11 个真组件集中在 `RF7/Components` 页。
- 缩略图/播放器是**占位块**（真实素材在代码阶段接 ComfyUI 输出），只定版式不画内容。
- 代码侧已接 RF7 壳层与 18 屏路由；实机像素级对齐仍靠你签字后逐屏走查。

## 8. 评审结论（请你填）

| 日期 | 结论 | 备注 |
| --- | --- | --- |
| 2026-10-24 | ☐ 通过全部 ☐ 修改 IA ☐ 修改 STYLE ☐ 重做某板 | 设计 18 板齐；代码已映射，待实机签字 |

通过后：走 `npm run build:client:dsh` + DSH 实机按 §3 评审路径验收。
