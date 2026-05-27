# ai-os-v2

A project launcher for AI coding agents. Takes a raw app idea, runs a structured alignment process, and produces a self-governing project repo with autonomous agent orchestration built in.

Works with Claude Code, Codex, or any AI coding agent that can read markdown instructions. The pipeline is the same — only the interface differs (slash commands vs. reading skill files directly).

This is not an app framework or a template generator. It's a thinking environment — a pipeline that forces you to resolve ambiguity, derive a tech stack from requirements, and decompose work into vertical slices before any code gets written.

## What it does

```
Raw idea → Alignment grill → PRD → Vertical slice issues → Slice audit → Project repo → Agent orchestration
```

Every project flows through the pipeline, run in order:

| Step | Skill | What happens |
|---|---|---|
| 1 | align | Grill you on the idea. Resolve domain terms, derive tech stack from constraints, lock decisions. |
| 2 | to-prd | Synthesize a PRD from alignment outputs. No re-interviewing — just synthesis. |
| 3 | to-issues | Decompose PRD into vertical slice issues with dependencies and phase labels. |
| 4 | validate-slices | Audit every issue for vertical slice quality. Catches horizontal decomposition, Phase 0 leakage, and missing acceptance criteria. |
| 5 | handoff | Create the project repo with all artifacts, install skills, and push to GitHub. |

After step 5, the project is fully self-governing. ai-os-v2's job is done.

**Post-handoff (optional):** to-sandcastle — generate agent orchestration scaffold (Dockerfile, prompts, orchestration loop). You choose your CLI (Claude Code, Codex, Cursor, or hybrid), auth mode (subscription or API key), execution mode (full or phase-by-phase), and merge strategy (auto-merge or human-merge).

## What you get at the end

A project repo in `~/ai-projects/<project-name>/` with:

- **CLAUDE.md** — project boot file for Claude Code
- **AGENTS.md** — project boot file for Codex / other agents
- **CONTEXT.md** — domain glossary built during alignment (the source of truth for terminology)
- **docs/prd.md** — full product requirements document
- **docs/issues/** — vertical slice issue files (pushed to GitHub Issues via to-sandcastle)
- **docs/slice-audit.md** — vertical slice audit report from validate-slices
- **docs/kanban.html** — visual kanban board (open in browser, auto-refreshes every 30s)
- **docs/kanban-state.json** — board state (updated by Sandcastle agents during autonomous runs)
- **docs/adr/** — architectural decision records
- **.claude/skills/** — pipeline and utility skills as Claude Code slash commands
- **.agents/skills/** — same skills in Codex app format (auto-discovered as `/commands` in Codex)
- **relays/** — shared relay directory for session handoffs (agent-neutral, gitignored)
- **.sandcastle/** — autonomous agent orchestration (after to-sandcastle):
  - `main.mts` — orchestration loop (plan → implement → review → PR)
  - `Dockerfile` — containerized build environment (CLIs installed match your chosen configuration)
  - `plan-prompt.md` — dependency graph analysis and issue selection
  - `implement-prompt.md` — TDD coding with vertical slices
  - `review-prompt.md` — code quality and standards enforcement
  - `merge-prompt.md` — PR creation and label cleanup
  - `CODING_STANDARDS.md` — derived from your PRD

### Self-governing projects

Handoff installs the pipeline skills into the project repo, adapted for existing-codebase context. This means a live project can run the full planning loop — align, PRD, issues, validation — for new features without returning to ai-os-v2. The only skill that stays ai-os-v2-only is handoff itself, since its job is creating new repos.

### Session relay

When you need to hand off context between sessions (or between agents), use the relay skills:

- **relay** — compacts the current conversation into a relay document saved to `relays/` at repo root. Includes decisions made, current state, and suggested next skills. Works from both Claude Code and Codex.
- **relay-handoff** — lists available relays, lets you pick one up, loads it into context, and marks it done with a `DONE-` prefix. Supports `--all` to also show completed relays for reference.

The `relays/` directory is gitignored — relay files are local-only session artifacts, not project documentation.

### Agent configuration (Sandcastle)

During to-sandcastle, you pick four settings:

**CLI configuration** — six options: Claude only, Codex only, Cursor only, Hybrid (Claude+Codex), Hybrid (Claude+Cursor), or Hybrid (Claude+Cursor+Codex). Each determines which models fill each agent role:

| Role | Claude only | Codex only | Cursor only | Hybrid (Claude+Codex) | Hybrid (Claude+Cursor) | Hybrid (Claude+Cursor+Codex) |
|---|---|---|---|---|---|---|
| Planner | Opus 4.7 | GPT-5.5 (high) | Opus 4.7 (via Cursor) | Opus 4.7 | Opus 4.7 | Opus 4.7 |
| Implementer | Sonnet 4.6 | GPT-5.5 (low) | Composer 2.5 | GPT-5.5 (low) | Composer 2.5 | Composer 2.5 |
| Reviewer | Opus 4.6 | GPT-5.5 (medium) | GPT-5.5 (high via Cursor) | GPT-5.5 (high) | GPT-5.5 (high via Cursor) | GPT-5.5 (high via Codex) |
| PR Creator | Opus 4.7 | GPT-5.5 (high) | Opus 4.7 (via Cursor) | Opus 4.7 | Opus 4.7 | Opus 4.7 |

**Auth mode:**
- **Subscription** — uses existing Claude / ChatGPT subscriptions (no API keys)
- **API key** — pay-per-token from Anthropic / OpenAI credits

**Execution mode:**
- **Full** — run all phases continuously until every issue has a PR
- **Phase-by-phase** — complete the current phase, then stop

**Merge strategy:**
- **Auto-merge** — the orchestration script runs typecheck/test/build on each PR and merges automatically if all pass. Falls back to manual merge on failure.
- **Human-merge** — pauses after PRs are created and waits for you to review and merge

The Dockerfile, `.env.example`, and `main.mts` are all generated to match your configuration. Each issue gets its own Docker container and branch. The loop runs until all issues are resolved or the iteration cap is hit.

## Prerequisites

- An AI coding agent ([Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://openai.com/index/codex/), or similar)
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- For Sandcastle: Docker Desktop, Node.js 18+, plus credentials matching your chosen CLI + auth mode. The sandcastle SDK is vendored in `vendor/sandcastle/` — no npm install needed.

## Getting started

1. Clone this repo:
   ```
   git clone https://github.com/jamesm-is/ai-os-v2.git
   cd ai-os-v2
   ```

2. Copy `context/about.example.md` to `context/about.md` and fill in your details. This shapes how the alignment grill behaves.

3. Run the preflight check to verify your machine has everything needed:

   **Claude Code:** `/preflight` | **Codex:** `/preflight` (auto-discovered from `.agents/skills/`)

4. Start your AI agent in the repo and describe your app idea, then run the pipeline.

### Claude Code

Skills are auto-discovered as slash commands from `.claude/skills/`:

```
/align
```

Follow the pipeline in order. Each skill tells you what to run next.

### Codex

Skills are auto-discovered as slash commands from `.agents/skills/`:

```
/align
```

Your agent reads `AGENTS.md` as its boot file. Run each skill in order: `/align` → `/to-prd` → `/to-issues` → `/validate-slices` → `/handoff`.

## Skills

Ten skills total, installed in both `.claude/skills/` and `.agents/skills/`:

| Skill | Category | Description |
|---|---|---|
| align | Pipeline | Grill the user on the idea, build domain glossary, derive tech stack |
| to-prd | Pipeline | Synthesize PRD from alignment outputs |
| to-issues | Pipeline | Decompose PRD into vertical slice issues |
| validate-slices | Pipeline | Audit issues for vertical slice quality |
| handoff | Pipeline | Create project repo with artifacts and skills |
| to-sandcastle | Post-handoff | Generate autonomous agent orchestration scaffold |
| improve-codebase-architecture | Architecture | Surface deepening opportunities for testability |
| relay | Utility | Compact conversation into a relay document for session handoff |
| relay-handoff | Utility | Pick up a relay from a previous session |
| preflight | Utility | Verify local machine prerequisites |

## Design principles

- **No default tech stack.** Every project earns its stack from its requirements. The grill derives the stack from constraints, not from habit.
- **No code in ai-os-v2.** This is a thinking environment. Code lives in project repos.
- **Vertical slices, not horizontal layers.** Issues cut through all layers end-to-end. Each is independently demoable. Validated before handoff.
- **Alignment before implementation.** The grill forces you to resolve ambiguity upfront. Cheaper to change a decision in a doc than in code.
- **Self-governing projects.** Once handed off, the project repo has everything it needs — spec, glossary, issues, skills, agent orchestration. It doesn't depend on ai-os-v2.
- **AI-agnostic.** The pipeline works with any agent that can read markdown. Claude Code gets `.claude/skills/`; Codex gets `.agents/skills/`. Same pipeline, same outputs.

## Project structure

```
ai-os-v2/
├── .claude/                       # Claude Code integration
│   ├── settings.json              #   permissions
│   └── skills/                    #   skills (auto-discovered as /commands)
│       ├── align/
│       ├── to-prd/
│       ├── to-issues/
│       ├── validate-slices/
│       ├── handoff/
│       ├── to-sandcastle/
│       ├── improve-codebase-architecture/
│       ├── relay/
│       ├── relay-handoff/
│       └── preflight/
├── .agents/                       # Codex integration
│   └── skills/                    #   skills (auto-discovered as /commands in Codex)
│       ├── align/
│       ├── to-prd/
│       ├── to-issues/
│       ├── validate-slices/
│       ├── handoff/
│       ├── to-sandcastle/
│       ├── improve-codebase-architecture/
│       ├── relay/
│       ├── relay-handoff/
│       └── preflight/
├── vendor/
│   └── sandcastle/                # Vendored sandcastle SDK v0.6.3 (dist/ + src/)
├── relays/                        # Session relay files (gitignored)
├── templates/
│   └── kanban.html                # Kanban board template (copied to projects at handoff)
├── context/
│   ├── about.example.md           # Profile template (copy to about.md)
│   └── operating-rules.md        # Pipeline rules and conventions
├── projects/                      # Alignment artifacts per project
├── logs/sessions/                 # Session logs
├── CLAUDE.md                      # Boot file (Claude Code)
├── AGENTS.md                      # Boot file (Codex / other agents)
└── README.md
```

## License

MIT
