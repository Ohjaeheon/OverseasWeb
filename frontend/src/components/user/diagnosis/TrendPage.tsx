import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { aggregate, recordsFor, metricVal, fmtVal, MetricDef, rate } from '../../../utils/diagnosisMetrics';

const SERIES_PALETTE = ['#2f54eb', '#16b9c9', '#e0922e', '#16a34a', '#d7005b', '#7f1084', '#5fa8ff', '#eb6120', '#86cab6', '#fdd000'];

interface TrendMetric extends MetricDef { g: string; }

const TREND_INT: TrendMetric[] = [
  { id: 'registered', k: 'registered', l: '현재적', t: 'int', g: '성도' }, { id: 'newAdmit', k: 'newAdmit', l: '입교(월)', t: 'int', g: '성도' }, { id: 'evangReg', k: 'evangReg', l: '전도재적', t: 'int', g: '성도' },
  { id: 'bibleCumReg', k: 'bibleCumReg', l: '가개강 누적등록', t: 'int', g: '센터' }, { id: 'centerMonthTotal', k: 'centerMonthTotal', l: '센터 월등록', t: 'int', g: '센터' },
  { id: 'centerCumReg', k: 'centerCumReg', l: '센터 누적등록', t: 'int', g: '센터' }, { id: 'centerMonthGrad', k: 'centerMonthGrad', l: '월종강', t: 'int', g: '센터' }, { id: 'centerCumGrad', k: 'centerCumGrad', l: '누적종강', t: 'int', g: '센터' },
  { id: 'prevNewAdmitCnt', k: 'prevNewAdmitCnt', l: '전월입교자수', t: 'int', g: '예배' }, { id: 'newAttTotal', k: (a) => (a as any).newAttTotal, l: '전월입교자 총출석', t: 'int', g: '예배' }, { id: 'attTotal', k: 'attTotal', l: '전성도 총출석', t: 'int', g: '예배' },
  { id: 'absLongTotal', k: (a) => (+a.absLongManage || 0) + (+a.absLongUnmanage || 0), l: '장기결석(관리대상)', t: 'int', g: '예배' },
];
const TREND_PCT: TrendMetric[] = [
  { id: 'rate_attTotal_attReg', k: (a) => rate(a.attTotal, a.attReg), l: '전성도 출석율', t: 'pct', g: '예배' }, { id: 'rate_newAttTotal_prevNewAdmitCnt', k: (a) => rate((a as any).newAttTotal, a.prevNewAdmitCnt), l: '전월입교자 출석율', t: 'pct', g: '예배' },
  { id: 'rate_centerMonthTotal_evangReg', k: (a) => rate(a.centerMonthTotal, a.evangReg), l: '센터 월등록율', t: 'pct', g: '센터' }, { id: 'rate_centerMonthGrad_centerTotMonthReg', k: (a) => rate(a.centerMonthGrad, a.centerTotMonthReg), l: '월 종강율', t: 'pct', g: '센터' },
  { id: 'rate_cumNewAdmit_retroReg', k: (a) => rate(a.cumNewAdmit, a.retroReg), l: '입교율(누적)', t: 'pct', g: '성도' }, { id: 'rate_cat_total_ctwk_total', k: (a) => rate(a.catE + a.catM + a.catH, a.ctwkE + a.ctwkM + a.ctwkH), l: '초중고 출석율', t: 'pct', g: '센터' },
  { id: 'rate_bibleCumReg_evangReg', k: (a) => rate(a.bibleCumReg, a.evangReg), l: '가개강 등록율', t: 'pct', g: '센터' },
];
const CATG: [string, string][] = [['성도', '#2563eb'], ['센터', '#7c3aed'], ['예배', '#16a34a']];

/** 추이·비교(지파/월별) 화면. Ported 1:1 from renderJipaTrend(). */
export const TrendPage: React.FC = () => {
  const { records, months, month, jipaOrder, jipaColors, gubun } = useDiagnosisData();
  const [trendType, setTrendType] = useState<'int' | 'pct'>('int');
  const [selMetrics, setSelMetrics] = useState<string[]>(['현재적']);
  const [stack, setStack] = useState(false);
  const [by, setBy] = useState<'jipa' | 'month'>('jipa');

  const pool = trendType === 'pct' ? TREND_PCT : TREND_INT;
  let sel = selMetrics.map((l) => pool.find((m) => m.l === l)).filter((m): m is TrendMetric => !!m);
  if (!sel.length) sel = [pool[0]];

  const isPct = trendType === 'pct';
  const groups = by === 'month' ? months.slice() : jipaOrder.slice();
  const aggFor = (g: string) => by === 'month' ? aggregate(recordsFor(records, g, gubun)) : aggregate(recordsFor(records, month, gubun).filter((r) => r.jipa === g));
  const gdata = groups.map((g) => ({ g, vals: sel.map((m) => metricVal(aggFor(g), m)) }));

  let yMax: number;
  if (isPct) {
    yMax = stack ? Math.max(1, ...gdata.map((d) => d.vals.reduce((s, v) => s + (v || 0), 0))) : 1;
  } else {
    const indiv: number[] = []; gdata.forEach((d) => d.vals.forEach((v) => { if (v != null && !isNaN(v)) indiv.push(v); }));
    const sums = gdata.map((d) => d.vals.reduce((s, v) => s + (+(v || 0)), 0));
    yMax = Math.max(1, stack ? Math.max(...sums) : Math.max(0, ...indiv));
  }

  const W = 940, H = 470, PL = 66, PR = 18, PT = 18, PB = 92, plotW = W - PL - PR, plotH = H - PT - PB;
  const N = groups.length, S = sel.length, groupW = N ? plotW / N : plotW;

  const resetTrend = () => { setTrendType('int'); setSelMetrics(['현재적']); setStack(false); setBy('jipa'); };
  const toggleMetric = (l: string) => setSelMetrics((arr) => arr.includes(l) ? (arr.length > 1 ? arr.filter((x) => x !== l) : arr) : arr.concat([l]));
  const changeType = (t: 'int' | 'pct') => { if (t === trendType) return; setTrendType(t); setSelMetrics([(t === 'pct' ? TREND_PCT : TREND_INT)[0].l]); };

  return (
    <div className="card">
      <h3>📈 {by === 'month' ? '월별' : '지파별'} 비교 — {sel.map((m) => m.l).join(', ')}</h3>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
        <div><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>유형</div>
          <div className="grouptoggle"><button className={!isPct ? 'on' : ''} onClick={() => changeType('int')}>수치</button><button className={isPct ? 'on' : ''} onClick={() => changeType('pct')}>％</button></div>
        </div>
        <div><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>막대</div>
          <div className="grouptoggle"><button className={!stack ? 'on' : ''} onClick={() => setStack(false)}>나열</button><button className={stack ? 'on' : ''} onClick={() => setStack(true)}>쌓기</button></div>
        </div>
        <div><div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>비교 기준</div>
          <div className="grouptoggle"><button className={by === 'jipa' ? 'on' : ''} onClick={() => setBy('jipa')}>지파별</button><button className={by === 'month' ? 'on' : ''} onClick={() => setBy('month')}>월별</button></div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>&nbsp;</div>
          <button onClick={resetTrend} style={{ padding: '6px 13px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 700, color: '#5b6b8a', cursor: 'pointer' }}>↻ 초기화</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {CATG.map(([cat, col]) => {
          const items = pool.filter((m) => m.g === cat);
          if (!items.length) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }} key={cat}>
              <span style={{ flex: '0 0 40px', fontSize: 11, fontWeight: 800, color: col }}>{cat}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {items.map((m) => {
                  const on = selMetrics.includes(m.l);
                  return <button key={m.l} className={`subtab ${on ? 'on' : ''}`} onClick={() => toggleMetric(m.l)}>{on ? '✓ ' : ''}{m.l}</button>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 1, 2, 3, 4].map((k) => {
          const gy = PT + plotH * k / 4, val = yMax * (1 - k / 4);
          return (
            <React.Fragment key={k}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#e3eaf5" />
              <text x={PL - 7} y={gy + 3} fontSize={11} fill="#8aa0c4" textAnchor="end">{isPct ? (val * 100).toFixed(0) + '%' : Math.round(val).toLocaleString('ko-KR')}</text>
            </React.Fragment>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="#cdd9ee" /><line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="#cdd9ee" />
        {gdata.map((d, gi) => {
          const gx = PL + gi * groupW;
          const cx = gx + groupW / 2, ly = PT + plotH + 15;
          if (stack) {
            const bw = Math.min(48, groupW * 0.5), bx = gx + (groupW - bw) / 2; let cy = PT + plotH;
            return (
              <React.Fragment key={d.g}>
                {d.vals.map((v, si) => {
                  if (v == null || isNaN(v) || v <= 0) return null;
                  const h = (v / yMax) * plotH; cy -= h;
                  return (
                    <React.Fragment key={si}>
                      <rect x={bx} y={cy} width={bw} height={h} fill={SERIES_PALETTE[si % SERIES_PALETTE.length]} rx={1}><title>{d.g} · {sel[si].l}: {fmtVal(v, sel[si])}</title></rect>
                      {h >= 14 && <text x={bx + bw / 2} y={cy + h / 2 + 3} fontSize={9} fill="#fff" textAnchor="middle" style={{ pointerEvents: 'none' }}>{fmtVal(v, sel[si])}</text>}
                    </React.Fragment>
                  );
                })}
                <text x={cx} y={ly} fontSize={10.5} fill="#6b7a99" textAnchor="end" transform={`rotate(-35 ${cx.toFixed(1)} ${ly.toFixed(1)})`}>{d.g}</text>
              </React.Fragment>
            );
          }
          const inner = groupW * 0.78, bw = Math.max(2, inner / S), x0 = gx + (groupW - inner) / 2;
          return (
            <React.Fragment key={d.g}>
              {d.vals.map((v, si) => {
                if (v == null || isNaN(v)) return null;
                const h = Math.max(0, (v / yMax) * plotH), x = x0 + si * bw, bw2 = Math.max(1, bw - 1.5), bxc = x + bw2 / 2, top = PT + plotH - h;
                const lbl = fmtVal(v, sel[si]);
                return (
                  <React.Fragment key={si}>
                    <rect x={x} y={top} width={bw2} height={h} fill={SERIES_PALETTE[si % SERIES_PALETTE.length]} rx={1}><title>{d.g} · {sel[si].l}: {lbl}</title></rect>
                    {bw >= 24 ? (
                      <text x={bxc} y={top - 4} fontSize={9.5} fill="#41506f" textAnchor="middle" style={{ pointerEvents: 'none' }}>{lbl}</text>
                    ) : (
                      <text x={bxc} y={top < 34 ? top + 3 : top - 3} fontSize={8.5} fill={top < 34 ? '#fff' : '#41506f'} textAnchor={top < 34 ? 'end' : 'start'} transform={`rotate(-90 ${bxc.toFixed(1)} ${(top < 34 ? top + 3 : top - 3).toFixed(1)})`} style={{ pointerEvents: 'none' }}>{lbl}</text>
                    )}
                  </React.Fragment>
                );
              })}
              <text x={cx} y={ly} fontSize={10.5} fill="#6b7a99" textAnchor="end" transform={`rotate(-35 ${cx.toFixed(1)} ${ly.toFixed(1)})`}>{d.g}</text>
            </React.Fragment>
          );
        })}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 13, margin: '10px 0 4px' }}>
        {sel.map((m, si) => (
          <span key={m.l} style={{ fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: SERIES_PALETTE[si % SERIES_PALETTE.length], marginRight: 5, verticalAlign: 'middle' }} />{m.l}
          </span>
        ))}
      </div>

      <div className="tblwrap" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>{by === 'month' ? '월' : '지파'}</th>{sel.map((m) => <th key={m.l}>{m.l}</th>)}</tr></thead>
          <tbody>
            {gdata.map((d) => (
              <tr key={d.g}>
                <td className="name">{by === 'jipa' && <span className="dot" style={{ background: jipaColors[d.g] || '#888' }} />}{d.g}</td>
                {d.vals.map((v, si) => <td key={si}>{fmtVal(v, sel[si])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
