import { Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { WorktreeError, WorktreeTimeoutError } from "./errors.js";
/** Sanitize a name for use in branch names and directory names. */
export declare const sanitizeName: (name: string) => string;
/**
 * Generates a temporary branch name.
 * When name is provided: `sandcastle/<sanitized-name>/<YYYYMMDD-HHMMSS>`.
 * Otherwise: `sandcastle/<YYYYMMDD-HHMMSS>`.
 */
export declare const generateTempBranchName: (name?: string | undefined) => string;
/** Returns the name of the currently checked-out branch in the given repo directory. */
export declare const getCurrentBranch: (repoDir: string) => Effect.Effect<string, WorktreeError, never>;
export interface WorktreeInfo {
    path: string;
    branch: string;
}
/** A single entry parsed from `git worktree list --porcelain`. */
export interface WorktreeEntry {
    path: string;
    /** `null` for a detached HEAD (e.g. mid-rebase). */
    branch: string | null;
}
/**
 * Finds an existing worktree that collides with `branch` or `worktreePath`.
 *
 * Matches by branch first, then falls back to a path match — covering the
 * mid-rebase detached-HEAD case where git reports a `null` branch. The path
 * fallback normalizes separators so it works on Windows.
 */
export declare const findCollidingWorktree: (existing: readonly WorktreeEntry[], branch: string, worktreePath: string) => WorktreeEntry | undefined;
/**
 * Whether `worktreePath` lives under `worktreesDir` (i.e. is a worktree managed
 * by sandcastle rather than the main working tree or an external worktree).
 * Separators are normalized so the check holds on Windows.
 */
export declare const isManagedWorktreePath: (worktreePath: string, worktreesDir: string) => boolean;
/**
 * Whether a directory entry under `.sandcastle/worktrees/` is orphaned — not
 * present in the set of active worktree paths reported by git. Both sides are
 * normalized so paths from `join` (backslashes on Windows) match git's
 * forward-slash output.
 */
export declare const isOrphanedWorktreePath: (entryPath: string, activeWorktreePaths: Iterable<string>) => boolean;
/**
 * Creates a git worktree at `.sandcastle/worktrees/<name>/`.
 *
 * - If `branch` is specified, checks out that branch.
 * - If not, creates a temporary `sandcastle/<timestamp>` branch.
 *
 * When `branch` collides with an existing managed worktree:
 * - Clean → reuses the existing worktree.
 * - Dirty (uncommitted changes) → reuses with a console warning (ADR 0003).
 *
 * Collisions with the main working tree or external worktrees always throw.
 */
export declare const create: (repoDir: string, opts?: {
    branch?: string | undefined;
    baseBranch?: string | undefined;
    name?: string | undefined;
} | undefined) => Effect.Effect<WorktreeInfo, WorktreeError | WorktreeTimeoutError, FileSystem.FileSystem>;
/**
 * Returns true if the worktree at `worktreePath` has any uncommitted changes:
 * unstaged modifications, staged changes, or untracked files.
 */
export declare const hasUncommittedChanges: (worktreePath: string) => Effect.Effect<boolean, WorktreeError, never>;
/**
 * Removes a worktree and its git metadata.
 *
 * The `worktreePath` must be a path inside `.sandcastle/worktrees/` so that
 * the main repository directory can be derived from it.
 */
export declare const remove: (worktreePath: string) => Effect.Effect<void, WorktreeError, never>;
/**
 * Prunes stale git worktree metadata and removes orphaned directories under
 * `.sandcastle/worktrees/`.
 */
export declare const pruneStale: (repoDir: string) => Effect.Effect<void, WorktreeError | WorktreeTimeoutError, FileSystem.FileSystem>;
//# sourceMappingURL=WorktreeManager.d.ts.map