// Two quality tiers, as in lab lesson 17, plus the frame-time budget from lesson 16:
// if the 95th percentile frame time stays over budget, drop from "full" to "low" once.

export type Tier = 'full' | 'low';

export interface TierSettings {
  maxPixelRatio: number;
  particles: number;
  antialias: boolean;
}

export const TIERS: Record<Tier, TierSettings> = {
  full: { maxPixelRatio: 2, particles: 600, antialias: true },
  low: { maxPixelRatio: 1, particles: 160, antialias: false },
};

/** Start tier from the device: narrow screens, few cores or data saver begin on "low". */
export function initialTier(env: { narrow: boolean; cores: number; saveData: boolean }): Tier {
  return env.narrow || env.cores <= 4 || env.saveData ? 'low' : 'full';
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/** Collects frame times; returns true once when the p95 of a full window exceeds the budget. */
export function createFrameBudget(budgetMs = 20, windowSize = 120) {
  const samples: number[] = [];
  let tripped = false;
  return {
    record(frameMs: number): boolean {
      if (tripped) return false;
      samples.push(frameMs);
      if (samples.length < windowSize) return false;
      const p95 = percentile(samples, 95);
      samples.length = 0;
      if (p95 > budgetMs) {
        tripped = true;
        return true;
      }
      return false;
    },
    reset() {
      samples.length = 0;
    },
  };
}
