import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronDown, Eye, Trash2, RefreshCw, Calendar,
  CheckCircle2, AlertCircle, FileText, X, Image
} from 'lucide-react';
import {
  weeklyReportService,
  WeeklyReportSchemaItem,
  WeeklyReportSubmissionItem,
  FormSchema
} from '../../services/weeklyReportService';
import { Week, getCurrentWeek, enumerateWeeks, formatWeekLabel } from '../../utils/weekUtil';

export const AdminWeeklyReportStatusPage: React.FC = () => {
  const [schemas, setSchemas] = useState<WeeklyReportSchemaItem[]>([]);
  const [weekOptions, setWeekOptions] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | ''>('');
  const [submissions, setSubmissions] = useState<WeeklyReportSubmissionItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<WeeklyReportSubmissionItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 양식 목록 로드 (상세보기에서 스키마 참조용) + 서버 기준 현재 주차로 주차 선택기 구성
  useEffect(() => {
    weeklyReportService.getSchemas().then(data => setSchemas(data)).catch(() => {});
    weeklyReportService.getServerCurrentWeek().then(now => {
      setWeekOptions(enumerateWeeks(undefined, now).reverse());
      setSelectedWeek(now);
    }).catch(() => {
      const now = getCurrentWeek();
      setWeekOptions(enumerateWeeks(undefined, now).reverse());
      setSelectedWeek(now);
    });
  }, []);

  // 제출 현황 로드
  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await weeklyReportService.getSubmissions(selectedWeek !== '' ? selectedWeek : undefined);
      setSubmissions(data);
    } catch (e: any) {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const handleDelete = async (submissionId: number) => {
    if (!confirm('이 제출 데이터를 삭제하시겠습니까?')) return;
    try {
      await weeklyReportService.deleteSubmission(submissionId);
      await loadSubmissions();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const filtered = submissions.filter(s =>
    s.churchName.includes(searchText) || s.submittedBy?.includes(searchText)
  );

  const getStatusStyle = (status: string) => {
    if (status === 'SUBMITTED') return { bg: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)', label: '제출완료' };
    if (status === 'REVISED') return { bg: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: 'rgba(245,158,11,0.3)', label: '재제출' };
    return { bg: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: 'rgba(51,65,85,0.5)', label: status };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📊 주간보고 취합현황</h1>
        <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.875rem' }}>각 교회/개척지의 제출 현황을 확인합니다.</p>
      </div>

      {/* 필터 영역 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Calendar size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <select
            value={selectedWeek === '' ? '' : `${selectedWeek.year}-${selectedWeek.month}-${selectedWeek.weekOfMonth}`}
            onChange={e => {
              if (e.target.value === '') { setSelectedWeek(''); return; }
              const [y, m, w] = e.target.value.split('-').map(Number);
              setSelectedWeek({ year: y, month: m, weekOfMonth: w });
            }}
            style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '9px', paddingBottom: '9px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.875rem', cursor: 'pointer', appearance: 'none' }}>
            <option value="">전체 주차</option>
            {weekOptions.map(w => (
              <option key={`${w.year}-${w.month}-${w.weekOfMonth}`} value={`${w.year}-${w.month}-${w.weekOfMonth}`}>{formatWeekLabel(w)}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input placeholder="교회명 또는 제출자 검색..." value={searchText} onChange={e => setSearchText(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>

        <button onClick={loadSubmissions} style={{ padding: '9px 16px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: '전체 제출', value: filtered.length, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: '제출완료', value: filtered.filter(s => s.status === 'SUBMITTED').length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: '재제출', value: filtered.filter(s => s.status === 'REVISED').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}30`, borderRadius: '12px', padding: '14px 18px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{card.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: card.color, marginTop: '4px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', color: '#fca5a5' }}>
          <AlertCircle size={16} color='#ef4444' /> {error}
        </div>
      )}

      {/* 데이터 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(30,41,59,0.4)', borderRadius: '14px', border: '1px dashed rgba(51,65,85,0.4)' }}>
          <FileText size={40} color='#475569' style={{ marginBottom: '12px' }} />
          <p style={{ color: '#64748b' }}>제출된 보고가 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '14px', border: '1px solid rgba(51,65,85,0.4)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                {['교회명', '주차', '제출자', '제출일시', '상태', '작업'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, idx) => {
                const st = getStatusStyle(sub.status);
                const photoList = sub.photoPaths ? JSON.parse(sub.photoPaths) as string[] : [];
                return (
                  <tr key={sub.submissionId} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: '#f1f5f9' }}>{sub.churchName}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>{formatWeekLabel({ year: sub.reportYear, month: sub.reportMonth, weekOfMonth: sub.reportWeekOfMonth })}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>{sub.submittedBy || '-'}</td>
                    <td style={{ padding: '13px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(sub.submittedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {st.label}
                      </span>
                      {photoList.length > 0 && (
                        <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Image size={11} /> {photoList.length}장
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDetailItem(sub)} style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#a5b4fc', cursor: 'pointer' }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDelete(sub.submissionId)} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세보기 모달 */}
      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '18px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(51,65,85,0.5)', position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 }}>
              <div>
                <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700 }}>{detailItem.churchName} — 제출 상세</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  {formatWeekLabel({ year: detailItem.reportYear, month: detailItem.reportMonth, weekOfMonth: detailItem.reportWeekOfMonth })} · {new Date(detailItem.submittedAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <button onClick={() => setDetailItem(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* 제출 데이터 JSON 렌더링 */}
              <DetailRenderer dataJson={detailItem.submitDataJson} schemaJson={schemas.find(s => s.schemaId === detailItem.schema?.schemaId)?.formSchemaJson} />

              {/* 첨부 사진 */}
              {detailItem.photoPaths && JSON.parse(detailItem.photoPaths).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '10px' }}>📷 첨부 사진</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {(JSON.parse(detailItem.photoPaths) as string[]).map((path, i) => (
                      <a key={i} href={`/api/v1/files/${path}`} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.4)' }}>
                        <img src={`/api/v1/files/${path}`} alt={`첨부사진 ${i + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 상세 렌더러 컴포넌트 ──────────────────────────────────────────────
const DetailRenderer: React.FC<{ dataJson: string; schemaJson?: string }> = ({ dataJson, schemaJson }) => {
  let data: any = {};
  let schema: FormSchema | null = null;
  try { data = JSON.parse(dataJson); } catch {}
  try { if (schemaJson) schema = JSON.parse(schemaJson); } catch {}

  if (!schema) {
    return (
      <pre style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '10px', padding: '16px', color: '#86efac', fontSize: '0.78rem', overflowX: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {schema.pages.map(page => (
        <div key={page.pageId}>
          <h4 style={{ color: '#a5b4fc', fontSize: '0.9rem', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
            {page.title}
          </h4>
          {page.fields?.map(f => (
            <div key={f.fieldId} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', minWidth: '100px' }}>{f.label}</span>
              <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{data[f.fieldId] || '-'}</span>
            </div>
          ))}
          {page.sections?.map(sec => {
            const secData = data[sec.sectionId];
            return (
              <div key={sec.sectionId} style={{ marginBottom: '16px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 600 }}>{sec.title}</div>
                {sec.type === 'grouped_table' && sec.leafColumns && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>{sec.leafColumns.map(c => <th key={c.key} style={{ padding: '6px 10px', background: 'rgba(30,41,59,0.8)', color: '#64748b', textAlign: 'center', border: '1px solid rgba(51,65,85,0.4)', fontWeight: 600 }}>{c.groupLabel ? `${c.groupLabel} · ` : ''}{c.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      <tr>
                        {sec.leafColumns.map(c => (
                          <td key={c.key} style={{ padding: '6px 10px', border: '1px solid rgba(51,65,85,0.3)', color: '#e2e8f0', textAlign: 'center' }}>
                            {secData?.[c.key] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
                {sec.type === 'dynamic_table' && Array.isArray(secData) && (
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {secData.map((r: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        {sec.columns?.map(c => <span key={c} style={{ marginRight: '12px' }}><span style={{ color: '#64748b' }}>{c}: </span>{r[c] || '-'}</span>)}
                      </div>
                    ))}
                  </div>
                )}
                {sec.type === 'notes_board' && sec.cards && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                    {sec.cards.map(card => {
                      const cv = secData?.[card.cardId] || {};
                      return (
                        <div key={card.cardId} style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.3)', borderRadius: '8px', padding: '10px' }}>
                          <div style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 600 }}>{card.title}{card.subtitle ? ` · ${card.subtitle}` : ''}</div>
                          <div style={{ color: '#e2e8f0', fontSize: '0.82rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{cv.value || '-'}</div>
                          {(cv.photoPaths?.length || 0) > 0 && (
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Image size={11} /> 사진 {cv.photoPaths.length}장
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

