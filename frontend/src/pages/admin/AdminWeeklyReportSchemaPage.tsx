import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  FileText, ToggleLeft, ToggleRight, Eye, Columns, Rows, Save, X, AlertCircle
} from 'lucide-react';
import { weeklyReportService, WeeklyReportSchemaItem, FormSchema, FormSection, TableRow } from '../../services/weeklyReportService';

// ─── 기본 초기 스키마 (PPT 양식 기반) ───────────────────────────────────
const DEFAULT_SCHEMA: FormSchema = {
  pages: [
    {
      pageId: 'page1',
      title: '기본 정보',
      fields: [
        { fieldId: 'church_name', label: '교회명', type: 'church_select', required: true },
        { fieldId: 'report_week', label: '보고 주차', type: 'text', required: true },
        { fieldId: 'report_date', label: '보고일', type: 'date', required: false },
      ]
    },
    {
      pageId: 'page2',
      title: '각종 취합 내용',
      sections: [
        {
          sectionId: 'worship_attendance',
          title: '예배출결 현황',
          type: 'table',
          columns: ['항목', '재적', '출석(대면)', '출석(온라인)', '결석', '비고'],
          rows: [
            { rowId: 'main_worship', label: '주일예배' },
            { rowId: 'wed_worship', label: '수요예배' },
            { rowId: 'fri_worship', label: '금요예배' },
          ]
        },
        {
          sectionId: 'mission_center',
          title: '선교센터 현황',
          type: 'table',
          columns: ['항목', '이번 주', '누적', '비고'],
          rows: [
            { rowId: 'center_reg', label: '신규 등록' },
            { rowId: 'center_grad', label: '종강' },
            { rowId: 'center_att', label: '현재 출석' },
          ]
        },
        {
          sectionId: 'evangelism_status',
          title: '전도 현황',
          type: 'table',
          columns: ['항목', '이번 주', '누적', '비고'],
          rows: [
            { rowId: 'evang_contact', label: '전도 접촉' },
            { rowId: 'evang_bible', label: '동행/복음방 등록' },
            { rowId: 'evang_att', label: '동행/복음방 출석' },
          ]
        }
      ]
    },
    {
      pageId: 'page3',
      title: '주간 특이사항 및 사진',
      sections: [
        {
          sectionId: 'education',
          title: '주간 교육 현황',
          type: 'dynamic_table',
          columns: ['과목/내용', '강사', '수강인원', '비고'],
          allowAddRow: true
        },
        {
          sectionId: 'special_notes',
          title: '주간 특이사항',
          type: 'dynamic_fields',
          allowAddField: true
        },
        {
          sectionId: 'photos',
          title: '사진 첨부',
          type: 'photo_upload',
          maxFiles: 10
        }
      ]
    }
  ]
};

// ─── 주차 계산 헬퍼 ────────────────────────────────────────────────────
function getCurrentWeekInfo(): { year: number; weekNumber: number; weekLabel: string } {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const month = now.getMonth() + 1;
  const weekOfMonth = Math.ceil(now.getDate() / 7);
  const weekLabel = `${year}년 ${month}월 ${weekOfMonth}주차`;
  return { year, weekNumber, weekLabel };
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────
export const AdminWeeklyReportSchemaPage: React.FC = () => {
  const [schemas, setSchemas] = useState<WeeklyReportSchemaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSchema, setEditingSchema] = useState<WeeklyReportSchemaItem | null>(null);
  const [formData, setFormData] = useState<{ weekLabel: string; year: number; weekNumber: number; schema: FormSchema }>({
    ...getCurrentWeekInfo(),
    schema: JSON.parse(JSON.stringify(DEFAULT_SCHEMA))
  });
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
    const wi = getCurrentWeekInfo();
    setFormData({ ...wi, schema: JSON.parse(JSON.stringify(DEFAULT_SCHEMA)) });
    setEditingSchema(null);
    setShowBuilder(true);
    setExpandedPage('page2');
  };

  const openEditBuilder = (s: WeeklyReportSchemaItem) => {
    setFormData({
      weekLabel: s.weekLabel,
      year: s.year,
      weekNumber: s.weekNumber,
      schema: JSON.parse(s.formSchemaJson)
    });
    setEditingSchema(s);
    setShowBuilder(true);
    setExpandedPage('page2');
  };

  const handleSave = async () => {
    if (!formData.weekLabel.trim()) { alert('주차명을 입력해 주세요.'); return; }
    try {
      setSaving(true);
      const payload = {
        weekLabel: formData.weekLabel,
        year: formData.year,
        weekNumber: formData.weekNumber,
        formSchemaJson: JSON.stringify(formData.schema),
        isActive: false
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

  const handleActivate = async (schemaId: number) => {
    if (!confirm('이 양식을 활성화하면 기존 활성 양식은 자동으로 비활성화됩니다. 계속하시겠습니까?')) return;
    try {
      await weeklyReportService.activateSchema(schemaId);
      await loadSchemas();
    } catch (e: any) {
      alert('활성화에 실패했습니다.');
    }
  };

  const handleDeactivate = async (schemaId: number) => {
    try {
      await weeklyReportService.deactivateSchema(schemaId);
      await loadSchemas();
    } catch (e: any) {
      alert('비활성화에 실패했습니다.');
    }
  };

  const handleDelete = async (schemaId: number) => {
    if (!confirm('이 양식을 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.')) return;
    try {
      await weeklyReportService.deleteSchema(schemaId);
      await loadSchemas();
    } catch (e: any) {
      alert(e.response?.data?.message || '삭제에 실패했습니다. 활성화된 양식은 삭제할 수 없습니다.');
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

  const updateColumnName = (pageIdx: number, secIdx: number, colIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const cols = [...(s.columns || [])];
      cols[colIdx] = value;
      return { ...s, columns: cols };
    });
  };

  const addColumn = (pageIdx: number, secIdx: number) => {
    updateSection(pageIdx, secIdx, s => ({
      ...s, columns: [...(s.columns || []), '새 컬럼']
    }));
  };

  const removeColumn = (pageIdx: number, secIdx: number, colIdx: number) => {
    updateSection(pageIdx, secIdx, s => {
      const cols = [...(s.columns || [])];
      if (cols.length <= 1) return s;
      cols.splice(colIdx, 1);
      return { ...s, columns: cols };
    });
  };

  const updateRowLabel = (pageIdx: number, secIdx: number, rowIdx: number, value: string) => {
    updateSection(pageIdx, secIdx, s => {
      const rows = [...(s.rows || [])];
      rows[rowIdx] = { ...rows[rowIdx], label: value };
      return { ...s, rows };
    });
  };

  const addRow = (pageIdx: number, secIdx: number) => {
    updateSection(pageIdx, secIdx, s => ({
      ...s,
      rows: [...(s.rows || []), { rowId: `row_${Date.now()}`, label: '새 항목' }]
    }));
  };

  const removeRow = (pageIdx: number, secIdx: number, rowIdx: number) => {
    updateSection(pageIdx, secIdx, s => {
      const rows = [...(s.rows || [])];
      rows.splice(rowIdx, 1);
      return { ...s, rows };
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📋 주차별 양식 관리</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.875rem' }}>
            매주 배포할 주간보고 양식을 생성하고 관리합니다.
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

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={16} color='#ef4444' /> <span style={{ color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      {/* 양식 목록 */}
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
              background: 'rgba(30,41,59,0.7)', border: s.isActive ? '1.5px solid rgba(99,102,241,0.6)' : '1px solid rgba(51,65,85,0.5)',
              borderRadius: '14px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backdropFilter: 'blur(8px)',
              boxShadow: s.isActive ? '0 0 20px rgba(99,102,241,0.15)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.isActive ? 'rgba(99,102,241,0.2)' : 'rgba(51,65,85,0.5)',
                }}>
                  <FileText size={20} color={s.isActive ? '#a5b4fc' : '#64748b'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{s.weekLabel}</span>
                    {s.isActive && (
                      <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ✓ 활성
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                    {s.year}년 {s.weekNumber}주차 · 생성자: {s.createdBy || '-'} · {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!s.isActive ? (
                  <button onClick={() => handleActivate(s.schemaId)} style={{ padding: '7px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#6ee7b7', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ToggleLeft size={14} /> 활성화
                  </button>
                ) : (
                  <button onClick={() => handleDeactivate(s.schemaId)} style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fcd34d', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ToggleRight size={14} /> 비활성화
                  </button>
                )}
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
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', width: '100%', maxWidth: '900px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            {/* 모달 헤더 */}
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
              {/* 편집 패널 */}
              <div>
                {/* 주차 설정 */}
                <div style={{ marginBottom: '24px', background: 'rgba(30,41,59,0.6)', borderRadius: '12px', padding: '18px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 주차 설정</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>주차명</label>
                      <input value={formData.weekLabel} onChange={e => setFormData(p => ({ ...p, weekLabel: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        placeholder="예: 2026년 8월 2주차" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>연도</label>
                      <input type="number" value={formData.year} onChange={e => setFormData(p => ({ ...p, year: Number(e.target.value) }))}
                        style={{ width: '100%', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>주차 번호</label>
                      <input type="number" value={formData.weekNumber} onChange={e => setFormData(p => ({ ...p, weekNumber: Number(e.target.value) }))}
                        style={{ width: '100%', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                    </div>
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

                            {/* 컬럼 편집 (table/dynamic_table) */}
                            {(section.type === 'table' || section.type === 'dynamic_table') && section.columns && (
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Columns size={12} /> 컬럼
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {section.columns.map((col, colIdx) => (
                                    <div key={colIdx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(30,41,59,0.8)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.5)' }}>
                                      <input value={col} onChange={e => updateColumnName(pageIdx, secIdx, colIdx, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '5px 8px', fontSize: '0.8rem', width: '80px' }} />
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

                            {/* 행(Row) 편집 (table만) */}
                            {section.type === 'table' && section.rows && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Rows size={12} /> 행 항목
                                </div>
                                {section.rows.map((row, rowIdx) => (
                                  <div key={row.rowId} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <input value={row.label} onChange={e => updateRowLabel(pageIdx, secIdx, rowIdx, e.target.value)}
                                      style={{ flex: 1, background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: '6px', padding: '6px 10px', color: '#e2e8f0', fontSize: '0.8rem' }} />
                                    <button onClick={() => removeRow(pageIdx, secIdx, rowIdx)}
                                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', padding: '6px' }}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                                <button onClick={() => addRow(pageIdx, secIdx)} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px dashed rgba(16,185,129,0.3)', borderRadius: '6px', color: '#6ee7b7', cursor: 'pointer', fontSize: '0.8rem', marginTop: '4px' }}>
                                  + 행 추가
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

              {/* JSON 미리보기 */}
              {showJsonPreview && (
                <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.4)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>JSON Schema 미리보기</div>
                  <pre style={{ color: '#86efac', fontSize: '0.72rem', overflowY: 'auto', maxHeight: '500px', margin: 0, lineHeight: 1.5 }}>
                    {JSON.stringify(formData.schema, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(51,65,85,0.5)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowBuilder(false)} style={{ padding: '10px 20px', background: 'rgba(51,65,85,0.5)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={15} /> {saving ? '저장 중...': '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

