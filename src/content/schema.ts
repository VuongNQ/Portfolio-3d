// Shape of content/timeline.json, the single source for both the HTML and the 3D scene.
// validateTimeline() runs at build time (vite.config.ts) and in tests, so bad data fails the build.

export const AI_LEVELS = ['none', 'assist', 'cowrite'] as const;
export type AiLevel = (typeof AI_LEVELS)[number];

export const AI_LABELS: Record<AiLevel, string> = {
  none: 'No AI',
  assist: 'AI suggestions',
  cowrite: 'Co-written with AI',
};

export const VISUALS = ['org-tree', 'stream', 'gauge', 'handheld', 'stairs', 'triangle'] as const;
export type Visual = (typeof VISUALS)[number];

export interface Link {
  label: string;
  href: string;
}

export interface AiUse {
  level: AiLevel;
  /** Required when level is "cowrite": who did what, and what a reader can check. */
  split?: { me: string; ai: string; evidence: string };
}

export interface Station {
  id: string;
  kind: 'career' | 'project';
  visual: Visual;
  /** "YYYY" or "YYYY-MM". */
  from: string;
  /** null = ongoing. */
  to: string | null;
  title: string;
  role: string;
  summary: string;
  highlights: string[];
  tech: string[];
  ai: AiUse;
  links: Link[];
}

export interface Timeline {
  person: { name: string; headline: string; intro: string; links: Link[] };
  stations: Station[];
}

const PERIOD = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /(?:\+?\d[\s.-]?){9,}/;

/** Returns a list of problems; empty means valid. */
export function validateTimeline(data: Timeline): string[] {
  const errors: string[] = [];
  const raw = JSON.stringify(data);
  if (EMAIL.test(raw)) errors.push('timeline contains an email address');
  if (PHONE.test(raw)) errors.push('timeline contains something that looks like a phone number');

  const ids = new Set<string>();
  let previousFrom = '';
  data.stations.forEach((s, i) => {
    const at = `stations[${i}] (${s.id})`;
    if (!/^[a-z0-9-]+$/.test(s.id)) errors.push(`${at}: id must be kebab-case`);
    if (ids.has(s.id)) errors.push(`${at}: duplicate id`);
    ids.add(s.id);
    if (!VISUALS.includes(s.visual)) errors.push(`${at}: unknown visual "${s.visual}"`);
    if (!PERIOD.test(s.from)) errors.push(`${at}: from must be YYYY or YYYY-MM`);
    if (s.to !== null && !PERIOD.test(s.to)) errors.push(`${at}: to must be YYYY, YYYY-MM or null`);
    if (s.to !== null && s.to < s.from) errors.push(`${at}: ends before it starts`);
    if (s.from < previousFrom) errors.push(`${at}: stations must be in chronological order`);
    previousFrom = s.from;
    if (!AI_LEVELS.includes(s.ai.level))
      errors.push(`${at}: ai.level must be one of ${AI_LEVELS.join(', ')}`);
    if (s.ai.level === 'cowrite' && !s.ai.split)
      errors.push(`${at}: co-written work needs ai.split`);
    if (s.tech.length === 0) errors.push(`${at}: list at least one technology`);
    for (const link of s.links) {
      if (!link.href.startsWith('https://'))
        errors.push(`${at}: link "${link.label}" must use https`);
    }
  });
  return errors;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPeriodPart(value: string): string {
  const [year, month] = value.split('-');
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

export function formatPeriod(s: Pick<Station, 'from' | 'to'>): string {
  return `${formatPeriodPart(s.from)} – ${s.to === null ? 'now' : formatPeriodPart(s.to)}`;
}
