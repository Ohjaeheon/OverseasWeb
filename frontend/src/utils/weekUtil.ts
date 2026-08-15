// 주간보고 주차 계산 유틸리티.
// ISO 주차가 아닌 기존 코드베이스 컨벤션(EvangelismWeeklyRecord.weekKey 등)을 따르는
// "월 + 월내 주차" 방식: weekOfMonth = ceil(day / 7).

export interface Week {
  year: number;
  month: number; // 1-12
  weekOfMonth: number; // 1-5
}

export const MIN_WEEK: Week = { year: 2025, month: 1, weekOfMonth: 1 };

export function weekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

export function weeksInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  return Math.ceil(days / 7);
}

export function getCurrentWeek(): Week {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, weekOfMonth: weekOfMonth(now) };
}

export function weekSortKey(w: Week): number {
  return w.year * 1000 + w.month * 100 + w.weekOfMonth;
}

export function compareWeeks(a: Week, b: Week): number {
  return weekSortKey(a) - weekSortKey(b);
}

export function isSameWeek(a: Week, b: Week): boolean {
  return weekSortKey(a) === weekSortKey(b);
}

export function formatWeekLabel(w: Week): string {
  return `${w.year}년 ${w.month}월 ${w.weekOfMonth}주차`;
}

/** from(포함) ~ to(포함) 사이 주차를 오름차순으로 나열. to 기본값은 현재 주차(미래 주차 노출 방지용). */
export function enumerateWeeks(from: Week = MIN_WEEK, to: Week = getCurrentWeek()): Week[] {
  const weeks: Week[] = [];
  let y = from.year;
  let m = from.month;
  while (y < to.year || (y === to.year && m <= to.month)) {
    const maxW = weeksInMonth(y, m);
    const startW = y === from.year && m === from.month ? from.weekOfMonth : 1;
    const endW = y === to.year && m === to.month ? Math.min(to.weekOfMonth, maxW) : maxW;
    for (let w = startW; w <= endW; w++) {
      weeks.push({ year: y, month: m, weekOfMonth: w });
    }
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return weeks;
}
