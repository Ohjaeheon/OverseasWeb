// 정사영(Orthographic) 지구본 투영. Ported 1:1 from diagnosisEngine.js const GLB / orthoPt() 및
// globeContPath/globeLandD/globeGratD.
import { LonLat, allRings, ringsByCont } from './worldTopology';

const D2R = Math.PI / 180;

export interface GlobeView {
  /** 경도 회전각(도) */
  lambda: number;
  /** 위도 기울기(도) */
  phi: number;
  /** 반지름(px) */
  R: number;
  /** 중심 x,y (px) */
  cx: number;
  cy: number;
}

export const DEFAULT_GLOBE_VIEW: GlobeView = { lambda: 0, phi: -12, R: 300, cx: 340, cy: 340 };

/**
 * 위도/경도 → [x, y, visible] (뒤쪽 반구는 visible=false).
 */
export function orthoPt(lat: number, lon: number, view: GlobeView): [number, number, boolean] {
  const ph = lat * D2R, la = lon * D2R, ph0 = view.phi * D2R, la0 = view.lambda * D2R;
  const cosc = Math.sin(ph0) * Math.sin(ph) + Math.cos(ph0) * Math.cos(ph) * Math.cos(la - la0);
  const x = Math.cos(ph) * Math.sin(la - la0);
  const y = Math.cos(ph0) * Math.sin(ph) - Math.sin(ph0) * Math.cos(ph) * Math.cos(la - la0);
  return [view.cx + view.R * x, view.cy - view.R * y, cosc >= 0];
}

function ringsToPath(rings: LonLat[][], view: GlobeView): string {
  let d = '';
  rings.forEach((ring) => {
    let pen = false;
    for (const p of ring) {
      const a = orthoPt(p[1], p[0], view);
      if (a[2]) { d += (pen ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1); pen = true; }
      else pen = false;
    }
  });
  return d;
}

/** 대륙별 육지 SVG path (지구본, 색칠용). */
export function globeContPath(cont: string, view: GlobeView): string {
  const rc = ringsByCont();
  return ringsToPath(rc[cont] || [], view);
}

/** 전체 대륙 목록 (ringsByCont의 키). */
export function globeContinents(): string[] {
  return Object.keys(ringsByCont());
}

/** 전체 육지 SVG path (지구본, 국경선용). */
export function globeLandD(view: GlobeView): string {
  return ringsToPath(allRings(), view);
}

/** 위경도 격자선 SVG path (지구본). */
export function globeGratD(view: GlobeView): string {
  let d = '';
  for (let lon = -180; lon < 180; lon += 30) {
    let pen = false;
    for (let lat = -80; lat <= 80; lat += 4) {
      const a = orthoPt(lat, lon, view);
      if (a[2]) { d += (pen ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1); pen = true; } else pen = false;
    }
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    let pen = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const a = orthoPt(lat, lon, view);
      if (a[2]) { d += (pen ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1); pen = true; } else pen = false;
    }
  }
  return d;
}
