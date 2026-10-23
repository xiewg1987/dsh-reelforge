/**
 * 写入门禁：内容字段 vs 产物字段（§6.5）——**第一优先级的工程决策**。
 *
 * 为什么比「校验」更重要：外部写入若能改 `status`，就能**伪造「已生成」状态**，
 * 绕过渲染直接出成片；若能改 `seed`，则是「接口答应了、实际静默无效」——
 * **接口答应了却没做到，比直接报错更坏**。
 *
 * §6.5 的七条实现要点逐条对应：
 *   1. 工具参数封闭      → 见 `src/host/tools.js`（schema 只列内容字段）
 *   2. 白名单外一律报错  → `validateWrite`（不静默丢弃）
 *   3. 数组元素必须是字符串 → `checkStringArray`（挡住 `[object Object]` 静默丢弃）
 *   4. 校验在写入口      → 本模块就是写入口的守门人
 *   5. 跨字段校验按落库值算 → 用**默认值补齐后**的合并值
 *   6. 只改依赖字段时才重算 → `skipDialogueRate`
 *   7. 数字字段必须显式判名 → 类型表按字段名逐个声明，不走通用兜底分支
 */
import {
  CHAPTER_CONTENT_FIELDS,
  CHAPTER_PRODUCT_FIELDS,
  PROJECT_CONTENT_FIELDS,
  PROJECT_PRODUCT_FIELDS,
  SHOT_CONTENT_FIELDS,
  SHOT_PRODUCT_FIELDS,
  SHOT_DURATION_DEFAULT,
} from '../core/constants.js';
import { validateShot } from '../core/storyboardSchema.js';

/** 各层的白名单。 */
const LAYERS = Object.freeze({
  shot: { content: SHOT_CONTENT_FIELDS, product: SHOT_PRODUCT_FIELDS },
  chapter: { content: CHAPTER_CONTENT_FIELDS, product: CHAPTER_PRODUCT_FIELDS },
  project: { content: PROJECT_CONTENT_FIELDS, product: PROJECT_PRODUCT_FIELDS },
});

/**
 * 分镜层每个内容字段的类型。**按字段名逐个声明**——不写通用兜底分支，
 * 否则任何白名单里的数字字段走到兜底都会被按 `duration` 校验（要点 7）。
 */
const SHOT_FIELD_TYPES = Object.freeze({
  chapter: 'string',
  scene_name: 'string',
  shot_size: 'string',
  camera: 'string',
  visual: 'string',
  dialogue: 'dialogue',
  narration: 'string',
  sub_shots: 'stringArray',
  resolution: 'string',
  aspect_ratio: 'string',
  video_prompt: 'string',
  character_ids: 'stringArray',
  scene_ids: 'stringArray',
  prop_ids: 'stringArray',
  costume_ids: 'stringArray',
  age_ids: 'stringArray',
  audio_ids: 'stringArray',
  references: 'array',
  idx: 'integer',
  duration: 'number',
});

const CHAPTER_FIELD_TYPES = Object.freeze({
  title: 'string',
  novel: 'string',
  script: 'string',
});

const PROJECT_FIELD_TYPES = Object.freeze({
  name: 'string',
  novel: 'string',
  idea: 'string',
  style: 'string',
  video_resolution: 'string',
  video_aspect_ratio: 'string',
  video_width: 'integer',
  video_height: 'integer',
  target_duration: 'numberOrNull',
  enable_bgm: 'boolean',
  enable_subtitles: 'boolean',
});

const FIELD_TYPES = Object.freeze({
  shot: SHOT_FIELD_TYPES,
  chapter: CHAPTER_FIELD_TYPES,
  project: PROJECT_FIELD_TYPES,
});

/**
 * 取某层的内容字段白名单（工具 schema 从这里取，避免两处各写一份）。
 * @param {'shot' | 'chapter' | 'project'} layer 层。
 * @returns {readonly string[]} 内容字段名。
 */
export function contentFieldsFor(layer) {
  const table = LAYERS[layer];
  if (!table) throw new Error(`未知层级：${layer}`);
  return table.content;
}

/**
 * 由字段类型表生成该层的 JSON Schema（工具参数用）。
 *
 * 工具参数**只列内容字段**（§6.5 要点 1）——产物字段根本不出现，
 * 模型传了也进不来。`additionalProperties: false` 让 schema 本身也拒绝未知键。
 *
 * @param {'shot' | 'chapter' | 'project'} layer 层。
 * @returns {object} JSON Schema 片段。
 */
export function jsonSchemaForLayer(layer) {
  const types = FIELD_TYPES[layer];
  if (!types) throw new Error(`未知层级：${layer}`);
  const properties = {};
  for (const [key, type] of Object.entries(types)) {
    properties[key] = schemaForType(type);
  }
  return { type: 'object', properties, additionalProperties: false };
}

/**
 * 单个字段的 JSON Schema。
 *
 * ⚠️ 只能写宿主 JSON Schema 子集允许的形状：
 * `type` 必须是 object / array / string / number / integer / boolean / null 之一，
 * **不允许 type 数组**（`['number','null']` 会被宿主拒绝）。
 * 可空数字用 `oneOf`（宿主的作者层方言同样没有「nullable」，可空就是 oneOf）。
 *
 * @param {string} type 字段类型。
 * @returns {object} JSON Schema 片段。
 */
function schemaForType(type) {
  switch (type) {
    case 'string': return { type: 'string' };
    case 'number': return { type: 'number' };
    case 'integer': return { type: 'integer' };
    case 'boolean': return { type: 'boolean' };
    case 'numberOrNull': return { oneOf: [{ type: 'number' }, { type: 'null' }] };
    case 'stringArray': return { type: 'array', items: { type: 'string' } };
    case 'array': return { type: 'array' };
    case 'dialogue': return {}; // 台词可以是字符串或行数组
    default: return {};
  }
}

/**
 * 写入门禁。
 *
 * @param {'shot' | 'chapter' | 'project'} layer 写入的层。
 * @param {unknown} payload 待写入的字段对象。
 * @param {{ existing?: object, chapterShots?: readonly object[] }} [context]
 *   `existing` = 库里已有的对象（用于增量写入）；`chapterShots` = 同章已有分镜（idx 唯一性）。
 * @returns {{ ok: boolean, errors: string[], value: object }} 校验结果；
 *   `value` 是**合并后真正要落库的值**（默认值已补齐），`errors` 为空即通过。
 */
export function validateWrite(layer, payload, context = {}) {
  const errors = [];
  const table = LAYERS[layer];
  if (!table) {
    return { ok: false, errors: [`未知层级：${String(layer)}`], value: {} };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['写入内容必须是一个对象'], value: {} };
  }

  const types = FIELD_TYPES[layer];
  const existing = context.existing && typeof context.existing === 'object' ? context.existing : {};

  // ── 要点 2：白名单外一律报错，不静默丢弃 ──
  for (const key of Object.keys(payload)) {
    if (table.content.includes(key)) continue;
    if (table.product.includes(key)) {
      errors.push(`「${key}」是产物字段，只能由渲染阶段写入，外部写入被拒`);
      continue;
    }
    errors.push(`未知字段「${key}」；${layer} 层只接受：${table.content.join('、')}`);
  }

  // ── 类型检查（要点 3、7）──
  const value = { ...existing };
  for (const [key, raw] of Object.entries(payload)) {
    if (!table.content.includes(key)) continue;
    const type = types[key];
    if (type === undefined) {
      errors.push(`字段「${key}」没有声明类型`);
      continue;
    }
    const checked = checkValue(type, key, raw, errors);
    if (checked !== undefined) value[key] = checked;
  }

  // ── 要点 5：跨字段校验按「真正落库的值」算（默认值先补齐）──
  if (layer === 'shot') {
    // 缺省 duration 在**落库值**里补齐：省略 duration 的那一镜，库里存的就是 5 秒
    if (value.duration === undefined) value.duration = SHOT_DURATION_DEFAULT;

    // 更新已有分镜时，它自己不能算「同章内重复的 idx」
    const chapterShots = (context.chapterShots ?? []).filter((shot) => shot !== context.existing);
    const rateRelevant = context.existing === undefined
      || 'dialogue' in payload
      || 'duration' in payload;
    const shotResult = validateShot(value, { chapterShots, skipDialogueRate: !rateRelevant });
    for (const error of shotResult.errors) errors.push(error);
  }

  return { ok: errors.length === 0, errors, value };
}

/**
 * 按类型检查单个值。
 *
 * @param {string} type 类型名。
 * @param {string} key 字段名（错误消息用）。
 * @param {unknown} raw 原始值。
 * @param {string[]} errors 错误收集器。
 * @returns {unknown} 通过时返回规范化后的值；不通过返回 `undefined`。
 */
function checkValue(type, key, raw, errors) {
  switch (type) {
    case 'string':
      if (typeof raw !== 'string') {
        errors.push(`「${key}」必须是字符串，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'number':
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        errors.push(`「${key}」必须是有限数字，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'integer':
      if (!Number.isInteger(raw)) {
        errors.push(`「${key}」必须是整数，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'boolean':
      if (typeof raw !== 'boolean') {
        errors.push(`「${key}」必须是布尔值，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'numberOrNull':
      if (raw === null) return null;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        errors.push(`「${key}」必须是数字或 null，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'dialogue':
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) return raw;
      errors.push(`「${key}」必须是字符串或数组，收到 ${describe(raw)}`);
      return undefined;

    case 'array':
      if (!Array.isArray(raw)) {
        errors.push(`「${key}」必须是数组，收到 ${describe(raw)}`);
        return undefined;
      }
      return raw;

    case 'stringArray':
      return checkStringArray(key, raw, errors);

    default:
      errors.push(`字段「${key}」的类型「${type}」未实现`);
      return undefined;
  }
}

/**
 * 字符串数组检查（要点 3）。
 *
 * 元素必须是字符串。`[{ id: 'x' }]` 若被 `String()` 变成 `"[object Object]"`，
 * 下游会当「无效 id」**静默丢弃**还回 200——所以这里直接拒绝。
 *
 * @param {string} key 字段名。
 * @param {unknown} raw 原始值。
 * @param {string[]} errors 错误收集器。
 * @returns {string[] | undefined} 通过时返回原数组。
 */
function checkStringArray(key, raw, errors) {
  if (!Array.isArray(raw)) {
    errors.push(`「${key}」必须是数组，收到 ${describe(raw)}`);
    return undefined;
  }
  for (const element of raw) {
    if (typeof element === 'string') continue;
    if (element && typeof element === 'object') {
      errors.push(`「${key}」的元素必须是字符串；收到对象会被转成 "[object Object]" 并被下游静默丢弃`);
      return undefined;
    }
    errors.push(`「${key}」的元素必须是字符串，收到 ${describe(element)}`);
    return undefined;
  }
  return raw;
}

/**
 * 描述一个值的类型，用于错误消息。
 * @param {unknown} value 值。
 * @returns {string} 描述。
 */
function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  if (typeof value === 'object') return '对象';
  return `${typeof value}(${String(value)})`;
}
