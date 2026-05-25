---
name: align
description: Run the ai-os-v2 alignment grill for a new project idea. Interviews relentlessly until reaching shared understanding, then derives the tech stack from requirements.
---

# Align

Interview the user relentlessly about his project idea until reaching shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer.

Ask questions one at a time. Wait for feedback before continuing.

## Before Starting

1. Check `projects/` to see if alignment artifacts already exist for this project.
2. If this is a rework, read the existing CONTEXT.md and PRD first.
3. Create `projects/<project-name>/` and `projects/<project-name>/status.md` with `stage: align`.

## Checkpoint 1: Domain Grill

No technology discussion in this phase. Pure domain.

### How to start

1. Take the user's initial idea statement.
2. Extract every noun and verb that carries domain meaning.
3. Rank them by dependency — you can't define downstream terms before upstream ones.
4. List the ambiguous terms you found and the order you'll resolve them.

### How to grill

- Resolve one term at a time. Provide your best-guess definition. the user confirms, corrects, or expands.
- When a term resolves, add it to `projects/<project-name>/context.md` immediately using this format:

```markdown
**Term**:
Definition of the term.
_Avoid_: Competing terms to suppress
```

- Only add `_Avoid_` lines when the grill surfaced a real competing term.
- After core terms are locked, grill on mechanics — user flows, inputs, outputs, edge cases, scope boundaries. Each resolved question goes into `projects/<project-name>/align.md` as a decision entry.
- Invent concrete scenarios that probe edge cases and force precision about boundaries between concepts.

### When to move on

When all core domain terms are resolved, the primary user flow is clear, and scope boundaries (what's in v1 vs. later, what's explicitly excluded) are defined.

## Checkpoint 2: Stack Derivation

Now that the domain is resolved, derive the tech stack.

1. Review all resolved requirements from the domain grill.
2. Extract **hard constraints** — "needs browser UI," "processes large files server-side," "must integrate with X API," "runs on a schedule," etc.
3. Propose a tech stack with rationale tied to specific constraints. Not from habit, not from the user's history — from this project's requirements.
4. the user approves, modifies, or overrides.
5. Log the stack decision in `projects/<project-name>/align.md`.

Do NOT default to any stack. Do NOT reference "what the user usually uses." Every project earns its stack from its requirements. If Next.js + Supabase wins, it wins because constraints pointed there, not because it's familiar.

## Checkpoint 3: Reconciliation

Review domain decisions against the chosen stack.

1. Walk through each resolved domain decision and user story.
2. Flag anything that is now:
   - **Easier than expected** — the stack makes this trivial (confirm it stays in scope)
   - **Harder than expected** — the stack makes this complex (propose simplification or scope cut)
   - **Impossible or impractical** — the stack can't support this (change the feature or change the stack)
3. Adjust scope or stack if needed. Log any changes.

## Checkpoint 4: Lock

1. Confirm with the user: "Domain decisions, tech stack, and scope are reconciled. Ready to lock for PRD?"
2. Update `projects/<project-name>/status.md` to `stage: aligned`.
3. Print a summary of what was decided: core domain terms (count), stack, scope boundaries, key decisions.

After lock, tell the user to run `/to-prd` next.

## Output Artifacts

By the end of alignment, these files exist in `projects/<project-name>/`:

- `context.md` — Domain glossary (CONTEXT.md format)
- `align.md` — Full decision log with resolved questions and rationale
- `status.md` — Pipeline stage tracker
