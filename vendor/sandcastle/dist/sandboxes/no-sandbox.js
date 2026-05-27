/**
 * No-sandbox provider — runs the agent directly on the host with no container isolation.
 *
 * Usage:
 *   import { noSandbox } from "sandcastle/sandboxes/no-sandbox";
 *   await interactive({ agent: claudeCode("claude-opus-4-7"), sandbox: noSandbox() });
 *
 * Accepted by `run()`, `interactive()`, and `createSandbox()`. Skips
 * container isolation entirely — the agent executes on the host. Does not
 * pass `--dangerously-skip-permissions` to the agent — the user manages
 * permissions themselves.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { BoundedTail, MAX_TAIL_CHARS } from "../boundedTail.js";
/**
 * Create a no-sandbox provider.
 *
 * The returned provider runs the agent directly on the host. All three
 * branch strategies are supported (head, merge-to-head, branch),
 * defaulting to head.
 */
export const noSandbox = (options) => ({
    tag: "none",
    name: "no-sandbox",
    env: options?.env ?? {},
    create: async (createOptions) => {
        const worktreePath = createOptions.worktreePath;
        const processEnv = { ...process.env, ...createOptions.env };
        const maxOutputTailChars = options?.maxOutputTailChars ?? MAX_TAIL_CHARS;
        const handle = {
            worktreePath,
            exec: (command, opts) => {
                // sudo is a no-op for no-sandbox — the user is already on the host
                const cwd = opts?.cwd ?? worktreePath;
                return new Promise((resolve, reject) => {
                    const proc = spawn("sh", ["-c", command], {
                        cwd,
                        env: processEnv,
                        stdio: [
                            opts?.stdin !== undefined ? "pipe" : "ignore",
                            "pipe",
                            "pipe",
                        ],
                    });
                    if (opts?.stdin !== undefined) {
                        proc.stdin.write(opts.stdin);
                        proc.stdin.end();
                    }
                    proc.on("error", (error) => {
                        reject(new Error(`exec failed: ${error.message}`));
                    });
                    if (opts?.onLine) {
                        const onLine = opts.onLine;
                        const stdoutTail = new BoundedTail(maxOutputTailChars, "\n");
                        const stderrTail = new BoundedTail(maxOutputTailChars, "");
                        const rl = createInterface({ input: proc.stdout });
                        rl.on("line", (line) => {
                            stdoutTail.push(line);
                            onLine(line);
                        });
                        proc.stderr.on("data", (chunk) => {
                            stderrTail.push(chunk.toString());
                        });
                        proc.on("close", (code) => {
                            resolve({
                                stdout: stdoutTail.toString(),
                                stderr: stderrTail.toString(),
                                exitCode: code ?? 0,
                            });
                        });
                    }
                    else {
                        const stdoutChunks = [];
                        const stderrChunks = [];
                        proc.stdout.on("data", (chunk) => {
                            stdoutChunks.push(chunk.toString());
                        });
                        proc.stderr.on("data", (chunk) => {
                            stderrChunks.push(chunk.toString());
                        });
                        proc.on("close", (code) => {
                            resolve({
                                stdout: stdoutChunks.join(""),
                                stderr: stderrChunks.join(""),
                                exitCode: code ?? 0,
                            });
                        });
                    }
                });
            },
            interactiveExec: (args, opts) => {
                return new Promise((resolve, reject) => {
                    const [cmd, ...rest] = args;
                    const proc = spawn(cmd, rest, {
                        cwd: opts.cwd ?? worktreePath,
                        env: processEnv,
                        stdio: [opts.stdin, opts.stdout, opts.stderr],
                    });
                    proc.on("error", (error) => {
                        reject(new Error(`exec failed: ${error.message}`));
                    });
                    proc.on("close", (code) => {
                        resolve({ exitCode: code ?? 0 });
                    });
                });
            },
            close: async () => {
                // No-op — no container to tear down
            },
        };
        return handle;
    },
});
//# sourceMappingURL=no-sandbox.js.map