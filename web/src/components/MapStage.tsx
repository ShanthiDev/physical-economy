import {useEffect, useMemo, useState} from 'react';
import {colorSchemeFor, colorToCss, formatTonnes, withAlpha} from '../lib/format';
import {GLOBE_SURFACE_OFFSET_METERS, arcHeightScale, buildRoutePaths, routeScreenLengthPixels} from '../lib/geometry';
import {buildGlobeGridLines, buildGlobeSurfaceCells} from '../lib/globeGrid';
import {TRAIL_SPACING_PIXEL_SCALE, buildParticleFrame, buildParticleSeeds, isParticleRenderMode} from '../lib/particles';
import type {
  EndpointPoint,
  GlobeGridLine,
  GlobeSurfaceCell,
  HoverCard,
  ParticlePoint,
  Position3D,
  RenderConfig,
  RenderMode,
  RouteArc,
  RoutePath,
  ViewMode
} from '../lib/types';
import type {CommodityOption, FlowRecord, FlowmapPayload} from '../types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = {longitude: 18, latitude: 22, zoom: 1.22, pitch: 0, bearing: 0};
const GLOBE_INITIAL_VIEW_STATE = {longitude: 18, latitude: 12, zoom: 0.15, minZoom: -1.4, maxZoom: 8};
const ROUTE_WIDTH_METERS = 65_000;
const COUNTRY_GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const GLOBE_SURFACE_CELLS = buildGlobeSurfaceCells();
const GLOBE_GRID_LINES = buildGlobeGridLines();

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

export function MapStage({
  payload,
  flows,
  commodities,
  renderMode,
  renderConfig,
  viewMode,
  onHoverInfo
}: {
  payload: FlowmapPayload;
  flows: FlowRecord[];
  commodities: CommodityOption[];
  renderMode: RenderMode;
  renderConfig: RenderConfig;
  viewMode: ViewMode;
  onHoverInfo: (value: HoverCard) => void;
}) {
  const [mapModules, setMapModules] = useState<{
    DeckGL: any;
    GlobeView: any;
    ArcLayer: any;
    GeoJsonLayer: any;
    Map: any;
    FlowmapLayer: any;
    PathLayer: any;
    PolygonLayer: any;
    ScatterplotLayer: any;
  } | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState(0);
  const [viewZoom, setViewZoom] = useState(INITIAL_VIEW_STATE.zoom);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      import('@deck.gl/react'),
      import('@deck.gl/core'),
      import('react-map-gl/maplibre'),
      import('@flowmap.gl/layers'),
      import('@deck.gl/layers')
    ])
      .then(([deck, deckCore, maplibre, flowmap, deckLayers]) => {
        if (cancelled) return;
        setMapModules({
          DeckGL: deck.DeckGL,
          GlobeView: deckCore._GlobeView,
          ArcLayer: deckLayers.ArcLayer,
          GeoJsonLayer: deckLayers.GeoJsonLayer,
          Map: maplibre.Map,
          FlowmapLayer: flowmap.FlowmapLayer,
          PathLayer: deckLayers.PathLayer,
          PolygonLayer: deckLayers.PolygonLayer,
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
    () => buildParticleSeeds(flows, locationsById, renderConfig.particleBudget, Boolean(renderConfig.equalWorldSpeed)),
    [flows, locationsById, renderConfig.particleBudget, renderConfig.equalWorldSpeed]
  );

  const globeMode = viewMode === 'globe';

  const routePaths = useMemo(
    () =>
      flows.flatMap((flow) => {
        const source = locationsById.get(flow.origin);
        const target = locationsById.get(flow.dest);
        return source && target
          ? buildRoutePaths(flow, [source.lon, source.lat], [target.lon, target.lat], renderConfig, globeMode)
          : [];
      }),
    [flows, locationsById, renderConfig, globeMode]
  );
  const routeArcs = useMemo(
    () =>
      flows.flatMap((flow) => {
        const source = locationsById.get(flow.origin);
        const target = locationsById.get(flow.dest);
        return source && target
          ? [{
              id: `${flow.id}-globe-arc`,
              flow,
              source: [source.lon, source.lat, GLOBE_SURFACE_OFFSET_METERS] as Position3D,
              target: [target.lon, target.lat, GLOBE_SURFACE_OFFSET_METERS] as Position3D
            }]
          : [];
      }),
    [flows, locationsById]
  );

  const trailSpacingByFlow = useMemo(() => {
    const hasTrails = renderMode === 'particle-trails' || renderMode === 'particle-arc-trails';
    if (!hasTrails) return new globalThis.Map<string, number>();

    const arcTrajectory = globeMode || renderMode === 'particle-arc-trails';
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
        renderConfig,
        globeMode
      );
      offsets.set(flow.id, Math.min(0.25, spacingPixels / routeLength));
    }
    return offsets;
  }, [flows, locationsById, renderMode, renderConfig, viewZoom, globeMode]);

  const particleFrame = useMemo(
    () => buildParticleFrame(particleSeeds, renderTime, renderMode, renderConfig, trailSpacingByFlow, globeMode),
    [particleSeeds, renderTime, renderMode, renderConfig, trailSpacingByFlow, globeMode]
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
          position: [location.lon, location.lat, globeMode ? GLOBE_SURFACE_OFFSET_METERS * 1.6 : 0],
          tonnes: (current?.tonnes ?? 0) + flow.count
        });
      }
    }
    return [...endpoints.values()];
  }, [flows, locationsById, globeMode]);
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

  const {DeckGL, GlobeView, ArcLayer, GeoJsonLayer, Map, FlowmapLayer, PathLayer, PolygonLayer, ScatterplotLayer} = mapModules;
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

  const globeSurfaceLayer = globeMode
    ? new PolygonLayer({
        id: 'globe-surface',
        data: GLOBE_SURFACE_CELLS,
        pickable: false,
        stroked: false,
        filled: true,
        getPolygon: (cell: GlobeSurfaceCell) => cell.polygon,
        getFillColor: [35, 49, 56, 255],
        parameters: {depthTest: true}
      })
    : null;

  const globeCountryLayer = globeMode
    ? new GeoJsonLayer({
        id: 'globe-countries',
        data: COUNTRY_GEOJSON_URL,
        pickable: true,
        stroked: true,
        filled: true,
        lineBillboard: true,
        lineCapRounded: true,
        lineJointRounded: true,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 0.45,
        lineWidthMaxPixels: 1.15,
        getFillColor: [31, 47, 39, 214],
        getLineColor: [246, 237, 216, 72],
        getLineWidth: 0.7,
        parameters: {depthTest: true},
        onHover: (info: any) => {
          const properties = info.object?.properties;
          onHoverInfo(properties?.NAME ? {text: properties.NAME, x: info.x ?? 0, y: info.y ?? 0} : null);
        }
      })
    : null;

  const globeGridLayer = globeMode
    ? new PathLayer({
        id: 'globe-grid',
        data: GLOBE_GRID_LINES,
        pickable: false,
        getPath: (line: GlobeGridLine) => line.path,
        getColor: [246, 237, 216, 28],
        getWidth: 1,
        widthUnits: 'pixels',
        parameters: {depthTest: true}
      })
    : null;

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
    parameters: {depthTest: globeMode},
    onHover: (info: any) => {
      const route = info.object as RoutePath | undefined;
      onHoverInfo(route ? {text: route.flow.tooltip, x: info.x ?? 0, y: info.y ?? 0} : null);
    }
  });

  const globeRouteLayer = new ArcLayer({
    id: 'commodity-globe-arcs',
    data: routeArcs,
    pickable: true,
    greatCircle: true,
    numSegments: 96,
    getSourcePosition: (route: RouteArc) => route.source,
    getTargetPosition: (route: RouteArc) => route.target,
    getSourceColor: (route: RouteArc) =>
      withAlpha(route.flow.color, (renderMode === 'static-arcs' ? 0.78 : 0.24) * renderConfig.routeOpacity * renderConfig.showRoutes),
    getTargetColor: (route: RouteArc) =>
      withAlpha(route.flow.color, (renderMode === 'static-arcs' ? 0.78 : 0.24) * renderConfig.routeOpacity * renderConfig.showRoutes),
    getWidth: (route: RouteArc) =>
      route.flow.lineWidth * (renderMode === 'static-arcs' ? 0.7 : 0.22) * renderConfig.routeWidth * ROUTE_WIDTH_METERS,
    getHeight: (route: RouteArc) => arcHeightScale(route.flow, renderConfig),
    getTilt: 0,
    widthUnits: 'meters',
    widthMinPixels: 0,
    widthMaxPixels: Number.MAX_SAFE_INTEGER,
    parameters: {depthTest: true},
    onHover: (info: any) => {
      const route = info.object as RouteArc | undefined;
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
    parameters: {depthTest: globeMode},
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
    parameters: {depthTest: globeMode},
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
    globeMode
      ? [
          globeSurfaceLayer,
          globeCountryLayer,
          globeGridLayer,
          renderMode === 'static-arcs' || renderConfig.showRoutes ? globeRouteLayer : null,
          isParticleRenderMode(renderMode) ? particleLayer : null,
          renderConfig.showEndpoints ? endpointLayer : null
        ].filter(Boolean)
      : renderMode === 'static-arcs'
        ? [routeLayer, renderConfig.showEndpoints ? endpointLayer : null].filter(Boolean)
        : isParticleRenderMode(renderMode)
          ? [renderConfig.showRoutes ? routeLayer : null, particleLayer, renderConfig.showEndpoints ? endpointLayer : null].filter(Boolean)
          : flowmapLayers().filter(Boolean);

  return (
    <DeckGL
      views={globeMode ? new GlobeView({resolution: 3}) : undefined}
      initialViewState={globeMode ? GLOBE_INITIAL_VIEW_STATE : INITIAL_VIEW_STATE}
      controller={globeMode ? {dragMode: 'pan', scrollZoom: true, doubleClickZoom: true, touchZoom: true, inertia: true} : true}
      layers={layers}
      onViewStateChange={({viewState}: any) => setViewZoom(viewState.zoom)}
    >
      {globeMode ? null : <Map reuseMaps mapStyle={MAP_STYLE} />}
    </DeckGL>
  );
}
