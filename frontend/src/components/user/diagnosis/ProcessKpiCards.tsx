import React from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { aggregate, recordsFor, rate, fmt, pct } from '../../../utils/diagnosisMetrics';

interface Kpi { l: string; v: string; side?: string; s: string; c: string; ic: string; empty?: boolean; }

const pctS = (v: number | null) => (v == null || isNaN(v)) ? '-' : ((v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%');
const sgn = (v: number) => (v > 0 ? '+' : '') + fmt(v);

interface ProcessKpiCardsProps {
  /** 'p1'=전도 전용 KPI(가개강/등록 지표) · 'generic'=센터/예배 공용 KPI(재적/입교/출석 지표) */
  variant: 'p1' | 'generic';
}

/** 신앙 프로세스 화면 상단 KPI 카드. Ported 1:1 from renderKPI(). */
export const ProcessKpiCards: React.FC<ProcessKpiCardsProps> = ({ variant }) => {
  const { records, month, gubun } = useDiagnosisData();
  if (!month) return null;

  const recs = recordsFor(records, month, gubun);
  const a = aggregate(recs);
  const nChurch = recs.filter((r) => r.gubun === '교회').length;
  const nRegion = recs.filter((r) => r.gubun === '지역').length;
  const nPion = recs.filter((r) => r.gubun === '개척지').length;

  const regDiff = a.registered - a.prevReg;
  const regRate = rate(regDiff, a.retroReg);

  let kpis: Kpi[];
  if (variant === 'p1') {
    const admitRate = rate(a.bibleMonthReg, a.evangReg);
    kpis = [
      { l: '대상 (교회/지역/개척지)', v: `${nChurch} / ${nRegion} / ${nPion}`, s: `합계 ${nChurch + nRegion + nPion}곳`, c: 'var(--gold)', ic: '🏛️' },
      { l: '총 현재적', v: fmt(a.registered), side: pctS(regRate), s: `전월 ${fmt(a.prevReg)} 대비 ${sgn(regDiff)}`, c: '#00a0e9', ic: '👥' },
      { l: '전도재적', v: fmt(a.evangReg), s: `찾기 → 복음방 → 가개강 대상`, c: '#7f1084', ic: '🔎' },
      { l: '당월 가개강 수', v: fmt(a.bibleMonthReg), s: `당월 가개강(등록) 실적`, c: '#2ecc71', ic: '🌱' },
      { l: '당월 가개강율', v: pct(admitRate), s: `전도재적 ${fmt(a.evangReg)}명 대비 등록율`, c: '#e39300', ic: '📈' },
      { l: '누적 등록수', v: fmt(a.bibleCumReg), s: `누적 가개강 등록 수`, c: '#16b9c9', ic: '📚' },
      { l: '현재 출석수', v: fmt(a.bibleCurAtt), s: `최근 주차 복음방 출석 수`, c: '#d7005b', ic: '⛪' },
      { l: '-', v: '-', s: '비어 있음', c: '#94a3b8', ic: '⚪', empty: true },
    ];
  } else {
    const admitRate = rate(a.newAdmit, a.retroReg);
    const cumAdmitRate = rate(a.cumNewAdmit, a.retroReg);
    const newAttRate = rate(a.newAttTotal, a.prevNewAdmitCnt);
    const attRate = rate(a.attTotal, a.attReg);
    const cenRegRate = rate(a.centerCumReg, a.evangReg);
    const cenGradRate = rate(a.centerCumGrad, a.centerTotCumReg);
    const monRegRate = rate(a.centerMonthTotal, a.evangReg);
    const monGradRate = rate(a.centerMonthGrad, a.centerTotMonthReg);
    const longMng = a.absLongManage, longUn = a.absLongUnmanage;
    kpis = [
      { l: '대상 (교회/지역/개척지)', v: `${nChurch} / ${nRegion} / ${nPion}`, s: `합계 ${nChurch + nRegion + nPion}곳`, c: 'var(--gold)', ic: '🏛️' },
      { l: '총 현재적', v: fmt(a.registered), side: pctS(regRate), s: `전월 ${fmt(a.prevReg)} 대비 ${sgn(regDiff)}`, c: '#00a0e9', ic: '👥' },
      { l: '당월 입교', v: fmt(a.newAdmit), side: pct(admitRate), s: `누적입교수 ${fmt(a.cumNewAdmit)} · 누적입교율 ${pct(cumAdmitRate)}`, c: '#2ecc71', ic: '🌱' },
      { l: '전월입교자 예배 총출석', v: fmt(a.newAttTotal), side: pct(newAttRate), s: `전월입교자 ${fmt(a.prevNewAdmitCnt)}명`, c: '#e39300', ic: '🙏' },
      { l: '전성도 예배 출석율', v: pct(attRate), s: `출결재적 ${fmt(a.attReg)} · 출석 ${fmt(a.attTotal)}`, c: '#16b9c9', ic: '⛪' },
      { l: '센터 누적등록수', v: fmt(a.centerCumReg), side: pct(cenRegRate), s: `월등록 ${fmt(a.centerMonthTotal)} · 월등록율 ${pct(monRegRate)}`, c: '#7f1084', ic: '📚' },
      { l: '센터 누적종강수', v: fmt(a.centerCumGrad), side: pct(cenGradRate), s: `월종강 ${fmt(a.centerMonthGrad)} · 월종강율 ${pct(monGradRate)}`, c: '#d7005b', ic: '🎓' },
      { l: '장기결석 관리대상', v: fmt(longMng + longUn), s: `관리가능 ${fmt(longMng)} · 관리불가 ${fmt(longUn)}`, c: '#e74c3c', ic: '⚠️' },
    ];
  }

  return (
    <div className="kpis">
      {kpis.map((k) => (
        <div className="kpi" key={k.l} style={k.empty ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
          <div className="k-bar" style={{ background: k.c }} />
          <div className="k-l">{k.l}</div>
          <div className="k-v">{k.v}{k.side && <span className="k-side">{k.side}</span>}</div>
          <div className="k-s">{k.s}</div>
        </div>
      ))}
    </div>
  );
};
