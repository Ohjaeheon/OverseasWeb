import React, { useMemo } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { getMonthNumFromStr, getYearNumFromStr } from '../../../utils/diagnosisMetrics';

/**
 * 화면(section) 전용 연도/월 선택기 — 상단 공통 '기준월' 셀렉트와 별개로, 신앙 프로세스
 * 화면(전도·센터·예배)에서만 노출된다. Ported 1:1 from renderMonthSelectorHTML()의 p1/p3 분기.
 */
export const SectionMonthPicker: React.FC = () => {
  const { months, month, setMonth } = useDiagnosisData();
  if (!month) return null;

  const curYear = getYearNumFromStr(month);
  const years = useMemo(
    () => Array.from(new Set(months.map(getYearNumFromStr))).sort((a, b) => a - b),
    [months]
  );
  const monthsInYear = useMemo(
    () => months.filter((m) => getYearNumFromStr(m) === curYear).sort((a, b) => getMonthNumFromStr(a) - getMonthNumFromStr(b)),
    [months, curYear]
  );

  const onYearChange = (y: number) => {
    const curMonthNum = getMonthNumFromStr(month);
    const candidates = months.filter((m) => getYearNumFromStr(m) === y);
    const sameMonth = candidates.find((m) => getMonthNumFromStr(m) === curMonthNum);
    const target = sameMonth || candidates[candidates.length - 1];
    if (target) setMonth(target);
  };

  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #cbd5e1',
        padding: '5px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginLeft: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#64748b', fontWeight: 700 }}>📅 연도</span>
        <select
          value={curYear}
          onChange={(e) => onYearChange(+e.target.value)}
          style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#2563eb', cursor: 'pointer', outline: 'none', fontSize: 13 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>
      <div style={{ borderLeft: '1px solid #cbd5e1', height: 14, margin: '0 4px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#64748b', fontWeight: 700 }}>📍 월 선택</span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', cursor: 'pointer', outline: 'none', fontSize: 13 }}
        >
          {monthsInYear.map((m) => <option key={m} value={m}>{getMonthNumFromStr(m)}월</option>)}
        </select>
      </div>
    </div>
  );
};
