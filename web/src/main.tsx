import React, {Component, type ReactNode, useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import type {CommodityOption, FlowRecord, FlowmapPayload} from './types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const rootElement = document.getElementById('root');
type HoverCard = {text: string; x: number; y: number} | null;
type RenderMode = 'flowmap-straight' | 'flowmap-curved' | 'static-arcs' | 'particle-plume' | 'particle-trails';
type ParticleDensity = 'low' | 'medium' | 'high';
type Point = [number, number];
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
  position: Point;
  radius: number;
  color: [number, number, number, number];
};
type EndpointPoint = {
  id: string;
  name: string;
  position: Point;
  tonnes: number;
};

const PARTICLE_DENSITY: Record<ParticleDensity, {global: number; perFlow: number}> = {
  low: {global: 3500, perFlow: 70},
  medium: {global: 9000, perFlow: 160},
  high: {global: 18000, perFlow: 320}
};

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
  return [color[0], color[1], color[2], Math.round(255 * alpha)];
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

function estimateParticleCount(flow: FlowRecord, commodityMax: number, density: ParticleDensity): number {
  const budget = PARTICLE_DENSITY[density];
  const ratio = commodityMax > 0 ? Math.sqrt(flow.count / commodityMax) : 0;
  return Math.max(1, Math.min(budget.perFlow, Math.round(4 + ratio * budget.perFlow)));
}

function buildParticleSeeds(
  flows: FlowRecord[],
  locationsById: Map<string, {lon: number; lat: number}>,
  density: ParticleDensity
): ParticleSeed[] {
  const budget = PARTICLE_DENSITY[density];
  const maxByCommodity = new Map<string, number>();
  for (const flow of flows) {
    maxByCommodity.set(flow.commodityId, Math.max(maxByCommodity.get(flow.commodityId) ?? 0, flow.count));
  }

  const particles: ParticleSeed[] = [];
  const sortedFlows = [...flows].sort((left, right) => right.count - left.count);
  for (const flow of sortedFlows) {
    if (particles.length >= budget.global) break;
    const source = locationsById.get(flow.origin);
    const target = locationsById.get(flow.dest);
    if (!source || !target) continue;

    const count = Math.min(
      estimateParticleCount(flow, maxByCommodity.get(flow.commodityId) ?? flow.count, density),
      budget.global - particles.length
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

function particlePosition(particle: ParticleSeed, renderTime: number, offset = 0): Point {
  const rawT = (particle.phase + renderTime * 0.035 * particle.speed + offset) % 1;
  const t = smoothstep(rawT < 0 ? rawT + 1 : rawT);
  const [sourceLon, sourceLat] = particle.source;
  const [targetLon, targetLat] = particle.target;
  const deltaLon = shortestLongitudeDelta(sourceLon, targetLon);
  const deltaLat = targetLat - sourceLat;
  const baseLon = sourceLon + deltaLon * t;
  const baseLat = sourceLat + deltaLat * t;
  const distance = Math.max(1, Math.hypot(deltaLon, deltaLat));
  const plumeStrength = Math.sin(Math.PI * t);
  const plumeWidth = Math.min(7.5, Math.max(0.18, distance * 0.025)) * plumeStrength;
  const perpLon = -deltaLat / distance;
  const perpLat = deltaLon / distance;
  const flutter = Math.sin(particle.wobble + renderTime * 0.55 + t * Math.PI * 5) * 0.22;
  return [
    normalizeLongitude(baseLon + perpLon * plumeWidth * (particle.lateral + flutter)),
    baseLat + perpLat * plumeWidth * (particle.lateral + flutter)
  ];
}

function buildParticleFrame(
  particles: ParticleSeed[],
  renderTime: number,
  mode: RenderMode
): ParticlePoint[] {
  const trailOffsets = mode === 'particle-trails' ? [0, -0.035, -0.075] : [0];
  const trailAlpha = mode === 'particle-trails' ? [0.76, 0.34, 0.16] : [0.72];
  return trailOffsets.flatMap((offset, trailIndex) =>
    particles.map((particle) => ({
      id: `${particle.id}-${trailIndex}`,
      flow: particle.flow,
      position: particlePosition(particle, renderTime, offset),
      radius: Math.max(0.85, particle.radius - trailIndex * 0.25),
      color: withAlpha(particle.flow.color, trailAlpha[trailIndex])
    }))
  );
}

function estimateParticleMass(flows: FlowRecord[], density: ParticleDensity, selectedCommodity: CommodityOption | null): number | null {
  const relevantFlows = selectedCommodity ? flows.filter((flow) => flow.commodityId === selectedCommodity.id) : flows;
  const maxFlow = relevantFlows.reduce<FlowRecord | null>(
    (current, flow) => (!current || flow.count > current.count ? flow : current),
    null
  );
  if (!maxFlow) return null;
  const commodityMax = selectedCommodity?.maxQuantity ?? maxFlow.commodityMax ?? maxFlow.count;
  return maxFlow.count / estimateParticleCount(maxFlow, commodityMax, density);
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
  particleDensity,
  onHoverInfo
}: {
  payload: FlowmapPayload;
  flows: FlowRecord[];
  commodities: CommodityOption[];
  renderMode: RenderMode;
  particleDensity: ParticleDensity;
  onHoverInfo: (value: HoverCard) => void;
}) {
  const [mapModules, setMapModules] = useState<{
    DeckGL: any;
    Map: any;
    FlowmapLayer: any;
    ArcLayer: any;
    ScatterplotLayer: any;
  } | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState(0);

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
          ArcLayer: deckLayers.ArcLayer,
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
    if (renderMode !== 'particle-plume' && renderMode !== 'particle-trails') return undefined;
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
    () => buildParticleSeeds(flows, locationsById, particleDensity),
    [flows, locationsById, particleDensity]
  );

  const particleFrame = useMemo(
    () => buildParticleFrame(particleSeeds, renderTime, renderMode),
    [particleSeeds, renderTime, renderMode]
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

  const {DeckGL, Map, FlowmapLayer, ArcLayer, ScatterplotLayer} = mapModules;
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

  const arcLayer = new ArcLayer({
    id: 'commodity-static-arcs',
    data: flows,
    pickable: true,
    greatCircle: true,
    numSegments: 64,
    getSourcePosition: (flow: FlowRecord) => {
      const location = locationsById.get(flow.origin);
      return location ? [location.lon, location.lat] : [0, 0];
    },
    getTargetPosition: (flow: FlowRecord) => {
      const location = locationsById.get(flow.dest);
      return location ? [location.lon, location.lat] : [0, 0];
    },
    getSourceColor: (flow: FlowRecord) => withAlpha(flow.color, renderMode === 'static-arcs' ? 0.58 : 0.17),
    getTargetColor: (flow: FlowRecord) => withAlpha(flow.color, renderMode === 'static-arcs' ? 0.92 : 0.28),
    getWidth: (flow: FlowRecord) => Math.max(0.6, flow.lineWidth * (renderMode === 'static-arcs' ? 0.7 : 0.22)),
    getHeight: (flow: FlowRecord) => 0.45 + Math.min(0.8, flow.lineWidth / 16),
    getTilt: (flow: FlowRecord) => (random01(`${flow.id}:tilt`) - 0.5) * 16,
    widthUnits: 'pixels',
    widthMinPixels: renderMode === 'static-arcs' ? 0.7 : 0.25,
    widthMaxPixels: renderMode === 'static-arcs' ? 8 : 2.2,
    parameters: {depthTest: false},
    onHover: (info: any) => {
      const flow = info.object as FlowRecord | undefined;
      onHoverInfo(flow ? {text: flow.tooltip, x: info.x ?? 0, y: info.y ?? 0} : null);
    }
  });

  const particleLayer = new ScatterplotLayer({
    id: `commodity-particles-${renderMode}-${particleDensity}`,
    data: particleFrame,
    pickable: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 0.6,
    radiusMaxPixels: 5,
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
    radiusMinPixels: 2.4,
    radiusMaxPixels: 9,
    stroked: true,
    filled: true,
    getPosition: (endpoint: EndpointPoint) => endpoint.position,
    getRadius: (endpoint: EndpointPoint) =>
      2.4 + 6 * Math.sqrt(maxEndpointTonnes ? endpoint.tonnes / maxEndpointTonnes : 0),
    getFillColor: [246, 237, 216, 118],
    getLineColor: [231, 184, 78, 190],
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
      ? [arcLayer, endpointLayer]
      : renderMode === 'particle-plume' || renderMode === 'particle-trails'
        ? [arcLayer, particleLayer, endpointLayer]
        : flowmapLayers().filter(Boolean);

  return (
    <DeckGL
      initialViewState={{longitude: 18, latitude: 22, zoom: 1.22, pitch: 0, bearing: 0}}
      controller={true}
      layers={layers}
    >
      <Map reuseMaps mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}

function App() {
  const [payload, setPayload] = useState<FlowmapPayload | null>(null);
  const [activeCommodity, setActiveCommodity] = useState<string>('all');
  const [renderMode, setRenderMode] = useState<RenderMode>('flowmap-straight');
  const [particleDensity, setParticleDensity] = useState<ParticleDensity>('medium');
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
  const particleMass = estimateParticleMass(filteredFlows, particleDensity, selectedCommodity);
  const isParticleMode = renderMode === 'particle-plume' || renderMode === 'particle-trails';

  return (
    <main className="atlas">
      <MapStage
        payload={payload}
        flows={filteredFlows}
        commodities={visibleCommodities}
        renderMode={renderMode}
        particleDensity={particleDensity}
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
          </select>

          {isParticleMode ? (
            <>
              <label className="select-label" htmlFor="particle-density">
                Particle density
              </label>
              <select
                id="particle-density"
                value={particleDensity}
                onChange={(event) => setParticleDensity(event.target.value as ParticleDensity)}
              >
                <option value="low">Low · laptop safe</option>
                <option value="medium">Medium · plume test</option>
                <option value="high">High · GPU warmer</option>
              </select>
            </>
          ) : null}
        </div>

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
              {isParticleMode && particleMass ? (
                <p className="particle-note">
                  1 particle ≈ {formatTonnes(particleMass)} auf dem groessten sichtbaren Flow;
                  Budget {PARTICLE_DENSITY[particleDensity].global.toLocaleString('en-US')} Punkte.
                </p>
              ) : null}
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
              {isParticleMode ? (
                <p className="particle-note">
                  Partikel werden je Commodity separat skaliert; fuer exakte Tonnen-pro-Partikel bitte eine Commodity waehlen.
                </p>
              ) : null}
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
