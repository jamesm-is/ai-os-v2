---
name: handoff
description: Package alignment artifacts, install pipeline skills, and create a project repo with GitHub remote in ai-projects/. Use after /validate-slices.
---

# Handoff

Package everything from the alignment pipeline and create the project repo with a GitHub remote. This is the bridge between ai-os-v2 (thinking) and the project repo (building).

## Before Starting

1. Read `projects/<project-name>/status.md`. Confirm `stage: slices-validated` (set by the validate-slices step).
2. If not ready, tell the user which step to complete first.

## Exit Criteria Validation

Before creating anything, validate:

- [ ] `projects/<project-name>/context.md` exists with at least 3 resolved domain terms
- [ ] `projects/<project-name>/prd.md` exists with Problem Statement, Solution, User Stories, Technical Stack, and Modules filled
- [ ] Tech stack is decided (check PRD's Technical Stack section)

If any check fails, tell the user what's missing and which skill to run.

## Process

### 1. Create Project Directory

Create `~/ai-projects/<project-name>/` with this structure:

```
<project-name>/
├── CLAUDE.md
├── AGENTS.md
├── CONTEXT.md
├── relays/               (shared relay handoff files)
├── docs/
│   ├── prd.md
│   ├── slice-audit.md
│   ├── kanban.html
│   ├── kanban-state.json
│   ├── issues/
│   │   └── (vertical slice issue files)
│   └── adr/
│       └── (any ADRs from alignment)
├── .gitignore
├── .claude/
│   └── skills/
│       └── (Claude Code slash commands)
├── .agents/
│   └── skills/
│       └── (Codex app skills — YAML frontmatter + SKILL.md)
```

### 2. Generate CLAUDE.md

Generate a project-level CLAUDE.md tailored to this project. It must include:

```markdown
# CLAUDE.md — {Project Name}

## What This Is

{One-paragraph description from the PRD's Problem Statement and Solution.}

## Domain Language

Read `CONTEXT.md` before any work. Use glossary terms exactly. If you use a term that conflicts with the glossary, stop and reconcile.

## Spec

Read `docs/prd.md` for the full product spec. When available, read `docs/issues/` for the implementation breakdown and check GitHub Issues for the live backlog.

## Working Rules

- Test-driven development: red-green-refactor, one test at a time, vertical slices
- Tests verify behavior through public interfaces, not implementation details
- Deep modules: encapsulate complexity behind simple, testable interfaces
- Use CONTEXT.md vocabulary in code — variable names, function names, comments should match the glossary
- Do not write all tests first then all implementation (horizontal slicing). Write one test, implement, repeat (vertical slicing).

## Issue Workflow

Issues in `docs/issues/` are the work backlog. Each is a vertical slice.
- **AFK** issues can be implemented autonomously
- **HITL** issues need the user's input before starting
- Work in phase order. Respect dependency chains.
- When an issue is complete, check off its acceptance criteria.

## ADRs

Architectural decisions live in `docs/adr/`. When making a decision that is hard to reverse, surprising without context, and the result of a real trade-off — create an ADR.
```

Adapt this template to the specific project. Add project-specific rules if the PRD or alignment log surfaced any.

### 3. Copy Artifacts

- Copy `context.md` → `CONTEXT.md` (rename to uppercase)
- Copy `prd.md` → `docs/prd.md`
- Copy `slice-audit.md` → `docs/slice-audit.md` (if exists)
- Copy `issues/` → `docs/issues/` (all vertical slice issue files)
- Copy any ADR files → `docs/adr/`
- Copy `vendor/sandcastle/` → `.sandcastle/vendor/sandcastle/` (vendored Sandcastle runtime for to-sandcastle)

### 4. Install Skills

Install skills for both Claude Code and Codex into the project repo. These make the project self-governing — it can run the full planning loop for new features without returning to ai-os-v2.

**Claude Code skills** go in `.claude/skills/<name>/SKILL.md`.
**Codex skills** go in `.agents/skills/<name>/SKILL.md`.
Both sets contain the same content — the only difference is the directory prefix. Install every skill into both locations.

**Pipeline skills** — copy verbatim from `templates/skills/` in ai-os-v2. These are project-mode variants with correct project-repo paths already baked in. No adaptation needed.

- `templates/skills/align/SKILL.md` → `.claude/skills/align/SKILL.md` and `.agents/skills/align/SKILL.md`
- `templates/skills/to-prd/SKILL.md` → `.claude/skills/to-prd/SKILL.md` and `.agents/skills/to-prd/SKILL.md`
- `templates/skills/to-issues/SKILL.md` → `.claude/skills/to-issues/SKILL.md` and `.agents/skills/to-issues/SKILL.md`
- `templates/skills/validate-slices/SKILL.md` → `.claude/skills/validate-slices/SKILL.md` and `.agents/skills/validate-slices/SKILL.md`
- `templates/skills/to-sandcastle/SKILL.md` → `.claude/skills/to-sandcastle/SKILL.md` and `.agents/skills/to-sandcastle/SKILL.md`

**Architecture skills** — copy verbatim from ai-os-v2 (already path-neutral):

- `.agents/skills/improve-codebase-architecture/` → copy the full directory (SKILL.md, LANGUAGE.md, DEEPENING.md, HTML-REPORT.md, INTERFACE-DESIGN.md) into both `.claude/skills/improve-codebase-architecture/` and `.agents/skills/improve-codebase-architecture/`.

**Utility skills** — copy verbatim from ai-os-v2 (already path-neutral):

- `.agents/skills/relay/SKILL.md` → both `.claude/skills/relay/SKILL.md` and `.agents/skills/relay/SKILL.md`
- `.agents/skills/relay-handoff/SKILL.md` → both `.claude/skills/relay-handoff/SKILL.md` and `.agents/skills/relay-handoff/SKILL.md`

Also generate an `AGENTS.md` boot file alongside `CLAUDE.md` using tool-neutral language (no slash commands — reference `.agents/skills/<name>/SKILL.md` paths instead).

### 5. Generate Kanban Board

1. **Copy the template:** Copy `templates/kanban.html` from ai-os-v2 to `docs/kanban.html` in the project repo. Do not modify the HTML — it reads issue metadata from `kanban-state.json` at runtime and auto-refreshes every 30 seconds. When served by Sandcastle's built-in board server, it also fetches live GitHub issue status from `/api/issues` to overlay real-time state.

2. **Generate `docs/kanban-state.json`:** Parse all issue files from `docs/issues/` and produce the JSON state file. The schema:

```json
{
  "issues": [
    {
      "id": "01-01",
      "title": "Issue Title",
      "phase": 1,
      "type": "AFK",
      "blockedBy": ["01-00"],
      "acceptanceCriteria": { "total": 3, "done": 0 },
      "status": "backlog"
    }
  ],
  "lastUpdated": "2026-01-01T00:00:00Z"
}
```

**Status rules:**
- All issues start as `backlog`
- Phase 0 / infrastructure provisioning issues start as `done` (they are HITL prerequisites completed before agents run)
- Valid statuses: `backlog`, `in-progress`, `review`, `done`

**Parsing each issue file:**
- `id` — from filename prefix (e.g., `01-02` from `01-02-tracer-bullet.md`)
- `title` — from the `# Title` heading
- `phase` — from the `**Phase:**` field
- `type` — from the `**Type:**` field (`AFK` or `HITL`)
- `blockedBy` — from the `**Blocked by:**` field, extract issue ID prefixes
- `acceptanceCriteria.total` — count `- [ ]` and `- [x]` lines in the Acceptance Criteria section
- `acceptanceCriteria.done` — count `- [x]` lines only

### 6. Create Relay Directory and .gitignore

Create `relays/` at repo root so `/relay` works immediately.

Create a root `.gitignore`:

```
*.env
*.key
.DS_Store
Thumbs.db
node_modules/
__pycache__/
*.pyc

# Local settings with secrets/tokens
.claude/settings.local.json

# Relay handoff files (local-only)
relays/

# Session logs
logs/sessions/*.md
```

### 7. Initialize Git and Create GitHub Remote

Run:
```
cd ~/ai-projects/<project-name>
git init
git add -A
git commit -m "Initial project setup from ai-os-v2 alignment"
```

Then create the GitHub repo and push:
```
gh repo create <github-user>/<project-name> --private --source . --push
```

Use `--private` by default. If the user specifies public, use `--public` instead.

### 8. Update ai-os-v2

- Update `projects/<project-name>/status.md` to `stage: handed-off-to-github` with the project path and GitHub URL.
- The PRD copy stays in ai-os-v2 as a birth certificate.

### 9. Print Summary

```
Project created: ~/ai-projects/<project-name>/
GitHub repo:     https://github.com/<github-user>/<project-name>

Contents:
- CLAUDE.md (project boot file — Claude Code)
- AGENTS.md (boot file — Codex / other agents)
- CONTEXT.md ({N} domain terms)
- docs/prd.md (full PRD)
- docs/adr/ ({N} decisions)
- docs/issues/ ({N} vertical slice issues)
- docs/kanban.html (visual board — open in browser)
- docs/kanban-state.json (board state — auto-refreshes every 30s)
- .claude/skills/ (Claude Code slash commands)
- .agents/skills/ (Codex app skills)
- relays/ (shared relay directory)

This project is self-governing. New features can be planned and built entirely in-repo
using the installed pipeline skills — no need to return to ai-os-v2.

Next: Run /to-sandcastle to generate the agent orchestration scaffold (if warranted),
or start working issues manually. Open docs/kanban.html in a browser to visualize progress.
```

## What Handoff Does NOT Do

- Does not scaffold code (no src/, no package.json, no framework setup)
- Does not install hooks or coding standards (those are stack-specific — the first coding session or /to-sandcastle handles them)
- Does not generate the Sandcastle scaffold or orchestration config — only seeds the vendored runtime (that's /to-sandcastle)
- Does not run the installed skills — it only installs them so the project can use them later
