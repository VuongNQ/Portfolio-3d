import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderPage, renderStation, escapeHtml } from '../src/content/render.ts';
import { AI_LEVELS, formatPeriod, validateTimeline, type Station, type Timeline } from '../src/content/schema.ts';

const timeline = JSON.parse(readFileSync(new URL('../content/timeline.json', import.meta.url), 'utf8')) as Timeline;

test('content/timeline.json is valid', () => {
  assert.deepEqual(validateTimeline(timeline), []);
});

test('AI is reported on three levels, at most "co-written"', () => {
  assert.deepEqual([...AI_LEVELS], ['none', 'assist', 'cowrite']);
  for (const s of timeline.stations) assert.ok(AI_LEVELS.includes(s.ai.level), s.id);
});

test('every personal project states tech, role and AI split', () => {
  for (const s of timeline.stations.filter((x) => x.kind === 'project')) {
    assert.ok(s.tech.length > 0, s.id);
    assert.ok(s.role.length > 0, s.id);
    assert.ok(s.ai.split, `${s.id} needs ai.split`);
  }
});

const base: Station = {
  id: 'demo', kind: 'project', visual: 'stairs', from: '2026-01', to: null, title: 'Demo', role: 'Dev',
  summary: 'x', highlights: [], tech: ['TS'], ai: { level: 'none' }, links: [],
};
const withStation = (patch: Partial<Station>): Timeline => ({ ...timeline, stations: [{ ...base, ...patch }] });

test('validation catches bad data', () => {
  assert.match(validateTimeline(withStation({ ai: { level: 'cowrite' } })).join(), /needs ai.split/);
  assert.match(validateTimeline(withStation({ ai: { level: 'in-product' as never } })).join(), /ai.level/);
  assert.match(validateTimeline(withStation({ from: '2026-13' })).join(), /YYYY/);
  assert.match(validateTimeline(withStation({ to: '2025' })).join(), /ends before/);
  assert.match(validateTimeline(withStation({ links: [{ label: 'x', href: 'http://a.b' }] })).join(), /https/);
  assert.match(validateTimeline(withStation({ summary: 'mail me at someone@example.com' })).join(), /email/);
  assert.match(validateTimeline(withStation({ summary: 'call 0912 345 678' })).join(), /phone/);
  assert.match(validateTimeline({ ...timeline, stations: [{ ...base, from: '2026-05' }, { ...base, id: 'b', from: '2026-01' }] }).join(), /chronological/);
});

test('rendering escapes text and shows the AI split', () => {
  const html = renderStation({ ...base, title: '<script>x</script>', ai: { level: 'cowrite', split: { me: 'a', ai: 'b', evidence: 'c' } } }, 0);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Co-written with AI'));
  assert.ok(html.includes('<dt>Check it</dt>'));
  assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
});

test('page renders one section per station', () => {
  const slots = renderPage(timeline);
  assert.equal(slots.stations.match(/<section /g)?.length, timeline.stations.length);
});

test('periods read naturally', () => {
  assert.equal(formatPeriod({ from: '2017', to: '2019-05' }), '2017 – May 2019');
  assert.equal(formatPeriod({ from: '2026-03', to: null }), 'Mar 2026 – now');
});
