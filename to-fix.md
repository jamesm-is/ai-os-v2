# To Fix — Sandcastle Launcher Improvements

**Status: ALL FIXED** (2026-05-26, commit 3c520ba)

Issues found during the ebook-generator sandcastle run (2026-05-26). ~~These need to be patched in ai-os-v2 skills, templates, and configs before the next project launches.~~

---

## 1. Kanban Board: Query String 404 Bug

**Where:** `main.mts` template in `.claude/skills/to-sandcastle/SKILL.md` (line ~735), and `templates/kanban.html` if it fetches JSON with cache-busting params.

**Problem:** The kanban board server passes `req.url` directly to `readFile`. Browsers append cache-busting query strings (e.g., `?1779843758650`) to requests. The server tries to read `kanban-state.json?1779843758650` from disk, which doesn't exist — 404.

**Template code (broken):**
```typescript
const resolved = join(docsDir, req.url === "/" ? "kanban.html" : req.url!);
```

**Fix applied in ebook-generator:**
```typescript
const pathname = req.url === "/" ? "kanban.html" : new URL(req.url!, "http://localhost").pathname;
const resolved = join(docsDir, pathname);
```

**What to update:**
- `to-sandcastle/SKILL.md` — the `main.mts` template's kanban server section

---

## 2. Missing Hybrid Option: Claude + Cursor + Codex (3-CLI)

**Where:** `to-sandcastle/SKILL.md` — Agent Profiles table + all template sections.

**Problem:** The skill only offers 5 CLI choices:
- Claude only
- Codex only
- Cursor only
- Hybrid (Claude + Codex)
- Hybrid (Claude + Cursor)

For ebook-generator, we needed a **3-CLI hybrid** that doesn't exist in the menu:
- Planner: Claude Code (Opus 4.7) — Claude sub
- Implementer: Cursor (Composer 2.5) — Cursor sub
- Reviewer: Codex (GPT 5.5 high) — ChatGPT sub
- PR Creator: Claude Code (Opus 4.7) — Claude sub

This gives the best model for each role across three subscriptions, but required manual config.

**What to add:**

New CLI choice: **Hybrid (Claude + Cursor + Codex)** — Claude for planning/PR, Cursor for implementation, Codex for review.

Agent profile:
```typescript
const AGENTS = {
  planner:     sandcastle.claudeCode("claude-opus-4-7"),
  implementer: cursorAgent("composer-2.5"),
  reviewer:    sandcastle.codex("gpt-5.5", { effort: "high" }),
  prCreator:   sandcastle.claudeCode("claude-opus-4-7"),
};
```

Auth (subscription):
```
CLAUDE_CODE_OAUTH_TOKEN=   # run: claude setup-token
GH_TOKEN=                  # run: gh auth token
# Cursor: mount cursor-auth.json read-only
# Codex: mount codex-auth.json read-only
```

Hooks:
```typescript
const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: "npm install" },
      { command: "mkdir -p ~/.config/cursor && cp ~/.cursor-auth.json ~/.config/cursor/auth.json" },
      { command: "mkdir -p ~/.codex && cp ~/.codex-auth.json ~/.codex/auth.json" },
    ],
  },
};
```

Docker mounts (both auth files):
```typescript
const CURSOR_AUTH_PATH = join(process.cwd(), ".sandcastle", "cursor-auth.json");
const CODEX_AUTH_PATH = join(process.cwd(), ".sandcastle", "codex-auth.json");
const dockerWithAuth = () => docker({
  mounts: [
    { hostPath: CURSOR_AUTH_PATH, sandboxPath: "/home/agent/.cursor-auth.json", readonly: true },
    { hostPath: CODEX_AUTH_PATH, sandboxPath: "/home/agent/.codex-auth.json", readonly: true },
  ],
});
```

Dockerfile: needs all 3 CLIs (Claude Code + Cursor + Codex).

Setup guide:
```
Setup:
1. Complete all Phase 0 issues
2. Run: claude setup-token
3. Run: agent login (Cursor Pro subscription)
4. Copy %APPDATA%\Cursor\auth.json to .sandcastle/cursor-auth.json
5. Run: codex login (ChatGPT subscription)
6. Copy ~/.codex/auth.json to .sandcastle/codex-auth.json
7. Run: gh auth token
8. Copy .env.example to .env and paste CLAUDE_CODE_OAUTH_TOKEN + GH_TOKEN
9. Build Docker image: docker build -t sandcastle:<project-name> .sandcastle/
10. Run: npx tsx .sandcastle/main.mts
```

**What to update:**
- `to-sandcastle/SKILL.md` — add 6th CLI choice everywhere: Agent Profiles table, agent code block, auth setup section, Dockerfile section, hook section, docker mount section, setup guide section
- The question prompt in "Before Starting" step 6 needs the new option

---

## 3. Kanban Board: No GitHub Sync

**Where:** `docs/kanban-state.json` + `templates/kanban.html`

**Problem:** The kanban board reads from a static local JSON file. When issues are closed on GitHub (manually or via merged PRs), the board doesn't update. The user has to manually edit `kanban-state.json` to reflect reality.

**Two options to fix:**

### Option A: Live GitHub query (recommended)
Make `kanban.html` fetch issue state from GitHub directly instead of (or in addition to) the static JSON:
- Add a `/api/issues` endpoint to the board server in `main.mts` that runs `gh issue list --json number,title,state,labels` and returns the result
- `kanban.html` fetches from `/api/issues` on load and polls periodically
- Map GitHub issue state/labels to board columns (open+ready-for-agent → backlog, open+in-progress → in-progress, closed → done)
- Fall back to `kanban-state.json` for metadata not in GitHub (phase, type, acceptance criteria counts)

### Option B: Sync script
Add a `sync-board.ts` script that reads GitHub issue state and updates `kanban-state.json`. Run it as a hook inside the sandcastle loop (after PR creation phase).

**What to update:**
- `templates/kanban.html` — add live fetch or hybrid approach
- `to-sandcastle/SKILL.md` — update the `main.mts` template's board server section
- Possibly add a new endpoint to the board server

---

## 4. Docker Mount Pattern: `docker()` vs `dockerWithAuth()`

**Where:** `to-sandcastle/SKILL.md` — the `main.mts` template.

**Problem:** The template uses bare `docker()` calls for sandboxes. When auth files need to be mounted (Cursor/Codex subscription auth), every `docker()` call needs to be replaced with a configured version that includes the mounts. The template doesn't account for this — it hardcodes `docker()` in 4 places (planner, per-issue sandbox creation, and pr-creator).

**Fix applied in ebook-generator:**
```typescript
const dockerWithAuth = () => docker({
  mounts: [
    { hostPath: CURSOR_AUTH_PATH, sandboxPath: "/home/agent/.cursor-auth.json", readonly: true },
    { hostPath: CODEX_AUTH_PATH, sandboxPath: "/home/agent/.codex-auth.json", readonly: true },
  ],
});
```

Then `dockerWithAuth()` replaces `docker()` in all sandbox creation calls.

**What to update:**
- `to-sandcastle/SKILL.md` — the `main.mts` template should use a `dockerWithAuth()` wrapper (or just `docker()` for Claude-only/API-key configs that don't need file mounts). Add conditional logic in the generation instructions.

---

## Summary of Files to Update

| File | Fixes |
|------|-------|
| `.claude/skills/to-sandcastle/SKILL.md` | #1 (query string), #2 (3-CLI hybrid), #4 (docker mounts) |
| `.agents/skills/to-sandcastle/SKILL.md` | Mirror of above (Codex version) |
| `templates/kanban.html` | #3 (GitHub sync) |
