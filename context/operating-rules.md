# Operating Rules

Operational policy for `ai-os-v2`.

## Core Principles

- ai-os-v2 is a launcher, not mission control.
- No product code lives here. This is a thinking and planning environment. Launcher infrastructure (vendored SDK, templates) is permitted.
- Every project earns its own tech stack from its own requirements. No defaults.
- Capture durable decisions in files, not only in chat history.
- Once a project is handed off, it is self-governing.

## Pipeline Rules

- The five core pipeline skills run in order: align → to-prd → to-issues → validate-slices → handoff.
- Each skill consumes the previous skill's output.
- Do not skip steps. Do not run them out of order.
- The align skill must reach the "lock" checkpoint before to-prd runs.
- validate-slices must pass before handoff runs.

## Alignment Rules

- Parse the user's initial statement for ambiguous terms before asking questions.
- Grill one question at a time. Provide a recommended answer with each question.
- Add CONTEXT.md entries only when the grill resolves genuine ambiguity.
- Do not discuss technology during the domain grill phase.
- Derive the tech stack from resolved requirements, not from habit.
- Reconcile domain decisions against the chosen stack before locking.

## Project Folder Rules

- One folder per project under `projects/`.
- Alignment artifacts stay in ai-os-v2 as archival copies after handoff.
- Do not modify ai-os-v2 project folders after handoff unless the user returns for a rework.

## Handoff Rules

- Projects are created in `~/ai-projects/`.
- Handoff ships thinking artifacts (CLAUDE.md, AGENTS.md, CONTEXT.md, PRD, ADRs, issue slices), pipeline and utility skills, and the vendored Sandcastle runtime.
- Handoff generates a kanban board (`docs/kanban.html` + `docs/kanban-state.json`) for visual issue tracking.
- Handoff installs skills in two formats: `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex).
- No product code, no framework scaffolding at handoff time.
- Handoff installs skills so the project is fully self-governing — it can run the full planning loop for new features without returning to ai-os-v2.
- Handoff is the only skill that stays ai-os-v2-only. All other skills ship to the project repo.

## Skills

Nine skills total:
- **Pipeline (5):** align, to-prd, to-issues, validate-slices, handoff
- **Architecture (1):** improve-codebase-architecture
- **Utility (3):** relay, relay-handoff, preflight

## Session Logging

- Log every session to `logs/sessions/YYYY-MM-DD.md`.
- Keep entries concrete and actionable — these are used for post-mortem analysis.
