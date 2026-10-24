# RF7 画板索引（18 张全流程 · 暗/亮双主题）

主稿文件：`design/ReelForge-RF7.figcraft`（3 页：`RF7/Dark` · `RF7/Light` · `RF7/Components`）
导出件：`design/dark/dark-RF-{Name}.png|svg` · `design/light/light-RF-{Name}.png|svg` · `design/components/RF-Components.png|svg`

- 画布：每板 **560 × 900**（DSH 右栏）；组件表 **1200 × 900**
- 主稿规模：3984 节点 / 14 个令牌变量 / 11 个真组件 / 每主题页 18 个顶层板
- 出稿件数：18 板 × 2 主题 × (PNG+SVG) = **72 件**，加组件表 2 件 = **74 件**
- 板序 = infinite-creation 完整流程顺序；每行的 **来源** 列给出 IC 页面/代码位置的逐条出处

## 一、启动与配置（流程屏）

| 序 | Name | Stage | 来源（IC） | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 01 | **RunGate** 启动检查 | 运行 2/6 | `SettingsPage.jsx` + 宿主 `probe` | 环境检查汇总（6 项 · 4 通过 · 1 警告 · 1 未配置）+ 进度条；执行位置双卡（本地/云端 单选，各带事实行）；7 行检查清单（ComfyUI · LLM · Agent · ffmpeg · 磁盘 · 显存 · 云端账号）；「探测只在本机跑」提示 | ✅ 暗/亮 |
| 14 | **Settings** 服务配置 | 运行 2/6 | `SettingsPage.jsx` | ComfyUI 地址 + 测试连接；LLM（Base URL / 模型 / 掩码 API Key）；Agent 运行时 chip（内置 openclaude / Claude Code / Codex / Gemini / 自定义）；生成维护 3 项（显存释放间隔 / 超时 / 云端 Key） | ✅ 暗/亮 |
| 15 | **ProjectSettings** 项目设置 | 需求 1/6 | `EditProject.jsx` | 成片规格 3 格（分辨率 768P / 比例 9:16 / 风格 写实·冷调）；字幕 3 项 + 双版本说明；声音 2 项；危险操作（删除项目，红框按钮） | ✅ 暗/亮 |

## 二、需求与骨架（流程屏 + Tab）

| 序 | Name | Stage | 来源（IC） | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 02 | **Intake** 新建项目 | 需求 1/6 | `ProjectsPage.jsx` · 新建卡 | 项目名输入 + 画风 chip（写实/二次元/国漫/3D/悬疑）；虚线正文框（粘贴小说 · 一句话想法）；规格条（分辨率 / 比例 / 背景音乐）；参考图片素材（缩略 + 用途 + 移除 + 拖放新增）；章节预览 2 行（自动拆章）；对话同步行 | ✅ 暗/亮 |
| 03 | **Chapters** 章节 | 需求 1/6 | `ChaptersView.jsx` | 对话同步行；「新增章节 / 生成全部章节」双按钮；章节卡 2×3 网格（完成 / 生成中 / 待生成，含 5/5 镜 · 02:14）；「章节是独立成片单元」提示 | ✅ 暗/亮 |
| 11 | **Hub** 枢纽 | 随项目 | `ProjectsPage.jsx` · 项目列表 | HubStrip（成本 ¥4.60 · image×12 / 当前阶段 image · 第 1 章 4/5 步）；对话同步行；章节进度卡 + 进度条；镜头脚本 6 连卡（已出图 / 生成中 / 排队中）；「还有 2 镜待生成」 | ✅ 暗/亮 |

## 三、生成执行（流程屏 + Tab）

| 序 | Name | Stage | 来源（IC） | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 04 | **Assets** 素材库 | 生成 4/6 | `AssetsTab.jsx` | 新建资产；筛选 chip（全部 18 / 人物 3 / 场景 4 / 道具 9 / 服装 2 / 语音 1）；资产卡 2×3（生成图 / 换装 / 年龄 / 设计音色 / 试听 / 重新生成 / 上传替换 / 试听 / 应用到章节）；缺口警示「3 个分镜缺参考图，video 阶段会直接报错」 | ✅ 暗/亮 |
| 05 | **Context** 上下文 | 生成 4/6 | 人物圣经 + 风格指南 + 连续性 | 三键卡（bible 人物圣经 12 人 34 锚点 / style 风格指南 / continuity 连续性 18 条 3 条冲突）；每卡「查看 / 从对话写入」；注入预览（三段固定注入）；三键唯一规则提示 | ✅ 暗/亮 |
| 06 | **Stages** 生成执行 | 生成 4/6 | 实时进度流 + 阶段勾选 | 四阶段进度条 + 图例（llm 完成 / image 3/12 / tts 待跑 / video 待跑）；当前任务卡（GPU 62% · 显存 12.4/16GB · 剩余 8 分）；队列 4 条；本次要跑的阶段 4 行（带勾选框：已完成 / 运行中 / 待跑）；显存自动释放提示 | ✅ 暗/亮 |
| 12 | **Log** 运行日志 | 生成 4/6 | `ConsoleTab.jsx` | 变更记录 4 条（时间 + 变更 + batch 号）；运行输出代码块；回滚三级（按批次 / 按时间点 / 回滚单条）+ 「磁盘上的图片视频不会跟着删」 | ✅ 暗/亮 |
| 13 | **Skills** 技能与工作流 | 生成 4/6 | `SkillsTab.jsx` + `WorkflowsTab.jsx` | 已装技能 6 条（5 可用 + 1 待装）；工作流自迭代 2 步（分析节点 → 注册工作流并起草 SKILL.md）+ 拖放 JSON + 「分析并注册」；说明新技能立刻可被 Agent 路由 | ✅ 暗/亮 |

## 四、分镜（流程屏 + Tab）

| 序 | Name | Stage | 来源（IC） | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 07 | **Storyboard** 分镜审查 | 分镜 5/6 | `ShotsTab.jsx` · 列表 | 镜头行（01–04，含 12s/08s/11s/06s 与 已生成 / 待审）；选中镜高亮态 + 参考缩略（角色/场景/道具）+ 语音条；重新生成卡（换一个种子 / 按反馈改写 + 反馈输入框） | ✅ 暗/亮 |
| 08 | **ShotDetail** 分镜详情 | 分镜 5/6 | `ShotsTab.jsx` · 单镜展开 | 镜头头（分镜 1 · 场景 01 · 时长 12s · 768P · 9:16 · seed）；参考素材（角色 / 场景 / 道具 + 语音）；分镜脚本（镜头 PUSH IN / 画面 / 台词 / 3 段子镜头时间段）；视频提示词代码块（`__MINIMAX_H3_REF_N__`） | ✅ 暗/亮 |

## 五、交付（流程屏 + Tab）

| 序 | Name | Stage | 来源（IC） | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 09 | **Music** 背景音乐 | 交付 6/6 | `MusicTab.jsx` | 生成表单（描述占位 + 风格 chip + 生成）；音乐库 2 条（夜雨里的琴 2:14 已应用 / 远山与风 1:48），每条试听 + 预览 + 应用到章节；「替换不删除原曲」说明 | ✅ 暗/亮 |
| 10 | **Output** 成片 | 交付 6/6 | `ExportsTab.jsx` | 成片文件行（文件名 + 体积 + 时间 + 下载）；大播放器；交付物 3 行（带字幕 mp4 / 不带字幕 mp4 / SRT）；章节列表（已导出 / 未生成） | ✅ 暗/亮 |

## 六、规范板（DSH 特有 / 失败态）

| 序 | Name | Stage | 来源 | 内容要点 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 16 | **ChatRows** 对话行 | 生成 4/6 | DSH 对话面（IC 无对应） | 五种行态：同步行 / 进度行（62% + 进度条）/ 结构化结果行（8 镜 · 02:14 · 时长合法）/ 错误行（缺 3 张参考图 + 去补素材）/ 授权行（将走云端按次计费 → 允许 / 拒绝） | ✅ 暗/亮 |
| 17 | **Degraded** 降级与失败 | 运行 2/6 | 失败与降级（IC 无对应） | 阻塞（ComfyUI 未连接 → 本批已暂停 + 重试连接）；警告（显存不足 → 已自动降为分块编码）；缺料（分镜 07/09/11 缺参考图）；空态（还没有章节）；软降级（2 角色无音色，仍可跑） | ✅ 暗/亮 |
| 18 | **Picker** 素材选择器 | 生成 4/6 | `ReferencePicker.jsx` / `ShotMaterialPicker.jsx` | 搜索框 + 分类 chip；缩略网格 2×3；已选区（2 个 · 参考图上限 9）+ 清空；「只有出镜或出声的角色才占名额」+ 硬上限说明 | ✅ 暗/亮 |

## 七、组件表

| Name | 文件 | 内容 |
| --- | --- | --- |
| **Components** | `design/components/RF-Components.png|svg` | 11 个真组件：FilmMark · StatusPill · StageRail · TabBar · Button/Primary · Button/Ghost · ChatSyncLine · Card · RunGateCard · HubStrip · ShotChip |

## 八、形态与 Stage 约定

- **流程屏**（无 Tab 条）：一次性动作或跨步决策 —— RunGate · Intake · Stages · ShotDetail · Music · Skills · Settings · ProjectSettings
- **Tab 屏**（固定 7 项 Tab：枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志）：Hub · Chapters · Assets · Storyboard · Context · Output · Log
- **规范板**：ChatRows · Degraded · Picker
- Stage 轨 6 步：`0 需求` → `1 运行` → `2 方案` → `3 生成` → `4 分镜` → `5 交付`

## 九、画下一块板怎么做

1. 在 `design/_tools/build-rf7.mjs` 里加一个 `boardXxx()`（复用 `header/stageRail/tabBar/scroll/card/footer` 等函数）。
2. 加进 `BOARD_SPECS` 数组（数组顺序 = 流程顺序，画布上按 4 列网格自动错开）。
3. `node design/_tools/build-rf7.mjs` → 自动出 Dark、Light 两套 PNG/SVG。
4. `node design/_tools/check-svg.mjs` → 尺寸 560×900、禁 opacity、颜色白名单全过才算合规。
5. 在本页加一行，注明来源（IC 页面 / 代码位置）。
