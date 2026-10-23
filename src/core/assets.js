/**
 * 资产模型（10 类 + 变体）。
 *
 * ── 纪律 ────────────────────────────────────────────────────────────────────
 *
 * 1. 10 类：`character` `scene` `prop` `costume` `age` `voice` `music` `sfx` `video` `other`
 *    （类别表取自 `constants.js`，F8：不在本文件另造一份）。
 * 2. **`costume` / `age` 是变体类，必须带 `parent_id` 指向角色**；缺则**拒绝写入**。
 *    理由：否则会「素材库里看得见、分镜能引用、生成时被静默忽略」。
 * 3. **产物字段**（`image_path` / `voice_ref`）**只能由生成阶段写**（F3），内容写入报错。
 *
 * 本模块是**纯逻辑**（不碰宿主 ctx，也不碰文件系统）：落盘与写入门禁由 `src/host/` 负责。
 */

import {
  ASSET_CATEGORIES,
  ASSET_PRODUCT_FIELDS,
  VARIANT_ASSET_CATEGORIES,
} from './constants.js';

/** 资产相关的错误。 */
export class AssetError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AssetError';
    this.code = details.code ?? 'asset_error';
    Object.assign(this, details);
  }
}

/** 是不是变体类（必须带 parent_id）。 */
export function isVariantCategory(category) {
  return VARIANT_ASSET_CATEGORIES.includes(String(category ?? ''));
}

/** 校验资产类别合法。 */
export function assertAssetCategory(category) {
  const name = String(category ?? '');
  if (!ASSET_CATEGORIES.includes(name)) {
    throw new AssetError(
      `资产类别非法：「${name}」。合法类别只有 ${ASSET_CATEGORIES.length} 类：${ASSET_CATEGORIES.join(' / ')}。`,
      { code: 'asset_category_invalid', category: name, allowed: [...ASSET_CATEGORIES] },
    );
  }
  return name;
}

/**
 * 变体必须带 `parent_id`（指向角色）。缺 → 拒绝写入。
 *
 * @param {object} asset
 * @returns {string} 通过校验的 parent_id
 */
export function assertVariantParent(asset) {
  const category = String(asset?.category ?? '');
  if (!isVariantCategory(category)) return '';
  const parentId = String(asset?.parent_id ?? '').trim();
  if (!parentId) {
    throw new AssetError(
      `${category} 是变体类，必须带 parent_id 指向所属角色——已拒绝写入（否则素材库里看得见、分镜能引用、生成时被静默忽略）。`,
      { code: 'asset_variant_missing_parent', category, assetId: asset?.id ?? null },
    );
  }
  return parentId;
}

/**
 * 产物字段门禁：`image_path` / `voice_ref` **只能由生成阶段写**（F3）。
 *
 * @param {object} patch 待写入字段
 * @param {{stage?: 'content'|'render'}} [options] `stage: 'render'` 才允许写产物字段
 */
export function assertNoProductFields(patch, options = {}) {
  const stage = options.stage ?? 'content';
  if (stage === 'render') return;
  const fields = Object.keys(patch ?? {}).filter((field) => ASSET_PRODUCT_FIELDS.includes(field));
  if (fields.length > 0) {
    throw new AssetError(
      `产物字段 ${fields.join(' / ')} 只能由生成阶段写（内容写入已拒绝）——外部无法伪造「已生成」状态。`,
      { code: 'asset_product_field_forbidden', fields, stage },
    );
  }
}

/**
 * 校验一个资产（新建或更新后的完整形态）。
 *
 * @param {object} asset
 * @param {{stage?: 'content'|'render'}} [options]
 */
export function validateAsset(asset, options = {}) {
  if (!asset || typeof asset !== 'object') {
    throw new AssetError('资产必须是一个对象。', { code: 'asset_invalid' });
  }
  assertAssetCategory(asset.category);
  assertVariantParent(asset);
  if (!String(asset.name ?? '').trim()) {
    throw new AssetError('资产必须有 name（名字要与分镜里的写法一致，否则匹配不上）。', { code: 'asset_name_required' });
  }
  if (options.stage !== 'render') {
    const productFields = ASSET_PRODUCT_FIELDS.filter((field) => field in asset && asset[field] != null);
    if (productFields.length > 0) {
      throw new AssetError(
        `产物字段 ${productFields.join(' / ')} 只能由生成阶段写（内容写入已拒绝）。`,
        { code: 'asset_product_field_forbidden', fields: productFields },
      );
    }
  }
  return asset;
}

/**
 * 新建资产（内容写入）。产物字段一律不写。
 *
 * @param {object} input `{ id?, category, name, description?, parent_id?, ... }`
 * @param {{id?: string, stage?: 'content'|'render'}} [options]
 */
export function createAsset(input, options = {}) {
  const source = input ?? {};
  assertAssetCategory(source.category);
  assertNoProductFields(source, options);

  const id = String(options.id ?? source.id ?? deriveAssetId(source.category, source.name)).trim();
  if (!id) {
    throw new AssetError('资产必须有 id。', { code: 'asset_id_required' });
  }

  const asset = {
    id,
    category: String(source.category),
    name: String(source.name ?? '').trim(),
    description: source.description == null ? '' : String(source.description),
    parent_id: source.parent_id == null ? null : String(source.parent_id),
  };
  return validateAsset(asset, options);
}

/**
 * 更新资产（内容写入）。产物字段由 `options.stage === 'render'` 才允许带。
 *
 * @param {object} existing 已有资产
 * @param {object} patch 待改字段
 * @param {{stage?: 'content'|'render'}} [options]
 */
export function updateAsset(existing, patch, options = {}) {
  if (!existing || typeof existing !== 'object') {
    throw new AssetError('要更新的资产不存在。', { code: 'asset_not_found' });
  }
  assertNoProductFields(patch, options);

  const merged = { ...existing, ...patch, id: existing.id };
  if (merged.category !== existing.category && isVariantCategory(merged.category)) {
    assertVariantParent(merged);
  }
  if (isVariantCategory(merged.category)) {
    assertVariantParent(merged);
  }
  return validateAsset(merged, options);
}

/**
 * 列出某个角色的变体（服装 / 年龄）。
 *
 * @param {Array<object>} assets
 * @param {string} parentId 角色 id
 */
export function listVariants(assets, parentId) {
  const list = Array.isArray(assets) ? assets : [];
  const key = String(parentId ?? '');
  return list.filter((a) => isVariantCategory(a?.category) && String(a?.parent_id ?? '') === key);
}

/** 按类别取资产。 */
export function findAssetsByCategory(assets, category) {
  const list = Array.isArray(assets) ? assets : [];
  return list.filter((a) => a?.category === category);
}

/**
 * 派生一个资产 id（宿主也可以自己指定 id）。
 *
 * @param {string} category
 * @param {string} name
 */
export function deriveAssetId(category, name) {
  const cat = String(category ?? 'other').trim() || 'other';
  const slug = String(name ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
  return slug ? `${cat}_${slug}` : cat;
}
