/**
 * 工作区目录、相对路径越界防护与原子写（§11）。
 *
 * 路径防护照 infinite-creation 的 `resolveProjectPath()`：相对路径 `resolve` 之后
 * **必须仍在项目目录内**，越界一律返回 `null`——不是报错、不是「拼一下再看」。
 *
 * 这条防的是**提示注入导致的任意文件读/删**：小说正文是不可信输入，
 * 模型可能从正文里学到一个 `../../../../etc/passwd` 这样的路径。
 */
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * 把工作区目录解析为绝对路径。
 *
 * @param {string} sessionCwd 会话工作目录。
 * @param {string} workspaceDir 工作区目录名（相对会话目录）。
 * @returns {string} 绝对路径。
 */
export function resolveWorkspaceRoot(sessionCwd, workspaceDir) {
  const base = path.resolve(sessionCwd);
  return path.resolve(base, workspaceDir);
}

/**
 * 相对路径越界防护。
 *
 * @param {string} baseDir 基准目录（绝对路径）。
 * @param {unknown} relativePath 待解析的相对路径。
 * @returns {string | null} 合法则返回绝对路径，越界返回 `null`。
 */
export function resolveProjectPath(baseDir, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) return null;
  // 绝对路径直接拒绝：插件的产物一律是工作区内的相对路径
  if (path.isAbsolute(relativePath)) return null;
  // Windows 盘符 / UNC 也算绝对
  if (/^[a-zA-Z]:[\\/]/.test(relativePath) || relativePath.startsWith('\\\\')) return null;

  const base = path.resolve(baseDir);
  const target = path.resolve(base, relativePath);
  const relative = path.relative(base, target);
  // 越界判定：相对路径以 `..` 开头，或仍然是绝对路径（跨盘符）
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return target;
}

/**
 * 原子写：先写同目录临时文件，再 rename 覆盖。
 *
 * 临时文件必须在同一目录——跨目录 rename 在 Windows 上可能失败，
 * 而且同目录才能保证 rename 是原子的。
 *
 * @param {string} filePath 目标绝对路径。
 * @param {string | Uint8Array} data 内容。
 */
export async function writeFileAtomic(filePath, data) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    await writeFile(temporary, data, { flag: 'wx' });
    await rename(temporary, filePath);
  } catch (error) {
    // 失败时**删掉**临时文件。
    // ⚠️ 早前的实现是把临时文件**截空**（`writeFile(temporary, '', {flag:'a'})`），
    // 那并不等于清理 —— 文件还在，只是内容没了；每次写失败都会在工作区里
    // 留下一个 `.名字.随机.tmp` 的隐藏垃圾文件，污染目录扫描与交付清单。
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

/**
 * 仅新建：文件已存在就失败。
 *
 * 用 `wx` 标志**原子地**判存在，而不是「先查存在再覆盖」——后者有竞态窗口。
 *
 * @param {string} filePath 目标绝对路径。
 * @param {string | Uint8Array} data 内容。
 * @returns {Promise<boolean>} true 表示新建成功，false 表示文件已存在。
 */
export async function writeFileExclusive(filePath, data) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(filePath, data, { flag: 'wx' });
    return true;
  } catch (error) {
    if (error && error.code === 'EEXIST') return false;
    throw error;
  }
}
