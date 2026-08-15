import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  X, Plus, Image, Send, RefreshCw, Lock
} from 'lucide-react';
import {
  weeklyReportService,
  WeeklyReportSchemaItem,
  FormSchema,
  FormPage,
  FormSection,
  ChurchOption
} from '../../services/weeklyReportService';
import { Week, getCurrentWeek, enumerateWeeks, formatWeekLabel, isSameWeek } from '../../utils/weekUtil';

interface NotesCardValue { value?: string; photoPaths?: string[] }

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

  // ── 특이사항 카드형 게시판(notes_board) 데이터 처리 ─────────────────
  const updateNotesCardValue = (sectionId: string, cardId: string, value: string) => {
    setFormData(prev => {
      const section: Record<string, NotesCardValue> = { ...(prev[sectionId] || {}) };
      section[cardId] = { ...(section[cardId] || {}), value };
      return { ...prev, [sectionId]: section };
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
          const sectionData = { ...(finalData[entry.sectionId] || {}) };
          const existing: NotesCardValue = sectionData[entry.cardId] || {};
          sectionData[entry.cardId] = { ...existing, photoPaths: [...(existing.photoPaths || []), ...paths] };
          finalData[entry.sectionId] = sectionData;
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

  // ── 렌더링 ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)',
    borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box'
  };

  const numInputStyle: React.CSSProperties = {
    ...inputStyle, textAlign: 'center', padding: '6px 4px', fontSize: '0.85rem'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} /> 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      {/* ── 헤더 ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>📋 주간보고 입력</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              {activeSchema ? activeSchema.weekLabel : ''}
            </p>
          </div>
          {alreadySubmitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', color: '#6ee7b7' }}>
              <CheckCircle2 size={13} /> 제출됨
            </div>
          )}
        </div>

        {/* 주차 선택기 */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>보고 주차</label>
          <select
            value={weekKey(selectedWeek)}
            onChange={e => {
              const key = Number(e.target.value);
              const w = weekOptions.find(o => weekKey(o) === key);
              if (w) setSelectedWeek(w);
            }}
            style={{ ...inputStyle, maxWidth: '320px', cursor: 'pointer' }}
          >
            {weekOptions.map(w => (
              <option key={weekKey(w)} value={weekKey(w)}>
                {formatWeekLabel(w)}{isSameWeek(w, serverCurrentWeek) ? ' (이번 주)' : ''}{submittedWeekKeys.has(weekKey(w)) ? ' ✓ 제출완료' : ''}
              </option>
            ))}
          </select>
        </div>

        {isLocked && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#fcd34d' }}>
            <Lock size={14} /> 지난 주차는 수정할 수 없습니다. (읽기 전용) 정정 결재 기능은 추후 지원 예정입니다.
          </div>
        )}
      </div>

      {loadError && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', color: '#94a3b8' }}>
          <AlertCircle size={36} color='#475569' />
          <p style={{ margin: 0 }}>{loadError}</p>
        </div>
      )}

      {!loadError && schemaLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>양식 불러오는 중...</div>
      )}

      {!loadError && !schemaLoading && parsedSchema && activeSchema && (
        <>
          {/* 진행 표시줄 */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {parsedSchema.pages.map((p, i) => (
              <div key={p.pageId} style={{ flex: 1, height: '4px', borderRadius: '4px', background: i <= currentPage ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(51,65,85,0.6)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '20px' }}>
            {parsedSchema.pages.map((p, i) => (
              <span key={p.pageId} style={{ fontSize: '0.75rem', color: i === currentPage ? '#a5b4fc' : '#475569', fontWeight: i === currentPage ? 600 : 400, textAlign: 'center', flex: 1 }}>
                {p.title}
              </span>
            ))}
          </div>

          {/* 제출 결과 배너 */}
          {submitResult && (
            <div style={{ background: submitResult === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${submitResult === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {submitResult === 'success' ? <CheckCircle2 size={18} color='#10b981' /> : <AlertCircle size={18} color='#ef4444' />}
              <span style={{ color: submitResult === 'success' ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>{submitMessage}</span>
            </div>
          )}

          {/* ── 페이지 폼 ── */}
          <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(51,65,85,0.4)', padding: '24px', backdropFilter: 'blur(8px)', opacity: isLocked ? 0.75 : 1 }}>
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
              onUpdateNotesCardValue={updateNotesCardValue}
              onAddNotesCardPhotos={addNotesCardPhotos}
              onRemoveNotesCardPhoto={removeNotesCardPhoto}
              notesPhotoPreviews={notesPhotoPreviews}
              inputStyle={inputStyle}
              numInputStyle={numInputStyle}
              disabled={isLocked}
            />
          </div>

          {/* ── 네비게이션 버튼 ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '12px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: currentPage === 0 ? 'rgba(30,41,59,0.3)' : 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', color: currentPage === 0 ? '#334155' : '#94a3b8', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
              <ChevronLeft size={16} /> 이전
            </button>

            {currentPage === parsedSchema.pages.length - 1 ? (
              !isLocked && (
                <button onClick={handleSubmit} disabled={submitting || !selectedChurchId}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 28px', background: (submitting || !selectedChurchId) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, cursor: (submitting || !selectedChurchId) ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                  {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {submitting ? '제출 중...' : alreadySubmitted ? '재제출 (수정)' : '제출하기'}
                </button>
              )
            ) : (
              <button onClick={() => setCurrentPage(p => Math.min(parsedSchema.pages.length - 1, p + 1))}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                다음 <ChevronRight size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── 페이지 렌더러 ─────────────────────────────────────────────────
interface PageRendererProps {
  page: FormPage;
  pageIndex: number;
  formData: Record<string, any>;
  churches: ChurchOption[];
  selectedChurchId: number | null;
  onChurchSelect: (id: number) => void;
  onUpdateField: (key: string, value: any) => void;
  onUpdateGroupedCell: (sid: string, leafKey: string, val: string) => void;
  onUpdateDynamicTableRow: (sid: string, rowIdx: number, col: string, val: string) => void;
  onAddDynamicTableRow: (sid: string, cols: string[]) => void;
  onRemoveDynamicTableRow: (sid: string, rowIdx: number) => void;
  onUpdateNotesCardValue: (sid: string, cardId: string, val: string) => void;
  onAddNotesCardPhotos: (sid: string, cardId: string, files: FileList | null) => void;
  onRemoveNotesCardPhoto: (sid: string, cardId: string, idx: number) => void;
  notesPhotoPreviews: Record<string, Record<string, string[]>>;
  inputStyle: React.CSSProperties;
  numInputStyle: React.CSSProperties;
  disabled: boolean;
}

const PageRenderer: React.FC<PageRendererProps> = ({
  page, pageIndex, formData, churches, selectedChurchId, onChurchSelect,
  onUpdateField, onUpdateGroupedCell, onUpdateDynamicTableRow, onAddDynamicTableRow, onRemoveDynamicTableRow,
  onUpdateNotesCardValue, onAddNotesCardPhotos, onRemoveNotesCardPhoto, notesPhotoPreviews,
  inputStyle, numInputStyle, disabled
}) => {

  const labelStyle: React.CSSProperties = { fontSize: '0.82rem', color: '#64748b', marginBottom: '4px', display: 'block' };
  const sectionTitleStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(99,102,241,0.2)' };
  const thStyle: React.CSSProperties = { padding: '8px 10px', background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.4)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' };

  return (
    <div>
      <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9' }}>
        Page {pageIndex + 1} — {page.title}
      </h3>

      {/* 일반 필드 (Page 1) */}
      {page.fields?.map(field => (
        <div key={field.fieldId} style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{field.label}{field.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}</label>
          {field.type === 'church_select' ? (
            <div style={{ position: 'relative' }}>
              <select value={selectedChurchId || ''} onChange={e => onChurchSelect(Number(e.target.value))} disabled={disabled}
                style={{ ...inputStyle, appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                <option value="">-- 교회 선택 --</option>
                {churches.map(c => (
                  <option key={c.churchId} value={c.churchId}>{c.name} ({c.country})</option>
                ))}
              </select>
              {churches.length <= 1 && selectedChurchId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>
                  <Lock size={11} /> 담당 교회로 자동 설정됨
                </div>
              )}
            </div>
          ) : (
            <input type={field.type === 'date' ? 'date' : 'text'} disabled={disabled}
              value={formData[field.fieldId] || ''}
              onChange={e => onUpdateField(field.fieldId, e.target.value)}
              style={inputStyle}
              placeholder={field.placeholder || `${field.label} 입력`} />
          )}
        </div>
      ))}

      {/* 섹션 렌더링 (Page 2, 3) */}
      {page.sections?.map(section => (
        <div key={section.sectionId} style={{ marginBottom: '28px' }}>
          <div style={sectionTitleStyle}>{section.title}</div>

          {/* 요약형 병합헤더 표 (예배출결/선교센터/전도현황) */}
          {section.type === 'grouped_table' && section.leafColumns && (
            <GroupedTable
              section={section}
              value={formData[section.sectionId] || {}}
              onChange={(leafKey, val) => onUpdateGroupedCell(section.sectionId, leafKey, val)}
              thStyle={thStyle}
              numInputStyle={numInputStyle}
              disabled={disabled}
            />
          )}

          {/* 동적 테이블 (주간 교육 현황) */}
          {section.type === 'dynamic_table' && section.columns && (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {section.columns.map(col => (<th key={col} style={thStyle}>{col}</th>))}
                      {!disabled && <th style={{ ...thStyle, width: '40px' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(formData[section.sectionId] || [{}]).map((row: any, rowIdx: number) => (
                      <tr key={rowIdx}>
                        {section.columns!.map(col => (
                          <td key={col} style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}>
                            <input type="text" disabled={disabled} value={row[col] || ''}
                              onChange={e => onUpdateDynamicTableRow(section.sectionId, rowIdx, col, e.target.value)}
                              style={{ ...inputStyle, padding: '6px 8px' }} />
                          </td>
                        ))}
                        {!disabled && (
                          <td style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)', textAlign: 'center' }}>
                            <button onClick={() => onRemoveDynamicTableRow(section.sectionId, rowIdx)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', color: '#f87171', cursor: 'pointer', padding: '4px 6px' }}>
                              <X size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!disabled && (
                <button onClick={() => onAddDynamicTableRow(section.sectionId, section.columns!)}
                  style={{ marginTop: '8px', padding: '7px 16px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.4)', borderRadius: '8px', color: '#818cf8', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={13} /> 행 추가
                </button>
              )}
            </div>
          )}

          {/* 특이사항 카드형 게시판 */}
          {section.type === 'notes_board' && section.cards && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {section.cards.map(card => {
                const cardValue: NotesCardValue = (formData[section.sectionId] || {})[card.cardId] || {};
                const previews = notesPhotoPreviews[section.sectionId]?.[card.cardId] || [];
                return (
                  <div key={card.cardId} style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>{card.title}</div>
                    {card.subtitle && <div style={{ fontSize: '0.75rem', color: '#818cf8', marginBottom: '8px' }}>{card.subtitle}</div>}
                    {!card.subtitle && <div style={{ marginBottom: '8px' }} />}

                    {card.inputType === 'number' ? (
                      <input type="number" min="0" disabled={disabled} value={cardValue.value || ''}
                        onChange={e => onUpdateNotesCardValue(section.sectionId, card.cardId, e.target.value)}
                        style={numInputStyle} />
                    ) : (
                      <>
                        <textarea disabled={disabled} value={cardValue.value || ''}
                          onChange={e => onUpdateNotesCardValue(section.sectionId, card.cardId, e.target.value)}
                          placeholder="내용 입력"
                          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', marginBottom: '8px' }} />
                        {!disabled && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#818cf8', cursor: 'pointer' }}>
                            <Image size={12} /> 사진 첨부
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                              onChange={e => onAddNotesCardPhotos(section.sectionId, card.cardId, e.target.files)} />
                          </label>
                        )}
                        {previews.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                            {previews.map((url, i) => (
                              <div key={i} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden' }}>
                                <img src={url} alt="" style={{ width: '100%', height: '48px', objectFit: 'cover' }} />
                                {!disabled && (
                                  <button onClick={() => onRemoveNotesCardPhoto(section.sectionId, card.cardId, i)}
                                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '2px' }}>
                                    <X size={9} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(cardValue.photoPaths?.length || 0) > 0 && (
                          <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                            기존 첨부 {cardValue.photoPaths!.length}장
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── 병합헤더 요약표 (grouped_table) ────────────────────────────────
const GroupedTable: React.FC<{
  section: FormSection;
  value: Record<string, string>;
  onChange: (leafKey: string, val: string) => void;
  thStyle: React.CSSProperties;
  numInputStyle: React.CSSProperties;
  disabled: boolean;
}> = ({ section, value, onChange, thStyle, numInputStyle, disabled }) => {
  const leaves = section.leafColumns || [];
  const hasGroups = leaves.some(l => l.groupLabel);

  const topRow: React.ReactNode[] = [];
  let i = 0;
  while (i < leaves.length) {
    const leaf = leaves[i];
    if (leaf.groupLabel) {
      let j = i;
      while (j < leaves.length && leaves[j].groupLabel === leaf.groupLabel) j++;
      topRow.push(<th key={leaf.key} style={thStyle} colSpan={j - i}>{leaf.groupLabel}</th>);
      i = j;
    } else {
      topRow.push(<th key={leaf.key} style={thStyle} rowSpan={hasGroups ? 2 : 1}>{leaf.label}</th>);
      i++;
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr>{topRow}</tr>
          {hasGroups && (
            <tr>
              {leaves.filter(l => l.groupLabel).map(l => (<th key={l.key} style={thStyle}>{l.label}</th>))}
            </tr>
          )}
        </thead>
        <tbody>
          <tr>
            {leaves.map(leaf => (
              <td key={leaf.key} style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}>
                <input type="number" min="0" disabled={disabled} value={value[leaf.key] || ''}
                  onChange={e => onChange(leaf.key, e.target.value)}
                  style={numInputStyle} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
