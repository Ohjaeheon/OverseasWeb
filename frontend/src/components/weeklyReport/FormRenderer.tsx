import React from 'react';
import { X, Plus, Image, Lock, Calculator } from 'lucide-react';
import { FormPage, FormSection, ChurchOption } from '../../services/weeklyReportService';
import { evaluateFormula } from '../../utils/formulaEval';

/** notes_board 제출 데이터 항목 (사용자가 자유롭게 추가하는 사진+텍스트 카드) */
export interface NotesCardEntry {
  cardId: string;
  title: string;
  value: string;
  photoPaths: string[];
}

export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── 페이지 렌더러 ─────────────────────────────────────────────────
// WeeklyReportPage(실제 입력 화면)와 AdminWeeklyReportSchemaPage(양식 미리보기)가
// 동일한 컴포넌트를 공유해, 관리자가 보는 미리보기가 실제 사용자 화면과 항상 일치한다.
export interface PageRendererProps {
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
  onAddNotesCard: (sid: string, maxCards?: number) => void;
  onRemoveNotesCard: (sid: string, cardId: string) => void;
  onUpdateNotesCardField: (sid: string, cardId: string, field: 'title' | 'value', val: string) => void;
  onAddNotesCardPhotos: (sid: string, cardId: string, files: FileList | null) => void;
  onRemoveNotesCardPhoto: (sid: string, cardId: string, idx: number) => void;
  notesPhotoPreviews: Record<string, Record<string, string[]>>;
  inputStyle: React.CSSProperties;
  numInputStyle: React.CSSProperties;
  disabled: boolean;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  page, pageIndex, formData, churches, selectedChurchId, onChurchSelect,
  onUpdateField, onUpdateGroupedCell, onUpdateDynamicTableRow, onAddDynamicTableRow, onRemoveDynamicTableRow,
  onAddNotesCard, onRemoveNotesCard, onUpdateNotesCardField, onAddNotesCardPhotos, onRemoveNotesCardPhoto,
  notesPhotoPreviews, inputStyle, numInputStyle, disabled
}) => {

  const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' };
  const sectionTitleStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' };
  const thStyle: React.CSSProperties = { padding: '9px 10px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.82rem' };

  return (
    <div>
      <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
        Page {pageIndex + 1} — {page.title}
      </h3>

      {/* 일반 필드 (Page 1) */}
      {page.fields && page.fields.length > 0 && (
        <div style={{ maxWidth: '720px' }}>
          {page.fields.map(field => (
            <div key={field.fieldId} style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}</label>
              {field.type === 'church_select' ? (
                <div style={{ position: 'relative' }}>
                  <select value={selectedChurchId || ''} onChange={e => onChurchSelect(Number(e.target.value))}
                    disabled={disabled || churches.length <= 1}
                    style={{ ...inputStyle, appearance: 'none', cursor: (disabled || churches.length <= 1) ? 'not-allowed' : 'pointer', background: churches.length <= 1 ? '#f1f5f9' : inputStyle.background }}>
                    <option value="">-- 교회 선택 --</option>
                    {churches.map(c => (
                      <option key={c.churchId} value={c.churchId}>{c.name} ({c.country})</option>
                    ))}
                  </select>
                  {churches.length <= 1 && selectedChurchId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                      <Lock size={12} /> 담당 교회로 자동 설정됨 (다른 교회 선택 불가)
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
        </div>
      )}

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
                          <td key={col} style={{ padding: '4px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                            <input type="text" disabled={disabled} value={row[col] || ''}
                              onChange={e => onUpdateDynamicTableRow(section.sectionId, rowIdx, col, e.target.value)}
                              style={{ ...inputStyle, padding: '6px 8px' }} />
                          </td>
                        ))}
                        {!disabled && (
                          <td style={{ padding: '4px', border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'center' }}>
                            <button onClick={() => onRemoveDynamicTableRow(section.sectionId, rowIdx)}
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', padding: '5px 7px' }}>
                              <X size={13} />
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
                  style={{ marginTop: '10px', padding: '8px 16px', background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: '8px', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  <Plus size={14} /> 행 추가
                </button>
              )}
            </div>
          )}

          {/* 특이사항 카드형 게시판 — 사용자가 화면에서 자유롭게 카드를 추가/삭제 */}
          {section.type === 'notes_board' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {((formData[section.sectionId] || []) as NotesCardEntry[]).map(card => {
                  const previews = notesPhotoPreviews[section.sectionId]?.[card.cardId] || [];
                  const hasNewPhotos = previews.length > 0;
                  const hasSavedPhotos = (card.photoPaths?.length || 0) > 0;
                  return (
                    <div key={card.cardId} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      {/* 제목 헤더 바 */}
                      <div style={{ position: 'relative', background: '#eafaf1', borderBottom: '1px solid #bbf7d0', padding: '10px 34px' }}>
                        <input value={card.title} disabled={disabled} placeholder="제목 입력"
                          onChange={e => onUpdateNotesCardField(section.sectionId, card.cardId, 'title', e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontWeight: 700, fontSize: '0.88rem', color: '#15803d', textAlign: 'center', fontFamily: 'inherit' }} />
                        {!disabled && (
                          <button onClick={() => onRemoveNotesCard(section.sectionId, card.cardId)}
                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', cursor: 'pointer', flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* 사진 영역 (메인 비주얼) */}
                      <div style={{ position: 'relative', minHeight: '140px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hasNewPhotos ? (
                          <>
                            <img src={previews[0]} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                            {!disabled && (
                              <button onClick={() => onRemoveNotesCardPhoto(section.sectionId, card.cardId, 0)}
                                style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(15,23,42,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                <X size={11} />
                              </button>
                            )}
                          </>
                        ) : hasSavedPhotos ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#64748b', padding: '20px' }}>
                            <Image size={26} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>기존 첨부 {card.photoPaths.length}장</span>
                          </div>
                        ) : !disabled ? (
                          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#94a3b8', cursor: 'pointer', padding: '24px', width: '100%' }}>
                            <Image size={26} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>사진 추가</span>
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                              onChange={e => onAddNotesCardPhotos(section.sectionId, card.cardId, e.target.files)} />
                          </label>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>사진 없음</span>
                        )}
                        {!disabled && hasNewPhotos && (
                          <label style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(15,23,42,0.65)', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
                            <Plus size={11} /> 추가
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                              onChange={e => onAddNotesCardPhotos(section.sectionId, card.cardId, e.target.files)} />
                          </label>
                        )}
                      </div>

                      {/* 추가 사진(2장 이상) 썸네일 */}
                      {previews.length > 1 && (
                        <div style={{ display: 'flex', gap: '4px', padding: '6px 8px 0', overflowX: 'auto' }}>
                          {previews.slice(1).map((url, i) => (
                            <div key={i + 1} style={{ position: 'relative', flexShrink: 0 }}>
                              <img src={url} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                              {!disabled && (
                                <button onClick={() => onRemoveNotesCardPhoto(section.sectionId, card.cardId, i + 1)}
                                  style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'rgba(15,23,42,0.7)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <X size={8} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 내용 텍스트 */}
                      <textarea disabled={disabled} value={card.value}
                        onChange={e => onUpdateNotesCardField(section.sectionId, card.cardId, 'value', e.target.value)}
                        placeholder="내용 입력"
                        style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', minHeight: '50px', padding: '10px 12px', fontSize: '0.82rem', color: '#334155', boxSizing: 'border-box', fontFamily: 'inherit', background: 'transparent' }} />
                    </div>
                  );
                })}
              </div>
              {!disabled && (
                <button onClick={() => onAddNotesCard(section.sectionId, section.maxCards)}
                  style={{ marginTop: '12px', padding: '8px 16px', background: '#eff6ff', border: '1px dashed #93c5fd', borderRadius: '8px', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  <Plus size={14} /> 카드 추가
                </button>
              )}
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

  // 계산식이 지정된 컬럼은 다른 컬럼 값이 바뀔 때마다 자동으로 다시 계산해 formData에 반영
  React.useEffect(() => {
    const vars: Record<string, number> = {};
    leaves.forEach(l => { vars[l.key] = parseFloat(value[l.key]) || 0; });
    leaves.forEach(leaf => {
      if (!leaf.formula) return;
      const result = evaluateFormula(leaf.formula, vars);
      if (result === null) return;
      const rounded = String(Math.round(result * 100) / 100);
      if (value[leaf.key] !== rounded) onChange(leaf.key, rounded);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), JSON.stringify(leaves.map(l => l.formula))]);

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
              <td key={leaf.key} style={{ padding: '4px', border: '1px solid #e2e8f0', background: leaf.formula ? '#f1f5f9' : '#ffffff' }}>
                {leaf.formula ? (
                  <div title={`자동 계산: ${leaf.formula}`}
                    style={{ ...numInputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#475569', fontWeight: 700, cursor: 'help' }}>
                    <Calculator size={12} /> {value[leaf.key] || '0'}
                  </div>
                ) : (
                  <input type="number" min="0" disabled={disabled} value={value[leaf.key] || ''}
                    onChange={e => onChange(leaf.key, e.target.value)}
                    style={numInputStyle} />
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
