# CLAUDE.md — ai-os-v2

Read this at the start of every session in `ai-os-v2`.

## What This Is

ai-os-v2 is a **project launcher**. It takes a raw app idea, runs a structured alignment process, and produces a self-governing project repo in `~/ai-projects/`. Once a project is handed off, all work happens in the project repo — ai-os-v2's job is done.

ai-os-v2 is NOT mission control. It does not manage running projects, sync with project repos, or track ongoing development. It launches projects, then gets out of the way.

## Read These Files

**Every session:** `context/about.md` (if missing, copy from `context/about.example.md`), `context/operating-rules.md`

**Before alignment work:** Check `projects/` to see if a session already exists for this project.

## The Pipeline

Every project flows through five steps:

1. **`/align`** — Grill the user on the idea. Build CONTEXT.md and a decision log. Derive the tech stack from requirements. No defaults.
2. **`/to-prd`** — Synthesize a PRD from alignment outputs. Do not re-interview.
3. **`/to-issues`** — Decompose the PRD into vertical slice issues with dependencies.
4. **`/validate-slices`** — Audit every issue for vertical slice quality. Catches horizontal decomposition, Phase 0 leakage, and missing acceptance criteria before handoff.
5. **`/handoff`** — Package everything and create the project repo in `ai-projects/`.

Run them in order. Each step consumes the previous step's output.

## Project Folders

Each alignment session creates a folder under `projects/`:

```
projects/<project-name>/
  align.md          — grill transcript + decision log
  context.md        — CONTEXT.md built during alignment (copied to project at handoff)
  prd.md            — generated PRD (copy stays here as birth certificate)
  issues/           — vertical slice issue files
  slice-audit.md    — validate-slices audit report
  status.md         — current pipeline stage
```

## Rules

- No code lives in ai-os-v2. This is a thinking environment.
- No default tech stack. Every project earns its stack from its requirements.
- CONTEXT.md entries are added only when the grill resolves genuine ambiguity — never speculatively.
- The PRD copy in ai-os-v2 is archival. The project repo owns the living version after handoff.
- Skills live in `.claude/skills/`. Ten skills total: pipeline (align, to-prd, to-issues, validate-slices, handoff), post-handoff (to-sandcastle), architecture (improve-codebase-architecture), utility (relay, relay-handoff, preflight).

## Session Logging

Before ending every conversation, append a session entry to `logs/sessions/YYYY-MM-DD.md` using the same format as work-ai-os (Goal, Outcome, What worked, Friction, Changes made, Decisions, Follow-up). Omit empty sections.

## Post-Handoff

Once a project is handed off, it is **fully self-governing**. Handoff installs the pipeline skills (align, to-prd, to-issues, validate-slices, to-sandcastle) adapted for project-repo paths, plus architecture skills (improve-codebase-architecture) and utility skills (relay, relay-handoff). It also generates a kanban board (`docs/kanban.html` + `docs/kanban-state.json`) for visual issue tracking, and a tool-neutral skill mirror at `agents/skills/` with an `AGENTS.md` boot file for Codex/other agents. This means:

- All feature work — minor or major — happens in the project repo using its own pipeline skills
- No need to return to ai-os-v2 for new features, refactors, or even major pivots
- ai-os-v2 is only needed to **create new projects**

The PRD copy stays in ai-os-v2 as a birth certificate / archival reference, but the project repo owns the living version.
