// ============================================================
// hodi - Shared clock (copied from fina/src/lib/clock.ts)
//
// React 19 forbids Date.now() during render. Read the time in one place,
// update every minute and whenever the app returns to the foreground, expose
// it via useSyncExternalStore. So the page notices the new day (04:00) even
// when the app stays open overnight.
// ============================================================

const TICK_MS = 60_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function onVisibility() {
  if (document.visibilityState === 'visible') tick();
}

export const clockStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    if (!timer) {
      timer = setInterval(tick, TICK_MS);
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      listeners.delete(fn);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  },
  get: () => now,
  // The server has no correct "now" for the client - return 0; the render
  // after hydration fills in the real value.
  getServer: () => 0,
};
