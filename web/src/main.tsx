import React, {Component, type ReactNode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import type {CommodityOption, FlowRecord, FlowmapPayload} from './types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const rootElement = document.getElementById('root');
type HoverCard = {text: string; x: number; y: number} | null;

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

function describePickingInfo(info: any): string | null {
  const object = info?.object;
  if (!object) return null;

  if (object.type === 'flow') {
    const flow = object.flow as FlowRecord | undefined;
    return flow?.tooltip ?? `${object.origin?.name ?? object.origin?.id} -> ${object.dest?.name ?? object.dest?.id}`;
  }

  if (object.type === 'location') {
    return `${object.name ?? object.location?.name ?? object.id}`;
  }

  return null;
}

function MapStage({
  payload,
  flows,
  commodities,
  onHoverInfo
}: {
  payload: FlowmapPayload;
  flows: FlowRecord[];
  commodities: CommodityOption[];
  onHoverInfo: (value: HoverCard) => void;
}) {
  const [mapModules, setMapModules] = useState<{
    DeckGL: any;
    Map: any;
    FlowmapLayer: any;
  } | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      import('@deck.gl/react'),
      import('react-map-gl/maplibre'),
      import('@flowmap.gl/layers')
    ])
      .then(([deck, maplibre, flowmap]) => {
        if (cancelled) return;
        setMapModules({
          DeckGL: deck.DeckGL,
          Map: maplibre.Map,
          FlowmapLayer: flowmap.FlowmapLayer
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

  const {DeckGL, Map, FlowmapLayer} = mapModules;
  const flowsByCommodity = new globalThis.Map<string, FlowRecord[]>();
  for (const flow of flows) {
    flowsByCommodity.set(flow.commodityId, [...(flowsByCommodity.get(flow.commodityId) ?? []), flow]);
  }

  const layers = commodities
    .map((commodity, index) => {
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
        flowLinesRenderingMode: 'animated-straight',
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
          const text = describePickingInfo(info);
          onHoverInfo(text ? {text, x: info.x ?? 0, y: info.y ?? 0} : null);
        }
      });
    })
    .filter(Boolean);

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

  return (
    <main className="atlas">
      <MapStage
        payload={payload}
        flows={filteredFlows}
        commodities={visibleCommodities}
        onHoverInfo={setHoverInfo}
      />

      <section className="control-card">
        <p className="eyebrow">Trade-only prototype · {payload.meta.targetYear}</p>
        <h1>{payload.meta.title}</h1>
        <p className="lede">
          BACI net trade flows rendered with flowmap.gl. Farben folgen grob der Materialfamilie;
          Linienstärken sind pro Commodity normalisiert, damit kleine, kritische Stoffströme nicht verschwinden.
        </p>

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
