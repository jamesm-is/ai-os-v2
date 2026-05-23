# To Issues

Break the PRD into independently-grabbable issues using vertical slices (tracer bullets). Issues are written as local markdown files in ai-os-v2 — they get pushed to GitHub Issues later during the to-sandcastle step.

## Before Starting

1. Read `projects/<project-name>/prd.md`.
2. Read `projects/<project-name>/context.md` for glossary vocabulary.
3. Confirm `projects/<project-name>/status.md` shows `stage: prd-ready`. If not, tell the user to finish the to-prd step first.

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

Group slices by dependency depth:

- **Phase 1**: Slices with no blockers. Always starts with the tracer bullet.
- **Phase 2**: Slices that depend on Phase 1 completions.
- **Phase 3+**: Continue until all slices are placed.

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

Create `projects/<project-name>/issues/` directory. Write one markdown file per slice:

**Filename**: `{phase}-{number}-{slug}.md` (e.g., `01-01-tracer-bullet-auth-flow.md`)

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

1. Update `projects/<project-name>/status.md` to `stage: issues-ready`.
2. Print a summary: total slices, phases, HITL count, AFK count, tracer bullet identified.
3. Tell the user to run the validate-slices step next (see `agents/skills/validate-slices.md`), then handoff (see `agents/skills/handoff.md`).
