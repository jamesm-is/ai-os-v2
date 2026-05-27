/**
 * SessionStore — keyed collection of agent session JSONLs.
 *
 * Provides read/write access to agent session files, with host-backed
 * (filesystem) and sandbox-backed (via bind-mount handle file-transfer
 * primitives) implementations. Per ADR 0012, the per-provider `transfer`
 * op (e.g. `transferClaudeSession`, `transferCodexSession`) copies a session
 * between stores and applies any format-specific content rewriting — for
 * JSONL agents, rewriting `cwd` fields from source cwd to target cwd via the
 * shared `rewriteSessionCwd` primitive.
 */
import type { BindMountSandboxHandle } from "./SandboxProvider.js";
/**
 * Result of locating a session on the host by its unique id, independent of any
 * cwd-derived path encoding.
 */
export interface HostSessionLookup {
    /** Absolute path to the located session file, or `undefined` when no session
     *  with this id exists anywhere under the searched root. */
    readonly path: string | undefined;
    /** The host directory that was scanned — surfaced in not-found errors so the
     *  user knows where Sandcastle looked. */
    readonly searchedRoot: string;
}
/** A keyed collection of agent session JSONLs associated with a cwd. */
export interface SessionStore {
    /** The working directory this store is associated with. */
    readonly cwd: string;
    /** Whether a session exists in this store. */
    exists(id: string): Promise<boolean>;
    /** Absolute path where a session is stored, when the store is file-backed and locatable. */
    sessionFilePath(id: string): string | undefined;
    /** Read a session's JSONL content by ID. Throws if not found. */
    readSession(id: string): Promise<string>;
    /** Write a session's JSONL content by ID. Creates or overwrites. */
    writeSession(id: string, content: string): Promise<void>;
}
/**
 * Encode a cwd into the Claude Code `~/.claude/projects/<encoded>/` layout.
 * Replaces path separators with hyphens, matching Claude Code's convention.
 */
export declare const encodeProjectPath: (cwd: string) => string;
/**
 * Create a host-backed SessionStore that reads/writes session JSONLs on the
 * host filesystem using Claude Code's `~/.claude/projects/<encoded>/` layout.
 *
 * @param cwd - The host repo directory this store is associated with.
 * @param projectsDir - Override for the projects directory (default: `~/.claude/projects`).
 */
export declare const hostSessionStore: (cwd: string, projectsDir?: string | undefined) => SessionStore;
/**
 * Locate a Claude Code session JSONL on the host by its unique id, scanning each
 * `~/.claude/projects/<encoded-cwd>/` directory rather than reconstructing the
 * cwd encoding. The session id is globally unique, so the first match wins. Used
 * by the no-sandbox resume precheck, where the agent wrote the file in place
 * under a cwd-derived directory Sandcastle cannot reliably reconstruct.
 *
 * @param id - The session id (file basename without `.jsonl`).
 * @param projectsDir - Override for the projects directory (default: `~/.claude/projects`).
 */
export declare const findClaudeSessionOnHost: (id: string, projectsDir?: string | undefined) => Promise<HostSessionLookup>;
/**
 * Create a sandbox-backed SessionStore that uses a bind-mount handle's
 * `copyFileIn`/`copyFileOut` to transfer session files.
 *
 * @param cwd - The sandbox-side working directory.
 * @param handle - The bind-mount sandbox handle for file transfer.
 * @param projectsDir - The sandbox-side path to `~/.claude/projects`.
 */
export declare const sandboxSessionStore: (cwd: string, handle: Pick<BindMountSandboxHandle, "copyFileIn" | "copyFileOut" | "exec">, projectsDir: string) => SessionStore;
/**
 * claudeCode's `sessionStorage.transfer` (ADR 0012). Copies a Claude Code
 * session between stores, rewriting `cwd` fields in the JSONL entries from the
 * source store's cwd to the target store's cwd. The rewrite is specific to
 * Claude Code's JSONL format, so it lives with the provider rather than in
 * central code.
 */
export declare const transferClaudeSession: (from: SessionStore, to: SessionStore, id: string) => Promise<void>;
/**
 * A file-backed `SessionStore` that can locate a session's on-disk path and
 * write content at a specific relative path. Codex sessions are date-nested
 * (`YYYY/MM/DD/rollout-*-<id>.jsonl`) rather than cwd-partitioned, so `transfer`
 * must preserve the source's relative path on the target. Not part of the
 * public API — the codex factory pairs these stores with `transferCodexSession`.
 */
export interface LocatableSessionStore extends SessionStore {
    locateSession(id: string): Promise<{
        path: string;
        relativePath: string;
    }>;
    writeSessionAt(relativePath: string, content: string): Promise<void>;
}
/**
 * Locate a Codex session rollout file on the host by its id, reusing the
 * date-nested scan. Used by the no-sandbox resume precheck.
 *
 * @param id - The session id.
 * @param sessionsDir - Override for the sessions directory (default: `~/.codex/sessions`).
 */
export declare const findCodexSessionOnHost: (id: string, sessionsDir?: string | undefined) => Promise<HostSessionLookup>;
export declare const codexHostSessionStore: (cwd: string, sessionsDir?: string | undefined) => LocatableSessionStore;
export declare const codexSandboxSessionStore: (cwd: string, handle: Pick<BindMountSandboxHandle, "copyFileIn" | "copyFileOut" | "exec">, sessionsDir?: string) => LocatableSessionStore;
/**
 * codex's `sessionStorage.transfer` (ADR 0012). Copies a Codex session between
 * locatable stores, rewriting the `cwd` in the `session_meta` line and
 * preserving the source's relative date-path on the target so Codex's id-scan
 * rediscovers the file.
 */
export declare const transferCodexSession: (from: LocatableSessionStore, to: LocatableSessionStore, id: string) => Promise<void>;
//# sourceMappingURL=SessionStore.d.ts.map