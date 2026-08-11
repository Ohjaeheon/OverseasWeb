// 평면 세계지도 투영. Ported 1:1 from diagnosisEngine.js MAP_W/MAP_H/mapProj.

export const MAP_W = 1000;
export const MAP_H = 500;

/** 위도/경도 → SVG [x, y] (단순 등장방형/Plate Carrée 투영). */
export function mapProj(lat: number, lon: number): [number, number] {
  return [(lon + 180) / 360 * MAP_W, (90 - lat) / 180 * MAP_H];
}
