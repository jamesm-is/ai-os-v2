import { type HostSessionLookup, type SessionStore } from "./SessionStore.js";
import type { BindMountSandboxHandle } from "./SandboxProvider.js";
export type ParsedStreamEvent = {
    type: "text";
    text: string;
} | {
    type: "result";
    result: string;
} | {
    type: "tool_call";
    name: string;
    args: string;
} | {
    type: "session_id";
    sessionId: string;
} | {
    type: "usage";
    usage: IterationUsage;
};
/** Options passed to buildPrintCommand and buildInteractiveArgs. */
export interface AgentCommandOptions {
    readonly prompt: string;
    readonly dangerouslySkipPermissions: boolean;
    /** When set, the agent should resume the given session ID instead of starting fresh. */
    readonly resumeSession?: string;
}
/** Return type of buildPrintCommand — command string plus optional stdin content.
 *  When `stdin` is set, the sandbox pipes it to the child process's stdin
 *  instead of inlining the prompt in argv, avoiding the Linux 128 KB per-arg limit. */
export interface PrintCommand {
    readonly command: string;
    readonly stdin?: string;
}
/** Per-iteration token usage snapshot extracted from the agent session. */
export interface IterationUsage {
    readonly inputTokens: number;
    readonly cacheCreationInputTokens: number;
    readonly cacheReadInputTokens: number;
    readonly outputTokens: number;
}
export interface AgentSessionStorage {
    hostStore(cwd: string): SessionStore;
    sandboxStore(cwd: string, handle: BindMountSandboxHandle): SessionStore;
    transfer(from: SessionStore, to: SessionStore, id: string): Promise<void>;
    /**
     * Locate a session on the host by its unique id, independent of cwd encoding.
     * Used by the no-sandbox resume precheck, where the agent runs on the host and
     * writes the session in place under a cwd-derived directory Sandcastle cannot
     * reliably reconstruct. Returns the located path (or `undefined`) plus the
     * directory that was searched (for not-found errors).
     */
    findByIdOnHost(id: string): Promise<HostSessionLookup>;
}
export interface AgentProvider {
    readonly name: string;
    /** Environment variables injected by this agent provider. Merged at launch time with env resolver and sandbox provider env. */
    readonly env: Record<string, string>;
    /** When true, session capture is enabled for this provider. Default: true for Claude Code, false for others. */
    readonly captureSessions: boolean;
    /** Provider-owned storage and transfer behavior for resumable agent sessions. */
    readonly sessionStorage?: AgentSessionStorage;
    buildPrintCommand(options: AgentCommandOptions): PrintCommand;
    buildInteractiveArgs?(options: AgentCommandOptions): string[];
    parseStreamLine(line: string): ParsedStreamEvent[];
    /** Parse token usage from the captured session JSONL content. Only implemented by Claude Code. */
    parseSessionUsage?(content: string): IterationUsage | undefined;
}
export declare const DEFAULT_MODEL = "claude-opus-4-7";
/** Options for the pi agent provider. */
export interface PiOptions {
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
}
export declare const pi: (model: string, options?: PiOptions | undefined) => AgentProvider;
/** Options for the codex agent provider. */
export interface CodexOptions {
    readonly effort?: "low" | "medium" | "high" | "xhigh";
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
    /** When false, session capture is disabled. Default: true. */
    readonly captureSessions?: boolean;
    /** Override Codex session directories for tests or non-standard installs. */
    readonly sessionStorage?: {
        readonly hostSessionsDir?: string;
        readonly sandboxSessionsDir?: string;
    };
}
export declare const codex: (model: string, options?: CodexOptions | undefined) => AgentProvider & {
    readonly sessionStorage: AgentSessionStorage;
};
/** Options for the cursor agent provider. */
export interface CursorOptions {
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
}
export declare const cursor: (model: string, options?: CursorOptions | undefined) => AgentProvider;
/** Options for the opencode agent provider. */
export interface OpenCodeOptions {
    /** Provider-specific reasoning effort variant (e.g. "high", "max", "low", "minimal"). */
    readonly variant?: string;
    /**
     * Named OpenCode agent/mode to run, mapped to OpenCode's own `--agent` flag
     * (e.g. "build", "plan"). This is distinct from Sandcastle's `--agent`
     * provider selector — it chooses an agent *inside* OpenCode.
     */
    readonly agent?: string;
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
}
export declare const opencode: (model: string, options?: OpenCodeOptions | undefined) => AgentProvider;
/** Options for the GitHub Copilot CLI agent provider. */
export interface CopilotOptions {
    /** Reasoning effort level. Maps to the CLI's --effort flag. */
    readonly effort?: "low" | "medium" | "high";
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
}
export declare const copilot: (model: string, options?: CopilotOptions | undefined) => AgentProvider;
export interface ClaudeCodeOptions {
    readonly effort?: "low" | "medium" | "high" | "xhigh" | "max";
    /** Environment variables injected by this agent provider. */
    readonly env?: Record<string, string>;
    /** When false, session capture is disabled. Default: true. */
    readonly captureSessions?: boolean;
    /** Override Claude session directories for tests or non-standard installs. */
    readonly sessionStorage?: {
        readonly hostProjectsDir?: string;
        readonly sandboxProjectsDir?: string;
    };
}
export declare const claudeCode: (model: string, options?: ClaudeCodeOptions | undefined) => AgentProvider & {
    readonly sessionStorage: AgentSessionStorage;
};
//# sourceMappingURL=AgentProvider.d.ts.map