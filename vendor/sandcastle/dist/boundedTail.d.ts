/**
 * A bounded, rolling tail of streamed output — a pure, provider-agnostic
 * utility shared by every sandbox provider that streams `exec` output.
 *
 * When a provider streams output line-by-line, it accumulates the stream only
 * to build the returned `ExecResult.stdout`/`stderr`. Consumers read just the
 * tail of that value (e.g. the last lines of an error, or a fallback for the
 * agent's final result), so retaining the whole stream is unnecessary — and,
 * once the accumulated string passes V8's ~512MB max string length, fatal: a
 * naive `chunks.join()` throws `RangeError: Invalid string length`, which on a
 * long agent run crashes the whole orchestration.
 */
/**
 * Default maximum number of characters retained in a bounded output tail.
 *
 * 64KiB sits comfortably above any agent completion signal or structured-output
 * payload while staying far below V8's max string length.
 */
export declare const MAX_TAIL_CHARS: number;
/**
 * A fixed-size rolling tail of strings, bounded by total character length.
 *
 * `push` appends to the tail; once the joined length would exceed `maxChars`,
 * the oldest items are dropped from the front. A single item longer than
 * `maxChars` is truncated to its own tail, so a newline-free blob can't
 * overflow on one push. `toString` joins the retained items, and its length is
 * always at most `maxChars`.
 *
 * The running length counter is encapsulated so callers can't desync it.
 */
export declare class BoundedTail {
    private readonly items;
    private totalChars;
    private readonly maxChars;
    private readonly separator;
    /**
     * @param maxChars Maximum length of the joined tail. Defaults to {@link MAX_TAIL_CHARS}.
     * @param separator String placed between items by {@link toString}. Must match
     *   how the caller would otherwise have joined the accumulated chunks (e.g.
     *   `"\n"` for line streams, `""` for raw chunk streams).
     */
    constructor(maxChars?: number, separator?: string);
    /** Append one item to the tail, evicting oldest items to stay within budget. */
    push(item: string): void;
    /** Join the retained tail into a single string (length ≤ `maxChars`). */
    toString(): string;
}
//# sourceMappingURL=boundedTail.d.ts.map