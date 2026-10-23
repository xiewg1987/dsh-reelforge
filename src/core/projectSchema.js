/**
 * `project.json` 三层结构（项目 / 章节 / 分镜）的定义、默认值与物化——纯逻辑，可单测。
 *
 * 分层纪律（§6.1 / §6.5）：
 *   - **内容字段**：模型与外部可写；
 *   - **产物字段**：只有渲染阶段可写（`status` / `video_path` / `seed` 等）。
 *
 * 本模块只产出**内容字段**。产物字段由渲染阶段写入，写入门禁见 `src/host/gate.js`。
 */
import {
  CHAPTER_CONTENT_FIELDS,
  PROJECT_CONTENT_FIELDS,
  SHOT_CONTENT_FIELDS,
  SHOT_DURATION_DEFAULT,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DIM_MAX,
  VIDEO_DIM_MIN,
  VIDEO_RESOLUTION_MP,
} from './constants.js';

/** 项目级默认值。`video_resolution` 的默认值 1080P **不在下拉选项里**——这是上游真实行为。 */
export const PROJECT_DEFAULTS = Object.freeze({
  video_resolution: '1080P',
  video_aspect_ratio: '9:16',
  enable_bgm: true,
  enable_subtitles: true,
  target_duration: null,
});

/**
 * 创建项目对象。
 *
 * @param {object} [input] 输入；只接受内容字段，其余键一律丢弃。
 * @returns {object} 项目对象（含空的 `chapters` 数组）。
 */
export function createProject(input = {}) {
  const project = {
    name: typeof input.name === 'string' ? input.name : '',
    novel: typeof input.novel === 'string' ? input.novel : '',
    idea: typeof input.idea === 'string' ? input.idea : '',
    style: typeof input.style === 'string' ? input.style : '',
    video_resolution: PROJECT_DEFAULTS.video_resolution,
    video_aspect_ratio: PROJECT_DEFAULTS.video_aspect_ratio,
    video_width: undefined,
    video_height: undefined,
    target_duration: PROJECT_DEFAULTS.target_duration,
    enable_bgm: PROJECT_DEFAULTS.enable_bgm,
    enable_subtitles: PROJECT_DEFAULTS.enable_subtitles,
    chapters: [],
  };

  if (typeof input.video_resolution === 'string' && input.video_resolution in VIDEO_RESOLUTION_MP) {
    project.video_resolution = input.video_resolution;
  }
  if (typeof input.video_aspect_ratio === 'string' && VIDEO_ASPECT_RATIOS.includes(input.video_aspect_ratio)) {
    project.video_aspect_ratio = input.video_aspect_ratio;
  }
  for (const key of ['video_width', 'video_height']) {
    const value = input[key];
    if (Number.isInteger(value) && value >= VIDEO_DIM_MIN && value <= VIDEO_DIM_MAX) {
      project[key] = value;
    }
  }
  if (typeof input.target_duration === 'number' && Number.isFinite(input.target_duration) && input.target_duration > 0) {
    project.target_duration = input.target_duration;
  }
  if (typeof input.enable_bgm === 'boolean') project.enable_bgm = input.enable_bgm;
  if (typeof input.enable_subtitles === 'boolean') project.enable_subtitles = input.enable_subtitles;
  return project;
}

/**
 * 创建章节对象。
 *
 * @param {object} [input] 输入。
 * @returns {object} 章节对象（含空的 `shots` 数组）。
 */
export function createChapter(input = {}) {
  return {
    seq: Number.isInteger(input.seq) && input.seq >= 1 ? input.seq : 1,
    title: typeof input.title === 'string' ? input.title : '',
    novel: typeof input.novel === 'string' ? input.novel : '',
    script: typeof input.script === 'string' ? input.script : '',
    shots: [],
  };
}

/**
 * 创建分镜对象。只接受内容字段；产物字段一律不出现。
 *
 * @param {object} [input] 输入。
 * @returns {object} 分镜对象。
 */
export function createShot(input = {}) {
  /** @type {Record<string, unknown>} */
  const shot = {};
  for (const field of SHOT_CONTENT_FIELDS) {
    if (!(field in input)) continue;
    const value = input[field];
    if (value === undefined) continue;
    shot[field] = value;
  }
  if (!('idx' in shot)) shot.idx = 1;
  if (!('duration' in shot)) shot.duration = SHOT_DURATION_DEFAULT;
  return shot;
}

/**
 * 把项目对象物化成**可落盘的纯 JSON**（去掉 undefined，冻结顺序无关的数组）。
 *
 * `project.json` 是会话投影的物化导出，不是事实源；事实源永远是会话日志（R1）。
 *
 * @param {object} project 项目对象。
 * @returns {object} 可 JSON.stringify 的对象。
 */
export function materializeProject(project) {
  return {
    ...pickContent(project, PROJECT_CONTENT_FIELDS),
    chapters: (project.chapters ?? []).map((chapter) => ({
      ...pickContent(chapter, CHAPTER_CONTENT_FIELDS),
      seq: chapter.seq,
      shots: (chapter.shots ?? []).map((shot) => pickContent(shot, SHOT_CONTENT_FIELDS)),
    })),
  };
}

/**
 * 只取内容字段。
 * @param {object} source 源对象。
 * @param {readonly string[]} fields 内容字段白名单。
 */
function pickContent(source, fields) {
  const result = {};
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}
