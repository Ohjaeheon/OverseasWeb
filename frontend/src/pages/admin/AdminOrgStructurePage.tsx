import React, { useState, useEffect } from 'react';
import { organizationStructureService, Department, Team, OrgMember } from '../../services/organizationStructureService';
import { adminService, UserItem, ChurchItem } from '../../services/adminService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { Plus, Edit2, Trash2, X, Crown, UserPlus, LogOut, Building2 } from 'lucide-react';

// AdminFaithPage(/adminsetting/faith-records)와 동일한 정렬 규칙 — 그 목록에서 설정한 순서(sortOrder) 그대로 노출한다.
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
  overflow: 'hidden'
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
  gap: '6px'
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
  gap: '4px'
};

const btnDanger: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  color: '#dc2626',
  padding: '5px 8px',
  cursor: 'pointer',
  fontSize: '0.76rem'
};

const selectStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #dbe2ef',
  borderRadius: '6px',
  color: '#1f2a44',
  fontSize: '0.8rem',
  fontWeight: 600
};

export const AdminOrgStructurePage: React.FC = () => {
  const [locations, setLocations] = useState<ChurchItem[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptNameInput, setDeptNameInput] = useState('');

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamNameInput, setTeamNameInput] = useState('');

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberUserIdInput, setMemberUserIdInput] = useState<number | ''>('');
  const [memberTeamIdInput, setMemberTeamIdInput] = useState<number | ''>('');

  const loadLocations = async (): Promise<ChurchItem[]> => {
    try {
      const churches = await adminService.getChurches();
      const sorted = sortLocations(churches || []);
      setLocations(sorted);
      return sorted;
    } catch (err) {
      console.warn('해외교회/지역/개척지 목록 조회 실패, 기본 목록 사용:', err);
      const sorted = sortLocations(defaultChurchesData as ChurchItem[]);
      setLocations(sorted);
      return sorted;
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await adminService.getUsers();
      setAllUsers(users || []);
    } catch (err) {
      console.warn('회원 목록 로드 실패:', err);
    }
  };

  const loadDepartments = async (churchId: number | null) => {
    if (!churchId) { setDepartments([]); return; }
    try {
      const list = await organizationStructureService.getDepartments(churchId);
      setDepartments(list);
    } catch (err) {
      console.warn('부서 목록 로드 실패:', err);
      setDepartments([]);
    }
  };

  const loadDepartmentDetail = async (departmentId: number) => {
    try {
      const [teamList, memberList] = await Promise.all([
        organizationStructureService.getTeams(departmentId),
        organizationStructureService.getDepartmentMembers(departmentId)
      ]);
      setTeams(teamList);
      setMembers(memberList);
    } catch (err) {
      console.warn('부서 상세 로드 실패:', err);
      setTeams([]);
      setMembers([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await loadLocations();
      await loadAllUsers();
      if (list.length > 0 && list[0].churchId) setSelectedChurchId(list[0].churchId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setSelectedDepartmentId(null);
    setTeams([]);
    setMembers([]);
    loadDepartments(selectedChurchId);
  }, [selectedChurchId]);

  useEffect(() => {
    if (selectedDepartmentId) {
      loadDepartmentDetail(selectedDepartmentId);
    } else {
      setTeams([]);
      setMembers([]);
    }
  }, [selectedDepartmentId]);

  const selectedDepartment = departments.find(d => d.id === selectedDepartmentId) || null;
  const selectedLocation = locations.find(l => l.churchId === selectedChurchId) || null;

  const refreshAll = async () => {
    await loadDepartments(selectedChurchId);
    if (selectedDepartmentId) await loadDepartmentDetail(selectedDepartmentId);
  };

  const handleApiError = (err: any, fallback: string) => {
    alert(err?.response?.data?.message || err?.message || fallback);
  };

  // --- 부서 ---
  const openAddDeptModal = () => { setEditingDept(null); setDeptNameInput(''); setDeptModalOpen(true); };
  const openEditDeptModal = (d: Department) => { setEditingDept(d); setDeptNameInput(d.name); setDeptModalOpen(true); };

  const submitDeptModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptNameInput.trim()) { alert('부서명을 입력해주세요.'); return; }
    if (!editingDept && !selectedChurchId) { alert('교회/지역/개척지를 먼저 선택해주세요.'); return; }
    try {
      if (editingDept) {
        await organizationStructureService.renameDepartment(editingDept.id, deptNameInput.trim());
      } else {
        await organizationStructureService.createDepartment(selectedChurchId as number, deptNameInput.trim());
      }
      setDeptModalOpen(false);
      await loadDepartments(selectedChurchId);
    } catch (err: any) {
      handleApiError(err, '부서 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteDept = async (d: Department) => {
    if (!window.confirm(`'${d.name}' 부서를 삭제하시겠습니까?\n소속된 팀과 회원 배정도 함께 해제됩니다.`)) return;
    try {
      await organizationStructureService.deleteDepartment(d.id);
      if (selectedDepartmentId === d.id) setSelectedDepartmentId(null);
      await loadDepartments(selectedChurchId);
    } catch (err: any) {
      handleApiError(err, '부서 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSetDeptLeader = async (d: Department, userId: number | null) => {
    try {
      await organizationStructureService.setDepartmentLeader(d.id, userId);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '부서장 지정 중 오류가 발생했습니다.');
    }
  };

  // --- 팀 ---
  const openAddTeamModal = () => { setEditingTeam(null); setTeamNameInput(''); setTeamModalOpen(true); };
  const openEditTeamModal = (t: Team) => { setEditingTeam(t); setTeamNameInput(t.name); setTeamModalOpen(true); };

  const submitTeamModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartmentId) return;
    if (!teamNameInput.trim()) { alert('팀명을 입력해주세요.'); return; }
    try {
      if (editingTeam) {
        await organizationStructureService.renameTeam(editingTeam.id, teamNameInput.trim());
      } else {
        await organizationStructureService.createTeam(selectedDepartmentId, teamNameInput.trim());
      }
      setTeamModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '팀 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTeam = async (t: Team) => {
    if (!window.confirm(`'${t.name}' 팀을 삭제하시겠습니까?\n소속 회원은 부서 직속으로 남습니다.`)) return;
    try {
      await organizationStructureService.deleteTeam(t.id);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '팀 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSetTeamLeader = async (t: Team, userId: number | null) => {
    try {
      await organizationStructureService.setTeamLeader(t.id, userId);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '팀장 지정 중 오류가 발생했습니다.');
    }
  };

  // --- 회원 배정 ---
  const openMemberModal = () => { setMemberUserIdInput(''); setMemberTeamIdInput(''); setMemberModalOpen(true); };

  const submitMemberModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartmentId || !memberUserIdInput) { alert('회원을 선택해주세요.'); return; }
    try {
      await organizationStructureService.assignUser(
        Number(memberUserIdInput),
        selectedDepartmentId,
        memberTeamIdInput ? Number(memberTeamIdInput) : null
      );
      setMemberModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '회원 배정 중 오류가 발생했습니다.');
    }
  };

  const handleChangeMemberTeam = async (member: OrgMember, teamId: number | null) => {
    if (!selectedDepartmentId) return;
    try {
      await organizationStructureService.assignUser(member.userId, selectedDepartmentId, teamId);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '팀 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveMember = async (member: OrgMember) => {
    if (!window.confirm(`'${member.name}' 님을 부서에서 제외하시겠습니까?`)) return;
    try {
      await organizationStructureService.assignUser(member.userId, null, null);
      await refreshAll();
    } catch (err: any) {
      handleApiError(err, '제외 중 오류가 발생했습니다.');
    }
  };

  const memberUserIds = new Set(members.map(m => m.userId));
  const assignableUsers = allUsers.filter(u => u.userId && !memberUserIds.has(u.userId));
  const departmentOnlyMembers = members.filter(m => !m.teamId);
  const membersByTeam = (teamId: number) => members.filter(m => m.teamId === teamId);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏢 조직 관리 (해외교회 · 지역 · 개척지 · 부서 · 팀)
        </h1>
        <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
          해외교회 · 지역 · 개척지 관리(/adminsetting/faith-records)에 등록된 목록을 그대로 사용해 그 하위에 부서와 팀을
          구성하고 회원을 배정합니다. 팀 없이 부서에만 소속되는 회원도 가능하며, 여기서 설정한 소속/부서장/팀장 정보는
          이후 결재선 등 조직 기반 기능의 토대로 사용됩니다.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7a99' }}>불러오는 중입니다...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 340px 1fr', gap: '18px', alignItems: 'start' }}>
          {/* 해외교회 · 지역 · 개척지 (/adminsetting/faith-records 목록) */}
          <div style={cardStyle}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1f2a44', fontSize: '0.9rem' }}>
              🌍 해외교회 · 지역 · 개척지
            </div>
            <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
              {locations.length === 0 ? (
                <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  등록된 항목이 없습니다.<br />해외교회 관리에서 먼저 등록해주세요.
                </div>
              ) : locations.map(loc => (
                <div
                  key={loc.churchId}
                  onClick={() => setSelectedChurchId(loc.churchId || null)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: loc.churchId === selectedChurchId ? '#eff6ff' : 'transparent',
                    borderLeft: loc.churchId === selectedChurchId ? '3px solid #2563eb' : '3px solid transparent'
                  }}
                >
                  <div style={{
                    fontWeight: loc.churchId === selectedChurchId ? 700 : 600,
                    color: loc.churchId === selectedChurchId ? '#2563eb' : '#1f2a44',
                    fontSize: '0.86rem'
                  }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    {loc.jipa} · {loc.gubun} · {loc.country}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 부서 */}
          <div style={cardStyle}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.9rem' }}>
                <Building2 size={15} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                부서 {selectedLocation && `(${selectedLocation.name})`}
              </span>
              <button onClick={openAddDeptModal} disabled={!selectedChurchId} style={{ ...btnPrimary, padding: '6px 10px', opacity: selectedChurchId ? 1 : 0.5 }}>
                <Plus size={14} /> 부서 추가
              </button>
            </div>
            <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
              {departments.length === 0 ? (
                <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.82rem' }}>등록된 부서가 없습니다.</div>
              ) : departments.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDepartmentId(d.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    background: d.id === selectedDepartmentId ? '#eff6ff' : 'transparent',
                    borderLeft: d.id === selectedDepartmentId ? '3px solid #2563eb' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.88rem' }}>{d.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                        부서장: {d.leaderName || '미지정'} · 팀 {d.teamCount} · 인원 {d.memberCount}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditDeptModal(d)} title="수정" style={btnGhost}><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteDept(d)} title="삭제" style={btnDanger}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 팀 & 소속 회원 */}
          <div style={cardStyle}>
            {!selectedDepartment ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                왼쪽에서 부서를 선택해주세요.
              </div>
            ) : (
              <div>
                {/* 부서 헤더 & 부서장 지정 */}
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#1f2a44', fontSize: '1.02rem' }}>{selectedDepartment.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={14} color="#d97706" />
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>부서장</span>
                    <select
                      value={selectedDepartment.leaderUserId || ''}
                      onChange={(e) => handleSetDeptLeader(selectedDepartment, e.target.value ? Number(e.target.value) : null)}
                      style={selectStyle}
                    >
                      <option value="">미지정</option>
                      {members.map(m => (
                        <option key={m.userId} value={m.userId}>{m.name} ({m.username})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 팀 목록 */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.86rem' }}>👥 팀</span>
                    <button onClick={openAddTeamModal} style={{ ...btnPrimary, padding: '6px 10px' }}>
                      <Plus size={13} /> 팀 추가
                    </button>
                  </div>
                  {teams.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>등록된 팀이 없습니다. 팀 없이 부서에만 회원을 배정할 수도 있습니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {teams.map(t => (
                        <div key={t.id} style={{ background: '#f8fafc', border: '1px solid #eef2f8', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <span style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.86rem' }}>{t.name}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.76rem', color: '#64748b' }}>인원 {t.memberCount}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                value={t.leaderUserId || ''}
                                onChange={(e) => handleSetTeamLeader(t, e.target.value ? Number(e.target.value) : null)}
                                style={selectStyle}
                              >
                                <option value="">팀장 미지정</option>
                                {membersByTeam(t.id).map(m => (
                                  <option key={m.userId} value={m.userId}>{m.name} ({m.username})</option>
                                ))}
                              </select>
                              <button onClick={() => openEditTeamModal(t)} title="수정" style={btnGhost}><Edit2 size={12} /></button>
                              <button onClick={() => handleDeleteTeam(t)} title="삭제" style={btnDanger}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 소속 회원 */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#1f2a44', fontSize: '0.86rem' }}>🙋 소속 회원</span>
                    <button onClick={openMemberModal} style={{ ...btnPrimary, padding: '6px 10px' }}>
                      <UserPlus size={13} /> 회원 추가
                    </button>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      부서 직속 (팀 미배정) — {departmentOnlyMembers.length}명
                    </div>
                    {departmentOnlyMembers.length === 0 ? (
                      <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>없음</div>
                    ) : (
                      <MemberRows
                        rows={departmentOnlyMembers}
                        teams={teams}
                        onChangeTeam={handleChangeMemberTeam}
                        onRemove={handleRemoveMember}
                      />
                    )}
                  </div>

                  {teams.map(t => (
                    <div key={t.id} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                        {t.name} 소속 — {membersByTeam(t.id).length}명
                      </div>
                      {membersByTeam(t.id).length === 0 ? (
                        <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>없음</div>
                      ) : (
                        <MemberRows
                          rows={membersByTeam(t.id)}
                          teams={teams}
                          onChangeTeam={handleChangeMemberTeam}
                          onRemove={handleRemoveMember}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 부서 추가/수정 모달 */}
      {deptModalOpen && (
        <ModalShell title={editingDept ? '부서 수정' : '부서 추가'} onClose={() => setDeptModalOpen(false)}>
          <form onSubmit={submitDeptModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>해외교회 · 지역 · 개척지</label>
              <input type="text" disabled value={selectedLocation?.name || ''} style={{ ...inputStyle, background: '#f1f5f9' }} />
            </div>
            <div>
              <label style={labelStyle}>부서명</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="예: 목회부"
                value={deptNameInput}
                onChange={(e) => setDeptNameInput(e.target.value)}
                style={inputStyle}
              />
            </div>
            <ModalActions onCancel={() => setDeptModalOpen(false)} submitLabel={editingDept ? '수정 저장' : '등록'} />
          </form>
        </ModalShell>
      )}

      {/* 팀 추가/수정 모달 */}
      {teamModalOpen && selectedDepartment && (
        <ModalShell title={editingTeam ? '팀 수정' : '팀 추가'} onClose={() => setTeamModalOpen(false)}>
          <form onSubmit={submitTeamModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>부서</label>
              <input type="text" disabled value={selectedDepartment.name} style={{ ...inputStyle, background: '#f1f5f9' }} />
            </div>
            <div>
              <label style={labelStyle}>팀명</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="예: 1팀"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                style={inputStyle}
              />
            </div>
            <ModalActions onCancel={() => setTeamModalOpen(false)} submitLabel={editingTeam ? '수정 저장' : '등록'} />
          </form>
        </ModalShell>
      )}

      {/* 회원 추가 모달 */}
      {memberModalOpen && selectedDepartment && (
        <ModalShell title="회원 추가" onClose={() => setMemberModalOpen(false)}>
          <form onSubmit={submitMemberModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>회원</label>
              <select
                required
                value={memberUserIdInput}
                onChange={(e) => setMemberUserIdInput(e.target.value ? Number(e.target.value) : '')}
                style={inputStyle}
              >
                <option value="">선택해주세요</option>
                {assignableUsers.map(u => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.username})</option>
                ))}
              </select>
              {assignableUsers.length === 0 && (
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px' }}>이미 모든 회원이 이 부서에 배정되어 있습니다.</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>팀 (선택, 미지정 시 부서 직속)</label>
              <select
                value={memberTeamIdInput}
                onChange={(e) => setMemberTeamIdInput(e.target.value ? Number(e.target.value) : '')}
                style={inputStyle}
              >
                <option value="">부서 직속 (팀 미배정)</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <ModalActions onCancel={() => setMemberModalOpen(false)} submitLabel="배정" />
          </form>
        </ModalShell>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' };

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '28px', boxShadow: '0 25px 60px rgba(20, 40, 90, 0.2)', color: '#1f2a44' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e6edf8', paddingBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1f2a44' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions: React.FC<{ onCancel: () => void; submitLabel: string }> = ({ onCancel, submitLabel }) => (
  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
    <button type="button" onClick={onCancel} style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
      취소
    </button>
    <button type="submit" style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
      {submitLabel}
    </button>
  </div>
);

const MemberRows: React.FC<{
  rows: OrgMember[];
  teams: Team[];
  onChangeTeam: (member: OrgMember, teamId: number | null) => void;
  onRemove: (member: OrgMember) => void;
}> = ({ rows, teams, onChangeTeam, onRemove }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {rows.map(m => (
      <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
          {m.name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({m.username})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {teams.length > 0 && (
            <select
              value={m.teamId || ''}
              onChange={(e) => onChangeTeam(m, e.target.value ? Number(e.target.value) : null)}
              style={{ ...selectStyle, fontSize: '0.76rem', padding: '4px 6px' }}
            >
              <option value="">부서 직속</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => onRemove(m)} title="부서에서 제외" style={btnDanger}><LogOut size={12} /></button>
        </div>
      </div>
    ))}
  </div>
);
