---
name: relay-handoff
description: Pick up a relay from a previous session. Lists available relays and lets you choose which one to resume.
---

## Behavior

1. Check if `--all` was passed as an argument.
   - **Without `--all`:** List all `.md` files in `.claude/relays/` that do NOT start with `DONE-`.
   - **With `--all`:** List ALL `.md` files in `.claude/relays/`, including `DONE-` files. Show `DONE-` files with a `[DONE]` tag in the label so they're visually distinct.
2. If none exist, tell the user "No relays available." and stop.
3. If exactly one exists, read it and proceed directly — no need to ask.
4. If multiple exist, present them as choices using AskUserQuestion. Show each relay's date and topic slug as the label, and the "next session focus" line as the description.
5. Read the selected relay file fully.
6. If the selected relay is NOT already `DONE-`, rename it by prepending `DONE-` to the filename (e.g., `2026-05-24-14-30--cursor-cli-sub-auth.md` → `DONE-2026-05-24-14-30--cursor-cli-sub-auth.md`). If it's already `DONE-`, skip the rename — it's a reference lookup, not a pickup.
7. Print a summary of what the relay contains and what the next steps are.
8. If the relay has a "suggested skills" section, invoke those skills as appropriate.

## Rules

- Never delete relay files — only mark them done with the `DONE-` prefix.
- If the user passes an argument (other than `--all`), use it to filter relays by keyword match on filename or content. `--all` can be combined with a keyword filter.
- Treat the relay document as context for the current session, not as instructions to execute blindly — confirm the plan with the user before taking action.
