import { codexHostSessionStore, codexSandboxSessionStore, findClaudeSessionOnHost, findCodexSessionOnHost, hostSessionStore, sandboxSessionStore, transferClaudeSession, transferCodexSession, } from "./SessionStore.js";
const shellEscape = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
/** Maps allowlisted tool names to the input field containing the display arg */
const TOOL_ARG_FIELDS = {
    Bash: "command",
    WebSearch: "query",
    WebFetch: "url",
    Agent: "description",
};
/**
 * Extract an error message from a parsed JSON error event.
 * Handles { error: "string" }, { error: { message: "string" } },
 * { error: { data: { message: "string" } } }, and { message: "string" }.
 */
const extractErrorMessage = (obj) => {
    const err = obj.error;
    if (typeof err === "string")
        return err;
    if (typeof err === "object" && err !== null) {
        if (typeof err.message === "string")
            return err.message;
        if (typeof err.data?.message === "string")
            return err.data.message;
    }
    if (typeof obj.message === "string")
        return obj.message;
    return undefined;
};
const parseStreamJsonLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    try {
        const obj = JSON.parse(line);
        if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
            const events = [];
            const texts = [];
            for (const block of obj.message.content) {
                if (block.type === "text" && typeof block.text === "string") {
                    texts.push(block.text);
                }
                else if (block.type === "tool_use" &&
                    typeof block.name === "string" &&
                    block.input !== undefined) {
                    const argField = TOOL_ARG_FIELDS[block.name];
                    if (argField === undefined)
                        continue; // not allowlisted
                    const argValue = block.input[argField];
                    if (typeof argValue !== "string")
                        continue; // missing/wrong arg field
                    if (texts.length > 0) {
                        events.push({ type: "text", text: texts.join("") });
                        texts.length = 0;
                    }
                    events.push({
                        type: "tool_call",
                        name: block.name,
                        args: argValue,
                    });
                }
            }
            if (texts.length > 0) {
                events.push({ type: "text", text: texts.join("") });
            }
            return events;
        }
        if (obj.type === "result" && typeof obj.result === "string") {
            return [{ type: "result", result: obj.result }];
        }
        if (obj.type === "system" &&
            obj.subtype === "init" &&
            typeof obj.session_id === "string") {
            return [{ type: "session_id", sessionId: obj.session_id }];
        }
    }
    catch {
        // Not valid JSON — skip
    }
    return [];
};
/**
 * Cursor Agent CLI print mode passes the prompt as a positional argv argument; stdin is not
 * documented for delivering the prompt. Linux enforces a per-argument limit (~128 KiB, ARG_MAX
 * stack). Stay slightly under so users get a clear error instead of spawn E2BIG.
 */
const CURSOR_PRINT_PROMPT_MAX_BYTES = 120 * 1024;
function assertCursorPrintPromptFitsArgv(prompt) {
    const n = Buffer.byteLength(prompt, "utf8");
    if (n > CURSOR_PRINT_PROMPT_MAX_BYTES) {
        throw new Error(`Cursor print-mode prompt is ${n} bytes (max ${CURSOR_PRINT_PROMPT_MAX_BYTES} bytes). The Cursor CLI accepts the prompt only as a command-line argument; shorten the prompt or split the work. Other Sandcastle providers use stdin for large prompts.`);
    }
}
/** Cursor stream-json emits top-level `tool_call` events (see Cursor CLI output-format docs). */
const parseCursorToolCallStarted = (obj) => {
    if (obj.type !== "tool_call" || obj.subtype !== "started")
        return [];
    const toolCall = obj.tool_call;
    if (!toolCall || typeof toolCall !== "object")
        return [];
    const tc = toolCall;
    const readToolCall = tc.readToolCall;
    if (readToolCall?.args && typeof readToolCall.args.path === "string") {
        return [{ type: "tool_call", name: "Read", args: readToolCall.args.path }];
    }
    const writeToolCall = tc.writeToolCall;
    if (writeToolCall?.args && typeof writeToolCall.args.path === "string") {
        return [
            { type: "tool_call", name: "Write", args: writeToolCall.args.path },
        ];
    }
    const fn = tc.function;
    if (fn && typeof fn.name === "string") {
        const rawArgs = typeof fn.arguments === "string" ? fn.arguments : "";
        if (rawArgs) {
            try {
                const parsedArgs = JSON.parse(rawArgs);
                if (typeof parsedArgs.command === "string") {
                    return [
                        { type: "tool_call", name: "Bash", args: parsedArgs.command },
                    ];
                }
            }
            catch {
                // Use raw arguments string for display.
            }
            return [{ type: "tool_call", name: fn.name, args: rawArgs }];
        }
        return [{ type: "tool_call", name: fn.name, args: "" }];
    }
    return [];
};
const parseCursorStreamLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    let obj;
    try {
        obj = JSON.parse(line);
    }
    catch {
        // Not valid JSON — skip
        return [];
    }
    if (obj.type === "tool_call") {
        return parseCursorToolCallStarted(obj);
    }
    return parseStreamJsonLine(line);
};
export const DEFAULT_MODEL = "claude-opus-4-7";
// ---------------------------------------------------------------------------
// Pi agent provider
// ---------------------------------------------------------------------------
const parsePiStreamLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    try {
        const obj = JSON.parse(line);
        if (obj.type === "message_update" && obj.assistantMessageEvent) {
            const evt = obj.assistantMessageEvent;
            if (evt.type === "text_delta" && typeof evt.delta === "string") {
                return [{ type: "text", text: evt.delta }];
            }
            return [];
        }
        if (obj.type === "tool_execution_start") {
            const toolName = obj.toolName;
            if (typeof toolName !== "string")
                return [];
            const argField = TOOL_ARG_FIELDS[toolName];
            if (argField === undefined)
                return [];
            const args = obj.args;
            if (!args)
                return [];
            const argValue = args[argField];
            if (typeof argValue !== "string")
                return [];
            return [{ type: "tool_call", name: toolName, args: argValue }];
        }
        // Pi emits agent_error / error events on stdout (not stderr) for auth
        // failures, rate limits, and API errors. Capture them as result events so
        // the Orchestrator's stderr-empty fallback can surface them to the user.
        if (obj.type === "agent_error" || obj.type === "error") {
            const msg = extractErrorMessage(obj);
            return msg ? [{ type: "result", result: msg }] : [];
        }
        if (obj.type === "agent_end" && Array.isArray(obj.messages)) {
            const messages = obj.messages;
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg?.role === "assistant") {
                    const texts = [];
                    for (const block of msg.content) {
                        if (block.type === "text" && typeof block.text === "string") {
                            texts.push(block.text);
                        }
                    }
                    if (texts.length > 0) {
                        return [{ type: "result", result: texts.join("") }];
                    }
                    break;
                }
            }
            return [];
        }
    }
    catch {
        // Not valid JSON — skip
    }
    return [];
};
export const pi = (model, options) => ({
    name: "pi",
    env: options?.env ?? {},
    captureSessions: false,
    buildPrintCommand({ prompt }) {
        return {
            command: `pi -p --mode json --no-session --model ${shellEscape(model)}`,
            stdin: prompt,
        };
    },
    buildInteractiveArgs({ prompt }) {
        const args = ["pi", "--model", model];
        if (prompt)
            args.push(prompt);
        return args;
    },
    parseStreamLine(line) {
        return parsePiStreamLine(line);
    },
});
// ---------------------------------------------------------------------------
// Codex agent provider
// ---------------------------------------------------------------------------
/**
 * Map a Codex `turn.completed` usage object to the Claude-shaped IterationUsage.
 *
 * OpenAI/Codex usage is `{ input_tokens, cached_input_tokens, output_tokens }`,
 * where `input_tokens` is the *total* prompt tokens and `cached_input_tokens` is
 * a subset already included in that total. There is no cache-creation concept.
 * To avoid double-counting cached tokens in the context-window display (which
 * sums input + cacheCreation + cacheRead), the cached portion maps to
 * `cacheReadInputTokens` and the remainder to `inputTokens`.
 */
const parseCodexUsage = (usage) => {
    if (typeof usage !== "object" || usage === null)
        return undefined;
    const u = usage;
    if (typeof u.input_tokens !== "number" ||
        typeof u.cached_input_tokens !== "number" ||
        typeof u.output_tokens !== "number") {
        return undefined;
    }
    return {
        inputTokens: u.input_tokens - u.cached_input_tokens,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: u.cached_input_tokens,
        outputTokens: u.output_tokens,
    };
};
const parseCodexStreamLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    try {
        const obj = JSON.parse(line);
        if (obj.type === "thread.started" && typeof obj.thread_id === "string") {
            return [{ type: "session_id", sessionId: obj.thread_id }];
        }
        // item.completed with agent_message → text + result
        if (obj.type === "item.completed" &&
            obj.item?.type === "agent_message" &&
            typeof obj.item.text === "string") {
            const text = obj.item.text;
            return [
                { type: "text", text },
                { type: "result", result: text },
            ];
        }
        // item.started with command_execution → tool call
        if (obj.type === "item.started" &&
            obj.item?.type === "command_execution" &&
            typeof obj.item.command === "string") {
            return [{ type: "tool_call", name: "Bash", args: obj.item.command }];
        }
        // Codex emits error events on stdout (not stderr) for auth failures,
        // rate limits, and API errors. Capture them as result events so the
        // Orchestrator's stderr-empty fallback can surface them to the user.
        if (obj.type === "error") {
            const msg = extractErrorMessage(obj);
            return msg ? [{ type: "result", result: msg }] : [];
        }
        // turn.completed carries token usage for the turn.
        if (obj.type === "turn.completed") {
            const usage = parseCodexUsage(obj.usage);
            return usage ? [{ type: "usage", usage }] : [];
        }
    }
    catch {
        // Not valid JSON — skip
    }
    return [];
};
export const codex = (model, options) => ({
    name: "codex",
    env: options?.env ?? {},
    captureSessions: options?.captureSessions ?? true,
    sessionStorage: {
        hostStore: (cwd) => codexHostSessionStore(cwd, options?.sessionStorage?.hostSessionsDir),
        sandboxStore: (cwd, handle) => codexSandboxSessionStore(cwd, handle, options?.sessionStorage?.sandboxSessionsDir),
        // Both stores above are LocatableSessionStore by construction; the
        // AgentSessionStorage seam types them as the narrower SessionStore.
        transfer: (from, to, id) => transferCodexSession(from, to, id),
        findByIdOnHost: (id) => findCodexSessionOnHost(id, options?.sessionStorage?.hostSessionsDir),
    },
    buildPrintCommand({ prompt, resumeSession, }) {
        const effortFlag = options?.effort
            ? ` -c ${shellEscape(`model_reasoning_effort="${options.effort}"`)}`
            : "";
        const base = resumeSession
            ? `codex exec resume ${shellEscape(resumeSession)}`
            : "codex exec";
        const stdinArg = resumeSession ? " -" : "";
        return {
            command: `${base} --json --dangerously-bypass-approvals-and-sandbox -m ${shellEscape(model)}${effortFlag}${stdinArg}`,
            stdin: prompt,
        };
    },
    buildInteractiveArgs({ prompt }) {
        const args = ["codex", "--model", model];
        if (prompt)
            args.push(prompt);
        return args;
    },
    parseStreamLine(line) {
        return parseCodexStreamLine(line);
    },
});
export const cursor = (model, options) => ({
    name: "cursor",
    env: options?.env ?? {},
    captureSessions: false,
    // Cursor has no filesystem-backed session storage (captureSessions: false, no
    // sessionStorage), so it is non-resumable per ADR 0012/0016. resumeSession is
    // ignored here — like pi and opencode — rather than wired to --resume.
    buildPrintCommand({ prompt, dangerouslySkipPermissions, }) {
        assertCursorPrintPromptFitsArgv(prompt);
        const forceFlag = dangerouslySkipPermissions ? " --force" : "";
        return {
            command: `agent --print --output-format stream-json --model ${shellEscape(model)} ${forceFlag} ${shellEscape(prompt)}`,
        };
    },
    buildInteractiveArgs({ prompt, dangerouslySkipPermissions, }) {
        const args = ["agent", "--model", model];
        if (dangerouslySkipPermissions)
            args.push("--force");
        if (prompt)
            args.push(prompt);
        return args;
    },
    parseStreamLine(line) {
        return parseCursorStreamLine(line);
    },
});
// ---------------------------------------------------------------------------
// OpenCode agent provider
// ---------------------------------------------------------------------------
/** Maps OpenCode tool names to the input field containing the friendly display
 *  arg. Tools not listed here are still surfaced, falling back to a JSON dump of
 *  the whole input. The tool name is surfaced as-is (OpenCode's lowercase names). */
const OPENCODE_TOOL_ARG_FIELDS = {
    bash: "command",
    webfetch: "url",
    task: "description",
};
const parseOpenCodeStreamLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    try {
        const obj = JSON.parse(line);
        const part = obj.part;
        // step_start carries the session ID for the run.
        if (obj.type === "step_start" && typeof obj.sessionID === "string") {
            return [{ type: "session_id", sessionId: obj.sessionID }];
        }
        // text event → assistant text. Emit both text (for streaming display) and
        // result (final message; the last result wins in the Orchestrator).
        if (obj.type === "text" &&
            part?.type === "text" &&
            typeof part.text === "string") {
            return [
                { type: "text", text: part.text },
                { type: "result", result: part.text },
            ];
        }
        // tool_use event → tool call. Tool name is in part.tool, args in
        // part.state.input. Gate on the completed status so intermediate
        // pending/running states don't surface duplicate tool calls.
        if (obj.type === "tool_use" && part?.type === "tool") {
            if (typeof part.tool !== "string")
                return [];
            const state = part.state;
            if (state?.status !== "completed")
                return [];
            const input = state.input;
            if (!input)
                return [];
            const argField = OPENCODE_TOOL_ARG_FIELDS[part.tool];
            const argValue = argField !== undefined ? input[argField] : undefined;
            const args = typeof argValue === "string" ? argValue : JSON.stringify(input);
            return [{ type: "tool_call", name: part.tool, args }];
        }
        // OpenCode emits error events on stdout (not stderr) for auth failures,
        // rate limits, and API errors. Capture them as result events so the
        // Orchestrator's stderr-empty fallback can surface them to the user.
        if (obj.type === "error") {
            const msg = extractErrorMessage(obj);
            return msg ? [{ type: "result", result: msg }] : [];
        }
        // step_finish, tool output, etc. → skip
    }
    catch {
        // Not valid JSON — skip
    }
    return [];
};
export const opencode = (model, options) => ({
    name: "opencode",
    env: options?.env ?? {},
    captureSessions: false,
    buildPrintCommand({ prompt, dangerouslySkipPermissions, }) {
        const variantFlag = options?.variant
            ? ` --variant ${shellEscape(options.variant)}`
            : "";
        const agentFlag = options?.agent
            ? ` --agent ${shellEscape(options.agent)}`
            : "";
        const permissionsFlag = dangerouslySkipPermissions
            ? " --dangerously-skip-permissions"
            : "";
        return {
            command: `opencode run --format json --model ${shellEscape(model)}${variantFlag}${agentFlag}${permissionsFlag} ${shellEscape(prompt)}`,
        };
    },
    buildInteractiveArgs({ prompt }) {
        const args = ["opencode", "--model", model];
        if (options?.agent)
            args.push("--agent", options.agent);
        if (prompt)
            args.push("-p", prompt);
        return args;
    },
    parseStreamLine(line) {
        return parseOpenCodeStreamLine(line);
    },
});
// ---------------------------------------------------------------------------
// GitHub Copilot CLI agent provider
// ---------------------------------------------------------------------------
/**
 * Copilot CLI print mode passes the prompt as the `-p` argv argument. (The CLI
 * can also read a prompt piped on stdin — `echo "..." | copilot` — but we use
 * the `-p` argv form here for parity with the tested print-command path.) Linux
 * enforces a per-argument limit (~128 KiB, ARG_MAX stack). Stay slightly under
 * so users get a clear error instead of spawn E2BIG. Mirrors the Cursor guard.
 */
const COPILOT_PRINT_PROMPT_MAX_BYTES = 120 * 1024;
function assertCopilotPrintPromptFitsArgv(prompt) {
    const n = Buffer.byteLength(prompt, "utf8");
    if (n > COPILOT_PRINT_PROMPT_MAX_BYTES) {
        throw new Error(`Copilot print-mode prompt is ${n} bytes (max ${COPILOT_PRINT_PROMPT_MAX_BYTES} bytes). This provider passes the prompt as a command-line argument; shorten the prompt or split the work. Other Sandcastle providers use stdin for large prompts.`);
    }
}
/**
 * Parse one line of `copilot --output-format json` JSONL output.
 *
 * Schema (observed via `copilot -p ... --output-format json --model ...`):
 *
 * - `assistant.message_delta` — `{ data: { messageId, deltaContent } }`
 *   Streaming chunks of assistant text. Mapped to `text` events.
 *
 * - `assistant.message` — `{ data: { messageId, content, toolRequests, ... } }`
 *   The complete assistant message. We surface its `content` as a `result`
 *   event so the Orchestrator's "last result wins" buffer ends up holding
 *   the final assistant text. (Tool calls in `toolRequests` are surfaced
 *   separately via `tool.execution_start` events.)
 *
 * - `tool.execution_start` — `{ data: { toolCallId, toolName, arguments } }`
 *   Mapped to `tool_call` events for allowlisted tools. Copilot uses lowercase
 *   `bash`; we normalise to the existing `Bash` allowlist entry.
 *
 * - `result` — `{ sessionId, exitCode, usage }`
 *   Terminal event. We surface `sessionId` as a `session_id` event.
 *
 * - `error` / `agent_error` — defensive: surface as a `result` event the same
 *   way Pi/Codex do, so the Orchestrator's stderr-empty fallback can show it.
 */
const parseCopilotStreamLine = (line) => {
    if (!line.startsWith("{"))
        return [];
    try {
        const obj = JSON.parse(line);
        // Streaming text deltas
        if (obj.type === "assistant.message_delta" &&
            typeof obj.data?.deltaContent === "string") {
            return [{ type: "text", text: obj.data.deltaContent }];
        }
        // Tool execution start → tool_call (allowlisted tools only)
        if (obj.type === "tool.execution_start") {
            const rawName = obj.data?.toolName;
            if (typeof rawName !== "string")
                return [];
            // Copilot CLI uses lowercase "bash"; normalise to the shared allowlist.
            const toolName = rawName === "bash" ? "Bash" : rawName;
            const argField = TOOL_ARG_FIELDS[toolName];
            if (argField === undefined)
                return [];
            const args = obj.data?.arguments;
            if (!args)
                return [];
            const argValue = args[argField];
            if (typeof argValue !== "string")
                return [];
            return [{ type: "tool_call", name: toolName, args: argValue }];
        }
        // Final assistant message → result. Each assistant turn emits one of
        // these with the complete text; the Orchestrator's resultText is
        // last-write-wins, so the final turn ends up surfaced to callers.
        if (obj.type === "assistant.message" &&
            typeof obj.data?.content === "string" &&
            obj.data.content.length > 0) {
            return [{ type: "result", result: obj.data.content }];
        }
        // Terminal result event carries the session id
        if (obj.type === "result" && typeof obj.sessionId === "string") {
            return [{ type: "session_id", sessionId: obj.sessionId }];
        }
        // Defensive: surface error events as result events (matches Pi/Codex)
        if (obj.type === "error" || obj.type === "agent_error") {
            const msg = extractErrorMessage(obj);
            return msg ? [{ type: "result", result: msg }] : [];
        }
    }
    catch {
        // Not valid JSON — skip
    }
    return [];
};
export const copilot = (model, options) => ({
    name: "copilot",
    env: options?.env ?? {},
    captureSessions: false,
    // Copilot CLI does expose `--resume <id>`, but its session state is indexed by
    // a SQLite database alongside the JSONL files in ~/.copilot/session-state/, so
    // transferring a single session file between host and sandbox is not enough to
    // make resume work (see ADR 0016). Until the round-trip is verified end-to-end,
    // copilot is non-resumable: captureSessions is false, there is no sessionStorage,
    // and resumeSession is ignored here — like cursor, pi, and opencode.
    buildPrintCommand({ prompt, dangerouslySkipPermissions, }) {
        assertCopilotPrintPromptFitsArgv(prompt);
        const allowAll = dangerouslySkipPermissions ? " --allow-all-tools" : "";
        const effortFlag = options?.effort ? ` --effort ${options.effort}` : "";
        return {
            command: `copilot -p ${shellEscape(prompt)} --output-format json --model ${shellEscape(model)}${allowAll}${effortFlag}`,
        };
    },
    buildInteractiveArgs({ prompt }) {
        const args = ["copilot", "--model", model];
        // Seed the interactive session with `-i`/`--interactive`, NOT `-p`. The
        // `-p`/`--prompt` flag runs the prompt programmatically and exits after
        // completion; since interactive() attaches these args to the real TTY,
        // `-p` would print-and-exit instead of launching the TUI. `-i` starts an
        // interactive session and auto-executes the prompt without exiting.
        if (prompt)
            args.push("-i", prompt);
        return args;
    },
    parseStreamLine(line) {
        return parseCopilotStreamLine(line);
    },
});
export const claudeCode = (model, options) => ({
    name: "claude-code",
    env: options?.env ?? {},
    captureSessions: options?.captureSessions ?? true,
    sessionStorage: {
        hostStore: (cwd) => hostSessionStore(cwd, options?.sessionStorage?.hostProjectsDir),
        sandboxStore: (cwd, handle) => sandboxSessionStore(cwd, handle, options?.sessionStorage?.sandboxProjectsDir ??
            "/home/agent/.claude/projects"),
        transfer: transferClaudeSession,
        findByIdOnHost: (id) => findClaudeSessionOnHost(id, options?.sessionStorage?.hostProjectsDir),
    },
    buildPrintCommand({ prompt, dangerouslySkipPermissions, resumeSession, }) {
        const skipPerms = dangerouslySkipPermissions
            ? " --dangerously-skip-permissions"
            : "";
        const effortFlag = options?.effort ? ` --effort ${options.effort}` : "";
        const resumeFlag = resumeSession
            ? ` --resume ${shellEscape(resumeSession)}`
            : "";
        return {
            command: `claude --print --verbose${skipPerms} --output-format stream-json --model ${shellEscape(model)}${effortFlag}${resumeFlag} -p -`,
            stdin: prompt,
        };
    },
    buildInteractiveArgs({ prompt, dangerouslySkipPermissions, }) {
        const args = ["claude"];
        if (dangerouslySkipPermissions)
            args.push("--dangerously-skip-permissions");
        args.push("--model", model);
        if (options?.effort)
            args.push("--effort", options.effort);
        if (prompt)
            args.push(prompt);
        return args;
    },
    parseStreamLine(line) {
        return parseStreamJsonLine(line);
    },
    parseSessionUsage(content) {
        const lines = content.split("\n");
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (!line.startsWith("{"))
                continue;
            try {
                const obj = JSON.parse(line);
                if (obj.type === "assistant" && obj.message?.usage) {
                    const u = obj.message.usage;
                    if (typeof u.input_tokens === "number" &&
                        typeof u.cache_creation_input_tokens === "number" &&
                        typeof u.cache_read_input_tokens === "number" &&
                        typeof u.output_tokens === "number") {
                        return {
                            inputTokens: u.input_tokens,
                            cacheCreationInputTokens: u.cache_creation_input_tokens,
                            cacheReadInputTokens: u.cache_read_input_tokens,
                            outputTokens: u.output_tokens,
                        };
                    }
                }
            }
            catch {
                // Not valid JSON — skip
            }
        }
        return undefined;
    },
});
//# sourceMappingURL=AgentProvider.js.map