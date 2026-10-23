---
name: reelforge-image-prompt
description: 资产参考图与镜头图的提示词规范——人物三视图、场景图、道具图、服装与年龄变体怎么写才不漂
whenToUse: 需要为角色、场景、道具或变体出参考图，或要写图/图生图的正向提示词时
version: 0.1.0
---

# 图 / 图生图提示词规范

## 一、两种图，别混

| 图 | 谁用 | 要求 |
| --- | --- | --- |
| **资产参考图** | 素材库（角色 / 场景 / 道具 / 变体） | **干净、正面、可复用**——它是后续每个镜头的参考素材 |
| **镜头图** | 某一镜的首帧 | 服从该镜的构图与光位 |

资产参考图写歪了，后面每一镜都会跟着歪。

## 二、资产参考图的写法

### 人物（character）

写 **三视图**（正面 / 侧面 / 背面，同一张图里并列），这是跨镜一致性的锚：

```
character reference sheet, three views front side back,
林岸，28岁男性，寸头，左眉旧疤，深灰工装外套，内穿洗旧衬衫，
深灰工装裤，黑色胶靴，full body, neutral pose, plain grey background,
even flat studio lighting, no text, no watermark
```

要点：

- **年龄、性别、体型、发型、疤痕/痣这类不可变特征**必须写全——这些是识别人物的锚。
- **颜色词固定**（深灰工装，不要一会儿「深灰」一会儿「藏青」）。
- 背景**纯净**（纯灰/白），不要带场景——带场景的背景会被镜头图继承。
- **不要文字、不要水印**。

### 服装变体（costume）

`costume` 是**挂在角色下的变体**，必须带 `parent_id` 指向角色。

```
costume reference, 林岸的油布雨衣，
连帽油布雨衣，墨绿色，磨白的下摆，铜扣，肩部有一道补丁，
front view, plain grey background, even lighting, no text
```

**服装图只画衣服本身**，不要重复画人脸——否则两张参考图会打架。
写 `parent_id` 时用**角色的 id**。

### 年龄变体（age）

同角色的另一个时期：

```
character reference sheet, three views front side back,
林岸（少年时期），14岁男孩，瘦高，same face as adult version but younger,
short messy hair, oversized white shirt,
plain grey background, even lighting, no text
```

写「同一个人、更年轻」的关键是**保留可辨识特征**（眉形、疤、脸型），
并显式写 `same face as ...`。

### 场景（scene）

```
empty environment, 码头栈桥，木栈桥向北伸入江面，
北端缆绳桩，南端货仓门，侧面锈蚀栏杆，江面灰雾，
wide establishing view, overcast diffuse light, muted cold palette, no people, no text
```

要点：

- **空场景，不要人**（人由参考图叠加进来）。
- 写清**空间锚点**：哪端有什么、朝向如何——与 bible 的站位表保持一致。
- 固定 1–2 个**可复用的机位视角**（如「从南端货仓门望北」）。

### 道具（prop）

```
single prop, 黑伞，黑色长柄伞，伞面有一处磨损，
close-up, plain grey background, soft even lighting, no text
```

## 三、正向 / 负向提示词

- 正向提示词：**主体 + 关键特征 + 视角 + 光线 + 背景**，按这个顺序写。
- 负向提示词：**固定一组**，不要每张图重写：
  ```
  lowres, blurry, watermark, text, signature, deformed, extra limbs,
  bad anatomy, plastic skin, anime, cartoon, 3d render, oversaturated
  ```

## 四、图生图（i2i）

用参考图做图生图时：

- **参考图只提供身份与风格**，镜头图里的姿态/构图由提示词控制。
- 提示词里**不要重复描述参考图里已有的细节**（重复会被放大成噪点）。
- 强度别拉满：拉满会让参考图的姿态盖掉提示词的构图。

## 五、尺寸与画幅

- 分辨率档位用项目设置（`resolution`），画幅用 `aspect_ratio`。
- 画幅是**成片画幅**（如 `9:16` 竖屏短剧），不是随手选。
- `resolution` / `aspect_ratio` 留空串表示继承项目设置。

## 六、别做的事

- 不要在资产参考图里写镜头运动（推拉摇移）——那是镜头图的事。
- 不要一镜一换画风——画风由 `style` 统一，资产图只管身份与场景。
- 不要写「电影感」「氛围感」这类空词堆叠，落到具体的光线与色调。

## 七、固定负向提示词与出图排查

负向提示词用**固定一组**，不要每张图重写；出图不对劲时按症状对照排查表改。
详见 `references/negative-prompt.md`。
