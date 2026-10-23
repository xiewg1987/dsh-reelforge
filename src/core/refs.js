/**
 * 参考素材装配（**冻结契约 F6**）。
 *
 * ── 最终签名（已冻结，T3 只消费，不得另写一套装配逻辑）────────────────────────
 *
 *   resolveRefs(shot, assets, options) → {
 *     images:   [ { assetId, kind, category, path, label, refIndex } ],
 *     audios:   [ { assetId, kind, category, path, label, refIndex } ],
 *     tags:     [ string ],
 *     order:    [ 'character', 'scene', 'prop', 'voice' ],
 *     warnings: [ { code, message, ...detail } ],
 *   }
 *
 * ── 每个出参字段的语义 ────────────────────────────────────────────────────────
 *
 * | 字段 | 语义 |
 * | --- | --- |
 * | `images[].assetId` | 该参考图来自哪个资产（变体图时是**变体资产**的 id，不是角色 id） |
 * | `images[].kind` | **装配分组** ∈ `REFERENCE_ORDER`：character / scene / prop（audios 里恒为 voice） |
 * | `images[].category` | 资产自身类别 ∈ `ASSET_CATEGORIES`：character / costume / age / scene / prop / voice … |
 * | `images[].path` | 工作区内相对路径（已过调用方的越界防护钩子，见 `options.resolvePath`） |
 * | `images[].label` | 参考标签文本，如 `林岸（雨衣）`、`码头栈桥（场景背景）` |
 * | `images[].refIndex` | **占位符序号**，从 1 起，跨 images + audios 连续编号（`__MINIMAX_H3_REF_N__` 用它） |
 * | `audios[]` | 同上，`kind` 恒为 `'voice'`，`category` 恒为 `'voice'` |
 * | `tags` | **参考图标签数组**，与 `images[]` 一一对应：`tags[i]` === `images[i].label`。音视频的标签在 `audios[j].label` |
 * | `order` | 装配顺序，恒为 `['character','scene','prop','voice']`（引自 constants） |
 * | `warnings` | **软依赖缺失的显式说明**。音色缺失 / 参考图缺失 / 未匹配说话人 / 无匹配资产 …… 一律进这里，**不许静默降质** |
 *
 * ── 装配规则（照抄上游，不可改）────────────────────────────────────────────────
 *
 * 1. 装配顺序恒为：**人物图 → 场景图 → 道具图 → 人物语音**。
 * 2. 角色参考图优先级：**服装 > 年龄变体 > 角色原图**（两个独立维度，**不叠加**）。
 * 3. **只有说话的角色才引用音色**——不出声角色的音色不进参考素材。
 * 4. 说话人匹配用 `nameMatches`（规范化后**精确相等**，禁 `includes`）。
 * 5. 在场角色识别用 `textMentions`（自动排除被更长名字覆盖的短名）。
 * 6. 上限：图 ≤ 9、音视频 ≤ 3。**超限报错**，不静默截断（`RefLimitError` 带 warnings）。
 *
 * ── 关于第三个形参 ────────────────────────────────────────────────────────────
 *
 * F6 的冻结签名写作 `resolveRefs(shot, assets, ctx)`。本实现把第三个形参命名为
 * `options`：它是**纯数据选项袋**，**不是宿主上下文对象**（`src/core/` 不许渗透宿主专属逻辑）。
 * 位置与冻结签名一致，T3 按位置传参即可。
 *
 * `options` 可选字段：
 * - `maxImages` / `maxAudios`：覆盖上限，默认取 `REFERENCE_LIMITS`。
 * - `text`：覆盖用于「在场角色识别」的文本，默认由 dialogue + narration + visual 拼成。
 * - `speakers`：覆盖说话人列表（跳过 dialogue 解析）。
 * - `resolvePath(asset, field)`：路径解析 / 越界防护钩子。返回 null 视为「该产物不存在」。
 */

import {
  ASSET_CATEGORIES,
  CHARACTER_REFERENCE_PRIORITY,
  REFERENCE_LIMITS,
  REFERENCE_ORDER,
  REFERENCE_TAG_FORMATS,
  nameMatches,
  textMentions,
} from './constants.js';

// ─────────────────────────────────────────────────────────────
// 常量与工具
// ─────────────────────────────────────────────────────────────

/**
 * 音色标签格式。
 *
 * ⚠️ `constants.js` 的 `REFERENCE_TAG_FORMATS` **只有 character / costume / scene / prop 四项**，
 * **缺 `voice` 键**（§7.4 ④ 的标签清单里也没有音色格式）。本文件**不私建枚举**：
 * 先从 constants 取，取不到才用下面的兜底串；主控一旦补上 `REFERENCE_TAG_FORMATS.voice`，
 * 这里自动切换过去，零漂移。**该缺口已在任务报告里列出。**
 */
export const VOICE_TAG_FORMAT = REFERENCE_TAG_FORMATS.voice ?? '{name}（音色）';

/** 参考图 / 音视频超限时抛出的错误。`warnings` 里带着被顶掉的内容说明，绝不静默截断。 */
export class RefLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RefLimitError';
    this.code = 'ref_limit_exceeded';
    Object.assign(this, details);
  }
}

function toIdArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined && v !== '');
  return [value];
}

function toTextArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).filter((s) => s.trim() !== '');
  return [String(value)];
}

/** 标签模板取自 `REFERENCE_TAG_FORMATS`（F8：枚举只在 constants 一处）。 */
function formatTag(category, name) {
  const template = REFERENCE_TAG_FORMATS[category] ?? '{name}';
  return String(template).replace(/\{name\}/g, name);
}

/**
 * 服装标签：`角色名（服装名）`。
 *
 * `REFERENCE_TAG_FORMATS.costume` 的模板是 `'{name}（服装名）'`——`{name}` 是**角色名**，
 * 括号里那两个字是**服装名占位**（模板示例，不是输出）。这里把角色名填进 `{name}`，
 * 把「服装名」替换成变体资产的真实名字，得到 `林岸（雨衣）`。
 */
export function formatCostumeTag(characterName, costumeName) {
  const template = REFERENCE_TAG_FORMATS.costume ?? '{name}（服装名）';
  return String(template)
    .replace(/\{name\}/g, characterName)
    .replace(/服装名/g, costumeName ?? '服装');
}

/** 音色标签：`角色名（音色）`。 */
export function formatVoiceTag(characterName) {
  return String(VOICE_TAG_FORMAT).replace(/\{name\}/g, characterName);
}

/** 从分镜里解析出说话人（`名字：台词`）。重复的说话人只保留第一次出现。 */
export function parseSpeakers(dialogue) {
  const speakers = [];
  for (const line of String(dialogue ?? '').split(/\r?\n/)) {
    const matched = /^\s*([^：:]{1,32})\s*[：:]\s*(.*)$/.exec(line);
    if (!matched) continue;
    const name = matched[1].trim();
    if (!name) continue;
    if (!speakers.includes(name)) speakers.push(name);
  }
  return speakers;
}

/** 分镜里用于「在场角色识别」的文本。 */
export function buildShotText(shot) {
  const sh = shot ?? {};
  return toTextArray([sh.dialogue, sh.narration, sh.visual].filter(Boolean)).join('\n');
}

/** 按字段顺序取产物路径；`resolvePath` 钩子存在时以钩子为准（宿主负责越界防护）。 */
function resolveAssetPath(asset, fields, options) {
  if (!asset) return null;
  if (typeof options.resolvePath === 'function') {
    for (const field of fields) {
      const resolved = options.resolvePath(asset, field);
      if (resolved) return String(resolved);
    }
    return null;
  }
  for (const field of fields) {
    const raw = asset[field];
    if (raw) return String(raw);
  }
  return null;
}

/**
 * 一个角色的**合法称呼集合**。
 *
 * 说话人写的是「林岸」「林岸（雨衣）」这类标签，参考标签也是同一套写法。
 * 这里枚举角色的合法拼写，再交给 `nameMatches`（规范化后精确相等）比较——
 * **不用 includes，也不自己造第二份规范化规则**。
 */
export function characterNameSpellings(character, variants = []) {
  const spellings = new Set();
  if (character?.name) spellings.add(String(character.name));
  for (const variant of variants) {
    if (!variant?.name) continue;
    spellings.add(`${character?.name ?? ''}（${variant.name}）`);
  }
  return [...spellings];
}

// ─────────────────────────────────────────────────────────────
// 主函数
// ─────────────────────────────────────────────────────────────

/**
 * 第三个形参必须是**纯数据选项袋**，不是宿主上下文对象。
 *
 * 宿主上下文对象会带着 `tools` / `systemPrompt` / `storage` 这类成员，
 * 直接当选项袋用会**静默跳过** `resolvePath` 越界防护 —— 这属于静默降质，必须当场报错。
 */
const HOST_CONTEXT_MARKERS = ['tools', 'systemPrompt', 'storage', 'session', 'uiConversation', 'sidebarRightTabs', 'plugins', 'logger'];

export function assertPureOptions(options) {
  if (!options || typeof options !== 'object') return options ?? {};
  const hit = HOST_CONTEXT_MARKERS.filter((key) => key in options);
  if (hit.length > 0) {
    throw new RefLimitError(
      `resolveRefs 的第三个形参是纯数据选项袋，不是宿主上下文对象（检测到 ${hit.join('、')}）。` +
        '请传 { maxImages, maxAudios, text, speakers, resolvePath } —— 传宿主上下文会静默跳过路径越界防护。',
      { code: 'refs_options_not_pure', markers: hit },
    );
  }
  return options;
}

/**
 * 装配一个分镜的参考素材。
 *
 * @param {object} shot 分镜内容字段（subset of `SHOT_CONTENT_FIELDS`）
 * @param {Array<object>} assets 资产清单（`{ id, category, name, image_path, voice_ref, parent_id }`）
 * @param {object} [options] 纯数据选项袋（见文件头说明），**不是宿主上下文对象**
 * @returns {{ images: Array, audios: Array, tags: string[], order: string[], warnings: Array }}
 */
export function resolveRefs(shot, assets, options = {}) {
  const sh = shot ?? {};
  const list = Array.isArray(assets) ? assets : [];
  const opts = assertPureOptions(options);
  const maxImages = opts.maxImages ?? REFERENCE_LIMITS.images;
  const maxAudios = opts.maxAudios ?? REFERENCE_LIMITS.audios;

  /** @type {Array<{code: string, message: string}>} */
  const warnings = [];
  const warn = (code, message, detail = {}) => {
    warnings.push({ code, message, ...detail });
  };

  // ── 索引 ────────────────────────────────────────────────────────────────
  const byId = new Map();
  for (const asset of list) {
    if (asset && asset.id != null) byId.set(String(asset.id), asset);
  }
  const characters = list.filter((a) => a?.category === 'character');
  const voiceAssets = list.filter((a) => a?.category === 'voice');

  /** 角色的变体（服装 / 年龄），按 parent_id 归拢。 */
  const variantsByParent = new Map();
  for (const asset of list) {
    if (asset?.category !== 'costume' && asset?.category !== 'age') continue;
    const parentId = String(asset.parent_id ?? '');
    if (!variantsByParent.has(parentId)) variantsByParent.set(parentId, []);
    variantsByParent.get(parentId).push(asset);
  }
  const variantsOf = (character) => variantsByParent.get(String(character?.id ?? '')) ?? [];

  // ── 1. 在场角色 ─────────────────────────────────────────────────────────
  /** @type {Map<string, { asset: object, source: string }>} */
  const present = new Map();
  const addCharacter = (asset, source) => {
    const key = String(asset.id);
    if (present.has(key)) return;
    present.set(key, { asset, source });
  };

  for (const id of toIdArray(sh.character_ids)) {
    const asset = byId.get(String(id));
    if (!asset) {
      warn('asset_not_found', `分镜引用的角色资产不存在（id=${id}），该角色不参与参考装配。`, { assetId: String(id) });
      continue;
    }
    if (asset.category !== 'character') {
      warn('asset_category_mismatch', `分镜的 character_ids 里放了非角色资产（id=${id}, category=${asset.category}），已跳过。`, {
        assetId: String(id),
        expected: 'character',
        actual: asset.category,
      });
      continue;
    }
    addCharacter(asset, 'shot');
  }

  // 绑定了服装 / 年龄变体 → 变体的父角色必然在场
  for (const id of toIdArray(sh.costume_ids)) {
    const variant = byId.get(String(id));
    if (!variant) {
      warn('asset_not_found', `分镜引用的服装资产不存在（id=${id}），已跳过。`, { assetId: String(id) });
      continue;
    }
    const parent = byId.get(String(variant.parent_id ?? ''));
    if (parent?.category === 'character') addCharacter(parent, 'variant');
  }
  for (const id of toIdArray(sh.age_ids)) {
    const variant = byId.get(String(id));
    if (!variant) {
      warn('asset_not_found', `分镜引用的年龄变体资产不存在（id=${id}），已跳过。`, { assetId: String(id) });
      continue;
    }
    const parent = byId.get(String(variant.parent_id ?? ''));
    if (parent?.category === 'character') addCharacter(parent, 'variant');
  }

  // 文本提及（`textMentions` 自动排除被更长名字覆盖的短名）
  const shotText = opts.text ?? buildShotText(sh);
  if (shotText) {
    for (const character of characters) {
      if (present.has(String(character.id))) continue;
      if (!character.name) continue;
      if (textMentions(shotText, character.name)) {
        addCharacter(character, 'text');
        warn(
          'character_inferred_from_text',
          `角色「${character.name}」未绑定到本镜，但正文里提到了它，已按文本识别加入参考装配。`,
          { assetId: String(character.id), character: character.name },
        );
      }
    }
  }

  // ── 2. 说话人与音色 ─────────────────────────────────────────────────────
  const speakerNames = opts.speakers ? toTextArray(opts.speakers) : parseSpeakers(sh.dialogue);
  const speakingCharacters = [];
  const audioCandidates = [];

  for (const rawSpeaker of speakerNames) {
    const speaker = rawSpeaker.trim();
    if (!speaker) continue;

    // 精确匹配优先（角色原名），再匹配带变体后缀的合法称呼
    let character = null;
    for (const candidate of characters) {
      if (candidate.name && nameMatches(speaker, candidate.name)) {
        character = candidate;
        break;
      }
    }
    if (!character) {
      for (const candidate of characters) {
        const spellings = characterNameSpellings(candidate, variantsOf(candidate));
        if (spellings.some((spelling) => nameMatches(speaker, spelling))) {
          character = candidate;
          break;
        }
      }
    }

    if (!character) {
      warn('speaker_unmatched', `说话人「${speaker}」没有匹配到角色资产，该镜不引用音色（可能是有意的旁白）。`, {
        speaker,
      });
      continue;
    }

    addCharacter(character, 'speaker');
    if (!speakingCharacters.some((c) => String(c.id) === String(character.id))) {
      speakingCharacters.push(character);
    }

    const voice = findVoiceAsset(character, voiceAssets);
    const path = resolveAssetPath(voice, ['voice_ref', 'audio_path'], opts)
      ?? resolveAssetPath(character, ['voice_ref', 'audio_path'], opts);
    if (!path) {
      warn('voice_missing', `说话角色「${character.name}」没有可用音色（voice_ref / audio_path 均为空），本镜缺少语音参考。`, {
        speaker,
        characterId: String(character.id),
      });
      continue;
    }
    audioCandidates.push({
      assetId: voice ? String(voice.id) : String(character.id),
      kind: 'voice',
      category: voice ? String(voice.category ?? 'voice') : 'voice',
      path,
      label: formatVoiceTag(character.name),
      refIndex: 0,
    });
  }

  // 显式绑定的音色资产：只有其角色**在说话**时才引用（规则：只有说话角色才引用音色）
  for (const id of toIdArray(sh.audio_ids)) {
    const asset = byId.get(String(id));
    if (!asset) {
      warn('asset_not_found', `分镜引用的音色资产不存在（id=${id}），已跳过。`, { assetId: String(id) });
      continue;
    }
    if (asset.category !== 'voice') {
      warn('asset_category_mismatch', `分镜的 audio_ids 里放了非音色资产（id=${id}, category=${asset.category}），已跳过。`, {
        assetId: String(id),
        expected: 'voice',
        actual: asset.category,
      });
      continue;
    }
    const owner = byId.get(String(asset.parent_id ?? ''));
    const ownerSpeaks = owner && speakingCharacters.some((c) => String(c.id) === String(owner.id));
    if (!ownerSpeaks) {
      warn('voice_not_speaking', `音色资产「${asset.name ?? asset.id}」绑在本镜，但其角色没有台词，已按「只有说话角色才引用音色」排除。`, {
        assetId: String(asset.id),
      });
      continue;
    }
    if (audioCandidates.some((a) => a.assetId === String(asset.id))) continue;
    const path = resolveAssetPath(asset, ['voice_ref', 'audio_path'], opts);
    if (!path) {
      warn('voice_missing', `音色资产「${asset.name ?? asset.id}」没有可用音频路径（voice_ref / audio_path 均为空）。`, {
        assetId: String(asset.id),
      });
      continue;
    }
    audioCandidates.push({
      assetId: String(asset.id),
      kind: 'voice',
      category: 'voice',
      path,
      label: formatVoiceTag(owner?.name ?? asset.name ?? asset.id),
      refIndex: 0,
    });
  }

  // ── 3. 人物图（服装 > 年龄变体 > 角色原图，独立维度不叠加）─────────────────
  const characterImages = [];
  for (const { asset: character } of present.values()) {
    const picked = pickCharacterImage(character, sh, byId, { warn, variantsOf });
    if (!picked) continue;
    const path = resolveAssetPath(picked.asset, ['image_path'], opts);
    if (!path) {
      if (picked.category === 'character') {
        warn('reference_image_missing', `角色「${character.name}」没有参考图（image_path 为空），本镜缺少该角色的一致性锚点。`, {
          assetId: String(character.id),
          character: character.name,
        });
        continue;
      }
      // 变体缺图 → 显式告警后退回角色原图（不静默降质）
      const fallbackPath = resolveAssetPath(character, ['image_path'], opts);
      if (!fallbackPath) {
        warn('reference_image_missing', `角色「${character.name}」的${picked.category === 'costume' ? '服装' : '年龄变体'}没有参考图，且角色原图也为空，本镜缺少该角色的一致性锚点。`, {
          assetId: String(character.id),
          character: character.name,
        });
        continue;
      }
      warn('variant_image_missing', `角色「${character.name}」绑定的${picked.category === 'costume' ? '服装' : '年龄变体'}没有参考图，已退回角色原图。`, {
        assetId: String(picked.asset.id),
        character: character.name,
      });
      characterImages.push({
        assetId: String(character.id),
        kind: 'character',
        category: 'character',
        path: fallbackPath,
        label: formatTag('character', character.name),
        refIndex: 0,
      });
      continue;
    }
    characterImages.push({
      assetId: String(picked.asset.id),
      kind: 'character',
      category: picked.category,
      path,
      label: picked.label,
      refIndex: 0,
    });
  }

  // ── 4. 场景图 ───────────────────────────────────────────────────────────
  const sceneImages = [];
  for (const id of toIdArray(sh.scene_ids)) {
    const asset = byId.get(String(id));
    if (!asset) {
      warn('asset_not_found', `分镜引用的场景资产不存在（id=${id}），该场景不参与参考装配。`, { assetId: String(id) });
      continue;
    }
    if (asset.category !== 'scene') {
      warn('asset_category_mismatch', `分镜的 scene_ids 里放了非场景资产（id=${id}, category=${asset.category}），已跳过。`, {
        assetId: String(id),
        expected: 'scene',
        actual: asset.category,
      });
      continue;
    }
    const path = resolveAssetPath(asset, ['image_path'], opts);
    if (!path) {
      warn('reference_image_missing', `场景「${asset.name ?? asset.id}」没有参考图（image_path 为空），本镜缺少场景锚点。`, {
        assetId: String(asset.id),
      });
      continue;
    }
    sceneImages.push({
      assetId: String(asset.id),
      kind: 'scene',
      category: 'scene',
      path,
      label: formatTag('scene', asset.name ?? asset.id),
      refIndex: 0,
    });
  }

  // ── 5. 道具图 ───────────────────────────────────────────────────────────
  const propImages = [];
  for (const id of toIdArray(sh.prop_ids)) {
    const asset = byId.get(String(id));
    if (!asset) {
      warn('asset_not_found', `分镜引用的道具资产不存在（id=${id}），该道具不参与参考装配。`, { assetId: String(id) });
      continue;
    }
    if (asset.category !== 'prop') {
      warn('asset_category_mismatch', `分镜的 prop_ids 里放了非道具资产（id=${id}, category=${asset.category}），已跳过。`, {
        assetId: String(id),
        expected: 'prop',
        actual: asset.category,
      });
      continue;
    }
    const path = resolveAssetPath(asset, ['image_path'], opts);
    if (!path) {
      warn('reference_image_missing', `道具「${asset.name ?? asset.id}」没有参考图（image_path 为空），本镜缺少道具锚点。`, {
        assetId: String(asset.id),
      });
      continue;
    }
    propImages.push({
      assetId: String(asset.id),
      kind: 'prop',
      category: 'prop',
      path,
      label: formatTag('prop', asset.name ?? asset.id),
      refIndex: 0,
    });
  }

  // ── 6. 装配顺序 + 占位符序号 ────────────────────────────────────────────
  const images = [...characterImages, ...sceneImages, ...propImages];
  const audios = audioCandidates;
  const combined = [...images, ...audios];
  combined.forEach((ref, i) => {
    ref.refIndex = i + 1;
  });
  const tags = images.map((ref) => ref.label);

  // ── 7. 上限：超限报错，不静默截断 ───────────────────────────────────────
  if (images.length > maxImages) {
    const dropped = images.slice(maxImages);
    throw new RefLimitError(
      `参考图超出上限：装配出 ${images.length} 张，上限 ${maxImages} 张。请减少本镜绑定的人物/场景/道具数量（不是静默截断）。`,
      {
        limit: maxImages,
        actual: images.length,
        kind: 'images',
        dropped: dropped.map((r) => ({ assetId: r.assetId, label: r.label })),
        warnings: [
          ...warnings,
          {
            code: 'ref_limit_exceeded',
            message: `参考图超出上限 ${maxImages} 张，实际 ${images.length} 张，被顶掉的：${dropped.map((r) => r.label).join('、')}`,
          },
        ],
      },
    );
  }
  if (audios.length > maxAudios) {
    const dropped = audios.slice(maxAudios);
    throw new RefLimitError(
      `参考音视频超出上限：装配出 ${audios.length} 段，上限 ${maxAudios} 段。请减少本镜说话人数（不是静默截断）。`,
      {
        limit: maxAudios,
        actual: audios.length,
        kind: 'audios',
        dropped: dropped.map((r) => ({ assetId: r.assetId, label: r.label })),
        warnings: [
          ...warnings,
          {
            code: 'ref_limit_exceeded',
            message: `参考音视频超出上限 ${maxAudios} 段，实际 ${audios.length} 段，被顶掉的：${dropped.map((r) => r.label).join('、')}`,
          },
        ],
      },
    );
  }

  return {
    images,
    audios,
    tags,
    order: [...REFERENCE_ORDER],
    warnings,
  };
}

/**
 * 把装配结果摊平成**有序参考列表**（图片在前、语音在后，refIndex 连续）。
 * T3 拼提示词与绑媒体都用它，不用自己猜顺序。
 */
export function flattenRefs(resolved) {
  if (!resolved) return [];
  return [...(resolved.images ?? []), ...(resolved.audios ?? [])];
}

/**
 * 找角色对应的音色资产：先按 `parent_id`，再按**规范化后精确相等**的名字。
 */
export function findVoiceAsset(character, voiceAssets) {
  if (!character) return null;
  const list = Array.isArray(voiceAssets) ? voiceAssets : [];
  const byParent = list.find((v) => v && String(v.parent_id ?? '') === String(character.id));
  if (byParent) return byParent;
  return list.find((v) => v?.name && character.name && nameMatches(v.name, character.name)) ?? null;
}

/**
 * 按优先级挑角色的参考图：**服装 > 年龄变体 > 角色原图**（独立维度，不叠加）。
 */
function pickCharacterImage(character, shot, byId, helpers) {
  for (const kind of CHARACTER_REFERENCE_PRIORITY) {
    if (kind === 'costume') {
      const variant = firstBoundVariant(shot.costume_ids, character.id, byId, 'costume', helpers);
      if (variant) {
        return {
          asset: variant,
          category: 'costume',
          label: formatCostumeTag(character.name, variant.name),
        };
      }
      continue;
    }
    if (kind === 'age') {
      const variant = firstBoundVariant(shot.age_ids, character.id, byId, 'age', helpers);
      if (variant) {
        return {
          asset: variant,
          category: 'age',
          label: formatTag('character', character.name),
        };
      }
      continue;
    }
    if (kind === 'character') {
      return { asset: character, category: 'character', label: formatTag('character', character.name) };
    }
  }
  return null;
}

/** 在分镜绑定的变体里找第一个属于该角色的变体；同类多个时取第一个并告警。 */
function firstBoundVariant(ids, characterId, byId, category, helpers) {
  const bound = [];
  for (const id of toIdArray(ids)) {
    const variant = byId.get(String(id));
    if (!variant) {
      helpers.warn('asset_not_found', `分镜引用的${category === 'costume' ? '服装' : '年龄变体'}资产不存在（id=${id}），已跳过。`, {
        assetId: String(id),
      });
      continue;
    }
    if (variant.category !== category) {
      helpers.warn('asset_category_mismatch', `变体引用类别不符（id=${id}, 期望 ${category}, 实际 ${variant.category}），已跳过。`, {
        assetId: String(id),
        expected: category,
        actual: variant.category,
      });
      continue;
    }
    if (String(variant.parent_id ?? '') !== String(characterId)) continue;
    bound.push(variant);
  }
  if (bound.length > 1) {
    helpers.warn('multiple_variants', `同一角色绑定了多个${category === 'costume' ? '服装' : '年龄变体'}，按优先级取第一个：${bound[0].name ?? bound[0].id}。`, {
      characterId: String(characterId),
      category,
      candidates: bound.map((v) => String(v.id)),
    });
  }
  return bound[0] ?? null;
}

/** 导出资产类别表，供调用方做入参校验（唯一枚举仍以 constants 为准）。 */
export { ASSET_CATEGORIES };
