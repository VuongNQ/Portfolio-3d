// Maps native page scroll to a 0..1 progress along the rail. Never takes over scrolling:
// it only reads positions, so keyboard, touch, find-in-page and anchors keep working.

/**
 * Progress from the viewport centre and the centres of the station sections (page coordinates, ascending).
 * 0 = first station centred, 1 = last station centred; linear between neighbours, so station i sits at i/(n-1).
 */
export function progressFromCenters(centers: readonly number[], viewportCenter: number): number {
  const n = centers.length;
  if (n < 2) return 0;
  if (viewportCenter <= centers[0]) return 0;
  if (viewportCenter >= centers[n - 1]) return 1;
  let i = 0;
  while (viewportCenter > centers[i + 1]) i++;
  const span = centers[i + 1] - centers[i];
  const local = span > 0 ? (viewportCenter - centers[i]) / span : 0;
  return (i + local) / (n - 1);
}

/** Index of the station closest to a progress value. */
export function nearestStation(progress: number, count: number): number {
  if (count < 2) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(progress * (count - 1))));
}

/** Frame-rate independent exponential smoothing. `rate` is in 1/second. */
export function damp(current: number, target: number, rate: number, dtSeconds: number): number {
  return target + (current - target) * Math.exp(-rate * dtSeconds);
}

export interface ScrollTracker {
  /** Latest progress target, 0..1. */
  readonly target: number;
  dispose(): void;
}

export function trackScroll(sections: readonly HTMLElement[], signal: AbortSignal): ScrollTracker {
  let centers: number[] = [];
  const state = { target: 0 };

  const measure = () => {
    centers = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top + window.scrollY + rect.height / 2;
    });
    update();
  };
  const update = () => {
    state.target = progressFromCenters(centers, window.scrollY + window.innerHeight / 2);
  };

  measure();
  window.addEventListener('scroll', update, { passive: true, signal });
  window.addEventListener('resize', measure, { signal });
  const observer = new ResizeObserver(measure);
  sections.forEach((el) => observer.observe(el));
  signal.addEventListener('abort', () => observer.disconnect());

  return {
    get target() {
      return state.target;
    },
    dispose: () => observer.disconnect(),
  };
}
