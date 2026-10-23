/**
 * WorkflowSpec —— 形状、校验与**取用顺序**（冻结契约 F5）。
 *
 * 形状（F5，冻结不可改）：
 *   { id, kind, name, description, sourceFile, roles, media?, outputs, prune? }
 *
 * 三条纪律：
 *   1. **枚举只从 `src/core/constants.js` 取**（F8）。本文件里的 `ASPECT_RATIO_LABELS`
 *      是「ComfyUI 字段取值 → 本插件枚举」的**翻译表**，不是枚举本身；
 *      单测盯着它的键集与 `VIDEO_ASPECT_RATIOS` 完全一致，漂移即红。
 *   2. **`media` 缺省为 `null`**：不声明就没有参考素材绑定（与上游 `analyzeWorkflow()`
 *      的 `media: null` 同一语义）。`r2v` 必须声明（设计 §2.3 ③(c) / §8.1）。
 *   3. **`prune` 不推导、不预置**：裁剪靠 runner 的「从 outputs 反向可达性」自动完成，
 *      规格里不写死删节点清单（上游 `analyzeWorkflow()` 同样不推导 prune）。
 *      `prune` 字段**保留**在形状里：若用户自带规格点名了要删的节点，runner 会先按名单删。
 *
 * 规格集（`workflows/specs/*.json`）的形状是**容器**，不是单个规格：
 *   { kind, specs: { 'local-nvidia': <WorkflowSpec>, 'local-amd': <WorkflowSpec>, 'cloud-runninghub': <WorkflowSpec> } }
 * —— 同一批 kind 有两套 `sourceFile`（本地版 / 云端版），**位置是二维的，不是两档能力**。
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  ASPECT_RATIO_LABELS,
  CLOUD_PROVIDERS,
  GENERATION_KINDS,
  HW_MODES,
  REFERENCE_LIMITS,
  RUNNINGHUB_TIERS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTION_MP,
} from '../core/constants.js';

/** 规格集里的档位键（与 §2.4 的三列一一对应）。 */
export const SPEC_VARIANTS = Object.freeze(['local-nvidia', 'local-amd', 'cloud-runninghub']);

/**
 * 画幅 → ComfyUI 枚举标签（`roles.aspect_ratio.map`）。
 *
 * 唯一来源是 `constants.js`（F8）。键集必须与 `VIDEO_ASPECT_RATIOS` **完全相等**——
 * 这是 F8 的一致性锚点，单测盯着，漂移即红。这里只做**再导出**，不另立一份。
 */
export { ASPECT_RATIO_LABELS };

/** 分辨率档 → 百万像素（`roles.resolution.map`），直接取自 constants（F8）。 */
export const RESOLUTION_MAP = VIDEO_RESOLUTION_MP;

/**
 * 角色缺省 map。规格里没写 `map` 时按角色名补上——
 * **省掉 5 个规格文件里重复抄同一张表的样板**（表本身仍只有一份）。
 */
export const DEFAULT_ROLE_MAPS = Object.freeze({
  aspect_ratio: ASPECT_RATIO_LABELS,
  resolution: RESOLUTION_MAP,
});

/** 每种 kind 至少要有的角色（缺了就说明这次生成没法做）。 */
export const REQUIRED_ROLES_BY_KIND = Object.freeze({
  t2i: Object.freeze(['positive_prompt']),
  i2i: Object.freeze(['positive_prompt']),
  r2v: Object.freeze(['positive_prompt']),
  tts: Object.freeze(['text']),
  music: Object.freeze(['caption']),
});

/** 参考素材绑定支持的形态（设计 §8.1）。 */
export const MEDIA_FORMS = Object.freeze(['mediaField', 'fieldsByType']);

/** loader 模板的默认文件字段（按 class_type 推断）。 */
const LOADER_FILE_FIELDS = Object.freeze({
  loadimage: 'image',
  loadaudio: 'audio',
  loadvideo: 'video',
  vhs_loadvideo: 'video',
  videouploader: 'video',
  audiouploader: 'audio',
});

/**
 * 推断 loader 节点装载的媒体类型。
 * @param {string} classType
 * @returns {'image'|'audio'|'video'|null}
 */
export function loaderMediaType(classType) {
  const key = String(classType ?? '').toLowerCase();
  if (key.includes('image')) return 'image';
  if (key.includes('audio')) return 'audio';
  if (key.includes('video')) return 'video';
  return null;
}

/**
 * 规范化一个规格：补 `media: null`、补缺省 `map`、补 `prune: []`、补 `outputs: []`。
 * **不改 id / kind / sourceFile**（F5 冻结）。
 *
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
export function normalizeSpec(input) {
  const spec = { ...(input ?? {}) };
  spec.id = String(spec.id ?? '');
  spec.kind = String(spec.kind ?? '');
  spec.name = String(spec.name ?? spec.id ?? '');
  spec.description = String(spec.description ?? '');
  spec.sourceFile = String(spec.sourceFile ?? '');
  spec.roles = { ...(spec.roles ?? {}) };
  for (const [role, binding] of Object.entries(spec.roles)) {
    const next = { ...(binding ?? {}) };
    next.node = String(next.node ?? '');
    next.field = String(next.field ?? '');
    if (next.map === undefined || next.map === null) {
      const fallback = DEFAULT_ROLE_MAPS[role];
      if (fallback) next.map = fallback;
    }
    spec.roles[role] = next;
  }
  // media 恒有值：缺省为 null（不声明 = 不绑定参考素材）
  spec.media = spec.media ?? null;
  spec.outputs = Array.isArray(spec.outputs) ? spec.outputs.map(String) : [];
  spec.prune = Array.isArray(spec.prune) ? spec.prune.map(String) : [];
  return spec;
}

/**
 * 校验一个规格。
 * @param {unknown} spec
 * @returns {{ ok: boolean, errors: Array<{ path: string, message: string }> }}
 */
export function validateSpec(spec) {
  const errors = [];
  const push = (p, message) => errors.push({ path: p, message });

  if (!spec || typeof spec !== 'object') {
    return { ok: false, errors: [{ path: '', message: '规格必须是对象' }] };
  }
  const s = normalizeSpec(spec);

  if (!s.id) push('id', 'id 不能为空');
  if (!GENERATION_KINDS.includes(s.kind)) {
    push('kind', `kind 必须是 ${GENERATION_KINDS.join(' / ')} 之一，实际为 ${JSON.stringify(s.kind)}`);
  }
  if (!s.name) push('name', 'name 不能为空');
  if (!s.sourceFile) push('sourceFile', 'sourceFile 不能为空（指向 workflows/templates/ 下的模板）');
  if (s.outputs.length === 0) push('outputs', 'outputs 至少要有一个产物节点的 class_type');

  for (const [role, binding] of Object.entries(s.roles)) {
    if (!binding.node) push(`roles.${role}.node`, 'node 不能为空');
    if (!binding.field) push(`roles.${role}.field`, 'field 不能为空');
    if (binding.map !== undefined && (typeof binding.map !== 'object' || binding.map === null)) {
      push(`roles.${role}.map`, 'map 必须是对象');
    }
  }

  // F8 一致性锚点：画幅 map 的键集必须与 constants 完全一致
  const aspectMap = s.roles.aspect_ratio?.map;
  if (aspectMap) {
    const keys = Object.keys(aspectMap).sort();
    const expected = [...VIDEO_ASPECT_RATIOS].sort();
    if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
      push(
        'roles.aspect_ratio.map',
        `画幅 map 的键集必须与 VIDEO_ASPECT_RATIOS 完全一致（期望 ${expected.join(',')}，实际 ${keys.join(',')}）`,
      );
    }
  }

  // 必需角色
  for (const role of REQUIRED_ROLES_BY_KIND[s.kind] ?? []) {
    if (!s.roles[role]) push(`roles.${role}`, `${s.kind} 规格必须声明角色 ${role}`);
  }

  if (s.media !== null) {
    const media = s.media;
    if (!media.targetNode) push('media.targetNode', 'media.targetNode 不能为空');
    const hasFormA = Boolean(media.mediaField || media.typeField);
    const hasFormB = Boolean(media.fieldsByType);
    if (hasFormA === hasFormB) {
      push('media', 'media 必须且只能声明一种绑定形态：mediaField/typeField 或 fieldsByType');
    }
    if (hasFormA && (!media.mediaField || !media.typeField)) {
      push('media', '形态① 需要同时给出 mediaField 与 typeField');
    }
    if (hasFormB) {
      for (const [type, prefix] of Object.entries(media.fieldsByType ?? {})) {
        if (!prefix) push(`media.fieldsByType.${type}`, '字段前缀不能为空');
      }
    }
    for (const [type, loader] of Object.entries(media.loaders ?? {})) {
      if (!loader || !loader.class_type) {
        push(`media.loaders.${type}.class_type`, 'loader 模板必须有 class_type');
      }
    }
    if (media.maxImages !== undefined && media.maxImages > REFERENCE_LIMITS.images) {
      push('media.maxImages', `参考图上限不得超过 REFERENCE_LIMITS.images（${REFERENCE_LIMITS.images}）`);
    }
    if (media.maxAudioVideo !== undefined && media.maxAudioVideo > REFERENCE_LIMITS.audios) {
      push('media.maxAudioVideo', `音视频上限不得超过 REFERENCE_LIMITS.audios（${REFERENCE_LIMITS.audios}）`);
    }
    for (const nodeId of media.reusePool ?? []) {
      if (!nodeId) push('media.reusePool', 'reusePool 里不能有空的节点 id');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 校验不过就抛错（带全部错误，不只报第一条）。
 * @param {unknown} spec
 * @returns {Record<string, unknown>} 规范化后的规格
 */
export function assertSpec(spec) {
  const { ok, errors } = validateSpec(spec);
  if (!ok) {
    const detail = errors.map((e) => `${e.path || '(root)'}: ${e.message}`).join('；');
    throw new Error(`工作流规格不合法：${detail}`);
  }
  return normalizeSpec(spec);
}

/**
 * **产物文件条目的规范形状**——三个通道（ComfyUI / RunningHub / DSH）**必须一致**，
 * 否则下游（交付打包、落盘）要写三套解析。
 *
 * 差异只在「东西从哪来」：
 *   本地 ComfyUI → `filename` + `subfolder`（要再用 `/view` 下载）
 *   云端 → `url`（**临时**链接，必须落盘 → `ephemeral: true`）
 */
export const OUTPUT_FILE_KEYS = Object.freeze(['filename', 'url', 'subfolder', 'type', 'ephemeral']);

/**
 * 造一个规范形状的产物文件条目。
 * @param {Partial<Record<string, unknown>>} partial
 */
export function outputFile(partial = {}) {
  return {
    filename: partial.filename ?? null,
    url: partial.url ?? null,
    subfolder: partial.subfolder ?? '',
    type: partial.type ?? 'output',
    ephemeral: partial.ephemeral === true,
  };
}

/**
 * 解析结果里可能出现的**语义角色名**。
 *
 * F5 规定 `roles` 是「语义角色 → `{node, field, map?}`」的**记录**；
 * 而确定性解析器（T5 `src/core/analyzeWorkflow.js`）返回的是
 * `roles` **数组** + 一组顶层角色字段（`positive_prompt` / `width` / …）。
 * 两者不冲突，但需要一个桥：`normalizeAnalyzedSpec()`。
 */
export const ANALYZED_ROLE_KEYS = Object.freeze([
  'positive_prompt',
  'negative_prompt',
  'width',
  'height',
  'seed',
  'filename_prefix',
  'seconds',
  'resolution',
  'aspect_ratio',
  'image',
  'text',
  'voice_description',
  'caption',
  'lyrics',
  'max_duration',
]);

/**
 * 把确定性解析器的输出**归一化成 F5 的 `roles` 记录**。
 *
 * 这是跨任务接缝上的**适配**，不是第二套规格形状：
 * 归一化之后仍然是一个 F5 规格，`media` 仍恒为 `null`（媒体绑定由上层补），
 * 仍然**没有** `prune` 字段（剪枝由 runner 的可达性遍历自动做）。
 *
 * @param {unknown} analyzed  `analyzeWorkflow()` 的返回
 * @returns {Record<string, unknown>} F5 规格
 */
export function normalizeAnalyzedSpec(analyzed) {
  const spec = { ...(analyzed ?? {}) };
  const roles = {};

  // ① 顶层角色字段：`{ node, field, value }` → `{ node, field }`
  for (const key of ANALYZED_ROLE_KEYS) {
    const entry = spec[key];
    if (entry && typeof entry === 'object' && entry.node && entry.field) {
      roles[key] = { node: String(entry.node), field: String(entry.field) };
    }
  }

  // ② `roles` 数组里带 `role` 名的条目（没有角色名的条目无法映射到值，跳过）
  if (Array.isArray(spec.roles)) {
    for (const entry of spec.roles) {
      if (!entry || !entry.role || !entry.node || !entry.field) continue;
      roles[String(entry.role)] = {
        node: String(entry.node),
        field: String(entry.field),
        ...(entry.map ? { map: entry.map } : {}),
      };
    }
  } else if (spec.roles && typeof spec.roles === 'object') {
    Object.assign(roles, spec.roles);
  }

  spec.roles = roles;
  // media 恒为 null、prune 不推导——与解析器的边界一致
  spec.media = null;
  delete spec.prune;
  return normalizeSpec(spec);
}

/**
 * 解析一个规格集文件（容器形状）。
 * @param {unknown} json
 * @returns {{ kind: string, specs: Record<string, Record<string, unknown>> }}
 */
export function parseSpecSet(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('规格集必须是对象');
  }
  const kind = String(json.kind ?? '');
  const raw = json.specs ?? {};
  const specs = {};
  for (const [variant, spec] of Object.entries(raw)) {
    if (!SPEC_VARIANTS.includes(variant)) {
      throw new Error(`规格集出现未知档位 ${variant}（允许 ${SPEC_VARIANTS.join(' / ')}）`);
    }
    const normalized = normalizeSpec(spec);
    if (normalized.kind && normalized.kind !== kind) {
      throw new Error(`规格集 ${kind} 里的 ${variant} 声明了不同的 kind（${normalized.kind}）`);
    }
    specs[variant] = normalized;
  }
  return { kind, specs };
}

/**
 * 从磁盘读一个规格集文件。
 * @param {string} file
 */
export function loadSpecSetFile(file) {
  const raw = readFileSync(file, 'utf8');
  return parseSpecSet(JSON.parse(raw));
}

/**
 * 读整个规格集目录（`workflows/specs/`）。
 * @param {string} dir
 * @returns {Record<string, { kind: string, specs: Record<string, Record<string, unknown>> }>}
 */
export function loadSpecSetDir(dir) {
  const out = {};
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;
    const set = loadSpecSetFile(path.join(dir, file));
    out[set.kind] = set;
  }
  return out;
}

/**
 * 取用顺序（设计 §2.4）：
 *   provider = `runninghub` → 直接用云端列（**忽略硬件预设**）；
 *   否则 → 用户配置 `workflows[kind]` → 本地 nvidia 列 → 本地 amd 列。
 *
 * 硬件预设的偏好插在用户配置之后、nvidia/amd 兜底之前：AMD 机拿 nvidia 的工作流会 OOM。
 *
 * @param {object} options
 * @param {string} options.kind
 * @param {string} [options.provider]  runninghub | online-api | dsh | native
 * @param {string} [options.hw]         nvidia | amd
 * @param {Record<string, string>} [options.userWorkflows]  用户配置的 kind → sourceFile
 * @param {Record<string, { specs: Record<string, unknown> }>} [options.specSets]
 * @param {string} [options.userSpec]   用户自定义的整份规格（优先于 sourceFile 覆盖）
 * @returns {{ spec: Record<string, unknown>|null, source: 'user-spec'|'user-workflow'|'variant'|null, variant: string|null, errors: string[] }}
 */
export function resolveSpec({
  kind,
  provider,
  hw,
  userWorkflows,
  specSets,
  userSpec,
} = {}) {
  const errors = [];
  if (!kind || !GENERATION_KINDS.includes(kind)) {
    return { spec: null, source: null, variant: null, errors: [`未知 kind：${kind}`] };
  }
  if (provider && !['native', ...CLOUD_PROVIDERS].includes(provider)) {
    errors.push(`未知 provider：${provider}`);
  }
  if (hw && !HW_MODES.includes(hw)) {
    errors.push(`未知硬件预设：${hw}`);
  }

  if (provider === 'runninghub') {
    const variant = 'cloud-runninghub';
    const spec = specSets?.[kind]?.specs?.[variant] ?? null;
    if (!spec) errors.push(`规格集缺 ${kind} 的 ${variant} 档`);
    return { spec: spec ? assertSpec(spec) : null, source: spec ? 'variant' : null, variant, errors };
  }

  if (userSpec) {
    return { spec: assertSpec(userSpec), source: 'user-spec', variant: null, errors };
  }

  const override = userWorkflows?.[kind];
  if (override) {
    const variant = hw === 'amd' ? 'local-amd' : 'local-nvidia';
    const base = specSets?.[kind]?.specs?.[variant] ?? specSets?.[kind]?.specs?.['local-nvidia'] ?? null;
    if (!base) {
      errors.push(`规格集缺 ${kind} 的本地档，且没有可用基线`);
      return { spec: null, source: null, variant: null, errors };
    }
    return {
      spec: assertSpec({ ...base, sourceFile: String(override) }),
      source: 'user-workflow',
      variant,
      errors,
    };
  }

  const candidates = hw === 'amd' ? ['local-amd', 'local-nvidia'] : ['local-nvidia', 'local-amd'];
  for (const variant of candidates) {
    const spec = specSets?.[kind]?.specs?.[variant];
    if (spec) return { spec: assertSpec(spec), source: 'variant', variant, errors };
  }
  errors.push(`规格集缺 ${kind} 的任何本地档`);
  return { spec: null, source: null, variant: null, errors };
}

/**
 * RunningHub 的档位（standard / plus）——两档都跑同一批 kind，只是排队与配额不同。
 * @param {string} tier
 */
export function assertRunningHubTier(tier) {
  if (!RUNNINGHUB_TIERS.includes(tier)) {
    throw new Error(`未知 RunningHub 档位 ${tier}（允许 ${RUNNINGHUB_TIERS.join(' / ')}）`);
  }
  return tier;
}

/**
 * loader 模板里承载文件路径的输入字段名。
 * @param {{ class_type?: string, fileField?: string }} loader
 */
export function loaderFileField(loader) {
  if (loader?.fileField) return String(loader.fileField);
  const type = loaderMediaType(loader?.class_type);
  if (!type) return 'file';
  return LOADER_FILE_FIELDS[String(loader.class_type).toLowerCase()] ?? type;
}
