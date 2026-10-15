import { Dependency } from '../models/Dependency.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';

/**
 * Detect cycles using DFS on the dependency DAG.
 * Returns { hasCycle: boolean, cyclePath: string[] }
 */
export async function detectCycle(workflowId, proposedUpstreamId, proposedDownstreamId) {
  // Build adjacency list for the workflow
  const deps = await Dependency.find({ workflowId }).lean();
  const adj = {};
  for (const d of deps) {
    const up = d.upstreamJobId.toString();
    const down = d.downstreamJobId.toString();
    if (!adj[up]) adj[up] = [];
    adj[up].push(down);
  }
  // Add the proposed edge
  const up = proposedUpstreamId.toString();
  const down = proposedDownstreamId.toString();
  if (!adj[up]) adj[up] = [];
  adj[up].push(down);

  // DFS from the downstream node to check if we can reach the upstream node
  const visited = new Set();
  const path = [];

  function dfs(nodeId) {
    if (nodeId === up) return true; // cycle found
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    path.push(nodeId);
    for (const neighbor of (adj[nodeId] || [])) {
      if (dfs(neighbor)) return true;
    }
    path.pop();
    return false;
  }

  const hasCycle = dfs(down);
  return { hasCycle, cyclePath: hasCycle ? [up, ...path, up] : [] };
}

/**
 * Get all downstream job IDs (direct + transitive) for a given job.
 * Returns a Set of job ID strings.
 */
export async function getDownstreamJobIds(jobId, workflowId = null) {
  const query = workflowId ? { workflowId } : {};
  const allDeps = await Dependency.find(query).lean();

  const adj = {};
  for (const d of allDeps) {
    const up = d.upstreamJobId.toString();
    const down = d.downstreamJobId.toString();
    if (!adj[up]) adj[up] = [];
    adj[up].push(down);
  }

  const visited = new Set();
  const queue = [jobId.toString()];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of (adj[current] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited; // excludes the source job itself
}

/**
 * Get all upstream job IDs (direct + transitive) for a given job.
 */
export async function getUpstreamJobIds(jobId, workflowId = null) {
  const query = workflowId ? { workflowId } : {};
  const allDeps = await Dependency.find(query).lean();

  const adj = {}; // reverse adjacency: downstream -> [upstreams]
  for (const d of allDeps) {
    const up = d.upstreamJobId.toString();
    const down = d.downstreamJobId.toString();
    if (!adj[down]) adj[down] = [];
    adj[down].push(up);
  }

  const visited = new Set();
  const queue = [jobId.toString()];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of (adj[current] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

/**
 * Get the dependency graph for a workflow (nodes + edges).
 */
export async function getWorkflowGraph(workflowId) {
  const [jobs, deps] = await Promise.all([
    Job.find({ workflowId }).lean(),
    Dependency.find({ workflowId }).populate('upstreamJobId', 'name status').populate('downstreamJobId', 'name status').lean(),
  ]);

  const nodes = jobs.map(j => ({
    id: j._id.toString(),
    data: {
      jobId: j._id,
      label: j.name,
      jobKey: j.jobKey,
      status: j.status,
      criticality: j.criticality,
      lastDurationMs: j.lastDurationMs,
      riskLevel: j.riskLevel,
      isEnabled: j.isEnabled,
    },
    type: 'jobNode',
  }));

  const edges = deps.map(d => ({
    id: d._id.toString(),
    source: d.upstreamJobId._id.toString(),
    target: d.downstreamJobId._id.toString(),
    data: { dependencyType: d.dependencyType, dependencyId: d._id },
  }));

  return { nodes, edges };
}

/**
 * Validate that a dependency does not create a self-loop or cross-workflow reference.
 */
export async function validateDependency(workflowId, upstreamJobId, downstreamJobId) {
  if (upstreamJobId.toString() === downstreamJobId.toString()) {
    throw new AppError('A job cannot depend on itself.', 400);
  }

  const [upJob, downJob] = await Promise.all([
    Job.findById(upstreamJobId).lean(),
    Job.findById(downstreamJobId).lean(),
  ]);

  if (!upJob) throw new AppError('Upstream job not found.', 404);
  if (!downJob) throw new AppError('Downstream job not found.', 404);

  if (upJob.workflowId.toString() !== workflowId.toString()) {
    throw new AppError('Upstream job does not belong to this workflow.', 400);
  }
  if (downJob.workflowId.toString() !== workflowId.toString()) {
    throw new AppError('Downstream job does not belong to this workflow.', 400);
  }

  const { hasCycle, cyclePath } = await detectCycle(workflowId, upstreamJobId, downstreamJobId);
  if (hasCycle) {
    throw new AppError(
      `Adding this dependency would create a circular dependency. Cycle path involves job IDs: ${cyclePath.join(' → ')}`,
      400,
      'CYCLE_DETECTED'
    );
  }
}
