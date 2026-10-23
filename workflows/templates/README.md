# `workflows/templates/` —— 用户自备的 ComfyUI 工作流模板位

> **插件不分发任何模板。** 这个目录**只有本说明**，没有 JSON。
> 原因有两条，都不是客气：
>
> 1. **许可**：工作流 JSON 里引用各模型的节点实现，**节点与模型各自的权重许可另算**
>    （设计 §2.4 / §11 K22）。把上游的 `workflows/` 复制进来会越界。
> 2. **实用**：节点 id、字段名、模型版本因人而异。硬编码一份别人跑不动的模板，
>    比没有模板更糟——它会让「装不上模板」变成「跑出来是错的」。

## 放什么

把你的 ComfyUI 工作流（**API 格式**，即 `{ "3": { "class_type": ..., "inputs": {...} } }`，
不是 UI 格式的 `{ nodes: [...], links: [...] }`）按下面的名字放进这个目录：

| kind | 本地 · nvidia | 本地 · amd | 云端 RunningHub |
| --- | --- | --- | --- |
| `t2i` | `krea2_hyperreal_t2i.json` | `qwen_image_2_1_t2i_gguf.json` | `runninghub_krea2_t2i.json` |
| `i2i` | `qwen_image_edit_2511_i2i.json` | `qwen_image_2_1_i2i_gguf.json` | `runninghub_qwen_image_edit_2511_i2i.json` |
| `r2v` | `minimax_h3_r2v.json` | `minimax_h3_r2v_gguf.json` | `runninghub_minimax_h3_r2v.json` |
| `tts` | `qwen3_tts_voice_design.json` | `qwen3_tts_voice_design_gguf.json` | `runninghub_qwen3_tts_voice_design.json` |
| `music` | `minimax_music3.json` | `minimax_music3.json` | `runninghub_minimax_music3.json` |

规格文件（`workflows/specs/*.json`）里的 `sourceFile` 是**相对 `workflows/`** 的路径，
例如 `"templates/krea2_hyperreal_t2i.json"`。

文件名可以改——改 `sourceFile` 即可；也可以在插件配置里用 `workflows[kind]` 覆盖成任意路径。

## 默认规格假设的「标准模板布局」

默认规格里的 `roles` 指向下面这套节点编号。**你的模板编号不同就要改规格**，
否则执行器会明确报「节点不存在」而不是静默写错地方。

### 图像类（`t2i` / `i2i`）

| 节点 | class_type | 被规格引用的字段 |
| --- | --- | --- |
| `2` | `CLIPTextEncode` | `text`（正向提示词） |
| `3` | `CLIPTextEncode` | `text`（负向提示词） |
| `4` | `EmptyLatentImage` | `width` `height` `aspect_ratio` `resolution` |
| `5` | `KSampler` | `seed` |
| `7` | `SaveImage` | `filename_prefix` |
| `10`（仅 `i2i`） | `LoadImage` | `image`（参考图，`image` 角色） |

### 视频类（`r2v`）

| 节点 | class_type | 被规格引用的字段 |
| --- | --- | --- |
| `10` | H3 视频节点 | `prompt` `duration` `resolution` `aspect_ratio` `seed`；参考素材挂在 `ref_images` / `ref_audios` |
| `11` | `LoadImage` | 占位 loader（`reusePool`） |
| `12` | `LoadAudio` | 占位 loader（`reusePool`） |
| `20` | `SaveVideo` | `filename_prefix` |

### 音频类（`tts` / `music`）

| 节点 | class_type | 被规格引用的字段 |
| --- | --- | --- |
| `20`（`tts`） | TTS 音色设计节点 | `text` `voice_description` `seed` |
| `21`（`tts`） | `SaveAudio` | `filename_prefix` |
| `30`（`music`） | 音乐节点 | `caption` `lyrics` `max_duration` `seed` |
| `31`（`music`） | `SaveAudio` | `filename_prefix` |

## 参考素材怎么绑

`r2v` 走 **`fieldsByType`** 形态（按类型各自编号，**从 0 起**）：

```jsonc
"media": {
  "targetNode": "10",
  "fieldsByType": { "image": "ref_images.ref_image_", "audio": "ref_audios.ref_audio_" },
  "loaders": {
    "image": { "class_type": "LoadImage", "inputs": { "image": "" }, "fileField": "image" },
    "audio": { "class_type": "LoadAudio", "inputs": { "audio": "" }, "fileField": "audio" }
  },
  "reusePool": ["11", "12"],
  "maxImages": 9,
  "maxAudioVideo": 3
}
```

绑完长这样：

```jsonc
"10": {
  "class_type": "MiniMaxH3",
  "inputs": {
    "ref_images": { "ref_image_0": ["11", 0], "ref_image_1": ["1000", 0] },
    "ref_audios": { "ref_audio_0": ["12", 0] }
  }
}
```

- `11` / `12` 是模板自带的占位 loader，**优先复用**；
- 不够时新建节点，id 为 `String(1000 + i)`（这里是 `1000`）；
- 模板里**没被引用到的占位 loader 会被删掉**，不带着空节点提交。

另一种形态是 `mediaField` / `typeField`（`media_1` + `media_type_1`，编号从 1 起、图文共用一套编号），
执行器同样支持，见 `src/workflows/runner.js` 的 `bindMedia`。

## 规格与模板对不上怎么办

1. **最省事**：用工作台里的「工作流解析」把模板解析成规格（确定性解析，见 `src/core/analyzeWorkflow.js`）。
2. **直接改**：`workflows/specs/<kind>.json` 里的 `roles`（节点号 + 字段名）。
3. **只改路径**：在插件配置里写 `workflows: { r2v: "templates/my_h3.json" }`，
   沿用现有规格的角色映射（前提是节点号一致）。

改完请跑一遍单测：

```powershell
node --test src/core/__tests__ src/workflows/__tests__
```

## 裁剪不需要手写清单

规格里**没有** `prune` 字段，也不该手写：执行器会
**从 `outputs` 声明的产物节点反向做可达性遍历**，保留可达节点、删掉其余，
最后清掉指向已删节点的悬空连线（设计 §8.1）。
「prompt 被直写后 LLM 扩写链变成孤立节点」会被自动清掉。
