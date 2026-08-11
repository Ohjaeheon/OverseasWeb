import worldTopologyJson from './worldTopology.json';

export interface TopoGeometry {
  type: 'Polygon' | 'MultiPolygon';
  arcs: number[][] | number[][][];
  id: string;
  properties: { name: string };
}

export interface WorldTopology {
  type: 'Topology';
  objects: { countries: { type: 'GeometryCollection'; geometries: TopoGeometry[] } };
  arcs: number[][][];
  bbox: number[];
  transform: { scale: [number, number]; translate: [number, number] };
}

// TopoJSON 세계 지도 원본 데이터(177개국, 595개 아크). Ported 1:1 from diagnosisEngine.js const WORLD.
export const WORLD: WorldTopology = worldTopologyJson as unknown as WorldTopology;
