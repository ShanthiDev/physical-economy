import {describe, expect, it} from 'vitest';
import type {FlowRecord} from '../types';
import {buildParticleSeeds, particlePosition} from './particles';
import {DEFAULT_RENDER_CONFIG} from './types';
import type {ParticleSeed} from './types';

function makeFlow(id: string, origin: string, dest: string, count: number): FlowRecord {
  return {
    id,
    origin,
    dest,
    count,
    visualMagnitude: count,
    lineWidth: 1,
    commodityMax: count,
    commodityId: 'crude_oil',
    commodityGroup: 'energy',
    color: [255, 0, 0, 255],
    tooltip: `${origin} -> ${dest}`,
    sourceId: 'baci'
  };
}

const locationsById = new Map([
  ['a', {lon: 0, lat: 0, name: 'A'}],
  ['b', {lon: 10, lat: 10, name: 'B'}],
  ['c', {lon: -20, lat: 5, name: 'C'}]
]);

describe('buildParticleSeeds', () => {
  it('distributes the full particle budget across equal-weight flows', () => {
    const flows = [makeFlow('f1', 'a', 'b', 10), makeFlow('f2', 'b', 'c', 10), makeFlow('f3', 'c', 'a', 10)];
    const particles = buildParticleSeeds(flows, locationsById, 9, false);
    expect(particles).toHaveLength(9);
  });

  it('sums particle mass per flow back to the flow quantity within rounding tolerance', () => {
    const flows = [makeFlow('big', 'a', 'b', 1000), makeFlow('zero', 'b', 'c', 0)];
    const particles = buildParticleSeeds(flows, locationsById, 5, false);
    const bigMass = particles.filter((p) => p.flow.id === 'big').reduce((sum, p) => sum + p.massTonnes, 0);
    expect(bigMass).toBeCloseTo(1000, 0);
  });

  it('gives a zero-weight flow no particles once the budget is exhausted by heavier flows', () => {
    const flows = [makeFlow('big', 'a', 'b', 1000), makeFlow('zero', 'b', 'c', 0)];
    const particles = buildParticleSeeds(flows, locationsById, 5, false);
    expect(particles.filter((p) => p.flow.id === 'zero')).toHaveLength(0);
  });
});

describe('particlePosition', () => {
  const flow = makeFlow('direct', 'a', 'b', 100);
  const seed: ParticleSeed = {
    id: 'direct-0',
    flow,
    source: [0, 0],
    target: [10, 10],
    phase: 0,
    speed: 0.5,
    lateral: 0.3,
    wobble: 1,
    radius: 1,
    massTonnes: 10,
    routeDistanceMeters: 1_500_000
  };

  it('sits at the start position when phase is 0', () => {
    const position = particlePosition({...seed, phase: 0}, 0, DEFAULT_RENDER_CONFIG, false, false);
    expect(position[0]).toBeCloseTo(0, 5);
    expect(position[1]).toBeCloseTo(0, 5);
  });

  it('sits close to the target position as phase approaches 1', () => {
    const position = particlePosition({...seed, phase: 0.999999}, 0, DEFAULT_RENDER_CONFIG, false, false);
    expect(position[0]).toBeCloseTo(10, 2);
    expect(position[1]).toBeCloseTo(10, 2);
  });
});
