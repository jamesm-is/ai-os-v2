---
name: to-issues
description: Decompose a feature PRD into vertical slice issues. Use after /to-prd, or when the user says "break this down", "create issues", or "slice this".
---

# To Issues

Break a feature PRD into independently-grabbable issues using vertical slices (tracer bullets). Issues are written as local markdown files and get pushed to GitHub Issues during `/to-sandcastle`.

## Before Starting

1. Read the feature PRD (e.g., `docs/prd-<feature-slug>.md`). If working from the original PRD, read `docs/prd.md`.
2. Read `CONTEXT.md` for glossary vocabulary.
3. Check existing issues in `docs/issues/` to understand current numbering and phases.

## Process

### 1. Draft Vertical Slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL layers end-to-end, NOT a horizontal slice of one layer.

<rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
- The first slice should be the tracer bullet — the thinnest possible end-to-end path that proves the architecture works
</rules>

Each slice is typed:
- **AFK** — Can be implemented without human interaction. AI agent can pick this up and build it autonomously.
- **HITL** — Requires human interaction: an architectural decision, design review, API key provisioning, brand asset, or the user's judgment call.

Prefer AFK over HITL where possible.

### 2. Organize into Phases

Use the next available phase numbers (check existing issues in `docs/issues/` to avoid conflicts).

Group slices by dependency depth:

- First available phase: Slices with no blockers.
- Next phase: Slices that depend on the previous phase.
- Continue until all slices are placed.

HITL decisions that gate an entire phase should be surfaced as their own slice at the top of that phase.

### 3. Quiz the user

Present the breakdown as a numbered list, grouped by phase. For each slice show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Phase**: which phase it belongs to
- **Blocked by**: which other slices must complete first
- **User stories covered**: which user stories from the PRD this addresses
- **Modules touched**: which PRD modules this slice involves

Ask the user:
- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split?
- Are the HITL/AFK assignments correct?

Iterate until the user approves.

### 4. Write Issue Files

Write one markdown file per slice to `docs/issues/`:

**Filename**: `{phase}-{number}-{slug}.md` (e.g., `02-01-feature-auth-flow.md`)

**Template**:

```markdown
# {Title}

**Type:** AFK | HITL
**Phase:** {N}
**Blocked by:** {references to blocking issues, or "None — can start immediately"}
**User stories:** {numbers from PRD}
**Modules:** {module names from PRD}

## What to Build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Use glossary terms from CONTEXT.md.

No specific file paths or code snippets — they go stale fast.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Testing Notes

What should be tested for this slice. Behavior-focused, not implementation-focused.
```

### 5. Finalize

1. Print a summary: total slices, phases, HITL count, AFK count, tracer bullet identified.
2. Tell the user to run `/validate-slices` to audit issue quality before proceeding.
