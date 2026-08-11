import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Upload, X, Plus, Trash2, Image, Send, RefreshCw, Lock
} from 'lucide-react';
import {
  weeklyReportService,
  WeeklyReportSchemaItem,
  FormSchema,
  FormPage,
  FormSection,
  ChurchOption
} from '../../services/weeklyReportService';

// ─── 유틸: 로컬스토리지에서 사용자 정보 ─────────────────────────────
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export const WeeklyReportPage: React.FC = () => {
  const [activeSchema, setActiveSchema] = useState<WeeklyReportSchemaItem | null>(null);
  const [parsedSchema, setParsedSchema] = useState<FormSchema | null>(null);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = getCurrentUser();

  // ── 데이터 로드 ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [schema, churchList] = await Promise.all([
          weeklyReportService.getActiveSchema(),
          weeklyReportService.getAccessibleChurches()
        ]);
        setActiveSchema(schema);
        setParsedSchema(JSON.parse(schema.formSchemaJson));
        setChurches(churchList);

        // 교회 1개뿐이면 자동 선택
        if (churchList.length === 1) {
          setSelectedChurchId(churchList[0].churchId);
        }
      } catch (e: any) {
        if (e.response?.status === 404) {
          setLoadError('현재 활성화된 주간보고 양식이 없습니다. 관리자에게 문의하세요.');
        } else {
          setLoadError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 교회 선택 시 기존 제출 여부 확인
  useEffect(() => {
    if (!activeSchema || !selectedChurchId) return;
    weeklyReportService.getMySubmission(activeSchema.schemaId, selectedChurchId).then(sub => {
      if (sub) {
        setAlreadySubmitted(true);
        // 기존 데이터 로드
        try {
          const existing = JSON.parse(sub.submitDataJson);
          setFormData(existing);
        } catch {}
      } else {
        setAlreadySubmitted(false);
      }
    });
  }, [activeSchema, selectedChurchId]);

  // ── 사진 처리 ────────────────────────────────────────────────────
  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const maxPhotos = 10;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const merged = [...photos, ...newFiles].slice(0, maxPhotos);
    setPhotos(merged);
    const urls = merged.map(f => URL.createObjectURL(f));
    setPhotoPreviewUrls(urls);
  };

  const removePhoto = (idx: number) => {
    const newPhotos = photos.filter((_, i) => i !== idx);
    const newUrls = photoPreviewUrls.filter((_, i) => i !== idx);
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newUrls);
  };

  // ── 폼 데이터 업데이트 ───────────────────────────────────────────
  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateTableCell = (sectionId: string, rowId: string, col: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [rowId]: { ...(prev[sectionId]?.[rowId] || {}), [col]: value }
      }
    }));
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

  const addDynamicField = (sectionId: string) => {
    setFormData(prev => {
      const fields = [...(prev[sectionId] || [])];
      fields.push({ label: '항목명', value: '' });
      return { ...prev, [sectionId]: fields };
    });
  };

  const updateDynamicField = (sectionId: string, idx: number, key: 'label' | 'value', val: string) => {
    setFormData(prev => {
      const fields = [...(prev[sectionId] || [])];
      fields[idx] = { ...fields[idx], [key]: val };
      return { ...prev, [sectionId]: fields };
    });
  };

  const removeDynamicField = (sectionId: string, idx: number) => {
    setFormData(prev => {
      const fields = [...(prev[sectionId] || [])];
      fields.splice(idx, 1);
      return { ...prev, [sectionId]: fields };
    });
  };

  // ── 제출 ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeSchema || !selectedChurchId) {
      alert('교회를 선택해 주세요.');
      return;
    }
    try {
      setSubmitting(true);
      let photoPaths: string[] | null = null;

      if (photos.length > 0) {
        photoPaths = await weeklyReportService.uploadPhotos(photos);
      }

      const finalData = { ...formData, church_name: churches.find(c => c.churchId === selectedChurchId)?.name };

      await weeklyReportService.submitReport({
        schemaId: activeSchema.schemaId,
        churchId: selectedChurchId,
        submitDataJson: JSON.stringify(finalData),
        photoPaths: photoPaths ? JSON.stringify(photoPaths) : undefined
      });

      setSubmitResult('success');
      setSubmitMessage('주간보고가 성공적으로 제출되었습니다!');
      setAlreadySubmitted(true);
    } catch (e: any) {
      setSubmitResult('error');
      if (e.response?.status === 403) {
        setSubmitMessage('담당 교회가 아닌 교회에는 제출할 수 없습니다.');
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
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} /> 양식 불러오는 중...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px', color: '#94a3b8' }}>
        <AlertCircle size={36} color='#475569' />
        <p style={{ margin: 0 }}>{loadError}</p>
      </div>
    );
  }

  if (!parsedSchema || !activeSchema) return null;

  const pages = parsedSchema.pages;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      {/* ── 헤더 ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>📋 주간보고 취합</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              {activeSchema.weekLabel}
            </p>
          </div>
          {alreadySubmitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', color: '#6ee7b7' }}>
              <CheckCircle2 size={13} /> 이미 제출됨 (수정 가능)
            </div>
          )}
        </div>

        {/* 진행 표시줄 */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '6px' }}>
          {pages.map((p, i) => (
            <div key={p.pageId} style={{ flex: 1, height: '4px', borderRadius: '4px', background: i <= currentPage ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(51,65,85,0.6)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {pages.map((p, i) => (
            <span key={p.pageId} style={{ fontSize: '0.75rem', color: i === currentPage ? '#a5b4fc' : '#475569', fontWeight: i === currentPage ? 600 : 400, textAlign: 'center', flex: 1 }}>
              {p.title}
            </span>
          ))}
        </div>
      </div>

      {/* 제출 결과 배너 */}
      {submitResult && (
        <div style={{ background: submitResult === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${submitResult === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {submitResult === 'success' ? <CheckCircle2 size={18} color='#10b981' /> : <AlertCircle size={18} color='#ef4444' />}
          <span style={{ color: submitResult === 'success' ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>{submitMessage}</span>
        </div>
      )}

      {/* ── 페이지 폼 ── */}
      <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(51,65,85,0.4)', padding: '24px', backdropFilter: 'blur(8px)' }}>
        <PageRenderer
          page={pages[currentPage]}
          pageIndex={currentPage}
          formData={formData}
          churches={churches}
          selectedChurchId={selectedChurchId}
          onChurchSelect={setSelectedChurchId}
          onUpdateField={updateField}
          onUpdateTableCell={updateTableCell}
          onUpdateDynamicTableRow={updateDynamicTableRow}
          onAddDynamicTableRow={addDynamicTableRow}
          onRemoveDynamicTableRow={removeDynamicTableRow}
          onAddDynamicField={addDynamicField}
          onUpdateDynamicField={updateDynamicField}
          onRemoveDynamicField={removeDynamicField}
          photos={photos}
          photoPreviewUrls={photoPreviewUrls}
          onPhotoAdd={handlePhotoAdd}
          onRemovePhoto={removePhoto}
          fileInputRef={fileInputRef}
          inputStyle={inputStyle}
          numInputStyle={numInputStyle}
        />
      </div>

      {/* ── 네비게이션 버튼 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '12px' }}>
        <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: currentPage === 0 ? 'rgba(30,41,59,0.3)' : 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '10px', color: currentPage === 0 ? '#334155' : '#94a3b8', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
          <ChevronLeft size={16} /> 이전
        </button>

        {isLastPage ? (
          <button onClick={handleSubmit} disabled={submitting || !selectedChurchId}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 28px', background: (submitting || !selectedChurchId) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 700, cursor: (submitting || !selectedChurchId) ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
            {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            {submitting ? '제출 중...': alreadySubmitted ? '재제출 (수정)': '제출하기'}
          </button>
        ) : (
          <button onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            다음 <ChevronRight size={16} />
          </button>
        )}
      </div>
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
  onUpdateTableCell: (sid: string, rowId: string, col: string, val: string) => void;
  onUpdateDynamicTableRow: (sid: string, rowIdx: number, col: string, val: string) => void;
  onAddDynamicTableRow: (sid: string, cols: string[]) => void;
  onRemoveDynamicTableRow: (sid: string, rowIdx: number) => void;
  onAddDynamicField: (sid: string) => void;
  onUpdateDynamicField: (sid: string, idx: number, key: 'label' | 'value', val: string) => void;
  onRemoveDynamicField: (sid: string, idx: number) => void;
  photos: File[];
  photoPreviewUrls: string[];
  onPhotoAdd: (files: FileList | null) => void;
  onRemovePhoto: (idx: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputStyle: React.CSSProperties;
  numInputStyle: React.CSSProperties;
}

const PageRenderer: React.FC<PageRendererProps> = ({
  page, pageIndex, formData, churches, selectedChurchId, onChurchSelect,
  onUpdateField, onUpdateTableCell, onUpdateDynamicTableRow, onAddDynamicTableRow,
  onRemoveDynamicTableRow, onAddDynamicField, onUpdateDynamicField, onRemoveDynamicField,
  photos, photoPreviewUrls, onPhotoAdd, onRemovePhoto, fileInputRef, inputStyle, numInputStyle
}) => {

  const labelStyle: React.CSSProperties = { fontSize: '0.82rem', color: '#64748b', marginBottom: '4px', display: 'block' };
  const sectionTitleStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(99,102,241,0.2)' };

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
              <select value={selectedChurchId || ''} onChange={e => onChurchSelect(Number(e.target.value))}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
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
            <input type={field.type === 'date' ? 'date' : 'text'}
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

          {/* 일반 테이블 (예배출결, 선교센터 등) */}
          {section.type === 'table' && section.rows && section.columns && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    {section.columns.map(col => (
                      <th key={col} style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.4)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map(row => (
                    <tr key={row.rowId}>
                      <td style={{ padding: '8px 12px', border: '1px solid rgba(51,65,85,0.3)', color: '#94a3b8', background: 'rgba(15,23,42,0.5)', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.label}</td>
                      {section.columns!.slice(1).map(col => (
                        <td key={col} style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}>
                          <input type="number" min="0"
                            value={formData[section.sectionId]?.[row.rowId]?.[col] || ''}
                            onChange={e => onUpdateTableCell(section.sectionId, row.rowId, col, e.target.value)}
                            style={numInputStyle} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 동적 테이블 (주간 교육 현황 등) */}
          {section.type === 'dynamic_table' && section.columns && (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {section.columns.map(col => (
                        <th key={col} style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.4)', fontWeight: 600, textAlign: 'center' }}>{col}</th>
                      ))}
                      <th style={{ padding: '8px 10px', background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.4)', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData[section.sectionId] || [{}]).map((row: any, rowIdx: number) => (
                      <tr key={rowIdx}>
                        {section.columns!.map(col => (
                          <td key={col} style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}>
                            <input type="text" value={row[col] || ''}
                              onChange={e => onUpdateDynamicTableRow(section.sectionId, rowIdx, col, e.target.value)}
                              style={{ ...inputStyle, padding: '6px 8px' }} />
                          </td>
                        ))}
                        <td style={{ padding: '4px', border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)', textAlign: 'center' }}>
                          <button onClick={() => onRemoveDynamicTableRow(section.sectionId, rowIdx)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', color: '#f87171', cursor: 'pointer', padding: '4px 6px' }}>
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => onAddDynamicTableRow(section.sectionId, section.columns!)}
                style={{ marginTop: '8px', padding: '7px 16px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.4)', borderRadius: '8px', color: '#818cf8', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={13} /> 행 추가
              </button>
            </div>
          )}

          {/* 동적 필드 (주간 특이사항 등) */}
          {section.type === 'dynamic_fields' && (
            <div>
              {(formData[section.sectionId] || []).map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <input value={item.label || ''}
                    onChange={e => onUpdateDynamicField(section.sectionId, idx, 'label', e.target.value)}
                    style={{ ...inputStyle, width: '140px', flexShrink: 0 }}
                    placeholder="항목명" />
                  <input value={item.value || ''}
                    onChange={e => onUpdateDynamicField(section.sectionId, idx, 'value', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="내용 입력" />
                  <button onClick={() => onRemoveDynamicField(section.sectionId, idx)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', cursor: 'pointer', padding: '8px', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => onAddDynamicField(section.sectionId)}
                style={{ padding: '7px 16px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.4)', borderRadius: '8px', color: '#818cf8', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={13} /> 항목 추가
              </button>
            </div>
          )}

          {/* 사진 업로드 */}
          {section.type === 'photo_upload' && (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => onPhotoAdd(e.target.files)} />
              <div onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed rgba(99,102,241,0.4)', borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: 'rgba(99,102,241,0.05)', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}>
                <Upload size={28} color='#6366f1' style={{ marginBottom: '8px' }} />
                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>클릭하여 사진 업로드</p>
                <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.78rem' }}>
                  최대 {section.maxFiles || 10}장 · JPG, PNG, WEBP
                </p>
              </div>
              {photoPreviewUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.4)' }}>
                      <img src={url} alt={`미리보기 ${i+1}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                      <button onClick={() => onRemovePhoto(i)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photoPreviewUrls.length > 0 && (
                <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '6px' }}>
                  <Image size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  {photoPreviewUrls.length}장 선택됨
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

