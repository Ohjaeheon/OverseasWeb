import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Maximize, Minimize } from 'lucide-react';
import { WeeklyReportSubmissionItem, WeeklyReportSchemaItem, FormSchema, FormPage } from '../../services/weeklyReportService';
import { formatWeekLabel } from '../../utils/weekUtil';

interface Props {
  submissions: WeeklyReportSubmissionItem[];
  schemas: WeeklyReportSchemaItem[];
  /** 시작할 교회의 submissions 배열 인덱스 (표지 슬라이드부터 시작) */
  initialIndex?: number;
  /** churchId -> 이 교회에서 숨길 sectionId 목록 (발표 설정에서 지정) */
  hiddenSectionsByChurchId?: Record<number, string[]>;
  onClose: () => void;
}

type Slide =
  | { si: number; kind: 'cover' }
  | { si: number; kind: 'page'; pageIndex: number }
  | { si: number; kind: 'raw' };

interface ParsedSub {
  sub: WeeklyReportSubmissionItem;
  data: Record<string, any>;
  schema: FormSchema | null;
  topPhotos: string[];
  /** 표(section)가 하나도 없는 페이지(예: 교회명/보고일만 있는 "기본 정보")는 이미 표지에 나오는
   *  내용과 겹치므로 발표에서는 통째로 건너뛴다 — 실제로 슬라이드가 되는 페이지 인덱스만 모음 */
  visiblePageIndices: number[];
}

const F = '"Pretendard", "Noto Sans KR", -apple-system, sans-serif';

const navBtnStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 5,
  width: '46px', height: '46px', borderRadius: '50%', border: 'none',
  background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
};

// 실제 교회 주간보고 PPT 양식(연두색 헤더 + 병합 헤더 표)을 그대로 재현하기 위한 스타일
const thStyle: React.CSSProperties = { padding: 'clamp(6px,0.9vw,11px) clamp(6px,1vw,14px)', background: '#dcefd4', border: '1.5px solid #4b5563', fontWeight: 800, textAlign: 'center', fontSize: 'clamp(0.72rem, 1.05vw, 0.98rem)', color: '#14201a' };
const tdStyle: React.CSSProperties = { padding: 'clamp(6px,0.9vw,11px) clamp(6px,1vw,14px)', border: '1.5px solid #9ca3af', textAlign: 'center', fontSize: 'clamp(0.72rem, 1.05vw, 0.98rem)', color: '#0f172a', fontWeight: 600, background: '#f4f5f7' };

export const WeeklyReportPresentationView: React.FC<Props> = ({ submissions, schemas, initialIndex = 0, hiddenSectionsByChurchId, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── 교회별 데이터 파싱 ──────────────────────────────────────────
  const parsedSubs: ParsedSub[] = useMemo(() => submissions.map(sub => {
    let data: Record<string, any> = {};
    let schema: FormSchema | null = null;
    try { data = JSON.parse(sub.submitDataJson); } catch {}
    try {
      const s = schemas.find(sc => sc.schemaId === sub.schema?.schemaId);
      if (s) schema = JSON.parse(s.formSchemaJson);
    } catch {}
    const topPhotos: string[] = sub.photoPaths ? (() => { try { return JSON.parse(sub.photoPaths!); } catch { return []; } })() : [];
    const visiblePageIndices = schema
      ? schema.pages.map((p, i) => i).filter(i => (schema!.pages[i].sections?.length ?? 0) > 0)
      : [];
    return { sub, data, schema, topPhotos, visiblePageIndices };
  }), [submissions, schemas]);

  // ── 전체 슬라이드를 하나의 연속된 시퀀스로 평탄화: 교회당 [표지] + [표가 있는 페이지들] ──
  const { slides, churchStartIndex } = useMemo(() => {
    const list: Slide[] = [];
    const starts: number[] = [];
    parsedSubs.forEach((ps, si) => {
      starts.push(list.length);
      list.push({ si, kind: 'cover' });
      if (ps.schema) {
        ps.visiblePageIndices.forEach(pageIndex => list.push({ si, kind: 'page', pageIndex }));
      } else {
        list.push({ si, kind: 'raw' });
      }
    });
    return { slides: list, churchStartIndex: starts };
  }, [parsedSubs]);

  const [slideIndex, setSlideIndex] = useState(() => churchStartIndex[Math.min(initialIndex, Math.max(0, churchStartIndex.length - 1))] || 0);
  const total = slides.length;
  const slide = slides[slideIndex];

  const goPrev = useCallback(() => setSlideIndex(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setSlideIndex(i => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev();
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  if (!slide) return null;
  const ps = parsedSubs[slide.si];
  const { sub, data, schema, topPhotos, visiblePageIndices } = ps;
  const dotCount = schema ? visiblePageIndices.length : 0;
  const currentDotIdx = slide.kind === 'page' ? visiblePageIndices.indexOf(slide.pageIndex) : -1;
  const weekLabel = formatWeekLabel({ year: sub.reportYear, month: sub.reportMonth, weekOfMonth: sub.reportWeekOfMonth });

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: '#0b1220', zIndex: 2000, display: 'flex', flexDirection: 'column', fontFamily: F }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.95rem' }}>{sub.churchName}</span>
          <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
            {slide.kind === 'cover' ? '표지' : slide.kind === 'raw' ? '내용' : schema!.pages[slide.pageIndex].title}
          </span>
          {sub.status === 'NOT_SUBMITTED' && (
            <span style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
              미제출
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* 현재 교회 내 페이지 점(dot) 네비게이션 */}
          {dotCount > 0 && slide.kind !== 'raw' && (
            <div style={{ display: 'flex', gap: '5px' }}>
              {Array.from({ length: dotCount + 1 }).map((_, dotIdx) => {
                // dotIdx 0 = 표지, 1..n = 페이지(표가 있는 페이지만)
                const isActive = dotIdx === 0 ? slide.kind === 'cover' : currentDotIdx === dotIdx - 1;
                return (
                  <button key={dotIdx} onClick={() => setSlideIndex(churchStartIndex[slide.si] + dotIdx)}
                    style={{
                      width: isActive ? '18px' : '7px', height: '7px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                      background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.25)', transition: 'all 0.2s'
                    }} />
                );
              })}
            </div>
          )}
          <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}>{slideIndex + 1} / {total}</span>
          <button onClick={toggleFullscreen} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#e2e8f0', cursor: 'pointer', padding: '8px', display: 'flex' }}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#e2e8f0', cursor: 'pointer', padding: '8px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 슬라이드 캔버스 */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 70px', minHeight: 0 }}>
        <button onClick={goPrev} disabled={slideIndex === 0}
          style={{ ...navBtnStyle, left: '10px', opacity: slideIndex === 0 ? 0.25 : 1, cursor: slideIndex === 0 ? 'not-allowed' : 'pointer' }}>
          <ChevronLeft size={20} />
        </button>

        <div key={slideIndex} style={{
          width: 'min(1240px, 100%)', aspectRatio: '16 / 9', maxHeight: '100%',
          background: '#ffffff', borderRadius: '18px', boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
          overflow: 'auto', color: '#1e293b', animation: 'wr-slide-in 0.3s ease'
        }}>
          {slide.kind === 'cover' && <CoverSlide sub={sub} weekLabel={weekLabel} topPhotos={topPhotos} />}
          {slide.kind === 'page' && schema && (
            <PageSlide
              page={schema.pages[slide.pageIndex]}
              data={data}
              churchName={sub.churchName}
              weekLabel={weekLabel}
              hiddenSectionIds={hiddenSectionsByChurchId?.[sub.churchId] || []}
            />
          )}
          {slide.kind === 'raw' && (
            <div style={{ padding: '40px' }}>
              <pre style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', color: '#166534', fontSize: '0.85rem', overflowX: 'auto', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <button onClick={goNext} disabled={slideIndex === total - 1}
          style={{ ...navBtnStyle, right: '10px', opacity: slideIndex === total - 1 ? 0.25 : 1, cursor: slideIndex === total - 1 ? 'not-allowed' : 'pointer' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 하단 교회 썸네일 스트립 */}
      <div style={{ flexShrink: 0, display: 'flex', gap: '8px', overflowX: 'auto', padding: '14px 20px 18px', justifyContent: submissions.length <= 8 ? 'center' : 'flex-start' }}>
        {submissions.map((s, i) => {
          const notSubmitted = s.status === 'NOT_SUBMITTED';
          return (
            <button key={s.submissionId} onClick={() => setSlideIndex(churchStartIndex[i])}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '6px',
                border: i === slide.si ? '1.5px solid #3b82f6' : notSubmitted ? '1px dashed rgba(248,113,113,0.45)' : '1px solid rgba(255,255,255,0.15)',
                background: i === slide.si ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                color: i === slide.si ? '#93c5fd' : notSubmitted ? '#fca5a5' : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit'
              }}>
              {notSubmitted && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />}
              {s.churchName}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes wr-slide-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─── 표지 슬라이드 ────────────────────────────────────────────────
// (양식 관리 화면의 "발표 미리보기"에서도 재사용하므로, 전체 제출 데이터가 아니라
//  실제로 쓰는 필드만 요구하도록 타입을 좁혀 둔다)
export const CoverSlide: React.FC<{ sub: Pick<WeeklyReportSubmissionItem, 'churchName' | 'submittedBy' | 'status'>; weekLabel: string; topPhotos: string[] }> = ({ sub, weekLabel, topPhotos }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', gap: 'clamp(10px, 2vh, 20px)', background: 'linear-gradient(160deg, #ffffff 0%, #eef2ff 100%)' }}>
    <div style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.05rem)', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{weekLabel} 주간보고</div>
    <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontWeight: 900, color: '#16224a', margin: 0, letterSpacing: '-0.5px' }}>{sub.churchName}</h1>
    {sub.status === 'NOT_SUBMITTED' ? (
      <div style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.05rem)', color: '#dc2626', fontWeight: 700, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 18px' }}>
        아직 취합되지 않았습니다
      </div>
    ) : (
      <div style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.05rem)', color: '#475569', fontWeight: 600 }}>제출자 {sub.submittedBy || '-'}</div>
    )}
    {topPhotos.length > 0 && (
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {topPhotos.slice(0, 4).map((p, i) => (
          <img key={i} src={`/api/v1/files/${p}`} alt="" style={{ width: 'clamp(70px, 9vw, 120px)', height: 'clamp(70px, 9vw, 120px)', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ))}
      </div>
    )}
  </div>
);

// ─── 페이지 슬라이드 — 실제 교회 주간보고 PPT 양식(연두색 헤더바 + 번호 매긴 표 목차)을 재현 ────
export const PageSlide: React.FC<{ page: FormPage; data: Record<string, any>; churchName: string; weekLabel: string; hiddenSectionIds?: string[] }> = ({ page, data, churchName, weekLabel, hiddenSectionIds = [] }) => {
  const hasFields = page.fields && page.fields.length > 0;
  const sections = (page.sections || []).filter(sec => !hiddenSectionIds.includes(sec.sectionId));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* 상단 배너 — 교회명 + 주차 */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px,1.6vw,18px) clamp(20px,3vw,34px)',
        background: 'linear-gradient(90deg, #4f9c47 0%, #a9d9a0 55%, #eef8ea 100%)'
      }}>
        <div style={{
          fontSize: 'clamp(1rem, 2.1vw, 1.5rem)', fontWeight: 900, color: '#111827',
          textDecoration: 'underline', textDecorationColor: '#f59e0b', textDecorationThickness: '3px', textUnderlineOffset: '4px'
        }}>
          ■ {churchName} 주간보고
        </div>
        <div style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.05rem)', fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap' }}>{weekLabel}</div>
      </div>

      {/* 본문 — 번호 매긴 표 목록을 세로로 나열 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'clamp(16px,2.6vw,30px) clamp(22px,3.4vw,38px)', display: 'flex', flexDirection: 'column', gap: 'clamp(16px,2.6vh,28px)' }}>
        {hasFields && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(14px,2vw,28px)' }}>
            {page.fields!.map(f => (
              <div key={f.fieldId} style={{ display: 'flex', gap: '10px', fontSize: 'clamp(0.9rem, 1.3vw, 1.1rem)' }}>
                <span style={{ color: '#475569', fontWeight: 800 }}>{f.label}</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{data[f.fieldId] || '-'}</span>
              </div>
            ))}
          </div>
        )}

        {sections.map(sec => {
          const secData = data[sec.sectionId];
          return (
            <div key={sec.sectionId}>
              <div style={{ fontWeight: 900, fontSize: 'clamp(1.05rem, 1.9vw, 1.4rem)', color: '#0f172a', marginBottom: 'clamp(8px,1.2vh,14px)' }}>
                {sec.title}
              </div>

              {sec.type === 'grouped_table' && sec.leafColumns && (
                <GroupedTableDisplay leafColumns={sec.leafColumns} value={secData || {}} />
              )}

              {sec.type === 'dynamic_table' && sec.columns && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{sec.columns.map(col => (<th key={col} style={thStyle}>{col}</th>))}</tr>
                    </thead>
                    <tbody>
                      {(secData || []).length === 0 ? (
                        <tr><td colSpan={sec.columns.length} style={{ ...tdStyle, color: '#94a3b8', fontWeight: 500 }}>입력된 내용이 없습니다.</td></tr>
                      ) : (secData as any[]).map((row, rIdx) => (
                        <tr key={rIdx}>{sec.columns!.map(col => (<td key={col} style={{ ...tdStyle, textAlign: 'left' }}>{row[col] || '-'}</td>))}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sec.type === 'notes_board' && (
                !Array.isArray(secData) || secData.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem' }}>추가된 카드가 없습니다.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                    {secData.map((card: any, cIdx: number) => (
                      <div key={card.cardId || cIdx} style={{ border: '1.5px solid #9ca3af', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
                        {card.photoPaths?.length > 0 ? (
                          <img src={`/api/v1/files/${card.photoPaths[0]}`} alt="" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', background: '#f1f5f9' }}>
                            <ImageIcon size={18} />
                          </div>
                        )}
                        <div style={{ padding: '9px 11px' }}>
                          <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>{card.title || `항목 ${cIdx + 1}`}</div>
                          <div style={{ marginTop: '4px', color: '#0f172a', whiteSpace: 'pre-wrap', fontSize: '0.82rem', fontWeight: 500 }}>{card.value || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 병합 헤더 요약표 — 실제 보고서처럼 groupLabel이 같은 연속 컬럼을 2행 헤더로 병합 ────
const GroupedTableDisplay: React.FC<{ leafColumns: { key: string; label: string; groupLabel?: string }[]; value: Record<string, any> }> = ({ leafColumns, value }) => {
  const hasGroups = leafColumns.some(l => l.groupLabel);
  const topRow: React.ReactNode[] = [];
  let i = 0;
  while (i < leafColumns.length) {
    const leaf = leafColumns[i];
    if (leaf.groupLabel) {
      let j = i;
      while (j < leafColumns.length && leafColumns[j].groupLabel === leaf.groupLabel) j++;
      topRow.push(<th key={leaf.key} style={thStyle} colSpan={j - i}>{leaf.groupLabel}</th>);
      i = j;
    } else {
      topRow.push(<th key={leaf.key} style={thStyle} rowSpan={hasGroups ? 2 : 1}>{leaf.label}</th>);
      i++;
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{topRow}</tr>
          {hasGroups && (
            <tr>{leafColumns.filter(l => l.groupLabel).map(l => (<th key={l.key} style={thStyle}>{l.label}</th>))}</tr>
          )}
        </thead>
        <tbody>
          <tr>{leafColumns.map(c => (<td key={c.key} style={tdStyle}>{value[c.key] ?? '-'}</td>))}</tr>
        </tbody>
      </table>
    </div>
  );
};
