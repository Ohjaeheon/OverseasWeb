import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
function gradColor(r: number) { return r >= 30 ? '#ef4444' : r >= 15 ? '#f59e0b' : r >= 5 ? '#2563eb' : '#059669'; }

export const AdminSimulationTerminationPage: React.FC = () => {
  const sim = useSimulationData(2026);
  const { year, yearData, loading, saving, saveMsg, chartSettings, handleYearChange, setChartSettings, getDisplayCenters } = sim;
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'rank'>('table');
  const [edits, setEdits] = useState<Record<string, Record<number, string>>>({});
  const [selectedChart, setSelectedChart] = useState(CENTERS[0]);
  const displayCenters = getDisplayCenters();

  React.useEffect(() => {
    if (!yearData) return;
    const init: typeof edits = {};
    CENTERS.forEach(c => {
      init[c] = {};
      // 1~6월 실적 종강율 평균
      const rates: number[] = [];
      for (let m = 1; m <= yearData.actualMonths; m++) {
        const mv = yearData.monthly[c]?.[m];
        if (mv?.gradCount != null && mv?.registered) {
          rates.push((mv.gradCount / mv.registered) * 100);
        }
      }
      const avgRate = rates.length ? parseFloat((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)) : 0;

      for (let m = 1; m <= 12; m++) {
        const mv = yearData.monthly[c]?.[m];
        if (m <= yearData.actualMonths) {
          if (mv?.gradRate != null) init[c][m] = String(mv.gradRate);
        } else {
          if (mv?.gradRate != null) {
            init[c][m] = String(mv.gradRate);
          } else {
            init[c][m] = String(avgRate);
          }
        }
      }
    });
    setEdits(init);
  }, [yearData]);


  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7a99' }}>데이터 로딩 중...</div>;
  if (!yearData) return null;

  const isFuture = (m: number) => m > yearData.actualMonths;

  const getGradRate = (center: string, m: number): number => {
    const mv = yearData.monthly[center]?.[m];
    if (!mv) return 0;
    const grad = mv.gradCount ?? 0;
    const reg = mv.registered ?? 1;
    return reg > 0 ? (grad / reg) * 100 : 0;
  };

  const getEditedGradRate = (center: string, m: number): number | null => {
    const v = edits[center]?.[m];
    if (!v && v !== '0') return null;
    return parseFloat(v);
  };

  const getEstGradCount = (center: string, m: number): number | null => {
    const rate = getEditedGradRate(center, m);
    if (rate === null) return null;
    const base = yearData.monthly[center]?.[5]?.registered ?? yearData.base[center] ?? 0;
    return Math.round(base * rate / 100);
  };

  const getAvgGradRate = (center: string): number => {
    const rates: number[] = [];
    for (let m = 1; m <= yearData.actualMonths; m++) rates.push(getGradRate(center, m));
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  };

  const handleSaveAll = async () => {
    const batch: SimMonthlyData[] = [];
    CENTERS.forEach(c => {
      for (let m = 1; m <= 12; m++) {
        if (!isFuture(m)) continue;
        const v = edits[c]?.[m];
        if (v === '' || v === undefined) continue;
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) {
          batch.push({ simYear: year, centerName: c, monthNum: m, gradRate: parsed, isForecast: true });
        }
      }
    });
    await sim.saveBatch(batch);
  };

  const chartData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const mv = yearData.monthly[selectedChart]?.[m];
    const isReal = !isFuture(m);
    return {
      month: label,
      실적종강수: isReal ? (mv?.gradCount ?? null) : null,
      예상종강수: !isReal ? getEstGradCount(selectedChart, m) : null,
      실적종강율: isReal ? parseFloat(getGradRate(selectedChart, m).toFixed(2)) : null,
      예상종강율: !isReal ? getEditedGradRate(selectedChart, m) : null,
    };
  });

  const rankByCumGradRate = (useEstimate: boolean) =>
    CENTERS.map(c => {
      let totalGrad = 0, totalReg = 0;
      for (let m = 1; m <= 12; m++) {
        if (isFuture(m) && !useEstimate) continue;
        const mv = yearData.monthly[c]?.[m];
        if (!isFuture(m)) {
          totalGrad += mv?.gradCount ?? 0;
          totalReg += mv?.registered ?? 0;
        } else if (useEstimate) {
          const est = getEstGradCount(c, m) ?? 0;
          totalGrad += est;
          totalReg += mv?.registered ?? yearData.monthly[c]?.[5]?.registered ?? 0;
        }
      }
      const cumRate = totalReg > 0 ? (totalGrad / totalReg) * 100 : 0;
      return { center: c, cumRate, totalGrad };
    }).sort((a, b) => a.cumRate - b.cumRate).map((x, i) => ({ ...x, rank: i + 1 }));

  const rank6 = rankByCumGradRate(false);
  const rank12 = rankByCumGradRate(true);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0 }}>📉 종강수 예상 시뮬레이션</h1>
        <p style={{ color: '#6b7a99', margin: '6px 0 0', fontSize: '0.9rem' }}>월별 종강율 확인 · 하반기 종강율(%) 입력 → 종강수 역산 · 센터별 순위 산출</p>
      </div>

      <SimulationToolbar year={year} onYearChange={handleYearChange} chartSettings={chartSettings} onChartSettingsChange={setChartSettings} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[{ id: 'table', label: '📋 데이터 테이블' }, { id: 'chart', label: '📈 추이 차트' }, { id: 'rank', label: '🏅 순위 예상' }].map(t => (
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
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>센터별 종강 현황 및 예상</h2>
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
                  <th style={{ ...TH, background: '#374151' }}>평균종강율</th>
                  {MONTH_LABELS.map((m, i) => (
                    <th key={m} style={{ ...TH, background: isFuture(i + 1) ? 'rgba(239,68,68,0.7)' : undefined }}>
                      {m}<br /><span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{isFuture(i + 1) ? '종강율%→수' : '종강수/율'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCenters.map((center, ci) => (
                  <tr key={center} style={{ background: ci % 2 === 0 ? '#fafbfc' : '#fff' }}>
                    <td style={{ padding: '8px 14px', fontWeight: 700 }}>{center}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#6b7a99' }}>{getAvgGradRate(center).toFixed(1)}%</td>
                    {MONTH_LABELS.map((_, i) => {
                      const m = i + 1;
                      const mv = yearData.monthly[center]?.[m];
                      if (!isFuture(m)) {
                        const grad = mv?.gradCount ?? 0;
                        const rate = getGradRate(center, m);
                        return (
                          <td key={m} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f0f4fa' }}>
                            <div>{grad.toLocaleString()}</div>
                            <div style={{ fontSize: '0.72rem', color: gradColor(rate), fontWeight: 600 }}>{rate.toFixed(1)}%</div>
                          </td>
                        );
                      }
                      const est = getEstGradCount(center, m);
                      return (
                        <td key={m} style={{ padding: '6px 4px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid #f0f4fa', textAlign: 'center' }}>
                          <input type="number" step="0.1" placeholder="종강율%"
                            value={edits[center]?.[m] ?? ''}
                            onChange={e2 => setEdits(p => ({ ...p, [center]: { ...p[center], [m]: e2.target.value } }))}
                            style={{ width: '72px', padding: '4px 6px', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center', background: '#fff5f5', color: '#991b1b' }}
                          />
                          {est !== null && <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '3px' }}>{est.toLocaleString()}명</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'chart' && (
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>📈 종강 추이 차트</h2>
            <select value={selectedChart} onChange={e => setSelectedChart(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 600 }}>
              {displayCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fa" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tickFormatter={v => v?.toLocaleString()} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => v ? v.toFixed(0) + '%' : ''} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, n: string) => [n.includes('율') ? (v ? v.toFixed(1) + '%' : '-') : (v ? v.toLocaleString() + '명' : '-'), n]} />
              <Legend />
              <Bar yAxisId="left" dataKey="실적종강수" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar yAxisId="left" dataKey="예상종강수" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line yAxisId="right" dataKey="실적종강율" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" dataKey="예상종강율" stroke="#f87171" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'rank' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[{ title: '📊 현재 순위 (낮은 종강율 = 우수)', data: rank6 }, { title: '🎯 예상 순위 (12월 기준)', data: rank12 }].map(({ title, data }) => (
            <div key={title} style={CARD}>
              <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
              {data.map(item => {
                const isTop = item.rank <= chartSettings.highlightTopN;
                return (
                  <div key={item.center} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f0f4fa' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: isTop ? (item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#d97706') : '#e2e8f0', color: isTop ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 800 }}>{item.rank}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: CENTER_COLORS[item.center] }}>{item.center}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7a99' }}>누적종강율 {item.cumRate.toFixed(1)}%</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: gradColor(item.cumRate) }}>{item.cumRate.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
