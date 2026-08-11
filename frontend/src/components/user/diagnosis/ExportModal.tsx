import React, { useState } from 'react';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { recordsFor, aggregate, contOf, fmt, pct, AggregateResult } from '../../../utils/diagnosisMetrics';
import { CONT_KO } from '../../../utils/diagnosisI18n';
import { xlsxGen, XlsxCell } from '../../../utils/xlsxWriter';

interface XlsMetric { g: string; l: string; t: 'int' | 'pct'; f: (a: AggregateResult) => number | null; }

// 공유용 엑셀 지표 카탈로그. Ported 1:1 from XLS_METRICS.
const XLS_METRICS: XlsMetric[] = [
  { g: '성도', l: '현재적', t: 'int', f: (a) => a.registered }, { g: '성도', l: '재적증가수', t: 'int', f: (a) => a.regChange },
  { g: '성도', l: '재적증가율', t: 'pct', f: (a) => a.retroReg > 0 ? a.regChange / a.retroReg : null },
  { g: '성도', l: '당월입교', t: 'int', f: (a) => a.newAdmit }, { g: '성도', l: '당월입교율', t: 'pct', f: (a) => a.retroReg > 0 ? a.newAdmit / a.retroReg : null },
  { g: '성도', l: '누적입교수', t: 'int', f: (a) => a.cumNewAdmit }, { g: '성도', l: '누적입교율', t: 'pct', f: (a) => a.retroReg > 0 ? a.cumNewAdmit / a.retroReg : null },
  { g: '성도', l: '사고(당월)', t: 'int', f: (a) => a.discipline }, { g: '성도', l: '누적사고수', t: 'int', f: (a) => a.cumDiscipline },
  { g: '전도', l: '전도재적', t: 'int', f: (a) => a.evangReg }, { g: '전도', l: '가개강 월등록', t: 'int', f: (a) => a.bibleMonthReg },
  { g: '전도', l: '가개강 월등록율', t: 'pct', f: (a) => a.evangReg > 0 ? a.bibleMonthReg / a.evangReg : null }, { g: '전도', l: '가개강 누적등록', t: 'int', f: (a) => a.bibleCumReg },
  { g: '센터', l: '센터 월등록', t: 'int', f: (a) => a.centerMonthTotal }, { g: '센터', l: '센터 월등록율', t: 'pct', f: (a) => a.evangReg > 0 ? a.centerMonthTotal / a.evangReg : null },
  { g: '센터', l: '월등록(대면)', t: 'int', f: (a) => a.centerMonthOn }, { g: '센터', l: '월등록(비대면)', t: 'int', f: (a) => a.centerMonthOff },
  { g: '센터', l: '센터 누적등록', t: 'int', f: (a) => a.centerCumReg }, { g: '센터', l: '센터 누적등록율', t: 'pct', f: (a) => a.evangReg > 0 ? a.centerCumReg / a.evangReg : null },
  { g: '센터', l: '월종강수', t: 'int', f: (a) => a.centerMonthGrad }, { g: '센터', l: '월종강율', t: 'pct', f: (a) => a.centerTotMonthReg > 0 ? a.centerMonthGrad / a.centerTotMonthReg : null },
  { g: '센터', l: '누적종강수', t: 'int', f: (a) => a.centerCumGrad }, { g: '센터', l: '누적종강율', t: 'pct', f: (a) => a.centerTotCumReg > 0 ? a.centerCumGrad / a.centerTotCumReg : null },
  { g: '센터', l: '초등 출석율', t: 'pct', f: (a) => a.ctwkE > 0 ? a.catE / a.ctwkE : null }, { g: '센터', l: '중등 출석율', t: 'pct', f: (a) => a.ctwkM > 0 ? a.catM / a.ctwkM : null },
  { g: '센터', l: '고등 출석율', t: 'pct', f: (a) => a.ctwkH > 0 ? a.catH / a.ctwkH : null },
  { g: '센터', l: '초중고 출석율', t: 'pct', f: (a) => (a.ctwkE + a.ctwkM + a.ctwkH) > 0 ? (a.catE + a.catM + a.catH) / (a.ctwkE + a.ctwkM + a.ctwkH) : null },
  { g: '예배', l: '전월입교자수', t: 'int', f: (a) => a.prevNewAdmitCnt }, { g: '예배', l: '전월입교자 대면', t: 'int', f: (a) => a.newAttOnsite },
  { g: '예배', l: '전월입교자 출석수', t: 'int', f: (a) => a.newAttTotal }, { g: '예배', l: '전월입교자 출석률', t: 'pct', f: (a) => a.prevNewAdmitCnt > 0 ? a.newAttTotal / a.prevNewAdmitCnt : null },
  { g: '예배', l: '전성도 출결재적', t: 'int', f: (a) => a.attReg }, { g: '예배', l: '전성도 대면', t: 'int', f: (a) => a.attOnsite },
  { g: '예배', l: '전성도 출석수', t: 'int', f: (a) => a.attTotal }, { g: '예배', l: '전성도 출석율', t: 'pct', f: (a) => a.attReg > 0 ? a.attTotal / a.attReg : null },
  { g: '예배', l: '결석수', t: 'int', f: (a) => a.absTotal }, { g: '예배', l: '결석율', t: 'pct', f: (a) => a.attReg > 0 ? a.absTotal / a.attReg : null },
  { g: '예배', l: '일회성결석', t: 'int', f: (a) => a.absOnce }, { g: '예배', l: '장기결석(관리불가)', t: 'int', f: (a) => a.absLongUnmanage },
];

/** 공유용 엑셀 내보내기 모달. Ported 1:1 from openExportModal()/renderExportBody()/xlsBuildRows()/xlsDownload(). */
export const ExportModal: React.FC = () => {
  const { records, month, jipaOrder, countryContMap } = useDiagnosisData();
  const [isOpen, setIsOpen] = useState(false);
  const [group, setGroup] = useState<'지파별' | '대륙별' | '교회별'>('지파별');
  const [gubun, setGubun] = useState('전체');
  const [sel, setSel] = useState<string[]>(['현재적', '당월입교', '센터 누적등록', '월종강율', '전성도 출석율']);
  const [sort, setSort] = useState<string | null>('현재적');

  const open = () => setIsOpen(true);

  if (!month) return <button className="repbtn" onClick={open} title="공유용 엑셀 내보내기" disabled>📥</button>;

  const xlsGroups = (): { name: string; jipa: string; agg: AggregateResult }[] => {
    const recs = recordsFor(records, month, gubun);
    if (group === '대륙별') {
      const m: Record<string, typeof recs> = {};
      recs.forEach((r) => { const k = contOf(r, countryContMap); (m[k] = m[k] || []).push(r); });
      return Object.entries(m).map(([k, v]) => ({ name: CONT_KO[k] || k, jipa: '', agg: aggregate(v) })).filter((g) => g.agg.count > 0);
    }
    if (group === '교회별') return recs.filter((r) => r.gubun === '교회').map((r) => ({ name: r.name, jipa: r.jipa, agg: aggregate([r]) }));
    return jipaOrder.map((j) => ({ name: j, jipa: j, agg: aggregate(recs.filter((r) => r.jipa === j)) })).filter((g) => g.agg.count > 0);
  };

  const buildRows = (): { headers: string[]; rows: XlsxCell[][] } => {
    const selMetrics = sel.map((l) => XLS_METRICS.find((m) => m.l === l)).filter((m): m is XlsMetric => !!m);
    let groups = xlsGroups();
    const sortM = XLS_METRICS.find((m) => m.l === sort);
    if (sortM) groups = groups.slice().sort((a, b) => { let va = sortM.f(a.agg), vb = sortM.f(b.agg); va = (va == null || isNaN(va)) ? -Infinity : va; vb = (vb == null || isNaN(vb)) ? -Infinity : vb; return vb - va; });
    const isCh = group === '교회별';
    const glabel = group === '대륙별' ? '대륙' : (isCh ? '교회' : '지파');
    const headers = ['순위', glabel].concat(isCh ? ['지파'] : []).concat(selMetrics.map((m) => m.l));
    const rows: XlsxCell[][] = groups.map((g, i) => {
      const base: XlsxCell[] = [{ v: i + 1, t: 'num' }, { v: g.name, t: 'str' }];
      if (isCh) base.push({ v: g.jipa || '', t: 'str' });
      return base.concat(selMetrics.map((m): XlsxCell => {
        const v = m.f(g.agg); const t: XlsxCell['t'] = m.t === 'pct' ? 'pct' : 'num';
        if (v == null || isNaN(v)) return { v: null, t };
        return { v: (m.t === 'pct' ? v : Math.round(v)), t };
      }));
    });
    return { headers, rows };
  };

  const { headers, rows } = buildRows();
  const preview = rows.slice(0, 12);
  const cats: string[] = []; XLS_METRICS.forEach((m) => { if (!cats.includes(m.g)) cats.push(m.g); });

  const toggleSel = (l: string) => setSel((prev) => {
    if (prev.includes(l)) {
      const next = prev.filter((x) => x !== l);
      if (sort === l) setSort(next[0] || null);
      return next;
    }
    if (!sort) setSort(l);
    return prev.concat([l]);
  });

  const download = () => {
    if (!sel.length) { alert('담을 항목을 하나 이상 선택하세요.'); return; }
    if (!rows.length) { alert('표시할 데이터가 없습니다.'); return; }
    const bytes = xlsxGen(group + ' 현황', headers, rows);
    const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `해외선교부_${group}_${month}.xlsx`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120);
  };

  const cellFmt = (cell: XlsxCell) => { if (cell == null || cell.v == null || cell.v === '') return <span style={{ color: '#c3ccdb' }}>-</span>; if (cell.t === 'pct') return pct(cell.v as number); if (cell.t === 'num' && typeof cell.v === 'number') return fmt(cell.v); return cell.v; };
  const chipStyle = (on: boolean): React.CSSProperties => ({ padding: '6px 13px', borderRadius: 20, border: `1px solid ${on ? '#c7d6ff' : '#e6ecf5'}`, background: on ? '#eef3ff' : '#fff', color: on ? '#2563eb' : '#41506f', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' });

  return (
    <>
      <button className="repbtn" onClick={open} title="공유용 엑셀 내보내기">📥 <span className="btn-txt-label">엑셀</span></button>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,25,50,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '26px 14px' }} onClick={() => setIsOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 1040, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', borderBottom: '1px solid #eef2f8' }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#1f2f52' }}>📥 공유용 엑셀 내보내기</span>
              <span style={{ fontSize: 12, color: '#8aa0c4' }}>항목을 골라 담고 · 한 항목 기준 순위 · {month} 기준</span>
              <button onClick={() => setIsOpen(false)} style={{ marginLeft: 'auto', border: 'none', background: '#f0f3f9', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '14px 22px', maxHeight: '70vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 4 }}>묶음</div>
                  <div style={{ display: 'flex', gap: 6 }}>{(['지파별', '대륙별', '교회별'] as const).map((g) => <button key={g} style={chipStyle(group === g)} onClick={() => setGroup(g)}>{g}</button>)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 4 }}>구분</div>
                  <div style={{ display: 'flex', gap: 6 }}>{['전체', '교회', '지역', '개척지'].map((g) => <button key={g} style={chipStyle(gubun === g)} onClick={() => setGubun(g)}>{g}</button>)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 4 }}>정렬(순위) 기준</div>
                  <select value={sort || ''} onChange={(e) => setSort(e.target.value)} style={{ padding: '7px 11px', border: '1.4px solid #e6ecf5', borderRadius: 8, fontSize: 13, fontWeight: 700, minWidth: 140 }}>
                    {sel.length ? sel.map((l) => <option key={l} value={l}>{l}</option>) : <option>항목을 먼저 선택</option>}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 2 }}>담을 항목 <span style={{ color: '#2563eb' }}>({sel.length}개 선택)</span> · 클릭해서 추가/제거</div>
              <div style={{ background: '#fafbfe', border: '1px solid #eef2f8', borderRadius: 10, padding: '7px 9px', marginBottom: 14 }}>
                {cats.map((cat) => (
                  <div key={cat} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 1 }}>{cat}</div>
                    {XLS_METRICS.filter((m) => m.g === cat).map((m) => {
                      const on = sel.includes(m.l);
                      return (
                        <label key={m.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, padding: '4px 9px', borderRadius: 8, cursor: 'pointer', background: on ? '#eef3ff' : '#f6f8fc', border: `1px solid ${on ? '#c7d6ff' : '#e6ecf5'}`, margin: 3 }}>
                          <input type="checkbox" checked={on} onChange={() => toggleSel(m.l)} />{m.l}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#5b6b8a', marginBottom: 4 }}>미리보기 <span style={{ color: '#8aa0c4', fontWeight: 600 }}>(상위 12행 · 총 {rows.length}행 · 정렬: {sort || '-'})</span></div>
              <div style={{ overflow: 'auto', border: '1px solid #eef2f8', borderRadius: 10, maxHeight: 280 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr>{headers.map((h) => <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 11, color: '#5b6b8a', whiteSpace: 'nowrap', borderBottom: '2px solid #e6ecf5', position: 'sticky', top: 0, background: '#fff' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.map((r, ri) => (
                      <tr key={ri}>{r.map((cell, ci) => <td key={ci} style={{ padding: '4px 8px', fontSize: 12, whiteSpace: 'nowrap', borderBottom: '1px solid #f0f3f9', fontWeight: ci < 2 ? 700 : undefined, textAlign: ci < 2 ? undefined : 'right' }}>{cellFmt(cell)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '13px 22px', borderTop: '1px solid #eef2f8', background: '#fafbfe', borderRadius: '0 0 16px 16px' }}>
              <button onClick={() => setIsOpen(false)} style={{ padding: '10px 18px', border: '1.4px solid #e6ecf5', background: '#fff', borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}>닫기</button>
              <button onClick={download} style={{ padding: '10px 22px', border: 'none', background: 'linear-gradient(135deg,#2f9e6e,#16a34a)', color: '#fff', borderRadius: 9, fontWeight: 800, cursor: 'pointer', boxShadow: '0 3px 10px rgba(22,163,74,.3)' }}>⬇ 엑셀(.xlsx) 내려받기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
