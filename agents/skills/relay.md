# Relay

Compact the current conversation into a relay document for another agent to pick up.

## Where to save

Save to `.claude/relays/` in the current repo. Create the directory if it doesn't exist.

Filename format: `YYYY-MM-DD-HH-MM--<slug>.md` where `<slug>` is a short kebab-case summary of the relay topic (3-5 words max). Use the current local time.

Example: `.claude/relays/2026-05-24-14-30--cursor-cli-sub-auth.md`

## What to include

- **Date**, **source workspace path**, and **next session focus** at the top
- Context the next agent needs to continue — decisions made, approaches tried, current state
- A "suggested skills" section recommending skills the next agent should invoke
- References to artifacts by path or URL — do not duplicate content already in PRDs, plans, ADRs, issues, commits, or diffs

## Rules

- Redact any sensitive information (API keys, passwords, PII)
- If given a focus description, tailor the document for what the next session will work on
- After saving, tell the user: "Relay saved. Run `relay-handoff` in your next session to pick it up."
