import type {FlowRecord} from '../types';
import {random01, withAlpha} from './format';
import {
  EARTH_RADIUS_METERS,
  GLOBE_SURFACE_OFFSET_METERS,
  addVectors,
  angularDistanceRadians,
  arcAltitudeMeters,
  arcHeightScale,
  degreesToRadians,
  globeRouteNormal,
  globeRoutePoint,
  globeUnitToLonLat,
  lonLatToGlobeUnit,
  normalizeLongitude,
  normalizeVector,
  plumeDistanceWidth,
  routeBasePoint,
  scaleVector,
  shortestLongitudeDelta,
  slerpUnitVector,
  smoothstep,
  tiltedRoutePoint,
  unwrapLongitudeNear
} from './geometry';
import type {FlowParticlePlan, ParticlePoint, ParticleSeed, Point, Position3D, RenderConfig, RenderMode} from './types';

export const SPEED_REFERENCE_ROUTE_METERS = 4_000_000;
export const TRAIL_SPACING_PIXEL_SCALE = 10;

export function isParticleRenderMode(mode: RenderMode): boolean {
  return mode === 'particle-plume' || mode === 'particle-trails' || mode === 'particle-arc-plume' || mode === 'particle-arc-trails';
}

function trailAlpha(trailIndex: number, copies: number, glow: number): number {
  if (copies <= 1) return glow;
  const fadeRatio = trailIndex / (copies - 1);
  const tailAlpha = Math.min(glow, Math.max(0.14, glow * 0.35));
  return glow - (glow - tailAlpha) * fadeRatio;
}

export function buildParticleSeeds(
  flows: FlowRecord[],
  locationsById: Map<string, {lon: number; lat: number; name?: string}>,
  particleBudget: number,
  equalWorldSpeed: boolean
): ParticleSeed[] {
  const globalBudget = Math.round(particleBudget);
  const plans: FlowParticlePlan[] = [];
  for (const flow of flows) {
    const source = locationsById.get(flow.origin);
    const target = locationsById.get(flow.dest);
    if (!source || !target) continue;
    const routeDistanceMeters = Math.max(
      1,
      angularDistanceRadians([source.lon, source.lat], [target.lon, target.lat]) * EARTH_RADIUS_METERS
    );
    plans.push({
      flow,
      source: [source.lon, source.lat],
      target: [target.lon, target.lat],
      routeDistanceMeters,
      weight: particleAllocationWeight(flow, routeDistanceMeters, equalWorldSpeed)
    });
  }

  const sortedPlans = plans.sort((left, right) => right.weight - left.weight);
  const totalWeight = sortedPlans.reduce((sum, plan) => sum + plan.weight, 0);
  const massTonnes = estimateParticleMassFromWeight(totalWeight, globalBudget) ?? 0;

  const particles: ParticleSeed[] = [];
  for (const plan of sortedPlans) {
    if (particles.length >= globalBudget) break;
    const count = Math.min(
      Math.max(1, Math.round((plan.weight / Math.max(1, totalWeight)) * globalBudget)),
      globalBudget - particles.length
    );
    for (let index = 0; index < count; index += 1) {
      const seed = `${plan.flow.id}:${index}`;
      particles.push({
        id: `${plan.flow.id}-${index}`,
        flow: plan.flow,
        source: plan.source,
        target: plan.target,
        phase: random01(`${seed}:phase`),
        speed: random01(`${seed}:speed`),
        lateral: (random01(`${seed}:lat`) - 0.5) * 2,
        wobble: random01(`${seed}:wobble`) * Math.PI * 2,
        radius: 1.15 + random01(`${seed}:radius`) * 1.25,
        massTonnes,
        routeDistanceMeters: plan.routeDistanceMeters
      });
    }
  }
  return particles;
}

export function particlePosition(
  particle: ParticleSeed,
  renderTime: number,
  config: RenderConfig,
  arcTrajectory: boolean,
  globeMode = false,
  offset = 0
): Position3D {
  const routeSpeedScale = config.equalWorldSpeed
    ? SPEED_REFERENCE_ROUTE_METERS / Math.max(500_000, particle.routeDistanceMeters)
    : 1;
  const particleSpeed = 1 + (particle.speed - 0.5) * 1.28 * config.speedVariation;
  const rawT = ((particle.phase + renderTime * 0.035 * particleSpeed * config.speed * routeSpeedScale + offset) % 1 + 1) % 1;
  const t = globeMode ? rawT : smoothstep(rawT);

  if (globeMode) {
    const sourceVector = lonLatToGlobeUnit(particle.source);
    const targetVector = lonLatToGlobeUnit(particle.target);
    const baseVector = slerpUnitVector(sourceVector, targetVector, t);
    const normal = globeRouteNormal(particle.source, particle.target);
    const [sourceLon, sourceLat] = particle.source;
    const [targetLon, targetLat] = particle.target;
    const deltaLon = shortestLongitudeDelta(sourceLon, targetLon);
    const deltaLat = targetLat - sourceLat;
    const distance = Math.max(1, Math.hypot(deltaLon, deltaLat));
    const plumeStrength = Math.sin(Math.PI * t);
    const plumeWidth = plumeDistanceWidth(distance, config.distanceWidthDamping) * plumeStrength;
    const heightSpreadScale = 1 / (1 + plumeStrength * arcHeightScale(particle.flow, config) * config.altitudeWidthDamping);
    const stableSpread = particle.lateral * config.plumeWidth;
    const flutter = Math.sin(particle.wobble + renderTime * 0.55 * config.speed + t * Math.PI * 5) * 0.22 * config.jitter;
    const lateralAngle = degreesToRadians(plumeWidth * (stableSpread + flutter) * heightSpreadScale);
    const spreadVector = normalizeVector(
      addVectors(scaleVector(baseVector, Math.cos(lateralAngle)), scaleVector(normal, Math.sin(lateralAngle)))
    );
    const reference = globeRoutePoint(particle.source, particle.target, t);
    const [lon, lat] = globeUnitToLonLat(spreadVector);
    return [
      unwrapLongitudeNear(lon, reference[0]),
      lat,
      GLOBE_SURFACE_OFFSET_METERS * 1.35 + arcAltitudeMeters(particle.source, particle.target, t, arcHeightScale(particle.flow, config))
    ];
  }

  const routeBase = routeBasePoint(particle.source, particle.target, t, arcTrajectory, config, globeMode);
  const base = arcTrajectory && !globeMode
    ? tiltedRoutePoint(particle.source, particle.target, routeBase, t, config, particle.flow.id)
    : routeBase;
  const [sourceLon, sourceLat] = particle.source;
  const [targetLon, targetLat] = particle.target;
  const deltaLon = shortestLongitudeDelta(sourceLon, targetLon);
  const deltaLat = targetLat - sourceLat;
  const distance = Math.max(1, Math.hypot(deltaLon, deltaLat));
  const plumeStrength = Math.sin(Math.PI * t);
  const plumeWidth = plumeDistanceWidth(distance, config.distanceWidthDamping) * plumeStrength;
  const perpLon = -deltaLat / distance;
  const perpLat = deltaLon / distance;
  const heightSpreadScale = arcTrajectory
    ? 1 / (1 + plumeStrength * arcHeightScale(particle.flow, config) * config.altitudeWidthDamping)
    : 1;
  const stableSpread = particle.lateral * config.plumeWidth;
  const flutter = Math.sin(particle.wobble + renderTime * 0.55 * config.speed + t * Math.PI * 5) * 0.22 * config.jitter;
  const lateralOffset = (stableSpread + flutter) * heightSpreadScale;
  const altitude =
    (globeMode ? GLOBE_SURFACE_OFFSET_METERS * 1.35 : 0) +
    (arcTrajectory || globeMode ? arcAltitudeMeters(particle.source, particle.target, t, arcHeightScale(particle.flow, config)) : 0);
  return [
    normalizeLongitude(base[0] + perpLon * plumeWidth * lateralOffset),
    base[1] + perpLat * plumeWidth * lateralOffset,
    altitude
  ];
}

export function buildParticleFrame(
  particles: ParticleSeed[],
  renderTime: number,
  mode: RenderMode,
  config: RenderConfig,
  trailSpacingByFlow: Map<string, number>,
  globeMode = false
): ParticlePoint[] {
  const hasTrails = mode === 'particle-trails' || mode === 'particle-arc-trails';
  const arcTrajectory = globeMode || mode === 'particle-arc-plume' || mode === 'particle-arc-trails';
  const copies = hasTrails ? Math.max(1, Math.round(config.trailCopies)) : 1;
  return Array.from({length: copies}).flatMap((_, trailIndex) =>
    particles.map((particle) => {
      const offset = -trailIndex * (trailSpacingByFlow.get(particle.flow.id) ?? 0);
      return {
        id: `${particle.id}-${trailIndex}`,
        flow: particle.flow,
        position: particlePosition(particle, renderTime, config, arcTrajectory, globeMode, offset),
        radius: Math.max(0.55, (particle.radius - trailIndex * 0.18) * config.particleSize),
        color: withAlpha(particle.flow.color, trailAlpha(trailIndex, copies, config.particleGlow))
      };
    })
  );
}

export function particleAllocationWeight(flow: FlowRecord, routeDistanceMeters: number, equalWorldSpeed: boolean): number {
  const durationScale = equalWorldSpeed ? routeDistanceMeters / SPEED_REFERENCE_ROUTE_METERS : 1;
  return flow.count * durationScale;
}

export function estimateParticleMassFromWeight(totalWeight: number, particleBudget: number): number | null {
  if (!totalWeight || particleBudget <= 0) return null;
  return totalWeight / particleBudget;
}

export function estimateUniformParticleMass(
  flows: FlowRecord[],
  locationsById: Map<string, {lon: number; lat: number; name?: string}>,
  particleBudget: number,
  equalWorldSpeed: boolean
): number | null {
  const totalWeight = flows.reduce((sum, flow) => {
    const source = locationsById.get(flow.origin);
    const target = locationsById.get(flow.dest);
    if (!source || !target) return sum;
    const routeDistanceMeters = Math.max(
      1,
      angularDistanceRadians([source.lon, source.lat], [target.lon, target.lat]) * EARTH_RADIUS_METERS
    );
    return sum + particleAllocationWeight(flow, routeDistanceMeters, equalWorldSpeed);
  }, 0);

  return estimateParticleMassFromWeight(totalWeight, Math.round(particleBudget));
}
