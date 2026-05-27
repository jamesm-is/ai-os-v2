---
name: preflight
description: Check that the local machine has all prerequisites for the ai-os-v2 pipeline and Sandcastle. Use when setting up for the first time, on a new machine, before a first Sandcastle run, or when something fails unexpectedly. Also trigger on "preflight", "check setup", "what do I need", or "is my machine ready".
---

# Preflight Check

Verify the local machine has everything needed to run the ai-os-v2 pipeline and optionally Sandcastle agent orchestration. Print a pass/fail checklist and actionable fix instructions for anything missing.

## Process

Run all checks below. For each, print a single line:

- `[pass]` — installed and working
- `[fail]` — missing or misconfigured, with a one-line fix instruction
- `[skip]` — not needed for the user's current intent

### Tier 1: Pipeline (always needed)

These are required for the core pipeline (align → handoff).

| Check | How to verify | Fix |
|---|---|---|
| **Git** | `git --version` | Install from https://git-scm.com |
| **Git user configured** | `git config user.name` and `git config user.email` both return values | `git config --global user.name "Name"` and `git config --global user.email "email"` |
| **GitHub CLI** | `gh --version` | Install from https://cli.github.com |
| **GitHub CLI authenticated** | `gh auth status` exits 0 | `gh auth login` |
| **about.md exists** | `context/about.md` exists in the repo | Copy `context/about.example.md` to `context/about.md` and fill in your details |

### Tier 2: Sandcastle (needed for agent orchestration)

Only check these if the user intends to run Sandcastle. Ask once: "Are you planning to use Sandcastle for agent orchestration?" If no, mark all Tier 2 as `[skip]`.

| Check | How to verify | Fix |
|---|---|---|
| **Node.js** | `node --version` (require v18+) | Install from https://nodejs.org |
| **Docker Desktop** | `docker info` exits 0 | Install from https://docker.com/products/docker-desktop, then start it |
| **Docker running** | `docker ps` exits 0 | Start Docker Desktop |
| **Claude Code CLI** | `claude --version` exits 0 | `curl -fsSL https://claude.ai/install.sh | bash` (or `npm install -g @anthropic-ai/claude-code`) |
| **Codex CLI** | `codex --version` exits 0 | `npm install -g @openai/codex` |

For Claude Code and Codex CLI: at least one must be present. Both are needed for hybrid mode. Report which are available and note the CLI configurations they support:
- Claude only: needs Claude Code CLI
- Codex only: needs Codex CLI
- Hybrid: needs both

### Tier 3: Auth (checked but not validated)

Auth tokens and API keys can't be validated without making API calls. Just check that the user knows what they'll need.

After the checklist, print a brief reminder based on what CLIs are available:

- **Claude Code CLI present** → "For subscription auth: run `claude setup-token`. For API key auth: get your key from console.anthropic.com."
- **Codex CLI present** → "For subscription auth: run `codex login`. For API key auth: get your key from platform.openai.com."

## Output Format

```
Preflight Check — ai-os-v2
==========================

Pipeline:
  [pass] Git 2.45.0
  [pass] Git user: James <james@example.com>
  [pass] GitHub CLI 2.62.0
  [pass] GitHub CLI authenticated as jamesm-is
  [fail] about.md — copy context/about.example.md to context/about.md

Sandcastle:
  [pass] Node.js 22.11.0
  [pass] Docker Desktop running
  [pass] Claude Code CLI 1.x.x
  [pass] Codex CLI 1.x.x
  → Supports: Claude only, Codex only, Hybrid

Auth reminder:
  Claude: run `claude setup-token` (subscription) or set ANTHROPIC_API_KEY (API key)
  Codex: run `codex login` (subscription) or set OPENAI_API_KEY (API key)

Result: 9/10 checks passed. Fix 1 issue above.
```

Adapt the output to the actual results. If everything passes, end with:

```
Result: All checks passed. Ready to run the pipeline.
```
