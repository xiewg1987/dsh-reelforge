/**
 * 规格执行器 —— **克隆模板 → 写 roles → 绑 media → prune → 提交**（设计 §8.1）。
 *
 * 三件最容易写错的事，这里都按死规矩实现了：
 *
 * 1. **prune 是「从 outputs 反向可达性」**，不是点名删除。
 *    点名删（`spec.prune`）只是第一步；随后从产物节点**反向**遍历输入连线，
 *    保留可达节点、删掉其余，再把指向已删节点的**悬空连线**清掉。
 *    这样「prompt 被直写后 LLM 扩写链变成孤立节点」会被自动清掉，
 *    不需要手写 prune 清单（设计 §8.1 / 风险表 #8）。
 *
 * 2. **bindMedia 两种形态都支持**：
 *    ① `mediaField`/`typeField` → `media_1` + `media_type_1`（编号从 1 起，图文共用一套编号）
 *    ② `fieldsByType` → 按类型各自编号，**从 0 起**（H3 的 `ref_images.ref_image_0`）
 *    优先复用 `reusePool` 里的模板 loader；不够就新建（节点 id `String(1000 + i)`）；
 *    最后**删除未被引用的模板占位 loader**（设计 §8.1 / 风险表 #9）。
 *
 * 3. **幂等指纹不由本文件负责**（在 `src/core/stageOrchestrator.js`），
 *    但本文件产出的 `meta` 是指纹的输入之一。
 *
 * 本文件**不联网**：所有对外动作都通过注入的 `submit` 完成，因此可用假客户端单测。
 */

import {
  REQUIRED_ROLES_BY_KIND,
  assertSpec,
  loaderFileField,
  loaderMediaType,
  normalizeSpec,
} from './spec.js';

/** 新建 loader 节点的 id 起点（设计 §8.1：`String(1000 + i)`）。 */
export const NEW_NODE_ID_BASE = 1000;

/**
 * ComfyUI API 格式的连线：`[nodeId, outputIndex]`。
 * @param {unknown} value
 */
export function isLink(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'number'
  );
}

/**
 * 取模板的节点表。接受两种形状：
 *   - ComfyUI API 格式：`{ "3": { class_type, inputs }, ... }`
 *   - 容器：`{ nodes: { "3": {...} } }`
 * @param {unknown} template
 */
export function toNodeMap(template) {
  if (!template || typeof template !== 'object') {
    throw new Error('工作流模板必须是对象');
  }
  const map = template.nodes && typeof template.nodes === 'object' ? template.nodes : template;
  const out = {};
  for (const [id, node] of Object.entries(map)) {
    if (!node || typeof node !== 'object') continue;
    out[String(id)] = {
      class_type: String(node.class_type ?? ''),
      inputs: { ...(node.inputs ?? {}) },
      ...(node._meta ? { _meta: node._meta } : {}),
    };
  }
  return out;
}

/**
 * 深拷贝模板（不共享引用）。
 * @param {unknown} template
 */
export function cloneTemplate(template) {
  return toNodeMap(template);
}

/**
 * 按 roles 写参数（`map` 做枚举翻译）。
 *
 * 写不进去的**不静默丢**：全部记进 `missing`（区分「没值」「节点不存在」「枚举没映射」）。
 *
 * @param {Record<string, any>} nodes
 * @param {object} spec
 * @param {Record<string, unknown>} values  角色名 → 值
 * @returns {{ nodes: Record<string, any>, applied: object[], missing: object[] }}
 */
export function applyRoles(nodes, spec, values) {
  const s = normalizeSpec(spec);
  const applied = [];
  const missing = [];

  for (const [role, binding] of Object.entries(s.roles)) {
    const raw = values?.[role];
    if (raw === undefined || raw === null) {
      missing.push({ role, reason: 'missing-value' });
      continue;
    }
    const node = nodes[binding.node];
    if (!node) {
      missing.push({ role, reason: 'node-not-found', node: binding.node });
      continue;
    }
    let value = raw;
    if (binding.map && typeof binding.map === 'object') {
      if (Object.prototype.hasOwnProperty.call(binding.map, raw)) {
        value = binding.map[raw];
      } else {
        missing.push({ role, reason: 'unmapped-value', value: raw });
        continue;
      }
    }
    node.inputs = node.inputs ?? {};
    const fieldAbsent = !Object.prototype.hasOwnProperty.call(node.inputs, binding.field);
    node.inputs[binding.field] = value;
    applied.push({ role, node: binding.node, field: binding.field, value, fieldAbsent });
  }

  return { nodes, applied, missing };
}

/**
 * 把媒体项摊平成统一形状：`{ type, path, label, assetId }`。
 * 吃 F6 `resolveRefs()` 的返回（`images[]` / `audios[]`），也吃扁平数组。
 *
 * @param {unknown} media
 */
export function normalizeMediaItems(media) {
  if (!media) return [];
  if (Array.isArray(media)) {
    return media
      .filter((m) => m && (m.path || m.url))
      .map((m) => ({
        type: String(m.type ?? 'image'),
        path: m.path ?? m.url,
        label: m.label ?? '',
        assetId: m.assetId ?? null,
      }));
  }
  const items = [];
  for (const [type, key] of [['image', 'images'], ['audio', 'audios'], ['video', 'videos']]) {
    for (const m of media[key] ?? []) {
      if (!m || !(m.path || m.url)) continue;
      items.push({
        type: String(m.type ?? type),
        path: m.path ?? m.url,
        label: m.label ?? '',
        assetId: m.assetId ?? null,
      });
    }
  }
  return items;
}

/**
 * 写嵌套输入：`'ref_images.ref_image_0'` → `inputs.ref_images['ref_image_0']`。
 * @param {Record<string, unknown>} inputs
 * @param {string} dotted
 * @param {unknown} value
 */
export function setNestedInput(inputs, dotted, value) {
  const segments = String(dotted).split('.');
  if (segments.length === 1) {
    inputs[segments[0]] = value;
    return;
  }
  let cursor = inputs;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const next = cursor[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
}

/**
 * 绑定参考素材（两种形态）。
 *
 * @param {Record<string, any>} nodes
 * @param {object} spec
 * @param {unknown} media  F6 `resolveRefs()` 的返回，或等价的 `{images, audios}` 结构
 * @returns {{ nodes: Record<string, any>, bound: object[], created: object[], removedLoaders: string[], skipped: string|null }}
 */
export function bindMedia(nodes, spec, media) {
  const s = normalizeSpec(spec);
  const config = s.media;
  if (!config) {
    return { nodes, bound: [], created: [], removedLoaders: [], skipped: 'no-media-config' };
  }

  const target = nodes[String(config.targetNode)];
  if (!target) {
    throw new Error(
      `参考素材绑定失败：规格声明的 targetNode=${config.targetNode} 在模板里不存在`,
    );
  }

  const items = normalizeMediaItems(media);

  // reusePool：模板自带的占位 loader，按类型分池
  const pool = new Map();
  const poolOrder = [];
  for (const nodeId of config.reusePool ?? []) {
    const id = String(nodeId);
    const node = nodes[id];
    if (!node) continue;
    const type = loaderMediaType(node.class_type) ?? 'image';
    if (!pool.has(type)) pool.set(type, []);
    pool.get(type).push(id);
    poolOrder.push(id);
  }

  if (items.length === 0) {
    // 没有素材可绑 → 模板里的占位 loader 全是空节点，删掉，不带着空节点提交
    const removedLoaders = [];
    for (const id of poolOrder) {
      if (nodes[id]) {
        delete nodes[id];
        removedLoaders.push(id);
      }
    }
    return { nodes, bound: [], created: [], removedLoaders, skipped: 'no-media-items' };
  }

  // 上限检查：超限**报错**，不静默截断（设计 §7.4）
  const maxImages = config.maxImages ?? 9;
  const maxAudioVideo = config.maxAudioVideo ?? 3;
  const imageCount = items.filter((i) => i.type === 'image').length;
  const avCount = items.filter((i) => i.type !== 'image').length;
  if (imageCount > maxImages) {
    throw new Error(`参考图超出上限：${imageCount} > ${maxImages}`);
  }
  if (avCount > maxAudioVideo) {
    throw new Error(`参考音视频超出上限：${avCount} > ${maxAudioVideo}`);
  }

  const created = [];
  const bound = [];
  let createdIndex = 0;

  const takeLoader = (type) => {
    const available = pool.get(type);
    if (available && available.length > 0) return { id: available.shift(), reused: true };
    const template = config.loaders?.[type];
    if (!template) {
      throw new Error(
        `无法为类型 ${type} 绑定参考素材：规格既没有可复用的 ${type} loader，也没有提供 loader 模板`,
      );
    }
    const id = String(NEW_NODE_ID_BASE + createdIndex);
    createdIndex += 1;
    nodes[id] = {
      class_type: String(template.class_type),
      inputs: { ...(template.inputs ?? {}) },
      ...(template._meta ? { _meta: template._meta } : {}),
    };
    created.push({ id, type, classType: String(template.class_type) });
    return { id, reused: false };
  };

  const fillLoader = (loaderId, type, item) => {
    const node = nodes[loaderId];
    if (!node) return;
    const field = loaderFileField({
      class_type: node.class_type,
      fileField: config.loaders?.[type]?.fileField,
    });
    node.inputs = node.inputs ?? {};
    node.inputs[field] = item.path;
  };

  target.inputs = target.inputs ?? {};

  if (config.fieldsByType) {
    // 形态②：按类型各自编号，从 0 起
    const counters = new Map();
    for (const item of items) {
      const prefix = config.fieldsByType[item.type];
      if (!prefix) {
        throw new Error(`规格未声明类型 ${item.type} 的绑定字段（fieldsByType）`);
      }
      const index = counters.get(item.type) ?? 0;
      counters.set(item.type, index + 1);
      const loader = takeLoader(item.type);
      fillLoader(loader.id, item.type, item);
      setNestedInput(target.inputs, `${prefix}${index}`, [loader.id, 0]);
      bound.push({
        type: item.type,
        field: `${prefix}${index}`,
        loaderId: loader.id,
        reused: loader.reused,
        label: item.label,
        assetId: item.assetId,
      });
    }
  } else {
    // 形态①：media_1 + media_type_1，编号从 1 起，图文共用一套编号
    let index = 1;
    for (const item of items) {
      const loader = takeLoader(item.type);
      fillLoader(loader.id, item.type, item);
      target.inputs[`${config.mediaField}${index}`] = [loader.id, 0];
      target.inputs[`${config.typeField}${index}`] = item.type;
      bound.push({
        type: item.type,
        field: `${config.mediaField}${index}`,
        typeField: `${config.typeField}${index}`,
        loaderId: loader.id,
        reused: loader.reused,
        label: item.label,
        assetId: item.assetId,
      });
      index += 1;
    }
  }

  // 删掉没被引用到的模板占位 loader
  const used = new Set(bound.map((b) => b.loaderId));
  const removedLoaders = [];
  for (const id of poolOrder) {
    if (used.has(id)) continue;
    if (nodes[id]) {
      delete nodes[id];
      removedLoaders.push(id);
    }
  }

  return { nodes, bound, created, removedLoaders, skipped: null };
}

/**
 * 从产物节点反向做可达性遍历，保留可达节点。
 * @param {Record<string, any>} nodes
 * @param {string[]} roots
 */
export function reachableFrom(nodes, roots) {
  const keep = new Set();
  const stack = [...roots];
  while (stack.length > 0) {
    const id = stack.pop();
    if (keep.has(id)) continue;
    const node = nodes[id];
    if (!node) continue;
    keep.add(id);
    const inputs = node.inputs ?? {};
    for (const value of Object.values(inputs)) {
      if (isLink(value)) stack.push(value[0]);
    }
  }
  return keep;
}

/**
 * 裁剪工作流。
 *
 * ① 先按 `spec.prune` 点名删；
 * ② 再从 `outputs` 根节点反向做可达性遍历，保留可达节点、其余删除；
 * ③ 最后清掉指向已删节点的悬空连线。
 *
 * @param {Record<string, any>} nodes
 * @param {object} spec
 * @returns {{ nodes: Record<string, any>, removed: string[], roots: string[], cleanedLinks: object[], warning: string|null }}
 */
export function pruneWorkflow(nodes, spec) {
  const s = normalizeSpec(spec);
  const removed = [];
  const cleanedLinks = [];

  // ① 点名删
  for (const nodeId of s.prune) {
    const id = String(nodeId);
    if (nodes[id]) {
      delete nodes[id];
      removed.push(id);
    }
  }

  // 找产物根节点
  const outputClasses = new Set(s.outputs);
  const roots = Object.entries(nodes)
    .filter(([, node]) => outputClasses.has(String(node.class_type)))
    .map(([id]) => id);

  if (s.outputs.length === 0) {
    return { nodes, removed, roots, cleanedLinks, warning: '规格未声明 outputs，未做可达性裁剪' };
  }
  if (roots.length === 0) {
    const hint = removed.length > 0 ? '（点名删除可能把产物节点删掉了）' : '';
    throw new Error(
      `可达性裁剪失败：规格声明的产物 class_type（${s.outputs.join(', ')}）在模板里找不到节点${hint}`,
    );
  }

  // ② 反向可达性
  const keep = reachableFrom(nodes, roots);
  for (const id of Object.keys(nodes)) {
    if (!keep.has(id)) {
      delete nodes[id];
      removed.push(id);
    }
  }

  // ③ 清悬空连线
  for (const node of Object.values(nodes)) {
    const inputs = node.inputs ?? {};
    for (const [field, value] of Object.entries(inputs)) {
      if (!isLink(value)) continue;
      if (nodes[value[0]]) continue;
      delete inputs[field];
      cleanedLinks.push({ field, missingNode: value[0] });
    }
  }

  return { nodes, removed, roots, cleanedLinks, warning: null };
}

/**
 * 检测工作流里是否**带了 CK（comfy-kitchen）注意力**。
 *
 * 两个来源：
 *   - 节点层面：class_type 命中 comfy-kitchen / CK attention 特征；
 *   - 服务层面：启动参数里有 `--use-ck-attention`（ComfyUI 侧报上来时）。
 *
 * @param {Record<string, any>} nodes
 * @param {{ argv?: string[] }} [extra]
 */
export function detectCkAttention(nodes, extra) {
  const hits = [];
  for (const [id, node] of Object.entries(nodes ?? {})) {
    const classType = String(node?.class_type ?? '');
    if (/ck[-_ ]?attention/i.test(classType) || /comfy[-_ ]?kitchen/i.test(classType)) {
      hits.push({ id, classType, source: 'node' });
    }
  }
  const argv = Array.isArray(extra?.argv) ? extra.argv : [];
  for (const arg of argv) {
    if (String(arg).includes('--use-ck-attention')) {
      hits.push({ id: '(server)', classType: String(arg), source: 'server' });
    }
  }
  return { present: hits.length > 0, nodes: hits };
}

/**
 * CK 用法的阶段纪律（设计 §8.6 / 验收 A18）：
 *   - `image` 阶段**必须不带** CK 注意力 → 带了**直接抛错**并给可执行提示；
 *   - `video` 阶段**建议带**（实测快 2.7×）→ 没带**只 warn 不拦**。
 *
 * @param {string} stage
 * @param {Record<string, any>} nodes
 * @param {{ argv?: string[] }} [extra]
 * @returns {{ errors: string[], warnings: string[], detected: object }}
 */
export function assertCkAttentionPolicy(stage, nodes, extra) {
  const detected = detectCkAttention(nodes, extra);
  const errors = [];
  const warnings = [];
  if (stage === 'image' && detected.present) {
    errors.push(
      'image 阶段禁止使用 CK 注意力（comfy-kitchen）：请从 ComfyUI 启动脚本移除 --use-ck-attention 后重启',
    );
  }
  if (stage === 'video' && !detected.present) {
    warnings.push(
      'video 阶段建议启用 CK 注意力（实测快 2.7×）：请在 ComfyUI 启动脚本加 --use-ck-attention',
    );
  }
  return { errors, warnings, detected };
}

/**
 * 把 F6 装配结果里的**第一张参考图**填进 `image` 角色（`i2i` 用）。
 *
 * 这里**不重排、不筛选、不改标签**——装配顺序由 T2 的 `resolveRefs()` 决定，
 * 本函数只是把「装配结果里的第一张图」接到规格声明的 `image` 角色上。
 *
 * @param {Record<string, unknown>} values 角色值（原地补 `image`）
 * @param {unknown} refs  F6 `resolveRefs()` 的返回
 */
export function bindImageRole(values, refs) {
  const first = Array.isArray(refs?.images) ? refs.images[0] : null;
  if (!first) return values;
  if (values?.image === undefined || values?.image === null) {
    values.image = first.path ?? first.url ?? null;
  }
  return values;
}

/**
 * 组装最终提交载荷。
 *
 * @param {object} options
 * @param {object} options.spec
 * @param {unknown} options.template  ComfyUI API 格式的工作流 JSON
 * @param {Record<string, unknown>} options.values  角色名 → 值
 * @param {unknown} [options.media]  F6 `resolveRefs()` 的返回
 * @returns {{ prompt: Record<string, any>, outputs: string[], meta: object }}
 */
export function buildPromptPayload({ spec, template, values, media }) {
  const s = assertSpec(spec);
  const nodes = cloneTemplate(template);

  const rolesResult = applyRoles(nodes, s, values);
  const missingRequired = (REQUIRED_ROLES_BY_KIND[s.kind] ?? []).filter((role) =>
    rolesResult.missing.some((m) => m.role === role),
  );
  if (missingRequired.length > 0) {
    const detail = rolesResult.missing
      .filter((m) => missingRequired.includes(m.role))
      .map((m) => `${m.role}(${m.reason}${m.node ? `@${m.node}` : ''})`)
      .join('、');
    throw new Error(`${s.kind} 规格缺少必需参数：${detail}`);
  }

  const mediaResult = bindMedia(nodes, s, media);
  const pruneResult = pruneWorkflow(nodes, s);

  const outputClasses = new Set(s.outputs);
  const outputs = Object.entries(pruneResult.nodes)
    .filter(([, node]) => outputClasses.has(String(node.class_type)))
    .map(([id]) => id);

  return {
    prompt: pruneResult.nodes,
    outputs,
    meta: {
      specId: s.id,
      kind: s.kind,
      sourceFile: s.sourceFile,
      appliedRoles: rolesResult.applied,
      missingRoles: rolesResult.missing,
      boundMedia: mediaResult.bound,
      createdLoaders: mediaResult.created,
      removedLoaders: mediaResult.removedLoaders,
      prunedNodes: pruneResult.removed,
      cleanedLinks: pruneResult.cleanedLinks,
      outputs,
      warning: pruneResult.warning,
    },
  };
}

/**
 * 跑一次工作流：组装载荷 → 交给注入的 `submit`。
 *
 * `submit` 由通道（comfyui / runninghub / dsh）实现，本文件**不联网**。
 *
 * @param {object} options
 * @param {object} options.spec
 * @param {unknown} options.template
 * @param {Record<string, unknown>} options.values
 * @param {unknown} [options.media]
 * @param {(payload: object, opts: { signal?: AbortSignal }) => Promise<object>} options.submit
 * @param {AbortSignal} [options.signal]
 */
export async function runWorkflow({ spec, template, values, media, submit, signal }) {
  if (typeof submit !== 'function') throw new Error('runWorkflow 需要注入 submit 函数');
  const payload = buildPromptPayload({ spec, template, values, media });
  const result = await submit(payload, { signal });
  return { ...result, meta: payload.meta };
}
