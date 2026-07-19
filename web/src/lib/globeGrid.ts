import {GLOBE_SURFACE_OFFSET_METERS} from './geometry';
import type {GlobeGridLine, GlobeSurfaceCell, Position3D} from './types';

const GLOBE_OCEAN_OFFSET_METERS = -12_000;

export function buildGlobeSurfaceCells(): GlobeSurfaceCell[] {
  const cells: GlobeSurfaceCell[] = [];
  const step = 10;
  for (let lat = -90; lat < 90; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      cells.push({
        id: `surface-${lon}-${lat}`,
        polygon: [
          [lon, lat, GLOBE_OCEAN_OFFSET_METERS],
          [lon + step, lat, GLOBE_OCEAN_OFFSET_METERS],
          [lon + step, lat + step, GLOBE_OCEAN_OFFSET_METERS],
          [lon, lat + step, GLOBE_OCEAN_OFFSET_METERS]
        ]
      });
    }
  }
  return cells;
}

export function buildGlobeGridLines(): GlobeGridLine[] {
  const lines: GlobeGridLine[] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    lines.push({
      id: `parallel-${lat}`,
      path: Array.from({length: 145}, (_, index) => [-180 + index * 2.5, lat, GLOBE_SURFACE_OFFSET_METERS] as Position3D)
    });
  }
  for (let lon = -180; lon < 180; lon += 15) {
    lines.push({
      id: `meridian-${lon}`,
      path: Array.from({length: 65}, (_, index) => [lon, -80 + index * 2.5, GLOBE_SURFACE_OFFSET_METERS] as Position3D)
    });
  }
  return lines;
}

export const GLOBE_SURFACE_CELLS = buildGlobeSurfaceCells();
export const GLOBE_GRID_LINES = buildGlobeGridLines();
