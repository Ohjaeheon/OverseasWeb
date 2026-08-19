import React from 'react';
import { Globe, Building2, MapPin, Flag } from 'lucide-react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { metricVal, fmtVal, getYearNumFromStr, getMonthNumFromStr } from '../../../utils/diagnosisMetrics';
import { useMetricColumnConfig } from '../../../contexts/MetricColumnConfigContext';
import { resolveCustomColumns } from '../../../utils/metricColumnEval';
import { formatFoundingDate } from '../../../utils/shinCalendar';
import { useCountryFlags } from '../../../contexts/CountryFlagContext';
import { homeDashboardService, OverseasBoardRow } from '../../../services/homeDashboardService';
import { filterByAssignedScope } from '../../../utils/accessScope';
import { BoardChartDashboard } from './BoardChartDashboard';

const OVERSEAS_BOARD_CAT = "해외선교부 현황판";
const cellStyle: React.CSSProperties = { textAlign: 'center', borderRight: '1px solid #e2e8f0' };

const OverseasBoardCard: React.FC<{ month: string }> = ({ month }) => {
  const { getColumnsFor, getCustomColsFor } = useMetricColumnConfig();
  const { getFlag } = useCountryFlags();
  const [rows, setRows] = React.useState<OverseasBoardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  // 홈 화면 상단 공용 월 선택과는 별개로, 이 표만 다른 연/월을 골라 볼 수 있게 자체 상태로 관리한다.
  const [year, setYear] = React.useState<number>(() => getYearNumFromStr(month));
  const [selMonth, setSelMonth] = React.useState<number>(() => getMonthNumFromStr(month));
  const [gubunFilter, setGubunFilter] = React.useState<string>('전체');

  React.useEffect(() => {
    if (!year || !selMonth) return;
    let cancelled = false;
    setLoading(true);
    homeDashboardService.getOverseasBoard(year, selMonth)
      .then((data) => { if (!cancelled) setRows(filterByAssignedScope(data)); })
      .catch((e) => { console.warn('해외선교부 현황판 조회 실패', e); if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, selMonth]);

  const catDef = getColumnsFor(OVERSEAS_BOARD_CAT);
  const customCols = getCustomColsFor(OVERSEAS_BOARD_CAT);

  // 인접한 컬럼끼리 같은 group을 가지면 헤더에서 하나로 묶는다(예: 전년말재적·현재적·증가율 -> "재적").
  const headerGroups: { label: string | null; cols: typeof catDef }[] = [];
  catDef.forEach((m) => {
    const last = headerGroups[headerGroups.length - 1];
    if (m.group && last && last.label === m.group) {
      last.cols.push(m);
    } else {
      headerGroups.push({ label: m.group || null, cols: [m] });
    }
  });

  const filteredRows = gubunFilter === '전체' ? rows : rows.filter((r) => r.gubun === gubunFilter);

  const enriched = filteredRows.map((r) => {
    const agg: any = { ...r, count: 1 };
    if (customCols.length) agg.__customValues = resolveCustomColumns(agg, customCols);
    return { r, agg };
  });

  // 합계 행: 원본 수치(재적/가개강/등록/종강수)는 전체 합산, 수기입력 비율(가개강대비등록률 등)은
  // 행별로 뜻이 다른 값을 단순 합산하는 게 무의미해 제외한다. 증가율 같은 수식 컬럼은 합산된
  // 원본 수치로 다시 계산되므로(sum(현재적)/sum(전년말재적)) 개별 행 비율의 단순 평균보다 정확하다.
  const totalAgg: any = {
    count: filteredRows.length,
    prevYearEndReg: filteredRows.reduce((s, r) => s + (r.prevYearEndReg || 0), 0),
    currentReg: filteredRows.reduce((s, r) => s + (r.currentReg || 0), 0),
    preOpen: filteredRows.reduce((s, r) => s + (r.preOpen || 0), 0),
    registrationCount: filteredRows.reduce((s, r) => s + (r.registrationCount || 0), 0),
    graduationCount: filteredRows.reduce((s, r) => s + (r.graduationCount || 0), 0),
    registrationRate: null,
    graduationRate: null,
    studentPreOpen: filteredRows.reduce((s, r) => s + (r.studentPreOpen || 0), 0),
    studentElementary: filteredRows.reduce((s, r) => s + (r.studentElementary || 0), 0),
    studentMiddle: filteredRows.reduce((s, r) => s + (r.studentMiddle || 0), 0),
    studentHigh: filteredRows.reduce((s, r) => s + (r.studentHigh || 0), 0),
  };
  if (customCols.length) totalAgg.__customValues = resolveCustomColumns(totalAgg, customCols);

  // 2025년 1월부터 대응하되, 실제 오늘 날짜 기준 미래 연도·월은 그때가 되기 전까지 선택할 수 없게 숨긴다.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const yearOptions = React.useMemo(() => Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i), [currentYear]);
  const maxMonthForYear = year < currentYear ? 12 : (year === currentYear ? currentMonthNum : 0);
  const monthOptions = Array.from({ length: maxMonthForYear }, (_, i) => i + 1);

  React.useEffect(() => {
    if (year > currentYear) setYear(currentYear);
  }, [year, currentYear]);

  React.useEffect(() => {
    if (maxMonthForYear > 0 && selMonth > maxMonthForYear) setSelMonth(maxMonthForYear);
  }, [maxMonthForYear, selMonth]);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>해외선교부 현황판</h3>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #cbd5e1',
            padding: '5px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#64748b', fontWeight: 700 }}>📅 연도</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#2563eb', cursor: 'pointer', outline: 'none', fontSize: 13 }}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>
          <div style={{ borderLeft: '1px solid #cbd5e1', height: 14, margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#64748b', fontWeight: 700 }}>📍 월 선택</span>
            <select
              value={selMonth}
              onChange={(e) => setSelMonth(parseInt(e.target.value, 10))}
              style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', cursor: 'pointer', outline: 'none', fontSize: 13 }}
            >
              {monthOptions.map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        {[
          { key: '전체', icon: <Globe size={14} /> },
          { key: '교회', icon: <Building2 size={14} /> },
          { key: '지역', icon: <MapPin size={14} /> },
          { key: '개척지', icon: <Flag size={14} /> },
        ].map((chip) => {
          const isSelected = gubunFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setGubunFilter(chip.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
                border: isSelected ? '1px solid #c7d2fe' : '1px solid #e6edf8',
                background: isSelected ? '#e0e7ff' : '#ffffff',
                color: isSelected ? '#2563eb' : '#6b7a99',
                fontWeight: isSelected ? 700 : 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {chip.icon} {chip.key}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>불러오는 중...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellStyle} rowSpan={2}></th>
                <th style={cellStyle} rowSpan={2}>교회(지역)</th>
                <th style={cellStyle} rowSpan={2}>설립일</th>
                <th style={cellStyle} rowSpan={2}>담임강사</th>
                {headerGroups.map((g, i) => (
                  g.label
                    ? <th key={i} style={cellStyle} colSpan={g.cols.length}>{g.label}</th>
                    : <th key={i} style={cellStyle} rowSpan={2}>{g.cols[0].l}</th>
                ))}
              </tr>
              <tr>
                {headerGroups.filter((g) => g.label).flatMap((g) => g.cols).map((m) => (
                  <th key={m.id} style={cellStyle}>{m.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map(({ r, agg }) => (
                <tr key={r.churchId}>
                  <td style={cellStyle}>
                    {(() => {
                      const src = getFlag(r.country);
                      return src
                        ? <img src={src} alt={r.country} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, border: '1px solid #e2e8f0', display: 'inline-block' }} />
                        : <span style={{ fontSize: 16 }}>🏳️</span>;
                    })()}
                  </td>
                  <td className="name" style={cellStyle}>
                    {r.name}
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.jipa} · {r.continent}</div>
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap', fontSize: 12.5 }}>{formatFoundingDate(r.foundingDate)}</td>
                  <td style={cellStyle}>{r.leaderName || '-'}</td>
                  {catDef.map((m) => <td key={m.id} style={cellStyle}>{fmtVal(metricVal(agg, m), m)}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 800, borderTop: '2px solid var(--line, #d8dee9)' }}>
                <td style={cellStyle}></td>
                <td style={cellStyle} colSpan={3}>합계 ({filteredRows.length}곳)</td>
                {catDef.map((m) => <td key={m.id} style={cellStyle}>{fmtVal(metricVal(totalAgg, m), m)}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <BoardChartDashboard enriched={enriched} catDef={catDef} />
    </div>
  );
};

/** 홈(종합 현황) 화면. Ported 1:1 from renderHome(). */
export const HomePage: React.FC = () => {
  const { month } = useDiagnosisData();
  if (!month) return null;

  return (
    <div>
      <div className="hero">
        <h1>전세계 맛디아지파 해외교회의 현황을 한눈에</h1>
        <span className="spirit">✠ 양에 속지 말고 질을 보라 — 확인·점검에서 행함으로</span>
      </div>

      <OverseasBoardCard month={month} />
    </div>
  );
};
