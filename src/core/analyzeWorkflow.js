/**
 * 工作流确定性解析（§8.3 · T5 §2.6）。
 *
 * 纯逻辑、无宿主依赖、可单测。输入是一张 ComfyUI 工作流图，输出符合 **F5** 的
 * `WorkflowSpec` 形状，并附带推导结果与 `diagnostics`。
 *
 * 两条必须照抄的边界：
 *   1. `media` **恒为 `null`** —— 媒体绑定由上层补。
 *   2. 返回体里**没有 `prune` 字段** —— 剪枝靠「从 outputs 反向可达性」自动解决（T3 负责）。
 *
 * 四个常量（照抄，不允许改）：
 *   LOADER_CLASSES / SAVE_CLASSES / SAMPLE_CLASSES / MODEL_LOADER_RE
 */

/** 输入加载节点：class_type → { 角色, 媒体类别 }。 */
export const LOADER_CLASSES = Object.freeze({
  LoadImage: Object.freeze({ role: 'image', media: 'image' }),
  LoadAudio: Object.freeze({ role: 'audio', media: 'audio' }),
  LoadVideo: Object.freeze({ role: 'video', media: 'file' }),
  UploadImage: Object.freeze({ role: 'image', media: 'image' }),
});

/** 输出保存节点。 */
export const SAVE_CLASSES = Object.freeze(['SaveImage', 'SaveVideo', 'SaveAnimatedWEBP', 'VHS_VideoCombine']);

/** 采样节点。 */
export const SAMPLE_CLASSES = Object.freeze(['KSampler', 'SamplerCustomAdvanced', 'KSamplerAdvanced']);

/** 模型加载节点识别式。 */
export const MODEL_LOADER_RE = /(UNET|CLIP|VAE|Checkpoint|Diffusion|Lora|ControlNet).*Loader|Loader.*(Model|CLIP|VAE|UNET)/i;

/** 负向提示词命中式（title / field 任一命中即算负向）。 */
const NEGATIVE_RE = /neg|negative|负向|负面/i;

/** 提示词字段白名单。 */
const PROMPT_FIELDS = Object.freeze(['text', 'prompt']);

/** 视频时长字段。 */
const SECONDS_FIELDS = Object.freeze(['seconds', 'second', 'duration', 'length', 'video_length', 'num_seconds']);

/** 分辨率字段（**不含** width/height —— 那是图像尺寸，不是视频分辨率）。 */
const RESOLUTION_FIELDS = Object.freeze(['resolution', 'res']);

/** 画幅字段。 */
const ASPECT_FIELDS = Object.freeze(['aspect_ratio', 'ratio', 'ar']);

/**
 * 把一张工作流图归一成 `[{ id, class_type, title, inputs }]`。
 *
 * 兼容两种形状：ComfyUI 的 API 形态（`{ "3": { class_type, inputs } }`）与
 * UI 形态（`{ nodes: [{ id, type, title, widgets_values, inputs }] }`）。
 *
 * @param {unknown} graph - 工作流图。
 * @returns {Array<{ id: string, class_type: string, title: string, inputs: Record<string, unknown> }>}
 */
export function normalizeGraph(graph) {
  if (graph === null || typeof graph !== 'object') return [];
  const source = /** @type {Record<string, unknown>} */ (graph);
  const rawNodes = Array.isArray(source.nodes)
    ? source.nodes
    : Object.entries(source)
      .filter(([, value]) => value !== null && typeof value === 'object')
      .map(([id, value]) => ({ id, .../** @type {Record<string, unknown>} */ (value) }));

  /** @type {Array<{ id: string, class_type: string, title: string, inputs: Record<string, unknown> }>} */
  const nodes = [];
  for (const entry of rawNodes) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    const classType = typeof record.class_type === 'string'
      ? record.class_type
      : typeof record.type === 'string' ? record.type : '';
    if (classType === '') continue;
    const inputs = record.inputs !== null && typeof record.inputs === 'object'
      ? /** @type {Record<string, unknown>} */ (record.inputs)
      : {};
    nodes.push({
      id: String(record.id ?? ''),
      class_type: classType,
      title: typeof record.title === 'string' ? record.title : '',
      inputs,
    });
  }
  return nodes;
}

/**
 * 读一个节点的某个输入字段。
 * @param {{ inputs: Record<string, unknown> }} node - 节点。
 * @param {string} field - 字段名。
 * @returns {unknown} 字段值，不存在时 undefined。
 */
function inputOf(node, field) {
  return Object.prototype.hasOwnProperty.call(node.inputs, field) ? node.inputs[field] : undefined;
}

/**
 * 判断一个节点是否是「尺寸节点」：class_type 以 `Empty` 开头且含 `Latent`，
 * 或同时带 `width` 与 `height` 且 class 含 `Latent`。
 * @param {{ class_type: string, inputs: Record<string, unknown> }} node - 节点。
 * @returns {boolean} 是否尺寸节点。
 */
export function isSizeNode(node) {
  const classType = node.class_type;
  const hasLatent = classType.includes('Latent');
  if (hasLatent && classType.startsWith('Empty')) return true;
  return hasLatent
    && inputOf(node, 'width') !== undefined
    && inputOf(node, 'height') !== undefined;
}

/**
 * 判断一个文本候选是否命中负向式。
 * @param {{ title: string }} node - 节点。
 * @param {string} field - 字段名。
 * @returns {boolean} 是否负向。
 */
function isNegative(node, field) {
  return NEGATIVE_RE.test(node.title) || NEGATIVE_RE.test(field);
}

/**
 * 找出第一个满足条件的字符串提示词字段。
 * @param {Array<object>} nodes - 归一后的节点。
 * @param {boolean} negative - true 找负向，false 找正向。
 * @returns {{ node: object, field: string, value: string } | null} 命中项。
 */
function findPrompt(nodes, negative) {
  for (const node of nodes) {
    for (const field of PROMPT_FIELDS) {
      const value = inputOf(node, field);
      if (typeof value !== 'string') continue;
      if (isNegative(node, field) !== negative) continue;
      return { node, field, value };
    }
  }
  return null;
}

/**
 * 找出第一个带视频语义的输入字段。
 * @param {Array<object>} nodes - 归一后的节点。
 * @param {readonly string[]} fields - 候选字段名。
 * @returns {{ node: object, field: string, value: unknown } | null} 命中项。
 */
function findVideoField(nodes, fields) {
  for (const node of nodes) {
    for (const field of fields) {
      if (inputOf(node, field) === undefined) continue;
      return { node, field, value: inputOf(node, field) };
    }
  }
  return null;
}

/**
 * 解析一张工作流图。
 *
 * @param {unknown} graph - 工作流图（API 形态或 UI 形态皆可）。
 * @param {{ id?: string, name?: string, description?: string, sourceFile?: string }} [meta] - 规格元信息。
 * @returns {object} `WorkflowSpec` 形状 + 推导结果 + `diagnostics`。
 */
export function analyzeWorkflow(graph, meta = {}) {
  const nodes = normalizeGraph(graph);

  /** @type {Array<{ node: object, field: string, value: unknown }>} */
  const loaders = [];
  /** @type {Array<{ node: object, field: string, value: unknown }>} */
  const modelLoaders = [];
  /** @type {Array<{ node: object, field: string, value: unknown }>} */
  const saves = [];
  /** @type {Array<{ node: object, field: string, value: unknown }>} */
  const samplers = [];
  /** @type {Array<{ node: object, field: string, value: unknown }>} */
  const sizeNodes = [];
  /** @type {Array<{ node: object, field: string, value: string }>} */
  const textCandidates = [];

  for (const node of nodes) {
    const loader = LOADER_CLASSES[node.class_type];
    if (loader !== undefined) loaders.push({ node, field: 'image', value: loader.media });
    if (MODEL_LOADER_RE.test(node.class_type)) modelLoaders.push({ node, field: 'model', value: node.class_type });
    if (SAVE_CLASSES.includes(node.class_type)) saves.push({ node, field: 'filename_prefix', value: inputOf(node, 'filename_prefix') });
    if (SAMPLE_CLASSES.includes(node.class_type)) samplers.push({ node, field: 'seed', value: inputOf(node, 'seed') });
    if (isSizeNode(node)) sizeNodes.push({ node, field: 'width', value: inputOf(node, 'width') });
    for (const field of PROMPT_FIELDS) {
      const value = inputOf(node, field);
      if (typeof value !== 'string') continue;
      textCandidates.push({ node, field, value });
    }
  }

  const positive = findPrompt(nodes, false);
  const negative = findPrompt(nodes, true);
  const size = sizeNodes[0] ?? null;
  const imageLoader = loaders.find(entry => entry.value === 'image') ?? null;
  const firstLoader = loaders[0] ?? null;

  // seed：① 采样器或含 Noise 的节点上的 seed；② 否则第一个 noise_seed。
  let seed = null;
  for (const node of nodes) {
    const isSampler = SAMPLE_CLASSES.includes(node.class_type) || node.class_type.includes('Noise');
    if (!isSampler) continue;
    const value = inputOf(node, 'seed');
    if (value === undefined) continue;
    seed = { node, field: 'seed', value };
    break;
  }
  if (seed === null) {
    for (const node of nodes) {
      const value = inputOf(node, 'noise_seed');
      if (value === undefined) continue;
      seed = { node, field: 'noise_seed', value };
      break;
    }
  }

  // 视频三字段：仅当全图存在这三者之一时才填。
  const seconds = findVideoField(nodes, SECONDS_FIELDS);
  const resolution = findVideoField(nodes, RESOLUTION_FIELDS);
  const aspectRatio = findVideoField(nodes, ASPECT_FIELDS);
  const hasVideoFields = seconds !== null || resolution !== null || aspectRatio !== null
    || nodes.some(node => node.class_type === 'SaveVideo' || node.class_type === 'VHS_VideoCombine');

  const saveNodes = saves.map(entry => entry.node);
  const outputs = saveNodes.map(node => node.class_type);

  // kind：含 SaveVideo 或有视频字段 → r2v；否则有 image loader → i2i；否则 t2i。
  let kind = 't2i';
  if (nodes.some(node => node.class_type === 'SaveVideo') || hasVideoFields) kind = 'r2v';
  else if (imageLoader !== null) kind = 'i2i';

  /** @type {Array<{ node: object, field: string, map?: Record<string, string> }>} */
  const roles = [];
  const role = (entry, map) => {
    if (entry === null || entry === undefined) return;
    const id = String(entry.node.id);
    const item = { node: id, field: entry.field, ...(map === undefined ? {} : { map }) };
    if (roles.some(existing => existing.node === item.node && existing.field === item.field)) return;
    roles.push(item);
  };
  role(positive);
  role(negative);
  if (size !== null) {
    role(size, { width: 'width', height: 'height' });
  }
  role(seed);
  role(saves[0] ?? null);
  role(imageLoader ?? firstLoader);
  if (seconds !== null) role(seconds, { seconds: 'seconds' });
  if (resolution !== null) role(resolution, { resolution: 'resolution' });
  if (aspectRatio !== null) role(aspectRatio, { aspect_ratio: 'aspect_ratio' });

  return {
    id: meta.id ?? 'reelforge/workflow',
    kind,
    name: meta.name ?? 'ReelForge Workflow',
    description: meta.description ?? '',
    sourceFile: meta.sourceFile ?? '',
    roles,
    // media 恒为 null（媒体绑定由上层补）。
    media: null,
    outputs,
    positive_prompt: positive === null ? null : { node: String(positive.node.id), field: positive.field, value: positive.value },
    negative_prompt: negative === null ? null : { node: String(negative.node.id), field: negative.field, value: negative.value },
    width: size === null ? null : { node: String(size.node.id), field: 'width', value: size.value },
    height: size === null ? null : { node: String(size.node.id), field: 'height', value: inputOf(size.node, 'height') },
    seed: seed === null ? null : { node: String(seed.node.id), field: seed.field, value: seed.value },
    filename_prefix: saves.length === 0
      ? null
      : { node: String(saves[0].node.id), field: 'filename_prefix', value: saves[0].value ?? null },
    seconds: seconds === null ? null : { node: String(seconds.node.id), field: seconds.field, value: seconds.value },
    resolution: resolution === null ? null : { node: String(resolution.node.id), field: resolution.field, value: resolution.value },
    aspect_ratio: aspectRatio === null ? null : { node: String(aspectRatio.node.id), field: aspectRatio.field, value: aspectRatio.value },
    image: imageLoader === null
      ? null
      : { node: String(imageLoader.node.id), field: 'image', value: inputOf(imageLoader.node, 'image') ?? null },
    diagnostics: {
      loaders: loaders.map(entry => ({ node: String(entry.node.id), class_type: entry.node.class_type, media: entry.value })),
      modelLoaders: modelLoaders.map(entry => ({ node: String(entry.node.id), class_type: entry.value })),
      saves: saves.map(entry => ({ node: String(entry.node.id), class_type: entry.node.class_type })),
      samplers: samplers.map(entry => ({ node: String(entry.node.id), class_type: entry.node.class_type })),
      sizeNodes: sizeNodes.map(entry => ({ node: String(entry.node.id), class_type: entry.node.class_type })),
      textCandidates: textCandidates.map(entry => ({ node: String(entry.node.id), field: entry.field, value: entry.value })),
      hasVideoFields,
    },
  };
}

export default analyzeWorkflow;
