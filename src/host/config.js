/**
 * 插件 Config（R5）。
 *
 * 可调值全部走这里，用户在 `cordis.patch.yml` 的 patch 层改，**升级不覆盖**。
 * 任何地址、端口、路径、模型名都**不许硬编码**在业务代码里。
 *
 * 宿主契约：`export function apply(ctx, config)` 收到的 `config` 就是 patch 行里的
 * `config:` 块。本插件**不声明** `export const Config`（那需要依赖宿主的 schema 库），
 * 改为自己归一化 + 校验：值缺失走默认值，值不合法**立刻报错**而不是默默用默认值。
 */
import { CLOUD_PROVIDERS, RUN_POSITIONS, STAGES } from '../core/constants.js';

/** Config 默认值。与 `cordis.patch.yml` 里的 config 块保持一致。 */
export const CONFIG_DEFAULTS = Object.freeze({
  /** 工作区目录名（相对会话工作目录）。 */
  workspaceDir: '.reelforge',
  /** 运行位置：local | cloud。 */
  runPosition: 'cloud',
  /** 本地 ComfyUI 地址（仅 local 档）。 */
  comfyBaseUrl: 'http://127.0.0.1:8188',
  /** 云端 provider：runninghub | online-api | dsh。 */
  cloudProvider: 'dsh',
  /** 四阶段默认开关。 */
  stages: Object.freeze({ llm: true, image: true, tts: true, video: true }),
  /** 成本上限（界面成本位常驻显示已用/上限）。 */
  budgetLimitCny: 12,
  /** 默认输出开关（项目级可覆盖）。 */
  enableBgm: true,
  enableSubtitles: true,
  /** 目标时长（秒）；null = 不限，按章交付。 */
  targetDuration: null,
  /** 是否开放可选的第二个右栏 Tab（历史运行与成本记录）。 */
  enableRunsTab: false,
  /**
   * 宿主注入的**能力对象**（通道客户端 / 探测客户端等）。
   *
   * 它**不是可调值**：地址 / 端口 / 密钥仍然只走上面那些白名单字段（R5）。
   * 但它必须**原样透传**——`resolveConfig` 只认白名单里的 key，
   * 不显式透传就会被丢掉，于是「宿主没注入通道客户端」连报错都报不出来。
   */
  deps: Object.freeze({}),
});

/**
 * 归一化并校验 Config。
 *
 * @param {unknown} raw 宿主传入的原始 config。
 * @returns {typeof CONFIG_DEFAULTS} 归一化后的配置。
 * @throws {Error} 值不合法时抛出，消息指明字段与合法取值。
 */
export function resolveConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const config = {
    ...CONFIG_DEFAULTS,
    stages: { ...CONFIG_DEFAULTS.stages },
  };

  if (source.workspaceDir !== undefined) {
    if (typeof source.workspaceDir !== 'string' || source.workspaceDir.trim() === '') {
      throw new Error('config.workspaceDir 必须是非空字符串');
    }
    config.workspaceDir = source.workspaceDir;
  }

  if (source.runPosition !== undefined) {
    if (!RUN_POSITIONS.includes(source.runPosition)) {
      throw new Error(`config.runPosition 必须是 ${RUN_POSITIONS.join(' | ')}，收到 ${String(source.runPosition)}`);
    }
    config.runPosition = source.runPosition;
  }

  if (source.comfyBaseUrl !== undefined) {
    if (typeof source.comfyBaseUrl !== 'string' || !/^https?:\/\//.test(source.comfyBaseUrl)) {
      throw new Error('config.comfyBaseUrl 必须是 http(s) 开头的地址');
    }
    config.comfyBaseUrl = source.comfyBaseUrl.replace(/\/+$/, '');
  }

  if (source.cloudProvider !== undefined) {
    if (!CLOUD_PROVIDERS.includes(source.cloudProvider)) {
      throw new Error(`config.cloudProvider 必须是 ${CLOUD_PROVIDERS.join(' | ')}，收到 ${String(source.cloudProvider)}`);
    }
    config.cloudProvider = source.cloudProvider;
  }

  if (source.stages !== undefined) {
    if (!source.stages || typeof source.stages !== 'object') {
      throw new Error('config.stages 必须是对象');
    }
    for (const stage of STAGES) {
      const value = source.stages[stage];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') {
        throw new Error(`config.stages.${stage} 必须是布尔值`);
      }
      config.stages[stage] = value;
    }
  }

  if (source.budgetLimitCny !== undefined) {
    if (typeof source.budgetLimitCny !== 'number' || !Number.isFinite(source.budgetLimitCny) || source.budgetLimitCny < 0) {
      throw new Error('config.budgetLimitCny 必须是非负数字');
    }
    config.budgetLimitCny = source.budgetLimitCny;
  }

  for (const key of ['enableBgm', 'enableSubtitles', 'enableRunsTab']) {
    if (source[key] === undefined) continue;
    if (typeof source[key] !== 'boolean') {
      throw new Error(`config.${key} 必须是布尔值`);
    }
    config[key] = source[key];
  }

  if (source.targetDuration !== undefined && source.targetDuration !== null) {
    if (typeof source.targetDuration !== 'number' || !Number.isFinite(source.targetDuration) || source.targetDuration <= 0) {
      throw new Error('config.targetDuration 必须是正数或 null');
    }
    config.targetDuration = source.targetDuration;
  }

  // deps：宿主装配注入的**能力对象**（ComfyUI / RunningHub / DSH 通道客户端、
  // 探测客户端、ffmpeg 客户端…）。可调值仍走上面的白名单字段；
  // 这里只负责**不把它丢掉**——丢掉的话触发类工具既跑不起来，也说不清缺什么。
  if (source.deps !== undefined) {
    if (!source.deps || typeof source.deps !== 'object' || Array.isArray(source.deps)) {
      throw new Error('config.deps 必须是对象（宿主注入的通道客户端等能力）');
    }
    config.deps = source.deps;
  }

  return config;
}
