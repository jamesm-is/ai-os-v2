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
| 6 | `/to-sandcastle` | Generate agent orchestration scaffold (Dockerfile, prompts, orchestration loop). |

After step 5, the project is fully self-governing. ai-os-v2's job is done.

## What you get at the end

A project repo in `~/ai-projects/<project-name>/` with:

- **CLAUDE.md** — project boot file with domain rules, spec pointers, and working conventions
- **CONTEXT.md** — domain glossary built during alignment (the source of truth for terminology)
- **docs/prd.md** — full product requirements document
- **docs/issues/** — vertical slice issue files (also pushed to GitHub Issues)
- **docs/slice-audit.md** — vertical slice audit report from validate-slices
- **docs/adr/** — architectural decision records
- **.claude/skills/** — full pipeline and utility skills so the project can plan new features in-repo:
  - Pipeline: align, to-prd, to-issues, validate-slices, to-sandcastle (adapted for project-repo paths)
  - Architecture: improve-codebase-architecture (codebase deepening and refactoring audits)
  - Utility: relay (session context handoff)
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

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- For Sandcastle: `@ai-hero/sandcastle` (installed automatically during `/to-sandcastle`), plus API keys for Anthropic and OpenAI

## Getting started

1. Clone this repo:
   ```
   git clone https://github.com/jamesm-is/ai-os-v2.git
   cd ai-os-v2
   ```

2. Copy `context/about.example.md` to `context/about.md` and fill in your details. This shapes how the alignment grill behaves.

3. Open Claude Code in the repo and describe your app idea. Then run:
   ```
   /align
   ```

4. Follow the pipeline in order. Each skill tells you what to run next.

## Design principles

- **No default tech stack.** Every project earns its stack from its requirements. The grill derives the stack from constraints, not from habit.
- **No code in ai-os-v2.** This is a thinking environment. Code lives in project repos.
- **Vertical slices, not horizontal layers.** Issues cut through all layers end-to-end. Each is independently demoable. Validated before handoff.
- **Alignment before implementation.** The grill forces you to resolve ambiguity upfront. Cheaper to change a decision in a doc than in code.
- **Self-governing projects.** Once handed off, the project repo has everything it needs — spec, glossary, issues, skills, agent orchestration. It doesn't depend on ai-os-v2.

## Project structure

```
ai-os-v2/
├── .claude/
│   ├── settings.json              # Claude Code permissions
│   └── skills/                    # All skills
│       ├── align/                 # Domain grill + stack derivation
│       ├── to-prd/                # PRD synthesis
│       ├── to-issues/             # Vertical slice decomposition
│       ├── validate-slices/       # Slice quality audit
│       ├── handoff/               # Project repo creation + skill install
│       ├── to-sandcastle/         # Agent orchestration scaffold
│       ├── improve-codebase-architecture/  # Deepening audit (5 files)
│       └── relay/                 # Session context handoff
├── context/
│   ├── about.example.md            # Profile template (copy to about.md)
│   └── operating-rules.md        # Pipeline rules and conventions
├── projects/                      # Alignment artifacts per project
├── logs/sessions/                 # Session logs
├── CLAUDE.md                      # Boot file
└── README.md
```

## License

MIT
