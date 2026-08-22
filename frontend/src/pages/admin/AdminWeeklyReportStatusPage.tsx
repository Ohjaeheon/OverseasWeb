import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronDown, Eye, Trash2, RefreshCw, Calendar,
  CheckCircle2, AlertCircle, FileText, X, Image, Presentation, Settings
} from 'lucide-react';
import {
  weeklyReportService,
  WeeklyReportSchemaItem,
  WeeklyReportSubmissionItem,
  ChurchOption,
  FormSchema
} from '../../services/weeklyReportService';
import { Week, getCurrentWeek, enumerateWeeks, formatWeekLabel } from '../../utils/weekUtil';
import { WeeklyReportPresentationView } from '../../components/weeklyReport/WeeklyReportPresentationView';

/** 취합 안 된 교회를 발표 보기 목록에 빈칸으로 채워 넣기 위한 자리표시 제출 데이터 */
function makeBlankSubmission(church: ChurchOption, displayName: string, week: Week, schemaId: number | null): WeeklyReportSubmissionItem {
  return {
    submissionId: -church.churchId,
    schema: schemaId ? { schemaId, weekLabel: '' } : ({} as any),
    reportYear: week.year, reportMonth: week.month, reportWeekOfMonth: week.weekOfMonth,
    churchId: church.churchId, churchName: displayName, submittedBy: '',
    submitDataJson: '{}',
    photoPaths: null,
    status: 'NOT_SUBMITTED',
    submittedAt: '', updatedAt: ''
  };
}

function parseHiddenSections(json?: string | null): string[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

export const AdminWeeklyReportStatusPage: React.FC = () => {
  const [schemas, setSchemas] = useState<WeeklyReportSchemaItem[]>([]);
  const [weekOptions, setWeekOptions] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | ''>('');
  const [submissions, setSubmissions] = useState<WeeklyReportSubmissionItem[]>([]);
  const [allChurches, setAllChurches] = useState<ChurchOption[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<WeeklyReportSubmissionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presentSubs, setPresentSubs] = useState<WeeklyReportSubmissionItem[] | null>(null);
  const [presentHiddenSections, setPresentHiddenSections] = useState<Record<number, string[]>>({});
  const [presentLoading, setPresentLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 양식 목록 + 취합 대상 교회 전체 목록 로드 + 서버 기준 현재 주차로 주차 선택기 구성
  useEffect(() => {
    weeklyReportService.getSchemas().then(data => setSchemas(data)).catch(() => {});
    weeklyReportService.getAccessibleChurches().then(data => setAllChurches(data)).catch(() => {});
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

  // 발표 보기: "표시" 설정된 교회만 대상으로, 제출한 교회는 실제 데이터를, 취합 안 된 교회는 빈칸 슬라이드를 채워 넣는다
  const openPresentation = async () => {
    if (selectedWeek === '') {
      alert('발표 보기는 특정 주차를 선택한 뒤 이용해 주세요.');
      return;
    }
    try {
      setPresentLoading(true);
      let schemaId: number | null = null;
      try {
        const s = await weeklyReportService.getSchemaForWeek(selectedWeek);
        schemaId = s.schemaId;
      } catch {}
      const bySubmittedChurch = new Map(submissions.map(s => [s.churchId, s]));
      const visibleChurches = allChurches
        .filter(c => c.weeklyReportVisible !== false)
        .filter(c => (c.weeklyReportDisplayName || c.name).includes(searchText));

      const combined = visibleChurches.map(c => {
        const displayName = c.weeklyReportDisplayName || c.name;
        const existing = bySubmittedChurch.get(c.churchId);
        return existing ? { ...existing, churchName: displayName } : makeBlankSubmission(c, displayName, selectedWeek, schemaId);
      });

      const hiddenMap: Record<number, string[]> = {};
      visibleChurches.forEach(c => { hiddenMap[c.churchId] = parseHiddenSections(c.weeklyReportHiddenSections); });

      setPresentHiddenSections(hiddenMap);
      setPresentSubs(combined);
    } finally {
      setPresentLoading(false);
    }
  };

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
    if (status === 'SUBMITTED') return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: '제출완료' };
    if (status === 'REVISED') return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '재제출' };
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: status };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#1e293b', fontFamily: '"Pretendard", "Noto Sans KR", -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16224a', margin: 0, letterSpacing: '-0.3px' }}>📊 주간보고 취합현황</h1>
        <p style={{ color: '#475569', marginTop: '4px', fontSize: '0.875rem', fontWeight: 500 }}>각 교회/개척지의 제출 현황을 확인합니다.</p>
      </div>

      {/* 필터 영역 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Calendar size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <select
            value={selectedWeek === '' ? '' : `${selectedWeek.year}-${selectedWeek.month}-${selectedWeek.weekOfMonth}`}
            onChange={e => {
              if (e.target.value === '') { setSelectedWeek(''); return; }
              const [y, m, w] = e.target.value.split('-').map(Number);
              setSelectedWeek({ year: y, month: m, weekOfMonth: w });
            }}
            style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '9px', paddingBottom: '9px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', cursor: 'pointer', appearance: 'none', fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">전체 주차</option>
            {weekOptions.map(w => (
              <option key={`${w.year}-${w.month}-${w.weekOfMonth}`} value={`${w.year}-${w.month}-${w.weekOfMonth}`}>{formatWeekLabel(w)}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input placeholder="교회명 또는 제출자 검색..." value={searchText} onChange={e => setSearchText(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
        </div>

        <button onClick={loadSubmissions} style={{ padding: '9px 16px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', color: '#334155', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <RefreshCw size={14} /> 새로고침
        </button>

        <button onClick={openPresentation} disabled={allChurches.length === 0 || presentLoading}
          style={{ padding: '9px 16px', background: (allChurches.length === 0 || presentLoading) ? '#e2e8f0' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '10px', color: (allChurches.length === 0 || presentLoading) ? '#94a3b8' : '#ffffff', fontWeight: 700, cursor: (allChurches.length === 0 || presentLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', boxShadow: (allChurches.length === 0 || presentLoading) ? 'none' : '0 4px 12px rgba(37,99,235,0.25)' }}>
          {presentLoading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Presentation size={15} />} 발표 보기
        </button>

        <button onClick={() => setSettingsOpen(true)}
          style={{ padding: '9px 16px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', color: '#334155', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <Settings size={14} /> 발표 설정
        </button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: '전체 제출', value: filtered.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: '제출완료', value: filtered.filter(s => s.status === 'SUBMITTED').length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: '재제출', value: filtered.filter(s => s.status === 'REVISED').length, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{card.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, marginTop: '4px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', color: '#991b1b', fontWeight: 600 }}>
          <AlertCircle size={16} color='#dc2626' /> {error}
        </div>
      )}

      {/* 데이터 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569', fontWeight: 600 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <FileText size={40} color='#94a3b8' style={{ marginBottom: '12px' }} />
          <p style={{ color: '#475569', fontWeight: 600 }}>제출된 보고가 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(20,40,90,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['교회명', '주차', '제출자', '제출일시', '상태', '작업'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, idx) => {
                const st = getStatusStyle(sub.status);
                const photoList = sub.photoPaths ? JSON.parse(sub.photoPaths) as string[] : [];
                return (
                  <tr key={sub.submissionId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0f172a' }}>{sub.churchName}</td>
                    <td style={{ padding: '13px 16px', color: '#334155', fontSize: '0.85rem', fontWeight: 500 }}>{formatWeekLabel({ year: sub.reportYear, month: sub.reportMonth, weekOfMonth: sub.reportWeekOfMonth })}</td>
                    <td style={{ padding: '13px 16px', color: '#334155', fontSize: '0.85rem', fontWeight: 500 }}>{sub.submittedBy || '-'}</td>
                    <td style={{ padding: '13px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(sub.submittedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {st.label}
                      </span>
                      {photoList.length > 0 && (
                        <span style={{ marginLeft: '6px', color: '#475569', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                          <Image size={11} /> {photoList.length}장
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setDetailItem(sub)} style={{ padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#2563eb', cursor: 'pointer' }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDelete(sub.submissionId)} style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', cursor: 'pointer' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#ffffff', zIndex: 1 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{detailItem.churchName} 주간보고 상세</h3>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.8rem', fontWeight: 500 }}>
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
                  <h4 style={{ color: '#334155', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 700 }}>📷 첨부 사진</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {(JSON.parse(detailItem.photoPaths) as string[]).map((path, i) => (
                      <a key={i} href={`/api/v1/files/${path}`} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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

      {presentSubs && (
        <WeeklyReportPresentationView
          submissions={presentSubs}
          schemas={schemas}
          initialIndex={0}
          hiddenSectionsByChurchId={presentHiddenSections}
          onClose={() => setPresentSubs(null)}
        />
      )}

      {settingsOpen && (
        <PresentationSettingsModal
          churches={allChurches}
          schemas={schemas}
          onClose={() => setSettingsOpen(false)}
          onSaved={updated => { setAllChurches(updated); setSettingsOpen(false); }}
        />
      )}
    </div>
  );
};

// ── 발표 보기 설정 모달 — 교회별 표시 여부 / 표시 이름 / 숨길 표 ──────────────
const PresentationSettingsModal: React.FC<{
  churches: ChurchOption[];
  schemas: WeeklyReportSchemaItem[];
  onClose: () => void;
  onSaved: (updated: ChurchOption[]) => void;
}> = ({ churches, schemas, onClose, onSaved }) => {
  type Draft = { visible: boolean; displayName: string; hiddenSectionIds: string[] };
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const init: Record<number, Draft> = {};
    churches.forEach(c => {
      init[c.churchId] = {
        visible: c.weeklyReportVisible !== false,
        displayName: c.weeklyReportDisplayName || '',
        hiddenSectionIds: parseHiddenSections(c.weeklyReportHiddenSections)
      };
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [expandedChurchId, setExpandedChurchId] = useState<number | null>(null);

  // 모든 스키마에 등장했던 sectionId를 모아 "숨길 표" 선택지로 제공 (스키마가 여러 번 바뀌어도 과거 표까지 포함)
  const allSections = React.useMemo(() => {
    const map = new Map<string, string>();
    schemas.forEach(s => {
      try {
        const parsed: FormSchema = JSON.parse(s.formSchemaJson);
        parsed.pages.forEach(p => p.sections?.forEach(sec => map.set(sec.sectionId, sec.title)));
      } catch {}
    });
    return Array.from(map.entries()).map(([sectionId, title]) => ({ sectionId, title }));
  }, [schemas]);

  const updateDraft = (churchId: number, patch: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [churchId]: { ...prev[churchId], ...patch } }));
  };

  const toggleHiddenSection = (churchId: number, sectionId: string) => {
    setDrafts(prev => {
      const cur = prev[churchId];
      const hidden = cur.hiddenSectionIds.includes(sectionId)
        ? cur.hiddenSectionIds.filter(id => id !== sectionId)
        : [...cur.hiddenSectionIds, sectionId];
      return { ...prev, [churchId]: { ...cur, hiddenSectionIds: hidden } };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await Promise.all(churches.map(c => {
        const d = drafts[c.churchId];
        return weeklyReportService.updateChurchPresentationSettings(c.churchId, {
          visible: d.visible,
          displayName: d.displayName.trim() || null,
          hiddenSectionIds: d.hiddenSectionIds
        });
      }));
      const updated = await weeklyReportService.getAccessibleChurches();
      onSaved(updated);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '760px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>발표 보기 설정</h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>교회별로 발표 보기 노출 여부, 표시 이름, 숨길 표를 정할 수 있습니다.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px' }}>
          {churches.map(c => {
            const d = drafts[c.churchId];
            if (!d) return null;
            const expanded = expandedChurchId === c.churchId;
            return (
              <div key={c.churchId} style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', flexShrink: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={d.visible} onChange={e => updateDraft(c.churchId, { visible: e.target.checked })} />
                    표시
                  </label>
                  <span style={{ fontSize: '0.85rem', color: d.visible ? '#0f172a' : '#94a3b8', fontWeight: 700, minWidth: '110px', flexShrink: 0 }}>{c.name}</span>
                  <input value={d.displayName} onChange={e => updateDraft(c.churchId, { displayName: e.target.value })}
                    placeholder="발표용 표시 이름 (비워두면 원래 이름 그대로)"
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', color: '#0f172a', outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={() => setExpandedChurchId(expanded ? null : c.churchId)}
                    style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    숨길 표 {d.hiddenSectionIds.length > 0 ? `(${d.hiddenSectionIds.length})` : ''}
                  </button>
                </div>

                {expanded && (
                  <div style={{ marginTop: '10px', marginLeft: '28px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {allSections.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>등록된 표가 없습니다.</span>}
                    {allSections.map(sec => (
                      <label key={sec.sectionId} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#334155', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 10px' }}>
                        <input type="checkbox" checked={!d.hiddenSectionIds.includes(sec.sectionId)}
                          onChange={() => toggleHiddenSection(c.churchId, sec.sectionId)} />
                        {sec.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#334155', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
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
      <pre style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', color: '#166534', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #e2e8f0', fontWeight: 600 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#1e293b' }}>
      {schema.pages.map(page => (
        <div key={page.pageId}>
          <h4 style={{ color: '#1e3a8a', fontSize: '0.92rem', fontWeight: 700, marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
            {page.title}
          </h4>
          {page.fields?.map(f => (
            <div key={f.fieldId} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <span style={{ color: '#475569', fontSize: '0.85rem', minWidth: '100px', fontWeight: 600 }}>{f.label}</span>
              <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}>{data[f.fieldId] || '-'}</span>
            </div>
          ))}
          {page.sections?.map(sec => {
            const secData = data[sec.sectionId];
            return (
              <div key={sec.sectionId} style={{ marginBottom: '16px' }}>
                <div style={{ color: '#334155', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 700 }}>{sec.title}</div>
                {sec.type === 'grouped_table' && sec.leafColumns && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>{sec.leafColumns.map(c => <th key={c.key} style={{ padding: '6px 10px', background: '#f1f5f9', color: '#334155', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{c.groupLabel ? `${c.groupLabel} · ` : ''}{c.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      <tr>
                        {sec.leafColumns.map(c => (
                          <td key={c.key} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', color: '#0f172a', textAlign: 'center', background: '#ffffff', fontWeight: 600 }}>
                            {secData?.[c.key] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
                {sec.type === 'dynamic_table' && sec.columns && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>{sec.columns.map(col => <th key={col} style={{ padding: '6px 10px', background: '#f1f5f9', color: '#334155', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(secData || []).map((row: any, rIdx: number) => (
                        <tr key={rIdx}>
                          {sec.columns!.map(col => (
                            <td key={col} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', color: '#0f172a', background: '#ffffff' }}>{row[col] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {sec.type === 'notes_board' && Array.isArray(secData) && (
                  secData.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>추가된 카드가 없습니다.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      {secData.map((card: any, cIdx: number) => (
                        <div key={card.cardId || cIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{card.title || `항목 ${cIdx + 1}`}</div>
                          <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '4px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                            {card.value || '-'}
                          </div>
                          {(card.photoPaths?.length || 0) > 0 && (
                            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                              <Image size={11} /> 사진 {card.photoPaths.length}장
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

