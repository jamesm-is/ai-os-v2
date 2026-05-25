---
name: relay
description: Compact the current conversation into a relay document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Where to save

Save to `relays/` in the current repo. Create the directory if it doesn't exist.

Filename format: `YYYY-MM-DD-HH-MM--<slug>.md` where `<slug>` is a short kebab-case summary of the relay topic (3-5 words max). Use the current local time.

Example: `relays/2026-05-24-14-30--cursor-cli-sub-auth.md`

## What to include

- **Date**, **source workspace path**, and **next session focus** at the top
- Context the next agent needs to continue — decisions made, approaches tried, current state
- A "suggested skills" section recommending skills the next agent should invoke
- References to artifacts by path or URL — do not duplicate content already in PRDs, plans, ADRs, issues, commits, or diffs

## Rules

- Redact any sensitive information (API keys, passwords, PII)
- If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly
- After saving, tell the user: "Relay saved. Run `/relay-handoff` in your next session to pick it up."
