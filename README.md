# Enterprise Batch Job Monitoring & Dependency Dashboard

An enterprise-grade, full-stack MERN operations console for scheduled batch jobs, workflow dependency visualization (DAG), deterministic root-cause identification, downstream failure blast-radius analysis, and explainable predictive delay alerts.

---

## 🌟 Key Capabilities & Highlights

- **Interactive DAG Dependency Explorer**: Built with React Flow. Real-time visual DAG mapping, edge creation, upstream/downstream navigation, and instantaneous cycle detection (DFS cycle rejection with HTTP 400).
- **Deterministic Root Cause & Downstream Blast-Radius**:
  - Traverses reverse dependency trees to identify whether a failure is a primary failure or caused by an upstream parent.
  - Traverses forward dependency trees (BFS) to identify all cascading jobs in danger.
- **Explainable Statistical Delay Predictions**: Uses a rolling median and Interquartile Range (IQR) duration baseline across the last 50 successful runs to identify performance anomalies before SLAs are breached.
- **Resilient Multi-Mode Database Engine**: Connect via MongoDB Atlas (with automatic SRV DNS resolution fallback) or 1-command local Docker container with Mongo Express Web UI.
- **Role-Based Access Control (RBAC)**: Pre-configured Admin, Operator, and Viewer roles with persistent JWT authentication and rapid role-switching demo buttons.
- **Safe Execution Simulation & Scheduler Engine**: `node-cron` scheduler with a state machine simulator (Pending → Queued → Running → Success/Failed/Timeout).
- **Full Observability & Audit Logging**: Live execution logs, downloadable CSV execution history, and tamper-resistant audit logs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, React Flow (`@reactflow/node-toolbar`), Recharts, Lucide React, Axios, React Router v7 |
| **Backend** | Node.js (ES Modules), Express.js, Mongoose ODM, Winston Logger, Morgan, Helmet, CORS, Express Rate Limit |
| **Database** | MongoDB (Atlas Cloud, Dockerized Container, or Local Community Server) |
| **Security** | JWT Authentication, bcryptjs password hashing, Mongo sanitization |
| **DevOps & QA** | Docker Compose, Jest (ESM VM modules), Oxlint, Concurrently |

---

## 📁 System Architecture & Directory Layout

```
batch-monitor/
├── docker-compose.yml              # 1-command local MongoDB 7.0 + Mongo Express GUI
├── package.json                    # Monorepo root scripts (dev, build, seed, test, lint)
├── README.md                       # Comprehensive system documentation
│
├── client/                         # React Vite Frontend Application (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/Badges.jsx   # Status, severity & criticality badges
│   │   │   ├── dependency-graph/   # Custom React Flow graph nodes & edge handlers
│   │   │   └── layout/             # Sidebar, Header, Notification Drawer, AppLayout
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Auth login with 1-click demo role fill
│   │   │   ├── OverviewPage.jsx    # Real-time KPIs, success rates, duration trend
│   │   │   ├── JobsPage.jsx        # Job catalog, filter, manual triggers & pause
│   │   │   ├── JobDetailsPage.jsx  # Execution histories, baselines & dependencies
│   │   │   ├── WorkflowsPage.jsx   # Workflow cards & health status scores
│   │   │   ├── WorkflowDetailsPage # Constituent jobs & health diagnostics
│   │   │   ├── DependencyExplorer  # Interactive DAG canvas with cycle rejection
│   │   │   ├── AlertsPage.jsx      # Open alerts with anomaly statistical evidence
│   │   │   ├── ExecutionHistory    # Filterable execution log with CSV export & retry
│   │   │   ├── AnalyticsPage.jsx   # P95 duration trends, bottleneck hotspots
│   │   │   ├── AuditLogsPage.jsx   # Immutable audit trail of operational actions
│   │   │   ├── UsersPage.jsx       # Admin user management & RBAC controls
│   │   │   └── SettingsPage.jsx    # Anomaly multipliers, timeouts & sample sizes
│   │   ├── context/AuthContext.jsx # JWT state persistence & axios interceptor
│   │   └── services/api.js         # Centralized Axios client
│   └── package.json
│
└── server/                         # Node.js / Express REST API (Port 5000)
    ├── scripts/
    │   ├── seed.js                 # Seeds 3 users, 3 workflows, 15 jobs, 900+ runs
    │   └── verify-db.js            # Automated 6-step database connectivity probe
    ├── src/
    │   ├── config/
    │   │   ├── db.js               # Auto-healing MongoDB connection & DNS resolution
    │   │   └── config.js           # Environment configuration loader
    │   ├── controllers/            # REST controllers (auth, jobs, workflows, alerts, etc.)
    │   ├── engine/executionEngine  # Execution lifecycle state machine & simulator
    │   ├── middleware/             # JWT authentication, RBAC authorization, error handler
    │   ├── models/                 # 8 Mongoose schemas (User, Job, Workflow, Alert, etc.)
    │   ├── prediction/             # Statistical baseline & predictive delay algorithm
    │   ├── routes/                 # Express API routes mounted under /api/v1/
    │   ├── scheduler/              # Cron-based recurring job execution runner
    │   └── services/               # Graph traversal, cycle detection & analytics
    └── package.json
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **Database**: MongoDB Atlas account OR Docker Desktop OR local MongoDB

### 2. Install All Dependencies
From the repository root directory:
```bash
# Install root orchestration tools
npm install

# Install backend dependencies
npm --prefix server install

# Install frontend dependencies
npm --prefix client install
```

### 3. Configure Database Connection

Create or edit `server/.env`:

#### Option A: MongoDB Atlas (Recommended)
Atlas provides direct replica-set URIs that bypass Windows/ISP port 53 DNS SRV blocks:
```env
PORT=5000
MONGODB_URI=mongodb://<username>:<password>@<shard-00>:27017,<shard-01>:27017,<shard-02>:27017/batch-monitor?ssl=true&replicaSet=<replicaSetName>&authSource=admin&retryWrites=true&w=majority
JWT_SECRET=batch_monitor_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DEMO_MODE=true
```

> **Important Atlas Setup Note**:
> In the [MongoDB Atlas Console](https://cloud.mongodb.com):
> 1. Go to **Network Access** under Security.
> 2. Click **Add IP Address** and choose **Allow Access From Anywhere (`0.0.0.0/0`)** so Wi-Fi, hotspot, or IP changes never block your connection.

#### Option B: Local MongoDB via Docker (100% Offline / No Atlas Needed)
With Docker Desktop running, start the pre-configured local container from the project root:
```bash
docker compose up -d
```
Then set in `server/.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/batch-monitor
```
- MongoDB runs locally on `mongodb://127.0.0.1:27017`
- A visual Web GUI is available at `http://localhost:8081` (Mongo Express)

#### Option C: Native Local MongoDB
If you installed [MongoDB Community Server](https://www.mongodb.com/try/download/community) on Windows:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/batch-monitor
```

---

### 4. Verify Database & Seed Demo Data

Test that your database connection is active and probe collections work:
```bash
npm --prefix server run verify:db
```

Seed the database with workflows, jobs, dependencies, alerts, and 30 days of execution history:
```bash
npm run seed
```

---

### 5. Run the Application

Start both the backend server and frontend client concurrently:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 👥 Demo User Accounts

The login screen includes quick-fill buttons for all 3 demo accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | `admin@batchmonitor.dev` | `Admin@1234` | Full privileges: User management, configuration, trigger runs, cancel executions, acknowledge/resolve alerts. |
| ⚙️ **Operator** | `operator@batchmonitor.dev` | `Operator@1234` | Operational control: Trigger manual job runs, retry failed runs, acknowledge and resolve alerts. |
| 👁️ **Viewer** | `viewer@batchmonitor.dev` | `Viewer@1234` | Read-only inspection: Access all dashboards, DAG visualizer, performance charts, and audit logs. |

---

## 🧠 Core Algorithms & Technical Architecture

### 1. Cycle Detection (DFS on DAG)
Before creating any dependency between jobs, the server builds an adjacency list of the workflow's dependency graph. It performs a Depth-First Search (DFS) from the prospective downstream job to determine whether the upstream job is reachable:
- If reachable: Edge rejected with `400 Bad Request` (`CYCLE_DETECTED`).
- If unreachable: Dependency edge saved safely.

### 2. Deterministic Root-Cause Analysis
When a job fails:
1. Traverses reverse dependency edges (`upstreamJobId`).
2. Checks status of parent prerequisite executions.
3. If any parent execution is in `failed` or `timeout` state, the parent is designated as the upstream cause.
4. If all parents succeeded (or no dependencies exist), the job is flagged as a **Primary Root Cause**.

### 3. Downstream Blast-Radius Analysis (BFS)
Using Breadth-First Search (BFS) along forward dependency edges (`downstreamJobId`), the system computes the exact set of transitively impacted jobs that are blocked or vulnerable, preventing duplicate counts across converging pipelines.

### 4. Explainable Delay Prediction (Rolling Baseline)
1. Fetches the job's last 50 successful executions.
2. Verifies sample count meets `PREDICTION_MIN_SAMPLES` (default: 5).
3. Computes the statistical **median** duration and **Interquartile Range (IQR)** to discard outlier runs.
4. If running average duration exceeds `median * PREDICTION_ANOMALY_MULTIPLIER` (default: 1.5), a `predicted_delay` alert is generated with statistical evidence.

---

## 📡 REST API Reference Summary

All API routes require `Authorization: Bearer <token>` (except `/auth/login` and `/health`).

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Authenticates user and returns JWT token |
| `/api/v1/auth/me` | `GET` | Authenticated | Returns current authenticated user profile |
| `/api/v1/health` | `GET` | Public | Liveness and MongoDB connectivity check |
| `/api/v1/jobs` | `GET`, `POST` | Authenticated | List jobs with filters / Create new job |
| `/api/v1/jobs/:id/run` | `POST` | Operator, Admin | Manually trigger execution of a job |
| `/api/v1/workflows` | `GET`, `POST` | Authenticated | List workflows with calculated health scores |
| `/api/v1/workflows/:id/graph` | `GET` | Authenticated | Returns nodes and edges for DAG visualization |
| `/api/v1/dependencies` | `POST`, `DELETE` | Operator, Admin | Add dependency (with cycle validation) or remove |
| `/api/v1/executions` | `GET` | Authenticated | Filter execution history / download CSV |
| `/api/v1/executions/:id/retry` | `POST` | Operator, Admin | Re-run a failed or timed-out execution |
| `/api/v1/alerts` | `GET`, `PATCH` | Authenticated | View predictive alerts / update status |
| `/api/v1/analytics/overview` | `GET` | Authenticated | Global KPI metrics (success rate, MTTR, volume) |
| `/api/v1/audit-logs` | `GET` | Authenticated | View immutable chronological operational audit log |
| `/api/v1/users` | `GET`, `POST` | Admin | Manage user accounts and assign roles |

---

## 🧪 Testing & Code Quality

Run backend unit tests and execution lifecycle tests:
```bash
npm --prefix server run test
```

Run project-wide linting across both client and server:
```bash
npm run lint
```

Build production client bundle:
```bash
npm --prefix client run build
```

---

## 📄 License
This project is licensed under the MIT License.
