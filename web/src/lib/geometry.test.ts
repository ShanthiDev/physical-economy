import {describe, expect, it} from 'vitest';
import type {FlowRecord} from '../types';
import {slerpUnitVector, splitPathAtAntimeridian, vectorLength} from './geometry';
import type {Position3D, Vector3} from './types';

const NORTH_ATLANTIC: Vector3 = [0.6, 0.6, 0.5292];
const SOUTH_PACIFIC: Vector3 = [-0.4, -0.7, 0.5916];

function makeFlow(id: string): FlowRecord {
  return {
    id,
    origin: 'a',
    dest: 'b',
    count: 100,
    visualMagnitude: 1,
    lineWidth: 1,
    commodityMax: 100,
    commodityId: 'crude_oil',
    commodityGroup: 'energy',
    color: [255, 0, 0, 255],
    tooltip: 'a -> b',
    sourceId: 'baci'
  };
}

describe('slerpUnitVector', () => {
  const source = normalize(NORTH_ATLANTIC);
  const target = normalize(SOUTH_PACIFIC);

  it('hits the source exactly at t=0', () => {
    const result = slerpUnitVector(source, target, 0);
    expect(result[0]).toBeCloseTo(source[0], 10);
    expect(result[1]).toBeCloseTo(source[1], 10);
    expect(result[2]).toBeCloseTo(source[2], 10);
  });

  it('hits the target exactly at t=1', () => {
    const result = slerpUnitVector(source, target, 1);
    expect(result[0]).toBeCloseTo(target[0], 10);
    expect(result[1]).toBeCloseTo(target[1], 10);
    expect(result[2]).toBeCloseTo(target[2], 10);
  });

  it('stays on the unit sphere for intermediate t', () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const result = slerpUnitVector(source, target, t);
      expect(vectorLength(result)).toBeCloseTo(1, 10);
    }
  });
});

describe('splitPathAtAntimeridian', () => {
  it('splits a path that crosses the dateline into two segments', () => {
    const flow = makeFlow('crossing');
    const path: Position3D[] = [
      [170, 10, 0],
      [-170, 12, 0]
    ];
    const segments = splitPathAtAntimeridian(flow, path);
    expect(segments).toHaveLength(2);
    expect(segments[0].path[0][0]).toBe(170);
    expect(segments[1].path[segments[1].path.length - 1][0]).toBe(-170);
  });

  it('keeps a path that does not cross the dateline as one segment', () => {
    const flow = makeFlow('direct');
    const path: Position3D[] = [
      [10, 5, 0],
      [20, 8, 0]
    ];
    const segments = splitPathAtAntimeridian(flow, path);
    expect(segments).toHaveLength(1);
    expect(segments[0].path).toEqual(path);
  });
});

function normalize(vector: Vector3): Vector3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
