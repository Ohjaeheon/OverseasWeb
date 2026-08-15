import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  FileText, ToggleLeft, ToggleRight, Eye, Save, X, AlertCircle
} from 'lucide-react';
import { weeklyReportService, WeeklyReportSchemaItem, FormSchema, FormSection, NotesBoardCard } from '../../services/weeklyReportService';
import { DEFAULT_SCHEMA } from '../../data/weeklyReportDefaultSchema';
import { getCurrentWeek, weeksInMonth, formatWeekLabel } from '../../utils/weekUtil';

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
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [expandedPage, setExpandedPage] = useState<string | null>('page2');

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

  // notes_board: 카드 편집
  const updateCard = (pageIdx: number, secIdx: number, cardIdx: number, patch: Partial<NotesBoardCard>) => {
    updateSection(pageIdx, secIdx, s => {
      const cards = [...(s.cards || [])];
      cards[cardIdx] = { ...cards[cardIdx], ...patch };
      return { ...s, cards };
    });
  };
  const addCard = (pageIdx: number, secIdx: number) => {
    updateSection(pageIdx, secIdx, s => ({
      ...s, cards: [...(s.cards || []), { cardId: `card_${Date.now()}`, title: '새 항목', inputType: 'photo_text' as const }]
    }));
  };
  const removeCard = (pageIdx: number, secIdx: number, cardIdx: number) => {
    updateSection(pageIdx, secIdx, s => {
      const cards = [...(s.cards || [])];
      cards.splice(cardIdx, 1);
      return { ...s, cards };
    });
  };

  const inputSm: React.CSSProperties = { background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📋 주차별 양식 관리</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.875rem' }}>
            적용 시작 주차를 지정해 두면, 그 주차부터 다음 양식이 시작되는 주차 전까지 자동으로 이 양식이 적용됩니다.
          </p>
        </div>
        <button onClick={openNewBuilder} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
          borderRadius: '10px', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
        }}>
          <Plus size={16} /> 새 양식 만들기
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={16} color='#ef4444' /> <span style={{ color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>불러오는 중...</div>
      ) : schemas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(30,41,59,0.5)', borderRadius: '16px', border: '1px dashed rgba(100,116,139,0.3)' }}>
          <FileText size={48} color='#475569' style={{ marginBottom: '16px' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>아직 생성된 양식이 없습니다.</p>
          <button onClick={openNewBuilder} style={{ marginTop: '16px', padding: '10px 24px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer' }}>
            첫 번째 양식 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {schemas.map(s => (
            <div key={s.schemaId} style={{
              background: 'rgba(30,41,59,0.7)', border: s.isEnabled ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(51,65,85,0.5)',
              borderRadius: '14px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backdropFilter: 'blur(8px)',
              boxShadow: s.isEnabled ? '0 0 20px rgba(99,102,241,0.15)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.isEnabled ? 'rgba(99,102,241,0.2)' : 'rgba(51,65,85,0.5)',
                }}>
                  <FileText size={20} color={s.isEnabled ? '#a5b4fc' : '#64748b'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{s.weekLabel}</span>
                    {s.isEnabled && (
                      <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ✓ 사용중
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                    적용: {s.startYear}년 {s.startMonth}월 {s.startWeekOfMonth}주차부터 · 생성자: {s.createdBy || '-'} · {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => handleToggleEnabled(s)} style={{ padding: '7px 14px', background: s.isEnabled ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${s.isEnabled ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: '8px', color: s.isEnabled ? '#fcd34d' : '#6ee7b7', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {s.isEnabled ? <><ToggleRight size={14} /> 사용 중지</> : <><ToggleLeft size={14} /> 사용</>}
                </button>
                <button onClick={() => openEditBuilder(s)} style={{ padding: '7px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(s.schemaId)} style={{ padding: '7px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form Builder 모달 ─────────────────────────────────────── */}
      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', width: '100%', maxWidth: '960px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                {editingSchema ? '양식 수정' : '새 양식 만들기'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowJsonPreview(!showJsonPreview)} style={{ padding: '7px 14px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Eye size={13} /> JSON 미리보기
                </button>
                <button onClick={() => setShowBuilder(false)} style={{ padding: '7px 12px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: showJsonPreview ? '1fr 1fr' : '1fr', gap: '24px' }}>
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

                            {/* grouped_table: leaf 컬럼(라벨 + 그룹라벨) 편집 */}
                            {section.type === 'grouped_table' && section.leafColumns && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>컬럼 (그룹라벨을 같게 입력하면 연속된 컬럼끼리 상단에 병합됩니다)</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {section.leafColumns.map((leaf, leafIdx) => (
                                    <div key={leafIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                                  ))}
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
                                  {section.columns.map((col, colIdx) => (
                                    <div key={colIdx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(30,41,59,0.8)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.5)' }}>
                                      <input value={col} onChange={e => updateColumnName(pageIdx, secIdx, colIdx, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '5px 8px', fontSize: '0.8rem', width: '100px' }} />
                                      {section.columns!.length > 1 && (
                                        <button onClick={() => removeColumn(pageIdx, secIdx, colIdx)}
                                          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '5px' }}>
                                          <X size={11} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button onClick={() => addColumn(pageIdx, secIdx)} style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem' }}>
                                    + 컬럼
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* notes_board: 카드 편집 */}
                            {section.type === 'notes_board' && section.cards && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>카드 (사진+텍스트 입력 또는 숫자 입력)</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {section.cards.map((card, cardIdx) => (
                                    <div key={card.cardId} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <input value={card.title} placeholder="카드 제목"
                                        onChange={e => updateCard(pageIdx, secIdx, cardIdx, { title: e.target.value })}
                                        style={{ ...inputSm, flex: 1 }} />
                                      <input value={card.subtitle || ''} placeholder="부제목 (선택)"
                                        onChange={e => updateCard(pageIdx, secIdx, cardIdx, { subtitle: e.target.value })}
                                        style={{ ...inputSm, width: '140px' }} />
                                      <select value={card.inputType}
                                        onChange={e => updateCard(pageIdx, secIdx, cardIdx, { inputType: e.target.value as NotesBoardCard['inputType'] })}
                                        style={{ ...inputSm, width: '120px' }}>
                                        <option value="photo_text">사진+텍스트</option>
                                        <option value="number">숫자</option>
                                      </select>
                                      {section.cards!.length > 1 && (
                                        <button onClick={() => removeCard(pageIdx, secIdx, cardIdx)}
                                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '6px' }}>
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button onClick={() => addCard(pageIdx, secIdx)} style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem' }}>
                                  + 카드 추가
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showJsonPreview && (
                <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.4)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>JSON Schema 미리보기</div>
                  <pre style={{ color: '#86efac', fontSize: '0.72rem', overflowY: 'auto', maxHeight: '500px', margin: 0, lineHeight: 1.5 }}>
                    {JSON.stringify(formData.schema, null, 2)}
                  </pre>
                </div>
              )}
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
    </div>
  );
};
