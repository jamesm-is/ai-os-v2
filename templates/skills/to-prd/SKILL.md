---
name: to-prd
description: Synthesize a feature PRD from alignment outputs. Do not re-interview the user. Use after /align has locked decisions for a new feature.
---

# To PRD

Take the alignment outputs and synthesize a feature PRD scoped to the change. Do NOT interview the user — just synthesize what was already resolved during alignment.

## Before Starting

1. Read `CONTEXT.md` at project root for domain vocabulary.
2. Read the feature alignment log at `docs/align-<feature-slug>.md`.
3. Read `docs/prd.md` for the original product spec and existing architecture.

## Process

1. **Identify modules.** Sketch out the modules needed for this feature. Reference existing modules from `docs/prd.md` where the feature touches them. Look for opportunities to extract deep modules — ones that encapsulate complex functionality behind a simple, testable interface.

2. **Check with the user.** Present the proposed modules. Confirm they match expectations. Ask which modules need tests.

3. **Write the feature PRD** using the template below. Use the domain glossary vocabulary from `CONTEXT.md` throughout — every term in the PRD must match the glossary.

4. **Save** to `docs/prd-<feature-slug>.md`.

5. Tell the user to run `/to-issues` to decompose the feature PRD into vertical slice issues.

## Feature PRD Template

```markdown
# Feature PRD: <Feature Name>

## Parent Project

References `docs/prd.md` for original product spec and architecture.

## Problem Statement

The problem from the user's perspective. Why does this feature need to exist?

## Solution

The solution from the user's perspective. What does the finished feature do?

## User Stories

A numbered list of user stories. Each in the format:

1. As a <actor>, I want <feature>, so that <benefit>

Every user-facing behavior should have a story.

## Modules

For each module this feature introduces or modifies:

- **Name**: module name (using glossary terms)
- **Responsibility**: what it does
- **Interface**: its public surface (inputs/outputs)
- **Existing or new**: whether this extends an existing module or introduces a new one
- **User stories served**: which user stories this module supports

## Implementation Decisions

A list of implementation decisions. Each marked as:

- `[CONFIRMED]` — resolved during alignment with explicit rationale
- `[PROPOSED]` — AI's recommendation, needs the user's approval

## Testing Decisions

- What makes a good test for this feature
- Which modules will be tested
- Testing strategy

## Scope

### In Scope
- ...

### Out of Scope
- ...

## Open Questions

Any unresolved questions that will need answers during implementation.
```
