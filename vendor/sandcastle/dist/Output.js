// ---------------------------------------------------------------------------
// Output namespace — public API
// ---------------------------------------------------------------------------
/**
 * Helpers for declaring structured output on `run()`.
 *
 * ```ts
 * import { Output, run } from "@ai-hero/sandcastle";
 * import { z } from "zod";
 *
 * const result = await run({
 *   output: Output.object({ tag: "result", schema: z.object({ answer: z.number() }) }),
 *   // ...
 * });
 * console.log(result.output.answer); // typed as number
 * ```
 */
export const Output = {
    /**
     * Declare an object-typed structured output extracted from an XML tag in
     * the agent's stdout. The tag contents are JSON-parsed (with fence-aware
     * unwrapping) and validated against the provided Standard Schema validator.
     */
    object: (opts) => ({
        _tag: "object",
        tag: opts.tag,
        schema: opts.schema,
    }),
    /**
     * Declare a string-typed structured output extracted from an XML tag in
     * the agent's stdout. The tag contents are whitespace-trimmed and returned
     * as a plain string — no JSON parsing, no schema validation.
     */
    string: (opts) => ({
        _tag: "string",
        tag: opts.tag,
    }),
};
/**
 * Thrown by `run()` when structured output extraction or validation fails.
 *
 * Possible failure modes:
 * - The configured XML tag was not found in stdout (`rawMatched` is `undefined`).
 * - The tag contents failed `JSON.parse` (`cause` carries the parse error).
 * - The parsed JSON failed schema validation (`cause` carries the Standard Schema issues).
 *
 * The error carries `commits`, `branch`, and optionally `preservedWorktreePath`
 * so callers can decide recovery without losing the run's side effects.
 *
 * It also carries `sessionId` (and `sessionFilePath` when the session was
 * captured to the host) of the iteration that produced the bad output, so a
 * caller can resume that same session and ask the agent to re-emit corrected
 * output:
 *
 * ```ts
 * try {
 *   return await run({ ...opts, output });
 * } catch (e) {
 *   if (e instanceof StructuredOutputError && e.sessionId) {
 *     return await run({
 *       ...opts,
 *       output,
 *       resumeSession: e.sessionId,
 *       prompt: feedback(e),
 *     });
 *   }
 *   throw e;
 * }
 * ```
 */
export class StructuredOutputError extends Error {
    tag;
    rawMatched;
    cause;
    commits;
    branch;
    preservedWorktreePath;
    /** Session ID of the iteration that produced the bad output, when available. */
    sessionId;
    /** Host path to the captured session JSONL, when the session was captured. */
    sessionFilePath;
    constructor(message, options) {
        super(message);
        this.name = "StructuredOutputError";
        this.tag = options.tag;
        this.rawMatched = options.rawMatched;
        this.cause = options.cause;
        this.commits = options.commits;
        this.branch = options.branch;
        this.preservedWorktreePath = options.preservedWorktreePath;
        this.sessionId = options.sessionId;
        this.sessionFilePath = options.sessionFilePath;
    }
}
//# sourceMappingURL=Output.js.map