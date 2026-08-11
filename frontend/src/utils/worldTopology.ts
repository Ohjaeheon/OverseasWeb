// TopoJSON 아크 디코딩 + 대륙 분류 + 평면지도 경로 생성. Ported 1:1 from diagnosisEngine.js
// (tjDecodeArc/tjArc/tjRing/ringToPath/buildLandPaths/buildLandByCont/allRings/ringsByCont/_CONT_CODES/ISO_CONT).
import { WORLD, TopoGeometry } from '../data/worldTopology';
import { mapProj, MAP_W } from './mapProjection';

export type LonLat = [number, number];

function tjDecodeArc(i: number): LonLat[] {
  const arc = WORLD.arcs[i];
  const s = WORLD.transform.scale, t = WORLD.transform.translate;
  let x = 0, y = 0;
  const out: LonLat[] = [];
  for (const d of arc) {
    x += d[0]; y += d[1];
    out.push([x * s[0] + t[0], y * s[1] + t[1]]); // [lon,lat]
  }
  return out;
}

const arcCache: Record<number, LonLat[]> = {};
function tjArc(idx: number): LonLat[] {
  if (idx >= 0) {
    if (!arcCache[idx]) arcCache[idx] = tjDecodeArc(idx);
    return arcCache[idx];
  }
  const k = ~idx;
  if (!arcCache[k]) arcCache[k] = tjDecodeArc(k);
  return arcCache[k].slice().reverse();
}

function tjRing(ring: number[]): LonLat[] {
  let c: LonLat[] = [];
  ring.forEach((idx, k) => {
    let a = tjArc(idx);
    if (k > 0) a = a.slice(1);
    c = c.concat(a);
  });
  return c;
}

/** ring = [[lon,lat],...] — 날짜변경선(±180°) 넘는 점프는 끊어서 가로 줄 방지 (평면지도용). */
function ringToPath(ring: LonLat[]): string {
  let d = '', prevX: number | null = null;
  for (const p of ring) {
    const [x, y] = mapProj(p[1], p[0]);
    if (prevX === null || Math.abs(x - prevX) > MAP_W * 0.5) {
      d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1);
    } else {
      d += 'L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    prevX = x;
  }
  return d + 'Z';
}

function forEachGeometryRing(g: TopoGeometry, fn: (ring: number[]) => void) {
  if (g.type === 'Polygon') {
    (g.arcs as number[][]).forEach(fn);
  } else if (g.type === 'MultiPolygon') {
    (g.arcs as number[][][]).forEach((poly) => poly.forEach(fn));
  }
}

let landPathsCache: string | null = null;
/** 전체 육지 경계선 SVG path (평면지도, 국경선용). */
export function buildLandPaths(): string {
  if (landPathsCache != null) return landPathsCache;
  let d = '';
  WORLD.objects.countries.geometries.forEach((g) => forEachGeometryRing(g, (r) => { d += ringToPath(tjRing(r)); }));
  landPathsCache = d;
  return d;
}

// ISO numeric country code → 대륙 (데이터/기준표 분류에 맞춤: 러시아=유럽, 멕시코·중미=중앙아메리카)
const CONT_CODES: Record<string, number[]> = {
  "아시아": [4, 51, 31, 48, 50, 64, 96, 116, 156, 268, 356, 360, 364, 368, 376, 392, 400, 398, 414, 417, 418, 422, 458, 462, 496, 104, 524, 408, 512, 586, 275, 608, 634, 682, 702, 410, 144, 760, 158, 762, 764, 626, 792, 795, 784, 860, 704, 887],
  "유럽": [8, 40, 112, 56, 70, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 352, 372, 380, 428, 440, 442, 470, 498, 499, 528, 807, 578, 616, 620, 642, 643, 688, 703, 705, 724, 752, 756, 804, 826],
  "아프리카": [12, 24, 204, 72, 854, 108, 120, 132, 140, 148, 174, 178, 180, 384, 262, 818, 226, 232, 231, 266, 270, 288, 324, 624, 404, 426, 430, 434, 450, 454, 466, 478, 480, 504, 508, 516, 562, 566, 646, 686, 694, 706, 710, 728, 729, 748, 834, 768, 788, 800, 732, 894, 716],
  "북아메리카": [124, 840, 304],
  "중앙아메리카": [84, 188, 222, 320, 340, 484, 558, 591, 192, 214, 332, 388, 44, 780, 630],
  "남아메리카": [32, 68, 76, 152, 170, 218, 328, 600, 604, 740, 858, 862, 238],
  "오세아니아": [36, 554, 242, 90, 548, 598, 540],
};
export { CONT_CODES };

const ISO_CONT: Record<number, string> = {};
for (const c in CONT_CODES) {
  CONT_CODES[c].forEach((n) => { ISO_CONT[n] = c; });
}

let landByContCache: Record<string, string> | null = null;
/** 대륙명 → 그 대륙 국가들의 육지 SVG path (평면지도, 색칠용). */
export function buildLandByCont(): Record<string, string> {
  if (landByContCache) return landByContCache;
  const groups: Record<string, string> = {};
  WORLD.objects.countries.geometries.forEach((g) => {
    const cont = ISO_CONT[parseInt(g.id, 10)] || '_default';
    let d = '';
    forEachGeometryRing(g, (r) => { d += ringToPath(tjRing(r)); });
    groups[cont] = (groups[cont] || '') + d;
  });
  landByContCache = groups;
  return groups;
}

let ringsCache: LonLat[][] | null = null;
/** 전체 국가 경계 ring 목록(투영 전, [lon,lat] 좌표) — 지구본용. */
export function allRings(): LonLat[][] {
  if (ringsCache) return ringsCache;
  const o: LonLat[][] = [];
  WORLD.objects.countries.geometries.forEach((g) => forEachGeometryRing(g, (r) => o.push(tjRing(r))));
  ringsCache = o;
  return o;
}

let ringsByContCache: Record<string, LonLat[][]> | null = null;
/** 대륙명 → 그 대륙 국가들의 ring 목록(투영 전) — 지구본용. */
export function ringsByCont(): Record<string, LonLat[][]> {
  if (ringsByContCache) return ringsByContCache;
  const o: Record<string, LonLat[][]> = {};
  WORLD.objects.countries.geometries.forEach((g) => {
    const cont = ISO_CONT[parseInt(g.id, 10)] || '_default';
    forEachGeometryRing(g, (r) => { (o[cont] = o[cont] || []).push(tjRing(r)); });
  });
  ringsByContCache = o;
  return o;
}
