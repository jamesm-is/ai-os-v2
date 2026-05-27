---
name: align
description: Alignment grill for new features in an existing project. Grills against the existing codebase and CONTEXT.md, appends new terms, and locks decisions for feature PRD synthesis.
---

# Align

Interview the user relentlessly about the new feature until reaching shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer.

Ask questions one at a time. Wait for feedback before continuing.

## Before Starting

1. Read `CONTEXT.md` at project root for existing domain vocabulary.
2. Read `docs/prd.md` for the original product spec and architecture.
3. Skim the codebase to understand the current state.

## Checkpoint 1: Domain Grill

No technology discussion in this phase. Pure domain.

### How to start

1. Take the user's feature description.
2. Extract every noun and verb that carries domain meaning.
3. Cross-reference with `CONTEXT.md` — separate known terms from new ones.
4. Rank new terms by dependency — you can't define downstream terms before upstream ones.
5. List the ambiguous terms you found and the order you'll resolve them.

### How to grill

- Resolve one term at a time. Provide your best-guess definition. The user confirms, corrects, or expands.
- When a term resolves, append it to `CONTEXT.md` using this format:

```markdown
**Term**:
Definition of the term.
_Avoid_: Competing terms to suppress
```

- Only add `_Avoid_` lines when the grill surfaced a real competing term.
- After core terms are locked, grill on mechanics — user flows, inputs, outputs, edge cases, scope boundaries. Each resolved question goes into `docs/align-<feature-slug>.md` as a decision entry.
- Invent concrete scenarios that probe edge cases and force precision about boundaries between concepts.

### When to move on

When all new domain terms are resolved, the feature flow is clear, and scope boundaries (what's in this feature vs. later, what's explicitly excluded) are defined.

## Checkpoint 2: Stack Compatibility

The project already has a tech stack. Check whether the new feature fits.

1. Review all resolved requirements from the domain grill.
2. Extract **hard constraints** — "needs real-time updates," "processes large files," "must integrate with X API," etc.
3. Confirm the existing stack handles these constraints. If not, propose additions or changes with rationale.
4. The user approves, modifies, or overrides.
5. Log the decision in `docs/align-<feature-slug>.md`.

Skip full stack derivation — only discuss stack changes if the feature requires them.

## Checkpoint 3: Reconciliation

Review feature decisions against the existing codebase and architecture.

1. Walk through each resolved decision and user story.
2. Flag anything that is now:
   - **Easier than expected** — existing code already handles this (confirm it stays in scope)
   - **Harder than expected** — conflicts with current architecture (propose simplification or scope cut)
   - **Impossible or impractical** — would require a rewrite of existing systems (change the feature or accept the cost)
3. Adjust scope if needed. Log any changes.

## Checkpoint 4: Lock

1. Confirm with the user: "Feature decisions and scope are reconciled. Ready to lock for PRD?"
2. Print a summary of what was decided: new domain terms (count), stack changes (if any), scope boundaries, key decisions.

After lock, tell the user to run `/to-prd` to synthesize the feature PRD.

## Output Artifacts

By the end of alignment, these files are created or updated:

- `CONTEXT.md` — Updated with new domain terms (appended, not rewritten)
- `docs/align-<feature-slug>.md` — Decision log for this feature
