# ai-os-v2

A project launcher for Claude Code. Takes a raw app idea, runs a structured alignment process, and produces a self-governing project repo with autonomous agent orchestration built in.

This is not an app framework or a template generator. It's a thinking environment — a pipeline that forces you to resolve ambiguity, derive a tech stack from requirements, and decompose work into vertical slices before any code gets written.

## What it does

```
Raw idea → Alignment grill → PRD → Vertical slice issues → Slice audit → Project repo → Agent orchestration
```

Every project flows through the pipeline, run in order:

| Step | Skill | What happens |
|---|---|---|
| 1 | `/align` | Grill you on the idea. Resolve domain terms, derive tech stack from constraints, lock decisions. |
| 2 | `/to-prd` | Synthesize a PRD from alignment outputs. No re-interviewing — just synthesis. |
| 3 | `/to-issues` | Decompose PRD into vertical slice issues with dependencies and phase labels. |
| 4 | `/validate-slices` | Audit every issue for vertical slice quality. Catches horizontal decomposition, Phase 0 leakage, and missing acceptance criteria. |
| 5 | `/handoff` | Create the project repo with all artifacts, install skills, and push to GitHub. |

After step 5, the project is fully self-governing. ai-os-v2's job is done.

**Post-handoff (optional):** `/to-sandcastle` — generate agent orchestration scaffold (Dockerfile, prompts, orchestration loop) with subscription or API key auth.

## What you get at the end

A project repo in `~/ai-projects/<project-name>/` with:

- **CLAUDE.md** — project boot file for Claude Code
- **AGENTS.md** — project boot file for Codex / other agents
- **CONTEXT.md** — domain glossary built during alignment (the source of truth for terminology)
- **docs/prd.md** — full product requirements document
- **docs/issues/** — vertical slice issue files (pushed to GitHub Issues via `/to-sandcastle`)
- **docs/slice-audit.md** — vertical slice audit report from validate-slices
- **docs/kanban.html** — visual kanban board (open in browser, auto-refreshes every 30s)
- **docs/kanban-state.json** — board state (updated by Sandcastle agents during autonomous runs)
- **docs/adr/** — architectural decision records
- **.claude/skills/** — full pipeline and utility skills (Claude Code slash commands):
  - Pipeline: align, to-prd, to-issues, validate-slices, to-sandcastle (adapted for project-repo paths)
  - Architecture: improve-codebase-architecture (codebase deepening and refactoring audits)
  - Utility: relay (session context handoff)
- **agents/skills/** — tool-neutral mirror of all skills (flat markdown, no frontmatter — for Codex / other agents)
- **.sandcastle/** — autonomous agent orchestration (after `/to-sandcastle`):
  - `main.mts` — orchestration loop (plan → implement → review → PR)
  - `Dockerfile` — containerized build environment with Claude Code + Codex CLI
  - `plan-prompt.md` — dependency graph analysis and issue selection
  - `implement-prompt.md` — TDD coding with vertical slices
  - `review-prompt.md` — code quality and standards enforcement
  - `merge-prompt.md` — PR creation and label cleanup
  - `CODING_STANDARDS.md` — derived from your PRD

### Self-governing projects

Handoff installs the pipeline skills into the project repo, adapted for existing-codebase context. This means a live project can run the full planning loop — align, PRD, issues, validation — for new features without returning to ai-os-v2. The only skill that stays ai-os-v2-only is `/handoff` itself, since its job is creating new repos.

### Agent configuration (Sandcastle)

| Role | Model | Why |
|---|---|---|
| Planner | Claude Opus 4.7 | Judgment calls — dependency analysis, issue prioritization |
| Implementer | GPT-5.5 (low effort) | Volume TDD coding work |
| Reviewer | GPT-5.5 (high effort) | Deeper analysis — correctness, style, standards |
| PR Creator | Claude Opus 4.7 | Judgment calls — PR quality, issue linking |

Issues are worked in parallel. Each gets its own Docker container and branch. The loop runs until all issues are resolved or the iteration cap is hit.

## Prerequisites

- An AI coding agent ([Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://openai.com/index/codex/), or similar)
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- For Sandcastle: `@ai-hero/sandcastle` (installed automatically during `/to-sandcastle`), plus either subscription tokens (Claude + ChatGPT) or API keys (Anthropic + OpenAI)

## Getting started

1. Clone this repo:
   ```
   git clone https://github.com/jamesm-is/ai-os-v2.git
   cd ai-os-v2
   ```

2. Copy `context/about.example.md` to `context/about.md` and fill in your details. This shapes how the alignment grill behaves.

3. Start your AI agent in the repo and describe your app idea, then run the pipeline.

### Claude Code

Skills are auto-discovered as slash commands:

```
/align
```

Follow the pipeline in order. Each skill tells you what to run next.

### Codex / other agents

The same skills are available as plain markdown files in `agents/skills/`. Point your agent at them in order:

```
Read agents/skills/align.md and follow its instructions
```

Your agent reads `AGENTS.md` as its boot file (same content as `CLAUDE.md`, tool-neutral language). Run each skill in order: `align.md` → `to-prd.md` → `to-issues.md` → `validate-slices.md` → `handoff.md`.

## Design principles

- **No default tech stack.** Every project earns its stack from its requirements. The grill derives the stack from constraints, not from habit.
- **No code in ai-os-v2.** This is a thinking environment. Code lives in project repos.
- **Vertical slices, not horizontal layers.** Issues cut through all layers end-to-end. Each is independently demoable. Validated before handoff.
- **Alignment before implementation.** The grill forces you to resolve ambiguity upfront. Cheaper to change a decision in a doc than in code.
- **Self-governing projects.** Once handed off, the project repo has everything it needs — spec, glossary, issues, skills, agent orchestration. It doesn't depend on ai-os-v2.

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
│       └── relay/
├── agents/                        # Tool-neutral mirror (Codex, etc.)
│   └── skills/                    #   same skills as flat markdown
│       ├── align.md
│       ├── to-prd.md
│       ├── to-issues.md
│       ├── validate-slices.md
│       ├── handoff.md
│       ├── to-sandcastle.md
│       ├── relay.md
│       └── improve-codebase-architecture/
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
