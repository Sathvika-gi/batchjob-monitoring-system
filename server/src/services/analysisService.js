import { Job } from '../models/Job.js';
import { Execution } from '../models/Execution.js';
import { Dependency } from '../models/Dependency.js';
import { getDownstreamJobIds, getUpstreamJobIds } from './dependencyService.js';

/**
 * Root-cause analysis for a failed job.
 * Uses deterministic graph analysis — not AI.
 */
export async function analyzeRootCause(jobId) {
  const job = await Job.findById(jobId).populate('workflowId').lean();
  if (!job) throw new Error('Job not found');

  const lastExecution = await Execution.findOne({
    jobId,
    status: { $in: ['failed', 'timed_out'] },
  }).sort({ createdAt: -1 }).lean();

  const upstreamIds = await getUpstreamJobIds(jobId, job.workflowId);
  const downstreamIds = await getDownstreamJobIds(jobId, job.workflowId);

  // Check upstream failures
  const upstreamJobs = upstreamIds.size > 0
    ? await Job.find({ _id: { $in: [...upstreamIds] } }).lean()
    : [];

  const failedUpstream = upstreamJobs.filter(j => ['failed', 'timed_out'].includes(j.lastRunStatus));
  const directUpstreamDeps = await Dependency.find({
    downstreamJobId: jobId, workflowId: job.workflowId
  }).lean();
  const directUpstreamIds = new Set(directUpstreamDeps.map(d => d.upstreamJobId.toString()));
  const directlyFailedUpstream = failedUpstream.filter(j => directUpstreamIds.has(j._id.toString()));

  // Determine root cause classification
  let rootCauseConfidence = 'unconfirmed';
  let rootCauseDescription = 'Root cause not confirmed; inspect the execution logs.';
  let candidateRootCause = job;
  let evidenceList = [];

  if (directlyFailedUpstream.length > 0) {
    rootCauseConfidence = 'upstream_failure';
    candidateRootCause = directlyFailedUpstream[0];
    rootCauseDescription = `Upstream job "${directlyFailedUpstream[0].name}" failed, which likely caused this failure.`;
    evidenceList.push(`Direct upstream dependency "${directlyFailedUpstream[0].name}" has status: ${directlyFailedUpstream[0].lastRunStatus}`);
  } else if (failedUpstream.length > 0) {
    rootCauseConfidence = 'transitive_upstream_failure';
    candidateRootCause = failedUpstream[0];
    rootCauseDescription = `Transitive upstream dependency "${failedUpstream[0].name}" failed, which may have contributed.`;
    evidenceList.push(`Upstream dependency "${failedUpstream[0].name}" has status: ${failedUpstream[0].lastRunStatus}`);
  } else {
    rootCauseConfidence = 'primary_failure';
    rootCauseDescription = lastExecution?.errorMessage
      ? `Job failed with: ${lastExecution.errorMessage}`
      : 'No upstream failures detected. This job appears to be the root cause.';
    if (lastExecution?.errorMessage) evidenceList.push(`Error: ${lastExecution.errorMessage}`);
  }

  // Downstream impact
  const downstreamJobs = downstreamIds.size > 0
    ? await Job.find({ _id: { $in: [...downstreamIds] } }).lean()
    : [];
  const directDownstreamDeps = await Dependency.find({ upstreamJobId: jobId, workflowId: job.workflowId }).lean();
  const directDownstreamIds = new Set(directDownstreamDeps.map(d => d.downstreamJobId.toString()));
  const directlyImpacted = downstreamJobs.filter(j => directDownstreamIds.has(j._id.toString()));
  const transitivelyImpacted = downstreamJobs.filter(j => !directDownstreamIds.has(j._id.toString()));
  const criticalImpacted = downstreamJobs.filter(j => ['critical', 'high'].includes(j.criticality));
  const blockedJobs = downstreamJobs.filter(j => j.status === 'blocked');

  return {
    incidentId: `INC-${Date.now().toString(36).toUpperCase()}`,
    failedJob: { id: job._id, name: job.name, jobKey: job.jobKey, criticality: job.criticality, status: job.lastRunStatus },
    failureTime: lastExecution?.completedAt || job.updatedAt,
    errorSummary: lastExecution?.errorMessage || 'No error message recorded',
    candidateRootCause: {
      job: { id: candidateRootCause._id, name: candidateRootCause.name, jobKey: candidateRootCause.jobKey },
      confidence: rootCauseConfidence,
      description: rootCauseDescription,
    },
    evidence: evidenceList,
    upstreamAnalysis: {
      totalUpstream: upstreamIds.size,
      failedUpstream: failedUpstream.length,
      failedUpstreamJobs: failedUpstream.map(j => ({ id: j._id, name: j.name, status: j.lastRunStatus })),
    },
    impact: {
      directlyImpacted: directlyImpacted.map(j => ({ id: j._id, name: j.name, criticality: j.criticality, status: j.status })),
      transitivelyImpacted: transitivelyImpacted.map(j => ({ id: j._id, name: j.name, criticality: j.criticality, status: j.status })),
      totalImpacted: downstreamJobs.length,
      criticalImpacted: criticalImpacted.length,
      blockedJobs: blockedJobs.length,
    },
    suggestedNextStep: directlyFailedUpstream.length > 0
      ? `Investigate and resolve upstream job "${directlyFailedUpstream[0].name}" first.`
      : lastExecution?.errorMessage
        ? 'Review the error message and execution logs. Check data source availability.'
        : 'Inspect execution logs and verify data source connectivity.',
  };
}

/**
 * Calculate downstream impact from a job failure.
 */
export async function calculateDownstreamImpact(jobId) {
  const job = await Job.findById(jobId).lean();
  if (!job) throw new Error('Job not found');

  const downstreamIds = await getDownstreamJobIds(jobId, job.workflowId);
  const downstreamJobs = downstreamIds.size > 0
    ? await Job.find({ _id: { $in: [...downstreamIds] } }).populate('workflowId', 'name criticality').lean()
    : [];

  const directDeps = await Dependency.find({ upstreamJobId: jobId }).lean();
  const directIds = new Set(directDeps.map(d => d.downstreamJobId.toString()));

  const affectedWorkflowIds = new Set(downstreamJobs.map(j => j.workflowId?._id?.toString() || j.workflowId?.toString()));
  const criticalJobs = downstreamJobs.filter(j => ['critical', 'high'].includes(j.criticality));

  // Find earliest recovery path (jobs with no failed/blocked upstream after this job)
  const recoveryPath = downstreamJobs
    .filter(j => directIds.has(j._id.toString()))
    .map(j => j.name);

  const summary = downstreamJobs.length === 0
    ? `Job ${job.name} failed. No downstream jobs are affected.`
    : `Job ${job.name} failed. ${downstreamJobs.length} downstream job(s) are directly or indirectly affected. ${criticalJobs.length} critical job(s) may miss their expected completion time.`;

  return {
    failedJob: { id: job._id, name: job.name, jobKey: job.jobKey, criticality: job.criticality },
    summary,
    directlyImpacted: downstreamJobs
      .filter(j => directIds.has(j._id.toString()))
      .map(j => ({ id: j._id, name: j.name, criticality: j.criticality, status: j.status })),
    transitivelyImpacted: downstreamJobs
      .filter(j => !directIds.has(j._id.toString()))
      .map(j => ({ id: j._id, name: j.name, criticality: j.criticality, status: j.status })),
    totalAffected: downstreamJobs.length,
    criticalAffected: criticalJobs.length,
    affectedWorkflows: affectedWorkflowIds.size,
    blockedJobs: downstreamJobs.filter(j => j.status === 'blocked').length,
    atRiskJobs: downstreamJobs.filter(j => j.status === 'pending' && directIds.has(j._id.toString())).length,
    recoveryPath,
  };
}
