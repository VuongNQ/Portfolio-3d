// Progressive enhancement: the HTML is complete on its own. The 3D layer is loaded only when
// WebGL 2 is available and the browser is idle after first paint, so it never delays LCP.
import './style.css';
import timeline from '../content/timeline.json';
import type { Timeline } from './content/schema.ts';
import { initialTier } from './scene/quality.ts';

const data = timeline as Timeline;
const root = document.documentElement;
const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const sections = [...document.querySelectorAll<HTMLElement>('.station')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

function supportsWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function markActiveStation() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  sections.forEach((s) => observer.observe(s));
}

async function startScene() {
  if (!canvas || sections.length !== data.stations.length) return;
  const { startScene: start } = await import('./scene/stage.ts');
  start({
    canvas,
    sections,
    stations: data.stations,
    reducedMotion: reducedMotion.matches,
    tier: initialTier({
      narrow: window.matchMedia('(max-width: 768px)').matches,
      cores: navigator.hardwareConcurrency || 4,
      saveData: connection?.saveData === true,
    }),
    onFail: () => root.classList.replace('has-webgl', 'no-webgl'),
  });
}

markActiveStation();
if (canvas && supportsWebGL2() && connection?.saveData !== true) {
  root.classList.add('has-webgl');
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
  const boot = () =>
    idle(() => {
      startScene().catch((error: unknown) => {
        console.error(error);
        root.classList.replace('has-webgl', 'no-webgl');
      });
    });
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });
} else {
  root.classList.add('no-webgl');
}
