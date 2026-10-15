import '../src/config/loadEnv.js';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Workflow } from '../src/models/Workflow.js';
import { Job } from '../src/models/Job.js';
import { Dependency } from '../src/models/Dependency.js';
import { Execution } from '../src/models/Execution.js';
import { Alert } from '../src/models/Alert.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { MonitoringConfig } from '../src/models/MonitoringConfig.js';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected. Clearing existing data...');

  await Promise.all([
    User.deleteMany({}), Workflow.deleteMany({}), Job.deleteMany({}),
    Dependency.deleteMany({}), Execution.deleteMany({}), Alert.deleteMany({}),
    AuditLog.deleteMany({}), MonitoringConfig.deleteMany({}),
  ]);

  // ─── USERS ────────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const users = await User.insertMany([
    { name: 'Admin User', email: 'admin@batchmonitor.dev', passwordHash: await bcrypt.hash('Admin@1234', SALT_ROUNDS), role: 'admin', isActive: true },
    { name: 'Operator User', email: 'operator@batchmonitor.dev', passwordHash: await bcrypt.hash('Operator@1234', SALT_ROUNDS), role: 'operator', isActive: true },
    { name: 'Viewer User', email: 'viewer@batchmonitor.dev', passwordHash: await bcrypt.hash('Viewer@1234', SALT_ROUNDS), role: 'viewer', isActive: true },
  ]);
  const [admin, operator, viewer] = users;

  // ─── MONITORING CONFIG ────────────────────────────────────────────────────
  await MonitoringConfig.create({ singleton: true });

  // ─── WORKFLOWS ────────────────────────────────────────────────────────────
  console.log('Creating workflows...');
  const [wf1, wf2, wf3] = await Workflow.insertMany([
    { name: 'Order Processing Pipeline', description: 'End-to-end order ingestion, validation, transformation, and warehouse load.', criticality: 'critical', isEnabled: true, createdBy: admin._id, tags: ['orders', 'etl'] },
    { name: 'Financial Reconciliation', description: 'Daily financial transaction reconciliation and revenue aggregation.', criticality: 'high', isEnabled: true, createdBy: admin._id, tags: ['finance', 'daily'] },
    { name: 'Data Warehouse Refresh', description: 'Incremental data warehouse refresh including backup and validation.', criticality: 'medium', isEnabled: true, createdBy: admin._id, tags: ['warehouse', 'backup'] },
  ]);

  // ─── JOBS ─────────────────────────────────────────────────────────────────
  console.log('Creating jobs...');

  const now = new Date();
  const nextHour = new Date(now.getTime() + 3600 * 1000);

  // Workflow 1: Order Processing Pipeline
  const jobs1 = await Job.insertMany([
    { name: 'Extract Orders', jobKey: 'EXTRACT_ORDERS', description: 'Extract raw orders from upstream systems.', workflowId: wf1._id, jobType: 'etl', scheduleType: 'cron', schedule: '0 1 * * *', timezone: 'UTC', expectedDurationMs: 120000, timeoutMs: 600000, retryLimit: 3, retryDelayMs: 60000, criticality: 'critical', isEnabled: true, status: 'success', lastRunAt: new Date(now - 2*3600000), lastRunStatus: 'success', lastDurationMs: 115000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.9, baseDurationMs: 120000, variabilityFactor: 0.15 } },
    { name: 'Validate Orders', jobKey: 'VALIDATE_ORDERS', description: 'Validate order data quality and schema.', workflowId: wf1._id, jobType: 'batch', scheduleType: 'cron', schedule: '0 2 * * *', timezone: 'UTC', expectedDurationMs: 90000, timeoutMs: 300000, retryLimit: 2, retryDelayMs: 30000, criticality: 'critical', isEnabled: true, status: 'success', lastRunAt: new Date(now - 1.8*3600000), lastRunStatus: 'success', lastDurationMs: 88000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.85, baseDurationMs: 90000, variabilityFactor: 0.2 } },
    { name: 'Transform Orders', jobKey: 'TRANSFORM_ORDERS', description: 'Apply business transformations to validated orders.', workflowId: wf1._id, jobType: 'etl', scheduleType: 'cron', schedule: '0 3 * * *', timezone: 'UTC', expectedDurationMs: 240000, timeoutMs: 900000, retryLimit: 2, retryDelayMs: 60000, criticality: 'high', isEnabled: true, status: 'failed', lastRunAt: new Date(now - 1*3600000), lastRunStatus: 'failed', lastDurationMs: 380000, nextRunAt: nextHour, riskLevel: 'critical', createdBy: admin._id, simulationConfig: { successRate: 0.7, baseDurationMs: 240000, variabilityFactor: 0.3 } },
    { name: 'Generate Report', jobKey: 'GENERATE_REPORT', description: 'Generate daily order summary report.', workflowId: wf1._id, jobType: 'report', scheduleType: 'cron', schedule: '0 4 * * *', timezone: 'UTC', expectedDurationMs: 60000, timeoutMs: 300000, retryLimit: 1, retryDelayMs: 30000, criticality: 'medium', isEnabled: true, status: 'blocked', lastRunAt: new Date(now - 48*3600000), lastRunStatus: 'success', lastDurationMs: 58000, nextRunAt: nextHour, riskLevel: 'high', createdBy: admin._id, simulationConfig: { successRate: 0.95, baseDurationMs: 60000, variabilityFactor: 0.1 } },
    { name: 'Update Warehouse', jobKey: 'UPDATE_WAREHOUSE', description: 'Load transformed orders into the data warehouse.', workflowId: wf1._id, jobType: 'etl', scheduleType: 'cron', schedule: '0 4 * * *', timezone: 'UTC', expectedDurationMs: 180000, timeoutMs: 720000, retryLimit: 3, retryDelayMs: 90000, criticality: 'critical', isEnabled: true, status: 'blocked', lastRunAt: new Date(now - 48*3600000), lastRunStatus: 'success', lastDurationMs: 175000, nextRunAt: nextHour, riskLevel: 'critical', createdBy: admin._id, simulationConfig: { successRate: 0.88, baseDurationMs: 180000, variabilityFactor: 0.2 } },
    { name: 'Finalize Batch', jobKey: 'FINALIZE_BATCH', description: 'Mark batch as complete and send notifications.', workflowId: wf1._id, jobType: 'notification', scheduleType: 'cron', schedule: '0 5 * * *', timezone: 'UTC', expectedDurationMs: 30000, timeoutMs: 120000, retryLimit: 1, retryDelayMs: 15000, criticality: 'medium', isEnabled: true, status: 'blocked', lastRunAt: new Date(now - 48*3600000), lastRunStatus: 'success', lastDurationMs: 28000, nextRunAt: nextHour, riskLevel: 'high', createdBy: admin._id, simulationConfig: { successRate: 0.98, baseDurationMs: 30000, variabilityFactor: 0.05 } },
  ]);

  // Workflow 2: Financial Reconciliation
  const jobs2 = await Job.insertMany([
    { name: 'Reconcile Transactions', jobKey: 'RECONCILE_TRANSACTIONS', description: 'Match and reconcile all financial transactions.', workflowId: wf2._id, jobType: 'batch', scheduleType: 'cron', schedule: '0 6 * * *', timezone: 'UTC', expectedDurationMs: 300000, timeoutMs: 1200000, retryLimit: 2, retryDelayMs: 120000, criticality: 'critical', isEnabled: true, status: 'running', lastRunAt: new Date(now - 0.5*3600000), lastRunStatus: 'success', lastDurationMs: 290000, nextRunAt: nextHour, riskLevel: 'medium', createdBy: admin._id, simulationConfig: { successRate: 0.92, baseDurationMs: 300000, variabilityFactor: 0.25 } },
    { name: 'Aggregate Revenue', jobKey: 'AGGREGATE_REVENUE', description: 'Aggregate daily and monthly revenue figures.', workflowId: wf2._id, jobType: 'batch', scheduleType: 'cron', schedule: '0 7 * * *', timezone: 'UTC', expectedDurationMs: 180000, timeoutMs: 600000, retryLimit: 2, retryDelayMs: 60000, criticality: 'high', isEnabled: true, status: 'pending', lastRunAt: new Date(now - 24*3600000), lastRunStatus: 'success', lastDurationMs: 195000, nextRunAt: nextHour, riskLevel: 'medium', createdBy: admin._id, simulationConfig: { successRate: 0.88, baseDurationMs: 200000, variabilityFactor: 0.3 } },
    { name: 'Generate Finance Report', jobKey: 'GENERATE_FINANCE_REPORT', description: 'Generate CFO-level financial summary report.', workflowId: wf2._id, jobType: 'report', scheduleType: 'cron', schedule: '0 8 * * *', timezone: 'UTC', expectedDurationMs: 120000, timeoutMs: 400000, retryLimit: 1, retryDelayMs: 30000, criticality: 'high', isEnabled: true, status: 'pending', lastRunAt: new Date(now - 24*3600000), lastRunStatus: 'success', lastDurationMs: 118000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.95, baseDurationMs: 120000, variabilityFactor: 0.15 } },
    { name: 'Archive Transactions', jobKey: 'ARCHIVE_TRANSACTIONS', description: 'Archive reconciled transactions to cold storage.', workflowId: wf2._id, jobType: 'cleanup', scheduleType: 'cron', schedule: '0 9 * * *', timezone: 'UTC', expectedDurationMs: 240000, timeoutMs: 900000, retryLimit: 1, retryDelayMs: 60000, criticality: 'low', isEnabled: true, status: 'pending', lastRunAt: new Date(now - 24*3600000), lastRunStatus: 'success', lastDurationMs: 235000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.97, baseDurationMs: 240000, variabilityFactor: 0.1 } },
  ]);

  // Workflow 3: Data Warehouse Refresh
  const jobs3 = await Job.insertMany([
    { name: 'Daily Backup', jobKey: 'DAILY_BACKUP', description: 'Full database backup before warehouse refresh.', workflowId: wf3._id, jobType: 'backup', scheduleType: 'cron', schedule: '0 0 * * *', timezone: 'UTC', expectedDurationMs: 600000, timeoutMs: 2400000, retryLimit: 1, retryDelayMs: 300000, criticality: 'critical', isEnabled: true, status: 'success', lastRunAt: new Date(now - 6*3600000), lastRunStatus: 'success', lastDurationMs: 590000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.97, baseDurationMs: 600000, variabilityFactor: 0.1 } },
    { name: 'Validate Backup', jobKey: 'VALIDATE_BACKUP', description: 'Verify backup integrity and completeness.', workflowId: wf3._id, jobType: 'batch', scheduleType: 'cron', schedule: '0 1 * * *', timezone: 'UTC', expectedDurationMs: 180000, timeoutMs: 600000, retryLimit: 1, retryDelayMs: 60000, criticality: 'high', isEnabled: true, status: 'success', lastRunAt: new Date(now - 5*3600000), lastRunStatus: 'success', lastDurationMs: 175000, nextRunAt: nextHour, riskLevel: 'low', createdBy: admin._id, simulationConfig: { successRate: 0.99, baseDurationMs: 180000, variabilityFactor: 0.05 } },
    { name: 'Refresh Dimensions', jobKey: 'REFRESH_DIMENSIONS', description: 'Refresh dimension tables with latest master data.', workflowId: wf3._id, jobType: 'etl', scheduleType: 'cron', schedule: '0 2 * * *', timezone: 'UTC', expectedDurationMs: 420000, timeoutMs: 1800000, retryLimit: 2, retryDelayMs: 120000, criticality: 'medium', isEnabled: true, status: 'timed_out', lastRunAt: new Date(now - 4*3600000), lastRunStatus: 'timed_out', lastDurationMs: 1850000, nextRunAt: nextHour, riskLevel: 'critical', createdBy: admin._id, simulationConfig: { successRate: 0.8, baseDurationMs: 420000, variabilityFactor: 0.4 } },
    { name: 'Refresh Facts', jobKey: 'REFRESH_FACTS', description: 'Refresh fact tables with latest transactional data.', workflowId: wf3._id, jobType: 'etl', scheduleType: 'cron', schedule: '0 3 * * *', timezone: 'UTC', expectedDurationMs: 720000, timeoutMs: 3600000, retryLimit: 2, retryDelayMs: 180000, criticality: 'high', isEnabled: true, status: 'blocked', lastRunAt: new Date(now - 24*3600000), lastRunStatus: 'success', lastDurationMs: 710000, nextRunAt: nextHour, riskLevel: 'high', createdBy: admin._id, simulationConfig: { successRate: 0.85, baseDurationMs: 720000, variabilityFactor: 0.2 } },
    { name: 'Build Aggregates', jobKey: 'BUILD_AGGREGATES', description: 'Build pre-computed aggregate tables for BI tools.', workflowId: wf3._id, jobType: 'batch', scheduleType: 'cron', schedule: '0 5 * * *', timezone: 'UTC', expectedDurationMs: 360000, timeoutMs: 1800000, retryLimit: 1, retryDelayMs: 120000, criticality: 'medium', isEnabled: true, status: 'blocked', lastRunAt: new Date(now - 24*3600000), lastRunStatus: 'success', lastDurationMs: 355000, nextRunAt: nextHour, riskLevel: 'medium', createdBy: admin._id, simulationConfig: { successRate: 0.9, baseDurationMs: 360000, variabilityFactor: 0.15 } },
  ]);

  const [extractOrders, validateOrders, transformOrders, generateReport, updateWarehouse, finalizeBatch] = jobs1;
  const [reconcileTransactions, aggregateRevenue, generateFinanceReport, archiveTransactions] = jobs2;
  const [dailyBackup, validateBackup, refreshDimensions, refreshFacts, buildAggregates] = jobs3;

  // ─── DEPENDENCIES ─────────────────────────────────────────────────────────
  console.log('Creating dependencies...');
  await Dependency.insertMany([
    // Workflow 1: Order Processing Pipeline
    { workflowId: wf1._id, upstreamJobId: extractOrders._id, downstreamJobId: validateOrders._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf1._id, upstreamJobId: validateOrders._id, downstreamJobId: transformOrders._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf1._id, upstreamJobId: transformOrders._id, downstreamJobId: generateReport._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf1._id, upstreamJobId: transformOrders._id, downstreamJobId: updateWarehouse._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf1._id, upstreamJobId: generateReport._id, downstreamJobId: finalizeBatch._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf1._id, upstreamJobId: updateWarehouse._id, downstreamJobId: finalizeBatch._id, dependencyType: 'required', createdBy: admin._id },
    // Workflow 2: Financial Reconciliation
    { workflowId: wf2._id, upstreamJobId: reconcileTransactions._id, downstreamJobId: aggregateRevenue._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf2._id, upstreamJobId: aggregateRevenue._id, downstreamJobId: generateFinanceReport._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf2._id, upstreamJobId: reconcileTransactions._id, downstreamJobId: archiveTransactions._id, dependencyType: 'optional', createdBy: admin._id },
    // Workflow 3: Data Warehouse Refresh
    { workflowId: wf3._id, upstreamJobId: dailyBackup._id, downstreamJobId: validateBackup._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf3._id, upstreamJobId: validateBackup._id, downstreamJobId: refreshDimensions._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf3._id, upstreamJobId: refreshDimensions._id, downstreamJobId: refreshFacts._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wf3._id, upstreamJobId: refreshFacts._id, downstreamJobId: buildAggregates._id, dependencyType: 'required', createdBy: admin._id },
  ]);

  // ─── EXECUTION HISTORY ────────────────────────────────────────────────────
  console.log('Creating execution history...');
  const allJobs = [...jobs1, ...jobs2, ...jobs3];
  const executions = [];
  const DAYS = 30;

  for (const job of allJobs) {
    for (let day = DAYS; day >= 1; day--) {
      const dateBase = new Date(now - day * 24 * 3600 * 1000);
      const successRate = job.simulationConfig.successRate;
      const baseDuration = job.simulationConfig.baseDurationMs;
      const variability = job.simulationConfig.variabilityFactor;

      for (let run = 0; run < 2; run++) { // 2 runs per day per job
        const startedAt = new Date(dateBase.getTime() + run * 8 * 3600 * 1000 + Math.random() * 600000);
        const willSucceed = Math.random() < successRate;
        const durationMs = Math.max(10000, Math.round(baseDuration * (1 + (Math.random() - 0.5) * 2 * variability)));
        // Inject longer durations for recent runs on TRANSFORM_ORDERS to trigger prediction
        const adjustedDuration = (job.jobKey === 'TRANSFORM_ORDERS' && day <= 5)
          ? Math.round(durationMs * 1.8) : durationMs;
        const completedAt = new Date(startedAt.getTime() + adjustedDuration);
        const status = willSucceed ? 'success' : (Math.random() < 0.3 ? 'timed_out' : 'failed');
        const errorMessages = ['Connection refused', 'Data validation failed', 'Memory limit exceeded', 'Upstream timeout'];

        executions.push({
          jobId: job._id,
          workflowId: job.workflowId,
          status,
          triggerType: run === 0 ? 'scheduled' : (Math.random() < 0.3 ? 'retry' : 'scheduled'),
          attemptNumber: run === 0 ? 1 : 2,
          scheduledAt: startedAt,
          startedAt,
          completedAt,
          durationMs: adjustedDuration,
          errorMessage: status !== 'success' ? errorMessages[Math.floor(Math.random() * errorMessages.length)] : null,
          logs: [
            `[${startedAt.toISOString()}] Job ${job.jobKey} started`,
            status === 'success'
              ? `[${completedAt.toISOString()}] Completed successfully in ${Math.round(adjustedDuration / 1000)}s`
              : `[${completedAt.toISOString()}] FAILED: ${errorMessages[0]}`,
          ],
          createdAt: startedAt,
          updatedAt: completedAt,
        });
      }
    }
  }

  // Add current running execution for RECONCILE_TRANSACTIONS
  executions.push({
    jobId: reconcileTransactions._id,
    workflowId: wf2._id,
    status: 'running',
    triggerType: 'scheduled',
    attemptNumber: 1,
    scheduledAt: new Date(now - 30 * 60 * 1000),
    startedAt: new Date(now - 28 * 60 * 1000),
    logs: [`[${new Date(now - 28*60000).toISOString()}] RECONCILE_TRANSACTIONS started`],
    createdAt: new Date(now - 30 * 60 * 1000),
  });

  await Execution.insertMany(executions);
  console.log(`Created ${executions.length} execution records`);

  // ─── ALERTS ───────────────────────────────────────────────────────────────
  console.log('Creating alerts...');
  await Alert.insertMany([
    {
      jobId: transformOrders._id, workflowId: wf1._id,
      type: 'job_failure', severity: 'critical',
      title: 'Failure: Transform Orders',
      description: 'Job TRANSFORM_ORDERS failed with error: Data validation failed: unexpected null values in column ORDER_ID',
      status: 'open',
      deduplicationKey: `failure:${transformOrders._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now - 3600000),
    },
    {
      jobId: transformOrders._id, workflowId: wf1._id,
      type: 'predicted_delay', severity: 'high',
      title: 'Predicted delay: Transform Orders',
      description: 'Risk detected: TRANSFORM_ORDERS usually takes 4 minutes. Recent execution behavior suggests 7 minutes. This is 75% above baseline.',
      evidence: { sampleCount: 15, baselineMedianMs: 240000, recentAvgMs: 420000, anomalyThresholdMs: 360000, recentFailureRate: 0.3, recentSampleCount: 5 },
      expectedDurationMs: 240000, predictedDurationMs: 420000, baselineDurationMs: 240000,
      status: 'acknowledged',
      acknowledgedBy: operator._id, acknowledgedAt: new Date(now - 1800000),
      deduplicationKey: `predict:${transformOrders._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now - 7200000),
    },
    {
      jobId: refreshDimensions._id, workflowId: wf3._id,
      type: 'execution_timeout', severity: 'high',
      title: 'Timeout: Refresh Dimensions',
      description: 'Job REFRESH_DIMENSIONS exceeded timeout of 30 minutes.',
      status: 'open',
      deduplicationKey: `failure:${refreshDimensions._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now - 4*3600000),
    },
    {
      jobId: aggregateRevenue._id, workflowId: wf2._id,
      type: 'duration_anomaly', severity: 'medium',
      title: 'Duration anomaly: Aggregate Revenue',
      description: 'AGGREGATE_REVENUE ran 50% longer than its historical baseline over the last 5 executions.',
      evidence: { sampleCount: 10, baselineMedianMs: 180000, recentAvgMs: 280000 },
      status: 'resolved',
      resolvedBy: operator._id, resolvedAt: new Date(now - 86400000),
      deduplicationKey: `predict:${aggregateRevenue._id}:${new Date(now - 86400000).toISOString().split('T')[0]}`,
      createdAt: new Date(now - 2*86400000),
    },
    {
      jobId: generateReport._id, workflowId: wf1._id,
      type: 'dependency_failure', severity: 'high',
      title: 'Dependency failure: Generate Report blocked',
      description: 'Job GENERATE_REPORT is blocked because upstream job TRANSFORM_ORDERS failed.',
      status: 'open',
      deduplicationKey: `dep_failure:${generateReport._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now - 2000000),
    },
  ]);

  // ─── AUDIT LOGS ───────────────────────────────────────────────────────────
  console.log('Creating audit logs...');
  await AuditLog.insertMany([
    { actorId: admin._id, actorEmail: 'admin@batchmonitor.dev', actorRole: 'admin', action: 'auth.login', resourceType: 'User', resourceId: admin._id.toString(), timestamp: new Date(now - 86400000 * 7) },
    { actorId: admin._id, actorEmail: 'admin@batchmonitor.dev', actorRole: 'admin', action: 'workflow.create', resourceType: 'Workflow', resourceId: wf1._id.toString(), metadata: { name: 'Order Processing Pipeline' }, timestamp: new Date(now - 86400000 * 6) },
    { actorId: admin._id, actorEmail: 'admin@batchmonitor.dev', actorRole: 'admin', action: 'job.create', resourceType: 'Job', resourceId: extractOrders._id.toString(), metadata: { name: 'Extract Orders' }, timestamp: new Date(now - 86400000 * 6) },
    { actorId: operator._id, actorEmail: 'operator@batchmonitor.dev', actorRole: 'operator', action: 'auth.login', resourceType: 'User', resourceId: operator._id.toString(), timestamp: new Date(now - 86400000) },
    { actorId: operator._id, actorEmail: 'operator@batchmonitor.dev', actorRole: 'operator', action: 'alert.acknowledge', resourceType: 'Alert', timestamp: new Date(now - 1800000), metadata: { alertTitle: 'Predicted delay: Transform Orders' } },
    { actorId: operator._id, actorEmail: 'operator@batchmonitor.dev', actorRole: 'operator', action: 'job.run', resourceType: 'Job', resourceId: transformOrders._id.toString(), metadata: { jobKey: 'TRANSFORM_ORDERS', triggerType: 'manual' }, timestamp: new Date(now - 3600000) },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('  Admin:    admin@batchmonitor.dev    / Admin@1234');
  console.log('  Operator: operator@batchmonitor.dev / Operator@1234');
  console.log('  Viewer:   viewer@batchmonitor.dev   / Viewer@1234');
  console.log('\n📊 Seeded:');
  console.log(`  • 3 users (admin, operator, viewer)`);
  console.log(`  • 3 workflows`);
  console.log(`  • 15 jobs across 3 workflows`);
  console.log(`  • 13 dependency relationships`);
  console.log(`  • ${executions.length} execution history records (30 days)`);
  console.log(`  • 5 alerts (open, acknowledged, resolved)`);
  console.log(`  • 6 audit log entries`);

  await mongoose.disconnect();
}

seed().catch(err => {
  const message = String(err?.message || err).replace(/mongodb(\+srv)?:\/\/[^\s)]+/gi, '[REDACTED_URI]');
  console.error('Seed failed:', message);
  process.exit(1);
});
