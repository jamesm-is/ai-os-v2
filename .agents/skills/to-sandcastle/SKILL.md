---
name: to-sandcastle
description: Generate the .sandcastle/ orchestration scaffold so the project can run autonomous agents via Sandcastle.
---

# To Sandcastle

Generate the `.sandcastle/` orchestration scaffold in a project repo so it can run autonomous agents via Sandcastle.

## Before Starting

1. Read `projects/<project-name>/status.md`. Confirm `stage: handed-off-to-github`.
   - If `stage: slices-validated`, tell the user to run `/handoff` first.
   - If earlier, tell the user which step to complete first.
2. Read `projects/<project-name>/prd.md` — specifically the **Technical Stack** section.
3. Read `projects/<project-name>/context.md` for domain vocabulary.
4. Confirm the project repo exists at `~/ai-projects/<project-name>`.
5. Confirm the project has a GitHub remote (`gh repo view` in the project directory).
6. Ask the user about auth mode and CLI choice (see full SKILL.md in `.claude/skills/to-sandcastle/` for details).

Refer to the Claude Code version of this skill at `.claude/skills/to-sandcastle/SKILL.md` for the complete scaffold templates, Dockerfile variants, agent profiles, auth setup, and setup guides.
