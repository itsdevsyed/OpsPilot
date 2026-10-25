# OpsPilot Frontend Dashboard

A high-density, dark-mode-first SRE and DevOps operations dashboard built with **React 18**, **TypeScript**, **Vite**, and **Lucide Icons**, inspired by Grafana and Datadog.

---

## Features

1. **Incident Feed (Home)**:
   - Real-time list of triaged production incidents sorted by severity and recency.
   - Severity badges (`critical`, `high`, `medium`, `low`).
   - Incident deduplication occurrences badge (`4x`, `12x`).
   - Search & filter by severity or service name.
   - "Trigger Incident Event" simulation button connected to `/test-event`.

2. **Incident Detail & Remediation Modal**:
   - Problem statement and root-cause analysis synthesized by LLM.
   - Evidence telemetry snippets and log excerpts.
   - Whitelisted remediation command cards with one-click **Copy** and **Run Command** triggers.

3. **Command Execution Log (Audit Trail)**:
   - Table recording all automated and operator-triggered remediation commands.
   - Target container, execution status, and audit metadata.

4. **Infrastructure & Topology Viewer**:
   - Container inventory display loaded from `infra_inventory.yaml`.
   - Health status and runtime metrics for Podman/Docker.

5. **AI DevOps Chat Assistant**:
   - Interactive terminal drawer connecting to `/api/chat`.
   - Ask ad-hoc questions regarding cluster health, log analysis, and incident history.

---

## Prerequisites

- **Node.js**: v18.0.0+ (Tested on v20.18+)
- **NPM**: v9.0.0+ (Tested on v10.8+)

---

## Quickstart

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

Vite is configured with an automatic reverse proxy:
- Requests to `/incidents`, `/api`, and `/test-event` are forwarded to the FastAPI backend running at `http://localhost:8000`.

### 3. Build for Production

```bash
npm run build
```

Production assets will be output to the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```
