import centerWeeklyDataJson from './centerWeeklyData.json';

/** [초등총등록, 중등총등록, 고등총등록, 초등출석, 중등출석, 고등출석] (주간보고서 스냅샷) */
export type CenterWeeklyRow = [number, number, number, number, number, number];

interface CenterWeeklyDataShape {
  CENTERWK: Record<string, CenterWeeklyRow>;
  GAEGANG: Record<string, { mon?: Record<string, number>; cum?: Record<string, number> }>;
  THEOLOGY: Record<string, Record<string, number>>;
}

const data = centerWeeklyDataJson as unknown as CenterWeeklyDataShape;

/**
 * 교회명 → 센터 초/중/고 주간보고서 스냅샷(총등록 3개 + 출석 3개).
 * 센터 출석율 분모/분자는 전도재적이 아니라 이 데이터를 쓰기로 리더 확정(2026-07-04).
 * Ported 1:1 from diagnosisEngine.js const CENTERWK.
 */
export const CENTERWK = data.CENTERWK;

/**
 * 교회명 → 개강현황(해외) 최신 업로드 스냅샷 { mon: {월:비율}, cum: {월:비율} }.
 * "가등록 대비 센터등록율" 지표에 사용. Ported 1:1 from diagnosisEngine.js const GAEGANG.
 */
export const GAEGANG = data.GAEGANG;

/**
 * 교회명 → { "YYYY-MM": 전월 센터등록자 출석율 } (해외주간보고서 초/중/고 집계).
 * Ported 1:1 from diagnosisEngine.js const THEOLOGY.
 */
export const THEOLOGY = data.THEOLOGY;
