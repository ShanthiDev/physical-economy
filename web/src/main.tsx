import React, {Component, type ReactNode, useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import type {CommodityOption, FlowRecord, FlowmapPayload} from './types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = {longitude: 18, latitude: 22, zoom: 1.22, pitch: 0, bearing: 0};
const ROUTE_WIDTH_METERS = 65_000;
const TRAIL_SPACING_PIXEL_SCALE = 10;
const UNIFORM_PLUME_WIDTH_DEGREES = 0.9;
const rootElement = document.getElementById('root');
type HoverCard = {text: string; x: number; y: number} | null;
type RenderMode =
  | 'flowmap-straight'
  | 'flowmap-curved'
  | 'static-arcs'
  | 'particle-plume'
  | 'particle-trails'
  | 'particle-arc-plume'
  | 'particle-arc-trails';
type Point = [number, number];
type Position3D = [number, number, number];
type RenderConfig = {
  particleBudget: number;
  speed: number;
  plumeWidth: number;
  distanceWidthDamping: number;
  altitudeWidthDamping: number;
  jitter: number;
  particleSize: number;
  particleGlow: number;
  trailCopies: number;
  trailSpacing: number;
  routeOpacity: number;
  routeWidth: number;
  arcCurve: number;
  arcHeight: number;
  arcTilt: number;
  flowmapCurviness: number;
  arcParticleBend: number;
  showRoutes: number;
  showEndpoints: number;
  endpointSize: number;
  endpointOpacity: number;
};
type ParticleSeed = {
  id: string;
  flow: FlowRecord;
  source: Point;
  target: Point;
  phase: number;
  speed: number;
  lateral: number;
  wobble: number;
  radius: number;
  massTonnes: number;
};
type ParticlePoint = {
  id: string;
  flow: FlowRecord;
  position: Position3D;
  radius: number;
  color: [number, number, number, number];
};
type EndpointPoint = {
  id: string;
  name: string;
  position: Point;
  tonnes: number;
};
type RoutePath = {
  id: string;
  flow: FlowRecord;
  path: Position3D[];
};

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  particleBudget: 70000,
  speed: 1,
  plumeWidth: 1,
  distanceWidthDamping: 0.45,
  altitudeWidthDamping: 1,
  jitter: 0.3,
  particleSize: 1,
  particleGlow: 0.72,
  trailCopies: 3,
  trailSpacing: 0.2,
  routeOpacity: 0.4,
  routeWidth: 3,
  arcCurve: 1,
  arcHeight: 1,
  arcTilt: 1,
  flowmapCurviness: 1,
  arcParticleBend: 0,
  showRoutes: 1,
  showEndpoints: 1,
  endpointSize: 2,
  endpointOpacity: 0.62
};

function isParticleRenderMode(mode: RenderMode): boolean {
  return mode === 'particle-plume' || mode === 'particle-trails' || mode === 'particle-arc-plume' || mode === 'particle-arc-trails';
}

if (rootElement) {
  rootElement.dataset.reactMounted = 'true';
}

function formatTonnes(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} bn t`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} m t`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k t`;
  return `${Math.round(value)} t`;
}

function colorToCss(color: [number, number, number, number], alphaScale = 1): string {
  const [red, green, blue, alpha] = color;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, (alpha / 255) * alphaScale)})`;
}

function colorSchemeFor(color: [number, number, number, number]): string[] {
  const [red, green, blue] = color;
  // flowmap.gl reverses custom schemes in darkMode, so pass the intended order inverted.
  return [
    `rgba(${Math.min(255, Math.round(red * 1.12))}, ${Math.min(255, Math.round(green * 1.12))}, ${Math.min(255, Math.round(blue * 1.12))}, 0.96)`,
    `rgba(${red}, ${green}, ${blue}, 0.72)`,
    `rgba(${Math.round(red * 0.48)}, ${Math.round(green * 0.48)}, ${Math.round(blue * 0.48)}, 0.28)`
  ];
}

function legendLineWidth(ratio: number): number {
  return 1.4 + (11 - 1.4) * Math.sqrt(ratio);
}

function withAlpha(color: [number, number, number, number], alpha: number): [number, number, number, number] {
  return [color[0], color[1], color[2], Math.round(255 * Math.max(0, Math.min(1, alpha)))];
}

function trailAlpha(trailIndex: number, copies: number, glow: number): number {
  if (copies <= 1) return glow;
  const fadeRatio = trailIndex / (copies - 1);
  const tailAlpha = Math.min(glow, Math.max(0.14, glow * 0.35));
  return glow - (glow - tailAlpha) * fadeRatio;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed: string): number {
  return hashString(seed) / 4294967295;
}

function normalizeLongitude(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

function shortestLongitudeDelta(sourceLon: number, targetLon: number): number {
  let delta = targetLon - sourceLon;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function mercatorPixel(point: Point, zoom: number): Point {
  const scale = 512 * 2 ** zoom;
  const latitude = Math.max(-85.051129, Math.min(85.051129, point[1]));
  const sinLat = Math.sin(degreesToRadians(latitude));
  return [
    ((point[0] + 180) / 360) * scale,
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  ];
}

function particleBudgetToPerFlow(particleBudget: number): number {
  return Math.max(12, Math.round(Math.sqrt(particleBudget) * 2.7));
}

function interpolateLinear(source: Point, target: Point, t: number): Point {
  const [sourceLon, sourceLat] = source;
  const [targetLon, targetLat] = target;
  return [
    normalizeLongitude(sourceLon + shortestLongitudeDelta(sourceLon, targetLon) * t),
    sourceLat + (targetLat - sourceLat) * t
  ];
}

function interpolateGreatCircle(source: Point, target: Point, t: number): Point {
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

function blendRoutePoints(linear: Point, curved: Point, curveStrength: number): Point {
  const strength = Math.max(0, Math.min(1, curveStrength));
  return [
    normalizeLongitude(linear[0] + shortestLongitudeDelta(linear[0], curved[0]) * strength),
    linear[1] + (curved[1] - linear[1]) * strength
  ];
}

function angularDistanceRadians(source: Point, target: Point): number {
  const sourceLon = degreesToRadians(source[0]);
  const sourceLat = degreesToRadians(source[1]);
  const targetLon = degreesToRadians(target[0]);
  const targetLat = degreesToRadians(target[1]);
  const sinHalfLat = Math.sin((sourceLat - targetLat) / 2);
  const sinHalfLon = Math.sin((sourceLon - targetLon) / 2);
  const a = sinHalfLat * sinHalfLat + Math.cos(sourceLat) * Math.cos(targetLat) * sinHalfLon * sinHalfLon;
  return 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

function arcAltitudeMeters(source: Point, target: Point, t: number, arcHeight: number): number {
  const earthRadiusMeters = 6_371_000;
  const distance = angularDistanceRadians(source, target) * earthRadiusMeters;
  return Math.sqrt(Math.max(0, t * (1 - t))) * distance * arcHeight;
}

function arcHeightScale(flow: FlowRecord, config: RenderConfig): number {
  return (0.45 + Math.min(0.8, flow.lineWidth / 16)) * config.arcHeight;
}

function plumeDistanceWidth(distance: number, damping: number): number {
  const distanceWidth = Math.min(9.5, Math.max(0.18, distance * 0.025));
  const dampedWidth = distanceWidth * (1 - damping) + UNIFORM_PLUME_WIDTH_DEGREES * damping;
  return Math.max(0.05, dampedWidth);
}

function bendPointAlongRoute(source: Point, target: Point, base: Point, t: number, bendScale: number): Point {
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

function routeBasePoint(source: Point, target: Point, t: number, arcTrajectory: boolean, config: RenderConfig): Point {
  if (!arcTrajectory) return interpolateLinear(source, target, t);
  const linearBase = interpolateLinear(source, target, t);
  const greatCircleBase = interpolateGreatCircle(source, target, t);
  const blendedBase = blendRoutePoints(linearBase, greatCircleBase, config.arcCurve);
  return config.showRoutes
    ? blendedBase
    : bendPointAlongRoute(source, target, blendedBase, t, config.arcParticleBend);
}

function routeScreenLengthPixels(source: Point, target: Point, zoom: number, arcTrajectory: boolean, config: RenderConfig): number {
  const samples = 14;
  const worldSize = 512 * 2 ** zoom;
  let length = 0;
  let previous = mercatorPixel(routeBasePoint(source, target, 0, arcTrajectory, config), zoom);
  for (let index = 1; index <= samples; index += 1) {
    const t = smoothstep(index / samples);
    const current = mercatorPixel(routeBasePoint(source, target, t, arcTrajectory, config), zoom);
    let deltaX = current[0] - previous[0];
    if (deltaX > worldSize / 2) deltaX -= worldSize;
    if (deltaX < -worldSize / 2) deltaX += worldSize;
    length += Math.hypot(deltaX, current[1] - previous[1]);
    previous = current;
  }
  return Math.max(1, length);
}

function splitPathAtAntimeridian(flow: FlowRecord, path: Position3D[]): RoutePath[] {
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

function buildRoutePaths(flow: FlowRecord, source: Point, target: Point, config: RenderConfig): RoutePath[] {
  const segments = 64;
  const path = Array.from({length: segments + 1}, (_, index) => {
    const t = smoothstep(index / segments);
    const base = routeBasePoint(source, target, t, true, config);
    return [
      base[0],
      base[1],
      arcAltitudeMeters(source, target, t, arcHeightScale(flow, config))
    ] as Position3D;
  });
  return splitPathAtAntimeridian(flow, path);
}

function resolvePickingText(info: any, flows: FlowRecord[]): string | null {
  const object = info?.object;
  if (!object) return null;

  const originalFlow = object.flow as FlowRecord | undefined;
  if (originalFlow?.tooltip?.includes('tonnes net')) return originalFlow.tooltip;
  if (object.tooltip?.includes('tonnes net')) return object.tooltip;
  if (object.flow?.tooltip?.includes('tonnes net')) return object.flow.tooltip;

  const originId = object.origin?.id ?? object.flow?.origin ?? object.source?.id;
  const destId = object.dest?.id ?? object.flow?.dest ?? object.target?.id;
  const matchingFlow = flows.find((flow) => flow.origin === originId && flow.dest === destId);
  if (matchingFlow) return matchingFlow.tooltip;

  if (object.type === 'location') {
    return `${object.name ?? object.location?.name ?? object.id}`;
  }

  if (originId && destId) {
    return `${object.origin?.name ?? originId} -> ${object.dest?.name ?? destId}`;
  }

  return null;
}

function estimateParticleCount(flow: FlowRecord, commodityMax: number, particleBudget: number): number {
  const perFlowBudget = particleBudgetToPerFlow(particleBudget);
  const ratio = commodityMax > 0 ? Math.sqrt(flow.count / commodityMax) : 0;
  return Math.max(1, Math.min(perFlowBudget, Math.round(4 + ratio * perFlowBudget)));
}

function buildParticleSeeds(
  flows: FlowRecord[],
  locationsById: Map<string, {lon: number; lat: number; name?: string}>,
  particleBudget: number
): ParticleSeed[] {
  const globalBudget = Math.round(particleBudget);
  const maxByCommodity = new Map<string, number>();
  for (const flow of flows) {
    maxByCommodity.set(flow.commodityId, Math.max(maxByCommodity.get(flow.commodityId) ?? 0, flow.count));
  }

  const particles: ParticleSeed[] = [];
  const sortedFlows = [...flows].sort((left, right) => right.count - left.count);
  for (const flow of sortedFlows) {
    if (particles.length >= globalBudget) break;
    const source = locationsById.get(flow.origin);
    const target = locationsById.get(flow.dest);
    if (!source || !target) continue;

    const count = Math.min(
      estimateParticleCount(flow, maxByCommodity.get(flow.commodityId) ?? flow.count, particleBudget),
      globalBudget - particles.length
    );
    const massTonnes = flow.count / count;
    for (let index = 0; index < count; index += 1) {
      const seed = `${flow.id}:${index}`;
      particles.push({
        id: `${flow.id}-${index}`,
        flow,
        source: [source.lon, source.lat],
        target: [target.lon, target.lat],
        phase: random01(`${seed}:phase`),
        speed: 0.72 + random01(`${seed}:speed`) * 0.64,
        lateral: (random01(`${seed}:lat`) - 0.5) * 2,
        wobble: random01(`${seed}:wobble`) * Math.PI * 2,
        radius: 1.15 + random01(`${seed}:radius`) * 1.25,
        massTonnes
      });
    }
  }
  return particles;
}

function particlePosition(particle: ParticleSeed, renderTime: number, config: RenderConfig, arcTrajectory: boolean, offset = 0): Position3D {
  const rawT = ((particle.phase + renderTime * 0.035 * particle.speed * config.speed + offset) % 1 + 1) % 1;
  const t = smoothstep(rawT);
  const base = routeBasePoint(particle.source, particle.target, t, arcTrajectory, config);
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
  const altitude = arcTrajectory ? arcAltitudeMeters(particle.source, particle.target, t, arcHeightScale(particle.flow, config)) : 0;
  return [
    normalizeLongitude(base[0] + perpLon * plumeWidth * lateralOffset),
    base[1] + perpLat * plumeWidth * lateralOffset,
    altitude
  ];
}

function buildParticleFrame(
  particles: ParticleSeed[],
  renderTime: number,
  mode: RenderMode,
  config: RenderConfig,
  trailSpacingByFlow: Map<string, number>
): ParticlePoint[] {
  const hasTrails = mode === 'particle-trails' || mode === 'particle-arc-trails';
  const arcTrajectory = mode === 'particle-arc-plume' || mode === 'particle-arc-trails';
  const copies = hasTrails ? Math.max(1, Math.round(config.trailCopies)) : 1;
  return Array.from({length: copies}).flatMap((_, trailIndex) =>
    particles.map((particle) => {
      const offset = -trailIndex * (trailSpacingByFlow.get(particle.flow.id) ?? 0);
      return {
        id: `${particle.id}-${trailIndex}`,
        flow: particle.flow,
        position: particlePosition(particle, renderTime, config, arcTrajectory, offset),
        radius: Math.max(0.55, (particle.radius - trailIndex * 0.18) * config.particleSize),
        color: withAlpha(particle.flow.color, trailAlpha(trailIndex, copies, config.particleGlow))
      };
    })
  );
}

function estimateParticleMass(flows: FlowRecord[], particleBudget: number, selectedCommodity: CommodityOption | null): number | null {
  const relevantFlows = selectedCommodity ? flows.filter((flow) => flow.commodityId === selectedCommodity.id) : flows;
  const maxFlow = relevantFlows.reduce<FlowRecord | null>(
    (current, flow) => (!current || flow.count > current.count ? flow : current),
    null
  );
  if (!maxFlow) return null;
  const commodityMax = selectedCommodity?.maxQuantity ?? maxFlow.commodityMax ?? maxFlow.count;
  return maxFlow.count / estimateParticleCount(maxFlow, commodityMax, particleBudget);
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix = 'x',
  displayValue,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control" htmlFor={id}>
      <span>
        {label}
        <strong>
          {displayValue ?? `${value.toFixed(step < 1 ? 2 : 0)}${suffix}`}
        </strong>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

class AppErrorBoundary extends Component<{children: ReactNode}, {message: string | null}> {
  state = {message: null};

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : 'Unknown browser runtime error'
    };
  }

  componentDidCatch(error: unknown) {
    console.error('Atlas runtime error', error);
  }

  render() {
    if (this.state.message) {
      return (
        <main className="shell">
          <section className="panel error-panel">
            <p className="eyebrow">Runtime guard</p>
            <h1>The atlas tripped</h1>
            <p>
              The data loaded, but the browser runtime hit an error. Open DevTools for the
              stack trace; the first captured message is:
            </p>
            <pre>{this.state.message}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function MapStage({
  payload,
  flows,
  commodities,
  renderMode,
  renderConfig,
  onHoverInfo
}: {
  payload: FlowmapPayload;
  flows: FlowRecord[];
  commodities: CommodityOption[];
  renderMode: RenderMode;
  renderConfig: RenderConfig;
  onHoverInfo: (value: HoverCard) => void;
}) {
  const [mapModules, setMapModules] = useState<{
    DeckGL: any;
    Map: any;
    FlowmapLayer: any;
    PathLayer: any;
    ScatterplotLayer: any;
  } | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState(0);
  const [viewZoom, setViewZoom] = useState(INITIAL_VIEW_STATE.zoom);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      import('@deck.gl/react'),
      import('react-map-gl/maplibre'),
      import('@flowmap.gl/layers'),
      import('@deck.gl/layers')
    ])
      .then(([deck, maplibre, flowmap, deckLayers]) => {
        if (cancelled) return;
        setMapModules({
          DeckGL: deck.DeckGL,
          Map: maplibre.Map,
          FlowmapLayer: flowmap.FlowmapLayer,
          PathLayer: deckLayers.PathLayer,
          ScatterplotLayer: deckLayers.ScatterplotLayer
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setModuleError(error instanceof Error ? error.message : 'Could not load map modules');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isParticleRenderMode(renderMode)) return undefined;
    let animationFrame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      setRenderTime((now - startedAt) / 1000);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [renderMode]);

  const locationsById = useMemo(
    () => new globalThis.Map(payload.locations.map((location) => [location.id, {lon: location.lon, lat: location.lat, name: location.name}])),
    [payload.locations]
  );

  const particleSeeds = useMemo(
    () => buildParticleSeeds(flows, locationsById, renderConfig.particleBudget),
    [flows, locationsById, renderConfig.particleBudget]
  );

  const routePaths = useMemo(
    () =>
      flows.flatMap((flow) => {
        const source = locationsById.get(flow.origin);
        const target = locationsById.get(flow.dest);
        return source && target
          ? buildRoutePaths(flow, [source.lon, source.lat], [target.lon, target.lat], renderConfig)
          : [];
      }),
    [flows, locationsById, renderConfig]
  );

  const trailSpacingByFlow = useMemo(() => {
    const hasTrails = renderMode === 'particle-trails' || renderMode === 'particle-arc-trails';
    if (!hasTrails) return new globalThis.Map<string, number>();

    const arcTrajectory = renderMode === 'particle-arc-trails';
    const spacingPixels = renderConfig.trailSpacing * TRAIL_SPACING_PIXEL_SCALE;
    const offsets = new globalThis.Map<string, number>();
    for (const flow of flows) {
      const source = locationsById.get(flow.origin);
      const target = locationsById.get(flow.dest);
      if (!source || !target) continue;
      const routeLength = routeScreenLengthPixels(
        [source.lon, source.lat],
        [target.lon, target.lat],
        viewZoom,
        arcTrajectory,
        renderConfig
      );
      offsets.set(flow.id, Math.min(0.25, spacingPixels / routeLength));
    }
    return offsets;
  }, [flows, locationsById, renderMode, renderConfig, viewZoom]);

  const particleFrame = useMemo(
    () => buildParticleFrame(particleSeeds, renderTime, renderMode, renderConfig, trailSpacingByFlow),
    [particleSeeds, renderTime, renderMode, renderConfig, trailSpacingByFlow]
  );
  const endpointPoints = useMemo(() => {
    const endpoints = new globalThis.Map<string, EndpointPoint>();
    for (const flow of flows) {
      for (const locationId of [flow.origin, flow.dest]) {
        const location = locationsById.get(locationId);
        if (!location) continue;
        const current = endpoints.get(locationId);
        endpoints.set(locationId, {
          id: locationId,
          name: location.name,
          position: [location.lon, location.lat],
          tonnes: (current?.tonnes ?? 0) + flow.count
        });
      }
    }
    return [...endpoints.values()];
  }, [flows, locationsById]);
  const maxEndpointTonnes = endpointPoints.reduce((max, endpoint) => Math.max(max, endpoint.tonnes), 0);

  if (moduleError) {
    return (
      <section className="map-diagnostic-card">
        <p className="eyebrow">Map module error</p>
        <strong>flowmap.gl could not start in this browser session.</strong>
        <pre>{moduleError}</pre>
      </section>
    );
  }

  if (!mapModules) {
    return (
      <section className="map-diagnostic-card">
        <p className="eyebrow">Map loader</p>
        <strong>Loading deck.gl, maplibre and flowmap.gl...</strong>
      </section>
    );
  }

  const {DeckGL, Map, FlowmapLayer, PathLayer, ScatterplotLayer} = mapModules;
  const flowsByCommodity = new globalThis.Map<string, FlowRecord[]>();
  for (const flow of flows) {
    flowsByCommodity.set(flow.commodityId, [...(flowsByCommodity.get(flow.commodityId) ?? []), flow]);
  }

  const flowmapLayers = () =>
    commodities.map((commodity, index) => {
      const commodityFlows = flowsByCommodity.get(commodity.id) ?? [];
      if (!commodityFlows.length) return null;
      return new FlowmapLayer({
        id: `commodity-flowmap-${commodity.id}`,
        data: {
          locations: payload.locations,
          flows: commodityFlows
        },
        pickable: true,
        darkMode: true,
        locationsEnabled: index === 0,
        locationLabelsEnabled: false,
        clusteringEnabled: false,
        fadeEnabled: true,
        flowLinesRenderingMode: renderMode === 'flowmap-curved' ? 'curved' : 'animated-straight',
        flowLineCurviness: renderConfig.flowmapCurviness,
        colorScheme: colorSchemeFor(commodity.color),
        highlightColor: colorToCss(commodity.color),
        flowLineThicknessScale: 1.1,
        getLocationId: (location: any) => location.id,
        getLocationName: (location: any) => location.name,
        getLocationLat: (location: any) => location.lat,
        getLocationLon: (location: any) => location.lon,
        getFlowOriginId: (flow: any) => flow.origin,
        getFlowDestId: (flow: any) => flow.dest,
        getFlowMagnitude: (flow: any) => flow.visualMagnitude,
        onHover: (info: any) => {
          const text = resolvePickingText(info, commodityFlows);
          onHoverInfo(text ? {text, x: info.x ?? 0, y: info.y ?? 0} : null);
        }
      });
    });

  const routeLayer = new PathLayer({
    id: 'commodity-route-paths',
    data: routePaths,
    pickable: true,
    getPath: (route: RoutePath) => route.path,
    getColor: (route: RoutePath) =>
      withAlpha(route.flow.color, (renderMode === 'static-arcs' ? 0.78 : 0.24) * renderConfig.routeOpacity * renderConfig.showRoutes),
    getWidth: (route: RoutePath) =>
      route.flow.lineWidth * (renderMode === 'static-arcs' ? 0.7 : 0.22) * renderConfig.routeWidth * ROUTE_WIDTH_METERS,
    widthUnits: 'meters',
    widthMinPixels: 0,
    widthMaxPixels: Number.MAX_SAFE_INTEGER,
    capRounded: true,
    jointRounded: true,
    billboard: true,
    parameters: {depthTest: false},
    onHover: (info: any) => {
      const route = info.object as RoutePath | undefined;
      onHoverInfo(route ? {text: route.flow.tooltip, x: info.x ?? 0, y: info.y ?? 0} : null);
    }
  });

  const particleLayer = new ScatterplotLayer({
    id: `commodity-particles-${renderMode}-${Math.round(renderConfig.particleBudget)}`,
    data: particleFrame,
    pickable: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 0.6,
    radiusMaxPixels: 8,
    stroked: false,
    filled: true,
    antialiasing: true,
    getPosition: (particle: ParticlePoint) => particle.position,
    getRadius: (particle: ParticlePoint) => particle.radius,
    getFillColor: (particle: ParticlePoint) => particle.color,
    parameters: {depthTest: false},
    updateTriggers: {
      getPosition: renderTime,
      getFillColor: renderTime
    },
    onHover: (info: any) => {
      const particle = info.object as ParticlePoint | undefined;
      onHoverInfo(particle ? {text: particle.flow.tooltip, x: info.x ?? 0, y: info.y ?? 0} : null);
    }
  });

  const endpointLayer = new ScatterplotLayer({
    id: 'commodity-flow-endpoints',
    data: endpointPoints,
    pickable: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 2.4 * renderConfig.endpointSize,
    radiusMaxPixels: 9 * renderConfig.endpointSize,
    stroked: true,
    filled: true,
    getPosition: (endpoint: EndpointPoint) => endpoint.position,
    getRadius: (endpoint: EndpointPoint) =>
      (2.4 + 6 * Math.sqrt(maxEndpointTonnes ? endpoint.tonnes / maxEndpointTonnes : 0)) * renderConfig.endpointSize,
    getFillColor: [246, 237, 216, Math.min(255, Math.round(118 * renderConfig.endpointOpacity))],
    getLineColor: [231, 184, 78, Math.min(255, Math.round(190 * renderConfig.endpointOpacity))],
    getLineWidth: 1.2,
    lineWidthUnits: 'pixels',
    parameters: {depthTest: false},
    onHover: (info: any) => {
      const endpoint = info.object as EndpointPoint | undefined;
      onHoverInfo(
        endpoint
          ? {text: `${endpoint.name} | visible endpoint volume ${formatTonnes(endpoint.tonnes)}`, x: info.x ?? 0, y: info.y ?? 0}
          : null
      );
    }
  });

  const layers =
    renderMode === 'static-arcs'
      ? [routeLayer, renderConfig.showEndpoints ? endpointLayer : null].filter(Boolean)
      : isParticleRenderMode(renderMode)
        ? [renderConfig.showRoutes ? routeLayer : null, particleLayer, renderConfig.showEndpoints ? endpointLayer : null].filter(Boolean)
        : flowmapLayers().filter(Boolean);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers}
      onViewStateChange={({viewState}: any) => setViewZoom(viewState.zoom)}
    >
      <Map reuseMaps mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}

function App() {
  const [payload, setPayload] = useState<FlowmapPayload | null>(null);
  const [activeCommodity, setActiveCommodity] = useState<string>('all');
  const [renderMode, setRenderMode] = useState<RenderMode>('flowmap-straight');
  const [renderConfig, setRenderConfig] = useState<RenderConfig>(DEFAULT_RENDER_CONFIG);
  const [hoverInfo, setHoverInfo] = useState<HoverCard>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/render/flowmap.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load render data: ${response.status}`);
        }
        return response.json();
      })
      .then((data: FlowmapPayload) => {
        setPayload(data);
      })
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : 'Unknown render-data error');
      });
  }, []);

  if (!payload) {
    return (
      <main className="shell">
        <section className="panel">
          <p className="eyebrow">Global Commodity Trade Atlas</p>
          <h1>Warming up the flow engine</h1>
          <p>{statusMessage ?? 'Loading neutral render data...'}</p>
        </section>
      </main>
    );
  }

  const visibleCommodities =
    activeCommodity === 'all'
      ? payload.commodities
      : payload.commodities.filter((commodity) => commodity.id === activeCommodity);
  const filteredFlows =
    activeCommodity === 'all'
      ? payload.flows
      : payload.flows.filter((flow) => flow.commodityId === activeCommodity);

  const totalTonnes = filteredFlows.reduce((sum, flow) => sum + flow.count, 0);
  const maxFlow = filteredFlows.reduce<FlowRecord | null>(
    (current, flow) => (!current || flow.count > current.count ? flow : current),
    null
  );
  const selectedCommodity =
    activeCommodity === 'all'
      ? null
      : payload.commodities.find((commodity) => commodity.id === activeCommodity) ?? null;
  const legendSamples = [1, 0.25, 0.05].map((ratio) => ({
    ratio,
    width: legendLineWidth(ratio),
    label: selectedCommodity ? formatTonnes(selectedCommodity.maxQuantity * ratio) : ''
  }));
  const particleMass = estimateParticleMass(filteredFlows, renderConfig.particleBudget, selectedCommodity);
  const isParticleMode = isParticleRenderMode(renderMode);
  const particleMasses = isParticleMode
    ? visibleCommodities
        .map((commodity) => estimateParticleMass(filteredFlows, renderConfig.particleBudget, commodity))
        .filter((mass): mass is number => mass !== null && Number.isFinite(mass))
    : [];
  const particleBudgetLabel = Math.round(renderConfig.particleBudget).toLocaleString('en-US');
  const particleUnitText = !isParticleMode
    ? null
    : selectedCommodity && particleMass
      ? `One dot on the largest visible ${selectedCommodity.name} flow represents about ${formatTonnes(particleMass)}; budget ${particleBudgetLabel} dots.`
      : particleMasses.length
        ? `One dot on the largest visible flow per commodity represents about ${formatTonnes(Math.min(...particleMasses))} to ${formatTonnes(Math.max(...particleMasses))}; budget ${particleBudgetLabel} dots.`
        : null;
  const updateRenderConfig = (key: keyof RenderConfig, value: number) => {
    setRenderConfig((current) => ({...current, [key]: value}));
  };

  return (
    <main className="atlas">
      <MapStage
        payload={payload}
        flows={filteredFlows}
        commodities={visibleCommodities}
        renderMode={renderMode}
        renderConfig={renderConfig}
        onHoverInfo={setHoverInfo}
      />

      <section className="control-card">
        <p className="eyebrow">Trade-only prototype · {payload.meta.targetYear}</p>
        <h1>{payload.meta.title}</h1>
        <p className="lede">
          BACI net trade flows, jetzt als umschaltbares Render-Labor: Flowmap, gebogene Arcs
          oder synthetische Partikel-Fahnen aus denselben neutralen `render_flows`.
        </p>

        <div className="control-stack">
          <label className="select-label" htmlFor="commodity">
            Commodity
          </label>
          <select
            id="commodity"
            value={activeCommodity}
            onChange={(event) => setActiveCommodity(event.target.value)}
          >
            <option value="all">All mapped commodities</option>
            {payload.commodities.map((commodity: CommodityOption) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name}
              </option>
            ))}
          </select>

          <label className="select-label" htmlFor="render-mode">
            Render mode
          </label>
          <select
            id="render-mode"
            value={renderMode}
            onChange={(event) => setRenderMode(event.target.value as RenderMode)}
          >
            <option value="flowmap-straight">Flowmap · animated straight</option>
            <option value="flowmap-curved">Flowmap · small curves</option>
            <option value="static-arcs">deck.gl · static arcs</option>
            <option value="particle-plume">Particles · plume dots</option>
            <option value="particle-trails">Particles · smoky trails</option>
            <option value="particle-arc-plume">Particles · arc plume</option>
            <option value="particle-arc-trails">Particles · arc smoky trails</option>
          </select>

        </div>

        <details className="tuning-card" open={isParticleMode || renderMode === 'static-arcs' || renderMode === 'flowmap-curved'}>
          <summary>Render tuning</summary>
          <div className="range-grid">
            {isParticleMode ? (
              <>
                <RangeControl
                  id="particle-budget"
                  label="Particle density"
                  min={1000}
                  max={120000}
                  step={1000}
                  value={renderConfig.particleBudget}
                  suffix=" pts"
                  onChange={(value) => updateRenderConfig('particleBudget', value)}
                />
                <RangeControl
                  id="speed"
                  label="Speed"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={renderConfig.speed}
                  onChange={(value) => updateRenderConfig('speed', value)}
                />
                <RangeControl
                  id="plume-width"
                  label="Plume width"
                  min={0}
                  max={3}
                  step={0.05}
                  value={renderConfig.plumeWidth}
                  onChange={(value) => updateRenderConfig('plumeWidth', value)}
                />
                <RangeControl
                  id="distance-width-damping"
                  label="Distance width damping"
                  min={0}
                  max={1}
                  step={0.02}
                  value={renderConfig.distanceWidthDamping}
                  onChange={(value) => updateRenderConfig('distanceWidthDamping', value)}
                />
                <RangeControl
                  id="altitude-width-damping"
                  label="Altitude width damping"
                  min={0}
                  max={5}
                  step={0.05}
                  value={renderConfig.altitudeWidthDamping}
                  onChange={(value) => updateRenderConfig('altitudeWidthDamping', value)}
                />
                <RangeControl
                  id="jitter"
                  label="Jitter"
                  min={0}
                  max={2}
                  step={0.05}
                  value={renderConfig.jitter}
                  onChange={(value) => updateRenderConfig('jitter', value)}
                />
                <RangeControl
                  id="particle-size"
                  label="Particle size"
                  min={0.3}
                  max={1.5}
                  step={0.05}
                  value={renderConfig.particleSize}
                  onChange={(value) => updateRenderConfig('particleSize', value)}
                />
                <RangeControl
                  id="particle-glow"
                  label="Glow/opacity"
                  min={0.08}
                  max={1}
                  step={0.02}
                  value={renderConfig.particleGlow}
                  suffix=""
                  onChange={(value) => updateRenderConfig('particleGlow', value)}
                />
                <RangeControl
                  id="trail-copies"
                  label="Trail copies"
                  min={1}
                  max={8}
                  step={1}
                  value={renderConfig.trailCopies}
                  suffix=""
                  onChange={(value) => updateRenderConfig('trailCopies', value)}
                />
                <RangeControl
                  id="trail-spacing"
                  label="Trail spacing"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={renderConfig.trailSpacing}
                  displayValue={`${Math.round(renderConfig.trailSpacing * TRAIL_SPACING_PIXEL_SCALE)} px`}
                  onChange={(value) => updateRenderConfig('trailSpacing', value)}
                />
                <RangeControl
                  id="arc-particle-bend"
                  label="Hidden-route arc bend"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={renderConfig.arcParticleBend}
                  onChange={(value) => updateRenderConfig('arcParticleBend', value)}
                />
                <button
                  className="ghost-button inline-toggle"
                  type="button"
                  onClick={() => updateRenderConfig('showRoutes', renderConfig.showRoutes ? 0 : 1)}
                >
                  {renderConfig.showRoutes ? 'Hide arcs in particle mode' : 'Show arcs in particle mode'}
                </button>
              </>
            ) : null}

            {renderMode === 'static-arcs' || isParticleMode ? (
              <>
                <RangeControl
                  id="route-opacity"
                  label="Route opacity"
                  min={0}
                  max={2}
                  step={0.05}
                  value={renderConfig.routeOpacity}
                  onChange={(value) => updateRenderConfig('routeOpacity', value)}
                />
                <RangeControl
                  id="route-width"
                  label="Route width"
                  min={0}
                  max={10}
                  step={0.05}
                  value={renderConfig.routeWidth}
                  onChange={(value) => updateRenderConfig('routeWidth', value)}
                />
                <RangeControl
                  id="arc-curve"
                  label="Arc curve"
                  min={0}
                  max={1}
                  step={0.02}
                  value={renderConfig.arcCurve}
                  onChange={(value) => updateRenderConfig('arcCurve', value)}
                />
                <RangeControl
                  id="arc-height"
                  label="Arc height"
                  min={0}
                  max={3}
                  step={0.05}
                  value={renderConfig.arcHeight}
                  onChange={(value) => updateRenderConfig('arcHeight', value)}
                />
                <RangeControl
                  id="arc-tilt"
                  label="Arc tilt"
                  min={0}
                  max={3}
                  step={0.05}
                  value={renderConfig.arcTilt}
                  onChange={(value) => updateRenderConfig('arcTilt', value)}
                />
                <button
                  className="ghost-button inline-toggle"
                  type="button"
                  onClick={() => updateRenderConfig('showEndpoints', renderConfig.showEndpoints ? 0 : 1)}
                >
                  {renderConfig.showEndpoints ? 'Hide endpoint circles' : 'Show endpoint circles'}
                </button>
                <RangeControl
                  id="endpoint-size"
                  label="Endpoint size"
                  min={0}
                  max={10}
                  step={0.1}
                  value={renderConfig.endpointSize}
                  onChange={(value) => updateRenderConfig('endpointSize', value)}
                />
                <RangeControl
                  id="endpoint-opacity"
                  label="Endpoint brightness"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={renderConfig.endpointOpacity}
                  suffix=""
                  onChange={(value) => updateRenderConfig('endpointOpacity', value)}
                />
              </>
            ) : null}

            {renderMode === 'flowmap-curved' ? (
              <RangeControl
                id="flowmap-curviness"
                label="Flowmap curviness"
                min={0}
                max={3}
                step={0.05}
                value={renderConfig.flowmapCurviness}
                onChange={(value) => updateRenderConfig('flowmapCurviness', value)}
              />
            ) : null}
          </div>
          <button className="ghost-button" type="button" onClick={() => setRenderConfig(DEFAULT_RENDER_CONFIG)}>
            Reset render tuning
          </button>
        </details>

        <div className="stats-grid">
          <div>
            <span>{filteredFlows.length}</span>
            <small>net flows</small>
          </div>
          <div>
            <span>{formatTonnes(totalTonnes)}</span>
            <small>shown volume</small>
          </div>
          <div>
            <span>{payload.meta.renderFlows}</span>
            <small>rendered edges</small>
          </div>
        </div>

        <section className="legend-card" aria-label="Commodity legend">
          <div className="legend-header">
            <span>Legende</span>
            <small>{activeCommodity === 'all' ? 'max. sichtbarer Strom je Commodity' : 'Linienstärke dieser Commodity'}</small>
          </div>

          {particleUnitText ? <p className="particle-note particle-unit">{particleUnitText}</p> : null}

          {selectedCommodity ? (
            <div className="thickness-legend">
              {legendSamples.map((sample) => (
                <div className="thickness-row" key={sample.ratio}>
                  <span
                    className="thickness-line"
                    style={{
                      height: `${sample.width}px`,
                      background: colorToCss(selectedCommodity.color)
                    }}
                  />
                  <span>{sample.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="commodity-legend">
              {payload.commodities.map((commodity) => (
                <div className="commodity-legend-row" key={commodity.id}>
                  <span className="legend-swatch" style={{background: colorToCss(commodity.color)}} />
                  <span>{commodity.name}</span>
                  <small>{formatTonnes(commodity.maxQuantity)}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {hoverInfo ? (
        <section
          className="flow-tooltip"
          style={{left: hoverInfo.x + 18, top: hoverInfo.y + 18}}
        >
          {hoverInfo.text}
        </section>
      ) : maxFlow ? (
        <section className="flow-tooltip idle-tooltip">
          Largest visible flow: {maxFlow.tooltip}
        </section>
      ) : null}

      <section className="warning-card">
        <strong>Seed fixture</strong>
        <span>{payload.meta.seedDataWarning}</span>
      </section>
    </main>
  );
}

createRoot(rootElement!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
