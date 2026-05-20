---
name: validate-slices
description: Audit generated issues to verify they are true vertical slices, not horizontal layer-based tasks. Use after /to-issues, when reviewing issue quality, or when the user says "validate slices", "check these issues", "are these vertical enough", or "audit issues".
---

# Vertical Slice Validator

Audit implementation issues to determine whether each one is a true vertical slice or a horizontal/layer-based task disguised as a slice. Prefer targeted rewrites over regenerating the full issue list.

## Before Starting

1. Read `projects/<project-name>/prd.md` for feature context.
2. Read `projects/<project-name>/context.md` for glossary vocabulary.
3. Read all issue files in `projects/<project-name>/issues/`.

If PRD context is missing, still audit based on the issue list but note reduced confidence.

## Definition

An issue is vertical enough if it produces one independently testable, user-observable behavior that cuts through the minimum necessary product layers and can be demonstrated without waiting for sibling issues, except for explicit Phase 0 prerequisites.

## Audit Checks

Evaluate each issue against these seven checks:

### 1. User Value

- **Pass** if the issue creates an observable outcome for a user, admin, operator, or system actor.
- **Fail** if it only describes internal implementation work with no visible result.

### 2. Layer Coverage

Single-layer is a smell, not an automatic fail. A UI-only change that produces observable behavior (loading states, error messages) can pass. The real signal is whether the slice delivers something a person can see or verify.

- **Pass** if the slice cuts through the minimum necessary layers for its outcome.
- **Fail** when the slice has no user value AND is isolated to one technical layer.

### 3. Demoability

- **Pass** if the slice can be shown working independently without waiting for sibling issues (Phase 0 prerequisites excepted).
- **Fail** if the slice only enables a future issue with no standalone value.

### 4. Dependency Shape

Distinguish two kinds of chains:

- **Layer-aligned chains** (DB → API → UI for the same feature) — this is horizontal decomposition even if issue titles imply user outcomes. **Flag these.**
- **Capability-building chains** (feature A enables feature B) — this is normal and expected. **Do not flag.**

### 5. Size

- **Fail** if the slice has no acceptance criteria beyond confirming an implementation detail (too tiny).
- **Fail** if the slice contains multiple independent user outcomes (too broad).
- Target: one focused implementation session of work.

### 6. Phase 0 Leakage

Setup, provisioning, schema scaffolding, CI, tooling, and cross-cutting infrastructure (auth, error handling, observability) must be tagged Phase 0 or structured as thin foundational slices.

- **Fail** if unflagged setup work is embedded in a feature slice.
- **Pass** if cross-cutting work is explicitly scoped as Phase 0 or as a thin foundational slice that still delivers observable value.

### 7. Acceptance-Test Clarity

- **Pass** if the issue can be expressed as a Given / When / Then acceptance test.
- If missing, suggest one.
- **Fail** if writing a Given / When / Then is impossible for this issue.

## Verdicts

Use three verdicts per issue:

- **Pass** — independently demonstrable user-facing increment.
- **Borderline** — potentially vertical but underspecified, too dependent, or poorly scoped.
- **Fail** — horizontal, setup-only, too tiny, too broad, or not independently demoable.

## Output Format

```markdown
# Vertical Slice Audit — <project-name>

## Summary
- Total issues:
- Pass:
- Borderline:
- Fail:
- Overall verdict:
- Recommendation:

## Cross-Issue Dependency Smells
List any layer-aligned chains, Phase 0 leakage, or repeated horizontal patterns across the issue set.

## Issue Audits

### <Issue ID — Title>
**Verdict:** Pass / Borderline / Fail

| Check | Result |
|-------|--------|
| User value | Pass / Fail — reason |
| Layer coverage | Pass / Fail — reason |
| Demoability | Pass / Fail — reason |
| Dependency shape | Pass / Flag — reason |
| Size | Pass / Fail — reason |
| Phase 0 leakage | Pass / Fail — reason |
| Acceptance-test clarity | Pass / Fail — reason |

**Problem:** (only for Borderline/Fail — be specific, not vague)

**Rewrite:** (only for Borderline/Fail — better vertical-slice title and short description)

**Suggested acceptance test:**
Given ...
When ...
Then ...

(repeat for each issue)

## Final Recommendation

(use decision rule below)
```

## Decision Rule

- **≥80% pass** — proceed after manual fixes to borderline/failed issues.
- **50–79% pass** — revise failed and borderline issues before continuing to `/handoff`.
- **<50% pass** — re-run `/to-issues` with the audit feedback attached as constraints. Provide the exact instruction to feed back into to-issues.

## After the Audit

1. Save the audit report to `projects/<project-name>/slice-audit.md`.
2. If issues were rewritten, update the corresponding files in `projects/<project-name>/issues/`.
3. Update `projects/<project-name>/status.md` to reflect the audit result.
4. Tell the user the next step: proceed to `/handoff` (if passing), fix issues (if borderline), or re-run `/to-issues` (if failing).
