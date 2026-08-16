// 신천지력 변환 유틸. 신천지 창립일(1984-03-14)을 신1년으로 삼아
// 그레고리력 연도와 1:1 선형 대응시킨다: 신N년 = 그레고리력 (N + SHIN_YEAR_OFFSET)년.
// 예: 2026년 = 신43년(2026 - 1983 = 43).
export const SHIN_YEAR_OFFSET = 1983;

export function gregorianYearFromShinYear(shinYear: number): number {
  return shinYear + SHIN_YEAR_OFFSET;
}

export function shinYearFromGregorianYear(gregorianYear: number): number {
  return gregorianYear - SHIN_YEAR_OFFSET;
}

/** 신년/월/일 입력값을 ISO 날짜 문자열(YYYY-MM-DD)로 변환. 값이 없으면 null. */
export function shinDateToIso(shinYear: number | null | undefined, month: number | null | undefined, day: number | null | undefined): string | null {
  if (!shinYear || !month || !day) return null;
  const year = gregorianYearFromShinYear(shinYear);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** ISO 날짜 문자열을 신년/월/일로 분해. 파싱 불가하면 null. */
export function isoToShinDate(iso: string | null | undefined): { shinYear: number; month: number; day: number } | null {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  return { shinYear: shinYearFromGregorianYear(year), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
}

/** "신43년(2026년) 3월 14일" 형태로 표시. 값이 없으면 '-'. */
export function formatFoundingDate(iso: string | null | undefined): string {
  const d = isoToShinDate(iso);
  if (!d) return '-';
  const gYear = gregorianYearFromShinYear(d.shinYear);
  return `신${d.shinYear}년(${gYear}년) ${d.month}월 ${d.day}일`;
}
