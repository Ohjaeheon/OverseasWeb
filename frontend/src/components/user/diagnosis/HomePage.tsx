import React from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { aggregate, recordsFor, contOf, rate, fmt, pct } from '../../../utils/diagnosisMetrics';
import { DonutChart } from '../../charts/DonutChart';
import { LineChart } from '../../charts/LineChart';
import { HBarChart } from '../../charts/HBarChart';

const CONT6_MERGE: Record<string, string> = { "중앙아메리카": "북아메리카" };
const CONT6_COLOR: Record<string, string> = { "아시아": "#E8871E", "유럽": "#F5C518", "아프리카": "#6D28D9", "북아메리카": "#2FA84F", "남아메리카": "#E0447B", "오세아니아": "#0EA5C4" };

/** 홈(종합 현황) 화면. Ported 1:1 from renderHome(). */
export const HomePage: React.FC = () => {
  const { records, months, month, jipaOrder, jipaColors, countryContMap } = useDiagnosisData();
  if (!month) return null;

  const recsAll = recordsFor(records, month, '전체');
  const ch = recsAll.filter((r) => r.gubun === '교회');
  const reg = recsAll.filter((r) => r.gubun === '지역').length;
  const pio = recsAll.filter((r) => r.gubun === '개척지').length;
  const A = aggregate(recsAll);
  const newAtt = rate(A.newAttTotal, A.prevNewAdmitCnt), grad = rate(A.centerCumGrad, A.centerTotCumReg);
  const regDiff = A.registered - A.prevReg, regRate = rate(regDiff, A.retroReg), admitRate = rate(A.newAdmit, A.retroReg);

  const kpis = [
    { l: '대상', v: `${ch.length + reg + pio}곳`, s: `교회 ${ch.length} · 지역 ${reg} · 개척지 ${pio}`, c: 'var(--gold)', ic: '🏛️' },
    { l: '총 현재적', v: `${fmt(A.registered)}명`, s: regDiff < 0 ? `전월 대비 ▼ ${fmt(Math.abs(regDiff))} · ▼ ${pct(Math.abs(regRate || 0))}` : `전월 대비 ${regDiff >= 0 ? '+' : ''}${fmt(regDiff)} · ${pct(regRate)}`, c: '#00a0e9', ic: '👥', bad: regDiff < 0 },
    { l: '당월 입교', v: `${fmt(A.newAdmit)}명`, s: `입교율 ${pct(admitRate)}`, c: '#2ecc71', ic: '🌱' },
    { l: '전월입교자 예배출석', v: pct(newAtt), s: `실제 출석 ${fmt(A.newAttTotal)}명`, c: '#e39300', ic: '🙏' },
    { l: '센터 누적 종강', v: pct(grad), s: `누적 종강 ${fmt(A.centerCumGrad)}명`, c: '#7f1084', ic: '🎓' },
  ];

  const contMap: Record<string, number> = {};
  recsAll.forEach((r) => { const k0 = contOf(r, countryContMap); const k = CONT6_MERGE[k0] || k0; if (k === '기타' || k === '미분류') return; contMap[k] = (contMap[k] || 0) + (r.registered || 0); });
  const donutData = Object.entries(contMap).map(([k, v]) => ({ label: k, value: v, color: CONT6_COLOR[k] || '#9aa8c4' })).sort((a, b) => b.value - a.value);

  const aggByMonth = months.map((m) => aggregate(recordsFor(records, m, '전체')));
  const regTrend = aggByMonth.map((a) => a.registered);
  const admitTrend = aggByMonth.map((a) => a.newAdmit);
  const discipTrend = aggByMonth.map((a) => a.discipline);
  const attTrend = aggByMonth.map((a) => { const v = rate(a.attTotal, a.attReg); return v == null ? 0 : +(v * 100).toFixed(1); });
  const newAttTrend = aggByMonth.map((a) => { const v = rate(a.newAttTotal, a.prevNewAdmitCnt); return v == null ? 0 : +(v * 100).toFixed(1); });

  const top = ch.slice().sort((a, b) => (b.registered || 0) - (a.registered || 0)).slice(0, 5).map((r) => ({ label: r.name, value: r.registered || 0, color: jipaColors[r.jipa] || '#2563eb' }));
  const bottom = ch.slice().sort((a, b) => (a.registered || 0) - (b.registered || 0)).slice(0, 5).reverse().map((r) => ({ label: r.name, value: r.registered || 0, color: jipaColors[r.jipa] || '#2563eb' }));

  const maxJreg = Math.max(1, ...jipaOrder.map((jp) => aggregate(recsAll.filter((r) => r.jipa === jp)).registered));
  const jrows = jipaOrder.map((jp) => {
    const jr = recsAll.filter((r) => r.jipa === jp), a = aggregate(jr);
    return { jp, nCh: jr.filter((r) => r.gubun === '교회').length, nRg: jr.filter((r) => r.gubun === '지역').length, nPo: jr.filter((r) => r.gubun === '개척지').length, reg: a.registered, att: rate(a.attTotal, a.attReg), col: jipaColors[jp] || '#2563eb' };
  });

  // 참고: retroReg/prevReg/newAttTotal 등은 백엔드 /diagnosis/records 응답에 아직 없는 필드다(레거시에서도 항상
  // undefined였던 기존 결함 — 그대로 이식). any 캐스팅으로 동일한 런타임 동작(undefined→0/NaN)을 유지한다.
  const rcOf = (r: typeof recsAll[number]) => ((+r.registered || 0) - (+(r as any).prevReg || 0));
  const drops = recsAll.filter((r) => rcOf(r) < 0).sort((a, b) => rcOf(a) - rcOf(b)).slice(0, 3);
  const gains = recsAll.filter((r) => rcOf(r) > 0).sort((a, b) => rcOf(b) - rcOf(a)).slice(0, 2);
  const below95 = recsAll.filter((r) => r.prevNewAdmitCnt > 0 && ((r as any).newAttTotal / r.prevNewAdmitCnt) < 0.95);
  const noAdmitCh = ch.filter((r) => (r.newAdmit || 0) === 0).length;

  const insights: { c: string; t: React.ReactNode }[] = [];
  insights.push({ c: '#2563eb', t: <>총 현재적 <b>{fmt(A.registered)}명</b> · 전월 대비 <b>{regDiff >= 0 ? '+' : ''}{fmt(regDiff)}</b> ({pct(regRate)})</> });
  if (below95.length) insights.push({ c: '#e1503e', t: <>전월입교자 출석률 <b>95% 미만 {below95.length}곳</b> — 질 점검 필요</> });
  if (drops.length) insights.push({ c: '#e1503e', t: <><b>재적 급감</b><br />{drops.map((d, i) => <React.Fragment key={d.name}>{i > 0 && <br />}{d.name} <b>{rcOf(d)}</b></React.Fragment>)}</> });
  if (gains.length) insights.push({ c: '#2f9e6e', t: <><b>재적 증가</b><br />{gains.map((d, i) => <React.Fragment key={d.name}>{i > 0 && <br />}{d.name} <b>+{rcOf(d)}</b></React.Fragment>)}</> });
  insights.push({ c: '#7a869e', t: <>당월 입교 0인 교회 <b>{noAdmitCh}곳</b> · 당월 총 입교 {fmt(A.newAdmit)}명</> });

  return (
    <div>
      <div className="hero">
        <h1>전세계 맛디아지파 해외교회의 현황을 한눈에</h1>
        <span className="spirit">✠ 양에 속지 말고 질을 보라 — 확인·점검에서 행함으로</span>
      </div>

      <div className="kpis k5">
        {kpis.map((k) => (
          <div className="kpi" key={k.l}>
            <div className="k-bar" style={{ background: k.c }} />
            <div className="k-l">{k.l}</div>
            <div className="k-v">{k.v}</div>
            <div className="k-s" style={k.bad ? { color: '#e1503e', fontWeight: 800 } : undefined}>{k.s}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>12지파 현황판</h3>
        <div className="jmx-wrap">
          <div className="jmx">
            <div className="jmx-h"><span>지파</span><span className="num">교회</span><span className="num">지역</span><span className="num">개척</span><span>재적</span><span>전성도 출석률</span></div>
            {jrows.map((r) => (
              <div className="jmx-r" key={r.jp}>
                <span className="jp"><i style={{ background: r.col }} />{r.jp}</span>
                <span className="num">{r.nCh}</span><span className="num">{r.nRg}</span><span className="num">{r.nPo}</span>
                <span className="mb"><span className="track"><span style={{ width: `${(r.reg / maxJreg * 100).toFixed(1)}%`, background: r.col }} /></span><small>{fmt(r.reg)}</small></span>
                <span className="mb"><span className="track"><span style={{ width: `${r.att == null ? 0 : (r.att * 100).toFixed(1)}%`, background: (r.att != null && r.att < 0.8) ? '#e11d48' : '#2f80ed' }} /></span><small>{pct(r.att)}</small></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="homerow">
        <div className="card"><h3>6대륙 현재적 분포</h3><DonutChart data={donutData} /></div>
        <div className="card">
          <h3>교회별 현재적 · TOP / BOTTOM 5</h3>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#2f80ed', margin: '2px 0 8px' }}>▲ TOP 5</div>
          <HBarChart data={top} />
          <div style={{ fontSize: 12, fontWeight: 800, color: '#e11d48', margin: '16px 0 8px' }}>▼ BOTTOM 5</div>
          <HBarChart data={bottom} />
        </div>
        <div className="card">
          <h3>🔎 {month} 특이사항</h3>
          {insights.map((s, i) => (
            <div className="ssum" style={{ borderLeft: `3px solid ${s.c}`, paddingLeft: 11 }} key={i}><span>{s.t}</span></div>
          ))}
        </div>
      </div>

      <div className="homerow">
        <div className="card"><h3>월별 현재적 추이</h3><LineChart labels={months} series={[{ name: '현재적', color: '#2563eb', values: regTrend }]} /></div>
        <div className="card">
          <h3>월별 입교 vs 사고</h3>
          <div className="desc">입교(초록) · 사고(빨강)</div>
          <LineChart labels={months} series={[{ name: '입교', color: '#2ecc71', values: admitTrend }, { name: '사고', color: '#e1503e', values: discipTrend }]} />
        </div>
        <div className="card">
          <h3>예배자 출석율 (%)</h3>
          <div className="desc">전성도(파랑) · 전월입교자(주황)</div>
          <LineChart labels={months} series={[{ name: '전성도', color: '#2563eb', values: attTrend }, { name: '전월입교자', color: '#e39300', values: newAttTrend }]} />
        </div>
      </div>
    </div>
  );
};
