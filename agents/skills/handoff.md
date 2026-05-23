
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
├── docs/
│   ├── prd.md
│   ├── slice-audit.md
│   ├── kanban.html
│   ├── kanban-state.json
│   ├── issues/
│   │   └── (vertical slice issue files)
│   └── adr/
│       └── (any ADRs from alignment)
├── .claude/
│   └── skills/
│       └── (pipeline, architecture, and utility skills)
├── agents/
│   └── skills/
│       └── (tool-neutral mirror — flat markdown, no frontmatter)
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

### 4. Install Skills

Install pipeline and utility skills into `.claude/skills/` in the project repo. These make the project self-governing — it can run the full planning loop for new features without returning to ai-os-v2.

**Pipeline skills** (adapt paths for project-repo context):

- **align** — same grill process, but reads `CONTEXT.md` at project root and grills against the existing codebase (grill-with-docs behavior). Skips stack derivation unless the user wants to change stacks. Appends new terms to CONTEXT.md rather than creating it fresh.
- **to-prd** — produces a **feature PRD** scoped to the change, saved to `docs/prd-<feature-slug>.md`. References existing architecture from the original PRD. Does not re-interview.
- **to-issues** — appends new vertical slice issues to `docs/issues/` using the next available phase/number. Respects existing issue numbering and dependencies.
- **validate-slices** — same audit checks, reads issues from `docs/issues/` and PRD from `docs/`.
- **to-sandcastle** — already idempotent. Pushes new issues to GitHub and updates the kanban if it exists.

**Architecture skills:**

- **improve-codebase-architecture** — copy the full skill directory (SKILL.md, LANGUAGE.md, DEEPENING.md, HTML-REPORT.md, INTERFACE-DESIGN.md) verbatim from ai-os-v2's `.claude/skills/improve-codebase-architecture/`. No path adaptation needed — it already reads CONTEXT.md at repo root and `docs/adr/`.

**Utility skills:**

- **relay** — compact the current conversation into a relay document for session handoff. Install verbatim:

```markdown
---
name: relay
description: Compact the current conversation into a relay document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
```

**Adaptation rules for pipeline skills:**

When generating each skill for the project repo, apply these path translations:

| ai-os-v2 path | Project repo path |
|---|---|
| `projects/<name>/context.md` | `CONTEXT.md` (root) |
| `projects/<name>/prd.md` | `docs/prd.md` |
| `projects/<name>/issues/` | `docs/issues/` |
| `projects/<name>/status.md` | not used — project repos don't have a status file |
| `projects/<name>/align.md` | `docs/align-<feature-slug>.md` |

Each skill's description should note it works in "existing codebase" mode. The skill body should reference existing project files (CONTEXT.md, CLAUDE.md, codebase) as context for grilling and planning.

Also install the tool-neutral mirror at `agents/skills/` in the project repo — same content as `.claude/skills/` but as flat markdown files without YAML frontmatter. This lets Codex and other agents use the same pipeline. Generate an `AGENTS.md` boot file alongside `CLAUDE.md` using tool-neutral language (no slash commands — reference `agents/skills/<name>.md` paths instead).

### 5. Generate Kanban Board

Generate `docs/kanban.html` — a self-contained HTML file that visualizes all issues as a kanban board.

**Data source:** Read all issue files from `docs/issues/`. Parse each file's frontmatter/header for: title, phase, type (AFK/HITL), blocked-by, and acceptance criteria completion.

**Board layout:**
- Columns: **Backlog** → **In Progress** → **Review** → **Done**
- All issues start in Backlog
- Group by phase within each column
- Color-code by type: AFK (blue/indigo), HITL (amber/orange), Phase 0 (slate/gray)
- Show blocked-by relationships as a subtle indicator on each card

**Card content:**
- Issue ID (e.g., 01-02)
- Title
- Type badge (AFK / HITL)
- Phase badge
- Blocked-by list (if any)
- Acceptance criteria count (e.g., "0/3 done")

**Technical requirements:**
- Single self-contained HTML file — Tailwind via CDN for styling
- No JavaScript framework — vanilla JS only
- Reads from a `kanban-state.json` file in the same directory for status tracking
- On first generation, create `docs/kanban-state.json` from the issue list with all issues set to `backlog` (Phase 0 issues set to `done`)
- The board auto-refreshes from `kanban-state.json` every 30 seconds (useful for watching live Sandcastle runs)
- Valid statuses: `backlog`, `in-progress`, `review`, `done`

**Style:** Clean, minimal. Match the editorial feel of the architecture review reports — generous whitespace, no heavy borders, monospace for issue IDs.

### 6. Initialize Git and Create GitHub Remote

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

### 7. Update ai-os-v2

- Update `projects/<project-name>/status.md` to `stage: handed-off-to-github` with the project path and GitHub URL.
- The PRD copy stays in ai-os-v2 as a birth certificate.

### 8. Print Summary

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
- agents/skills/ (tool-neutral mirror for Codex / other agents)

This project is self-governing. New features can be planned and built entirely in-repo
using the installed pipeline skills — no need to return to ai-os-v2.

Next: Run the to-sandcastle step to generate the agent orchestration scaffold (if warranted),
or start working issues manually. Open docs/kanban.html in a browser to visualize progress.
```

## What Handoff Does NOT Do

- Does not scaffold code (no src/, no package.json, no framework setup)
- Does not install hooks or coding standards (those are stack-specific — the first coding session or to-sandcastle handles them)
- Does not set up Sandcastle or agent orchestration (that's the to-sandcastle step)
- Does not run the installed skills — it only installs them so the project can use them later
