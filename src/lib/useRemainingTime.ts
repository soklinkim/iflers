import { useEffect, useRef, useState } from "react";

/**
 * Wall-clock countdown. Recomputes remaining time from `Date.now()` on every
 * tick rather than counting down a local counter — a `setInterval` that just
 * decrements assumes it fires once per second, which drifts badly once the
 * phone locks or a background tab gets throttled (README §6.2).
 */
export function useRemainingTime(expiresAt: number | undefined): number {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : Infinity,
  );

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(Infinity);
      return;
    }
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    // Also re-sync immediately when the tab regains focus/visibility, so a
    // phone that was locked for ten minutes doesn't wait a second to catch up.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [expiresAt]);

  return remaining;
}

/** Fires `callback` once the first time `remaining` drops to or below each threshold. */
export function useThresholdWarnings(
  remainingMs: number,
  thresholdsMs: number[],
  callback: (thresholdMs: number) => void,
) {
  const fired = useRef(new Set<number>());
  useEffect(() => {
    for (const t of thresholdsMs) {
      if (remainingMs <= t && !fired.current.has(t)) {
        fired.current.add(t);
        callback(t);
      }
    }
  }, [remainingMs, thresholdsMs, callback]);
}
