import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, Upload, FileArchive, RotateCcw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { weeklyWorshipConfigService, RegionMapping, WorshipTemplateItem } from '../../services/weeklyWorshipConfigService';

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e6edf8',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 15px rgba(20, 40, 90, 0.02)'
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  color: '#1e293b'
};

const iconBtnStyle = (color: string): React.CSSProperties => ({
  width: '30px',
  height: '30px',
  borderRadius: '7px',
  border: 'none',
  background: `${color}15`,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
});

export const AdminWeeklyWorshipSettingsPage: React.FC = () => {
  // ── 지역 매핑 상태 ──
  const [regions, setRegions] = useState<RegionMapping[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ regionNo: string; displayName: string }>({ regionNo: '', displayName: '' });
  const [newRegion, setNewRegion] = useState<{ regionNo: string; displayName: string }>({ regionNo: '', displayName: '' });

  // ── 템플릿 상태 ──
  const [templates, setTemplates] = useState<WorshipTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRegions = useCallback(async () => {
    try {
      setRegionsLoading(true);
      setRegions(await weeklyWorshipConfigService.listRegions());
      setRegionsError(null);
    } catch (e) {
      setRegionsError('지역 매핑 목록을 불러오지 못했습니다.');
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      setTemplates(await weeklyWorshipConfigService.listTemplates());
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { loadRegions(); loadTemplates(); }, [loadRegions, loadTemplates]);

  // ── 지역 매핑 핸들러 ──
  const startEdit = (r: RegionMapping) => {
    setEditingId(r.mappingId);
    setEditDraft({ regionNo: String(r.regionNo), displayName: r.displayName });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (mappingId: number) => {
    const regionNo = parseInt(editDraft.regionNo, 10);
    if (!regionNo || !editDraft.displayName.trim()) {
      alert('번호와 지역명을 올바르게 입력해 주세요.');
      return;
    }
    try {
      await weeklyWorshipConfigService.updateRegion(mappingId, { regionNo, displayName: editDraft.displayName.trim() });
      setEditingId(null);
      loadRegions();
    } catch (e: any) {
      alert(e?.response?.data?.message || '수정에 실패했습니다.');
    }
  };

  const toggleActive = async (r: RegionMapping) => {
    try {
      await weeklyWorshipConfigService.updateRegion(r.mappingId, { isActive: !r.isActive });
      loadRegions();
    } catch (e: any) {
      alert(e?.response?.data?.message || '변경에 실패했습니다.');
    }
  };

  const removeRegion = async (r: RegionMapping) => {
    if (!window.confirm(`'${r.regionNo}. ${r.displayName}' 지역 매핑을 삭제하시겠습니까?`)) return;
    try {
      await weeklyWorshipConfigService.deleteRegion(r.mappingId);
      loadRegions();
    } catch (e: any) {
      alert(e?.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const addRegion = async () => {
    const regionNo = parseInt(newRegion.regionNo, 10);
    if (!regionNo || !newRegion.displayName.trim()) {
      alert('번호와 지역명을 입력해 주세요.');
      return;
    }
    try {
      await weeklyWorshipConfigService.createRegion(regionNo, newRegion.displayName.trim());
      setNewRegion({ regionNo: '', displayName: '' });
      loadRegions();
    } catch (e: any) {
      alert(e?.response?.data?.message || '등록에 실패했습니다.');
    }
  };

  // ── 템플릿 핸들러 ──
  const doUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setTemplateError('템플릿은 .xlsx 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploading(true);
    setTemplateError(null);
    try {
      await weeklyWorshipConfigService.uploadTemplate(file);
      await Promise.all([loadTemplates(), loadRegions()]);
    } catch (e: any) {
      setTemplateError(e?.response?.data?.message || '템플릿 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) doUpload(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) doUpload(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const rollback = async (t: WorshipTemplateItem) => {
    if (!window.confirm(`'${t.originalFilename}' 버전으로 활성 템플릿을 되돌리시겠습니까?\n(해당 버전의 시트 구성에 맞춰 지역 목록도 함께 갱신됩니다)`)) return;
    try {
      await weeklyWorshipConfigService.activateTemplate(t.templateId);
      await Promise.all([loadTemplates(), loadRegions()]);
    } catch (e: any) {
      alert(e?.response?.data?.message || '전환에 실패했습니다.');
    }
  };

  const activeTemplate = templates.find(t => t.isActive);
  const activeRegionCount = regions.filter(r => r.isActive).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: '"Pretendard", sans-serif' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          ⚙️ 주간예배 출결 취합 — 지역/양식 설정
        </h2>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', marginTop: '6px', lineHeight: 1.5 }}>
          양식(템플릿) 파일을 업로드하면 그 안의 시트 탭 이름에서 지역 번호와 이름을 자동으로 추출해 아래 지역 목록에 반영합니다.<br />
          지역이 늘어나거나 이름이 바뀌면 <strong>엑셀에서 시트를 추가·수정한 뒤 여기서 새 양식을 업로드</strong>하면 됩니다 (재배포 불필요).<br />
          현재 활성 지역 <strong>{activeRegionCount}개</strong>, 활성 템플릿 <strong>{activeTemplate ? activeTemplate.originalFilename : '기본(내장) 템플릿'}</strong>.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* 양식(템플릿) 관리 */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            1. 양식(템플릿) 관리
          </h3>

          <div style={{
            background: activeTemplate ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${activeTemplate ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: '10px', padding: '14px 16px', marginBottom: '18px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <CheckCircle2 size={20} color={activeTemplate ? '#16a34a' : '#94a3b8'} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                현재 활성 템플릿: {activeTemplate ? activeTemplate.originalFilename : '기본(내장) 템플릿 사용 중'}
              </div>
              {activeTemplate && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  업로드: {new Date(activeTemplate.uploadedAt).toLocaleString()} · {activeTemplate.uploadedBy}
                  {activeTemplate.regionCount != null && <> · 감지된 지역 시트 {activeTemplate.regionCount}개</>}
                </div>
              )}
            </div>
          </div>

          <div
            onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '12px', padding: '28px 20px', textAlign: 'center',
              background: dragActive ? 'rgba(37, 99, 235, 0.02)' : '#f8fafc',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {uploading ? <FileArchive size={24} color="#2563eb" /> : <Upload size={24} color="#2563eb" />}
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                {uploading ? '업로드 및 지역 목록 동기화 중...' : '새 양식.xlsx 파일을 끌어놓거나 클릭해서 선택'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>업로드 즉시 활성 템플릿으로 전환되고, 시트 탭 이름에서 지역 목록이 자동으로 갱신됩니다.</p>
            </div>
          </div>

          {templateError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.82rem', marginTop: '10px' }}>
              <AlertCircle size={15} /> {templateError}
            </div>
          )}

          {!templatesLoading && templates.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>이전 업로드 이력</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {templates.map(t => (
                  <div key={t.templateId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '8px',
                    background: t.isActive ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${t.isActive ? '#bfdbfe' : '#e2e8f0'}`
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.originalFilename} {t.isActive && <span style={{ color: '#2563eb', fontSize: '0.7rem' }}>(활성)</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{new Date(t.uploadedAt).toLocaleString()} · {t.uploadedBy}</div>
                    </div>
                    {!t.isActive && (
                      <button
                        onClick={() => rollback(t)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <RotateCcw size={13} /> 이 버전으로 롤백
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 지역 매핑 관리 */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1e293b' }}>
            2. 지역 매핑 목록 <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#94a3b8' }}>(양식 업로드 시 시트명에서 자동 반영됨)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
            아래에서 이름을 직접 고쳐도 다음 양식 업로드/롤백 시 해당 템플릿의 시트명으로 다시 덮어써집니다. 임시 비활성화·삭제만 여기서 직접 관리하세요.
          </p>
          <div style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }} />

          {regionsError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>{regionsError}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.78rem' }}>
                  <th style={{ padding: '8px 10px', width: '70px' }}>번호</th>
                  <th style={{ padding: '8px 10px' }}>지역명</th>
                  <th style={{ padding: '8px 10px', width: '90px' }}>활성</th>
                  <th style={{ padding: '8px 10px', width: '90px' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {regionsLoading && (
                  <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</td></tr>
                )}
                {!regionsLoading && regions.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>등록된 지역이 없습니다. 양식을 업로드하면 자동으로 채워집니다.</td></tr>
                )}
                {regions.map(r => {
                  const isEditing = editingId === r.mappingId;
                  return (
                    <tr key={r.mappingId} style={{ borderTop: '1px solid #f1f5f9', opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '8px 10px' }}>
                        {isEditing ? (
                          <input style={{ ...inputStyle, width: '60px' }} type="number" value={editDraft.regionNo}
                            onChange={e => setEditDraft(d => ({ ...d, regionNo: e.target.value }))} />
                        ) : r.regionNo}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                        {isEditing ? (
                          <input style={{ ...inputStyle, width: '100%' }} type="text" value={editDraft.displayName}
                            onChange={e => setEditDraft(d => ({ ...d, displayName: e.target.value }))} />
                        ) : r.displayName}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}>
                          <input type="checkbox" checked={r.isActive} onChange={() => toggleActive(r)} />
                          <span style={{ fontSize: '0.75rem', color: r.isActive ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                            {r.isActive ? '사용중' : '중지'}
                          </span>
                        </label>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isEditing ? (
                            <>
                              <button style={iconBtnStyle('#16a34a')} onClick={() => saveEdit(r.mappingId)} title="저장"><Check size={15} /></button>
                              <button style={iconBtnStyle('#64748b')} onClick={cancelEdit} title="취소"><X size={15} /></button>
                            </>
                          ) : (
                            <>
                              <button style={iconBtnStyle('#2563eb')} onClick={() => startEdit(r)} title="수정"><Pencil size={14} /></button>
                              <button style={iconBtnStyle('#ef4444')} onClick={() => removeRegion(r)} title="삭제"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* 신규 추가 행 (양식에 없는 지역을 임시로 등록하고 싶을 때) */}
                <tr style={{ borderTop: '2px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <input style={{ ...inputStyle, width: '60px' }} type="number" placeholder="번호" value={newRegion.regionNo}
                      onChange={e => setNewRegion(d => ({ ...d, regionNo: e.target.value }))} />
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <input style={{ ...inputStyle, width: '100%' }} type="text" placeholder="새 지역명 입력" value={newRegion.displayName}
                      onChange={e => setNewRegion(d => ({ ...d, displayName: e.target.value }))} />
                  </td>
                  <td colSpan={2} style={{ padding: '10px 10px' }}>
                    <button
                      onClick={addRegion}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      <Plus size={14} /> 지역 추가
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
