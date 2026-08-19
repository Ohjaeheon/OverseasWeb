import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CENTERS, CENTER_COLORS, MONTH_LABELS, calcGrowthRate } from '../../data/simulationData';
import { SimMonthlyData } from '../../services/simulationService';
import { useSimulationData } from '../../hooks/useSimulationData';
import { SimulationToolbar } from '../../components/admin/SimulationToolbar';
import { Save } from 'lucide-react';

const CARD: React.CSSProperties = {
  background: '#fff', border: '1px solid #e6edf8', borderRadius: '16px',
  padding: '24px', boxShadow: '0 4px 16px rgba(20,40,90,0.06)', marginBottom: '24px',
};
const TH: React.CSSProperties = {
  padding: '10px 12px', background: 'linear-gradient(135deg, #22337a, #172554)',
  color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', whiteSpace: 'nowrap',
};
function rateColor(r: number) { return r >= 10 ? '#059669' : r >= 5 ? '#16a34a' : r >= 0 ? '#2563eb' : r >= -5 ? '#f59e0b' : '#ef4444'; }
function rateBg(r: number) { return r >= 10 ? 'rgba(5,150,105,0.12)' : r >= 5 ? 'rgba(22,163,74,0.08)' : r >= 0 ? 'rgba(37,99,235,0.06)' : r >= -5 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'; }

export const AdminSimulationGrowthPage: React.FC = () => {
  const sim = useSimulationData(2026);
  const { year, yearData, loading, saving, saveMsg, chartSettings, handleYearChange, setChartSettings, getDisplayCenters } = sim;
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'rank'>('table');
  const [edits, setEdits] = useState<Record<string, Record<number, string>>>({});
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
          if (mv?.growthRate != null) init[c][m] = String(mv.growthRate);
        } else {
          if (mv?.growthRate != null) {
            init[c][m] = String(mv.growthRate);
          } else {
            init[c][m] = String(m6Rate);
          }
        }
      }
    });
    setEdits(init);
  }, [yearData]);


  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7a99' }}>데이터 로딩 중...</div>;
  if (!yearData) return null;

  const isFuture = (m: number) => m > yearData.actualMonths;

  const getRealRate = (center: string, m: number): number => {
    const mv = yearData.monthly[center]?.[m];
    if (!mv?.registered) return 0;
    return calcGrowthRate(mv.registered, yearData.base[center] ?? 0);
  };

  const getEditRate = (center: string, m: number): number | null => {
    const v = edits[center]?.[m];
    if (v === '' || v === undefined) return null;
    return parseFloat(v);
  };

  const handleSaveAll = async () => {
    const batch: SimMonthlyData[] = [];
    CENTERS.forEach(c => {
      for (let m = 1; m <= 12; m++) {
        if (!isFuture(m)) continue;
        const v = edits[c]?.[m];
        if (v === '' || v === undefined) continue;
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) batch.push({ simYear: year, centerName: c, monthNum: m, growthRate: parsed, isForecast: true });
      }
    });
    await sim.saveBatch(batch);
  };

  // 차트 데이터
  const chartData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const row: Record<string, any> = { month: label };
    displayCenters.forEach(c => {
      if (!isFuture(m)) {
        row[c] = parseFloat(getRealRate(c, m).toFixed(2));
      } else {
        const est = getEditRate(c, m);
        row[c] = est !== null ? parseFloat(est.toFixed(2)) : null;
      }
    });
    return row;
  });

  const rankByRate = (m: number) =>
    CENTERS.map(c => {
      const rate = isFuture(m)
        ? (getEditRate(c, m) ?? getRealRate(c, Math.min(yearData.actualMonths, 6)))
        : getRealRate(c, m);
      return { center: c, rate };
    }).sort((a, b) => b.rate - a.rate).map((x, i) => ({ ...x, rank: i + 1 }));

  const rank6 = rankByRate(Math.min(yearData.actualMonths, 6));
  const rank12 = rankByRate(12);

  const ChartComp = chartSettings.chartType === 'area' ? AreaChart : LineChart;
  const DataComp = chartSettings.chartType === 'area' ? Area : Line;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0 }}>📊 성장율 예상 시뮬레이션</h1>
        <p style={{ color: '#6b7a99', margin: '6px 0 0', fontSize: '0.9rem' }}>전년말 재적 기준 · 월별 성장율 히트맵 · 목표 성장율 설정 · 순위 비교</p>
      </div>

      <SimulationToolbar year={year} onYearChange={handleYearChange} chartSettings={chartSettings} onChartSettingsChange={setChartSettings} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[{ id: 'table', label: '📋 성장율 테이블' }, { id: 'chart', label: '📈 추이 차트' }, { id: 'rank', label: '🏅 순위 예상' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem',
            background: activeTab === t.id ? '#2563eb' : '#fff', color: activeTab === t.id ? '#fff' : '#6b7a99',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'table' && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>센터별 월별 성장율 (전년말 재적 기준)</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                    <th key={m} style={{ ...TH, background: isFuture(i + 1) ? 'rgba(124,58,237,0.7)' : undefined }}>
                      {m}<br /><span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{isFuture(i + 1) ? '목표%' : '재적/율'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCenters.map((center, ci) => (
                  <tr key={center} style={{ background: ci % 2 === 0 ? '#fafbfc' : '#fff' }}>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: CENTER_COLORS[center] }}>{center}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{(yearData.base[center] ?? 0).toLocaleString()}</td>
                    {MONTH_LABELS.map((_, i) => {
                      const m = i + 1;
                      if (!isFuture(m)) {
                        const mv = yearData.monthly[center]?.[m];
                        const reg = mv?.registered ?? 0;
                        const rate = getRealRate(center, m);
                        return (
                          <td key={m} style={{ padding: '8px 10px', textAlign: 'center', background: rateBg(rate), borderBottom: '1px solid #f0f4fa' }}>
                            <div style={{ fontWeight: 600 }}>{reg.toLocaleString()}</div>
                            <div style={{ fontSize: '0.72rem', color: rateColor(rate), fontWeight: 700 }}>{rate >= 0 ? '+' : ''}{rate.toFixed(1)}%</div>
                          </td>
                        );
                      }
                      const estRate = getEditRate(center, m);
                      return (
                        <td key={m} style={{ padding: '6px 4px', background: estRate !== null ? rateBg(estRate) : 'rgba(124,58,237,0.04)', borderBottom: '1px solid #f0f4fa', textAlign: 'center' }}>
                          <input type="number" step="0.1" placeholder="목표%"
                            value={edits[center]?.[m] ?? ''}
                            onChange={e2 => setEdits(p => ({ ...p, [center]: { ...p[center], [m]: e2.target.value } }))}
                            style={{ width: '70px', padding: '4px 6px', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', background: '#f5f3ff', color: '#4c1d95' }}
                          />
                          {estRate !== null && <div style={{ fontSize: '0.72rem', color: rateColor(estRate), fontWeight: 700, marginTop: '3px' }}>{estRate >= 0 ? '+' : ''}{estRate.toFixed(1)}%</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 범례 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[{ label: '10%↑', c: '#059669', bg: 'rgba(5,150,105,0.12)' }, { label: '5~10%', c: '#16a34a', bg: 'rgba(22,163,74,0.08)' }, { label: '0~5%', c: '#2563eb', bg: 'rgba(37,99,235,0.06)' }, { label: '-5~0%', c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' }, { label: '-5%↓', c: '#ef4444', bg: 'rgba(239,68,68,0.08)' }].map(x => (
              <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', background: x.bg, fontSize: '0.78rem', fontWeight: 700 }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: x.c }} />
                <span style={{ color: x.c }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'chart' && (
        <div style={CARD}>
          <h2 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 700 }}>📈 성장율 추이 비교 (전 센터)</h2>
          <ResponsiveContainer width="100%" height={420}>
            <ChartComp data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fa" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(0) + '%' : ''} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, n: string) => [v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '미입력', n]} />
              <Legend />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              {displayCenters.map(c => (
                chartSettings.chartType === 'area'
                  ? <Area key={c} type="monotone" dataKey={c} stroke={CENTER_COLORS[c]} fill={CENTER_COLORS[c] + '30'} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  : <Line key={c} type="monotone" dataKey={c} stroke={CENTER_COLORS[c]} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              ))}
            </ChartComp>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'rank' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[{ title: `📊 현재 순위 (${Math.min(yearData.actualMonths, 6)}월 성장율)`, data: rank6 }, { title: '🎯 예상 순위 (12월 목표 기준)', data: rank12 }].map(({ title, data }) => (
            <div key={title} style={CARD}>
              <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
              {data.map(item => {
                const isTop = item.rank <= chartSettings.highlightTopN;
                const prevRank = rank6.find(r => r.center === item.center);
                const change = prevRank ? prevRank.rank - item.rank : 0;
                const estRate = getEditRate(item.center, 12);
                return (
                  <div key={item.center} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f0f4fa' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: isTop ? (item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#d97706') : '#e2e8f0', color: isTop ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 800 }}>{item.rank}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: CENTER_COLORS[item.center] }}>
                        {item.center}
                        {change > 0 && <span style={{ color: '#059669', fontSize: '0.75rem', marginLeft: '6px' }}>▲{change}</span>}
                        {change < 0 && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '6px' }}>▼{Math.abs(change)}</span>}
                        {change === 0 && <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '6px' }}>-</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7a99' }}>{estRate !== null ? `목표 ${estRate >= 0 ? '+' : ''}${estRate.toFixed(1)}%` : '미입력'}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: rateColor(item.rate) }}>{item.rate >= 0 ? '+' : ''}{item.rate.toFixed(2)}%</div>
                  </div>
                );
              })}
              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>💡 미입력 시 {Math.min(yearData.actualMonths, 6)}월 실적 기준으로 순위 계산</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
