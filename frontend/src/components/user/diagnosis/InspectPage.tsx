import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { buildChurchScores, ChurchScore, median, weakPoints, pct, fmt } from '../../../utils/diagnosisMetrics';
import { EntityDetailModal, DetailTarget } from './EntityDetailPanel';

const AX_Q = [
  { k: 'qscore', l: '종합 질점수', t: 'score' as const, fn: (c: ChurchScore) => c.q.score },
  { k: 'qNew', l: '전월입교자 출석률', t: 'pct' as const, fn: (c: ChurchScore) => c.q.qNew },
  { k: 'qAtt', l: '전성도 출석률', t: 'pct' as const, fn: (c: ChurchScore) => c.q.qAtt },
  { k: 'qGrad', l: '월 종강율', t: 'pct' as const, fn: (c: ChurchScore) => c.q.qGrad },
  { k: 'qCAtt', l: '초중고 출석율', t: 'pct' as const, fn: (c: ChurchScore) => c.q.qCAtt },
  { k: 'qUnabs', l: '관리불가 결석율', t: 'pct' as const, fn: (c: ChurchScore) => c.q.qUnabs },
];
const AX_A = [
  { k: 'ascore', l: '종합 양점수', t: 'score' as const, fn: (c: ChurchScore) => c.n.score },
  { k: 'aCen', l: '센터 월등록율', t: 'pct' as const, fn: (c: ChurchScore) => c.n.aCen },
  { k: 'aAdm', l: '입교율(누적)', t: 'pct' as const, fn: (c: ChurchScore) => c.n.aAdm },
  { k: 'aBib', l: '가개강 등록율', t: 'pct' as const, fn: (c: ChurchScore) => c.n.aBib },
  { k: 'reg', l: '재적(명)', t: 'int' as const, fn: (c: ChurchScore) => c.agg.registered },
];
type AxisDef = typeof AX_Q[number] | typeof AX_A[number];

function axMaxOf(t: string, vals: number[]): number {
  if (t === 'pct') return 1;
  if (t === 'score') return 100;
  const mx = Math.max(1, ...vals);
  const p = Math.pow(10, Math.floor(Math.log10(mx)));
  return Math.ceil(mx / p) * p;
}
function axFmt(v: number | null, t: string): string {
  if (v == null || isNaN(v)) return '-';
  return t === 'pct' ? pct(v) : (t === 'score' ? String(Math.round(v)) : fmt(v));
}
function axGrid(v: number, t: string): string {
  return t === 'pct' ? Math.round(v * 100) + '%' : (t === 'score' ? String(Math.round(v)) : fmt(Math.round(v)));
}

interface ScoredChurch extends ChurchScore { xv: number | null; yv: number | null; quad?: string; }

const InspBoard: React.FC<{ c: ScoredChurch; onClick: () => void }> = ({ c, onClick }) => {
  const ms: [string, number | null, string, boolean][] = [
    ['전월입교자', c.q.qNew, '#e0922e', false], ['종강율', c.q.qGrad, '#7c3aed', false],
    ['초중고출석', c.q.qCAtt, '#2f80ed', false], ['전성도출석', c.q.qAtt, '#16a34a', false],
    ['관리불가결석', c.q.qUnabs, '#dc2626', true],
  ];
  return (
    <div className="board" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="board-h">
        <span className="dot" style={{ background: c.color }} /><b>{c.name}</b>
        {c.q.lowSample && <span title={`전월입교자 ${c.q.sampleN}명 — 표본 적어 판단 보류`} style={{ background: '#fbf3e2', color: '#b5811f', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 8, marginLeft: 6 }}>표본 {c.q.sampleN}명</span>}
        <span style={{ color: '#8aa0c4', fontSize: 11, marginLeft: 'auto' }}>{c.jipa}</span>
      </div>
      {ms.map(([l, v, col, inv]) => {
        const has = v != null;
        const w = has ? Math.max(0, Math.min(100, (v as number) * 100)) : 0;
        const bg = has ? (inv ? ((v as number) > 0.08 ? '#e11d48' : '#dc2626') : ((l === '전월입교자' && (v as number) < 0.95) ? '#e11d48' : col)) : '#d3dae6';
        return (
          <div className="bmini" key={l}>
            <span className="bml">{l}</span>
            <span className="bmt"><span style={{ width: `${w.toFixed(0)}%`, background: bg }} /></span>
            <span className="bmv" style={{ color: has ? '#16224a' : '#aaa' }}>{has ? pct(v) : '-'}</span>
          </div>
        );
      })}
    </div>
  );
};

const InspFold: React.FC<{ title: string; count: number; cls: string; children: React.ReactNode }> = ({ title, count, cls, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className={`warncard ${cls}`}>
      <h3 style={{ cursor: 'pointer', userSelect: 'none', margin: 0 }} onClick={() => setOpen((v) => !v)}>
        <span style={{ display: 'inline-block', width: 15, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>{title} — {count}곳
      </h3>
      {open && <div>{children}</div>}
    </div>
  );
};

/** 점검(양·질) 화면. Ported 1:1 from renderInspect(). */
export const InspectPage: React.FC = () => {
  const { month, gubun } = useDiagnosisData();
  const { records, jipaColors } = useDiagnosisData();
  const [axX, setAxX] = useState<AxisDef>(AX_A[0]);
  const [axY, setAxY] = useState<AxisDef>(AX_Q[0]);
  const [target, setTarget] = useState<DetailTarget | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; c: ScoredChurch } | null>(null);

  if (!month) return null;
  const all: ScoredChurch[] = buildChurchScores(records, month, jipaColors, gubun).map((c) => ({ ...c, xv: axX.fn(c), yv: axY.fn(c) }));
  const ok = (c: ScoredChurch) => c.xv != null && !isNaN(c.xv) && c.yv != null && !isNaN(c.yv);
  const scored = all.filter(ok), noData = all.filter((c) => !ok(c));
  const medA = median(scored.map((c) => c.xv as number)) || 0, medQ = median(scored.map((c) => c.yv as number)) || 0;
  scored.forEach((c) => {
    const lowQ = (c.yv as number) < medQ, highA = (c.xv as number) >= medA;
    c.quad = lowQ ? (highA ? '기준점검' : '저조교회') : (highA ? '우수' : '분석피드백');
  });
  const std = scored.filter((c) => c.quad === '기준점검' && !c.q.lowSample).sort((a, b) => (a.yv as number) - (b.yv as number));
  const low = scored.filter((c) => c.quad === '저조교회' && !c.q.lowSample).sort((a, b) => (a.yv as number) - (b.yv as number));
  const best = scored.filter((c) => c.quad === '우수' && !c.q.lowSample).sort((a, b) => (b.yv as number) - (a.yv as number));
  const lowSamp = scored.filter((c) => c.q.lowSample).sort((a, b) => a.q.sampleN - b.q.sampleN);
  const fb = scored.filter((c) => c.quad === '분석피드백' && !c.q.lowSample).sort((a, b) => (b.yv as number) - (a.yv as number));
  const sub95 = scored.filter((c) => c.q.qNew != null && c.q.qNew < 0.95 && c.agg.prevNewAdmitCnt > 0).sort((a, b) => (a.q.qNew as number) - (b.q.qNew as number));

  const W = 940, H = 640, PL = 60, PR = 30, PT = 34, PB = 58, plotW = W - PL - PR, plotH = H - PT - PB;
  const xMax = axMaxOf(axX.t, scored.map((c) => c.xv as number)), yMax = axMaxOf(axY.t, scored.map((c) => c.yv as number));
  const X = (v: number) => PL + (v / xMax) * plotW, Y = (v: number) => PT + plotH - (v / yMax) * plotH;
  const xm = X(medA), ym = Y(medQ);

  const openChurch = (name: string) => setTarget({ name, kind: 'entity' });

  return (
    <div className="insp-wrap">
      {sub95.length ? (
        <div className="card">
          <h3>⚠️ 전월입교자 예배출석률 95% 미만 — {sub95.length}곳</h3>
          <div style={{ marginTop: 10 }}>
            {sub95.map((c) => {
              const r = c.q.qNew, w = Math.max(2, Math.min(100, (r || 0) * 100));
              return (
                <div key={c.name} className="brow" style={{ gridTemplateColumns: 'minmax(70px,160px) minmax(40px,1fr) minmax(70px,122px)', marginBottom: 6, cursor: 'pointer' }} onClick={() => openChurch(c.name)}>
                  <div className="bname"><span className="dot" style={{ background: c.color }} />{c.name}</div>
                  <div className="btrack"><div className="bfill" style={{ width: `${w.toFixed(1)}%`, background: '#e11d48' }} /></div>
                  <div className="bval" style={{ color: '#e11d48' }}>{pct(r)}<span style={{ display: 'block', fontSize: 10, color: '#8aa0c4', fontWeight: 600 }}>출석 {fmt(c.agg.newAttTotal)}/{fmt(c.agg.prevNewAdmitCnt)}명</span></div>
                </div>
              );
            })}
          </div>
        </div>
      ) : <div className="card"><h3 style={{ color: '#16a34a' }}>✅ 전월입교자 예배출석률 95% 미만 교회 없음</h3></div>}

      {lowSamp.length > 0 && (
        <InspFold title="🔍 표본 부족 (판단 보류)" count={lowSamp.length} cls="amber">
          <div className="desc">전월입교자 <b>5명 미만</b> — 예배출석률이 실력인지 우연인지 판단 어려워 우수/저조 등급 판정에서 보류(표본 쌓이면 재평가). 각 교회 뱃지=그 달 표본</div>
          <div className="board-grid">{lowSamp.map((c) => <InspBoard c={c} key={c.name} onClick={() => openChurch(c.name)} />)}</div>
        </InspFold>
      )}
      <InspFold title="📋 기준점검(거품)" count={std.length} cls="red">
        {std.length ? <div className="board-grid">{std.map((c) => <InspBoard c={c} key={c.name} onClick={() => openChurch(c.name)} />)}</div> : <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>해당 없음</div>}
      </InspFold>
      <InspFold title="👥 저조교회" count={low.length} cls="amber">
        {low.length ? <div className="board-grid">{low.map((c) => <InspBoard c={c} key={c.name} onClick={() => openChurch(c.name)} />)}</div> : <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>해당 없음</div>}
      </InspFold>
      <InspFold title="🏆 우수 교회" count={best.length} cls="green">
        {best.length ? <div className="board-grid">{best.map((c) => <InspBoard c={c} key={c.name} onClick={() => openChurch(c.name)} />)}</div> : <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>해당 없음</div>}
      </InspFold>
      <InspFold title="🔍 분석·피드백" count={fb.length} cls="blue">
        {fb.length ? <div className="board-grid">{fb.map((c) => <InspBoard c={c} key={c.name} onClick={() => openChurch(c.name)} />)}</div> : <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>해당 없음</div>}
      </InspFold>

      <div className="card">
        <h3>🧭 점검 매트릭스 ({scored.length}곳)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>📐 세로축(질)</span>
          <select value={axY.k} onChange={(e) => setAxY(AX_Q.find((m) => m.k === e.target.value) || AX_Q[0])}>
            {AX_Q.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
          </select>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginLeft: 6 }}>📊 가로축(양)</span>
          <select value={axX.k} onChange={(e) => setAxX(AX_A.find((m) => m.k === e.target.value) || AX_A[0])}>
            {AX_A.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
          </select>
        </div>
        <div style={{ overflow: 'auto', maxHeight: 780, borderRadius: 10, border: '1px solid var(--line)', position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}>
            <rect x={xm} y={PT} width={PL + plotW - xm} height={ym - PT} fill="#2ecc71" fillOpacity={0.06} />
            <rect x={PL} y={PT} width={xm - PL} height={ym - PT} fill="#00a0e9" fillOpacity={0.06} />
            <rect x={xm} y={ym} width={PL + plotW - xm} height={PT + plotH - ym} fill="#e74c3c" fillOpacity={0.15} />
            <rect x={PL} y={ym} width={xm - PL} height={PT + plotH - ym} fill="#f1c40f" fillOpacity={0.13} />
            {[0, 1, 2, 3, 4].map((k) => {
              const gx = PL + plotW * k / 4, gy = PT + plotH * k / 4;
              return (
                <React.Fragment key={k}>
                  <line x1={gx} y1={PT} x2={gx} y2={PT + plotH} stroke="rgba(255,255,255,.05)" />
                  <line x1={PL} y1={gy} x2={PL + plotW} y2={gy} stroke="rgba(255,255,255,.05)" />
                  <text x={gx} y={PT + plotH + 16} fontSize={9} fill="#6b7a90" textAnchor="middle">{axGrid(xMax * k / 4, axX.t)}</text>
                  <text x={PL - 8} y={PT + plotH - plotH * k / 4 + 3} fontSize={9} fill="#6b7a90" textAnchor="end">{axGrid(yMax * k / 4, axY.t)}</text>
                </React.Fragment>
              );
            })}
            <line x1={xm} y1={PT} x2={xm} y2={PT + plotH} stroke="#8aa0c4" strokeDasharray="4 3" strokeOpacity={0.55} />
            <line x1={PL} y1={ym} x2={PL + plotW} y2={ym} stroke="#8aa0c4" strokeDasharray="4 3" strokeOpacity={0.55} />
            <text x={PL + plotW - 8} y={PT + 16} fontSize={14} fontWeight={800} fill="#2ecc71" textAnchor="end">🏆 우수사례 공유</text>
            <text x={PL + 8} y={PT + 16} fontSize={14} fontWeight={800} fill="#5fb0e8">🔍 분석·피드백</text>
            <text x={PL + plotW - 8} y={PT + plotH - 10} fontSize={14} fontWeight={800} fill="#ff6b6b" textAnchor="end">📋 기준점검(거품)</text>
            <text x={PL + 8} y={PT + plotH - 10} fontSize={14} fontWeight={800} fill="#f1c40f">👥 저조교회</text>
            <text x={PL + plotW / 2} y={H - 8} fontSize={12} fill="#8aa0c4" textAnchor="middle">{axX.l} (낮음 → 높음)</text>
            <text x={16} y={PT + plotH / 2} fontSize={12} fill="#8aa0c4" textAnchor="middle" transform={`rotate(-90 16 ${(PT + plotH / 2).toFixed(1)})`}>{axY.l} (낮음 → 높음)</text>
            {scored.map((c) => {
              const x = X(c.xv as number), y = Y(c.yv as number);
              const imp = (c.quad === '기준점검' || c.quad === '저조교회');
              const r = imp ? 6.5 : 5;
              return (
                <circle
                  key={c.name} cx={x} cy={y} r={r} fill={c.color} fillOpacity={imp ? 0.95 : 0.62}
                  stroke={imp ? '#fff' : '#0b1424'} strokeWidth={imp ? 1.4 : 0.6} style={{ cursor: 'pointer' }}
                  onClick={() => openChurch(c.name)}
                  onMouseMove={(e) => setTip({ x: e.clientX + 16, y: e.clientY + 16, c })}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
          </svg>
          {tip && (
            <div className="sctip" style={{ display: 'block', position: 'fixed', left: tip.x, top: tip.y }}>
              <b>{tip.c.name}</b> <span style={{ color: '#8aa0c4' }}>{tip.c.jipa}</span><br />
              <span style={{ color: '#8aa0c4' }}>{axY.l}</span> <b style={{ color: '#2ecc71' }}>{axFmt(tip.c.yv, axY.t)}</b><br />
              <span style={{ color: '#8aa0c4' }}>{axX.l}</span> <b style={{ color: '#5fa8ff' }}>{axFmt(tip.c.xv, axX.t)}</b><br />
              <span style={{ color: '#8aa0c4' }}>전월입교자 출석률</span> {pct(tip.c.q.qNew)}
            </div>
          )}
        </div>
      </div>

      {noData.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          ※ 데이터 부족으로 점수 산출 제외: {noData.length}곳 ({noData.map((c) => c.name).slice(0, 12).join(', ')}{noData.length > 12 ? ' 외' : ''})
        </div>
      )}

      <EntityDetailModal target={target} gubun={gubun} onClose={() => setTarget(null)} />
    </div>
  );
};
