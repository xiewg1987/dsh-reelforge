/**
 * 插件自带的**只读资源目录**（宿主半）。
 *
 * 这些目录随包分发、随包只读：
 * - `skills/` —— 自有技能正文（T2 产出，`skill` / `skill_reference` 两个工具读它）；
 * - `workflows/specs/` —— 五种 kind × 三档的 F5 规格（T3 产出）。
 *
 * ⚠️ 这些路径**按模块位置解析**，不按 `process.cwd()` —— 插件可能被装到任意目录，
 * 而会话工作目录是用户项目，两者绝不能混。
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

/** 仓库根目录（`src/host/` 的上一级）。 */
export const PACKAGE_ROOT = path.resolve(here, '..', '..');

/** 自有技能正文目录。 */
export const BUNDLED_SKILLS_DIR = path.join(PACKAGE_ROOT, 'skills');

/** 工作流规格集目录。 */
export const WORKFLOW_SPECS_DIR = path.join(PACKAGE_ROOT, 'workflows', 'specs');

/** 插件在工作区内的私有目录（变更日志、临时产物等）。 */
export const PRIVATE_DIR = '.reelforge';
