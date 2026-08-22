import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Power, Pencil, Eye, GitBranch, X, Search } from 'lucide-react';
import { adminService, UserItem, ChurchItem } from '../../services/adminService';
import { organizationStructureService, Department, Team } from '../../services/organizationStructureService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import {
  approvalLineService,
  ApprovalLine,
  ApprovalLinePreview,
  ApprovalResolverType,
  ApprovalTargetType,
  APPROVAL_RESOLVER_TYPE_LABELS,
  APPROVAL_TARGET_TYPE_LABELS,
} from '../../services/approvalLineService';

const TARGET_TYPES: ApprovalTargetType[] = ['EVANGELISM', 'MEMBERSHIP', 'MONTHLY_ACTIVITY'];

// 결재구분 프리셋 - 국내 그룹웨어(NOPSpro/SEGIO 등)에서 흔히 쓰는 표현을 참고
const STEP_LABEL_PRESETS = ['검토', '협조', '합의', '확인', '결재', '승인'];

// AdminOrgStructurePage와 동일한 정렬 규칙 (faith-records 목록의 sortOrder를 그대로 따른다)
const sortLocations = (list: ChurchItem[]): ChurchItem[] =>
  [...list].sort((a, b) => {
    const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? a.sortOrder : 999999;
    const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? b.sortOrder : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'ko');
  });

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e6edf8',
  borderRadius: '16px',
  boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)',
  overflow: 'hidden',
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 14px',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const btnGhost: React.CSSProperties = {
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  color: '#334155',
  padding: '5px 9px',
  cursor: 'pointer',
  fontSize: '0.76rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const btnDanger: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  color: '#dc2626',
  padding: '5px 8px',
  cursor: 'pointer',
  fontSize: '0.76rem',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #dbe2ef',
  borderRadius: '6px',
  color: '#1f2a44',
  fontSize: '0.8rem',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#ffffff',
  border: '1px solid #dbe2ef',
  borderRadius: '8px',
  color: '#1f2a44',
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 };

type NewLineScope = 'GLOBAL' | 'CHURCH' | 'DEPARTMENT';

export const AdminApprovalLinePage: React.FC = () => {
  const [targetType, setTargetType] = useState<ApprovalTargetType>('EVANGELISM');
  const [locations, setLocations] = useState<ChurchItem[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [lines, setLines] = useState<ApprovalLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 라인 생성 폼
  const [newLineScope, setNewLineScope] = useState<NewLineScope>('GLOBAL');
  const [newLineChurchId, setNewLineChurchId] = useState<number | ''>('');
  const [newLineDepartments, setNewLineDepartments] = useState<Department[]>([]);
  const [newLineDepartmentId, setNewLineDepartmentId] = useState<number | ''>('');
  const [newLineName, setNewLineName] = useState('');

  // 단계 추가/라벨 수정
  const [addingStep, setAddingStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);

  // 미리보기
  const [previewUserId, setPreviewUserId] = useState<number | ''>('');
  const [preview, setPreview] = useState<ApprovalLinePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadLines = async (tt: ApprovalTargetType) => {
    try {
      const list = await approvalLineService.getLines(tt);
      setLines(list);
    } catch (err) {
      console.warn('결재라인 목록 조회 실패:', err);
      setLines([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const churches = await adminService.getChurches();
        setLocations(sortLocations(churches || []));
      } catch (err) {
        console.warn('교회/지역/개척지 목록 조회 실패, 기본 목록 사용:', err);
        setLocations(sortLocations(defaultChurchesData as ChurchItem[]));
      }
      try {
        setAllUsers((await adminService.getUsers()) || []);
      } catch (err) {
        console.warn('회원 목록 로드 실패:', err);
      }
      try {
        const directory = await organizationStructureService.getDirectory();
        setAllDepartments(directory.departments || []);
        setAllTeams(directory.teams || []);
      } catch (err) {
        console.warn('조직도 로드 실패:', err);
      }
      await loadLines('EVANGELISM');
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setSelectedLineId(null);
    setPreview(null);
    setAddingStep(false);
    setEditingStepId(null);
    loadLines(targetType);
  }, [targetType]);

  useEffect(() => {
    if (newLineChurchId) {
      organizationStructureService.getDepartments(Number(newLineChurchId))
        .then(setNewLineDepartments)
        .catch(() => setNewLineDepartments([]));
    } else {
      setNewLineDepartments([]);
    }
    setNewLineDepartmentId('');
  }, [newLineChurchId]);

  const selectedLine = lines.find(l => l.id === selectedLineId) || null;

  const handleApiError = (err: any, fallback: string) => {
    alert(err?.response?.data?.message || err?.message || fallback);
  };

  const handleCreateLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineName.trim()) { alert('결재라인 이름을 입력해주세요.'); return; }
    if (newLineScope === 'CHURCH' && !newLineChurchId) { alert('교회/지역/개척지를 선택해주세요.'); return; }
    if (newLineScope === 'DEPARTMENT' && !newLineDepartmentId) { alert('부서를 선택해주세요.'); return; }
    try {
      const churchId = newLineScope === 'GLOBAL' ? null : Number(newLineChurchId);
      const departmentId = newLineScope === 'DEPARTMENT' ? Number(newLineDepartmentId) : null;
      await approvalLineService.createLine(targetType, churchId, departmentId, newLineName.trim());
      setNewLineName('');
      setNewLineScope('GLOBAL');
      setNewLineChurchId('');
      setNewLineDepartmentId('');
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '결재라인 생성 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (line: ApprovalLine) => {
    try {
      await approvalLineService.updateLine(line.id, undefined, !line.isActive);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '활성화 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRenameLine = async (line: ApprovalLine) => {
    const name = window.prompt('결재라인 이름을 입력해주세요.', line.name);
    if (!name || !name.trim()) return;
    try {
      await approvalLineService.updateLine(line.id, name.trim());
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '이름 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteLine = async (line: ApprovalLine) => {
    if (!window.confirm(`'${line.name}' 결재라인을 삭제하시겠습니까?\n구성된 모든 단계와 결재자 설정이 함께 삭제됩니다.`)) return;
    try {
      await approvalLineService.deleteLine(line.id);
      if (selectedLineId === line.id) setSelectedLineId(null);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddStep = async (line: ApprovalLine, label: string) => {
    try {
      await approvalLineService.addStep(line.id, label);
      setAddingStep(false);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '단계 추가 중 오류가 발생했습니다.');
    }
  };

  const handleRenameStep = async (stepId: number, label: string) => {
    try {
      await approvalLineService.renameStep(stepId, label);
      setEditingStepId(null);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '결재구분 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!window.confirm('이 결재 단계를 삭제하시겠습니까?')) return;
    try {
      await approvalLineService.deleteStep(stepId);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '단계 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleMoveStep = async (line: ApprovalLine, stepId: number, direction: -1 | 1) => {
    const ordered = [...line.steps].sort((a, b) => a.stepOrder - b.stepOrder).map(s => s.id);
    const idx = ordered.indexOf(stepId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    try {
      await approvalLineService.reorderSteps(line.id, ordered);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '순서 변경 중 오류가 발생했습니다.');
    }
  };

  const handleAddApprover = async (stepId: number, resolverType: ApprovalResolverType, specificUserId?: number) => {
    try {
      await approvalLineService.addStepApprover(stepId, resolverType, specificUserId);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '결재자 추가 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveApprover = async (approverId: number) => {
    try {
      await approvalLineService.removeStepApprover(approverId);
      await loadLines(targetType);
    } catch (err: any) {
      handleApiError(err, '결재자 삭제 중 오류가 발생했습니다.');
    }
  };

  const handlePreview = async () => {
    if (!previewUserId) { alert('미리볼 신청자를 선택해주세요.'); return; }
    setPreviewLoading(true);
    try {
      setPreview(await approvalLineService.previewForRequester(targetType, Number(previewUserId)));
    } catch (err: any) {
      handleApiError(err, '미리보기 조회 중 오류가 발생했습니다.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={22} /> 결재라인 관리
        </h1>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
          결재 기능별로 다단계 결재라인을 미리 구성합니다. 부서 전용 라인 → 교회 전용 라인 → 전역 기본 라인 순으로
          우선 적용되며, 각 단계는 검토/협조/합의/확인/결재/승인 등 결재구분과 함께 팀장/부서장(자동 해석) 또는
          조직도에서 고른 특정인원으로 지정하고, 지정된 전원이 승인해야 다음 단계로 진행됩니다. 전도/내무/월간활동보고
          실적 수정 신청·승인 화면 모두 이 라인을 기준으로 동작하므로, 각 유형마다 최소 1개의 결재라인을 구성해야
          해당 유형의 실적 수정 신청이 가능합니다.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {TARGET_TYPES.map(tt => (
          <button
            key={tt}
            onClick={() => setTargetType(tt)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: tt === targetType ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: tt === targetType ? '#eff6ff' : '#ffffff',
              color: tt === targetType ? '#2563eb' : '#475569',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            {APPROVAL_TARGET_TYPE_LABELS[tt]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7a99' }}>불러오는 중입니다...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '18px', alignItems: 'start' }}>
          {/* 라인 목록 + 생성 */}
          <div style={cardStyle}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1f2a44', fontSize: '0.9rem' }}>
              {APPROVAL_TARGET_TYPE_LABELS[targetType]} 결재라인 목록
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {lines.length === 0 ? (
                <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.82rem' }}>구성된 결재라인이 없습니다.</div>
              ) : lines.map(line => (
                <div
                  key={line.id}
                  onClick={() => setSelectedLineId(line.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    background: line.id === selectedLineId ? '#eff6ff' : 'transparent',
                    borderLeft: line.id === selectedLineId ? '3px solid #2563eb' : '3px solid transparent',
                    opacity: line.isActive ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.88rem' }}>
                        {line.name} {!line.isActive && <span style={{ color: '#94a3b8', fontWeight: 600 }}>(비활성)</span>}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                        {line.departmentName ? `${line.departmentName} 부서 전용` : line.churchName ? `${line.churchName} 전용` : '전역 기본'}
                        {' · '}{line.steps.length}단계
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleToggleActive(line)} title={line.isActive ? '비활성화' : '활성화'} style={btnGhost}><Power size={12} /></button>
                      <button onClick={() => handleRenameLine(line)} title="이름 수정" style={btnGhost}><Pencil size={12} /></button>
                      <button onClick={() => handleDeleteLine(line)} title="삭제" style={btnDanger}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateLine} style={{ padding: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.84rem' }}>새 결재라인 추가</div>
              <div>
                <label style={labelStyle}>적용 범위</label>
                <select value={newLineScope} onChange={e => setNewLineScope(e.target.value as NewLineScope)} style={inputStyle}>
                  <option value="GLOBAL">전역 기본</option>
                  <option value="CHURCH">특정 교회/지역/개척지 전용</option>
                  <option value="DEPARTMENT">특정 부서 전용</option>
                </select>
              </div>
              {(newLineScope === 'CHURCH' || newLineScope === 'DEPARTMENT') && (
                <div>
                  <label style={labelStyle}>교회/지역/개척지</label>
                  <select value={newLineChurchId} onChange={e => setNewLineChurchId(e.target.value ? Number(e.target.value) : '')} style={inputStyle}>
                    <option value="">선택해주세요</option>
                    {locations.map(loc => (
                      <option key={loc.churchId} value={loc.churchId}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {newLineScope === 'DEPARTMENT' && (
                <div>
                  <label style={labelStyle}>부서</label>
                  <select value={newLineDepartmentId} onChange={e => setNewLineDepartmentId(e.target.value ? Number(e.target.value) : '')} style={inputStyle} disabled={!newLineChurchId}>
                    <option value="">선택해주세요</option>
                    {newLineDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>결재라인 이름</label>
                <input type="text" placeholder="예: 전도 실적수정 기본 라인" value={newLineName} onChange={e => setNewLineName(e.target.value)} style={inputStyle} />
              </div>
              <button type="submit" style={btnPrimary}><Plus size={14} /> 결재라인 생성</button>
            </form>
          </div>

          {/* 선택한 라인의 단계 편집기 + 미리보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={cardStyle}>
              {!selectedLine ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                  왼쪽에서 결재라인을 선택해주세요.
                </div>
              ) : (
                <div>
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontWeight: 800, color: '#1f2a44', fontSize: '1.02rem' }}>{selectedLine.name}</div>
                    {!addingStep && (
                      <button onClick={() => setAddingStep(true)} style={{ ...btnPrimary, padding: '6px 10px' }}>
                        <Plus size={13} /> 단계 추가
                      </button>
                    )}
                  </div>

                  {addingStep && (
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
                        새 단계의 결재구분을 선택해주세요.
                      </div>
                      <StepLabelPicker
                        onConfirm={(label) => handleAddStep(selectedLine, label)}
                        onCancel={() => setAddingStep(false)}
                        confirmLabel="단계 추가"
                      />
                    </div>
                  )}

                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedLine.steps.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>등록된 결재 단계가 없습니다. "단계 추가"로 1차 결재부터 구성해주세요.</div>
                    ) : (
                      [...selectedLine.steps].sort((a, b) => a.stepOrder - b.stepOrder).map((step, idx) => (
                        <div key={step.id} style={{ background: '#f8fafc', border: '1px solid #eef2f8', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            {editingStepId === step.id ? (
                              <StepLabelPicker
                                initialValue={step.name}
                                onConfirm={(label) => handleRenameStep(step.id, label)}
                                onCancel={() => setEditingStepId(null)}
                                confirmLabel="저장"
                              />
                            ) : (
                              <div style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {step.stepOrder}차 · {step.name || `${step.stepOrder}차 결재`}
                                <button onClick={() => setEditingStepId(step.id)} title="결재구분 수정" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleMoveStep(selectedLine, step.id, -1)} disabled={idx === 0} title="위로" style={{ ...btnGhost, opacity: idx === 0 ? 0.4 : 1 }}><ChevronUp size={12} /></button>
                              <button onClick={() => handleMoveStep(selectedLine, step.id, 1)} disabled={idx === selectedLine.steps.length - 1} title="아래로" style={{ ...btnGhost, opacity: idx === selectedLine.steps.length - 1 ? 0.4 : 1 }}><ChevronDown size={12} /></button>
                              <button onClick={() => handleDeleteStep(step.id)} title="단계 삭제" style={btnDanger}><Trash2 size={12} /></button>
                            </div>
                          </div>

                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {step.approvers.length === 0 ? (
                              <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>결재자가 지정되지 않았습니다.</span>
                            ) : step.approvers.map(a => (
                              <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700 }}>
                                {APPROVAL_RESOLVER_TYPE_LABELS[a.resolverType]}{a.resolverType === 'SPECIFIC_USER' && a.specificUserName ? ` · ${a.specificUserName}` : ''}
                                <button onClick={() => handleRemoveApprover(a.id)} style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                  <Trash2 size={11} />
                                </button>
                              </span>
                            ))}
                          </div>

                          <StepApproverAdder
                            stepId={step.id}
                            locations={locations}
                            departments={allDepartments}
                            teams={allTeams}
                            users={allUsers}
                            onAdd={handleAddApprover}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 미리보기 */}
            <div style={cardStyle}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1f2a44', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={15} /> 결재라인 미리보기
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  신청자를 선택하면 {APPROVAL_TARGET_TYPE_LABELS[targetType]} 신청 시 실제로 적용될 결재라인과, 각 단계의
                  결재자가 누구로 해석되는지 미리 확인할 수 있습니다.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={previewUserId} onChange={e => setPreviewUserId(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, flex: 1 }}>
                    <option value="">신청자 선택</option>
                    {allUsers.map(u => (
                      <option key={u.userId} value={u.userId}>{u.name} ({u.username})</option>
                    ))}
                  </select>
                  <button onClick={handlePreview} disabled={previewLoading} style={btnPrimary}>
                    {previewLoading ? '조회 중...' : '미리보기'}
                  </button>
                </div>

                {preview && (
                  <div style={{ marginTop: '6px', background: '#f8fafc', border: '1px solid #eef2f8', borderRadius: '10px', padding: '14px' }}>
                    {preview.errorMessage ? (
                      <div style={{ color: '#dc2626', fontSize: '0.84rem', fontWeight: 600 }}>{preview.errorMessage}</div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.88rem' }}>
                          적용 라인: {preview.lineName} <span style={{ color: '#64748b', fontWeight: 600 }}>({preview.scopeDescription})</span>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(preview.steps || []).map(step => (
                            <div key={step.stepOrder} style={{ fontSize: '0.82rem', color: '#334155' }}>
                              <span style={{ fontWeight: 700 }}>{step.stepOrder}차 · {step.name}</span>
                              {': '}
                              {step.approvers.map((a, i) => (
                                <span key={i} style={{ marginRight: '8px' }}>
                                  {a.error ? (
                                    <span style={{ color: '#dc2626' }}>[{APPROVAL_RESOLVER_TYPE_LABELS[a.resolverType]}: {a.error}]</span>
                                  ) : (
                                    <span>{a.resolvedUserName || '알 수 없음'}({APPROVAL_RESOLVER_TYPE_LABELS[a.resolverType]})</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** 결재구분(검토/협조/합의/확인/결재/승인) 프리셋 선택 + 직접입력. 새 단계 추가와 기존 단계 라벨 수정 양쪽에서 재사용. */
const StepLabelPicker: React.FC<{
  initialValue?: string;
  onConfirm: (label: string) => void;
  onCancel: () => void;
  confirmLabel: string;
}> = ({ initialValue, onConfirm, onCancel, confirmLabel }) => {
  const isPreset = !!initialValue && (STEP_LABEL_PRESETS as string[]).includes(initialValue);
  const [choice, setChoice] = useState<string>(isPreset ? (initialValue as string) : (initialValue ? '기타' : STEP_LABEL_PRESETS[0]));
  const [custom, setCustom] = useState<string>(!isPreset && initialValue ? initialValue : '');

  const submit = () => {
    const label = choice === '기타' ? custom.trim() : choice;
    if (!label) { alert('결재구분을 입력해주세요.'); return; }
    onConfirm(label);
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={choice} onChange={e => setChoice(e.target.value)} style={selectStyle}>
        {STEP_LABEL_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="기타">기타(직접입력)</option>
      </select>
      {choice === '기타' && (
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="결재구분 입력"
          style={{ ...inputStyle, width: '130px', padding: '6px 8px' }}
        />
      )}
      <button onClick={submit} style={{ ...btnPrimary, padding: '5px 10px' }}>{confirmLabel}</button>
      <button onClick={onCancel} style={btnGhost}>취소</button>
    </div>
  );
};

const StepApproverAdder: React.FC<{
  stepId: number;
  locations: ChurchItem[];
  departments: Department[];
  teams: Team[];
  users: UserItem[];
  onAdd: (stepId: number, resolverType: ApprovalResolverType, specificUserId?: number) => void;
}> = ({ stepId, locations, departments, teams, users, onAdd }) => {
  const [resolverType, setResolverType] = useState<ApprovalResolverType>('TEAM_LEADER');
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
      <select value={resolverType} onChange={e => setResolverType(e.target.value as ApprovalResolverType)} style={selectStyle}>
        <option value="TEAM_LEADER">팀장</option>
        <option value="DEPARTMENT_LEADER">부서장</option>
        <option value="SPECIFIC_USER">특정인원</option>
      </select>
      {resolverType === 'SPECIFIC_USER' ? (
        <button onClick={() => setPickerOpen(true)} style={{ ...btnPrimary, padding: '5px 10px' }}>
          <Plus size={12} /> 조직도에서 선택
        </button>
      ) : (
        <button onClick={() => onAdd(stepId, resolverType)} style={{ ...btnPrimary, padding: '5px 10px' }}>
          <Plus size={12} /> 결재자 추가
        </button>
      )}
      {pickerOpen && (
        <OrgTreePickerModal
          locations={locations}
          departments={departments}
          teams={teams}
          users={users}
          onSelect={(userId) => onAdd(stepId, 'SPECIFIC_USER', userId)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

/** 조직도(교회>부서>팀>회원) 트리에서 특정인원 결재자를 골라 담는 모달. 검색어를 입력하면 트리 대신 평면 검색 결과를 보여준다. */
const OrgTreePickerModal: React.FC<{
  locations: ChurchItem[];
  departments: Department[];
  teams: Team[];
  users: UserItem[];
  onSelect: (userId: number, userName: string) => void;
  onClose: () => void;
}> = ({ locations, departments, teams, users, onSelect, onClose }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handlePick = (u: UserItem) => {
    if (!u.userId) return;
    onSelect(u.userId, u.name);
    setAddedIds(prev => new Set(prev).add(u.userId as number));
  };

  const deptName = (departmentId?: number) => departments.find(d => d.id === departmentId)?.name;
  const teamName = (teamId?: number) => teams.find(t => t.id === teamId)?.name;

  const renderMemberRow = (u: UserItem, pathLabel?: string) => {
    const added = !!u.userId && addedIds.has(u.userId);
    return (
      <div
        key={u.userId}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 10px', borderRadius: '6px',
          background: added ? '#eff6ff' : 'transparent',
        }}
      >
        <span style={{ fontSize: '0.82rem', color: '#334155' }}>
          👤 {u.name} <span style={{ color: '#94a3b8' }}>({u.username}){pathLabel ? ` · ${pathLabel}` : ''}</span>
        </span>
        <button onClick={() => handlePick(u)} style={{ ...btnGhost, padding: '3px 8px', background: added ? '#dbeafe' : '#f1f5f9', color: added ? '#1d4ed8' : '#334155' }}>
          {added ? '✓ 추가됨' : '+ 추가'}
        </button>
      </div>
    );
  };

  const searchLower = search.trim().toLowerCase();
  const filteredUsers = searchLower
    ? users.filter(u => u.name.toLowerCase().includes(searchLower) || u.username.toLowerCase().includes(searchLower))
    : null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(20,40,90,0.25)' }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e6edf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, color: '#1f2a44', fontSize: '1rem' }}>조직도에서 결재자 선택</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="이름 또는 아이디로 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, padding: '8px 10px' }}
          />
        </div>
        <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
          {filteredUsers ? (
            filteredUsers.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '10px' }}>검색 결과가 없습니다.</div>
            ) : (
              filteredUsers.map(u => renderMemberRow(u, [deptName(u.departmentId), teamName(u.teamId)].filter(Boolean).join(' · ')))
            )
          ) : (
            locations.map(loc => {
              const churchKey = `church-${loc.churchId}`;
              const churchDepts = departments.filter(d => d.churchId === loc.churchId);
              return (
                <div key={churchKey} style={{ marginBottom: '4px' }}>
                  <div onClick={() => toggle(churchKey)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', cursor: 'pointer', fontWeight: 700, color: '#1f2a44', fontSize: '0.85rem' }}>
                    <span>{expanded.has(churchKey) ? '▾' : '▸'}</span> 🏢 {loc.name}
                  </div>
                  {expanded.has(churchKey) && (
                    <div style={{ paddingLeft: '18px' }}>
                      {churchDepts.length === 0 ? (
                        <div style={{ color: '#cbd5e1', fontSize: '0.78rem', padding: '4px' }}>등록된 부서가 없습니다.</div>
                      ) : churchDepts.map(dept => {
                        const deptKey = `dept-${dept.id}`;
                        const deptTeams = teams.filter(t => t.departmentId === dept.id);
                        const deptDirectMembers = users.filter(u => u.departmentId === dept.id && !u.teamId);
                        return (
                          <div key={deptKey} style={{ marginBottom: '2px' }}>
                            <div onClick={() => toggle(deptKey)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 4px', cursor: 'pointer', fontWeight: 600, color: '#334155', fontSize: '0.83rem' }}>
                              <span>{expanded.has(deptKey) ? '▾' : '▸'}</span> 📁 {dept.name}
                            </div>
                            {expanded.has(deptKey) && (
                              <div style={{ paddingLeft: '18px' }}>
                                {deptTeams.map(team => {
                                  const teamKey = `team-${team.id}`;
                                  const teamMembers = users.filter(u => u.teamId === team.id);
                                  return (
                                    <div key={teamKey} style={{ marginBottom: '2px' }}>
                                      <div onClick={() => toggle(teamKey)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', cursor: 'pointer', color: '#475569', fontSize: '0.81rem', fontWeight: 600 }}>
                                        <span>{expanded.has(teamKey) ? '▾' : '▸'}</span> 👥 {team.name}
                                      </div>
                                      {expanded.has(teamKey) && (
                                        <div style={{ paddingLeft: '18px' }}>
                                          {teamMembers.length === 0 ? (
                                            <div style={{ color: '#cbd5e1', fontSize: '0.76rem', padding: '4px' }}>소속 회원 없음</div>
                                          ) : teamMembers.map(u => renderMemberRow(u))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {deptDirectMembers.length > 0 && (
                                  <div style={{ marginTop: '2px' }}>
                                    <div style={{ fontSize: '0.76rem', color: '#94a3b8', padding: '4px' }}>부서 직속</div>
                                    {deptDirectMembers.map(u => renderMemberRow(u))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e6edf8', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnPrimary}>완료</button>
        </div>
      </div>
    </div>
  );
};
