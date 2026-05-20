---
name: to-sandcastle
description: Generate a .sandcastle/ scaffold for agent orchestration in a handed-off project. Use after /to-issues, or when the user says "to-sandcastle", "set up sandcastle", "agent scaffold", or "prepare for agents".
---

# To Sandcastle

Generate the `.sandcastle/` orchestration scaffold in a project repo so it can run autonomous agents via Sandcastle.

## Before Starting

1. Read `projects/<project-name>/status.md`. Confirm `stage: issues-live`.
   - If `stage: handed-off-to-github`, tell the user to run `/to-issues` first.
   - If earlier, tell the user which step to complete first.
2. Read `projects/<project-name>/prd.md` — specifically the **Technical Stack** section.
3. Read `projects/<project-name>/context.md` for domain vocabulary.
4. Confirm the project repo exists at `~/ai-projects/<project-name>\`.
5. Confirm the project has a GitHub remote (`gh repo view` in the project directory).

## Stack Detection

Read the PRD's Technical Stack section and classify the project:

| Stack | Base Image | Package Hook | Test Command | Typecheck Command |
|---|---|---|---|---|
| **Node/TypeScript** | `node:22-bookworm` | `npm install` | `npm run test` | `npm run typecheck` |
| **Python** | `python:3.12-bookworm` | `pip install -e ".[dev]"` | `pytest` | `pyright` or `mypy` (from PRD) |

If the stack doesn't match either pattern, generate a Node-based scaffold and warn the user to customize the Dockerfile and hooks.

Store the detected values — they're used in templates below.

## Process

### 1. Derive Coding Standards

Generate `CODING_STANDARDS.md` from the PRD and CLAUDE.md:

- **Style rules** from the tech stack conventions (naming, imports, exports)
- **Testing rules** from the PRD's Testing Decisions section
- **Architecture rules** from the PRD's Modules section and any ADRs

Keep it concise — agents reference this during review. No fluff.

### 2. Generate the Scaffold

Create `~/ai-projects/<project-name>\.sandcastle\` with these files:

#### `.gitignore`

```
.env
logs
worktrees
```

#### `.env.example`

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GITHUB_TOKEN=
```

#### `CODING_STANDARDS.md`

The derived coding standards from step 1.

#### `Dockerfile`

<template>

For **Node/TypeScript** projects:

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Codex CLI (install as root before user switch)
RUN npm install -g @openai/codex

ARG AGENT_UID=1000
ARG AGENT_GID=1000

RUN groupmod -g $AGENT_GID node && usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# Claude Code CLI (installs to user home)
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

For **Python** projects: Replace `node:22-bookworm` with `python:3.12-bookworm`. Remove the `npm install -g @openai/codex` line and instead install Codex via `pip install openai-codex` or keep the npm global install if Node is available. Adjust the user creation to not depend on the `node` user existing — create the `agent` user from scratch.

</template>

#### `plan-prompt.md`

```markdown
# ISSUES

Here are the open issues in the repo:

<issues-json>

!`gh issue list --state open --label ready-for-agent --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

The list above has already been filtered to issues ready for work.

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

An issue B is **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts
- B's requirements depend on a decision or API shape that A will establish

An issue is **unblocked** if it has zero blocking dependencies on other open issues.

For each unblocked issue, assign a branch name using the format `sandcastle/issue-{number}-{short-slug}` where `{short-slug}` is at most 3-4 words (max 30 characters). Keep it short — long branch names break on Windows.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "1", "title": "Parse front matter from markdown files", "branch": "sandcastle/issue-1-front-matter"}]}
</plan>

Include only unblocked issues. If every issue is blocked, include the single highest-priority candidate (the one with the fewest or weakest dependencies).
```

#### `implement-prompt.md`

Use `{{TASK_ID}}`, `{{ISSUE_TITLE}}`, and `{{BRANCH}}` as template variables.

```markdown
# TASK

Fix issue #{{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue details:

!`gh issue view {{TASK_ID}}`

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run `{{TYPECHECK_CMD}}` and `{{TEST_CMD}}` to ensure the tests pass.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + issue reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
```

Replace `{{TYPECHECK_CMD}}` and `{{TEST_CMD}}` with the detected stack commands (e.g., `npm run typecheck` and `npm run test` for Node/TS).

#### `review-prompt.md`

Use `{{BRANCH}}` as a template variable. Use `master` as the base branch reference (Sandcastle convention).

```markdown
# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff (against master)

!`git diff master...HEAD`

## Commits on this branch

!`git log master..HEAD --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits above to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators - prefer switch statements or if/else chains
   - Choose clarity over brevity - explicit code is often better than overly compact code

3. **Check correctness**:
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?

4. **Maintain balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Make the code harder to debug or extend

5. **Apply project standards**: Follow the coding standards defined in @.sandcastle/CODING_STANDARDS.md

6. **Preserve functionality**: Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch
2. Run tests and type checking to ensure nothing is broken
3. Commit describing the refinements

If the code is already clean and well-structured, do nothing.

Once complete, output <promise>COMPLETE</promise>.
```

#### `merge-prompt.md`

Use `{{BRANCHES}}` and `{{ISSUES}}` as template variables.

```markdown
# TASK

Create pull requests for the following branches:

{{BRANCHES}}

These branches correspond to the following issues:

{{ISSUES}}

For each branch:

1. Push the branch to the remote: `git push origin <branch>`
2. Run `{{TYPECHECK_CMD}}` and `{{TEST_CMD}}` on the branch first to confirm everything passes
3. Create a pull request using `gh pr create`:
   - Title: the issue title
   - Body: a summary of what was implemented, key decisions, and files changed
   - Link the issue by including `Closes #<number>` in the PR body
   - Base branch: master
4. After the PR is created, remove the `ready-for-agent` label from the issue so it is not picked up again:
   `gh issue edit <number> --remove-label ready-for-agent`

Do NOT merge the branches. Do NOT close the issues manually — the PR will close them when merged by the reviewer.

Once all PRs are created, output <promise>COMPLETE</promise>.
```

Replace `{{TYPECHECK_CMD}}` and `{{TEST_CMD}}` with the detected stack commands.

#### `main.mts`

Generate the orchestration loop. This is the core engine — adapt from the reference implementation:

```typescript
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 10;

const hooks = {
  sandbox: { onSandboxReady: [{ command: "{{INSTALL_CMD}}" }] },
};

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // Phase 1: Plan (Opus 4.7 — judgment call on what to work on)
  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-7"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!planMatch) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { id: string; title: string; branch: string }[];
  };

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // Phase 2: Execute + Review (each issue gets its own Docker container)
  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker(),
        hooks,
      });

      try {
        // Implement (GPT-5.5 low — volume TDD coding work)
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.codex("gpt-5.5", { effort: "low" }),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        if (implement.commits.length > 0) {
          // Review (GPT-5.5 high — deeper reasoning to catch bugs)
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.codex("gpt-5.5", { effort: "high" }),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });

          return {
            ...review,
            commits: [...implement.commits, ...review.commits],
          };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  // Phase 3: Create PRs (Opus 4.7 — judgment call on what to ship)
  await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "pr-creator",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-7"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues
        .map((i) => `- ${i.id}: ${i.title}`)
        .join("\n"),
    },
  });

  console.log("\nPRs created.");
}

console.log("\nAll done.");
```

Replace `{{INSTALL_CMD}}` with the detected package install command (e.g., `npm install`).

### 3. Wire Up Dependencies

If `@ai-hero/sandcastle` is not already in the project's `package.json` devDependencies:

```bash
cd ~/ai-projects/<project-name>
npm install --save-dev @ai-hero/sandcastle
```

### 4. Add Codex Login Hook

Add the Codex Docker auth hook to `main.mts` hooks:

The `onSandboxReady` hooks must include the Codex login command. The hooks object should be:

```typescript
const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: "{{INSTALL_CMD}}" },
      { command: "printenv OPENAI_API_KEY | codex login --with-api-key" },
    ],
  },
};
```

This is critical — setting the env var alone gets 401 errors from Codex in Docker.

### 5. Commit the Scaffold

```bash
cd ~/ai-projects/<project-name>
git add .sandcastle/
git commit -m "Add Sandcastle agent orchestration scaffold"
git push
```

### 6. Update ai-os-v2 Status

Update `projects/<project-name>/status.md` to `stage: sandcastle-ready`.

### 7. Print Summary

```
Sandcastle scaffold generated: ~/ai-projects/<project-name>\.sandcastle\

Files:
- main.mts          (orchestration loop — 10 iterations, parallel execution)
- plan-prompt.md     (dependency graph + issue selection)
- implement-prompt.md (TDD coding with RALPH: commits)
- review-prompt.md   (code clarity + standards enforcement)
- merge-prompt.md    (PR creation + label cleanup)
- CODING_STANDARDS.md (derived from PRD)
- Dockerfile         ({stack} base image + gh CLI + Codex + Claude Code)
- .env.example       (required API keys)
- .gitignore         (excludes .env, logs/, worktrees/)

Agent config:
- Planner:     Claude Opus 4.7 (judgment calls)
- Implementer: GPT-5.5 low effort (volume TDD work)
- Reviewer:    GPT-5.5 high effort (deeper analysis)
- PR Creator:  Claude Opus 4.7 (judgment calls)

Estimated cost: ~$21 per full run (12-issue project baseline)

Next steps:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Copy .env.example to .env and fill in API keys
3. Run: npx sandcastle
```

## What to-sandcastle Does NOT Do

- Does not run Sandcastle (the user decides when)
- Does not create or fill `.env` with real secrets (that's Phase 0 / HITL)
- Does not install project dependencies beyond `@ai-hero/sandcastle`
- Does not modify existing project code
- Does not set up CI/CD or GitHub Actions
