/**
 * Daytona isolated sandbox provider.
 *
 * Creates ephemeral Daytona sandboxes via `@daytona/sdk`.
 * Requires `@daytona/sdk` as a peer dependency.
 */
import { type IsolatedSandboxProvider } from "../SandboxProvider.js";
import type { CreateSandboxFromImageParams, CreateSandboxFromSnapshotParams } from "@daytona/sdk";
/** Options for the Daytona sandbox provider. */
export interface DaytonaOptions {
    /**
     * Daytona API key for authentication.
     * Falls back to the `DAYTONA_API_KEY` environment variable if not provided.
     */
    readonly apiKey?: string;
    /**
     * Daytona API URL.
     * Falls back to the `DAYTONA_API_URL` environment variable if not provided.
     */
    readonly apiUrl?: string;
    /**
     * Target environment for sandboxes.
     * Falls back to the `DAYTONA_TARGET` environment variable if not provided.
     */
    readonly target?: string;
    /**
     * Options passed through to the Daytona SDK when creating a sandbox.
     * Supports both image-based and snapshot-based creation.
     */
    readonly create?: CreateSandboxFromImageParams | CreateSandboxFromSnapshotParams;
    /** Environment variables injected by this provider. Merged at launch time with env resolver and agent provider env. */
    readonly env?: Record<string, string>;
    /**
     * Maximum number of characters of streamed `exec` output retained per stream
     * (stdout and stderr) when an `onLine` callback is supplied (default: 64KiB).
     *
     * Output is delivered live to `onLine` regardless; this only bounds the tail
     * returned in `ExecResult`, preventing a long-running agent's output from
     * overflowing V8's max string length and crashing the run.
     */
    readonly maxOutputTailChars?: number;
}
/**
 * Create a Daytona isolated sandbox provider.
 *
 * Sandboxes are ephemeral — each `create()` call spins up a new Daytona
 * sandbox and `close()` destroys it.
 *
 * @example
 * ```ts
 * import { daytona } from "@ai-hero/sandcastle/sandboxes/daytona";
 *
 * const provider = daytona({ apiKey: "dyt_my_key" });
 * ```
 */
export declare const daytona: (options?: DaytonaOptions | undefined) => IsolatedSandboxProvider;
//# sourceMappingURL=daytona.d.ts.map