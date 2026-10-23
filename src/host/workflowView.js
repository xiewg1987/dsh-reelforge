/**
 * 把工作流确定性解析结果收成客户端可展示的 JSON（无 Node 对象、无循环引用）。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { analyzeWorkflow } from '../core/analyzeWorkflow.js';
import { PACKAGE_ROOT } from './paths.js';
import { resolveProjectPath, resolveWorkspaceRoot } from './workspace.js';

/**
 * `analyzeWorkflow()` 的 diagnostics 条目。
 *
 * 注意 `node` 是**节点 id 字符串**（不是节点对象），`class_type` 在条目顶层。
 *
 * @typedef {object} WorkflowDiagnosticsEntry
 * @property {string} [node] 节点 id。
 * @property {string} [class_type] 节点类型，如 `SaveImage`。
 * @property {string} [field] 输入字段名（仅 textCandidates 带）。
 * @property {string} [media] 媒体类别（仅 loaders 带）。
 * @property {unknown} [value] 字段值（仅 textCandidates 带）。
 */

/**
 * @typedef {object} WorkflowDiagnostics
 * @property {WorkflowDiagnosticsEntry[]} [loaders]
 * @property {WorkflowDiagnosticsEntry[]} [modelLoaders]
 * @property {WorkflowDiagnosticsEntry[]} [saves]
 * @property {WorkflowDiagnosticsEntry[]} [samplers]
 * @property {WorkflowDiagnosticsEntry[]} [sizeNodes]
 * @property {WorkflowDiagnosticsEntry[]} [textCandidates]
 * @property {boolean} [hasVideoFields]
 */

/**
 * @typedef {object} WorkflowRole
 * @property {string} node 节点 id。
 * @property {string} field 输入字段名。
 * @property {Record<string, string>} [map] 字段映射。
 */

/**
 * `analyzeWorkflow()` 的返回值形状（只列本模块读到的字段）。
 *
 * @typedef {object} AnalyzedWorkflow
 * @property {string} [kind]
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [description]
 * @property {string} [sourceFile]
 * @property {string[]} [outputs]
 * @property {WorkflowRole[]} [roles]
 * @property {WorkflowDiagnostics} [diagnostics]
 */

/**
 * 客户端可展示的 diagnostics 条目。
 *
 * @typedef {object} SerializedDiagnosticsEntry
 * @property {string} class_type 节点类型。
 * @property {string} field 输入字段名。
 */

/**
 * @typedef {object} SerializedDiagnostics
 * @property {SerializedDiagnosticsEntry[]} loaders
 * @property {SerializedDiagnosticsEntry[]} modelLoaders
 * @property {SerializedDiagnosticsEntry[]} saves
 * @property {SerializedDiagnosticsEntry[]} samplers
 * @property {SerializedDiagnosticsEntry[]} sizeNodes
 * @property {SerializedDiagnosticsEntry[]} textCandidates
 * @property {boolean} hasVideoFields
 */

/**
 * @typedef {object} SerializedWorkflowAnalysis
 * @property {string} kind
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} sourceFile
 * @property {string[]} outputs
 * @property {WorkflowRole[]} roles
 * @property {SerializedDiagnostics} diagnostics
 */

/**
 * @param {unknown} analyzed `analyzeWorkflow()` 返回值。
 * @returns {SerializedWorkflowAnalysis | null}
 */
export function serializeWorkflowAnalysis(analyzed) {
  if (!analyzed || typeof analyzed !== 'object') return null;
  const record = /** @type {AnalyzedWorkflow} */ (analyzed);
  const diagnostics = record.diagnostics ?? {};
  // 上游 diagnostics 条目的 `node` 是 id 字符串、`class_type` 在顶层，不能从 `node` 里取。
  const summarize = (entries) => (Array.isArray(entries) ? entries : []).map((entry) => {
    const item = /** @type {WorkflowDiagnosticsEntry} */ (entry);
    return {
      class_type: typeof item?.class_type === 'string' ? item.class_type : '',
      field: typeof item?.field === 'string' ? item.field : '',
    };
  });
  return {
    kind: record.kind ?? '',
    id: record.id ?? '',
    name: record.name ?? '',
    description: record.description ?? '',
    sourceFile: record.sourceFile ?? '',
    outputs: Array.isArray(record.outputs) ? record.outputs : [],
    // 上游 roles 恒为数组 —— 兜底也给空数组，别给空对象（形状不一致，读者要再判一次）。
    roles: Array.isArray(record.roles) ? record.roles : [],
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
 * @returns {Promise<SerializedWorkflowAnalysis | null>}
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
 * @returns {Promise<Record<string, unknown> | null>}
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
