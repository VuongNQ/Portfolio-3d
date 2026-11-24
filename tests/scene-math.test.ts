import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrameBudget, initialTier, percentile } from '../src/scene/quality.ts';
import { damp, nearestStation, progressFromCenters } from '../src/scroll.ts';

test('progress puts station i at i/(n-1)', () => {
  const centers = [100, 300, 500];
  assert.equal(progressFromCenters(centers, 0), 0);
  assert.equal(progressFromCenters(centers, 100), 0);
  assert.equal(progressFromCenters(centers, 200), 0.25);
  assert.equal(progressFromCenters(centers, 300), 0.5);
  assert.equal(progressFromCenters(centers, 400), 0.75);
  assert.equal(progressFromCenters(centers, 900), 1);
  assert.equal(progressFromCenters([100], 50), 0);
});

test('nearest station rounds and clamps', () => {
  assert.equal(nearestStation(0.24, 5), 1);
  assert.equal(nearestStation(0.26, 5), 1);
  assert.equal(nearestStation(-1, 5), 0);
  assert.equal(nearestStation(2, 5), 4);
});

test('damping converges and is frame-rate independent', () => {
  let a = 0;
  for (let i = 0; i < 60; i++) a = damp(a, 1, 4, 1 / 60);
  const b = damp(0, 1, 4, 1);
  assert.ok(Math.abs(a - b) < 1e-9);
  assert.ok(b > 0.98 && b < 1);
});

test('tiers start low on small or weak devices', () => {
  assert.equal(initialTier({ narrow: false, cores: 8, saveData: false }), 'full');
  assert.equal(initialTier({ narrow: true, cores: 8, saveData: false }), 'low');
  assert.equal(initialTier({ narrow: false, cores: 4, saveData: false }), 'low');
  assert.equal(initialTier({ narrow: false, cores: 8, saveData: true }), 'low');
});

test('frame budget trips once when p95 is over budget', () => {
  assert.equal(percentile([1, 2, 3, 4, 100], 95), 100);
  const budget = createFrameBudget(20, 10);
  let trips = 0;
  for (let i = 0; i < 10; i++) trips += budget.record(16) ? 1 : 0;
  assert.equal(trips, 0);
  for (let i = 0; i < 30; i++) trips += budget.record(i % 2 ? 40 : 16) ? 1 : 0;
  assert.equal(trips, 1);
});
