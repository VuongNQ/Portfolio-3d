// The timeline as a path in space. Stations sit at the control points of a Catmull-Rom spline,
// so station i is exactly at curve parameter i/(n-1), the same value the scroll tracker produces.
import * as THREE from 'three';
import type { AiLevel } from '../content/schema.ts';

export const COLORS = {
  rail: new THREE.Color('#64748b'),
  ai: new THREE.Color('#f472b6'),
  accent: new THREE.Color('#7dd3fc'),
};

const SPACING_Z = 12;
const DROP_Y = 1.2;
const SWAY_X = 2.6;

export function stationPositions(count: number): THREE.Vector3[] {
  return Array.from(
    { length: count },
    (_, i) => new THREE.Vector3(i % 2 === 0 ? -SWAY_X : SWAY_X, -i * DROP_Y, -i * SPACING_Z),
  );
}

export interface CameraPath {
  position: THREE.CatmullRomCurve3;
  target: THREE.CatmullRomCurve3;
}

/**
 * Camera and look-at curves. `side` shifts the framing so the station appears to the right of
 * the text card on wide screens (side > 0) or centred on narrow ones (side = 0). `lift` aims the
 * camera lower so the station sits in the upper part of the screen, above the card on phones.
 */
export function cameraPath(stations: readonly THREE.Vector3[], side: number, lift = 0): CameraPath {
  const shift = new THREE.Vector3(-side, -lift, 0);
  const target = stations.map((p) => p.clone().add(shift));
  const position = stations.map((p) =>
    p
      .clone()
      .add(shift)
      .add(new THREE.Vector3(0, 1.3, 8)),
  );
  return {
    position: new THREE.CatmullRomCurve3(position, false, 'centripetal'),
    target: new THREE.CatmullRomCurve3(target, false, 'centripetal'),
  };
}

/**
 * Rail tube under the stations. Segments around stations whose work was co-written with AI are
 * tinted, so the moment AI joined the workflow is visible at a glance.
 */
export function buildRail(
  stations: readonly THREE.Vector3[],
  levels: readonly AiLevel[],
): THREE.Group {
  const group = new THREE.Group();
  const railPoints = stations.map((p) => p.clone().add(new THREE.Vector3(0, -2.1, 0)));
  const curve = new THREE.CatmullRomCurve3(railPoints, false, 'centripetal');
  const tubular = 64 * (stations.length - 1);
  const radial = 6;
  const geometry = new THREE.TubeGeometry(curve, tubular, 0.025, radial, false);

  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const last = stations.length - 1;
  for (let j = 0; j <= tubular; j++) {
    const station = Math.round((j / tubular) * last);
    const color = levels[station] === 'cowrite' ? COLORS.ai : COLORS.rail;
    for (let r = 0; r <= radial; r++) color.toArray(colors, (j * (radial + 1) + r) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true })));

  // A milestone post at every station.
  const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
  const postMaterial = new THREE.MeshBasicMaterial({ color: COLORS.rail });
  railPoints.forEach((p) => {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.copy(p).add(new THREE.Vector3(0, 0.3, 0));
    group.add(post);
  });
  return group;
}

/** A dashed arc between two stations that tell the same story (Tasken 2017 → work manager 2026). */
export function buildThread(from: THREE.Vector3, to: THREE.Vector3): THREE.Line {
  const mid = from
    .clone()
    .lerp(to, 0.5)
    .add(new THREE.Vector3(0, 6, 0));
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
  const line = new THREE.Line(
    geometry,
    new THREE.LineDashedMaterial({
      color: COLORS.accent,
      dashSize: 0.4,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.5,
    }),
  );
  line.computeLineDistances();
  return line;
}
