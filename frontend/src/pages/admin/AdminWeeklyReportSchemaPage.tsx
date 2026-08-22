import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  FileText, ToggleLeft, ToggleRight, Eye, Save, X, AlertCircle, Smartphone, Presentation, GripVertical
} from 'lucide-react';
import { weeklyReportService, WeeklyReportSchemaItem, FormSchema, FormSection, ChurchOption } from '../../services/weeklyReportService';
import { DEFAULT_SCHEMA } from '../../data/weeklyReportDefaultSchema';
import { getCurrentWeek, weeksInMonth, formatWeekLabel } from '../../utils/weekUtil';
import { PageRenderer, NotesCardEntry, generateCardId } from '../../components/weeklyReport/FormRenderer';
import { CoverSlide, PageSlide } from '../../components/weeklyReport/WeeklyReportPresentationView';

interface BuilderFormData { weekLabel: string; startYear: number; startMonth: number; startWeekOfMonth: number; schema: FormSchema }

function buildDefaultFormData(): BuilderFormData {
  const w = getCurrentWeek();
  return {
    weekLabel: `${w.year}년 ${w.month}월 ${w.weekOfMonth}주차부터`,
    startYear: w.year, startMonth: w.month, startWeekOfMonth: w.weekOfMonth,
    schema: JSON.parse(JSON.stringify(DEFAULT_SCHEMA)) as FormSchema
  };
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────
export const AdminWeeklyReportSchemaPage: React.FC = () => {
  const [schemas, setSchemas] = useState<WeeklyReportSchemaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSchema, setEditingSchema] = useState<WeeklyReportSchemaItem | null>(null);
  const [formData, setFormData] = useState<BuilderFormData>(buildDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'none' | 'json' | 'form' | 'ppt'>('none');
  const [expandedPage, setExpandedPage] = useState<string | null>('page2');
  const [dragLeaf, setDragLeaf] = useState<{ pageIdx: number; secIdx: number; idx: number } | null>(null);
  const [dragCol, setDragCol] = useState<{ pageIdx: number; secIdx: number; idx: number } | null>(null);

  const loadSchemas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await weeklyReportService.getSchemas();
      setSchemas(data);
    } catch (e: any) {
      setError('양식 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchemas(); }, [loadSchemas]);

  const openNewBuilder = () => {
    setFormData(buildDefaultFormData());
    setEditingSchema(null);
    setShowBuilder(true);
    setExpandedPage('page2');
  };

  const openEditBuilder = (s: WeeklyReportSchemaItem) => {
    setFormData({
      weekLabel: s.weekLabel,
      startYear: s.startYear,
      startMonth: s.startMonth,
      startWeekOfMonth: s.startWeekOfMonth,
      schema: JSON.parse(s.formSchemaJson)
    });
    setEditingSchema(s);
    setShowBuilder(true);
    setExpandedPage('page2');
  };

  const handleSave = async () => {
    if (!formData.weekLabel.trim()) { alert('표시 라벨을 입력해 주세요.'); return; }
    try {
      setSaving(true);
      const payload = {
        weekLabel: formData.weekLabel,
        startYear: formData.startYear,
        startMonth: formData.startMonth,
        startWeekOfMonth: formData.startWeekOfMonth,
        formSchemaJson: JSON.stringify(formData.schema),
      };
      if (editingSchema) {
        await weeklyReportService.updateSchema(editingSchema.schemaId, payload);
      } else {
        await weeklyReportService.createSchema(payload);
      }
      setShowBuilder(false);
      await loadSchemas();
    } catch (e: any) {
      alert('저장에 실패했습니다: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (s: WeeklyReportSchemaItem) => {
    try {
      if (s.isEnabled) {
        await weeklyReportService.disableSchema(s.schemaId);
      } else {
        await weeklyReportService.enableSchema(s.schemaId);
      }
      await loadSchemas();
    } catch (e: any) {
      alert('사용 여부 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (schemaId: number) => {
    if (!confirm('이 양식을 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.')) return;
    try {
      await weeklyReportService.deleteSchema(schemaId);
      await loadSchemas();
    } catch (e: any) {
      alert(e.response?.data?.message || '삭제에 실패했습니다. 사용중인 양식은 먼저 사용 중지 해주세요.');
    }
  };

  // ── Schema 편집 헬퍼 ──────────────────────────────────────────────────
  const updateSection = (pageIdx: number, secIdx: number, updater: (s: FormSection) => FormSection) => {
    setFormData(prev => {
      const schema = JSON.parse(JSON.stringify(prev.schema)) as FormSchema;
      const sections = schema.pages[pageIdx].sections!;
      sections[secIdx] = updater(sections[secIdx]);
      return { ...prev, schema };
    });
  };

  // grouped_table: leaf 컬럼 편집
  const updateLeafLabel = (pageIdx: number, secIdx: number, leafIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      leaves[leafIdx] = { ...leaves[leafIdx], label: value };
      return { ...s, leafColumns: leaves };
    });
  };
  const updateLeafGroup = (pageIdx: number, secIdx: number, leafIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      leaves[leafIdx] = { ...leaves[leafIdx], groupLabel: value || undefined };
      return { ...s, leafColumns: leaves };
    });
  };
  const updateLeafKey = (pageIdx: number, secIdx: number, leafIdx: number, value: string) => {
    const sanitized = value.replace(/[^A-Za-z0-9_]/g, '_');
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      leaves[leafIdx] = { ...leaves[leafIdx], key: sanitized };
      return { ...s, leafColumns: leaves };
    });
  };
  const updateLeafFormula = (pageIdx: number, secIdx: number, leafIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      leaves[leafIdx] = { ...leaves[leafIdx], formula: value || undefined };
      return { ...s, leafColumns: leaves };
    });
  };
  const addLeafColumn = (pageIdx: number, secIdx: number) => {
    updateSection(pageIdx, secIdx, s => ({
      ...s, leafColumns: [...(s.leafColumns || []), { key: `col_${Date.now()}`, label: '새 컬럼' }]
    }));
  };
  const removeLeafColumn = (pageIdx: number, secIdx: number, leafIdx: number) => {
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      if (leaves.length <= 1) return s;
      leaves.splice(leafIdx, 1);
      return { ...s, leafColumns: leaves };
    });
  };
  const moveLeafColumn = (pageIdx: number, secIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    updateSection(pageIdx, secIdx, s => {
      const leaves = [...(s.leafColumns || [])];
      const [moved] = leaves.splice(fromIdx, 1);
      leaves.splice(toIdx, 0, moved);
      return { ...s, leafColumns: leaves };
    });
  };

  // dynamic_table: 컬럼 편집
  const updateColumnName = (pageIdx: number, secIdx: number, colIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const cols = [...(s.columns || [])];
      cols[colIdx] = value;
      return { ...s, columns: cols };
    });
  };
  const addColumn = (pageIdx: number, secIdx: number) => {
    updateSection(pageIdx, secIdx, s => ({ ...s, columns: [...(s.columns || []), '새 컬럼'] }));
  };
  const removeColumn = (pageIdx: number, secIdx: number, colIdx: number) => {
    updateSection(pageIdx, secIdx, s => {
      const cols = [...(s.columns || [])];
      if (cols.length <= 1) return s;
      cols.splice(colIdx, 1);
      return { ...s, columns: cols };
    });
  };
  const moveColumn = (pageIdx: number, secIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    updateSection(pageIdx, secIdx, s => {
      const cols = [...(s.columns || [])];
      const [moved] = cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, moved);
      return { ...s, columns: cols };
    });
  };

  // notes_board: 카드 최대 개수 설정 (개별 카드는 사용자가 화면에서 직접 추가)
  const updateMaxCards = (pageIdx: number, secIdx: number, value: number) => {
    updateSection(pageIdx, secIdx, s => ({ ...s, maxCards: value }));
  };

  const inputSm: React.CSSProperties = { background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', color: '#0f172a', fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#1e293b', fontFamily: '"Pretendard", "Noto Sans KR", -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16224a', margin: 0, letterSpacing: '-0.3px' }}>📋 주차별 양식 관리</h1>
          <p style={{ color: '#475569', marginTop: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
            적용 시작 주차를 지정해 두면, 그 주차부터 다음 양식이 시작되는 주차 전까지 자동으로 이 양식이 적용됩니다.
          </p>
        </div>
        <button onClick={openNewBuilder} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
          borderRadius: '10px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(37,99,235,0.25)', fontFamily: 'inherit'
        }}>
          <Plus size={16} /> 새 양식 만들기
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={16} color='#dc2626' /> <span style={{ color: '#991b1b', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569', fontWeight: 600 }}>불러오는 중...</div>
      ) : schemas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <FileText size={48} color='#94a3b8' style={{ marginBottom: '16px' }} />
          <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600 }}>아직 생성된 양식이 없습니다.</p>
          <button onClick={openNewBuilder} style={{ marginTop: '16px', padding: '10px 24px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            첫 번째 양식 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {schemas.map(s => (
            <div key={s.schemaId} style={{
              background: '#ffffff', border: s.isEnabled ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
              borderRadius: '14px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: s.isEnabled ? '0 4px 16px rgba(37,99,235,0.08)' : '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.isEnabled ? '#eff6ff' : '#f1f5f9',
                }}>
                  <FileText size={20} color={s.isEnabled ? '#2563eb' : '#64748b'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{s.weekLabel}</span>
                    {s.isEnabled && (
                      <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        ✓ 사용중
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px', fontWeight: 500 }}>
                    적용: {s.startYear}년 {s.startMonth}월 {s.startWeekOfMonth}주차부터 · 생성자: {s.createdBy || '-'} · {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => handleToggleEnabled(s)} style={{ padding: '7px 14px', background: s.isEnabled ? '#fffbeb' : '#ecfdf5', border: `1px solid ${s.isEnabled ? '#fde68a' : '#a7f3d0'}`, borderRadius: '8px', color: s.isEnabled ? '#b45309' : '#047857', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontFamily: 'inherit' }}>
                  {s.isEnabled ? <><ToggleRight size={14} /> 사용 중지</> : <><ToggleLeft size={14} /> 사용</>}
                </button>
                <button onClick={() => openEditBuilder(s)} style={{ padding: '7px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(s.schemaId)} style={{ padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form Builder 모달 ─────────────────────────────────────── */}
      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', width: '100%', maxWidth: '960px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                {editingSchema ? '양식 수정' : '새 양식 만들기'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setPreviewMode(m => m === 'form' ? 'none' : 'form')}
                  style={{ padding: '7px 14px', background: previewMode === 'form' ? 'rgba(99,102,241,0.25)' : 'rgba(51,65,85,0.5)', border: `1px solid ${previewMode === 'form' ? 'rgba(99,102,241,0.6)' : 'rgba(71,85,105,0.5)'}`, borderRadius: '8px', color: previewMode === 'form' ? '#c7d2fe' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Smartphone size={13} /> 폼 미리보기
                </button>
                <button onClick={() => setPreviewMode(m => m === 'ppt' ? 'none' : 'ppt')}
                  title="관리자 발표 보기 화면에서 실제로 어떻게 보일지 미리 확인합니다"
                  style={{ padding: '7px 14px', background: previewMode === 'ppt' ? 'rgba(99,102,241,0.25)' : 'rgba(51,65,85,0.5)', border: `1px solid ${previewMode === 'ppt' ? 'rgba(99,102,241,0.6)' : 'rgba(71,85,105,0.5)'}`, borderRadius: '8px', color: previewMode === 'ppt' ? '#c7d2fe' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Presentation size={13} /> 발표 미리보기
                </button>
                <button onClick={() => setPreviewMode(m => m === 'json' ? 'none' : 'json')}
                  style={{ padding: '7px 14px', background: previewMode === 'json' ? 'rgba(99,102,241,0.25)' : 'rgba(51,65,85,0.5)', border: `1px solid ${previewMode === 'json' ? 'rgba(99,102,241,0.6)' : 'rgba(71,85,105,0.5)'}`, borderRadius: '8px', color: previewMode === 'json' ? '#c7d2fe' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Eye size={13} /> JSON 미리보기
                </button>
                <button onClick={() => setShowBuilder(false)} style={{ padding: '7px 12px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <div>
                {/* 적용 시작 주차 설정 */}
                <div style={{ marginBottom: '24px', background: 'rgba(30,41,59,0.6)', borderRadius: '12px', padding: '18px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 적용 시작 주차</h3>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>표시 라벨</label>
                    <input value={formData.weekLabel} onChange={e => setFormData(p => ({ ...p, weekLabel: e.target.value }))}
                      style={{ ...inputSm, width: '100%' }} placeholder="예: 2026년 8월 3주차부터" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>연도</label>
                      <input type="number" min={2025} max={2999} value={formData.startYear}
                        onChange={e => setFormData(p => ({ ...p, startYear: Number(e.target.value) }))}
                        style={{ ...inputSm, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>월</label>
                      <select value={formData.startMonth} onChange={e => setFormData(p => ({ ...p, startMonth: Number(e.target.value), startWeekOfMonth: 1 }))}
                        style={{ ...inputSm, width: '100%' }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}월</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>주차</label>
                      <select value={formData.startWeekOfMonth} onChange={e => setFormData(p => ({ ...p, startWeekOfMonth: Number(e.target.value) }))}
                        style={{ ...inputSm, width: '100%' }}>
                        {Array.from({ length: weeksInMonth(formData.startYear, formData.startMonth) }, (_, i) => i + 1).map(w => (<option key={w} value={w}>{w}주차</option>))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#818cf8' }}>
                    → {formatWeekLabel({ year: formData.startYear, month: formData.startMonth, weekOfMonth: formData.startWeekOfMonth })}부터 적용 (다음 양식의 시작 주차 전까지)
                  </div>
                </div>

                {/* 페이지별 섹션 편집 */}
                {formData.schema.pages.map((page, pageIdx) => (
                  <div key={page.pageId} style={{ marginBottom: '16px', background: 'rgba(30,41,59,0.5)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.4)' }}>
                    <button onClick={() => setExpandedPage(expandedPage === page.pageId ? null : page.pageId)}
                      style={{ width: '100%', padding: '14px 18px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#f1f5f9', fontWeight: 600 }}>
                      {expandedPage === page.pageId ? <ChevronDown size={16} color="#6366f1" /> : <ChevronRight size={16} color="#6366f1" />}
                      Page {pageIdx + 1}: {page.title}
                    </button>

                    {expandedPage === page.pageId && (
                      <div style={{ padding: '0 18px 18px' }}>
                        {page.sections?.map((section, secIdx) => (
                          <div key={section.sectionId} style={{ marginBottom: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#a5b4fc' }}>{section.type}</span>
                              {section.title}
                            </div>

                            {/* grouped_table: leaf 컬럼(라벨 + 그룹라벨 + 변수명 + 계산식) 편집 */}
                            {section.type === 'grouped_table' && section.leafColumns && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>컬럼 (그룹라벨을 같게 입력하면 연속된 컬럼끼리 상단에 병합됩니다)</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {section.leafColumns.map((leaf, leafIdx) => {
                                    const otherKeys = section.leafColumns!.filter((_, i) => i !== leafIdx).map(l => l.key).filter(Boolean);
                                    const isDragging = dragLeaf?.pageIdx === pageIdx && dragLeaf?.secIdx === secIdx && dragLeaf?.idx === leafIdx;
                                    return (
                                      <div key={leafIdx}
                                        draggable
                                        onDragStart={() => setDragLeaf({ pageIdx, secIdx, idx: leafIdx })}
                                        onDragEnd={() => setDragLeaf(null)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                          e.preventDefault();
                                          if (dragLeaf && dragLeaf.pageIdx === pageIdx && dragLeaf.secIdx === secIdx) {
                                            moveLeafColumn(pageIdx, secIdx, dragLeaf.idx, leafIdx);
                                          }
                                          setDragLeaf(null);
                                        }}
                                        style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(51,65,85,0.4)', opacity: isDragging ? 0.4 : 1 }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                          <GripVertical size={14} color="#64748b" style={{ flexShrink: 0, cursor: 'grab' }} />
                                          <input value={leaf.groupLabel || ''} placeholder="그룹라벨 (선택)"
                                            onChange={e => updateLeafGroup(pageIdx, secIdx, leafIdx, e.target.value)}
                                            style={{ ...inputSm, width: '140px' }} />
                                          <input value={leaf.label} placeholder="컬럼 라벨"
                                            onChange={e => updateLeafLabel(pageIdx, secIdx, leafIdx, e.target.value)}
                                            style={{ ...inputSm, flex: 1 }} />
                                          {section.leafColumns!.length > 1 && (
                                            <button onClick={() => removeLeafColumn(pageIdx, secIdx, leafIdx)}
                                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '6px' }}>
                                              <X size={12} />
                                            </button>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <input value={leaf.key} placeholder="변수명"
                                            onChange={e => updateLeafKey(pageIdx, secIdx, leafIdx, e.target.value)}
                                            title="계산식에서 이 컬럼을 참조할 때 쓰는 변수명"
                                            style={{ ...inputSm, width: '140px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                          <input value={leaf.formula || ''} placeholder="계산식 (선택, 예: offline_count / total_members * 100)"
                                            onChange={e => updateLeafFormula(pageIdx, secIdx, leafIdx, e.target.value)}
                                            style={{ ...inputSm, flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                        </div>
                                        {otherKeys.length > 0 && (
                                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                            사용 가능한 변수: {otherKeys.map(k => <code key={k} style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '1px 5px', borderRadius: '4px', marginRight: '4px' }}>{k}</code>)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <button onClick={() => addLeafColumn(pageIdx, secIdx)} style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem' }}>
                                  + 컬럼 추가
                                </button>
                              </div>
                            )}

                            {/* dynamic_table: 컬럼 편집 */}
                            {section.type === 'dynamic_table' && section.columns && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>컬럼 (사용자가 화면에서 행을 자유롭게 추가/삭제합니다)</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {section.columns.map((col, colIdx) => {
                                    const isDragging = dragCol?.pageIdx === pageIdx && dragCol?.secIdx === secIdx && dragCol?.idx === colIdx;
                                    return (
                                    <div key={colIdx}
                                      draggable
                                      onDragStart={() => setDragCol({ pageIdx, secIdx, idx: colIdx })}
                                      onDragEnd={() => setDragCol(null)}
                                      onDragOver={e => e.preventDefault()}
                                      onDrop={e => {
                                        e.preventDefault();
                                        if (dragCol && dragCol.pageIdx === pageIdx && dragCol.secIdx === secIdx) {
                                          moveColumn(pageIdx, secIdx, dragCol.idx, colIdx);
                                        }
                                        setDragCol(null);
                                      }}
                                      style={{ display: 'flex', alignItems: 'center', background: 'rgba(30,41,59,0.8)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.5)', opacity: isDragging ? 0.4 : 1 }}>
                                      <GripVertical size={12} color="#64748b" style={{ flexShrink: 0, marginLeft: '5px', cursor: 'grab' }} />
                                      <input value={col} onChange={e => updateColumnName(pageIdx, secIdx, colIdx, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '5px 8px', fontSize: '0.8rem', width: '100px' }} />
                                      {section.columns!.length > 1 && (
                                        <button onClick={() => removeColumn(pageIdx, secIdx, colIdx)}
                                          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '5px' }}>
                                          <X size={11} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                  })}
                                  <button onClick={() => addColumn(pageIdx, secIdx)} style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem' }}>
                                    + 컬럼
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* notes_board: 카드는 사용자가 화면에서 직접 추가 — 관리자는 최대 개수만 설정 */}
                            {section.type === 'notes_board' && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                                  개별 카드(제목·내용·사진)는 관리자가 미리 지정하지 않고, 사용자가 화면에서 "카드 추가" 버튼으로 자유롭게 추가·삭제합니다.
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>사용자가 추가할 수 있는 최대 카드 수</label>
                                  <input type="number" min={1} max={30} value={section.maxCards ?? 10}
                                    onChange={e => updateMaxCards(pageIdx, secIdx, Number(e.target.value))}
                                    style={{ ...inputSm, width: '70px' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(51,65,85,0.5)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowBuilder(false)} style={{ padding: '10px 20px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={15} /> {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 미리보기 전용 모달 (폼/발표/JSON) — 편집창을 가리지 않도록 별도 창으로 띄운다 ── */}
      {previewMode !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: previewMode === 'ppt' ? '#0b1220' : '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', width: '100%', maxWidth: previewMode === 'ppt' ? '1100px' : '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(51,65,85,0.5)', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9' }}>
                {previewMode === 'form' ? '📱 폼 미리보기' : previewMode === 'ppt' ? '🖥️ 발표 미리보기' : '👁️ JSON 미리보기'}
              </h3>
              <button onClick={() => setPreviewMode('none')} style={{ padding: '7px 12px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {previewMode === 'json' && (
                <pre style={{ color: '#86efac', fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
                  {JSON.stringify(formData.schema, null, 2)}
                </pre>
              )}

              {previewMode === 'form' && (
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>
                    사용자에게 실제로 보이는 화면과 동일합니다 (직접 입력해볼 수 있으며, 여기서 입력한 값은 저장되지 않습니다).
                  </div>
                  <FormPreview schema={formData.schema} />
                </div>
              )}

              {previewMode === 'ppt' && (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>
                    관리자 "발표 보기"에서 실제로 뜨는 슬라이드 화면입니다. (교회명/보고일만 있는 페이지는 표지와 겹쳐 발표에서 자동으로 빠집니다)
                  </div>
                  <PresentationPreview schema={formData.schema} weekLabel={formData.weekLabel} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 발표 미리보기 — 관리자 "발표 보기"와 동일한 슬라이드 컴포넌트를 재사용해
// 표지 + 표가 있는 페이지들을 실제 발표 화면 그대로 스크롤로 쭉 보여준다 ──────────
const PresentationPreview: React.FC<{ schema: FormSchema; weekLabel: string }> = ({ schema, weekLabel }) => {
  const visiblePages = schema.pages.filter(p => (p.sections?.length ?? 0) > 0);
  const mockChurchName = '(미리보기 교회)';
  const slideBoxStyle: React.CSSProperties = {
    aspectRatio: '16 / 9', borderRadius: '14px', overflow: 'auto',
    background: '#ffffff', boxShadow: '0 12px 30px rgba(0,0,0,0.4)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={slideBoxStyle}>
        <CoverSlide sub={{ churchName: mockChurchName, submittedBy: '', status: 'SUBMITTED' }} weekLabel={weekLabel || '2026년 1월 1주차'} topPhotos={[]} />
      </div>
      {visiblePages.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
          표(section)가 있는 페이지가 없어 표지만 발표됩니다.
        </div>
      ) : visiblePages.map(page => (
        <div key={page.pageId} style={slideBoxStyle}>
          <PageSlide page={page} data={{}} churchName={mockChurchName} weekLabel={weekLabel || '2026년 1월 1주차'} />
        </div>
      ))}
    </div>
  );
};

// ─── 폼 미리보기 ───────────────────────────────────────────────────
// 사용자 입력 화면(WeeklyReportPage)과 동일한 PageRenderer를 재사용해, 관리자가 화면에서
// 직접 입력해보며 확인할 수 있도록 한다. 여기서 입력한 값은 어디에도 저장되지 않는다.
const MOCK_CHURCHES: ChurchOption[] = [{ churchId: -1, name: '(미리보기 교회)', country: '-', jipa: '-', gubun: '교회' }];

const FormPreview: React.FC<{ schema: FormSchema }> = ({ schema }) => {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [churchId, setChurchId] = useState<number | null>(-1);
  const [notesPhotos, setNotesPhotos] = useState<Record<string, Record<string, File[]>>>({});
  const [notesPhotoPreviews, setNotesPhotoPreviews] = useState<Record<string, Record<string, string[]>>>({});

  const pages = schema.pages || [];
  const clampedPage = Math.min(page, Math.max(0, pages.length - 1));

  const updateField = (key: string, value: any) => setData(prev => ({ ...prev, [key]: value }));
  const updateGroupedCell = (sid: string, leafKey: string, val: string) =>
    setData(prev => ({ ...prev, [sid]: { ...(prev[sid] || {}), [leafKey]: val } }));
  const updateDynamicTableRow = (sid: string, rowIdx: number, col: string, val: string) =>
    setData(prev => {
      const rows = [...(prev[sid] || [{}])];
      while (rows.length <= rowIdx) rows.push({});
      rows[rowIdx] = { ...rows[rowIdx], [col]: val };
      return { ...prev, [sid]: rows };
    });
  const addDynamicTableRow = (sid: string, cols: string[]) =>
    setData(prev => {
      const rows = [...(prev[sid] || [])];
      const empty: Record<string, string> = {};
      cols.forEach(c => { empty[c] = ''; });
      rows.push(empty);
      return { ...prev, [sid]: rows };
    });
  const removeDynamicTableRow = (sid: string, rowIdx: number) =>
    setData(prev => {
      const rows = [...(prev[sid] || [])];
      rows.splice(rowIdx, 1);
      return { ...prev, [sid]: rows };
    });
  const addNotesCard = (sid: string, maxCards?: number) =>
    setData(prev => {
      const cards: NotesCardEntry[] = [...(prev[sid] || [])];
      if (maxCards && cards.length >= maxCards) return prev;
      cards.push({ cardId: generateCardId(), title: '', value: '', photoPaths: [] });
      return { ...prev, [sid]: cards };
    });
  const removeNotesCard = (sid: string, cardId: string) => {
    setData(prev => ({ ...prev, [sid]: (prev[sid] || []).filter((c: NotesCardEntry) => c.cardId !== cardId) }));
    setNotesPhotos(prev => { const m = { ...(prev[sid] || {}) }; delete m[cardId]; return { ...prev, [sid]: m }; });
    setNotesPhotoPreviews(prev => { const m = { ...(prev[sid] || {}) }; delete m[cardId]; return { ...prev, [sid]: m }; });
  };
  const updateNotesCardField = (sid: string, cardId: string, field: 'title' | 'value', val: string) =>
    setData(prev => ({ ...prev, [sid]: (prev[sid] || []).map((c: NotesCardEntry) => c.cardId === cardId ? { ...c, [field]: val } : c) }));
  const addNotesCardPhotos = (sid: string, cardId: string, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setNotesPhotos(prev => {
      const sectionMap = { ...(prev[sid] || {}) };
      const merged = [...(sectionMap[cardId] || []), ...newFiles].slice(0, 6);
      sectionMap[cardId] = merged;
      setNotesPhotoPreviews(pv => {
        const pvSection = { ...(pv[sid] || {}) };
        pvSection[cardId] = merged.map(f => URL.createObjectURL(f));
        return { ...pv, [sid]: pvSection };
      });
      return { ...prev, [sid]: sectionMap };
    });
  };
  const removeNotesCardPhoto = (sid: string, cardId: string, idx: number) => {
    setNotesPhotos(prev => {
      const sectionMap = { ...(prev[sid] || {}) };
      const filtered = (sectionMap[cardId] || []).filter((_, i) => i !== idx);
      sectionMap[cardId] = filtered;
      setNotesPhotoPreviews(pv => {
        const pvSection = { ...(pv[sid] || {}) };
        pvSection[cardId] = filtered.map(f => URL.createObjectURL(f));
        return { ...pv, [sid]: pvSection };
      });
      return { ...prev, [sid]: sectionMap };
    });
  };

  if (pages.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>페이지가 없습니다.</div>;
  }

  const previewInputStyle: React.CSSProperties = { background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' };
  const previewNumInputStyle: React.CSSProperties = { ...previewInputStyle, textAlign: 'center', padding: '6px 4px' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {pages.map((p, i) => (
          <button key={p.pageId} onClick={() => setPage(i)}
            style={{ flex: 1, padding: '6px', borderRadius: '6px', border: i === clampedPage ? '1px solid #6366f1' : '1px solid #cbd5e1', background: i === clampedPage ? '#eef2ff' : '#ffffff', color: i === clampedPage ? '#4338ca' : '#64748b', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
            {p.title}
          </button>
        ))}
      </div>
      <PageRenderer
        page={pages[clampedPage]}
        pageIndex={clampedPage}
        formData={data}
        churches={MOCK_CHURCHES}
        selectedChurchId={churchId}
        onChurchSelect={setChurchId}
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
        inputStyle={previewInputStyle}
        numInputStyle={previewNumInputStyle}
        disabled={false}
      />
    </div>
  );
};
