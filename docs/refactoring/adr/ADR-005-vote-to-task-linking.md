# ADR-005: Vote → Task Linking Strategy

Date: 2026-02-05
Status: Accepted

## Context
We need a production‑safe way to connect vote decisions to execution. The system already has `TodoItem` and a generic `TodoLink` mechanism for attaching domain objects to tasks. We need an idempotent, non‑breaking approach that can be rolled out without new schema dependencies or ambiguous automation.

## Options
1. **Create a new Decision model** that stores vote results and links to tasks/obligations.
2. **Reuse `TodoLink`** and add a vote‑specific API action to create/update a linked `TodoItem`.
3. **Auto‑create tasks** automatically when a vote closes or results are approved.

## Decision
We will **reuse `TodoLink`** and expose a **`POST /api/votes/{id}/create-task/`** action that creates/updates a linked `TodoItem` idempotently. This keeps the change additive, avoids new schema dependencies, and allows managers to explicitly trigger the pipeline when a decision is ready.

## Consequences
- **Pros**: Minimal schema impact, idempotent behavior, uses existing task system, easy rollback.
- **Cons**: Requires manual trigger; no automatic task creation on vote close.
- **Follow‑up**: If automation is required later, we can add a scheduled job or vote‑closure hook that calls the same service.
