import React, { useState, useEffect } from 'react';
import { adminService, UserItem } from '../../services/adminService';
import { roleService, RoleDefinition } from '../../services/roleService';
import { Shield, Plus, Users, Globe, CheckCircle, X, Trash2, Edit2 } from 'lucide-react';

export const AdminRolePage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  // Form State
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleId, setNewRoleId] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');

  const loadData = () => {
    const currentRoles = roleService.getRoles();
    setRoles(currentRoles);
    if (currentRoles.length > 0 && (!selectedRole || !currentRoles.find(r => r.roleId === selectedRole.roleId))) {
      setSelectedRole(currentRoles[0]);
    }

    adminService.getUsers().then((data) => {
      if (data && data.length > 0) setUsers(data);
      else setUsers([
        { userId: 1, username: 'admin', name: '관리자', role: 'ROLE_ADMIN', assignedCountry: '전체', isActive: true },
        { userId: 2, username: 'user', name: '해외선교부 담당자', role: 'ROLE_USER', assignedCountry: '일본', isActive: true }
      ]);
    }).catch(() => {
      setUsers([
        { userId: 1, username: 'admin', name: '관리자', role: 'ROLE_ADMIN', assignedCountry: '전체', isActive: true },
        { userId: 2, username: 'user', name: '해외선교부 담당자', role: 'ROLE_USER', assignedCountry: '일본', isActive: true }
      ]);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const membersInSelectedRole = selectedRole ? users.filter((u) => {
    if (selectedRole.roleId === 'ROLE_ADMIN') return u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' || u.role === '관리자';
    if (selectedRole.roleId === 'ROLE_USER') return u.role === 'ROLE_USER' || u.role === 'USER' || u.role === '일반 사용자' || u.role === '해외선교부 담당자';
    return u.role === selectedRole.roleId || u.role === selectedRole.roleName;
  }) : [];

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setNewRoleName('');
    setNewRoleId('ROLE_NEW');
    setNewRoleDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleDefinition) => {
    setEditingRole(role);
    setNewRoleName(role.roleName);
    setNewRoleId(role.roleId);
    setNewRoleDesc(role.description);
    setIsModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      alert("권한 명칭을 입력해 주세요.");
      return;
    }

    if (editingRole) {
      const updated = roleService.updateRole(editingRole.roleId, newRoleName, newRoleId, newRoleDesc);
      setSelectedRole(updated);
      alert(`'${updated.roleName}' 권한이 수정되었습니다.`);
    } else {
      const created = roleService.addRole(newRoleName, newRoleId, newRoleDesc);
      setSelectedRole(created);
      alert(`'${created.roleName}' (${created.roleId}) 권한이 성공적으로 추가되었습니다.`);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteRole = (e: React.MouseEvent, roleToDelete: RoleDefinition) => {
    e.stopPropagation();
    if (!window.confirm(`정말 '${roleToDelete.roleName} (${roleToDelete.roleId})' 권한을 삭제하시겠습니까?`)) return;

    const success = roleService.deleteRole(roleToDelete.roleId);
    if (success) {
      alert(`'${roleToDelete.roleName}' 권한이 삭제되었습니다.`);
      loadData();
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📈 권한 목록 및 소속 회원 관리
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            시스템 권한 그룹 명칭과 식별 코드를 설정하고 해당 권한에 속해 있는 회원 목록을 조회합니다.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
          }}
        >
          <Plus size={18} /> 권한 추가
        </button>
      </div>

      {/* Grid Layout: Left Role List / Right Member List */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left Role List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {roles.map((r) => {
            const isSelected = selectedRole?.roleId === r.roleId;
            const count = users.filter((u) => {
              if (r.roleId === 'ROLE_ADMIN') return u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' || u.role === '관리자';
              if (r.roleId === 'ROLE_USER') return u.role === 'ROLE_USER' || u.role === 'USER' || u.role === '일반 사용자' || u.role === '해외선교부 담당자';
              return u.role === r.roleId || u.role === r.roleName;
            }).length;

            const isDeletable = !r.isSystem && r.roleId !== 'ROLE_ADMIN' && r.roleId !== 'ROLE_USER';

            return (
              <div
                key={r.roleId}
                onClick={() => setSelectedRole(r)}
                style={{
                  background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e6edf8',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: isSelected ? '#2563eb' : '#1f2a44', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} /> {r.roleName} <span style={{ fontSize: '0.78rem', color: isSelected ? '#3b82f6' : '#94a3b8', fontWeight: 600 }}>({r.roleId})</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: isSelected ? '#e0e7ff' : '#f1f5f9', color: isSelected ? '#2563eb' : '#64748b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                      {count}명
                    </span>
                    {isDeletable && (
                      <button
                        onClick={(e) => handleDeleteRole(e, r)}
                        title="권한 삭제"
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          color: '#dc2626',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7a99', lineHeight: 1.4 }}>
                  {r.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Assigned Member List */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e6edf8',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
        }}>
          {selectedRole ? (
            <>
              <div style={{ borderBottom: '1px solid #e6edf8', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#2563eb" /> '{selectedRole.roleName}' ({selectedRole.roleId}) 소속 회원 목록
                  </h2>
                  <p style={{ fontSize: '0.83rem', color: '#6b7a99', margin: '4px 0 0 0' }}>
                    {selectedRole.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleOpenEditModal(selectedRole)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#334155',
                      padding: '7px 14px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit2 size={14} /> 권한 설정 수정
                  </button>

                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', background: '#e0e7ff', padding: '6px 14px', borderRadius: '20px' }}>
                    총 {membersInSelectedRole.length}명
                  </span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>아이디</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>이름</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>담당 국가 (접근 범위)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {membersInSelectedRole.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                        이 권한에 속한 회원이 아직 없습니다.
                      </td>
                    </tr>
                  ) : (
                    membersInSelectedRole.map((user) => (
                      <tr key={user.userId || user.username} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1f2a44' }}>{user.userId}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1f2a44' }}>{user.username}</td>
                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>{user.name}</td>
                        <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 700 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Globe size={14} /> {user.assignedCountry || '전체'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> 정상
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7a99' }}>
              권한 항목을 선택해 주세요.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(20, 40, 90, 0.2)',
            color: '#1f2a44'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e6edf8', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1f2a44' }}>
                {editingRole ? '✏️ 권한 그룹 설정 수정' : '➕ 신규 권한 그룹 추가'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>권한 표시 명칭 (한글/영문)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 지파 담당자, 통계 분석관, 테스트"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!editingRole) {
                      const ascii = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setNewRoleId(ascii ? `ROLE_${ascii}` : `ROLE_CUSTOM_${Date.now().toString().slice(-4)}`);
                    }
                  }}
                  style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>권한 식별 코드 (Role Key / ID)</label>
                <input
                  type="text"
                  required
                  placeholder="예: ROLE_JIPA_MANAGER, ROLE_TEST, ROLE_ANALYST"
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#2563eb', fontWeight: 700, fontFamily: 'monospace' }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  * 시스템 및 데이터베이스(Spring Security)에서 구분하는 고유 영문 권한 코드입니다 (예: <code>ROLE_TEST</code>).
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>권한 상세 설명</label>
                <input
                  type="text"
                  placeholder="예: 해당 지파 소속 데이터 관리 및 진단서 작성 권한"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                >
                  {editingRole ? '수정 저장' : '권한 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
