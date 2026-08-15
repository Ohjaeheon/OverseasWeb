package com.overseas.portal.util;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * 주간보고 주차 계산 유틸리티.
 * ISO 주차가 아닌 기존 코드베이스 컨벤션(EvangelismWeeklyRecord.weekKey 등)을 따르는
 * "월 + 월내 주차" 방식: weekOfMonth = ceil(day / 7).
 */
public final class WeekUtil {

    private WeekUtil() {
    }

    public record Week(int year, int month, int weekOfMonth) implements Comparable<Week> {
        public int sortKey() {
            return year * 1000 + month * 100 + weekOfMonth;
        }

        @Override
        public int compareTo(Week o) {
            return Integer.compare(sortKey(), o.sortKey());
        }

        public String label() {
            return year + "년 " + month + "월 " + weekOfMonth + "주차";
        }
    }

    public static int weekOfMonth(LocalDate date) {
        return (int) Math.ceil(date.getDayOfMonth() / 7.0);
    }

    public static int weeksInMonth(int year, int month) {
        int days = YearMonth.of(year, month).lengthOfMonth();
        return (int) Math.ceil(days / 7.0);
    }

    public static Week currentWeek() {
        LocalDate now = LocalDate.now();
        return new Week(now.getYear(), now.getMonthValue(), weekOfMonth(now));
    }

    public static final Week MIN_WEEK = new Week(2025, 1, 1);
    public static final Week MAX_WEEK = new Week(2999, 12, weeksInMonth(2999, 12));

    public static boolean isInSupportedRange(int year, int month, int weekOfMonth) {
        Week w = new Week(year, month, weekOfMonth);
        return w.sortKey() >= MIN_WEEK.sortKey() && w.sortKey() <= MAX_WEEK.sortKey();
    }
}
