// One small scene per station, built from primitives plus one technique each
// (instancing, a custom shader, morphing). Detailed glTF models are out of MVP scope.
import * as THREE from 'three';
import type { Visual } from '../content/schema.ts';
import { COLORS } from './rail.ts';

export interface StationVisual {
  object: THREE.Object3D;
  /** focus: 1 when the camera is at this station, falling to 0 one station away. */
  update(time: number, focus: number): void;
}

interface BuildOptions {
  particles: number;
}

const standard = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...extra });

/** Hierarchy of nodes: a manager, two leads, four members. Used by Tasken (2017) and the work manager (2026). */
function orgTree(): StationVisual {
  const group = new THREE.Group();
  const node = new THREE.SphereGeometry(0.22, 24, 16);
  const levels = [[0], [-1.1, 1.1], [-1.65, -0.55, 0.55, 1.65]];
  const points: THREE.Vector3[][] = levels.map((row, depth) =>
    row.map((x) => new THREE.Vector3(x, 1.4 - depth * 1.1, 0)),
  );
  const materials = [standard('#7dd3fc'), standard('#a5b4fc'), standard('#cbd5e1')];
  points.forEach((row, depth) =>
    row.forEach((p) => {
      const mesh = new THREE.Mesh(node, materials[depth]);
      mesh.position.copy(p);
      group.add(mesh);
    }),
  );
  const edges: THREE.Vector3[] = [];
  points[1].forEach((p, i) => {
    edges.push(points[0][0], p);
    edges.push(p, points[2][i * 2], p, points[2][i * 2 + 1]);
  });
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(edges),
      new THREE.LineBasicMaterial({ color: COLORS.rail }),
    ),
  );
  return {
    object: group,
    update(time, focus) {
      group.rotation.y = Math.sin(time * 0.4) * 0.35 * (0.3 + focus);
    },
  };
}

/** Video segments streaming past, as HLS/DASH chunks: one instanced mesh. */
function stream(): StationVisual {
  const count = 24;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.05),
    standard('#a5b4fc'),
    count,
  );
  const dummy = new THREE.Object3D();
  return {
    object: mesh,
    update(time, focus) {
      for (let i = 0; i < count; i++) {
        const t = ((i / count + time * 0.08 * (0.4 + focus)) % 1) * 2 - 1;
        dummy.position.set(t * 3, Math.sin(i * 1.7) * 0.6, Math.cos(i * 2.3) * 0.5);
        dummy.rotation.set(0, t * 0.6, 0);
        dummy.scale.setScalar(1 - Math.abs(t) * 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/** A PageSpeed-style gauge and three passing Core Web Vitals bars. */
function gauge(): StationVisual {
  const group = new THREE.Group();
  const track = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.08, 12, 96, Math.PI * 1.5),
    standard('#334155'),
  );
  track.rotation.z = -Math.PI * 0.25;
  const fill = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.1, 12, 96, Math.PI * 1.5 * 0.86),
    standard('#4ade80', { emissive: '#14532d' }),
  );
  fill.rotation.z = Math.PI * 1.25 - Math.PI * 1.5 * 0.86;
  group.add(track, fill);
  const bars = [0, 1, 2].map((i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 0.28), standard('#4ade80'));
    bar.position.set(-0.45 + i * 0.45, -0.9, 0);
    group.add(bar);
    return bar;
  });
  return {
    object: group,
    update(time, focus) {
      bars.forEach((bar, i) => {
        const h = 0.3 + focus * (0.6 + 0.15 * Math.sin(time * 2 + i));
        bar.scale.y = h;
        bar.position.y = -1.4 + h / 2;
      });
      group.rotation.y = Math.sin(time * 0.3) * 0.2;
    },
  };
}

/** A handheld console sending save files up to a cloud. Particles are one Points draw call. */
function handheld({ particles }: BuildOptions): StationVisual {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.18), standard('#1e293b'));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.62),
    new THREE.MeshBasicMaterial({ color: '#7dd3fc' }),
  );
  screen.position.z = 0.091;
  body.position.y = -0.9;
  screen.position.y = -0.9;
  const cloud = new THREE.Group();
  [
    [0, 0, 0.55],
    [-0.6, -0.1, 0.4],
    [0.6, -0.1, 0.42],
    [0.25, 0.25, 0.4],
  ].forEach(([x, y, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), standard('#e2e8f0'));
    puff.position.set(x, y, 0);
    cloud.add(puff);
  });
  cloud.position.y = 1.6;

  const seeds = new Float32Array(particles);
  const positions = new Float32Array(particles * 3);
  for (let i = 0; i < particles; i++) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: COLORS.ai, size: 0.05, transparent: true, opacity: 0.9 }),
  );
  group.add(body, screen, cloud, points);
  return {
    object: group,
    update(time, focus) {
      for (let i = 0; i < particles; i++) {
        const s = seeds[i];
        const t = (s + time * 0.25) % 1;
        positions[i * 3] = Math.sin(s * 40) * 0.5 * (1 - t);
        positions[i * 3 + 1] = -0.5 + t * 2.1;
        positions[i * 3 + 2] = Math.cos(s * 40) * 0.3 * (1 - t);
      }
      geometry.attributes.position.needsUpdate = true;
      (points.material as THREE.PointsMaterial).opacity = 0.2 + 0.7 * focus;
      cloud.position.y = 1.6 + Math.sin(time) * 0.06;
    },
  };
}

/** B1 → B2 → C1 steps and a sound-wave ring drawn by a vertex shader. */
function stairs(): StationVisual {
  const group = new THREE.Group();
  const colors = ['#94a3b8', '#a5b4fc', '#7dd3fc'];
  colors.forEach((color, i) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4 + i * 0.45, 0.9), standard(color));
    step.position.set(-1 + i * 0.95, -1.3 + (0.4 + i * 0.45) / 2, 0);
    group.add(step);
  });
  const uniforms = { uTime: { value: 0 }, uFocus: { value: 0 } };
  const wave = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2).getSpacedPoints(256),
    ),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uFocus;
        void main() {
          float angle = atan(position.y, position.x);
          float r = 1.0 + uFocus * 0.12 * sin(angle * 12.0 + uTime * 4.0) * sin(angle * 3.0 - uTime);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * r, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uFocus;
        void main() { gl_FragColor = vec4(0.96, 0.45, 0.71, uFocus); }`,
      transparent: true,
    }),
  );
  wave.position.set(0, 1.1, 0);
  wave.scale.setScalar(0.8);
  group.add(wave);
  return {
    object: group,
    update(time, focus) {
      uniforms.uTime.value = time;
      uniforms.uFocus.value = focus;
      wave.visible = focus > 0.01; // custom shader ignores fog, so hide it when far away
    },
  };
}

/** Lesson 01's flat triangle growing into a lit solid as you arrive: from raw WebGL to Three.js. */
function triangle(): StationVisual {
  const group = new THREE.Group();
  const flat = new THREE.Mesh(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, -0.8, 0),
      new THREE.Vector3(1, -0.8, 0),
      new THREE.Vector3(0, 0.95, 0),
    ]),
    new THREE.MeshBasicMaterial({ color: '#f87171', side: THREE.DoubleSide, transparent: true }),
  );
  const solid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    standard('#7dd3fc', { flatShading: true, metalness: 0.4, roughness: 0.3, transparent: true }),
  );
  group.add(flat, solid);
  return {
    object: group,
    update(time, focus) {
      const k = THREE.MathUtils.smoothstep(focus, 0.2, 0.9);
      (flat.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      (solid.material as THREE.MeshStandardMaterial).opacity = k;
      solid.scale.setScalar(0.4 + 0.6 * k);
      solid.rotation.set(time * 0.3, time * 0.5, 0);
      flat.visible = k < 0.99;
      solid.visible = k > 0.01;
    },
  };
}

export function buildStation(visual: Visual, options: BuildOptions): StationVisual {
  switch (visual) {
    case 'org-tree':
      return orgTree();
    case 'stream':
      return stream();
    case 'gauge':
      return gauge();
    case 'handheld':
      return handheld(options);
    case 'stairs':
      return stairs();
    case 'triangle':
      return triangle();
  }
}
