/**
 * Process-wide shutdown registry.
 *
 * Sandboxes need to run synchronous cleanup (remove a container, print
 * worktree-recovery guidance) when the host process is interrupted. Registering
 * `SIGINT`/`SIGTERM`/`exit` listeners per sandbox makes Node emit a
 * `MaxListenersExceededWarning` once more than ~10 sandboxes exist concurrently.
 *
 * This module installs exactly one listener per signal — no matter how many
 * sandboxes are alive — and fans out to a set of teardown callbacks. On
 * `SIGINT`/`SIGTERM` it runs every teardown and then exits once with code 1;
 * on a plain `exit` it runs every teardown without forcing the exit code.
 */
const teardownCallbacks = new Set();
let listenersInstalled = false;
const runTeardowns = () => {
    for (const teardown of teardownCallbacks) {
        try {
            teardown();
        }
        catch {
            // Best-effort: one teardown failing must not block the others.
        }
    }
};
const handleExit = () => {
    runTeardowns();
};
const handleSignal = () => {
    // Detach first so the synchronous "exit" event triggered by process.exit()
    // below does not run the same teardowns a second time.
    detachListeners();
    runTeardowns();
    process.exit(1);
};
const attachListeners = () => {
    if (listenersInstalled)
        return;
    listenersInstalled = true;
    process.on("exit", handleExit);
    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
};
const detachListeners = () => {
    if (!listenersInstalled)
        return;
    listenersInstalled = false;
    process.removeListener("exit", handleExit);
    process.removeListener("SIGINT", handleSignal);
    process.removeListener("SIGTERM", handleSignal);
};
/**
 * Register a teardown to run when the process receives `SIGINT`/`SIGTERM` or
 * exits. The first registration installs the shared listeners; the last
 * unregistration removes them, restoring the default signal behavior.
 *
 * @param teardown Synchronous cleanup to run on shutdown.
 * @returns An idempotent function that unregisters the teardown.
 */
export const registerShutdown = (teardown) => {
    teardownCallbacks.add(teardown);
    attachListeners();
    let active = true;
    return () => {
        if (!active)
            return;
        active = false;
        teardownCallbacks.delete(teardown);
        if (teardownCallbacks.size === 0)
            detachListeners();
    };
};
//# sourceMappingURL=shutdownRegistry.js.map