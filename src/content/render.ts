// Renders the timeline to static HTML at build time. The page is complete without JavaScript;
// the 3D scene only decorates it.
import { AI_LABELS, formatPeriod, type Station, type Timeline } from './schema.ts';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const e = escapeHtml;

function renderLinks(links: Station['links']): string {
  if (links.length === 0) return '';
  const items = links
    .map(
      (l) =>
        `<li><a href="${e(l.href)}" rel="noopener" target="_blank">${e(l.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`,
    )
    .join('');
  return `<ul class="station__links">${items}</ul>`;
}

function renderAi(s: Station): string {
  const badge = `<span class="ai-badge ai-badge--${s.ai.level}">${e(AI_LABELS[s.ai.level])}</span>`;
  if (!s.ai.split) return `<div class="station__ai">${badge}</div>`;
  const { me, ai, evidence } = s.ai.split;
  return (
    `<div class="station__ai">${badge}<dl class="split">` +
    `<dt>Me</dt><dd>${e(me)}</dd>` +
    `<dt>AI</dt><dd>${e(ai)}</dd>` +
    `<dt>Check it</dt><dd>${e(evidence)}</dd>` +
    `</dl></div>`
  );
}

export function renderStation(s: Station, index: number): string {
  const titleId = `${s.id}-title`;
  return `<section class="station station--${s.kind}" id="${e(s.id)}" data-index="${index}" data-visual="${e(s.visual)}" aria-labelledby="${titleId}">
  <div class="station__card">
    <p class="station__period"><time datetime="${e(s.from)}">${e(formatPeriod(s))}</time></p>
    <h2 id="${titleId}">${e(s.title)}</h2>
    <p class="station__role">${e(s.role)}</p>
    <p class="station__summary">${e(s.summary)}</p>
    <ul class="station__highlights">${s.highlights.map((h) => `<li>${e(h)}</li>`).join('')}</ul>
    <ul class="tech" aria-label="Technologies">${s.tech.map((t) => `<li>${e(t)}</li>`).join('')}</ul>
    ${renderAi(s)}
    ${renderLinks(s.links)}
  </div>
</section>`;
}

export function renderToc(t: Timeline): string {
  const items = t.stations
    .map(
      (s) =>
        `<li><a href="#${e(s.id)}"><span>${e(s.from.slice(0, 4))}</span> ${e(s.title)}</a></li>`,
    )
    .join('');
  return `<ol class="toc">${items}</ol>`;
}

/** Placeholders in index.html replaced by the build plugin. */
export function renderPage(t: Timeline): Record<string, string> {
  return {
    name: e(t.person.name),
    headline: e(t.person.headline),
    intro: e(t.person.intro),
    'person-links': t.person.links
      .map((l) => `<a href="${e(l.href)}" rel="noopener">${e(l.label)}</a>`)
      .join(' · '),
    toc: renderToc(t),
    stations: t.stations.map(renderStation).join('\n'),
  };
}
