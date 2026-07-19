import type {FlowRecord} from '../types';

export type HoverCard = {text: string; x: number; y: number} | null;
export type ViewMode = 'map' | 'globe';
export type RenderMode =
  | 'flowmap-straight'
  | 'flowmap-curved'
  | 'static-arcs'
  | 'particle-plume'
  | 'particle-trails'
  | 'particle-arc-plume'
  | 'particle-arc-trails';
export type Point = [number, number];
export type Position3D = [number, number, number];
export type Vector3 = [number, number, number];
export type RenderConfig = {
  particleBudget: number;
  speed: number;
  speedVariation: number;
  equalWorldSpeed: number;
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
export type ParticleSeed = {
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
  routeDistanceMeters: number;
};
export type ParticlePoint = {
  id: string;
  flow: FlowRecord;
  position: Position3D;
  radius: number;
  color: [number, number, number, number];
};
export type EndpointPoint = {
  id: string;
  name: string;
  position: Position3D;
  tonnes: number;
};
export type RoutePath = {
  id: string;
  flow: FlowRecord;
  path: Position3D[];
};
export type RouteArc = {
  id: string;
  flow: FlowRecord;
  source: Position3D;
  target: Position3D;
};
export type FlowParticlePlan = {
  flow: FlowRecord;
  source: Point;
  target: Point;
  routeDistanceMeters: number;
  weight: number;
};
export type GlobeSurfaceCell = {
  id: string;
  polygon: Position3D[];
};
export type GlobeGridLine = {
  id: string;
  path: Position3D[];
};

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  particleBudget: 20000,
  speed: 1,
  speedVariation: 0.3,
  equalWorldSpeed: 1,
  plumeWidth: 3,
  distanceWidthDamping: 1,
  altitudeWidthDamping: 0.85,
  jitter: 0.3,
  particleSize: 1,
  particleGlow: 0.72,
  trailCopies: 3,
  trailSpacing: 0.2,
  routeOpacity: 0.4,
  routeWidth: 3,
  arcCurve: 1,
  arcHeight: 0,
  arcTilt: 1,
  flowmapCurviness: 1,
  arcParticleBend: 0,
  showRoutes: 1,
  showEndpoints: 1,
  endpointSize: 5,
  endpointOpacity: 0.62
};
