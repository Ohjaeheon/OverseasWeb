import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import {
  buildChurchScores, ChurchScore, aggregate, recordsFor, rate, pct, median, weakPoints, QUAL_MIN_SAMPLE,
  getMonthNumFromStr, getYearNumFromStr,
} from '../../../utils/diagnosisMetrics';
import { CONT_KO, CONT_TR, COUNTRY_TR, Lang } from '../../../utils/diagnosisI18n';
import { GAEGANG, THEOLOGY } from '../../../data/centerWeeklyData';

type Q = '양' | '질';
interface MDef { cat: string; q: Q; sub: string; l: string; ref?: boolean; fn: (x: ChurchScore) => number | null; }

const P4 = (lang: Lang, ko: string, en: string, zh: string, ja: string) => ({ ko, en, zh, ja } as Record<Lang, string>)[lang] || ko;

/** 교회 진단서 화면. Ported 1:1 from renderDiag(). */
export const DiagPage: React.FC = () => {
  const { records, month, months, jipaOrder, jipaColors, lang, gubun } = useDiagnosisData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [diagChurch, setDiagChurch] = useState<string>('');
  const [legendOpen, setLegendOpen] = useState(false);
  const [procHelpOpen, setProcHelpOpen] = useState(false);

  const entityParam = searchParams.get('entity');
  useEffect(() => { if (entityParam) setDiagChurch(entityParam); }, [entityParam]);

  const P = (ko: string, en: string, zh: string, ja: string) => P4(lang as Lang, ko, en, zh, ja);

  if (!month) return null;
  const all = buildChurchScores(records, month, jipaColors, gubun);
  if (!all.length) {
    return <div className="card">{P('해당 월의 교회 데이터가 없습니다.', 'No church data for this month.', '该月没有教会数据。', '該当月の教会データがありません。')}</div>;
  }
  const activeChurch = (diagChurch && all.find((c) => c.name === diagChurch)) ? diagChurch : all[0].name;
  const c = all.find((x) => x.name === activeChurch)!;

  const GG = (x: ChurchScore, k: 'cum' | 'mon') => { const g = GAEGANG[x.name]; if (!g || !g[k]) return null; const v = g[k]![month]; return v != null ? v : null; };
  const PREVREG = (x: ChurchScore) => {
    const m = getMonthNumFromStr(month); if (!m || m < 2) return null;
    const y = getYearNumFromStr(month);
    const key = y + '-' + String(m - 1).padStart(2, '0');
    const t = THEOLOGY[x.name]; return (t && t[key] != null) ? t[key] : null;
  };
  const jeongseok = (on: number, ol: number, etc: number, tot: number, den: number) => {
    on = +on || 0; ol = +ol || 0; etc = +etc || 0; tot = +tot || 0;
    if (tot > 0 && on + ol + etc === 0) return null;
    return den > 0 ? (on + ol) / den : null;
  };

  const M: MDef[] = [
    { cat: '가등록', q: '양', sub: '전도재적 대비 가등록율', l: '누적', fn: (x) => rate(x.agg.bibleCumReg, x.agg.evangReg) },
    { cat: '가등록', q: '양', sub: '전도재적 대비 가등록율', l: '당월', fn: (x) => rate(x.agg.bibleMonthReg, x.agg.evangReg) },
    { cat: '센터등록', q: '양', sub: '전도재적 대비 센터등록율', l: '누적', fn: (x) => rate(x.agg.centerCumReg, x.agg.evangReg) },
    { cat: '센터등록', q: '양', sub: '전도재적 대비 센터등록율', l: '당월', fn: (x) => rate(x.agg.centerMonthTotal, x.agg.evangReg) },
    { cat: '센터등록', q: '질', sub: '가등록 대비 센터등록율', l: '누적', fn: (x) => GG(x, 'cum') },
    { cat: '센터등록', q: '질', sub: '가등록 대비 센터등록율', l: '당월', fn: (x) => GG(x, 'mon') },
    { cat: '센터등록', q: '질', sub: '전월 센터등록자', l: '출석율', fn: (x) => PREVREG(x) },
    { cat: '센터출석', q: '양', sub: '전도재적 대비 센터출석율', l: '중등', fn: (x) => rate(x.agg.catM, x.agg.evangReg) },
    { cat: '센터출석', q: '양', sub: '전도재적 대비 센터출석율', l: '고등', fn: (x) => rate(x.agg.catH, x.agg.evangReg) },
    { cat: '센터출석', q: '질', sub: '총등록 대비 센터출석율', l: '중등', fn: (x) => rate(x.agg.catM, x.agg.ctwkM) },
    { cat: '센터출석', q: '질', sub: '총등록 대비 센터출석율', l: '고등', fn: (x) => rate(x.agg.catH, x.agg.ctwkH) },
    { cat: '종강(입교)', q: '질', sub: '총등록 대비 종강율', l: '누적', fn: (x) => rate(x.agg.centerCumGrad, x.agg.centerTotCumReg) },
    { cat: '종강(입교)', q: '질', sub: '총등록 대비 종강율', l: '당월', fn: (x) => rate(x.agg.centerMonthGrad, x.agg.centerTotMonthReg) },
    { cat: '종강(입교)', q: '양', sub: '재적 대비 입교율', l: '누적', fn: (x) => rate(x.agg.cumNewAdmit, x.agg.retroReg) },
    { cat: '종강(입교)', q: '양', sub: '재적 대비 입교율', l: '당월', fn: (x) => rate(x.agg.newAdmit, x.agg.retroReg) },
    { cat: '예배', q: '양', sub: '전월입교자', l: '예배출석율', fn: (x) => rate((x.agg as any).newAttTotal, x.agg.prevNewAdmitCnt) },
    { cat: '예배', q: '질', sub: '전월입교자', l: '정식예배출석율', fn: (x) => jeongseok((x.agg as any).newAttOnsite, (x.agg as any).newAttOnline, (x.agg as any).newAttEtc, (x.agg as any).newAttTotal, x.agg.prevNewAdmitCnt) },
    { cat: '예배', q: '질', ref: true, sub: '전월입교자', l: '대면예배출석율', fn: (x) => (getMonthNumFromStr(month) >= 4) ? rate((x.agg as any).newAttOnsite, x.agg.prevNewAdmitCnt) : null },
    { cat: '예배', q: '양', sub: '전성도', l: '예배출석율', fn: (x) => rate(x.agg.attTotal, x.agg.attReg) },
    { cat: '예배', q: '질', sub: '전성도', l: '정식예배출석율', fn: (x) => jeongseok(x.agg.attOnsite, x.agg.attOnline, x.agg.attEtc, x.agg.attTotal, x.agg.attReg) },
    { cat: '예배', q: '질', ref: true, sub: '전성도', l: '대면예배출석율', fn: (x) => (getMonthNumFromStr(month) >= 4) ? rate(x.agg.attOnsite, x.agg.attReg) : null },
  ];
  const fracOf = (v: number | null, vals: number[]) => { if (v == null || !vals.length) return null; let b = 0, e = 0; vals.forEach((x) => { if (x < v) b++; else if (x === v) e++; }); return (b + e / 2) / vals.length; };
  const TIER: Record<string, { c: string; bar: string }> = { 상위: { c: '#16a34a', bar: '#22a06b' }, 중위: { c: '#b5811f', bar: '#f2c037' }, 하위: { c: '#e1503e', bar: '#e75c48' } };
  const tierOf = (f: number | null) => f == null ? null : (f > 0.75 ? '상위' : (f <= 0.25 ? '하위' : '중위'));

  const computed = M.map((m) => {
    if (m.ref) return { ...m, v: m.fn(c), frac: null as number | null, tier: null as string | null, rank: null as number | null, rankN: 0, refText: undefined as string | undefined };
    const vals = all.map((x) => m.fn(x)).filter((v): v is number => v != null && !isNaN(v));
    const v = m.fn(c);
    const frac = fracOf(v, vals);
    const tier = tierOf(frac);
    const rank = (v != null && !isNaN(v)) ? 1 + vals.filter((x) => x > v).length : null;
    return { ...m, v, frac, tier, rank, rankN: vals.length, refText: undefined as string | undefined };
  });
  const strong = computed.filter((m) => m.tier === '상위'), weak = computed.filter((m) => m.tier === '하위');

  const jipaAvg = (numFn: (x: ChurchScore) => number, denFn: (x: ChurchScore) => number) => {
    if (getMonthNumFromStr(month) < 4) return null;
    const byJ: Record<string, ChurchScore[]> = {};
    all.forEach((x) => { (byJ[x.jipa] = byJ[x.jipa] || []).push(x); });
    const rs = Object.keys(byJ).map((j) => {
      let n = 0, d = 0; byJ[j].forEach((x) => { n += (+numFn(x) || 0); d += (+denFn(x) || 0); });
      return d > 0 ? n / d : null;
    }).filter((v): v is number => v != null && !isNaN(v));
    return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  };
  const avgAttOnsiteNew = jipaAvg((x) => x.agg.attOnsite, (x) => x.agg.attReg);
  const avgAttOnsitePrev = jipaAvg((x) => (x.agg as any).newAttOnsite, (x) => x.agg.prevNewAdmitCnt);
  const refText = (avg: number | null) => avg != null ? P(`(12지파 평균 ${pct(avg)} 참고)`, `(12-tribe avg ${pct(avg)}, ref.)`, `(12支派均值 ${pct(avg)} 参考)`, `(12支派平均 ${pct(avg)} 参考)`) : P('참고', 'ref.', '参考', '参考');
  const withRef = computed.map((m) => {
    if (m.l !== '대면예배출석율') return m;
    return { ...m, refText: refText(m.sub === '전성도' ? avgAttOnsiteNew : avgAttOnsitePrev) };
  });

  const STG: { k: string; pick: (m: MDef) => boolean }[] = [
    { k: '가등록', pick: (m) => m.cat === '가등록' },
    { k: '센터등록', pick: (m) => m.cat === '센터등록' },
    { k: '센터출석', pick: (m) => m.cat === '센터출석' },
    { k: '종강', pick: (m) => !!m.sub && m.sub.indexOf('종강율') >= 0 },
    { k: '입교', pick: (m) => !!m.sub && m.sub.indexOf('입교율') >= 0 },
    { k: '예배', pick: (m) => m.cat === '예배' && !m.ref },
  ];
  const STG_LABEL: Record<string, [string, string, string, string]> = {
    가등록: ['가등록', 'Prov. Reg.', '临时登记', '仮登録'], 센터등록: ['센터등록', 'Center Reg.', '中心登记', 'センター登録'],
    센터출석: ['센터출석', 'Attendance', '中心出席', 'センター出席'], 종강: ['종강', 'Completion', '结业', '修了'],
    입교: ['입교', 'Membership', '入教', '入教'], 예배: ['예배', 'Worship', '礼拜', '礼拝'],
  };
  const LV: Record<string, { c: string; cap: string }> = { 상위: { c: '#1fb84c', cap: '#159a3c' }, 중위: { c: '#f7c81a', cap: '#b5811f' }, 하위: { c: '#e8321f', cap: '#d02a17' } };
  const LVt: Record<string, [string, string, string, string]> = { 상위: ['강함', 'Strong', '强', '強い'], 중위: ['보통', 'Fair', '中', '普通'], 하위: ['약함', 'Weak', '弱', '弱い'] };
  const tierAvg = (ms: typeof computed) => { const fr = ms.map((m) => m.frac).filter((v): v is number => v != null); if (!fr.length) return null; const avg = fr.reduce((a, b) => a + b, 0) / fr.length; return avg > 0.75 ? '상위' : (avg <= 0.25 ? '하위' : '중위'); };
  const stageArr = STG.map((s) => { const ms = withRef.filter(s.pick); return { k: s.k, a: tierAvg(ms.filter((m) => m.q === '양')), q: tierAvg(ms.filter((m) => m.q === '질')) }; });

  const qL = (q: Q) => P4(lang as Lang, q, q === '질' ? 'Qual' : 'Qty', q === '질' ? '质' : '量', q === '질' ? '質' : '量');
  const Lamp: React.FC<{ tier: string | null; kind: string }> = ({ tier, kind }) => {
    if (!tier) return <><span className="qk" /><span className="lamp2" style={{ background: 'transparent', boxShadow: 'none' }} /><span className="qv" /></>;
    const lv = LV[tier];
    return <><span className="qk">{kind}</span><span className="lamp2" style={{ background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,.5), rgba(255,255,255,0) 50%), ${lv.c}` }} /><span className="qv" style={{ color: lv.cap }}>{P4(lang as Lang, ...LVt[tier])}</span></>;
  };

  const qchip = (q: Q) => <span style={{ fontSize: 12, fontWeight: 800, padding: '1px 6px', borderRadius: 6, marginLeft: 7, background: q === '질' ? '#eef3ff' : '#eefaf1', color: q === '질' ? '#2f54eb' : '#2f9e6e' }}>{qL(q)}</span>;
  const rankLabel = (m: { rank: number | null; rankN: number } | undefined) => {
    if (!m || m.rank == null || !m.rankN) return null;
    return <>{P(m.rank + '위', '#' + m.rank, '第' + m.rank, m.rank + '位')}<small style={{ color: '#aab6cc', fontWeight: 700 }}>/{m.rankN}</small></>;
  };
  const Mrow: React.FC<{ m: typeof withRef[number] }> = ({ m }) => {
    const t = m.tier ? TIER[m.tier] : null, col = t ? t.c : '#94a3bd', bc = t ? t.bar : '#cbd5e1';
    const w = m.v == null ? 0 : Math.max(0, Math.min(100, m.v * 100));
    return (
      <div className="mrow">
        <span className="mdot" style={{ background: bc }} />
        <span className="ml">{m.l}{qchip(m.q)}{m.ref && <small style={{ color: '#94a3bd', fontWeight: 700 }}> {m.refText || P('참고', 'ref.', '参考', '参考')}</small>}</span>
        <span className="mbar"><i style={{ width: `${w.toFixed(0)}%`, background: bc }} /></span>
        <span className="mv" style={{ color: col }}>{pct(m.v)}</span>
        <span className="mrank">{rankLabel(m)}</span>
      </div>
    );
  };
  const CatCard: React.FC<{ num: string; title: string; note?: React.ReactNode }> = ({ num, title, note }) => {
    const ms = withRef.filter((m) => m.cat === title);
    const s = ms.filter((m) => m.tier === '상위').length, w = ms.filter((m) => m.tier === '하위').length;
    let lastSub: string | null = null;
    return (
      <div className="dcard span" style={{ ['--acc' as any]: 'var(--navy2)' }}>
        <div className="dct">
          <span className="dnum">{num}</span>{title}{note && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}> {note}</span>}
          {(s > 0 || w > 0) && <span className="hr">{s > 0 && <span style={{ color: 'var(--good)', fontWeight: 800 }}>🟢 {s}</span>}{w > 0 && <span style={{ color: 'var(--bad)', fontWeight: 800 }}>🔴 {w}</span>}</span>}
        </div>
        {ms.map((m, i) => {
          const showSub = m.sub && m.sub !== lastSub; if (m.sub) lastSub = m.sub; else lastSub = null;
          return <React.Fragment key={i}>{showSub && <div className="msub">{m.sub}</div>}<Mrow m={m} /></React.Fragment>;
        })}
      </div>
    );
  };

  const chBy = months.map((mm) => {
    const rec = records.find((r) => r.name === c.name && r.month === mm);
    const aa = rec ? aggregate([rec]) : null; const mn = getMonthNumFromStr(mm);
    return { m: mm, qNew: aa ? rate((aa as any).newAttTotal, aa.prevNewAdmitCnt) : null, qAtt: aa ? rate(aa.attTotal, aa.attReg) : null, qFace: (aa && mn >= 4) ? rate(aa.attOnsite, aa.attReg) : null, sn: aa ? (aa.prevNewAdmitCnt || 0) : 0 };
  });
  const moL = (mm: string) => {
    if (lang === 'ko') return mm;
    const n = getMonthNumFromStr(mm);
    if (lang === 'en') return ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][n] || mm;
    return n + '月';
  };
  const tdir = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null); if (v.length < 2) return <span style={{ color: '#94a3bd' }}>-</span>;
    const d = v[v.length - 1] - v[v.length - 2]; const col = Math.abs(d) <= 0.005 ? '#6b7a99' : (d > 0 ? '#16a34a' : '#e1503e');
    const t = Math.abs(d) <= 0.005 ? P('→ 유지', '→ Flat', '→ 持平', '→ 維持') : (d > 0 ? P('↗ 상승', '↗ Up', '↗ 上升', '↗ 上昇') : P('↘ 하락', '↘ Down', '↘ 下降', '↘ 低下'));
    return <span style={{ color: col }}>{t}</span>;
  };
  const trLbls: [string, string][] = [
    [P('전월입교자 예배출석율', 'New-member worship', '上月入教者礼拜出席', '前月入教者の礼拝出席'), 'qNew'],
    [P('전성도 예배출석율', 'All-member worship', '全体圣徒礼拜出席', '全信徒の礼拝出席'), 'qAtt'],
    [P('전성도 대면출석율', 'In-person worship', '面对面礼拜出席', '対面礼拝出席'), 'qFace'],
  ];

  // 종합 한마디 진단
  const scored = withRef.filter((m) => m.frac != null);
  const avgFrac = (arr: typeof scored) => arr.length ? arr.reduce((s, m) => s + (m.frac || 0), 0) / arr.length : null;
  const qAvg = avgFrac(scored.filter((m) => m.q === '질')), aAvg = avgFrac(scored.filter((m) => m.q === '양'));
  const byF = scored.slice().sort((a, b) => (b.frac || 0) - (a.frac || 0));
  const best = byF[0], worst = byF[byF.length - 1];
  let verdict = P('데이터가 부족해 종합 판단이 어렵습니다.', 'Not enough data for an overall judgment.', '数据不足,难以综合判断。', 'データが不足しており総合判断が難しいです。');
  let vcol = '#8a99b5';
  if (qAvg != null && aAvg != null) {
    if (qAvg >= 0.5 && aAvg >= 0.5) { verdict = P('양(규모)·질(실력) 모두 상위권입니다 — 알맹이 있는 성장.', 'Both scale and skill are in the upper range — solid growth.', '量与质均属上游 — 有内涵的成长。', '量·質ともに上位です — 中身のある成長。'); vcol = '#16a34a'; }
    else if (aAvg >= 0.5 && qAvg < 0.5) { verdict = P('양(규모)은 좋은 편이나 질(실력)이 상대적으로 약합니다 — 거품이 아닌지 점검이 필요합니다.', 'Scale is good, but skill is relatively weak — check for superficial growth.', '量较好但质相对较弱 — 需检查是否为泡沫。', '量は良いが質が相対的に弱いです — 点検が必要です。'); vcol = '#e1503e'; }
    else if (qAvg >= 0.5 && aAvg < 0.5) { verdict = P('질(실력)은 좋은 편이나 양(규모)이 상대적으로 약합니다 — 전도·가등록을 늘려야 합니다.', 'Skill is good, but scale is relatively weak — grow evangelism.', '质较好但量相对较弱 — 需增加布道。', '質は良いが量が相対的に弱いです。'); vcol = '#2f54eb'; }
    else { verdict = P('양·질 모두 평균 이하입니다 — 집중 점검이 필요한 교회입니다.', 'Both scale and skill are below average — needs focused attention.', '量与质均低于平均 — 需重点关注。', '量·質ともに平均以下です。'); vcol = '#e0922e'; }
  }

  // sortOrder는 diagnosisService.ts의 DiagnosisRecord 타입에 아직 선언돼 있지 않지만 백엔드는 내려준다.
  const opts = all.slice().sort((a, b) => (((a.rec as any).sortOrder ?? 999999) - ((b.rec as any).sortOrder ?? 999999)) || a.name.localeCompare(b.name, 'ko'));

  return (
    <div>
      <div className="sechead">
        🩺 {P('교회 진단서', 'Church Diagnosis', '教会诊断书', '教会診断書')}{' '}
        <span onClick={() => setLegendOpen((v) => !v)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', verticalAlign: 'middle', userSelect: 'none' }}>ⓘ {P('색 기준', 'Color guide', '颜色标准', '色の基準')}</span>
      </div>
      {legendOpen && (
        <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
          <b style={{ color: '#16a34a' }}>🟢 상위</b> · <b style={{ color: '#b5811f' }}>🟡 중위</b> · <b style={{ color: '#e1503e' }}>🔴 하위</b> — {all.length}개 교회 중 <b>상위 25% / 중위 / 하위 25%</b>로 판정함(평균 아님). <b style={{ color: '#2f54eb' }}>양</b>=규모, <b style={{ color: '#2f9e6e' }}>질</b>=실력.
        </div>
      )}
      <div className="dpicker">
        <span style={{ fontWeight: 700, color: 'var(--muted)' }}>{P('교회 선택', 'Select church', '选择教会', '教会を選択')}</span>
        <select value={c.name} onChange={(e) => { setDiagChurch(e.target.value); setSearchParams({}); }}>
          {opts.map((x) => <option key={x.name} value={x.name}>{x.jipa} · {x.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          <b style={{ color: c.color }}>{c.jipa}{P('지파', ' Tribe', ' 支派', ' 支派')}</b> · {CONT_TR[CONT_KO[c.rec.continent] || c.rec.continent]?.[lang as Lang] || CONT_KO[c.rec.continent] || c.rec.continent} · {COUNTRY_TR[c.country]?.[lang as Lang] || c.country}
        </span>
      </div>

      <div className="dwrap">
        <div className="dcard span" style={{ borderLeft: '5px solid var(--navy2)' }}>
          <div className="dct" style={{ color: 'var(--navy2)' }}>🩺 {P('총평', 'Overall', '总评', '総評')}</div>
          <div style={{ fontSize: 17.5, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.55 }}>{verdict}</div>
          {best && worst && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginTop: 8 }}>
              {P('가장 강한 지표', 'Strongest', '最强指标', '最も強い指標')} <b style={{ color: '#16a34a' }}>{best.sub} · {best.l} · {rankLabel(best)}</b> · {P('가장 약한 지표', 'Weakest', '最弱指标', '最も弱い指標')} <b style={{ color: '#e1503e' }}>{worst.sub} · {worst.l} · {rankLabel(worst)}</b>
            </div>
          )}
        </div>

        <div className="dcard span" style={{ ['--acc' as any]: 'var(--navy2)' }}>
          <div className="dct">
            <span className="dnum emo">🚦</span>{P('신앙 프로세스 강·약 지도', 'Faith Process Strength Map', '信仰进程强弱图', '信仰プロセス強弱マップ')}
            <span className="dhelptog" onClick={() => setProcHelpOpen((v) => !v)}>{P('ⓘ 보는 방법', 'ⓘ How to read', 'ⓘ 查看方法', 'ⓘ 見方')}</span>
          </div>
          {procHelpOpen && (
            <div className="dhelp">{P('각 단계를 양(규모)·질(실력)으로 나눠 신호등 색으로 봅니다. 초록=강함 · 노랑=보통 · 빨강=약함 — 73개 교회 중 상대 위치입니다.', 'Each stage is split into Qty/Qual and shown by signal color.', '将各阶段分为量·质并以信号灯颜色显示。', '各段階を量·質に分け、信号色で表示します。')}</div>
          )}
          <div className="pflow">
            {stageArr.map((s) => (
              <div className="pstage" key={s.k}>
                <div className="pname">{P4(lang as Lang, ...STG_LABEL[s.k])}</div>
                <div className="pq"><Lamp tier={s.a} kind={qL('양')} /></div>
                <div className="pq"><Lamp tier={s.q} kind={qL('질')} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="dcard span" style={{ ['--acc' as any]: 'var(--navy2)' }}>
          <div className="dct">
            <span className="dnum">★</span>{P('강점·약점 한눈에', 'Strengths & Weaknesses', '优势·劣势一览', '強み·弱み一覧')}
            <span className="hr">{P(`${all.length}개 교회 중 상위 25% / 하위 25% 지표`, `Top/bottom 25% among ${all.length} churches`, `${all.length}间教会中前25%/后25%指标`, `${all.length}教会中の上位/下位25%指標`)}</span>
          </div>
          <div className="swgrid">
            <div className="swcol good">
              <div className="swhd"><span>🟢</span><span style={{ color: 'var(--good)' }}>{P('우수 항목', 'Strengths', '优势项目', '優れた項目')}</span><span className="swcount" style={{ color: 'var(--good)' }}>{strong.length}</span></div>
              {strong.length ? strong.map((m, i) => (
                <span className="chip" key={i}><span className="cdot" style={{ background: 'var(--good)' }} />{m.sub} · {m.l}{qchip(m.q)}<span className="cv" style={{ color: 'var(--good)' }}>{pct(m.v)}</span></span>
              )) : <div className="swempty">{P('아직 상위 25%에 든 지표가 없습니다.', 'No metric in the top 25% yet.', '暂无进入前25%的指标。', 'まだ上位25%に入る指標はありません。')}</div>}
            </div>
            <div className="swcol bad">
              <div className="swhd"><span>🔴</span><span style={{ color: 'var(--bad)' }}>{P('개선 필요 항목', 'Needs improvement', '需改进项目', '改善が必要な項目')}</span><span className="swcount" style={{ color: 'var(--bad)' }}>{weak.length}</span></div>
              {weak.length ? weak.map((m, i) => (
                <span className="chip" key={i}><span className="cdot" style={{ background: 'var(--bad)' }} />{m.sub} · {m.l}{qchip(m.q)}<span className="cv" style={{ color: 'var(--bad)' }}>{pct(m.v)}</span></span>
              )) : <div className="swempty">{P('하위 25% 지표가 없습니다 — 두드러진 약점이 없습니다.', 'No metric in the bottom 25%.', '没有后25%的指标。', '下位25%の指標はありません。')}</div>}
            </div>
          </div>
        </div>

        <CatCard num="1" title="가등록" />
        <CatCard num="2" title="센터등록" />
        <CatCard num="3" title="센터출석" />
        <CatCard num="4" title="종강(입교)" />
        <CatCard num="5" title="예배" note={P('· 모두 당월 기준', '· all this-month', '· 均为当月', '· すべて当月')} />

        <div className="dcard span" style={{ ['--acc' as any]: 'var(--gold)' }}>
          <div className="dct"><span className="dnum emo">📈</span>{P('예배 지표 월별 추이', 'Monthly Worship Trend', '礼拜指标月度趋势', '礼拝指標の月別推移')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dtrend">
              <thead><tr><th>{P('지표', 'Metric', '指标', '指標')}</th>{months.map((mm) => <th key={mm} className={mm === month ? 'cur' : ''}>{moL(mm)}</th>)}<th>{P('추세', 'Trend', '趋势', '傾向')}</th></tr></thead>
              <tbody>
                {trLbls.map(([label, key]) => {
                  const vals = chBy.map((x) => (x as any)[key] as number | null);
                  return (
                    <tr key={key}>
                      <td className="rl">{label}</td>
                      {chBy.map((x) => {
                        const v = (x as any)[key] as number | null;
                        const lo = key === 'qNew' && v != null && x.sn > 0 && x.sn < QUAL_MIN_SAMPLE;
                        return <td key={x.m} className={x.m === month ? 'cur' : ''} style={{ color: v == null ? '#c3ccdb' : (lo ? '#b5811f' : undefined) }}>{pct(v)}{lo && <div style={{ fontSize: 9, color: '#b5811f' }}>{x.sn}명</div>}</td>;
                      })}
                      <td className="tdir">{tdir(vals)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
