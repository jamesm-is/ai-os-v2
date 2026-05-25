# To Sandcastle

Generate the `.sandcastle/` orchestration scaffold in a project repo so it can run autonomous agents via Sandcastle.

## Before Starting

1. Read `projects/<project-name>/status.md`. Confirm `stage: handed-off-to-github`.
   - If `stage: slices-validated`, tell the user to run the handoff step first (see `agents/skills/handoff.md`).
   - If earlier, tell the user which step to complete first.
2. Read `projects/<project-name>/prd.md` — specifically the **Technical Stack** section.
3. Read `projects/<project-name>/context.md` for domain vocabulary.
4. Confirm the project repo exists at `~/ai-projects/<project-name>`.
5. Confirm the project has a GitHub remote (`gh repo view` in the project directory).
6. **Ask the user two questions:**

   **Auth mode:**
   - **Subscription** — no API keys, uses existing Claude/ChatGPT subscriptions
   - **API key** — pay-per-token from API credits

   **CLI choice:**
   - **Claude only** — all agents run via Claude Code CLI
   - **Codex only** — all agents run via Codex CLI
   - **Hybrid** — Claude Code for planning/PR, Codex for implementation/review

## Agent Profiles

The CLI choice determines which models fill each role:

| Role | Claude only | Codex only | Hybrid |
|---|---|---|---|
| Planner | Opus 4.7 | GPT-5.5 high | Opus 4.7 |
| Implementer | Sonnet 4.6 | GPT-5.5 low | GPT-5.5 low |
| Reviewer | Opus 4.6 | GPT-5.5 medium | GPT-5.5 high |
| PR Creator | Opus 4.7 | GPT-5.5 high | Opus 4.7 |

The corresponding `main.mts` agent calls:

**Claude only:**
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: sandcastle.claudeCode("claude-sonnet-4-6"),
  reviewer:    sandcastle.claudeCode("claude-opus-4-6"),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

**Codex only:**
```typescript
const AGENTS = {
  planner:     sandcastle.codex("gpt-5.5", { effort: "high" }),
  implementer: sandcastle.codex("gpt-5.5", { effort: "low" }),
  reviewer:    sandcastle.codex("gpt-5.5", { effort: "medium" }),
  prCreator:   sandcastle.codex("gpt-5.5", { effort: "high" }),
};
```

**Hybrid:**
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: sandcastle.codex("gpt-5.5", { effort: "low" }),
  reviewer:    sandcastle.codex("gpt-5.5", { effort: "high" }),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

## Auth Setup by Configuration

The auth mode + CLI choice determines what goes in `.env.example`, what the `onSandboxReady` hooks do, and what gets installed in the Dockerfile.

### Subscription auth

**Claude only:**
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
```
No Codex auth needed. Hook: just `{{INSTALL_CMD}}`.

**Codex only:**
```
GH_TOKEN=                  # run: gh auth token
# Codex: mount ~/.codex/auth.json read-only — copied by onSandboxReady hook
```
Hook: `mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json`

**Hybrid:**
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
# Codex: mount ~/.codex/auth.json read-only — copied by onSandboxReady hook
```
Hook: `mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json`

### API key auth

**Claude only:**
```
ANTHROPIC_API_KEY=
GH_TOKEN=
```
No Codex auth needed. Hook: just `{{INSTALL_CMD}}`.

**Codex only:**
```
OPENAI_API_KEY=
GH_TOKEN=
```
Hook: `printenv OPENAI_API_KEY | codex login --with-api-key`

**Hybrid:**
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GH_TOKEN=
```
Hook: `printenv OPENAI_API_KEY | codex login --with-api-key`

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

Generate `CODING_STANDARDS.md` from the PRD and the project's boot file (CLAUDE.md if present, otherwise AGENTS.md):

- **Style rules** from the tech stack conventions (naming, imports, exports)
- **Testing rules** from the PRD's Testing Decisions section
- **Architecture rules** from the PRD's Modules section and any ADRs

Keep it concise — agents reference this during review. No fluff.

### 2. Generate the Scaffold

Create `~/ai-projects/<project-name>/.sandcastle/` with these files:

#### `.gitignore`

```
.env
logs
worktrees
```

#### `.env.example`

Use the template from the **Auth Setup** section above matching the user's chosen auth mode + CLI.

#### `CODING_STANDARDS.md`

The derived coding standards from step 1.

#### `Dockerfile`

<template>

For **Node/TypeScript** projects. Install only the CLIs needed for the chosen profile:

**Claude only** — install Claude Code CLI only:

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

**Codex only** — install Codex CLI only:

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

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

**Hybrid** — install both CLIs:

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

For **Python** projects: Replace `node:22-bookworm` with `python:3.12-bookworm`. Adjust Codex install (pip or npm). Create the `agent` user from scratch instead of renaming the `node` user.

</template>

**Important:** The container must run as a non-root `agent` user:
- Claude Code CLI blocks `--dangerously-skip-permissions` as root.
- Codex CLI's app-server fails if `~/.codex/` is a bind-mounted directory — the `onSandboxReady` hook copies `auth.json` into an agent-owned directory instead.

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

Use `{{BRANCH}}` and `{{BASE_BRANCH}}` as template variables.

```markdown
# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff (against {{BASE_BRANCH}})

!`git diff {{BASE_BRANCH}}...HEAD`

## Commits on this branch

!`git log {{BASE_BRANCH}}..HEAD --oneline`

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
   - Base branch: {{BASE_BRANCH}}
4. After the PR is created, remove the `ready-for-agent` label from the issue so it is not picked up again:
   `gh issue edit <number> --remove-label ready-for-agent`

Do NOT merge the branches. Do NOT close the issues manually — the PR will close them when merged by the reviewer.

Once all PRs are created, output <promise>COMPLETE</promise>.
```

Replace `{{TYPECHECK_CMD}}` and `{{TEST_CMD}}` with the detected stack commands.

#### `main.mts`

Generate the orchestration loop. Use the AGENTS config from the **Agent Profiles** section matching the user's CLI choice. The hooks come from the **Auth Setup** section.

```typescript
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, resolve } from "path";
import { exec, execSync } from "child_process";

const MAX_ITERATIONS = 10;
const BASE_BRANCH = execSync("git rev-parse --verify main 2>/dev/null && echo main || echo master", { encoding: "utf-8" }).trim();
const BOARD_PORT = 4040;

// === Kanban Board Server ===
// Serves docs/ so the kanban board auto-refreshes during the run.
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".json": "application/json",
  ".css": "text/css",
  ".js": "application/javascript",
};

const docsDir = join(process.cwd(), "docs");
const server = createServer(async (req, res) => {
  if (req.url === "/api/shutdown") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Board server stopped.");
    server.close();
    return;
  }
  if (req.url === "/open") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<script>window.open("/kanban.html");setTimeout(()=>window.close(),500);</script>`);
    return;
  }
  const resolved = join(docsDir, req.url === "/" ? "kanban.html" : req.url!);
  const filePath = resolve(resolved);
  if (!filePath.startsWith(docsDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(BOARD_PORT, () => {
  const url = `http://localhost:${BOARD_PORT}`;
  console.log(`\n  Kanban board: ${url}\n`);
  const openCmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${openCmd} "${url}/open"`);
});

// === Agent Configuration ===
// Swap models here to change which agent handles each role.
// See SKILL.md Agent Profiles for the three preset configurations.
const AGENTS = {
  planner:     {{PLANNER_AGENT}},
  implementer: {{IMPLEMENTER_AGENT}},
  reviewer:    {{REVIEWER_AGENT}},
  prCreator:   {{PR_CREATOR_AGENT}},
};

const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: "{{INSTALL_CMD}}" },
      {{CODEX_AUTH_HOOK_LINE}}
    ],
  },
};

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // Phase 1: Plan
  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    maxIterations: 1,
    agent: AGENTS.planner,
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
        // Implement
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: AGENTS.implementer,
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        if (implement.commits.length > 0) {
          // Review
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: AGENTS.reviewer,
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
              BASE_BRANCH,
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

  // Phase 3: Create PRs
  await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "pr-creator",
    maxIterations: 1,
    agent: AGENTS.prCreator,
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues
        .map((i) => `- ${i.id}: ${i.title}`)
        .join("\n"),
      BASE_BRANCH,
    },
  });

  console.log("\nPRs created.");
}

console.log("\nAll done. Board still running at http://localhost:" + BOARD_PORT);
console.log("Press the shutdown button in the board or close this process to stop.");
```

**Template variable substitution:**

- `{{PLANNER_AGENT}}`, `{{IMPLEMENTER_AGENT}}`, `{{REVIEWER_AGENT}}`, `{{PR_CREATOR_AGENT}}` — from the Agent Profiles section matching the CLI choice.
- `{{INSTALL_CMD}}` — detected package install command (e.g., `npm install`).
- `{{CODEX_AUTH_HOOK_LINE}}` — based on config:
  - **Claude only (any auth):** remove this line entirely (no Codex hook needed)
  - **Codex/Hybrid + subscription:** `{ command: "mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json" },`
  - **Codex/Hybrid + API key:** `{ command: "printenv OPENAI_API_KEY | codex login --with-api-key" },`

### 3. Wire Up Dependencies

If `@ai-hero/sandcastle` is not already in the project's `package.json` devDependencies:

```bash
cd ~/ai-projects/<project-name>
npm install --save-dev @ai-hero/sandcastle
```

### 4. Push Issues to GitHub

Push the local issue files from `docs/issues/` to GitHub Issues so the Sandcastle plan-prompt can query them via `gh issue list`.

For each issue file in `docs/issues/`:

1. Parse the issue title, body, phase, type (AFK/HITL), and blocked-by from the file
2. Create a GitHub issue: `gh issue create --title "<title>" --body "<body>"`
3. Add the `ready-for-agent` label to AFK issues (not HITL, not Phase 0): `gh issue edit <number> --add-label ready-for-agent`
4. Add a phase label: `gh issue edit <number> --add-label "phase-<N>"`

Create the labels first if they don't exist:
```bash
gh label create ready-for-agent --description "Ready for Sandcastle agent pickup" --color 0E8A16
gh label create phase-0 --description "Phase 0: manual/provisioning" --color CCCCCC
gh label create phase-1 --description "Phase 1" --color 1D76DB
# ... for each phase in the project
```

### 5. Commit the Scaffold

```bash
cd ~/ai-projects/<project-name>
git add .sandcastle/
git commit -m "Add Sandcastle agent orchestration scaffold"
git push
```

### 6. Update ai-os-v2 Status

Update `projects/<project-name>/status.md` to `stage: sandcastle-ready`.

### 7. Print Summary and Setup Guide

Print the summary with the chosen configuration, then walk the user through auth setup step by step.

```
Sandcastle scaffold generated: ~/ai-projects/<project-name>/.sandcastle/

Files:
- main.mts           (orchestration loop — 10 iterations, parallel execution)
- plan-prompt.md      (dependency graph + issue selection)
- implement-prompt.md (TDD coding with RALPH: commits)
- review-prompt.md    (code clarity + standards enforcement)
- merge-prompt.md     (PR creation + label cleanup)
- CODING_STANDARDS.md (derived from PRD)
- Dockerfile          ({stack} base image + {cli_description})
- .env.example        ({auth_description})
- .gitignore          (excludes .env, logs/, worktrees/)

CLI: {Claude only | Codex only | Hybrid}
Auth: {Subscription | API key}

Agent config:
- Planner:     {model + effort}
- Implementer: {model + effort}
- Reviewer:    {model + effort}
- PR Creator:  {model + effort}

GitHub Issues: {N} issues pushed, {N} labeled ready-for-agent
```

Then print a **Setup Guide** tailored to the exact configuration. Only include steps relevant to the chosen auth mode and CLI:

**Subscription + Claude only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: claude setup-token
3. Run: gh auth token
4. Copy .env.example to .env and paste both tokens
5. Run: npx sandcastle
```

**Subscription + Codex only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: codex login (if not already logged in with ChatGPT subscription)
3. Copy ~/.codex/auth.json to .sandcastle/codex-auth.json
4. Run: gh auth token
5. Copy .env.example to .env and paste the GH_TOKEN
6. Run: npx sandcastle
```

**Subscription + Hybrid:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: claude setup-token
3. Run: codex login (if not already logged in with ChatGPT subscription)
4. Copy ~/.codex/auth.json to .sandcastle/codex-auth.json
5. Run: gh auth token
6. Copy .env.example to .env and paste CLAUDE_CODE_OAUTH_TOKEN + GH_TOKEN
7. Run: npx sandcastle
```

**API key + Claude only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your Anthropic API key from console.anthropic.com
3. Run: gh auth token
4. Copy .env.example to .env and fill in ANTHROPIC_API_KEY + GH_TOKEN
5. Run: npx sandcastle
```

**API key + Codex only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your OpenAI API key from platform.openai.com
3. Run: gh auth token
4. Copy .env.example to .env and fill in OPENAI_API_KEY + GH_TOKEN
5. Run: npx sandcastle
```

**API key + Hybrid:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your Anthropic API key from console.anthropic.com
3. Get your OpenAI API key from platform.openai.com
4. Run: gh auth token
5. Copy .env.example to .env and fill in all three keys
6. Run: npx sandcastle
```

## What to-sandcastle Does NOT Do

- Does not run Sandcastle (the user decides when)
- Does not create or fill `.env` with real secrets (that's Phase 0 / HITL)
- Does not install project dependencies beyond `@ai-hero/sandcastle`
- Does not modify existing project code
- Does not set up CI/CD or GitHub Actions
