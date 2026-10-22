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

const SALT_ROUNDS = 10;

async function seed() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected. Clearing existing collections...');

  await Promise.all([
    User.deleteMany({}),
    Workflow.deleteMany({}),
    Job.deleteMany({}),
    Dependency.deleteMany({}),
    Execution.deleteMany({}),
    Alert.deleteMany({}),
    AuditLog.deleteMany({}),
    MonitoringConfig.deleteMany({}),
  ]);

  // ─── 1. USERS ─────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const adminHash = await bcrypt.hash('Admin@1234', SALT_ROUNDS);
  const opHash = await bcrypt.hash('Operator@1234', SALT_ROUNDS);
  const viewHash = await bcrypt.hash('Viewer@1234', SALT_ROUNDS);

  const users = await User.insertMany([
    { name: 'Admin User', email: 'admin@batchmonitor.dev', passwordHash: adminHash, role: 'admin', isActive: true },
    { name: 'Lead Operator', email: 'operator@batchmonitor.dev', passwordHash: opHash, role: 'operator', isActive: true },
    { name: 'Platform Viewer', email: 'viewer@batchmonitor.dev', passwordHash: viewHash, role: 'viewer', isActive: true },
    { name: 'DataOps Engineer', email: 'dataops@batchmonitor.dev', passwordHash: opHash, role: 'operator', isActive: true },
    { name: 'Compliance Auditor', email: 'auditor@batchmonitor.dev', passwordHash: viewHash, role: 'viewer', isActive: true },
  ]);
  const [admin, operator, viewer, dataops, auditor] = users;

  // ─── 2. MONITORING CONFIG ─────────────────────────────────────────────────
  console.log('Configuring monitoring parameters...');
  await MonitoringConfig.create({
    singleton: true,
    prediction: {
      enabled: true,
      minSamples: 5,
      anomalyMultiplier: 1.5,
      lookbackDays: 30,
    },
    scheduler: {
      enabled: true,
      intervalMs: 60000,
      maxConcurrentJobs: 8,
    },
    alerts: {
      deduplicationWindowMs: 3600000,
      criticalRetentionDays: 90,
      defaultRetentionDays: 30,
    },
    thresholds: {
      durationAnomalyPercent: 50,
      failureRateWarning: 0.15,
      failureRateCritical: 0.40,
    },
    updatedBy: admin._id,
  });

  // ─── 3. WORKFLOWS ─────────────────────────────────────────────────────────
  console.log('Creating enterprise workflows...');
  const workflows = await Workflow.insertMany([
    {
      name: 'Global Order Fulfillment & Clearing',
      description: 'End-to-end checkout event stream ingestion, fraud scoring, payment settlement, inventory locking, and carrier manifest generation.',
      criticality: 'critical',
      isEnabled: true,
      createdBy: admin._id,
      tags: ['ecommerce', 'orders', 'payments', 'pci-dss'],
    },
    {
      name: 'Core Banking & Ledger Settlement',
      description: 'Overnight interbank settlement (ACH, FedNow, SWIFT), interest accrual calculations, AML sanction scans, and general ledger balancing.',
      criticality: 'critical',
      isEnabled: true,
      createdBy: admin._id,
      tags: ['banking', 'clearing', 'sox-compliance', 'finance'],
    },
    {
      name: 'Healthcare Records & Claims Processing',
      description: 'Daily ingestion of HL7 clinical encounters, HIPAA PII de-identification, insurance eligibility checks, and claims adjudication.',
      criticality: 'high',
      isEnabled: true,
      createdBy: admin._id,
      tags: ['healthcare', 'hipaa', 'claims', 'insurance'],
    },
    {
      name: 'Lakehouse & AI Feature Store Pipeline',
      description: 'Compaction of raw Kafka stream partitions into Delta tables, ML customer feature generation, and churn propensity inference.',
      criticality: 'high',
      isEnabled: true,
      createdBy: admin._id,
      tags: ['lakehouse', 'spark', 'mlops', 'feature-store'],
    },
    {
      name: 'Fleet Logistics & Telematics Optimization',
      description: 'Periodic GPS IoT telemetry polling, thermal sensor anomaly detection, dynamic route optimization, and driver safety scorecards.',
      criticality: 'medium',
      isEnabled: true,
      createdBy: admin._id,
      tags: ['iot', 'logistics', 'fleet', 'telematics'],
    },
  ]);
  const [wfFulfillment, wfBanking, wfHealthcare, wfLakehouse, wfLogistics] = workflows;

  const now = new Date();
  const nextHour = (mins = 60) => new Date(now.getTime() + mins * 60 * 1000);

  // ─── 4. JOBS ──────────────────────────────────────────────────────────────
  console.log('Creating job definitions...');

  // Workflow 1: Global Order Fulfillment
  const jobsFulfillment = await Job.insertMany([
    {
      name: 'Extract Orders Stream',
      jobKey: 'EXTRACT_ORDERS_STREAM',
      description: 'Ingest raw cart and checkout transactions from Apache Kafka topic [orders.checkout.v1].',
      workflowId: wfFulfillment._id,
      jobType: 'etl',
      scheduleType: 'cron',
      schedule: '0 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 75000,
      timeoutMs: 300000,
      retryLimit: 3,
      retryDelayMs: 30000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 15 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 72000,
      nextRunAt: nextHour(45),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.96, baseDurationMs: 75000, variabilityFactor: 0.12 },
    },
    {
      name: 'Fraud & AML Risk Scoring',
      jobKey: 'FRAUD_RISK_SCORING',
      description: 'Execute ML scoring model on order velocity, billing address match, and blacklisted device fingerprints.',
      workflowId: wfFulfillment._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '15 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 45000,
      timeoutMs: 180000,
      retryLimit: 2,
      retryDelayMs: 20000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 12 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 44000,
      nextRunAt: nextHour(48),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.94, baseDurationMs: 45000, variabilityFactor: 0.15 },
    },
    {
      name: 'Payment Gateway Settlement',
      jobKey: 'PAYMENT_SETTLEMENT',
      description: 'Transmit authorized payment batches to Stripe & Adyen capture gateways.',
      workflowId: wfFulfillment._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '30 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 180000,
      timeoutMs: 600000,
      retryLimit: 3,
      retryDelayMs: 60000,
      criticality: 'critical',
      isEnabled: true,
      status: 'failed',
      lastRunAt: new Date(now.getTime() - 8 * 60000),
      lastRunStatus: 'failed',
      lastDurationMs: 285000,
      nextRunAt: nextHour(52),
      riskLevel: 'critical',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.72, baseDurationMs: 180000, variabilityFactor: 0.35 },
    },
    {
      name: 'Inventory Allocation & Lock',
      jobKey: 'INVENTORY_ALLOCATION',
      description: 'Reserve warehouse SKU inventory and emit low-stock replenishment webhooks.',
      workflowId: wfFulfillment._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '30 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 60000,
      timeoutMs: 240000,
      retryLimit: 2,
      retryDelayMs: 30000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 10 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 58000,
      nextRunAt: nextHour(50),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.92, baseDurationMs: 60000, variabilityFactor: 0.18 },
    },
    {
      name: 'Carrier Manifest Generator',
      jobKey: 'CARRIER_MANIFEST_GEN',
      description: 'Compile FedEx/UPS packaging manifests and dispatch packing slips to fulfillment centers.',
      workflowId: wfFulfillment._id,
      jobType: 'report',
      scheduleType: 'cron',
      schedule: '45 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 110000,
      timeoutMs: 400000,
      retryLimit: 2,
      retryDelayMs: 45000,
      criticality: 'high',
      isEnabled: true,
      status: 'blocked',
      lastRunAt: new Date(now.getTime() - 68 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 108000,
      nextRunAt: nextHour(55),
      riskLevel: 'critical',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.91, baseDurationMs: 110000, variabilityFactor: 0.2 },
    },
    {
      name: 'Customer Notification Dispatch',
      jobKey: 'CUSTOMER_NOTIFY_DISPATCH',
      description: 'Send order confirmation SMS and push notifications via Twilio & Firebase.',
      workflowId: wfFulfillment._id,
      jobType: 'notification',
      scheduleType: 'cron',
      schedule: '50 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 30000,
      timeoutMs: 120000,
      retryLimit: 1,
      retryDelayMs: 15000,
      criticality: 'medium',
      isEnabled: true,
      status: 'blocked',
      lastRunAt: new Date(now.getTime() - 65 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 29000,
      nextRunAt: nextHour(58),
      riskLevel: 'high',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.97, baseDurationMs: 30000, variabilityFactor: 0.08 },
    },
  ]);

  // Workflow 2: Core Banking
  const jobsBanking = await Job.insertMany([
    {
      name: 'Midnight General Ledger Snapshot',
      jobKey: 'GL_SNAPSHOT_MIDNIGHT',
      description: 'Consistent multi-region replica snapshot of ledger database prior to EOD batch cycle.',
      workflowId: wfBanking._id,
      jobType: 'backup',
      scheduleType: 'cron',
      schedule: '0 0 * * *',
      timezone: 'UTC',
      expectedDurationMs: 450000,
      timeoutMs: 1800000,
      retryLimit: 2,
      retryDelayMs: 180000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 6 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 440000,
      nextRunAt: nextHour(120),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.98, baseDurationMs: 450000, variabilityFactor: 0.08 },
    },
    {
      name: 'Ingest ACH & FedNow Batches',
      jobKey: 'INGEST_ACH_BATCHES',
      description: 'Ingest NACHA formatted settlement files from the Federal Reserve & Clearing House.',
      workflowId: wfBanking._id,
      jobType: 'etl',
      scheduleType: 'cron',
      schedule: '0 1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 240000,
      timeoutMs: 900000,
      retryLimit: 3,
      retryDelayMs: 60000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 5 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 238000,
      nextRunAt: nextHour(130),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.95, baseDurationMs: 240000, variabilityFactor: 0.15 },
    },
    {
      name: 'Deposit & Loan Interest Accrual',
      jobKey: 'INTEREST_ACCRUAL_CALC',
      description: 'Daily compound interest calculation across active checking, savings, and term credit facilities.',
      workflowId: wfBanking._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 2 * * *',
      timezone: 'UTC',
      expectedDurationMs: 320000,
      timeoutMs: 1200000,
      retryLimit: 2,
      retryDelayMs: 90000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 4 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 310000,
      nextRunAt: nextHour(140),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.93, baseDurationMs: 320000, variabilityFactor: 0.12 },
    },
    {
      name: 'AML Sanction & FinCEN Screening',
      jobKey: 'AML_SANCTION_SCREENING',
      description: 'Screen all counterparty accounts against OFAC, PEP, and international sanctions watchlists.',
      workflowId: wfBanking._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 3 * * *',
      timezone: 'UTC',
      expectedDurationMs: 360000,
      timeoutMs: 1500000,
      retryLimit: 2,
      retryDelayMs: 120000,
      criticality: 'critical',
      isEnabled: true,
      status: 'running',
      lastRunAt: new Date(now.getTime() - 14 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 350000,
      nextRunAt: nextHour(150),
      riskLevel: 'medium',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.92, baseDurationMs: 360000, variabilityFactor: 0.2 },
    },
    {
      name: 'General Ledger Balancing & Audit',
      jobKey: 'GL_BALANCING_AUDIT',
      description: 'Double-entry debit/credit ledger validation with zero-variance balance verification.',
      workflowId: wfBanking._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 290000,
      timeoutMs: 1200000,
      retryLimit: 2,
      retryDelayMs: 60000,
      criticality: 'critical',
      isEnabled: true,
      status: 'pending',
      lastRunAt: new Date(now.getTime() - 24 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 288000,
      nextRunAt: nextHour(30),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.96, baseDurationMs: 290000, variabilityFactor: 0.1 },
    },
    {
      name: 'CFO Regulatory Liquidity Report',
      jobKey: 'CFO_REGULATORY_REPORT',
      description: 'Compile Basel III liquidity coverage ratio (LCR) and intraday exposure reports for treasury.',
      workflowId: wfBanking._id,
      jobType: 'report',
      scheduleType: 'cron',
      schedule: '0 5 * * *',
      timezone: 'UTC',
      expectedDurationMs: 140000,
      timeoutMs: 600000,
      retryLimit: 1,
      retryDelayMs: 30000,
      criticality: 'high',
      isEnabled: true,
      status: 'pending',
      lastRunAt: new Date(now.getTime() - 24 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 135000,
      nextRunAt: nextHour(40),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.97, baseDurationMs: 140000, variabilityFactor: 0.1 },
    },
  ]);

  // Workflow 3: Healthcare Claims
  const jobsHealthcare = await Job.insertMany([
    {
      name: 'Ingest Clinical HL7/FHIR Feed',
      jobKey: 'INGEST_HL7_FEED',
      description: 'Extract electronic medical records (EMR) encounter events from Epic/Cerner hospital bridges.',
      workflowId: wfHealthcare._id,
      jobType: 'etl',
      scheduleType: 'cron',
      schedule: '0 */4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 150000,
      timeoutMs: 600000,
      retryLimit: 2,
      retryDelayMs: 60000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 45 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 148000,
      nextRunAt: nextHour(195),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.95, baseDurationMs: 150000, variabilityFactor: 0.15 },
    },
    {
      name: 'HIPAA PII De-identification',
      jobKey: 'HIPAA_DEIDENTIFICATION',
      description: 'Cryptographically tokenize patient names, SSNs, and birth dates using SHA-256 HMAC salts.',
      workflowId: wfHealthcare._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '15 */4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 95000,
      timeoutMs: 400000,
      retryLimit: 2,
      retryDelayMs: 30000,
      criticality: 'critical',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 42 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 91000,
      nextRunAt: nextHour(198),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.98, baseDurationMs: 95000, variabilityFactor: 0.1 },
    },
    {
      name: 'Insurer Policy Eligibility Check',
      jobKey: 'POLICY_ELIGIBILITY_CHECK',
      description: 'Validate active deductibles and co-insurance benefits via X12 270/271 real-time gateway.',
      workflowId: wfHealthcare._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '30 */4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 130000,
      timeoutMs: 500000,
      retryLimit: 2,
      retryDelayMs: 45000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 38 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 126000,
      nextRunAt: nextHour(202),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.93, baseDurationMs: 130000, variabilityFactor: 0.2 },
    },
    {
      name: 'Claims Adjudication Engine',
      jobKey: 'CLAIMS_ADJUDICATION_ENGINE',
      description: 'Auto-adjudicate dental, medical, and pharmacy claims against standardized ICD-10 medical necessity rules.',
      workflowId: wfHealthcare._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '45 */4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 220000,
      timeoutMs: 900000,
      retryLimit: 2,
      retryDelayMs: 60000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 32 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 215000,
      nextRunAt: nextHour(208),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.91, baseDurationMs: 220000, variabilityFactor: 0.25 },
    },
    {
      name: 'Provider Remittance Advice (ERA)',
      jobKey: 'PROVIDER_REMITTANCE_ERA',
      description: 'Generate standard ANSI 835 payment files and remittance advice notices for hospitals.',
      workflowId: wfHealthcare._id,
      jobType: 'report',
      scheduleType: 'cron',
      schedule: '0 */4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 65000,
      timeoutMs: 240000,
      retryLimit: 1,
      retryDelayMs: 20000,
      criticality: 'medium',
      isEnabled: true,
      status: 'pending',
      lastRunAt: new Date(now.getTime() - 4 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 62000,
      nextRunAt: nextHour(15),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.97, baseDurationMs: 65000, variabilityFactor: 0.12 },
    },
  ]);

  // Workflow 4: Lakehouse & AI Feature Store
  const jobsLakehouse = await Job.insertMany([
    {
      name: 'Kafka Stream Partition Compaction',
      jobKey: 'KAFKA_STREAM_COMPACTION',
      description: 'Compact JSON micro-batches into snappy-compressed Parquet tables in AWS S3 bronze bucket.',
      workflowId: wfLakehouse._id,
      jobType: 'etl',
      scheduleType: 'cron',
      schedule: '*/30 * * * *',
      timezone: 'UTC',
      expectedDurationMs: 85000,
      timeoutMs: 360000,
      retryLimit: 2,
      retryDelayMs: 30000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 18 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 82000,
      nextRunAt: nextHour(12),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.94, baseDurationMs: 85000, variabilityFactor: 0.15 },
    },
    {
      name: 'Delta Vacuum & Z-Order Clustering',
      jobKey: 'DELTA_VACUUM_OPTIMIZE',
      description: 'Run Delta Lake VACUUM retention cleanups and Z-ORDER multi-dimensional colocation on user_id.',
      workflowId: wfLakehouse._id,
      jobType: 'cleanup',
      scheduleType: 'cron',
      schedule: '0 2 * * *',
      timezone: 'UTC',
      expectedDurationMs: 540000,
      timeoutMs: 2400000,
      retryLimit: 1,
      retryDelayMs: 300000,
      criticality: 'medium',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 8 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 530000,
      nextRunAt: nextHour(180),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.97, baseDurationMs: 540000, variabilityFactor: 0.1 },
    },
    {
      name: 'Customer 360 Feature Aggregation',
      jobKey: 'FEATURE_STORE_REFRESH',
      description: 'Compute 7-day and 30-day rolling purchase aggregates and update Redis online feature store.',
      workflowId: wfLakehouse._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 */2 * * *',
      timezone: 'UTC',
      expectedDurationMs: 230000,
      timeoutMs: 900000,
      retryLimit: 2,
      retryDelayMs: 60000,
      criticality: 'high',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 22 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 224000,
      nextRunAt: nextHour(38),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.92, baseDurationMs: 230000, variabilityFactor: 0.2 },
    },
    {
      name: 'Churn Propensity Scoring Model',
      jobKey: 'CHURN_PROPENSITY_SCORING',
      description: 'XGBoost distributed batch inference to tag accounts with >65% risk of 30-day platform churn.',
      workflowId: wfLakehouse._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 4 * * *',
      timezone: 'UTC',
      expectedDurationMs: 420000,
      timeoutMs: 1800000,
      retryLimit: 2,
      retryDelayMs: 120000,
      criticality: 'medium',
      isEnabled: true,
      status: 'timed_out',
      lastRunAt: new Date(now.getTime() - 2 * 3600000),
      lastRunStatus: 'timed_out',
      lastDurationMs: 1840000,
      nextRunAt: nextHour(60),
      riskLevel: 'critical',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.78, baseDurationMs: 420000, variabilityFactor: 0.4 },
    },
    {
      name: 'Executive Datamart Refresh',
      jobKey: 'BI_DATAMART_REFRESH',
      description: 'Materialize aggregated dimensional fact views for Looker and Tableau analytical dashboards.',
      workflowId: wfLakehouse._id,
      jobType: 'report',
      scheduleType: 'cron',
      schedule: '0 5 * * *',
      timezone: 'UTC',
      expectedDurationMs: 190000,
      timeoutMs: 720000,
      retryLimit: 1,
      retryDelayMs: 60000,
      criticality: 'medium',
      isEnabled: true,
      status: 'blocked',
      lastRunAt: new Date(now.getTime() - 24 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 185000,
      nextRunAt: nextHour(45),
      riskLevel: 'high',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.94, baseDurationMs: 190000, variabilityFactor: 0.15 },
    },
  ]);

  // Workflow 5: Fleet Logistics
  const jobsLogistics = await Job.insertMany([
    {
      name: 'Poll Fleet GPS Telematics',
      jobKey: 'POLL_FLEET_GPS',
      description: 'Poll cellular telematics gateways for truck GPS coordinates, odometer readings, and speed logs.',
      workflowId: wfLogistics._id,
      jobType: 'sync',
      scheduleType: 'cron',
      schedule: '*/15 * * * *',
      timezone: 'UTC',
      expectedDurationMs: 38000,
      timeoutMs: 150000,
      retryLimit: 2,
      retryDelayMs: 15000,
      criticality: 'medium',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 6 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 36000,
      nextRunAt: nextHour(9),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.97, baseDurationMs: 38000, variabilityFactor: 0.1 },
    },
    {
      name: 'Geofence & Thermal Anomaly Detection',
      jobKey: 'GEOFENCE_ANOMALY_DETECTOR',
      description: 'Detect unauthorized route deviations and refrigerated trailer temperature threshold spikes.',
      workflowId: wfLogistics._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '*/30 * * * *',
      timezone: 'UTC',
      expectedDurationMs: 55000,
      timeoutMs: 200000,
      retryLimit: 1,
      retryDelayMs: 20000,
      criticality: 'high',
      isEnabled: true,
      status: 'running',
      lastRunAt: new Date(now.getTime() - 4 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 52000,
      nextRunAt: nextHour(26),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.95, baseDurationMs: 55000, variabilityFactor: 0.15 },
    },
    {
      name: 'Dynamic Route Optimizer',
      jobKey: 'DYNAMIC_ROUTE_OPTIMIZER',
      description: 'Recalculate multi-drop delivery dispatch routes with live weather and highway traffic data.',
      workflowId: wfLogistics._id,
      jobType: 'batch',
      scheduleType: 'cron',
      schedule: '0 */1 * * *',
      timezone: 'UTC',
      expectedDurationMs: 115000,
      timeoutMs: 450000,
      retryLimit: 2,
      retryDelayMs: 30000,
      criticality: 'medium',
      isEnabled: true,
      status: 'success',
      lastRunAt: new Date(now.getTime() - 35 * 60000),
      lastRunStatus: 'success',
      lastDurationMs: 112000,
      nextRunAt: nextHour(25),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.91, baseDurationMs: 115000, variabilityFactor: 0.2 },
    },
    {
      name: 'Daily Driver Safety Scorecard',
      jobKey: 'DRIVER_SCORECARD_DAILY',
      description: 'Aggregate harsh braking, speeding, and idle time into driver safety compliance scorecards.',
      workflowId: wfLogistics._id,
      jobType: 'report',
      scheduleType: 'cron',
      schedule: '0 22 * * *',
      timezone: 'UTC',
      expectedDurationMs: 85000,
      timeoutMs: 300000,
      retryLimit: 1,
      retryDelayMs: 30000,
      criticality: 'low',
      isEnabled: true,
      status: 'pending',
      lastRunAt: new Date(now.getTime() - 22 * 3600000),
      lastRunStatus: 'success',
      lastDurationMs: 81000,
      nextRunAt: nextHour(120),
      riskLevel: 'low',
      createdBy: admin._id,
      simulationConfig: { successRate: 0.98, baseDurationMs: 85000, variabilityFactor: 0.08 },
    },
  ]);

  const allJobs = [
    ...jobsFulfillment,
    ...jobsBanking,
    ...jobsHealthcare,
    ...jobsLakehouse,
    ...jobsLogistics,
  ];

  const jobsByKey = {};
  for (const j of allJobs) jobsByKey[j.jobKey] = j;

  // ─── 5. DEPENDENCIES ──────────────────────────────────────────────────────
  console.log('Creating DAG dependency graphs...');
  await Dependency.insertMany([
    // WF 1: Global Fulfillment
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.EXTRACT_ORDERS_STREAM._id, downstreamJobId: jobsByKey.FRAUD_RISK_SCORING._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.FRAUD_RISK_SCORING._id, downstreamJobId: jobsByKey.PAYMENT_SETTLEMENT._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.FRAUD_RISK_SCORING._id, downstreamJobId: jobsByKey.INVENTORY_ALLOCATION._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.PAYMENT_SETTLEMENT._id, downstreamJobId: jobsByKey.CARRIER_MANIFEST_GEN._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.INVENTORY_ALLOCATION._id, downstreamJobId: jobsByKey.CARRIER_MANIFEST_GEN._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfFulfillment._id, upstreamJobId: jobsByKey.CARRIER_MANIFEST_GEN._id, downstreamJobId: jobsByKey.CUSTOMER_NOTIFY_DISPATCH._id, dependencyType: 'required', createdBy: admin._id },

    // WF 2: Core Banking
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.GL_SNAPSHOT_MIDNIGHT._id, downstreamJobId: jobsByKey.INGEST_ACH_BATCHES._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.INGEST_ACH_BATCHES._id, downstreamJobId: jobsByKey.INTEREST_ACCRUAL_CALC._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.INGEST_ACH_BATCHES._id, downstreamJobId: jobsByKey.AML_SANCTION_SCREENING._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.INTEREST_ACCRUAL_CALC._id, downstreamJobId: jobsByKey.GL_BALANCING_AUDIT._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.GL_BALANCING_AUDIT._id, downstreamJobId: jobsByKey.CFO_REGULATORY_REPORT._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfBanking._id, upstreamJobId: jobsByKey.AML_SANCTION_SCREENING._id, downstreamJobId: jobsByKey.CFO_REGULATORY_REPORT._id, dependencyType: 'optional', createdBy: admin._id },

    // WF 3: Healthcare Claims
    { workflowId: wfHealthcare._id, upstreamJobId: jobsByKey.INGEST_HL7_FEED._id, downstreamJobId: jobsByKey.HIPAA_DEIDENTIFICATION._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfHealthcare._id, upstreamJobId: jobsByKey.HIPAA_DEIDENTIFICATION._id, downstreamJobId: jobsByKey.POLICY_ELIGIBILITY_CHECK._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfHealthcare._id, upstreamJobId: jobsByKey.POLICY_ELIGIBILITY_CHECK._id, downstreamJobId: jobsByKey.CLAIMS_ADJUDICATION_ENGINE._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfHealthcare._id, upstreamJobId: jobsByKey.CLAIMS_ADJUDICATION_ENGINE._id, downstreamJobId: jobsByKey.PROVIDER_REMITTANCE_ERA._id, dependencyType: 'required', createdBy: admin._id },

    // WF 4: Lakehouse & AI
    { workflowId: wfLakehouse._id, upstreamJobId: jobsByKey.KAFKA_STREAM_COMPACTION._id, downstreamJobId: jobsByKey.FEATURE_STORE_REFRESH._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfLakehouse._id, upstreamJobId: jobsByKey.DELTA_VACUUM_OPTIMIZE._id, downstreamJobId: jobsByKey.FEATURE_STORE_REFRESH._id, dependencyType: 'optional', createdBy: admin._id },
    { workflowId: wfLakehouse._id, upstreamJobId: jobsByKey.FEATURE_STORE_REFRESH._id, downstreamJobId: jobsByKey.CHURN_PROPENSITY_SCORING._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfLakehouse._id, upstreamJobId: jobsByKey.FEATURE_STORE_REFRESH._id, downstreamJobId: jobsByKey.BI_DATAMART_REFRESH._id, dependencyType: 'required', createdBy: admin._id },

    // WF 5: Fleet Logistics
    { workflowId: wfLogistics._id, upstreamJobId: jobsByKey.POLL_FLEET_GPS._id, downstreamJobId: jobsByKey.GEOFENCE_ANOMALY_DETECTOR._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfLogistics._id, upstreamJobId: jobsByKey.GEOFENCE_ANOMALY_DETECTOR._id, downstreamJobId: jobsByKey.DYNAMIC_ROUTE_OPTIMIZER._id, dependencyType: 'required', createdBy: admin._id },
    { workflowId: wfLogistics._id, upstreamJobId: jobsByKey.DYNAMIC_ROUTE_OPTIMIZER._id, downstreamJobId: jobsByKey.DRIVER_SCORECARD_DAILY._id, dependencyType: 'required', createdBy: admin._id },
  ]);

  // ─── 6. EXECUTION HISTORY ─────────────────────────────────────────────────
  console.log('Generating realistic 30-day execution history with heavy recent activity...');
  const executions = [];
  const DAYS = 30;

  const realisticErrors = {
    PAYMENT_SETTLEMENT: [
      'Stripe Gateway HTTP 504 Gateway Timeout connecting to /v1/charges/capture',
      'Database deadlock detected on table [settlement_ledger] during batch commit #842',
      'Rate limit exceeded on payment processor API: 429 Too Many Requests',
    ],
    CHURN_PROPENSITY_SCORING: [
      'Job exceeded timeout of 30 minutes during XGBoost distributed tree construction',
      'Spark Worker Node OutOfMemory: Java heap space exceeded in executor container worker-04b',
      'Storage volume IOPS throttled on AWS EBS gp3 volume attach points',
    ],
    FRAUD_RISK_SCORING: [
      'GeoIP MaxMind database lookup timeout on cluster replica node #2',
      'Invalid JSON payload in Kafka stream partition 12 at offset 849201',
    ],
    EXTRACT_ORDERS_STREAM: [
      'Kafka consumer group rebalance in progress; partition revoked',
      'Upstream Postgres read replica replication lag exceeded threshold (35s > 10s)',
    ],
    default: [
      'Connection refused to upstream internal RPC endpoint',
      'Data contract schema validation error: unexpected null in non-nullable column',
      'Transient network timeout connecting to Redis cluster node',
      'Disk write buffer pool allocation failed on temporary scratch directory',
    ],
  };

  const generateLogs = (job, status, attempt, startedAt, completedAt, durationMs, errorMsg) => {
    const sIso = startedAt.toISOString();
    const cIso = completedAt.toISOString();
    const sec = Math.round(durationMs / 1000);

    if (status === 'success') {
      return [
        `[${sIso}] [INFO] Starting execution for job ${job.jobKey} (Attempt ${attempt}) on worker host [batch-worker-${(Math.floor(Math.random() * 8) + 1).toString().padStart(2, '0')}]`,
        `[${new Date(startedAt.getTime() + 4000).toISOString()}] [INFO] Initialized configuration profile; acquired lock on resources`,
        `[${new Date(startedAt.getTime() + Math.min(durationMs * 0.4, 25000)).toISOString()}] [INFO] Processed input stream: ${Math.floor(Math.random() * 30000 + 10000).toLocaleString()} records validated`,
        `[${new Date(startedAt.getTime() + Math.min(durationMs * 0.8, 50000)).toISOString()}] [INFO] Checkpoint passed; no anomalies or data contract violations detected`,
        `[${cIso}] [INFO] Job ${job.jobKey} finished successfully in ${sec}s (Exit code 0)`,
      ];
    } else if (status === 'timed_out') {
      return [
        `[${sIso}] [INFO] Starting execution for job ${job.jobKey} (Attempt ${attempt})`,
        `[${new Date(startedAt.getTime() + 10000).toISOString()}] [INFO] Ingestion phase started across worker threads`,
        `[${new Date(startedAt.getTime() + durationMs * 0.5).toISOString()}] [WARN] Execution time approaching SLA warning threshold`,
        `[${cIso}] [ERROR] Task exceeded maximum allocated timeout (${Math.round(job.timeoutMs / 60000)} minutes). Forcibly sending SIGKILL to worker process`,
        `[${cIso}] [FATAL] Job ${job.jobKey} TIMED OUT after ${sec}s`,
      ];
    } else {
      return [
        `[${sIso}] [INFO] Starting execution for job ${job.jobKey} (Attempt ${attempt})`,
        `[${new Date(startedAt.getTime() + 5000).toISOString()}] [INFO] Initialized connection to dependent subsystem`,
        `[${new Date(startedAt.getTime() + Math.min(durationMs * 0.6, 20000)).toISOString()}] [WARN] Degraded response received from upstream provider`,
        `[${cIso}] [ERROR] Critical execution failure: ${errorMsg}`,
        `[${cIso}] [FATAL] Stack Trace:\n    at BatchExecutor.runStep (/app/services/executor.js:214:15)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
      ];
    }
  };

  for (const job of allJobs) {
    const sim = job.simulationConfig || { successRate: 0.92, baseDurationMs: 120000, variabilityFactor: 0.2 };
    const successRate = sim.successRate;
    const baseDuration = sim.baseDurationMs || job.expectedDurationMs;
    const variability = sim.variabilityFactor || 0.2;

    const isHighFreq = job.schedule.includes('*/1') || job.schedule.includes('*/15') || job.schedule.includes('*/30');
    const runsPerDay = isHighFreq ? 4 : 2;

    for (let day = DAYS; day >= 0; day--) {
      const dayBase = new Date(now.getTime() - day * 24 * 3600 * 1000);

      for (let r = 0; r < runsPerDay; r++) {
        const hoursOffset = (24 / runsPerDay) * r + (Math.random() * 2 - 1);
        const startedAt = new Date(dayBase.getTime() + hoursOffset * 3600 * 1000);

        if (startedAt > new Date(now.getTime() - 5 * 60000)) continue;

        const isPaymentAnomaly = (job.jobKey === 'PAYMENT_SETTLEMENT' && day <= 5);
        const isChurnAnomaly = (job.jobKey === 'CHURN_PROPENSITY_SCORING' && day <= 3);

        const durationMultiplier = isPaymentAnomaly ? 1.75 : (isChurnAnomaly ? 1.9 : (1 + (Math.random() - 0.5) * 2 * variability));
        const durationMs = Math.max(8000, Math.round(baseDuration * durationMultiplier));
        const completedAt = new Date(startedAt.getTime() + durationMs);

        let willSucceed = Math.random() < successRate;
        if (isPaymentAnomaly && day === 0 && r === runsPerDay - 1) willSucceed = false;
        if (isChurnAnomaly && day === 0) willSucceed = false;

        let status = 'success';
        let errorMsg = null;
        let attempt = 1;

        if (!willSucceed) {
          const isTimeout = (job.jobKey === 'CHURN_PROPENSITY_SCORING') || (Math.random() < 0.25);
          status = isTimeout ? 'timed_out' : 'failed';
          const errList = realisticErrors[job.jobKey] || realisticErrors.default;
          errorMsg = errList[Math.floor(Math.random() * errList.length)];
          attempt = Math.random() < 0.35 ? 2 : 1;
        }

        const logs = generateLogs(job, status, attempt, startedAt, completedAt, durationMs, errorMsg);

        executions.push({
          jobId: job._id,
          workflowId: job.workflowId,
          status,
          triggerType: attempt > 1 ? 'retry' : 'scheduled',
          attemptNumber: attempt,
          scheduledAt: startedAt,
          startedAt,
          completedAt,
          durationMs,
          errorMessage: errorMsg,
          logs,
          createdAt: startedAt,
          updatedAt: completedAt,
        });
      }
    }
  }

  // Add currently RUNNING executions
  const runningJobs = [jobsByKey.AML_SANCTION_SCREENING, jobsByKey.GEOFENCE_ANOMALY_DETECTOR];
  for (const rJob of runningJobs) {
    const startedAt = new Date(now.getTime() - (Math.floor(Math.random() * 8) + 3) * 60000);
    executions.push({
      jobId: rJob._id,
      workflowId: rJob.workflowId,
      status: 'running',
      triggerType: 'scheduled',
      attemptNumber: 1,
      scheduledAt: new Date(startedAt.getTime() - 60000),
      startedAt,
      logs: [
        `[${startedAt.toISOString()}] [INFO] Initialized runtime container for ${rJob.jobKey}`,
        `[${new Date(startedAt.getTime() + 2000).toISOString()}] [INFO] Ingesting real-time transactional partition stream...`,
        `[${new Date(now.getTime() - 60000).toISOString()}] [INFO] Active processing thread alive; checkpointing intermediate batches`,
      ],
      createdAt: startedAt,
      updatedAt: now,
    });
  }

  console.log(`Inserting ${executions.length} historical execution records...`);
  await Execution.insertMany(executions);

  // ─── 7. ALERTS ────────────────────────────────────────────────────────────
  console.log('Creating intelligent alerts with explainable statistical prediction evidence...');
  const alerts = await Alert.insertMany([
    {
      jobId: jobsByKey.PAYMENT_SETTLEMENT._id,
      workflowId: wfFulfillment._id,
      type: 'job_failure',
      severity: 'critical',
      title: 'Payment Gateway Settlement: Gateway Timeout & Deadlock',
      description: 'Job PAYMENT_SETTLEMENT failed on attempt 3. Stripe Gateway returned HTTP 504 Gateway Timeout while capturing batch #48102. Downstream carrier manifest jobs are blocked.',
      status: 'open',
      deduplicationKey: `fail:${jobsByKey.PAYMENT_SETTLEMENT._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 8 * 60000),
    },
    {
      jobId: jobsByKey.PAYMENT_SETTLEMENT._id,
      workflowId: wfFulfillment._id,
      type: 'predicted_delay',
      severity: 'high',
      title: 'Predicted SLA Breach: Payment Gateway Settlement',
      description: 'Execution behavior anomaly detected. PAYMENT_SETTLEMENT historical baseline median is 3.0m (180s). Recent runs average 5.2m (315s), representing a 75% duration surge above baseline.',
      evidence: {
        sampleCount: 38,
        baselineMedianMs: 180000,
        recentAvgMs: 315000,
        anomalyThresholdMs: 270000,
        iqrMs: 38000,
        p95Ms: 245000,
        recentFailureRate: 0.28,
        recentSampleCount: 5,
        recommendation: 'Inspect database connection pool contention and upstream payment gateway latency metrics.',
      },
      expectedDurationMs: 180000,
      predictedDurationMs: 315000,
      baselineDurationMs: 180000,
      status: 'acknowledged',
      acknowledgedBy: operator._id,
      acknowledgedAt: new Date(now.getTime() - 25 * 60000),
      deduplicationKey: `predict:${jobsByKey.PAYMENT_SETTLEMENT._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 40 * 60000),
    },
    {
      jobId: jobsByKey.CARRIER_MANIFEST_GEN._id,
      workflowId: wfFulfillment._id,
      type: 'dependency_failure',
      severity: 'high',
      title: 'Dependency Blocked: Carrier Manifest Generator',
      description: 'CARRIER_MANIFEST_GEN cannot start because critical upstream parent PAYMENT_SETTLEMENT failed.',
      status: 'open',
      deduplicationKey: `dep:${jobsByKey.CARRIER_MANIFEST_GEN._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 7 * 60000),
    },
    {
      jobId: jobsByKey.CUSTOMER_NOTIFY_DISPATCH._id,
      workflowId: wfFulfillment._id,
      type: 'dependency_failure',
      severity: 'medium',
      title: 'Dependency Cascading Block: Customer Notification Dispatch',
      description: 'CUSTOMER_NOTIFY_DISPATCH is blocked due to transitive failure in upstream chain (PAYMENT_SETTLEMENT → CARRIER_MANIFEST_GEN).',
      status: 'open',
      deduplicationKey: `dep:${jobsByKey.CUSTOMER_NOTIFY_DISPATCH._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 6 * 60000),
    },
    {
      jobId: jobsByKey.CHURN_PROPENSITY_SCORING._id,
      workflowId: wfLakehouse._id,
      type: 'execution_timeout',
      severity: 'critical',
      title: 'Timeout Exceeded: Churn Propensity Scoring Model',
      description: 'CHURN_PROPENSITY_SCORING exceeded its maximum 30-minute operational SLA threshold. Distributed tree building stalled on Spark executor 04b.',
      status: 'open',
      deduplicationKey: `timeout:${jobsByKey.CHURN_PROPENSITY_SCORING._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 2 * 3600000),
    },
    {
      jobId: jobsByKey.BI_DATAMART_REFRESH._id,
      workflowId: wfLakehouse._id,
      type: 'dependency_failure',
      severity: 'medium',
      title: 'Datamart Refresh Blocked by Upstream ML Model',
      description: 'Executive Looker datamart view materialization is delayed pending recovery of CHURN_PROPENSITY_SCORING.',
      status: 'open',
      deduplicationKey: `dep:${jobsByKey.BI_DATAMART_REFRESH._id}:${now.toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 110 * 60000),
    },
    {
      jobId: jobsByKey.INGEST_ACH_BATCHES._id,
      workflowId: wfBanking._id,
      type: 'duration_anomaly',
      severity: 'low',
      title: 'Resolved: High Volume Duration Anomaly on Ingest ACH',
      description: 'Job INGEST_ACH_BATCHES took 42% longer than median baseline due to end-of-month commercial payroll volume spike.',
      evidence: { sampleCount: 42, baselineMedianMs: 240000, recentAvgMs: 340000 },
      status: 'resolved',
      resolvedBy: dataops._id,
      resolvedAt: new Date(now.getTime() - 3 * 3600000),
      deduplicationKey: `duration:${jobsByKey.INGEST_ACH_BATCHES._id}:${new Date(now - 86400000).toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 5 * 3600000),
    },
    {
      jobId: jobsByKey.FEATURE_STORE_REFRESH._id,
      workflowId: wfLakehouse._id,
      type: 'duration_anomaly',
      severity: 'low',
      title: 'Resolved: Redis Memory Compaction Spike',
      description: 'Redis online feature store cluster node keyspace compaction caused transient write latency.',
      status: 'resolved',
      resolvedBy: operator._id,
      resolvedAt: new Date(now.getTime() - 12 * 3600000),
      deduplicationKey: `duration:${jobsByKey.FEATURE_STORE_REFRESH._id}:${new Date(now - 86400000).toISOString().split('T')[0]}`,
      createdAt: new Date(now.getTime() - 14 * 3600000),
    },
  ]);

  // ─── 8. AUDIT LOGS ────────────────────────────────────────────────────────
  console.log('Generating comprehensive operational audit trail...');
  await AuditLog.insertMany([
    {
      actorId: admin._id,
      actorEmail: 'admin@batchmonitor.dev',
      actorRole: 'admin',
      action: 'auth.login',
      resourceType: 'User',
      resourceId: admin._id.toString(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: new Date(now - 86400000 * 5),
    },
    {
      actorId: admin._id,
      actorEmail: 'admin@batchmonitor.dev',
      actorRole: 'admin',
      action: 'workflow.create',
      resourceType: 'Workflow',
      resourceId: wfFulfillment._id.toString(),
      metadata: { name: 'Global Order Fulfillment & Clearing' },
      ipAddress: '192.168.1.100',
      timestamp: new Date(now - 86400000 * 5),
    },
    {
      actorId: admin._id,
      actorEmail: 'admin@batchmonitor.dev',
      actorRole: 'admin',
      action: 'dependency.create',
      resourceType: 'Dependency',
      metadata: { upstream: 'PAYMENT_SETTLEMENT', downstream: 'CARRIER_MANIFEST_GEN', type: 'required' },
      ipAddress: '192.168.1.100',
      timestamp: new Date(now - 86400000 * 4),
    },
    {
      actorId: operator._id,
      actorEmail: 'operator@batchmonitor.dev',
      actorRole: 'operator',
      action: 'auth.login',
      resourceType: 'User',
      resourceId: operator._id.toString(),
      ipAddress: '10.0.4.15',
      timestamp: new Date(now - 86400000 * 2),
    },
    {
      actorId: operator._id,
      actorEmail: 'operator@batchmonitor.dev',
      actorRole: 'operator',
      action: 'alert.acknowledge',
      resourceType: 'Alert',
      resourceId: alerts[1]._id.toString(),
      metadata: { title: alerts[1].title, severity: 'high' },
      ipAddress: '10.0.4.15',
      timestamp: new Date(now.getTime() - 25 * 60000),
    },
    {
      actorId: dataops._id,
      actorEmail: 'dataops@batchmonitor.dev',
      actorRole: 'operator',
      action: 'job.retry',
      resourceType: 'Job',
      resourceId: jobsByKey.PAYMENT_SETTLEMENT._id.toString(),
      metadata: { jobKey: 'PAYMENT_SETTLEMENT', triggerType: 'manual_retry' },
      ipAddress: '10.0.4.22',
      timestamp: new Date(now.getTime() - 8 * 60000),
    },
    {
      actorId: admin._id,
      actorEmail: 'admin@batchmonitor.dev',
      actorRole: 'admin',
      action: 'settings.update',
      resourceType: 'MonitoringConfig',
      metadata: { updatedFields: ['prediction.anomalyMultiplier', 'scheduler.maxConcurrentJobs'] },
      ipAddress: '192.168.1.100',
      timestamp: new Date(now.getTime() - 4 * 3600000),
    },
    {
      actorId: auditor._id,
      actorEmail: 'auditor@batchmonitor.dev',
      actorRole: 'viewer',
      action: 'auth.login',
      resourceType: 'User',
      resourceId: auditor._id.toString(),
      ipAddress: '172.16.8.50',
      timestamp: new Date(now.getTime() - 2 * 3600000),
    },
    {
      actorId: dataops._id,
      actorEmail: 'dataops@batchmonitor.dev',
      actorRole: 'operator',
      action: 'alert.resolve',
      resourceType: 'Alert',
      resourceId: alerts[6]._id.toString(),
      metadata: { title: alerts[6].title },
      ipAddress: '10.0.4.22',
      timestamp: new Date(now.getTime() - 3 * 3600000),
    },
  ]);

  console.log('\n======================================================');
  console.log('✅ Enterprise Seed Complete!');
  console.log('======================================================');
  console.log('📋 Login Accounts:');
  console.log('  • Admin:      admin@batchmonitor.dev    / Admin@1234');
  console.log('  • Operator:   operator@batchmonitor.dev / Operator@1234');
  console.log('  • Viewer:     viewer@batchmonitor.dev   / Viewer@1234');
  console.log('  • DataOps:    dataops@batchmonitor.dev  / Operator@1234');
  console.log('  • Auditor:    auditor@batchmonitor.dev  / Viewer@1234');
  console.log('------------------------------------------------------');
  console.log('📊 Seeded Statistics:');
  console.log(`  • Users:         ${users.length}`);
  console.log(`  • Workflows:     ${workflows.length}`);
  console.log(`  • Jobs:          ${allJobs.length}`);
  console.log(`  • DAG Edges:     20`);
  console.log(`  • Executions:    ${executions.length} (30 days + active 24h)`);
  console.log(`  • Active Alerts: ${alerts.length}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  const message = String(err?.message || err).replace(/mongodb(\+srv)?:\/\/[^\s)]+/gi, '[REDACTED_URI]');
  console.error('Seed failed:', message);
  process.exit(1);
});
