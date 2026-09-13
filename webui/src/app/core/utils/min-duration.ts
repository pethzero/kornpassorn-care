/** Default minimum time (ms) a loading spinner should stay visible so fast requests don't just flash. */
export const MIN_SPINNER_MS = 500;

/**
 * Runs `callback` only after at least `minMs` has passed since `startedAt`,
 * so a spinner shown for a near-instant request doesn't flicker on/off.
 */
export function afterMinDuration(startedAt: number, callback: () => void, minMs: number = MIN_SPINNER_MS): void {
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining <= 0) {
    callback();
  } else {
    setTimeout(callback, remaining);
  }
}
