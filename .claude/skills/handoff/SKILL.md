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
├── CONTEXT.md
├── docs/
│   ├── prd.md
│   ├── slice-audit.md
│   ├── issues/
│   │   └── (vertical slice issue files)
│   └── adr/
│       └── (any ADRs from alignment)
├── .claude/
│   └── skills/
│       └── (pipeline, architecture, and utility skills)
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

### 5. Initialize Git and Create GitHub Remote

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

### 6. Update ai-os-v2

- Update `projects/<project-name>/status.md` to `stage: handed-off-to-github` with the project path and GitHub URL.
- The PRD copy stays in ai-os-v2 as a birth certificate.

### 7. Print Summary

```
Project created: ~/ai-projects/<project-name>/
GitHub repo:     https://github.com/<github-user>/<project-name>

Contents:
- CLAUDE.md (project boot file)
- CONTEXT.md ({N} domain terms)
- docs/prd.md (full PRD)
- docs/adr/ ({N} decisions)
- docs/issues/ ({N} vertical slice issues)
- .claude/skills/ (pipeline: align, to-prd, to-issues, validate-slices, to-sandcastle | architecture: improve-codebase-architecture | utility: relay)

This project is self-governing. New features can be planned and built entirely in-repo
using the installed pipeline skills — no need to return to ai-os-v2.

Next: Run /to-sandcastle to generate the agent orchestration scaffold (if warranted),
or start working issues manually.
```

## What Handoff Does NOT Do

- Does not scaffold code (no src/, no package.json, no framework setup)
- Does not install hooks or coding standards (those are stack-specific — the first coding session or /to-sandcastle handles them)
- Does not set up Sandcastle or agent orchestration (that's /to-sandcastle)
- Does not run the installed skills — it only installs them so the project can use them later
