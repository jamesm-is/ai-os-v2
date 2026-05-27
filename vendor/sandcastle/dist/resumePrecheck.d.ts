import type { AgentProvider } from "./AgentProvider.js";
/**
 * Fail-fast validation that a resumable agent session exists on the host before
 * launching the agent. Throws a descriptive error when the session is missing.
 *
 * The lookup strategy depends on the sandbox:
 *
 * - **No-sandbox**: the agent runs directly on the host and writes its session
 *   in place under a cwd-derived directory; Sandcastle never moves it. The
 *   agent's own path encoding (realpath canonicalisation plus
 *   non-alphanumeric → hyphen) is fragile and platform-specific to reconstruct,
 *   so we locate the file by its globally-unique session id instead.
 * - **Sandboxed (bind-mount)**: Sandcastle's capture transfers the session into
 *   the host store keyed on the host repo dir, so for a resumable run the file
 *   lives at that exact encoded location — check it directly rather than
 *   scanning. (Isolated sandboxes fall here too, but neither capture nor resume
 *   transfer is wired for them today, so this is the host-repo-dir check by
 *   default.)
 */
export declare const assertResumeSessionExists: (params: {
    readonly provider: AgentProvider;
    readonly sandboxTag: "bind-mount" | "isolated" | "none";
    readonly hostRepoDir: string;
    readonly resumeSession: string;
}) => Promise<void>;
//# sourceMappingURL=resumePrecheck.d.ts.map