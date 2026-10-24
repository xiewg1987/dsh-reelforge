# design/_tools

RF7 主稿工具链。**编辑只在 ArtCraft/FigCraft 的 `.figcraft` 里，或改这里的脚本；不在 Cursor 里手画 SVG。**

| 脚本 | 作用 |
| --- | --- |
| `build-rf7.mjs` | **主稿构建器**：令牌 → FigCraft 变量（Dark/Light 双模式）→ 组件 → 画板 → 复制出亮稿页 → 逐帧导出 PNG/SVG |
| `check-svg.mjs` | 出稿校验：画板尺寸 / 禁 opacity / 颜色必须在令牌白名单内 |
| `inspect.mjs` | 按图层名查几何（`node inspect.mjs "RF/TabBar" "Tab-枢纽"`），排错用 |

## 常用命令

```bash
node design/_tools/build-rf7.mjs     # 重建主稿 + 出稿
node design/_tools/check-svg.mjs      # 校验出稿合规
node design/_tools/inspect.mjs "图层名"  # 查某个图层的尺寸/内边距/填充
```

## build-rf7.mjs 的结构

```text
TOKENS      令牌表（唯一颜色真源）→ 建成 FigCraft 变量集合 RF7
DSL          F/R/E/T 四个节点工厂 + 友好属性名 → node.set 参数
resolve()    把友好属性翻译成 FigCraft props，并按父级上下文决定 sizing
buildTree()  逐层下发 node.create，逐层抓回 id（FigCraft 的 parent 只认 id）
main()       页面 → 变量 → 建板 → 绑变量 → 复制出 Light 页 → 组件真身化 → 导出
```

## 为什么用脚本而不是手拖 FigCraft

1. 手改没有 diff，评审意见无法回溯；
2. 双主题靠变量模式派生，脚本改一处两套同时生效；
3. 布局全用自动布局（`sizingH/sizingV` + `fill/hug`），不手算 y 坐标 —— 上一版手算坐标才出现文字溢出和大片留白；
4. 出稿能自动校验（尺寸 / 禁 opacity / 颜色白名单）。

改稿流程：改 `build-rf7.mjs` → 重跑 → 看 `design/dark|dark|light/*.png` → 过 `check-svg.mjs`。
