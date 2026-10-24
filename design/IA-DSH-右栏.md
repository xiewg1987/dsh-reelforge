# 信息架构 · DSH 右栏（RF7）

## 双表面

| 表面 | 职责 |
| --- | --- |
| **DSH 对话** | 自然语言驱动工具；进度/结构化结果以 chat row 出现 |
| **ReelForge 右栏** | 结构化编辑、进度总览、授权前预览；**不**堆整段小说全文 |

原则：**同一状态两边可读**——用一行 `ChatSync`（10px 次级文案）提示「对话已写入章节/资产」，不用顶部大文本框。

## 首次进入（冷启动）

```text
打开 ReelForge Tab、且无章节数据
  → 流程屏 RF-RunGate（环境门）
  → Stage 条：运行 2/6（需求步视为已过：用户已从对话或空项目进来）
  → 用户选 local/cloud + 完成/跳过探测
  → 导入屏 RF-Intake 或回对话 import_novel
```

**禁止**：Scroll 顶部独立「预检/检测」通栏；探测只在 RunGate 区块内（折叠/展开）。

## 有章节后默认

```text
Tab：枢纽 Hub（章节进度 + 当前章镜头摘要 + 成本/阶段 DNA）
Stage 条随投影推导（示例：生成 4/6）
```

## 导航两层

### A. Stage 条（6 步 · 用户心智主轴）

| 步 | 名 | 主落点 |
| --- | --- | --- |
| 1 | 需求 | 流程 `RF-Intake` 或 Guide 总览 |
| 2 | 运行 | 流程 **`RF-RunGate`** |
| 3 | 方案 | 流程 `RF-Plan` |
| 4 | 生成 | 流程 `RF-Stages` + Tab 上下文/资产 |
| 5 | 分镜 | Tab `shots` |
| 6 | 交付 | Tab `output` |

### B. Tab 条（7 个 · 会话内二级）

> **RF7 定稿**（评审稿 §6.4 + 画板索引 §八）：固定 **7 项**，顺序即下表。
> v6 稿里的「技能」**不是页签**了 —— RF7 把它挪成流程屏（板 13），
> 并把「章节」提为页签（板 03）。

| Tab id | 标签 | 内容 | 对应画板 |
| --- | --- | --- | --- |
| hub | 枢纽 | 章节进度 + 镜头摘要 + 成本/阶段 | 板 11 Hub |
| chapters | 章节 | 章节卡 2×3 + 章节进度 | 板 03 Chapters |
| assets | 素材 | 资产卡 2×3 + 分类筛选 | 板 04 Assets |
| shots | 分镜 | 镜头行 + 选中镜 + 重新生成卡 | 板 07 Storyboard |
| context | 上下文 | bible / style / continuity 三键 + 注入预览 | 板 05 Context |
| output | 成片 | 播放器 + 交付物 + 章节列表 | 板 10 Output |
| log | 日志 | 变更记录 + 回滚三级 | 板 12 Log |

流程屏**不在 Tab 里**：无 Tab 条，仅 Header + Stage + Scroll + Footer。

### C. 屏间入口（RF7 画板只画屏内内容，入口按画板语义补）

RF7 的 18 块板里，除 Stage 轨与页签条外，另有 7 块屏（Settings · ProjectSettings ·
ShotDetail · Music · Skills · Degraded · Picker）**在画板上没有画出入口**。
实现按画板语义补了以下入口（一律是正文区末尾的 ghost 按钮，不动主内容与底栏）：

| 入口所在屏 | 按钮 | 去向 | 依据 |
| --- | --- | --- | --- |
| 启动检查 RunGate | 服务配置 | 流程屏 Settings | 与 RunGate 同源（IC `SettingsPage.jsx`） |
| 启动检查 RunGate | 查看失败清单 | 规范屏 Degraded | 规范板「降级与失败」 |
| 枢纽 Hub | 项目设置 | 流程屏 ProjectSettings | IC `EditProject.jsx`（编辑项目） |
| 枢纽 Hub | 技能与工作流 | 流程屏 Skills | RF7 把「技能」从页签挪成流程屏，枢纽是落点 |
| 分镜 Storyboard | 查看分镜详情 | 流程屏 ShotDetail | 画板 07 是列表、画板 08 是单镜展开 |
| 成片 Output | 背景音乐 | 流程屏 Music | 画板 09 音乐库按章应用 |
| 素材 Assets | 新建资产 | 规范屏 Picker | 画板 18 素材选择器（IC `ReferencePicker.jsx`） |

> ⚠️ 这 7 条是**按画板语义推导**的落点，不是设计稿明写的 —— 属待 owner 复核项。


## Footer 纪律

每屏 Footer **三件套**：本屏标签、本屏主文案、**一个**主按钮；不可点时必须禁用 + 说明缺什么。

## RF7 相对 v4/v6 的 IA 变更摘要

- 画板命名：`RunGate` 替代 RunStack/RunMode+Device 双屏命名（仍是一屏合并探测）。
- 去掉「每 Tab 顶需求捕获块」。
- 明/暗两套稿同时出，代码阶段只绑 `--dsw-alias-*`（见 STYLE-SPEC）。
