import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { useMetricColumnConfig } from '../../../contexts/MetricColumnConfigContext';
import { resolveCustomColumns } from '../../../utils/metricColumnEval';
import {
  buildRows, recordsFor, aggregate, metricVal, fmtVal, rate, fmt, pct, MetricDef, AggregateResult,
  getMonthNumFromStr,
} from '../../../utils/diagnosisMetrics';
import { P1ChartDashboard } from '../P1ChartDashboard';
import { EntityDetailModal, DetailTarget } from './EntityDetailPanel';
import { GubunChips } from './GubunChips';
import { ProcessKpiCards } from './ProcessKpiCards';
import { SectionMonthPicker } from './SectionMonthPicker';

/** 재적 예측(내무 카테고리 하단). Ported 1:1 from forecastCardHTML(). */
const ForecastCard: React.FC = () => {
  const { records, months } = useDiagnosisData();
  const fmA = months.map((m) => aggregate(recordsFor(records, m, '전체')).registered);
  const fmAd = months.map((m) => aggregate(recordsFor(records, m, '전체')).newAdmit);
  const L = months.length;
  if (L < 2) return null;
  const avgAd = Math.round(fmAd.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, L));
  const curLU = aggregate(recordsFor(records, months[L - 1], '전체')).absLongUnmanage;
  const smallDisc = 150, base = fmA[L - 1], lastNum = getMonthNumFromStr(months[L - 1]) || L;
  const fNums = [lastNum + 1, lastNum + 2, lastNum + 3], fLab = fNums.map((n) => n + '월');
  const qmLab = fLab[fNums.findIndex((n) => n % 3 === 0)];
  let prev = base;
  const fVals = fNums.map((n) => { const d = (n % 3 === 0) ? curLU : smallDisc; prev = Math.round(prev + avgAd - d); return prev; });
  const labels = months.concat(fLab);
  const act: (number | null)[] = fmA.concat([null, null, null]);
  const fore: (number | null)[] = months.map(() => null); fore[L - 1] = base; fVals.forEach((v) => fore.push(v));
  const all = act.concat(fore).filter((v): v is number => v != null);
  const mn = Math.min(...all), mx = Math.max(...all);
  const lo = mn - (mx - mn) * 0.18 || mn * 0.98, hi = mx + (mx - mn) * 0.18 || mx * 1.02;
  const W = 940, H = 250, PL = 64, PR = 18, PT = 16, PB = 42, pw = W - PL - PR, ph = H - PT - PB, N = labels.length;
  const X = (i: number) => PL + pw * i / (N - 1), Y = (v: number) => PT + ph - ((v - lo) / (hi - lo || 1)) * ph;
  const fx0 = X(L - 1);
  let ad = '', fd = '';
  act.forEach((v, i) => { if (v == null) return; ad += (ad ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
  fore.forEach((v, i) => { if (v == null) return; fd += (fd ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
  const badges = fLab.map((l, j) => { const d = fVals[j] - (j ? fVals[j - 1] : base); return { l, d, v: fVals[j] }; });

  return (
    <div className="card" style={{ gridColumn: '1/-1' }}>
      <h3>🔮 현재적 예측 (추정) — 향후 3개월</h3>
      <div className="desc"><span style={{ color: '#2563eb', fontWeight: 800 }}>파랑=실제</span> · <span style={{ color: '#e0922e', fontWeight: 800 }}>주황 점선=추정</span>. 가정: 최근 입교 <b>{fmt(avgAd)}명/월</b> 유입 지속 · 일반월 사고 소액 · <b>분기말({qmLab}) 사고 ≈ 현재 관리불가 장기결석 {fmt(curLU)}명</b>(리더 예측규칙). 근사치입니다.</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <rect x={fx0} y={PT} width={W - PR - fx0} height={ph} fill="#fff6ee" />
        {[0, 1, 2, 3].map((k) => {
          const gy = PT + ph * k / 3, val = hi - (hi - lo) * k / 3;
          return <React.Fragment key={k}><line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#e3eaf5" /><text x={PL - 7} y={gy + 3} fontSize={10.5} fill="#8aa0c4" textAnchor="end">{fmt(Math.round(val))}</text></React.Fragment>;
        })}
        <path d={ad} fill="none" stroke="#2563eb" strokeWidth={2.6} />
        <path d={fd} fill="none" stroke="#e0922e" strokeWidth={2.6} strokeDasharray="6 4" />
        {act.map((v, i) => v != null && <circle key={'a' + i} cx={X(i)} cy={Y(v)} r={3} fill="#fff" stroke="#2563eb" strokeWidth={1.8}><title>{labels[i]}: {fmt(v)}명</title></circle>)}
        {fVals.map((v, j) => <circle key={'f' + j} cx={X(L + j)} cy={Y(v)} r={3.4} fill="#e0922e"><title>{labels[L + j]}(추정): {fmt(v)}명</title></circle>)}
        {labels.map((l, i) => <text key={l} x={X(i)} y={H - 18} fontSize={10.5} fill={i >= L ? '#e0922e' : '#6b7a99'} textAnchor="middle">{l}{i >= L ? '*' : ''}</text>)}
      </svg>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8, fontSize: 13 }}>
        {badges.map((b) => (
          <div key={b.l}><b style={{ color: '#e0922e' }}>{b.l}</b> 추정 <b>{fmt(b.v)}명</b> <span style={{ color: b.d >= 0 ? '#2f9e6e' : '#e11d48', fontWeight: 800 }}>{b.d >= 0 ? '▲ +' : '▼ '}{fmt(Math.abs(b.d))}</span></div>
        ))}
      </div>
    </div>
  );
};

/** 결석·사고 위험 표(예배·결석 카테고리 하단). Ported 1:1 from riskCardHTML(). */
const RiskCard: React.FC<{ onOpen: (name: string) => void }> = ({ onOpen }) => {
  const { records, month, gubun, jipaColors } = useDiagnosisData();
  const recs = recordsFor(records, month, gubun);
  const rrows = recs.map((r) => {
    const a = aggregate([r]);
    return { name: r.name, jipa: r.jipa, color: jipaColors[r.jipa] || '#888', disc: a.discipline, lu: a.absLongUnmanage, lm: a.absLongManage, once: a.absOnce, absR: rate(a.attTotal ? a.absTotal : a.absTotal, a.attReg) };
  }).filter((x) => x.lu > 0 || x.lm > 0 || x.disc > 0).sort((a, b) => b.lu - a.lu || b.disc - a.disc).slice(0, 15);
  const totDisc = recs.reduce((s, r) => s + (+r.discipline || 0), 0);
  const totLU = recs.reduce((s, r) => s + (+r.absLongUnmanage || 0), 0);
  const totLM = recs.reduce((s, r) => s + (+r.absLongManage || 0), 0);
  const maxLU = Math.max(1, ...rrows.map((x) => x.lu));

  return (
    <div className="card" style={{ gridColumn: '1/-1' }}>
      <h3>⚠️ 결석·사고 위험 점검 — 관리불가 장기결석 → 다음 분기 사고 예측</h3>
      <div className="desc">{month} · 구분 {gubun} · 사고는 분기(3·6·9·12월) 산출 · <b style={{ color: '#e11d48' }}>관리불가 장기결석</b>이 높은 곳이 다음 사고 위험 · 전체 사고 <b>{fmt(totDisc)}</b> · 관리불가 <b style={{ color: '#e11d48' }}>{fmt(totLU)}</b> · 관리가능 <b style={{ color: '#e0922e' }}>{fmt(totLM)}</b> · 상위 15곳</div>
      <div className="tblwrap" style={{ maxHeight: 440 }}>
        <table>
          <thead><tr><th style={{ textAlign: 'left' }}>교회</th><th>사고(당월)</th><th>장기결석<br />관리불가</th><th>관리가능</th><th>일회성</th><th>결석율</th></tr></thead>
          <tbody>
            {rrows.length ? rrows.map((x) => (
              <tr key={x.name} className="clk" onClick={() => onOpen(x.name)}>
                <td className="name"><span className="dot" style={{ background: x.color }} />{x.name}<div style={{ fontSize: 11, color: 'var(--muted)' }}>{x.jipa}</div></td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: x.disc > 0 ? '#e1503e' : 'var(--muted)' }}>{fmt(x.disc)}</td>
                <td style={{ whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', height: 11, borderRadius: 4, background: '#e11d48', width: Math.round(x.lu / maxLU * 80), minWidth: 2, verticalAlign: 'middle' }} /> <b>{fmt(x.lu)}</b></td>
                <td style={{ textAlign: 'right', color: '#e0922e' }}>{fmt(x.lm)}</td>
                <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt(x.once)}</td>
                <td style={{ textAlign: 'right' }}>{x.absR == null ? '-' : pct(x.absR)}</td>
              </tr>
            )) : <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>해당 데이터 없음</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SEC_INFO: Record<string, [string, string]> = {
  p1: ['① 전도 · 가개강', '찾기 → 복음방 → 가개강'],
  p2: ['② 센터 (개강·출석·종강)', '센터등록 → 초·중·고 출석 → 종강'],
  p4: ['④ 예배 (출석)', '전월 입교자 · 전 성도 예배 출석 — 질의 최종 증거'],
};
const CAT_HEAD: Record<string, string> = { '④예배·결석': '④ 예배 (결석)' };
const CAT_SUB: Record<string, string> = { '④예배·전월입교자': '예배 출석 · 전월 입교자', '④예배·전성도': '예배 출석 · 전 성도', '④예배·결석': '' };

interface ProcessCategoryPageProps {
  /** 이 화면이 다루는 카테고리 목록(탭으로 전환). /center=["②센터"], /worship=예배 3종 */
  categories: string[];
  /** 상단 KPI 카드/헤더 문구 선택 키. p1=전도, p2=센터, p4=예배 */
  sectionKey: 'p1' | 'p2' | 'p4';
}

/** 신앙 프로세스 카테고리(전도/센터/예배) 대시보드. Ported 1:1 from renderP1() + renderKPI()/buildUI()의 구분칩. */
export const ProcessCategoryPage: React.FC<ProcessCategoryPageProps> = ({ categories, sectionKey }) => {
  const { records, months, month, gubun, jipaOrder, jipaColors, countryContMap } = useDiagnosisData();
  const { getColumnsFor, getCustomColsFor } = useMetricColumnConfig();
  const [cat, setCat] = useState(categories[0]);
  const [group, setGroup] = useState<'개별' | '지파별' | '대륙별'>('지파별');
  const [sortIdx, setSortIdx] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState(-1);
  const [target, setTarget] = useState<DetailTarget | null>(null);

  if (!month) return null;
  const catDef = getColumnsFor(cat);
  const customCols = getCustomColsFor(cat);
  const recs = recordsFor(records, month, gubun);
  const rows = buildRows(records, month, gubun, group, jipaOrder, jipaColors, countryContMap);
  const gl = cat === '①전도' && group === '개별' ? '국가명' : (group === '개별' ? (gubun === '전체' ? '대상' : gubun) : group.replace('별', ''));

  const si = sortIdx == null || sortIdx < 0 || sortIdx > catDef.length
    ? (group === '개별' ? 0 : (catDef.findIndex((m) => m.primary) >= 0 ? catDef.findIndex((m) => m.primary) + 1 : 1))
    : sortIdx;
  const effDir = sortIdx == null ? (group === '개별' ? 1 : -1) : sortDir;
  const pm = catDef[Math.max(0, si - 1)];

  // 커스텀 컬럼 중 "다른 시점(월) 값 고정"이 켜진 게 있으면, 그 시점의 같은 묶음(그룹) 집계를
  // 찾아서 넘겨준다. 페이지에서 조회 중인 월과 무관하게 항상 같은 (연,월)이므로 buildRows
  // 재호출 비용을 아끼려고 (연,월) 조합별로 이 렌더 안에서만 캐시.
  const frozenRowsCache: Record<string, ReturnType<typeof buildRows>> = {};
  const getFrozenRowsFor = (freezeYear: number, freezeMonth: number) => {
    const key = `${freezeYear}_${freezeMonth}`;
    if (!(key in frozenRowsCache)) {
      const targetMonth = `${freezeYear}년 ${freezeMonth}월`;
      frozenRowsCache[key] = buildRows(records, targetMonth, gubun, group, jipaOrder, jipaColors, countryContMap);
    }
    return frozenRowsCache[key];
  };
  const getFrozenAggForGroup = (groupName: string) => (freezeYear: number, freezeMonth: number): AggregateResult | null => {
    const match = getFrozenRowsFor(freezeYear, freezeMonth).find((r) => r.name === groupName);
    return match ? match.agg : null;
  };
  if (customCols.length) rows.forEach((g) => { (g.agg as any).__customValues = resolveCustomColumns(g.agg, customCols, getFrozenAggForGroup(g.name)); });
  const tdata = rows.map((g) => ({ g, cells: catDef.map((m) => metricVal(g.agg, m)) }));
  tdata.sort((a, b) => {
    if (si === 0) {
      if (group === '지파별') return effDir * (jipaOrder.indexOf(a.g.name) - jipaOrder.indexOf(b.g.name));
      if (group === '대륙별') return effDir * ('' + a.g.name).localeCompare('' + b.g.name, 'ko');
      const orderA = (a.g.rec as any)?.sortOrder ?? 999999, orderB = (b.g.rec as any)?.sortOrder ?? 999999;
      if (orderA !== orderB) return effDir * (orderA - orderB);
      return effDir * ('' + a.g.name).localeCompare('' + b.g.name, 'ko');
    }
    let va = a.cells[si - 1], vb = b.cells[si - 1];
    va = va == null ? -Infinity : va; vb = vb == null ? -Infinity : vb;
    return effDir * (va - vb);
  });

  const totAgg = aggregate(recs);
  if (customCols.length) {
    const getFrozenAggForTotal = (freezeYear: number, freezeMonth: number): AggregateResult | null => {
      const targetMonth = `${freezeYear}년 ${freezeMonth}월`;
      const frozenRecs = recordsFor(records, targetMonth, gubun);
      return frozenRecs.length ? aggregate(frozenRecs) : null;
    };
    (totAgg as any).__customValues = resolveCustomColumns(totAgg, customCols, getFrozenAggForTotal);
  }
  const cpm = si > 0 ? pm : (catDef.find((m) => m.primary) || catDef[0]);

  const onSortClick = (i: number) => { if (sortIdx === i) setSortDir((d) => d * -1); else { setSortIdx(i); setSortDir(i === 0 ? 1 : -1); } };
  const cols: { l: string; name?: boolean; m?: MetricDef }[] = [{ l: gl, name: true }, ...catDef.map((m) => ({ l: m.l, m }))];

  const head = CAT_HEAD[cat] ?? SEC_INFO[sectionKey][0];
  const sub = CAT_SUB[cat] ?? SEC_INFO[sectionKey][1];

  return (
    <div>
      <GubunChips />
      <ProcessKpiCards variant={sectionKey === 'p1' ? 'p1' : 'generic'} />

      {categories.length > 1 && (
        <div className="chips" style={{ marginBottom: 12 }}>
          {categories.map((cc) => <div key={cc} className={`chip ${cat === cc ? 'on' : ''}`} onClick={() => { setCat(cc); setSortIdx(null); }}>{cc.replace('④예배·', '')}</div>)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>묶어보기</span>
        <div className="chips" style={{ margin: 0 }}>
          {(['개별', '지파별', '대륙별'] as const).map((g) => <div key={g} className={`chip ${group === g ? 'on' : ''}`} onClick={() => { setGroup(g); setSortIdx(null); }}>{g}</div>)}
        </div>
        <SectionMonthPicker />
      </div>
      {head && (
        <div>
          <div className="sechead">{head}</div>
          {sub && <div className="secsub">{sub}</div>}
        </div>
      )}

      <div className="homerow" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: '1/-1', minWidth: 0 }}>
          <h3>상세표 <span style={{ fontSize: 12, fontWeight: 600, color: '#8aa0c4' }}>· 열 제목(항목)을 클릭하면 아래 차트가 그 항목 기준으로 바뀝니다 · 현재 <b style={{ color: '#2563eb' }}>{si > 0 ? pm?.l : '이름'}</b></span></h3>
          <div className="tblwrap" style={{ maxHeight: 420 }}>
            <table>
              <thead>
                <tr>
                  {cols.map((cl, i) => (
                    <th key={i} onClick={() => onSortClick(i)} style={{ cursor: 'pointer', minWidth: cl.name ? undefined : 92, whiteSpace: cl.name ? undefined : 'normal', verticalAlign: cl.name ? undefined : 'bottom' }}>
                      {cl.l}{i === si ? (effDir < 0 ? ' ▼' : ' ▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tdata.map((d, ri) => (
                  <tr key={ri} className="clk" onClick={() => setTarget({ name: d.g.name, kind: d.g.kind === 'entity' ? 'entity' : (d.g.kind === 'jipa' ? 'jipa' : 'continent') })}>
                    <td className="name">
                      <span className="dot" style={{ background: d.g.color }} />{d.g.name}
                      {d.g.kind === 'entity' && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.g.jipa} · {d.g.continent || '-'}</div>}
                    </td>
                    {catDef.map((m, j) => <td key={j} style={j === si - 1 ? { background: '#eef4ff', fontWeight: 800 } : undefined}>{fmtVal(d.cells[j], m)}</td>)}
                  </tr>
                ))}
                <tr style={{ position: 'sticky', bottom: 0, background: '#e9eef7', fontWeight: 800, borderTop: '2px solid #b9c8e2' }}>
                  <td className="name">{tdata.length}{gl} 계</td>
                  {catDef.map((m, j) => <td key={j} style={j === si - 1 ? { background: '#d5e2fb' } : undefined}>{fmtVal(metricVal(totAgg, m), m)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {cat === '③내무' && <ForecastCard />}
        {cat === '④예배·결석' && <RiskCard onOpen={(name) => setTarget({ name, kind: 'entity' })} />}
        <div style={{ gridColumn: '1/-1' }}><P1ChartDashboard /></div>
      </div>

      <EntityDetailModal target={target} gubun={gubun} onClose={() => setTarget(null)} />
    </div>
  );
};
