---
name: to-sandcastle
description: Generate a .sandcastle/ scaffold for agent orchestration. Use when the project is ready for autonomous agent runs, or when the user says "to-sandcastle", "set up sandcastle", or "prepare for agents".
---

# To Sandcastle

Generate the `.sandcastle/` orchestration scaffold so this project can run autonomous agents via Sandcastle.

## Before Starting

1. Read `docs/prd.md` — specifically the **Technical Stack** section.
2. Read `CONTEXT.md` for domain vocabulary.
3. Confirm the project has a GitHub remote (`gh repo view`).
4. **Ask the user four questions:**

   **Auth mode:**
   - **Subscription** — no API keys, uses existing Claude/ChatGPT subscriptions
   - **API key** — pay-per-token from API credits

   **CLI choice:**
   - **Claude only** — all agents run via Claude Code CLI
   - **Codex only** — all agents run via Codex CLI
   - **Cursor only** — all agents run via Cursor CLI
   - **Hybrid (Claude + Codex)** — Claude Code for planning/PR, Codex for implementation/review
   - **Hybrid (Claude + Cursor)** — Claude Code for planning/PR, Cursor for implementation/review
   - **Hybrid (Claude + Cursor + Codex)** — Claude Code for planning/PR, Cursor for implementation, Codex for review

   **Execution mode:**
   - **Full** — run all phases continuously until every issue has a PR
   - **Phase-by-phase** — complete the current phase, then stop

   **Merge strategy:**
   - **Auto-merge** — after PRs are created, the script reviews and merges automatically. Falls back to manual on failure.
   - **Human-merge** — after PRs are created, pauses and polls until you merge them manually

Then follow the full to-sandcastle generation process from the launcher skill. The scaffold generation (agent profiles, prompts, Dockerfile, main.mts, coding standards) is identical — only the "Before Starting" paths differ.
