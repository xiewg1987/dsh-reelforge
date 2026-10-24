# 流程参照：infinite-creation → ReelForge（只借流程）

参照：[SwotAtmk/infinite-creation](https://github.com/SwotAtmk/infinite-creation) · MIT
本仓库技能镜像：`skills/reelforge-novel-to-video/SKILL.md` 等 5 个。

**核对方式**：仓库文件树（`app/` 全部组件）+ README 的 8 张页面截图 + `docs/run_demo.md` 的真实分镜表 —— **不是凭 README 文字转述**。

## 一、IC 真实页面清单（代码与截图双向核对）

| IC 页面 | 代码位置 | 真实构成 |
| --- | --- | --- |
| 项目首页 | `app/pages/ProjectsPage.jsx` | 新建项目卡（项目名 / 画风 / 正文域 / 分辨率 / 比例 / 背景音乐开关 / **参考图片素材 + 用途**）+ 项目列表卡（封面 · 资产数 · 分镜数 · 状态） |
| 章节管理 | `app/pages/ChaptersView.jsx` | 章节卡网格（封面 + 完成 n/m + 生成 / 编辑 / 操作） |
| 素材库 | `app/pages/AssetsTab.jsx` | 11 类筛选 + 资产卡（缩略图 · 类型标签 · done · 生成图 / 重新生成 / 上传替换 / 编辑 / 删除 / **换装 / 年龄 / 设计音色** + 服装变体） |
| 分镜审查 | `app/pages/ShotsTab.jsx` | 每镜大卡：元信息（时长 / 分辨率 / 比例 / seed）+ 参考素材缩略（角色 / 场景 / 道具 / 服装 / 语音）+ 镜头 / 画面 / 台词 / **子镜头时间段** + 视频提示词（`__MINIMAX_H3_REF_N__`）+ 成片播放器 |
| 背景音乐 | `app/pages/MusicTab.jsx` | 生成表单 + 音乐条目（试听 / 预览 / 选择 / 应用到章节） |
| 成片 | `app/pages/ExportsTab.jsx` | 成片文件行（体积 · 时间 · 下载）+ 大播放器 + **字幕双版本 / SRT** |
| 运行日志 | `app/pages/ConsoleTab.jsx` | 实时进度流 + 变更日志 + 回滚入口 |
| 技能管理 | `app/pages/SkillsTab.jsx` | 技能列表 + 安装 / 上传 |
| 工作流注册 | `app/pages/WorkflowsTab.jsx` | 粘贴工作流 JSON → 分析节点 → 注册 + 生成技能（自迭代） |
| 服务配置 | `app/pages/SettingsPage.jsx` | ComfyUI / LLM / Agent 运行时 / 生成维护 / 云端 Key |
| 项目设置 | `app/pages/EditProject.jsx` | 规格 · 风格 · 字幕 · 危险操作 |
| 素材选择器 | `app/pages/ReferencePicker.jsx`、`ShotMaterialPicker.jsx` | 弹窗：搜索 + 分类 + 网格 + 已选 + 配额提示 |

IC 自述主链（README 摘录，作流程真源）：

```text
剧本/大纲 → 人物圣经 + 风格指南 → 人物/场景/道具/语音资产
→ 分镜脚本 → 逐镜视频 → 背景音乐 → 自审 → ffmpeg 合并成片
```

## 二、IC 页面 → RF7 画板（18 张，一一对应）

| IC 页面 | RF7 画板 | 形态 | Stage |
| --- | --- | --- | --- |
| 服务配置 + 首次检查 | `RF-RunGate` **启动检查** | 流程屏 | 运行 2/6 |
| 项目首页·新建 | `RF-Intake` **新建项目** | 流程屏 | 需求 1/6 |
| 章节管理 | `RF-Chapters` 章节 | Tab | 需求 1/6 |
| 素材库 | `RF-Assets` 素材 | Tab | 生成 4/6 |
| 上下文（bible / style / continuity） | `RF-Context` 上下文 | Tab | 生成 4/6 |
| 实时进度 + 阶段勾选 | `RF-Stages` 生成执行 | 流程屏 | 生成 4/6 |
| 分镜审查（列表） | `RF-Storyboard` 分镜 | Tab | 分镜 5/6 |
| 分镜审查（单镜展开） | `RF-ShotDetail` 分镜详情 | 流程屏 | 分镜 5/6 |
| 背景音乐 | `RF-Music` 背景音乐 | 流程屏 | 交付 6/6 |
| 成片 | `RF-Output` 成片 | Tab | 交付 6/6 |
| 项目首页·项目列表 | `RF-Hub` 枢纽 | Tab | 随项目 |
| 运行日志 | `RF-Log` 日志 | Tab | 生成 4/6 |
| 技能管理 + 工作流注册 | `RF-Skills` 技能与工作流 | 流程屏 | 生成 4/6 |
| 服务配置 | `RF-Settings` 服务配置 | 流程屏 | 运行 2/6 |
| 项目设置 | `RF-ProjectSettings` 项目设置 | 流程屏 | 需求 1/6 |
| —（DSH 对话面） | `RF-ChatRows` 对话行 | 规范板 | 生成 4/6 |
| —（失败与降级） | `RF-Degraded` 降级与失败 | 规范板 | 运行 2/6 |
| 素材选择器 | `RF-Picker` 素材选择器 | 规范板 | 生成 4/6 |

**流程屏 vs Tab 屏**：流程屏（无 Tab 条）= 一次性动作或跨步决策；Tab 屏 = 项目内可反复查看的资产。Tab 条固定 7 项：枢纽 · 章节 · 素材 · 分镜 · 上下文 · 成片 · 日志。

## 三、IC 能力 → ReelForge 等价（数据契约）

| infinite-creation 概念 | ReelForge 等价 | 说明 |
| --- | --- | --- |
| 粘贴小说 / 上传 txt 拆章 | `import_novel` + `RF-Intake` | 一章一集（独立成片单元） |
| 人物圣经 + 风格指南 + 连续性 | `context` 三键 `bible` / `style` / `continuity` | 生成前锚点；bible 必含场景站位表 |
| 10 类资产 + 变体 parent_id | `assets` Tab + 工具 | 服装 / 年龄是变体类，必须带 parent_id |
| 分镜脚本 + 审查重生成 | `shots` Tab + `RF-ShotDetail` | 按章 idx；时长 1–15s、台词 ≤5.5 字/秒、每镜说话人 ≤2 |
| 四阶段：文本 / 资产生图 / 音色 / 分镜视频 | `llm` → `image` → `tts` → `video` | 硬依赖：video 依赖 image；软依赖 tts |
| ComfyUI 本地 + RunningHub 云端 | `local` / `cloud` + provider | kind × 位置矩阵 |
| 设备 / 服务就绪 | 宿主 `probe` + **首次 `RF-RunGate` 启动检查** | 插件第一次启动就跑；UI 原创，不是 IC 设置页像素 |
| 技能库 / 技能工厂 | `skills` + `RF-Skills` 工作流自迭代 | 不复制 IC 技能管理 UI |
| 运行日志 / 断点续跑 | `log` Tab + 投影 `changelog` + 回滚 | 单条 / 批次 / 时间点三级 |
| 成片 + 字幕双版本 + SRT | `output` Tab + `assemble_chapter` | |
| 背景音乐库 | `RF-Music` | 可一次应用到多章 |
| Agent 全自动链 | **DSH 对话**为主、右栏为辅 | 无 IC 的「点开始」大按钮语义 |

## 四、不借什么（UI / 壳 / 技术）

| 不借 | 原因 |
| --- | --- |
| Next.js 全屏 App、侧栏导航、Dashboard 栅格 | DSH 右栏 300–1150px × 全高 |
| IC 截图里的 Tab 名、卡片比例、Tailwind 色 | RF7 美术全部重做 |
| 项目列表 / 多项目首页 | DSH 会话 = 项目；右栏是会话内工作台 |
| SQLite 设置页、4600 端口服务配置 UI | 配置走 DSH 插件 config + 探测 API |
| 「无限画布」、节点编辑器 | 非目标（设计方案 §1.2） |
