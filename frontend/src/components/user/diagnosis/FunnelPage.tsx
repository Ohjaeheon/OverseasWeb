import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { computeFunnel, classifyFunnel, FunnelChurch, aggregate, recordsFor, rate, fmt, pct } from '../../../utils/diagnosisMetrics';
import { CONT_COLORS } from '../../../utils/diagnosisI18n';
import { EntityDetailModal, DetailTarget } from './EntityDetailPanel';

const CONT_ORDER = ['아시아', '유럽', '아프리카', '북아메리카', '중앙아메리카', '남아메리카', '오세아니아', '미분류'];

/** 교회별 관문 신호판 카드 1개(7관문 미니바). Ported 1:1 from funnelBoard(). */
const FunnelBoard: React.FC<{ c: FunnelChurch; rank: number; onClick: () => void }> = ({ c, rank, onClick }) => {
  const a = c.agg;
  const G: [string, number | null, [number, number] | null][] = [
    ['가개강등록', rate(a.bibleCumReg, a.evangReg), null],
    ['센터등록율', rate(a.centerCumReg, a.evangReg), null],
    ['센터출석율', rate((a.catE || 0) + (a.catM || 0) + (a.catH || 0), (a.ctwkE || 0) + (a.ctwkM || 0) + (a.ctwkH || 0)), [.5, .7]],
    ['종강율', rate(a.centerCumGrad, a.centerTotCumReg), null],
    ['입교율', rate(a.cumNewAdmit, a.retroReg), null],
    ['입교자출석', rate((a as any).newAttTotal, a.prevNewAdmitCnt), [.9, .95]],
    ['전성도출석', rate(a.attTotal, a.attReg), [.65, .8]],
  ];
  return (
    <div className="board" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="board-h">
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 19, height: 19, padding: '0 4px', borderRadius: 6, background: '#eef2f9', color: '#5b6b8a', fontSize: 11, fontWeight: 800, marginRight: 3 }}>{rank}</span>
        <span className="dot" style={{ background: c.color }} /><b>{c.name}</b>
        <span style={{ color: '#8aa0c4', fontSize: 11, marginLeft: 'auto' }}>{c.jipa}</span>
      </div>
      {G.map(([l, v, band]) => {
        const has = v != null && !isNaN(v);
        const w = has ? Math.max(0, Math.min(100, (v as number) * 100)) : 0;
        const col = (!band || !has) ? '#8aa0c4' : ((v as number) >= band[1] ? '#2f9e6e' : ((v as number) >= band[0] ? '#e0922e' : '#e11d48'));
        return (
          <div className="bmini" key={l}>
            <span className="bml">{l}</span>
            <span className="bmt"><span style={{ width: `${w.toFixed(0)}%`, background: has ? col : '#d3dae6' }} /></span>
            <span className="bmv" style={{ color: has ? '#16224a' : '#aaa' }}>{has ? pct(v) : '-'}</span>
          </div>
        );
      })}
    </div>
  );
};

/** 관문별 통과율(퍼널) 화면. Ported 1:1 from renderFunnel() — 신호등 스트립 + 대륙별 접이식 카드만
 * 실제로 렌더링되는 부분(표/칩 목록은 원본에서도 계산만 되고 미사용이라 이식하지 않음). */
export const FunnelPage: React.FC = () => {
  const { records, months, month, gubun, countryContMap } = useDiagnosisData();
  const [openConts, setOpenConts] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<DetailTarget | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  if (!month) return null;
  const churches = computeFunnel(records, month, months, countryContMap);
  const A = classifyFunnel(churches);
  const nod = churches.filter((c) => c.cls === '자료부족');

  const AF = aggregate(recordsFor(records, month, '전체').filter((r) => r.gubun === '교회'));
  const gates: { n: string; v: number | null; q: boolean; band?: [number, number]; num: number | null; }[] = [
    { n: '가개강 등록율', v: rate(AF.bibleCumReg, AF.evangReg), q: false, num: AF.bibleCumReg },
    { n: '센터 등록율', v: rate(AF.centerCumReg, AF.evangReg), q: false, num: AF.centerCumReg },
    { n: '센터 출석율', v: rate(AF.catE + AF.catM + AF.catH, AF.ctwkE + AF.ctwkM + AF.ctwkH), q: true, band: [.5, .7], num: AF.catE + AF.catM + AF.catH },
    { n: '종강율(누적)', v: rate(AF.centerCumGrad, AF.centerTotCumReg), q: false, num: AF.centerCumGrad },
    { n: '입교율(누적)', v: rate(AF.cumNewAdmit, AF.retroReg), q: false, num: AF.cumNewAdmit },
    { n: '전월입교자 출석율', v: rate((AF as any).newAttTotal, AF.prevNewAdmitCnt), q: true, band: [.9, .95], num: (AF as any).newAttTotal },
    { n: '전성도 출석율', v: rate(AF.attTotal, AF.attReg), q: true, band: [.65, .8], num: AF.attTotal },
  ];
  const glight = (g: typeof gates[number]) => { if (!g.q || g.v == null || !g.band) return '#8aa0c4'; return g.v >= g.band[1] ? '#2f9e6e' : (g.v >= g.band[0] ? '#e0922e' : '#e11d48'); };

  const boardChurches = churches.filter((c) => c.cls !== '자료부족').sort((a, b) => ((a.t.t4 == null ? 9 : a.t.t4) - (b.t.t4 == null ? 9 : b.t.t4)));
  const byCont: Record<string, FunnelChurch[]> = {};
  boardChurches.forEach((c) => { const k = c.continent || '미분류'; (byCont[k] = byCont[k] || []).push(c); });
  const contKeys = CONT_ORDER.filter((k) => byCont[k]).concat(Object.keys(byCont).filter((k) => !CONT_ORDER.includes(k)));
  const funMetric = (c: FunnelChurch) => { const v = rate((c.agg as any).newAttTotal, c.agg.prevNewAdmitCnt); return (v == null || isNaN(v)) ? -1 : v; };

  const toggleCont = (k: string) => setOpenConts((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const openChurch = (name: string) => setTarget({ name, kind: 'entity' });

  return (
    <div>
      <div className="card">
        <h3>🚦 파이프라인 관문 신호등 — 전체 통과율 ({month} · 교회)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 6, marginTop: 12 }}>
          {gates.map((g, i) => {
            const col = glight(g);
            return (
              <React.Fragment key={g.n}>
                {i > 0 && <div style={{ display: 'flex', alignItems: 'center', color: '#c3cee0', fontWeight: 800, fontSize: 17 }}>→</div>}
                <div style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '11px 7px', border: '1px solid var(--line)', borderRadius: 12, background: '#fbfcfe' }}>
                  <div style={{ fontSize: 11, color: '#5b6b8a', fontWeight: 700, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.25 }}>{g.n}{!g.q && <span style={{ color: '#9fb0cc' }}> *</span>}</div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: g.q ? col : '#1f2f52', letterSpacing: -0.5 }}>{g.v == null ? '-' : pct(g.v)}</div>
                  <div style={{ fontSize: 11, color: '#8a99b5', fontWeight: 700, marginTop: 2 }}>{g.num == null ? '' : fmt(g.num) + '명'}</div>
                  <div style={{ height: 5, borderRadius: 3, background: col, marginTop: 7 }} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <details style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 11 }} open={helpOpen} onToggle={(e) => setHelpOpen((e.target as HTMLDetailsElement).open)}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#5b6b8a', fontWeight: 700, userSelect: 'none' }}>ⓘ 이 신호등을 어떻게 읽나요? — 자세한 설명 (클릭하여 펼치기)</summary>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.75, marginTop: 11 }}>
            <p style={{ margin: '0 0 9px' }}><b style={{ color: '#41506f' }}>'전환율'이 아니라 '관문별 통과율'입니다.</b> 각 관문을 <b>자기 고유의 분모</b>로 따로 계산해 나란히 늘어놓았습니다 — 시차가 있는 단계를 사슬처럼 이어붙이면 값이 왜곡되기 때문입니다.</p>
            <p style={{ margin: '0 0 9px' }}><b style={{ color: '#41506f' }}>신호등 색</b>은 질(質) 관문 3개(센터출석·전월입교자·전성도)에만 붙습니다. 양(量) 관문은 회색(*)으로 규모 참고용입니다.</p>
          </div>
        </details>
      </div>

      <div className="card">
        <h3>📋 교회별 관문 신호판 — {boardChurches.length}곳</h3>
        {contKeys.map((cont) => {
          const list = byCont[cont].slice().sort((a, b) => funMetric(b) - funMetric(a));
          const open = openConts.has(cont);
          return (
            <div style={{ marginTop: 26 }} key={cont}>
              <div
                onClick={() => toggleCont(cont)}
                style={{ cursor: 'pointer', userSelect: 'none', fontSize: 14, fontWeight: 800, color: 'var(--navy)', display: 'inline-flex', alignItems: 'center', gap: 7, paddingBottom: 6, borderBottom: `2.5px solid ${CONT_COLORS[cont] || '#ccc'}`, marginBottom: 11 }}
              >
                <span style={{ width: 14, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: CONT_COLORS[cont] || '#888', display: 'inline-block' }} />
                {cont} <span style={{ fontSize: 12, fontWeight: 600, color: '#8aa0c4' }}>{byCont[cont].length}곳</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#aab6cc', marginLeft: 6 }}>· 전월입교자 출석율 순</span>
              </div>
              {open && <div className="board-grid" style={{ marginTop: 0 }}>{list.map((c, i) => <FunnelBoard c={c} rank={i + 1} key={c.name} onClick={() => openChurch(c.name)} />)}</div>}
            </div>
          );
        })}
      </div>

      {nod.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)', fontWeight: 700, userSelect: 'none' }}>※ 자료부족 제외: {nod.length}곳 — 왜 제외됐나요? (클릭하여 펼치기)</summary>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75, marginTop: 9, padding: '11px 13px', background: '#f7f9fc', borderRadius: 10 }}>
            <b style={{ color: '#41506f' }}>제외된 교회:</b> {nod.map((c) => c.name + ' (' + c.jipa + ')').join(' · ')}
            <br /><br />
            이 교회들은 <b>센터 중·고 등록 · 종강 · 전월입교자가 모두 0</b>이라 관문 통과율을 낼 수가 없어 자동으로 제외됩니다. <b style={{ color: '#41506f' }}>센터 교육이 아직 시작되지 않은 초기 상태</b>일 수 있습니다.
          </div>
        </details>
      )}

      <EntityDetailModal target={target} gubun={gubun} onClose={() => setTarget(null)} />
    </div>
  );
};
