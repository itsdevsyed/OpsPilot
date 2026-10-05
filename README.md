# OpsPilot
# OpsPilot — Project Notes

## What it is
An agentic DevOps tool: monitors logs/metrics → detects errors → sends context to LLM → gets diagnosis + suggested fix commands → runs whitelisted commands automatically (or on approval).

## Who it's for
- SRE/DevOps teams managing multiple services (real pain point: manual copy-paste into ChatGPT at 3am)
- Small/mid teams without dedicated SRE
- NOT for: large orgs (already have Datadog/PagerDuty), solo devs with one small app (overkill)

## Decision: Separate app, not embedded
- Embedding monitoring inside the production app it's supposed to protect = circular risk (a bug in OpsPilot can take down what it watches)
- Build standalone, point it at N apps
- Log/metric sources = pluggable adapters (docker logs first, add more later — don't design for sources you haven't identified yet)

## Core subsystems (in build order)
1. **Triage Engine** (build first — cheapest, unblocks everything else)
   - Dedup identical/similar errors (hash stack trace/pattern) — 500 of the same error = 1 incident
   - Score by: frequency, service criticality, known-pattern match
   - Only send top-N deduped/scored incidents to LLM (don't dump raw logs — expensive + noisy = worse answers)
2. **Agent Orchestrator** (LangGraph — confirmed correct choice)
   - Flow: ingest → dedup → prioritize → diagnose → (optional) pull more context → suggest → execute → verify
   - Multi-step, tool-calling, stateful → LangGraph fits, don't second-guess this
3. **Execution Layer**
   - Whitelisted commands ONLY (docker restart, service restart, clear cache) — never arbitrary shell exec
   - Auth: already handled (10+ auth-related features done, not re-covering here)
   - Command Execution Log: audit trail — timestamp, command, target, status, triggered-by (auto/manual)

## Storage rule
- Don't store raw logs long-term (Loki/ELK/CloudWatch already do that — don't re-solve it)
- Store only: **incidents** (deduped signature + metadata + LLM diagnosis + outcome), reference raw logs by timestamp/id

## LLM setup
- Currently: Grok API key, LangGraph + LangChain
- Risk: single-provider lock-in (rate limits, pricing volatility) — abstract the LLM call so provider is swappable later
- Use **structured output** (Pydantic model / `.with_structured_output()`), not free-text parsing — need `{problem, evidence, fix_commands: []}` as real data, not a paragraph to regex out

## Feedback loop
- Log whether suggested fix actually worked → improves future suggestions

## Frontend — screens (v1 only, nothing extra)
1. **Incident Feed** (home) — list, sorted severity→recency. Each row: severity badge, service, error signature, count, status
2. **Incident Detail** — raw error (collapsible) → LLM diagnosis → suggested command cards (Run/Copy buttons) → execution result if auto-run
3. **Command Execution Log** — table: timestamp, command, target, status, who/what triggered
4. **Sources/Settings** — connected log sources, on/off toggle

Components: `IncidentCard`, `SeverityBadge`, `CommandCard`, `LogViewer`, `StatusPill`
Style: dense, scannable, dark-mode-first — ops tool not consumer app. Reference Grafana/Datadog, don't invent from scratch.

## Known code issues (from first file reviewed — fix before iterating further)
- [ ] Syntax error: stray `a` on its own line in `answer_directly`
- [ ] No try/except around `read_logs.invoke()` and `llm.invoke()` — will crash on API failure
- [ ] No truncation/dedup before logs hit the prompt — will blow context window on real volume
- [ ] `route_question` uses naive keyword-in-string matching — will misroute (e.g. "database schema" question ≠ log analysis). Replace with LLM-based intent classification or LangGraph conditional edges
- [ ] `print()` debugging — swap to `logging` module
- [ ] LLM response is free text — switch to structured output before building the execution layer (fix_commands needs to be parseable data, not prose)

## Open questions / not yet decided
- Which log sources beyond docker (syslog? cloud provider metrics?) — deferred until core loop works end-to-end
- Full frontend component build — not started
