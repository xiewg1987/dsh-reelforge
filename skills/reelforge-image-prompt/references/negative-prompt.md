# 负向提示词与出图排查

## 一、固定负向提示词

所有资产图与镜头图共用一组，**不要每张图重写**：

```
lowres, blurry, low quality, watermark, text, signature, username,
deformed, disfigured, extra limbs, extra fingers, bad anatomy, bad hands,
plastic skin, waxy skin, mannequin, cgi, 3d render, anime, cartoon,
oversaturated, chromatic aberration, jpeg artifacts, cropped, out of frame
```

按需要追加（只加确实需要的，不要堆）：

| 场景 | 追加 |
| --- | --- |
| 人物三视图 | `multiple heads, inconsistent features, side view missing` |
| 空场景 | `people, person, human, crowd, vehicle` |
| 道具 | `hands, holding, worn, damaged` |
| 竖屏短剧 | `letterbox, black bars` |

## 二、出图不对劲怎么排查

| 症状 | 多半是 | 怎么改 |
| --- | --- | --- |
| 同一角色每张长得不一样 | 人物描述里的**颜色词 / 疤痕 / 发型**没固定 | 把不可变特征补全，颜色词统一 |
| 服装图和角色图打架 | 服装图里画了脸 | 服装图只画衣服，加 `no face, garment only` |
| 场景图继承了人物 | 场景图里有人 | 加负向 `people, person` |
| 图边缘被裁掉主体 | 主体没留边距 | 提示词加 `full body, centered, wide margins` |
| 画面糊成一团 | 负向词堆太狠 / 权重乱 | 精简负向词，先减到 10 个以内试 |
| 风格和全片不一致 | 资产图写了别的画风 | 画风交给 `style` 统一，资产图不写画风 |
| 背景杂色 | 背景词写太满 | 背景只写一个词（`plain grey background`） |

## 三、生成参数

- 尺寸走项目设置（`resolution` / `aspect_ratio`），画幅与成片一致。
- 采样步数不够 → 细节糊；不要靠改提示词补。
- 多图一致性靠**同一份描述文本**——把描述写成**可复用的一段**，不要每次手打。

## 四、三视图的写法

人物资产图写「三视图」时，明确排列方式：

```
character reference sheet, three views side by side: front view, side view, back view,
同一个角色，比例一致，姿势中性，plain grey background, even flat lighting
```

关键：**「同一个角色，比例一致」**——不写这句，模型可能画出三个不同的人。
