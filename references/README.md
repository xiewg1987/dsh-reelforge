# ReelForge 设计参考

按 `docs/ReelForge-设计方案.md` §10（DSH 交互设计）采集的界面参考图，用于设计 ReelForge 的**右栏工作台**（§10.2）与**聊天行**（§10.3）。

> ⚠️ **版权提示**：本目录内所有图片版权归原作者/平台所有，仅作**设计参考**，不随产品分发、不作再分发。`manifest.json` 记录了每张图的来源 URL 与 ID，需要时可按 URL 重新拉取。第三方图库入库前务必先查授权。

---

## 目录结构

```
references/
├─ manifest.json           # 全部参考图的清单（来源、标题、作者、URL、字节数）
├─ huaban/                 # 花瓣 —— 8 个中文检索词，共 96 张
│  ├─ 分镜/                 # 分镜条、竖版分镜长图
│  ├─ 短剧/  工作台/  看板/
│  ├─ ui设计/  ai设计/  产品设计/  编辑器/
├─ pinterest/             # Pinterest —— 3 个英文检索词，共 16 张
│  ├─ storyboard-app-ui-design/
│  ├─ ai-video-generation-app-interface-design/
│  └─ short-drama-storyboard-app-ui-design/
├─ _pages/                # 检索页原文（可复现证据）
│  ├─ pinterest-*.html        # 搜索页 SSR 快照
│  └─ huaban-*.json           # 花瓣 API 原始响应
└─ _tools/                 # 采集与压缩脚本（可重跑）
```

| 指标 | 值 |
| --- | --- |
| 参考图总数 | **112**（花瓣 96 + Pinterest 16） |
| 图片总体积 | 20.4 MB（原始下载 133.3 MB，压缩后） |
| 检索词 | 11 个（中文 8 + 英文 3） |
| 下载失败 | 0 |

---

## 采集方法（可复现）

### 花瓣：走公开 API，无需登录

```bash
node _tools/huaban_collect.js items.json "分镜" "工作台" "UI设计" "短剧" ...
node _tools/download_refs.js items.json ../references
```

关键点：`https://api.huaban.com/search?q=<词>&type=pin&page=1` 直接返回 JSON，字段为 `pins[]`，每条含 `file.url`（图床直链，带 `auth_key`）、`pin_id`、`board`、`user`、`like_count`。图床 `gd-hbimg-edge.huaban.com` 直连与走代理均可下载。

⚠️ **中文长词容易返回 0 条**（如「分镜 工作台 UI」），改用短词即可（`分镜`、`工作台`、`UI设计`）。

### Pinterest：必须有登录态的浏览器

匿名抓取拿不到搜索结果，**两条路都堵死**：

| 方式 | 结果 |
| --- | --- |
| curl 抓搜索页 | 200，但 `__PWS_INITIAL_PROPS__` 里 `search.currentSearch.query` 为空串、`pins`/`resources` 全空 → 只有应用外壳 |
| headless Chrome（CDP + 代理） | 撞**登录墙**，正文仅 308 字符全是登录框 |
| 内置浏览器（有登录态） | ✅ 正常出 pin |

内置浏览器的取法：

```js
// 一次只能取一个 pin（query 的 dom 选择器是 first-match 语义）
query(kind="dom", selector='[data-test-pin-slot-index="0"]')
```

从返回的 HTML 里取三样东西：`data-test-pin-id`（pin id）、`img[src*="i.pinimg.com"]` 的 `src`（图片路径）、`[data-test-id="related-pins-title"]` 里 `title=` 属性（标题）。滚动后槽位索引会重排（虚拟化），每屏稳定 6 个。

⚠️ **图片尺寸变体的坑**：`236x/<hash>.jpg` → `originals/<hash>.png` 这个「扩展名翻转」规则**并不总成立**。实测同一 pin：`originals/<hash>.jpg` 返回 200（260KB），`originals/<hash>.png` 返回 403。`_tools/download_refs.js` 采取 `.jpg` → `.png` → `736x` 的回退链。

---

## 从参考里提炼出的可落地模式

这些是真正影响实现的部分，已回写进设计方案。

| # | 参考 | 观察到的模式 | 对 ReelForge 的影响 |
| --- | --- | --- | --- |
| 1 | Pinterest「AI Image Generation App」 | ① 画廊页顶部是筛选芯片（All / Trending / Art / Cyberpunk）；② 详情页动作区是 `Remix` / `Download` / `Share` 三按钮；③ Generate 面板 = `Text to Image` 模式下拉 + `Prompt:` 输入框 + `Aspect Ratio:` 芯片组（1:1 / 2:1 / 4:3 / 16:9）+ `Model` / `Style` 两个下拉 + 渐变绿色主按钮 | §10.2 的**方案选择器**沿用「参数分组 + 单一主行动」结构；§7.3 的评分维度（意图匹配 / 能力可用 / 成本）正对应 `Model` / `Aspect Ratio` / `Style` 三个下拉位；筛选芯片对应「按角色/场景筛分镜」 |
| 1b | 同上 · 详情页 | `Remix` = 以当前参数重跑一次，`Download` = 取产物，`Share` = 导出 | §10.2 的**逐镜卡片**要有「重生成 / 下载 / 分享」三个动作，其中「重生成」必须走 §8.4 的内容指纹幂等（参数没变就不重复付费） |
| 2 | Pinterest「VideoMaker App」 | 顶部 `Img → Video` / `Text → Video` **双模式切换**，右上角显示余额（100 Coins） | 后端能力差异（`mode` 枚举）**直接映射成 UI 上的模式切换**——用户在界面上就能看出当前模型支持哪种生成方式；余额位对应 §7.3 的成本估算 |
| 3 | Pinterest「Storyboard i did a while back」 | 手绘分镜表三列：`SCENE` / `SHOT` / `SHOT SIZE` + 手写运镜备注 | §9.2 的**分镜表**列定义有了现成范式；运镜备注列可直接承载 `cameraMove` |
| 4 | Pinterest「Simple black and white vertical storyboard」+ 花瓣竖版分镜长图 | 竖版（1:3~1:4）分镜条是竖屏短剧的原生形态 | 9:16 短剧的**分镜表默认应出竖版长图**，不是横版网格 |
| 5 | Pinterest「Kidory」章节播放器 | 章节标题 + 进度条 + 倍速（1x）+ 播放/暂停 + 右侧参数面板 | §10.3 的**成片播放器**按「章节/镜头」分段导航，倍速与逐镜跳转是刚需 |
| 6 | Pinterest「UI8」漫画 App UI 套件 | 深色主题 + 角色卡列表 + 章节列表 + 绿色主按钮 | §6.3 的**角色/场景资产库**用卡片式；深色主题与 DSH 主题 token 的适配要重点验证 |

---

## 复跑

```bash
# 1) 花瓣采集
node _tools/huaban_collect.js /tmp/hb.json "分镜" "工作台" "UI设计" "短剧" "AI设计" "编辑器" "看板" "产品设计"
# 2) Pinterest：内置浏览器逐槽位取，见上方说明，把结果填进 _tools/pin_manifest.js
node _tools/pin_manifest.js /tmp/pin.json
# 3) 下载
node _tools/download_refs.js /tmp/hb.json  ../
node _tools/download_refs.js /tmp/pin.json ../
# 4) 压缩（长边 > 1600 的缩放 + > 500KB 的重编码，格式与扩展名保持一致）
python _tools/compress_refs.py ../
# 5) 重建清单
node _tools/build_manifest.js ../ /tmp/hb.json /tmp/pin.json
```

> **注意**：本机代理端口 `127.0.0.1:21882` 的存亡随时变化。Pinterest 走直连必失败，**必须走代理**；代理不在时所有下载会快速失败（`curl: (7) Failed to connect ... over proxy`）。先测端口再决定路线。
