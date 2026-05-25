---
name: handoff
description: Package alignment artifacts, install pipeline skills, and create a project repo with GitHub remote in ai-projects/. Use after /validate-slices, or when the user says "handoff", "launch this", "create the project", or "ship it".
---

# Handoff

Package everything from the alignment pipeline and create the project repo with a GitHub remote. This is the bridge between ai-os-v2 (thinking) and the project repo (building).

## Before Starting

1. Read `projects/<project-name>/status.md`. Confirm `stage: slices-validated` (set by /validate-slices).
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
├── .gitignore
├── .claude/
│   ├── relays/              (local-only relay handoff files)
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

- **relay** — compact the current conversation into a relay document for session handoff. Saves to `.claude/relays/` in the project repo. Install verbatim:

```markdown
---
name: relay
description: Compact the current conversation into a relay document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Where to save

Save to `.claude/relays/` in the current repo. Create the directory if it doesn't exist.

Filename format: `YYYY-MM-DD-HH-MM--<slug>.md` where `<slug>` is a short kebab-case summary of the relay topic (3-5 words max). Use the current local time.

Example: `.claude/relays/2026-05-24-14-30--cursor-cli-sub-auth.md`

## What to include

- **Date**, **source workspace path**, and **next session focus** at the top
- Context the next agent needs to continue — decisions made, approaches tried, current state
- A "suggested skills" section recommending skills the next agent should invoke
- References to artifacts by path or URL — do not duplicate content already in PRDs, plans, ADRs, issues, commits, or diffs

## Rules

- Redact any sensitive information (API keys, passwords, PII)
- If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly
- After saving, tell the user: "Relay saved. Run `/relay-handoff` in your next session to pick it up."
```

- **relay-handoff** — pick up a relay from a previous session. Lists available relays from `.claude/relays/` and lets the user choose which one to resume. Install verbatim:

```markdown
---
name: relay-handoff
description: Pick up a relay from a previous session. Lists available relays and lets you choose which one to resume.
---

## Behavior

1. Check if `--all` was passed as an argument.
   - **Without `--all`:** List all `.md` files in `.claude/relays/` that do NOT start with `DONE-`.
   - **With `--all`:** List ALL `.md` files in `.claude/relays/`, including `DONE-` files. Show `DONE-` files with a `[DONE]` tag in the label so they're visually distinct.
2. If none exist, tell the user "No relays available." and stop.
3. If exactly one exists, read it and proceed directly — no need to ask.
4. If multiple exist, present them as choices using AskUserQuestion. Show each relay's date and topic slug as the label, and the "next session focus" line as the description.
5. Read the selected relay file fully.
6. If the selected relay is NOT already `DONE-`, rename it by prepending `DONE-` to the filename (e.g., `2026-05-24-14-30--cursor-cli-sub-auth.md` → `DONE-2026-05-24-14-30--cursor-cli-sub-auth.md`). If it's already `DONE-`, skip the rename — it's a reference lookup, not a pickup.
7. Print a summary of what the relay contains and what the next steps are.
8. If the relay has a "suggested skills" section, invoke those skills as appropriate.

## Rules

- Never delete relay files — only mark them done with the `DONE-` prefix.
- If the user passes an argument (other than `--all`), use it to filter relays by keyword match on filename or content. `--all` can be combined with a keyword filter.
- Treat the relay document as context for the current session, not as instructions to execute blindly — confirm the plan with the user before taking action.
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

1. **Copy the template:** Copy `templates/kanban.html` from ai-os-v2 to `docs/kanban.html` in the project repo. Do not modify the HTML — it is a self-contained board that reads all data from `kanban-state.json` at runtime and auto-refreshes every 30 seconds.

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

Create `.claude/relays/` in the project repo so `/relay` works immediately.

Create a root `.gitignore` with standard exclusions:

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
.claude/relays/

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
- agents/skills/ (tool-neutral mirror for Codex / other agents)

This project is self-governing. New features can be planned and built entirely in-repo
using the installed pipeline skills — no need to return to ai-os-v2.

Next: Run /to-sandcastle to generate the agent orchestration scaffold (if warranted),
or start working issues manually. Open docs/kanban.html in a browser to visualize progress.
```

## What Handoff Does NOT Do

- Does not scaffold code (no src/, no package.json, no framework setup)
- Does not install hooks or coding standards (those are stack-specific — the first coding session or /to-sandcastle handles them)
- Does not set up Sandcastle or agent orchestration (that's /to-sandcastle)
- Does not run the installed skills — it only installs them so the project can use them later
