/**
 * 把工作流确定性解析结果收成客户端可展示的 JSON（无 Node 对象、无循环引用）。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { analyzeWorkflow } from '../core/analyzeWorkflow.js';
import { PACKAGE_ROOT } from './paths.js';
import { resolveProjectPath, resolveWorkspaceRoot } from './workspace.js';

/**
 * @param {unknown} analyzed `analyzeWorkflow()` 返回值。
 * @returns {object | null}
 */
export function serializeWorkflowAnalysis(analyzed) {
  if (!analyzed || typeof analyzed !== 'object') return null;
  const diagnostics = analyzed.diagnostics ?? {};
  const summarize = (entries) => (Array.isArray(entries) ? entries : []).map((entry) => ({
    class_type: entry?.node?.class_type ?? '',
    field: entry?.field ?? '',
  }));
  return {
    kind: analyzed.kind ?? '',
    id: analyzed.id ?? '',
    name: analyzed.name ?? '',
    description: analyzed.description ?? '',
    sourceFile: analyzed.sourceFile ?? '',
    outputs: Array.isArray(analyzed.outputs) ? analyzed.outputs : [],
    roles: analyzed.roles ?? {},
    diagnostics: {
      loaders: summarize(diagnostics.loaders),
      modelLoaders: summarize(diagnostics.modelLoaders),
      saves: summarize(diagnostics.saves),
      samplers: summarize(diagnostics.samplers),
      sizeNodes: summarize(diagnostics.sizeNodes),
      textCandidates: summarize(diagnostics.textCandidates),
      hasVideoFields: Boolean(diagnostics.hasVideoFields),
    },
  };
}

/**
 * 读工作区 `workflows/<kind>.json`；缺失时对 t2i 回退到随包 fixture。
 *
 * @param {string} cwd 会话工作目录。
 * @param {string} workspaceDir Config.workspaceDir。
 * @param {string} kind 生成 kind。
 * @returns {Promise<object | null>}
 */
export async function analyzeWorkflowForPlan(cwd, workspaceDir, kind) {
  const workspaceRoot = resolveWorkspaceRoot(cwd, workspaceDir);
  const userPath = `workflows/${kind}.json`;
  let graph = await readWorkflowJson(workspaceRoot, userPath);
  let sourceFile = userPath;
  if (!graph && kind === 't2i') {
    const fixture = path.join(PACKAGE_ROOT, 'workflows', 'fixtures', 'minimal-t2i.api.json');
    try {
      graph = JSON.parse(await readFile(fixture, 'utf8'));
      sourceFile = 'workflows/fixtures/minimal-t2i.api.json';
    } catch {
      return null;
    }
  }
  if (!graph) return null;
  return serializeWorkflowAnalysis(analyzeWorkflow(graph, {
    id: `user/${kind}`,
    name: `${kind} 工作流`,
    description: '工作区或随包 fixture 的确定性解析结果',
    sourceFile,
  }));
}

/**
 * @param {string} baseDir 工作区根。
 * @param {string} relative 相对路径。
 * @returns {Promise<object | null>}
 */
async function readWorkflowJson(baseDir, relative) {
  const file = resolveProjectPath(baseDir, relative);
  if (!file) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}
