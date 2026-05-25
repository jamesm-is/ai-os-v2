---
name: preflight
description: Verify the local machine has everything needed to run the ai-os-v2 pipeline and optionally Sandcastle agent orchestration.
---

# Preflight Check

Verify the local machine has everything needed to run the ai-os-v2 pipeline and optionally Sandcastle agent orchestration. Print a pass/fail checklist and actionable fix instructions for anything missing.

## Process

Run all checks below. For each, print a single line:

- `[pass]` — installed and working
- `[fail]` — missing or misconfigured, with a one-line fix instruction
- `[skip]` — not needed for the user's current intent

### Tier 1: Pipeline (always needed)

| Check | How to verify | Fix |
|---|---|---|
| **Git** | `git --version` | Install from https://git-scm.com |
| **Git user configured** | `git config user.name` and `git config user.email` both return values | `git config --global user.name "Name"` and `git config --global user.email "email"` |
| **GitHub CLI** | `gh --version` | Install from https://cli.github.com |
| **GitHub CLI authenticated** | `gh auth status` exits 0 | `gh auth login` |
| **about.md exists** | `context/about.md` exists in the repo | Copy `context/about.example.md` to `context/about.md` and fill in your details |

### Tier 2: Sandcastle (needed for agent orchestration)

Only check these if the user intends to run Sandcastle.

| Check | How to verify | Fix |
|---|---|---|
| **Node.js** | `node --version` (require v18+) | Install from https://nodejs.org |
| **Docker Desktop** | `docker info` exits 0 | Install from https://docker.com/products/docker-desktop |
| **Docker running** | `docker ps` exits 0 | Start Docker Desktop |
| **Claude Code CLI** | `claude --version` exits 0 | `npm install -g @anthropic-ai/claude-code` |
| **Codex CLI** | `codex --version` exits 0 | `npm install -g @openai/codex` |

### Tier 3: Auth (checked but not validated)

Print a brief reminder based on what CLIs are available:

- **Claude Code CLI present** → "For subscription auth: run `claude setup-token`. For API key auth: get your key from console.anthropic.com."
- **Codex CLI present** → "For subscription auth: run `codex login`. For API key auth: get your key from platform.openai.com."
