import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Send, RefreshCw, Lock
} from 'lucide-react';
import {
  weeklyReportService,
  WeeklyReportSchemaItem,
  FormSchema,
  ChurchOption
} from '../../services/weeklyReportService';
import { Week, getCurrentWeek, enumerateWeeks, formatWeekLabel, isSameWeek } from '../../utils/weekUtil';
import { PageRenderer, NotesCardEntry, generateCardId } from '../../components/weeklyReport/FormRenderer';

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export const WeeklyReportPage: React.FC = () => {
  const [serverCurrentWeek, setServerCurrentWeek] = useState<Week>(getCurrentWeek());
  const [selectedWeek, setSelectedWeek] = useState<Week>(getCurrentWeek());
  const [activeSchema, setActiveSchema] = useState<WeeklyReportSchemaItem | null>(null);
  const [parsedSchema, setParsedSchema] = useState<FormSchema | null>(null);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [submittedWeekKeys, setSubmittedWeekKeys] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [notesPhotos, setNotesPhotos] = useState<Record<string, Record<string, File[]>>>({});
  const [notesPhotoPreviews, setNotesPhotoPreviews] = useState<Record<string, Record<string, string[]>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const weekOptions = useMemo(() => enumerateWeeks(undefined, serverCurrentWeek).reverse(), [serverCurrentWeek]);
  const weekKey = (w: Week) => w.year * 1000 + w.month * 100 + w.weekOfMonth;
  const isLocked = !isSameWeek(selectedWeek, serverCurrentWeek);

  const resetFormState = () => {
    setFormData({});
    setNotesPhotos({});
    setNotesPhotoPreviews({});
    setCurrentPage(0);
    setSubmitResult(null);
    setAlreadySubmitted(false);
  };

  // ── 초기 로드: 서버 기준 현재 주차 + 접근 가능 교회 ────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [nowWeek, churchList] = await Promise.all([
          weeklyReportService.getServerCurrentWeek(),
          weeklyReportService.getAccessibleChurches()
        ]);
        setServerCurrentWeek(nowWeek);
        setSelectedWeek(nowWeek);
        setChurches(churchList);
        if (churchList.length === 1) {
          setSelectedChurchId(churchList[0].churchId);
        }
      } catch (e: any) {
        setLoadError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 교회가 정해지면 해당 교회의 전체 제출 이력을 불러와 주차 선택기에 제출완료 표시
  useEffect(() => {
    if (!selectedChurchId) return;
    weeklyReportService.getMySubmissions(selectedChurchId).then(subs => {
      setSubmittedWeekKeys(new Set(subs.map(s => s.reportYear * 1000 + s.reportMonth * 100 + s.reportWeekOfMonth)));
    }).catch(() => setSubmittedWeekKeys(new Set()));
  }, [selectedChurchId]);

  // 선택한 주차가 바뀌면: 그 주차에 적용되는 양식 + 기존 제출 데이터를 다시 불러온다
  useEffect(() => {
    const loadForWeek = async () => {
      try {
        setSchemaLoading(true);
        setLoadError(null);
        const schema = await weeklyReportService.getSchemaForWeek(selectedWeek);
        setActiveSchema(schema);
        setParsedSchema(JSON.parse(schema.formSchemaJson));
      } catch (e: any) {
        setActiveSchema(null);
        setParsedSchema(null);
        setLoadError(e.response?.status === 404
          ? '해당 주차에 적용할 주간보고 양식이 없습니다. 관리자에게 문의하세요.'
          : '양식을 불러오지 못했습니다.');
      } finally {
        setSchemaLoading(false);
      }
    };
    loadForWeek();
  }, [selectedWeek.year, selectedWeek.month, selectedWeek.weekOfMonth]);

  // 주차 또는 교회가 바뀌면: 기존 제출 데이터 로드 (있으면 편집/조회, 없으면 새 입력)
  useEffect(() => {
    if (!selectedChurchId) return;
    resetFormState();
    weeklyReportService.getMySubmission(selectedWeek, selectedChurchId).then(sub => {
      if (sub) {
        setAlreadySubmitted(true);
        try { setFormData(JSON.parse(sub.submitDataJson)); } catch {}
      }
    });
  }, [selectedChurchId, selectedWeek.year, selectedWeek.month, selectedWeek.weekOfMonth]);

  // ── 폼 데이터 업데이트 ───────────────────────────────────────────
  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateGroupedCell = (sectionId: string, leafKey: string, value: string) => {
    setFormData(prev => ({ ...prev, [sectionId]: { ...(prev[sectionId] || {}), [leafKey]: value } }));
  };

  const updateDynamicTableRow = (sectionId: string, rowIdx: number, col: string, value: string) => {
    setFormData(prev => {
      const rows = [...(prev[sectionId] || [{ }])];
      while (rows.length <= rowIdx) rows.push({});
      rows[rowIdx] = { ...rows[rowIdx], [col]: value };
      return { ...prev, [sectionId]: rows };
    });
  };

  const addDynamicTableRow = (sectionId: string, columns: string[]) => {
    setFormData(prev => {
      const rows = [...(prev[sectionId] || [])];
      const emptyRow: Record<string, string> = {};
      columns.forEach(c => { emptyRow[c] = ''; });
      rows.push(emptyRow);
      return { ...prev, [sectionId]: rows };
    });
  };

  const removeDynamicTableRow = (sectionId: string, rowIdx: number) => {
    setFormData(prev => {
      const rows = [...(prev[sectionId] || [])];
      rows.splice(rowIdx, 1);
      return { ...prev, [sectionId]: rows };
    });
  };

  // ── 특이사항 카드형 게시판(notes_board) 데이터 처리 — 사용자가 카드를 자유롭게 추가/삭제 ──
  const addNotesCard = (sectionId: string, maxCards?: number) => {
    setFormData(prev => {
      const cards: NotesCardEntry[] = [...(prev[sectionId] || [])];
      if (maxCards && cards.length >= maxCards) return prev;
      cards.push({ cardId: generateCardId(), title: '', value: '', photoPaths: [] });
      return { ...prev, [sectionId]: cards };
    });
  };

  const removeNotesCard = (sectionId: string, cardId: string) => {
    setFormData(prev => {
      const cards: NotesCardEntry[] = (prev[sectionId] || []).filter((c: NotesCardEntry) => c.cardId !== cardId);
      return { ...prev, [sectionId]: cards };
    });
    setNotesPhotos(prev => {
      const sectionMap = { ...(prev[sectionId] || {}) };
      delete sectionMap[cardId];
      return { ...prev, [sectionId]: sectionMap };
    });
    setNotesPhotoPreviews(prev => {
      const sectionMap = { ...(prev[sectionId] || {}) };
      delete sectionMap[cardId];
      return { ...prev, [sectionId]: sectionMap };
    });
  };

  const updateNotesCardField = (sectionId: string, cardId: string, field: 'title' | 'value', val: string) => {
    setFormData(prev => {
      const cards: NotesCardEntry[] = (prev[sectionId] || []).map((c: NotesCardEntry) =>
        c.cardId === cardId ? { ...c, [field]: val } : c);
      return { ...prev, [sectionId]: cards };
    });
  };

  const addNotesCardPhotos = (sectionId: string, cardId: string, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setNotesPhotos(prev => {
      const sectionMap = { ...(prev[sectionId] || {}) };
      const merged = [...(sectionMap[cardId] || []), ...newFiles].slice(0, 6);
      sectionMap[cardId] = merged;
      setNotesPhotoPreviews(pv => {
        const pvSection = { ...(pv[sectionId] || {}) };
        pvSection[cardId] = merged.map(f => URL.createObjectURL(f));
        return { ...pv, [sectionId]: pvSection };
      });
      return { ...prev, [sectionId]: sectionMap };
    });
  };

  const removeNotesCardPhoto = (sectionId: string, cardId: string, idx: number) => {
    setNotesPhotos(prev => {
      const sectionMap = { ...(prev[sectionId] || {}) };
      const filtered = (sectionMap[cardId] || []).filter((_, i) => i !== idx);
      sectionMap[cardId] = filtered;
      setNotesPhotoPreviews(pv => {
        const pvSection = { ...(pv[sectionId] || {}) };
        pvSection[cardId] = filtered.map(f => URL.createObjectURL(f));
        return { ...pv, [sectionId]: pvSection };
      });
      return { ...prev, [sectionId]: sectionMap };
    });
  };

  // ── 제출 ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeSchema || !selectedChurchId) {
      alert('교회를 선택해 주세요.');
      return;
    }
    if (isLocked) {
      alert('지난 주차는 수정할 수 없습니다.');
      return;
    }
    try {
      setSubmitting(true);

      // notes_board 카드에 첨부된 사진들을 한 번에 업로드하고, 카드별로 경로를 되돌려 배정
      const pendingEntries: { sectionId: string; cardId: string; files: File[] }[] = [];
      Object.entries(notesPhotos).forEach(([sectionId, cardMap]) => {
        Object.entries(cardMap).forEach(([cardId, files]) => {
          if (files.length > 0) pendingEntries.push({ sectionId, cardId, files });
        });
      });

      const finalData: Record<string, any> = JSON.parse(JSON.stringify(formData));
      finalData.church_name = churches.find(c => c.churchId === selectedChurchId)?.name;

      if (pendingEntries.length > 0) {
        const allFiles = pendingEntries.flatMap(e => e.files);
        const uploadedPaths = await weeklyReportService.uploadPhotos(allFiles);
        let cursor = 0;
        for (const entry of pendingEntries) {
          const paths = uploadedPaths.slice(cursor, cursor + entry.files.length);
          cursor += entry.files.length;
          const cards: NotesCardEntry[] = [...(finalData[entry.sectionId] || [])];
          const idx = cards.findIndex(c => c.cardId === entry.cardId);
          if (idx >= 0) {
            cards[idx] = { ...cards[idx], photoPaths: [...(cards[idx].photoPaths || []), ...paths] };
            finalData[entry.sectionId] = cards;
          }
        }
      }

      await weeklyReportService.submitReport({
        reportYear: selectedWeek.year,
        reportMonth: selectedWeek.month,
        reportWeekOfMonth: selectedWeek.weekOfMonth,
        churchId: selectedChurchId,
        submitDataJson: JSON.stringify(finalData),
      });

      setFormData(finalData);
      setNotesPhotos({});
      setNotesPhotoPreviews({});
      setSubmitResult('success');
      setSubmitMessage('주간보고가 성공적으로 제출되었습니다!');
      setAlreadySubmitted(true);
      setSubmittedWeekKeys(prev => new Set(prev).add(weekKey(selectedWeek)));
    } catch (e: any) {
      setSubmitResult('error');
      if (e.response?.status === 403) {
        setSubmitMessage(e.response?.data?.message || '담당 교회가 아니거나 지난 주차는 제출할 수 없습니다.');
      } else {
        setSubmitMessage(e.response?.data?.message || '제출에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 렌더링 ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#0f172a',
    fontSize: '0.875rem',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: '"Pretendard", "Noto Sans KR", -apple-system, sans-serif'
  };

  const numInputStyle: React.CSSProperties = {
    ...inputStyle,
    textAlign: 'center',
    padding: '6px 4px',
    fontSize: '0.875rem'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#475569', fontWeight: 600, fontFamily: '"Pretendard", "Noto Sans KR", sans-serif' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '10px', color: '#2563eb' }} /> 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 20px', fontFamily: '"Pretendard", "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif', color: '#1e293b' }}>
      {/* ── 헤더 ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#16224a', letterSpacing: '-0.3px' }}>📋 주간보고 입력</h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
              {activeSchema ? activeSchema.weekLabel : ''}
            </p>
          </div>
          {alreadySubmitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', color: '#047857', fontWeight: 700 }}>
              <CheckCircle2 size={15} /> 제출됨
            </div>
          )}
        </div>

        {/* 주차 선택기 */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, display: 'block', marginBottom: '6px' }}>보고 주차</label>
          <select
            value={weekKey(selectedWeek)}
            onChange={e => {
              const key = Number(e.target.value);
              const w = weekOptions.find(o => weekKey(o) === key);
              if (w) setSelectedWeek(w);
            }}
            style={{ ...inputStyle, maxWidth: '320px', cursor: 'pointer', fontWeight: 600 }}
          >
            {weekOptions.map(w => (
              <option key={weekKey(w)} value={weekKey(w)}>
                {formatWeekLabel(w)}{isSameWeek(w, serverCurrentWeek) ? ' (이번 주)' : ''}{submittedWeekKeys.has(weekKey(w)) ? ' ✓ 제출완료' : ''}
              </option>
            ))}
          </select>
        </div>

        {isLocked && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>
            <Lock size={15} /> 지난 주차는 수정할 수 없습니다. (읽기 전용) 정정 결재 기능은 추후 지원 예정입니다.
          </div>
        )}
      </div>

      {loadError && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '50px 24px', margin: '24px 0', background: '#ffffff', borderRadius: '16px',
          border: '1px solid #fee2e2', boxShadow: '0 4px 16px rgba(20,40,90,0.05)', color: '#1e293b'
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <AlertCircle size={30} color='#ef4444' />
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', textAlign: 'center', lineHeight: 1.5 }}>{loadError}</p>
        </div>
      )}

      {!loadError && schemaLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontWeight: 600 }}>양식 불러오는 중...</div>
      )}

      {!loadError && !schemaLoading && parsedSchema && activeSchema && (
        <>
          {/* 진행 표시줄 */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {parsedSchema.pages.map((p, i) => (
              <div key={p.pageId} style={{ flex: 1, height: '5px', borderRadius: '4px', background: i <= currentPage ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : '#e2e8f0', transition: 'background 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '20px' }}>
            {parsedSchema.pages.map((p, i) => (
              <span key={p.pageId} style={{ fontSize: '0.8rem', color: i === currentPage ? '#1d4ed8' : '#64748b', fontWeight: i === currentPage ? 700 : 500, textAlign: 'center', flex: 1 }}>
                {p.title}
              </span>
            ))}
          </div>

          {/* 제출 결과 배너 */}
          {submitResult && (
            <div style={{ background: submitResult === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${submitResult === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {submitResult === 'success' ? <CheckCircle2 size={18} color='#16a34a' /> : <AlertCircle size={18} color='#dc2626' />}
              <span style={{ color: submitResult === 'success' ? '#15803d' : '#b91c1c', fontWeight: 700, fontSize: '0.9rem' }}>{submitMessage}</span>
            </div>
          )}

          {/* ── 페이지 폼 ── */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(20,40,90,0.05)', padding: '28px', opacity: isLocked ? 0.85 : 1 }}>
            <PageRenderer
              page={parsedSchema.pages[currentPage]}
              pageIndex={currentPage}
              formData={formData}
              churches={churches}
              selectedChurchId={selectedChurchId}
              onChurchSelect={setSelectedChurchId}
              onUpdateField={updateField}
              onUpdateGroupedCell={updateGroupedCell}
              onUpdateDynamicTableRow={updateDynamicTableRow}
              onAddDynamicTableRow={addDynamicTableRow}
              onRemoveDynamicTableRow={removeDynamicTableRow}
              onAddNotesCard={addNotesCard}
              onRemoveNotesCard={removeNotesCard}
              onUpdateNotesCardField={updateNotesCardField}
              onAddNotesCardPhotos={addNotesCardPhotos}
              onRemoveNotesCardPhoto={removeNotesCardPhoto}
              notesPhotoPreviews={notesPhotoPreviews}
              inputStyle={inputStyle}
              numInputStyle={numInputStyle}
              disabled={isLocked}
            />
          </div>

          {/* ── 네비게이션 버튼 ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', gap: '12px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: currentPage === 0 ? '#f1f5f9' : '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: currentPage === 0 ? '#94a3b8' : '#334155', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
              <ChevronLeft size={16} /> 이전
            </button>

            {currentPage === parsedSchema.pages.length - 1 ? (
              !isLocked && (
                <button onClick={handleSubmit} disabled={submitting || !selectedChurchId}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 28px', background: (submitting || !selectedChurchId) ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, cursor: (submitting || !selectedChurchId) ? 'not-allowed' : 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', fontFamily: 'inherit' }}>
                  {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {submitting ? '제출 중...' : alreadySubmitted ? '재제출 (수정)' : '제출하기'}
                </button>
              )
            ) : (
              <button onClick={() => setCurrentPage(p => Math.min(parsedSchema.pages.length - 1, p + 1))}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', fontFamily: 'inherit' }}>
                다음 <ChevronRight size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

