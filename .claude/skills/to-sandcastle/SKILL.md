---
name: to-sandcastle
description: Generate a .sandcastle/ scaffold for agent orchestration in a handed-off project. Use after /handoff, or when the user says "to-sandcastle", "set up sandcastle", "agent scaffold", or "prepare for agents".
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
6. **Ask the user three questions:**

   **Auth mode:**
   - **Subscription** — no API keys, uses existing Claude/ChatGPT subscriptions
   - **API key** — pay-per-token from API credits

   **CLI choice:**
   - **Claude only** — all agents run via Claude Code CLI
   - **Codex only** — all agents run via Codex CLI
   - **Cursor only** — all agents run via Cursor CLI (one CLI, one auth, one Docker image)
   - **Hybrid (Claude + Codex)** — Claude Code for planning/PR, Codex for implementation/review
   - **Hybrid (Claude + Cursor)** — Claude Code for planning/PR, Cursor for implementation/review
   - **Hybrid (Claude + Cursor + Codex)** — Claude Code for planning/PR, Cursor for implementation, Codex for review

   **Execution mode:**
   - **Full** — run all phases continuously until every issue has a PR
   - **Phase-by-phase** — complete the current phase (all its issues get PRs), then stop so the user can review and merge before the next phase starts

## Agent Profiles

The CLI choice determines which models fill each role:

| Role | Claude only | Codex only | Cursor only | Hybrid (Claude+Codex) | Hybrid (Claude+Cursor) | Hybrid (Claude+Cursor+Codex) |
|---|---|---|---|---|---|---|
| Planner | Opus 4.7 | GPT-5.5 high | Opus 4.7 (via Cursor) | Opus 4.7 | Opus 4.7 | Opus 4.7 |
| Implementer | Sonnet 4.6 | GPT-5.5 low | Composer 2.5 | GPT-5.5 low | Composer 2.5 | Composer 2.5 |
| Reviewer | Opus 4.6 | GPT-5.5 medium | GPT-5.5 high (via Cursor) | GPT-5.5 high | GPT-5.5 high (via Cursor) | GPT-5.5 high (via Codex) |
| PR Creator | Opus 4.7 | GPT-5.5 high | Opus 4.7 (via Cursor) | Opus 4.7 | Opus 4.7 | Opus 4.7 |

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

**Cursor only:**
```typescript
const AGENTS = {
  planner:     cursorAgent("claude-opus-4-7-xhigh"),
  implementer: cursorAgent("composer-2.5"),
  reviewer:    cursorAgent("gpt-5.5-high"),
  prCreator:   cursorAgent("claude-opus-4-7-xhigh"),
};
```

**Hybrid (Claude + Codex):**
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: sandcastle.codex("gpt-5.5", { effort: "low" }),
  reviewer:    sandcastle.codex("gpt-5.5", { effort: "high" }),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

**Hybrid (Claude + Cursor):**
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: cursorAgent("composer-2.5"),
  reviewer:    cursorAgent("gpt-5.5-high"),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

**Hybrid (Claude + Cursor + Codex):**
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: cursorAgent("composer-2.5"),
  reviewer:    sandcastle.codex("gpt-5.5", { effort: "high" }),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

### Cursor Agent Provider

When Cursor is used (Cursor only, or Hybrid Claude+Cursor), add this provider function at the top of `main.mts`, before the `AGENTS` constant:

```typescript
import type { AgentProvider } from "@ai-hero/sandcastle";

function cursorAgent(model: string): AgentProvider {
  const shellEscape = (s: string) => "'" + s.replace(/'/g, "'\\''") + "'";

  return {
    name: "cursor",
    env: {},
    captureSessions: false,

    buildPrintCommand({ prompt }) {
      return {
        command: `agent --print --force --trust --output-format stream-json --model ${shellEscape(model)}`,
        stdin: prompt,
      };
    },

    parseStreamLine(line: string) {
      if (!line.startsWith("{")) return [];
      try {
        const obj = JSON.parse(line);

        if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
          const texts: string[] = [];
          for (const block of obj.message.content) {
            if (block.type === "text" && typeof block.text === "string") {
              texts.push(block.text);
            }
          }
          if (texts.length > 0) {
            return [{ type: "text" as const, text: texts.join("") }];
          }
          return [];
        }

        if (obj.type === "tool_call" && obj.subtype === "started") {
          const tc = obj.tool_call;
          if (tc?.shellToolCall?.args?.command) {
            return [{ type: "tool_call" as const, name: "Bash", args: tc.shellToolCall.args.command }];
          }
          if (tc?.readToolCall?.args?.path) {
            return [{ type: "tool_call" as const, name: "Read", args: tc.readToolCall.args.path }];
          }
          if (tc?.editToolCall?.args?.path) {
            return [{ type: "tool_call" as const, name: "Edit", args: tc.editToolCall.args.path }];
          }
          if (tc?.globToolCall?.args?.globPattern) {
            return [{ type: "tool_call" as const, name: "Glob", args: tc.globToolCall.args.globPattern }];
          }
          if (tc?.grepToolCall?.args?.pattern) {
            return [{ type: "tool_call" as const, name: "Grep", args: tc.grepToolCall.args.pattern }];
          }
          return [];
        }

        if (obj.type === "result" && typeof obj.result === "string") {
          return [{ type: "result" as const, result: obj.result }];
        }

        if (obj.type === "system" && obj.subtype === "init" && typeof obj.session_id === "string") {
          return [{ type: "session_id" as const, sessionId: obj.session_id }];
        }
      } catch {
        // Not valid JSON — skip
      }
      return [];
    },
  };
}
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

**Cursor only:**
```
GH_TOKEN=                  # run: gh auth token
# Cursor: mount %APPDATA%\Cursor\auth.json read-only — copied by onSandboxReady hook
```
Hook: `mkdir -p ~/.config/cursor && cp /mnt/cursor-auth.json ~/.config/cursor/auth.json`

**Hybrid (Claude + Codex):**
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
# Codex: mount ~/.codex/auth.json read-only — copied by onSandboxReady hook
```
Hook: `mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json`

**Hybrid (Claude + Cursor):**
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
# Cursor: mount %APPDATA%\Cursor\auth.json read-only — copied by onSandboxReady hook
```
Hook: `mkdir -p ~/.config/cursor && cp /mnt/cursor-auth.json ~/.config/cursor/auth.json`

**Hybrid (Claude + Cursor + Codex):**
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
# Cursor: mount %APPDATA%\Cursor\auth.json read-only — copied by onSandboxReady hook
# Codex: mount ~/.codex/auth.json read-only — copied by onSandboxReady hook
```
Hooks:
- `mkdir -p ~/.config/cursor && cp /mnt/cursor-auth.json ~/.config/cursor/auth.json`
- `mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json`

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

**Cursor only:**
```
CURSOR_API_KEY=
GH_TOKEN=
```
No special hook needed. Hook: just `{{INSTALL_CMD}}`.

**Hybrid (Claude + Codex):**
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GH_TOKEN=
```
Hook: `printenv OPENAI_API_KEY | codex login --with-api-key`

**Hybrid (Claude + Cursor):**
```
ANTHROPIC_API_KEY=
CURSOR_API_KEY=
GH_TOKEN=
```
No special hook needed beyond `{{INSTALL_CMD}}`.

**Hybrid (Claude + Cursor + Codex):**
```
ANTHROPIC_API_KEY=
CURSOR_API_KEY=
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

**Cursor only** — install Cursor CLI only:

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

# Cursor CLI (installs to user home)
RUN curl https://cursor.com/install -fsS | bash
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

**Hybrid (Claude + Codex)** — install Claude Code + Codex CLIs:

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

**Hybrid (Claude + Cursor)** — install Claude Code + Cursor CLIs:

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
# Cursor CLI (installs to user home)
RUN curl https://cursor.com/install -fsS | bash
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

**Hybrid (Claude + Cursor + Codex)** — install all three CLIs:

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
# Cursor CLI (installs to user home)
RUN curl https://cursor.com/install -fsS | bash
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

For **Python** projects: Replace `node:22-bookworm` with `python:3.12-bookworm`. Adjust Codex install (pip or npm). Create the `agent` user from scratch instead of renaming the `node` user.

</template>

**Important:** The container must run as a non-root `agent` user:
- Claude Code CLI blocks `--dangerously-skip-permissions` as root.
- Codex CLI's app-server fails if `~/.codex/` is a bind-mounted directory — the `onSandboxReady` hook copies `auth.json` into an agent-owned directory instead.
- Cursor CLI subscription auth: mount `cursor-auth.json` read-only to `/mnt/cursor-auth.json`, copy to `~/.config/cursor/auth.json` via hook (same pattern as Codex). Source file: `%APPDATA%\Cursor\auth.json` on Windows.
- Cursor CLI API key auth: `CURSOR_API_KEY` env var — no file mounts needed.

#### `plan-prompt.md`

```markdown
# ISSUES

Here are the open issues ready for work:

<issues-json>
{{ISSUES_JSON}}
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
const EXECUTION_MODE: "full" | "phase-by-phase" = "{{EXECUTION_MODE}}";

// === Issue Fetching ===
function fetchReadyIssues(phaseLabel?: string): string {
  const labelArgs = phaseLabel
    ? `--label ready-for-agent --label ${phaseLabel}`
    : "--label ready-for-agent";
  return execSync(
    `gh issue list --state open ${labelArgs} --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`,
    { encoding: "utf-8" },
  );
}

function getLowestOpenPhase(): number | null {
  const raw = execSync(
    "gh issue list --state open --label ready-for-agent --json labels --jq '[.[].labels[].name]'",
    { encoding: "utf-8" },
  );
  const labels: string[] = JSON.parse(raw);
  const phases = [...new Set(
    labels
      .filter((l: string) => l.startsWith("phase-"))
      .map((l: string) => parseInt(l.replace("phase-", ""), 10))
      .filter((n: number) => !isNaN(n)),
  )];
  return phases.length > 0 ? Math.min(...phases) : null;
}

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
  if (req.url === "/api/issues") {
    try {
      const gh = execSync(
        'gh issue list --state all --json number,title,state,labels --jq \'[.[] | {number, title, state, labels: [.labels[].name]}]\'',
        { encoding: "utf-8", timeout: 15000 },
      );
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
      res.end(gh);
    } catch {
      res.writeHead(502);
      res.end(JSON.stringify({ error: "Failed to query GitHub issues" }));
    }
    return;
  }
  const pathname = req.url === "/" ? "kanban.html" : new URL(req.url!, "http://localhost").pathname;
  const resolved = join(docsDir, pathname);
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
const AGENTS = {
  planner:     {{PLANNER_AGENT}},
  implementer: {{IMPLEMENTER_AGENT}},
  reviewer:    {{REVIEWER_AGENT}},
  prCreator:   {{PR_CREATOR_AGENT}},
};

// === Docker Sandbox Factory ===
// When subscription auth requires file mounts (Cursor/Codex auth.json),
// this factory wires them in so every sandbox gets the same mounts.
{{DOCKER_SANDBOX_FACTORY}}

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

  // Determine target phase and fetch issues
  let currentPhase: number | null = null;
  let issuesJson: string;

  if (EXECUTION_MODE === "phase-by-phase") {
    currentPhase = getLowestOpenPhase();
    if (currentPhase === null) {
      console.log("No open phases with ready-for-agent issues. Exiting.");
      break;
    }
    console.log(`Phase-by-phase mode: targeting Phase ${currentPhase}`);
    issuesJson = fetchReadyIssues(`phase-${currentPhase}`);
  } else {
    issuesJson = fetchReadyIssues();
  }

  const parsedIssues = JSON.parse(issuesJson);
  if (parsedIssues.length === 0) {
    console.log("No ready-for-agent issues found. Exiting.");
    break;
  }

  // Plan
  const plan = await sandcastle.run({
    hooks,
    sandbox: createDockerSandbox(),
    name: "planner",
    maxIterations: 1,
    agent: AGENTS.planner,
    promptFile: "./.sandcastle/plan-prompt.md",
    promptArgs: { ISSUES_JSON: issuesJson },
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
        sandbox: createDockerSandbox(),
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
    sandbox: createDockerSandbox(),
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

  // Phase gate: stop after current phase completes
  if (EXECUTION_MODE === "phase-by-phase" && currentPhase !== null) {
    const remaining = JSON.parse(fetchReadyIssues(`phase-${currentPhase}`));
    if (remaining.length === 0) {
      console.log(`\n=== Phase ${currentPhase} complete ===`);
      console.log("All issues in this phase have PRs. Review and merge them,");
      console.log("then restart Sandcastle to begin the next phase.");
      break;
    }
    console.log(`\nPhase ${currentPhase}: ${remaining.length} issue(s) remaining. Continuing...`);
  }
}

console.log("\nAll done. Board still running at http://localhost:" + BOARD_PORT);
console.log("Press the shutdown button in the board or close this process to stop.");
```

**Template variable substitution:**

- `{{PLANNER_AGENT}}`, `{{IMPLEMENTER_AGENT}}`, `{{REVIEWER_AGENT}}`, `{{PR_CREATOR_AGENT}}` — from the Agent Profiles section matching the CLI choice.
- `{{EXECUTION_MODE}}` — `"full"` or `"phase-by-phase"` based on the user's execution mode choice.
- `{{INSTALL_CMD}}` — detected package install command (e.g., `npm install`).
- `{{ISSUES_JSON}}` — not a static template variable. Populated at runtime by `main.mts` via `fetchReadyIssues()` and passed as a `promptArg` to the planner. No substitution needed during scaffold generation.
- `{{CODEX_AUTH_HOOK_LINE}}` — based on config:
  - **Claude only (any auth):** remove this line entirely
  - **Codex only / Hybrid (Claude+Codex) + subscription:** `{ command: "mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json" },`
  - **Codex only / Hybrid (Claude+Codex) + API key:** `{ command: "printenv OPENAI_API_KEY | codex login --with-api-key" },`
  - **Cursor only / Hybrid (Claude+Cursor) + subscription:** `{ command: "mkdir -p ~/.config/cursor && cp /mnt/cursor-auth.json ~/.config/cursor/auth.json" },`
  - **Cursor only / Hybrid (Claude+Cursor) + API key:** remove this line entirely (CURSOR_API_KEY env var is sufficient)
  - **Hybrid (Claude+Cursor+Codex) + subscription:** two hook lines:
    `{ command: "mkdir -p ~/.config/cursor && cp /mnt/cursor-auth.json ~/.config/cursor/auth.json" },`
    `{ command: "mkdir -p ~/.codex && cp /mnt/codex-auth.json ~/.codex/auth.json" },`
  - **Hybrid (Claude+Cursor+Codex) + API key:** `{ command: "printenv OPENAI_API_KEY | codex login --with-api-key" },` (CURSOR_API_KEY env var is sufficient)
- `{{DOCKER_SANDBOX_FACTORY}}` — based on config:
  - **No file mounts needed** (Claude only, API key configs, Cursor API key): `const createDockerSandbox = () => docker();`
  - **Codex subscription auth mount only** (Codex only sub, Hybrid Claude+Codex sub):
    ```typescript
    const CODEX_AUTH_PATH = join(process.cwd(), ".sandcastle", "codex-auth.json");
    const createDockerSandbox = () => docker({
      mounts: [{ hostPath: CODEX_AUTH_PATH, sandboxPath: "/home/agent/.codex-auth.json", readonly: true }],
    });
    ```
  - **Cursor subscription auth mount only** (Cursor only sub, Hybrid Claude+Cursor sub):
    ```typescript
    const CURSOR_AUTH_PATH = join(process.cwd(), ".sandcastle", "cursor-auth.json");
    const createDockerSandbox = () => docker({
      mounts: [{ hostPath: CURSOR_AUTH_PATH, sandboxPath: "/home/agent/.cursor-auth.json", readonly: true }],
    });
    ```
  - **Both Cursor + Codex subscription auth mounts** (Hybrid Claude+Cursor+Codex sub):
    ```typescript
    const CURSOR_AUTH_PATH = join(process.cwd(), ".sandcastle", "cursor-auth.json");
    const CODEX_AUTH_PATH = join(process.cwd(), ".sandcastle", "codex-auth.json");
    const createDockerSandbox = () => docker({
      mounts: [
        { hostPath: CURSOR_AUTH_PATH, sandboxPath: "/home/agent/.cursor-auth.json", readonly: true },
        { hostPath: CODEX_AUTH_PATH, sandboxPath: "/home/agent/.codex-auth.json", readonly: true },
      ],
    });
    ```

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

CLI: {Claude only | Codex only | Cursor only | Hybrid (Claude+Codex) | Hybrid (Claude+Cursor) | Hybrid (Claude+Cursor+Codex)}
Auth: {Subscription | API key}
Execution: {Full | Phase-by-phase}

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

**Subscription + Hybrid (Claude + Codex):**
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

**Subscription + Cursor only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: agent login (if not already logged in with Cursor Pro subscription)
3. Copy %APPDATA%\Cursor\auth.json to .sandcastle/cursor-auth.json
4. Run: gh auth token
5. Copy .env.example to .env and paste the GH_TOKEN
6. Run: npx sandcastle
```

**Subscription + Hybrid (Claude + Cursor):**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: claude setup-token
3. Run: agent login (if not already logged in with Cursor Pro subscription)
4. Copy %APPDATA%\Cursor\auth.json to .sandcastle/cursor-auth.json
5. Run: gh auth token
6. Copy .env.example to .env and paste CLAUDE_CODE_OAUTH_TOKEN + GH_TOKEN
7. Run: npx sandcastle
```

**Subscription + Hybrid (Claude + Cursor + Codex):**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Run: claude setup-token
3. Run: agent login (if not already logged in with Cursor Pro subscription)
4. Copy %APPDATA%\Cursor\auth.json to .sandcastle/cursor-auth.json
5. Run: codex login (if not already logged in with ChatGPT subscription)
6. Copy ~/.codex/auth.json to .sandcastle/codex-auth.json
7. Run: gh auth token
8. Copy .env.example to .env and paste CLAUDE_CODE_OAUTH_TOKEN + GH_TOKEN
9. Build Docker image: docker build -t sandcastle:<project-name> .sandcastle/
10. Run: npx tsx .sandcastle/main.mts
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

**API key + Hybrid (Claude + Codex):**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your Anthropic API key from console.anthropic.com
3. Get your OpenAI API key from platform.openai.com
4. Run: gh auth token
5. Copy .env.example to .env and fill in all three keys
6. Run: npx sandcastle
```

**API key + Cursor only:**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Generate a Cursor API key from cursor.com/dashboard/integrations
3. Run: gh auth token
4. Copy .env.example to .env and fill in CURSOR_API_KEY + GH_TOKEN
5. Run: npx sandcastle
```

**API key + Hybrid (Claude + Cursor):**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your Anthropic API key from console.anthropic.com
3. Generate a Cursor API key from cursor.com/dashboard/integrations
4. Run: gh auth token
5. Copy .env.example to .env and fill in ANTHROPIC_API_KEY + CURSOR_API_KEY + GH_TOKEN
6. Run: npx sandcastle
```

**API key + Hybrid (Claude + Cursor + Codex):**
```
Setup:
1. Complete all Phase 0 issues (provisioning, secrets, external setup)
2. Get your Anthropic API key from console.anthropic.com
3. Generate a Cursor API key from cursor.com/dashboard/integrations
4. Get your OpenAI API key from platform.openai.com
5. Run: gh auth token
6. Copy .env.example to .env and fill in ANTHROPIC_API_KEY + CURSOR_API_KEY + OPENAI_API_KEY + GH_TOKEN
7. Run: npx sandcastle
```

## What to-sandcastle Does NOT Do

- Does not run Sandcastle (the user decides when)
- Does not create or fill `.env` with real secrets (that's Phase 0 / HITL)
- Does not install project dependencies beyond `@ai-hero/sandcastle`
- Does not modify existing project code
- Does not set up CI/CD or GitHub Actions
