import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import {MapStage} from './components/MapStage';
import {RangeControl} from './components/RangeControl';
import {colorToCss, formatTonnes, legendLineWidth} from './lib/format';
import {TRAIL_SPACING_PIXEL_SCALE, estimateUniformParticleMass, isParticleRenderMode} from './lib/particles';
import {DEFAULT_RENDER_CONFIG} from './lib/types';
import type {HoverCard, RenderConfig, RenderMode, ViewMode} from './lib/types';
import type {CommodityOption, FlowRecord, FlowmapPayload} from './types';

const rootElement = document.getElementById('root');

if (rootElement) {
  rootElement.dataset.reactMounted = 'true';
}

function App() {
  const [payload, setPayload] = useState<FlowmapPayload | null>(null);
  const [activeCommodity, setActiveCommodity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [renderMode, setRenderMode] = useState<RenderMode>('particle-arc-trails');
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
  const locationsById = new globalThis.Map(
    payload.locations.map((location) => [location.id, {lon: location.lon, lat: location.lat, name: location.name}])
  );

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
  const globeMode = viewMode === 'globe';
  const effectiveRenderMode =
    globeMode && (renderMode === 'flowmap-straight' || renderMode === 'flowmap-curved')
      ? 'static-arcs'
      : renderMode;
  const isParticleMode = isParticleRenderMode(effectiveRenderMode);
  const particleMass = isParticleMode
    ? estimateUniformParticleMass(filteredFlows, locationsById, renderConfig.particleBudget, Boolean(renderConfig.equalWorldSpeed))
    : null;
  const particleBudgetLabel = Math.round(renderConfig.particleBudget).toLocaleString('en-US');
  const particleUnitText =
    isParticleMode && particleMass
      ? `One dot represents about ${formatTonnes(particleMass)}${selectedCommodity ? ` of ${selectedCommodity.name}` : ''}; budget ${particleBudgetLabel} dots.`
      : null;
  const particleDotColor: [number, number, number, number] =
    selectedCommodity?.color ?? visibleCommodities[0]?.color ?? [246, 237, 216, 220];
  const legendSubhead = isParticleMode
    ? 'Dot-Einheit'
    : activeCommodity === 'all'
      ? 'max. sichtbarer Strom je Commodity'
      : 'Linienstärke dieser Commodity';
  const updateRenderConfig = (key: keyof RenderConfig, value: number) => {
    setRenderConfig((current) => ({...current, [key]: value}));
  };
  const updateViewMode = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode);
    if (nextViewMode === 'globe' && (renderMode === 'flowmap-straight' || renderMode === 'flowmap-curved')) {
      setRenderMode('static-arcs');
    }
  };

  return (
    <main className="atlas">
      <MapStage
        payload={payload}
        flows={filteredFlows}
        commodities={visibleCommodities}
        renderMode={effectiveRenderMode}
        renderConfig={renderConfig}
        viewMode={viewMode}
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

          <label className="select-label" htmlFor="view-mode">
            Projection
          </label>
          <select
            id="view-mode"
            value={viewMode}
            onChange={(event) => updateViewMode(event.target.value as ViewMode)}
          >
            <option value="globe">Globe · free rotate</option>
            <option value="map">Flat map · Web Mercator</option>
          </select>

          <label className="select-label" htmlFor="render-mode">
            Render mode
          </label>
          <select
            id="render-mode"
            value={renderMode}
            onChange={(event) => setRenderMode(event.target.value as RenderMode)}
          >
            {globeMode ? null : <option value="flowmap-straight">Flowmap · animated straight</option>}
            {globeMode ? null : <option value="flowmap-curved">Flowmap · small curves</option>}
            <option value="static-arcs">deck.gl · static arcs</option>
            <option value="particle-plume">Particles · plume dots</option>
            <option value="particle-trails">Particles · smoky trails</option>
            <option value="particle-arc-plume">Particles · arc plume</option>
            <option value="particle-arc-trails">Particles · arc smoky trails</option>
          </select>

        </div>

        <details className="tuning-card" open={isParticleMode || effectiveRenderMode === 'static-arcs' || effectiveRenderMode === 'flowmap-curved'}>
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
                  id="speed-variation"
                  label="Speed variation"
                  min={0}
                  max={1}
                  step={0.02}
                  value={renderConfig.speedVariation}
                  onChange={(value) => updateRenderConfig('speedVariation', value)}
                />
                <button
                  className="ghost-button inline-toggle"
                  type="button"
                  onClick={() => updateRenderConfig('equalWorldSpeed', renderConfig.equalWorldSpeed ? 0 : 1)}
                >
                  {renderConfig.equalWorldSpeed ? 'Travel timing: equal world speed' : 'Travel timing: equal duration'}
                </button>
                <RangeControl
                  id="plume-width"
                  label="Plume width"
                  min={0}
                  max={5}
                  step={0.05}
                  value={renderConfig.plumeWidth}
                  onChange={(value) => updateRenderConfig('plumeWidth', value)}
                />
                <RangeControl
                  id="distance-width-damping"
                  label="Distance width damping"
                  min={0}
                  max={2}
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
                {globeMode ? null : (
                  <RangeControl
                    id="arc-particle-bend"
                    label="Hidden-route arc bend"
                    min={0}
                    max={2.5}
                    step={0.05}
                    value={renderConfig.arcParticleBend}
                    onChange={(value) => updateRenderConfig('arcParticleBend', value)}
                  />
                )}
                <button
                  className="ghost-button inline-toggle"
                  type="button"
                  onClick={() => updateRenderConfig('showRoutes', renderConfig.showRoutes ? 0 : 1)}
                >
                  {renderConfig.showRoutes ? 'Hide arcs in particle mode' : 'Show arcs in particle mode'}
                </button>
              </>
            ) : null}

            {effectiveRenderMode === 'static-arcs' || isParticleMode ? (
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
                  max={20}
                  step={0.05}
                  value={renderConfig.routeWidth}
                  onChange={(value) => updateRenderConfig('routeWidth', value)}
                />
                {globeMode ? null : (
                  <RangeControl
                    id="arc-curve"
                    label="Arc curve"
                    min={0}
                    max={1}
                    step={0.02}
                    value={renderConfig.arcCurve}
                    onChange={(value) => updateRenderConfig('arcCurve', value)}
                  />
                )}
                <RangeControl
                  id="arc-height"
                  label="Arc height"
                  min={0}
                  max={3}
                  step={0.05}
                  value={renderConfig.arcHeight}
                  onChange={(value) => updateRenderConfig('arcHeight', value)}
                />
                {globeMode ? null : (
                  <RangeControl
                    id="arc-tilt"
                    label="Arc tilt"
                    min={0}
                    max={3}
                    step={0.05}
                    value={renderConfig.arcTilt}
                    onChange={(value) => updateRenderConfig('arcTilt', value)}
                  />
                )}
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

            {effectiveRenderMode === 'flowmap-curved' ? (
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
            <small>{legendSubhead}</small>
          </div>

          {particleUnitText ? (
            <div className="particle-unit-row">
              <span className="particle-unit-dot" style={{background: colorToCss(particleDotColor), color: colorToCss(particleDotColor)}} />
              <span>{particleUnitText}</span>
            </div>
          ) : null}

          {selectedCommodity && !isParticleMode ? (
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
          ) : !selectedCommodity ? (
            <div className="commodity-legend">
              {payload.commodities.map((commodity) => (
                <div className="commodity-legend-row" key={commodity.id}>
                  <span className="legend-swatch" style={{background: colorToCss(commodity.color)}} />
                  <span>{commodity.name}</span>
                  <small>{formatTonnes(commodity.maxQuantity)}</small>
                </div>
              ))}
            </div>
          ) : null}
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
