import React, { useState } from 'react';
import {
  ComposedChart, BarChart, AreaChart, Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CENTERS, CENTER_COLORS, MONTH_LABELS, calcGrowthRate, calcRegisteredFromRate } from '../../data/simulationData';
import { SimMonthlyData, SimBaseRegistered } from '../../services/simulationService';
import { useSimulationData } from '../../hooks/useSimulationData';
import { SimulationToolbar } from '../../components/admin/SimulationToolbar';
import { Save, Settings2, Database } from 'lucide-react';

const CARD: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px',
  padding: '24px', boxShadow: '0 4px 16px rgba(20,40,90,0.06)', marginBottom: '24px',
};
const TH: React.CSSProperties = {
  padding: '10px 12px', background: 'linear-gradient(135deg, #22337a, #172554)',
  color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', whiteSpace: 'nowrap',
};
function growthColor(r: number) { return r >= 5 ? '#059669' : r >= 0 ? '#2563eb' : '#ef4444'; }

export const AdminSimulationCenterPage: React.FC = () => {
  const sim = useSimulationData(2026);
  const { year, yearData, loading, saving, saveMsg, chartSettings, handleYearChange, setChartSettings, getDisplayCenters } = sim;
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'rank' | 'base'>('table');
  // localEdits: center → month → { growthRate?: string, registered?: string }
  const [edits, setEdits] = useState<Record<string, Record<number, { growthRate?: string; registered?: string }>>>({});
  // 기준 재적 편집
  const [baseEdits, setBaseEdits] = useState<Record<string, { val: string; usePrevAuto: boolean }>>({});
  const [selectedChart, setSelectedChart] = useState<string>(CENTERS[0]);
  const displayCenters = getDisplayCenters();

  React.useEffect(() => {
    if (!yearData) return;
    const init: typeof edits = {};
    CENTERS.forEach(c => {
      init[c] = {};
      const base = yearData.base[c] ?? 0;
      const m6Reg = yearData.monthly[c]?.[6]?.registered ?? yearData.monthly[c]?.[yearData.actualMonths]?.registered ?? base;
      const m6Rate = base > 0 ? parseFloat(calcGrowthRate(m6Reg, base).toFixed(2)) : 0;

      for (let m = 1; m <= 12; m++) {
        const mv = yearData.monthly[c]?.[m];
        if (m <= yearData.actualMonths) {
          // 실적월
          init[c][m] = {
            growthRate: mv?.growthRate != null ? String(mv.growthRate) : '',
            registered: mv?.registered != null ? String(mv.registered) : '',
          };
        } else {
          // 예상월 (7~12)
          if (mv?.growthRate != null || mv?.registered != null) {
            init[c][m] = {
              growthRate: mv.growthRate != null ? String(mv.growthRate) : '',
              registered: mv.registered != null ? String(mv.registered) : '',
            };
          } else {
            // 기본값: 6월 실적 성장율을 기본 추천값으로 채움
            init[c][m] = {
              growthRate: String(m6Rate),
              registered: '',
            };
          }
        }
      }
    });
    setEdits(init);
    const be: typeof baseEdits = {};
    CENTERS.forEach(c => {
      be[c] = { val: String(yearData.base[c] ?? 0), usePrevAuto: yearData.baseSettings[c]?.usePrevAuto ?? false };
    });
    setBaseEdits(be);
  }, [yearData]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7a99' }}>데이터 로딩 중...</div>;
  if (!yearData) return null;

  const isFutureMonth = (m: number) => m > yearData.actualMonths;

  const getEditedRegistered = (center: string, m: number): number | null => {
    const e = edits[center]?.[m];
    const base = yearData.base[center] ?? 0;
    if (e?.registered !== undefined && e.registered !== '') {
      const parsed = parseInt(e.registered, 10);
      return !isNaN(parsed) ? parsed : null;
    }
    if (e?.growthRate !== undefined && e.growthRate !== '') {
      const parsedRate = parseFloat(e.growthRate);
      return !isNaN(parsedRate) ? calcRegisteredFromRate(base, parsedRate) : null;
    }
    // DB 저장값 확인
    if (yearData.monthly[center]?.[m]?.registered != null) {
      return yearData.monthly[center]?.[m]?.registered ?? null;
    }
    if (yearData.monthly[center]?.[m]?.growthRate != null) {
      return calcRegisteredFromRate(base, yearData.monthly[center]?.[m]?.growthRate ?? 0);
    }
    // 기본값: 6월 실적 재적
    return yearData.monthly[center]?.[Math.min(m, yearData.actualMonths)]?.registered ?? base;
  };

  const getEditedGrowthRate = (center: string, m: number): number | null => {
    const e = edits[center]?.[m];
    const base = yearData.base[center] ?? 0;
    if (e?.growthRate !== undefined && e.growthRate !== '') {
      const parsedRate = parseFloat(e.growthRate);
      return !isNaN(parsedRate) ? parsedRate : null;
    }
    if (e?.registered !== undefined && e.registered !== '') {
      const reg = parseInt(e.registered, 10);
      return !isNaN(reg) && base > 0 ? parseFloat(calcGrowthRate(reg, base).toFixed(2)) : null;
    }
    return yearData.monthly[center]?.[m]?.growthRate ?? null;
  };

  const handleEditGrowthRate = (center: string, m: number, val: string) => {
    setEdits(p => ({ ...p, [center]: { ...p[center], [m]: { ...p[center]?.[m], growthRate: val, registered: '' } } }));
  };
  const handleEditRegistered = (center: string, m: number, val: string) => {
    setEdits(p => ({ ...p, [center]: { ...p[center], [m]: { ...p[center]?.[m], registered: val, growthRate: '' } } }));
  };

  // 상반기 추세(월평균 성장율)로 7~12월 자동 채우기
  const handleAutoFillTrend = () => {
    setEdits(p => {
      const next = { ...p };
      CENTERS.forEach(c => {
        const base = yearData.base[c] ?? 0;
        const m6Reg = yearData.monthly[c]?.[6]?.registered ?? yearData.monthly[c]?.[yearData.actualMonths]?.registered ?? base;
        const m1Reg = yearData.monthly[c]?.[1]?.registered ?? base;
        // 1~6월 월평균 순증 성장율
        const avgMonthlyGrowth = yearData.actualMonths > 1 ? (m6Reg - m1Reg) / (yearData.actualMonths - 1) : 0;

        next[c] = { ...next[c] };
        for (let m = yearData.actualMonths + 1; m <= 12; m++) {
          const step = m - yearData.actualMonths;
          const estReg = Math.round(m6Reg + avgMonthlyGrowth * step);
          const estRate = base > 0 ? parseFloat(calcGrowthRate(estReg, base).toFixed(2)) : 0;
          next[c][m] = { growthRate: String(estRate), registered: '' };
        }
      });
      return next;
    });
  };

  const handleSaveAll = async () => {
    const batch: SimMonthlyData[] = [];
    CENTERS.forEach(c => {
      for (let m = 1; m <= 12; m++) {
        if (!isFutureMonth(m)) continue; // 실적은 스킵
        const e = edits[c]?.[m];
        const growthRate = e?.growthRate !== '' && e?.growthRate !== undefined ? parseFloat(e.growthRate) : null;
        const registered = e?.registered !== '' && e?.registered !== undefined ? parseInt(e.registered, 10) : null;
        if ((growthRate != null && !isNaN(growthRate)) || (registered != null && !isNaN(registered))) {
          batch.push({
            simYear: year, centerName: c, monthNum: m,
            growthRate: growthRate ?? undefined,
            registered: registered ?? undefined,
            isForecast: true,
          });
        }
      }
    });
    await sim.saveBatch(batch);
  };


  const handleSaveBase = async () => {
    const items: SimBaseRegistered[] = CENTERS.map(c => ({
      simYear: year,
      centerName: c,
      baseRegistered: parseInt(baseEdits[c]?.val ?? '0', 10),
      usePrevAuto: baseEdits[c]?.usePrevAuto ?? false,
    }));
    await sim.saveBase(items);
  };

  // 차트 데이터
  const chartDataForCenter = (center: string) =>
    MONTH_LABELS.map((label, i) => {
      const m = i + 1;
      const isActual = !isFutureMonth(m);
      const actual = isActual ? (yearData.monthly[center]?.[m]?.registered ?? null) : null;
      const forecast = !isActual ? getEditedRegistered(center, m) : null;
      const base = yearData.base[center] ?? 0;
      const rate = isActual
        ? (actual ? calcGrowthRate(actual, base) : null)
        : getEditedGrowthRate(center, m);

      return {
        month: label,
        실적: actual,
        예상: forecast,
        기준재적: base,
        성장율: rate != null ? parseFloat(rate.toFixed(2)) : null,
      };
    });

  const rankForMonth = (m: number) =>
    CENTERS.map(c => {
      const reg = getEditedRegistered(c, m) ?? yearData.monthly[c]?.[Math.min(m, yearData.actualMonths || 6)]?.registered ?? 0;
      const base = yearData.base[c] ?? 0;
      const growth = calcGrowthRate(reg, base);
      return { center: c, reg, growth };
    }).sort((a, b) => b.growth - a.growth).map((x, i) => ({ ...x, rank: i + 1 }));

  const rank6 = rankForMonth(Math.min(6, yearData.actualMonths || 6));
  const rank12 = rankForMonth(12);

  const TABS = [
    { id: 'table', label: '📋 데이터 테이블' },
    { id: 'chart', label: '📈 센터별 차트' },
    { id: 'rank', label: '🏅 순위 예상' },
    { id: 'base', label: `⚙️ 기준 재적 설정 (${year}년)` },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0 }}>🏆 센터 예상 시뮬레이션</h1>
        <p style={{ color: '#6b7a99', margin: '6px 0 0', fontSize: '0.9rem' }}>기준 재적 기반 · 월별 성장율 입력 또는 재적 직접입력 → 역산 · 순위 예상</p>
      </div>

      <SimulationToolbar year={year} onYearChange={handleYearChange} chartSettings={chartSettings} onChartSettingsChange={setChartSettings} />

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem',
            background: activeTab === t.id ? '#2563eb' : '#fff',
            color: activeTab === t.id ? '#fff' : '#6b7a99',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── 기준 재적 설정 탭 ── */}
      {activeTab === 'base' && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>⚙️ {year}년 기준 재적 설정</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7a99' }}>
                성장율 역산의 분모가 되는 기준 재적수를 설정합니다.
                {year === 2026 ? ' (2026년은 엑셀 데이터가 기본값으로 세팅됩니다)' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {saveMsg && <span style={{ color: saveMsg.includes('완료') ? '#059669' : '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}>{saveMsg}</span>}
              <button onClick={handleSaveBase} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <Save size={15} /> 저장
              </button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left' }}>센터</th>
                <th style={TH}>기준 재적수</th>
                <th style={TH}>입력 방식</th>
                <th style={{ ...TH, textAlign: 'left' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {CENTERS.map((c, ci) => (
                <tr key={c} style={{ background: ci % 2 === 0 ? '#fafbfc' : '#fff' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.88rem' }}>{c}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      type="number"
                      value={baseEdits[c]?.val ?? ''}
                      onChange={e => setBaseEdits(p => ({ ...p, [c]: { ...p[c], val: e.target.value } }))}
                      disabled={baseEdits[c]?.usePrevAuto}
                      style={{ width: '100px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', textAlign: 'center', background: baseEdits[c]?.usePrevAuto ? '#f1f5f9' : '#fff' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                      <input
                        type="checkbox"
                        checked={baseEdits[c]?.usePrevAuto ?? false}
                        onChange={e => setBaseEdits(p => ({ ...p, [c]: { ...p[c], usePrevAuto: e.target.checked } }))}
                      />
                      전년말 자동
                    </label>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {baseEdits[c]?.usePrevAuto ? '전년말 재적수를 자동으로 기준값으로 사용' : '직접 입력한 값 사용'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 데이터 테이블 탭 ── */}
      {activeTab === 'table' && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>센터별 재적 현황 및 예상</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7a99' }}>
                7~12월에 목표 성장율(%) 또는 직접 수치를 입력하면 역산되어 차트와 순위에 자동 반영됩니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleAutoFillTrend}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
                  borderRadius: '10px', padding: '8px 14px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer'
                }}
              >
                ⚡ 상반기 추세로 7~12월 자동 채우기
              </button>
              {saveMsg && <span style={{ color: saveMsg.includes('완료') ? '#059669' : '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}>{saveMsg}</span>}
              <button onClick={handleSaveAll} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <Save size={15} /> {saving ? '저장 중...' : '전체 저장'}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left', minWidth: '90px' }}>센터</th>
                  <th style={{ ...TH, background: '#374151' }}>기준재적</th>
                  {MONTH_LABELS.map((m, i) => (
                    <th key={m} style={{ ...TH, background: isFutureMonth(i + 1) ? 'rgba(5,150,105,0.85)' : undefined }}>
                      {m}<br /><span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{isFutureMonth(i + 1) ? '성장율%/직접입력' : '실적'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCenters.map((center, ci) => (
                  <tr key={center} style={{ background: ci % 2 === 0 ? '#fafbfc' : '#fff' }}>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: CENTER_COLORS[center] }}>{center}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                      {(yearData.base[center] ?? 0).toLocaleString()}
                    </td>
                    {MONTH_LABELS.map((_, i) => {
                      const m = i + 1;
                      const mv = yearData.monthly[center]?.[m];
                      const base = yearData.base[center] ?? 0;
                      if (!isFutureMonth(m)) {
                        const reg = mv?.registered ?? 0;
                        const rate = calcGrowthRate(reg, base);
                        return (
                          <td key={m} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f0f4fa' }}>
                            <div>{reg.toLocaleString()}</div>
                            <div style={{ fontSize: '0.72rem', color: growthColor(rate), fontWeight: 600 }}>{rate >= 0 ? '+' : ''}{rate.toFixed(1)}%</div>
                          </td>
                        );
                      }
                      const e = edits[center]?.[m] ?? {};
                      const est = getEditedRegistered(center, m);
                      const displayRate = e.growthRate ?? '';
                      return (
                        <td key={m} style={{ padding: '5px 4px', background: 'rgba(5,150,105,0.04)', borderBottom: '1px solid #f0f4fa' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                            <input type="number" step="0.1" placeholder="성장율%" value={displayRate}
                              onChange={e2 => handleEditGrowthRate(center, m, e2.target.value)}
                              style={{ width: '70px', padding: '3px 6px', border: '1px solid #d1fae5', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', background: '#f0fdf4', color: '#065f46', fontWeight: 600 }}
                            />
                            <input type="number" placeholder="직접입력" value={e.registered ?? ''}
                              onChange={e2 => handleEditRegistered(center, m, e2.target.value)}
                              style={{ width: '70px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', background: '#fafbfc', color: '#374151' }}
                            />
                            {est !== null && (
                              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>{est.toLocaleString()}명</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>
            💡 예상 월: 성장율(%) 입력 시 재적수 자동 역산 | 직접입력 시 해당 수치 그대로 사용 | 전체 저장으로 DB에 반영
          </div>
        </div>
      )}

      {/* ── 차트 탭 ── */}
      {activeTab === 'chart' && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>📈 재적 추이 차트 ({selectedChart})</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7a99' }}>1~6월 실적과 7~12월 예상(성장율 역산/입력치)의 추세를 비교합니다.</p>
            </div>
            <select value={selectedChart} onChange={e => setSelectedChart(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, color: CENTER_COLORS[selectedChart] }}>
              {displayCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            {chartSettings.chartType === 'line' ? (
              <ComposedChart data={chartDataForCenter(selectedChart)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fa" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => v ? (v/1000).toFixed(0)+'K' : ''} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any, n: string) => [v ? v.toLocaleString()+'명' : '-', n]} />
                <Legend />
                <Line dataKey="실적" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                <Line dataKey="예상" stroke="#059669" strokeWidth={3} strokeDasharray="6 3" dot={{ r: 5 }} />
                <Line dataKey="기준재적" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartDataForCenter(selectedChart)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fa" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => v ? (v/1000).toFixed(0)+'K' : ''} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any, n: string) => [v ? v.toLocaleString()+'명' : '-', n]} />
                <Legend />
                <Bar dataKey="실적" fill="#2563eb" radius={[4,4,0,0]} maxBarSize={38} />
                <Bar dataKey="예상" fill="#059669" radius={[4,4,0,0]} maxBarSize={38} />
                <Line dataKey="기준재적" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 3" />
              </ComposedChart>
            )}
          </ResponsiveContainer>

          {/* 선택 센터 요약 지표 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>기준 재적</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
                {(yearData.base[selectedChart] ?? 0).toLocaleString()}명
              </div>
            </div>
            <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>6월 실적 재적</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                {(yearData.monthly[selectedChart]?.[6]?.registered ?? yearData.monthly[selectedChart]?.[yearData.actualMonths]?.registered ?? 0).toLocaleString()}명
              </div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>12월 예상 재적</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                {(getEditedRegistered(selectedChart, 12) ?? 0).toLocaleString()}명
              </div>
            </div>
            <div style={{ background: '#f5f3ff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: '0.75rem', color: '#6d28d9', fontWeight: 600 }}>12월 예상 성장율</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#5b21b6', marginTop: '4px' }}>
                {(() => {
                  const r = getEditedGrowthRate(selectedChart, 12);
                  return r != null ? (r >= 0 ? '+' : '') + r.toFixed(2) + '%' : '-';
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 순위 탭 ── */}
      {activeTab === 'rank' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            { title: `📊 현재 순위 (${Math.min(yearData.actualMonths, 6)}월 실적)`, data: rank6 },
            { title: '🎯 예상 순위 (12월 기준)', data: rank12 },
          ].map(({ title, data }) => (
            <div key={title} style={CARD}>
              <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
              {data.map(item => (
                <div key={item.center} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f0f4fa' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: item.rank <= chartSettings.highlightTopN
                      ? (item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#d97706')
                      : '#e2e8f0',
                    color: item.rank <= chartSettings.highlightTopN ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.88rem', fontWeight: 800
                  }}>{item.rank}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: CENTER_COLORS[item.center] }}>{item.center}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7a99' }}>{item.reg.toLocaleString()}명</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: growthColor(item.growth) }}>
                    {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
