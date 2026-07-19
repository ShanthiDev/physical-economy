import type {FlowRecord} from '../types';
import {random01} from './format';
import type {Point, Position3D, RenderConfig, RoutePath, Vector3} from './types';

export const EARTH_RADIUS_METERS = 6_371_000;
export const GLOBE_SURFACE_OFFSET_METERS = 18_000;
const UNIFORM_PLUME_WIDTH_DEGREES = 0.9;

export function normalizeLongitude(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

export function shortestLongitudeDelta(sourceLon: number, targetLon: number): number {
  let delta = targetLon - sourceLon;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function vectorLength(vector: Vector3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

export function normalizeVector(vector: Vector3): Vector3 {
  const length = vectorLength(vector);
  return length > 0.000001 ? [vector[0] / length, vector[1] / length, vector[2] / length] : [0, 0, 1];
}

export function crossVector(left: Vector3, right: Vector3): Vector3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

export function scaleVector(vector: Vector3, scale: number): Vector3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

export function addVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

export function lonLatToGlobeUnit(point: Point): Vector3 {
  const lon = degreesToRadians(point[0]);
  const lat = degreesToRadians(point[1]);
  const cosLat = Math.cos(lat);
  return [Math.sin(lon) * cosLat, -Math.cos(lon) * cosLat, Math.sin(lat)];
}

export function globeUnitToLonLat(unit: Vector3): Point {
  return [radiansToDegrees(Math.atan2(unit[0], -unit[1])), radiansToDegrees(Math.asin(Math.max(-1, Math.min(1, unit[2]))))];
}

export function unwrapLongitudeNear(lon: number, referenceLon: number): number {
  return referenceLon + shortestLongitudeDelta(referenceLon, lon);
}

export function slerpUnitVector(source: Vector3, target: Vector3, t: number): Vector3 {
  const dot = Math.max(-1, Math.min(1, source[0] * target[0] + source[1] * target[1] + source[2] * target[2]));
  const omega = Math.acos(dot);
  if (omega < 0.0001) return normalizeVector(addVectors(scaleVector(source, 1 - t), scaleVector(target, t)));
  const sinOmega = Math.sin(omega);
  return normalizeVector(addVectors(scaleVector(source, Math.sin((1 - t) * omega) / sinOmega), scaleVector(target, Math.sin(t * omega) / sinOmega)));
}

export function globeRouteNormal(source: Point, target: Point): Vector3 {
  const normal = crossVector(lonLatToGlobeUnit(source), lonLatToGlobeUnit(target));
  if (vectorLength(normal) > 0.000001) return normalizeVector(normal);
  const polarFallback = crossVector(lonLatToGlobeUnit(source), [0, 0, 1]);
  if (vectorLength(polarFallback) > 0.000001) return normalizeVector(polarFallback);
  return [1, 0, 0];
}

export function globeRoutePoint(source: Point, target: Point, t: number): Point {
  const unit = slerpUnitVector(lonLatToGlobeUnit(source), lonLatToGlobeUnit(target), t);
  const [lon, lat] = globeUnitToLonLat(unit);
  const referenceLon = source[0] + shortestLongitudeDelta(source[0], target[0]) * t;
  const polarBlend = smoothstep(Math.max(0, Math.min(1, (Math.abs(lat) - 76) / 10)));
  const stableLon = unwrapLongitudeNear(lon, referenceLon);
  return [stableLon + shortestLongitudeDelta(stableLon, referenceLon) * polarBlend, lat];
}

export function mercatorPixel(point: Point, zoom: number): Point {
  const scale = 512 * 2 ** zoom;
  const latitude = Math.max(-85.051129, Math.min(85.051129, point[1]));
  const sinLat = Math.sin(degreesToRadians(latitude));
  return [
    ((point[0] + 180) / 360) * scale,
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  ];
}

export function interpolateLinear(source: Point, target: Point, t: number): Point {
  const [sourceLon, sourceLat] = source;
  const [targetLon, targetLat] = target;
  return [
    normalizeLongitude(sourceLon + shortestLongitudeDelta(sourceLon, targetLon) * t),
    sourceLat + (targetLat - sourceLat) * t
  ];
}

export function interpolateGreatCircle(source: Point, target: Point, t: number): Point {
  const sourceLon = degreesToRadians(source[0]);
  const sourceLat = degreesToRadians(source[1]);
  const targetLon = degreesToRadians(target[0]);
  const targetLat = degreesToRadians(target[1]);
  const sourceVector = [
    Math.cos(sourceLat) * Math.cos(sourceLon),
    Math.cos(sourceLat) * Math.sin(sourceLon),
    Math.sin(sourceLat)
  ];
  const targetVector = [
    Math.cos(targetLat) * Math.cos(targetLon),
    Math.cos(targetLat) * Math.sin(targetLon),
    Math.sin(targetLat)
  ];
  const dot = Math.max(-1, Math.min(1, sourceVector[0] * targetVector[0] + sourceVector[1] * targetVector[1] + sourceVector[2] * targetVector[2]));
  const omega = Math.acos(dot);
  if (omega < 0.0001) return interpolateLinear(source, target, t);
  const sinOmega = Math.sin(omega);
  const sourceScale = Math.sin((1 - t) * omega) / sinOmega;
  const targetScale = Math.sin(t * omega) / sinOmega;
  const x = sourceScale * sourceVector[0] + targetScale * targetVector[0];
  const y = sourceScale * sourceVector[1] + targetScale * targetVector[1];
  const z = sourceScale * sourceVector[2] + targetScale * targetVector[2];
  return [normalizeLongitude(radiansToDegrees(Math.atan2(y, x))), radiansToDegrees(Math.atan2(z, Math.hypot(x, y)))];
}

export function interpolateGlobeRoute(source: Point, target: Point, t: number): Point {
  return globeRoutePoint(source, target, t);
}

export function blendRoutePoints(linear: Point, curved: Point, curveStrength: number): Point {
  const strength = Math.max(0, Math.min(1, curveStrength));
  return [
    normalizeLongitude(linear[0] + shortestLongitudeDelta(linear[0], curved[0]) * strength),
    linear[1] + (curved[1] - linear[1]) * strength
  ];
}

export function angularDistanceRadians(source: Point, target: Point): number {
  const sourceLon = degreesToRadians(source[0]);
  const sourceLat = degreesToRadians(source[1]);
  const targetLon = degreesToRadians(target[0]);
  const targetLat = degreesToRadians(target[1]);
  const sinHalfLat = Math.sin((sourceLat - targetLat) / 2);
  const sinHalfLon = Math.sin((sourceLon - targetLon) / 2);
  const a = sinHalfLat * sinHalfLat + Math.cos(sourceLat) * Math.cos(targetLat) * sinHalfLon * sinHalfLon;
  return 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function arcAltitudeMeters(source: Point, target: Point, t: number, arcHeight: number): number {
  const distance = angularDistanceRadians(source, target) * EARTH_RADIUS_METERS;
  return Math.sqrt(Math.max(0, t * (1 - t))) * distance * arcHeight;
}

export function arcHeightScale(flow: FlowRecord, config: RenderConfig): number {
  return (0.45 + Math.min(0.8, flow.lineWidth / 16)) * config.arcHeight;
}

export function plumeDistanceWidth(distance: number, damping: number): number {
  const distanceWidth = Math.min(9.5, Math.max(0.18, distance * 0.025));
  const dampedWidth = distanceWidth * (1 - damping) + UNIFORM_PLUME_WIDTH_DEGREES * damping;
  return Math.max(0.05, dampedWidth);
}

export function bendPointAlongRoute(source: Point, target: Point, base: Point, t: number, bendScale: number): Point {
  const deltaLon = shortestLongitudeDelta(source[0], target[0]);
  const deltaLat = target[1] - source[1];
  const distance = Math.max(1, Math.hypot(deltaLon, deltaLat));
  const side = source[0] <= target[0] ? 1 : -1;
  const bend = Math.min(18, distance * 0.055) * Math.sin(Math.PI * t) * bendScale * side;
  return [
    normalizeLongitude(base[0] + (-deltaLat / distance) * bend),
    base[1] + (deltaLon / distance) * bend
  ];
}

export function routeBasePoint(source: Point, target: Point, t: number, arcTrajectory: boolean, config: RenderConfig, globeMode = false): Point {
  if (!arcTrajectory && !globeMode) return interpolateLinear(source, target, t);
  const linearBase = interpolateLinear(source, target, t);
  const greatCircleBase = globeMode ? interpolateGlobeRoute(source, target, t) : interpolateGreatCircle(source, target, t);
  const blendedBase = globeMode ? greatCircleBase : blendRoutePoints(linearBase, greatCircleBase, config.arcCurve);
  if (globeMode) return blendedBase;
  return config.showRoutes
    ? blendedBase
    : bendPointAlongRoute(source, target, blendedBase, t, config.arcParticleBend);
}

export function tiltedRoutePoint(source: Point, target: Point, base: Point, t: number, config: RenderConfig, seed: string): Point {
  if (!config.arcTilt) return base;
  const deltaLon = shortestLongitudeDelta(source[0], target[0]);
  const deltaLat = target[1] - source[1];
  const distance = Math.max(1, Math.hypot(deltaLon, deltaLat));
  const tilt = (random01(`${seed}:tilt`) - 0.5) * Math.min(8, distance * 0.024) * Math.sin(Math.PI * t) * config.arcTilt;
  return [
    normalizeLongitude(base[0] + (-deltaLat / distance) * tilt),
    base[1] + (deltaLon / distance) * tilt
  ];
}

export function routeScreenLengthPixels(source: Point, target: Point, zoom: number, arcTrajectory: boolean, config: RenderConfig, globeMode = false): number {
  const samples = 14;
  const worldSize = 512 * 2 ** zoom;
  let length = 0;
  let previous = mercatorPixel(routeBasePoint(source, target, 0, arcTrajectory, config, globeMode), zoom);
  for (let index = 1; index <= samples; index += 1) {
    const t = smoothstep(index / samples);
    const current = mercatorPixel(routeBasePoint(source, target, t, arcTrajectory, config, globeMode), zoom);
    let deltaX = current[0] - previous[0];
    if (deltaX > worldSize / 2) deltaX -= worldSize;
    if (deltaX < -worldSize / 2) deltaX += worldSize;
    length += Math.hypot(deltaX, current[1] - previous[1]);
    previous = current;
  }
  return Math.max(1, length);
}

export function splitPathAtAntimeridian(flow: FlowRecord, path: Position3D[]): RoutePath[] {
  if (!path.length) return [];

  const segments: Position3D[][] = [[path[0]]];
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const lonDelta = current[0] - previous[0];
    const active = segments[segments.length - 1];

    if (Math.abs(lonDelta) <= 180) {
      active.push(current);
      continue;
    }

    const crossesEast = previous[0] > 0 && current[0] < 0;
    const edgeLon = crossesEast ? 180 : -180;
    const wrappedEdgeLon = crossesEast ? -180 : 180;
    const unwrappedCurrentLon = current[0] + (crossesEast ? 360 : -360);
    const ratio = (edgeLon - previous[0]) / (unwrappedCurrentLon - previous[0]);
    const edgeLat = previous[1] + (current[1] - previous[1]) * ratio;
    const edgeAltitude = previous[2] + (current[2] - previous[2]) * ratio;

    active.push([edgeLon, edgeLat, edgeAltitude]);
    segments.push([[wrappedEdgeLon, edgeLat, edgeAltitude], current]);
  }

  return segments
    .filter((segment) => segment.length >= 2)
    .map((segment, index) => ({id: `${flow.id}-segment-${index}`, flow, path: segment}));
}

export function buildRoutePaths(flow: FlowRecord, source: Point, target: Point, config: RenderConfig, globeMode = false): RoutePath[] {
  const segments = 64;
  if (globeMode) {
    const path = Array.from({length: segments + 1}, (_, index) => {
      const t = smoothstep(index / segments);
      const base = globeRoutePoint(source, target, t);
      return [
        base[0],
        base[1],
        GLOBE_SURFACE_OFFSET_METERS + arcAltitudeMeters(source, target, t, arcHeightScale(flow, config))
      ] as Position3D;
    });
    return [{id: `${flow.id}-globe`, flow, path}];
  }

  const path = Array.from({length: segments + 1}, (_, index) => {
    const t = smoothstep(index / segments);
    const base = tiltedRoutePoint(source, target, routeBasePoint(source, target, t, true, config), t, config, flow.id);
    return [
      base[0],
      base[1],
      arcAltitudeMeters(source, target, t, arcHeightScale(flow, config))
    ] as Position3D;
  });
  return splitPathAtAntimeridian(flow, path);
}
