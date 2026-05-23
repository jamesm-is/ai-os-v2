# To PRD

Take the alignment outputs and synthesize a PRD. Do NOT interview the user — just synthesize what was already resolved during alignment.

## Before Starting

1. Read `projects/<project-name>/context.md` (the domain glossary).
2. Read `projects/<project-name>/align.md` (the decision log).
3. Confirm `projects/<project-name>/status.md` shows `stage: aligned`. If not, tell the user to finish the align step first.

## Process

1. **Identify modules.** Sketch out the major modules needed to build this. Look for opportunities to extract deep modules — ones that encapsulate complex functionality behind a simple, testable interface that rarely changes.

2. **Check with the user.** Present the proposed modules. Confirm they match expectations. Ask which modules need tests.

3. **Write the PRD** using the template below. Use the domain glossary vocabulary from `context.md` throughout — every term in the PRD must match the glossary.

4. **Save** to `projects/<project-name>/prd.md`.

5. **Update** `projects/<project-name>/status.md` to `stage: prd-ready`.

6. Tell the user to run the to-issues step next (see `agents/skills/to-issues.md`).

## PRD Template

```markdown
# PRD: <Project Name>

## Problem Statement

The problem from the user's perspective. Why does this need to exist?

## Solution

The solution from the user's perspective. What does the finished product do?

## User Stories

A numbered list of user stories. Each in the format:

1. As a <actor>, I want <feature>, so that <benefit>

This list should be extensive and cover all aspects of the feature. Every user-facing behavior should have a story.

## Technical Stack

The stack decision from alignment, with rationale tied to specific requirements.

- **Runtime:** ...
- **Language:** ...
- **Framework:** ...
- **Data:** ...
- **Infrastructure:** ...
- **Key Dependencies:** ...

## Modules

A description of each deep module, its interface, and what it encapsulates. For each module:

- **Name**: module name (using glossary terms)
- **Responsibility**: what it does
- **Interface**: its public surface (inputs/outputs)
- **User stories served**: which user stories this module supports

## Implementation Decisions

A list of implementation decisions. Each marked as:

- `[CONFIRMED]` — resolved during alignment with explicit rationale
- `[PROPOSED]` — AI's recommendation, needs the user's approval

Include: module boundaries, data models, API contracts, architectural patterns, key interactions. Do NOT include specific file paths or code snippets.

## Testing Decisions

- What makes a good test for this project (behavior through public interfaces, not implementation)
- Which modules will be tested
- Testing strategy and framework choice
- Integration vs. unit test balance

## Scope

### In Scope (v1)
- ...

### Out of Scope
- ...

### Future Considerations
- ...

## Open Questions

Any unresolved questions that will need answers during implementation.
```
