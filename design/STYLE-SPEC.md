# RF7 样式规范 · ReelForge 右栏（原创美术）

画布：**560×900**（DSH 右栏，非手机比例）。  
**两套静态稿**：`theme=dark` / `theme=light` 各出一遍 SVG/PNG；实现阶段映射宿主 `--dsw-alias-*`。

## 1. 画布与栅格

| 项 | 值 |
| --- | --- |
| 外边距 | 20px（内容宽 520） |
| 顶栏高 | 60 |
| Stage 条高 | 50（y=60..110） |
| Tab 条高 | 44（仅项目视图） |
| Footer 高 | 70（y=830..900） |
| Scroll | 110..830（流程屏无 Tab 时 110..830） |
| 圆角 | 卡片 10 · 按钮 8 · 芯片 6 · Stage chip 6 |
| 间距阶 | 4 / 8 / 12 / 16 / 20 / 24 |

## 2. 深色令牌（FigCraft / SVG 用 hex）

| 令牌 | hex | 用途 |
| --- | --- | --- |
| rf-bg | `#0A0C10` | 面板底（略区别于旧 v4，RF7 新基色） |
| rf-surface | `#141820` | 卡片 |
| rf-surface-2 | `#10141C` | Stage / Tab 条 |
| rf-surface-3 | `#1C2230` | 输入、芯片 |
| rf-line | `#252A34` | 描边 |
| rf-text-1 | `#EEF1F6` | 标题 |
| rf-text-2 | `#9AA3B2` | 正文 |
| rf-text-3 | `#6B7380` | 说明 |
| rf-accent | `#5B8DEF` | 强调、当前步、主按钮 |
| rf-accent-dim | `#1A2744` | 当前 Stage chip 底 |
| rf-ok | `#3DDC84` | 已过 Stage 点 |
| rf-warn | `#E5A045` | 警告、降级 |
| rf-error | `#F07178` | 失败、阻塞 |

## 3. 浅色令牌

| 令牌 | hex | 用途 |
| --- | --- | --- |
| rf-bg | `#F4F5F7` | 面板底 |
| rf-surface | `#FFFFFF` | 卡片 |
| rf-surface-2 | `#EBEDF2` | Stage / Tab |
| rf-surface-3 | `#DDE1E8` | 芯片 |
| rf-line | `#D0D4DC` | 描边 |
| rf-text-1 | `#121418` | 标题 |
| rf-text-2 | `#5C6370` | 正文 |
| rf-text-3 | `#8B919C` | 说明 |
| rf-accent | `#3568D4` | 强调 |
| rf-accent-dim | `#E3EBFA` | 当前 Stage chip |
| rf-ok | `#1F9D55` | 已过 |
| rf-warn | `#C7841A` | 警告 |
| rf-error | `#D92D20` | 错误 |

## 4. Stage 条（6 步，几何与 v4 兼容）

步序：**需求 · 运行 · 方案 · 生成 · 分镜 · 交付**。  
步点 cx：24 / 100 / 176 / 252 / 328 / 404；cy=85，r=3.5。  
当前步：chip 宽 56 高 22，rx=6，fill=accent-dim；步点 fill=accent。  
已过：步点 fill=ok，文字 text-2。  
未到：步点 fill=line，文字 text-3。  
计数：Inter 11，text-3，x=540 end，`n / 6`。

## 5. RF7 组件（原创命名，进 15-RF-Components）

| 组件 | 说明 |
| --- | --- |
| RF/FilmMark | Header 28×28 品牌块（非 IC logo） |
| RF/StageRail | 上述 Stage 条 |
| RF/RunGateCard | LOCAL / CLOUD 选型大卡 |
| RF/ProbeFold | 本机探测折叠区（摘要 + 展开表） |
| RF/HubStrip | 成本 + 阶段 DNA 组合条 |
| RF/ChatSyncLine | 单行同步提示 |
| RF/ChapterRail | 章节进度行 |
| RF/ShotChip | 镜头摘要卡（Hub 最多 4 + more） |

**禁止**：opacity 表达层级；SVG 内用预混 hex。

## 6. 字体

- 中文：**Noto Sans SC** — 15 / 13 / 12 / 11 / 10（本机无 Inter，中文与数字统一走 Noto Sans SC，避免字形回退）
- 权重：标题与卡片主文案 `wght 600`，其余 400（Noto Sans SC 为可变字体）
- 数字、镜号、计数同字体，不再单独指定第二套字族

## 7. 实现映射（定稿后写进 client）

| RF7 令牌 | 宿主 token（运行时） |
| --- | --- |
| rf-accent | `--dsw-alias-brand-primary-new-colorprimary-new-color` |
| rf-surface* / rf-bg | `--dsw-alias-bg-layer-*` / `--dsw-alias-bg-base` |
| rf-text-* | `--dsw-alias-label-*` |

浅色/深色由宿主切换，插件不写死 hex（A7）。

## 8. FigCraft 布局铁律（踩过的坑，写下来别再犯）

以上令牌在 FigCraft 里是 **RF7 变量集合**（Dark / Light 双模式），不是写死的 hex。

| 铁律 | 说明 |
| --- | --- |
| **每轴都要显式 sizing** | FigCraft 里没写 `sizingH/sizingV` 的图层一律 **100×100**，不是按内容收紧 → 不显式给尺寸就会塌成方块 |
| **没有 fills 的 frame 默认白底** | 透明必须写 `fills: []`（脚本里是 `fill: 'none'`） |
| **hug 只对「有自动布局的 frame」或文本合法** | 纯矩形/椭圆不能 hug，必须给固定尺寸 |
| **fill 需要父级有自动布局** | 且父级宽度要确定（fixed/fill）；父级自己 hug 时，子级 fill 会**归零**（文字直接消失） |
| **主轴 fill 也能吃剩余空间** | 横向容器里两个 fill 子元素会平分剩余宽度（并排双卡就靠它） |
| **文字定宽才换行** | `textAutoResize` = `height`（定宽换行）/ `widthAndHeight`（按内容收紧）要跟 sizing 配套 |
| **内边距数组语义** | 脚本里 `[上,右,下,左]`；两元素按「上下 / 左右」对称解析（写 `[0,20]` 即左右各 20） |
| **复制页 = 免费双主题** | `page.duplicate` 复制出几何 → `variable.setMode` 切 Light → 同一套版式两套色 |

> 这些结论都是探针实测出来的（见 `_tools` 下的历史探针），不是猜的。
> 改稿时**不要**在 FigCraft 里手拖改尺寸 —— 会破坏脚本一致性；改 `build-rf7.mjs` 再重跑。
