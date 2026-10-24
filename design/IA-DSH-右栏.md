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

| Tab id | 标签（中文待定稿） | 内容 |
| --- | --- | --- |
| hub | 枢纽 | 章节 + 镜头摘要 |
| shots | 分镜 | 分镜表 |
| assets | 资产 | 10 类 |
| context | 上下文 | bible / style / continuity |
| skills | 技能 | 列表 + 安装提示 |
| output | 成片 | 播放器 + 交付物 |
| log | 日志 | 变更 + 回滚入口 |

流程屏**不在 Tab 里**：无 Tab 条，仅 Header + Stage + Scroll + Footer。

## Footer 纪律

每屏 Footer **三件套**：本屏标签、本屏主文案、**一个**主按钮；不可点时必须禁用 + 说明缺什么。

## RF7 相对 v4/v6 的 IA 变更摘要

- 画板命名：`RunGate` 替代 RunStack/RunMode+Device 双屏命名（仍是一屏合并探测）。
- 去掉「每 Tab 顶需求捕获块」。
- 明/暗两套稿同时出，代码阶段只绑 `--dsw-alias-*`（见 STYLE-SPEC）。
