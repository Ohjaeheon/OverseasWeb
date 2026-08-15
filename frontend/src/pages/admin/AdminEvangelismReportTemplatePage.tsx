import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileArchive, RotateCcw, CheckCircle2, AlertCircle, Eye, EyeOff, Save
} from 'lucide-react';
import {
  evangelismReportService, EvangelismReportTemplateItem, EvangelismReportFieldMapping, EvangelismReportDataSource
} from '../../services/evangelismReportService';

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

const DATA_SOURCE_OPTIONS: { value: EvangelismReportDataSource; label: string }[] = [
  { value: 'NONE', label: '사용 안 함 (보류)' },
  { value: 'MEMBERSHIP_PREV_DEC', label: '내무 · 전년도 12월 재적' },
  { value: 'EVANGELISM_MONTHLY_ADMIT', label: '전도 · 당월 개강(월등록)' },
  { value: 'EVANGELISM_YTD_ADMIT', label: '전도 · 개강 연누계' },
  { value: 'EVANGELISM_MONTHLY_TEACHER', label: '전도 월간보고 · 활동교사수' },
];

export const AdminEvangelismReportTemplatePage: React.FC = () => {
  const [templates, setTemplates] = useState<EvangelismReportTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mappings, setMappings] = useState<EvangelismReportFieldMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      setTemplates(await evangelismReportService.listTemplates());
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadMappings = useCallback(async () => {
    try {
      setMappingsLoading(true);
      setMappings(await evangelismReportService.listFieldMappings());
    } catch (e) {
      console.error('Failed to load field mappings', e);
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); loadMappings(); }, [loadTemplates, loadMappings]);

  const pickFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setTemplateError('템플릿은 .xlsx 파일만 업로드할 수 있습니다.');
      return;
    }
    setTemplateError(null);
    setPendingFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) pickFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const doUpload = async () => {
    if (!pendingFile) return;
    if (!password.trim()) {
      setTemplateError('템플릿 비밀번호를 입력해 주세요.');
      return;
    }
    setUploading(true);
    setTemplateError(null);
    try {
      await evangelismReportService.uploadTemplate(pendingFile, password);
      setPendingFile(null);
      setPassword('');
      await loadTemplates();
    } catch (e: any) {
      setTemplateError(e?.response?.data?.message || '템플릿 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const rollback = async (t: EvangelismReportTemplateItem) => {
    if (!window.confirm(`'${t.originalFilename}' 버전으로 활성 템플릿을 되돌리시겠습니까?`)) return;
    try {
      await evangelismReportService.activateTemplate(t.templateId);
      await loadTemplates();
    } catch (e: any) {
      alert(e?.response?.data?.message || '전환에 실패했습니다.');
    }
  };

  const updateMappingField = (mappingId: number, patch: Partial<EvangelismReportFieldMapping>) => {
    setMappings(prev => prev.map(m => m.mappingId === mappingId ? { ...m, ...patch } : m));
  };

  const saveMapping = async (m: EvangelismReportFieldMapping) => {
    setSavingId(m.mappingId);
    try {
      await evangelismReportService.updateFieldMapping(m.mappingId, {
        columnLetter: m.columnLetter,
        dataSource: m.dataSource,
        isEnabled: m.isEnabled,
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || '저장에 실패했습니다.');
      loadMappings();
    } finally {
      setSavingId(null);
    }
  };

  const activeTemplate = templates.find(t => t.isActive);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: '"Pretendard", sans-serif' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          📋 전도 월말 보고서 양식관리
        </h2>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', marginTop: '6px', lineHeight: 1.5 }}>
          사용자가 <strong>①-5. 월말보고서 출력</strong>에서 다운로드하는 엑셀 양식(템플릿)과, 그 안의 각 열에 어떤 데이터를 채울지(필드 매핑)를 관리합니다.<br />
          현재 활성 템플릿: <strong>{activeTemplate ? activeTemplate.originalFilename : '등록된 템플릿 없음 — 먼저 업로드해 주세요'}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* 템플릿 업로드 */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            1. 양식(템플릿) 업로드
          </h3>

          {activeTemplate && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <CheckCircle2 size={20} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>현재 활성 템플릿: {activeTemplate.originalFilename}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  업로드: {new Date(activeTemplate.uploadedAt).toLocaleString()} · {activeTemplate.uploadedBy}
                </div>
              </div>
            </div>
          )}

          <div
            onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '12px', padding: '24px 20px', textAlign: 'center',
              background: dragActive ? 'rgba(37, 99, 235, 0.02)' : '#f8fafc',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {pendingFile ? <FileArchive size={22} color="#2563eb" /> : <Upload size={22} color="#2563eb" />}
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                {pendingFile ? pendingFile.name : '새 양식.xlsx 파일을 끌어놓거나 클릭해서 선택'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="이 템플릿 파일의 비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={doUpload}
              disabled={!pendingFile || uploading}
              style={{
                padding: '9px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                cursor: (!pendingFile || uploading) ? 'not-allowed' : 'pointer',
                background: (!pendingFile || uploading) ? '#cbd5e1' : 'linear-gradient(135deg, #4b8bff, #2563eb)',
                color: '#fff'
              }}
            >
              {uploading ? '업로드 중...' : '업로드 및 활성화'}
            </button>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>업로드 즉시 이 템플릿이 활성화되어, 이후 사용자 다운로드에 사용됩니다.</p>

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

        {/* 필드 매핑 관리 */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1e293b' }}>
            2. 필드(열) 매핑
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
            템플릿의 각 열이 어떤 데이터로 채워질지 지정합니다. "사용 안 함"으로 두면 해당 열은 비워둡니다(값이 필요 없는 항목은 그대로 보류하세요).
          </p>
          <div style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }} />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.78rem' }}>
                  <th style={{ padding: '8px 10px' }}>필드</th>
                  <th style={{ padding: '8px 10px', width: '80px' }}>열</th>
                  <th style={{ padding: '8px 10px', width: '260px' }}>데이터 소스</th>
                  <th style={{ padding: '8px 10px', width: '70px' }}>사용</th>
                  <th style={{ padding: '8px 10px', width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {mappingsLoading && (
                  <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</td></tr>
                )}
                {mappings.map(m => (
                  <tr key={m.mappingId} style={{ borderTop: '1px solid #f1f5f9', opacity: m.isEnabled ? 1 : 0.55 }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>{m.label}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        style={{ ...inputStyle, width: '48px', textAlign: 'center' }}
                        value={m.columnLetter}
                        maxLength={2}
                        onChange={e => updateMappingField(m.mappingId, { columnLetter: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        style={{ ...inputStyle, width: '100%' }}
                        value={m.dataSource}
                        onChange={e => updateMappingField(m.mappingId, { dataSource: e.target.value as EvangelismReportDataSource })}
                      >
                        {DATA_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="checkbox"
                        checked={m.isEnabled}
                        onChange={e => updateMappingField(m.mappingId, { isEnabled: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => saveMapping(m)}
                        disabled={savingId === m.mappingId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px',
                          background: '#2563eb', color: '#fff', border: 'none', borderRadius: '7px',
                          fontSize: '0.75rem', fontWeight: 700, cursor: savingId === m.mappingId ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Save size={12} /> 저장
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
