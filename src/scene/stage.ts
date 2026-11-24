// The whole 3D layer. Loaded lazily by main.ts after the content has rendered.
// Lifecycle follows the lab's defineDemo(): every listener takes the AbortSignal,
// every GPU resource is released in dispose(), and losing the WebGL context falls back to the static page.
import * as THREE from 'three';
import type { Station } from '../content/schema.ts';
import { damp, nearestStation, trackScroll } from '../scroll.ts';
import { createFrameBudget, TIERS, type Tier } from './quality.ts';
import { buildRail, buildThread, cameraPath, stationPositions } from './rail.ts';
import { buildStation, type StationVisual } from './stations.ts';

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  sections: HTMLElement[];
  stations: Station[];
  tier: Tier;
  reducedMotion: boolean;
  /** Called when the scene can no longer render (context lost); the page should show its static fallback. */
  onFail: () => void;
}

export function startScene(options: SceneOptions): () => void {
  const { canvas, sections, stations, reducedMotion, onFail } = options;
  const controller = new AbortController();
  const { signal } = controller;
  let tier = options.tier;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: TIERS[tier].antialias, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#0b1020');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0b1020', 9, 22);
  scene.add(new THREE.HemisphereLight('#e0f2fe', '#1e1b4b', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.position.set(4, 6, 5);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  const positions = stationPositions(stations.length);
  const visuals: StationVisual[] = stations.map((s, i) => {
    const v = buildStation(s.visual, { particles: TIERS[tier].particles });
    v.object.position.copy(positions[i]);
    scene.add(v.object);
    return v;
  });
  scene.add(buildRail(positions, stations.map((s) => s.ai.level)));
  const threads = stations.flatMap((s, i) => stations.slice(i + 1).map((o, k) => [s, o, i, i + 1 + k] as const))
    .filter(([a, b]) => a.visual === 'org-tree' && b.visual === 'org-tree');
  threads.forEach(([, , i, j]) => scene.add(buildThread(positions[i].clone().add(new THREE.Vector3(0, 1.6, 0)), positions[j].clone().add(new THREE.Vector3(0, 1.6, 0)))));

  const wide = window.matchMedia('(min-width: 900px)');
  const framing = () => (wide.matches ? cameraPath(positions, 2.2) : cameraPath(positions, 0, 1.6));
  let path = framing();
  wide.addEventListener('change', () => { path = framing(); }, { signal });

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIERS[tier].maxPixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const scroll = trackScroll(sections, signal);
  const budget = createFrameBudget();
  const lookAt = new THREE.Vector3();
  let progress = scroll.target;
  let shownStation = nearestStation(progress, stations.length);
  let last = performance.now();
  let frame = 0;

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    const dt = Math.min(0.1, (now - last) / 1000);
    const frameMs = now - last;
    last = now;

    if (reducedMotion) {
      // No flying: jump between stations with a short fade of the canvas.
      const next = nearestStation(scroll.target, stations.length);
      if (next !== shownStation) {
        shownStation = next;
        canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
      }
      progress = shownStation / Math.max(1, stations.length - 1);
    } else {
      progress = damp(progress, scroll.target, 4, dt);
    }

    camera.position.copy(path.position.getPoint(progress));
    camera.lookAt(path.target.getPoint(progress, lookAt));
    const time = reducedMotion ? 0 : now / 1000;
    const at = progress * (stations.length - 1);
    visuals.forEach((v, i) => v.update(time, Math.max(0, 1 - Math.abs(at - i))));
    renderer.render(scene, camera);

    if (tier === 'full' && budget.record(frameMs)) {
      tier = 'low';
      resize();
    }
  };

  const start = () => { last = performance.now(); budget.reset(); frame = requestAnimationFrame(render); };
  const stop = () => cancelAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()), { signal });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    onFail();
  }, { signal });
  start();

  return () => {
    controller.abort();
    stop();
    resizeObserver.disconnect();
    scroll.dispose();
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(material) ? material : material ? [material] : []).forEach((m) => m.dispose());
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
